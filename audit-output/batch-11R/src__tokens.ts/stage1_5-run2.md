# Anchor List — tokens.ts

1. _injectCSS  (line 104)
2. _coinFlyUp  (line 154)
3. _tokenToast  (line 171)
4. _milestoneToast  (line 179)
5. _updateBalanceDisplay  (line 202)
6. updateBalance  (line 216)
7. _rpc  (line 226)
8. requireTokens  (line 246)
9. claimMilestone  (line 261)
10. _loadMilestones  (line 277)
11. _checkStreakMilestones  (line 286)
12. claimDailyLogin  (line 297)
13. claimHotTake  (line 328)
14. claimReaction  (line 340)
15. claimVote  (line 350)
16. claimDebate  (line 362)
17. claimAiSparring  (line 385)
18. claimPrediction  (line 395)
19. checkProfileMilestones  (line 405)
20. getSummary  (line 417)
21. getMilestoneList  (line 424)
22. getBalance  (line 436)
23. _initBroadcast  (line 444)
24. init  (line 459)

## Resolution notes

All 24 candidates confirmed. No discrepancies from Stage 1 agents. Correctly excluded: MILESTONES (object literal, not a function), tokens (object literal default export vehicle), get balance()/get MILESTONES() (object accessor properties inside tokens, not module-scope callable bindings). _loadMilestones (line 277) carries `export` despite underscore prefix — confirmed intentional.
