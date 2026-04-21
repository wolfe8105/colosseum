# Anchor List — arena-bounty-claim.ts

1. getSelectedBountyId  (line 17)
2. resetBountyClaim  (line 21)
3. renderBountyClaimDropdown  (line 30)

## Resolution notes
- `_selectedBountyId` (line 13): excluded — module-level variable bound to `null`, not a callable.
- `_attemptFeePaid` (line 14): excluded — module-level variable bound to `false`, not a callable.
- anonymous `select.addEventListener('change', () => {...})` callback (line 94): excluded — inline event-listener callback, not a named top-level binding.
- anonymous `lockBtn.addEventListener('click', async () => {...})` callback (line 117): excluded — inline event-listener callback, not a named top-level binding.
- `bounties.map((b) => {...})` callback (line 64): excluded — inline array-callback, not a named binding.
