# Stage 2 Outputs — arena-deepgram.ts

## Agent 01

### startTranscription

`startTranscription` is async and accepts five parameters: `stream` (a `MediaStream`), `language` (a BCP-47 string), `onTranscript` (a required callback), `onInterim` (an optional callback), and `onStatus` (an optional callback). It first reads module-level `_active` and returns early with a console warning if `_active` is already true, preventing a double-start. If the guard passes, it writes `_active = true`, then writes `_stream`, `_language`, `_onTranscript`, `_onInterim`, and `_onStatus` from its parameters, normalizing absent optional callbacks to `null` and defaulting `language` to `'en'` if falsy. It also resets `_audioBuffer` to an empty array. It then calls `emitStatus('connecting')` synchronously, followed by `await connect()`, which blocks until the connection attempt resolves (successfully or on error).

### stopTranscription

`stopTranscription` is synchronous. It reads `_active` and returns immediately without any side effects if `_active` is false. Otherwise it writes `_active = false`, then calls `clearReconnectTimer()` to cancel any pending reconnect timeout. It reads `_ws` and checks whether `_ws` is non-null and its `readyState` equals `WebSocket.OPEN`. If so, it sends the JSON string `{"type":"Finalize"}` to flush any pending transcript on the Deepgram side (swallowing any send error in a catch block), then schedules a 500ms `setTimeout` that, when it fires, calls `closeCleanly()`. If `_ws` is null or not open, it calls `closeCleanly()` immediately instead.

### isTranscribing

`isTranscribing` is synchronous and takes no parameters. It reads `_active` and returns its current boolean value directly. It has no branches, writes nothing, and calls no other functions.

### connect

`connect` is async. It first calls the imported `fetchDeepgramToken()` and awaits its result, storing the resolved value in `token`. If `token` is falsy, it logs an error, calls `emitStatus('error')`, and returns early without opening a WebSocket. If `token` is truthy but `_active` has become false (the turn ended while the token was being fetched), it returns early with no further action. Otherwise it constructs a `URLSearchParams` object with fixed Deepgram query parameters (model `nova-3`, the current `_language`, punctuate, smart_format, interim_results, endpointing, and vad_events) and builds a `wss://` URL. It then attempts to construct a `WebSocket` inside a try/catch, passing `['token', token]` as the subprotocol array (the browser-compatible method for supplying an auth token). If the constructor throws, it calls `emitStatus('error')` and returns. On success it writes the new socket to `_ws` and registers four event handlers synchronously before returning.

The `onopen` handler writes `_reconnecting = false`, calls `emitStatus('live')`, then checks `_audioBuffer.length`. If the buffer is non-empty it iterates over it, sending each buffered `Blob` through `_ws.send()` only if the socket is still open at each iteration, then clears `_audioBuffer` to an empty array. It then calls `startRecording()`. The `onmessage` handler wraps its body in try/catch; it parses `event.data` as JSON and, if `msg.type === 'Results'`, calls `handleResult(msg)`. Non-Results message types and any parse errors are silently ignored. The `onerror` handler only logs the event. The `onclose` handler calls `stopRecording()` and then, if `_active` is true and `_reconnecting` is false, calls `attemptReconnect()`, treating the close as unexpected.

### handleResult

`handleResult` is synchronous and receives a single `DeepgramResult` parameter. It reads `msg.channel.alternatives[0]` via optional chaining and returns immediately if the result is absent. It then reads `alt.transcript`, trims whitespace, and again returns immediately if the resulting string is empty or falsy. It then branches on `msg.is_final`: if true, it checks `_onTranscript` and, if set, calls it with the trimmed text; if false (an interim result), it checks `_onInterim` and, if set, calls it with the trimmed text. It writes nothing to module-level state and calls no other functions on the anchor list.

### startRecording

`startRecording` is synchronous. It reads `_stream` and `_recorder` and returns immediately without action if `_stream` is null or `_recorder` is already set. Inside a try/catch it determines a MIME type by calling `MediaRecorder.isTypeSupported('audio/webm;codecs=opus')` first; if unsupported it falls back to `'audio/webm'`; if that too is unsupported it uses an empty string (browser default). It builds an `options` object, sets `options.mimeType` only if the resolved string is non-empty, then constructs a new `MediaRecorder` with `_stream` and those options, writing the result to `_recorder`. It registers two event handlers on `_recorder`: `ondataavailable` checks `event.data.size`; if zero it returns; if `_ws` is non-null and open it calls `_ws.send(event.data)`; else if `_reconnecting` is true it pushes `event.data` onto `_audioBuffer`. The `onerror` handler logs the error. Finally it calls `_recorder.start(CHUNK_INTERVAL_MS)`, which begins firing `ondataavailable` every 250ms. If the try block throws at any point, the catch block calls `emitStatus('error')`.

### stopRecording

`stopRecording` is synchronous. It reads `_recorder` and returns without action if it is null. If non-null, it checks `_recorder.state` and calls `_recorder.stop()` only if the state is not already `'inactive'`, wrapping the call in a try/catch that silently ignores any error. After the attempt it writes `_recorder = null`.

### attemptReconnect

