# Stage 2 Outputs — src/voicememo.record.ts

## Agent 01

### startRecording
Async function returning `Promise<boolean>`. Awaits `navigator.mediaDevices.getUserMedia` with audio constraints (echoCancellation, noiseSuppression, autoGainControl, sampleRate 48000) and video false, writing result to module-level `recordingStream`. Resets `audioChunks` to `[]`. Calls `MediaRecorder.isTypeSupported` twice to pick mimeType: first `'audio/webm;codecs=opus'`, else `'audio/mp4'`, else falls back to `'audio/webm'`. Constructs a `MediaRecorder` with the stream and mimeType, assigning it to `mediaRecorder`. Writes `ondataavailable` that pushes `e.data` into `audioChunks` only when `e.data.size > 0`, and writes `onstop` that invokes `stopVisualization()` (this handler is overwritten inside `stopRecording`). Calls `mediaRecorder.start(250)` for 250ms timeslice chunking. Sets `isRecordingState = true`, `recordingStartTime = Date.now()`, calls `updateRecorderUI()` once, then starts a `setInterval(updateRecorderUI, 100)` stored in `recordingTimer`. Schedules a `setTimeout` at `MAX_DURATION_SEC * 1000` (120000ms) that fires `void stopRecording()` only if `isRecordingState` is still true (fire-and-forget — timer handle not stored, not cleared on early stop). Calls `startVisualization(recordingStream)` synchronously. Returns `true`. On any thrown error in the try block: logs via `console.error`, clears `recordingTimer` (if set) and nulls it, calls `cleanup()`, calls `showToast` with microphone denial message, returns `false`.

### stopRecording
Synchronous function (not `async`) returning `Promise<RecordingResult | null>`. Reads `mediaRecorder` and `isRecordingState`; if either is falsy, returns `Promise.resolve(null)` immediately. Otherwise returns a new `Promise` whose executor overwrites `mediaRecorder.onstop` with a handler, calls `mediaRecorder!.stop()`, sets `isRecordingState = false`, and clears `recordingTimer` if set (does not null the variable here). The assigned `onstop` handler fires asynchronously when the recorder emits `stop`: calls `stopVisualization()`, computes `elapsed = (Date.now() - (recordingStartTime ?? 0)) / 1000` (uses 0 when `recordingStartTime` is null, yielding a very large elapsed). If `elapsed < MIN_DURATION_SEC` (5): calls `showToast` with the too-short warning, calls `cleanup()`, calls `resolve(null)`, and returns from the handler. Otherwise reads `mediaRecorder!.mimeType`, constructs `new Blob(audioChunks, { type: mimeType })`, creates an object URL via `URL.createObjectURL`, rounds elapsed to an integer `duration`, calls `cleanup()` (which nulls `mediaRecorder` and empties `audioChunks` after the blob is already built), then calls `resolve({ blob, url, duration, mimeType })`. No try/catch; no rejection path. Uncertain: whether `mediaRecorder.stop()` can throw synchronously in any browser state here — not handled.

### cancelRecording
Synchronous void function. If both `mediaRecorder` and `isRecordingState` are truthy, calls `mediaRecorder.stop()` (which will eventually trigger the currently-assigned `onstop`). Sets `isRecordingState = false`. Clears `recordingTimer` if truthy (does not null it). Calls `cleanup()`. Calls `document.getElementById('vm-recorder-sheet')?.remove()` to detach the DOM sheet element (no-op when absent). No return, no error handling.

### cleanupPendingRecording
Synchronous void function taking `pendingUrl: string | null`. If `pendingUrl` is truthy, calls `URL.revokeObjectURL(pendingUrl)`. If `isRecordingState` is true, calls `cancelRecording()`. Comment notes that fallback URL revocation is not performed here and callers should use `revokeAllFallbackURLs` from `voicememo.upload.ts`. No return, no error handling.

