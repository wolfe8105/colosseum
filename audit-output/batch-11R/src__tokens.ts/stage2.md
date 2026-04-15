# Stage 2 Outputs — tokens.ts

## Agent 01

### _injectCSS
Guards with module-level `cssInjected` boolean — returns immediately if already true. On first call: sets `cssInjected = true`, creates a `<style>` element with two keyframe animations (`tokenFlyUp`, `milestoneSlide`) and CSS classes (`.token-fly-coin`, `.token-earn-toast`, `.milestone-toast`), appends to `document.head`. Idempotent.

### _coinFlyUp
Calls `_injectCSS()`. Creates a `div.token-fly-coin` with text '🪙'. If `#token-display` exists, positions the coin at the horizontal center and bottom edge of that element via `getBoundingClientRect()`. Otherwise sets `top = '60px'`. Appends to `document.body`. Schedules removal after 1000 ms via `setTimeout`.

### _tokenToast
Guard: if `tokens` is falsy or `<= 0`, returns immediately. Otherwise calls `_injectCSS()`, `_coinFlyUp()`, and `showToast('+${tokens} 🪙 ${label}', 'success')`.

### _milestoneToast
Calls `_injectCSS()`. Creates `div.milestone-toast`. Builds `rewardText` with three sequential (non-exclusive) if-statements: tokens>0 → "+N 🪙 tokens"; freezes>0 → overwrites with "+N ❄️ streak freeze(s)"; both>0 → overwrites with "+N 🪙 + N ❄️". Sets innerHTML using `escapeHTML()` on icon (fallback '🏆'), label, and rewardText. Appends to body. If tokens>0, calls `_coinFlyUp()`. Removes after 3600 ms.

### _updateBalanceDisplay
Guard: returns if `newBalance == null`. Sets `lastKnownBalance = newBalance`. Updates all `[data-token-balance]` elements' textContent to `newBalance.toLocaleString()`. Updates `#token-balance` element if found. If `broadcast === true` and `_bc` is non-null, posts `newBalance` on BroadcastChannel (errors silently caught).

### updateBalance
Calls `_updateBalanceDisplay(newBalance)`. Gets current profile via `getCurrentProfile()`. If profile exists, mutates `profile.token_balance = newBalance` in place (cast as `Record<string, unknown>`).

### _rpc
Returns null if `getIsPlaceholderMode()` or `!getCurrentUser()`. Calls `safeRpc(fnName, args)`. If error field present: `console.warn`, returns null. On thrown exception: `console.warn`, returns null. Otherwise returns `data as ClaimResult`.

### requireTokens
Gets profile via `getCurrentProfile()`. If no profile, returns `true` (permissive for guests). Reads `profile.token_balance || 0`. If `balance >= amount`, returns `true`. Otherwise computes `deficit = amount - balance`, calls `showToast('error')` with "Need N tokens to [label] (N more to go)", returns `false`.

### claimMilestone
Guards: if `milestoneClaimed.has(key)` → null; if `!MILESTONES[key]` → null. Calls `_rpc('claim_milestone', { p_milestone_key: key })`. If result not successful: if `error === 'Already claimed'`, adds to `milestoneClaimed`; returns null. On success: adds to `milestoneClaimed`, calls `_updateBalanceDisplay(result.new_balance)` if present, calls `_milestoneToast`, logs, returns result.

### _loadMilestones
Calls `_rpc('get_my_milestones')`. Returns if not successful. Reads `result.claimed` array and adds each key to `milestoneClaimed` set.

### _checkStreakMilestones
Guard: if `!streak`, returns. Three independent (non-else) checks: if `streak >= 7` → fire-and-forget `claimMilestone('streak_7')`; if `streak >= 30` → `claimMilestone('streak_30')`; if `streak >= 100` → `claimMilestone('streak_100')`. A streak of 100 triggers all three.

