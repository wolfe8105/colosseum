# Stage 2 Outputs — webrtc.signaling.ts

## Agent 01

### setupSignaling (line 17)

Async function. Guards on `getSupabase()` — returns immediately if null. Calls `sb.realtime.setAuth()` in try/catch; error swallowed silently. Constructs `channelName = 'debate-' + debateId`. Assigns a new Supabase Realtime channel with `private: true` and presence key = `getCurrentUser()?.id || 'anon'` to `state.signalingChannel`.

Registers a broadcast listener for event `'signal'`: extracts `payload['payload']`, guards that it is an object with string `type` and `from`, then calls `void handleSignalingMessage(msg)` — errors silently discarded.

Registers a presence `sync` listener: reads presenceState, counts keys, fires `'presenceUpdate'`. If `count >= 2` AND `state.debateState.status === 'connecting'` AND `state.debateState.role === 'a'`: calls `void createOffer()`.

Calls `.subscribe()` with async callback:
- `SUBSCRIBED`: awaits `state.signalingChannel!.track({ role: state.debateState.role })`; fires `'signalingReady'`; clears existing setupTimer; sets new `state.setupTimer` for `SETUP_TIMEOUT_MS` ms. Timer callback: nulls setupTimer, if status still `'connecting'` — warns, fires `'connectionFailed'` with `{ reason: 'setup-timeout' }`, calls `endDebate()`.
- `CHANNEL_ERROR`: warns, fires `'error'` with `{ message: 'Signaling channel access denied.' }`.
- Other statuses: silently ignored.

Subtle: No cleanup of prior channel on re-call — old channel stays subscribed. `createOffer()` fires on every presence sync while status is `'connecting'` — potential multiple concurrent offers. `void` on `handleSignalingMessage` drops all rejections.

### sendSignal (line 77)

Guards on `state.signalingChannel`; returns if null. Calls `.send()` with broadcast payload `{ type, data, from: state.debateState.role }`. Return value of `.send()` not awaited — delivery failures silently dropped. `from` reflects current role at call time.

### handleSignalingMessage (line 89)

Async, not exported. Guards: `msg.from === state.debateState.role` → return (echo suppression). Switch on `msg.type`:
- `'offer'`: awaits `handleOffer(msg.data as RTCSessionDescriptionInit)`
- `'answer'`: awaits `handleAnswer(...)`
- `'ice-candidate'`: awaits `handleIceCandidate(...)`
- `'round-start'`: if `stepIndex < 0`, calls `beginStep(0)` synchronously
- `'round-end'`: no-op
- `'debate-end'`: calls `endDebate()`
- `'turn-start'`: casts data to `{ stepIndex: number }`, calls `beginStep(d.stepIndex)` if it differs from current
- `'turn-end'`: calls `advanceStep()`
- `'finish-turn'`: calls `advanceStep()`
- Unknown types: silently ignored (no default)

Subtle: `'turn-end'` and `'finish-turn'` both call `advanceStep()` — double-advance if both arrive. All casts unchecked. Function called via `void` so all rejections silently discarded.

---

## Agent 02

### setupSignaling (line 17)

1. `getSupabase()` → null: immediate return.
2. `sb.realtime.setAuth()` in try/catch; swallowed error. Refresh may silently fail, leaving stale JWT.
3. `channelName = 'debate-' + debateId`. Channel created with `private: true`, presence key = `getCurrentUser()?.id || 'anon'`.
4. Broadcast handler: validates payload is an object with string `type` and `from`; dispatches `void handleSignalingMessage()`.
5. Presence sync handler: counts presenceState keys, fires `'presenceUpdate'`, conditionally calls `void createOffer()` if count >= 2, status `'connecting'`, role `'a'`.
6. `.subscribe()` async callback:
   - `SUBSCRIBED`: awaits `track()`, fires `'signalingReady'`, clears and re-arms `state.setupTimer`. Timer fires `'connectionFailed'` + `endDebate()` if still `'connecting'` after SETUP_TIMEOUT_MS.
   - `CHANNEL_ERROR`: warns, fires `'error'`.
   - Other: ignored.

