# Refactor Prompt — arena-feed-realtime.ts (339 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-feed-realtime.ts (339 lines).

Read CLAUDE.md first, then read src/arena/arena-feed-realtime.ts in full before touching anything. The file is the Feed Realtime module — Supabase Realtime subscription, heartbeat/staleness checks, goodbye signal, and disconnect handling for debaters and moderators.

SPLIT MAP (verify against the file before executing):

1. arena-feed-realtime.ts (orchestrator, ~50 lines)
   Keeps: subscribeRealtime, unsubscribeRealtime exports, module-level subscription state, all imports. Delegates heartbeat and disconnect handling to sub-modules.

2. arena-feed-realtime-heartbeat.ts (~55 lines)
   startHeartbeat, stopHeartbeat, sendGoodbye, checkStaleness. The heartbeat loop — periodic presence pings, staleness detection when the opponent goes silent, and the goodbye broadcast on clean exit.

3. arena-feed-realtime-disconnect.ts (~100 lines)
   handleParticipantGone, handleDebaterDisconnect, handleDebaterDisconnectAsViewer, handleModDisconnect, modNullDebate, showDisconnectBanner. All disconnect scenarios — debater gone, mod gone, null debate, and the disconnect banner UI.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (CurrentDebate).
- Dependency direction: orchestrator imports heartbeat and disconnect. heartbeat is standalone (reads module state from orchestrator via shared state module). disconnect is standalone. No cross-imports between heartbeat and disconnect.
- Target under 105 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in arena-feed-realtime* files.

LANDMINES — log these as // LANDMINE [LM-RT-NNN]: description comments. Do NOT fix them:

- LM-RT-001 (in arena-feed-realtime-heartbeat.ts at checkStaleness): Staleness detection uses a timestamp comparison. If the device clock is wrong or skewed, staleness can fire incorrectly — disconnecting an active debater or failing to detect a real disconnect. No NTP correction or server-time anchor.

- LM-RT-002 (in arena-feed-realtime-disconnect.ts at modNullDebate): modNullDebate is an async RPC call that fires an ejection and navigation. If called while a previous modNullDebate is still in flight, both execute and both attempt navigation. No in-flight guard.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
