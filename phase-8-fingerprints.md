# Phase 8 — Claude Fingerprints

**Audit range:** commits `5a23e9d..HEAD` on `main`  
**Scope:** `src/`, `api/`, `supabase/`, audit-produced markdown  
**Date:** 2026-04-17  
**Method:** grep + git log analysis per the 10 fingerprint categories in THE-COLISEUM-AI-AUDIT-RESEARCH.md

## Methodology

Each fingerprint is a suspicion flag, not a verdict. A file scores HIGH when 3+ distinct fingerprint types land on it. Results are ranked by total fingerprint score (unique FP types present).

## Aggregate Hit Counts

| Fingerprint | Pattern | Raw Hits | Notes |
|-------------|---------|----------|-------|
| FP1 — Abbrev vars | `err` | 103 | Dominated by `catch (err)` — JS convention, low signal |
| FP1 — Abbrev vars | `res` | 93 | ~7 are `const res = await fetch(...)` — style deviation |
| FP1 — Abbrev vars | `val` | 59 | Local var abbreviation; top files: groups.state.ts (9), profile-depth.render.ts (7) |
| FP1 — Abbrev vars | `obj` | 13 | Minimal |
| FP1 — Abbrev vars | `len` | 7 | Minimal |
| FP1 — Abbrev vars | `idx` | 4 | Minimal |
| FP1 — Abbrev vars | `buf` | 3 | Minimal |
| FP3 — Type suppression | `as any` | 20 | Across 12 files; arena-feed-realtime.ts (4), spectate.ts (3) |
| FP5 — Mock-heavy | mock/stub/spy invocations | 89 total | f48: 65 mocks vs 13 assertions (5:1); f47: 24 mocks vs 14 assertions |
| FP9 — JSDoc blocks | `/**` | 459 | Codebase-wide; heavy concentration in arena/ sub-modules |

## Heatmap Table

Files ranked by total fingerprint score (number of distinct FP types present).

| File | FP1 | FP2 | FP3 | FP5 | FP6 | FP7 | FP8 | FP9 | FP10 | Score | Severity |
|------|-----|-----|-----|-----|-----|-----|-----|-----|------|-------|----------|
| `api/go-respond.js` | YES 26 | YES 2 | — | — | — | YES 7/3 | — | YES 12-line | — | 4 | **HIGH** |
| `src/config.ts` | YES 6 | YES | YES CLAUDE.md | — | — | YES 3 | — | YES 63 | — | 4 | **HIGH** |
| `src/pages/spectate.ts` | YES 5 | YES | YES x3 | — | — | YES 20 | — | YES 25 | — | 4 | **HIGH** |
| `AUDIT-FINDINGS.md` | — | — | — | — | — | YES 5 | YES | — | YES | 3 | **HIGH** |
| `src/arena/arena-feed-realtime.ts` | — | — | YES x4 | — | — | YES 7 | — | YES | — | 3 | **HIGH** |
| `src/arena/arena-feed-room.ts` | — | YES 2 | YES x1 | — | — | YES 26 | — | YES 33 | — | 3 | **HIGH** |
| `src/arena/arena-feed-heartbeat.ts` | — | YES 5 | YES x2 | — | — | — | — | YES 13 | — | 3 | **HIGH** |
| `tests/f48-mod-debate.test.ts` | — | — | — | YES 5:1 | YES 0 neg | — | — | YES 34 | — | 3 | **HIGH** |
| `src/arena/arena-deepgram.ts` | — | YES 1 | — | — | — | — | — | YES 42/5J | — | 2 | MEDIUM |
| `tests/f47-moderator-scoring.test.ts` | — | — | — | YES 1.7:1 | YES 1/8 | — | — | — | — | 2 | MEDIUM |
| `src/pages/group-banner-upload.ts` | YES 2 | — | YES x2 | — | — | — | — | — | — | 2 | MEDIUM |
| `src/auth.core.ts` | — | — | — | — | — | — | — | YES 32 | — | 1 | LOW |
| `src/pages/home.feed.ts` | — | — | YES x1 | — | — | — | — | — | — | 1 | LOW |
| Audit markdown (aggregate) | — | — | — | — | — | — | — | — | YES | 1 | LOW |

