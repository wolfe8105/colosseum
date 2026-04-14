# Anchor List — src/arena/arena-ads.ts

Source: src/arena/arena-ads.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. _pushAd  (line 19)
2. injectAdSlot  (line 31)
3. showAdInterstitial  (line 57)

## Resolution notes

Both arbiter runs agreed. No reconciliation required.

- `dismiss` (line 97): excluded — inner helper defined inside `showAdInterstitial`, not a top-level binding.
- `tick` setInterval callback (line 104): excluded — anonymous inline callback, not a named top-level binding.
- `PUB_ID` (line 16): excluded — string literal value binding.
- `SLOT_ID` (line 17): excluded — string literal value binding.