### cleanup
Private (non-exported) synchronous void function. Clears `recordingTimer` and nulls it when set. Iterates `recordingStream.getTracks()` calling `t.stop()` on each, then nulls `recordingStream` — guarded by truthiness check. Reassigns `audioChunks = []`. Nulls `mediaRecorder`. Sets `isRecordingState = false`. Nulls `recordingStartTime`. No return, no error handling. Does not touch `audioContext`, `analyser`, or `animationFrame` (visualization state is owned by `stopVisualization`).

### updateRecorderUI
Private synchronous void function. Early-returns when `recordingStartTime` is null/0/falsy. Computes `elapsed = Math.floor((Date.now() - recordingStartTime) / 1000)`, splits into `min` (floor /60) and `sec` (mod 60, left-padded to 2 chars with `'0'`). Computes `remaining = MAX_DURATION_SEC - elapsed` (120 − elapsed). Reads element `#vm-timer` via `getElementById`. If present: sets `timerEl.textContent = "${min}:${sec}"`, removes the `'idle'` class, and when `remaining <= 10` sets `timerEl.style.color = 'var(--mod-magenta)'` (color is never reset within this function when remaining climbs back above 10 — but remaining is monotonically decreasing during a session so that branch does not arise here). No return, no error handling.

### startVisualization
Private synchronous void function taking `stream: MediaStream`. Instantiates an `AudioContext` using `window.AudioContext` or the `webkitAudioContext` fallback via an index into a cast of `window`, assigning to module-level `audioContext`. Calls `audioContext.createMediaStreamSource(stream)` to get `source`. Creates an `AnalyserNode` via `audioContext.createAnalyser()`, assigns to `analyser`, sets `analyser.fftSize = 128`. Connects `source.connect(analyser)`. Reads `#vm-waveform` DOM element cast to `HTMLCanvasElement | null`; returns early if absent (leaves `audioContext`/`analyser` live, meaning the AudioContext is opened but never closed in that branch until `stopVisualization` runs). Calls `canvas.getContext('2d')`; returns early if null (same leak caveat). Reads `analyser.frequencyBinCount` into `bufferLength` (64 given fftSize 128). Allocates `new Uint8Array(bufferLength)` as `dataArray`. Captures `analyser` into local `currentAnalyser`. Defines nested function `draw`: returns early if `isRecordingState` is false; otherwise assigns `animationFrame = requestAnimationFrame(draw)` before reading data, calls `currentAnalyser.getByteFrequencyData(dataArray)`, reads `canvas.width`/`height`, clears the rect, computes `barCount = 32`, `barWidth = w/32 − 2`, `step = Math.floor(bufferLength / barCount)` (= 2), loops `i = 0..31` reading `dataArray[i*step] ?? 0` / 255 as `val`, computes `barHeight = Math.max(2, val * h)`, `x = i * (barWidth + 2)`, `y = (h − barHeight) / 2`, `alpha = 0.4 + val * 0.6`, sets `ctx.fillStyle = \`rgba(212, 168, 67, ${alpha})\`` (hardcoded per LM-VM-003 landmine comment), and calls `ctx.fillRect`. Invokes `draw()` once to start the loop. No try/catch; no return. Uncertain: whether `new AudioContext()` throws synchronously on autoplay-locked browsers — not handled.

### stopVisualization
Private synchronous void function. If `animationFrame` is truthy (non-zero), calls `cancelAnimationFrame(animationFrame)` (does not null the variable afterward). If `audioContext` is truthy, calls `audioContext.close()` — fire-and-forget Promise with `.catch` logging `'[VoiceMemo] audioContext close failed:'` via `console.warn` — then nulls `audioContext`. Nulls `analyser`. Does not touch `recordingStream`, `mediaRecorder`, `audioChunks`, `recordingTimer`, `isRecordingState`, or `recordingStartTime`.

## Agent 02

