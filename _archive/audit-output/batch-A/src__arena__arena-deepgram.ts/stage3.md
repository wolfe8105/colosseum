# Stage 3 Outputs — arena-deepgram.ts

## Agent 01

### startTranscription
**Verdict: PASS**
All claims verified: async, 5 params, guard on `_active` with console.warn and early return, sets all module-level state variables, resets `_audioBuffer = []`, calls `emitStatus('connecting')` then `await connect()`. `_language` defaults to `'en'` if falsy. Correct.

### stopTranscription
**Verdict: PASS**
All claims verified: sync, early return if `!_active`, sets `_active = false`, calls `clearReconnectTimer()`, checks `_ws.readyState === WebSocket.OPEN`, sends `{type:'Finalize'}` in try/catch (ignores error), schedules `closeCleanly()` via `setTimeout(..., 500)`. Else branch calls `closeCleanly()` immediately. Correct.

### isTranscribing
**Verdict: PASS**
Returns `_active`. Correct.

### connect
**Verdict: PARTIAL**
Most claims correct. One ordering discrepancy: Agent 04 claims "calls emitStatus('error'), logs an error" (reversed order) — the source has `console.error` **then** `emitStatus('error')` in the falsy-token path. Agent 01 does not explicitly state the order but implies log-then-emit which matches. The `onopen` flush loop correctly guards `_ws.readyState === WebSocket.OPEN` before sending each buffered chunk. The URLSearchParams values (`nova-3`, `endpointing:300`, `vad_events:true`) are all confirmed. All four handlers registered. No material errors in Agent 01's description of this function.

### handleResult
**Verdict: PASS**
All claims verified: optional chaining to `msg.channel?.alternatives?.[0]`, early return if absent, trims transcript, early return if empty string, branches on `msg.is_final` — calls `_onTranscript(text)` if true, `_onInterim(text)` if false (when `_onInterim` is set). Correct.

### startRecording
**Verdict: PARTIAL**
Claims are mostly correct, but Agent 01 omits the `console.error('[Deepgram] MediaRecorder start failed:', err)` call in the catch block — only mentions `emitStatus('error')`. The source logs the error **before** calling `emitStatus('error')`. Also, Agent 01 does not flag that if the constructor `new MediaRecorder(...)` succeeds but a later line throws, `_recorder` is left non-null (pointing to an unstarted recorder) — but this is a `needs_review` item, not a false claim.

### stopRecording
**Verdict: PASS**
Claims verified: checks `_recorder` is not null, if `_recorder.state !== 'inactive'` calls `_recorder.stop()` inside try/catch (ignores error), sets `_recorder = null`. Correct.

### attemptReconnect
**Verdict: PASS**
All claims verified: sets `_reconnecting = true`, logs, calls `clearReconnectTimer()`, sets `_reconnectTimer` to `setTimeout` of `RECONNECT_TIMEOUT_MS` (5000ms) with inner guard `_active && _reconnecting` → `emitStatus('paused')` + `tryReconnectLoop()`, then calls `void connect()`. Order confirmed: timer set before `void connect()`. Correct.

### tryReconnectLoop
**Verdict: PASS**
All claims verified: early return if `!_active || !_reconnecting`, sets `_reconnectTimer` to `setTimeout` of 10000ms, async callback re-checks guards, calls `await connect()`, then recursively calls `tryReconnectLoop()` if still `_active && _reconnecting`. Correct.

### closeCleanly
**Verdict: PASS**
All claims verified: calls `stopRecording()`, checks `_ws` exists, tries `send({type:'CloseStream'})` and `close(1000, 'Turn ended')` if `OPEN || CONNECTING`, sets `_ws = null`, clears `_audioBuffer = []`, sets `_reconnecting = false`, calls `clearReconnectTimer()`, calls `emitStatus('stopped')`. Correct.

### clearReconnectTimer
**Verdict: PASS**
Checks `_reconnectTimer` is non-null, calls `clearTimeout`, sets to `null`. Correct.

### emitStatus
**Verdict: PASS**
Checks `_onStatus` is non-null, calls `_onStatus(status)`. Correct.

### cleanupDeepgram
**Verdict: PASS**
All claims verified: sets `_active = false`, calls `closeCleanly()`, nulls `_onTranscript`, `_onInterim`, `_onStatus`, `_stream`. Correct per Agent 01's description.

## needs_review

