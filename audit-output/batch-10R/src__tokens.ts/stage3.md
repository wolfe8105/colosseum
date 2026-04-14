# Stage 3 Outputs — src/tokens.ts

## Agent 01

### _injectCSS (line 104)
**Verification**: PARTIAL
**Findings**:
- All five agents correctly describe the `cssInjected` guard, style element creation, `textContent` assignment, and `document.head.appendChild`. PASS on those claims.
- Agents 02, 03, 04, 05 say the CSS string defines "three class rules". Agent 01 says "four CSS class rules". The source lines 109–145 contain `.token-fly-coin`, `.token-earn-toast`, `.milestone-toast`, `.milestone-toast .mt-icon`, `.milestone-toast .mt-label`, `.milestone-toast .mt-reward` — six discrete rule blocks total, but three are sub-selectors of `.milestone-toast`. Agents 02–05's count of "three class rules with child selectors" is defensible; Agent 01's "four class rules" is also defensible. No agent is flatly wrong; minor framing gap only.
- All agents correctly note the guard `if (cssInjected) return`, the `cssInjected = true` write, `document.createElement('style')`, `style.textContent` assignment, and `document.head.appendChild(style)`. PASS.
- All agents correctly state synchronous, no parameters, returns void. PASS.
**Unverifiable claims**: None.

### _coinFlyUp (line 154)
**Verification**: PARTIAL
**Findings**:
- All agents: calls `_injectCSS` first. PASS — line 155.
- All agents: creates a `<div>`, sets `className = 'token-fly-coin'`, sets `textContent = '🪙'`. PASS — lines 157–158.
- All agents: queries `document.getElementById('token-display')`. PASS — line 159.
- All agents: if element found, uses `getBoundingClientRect()`, sets `style.left` to horizontal center, `style.top` to bottom. PASS — lines 161–163.
- All agents: fallback sets `style.top = '60px'`. PASS — line 165.
- Agents 02, 03, 04, 05 state that in the fallback branch `style.left` is left unset (relying on CSS `left:50%`). PASS — line 165 only sets `style.top`.
- Agent 01 says the fallback "falls back to setting `style.top` to `'60px'`" without mentioning `style.left` being unset — this is the same fact, just stated less explicitly. PASS.
- All agents: appends to `document.body`, schedules `coin.remove()` after 1000 ms. PASS — lines 167–168.
- All agents correctly state synchronous, no parameters, returns void. PASS.
**Unverifiable claims**: None.

### _tokenToast (line 171)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Early return if `tokens` is falsy or `<= 0` (line 172). PASS.
- Calls `_injectCSS`, then `_coinFlyUp`, then constructs `` `+${tokens} 🪙 ${label}` `` and passes to `showToast` with `'success'` (lines 173–176). PASS.
- Synchronous, returns void. PASS.
**Unverifiable claims**: None.

### _milestoneToast (line 179)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Calls `_injectCSS`, creates `<div>` with class `'milestone-toast'`. PASS — lines 180–181.
- Three sequential `rewardText` assignments — token, freeze (overwrite), combined (overwrite again). PASS — lines 183–186. All agents correctly note the overwrite logic.
- `Number()` cast on both `tokens` and `freezes` before interpolation. PASS — lines 184–186.
- `el.innerHTML` uses `escapeHTML` on `icon || '🏆'`, `label`, and `rewardText`. PASS — lines 187–191.
- Appends to `document.body`. PASS — line 193.
- Calls `_coinFlyUp` if `tokens > 0`. PASS — line 194.
- `setTimeout` 3600 ms for `el.remove()`. PASS — line 195.
**Unverifiable claims**: None.

### _updateBalanceDisplay (line 202)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Guard `if (newBalance == null) return`. PASS — line 203.
- Writes to `lastKnownBalance`. PASS — line 204.
- `querySelectorAll('[data-token-balance]')` with `textContent = newBalance.toLocaleString()`. PASS — lines 205–207.
- `getElementById('token-balance')` with same `textContent` assignment. PASS — lines 208–209.
- Conditional `_bc.postMessage(newBalance)` inside try/catch when `broadcast && _bc`. PASS — lines 210–212.
- Signature: `(newBalance: number | null | undefined, broadcast = true)`. PASS.
**Unverifiable claims**: None.

### updateBalance (line 216)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Calls `_updateBalanceDisplay(newBalance)`. PASS — line 217.
- Calls `getCurrentProfile()`; if non-null, mutates `profile.token_balance` via cast to `Record<string, unknown>`. PASS — lines 218–219.
- Synchronous, returns void. PASS.
**Unverifiable claims**: None.

### _rpc (line 226)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Reads `getIsPlaceholderMode()`, returns `null` if truthy. PASS — line 227.
- Reads `getCurrentUser()`, returns `null` if falsy. PASS — line 228.
- `try/catch` around `await safeRpc(fnName, args)`. PASS — lines 229–239.
- If `error` truthy: `console.warn` with `error.message ?? error`, returns `null`. PASS — lines 231–234.
- No error: returns `data as ClaimResult`. PASS — line 235.
- Catch: `console.warn`, returns `null`. PASS — lines 236–239.
- Returns `Promise<ClaimResult | null>`. PASS.
**Unverifiable claims**: None.

### requireTokens (line 246)
**Verification**: PARTIAL
**Findings**:
- Agent 05 states "If the balance is greater than or equal to `amount`, it returns `true` immediately. If there is no profile at all, it also returns `true`." — the ordering in Agent 05's prose implies the balance check occurs before the no-profile check, which is inverted from the source. Source: profile check is first (line 247–248), then balance check (line 249–250). This is a structural/ordering misrepresentation in Agent 05 only; functionally equivalent outcomes, but the description of control flow is misleading. PARTIAL for Agent 05.
- All other agents correctly state: `getCurrentProfile()` first; if null, return `true`; otherwise read `token_balance || 0`; if `>= amount` return `true`; else compute deficit, call `showToast('error')`, return `false`. PASS for agents 01–04.
- All agents correctly note `actionLabel ?? 'do that'`. PASS — line 253.
**Unverifiable claims**: None.

