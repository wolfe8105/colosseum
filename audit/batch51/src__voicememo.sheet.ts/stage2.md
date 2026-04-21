# Stage 2 Outputs — voicememo.sheet.ts

## Agent 01

### openRecorderSheet

When called with an optional `_context` parameter of type `RecorderContext` (defaulting to an empty object), this function performs no runtime operations. The parameter is immediately voided to satisfy unused variable linting. The function has no implementation in this TypeScript file, as noted in the landmine comment—the actual UI implementation lives in legacy moderator-voicememo.js. This function serves as a typed interface only.

### closeRecorderSheet

This function retrieves the DOM element with id `vm-recorder-sheet` and removes it from the document if it exists. It queries the DOM, conditionally calls the `remove()` method on the element, and returns void.

### toggleRecord

This async function checks the module-level `isRecordingState` variable. If recording has not started, it awaits `startRecording()`. If recording is already in progress, it awaits `stopRecording()`, and if that call returns a result, stores it in the module-level `pendingRecording` variable. The function always awaits the recording operation it performs, but does not return a value.

### retake

This function resets the recording session by clearing the module-level `pendingRecording` variable to null and calling `resetPlayingState()`. It then queries the DOM for several elements and modifies their state: the audio preview element (id `vm-audio-preview`) is paused and its src is cleared if it exists; the preview container (id `vm-preview`) and send button (id `vm-send-btn`) have the `visible` class removed; the timer (id `vm-timer`) has its text set to `0:00` and the `idle` class added; and the hint text (id `vm-hint`) is reset to the default instruction `Tap to record your take (120s max)`. All DOM modifications are conditional—they only execute if the elements exist—and the function returns void.

### send

This async function first checks if `pendingRecording` is null and returns early if it is. It then retrieves the recorder sheet DOM element (id `vm-recorder-sheet`), extracts a `_context` property from that element (with a fallback to an empty object if the property does not exist), and destructures the `debateId`, `section`, and `parentTakeId` fields from context with fallbacks. It displays a toast "📤 Sending voice take..." and awaits `uploadVoiceMemo()` with the pending recording's blob and the debate ID, capturing the returned `url` and `path`. If not in placeholder mode (checked via `getIsPlaceholderMode()`), it awaits `safeRpc()` to call the `create_voice_take` procedure with the upload results and context data; if the RPC returns an error, it logs to console, revokes the object URL from `pendingRecording.url` if present, nulls `pendingRecording`, shows a failure toast, and returns early. On success or in placeholder mode, it revokes the pending recording's object URL if present, nulls `pendingRecording`, calls `closeRecorderSheet()` to remove the UI, displays a success toast, and awaits `loadHotTakes()` to refresh the feed for the context's section or all sections. The function returns void.

## Agent 02

### openRecorderSheet

This function accepts an optional `RecorderContext` parameter (defaulting to an empty object) and performs no operations. The function body is a stub that casts the parameter to void, with a comment indicating the actual implementation lives in a legacy JavaScript file (moderator-voicememo.js). No module-level state is read or written, no DOM elements are accessed, and no other functions are called. The function returns undefined.

### closeRecorderSheet

This function queries the DOM for an element with id `vm-recorder-sheet`. If the element exists, it removes it from the DOM. The function reads external DOM state, writes by removing a DOM element, and returns undefined. No other functions are called.

### toggleRecord

This is an async function that reads the module-level variable `isRecordingState` (imported from voicememo.record.ts) to determine control flow. If not recording, the function awaits `startRecording()`. If recording, the function awaits `stopRecording()`, and if the result is truthy, assigns it to the module-level variable `pendingRecording`. The function returns a promise that resolves to undefined.

### retake

This function sets the module-level variable `pendingRecording` to null and calls `resetPlayingState()` from voicememo.player.ts. It then queries the DOM for an element with id `vm-audio-preview` (casting it as HTMLAudioElement), and if found, pauses it and clears its src attribute. The function then queries for `vm-preview` and removes the `visible` class if the element exists, queries for `vm-send-btn` and removes the `visible` class if it exists, queries for `vm-timer` and sets its textContent to `'0:00'` and adds the `idle` class if it exists, and finally queries for `vm-hint` and sets its textContent to `'Tap to record your take (120s max)'` if it exists. The function returns undefined.

### send

This is an async function that first checks whether `pendingRecording` is truthy; if falsy, the function returns early with undefined. Otherwise, it queries the DOM for an element with id `vm-recorder-sheet`, extracts a `_context` property from it (via unsafe type casting), and defaults to an empty object if extraction fails. It calls `showToast()` with the message `'📤 Sending voice take...'`, then awaits `uploadVoiceMemo()` with `pendingRecording.blob` and `context.debateId ?? null`, receiving `url` and `path` from the result. If `getIsPlaceholderMode()` returns false, the function awaits `safeRpc()` with the method name `'create_voice_take'` and a parameter object containing duration from `pendingRecording.duration`, section from `context.section ?? 'trending'`, voice memo URL and path from the upload result, and parent take ID from `context.parentTakeId ?? null`. If the RPC returns an error, the function logs it to console.error, revokes the object URL on `pendingRecording.url` if present, sets `pendingRecording` to null, calls `showToast()` with an error message, and returns early with undefined. If no error, the function revokes the object URL on `pendingRecording.url` if present, sets `pendingRecording` to null, calls `closeRecorderSheet()`, calls `showToast()` with the message `'🎤 Voice take posted!'`, awaits `loadHotTakes()` with `context.section ?? 'all'`, and returns a promise that resolves to undefined.