1. **`_language` not reset in `cleanupDeepgram`**: `_language` is initialized to `'en'` at declaration but is never reset in `cleanupDeepgram()` (nor in `closeCleanly()`). If `startTranscription` is called again after `cleanupDeepgram`, the previous language value persists until overwritten by the new call (which does overwrite it, so benign in practice — but it is the only module-level state variable not explicitly reset on cleanup). No agent flags this.

2. **`_recorder` left non-null on partial `startRecording` failure**: If `new MediaRecorder(_stream, options)` succeeds but a subsequent line (e.g., assigning `ondataavailable`) throws, `_recorder` is left pointing to an unstarted, non-null `MediaRecorder`. A subsequent call to `startRecording()` would then short-circuit on the `if (!_stream || _recorder) return` guard, making recording impossible without a full cleanup cycle. No agent flags this.

3. **Old closed `_ws` reference overwritten without explicit null in `attemptReconnect`**: When `onclose` fires and triggers `attemptReconnect()`, the closed socket is still referenced by `_ws`. `void connect()` then overwrites `_ws` with a new `WebSocket`. The old closed socket is never explicitly nulled before `connect()` runs. In practice this is harmless (the socket is already closed and GC-eligible once the reference is overwritten), but `closeCleanly()` guards on `_ws.readyState === OPEN || CONNECTING` so this is safe. Worth noting as a style inconsistency. No agent flags this.

4. **Double `closeCleanly()` race between `stopTranscription` and `cleanupDeepgram`**: `stopTranscription` schedules `closeCleanly()` via `setTimeout(..., 500)`. If `cleanupDeepgram()` is called within that 500ms window, it calls `closeCleanly()` immediately, setting `_ws = null` and clearing state. When the 500ms timeout fires, `closeCleanly()` runs again on an already-cleaned state. This is benign (null guards prevent double-close errors) but represents redundant execution. No agent flags this.

5. **`connect()` error path order (Agent 04 discrepancy)**: The source calls `console.error` **before** `emitStatus('error')` in the falsy-token guard. Agent 04 describes this as "calls emitStatus('error'), logs an error" — reversed. This is a minor but materially incorrect ordering claim in Agent 04's description. Agents 01, 02, 03, and 05 either match or do not explicitly state the order.

---

## Agent 02

### startTranscription
**Verdict: PASS**
Guards on `_active`, sets all module-level state, calls `emitStatus('connecting')` then `await connect()`. All material claims are correct.

### stopTranscription
**Verdict: PASS**
Guards on `!_active`, sets `_active = false`, calls `clearReconnectTimer()`, sends `Finalize` JSON if WS is OPEN with a 500ms deferred `closeCleanly()`, else calls `closeCleanly()` immediately. Claims are accurate.

### isTranscribing
**Verdict: PASS**
Returns `_active` boolean. Simple and correct.

### connect
**Verdict: PARTIAL**
Agent 02 describes the token-falsy path but does not explicitly state the order: source does `console.error(...)` first, then `emitStatus('error')`, then `return`. The ordering claim is absent (though not explicitly reversed either). All other claims — URL params (`nova-3`, `language`, `punctuate`, `smart_format`, `interim_results`, `endpointing: 300`, `vad_events`), `['token', token]` subprotocol, `onopen` flushing buffered chunks then calling `startRecording()`, `onmessage` filtering for `type === 'Results'`, `onclose` calling `stopRecording()` and `attemptReconnect()` when `_active && !_reconnecting` — are materially correct.

### handleResult
**Verdict: PASS**
Accesses `msg.channel?.alternatives?.[0]`, trims transcript, routes final results to `_onTranscript` and interim to `_onInterim`, returns early if `alt` is falsy or text is empty after trim.

### startRecording
**Verdict: PARTIAL**
Agent 02 correctly describes the MIME type preference cascade (`audio/webm;codecs=opus` → `audio/webm` → empty string), the `ondataavailable` handler (send if WS open, buffer if `_reconnecting`), the `CHUNK_INTERVAL_MS = 250` chunk interval, and `emitStatus('error')` in the catch block. However, Agent 02 omits the `console.error('[Deepgram] MediaRecorder start failed:', err)` that precedes `emitStatus('error')` in the catch block.

### stopRecording
**Verdict: PASS**
Checks `_recorder.state !== 'inactive'` before calling `stop()`, wraps in try/catch, sets `_recorder = null`. Correct.

