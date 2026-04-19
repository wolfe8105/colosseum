# Anchor List — arena-ads.ts (Arbiter Run 1)

1. `destroy` — line 23, exported
2. `_pushAd` — line 27, private (not exported)
3. `injectAdSlot` — line 39, exported
4. `showAdInterstitial` — line 65, exported

## Resolution notes
- All 5 Stage 1 agents agree unanimously.
- `dismiss` (line 105): inner function declared inside `showAdInterstitial` body — excluded per anchor rules.
- `_interstitialTick` (line 20): mutable module state, not a function — excluded.
- `PUB_ID`, `SLOT_ID`: constant value bindings — excluded.
