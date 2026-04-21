# Anchor List — src/tiers.ts

Source: src/tiers.ts
Produced by: stage 1.5 (arbiter, runs agreed — no reconciliation needed)
Unresolved items: 0

1. getTier  (line 73)
2. canStake  (line 89)
3. getPowerUpSlots  (line 94)
4. getNextTier  (line 102)
5. renderTierBadge  (line 125)
6. renderTierProgress  (line 133)

## Resolution notes

- TierLevel (line 16): type alias, not a function.
- TierThreshold (line 18): interface, not a function.
- TierInfo (line 27): interface, not a function.
- NextTierInfo (line 32): interface, not a function.
- TIER_THRESHOLDS (line 46): readonly array of data objects, not a callable binding.
- TIER_COLORS (line 56): readonly record of color strings, not a callable binding.
- tiers (line 162): object literal aggregating function references for default export, not itself a function.
- export default tiers (line 172): re-export statement, not a function definition.
