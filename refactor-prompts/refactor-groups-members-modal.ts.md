# Refactor Prompt — src/pages/groups.members.modal.ts (306 lines → 2 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/groups.members.modal.ts (306 lines).

Read CLAUDE.md first, then read src/pages/groups.members.modal.ts in full before
touching anything. This file is a single-job module (member actions modal) but
at 306 lines it slightly exceeds the ceiling. The split is natural:
_injectMemberActionsModal is pure DOM construction (~130 lines of inline HTML)
that has no business logic. The action functions are pure logic.

SPLIT MAP (verify against file before executing):

  src/pages/groups.members.modal.html.ts  (~135 lines)
    Keeps: _injectMemberActionsModal function only.
    This function builds the modal DOM and wires the three button event listeners.
    IMPORTANT: The button listeners in _injectMemberActionsModal call _executePromote,
    _executeKick, _executeBan. These will be in the other file. Fix the circular
    dependency by having modal.html.ts accept callback parameters, OR by keeping
    the addEventListener calls in modal.ts and having modal.html.ts only build
    the DOM structure (recommended: remove the addEventListener calls from
    _injectMemberActionsModal and move them to openMemberActionsModal which
    already knows when the modal is ready).
    Exports: _injectMemberActionsModal
    Imports: nothing from modal.ts

  src/pages/groups.members.modal.ts  (~175 lines)
    Keeps: module-level state (_mamMember, _openGroupCb, _refreshMembers),
            setGroupOpenCallback, setRefreshMembersCallback,
            openMemberActionsModal, closeMemberActionsModal,
            _setMamError, _setBtnLoading,
            _executePromote, _executeKick, _executeBan
    Calls _injectMemberActionsModal from modal.html.ts on first use.
    Wires the button event listeners here (after modal injection), not in modal.html.ts.
    Exports: setGroupOpenCallback, setRefreshMembersCallback, _injectMemberActionsModal,
             openMemberActionsModal, closeMemberActionsModal (same public API as before)
    Imports: _injectMemberActionsModal from ./groups.members.modal.html.ts

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: modal.html.ts → modal.ts (html.ts has no logic deps).
- Run npm run build after the split. Report chunk sizes and line counts.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-MAMMODAL-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
```
