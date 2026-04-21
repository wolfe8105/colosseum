# Stage 2 Outputs — src/arena/arena-mod-refs-ruling.ts

## Agent 01

### showRulingPanel

The function accepts a single `ref: ReferenceItem` parameter and returns `void`.

It reads the DOM element with id `mod-ruling-overlay` via `document.getElementById` and calls `.remove()` on it if present (optional chaining), clearing any prior overlay.

It derives `sideLabel` by branching on `ref.supports_side`: `'a'` maps to `'Side A'`, `'b'` maps to `'Side B'`, any other value maps to `'Neutral'`.

It calls `document.createElement('div')`, sets `className` to `'mod-ruling-overlay'` and `id` to `'mod-ruling-overlay'`, then assigns a template-literal HTML string to `overlay.innerHTML`. That template reads `ref.submitter_name` (fallback `'Unknown'`), `ref.round` (fallback `'?'`), `ref.url`, `ref.description`, and the computed `sideLabel`. Each user-supplied string field is passed through `escapeHTML()` imported from `../config.ts` before interpolation. The `url` and `description` fragments are conditionally rendered via ternary guards. It appends the overlay to `document.body`.

It initializes a local `countdown = 60` and queries `#mod-ruling-timer` inside the overlay. It reads the module-level `_rulingCountdownTimer` from `./arena-state.ts`; if truthy, it calls `clearInterval(_rulingCountdownTimer)`. It then calls `setInterval` with a 1000ms tick and writes the returned handle to `_rulingCountdownTimer` via `set__rulingCountdownTimer(...)`. On each tick the callback decrements `countdown`, writes `countdown + 's auto-allow'` into `timerEl.textContent` if `timerEl` was found, and when `countdown <= 0` it calls `clearInterval(_rulingCountdownTimer!)`, sets the state to `null` via `set__rulingCountdownTimer(null)`, calls `overlay.remove()`, and fires `ruleOnReference(ref.id, 'allowed', 'Auto-allowed (moderator timeout)')` as a fire-and-forget promise with a `.catch` that routes failures to `console.warn`.

It declares a local `_rulingBusy = false` guard shared by both button handlers.

It attaches a click listener to `#mod-ruling-allow` via optional-chained `addEventListener`. The handler is `async`: on entry it early-returns if `_rulingBusy` is true, otherwise sets `_rulingBusy = true`, queries both buttons and sets their `disabled` flags to true, calls `clearInterval(_rulingCountdownTimer!)` and `set__rulingCountdownTimer(null)`, reads and trims the value of `#mod-ruling-reason` (falling back to `''`), and awaits `ruleOnReference(ref.id, 'allowed', reason)` imported from `../auth.ts`. If the awaited `result?.error` is truthy, it calls `addSystemMessage` with a failure string built from `friendlyError(result.error)` or `String(result.error)`, resets `_rulingBusy` to false, and re-enables both buttons. On success it calls `addSystemMessage` with an ALLOWED confirmation, optionally appending the reason. Either branch ends with `overlay.remove()`. There is no `try/catch` around the `await`, so a thrown (rejected) promise would propagate to the listener as an unhandled rejection; only the `.error` shape on the resolved result is inspected.

It attaches an equivalent click listener to `#mod-ruling-deny` with the same structure, but passes `'denied'` to `ruleOnReference` and emits a DENIED system message on success.

It attaches a click listener to `.mod-ruling-backdrop` whose body is an empty comment — the backdrop click is intentionally a no-op.

Writes: module-level `_rulingCountdownTimer` (via setter, both assignment to a new interval handle and to `null`); the DOM (removes prior overlay, appends a new one, updates button `disabled` states, updates timer text, removes the overlay on completion). Async status: the interval auto-allow `ruleOnReference` call is fire-and-forget with a `.catch`; the allow-button and deny-button `ruleOnReference` calls are awaited.

### startReferencePoll

The function accepts `_debateId: string` (prefixed with underscore, unused) and returns `void`. The body is a single `return;` statement preceded by comments noting F-55 retired the old `submit_reference` → ruling poll. The function reads nothing, writes nothing, calls no other functions, has no branches, no loops, no async, and no error paths. It is a no-op retained as a stub.

### stopReferencePoll

The function takes no parameters and returns `void`.

It reads the module-level `referencePollTimer` from `./arena-state.ts`. If truthy, it executes a single-line block that calls `clearInterval(referencePollTimer)` on the browser API and then `set_referencePollTimer(null)` to write `null` back to module state. The `if` has no `else` branch.

