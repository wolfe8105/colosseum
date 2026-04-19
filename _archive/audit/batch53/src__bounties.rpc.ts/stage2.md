# Stage 2 Outputs — bounties.rpc.ts

## Agent 01

### postBounty

This async function accepts three parameters: `targetId` (string), `amount` (number), and `durationDays` (number). It first checks the module-level state by calling `getIsPlaceholderMode()`. If placeholder mode is active, it returns immediately with `{ success: true, bounty_id: 'placeholder' }` without making any external calls. Otherwise, it enters a try block and calls `safeRpc()` with the procedure name `'post_bounty'` and an object mapping the parameters to RPC argument names (`p_target_id`, `p_amount`, `p_duration_days`). The `safeRpc` call is awaited. If the response contains an error, it throws that error. If no error exists, it returns the data from the response, or falls back to `{ success: true }` if data is null or undefined. The catch block catches any thrown Error, extracts its message, and returns `{ success: false, error: message }`.

### cancelBounty

This async function accepts a single parameter `bountyId` (string). It first checks `getIsPlaceholderMode()`, and if true, returns `{ success: true }` without further execution. Otherwise, it enters a try block and calls `safeRpc()` with the procedure name `'cancel_bounty'` and an argument object mapping `bountyId` to `p_bounty_id`. The `safeRpc` call is awaited. If the response contains an error, it throws that error. If no error exists, it returns the data from the response, or falls back to `{ success: true }` if data is null or undefined. The catch block catches any Error, extracts its message, and returns an object with `success: false` and the error message.

### getMyBounties

This async function accepts no parameters. It first checks `getIsPlaceholderMode()`, and if true, returns `{ incoming: [], outgoing: [] }` without further execution. Otherwise, it enters a try block and calls `safeRpc()` with the procedure name `'get_my_bounties'` and no arguments. The `safeRpc` call is awaited. If the response contains an error, it throws that error. If no error exists, it returns the data from the response, or falls back to `{ incoming: [], outgoing: [] }` if data is null or undefined. The catch block logs an error message to the console using `console.error()` with the tag `'[Bounties] getMyBounties error:'`, then returns `{ incoming: [], outgoing: [] }`.

### getOpponentBounties

This async function accepts a single parameter `opponentId` (string). It first checks `getIsPlaceholderMode()`, and if true, returns an empty array without further execution. Otherwise, it enters a try block and calls `safeRpc()` with the procedure name `'get_opponent_bounties'` and an argument object mapping `opponentId` to `p_opponent_id`. The `safeRpc` call is awaited. If the response contains an error, it throws that error. If no error exists, it returns the data from the response, or falls back to an empty array if data is null or undefined. The catch block logs a warning message to the console using `console.warn()` with the tag `'[Bounties] getOpponentBounties error:'`, then returns an empty array.

### selectBountyClaim

This async function accepts two parameters: `bountyId` (string) and `debateId` (string). It first checks `getIsPlaceholderMode()`, and if true, returns `{ success: true }` without further execution. Otherwise, it enters a try block and calls `safeRpc()` with the procedure name `'select_bounty_claim'` and an object mapping the parameters to RPC argument names (`p_bounty_id` and `p_debate_id`). The `safeRpc` call is awaited. If the response contains an error, it throws that error. If no error exists, it returns the data from the response, or falls back to `{ success: true }` if data is null or undefined. The catch block catches any Error, extracts its message, and returns `{ success: false, error: message }`.

### bountySlotLimit

This synchronous function accepts a single parameter `depthPct` (number) and returns a number. It performs a series of numeric comparisons in descending order of threshold values: if `depthPct >= 75`, it returns 6; if `depthPct >= 65`, it returns 5; if `depthPct >= 55`, it returns 4; if `depthPct >= 45`, it returns 3; if `depthPct >= 35`, it returns 2; if `depthPct >= 25`, it returns 1; otherwise, it returns 0. No external state or function calls occur.

---

## Agent 02

### postBounty

This function is async. It reads the module-level state via `getIsPlaceholderMode()`. If placeholder mode is active, the function returns synchronously with `{ success: true, bounty_id: 'placeholder' }` without making any RPC call. Otherwise, it calls `safeRpc<PostBountyResult>()` with the RPC method name `'post_bounty'` and an object containing the parameters `p_target_id`, `p_amount`, and `p_duration_days` mapped from the function's targetId, amount, and durationDays parameters. The function awaits the safeRpc call. If the returned error field is truthy, it throws the error. If error is falsy, it returns the data field if present, otherwise returns `{ success: true }`. If any exception is caught (from the error throw or safeRpc failure), the catch block returns `{ success: false, error: (e as Error).message }` with the error message stringified.

### cancelBounty

