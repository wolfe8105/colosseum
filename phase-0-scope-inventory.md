# Phase 0 — Scope Inventory

**Audit reference tag:** `pre-10-prompts-audit` → commit `5a23e9d`
**HEAD at time of audit:** `5a23e9d` (same commit — no changes since tag)
**Audit date:** 2026-04-16
**Auditor note:** This is a baseline inventory. The 10-phase audit has not yet run. Zero files have been changed since the reference tag. All sections below describe the pre-audit state.

---

## Files In Scope

The audit covers all actively maintained source files. The reference tag is at HEAD, so `git diff --stat pre-10-prompts-audit HEAD` produces no output — **0 files changed, 0 insertions, 0 deletions**. The following is the full corpus the audit phases will examine.

### TypeScript source modules (`src/`) — 329 files across root + subdirectories

**`src/` root (134 files, selected listing):**
- Core config and utilities: `config.ts`, `config.types.ts`, `config.toast.ts`, `analytics.ts`, `analytics.utils.ts`, `navigation.ts`, `badge.ts`
- Auth barrel + sub-modules (10 files): `auth.ts`, `auth.core.ts`, `auth.gate.ts`, `auth.rpc.ts`, `auth.follows.ts`, `auth.moderator.ts`, `auth.ops.ts`, `auth.profile.ts`, `auth.rivals.ts`, `auth.types.ts`
- Async barrel + sub-modules (10 files): `async.ts`, `async.actions.ts`, `async.actions-challenge.ts`, `async.actions-post.ts`, `async.actions-predict.ts`, `async.actions-react.ts`, `async.fetch.ts`, `async.render.ts`, `async.render.predictions.ts`, `async.render.takes.ts`, `async.render.wager.ts`, `async.rivals.ts`, `async.state.ts`, `async.types.ts`, `async.utils.ts`, `async.wiring.ts`
- Reference Arsenal (14 files): `reference-arsenal.ts` + 13 sub-modules
- WebRTC (10 files): `webrtc.ts` + 9 sub-modules
- Tokens (6 files): `tokens.ts` + 5 sub-modules
- Leaderboard (7 files): `leaderboard.ts` + 6 sub-modules
- Powerups (7 files): `powerups.ts` + 6 sub-modules
- Notifications (5 files): `notifications.ts` + 4 sub-modules
- Staking (5 files): `staking.ts` + 4 sub-modules
- Rivals presence (4 files): `rivals-presence.ts` + 3 sub-modules
- Cards (3 files): `cards.ts`, `cards.helpers.ts`, `cards.types.ts`
- Voicememo (5 files): `voicememo.ts` + 4 sub-modules
- Bounties (5 files): `bounties.ts` + 4 sub-modules
- Modifiers (5 files): `modifiers.ts` + 4 sub-modules
- Tournaments (5 files): `tournaments.ts` + 4 sub-modules
- Profile-debate-archive (8 files): `profile-debate-archive.ts` + 7 sub-modules
- Single-file modules: `scoring.ts`, `share.ts`, `share.ui.ts`, `payments.ts`, `paywall.ts`, `nudge.ts`, `tiers.ts`, `navigation.ts`, `onboarding-drip.ts`, `intro-music.ts` + 2 sub-modules

**`src/arena/` (107 files):**
Full arena subsystem: `arena.ts` (barrel), `arena-core.ts`, `arena-core.utils.ts`, `arena-state.ts`, `arena-types.ts` + 14 arena-types sub-files, `arena-css.ts` + 18 arena-css sub-files, `arena-lobby.ts`, `arena-lobby.cards.ts`, `arena-queue.ts`, `arena-match-flow.ts`, `arena-match-found.ts`, `arena-match-timers.ts`, `arena-room-*.ts` (10 files), `arena-mod-*.ts` (8 files), `arena-feed-*.ts` (18 files), `arena-deepgram.ts` + 2 sub-files, `arena-config-*.ts` (5 files), `arena-private-*.ts` (3 files), `arena-sounds.ts` + 1 sub-file, `arena-entrance.ts` + 2 sub-files, `arena-ads.ts`, `arena-bounty-claim.ts`, `arena-intro-music.ts`, `arena-loadout-presets.ts`, `arena-pending-challenges.ts`, `arena-constants.ts`

**`src/pages/` (88 files):**
`home.ts` + 19 sub-modules, `spectate.ts` + 9 sub-modules, `groups.ts` + 17 sub-modules, `settings.ts` + 6 sub-modules, `login.ts` + 2 sub-modules, `plinko.ts` + 8 sub-modules, `profile-depth.ts` + 7 sub-modules, `debate-landing.ts` + 3 sub-modules, `cosmetics.ts` + 3 sub-modules, `auto-debate.ts` + 3 sub-modules, `terms.ts`

