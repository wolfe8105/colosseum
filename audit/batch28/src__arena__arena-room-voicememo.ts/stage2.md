# Stage 2 Outputs — arena-room-voicememo.ts

## Agent 01

### wireVoiceMemoControls

This function reads nothing from module-level state. It queries the DOM for three elements by ID — `arena-record-btn`, `arena-vm-cancel`, and `arena-vm-send` — and attaches `click` listeners to each using optional chaining, so if an element is absent no listener is attached and no error is thrown. The record button listener reads the module-level state variable `vmRecording` at click time: if `vmRecording` is falsy it calls `startVoiceMemoRecording` as a fire-and-forget async call (void-cast); if `vmRecording` is truthy it calls `stopVoiceMemoRecording` synchronously. The cancel button listener calls `vmRetake` (imported from `voicememo.ts`) followed immediately by `resetVoiceMemoUI`. The send button listener calls `sendVoiceMemo` as a fire-and-forget async call. The function returns `void` and is itself synchronous. It writes nothing to module-level state.

### startVoiceMemoRecording

This is an async function. It begins by writing `true` to `vmRecording` via `set_vmRecording` and `0` to `vmSeconds` via `set_vmSeconds`. It then queries the DOM for three elements: `arena-record-btn`, `arena-vm-status`, and `arena-vm-timer`. It adds the CSS class `recording` to the record button, sets the record button's `textContent` to the Unicode stop character (⏹), sets the status element's `textContent` to `'Recording...'`, and removes the `arena-hidden` class from the timer element.

It then starts a `setInterval` callback at 1000 ms intervals. On each tick the callback increments `vmSeconds` by 1 via `set_vmSeconds`, updates the timer element's `textContent` by calling `formatTimer(vmSeconds)`, and then checks whether `vmSeconds` has reached or exceeded 120. If so it calls `stopVoiceMemoRecording` synchronously. The interval ID is written to `vmTimer` via `set_vmTimer`.

After starting the interval, the function `await`s `startRecording()` imported from `voicememo.ts`. If `startRecording()` throws, the catch block sets the status element's `textContent` to `'Mic access denied'` and then calls `resetVoiceMemoUI`. There is no re-throw; the error is silently swallowed beyond the status update. If `startRecording()` resolves without throwing, no further action is taken. The function returns `Promise<void>`.

### stopVoiceMemoRecording

This function is synchronous. It writes `false` to `vmRecording` via `set_vmRecording`. It then reads `vmTimer` from module state and, if it is truthy, calls `clearInterval(vmTimer)` to stop the running interval. It queries the DOM for four elements: `arena-record-btn`, `arena-vm-status`, `arena-vm-cancel`, and `arena-vm-send`. It removes the `recording` CSS class from the record button, sets the record button's `textContent` to the Unicode record symbol (⏺), and sets the status element's `textContent` to a string that includes the formatted duration by calling `formatTimer(vmSeconds)` with the current module-level `vmSeconds` value. It removes the `arena-hidden` class from both the cancel and send buttons, making them visible. Finally it calls `stopRecording()` (imported from `voicememo.ts`) as a fire-and-forget async call (void-cast). The function returns `void` and writes nothing to module-level state beyond what `set_vmRecording` and `clearInterval` affect.

### resetVoiceMemoUI

This function is synchronous. It writes `false` to `vmRecording` via `set_vmRecording` and `0` to `vmSeconds` via `set_vmSeconds`. It reads `vmTimer` from module state and, if truthy, calls `clearInterval(vmTimer)` — it does not call `set_vmTimer` to clear the stored timer reference, so `vmTimer` retains its previous value after this function returns. It queries the DOM for five elements: `arena-record-btn`, `arena-vm-status`, `arena-vm-timer`, `arena-vm-cancel`, and `arena-vm-send`. It removes the `recording` class from the record button, sets the record button's `textContent` to the Unicode record symbol (⏺), sets the status element's `textContent` to `'Tap to record your argument'`, adds the `arena-hidden` class to the timer element, and adds the `arena-hidden` class to both the cancel and send buttons. The function returns `void`.

