# Stage 3 Verification — src/webrtc.peer.ts

Anchors audited: 6 | Agents: 5 | Consensus threshold: 2+ agents

---

## Anchor Results

**createPeerConnection** — 3 findings

**attemptIceRestart** — 3 findings

**createOffer** — 1 finding (solo)

**handleOffer** — 1 finding (solo)

**handleAnswer** — PASS (all 5 agents)
- Null guard present. `setRemoteDescription` inside try/catch. No security concerns.

**handleIceCandidate** — 1 finding (log prefix, low)

---

## Findings

### F-1 — MEDIUM — createPeerConnection — B5 — Stale PC overwrite: orphaned event handlers
**Consensus: 4+ agents (across Stages 2 and 3)**

`state.peerConnection = new RTCPeerConnection({ iceServers })` overwrites the existing peer connection without calling `.close()` first. The old PC's `ontrack`, `onicecandidate`, and `onconnectionstatechange` handlers remain bound and will continue firing. Critically, the old `onconnectionstatechange` handler closes over `state` (module singleton) — when it fires against the orphaned connection, it reads `state.peerConnection!.connectionState` which now reads the **new** connection's state, not the orphaned one. This can trigger spurious `fire()` events and spurious `attemptIceRestart()` calls against the wrong context.

**Fix:** Before line 16, null out all handlers and call `.close()` on any existing `state.peerConnection`.

### F-2 — MEDIUM — createPeerConnection (onconnectionstatechange) — B5 — Double attemptIceRestart via timer race
**Consensus: 3 agents**

Scenario: `'disconnected'` fires → 3s `setTimeout` set. The 3s timer fires → reads `connectionState`, sees `'failed'` (state progressed during the window) → calls `void attemptIceRestart()`. Shortly after, the `'failed'` event fires in `onconnectionstatechange` → `disconnectTimer` is now null (already fired and self-nulled) → calls `void attemptIceRestart()` again.

Two concurrent `attemptIceRestart()` calls: `state.iceRestartAttempts` increments twice before either completes; two concurrent `createOffer({ iceRestart: true })` calls may be sent.

**Fix:** Add an in-flight boolean guard (`state.iceRestartInProgress`) before calling `attemptIceRestart()` in both paths.

### F-3 — MEDIUM — handleIceCandidate — B5 — No ICE candidate queue
**Consensus: 3 agents (Stage 2), confirmed by Stage 3 agents**

`handleIceCandidate` calls `addIceCandidate` immediately without checking whether `setRemoteDescription` has completed. In trickle ICE, candidates from the remote peer arrive over signaling immediately after the offer/answer exchange begins — often before `setRemoteDescription` and `createAnswer` have awaited. Browsers throw `InvalidStateError` from `addIceCandidate` in this case; the error is caught and swallowed, permanently discarding valid ICE candidates. Loss of enough candidates can prevent the connection from establishing.

**Fix:** Add a candidate queue in state (`state.iceCandidateQueue: RTCIceCandidateInit[]`); enqueue when `remoteDescription` is not yet set; drain after `setRemoteDescription` completes in `handleOffer`/`handleAnswer`.

### F-4 — LOW — attemptIceRestart — B6 — Role 'b' burns retry budget without restarting
**Consensus: 2 agents (Stage 2), 1 agent (Stage 3)**

`state.iceRestartAttempts` is incremented unconditionally at the top of `attemptIceRestart()`, before the role guard. Role `'b'` (answerer) always exits after the increment and log — it never calls `restartIce()` or `createOffer()`. Over 3+ failure cycles without a `'connected'` event to reset the counter, role `'b'` exhausts `MAX_ICE_RESTART_ATTEMPTS` and fires `'connectionFailed'` without having initiated a single restart. Role `'b'` then has no recovery path.

### F-5 — LOW — attemptIceRestart — B2 — Off-by-one in attempt cap
**Consensus: 2 agents**

`state.iceRestartAttempts++` runs before `if (state.iceRestartAttempts > MAX_ICE_RESTART_ATTEMPTS)`. With `MAX = 3`, the restart body executes on counts 1, 2, 3, and the bail fires on count 4 (when the counter is already 4). The `connectionFailed` event payload always reports `{ attempts: MAX_ICE_RESTART_ATTEMPTS }` (the constant 3), not the actual count. Should be `>=` to bail at exactly `MAX` and report the actual count in the event.

### F-6 — LOW — createPeerConnection (onconnectionstatechange) — B6 — 'closed' state not handled
**Consensus: 2 agents (Stage 2), 1 agent (Stage 3)**

`onconnectionstatechange` handles `'connected'`, `'disconnected'`, `'failed'` — all other states are silently ignored. When `peerConnection.close()` is called deliberately (e.g., by `leaveDebate()`), `connectionState` becomes `'closed'` and the handler fires. Neither `disconnectTimer` nor `setupTimer` are cleared in this path. Any pending `disconnectTimer` will fire 3s later, find `connectionState === 'closed'` (not matching `'disconnected'||'failed'`), and silently do nothing — but in the gap before that check the timer slot is occupied. If `leaveDebate()` doesn't explicitly clear the timer (relying on this handler to do it), the timer leaks.

### F-7 — LOW — module imports — C4 — SETUP_TIMEOUT_MS dead import
**Consensus: All 5 agents**

`SETUP_TIMEOUT_MS` is imported from `./webrtc.state.ts` (line 8) but is never referenced in any function body in this file. The setup timer is **cleared** here (in the `'connected'` branch) but started in `webrtc.engine.ts` or similar. The import should be removed.

### F-8 — LOW — handleIceCandidate — (info) — Missing [WebRTC] log prefix
**Consensus: Multiple agents**

`console.warn('ICE candidate error:', err)` — all other `console.warn` calls in this file use the `[WebRTC]` prefix. This inconsistency breaks log filtering and grep patterns. Minor but worth fixing.

---

## Summary Table

| ID | Severity | Anchor | Line | Checklist | Description |
|----|----------|--------|------|-----------|-------------|
| F-1 | MEDIUM | `createPeerConnection` | 16 | B5 | Overwrites `state.peerConnection` without `.close()` — orphaned handlers remain live and fire against shared state |
| F-2 | MEDIUM | `onconnectionstatechange` | 50–60 | B5 | 3s timer callback + `'failed'` branch can both call `attemptIceRestart()` when timer fires before `'failed'` event arrives |
| F-3 | MEDIUM | `handleIceCandidate` | 133–135 | B5 | No ICE candidate queue — `addIceCandidate` called before `setRemoteDescription` completes; candidates silently discarded |
| F-4 | LOW | `attemptIceRestart` | 68–74 | B6 | Role `'b'` increments `iceRestartAttempts` and can exhaust budget and fire `connectionFailed` without performing any restart |
| F-5 | LOW | `attemptIceRestart` | 70 | B2 | `> MAX_ICE_RESTART_ATTEMPTS` allows one extra attempt; `connectionFailed` event reports constant not actual count |
| F-6 | LOW | `onconnectionstatechange` | 35–61 | B6 | `'closed'` connectionState not handled — pending `disconnectTimer`/`setupTimer` may leak on deliberate close |
| F-7 | LOW | module imports | 8 | C4 | `SETUP_TIMEOUT_MS` imported but never referenced in this file |
| F-8 | LOW | `handleIceCandidate` | 137 | — | `console.warn` missing `[WebRTC]` prefix — breaks log filtering |

**Totals: 0 High · 3 Medium · 5 Low**

All security checklist items (A1–A5) pass for all anchors. No DOM manipulation, no user data rendering, no Supabase writes from client.
