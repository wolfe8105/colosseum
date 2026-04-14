# Anchor List — src/leaderboard.ts

1. fetchLeaderboard  (line 103)
2. getData  (line 158)
3. renderShimmer  (line 166)
4. showEloExplainer  (line 187)
5. renderList  (line 262)
6. render  (line 345)
7. setTab  (line 432)
8. setTime  (line 442)
9. loadMore  (line 451)
10. init  (line 463)

---

## Resolution notes

- **ModeratorLeaderboard** (line 508): Excluded. It is a `const` bound to an object literal whose properties are references to already-listed functions, not a new callable function definition.
- **escHtml** (line 67): Excluded. It is a plain value alias (`const escHtml = escapeHTML`), not a function definition in this file.
- **PLACEHOLDER_DATA** (line 86): Excluded. Array literal, not a function.
- All state variables (`currentTab`, `currentTime`, `liveData`, `myRank`, `isLoading`, `currentOffset`, `hasMore`, `PAGE_SIZE`): Excluded. Primitive/value bindings, not function definitions.
- **`document.addEventListener('click', ...)` callback** (line 484): Excluded. An inline callback passed to `addEventListener`; not a named top-level function binding.
- **`ready.then(() => init())` callback** (line 521): Excluded. An inline arrow passed to `.then()`; not a named top-level binding.
- All type aliases and interfaces (`LeaderboardTab`, `LeaderboardTimeFilter`, `LeaderboardTier`, `LeaderboardEntry`, `LeaderboardRpcRow`): Excluded. Type-level constructs, not callable function definitions.
