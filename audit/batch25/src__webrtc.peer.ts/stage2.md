# Stage 2 Runtime Walk — src/webrtc.peer.ts

Anchors: 6 | Agents: 5 | All anchors covered by all agents

---

## Agent 01

### createPeerConnection (line 15)
- Input: `iceServers: RTCIceServer[]`
- Writes `state.peerConnection = new RTCPeerConnection({ iceServers })` — unconditional overwrite; prior PC is orphaned, no `.close()`, handlers remain live
- Branch: if `state.localStream` truthy → iterates `getTracks()`, calls `addTrack(track, state.localStream)` on new PC; else skips silently
- Registers `ontrack`: writes `state.remoteStream = event.streams[0] ?? null`, fires `'remoteStream'`
- Registers `onicecandidate`: if `event.candidate` non-null, calls `signals.sendSignal?.('ice-candidate', candidate.toJSON())`; null candidate (gathering complete) silently skipped
- Registers `onconnectionstatechange`:
  - Always fires `fire('connectionState', { state: connState })`
  - `'connected'`: writes `state.debateState.status = 'live'`, `state.iceRestartAttempts = 0`, clears both `disconnectTimer` and `setupTimer`, fires `'connected'`
  - `'disconnected'`: fires `'disconnected'`, clears existing `disconnectTimer`, sets new 3s `setTimeout`; on expiry: nulls timer, re-reads `connectionState`, if still `'disconnected'` or `'failed'` → `void attemptIceRestart()`
  - `'failed'`: clears `disconnectTimer`, immediately calls `void attemptIceRestart()`
  - All other states (`'connecting'`, `'new'`, `'closed'`): no additional action
- Returns `state.peerConnection`
- No try/catch; exceptions from `new RTCPeerConnection` or `addTrack` propagate uncaught

### attemptIceRestart (line 67)
- Input: none; reads all from `state`
- Writes `state.iceRestartAttempts++` unconditionally before any guard
- Guard: `iceRestartAttempts > MAX_ICE_RESTART_ATTEMPTS` → warn, fires `'connectionFailed'` with `{ attempts: MAX_ICE_RESTART_ATTEMPTS }` (constant, not actual count), returns
- Logs attempt, fires `'reconnecting'`
- Role guard: `state.debateState.role === 'a' && state.peerConnection` — role 'b' exits silently after logging
- Try block (role 'a' only): `restartIce()`, `await createOffer({ iceRestart: true })`, `await setLocalDescription(offer)`, `signals.sendSignal?.('offer', offer)`
- Catch: `console.warn`, swallowed — no event, no counter rollback

### createOffer (line 94)
- No params; inside try/catch
- Branch: if `!state.peerConnection` → `await getIceServers()` then `createPeerConnection(servers)`
- `await state.peerConnection!.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false })`
- `await state.peerConnection!.setLocalDescription(offer)`
- `signals.sendSignal?.('offer', offer)`
- Catch: `console.warn` only; caller gets resolved promise regardless of success/failure

### handleOffer (line 108)
- Input: `offer: RTCSessionDescriptionInit`
- Same lazy PC creation pattern as `createOffer`
- `await state.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer))`
- `await state.peerConnection!.createAnswer()`
- `await state.peerConnection!.setLocalDescription(answer)`
- `signals.sendSignal?.('answer', answer)`
- Catch: `console.warn`, swallowed

### handleAnswer (line 123)
- Input: `answer: RTCSessionDescriptionInit`
- Hard guard: `if (!state.peerConnection) return` — no error, no event; no lazy creation
- `await state.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))`
- Catch: `console.warn`, swallowed

### handleIceCandidate (line 132)
- Input: `candidate: RTCIceCandidateInit`
- Hard guard outside try/catch: `if (!state.peerConnection) return` — candidates arriving before PC exists are silently discarded
- `await state.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))`
- Catch: `console.warn('ICE candidate error:', err)` — note: missing `[WebRTC]` prefix unlike all other warn calls

---

## Agent 02

### createPeerConnection (line 15)
- Unconditional `state.peerConnection` overwrite; old PC not closed — event handlers from old PC remain live and will fire into current `state`
- `ontrack`: `state.remoteStream = event.streams[0] ?? null` then `fire('remoteStream')`
- `onicecandidate`: `sendSignal?.()` optional-chained; missing `sendSignal` silently drops candidate
- `onconnectionstatechange`: four branches. Key: `'connected'` resets `iceRestartAttempts = 0` and clears both timers; `'disconnected'` fires + starts 3s timer with re-check; `'failed'` fires immediately; `'closed'` and other states: no action
- Returns new PC