### claimDailyLogin
Guard: if `_dailyLoginInFlight` → null. Sets `_dailyLoginInFlight = true` in try/finally (always resets to false). Calls `_rpc('claim_daily_login')`. If null result → null. If `!result.success`: warns (unless error==='Already claimed today'), sets `dailyLoginClaimed = true`, returns null. On success: sets `dailyLoginClaimed = true`, updates balance display. Label branches: if `freeze_used` → freeze-saved message; else if `streak_bonus > 0` → streak-day message; else → 'Daily login'. Calls `_tokenToast`, `nudge('return_visit', ...)`, logs, calls `_checkStreakMilestones(login_streak ?? 0)`. Returns result.

### claimHotTake
Guard: if `!hotTakeId` → null. Calls `_rpc('claim_action_tokens', { p_action: 'hot_take', p_reference_id: hotTakeId })`. If not successful → null. Updates balance, toast 'Hot take', fire-and-forget `claimMilestone('first_hot_take')`, fire-and-forget dynamic import `onboarding-drip.ts` → `triggerDripDay(4)`. Returns result.

### claimReaction
Guard: if `!hotTakeId` → null. Calls `_rpc('claim_action_tokens', { p_action: 'reaction', p_reference_id: hotTakeId })`. If not successful → null. Updates balance, toast 'Reaction', fire-and-forget `claimMilestone('first_reaction')`. Returns result. No drip trigger.

### claimVote
Guard: if `!debateId` → null. Calls `_rpc('claim_action_tokens', { p_action: 'vote', p_reference_id: debateId })`. If not successful → null. Updates balance, toast 'Vote', fire-and-forget `claimMilestone('first_vote')`, fire-and-forget drip → `triggerDripDay(2)`. Returns result.

### claimDebate
Guard: if `!debateId` → null. Calls `_rpc('claim_debate_tokens', { p_debate_id: debateId })` (different RPC from action-token functions). If not successful → null. Updates balance. Label: default 'Debate complete'; if `is_winner` → 'Debate win!'; if `upset_bonus > 0` (nested in winner branch) → 'Upset victory!'; if `fate_bonus > 0` → appends '(+N% Group Fate)'. Toast, fire-and-forget `claimMilestone('first_debate')`, fire-and-forget drip → `triggerDripDay(5)` always + `triggerDripDay(7)` if winner. Returns result.

### claimAiSparring
Guard: if `!debateId` → null. Calls `_rpc('claim_action_tokens', { p_action: 'ai_sparring', p_reference_id: debateId })`. If not successful → null. Updates balance, toast 'AI Sparring', fire-and-forget `claimMilestone('first_ai_sparring')`. Returns result. No drip.

### claimPrediction
Guard: if `!debateId` → null. Calls `_rpc('claim_action_tokens', { p_action: 'prediction', p_reference_id: debateId })`. If not successful → null. Updates balance, toast 'Prediction', fire-and-forget `claimMilestone('first_prediction')`. Returns result. No drip.

### checkProfileMilestones
Guard: if `!completedCount` → return. Four independent checks (no else-if): `>=3` → `claimMilestone('profile_3_sections')`; `>=6` → `claimMilestone('profile_6_sections')`; `>=12` → `claimMilestone('profile_12_sections')`; `>=3` (separate block) → `claimMilestone('verified_gladiator')`. Both `profile_3_sections` and `verified_gladiator` trigger at the same `>=3` threshold. If `>=3`: fire-and-forget drip → `triggerDripDay(6)`. Returns void.

### getSummary
Calls `_rpc('get_my_token_summary')`. If not successful → null. Calls `_updateBalanceDisplay(result.token_balance)`. Returns result as `TokenSummary`.

### getMilestoneList
Maps `Object.entries(MILESTONES)` to `MilestoneListItem[]` — each entry spreads definition fields, adds `key`, adds `claimed: milestoneClaimed.has(key)`. Pure read. Returns array of 13 items.

