# Stage 2 — Runtime Walk: async.wiring.ts

Source: src/async.wiring.ts (171 lines)
Anchors: 3
Agents: 5 (independent, parallel)
Verdict: **0 High · 0 Medium · 4 Low · 0 PARTIAL**

---

## Agent 1

### _wireTakeDelegation (line 41)
- No innerHTML writes. Style-only DOM mutations in `expand` branch (display, webkitLineClamp, overflow). `moreEl.remove()` safe.
- `profile`: `window.location.href = '/u/' + encodeURIComponent(username)` — path-scoped, no open redirect.
- `mod-signup`: hardcoded literal — safe.
- **Low:** `become-mod` calls `toggleModerator(true)` without `requireAuth()` guard. Server RPC enforces auth; no privilege escalation. Missing client-side prompt is a UX gap and minor defense-in-depth inconsistency.
- `shareTake(id, text)`: `dataset['text']` passed to share API; `shareTake` encodes it for Twitter URL, never writes to innerHTML (confirmed in share.ts audit). Safe.

### _wirePredictionDelegation (line 89)
- No innerHTML writes. All DOM writes are `.value`, `.disabled`, `.style.opacity`.
- `predict`: `requireAuth()` guard present and correct.
- `wager-confirm`: `parseInt(input.value, 10)` + range check `[1, 500]` + balance check before `placePrediction()`. Correctly validated.
- `wager-quick`: sets `input.value` (not innerHTML) → dispatches input event → input handler runs `parseInt` + range check. Safe.
- **Low (server audit):** Client-side `[1, 500]` bound is UX-only; `place_prediction` RPC must enforce atomically server-side.

### _wireRivalDelegation (line 147)
- No innerHTML writes.
- `profile`: same `encodeURIComponent` + `/u/` path — safe.
- **Low:** `accept-rival` calls `respondRival(id, true)` without `requireAuth()`. Server enforces auth; placeholder mode returns silent no-op for guests. UX gap same as `become-mod`.

---

## Agent 2

### _wireTakeDelegation (line 41)
- CLEAN for innerHTML, open redirect.
- Low: `become-mod` missing `requireAuth()`.
- Info: `dataset['text']` passed to `shareTake` — sink is share API (OS sheet / clipboard), not DOM. Safe.
- Info: `showUserProfile(userId ?? '')` — downstream `isUUID()` validation in `auth.profile.ts` line 94 catches empty string.

### _wirePredictionDelegation (line 89)
- `predict` correctly gated by `requireAuth()`.
- `standalone-pick` (line 121): flags as **Medium** — no `requireAuth()` at wiring level before `pickStandaloneQuestion()`. **(See Agent 5 confirmation — this is a false positive; callee has `requireAuth()` internally.)**
- All other paths: CLEAN.

### _wireRivalDelegation (line 147)
- `encodeURIComponent` correct.
- Low: `accept-rival` missing `requireAuth()` at wiring level.
- Info: `respondRival` downstream in `auth.rivals.ts` — `safeRpc` would 401 for real unauth users; placeholder mode silently no-ops.

---

## Agent 3

### _wireTakeDelegation (line 41)
- CLEAN: No innerHTML, no open redirect.
- `share` branch: `shareTake` encodes `dataset['text']` with `encodeURIComponent` — safe (previously confirmed in share.ts audit).
- `expand` branch: CSS style writes only. Safe.
- `profile` branch: `encodeURIComponent` + `/u/` prefix. Safe.
- Note: `become-mod` and rival paths have no `requireAuth()` — consistent with Low finding across all agents.

### _wirePredictionDelegation (line 89)
- `requireAuth()` correctly gates `predict`.
- `wager-confirm`: `parseInt` + `[1, 500]` + balance check before RPC. Correct.
- Input handler: numeric-only DOM writes. CLEAN.
- CLEAN overall for this function.

### _wireRivalDelegation (line 147)
- CLEAN for XSS, open redirect.
- `encodeURIComponent` + `/u/` path. Safe.
- Low: `accept-rival` no `requireAuth()` at wiring level.

---

## Agent 4

