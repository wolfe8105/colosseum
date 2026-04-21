# Anchor List — arena-bounty-claim.ts

1. getSelectedBountyId  (line 17)
2. resetBountyClaim  (line 21)
3. renderBountyClaimDropdown  (line 30)

## Resolution notes
- `_selectedBountyId` (line 13): excluded — module-level string/null state binding, not a callable.
- `_attemptFeePaid` (line 14): excluded — module-level boolean state binding, not a callable.
- `select.addEventListener` callback (line 94): excluded — inline event-listener arrow callback, not a top-level binding.
- `lockBtn.addEventListener` async callback (line 117): excluded — inline event-listener arrow callback inside `renderBountyClaimDropdown`.