### startRecording
Async function returning `Promise<boolean>`. Enters try block. Awaits `navigator.mediaDevices.getUserMedia` with audio constraints (echoCancellation, noiseSuppression, autoGainControl, sampleRate 48000) and `video: false`, assigning result to `recordingStream`. Resets `audioChunks = []`. Selects `mimeType` via `MediaRecorder.isTypeSupported`: `'audio/webm;codecs=opus'` → `'audio/mp4'` → `'audio/webm'` fallback. Constructs `new MediaRecorder(recordingStream, { mimeType })` assigned to `mediaRecorder`. Attaches `ondataavailable` pushing to `audioChunks` when `e.data.size > 0`, and `onstop` calling `stopVisualization()`. Calls `mediaRecorder.start(250)`. Sets `isRecordingState = true`, `recordingStartTime = Date.now()`, invokes `updateRecorderUI()`, then `recordingTimer = setInterval(updateRecorderUI, 100)`. Schedules `setTimeout(() => { if (isRecordingState) void stopRecording(); }, MAX_DURATION_SEC * 1000)`. Calls `startVisualization(recordingStream)`. Returns `true`. Catch: `console.error('startRecording error:', err)`, clear+null `recordingTimer`, call `cleanup()`, `showToast('🎤 Microphone access denied. Check browser permissions.')`, return `false`.

### stopRecording
Non-async, returns `Promise<RecordingResult | null>`. Reads `mediaRecorder`, `isRecordingState`. If either falsy → `Promise.resolve(null)`. Otherwise returns `new Promise((resolve) => {...})`. Executor overwrites `mediaRecorder!.onstop` with a handler that calls `stopVisualization()`, computes `elapsed = (Date.now() - (recordingStartTime ?? 0)) / 1000`. If `elapsed < MIN_DURATION_SEC`: `showToast` warning, `cleanup()`, `resolve(null)`, return. Else: reads `mediaRecorder!.mimeType`, builds Blob, creates object URL, rounds elapsed, `cleanup()`, resolves `{ blob, url, duration, mimeType }`. After wiring handler: `mediaRecorder!.stop()`, `isRecordingState = false`, `clearInterval(recordingTimer)` if set (not nulled here). No try/catch.

### cancelRecording
Synchronous void. If `mediaRecorder && isRecordingState`, calls `mediaRecorder.stop()`. `isRecordingState = false`. `clearInterval(recordingTimer)` if truthy (not nulled). `cleanup()`. `document.getElementById('vm-recorder-sheet')?.remove()`.

### cleanupPendingRecording
Synchronous void, param `pendingUrl: string | null`. If truthy, `URL.revokeObjectURL(pendingUrl)`. If `isRecordingState`, `cancelRecording()`. Comment: fallback URL revocation omitted; callers should invoke `revokeAllFallbackURLs` from `voicememo.upload.ts`.

### cleanup
Private synchronous void. If `recordingTimer` truthy: `clearInterval(recordingTimer)` + `recordingTimer = null`. If `recordingStream` truthy: `getTracks().forEach(t => t.stop())`, then `recordingStream = null`. Sets `audioChunks = []`, `mediaRecorder = null`, `isRecordingState = false`, `recordingStartTime = null`. No try/catch.

### updateRecorderUI
Private synchronous void. Reads `recordingStartTime`; if null/0, returns. Computes `elapsed`, `min`, `sec` (padStart to 2), `remaining = MAX_DURATION_SEC - elapsed`. Reads `#vm-timer`; if present: sets `textContent = \`${min}:${sec}\``, `classList.remove('idle')`, and if `remaining <= 10` sets `style.color = 'var(--mod-magenta)'`. No reset path.