`attemptReconnect` is synchronous. It writes `_reconnecting = true` and logs a message. It calls `clearReconnectTimer()` to cancel any existing timer before setting a new one. It then assigns a new `setTimeout` (using `RECONNECT_TIMEOUT_MS` = 5000ms) to `_reconnectTimer`. When that timer fires, if `_active` and `_reconnecting` are both still true, it logs a Tier 2 warning, calls `emitStatus('paused')`, and then calls `tryReconnectLoop()` to begin periodic retry attempts. After registering the timer, `attemptReconnect` makes a fire-and-forget call to `connect()` (via `void connect()`) and returns. Note that `stopRecording` is not called here; the `MediaRecorder` is intentionally left running to buffer audio into `_audioBuffer` while the WebSocket is being re-established.

### tryReconnectLoop

`tryReconnectLoop` is synchronous in its outer body but schedules async work. It reads `_active` and `_reconnecting` and returns immediately if either is false. Otherwise it assigns a new `setTimeout` with a 10-second delay to `_reconnectTimer`. When that timer fires, the async callback reads `_active` and `_reconnecting` again and returns early if either has become false. If both are still true, it logs a retry message and `await`s `connect()`. After `connect()` resolves, it checks `_active` and `_reconnecting` once more; if both are still true (meaning the reconnect attempt did not succeed in clearing `_reconnecting`), it calls `tryReconnectLoop()` recursively to schedule another 10-second attempt. The recursion terminates when `_reconnecting` becomes false (set in the `onopen` handler of `connect`) or when `_active` becomes false.

### closeCleanly

`closeCleanly` is synchronous. It calls `stopRecording()` first, which nulls `_recorder`. It then reads `_ws`; if non-null it checks whether `readyState` is either `OPEN` or `CONNECTING`, and if so, sends the JSON string `{"type":"CloseStream"}` and calls `_ws.close(1000, 'Turn ended')`, both inside a try/catch that discards errors. It then unconditionally writes `_ws = null`. After handling the WebSocket it writes `_audioBuffer = []` to discard any buffered audio, writes `_reconnecting = false`, calls `clearReconnectTimer()`, and finally calls `emitStatus('stopped')`.

### clearReconnectTimer

`clearReconnectTimer` is synchronous. It reads `_reconnectTimer` and, if it is non-null, calls the browser's `clearTimeout` with it and writes `_reconnectTimer = null`. If `_reconnectTimer` is already null it does nothing.

### emitStatus

`emitStatus` is synchronous. It accepts one parameter of type `DeepgramStatus`. It reads `_onStatus` and, if it is non-null, calls it with the provided status value. It writes nothing to module-level state and calls no other functions on the anchor list.

### cleanupDeepgram

`cleanupDeepgram` is synchronous. It writes `_active = false` first, then calls `closeCleanly()`, which calls `stopRecording()`, nulls and closes `_ws`, clears `_audioBuffer`, writes `_reconnecting = false`, calls `clearReconnectTimer()`, and calls `emitStatus('stopped')`. After `closeCleanly()` returns, `cleanupDeepgram` writes `_onTranscript = null`, `_onInterim = null`, `_onStatus = null`, and `_stream = null`. Note that the `emitStatus('stopped')` call inside `closeCleanly()` fires while `_onStatus` is still set; it is only nulled afterward, so the caller will receive the `'stopped'` status event.

## Agent 02

### startTranscription

`startTranscription` is an async function that accepts a `MediaStream`, a BCP-47 language string, a required `TranscriptCallback`, and optional `onInterim` and `onStatus` callbacks. On entry it reads module-level `_active`; if already `true` it logs a warning and returns immediately, preventing a double-start. Otherwise it writes `_active = true`, then writes `_stream`, `_language`, `_onTranscript`, `_onInterim`, and `_onStatus` from its arguments, and resets `_audioBuffer` to an empty array. It then calls `emitStatus('connecting')` to fire the status callback synchronously, and finally awaits `connect()`. The function returns `Promise<void>` and has no value to return beyond signaling completion.

### stopTranscription

`stopTranscription` is a synchronous function that reads `_active`; if `false` it returns immediately. Otherwise it writes `_active = false` and calls `clearReconnectTimer()` to cancel any pending reconnect timeout. It then reads `_ws` and checks whether `_ws.readyState` equals `WebSocket.OPEN`. If so, it attempts a `_ws.send` of a JSON `{ type: 'Finalize' }` message inside a try/catch that swallows any send error, then schedules `closeCleanly()` to run after a 500 ms `setTimeout` — fire-and-forget. If the socket is not open (null, closing, or closed), it calls `closeCleanly()` immediately. The 500 ms delay is intended to give Deepgram time to return final results before the connection closes.

### isTranscribing

`isTranscribing` is a synchronous function that reads module-level `_active` and returns it directly as a `boolean`. It reads no parameters, writes no state, and calls no other functions.

### connect

`connect` is an async function with no parameters. It first awaits `fetchDeepgramToken()` — an imported async call that contacts a Supabase Edge Function and returns a short-lived JWT string or null. If the token is null or falsy, it calls `emitStatus('error')` and returns early without opening a socket. If the token is valid but `_active` has become `false` while the await was in flight (turn ended during fetch), the function returns without opening a socket.

With a valid token, `connect` reads `_language` from module state, builds a `URLSearchParams` object with fixed Deepgram parameters (`model: nova-3`, `punctuate`, `smart_format`, `interim_results`, `endpointing: 300`, `vad_events`), and constructs a `wss://` URL. It then wraps `new WebSocket(url, ['token', token])` in a try/catch; on construction failure it calls `emitStatus('error')` and returns. On success it assigns the socket to `_ws` and attaches four event handlers.