### attemptReconnect
**Verdict: PASS**
Sets `_reconnecting = true`, calls `clearReconnectTimer()`, sets a `RECONNECT_TIMEOUT_MS` (5000ms) timeout that emits `'paused'` and calls `tryReconnectLoop()` if still `_active && _reconnecting`, then immediately calls `void connect()`. Correct.

### tryReconnectLoop
**Verdict: PASS**
Guards on `!_active || !_reconnecting`, sets a 10000ms timeout, awaits `connect()`, then recurses if still `_active && _reconnecting`. Correct.

### closeCleanly
**Verdict: PASS**
Calls `stopRecording()`, sends `CloseStream` JSON and closes WS with code 1000 and reason `'Turn ended'` if state is OPEN or CONNECTING, nulls `_ws`, clears `_audioBuffer`, sets `_reconnecting = false`, calls `clearReconnectTimer()`, emits `'stopped'`. Correct.

### clearReconnectTimer
**Verdict: PASS**
Clears the timeout and nulls `_reconnectTimer` if non-null. Correct.

### emitStatus
**Verdict: PASS**
Calls `_onStatus(status)` if `_onStatus` is non-null. Correct.

### cleanupDeepgram
**Verdict: PASS**
Sets `_active = false`, calls `closeCleanly()`, then nulls `_onTranscript`, `_onInterim`, `_onStatus`, and `_stream`. Correct.

## needs_review

1. **`_language` is never reset in `cleanupDeepgram()`**: After cleanup, `_language` retains its last-set value rather than resetting to `'en'`. No agent flags this. If `startTranscription` is called again without a `language` argument (relying on the `|| 'en'` default), the previous language would still be overwritten by the defaulting logic — but if called with a language and then cleaned up, the stale value persists in memory until next call.

2. **`startRecording()` non-null `_recorder` leak on `start()` throw**: If `new MediaRecorder(...)` succeeds but `_recorder.start(CHUNK_INTERVAL_MS)` throws, `_recorder` is left pointing to an un-started (but constructed) MediaRecorder. Subsequent calls to `startRecording()` would be blocked by the `if (!_stream || _recorder) return` guard, and `stopRecording()` would attempt to stop a recorder that was never started (which is safe since it checks `state !== 'inactive'`, but the recorder is silently leaked). No agent flags this.

3. **`stopTranscription()` + `cleanupDeepgram()` double-close race**: `stopTranscription()` schedules `closeCleanly()` via `setTimeout(..., 500)`. If `cleanupDeepgram()` is called within that 500ms window, it calls `closeCleanly()` synchronously. Both calls proceed: the second `closeCleanly()` operates on already-nulled `_ws` and empty `_audioBuffer`, so it is mostly harmless, but `stopRecording()` is called twice and `emitStatus('stopped')` fires twice. No agent flags this race.

4. **`connect()` `_active` check after `await fetchDeepgramToken()`**: After the async token fetch returns, `connect()` checks `if (!_active) return` before proceeding. This is a deliberate guard against a race where `stopTranscription()` is called during the token fetch. This subtlety — that the `_active` guard is post-await, not just at entry — is not explicitly noted by any agent.

5. **`attemptReconnect()` does not null `_ws` before calling `connect()`**: The old closed WebSocket is still referenced by `_ws` when `connect()` is called. `connect()` immediately overwrites `_ws` with the new WebSocket, and since the old WS is already closed, there are no event-listener leaks from the old handlers — but the brief window where `_ws` references a closed socket while a new one is being constructed is unmentioned by any agent.

---

## Agent 03

### startTranscription
**Verdict: PASS**
All material claims are correct: guards on `_active`, sets module-level state variables, defaults `_language` to `'en'` when falsy, stores callbacks (with `null` fallback for optional ones), resets `_audioBuffer = []`, calls `emitStatus('connecting')`, then `await connect()`.

### stopTranscription
**Verdict: PASS**
Correct: early return if not `_active`, sets `_active = false`, calls `clearReconnectTimer()`, sends `{ type: 'Finalize' }` JSON only if WebSocket is OPEN, defers `closeCleanly()` via 500ms setTimeout when WebSocket is open, calls `closeCleanly()` immediately otherwise.

### isTranscribing
**Verdict: PASS**
Trivial — returns `_active`. All agents correct.

