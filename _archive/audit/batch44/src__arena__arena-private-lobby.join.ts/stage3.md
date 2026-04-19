# Stage 3 Outputs — arena-private-lobby.join.ts

Anchor: `joinWithCode` (line 19)

---

## Agent 01

### Accuracy verdict
Accurate — all five Stage 2 descriptions correctly characterize the control flow, RPC call structure, fallback asymmetry, and the `void modDebateId` linter-silencer.

### Stage 2 errors
None

### Findings

#### PREVIOUSLY FOUND
- L-Q3: Asymmetric fallbacks — primary path omits `|| 'Debater A'` / `|| 1200` guards (lines 39, 41); mod-debate path has them (lines 67, 69). PREVIOUSLY FOUND (Batch B).
- L-Q4: `void modDebateId` (line 88) — dead linter-silencer. PREVIOUSLY FOUND (Batch B).

#### NEW findings

**Medium — Outer catch swallows the primary error silently before attempting the fallback RPC**

Lines 47–49: the outer `catch` block catches all errors from the `join_private_lobby` path (including network errors, auth failures, unexpected server errors) and unconditionally proceeds to attempt `join_mod_debate`. Only if the second RPC also fails does the user see any error. If `join_private_lobby` fails for a transient reason (network drop, 500, timeout) and `join_mod_debate` also fails, the user gets only `'Code not found or already taken'` — which is misleading because the code might actually be valid. There is no logging or rethrow of the original error from the primary path, making debugging harder.

Line numbers: 47–49 (outer catch entry), 82–84 (inner catch toast).

**Low — `p_debate_id: null` is unconditionally passed to `join_private_lobby`**

Line 27: `p_debate_id: null` is always sent. If the RPC signature treats a non-null `p_debate_id` as an alternate join path (join by ID rather than code), this parameter slot is dead client-side. Not a bug, but a misleading unused parameter.

**Low — Role check is a string equality assumption with no exhaustive guard**

Line 62: `if (modResult.role === 'b')` with an implicit `else` handling all other values as role `'a'`. If the server ever returns an unexpected role value, the code silently enters the role-`'a'` branch and the user ends up on a waiting screen.

---

## Agent 02

### Accuracy verdict
Accurate. All five Stage 2 agents correctly described the control flow, fallback asymmetry, hardcoded values, and the `void modDebateId` line.

### Stage 2 errors
None.

### Findings

#### PREVIOUSLY FOUND
- L-Q3: Asymmetric fallbacks — primary path omits `|| 'Debater A'` / `|| 1200` guards (lines 39, 41); mod-debate path has them (lines 67, 69). PREVIOUSLY FOUND (Batch B).
- L-Q4: `void modDebateId` (line 88) — dead linter-silencer. PREVIOUSLY FOUND (Batch B).

#### NEW findings

**Medium — Outer catch silently swallows all `join_private_lobby` errors and retries as mod-debate regardless of error type (lines 46–82)**

The outer `catch` block has no error-type discrimination. Any failure — network timeout, auth 401, RLS violation, malformed response — causes the code to silently fall through and attempt `join_mod_debate`. A user with a valid private-lobby code who hits a transient network error will receive "Code not found or already taken" from the inner catch rather than a retryable network error message. If `join_private_lobby` fails for auth reasons, the code retries as mod-debate, which will also 401 and only then surface the error, doubling round-trips and obscuring the root cause.

**Low — `ranked: false` hardcoded in primary path may misrepresent the debate (line 44)**

If `JoinPrivateLobbyResult` carries a `ranked` field and the server creates ranked private lobbies, the hardcoded `false` will pass an incorrect value to `showMatchFound`, causing incorrect Elo-change display. Mod-debate path correctly reads `modResult.ranked`.

**Low — `opponentId` carries no fallback in either path (lines 40, 68)**

Both paths assign `opponentId: result.opponent_id` / `opponentId: modResult.opponent_id` with no fallback. If `opponent_id` is nullable in the DB and the RPC returns `null`, downstream consumers that treat it as always-present will encounter null reference errors.