The `onopen` handler writes `_reconnecting = false` and calls `emitStatus('live')`. It then reads `_audioBuffer`; if it is non-empty it iterates the array and sends each `Blob` chunk to the socket if `_ws.readyState` is still `OPEN`, then empties `_audioBuffer`. It concludes by calling `startRecording()`. The `onmessage` handler JSON-parses incoming data inside a try/catch; on a parse error or binary frame it does nothing. If the parsed object has `type === 'Results'` it calls `handleResult(msg)`. The `onerror` handler logs the event with a warning but does not change state or attempt a reconnect. The `onclose` handler calls `stopRecording()`, then reads `_active` and `_reconnecting`; if both `_active` is `true` and `_reconnecting` is `false` it calls `attemptReconnect()` to respond to an unexpected closure.

### handleResult

`handleResult` is a synchronous function that takes a `DeepgramResult` message object. It reads `msg.channel?.alternatives?.[0]` using optional chaining; if absent it returns immediately. It then reads `alt.transcript` and trims it; if the result is an empty string it returns immediately. It then reads `msg.is_final`: if `true` and `_onTranscript` is non-null, it calls `_onTranscript(text)` with the trimmed string; if `false` (an interim result) and `_onInterim` is non-null, it calls `_onInterim(text)`. The function writes no module state and has no return value.

### startRecording

`startRecording` is a synchronous function with no parameters. It reads module-level `_stream` and `_recorder`; if `_stream` is null or `_recorder` is already non-null it returns immediately, preventing duplicate recorders. Inside a try/catch it calls `MediaRecorder.isTypeSupported` twice — first for `'audio/webm;codecs=opus'`, then for `'audio/webm'` — to select a MIME type, defaulting to an empty string (browser default) if neither is supported. It constructs a `MediaRecorderOptions` object, populating `mimeType` only when a non-empty type was found, then creates a new `MediaRecorder` from `_stream` and the options object, writing the result to `_recorder`.

It attaches an `ondataavailable` handler that reads `event.data.size`; if zero the handler returns. If `_ws` exists and `_ws.readyState` is `OPEN`, the handler sends the chunk directly. If `_ws` is not open but `_reconnecting` is `true`, the handler pushes the chunk onto `_audioBuffer`. If neither condition holds the chunk is silently dropped. A separate `onerror` handler logs the error. Finally it calls `_recorder.start(CHUNK_INTERVAL_MS)` — the constant `250` — which causes the browser to fire `ondataavailable` every 250 ms. If any step inside the try block throws, the catch block calls `emitStatus('error')` and returns without a recorder running.

### stopRecording

`stopRecording` is a synchronous function with no parameters. It reads `_recorder`; if null it returns without action. Otherwise it checks `_recorder.state`: if not `'inactive'` it calls `_recorder.stop()` inside a try/catch that swallows errors. It then writes `_recorder = null`. The function does not touch `_stream`, `_ws`, or any other state.

### attemptReconnect

`attemptReconnect` is a synchronous function with no parameters. It writes `_reconnecting = true`, then calls `clearReconnectTimer()` to cancel any existing timeout. It then sets `_reconnectTimer` to a new `setTimeout` callback scheduled `RECONNECT_TIMEOUT_MS` (5000 ms) in the future. That callback reads `_active` and `_reconnecting`; if both are still `true` it calls `emitStatus('paused')` and then calls `tryReconnectLoop()`. After registering the timer, `attemptReconnect` synchronously calls `connect()` as a fire-and-forget (`void connect()`) — it does not await the result. The immediate `connect()` call represents the Tier 1 retry; the 5-second timer and subsequent `tryReconnectLoop()` represent escalation to Tier 2.

### tryReconnectLoop

`tryReconnectLoop` is a synchronous function with no parameters. It reads `_active` and `_reconnecting`; if either is falsy it returns immediately. Otherwise it assigns a new `setTimeout` to `_reconnectTimer`, scheduled 10000 ms out. The timer callback is async: it re-reads `_active` and `_reconnecting` and returns without action if either is false. Otherwise it awaits `connect()`. After `connect()` returns, the callback re-reads `_active` and `_reconnecting`; if both are still `true` — meaning `connect()` did not successfully set `_reconnecting = false` via `onopen` — it calls `tryReconnectLoop()` recursively, scheduling another 10-second retry. Each call to `tryReconnectLoop` thus writes exactly one entry to `_reconnectTimer` (overwriting whatever `clearReconnectTimer` or the prior call left there) and creates at most one pending timer.

### closeCleanly

`closeCleanly` is a synchronous function with no parameters. It first calls `stopRecording()`, which nulls `_recorder`. It then reads `_ws`; if non-null it enters a try/catch block. Inside, if `_ws.readyState` is `OPEN` or `CONNECTING`, it calls `_ws.send(JSON.stringify({ type: 'CloseStream' }))` followed by `_ws.close(1000, 'Turn ended')`; errors from either call are swallowed. Whether or not the send/close succeeds, it then writes `_ws = null`. After the `_ws` block it writes `_audioBuffer = []` and `_reconnecting = false`, calls `clearReconnectTimer()`, and finally calls `emitStatus('stopped')`.

### clearReconnectTimer

`clearReconnectTimer` is a synchronous function with no parameters. It reads `_reconnectTimer`; if non-null it calls `clearTimeout(_reconnectTimer)` and writes `_reconnectTimer = null`. If `_reconnectTimer` is already null it returns without action. It calls no other functions from the anchor list.

### emitStatus