Column headers: FP1=Abbrev, FP2=Narrate, FP3=Drift/Suppress, FP5=Mocks, FP6=No-Neg, FP7=Churn, FP8=Reversal, FP9=Bloat, FP10=Structure


---

## Fingerprint Details

### FP1 — Abbreviated Variable Names

**Style guide baseline (CLAUDE.md):** All examples use full names (`debateId`, `userId`, `profile`, `response`). No abbreviated forms appear in the invariant examples.

**Signal vs. noise:**
**Top files by abbreviated var density:**

```
26  api/go-respond.js           (res collision: HTTP response + Express response param)
19  api/challenge.js
18  api/profile.js
10  src/webrtc.peer.ts
10  src/pages/profile-depth.render.ts  (val pattern)
10  src/modifiers-handlers.ts          (res for RPC results)
 9  src/pages/groups.state.ts          (val pattern)
```


---

## Fingerprint Details

### FP1 — Abbreviated Variable Names

**Style guide baseline (CLAUDE.md):** All examples use full names (`debateId`, `userId`, `profile`, `response`). No abbreviated forms appear in the invariant examples.

Signal vs. noise:
- `err` in `catch (err)` — universal JS/TS convention. Not a Claude tell. Baseline noise.
- `res` for HTTP fetch response — 7 uses of `const res = await fetch(...)`. In `api/go-respond.js`, `res` names both the HTTP response and the Express response parameter (same name, different scopes). Express convention makes the param idiomatic, but the collision reduces readability.
- `val` — clearest Claude tell. 59 hits; `groups.state.ts` (9), `profile-depth.render.ts` (7), `profile-depth.section.ts` (7). Multi-step transformation pipelines where `val` substitutes for names like `rawValue`, `displayValue`, `clampedScore`.

Top files by abbreviated var density:

```
26  api/go-respond.js           (res collision: HTTP response + Express response param)
19  api/challenge.js
18  api/profile.js
10  src/webrtc.peer.ts
10  src/pages/profile-depth.render.ts  (val pattern)
10  src/modifiers-handlers.ts          (res for RPC results)
 9  src/pages/groups.state.ts          (val pattern)
```


### FP2 — Narrating Comments

Found ~15 comments that restate what the next line does rather than explaining why. Selected examples with file:line:

```
src/arena/arena-feed-heartbeat.ts:54   // Send heartbeat every 10s
src/arena/arena-feed-heartbeat.ts:63   // Send first beat immediately
src/arena/arena-feed-heartbeat.ts:67   // Check staleness every 5s
src/arena/arena-feed-heartbeat.ts:104  // Check debater disconnect
src/arena/arena-feed-heartbeat.ts:114  // Check mod disconnect (either debater can act)

src/arena/arena-bounty-claim.ts:63     // Render dropdown
src/arena/arena-bounty-claim.ts:135    // Hide the dropdown, show locked state

src/arena/arena-feed-room.ts:79    // Show connection status in the existing turn-label area
src/arena/arena-feed-room.ts:189   // Render initial controls based on role

src/arena/arena-feed-events-render.ts:101  // Remove fireworks class after animation completes
src/arena/arena-feed-events-render.ts:105  // Update scoreboard from authoritative server totals

src/arena/arena-feed-machine-pause.ts:43   // Show pause overlay
src/arena/arena-feed-machine-pause.ts:97   // Remove ruling panel if present
src/arena/arena-feed-machine-turns.ts:92   // Show concede after round 1
```