### claimMilestone (line 261)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Guard on `milestoneClaimed.has(key)`. PASS — line 262.
- Guard on `MILESTONES[key]` existence. PASS — line 263.
- `await _rpc('claim_milestone', { p_milestone_key: key })`. PASS — line 265.
- On failure: if `result?.error === 'Already claimed'`, add key to set; return null either way. PASS — lines 266–268.
- On success: add key to set; conditionally call `_updateBalanceDisplay(result.new_balance)` if non-null; call `_milestoneToast`; `console.log`; return result. PASS — lines 270–274.
**Unverifiable claims**: None.

### _loadMilestones (line 277)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- `await _rpc('get_my_milestones')`. PASS — line 278.
- Guard on `result?.success`. PASS — line 279.
- Reads `claimed` via cast; if array, `forEach` adds each to `milestoneClaimed`. PASS — lines 280–283.
**Unverifiable claims**: None.

### _checkStreakMilestones (line 286)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Guard `if (!streak) return`. PASS — line 287.
- Three independent checks: `>= 7`, `>= 30`, `>= 100`, all fire-and-forget `void claimMilestone(...)`. PASS — lines 288–290.
- All agents correctly note that a streak of 100 triggers all three branches. PASS.
**Unverifiable claims**: None.

### claimDailyLogin (line 297)
**Verification**: PARTIAL
**Findings**:
- Guard on `_dailyLoginInFlight`, set to `true`, `try/finally` resets to `false`. PASS — lines 298–325.
- If `result` is null, returns null. PASS — line 302.
- On failure: sets `dailyLoginClaimed = true`; logs warning unless error is `'Already claimed today'`; returns null. PASS — lines 303–309.
- On success: sets `dailyLoginClaimed = true`, calls `_updateBalanceDisplay(result.new_balance)`. PASS — lines 310–311.
- Label logic: base `'Daily login'`; overwritten if `result.freeze_used`; else-if overwritten if `result.streak_bonus > 0`. PASS — lines 312–317.
- Calls `_tokenToast`, `nudge('return_visit', ...)`, `console.log`, `_checkStreakMilestones`. PASS — lines 318–321.
- All agents describe the label as `else if` for the streak bonus — source line 315 uses `} else if (`, which is correct. PASS.
**Unverifiable claims**: None.

### claimHotTake (line 328)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Guard on falsy `hotTakeId`. PASS — line 329.
- `_rpc('claim_action_tokens', { p_action: 'hot_take', p_reference_id: hotTakeId })`. PASS — line 330.
- On success: `_updateBalanceDisplay`, `_tokenToast(... 'Hot take')`, `void claimMilestone('first_hot_take')`. PASS — lines 332–334.
- Dynamic import of `'./onboarding-drip.ts'`, calls `triggerDripDay(4)` in `.then`, `.catch(() => {})`. PASS — lines 336.
- Returns `result`. PASS — line 337.
**Unverifiable claims**: None.

### claimReaction (line 340)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Guard on falsy `hotTakeId`. PASS — line 341.
- `_rpc('claim_action_tokens', { p_action: 'reaction', ... })`. PASS — line 342.
- On success: `_updateBalanceDisplay`, `_tokenToast(... 'Reaction')`, `void claimMilestone('first_reaction')`. PASS — lines 344–346.
- No dynamic import. PASS — line 347 just returns result.
**Unverifiable claims**: None.

### claimVote (line 350)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Guard on falsy `debateId`. PASS — line 351.
- `_rpc('claim_action_tokens', { p_action: 'vote', p_reference_id: debateId })`. PASS — line 352.
- On success: `_updateBalanceDisplay`, `_tokenToast(... 'Vote')`, `void claimMilestone('first_vote')`. PASS — lines 354–356.
- Dynamic import of `'./onboarding-drip.ts'`, calls `triggerDripDay(2)`, `.catch(() => {})`. PASS — line 358.
**Unverifiable claims**: None.

### claimDebate (line 362)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Guard on falsy `debateId`. PASS — line 363.
- Uses `_rpc('claim_debate_tokens', { p_debate_id: debateId })` — distinct RPC name. PASS — line 364.
- On success: `_updateBalanceDisplay`. PASS — line 366.
- Label logic: `'Debate complete'` → `'Debate win!'` if `is_winner` → `'Upset victory!'` if `upset_bonus > 0`; fate suffix appended independently if `fate_bonus > 0`. PASS — lines 367–374.
- `_tokenToast`, `void claimMilestone('first_debate')`. PASS — lines 375–376.
- Dynamic import, calls `triggerDripDay(5)` unconditionally and `triggerDripDay(7)` if `is_winner`, `.catch`. PASS — lines 378–381.
**Unverifiable claims**: None.

### claimAiSparring (line 385)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Guard, `_rpc('claim_action_tokens', { p_action: 'ai_sparring', ... })`, success path: `_updateBalanceDisplay`, `_tokenToast(... 'AI Sparring')`, `void claimMilestone('first_ai_sparring')`. PASS — lines 386–392.
- No dynamic import. PASS.
**Unverifiable claims**: None.

### claimPrediction (line 395)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Guard, `_rpc('claim_action_tokens', { p_action: 'prediction', ... })`, success path. PASS — lines 396–402.
- No dynamic import. PASS.
**Unverifiable claims**: None.

### checkProfileMilestones (line 405)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Guard on falsy `completedCount`. PASS — line 406.
- Four independent threshold checks: `>= 3` → `'profile_3_sections'`; `>= 6` → `'profile_6_sections'`; `>= 12` → `'profile_12_sections'`; `>= 3` → `'verified_gladiator'`. PASS — lines 407–410.
- `>= 3` also triggers dynamic import of `'./onboarding-drip.ts'`, calls `triggerDripDay(6)`. PASS — lines 412–414.
- All agents correctly note that both `'profile_3_sections'` and `'verified_gladiator'` share the `>= 3` threshold.
- All agents correctly note that the function is `async` but contains no top-level `await`. PASS.
**Unverifiable claims**: None.