Subtle: `setupSignaling` called a second time overwrites `state.signalingChannel` without unsubscribing old channel. Old timer not cleared until new `SUBSCRIBED` fires. `CHANNEL_ERROR` path does not call `endDebate()` — state left partially initialized. `track()` rejection → unhandled promise rejection in subscribe callback. `'signalingReady'` fires on every reconnect.

### sendSignal (line 77)

Guards on channel. Sends broadcast with `{ type, data, from: state.debateState.role }`. `send()` promise not handled. `signals.sendSignal = sendSignal` assigned at module load — callable from other modules without circular import.

Subtle: If `state.debateState.role` is unset, `from` is undefined/empty, which would cause `handleSignalingMessage`'s self-echo guard to misfire on the receiver.

### handleSignalingMessage (line 89)

Echo guard: `msg.from === state.debateState.role` → return. Switch:
- `offer`/`answer`/`ice-candidate`: awaited calls to peer functions. All casts unchecked.
- `round-start`: `beginStep(0)` if `stepIndex < 0`.
- `round-end`: explicit no-op.
- `debate-end`: `endDebate()`.
- `turn-start`: `beginStep(d.stepIndex)` if different from current.
- `turn-end`/`finish-turn`: both call `advanceStep()`.
- Unknown: no default, silently ignored.

Subtle: `'turn-end'` and `'finish-turn'` duplicate — double advance risk. `'debate-end'` unconditional — duplicate message calls `endDebate()` twice. Concurrent dispatch via `void` — no ordering guarantee between concurrent signaling messages (e.g., offer + ice-candidate arriving simultaneously).

---

## Agent 03

### setupSignaling (line 17)

`getSupabase()` guard. `setAuth()` swallowed. Channel created with `private: true`, presence key = `getCurrentUser()?.id || 'anon'` (evaluated once at setup time — late-authenticated users retain `'anon'`).

Broadcast listener: validates and dispatches `void handleSignalingMessage()`.

Presence sync listener: fires `'presenceUpdate'`; if `count >= 2`, `status === 'connecting'`, `role === 'a'` — calls `void createOffer()`. No guard against repeated calls.

Subscribe callback: `SUBSCRIBED` → awaits `track()`, fires `'signalingReady'`, clears+arms setupTimer. Timer: if still `'connecting'` → `'connectionFailed'` + `endDebate()`. `CHANNEL_ERROR` → warns, fires `'error'`. Other status: ignored.

Subtle: setupTimer only cleared on `SUBSCRIBED`. If old call had reached `SUBSCRIBED` and new call produces `CHANNEL_ERROR`, prior timer continues running. `track()` rejection is an unhandled promise rejection. `'signalingReady'` fires again on reconnect. Two unauthenticated users sharing key `'anon'` → only one presence key → count stays at 1 → `createOffer()` never fires.

### sendSignal (line 77)

Guards on channel. Sends broadcast with `from: state.debateState.role`. No error handling. `signals.sendSignal = sendSignal` at module load.

### handleSignalingMessage (line 89)

Echo guard. Switch dispatch. `'round-start'`: `beginStep(0)` only if `stepIndex < 0` — subsequent messages silently ignored. `'round-end'`: explicit no-op. `'debate-end'`: unconditional `endDebate()`. `'turn-start'`: idempotent check before `beginStep()`. `'turn-end'`/`'finish-turn'`: both call `advanceStep()` — double-advance risk. Unknown type: no default.

---

## Agent 04

### setupSignaling (line 17)

`getSupabase()` guard → return if null. `setAuth()` swallowed. Channel created with `private: true`, presence key = current user id or `'anon'`. Old channel silently leaked on re-call.

Broadcast: validates, dispatches `void handleSignalingMessage()` — errors dropped.

Presence sync: counts presenceState keys, fires `'presenceUpdate'`, conditionally calls `void createOffer()` (role `'a'`, count >= 2, status `'connecting'`).

