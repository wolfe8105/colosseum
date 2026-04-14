# Stage 2 Outputs — src/arena/arena-ads.ts

Anchors: `_pushAd` (line 19), `injectAdSlot` (line 31), `showAdInterstitial` (line 57)

---

## Agent 01

### _pushAd (line 19)
Synchronous. No parameters. Reads `window.adsbygoogle`, using nullish-coalescing assignment (`??=`) to initialize it to `[]` if absent, then pushes `{}` onto the array — the standard AdSense signal to process any uninitialized `<ins>` elements in the DOM. The entire body is wrapped in a `try/catch` with an empty `catch` block, silently swallowing any runtime errors.

### injectAdSlot (line 31)
Synchronous. Parameters: `container: HTMLElement`, optional `style: Partial<CSSStyleDeclaration>`. Reads module-level constants `PUB_ID` and `SLOT_ID`. Creates a `<div>` wrapper, sets its `style.cssText` to a fixed string (`width:100%;text-align:center;margin:12px 0;min-height:90px`). If `style` is provided, calls `Object.assign(wrap.style, style)` to merge caller overrides. Sets `wrap.innerHTML` to an `<ins class="adsbygoogle structural-ad-slot">` element carrying `data-ad-client` (PUB_ID), `data-ad-slot` (SLOT_ID), `data-ad-format="auto"`, and `data-full-width-responsive="true"`. Appends wrapper to `container`. Calls `_pushAd()`. Returns void. No error handling beyond what `_pushAd` swallows internally.

### showAdInterstitial (line 57)
Accepts: `onDone: () => void`, optional `totalSec: number` (default 8), optional `skipSec: number` (default 3). Builds a full-screen overlay `<div>` (id=`structural-ad-interstitial`) with `position:fixed;inset:0;z-index:99999` and a semi-transparent background. Sets `innerHTML` to an "ADVERTISEMENT" label, a 320×250 `<ins>` ad element (format="rectangle"), a countdown span (id=`sad-countdown`, initial text `${totalSec}s`), and a skip button (id=`sad-skip`, initially `display:none`). Appends overlay to `document.body`. Calls `_pushAd()`. Queries the overlay for `#sad-countdown` and `#sad-skip`. Declares `remaining = totalSec` and an inner `dismiss` function that calls `overlay.remove()` then `onDone()`. Attaches a click handler on skipBtn that calls `dismiss()`. Starts a `setInterval` at 1000ms: each tick decrements `remaining`, updates `countEl.textContent`, shows skipBtn when `remaining <= totalSec - skipSec`, and when `remaining <= 0` calls `clearInterval(tick)` then `dismiss()`.

**Bug**: The skip button's click handler calls `dismiss()` directly but does not call `clearInterval(tick)`. After skip, the interval continues firing; when `remaining` reaches 0 the interval path also calls `dismiss()`, invoking `onDone()` a second time.

---

## Agent 02

### _pushAd (line 19)
No parameters. Synchronous. Ensures `window.adsbygoogle` exists (initializes to `[]` via `??=`) and pushes an empty object `{}` to signal AdSense to activate uninitialized slots. Full body is in a `try/catch`; the `catch` block is empty, discarding all errors silently.

### injectAdSlot (line 31)
Parameters: `container: HTMLElement`, optional `style: Partial<CSSStyleDeclaration>`. Creates a wrapper `<div>`, applies fixed base styles via `cssText`, then merges any caller-supplied `style` via `Object.assign`. Writes `wrap.innerHTML` to an `<ins class="adsbygoogle structural-ad-slot">` element with PUB_ID and SLOT_ID attributes, auto format, full-width-responsive. Appends wrapper to `container`, then calls `_pushAd()` to trigger AdSense. Synchronous, returns void.

### showAdInterstitial (line 57)
Parameters: `onDone: () => void`, `totalSec = 8`, `skipSec = 3`. Creates a fixed full-screen overlay (id=`structural-ad-interstitial`, z-index 99999). innerHTML includes: advertisement label, 320×250 `<ins>` rectangle ad, countdown span (id=`sad-countdown`), skip button (id=`sad-skip`, hidden initially). Appends to body. Calls `_pushAd()`. Queries `#sad-countdown` and `#sad-skip` from the overlay. Sets `remaining = totalSec`. Defines `dismiss`: removes overlay, calls `onDone`. Adds click listener on skip → `dismiss()`. Starts 1000ms interval: decrements `remaining`, updates countdown text, reveals skip when `remaining <= totalSec - skipSec`, clears interval and calls `dismiss` when `remaining <= 0`.

**Double-fire bug**: Skip click triggers `dismiss()` without clearing the interval. The interval continues and fires `dismiss()` again at countdown end, calling `onDone` twice.

---

## Agent 03

### _pushAd (line 19)
Synchronous, no parameters. Uses `(window.adsbygoogle = window.adsbygoogle ?? []).push({})` — initializes `window.adsbygoogle` to `[]` if null/undefined, then pushes `{}` to signal AdSense. Wrapped in try/catch; catch is empty (swallows all errors).

