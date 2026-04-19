# Refactor Prompt — arena-private-lobby.ts (353 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-private-lobby.ts (353 lines).

Read CLAUDE.md first, then read src/arena/arena-private-lobby.ts in full before touching anything. The file is the Private Lobby module — creating and waiting for a private debate, polling for match, joining with a code, and loading pending challenges.

SPLIT MAP (verify against the file before executing):

1. arena-private-lobby.ts (orchestrator, ~35 lines)
   Keeps: createAndWaitPrivateLobby, cancelPrivateLobby exports, all imports. Delegates to sub-modules.

2. arena-private-lobby-create.ts (~90 lines)
   createAndWaitPrivateLobby. Creates the private lobby via RPC, builds the waiting UI (share code display, cancel button), and initiates the poll. cancelPrivateLobby also lives here since it's the paired operation.

3. arena-private-lobby-poll.ts (~65 lines)
   startPrivateLobbyPoll, onPrivateLobbyMatched. The polling loop that checks for a match, and the handler that fires when both players are ready.

4. arena-private-lobby-join.ts (~80 lines)
   joinWithCode, loadPendingChallenges. Code-based join flow and the pending challenges loader.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: orchestrator imports create, join. create imports poll (to start polling after lobby creation). poll is otherwise standalone. join is standalone.
- Target under 95 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in arena-private-lobby* files.

LANDMINES — log these as // LANDMINE [LM-PVL-NNN]: description comments. Do NOT fix them:

- LM-PVL-001 (in arena-private-lobby-poll.ts at startPrivateLobbyPoll): Polling interval is started but the interval handle may not be stored in a way that guarantees cleanup if cancelPrivateLobby is called before the interval fires. Verify the interval is properly cleared on cancel.

- LM-PVL-002 (in arena-private-lobby-join.ts at joinWithCode): The join button in the UI is disabled during the join attempt. Verify try/finally is used — if the RPC throws, the button must be re-enabled.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