`emitStatus` is a synchronous function that takes a `DeepgramStatus` value. It reads `_onStatus`; if non-null it calls `_onStatus(status)`, passing the argument through. If `_onStatus` is null it does nothing. It writes no state and has no return value.

### cleanupDeepgram

`cleanupDeepgram` is a synchronous exported function with no parameters. It writes `_active = false` unconditionally, then calls `closeCleanly()`, which stops the recorder, sends a `CloseStream` message if the socket is open, nulls `_ws`, empties `_audioBuffer`, clears the reconnect timer, and calls `emitStatus('stopped')`. After `closeCleanly()` returns, `cleanupDeepgram` writes `_onTranscript = null`, `_onInterim = null`, `_onStatus = null`, and `_stream = null`, severing all external references. Note that `emitStatus('stopped')` fires from inside `closeCleanly()` before `_onStatus` is nulled, so the status callback receives the final `'stopped'` event before being cleared.

## Agent 03

### startTranscription

`startTranscription` is an async function that accepts a `MediaStream`, a BCP-47 language string, a required `TranscriptCallback`, and optional `onInterim` and `onStatus` callbacks. On entry it reads `_active` and returns immediately with a console warning if `_active` is already `true`, preventing a double-start. Otherwise it sets `_active = true`, then writes `_stream`, `_language`, `_onTranscript`, `_onInterim`, and `_onStatus` from its parameters, and resets `_audioBuffer` to an empty array. It then calls `emitStatus('connecting')` synchronously to fire the status callback, followed by `await connect()` to open the WebSocket and begin recording. The function returns `Promise<void>` and the caller waits for `connect()` to settle before the promise resolves, though `connect()` itself only awaits the token fetch — the WebSocket lifecycle proceeds through event handlers after that.

### stopTranscription

`stopTranscription` is a synchronous function that reads `_active` and returns immediately with no side effects if it is `false`. When `_active` is `true`, it sets `_active = false` and calls `clearReconnectTimer()` to cancel any pending reconnect timeout. It then inspects `_ws`: if `_ws` is non-null and its `readyState` equals `WebSocket.OPEN`, it attempts to send a JSON `{ type: 'Finalize' }` message inside a try/catch that silently swallows errors, then schedules `closeCleanly()` via `setTimeout` with a 500 ms delay, giving Deepgram time to flush a final transcript. If `_ws` is null or not open, it calls `closeCleanly()` immediately without the delay.

### isTranscribing

`isTranscribing` is a synchronous function that reads `_active` and returns it directly as a `boolean`. It writes nothing and calls no other functions.

### connect

`connect` is an async function with no parameters. It first awaits `fetchDeepgramToken()`, which makes a network request to a Supabase Edge Function and returns either a short-lived JWT string or a falsy value. If the token is falsy, it logs an error, calls `emitStatus('error')`, and returns early without opening a WebSocket. After the await it checks `_active` a second time; if the turn ended while the token was being fetched, it returns early. On the happy path, it constructs a `URLSearchParams` object with fixed Deepgram streaming parameters — model `nova-3`, the current `_language`, punctuation, smart format, interim results, 300 ms endpointing, and VAD events — then builds the `wss://api.deepgram.com/v1/listen?...` URL. It attempts `new WebSocket(url, ['token', token])` inside a try/catch; if the constructor throws, it calls `emitStatus('error')` and returns.

On successful construction, four event handlers are attached to `_ws`. `onopen` sets `_reconnecting = false`, calls `emitStatus('live')`, iterates `_audioBuffer` sending each stored `Blob` to the socket if it remains open, clears `_audioBuffer`, then calls `startRecording()`. `onmessage` parses `event.data` as JSON inside a try/catch; if `msg.type === 'Results'`, it calls `handleResult(msg)`. Any parse error or non-Results message is silently dropped. `onerror` logs the event. `onclose` logs the code and reason, calls `stopRecording()`, and if `_active` is still `true` and `_reconnecting` is `false`, calls `attemptReconnect()` — indicating an unexpected disconnect during an active turn.

### handleResult

`handleResult` is a synchronous function that receives a `DeepgramResult` message object. It reads `msg.channel?.alternatives?.[0]` using optional chaining; if that value is falsy, it returns immediately. It then reads `alt.transcript`, trims it, and returns immediately if the result is an empty string. If `msg.is_final` is `true`, it calls `_onTranscript(text)` if `_onTranscript` is non-null, posting the final transcript to the calling code. If `msg.is_final` is `false`, it calls `_onInterim(text)` if `_onInterim` is non-null, forwarding the partial result. The function writes no module-level state and returns `void`.

### startRecording

`startRecording` is a synchronous function with no parameters. It reads `_stream` and `_recorder` and returns immediately if `_stream` is null or `_recorder` is already set, preventing a double-start. Inside a try/catch it determines a MIME type by calling `MediaRecorder.isTypeSupported('audio/webm;codecs=opus')` first, then `'audio/webm'`, falling back to an empty string for the browser default. It constructs a `MediaRecorderOptions` object and only sets `mimeType` on it if the chosen type is non-empty. It then instantiates `new MediaRecorder(_stream, options)` and assigns it to `_recorder`.

Two event handlers are attached to the recorder. `ondataavailable` receives a `BlobEvent`; if `event.data.size` is zero it is ignored. If `_ws` is open, the blob is sent immediately via `_ws.send(event.data)`. If `_ws` is not open but `_reconnecting` is `true`, the blob is pushed onto `_audioBuffer` for later replay. `onerror` logs the error. Finally `_recorder.start(CHUNK_INTERVAL_MS)` is called with `CHUNK_INTERVAL_MS = 250`, causing the browser to fire `ondataavailable` every 250 ms. If anything in the try block throws, the catch logs the error and calls `emitStatus('error')` without re-throwing.

