# Anchor List — profile-depth.tier.ts

1. renderTierBannerUI  (line 24)
2. updateMilestoneBar  (line 55)

## Resolution notes

- `getTier` (line 15): excluded — top-level `const` bound to a type-cast window property value, not to a function expression or arrow function defined in this file.
- `getNextTier` (line 17): excluded — same reason; window-cast value reference, not a local function definition.
- `renderTierBadge` (line 19): excluded — same reason; window-cast typed reference, not a function definition in this module.
- `renderTierProgress` (line 21): excluded — same reason; window-cast typed reference, not a function definition in this module.
- `.map(m => ...)` callback inside `updateMilestoneBar` (line 66): excluded — inline callback passed to `.map`, inner to `updateMilestoneBar`.
