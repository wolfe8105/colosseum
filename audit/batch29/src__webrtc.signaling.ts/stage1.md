# Stage 1 Outputs — webrtc.signaling.ts

## Agent 01

Top-level functions/exports:
1. `setupSignaling` — exported async function, line 17
2. `sendSignal` — exported function, line 77
3. `handleSignalingMessage` — NOT exported, async function, line 89

Top-level statements (not functions):
- `signals.sendSignal = sendSignal;` (line 87) — late-bound ref assignment, not a function definition

---

## Agent 02

Top-level functions/exports:
1. `setupSignaling(debateId: string): Promise<void>` — exported async function, line 17
2. `sendSignal(type: string, data: unknown): void` — exported sync function, line 77
3. `handleSignalingMessage(msg: SignalingMessage): Promise<void>` — NOT exported, async function, line 89

Top-level statements (not functions):
- `signals.sendSignal = sendSignal;` (line 87) — module-level assignment wiring late-bound ref

---

## Agent 03

Top-level functions/exports:
1. `setupSignaling` — exported, async, line 17
2. `sendSignal` — exported, sync, line 77
3. `handleSignalingMessage` — NOT exported, async, line 89

Top-level statements (not functions):
- Line 87: `signals.sendSignal = sendSignal;` — module-level side effect, circular import workaround

---

## Agent 04

Top-level functions/exports:
1. `setupSignaling(debateId: string): Promise<void>` — export async, line 17
2. `sendSignal(type: string, data: unknown): void` — export, line 77
3. `handleSignalingMessage(msg: SignalingMessage): Promise<void>` — async, NOT exported, line 89

Top-level statements (not functions):
- `signals.sendSignal = sendSignal;` at line 87 — late binding to break circular dependency with webrtc.engine

---

## Agent 05

Top-level functions/exports:
1. `setupSignaling` — exported async function, line 17
2. `sendSignal` — exported sync function, line 77
3. `handleSignalingMessage` — NOT exported, async function, line 89

Top-level statements (not functions):
- `signals.sendSignal = sendSignal;` (line 87) — top-level assignment, not a function definition
