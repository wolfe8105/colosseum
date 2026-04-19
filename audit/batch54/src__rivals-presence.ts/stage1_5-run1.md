# Anchor List — rivals-presence.ts

1. init  (line 45)
2. destroy  (line 65)

## Resolution notes
- `init` (line 45): exported async function declaration. Included.
- `destroy` (line 65): exported function declaration. Included.
- `PresenceChannel` (line 33): type alias. Excluded.
- `PresencePayload` (line 23): exported interface. Excluded.
- `rivalSet` (line 35): plain value binding (Set), not a function. Excluded.
- `onlineRivals` (line 36): plain value binding (Set), not a function. Excluded.
- `popupState` (line 37): plain value binding (object literal), not a function. Excluded.
- `channelRef` (line 38): plain value binding (object literal), not a function. Excluded.
- `initialized` (line 39): plain value binding (boolean), not a function. Excluded.
- `rivalsPresence` (line 85): const whose value is an object literal `{ init, destroy } as const`, not a function. Excluded.
