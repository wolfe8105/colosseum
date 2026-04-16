# Refactor Prompt — src/arena/arena-feed-disconnect.ts (188 lines → 3 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-feed-disconnect.ts (188 lines).

Read CLAUDE.md first, then read src/arena/arena-feed-disconnect.ts in full
before touching anything. This file has three distinct jobs despite being
grouped under one "disconnect" name.

SPLIT MAP (verify against file before executing):

  src/arena/arena-feed-disconnect-debater.ts  (~75 lines)
    Keeps: handleDebaterDisconnect (private async),
            handleDebaterDisconnectAsViewer (private),
            the debater-specific path inside handleParticipantGone
    Exports: nothing directly — called from orchestrator only

  src/arena/arena-feed-disconnect-mod.ts  (~45 lines)
    Keeps: handleModDisconnect (private async),
            modNullDebate (public — mod eject/null action)
    Exports: modNullDebate

  src/arena/arena-feed-disconnect.ts  (orchestrator, ~70 lines)
    Keeps: handleParticipantGone (the public router — dispatches to debater
            or mod path based on role argument), showDisconnectBanner
    Imports: handleDebaterDisconnect, handleDebaterDisconnectAsViewer from
             arena-feed-disconnect-debater.ts
    Imports: handleModDisconnect from arena-feed-disconnect-mod.ts
    Re-exports: modNullDebate from arena-feed-disconnect-mod.ts
    Re-exports: handleParticipantGone, showDisconnectBanner

NOTE: The `void feedRealtimeChannel; void appendFeedEvent;` suppression lines
at the bottom are preserved to silence import warnings. Keep them in the
orchestrator file.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: debater/mod → orchestrator. Neither debater nor mod
  imports the other.
- Run npm run build after the split. Report chunk sizes and line counts.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-DISCONNECT-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
After build passes, commit and push directly to main:
git add -A
git commit -m "refactor: $(basename $(pwd)) split complete"
git push origin HEAD:main
Confirm push succeeded.
```