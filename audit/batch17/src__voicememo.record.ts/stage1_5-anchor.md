# Anchor List — src/voicememo.record.ts

Source: src/voicememo.record.ts
Produced by: stage 1.5 (arbiter; no reconciliation needed — both runs agreed)
Unresolved items: 0

1. startRecording  (line 37)
2. stopRecording  (line 71)
3. cancelRecording  (line 100)
4. cleanupPendingRecording  (line 109)
5. cleanup  (line 116)
6. updateRecorderUI  (line 125)
7. startVisualization  (line 143)
8. stopVisualization  (line 185)

## Resolution notes
- startRecording (line 37): exported async function declaration.
- stopRecording (line 71): exported function declaration.
- cancelRecording (line 100): exported function declaration.
- cleanupPendingRecording (line 109): exported function declaration.
- cleanup (line 116): module-local function declaration.
- updateRecorderUI (line 125): module-local function declaration.
- startVisualization (line 143): module-local function declaration.
- stopVisualization (line 185): module-local function declaration.
- Excluded: inner `draw` (line 158) inside `startVisualization`; inline callbacks (ondataavailable, onstop, setTimeout); `RecordingResult` interface.