### getBalance
Returns `lastKnownBalance` (number | null). No side effects.

### _initBroadcast
Try/catch (silently swallows BroadcastChannel not supported). Creates `BroadcastChannel('mod-token-balance')`, assigns to `_bc`. Sets `onmessage`: if `e.data` is a number, calls `_updateBalanceDisplay(e.data, false)` (broadcast=false to avoid echo loop).

### init
Calls `_injectCSS()`. Calls `_initBroadcast()`. Registers `onChange` callback from auth.ts. Callback fires when auth state changes — if both user and profile truthy: if `profile.token_balance != null` → `_updateBalanceDisplay`; resets `dailyLoginClaimed = false`; calls `claimDailyLogin()` (not awaited); calls `_loadMilestones()` (not awaited); fires `_rpc('notify_followers_online', { p_user_id: user.id })` as void.

---

## Agent 02

### _injectCSS
Reads `cssInjected` module-level flag. If true, returns immediately. Otherwise sets `cssInjected = true`, creates a `<style>` element (content is the actual animation CSS), appends to `document.head`. Side effect is strictly one-time.

### _coinFlyUp
Calls `_injectCSS()`. Creates `div.token-fly-coin` with 🪙. Looks up `#token-display`. If found: positions at horizontal center and bottom of its bounding rect. If not found: sets `top = '60px'`. Appends to body. `setTimeout(1000)` removes it.

### _tokenToast
Guard: if `tokens` falsy or <= 0, returns. Calls `_injectCSS()`, `_coinFlyUp()`, `showToast('+${tokens} 🪙 ${label}', 'success')`.

### _milestoneToast
Calls `_injectCSS()`. Builds `div.milestone-toast`. `rewardText` is constructed via three sequential if-blocks: (1) tokens>0 → "+N 🪙 tokens"; (2) freezes>0 → "+N ❄️ streak freeze(s)" (overwrites); (3) both>0 → "+N 🪙 + N ❄️" (overwrites again). Sets innerHTML via `escapeHTML()` on icon, label, rewardText. Appends to body. If tokens>0, calls `_coinFlyUp()`. Removes after 3600 ms.

### _updateBalanceDisplay
Guard: `newBalance == null` → return. Sets `lastKnownBalance`. Updates all `[data-token-balance]` elements' textContent. Updates `#token-balance`. If broadcast=true and `_bc` non-null: `_bc.postMessage(newBalance)` in try/catch.

### updateBalance
Calls `_updateBalanceDisplay(newBalance)`. Reads `getCurrentProfile()`; if truthy, mutates `profile.token_balance = newBalance` in-place.

### _rpc
Async. Guards: `getIsPlaceholderMode()` → null; `!getCurrentUser()` → null. Awaits `safeRpc(fnName, args)`. On error or exception: warns, returns null. On success: returns `data as ClaimResult`.

### requireTokens
Gets profile. No profile → return true. Gets `profile.token_balance || 0`. If sufficient → return true. Else shows error toast with deficit, returns false.

### claimMilestone
Guards: Set.has(key) → null; !MILESTONES[key] → null. Calls `_rpc('claim_milestone', { p_milestone_key: key })`. Failure: add to Set if 'Already claimed'; return null. Success: add to Set, update balance, milestone toast, log, return result.

### _loadMilestones
Calls `_rpc('get_my_milestones')`. On success, reads `result.claimed` array, adds each to `milestoneClaimed` Set.

### _checkStreakMilestones
Guard: falsy streak → return. Three independent if-checks: >=7, >=30, >=100 → fire-and-forget claimMilestone for each threshold met.

### claimDailyLogin
Mutex: `_dailyLoginInFlight` guard. try/finally resets flag. RPC 'claim_daily_login'. Failure/no-result → null. Success: updates balance, label (freeze_used → freeze msg; else if streak_bonus>0 → streak msg; else 'Daily login'), token toast, nudge, log, checkStreakMilestones. Returns result.