This function is async. It reads the module-level state via `getIsPlaceholderMode()`. If placeholder mode is active, it returns synchronously with `{ success: true }`. Otherwise, it calls `safeRpc()` with the RPC method name `'cancel_bounty'` and an object containing `p_bounty_id` mapped from the bountyId parameter. The function awaits the safeRpc call. If the returned error field is truthy, it throws the error. If error is falsy, it returns the data field if present, otherwise returns `{ success: true }`. The data field may optionally include refund and burned number fields. If any exception is caught, the catch block returns `{ success: false, error: (e as Error).message }`.

### getMyBounties

This function is async. It reads the module-level state via `getIsPlaceholderMode()`. If placeholder mode is active, it returns synchronously with `{ incoming: [], outgoing: [] }`. Otherwise, it calls `safeRpc<MyBountiesResult>()` with the RPC method name `'get_my_bounties'` with no parameters. The function awaits the safeRpc call. If the returned error field is truthy, it throws the error. If error is falsy, it returns the data field if present, otherwise returns `{ incoming: [], outgoing: [] }`. If any exception is caught, the catch block logs the error to the console using `console.error('[Bounties] getMyBounties error:', e)` and returns `{ incoming: [], outgoing: [] }`.

### getOpponentBounties

This function is async. It reads the module-level state via `getIsPlaceholderMode()` and accepts an opponentId parameter. If placeholder mode is active, it returns synchronously with an empty array `[]`. Otherwise, it calls `safeRpc<OpponentBounty[]>()` with the RPC method name `'get_opponent_bounties'` and an object containing `p_opponent_id` mapped from the opponentId parameter. The function awaits the safeRpc call. If the returned error field is truthy, it throws the error. If error is falsy, it returns the data field if present, otherwise returns an empty array `[]`. If any exception is caught, the catch block logs the warning to the console using `console.warn('[Bounties] getOpponentBounties error:', e)` and returns an empty array `[]`.

### selectBountyClaim

This function is async. It reads the module-level state via `getIsPlaceholderMode()`. If placeholder mode is active, it returns synchronously with `{ success: true }`. Otherwise, it calls `safeRpc<SelectClaimResult>()` with the RPC method name `'select_bounty_claim'` and an object containing `p_bounty_id` and `p_debate_id` mapped from the bountyId and debateId parameters. The function awaits the safeRpc call. If the returned error field is truthy, it throws the error. If error is falsy, it returns the data field if present, otherwise returns `{ success: true }`. If any exception is caught, the catch block returns `{ success: false, error: (e as Error).message }`.

### bountySlotLimit

This function is synchronous and returns a number. It reads the depthPct parameter. It evaluates a cascading series of threshold comparisons: if depthPct is greater than or equal to 75, it returns 6; if greater than or equal to 65, it returns 5; if greater than or equal to 55, it returns 4; if greater than or equal to 45, it returns 3; if greater than or equal to 35, it returns 2; if greater than or equal to 25, it returns 1; otherwise it returns 0. The function has no side effects and does not call any other functions or APIs.

---

## Agent 03

### postBounty

When called, this async function reads the `depthPct` parameter and three parameters: `targetId`, `amount`, and `durationDays`. It first checks module-level state via `getIsPlaceholderMode()`. If that returns true, the function immediately returns `{ success: true, bounty_id: 'placeholder' }`. Otherwise, it awaits a call to `safeRpc<PostBountyResult>('post_bounty', ...)` with an object mapping the three parameters to RPC field names (`p_target_id`, `p_amount`, `p_duration_days`). This returns a result object with `data` and `error` fields. If `error` is truthy, the catch block is entered and the error is thrown. If no error, the function returns `data` if it exists, otherwise `{ success: true }`. The catch block catches any thrown error and returns `{ success: false, error: (e as Error).message }`.

### cancelBounty

When called, this async function reads the `bountyId` parameter and checks module-level state via `getIsPlaceholderMode()`. If that returns true, the function immediately returns `{ success: true }`. Otherwise, it awaits a call to `safeRpc<AuthResult & { refund?: number; burned?: number }>('cancel_bounty', { p_bounty_id: bountyId })`. The result object has `data` and `error` fields. If `error` is truthy, the catch block is entered and the error is thrown. If no error, the function returns `data` if it exists, otherwise `{ success: true }`. The catch block catches any thrown error and returns `{ success: false, error: (e as Error).message }`.

### getMyBounties

When called, this async function checks module-level state via `getIsPlaceholderMode()`. If that returns true, the function immediately returns `{ incoming: [], outgoing: [] }`. Otherwise, it awaits a call to `safeRpc<MyBountiesResult>('get_my_bounties')` with no parameters. The result object has `data` and `error` fields. If `error` is truthy, the catch block is entered and the error is thrown. If no error, the function returns `data` if it exists, otherwise `{ incoming: [], outgoing: [] }`. The catch block catches any thrown error, calls `console.error('[Bounties] getMyBounties error:', e)`, and returns `{ incoming: [], outgoing: [] }`.