### sendVoiceMemo

This is an async function. It reads the module-level `_sendingMemo` flag at the top; if it is `true` the function returns immediately, providing a guard against concurrent invocations. Otherwise it sets `_sendingMemo` to `true` and queries the DOM for `arena-vm-send` as an `HTMLButtonElement`, disabling it if found.

The remainder of the function body runs inside a `try` block with a `finally` that resets `_sendingMemo` to `false`. Inside the try block it reads `currentDebate` from module state (with a non-null assertion), reading `debate.role` as `side` and constructing `memoLabel` as a string containing the Unicode microphone emoji and the formatted duration from `formatTimer(vmSeconds)`.

It calls `addMessage(side, memoLabel, debate.round, false)` to add the memo to the local message list, then calls `resetVoiceMemoUI` to restore the recording UI to its initial state. It then `await`s `vmSend()` imported from `voicememo.ts`.

After `vmSend` resolves, it enters a conditional: if none of `isPlaceholder()` returns true, `debate.id` starts with `'ai-local-'`, or `debate.id` starts with `'placeholder-'`, it enters a nested `try` block that `await`s `safeRpc('submit_debate_message', ...)` with `p_debate_id`, `p_round`, `p_side`, and `p_content` (set to `memoLabel`). The nested catch block is empty except for a comment reading `/* warned */`, so RPC failures are silently swallowed.

After the conditional RPC block, it calls `addSystemMessage('Voice memo sent — waiting for opponent...')` and queries the DOM for `arena-record-btn` as an `HTMLButtonElement`, disabling it if found.

It then branches on whether the debate is in placeholder mode: if `isPlaceholder()` returns true or `debate.id` starts with `'placeholder-'`, it calls `setTimeout` with a delay of `3000 + Math.random() * 4000` milliseconds. Inside that callback it computes `oppSide` as the opposite of `side` (toggling between `'a'` and `'b'`), calls `addMessage(oppSide, '🎙 Voice memo (0:47)', debate.round, false)`, re-enables the record button, and calls `advanceRound()`. Otherwise — in the non-placeholder branch — it calls `startOpponentPoll(debate.id, side, debate.round)` synchronously to begin polling for the opponent's response. The `finally` block sets `_sendingMemo` back to `false` regardless of which path was taken or whether any error was thrown. The function returns `Promise<void>`.

## Agent 02

### wireVoiceMemoControls

This synchronous function reads nothing from module-level state at call time. It queries the DOM for three elements by ID — `arena-record-btn`, `arena-vm-cancel`, and `arena-vm-send` — using optional chaining, so each listener is attached only if the element exists. On the record button's `click` event, it reads the module-level state variable `vmRecording`: if `vmRecording` is falsy, it calls `startVoiceMemoRecording` (fire-and-forget, `void`); if truthy, it calls `stopVoiceMemoRecording` synchronously. On the cancel button's `click` event, it calls `vmRetake` (imported from `voicememo.ts`) followed by `resetVoiceMemoUI`, both synchronously. On the send button's `click` event, it calls `sendVoiceMemo` fire-and-forget (`void`). The function returns `void` and writes nothing to module-level state.

### startVoiceMemoRecording

This is an async function. It begins by writing to module-level state: `set_vmRecording(true)` and `set_vmSeconds(0)`. It then queries the DOM for three elements — `arena-record-btn`, `statusEl` (`arena-vm-status`), and `timerEl` (`arena-vm-timer`). It adds the CSS class `recording` to the record button, sets its `textContent` to the stop character `⏹` (U+23F9), sets `statusEl.textContent` to `'Recording...'`, and removes the `arena-hidden` class from `timerEl`.

