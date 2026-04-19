# Stage 3 Outputs — arena-feed-realtime.ts

## Agent 01

### subscribeRealtime
**Verdict: PASS**

All material claims from Stage 2 agents verify correctly against the source:

- Early-return guard `!client || isPlaceholder()` is present and correct.
- Channel key is `feed:${debateId}` with `{ config: { private: true } }` — confirmed.
- Three `.on()` handlers are chained before the terminal `.subscribe()` call — confirmed.
- Listener 1 (postgres_changes): event `INSERT`, schema `public`, table `debate_feed_events`, filter `debate_id=eq.${debateId}`, callback invokes `appendFeedEvent(payload.new)` — confirmed.
- Listener 2 (broadcast `heartbeat`): reads `payload?.payload?.role`; if truthy, sets `lastSeen[role] = Date.now()` — confirmed. Agents that wrote `payload.payload.role` without optional chaining are technically imprecise, but since the behavioral outcome (what happens when role is truthy) is correctly stated, this is a minor notational omission rather than a materially wrong claim.
- Listener 3 (broadcast `goodbye`): reads `payload?.payload?.role`; if truthy, calls `handleParticipantGone(role)` — confirmed.
- Post-subscribe: `set_feedRealtimeChannel(channel)` is called first, then `startHeartbeat()` — order confirmed.
- Agent 03's mention of `setParticipantGoneCallback(handleParticipantGone)` is a module-level initialization side effect that occurs outside this function body. It is not a behavioral claim about `subscribeRealtime` itself, so it does not affect the verdict for this function.

### unsubscribeRealtime
**Verdict: PASS**

All material claims verify correctly:

- Client is fetched and both `client` and `feedRealtimeChannel` must be truthy to proceed — confirmed.
- `(client as any).removeChannel(feedRealtimeChannel)` is called, then `set_feedRealtimeChannel(null)` — order confirmed.
- No `stopHeartbeat()` call is present in the function body — confirmed absent.
- No `sendGoodbye()` call is present — confirmed absent.
- The function is safe to call when no channel is active (the conditional guard prevents any action) — confirmed.

Agent 02's inference that `removeChannel` "deregisters all three listeners" is not verifiable from the source alone — it is an accurate description of expected Supabase client behavior, but it is an inference about the library, not a claim about the source text. This is not a wrong claim, merely an extrapolation; it does not warrant a FAIL.

## needs_review

1. **Asymmetry between subscribe and unsubscribe regarding `stopHeartbeat()`:** `subscribeRealtime` calls `startHeartbeat()` as its final step, but `unsubscribeRealtime` does not call `stopHeartbeat()`. The heartbeat interval continues running after the channel is torn down. Whether `stopHeartbeat()` is called elsewhere or the heartbeat module self-terminates on channel removal was not investigated by any agent.

2. **Optional chaining on `payload?.payload?.role`:** The source uses optional chaining in both the heartbeat and goodbye callbacks. No Stage 2 agent explicitly noted that a missing or malformed `payload` object will silently no-op the callback rather than throw. The behavioral difference from non-optional access (which could throw on `undefined.role`) was not called out by any agent.

3. **`(client as any)` cast on channel construction and removeChannel:** Both calls cast the Supabase client to `any`. No agent noted that this bypasses TypeScript type-checking for the channel API, meaning type errors in channel configuration would be silently accepted at compile time and only surface at runtime.

---

## Agent 02

### subscribeRealtime
**Verdict: PASS**

All five Stage 2 agents correctly described the guard condition (`!client || isPlaceholder()`), channel key (`feed:${debateId}` with `{ config: { private: true } }`), all three listeners, and the post-subscribe sequence (`set_feedRealtimeChannel(channel)` then `startHeartbeat()`). The optional chaining on `payload?.payload?.role` in listeners 2 and 3 is a minor notation difference — the runtime behavior is the same, and the distinction (safe no-op vs. potential throw on undefined) is purely defensive. No agent stated it would throw, so no factual error exists.

### unsubscribeRealtime
**Verdict: PASS**

All five agents correctly described the `client && feedRealtimeChannel` guard, `removeChannel(feedRealtimeChannel)`, and `set_feedRealtimeChannel(null)`. All agents also correctly noted the absence of `stopHeartbeat()` and `sendGoodbye()` calls.

