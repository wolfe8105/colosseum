# Anchor List — src/tiers.ts

1. getTier  (line 73)
2. canStake  (line 89)
3. getPowerUpSlots  (line 94)
4. getNextTier  (line 102)
5. renderTierBadge  (line 125)
6. renderTierProgress  (line 133)

## Resolution notes

- TierLevel (line 16): type alias, not a callable binding.
- TierThreshold (line 18): interface, not a function.
- TierInfo (line 27): interface, not a function.
- NextTierInfo (line 32): interface, not a function.
- TIER_THRESHOLDS (line 46): const bound to an array literal, not a function.
- TIER_COLORS (line 56): const bound to an object literal, not a function.
- tiers (line 162): const bound to a plain object literal aggregating function refs; not itself a callable.
- export default tiers (line 172): re-export statement, not a function definition.
