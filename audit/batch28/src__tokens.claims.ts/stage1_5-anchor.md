# Anchor List — tokens.claims.ts

1. isDailyLoginClaimed  (line 16)
2. claimDailyLogin  (line 18)
3. claimHotTake  (line 44)
4. claimReaction  (line 56)
5. claimVote  (line 66)
6. claimDebate  (line 77)
7. claimAiSparring  (line 97)
8. claimPrediction  (line 107)

## Arbiter consensus
- Run 1 and Run 2: identical. No disagreements.
- arbiter_runs: 2 | runs_agreed: true | unresolved_count: 0
- 8 exported functions confirmed (some Stage 1 agents noted "7" — counting only async functions; isDailyLoginClaimed is also exported).
- dailyLoginClaimed (line 13), _dailyLoginInFlight (line 14): non-exported let bindings — excluded.
