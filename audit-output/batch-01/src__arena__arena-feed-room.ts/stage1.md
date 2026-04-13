# Stage 1 — Primitive Inventory: src/arena/arena-feed-room.ts

All 11 agents unanimous.

Note: Lines 59–62 are re-export declarations (`export { ... } from '...'`) — these forward symbols defined in other files. They are not function definitions in this file and are excluded from the anchor list.

1. enterFeedRoom — function — line 115 — Orchestrates entry into the live debate feed room: initializes all feed-room state, builds the full DOM scaffold (scoreboard, timer, stream area, controls, optional spectator chat panel), subscribes to Realtime, fetches reference loadout (debaters only), renders controls, registers beforeunload/pagehide listeners, fires WebRTC audio bridge (fire-and-forget), and starts the pre-round countdown.
2. enterFeedRoomAsSpectator — async function — line 215 — Fetches live debate metadata via `get_arena_debate_spectator` RPC, constructs a spectator-flavored `CurrentDebate` object, and delegates to `enterFeedRoom`.
3. cleanupFeedRoom — function — line 249 — Tears down all feed-room resources in order: sends goodbye heartbeat, clears turn timer, unsubscribes Realtime, cleans up Deepgram, resets feed-room state, clears challenge/pause state, removes all DOM overlays (challenge, ad, vote-gate, refs, disconnect banner), removes beforeunload/pagehide listeners, tears down WebRTC, and cleans up spectator chat.
