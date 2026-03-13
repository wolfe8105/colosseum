# CHART 2: ARENA — Edge Map
### Session 84 · March 12, 2026
### 42 edges traced · 8 files involved · 11 unwired features · 1 bug

---

## FILES INVOLVED IN CHART 2

| File | Lines | Role |
|------|-------|------|
| colosseum-arena.js | 2151 | Primary — lobby, modes, queue, room, post-debate |
| colosseum-webrtc.js | 553 | Live audio — joinDebate, toggleMute, waveform |
| colosseum-voicememo.js | 811 | Voice memo — record, stop, send, retake |
| colosseum-share.js | 208 | Share — shareResult (NOT shareDebateResult) |
| colosseum-cards.js | 331 | ESPN share cards — generateCard (bot army only) |
| colosseum-auth.js | 879 | Rivals, moderator assign/score, ranked eligibility |
| colosseum-tokens.js | 417 | Token claims — claimDebate, claimAiSparring |
| index.html | 700+ | Bottom nav arena button, navigateTo(), screen switch |
| colosseum-async.js | 500+ | Challenge flow (creates DB record, no arena nav) |

---

## 🐛 BUG FOUND

**Post-debate share function name mismatch**
- arena.js L1725: `ColosseumShare.shareDebateResult({...})`
- share.js L20 exports: `shareResult` (not `shareDebateResult`)
- Result: Share button silently fails. Falls through to `navigator.share` fallback at L1735-1741.
- Fix: Change L1725 to `ColosseumShare.shareResult({...})` OR add alias in share.js return block.

---

## ⚠️ UNWIRED FEATURES (11)

These exist as nodes/edges in the diagram but have NO code implementation:

### Debate Room (4 missing)
1. **Agree PRO (audience pulse)** — No audience pulse buttons. Spectator bar at L1103 is display-only count.
2. **Agree CON (audience pulse)** — Same as above.
3. **Spectator Chat** — No chat functionality for spectators.
4. **Share Live Debate Link** — No share button in the active debate room. Share only exists in post-debate.

### Post-Debate (4 missing)
5. **View Full Transcript** — No transcript button in post-debate HTML (L1707-1711 only has Rematch/Share/Lobby).
6. **Add as Rival** — No rival button in post-debate. `declare_rival` RPC exists in auth.js L471 but is not called from post-debate.
7. **Tap Opponent Avatar** — Opponent name is rendered but not clickable in post-debate screen.
8. **→ Public Profile (from opponent)** — Depends on #7.

### Spectator Path (2 missing)
9. **Tap Active Debate (user debates)** — Lobby feed cards only set `data-link` for auto-debates (L576). User debate cards render "SPECTATE" button but clicking does nothing.
10. **Spectator View → Debate Room** — No spectator-mode room entry exists for user debates.

### Cross-Chart (1 partially unwired)
11. **Challenge from Hot Take → Pre-Debate** — `_submitChallenge()` in async.js creates a DB record via `create_challenge` RPC but does NOT navigate to the arena. The opponent would need to find the challenge in the lobby "Open Challenges" section.

---

## ⚠️ BEHAVIOR NOTE

**Rematch doesn't preserve opponent** — Edge 146 (Rematch → Pre-Debate) calls `enterQueue(mode, topic)` at L1720-1723 which re-enters the general matchmaking queue. The original opponent is not carried forward.

---

## EDGE-BY-EDGE TRACE

### LOBBY SECTION

**Edge 89: Lobby → Casual Mode**
- arena.js L628-703: `showRankedPicker()` — casual card at L644, click handler at L675, sets `selectedRanked = false` at L695, calls `showModeSelect()` at L697

**Edge 90: Lobby → Ranked Mode**
- arena.js L628-703: `showRankedPicker()` — ranked card at L655, eligibility check at L678-691, calls `safeRpc('check_ranked_eligible')` at L680
- If ineligible: confirms → redirects to `colosseum-profile-depth.html` at L685-686

**Edges 95-97: Lobby → Live Audio / Voice Memo / Text Battle**
- arena.js L714-790: `showModeSelect()` — `MODES` constant at L30-35, card render at L731, click handler at L774-789 → `enterQueue(mode, topic)` at L790

**Edge 98: Lobby → AI Sparring**
- arena.js L714-790: same `showModeSelect()` path
- arena.js L878-880: `enterQueue` short-circuits — `if (mode === 'ai')` → `startAIDebate(topic)` → returns immediately, no queue