It then calls `setInterval` with a 1000ms callback and passes the returned handle to `set_vmTimer`. Each tick of that interval calls `set_vmSeconds(vmSeconds + 1)` — reading the current `vmSeconds` state variable at tick time — updates `timerEl.textContent` to `formatTimer(vmSeconds)`, and then checks whether `vmSeconds >= 120`; if so, it calls `stopVoiceMemoRecording` synchronously and the interval continues to run (the interval itself is not cleared inside the tick; `stopVoiceMemoRecording` clears it via `vmTimer`).

After setting the interval, the function enters a `try` block and awaits `startRecording()` (imported from `voicememo.ts`). If `startRecording()` throws, the `catch` block sets `statusEl.textContent` to `'Mic access denied'` and calls `resetVoiceMemoUI`. The function does not re-throw in the catch block. The function returns `Promise<void>`.

### stopVoiceMemoRecording

This synchronous function writes `set_vmRecording(false)` to module-level state, then reads `vmTimer` and calls `clearInterval(vmTimer)` if `vmTimer` is truthy. It queries the DOM for four elements: `arena-record-btn`, `statusEl` (`arena-vm-status`), `cancelBtn` (`arena-vm-cancel`), and `sendBtn` (`arena-vm-send`). It removes the `recording` CSS class from the record button, sets its `textContent` to the record circle character `⏺` (U+23FA), sets `statusEl.textContent` to a string incorporating `formatTimer(vmSeconds)` — reading `vmSeconds` from module-level state at call time — and removes `arena-hidden` from both `cancelBtn` and `sendBtn`.

It then calls `stopRecording()` (imported from `voicememo.ts`) fire-and-forget (`void`). There is no error handling around that call. The function returns `void`.

### resetVoiceMemoUI

This synchronous function writes `set_vmRecording(false)` and `set_vmSeconds(0)` to module-level state, then reads `vmTimer` and calls `clearInterval(vmTimer)` if truthy. It queries the DOM for five elements: `arena-record-btn`, `statusEl` (`arena-vm-status`), `timerEl` (`arena-vm-timer`), `cancelBtn` (`arena-vm-cancel`), and `sendBtn` (`arena-vm-send`). It removes `recording` from the record button's class list, sets its `textContent` to `⏺` (U+23FA), sets `statusEl.textContent` to `'Tap to record your argument'`, adds `arena-hidden` to `timerEl`, and adds `arena-hidden` to both `cancelBtn` and `sendBtn`. The function makes no external calls and returns `void`.

### sendVoiceMemo

This is an async function guarded by the module-level boolean `_sendingMemo`. If `_sendingMemo` is already `true` at entry, the function returns immediately. Otherwise, it sets `_sendingMemo = true`, then queries the DOM for `arena-vm-send` as an `HTMLButtonElement` and sets its `disabled` property to `true`. The rest of the function body runs inside a `try` block with a `finally` that resets `_sendingMemo = false` unconditionally.

Inside the `try`, it reads `currentDebate` from module-level state with a non-null assertion (`!`), extracting `debate.role` as `side` and constructing `memoLabel` as a string incorporating `formatTimer(vmSeconds)`. It calls `addMessage(side, memoLabel, debate.round, false)` synchronously to add a local chat entry, then calls `resetVoiceMemoUI` synchronously. It then awaits `vmSend()` (imported from `voicememo.ts`).

After `vmSend` resolves, it evaluates a guard condition: if `isPlaceholder()` returns false and `debate.id` does not start with `'ai-local-'` and does not start with `'placeholder-'`, it enters an inner `try` block and awaits `safeRpc('submit_debate_message', { p_debate_id, p_round, p_side, p_content })`. If that `safeRpc` call throws, the inner `catch` swallows the error silently with a comment `/* warned */`.

Regardless of the guard branch taken, it calls `addSystemMessage('Voice memo sent — waiting for opponent...')` and then queries the DOM for `arena-record-btn` as an `HTMLButtonElement` and disables it.

