# Refactor Prompt — groups.ts (444 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/groups.ts (444 lines).

Read CLAUDE.md first, then read src/pages/groups.ts in full before touching anything. The file is the Groups Page — tab management, discover list, my-groups list, group detail view, join/leave toggle, and create modal.

SPLIT MAP (verify against the file before executing):

1. groups.ts (orchestrator, ~50 lines)
   Keeps: module-level state, DOMContentLoaded init, switchTab, switchDetailTab. These are the entry points and tab state — everything else delegates to sub-modules.

2. groups.discover.ts (~45 lines)
   filterCategory, loadDiscover. The discover tab — category filter chip logic and the RPC fetch + render loop.

3. groups.detail.ts (~105 lines)
   openGroup, updateJoinBtn, toggleMembership, showLobby. The group detail view — fetches group data, renders the detail panel, wires join/leave button.

4. groups.create.ts (~85 lines)
   openCreateModal, closeCreateModal, handleModalBackdrop, selectEmoji, submitCreateGroup. The create group modal flow.

5. groups.lists.ts (~40 lines)
   loadMyGroups, loadLeaderboard. The my-groups and leaderboard tab fetch+render functions.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (GroupDetail, GroupMember, etc.).
- Dependency direction: orchestrator imports all 4. Sub-modules import from auth.ts, config.ts directly. No cross-imports between sub-modules.
- Target under 110 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in groups.ts and groups.*.ts files (careful not to collide with existing groups.settings.ts, groups.auditions.ts, groups.members.ts, groups.feed.ts, groups.challenges.ts sub-files).

LANDMINES — log these as // LANDMINE [LM-GRP-NNN]: description comments. Do NOT fix them:

- LM-GRP-001 (in groups.create.ts at submitCreateGroup): Create button is disabled on submit but has no try/finally — if the RPC throws, the button stays permanently disabled. Disable-button-no-finally pattern.

- LM-GRP-002 (in groups.detail.ts at toggleMembership): Join/leave button is disabled on click and re-enabled only after the RPC resolves. No finally block — if the RPC throws, the button stays disabled. Disable-button-no-finally pattern.

- LM-GRP-003 (in groups.detail.ts at openGroup): The group detail panel is built with innerHTML. If openGroup is called rapidly in succession (double-tap), two RPC calls fire and whichever resolves last wins, potentially showing stale data from the first call mixed with state from the second.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
