# Stage 3 Outputs — arena-feed-heartbeat.ts

## Agent 01

### setParticipantGoneCallback — PASS

### startHeartbeat — PASS

### stopHeartbeat — PASS

### sendGoodbye — PASS

### checkStaleness — PASS

## needs_review
- `checkStaleness` only checks the opponent's staleness when `!debate.modView`, and only checks the mod's staleness when `!debate.modView`. This means a human moderator can never trigger the stale-opponent detection (they are excluded from both branches). If a moderator's view should also react to a debater going offline, the current logic silently skips it. This may be intentional (mod is an observer who doesn't drive disconnect handling) but is worth confirming.
- The staleness check for the mod (`lastSeen['mod']`) requires `modTs` to be truthy before applying the threshold. Because `lastSeen['mod']` is only seeded in `startHeartbeat` when `debate.moderatorId` is set and `debate.moderatorType === 'human'`, a race condition exists: if the first heartbeat check fires before any `heartbeat` broadcast from the mod arrives AND `lastSeen['mod']` was somehow not seeded (e.g., `debate.moderatorId` appeared after `startHeartbeat` ran), the mod's staleness would never be detected. In practice the seed happens at `startHeartbeat` time, so this is likely safe, but the assumption ties correctness to the debate object being fully populated before `startHeartbeat` is called.
- `stopHeartbeat` unconditionally deletes `lastSeen['a']`, `lastSeen['b']`, and `lastSeen['mod']` even when called as the internal "clean slate" step at the top of `startHeartbeat`. The `lastSeen` entries are re-seeded immediately afterward only for non-spectator views, so for spectator views the keys are deleted and never re-seeded — this appears intentional but silently diverges from the non-spectator path.

---

## Agent 02

### setParticipantGoneCallback — PASS

### startHeartbeat — PASS

### stopHeartbeat — PASS

### sendGoodbye — PASS

### checkStaleness — PARTIAL
The description states the moderator staleness check is in "the same non-mod branch" as the opponent check, implying a single combined block. The source uses two separate `if (!debate.modView ...)` guards — the second one additionally requires `debate.moderatorId && debate.moderatorType === 'human'`. The description correctly captures all the logical conditions, but the phrasing "in the same non-mod branch" is slightly misleading: the moderator check is a second independent `if` block at the same level, not nested inside the first. The behavioral outcome is identical (both are skipped when `debate.modView` is true), so this is a minor structural inaccuracy rather than a substantive error.

## needs_review
- `startHeartbeat` seeds `lastSeen` for all roles unconditionally before any real heartbeat has been received. If `startHeartbeat` is called but the opponent never sends a beat (e.g., they never connected), `lastSeen[opponentRole]` will be a valid timestamp and the staleness check will not fire until `HEARTBEAT_STALE_MS` after the local user joined — there is no mechanism to distinguish "opponent was here and went silent" from "opponent never arrived." Depending on `HEARTBEAT_STALE_MS` relative to typical join latency, this could delay or suppress a legitimate disconnect detection for a participant who never connected.
- `sendGoodbye` resolves the role using the same ternary as `startHeartbeat` (`modView → 'mod'`, `spectatorView → 'spec'`, else `debate.role`), but `feedRealtimeChannel` is checked for truthiness while `currentDebate` is only checked for truthiness — no placeholder guard is applied (unlike `startHeartbeat`). A placeholder debate could theoretically reach `sendGoodbye` and broadcast a goodbye event.
- `stopHeartbeat` unconditionally deletes `lastSeen['mod']` regardless of whether the debate has a human moderator. This is harmless (deleting a non-existent key is a no-op in JS), but it is asymmetric with the conditional seeding in `startHeartbeat`.

---

## Agent 03

### setParticipantGoneCallback — PASS

### startHeartbeat — PASS

### stopHeartbeat — PASS

### sendGoodbye — PASS

### checkStaleness — PASS

