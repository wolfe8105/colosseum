# Anchor List — arena-room-live-audio.ts

1. destroyLiveAudio  (line 22)
2. initLiveAudio  (line 33)
3. toggleLiveMute  (line 115)

## Resolution notes

- `_micReadyHandler`, `_connectedHandler`, `_disconnectedHandler`, `_reconnectingHandler`, `_connectionFailedHandler`, `_muteChangedHandler`, `_tickHandler`, `_debateEndHandler` (lines 12–19): module-level `let` declarations typed as `WebRTCEventCallback | null`, initialized to `null`, not bound to function definitions at declaration site — excluded.
- Arrow functions assigned to the `_*Handler` bindings inside `initLiveAudio` (lines 37, 51, 57, 69, 76, 82, 94, 104): assignments to existing module-level variables performed inside another function body, not top-level named callable bindings — excluded as inner/callback forms.
