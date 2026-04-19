# Stage 1 Outputs — home.invite-render.ts

## Agent 01
1. comment — block comment (lines 1-4)
2. blank
3. import — `escapeHTML` from `../config.ts` (line 6)
4. import — type `InviteStats`, `InviteReward` from `./home.invite-types.ts` (line 7)
5. import — `rewardLabel`, `rewardRowHtml`, `activityRowHtml` from `./home.invite-html.ts` (line 8)
6. import — `wireInviteScreen` from `./home.invite-wiring.ts` (line 9)
7. blank
8. bind name to function definition — `renderInvite`, exported (lines 11-98)
   - const converts (line 16) — internal
   - const nextMilestone (line 17) — internal
   - const progressPct (lines 18-20) — internal
   - const headlineTo (lines 22-26) — internal
   - const unclaimedHtml (lines 28-32) — internal
   - const activityHtml (lines 34-36) — internal
   - comment — LANDMINE annotation (lines 38-39)
   - container.innerHTML assignment (lines 40-95)
   - wireInviteScreen(...) call (line 97)

## Agent 02
(Consistent with Agent 01 — same inventory. renderInvite spans lines 11-98.)

## Agent 03
(Consistent with Agent 01 — same inventory.)

## Agent 04
(Consistent with Agent 01 — same inventory, block comment at lines 1-4 noted.)

## Agent 05
(Consistent with Agent 01 — same inventory. Confirmed: 4 imports, 1 exported function renderInvite lines 11-98.)
