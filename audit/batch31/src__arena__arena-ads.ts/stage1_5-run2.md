# Anchor List — arena-ads.ts (Arbiter Run 2)

1. `destroy` — line 23, exported
2. `_pushAd` — line 27, private
3. `injectAdSlot` — line 39, exported
4. `showAdInterstitial` — line 65, exported

## Resolution notes
- Independent source verification: all four entries confirmed as top-level named callable definitions.
- `dismiss` (line 105): declared with `function` keyword inside `showAdInterstitial` body at indentation level 2 — inner function, excluded per rules.
- Runs 1 and 2 agree. No reconciliation needed. Unresolved count: 0.
