# Refactor Prompt — src/arena/arena-mod-refs.ts (263 lines → 3 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-mod-refs.ts (263 lines).

Read CLAUDE.md first, then read src/arena/arena-mod-refs.ts in full before
touching anything. This file has three distinct concerns despite one name.

SPLIT MAP (verify against file before executing):

  src/arena/arena-mod-refs-form.ts  (~90 lines)
    Keeps: assignSelectedMod, addReferenceButton (no-op stub),
            showReferenceForm, hideReferenceForm
    The reference submission form UI + wiring.
    Imports: getUserJwt from ./arena-room-ai.ts
    Imports: requestAIModRuling from ./arena-mod-refs-ai.ts
    NOTE: addReferenceButton is a preserved no-op (F-55 retired). Keep the
    LANDMINE comment explaining why.

  src/arena/arena-mod-refs-ruling.ts  (~85 lines)
    Keeps: showRulingPanel, startReferencePoll (no-op stub), stopReferencePoll
    The moderator ruling overlay UI + countdown timer + button wiring.
    Imports: nothing from arena-mod-refs-form.ts
    NOTE: startReferencePoll is a preserved no-op (F-55 retired). Keep the
    LANDMINE comment.

  src/arena/arena-mod-refs-ai.ts  (~75 lines)
    Keeps: requestAIModRuling
    The AI Edge Function call for auto-ruling.
    Imports: getUserJwt from ./arena-room-ai.ts
    Imports: ruleOnReference from auth.ts
    Imports: addSystemMessage from ./arena-room-live-messages.ts
    Exports: requestAIModRuling

  src/arena/arena-mod-refs.ts  (thin orchestrator re-export)
    Re-exports: assignSelectedMod, addReferenceButton, showReferenceForm,
                hideReferenceForm, showRulingPanel, startReferencePoll,
                stopReferencePoll, requestAIModRuling
    This file exists only to preserve existing import paths. If grep shows
    that all callers already import specific functions (not from the umbrella
    file), delete this orchestrator and update callers directly.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: ai → form/ruling. Neither form nor ruling imports ai.
- Run npm run build after the split. Report chunk sizes and line counts.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-MODREFS-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
```