### HTML pages (root) — 15 files
`index.html`, `moderator-login.html`, `moderator-plinko.html`, `moderator-settings.html`, `moderator-profile-depth.html`, `moderator-debate-landing.html`, `moderator-auto-debate.html`, `moderator-groups.html`, `moderator-spectate.html`, `moderator-terms.html`, `moderator-privacy.html`, `moderator-challenge.html`, `moderator-cosmetics.html`, `moderator-source-report.html`, `moderator-go.html`

### Serverless API (`api/`) — 9 files
`profile.js`, `profile.helpers.js`, `profile.html.js`, `profile.css.js`, `challenge.js`, `challenge.helpers.js`, `challenge.html.js`, `go-respond.js`, `invite.js`

### Supabase SQL domain files (`supabase/functions/`) — 10 active SQL files
`arena.sql`, `auth.sql`, `moderation.sql`, `references.sql`, `groups.sql`, `tokens.sql`, `predictions.sql`, `hot-takes.sql`, `admin.sql`, `notifications.sql`
*(Plus ~20 per-session migration SQL files also present in `supabase/functions/` — `session-266-*.sql` through `session-270-*.sql` and others)*

### Supabase SQL migrations (root-level) — 1 active file
`fix-apply-end-of-debate-modifiers-idempotency.sql`
*(34 historical migrations moved to `obsolete/` — already applied to live Supabase; not in scope for code audit)*

### Config files
`package.json`, `package-lock.json`, `vercel.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`

### Test files (`tests/`) — 2 files
`tests/f47-moderator-scoring.test.ts`, `tests/f48-mod-debate.test.ts`

---

## Files Out Of Scope

The following exist in the repo but are excluded from the audit:

### `obsolete/` — 69 files (explicitly quarantined)
Bot army code (`bot-engine.ts`, `bot-config.ts`, `lib/leg*.ts`), pre-refactor SQL migrations (34 files, already applied), stale CSS, dead HTML, superseded config files. Moved deliberately; per CLAUDE.md, "Ignore all bot army files." Not audited.

### `dist/` — compiled build output
Generated by `vite build`. Never edit directly. Not audited.

### `colosseum-refactor/` — unknown contents
Untracked directory (appears in `git status` as untracked). Contents unknown. Not committed; not audited.

### `audit/` — prior audit output files (17 files)
Manifests and batch audit findings from the 5-agent post-refactor audit. These are outputs, not source. Not audited.

### `audit-output/`, `audit-outputbatch-B/`, `audit-prompts/`, `refactor-prompts/` — process documents
Audit session outputs and prompt files. Not source code. Not audited.

### `docs/` — unknown contents
Not examined; likely documentation. Not audited.

### `public/` — static assets
Not audited.

### Markdown docs (50+ `.md` files at root)
`THE-MODERATOR-NEW-TESTAMENT.md`, `THE-MODERATOR-OLD-TESTAMENT.md`, `THE-MODERATOR-LAND-MINE-MAP.md`, `THE-MODERATOR-PUNCH-LIST.md`, session handoff docs, audit planning docs, etc. These are reference artifacts, not auditable code. **Exception:** `CLAUDE.md` is read for intent context (see Audit Blind Spots).

### Untracked files
Per `git status`: `.claude/settings.local.json`, `audit/`, `colosseum-refactor/` are untracked. Not in scope.

---

## Sycophancy-Flagged Commits

Grepped `git log --all --oneline --author-date-order -100` for: "You're absolutely right," "Great catch," "Perfect," "Done," "Complete."

**2 commits flagged** (word "complete" / "done"):

| Commit | Message | Matching phrase |
|---|---|---|
| `b916c5f` | `docs: CLAUDE.md cleanup (bot army removed, function count, codebase state); REFACTOR-HANDOFF marked complete` | "complete" |
| `b2e846d` | `docs: bible update — design phase closed (audit complete, refactor complete, bug sweeps done, M-A1 fixed)` | "complete" (×2), "done" |

**Assessment:** Both hits are factual status updates in documentation commits, not agreement phrases in response to a human prompt. Neither matches the "You're absolutely right" / "Great catch" sycophancy pattern. The word "complete" in commit messages describes a state, not a capitulation. **No behavioral sycophancy fingerprints found in commit history.**

Full commit range examined: 100 commits from `5a23e9d` back through `44e2bf4`. No "You're absolutely right," "Great catch," "Perfect," or "Exactly right" found.

---

## Missing Artifacts

