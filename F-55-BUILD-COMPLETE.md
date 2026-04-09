# F-55 BUILD COMPLETE — Reference System Overhaul

**Built by:** Claude Code (Session 252)
**Date:** 2026-04-09

---

## Phases Landed

| Phase | Status | Notes |
|-------|--------|-------|
| A — Schema migration | Clean | Destructive DROP+CREATE, all tables, indexes, RLS |
| B — Forge/edit/delete RPCs | Clean | Fingerprint helper, rarity recompute, 3 RPCs |
| C — Seconding + challenge + cite | Clean | second_reference, challenge/rule rewrite, bot-pair check |
| D — Royalty payout | Clean | pay_reference_royalties, wired into finalize_debate |
| E — Client rewrite | Clean | reference-arsenal.ts full rewrite + 4 callsite files |
| 6 — Retire legacy RPCs | Clean | DROP submit_reference, verify_reference, _calc_reference_power, auto_allow_expired_references |

**tsc --noEmit:** Zero errors in `src/`
**npm run build:** Clean (1.15s)

---

## Parked Decisions

1. **Forging cost = 50 tokens** — placeholder value in `forge_reference`. Pat to adjust in SQL Editor after deploy if needed. Logged in commit message.

2. **`file_reference_challenge` kept as backward-compat wrapper** — delegates to `challenge_reference` internally. The feed room still calls `file_reference_challenge` for in-debate challenges. Could be removed in a future cleanup once the feed room is updated to call `challenge_reference` directly.

3. **`cite_reference` kept as no-op** — the old outcome-tracking path (win/loss per ref) is replaced by royalties. `arena-room-end.ts` still calls it but it returns `{action: 'acknowledged'}` and does nothing. Can be fully removed once arena-room-end.ts stops calling it.

4. **`submitReference` in `auth.ts` / `arena-mod-refs.ts`** — still references the now-dropped `submit_reference` RPC. This is the old live-audio evidence submission path. It will error at runtime. The code is dead since F-51 Phase 3 moved to the loadout system. Safe to remove in a cleanup pass.

---

## Surprise Refactors

1. **`reference_verifications` → `reference_seconds`** — created fresh junction table rather than adapting the old `reference_verifications`. The old table had weighted votes (clan=0.5, rival=2.0, outside=1.0) which don't fit the simple seconding model. Old table dropped in migration.

2. **`reference_challenges` table created** — the old system didn't have a dedicated challenges table. Challenges were inline in `challenge_reference` which took a ruling directly. New system separates filing (with escrow) from ruling via `reference_challenges` table.

3. **`activeChallengeId` state added** — `arena-state.ts` gained a new state variable to track the challenge_id returned by `file_reference_challenge`, needed for `rule_on_reference` calls in the feed room.

4. **`debate_reference_loadouts.rarity_at_cite`** — added to loadouts table (not `debate_references`) since that's where citation tracking actually lives. The brief referenced `debate_references` but the cite flow uses loadouts.

5. **`OpponentCitedRef` type** — the `url` and `domain` fields now map to `source_url` and `source_title` from the new metadata. The type definition in `arena-types.ts` was NOT changed (kept backward compat field names) — the mapping happens at the population site in arena-feed-room.ts.

---

## Test Checklist Status

All 22 tests require **production deploy** to verify. None can be run locally.

| # | Test | Status |
|---|------|--------|
| 1 | Fingerprint dedup | Needs prod verify |
| 2 | Fingerprint case/whitespace | Needs prod verify |
| 3 | URL not in fingerprint | Needs prod verify |
| 4 | Self-seconding block | Needs prod verify |
| 5 | Profile depth gate (25%) | Needs prod verify |
| 6 | Source type edit lock | Code verified — no `p_source_type` param in `edit_reference` |
| 7 | Rarity climb (score 30 = Rare) | Needs prod verify |
| 8 | Mythic gate via graduation | Needs prod verify |
| 9 | Graduation latch | Code verified — latch is one-way in `_recompute` |
| 10 | Challenge penalties (graduated) | Needs prod verify |
| 11 | Seconds floor at 0 | Code verified — `GREATEST(seconds - 5, 0)` |
| 12 | Bot-pair cite block | Needs prod verify |
| 13 | Royalty tiered rates | Needs prod verify |
| 14 | Self-cite zero royalty | Code verified — `CONTINUE` on `forger = citer` |
| 15 | Disputed ref royalty reduction | Needs prod verify |
| 16 | Null debate zero royalty | Code verified — early return on null/abandoned status |
| 17 | Deleted ref zero royalty | Code verified — `CONTINUE` on `deleted_at IS NOT NULL` |
| 18 | Delete rate limit (7/24h) | Needs prod verify |
| 19 | Soft-delete preserves replay | Code verified — no CASCADE delete on debate_references |
| 20 | Socket burn on delete | Code verified — explicit `DELETE FROM reference_sockets` |
| 21 | Five indexes exist | Code verified — in migration |
| 22 | profiles.is_bot default false | Code verified — `DEFAULT false NOT NULL` |

---

## New Land Mine Map Entries to Add

- **LM-210:** `rarity_at_cite` lives on `debate_reference_loadouts`, not `debate_references`. The brief referenced `debate_references` but the actual cite flow uses loadouts. If `debate_references` gets `rarity_at_cite` in a future build, check for column name collision.

- **LM-211:** `file_reference_challenge` is a thin wrapper around `challenge_reference`. Any changes to `challenge_reference` signature or behavior must also check `file_reference_challenge` compatibility.

- **LM-212:** `cite_reference` is a no-op in F-55. If F-57 needs owner self-cite to apply modifier effects, this function must be reactivated. Currently returns `{action: 'acknowledged'}` without side effects.

- **LM-213:** `submitReference` in `auth.ts` calls the dropped `submit_reference` RPC. Will error at runtime. The old live-audio evidence path is dead since F-51 Phase 3. Remove in cleanup.

- **LM-214:** `OpponentCitedRef.url/domain` fields in `arena-types.ts` are mapped from new metadata fields (`source_url`/`source_title`) at the population site in `arena-feed-room.ts`. The type wasn't renamed for backward compat. If `arena-types.ts` is cleaned up, update both sites.

---

## Next Session Focus

**F-57 Phase 1: Modifier/Power-Up Inventory + Shop RPCs + Socketing**

- Catalog table + 60-effect seed
- `user_powerups`, `user_modifiers`, `user_powerups_equipped_in_debate`, `debate_modifier_state` tables
- `buy_powerup`, `buy_modifier`, `socket_modifier`, `equip_powerup_for_debate` RPCs
- Add FK from `reference_sockets.modifier_id` → `user_modifiers.id`
- Socket count cap by rarity: common=1, uncommon=2, rare=3, legendary=4, mythic=5
- Modifier tier gate: catalog effect's `tier_min` must be <= ref's current rarity

---

## Deploy Steps for Pat

1. Run `session-252-f55-overhaul.sql` in Supabase SQL Editor (one shot, one transaction)
2. Verify `profiles.is_bot` column exists: `SELECT is_bot FROM profiles LIMIT 1;`
3. Verify `arsenal_references` has new schema: `\d arsenal_references`
4. Re-export deployed functions: run the export query and commit updated `supabase-deployed-functions-export.sql`
5. Push client changes to GitHub (Vercel auto-deploys)
6. Run test checklist items 1-5, 7-8, 10, 12-13, 15-16, 18 manually

**END OF HANDOFF.**
