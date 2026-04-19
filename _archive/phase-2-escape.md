# Phase 2 — Escape Behavior Report

**Audit reference tag:** `pre-10-prompts-audit` → commit `5a23e9d`
**Audit date:** 2026-04-16
**Auditor:** Claude Sonnet 4.6 (fresh session, no prior phase context)
**Scope:** All test files, all source files, CI configuration, test infrastructure

---

## Methodology

All steps from PROMPT 2 were executed directly. No prior test output was trusted. Commands are recorded verbatim. The "audited diff" is the whole codebase, since `git diff --stat pre-10-prompts-audit HEAD` shows only the two prior phase reports added — zero source code changes.

**Context from prior phases carried forward:**
- Phase 0: Only 2 test files exist for a 372-module codebase. No CI pipeline. tsconfig.json excludes `src/`.
- Phase 1: `tsconfig.json` excludes `src/**` — the type checker is a no-op for application code. Any type-safety finding in this phase is undetectable by the existing Gate 1 check.

---

## Section 1 — Actual Test Output

**Command run:**
```
npm test -- --reporter=verbose
```

**Complete stdout/stderr:**
```
 RUN  v3.2.4 C:/Users/wolfe/colosseum-main

 ✓ tests/f47-moderator-scoring.test.ts > TC1 — correct RPC function name > calls score_moderator
 ✓ tests/f47-moderator-scoring.test.ts > TC2 — named parameters > sends p_debate_id and p_score as named keys
 ✓ tests/f47-moderator-scoring.test.ts > TC3 — debate ID passed correctly > p_debate_id matches the value passed
 ✓ tests/f47-moderator-scoring.test.ts > TC4 — happy path success > returns { success: true } when RPC succeeds
 ✓ tests/f47-moderator-scoring.test.ts > TC5 — null data fallback > returns { success: true } when null data
 ✓ tests/f47-moderator-scoring.test.ts > TC6 — RPC error returns failure > returns { success: false, error }
 ✓ tests/f47-moderator-scoring.test.ts > TC7 — fair score value > sends p_score = 25 for thumbs-up
 ✓ tests/f47-moderator-scoring.test.ts > TC8 — unfair score value > sends p_score = 0 for thumbs-down

 FAIL  tests/f48-mod-debate.test.ts [ tests/f48-mod-debate.test.ts ]
Error: [vitest] No "DEBATE" export is defined on the "../src/config.ts" mock.
Did you forget to return it from "vi.mock"?
  ...
  ❯ src/arena/arena-state.ts:39:37
    37| export let selectedRanked: boolean = false;
    38| export let selectedRuleset: 'amplified' | 'unplugged' = 'amplified';
    39| export let selectedRounds: number = DEBATE.defaultRounds;
    40| export let selectedCategory: string | null = null;
  ❯ src/arena/arena-core.ts:13:1

 Test Files  1 failed | 1 passed (2)
       Tests  8 passed (8)
    Start at  20:48:56
    Duration  2.00s (transform 291ms, setup 0ms, collect 307ms, tests 4ms, environment 2.47s, prepare 336ms)
```

**Summary:**
| Metric | Value |
|---|---|
| Test files collected | 2 |
| Test files passed | 1 |
| Test files failed | 1 (failed to collect — module init error) |
| Tests collected | 8 (from f47 only) |
| Tests passed | 8 |
| Tests failed | 0 (the 8 in f48 were never collected) |
| Total runtime | 2.00s |

**Critical finding:** `f48-mod-debate.test.ts` produces zero collected tests. The 8 tests covering F-48 (mod-initiated debate guard) are completely unrunnable. The test file's `vi.mock('../src/config.ts', ...)` factory omits the `DEBATE` export. When Vitest loads `arena.ts` → `arena-core.ts` → `arena-state.ts`, the module-level statement `export let selectedRounds: number = DEBATE.defaultRounds` fires during collection and throws `TypeError: Cannot read properties of undefined (reading 'defaultRounds')` because `DEBATE` resolves to `undefined` from the incomplete mock.

This means **F-48 functionality has zero test coverage** despite two committed test files listing it as covered.

---

## Section 2 — Tests That Pass By Construction

**Mutation 1: Change RPC function name**

Target: `src/auth.moderator.ts:121`
Mutation: `safeRpc('score_moderator', ...)` → `safeRpc('MUTATION_score_moderator', ...)`