## needs_review

1. **`stopHeartbeat()` is never called by `unsubscribeRealtime`** — all agents noted this absence, but none flagged it as a potential bug. `startHeartbeat()` is called on subscribe, but the heartbeat interval is never stopped here. `stopHeartbeat()` and `sendGoodbye()` are imported but not used in this file. Callers must invoke them separately, otherwise the heartbeat keeps firing after the channel is torn down.

2. **`setParticipantGoneCallback(handleParticipantGone)` runs at module evaluation time** (top-level, outside any function). No Stage 2 agent mentioned this. It means the callback is wired the moment the module is first imported, not when `subscribeRealtime` is called. This is a module side-effect that could matter for test isolation.

3. **`lastSeen` mutation is a direct property assignment on an imported object** (`lastSeen[role] = Date.now()`), not a setter call. This works because `lastSeen` is a mutable reference exported from `arena-feed-state.ts`, but it bypasses any setter encapsulation. No agent noted this distinction.

---

## Agent 03

### subscribeRealtime
**Verdict: PASS**

The behavioral description is correct. The function creates a private Supabase channel keyed to `feed:${debateId}`, wires three listeners (postgres INSERT on `debate_feed_events` → `appendFeedEvent`, broadcast heartbeat → `lastSeen[role] = Date.now()`, broadcast goodbye → `handleParticipantGone(role)`), calls `.subscribe()`, then stores the channel via `set_feedRealtimeChannel(channel)` and starts the heartbeat via `startHeartbeat()`. The module-level `setParticipantGoneCallback` side effect is correctly noted. The omission of "optional chaining" language is a description gap but not a behavioral error — all agents correctly imply role is conditionally used (guarded by `if (role)`), which is the runtime-visible behavior. No agent describes the `goodbye` callback incorrectly.

### unsubscribeRealtime
**Verdict: PARTIAL**

The function is correctly described: removes the channel via `client.removeChannel(feedRealtimeChannel)` and nulls the ref via `set_feedRealtimeChannel(null)`. The note that `stopHeartbeat()` and `sendGoodbye()` are not called is accurate and relevant. However, describing these as absent without flagging them as potential behavioral gaps (the heartbeat interval keeps firing after unsubscribe; no goodbye broadcast is sent to remote peers) makes the description incomplete rather than wrong. Rating PARTIAL because the description is accurate about what is present but does not surface the behavioral consequence of the missing teardown calls.

## needs_review

1. **Heartbeat leak on unsubscribe**: `unsubscribeRealtime` does not call `stopHeartbeat()`. The heartbeat interval continues running after the channel is torn down. No Stage 2 agent flagged this as a leak — they noted the absence but did not characterize the consequence.

2. **Optional chaining semantics on `payload?.payload?.role`**: The outer `payload` parameter is typed as `{ payload?: { role?: string } }` — the outer `payload.payload` property is optional. The optional chaining on `payload?.payload?.role` defensively guards against a null/undefined inner payload. The distinction matters: if `payload.payload` is undefined, a non-optional access would throw; the optional chain silently produces undefined and skips the `if (role)` branch.

3. **Ordering of `set_feedRealtimeChannel` before `startHeartbeat`**: The channel ref is stored before the heartbeat starts, meaning `startHeartbeat()` can safely read `feedRealtimeChannel` if needed. No agent commented on this ordering dependency.

4. **`isPlaceholder()` guard**: Both the null client check and the `isPlaceholder()` check are distinct bail-out conditions. No Stage 2 agent described their individual semantics separately.

---

## Agent 04

### subscribeRealtime
**Verdict: PASS**

All Stage 2 aggregate claims verify correctly against the source. The guard condition (`!client || isPlaceholder()`), channel name/config, three-listener sequence, all handler bodies, and post-subscribe calls (`set_feedRealtimeChannel` then `startHeartbeat`) match exactly. The optional chaining on `payload?.payload?.role` is present in source; Stage 2 agents did not explicitly claim it was absent, so no contradiction.

### unsubscribeRealtime
**Verdict: PASS**

