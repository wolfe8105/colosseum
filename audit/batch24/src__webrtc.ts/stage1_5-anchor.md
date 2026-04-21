# Anchor List — webrtc.ts

Source: src/webrtc.ts
Produced by: stage 1.5 (arbiter, runs agreed — no reconciliation)
Unresolved items: 0

1. joinDebate  (line 34)
2. startLive  (line 57)
3. leaveDebate  (line 65)
4. getState  (line 119)
5. getLocalStream  (line 123)
6. getRemoteStream  (line 127)
7. isConnected  (line 131)
8. getTurnSequence  (line 135)

## Resolution notes
- `webrtc` (line 149): excluded — `const` bound to a plain object literal with getter members, not a function/arrow binding.
- Getters inside `webrtc` (`state`, `localStream`, `remoteStream`, `isConnected`, `turnSequence` at lines 160–164): excluded — object-literal accessors, not top-level named bindings.
- Inline arrow callbacks (`(t) => t.stop()` line 82; `(e) => console.warn(...)` line 94; `(user) => { ... }` line 173): excluded — callbacks inside other functions or argument positions.
- Re-exports at lines 21, 143, 167: excluded — no new function defined.
- Imported names: excluded — defined in other modules.
- Top-level statements at lines 27, 28, 169, 173: excluded — assignments / event wiring, not function definitions.
