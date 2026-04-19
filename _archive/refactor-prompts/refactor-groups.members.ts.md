# Refactor Prompt — groups.members.ts (377 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/groups.members.ts (377 lines).

Read CLAUDE.md first, then read src/pages/groups.members.ts in full before touching anything. The file is the Groups Members sub-module — member list loader/renderer, member actions modal (promote, kick, ban), and the action execution RPCs.

SPLIT MAP (verify against the file before executing):

1. groups.members.ts (orchestrator, ~45 lines)
   Keeps: setGroupOpenCallback, loadGroupMembers entry point, all imports. Calls render and modal sub-modules.

2. groups.members-render.ts (~80 lines)
   Member list HTML builder — the render function(s) that take the member array and build the member list DOM. Extracted from loadGroupMembers.

3. groups.members-modal.ts (~100 lines)
   _injectMemberActionsModal, openMemberActionsModal, closeMemberActionsModal, _setMamError, _setBtnLoading. The member actions modal — inject modal HTML once, open/close per member click, error display and button loading states.

4. groups.members-actions.ts (~110 lines)
   _executePromote, _executeKick, _executeBan. The three RPC-backed actions — each validates, calls RPC, handles error, closes modal on success and reloads the member list.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (GroupMember, etc.).
- Dependency direction: orchestrator imports render and modal. modal imports actions (to wire the execute buttons). actions imports modal (to call closeMemberActionsModal on success). render is standalone.
- Target under 115 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in groups.members* files.

LANDMINES — log these as // LANDMINE [LM-MEM-NNN]: description comments. Do NOT fix them:

- LM-MEM-001 (in groups.members-actions.ts at _executeKick and _executeBan): Action buttons are disabled during execution but no try/finally — if the RPC throws, buttons stay disabled. Disable-button-no-finally pattern.

- LM-MEM-002 (in groups.members-modal.ts at openMemberActionsModal): Modal is injected once via _injectMemberActionsModal and then reused. If openMemberActionsModal is called before the injection runs (e.g. race on first load), the modal DOM may not exist. The guard checks for the element but the timing dependency is implicit.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
