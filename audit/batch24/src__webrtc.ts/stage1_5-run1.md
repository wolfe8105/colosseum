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
- `webrtc` (line 149): excluded — bound to a plain object literal (with getters), not a function expression or arrow function.
- `onChange((user) => { ... })` callback at line 173: excluded — inline arrow callback passed to `onChange`, not a top-level named binding.
- `(t) => t.stop()` at line 82, `(e) => console.warn(...)` at line 94: excluded — inline callbacks inside `leaveDebate`.
- `on`, `off`, `requestMic`, `toggleMute`, `getAudioLevel`, `createWaveform`, `finishTurn`: excluded — re-exported imports, not defined in this file.
- Top-level statements at lines 27, 28, 169: excluded — assignments / event wiring, not function definitions.
- `export type { ... }` at line 21: excluded — type re-export, not a callable binding.
