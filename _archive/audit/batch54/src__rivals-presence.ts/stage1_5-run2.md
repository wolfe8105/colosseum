# Anchor List — rivals-presence.ts

1. init  (line 45)
2. destroy  (line 65)

## Resolution notes
- `PresenceChannel` (line 33): type alias — excluded.
- `rivalSet` (line 35): plain value binding (new Set), not a function — excluded.
- `onlineRivals` (line 36): plain value binding (new Set), not a function — excluded.
- `popupState` (line 37): plain value binding (object literal), not a function — excluded.
- `channelRef` (line 38): plain value binding (object literal), not a function — excluded.
- `initialized` (line 39): plain value binding (false), not a function — excluded.
- `rivalsPresence` (line 85): object literal `{ init, destroy } as const`, not a callable — excluded.
- `(p) => queueAlert(p, popupState)` (line 60): inner arrow function inside `init` — excluded as inner callback.
