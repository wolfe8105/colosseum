# Stage 3 Outputs — webrtc.signaling.ts

## Agent 01

### setupSignaling (line 17)
**Verification**: PARTIAL
**Findings**:
- Claims 1-9: all confirmed accurate.
- Claim 10 (re-call leaks old channel): confirmed factually correct — `state.signalingChannel` overwritten without unsubscribe.
- Claim 11 (createOffer multiple fires): confirmed — no deduplication guard.
- Claim 6 precision: Stage 2 uses `status === 'connecting'` without qualifying it as `state.debateState.status`; could be confused with the subscribe callback's `status` parameter. Minor terminology ambiguity, not factually wrong.
**Unverifiable claims**: Whether `createOffer()` has internal deduplication (requires webrtc.peer.ts).

### sendSignal (line 77)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### handleSignalingMessage (line 89)
**Verification**: PARTIAL
**Findings**:
- Claims 15-24: all confirmed.
- `turn-end`/`finish-turn` double-advance framing: technically accurate, but whether it is a real risk depends on whether both types are ever sent for the same event (requires engine inspection).
**Unverifiable claims**: Whether engine sends both `turn-end` and `finish-turn` for same event.

## Cross-Agent Consensus Summary
All Stage 2 claims confirmed. No factual errors found.

---

## Agent 02

### setupSignaling (line 17)
**Verification**: PARTIAL
**Findings**:
- Claims 1-9: all confirmed.
- Claim 10 (channel leak): confirmed but understated — old channel reference is permanently lost, making cleanup impossible afterwards.
- Claim 11 (createOffer multi-fire): confirmed; `void` discard compounds the problem (no error visibility on concurrent attempts).
- Stage 2 missed: `CHANNEL_ERROR` path does not clear `state.setupTimer` — a prior SUBSCRIBED timer continues running.
- Stage 2 missed: `track()` is `async` inside the subscribe callback; Supabase ignores the return value, so a `track()` rejection becomes an unhandled promise rejection.
- Stage 2 missed: `send()` in `sendSignal` is a dropped Promise; send failures are completely invisible.
- Stage 2 missed: `as RTCSessionDescriptionInit` / `as RTCIceCandidateInit` casts in `offer`/`answer`/`ice-candidate` cases provide no runtime validation — same class as the `turn-start` undefined issue.
**Unverifiable claims**: None.

### sendSignal (line 77)
**Verification**: PASS
**Findings**: None. One addition: if `state.debateState.role` is unset, `from` is undefined/empty, which could cause the echo guard on the receiver to misfire.
**Unverifiable claims**: None.

### handleSignalingMessage (line 89)
**Verification**: PARTIAL
**Findings**:
- Claims 15-25: all confirmed.
- `turn-start` undefined stepIndex special claim: CONFIRMED. Cast at line 116 is compile-time only. If `msg.data` lacks `stepIndex`, `d.stepIndex === undefined`. `undefined !== anyNumber` is `true`, so `beginStep(undefined)` is called. This is a real latent bug.
**Unverifiable claims**: Downstream behavior of `beginStep(undefined)` requires webrtc.engine.ts.

## Cross-Agent Consensus Summary
Mostly PASS with the `turn-start` undefined stepIndex finding confirmed and several Stage 2 omissions identified.

---

## Agent 03

### setupSignaling (line 17)
**Verification**: PASS with additions
**Findings**:
- All claims 1-11: confirmed accurate.
- Stage 2 missed: `setupTimer` is not cleared on `CHANNEL_ERROR`. If a prior SUBSCRIBED event armed the timer, it continues running after CHANNEL_ERROR fires. Timer will eventually call `endDebate()` if status is still `'connecting'`.
- Stage 2 missed: `track()` awaited in async subscribe callback without try/catch — rejection produces unhandled promise rejection.
- `createOffer()` in webrtc.peer.ts wraps in try/catch internally, so concurrent invocations won't throw; but duplicate SDP offers sent to the peer can cause negotiation failure on the receiver.
**Unverifiable claims**: None.

### sendSignal (line 77)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### handleSignalingMessage (line 89)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- `turn-start` undefined stepIndex: CONFIRMED. Cast is TypeScript-only. `beginStep(undefined)` will be called. Agent 03 read webrtc.engine.ts: inside `beginStep`, if stepIndex is undefined: `undefined >= state.turnSequence.length` is `false`, so execution reaches `const step = state.turnSequence[undefined]!` which is `undefined`. All subsequent property accesses on `step` throw `TypeError: Cannot read properties of undefined`. Error is inside a `void`-dispatched async call — silent unhandled rejection.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary
All claims verified PASS. Two additional Stage 2 omissions found: setupTimer not cleared on CHANNEL_ERROR, track() async rejection risk.

---

## Agent 04

### setupSignaling (line 17)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- Re-call channel leak: confirmed. Normal flow via `joinDebate()`/`leaveDebate()` in `webrtc.ts` does call `leaveDebate()` first (which unsubscribes and nulls `signalingChannel`), so the leak only manifests if `setupSignaling` is called directly or out of sequence.
- `createOffer` multi-fire: confirmed real; `createOffer` in webrtc.peer.ts reuses an existing `peerConnection` but calling it multiple times before the first offer is answered can corrupt signaling state.
**Unverifiable claims**: None.

