# Stage 2 Outputs — arena-mod-debate-poll.ts

## Agent 01

### startModDebatePoll

This function reads the `debateId`, `mode`, and `ranked` parameters. It reads the module-level state variable `modDebatePollTimer` through module exports. It calls `stopModDebatePoll()` to clear any existing polling interval, then calls `setInterval()` to create a new interval that executes every 4 seconds. The interval callback is an async function that checks the module-level `view` state and calls `stopModDebatePoll()` if `view` is not `'modDebateWaiting'`, returning early. The callback invokes `safeRpc()` with the RPC call `'check_mod_debate'` passing `p_debate_id` as the debateId, awaiting its result. If the RPC returns an error or no data, the callback returns early. If the result's status is `'matched'`, the callback invokes `stopModDebatePoll()` and then calls `onModDebateReady()` passing the debateId, result, mode, and ranked. Any exception in the try block is caught silently. The function writes to the module-level state `modDebatePollTimer` via `set_modDebatePollTimer()` with the setInterval return value. The function writes to the DOM by finding elements with ids `'slot-a-name'` and `'slot-b-name'` and setting their `textContent` to debater names from the RPC result. The function returns void and is not async, though its interval callback is async.

### stopModDebatePoll

This function reads the module-level state `modDebatePollTimer`. It checks if `modDebatePollTimer` is truthy. If so, it calls `clearInterval()` with that timer ID and writes null to the module-level state via `set_modDebatePollTimer(null)`. The function returns void and performs no other operations.

### onModDebateReady

This function reads the `debateId`, `result`, `mode`, and `ranked` parameters. It reads the current user profile via `getCurrentProfile()` and extracts properties from the `result` object including debater IDs, names, ruleset, topic, total rounds, and language. It computes `isActualMod` as a boolean by checking whether the current user's profile ID matches either debater ID. The function's control flow branches on `isActualMod`. If true, it constructs a `CurrentDebate` object with `modView: true` and `role: 'a'`, then calls `enterRoom()` with that data. If false, it determines the user's `role` by comparing the profile ID to debater A's ID, constructs an opposing `CurrentDebate` object without the mod properties, and calls `showMatchFound()` with that data. The `debaterAName` and `debaterBName` fields are only set in the moderator branch. The function returns void and is not async.

### cancelModDebate

This function is async and reads the `debateId` parameter. It calls `stopModDebatePoll()` synchronously. It then awaits `safeRpc()` with the RPC call `'cancel_mod_debate'` passing `p_debate_id` as the debateId. Any exception from the RPC is caught silently. It writes null to the module-level state via `set_modDebateId(null)`. It then dynamically imports the module `'./arena-mod-queue-browse.ts'`, awaiting the import, destructuring the `showModQueue` function, and calling it with no arguments. The function returns a void promise.

## Agent 02

### startModDebatePoll

Reads the `debateId`, `mode`, and `ranked` parameters, the module-level `modDebatePollTimer` and `view` state, and the DOM elements with IDs 'slot-a-name' and 'slot-b-name'. Calls `stopModDebatePoll` first to clear any existing polling interval. Then calls `setInterval` to create a polling loop that runs every 4000 milliseconds. Inside the loop, checks if `view` is 'modDebateWaiting'; if not, calls `stopModDebatePoll` and returns early. Otherwise, asynchronously calls `safeRpc` with 'check_mod_debate' to fetch the debate status. If the RPC returns data with status 'matched', calls `stopModDebatePoll`, then calls `onModDebateReady` with the `debateId`, result, `mode`, and `ranked`. Also updates the text content of the slot display elements if they exist and the result contains debater names. The try/catch block catches errors and silently retries on the next polling tick. Sets the returned interval ID to module-level `modDebatePollTimer` via `set_modDebatePollTimer`. Returns void.

### stopModDebatePoll

Reads the module-level `modDebatePollTimer` state. If `modDebatePollTimer` is truthy, calls `clearInterval` with it to stop the polling loop, then calls `set_modDebatePollTimer` to set the timer to null. Returns void.

### onModDebateReady

Reads the `debateId`, `result`, `mode`, and `ranked` parameters. Calls `getCurrentProfile` to get the current user's profile. Determines `isActualMod` by checking whether the profile ID matches either debater ID in the result. Extracts `debateRuleset` from the result, defaulting to 'amplified', and `debateTopic` from the result, defaulting to 'Moderated Debate'. Branches on `isActualMod`: if true, constructs a `CurrentDebate` object with `modView: true`, `role: 'a'`, and both debater names from the result, then calls `enterRoom` with this object. If false, determines the user's `role` ('a' or 'b') by comparing the profile ID to the debater IDs, constructs a `CurrentDebate` object without `modView`, and calls `showMatchFound` with this object. Returns void.

