# Stage 2 Outputs — src/tokens.ts

## Agent 01

### _injectCSS

`_injectCSS` reads the module-level boolean `cssInjected` and returns immediately if it is `true`. Otherwise it sets `cssInjected` to `true`, creates a `<style>` element via `document.createElement('style')`, assigns a multiline string literal to `style.textContent` containing two `@keyframes` declarations (`tokenFlyUp` and `milestoneSlide`) and four CSS class rules (`.token-fly-coin`, `.token-earn-toast`, `.milestone-toast`, and the three `.milestone-toast` sub-selectors), then appends the element to `document.head`. It takes no parameters, returns `void`, and is synchronous. It does not call any other function on the anchor list.

### _coinFlyUp

`_coinFlyUp` first calls `_injectCSS` to guarantee the animation keyframes are present. It then creates a `<div>` element via `document.createElement('div')`, sets its `className` to `'token-fly-coin'` and its `textContent` to the coin emoji `'🪙'`. It reads the DOM for an element with id `token-display` via `document.getElementById`. If that element exists, it calls `getBoundingClientRect()` on it and sets the coin's `style.left` to the horizontal center of that element (left + width / 2, in pixels) and `style.top` to the element's bottom edge. If no `token-display` element exists, it falls back to setting `style.top` to `'60px'`. It appends the coin element to `document.body`, then schedules removal of the element after 1000 ms via `setTimeout`. It returns `void` and is synchronous.

### _tokenToast

`_tokenToast` receives a numeric `tokens` parameter and a string `label`. If `tokens` is falsy or less than or equal to zero, it returns immediately without doing anything. Otherwise it calls `_injectCSS`, then calls `_coinFlyUp` to trigger the coin animation, then constructs the string `` `+${tokens} 🪙 ${label}` `` and passes it to `showToast` (imported from `config.ts`) with the severity string `'success'`. It is synchronous and returns `void`.

### _milestoneToast

`_milestoneToast` receives `icon` (string), `label` (string), `tokens` (number), and `freezes` (number). It calls `_injectCSS`, then creates a `<div>` element with `className` `'milestone-toast'`. It builds `rewardText` through three successive assignments: first it is set to a token string if `tokens > 0`, then overwritten with a freeze string if `freezes > 0`, then overwritten with a combined string if both `tokens > 0` and `freezes > 0`. Both `tokens` and `freezes` are cast with `Number()` before insertion into `rewardText`. It then sets `el.innerHTML` to a template literal containing four sub-elements, passing `icon || '🏆'`, `label`, and `rewardText` through `escapeHTML` (imported from `config.ts`). It appends the element to `document.body`. If `tokens > 0`, it calls `_coinFlyUp`. It schedules removal of the element after 3600 ms via `setTimeout`. It is synchronous and returns `void`.

### _updateBalanceDisplay

`_updateBalanceDisplay` takes a `newBalance` parameter (number, null, or undefined) and an optional `broadcast` boolean that defaults to `true`. If `newBalance` is `null` or `undefined`, it returns immediately. Otherwise it writes `newBalance` to the module-level variable `lastKnownBalance`. It then calls `document.querySelectorAll('[data-token-balance]')` and sets `textContent` to `newBalance.toLocaleString()` on every matching element. It also calls `document.getElementById('token-balance')` and, if that element exists, sets its `textContent` to the same localized string. If `broadcast` is `true` and the module-level `_bc` (a `BroadcastChannel` or `null`) is non-null, it attempts `_bc.postMessage(newBalance)` inside a `try/catch` that silently ignores any error. It is synchronous and returns `void`.

### updateBalance

`updateBalance` takes a single `newBalance` number. It calls `_updateBalanceDisplay(newBalance)`, which updates `lastKnownBalance` and all DOM balance elements and broadcasts to other tabs. It then calls `getCurrentProfile()` (imported from `auth.ts`) to read the current in-memory profile object. If a profile is returned, it mutates it directly by writing `newBalance` to its `token_balance` property via a cast to `Record<string, unknown>`. It is synchronous and returns `void`.

### _rpc

`_rpc` is async. It takes a `fnName` string and an optional `args` object (defaulting to `{}`). It reads `getIsPlaceholderMode()` (imported from `auth.ts`) and returns `null` immediately if placeholder mode is active. It reads `getCurrentUser()` (imported from `auth.ts`) and returns `null` immediately if no user is present. Inside a `try/catch`, it `await`s `safeRpc(fnName, args)` (imported from `auth.ts`), which returns an object with `data` and `error` fields. If `error` is truthy, it logs a warning via `console.warn` with the error's `message` property (or the error itself) and returns `null`. If no error, it returns `data` cast to `ClaimResult`. The `catch` block logs a warning with the exception and returns `null`. The return type is `Promise<ClaimResult | null>`.

### requireTokens

`requireTokens` takes a required `amount` number and an optional `actionLabel` string. It calls `getCurrentProfile()` to read the current profile. If no profile is returned, it returns `true` without checking balances. Otherwise it reads `profile.token_balance`, defaulting to `0` if absent. If `balance >= amount`, it returns `true`. If the balance is insufficient, it computes `deficit = amount - balance`, constructs a message string using `actionLabel ?? 'do that'`, passes it to `showToast` with severity `'error'`, and returns `false`. It is synchronous.

### claimMilestone

`claimMilestone` is async and takes a `MilestoneKey`. It reads the module-level `milestoneClaimed` Set and returns `null` immediately if the key is already present. It reads the `MILESTONES` record for the key's definition and returns `null` if none is found. It then `await`s `_rpc('claim_milestone', { p_milestone_key: key })`. If the result is falsy or `result.success` is false, it checks whether `result.error === 'Already claimed'` and if so adds the key to `milestoneClaimed`, then returns `null`. On success it adds the key to `milestoneClaimed`, calls `_updateBalanceDisplay(result.new_balance)` if `result.new_balance` is non-null, calls `_milestoneToast` with `def.icon`, `def.label`, `result.tokens_earned ?? 0`, and `result.freezes_earned ?? 0`, logs to `console.log`, and returns `result`.

### _loadMilestones

`_loadMilestones` is async and takes no parameters. It `await`s `_rpc('get_my_milestones')`. If the result is falsy or `result.success` is false, it returns immediately. Otherwise it reads the `claimed` property of the result (cast to an object with an optional `string[]` field). If `claimed` exists and is an array, it iterates it with `forEach` and adds each string to the module-level `milestoneClaimed` Set. It returns `void`.

### _checkStreakMilestones

`_checkStreakMilestones` takes a `streak` number. If `streak` is falsy (zero or null-like), it returns immediately. Otherwise it fires up to three fire-and-forget calls: `void claimMilestone('streak_7')` if `streak >= 7`, `void claimMilestone('streak_30')` if `streak >= 30`, and `void claimMilestone('streak_100')` if `streak >= 100`. All three checks are independent — a streak of 100 triggers all three branches. It is synchronous and returns `void`.

### claimDailyLogin

`claimDailyLogin` is async. It reads module-level `_dailyLoginInFlight` and returns `null` immediately if it is `true`. Otherwise it sets `_dailyLoginInFlight` to `true` and enters a `try/finally` block that resets `_dailyLoginInFlight` to `false` on exit regardless of outcome. Inside the `try`, it `await`s `_rpc('claim_daily_login')`. If the result is null, it returns `null`. If `result.success` is false, it sets `dailyLoginClaimed` to `true`, logs a warning via `console.warn` unless the error is `'Already claimed today'`, and returns `null`. On success, it sets `dailyLoginClaimed` to `true`, calls `_updateBalanceDisplay(result.new_balance)`, then builds a `label` string: if `result.freeze_used` is truthy the label includes a freeze-saved message; else if `result.streak_bonus` is greater than zero the label includes the streak count. It calls `_tokenToast(result.tokens_earned ?? 0, label)`, calls `nudge('return_visit', '🔥 Welcome back. The arena missed you.')` (imported from `nudge.ts`), logs via `console.log`, calls `_checkStreakMilestones(result.login_streak ?? 0)`, and returns `result`.

### claimHotTake

`claimHotTake` is async and takes a `hotTakeId` string. It returns `null` immediately if `hotTakeId` is falsy. It `await`s `_rpc('claim_action_tokens', { p_action: 'hot_take', p_reference_id: hotTakeId })`. If the result is falsy or `result.success` is false, it returns `null`. Otherwise it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Hot take')`, fires `void claimMilestone('first_hot_take')` as fire-and-forget, then initiates a dynamic `import('./onboarding-drip.ts')` — if the import resolves, it calls `triggerDripDay(4)`; if the import rejects, the `.catch(() => {})` silently discards the error. The dynamic import is fire-and-forget (not awaited). Returns `result`.

### claimReaction

`claimReaction` is async and takes a `hotTakeId` string. It returns `null` immediately if `hotTakeId` is falsy. It `await`s `_rpc('claim_action_tokens', { p_action: 'reaction', p_reference_id: hotTakeId })`. If the result is falsy or `result.success` is false, it returns `null`. Otherwise it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Reaction')`, and fires `void claimMilestone('first_reaction')` as fire-and-forget. There is no dynamic import. Returns `result`.

### claimVote

`claimVote` is async and takes a `debateId` string. It returns `null` immediately if `debateId` is falsy. It `await`s `_rpc('claim_action_tokens', { p_action: 'vote', p_reference_id: debateId })`. If the result is falsy or `result.success` is false, it returns `null`. Otherwise it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Vote')`, fires `void claimMilestone('first_vote')` as fire-and-forget, then initiates a dynamic import of `'./onboarding-drip.ts'` calling `triggerDripDay(2)` on success, with a silent `.catch`. The dynamic import is fire-and-forget. Returns `result`.