### connect
**Verdict: PARTIAL**
The token-falsy path ordering issue from divergence #1 applies here. Source order is `console.error(...)` → `emitStatus('error')` → `return`. Agent 04 reversed this order ("calls emitStatus('error'), logs an error"). The other agents either got it right or didn't specify order explicitly. The functional behavior is the same but Agent 04's description is technically inaccurate in ordering. Beyond that, the WebSocket is constructed with subprotocols `['token', token]`, `onopen` flushes `_audioBuffer` before calling `startRecording()`, `onclose` calls `stopRecording()` then conditionally `attemptReconnect()` only if `_active && !_reconnecting`. These are generally well-described. Minor note: no agent called out that `connect()` does not null `_ws` before constructing a new one (see needs_review).

### handleResult
**Verdict: PASS**
All agents correctly described: extracts `msg.channel?.alternatives?.[0]`, returns early if no alt or empty/whitespace transcript (`.trim()`), routes to `_onTranscript` on `is_final`, routes to `_onInterim` otherwise. Guards that callbacks are non-null before calling them are present in source and generally noted.

### startRecording
**Verdict: PARTIAL**
Divergence #2: Agents 01, 02, 04 omitted the `console.error` in the catch block, only noting `emitStatus('error')`. Agents 03 and 05 correctly mentioned both. The MIME type fallback chain (`audio/webm;codecs=opus` → `audio/webm` → `''`) and the `ondataavailable` buffering logic (buffer to `_audioBuffer` only when `_reconnecting`) are generally correct across agents. The guard `if (!_stream || _recorder) return` is present and generally noted.

### stopRecording
**Verdict: PASS**
Correct: checks `_recorder` exists, checks `_recorder.state !== 'inactive'` before calling `.stop()`, wraps in try/catch, sets `_recorder = null`. All agents accurate.

### attemptReconnect
**Verdict: PASS**
Correct: sets `_reconnecting = true`, logs Tier 1 message, calls `clearReconnectTimer()`, sets a `RECONNECT_TIMEOUT_MS` (5000ms) timer that emits `'paused'` and calls `tryReconnectLoop()` if still `_active && _reconnecting`, then immediately calls `void connect()`. All agents accurate on the two-tier structure.

### tryReconnectLoop
**Verdict: PASS**
Correct: early return guard if `!_active || !_reconnecting`, sets a 10000ms timer, re-checks guards inside timer callback, calls `await connect()`, then recursively calls `tryReconnectLoop()` if still `_active && _reconnecting`. All agents accurate.

### closeCleanly
**Verdict: PASS**
Correct: calls `stopRecording()`, sends `{ type: 'CloseStream' }` and closes with code 1000/reason `'Turn ended'` only if WebSocket is OPEN or CONNECTING, sets `_ws = null`, resets `_audioBuffer = []`, sets `_reconnecting = false`, calls `clearReconnectTimer()`, emits `'stopped'`. All agents accurate.

### clearReconnectTimer
**Verdict: PASS**
Trivial: clears the timer if set, nulls `_reconnectTimer`. All agents accurate.

### emitStatus
**Verdict: PASS**
Trivial: calls `_onStatus(status)` if non-null. All agents accurate.

### cleanupDeepgram
**Verdict: PASS**
Correct: sets `_active = false`, calls `closeCleanly()`, then nulls `_onTranscript`, `_onInterim`, `_onStatus`, and `_stream`. All agents accurate on what is reset. No agent flagged `_language` not being reset (see needs_review).

## needs_review

1. **`_recorder` left non-null if `_recorder.start()` throws after construction**: In `startRecording()`, `_recorder` is assigned (`_recorder = new MediaRecorder(...)`) before `.start(CHUNK_INTERVAL_MS)` is called. If `.start()` throws, the catch block calls `emitStatus('error')` but does NOT null `_recorder`. The next call to `startRecording()` will hit the `if (!_stream || _recorder) return` guard and silently do nothing, leaving the system in a broken state. No Stage 2 agent flagged this.

2. **`_language` not reset in `cleanupDeepgram()`**: `cleanupDeepgram()` resets `_onTranscript`, `_onInterim`, `_onStatus`, and `_stream` to null, but does not reset `_language` back to `'en'`. If a consumer calls `cleanupDeepgram()` and then `startTranscription()` omitting the language argument (passing an empty/falsy string), `startTranscription` will default it to `'en'`. But there is no stale-language risk in the normal case since `startTranscription` always overwrites `_language`. Still, the asymmetry is worth noting. No Stage 2 agent flagged this.

