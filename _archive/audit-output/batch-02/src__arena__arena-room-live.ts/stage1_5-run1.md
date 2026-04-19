# Anchor List — arena-room-live.ts (Arbiter Run 1)

1. renderInputControls  (line 21)
2. stopOpponentPoll  (line 87)
3. startOpponentPoll  (line 92)
4. submitTextArgument  (line 131)
5. advanceRound  (line 177)
6. startLiveRoundTimer  (line 219)
7. initLiveAudio  (line 238)
8. toggleLiveMute  (line 308)
9. addMessage  (line 316)
10. addSystemMessage  (line 344)

## Resolution notes

- leaveDebate: imported (line 6) but not defined or used in this file.
- screenEl: imported (line 10) but not referenced in any function body.
- CurrentDebate type: imported as type (line 14) but no type annotation in this file uses it directly.
- All 10 entries confirmed by source scan as top-level named function declarations.