It then branches on `isPlaceholder()` or `debate.id.startsWith('placeholder-')`: if true, it calls `setTimeout` with a delay of `3000 + Math.random() * 4000` milliseconds. Inside that timeout callback, it computes `oppSide` as the opposite of `side` (i.e., `'b'` if `side === 'a'`, `'a'` otherwise), calls `addMessage(oppSide, '🎙 Voice memo (0:47)', debate.round, false)`, re-enables `recordBtn`, and calls `advanceRound()`. The `setTimeout` callback is fire-and-forget and not awaited. If the placeholder condition is false, it calls `startOpponentPoll(debate.id, side, debate.round)` synchronously. The function returns `Promise<void>`.

## Agent 03

### wireVoiceMemoControls

This synchronous function reads no parameters and no module-level state. It queries the DOM for three elements by ID — `arena-record-btn`, `arena-vm-cancel`, and `arena-vm-send` — using optional chaining, so absent elements are silently ignored. It attaches a `click` listener to each. The `arena-record-btn` listener reads the module-level state variable `vmRecording` at the moment of the click: if `vmRecording` is falsy, it calls `startVoiceMemoRecording()` as a fire-and-forget void call; if `vmRecording` is truthy, it calls `stopVoiceMemoRecording()` synchronously. The `arena-vm-cancel` listener calls the imported `vmRetake()` from `voicememo.ts` and then calls `resetVoiceMemoUI()`. The `arena-vm-send` listener calls `sendVoiceMemo()` as a fire-and-forget void call. The function returns `void` and has no error paths or conditional branches beyond the `vmRecording` check inside the first listener.

### startVoiceMemoRecording

This is an async function. It takes no parameters. It begins by writing to module-level state: it calls `set_vmRecording(true)` and `set_vmSeconds(0)`. It then queries the DOM for three elements: `arena-record-btn`, `arena-vm-status`, and `arena-vm-timer`. On `recordBtn` it adds the CSS class `recording` and sets its `textContent` to the stop character `⏹` (U+23F9). On `statusEl` it sets `textContent` to `'Recording...'`. On `timerEl` it removes the class `arena-hidden`. It then calls `set_vmTimer(setInterval(..., 1000))` to start a one-second interval; the interval callback calls `set_vmSeconds(vmSeconds + 1)`, reads the updated `vmSeconds` from module state to set `timerEl.textContent` via the imported `formatTimer()`, and if `vmSeconds` is greater than or equal to 120 it calls `stopVoiceMemoRecording()` to halt the recording at the two-minute limit. After starting the interval, the function enters a `try/catch` block and awaits `startRecording()` from `voicememo.ts`. If `startRecording()` throws — the only described error being microphone access denial — the catch block sets `statusEl.textContent` to `'Mic access denied'` and then calls `resetVoiceMemoUI()`. The function returns `Promise<void>` in all paths. Note that the interval is started before `startRecording()` is awaited, so the timer is running even if the mic permission prompt is still pending; if `startRecording()` then throws, `resetVoiceMemoUI()` will clear the interval.

### stopVoiceMemoRecording

This synchronous function takes no parameters. It writes `false` to module-level state via `set_vmRecording(false)`. It reads `vmTimer` from module state: if `vmTimer` is truthy, it calls `clearInterval(vmTimer)` to stop the tick. It then queries the DOM for four elements: `arena-record-btn`, `arena-vm-status`, `arena-vm-cancel`, and `arena-vm-send`. On `recordBtn` it removes the class `recording` and sets `textContent` to the record character `⏺` (U+23FA). On `statusEl` it sets `textContent` to a string that reads `"Recorded <formatted duration> — send or retake"`, building the duration by calling `formatTimer(vmSeconds)` against the current module-level `vmSeconds` value. On `cancelBtn` and `sendBtn` it removes the class `arena-hidden`, making both buttons visible. Finally, it calls `void stopRecording()` from `voicememo.ts` as fire-and-forget. The function has no branches beyond optional-chaining null guards and no error path. It returns `void`.

