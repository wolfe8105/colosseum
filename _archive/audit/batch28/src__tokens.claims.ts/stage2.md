# Stage 2 Outputs — tokens.claims.ts

## Agent 01

### isDailyLoginClaimed (line 16)
- Sync getter. Returns `dailyLoginClaimed` boolean. No params. No error handling. No side effects.

### claimDailyLogin (line 18)
- Async. No params. Returns `Promise<ClaimResult | null>`.
- **Re-entrancy guard:** `_dailyLoginInFlight` flag. Lines 19-20 check+set. `finally` block (line 40) resets to false unconditionally. **Proper pattern.**
- RPC: `_rpc('claim_daily_login')` — no params (line 22).
- If !result → return null (line 23).
- If !result.success (line 24): logs warning unless error is "Already claimed today"; sets `dailyLoginClaimed = true` regardless; returns null.
- On success: sets `dailyLoginClaimed = true` (line 29); `_updateBalanceDisplay(result.new_balance)` (line 30); builds label based on freeze_used/streak_bonus (lines 31-33); `_tokenToast(tokens_earned ?? 0, label)` (line 34); `nudge('return_visit', '...')` (line 35); console.log (line 36); `_checkStreakMilestones(result.login_streak ?? 0)` (line 37); returns result (line 38).
- No catch block — RPC errors propagate.
- **Concern:** `dailyLoginClaimed = true` set even when result.success is false — caller cannot distinguish success from failure.

### claimHotTake (line 44)
- Async. Param: `hotTakeId: string`. Returns `Promise<ClaimResult | null>`.
- No re-entrancy guard. Early return null if !hotTakeId (line 45).
- RPC: `_rpc('claim_action_tokens', { p_action: 'hot_take', p_reference_id: hotTakeId })` (line 46).
- If !result?.success → return null (line 47).
- On success: `_updateBalanceDisplay` (48); `_tokenToast(tokens_earned ?? 0, 'Hot take')` (49); `void claimMilestone('first_hot_take')` (50); dynamic import `onboarding-drip.ts` → `triggerDripDay(4)` with `.catch(() => {})` (line 52 — **LANDMINE [LM-TOK-002]**); returns result (53).
- No catch block.

### claimReaction (line 56)
- Async. Param: `hotTakeId: string`. Returns `Promise<ClaimResult | null>`.
- No re-entrancy guard. Early return null if !hotTakeId (57).
- RPC: `claim_action_tokens` with `p_action: 'reaction'`, `p_reference_id: hotTakeId` (58).
- If !result?.success → return null (59).
- On success: `_updateBalanceDisplay` (60); `_tokenToast(tokens_earned ?? 0, 'Reaction')` (61); `void claimMilestone('first_reaction')` (62); returns result (63).
- No dynamic import. No catch block.

### claimVote (line 66)
- Async. Param: `debateId: string`. Returns `Promise<ClaimResult | null>`.
- No re-entrancy guard. Early return null if !debateId (67).
- RPC: `claim_action_tokens` with `p_action: 'vote'`, `p_reference_id: debateId` (68).
- If !result?.success → return null (69).
- On success: `_updateBalanceDisplay` (70); `_tokenToast(tokens_earned ?? 0, 'Vote')` (71); `void claimMilestone('first_vote')` (72); dynamic import `onboarding-drip.ts` → `triggerDripDay(2)` with `.catch(() => {})` (73); returns result (74).
- No catch block.

### claimDebate (line 77)
- Async. Param: `debateId: string`. Returns `Promise<ClaimResult | null>`.
- No re-entrancy guard. Early return null if !debateId (78).
- RPC: `_rpc('claim_debate_tokens', { p_debate_id: debateId })` (79). **Different RPC name and param.**
- If !result?.success → return null (80).
- On success: `_updateBalanceDisplay` (81); complex label (lines 82-87): base 'Debate complete', if is_winner → 'Debate win!', if upset_bonus > 0 → 'Upset victory!', if fate_bonus > 0 → append `(+${result.fate_pct}% Group Fate)`; `_tokenToast(tokens_earned ?? 0, label)` (88); `void claimMilestone('first_debate')` (89); dynamic import → `triggerDripDay(5)` always + `triggerDripDay(7)` if is_winner, with `.catch(() => {})` (lines 90-93); returns result (94).
- No catch block.