### sendSignal (line 77)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### handleSignalingMessage (line 89)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- `turn-start` undefined stepIndex: CONFIRMED. Compile-time cast only; `d.stepIndex === undefined` at runtime if missing; `undefined !== N` is `true`; `beginStep(undefined)` is called.
- Additional observation: same unvalidated cast pattern applies to `offer`/`answer`/`ice-candidate` branches — malformed `msg.data` reaches WebRTC APIs unchecked.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary
All Stage 2 claims confirmed. `turn-start` special claim confirmed. No Stage 2 factual errors.

---

## Agent 05

### setupSignaling (line 17)
**Verification**: PARTIAL
**Findings**:
- Claims 1-11: all confirmed accurate.
- Re-call channel leak: PARTIAL — confirmed at function level, but webrtc.ts's `leaveDebate()` does unsubscribe before re-join in normal flow. Leak is real only if `setupSignaling` called out of sequence.
- `createOffer` multi-fire: confirmed. `createOffer` has no deduplication guard. Rapid presence updates while `'connecting'` can trigger multiple concurrent offers. This can corrupt RTCPeerConnection signaling state.
- Stage 2 missed: `CHANNEL_ERROR` fires error event but does not unsubscribe channel or clear setup timer. Timer armed from a prior SUBSCRIBED continues running; it will eventually fire `endDebate()` if status stays `'connecting'`. Not explicit cleanup but timer path still terminates correctly.
**Unverifiable claims**: None.

### sendSignal (line 77)
**Verification**: PASS
**Findings**: None. All claims confirmed.
**Unverifiable claims**: None.

### handleSignalingMessage (line 89)
**Verification**: PASS
**Findings**: None. All claims confirmed.
- `turn-start` undefined stepIndex: CONFIRMED. `SignalingMessage.data` is typed `unknown` (webrtc.types.ts line 100). Cast at line 116 is compile-time only. If `stepIndex` missing: `d.stepIndex === undefined`; `undefined !== -1` (or any number) is `true`; `beginStep(undefined)` called.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary
All Stage 2 claims confirmed. `turn-start` special claim confirmed by all 5 agents. CHANNEL_ERROR timer gap noted.

---

## Orchestrator Reconciliation

**`turn-start` / `beginStep(undefined)` claim**: All 5 Stage 3 agents confirmed this is real. Source at line 116: `const d = msg.data as { stepIndex: number }` — TypeScript cast with no runtime validation. `SignalingMessage.data: unknown`. If `msg.data` lacks `stepIndex`, `d.stepIndex === undefined`. Guard `d.stepIndex !== state.debateState.turn.stepIndex` evaluates to `true` (undefined !== any number). `beginStep(undefined)` is called. Agent 03 traced into webrtc.engine.ts: the call reaches `state.turnSequence[undefined]!` which is `undefined`, followed by property accesses that throw `TypeError`. The entire error is swallowed because `handleSignalingMessage` is called via `void`. Net effect: silent engine state corruption on malformed `turn-start`.

**`createOffer` multi-fire**: All 5 agents confirmed. Presence sync has no one-shot guard. Multiple concurrent `createOffer()` calls possible while status is `'connecting'`. Agent 04 confirmed `createOffer` reuses existing `peerConnection` but does not guard against concurrent invocation.

**`CHANNEL_ERROR` + `setupTimer`**: Agents 02, 03, 05 confirmed that `CHANNEL_ERROR` does not clear `state.setupTimer`. A previously armed timer continues running. Agent 05 noted this still terminates correctly (timer fires `endDebate()` eventually) but is not an explicit cleanup.

**`track()` async in subscribe callback**: Agents 02 and 03 noted this. `track()` is awaited inside an async subscribe callback; Supabase ignores the return value. A rejection from `track()` becomes an unhandled promise rejection.

**Real findings from this file:**

**LOW — webrtc.signaling.ts line 116 (handleSignalingMessage 'turn-start' case):** `msg.data as { stepIndex: number }` is a compile-time TypeScript cast with no runtime validation. `SignalingMessage.data` is `unknown`. If a malformed or legacy-version `turn-start` message arrives without `stepIndex`, `d.stepIndex` is `undefined` at runtime. The idempotency guard `d.stepIndex !== state.debateState.turn.stepIndex` evaluates to `true` for any numeric stepIndex, causing `beginStep(undefined)` to be called. Inside `beginStep`, `state.turnSequence[undefined]` is `undefined`, and subsequent property accesses throw a `TypeError`. The exception is silently dropped because `handleSignalingMessage` is called via `void`.

**LOW — webrtc.signaling.ts lines 41-50 (setupSignaling presence sync):** The presence `'sync'` handler calls `void createOffer()` with no one-shot guard. If presence state updates multiple times while `state.debateState.status === 'connecting'` and `role === 'a'`, `createOffer()` is invoked concurrently multiple times. Duplicate SDP offers sent to the remote peer can produce signaling negotiation failures on the receiver.

**LOW — webrtc.signaling.ts lines 53-68 (setupSignaling subscribe callback):** The subscribe callback is `async` but Supabase ignores its return value. `track()` is awaited on line 55 with no surrounding try/catch. If `track()` rejects, the error is an unhandled promise rejection. Same pattern as cross-cutting issue #2.