Unconditionally (outside the `if`), it calls `set_pendingReferences([])`, writing a fresh empty array into that module-level state.

No awaits, no promises, no try/catch, no return value beyond `void`.

## Agent 02

### showRulingPanel

Reads the `ref` parameter (a `ReferenceItem` with fields `supports_side`, `submitter_name`, `round`, `url`, `description`, `id`). Reads the module-level `_rulingCountdownTimer` to check for and clear any prior interval. Reads DOM at the close of the countdown and at button click time, including `#mod-ruling-timer`, `#mod-ruling-reason` (value), and the `#mod-ruling-allow` / `#mod-ruling-deny` buttons queried through the overlay element.

Writes to DOM: removes any pre-existing element with id `mod-ruling-overlay`, then constructs a new `div` with that id and the class `mod-ruling-overlay`, sets its `innerHTML` with the panel markup, and appends it to `document.body`. The template interpolates `sideLabel` (derived from `ref.supports_side`: `'Side A'` for `'a'`, `'Side B'` for `'b'`, else `'Neutral'`), `ref.submitter_name` (falling back to `'Unknown'`) through `escapeHTML`, `ref.round` (or literal `'?'`), and conditionally the `url` and `description` blocks, each passed through `escapeHTML`. During the countdown it writes `textContent` on `#mod-ruling-timer` each second. On button click it toggles `disabled` on both buttons, later removing the overlay via `overlay.remove()`.

Writes module state by calling `set__rulingCountdownTimer` with the new interval handle and later `set__rulingCountdownTimer(null)` when the interval is cleared (on expiry, on Allow click, and on Deny click). Holds a local `_rulingBusy` flag as click re-entry guard and a local `countdown` counter initialised to `60`.

Calls, in order on entry: `document.getElementById('mod-ruling-overlay')?.remove()`, `document.createElement('div')`, `escapeHTML` (on submitter name, and conditionally on `ref.url` and `ref.description`), `document.body.appendChild`, `overlay.querySelector('#mod-ruling-timer')`, `clearInterval` (guarded by `_rulingCountdownTimer` truthiness), `setInterval` passed to `set__rulingCountdownTimer`, and three more `overlay.querySelector` calls to attach listeners to allow, deny, and backdrop.

Control flow — interval tick (every 1000 ms): decrements `countdown`, writes the new text into `timerEl` if present, and when `countdown <= 0` clears the interval (non-null asserted), nulls `_rulingCountdownTimer` via the setter, removes the overlay, then calls `ruleOnReference(ref.id, 'allowed', 'Auto-allowed (moderator timeout)')`. That promise is fire-and-forget with a `.catch` that logs `'[Arena] ruleOnReference auto-allow failed:'` plus the error via `console.warn`; nothing downstream is awaited.

Control flow — Allow click handler (async): if `_rulingBusy` is true, returns early. Otherwise sets `_rulingBusy = true`, resolves `allowBtn` and `denyBtn` from the overlay, disables both if present, clears the countdown interval and nulls its slot, reads the trimmed `reason` from the `#mod-ruling-reason` textarea (empty string if missing), and awaits `ruleOnReference(ref.id, 'allowed', reason)`. If the resolved `result?.error` is truthy, calls `addSystemMessage` with a cross-mark prefix and either `friendlyError(result.error)` or `String(result.error)`, then resets `_rulingBusy = false` and re-enables both buttons. Otherwise calls `addSystemMessage` with the allowed message, appending `': ' + reason` only when `reason` is non-empty. In both branches `overlay.remove()` runs at the end (including after the error branch re-enables the buttons, which means the overlay is removed even on failure — the re-enable is effectively moot because the overlay is gone).

Control flow — Deny click handler (async): same shape as Allow, with `ruleOnReference(ref.id, 'denied', reason)` awaited, and success-path `addSystemMessage` prefixed with the denial cross-mark.

Control flow — backdrop click handler: registered but its body is empty (comment-only); clicking the backdrop does nothing.

Error paths: the auto-allow `ruleOnReference` rejection is swallowed into `console.warn`; the Allow and Deny handlers treat a thrown rejection from `await ruleOnReference` as an uncaught exception (no `try/catch`) — only a `result.error` field on a resolved value is branched on.

### startReferencePoll

Reads its `_debateId` parameter (prefixed underscore, unused). Reads no module state, no DOM, no network. Writes nothing. Calls no functions. Returns `undefined` immediately. Per the in-body comment, this is an intentional no-op kept as a placeholder after the F-55 retirement of the `submit_reference` → moderator ruling poll, with a landmine note to reimplement against the new challenge tables if ever revived.