### MATCHMAKING SECTION

**Edges 100-102: [Mode] → Matchmaking**
- arena.js L874-906: `enterQueue()` — queue UI at L880-895, `joinServerQueue()` at L924-960
- Polls for match via `check_queue_status` RPC at L944-955, 2-second interval

**Edge 104: Matchmaking → Timeout**
- arena.js L901-906: checks `QUEUE_TIMEOUT_SEC` (L37: live=90s, voicememo=10s, text=10s)
- Calls `onQueueTimeout()` at L989

**Edge 105: Timeout → AI Sparring**
- arena.js L989-1012: `onQueueTimeout()` — renders "SPAR WITH AI INSTEAD" button at L996
- Click handler at L1006: `enterQueue('ai', '')`
- Also offers "TRY AGAIN" (L997) and "BACK TO LOBBY" (L998)

**Edge 107: Matchmaking → Pre-Debate (match found)**
- arena.js L962-983: `onMatchFound()` — updates status display, 1.2-second pause at L977, then `enterRoom()` at L976-983

**Edge 109: Pre-Debate → Cancel**
- arena.js L895: `arena-queue-cancel` button in queue UI
- arena.js L1018-1023: `leaveQueue()` — clears timers, calls `leave_debate_queue` RPC

**Edge 110: Cancel → Back to Lobby**
- arena.js L1023: `leaveQueue()` calls `renderLobby()`

### AI SPARRING SHORTCUT

**Edge 112: AI Sparring → (skips matchmaking)**
- arena.js L878-880: `enterQueue` — `if (mode === 'ai') { startAIDebate(topic); return; }`

**Edge 114: (match found) → Debate Room**
- arena.js L962-983: `onMatchFound()` → `enterRoom()` at L976
- arena.js L1068-1142: `enterRoom()` — builds full debate room UI

**Edge 115: (skips matchmaking) → Debate Room**
- arena.js L1045-1065: `startAIDebate()` — creates AI debate via `create_ai_debate` RPC at L1051, then `enterRoom()` at L1057

### DEBATE ROOM SECTION

**Edge 120: Debate Room → Mic Button (Live Audio)**
- arena.js L1146: `renderInputControls(mode)` called from `enterRoom()`
- arena.js L1179-1188: case 'live' — canvas waveform, mic button at L1186
- arena.js L1459-1468: `toggleLiveMute()` → `ColosseumWebRTC.toggleMute()`
- arena.js L1406-1458: `initLiveAudio()` — wires WebRTC events (micReady, connected, disconnected, muteChanged, tick, debateEnd)
- webrtc.js L340: `joinDebate(debateId, role)` — joins Supabase Realtime channel
- webrtc.js L83: `toggleMute()` — toggles local stream audio tracks
- webrtc.js L484: `createWaveform(stream, canvas)` — visualizes audio

**Edge 121: Debate Room → Record Memo (Voice)**
- arena.js L1146+L1192-1206: case 'voicememo' — record button, retake, send buttons
- arena.js L1470-1580: `wireVoiceMemoControls()` — wires record/cancel/send clicks
- voicememo.js L59: `startRecording()` — requests mic, starts MediaRecorder
- voicememo.js L112: `stopRecording()` — stops recorder, creates blob

**Edge 122: Debate Room → Type Argument (Text)**
- arena.js L1146+L1149-1177: case 'text'/'ai' — textarea, send button, char counter
- arena.js L1210-1262: `submitTextArgument()` — saves via `submit_debate_message` RPC
- AI mode: triggers `handleAIResponse()` for AI opponent reply

**Edge 123: Debate Room → Attach Source / Evidence**
- arena.js L1132: `addReferenceButton()` called from `enterRoom()` (skipped for AI mode at L1766)
- arena.js L1762-1830: `addReferenceButton()` → `showReferenceForm()` — URL input, description textarea, side selector, submit evidence RPC

**Edge 128: Debate Room → Agree PRO (audience pulse)** ⚠️ UNWIRED
- Spectator bar at L1103 is display-only (count). No vote/pulse buttons exist.

**Edge 129: Debate Room → Agree CON (audience pulse)** ⚠️ UNWIRED
- Same as 128.

**Edge 130: Debate Room → Spectator Chat** ⚠️ UNWIRED
- No chat functionality for spectators in code.

**Edge 131: Debate Room → Share Live Debate Link** ⚠️ UNWIRED
- No share button exists in the debate room. Share only appears in post-debate at L1709.

