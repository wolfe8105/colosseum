# Refactor Prompt — arena-room-live.ts (353 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-room-live.ts (353 lines).

Read CLAUDE.md first, then read src/arena/arena-room-live.ts in full before touching anything. The file handles in-room input controls, text/AI mode flow, live audio mode, and message rendering. Has four natural sections already marked by comment banners.

SPLIT MAP (verify against the file before executing):

1. arena-room-live-input.ts (~65 lines)
   `export function renderInputControls(mode: DebateMode): void`
   The dispatcher that renders the input area for text/ai, live, or voicememo modes. Wires the text input handlers (input, send, keydown Enter), the mic button for live, and delegates voicememo to wireVoiceMemoControls. Imports submitTextArgument and toggleLiveMute from their respective new files.

2. arena-room-live-poll.ts (~110 lines)
   `export function stopOpponentPoll(): void`
   `export function startOpponentPoll(debateId: string, myRole: DebateRole, round: number): void`
   `export async function submitTextArgument(): Promise<void>`
   `export function advanceRound(): void`
   The text/AI mode flow: polling the opponent's message via safeRpc('get_debate_messages'), submitting text arguments, advancing the round including the F-57 close_debate_round pressure cluster. Imports addMessage and addSystemMessage from arena-room-live-messages.

3. arena-room-live-audio.ts (~95 lines)
   `export function startLiveRoundTimer(): void`
   `export async function initLiveAudio(): Promise<void>`
   `export function toggleLiveMute(): void`
   Live audio mode: round timer interval, WebRTC event handler registration (micReady, connected, disconnected, reconnecting, connectionFailed, muteChanged, tick, debateEnd), joinDebate call, mute toggle. Imports addSystemMessage and advanceRound from their new files.

4. arena-room-live-messages.ts (~40 lines)
   `export function addMessage(side: DebateRole, text: string, round: number, isAI: boolean): void`
   `export function addSystemMessage(text: string): void`
   Message rendering into #arena-messages. Leaf module — imports nothing from other live-* files.

5. Delete arena-room-live.ts. Update every consumer to import from the appropriate new file. Run `grep -rn "from.*arena-room-live" src/` to find callers. Common consumers: arena-room-setup.ts (renderInputControls, startLiveRoundTimer, initLiveAudio), arena-room-end.ts (may import addSystemMessage), arena-feed-wiring.ts.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- `import type` for all type-only imports (DebateMode, DebateRole, CurrentDebate).
- Dependency direction: messages is a leaf. poll imports messages. audio imports messages + poll (advanceRound). input imports poll (submitTextArgument) + audio (toggleLiveMute).
- Target under 300 lines, preference 150. Every file lands under 115.
- Run `npm run build` after the split, report chunk sizes and line counts.
- Run `npm run typecheck` and confirm zero NEW errors in arena-room-live* files.

LANDMINES — log these as `// LANDMINE [LM-LIVE-NNN]: description` comments. Do NOT fix them:

- LM-LIVE-001 (in arena-room-live-poll.ts at submitTextArgument, already catalogued as M-B3 in AUDIT-FINDINGS.md): The catch block on the `submit_debate_message` RPC call is `catch { /* warned */ }` — a comment implying logging happened, but there is no actual console.error, no telemetry, nothing. Opponent's poll then times out waiting for a message that was never persisted. Same family as other silent-catch findings. Needs a real `console.error` at minimum.

- LM-LIVE-002 (in arena-room-live-audio.ts at initLiveAudio, already catalogued as M-B4 in AUDIT-FINDINGS.md): Every call to initLiveAudio adds new onWebRTC handlers (micReady, connected, disconnected, reconnecting, connectionFailed, muteChanged, tick, debateEnd) with NO deregistration of previous handlers. If initLiveAudio is ever re-entered (user navigates back into a live debate, or a reconnect path calls init again), `debateEnd` fires multiple times and `endCurrentDebate` runs multiple times. Memory leak + behavioral bug. Fix requires either a destroy() function that tracks handler refs and removes them, or guarding init with a module-level "already initialized" flag.

- LM-LIVE-003 (in arena-room-live-poll.ts at advanceRound, line 187-203 of the original): The F-57 pressure cluster is fire-and-forget with `.catch(() => { /* non-fatal */ })`. If `close_debate_round` fails, the UI never shows the "Pressure — you scored 0" system message even when the server DID apply pressure. ON CONFLICT DO NOTHING on the server means only the first caller does work, which is by design, but client-side error path loses telemetry.

- LM-LIVE-004 (in arena-room-live-poll.ts at the opponent poll interval callback, line 95-128 of the original): The setInterval runs an async callback. If the RPC hangs longer than OPPONENT_POLL_MS (default ~3s), a second fetch fires before the first resolves. Multiple in-flight get_debate_messages requests, first to resolve wins the advanceRound call. Shouldn't cause state corruption (all queries return the same data) but is wasteful.

- LM-LIVE-005 (in arena-room-live-audio.ts at the onWebRTC event handlers): Every handler does `document.getElementById('arena-audio-status')` or similar global ID lookups inside the callback. Same ID-collision fragility family as L-I5 in AUDIT-FINDINGS.md. If the arena room is ever rendered twice (e.g. spectator + participant in same DOM), handlers target whichever element has the ID first.

Do NOT fix landmines — they're tracked in AUDIT-FINDINGS.md for Phase 2 cleanup. Refactor only.

Wait for approval of the split map before writing any code.
```
