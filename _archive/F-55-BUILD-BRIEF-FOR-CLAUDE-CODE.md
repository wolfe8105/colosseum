# F-55 REFERENCE SYSTEM OVERHAUL — BUILD BRIEF FOR CLAUDE CODE

**Session origin:** Session 252 (chat), 2026-04-09.
**Target:** Claude Code, full build in one working session (chat sessions are too phased for this scope).
**Prereq:** F-55 is fully specced. Zero references exist in production (greenfield — destructive migration is approved).
**Downstream unblock:** F-57 Phase 1 (modifier/power-up inventory + shop RPCs + socketing) lands on top of this build in a follow-up session.

---

## 1. READ FIRST

Before writing any code, read these files in the repo:

- `THE-MODERATOR-FEATURE-SPECS-PENDING.md` — the F-55 section (lines 119–157) is the canonical spec. Read the full paragraph. Don't skim.
- `THE-MODERATOR-NEW-TESTAMENT.md` — architectural context, current system state.
- `THE-MODERATOR-LAND-MINE-MAP.md` — specifically LM-206 (`source_type` locked at creation), LM-207 (bot/AI cite block enforcement), LM-208 (asymmetric `general` category), LM-209 (`profiles.is_bot` migration dependency).
- `supabase-deployed-functions-export.sql` — **source of truth** for what's currently deployed in production. 186 functions as of S250. Don't guess signatures — grep this file.
- `src/reference-arsenal.ts` — existing client code that will be rewritten in this build.

---

## 2. CURRENT STATE (WHAT EXISTS NOW)

### Table: `public.arsenal_references` (existing)

Confirmed columns from deployed RPCs:
- `id` UUID
- `user_id` UUID (owner)
- `claim` TEXT
- `url` TEXT
- `author` TEXT
- `publication_year` INTEGER
- `source_type` TEXT
- `category` TEXT
- `verification_points` INTEGER
- `current_power` INTEGER
- `citation_count` INTEGER
- `challenge_count` INTEGER
- `challenge_wins` INTEGER
- `challenge_losses` INTEGER
- `created_at` TIMESTAMPTZ

**This table is empty in production.** Pat confirmed zero rows. Destructive migration is approved — `DROP TABLE ... CASCADE` and recreate fresh.

### Table: `public.debate_references` (existing)

Citation records inside specific debates. Keep as-is for this build. F-51 archive column additions (`base_score`, `in_debate_modifier`, `final_contribution`) are **deferred to F-57 Phase 2** and are out of scope for F-55.

### Live RPCs to rewrite or drop

| RPC | Action |
|---|---|
| `forge_reference(p_claim, p_url, p_author, p_publication_year, p_source_type, p_category)` | **REWRITE** — new structured signature |
| `edit_reference` | **REWRITE** — 10-token fee, field whitelist, fingerprint recompute |
| `verify_reference` | **REWRITE** as `second_reference` — new vocabulary, profile depth 25% gate |
| `cite_reference` | **KEEP** — owner self-cite path, no royalty |
| `cite_debate_reference` | **REWRITE** — bot-pair check, royalty staging, rarity recompute |
| `challenge_reference` | **REWRITE** — graduated penalties, rarity recompute |
| `rule_on_reference` | **REWRITE** — fires rarity recompute on ruling |
| `file_reference_challenge` | **KEEP or consolidate** into `challenge_reference` — CC's call |
| `get_reference_library` | **REWRITE** — new column set, filter by rarity/category/deleted_at |
| `get_debate_references` | **KEEP** — cosmetic column additions only |
| `_calc_reference_power` | **REPLACE** with new `_recompute_reference_rarity_and_power(ref_id)` helper |
| `auto_allow_expired_references` | **KEEP or drop** — legacy expiration logic, may be dead — CC audits |
| `submit_reference` | **DROP** — retired per spec (the old raw-URL-drop path) |
| **NEW** `delete_reference` | soft-delete, 7/24hr rate limit |
| **NEW** `pay_reference_royalties(debate_id)` | batched match-end payout |

### Client code