### startVisualization
Private synchronous void, param `stream`. Builds `new AudioContext()` via `window.AudioContext || webkitAudioContext` cast. `source = audioContext.createMediaStreamSource(stream)`. `analyser = audioContext.createAnalyser()`. `analyser.fftSize = 128`. `source.connect(analyser)`. Reads `#vm-waveform` cast; if null returns (leaves audioContext/analyser live). `canvas.getContext('2d')`; if null returns. `bufferLength = analyser.frequencyBinCount` (64). `dataArray = new Uint8Array(bufferLength)`. Captures `currentAnalyser = analyser`. Inner `draw()`: early-returns if `!isRecordingState`; else `animationFrame = requestAnimationFrame(draw)`, `getByteFrequencyData(dataArray)`, reads canvas dims, `clearRect`, loops 32 bars computing bar geometry and `ctx.fillStyle = \`rgba(212, 168, 67, ${alpha})\`` hardcoded (LM-VM-003), `fillRect`. Invokes `draw()` to prime loop. No try/catch.

### stopVisualization
Private synchronous void. `cancelAnimationFrame(animationFrame)` if truthy (not nulled). `audioContext.close()` fire-and-forget with `.catch(e => console.warn('[VoiceMemo] audioContext close failed:', e))`, then `audioContext = null` synchronously. `analyser = null`. Does not explicitly disconnect source node.

## Agent 03

### startRecording
Async, `Promise<boolean>`. Try block awaits `getUserMedia` → `recordingStream`. `audioChunks = []`. mimeType ternary: `'audio/webm;codecs=opus'` / `'audio/mp4'` / `'audio/webm'` (fallback unchecked). New `MediaRecorder` → `mediaRecorder`. `ondataavailable` + `onstop` (calls `stopVisualization`). `mediaRecorder.start(250)`. `isRecordingState = true`, `recordingStartTime = Date.now()`, `updateRecorderUI()`, `recordingTimer = setInterval(updateRecorderUI, 100)`. `setTimeout` 120000ms fires `void stopRecording()` if still `isRecordingState`. `startVisualization(recordingStream)`. Return `true`. Catch: `console.error`, clear+null timer, `cleanup()`, `showToast`, return `false`. Note: 120s timeout handle not stored; not cancelled on early stop.

### stopRecording
Non-async, returns Promise. Guard: `!mediaRecorder || !isRecordingState` → `Promise.resolve(null)`. Else `new Promise((resolve) => {...})`. Executor overwrites onstop; `.stop()`; `isRecordingState = false`; clear timer (not null). Handler: `stopVisualization()`; compute elapsed; `< MIN_DURATION_SEC` → showToast + cleanup + resolve null + return. Else: build Blob, create URL, round duration, cleanup, resolve result. No try/catch.

### cancelRecording
Synchronous void. If both truthy → `mediaRecorder.stop()`. `isRecordingState = false`. Clear timer. `cleanup()`. `document.getElementById('vm-recorder-sheet')?.remove()`.

### cleanupPendingRecording
Synchronous void, param `pendingUrl`. If truthy → `URL.revokeObjectURL`. If `isRecordingState` → `cancelRecording()`.

### cleanup
Private void. Clear + null timer. Stop all stream tracks + null stream. `audioChunks = []`, `mediaRecorder = null`, `isRecordingState = false`, `recordingStartTime = null`.

### updateRecorderUI
Private void. Early-return on falsy `recordingStartTime`. Compute elapsed/min/sec/remaining. `#vm-timer`: set textContent, remove 'idle' class, if `remaining <= 10` set magenta style. No reset path.

### startVisualization
Private void, param `stream`. Construct `AudioContext` + `webkitAudioContext` fallback. Create source + analyser; `fftSize = 128`. Connect. Read `#vm-waveform`; null → return (leak). `getContext('2d')`; null → return (leak). Allocate `dataArray`. Capture `currentAnalyser`. Inner `draw`: early-return if `!isRecordingState`; else schedule `requestAnimationFrame(draw)` to module state, populate data, draw 32 bars with hardcoded rgba(212,168,67,α) (LM-VM-003). Invoke `draw()`. No try/catch. `AudioContext` construct errors propagate to `startRecording` catch.

### stopVisualization
Private void. `cancelAnimationFrame(animationFrame)` if truthy (not nulled). `audioContext.close()` fire-and-forget + `.catch` console.warn, then null. `analyser = null`.

