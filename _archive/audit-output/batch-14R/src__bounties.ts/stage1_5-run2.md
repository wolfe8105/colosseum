# Anchor List — src/bounties.ts

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

- `_updatePreview` (line 302): excluded — inner helper function defined inside `renderProfileBountySection`, not a top-level binding.
- `_row` (line 360): excluded — inner helper function defined inside `renderMyBountiesSection`, not a top-level binding.
- All five agents agreed on exactly the same 11 top-level function definitions; no candidates were disputed and no additional definitions were found during the direct source scan.
