# Anchor List — profile-depth.tier.ts

1. renderTierBannerUI  (line 24)
2. updateMilestoneBar  (line 55)

---

**Resolution notes**

- `getTier` (line 15): excluded — `const` bound to a cast of a `window` property; not a function definition in this file, it is a variable holding an external value.
- `getNextTier` (line 17): excluded — same reason; window-cast value binding, not a function defined here.
- `renderTierBadge` (line 19): excluded — same reason; window-cast value binding.
- `renderTierProgress` (line 21): excluded — same reason; window-cast value binding.
