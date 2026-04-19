# Stage 2 Outputs — rivals-presence.ts

## Agent 01

### init

`init` is an exported async function taking no parameters and returning `Promise<void>`. Four sequential guards sit at the top: (1) `FEATURES.rivals` feature flag — falsy → immediate return; (2) `getIsPlaceholderMode()` — placeholder/demo mode → immediate return; (3) `getCurrentUser()` — no authenticated user → immediate return; (4) module-level `initialized` boolean — already `true` → immediate return (idempotency guard). Once all guards pass, `initialized` is set to `true` synchronously before any `await`, acting as a lightweight re-entrancy lock against concurrent calls.

`init` then awaits `buildRivalSet(rivalSet)`, imported from `rivals-presence-channel.ts`, passing the module-level `rivalSet` Set by reference. `buildRivalSet` populates the Set in place with accepted rivals' UUIDs; it internally catches its own errors (via `console.warn`) so it always resolves. Return value is void and discarded. There is no try/catch around this `await` in `init` itself.

After `buildRivalSet` resolves, a local `channelState` object of type `ChannelState` is assembled containing: `rivalSet`, `onlineRivals`, `channelRef` (the mutable `{ value: null }` wrapper), and an inline `onAlert` arrow function closing over `popupState` that calls `queueAlert(p, popupState)` from `rivals-presence-popup.ts`. `init` then awaits `startPresence(channelState)`, imported from `rivals-presence-channel.ts`. `startPresence` subscribes to the Supabase Realtime presence channel, stores the channel handle in `channelRef.value`, registers join/leave handlers, and calls `.subscribe()` — which on `'SUBSCRIBED'` dynamically imports `auth.ts`, fetches the current profile, and calls `channel.track()`. Errors inside the subscribe callback are caught internally. `startPresence` itself does not throw.

No try/catch wraps either `await` in `init`. If either call were to reject (unlikely in practice since both swallow their own errors), `initialized` would be stuck at `true` and the module permanently inert for the session without recovery. Side effects: populates `rivalSet`, sets `channelRef.value` to the live channel, arms the `onAlert` callback. No timers, no DOM mutations.

### destroy

`destroy` is an exported synchronous function taking no parameters and returning `void`. No early-return guards — all cleanup steps execute unconditionally.

First, `getSupabaseClient()` is called and stored locally as `supabase`. If both `supabase` is truthy and `channelRef.value` is non-null, `supabase.removeChannel(channelRef.value)` is called synchronously to unsubscribe and remove the presence channel. Immediately after, `channelRef.value` is set to `null`. If either condition fails, the channel removal is skipped. There is no try/catch around `removeChannel`.

After the channel block, state is unconditionally reset: `rivalSet.clear()`, `onlineRivals.clear()`, `popupState.queue.length = 0` (truncates the array in-place), `popupState.active = false`, `initialized = false`. Finally, `document.getElementById('rival-alert-popup')` is called; if the element exists it is removed via `.remove()`.

Gap: `destroy` does NOT call `rivals-presence-popup.destroy()`. The popup sub-module owns three timer handles (`_dismissTimer`, `_showNextTimer`, `_autoTimer`) that remain armed. If the 8-second `_autoTimer` fires after `destroy`, it calls `dismissPopup(state)`, finds the popup element already removed, and returns early without resetting `state.active` — because `popupState` is a shared object reference, a subsequently-restarted session's popup could be suppressed. The 300ms and 600ms timers are benign (they operate on the now-empty queue) but waste cycles.

## Agent 02

### init

Exported async function, no parameters, returns `Promise<void>`. Four sequential guards: `FEATURES.rivals`, `getIsPlaceholderMode()`, `getCurrentUser()`, `initialized`. Once all pass, sets `initialized = true` before any `await`. Awaits `buildRivalSet(rivalSet)` — populates `rivalSet` in place, no return value captured. Assembles `channelState` with `rivalSet`, `onlineRivals`, `channelRef`, and an `onAlert` arrow closing over `popupState` that calls `queueAlert`. Awaits `startPresence(channelState)` — sets up the Supabase Realtime presence channel, stores handle in `channelRef.value`.

No try/catch around either `await`. If `buildRivalSet` rejects: `initialized` stuck `true`, module permanently broken for session. If `startPresence` rejects: same, plus channel reference may be leaked. In practice both callees handle their own internal errors. No timers set, no DOM mutation.

### destroy