`arena-feed-heartbeat.ts` is the worst single offender: 5 narrating comments in 13 total comment lines (38%). Contrast with legitimate comments in the same codebase: `// TIMING-05 fix: clear any existing heartbeat first to prevent timer stacking` explains a non-obvious constraint. `// LANDMINE [LM-REALTIME-001]` flags a subtle dep-ordering requirement. The narrating comments do neither.

---

### FP3 — Docstring/Comment Drift from Implementation

**Finding 1: CLAUDE.md states wrong file for `safeRpc()` — CONFIRMED DRIFT**

CLAUDE.md contains:
> `safeRpc()` lives in `auth.core`.

Actual location: `src/auth.rpc.ts` (confirmed: `export async function safeRpc` at line 21). The barrel `src/auth.ts` re-exports it from `auth.rpc.ts`. The `auth.core.ts` docstring correctly states `safeRpc -> auth.rpc.ts`. CLAUDE.md is the stale document. Since CLAUDE.md is injected as primary context for every session, future agents will look in `auth.core.ts` for `safeRpc` and not find it.

**Finding 2: `(client as any)` — 20 type-suppression casts across 12 files**

Per the audit brief, this pattern is a Claude tell for suppressing a type error rather than fixing it. The Supabase JS client types do not expose `.realtime.setAuth()`, `.removeChannel()`, or `.storage` at the correct type level.

Complete inventory:

```
src/arena/arena-feed-realtime.ts:42   (client as any).auth.getSession()
src/arena/arena-feed-realtime.ts:44   (client as any).realtime.setAuth(accessToken)
src/arena/arena-feed-realtime.ts:46   (client as any).channel(...)
src/arena/arena-feed-realtime.ts:87   (client as any).removeChannel(...)

src/arena/arena-feed-heartbeat.ts:57  (feedRealtimeChannel as any).send(...)
src/arena/arena-feed-heartbeat.ts:87  (feedRealtimeChannel as any).send(...)

src/pages/group-banner-upload.ts:89   (client as any).storage
src/pages/group-banner-upload.ts:94   (client as any).storage

src/pages/spectate.ts:121  (directData as any).debater_a_profile
src/pages/spectate.ts:122  (directData as any).debater_b_profile
src/pages/spectate.ts:184  (chatData || []) as any[]

src/auth.core.ts:145    { auth: { lock: noOpLock } } as any
src/pages/home.feed.ts:14   (sb as any)
src/pages/home.ts:158   fallback profile object as any
src/pages/plinko-step3-username.ts:109  getSupabaseClient() as any
src/pages/groups.feed.ts:52  (t.profiles_public as any)
src/notifications.ts:68  (window as any).ColosseumNotifications
src/arena/arena-sounds-core.ts:17  (window as any).webkitAudioContext
src/arena/arena-feed-room.ts:226  mode: 'live' as any
```

`arena-sounds-core.ts` (`webkitAudioContext`) and `notifications.ts` (`window.ColosseumNotifications`) are vendor-API and global-namespace patterns — legitimate exceptions. `arena-feed-realtime.ts` (4 casts on the same `client` object) is the clearest suppression cluster. A typed wrapper around `SupabaseClient` exposing the realtime/storage methods would eliminate it in a single fix.

**Finding 3: `arena-deepgram.ts` docstring — verified accurate**

Docstring claims 5 behaviors: fetch JWT -> open WebSocket -> pipe audio -> emit transcripts -> three-tier fallback. All 5 are implemented. No drift.


---

### FP4 — Sycophancy Phrases

**In commit messages:** Zero matches for "You're absolutely right," "Great catch," "Perfect," "Exactly right," or close variants across all 26 audit-range commits and the broader 200-commit history.

**In code comments:** One false positive — `"Sustained mystical pads — perfect 5ths"` in `src/arena/arena-intro-music.ts:119`. Music theory terminology, not agreement capitulation.

**In audit markdown (phase-0 through phase-7):** No capitulation phrases found.