### stopRecording

`stopRecording` is a synchronous function with no parameters. It reads `_recorder`; if it is null, the function returns without action. If `_recorder` exists, it enters a try/catch and calls `_recorder.stop()` only if `_recorder.state` is not `'inactive'`, guarding against an invalid-state error. Any exception is swallowed silently. It then sets `_recorder = null` unconditionally, releasing the reference regardless of whether the stop call succeeded or threw.

### attemptReconnect

`attemptReconnect` is a synchronous function with no parameters. It sets `_reconnecting = true`, logs that a Tier 1 reconnect is beginning, and calls `clearReconnectTimer()` to cancel any existing timer. It then sets `_reconnectTimer` to a new `setTimeout` callback with a delay of `RECONNECT_TIMEOUT_MS = 5000` ms. Inside that callback, if `_active` is still `true` and `_reconnecting` is still `true` after the 5-second window, it logs a Tier 2 escalation, calls `emitStatus('paused')`, and then calls `tryReconnectLoop()` to begin periodic retries. After setting that timer, it immediately fires `void connect()` as a fire-and-forget call — the returned promise is explicitly discarded, so `attemptReconnect` does not wait for the reconnect attempt to complete before returning.

### tryReconnectLoop

`tryReconnectLoop` is a synchronous function with no parameters. It reads `_active` and `_reconnecting` and returns immediately if either is `false`. Otherwise it sets `_reconnectTimer` to a `setTimeout` with a 10-second delay. Inside the callback it re-checks `_active` and `_reconnecting` and returns early if either has become `false`. Otherwise it logs a retry attempt and calls `await connect()` — making the timeout callback itself an async function. After `connect()` settles, it checks `_active` and `_reconnecting` once more; if both are still `true`, meaning `connect()`'s `onopen` handler has not cleared `_reconnecting`, it calls `tryReconnectLoop()` recursively to schedule the next 10-second retry. Each iteration overwrites `_reconnectTimer` with a new handle, so `clearReconnectTimer()` can cancel the currently pending timer at any time.

### closeCleanly

`closeCleanly` is a synchronous function with no parameters. It calls `stopRecording()` first, stopping and nulling `_recorder`. It then reads `_ws`; if non-null, it enters a try/catch and, if `_ws.readyState` is `OPEN` or `CONNECTING`, sends a JSON `{ type: 'CloseStream' }` message followed by `_ws.close(1000, 'Turn ended')`. Any error from either call is silently swallowed. After the try/catch it sets `_ws = null`. It then sets `_audioBuffer = []`, sets `_reconnecting = false`, calls `clearReconnectTimer()` to cancel any pending reconnect timer, and finally calls `emitStatus('stopped')` to notify the status callback. The function returns `void`.

### clearReconnectTimer

`clearReconnectTimer` is a synchronous function with no parameters. It reads `_reconnectTimer`; if it is non-null, it calls `clearTimeout(_reconnectTimer)` and sets `_reconnectTimer = null`. If `_reconnectTimer` is already null, the function returns without calling `clearTimeout`. It writes no other state and returns `void`.

### emitStatus

`emitStatus` is a synchronous function that accepts a `DeepgramStatus` value. It reads `_onStatus` and, if non-null, calls `_onStatus(status)`, forwarding the status string to the registered callback. It writes no state and returns `void`.

### cleanupDeepgram

`cleanupDeepgram` is a synchronous exported function with no parameters. It sets `_active = false` unconditionally, then calls `closeCleanly()`, which stops the recorder, closes and nulls `_ws`, clears `_audioBuffer`, clears `_reconnectTimer`, sets `_reconnecting = false`, and fires `emitStatus('stopped')` if `_onStatus` is still set at that point. After `closeCleanly()` returns, `cleanupDeepgram` nulls `_onTranscript`, `_onInterim`, `_onStatus`, and `_stream`, releasing all external references the module holds. Because `_onStatus` is nulled after `closeCleanly()` emits `'stopped'`, the final status emission is still delivered to the caller before the callback reference is dropped.

## Agent 04

### startTranscription

`startTranscription` is an async function that accepts a `MediaStream`, a BCP-47 language string, a required `TranscriptCallback`, and optional `TranscriptCallback` and `StatusCallback` arguments. On entry it reads `_active` and returns immediately with a console warning if it is already `true`, preventing double-starts. Otherwise it sets `_active = true`, writes `_stream`, `_language`, `_onTranscript`, `_onInterim`, and `_onStatus` from its arguments, and resets `_audioBuffer` to an empty array. It then calls `emitStatus('connecting')` to fire the status callback synchronously, followed by an awaited call to `connect()`. The function returns `Promise<void>` and has no return value after `connect()` resolves. It does not catch errors thrown by `connect()`; any rejection propagates to the caller.

### stopTranscription

`stopTranscription` is a synchronous function that takes no parameters. It reads `_active` and returns immediately if it is `false`. When `_active` is `true` it sets `_active = false`, then calls `clearReconnectTimer()` to cancel any pending reconnect timeout. It then reads `_ws` and checks whether `_ws.readyState === WebSocket.OPEN`. On the open branch it sends the JSON string `{ type: 'Finalize' }` inside a try/catch that discards any error, then schedules a `setTimeout` of 500 ms whose callback calls `closeCleanly()`. On the branch where `_ws` is null or not open it calls `closeCleanly()` immediately. The 500 ms delay exists to allow Deepgram to return a final transcript before the socket is torn down.