### getOpponentBounties

When called, this async function reads the `opponentId` parameter and checks module-level state via `getIsPlaceholderMode()`. If that returns true, the function immediately returns an empty array. Otherwise, it awaits a call to `safeRpc<OpponentBounty[]>('get_opponent_bounties', { p_opponent_id: opponentId })`. The result object has `data` and `error` fields. If `error` is truthy, the catch block is entered and the error is thrown. If no error, the function returns `data` if it exists, otherwise an empty array. The catch block catches any thrown error, calls `console.warn('[Bounties] getOpponentBounties error:', e)`, and returns an empty array.

### selectBountyClaim

When called, this async function reads the `bountyId` and `debateId` parameters and checks module-level state via `getIsPlaceholderMode()`. If that returns true, the function immediately returns `{ success: true }`. Otherwise, it awaits a call to `safeRpc<SelectClaimResult>('select_bounty_claim', { p_bounty_id: bountyId, p_debate_id: debateId })`. The result object has `data` and `error` fields. If `error` is truthy, the catch block is entered and the error is thrown. If no error, the function returns `data` if it exists, otherwise `{ success: true }`. The catch block catches any thrown error and returns `{ success: false, error: (e as Error).message }`.

### bountySlotLimit

When called, this synchronous function reads the `depthPct` parameter and evaluates a sequence of if-statements that return integers: if `depthPct >= 75` it returns 6; if `depthPct >= 65` it returns 5; if `depthPct >= 55` it returns 4; if `depthPct >= 45` it returns 3; if `depthPct >= 35` it returns 2; if `depthPct >= 25` it returns 1; otherwise it returns 0.

---

## Agent 04

### postBounty

This async function reads the module-level state by calling getIsPlaceholderMode(), which determines whether the application is in placeholder mode. If placeholder mode is active, the function returns immediately with a synthetic success response containing a placeholder bounty ID. Otherwise, it calls safeRpc with the method 'post_bounty' and passes three parameters: p_target_id (the targetId parameter), p_amount (the amount parameter), and p_duration_days (the durationDays parameter). The function awaits this RPC call and destructures the response into data and error. If error is defined, it throws the error into the catch block. If error is not defined, the function returns the data object, or falls back to { success: true } if data is nullish. If an exception is caught, the function catches it, casts it to Error, extracts the message property, and returns an object with success: false and the error message.

### cancelBounty

This async function reads the module-level state by calling getIsPlaceholderMode(). If placeholder mode is active, it returns immediately with { success: true }. Otherwise, it calls safeRpc with the method 'cancel_bounty' and passes one parameter: p_bounty_id (the bountyId parameter). The function awaits this RPC call and destructures the response into data and error. If error is defined, it throws the error into the catch block. If error is not defined, the function returns the data object, or falls back to { success: true } if data is nullish. The return type includes optional refund and burned number properties from the RPC response. If an exception is caught, the function catches it, casts it to Error, extracts the message property, and returns an object with success: false and the error message.

### getMyBounties

This async function reads the module-level state by calling getIsPlaceholderMode(). If placeholder mode is active, it returns immediately with an object containing empty incoming and outgoing arrays. Otherwise, it calls safeRpc with the method 'get_my_bounties' and no parameters. The function awaits this RPC call and destructures the response into data and error. If error is defined, it throws the error into the catch block. If error is not defined, the function returns the data object, or falls back to { incoming: [], outgoing: [] } if data is nullish. If an exception is caught, the function logs the error to console.error with the prefix '[Bounties] getMyBounties error:' and returns { incoming: [], outgoing: [] }.

### getOpponentBounties

This async function reads the module-level state by calling getIsPlaceholderMode(). If placeholder mode is active, it returns immediately with an empty array. Otherwise, it calls safeRpc with the method 'get_opponent_bounties' and passes one parameter: p_opponent_id (the opponentId parameter). The function awaits this RPC call and destructures the response into data and error. If error is defined, it throws the error into the catch block. If error is not defined, the function returns the data object, or falls back to an empty array if data is nullish. If an exception is caught, the function logs the error to console.warn with the prefix '[Bounties] getOpponentBounties error:' and returns an empty array.

### selectBountyClaim