**Interpretation:** SYC-SYS-01 (Phase 3) documented zero pushback across 200 commits. This fingerprint scan finds no textual sycophancy artifacts, confirming the Phase 3 finding: the pattern is behavioral (silent compliance) not textual (explicit agreement phrases). The absence of "you're right" language is not exculpatory — it means the agent complied without announcing it.

---

### FP5 — Mock-Heavy Tests

Only 2 active test files exist for 372 modules. Both are mock-heavy.

| File | Mock invocations | Assertions | Ratio | Flag |
|------|----------------|-----------|-------|------|
| `tests/f48-mod-debate.test.ts` | 65 | 13 | 5:1 | HIGH |
| `tests/f47-moderator-scoring.test.ts` | 24 | 14 | 1.7:1 | MEDIUM |

`f48` mocks the entire auth module, config module, arena DOM, WebRTC, tokens, scoring, and navigation — 12 distinct module mocks for 8 test cases. The mock surface covers the complete call graph, meaning the tests verify only that Claude wrote mocks consistent with the code Claude wrote. No real integration path is exercised.

Context note: `vi.hoisted()` is required because `arena.ts` has top-level DOM operations that fire on module load — a real constraint, not a Claude error. It explains why setup count is high, not whether coverage is adequate.

---

### FP6 — Missing Negative Tests

| File | Negative test names | Total tests | Missing scenarios |
|------|-------------------|------------|------------------|
| `tests/f48-mod-debate.test.ts` | 0 | 8 | Concurrent `endDebate` calls, invalid `debateId`, unauthenticated caller, `modView` toggle mid-debate |
| `tests/f47-moderator-scoring.test.ts` | 1 (TC6 RPC error) | 8 | Score out of range, missing debate ID, network timeout, duplicate submission |

Scope note: The missing-negative-test fingerprint is effectively universal — only 2 test files exist for 372 modules. The aggregate finding: the test layer has zero coverage of error paths, boundary conditions, or rejection scenarios for 370 of 372 modules. The 2 files that exist prioritize happy-path and guard-behavior tests.

---

### FP7 — Edit Frequency Map

**In audit range (`5a23e9d..HEAD`), source files only:**

| File | Edits | Pattern |
|------|-------|---------|
| `src/config.ts` | 3 | Credential removal, sanitizeUrl(), env hardening — 3 reactive security patches |
| `api/go-respond.js` | 3 | Rate limit, auth gate, IP trust — 3 sequential security patches |
| `src/arena/arena-feed-events-render.ts` | 1 | Single edit in range |

**Full git history (thrashing signal):**

| File | Total edits | Pattern |
|------|------------|---------|
| `src/arena/arena-feed-room.ts` | 26 | Extracted from arena.ts, repeatedly refactored, orchestrator for feed pipeline |
| `src/pages/spectate.ts` | 20 | Sequential feature additions over time |
| `src/arena/arena-feed-realtime.ts` | 7 | Split 3x, auth added, ICE restart, setAuth fix — each edit patches what the prior left open |
| `api/go-respond.js` | 7 | Groq->Claude swap, rate limit (2x), auth gate, IP trust fix — same reactive pattern |

Callout — `arena-feed-realtime.ts`: 7 edits and 4 `as any` casts tell a consistent story. The module was written without auth in mind, then auth was patched in session by session. The `(client as any).realtime.setAuth()` call added in commit `277559d` is the auth-injection fix — correct, but reactive.

Callout — `api/go-respond.js`: 3 security patches in the audit window alone (SYC-H-02 rate limit, HP-01 Redis rate limit, Phase 7 HIGHs auth gate + IP trust). The endpoint was designed for functionality first, hardened under audit pressure.


---

### FP8 — Agreement-in-Diff / Reversal Detection

**One confirmed reversal:**

| Commit | Action | Notes |
|--------|--------|-------|
| `5a64c96` | Phase 5 files P5-SD-1, P5-BI-1, P5-BI-2 as HIGH | OG meta tag injection, billing exposure |
| `d876eda` | Retroactively downgrades all three to MEDIUM | Buried inside commit "fix: P5-EP-1 credential removal" — no new code evidence |
| `bc55c69` | Phase 7 restores P5-SD-1 to HIGH | Reversal of the downgrade, no new code evidence cited |

