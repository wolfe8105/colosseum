# Refactor Prompt — leaderboard.ts (519 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/leaderboard.ts (519 lines).

Read CLAUDE.md first, then read src/leaderboard.ts in full before touching anything. The file is the Leaderboard Module — ELO/Wins/Streak tabs, paginated live fetch, shimmer skeleton, my-rank card, Elo explainer modal, and event delegation.

SPLIT MAP (verify against the file before executing):

1. leaderboard.ts (orchestrator, ~55 lines)
   Keeps: module-level state (currentTab, liveData, myRank, isLoading, currentOffset, hasMore, PAGE_SIZE), init, event delegation listener, ModeratorLeaderboard export object, ready.then() auto-init. Imports all sub-modules.

2. leaderboard.data.ts (~35 lines)
   PLACEHOLDER_DATA const, getData function. Pure data and its accessor. Exports both.

3. leaderboard.fetch.ts (~70 lines)
   fetchLeaderboard. Reads/writes module state (isLoading, liveData, hasMore, myRank, currentOffset). Imports from leaderboard.data.ts.

4. leaderboard.list.ts (~80 lines)
   renderList, renderShimmer. Builds the ranked-row HTML and the skeleton shimmer rows. Imports getData from leaderboard.data.ts.

5. leaderboard.render.ts (~90 lines)
   render (the main screen render — my-rank card + tab buttons + lb-list container + profile nav wiring). Imports renderList and renderShimmer from leaderboard.list.ts.

6. leaderboard.tabs.ts (~35 lines)
   setTab, setTime, loadMore. Tab and pagination controls. setTab calls fetchLeaderboard and render. loadMore calls fetchLeaderboard(true) and directly updates lb-list innerHTML.

7. leaderboard.elo.ts (~65 lines)
   showEloExplainer. The Elo explainer modal — builds DOM, wires close, appends to body.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (LeaderboardTab, LeaderboardTimeFilter, LeaderboardTier, LeaderboardEntry, LeaderboardRpcRow).
- Dependency direction: orchestrator imports fetch, render, tabs, elo. render imports list. fetch imports data. list imports data. tabs imports fetch and render. elo is standalone. No cross-imports between fetch/elo/list.
- Target under 100 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in leaderboard* files.

LANDMINES — log these as // LANDMINE [LM-LB-NNN]: description comments. Do NOT fix them:

- LM-LB-001 (in leaderboard.list.ts at renderList, already catalogued as M-I3 in AUDIT-FINDINGS.md): renderList uses [...data].sort(...) which shallow-copies the array but the objects inside are the same references as liveData and PLACEHOLDER_DATA. The forEach that assigns item.rank = i + 1 writes back to the original objects. For PLACEHOLDER_DATA — a module-level const — repeated renders in placeholder mode mutate the constant's objects' rank fields. Fix: use data.map(row => ({ ...row })) before the sort to deep-copy each entry.

- LM-LB-002 (in leaderboard.elo.ts at showEloExplainer): Multiple hardcoded hex colors (#12122A, #e0e4ec, #4caf50, #2a5aab, #6a7a90) — TODO comments already present. No CSS var equivalents exist yet.

- LM-LB-003 (in leaderboard.list.ts at renderList medal colors and tier borders): medalColors and tierBorderMap objects contain hardcoded hex values (#a8a8a8, #b87333, #2a5aab, #6a7a90) — TODO comments already present.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
