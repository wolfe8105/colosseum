# Stage 2 Outputs — rivals-presence-popup.ts

## Agent 01

### destroy

Reads `_dismissTimer`. If non-null, calls `clearTimeout(_dismissTimer)` and sets `_dismissTimer = null`. Reads `_showNextTimer`. If non-null, calls `clearTimeout(_showNextTimer)` and sets `_showNextTimer = null`. Returns void. No DOM operations, no async operations. Does NOT reset `state.active` or `state.queue` — those live in the caller's `PopupState` object which is not accessible here.

### dismissPopup

Accepts `state: PopupState`. Calls `document.getElementById('rival-alert-popup')` and binds result to `popup`. If `popup` is null, returns immediately — **without** setting `state.active = false`. This is the documented landmine LM-RIVALS-004: `state.active` remains true, and all subsequent `queueAlert` calls push to the queue but `showNext` is never called, permanently stalling the popup system.

If popup found: adds CSS class `'dismissing'`. Clears `_dismissTimer` if non-null (deduplication guard). Sets `_dismissTimer = setTimeout(callback, 300)`. Inside the 300ms callback: sets `_dismissTimer = null`, calls `popup.remove()`, sets `state.active = false`. If `state.queue.length > 0`: clears `_showNextTimer` if non-null, sets `_showNextTimer = setTimeout(callback, 600)`. Inside the 600ms callback: sets `_showNextTimer = null`, calls `showNext(state)`. Full chain: 300ms fade-out + 600ms gap = 900ms between popups.

### showNext

Accepts `state: PopupState`. Calls `state.queue.shift()`. If result is falsy (queue empty), sets `state.active = false` and returns. Otherwise sets `state.active = true`, calls `injectRivalsPresenceCSS()` (idempotent CSS injection). Queries `#rival-alert-popup`; if found, removes it (defensive cleanup). Computes `displayName = payload.display_name ?? payload.username ?? 'YOUR RIVAL'`. Calls `escapeHTML(displayName.toUpperCase())` and stores as `safeName`. Creates a `<div>`, sets `id = 'rival-alert-popup'`, assigns `innerHTML` to a template containing: static icon (`⚔️`), static title (`RIVAL ALERT`), `${safeName}` in `.rap-name`, static subtitle, two buttons (`#rap-challenge-btn`, `#rap-dismiss-btn`). Appends popup to `document.body`.

Sets `const timer = setTimeout(() => dismissPopup(state), 8000)` — **this handle is stored in a LOCAL variable, not in `_dismissTimer` or `_showNextTimer`**. This means `destroy()` cannot cancel the 8-second auto-dismiss timer.

Queries `#rap-dismiss-btn` and attaches click handler: calls `clearTimeout(timer)`, then `dismissPopup(state)`. Queries `#rap-challenge-btn` and attaches click handler: calls `clearTimeout(timer)`, calls `dismissPopup(state)`, then if `payload.user_id` truthy, calls `import('./auth.ts').then(({ showUserProfile }) => showUserProfile(payload.user_id)).catch(e => console.warn(...))`.

### queueAlert

Accepts `payload: PresencePayload`, `state: PopupState`. Calls `state.queue.push(payload)`. If `!state.active`, calls `showNext(state)`. Otherwise returns — payload sits in queue to be picked up by the dismiss → showNextTimer chain.

---

## Agent 02

### destroy
Clears `_dismissTimer` and `_showNextTimer` and nulls them. Does not remove popup from DOM or reset `state.active`. If called mid-dismiss (popup has `.dismissing` class, `_dismissTimer` running), the timer is cancelled, popup stays in DOM in frozen state, `state.active` remains true.

### dismissPopup
LM-RIVALS-004 failure scenarios:
- **Race 1 — stale DOM:** Any external code removes `#rival-alert-popup` (navigation, body wipe). `state.active` remains true. Queue deadlocks.
- **Race 2 — showNext's own cleanup:** `showNext` calls `existing.remove()` before creating new popup. If `dismissPopup` called immediately after, element is gone → early return → `state.active` stays true.
- **Race 3 — external mutation:** Any code outside module removes `#rival-alert-popup`.

Normal path: adds `'dismissing'`, deduplicates `_dismissTimer`, schedules 300ms callback. Callback: removes popup, sets `state.active = false`, conditionally chains `showNext` via `_showNextTimer` (600ms).

### showNext
Auto-dismiss timer `timer` is local. If `destroy()` is called while popup is showing and neither button is clicked, the 8s timer still fires against potentially stale state. If it fires after DOM teardown: LM-RIVALS-004 early return leaves `state.active = true`.

displayName chain: `display_name ?? username ?? 'YOUR RIVAL'`. `safeName = escapeHTML(displayName.toUpperCase())`. Only user-sourced value in innerHTML. Safe.

Dynamic import on challenge: fails silently (console.warn). User gets no feedback.

### queueAlert
Push + conditional showNext. Correct under normal operation. Poisoned by LM-RIVALS-004 state corruption.

Findings: MEDIUM — LM-RIVALS-004 early return | MEDIUM — 8s timer not cancellable by destroy() | LOW — dynamic import failure gives no user feedback

---

## Agent 03

