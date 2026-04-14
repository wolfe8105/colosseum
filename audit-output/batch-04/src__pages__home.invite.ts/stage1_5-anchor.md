# Anchor List — home.invite.ts

Source: src/pages/home.invite.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

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

- `InviteReward` / `ActivityEntry` / `InviteStats`: excluded — interface declarations, not callable.
- `_sheetCleanup`: excluded — module-level `let` binding holding a nullable function reference, not a function definition at this binding site.
- Inline callbacks in `wireInviteScreen` (copy button async handler, share button async handler, `.invite-claim-btn` forEach callback): excluded — anonymous callbacks, not top-level named bindings.
- Inline async callback in `openClaimSheet` (`.mod-buy-btn` forEach handler): excluded — inner callback, not top-level.
- Both arbiter runs agreed on the same 9 functions in the same order. No reconciliation run needed.
