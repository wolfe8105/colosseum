# Anchor List — arena-feed-state.ts

1. set_phase  (line 24)
2. set_round  (line 25)
3. set_timeLeft  (line 26)
4. set_scoreA  (line 27)
5. set_scoreB  (line 28)
6. set_budgetRound  (line 47)
7. set_sentimentA  (line 60)
8. set_sentimentB  (line 61)
9. set_hasVotedFinal  (line 62)
10. set_pendingSentimentA  (line 63)
11. set_pendingSentimentB  (line 64)
12. set_heartbeatSendTimer  (line 81)
13. set_heartbeatCheckTimer  (line 82)
14. set_disconnectHandled  (line 83)
15. firstSpeaker  (line 90)
16. secondSpeaker  (line 94)
17. resetFeedRoomState  (line 102)

## Resolution notes
- Both arbiter runs identical. No disagreements.
- All set_* functions: single-line exported function declarations — included.
- firstSpeaker, secondSpeaker, resetFeedRoomState: standard exported function declarations — included.
- All const/let value bindings excluded (not callable).
