# Stage 3 Outputs — arena-ads.ts

## Agent 01

### `destroy` (line 23) — PASS
- "checks if _interstitialTick is non-null; clearInterval; null" — VERIFIED lines 23-25 ✓
- "does not remove DOM overlay or call onDone" — VERIFIED: dismiss() not referenced in destroy() ✓

### `_pushAd` (line 27) — PASS
- try/catch, adsbygoogle push — VERIFIED lines 27-33 ✓

### `injectAdSlot` (line 39) — PASS
- wrap div, Object.assign on style, innerHTML with ins element (PUB_ID/SLOT_ID constants), appendChild, _pushAd() — all VERIFIED lines 39-54 ✓
- XSS-safe: only module-level string constants in template literal ✓

### `showAdInterstitial` (line 65) — PASS (with findings carried forward)
- Overlay creation, innerHTML, appendChild, _pushAd(), remaining, countEl/skipBtn queries, dismiss closure, skip click wiring, prior tick clearance (line 113), setInterval logic — all VERIFIED ✓
- M-I1 re-check: skip click → dismiss() → clearInterval. FIXED in current source ✓
- M-I2 re-check: `export function destroy()` present at line 23. FIXED ✓
- L-I1: duplicate overlay on concurrent call — CONFIRMED STILL PRESENT
- L-I2: same SLOT_ID at lines 49 and 84 — CONFIRMED STILL PRESENT

## Agent 02

### `destroy` (line 23) — PARTIAL
- Tick clearance verified ✓
- **NEW finding confirmed**: `destroy()` does not reference `onDone` or `dismiss`. JSDoc on showAdInterstitial (line 59) states onDone is "guaranteed." `destroy()` violates this contract — onDone silently dropped when destroy() is called externally. VERIFIED source confirms no onDone call in destroy() body.

### `_pushAd` (line 27) — PASS ✓

### `injectAdSlot` (line 39) — PASS ✓

### `showAdInterstitial` (line 65) — PASS (L-I1 confirmed)
- Duplicate overlay: line 113 clears old tick, no old overlay removal. Line 98 appends new overlay unconditionally. VERIFIED ✓

## Agent 03

### `destroy` (line 23) — PARTIAL (new finding)
### `_pushAd` (line 27) — PASS ✓
### `injectAdSlot` (line 39) — PASS ✓
### `showAdInterstitial` (line 65) — PASS (findings confirmed)

M-I1 CONFIRMED FIXED: skip click path: click → dismiss() → clearInterval + null + overlay.remove() + onDone() ✓
M-I2 CONFIRMED FIXED: `export function destroy(): void` at line 23 ✓
L-I1 CONFIRMED STILL PRESENT: concurrent call stacks overlays, duplicate id ✓
L-I2 CONFIRMED STILL PRESENT: SLOT_ID shared lines 49 and 84 ✓

NEW-I3 confirmed: JSDoc at line 59 states "@param onDone callback fired on dismiss/timeout (guaranteed)". destroy() body (lines 23-25) has no reference to dismiss or onDone. Contract violated when destroy() called during active interstitial.

## Agent 04

### All anchors — PASS / PARTIAL

All Stage 2 runtime walk claims verified against source.

**Finding NEW-I3 (MEDIUM) — VERIFIED:**
- JSDoc comment lines 59-60: `@param onDone callback fired on dismiss/timeout (guaranteed)`
- Module header line 10: "calls onDone when dismissed"
- `destroy()` lines 23-25: `if (_interstitialTick) { clearInterval(_interstitialTick); _interstitialTick = null; }` — no onDone call, no dismiss() call
- `dismiss()` (lines 105-109) is an inner closure scoped to each showAdInterstitial invocation — not accessible from module-level destroy()
- Consequence: caller invoking destroy() to cancel an active interstitial gets onDone silently dropped; any flow awaiting onDone is permanently suspended
- Severity: MEDIUM

L-I1 and L-I2 confirmed present. M-I1 and M-I2 confirmed fixed.

## Agent 05

### All anchors — PASS / PARTIAL

Final confirmation of all findings:

| Finding | Status | Source Lines |
|---------|--------|-------------|
| M-I1 (skip clearInterval) | FIXED | Lines 106-107, 111 |
| M-I2 (no destroy export) | FIXED | Line 23 |
| L-I1 (no concurrent call guard) | STILL PRESENT | Lines 70-71, 98, 113 |
| L-I2 (shared SLOT_ID) | STILL PRESENT | Lines 49, 84 |
| L-I6 (missing from CLAUDE.md list) | STILL PRESENT | N/A (docs gap) |
| NEW-I3 (destroy() drops onDone) | NEW — MEDIUM | Lines 23-25, 59-60 |

NEW-I3 detail: The `showAdInterstitial` JSDoc explicitly guarantees `onDone` always fires ("guaranteed", line 60). `destroy()` cancels the tick without calling `onDone()` or `dismiss()`. Since `dismiss()` is an inner closure per-invocation, `destroy()` cannot reach it. The "always fires" guarantee cannot be upheld as long as `destroy()` exists in its current form. Fix requires either: (a) hoisting a module-level `_dismiss: (() => void) | null` reference that `showAdInterstitial` assigns and `destroy()` calls, or (b) removing the "guaranteed" claim from the docs.

---

## Stage 3 Verdict

- **M-I1**: PREVIOUSLY LOGGED → **CONFIRMED FIXED** in current source
- **M-I2**: PREVIOUSLY LOGGED → **CONFIRMED FIXED** in current source
- **L-I1**: PREVIOUSLY LOGGED → **STILL PRESENT** (duplicate overlay on concurrent call)
- **L-I2**: PREVIOUSLY LOGGED → **STILL PRESENT** (shared SLOT_ID across both functions)
- **L-I6**: PREVIOUSLY LOGGED → **STILL PRESENT** (docs gap)
- **NEW-I3**: **NEW MEDIUM** — `destroy()` drops `onDone` callback, violating documented "guaranteed" contract