### isTranscribing

`isTranscribing` is a synchronous function that takes no parameters, reads the module-level boolean `_active`, and returns it directly. It performs no writes and has no side effects.

### connect

`connect` is an async function that takes no parameters and returns `Promise<void>`. It first awaits `fetchDeepgramToken()`, which is imported from `arena-deepgram.token.ts` and retrieves a short-lived JWT from an Edge Function. If the result is falsy it calls `emitStatus('error')`, logs an error, and returns early without touching `_ws` or `_recorder`. After a successful token fetch it checks `_active`; if the turn ended while the token was in flight it returns without opening a socket.

On the happy path it constructs a `wss://` URL with query parameters for the `nova-3` model, language, punctuation, smart formatting, interim results, 300 ms endpointing, and VAD events. It then calls `new WebSocket(url, ['token', token])`, passing the token as a subprotocol because browser WebSockets cannot set an `Authorization` header. This constructor call is wrapped in a try/catch that calls `emitStatus('error')` and returns on failure. The resulting socket is assigned to `_ws`.

Four event handlers are then assigned to `_ws`. `onopen` sets `_reconnecting = false`, calls `emitStatus('live')`, flushes any blobs accumulated in `_audioBuffer` by iterating and calling `_ws.send(chunk)` for each one while the socket remains open, clears `_audioBuffer`, then calls `startRecording()`. `onmessage` parses `event.data` as JSON inside a try/catch; if `msg.type === 'Results'` it calls `handleResult(msg)`; other message types and parse errors are silently ignored. `onerror` logs the event to the console but takes no other action. `onclose` calls `stopRecording()`, then checks whether `_active` is `true` and `_reconnecting` is `false`; if both conditions hold it calls `attemptReconnect()`, treating the close as unexpected. If either condition is false the close is considered intentional and no reconnect is initiated.

### handleResult

`handleResult` is a synchronous function that accepts a `DeepgramResult` message object. It reads `msg.channel?.alternatives?.[0]` using optional chaining and returns immediately if that value is absent. It then reads `alt.transcript`, trims it, and returns if the result is an empty string. If `msg.is_final` is `true` it calls `_onTranscript(text)` if `_onTranscript` is non-null, forwarding the final text to the registered callback. If `msg.is_final` is `false` it calls `_onInterim(text)` if `_onInterim` is non-null, forwarding the interim text. The function writes nothing to module state and returns `void`.

### startRecording

`startRecording` is a synchronous function that takes no parameters. It reads `_stream` and `_recorder` and returns immediately if `_stream` is null or `_recorder` is already set. Inside a try/catch block it calls `MediaRecorder.isTypeSupported` to pick a MIME type, preferring `'audio/webm;codecs=opus'`, then `'audio/webm'`, then falling back to an empty string that lets the browser choose. It constructs a `MediaRecorderOptions` object, populates `mimeType` only if a non-empty type was found, and instantiates `new MediaRecorder(_stream, options)`, assigning the result to `_recorder`.

Two event handlers are set on `_recorder`. `ondataavailable` reads `event.data.size`; if it is zero the chunk is discarded. Otherwise, if `_ws` is non-null and `_ws.readyState === WebSocket.OPEN` it sends the blob directly via `_ws.send(event.data)`. If the socket is not open but `_reconnecting` is `true` it appends the blob to `_audioBuffer` for later transmission. `onerror` logs the error to the console. Finally, `_recorder.start(CHUNK_INTERVAL_MS)` is called with a 250 ms timeslice. If any step in the try block throws, the catch path calls `emitStatus('error')` and returns, leaving `_recorder` in whatever partial state it reached before the error.

### stopRecording

`stopRecording` is a synchronous function that takes no parameters. It reads `_recorder`; if it is null the function returns without action. Otherwise it checks whether `_recorder.state !== 'inactive'` and calls `_recorder.stop()` inside a try/catch that discards any error. It then unconditionally sets `_recorder = null`. The function writes only `_recorder` and returns `void`.

### attemptReconnect

`attemptReconnect` is a synchronous function that takes no parameters. It sets `_reconnecting = true` and logs the attempt. It does not stop the existing `MediaRecorder`, leaving it running so that audio continues to accumulate in `_audioBuffer` during the reconnect window. It calls `clearReconnectTimer()` to cancel any pre-existing timer, then sets a new `setTimeout` of `RECONNECT_TIMEOUT_MS` (5000 ms) into `_reconnectTimer`. The timeout callback checks whether `_active` and `_reconnecting` are both still `true`; if so it calls `emitStatus('paused')` and then calls `tryReconnectLoop()` to begin 10-second periodic retries. After setting the timer, `attemptReconnect` calls `connect()` as a fire-and-forget (prefixed with `void`), initiating an immediate reconnect attempt without awaiting its result.

### tryReconnectLoop

`tryReconnectLoop` is a synchronous function that takes no parameters. It reads `_active` and `_reconnecting` and returns immediately if either is `false`. Otherwise it sets `_reconnectTimer` to a `setTimeout` of 10 000 ms. The callback is `async`: it first re-reads `_active` and `_reconnecting` and returns early if either has become `false`. It then awaits `connect()`. After `connect()` resolves it checks `_active` and `_reconnecting` again; if both remain `true` it calls `tryReconnectLoop()` recursively, scheduling another 10-second retry. Each invocation overwrites `_reconnectTimer` with a new timer handle, so `clearReconnectTimer()` called from any other path will cancel the currently pending iteration.