```
npm test -- tests/f47-moderator-scoring.test.ts --reporter=verbose

 × TC1 — calls score_moderator: expected 'MUTATION_score_moderator' to be 'score_moderator'
 ✓ TC2 — named parameters
 ✓ TC3 — debate ID passed correctly
 ✓ TC4 — happy path success
 ✓ TC5 — null data fallback
 ✓ TC6 — RPC error returns failure
 ✓ TC7 — fair score value
 ✓ TC8 — unfair score value

Tests  1 failed | 7 passed (8)
```

TC1 catches the mutation as intended. TC2–TC8 still pass — they test parameter keys, debate ID threading, and return value logic, which are orthogonal to the function name. This is correct behavior: each test asserts one contract, and TC2–TC8's contracts (parameter shape, return values) were not mutated.

**Mutation 2: Change parameter key name**

Target: `src/auth.moderator.ts:122`
Mutation: `p_debate_id: debateId` → `debate_id_MUTATION: debateId`

```
npm test -- tests/f47-moderator-scoring.test.ts --reporter=verbose

 ✓ TC1 — calls score_moderator
 × TC2 — named parameters: expected [ 'debate_id_MUTATION', 'p_score' ] to deeply equal [ 'p_debate_id', 'p_score' ]
 × TC3 — debate ID passed correctly: expected undefined to be 'debate-specific-id-xyz'
 ✓ TC4 — happy path success
 ✓ TC5 — null data fallback
 ✓ TC6 — RPC error returns failure
 ✓ TC7 — fair score value
 ✓ TC8 — unfair score value

Tests  2 failed | 6 passed (8)
```

TC2 and TC3 catch the mutation. TC1, TC4–TC8 continue to pass. The source file was reverted after each mutation.

**Assessment — TESTS-BY-CONSTRUCTION verdict: PARTIAL**

TC4–TC8 will pass regardless of whether the wrong RPC function name is called, as long as the mock returns `{ data: { success: true }, error: null }`. A function that called `safeRpc('completely_wrong_name', { wrong_key: debateId, wrong_score: score })` would still make TC4–TC8 pass. However, TC1–TC3 together form a complete guard for the call routing and parameter contract.

**The concern is scope, not construction:** TC1–TC3 guard the RPC interface. TC4–TC8 guard the return value processing. No test guards the interaction between a wrong call and the actual server behavior — that gap is structural (no integration tests, no staging environment) and is noted in Phase 0.

**f48 — TESTS-BY-CONSTRUCTION by default (UNRUNNABLE):** Since f48 fails to collect, all 8 tests in it are effectively TESTS-BY-CONSTRUCTION in the worst possible way: they can neither fail nor pass. The coverage they were intended to provide (modView guard in `endCurrentDebate()`, input area hiding for mod observers) is zero.

---

## Section 3 — Incomplete Work Markers

**Commands run:**
```
grep -rn "TODO|FIXME|XXX|HACK|throw new Error.*not implemented" src/ --include="*.ts"
```

**Total TODO count: 116**

**By category:**

| Category | Count | File pattern |
|---|---|---|
| `TODO: needs CSS var token` (hardcoded hex colors) | ~105 | `src/arena/arena-css-*.ts`, `src/async.*.ts`, `src/auth.gate.ts`, etc. |
| Functional/behavioral TODOs | 4 | See below |
| Code-comment TODOs | 1 | `arena-core.ts` (inline label) |
| HTML template placeholder | 1 | `arena-feed-machine-ads.ts` |

**Substantive incomplete-work findings:**

**IW-1 — Token balances hardcoded to 0**
`src/async.fetch.ts:67`
```typescript
tokens: 0, // TODO: token balances not available from hot_takes query
```
The `hot_takes` query does not return token balances. The field is hardcoded to `0`. Any UI rendering a token count from this path will silently display `0` for all users regardless of their actual balance. This is not a TODO annotation for cosmetic work — it represents a missing data fetch.

**IW-2 — AdSense placeholder IDs in production template**
`src/arena/arena-feed-machine-ads.ts:133`
```html
<!-- Replace PUBLISHER_ID with ca-pub-XXXXXXXXXXXXXXXX and AD_UNIT_ID with your slot ID -->
```
A developer comment describing how to configure AdSense is present in a production source file. The `PUBLISHER_ID` and `AD_UNIT_ID` tokens are placeholder strings in what appears to be a template that was copied in without being filled in. If ad rendering is live, this would produce non-functional ad slots.

**IW-3 — `arena-core.ts` F-39 label without implementation reference**
`src/arena/arena-core.ts:88`
```typescript
// F-39: Auto-join via challenge link (?joinCode=XXXXXX)
```
A feature label comment. Not a TODO but indicates a feature flag reference that is not easily searchable by feature flag tooling. Low priority.