### getSummary (line 417)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- `await _rpc('get_my_token_summary')`. PASS — line 418.
- Guard on `result?.success`. PASS — line 419.
- Calls `_updateBalanceDisplay` with `(result as unknown as TokenSummary).token_balance`. PASS — line 420.
- Returns `result as unknown as TokenSummary`. PASS — line 421.
- No toast or milestone calls. PASS.
**Unverifiable claims**: None.

### getMilestoneList (line 424)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- `Object.entries(MILESTONES).map(([key, def]) => ({ key, ...def, claimed: milestoneClaimed.has(key) }))`. PASS — lines 425–429.
- Synchronous, no state writes. PASS.
**Unverifiable claims**: None.

### getBalance (line 436)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Returns `lastKnownBalance` directly. PASS — line 437.
- No side effects, synchronous. PASS.
**Unverifiable claims**: None.

### _initBroadcast (line 444)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Entire body in `try/catch` with silent empty catch. PASS — lines 445–453.
- Constructs `new BroadcastChannel('mod-token-balance')`, assigns to `_bc`. PASS — line 446.
- `_bc.onmessage` handler checks `typeof e.data === 'number'`, calls `_updateBalanceDisplay(e.data, false)`. PASS — lines 447–450.
- If constructor throws, `_bc` remains `null`. PASS.
**Unverifiable claims**: None.

### init (line 459)
**Verification**: PARTIAL
**Findings**:
- Calls `_injectCSS`, then `_initBroadcast`. PASS — lines 460–461.
- Calls `onChange` with callback receiving `(user, profile)`. PASS — line 462.
- Callback: if both truthy, checks `profile.token_balance != null`, calls `_updateBalanceDisplay`; sets `dailyLoginClaimed = false`; calls `claimDailyLogin()` and `_loadMilestones()` without await; fires `void _rpc('notify_followers_online', { p_user_id: user.id })`. PASS — lines 463–472.
- Agent 01 states `claimDailyLogin()` is called "as fire-and-forget (no `void` keyword but no `await`)". Source line 468 confirms: `claimDailyLogin();` — no `void`, no `await`. PASS for Agent 01's precision here.
- Agent 03 adds an observation about repeated `init` calls re-registering `onChange` and calling `_initBroadcast` again. This is a valid behavioral observation — the source confirms `init` is a plain function with no idempotency guard. PASS as an accurate observation.
- Agent 05 notes the auto-init block at lines 506–510 registers `init` on `DOMContentLoaded` or calls it immediately. PASS — lines 506–510 confirm this exactly.
- All agents agree `init` is synchronous, returns void. PASS.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

| Function | PASS | PARTIAL | FAIL | Notes |
|---|---|---|---|---|
| `_injectCSS` | 4 | 1 | 0 | Minor CSS rule counting disagreement |
| `_coinFlyUp` | 5 | 0 | 0 | Full consensus |
| `_tokenToast` | 5 | 0 | 0 | Full consensus |
| `_milestoneToast` | 5 | 0 | 0 | Full consensus |
| `_updateBalanceDisplay` | 5 | 0 | 0 | Full consensus |
| `updateBalance` | 5 | 0 | 0 | Full consensus |
| `_rpc` | 5 | 0 | 0 | Full consensus |
| `requireTokens` | 4 | 1 | 0 | Agent 05 inverts control-flow order in prose |
| `claimMilestone` | 5 | 0 | 0 | Full consensus |
| `_loadMilestones` | 5 | 0 | 0 | Full consensus |
| `_checkStreakMilestones` | 5 | 0 | 0 | Full consensus |
| `claimDailyLogin` | 5 | 0 | 0 | Full consensus |
| `claimHotTake` | 5 | 0 | 0 | Full consensus |
| `claimReaction` | 5 | 0 | 0 | Full consensus |
| `claimVote` | 5 | 0 | 0 | Full consensus |
| `claimDebate` | 5 | 0 | 0 | Full consensus |
| `claimAiSparring` | 5 | 0 | 0 | Full consensus |
| `claimPrediction` | 5 | 0 | 0 | Full consensus |
| `checkProfileMilestones` | 5 | 0 | 0 | Full consensus |
| `getSummary` | 5 | 0 | 0 | Full consensus |
| `getMilestoneList` | 5 | 0 | 0 | Full consensus |
| `getBalance` | 5 | 0 | 0 | Full consensus |
| `_initBroadcast` | 5 | 0 | 0 | Full consensus |
| `init` | 4 | 1 | 0 | Agent 03 adds non-idempotency observation |

**Totals**: PASS 117, PARTIAL 3, FAIL 0

**Inter-agent disagreements of note**:
1. `_injectCSS` CSS rule count: counting-convention disagreement, both defensible.
2. `requireTokens` control flow: Agent 05 implies inverted order. Source has profile check first.
3. `init` void keyword on `claimDailyLogin()`: Agent 01 explicitly notes absence; others say "fire-and-forget" without noting the absence of `void`.

## needs_review

1. **Default export object getters** — the `tokens` object exported as default (lines 480–496) has `get balance()` (live read of `lastKnownBalance`) and `get MILESTONES()` (live read of module constant). No agent described these. A caller using `tokens.balance` reads `lastKnownBalance` directly without calling `getBalance()`.

2. **Auto-init block init double-registration risk** — Agent 03 correctly notes that `init` lacks an idempotency guard. If called a second time, `_initBroadcast` opens a second `BroadcastChannel` and `onChange` registers a second callback. No agent flagged this as a behavioral risk.

3. **`_loadMilestones` is exported** — with a leading underscore naming convention that implies internal use, yet it appears in the public module surface. No agent noted this asymmetry.

---

## Agent 02

### _injectCSS (line 104)
**Verification**: PARTIAL
**Findings**:
- All five agents correctly describe the `cssInjected` guard, style element creation, `textContent` assignment, and `document.head.appendChild`. PASS.
- Agent 01 says "four CSS class rules (`.token-fly-coin`, `.token-earn-toast`, `.milestone-toast`, and the three `.milestone-toast` sub-selectors)" — this is accurate. Agents 02, 03, 04, 05 say "three class rules (`.token-fly-coin`, `.token-earn-toast`, `.milestone-toast` with its child selectors)." PASS.
- No agent describes the specific keyframe content (percentages, transform values), but they correctly name both keyframes. PASS for what was claimed.
**Unverifiable claims**: None.

