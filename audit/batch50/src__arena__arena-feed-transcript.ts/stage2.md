# Stage 2 Outputs — arena-feed-transcript.ts

## Agent 01

### handleDeepgramTranscript
Async function. Reads `text` parameter, `debate` parameter, `debate.role`, result of `getCurrentProfile()`, and module-level `round`. Returns early if `text` is falsy, `debate` is falsy, or `debate.role` is falsy. Extracts `display_name` or `username` from profile result, defaulting to 'You'. Calls `appendFeedEvent()` with object containing `crypto.randomUUID()`, `debate.id`, literal 'speech', `round`, `debate.role`, `text`, current ISO timestamp, and author name. Calls `clearInterimTranscript()`. Awaits `writeFeedEvent()` with 'speech', `text`, and `debate.role`. Returns `Promise<void>`.

### showInterimTranscript
Reads DOM element with id 'feed-interim-transcript'. If not found, reads DOM element with id 'feed-stream'. Returns early if 'feed-stream' not found. If element not found, creates new div, sets id to 'feed-interim-transcript', sets className to 'feed-interim-transcript', inserts before 'feed-stream' sibling. Sets `textContent` to `text` parameter. Sets `style.display` to empty string if `text` is truthy, otherwise 'none'. Synchronous, returns void.

### clearInterimTranscript
Reads DOM element with id 'feed-interim-transcript'. If found, sets `textContent` to empty string and `style.display` to 'none'. If not found, executes no operations. Synchronous, returns void.

### updateDeepgramStatus
Reads `status` parameter. If `status` equals 'live' or 'stopped', reads DOM element with id 'feed-deepgram-status'; if found, sets `style.display` to 'none'; returns. If `status` not 'live' or 'stopped', reads DOM element with id 'feed-deepgram-status'. If not found, reads DOM element with id 'feed-turn-label'. Returns early if 'feed-turn-label' not found. If element not found, creates new div, sets id to 'feed-deepgram-status', sets className to 'feed-deepgram-status', inserts before 'feed-turn-label' sibling. Checks `status` value: if 'connecting', sets textContent and display; if 'paused', sets textContent and display; if 'error', sets textContent and display. Synchronous, returns void.

## Agent 02

### handleDeepgramTranscript
Early return if `text` is falsy, `debate` is falsy, or `debate.role` is falsy. Calls `getCurrentProfile()`. Derives authorName: display_name || username || 'You'. Calls `appendFeedEvent()` with new event object containing UUID, debate metadata, text content, ISO timestamp. Calls `clearInterimTranscript()`. Awaits `writeFeedEvent()`. No exception handling — falsy checks prevent undefined access but no catch block.

### showInterimTranscript
Queries element with id `feed-interim-transcript`. If not found, queries `feed-stream`; returns silently if stream missing. Creates element once on first call if absent — inserts as next sibling after stream. Updates text and visibility on every call. Returns silently if `feed-stream` not found.

### clearInterimTranscript
Returns silently if element absent. Otherwise clears text and hides element.

### updateDeepgramStatus
If `status === 'live'` or `'stopped'`: hide element and return early. Otherwise, ensure element exists (create if absent; returns silently if `feed-turn-label` not found). Branch on status value to set text and visibility for 'connecting', 'paused', 'error'.

## Agent 03

### handleDeepgramTranscript
Async. Guard: returns early if text is empty, debate is missing, or debate.role is unset. Retrieves current user profile and derives author name by falling back through display_name → username → 'You'. Calls `appendFeedEvent()` synchronously with new feed event object — immediate optimistic UI render. Calls `clearInterimTranscript()`. Awaits `writeFeedEvent('speech', text, debate.role)` — any rejection propagates uncaught to caller (no try/catch).

### showInterimTranscript
Queries for existing element with id `feed-interim-transcript`. If not found: queries #feed-stream; returns early if not found; creates div; inserts it as next sibling after stream using `stream.parentElement?.insertBefore(el, stream.nextSibling)`. Sets el.textContent = text. Sets display = text ? '' : 'none'.

### clearInterimTranscript
Queries #feed-interim-transcript. If found, clears textContent to '' and sets display to 'none'. If not found, no-op and returns silently.

### updateDeepgramStatus
If status is 'live' or 'stopped': hides el if it exists, returns early. Queries #feed-deepgram-status. If not found: queries #feed-turn-label; returns early if not found; creates div and inserts after turn-label. Sets textContent and display for 'connecting', 'paused', 'error'. **If status is none of these 5 values**: element is created/found but no text/display is set — potentially leaves el in unknown state.

## Agent 04

### handleDeepgramTranscript
Reads: text, debate.id, debate.role, round (module-level from arena-feed-state.ts). Early return if text/debate/debate.role falsy. Calls getCurrentProfile(). Sets authorName = display_name || username || 'You'. Calls appendFeedEvent() with UUID, debate metadata, round, text, ISO timestamp. Calls clearInterimTranscript(). Awaits writeFeedEvent('speech', text, debate.role).

### showInterimTranscript
Queries feed-interim-transcript. If missing: queries feed-stream; returns silently if missing; creates div; inserts after stream. Sets textContent = text, display = text ? '' : 'none'.

### clearInterimTranscript
Queries feed-interim-transcript. If found: textContent = '', display = 'none'. If not found: no-op.

### updateDeepgramStatus
Status 'live'/'stopped': hide and return. Otherwise: find or create element (anchored after feed-turn-label; returns silently if turnLabel missing). Set text/display for 'connecting'/'paused'/'error' statuses.

## Agent 05

### handleDeepgramTranscript
Entry guard: if text falsy, debate missing, or debate.role missing — returns immediately with no side effects. Creates speech event with UUID, debate context, transcript, ISO timestamp; appends optimistically to local feed via appendFeedEvent. Clears interim transcript UI. Awaits writeFeedEvent RPC; if this rejects, rejection propagates to caller.

### showInterimTranscript
Retrieves or lazily creates DOM element with id `feed-interim-transcript` anchored below `feed-stream`. Returns early if `feed-stream` does not exist. Once element exists, sets textContent to text and toggles display: shows if text truthy, hides if empty. Never throws; degrades gracefully on missing DOM.

### clearInterimTranscript
Queries feed-interim-transcript. If exists: blank text content, display = 'none'. If not: no-op. Never throws.

### updateDeepgramStatus
Fast-path for 'live' or 'stopped': hides indicator (if present) and returns early. For other statuses: retrieves or lazily creates element anchored below feed-turn-label; returns early if turnLabel absent. Branches on status: 'connecting' → connecting message shown; 'paused' → paused message shown; 'error' → error message shown. **Edge case: if status is any other value (not one of the 5 explicit cases), the element is created/retrieved and display is set to '' (shown), but textContent is never updated — retains prior content or remains empty. Indicator is visible with stale or absent text.**