`src/reference-arsenal.ts` — called from `src/arena/arena-feed-room.ts`, `src/arena/arena-room-end.ts`, `src/arena/arena-room-setup.ts`, `src/pages/home.ts`. Window bridge exposes `forgeReference`, `editReference`, etc. Full rewrite for new field structure.

---

## 3. LOCKED DECISIONS (S252 chat, defaults from Claude, Pat approved)

### Q1: Column reconciliation — `verification_points` / `citation_count` → new vocab

- **DROP** `verification_points` entirely. It was a legacy composite that the new model doesn't use.
- **RENAME** `citation_count` → `strikes`. Same semantic: how many times the ref has been cited in a debate.
- **ADD** new column `seconds INTEGER DEFAULT 0 NOT NULL` — tracks seconding votes (new positive signal from S247 spec). This is separate from strikes.
- Composite rarity score formula per spec: `(seconds × 2) + strikes`. Thresholds locked in spec §135.

### Q2: `url` and `publication_year`

- **DROP** `publication_year` — replaced by full-date `source_date DATE`.
- **KEEP** `url` as an optional display field (`source_url TEXT NULL`). **Not part of canonical fingerprint.** Users can click through, but two refs with the same title/author/date/locator but different URLs are still duplicates.

### Q3: `current_power` storage strategy

- **KEEP as regular column**, recomputed on every seconding and every strike via helper function `_recompute_reference_rarity_and_power(ref_id)`. Cheap reads for the Armory browse, and recompute is cheap because seconding/strikes are not high-frequency events.
- Power formula per spec: `power = min(ceiling_by_source_type, floor(seconds / 3)) + graduation_bonus`.
- Ceiling table: primary 5, academic 4, book 3, news 1, other 1.
- `graduation_bonus` = 1 if `graduated = true` else 0.
- Graduation triggers permanently at `strikes >= 25` (one-way latch).

### Q4: `challenge_status` shape

- TEXT column with CHECK constraint: `CHECK (challenge_status IN ('none', 'disputed', 'heavily_disputed', 'frozen'))`, default `'none'`. Matches repo style (see `join_mode` in the F-16 cluster spec).

### Q5: Migration strategy

- **Destructive.** `DROP TABLE public.arsenal_references CASCADE;` then recreate with the new schema. Also drops dependent RPCs — they'll be rebuilt in this same build. Zero refs in production, so zero data loss.
- Run all RPC rewrites in the **same migration file** so the window where RPCs don't exist is zero.
- This keeps the schema clean and prevents "ghost columns" from the old design lingering.

### Q6: `debate_references` archive columns

- **DEFER** to F-57 Phase 2 (scoring integration). Do not add `base_score`, `in_debate_modifier`, `final_contribution` in this migration. They belong to the F-51 scoring rewrite, not the reference system overhaul.

### Q7: Royalty ledger

- **NEW TABLE** `public.reference_royalty_log`. Do not extend `token_earn_log`. B2B granularity is the point of the spec — buyers need to be able to SELECT royalty line items distinctly.

---

## 4. PHASED BUILD ORDER (single session, but phase the commits)

Claude Code should commit phase by phase so the diff is readable. Each phase should leave the repo in a building, tested state.

### Phase A — Schema migration

**File:** `session-252-f55-overhaul.sql` (repo root, matches existing naming convention).

1. `ALTER TABLE public.profiles ADD COLUMN is_bot BOOLEAN DEFAULT false NOT NULL;` (LM-209).
2. `DROP TABLE public.arsenal_references CASCADE;` (kills all dependent RPCs — they get rebuilt in later phases of the same file).
3. `CREATE TABLE public.arsenal_references` with the full new column set:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
   - `source_title TEXT NOT NULL`
   - `source_author TEXT NOT NULL`
   - `source_date DATE NOT NULL`
   - `locator TEXT NOT NULL` (line/page/timestamp/paragraph)
   - `claim_text TEXT NOT NULL`
   - `source_type TEXT NOT NULL CHECK (source_type IN ('primary','academic','book','news','other'))`
   - `category TEXT NOT NULL` (FK or CHECK against shared enum — see Q on taxonomy below)
   - `source_url TEXT NULL` (optional display, not fingerprinted)
   - `canonical_fingerprint TEXT NOT NULL` (generated from title+author+date+locator)
   - `seconds INTEGER NOT NULL DEFAULT 0`
   - `strikes INTEGER NOT NULL DEFAULT 0`
   - `rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','uncommon','rare','legendary','mythic'))`
   - `current_power INTEGER NOT NULL DEFAULT 0`
   - `graduated BOOLEAN NOT NULL DEFAULT false`
   - `challenge_status TEXT NOT NULL DEFAULT 'none' CHECK (challenge_status IN ('none','disputed','heavily_disputed','frozen'))`
   - `deleted_at TIMESTAMPTZ NULL`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