This is a confirmed round-trip: HIGH -> MEDIUM -> HIGH. Phase 6 documented this as THRASH-02 and DRIFT-NC-01. The reversal occurred without new code-level analysis — severity changed because a later agent disagreed with an earlier agent's judgment, not because the code changed.

No explicit reversal language appears in commit subjects. The semantic reversal is real; the textual signal is absent. This is consistent with SYC-SYS-01: compliance and reversal happen silently.

---

### FP9 — Explanation Bloat

**Top offenders by comment density:**

| File | Comment lines | Max consecutive block | Note |
|------|-------------|----------------------|------|
| `src/config.ts` | 63 | 4 | Section dividers (`// ====...====`) repeat 8 times — visual chrome, not information |
| `api/go-respond.js` | 27 | 12 | 12-line file header explaining what the filename already says |
| `src/arena/arena-feed-room.ts` | 33 | 3 | Acceptable for an orchestrator |
| `src/auth.core.ts` | 32 | 3 | LANDMINE comment legitimate; section dividers repeat config.ts pattern |
| `src/arena/arena-deepgram.ts` | 42 | 3 | 5 JSDoc blocks for a 300-line file |

Codebase-wide: 459 `/**` JSDoc block openers. For a TypeScript codebase where types self-document, this density indicates Claude defaulting to its training distribution (heavily documented library code) rather than the project's lean comment style described in CLAUDE.md.

`go-respond.js` 12-line consecutive block (lines 1-12):

```
// THE MODERATOR — /go AI Debate Responder (Serverless Function)
// Session 206 | Session 208: Swapped Groq -> Claude API
//
// WHAT THIS DOES:
// 1. Receives topic, side, round, user argument, conversation history
// 2. Calls Claude (claude-sonnet-4-20250514) server-side
// 3. Returns AI counter-argument
//
// ROUTE: /api/go-respond (called by moderator-go.html)
//
// ENV VARS REQUIRED: ANTHROPIC_API_KEY, UPSTASH_REDIS_REST_URL, ...
```

Lines 1-2: describe what the filename says. Lines 4-7: describe what the handler body does. Lines 8-9: repeat the route. Lines 10-11: belong in `.env.example`. None of this is why.

---

### FP10 — Over-Structured Output

**Audit-produced markdown:** 853 structured lines (headers, bullets, bold, numbered lists) added across 15 markdown files in the audit commit range.

| Doc | Total lines | Structured lines | Density |
|-----|------------|-----------------|---------|
| `FULL-MONTY-BATCH-PLAN.md` | ~743 | est. 250+ | ~34% |
| `phase-7-red-team.md` | 453 | 126 | 28% |
| `AUDIT-SESSION-HANDOFF.md` | 134 | 40 | 30% |

Signal: `FULL-MONTY-BATCH-PLAN.md` (743 lines, 85 batches, 338 files) was noted in Phase 6 as scope expansion beyond the 10-phase design — a Claude-generated planning document that exceeded task scope. Its structure (tables, batch numbers, parallel tracks, phase labels) is consistent with Claude's default output style when given an open-ended planning prompt with no length constraint.

In source code: `config.ts` section dividers (`// ====...====` x 8) are the code-level equivalent — visual scaffolding that adds length without information density.


---

## Summary Heatmap (Ranked by Score)