### claimHotTake
Guard: falsy hotTakeId → null. RPC 'claim_action_tokens' with p_action='hot_take'. Balance update, toast 'Hot take', fire first_hot_take milestone, drip day 4.

### claimReaction
Guard: falsy → null. RPC 'claim_action_tokens' p_action='reaction'. Balance update, toast 'Reaction', fire first_reaction milestone. No drip.

### claimVote
Guard: falsy → null. RPC 'claim_action_tokens' p_action='vote'. Balance, toast 'Vote', first_vote milestone, drip day 2.

### claimDebate
Guard: falsy → null. RPC 'claim_debate_tokens' (dedicated RPC). Balance. Label: 'Debate complete' → 'Debate win!' if winner → 'Upset victory!' if upset_bonus>0 (nested in winner check). Appends Group Fate suffix if fate_bonus>0. Toast, first_debate milestone, drip days 5 (+7 if winner). Returns result.

### claimAiSparring
Guard: falsy → null. RPC 'claim_action_tokens' p_action='ai_sparring'. Balance, toast 'AI Sparring', first_ai_sparring milestone. No drip.

### claimPrediction
Guard: falsy → null. RPC 'claim_action_tokens' p_action='prediction'. Balance, toast 'Prediction', first_prediction milestone. No drip.

### checkProfileMilestones
Guard: falsy count → return. Independent checks: >=3 → profile_3_sections + verified_gladiator; >=6 → profile_6_sections; >=12 → profile_12_sections. All fire-and-forget. If >=3: drip day 6. Returns void.

### getSummary
RPC 'get_my_token_summary'. If not successful → null. Updates balance display. Returns result as TokenSummary.

### getMilestoneList
Maps Object.entries(MILESTONES) → array of {key, ...def, claimed: milestoneClaimed.has(key)}.

### getBalance
Returns lastKnownBalance.

### _initBroadcast
Try/catch. Creates BroadcastChannel('mod-token-balance') → _bc. onmessage: if numeric, calls _updateBalanceDisplay(e.data, false).

### init
Calls _injectCSS, _initBroadcast. Registers onChange callback. Callback on user+profile: update balance from profile, reset dailyLoginClaimed=false, claimDailyLogin(), _loadMilestones(), _rpc('notify_followers_online', {p_user_id}).

---

## Agent 03

### _injectCSS
If `cssInjected` is true, returns immediately. Otherwise sets `cssInjected = true`, creates `<style>` element with keyframe animations (tokenFlyUp, milestoneSlide) and token CSS classes, appends to `document.head`.

### _coinFlyUp
Calls `_injectCSS`. Creates `div.token-fly-coin` with 🪙. If `#token-display` exists: positions at horizontal center and bottom of bounding rect. Else: sets `top = '60px'`. Appends to body. Removes after 1000 ms.

### _tokenToast
Guard: `tokens` falsy or `<= 0` → return. Calls `_injectCSS`, `_coinFlyUp`, `showToast('+${tokens} 🪙 ${label}', 'success')`.

### _milestoneToast
Calls `_injectCSS`. Creates `div.milestone-toast`. Builds rewardText via three sequential if-blocks (not else-if): tokens>0 → "+N 🪙 tokens"; freezes>0 overwrites → "+N ❄️ streak freeze(s)"; both>0 overwrites → "+N 🪙 + N ❄️". Sets innerHTML with escapeHTML(icon), escapeHTML(label), escapeHTML(rewardText). Appends to body. If tokens>0: calls `_coinFlyUp`. Removes after 3600 ms.

### _updateBalanceDisplay
Guard: `newBalance == null` → return. Sets `lastKnownBalance`. Updates all `[data-token-balance]` textContent. Updates `#token-balance` textContent. If broadcast=true and `_bc` non-null: `_bc.postMessage(newBalance)` in try/catch.