### attemptIceRestart (line 67)
- Increments counter before cap check
- Cap hit: fires `'connectionFailed'` with hardcoded `MAX_ICE_RESTART_ATTEMPTS` not actual count
- Role 'b': `fire('reconnecting')` fires, then function silently exits; no mechanism for role 'b' to surface failure
- Role 'a' try: `restartIce()` + `createOffer({ iceRestart: true })` + `setLocalDescription` + `sendSignal?.('offer')`; catch swallows

### createOffer / handleOffer / handleAnswer / handleIceCandidate
- Consistent with Agent 01; same catch-swallow pattern throughout. No `fire()` from any catch block — UI cannot detect negotiation failures.

---

## Agent 03

### createPeerConnection (line 15)
- Old PC orphaned: handlers still hold closure reference to `state`; `onconnectionstatechange` on old PC reads `state.peerConnection!.connectionState` which would now read the NEW connection's state — can trigger spurious ICE restarts

### attemptIceRestart (line 67)
- Role 'b': `iceRestartAttempts` increments even though no restart is attempted, burning through the retry budget without actual restart work. If connection goes `disconnected→failed` 3× without role 'a' succeeding in reconnecting, role 'b' gets `'connectionFailed'` even though it never initiated a restart

### handleIceCandidate (line 132)
- `addIceCandidate` fails with `InvalidStateError` if `setRemoteDescription` has not yet completed (trickle ICE race) — candidate permanently lost; no candidate queue exists

---

## Agent 04 (read webrtc.state.ts for context)

### createPeerConnection
- SETUP_TIMEOUT_MS confirmed: imported as constant `30_000` from webrtc.state.ts line 12, but never referenced in webrtc.peer.ts function bodies — dead import
- Old PC event handlers on `state.peerConnection` close with `state` in scope. After `createPeerConnection` overwrites `state.peerConnection`, the old handlers' closure reads `state.peerConnection!.connectionState` from the NEW object — this is a stale-handler/cross-wiring bug

### onconnectionstatechange — double restart race
- `'disconnected'` branch: fires timer (3s). If `'failed'` fires before timer expires, `'failed'` branch calls `attemptIceRestart()` immediately AND clears the timer — one call only. Good.
- But if `'failed'` fires AFTER the 3s timer has already fired `attemptIceRestart()`, the `'failed'` branch triggers a second call — two restart flows in flight, counter increments twice before either resolves

### handleOffer during ICE restart
- ICE restart re-offer arrives while old PC is still open (signaling state may not be `'stable'`). `setRemoteDescription` on a re-offer when `signalingState === 'have-local-offer'` throws `InvalidStateError`, caught and swallowed — ICE restart silently fails for role 'b'

### handleIceCandidate
- No candidate queue. Standard mitigation: queue in `state.iceCandidateQueue[]` when `remoteDescription` is null, drain after `setRemoteDescription` completes

---

## Agent 05

### createPeerConnection
- Stale overwrite confirmed; same analysis as above
- `ontrack` with empty `event.streams[]` sets `state.remoteStream = null` silently — drops remote audio mid-call
- `'closed'` connectionState: timer not cleared; any 3s `disconnectTimer` still pending will fire `attemptIceRestart()` on a closed connection

### attemptIceRestart
- Increment-before-guard: effective maximum is `MAX_ICE_RESTART_ATTEMPTS + 1` calls before the guard fires (cap at 3 means attempts 1, 2, 3 run; cap fires on 4th call). Semantically allows exactly `MAX` attempts, but reads confusingly
- `restartIce()` + `createOffer({ iceRestart: true })`: both trigger ICE restart; `restartIce()` is a synchronous hint that is immediately superseded by `createOffer({ iceRestart: true })`; redundant but harmless

### createOffer / handleOffer (signaling glare)
- Both functions have lazy PC creation behind `await getIceServers()`. Concurrent calls during near-simultaneous negotiation can both reach the lazy-create path if `state.peerConnection` is null at check time — second `createPeerConnection` call overwrites the first, orphaning it. No glare detection.