Guard (`client && feedRealtimeChannel`), `removeChannel(feedRealtimeChannel)`, and `set_feedRealtimeChannel(null)` all verify. The aggregate observation that `stopHeartbeat()` and `sendGoodbye()` are absent from this function is confirmed by the source.

## needs_review

1. **`setParticipantGoneCallback` runs at module import time, not inside `subscribeRealtime`.** Agent 03 mentioned it but attributed it to `subscribeRealtime`'s behavior — that is a misattribution. The callback registration is a one-time side effect of importing the module, not a per-call setup. If the module is ever re-imported or the callback needs to be re-registered (e.g., in a hot-reload or multi-debate scenario), there is no mechanism inside `subscribeRealtime` to ensure it.

2. **Double-call hazard on `subscribeRealtime`: orphaned channel + doubled heartbeat.** If `subscribeRealtime` is called while a channel already exists, the function creates a new channel and overwrites `feedRealtimeChannel` via `set_feedRealtimeChannel(channel)` without removing the old one. The old channel is silently orphaned. Additionally, `startHeartbeat()` is called unconditionally — if no guard exists inside `startHeartbeat` to prevent double-starts, two heartbeat intervals would run concurrently. No Stage 2 agent flagged the orphaned channel concern explicitly.

3. **`unsubscribeRealtime` never calls `stopHeartbeat()`.** After `unsubscribeRealtime` returns, the heartbeat interval continues firing and will attempt to send on a channel that has been removed. Whether `startHeartbeat`'s broadcast calls silently fail or throw after channel removal is an open question no Stage 2 agent investigated.

---

## Agent 05

### subscribeRealtime
**Verdict: PARTIAL**

The aggregate Stage 2 description is accurate on all documented behaviors: both guards, all three channel subscriptions, correct ordering of `set_feedRealtimeChannel` before `startHeartbeat`, and the correct callbacks.

The shorthand "reads payload.payload.role" is a minor omission — the source uses `payload?.payload?.role` with optional chaining. In the heartbeat case the type annotation confirms `payload?: { role?: string; ts?: number }`, so the outer optional is load-bearing, not defensive fluff. Omitting this is a small but non-trivial imprecision.

More substantively: no agent noted the absence of a double-subscription guard. `subscribeRealtime` does not check whether `feedRealtimeChannel` is already set before creating a new channel. A second call while a channel is active silently orphans the first channel — it remains subscribed but the reference is overwritten, making it unremovable via `unsubscribeRealtime`.

### unsubscribeRealtime
**Verdict: PARTIAL**

Agents correctly note that `unsubscribeRealtime` calls `removeChannel` and nulls `feedRealtimeChannel`, and that it does not call `stopHeartbeat()` or `sendGoodbye()`. However, the consequence of the missing `stopHeartbeat()` call is understated. `removeChannel` tears down the Supabase Realtime subscription but has no effect on the interval timers in `arena-feed-heartbeat.ts`. After `unsubscribeRealtime` returns, the heartbeat timer continues firing and attempting to broadcast on a channel that has been removed. This is an active resource leak and a potential source of broadcast errors post-teardown.

## needs_review

1. **Double-subscription orphan leak in `subscribeRealtime`:** No guard exists against calling `subscribeRealtime` while a channel is already active. A second invocation creates a new Supabase Realtime channel and overwrites `feedRealtimeChannel` via `set_feedRealtimeChannel`, permanently orphaning the prior channel — it stays subscribed and cannot be cleaned up through `unsubscribeRealtime`.

2. **Heartbeat timer survives `removeChannel`:** `unsubscribeRealtime` does not call `stopHeartbeat()`. Because heartbeat intervals live in `arena-feed-heartbeat.ts` and are independent of the Supabase channel object, they continue firing after channel removal. Subsequent heartbeat broadcasts will attempt to publish on a removed channel. The `destroy()` contract (every polling interval must be clearable via a `destroy()` function) is nominally satisfied by `stopHeartbeat` existing, but `unsubscribeRealtime` does not invoke it, making the teardown sequence incomplete unless the caller manually chains both calls.

3. **Optional chaining on `payload?.payload?.role`:** The outer `payload` property is typed as optional, meaning the optional chaining is semantically required. A description that writes "reads payload.payload.role" implies direct property access and could mislead a reviewer into thinking the type guarantees the outer property is always present.