---

## Agent 03

### Accuracy verdict
Accurate. All five Stage 2 agents described the control flow, fallback asymmetry, and error-handling structure correctly.

### Stage 2 errors
None.

### Findings

#### PREVIOUSLY FOUND
- L-Q3: Asymmetric fallbacks — primary path omits `|| 'Debater A'` / `|| 1200` guards (lines 39, 41); mod-debate path has them (lines 67, 69). PREVIOUSLY FOUND (Batch B).
- L-Q4: `void modDebateId` (line 88) — dead linter-silencer. PREVIOUSLY FOUND (Batch B).

#### NEW findings

**Medium — Bare `catch {}` swallows non-RPC errors and silently falls through to mod-debate retry (lines 47–83)**

The outer `catch` has no binding (`catch {` with no variable), which means it swallows every exception thrown anywhere inside the outer `try` block — not just the RPC error. This includes errors from `set_selectedMode`, `showMatchFound` (DOM / state error), and any runtime error (TypeError, ReferenceError) in the outer try body. A user who successfully joined a private lobby but whose `showMatchFound` threw a UI error will be re-submitted to the mod-debate RPC, potentially joining a second debate or confusing server-side state. The intent is clearly to catch only the `join_private_lobby` RPC rejection and fall back to `join_mod_debate`.

**Low — `ranked: false` hardcoded on primary path regardless of server response (line 43)**

The `join_private_lobby` RPC result may carry a `ranked` field (the mod-debate path correctly uses `modResult.ranked`). The primary path unconditionally sets `ranked: false`, so if the server indicates a ranked private lobby, the client ignores it and scores/displays the match incorrectly. The asymmetry with the mod-debate path suggests this was an oversight.

**Low — `role` assumption on primary path is never validated (line 34)**

The primary path always builds `CurrentDebate` with `role: 'b'` hardcoded (line 36) and calls `showMatchFound` with no branch for `role === 'a'`. If the RPC can return role `'a'` (e.g., lobby creator re-joining their own code), the user is dropped directly into a match screen in the wrong role. Contrast with the mod-debate path which explicitly branches on role.

---

## Agent 04

### Accuracy verdict
Accurate. All five Stage 2 agents correctly described the control flow, fallback asymmetry, and line-level details.

### Stage 2 errors
None.

### Findings

#### PREVIOUSLY FOUND
- L-Q3: Asymmetric fallbacks — primary path omits `|| 'Debater A'` / `|| 1200` guards (lines 39, 41); mod-debate path has them (lines 67, 69). PREVIOUSLY FOUND (Batch B).
- L-Q4: `void modDebateId` (line 88) — dead linter-silencer. PREVIOUSLY FOUND (Batch B).

#### NEW findings

**Medium — `ranked: false` hardcoded in primary path, discarding server value (line 42)**

The `join_private_lobby` RPC result is not inspected for a `ranked` field. The client unconditionally writes `ranked: false`. The mod-debate path on line 71 correctly reads `ranked: modResult.ranked`. If `join_private_lobby` can return `ranked: true`, `showMatchFound` receives the wrong ranked state, causing the match-found screen and downstream scoring logic to treat a ranked match as unranked. Fix: replace `ranked: false` with `ranked: result.ranked ?? false`.

**Low — `p_debate_id: null` in `join_private_lobby` call is unexplained (line 26)**

The RPC is called with `p_debate_id: null` always. There is no code path that supplies an actual debate ID. If the RPC supports joining by ID as an alternative to code, this parameter slot is dead weight. A comment explaining the intent (or removal of the unused parameter) would prevent future misreads.

**Low — Outer catch silently swallows `join_private_lobby` error before escalating (lines 47–83)**

The outer `catch` block has no binding and immediately fires the inner try without logging or inspecting the original error. Under a transient network failure, the code silently attempts `join_mod_debate` with the same code and, if that also fails, surfaces `'Code not found'` — which obscures the real root cause. Primarily a debuggability issue.

