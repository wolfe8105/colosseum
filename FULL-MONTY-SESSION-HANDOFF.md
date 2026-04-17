# Full Monty Audit — Session Handoff

**Date:** April 17, 2026
**Status:** Ready to run — 5-agent parallel audit starting now
**Repo:** `https://github.com/wolfe8105/colosseum`
**HEAD:** `f0d5854`
**Token:** in chat history (search "ghp_")

---

## What This Is

The Full Monty is a 5-agent parallel code audit covering 338 source files across `src/` and `api/`. It uses the four-stage audit method (Stage 1 → 1.5 → 2 → 3) from `THE-MODERATOR-AUDIT-METHOD-V3.md`. 85 batches of 4 files each, sized under 40KB per batch.

This is separate from and follows the original 57-file audit (Batches 1–16R, complete) and the 10-phase security audit (Phases 0–9, complete). All findings from both prior audits are in `AUDIT-FINDINGS.md`.

---

## Pre-Audit State

All three tiers of Stage 5 fixes are done and pushed:
- **Tier 1** (6 fixes): tsconfig gate, phantom votes, test mock, model string, realtime auth, SQL constraint
- **Tier 2** (12 fixes): getSession violations, API timeouts, service role key, query limits, regex, dedup extraction, Number() casts, dead code removal, button patterns
- **Tier 3** (in progress with CC): CSS tokens, dead code, naming, vitest env, SRI, module scope, LIMIT guards

`npm run typecheck` passes clean. See `AUDIT-FINDINGS.md` pre-audit state section for full fix list with commit hashes. Auditors must read this before reporting — do not re-report already-fixed issues.

---

## How to Run

**The prompt:** `FULL-MONTY-AUDIT-PROMPT.md` — paste into a fresh CC session, swap batch number and token.

**The method:** `THE-MODERATOR-AUDIT-METHOD-V3.md` — CC reads this from the repo. Don't paste it.

**The batch list:** `FULL-MONTY-BATCH-PLAN.md` — 85 batches listed. CC reads this from the repo.

**Parallelism:** Run up to 5 CC sessions simultaneously, each on a different batch number. Each session writes to `audit/batch[NN]/` — fully isolated, no manifest collisions.

**Triage:** After all 85 batches complete, one dedicated triage session merges `audit/batch*/stage3.md` into `AUDIT-FINDINGS.md`. Do not run triage while batches are still active.

---

## Batch Assignment Tracking

Mark batches as they're dispatched and completed. Start with the highest-value files.

**Suggested first 5 (highest complexity / most security surface):**
- Batch 01: `profile-depth.data.ts` · `arena-private-picker.ts` · `auth.ts`
- Batch 05: `config.ts` · `arena-feed-room.ts` · `debate-landing.ts` · `staking.render.ts`
- Batch 06: `reference-arsenal.armory.ts` · `challenge.html.js` · `arena-deepgram.ts` · `auth.core.ts`
- Batch 10: `payments.ts` · `onboarding-drip.ts` · `go-respond.js` · `profile.html.js`
- Batch 13: `home.ts` · `arena-css-lobby.ts` · `arena-feed-machine-turns.ts` · `profile.css.js`

| Batch | Status | Dispatched | Done |
|-------|--------|-----------|------|
| 01 | PENDING | | |
| 02 | PENDING | | |
| 03 | PENDING | | |
| 04 | PENDING | | |
| 05 | PENDING | | |
| 06 | PENDING | | |
| 07 | PENDING | | |
| 08 | PENDING | | |
| 09 | PENDING | | |
| 10 | PENDING | | |
| 11–85 | PENDING | | |

---

## Key Files for Auditors

| File | Purpose |
|------|---------|
| `FULL-MONTY-AUDIT-PROMPT.md` | The CC paste prompt — swap `[NN]` and token |
| `THE-MODERATOR-AUDIT-METHOD-V3.md` | Full audit method — CC reads from repo |
| `FULL-MONTY-BATCH-PLAN.md` | 85 batch file lists + parallelism rules |
| `AUDIT-FINDINGS.md` | All prior findings + pre-audit fix state |
| `CLAUDE.md` | Project invariants — file read verification rule is here |
| `THE-MODERATOR-LAND-MINE-MAP.md` | Known dangerous patterns — read before Stage 2 |
| `THE-MODERATOR-NEW-TESTAMENT.md` | Product spec — intent context for Stage 3 |

---

## Important Rules

1. **File read verification is mandatory.** CLAUDE.md has the rule. `wc -l` before, line count after, numbers must match. No exceptions.
2. **Batch manifest isolation.** Write to `audit/batch[NN]/` not `audit/`. Root manifest is for the old 16R run.
3. **Don't re-report fixed issues.** Pre-audit state section in `AUDIT-FINDINGS.md` lists everything already closed.
4. **Stop after each batch.** Human reviews Stage 3 output before the next batch is dispatched.
5. **Triage is last.** One session, after all 85 batches, merges findings. Not concurrent with active batches.

---

## After Full Monty

Once all 85 batches complete and triage is done:
- Updated `AUDIT-FINDINGS.md` becomes the new source of truth
- Stage 5 triage (Tier 4+ fixes) can begin
- The B2B dashboard build (F-42) is cleared to start — data architecture is verified clean
- Phone smoke test (10 flows, real device) is the next manual step

---

*Handoff written April 17, 2026. The factory is clean. Time to stress-test it.*