### cancelModDebate

An async function that reads the `debateId` parameter. Calls `stopModDebatePoll` synchronously to halt any ongoing polling. Asynchronously calls `safeRpc` with 'cancel_mod_debate' and the `debateId`, awaiting the result; errors are caught and silently ignored. Calls `set_modDebateId` with null to clear the stored debate ID. Dynamically imports the `arena-mod-queue-browse.ts` module and awaits the import, extracting `showModQueue`. Then calls `showModQueue` to display the moderator queue. Returns a resolved void Promise.

## Agent 03

### startModDebatePoll

This function reads the debateId, mode, and ranked parameters. It first calls stopModDebatePoll() to clear any existing poll timer. Then it calls setInterval with a 4000ms period to create a repeating async callback, storing the interval ID in module state via set_modDebatePollTimer(). The callback reads the module-level view state and returns early if view is not 'modDebateWaiting', calling stopModDebatePoll() to clean up the timer before returning. Otherwise, it awaits a safeRpc call to 'check_mod_debate' with the debateId. If the RPC returns an error or no data, the callback returns early. If data is present, it reads the DOM for elements with IDs 'slot-a-name' and 'slot-b-name', and if they exist, it sets their textContent to the debater names from the result. If result.status equals 'matched', the function calls stopModDebatePoll() and then awaits onModDebateReady() with the debateId, result, mode, and ranked values. The callback has a try-catch that silently swallows exceptions and retries on the next tick. The function returns void.

### stopModDebatePoll

This function reads the module-level modDebatePollTimer state. If modDebatePollTimer is truthy, it calls clearInterval() with that value to stop the repeating timer, then calls set_modDebatePollTimer(null) to clear the module state. The function returns void.

### onModDebateReady

This function reads the debateId, result, mode, and ranked parameters. It calls getCurrentProfile() to read the current user's profile and extracts the ruleset and topic from the result object, defaulting to 'amplified' and 'Moderated Debate' respectively. It compares the profile ID against result.debater_a_id and result.debater_b_id to compute isActualMod—true if the profile is neither debater. The function branches on isActualMod: if true, it constructs a CurrentDebate object with role set to 'a', modView set to true, and other fields populated from the parameters and result, then calls enterRoom(debateData); if false, it determines the profile's DebateRole ('a' or 'b') by comparing their ID to debater_a_id, constructs a different CurrentDebate object with the appropriate role and opponent fields, and calls showMatchFound(debateData). The function returns void.

### cancelModDebate

This async function reads the debateId parameter and calls stopModDebatePoll() to clear any active poll timer. It then awaits a safeRpc call to 'cancel_mod_debate' with the debateId, wrapped in a try-catch that silently swallows exceptions. After the RPC completes or fails, it calls set_modDebateId(null) to write null to module state. The function then dynamically imports and destructures showModQueue from './arena-mod-queue-browse.ts' using an await, and calls showModQueue() with no arguments. The function returns a Promise that resolves to void.

## Agent 04

### startModDebatePoll

Reads the function parameters `debateId`, `mode`, and `ranked`; reads module-level state `view`; reads the external DOM and makes RPC calls. Calls `stopModDebatePoll()` immediately to cancel any existing poll. Creates a new interval timer via `setInterval` with a 4000ms period and stores the timer ID in module state via `set_modDebatePollTimer()`. The interval callback is an async arrow function that runs on each tick: it checks if the current `view` is `'modDebateWaiting'` and exits early by calling `stopModDebatePoll()` and returning if not. It calls `safeRpc()` with the RPC method `'check_mod_debate'` and the debate ID, awaiting the result. If the RPC returns an error or no data, the function returns early without further action. It casts the returned data to `ModDebateCheckResult` and then queries the DOM for elements with IDs `'slot-a-name'` and `'slot-b-name'`, updating their text content with debater names from the RPC result if those elements exist. If the RPC result's status is `'matched'`, it calls `stopModDebatePoll()`, then calls `onModDebateReady()` passing the debate ID, result, mode, and ranked flag. Errors in the try block are caught and silently ignored. The interval callback is not awaited and fires as a background task on each 4-second tick. The function itself is synchronous and returns `void`.