Exported synchronous function, no parameters, `void`. No early-return guards. Calls `getSupabaseClient()`; if client is truthy and `channelRef.value` is non-null, calls `removeChannel(channelRef.value)` then sets `channelRef.value = null`. Unconditional state resets: `rivalSet.clear()`, `onlineRivals.clear()`, `popupState.queue.length = 0`, `popupState.active = false`, `initialized = false`. DOM cleanup: `getElementById('rival-alert-popup')?.remove()`. No try/catch. Does not call popup sub-module's `destroy()` — leaves internal popup timers armed.

## Agent 03

### init

Exported async, no parameters, `Promise<void>`. Sequential guards: FEATURES flag, placeholder mode, no-user, already-initialized. Sets `initialized = true` synchronously before first `await`. `await buildRivalSet(rivalSet)` — populates rival Set, internally resilient to failures. Assembles `ChannelState` with module state references and `onAlert` callback. `await startPresence(channelState)` — subscribes to `'global-online'` Realtime channel. No try/catch in `init`. Failure in either await leaves `initialized = true`, blocking future init without a `destroy()` call.

### destroy

Exported synchronous, no parameters, `void`. Compound guard `(supabase && channelRef.value)` → `removeChannel`. Then unconditional: `rivalSet.clear()`, `onlineRivals.clear()`, `popupState.queue.length = 0`, `popupState.active = false`, `initialized = false`. DOM: removes `#rival-alert-popup` if present. Does not cancel popup sub-module timers.

## Agent 04

### init

Exported async, no params, `Promise<void>`. Four guards exit early: `FEATURES.rivals`, `getIsPlaceholderMode()`, `getCurrentUser()`, `initialized`. Sets `initialized = true` before first `await`. Awaits `buildRivalSet(rivalSet)` (populates Set, catches internally). Builds `channelState = { rivalSet, onlineRivals, channelRef, onAlert: (p) => queueAlert(p, popupState) }`. Awaits `startPresence(channelState)` (subscribes channel, stores handle in `channelRef.value` via the wrapper reference). Both awaits unguarded by try/catch. `startPresence`'s subscribe callback errors are handled internally by `startPresence`. If `startPresence` throws (unlikely), `initialized` is `true` but channel is never established — permanent suppression for session.

### destroy

Exported sync, no params, `void`. `if (supabase && channelRef.value)` → `removeChannel(channelRef.value)`, then `channelRef.value = null`. Unconditionally: `rivalSet.clear()`, `onlineRivals.clear()`, `popupState.queue.length = 0`, `popupState.active = false`, `initialized = false`. DOM: `document.getElementById('rival-alert-popup')?.remove()`. No try/catch. Does not call `rivals-presence-popup.destroy()` — popup sub-module's `_dismissTimer`, `_showNextTimer`, `_autoTimer` remain active. The `_autoTimer` (8s) is most dangerous: on firing it calls `dismissPopup(state)` which finds the DOM element gone and returns early without resetting `state.active = false` — documented as LM-RIVALS-004.

## Agent 05

### init

Exported async, no params, `Promise<void>`. Four sequential guards: `FEATURES.rivals` flag, `getIsPlaceholderMode()`, `getCurrentUser()`, `initialized` boolean. Sets `initialized = true` synchronously before any await — acts as re-entrancy lock. `await buildRivalSet(rivalSet)` (no capture; `buildRivalSet` is self-catching). Assembles `channelState` with references to all four module-level state objects (`rivalSet`, `onlineRivals`, `channelRef`) and an inline `onAlert` arrow closing over `popupState`. `await startPresence(channelState)` — subscribes Realtime channel, stores handle, registers join/leave handlers. No try/catch around either await. Failure path: `initialized = true` stuck, module permanently inert without external `destroy()` call. Side effects: rival Set populated, Realtime subscription established. No timers, no DOM mutations.

### destroy

Exported sync, no params, `void`. `getSupabaseClient()` → local `supabase`. `if (supabase && channelRef.value)` → `supabase.removeChannel(channelRef.value)` (note: `removeChannel` returns a Promise that is **not awaited** — teardown success is unconfirmed and any rejection is silently swallowed). Then `channelRef.value = null`. Unconditional: `rivalSet.clear()`, `onlineRivals.clear()`, `popupState.queue.length = 0`, `popupState.active = false`, `initialized = false`. DOM: `getElementById('rival-alert-popup')?.remove()`. No try/catch. Does not cancel popup sub-module timers. If `getSupabaseClient()` throws, the entire state-clearing block is skipped.