### updateBalance
Calls `_updateBalanceDisplay(newBalance)`. Gets profile; if truthy, mutates `profile.token_balance = newBalance`.

### _rpc
Guards: placeholder mode → null; no user → null. Calls `safeRpc(fnName, args)`. Error → warn, null. Exception → warn, null. Success → returns `data as ClaimResult`.

### requireTokens
No profile → true. Gets balance (|| 0). Balance >= amount → true. Else: shows error toast "Need N tokens to [label] (N more to go)", returns false.

### claimMilestone
Guards: Set.has(key) → null; !MILESTONES[key] → null. RPC 'claim_milestone'. Failure + error==='Already claimed' → add to Set; return null. Success: add to Set, update balance, milestone toast, log, return result.

### _loadMilestones
RPC 'get_my_milestones'. Success: reads result.claimed array, adds each to milestoneClaimed Set.

### _checkStreakMilestones
Guard: falsy → return. Three independent checks (>=7, >=30, >=100) each fire-and-forget claimMilestone. All three fire at streak=100.

### claimDailyLogin
Mutex _dailyLoginInFlight. try/finally resets flag. RPC 'claim_daily_login'. null result → null. !success: warn (unless 'Already claimed today'), dailyLoginClaimed=true, return null. Success: dailyLoginClaimed=true, update balance. Label: if freeze_used → freeze msg; else if streak_bonus>0 → streak msg; else 'Daily login'. Token toast, nudge, log, checkStreakMilestones. Return result.

### claimHotTake
Guard: falsy → null. RPC 'claim_action_tokens' hot_take. Balance, toast 'Hot take', first_hot_take milestone, drip day 4.

### claimReaction
Guard: falsy → null. RPC 'claim_action_tokens' reaction. Balance, toast 'Reaction', first_reaction milestone. No drip.

### claimVote
Guard: falsy → null. RPC 'claim_action_tokens' vote. Balance, toast 'Vote', first_vote milestone, drip day 2.

### claimDebate
Guard: falsy → null. RPC 'claim_debate_tokens' (dedicated). Balance. Label: 'Debate complete' → if winner: 'Debate win!' → if upset_bonus>0: 'Upset victory!' (nested in winner). If fate_bonus>0: appends '(+N% Group Fate)'. Toast, first_debate milestone, drip day 5 + day 7 if winner.

### claimAiSparring
Guard: falsy → null. RPC 'claim_action_tokens' ai_sparring. Balance, toast 'AI Sparring', first_ai_sparring milestone.

### claimPrediction
Guard: falsy → null. RPC 'claim_action_tokens' prediction. Balance, toast 'Prediction', first_prediction milestone.

### checkProfileMilestones
Guard: falsy → return. >=3: profile_3_sections + verified_gladiator. >=6: profile_6_sections. >=12: profile_12_sections. If >=3: drip day 6. All fire-and-forget.

### getSummary
RPC 'get_my_token_summary'. !success → null. Updates balance. Returns result as TokenSummary.

### getMilestoneList
Object.entries(MILESTONES) → [{key, ...def, claimed: milestoneClaimed.has(key)}]. Returns array.

### getBalance
Returns lastKnownBalance.

### _initBroadcast
Try/catch. BroadcastChannel('mod-token-balance') → _bc. onmessage: numeric check → _updateBalanceDisplay(e.data, false).

### init
_injectCSS. _initBroadcast. onChange callback: user+profile → update balance, dailyLoginClaimed=false, claimDailyLogin(), _loadMilestones(), _rpc('notify_followers_online').

---

## Agent 04

### _injectCSS
Idempotent: guard on `cssInjected`. Creates `<style>` with animation keyframes and token-related CSS classes, appends to `document.head`.

### _coinFlyUp
Calls `_injectCSS`. Creates `div.token-fly-coin` with '🪙'. Positions at `#token-display` element's horizontal center and bottom if found; else `top: 60px`. Appends to body. Removes after 1000 ms.