### closeCleanly

`closeCleanly` is a synchronous function that takes no parameters. It first calls `stopRecording()`, which stops the `MediaRecorder` and sets `_recorder = null`. It then reads `_ws`; if `_ws` is non-null and its `readyState` is either `WebSocket.OPEN` or `WebSocket.CONNECTING`, it sends the JSON string `{ type: 'CloseStream' }` and calls `_ws.close(1000, 'Turn ended')`, both inside a try/catch that discards errors. It then sets `_ws = null` regardless of whether the send or close succeeded. After clearing the socket it resets `_audioBuffer = []`, sets `_reconnecting = false`, calls `clearReconnectTimer()`, and finally calls `emitStatus('stopped')`.

### clearReconnectTimer

`clearReconnectTimer` is a synchronous function that takes no parameters. It reads `_reconnectTimer`; if it is non-null it calls `clearTimeout(_reconnectTimer)` and sets `_reconnectTimer = null`. If `_reconnectTimer` is already null the function returns without action. It returns `void` and has no other side effects.

### emitStatus

`emitStatus` is a synchronous function that accepts a `DeepgramStatus` value. It reads `_onStatus`; if `_onStatus` is non-null it calls `_onStatus(status)`, forwarding the status to the registered callback. If `_onStatus` is null the call is a no-op. The function writes nothing to module state and returns `void`.

### cleanupDeepgram

`cleanupDeepgram` is a synchronous exported function that takes no parameters. It sets `_active = false` first, which causes any concurrent `onclose` handler or reconnect loop callbacks to exit their `_active` guards without triggering further reconnects. It then calls `closeCleanly()`, which stops the recorder, closes and nulls `_ws`, clears `_audioBuffer`, clears the reconnect timer, and emits the `'stopped'` status. After `closeCleanly()` returns, it nulls the four callback references `_onTranscript`, `_onInterim`, `_onStatus`, and `_stream`, releasing all external references held by the module. This leaves the module in a fully inert state identical to its initial load-time state, ready for a fresh `startTranscription` call.

## Agent 05

### startTranscription

`startTranscription` is async and accepts five parameters: `stream` (a `MediaStream`), `language` (a BCP-47 string), `onTranscript` (a required callback), `onInterim` (an optional callback), and `onStatus` (an optional callback). On entry it checks the module-level boolean `_active`; if it is already `true`, it logs a warning and returns immediately without doing anything. If `_active` is `false`, it sets `_active = true`, writes `stream` into `_stream`, writes `language || 'en'` into `_language`, writes the three callbacks into `_onTranscript`, `_onInterim`, and `_onStatus` respectively (storing `null` for optional callbacks that were not provided), and resets `_audioBuffer` to an empty array. It then calls `emitStatus('connecting')` synchronously, and awaits `connect()`. The function does not return a value.

### stopTranscription

`stopTranscription` is synchronous. It reads `_active` and returns immediately if it is `false`. Otherwise it sets `_active = false` and calls `clearReconnectTimer()` to cancel any pending reconnect timeout. It then reads `_ws` and its `readyState`. If the socket exists and its `readyState` is `WebSocket.OPEN`, it wraps a `_ws.send(JSON.stringify({ type: 'Finalize' }))` in a try/catch (silently ignoring errors), then schedules `closeCleanly()` via `setTimeout` with a 500 ms delay, giving Deepgram time to flush a final transcript before the connection drops. If the socket is absent or not open, it calls `closeCleanly()` immediately. The function does not return a value.

### isTranscribing

`isTranscribing` is synchronous and takes no parameters. It reads the module-level boolean `_active` and returns it directly. It writes no state, calls no other functions, and has no branches or error paths.

### connect

`connect` is async. It first awaits `fetchDeepgramToken()`, an import from `arena-deepgram.token.ts` that calls a Supabase Edge Function and returns either a JWT string or a falsy value. If the result is falsy, it logs an error, calls `emitStatus('error')`, and returns without opening a socket. If the token was retrieved successfully, it checks `_active`; if the turn has ended while the token fetch was in progress, it returns immediately. Otherwise it builds a `URLSearchParams` object with fixed Deepgram query parameters (`model: 'nova-3'`, `language` from `_language`, `punctuate`, `smart_format`, `interim_results`, `endpointing: '300'`, `vad_events: 'true'`) and constructs the WebSocket URL. It wraps `new WebSocket(url, ['token', token])` in a try/catch; on construction error it calls `emitStatus('error')` and returns. On success it assigns the new socket to `_ws` and attaches four event handlers.

The `onopen` handler sets `_reconnecting = false`, calls `emitStatus('live')`, iterates over `_audioBuffer` sending each buffered `Blob` through the newly opened socket (guarding each send with a `readyState === OPEN` check), clears `_audioBuffer`, and then calls `startRecording()`. The `onmessage` handler parses `event.data` as JSON inside a try/catch (silently ignoring binary or unparseable frames); if the parsed message has `type === 'Results'` it passes the message to `handleResult`. The `onerror` handler logs the event. The `onclose` handler calls `stopRecording()`, then checks whether `_active` is still `true` and `_reconnecting` is `false`; if both conditions hold, it calls `attemptReconnect()` to begin the three-tier fallback. `connect` itself does not return a value.

