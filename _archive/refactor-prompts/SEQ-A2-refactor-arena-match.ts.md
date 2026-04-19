# Refactor Prompt — src/arena/arena-match.ts (228 lines → 2 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-match.ts (228 lines).

Read CLAUDE.md first, then read src/arena/arena-match.ts in full before
touching anything. This file has two distinct jobs: rendering the match-found
screen (display), and handling the accept/decline/confirm flow plus AI debate
start (flow). These are cleanly separable.

SPLIT MAP (verify against file before executing):

  src/arena/arena-match-found.ts  (~100 lines)
    Keeps: onMatchFound, clearMatchAcceptTimers, showMatchFound
    onMatchFound handles the queue → match-found transition and builds CurrentDebate.
    clearMatchAcceptTimers clears both countdown and poll timers.
    showMatchFound renders the match card UI, starts the countdown timer,
    calls playIntroMusic.
    Imports: onMatchAccept, onMatchDecline from ./arena-match-flow.ts
    NOTE: showMatchFound starts the countdown which calls onMatchDecline on timeout.
    onMatchDecline must be imported from flow.ts. Check for circular dep:
    flow.ts will import showMatchFound? If so, extract clearMatchAcceptTimers
    to a shared primitive and break the cycle.

  src/arena/arena-match-flow.ts  (~130 lines)
    Keeps: onMatchAccept, onMatchDecline, onMatchConfirmed, onOpponentDeclined,
            returnToQueueAfterDecline, startAIDebate
    The full accept/poll/confirm/decline/AI flow.
    Imports: clearMatchAcceptTimers from ./arena-match-found.ts
    NOTE: If clearMatchAcceptTimers causes circular dep, extract it to a tiny
    arena-match-timers.ts (10 lines) and have both files import from there.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Check for circular deps before writing code. If found, extract the shared
  utility (clearMatchAcceptTimers) to a third file.
- Run npm run build after the split. Report chunk sizes and line counts.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-MATCH-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
```