| Artifact | Status | Impact on audit |
|---|---|---|
| **CI/CD pipeline** | **ABSENT.** No `.github/workflows/`, no CI config of any kind. | Phases 2 and 6 cannot check test infrastructure. Test results cannot be compared against CI history. |
| **Session transcripts** | **ABSENT.** No transcript files in repo. `transcripts/` and `sessions/` directories do not exist. | Phase 6 (Agentic Drift) is partially blind — cannot examine context compaction points or plan/build leakage from prior sessions. |
| **Test output logs** | **ABSENT.** No committed test results, no `.test-results/`, no `coverage/` directory. | Cannot compare current test state to prior passing state. Phase 2 (Escape) must run tests cold. |
| **Task specs / issue tickets** | **PARTIAL.** Session handoff `.md` files exist (`SESSION-266-HANDOFF.md` through `SESSION-279-START-PROMPT.md`) and spec files exist (`F-23-SPEC-ADDITION.md`, etc.). `CLAUDE.md` and `THE-MODERATOR-PUNCH-LIST.md` are present. No linked issue tracker (no `.github/ISSUE_TEMPLATE`, no Linear/Jira refs in manifests). | Phase 3 (Sycophancy) can partially reconstruct intent from handoff docs and CLAUDE.md. Full premise-checking is limited. |
| **requirements.txt / pyproject.toml / Cargo.toml / go.mod** | **N/A.** Project is TypeScript-only. Only `package.json` and `package-lock.json` present. Not missing — correct for the stack. | Phase 1 (Confabulation) checks npm only. |
| **Lockfile for Supabase migrations** | **ABSENT.** No `supabase/migrations/` directory with numbered migration files. SQL files are session-named, not Supabase CLI-managed. | Cannot run `supabase db diff` against live schema. Schema drift (Stage 1.1 from Attack Plan) is explicitly called out in `THE-MODERATOR-AUDIT-FINISH-PLAN.md` as requiring Supabase CLI + production access. |

---

## Audit Blind Spots

These are structural conditions that limit what the 10 phases can verify. They are observations, not findings.

**1. Test coverage is critically thin.**
Only 2 test files exist for a 372-module codebase. `tests/f47-moderator-scoring.test.ts` and `tests/f48-mod-debate.test.ts` cover 2 of ~43 tables' worth of RPC logic. Phase 2 mutation testing will apply to these 2 files only. The remaining ~370 modules are untested at the automated level. Any Phase 2 findings about test coverage apply at near-total-codebase scale.

**2. No CI pipeline — no automated regression gate.**
Deploys go directly from GitHub push to Vercel. `npm run build` (Vite) is the only automated check that runs on deploy. Type errors that don't surface in `tsc --noEmit` reach production. Phase 2 running `npm run test` will produce the first systematic test run in the audit.

**3. Production-only deployment target.**
There is no staging environment documented. `vercel.json` has one output. CLAUDE.md references a single Supabase project (`faomczmipsccwbhpivmp`). Phase 5 (Architectural Blindness) environment parity checks apply against production, not staging.

**4. No session transcripts = Phase 6 partially blind.**
Agentic Drift analysis (Phase 6) depends on session transcripts to detect context compaction points, plan/build leakage, and thrashing patterns. With no transcripts, Phase 6 falls back to git log analysis only. The `colosseum-refactor/` untracked directory may contain transcript data but was not examined (untracked, unknown state).

**5. Live Supabase schema is the source of truth, not the repo.**
Per CLAUDE.md: "GitHub repo is NOT source of truth for live schema — always verify against Supabase directly." The SQL domain files in `supabase/functions/` represent a snapshot. Phase 5 RPC/RLS auditing applies to these files; any drift between the files and live Supabase is outside the audit's reach without Supabase CLI access.

**6. Intent reconstruction is partial.**
The audit is operating from `CLAUDE.md` (project invariants), session handoff docs, and the `THE-MODERATOR-PUNCH-LIST.md` as proxies for intent. No formal issue tracker. Prior audit outputs in `audit-output/` and `AUDIT-FINDINGS.md` document previous findings but cannot be verified as complete. Phase 3 (Sycophancy) premise-checking will rely on these sources.

**7. `colosseum-refactor/` is untracked and unexamined.**
Git status shows this directory as untracked. Its contents are unknown. It may contain duplicate source files, in-progress work, or alternate implementations. It was not examined for this inventory. It is not in scope for the audit unless explicitly added.

**8. The prior audit (`AUDIT-FINDINGS.md`) reported 0 High findings.**
The five-agent batch audit (63 files, documented in `AUDIT-FINDINGS.md`) found 0 High, 47 Medium, 86 Low findings. This number should be treated as a prior claim, not a verified baseline. The 10-phase audit may find High findings the prior audit missed — that is its purpose.

---

*Phase 0 complete. Do not proceed to Phase 1 without user review.*
