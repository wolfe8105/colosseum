# Anchor List — webrtc.peer.ts

1. createPeerConnection  (line 15)
2. attemptIceRestart  (line 67)
3. createOffer  (line 94)
4. handleOffer  (line 108)
5. handleAnswer  (line 123)
6. handleIceCandidate  (line 132)

## Resolution notes
- All 6 exported functions confirmed. Consensus across all 5 Stage 1 agents unambiguous; no adjustments required.
- `SETUP_TIMEOUT_MS` dead import confirmed. Imported from `./webrtc.state.ts` but never referenced in any function body. Flagged for removal.
- No internal symbols, type-only exports, or re-exports present.
