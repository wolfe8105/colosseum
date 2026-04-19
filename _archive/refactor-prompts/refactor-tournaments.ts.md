# Refactor Prompt — tournaments.ts (311 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/tournaments.ts (311 lines).

Read CLAUDE.md first, then read src/tournaments.ts in full before touching anything. The file is the Tournaments module — match polling with a gold dot indicator, and RPC calls for create, join, and cancel.

SPLIT MAP (verify against the file before executing):

1. tournaments.ts (orchestrator, ~30 lines)
   Re-exports all public functions from sub-modules. No logic. Preserves the existing import surface for callers.

2. tournaments.poll.ts (~80 lines)
   _injectGoldDotCSS, _showGoldDot, _hideGoldDot, checkMyTournamentMatch, startTournamentMatchPoll, stopTournamentMatchPoll, getPendingMatch. The match polling system and its gold dot visual indicator. Module-level state for the poll interval and pending match lives here.

3. tournaments.rpc.ts (~80 lines)
   createTournament, joinTournament, cancelTournament. The three tournament lifecycle RPCs plus any remaining functions in the file not covered by poll.ts.

RULES:
- No barrel files other than the orchestrator re-export. Direct imports between sub-modules where needed.
- import type for all type-only imports (TournamentMatch, etc.).
- Dependency direction: orchestrator re-exports all. poll and rpc are standalone — no cross-imports.
- Target under 85 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in tournaments* files.

LANDMINES — log these as // LANDMINE [LM-TRN-NNN]: description comments. Do NOT fix them:

- LM-TRN-001 (in tournaments.poll.ts at startTournamentMatchPoll): Poll interval is stored in module state and cleared by stopTournamentMatchPoll. Verify that calling startTournamentMatchPoll a second time (e.g. if the arena is re-entered) clears the previous interval before starting a new one — if not, two intervals run simultaneously and the poll fires twice per tick.

- LM-TRN-002 (in tournaments.rpc.ts at createTournament): The create function takes a params object but does not validate that required fields (mode, topic, category) are non-empty before calling the RPC. The RPC will reject with a DB error, but the caller gets a generic error with no field-level feedback.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
