# Stage 3 Outputs — plinko-auth-return.ts

## Agent 01

### restoreStep5UI (line 17)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

Minor imprecision in claim 1: agents described "three querySelector calls" but line 18 uses `querySelector` while lines 20 and 22 use `getElementById`. Functionally equivalent — not a defect.

### attachAuthReturnHandler (line 31)
**Verification**: PARTIAL
**Findings**: Stage 2 claim 1 (isPlaceholder as function reference making guard always false) is **WRONG** — this is a Stage 2 false positive. `isAnyPlaceholder` is `const isAnyPlaceholder: boolean` in `config.ts`. `const isPlaceholder = isAnyPlaceholder` copies the boolean value at module load. The guard `!isPlaceholder && supabaseClient` works correctly. No bug exists here.
**All other claims**: PASS — claims 2–6 confirmed exactly against source.

**Behaviors Stage 2 missed**:
- `onAuthStateChange` return value (unsubscribe object) is discarded. Listener can never be torn down; duplicate listeners accumulate if `attachAuthReturnHandler` is called more than once.
- `getCurrentUser()` in the hash block is called synchronously at module load time. If auth has not yet hydrated, it returns `null`, `hasRealSession` is `false`, and the email-confirmation UI silently does not advance. The `onAuthStateChange` path is then the sole mechanism — which still works, making this a silent redundancy failure, not a user-visible failure.

## Cross-Agent Consensus Summary
PASS: 5/5. All five agents unanimously agreed that the Stage 2 "isPlaceholder always-false" claim was a false positive (isAnyPlaceholder is a boolean, not a function). All other claims verified PASS. No new actionable findings.

---

## Agent 02

### restoreStep5UI (line 17)
**Verification**: PASS
**Findings**: None.
**Unverifiable claims**: None.

Claim 1 imprecision noted: querySelector vs getElementById. Not a defect.

### attachAuthReturnHandler (line 31)
**Verification**: PARTIAL
**Findings**: Claim 1 FAIL — Stage 2 false positive on isPlaceholder. isAnyPlaceholder is a boolean constant. Guard is correct. Claims 2–6: PASS.

**Behaviors Stage 2 missed**:
- `INITIAL_SESSION` events are silently ignored by the handler (only `SIGNED_IN` triggers action) — intentional but unmentioned.
- OAuth branch does not clear any hash fragment; if an unrelated hash exists on an OAuth return it persists.
- Internal double-call possibility: hash block fires at load (synchronously), then `SIGNED_IN` fires async — both paths call `restoreStep5UI()` + `goToStep(5)` for email confirmation. The LANDMINE comment documents the orchestrator race but not this internal duplication.
- `getCurrentUser()` cold-load timing hazard (see Agent 01).

## Cross-Agent Consensus Summary
PASS: 1/1. No needs_review.

---

## Agent 03

### restoreStep5UI (line 17)
**Verification**: PASS
**Findings**: None.

### attachAuthReturnHandler (line 31)
**Verification**: PARTIAL
**Findings**: Claim 1 FAIL — Stage 2 false positive. isPlaceholder is boolean. Claims 2–6: PASS.

**Behaviors Stage 2 missed**:
- Hash cleared unconditionally even when `hasRealSession` is false — tokens wiped before session confirmation, preventing any retry. Intentional per "SESSION 64" comment (Referer leak prevention) but worth noting.
- `onAuthStateChange` unsubscribe object discarded — permanent listener leak.
- LANDMINE LM-PLINKO-004 race is real and unmitigated; no coordination mechanism prevents simultaneous goToStep(2) and orchestrator redirect.
- `set_signupMethod('oauth')` called for all non-email-confirmation SIGNED_IN events, including magic-link (if ever enabled). Latent mislabeling.

## Cross-Agent Consensus Summary
PASS: 1/1. No needs_review.

---

## Agent 04

### restoreStep5UI (line 17)
**Verification**: PASS
**Findings**: None.

### attachAuthReturnHandler (line 31)
**Verification**: PARTIAL
**Findings**: Claim 1 FAIL — Stage 2 false positive. All other claims PASS.

**Behaviors Stage 2 missed**:
- `INITIAL_SESSION` not handled — silently ignored by callback; unmentioned.
- Hash-block `getCurrentUser()` cold-load timing hazard.
- `supabaseClient` ad-hoc type cast does not match SDK's `SupabaseClient` type — TypeScript will not catch signature drift.
- `set_signupMethod('oauth')` latent mislabeling for non-OAuth SIGNED_IN paths.

## Cross-Agent Consensus Summary
PASS: 1/1. No needs_review.

---

## Agent 05

### restoreStep5UI (line 17)
**Verification**: PASS
**Findings**: None.

### attachAuthReturnHandler (line 31)
**Verification**: PARTIAL
**Findings**: Claim 1 FAIL — Stage 2 false positive. Claims 2–6: PASS.

**Behaviors Stage 2 missed**:
- `replaceState` builds URL as `pathname + search` — correctly preserves query params, not just pathname; no agent noted this.
- `onAuthStateChange` unsubscribe never stored — persistent listener leak.
- LANDMINE LM-PLINKO-004 race not evaluated by Stage 2.
- `getCurrentUser()` cold-load timing hazard — synchronous call before INITIAL_SESSION fires may return null for valid session.

## Cross-Agent Consensus Summary
PASS: 1/1. Perfect consensus. No needs_review.

---

## Batch-level verdict: plinko-auth-return.ts

**No new findings.**

Stage 2 raised one concern (isPlaceholder always-false) that all five Stage 3 agents resolved as a false positive — isAnyPlaceholder is a boolean constant in config.ts, not a function.

Behaviors noted by Stage 3 agents that are **not filed as findings**:
- `getCurrentUser()` cold-load timing hazard: design-intentional. Hash block is a synchronous fast-path; the `onAuthStateChange` async path is the authoritative handler for the same event. Silent no-op on cold load is expected behavior, not a failure.
- `onAuthStateChange` unsubscribe discarded: page-scoped module. Handler is attached once for the page's lifetime; no navigation away from this page, so teardown is not required.
- LANDMINE LM-PLINKO-004: already documented in the codebase comment and THE-MODERATOR-LAND-MINE-MAP.md. Not a new finding.
- `set_signupMethod('oauth')` mislabeling: speculative — magic-link not currently enabled. Not fileable without evidence of real misclassification.

Previously filed findings from other batches: none for this file.