### resetVoiceMemoUI

This synchronous function takes no parameters. It writes to module-level state: `set_vmRecording(false)` and `set_vmSeconds(0)`. It reads `vmTimer` from module state and, if truthy, calls `clearInterval(vmTimer)`. It then queries the DOM for five elements: `arena-record-btn`, `arena-vm-status`, `arena-vm-timer`, `arena-vm-cancel`, and `arena-vm-send`. On `recordBtn` it removes the class `recording` and sets `textContent` to `⏺` (U+23FA). On `statusEl` it sets `textContent` to `'Tap to record your argument'`. On `timerEl` it adds the class `arena-hidden`. On `cancelBtn` and `sendBtn` it adds the class `arena-hidden`. The function does not write a new value to the `vmTimer` state variable; after `clearInterval` the old handle remains in `vmTimer` until the next call to `set_vmTimer`. The function has no branches beyond optional-chaining null guards, no error path, and returns `void`.

### sendVoiceMemo

This is an async function. It reads the module-level variable `_sendingMemo` (declared at line 89, initialized to `false`) on entry: if `_sendingMemo` is already `true`, it returns immediately, making the function non-reentrant. Otherwise it sets `_sendingMemo = true`. It queries the DOM for `arena-vm-send` as an `HTMLButtonElement` and, if found, sets `disabled = true`. The remainder of the function body runs inside a `try/finally` block; the `finally` clause sets `_sendingMemo = false`, so the lock is always released.

Inside the `try` block, it reads `currentDebate` from module state (non-null asserted with `!`), extracts `debate.role` as `side`, and builds a `memoLabel` string of the form `"🎙 Voice memo (M:SS)"` using `formatTimer(vmSeconds)`. It then calls `addMessage(side, memoLabel, debate.round, false)` to post the label as an outgoing chat message, and calls `resetVoiceMemoUI()` to reset all recording controls. It then awaits `vmSend()` from `voicememo.ts`.

After `vmSend()` resolves, it evaluates whether to persist the message: the condition skips persistence if `isPlaceholder()` returns `true`, or if `debate.id` starts with `'ai-local-'`, or if `debate.id` starts with `'placeholder-'`. When none of those conditions are true, it enters a nested `try/catch` and awaits `safeRpc('submit_debate_message', ...)` with `p_debate_id`, `p_round`, `p_side`, and `p_content` set to `memoLabel`. The catch block is empty (comment reads `/* warned */`), so RPC failures are silently swallowed.

After the conditional RPC, it calls `addSystemMessage('Voice memo sent — waiting for opponent...')` and queries the DOM again for `arena-record-btn` as an `HTMLButtonElement`, setting its `disabled = true`. It then forks on the placeholder check: if `isPlaceholder()` returns `true` or `debate.id` starts with `'placeholder-'`, a `setTimeout` fires after a random delay between 3000 ms and 7000 ms, which calls `addMessage()` with the opponent side and a fixed label `"🎙 Voice memo (0:47)"`, re-enables `recordBtn` by setting `disabled = false`, and calls `advanceRound()`. In the non-placeholder branch, it calls `startOpponentPoll(debate.id, side, debate.round)` from `arena-room-live-poll.ts`, which is not awaited. The function returns `Promise<void>`.

## Agent 04

### wireVoiceMemoControls

This synchronous function reads no parameters and no module-level state. It queries the DOM three times by ID — `arena-record-btn`, `arena-vm-cancel`, and `arena-vm-send` — attaching click listeners to each element if it exists. The listener on `arena-record-btn` reads the module-level state variable `vmRecording` at the moment of each click: if `vmRecording` is falsy it calls `startVoiceMemoRecording()` as a fire-and-forget async invocation (`void`); if `vmRecording` is truthy it calls `stopVoiceMemoRecording()` synchronously. The listener on `arena-vm-cancel` calls `vmRetake()` (imported from `voicememo.ts`) followed immediately by `resetVoiceMemoUI()`. The listener on `arena-vm-send` calls `sendVoiceMemo()` as a fire-and-forget async invocation. The function returns `void` and writes nothing to module-level state itself.

