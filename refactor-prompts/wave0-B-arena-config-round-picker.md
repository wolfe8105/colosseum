# Wave 0-B — Extract arena-config-round-picker.ts (breaks cycle 2)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-config-settings.ts to break a circular dependency.

PROBLEM: arena-config-settings.ts exports roundPickerCSS, roundPickerHTML,
wireRoundPicker. arena-config-mode.ts imports these from arena-config-settings.ts.
arena-config-settings.ts imports showModeSelect from arena-config-mode.ts.
This creates a cycle: arena-config-mode ↔ arena-config-settings.

FIX: Extract the round picker functions to a standalone zero-dependency file.

SPLIT MAP:
  src/arena/arena-config-round-picker.ts  (new, ~45 lines)
    Moves: roundPickerCSS, roundPickerHTML, wireRoundPicker
    Imports: ROUND_OPTIONS from arena-constants.ts, set_selectedRounds from arena-state.ts
    Imports nothing from arena-config-mode.ts or arena-config-settings.ts

  src/arena/arena-config-settings.ts  (stays, shrinks ~45 lines)
    Removes: roundPickerCSS, roundPickerHTML, wireRoundPicker exports
    Keeps: showRankedPicker, closeRankedPicker, showRulesetPicker, showRulesetSheet

IMPORT UPDATES:
  src/arena/arena-mod-debate.ts imports roundPickerCSS/HTML/wireRoundPicker
    → update to import from './arena-config-round-picker.ts'
  Any other file importing roundPicker* from arena-config-settings.ts
    (grep: roundPickerCSS|roundPickerHTML|wireRoundPicker)

RULES:
- import type for all type-only imports
- No barrel files. Direct imports only.
- Run npm run build after the change. Zero new errors.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-PICKER-NNN]: description
- Do NOT fix any bugs. Refactor only.

Commit: "refactor: extract arena-config-round-picker.ts — break config-mode cycle"
```