### claimAiSparring (line 97)
- Async. Param: `debateId: string`. Returns `Promise<ClaimResult | null>`.
- No re-entrancy guard. Early return null if !debateId (98).
- RPC: `claim_action_tokens` with `p_action: 'ai_sparring'`, `p_reference_id: debateId` (99).
- If !result?.success → return null (100).
- On success: `_updateBalanceDisplay` (101); `_tokenToast(tokens_earned ?? 0, 'AI Sparring')` (102); `void claimMilestone('first_ai_sparring')` (103); returns result (104).
- No dynamic import. No catch block.

### claimPrediction (line 107)
- Async. Param: `debateId: string`. Returns `Promise<ClaimResult | null>`.
- No re-entrancy guard. Early return null if !debateId (108).
- RPC: `claim_action_tokens` with `p_action: 'prediction'`, `p_reference_id: debateId` (109).
- If !result?.success → return null (110).
- On success: `_updateBalanceDisplay` (111); `_tokenToast(tokens_earned ?? 0, 'Prediction')` (112); `void claimMilestone('first_prediction')` (113); returns result (114).
- No dynamic import. No catch block.

---

## Agent 02

(Consistent with Agent 01. Additional detail on claimDailyLogin.)

- `claimDailyLogin`: `_rpc()` is described as internally catching exceptions and returning null on error (never throwing). Therefore "no catch block" means RPC-level errors are handled inside `_rpc`, but errors in post-RPC calls (`_updateBalanceDisplay`, `_tokenToast`, `nudge`, `_checkStreakMilestones`) would propagate. `finally` still executes.

---

## Agent 03

(Consistent with Agents 01-02. Additional note.)

- `claimHotTake` line 51-52: LANDMINE comment present. Agents confirm intentional fire-and-forget with silent catch.
- `claimDebate` lines 82-87: Label construction order: upset_bonus overwrites is_winner label. So if is_winner AND upset_bonus > 0, final label is 'Upset victory!' not 'Debate win!'. This is intentional precedence logic.

---

## Agent 04

(Consistent with Agents 01-03. Additional note on claimDebate.)

- `claimDebate` RPC param name is `p_debate_id` (not `p_reference_id` as used in action claims). Consistent with backend naming convention for debate-specific RPC.
- Conditional drip triggers in claimDebate: `triggerDripDay(7)` only on win — creates progression path tied to achievement.

---

## Agent 05

(Consistent with Agents 01-04. Additional finding.)

- **`claimDebate` line 87:** `result.fate_pct` is accessed without null coalescing in the label template: `` `(+${result.fate_pct}% Group Fate)` ``. If `fate_pct` is undefined while `fate_bonus > 0`, the toast would display "undefined% Group Fate". Other numeric fields in the file consistently use `?? 0`. This is a discrepancy.

---

## Cross-Agent Consensus

| Function | Re-entrancy | RPC | Finally | Dynamic Import | Milestone |
|---|---|---|---|---|---|
| isDailyLoginClaimed | N/A | None | N/A | No | No |
| claimDailyLogin | Yes (finally-guarded) | claim_daily_login | Yes | No | No (uses _checkStreakMilestones) |
| claimHotTake | No | claim_action_tokens | No | Yes (day 4, silent) | first_hot_take |
| claimReaction | No | claim_action_tokens | No | No | first_reaction |
| claimVote | No | claim_action_tokens | No | Yes (day 2, silent) | first_vote |
| claimDebate | No | claim_debate_tokens | No | Yes (day 5 + win:day 7, silent) | first_debate |
| claimAiSparring | No | claim_action_tokens | No | No | first_ai_sparring |
| claimPrediction | No | claim_action_tokens | No | No | first_prediction |

**Key findings agents agree on:**
1. Only `claimDailyLogin` has re-entrancy guard + finally. All 7 action claim functions have no re-entrancy protection.
2. `claimDailyLogin` sets `dailyLoginClaimed = true` on BOTH success and failure paths (lines 26 and 29).
3. Dynamic imports in claimHotTake, claimVote, claimDebate use `.catch(() => {})` — intentionally silent per LANDMINE [LM-TOK-002].
4. All functions return `null` silently on RPC failure (no error thrown to caller).
5. Agent 05 flagged: `claimDebate` accesses `result.fate_pct` without null coalescing.
