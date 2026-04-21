# Stage 2 Outputs — config.toast.ts

## Agent 01

### showToast

`showToast` accepts a `msg` string and a `type` parameter of the imported `ToastType` union, which defaults to `'info'`. It reads and writes two module-level variables: `_toastKeyframeInjected` (a boolean, initially `false`) and `_toastTimeout` (a `setTimeout` handle or `null`).

On every call the function first checks `_toastKeyframeInjected`. If it is `false`, it calls `document.createElement('style')`, sets the element's `textContent` to a CSS `@keyframes` rule named `coloToastIn`, appends that element to `document.head`, and sets `_toastKeyframeInjected` to `true`. Subsequent calls skip this block entirely.

Next it calls `document.getElementById('colo-toast')`. If an element with that id exists, it calls `.remove()` on it, discarding any toast currently visible. If `_toastTimeout` is non-null, it calls `clearTimeout` on it and resets `_toastTimeout` to `null`, cancelling any pending hide timer from the prior toast.

It then builds a local `colors` object keyed on `ToastType`. The `'success'` entry maps to CSS variables `--mod-accent` (background) and `--mod-bg-base` (text). The `'error'` entry maps to `--mod-magenta` and `--mod-text-on-accent`. The `'info'` entry maps to a hard-coded `rgba(26,45,74,0.95)` background and `--mod-text-heading` text. It reads `colors[type]` into `c`.

It calls `document.createElement('div')`, sets the element's `id` to `'colo-toast'`, sets its `role` attribute to `'alert'`, and assigns a `cssText` string that fixes the element to `top:80px`, horizontally centered via `left:50%` + `transform:translateX(-50%)`, with the background and text colors from `c`, padding, border-radius, font, z-index, max-width, box-shadow, border, and the `coloToastIn` animation. It assigns `msg` directly to `toast.textContent` (not `innerHTML`). It appends the element to `document.body`.

It then evaluates `type === 'error'` to choose a display duration: `4000` ms for errors, `2500` ms for all other types. It calls `setTimeout` with a callback that sets `toast.style.opacity` to `'0'`, sets `toast.style.transition` to `'opacity 0.3s'`, and schedules a nested `setTimeout` of 300 ms to call `toast.remove()`. The outer `setTimeout` handle is stored in `_toastTimeout`. The function returns `void` and is synchronous throughout; no awaits, no promises.

## Agent 02

### showToast

`showToast` accepts a `msg` string and an optional `type` parameter of the imported `ToastType` union, defaulting to `'info'`. It reads and writes two module-level variables: `_toastKeyframeInjected` (a boolean, initially `false`) and `_toastTimeout` (a `setTimeout` handle or `null`, initially `null`). It returns `void`.

On the first invocation, when `_toastKeyframeInjected` is `false`, the function creates a `<style>` element, assigns the CSS keyframe definition `coloToastIn` (a slide-in from slightly above combined with a fade-in) to its `textContent`, appends it to `document.head`, and sets `_toastKeyframeInjected` to `true`. This injection is skipped on all subsequent calls.

Before creating the new toast element, the function queries the DOM for any existing element with id `colo-toast` via `document.getElementById`. If one is found, it is removed immediately with `.remove()`. If `_toastTimeout` is non-null, `clearTimeout` is called on it and the variable is reset to `null`. These two steps together prevent duplicate toasts and cancel any pending auto-dismiss timer from a prior call.

The function then builds a `colors` map keyed by `ToastType` (`'success'`, `'error'`, `'info'`), each entry holding a `bg` and `text` CSS value expressed as `var(--mod-*)` tokens, except for the `'info'` background which is a literal `rgba` value. It selects the entry matching `type` as `c`.