4. **Five required indexes** (per spec §155):
   - `CREATE INDEX idx_arsenal_refs_category_rarity ON public.arsenal_references (category, rarity DESC);`
   - `CREATE INDEX idx_arsenal_refs_owner ON public.arsenal_references (user_id);`
   - `CREATE UNIQUE INDEX idx_arsenal_refs_fingerprint ON public.arsenal_references (canonical_fingerprint);`
   - `CREATE INDEX idx_arsenal_refs_strikes ON public.arsenal_references (strikes DESC);`
   - `CREATE INDEX idx_arsenal_refs_deleted_at ON public.arsenal_references (deleted_at) WHERE deleted_at IS NOT NULL;`
5. `CREATE TABLE public.reference_sockets` (F-57 prep):
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `reference_id UUID NOT NULL REFERENCES public.arsenal_references(id) ON DELETE CASCADE`
   - `socket_index INTEGER NOT NULL` (0-based, up to rarity-determined max)
   - `modifier_id UUID NOT NULL` (FK to F-57 `user_modifiers` — add the FK in F-57 Phase 1 build since that table doesn't exist yet; leave as plain UUID with a comment for now)
   - `effect_id TEXT NOT NULL` (denormalized from F-57 catalog for fast read)
   - `socketed_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `UNIQUE (reference_id, socket_index)`
6. `CREATE TABLE public.reference_royalty_log`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `forger_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
   - `citer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
   - `reference_id UUID NOT NULL REFERENCES public.arsenal_references(id) ON DELETE CASCADE`
   - `debate_id UUID NOT NULL REFERENCES public.arena_debates(id) ON DELETE CASCADE`
   - `reference_name TEXT NOT NULL` (snapshot — ref could be renamed/deleted later)
   - `rarity_at_cite TEXT NOT NULL` (snapshot — live rarity at cite time)
   - `base_royalty NUMERIC(6,2) NOT NULL` (pre-win-bonus amount)
   - `win_bonus_applied BOOLEAN NOT NULL DEFAULT false`
   - `citer_won_debate BOOLEAN NOT NULL`
   - `final_payout NUMERIC(6,2) NOT NULL` (rounded up to nearest 0.1)
   - `paid_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - Index on `(forger_user_id, paid_at DESC)` for ledger queries.

### Phase B — Forge / edit / delete RPCs + helper functions

1. `_canonical_fingerprint(title, author, date, locator) → TEXT` helper: lowercase, collapse whitespace, strip punctuation, concat with delimiters, return. Use `regexp_replace` and `lower`, not MD5 — the column is TEXT, not a hash, so fingerprint collisions are exact string matches.
2. `_recompute_reference_rarity_and_power(p_ref_id UUID) → VOID` helper: reads seconds/strikes/source_type/graduated, applies thresholds and power formula, UPDATEs `rarity`, `current_power`, `graduated`.
3. `forge_reference(p_source_title TEXT, p_source_author TEXT, p_source_date DATE, p_locator TEXT, p_claim_text TEXT, p_source_type TEXT, p_category TEXT, p_source_url TEXT DEFAULT NULL) → JSONB`:
   - `SECURITY DEFINER`, auth check (`auth.uid() IS NOT NULL`).
   - Category whitelist check (exclude `'general'` — LM-208).
   - Compute fingerprint.
   - SELECT for existing fingerprint → if found, return `{action: 'collision', existing_ref_id, existing_owner, existing_name}`.
   - Debit forging cost (TBD — flag to Pat at build time, use `50` as a sensible default placeholder and log it as a parked value in the commit message).
   - INSERT with `rarity='common'`, `strikes=0`, `seconds=0`, `current_power=0`.
   - Return `{action: 'forged', ref_id}`.
4. `edit_reference(p_ref_id UUID, p_source_title TEXT, p_source_author TEXT, p_source_date DATE, p_locator TEXT, p_claim_text TEXT, p_category TEXT) → JSONB`:
   - Auth check, ownership check.
   - **NO `p_source_type` parameter** — field is locked at creation forever (LM-206).
   - Debit 10 tokens.
   - Recompute fingerprint; check collision against other refs (exclude self).
   - If collision → rollback, return `{action: 'collision', ...}`.
   - UPDATE editable fields. `challenge_status` is preserved (Disputed badges survive edits per spec §133).
   - Return `{action: 'edited'}`.
5. `delete_reference(p_ref_id UUID) → JSONB`:
   - Auth check, ownership check.
   - Rate limit: count deletes by this user in last 24h, reject if ≥ 7.
   - Soft-delete: `UPDATE arsenal_references SET deleted_at = now() WHERE id = p_ref_id`.
   - **Do not** cascade-delete `debate_references` — historical pointers preserved for replay integrity per spec §151.
   - Sockets cascade-burn automatically via the existing `ON DELETE CASCADE` (wait — they don't, because we're soft-deleting, not hard-deleting; CC needs to explicitly delete from `reference_sockets WHERE reference_id = p_ref_id` here, per spec "Socketed modifiers burn with the ref on delete").
   - Return `{action: 'deleted'}`.

### Phase C — Seconding, challenge, ruling, cite

1. `second_reference(p_ref_id UUID) → JSONB`:
   - Auth check.
   - Profile depth check: `profiles.completion_percent >= 25` (check actual column name — may be `profile_depth` or similar; grep).
   - Self-seconding hard-block: `IF v_ref.user_id = auth.uid() THEN RAISE EXCEPTION`.
   - Check for existing seconding by this user (add a `reference_seconds` junction table or use `reference_verifications` if it already exists — grep deployed export).
   - INSERT seconding record, `UPDATE arsenal_references SET seconds = seconds + 1`.
   - Call `_recompute_reference_rarity_and_power(p_ref_id)`.
2. `cite_debate_reference(p_debate_id, p_ref_id, ...existing params)` rewrite:
   - **Bot-pair check** (LM-207): `SELECT is_bot FROM profiles WHERE id IN (citer, opponent)` — if either is true, `RAISE EXCEPTION 'Bot accounts cannot cite references'`.
   - Deleted ref check: `IF v_ref.deleted_at IS NOT NULL` — reject for new cites (grandfathered in-flight cites already passed this point; enforcement is at the add-to-loadout layer, not here).
   - Frozen ref check: `IF v_ref.challenge_status = 'frozen'` — reject.
   - Existing escalating per-round cite cost logic — preserve verbatim (1st free, 2nd 5t, 3rd 15t, 4th 35t, 5th 50t, hard cap 5/round). Cite-cost tokens burn to platform, **not** routed to forger.
   - `UPDATE arsenal_references SET strikes = strikes + 1`.
   - Call `_recompute_reference_rarity_and_power(p_ref_id)`.
   - **Royalty is NOT paid inline here.** It's staged — accumulated in a per-debate staging table or calculated at match-end by scanning `debate_references` for the debate. CC picks the cleanest approach. Recommend: calculate at match-end by SELECT-ing cites from `debate_references` joined against the ref's current rarity snapshot stored per cite.
   - **Actually, that's wrong** — rarity must be snapshot at cite time, not match-end (ref could change rarity between cite and match-end). Add `rarity_at_cite TEXT` column to `debate_references` in this build and populate on insert.
3. `challenge_reference(p_ref_id, p_grounds, p_context_debate_id DEFAULT NULL) → JSONB`:
   - Escrow logic: in-debate challenges 10 tokens, out-of-debate 25 tokens.
   - Existing challenge infrastructure — grep deployed export for current shape, adapt.
4. `rule_on_reference(p_challenge_id, p_ruling)` rewrite:
   - On `'upheld'` (challenger wins, ref is at fault): refund challenger escrow, apply graduated penalty (1st: -5 seconds + `challenge_status='disputed'`; 2nd: -5 seconds + `challenge_status='heavily_disputed'`; 3rd: `challenge_status='frozen'`).
   - On `'denied'`: burn challenger escrow, no ref penalty.
   - Call `_recompute_reference_rarity_and_power(ref_id)` after any seconds adjustment.
   - `seconds` floors at 0 (`GREATEST(seconds - 5, 0)`).

### Phase D — Royalty payout

1. `pay_reference_royalties(p_debate_id UUID) → JSONB`:
   - Called at match-end from the existing debate finalization flow. CC needs to grep for where debates finalize (`arena-room-end.ts` or a server-side finalization RPC) and wire the call.
   - SELECT all `debate_references` rows for this debate with their `rarity_at_cite` snapshot and `forger_user_id` (join to `arsenal_references`).
   - Determine winner (from `arena_debates` result).
   - For each cite, compute base royalty from tiered schedule:
     - Common 0.1 / Uncommon 0.25 / Rare 0.5 / Legendary 1.0 / Mythic 2.0
   - Apply disputed modifiers: Disputed = ×0.75, Heavily Disputed = ×0.25, Frozen = ×0 (frozen refs can't be cited anyway, but defend in code).
   - Apply win bonus ×2 if `citer_user_id = winner_user_id`.
   - **Skip self-cites** (no royalty if `forger_user_id = citer_user_id`).
   - **Skip deleted-ref royalties** (`deleted_at IS NOT NULL` → 0 payout, tokens burn to platform).
   - **Skip null debates** (`arena_debates.status IN ('nulled', 'abandoned', 'tech_failure')` → 0 royalties entire debate).
   - Round UP to nearest 0.1 (`CEILING(v_amount * 10) / 10.0`).
   - Batch per forger: one consolidated payout row per forger per debate — or one row per cite? **Spec says "one consolidated payout per forger per debate"** → sum per forger, but the `reference_royalty_log` schema above stores per-cite for B2B granularity. **Resolution:** insert one log row per cite (for granularity), but the `profiles.token_balance` UPDATE is batched once per forger (one UPDATE statement per forger, summing their total). CC implements it this way.
   - Tournament debates pay full rate from the same token faucet (no special case).
2. Grep for the existing match-end flow. Likely `arena-room-end.ts` calls a `finalize_debate` or similar RPC. Wire `pay_reference_royalties(p_debate_id)` into that flow **after** the winner is recorded but **before** the client displays the final score screen.

### Phase E — Client rewrite

1. `src/reference-arsenal.ts`:
   - New forge form with structured fields: title / author / date / locator / claim / source_type dropdown / category dropdown / optional URL.
   - Handle collision response — show "This source+locator already exists as 'X' by [forger]. Use it?" with a button that adds the canonical ref to the user's loadout instead.
   - Edit modal — 10-token fee confirmation bottom sheet, new field set, source_type field disabled.
   - Delete button + "Are you sure? This cannot be undone and any socketed modifiers will be lost" confirmation.
   - Update `ArsenalReference` type to match new schema.
2. `src/arena/arena-feed-room.ts`, `src/arena/arena-room-end.ts`, `src/arena/arena-room-setup.ts`, `src/pages/home.ts`:
   - Grep for `forgeReference`, `editReference`, field accesses like `.claim`, `.author`, `.publication_year` — update to new field names.
3. TypeScript will error on the rename cascade. Fix every error. Run `tsc --noEmit` to verify clean.
4. Remove any references to `submit_reference` — that RPC is retired.

### Phase F — F-57 Phase 1 (follow-up session, not this build)

- Catalog table + 60-effect seed (including Reveal #60, Legendary+ tier, mod 220 / pu 25 — locked in S252 chat).
- `user_powerups`, `user_modifiers`, `user_powerups_equipped_in_debate`, `debate_modifier_state` tables.
- `buy_powerup`, `buy_modifier`, `socket_modifier`, `equip_powerup_for_debate` RPCs.
- `socket_modifier` enforces rarity tier gate (catalog effect's `tier_min` must be ≤ ref's current rarity) and socket count cap (from ref rarity: 1/2/3/4/5).
- NOT in this F-55 build — explicitly next session.

---

## 5. GUARDRAILS

- **Do not touch auto-debate.** It was retired in S249 (repo) + S250 (DB). If CC finds any lingering `auto_debate` references, they're strays — delete them.
- **Do not commit without running `tsc --noEmit` clean.** The column rename cascade will surface 20+ type errors.
- **Do not break live RPCs between phases.** All RPC rewrites go in the same migration file so the window with no RPCs is zero transaction boundaries wide.
- **`supabase-deployed-functions-export.sql` is the source of truth** for currently-deployed RPCs. Do not guess signatures — grep this file. (LM-210 is closed; the file is current as of S250.)
- **Pat does all deploys via GitHub web UI + Supabase SQL Editor.** CC should produce commits but not attempt to run migrations against production. CC can run them against a local branch DB if one exists.
- **Pricing and forging cost** — the spec marks forging cost as "TBD, needs code verification." Use 50 tokens as a placeholder and flag it in the commit message as a parked value for Pat to adjust.
- **Category taxonomy** — shared enum with debate categories: `politics`, `sports`, `entertainment`, `music`, `couples_court`. `general` is hot-takes-only and blocked from the forge picker (LM-208). Grep for the existing category enum location and reuse.
- **`profiles` column names** — CC must grep the actual `profiles` table for the real column name for "profile depth / completion percent" before writing the seconding check. Don't guess.
- **Challenge infrastructure may already exist** — there are live `challenge_reference`, `rule_on_reference`, `file_reference_challenge` RPCs. Grep and adapt rather than rewriting from scratch. Preserve the existing escrow token amounts (10 in-debate, 25 out-of-debate) — those are in the spec.
- **Reference seconding table** — there's an existing `reference_verifications` table in production (spotted in deployed export). Check its shape and either adapt it into the new `seconds` tracking or create a fresh `reference_seconds` junction. CC's call — prefer adaptation if the shape fits.
- **`cite_reference` (owner self-cite)** — distinct from `cite_debate_reference`. Keep this path working; owners self-citing get socketed modifier effects per spec §147 but zero royalty per spec §145.
- **Archive columns `base_score` / `in_debate_modifier` / `final_contribution` on `debate_references`** — DO NOT ADD in this build. Deferred to F-57 Phase 2.

---

## 6. TEST CHECKLIST (manual verification after build)

Run these through the SQL editor or a test script after deploy:

1. **Fingerprint dedup.** Forge ref A (title "X", author "Y", date 2020-01-01, locator "p.5"). Forge ref B with identical fields — expect collision response pointing at A.
2. **Fingerprint case/whitespace insensitivity.** Forge ref A with title "The Great Gatsby". Try to forge ref B with title "  the   great gatsby  " — expect collision.
3. **URL not in fingerprint.** Forge A with `url = 'https://nyt.com/article1'`. Forge B with same title/author/date/locator but `url = 'https://nyt.com/article1?utm_source=x'` — expect collision (different URLs don't matter).
4. **Self-seconding block.** Forge a ref as user X, try to second it as user X — expect error.
5. **Profile depth gate.** Seconding as a user with profile completion < 25% — expect error.
6. **Source type edit lock.** Edit a ref and try to pass `source_type` — RPC should not accept it (no parameter for it). Verify no backdoor via direct UPDATE.
7. **Rarity climb.** Forge a ref, give it 10 seconds and 10 strikes → rarity should be `common` (score = 30, threshold for uncommon is 10+; wait — score = 2×10 + 10 = 30, which is Rare tier). Re-verify thresholds: Common 0-9, Uncommon 10-29, Rare 30-74, Legendary 75-199, Mythic 200+. So 30 = Rare. ✅
8. **Mythic gate via graduation.** Push a ref to composite score 250 but not graduated — rarity should stay at `legendary`. Push strikes to 25 → graduated flips true → next recompute promotes to mythic.
9. **Graduation latch.** After graduated=true, manually reduce strikes below 25 → graduated should stay true (one-way latch, not recomputed).
10. **Challenge penalties.** Forge a ref, give it 20 seconds, then successfully challenge 3 times:
    - 1st: seconds=15, challenge_status='disputed'
    - 2nd: seconds=10, challenge_status='heavily_disputed'
    - 3rd: challenge_status='frozen' (still at 10 seconds, freeze is the 3rd-strike state)
    - Verify frozen ref cannot be cited.
11. **Seconds floor at 0.** Ref with 3 seconds, successful challenge → seconds = 0 (not -2).
12. **Bot-pair cite block.** Set `is_bot = true` on a test account. Try to cite a ref in a debate where either debater is flagged — expect error.
13. **Royalty tiered rates.** Forge ref as user A, have user B cite it in a debate and win. Expected royalty for the cite: base × 2 (win bonus), e.g., Rare ref = 0.5 × 2 = 1.0 token. Verify `reference_royalty_log` row and `profiles.token_balance` increment.
14. **Self-cite zero royalty.** User A cites their own ref — zero royalty, no log row.
15. **Disputed ref royalty reduction.** Ref in `challenge_status='disputed'`, Mythic rarity, cited by winner: expected 2.0 × 0.75 × 2 = 3.0 tokens.
16. **Null debate zero royalty.** Null the debate, call `pay_reference_royalties` — expect zero payouts across the board.
17. **Deleted ref zero royalty.** Owner deletes ref after a grandfathered in-flight cite — when that debate ends, expect zero royalty for the deleted ref.
18. **Delete rate limit.** Delete 7 refs in one hour, try 8th — expect error.
19. **Soft-delete preserves replay.** Delete a ref that was cited in a past debate. `debate_references` rows should still resolve — the replay page should still render the cite.
20. **Socket burn on delete.** If F-57 Phase 1 has landed when this test runs: socket a modifier into a ref, delete the ref, verify the `reference_sockets` row is gone. (For this F-55 build alone, just verify the explicit DELETE in `delete_reference` is present.)
21. **Five indexes exist.** `\d arsenal_references` in psql should show all five.
22. **`profiles.is_bot` exists with default false.** `SELECT is_bot FROM profiles LIMIT 1` should return `false` for all existing rows.

---

## 7. COMMIT SEQUENCE (what CC's git log should look like)

1. `F-55 Phase A: schema migration (destructive, greenfield)`
2. `F-55 Phase B: forge/edit/delete RPCs + fingerprint helper + rarity recompute helper`
3. `F-55 Phase C: seconding + challenge/rule-on rewrites + bot cite block`
4. `F-55 Phase D: royalty payout RPC + match-end wiring`
5. `F-55 Phase E: client rewrite for new schema (reference-arsenal.ts + callsites)`
6. `F-55: retire submit_reference, drop dead legacy RPCs`
7. `F-55: update deployed functions export` (Pat to run the export query and commit the result)

After CC is done, Pat runs the migration in Supabase SQL Editor, then re-exports `supabase-deployed-functions-export.sql` and commits it. The S252 chat handoff will note F-55 as built and F-57 Phase 1 as next session's focus.

---

## 8. WHAT TO PRODUCE AT END OF BUILD

For the chat handoff to the next session, CC should write a short `F-55-BUILD-COMPLETE.md` file at repo root with:

- Which phases landed cleanly vs. partial
- Any parked decisions (forging cost value, challenge RPC consolidation decision, etc.)
- Any surprise refactors (e.g., if `reference_verifications` was reused or replaced)
- Test checklist results (which pass, which need manual verification in production)
- Next session's focus (F-57 Phase 1)
- Any new Land Mine Map entries to add

Pat will upload this file to the next chat session as handoff context.

---

**END OF BRIEF.**
