# SESSION 248 HANDOFF — BOT ARMY SCRATCHED

## SESSION GOAL (completed)

Walk session targeting one of the unwalked features from the S247 backlog (F-06, F-09, F-16, F-17, F-18, F-23, F-24, F-32). F-06 was picked first. Walk resolved into a **full scratch of the bot army growth system** rather than a spec walk — the system was already quarantined S195, Pat confirmed indefinite retirement, and the walk's real job was cleaning up every bot-army-related surface across the docs so nothing stranded references a dead system.

**Key finding:** "F-06 bot army" was a wrong-F-number phrasing. F-06 on the punch list is "Debate Analytics Overlay" (speaking time, argument count, score timeline — depends on F-05 recording) and survives untouched. Bot army was never formally F-numbered; its only punch-list tracking was H-05 (quarantine rename cleanup). This session kills the bot army and leaves F-06 Debate Analytics Overlay alone.

**Second key finding:** The F-55 cite-block rule (`cite_debate_reference` checks `profiles.is_bot = false`) guards a column that does NOT exist in schema. New Land Mine Map entry LM-209 flags this as an F-55 build blocker. Independent of bot army scratch.

---

## SCRATCH SCOPE

Scratched in full: the 3-leg bot army growth/marketing system (reddit/twitter/discord posting, news scanning, Leg 3 Auto-Debate Rage-Click Engine), hosted on DigitalOcean VPS `161.35.137.21`, PM2-managed, compiled TypeScript from `dist/`.

