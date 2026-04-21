# Anchor List — webrtc.peer.ts

Source: src/webrtc.peer.ts
Produced by: stage 1.5 (arbiter runs 1 and 2 agreed unanimously)
Unresolved items: 0

1. createPeerConnection  (line 15)
2. attemptIceRestart  (line 67)
3. createOffer  (line 94)
4. handleOffer  (line 108)
5. handleAnswer  (line 123)
6. handleIceCandidate  (line 132)

## Resolution notes
- All five Stage 1 agents unanimously identified the same 6 exported functions. Both arbiter runs agree. No type-only exports, re-exports, or pure constants present.
- `SETUP_TIMEOUT_MS` is imported from `webrtc.state.ts` but never referenced in any function body. Dead import — does not affect anchor list. Flagged for Stage 3 review.
