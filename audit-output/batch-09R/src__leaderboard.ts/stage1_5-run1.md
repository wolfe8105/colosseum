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

## Resolution notes

- `ModeratorLeaderboard` (line 508): excluded — it is a `const` bound to an object literal whose properties are references to already-listed functions, not a function definition itself.
- `escHtml` (line 67): excluded — bound to `escapeHTML` (an imported value), not a function definition in this file.
- `PLACEHOLDER_DATA` (line 86): excluded — array literal, not a function.
- All state variables (`currentTab`, `currentTime`, `liveData`, `myRank`, `isLoading`, `currentOffset`, `hasMore`, `PAGE_SIZE`): excluded — primitive/scalar bindings, not functions.
- `document.addEventListener('click', ...)` (line 484): excluded — top-level side-effect call, not a named callable binding; the callback is an inline anonymous function.
- `ready.then(() => init())` (line 521): excluded — top-level side-effect call, not a named callable binding.
- All type aliases and interfaces (`LeaderboardTab`, `LeaderboardTimeFilter`, `LeaderboardTier`, `LeaderboardEntry`, `LeaderboardRpcRow`): excluded — type-only declarations, not callable.
