# Anchor List — profile-depth.tier.ts

Source: src/pages/profile-depth.tier.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. renderTierBannerUI  (line 24)
2. updateMilestoneBar  (line 55)

## Resolution notes
Both arbiter runs agreed. getTier/getNextTier/renderTierBadge/renderTierProgress (lines 15–22) are window-cast value bindings — excluded. Inner .map callback inside updateMilestoneBar excluded. Two exported function definitions confirmed.