A new `<div>` is created, assigned id `colo-toast`, given `role="alert"` for accessibility, and styled via an inline `cssText` string that positions it fixed at `top:80px`, horizontally centered with `left:50%` and `transform:translateX(-50%)`, and applies the background and text color from `c`. Additional styles set padding, border-radius, font properties, z-index, max-width, text alignment, box-shadow, border, and the `coloToastIn` animation with a 0.25s ease curve. The element's `textContent` is set to `msg` — not `innerHTML` — so no escaping is needed. The element is appended to `document.body`.

The display duration is computed from `type`: `4000` ms for `'error'`, `2500` ms for any other type. A `setTimeout` is scheduled for that duration and its handle stored in `_toastTimeout`. When the timeout fires, it sets the toast element's `opacity` to `'0'` and `transition` to `'opacity 0.3s'` inline, then schedules a second nested `setTimeout` for 300 ms that calls `toast.remove()` to detach the element from the DOM. Neither timeout is awaited; the function is synchronous and returns immediately after scheduling the outer timer.

## Agent 03

### showToast

`showToast` is a synchronous function that accepts a `msg` string and an optional `type` parameter of type `ToastType` (defaulting to `'info'`). It reads and writes two module-level variables: `_toastKeyframeInjected` (a boolean, initially `false`) and `_toastTimeout` (a `setTimeout` handle or `null`).

On the first invocation, `_toastKeyframeInjected` is `false`, so the function creates a `<style>` element, assigns the `coloToastIn` keyframe animation string to its `textContent`, appends it to `document.head`, and sets `_toastKeyframeInjected` to `true`. All subsequent calls skip this branch entirely.

Next, the function queries the DOM for an existing element with `id="colo-toast"`. If one is found, it is removed immediately via `old.remove()`. If `_toastTimeout` holds a pending timer handle, that timer is cancelled with `clearTimeout` and `_toastTimeout` is set to `null`. This teardown runs unconditionally on every call, clearing any in-progress toast before the new one is created.

The function then builds a `colors` lookup object keyed on `ToastType`. The `'success'` entry uses `--mod-accent` background and `--mod-bg-base` text; `'error'` uses `--mod-magenta` background and `--mod-text-on-accent` text; `'info'` uses a hardcoded `rgba(26,45,74,0.95)` background and `--mod-text-heading` text. The entry for the given `type` is retrieved into `c`.

A new `<div>` is created, assigned `id="colo-toast"` and `role="alert"`, and given a `cssText` string composed by joining an array of inline style declarations. The styles fix the element at `top:80px`, horizontally centred via `left:50%` and `transform:translateX(-50%)`, apply the resolved `c.bg` and `c.text` values, set typography from `--mod-font-ui`, and apply the `coloToastIn` animation. The element's `textContent` is set directly to `msg` (no `innerHTML`, so no XSS surface here). The element is then appended to `document.body`.

Finally, the function calculates a display duration: 4000 ms when `type === 'error'`, otherwise 2500 ms. It calls `setTimeout` with that duration and stores the returned handle in `_toastTimeout`. When the outer timer fires, the callback sets `toast.style.opacity` to `'0'` and `toast.style.transition` to `'opacity 0.3s'` on the already-appended element, then schedules a second inner `setTimeout` for 300 ms that calls `toast.remove()` to detach the element from the DOM. Neither timer is awaited; both are fire-and-forget. The function returns `void`.

## Agent 04

### showToast

`showToast` is a synchronous function that accepts a `msg` string and an optional `type` parameter of `ToastType` (defaulting to `'info'`). It reads and writes two module-level variables: `_toastKeyframeInjected` (a boolean, initially `false`) and `_toastTimeout` (a `setTimeout` handle or `null`).

On the first call, the `_toastKeyframeInjected` flag is `false`, so the function creates a `<style>` element, sets its text content to a `@keyframes coloToastIn` rule that animates a toast in from above with a fade, appends it to `document.head`, and sets `_toastKeyframeInjected` to `true`. On all subsequent calls the keyframe injection branch is skipped entirely.

Before creating a new toast, the function clears any prior one. It calls `document.getElementById('colo-toast')` and, if an element is found, removes it from the DOM. It also checks `_toastTimeout`: if a pending timeout exists, it is cancelled via `clearTimeout` and the variable is reset to `null`. This prevents a stale fade-out callback from removing the incoming toast.