### stopReferencePoll

Reads the module-level `referencePollTimer`. If it is truthy, calls `clearInterval(referencePollTimer)` and then `set_referencePollTimer(null)`; if it is falsy, skips that branch. Unconditionally calls `set_pendingReferences([])`, writing an empty array into the module-level pending-references slot. Returns `undefined`. No awaits, no DOM reads, no network, no error handling.

## Agent 03

### showRulingPanel
Called with a `ref: ReferenceItem` parameter and returns void. It begins by looking up any existing element with id `mod-ruling-overlay` in the DOM and removing it if present via optional chaining. It derives a `sideLabel` string by reading `ref.supports_side`: value `'a'` maps to `'Side A'`, `'b'` maps to `'Side B'`, any other value maps to `'Neutral'`.

It creates a new `div` element, sets its `className` to `'mod-ruling-overlay'` and `id` to `'mod-ruling-overlay'`, then assigns a template-literal HTML string to `innerHTML`. The template reads `ref.submitter_name` (falling back to `'Unknown'`), `ref.round` (falling back to `'?'`), `ref.url`, and `ref.description`; each user-supplied value that enters the HTML is first passed through `escapeHTML` imported from `../config.ts`. Conditional expressions emit the URL block only when `ref.url` is truthy, and the description block only when `ref.description` is truthy. The overlay is then appended to `document.body`.

The function declares a local `countdown` initialised to 60 and queries the overlay for `#mod-ruling-timer`. It reads module-level state `_rulingCountdownTimer`; if truthy it calls `clearInterval` on it. It then calls `setInterval` with a 1000ms callback and writes the returned id to module state via `set__rulingCountdownTimer`. On each tick the callback decrements `countdown`, writes `"${countdown}s auto-allow"` into `timerEl.textContent` when `timerEl` is non-null, and when `countdown <= 0` it clears the interval using the non-null-asserted `_rulingCountdownTimer`, writes null back via `set__rulingCountdownTimer`, removes `overlay` from the DOM, and calls `ruleOnReference(ref.id, 'allowed', 'Auto-allowed (moderator timeout)')`. That call is fire-and-forget with a `.catch` attached that logs via `console.warn` prefixed `[Arena] ruleOnReference auto-allow failed:`.

A closure-scoped `_rulingBusy` flag is initialised to false. A `click` listener is attached to the overlay's `#mod-ruling-allow` button as an `async` callback. On click: if `_rulingBusy` is true the listener returns immediately; otherwise it sets `_rulingBusy = true`, looks up the allow and deny buttons and disables both, clears `_rulingCountdownTimer` and writes null back, reads the trimmed value of `#mod-ruling-reason` (defaulting to empty string if the element is missing or has no value), awaits `ruleOnReference(ref.id, 'allowed', reason)`, and stores the result. If `result?.error` is truthy it calls `addSystemMessage` with a string prefixed by a cross emoji and the output of `friendlyError(result.error)` (falling back to `String(result.error)`), resets `_rulingBusy` to false, and re-enables both buttons. Otherwise it calls `addSystemMessage` with a check-emoji string, appending `': ' + reason` when `reason` is non-empty. After either branch the overlay is removed.

A symmetric listener is attached to `#mod-ruling-deny`: same busy guard and button disabling, same interval clear and state writes, same reason read, but it awaits `ruleOnReference(ref.id, 'denied', reason)` and on success passes a cross-emoji "DENIED" message to `addSystemMessage` instead.

A final `click` listener is attached to `.mod-ruling-backdrop`; the body is empty (only a comment) so backdrop clicks are a no-op.

Uncertainty: the local `_rulingBusy` flag is captured in both button closures independently — it lives in the `showRulingPanel` lexical scope, so it is shared between the allow and deny handlers across a single invocation but not across invocations.

### startReferencePoll
Called with a `_debateId: string` parameter and returns void. The body consists solely of comments describing that the F-55 submit_reference flow has been retired and a landmine marker, followed by `return;`. Nothing is read, nothing is written, no other functions are called, no branches execute, and the parameter is unused (leading underscore). It is a synchronous no-op.

### stopReferencePoll
Called with no parameters and returns void. It reads the module-level `referencePollTimer` state. If truthy, it calls `clearInterval(referencePollTimer)` then `set_referencePollTimer(null)` to write null back to module state. Regardless of the branch above, it then calls `set_pendingReferences([])`, writing an empty array into that module state. There are no async calls, no try/catch, and no error paths.

## Agent 04