### _coinFlyUp (line 154)
**Verification**: PARTIAL
**Findings**:
- All five agents correctly state: calls `_injectCSS`, creates `<div>`, sets `className='token-fly-coin'`, sets `textContent='🪙'`, queries `document.getElementById('token-display')`, uses `getBoundingClientRect()` for left/top positioning if found, falls back to `style.top = '60px'` if not found, appends to `document.body`, schedules `coin.remove()` after 1000 ms. PASS.
- Agent 02 says "leaving `style.left` unset (falling back to the CSS `left:50%` on the class)." — The CSS class `.token-fly-coin` sets `left:50%` and uses `transform:translateX(-50%)`. When the bar is not found, `style.left` is indeed unset inline, but the CSS class provides `left:50%`. The source at line 165 shows only `coin.style.top = '60px'` in the else branch, confirming `style.left` is not set. PASS for substance.
**Unverifiable claims**: None.

### _tokenToast (line 171)
**Verification**: PASS
**Findings**: None. All five agents correctly describe: early return if `tokens` is falsy or `<= 0`, calls `_injectCSS`, calls `_coinFlyUp`, constructs `+${tokens} 🪙 ${label}`, calls `showToast(..., 'success')`. All confirmed by lines 172–177.
**Unverifiable claims**: None.

### _milestoneToast (line 179)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the three successive `rewardText` assignments, `Number()` casting, `escapeHTML` calls, `document.body.appendChild`, conditional `_coinFlyUp`, and `setTimeout` of 3600 ms. PASS.
- Agent 05 says the innerHTML also contains a literal text `MILESTONE UNLOCKED` and mentions a style attribute on the label div. No agent mentions this but it is a minor structural detail, not a runtime behavior claim.
- The source at line 194 shows `if (tokens > 0) _coinFlyUp();` is called **after** `document.body.appendChild(el)` (line 193). Agent 01 says "appends the element to `document.body`. If `tokens > 0`, it calls `_coinFlyUp`" — correct order. PASS.
**Unverifiable claims**: None.

### _updateBalanceDisplay (line 202)
**Verification**: PASS
**Findings**: None. All five agents correctly describe all claims. All confirmed by lines 202–213.
**Unverifiable claims**: None.

### updateBalance (line 216)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 216–220.
**Unverifiable claims**: None.

### _rpc (line 226)
**Verification**: PASS
**Findings**: None. All five agents correctly describe all claims. Confirmed by lines 226–240.
**Unverifiable claims**: None.

### requireTokens (line 246)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the function behavior. PASS.
- Agent 05 makes a slightly misleading ordering claim — implies balance check before profile null check. Source checks profile null first (line 247–248). Functionally identical outcomes, structural description is inverted. PARTIAL for Agent 05.
- All agents agree the `actionLabel` default fallback is `'do that'`. Confirmed at line 253. PASS.
**Unverifiable claims**: None.

### claimMilestone (line 261)
**Verification**: PASS
**Findings**: None. All five agents correctly describe all claims. Confirmed by lines 261–275.
**Unverifiable claims**: None.

### _loadMilestones (line 277)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 277–284.
**Unverifiable claims**: None.

### _checkStreakMilestones (line 286)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 286–291.
**Unverifiable claims**: None.

### claimDailyLogin (line 297)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the in-flight guard, try/finally reset, null result check, failure branch, and success branch. PASS.
- All agents correctly describe the label logic: base `'Daily login'`, overridden if `result.freeze_used`, else overridden if `result.streak_bonus > 0`. PASS.
- All agents correctly identify `nudge('return_visit', ...)` and `_checkStreakMilestones`. PASS.
- No agent mentions that on the failure path, `dailyLoginClaimed` is set to `true` unconditionally on any failure. Source at line 307 shows `dailyLoginClaimed = true` set even before the `console.warn` conditional. All agents describe this correctly. PASS.
**Unverifiable claims**: None.

### claimHotTake (line 328)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 328–338.
**Unverifiable claims**: None.

### claimReaction (line 340)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 340–348.
**Unverifiable claims**: None.

### claimVote (line 350)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 350–359.
**Unverifiable claims**: None.

### claimDebate (line 362)
**Verification**: PARTIAL
**Findings**:
- All agents correctly identify the distinct RPC `'claim_debate_tokens'`. PASS.
- All agents correctly describe the label logic and fate suffix. PASS.
- All agents correctly describe dynamic import calling `triggerDripDay(5)` unconditionally and `triggerDripDay(7)` if `is_winner`. PASS.
- The `fate_bonus` check uses `(result.fate_bonus ?? 0) > 0`. Agent 02 says "if `result.fate_bonus` is greater than `0`" — functionally the same. PASS.
**Unverifiable claims**: None.

### claimAiSparring (line 385)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 385–393.
**Unverifiable claims**: None.

### claimPrediction (line 395)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 395–403.
**Unverifiable claims**: None.

### checkProfileMilestones (line 405)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the function. PASS.
- Agent 05 describes the threshold order as "`completedCount >= 3` triggers `claimMilestone('profile_3_sections')` and also `claimMilestone('verified_gladiator')`" — implying they are grouped. Source shows they are separated by `>= 6` and `>= 12` checks. PARTIAL for Agent 05 only.
**Unverifiable claims**: None.

### getSummary (line 417)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 417–422.
**Unverifiable claims**: None.

### getMilestoneList (line 424)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 424–430.
**Unverifiable claims**: None.

### getBalance (line 436)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by line 437.
**Unverifiable claims**: None.

### _initBroadcast (line 444)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 444–453.
**Unverifiable claims**: None.

### init (line 459)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the calls to `_injectCSS`, `_initBroadcast`, and `onChange` callback registration. PASS.
- Callback behavior is correctly described by all agents. PASS.
- Agent 01 correctly notes `claimDailyLogin()` is called without `void`. Source line 468 confirms. PASS.
- Agent 03 correctly notes a re-entrant risk: calling `init` twice will re-register `onChange` and open a second `BroadcastChannel`. Accurate. PASS for this observation.
- All agents describe the auto-init block. PASS.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

