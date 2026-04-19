# Anchor List — src/arena/arena-bounty-claim.ts

Source: src/arena/arena-bounty-claim.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

1. getSelectedBountyId  (line 17)
2. resetBountyClaim  (line 21)
3. renderBountyClaimDropdown  (line 30)

## Resolution notes
Both arbiter runs agreed. Combined notes:

- `_selectedBountyId` (line 13): excluded — module-level `let` binding, not a function value.
- `_attemptFeePaid` (line 14): excluded — module-level `let` binding, not a function value.
- Inline arrow in `select.addEventListener('change', ...)`: excluded — inline callback passed as argument.
- Inline async arrow in `lockBtn.addEventListener('click', ...)`: excluded — inline callback passed as argument.
- Inline arrow in `bounties.map(...)`: excluded — inline callback passed as argument.