### claimDebate

`claimDebate` is async and takes a `debateId` string. It returns `null` immediately if `debateId` is falsy. It `await`s `_rpc('claim_debate_tokens', { p_debate_id: debateId })` — note this is a different RPC from the other claim functions. If the result is falsy or `result.success` is false, it returns `null`. Otherwise it calls `_updateBalanceDisplay(result.new_balance)`, then builds a `label` string: it starts as `'Debate complete'`, becomes `'Debate win!'` if `result.is_winner` is truthy, and becomes `'Upset victory!'` if both `result.is_winner` and `result.upset_bonus > 0`. If `result.fate_bonus > 0`, it appends `` ` (+${result.fate_pct}% Group Fate)` `` to whatever label was set. It calls `_tokenToast(result.tokens_earned ?? 0, label)`, fires `void claimMilestone('first_debate')` as fire-and-forget, then initiates a dynamic import of `'./onboarding-drip.ts'`: on resolve it calls `triggerDripDay(5)` unconditionally and `triggerDripDay(7)` only if `result.is_winner` is truthy. Both drip calls inside the import callback are themselves fire-and-forget (`void`). The dynamic import has a silent `.catch`. Returns `result`.

### claimAiSparring

`claimAiSparring` is async and takes a `debateId` string. It returns `null` immediately if `debateId` is falsy. It `await`s `_rpc('claim_action_tokens', { p_action: 'ai_sparring', p_reference_id: debateId })`. If the result is falsy or `result.success` is false, it returns `null`. Otherwise it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'AI Sparring')`, and fires `void claimMilestone('first_ai_sparring')` as fire-and-forget. There is no dynamic import. Returns `result`.

### claimPrediction

`claimPrediction` is async and takes a `debateId` string. It returns `null` immediately if `debateId` is falsy. It `await`s `_rpc('claim_action_tokens', { p_action: 'prediction', p_reference_id: debateId })`. If the result is falsy or `result.success` is false, it returns `null`. Otherwise it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Prediction')`, and fires `void claimMilestone('first_prediction')` as fire-and-forget. There is no dynamic import. Returns `result`.

### checkProfileMilestones

`checkProfileMilestones` is async and takes a `completedCount` number. If `completedCount` is falsy, it returns immediately. Otherwise it issues fire-and-forget `void claimMilestone(...)` calls for each threshold met: `'profile_3_sections'` if `completedCount >= 3`, `'profile_6_sections'` if `completedCount >= 6`, `'profile_12_sections'` if `completedCount >= 12`, and `'verified_gladiator'` if `completedCount >= 3`. All four checks are independent conditionals, not else-if. If `completedCount >= 3`, it also initiates a dynamic import of `'./onboarding-drip.ts'` calling `triggerDripDay(6)` on resolve, with a silent `.catch`. The dynamic import is fire-and-forget. The function itself returns `Promise<void>` but contains no top-level `await` — the async keyword is present but no expression in the function body is awaited directly.

### getSummary

`getSummary` is async. It takes no parameters. It `await`s `_rpc('get_my_token_summary')`. If the result is falsy or `result.success` is false, it returns `null`. Otherwise it calls `_updateBalanceDisplay` with `(result as unknown as TokenSummary).token_balance` — the cast is necessary because the `ClaimResult` type does not include `token_balance` directly. It then returns `result` cast to `TokenSummary`. The function does not call any toast or milestone functions.

### getMilestoneList

`getMilestoneList` is synchronous and takes no parameters. It calls `Object.entries(MILESTONES)` to iterate the static `MILESTONES` record in declaration order, mapping each `[key, def]` pair to an object that spreads all properties from `def` and adds `key` (the milestone key string) and `claimed` (a boolean derived from `milestoneClaimed.has(key)`). It returns the resulting `MilestoneListItem[]` array. It reads module-level `milestoneClaimed` but does not write to it or any other state.

### getBalance

`getBalance` is synchronous and takes no parameters. It returns the module-level variable `lastKnownBalance`, which is either a `number` set by the most recent call to `_updateBalanceDisplay`, or `null` if `_updateBalanceDisplay` has never been called with a non-null value.

### _initBroadcast

`_initBroadcast` is synchronous and takes no parameters. It wraps its entire body in a `try/catch` with a silent empty catch block, providing a fallback for environments where `BroadcastChannel` is not supported. Inside the `try`, it constructs a `new BroadcastChannel('mod-token-balance')` and assigns it to the module-level `_bc`. It then sets `_bc.onmessage` to a handler that reads `e.data`: if `e.data` is of type `'number'`, it calls `_updateBalanceDisplay(e.data, false)`, passing `false` for the `broadcast` parameter to suppress re-broadcasting the received value back to other tabs. If the constructor throws, `_bc` remains `null`.

### init

`init` is synchronous and returns `void`. It calls `_injectCSS` to inject animation styles, then calls `_initBroadcast` to open the cross-tab `BroadcastChannel`. It then calls `onChange` (imported from `auth.ts`), passing a callback that receives `user` and `profile` parameters. The callback fires whenever auth state changes. Inside the callback, if both `user` and `profile` are truthy: if `profile.token_balance` is non-null it calls `_updateBalanceDisplay(profile.token_balance)` to sync the display; it sets `dailyLoginClaimed` to `false`; it calls `claimDailyLogin()` as fire-and-forget (no `void` keyword but no `await`); it calls `_loadMilestones()` as fire-and-forget; and it fires `void _rpc('notify_followers_online', { p_user_id: user.id })` as an explicit fire-and-forget. The module-level auto-init block (lines 506–510) calls `init()` either on `DOMContentLoaded` if the document is still loading, or immediately if the document is already loaded.

## Agent 02

### _injectCSS

`_injectCSS` reads the module-level boolean `cssInjected`. If `cssInjected` is `true`, it returns immediately without doing anything. Otherwise, it sets `cssInjected` to `true`, creates a `<style>` element via `document.createElement`, assigns a multi-rule CSS string to `style.textContent`, and appends that element to `document.head`. The CSS string defines two keyframe animations (`tokenFlyUp` and `milestoneSlide`) and three class rules (`.token-fly-coin`, `.token-earn-toast`, `.milestone-toast` with its child selectors). The function is synchronous and returns nothing. It has no parameters.

### _coinFlyUp

`_coinFlyUp` is synchronous and takes no parameters. It calls `_injectCSS` first. It then creates a `<div>` element, sets its `className` to `'token-fly-coin'` and its `textContent` to the coin emoji `'🪙'`. It reads the DOM for an element with id `'token-display'`. If that element exists, it reads its `getBoundingClientRect()` and sets the coin's `style.left` to the horizontal center of that element and `style.top` to its bottom edge. If the element does not exist, it sets `style.top` to `'60px'` and leaves `style.left` unset (falling back to the CSS `left:50%` on the class). It appends the coin to `document.body`, then schedules `coin.remove()` via `setTimeout` with a 1000 ms delay. It returns nothing.

### _tokenToast

`_tokenToast` takes a `tokens` number and a `label` string. If `tokens` is falsy or `<= 0`, it returns immediately without doing anything. Otherwise it calls `_injectCSS`, then calls `_coinFlyUp` to trigger the coin animation, then calls `showToast` (imported from `config.ts`) with the string `+${tokens} 🪙 ${label}` and the level `'success'`. It is synchronous and returns nothing.

### _milestoneToast

`_milestoneToast` takes `icon` (string), `label` (string), `tokens` (number), and `freezes` (number). It calls `_injectCSS`, then creates a `<div>` element and sets its `className` to `'milestone-toast'`. It builds a `rewardText` string through three sequential conditionals: first it sets `rewardText` to a tokens string if `tokens > 0`, then overwrites it with a freezes string if `freezes > 0`, then overwrites it with a combined string if both are greater than zero. Both `tokens` and `freezes` values are cast with `Number()` before being written into `rewardText`. It sets `el.innerHTML` to a template that runs `escapeHTML` (imported from `config.ts`) on `icon` (defaulting to `'🏆'` if falsy), `label`, and `rewardText`. It appends the element to `document.body`. If `tokens > 0`, it calls `_coinFlyUp`. It schedules `el.remove()` via `setTimeout` with a 3600 ms delay. It is synchronous and returns nothing.

### _updateBalanceDisplay

`_updateBalanceDisplay` takes a `newBalance` parameter typed as `number | null | undefined` and an optional `broadcast` boolean that defaults to `true`. If `newBalance` is `null` or `undefined`, it returns immediately. Otherwise it writes `newBalance` to the module-level variable `lastKnownBalance`. It then calls `document.querySelectorAll('[data-token-balance]')` and sets the `textContent` of every matching element to `newBalance.toLocaleString()`. It also reads `document.getElementById('token-balance')` and, if found, sets that element's `textContent` to the same localized string. If `broadcast` is `true` and the module-level `_bc` is not `null`, it calls `_bc.postMessage(newBalance)` inside a try/catch that silently swallows any thrown error. It returns nothing.

### updateBalance

`updateBalance` takes a `newBalance` number. It calls `_updateBalanceDisplay(newBalance)`, which updates `lastKnownBalance`, all `[data-token-balance]` DOM elements, the `#token-balance` element, and broadcasts to other tabs. It then calls `getCurrentProfile()` (imported from `auth.ts`) and, if the returned profile object is not null, writes `newBalance` into the profile object's `token_balance` property by casting the profile to `Record<string, unknown>` first. It is synchronous and returns nothing.

