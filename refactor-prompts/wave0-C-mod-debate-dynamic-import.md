# Wave 0-C — Break arena-mod-queue ↔ arena-mod-debate cycle (dynamic import)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Fix a circular import between arena-mod-queue.ts and arena-mod-debate.ts.

PROBLEM: arena-mod-queue.ts imports showModDebatePicker from arena-mod-debate.ts.
arena-mod-debate.ts imports showModQueue from arena-mod-queue.ts.
This is a mutual static import cycle.

FIX: Convert the arena-mod-debate.ts → arena-mod-queue.ts import to a
dynamic import. This pattern is already established in the codebase
(see arena-lobby.ts back-button using: const { renderLobby } = await import('./arena-lobby.ts')).

CHANGE NEEDED in src/arena/arena-mod-debate.ts:
  Find the static import: import { showModQueue } from './arena-mod-queue.ts';
  Remove the static import line.
  Find every call site of showModQueue() in this file.
  Change each call to: const { showModQueue } = await import('./arena-mod-queue.ts'); showModQueue();
  (Or hoist the dynamic import once at the top of the function that calls it)

Do NOT change arena-mod-queue.ts — keep its static import of showModDebatePicker.
The forward direction (queue → picker) stays static. Only the back-button direction
(picker → queue) becomes dynamic.

RULES:
- Run npm run build after the change. Zero new errors.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-MODDEBATE-NNN]: description
- Do NOT fix any bugs. Refactor only.

Commit: "refactor: break arena-mod-queue ↔ arena-mod-debate cycle via dynamic import"
After build passes, commit and push directly to main:
git add -A
git commit -m "refactor: $(basename $(pwd)) split complete"
git push origin HEAD:main
Confirm push succeeded.
```