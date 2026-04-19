# Stage 2 Outputs — arena-ads.ts

## Agent 01

### `destroy` (line 23)
Checks if `_interstitialTick` is non-null; if so, calls `clearInterval(_interstitialTick)` and sets `_interstitialTick = null`. Returns void. Idempotent — safe to call multiple times. Does not remove any DOM overlay or call `onDone`.

### `_pushAd` (line 27)
Casts `window` to include optional `adsbygoogle` array; initializes it to `[]` if not already set; pushes empty object `{}` to trigger AdSense slot fill. Entire body wrapped in try/catch — any error silently swallowed. Returns void. Private, not exported.

### `injectAdSlot` (container, style?) (line 39)
Creates a `div` wrapper with inline CSS (`width:100%;text-align:center;margin:12px 0;min-height:90px;`). If `style` provided, merges it into wrapper's style via `Object.assign`. Sets `wrap.innerHTML` to an `<ins>` element with class `adsbygoogle structural-ad-slot`, `data-ad-client=PUB_ID`, `data-ad-slot=SLOT_ID`, `data-ad-format="auto"`, `data-full-width-responsive="true"`. Appends wrapper to `container`. Calls `_pushAd()`. Returns void. Each call produces an independent slot; no deduplication.

### `showAdInterstitial` (onDone, totalSec=8, skipSec=3) (line 65)
Creates full-screen fixed-position overlay div (`id="structural-ad-interstitial"`). Sets innerHTML: "ADVERTISEMENT" label, `<ins>` ad slot (320px×250px, `data-ad-format="rectangle"`, same PUB_ID/SLOT_ID), countdown span `#sad-countdown` initialized to `${totalSec}s`, skip button `#sad-skip` initially `display:none`. Appends overlay to `document.body`. Calls `_pushAd()`. Initializes `remaining = totalSec`. Queries `countEl` and `skipBtn` from overlay (non-null asserted). Defines inner `dismiss()`: clears `_interstitialTick`, removes overlay, calls `onDone()`. Attaches `click` listener on `skipBtn` → `dismiss()`. Clears any existing `_interstitialTick` (line 113). Starts new `setInterval` (1000ms): decrements `remaining`, updates countdown text, shows skipBtn when `remaining <= totalSec - skipSec`, auto-dismisses when `remaining <= 0` (clears interval, nulls tick, calls `dismiss()`).

## Agent 02

### `destroy` (line 23)
Cancels active interstitial countdown. Guard: `if (_interstitialTick)`. Clears interval, nulls handle. Does NOT remove overlay from DOM or fire `onDone`.

### `_pushAd` (line 27)
Internal AdSense trigger. Ensures `window.adsbygoogle` array exists, pushes `{}`. Try/catch silences errors. Private.

### `injectAdSlot` (container, style?) (line 39)
Creates wrapper div, injects `<ins>` via innerHTML. Optional style merged via Object.assign. Appends to container. Calls _pushAd(). Each call independent. Both injectAdSlot and showAdInterstitial use the same SLOT_ID '8647716209'.

### `showAdInterstitial` (onDone, totalSec=8, skipSec=3) (line 65)
Creates overlay. On duplicate call while prior interstitial active: line 113 clears old tick but does NOT remove old overlay. New overlay appended — two overlays stack in DOM. Old overlay's skip button still has active click listener pointing to old `dismiss()` which removes old overlay and calls old `onDone()`. New onDone races with old onDone. Skip button appears after `skipSec` seconds elapsed (when remaining <= totalSec - skipSec).

## Agent 03

### `destroy` (line 23)
Idempotent tick cancellation. Does not remove DOM overlay — if called mid-interstitial, countdown freezes but overlay remains. Skip button on overlay is still clickable (fires `dismiss()` → `overlay.remove()` + `onDone()`). Flow not permanently blocked.

### `_pushAd` (line 27)
Standard try/catch AdSense push. No issues.

### `injectAdSlot` (container, style?) (line 39)
Appends inline banner. innerHTML uses only PUB_ID/SLOT_ID constants — XSS-safe. No guard against duplicate insertion to same container.

### `showAdInterstitial` (onDone, totalSec=8, skipSec=3) (line 65)
Skip button visibility condition: `remaining <= totalSec - skipSec` — button appears after exactly `skipSec` ticks (3 by default). Auto-dismiss: `remaining <= 0` — fires `clearInterval` then `dismiss()`. Both paths eventually call `onDone()`. `dismiss()` closure captures `overlay`, `_interstitialTick` reference, and `onDone`.

Note on M-I1 (PREVIOUSLY LOGGED — "skip click doesn't clearInterval(tick)"): Current source shows `dismiss()` is called on skip click, and `dismiss()` does `clearInterval(_interstitialTick)`. This appears FIXED in current source.

## Agent 04

### `destroy` (line 23)
Exported cleanup. Clears tick only. Does not fire `onDone`. Overlay stays but remains interactive — user can still click skip button to trigger `dismiss()` → `overlay.remove()` + `onDone()`.

### `_pushAd` (line 27)
Private AdSense helper. Try/catch defensive. No issues.

### `injectAdSlot` (container, style?) (line 39)
innerHTML uses only constant values — XSS-safe. Multiple calls stack ads. Optional style merged.

### `showAdInterstitial` (onDone, totalSec=8, skipSec=3) (line 65)
Duplicate-call behavior: old tick cleared (line 113), new overlay appended. Old overlay NOT removed — two overlays visible simultaneously. Old overlay still dismissible via skip click.

Countdown math: skip appears when `remaining <= 5` (for defaults 8/3), which is after 3 full ticks. ✓

Note on M-I2 (PREVIOUSLY LOGGED — "no destroy() exported"): Current source has `export function destroy()` at line 23. This appears FIXED in current source.

## Agent 05

### `destroy` (line 23)
Exported. Clears tick. No DOM effect. If called during active interstitial: countdown pauses, overlay stays, user can still skip manually.

### `_pushAd` (line 27)
Try/catch AdSense push. Safe.

### `injectAdSlot` (container, style?) (line 39)
Appends `<ins>` using only PUB_ID/SLOT_ID constants in innerHTML — XSS-safe. Same SLOT_ID as showAdInterstitial (L-I2 PREVIOUSLY LOGGED).

### `showAdInterstitial` (onDone, totalSec=8, skipSec=3) (line 65)
Full walk: overlay created → innerHTML set (constants only, XSS-safe) → appended to body → _pushAd() → remaining=totalSec → countEl/skipBtn queried (non-null asserted) → dismiss defined → skip click wired → prior tick cleared (line 113) → new setInterval assigned. Each tick: remaining--, update text, maybe show skip, maybe auto-dismiss. countEl.textContent assigned from local number — not user input — XSS-safe.

Note on M-I2 (PREVIOUSLY LOGGED): `export function destroy()` present at line 23 — FIXED.
Note on M-I1 (PREVIOUSLY LOGGED): skip click calls `dismiss()` which calls `clearInterval` — FIXED.