3. **Double `closeCleanly()` / double `emitStatus('stopped')` race**: `stopTranscription()` defers `closeCleanly()` by 500ms when the WebSocket is OPEN. If `cleanupDeepgram()` is called within that 500ms window, it calls `closeCleanly()` immediately (which nulls `_onStatus`), and then the deferred `closeCleanly()` fires and calls `emitStatus('stopped')` — but `_onStatus` is already null so the second emit is a no-op. Not a crash, but the sequence is subtle. No Stage 2 agent flagged this.

4. **Old `_ws` not explicitly nulled before `void connect()` in `attemptReconnect()`**: When `attemptReconnect()` calls `void connect()`, the function assigns `_ws = new WebSocket(...)` directly, silently overwriting whatever reference was in `_ws`. The old (closed) WebSocket is simply abandoned — no explicit null step, no explicit close call on the old reference (it is already closed by the time `onclose` fires and triggers `attemptReconnect`). This is safe in practice since the old socket is already closed, but it is not explicitly documented by any Stage 2 agent and could be confusing during code review.

5. **`_audioBuffer` flushed only after `onopen`, not after `connect()` resolves**: Buffered audio chunks are only sent inside the `onopen` handler. If `connect()` is called during reconnection and the new socket opens successfully, there is a window between `void connect()` returning and `onopen` firing during which `ondataavailable` may push more chunks into `_audioBuffer`. Those chunks are flushed in `onopen`, so ordering is preserved — but the interleaving is subtle and no agent described it in detail.

---

## Agent 04

### startTranscription
**Verdict: PARTIAL**
All agents correctly describe the guard (`if (_active) return`), state initialization, `_audioBuffer = []` reset, `emitStatus('connecting')`, and `await connect()`. However, none of the five agents explicitly note that `_language` defaults to `'en'` via `language || 'en'` (fallback when empty string or falsy is passed), which is a behavioral detail in the assignment. Minor omission — not materially wrong, but imprecise.

### stopTranscription
**Verdict: PASS**
All agents correctly describe: early return if `!_active`, sets `_active = false`, calls `clearReconnectTimer()`, checks `_ws.readyState === WebSocket.OPEN`, sends `Finalize` JSON, defers `closeCleanly()` by 500ms in the OPEN path, and calls `closeCleanly()` immediately in the else path.

### isTranscribing
**Verdict: PASS**
All agents correctly describe this as a simple getter returning the module-level `_active` boolean.

### connect
**Verdict: PARTIAL**
The token-falsy path and WebSocket constructor error path are correctly described by all agents. The `onopen` buffer flush and `startRecording()` call are correct. The `onclose` → `stopRecording()` → conditional `attemptReconnect()` flow is correct. However, the `onclose` handler's condition is `if (_active && !_reconnecting)` — none of the agents explicitly state the `!_reconnecting` guard, which means a close event during an already-in-progress reconnect attempt will NOT trigger another `attemptReconnect()`. This is a behavioral subtlety that is material to reconnection logic.

### handleResult
**Verdict: PASS**
All agents correctly describe: access `msg.channel?.alternatives?.[0]`, early return on no `alt`, extract and trim `alt.transcript`, early return on empty/falsy `text`, dispatch to `_onTranscript` if `msg.is_final`, dispatch to `_onInterim` otherwise (if callback is set).

### startRecording
**Verdict: PARTIAL**
Agents 01, 02, and 04 describe the catch block as calling only `emitStatus('error')` without mentioning `console.error`. The source clearly does both: `console.error(...)` then `emitStatus('error')`. Agents 03 and 05 correctly describe both. Since agents 01, 02, and 04 made a material omission (missing `console.error` in catch), this is PARTIAL. Additionally, none of the five agents note that if the `MediaRecorder` constructor succeeds but `_recorder.start()` throws, `_recorder` remains non-null after the catch block (since `_recorder` was assigned before `start()` was called) — this is a subtle state leak.

### stopRecording
**Verdict: PASS**
All agents correctly describe: null-guard on `_recorder`, checks `_recorder.state !== 'inactive'` before calling `stop()`, wraps in try/catch ignoring errors, sets `_recorder = null`.

