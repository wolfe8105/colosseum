# Anchor List — webrtc.signaling.ts (Arbiter Run 2)

1. `setupSignaling`  (line 17) — exported async function
2. `sendSignal`  (line 77) — exported sync function
3. `handleSignalingMessage`  (line 89) — not exported, async function

## Resolution notes
- `signals.sendSignal = sendSignal;` (line 87) excluded — bare assignment statement, not a function definition
- All 5 Stage 1 agents in unanimous agreement; no conflicts to resolve
- Final count: 3 top-level function definitions
