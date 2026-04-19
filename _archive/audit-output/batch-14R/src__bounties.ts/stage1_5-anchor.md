# Anchor List — src/bounties.ts

Source: src/bounties.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. loadBountyDotSet  (line 69)
2. userHasBountyDot  (line 84)
3. bountyDot  (line 98)
4. postBounty  (line 107)
5. cancelBounty  (line 126)
6. getMyBounties  (line 139)
7. getOpponentBounties  (line 151)
8. selectBountyClaim  (line 165)
9. bountySlotLimit  (line 188)
10. renderProfileBountySection  (line 204)
11. renderMyBountiesSection  (line 355)

## Resolution notes

Both arbiter runs agreed. Excluded items:
- `_updatePreview` (line 302): inner helper function defined inside `renderProfileBountySection`, not top-level
- `_row` (line 360): inner helper function defined inside `renderMyBountiesSection`, not top-level
- anonymous click handlers (lines 255, 320, 404): inline callbacks, not named top-level bindings
