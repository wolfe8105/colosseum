# Stage 1 Outputs — arena-feed-disconnect-debater.ts

## Agent 01

1. **`handleDebaterDisconnect`**
   - Line: 19
   - Signature: `(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): Promise<void>`
   - Async: yes
   - Structural notes: nested ternary on disconnectorName (lines 20–23); two .catch() arrow callbacks on safeRpc; setTimeout(() => void endCurrentDebate(), 1500) at line 57.

2. **`handleDebaterDisconnectAsViewer`**
   - Line: 60
   - Signature: `(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): void`
   - Async: no
   - Structural notes: setTimeout at line 66 (gated on debate.spectatorView) containing dynamic import('./arena-lobby.ts').then(m => m.renderLobby()); mod-viewer else path is comment-only.

## Agent 02

1. **`handleDebaterDisconnect`**
   - Line: 19
   - Signature: `(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): Promise<void>`
   - Async: yes
   - Structural notes: inline ternary chain (lines 20–23); two .catch() inline arrows on safeRpc (lines 40, 50); setTimeout(() => void endCurrentDebate(), 1500) at line 57.

2. **`handleDebaterDisconnectAsViewer`**
   - Line: 60
   - Signature: `(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): void`
   - Async: no
   - Structural notes: setTimeout callback (line 64) performs dynamic import('./arena-lobby.ts') with nested .then arrow; gated on if (debate.spectatorView).

## Agent 03

1. **`handleDebaterDisconnect`**
   - Line: 19
   - Signature: `(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): Promise<void>`
   - Async: yes
   - Structural notes: inline ternary spanning lines 20–22; two .catch() arrows (lines 41, 52); setTimeout(() => void endCurrentDebate(), 1500) at line 57.

2. **`handleDebaterDisconnectAsViewer`**
   - Line: 60
   - Signature: `(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): void`
   - Async: no
   - Structural notes: setTimeout at line 66 with nested dynamic import chain; gated on if (debate.spectatorView); else-path is comment-only.

## Agent 04

1. **`handleDebaterDisconnect`**
   - Line: 19
   - Signature: `(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): Promise<void>`
   - Async: yes
   - Structural notes: inline ternary on disconnectorName (lines 20–23); .catch() on both safeRpc calls (lines 38–42, 44–51); closes over module-level round, scoreA, scoreB; setTimeout(() => void endCurrentDebate(), 1500).

2. **`handleDebaterDisconnectAsViewer`**
   - Line: 60
   - Signature: `(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): void`
   - Async: no
   - Structural notes: setTimeout (line 65) inside if (debate.spectatorView) with dynamic import + .then arrow; mod-viewer else is implicit/comment-only.

## Agent 05

1. **`handleDebaterDisconnect`**
   - Line: 19
   - Signature: `(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): Promise<void>`
   - Async: yes
   - Structural notes: ternary-within-ternary (lines 20–22); two .catch() arrows; setTimeout(() => void endCurrentDebate(), 1500) with double-finalize guard noted.

2. **`handleDebaterDisconnectAsViewer`**
   - Line: 61
   - Signature: `(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): void`
   - Async: no
   - Structural notes: if (debate.spectatorView) gates setTimeout with dynamic import('./arena-lobby.ts').then(m => m.renderLobby()); mod-viewer path is comment-only.