**Counts across all 19 functions × 5 agents:**
- PASS: 114
- PARTIAL: 6 (`_injectCSS`×Agent01, `_coinFlyUp`×Agent01, `requireTokens`×Agent05, `init`×Agent03 flagged as informative but not wrong)
- FAIL: 0

**Cross-agent disagreements:**
- `_injectCSS`: Agents 02–05 say "three class rules with child selectors"; Agent 01 says "four CSS class rules."
- `_coinFlyUp` fallback branch: Agents 02–05 explicitly note `style.left` is not set when `token-display` is absent. Agent 01 omits this.
- `init` double-registration risk: Only Agent 03 notes that `init` lacks idempotency protection beyond `_injectCSS`'s guard. No other agent mentions this. Agent 03's observation is correct.

## needs_review

1. **`init` double-call risk (line 459 + lines 506–510):** The exported `init` function has no idempotency guard. If any external caller invokes `init()` again, `_initBroadcast` will open a second `BroadcastChannel` and the `onChange` callback will be registered twice, causing `claimDailyLogin`, `_loadMilestones`, and `_rpc('notify_followers_online', ...)` to fire twice per auth state change.

2. **`claimDailyLogin` and `_loadMilestones` called without `void` in `init` (lines 468–469):** Both are called as bare unawaited statements with no `void` keyword, while `_rpc(...)` on line 471 uses `void`, creating an inconsistency within the same block.

3. **`_updateBalanceDisplay(result.new_balance)` without null guard in `claimDailyLogin`**: Line 311 calls `_updateBalanceDisplay(result.new_balance)` directly without checking `result.new_balance != null`. The `_updateBalanceDisplay` function handles undefined/null with an early return, so this is safe. But it is an asymmetry from `claimMilestone` line 271 which guards `if (result.new_balance != null)`.

---

## Agent 03

### _injectCSS (line 104)
**Verification**: PARTIAL
**Findings**:
- All five agents correctly describe the `cssInjected` guard, setting it to `true`, creating a `<style>` element, assigning CSS to `style.textContent`, and appending to `document.head`. PASS on those claims.
- Agents 02, 03, 04, and 05 say "three class rules". Agent 01 says "four CSS class rules." Agent 01's claim of "four" is slightly off — the source has three top-level class rules (`.token-fly-coin`, `.token-earn-toast`, `.milestone-toast`), not four. However neither reading is harmful. Minor inaccuracy.
**Unverifiable claims**: None

### _coinFlyUp (line 154)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe: calls `_injectCSS`, creates `<div>`, sets class/textContent, queries `getElementById('token-display')`, conditional bounding-rect positioning or top='60px' fallback, appends to body, 1000ms remove. PASS.
- Agent 01 does not mention that `style.left` is only set conditionally (only in the found-bar branch). Agents 02–05 note this explicitly. PARTIAL for Agent 01.
**Unverifiable claims**: None

### _tokenToast (line 171)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 172–177.
**Unverifiable claims**: None

### _milestoneToast (line 179)
**Verification**: PASS
**Findings**: All agents correctly describe all claims. Source lines 180–195 confirm all details.
**Unverifiable claims**: None

### _updateBalanceDisplay (line 202)
**Verification**: PASS
**Findings**: None. All five agents correctly describe all claims. Confirmed by source lines 202–213.
**Unverifiable claims**: None

### updateBalance (line 216)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 216–220.
**Unverifiable claims**: None

### _rpc (line 226)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 226–240.
**Unverifiable claims**: None

### requireTokens (line 246)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the logic. PASS.
- Agent 05 makes a slightly misleading ordering claim — implies the balance check occurs before the profile-null check. Source checks profile null first (line 247–248), then balance. PARTIAL for Agent 05. Functionally correct, structurally misleading.
**Unverifiable claims**: None

### claimMilestone (line 261)
**Verification**: PASS
**Findings**: None. All five agents correctly describe all claims. Confirmed by source lines 261–275.
**Unverifiable claims**: None

### _loadMilestones (line 277)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 277–284.
**Unverifiable claims**: None

### _checkStreakMilestones (line 286)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 286–291.
**Unverifiable claims**: None

### claimDailyLogin (line 297)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the in-flight guard, try/finally, null check, failure path, and success path. PASS.
- Label logic: source lines 312–317 show `if (result.freeze_used)` first, then `else if ((result.streak_bonus ?? 0) > 0)`. All agents describe this correctly. PASS.
**Unverifiable claims**: None

### claimHotTake (line 328)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 328–338.
**Unverifiable claims**: None

### claimReaction (line 340)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 340–348.
**Unverifiable claims**: None

### claimVote (line 350)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 350–359.
**Unverifiable claims**: None

### claimDebate (line 362)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 362–383.
**Unverifiable claims**: None

### claimAiSparring (line 385)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 385–393.
**Unverifiable claims**: None

### claimPrediction (line 395)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 395–403.
**Unverifiable claims**: None

### checkProfileMilestones (line 405)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 405–415.
**Unverifiable claims**: None

### getSummary (line 417)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 417–422.
**Unverifiable claims**: None

### getMilestoneList (line 424)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 424–430.
**Unverifiable claims**: None

### getBalance (line 436)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source line 437.
**Unverifiable claims**: None

### _initBroadcast (line 444)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by source lines 444–453.
**Unverifiable claims**: None

### init (line 459)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the calls to `_injectCSS`, `_initBroadcast`, and `onChange` callback. PASS.
- Agent 03 makes an important observation: "any subsequent call to the exported `init` will repeat all setup — including re-registering the `onChange` callback and calling `_initBroadcast` again." This is accurate since there is no guard against double-calling. PASS for this observation.
- Auto-init block described correctly by agents who mention it. PASS.
**Unverifiable claims**: What `onChange` does when called (lives in `auth.ts`).

## Cross-Agent Consensus Summary