**FIXME/XXX/NotImplementedError/empty function bodies:** None found in `src/`.

**`HACK` marker:** None found in `src/`.

---

## Section 4 — Removed Safety Checks

**Diff command:**
```
git diff --stat pre-10-prompts-audit HEAD
```

**Output:** Only `phase-0-scope-inventory.md` and `phase-1-confabulation.md` added (2 documentation files). Zero TypeScript source files changed. Zero safety checks removed in the audited diff.

**However — pre-existing safety bypasses worth documenting for the record:**

**RS-1 — Auth invariant violation with `as any` mask**
`src/arena/arena-feed-realtime.ts:42`
```typescript
const { data: sessionData } = await (client as any).auth.getSession();
```
This combines two violations: (1) `auth.getSession()` is explicitly forbidden by `CLAUDE.md` ("Never use `getSession()` directly"), and (2) the `as any` cast hides this from TypeScript's type checker. The cast was not removed by the audited diff — it's pre-existing. Flagged in Phase 1; included here because the `as any` is specifically an escape pattern that hides safety violations from static analysis.

**RS-2 — Auth state check bypassed via private Supabase API**
`src/arena/arena-feed-realtime.ts:44`
```typescript
if (accessToken) (client as any).realtime.setAuth(accessToken);
```
Calls a private (undocumented) Supabase `realtime.setAuth()` method via `as any`. This bypasses the public auth API contract. If the internal API changes, this silently fails.

**RS-3 — Castle Defense pattern intact — no violations found**
```
grep -rn "\.from(" src/ --include="*.ts" | grep -E "\.(insert|update|delete|upsert)\("
```
Output: empty. No direct `INSERT`, `UPDATE`, or `DELETE` calls from client TypeScript code. Castle Defense (all writes via `.rpc()`) is intact.

---

## Section 5 — Fake Data Patterns

**Commands run:**
```
grep -rn "getIsPlaceholderMode" src/ --include="*.ts" | grep "return \["
```

**FD-1 — Hardcoded moderator fixture objects in production source**
`src/auth.moderator.ts:153–156`
```typescript
export async function getAvailableModerators(excludeIds?: string[]): Promise<ModeratorInfo[]> {
  if (getIsPlaceholderMode()) return [
    { id: 'mod-1', display_name: 'FairJudge', mod_rating: 82, mod_debates_total: 15, mod_approval_pct: 78 },
    { id: 'mod-2', display_name: 'NeutralMod', mod_rating: 71, mod_debates_total: 8, mod_approval_pct: 65 },
  ];
```
Hardcoded fixture objects with non-UUID IDs (`'mod-1'`, `'mod-2'`) are in a production source file, gated by `getIsPlaceholderMode()`. This is intentional demo/placeholder behavior and not test data conditional on `NODE_ENV`. However, the non-UUID values (`'mod-1'`, `'mod-2'`) would fail UUID validation if they reached any production code path that validates moderator IDs before DB operations.

**FD-2 — Placeholder reference ID uses fake string + timestamp**
`src/auth.moderator.ts:81`
```typescript
if (getIsPlaceholderMode()) return { success: true, reference_id: 'placeholder-ref-' + Date.now() };
```
Same pattern — placeholder mode returns a non-UUID `reference_id`. Not a test-conditional pattern; it's a feature flag path. Low severity.

**FD-3 — Hardcoded user object in home.ts placeholder path**
`src/pages/home.ts:158`
```typescript
updateUIFromProfile(null, {
  display_name: 'Debater', username: 'debater', elo_rating: 1200,
  wins: 0, losses: 0, current_streak: 0, level: 1, debates_completed: 0,
  token_balance: 50, subscription_tier: 'free', profile_depth_pct: 0
} as any);
```
A hardcoded profile object with `as any` cast is used in the placeholder/unauthenticated path. The `as any` suppresses type errors that would otherwise reveal whether this object matches the full `Profile` shape. If the `Profile` type gains required fields, this silently provides a partial object. Not test-conditional; low severity.

**Assessment:** No `if (os.getenv("TEST"))` branching found in production code. All fake data is in `isPlaceholderMode()` paths (a feature flag for demo/unauthenticated state). These are not FAKE-DATA-IN-PRODUCTION findings in the strict sense, but the non-UUID IDs in FD-1 create a latent risk if the placeholder mode check is ever bypassed or incorrectly set.

---

## Section 6 — Over-Mocked Tests

**f47-moderator-scoring.test.ts — Assessment: APPROPRIATE**

