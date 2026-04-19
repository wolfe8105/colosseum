# Anchor List — webrtc.signaling.ts (Arbiter Run 1)

1. `setupSignaling(debateId: string): Promise<void>` (line 17) exported
2. `sendSignal(type: string, data: unknown): void` (line 77) exported
3. `handleSignalingMessage(msg: SignalingMessage): Promise<void>` (line 89) not exported

## Resolution notes
- `signals.sendSignal = sendSignal;` (line 87) excluded — top-level statement performing a late-bound reference assignment, not a function definition.
- No disagreements to resolve: all 5 agents were unanimous on all three functions, their line numbers, and their export status.