### showRulingPanel

Receives a `ReferenceItem` named `ref`. Begins by calling `document.getElementById('mod-ruling-overlay')` and invoking `.remove()` via optional chaining, stripping any pre-existing overlay from the DOM.

Computes `sideLabel` by reading `ref.supports_side` and resolving to the string `'Side A'`, `'Side B'`, or `'Neutral'` through nested ternaries.

Creates a new `div` element via `document.createElement`, assigns `className = 'mod-ruling-overlay'` and `id = 'mod-ruling-overlay'`, then populates `innerHTML` with a template string. Values interpolated into that HTML include `ref.submitter_name` (falling back to `'Unknown'`), `ref.round` (falling back to `'?'`), `ref.url`, `ref.description`, and `sideLabel`. `escapeHTML` from `../config.ts` is called on each user-controlled string (`submitter_name`, `url`, `description`) before it enters the template. The `url` and `description` blocks are emitted conditionally using ternaries that test truthiness of those fields. Appends the overlay to `document.body`.

Initializes a local `countdown` to `60` and queries the overlay for `#mod-ruling-timer`. Reads the imported module-level `_rulingCountdownTimer`; if truthy, passes it to `clearInterval`. Calls `setInterval` with a 1000 ms callback and passes the returned handle to `set__rulingCountdownTimer`, writing it into arena state. Inside the interval callback, `countdown` is decremented, `timerEl.textContent` is rewritten (guarded by a truthy check on `timerEl`), and when `countdown <= 0` it calls `clearInterval(_rulingCountdownTimer!)`, resets the state slot via `set__rulingCountdownTimer(null)`, removes the overlay DOM node, and fires `ruleOnReference(ref.id, 'allowed', 'Auto-allowed (moderator timeout)')` as a fire-and-forget promise whose `.catch` handler logs a warning through `console.warn`.

Declares a local closure variable `_rulingBusy = false` for re-entry guarding across the allow/deny click handlers.

Attaches a click listener to `#mod-ruling-allow` via optional chaining on `querySelector`. On click (async): returns early if `_rulingBusy` is truthy; otherwise sets `_rulingBusy = true`, queries the allow and deny buttons, sets their `disabled` properties to `true`, clears the countdown interval via `clearInterval(_rulingCountdownTimer!)`, writes `null` back through `set__rulingCountdownTimer`, reads the trimmed value of `#mod-ruling-reason` (defaulting to `''`), and `await`s `ruleOnReference(ref.id, 'allowed', reason)`. If the resolved `result?.error` is truthy, it calls `addSystemMessage` with `'❌ Ruling failed: '` concatenated with `friendlyError(result.error)` (or `String(result.error)` as fallback), restores `_rulingBusy = false`, and re-enables both buttons. Otherwise it calls `addSystemMessage` with `'✅ Evidence ALLOWED by moderator'` plus an optional reason suffix. Either branch ends by calling `overlay.remove()` — note the overlay is removed even on error, which may leave `_rulingBusy`/button state changes ineffective since the DOM is gone (uncertain whether intentional).

Attaches a symmetric click listener to `#mod-ruling-deny`. Same re-entry guard, same button-disable pattern, same interval clear, same reason read. Calls `ruleOnReference(ref.id, 'denied', reason)` and `await`s it. Error branch uses the same failure toast; success branch uses `'❌ Evidence DENIED by moderator'` plus optional reason. Overlay is removed unconditionally at the end.

Attaches a click listener to `.mod-ruling-backdrop` whose body is empty — the listener is registered but performs no action, explicitly blocking backdrop-tap dismissal.

Returns `void`. Awaited calls: the two `ruleOnReference` calls inside the allow/deny handlers. Fire-and-forget: the auto-allow `ruleOnReference` inside the interval callback. No try/catch anywhere — only the fire-and-forget path uses `.catch` on the promise chain.

### startReferencePoll

Accepts one parameter `_debateId: string` which is never read. The entire body is comments (documenting that F-55 retired the `submit_reference` poll and that the new system uses `file_reference_challenge` → `rule_on_reference`) followed by a bare `return`. Reads nothing from module state, DOM, or network. Writes nothing. Calls nothing. Returns `undefined` unconditionally. No branches, no async work, no error paths.

### stopReferencePoll

Reads the module-level `referencePollTimer` imported from `./arena-state.ts`. In a single `if` branch gated on that value being truthy, it calls `clearInterval(referencePollTimer)` and then `set_referencePollTimer(null)` to zero out the state slot. Unconditionally after that branch, it calls `set_pendingReferences([])`, overwriting the module-level pending references array with a fresh empty array. Returns `void`. Synchronous throughout; no parameters, no network, no DOM, no try/catch, no loops.

