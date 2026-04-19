# Anchor List — home.invite.ts

1. loadInviteScreen (line 52)
2. render (line 69)
3. rewardLabel (line 161)
4. rewardTypeLabel (line 168)
5. rewardRowHtml (line 172)
6. activityRowHtml (line 190)
7. wireInviteScreen (line 206)
8. openClaimSheet (line 244)
9. cleanupInviteScreen (line 322)

## Resolution notes

- `InviteReward`, `ActivityEntry`, `InviteStats`: interfaces — not callable, excluded.
- `_sheetCleanup`: a `let` variable binding initialized to `null` that may later hold a function reference at runtime. Not a function definition at the binding site — excluded.
- Anonymous click callbacks inside `wireInviteScreen` (copy button, share button, `.invite-claim-btn` forEach): inline anonymous callbacks passed to event listeners and iterators — not top-level named functions, excluded.
- Anonymous async callbacks inside `openClaimSheet` (`.mod-buy-btn` handlers): inline anonymous callbacks, not top-level named functions, excluded.
- All 9 function definitions are at module scope and are named — all 9 qualify and are included.