One mock: `vi.mock('@supabase/supabase-js', ...)` — mocks the Supabase client dependency, not the primary function under test (`scoreModerator`). Assertions are on `mockRpc.mock.calls` to verify the correct RPC interface (function name, parameter keys, parameter values) and on the function's return value for error handling paths. This is the expected pattern for a unit test of an RPC wrapper.

**f48-mod-debate.test.ts — Assessment: OVER-MOCKED AND BROKEN**

Nine modules mocked: `auth.ts`, `config.ts`, `tokens.ts`, `staking.ts`, `powerups.ts`, `webrtc.ts`, `voicememo.ts`, `share.ts`, `navigation.ts`.

The `config.ts` mock is incomplete — it provides `escapeHTML`, `isAnyPlaceholder`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `showToast`, and `friendlyError`, but does NOT provide the `DEBATE` export. `arena-state.ts` imports `DEBATE` directly:

```typescript
import { DEBATE } from '../config.ts';  // arena-state.ts:8
export let selectedRounds: number = DEBATE.defaultRounds;  // arena-state.ts:39
```

When the mock replaces `config.ts` with an object that has no `DEBATE` key, `DEBATE` is `undefined` and `DEBATE.defaultRounds` throws at module initialization. **The entire test suite fails to collect.**

Additionally, the test assertions primarily verify *negative* behavior: that `mockSafeRpc`, `mockClaimDebate`, `mockSettleStakes` were NOT called (TC1–TC4). Testing that mocked functions are not invoked is the weakest possible assertion — it only proves the code didn't reach those call sites, not that it did anything correct. TC5–TC8 test state inspection (`getCurrentDebate()` return value, DOM structure), which is stronger.

**OVER-MOCKED finding summary:**
- The `config.ts` partial mock makes the entire test file unrunnable
- 9 dependencies replaced with stubs reduces the "real behavior under test" to approximately: the guard condition in `endCurrentDebate()` and the DOM rendering path in `enterRoom()`
- Negative assertions (TC1–TC4: "did not call X") verify only that code paths were avoided, not that the mod-observer feature works correctly

---

## Section 7 — Test Infrastructure Changes

**Commands run:**
```
ls .github/                            → No CI config found
git log --oneline pre-10-prompts-audit..HEAD
```

**CI configuration:** No `.github/workflows/` directory exists. No CI pipeline of any kind. Confirmed from Phase 0. Test results cannot be compared against a prior CI-passing state because no CI has ever run.

**Test infrastructure files changed in audit diff:**
```
git diff --stat pre-10-prompts-audit HEAD
```
Only `phase-0-scope-inventory.md` and `phase-1-confabulation.md` added. Neither `vitest.config.ts`, `package.json`, nor any file in `tests/` was modified. **No REWARD-HACKING-RISK applies to this diff.**

**Pre-existing test infrastructure notes:**

**TI-1 — vitest.config.ts sets `environment: 'node'`; both test files override to jsdom**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: false,
    environment: 'node',      // ← global default
  },
});
```
Both test files carry `// @vitest-environment jsdom` at line 1, overriding the global default. This works correctly. The risk: any future test file added without the pragma runs in the Node environment, where `document`, `window`, and DOM APIs are undefined. A test for DOM-dependent code would silently fail to set up rather than fail explicitly — a subtle trap.

**TI-2 — No coverage reporting configured**
`vitest.config.ts` has no `coverage` section. Running `npm test` produces no coverage output. The effective coverage for the 372-module codebase is unmeasured. The 2 test files cover 2 functions (`scoreModerator` and `endCurrentDebate`/`enterRoom`) — in practice, coverage is near zero for the application as a whole.

**TI-3 — tsconfig.json excludes src/ (Phase 1 finding, impact on Phase 2)**
Per Phase 1: the TypeScript compiler's `include` array covers only `*.ts` and `lib/**/*.ts` at the repo root — not `src/`. The consequence for test authoring: TypeScript will not catch type errors in test-to-source imports. The f48 mock could have been caught at type level if `config.ts`'s `ModeratorConfig` shape were enforced against the mock factory return type. Instead, the error only surfaces at runtime, during Vitest collection.

---

## Summary Table