Scratch covers anything bot-army-related anywhere in the docs:
- Growth legs (1, 2, 3)
- Auto-debate generation
- `bot_activity` table and `bot_stats_24h` view (left inert in DB)
- `hot_takes.is_bot_generated`, `hot_takes.source_headline`, `hot_takes.source_url` columns (left inert)
- Bot army link templates (Product Vision §5 — not edited this session, flagged)
- Rematch narrative hook (Product Vision §7.3.4 — not edited this session, flagged)
- Article distribution (Product Vision §9.3 — not edited this session, flagged)
- F-29 Source Meta Report bot-army-distribution line (edited — "Bot army or blog" → "Blog")
- ~19 bot army `.ts` files in repo (left in place, "float in the ether")
- Groq dependency in `GROQ_API_KEY` secret (inert now — see notes)
- VPS at $6/mo (no teardown plan; Pat's mental horizon is "end of this year" but not a written date)

**NOT scratched:**
- **F-06 Debate Analytics Overlay** (punch-list feature, unrelated, survives)
- **AI Sparring** (separate live Edge Function using Claude/Anthropic)
- **AI Moderator** (separate live Edge Function using Claude/Anthropic)
- **F-29 Source Meta Report** (feature survives; only the bot-army-distribution sentence was removed)

---

## FILES EDITED THIS SESSION

### `THE-MODERATOR-FEATURE-SPECS-PENDING.md`
1. **F-55 cite-block paragraph rewritten.** Was: "Bots and AI opponents cannot cite references... F-06 bot army debates and AI sparring opponents..." Now: "AI opponents cannot cite references..." with inline reference to LM-209 (`profiles.is_bot` column missing) and to the Bot Army scratch note below. Bot-army framing removed.
2. **New section added after F-40: `## Bot Army Growth System`** — full SCRATCHED S248 note. Format follows the F-40 scratch note from S245 for consistency.

### `THE-MODERATOR-PUNCH-LIST.md`
1. **F-29 Source Meta Report** — "Bot army or blog distributes it" → "Blog distributes it". Feature survives.
2. **H-05 Bot army quarantined from rename** — status changed ⏳ → ❌, marked SCRATCHED S248, pointer to the pending-spec scratch note. Code-hygiene cleanup is now moot.
3. **H-14 Test Walkthrough update** — "retire bot army scenario section" phrasing replaced with "Bot army scenario section to be deleted entirely (S248 scratch)."

### `THE-MODERATOR-NEW-TESTAMENT.md`
1. **Line 332 stale Groq claim fixed.** Was: "`GROQ_API_KEY` is only used by bot army on VPS and api/go-respond.js on Vercel." Now: "`GROQ_API_KEY` is inert post-S248 — bot army is SCRATCHED, and `api/go-respond.js` migrated Groq→Claude in Session 208. Key can be rotated/removed at convenience." (Discovered during the walk: `api/go-respond.js` already migrated to Claude in S208, but NT still claimed it used Groq.)

### `THE-MODERATOR-LAND-MINE-MAP.md`
1. **LM-005 PROTECTS line rewritten.** Was: "Bot army funnel — verdict pages are ungated." Now: "Guest content access (formerly framed as 'bot army funnel' — bot army SCRATCHED S248; the ungated-verdict-pages rule stands on its own for the guest/cold-traffic experience via /go)."
2. **LM-005 SYMPTOM line rewritten.** "Bot army funnel is dead" → "Guest/cold-traffic funnel via /go is dead."
3. **LM-066 PROTECTS + BITES rewritten.** Bot-army-funnel framing replaced with guest/cold-traffic framing via /go.
4. **Session 43 Groq-model-kill lesson SCRATCHED.** Whole entry marked SCRATCHED S248 — the dual-update rule (bot-config.js + Edge Functions) is obsolete now that bot army is dead and Edge Functions migrated to Claude in S220. Kept as historical context only.
5. **B2B secrecy LM cleaned.** "mirror pages, bot army posts, or any public-facing asset" → "any public-facing asset." (Mirror is LM-202 deprecation-pending, bot army is now scratched.)
6. **LM-207 WHAT clause rewritten.** Dropped "F-06 bot army debates" wrong-F-number phrase. Now: "AI sparring sessions skip the loadout/cite system entirely" with a historical note about the scratched bot army attack vector.
7. **LM-207 FIX clause expanded.** Added `**BUILD BLOCKER (S248):**` subsection flagging that `profiles.is_bot` column does not exist and must be added as the first step of the F-55 build migration. Pointer to LM-209.
8. **LM-209 added (new).** `profiles.is_bot` column does not exist yet — F-55 build blocker. Full WHAT/BITES/SYMPTOM/FIX/SESSION entry.
9. **LM map header updated** — "Last Updated: Session 248... 16 sections, 118 entries."

---

## NEW LAND MINE MAP ENTRY

**LM-209: `profiles.is_bot` column does not exist yet — F-55 build blocker.** The F-55 pending spec and LM-207 both require `cite_debate_reference` to check `profiles.is_bot = false` on both debaters. That column does not exist. Only `hot_takes.is_bot_generated` exists (from `moderator-bot-army-schema.sql`). F-55 build migration must add `profiles.is_bot BOOLEAN DEFAULT false NOT NULL` as its first step before the cite RPC is wired. Backfill is a no-op (every existing profile is human). Discovered during S248 bot-army scratch audit.

---

## WHAT WAS NOT TOUCHED (and why)

**Product Vision file references.** §5 bot army link templates, §7.3.4 rematch narrative hook, §9.3 article distribution, §10.4 "Bot army needs" (category→icon mapping etc.), §5.1 category icons (framed as bot army infrastructure). Flagged in the walk but not edited. Rationale: these are Product Vision aspirational/historical sections, lower-priority than the active pending spec file, and Pat said "whatever you need to do to make it easy for you." **Recommend a follow-up pass on `THE-MODERATOR-PRODUCT-VISION.md` in a future cleanup session.**

**CLAUDE.md Ring 6 / VPS / Bot Army notes.** CLAUDE.md lines 14, 20, 24, 118-120 reference bot army infrastructure. Not edited this session. Mirror deprecation (LM-202) already has "NT/CLAUDE.md Ring 6 framing removal" flagged as cleanup. Bot army framing should ride along in the same cleanup pass.

**NT sections 5, 7, 10, 11, 127, 136, 237, 308-317.** Extensive bot army narrative (quarantine status, VPS toolchain, deploy notes, Groq key). Not edited this session beyond line 332. These sections document the quarantined state; they can either be left historical or cleaned up in a dedicated NT pass. Not urgent.

**`moderator-bot-army-schema.sql` file itself.** Not edited. The SQL is historical — schema was already applied to production. Tables (`bot_activity`, view `bot_stats_24h`) and `hot_takes.is_bot_generated`/`source_headline`/`source_url` columns are inert in production. Per Pat: "let them float in the ether."

**Test walkthrough.** H-14 says the bot army scenario section needs deletion. Not done this session — flagged for the dedicated test walkthrough update session.

**Old Testament, War Chest, Wiring Manifest, Playbook, User Guide, analytics migration SQL.** All contain bot army references (grep hits). Not touched. Flagged for future cleanup pass.

---

## STILL PARKED (carried forward from S247, unchanged)

- F-57 drop rates and trigger conditions (economy session)
- F-57 pricing re-balance (economy session)
- Forging cost verification (code session)
- Old `submit_reference` RPC retirement (no migration plan)
- 2x Multiplier / Reveal power-up from F-51 §9 (Pat decision at build time)
- F-08 section title (cosmetic)
- Mirror deprecation cleanup (LM-202)
- Spectator review queue for mod rulings
- Link-rot HEAD-request crawler (S247 deferred)

## NEW PARKED THIS SESSION

- **Product Vision bot-army cleanup pass.** §5, §7.3.4, §9.3, §10.4 all still reference bot army. Low priority.
- **CLAUDE.md / NT bot-army narrative cleanup pass.** Bot army mentioned extensively in both. Low priority — documents the quarantined/scratched state accurately.
- **Old Testament / War Chest / Wiring Manifest / Playbook / User Guide / analytics-migration SQL bot-army cleanup pass.** Grep hits not audited this session. Low priority.
- **`moderator-bot-army-schema.sql` + inert tables.** No teardown plan. `bot_activity` table, `bot_stats_24h` view, and the three `hot_takes` bot columns stay in production inert. Pat: "float in the ether."
- **VPS `161.35.137.21` at $6/mo.** No teardown plan. PM2 idle. Pat's mental horizon: "think end of this year" but not a written review date.
- **`GROQ_API_KEY` rotation/removal.** NT line 332 now says "can be rotated/removed at convenience." Not urgent — no attack surface, just unused.

---

## STILL-OPEN TODOS FROM S247 (carried forward)

- F-57 integration into F-10 build plan (60 SKUs, tables, indices)
- Reference socket model in code — `reference_sockets` table migration (F-55 + F-57 share)
- F-51 `score_debate_comment` server-side modifier math rewrite
- Archive table column additions (`base_score`, `in_debate_modifier`, `final_contribution`)
- Royalty ledger schema (new `reference_royalty_log` table or columns on `token_earn_log`)
- `edit_reference` RPC field whitelist check (exclude `source_type`), unit test required
- `cite_debate_reference` RPC bot check, integration test required
- Five F-55 indexes in the F-55 launch migration

## NEW TODOS FROM S248

- **`profiles.is_bot BOOLEAN DEFAULT false NOT NULL`** column migration — must be the first step of the F-55 build migration, before `cite_debate_reference` RPC work. See LM-209.
- **`api/go-respond.js` Groq→Claude migration** is already complete (S208) but NT was stale. Flagged in this handoff for awareness only; no action needed.

---

## SESSION 249 FIRST ACTIONS (in order)

1. Re-clone repo to `/home/claude/colosseum`.
2. Pat re-uploads this S248 handoff at session start.
3. Pat uploads updated `THE-MODERATOR-FEATURE-SPECS-PENDING.md`, `THE-MODERATOR-PUNCH-LIST.md`, `THE-MODERATOR-LAND-MINE-MAP.md`, and `THE-MODERATOR-NEW-TESTAMENT.md` from repo (or re-uploads S248 versions if the repo upload didn't happen).
4. Decide session focus. Primary options:
   - **Walk another unwalked feature.** Remaining from S247 backlog: F-09, F-16, F-17, F-18, F-23, F-24, F-32. (F-06 Debate Analytics Overlay is punch-list-tracked and still unwalked on the spec side; it depends on F-05 recording so walking it now may be premature.)
   - **Role × capability map** (original S243 end goal — Debater / Moderator / Spectator columns, every interaction tied to its code path). Multi-session mapping effort.
   - **F-55 build work** — start with the `profiles.is_bot` column migration (LM-209), then `edit_reference` RPC, then `cite_debate_reference` bot check, then royalty ledger schema.
   - **F-57 build work** — 4 new RPCs (`buy_modifier`, `buy_powerup`, `socket_modifier`, `equip_powerup_for_debate`) and DB migrations.
   - **Product Vision / CLAUDE.md / NT bot-army cleanup pass** — low-priority sweep to finish the S248 scratch across all remaining doc surfaces.
   - Something else.
5. No Claude commits. Pat handles all uploads via GitHub web UI.

---

## CRITICAL FILE PATHS (unchanged from S247)

- Repo: https://github.com/wolfe8105/colosseum
- Clone: `/home/claude/colosseum`
- Pending spec file: `THE-MODERATOR-FEATURE-SPECS-PENDING.md`
- Punch list: `THE-MODERATOR-PUNCH-LIST.md`
- Land Mine Map: `THE-MODERATOR-LAND-MINE-MAP.md` (118 entries as of S248)
- New Testament: `THE-MODERATOR-NEW-TESTAMENT.md`
- Supabase project: `faomczmipsccwbhpivmp`
- Production: themoderator.app
- **Bot army VPS (SCRATCHED S248 — still running, idle):** DigitalOcean `161.35.137.21`, $6/mo, PM2 idle, `/opt/colosseum/bot-army/colosseum-bot-army/`

---

## SESSION RULES (active, carry forward)

- Rule 1: Print project instructions at session start.
- Rule 2: Parse Pat messages into STATEMENTS/QUESTIONS lists, print before answering. Question = ends in "?" OR starts with who/what/when/where/why/how/which/can/could/should/would/is/are/do/does. If QUESTIONS empty: "Acknowledged" and stop. Else answer only questions.
- Rule 3: Code task = filename, repo URL, or verb from {build,write,fix,edit,refactor,clone,run,deploy,install}. Single shell command: execute. 2+ files or new code: numbered questions only, no code until "build it" / "do it" / "go".
- Rule 4: After answering, stop. No follow-up offers.

---

## NOTES

- **Bot army is dead.** After Session 195 quarantine (PM2 idle, no active posting) and Session 248 formal scratch, the system is retired indefinitely with no teardown plan. Files, VPS, inert tables, and unused API key all "float in the ether." Retirement horizon is "end of this year" mentally but not written down.
- **F-06 naming correction.** The punch-list F-06 is "Debate Analytics Overlay" and is untouched. Earlier docs referenced "F-06 bot army" as if the bot army were F-06 — that was a wrong-F-number phrasing. Bot army was never formally F-numbered. This handoff and all edits treat the two as strictly separate features.
- **LM-209 is an F-55 build blocker.** The `profiles.is_bot` column does not exist. Cannot be skipped when F-55 build work starts. Flagged in both LM-207 (update) and LM-209 (new).
- **AI Sparring and AI Moderator are NOT affected by the bot army scratch.** Both remain live Edge Functions on Supabase using Claude/Anthropic. The F-55 cite-block rule still applies to AI sparring opponents.
- **This session's scratch is not 100% exhaustive.** Product Vision, CLAUDE.md, NT (beyond line 332), Old Testament, War Chest, Wiring Manifest, Playbook, User Guide, and analytics migration SQL all still contain bot army references that were not edited. They are lower-priority surfaces and were explicitly parked. A future cleanup pass should finish the sweep.
- **Session 248 was tightly scoped.** One feature walked (bot army scratch), one new LM entry added, four files edited, zero new build work. Clean closeout of a dead system.