## Agent 03

### openRecorderSheet

This function accepts an optional `_context` parameter of type `RecorderContext` with a default empty object. The function body is a stub—it contains only a void annotation on the parameter to suppress unused variable warnings. No operations occur: the function does not read or modify any state, does not interact with the DOM, and returns `undefined` implicitly. According to the comment at line 14, the actual implementation resides in a legacy `moderator-voicememo.js` file; this TypeScript version provides only a compile-time function signature.

### closeRecorderSheet

This function reads the DOM element with id `'vm-recorder-sheet'` and removes it if present. It does not access module-level state, parameters, or other external state. If the element exists, it calls the element's `remove()` method; if it does not exist, the conditional short-circuits and nothing happens. The function returns `undefined` implicitly.

### toggleRecord

This async function checks the module-level `isRecordingState` variable imported from `'./voicememo.record.ts'`. If `isRecordingState` is falsy, it awaits `startRecording()`. If `isRecordingState` is truthy, it awaits `stopRecording()`, and if the result is truthy, it assigns that result to the module-level `pendingRecording` variable. The function returns a promise that resolves to `undefined`. Both `startRecording` and `stopRecording` are awaited; there are no fire-and-forget calls.

### retake

This function writes to the module-level `pendingRecording` variable by setting it to `null`. It calls `resetPlayingState()` imported from `'./voicememo.player.ts'` with no arguments. It then reads and modifies multiple DOM elements: if the element with id `'vm-audio-preview'` exists as an `HTMLAudioElement`, it calls `pause()` on it and sets `src` to an empty string. It reads elements with ids `'vm-preview'`, `'vm-send-btn'`, `'vm-timer'`, and `'vm-hint'` and conditionally modifies them—removing the `'visible'` class from preview and send-btn elements, updating the timer's text content to `'0:00'` and adding the `'idle'` class, and updating the hint's text content to a new instruction string. The function returns `undefined` implicitly. All operations are synchronous; there are no async calls or awaits.

### send

This async function begins by reading `pendingRecording` and returning early if it is falsy, yielding `undefined`. Otherwise, it reads the DOM element with id `'vm-recorder-sheet'`, attempts to extract its `_context` property (with type assertion and nullish coalescing to an empty object as fallback), and calls `showToast('📤 Sending voice take...')`. It then awaits `uploadVoiceMemo()` with `pendingRecording.blob` and `context.debateId ?? null` as arguments, storing the result's `url` and `path` properties. It calls `getIsPlaceholderMode()` synchronously; if it returns falsy, it awaits `safeRpc('create_voice_take', {...})` with context fields extracted from the `_context` object or defaults, and inspects the `error` field in the response. If `error` is truthy, it logs the error, revokes the URL stored in `pendingRecording.url` if present, sets `pendingRecording` to `null`, calls `showToast('⚠️ Failed to post voice take. Try again.')`, and returns early with `undefined`. On the success path, it revokes `pendingRecording.url` if present, sets `pendingRecording` to `null`, calls `closeRecorderSheet()` (which removes the recorder sheet element from the DOM), calls `showToast('🎤 Voice take posted!')`, and awaits `loadHotTakes(context.section ?? 'all')`. The function returns a promise that resolves to `undefined`. The `uploadVoiceMemo` call and the `safeRpc` call are awaited; `getIsPlaceholderMode()` is not awaited.

## Agent 04

### openRecorderSheet

This function is a stub with no runtime behavior. It receives an optional `_context` parameter of type `RecorderContext` but performs no operation beyond receiving it (the `void _context;` statement is a no-op to satisfy TypeScript). The function reads nothing from module-level state, external state, the DOM, storage, or network. It writes nothing. It calls no other functions or APIs. A comment indicates the actual implementation lives in a legacy file `moderator-voicememo.js`.

### closeRecorderSheet

This function reads the DOM by querying for an element with ID `vm-recorder-sheet`. If that element exists, it removes it from the DOM. The function writes to external state (the DOM) by deleting that node. It calls no other functions. It returns `void` with no explicit return statement.

### toggleRecord

This async function reads the module-level `isRecordingState` variable (imported from `voicememo.record.ts`) and makes a synchronous check. If `isRecordingState` is false, it awaits `startRecording()` (a call to a function from the imported `voicememo.record.ts` module). If `isRecordingState` is true, it awaits `stopRecording()` (another function from the same module), receives a `RecordingResult` or falsy value, and if that result is truthy, writes it to the module-level state variable `pendingRecording`. The function returns a promise that resolves to `void`.

### retake

