# Refactor Prompt — spectate.render.ts (490 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/spectate.render.ts (490 lines).

Read CLAUDE.md first, then read src/pages/spectate.render.ts in full before touching anything. The file is the Spectate Render module — message rendering, a ~190-line timeline renderer, and the main spectate view composer.

SPLIT MAP (verify against the file before executing):

1. spectate.render.ts (orchestrator, ~55 lines)
   Keeps: showError, renderSpectateView. renderSpectateView calls out to renderMessages and renderTimeline from sub-modules. All imports stay here.

2. spectate.render-messages.ts (~60 lines)
   renderMessages, formatPointBadge. Renders the live debate message list and the point-award badge HTML. These two are always used together.

3. spectate.render-timeline.ts (~200 lines)
   renderTimeline plus extracted private helpers: _renderTimelineHeader (debate metadata block), _renderTimelineEvent (single event row), _renderPointAward (point award inline block). The current renderTimeline is one function of ~190 lines — extract at least 3 named helpers to bring the main function under 60 lines. The helpers stay private (not exported) within this file.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (DebateMessage, SpectateDebate, ReplayPointAward).
- Dependency direction: orchestrator imports messages and timeline. No cross-imports between messages and timeline.
- Target under 200 lines per file. timeline.ts at ~200 is acceptable — pure rendering with extracted helpers.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in spectate.render* files.

LANDMINES — log these as // LANDMINE [LM-SPEC-NNN]: description comments. Do NOT fix them:

- LM-SPEC-001 (in spectate.render-timeline.ts): renderTimeline builds the entire replay timeline as one large innerHTML string. For long debates with many events this creates a large DOM update in one shot with no virtualization. Could cause jank on low-end devices for debates with 50+ events.

- LM-SPEC-002 (in spectate.render.ts at renderSpectateView): The function sets container.innerHTML directly, wiping any existing content and event listeners. If called while a user is interacting with the spectate view (e.g. scrolling), the scroll position resets.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