### _rpc

`_rpc` is async and takes a `fnName` string and an optional `args` object (defaulting to `{}`). It reads `getIsPlaceholderMode()` (imported from `auth.ts`); if that returns truthy, it returns `null` immediately. It reads `getCurrentUser()` (imported from `auth.ts`); if that returns falsy, it returns `null` immediately. Inside a try/catch, it awaits `safeRpc(fnName, args)` (imported from `auth.ts`), which returns `{ data, error }`. If `error` is set, it logs a warning to `console.warn` with the error's `message` property (or the error itself if no message), then returns `null`. If no error, it returns `data` cast to `ClaimResult`. The catch block logs a warning with the caught exception and returns `null`.

### requireTokens

`requireTokens` takes an `amount` number and an optional `actionLabel` string. It calls `getCurrentProfile()`. If the result is null or undefined, it returns `true` immediately (permissive when no profile is loaded). Otherwise it reads `profile.token_balance`, defaulting to `0` if falsy. If `balance >= amount`, it returns `true`. If the balance is insufficient, it computes `deficit = amount - balance`, builds an error message string using `actionLabel` (or the fallback `'do that'`), calls `showToast` with that message at level `'error'`, and returns `false`. It is synchronous.

### claimMilestone

`claimMilestone` is async and takes a `key` of type `MilestoneKey`. It checks whether `key` is in the module-level `milestoneClaimed` Set; if so, returns `null` immediately. It looks up `MILESTONES[key]`; if not found, returns `null`. It then awaits `_rpc('claim_milestone', { p_milestone_key: key })`. If the result is null or its `success` property is falsy, it checks whether `result?.error === 'Already claimed'`: if so, it adds `key` to `milestoneClaimed`. Either way, it returns `null`. On a successful result, it adds `key` to `milestoneClaimed`, conditionally calls `_updateBalanceDisplay(result.new_balance)` if that value is not null, calls `_milestoneToast` with the definition's icon and label and the result's `tokens_earned` and `freezes_earned` (both defaulting to `0`), logs a message to `console.log`, and returns the result.

### _loadMilestones

`_loadMilestones` is async and takes no parameters. It awaits `_rpc('get_my_milestones')`. If the result is null or `success` is falsy, it returns without doing anything. Otherwise it reads the `claimed` property from the result, cast to `{ claimed?: string[] }`. If `claimed` is a non-null array, it iterates the array and adds each string element to the module-level `milestoneClaimed` Set. It returns nothing.

### _checkStreakMilestones

`_checkStreakMilestones` takes a `streak` number. If `streak` is falsy (zero, null, or undefined), it returns immediately. Otherwise it issues up to three fire-and-forget calls to `claimMilestone`: if `streak >= 7` it calls `claimMilestone('streak_7')`; if `streak >= 30` it calls `claimMilestone('streak_30')`; if `streak >= 100` it calls `claimMilestone('streak_100')`. Each call is preceded by `void`, discarding the returned promise. All three checks run regardless of each other (no early exit between them). It is synchronous and returns nothing.

### claimDailyLogin

`claimDailyLogin` is async and takes no parameters. If the module-level `_dailyLoginInFlight` is `true`, it returns `null` immediately. Otherwise it sets `_dailyLoginInFlight` to `true`, then executes the remainder inside a try/finally block that always resets `_dailyLoginInFlight` to `false` on exit. It awaits `_rpc('claim_daily_login')`. If the result is null, it returns `null`. If `result.success` is falsy, it checks whether `result.error` is not `'Already claimed today'` and logs a warning if so; in all failure cases, it sets `dailyLoginClaimed` to `true` and returns `null`. On success, it sets `dailyLoginClaimed` to `true`, calls `_updateBalanceDisplay(result.new_balance)`, then constructs a label string: if `result.freeze_used` is truthy, the label includes a freeze message; else if `result.streak_bonus` is greater than `0`, the label includes the streak count from `result.login_streak`; otherwise the label is `'Daily login'`. It calls `_tokenToast` with `result.tokens_earned` (defaulting to `0`) and the label, calls `nudge('return_visit', '...')` (imported from `nudge.ts`), logs to `console.log`, calls `_checkStreakMilestones(result.login_streak ?? 0)`, and returns the result.

### claimHotTake

`claimHotTake` is async and takes a `hotTakeId` string. If `hotTakeId` is falsy, it returns `null` immediately. It awaits `_rpc('claim_action_tokens', { p_action: 'hot_take', p_reference_id: hotTakeId })`. If the result is null or `success` is falsy, it returns `null`. On success, it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Hot take')`, and calls `claimMilestone('first_hot_take')` as fire-and-forget (`void`). It then dynamically imports `'./onboarding-drip.ts'` and calls `triggerDripDay(4)` in the `.then` callback; the `.catch` swallows any import or call error. It returns the result.

### claimReaction

`claimReaction` is async and takes a `hotTakeId` string. If `hotTakeId` is falsy, it returns `null`. It awaits `_rpc('claim_action_tokens', { p_action: 'reaction', p_reference_id: hotTakeId })`. If the result is null or `success` is falsy, it returns `null`. On success, it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Reaction')`, and calls `claimMilestone('first_reaction')` as fire-and-forget. It returns the result. Unlike `claimHotTake`, `claimVote`, and `claimDebate`, it does not trigger an onboarding drip.

### claimVote

`claimVote` is async and takes a `debateId` string. If `debateId` is falsy, it returns `null`. It awaits `_rpc('claim_action_tokens', { p_action: 'vote', p_reference_id: debateId })`. If the result is null or `success` is falsy, it returns `null`. On success, it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Vote')`, and calls `claimMilestone('first_vote')` as fire-and-forget. It then dynamically imports `'./onboarding-drip.ts'` and calls `triggerDripDay(2)` in the `.then` callback; the `.catch` swallows errors. It returns the result.

### claimDebate

`claimDebate` is async and takes a `debateId` string. If `debateId` is falsy, it returns `null`. It awaits `_rpc('claim_debate_tokens', { p_debate_id: debateId })` — a different RPC name than the other claim functions. If the result is null or `success` is falsy, it returns `null`. On success, it calls `_updateBalanceDisplay(result.new_balance)`, then builds a label through nested conditionals: the base label is `'Debate complete'`; if `result.is_winner` is truthy it becomes `'Debate win!'`; if `result.upset_bonus` is also greater than `0` it becomes `'Upset victory!'`; if `result.fate_bonus` is greater than `0`, the current label gets `+(${result.fate_pct}% Group Fate)` appended regardless of whether the user won. It calls `_tokenToast(result.tokens_earned ?? 0, label)` and calls `claimMilestone('first_debate')` as fire-and-forget. It then dynamically imports `'./onboarding-drip.ts'` and in the `.then` calls `triggerDripDay(5)` unconditionally, plus `triggerDripDay(7)` if `result.is_winner`; the `.catch` swallows errors. It returns the result.

### claimAiSparring

`claimAiSparring` is async and takes a `debateId` string. If `debateId` is falsy, it returns `null`. It awaits `_rpc('claim_action_tokens', { p_action: 'ai_sparring', p_reference_id: debateId })`. If the result is null or `success` is falsy, it returns `null`. On success, it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'AI Sparring')`, and calls `claimMilestone('first_ai_sparring')` as fire-and-forget. It returns the result. It does not trigger an onboarding drip.

### claimPrediction

`claimPrediction` is async and takes a `debateId` string. If `debateId` is falsy, it returns `null`. It awaits `_rpc('claim_action_tokens', { p_action: 'prediction', p_reference_id: debateId })`. If the result is null or `success` is falsy, it returns `null`. On success, it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Prediction')`, and calls `claimMilestone('first_prediction')` as fire-and-forget. It returns the result. It does not trigger an onboarding drip.

### checkProfileMilestones

`checkProfileMilestones` is async and takes a `completedCount` number. If `completedCount` is falsy (zero, null, or undefined), it returns immediately. Otherwise it issues up to four fire-and-forget `claimMilestone` calls based on threshold comparisons: `claimMilestone('profile_3_sections')` if `completedCount >= 3`, `claimMilestone('profile_6_sections')` if `completedCount >= 6`, `claimMilestone('profile_12_sections')` if `completedCount >= 12`, and `claimMilestone('verified_gladiator')` if `completedCount >= 3`. All four checks run unconditionally relative to each other. If `completedCount >= 3`, it also dynamically imports `'./onboarding-drip.ts'` and calls `triggerDripDay(6)` in the `.then` callback, with `.catch` swallowing errors. The function's async declaration is present but there are no awaited calls inside it; all calls are fire-and-forget or synchronous. It returns nothing (`void`).

### getSummary

`getSummary` is async and takes no parameters. It awaits `_rpc('get_my_token_summary')`. If the result is null or `success` is falsy, it returns `null`. On success, it calls `_updateBalanceDisplay` with the result's `token_balance` property (cast to `TokenSummary` to read it), then returns the result cast to `TokenSummary`. The `token_balance` value passed to `_updateBalanceDisplay` will be whatever the RPC returned under that key; if it is absent, `undefined` is passed and `_updateBalanceDisplay` will return early without updating anything.

### getMilestoneList