| Rank | File | Score | Severity | Dominant FPs |
|------|------|-------|----------|-------------|
| 1 | `api/go-respond.js` | 4 | **HIGH** | FP1 (26 abbrev), FP2 (narrate), FP7 (7 hist/3 audit), FP9 (12-line block) |
| 1 | `src/config.ts` | 4 | **HIGH** | FP1, FP2 (section cmts), FP3 (CLAUDE.md drift), FP7 (3 audit), FP9 (63 cmts) |
| 1 | `src/pages/spectate.ts` | 4 | **HIGH** | FP1, FP2, FP3 (`as any` x3), FP7 (20 hist), FP9 (25 cmts) |
| 4 | `AUDIT-FINDINGS.md` | 3 | **HIGH** | FP7 (5 edits), FP8 (severity reversal round-trip), FP10 (heavy structure) |
| 4 | `src/arena/arena-feed-realtime.ts` | 3 | **HIGH** | FP3 (`as any` x4), FP7 (7 hist), FP9 (15-line JSDoc) |
| 4 | `src/arena/arena-feed-room.ts` | 3 | **HIGH** | FP2, FP3 (`as any`), FP7 (26 hist), FP9 (33 cmts) |
| 4 | `src/arena/arena-feed-heartbeat.ts` | 3 | **HIGH** | FP2 (5 narrate), FP3 (`as any` x2), FP9 (13 cmts) |
| 4 | `tests/f48-mod-debate.test.ts` | 3 | **HIGH** | FP5 (5:1 mock ratio), FP6 (0 negative tests), FP9 (34 cmts) |
| 9 | `src/arena/arena-deepgram.ts` | 2 | MEDIUM | FP2, FP9 (5 JSDoc blocks) |
| 9 | `tests/f47-moderator-scoring.test.ts` | 2 | MEDIUM | FP5 (1.7:1), FP6 (1 of 8 negative) |
| 9 | `src/pages/group-banner-upload.ts` | 2 | MEDIUM | FP1, FP3 (`as any` x2) |
| 12 | `src/auth.core.ts` | 1 | LOW | FP9 |
| 12 | `src/pages/home.feed.ts` | 1 | LOW | FP3 (`as any`) |
| 12 | Audit markdown (aggregate) | 1 | LOW | FP10 |

---

## Cross-Cutting Observations

**1. The `as any` cluster is the most actionable single finding.**
20 instances across 12 files. All are Supabase client call sites where TypeScript types are incomplete. A typed accessor wrapper around `SupabaseClient` exposing the realtime/storage methods would eliminate the `arena-feed-realtime.ts` cluster (4 casts) in a single PR. `arena-sounds-core.ts` (`webkitAudioContext`) and `notifications.ts` (`window.ColosseumNotifications`) are vendor-API and global-namespace patterns — legitimate exceptions.

**2. The two test files are structurally inadequate for regression detection.**
`f48-mod-debate.test.ts` has 65 mock setup lines for 13 assertions. When the mock surface covers the entire call graph, the tests verify only that Claude wrote mocks consistent with the code Claude wrote. No integration path is exercised. The 372-to-2 module-to-test ratio means the test suite cannot catch regressions in 370 of 372 modules.

**3. `api/go-respond.js` and `src/arena/arena-feed-realtime.ts` are the two named high-churn files and both carry 3+ fingerprint types.**
The churn pattern on both is reactive security hardening: each session patched what the prior session left open, rather than designing the security surface upfront. This matches the architectural blindness pattern documented in Phase 5.

**4. CLAUDE.md is stale on `safeRpc` location.**
CLAUDE.md says `safeRpc()` lives in `auth.core`; it actually lives in `src/auth.rpc.ts`. The `auth.core.ts` docstring correctly identifies this. CLAUDE.md is the stale document, and it is injected as primary context in every session — future agents will look in the wrong file.

**5. Behavioral sycophancy has no textual fingerprint.**
SYC-SYS-01 is confirmed: zero pushback across 200 commits. This phase finds zero explicit sycophancy phrases in commits, comments, or code. Behavioral sycophancy (silent compliance, scope expansion without objection, severity reversal without pushback) leaves no commit-level text trail. The only evidence is in what was never said.

---

*Phase 8 complete. Do not proceed to Phase 9 — reviewer checks first.*
