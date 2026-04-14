# Anchor List — src/tokens.ts

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

---

## Resolution notes

- `MILESTONES` (line 82): excluded — `const` bound to an object literal (data record), not a function or arrow function.
- `tokens` (line 480): excluded — `const` bound to an object literal used as the default export; its properties (`balance`, `MILESTONES`) are getter accessors inside an object literal, not top-level callable bindings, and the object itself is not a function.
- `get balance()` / `get MILESTONES()` (lines 494–495): excluded — getter accessors inside an object literal body, not top-level named function bindings.
- `_bc.onmessage` callback (line 447): excluded — inline callback assignment inside `_initBroadcast`, not a top-level binding.
- `onChange(...)` callback (line 462): excluded — inline callback passed to `onChange` inside `init`, not a top-level binding.
- `document.addEventListener('DOMContentLoaded', init)` (line 507): excluded — `init` is already listed; the `addEventListener` call itself is a top-level statement, not a function definition.
- All `.map`, `.forEach`, `.then`, `.catch` callbacks throughout the file: excluded — inline callbacks, not top-level bindings.