### _tokenToast
Guard: falsy/<=0 tokens → return. Calls _injectCSS, _coinFlyUp, showToast success.

### _milestoneToast
_injectCSS. Creates milestone-toast div. rewardText built by three sequential if-statements (not mutually exclusive — last applicable wins): tokens>0, freezes>0, both>0. Sets innerHTML with escapeHTML on icon/label/rewardText. Appends to body. _coinFlyUp if tokens>0. Removes after 3600 ms.

### _updateBalanceDisplay
Guard: null/undefined → return. Sets lastKnownBalance. Updates [data-token-balance] and #token-balance textContent. Broadcasts via _bc if broadcast=true.

### updateBalance
_updateBalanceDisplay(newBalance). Mutates profile.token_balance in-place if profile exists.

### _rpc
Placeholder/no-user guards → null. safeRpc(fnName, args). Error → warn + null. Exception → warn + null. Returns data as ClaimResult.

### requireTokens
No profile → true. balance = profile.token_balance || 0. balance >= amount → true. Else: error toast, return false.

### claimMilestone
Set dedup + MILESTONES[key] check. RPC 'claim_milestone'. Failure + 'Already claimed' → add to Set. Success: add to Set, update balance, toast, log.

### _loadMilestones
RPC 'get_my_milestones'. Reads claimed[], populates milestoneClaimed Set.

### _checkStreakMilestones
Guard: falsy → return. Three independent claimMilestone calls at >=7, >=30, >=100.

### claimDailyLogin
_dailyLoginInFlight mutex. try/finally resets. RPC 'claim_daily_login'. Success: balance, label (freeze_used priority via if/else if, then streak_bonus), toast, nudge, checkStreakMilestones.

### claimHotTake
falsy → null. RPC hot_take. Balance, toast, first_hot_take, drip 4.

### claimReaction
falsy → null. RPC reaction. Balance, toast 'Reaction', first_reaction.

### claimVote
falsy → null. RPC vote. Balance, toast 'Vote', first_vote, drip 2.

### claimDebate
falsy → null. RPC claim_debate_tokens. Balance. Label cascade (Debate complete → Debate win! → Upset victory! → +Fate suffix). Toast, first_debate, drip 5+7.

### claimAiSparring
falsy → null. RPC ai_sparring. Balance, toast 'AI Sparring', first_ai_sparring.

### claimPrediction
falsy → null. RPC prediction. Balance, toast 'Prediction', first_prediction.

### checkProfileMilestones
falsy → return. >=3: profile_3_sections + verified_gladiator. >=6: profile_6_sections. >=12: profile_12_sections. >=3: drip 6.

### getSummary
RPC 'get_my_token_summary'. Updates balance. Returns TokenSummary.

### getMilestoneList
Maps MILESTONES entries to MilestoneListItem[] with claimed booleans.

### getBalance
Returns lastKnownBalance.

### _initBroadcast
BroadcastChannel('mod-token-balance') → _bc. onmessage: numeric → _updateBalanceDisplay(e.data, false). Errors silently caught.

### init
_injectCSS, _initBroadcast, onChange: user+profile → updateBalance, dailyLoginClaimed=false, claimDailyLogin, _loadMilestones, notify_followers_online RPC.

---

## Agent 05

### _injectCSS
Checks `cssInjected`; if true, returns immediately. On first call: sets flag, creates `<style>` with `tokenFlyUp`/`milestoneSlide` keyframes and `.token-fly-coin`, `.token-earn-toast`, `.milestone-toast` class definitions, appends to `document.head`. Runs at most once per page lifetime.

### _coinFlyUp
Calls `_injectCSS`. Creates `div.token-fly-coin` with '🪙'. If `#token-display` found: positions at horizontal center and bottom of bounding rect. Else: `top = '60px'`. Appends to body. `setTimeout(1000)` removes it.