| Step | Finding | Severity |
|---|---|---|
| Full test run | f48 fails to collect (module init error: `DEBATE` undefined) | **HIGH** |
| Tests that can fail (f47 mutation 1) | TC1 fails on wrong RPC name — works correctly | PASS |
| Tests that can fail (f47 mutation 2) | TC2+TC3 fail on wrong param keys — works correctly | PASS |
| TC4–TC8 by construction | Pass regardless of RPC name; test return value logic only | LOW |
| Incomplete work: token balances | `async.fetch.ts:67` hardcodes `tokens: 0` | MEDIUM |
| Incomplete work: AdSense placeholder IDs | Production template contains unfilled placeholder strings | MEDIUM |
| Removed safety checks (audited diff) | None — diff is zero source changes | PASS |
| Pre-existing: `as any` + `getSession()` | `arena-feed-realtime.ts:42` — type bypass masks auth violation | MEDIUM |
| Fake data in production paths | `getAvailableModerators()` returns non-UUID fixture IDs in placeholder mode | LOW |
| Over-mocked tests (f47) | Appropriate — mocks dependency, not subject under test | PASS |
| Over-mocked tests (f48) | Incomplete `config.ts` mock causes full suite failure | **HIGH** |
| CI config changes | None — no CI exists, not modified | N/A |
| vitest.config.ts environment default | `node` default with jsdom override — works but is a new-test trap | LOW |

---

## Consolidated Findings

### HIGH

**ESC-H-01 — f48-mod-debate.test.ts fails to collect (zero F-48 coverage)**
`tests/f48-mod-debate.test.ts`, caused by `vi.mock('../src/config.ts', ...)` missing `DEBATE` export
The F-48 feature (moderator-initiated debate: modView guard in `endCurrentDebate()`, input area hiding in `enterRoom()`) has **zero automated test coverage** despite being listed as covered. The test file was committed in Session 176 and has presumably been broken since then. Any regression in the mod-view guard would not be detected.

Fix: Add `DEBATE` to the config mock factory:
```typescript
vi.mock('../src/config.ts', () => ({
  escapeHTML:       (s: string) => s,
  isAnyPlaceholder: mockIsAnyPlaceholder,
  SUPABASE_URL:     'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-key',
  showToast:        vi.fn(),
  friendlyError:    vi.fn((e: unknown) => String(e)),
  DEBATE: { defaultRounds: 3, roundDurationSec: 120 },  // ← add this
}));
```
The `DEBATE` object's exact shape should match `DebateSettings` from `src/config.ts`.

### MEDIUM

**ESC-M-01 — Token balances hardcoded to 0 in hot-takes fetch path**
`src/async.fetch.ts:67`
Token balances are not fetched from the database in the hot-takes render path. The field is hardcoded to 0. Users' actual token counts do not display in this rendering context.

**ESC-M-02 — AdSense placeholder IDs in production source**
`src/arena/arena-feed-machine-ads.ts:133`
A developer instruction comment with `PUBLISHER_ID` and `AD_UNIT_ID` placeholder strings is present in production code. If the ad rendering logic is live, ad slots are non-functional.

**ESC-M-03 — Pre-existing `as any` + `getSession()` combination**
`src/arena/arena-feed-realtime.ts:42`
`(client as any).auth.getSession()` — combines a type-checker bypass (`as any`) with a usage pattern that violates `CLAUDE.md`'s auth invariant. Not introduced by the audited diff (pre-existing). Included because the `as any` cast means this violation is invisible to `tsc --noEmit`, compounding the Phase 1 finding that `tsconfig.json` excludes `src/`.

### LOW

**ESC-L-01 — TC4–TC8 (f47) pass regardless of RPC function name**
`tests/f47-moderator-scoring.test.ts:80–145`
TC1–TC3 guard the RPC call interface. TC4–TC8 test return value processing. A combined mutation (wrong function name AND wrong parameter names) would make TC1–TC3 fail while TC4–TC8 continued to pass. This is acceptable scope separation, not a construction error, but it means the test suite does not verify end-to-end call integrity in a single assertion.

**ESC-L-02 — Placeholder mode returns non-UUID IDs**
`src/auth.moderator.ts:153–156`
`getAvailableModerators()` returns `{ id: 'mod-1', ... }` in placeholder mode. Non-UUID IDs would fail UUID validation in production DB paths if placeholder mode is ever incorrectly set.

**ESC-L-03 — vitest.config.ts `environment: 'node'` new-test trap**
`vitest.config.ts`
Future test files that test DOM-dependent code without `// @vitest-environment jsdom` will silently fail in an unexpected environment rather than failing on the DOM dependency. This is a maintainability risk as the test suite grows.

**ESC-L-04 — 105 "needs CSS var token" TODOs in arena CSS files**
Hardcoded hex colors throughout `src/arena/arena-css-*.ts`. Pre-existing technical debt; not escape behavior. Documented for completeness.

---

*Phase 2 complete. Do not proceed to Phase 3 without user review.*