### attemptReconnect
**Verdict: PASS**
All agents correctly describe: sets `_reconnecting = true`, calls `clearReconnectTimer()`, sets a 5-second timer that emits `'paused'` and calls `tryReconnectLoop()` if still `_active && _reconnecting`, and immediately calls `void connect()` (Tier 1). All agents note the recorder is not stopped here, preserving buffering.

### tryReconnectLoop
**Verdict: PASS**
All agents correctly describe: early return if `!_active || !_reconnecting`, sets a 10-second timer, inside timer re-checks the same guard, calls `await connect()`, then recursively calls `tryReconnectLoop()` if still `_active && _reconnecting` after connect.

### closeCleanly
**Verdict: PARTIAL**
All agents correctly describe the sequence: `stopRecording()`, conditional send of `CloseStream` JSON and `close(1000, 'Turn ended')`, null `_ws`, clear `_audioBuffer`, set `_reconnecting = false`, `clearReconnectTimer()`, `emitStatus('stopped')`. However, the `CloseStream` send only happens if `readyState === OPEN || readyState === CONNECTING` — none of the agents explicitly call out the `CONNECTING` state inclusion in the condition, only the `OPEN` state. Minor imprecision across all agents.

### clearReconnectTimer
**Verdict: PASS**
All agents correctly describe: null-guard on `_reconnectTimer`, calls `clearTimeout()`, sets `_reconnectTimer = null`.

### emitStatus
**Verdict: PASS**
All agents correctly describe: null-guard on `_onStatus`, calls `_onStatus(status)`. Simple passthrough.

### cleanupDeepgram
**Verdict: PARTIAL**
All agents correctly describe: sets `_active = false`, calls `closeCleanly()`, nulls `_onTranscript`, `_onInterim`, `_onStatus`, and `_stream`. However, no agent from any of the five mentions that `_language` is NOT reset — it retains its last-set value after cleanup. Given that `_language` is module-level state, this is a behavioral characteristic of the cleanup boundary.

## needs_review

1. **`_recorder` state leak in `startRecording` catch block**: If `new MediaRecorder(_stream, options)` succeeds (assigning `_recorder`) but a subsequent operation throws, `_recorder` is non-null when the catch block runs. The catch block does not null `_recorder`. This means the guard `if (!_stream || _recorder) return` at the top of `startRecording` would prevent any future recording attempt without an intervening `stopRecording()` call. No agent flagged this.

2. **`connect()` onclose `!_reconnecting` guard**: The `onclose` handler only calls `attemptReconnect()` when `!_reconnecting`. This prevents stacked reconnect attempts if a second close fires during an in-progress reconnect. None of the five agents explicitly stated this guard condition.

3. **`closeCleanly()` sends `CloseStream` on `CONNECTING` state**: The condition is `readyState === OPEN || readyState === CONNECTING`. Attempting `ws.send()` on a CONNECTING socket will throw, but the try/catch swallows it. The close(1000) still proceeds. This edge case was not noted by any agent.

4. **`_language` persistence across cleanup**: `cleanupDeepgram()` does not reset `_language` to `'en'`. If `startTranscription` is later called with an empty/falsy language, `_language || 'en'` would still return the last-used language rather than `'en'`. No agent noted this.

5. **`_audioBuffer` is only flushed in `onopen`**: If `connect()` is called during reconnect and `onopen` fires, it flushes buffered chunks before `startRecording()`. But if the WebSocket closes again before all buffer is flushed, newly buffered chunks from `_recorder.ondataavailable` accumulate again. The flush-then-record ordering is correct, but no agent explicitly noted the race window between flush completion and new chunk production.

---

## Agent 05

### startTranscription
**Verdict: PASS**
All five agents are unanimous and accurate. Every material claim — async, 5-param signature, `_active` guard with `console.warn`, state initialization, `_audioBuffer = []` reset, `emitStatus('connecting')`, and `await connect()` — matches the source exactly.

### stopTranscription
**Verdict: PASS**
All five agents are unanimous and accurate. The sequence (early return if `!_active`, set `_active=false`, `clearReconnectTimer`, OPEN-check with `Finalize` send, 500ms deferred `closeCleanly` vs. immediate `closeCleanly`) matches the source exactly.

### isTranscribing
**Verdict: PASS**
Unanimous and trivially correct. Returns `_active`.