`getMilestoneList` is synchronous and takes no parameters. It calls `Object.entries(MILESTONES)` and maps each `[key, def]` pair to a `MilestoneListItem` object that spreads all properties from `def`, adds the `key` string, and sets `claimed` to whether `key` is present in the module-level `milestoneClaimed` Set. It returns the resulting array. It reads no external state beyond `MILESTONES` and `milestoneClaimed`.

### getBalance

`getBalance` is synchronous and takes no parameters. It reads and returns the module-level variable `lastKnownBalance`, typed as `number | null`. It does not call any other functions and writes nothing.

### _initBroadcast

`_initBroadcast` is synchronous and takes no parameters. It operates entirely inside a try/catch that silently swallows any thrown error. Inside the try, it creates a `new BroadcastChannel('mod-token-balance')` and assigns it to the module-level variable `_bc`. It then sets `_bc.onmessage` to a handler that checks if `e.data` is a number, and if so calls `_updateBalanceDisplay(e.data, false)` — passing `false` for the `broadcast` argument to avoid re-broadcasting a received message back to other tabs. If `BroadcastChannel` is not supported or construction throws, the catch block runs and `_bc` remains `null`. It returns nothing.

### init

`init` is synchronous and takes no parameters. It calls `_injectCSS` to inject styles, then calls `_initBroadcast` to open the cross-tab channel. It then calls `onChange` (imported from `auth.ts`) with a callback that receives `(user, profile)`. Inside that callback, if both `user` and `profile` are truthy, it conditionally calls `_updateBalanceDisplay(profile.token_balance)` if `profile.token_balance` is not null, sets `dailyLoginClaimed` to `false`, calls `claimDailyLogin()` without awaiting it (fire-and-forget), calls `_loadMilestones()` without awaiting it (fire-and-forget), and calls `_rpc('notify_followers_online', { p_user_id: user.id })` with `void` (fire-and-forget). The `onChange` call registers this callback to run on future auth state changes; the exact invocation timing depends on the `auth.ts` implementation of `onChange`. `init` itself returns nothing.

## Agent 03

### _injectCSS

`_injectCSS` reads the module-level boolean `cssInjected` and returns immediately if it is `true`. If `cssInjected` is `false`, the function sets it to `true`, creates a `<style>` element via `document.createElement('style')`, assigns a multi-rule CSS string to `style.textContent`, and appends the element to `document.head`. The CSS string defines two keyframe animations (`tokenFlyUp` and `milestoneSlide`) and three class rules (`.token-fly-coin`, `.token-earn-toast`, `.milestone-toast` with its child selectors). The function is synchronous, takes no parameters, and returns nothing.

### _coinFlyUp

`_coinFlyUp` is synchronous and takes no parameters. It first calls `_injectCSS` to guarantee the animation styles are present. It then creates a `<div>` element, assigns the class `token-fly-coin`, and sets its `textContent` to the coin emoji `🪙`. It queries the DOM for an element with the id `token-display` and, if found, reads that element's bounding rectangle via `getBoundingClientRect()` and sets the coin's `style.left` to the horizontal center of that element and `style.top` to the element's bottom edge. If no `token-display` element exists, it sets `style.top` to `'60px'` instead, leaving `style.left` at the value already computed by the CSS class (50%). The coin element is appended to `document.body`. A `setTimeout` of 1000 milliseconds schedules `coin.remove()`, after which the element is discarded. Nothing is returned.

### _tokenToast

`_tokenToast` takes a `tokens` number and a `label` string. It returns immediately without side effects if `tokens` is falsy or not greater than zero. Otherwise, it calls `_injectCSS`, then calls `_coinFlyUp` to trigger the coin animation, constructs the string `+${tokens} 🪙 ${label}`, and passes it to `showToast` from `config.ts` with the severity `'success'`. The function is synchronous and returns nothing.

### _milestoneToast

`_milestoneToast` takes `icon`, `label`, `tokens`, and `freezes` as parameters. It calls `_injectCSS` unconditionally, then creates a `<div>` with class `milestone-toast`. It constructs a `rewardText` string through three sequential conditional assignments: if `tokens > 0`, set a token string; if `freezes > 0`, overwrite with a freeze string; if both are positive, overwrite with a combined string. The `tokens` and `freezes` values are cast through `Number()` before interpolation into `rewardText`. The element's `innerHTML` is set to a template that passes `icon` (defaulting to `'🏆'` if falsy) and `label` through `escapeHTML`, and passes `rewardText` through `escapeHTML` as well. The element is appended to `document.body`. If `tokens > 0`, `_coinFlyUp` is called. A `setTimeout` of 3600 milliseconds schedules `el.remove()`. The function is synchronous and returns nothing.

### _updateBalanceDisplay

`_updateBalanceDisplay` takes `newBalance` (typed as `number | null | undefined`) and an optional `broadcast` boolean that defaults to `true`. If `newBalance` is `null` or `undefined`, the function returns immediately. Otherwise, it writes `newBalance` to the module-level variable `lastKnownBalance`. It then queries all DOM elements with the attribute `data-token-balance` and sets each element's `textContent` to `newBalance.toLocaleString()`. It also queries `document.getElementById('token-balance')` and, if found, sets that element's `textContent` to the same formatted string. If `broadcast` is `true` and the module-level `_bc` (a `BroadcastChannel` or `null`) is non-null, it calls `_bc.postMessage(newBalance)` inside a try/catch that silently ignores any error. The function is synchronous and returns nothing.

### updateBalance

`updateBalance` is a synchronous exported function that takes a `newBalance` number. It calls `_updateBalanceDisplay(newBalance)`, which updates `lastKnownBalance` and all DOM balance elements and broadcasts to other tabs. It then calls `getCurrentProfile()` from `auth.ts` to retrieve the current profile object. If the profile is non-null, it writes `newBalance` directly onto the profile object by casting it to `Record<string, unknown>` and assigning `token_balance`. The function returns nothing.

### _rpc

`_rpc` is an async function that takes a `fnName` string and an optional `args` object defaulting to `{}`. It returns `Promise<ClaimResult | null>`. It first calls `getIsPlaceholderMode()` from `auth.ts` and returns `null` immediately if the app is in placeholder mode. It then calls `getCurrentUser()` from `auth.ts` and returns `null` if no user is present. Inside a try/catch, it awaits `safeRpc(fnName, args)` from `auth.ts`, which returns a `{ data, error }` shape. If `error` is truthy, it logs a warning with `console.warn` including the function name and error message, then returns `null`. If no error, it returns `data` cast to `ClaimResult`. If the await itself throws, the catch block logs a warning and returns `null`.

### requireTokens

`requireTokens` is a synchronous exported function that takes an `amount` number and an optional `actionLabel` string. It calls `getCurrentProfile()` to read the current profile. If no profile exists, it returns `true` immediately (the gate passes). Otherwise, it reads `profile.token_balance`, defaulting to `0` if absent. If the balance is greater than or equal to `amount`, it returns `true`. If the balance is insufficient, it computes the deficit, constructs an error message incorporating `amount`, `actionLabel` (defaulting to `'do that'`), and `deficit`, calls `showToast` with severity `'error'`, and returns `false`.

### claimMilestone

`claimMilestone` is an async exported function that takes a `MilestoneKey`. It returns `null` immediately if `milestoneClaimed` already contains the key. It reads the milestone definition from the `MILESTONES` constant; if the key is not found, it returns `null`. It awaits `_rpc('claim_milestone', { p_milestone_key: key })`. If the result is falsy or `result.success` is false, it checks whether `result?.error` equals `'Already claimed'`; if so, it adds the key to `milestoneClaimed`. Either way on failure it returns `null`. On success, it adds the key to `milestoneClaimed`, calls `_updateBalanceDisplay(result.new_balance)` if `new_balance` is non-null, calls `_milestoneToast` with the definition's icon, label, and the result's `tokens_earned` and `freezes_earned` values (defaulting to `0`), logs to console, and returns the result.

### _loadMilestones

`_loadMilestones` is an async exported function that takes no parameters. It awaits `_rpc('get_my_milestones')`. If the result is falsy or `result.success` is false, it returns immediately. Otherwise, it reads a `claimed` property off the result (cast through `unknown` to access the non-typed field). If `claimed` exists and is an array, it iterates over it with `forEach` and adds each string element to the module-level `milestoneClaimed` Set. Nothing is returned.

### _checkStreakMilestones

`_checkStreakMilestones` is a synchronous function that takes a `streak` number. If `streak` is falsy (zero or falsy coercion), it returns immediately. Otherwise, it calls `claimMilestone('streak_7')` if `streak >= 7`, `claimMilestone('streak_30')` if `streak >= 30`, and `claimMilestone('streak_100')` if `streak >= 100`. All three calls are fire-and-forget via `void`. Multiple milestone claims can be triggered in the same call if the streak value crosses multiple thresholds.

### claimDailyLogin

`claimDailyLogin` is an async exported function with no parameters. It returns `null` immediately if `_dailyLoginInFlight` is `true`. Otherwise it sets `_dailyLoginInFlight` to `true` and enters a try/finally block where `_dailyLoginInFlight` is reset to `false` in the `finally` clause regardless of outcome. Inside the try, it awaits `_rpc('claim_daily_login')`. If the result is null, it returns `null`. If `result.success` is false, it sets `dailyLoginClaimed` to `true` — regardless of the specific error — and, if the error is anything other than `'Already claimed today'`, logs a warning via `console.warn`. It then returns `null`. On success, it sets `dailyLoginClaimed` to `true`, calls `_updateBalanceDisplay(result.new_balance)`, and constructs a `label` string: `'Daily login'` by default, overridden to a freeze-saved message if `result.freeze_used` is truthy, or overridden to a streak message if `result.streak_bonus > 0`. It then calls `_tokenToast` with `result.tokens_earned` and the label, calls `nudge('return_visit', ...)` from `nudge.ts`, logs to console, and calls `_checkStreakMilestones(result.login_streak ?? 0)`. It returns `result`.