### _wireTakeDelegation (line 41)
- CLEAN: No innerHTML, no open redirect.
- Low: `become-mod` missing `requireAuth()`.
- **Low: UUID validation gap** — `react(btn.dataset['id'])` and `challenge(btn.dataset['id'])` pass raw dataset IDs to RPCs without `isUUID()` check at the call site. Dataset values are server-rendered so attack surface is limited (DevTools manipulation only). PostgREST parameterization prevents injection; malformed ID causes server error, no data leak. Note: `declareRival()` in `auth.rivals.ts` does call `isUUID()` before its RPC — inconsistency.

### _wirePredictionDelegation (line 89)
- Auth gates correct. Numeric validation correct.
- Low: `debateId` from `btn.dataset['id']` in `wager-confirm` passed to `placePrediction()` without UUID check at this call site. Validation may be inside callee. Same inconsistency as above.

### _wireRivalDelegation (line 147)
- CLEAN for XSS, open redirect.
- Low: `accept-rival` missing `requireAuth()`.
- Low: `rivalId` from dataset passed to `respondRival()` without `isUUID()` check — inconsistent with `declareRival` which checks.

---

## Agent 5

### _wireTakeDelegation (line 41)
- CLEAN for XSS, open redirect.
- Low: `become-mod` missing `requireAuth()`. Detailed: in placeholder mode `toggleModerator(true)` mutates local `currentProfile.is_moderator = true` and returns `{success: true}` without any RPC — guest sees success toast. DB not touched. Not privilege escalation but phantom moderator UI state in guest sessions.
- Low: Dataset IDs to RPCs without UUID validation. Same as Agent 4.

### _wirePredictionDelegation (line 89)
- **Confirmed false positive on `standalone-pick`:** `pickStandaloneQuestion()` in `async.actions.ts` line 59 has `if (!requireAuth('make predictions')) return;` as its first statement. Auth is correctly enforced at the action level. The wiring-level omission is defense-in-depth only, not a vulnerability. **Agent 2's Medium finding is withdrawn.**
- Auth gates correct. Numeric validation correct. CLEAN.

### _wireRivalDelegation (line 147)
- CLEAN for XSS, open redirect.
- Low: `accept-rival` missing `requireAuth()`. In placeholder mode `respondRival` returns `{success: true}` silently, then `refreshRivals()` runs (also placeholder-guarded). Net: silent no-op, no DB mutation.

---

## Consolidated Findings

| ID | Anchor | Severity | Finding | Agents |
|----|--------|----------|---------|--------|
| AW-1 | `_wireTakeDelegation` | Low | `become-mod` calls `toggleModerator()` without `requireAuth()` — guest gets phantom success toast in placeholder mode; server RPC enforces auth for real sessions | 1,2,3,4,5 |
| AW-2 | `_wireTakeDelegation` / `_wirePredictionDelegation` / `_wireRivalDelegation` | Low | Dataset IDs (`react`, `challenge`, `debateId`, `rivalId`) passed to RPCs without `isUUID()` format check at call site — inconsistent with `declareRival` pattern; PostgREST parameterization prevents injection; malformed ID causes server error only | 4,5 |
| AW-3 | `_wireRivalDelegation` | Low | `accept-rival` calls `respondRival()` without `requireAuth()` — same pattern as AW-1; placeholder mode silent no-op | 1,2,3,4,5 |
| AW-4 | `_wirePredictionDelegation` | Low (server) | Client-side wager bounds `[1, 500]` is UX-only; `place_prediction` RPC must enforce atomically | 1 |

**False positive:** Agent 2 flagged `standalone-pick` as Medium (missing `requireAuth()` at wiring level). Agent 5 confirmed `pickStandaloneQuestion()` calls `requireAuth()` as its first statement — **not a finding.**

**No High or Medium findings. No innerHTML writes. No open redirects. No XSS vectors.**

## Recommended Fixes (Low priority, defense-in-depth)

**AW-1:** Add `if (!requireAuth('become a Moderator')) return;` before `toggleModerator(true)` call in `_wireTakeDelegation` become-mod branch.

**AW-3:** Add `if (!requireAuth('accept a rival request')) return;` before `respondRival(...)` in `_wireRivalDelegation` accept-rival branch.

**AW-2:** Add `isUUID()` checks before passing dataset IDs to `react()`, `challenge()`, and `respondRival()` — consistent with existing `declareRival` pattern.
