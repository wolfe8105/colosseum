# Anchor List — src/arena/arena-ads.ts

1. `_pushAd`  (line 19)
2. `injectAdSlot`  (line 31)
3. `showAdInterstitial`  (line 57)

---

## Resolution notes

- `dismiss` (line 97): excluded — inner helper function defined inside `showAdInterstitial`, not a top-level binding.
- `tick` setInterval callback (line 104): excluded — anonymous callback passed inline to `setInterval`, not a named top-level binding.
- `PUB_ID` (line 16): excluded — bound to a string literal, not a function.
- `SLOT_ID` (line 17): excluded — bound to a string literal, not a function.
