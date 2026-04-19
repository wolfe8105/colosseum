# Refactor Prompt — src/arena/arena-mod-queue.ts (240 lines → 2 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-mod-queue.ts (240 lines).

Read CLAUDE.md first, then read src/arena/arena-mod-queue.ts in full before
touching anything. This file has two distinct flows: moderators browsing and
claiming debates from the queue, and debaters receiving/responding to mod requests
during an active debate.

SPLIT MAP (verify against file before executing):

  src/arena/arena-mod-queue-browse.ts  (~140 lines)
    Keeps: showModQueue, loadModQueue, claimModRequest,
            startModQueuePoll, stopModQueuePoll
    This is the "Mod Queue" screen — moderators browse and claim debates.
    Imports: showModDebatePicker via dynamic import
             (import('./arena-mod-debate.ts').then — already uses dynamic import
              to call back into mod-debate; preserve this pattern)
    Imports: renderLobby via dynamic import

  src/arena/arena-mod-queue-status.ts  (~100 lines)
    Keeps: startModStatusPoll, stopModStatusPoll,
            showModRequestModal, handleModResponse
    This is the in-debate mod-request flow — debaters get notified when a
    moderator requests to join their active debate.
    Imports: nothing from arena-mod-queue-browse.ts

  src/arena/arena-mod-queue.ts  (thin re-export)
    Re-exports: all public functions from both sub-files.
    Check callers with:
      grep -r "arena-mod-queue" src --include="*.ts" | grep import
    If callers import showModQueue from the umbrella file, this orchestrator
    is needed. If they could import directly from browse/status, update them
    and delete this file.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: browse and status are siblings — neither imports the other.
- Run npm run build after the split. Report chunk sizes and line counts.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-MODQUEUE-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
```