### injectAdSlot (line 31)
Parameters: `container: HTMLElement`, `style?: Partial<CSSStyleDeclaration>`. Creates `<div>` wrapper. Sets base styles via `cssText` (fixed width/alignment/margin/min-height string). Conditionally applies `Object.assign(wrap.style, style)` if style arg is truthy. Sets `wrap.innerHTML` to `<ins class="adsbygoogle structural-ad-slot">` with `data-ad-client`, `data-ad-slot`, `data-ad-format="auto"`, `data-full-width-responsive="true"`. Appends to container. Calls `_pushAd()`.

### showAdInterstitial (line 57)
`onDone: () => void`, optional `totalSec = 8`, `skipSec = 3`. Creates overlay div (fixed, inset 0, z-index 99999, semi-transparent dark bg). innerHTML: "ADVERTISEMENT" label, `<ins>` 320×250 rectangle ad, `#sad-countdown` span (starts as `${totalSec}s`), `#sad-skip` button (hidden). Appends to body. Calls `_pushAd()`. Queries countdown and skip elements. `remaining = totalSec`. Inner `dismiss()`: overlay.remove() + onDone(). Skip button click → dismiss(). Interval (1000ms): decrement remaining, update text, show skip at `remaining <= totalSec - skipSec`, at `remaining <= 0`: clearInterval + dismiss().

**Bug**: skip handler calls dismiss() but does NOT clearInterval. Interval fires once more (or continues) and calls dismiss() again at zero → onDone() called twice.

---

## Agent 04

### _pushAd (line 19)
Synchronous, no parameters, no return value. Initializes `window.adsbygoogle` to `[]` if not present, pushes `{}` to trigger AdSense processing of any uninitialized ad slots. Try/catch around entire body; catch block empty — all errors silently ignored.

### injectAdSlot (line 31)
`container: HTMLElement`, optional `style: Partial<CSSStyleDeclaration>`. Builds a `<div>` wrapper with base CSS (`width:100%;text-align:center;margin:12px 0;min-height:90px`). Applies optional style overrides via Object.assign. Sets innerHTML to `<ins class="adsbygoogle structural-ad-slot">` with PUB_ID, SLOT_ID, format=auto, full-width-responsive. Appends to container. Calls `_pushAd()`. Synchronous, no return.

### showAdInterstitial (line 57)
`onDone: () => void`, `totalSec = 8`, `skipSec = 3`. Creates fixed full-screen overlay, appends to body. innerHTML has ad label, 320×250 rectangle `<ins>` slot, countdown span `#sad-countdown`, skip button `#sad-skip` (hidden initially). Calls `_pushAd()`. Defines inner `dismiss` (remove overlay, invoke onDone). Skip click → dismiss. Interval at 1 second: decrements remaining, updates countdown text, shows skip when `remaining <= totalSec - skipSec`, when `remaining <= 0`: clearInterval + dismiss.

**Critical flaw**: skip button click listener calls `dismiss()` but does not call `clearInterval`. After skip, interval continues running, and when remaining hits 0, `dismiss()` — and therefore `onDone()` — is called a second time.

---

## Agent 05

### _pushAd (line 19)
Synchronous. No parameters. Body: `(window.adsbygoogle = window.adsbygoogle ?? []).push({})` inside try/catch (catch empty). Guarantees `window.adsbygoogle` is an array, then pushes `{}` — standard AdSense initialization signal. Errors silently swallowed.

### injectAdSlot (line 31)
Params: `container: HTMLElement`, optional `style?: Partial<CSSStyleDeclaration>`. Creates div, sets `style.cssText = 'width:100%;text-align:center;margin:12px 0;min-height:90px'`. If style param present: `Object.assign(wrap.style, style)`. Sets `wrap.innerHTML` to `<ins class="adsbygoogle structural-ad-slot" data-ad-client="${PUB_ID}" data-ad-slot="${SLOT_ID}" data-ad-format="auto" data-full-width-responsive="true">`. Appends to container. Calls `_pushAd()`.

### showAdInterstitial (line 57)
`onDone: () => void`, `totalSec = 8`, `skipSec = 3`. Creates overlay div (position:fixed, inset:0, z-index:99999, rgba dark background). innerHTML: advertisement header, `<ins>` 320×250 rectangle ad, `<span id="sad-countdown">${totalSec}s</span>`, `<button id="sad-skip" style="display:none">Skip Ad</button>`. Appends to document.body. Calls `_pushAd()`. Reads `#sad-countdown` and `#sad-skip` from overlay. `remaining = totalSec`. `dismiss` inner fn: overlay.remove(), onDone(). `skipBtn.addEventListener('click', dismiss)`. `setInterval` at 1000ms: remaining--, update countEl.textContent, show skip when `remaining <= totalSec - skipSec`, at `remaining <= 0`: clearInterval(tick) + dismiss().

**Bug identified**: skip button calls `dismiss()` without `clearInterval(tick)`. Interval is not stopped. When remaining reaches 0, interval path calls `dismiss()` again → `onDone()` fires twice. No guard exists to prevent this double invocation.