## Agent 04

### startRecording
Async `Promise<boolean>`. Same structure as other agents. Note: if `startVisualization` throws after `mediaRecorder.start(250)` has begun capturing, `cleanup()` runs but the recorder is not explicitly stopped — `cleanup` nulls `mediaRecorder` without calling `.stop()`.

### stopRecording
Non-async, returns Promise. Uncertainty: if `elapsed` is exactly `MIN_DURATION_SEC`, `<` allows through. Promise executor synchronous-throw semantics noted. Promise never resolves if `onstop` event never fires.

### cancelRecording
Synchronous void. Notes: if a `stopRecording` promise was pending, its onstop handler will still run and attempt `cleanup()` a second time; racing condition observed.

### cleanupPendingRecording
Synchronous void with URL revoke and conditional cancel as other agents.

### cleanup
Private void — same behavior as other agents.

### updateRecorderUI
Same as other agents. Notes magenta style never reset once set.

### startVisualization
Same as other agents. Notes: construction failures or permission issues propagate to caller's try/catch.

### stopVisualization
Same as other agents. Notes: does not disconnect `source` or `analyser` nodes explicitly; `audioContext.close()` tears down the graph implicitly, but individual nodes are not disconnected.

## Agent 05

### startRecording
Async `Promise<boolean>`. Try awaits `getUserMedia` → `recordingStream`. `audioChunks = []`. mimeType chain. New `MediaRecorder`. `ondataavailable` (push when size > 0). `onstop` calls `stopVisualization()` (overwritten later by `stopRecording`). `.start(250)`. State writes. `updateRecorderUI()` + `setInterval(updateRecorderUI, 100)` → `recordingTimer`. `setTimeout` 120s fires `void stopRecording()` if still `isRecordingState` (fire-and-forget, handle not retained). `startVisualization(recordingStream)`. Return `true`. Catch: `console.error` prefix `'startRecording error:'`, clear+null timer, `cleanup()`, `showToast('🎤 Microphone access denied. Check browser permissions.')`, return `false`.

### stopRecording
Non-async, returns `Promise<RecordingResult | null>`. Guard on `mediaRecorder` and `isRecordingState` → `Promise.resolve(null)`. Else new Promise: overwrites `onstop` with a handler (stopVisualization; elapsed check; `< MIN_DURATION_SEC` → showToast + cleanup + resolve null + return; else Blob + URL + round duration + cleanup + resolve result). Synchronously: `mediaRecorder!.stop()`, `isRecordingState = false`, `clearInterval(recordingTimer)` if set (not nulled). Note: `< MIN_DURATION_SEC` means exactly 5.0 s passes through. No try/catch.

### cancelRecording
Synchronous void. If both truthy → `.stop()`. `isRecordingState = false`. Clear timer. `cleanup()`. Optional-chain DOM remove of `#vm-recorder-sheet`. Uncertainty: if `stopRecording` promise pending, its onstop will still run and run `cleanup()` a second time plus resolve with a result.

### cleanupPendingRecording
Synchronous void, param `pendingUrl`. If truthy → revoke. If `isRecordingState` → `cancelRecording()`. Comments explain circular-dep rationale.

### cleanup
Private void. Clear + null timer. Stop + null stream. Reset chunks + recorder + state + time.

### updateRecorderUI
Private void. Guard on `recordingStartTime`. Compute + render. Color persistence after `<= 10` threshold.

### startVisualization
Private void. Same behavior: AudioContext construction; source/analyser; `fftSize = 128`; connect; canvas/ctx null-guards both leak audioContext+analyser; 32-bar draw loop with hardcoded rgba(212,168,67,α); LM-VM-003. `draw()` primes loop. No try/catch.

### stopVisualization
Private void. `cancelAnimationFrame` (not nulled). `audioContext.close()` fire-and-forget + `.catch`, then null. `analyser = null`. `animationFrame` module variable not reset.
