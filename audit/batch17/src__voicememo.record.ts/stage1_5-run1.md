# Anchor List — src/voicememo.record.ts
1. startRecording  (line 37)
2. stopRecording  (line 71)
3. cancelRecording  (line 100)
4. cleanupPendingRecording  (line 109)
5. cleanup  (line 116)
6. updateRecorderUI  (line 125)
7. startVisualization  (line 143)
8. stopVisualization  (line 185)

## Resolution notes
- startRecording (line 37): top-level exported async function declaration.
- stopRecording (line 71): top-level exported function declaration.
- cancelRecording (line 100): top-level exported function declaration.
- cleanupPendingRecording (line 109): top-level exported function declaration.
- cleanup (line 116): top-level (non-exported) function declaration.
- updateRecorderUI (line 125): top-level (non-exported) function declaration.
- startVisualization (line 143): top-level (non-exported) function declaration.
- stopVisualization (line 185): top-level (non-exported) function declaration.
- draw (line 158): EXCLUDED — inner helper nested inside `startVisualization`.
- `mediaRecorder.ondataavailable` / `mediaRecorder.onstop` (lines 50-51, 75): EXCLUDED — inline callback assignments.
- `setTimeout(() => ...)` (line 59): EXCLUDED — inline anonymous callback.
- `RecordingResult` (line 10): EXCLUDED — interface, not callable.
