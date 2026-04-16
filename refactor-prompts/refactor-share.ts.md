# Refactor Prompt — src/share.ts (279 lines → 2 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/share.ts (279 lines).

Read CLAUDE.md first, then read src/share.ts in full before touching anything.
This file has two concerns: sharing utilities (building share data, sending to
native share/clipboard) and the post-debate share prompt UI (DOM construction
and modal wiring). The UI modal is ~90 lines of inline DOM construction that
can be extracted cleanly.

SPLIT MAP (verify against file before executing):

  src/share.ui.ts  (~95 lines)
    Keeps: _pendingShareResult module-level state variable,
            showPostDebatePrompt function
    showPostDebatePrompt is a DOM modal builder — the only function in this
    file that constructs UI. It references _pendingShareResult.
    It also calls shareResult and inviteFriend — import those from share.ts
    (or pass them as callbacks to avoid a potential circular dep).
    Check: does share.ts import anything from share.ui.ts? If yes, that's a
    circular dep. Resolution: pass shareResult and inviteFriend as parameters
    to showPostDebatePrompt, or use dynamic import inside the button handler.
    Exports: showPostDebatePrompt

  src/share.ts  (~185 lines)
    Keeps: ShareResultParams, ShareProfileParams, ShareData types,
            getBaseUrl, private share() helper,
            shareResult, shareProfile, inviteFriend, shareTake,
            handleDeepLink, ModeratorShare facade, ready.then auto-init
    Removes: _pendingShareResult, showPostDebatePrompt (moved to share.ui.ts)
    Imports: showPostDebatePrompt from ./share.ui.ts for the ModeratorShare facade
             (or just remove showPostDebatePrompt from ModeratorShare if no callers
              use ModeratorShare.showPostDebatePrompt)
    Re-exports: showPostDebatePrompt if existing callers import it from share.ts

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: share.ts → share.ui.ts (ui imports shareResult/inviteFriend
  from share.ts, OR receives them as callbacks).
- Verify no circular dep before committing.
- Run npm run build after the split. Report chunk sizes and line counts.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-SHARE-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
After build passes, commit and push directly to main:
git add -A
git commit -m "refactor: $(basename $(pwd)) split complete"
git push origin HEAD:main
Confirm push succeeded.
```