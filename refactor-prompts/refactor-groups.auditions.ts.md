# Refactor Prompt — groups.auditions.ts (301 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/groups.auditions.ts (301 lines).

Read CLAUDE.md first, then read src/pages/groups.auditions.ts in full before touching anything. The file is the Groups Auditions sub-module — the audition request modal, field population logic, submission RPC, pending auditions list, and leader accept/reject actions.

SPLIT MAP (verify against the file before executing):

1. groups.auditions.ts (orchestrator, ~40 lines)
   Keeps: openAuditionModal, closeAuditionModal exports, module-level state, all imports. Delegates render, submit, and list to sub-modules.

2. groups.auditions-render.ts (~85 lines)
   The modal HTML builder and _populateAuditionFields. Builds the audition modal DOM from a GroupDetail object and populates form fields for the needsDebate path.

3. groups.auditions-submit.ts (~80 lines)
   submitAuditionRequest. Validates form state, calls the submit RPC, handles success (closes modal, shows toast) and error. Uses try/finally on the submit button.

4. groups.auditions-list.ts (~75 lines)
   loadPendingAuditions, handleAuditionAction, _renderAuditionsList. Loads the pending auditions for group leaders, renders the list, and wires the accept/reject actions.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (GroupDetail, etc.).
- Dependency direction: orchestrator imports render and submit. list is called from the group leader context and can be imported directly by the caller — it does not need to go through the orchestrator. render and submit do not cross-import. list is standalone.
- Target under 90 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in groups.auditions* files.

LANDMINES — log these as // LANDMINE [LM-AUD-NNN]: description comments. Do NOT fix them:

- LM-AUD-001 (in groups.auditions-submit.ts at submitAuditionRequest, already partially addressed by Prompt 6 stale-state fix): Verify the _attemptFeePaid reset fix from Prompt 6 is present. If submitAuditionRequest resets module state at the top, the fix is in place. If not, apply it during this refactor.

- LM-AUD-002 (in groups.auditions-list.ts at handleAuditionAction): Accept and reject buttons are disabled during action. Verify try/finally is used — if not, apply it during this refactor (aligned with CLAUDE.md rules).

- LM-AUD-003 (in groups.auditions-render.ts at _populateAuditionFields): _populateAuditionFields is only called when needsDebate is true (rule !== 'allowed_by_leader'). For allowed_by_leader groups, fields from a previous modal open persist. Already fixed in Prompt 6 (stale module state fix) — verify the fix is present before splitting.

Do NOT fix other landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