### startVoiceMemoRecording

This is an `async` function. It begins by calling `set_vmRecording(true)` and `set_vmSeconds(0)`, writing those two pieces of module-level state. It then queries the DOM for `arena-record-btn`, `arena-vm-status`, and `arena-vm-timer`. On the record button it adds the CSS class `recording` and sets its `textContent` to the stop character (U+23F9, ⏹). On the status element it sets `textContent` to `'Recording...'`. On the timer element it removes the class `arena-hidden`.

It then calls `set_vmTimer(setInterval(..., 1000))`, registering a one-second interval and storing the returned handle via the state setter. On each tick the interval callback calls `set_vmSeconds(vmSeconds + 1)`, incrementing the counter by reading the current value of `vmSeconds` from module state and writing the incremented value back. It then updates `timerEl.textContent` with the result of `formatTimer(vmSeconds)`. If `vmSeconds` has reached or exceeded 120 the interval callback calls `stopVoiceMemoRecording()` synchronously, which has the effect of clearing the interval from within its own callback.

After installing the interval, the function enters a `try` block and `await`s `startRecording()` from `voicememo.ts`. If `startRecording()` throws — the only stated case being mic access denial — the `catch` block sets `statusEl.textContent` to `'Mic access denied'` and calls `resetVoiceMemoUI()`. The function returns `Promise<void>` and no value is explicitly returned in either path.

### stopVoiceMemoRecording

This is a synchronous function. It calls `set_vmRecording(false)` to write that module-level state. It then reads `vmTimer` from module state; if it is truthy it calls `clearInterval(vmTimer)`, stopping the tick interval that was started in `startVoiceMemoRecording`. It queries the DOM for four elements — `arena-record-btn`, `arena-vm-status`, `arena-vm-cancel`, `arena-vm-send`. On the record button it removes the class `recording` and sets `textContent` to the record character (U+23FA, ⏺). On the status element it sets `textContent` to a string combining `formatTimer(vmSeconds)` — reading `vmSeconds` from module state — with the static suffix ` — send or retake`. On the cancel and send buttons it removes the class `arena-hidden`, making them visible. Finally it calls `stopRecording()` from `voicememo.ts` as fire-and-forget (`void`). The function does not `await` that call and returns `void`.

### resetVoiceMemoUI

This is a synchronous function. It calls `set_vmRecording(false)` and `set_vmSeconds(0)`, writing both state variables. It reads `vmTimer` from module state; if truthy it calls `clearInterval(vmTimer)`. It then queries the DOM for five elements — `arena-record-btn`, `arena-vm-status`, `arena-vm-timer`, `arena-vm-cancel`, `arena-vm-send`. On the record button it removes the class `recording` and sets `textContent` to the record character (U+23FA). On the status element it sets `textContent` to `'Tap to record your argument'`. On the timer element it adds the class `arena-hidden`. On the cancel and send buttons it adds the class `arena-hidden`. The function returns `void` and calls no imported functions.

### sendVoiceMemo

This is an `async` function. It reads the module-level variable `_sendingMemo`; if it is truthy it returns immediately — this is the only early return. Otherwise it sets `_sendingMemo = true` and queries the DOM for `arena-vm-send`, disabling the button if found.

Inside a `try` block it reads `currentDebate` from module state (with a non-null assertion), extracting `debate.role` into `side` and constructing a `memoLabel` string using `formatTimer(vmSeconds)`. It calls `addMessage(side, memoLabel, debate.round, false)`, then calls `resetVoiceMemoUI()` to clear UI state. It `await`s `vmSend()` from `voicememo.ts`.

