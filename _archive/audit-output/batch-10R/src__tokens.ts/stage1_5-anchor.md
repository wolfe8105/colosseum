# Anchor List — src/tokens.ts

Source: src/tokens.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

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
Both arbiter runs agreed. Combined notes:

- `MILESTONES` (line 82): excluded — `const` bound to an object literal (data record), not a function.
- `tokens` (line 480): excluded — `const` bound to an object literal (default export); not a function.
- `get balance()` / `get MILESTONES()` inside `tokens` object: excluded — accessor properties inside an object literal, not top-level named function bindings.
- `_bc.onmessage` callback: excluded — inline callback assignment inside `_initBroadcast`, not a top-level binding.
- `onChange(...)` callback inside `init`: excluded — inline callback, not a top-level binding.
- `document.addEventListener('DOMContentLoaded', init)` / `init()`: excluded — top-level statement, not a new function binding.
- All `.map`, `.forEach`, `.then`, `.catch` callbacks: excluded — inline callbacks, not top-level bindings.