### handleResult

`handleResult` is synchronous and receives a `DeepgramResult` object. It reads `msg.channel?.alternatives?.[0]` using optional chaining; if that value is absent, it returns immediately. It reads `alt.transcript` and trims it; if the trimmed string is empty or falsy, it returns. It then branches on `msg.is_final`: if `true`, and `_onTranscript` is non-null, it calls `_onTranscript(text)`; if `false` (an interim result), and `_onInterim` is non-null, it calls `_onInterim(text)`. The function writes no module-level state and returns no value.

### startRecording

`startRecording` is synchronous. It reads `_stream` and `_recorder`; if `_stream` is null or `_recorder` is already set, it returns immediately. Inside a try/catch it selects a MIME type by calling `MediaRecorder.isTypeSupported` first for `'audio/webm;codecs=opus'`, then for `'audio/webm'`, falling back to an empty string (browser default). It builds a `MediaRecorderOptions` object, only adding a `mimeType` key if a supported type was found. It constructs a `new MediaRecorder(_stream, options)` and assigns it to `_recorder`. It attaches an `ondataavailable` handler that reads `event.data.size`: if zero it discards the chunk; if the size is nonzero and `_ws` is open, it calls `_ws.send(event.data)`; if `_ws` is not open but `_reconnecting` is `true`, it pushes the chunk onto `_audioBuffer` instead. It attaches an `onerror` handler that logs the error. It then calls `_recorder.start(CHUNK_INTERVAL_MS)` (250 ms), which begins emitting `dataavailable` events at that interval. On any exception in the try/catch it logs the error and calls `emitStatus('error')`. The function writes `_recorder` and indirectly affects `_audioBuffer` through the event handler it registers.

### stopRecording

`stopRecording` is synchronous. It reads `_recorder`; if it is null the function returns without doing anything. If `_recorder` is set, it checks `_recorder.state`; if the state is not `'inactive'`, it calls `_recorder.stop()` inside a try/catch that silently ignores errors. It then sets `_recorder = null` unconditionally. The function writes no other state and returns no value.

### attemptReconnect

`attemptReconnect` is synchronous. It sets `_reconnecting = true` and logs a message. It calls `clearReconnectTimer()` to cancel any previously scheduled timer. It then sets a new `setTimeout` callback of `RECONNECT_TIMEOUT_MS` (5000 ms) into `_reconnectTimer`. That callback, when it fires, checks whether both `_active` and `_reconnecting` are still `true`; if so it calls `emitStatus('paused')` (Tier 2) and then calls `tryReconnectLoop()` to begin 10-second retries. After scheduling that timeout, `attemptReconnect` immediately fires off `connect()` as a fire-and-forget call (`void connect()`) without awaiting it, allowing the immediate reconnect attempt and the 5-second fallback timer to run concurrently. The function writes `_reconnecting` and `_reconnectTimer` and returns no value.

### tryReconnectLoop

`tryReconnectLoop` is synchronous in its outer body but schedules async work. On entry it reads `_active` and `_reconnecting`; if either is `false` it returns immediately. Otherwise it schedules a 10-second `setTimeout` callback into `_reconnectTimer`. When that callback fires it again checks `_active` and `_reconnecting` and returns if either is false. If both are still true it logs and awaits `connect()`. After `connect()` resolves, it checks `_active` and `_reconnecting` again; if both are still true (meaning the reconnect attempt did not succeed in clearing `_reconnecting`), it calls itself recursively, scheduling another 10-second retry. Because each recursive call creates a fresh `setTimeout`, the retry interval resets to 10 s on each iteration. The function writes `_reconnectTimer` and returns no value.

### closeCleanly

`closeCleanly` is synchronous. It first calls `stopRecording()`, which nulls out `_recorder`. It then reads `_ws`; if it is non-null and its `readyState` is either `OPEN` or `CONNECTING`, it wraps a two-step sequence in a try/catch: it calls `_ws.send(JSON.stringify({ type: 'CloseStream' }))` to signal Deepgram, then calls `_ws.close(1000, 'Turn ended')` with a normal-closure code. Any exception is silently ignored. It then sets `_ws = null` unconditionally. It sets `_audioBuffer = []`, sets `_reconnecting = false`, calls `clearReconnectTimer()` to cancel any pending timer, and calls `emitStatus('stopped')`. The function returns no value.

### clearReconnectTimer

`clearReconnectTimer` is synchronous. It reads `_reconnectTimer`; if it is non-null, it calls `clearTimeout(_reconnectTimer)` and sets `_reconnectTimer = null`. If it is already null, the function does nothing. It writes no other state and returns no value.

### emitStatus

`emitStatus` is synchronous. It accepts a single `DeepgramStatus` value. It reads `_onStatus`; if it is non-null, it calls `_onStatus(status)`. If `_onStatus` is null the function does nothing. It writes no state and returns no value.

### cleanupDeepgram

`cleanupDeepgram` is synchronous and exported for use at debate or room exit. It sets `_active = false`, then calls `closeCleanly()`, which calls `stopRecording()`, attempts a graceful WebSocket close, clears `_audioBuffer`, clears `_reconnecting`, cancels the reconnect timer, and emits status `'stopped'`. After `closeCleanly()` returns, `cleanupDeepgram` additionally nulls out all four callback references: `_onTranscript`, `_onInterim`, `_onStatus`, and `_stream`. This leaves the module in a fully inert state where no callbacks can be invoked and no stream reference is retained. The function returns no value.