After `vmSend()` resolves, a nested `if` block checks three conditions on `debate.id` using `isPlaceholder()`, `.startsWith('ai-local-')`, and `.startsWith('placeholder-')`; if none of those conditions are met, it enters a nested `try` block and `await`s `safeRpc('submit_debate_message', ...)` with the debate ID, round, side, and memo label as named parameters. If that RPC throws, the inner `catch` block swallows the error silently with a comment `/* warned */`.

After the RPC block, it calls `addSystemMessage('Voice memo sent — waiting for opponent...')`. It queries `arena-record-btn` as an `HTMLButtonElement` and disables it.

The function then branches on `isPlaceholder()` or `debate.id.startsWith('placeholder-')`. In the placeholder branch, it fires a `setTimeout` — not awaited — with a delay of `3000 + Math.random() * 4000` milliseconds. When that timer fires it derives `oppSide` by flipping `side` between `'a'` and `'b'`, calls `addMessage(oppSide, '🎙 Voice memo (0:47)', debate.round, false)`, re-enables the record button, and calls `advanceRound()`. In the non-placeholder branch it calls `startOpponentPoll(debate.id, side, debate.round)` synchronously. The `finally` block sets `_sendingMemo = false` regardless of which branch executed or whether any awaited call threw.

## Agent 05

### wireVoiceMemoControls

This synchronous function reads no parameters and no module-level state. It queries the DOM for three elements by ID — `arena-record-btn`, `arena-vm-cancel`, and `arena-vm-send` — and attaches click listeners to each using optional chaining, so if any element is absent the listener is silently skipped. The `arena-record-btn` listener reads the module-level state variable `vmRecording` at the moment of each click: if `vmRecording` is falsy it calls `startVoiceMemoRecording()` as a fire-and-forget void expression; if `vmRecording` is truthy it calls `stopVoiceMemoRecording()` synchronously. The `arena-vm-cancel` listener calls `vmRetake()` (imported from `voicememo.ts`) synchronously, then calls `resetVoiceMemoUI()`. The `arena-vm-send` listener calls `sendVoiceMemo()` as a fire-and-forget void expression. The function returns `void` and writes nothing beyond attaching these listeners.

### startVoiceMemoRecording

This is an `async` function that takes no parameters. It begins by calling `set_vmRecording(true)` and `set_vmSeconds(0)`, writing to the `vmRecording` and `vmSeconds` module-level state variables in `arena-state.ts`. It then queries the DOM for `arena-record-btn`, `arena-vm-status`, and `arena-vm-timer`. It adds the `'recording'` CSS class to the record button, sets its `textContent` to the stop character `⏹`, sets the status element's text to `'Recording...'`, and removes the `'arena-hidden'` class from the timer element, making it visible.

It then calls `set_vmTimer(setInterval(..., 1000))`, storing a new interval handle in the `vmTimer` module-level state. Each tick of that interval calls `set_vmSeconds(vmSeconds + 1)`, incrementing the counter; reads the updated `vmSeconds` value and sets the timer element's text by calling `formatTimer(vmSeconds)`; then checks whether `vmSeconds >= 120` and, if so, calls `stopVoiceMemoRecording()` synchronously to enforce a 120-second cap.

After setting up the interval, the function enters a `try/catch` block and `await`s `startRecording()` (imported from `voicememo.ts`). If `startRecording()` rejects for any reason — the catch block receives no error parameter — the status element's text is set to `'Mic access denied'` and `resetVoiceMemoUI()` is called. The function returns `void` on both paths.

### stopVoiceMemoRecording