---

## Agent 05

### Accuracy verdict
Accurate. All five Stage 2 agent descriptions match the source faithfully across every branch, line reference, and behavioral detail.

### Stage 2 errors
None.

### Findings

#### PREVIOUSLY FOUND
- L-Q3: Asymmetric fallbacks — primary path omits `|| 'Debater A'` / `|| 1200` guards (lines 39, 41); mod-debate path has them (lines 67, 69). PREVIOUSLY FOUND (Batch B).
- L-Q4: `void modDebateId` (line 88) — dead linter-silencer. PREVIOUSLY FOUND (Batch B).

#### NEW findings

**Medium — Primary path `role: 'b'` hardcoded with no server-side role check (lines 36, 45)**

`join_private_lobby` returns a `JoinPrivateLobbyResult` that likely includes a `role` field (implied by the parallel structure of `ModDebateJoinResult`). The primary path unconditionally builds `CurrentDebate` with `role: 'b'` and calls `showMatchFound` — there is no branch for `role === 'a'`. The mod-debate path demonstrates the correct pattern: check `modResult.role`, route role 'a' to a waiting screen, route role 'b' to match-found. If the `join_private_lobby` RPC can return `role: 'a'`, the user is dropped into a match screen in the wrong role with no opponent present.

**Low — Outer `catch` swallows the primary error before the fallback RPC fires (lines 48–49)**

The outer `catch` block is unbound — it catches any throw from the entire outer `try`, not just the `safeRpc` call. If `showMatchFound` throws (e.g., a DOM exception), execution falls into the inner `join_mod_debate` try rather than surfacing the real error. A successful `join_private_lobby` that throws in a downstream call silently attempts `join_mod_debate` with the same code, which will either fail confusingly or produce an entirely wrong join.

**Low — `ranked: false` hardcoded on primary path, no server value consumed (line 43)**

`join_private_lobby` may return a `ranked` field in its result (the mod-debate result explicitly carries `ranked`). The primary path ignores any such field and hardcodes `false`. This mirrors the asymmetry in L-Q3 and is the same structural gap. Severity Low because current behaviour may intentionally treat join-by-code private lobbies as unranked, but the asymmetry is undocumented.

---

## Synthesis

**Stage 2 accuracy:** All 5 agents — Accurate. No Stage 2 errors.

**Previously found confirmed:** L-Q3 and L-Q4 both confirmed by all 5 agents.

**New findings consensus:**

| Finding | Agents | Severity consensus |
|---------|--------|-------------------|
| Bare `catch {}` swallows non-RPC errors (lines 47–49) | 5/5 | Medium |
| `ranked: false` hardcoded, server value discarded (line 42) | 4/5 | Low (Agent 04: Medium) |
| `role: 'b'` hardcoded, no role branch (line 36) | 3/5 | Low (Agent 05: Medium) |
| `p_debate_id: null` unused, unexplained (line 27) | 2/5 | Low |
| Implicit else for unexpected role values in mod-debate branch (line 62) | 1/5 | Low |

**Final new findings for this file:**
- **Medium — B44-APL-1:** Bare `catch {}` at line 48 swallows all outer-try exceptions (including DOM/state errors from `showMatchFound`, not just RPC failures), silently retrying `join_mod_debate`. Could cause double-join or masked auth errors. (5/5 agents)
- **Low — B44-APL-2:** `ranked: false` hardcoded at line 42 on primary path; mod-debate path reads `modResult.ranked`. If server returns `ranked: true` for a private lobby, match-found screen shows incorrect ranked state. (4/5 agents)
- **Low — B44-APL-3:** `role: 'b'` hardcoded at line 36 on primary path with no role branch; mod-debate path explicitly handles role 'a' with a waiting screen. If server can return role 'a' from `join_private_lobby`, user lands on match-found screen in wrong role. (3/5 agents)
