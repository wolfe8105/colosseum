# Refactor Prompt — settings.ts (519 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/settings.ts (519 lines).

Read CLAUDE.md first, then read src/pages/settings.ts in full before touching anything. The file is the Settings Page Controller — account fields, notification toggles, moderator panel, logout, delete account, and intro music row.

SPLIT MAP (verify against the file before executing):

1. settings.ts (orchestrator, ~50 lines)
   Keeps: the DOMContentLoaded init handler, top-level imports, isPlaceholder const. Calls sub-modules for load, save, moderator, and wiring. No logic of its own beyond orchestrating the init sequence.

2. settings.helpers.ts (~40 lines)
   toast, getEl, getChecked, setChecked, validateTier, SettingsData interface, VALID_TIERS const, TIER_LABELS const, ValidTier type. Utility functions used across all other sub-modules. No DOM dependency beyond getEl.

3. settings.load.ts (~90 lines)
   loadSettings. Reads from localStorage and getCurrentProfile, populates all form fields. Imports from settings.helpers.ts.

4. settings.save.ts (~75 lines)
   saveSettings. Validation, localStorage write, updateProfile call, save_user_settings RPC. Imports from settings.helpers.ts.

5. settings.moderator.ts (~115 lines)
   loadModeratorSettings, and the 3 moderator event listeners (set-mod-enabled change, set-mod-available change, .mod-cat-chip click delegation). All moderator-specific UI in one place.

6. settings.wiring.ts (~100 lines)
   All remaining module-level event bindings: save-btn click, dark mode toggle, bio character counter, logout-btn, reset-pw-btn, delete-btn, delete-confirm-input, delete-cancel, delete-modal backdrop, delete-confirm, intro music row click and dynamic import. These run at module parse time — keep them at the bottom of this file.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (SettingsData).
- Dependency direction: orchestrator imports load, save, moderator, wiring. All sub-modules import from helpers. No cross-imports between load/save/moderator/wiring.
- Target under 120 lines per file. moderator.ts at ~115 is acceptable.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in settings* files.

LANDMINES — log these as // LANDMINE [LM-SET-NNN]: description comments. Do NOT fix them:

- LM-SET-001 (in settings.ts at DOMContentLoaded init): Uses the same Promise.race([ready, setTimeout(6000)]) auth race as home.ts before M-C4 was fixed. If auth is slow, the user hits the plinko redirect with no explanation. The slow-connection overlay from M-C4 fix was not applied here.

- LM-SET-002 (in settings.save.ts at saveSettings): saveBtn is disabled at the top of saveSettings and re-enabled at the end only on the success path. Validation failures correctly re-enable it, but if updateProfile throws an unhandled exception, saveBtn stays disabled. Not a try/finally pattern.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