### destroy
Clears both module-level timers. Does not touch local `timer` variable in showNext (cannot — closure-scoped). Does not reset `state.active` (state is not a parameter here by design).

### dismissPopup
LM-RIVALS-004: early return on line 43 when popup not found leaves `state.active = true`. Fix: change to `if (!popup) { state.active = false; return; }`.

Normal path documented. Timer chain: 300ms animation + 600ms gap = 900ms inter-popup interval.

### showNext
Step-by-step: shift → empty guard → `state.active = true` → CSS inject → stale cleanup → displayName fallback → `escapeHTML(displayName.toUpperCase())` → createElement → innerHTML → appendChild → 8s local timer → button wiring → dynamic import on challenge.

**Note on `??` operator:** `payload.display_name ?? payload.username ?? 'YOUR RIVAL'` — nullish coalescing does NOT catch empty string `""`. A user with `display_name: ""` will render a blank name instead of falling back to `username`. Use `||` instead to also catch falsy values.

`payload.user_id` is passed to `showUserProfile` after only a truthiness check, not UUID format validation.

### queueAlert
Push + conditional showNext. No deduplication — same rival can appear multiple times in queue.

---

## Agent 04

### destroy
Clears `_dismissTimer` and `_showNextTimer`, nulls them. Does not reset `state.active`. Incomplete teardown for `timer` local in showNext.

### dismissPopup
LM-RIVALS-004 fully documented in source comment. Fix described: move `state.active = false` above the early-return guard.

Normal path: 300ms timer → popup.remove() → state.active = false → optional 600ms → showNext.

### showNext
`timer` local — cannot be cancelled by destroy(). Potential concurrent timers: if showNext called again before 8s fires (via `existing.remove()` path), two 8s timers race to call dismissPopup.

`??` vs `||` issue: empty string display_name bypasses fallback.

### queueAlert
Correct. No deduplication.

Findings: M1 MEDIUM — destroy() doesn't reset state.active | M2 MEDIUM — LM-RIVALS-004 | M3 MEDIUM — 8s timer local | L2 LOW — `??` should be `||` for display name

---

## Agent 05

### destroy
Clears both module-level timers. Cannot cancel the showNext-local 8s `timer`. Gap: if destroy() is called while popup showing, 8s fires later and calls dismissPopup on stale state, which likely hits LM-RIVALS-004 early return.

### dismissPopup
LM-RIVALS-004: documented. Effect: `state.active` stuck true, queue deadlocked. Only recovery is external state reset or page reload. destroy() itself doesn't fix it.

### showNext
`const timer = setTimeout(() => dismissPopup(state), 8000)` — local only. Fix: promote to `_dismissTimer = setTimeout(() => { _dismissTimer = null; dismissPopup(state); }, 8000)`. This would make it cancellable by destroy().

displayName: `??` catches null/undefined only. Empty string `""` display_name produces blank popup name. Use `||`.

Dynamic import: redundant (auth.ts statically loaded, resolves from cache). Cosmetic (LM-RIVALS-006 / L-E1).

### queueAlert
No deduplication — same user_id can appear multiple times in queue. Rapid presence events create duplicate popups.

Findings: MEDIUM — uncancellable 8s timer | MEDIUM — LM-RIVALS-004 | LOW — queueAlert no dedup | LOW — `??` should be `||` | INFO — redundant dynamic import

---

## Synthesis

**All agents agree on runtime behavior of all 4 functions.**

### Confirmed findings (deduplicated):

**MEDIUM | 8-second auto-dismiss timer is closure-local and not cancellable by destroy() | showNext line 85**
`const timer` inside `showNext` is not stored in `_dismissTimer` or `_showNextTimer`. `destroy()` can only clear the two module-level handles. If `destroy()` is called while a popup is showing (and the user has not interacted), the 8-second timer fires after teardown, calling `dismissPopup(state)` on potentially stale state. This can trigger LM-RIVALS-004 (early return, `state.active` left true) if the DOM has been cleaned up. Fix: assign to `_dismissTimer` instead of a local const.

**MEDIUM | LM-RIVALS-004 — dismissPopup early return without state.active = false | line 43**
`if (!popup) return;` fires without resetting `state.active`. Consequence: `state.active` stuck true, `queueAlert` silently enqueues forever without ever calling `showNext`. System deadlocks until external state reset. Explicitly pre-documented in source as M-E7. Fix: `if (!popup) { state.active = false; return; }`.

**LOW | displayName fallback uses `??` instead of `||`, empty-string display_name not caught | line 67**
`payload.display_name ?? payload.username ?? 'YOUR RIVAL'` — nullish coalescing passes empty strings through. A user with `display_name: ""` renders blank popup name. Use `||` to also catch empty strings.

**LOW | queueAlert performs no deduplication | line 108**
Multiple rapid queueAlert calls with the same `user_id` push multiple entries. Same rival can trigger N back-to-back popups. No queue depth limit.

**INFO | Dynamic import('./auth.ts') is redundant | line 100**
`auth.ts` is statically loaded at page init. Dynamic import resolves immediately from module cache. Cosmetic — documented as LM-RIVALS-006 / L-E1.

**INFO | XSS: escapeHTML correctly applied | line 68**
`escapeHTML(displayName.toUpperCase())` — only user-sourced value in innerHTML. Correctly sanitized. No XSS vector.
