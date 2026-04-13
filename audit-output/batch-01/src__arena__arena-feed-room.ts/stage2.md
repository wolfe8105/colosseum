# Stage 2 — Runtime Walk: src/arena/arena-feed-room.ts

All 11 agents unanimous on all major points.

---

## Private dependency: initFeedAudio(debate) (line 77)

Not in anchor list (unexported). Documented here because `enterFeedRoom` calls it fire-and-forget.

**Reads:** `debate.spectatorView`
**Side effects:**
- Returns immediately if `debate.spectatorView`
- Registers WebRTC event listeners via `onWebRTC`: `'micReady'` → clear `#feed-audio-status`; `'connected'` → clear; `'disconnected'` → show "🟡 Audio reconnecting..." or "🔴 Audio disconnected" depending on `recovering` flag; `'connectionFailed'` → show "🔴 Audio unavailable — text input active"
- `await joinDebate(debate.id, debate.role, debate.totalRounds)` in try/catch — on catch: sets `#feed-audio-status` to "🎤 Mic access blocked — text input active"
**Async:** Single `await joinDebate(...)`. Catches silently (no rethrow).

---

## 1. enterFeedRoom(debate) (line 115)

**Reads:** `screenEl` (arena-state), `timeLeft` (arena-feed-state — for initial `formatTimer()` call in HTML), `FEED_TOTAL_ROUNDS` (arena-types)
**Writes:** `set_currentDebate(debate)`, `set_phase('pre_round')`, `set_round(1)`, `set_timeLeft(3)`, `set_scoreA(0)`, `set_scoreB(0)`
**Control flow:**
1. `set_currentDebate(debate)`
2. `pushArenaState('room')` — updates history state
3. `if (screenEl) screenEl.innerHTML = ''` — clears screen
4. Initializes state: `set_phase('pre_round')`, `set_round(1)`, `set_timeLeft(3)`, `set_scoreA(0)`, `set_scoreB(0)`
5. Name resolution: calls `getCurrentProfile()` once. If `isSpectator`: uses `debate.debaterAName/B`. If debater/mod: resolves `myName` as moderatorName/display_name/username/`'You'`, then assigns per `debate.role`
6. Creates `div.feed-room.arena-fade-in` — full innerHTML scaffold with scoreboard, timer, stream area, controls div, optional spectator chat panel
7. `screenEl?.appendChild(room)`
8. `subscribeRealtime(debate.id)`
9. If `!isModView && !isSpectator`: `getMyDebateLoadout(debate.id).then((refs) => { set_loadedRefs(...); set_challengesRemaining(FEED_MAX_CHALLENGES); set_opponentCitedRefs([]); updateCiteButtonState(); }).catch(warn)` — fire-and-forget
10. `renderControls(debate, isModView)`
11. If `isSpectator`: `initSpecChat(debate.id)`
12. `window.addEventListener('beforeunload', sendGoodbye)`, `window.addEventListener('pagehide', sendGoodbye)`
13. `void initFeedAudio(debate)` — fire-and-forget, non-blocking
14. `startPreRoundCountdown(debate)` — synchronous call, kicks off turn machine
**DOM:** Creates and appends the full feed-room DOM. Notable elements: `#feed-timer`, `#feed-round-label`, `#feed-turn-label`, `#feed-score-a`, `#feed-score-b`, `#feed-stream`, `#feed-controls`, `#feed-audio-status`, `#feed-sentiment-gauge`, `#feed-spectator-count`. Conditionally appends `#feed-spec-chat-panel` if spectator.
**Async:** `getMyDebateLoadout` and `initFeedAudio` are both fire-and-forget. `enterFeedRoom` is synchronous (no await, returns void).

---

## 2. enterFeedRoomAsSpectator(debateId) (line 215)