### claimHotTake

`claimHotTake` is an async exported function that takes a `hotTakeId` string. It returns `null` immediately if `hotTakeId` is falsy. It awaits `_rpc('claim_action_tokens', { p_action: 'hot_take', p_reference_id: hotTakeId })`. If the result is falsy or `success` is false, it returns `null`. Otherwise, it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Hot take')`, and fires `claimMilestone('first_hot_take')` as a fire-and-forget void call. It then dynamically imports `./onboarding-drip.ts` and calls `triggerDripDay(4)` on the resolved module, with a `.catch(() => {})` to suppress import errors — this is also fire-and-forget. The function returns `result`.

### claimReaction

`claimReaction` is an async exported function that takes a `hotTakeId` string. It returns `null` if `hotTakeId` is falsy. It awaits `_rpc('claim_action_tokens', { p_action: 'reaction', p_reference_id: hotTakeId })`. If `result` is falsy or `success` is false, it returns `null`. Otherwise, it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Reaction')`, fires `claimMilestone('first_reaction')` as a void call, and returns `result`. There is no onboarding-drip call in this function.

### claimVote

`claimVote` is an async exported function that takes a `debateId` string. It returns `null` if `debateId` is falsy. It awaits `_rpc('claim_action_tokens', { p_action: 'vote', p_reference_id: debateId })`. If `result` is falsy or `success` is false, it returns `null`. Otherwise, it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Vote')`, fires `claimMilestone('first_vote')` as a void call, then dynamically imports `./onboarding-drip.ts` and calls `triggerDripDay(2)` fire-and-forget with error suppression. It returns `result`.

### claimDebate

`claimDebate` is an async exported function that takes a `debateId` string. It returns `null` if `debateId` is falsy. It awaits `_rpc('claim_debate_tokens', { p_debate_id: debateId })` — note this is a different RPC name from the other claim functions. If `result` is falsy or `success` is false, it returns `null`. Otherwise, it calls `_updateBalanceDisplay(result.new_balance)` and constructs a `label`: starting at `'Debate complete'`, overridden to `'Debate win!'` if `result.is_winner` is truthy, further overridden to `'Upset victory!'` if `result.upset_bonus > 0`. If `result.fate_bonus > 0`, the label has ` (+${result.fate_pct}% Group Fate)` appended to it. It calls `_tokenToast(result.tokens_earned ?? 0, label)` and fires `claimMilestone('first_debate')` as a void call. It then dynamically imports `./onboarding-drip.ts` and in the resolved callback calls `triggerDripDay(5)` and, if `result.is_winner`, also calls `triggerDripDay(7)`, both via void — all fire-and-forget with error suppression. It returns `result`.

### claimAiSparring

`claimAiSparring` is an async exported function that takes a `debateId` string. It returns `null` if `debateId` is falsy. It awaits `_rpc('claim_action_tokens', { p_action: 'ai_sparring', p_reference_id: debateId })`. If `result` is falsy or `success` is false, it returns `null`. Otherwise, it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'AI Sparring')`, fires `claimMilestone('first_ai_sparring')` as a void call, and returns `result`. There is no onboarding-drip call.

### claimPrediction

`claimPrediction` is an async exported function that takes a `debateId` string. It returns `null` if `debateId` is falsy. It awaits `_rpc('claim_action_tokens', { p_action: 'prediction', p_reference_id: debateId })`. If `result` is falsy or `success` is false, it returns `null`. Otherwise, it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Prediction')`, fires `claimMilestone('first_prediction')` as a void call, and returns `result`. There is no onboarding-drip call.

### checkProfileMilestones

`checkProfileMilestones` is an async exported function (though it contains no awaits itself) that takes a `completedCount` number. If `completedCount` is falsy, it returns immediately. Otherwise, it conditionally fires milestone claims via void: `claimMilestone('profile_3_sections')` if `completedCount >= 3`, `claimMilestone('profile_6_sections')` if `completedCount >= 6`, `claimMilestone('profile_12_sections')` if `completedCount >= 12`, and `claimMilestone('verified_gladiator')` if `completedCount >= 3`. Note that both `profile_3_sections` and `verified_gladiator` share the same threshold of 3. If `completedCount >= 3`, the function also dynamically imports `./onboarding-drip.ts` and calls `triggerDripDay(6)` fire-and-forget with error suppression. The function returns `undefined` (the async wrapper resolves with void).

### getSummary

`getSummary` is an async exported function that takes no parameters. It awaits `_rpc('get_my_token_summary')`. If the result is falsy or `success` is false, it returns `null`. Otherwise, it calls `_updateBalanceDisplay` with the `token_balance` property read off the result (cast through `unknown` to `TokenSummary` to access the field), and returns the result cast to `TokenSummary`.

### getMilestoneList

`getMilestoneList` is a synchronous exported function that takes no parameters. It reads the `MILESTONES` constant and the module-level `milestoneClaimed` Set. It calls `Object.entries(MILESTONES)` to iterate over all milestone definitions and maps each `[key, def]` pair into a `MilestoneListItem` object by spreading `def`, adding the `key` string, and adding a `claimed` boolean derived from `milestoneClaimed.has(key)`. It returns the resulting array. No state is written.

### getBalance

`getBalance` is a synchronous exported function that takes no parameters. It reads the module-level variable `lastKnownBalance` and returns it directly as `number | null`. No state is written and no external APIs are called.

### _initBroadcast

`_initBroadcast` is a synchronous function that takes no parameters. Inside a try/catch block, it constructs a new `BroadcastChannel` with the channel name `'mod-token-balance'` and assigns it to the module-level variable `_bc`. It then sets `_bc.onmessage` to a handler that checks whether the incoming `MessageEvent`'s `data` is of type `'number'`; if so, it calls `_updateBalanceDisplay(e.data, false)` with `broadcast` set to `false` to prevent re-broadcasting the message back out. If `BroadcastChannel` construction throws — for example in an environment that does not support it — the catch block silently discards the error and `_bc` remains `null`. Nothing is returned.

### init

`init` is a synchronous exported function that takes no parameters. It calls `_injectCSS` to inject animation and toast styles, then calls `_initBroadcast` to set up cross-tab balance synchronization. It then calls `onChange` from `auth.ts`, passing a callback that fires whenever the auth state changes. Inside the callback, if both `user` and `profile` are truthy: if `profile.token_balance` is non-null, `_updateBalanceDisplay` is called with that value; `dailyLoginClaimed` is set to `false`; `claimDailyLogin()` is called (not awaited, fire-and-forget); `_loadMilestones()` is called (not awaited, fire-and-forget); and `_rpc('notify_followers_online', { p_user_id: user.id })` is called as a fire-and-forget void expression. If `user` or `profile` is falsy, the callback body is skipped entirely. The module-level code at the bottom of the file (outside `init`) also calls `init` directly: if `document.readyState` is `'loading'`, it registers `init` as a `DOMContentLoaded` listener; otherwise it calls `init()` immediately. This means `init` will be called once at module load time via the auto-init block, and any subsequent call to the exported `init` will repeat all setup — including re-registering the `onChange` callback and calling `_initBroadcast` again.

## Agent 04

### _injectCSS

`_injectCSS` reads the module-level boolean `cssInjected`. If `cssInjected` is already `true`, it returns immediately without doing anything. Otherwise it sets `cssInjected` to `true`, creates a `<style>` element via `document.createElement`, assigns a multi-rule CSS string to `style.textContent`, and appends that element to `document.head`. The CSS string defines two keyframe animations (`tokenFlyUp` and `milestoneSlide`) and three class rules (`.token-fly-coin`, `.token-earn-toast`, `.milestone-toast` with its child selectors). The function is synchronous and returns `void`.

### _coinFlyUp

`_coinFlyUp` calls `_injectCSS` first to guarantee the animation CSS is present. It then creates a `<div>` element, sets its `className` to `'token-fly-coin'`, and sets its `textContent` to the coin emoji `'🪙'`. It queries the DOM for the element with `id="token-display"`. If that element exists, it reads its bounding rectangle via `getBoundingClientRect()` and sets the coin's `style.left` to the horizontal center of that element and `style.top` to the element's bottom edge. If the element does not exist, it sets `style.top` to `'60px'` and does not set `style.left` (the CSS class fixes it at `left:50%` via transform, so the inline left is only an override when the bar is found). The coin div is appended to `document.body`. A `setTimeout` of 1000 ms is scheduled to call `coin.remove()`. The function is synchronous; the removal is fire-and-forget.

### _tokenToast

`_tokenToast` receives a `tokens` number and a `label` string. If `tokens` is falsy or less than or equal to zero it returns immediately. Otherwise it calls `_injectCSS`, then calls `_coinFlyUp` to trigger the coin animation, constructs the string `` `+${tokens} 🪙 ${label}` ``, and passes it along with the string `'success'` to `showToast` (imported from `config.ts`). The function is synchronous and returns `void`.

### _milestoneToast