## Agent 05

### showRulingPanel
Accepts one parameter `ref` typed as `ReferenceItem`. First removes any element in the document with id `mod-ruling-overlay` via `document.getElementById(...)?.remove()`. Derives a local `sideLabel` string from `ref.supports_side`: `'Side A'` when `'a'`, `'Side B'` when `'b'`, otherwise `'Neutral'`.

Creates a new `<div>` element, assigns className `'mod-ruling-overlay'` and id `'mod-ruling-overlay'`, and assigns an HTML template literal to its `innerHTML`. The template embeds `escapeHTML(ref.submitter_name || 'Unknown')`, `ref.round || '?'`, `sideLabel` (twice), and, when truthy, `escapeHTML(ref.url)` and `escapeHTML(ref.description)`. It contains a timer element with text `'60s auto-allow'`, a textarea with id `mod-ruling-reason` and maxlength 300, and two buttons with ids `mod-ruling-allow` and `mod-ruling-deny`. The overlay is appended to `document.body`.

Initializes a local `countdown = 60` and looks up the timer element within the overlay. Reads the module-level `_rulingCountdownTimer`; if truthy, calls `clearInterval` on it. Then calls `setInterval` with a 1000ms callback and passes the returned handle to `set__rulingCountdownTimer`. Each tick the callback decrements `countdown`, writes `countdown + 's auto-allow'` to the timer element's `textContent` if that element exists, and when `countdown <= 0` calls `clearInterval(_rulingCountdownTimer!)`, calls `set__rulingCountdownTimer(null)`, removes the overlay, then fire-and-forget calls `ruleOnReference(ref.id, 'allowed', 'Auto-allowed (moderator timeout)')` with a `.catch` that logs via `console.warn`. The interval is not awaited; the surrounding function returns after wiring.

Declares a local `_rulingBusy = false` flag (scoped to this call). Attaches a click listener to the element with id `mod-ruling-allow`. The listener is `async` and on invocation returns early if `_rulingBusy` is true; otherwise sets `_rulingBusy = true`, re-queries both buttons within the overlay, disables each if found, calls `clearInterval(_rulingCountdownTimer!)`, calls `set__rulingCountdownTimer(null)`, reads and trims the textarea value (defaulting to empty string when the element or value is missing), then `await`s `ruleOnReference(ref.id, 'allowed', reason)`. If the awaited result has a truthy `error`, calls `addSystemMessage` with a string prefixed by an X mark that concatenates `friendlyError(result.error)` or `String(result.error)`, resets `_rulingBusy = false`, and re-enables both buttons; otherwise calls `addSystemMessage` with a check-mark string and appends `': ' + reason` when `reason` is truthy. In both branches the overlay is removed at the end.

Attaches a click listener to the element with id `mod-ruling-deny` that mirrors the allow listener except it passes `'denied'` to `ruleOnReference` and the success message reads `'Evidence DENIED by moderator'` with the X-mark prefix.

Attaches a click listener to the element matching `.mod-ruling-backdrop`; its body is empty (the comment states the moderator must rule), so backdrop taps do nothing.

Returns `void` with no explicit return. Reads the module-level `_rulingCountdownTimer`; writes to it indirectly through `set__rulingCountdownTimer`. Calls `escapeHTML`, `document.getElementById`, `document.createElement`, `document.body.appendChild`, `clearInterval`, `setInterval`, `ruleOnReference` (both awaited in button handlers and fire-and-forget in the timer tick), `friendlyError`, and `addSystemMessage`. The only awaited calls are the two `ruleOnReference` invocations inside the button click handlers; the timer's `ruleOnReference` call and all handler attachments are fire-and-forget relative to `showRulingPanel` itself, which returns synchronously after appending the overlay and wiring listeners.

### startReferencePoll
Accepts one parameter named `_debateId` typed `string` and ignores it. The body contains only comments documenting that the F-55 reference poll has been retired and a `return` statement. No reads, no writes, no calls, no branches, no async work. Returns `undefined`.

### stopReferencePoll
Accepts no parameters. Reads the module-level `referencePollTimer`. If it is truthy, calls `clearInterval(referencePollTimer)` and then `set_referencePollTimer(null)`. Unconditionally after the `if` block, calls `set_pendingReferences([])` with a fresh empty array, clearing that module-level state. Returns `undefined` (no explicit return value). No async work, no try/catch, no error paths.