**Reads:** None from module state
**Writes:** None (delegates to enterFeedRoom)
**Control flow:**
1. `await safeRpc('get_arena_debate_spectator', { p_debate_id: debateId })` — single RPC
2. On `error || !data`: `showToast('Could not load debate', 'error')` → return
3. Constructs `CurrentDebate` with explicit field coercions: `id=debateId`, `topic=String(d.topic||'')`, `role='a' as const` (placeholder), `mode='live' as any`, `round=Number(d.current_round)||1`, `totalRounds=Number(d.total_rounds)||4`, `opponentName=''`, `opponentElo=0`, `ranked=false`, `messages=[]`, `moderatorName=...`, `debaterAName=...`, `debaterBName=...`, `language=...`, `spectatorView=true`
4. Calls `enterFeedRoom(debate)` — synchronous delegation
**Async:** Returns `Promise<void>`. Single `await`. Does NOT catch errors beyond the `error` destructure from `safeRpc`.
**Notable:** `role` is hardcoded to `'a'` as a placeholder for spectators. `mode: 'live' as any` suppresses type checking on mode.

---

## 3. cleanupFeedRoom() (line 249)

**Reads:** `challengeRulingTimer` (arena-state)
**Writes:** `set_feedPaused(false)`, `set_feedPauseTimeLeft(0)`, `set_challengeRulingTimer(null)`, `set_activeChallengeRefId(null)`, `set_loadedRefs([])`, `set_opponentCitedRefs([])`, `set_challengesRemaining(FEED_MAX_CHALLENGES)`, `resetFeedRoomState()` (arena-feed-state)
**Side effects (ordered):**
1. `sendGoodbye()` — immediate disconnect signal
2. `clearFeedTimer()` — clears turn `setInterval`
3. `unsubscribeRealtime()` — tears down Supabase realtime channel
4. `cleanupDeepgram()` — stops Deepgram transcription
5. `resetFeedRoomState()` — resets all arena-feed-state variables to defaults
6. `set_loadedRefs([])`, `set_opponentCitedRefs([])`, `set_challengesRemaining(FEED_MAX_CHALLENGES)` — arena-state ref cleanup
7. `set_feedPaused(false)`, `set_feedPauseTimeLeft(0)` — pause state
8. `if (challengeRulingTimer) clearInterval(challengeRulingTimer)` → `set_challengeRulingTimer(null)` — ruling timer
9. `set_activeChallengeRefId(null)` — active challenge ref
10. DOM removals: `#feed-ref-dropdown`, `#feed-challenge-overlay`, `#feed-ad-overlay`, `#feed-vote-gate`, `#feed-disconnect-banner` (all optional chained `.remove()`)
11. `stopHeartbeat()`
12. `window.removeEventListener('beforeunload', sendGoodbye)`, `window.removeEventListener('pagehide', sendGoodbye)`
13. `offWebRTC('micReady')`, `offWebRTC('connected')`, `offWebRTC('disconnected')`, `offWebRTC('connectionFailed')`
14. `leaveDebate()` — WebRTC peer teardown
15. `cleanupSpecChat()` — spectator chat teardown
**Async:** None. Fully synchronous.
**Notable:** Does NOT call `set_currentDebate(null)`. After cleanup, `currentDebate` in arena-state retains its last value. Caller (arena-room-end.ts) is responsible for resetting it if needed.

---

## Cross-cutting findings

1. **`set_currentDebate(null)` omitted from cleanupFeedRoom**: `currentDebate` is set in `enterFeedRoom` but never cleared in `cleanupFeedRoom`. If `cleanupFeedRoom` is called and then another part of the codebase reads `currentDebate`, it will see stale debate data. Whether this is intentional (arena-room-end.ts clears it) or an omission cannot be determined without reading arena-room-end.ts.

2. **`enterFeedRoomAsSpectator` coerces `mode` with `as any`**: `mode: 'live' as any` at line 227. Type safety is explicitly bypassed here, which could mask a legitimate type-system error if `CurrentDebate.mode` is ever narrowed downstream.

3. **`getMyDebateLoadout` failure is silently warned**: The `.catch(warn)` at line 187 means debaters could enter the feed room with no reference loadout loaded, and the UI would silently continue. The cite button state may be incorrect.

4. **`enterFeedRoom` is synchronous but calls `startPreRoundCountdown` last**: `subscribeRealtime`, `renderControls`, and `initFeedAudio` all run before the countdown starts, so the feed machine starts with a fully rendered DOM and an active Realtime subscription.
