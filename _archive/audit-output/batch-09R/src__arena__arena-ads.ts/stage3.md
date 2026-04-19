# Stage 3 Outputs — src/arena/arena-ads.ts

Anchors: `_pushAd` (line 19), `injectAdSlot` (line 31), `showAdInterstitial` (line 57)

---

## Agent 01

### _pushAd — PASS
Accurate. Minor unmentioned detail: implementation uses a local TypeScript type alias `type W = typeof window & { adsbygoogle?: unknown[] }` for the window cast — immaterial to runtime behavior.

### injectAdSlot — PARTIAL
The `<ins>` element has an inline `style="display:block;width:100%;min-height:90px;"` attribute that Stage 2 omits entirely. All other details (cssText, conditional Object.assign, data attributes, append, _pushAd call) are correct. The cssText string ends with a trailing semicolon — cosmetic omission.

### showAdInterstitial — PARTIAL
The double-fire bug is confirmed real. Corrections:
1. Overlay `style.cssText` includes flex centering not mentioned in Stage 2: `display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;`
2. `countEl` and `skipBtn` are queried **after** `_pushAd()` is called, not before as Stage 2's ordering implies.
3. Skip button made visible via `display:inline-block`, not simply shown.

### needs_review
- **Double-fire bug confirmed**: skip click calls `dismiss()` without `clearInterval(tick)`. Interval continues; when `remaining <= 0`, `dismiss()` fires again → `onDone()` invoked twice. `overlay.remove()` on second call is a DOM no-op, but duplicate `onDone()` is a functional bug.
- **No `destroy()` exposed**: violates CLAUDE.md rule — `setInterval` polling must expose `destroy()`. The `tick` interval has no external cancellation path.
- **Both ad functions share `SLOT_ID`**: `injectAdSlot` (responsive banner) and `showAdInterstitial` (rectangle) use identical `data-ad-slot` — may violate AdSense policy for distinct ad unit types.

---

## Agent 02

### _pushAd — PASS
Accurate. TypeScript cast via local `W` alias is an implementation detail, not a behavioral correction.

### injectAdSlot — PARTIAL
`<ins>` element has inline `style="display:block;width:100%;min-height:90px;"` omitted from Stage 2. All other details confirmed correct.

### showAdInterstitial — PARTIAL
Double-fire bug description is correct. Additional omissions from Stage 2:
1. Overlay flex layout (`display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;`) not mentioned.
2. `<ins>` has `data-full-width-responsive="false"` (Stage 2 doesn't mention this attribute for the interstitial).
3. Skip button set to `display:inline-block` when revealed.

### needs_review
- **Double-fire bug confirmed** (same mechanism as Agent 01).
- **No `destroy()` on the interval**: CLAUDE.md policy violation. If caller context is torn down before countdown expires, interval cannot be cleared externally.
- **Both functions share `SLOT_ID`**: same AdSense concern as Agent 01.

---

## Agent 03

### _pushAd — PASS
Confirmed accurate, including try/catch with empty catch. TypeScript `W` cast is immaterial.

### injectAdSlot — PARTIAL
`<ins>` inline style `style="display:block;width:100%;min-height:90px;"` omitted from Stage 2. All other attributes (`data-ad-client`, `data-ad-slot`, `data-ad-format="auto"`, `data-full-width-responsive="true"`) confirmed correct.

### showAdInterstitial — PARTIAL
Double-fire bug is real and the Stage 2 description of the mechanism is correct. Corrections:
1. `<ins>` is `style="display:block;width:320px;min-height:250px;"` — Stage 2 says "320×250" implying fixed height; actual is `min-height:250px`.
2. `data-full-width-responsive="false"` on the interstitial `<ins>` not mentioned in Stage 2.
3. Overlay has flex layout not described.
4. Skip button uses `display:inline-block`.

### needs_review
- **Double-fire bug confirmed**.
- **No guard against concurrent calls**: if `showAdInterstitial` is called while an overlay already exists, multiple overlays with `id="structural-ad-interstitial"` are appended — duplicate IDs, broken visual state.
- **Both functions share `SLOT_ID`**: AdSense concern.
- `_pushAd` not exported — underscore convention is intentional module-private.

---

## Agent 04

### _pushAd — PASS
Confirmed accurate.

### injectAdSlot — PARTIAL
`<ins>` inline style omitted from Stage 2. All other details correct.

### showAdInterstitial — PARTIAL
Double-fire bug confirmed real. Stage 2's mechanism description ("skip click calls dismiss without clearInterval") is accurate. Corrections:
1. Overlay flex layout properties not described.
2. `data-full-width-responsive="false"` on interstitial not mentioned.
3. Skip button uses `display:inline-block`.
4. `countEl`/`skipBtn` queries happen after `_pushAd()`.

### needs_review
- **Double-fire bug confirmed**. Structural note: `tick` is declared with `const` after the skip listener is attached, so `dismiss()` cannot reference it — a refactor to `let tick` declared before `dismiss()` would be required to fix cleanly.
- **Both functions share `SLOT_ID`**: same AdSense concern.
- `_pushAd` not exported — correct private convention.

---

## Agent 05

### _pushAd — PARTIAL
Core behavior is correct but two details: (1) double-cast implementation via `((window as W).adsbygoogle as unknown[]).push({})` — not just a single `??=` expression as Stage 2 implies; (2) catch block contains a comment (`/* AdSense not loaded — slot stays empty, flow continues */`) rather than being completely empty as stated. Neither changes runtime behavior.

### injectAdSlot — PARTIAL
`<ins>` inline style omitted. `cssText` trailing semicolon omitted. All functional details confirmed correct.

### showAdInterstitial — PARTIAL
Double-fire bug description is **correct**. Omissions from Stage 2:
1. Overlay flex layout (`display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;`) not described.
2. `data-full-width-responsive="false"` on interstitial `<ins>` omitted.
3. Skip button explicit styling (CSS variable-based background, etc.) not mentioned.

### needs_review
- **Double-fire bug confirmed** (same mechanism).
- **No `destroy()` exposed**: CLAUDE.md `setInterval` convention violated.
- **Both functions share `SLOT_ID` (`8647716209`)**: AdSense typically requires distinct slot IDs for distinct formats; sharing one slot ID for responsive banner and rectangle may cause one or both to fail to serve.
- `injectAdSlot` and `showAdInterstitial` are named exports (not default) — consistent with codebase pattern.
