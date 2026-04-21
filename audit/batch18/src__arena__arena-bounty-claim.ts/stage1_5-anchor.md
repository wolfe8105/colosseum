# Anchor List — arena-bounty-claim.ts

Source: src/arena/arena-bounty-claim.ts
Produced by: stage 1.5 (arbiter, both runs agreed)
Unresolved items: 0

1. getSelectedBountyId  (line 17)
2. resetBountyClaim  (line 21)
3. renderBountyClaimDropdown  (line 30)

## Resolution notes
- `_selectedBountyId` (line 13): excluded — module-level variable (string | null), not a callable.
- `_attemptFeePaid` (line 14): excluded — module-level boolean state, not a callable.
- `select.addEventListener` callback (line 94): excluded — inline event-listener arrow callback.
- `lockBtn.addEventListener` async callback (line 117): excluded — inline event-listener arrow callback.
- `bounties.map((b) => {...})` callback (line 64): excluded — inline array-callback.