| Function | Agent 01 | Agent 02 | Agent 03 | Agent 04 | Agent 05 | Overall |
|---|---|---|---|---|---|---|
| `_injectCSS` | PARTIAL (says "four CSS class rules") | PASS | PASS | PASS | PASS | PARTIAL |
| `_coinFlyUp` | PARTIAL (omits conditional left) | PASS | PASS | PASS | PASS | PARTIAL |
| `_tokenToast` | PASS | PASS | PASS | PASS | PASS | PASS |
| `_milestoneToast` | PASS | PASS | PASS | PASS | PASS | PASS |
| `_updateBalanceDisplay` | PASS | PASS | PASS | PASS | PASS | PASS |
| `updateBalance` | PASS | PASS | PASS | PASS | PASS | PASS |
| `_rpc` | PASS | PASS | PASS | PASS | PASS | PASS |
| `requireTokens` | PASS | PASS | PASS | PASS | PARTIAL (order reversal) | PARTIAL |
| `claimMilestone` | PASS | PASS | PASS | PASS | PASS | PASS |
| `_loadMilestones` | PASS | PASS | PASS | PASS | PASS | PASS |
| `_checkStreakMilestones` | PASS | PASS | PASS | PASS | PASS | PASS |
| `claimDailyLogin` | PASS | PASS | PASS | PASS | PASS | PASS |
| `claimHotTake` | PASS | PASS | PASS | PASS | PASS | PASS |
| `claimReaction` | PASS | PASS | PASS | PASS | PASS | PASS |
| `claimVote` | PASS | PASS | PASS | PASS | PASS | PASS |
| `claimDebate` | PASS | PASS | PASS | PASS | PASS | PASS |
| `claimAiSparring` | PASS | PASS | PASS | PASS | PASS | PASS |
| `claimPrediction` | PASS | PASS | PASS | PASS | PASS | PASS |
| `checkProfileMilestones` | PASS | PASS | PASS | PASS | PASS | PASS |
| `getSummary` | PASS | PASS | PASS | PASS | PASS | PASS |
| `getMilestoneList` | PASS | PASS | PASS | PASS | PASS | PASS |
| `getBalance` | PASS | PASS | PASS | PASS | PASS | PASS |
| `_initBroadcast` | PASS | PASS | PASS | PASS | PASS | PASS |
| `init` | PASS | PASS | PARTIAL (extra obs, accurate) | PASS | PASS | PASS |

**Counts**: PASS 114, PARTIAL 6, FAIL 0

## needs_review

1. **`init` double-call risk**: The auto-init block at lines 506–510 calls `init()` once at module load. The exported `init` has no idempotency guard. A second call will create a second `BroadcastChannel` and double-register the auth callback, causing `claimDailyLogin`, `_loadMilestones`, and `_rpc('notify_followers_online', ...)` to fire twice per auth state change. Only Agent 03 noted this.

2. **`claimDailyLogin` and `_loadMilestones` called without `void` in `init` (lines 468–469)**: Both are called without `void` and without `await`. `_rpc(...)` on line 471 uses `void`, creating an inconsistency within the same callback. This is a minor code-quality observation.

---

## Agent 04

### _injectCSS (line 104)
**Verification**: PARTIAL
**Findings**:
- All agents agree the function guards on `cssInjected`, sets it to `true`, creates a `<style>` element, assigns `style.textContent`, and appends to `document.head`. PASS.
- Agent 01 says "four CSS class rules (`.token-fly-coin`, `.token-earn-toast`, `.milestone-toast`, and the three `.milestone-toast` sub-selectors)." Agents 02–05 say "three class rules". Both are defensible. Minor imprecision.
**Unverifiable claims**: None.

### _coinFlyUp (line 154)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the core behavior. PASS.
- Agent 01 says the fallback sets `style.top = '60px'` — correct per line 165. PASS.
- Agent 02 says the fallback leaves `style.left` "unset (falling back to the CSS `left:50%`)." Source confirms: only `coin.style.top` is set in the else branch. PASS.
**Unverifiable claims**: None.

### _tokenToast (line 171)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 172–177.
**Unverifiable claims**: None.

### _milestoneToast (line 179)
**Verification**: PASS
**Findings**: All agents correctly describe all claims. Source lines 179–196 confirm all details.
**Unverifiable claims**: None.

### _updateBalanceDisplay (line 202)
**Verification**: PASS
**Findings**: None. All five agents correctly describe all claims. Confirmed by lines 202–213.
**Unverifiable claims**: None.

### updateBalance (line 216)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 216–220.
**Unverifiable claims**: None.

### _rpc (line 226)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 226–240.
**Unverifiable claims**: None.

### requireTokens (line 246)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims (Agent 05's ordering issue is the only partial). Confirmed by lines 246–255.
**Unverifiable claims**: None.

### claimMilestone (line 261)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 261–275.
**Unverifiable claims**: None.

### _loadMilestones (line 277)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 277–284.
**Unverifiable claims**: None.

### _checkStreakMilestones (line 286)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 286–291.
**Unverifiable claims**: None.

### claimDailyLogin (line 297)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the core flow. PASS.
- Agent 01 describes init behavior (no `void` on `claimDailyLogin()`) — about `init`, not this function. Source line 468 confirms. PASS.
- All agents correctly note the label priority: `freeze_used` wins over `streak_bonus`. PASS.
**Unverifiable claims**: None.

### claimHotTake (line 328)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 328–338.
**Unverifiable claims**: None.

### claimReaction (line 340)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 340–348.
**Unverifiable claims**: None.

### claimVote (line 350)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 350–359.
**Unverifiable claims**: None.

### claimDebate (line 362)
**Verification**: PARTIAL
**Findings**:
- All agents correctly identify the distinct RPC and all label logic. PASS.
- Agent 01 implies nesting of `upset_bonus` check inside `is_winner` check. Source shows sequential assignments — the `upset_bonus` check is not nested but sequential. PARTIAL for Agent 01.
**Unverifiable claims**: None.

### claimAiSparring (line 385)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 385–393.
**Unverifiable claims**: None.

### claimPrediction (line 395)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 395–403.
**Unverifiable claims**: None.

