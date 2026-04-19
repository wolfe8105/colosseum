# Stage 1 Outputs — tokens.claims.ts

## Agent 01
1. comment — block comment (lines 1-5)
2. import — `nudge` from `./nudge.ts` (line 7)
3. import — `_rpc`, `_updateBalanceDisplay` from `./tokens.balance.ts` (line 8)
4. import — `_tokenToast` from `./tokens.animations.ts` (line 9)
5. import — `claimMilestone`, `_checkStreakMilestones` from `./tokens.milestones.ts` (line 10)
6. import — type `ClaimResult` from `./tokens.types.ts` (line 11)
7. bind name to value — `dailyLoginClaimed` = false, not exported (line 13)
8. bind name to value — `_dailyLoginInFlight` = false, not exported (line 14)
9. bind name to function definition — `isDailyLoginClaimed`, exported (line 16)
10. bind name to function definition — `claimDailyLogin`, exported async (lines 18-42)
11. bind name to function definition — `claimHotTake`, exported async (lines 44-54)
12. bind name to function definition — `claimReaction`, exported async (lines 56-64)
13. bind name to function definition — `claimVote`, exported async (lines 66-75)
14. bind name to function definition — `claimDebate`, exported async (lines 77-95)
15. bind name to function definition — `claimAiSparring`, exported async (lines 97-105)
16. bind name to function definition — `claimPrediction`, exported async (lines 107-115)

## Agents 02-05
(All identical to Agent 01 — unanimous across all five agents.)
