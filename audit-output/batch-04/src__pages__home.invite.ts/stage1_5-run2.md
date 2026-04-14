# Anchor List — home.invite.ts

1. loadInviteScreen  (line 52)
2. render  (line 69)
3. rewardLabel  (line 161)
4. rewardTypeLabel  (line 168)
5. rewardRowHtml  (line 172)
6. activityRowHtml  (line 190)
7. wireInviteScreen  (line 206)
8. openClaimSheet  (line 244)
9. cleanupInviteScreen  (line 322)

## Resolution notes

- `_sheetCleanup` (line 48): Excluded. Module-level variable binding that holds a function reference (or null), not a callable function declaration or const arrow function binding — it is a mutable slot, not a defined function.
- Inner callbacks inside `wireInviteScreen` (copy button handler, share button handler, `.invite-claim-btn` forEach callback): Excluded. Anonymous callbacks passed to event listeners and array iterators — not top-level named bindings.
- Inner async callback inside `openClaimSheet` (`.mod-buy-btn` forEach callback): Excluded. Same reason — anonymous callback, inner to another function's body.
- All interfaces (`InviteReward`, `ActivityEntry`, `InviteStats`): Excluded. Type-only constructs, not callable.