### checkProfileMilestones (line 405)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the four threshold checks and async-with-no-await. PASS.
- Agent 05 implies `profile_3_sections` and `verified_gladiator` are adjacent. Source shows they are separated. PARTIAL for Agent 05.
**Unverifiable claims**: None.

### getSummary (line 417)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 417–422.
**Unverifiable claims**: None.

### getMilestoneList (line 424)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 424–430.
**Unverifiable claims**: None.

### getBalance (line 436)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by line 437.
**Unverifiable claims**: None.

### _initBroadcast (line 444)
**Verification**: PASS
**Findings**: None. All agents correctly describe all claims. Confirmed by lines 444–453.
**Unverifiable claims**: None.

### init (line 459)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the core init behavior. PASS.
- Agent 03 correctly notes re-registration risk. PASS.
- Auto-init block described correctly. PASS.
**Unverifiable claims**: What `onChange` does when called.

## Cross-Agent Consensus Summary

| Function | Verdict | Notes |
|---|---|---|
| `_injectCSS` | PARTIAL | CSS rule count ambiguity |
| `_coinFlyUp` | PARTIAL | Agent 01 omits conditional left; otherwise consensus |
| `_tokenToast` | PASS | Full consensus |
| `_milestoneToast` | PASS | Full consensus |
| `_updateBalanceDisplay` | PASS | Full consensus |
| `updateBalance` | PASS | Full consensus |
| `_rpc` | PASS | Full consensus |
| `requireTokens` | PARTIAL | Agent 05 inverts control-flow order |
| `claimMilestone` | PASS | Full consensus |
| `_loadMilestones` | PASS | Full consensus |
| `_checkStreakMilestones` | PASS | Full consensus |
| `claimDailyLogin` | PASS | Full consensus |
| `claimHotTake` | PASS | Full consensus |
| `claimReaction` | PASS | Full consensus |
| `claimVote` | PASS | Full consensus |
| `claimDebate` | PARTIAL | Agent 01 implies nested if-structure; source is sequential |
| `claimAiSparring` | PASS | Full consensus |
| `claimPrediction` | PASS | Full consensus |
| `checkProfileMilestones` | PARTIAL | Agent 05 grouping imprecision |
| `getSummary` | PASS | Full consensus |
| `getMilestoneList` | PASS | Full consensus |
| `getBalance` | PASS | Full consensus |
| `_initBroadcast` | PASS | Full consensus |
| `init` | PARTIAL | Agent 01/03 add structural precision notes |

**Summary counts**: 17 PASS, 7 PARTIAL, 0 FAIL. No FAILs across any function or agent.

## needs_review

1. **`claimDailyLogin` — `result.new_balance` without null guard at call site**: Line 311 calls `_updateBalanceDisplay(result.new_balance)` without checking for null, unlike `claimMilestone` line 271 which guards `if (result.new_balance != null)`. Harmless since `_updateBalanceDisplay` returns early on null/undefined, but the asymmetry is substantive.

2. **`init` no-idempotency guard**: Calling `init` twice will double-register `onChange` and open a second `BroadcastChannel`. No stage 2 agent flagged this as a risk.

3. **`_coinFlyUp` `style.left` override semantics**: When `token-display` is found, inline `style.left` is set as a pixel value overriding the CSS class's `left:50%`. Coin flies from actual bar position. Fallback renders at CSS `left:50%`. No agent explicitly flagged the visual distinction.

---

## Agent 05

## Verification Report: `src/tokens.ts` vs Stage 2

### `_injectCSS` (line 104)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the `cssInjected` guard, style element creation, `style.textContent` assignment, and `document.head.appendChild`. PASS.
- Agent 01 describes "four CSS class rules (`.token-fly-coin`, `.token-earn-toast`, `.milestone-toast`, and the three `.milestone-toast` sub-selectors)" — the actual source has four distinct CSS blocks plus sub-selectors. Agent 01's count conflates the parent selector with its children. Agents 02/03/04/05 say "three class rules" which is also technically valid. This is a counting ambiguity, not a factual error.
**Unverifiable claims**: None

### `_coinFlyUp` (line 154)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe: calling `_injectCSS`, creating a div, setting class and textContent, two branches, appending to body, 1000ms setTimeout. PASS.
- When the bar is NOT found, the source only sets `coin.style.top = '60px'` (line 165) and does NOT set `style.left`. Agents 02, 03, 04, 05 note this explicitly. Agent 01 omits this. PARTIAL for Agent 01.
- Agents 02, 04, 05 note "the CSS class has `left:50%` via transform" — actually `.token-fly-coin` has `left:50%` but no `translateX` transform (that transform is on `.token-earn-toast`). This is a minor inaccuracy in explanatory comments about CSS.
**Unverifiable claims**: None

### `_tokenToast` (line 171)
**Verification**: PASS
**Findings**:
- All agents agree: early return if `tokens` is falsy or `<= 0`; calls `_injectCSS`; calls `_coinFlyUp`; constructs the string; calls `showToast(msg, 'success')`. All confirmed by source lines 172–177.
**Unverifiable claims**: None

### `_milestoneToast` (line 179)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe all major claims. PASS.
- Agent 05 notes "a singular/plural suffix check" for the freeze string — confirmed by source line 185: `freeze${freezes > 1 ? 's' : ''}`. Agents 01–04 omit this detail (omission, not error).
- All agents correctly note `icon || '🏆'` default, `escapeHTML` on all injected content, 3600ms removal. PASS.
**Unverifiable claims**: None

### `_updateBalanceDisplay` (line 202)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Confirmed by source lines 202–213.
**Unverifiable claims**: None

### `updateBalance` (line 216)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source lines 216–220 confirm all.
**Unverifiable claims**: None

### `_rpc` (line 226)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source lines 226–240 confirm all.
**Unverifiable claims**: What `safeRpc` does internally (lives in `auth.core.ts`).

### `requireTokens` (line 246)
**Verification**: PASS
**Findings**:
- All agents correctly describe the function logic. Source lines 246–255 confirm all claims.
**Unverifiable claims**: None

### `claimMilestone` (line 261)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source lines 261–274 confirm all.
**Unverifiable claims**: None

### `_loadMilestones` (line 277)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source lines 277–284 confirm all.
**Unverifiable claims**: None