`_milestoneToast` receives `icon`, `label`, `tokens`, and `freezes`. It calls `_injectCSS`, then creates a `<div>` with `className = 'milestone-toast'`. It builds a `rewardText` string through three sequential assignments: first set to a token string if `tokens > 0`, then overwritten to a freeze string if `freezes > 0`, then overwritten to a combined string if both are greater than zero. Each numeric value in `rewardText` is wrapped with `Number()` before being interpolated. The `innerHTML` of the element is set using a template literal that calls `escapeHTML` (imported from `config.ts`) on `icon` (falling back to `'🏆'` if falsy), `label`, and `rewardText`. The element is appended to `document.body`. If `tokens > 0`, `_coinFlyUp` is called. A `setTimeout` of 3600 ms schedules `el.remove()`. The function is synchronous; the removal is fire-and-forget.

### _updateBalanceDisplay

`_updateBalanceDisplay` accepts a `newBalance` that may be a number, `null`, or `undefined`, and a `broadcast` boolean that defaults to `true`. If `newBalance` is `null` or `undefined` it returns immediately. Otherwise it writes `newBalance` to the module-level variable `lastKnownBalance`. It then queries all DOM elements with the attribute `data-token-balance` and sets each element's `textContent` to `newBalance.toLocaleString()`. It also looks up the element with `id="token-balance"` and, if found, sets its `textContent` the same way. If `broadcast` is `true` and the module-level `_bc` (a `BroadcastChannel`) is non-null, it calls `_bc.postMessage(newBalance)` inside a `try/catch` that silently discards any error. The function is synchronous and returns `void`.

### updateBalance

`updateBalance` is a synchronous exported function that accepts a `newBalance` number. It calls `_updateBalanceDisplay(newBalance)` with the default `broadcast = true`. It then calls `getCurrentProfile()` (imported from `auth.ts`) to retrieve the current profile object. If the profile is non-null, it casts the profile to `Record<string, unknown>` and sets its `token_balance` property to `newBalance`, mutating the in-memory profile object in place. The function returns `void`.

### _rpc

`_rpc` is an `async` function that accepts a `fnName` string and an optional `args` object (defaulting to `{}`). It reads `getIsPlaceholderMode()` from `auth.ts` and returns `null` immediately if placeholder mode is active. It reads `getCurrentUser()` from `auth.ts` and returns `null` immediately if there is no current user. Inside a `try` block it `await`s `safeRpc(fnName, args)` (imported from `auth.ts`), destructuring `{ data, error }` from the result. If `error` is truthy it logs a warning via `console.warn` and returns `null`. Otherwise it returns `data` cast to `ClaimResult`. If the `try` block throws, the `catch` block logs a warning and returns `null`. The function returns `Promise<ClaimResult | null>`.

### requireTokens

`requireTokens` is a synchronous exported function accepting an `amount` number and an optional `actionLabel` string. It calls `getCurrentProfile()`. If the profile is `null` or `undefined` it returns `true` immediately (permissive: no profile means no gate). It reads `profile.token_balance`, defaulting to `0` if absent. If the balance is greater than or equal to `amount` it returns `true`. Otherwise it computes `deficit = amount - balance`, constructs a message string using `actionLabel ?? 'do that'`, calls `showToast` with that message and `'error'`, and returns `false`.

### claimMilestone

`claimMilestone` is an `async` exported function accepting a `MilestoneKey`. It reads the module-level `Set` `milestoneClaimed`; if the key is already in the set it returns `null` immediately. It looks up the key in the `MILESTONES` constant; if no definition is found it returns `null`. It `await`s `_rpc('claim_milestone', { p_milestone_key: key })`. If the result is falsy or `result.success` is false, it checks whether `result?.error` equals `'Already claimed'` — if so, it adds the key to `milestoneClaimed` — and then returns `null` either way. On a successful result it adds the key to `milestoneClaimed`, calls `_updateBalanceDisplay(result.new_balance)` if `result.new_balance` is non-null, calls `_milestoneToast` with the definition's icon and label and `result.tokens_earned ?? 0` and `result.freezes_earned ?? 0`, logs to `console.log`, and returns `result`.

### _loadMilestones

`_loadMilestones` is an `async` exported function with no parameters. It `await`s `_rpc('get_my_milestones')`. If the result is falsy or `result.success` is false it returns without doing anything. Otherwise it reads `result.claimed`, cast through `unknown` to `{ claimed?: string[] }`. If `claimed` is a non-null array it iterates over each element and adds it to the module-level `milestoneClaimed` set. The function returns `void`.

### _checkStreakMilestones

`_checkStreakMilestones` is a synchronous function accepting a `streak` number. If `streak` is falsy (zero or `NaN`) it returns immediately. It then performs three independent threshold checks: if `streak >= 7` it calls `claimMilestone('streak_7')` with `void`; if `streak >= 30` it calls `claimMilestone('streak_30')` with `void`; if `streak >= 100` it calls `claimMilestone('streak_100')` with `void`. All three calls are fire-and-forget. The function is synchronous and returns `void`; the milestone claims proceed asynchronously.

### claimDailyLogin

`claimDailyLogin` is an `async` exported function with no parameters. It reads the module-level boolean `_dailyLoginInFlight`; if it is `true` it returns `null` immediately, preventing concurrent calls. It sets `_dailyLoginInFlight` to `true`, then enters a `try` block with a `finally` that always resets `_dailyLoginInFlight` to `false`. Inside the `try`, it `await`s `_rpc('claim_daily_login')`. If the result is null it returns `null`. If `result.success` is false, it sets `dailyLoginClaimed` to `true`, logs a warning unless the error is `'Already claimed today'`, and returns `null`. On a successful result it sets `dailyLoginClaimed` to `true`, calls `_updateBalanceDisplay(result.new_balance)`, then builds a `label` string: default `'Daily login'`, overwritten to a freeze-saved message if `result.freeze_used` is truthy, otherwise overwritten to a streak-count message if `result.streak_bonus` is greater than zero. It calls `_tokenToast(result.tokens_earned ?? 0, label)`, calls `nudge('return_visit', '🔥 Welcome back. The arena missed you.')` (imported from `nudge.ts`), logs to `console.log`, and calls `_checkStreakMilestones(result.login_streak ?? 0)`. It returns `result`.

### claimHotTake

`claimHotTake` is an `async` exported function accepting a `hotTakeId` string. If `hotTakeId` is falsy it returns `null` immediately. It `await`s `_rpc('claim_action_tokens', { p_action: 'hot_take', p_reference_id: hotTakeId })`. If the result is falsy or `result.success` is false it returns `null`. Otherwise it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Hot take')`, and calls `claimMilestone('first_hot_take')` with `void` (fire-and-forget). It then dynamically imports `'./onboarding-drip.ts'` and calls `triggerDripDay(4)` from it, with a `.catch(() => {})` to silence import or call errors. The import and drip call are fire-and-forget. It returns `result`.

### claimReaction

`claimReaction` is an `async` exported function accepting a `hotTakeId` string. If `hotTakeId` is falsy it returns `null` immediately. It `await`s `_rpc('claim_action_tokens', { p_action: 'reaction', p_reference_id: hotTakeId })`. If the result is falsy or `result.success` is false it returns `null`. Otherwise it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Reaction')`, and calls `claimMilestone('first_reaction')` with `void` (fire-and-forget). It returns `result`. Unlike `claimHotTake` and `claimVote`, it does not trigger an onboarding drip.

### claimVote

`claimVote` is an `async` exported function accepting a `debateId` string. If `debateId` is falsy it returns `null` immediately. It `await`s `_rpc('claim_action_tokens', { p_action: 'vote', p_reference_id: debateId })`. If the result is falsy or `result.success` is false it returns `null`. Otherwise it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Vote')`, and calls `claimMilestone('first_vote')` with `void` (fire-and-forget). It then dynamically imports `'./onboarding-drip.ts'` and calls `triggerDripDay(2)` fire-and-forget, with a `.catch(() => {})`. It returns `result`.

### claimDebate

`claimDebate` is an `async` exported function accepting a `debateId` string. If `debateId` is falsy it returns `null` immediately. It `await`s `_rpc('claim_debate_tokens', { p_debate_id: debateId })` — note this uses a distinct RPC name rather than the generic `claim_action_tokens`. If the result is falsy or `result.success` is false it returns `null`. Otherwise it calls `_updateBalanceDisplay(result.new_balance)`. It then builds a `label` string with three sequential overwrites: default `'Debate complete'`; if `result.is_winner` is truthy, `'Debate win!'`; if additionally `result.upset_bonus` is greater than zero, `'Upset victory!'`; if `result.fate_bonus` is greater than zero (checked independently, not inside the winner block), it appends a fate percentage suffix to whatever `label` currently holds. It calls `_tokenToast(result.tokens_earned ?? 0, label)` and calls `claimMilestone('first_debate')` with `void`. It dynamically imports `'./onboarding-drip.ts'` and calls `triggerDripDay(5)` with `void`; if `result.is_winner` is truthy, it also calls `triggerDripDay(7)` with `void`. The import uses `.catch(() => {})`. It returns `result`.

### claimAiSparring

`claimAiSparring` is an `async` exported function accepting a `debateId` string. If `debateId` is falsy it returns `null` immediately. It `await`s `_rpc('claim_action_tokens', { p_action: 'ai_sparring', p_reference_id: debateId })`. If the result is falsy or `result.success` is false it returns `null`. Otherwise it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'AI Sparring')`, and calls `claimMilestone('first_ai_sparring')` with `void` (fire-and-forget). It returns `result`. No onboarding drip is triggered.

### claimPrediction

`claimPrediction` is an `async` exported function accepting a `debateId` string. If `debateId` is falsy it returns `null` immediately. It `await`s `_rpc('claim_action_tokens', { p_action: 'prediction', p_reference_id: debateId })`. If the result is falsy or `result.success` is false it returns `null`. Otherwise it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast(result.tokens_earned ?? 0, 'Prediction')`, and calls `claimMilestone('first_prediction')` with `void` (fire-and-forget). It returns `result`. No onboarding drip is triggered.