### connect
**Verdict: PARTIAL**
Agents 01–03 and 05 either specify the correct order (console.error then emitStatus) or are silent on order. Agent 04 implies emitStatus runs before the error log. The source is unambiguous: `console.error(...)` executes first, then `emitStatus('error')`. This is a minor ordering imprecision by one agent, not a structural misrepresentation, so PARTIAL rather than FAIL. The rest of the function description — URL params (`nova-3`, punctuate, smart_format, interim_results, endpointing=300, vad_events), WebSocket subprotocol `['token', token]`, `onopen` buffer flush, `onmessage` Results dispatch, `onerror` warning, `onclose` triggering `attemptReconnect` — is correct across all agents.

### handleResult
**Verdict: PASS**
Unanimous and correct. Optional chaining on `msg.channel?.alternatives?.[0]`, `trim()`, `is_final` branch dispatching to `_onTranscript` vs `_onInterim`.

### startRecording
**Verdict: PARTIAL**
The MIME-type fallback chain, `MediaRecorderOptions` pattern, `ondataavailable` buffer-or-send logic, `onerror` handler, and `start(250)` are correct across all agents. However, agents 01, 02, and 04 omit the `console.error` in the catch block (they only mention `emitStatus('error')`), while agents 03 and 05 correctly note both. Since three of five agents miss the `console.error`, this is a material omission across the majority — PARTIAL.

### stopRecording
**Verdict: PASS**
Unanimous and correct. State check before `stop()`, try/catch with swallowed exception, `_recorder = null`.

### attemptReconnect
**Verdict: PASS**
Unanimous and correct. `_reconnecting = true`, `clearReconnectTimer`, `setTimeout(5000)` with `paused` status + `tryReconnectLoop` on expiry, immediate `void connect()`.

### tryReconnectLoop
**Verdict: PASS**
Unanimous and correct. Entry guard, `setTimeout(10000)` async callback, inner re-guard, `await connect()`, recursive call if still active and reconnecting.

### closeCleanly
**Verdict: PASS**
Unanimous and correct. `stopRecording()`, WebSocket OPEN-or-CONNECTING check, `CloseStream` message, `close(1000, 'Turn ended')`, `_ws = null`, `_audioBuffer = []`, `_reconnecting = false`, `clearReconnectTimer()`, `emitStatus('stopped')`.

### clearReconnectTimer
**Verdict: PASS**
Unanimous and correct.

### emitStatus
**Verdict: PASS**
Unanimous and correct.

### cleanupDeepgram
**Verdict: PASS**
All five agents correctly identify `_active = false`, `closeCleanly()`, and nulling of `_onTranscript`, `_onInterim`, `_onStatus`, `_stream`. The function is behaviorally correct as described. The `_language` non-reset is a subtlety flagged below.

## needs_review

1. **`_language` is not reset in `cleanupDeepgram`**: No agent flagged this. After `cleanupDeepgram()` runs, `_language` retains its last-set value (`'en'` on first call, or whatever was passed to `startTranscription`). If the same module instance is reused for a new session with a different language, and `startTranscription` is called before any re-init sets `_language`, the stale value could be used. In practice `startTranscription` always sets `_language`, so this is low risk — but it is an asymmetry worth noting since `_stream`, `_onTranscript`, `_onInterim`, `_onStatus` are all nulled while `_language` is not.

2. **`_recorder` left non-null if `_recorder.start()` throws in `startRecording`**: No agent flagged this. The assignment `_recorder = new MediaRecorder(...)` happens before `_recorder.start(CHUNK_INTERVAL_MS)`. If `start()` throws, the catch block calls `emitStatus('error')` but does not null out `_recorder`. A subsequent call to `startRecording()` would early-return at `if (!_stream || _recorder) return` because `_recorder` is non-null, silently preventing any new recording attempt without a full cleanup cycle.

3. **`_audioBuffer` is not flushed if WebSocket is not OPEN at `ondataavailable` time and `_reconnecting` is false**: In `startRecording`, chunks are only buffered when `_reconnecting` is true. If the WebSocket has closed but `_reconnecting` has not yet been set (the `onclose` handler fires asynchronously), a data chunk arriving in that window will be silently dropped — neither sent nor buffered. No agent noted this race window.

4. **`connect()` does not clear a pre-existing `_ws` before creating a new one**: During reconnect, `connect()` is called while `_ws` may still reference the closed (but not yet nulled) WebSocket. The old reference is simply overwritten. The old WebSocket's event handlers remain attached to the old object, so stray events on the old socket could still fire if the close handshake is not complete. No agent mentioned this.