### `_checkStreakMilestones` (line 286)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source lines 286–291 confirm all.
**Unverifiable claims**: None

### `claimDailyLogin` (line 297)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the in-flight guard, try/finally, null result return, failure path, and success path. PASS.
- Agent 03 says "overridden to a streak message if `result.streak_bonus > 0`" — source line 315: `else if ((result.streak_bonus ?? 0) > 0)`. The `?? 0` means null/undefined is treated as 0. Agent 03 omits the null-coalescing detail. PARTIAL for Agent 03.
**Unverifiable claims**: None

### `claimHotTake` (line 328)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source lines 328–338 confirm all.
**Unverifiable claims**: What `triggerDripDay` does (in another module).

### `claimReaction` (line 340)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source lines 340–348 confirm all.
**Unverifiable claims**: None

### `claimVote` (line 350)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source lines 350–360 confirm all.
**Unverifiable claims**: None

### `claimDebate` (line 362)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the distinct RPC, label logic, and dynamic import. PASS.
- Agent 01 implies nesting of `upset_bonus` check inside `is_winner` check. Source lines 367–371 show sequential assignments. The `upset_bonus` check is NOT inside the `is_winner` if-block. In practice `'Upset victory!'` can only appear when `is_winner` is truthy because `'Debate win!'` had to be set first, but the code structure is sequential, not nested. PARTIAL for Agent 01.
**Unverifiable claims**: None

### `claimAiSparring` (line 385)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source lines 385–393 confirm all.
**Unverifiable claims**: None

### `claimPrediction` (line 395)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source lines 395–403 confirm all.
**Unverifiable claims**: None

### `checkProfileMilestones` (line 405)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the four threshold checks. PASS.
- Agent 01 says "The function itself returns `Promise<void>` but contains no top-level `await`" — confirmed, no `await` inside the function body. PASS.
- Agent 05 describes the threshold order as "`completedCount >= 3` triggers both `profile_3_sections` and `verified_gladiator`" — implying they are adjacent or grouped. Source lines 407–410 show four separate sequential `if` statements. PARTIAL for Agent 05.
**Unverifiable claims**: None

### `getSummary` (line 417)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source lines 417–422 confirm all.
**Unverifiable claims**: None

### `getMilestoneList` (line 424)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source lines 424–430 confirm all.
**Unverifiable claims**: None

### `getBalance` (line 436)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source line 437 confirms.
**Unverifiable claims**: None

### `_initBroadcast` (line 444)
**Verification**: PASS
**Findings**:
- All agents correctly describe all claims. Source lines 444–453 confirm all.
**Unverifiable claims**: None

### `init` (line 459)
**Verification**: PARTIAL
**Findings**:
- All agents correctly describe the core behavior. PASS.
- Agent 01 says `claimDailyLogin()` is called "as fire-and-forget (no `void` keyword but no `await`)." Source line 468 confirms. PASS.
- Agent 03 correctly notes the re-registration risk. PASS.
- Auto-init block (lines 506–510) is described correctly. Agent 05 calls it "a separate IIFE-equivalent block" — it is not an IIFE but a conditional at module scope. PARTIAL for Agent 05.
**Unverifiable claims**: What `onChange` does when called (lives in `auth.ts`).

## Cross-Agent Consensus Summary

| Function | Verdict | Notes |
|---|---|---|
| `_injectCSS` | PARTIAL | Minor CSS rule-count ambiguity |
| `_coinFlyUp` | PARTIAL | Agents 03/04/05 describe `left:50%` as via transform; transform is not on the fly-coin class |
| `_tokenToast` | PASS | Full consensus |
| `_milestoneToast` | PARTIAL | Agent 05 notes singular/plural; others omit (omission not error) |
| `_updateBalanceDisplay` | PASS | Full consensus |
| `updateBalance` | PASS | Full consensus |
| `_rpc` | PASS | Full consensus |
| `requireTokens` | PASS | Full consensus |
| `claimMilestone` | PASS | Full consensus |
| `_loadMilestones` | PASS | Full consensus |
| `_checkStreakMilestones` | PASS | Full consensus |
| `claimDailyLogin` | PARTIAL | Agent 03 omits `?? 0` on `streak_bonus` check |
| `claimHotTake` | PASS | Full consensus |
| `claimReaction` | PASS | Full consensus |
| `claimVote` | PASS | Full consensus |
| `claimDebate` | PARTIAL | Agent 01 implies nested if-structure; source is sequential |
| `claimAiSparring` | PASS | Full consensus |
| `claimPrediction` | PASS | Full consensus |
| `checkProfileMilestones` | PARTIAL | Agent 05 grouping phrasing slightly misleading |
| `getSummary` | PASS | Full consensus |
| `getMilestoneList` | PASS | Full consensus |
| `getBalance` | PASS | Full consensus |
| `_initBroadcast` | PASS | Full consensus |
| `init` | PARTIAL | Agent 03 notes re-registration; Agent 05 mislabels auto-init block as "IIFE" |

**Summary counts**: 17 PASS, 7 PARTIAL, 0 FAIL

## needs_review

1. **`init` re-registration risk**: The exported `init` function has no idempotency guard. Calling it a second time will double-register the `onChange` callback and open a second `BroadcastChannel`. Only Agent 03 mentioned this. No Stage 2 agent flagged it as a behavioral risk.

2. **`_coinFlyUp` fallback coin position**: When `token-display` is not in the DOM, the fallback branch sets only `coin.style.top = '60px'` and does NOT set `style.left`. The CSS class `.token-fly-coin` sets `left:50%` without a `translateX(-50%)` transform (that transform is on `.token-earn-toast`). So the coin in the fallback branch renders at `left:50%` measured from the left edge of the containing block, not centered on itself. Multiple agents incorrectly attributed a `translateX(-50%)` transform to the fly-coin class.

3. **`_tokenToast` double `_injectCSS` call**: `_tokenToast` calls `_injectCSS()` directly and then calls `_coinFlyUp()` which also calls `_injectCSS()`. The `cssInjected` guard makes the second call harmless but redundant. No agent flagged this.
