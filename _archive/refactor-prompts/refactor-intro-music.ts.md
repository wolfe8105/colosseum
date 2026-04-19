# Refactor Prompt — intro-music.ts (409 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/intro-music.ts (409 lines).

Read CLAUDE.md first, then read src/intro-music.ts in full before touching anything. The file is the Intro Music Picker — CSS injection (~185 lines), the picker bottom-sheet, track selection, and save flow.

SPLIT MAP (verify against the file before executing):

1. intro-music.ts (orchestrator, ~30 lines)
   Keeps: openIntroMusicPicker export, all imports. Calls _injectCSS and delegates sheet logic to picker sub-module.

2. intro-music-css.ts (~185 lines)
   The _injectCSS function in full. Exports _injectCSS only.

3. intro-music-picker.ts (~130 lines)
   openIntroMusicPicker body — builds the sheet DOM, renders the track list, wires track selection clicks, custom upload input, close button. Calls _refreshSelected and _close from save module. Module-level state for pendingFile and pendingUrl lives here since both are set by picker interactions.

4. intro-music-save.ts (~60 lines)
   _saveIntroMusic, _refreshSelected, _close. The save flow — upload to storage if custom, call save_intro_music RPC, update profile cache. _close and _refreshSelected are called from picker after user actions.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: orchestrator imports css and picker. picker imports save. save is standalone (imports from auth.ts, config.ts). css is standalone.
- Target under 190 lines per file. css.ts at ~185 is acceptable — pure CSS.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in intro-music* files.

LANDMINES — log these as // LANDMINE [LM-IM-NNN]: description comments. Do NOT fix them:

- LM-IM-001 (already fixed in Prompt 7): opacity-before-transition bug in _close was fixed. Verify the fix is present in the file before splitting. If not, apply it as part of this refactor.

- LM-IM-002 (in intro-music-picker.ts at track list render, already catalogued as L-N2 in AUDIT-FINDINGS.md): t.icon and t.id are interpolated into innerHTML without escapeHTML. INTRO_TRACKS is currently a hardcoded constant so there is no immediate XSS risk, but these are injection points if tracks ever become server-sourced.

- LM-IM-003 (in intro-music-picker.ts at track button click handler, already catalogued as L-N3 in AUDIT-FINDINGS.md): Standard track selection clears pendingFile but not pendingUrl. If the user previously selected a custom track (setting pendingUrl), then switches to a standard track, pendingUrl retains the old custom URL in the closure. No effect on current save behavior but the stale state is misleading.

- LM-IM-004 (in intro-music-save.ts at _saveIntroMusic, already catalogued as L-N4 in AUDIT-FINDINGS.md): For non-custom tracks, p_custom_url: null is always sent to the RPC, which clears any previously uploaded custom_intro_url from the DB. A user who switches from custom to a standard track loses their uploaded audio permanently.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
