# Refactor Prompt — notifications.ts (424 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/notifications.ts (424 lines).

Read CLAUDE.md first, then read src/notifications.ts in full before touching anything. The file is the Notifications module — panel creation, list rendering, open/close, mark-read actions, badge update, and polling.

SPLIT MAP (verify against the file before executing):

1. notifications.ts (orchestrator, ~45 lines)
   Keeps: module-level state, init, open and close exports, all imports. Calls createPanel from panel module at init time. Exports timeAgo (it is used externally).

2. notifications.panel.ts (~70 lines)
   createPanel. Builds the full notifications panel DOM, injects CSS, appends to body. Calls renderList internally.

3. notifications.list.ts (~65 lines)
   renderList, getPlaceholderNotifs. Builds the notification item HTML and renders into the panel list container.

4. notifications.actions.ts (~65 lines)
   markRead, markAllRead, updateBadge. Mutation actions and badge state management. markRead fires the RPC and re-renders the list.

5. notifications.poll.ts (~45 lines)
   startPolling and the fetch logic. Polls the get_notifications RPC on a timer, updates module state, calls renderList and updateBadge on new data.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (Notification, NotificationFilter).
- Dependency direction: orchestrator imports panel, actions, poll. panel imports list. actions imports list (to re-render after mark). poll imports list and actions. No cross-imports between panel/actions/poll.
- Target under 75 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in notifications* files.

LANDMINES — log these as // LANDMINE [LM-NOT-NNN]: description comments. Do NOT fix them:

- LM-NOT-001 (in notifications.list.ts at renderList): Verify that all user-sourced content (notification body text, sender names) passes through escapeHTML before being interpolated into innerHTML. The audit (Batch 15R) found notifications.ts clean, but confirm escapeHTML usage is preserved after the split.

- LM-NOT-002 (in notifications.poll.ts at startPolling): The polling interval is stored in module state but notifications.ts does not export a destroy() function to clear it. CLAUDE.md requires every setInterval to be clearable via destroy(). Add a destroy() export that clears the interval — this is a fix, not a landmine to preserve.

Do NOT fix other issues. Refactor only.

Wait for approval of the split map before writing any code.
```
