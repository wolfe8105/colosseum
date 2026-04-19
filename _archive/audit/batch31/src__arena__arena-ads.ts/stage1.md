# Stage 1 Outputs — arena-ads.ts

## Agent 01

- `const PUB_ID` (line 16) — string constant, value binding
- `const SLOT_ID` (line 17) — string constant, value binding
- `let _interstitialTick` (line 20) — module-level mutable interval handle, null initially
- `export function destroy(): void` (line 23) — clears _interstitialTick if set
- `function _pushAd(): void` (line 27) — private; pushes to window.adsbygoogle
- `export function injectAdSlot(container: HTMLElement, style?: Partial<CSSStyleDeclaration>): void` (line 39)
- `export function showAdInterstitial(onDone: () => void, totalSec = 8, skipSec = 3): void` (line 65)
- `function dismiss(): void` (line 105) — inner closure inside showAdInterstitial; NOT top-level

## Agent 02

Top-level callable definitions:
1. `destroy` (line 23) — exported, void, no params
2. `_pushAd` (line 27) — private, void, no params
3. `injectAdSlot` (line 39) — exported; params: container HTMLElement, optional style
4. `showAdInterstitial` (line 65) — exported; params: onDone callback, totalSec=8, skipSec=3
5. `dismiss` (line 105) — inner closure inside showAdInterstitial; excluded from anchor list

Module-level state: `_interstitialTick` (line 20)

## Agent 03

Module structure:
- Module-level mutable state: `_interstitialTick` (line 20) — shared across calls, nullable
- Top-level function definitions: `destroy` (23), `_pushAd` (27), `injectAdSlot` (39), `showAdInterstitial` (65)
- `dismiss` at line 105 is nested within `showAdInterstitial` — excluded from anchor list
- Exports: `destroy`, `injectAdSlot`, `showAdInterstitial`

## Agent 04

- Line 16: `const PUB_ID` — value binding
- Line 17: `const SLOT_ID` — value binding
- Line 20: `let _interstitialTick` — mutable state
- Line 23: `export function destroy()` — TOP LEVEL CALLABLE
- Line 27: `function _pushAd()` — TOP LEVEL CALLABLE (private)
- Line 39: `export function injectAdSlot(container, style?)` — TOP LEVEL CALLABLE
- Line 65: `export function showAdInterstitial(onDone, totalSec, skipSec)` — TOP LEVEL CALLABLE
- Line 105: `function dismiss()` — inner to showAdInterstitial; excluded

## Agent 05

- `destroy` (line 23): exported, no params, returns void
- `_pushAd` (line 27): non-exported, no params, returns void
- `injectAdSlot` (line 39): exported, 2 params (1 required container, 1 optional style), returns void
- `showAdInterstitial` (line 65): exported, 3 params (onDone required, totalSec=8, skipSec=3), returns void
- `dismiss` (line 105): nested closure inside showAdInterstitial — excluded
- Module-level state: `_interstitialTick` (line 20)