**Edge 133: Debate Room → Post-Debate (timer expires)**
- arena.js L1366-1385: `advanceRound()` — when `round >= totalRounds`, calls `endCurrentDebate()` after 1.5s at L1370
- arena.js L1387-1403: `startLiveRoundTimer()` — counts down `ROUND_DURATION` (120s), calls `advanceRound()` on timeout
- arena.js L1626-1743: `endCurrentDebate()` — generates scores, updates Supabase via `update_arena_debate` RPC, claims tokens, renders post-debate screen

### POST-DEBATE SECTION

**Edge 140: Post-Debate → Share Result** 🐛 BUG
- arena.js L1709: `arena-share-result` button
- arena.js L1724-1742: click handler calls `ColosseumShare.shareDebateResult({...})`
- **BUG**: share.js exports `shareResult` (L20), not `shareDebateResult` — call silently fails
- Fallback: `navigator.share()` at L1735-1741

**Edge 141: Post-Debate → Rematch**
- arena.js L1708: `arena-rematch` button
- arena.js L1720-1723: click → `enterQueue(debate.mode, debate.topic)` — re-enters queue (does NOT preserve opponent)

**Edge 142: Post-Debate → Back to Arena**
- arena.js L1710: `arena-back-to-lobby` button
- arena.js L1743: click → `renderLobby()`

**Edge 143: Post-Debate → View Full Transcript** ⚠️ UNWIRED
- Post-debate HTML at L1707-1711 only contains: Rematch, Share, Lobby buttons. No transcript button.

**Edge 144: Post-Debate → Add as Rival** ⚠️ UNWIRED
- No rival button in post-debate screen
- auth.js L471: `declare_rival` RPC exists and is exported but not called from arena.js post-debate

**Edge 145: Post-Debate → Tap Opponent Avatar** ⚠️ UNWIRED
- Opponent name rendered in score display but not wrapped in clickable element

**Edge 146: Rematch → Pre-Debate (same opponent)**
- arena.js L1720-1723: `enterQueue(debate.mode, debate.topic)`
- ⚠️ NOTE: Re-enters general queue — does not preserve opponent for true rematch

**Edge 147: Back to Arena → Lobby**
- arena.js L1743: `renderLobby()`

**Edge 149: Tap Opponent Avatar → Public Profile** ⚠️ UNWIRED
- Depends on edge 145 (no clickable avatar)

### SPECTATOR PATH

**Edge 153: Lobby → Tap Active Debate** ⚠️ PARTIALLY UNWIRED
- arena.js L570-587: `renderArenaFeedCard()` — "SPECTATE" button text rendered at L574
- L576: `data-link` only set for auto-debates (`isAuto ? data-link=... : ''`)
- L510-512: Event delegation only fires for cards with `data-link`
- Result: Auto-debate cards navigate to auto-debate.html. User debate "SPECTATE" does nothing.

**Edge 155: Tap Active Debate → Spectator View** ⚠️ PARTIALLY UNWIRED
- Auto-debates: navigates to `colosseum-auto-debate.html?id=...`
- User debates: no navigation path

**Edge 156: Spectator View → Debate Room** ⚠️ UNWIRED
- No spectator-mode room entry exists for user debates

### CROSS-CHART CONNECTORS

**Edge 311: Chart 1 "→ Chart 2: Arena Lobby" → Arena Lobby**
- index.html L312: bottom-nav button `data-screen="arena"`
- index.html L554-567: `navigateTo()` — switches `.screen` active class
- arena.js L2109-2131: `autoInit()` — observes DOM for `#screen-arena`, calls `init()` → `renderLobby()`

**Edge 319: Chart 3 "Challenge" → Pre-Debate**
- async.js L414-512: `challenge()` → `_showChallengeModal()` → `_submitChallenge()`
- async.js L486: calls `create_challenge` RPC — creates DB record
- ⚠️ Does NOT navigate to arena. Opponent would find challenge in lobby "Open Challenges" section.

**Edge 322: Tap Opponent Avatar → Public Profile** ⚠️ UNWIRED
- Depends on edge 145 (no clickable avatar in post-debate)

---

## SUMMARY

| Category | Count |
|----------|-------|
| Total edges traced | 42 |
| Fully wired | 27 |
| Unwired | 11 |
| Partially unwired | 2 |
| Behavior notes | 2 |
| Bugs found | 1 |
| Files involved | 9 |