## needs_review
- `checkStaleness` only fires `_onParticipantGone` when `lastSeen[role]` is truthy (i.e., the timestamp exists). If a participant's entry was never seeded — for example because `startHeartbeat` ran in spectator mode and the check timer was therefore never started, or because `stopHeartbeat` deleted the entries mid-session — the staleness check silently passes with no event fired. This is likely intentional but could mask a disappearance if the seeding logic and the check-timer guard ever diverge.
- The staleness check for the human moderator is guarded by `!debate.modView` in addition to `debate.moderatorId && debate.moderatorType === 'human'`. A moderator viewing their own mod panel therefore never checks whether other moderators are stale, which is probably correct, but the double-negative (`!debate.modView` appearing twice — once for the opponent check and once for the mod check) means neither staleness path runs from a mod's perspective. Worth confirming this is the intended behavior.
- `sendGoodbye` and `startHeartbeat` both use `(feedRealtimeChannel as any).send(...)`. The `as any` cast bypasses TypeScript's type checking on the Supabase realtime channel's `send` method. If the channel API changes, TypeScript will not catch it at compile time.
- `checkStaleness` is not exported, so it can only be invoked via the interval set up in `startHeartbeat`. There is no way to trigger a manual staleness check from outside the module, which could be a limitation if on-demand verification is ever needed.

---

## Agent 04

### setParticipantGoneCallback — PASS

### startHeartbeat — PASS

### stopHeartbeat — PASS

### sendGoodbye — PASS

### checkStaleness — PASS

## needs_review

- The `checkStaleness` function only checks opponent and moderator staleness when `!debate.modView`. This means if the local participant IS the moderator (modView === true), no staleness checking occurs for either debater — the mod view is completely blind to silent debaters. This asymmetry is not documented and may be intentional (mods are observers), but warrants confirmation.
- The `_onParticipantGone` callback does not set `disconnectHandled` itself; the description notes "subsequent calls are blocked by `disconnectHandled` once the caller sets it in response to the first event." This creates a window between when `_onParticipantGone` fires and when the caller sets `disconnectHandled`, during which a second 5-second tick could fire another gone-event if the check interval fires again before the caller responds. Whether the 5-second interval makes this a realistic race condition depends on how quickly the callback sets `disconnectHandled`.
- `startHeartbeat` seeds `lastSeen['a']` and `lastSeen['b']` regardless of whether the local participant is debater `'a'` or `'b'`. This means a debater starts with a valid timestamp for themselves in `lastSeen`, which prevents `checkStaleness` from ever flagging the local participant as stale (which is correct), but also means the opponent starts with a seeded timestamp equal to `now` — giving the opponent a full `HEARTBEAT_STALE_MS` grace period before their first actual heartbeat is required. If `HEARTBEAT_STALE_MS` is small relative to connection setup time, there is no issue, but if a peer never connects at all, staleness detection is delayed by the full `HEARTBEAT_STALE_MS` window from session start regardless of how long the peer takes to first appear.
- `sendBeat` is a no-op if `feedRealtimeChannel` is falsy (silently skips), including the initial immediate call. There is no warning, retry, or error surface for this case.

---

## Agent 05

### setParticipantGoneCallback — PASS

### startHeartbeat — PASS

### stopHeartbeat — PASS

### sendGoodbye — PASS

### checkStaleness — PASS

## needs_review

- `checkStaleness` only fires `_onParticipantGone` if the `lastSeen` entry exists (`opponentTs &&` / `modTs &&`). If the opponent never sent a heartbeat at all, the entry will be `undefined` after initialization (initialization sets `'a'`, `'b'`, and optionally `'mod'` to `Date.now()`, so in practice this guards against the `'mod'` key being absent when no human moderator is present). The behavior is correct but the guard means a participant who never appeared will never trigger the gone callback — this may be intentional but is worth confirming.
- `checkStaleness` checks the opponent stale condition first and returns immediately if triggered, meaning a simultaneously stale moderator will not be reported in the same invocation. If the opponent reconnects on the next tick the moderator staleness will be caught, but if both go stale at the same time only the opponent event fires first. This ordering is implicit and undocumented.
- `sendGoodbye` does not check `phase` or `disconnectHandled` before sending, unlike `checkStaleness`. A goodbye could theoretically be sent after the debate has finished or after disconnect has already been handled. This appears intentional (fire-and-forget exit signal) but is a behavioral asymmetry worth noting.
- There is no guard in `startHeartbeat` against `feedRealtimeChannel` being `null` at the time the send timer interval fires (only `sendBeat` checks it inline). This is correct defensive coding but means heartbeat ticks silently no-op if the channel drops between `startHeartbeat` and the next interval — no retry or error path exists.