The function then selects a background and text color from an inline `colors` record keyed on `type`. `'success'` maps to `--mod-accent` background with `--mod-bg-base` text; `'error'` maps to `--mod-magenta` background with `--mod-text-on-accent` text; `'info'` maps to a hardcoded `rgba(26,45,74,0.95)` background with `--mod-text-heading` text.

A new `<div>` is created with `id` `'colo-toast'` and `role="alert"`. Its `style.cssText` is set to a joined string of CSS declarations covering fixed positioning at `top: 80px` centered horizontally, the selected colors, padding, border-radius, font settings, a high `z-index` of `99999`, and the `coloToastIn` animation. The element's `textContent` is set to `msg` (no `innerHTML`, so no XSS surface here). The element is appended to `document.body`.

The function then sets `_toastTimeout` to the return value of `setTimeout`. The delay is `4000 ms` if `type === 'error'`, or `2500 ms` otherwise. When the timeout fires, the callback sets `toast.style.opacity` to `'0'` and `toast.style.transition` to `'opacity 0.3s'` to produce a fade-out, then schedules a nested `setTimeout` of `300 ms` to remove the element from the DOM. The outer `_toastTimeout` reference is not cleared after the callback fires, so it holds the expired handle until the next call to `showToast` or until `clearTimeout` would be a no-op. There is no `try/catch` block and no early return path beyond the conditional keyframe injection.

## Agent 05

### showToast

`showToast` is a synchronous function that accepts a `msg` string and an optional `type` parameter of `ToastType` (defaulting to `'info'`), and returns `void`. It reads and writes two module-level variables: `_toastKeyframeInjected` (a boolean, initially `false`) and `_toastTimeout` (a `setTimeout` handle or `null`).

On its first invocation, when `_toastKeyframeInjected` is `false`, it calls `document.createElement('style')`, sets the element's `textContent` to a `@keyframes coloToastIn` rule that animates a slide-in from slightly above and transparent to fully visible at its final position, appends the element to `document.head`, then sets `_toastKeyframeInjected` to `true`. All subsequent calls skip this branch entirely.

Before creating a new toast element, the function checks the DOM for an existing element with `id="colo-toast"` via `document.getElementById`. If one exists, it calls `.remove()` on it. It also checks whether `_toastTimeout` is non-null; if so, it calls `clearTimeout(_toastTimeout)` and resets the variable to `null`. This teardown sequence replaces any in-progress toast rather than queuing behind it.

The function then builds a `colors` record that maps each of the three `ToastType` values — `'success'`, `'error'`, and `'info'` — to a pair of CSS variable references for background and text color. It reads `colors[type]` to get the applicable color pair `c`.

A `<div>` element is created, assigned `id="colo-toast"`, given a `role="alert"` attribute for accessibility, and styled inline via a `cssText` assignment that sets fixed positioning at `top: 80px`, horizontal centering via `left: 50%` and `transform: translateX(-50%)`, the resolved background and text colors, padding, border-radius, font tokens, `z-index: 99999`, a maximum width of `90vw`, centered text alignment, a box shadow, a primary border, and the `coloToastIn` animation with a `0.25s ease` timing. The element's `textContent` is set to `msg` (not `innerHTML`, so no XSS concern). The element is then appended to `document.body`.

Finally, the function determines an auto-dismiss duration: `4000` ms for `'error'` type, `2500` ms for all other types. It assigns `_toastTimeout` the return value of `setTimeout`, which fires after that duration. The timeout callback sets `toast.style.opacity` to `'0'` and `toast.style.transition` to `'opacity 0.3s'`, then schedules a nested `setTimeout` of `300` ms that calls `toast.remove()`. Neither timeout is awaited; both are fire-and-forget. There are no try/catch blocks and no early returns beyond the keyframe-injection guard.
