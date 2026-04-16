# Refactor Prompt — src/arena/arena-mod-debate.ts (268 lines → 3 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-mod-debate.ts (268 lines).

Read CLAUDE.md first, then read src/arena/arena-mod-debate.ts in full before
touching anything. This file has three distinct screens plus shared poll logic.

IMPORTANT PRE-CHECK: After Wave 0-B runs, this file's imports of
roundPickerCSS, roundPickerHTML, wireRoundPicker will have moved from
arena-config-settings.ts to arena-config-round-picker.ts. Update that import
as part of this refactor. If Wave 0-B has not run yet, note this as a LANDMINE.

SPLIT MAP (verify against file before executing):

  src/arena/arena-mod-debate-picker.ts  (~95 lines)
    Keeps: showModDebatePicker, createModDebate
    showModDebatePicker renders the "Create Debate" form screen.
    createModDebate submits the RPC and transitions to the waiting screen.
    Imports: roundPickerCSS, roundPickerHTML, wireRoundPicker from
             './arena-config-round-picker.ts' (after Wave 0-B) or
             './arena-config-settings.ts' (if Wave 0-B not done yet)
    Imports: showModDebateWaitingMod from ./arena-mod-debate-waiting.ts
    Imports: showModQueue via dynamic import (to avoid circular dep with arena-mod-queue.ts)

  src/arena/arena-mod-debate-waiting.ts  (~65 lines)
    Keeps: showModDebateWaitingMod, showModDebateWaitingDebater
    Both screens that display while waiting for debaters to join.
    Imports: startModDebatePoll, cancelModDebate from ./arena-mod-debate-poll.ts

  src/arena/arena-mod-debate-poll.ts  (~90 lines)
    Keeps: startModDebatePoll, stopModDebatePoll, onModDebateReady, cancelModDebate
    The polling loop + ready handler + cancel logic.
    Imports: showModQueue via dynamic import

  src/arena/arena-mod-debate.ts  (thin orchestrator OR delete)
    If nothing imports from arena-mod-debate.ts directly except showModDebatePicker,
    this file becomes: just re-export showModDebatePicker from picker.ts.
    Check what arena-mod-queue.ts imports — if it only imports showModDebatePicker,
    the orchestrator just needs to re-export that one function.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: picker → waiting → poll. Neither waiting nor poll imports picker.
- Run npm run build after the split. Report chunk sizes and line counts.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-MODDEBATE-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
After build passes, commit and push directly to main:
git add -A
git commit -m "refactor: $(basename $(pwd)) split complete"
git push origin HEAD:main
Confirm push succeeded.
```