### checkProfileMilestones

`checkProfileMilestones` is an `async` exported function accepting a `completedCount` number. If `completedCount` is falsy (zero or `NaN`) it returns immediately. It then makes four independent threshold checks in sequence, each calling `claimMilestone` with `void`: `>= 3` triggers `'profile_3_sections'`; `>= 6` triggers `'profile_6_sections'`; `>= 12` triggers `'profile_12_sections'`; `>= 3` again triggers `'verified_gladiator'`. All four milestone calls are fire-and-forget. If `completedCount >= 3`, it also dynamically imports `'./onboarding-drip.ts'` and calls `triggerDripDay(6)` fire-and-forget, with `.catch(() => {})`. The function returns `void`; it is marked `async` but contains no `await` expressions — all async work is fire-and-forget.

### getSummary

`getSummary` is an `async` exported function with no parameters. It `await`s `_rpc('get_my_token_summary')`. If the result is falsy or `result.success` is false it returns `null`. Otherwise it calls `_updateBalanceDisplay` with `result.token_balance`, cast through `unknown` to `TokenSummary` to read that property. It returns `result` cast to `TokenSummary`. The cast through `unknown` is necessary because `ClaimResult` does not declare a `token_balance` property by that exact name — the cast suppresses the type error.

### getMilestoneList

`getMilestoneList` is a synchronous exported function with no parameters. It reads the module-level `MILESTONES` constant and the module-level `milestoneClaimed` set. It calls `Object.entries(MILESTONES)` and maps each `[key, def]` pair to a `MilestoneListItem` object by spreading `def` and adding `key` and `claimed: milestoneClaimed.has(key)`. It returns the resulting array. No external state is read or written.

### getBalance

`getBalance` is a synchronous exported function with no parameters. It reads and returns the module-level variable `lastKnownBalance`, which is typed `number | null` and initialized to `null`. It performs no computation and writes nothing.

### _initBroadcast

`_initBroadcast` is a synchronous function with no parameters. Inside a `try` block it constructs a `BroadcastChannel` with the channel name `'mod-token-balance'` and assigns it to the module-level variable `_bc`. It then sets `_bc.onmessage` to a handler that receives a `MessageEvent`: if `e.data` is of type `'number'`, it calls `_updateBalanceDisplay(e.data, false)`, passing `false` for the `broadcast` parameter to prevent re-broadcasting a message that was itself received from another tab. If the `BroadcastChannel` constructor throws (for example in environments that do not support it), the `catch` block silently discards the error and `_bc` remains `null`.

### init

`init` is a synchronous exported function with no parameters. It calls `_injectCSS` to inject animation styles, then calls `_initBroadcast` to set up the cross-tab channel. It then calls `onChange` (imported from `auth.ts`), passing a callback that receives `(user, profile)`. When that callback fires with both `user` and `profile` non-null: if `profile.token_balance` is non-null it calls `_updateBalanceDisplay(profile.token_balance)`; it sets `dailyLoginClaimed` to `false`; it calls `claimDailyLogin()` (without `await`, so fire-and-forget); it calls `_loadMilestones()` (without `await`, fire-and-forget); and it calls `_rpc('notify_followers_online', { p_user_id: user.id })` with `void` (fire-and-forget). The `onChange` registration itself is synchronous; the callback executes on subsequent auth state changes. The function at the module level is called either on `DOMContentLoaded` or immediately, depending on `document.readyState`.

## Agent 05

### _injectCSS

`_injectCSS` reads the module-level boolean `cssInjected`. If `cssInjected` is already `true`, the function returns immediately without doing anything. Otherwise it sets `cssInjected` to `true`, creates a `<style>` element via `document.createElement`, assigns a multi-rule CSS string to `style.textContent`, and appends that element to `document.head`. The CSS string defines two keyframe animations (`tokenFlyUp` and `milestoneSlide`) and three class rules (`.token-fly-coin`, `.token-earn-toast`, `.milestone-toast` with its child selectors). The function is synchronous and returns nothing.

### _coinFlyUp

`_coinFlyUp` is synchronous and returns nothing. It first calls `_injectCSS` to guarantee styles are present. It then creates a `<div>` element, assigns it the class `token-fly-coin`, and sets its `textContent` to the coin emoji `🪙`. It queries the DOM for an element with the id `token-display`. If that element exists, it reads its bounding rectangle via `getBoundingClientRect()` and sets the coin's `left` style to the horizontal center of that element and `top` to the element's bottom edge. If no `token-display` element exists, it sets `top` to `'60px'` and leaves `left` at whatever was previously set by the class (the class sets `left:50%`, so the inline style for `left` is absent in this branch). The coin element is appended to `document.body`, then a `setTimeout` schedules `coin.remove()` after 1000 milliseconds.

### _tokenToast

`_tokenToast` takes a `tokens` number and a `label` string. It performs an early return if `tokens` is falsy or `<= 0`, producing no side effects in that case. Otherwise it calls `_injectCSS`, then calls `_coinFlyUp` to start the flying coin animation. It constructs the string `+{tokens} 🪙 {label}` and passes it to `showToast` (imported from `config.ts`) with the severity `'success'`. The function is synchronous and returns nothing.

### _milestoneToast

`_milestoneToast` takes `icon`, `label`, `tokens`, and `freezes` parameters, all used to build a DOM element for display. It calls `_injectCSS` first. It constructs a `rewardText` string through three successive assignments: if `tokens > 0` it sets a token string; if `freezes > 0` it overwrites with a freeze string (using a singular/plural suffix check); if both are greater than zero it overwrites again with a combined string. A `<div>` with class `milestone-toast` is created, and its `innerHTML` is assigned a template that embeds `escapeHTML(icon || '🏆')`, the literal text `MILESTONE UNLOCKED`, `escapeHTML(label)`, and `escapeHTML(rewardText)`. Both `tokens` and `freezes` values displayed in `rewardText` are cast with `Number()` before insertion. If `tokens > 0`, `_coinFlyUp` is called after the element is appended to `document.body`. A `setTimeout` schedules `el.remove()` after 3600 milliseconds. The function is synchronous and returns nothing.

### _updateBalanceDisplay

`_updateBalanceDisplay` takes a `newBalance` value (number, null, or undefined) and an optional `broadcast` boolean that defaults to `true`. If `newBalance` is `null` or `undefined`, the function returns immediately. Otherwise it writes `newBalance` to the module-level `lastKnownBalance` variable. It then calls `document.querySelectorAll('[data-token-balance]')` and sets `textContent` on every matched element to `newBalance.toLocaleString()`. It also reads the element with id `token-balance` directly and, if found, sets its `textContent` to the same formatted value. If `broadcast` is `true` and the module-level `_bc` (a `BroadcastChannel` or `null`) is non-null, it attempts `_bc.postMessage(newBalance)` inside a try/catch that silently discards any error. The function is synchronous and returns nothing.

### updateBalance

`updateBalance` is a synchronous exported function taking a `newBalance` number. It calls `_updateBalanceDisplay(newBalance)`, which updates `lastKnownBalance` and all DOM balance elements. It then calls `getCurrentProfile()` (imported from `auth.ts`) and, if the returned profile object is non-null, writes `newBalance` to `profile.token_balance` by casting the profile to `Record<string, unknown>` to bypass TypeScript's readonly constraints. The function returns nothing.

### _rpc

`_rpc` is an async function taking a `fnName` string and an optional `args` object (defaulting to `{}`). It returns `Promise<ClaimResult | null>`. It reads two pieces of module state via imported functions: `getIsPlaceholderMode()` and `getCurrentUser()`. If either returns a truthy placeholder-mode flag or a falsy user, the function returns `null` immediately without making any network call. Otherwise it calls the imported `safeRpc(fnName, args)` inside a try/catch. On a successful await, if the destructured `error` is truthy, it logs a warning with `console.warn` and returns `null`. If no error, it returns `data` cast to `ClaimResult`. If the `await` itself throws, the catch block logs a warning with `console.warn` and returns `null`.

### requireTokens

`requireTokens` is a synchronous exported function taking an `amount` number and an optional `actionLabel` string. It calls `getCurrentProfile()` and reads the profile's `token_balance` (defaulting to `0` if absent or falsy). If the balance is greater than or equal to `amount`, it returns `true` immediately. If there is no profile at all, it also returns `true`. If the balance is insufficient, it computes the deficit, builds a message string using `actionLabel ?? 'do that'`, calls `showToast` with `'error'` severity, and returns `false`.

### claimMilestone

`claimMilestone` is an async exported function taking a `MilestoneKey`. It reads the module-level `milestoneClaimed` set; if the key is already in the set it returns `null` immediately without any network call. It looks up `MILESTONES[key]` and returns `null` if the definition is missing. Otherwise it awaits `_rpc('claim_milestone', { p_milestone_key: key })`. If the result is null or `result.success` is falsy, it checks whether `result?.error` equals `'Already claimed'`; if so, it adds the key to `milestoneClaimed` to prevent future attempts. Either way it returns `null` on failure. On success, it adds the key to `milestoneClaimed`, calls `_updateBalanceDisplay(result.new_balance)` if `new_balance` is non-null, calls `_milestoneToast` with the definition's icon and label plus `tokens_earned` and `freezes_earned` (defaulting to `0` for each), logs to the console, and returns the result.