This async function reads the module-level state by calling getIsPlaceholderMode(). If placeholder mode is active, it returns immediately with { success: true }. Otherwise, it calls safeRpc with the method 'select_bounty_claim' and passes two parameters: p_bounty_id (the bountyId parameter) and p_debate_id (the debateId parameter). The function awaits this RPC call and destructures the response into data and error. If error is defined, it throws the error into the catch block. If error is not defined, the function returns the data object, or falls back to { success: true } if data is nullish. If an exception is caught, the function catches it, casts it to Error, extracts the message property, and returns an object with success: false and the error message.

### bountySlotLimit

This synchronous function reads the depthPct parameter and returns a number based on a cascading series of comparisons. If depthPct is greater than or equal to 75, it returns 6. If depthPct is greater than or equal to 65, it returns 5. If depthPct is greater than or equal to 55, it returns 4. If depthPct is greater than or equal to 45, it returns 3. If depthPct is greater than or equal to 35, it returns 2. If depthPct is greater than or equal to 25, it returns 1. If none of these conditions match, it returns 0. The function performs no I/O, reads no external state, and produces no side effects.

---

## Agent 05

### postBounty

When called, this async function first checks placeholder mode by calling `getIsPlaceholderMode()`. If placeholder mode is active, it returns immediately with `{ success: true, bounty_id: 'placeholder' }` without making any RPC call. Otherwise, it enters a try block and calls `safeRpc()` with the RPC method name 'post_bounty' and an object containing three parameters mapped from the function arguments: `p_target_id`, `p_amount`, and `p_duration_days`. The `safeRpc()` call is awaited. If the returned error is truthy, it throws the error. If no error occurred, the function returns the data from the response, or defaults to `{ success: true }` if data is falsy. The catch block catches any error, casts it to Error type, extracts its message property, and returns an object with `success: false` and an error field containing that message.

### cancelBounty

When called, this async function first checks placeholder mode by calling `getIsPlaceholderMode()`. If placeholder mode is active, it returns immediately with `{ success: true }`. Otherwise, it enters a try block and calls `safeRpc()` with the RPC method name 'cancel_bounty' and an object containing a single parameter `p_bounty_id` mapped from the bountyId argument. The `safeRpc()` call is awaited. If the returned error is truthy, it throws the error. If no error occurred, the function returns the data from the response, or defaults to `{ success: true }` if data is falsy. The catch block catches any error, casts it to Error type, extracts its message property, and returns an object with `success: false` and an error field containing that message.

### getMyBounties

When called, this async function first checks placeholder mode by calling `getIsPlaceholderMode()`. If placeholder mode is active, it returns immediately with `{ incoming: [], outgoing: [] }`. Otherwise, it enters a try block and calls `safeRpc()` with the RPC method name 'get_my_bounties' and no parameters object. The `safeRpc()` call is awaited. If the returned error is truthy, it throws the error. If no error occurred, the function returns the data from the response, or defaults to `{ incoming: [], outgoing: [] }` if data is falsy. The catch block logs the error to the console using `console.error()` with a prefix '[Bounties] getMyBounties error:' and then returns `{ incoming: [], outgoing: [] }`.

### getOpponentBounties

When called, this async function first checks placeholder mode by calling `getIsPlaceholderMode()`. If placeholder mode is active, it returns immediately with an empty array `[]`. Otherwise, it enters a try block and calls `safeRpc()` with the RPC method name 'get_opponent_bounties' and an object containing a single parameter `p_opponent_id` mapped from the opponentId argument. The `safeRpc()` call is awaited. If the returned error is truthy, it throws the error. If no error occurred, the function returns the data from the response, or defaults to `[]` if data is falsy. The catch block logs the error to the console using `console.warn()` with a prefix '[Bounties] getOpponentBounties error:' and then returns an empty array `[]`.

### selectBountyClaim

When called, this async function first checks placeholder mode by calling `getIsPlaceholderMode()`. If placeholder mode is active, it returns immediately with `{ success: true }`. Otherwise, it enters a try block and calls `safeRpc()` with the RPC method name 'select_bounty_claim' and an object containing two parameters mapped from the function arguments: `p_bounty_id` and `p_debate_id`. The `safeRpc()` call is awaited. If the returned error is truthy, it throws the error. If no error occurred, the function returns the data from the response, or defaults to `{ success: true }` if data is falsy. The catch block catches any error, casts it to Error type, extracts its message property, and returns an object with `success: false` and an error field containing that message.

### bountySlotLimit

When called, this synchronous function reads the depthPct parameter and returns an integer by evaluating a series of conditional branches in descending order of depthPct thresholds. If depthPct is greater than or equal to 75, it returns 6. If depthPct is greater than or equal to 65, it returns 5. If depthPct is greater than or equal to 55, it returns 4. If depthPct is greater than or equal to 45, it returns 3. If depthPct is greater than or equal to 35, it returns 2. If depthPct is greater than or equal to 25, it returns 1. If none of the conditions are met, it returns 0.