This function resets the module-level `pendingRecording` to null, calls `resetPlayingState()` (from the imported `voicememo.player.ts` module), and then reads and modifies the DOM across six separate element queries. It queries for `vm-audio-preview` (cast as `HTMLAudioElement | null`), pauses it if found, and clears its `src` attribute; it queries for `vm-preview` and removes the `visible` class if found; it queries for `vm-send-btn` and removes the `visible` class if found; it queries for `vm-timer`, sets its `textContent` to `'0:00'`, and adds the `idle` class if found; and it queries for `vm-hint` and sets its `textContent` to `'Tap to record your take (120s max)'` if found. The function returns `void` with no explicit return statement and makes no async calls.

### send

This async function reads the module-level `pendingRecording` state; if it is null or falsy, the function returns early without doing anything further. Otherwise, it reads from the DOM by querying `vm-recorder-sheet`, then attempts to read a `_context` property (of type `RecorderContext`) from that element, using an object destructuring chain with fallback to an empty object. It calls `showToast()` (from imported `config.ts`) with a string, then awaits `uploadVoiceMemo()` (from imported `voicememo.upload.ts`) passing `pendingRecording.blob` and `context.debateId ?? null`, receiving `url` and `path` properties. It then checks `getIsPlaceholderMode()` (from imported `auth.ts`); if false, it awaits `safeRpc()` (from imported `auth.ts`) with the method name `'create_voice_take'` and a parameter object built from context properties and `pendingRecording.duration`, receiving an error result. If an error is present, it logs the error to console.error, revokes `pendingRecording.url` (if it exists) via `URL.revokeObjectURL()`, sets `pendingRecording` to null, calls `showToast()` with a warning message, and returns early. If no error or if `getIsPlaceholderMode()` is true, execution continues: it revokes `pendingRecording.url` if it exists, sets `pendingRecording` to null, calls `closeRecorderSheet()` (the second function on the anchor list), calls `showToast()` with a success message, and finally awaits `loadHotTakes()` (from imported `async.ts`) with the section from context or a default value. The function returns a promise that resolves to `void`.

## Agent 05

### openRecorderSheet

This function is a stub that accepts an optional `_context` parameter of type `RecorderContext` and returns nothing. The function body reads the `_context` parameter (via the `void _context` statement which prevents unused-variable warnings) but performs no other operations. The actual implementation exists in a separate JavaScript file (`moderator-voicememo.js`). This TypeScript function provides only compile-time type checking for callers.

### closeRecorderSheet

This function reads the DOM to locate an element with ID `vm-recorder-sheet`. If the element exists, it calls the `remove()` method to delete the element from the DOM tree. The function performs no other operations and returns nothing.

### toggleRecord

This async function first reads the module-level `isRecordingState` variable to determine the current recording state. If `isRecordingState` is falsy (not currently recording), the function awaits a call to `startRecording()`. If `isRecordingState` is truthy (currently recording), the function awaits a call to `stopRecording()`, and if `stopRecording()` returns a truthy result, that result is written to the module-level `pendingRecording` variable. The function returns a resolved promise upon completion.

### retake

This function clears the module-level `pendingRecording` state by setting it to `null`, then calls `resetPlayingState()` to reset the player state. It then reads the DOM to locate and operate on several elements: the `vm-audio-preview` element (treating it as an `HTMLAudioElement`), on which it calls `pause()` and sets the `src` attribute to an empty string; the `vm-preview` element, from which it removes the `visible` class; the `vm-send-btn` element, from which it removes the `visible` class; the `vm-timer` element, on which it sets `textContent` to `'0:00'` and adds the `idle` class; and the `vm-hint` element, on which it sets `textContent` to the string `'Tap to record your take (120s max)'`. The function returns nothing.

### send

This async function first reads the module-level `pendingRecording` variable and returns early (with no action) if it is falsy. Otherwise, it reads the DOM to locate the `vm-recorder-sheet` element and attempts to extract a `_context` property (of type `RecorderContext`) from it, with an empty object as the fallback. It calls `showToast()` with a message. It then awaits a call to `uploadVoiceMemo()` passing the `pendingRecording.blob` and the `context.debateId` (or `null`), which returns an object with `url` and `path` properties. Next, it reads `getIsPlaceholderMode()` to determine whether to proceed with the RPC call. If not in placeholder mode, it awaits a call to `safeRpc()` with the method name `'create_voice_take'` and an object containing properties derived from `pendingRecording` (duration) and `context` (section, parentTakeId). If the RPC response contains an `error` field, the function logs the error, revokes the object URL from `pendingRecording.url` (if present), clears `pendingRecording` to `null`, calls `showToast()` with an error message, and returns early. On the success path (either in placeholder mode or after a successful RPC call), the function revokes the object URL from `pendingRecording.url` (if present), clears `pendingRecording` to `null`, calls `closeRecorderSheet()` (which removes the recorder element from the DOM), calls `showToast()` with a success message, and awaits a call to `loadHotTakes()` passing the `context.section` (or `'all'` as fallback). The function returns a resolved promise upon completion.
