# Anchor List — arena-room-live-audio.ts

Source: src/arena/arena-room-live-audio.ts
Produced by: stage 1.5 (arbiter, runs agreed — no reconciliation)
Unresolved items: 0

1. destroyLiveAudio  (line 22)
2. initLiveAudio  (line 33)
3. toggleLiveMute  (line 115)

## Resolution notes

- `_micReadyHandler` / `_connectedHandler` / `_disconnectedHandler` / `_reconnectingHandler` / `_connectionFailedHandler` / `_muteChangedHandler` / `_tickHandler` / `_debateEndHandler` (lines 12–19): module-level `let` bindings declared as `WebRTCEventCallback | null`; at declaration they hold `null`, not function definitions. They are later assigned arrow-function callbacks inside `initLiveAudio`, which are inner handlers, not top-level function bindings.
