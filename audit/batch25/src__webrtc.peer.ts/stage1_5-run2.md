# Anchor List — webrtc.peer.ts

1. createPeerConnection  (line 15)
2. attemptIceRestart  (line 67)
3. createOffer  (line 94)
4. handleOffer  (line 108)
5. handleAnswer  (line 123)
6. handleIceCandidate  (line 132)

## Resolution notes
- Unanimous Stage 1 result confirmed. All 6 exported functions present; no additional symbols exist.
- No export constants, types, interfaces, classes, or default export anywhere in the file.
- `SETUP_TIMEOUT_MS` dead-import finding confirmed: imported alongside `state`, `signals`, `fire`, and `MAX_ICE_RESTART_ATTEMPTS`, but the symbol `SETUP_TIMEOUT_MS` does not appear in any function body. Every other imported name is referenced.
- No internal (non-exported) named functions exist; all logic is inline within the six exported functions.
