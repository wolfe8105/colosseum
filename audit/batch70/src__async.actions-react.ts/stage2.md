# Stage 2 Outputs — src/async.actions-react.ts

## Agent 01

### react

Reads a `takeId` string parameter. Calls `requireAuth('react to hot takes')` and returns early if falsy. Reads `state.reactingIds.has(takeId)` and returns early if true. Reads `state.hotTakes.find()` to locate the matching take by `id`; returns early if not found.

Writes `state.reactingIds.add(takeId)`. Toggles `take.userReacted` (boolean flip). Increments or decrements `take.reactions` by 1 based on the new value of `take.userReacted`. Calls `loadHotTakes(state.currentFilter)` to re-render.

Enters a conditional branch: if `getSupabaseClient()` is truthy AND `getIsPlaceholderMode()` is falsy, enters an async try block. Awaits `safeRpc<ReactResult>('react_hot_take', { p_hot_take_id: takeId, p_reaction_type: 'fire' })`. On error (truthy `error`): logs to console, reverses the `userReacted` toggle, reverses the `reactions` delta, calls `loadHotTakes` again. On success with data: sets `take.reactions` from `data.reaction_count`, sets `take.userReacted` from `data.reacted`, calls `loadHotTakes`, and if `data.reacted` is true: calls `nudge('first_vote', ...)` and `claimReaction(takeId)`. The catch block swallows all errors silently.

Writes `state.reactingIds.delete(takeId)` unconditionally after the conditional block. Returns `void`.

## Agent 02

### react

Reads `takeId: string`. Three guard clauses execute before any state write: (1) `requireAuth` check — returns early if user is not authenticated; (2) double-react guard via `state.reactingIds.has(takeId)` — returns early if this take is already being processed; (3) take existence check via `state.hotTakes.find` — returns early if `takeId` not found in local state.

Optimistic update writes: adds `takeId` to `state.reactingIds`, flips `take.userReacted`, adjusts `take.reactions` by ±1, calls `loadHotTakes(state.currentFilter)`.

Remote sync: conditional on client availability and non-placeholder mode. Awaits `safeRpc('react_hot_take', ...)`. On RPC error: reverts optimistic writes (flips `userReacted` back, adjusts `reactions` back by ±1, calls `loadHotTakes`). On RPC success: overwrites local state with server-authoritative values (`reaction_count`, `reacted`), calls `loadHotTakes`, conditionally calls `nudge` and `claimReaction` if server confirms the reaction was added.

Cleanup: deletes `takeId` from `state.reactingIds`. The `catch {}` block swallows exceptions silently without rollback.

## Agent 03

### react

Reads `takeId: string`. Guard 1: calls `requireAuth('react to hot takes')` — if falsy, returns immediately. Guard 2: reads `state.reactingIds.has(takeId)` — if true, returns immediately (prevents concurrent processing of same take). Guard 3: calls `state.hotTakes.find(t => t.id === takeId)` — if `take` is undefined, returns immediately.

State mutations (optimistic): adds `takeId` to `state.reactingIds`; toggles `take.userReacted`; adjusts `take.reactions` by +1 if `userReacted` is now true or -1 if now false; calls `loadHotTakes(state.currentFilter)`.

Conditional RPC block (executed only when Supabase client exists and not in placeholder mode): awaits `safeRpc<ReactResult>('react_hot_take', { p_hot_take_id: takeId, p_reaction_type: 'fire' })`. Error path: logs error, re-toggles `take.userReacted`, re-adjusts `take.reactions`, re-calls `loadHotTakes`. Success path: sets `take.reactions` to `data.reaction_count`, sets `take.userReacted` to `data.reacted`, calls `loadHotTakes`, and if `data.reacted`: calls `nudge` and `claimReaction`. Catch path: swallows all exceptions with no rollback and no logging.

Final write: `state.reactingIds.delete(takeId)`. Returns void.

## Agent 04

### react

Reads `takeId: string`. First three lines are guards: `requireAuth` returns early on failure; `state.reactingIds.has(takeId)` returns early if in-flight; `state.hotTakes.find` returns early if take not in local cache.

Optimistic path: marks take as in-flight in `state.reactingIds`; flips `take.userReacted`; adjusts `take.reactions` by the sign implied by the new `userReacted` value; re-renders via `loadHotTakes(state.currentFilter)`.

Network path: guarded by `getSupabaseClient()` truthy AND `!getIsPlaceholderMode()`. Inside try: awaits `safeRpc<ReactResult>('react_hot_take', { p_hot_take_id: takeId, p_reaction_type: 'fire' })`. On error: console logs, reverses optimistic `userReacted` and `reactions` changes, re-renders. On success with data: updates `take.reactions` and `take.userReacted` from server response, re-renders; if `data.reacted`, fires `nudge('first_vote', ...)` and `claimReaction(takeId)`. On thrown exception: catch block is empty, no rollback occurs.

Cleanup unconditionally removes `takeId` from `state.reactingIds`. Returns void.

## Agent 05

### react

Reads `takeId: string`. Performs three sequential guard checks and returns early on any failure: auth check via `requireAuth`; concurrency guard via `state.reactingIds.has`; take lookup via `state.hotTakes.find`.

Optimistic mutation: writes to `state.reactingIds` (add), mutates `take.userReacted` (toggle), mutates `take.reactions` (±1 delta), calls `loadHotTakes(state.currentFilter)`.

Conditional async block: enters only when Supabase client is available and not in placeholder mode. Awaits `safeRpc<ReactResult>('react_hot_take', { p_hot_take_id: takeId, p_reaction_type: 'fire' })`. Error branch: logs, reverts optimistic state changes, re-renders. Success branch: replaces optimistic values with server-authoritative `reaction_count` and `reacted`; re-renders; if `reacted` is true, calls `nudge('first_vote', ...)` and `claimReaction(takeId)`. Catch block: `/* handled */` comment, no rollback, no logging.

Post-conditional: `state.reactingIds.delete(takeId)`.

Notable: the catch block comment says "handled" but the catch body is empty — no rollback of the optimistic state update occurs on thrown exceptions.
