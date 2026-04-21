# Anchor List — webrtc.ts

1. joinDebate  (line 34)
2. startLive  (line 57)
3. leaveDebate  (line 65)
4. getState  (line 119)
5. getLocalStream  (line 123)
6. getRemoteStream  (line 127)
7. isConnected  (line 131)
8. getTurnSequence  (line 135)

## Resolution notes

- `webrtc` (line 149) — excluded. It is a `const` bound to an object literal, not a function expression or arrow function. The object contains getter methods and property references, but the binding itself is not callable.
- Getters inside `webrtc` (`state`, `localStream`, `remoteStream`, `isConnected`, `turnSequence` at lines 160–164) — excluded. These are object-literal accessor methods, not top-level named bindings.
- Inline arrow callbacks — excluded per the rules:
  - `(t) => t.stop()` (line 82, `forEach` callback)
  - `(e) => console.warn(...)` (line 94, promise `.catch` callback)
  - `(user) => { if (!user) leaveDebate(); }` (line 173, `onChange` callback)
- Re-exports at lines 21, 143, and 167 — excluded. These re-bind/re-export names defined elsewhere; no new function definition occurs in this file.
- Imported names — excluded. Defined in other modules.
- Top-level statements at lines 27, 28, 169, 173 — excluded. Not function definitions.