### _tokenToast
Guard: falsy or <=0 tokens → return. Calls `_injectCSS`, `_coinFlyUp`, `showToast('+${tokens} 🪙 ${label}', 'success')`.

### _milestoneToast
_injectCSS. `div.milestone-toast`. rewardText built in three sequential steps: (1) tokens>0; (2) freezes>0 overwrites; (3) both>0 overwrites again. innerHTML set with escapeHTML-escaped icon/label/rewardText. Coin fly if tokens>0. Removes after 3600 ms.

### _updateBalanceDisplay
Guard: `== null` → return. Updates lastKnownBalance, all [data-token-balance], #token-balance. If broadcast=true and _bc: postMessage(newBalance) in try/catch.

### updateBalance
_updateBalanceDisplay(newBalance). Reads getCurrentProfile(); if truthy, mutates profile.token_balance = newBalance.

### _rpc
Guards: placeholder mode → null; no user → null. safeRpc → error: warn+null; exception: warn+null; success: returns data as ClaimResult.

### requireTokens
No profile → true. balance >= amount → true. Else: error toast, return false.

### claimMilestone
Set.has → null. !MILESTONES[key] → null. RPC 'claim_milestone'. Failure: 'Already claimed' → add to Set. Success: add to Set, update balance, toast, log, return result.

### _loadMilestones
RPC 'get_my_milestones'. Success: iterates claimed[], adds to milestoneClaimed Set.

### _checkStreakMilestones
Guard: falsy → return. Three independent fire-and-forget claimMilestone calls at >=7, >=30, >=100.

### claimDailyLogin
_dailyLoginInFlight guard. try/finally resets. RPC 'claim_daily_login'. Success: update balance, label (freeze_used → freeze msg; else if streak_bonus>0 → streak msg; else 'Daily login'), token toast, nudge, checkStreakMilestones. Returns result.

### claimHotTake
Guard: falsy → null. RPC claim_action_tokens hot_take. Balance, toast 'Hot take', first_hot_take, drip 4.

### claimReaction
Guard: falsy → null. RPC reaction. Balance, toast 'Reaction', first_reaction. No drip.

### claimVote
Guard: falsy → null. RPC vote. Balance, toast 'Vote', first_vote, drip 2.

### claimDebate
Guard: falsy → null. RPC claim_debate_tokens. Balance. Label: 'Debate complete' → 'Debate win!' if winner → 'Upset victory!' if upset_bonus>0 (nested in winner block). If fate_bonus>0: appends Group Fate suffix. Toast, first_debate, drip 5+7 if winner.

### claimAiSparring
Guard: falsy → null. RPC ai_sparring. Balance, toast 'AI Sparring', first_ai_sparring. No drip.

### claimPrediction
Guard: falsy → null. RPC prediction. Balance, toast 'Prediction', first_prediction. No drip.

### checkProfileMilestones
Guard: falsy → return. >=3: profile_3_sections + verified_gladiator (same threshold, separate if blocks). >=6: profile_6_sections. >=12: profile_12_sections. >=3: drip 6. All fire-and-forget.

### getSummary
RPC 'get_my_token_summary'. !success → null. _updateBalanceDisplay(result.token_balance). Returns result as TokenSummary.

### getMilestoneList
Object.entries(MILESTONES) → MilestoneListItem[] with claimed booleans from milestoneClaimed. Pure read.

### getBalance
Returns lastKnownBalance (number | null).

### _initBroadcast
try/catch. BroadcastChannel('mod-token-balance') → _bc. onmessage: typeof e.data === 'number' → _updateBalanceDisplay(e.data, false) (no echo loop).

### init
_injectCSS. _initBroadcast. onChange: user+profile → update balance from profile, dailyLoginClaimed=false, claimDailyLogin() (not awaited), _loadMilestones() (not awaited), _rpc('notify_followers_online') void. Auto-init at module load via DOMContentLoaded/immediate-call block.