Subscribe:
- `SUBSCRIBED`: awaits `track()`, fires `'signalingReady'`, clears+rearms `state.setupTimer`. Timer: null setupTimer, then if still `'connecting'` → `'connectionFailed'` + `endDebate()`.
- `CHANNEL_ERROR`: warns, fires `'error'`. Prior timer not cleared.
- Other: ignored.

Subtle: `'anon'` presence key collision for unauthenticated users. Timer not cleared on `CHANNEL_ERROR`. Old channel not unsubscribed on re-call. `createOffer()` called on every qualifying presence sync. `track()` rejection → unhandled.

### sendSignal (line 77)

Guards on channel. Sends broadcast `{ type, data, from: state.debateState.role }`. `send()` not awaited. `signals.sendSignal = sendSignal` at module load.

Subtle: If role is unset at call time, `from` will be undefined/empty.

### handleSignalingMessage (line 89)

Echo guard. Switch:
- `offer`/`answer`/`ice-candidate`: awaited. Unchecked casts.
- `round-start`: `beginStep(0)` if `stepIndex < 0`.
- `round-end`: no-op.
- `debate-end`: `endDebate()`.
- `turn-start`: idempotent `beginStep(d.stepIndex)`.
- `turn-end`/`finish-turn`: both `advanceStep()` — double-advance risk.
- Unknown: ignored.

---

## Agent 05

### setupSignaling (line 17)

`getSupabase()` guard. `setAuth()` swallowed — stale JWT risk on private channel. `channelName = 'debate-' + debateId` — no debateId validation. Channel created with `private: true`, presence key = `getCurrentUser()?.id || 'anon'`. `state.signalingChannel` mutated — re-call leaks old subscription.

Broadcast listener: validates payload, dispatches `void handleSignalingMessage()` — rejections silently dropped.

Presence sync: fires `'presenceUpdate'`, conditionally `void createOffer()` (role `'a'`, count >= 2, status `'connecting'`). Multiple syncs → multiple concurrent offers possible.

Subscribe:
- `SUBSCRIBED`: awaits `state.signalingChannel!.track()` (non-null assertion — if channel was nulled between subscribe and callback, throws unhandled); fires `'signalingReady'`; clears+rearms setupTimer. Timer: nulls handle, if `'connecting'` → `'connectionFailed'` + `endDebate()`.
- `CHANNEL_ERROR`: warns, fires `'error'`. No cleanup, no endDebate. State partially initialized.
- Other: ignored.

Subtle: No debateId guard → channel name could be `'debate-undefined'`. Timer started on `SUBSCRIBED` but `SUBSCRIBED` fires on reconnect — `'signalingReady'` fires again. `CHANNEL_ERROR` does not clean up; state.signalingChannel left pointing to failed channel. Non-null assertion on `state.signalingChannel!` in subscribe callback — race if teardown nulls it first.

### sendSignal (line 77)

Guards on channel. Sends broadcast `{ type, data, from: state.debateState.role }`. `send()` return ignored. No error handling, no queuing. `signals.sendSignal = sendSignal` at module load.

### handleSignalingMessage (line 89)

Echo guard: `msg.from === state.debateState.role` → return.

Switch:
- `offer`/`answer`/`ice-candidate`: awaited; unchecked casts.
- `round-start`: `beginStep(0)` if `stepIndex < 0`.
- `round-end`: no-op.
- `debate-end`: unconditional `endDebate()`.
- `turn-start`: `d = msg.data as { stepIndex: number }` (unchecked). If `d.stepIndex !== current`, calls `beginStep(d.stepIndex)`. **If `msg.data` lacks `stepIndex`, `d.stepIndex` is `undefined`. `undefined !== anyNumber` is `true`, so `beginStep(undefined)` would be called with an invalid argument.**
- `turn-end`/`finish-turn`: both `advanceStep()` — double-advance risk.
- Unknown: no default.

Called via `void` — all rejections silently discarded.