This synchronous function takes no parameters. It calls `set_vmRecording(false)`, writing to `vmRecording` in `arena-state.ts`. It then reads `vmTimer` and, if it is truthy, calls `clearInterval(vmTimer)` to stop the tick interval set up by `startVoiceMemoRecording`. It queries the DOM for `arena-record-btn`, `arena-vm-status`, `arena-vm-cancel`, and `arena-vm-send`. It removes the `'recording'` class from the record button, sets its text to the record character `⏺`, and sets the status element's text to a string that includes the recorded duration via `formatTimer(vmSeconds)`, reading the current value of the `vmSeconds` module-level state. It then removes the `'arena-hidden'` class from both the cancel and send buttons, making them visible. Finally, it calls `stopRecording()` (imported from `voicememo.ts`) as a fire-and-forget `void` expression — the returned promise is not awaited. The function itself returns `void`.

### resetVoiceMemoUI

This synchronous function takes no parameters. It calls `set_vmRecording(false)` and `set_vmSeconds(0)`, writing both module-level state variables to their zero/false values. It reads `vmTimer` and calls `clearInterval(vmTimer)` if it is truthy. It then queries the DOM for five elements: `arena-record-btn`, `arena-vm-status`, `arena-vm-timer`, `arena-vm-cancel`, and `arena-vm-send`. It removes the `'recording'` class from the record button, sets its text to `⏺`, sets the status element's text to `'Tap to record your argument'`, adds `'arena-hidden'` to the timer element (hiding it), and adds `'arena-hidden'` to both the cancel and send buttons (hiding them). No value is returned. Unlike `stopVoiceMemoRecording`, this function does not call `stopRecording()` from `voicememo.ts`; the caller is expected to have already called `vmRetake()` if a recording was in progress, as seen in the cancel listener in `wireVoiceMemoControls`.

### sendVoiceMemo

This is an `async` function that takes no parameters. It reads the module-level variable `_sendingMemo` (declared at line 89, scoped to this file) and returns immediately if it is `true`, providing a re-entrancy guard. If not already sending, it sets `_sendingMemo = true`, then queries the DOM for `arena-vm-send` and, if found, sets `sendBtn.disabled = true`.

The remainder of the function body runs inside a `try/finally` block that sets `_sendingMemo = false` in the `finally` clause regardless of outcome. Inside the `try` block: it reads `currentDebate` from `arena-state.ts` with a non-null assertion, reads `debate.role` as `side`, and constructs a label string `memoLabel` that includes the recorded duration via `formatTimer(vmSeconds)`. It then calls `addMessage(side, memoLabel, debate.round, false)` synchronously to post the memo label into the local message list, followed by `resetVoiceMemoUI()` to clear all recording UI state. It then `await`s `vmSend()` (imported from `voicememo.ts`) to complete the upload.

After `vmSend()` resolves, it checks three conditions on `debate.id`: `isPlaceholder()` (a call to the imported utility), whether the id starts with `'ai-local-'`, or whether it starts with `'placeholder-'`. If none of those are true, it enters a nested `try/catch` and `await`s `safeRpc('submit_debate_message', ...)` with `p_debate_id`, `p_round`, `p_side`, and `p_content` set to `memoLabel`. If `safeRpc` throws, the inner catch block swallows the error with no action beyond a comment `/* warned */`.

After the conditional RPC, it calls `addSystemMessage('Voice memo sent — waiting for opponent...')` synchronously, then reads `arena-record-btn` from the DOM and, if found, sets `recordBtn.disabled = true`.

It then forks on debate state: if `isPlaceholder()` returns true or `debate.id` starts with `'placeholder-'`, it calls `setTimeout` with a delay of `3000 + Math.random() * 4000` milliseconds. Inside that timeout callback, it derives the opponent side (`'b'` if `side === 'a'`, otherwise `'a'`), calls `addMessage` with that opponent side and a hardcoded label `'🎙 Voice memo (0:47)'`, re-enables `recordBtn`, and calls `advanceRound()`. If the debate is not a placeholder, it calls `startOpponentPoll(debate.id, side, debate.round)` synchronously. The `setTimeout` and `startOpponentPoll` paths are both fire-and-forget — neither is awaited. The function returns `void` after either branch.
