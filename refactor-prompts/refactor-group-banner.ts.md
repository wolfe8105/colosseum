# Refactor Prompt — group-banner.ts (459 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/group-banner.ts (459 lines).

Read CLAUDE.md first, then read src/pages/group-banner.ts in full before touching anything. The file is the Group Banner component — CSS injection (~195 lines), the main renderGroupBanner entry, a tier-1 fallback renderer, and a bottom-sheet upload flow.

SPLIT MAP (verify against the file before executing):

1. group-banner.ts (orchestrator, ~30 lines)
   Keeps: renderGroupBanner export, all imports. Calls _injectCSS, _renderTier1Fallback, and openBannerUploadSheet from sub-modules.

2. group-banner-css.ts (~195 lines)
   The _injectCSS function in full. Exports _injectCSS only. Follows the arena-css.ts naming pattern.

3. group-banner-render.ts (~65 lines)
   renderGroupBanner logic (the render body, not the orchestrator shell), _renderTier1Fallback. Banner HTML construction and tier-1 placeholder.

4. group-banner-upload.ts (~115 lines)
   openBannerUploadSheet, _closeSheet, _uploadBanner. The full upload bottom-sheet flow: build sheet DOM, wire file input, upload to Supabase storage, call update_group_banner RPC, close.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: orchestrator imports css, render, upload. No cross-imports between css/render/upload.
- Target under 200 lines per file. css.ts at ~195 is acceptable — pure CSS.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in group-banner* files.

LANDMINES — log these as // LANDMINE [LM-GB-NNN]: description comments. Do NOT fix them:

- LM-GB-001 (in group-banner-upload.ts at openBannerUploadSheet confirm handler): Upload/save button is disabled on click but has no try/finally — if _uploadBanner throws, the button stays permanently disabled. Disable-button-no-finally pattern.

- LM-GB-002 (in group-banner-upload.ts at _uploadBanner): Supabase storage upload uses upsert: true, meaning re-uploading a banner silently overwrites the previous one with no version history. Old banner URLs become dead links if any are cached by callers.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