### _loadMilestones

`_loadMilestones` is an async exported function with no parameters. It awaits `_rpc('get_my_milestones')`. If the result is null or `result.success` is falsy, it returns without doing anything. Otherwise it reads a `claimed` property from the result (cast through `unknown` to access the non-typed field). If `claimed` is a non-null array, it iterates over each element and adds it to the module-level `milestoneClaimed` set. The function returns `Promise<void>`.

### _checkStreakMilestones

`_checkStreakMilestones` is a synchronous function taking a `streak` number. If `streak` is falsy (zero, null, undefined), it returns immediately. Otherwise it checks three thresholds in sequence: if `streak >= 7` it fires `claimMilestone('streak_7')` as a fire-and-forget void call; if `streak >= 30` it fires `claimMilestone('streak_30')`; if `streak >= 100` it fires `claimMilestone('streak_100')`. All three threshold checks are independent — a streak of 100 triggers all three calls. The function itself is synchronous and returns nothing; the async `claimMilestone` calls are not awaited.

### claimDailyLogin

`claimDailyLogin` is an async exported function with no parameters. It reads the module-level `_dailyLoginInFlight` boolean and returns `null` immediately if it is `true`. Otherwise it sets `_dailyLoginInFlight` to `true` and enters a try/finally block. Inside the try, it awaits `_rpc('claim_daily_login')`. If the result is null, it returns `null` (the finally block still runs, resetting `_dailyLoginInFlight` to `false`). If `result.success` is falsy, it sets `dailyLoginClaimed` to `true` (regardless of error type), logs a warning unless the error is `'Already claimed today'`, and returns `null`. On success, it sets `dailyLoginClaimed` to `true`, calls `_updateBalanceDisplay(result.new_balance)`, constructs a label string: the base is `'Daily login'`, which is overwritten with a freeze message if `result.freeze_used` is truthy, or with a streak message if `result.streak_bonus > 0`. It then calls `_tokenToast` with the earned amount and label, calls the imported `nudge('return_visit', ...)` as a synchronous call, logs to the console, and calls `_checkStreakMilestones(result.login_streak ?? 0)`. The finally block always sets `_dailyLoginInFlight` back to `false`. The function returns the result on success or `null` on failure.

### claimHotTake

`claimHotTake` is an async exported function taking a `hotTakeId` string. It returns `null` immediately if `hotTakeId` is falsy. Otherwise it awaits `_rpc('claim_action_tokens', { p_action: 'hot_take', p_reference_id: hotTakeId })`. If the result is null or not successful, it returns `null`. On success, it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast` with `tokens_earned` and the label `'Hot take'`, and fires `claimMilestone('first_hot_take')` as a fire-and-forget void call. It then dynamically imports `'./onboarding-drip.ts'` and calls `triggerDripDay(4)` in the `.then` callback, with a `.catch(() => {})` silencing any import or call failure. The function returns the result.

### claimReaction

`claimReaction` is an async exported function taking a `hotTakeId` string. It returns `null` if `hotTakeId` is falsy. It awaits `_rpc('claim_action_tokens', { p_action: 'reaction', p_reference_id: hotTakeId })`. If unsuccessful or null, it returns `null`. On success it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast` with the label `'Reaction'`, and fires `claimMilestone('first_reaction')` as a void fire-and-forget call. No dynamic import occurs in this function. It returns the result.

### claimVote

`claimVote` is an async exported function taking a `debateId` string. It returns `null` if `debateId` is falsy. It awaits `_rpc('claim_action_tokens', { p_action: 'vote', p_reference_id: debateId })`. If unsuccessful or null, it returns `null`. On success it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast` with `'Vote'`, and fires `claimMilestone('first_vote')` as a void call. It then dynamically imports `'./onboarding-drip.ts'` and calls `triggerDripDay(2)`, with a `.catch(() => {})` swallowing failures. It returns the result.

### claimDebate

`claimDebate` is an async exported function taking a `debateId` string. It returns `null` if `debateId` is falsy. It awaits `_rpc('claim_debate_tokens', { p_debate_id: debateId })` — note the distinct RPC name compared to the other claim functions. If unsuccessful or null, it returns `null`. On success it calls `_updateBalanceDisplay(result.new_balance)`. It then builds the label string through three branches: it starts as `'Debate complete'`; if `result.is_winner` is truthy it becomes `'Debate win!'`; if `result.upset_bonus > 0` it is further overwritten to `'Upset victory!'`. After those winner branches, if `result.fate_bonus > 0` it appends ` (+{fate_pct}% Group Fate)` to whatever label was set. It calls `_tokenToast` with the earned amount and final label, then fires `claimMilestone('first_debate')` as a void call. It dynamically imports `'./onboarding-drip.ts'` and in the callback calls `triggerDripDay(5)` unconditionally and `triggerDripDay(7)` only if `result.is_winner` is truthy, with `.catch(() => {})` suppressing errors. It returns the result.

### claimAiSparring

`claimAiSparring` is an async exported function taking a `debateId` string. It returns `null` if `debateId` is falsy. It awaits `_rpc('claim_action_tokens', { p_action: 'ai_sparring', p_reference_id: debateId })`. If unsuccessful or null, it returns `null`. On success it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast` with `'AI Sparring'`, and fires `claimMilestone('first_ai_sparring')` as a void call. There is no dynamic import in this function. It returns the result.

### claimPrediction

`claimPrediction` is an async exported function taking a `debateId` string. It returns `null` if `debateId` is falsy. It awaits `_rpc('claim_action_tokens', { p_action: 'prediction', p_reference_id: debateId })`. If unsuccessful or null, it returns `null`. On success it calls `_updateBalanceDisplay(result.new_balance)`, calls `_tokenToast` with `'Prediction'`, and fires `claimMilestone('first_prediction')` as a void call. There is no dynamic import. It returns the result.

### checkProfileMilestones

`checkProfileMilestones` is an async exported function taking a `completedCount` number. If `completedCount` is falsy (zero, null, undefined), it returns immediately. Otherwise it checks four thresholds, all firing milestone claims as void fire-and-forget calls: `completedCount >= 3` triggers `claimMilestone('profile_3_sections')` and also `claimMilestone('verified_gladiator')`; `completedCount >= 6` triggers `claimMilestone('profile_6_sections')`; `completedCount >= 12` triggers `claimMilestone('profile_12_sections')`. If `completedCount >= 3`, it additionally dynamically imports `'./onboarding-drip.ts'` and calls `triggerDripDay(6)`, with `.catch(() => {})` suppressing import failures. All four milestone checks and the dynamic import check use independent `if` statements evaluated in sequence. The function returns `Promise<void>`.

### getSummary

`getSummary` is an async exported function with no parameters. It awaits `_rpc('get_my_token_summary')`. If the result is null or `result.success` is falsy, it returns `null`. On success it calls `_updateBalanceDisplay` with the `token_balance` property from the result (cast through `unknown` to `TokenSummary` to access the field). It returns the result cast to `TokenSummary`.

### getMilestoneList

`getMilestoneList` is a synchronous exported function with no parameters. It calls `Object.entries(MILESTONES)` to get all milestone key-definition pairs and maps each to a new object that spreads the definition's fields, adds the `key` string, and adds a `claimed` boolean derived by checking `milestoneClaimed.has(key)` against the module-level set. It returns the resulting `MilestoneListItem[]` array. No network calls or DOM access occur.

### getBalance

`getBalance` is a synchronous exported function with no parameters. It reads and returns the module-level `lastKnownBalance` variable, which is `number | null`. No computation, side effects, or external calls occur.

### _initBroadcast

`_initBroadcast` is a synchronous function with no parameters. It wraps its entire body in a try/catch that silently discards any error. Inside the try, it constructs a `BroadcastChannel` named `'mod-token-balance'` and assigns it to the module-level `_bc` variable. It then sets `_bc.onmessage` to a handler that receives a `MessageEvent`: if `e.data` is of type `'number'`, it calls `_updateBalanceDisplay(e.data, false)` — passing `false` for the `broadcast` parameter to avoid re-broadcasting the incoming value back across tabs. If `BroadcastChannel` is not supported by the browser, the constructor throws and the catch block runs, leaving `_bc` as `null`. The function returns nothing.

### init

`init` is a synchronous exported function with no parameters. It calls `_injectCSS()` to inject styles, then calls `_initBroadcast()` to set up cross-tab sync. It then calls the imported `onChange` from `auth.ts`, passing a callback that receives `(user, profile)`. The `onChange` registration is the last action in `init`; control returns to the caller after the subscription is set up. When the callback fires (driven by auth state changes, not by `init` itself), it checks that both `user` and `profile` are truthy. If so: if `profile.token_balance` is non-null, it calls `_updateBalanceDisplay(profile.token_balance)`; it sets module-level `dailyLoginClaimed` to `false`; it calls `claimDailyLogin()` without awaiting; it calls `_loadMilestones()` without awaiting; and it fires `_rpc('notify_followers_online', { p_user_id: user.id })` as a void fire-and-forget call. If `user` or `profile` is absent when the callback fires, none of those steps execute. At the module level, outside `init`, a separate IIFE-equivalent block runs unconditionally at parse time: if `document.readyState === 'loading'`, it registers `init` as a `DOMContentLoaded` listener; otherwise it calls `init()` immediately.