### stopModDebatePoll

Reads the module-level state `modDebatePollTimer`. If the timer is truthy, calls the native `clearInterval()` function with it, then calls `set_modDebatePollTimer()` to write `null` back to module state. The function is synchronous and returns `void`.

### onModDebateReady

Reads the function parameters `debateId`, `result`, `mode`, and `ranked`. Calls `getCurrentProfile()` to read the current user profile and derives `isActualMod` by checking whether the profile's ID matches neither of the two debater IDs in the result. Extracts the ruleset and topic from the result, using fallback defaults if missing. The function then branches into two paths based on the `isActualMod` boolean. In the moderator path, constructs a `CurrentDebate` object with the debate details, including `modView: true` and hardcoded role `'a'`, then calls `enterRoom()` passing this object. In the debater path, derives the debater's `role` by comparing their profile ID against the debater A and B IDs in the result; constructs a `CurrentDebate` object with the computed role, and the opponent's name and ID derived from the opposite role; then calls `showMatchFound()` passing this object. Both paths read from the result object and the profile object but do not write to external state beyond the function calls. The function is synchronous and returns `void`.

### cancelModDebate

Reads the function parameter `debateId`. Calls `stopModDebatePoll()` synchronously to stop any running poll. Enters a try-catch block and calls `safeRpc()` with the RPC method `'cancel_mod_debate'` and the debate ID, awaiting the result; errors are caught and silently ignored. Calls `set_modDebateId()` to write `null` to module state. Dynamically imports the module `'./arena-mod-queue-browse.ts'` using `await import()` and destructures the `showModQueue` function from it, then calls `showModQueue()` with no arguments. The function is asynchronous and awaits the import statement and the `safeRpc()` call, while the import itself is necessary to retrieve the function before calling it. Returns a `Promise<void>`.

## Agent 05

### startModDebatePoll

This function reads the `debateId`, `mode`, and `ranked` parameters, and module-level state via the `view` variable from arena-state. It writes to module-level state by calling `set_modDebatePollTimer()` with a new interval ID, overwriting any existing timer after first calling `stopModDebatePoll()`. The function sets up an interval that fires every 4000ms. Inside the interval callback, if the `view` is not `'modDebateWaiting'`, it stops polling and returns without doing further work. Otherwise, it calls `safeRpc()` with `'check_mod_debate'` and passes the debate ID, awaiting the result. If the RPC returns an error or no data, it returns silently. If data exists and its status is `'matched'`, it calls `stopModDebatePoll()` to clear the timer and then calls `onModDebateReady()` synchronously, passing the debate ID, result, mode, and ranked flag. The try-catch wraps the entire RPC operation and silently retries on the next interval if an exception is thrown. The function also updates the DOM, writing to elements with IDs `'slot-a-name'` and `'slot-b-name'` by setting their `textContent` to debater names from the RPC result if those elements exist and names are present. The function itself returns void and is synchronous; the interval callback is async but its awaited calls do not block the function's return.

### stopModDebatePoll

This function reads the module-level `modDebatePollTimer` state. If the timer is truthy, it calls `clearInterval()` with that timer ID and then calls `set_modDebatePollTimer()` to write `null` back to the module state. If the timer is falsy, the function performs no operations. The function returns void.

### onModDebateReady

This function reads the current profile via `getCurrentProfile()`, the `debateId`, `result`, `mode`, and `ranked` parameters, and the `DEBATE.defaultRounds` configuration. It constructs a `CurrentDebate` object using values from the result and parameters. It then branches on whether the current profile's ID matches one of the two debater IDs from the result: if the profile ID is neither debater ID, the profile is a moderator, and it calls `enterRoom()` with debate data constructed for an observer in role `'a'`. If the profile ID matches one of the debater IDs, it is a debater, and it calls `showMatchFound()` instead, with debate data constructed using the matching role (`'a'` or `'b'`) and the opponent information derived from the opposite debater in the result. The function returns void and is synchronous.

### cancelModDebate

This function is async and reads the `debateId` parameter. It calls `stopModDebatePoll()` synchronously, then calls `safeRpc()` with `'cancel_mod_debate'` and awaits the result; any exception is caught and silently ignored. It then calls `set_modDebateId()` to write `null` to module state. Finally, it dynamically imports the arena-mod-queue module and awaits that import, then calls the `showModQueue()` function from that module. The function returns a Promise that resolves to void.
