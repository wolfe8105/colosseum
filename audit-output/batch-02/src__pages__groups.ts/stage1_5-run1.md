# Anchor List — groups.ts (Arbiter Run 1)

Reviewed source file (446 lines) and all 11 Stage 1 agent outputs.

All 11 agents agree on 15 callable functions. Verified against source:

1. switchTab  (line 65)
2. switchDetailTab  (line 80)
3. filterCategory  (line 96)
4. loadDiscover  (line 104)
5. loadMyGroups  (line 117)
6. loadLeaderboard  (line 134)
7. openGroup  (line 147)
8. updateJoinBtn  (line 215)
9. toggleMembership  (line 244)
10. showLobby  (line 282)
11. openCreateModal  (line 290)
12. closeCreateModal  (line 294)
13. handleModalBackdrop  (line 297)
14. selectEmoji  (line 300)
15. submitCreateGroup  (line 305)

## Resolution notes

All agents agree. No reconciliation needed.

Note: `handleModalBackdrop` is included in the anchor as a declared named function, though multiple agents flagged it as potentially dead code. Including it ensures Stage 2 explicitly analyzes it.
