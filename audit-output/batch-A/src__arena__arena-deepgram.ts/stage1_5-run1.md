# Anchor List — arena-deepgram.ts

1. startTranscription  (line 56)
2. stopTranscription  (line 85)
3. isTranscribing  (line 105)
4. connect  (line 113)
5. handleResult  (line 194)
6. startRecording  (line 214)
7. stopRecording  (line 254)
8. attemptReconnect  (line 267)
9. tryReconnectLoop  (line 289)
10. closeCleanly  (line 308)
11. clearReconnectTimer  (line 327)
12. emitStatus  (line 334)
13. cleanupDeepgram  (line 341)

## Resolution notes

All five agents listed exactly the same 13 candidates and agreed on all of them. No candidates were excluded. No additional top-level function definitions were found by direct source scan. The following items were confirmed not to be top-level callable bindings:

- `_ws.onopen` callback (line 147) — inline event handler assigned inside `connect`, not a top-level binding
- `_ws.onmessage` callback (line 167) — inline event handler assigned inside `connect`, not a top-level binding
- `_ws.onerror` callback (line 179) — inline event handler assigned inside `connect`, not a top-level binding
- `_ws.onclose` callback (line 183) — inline event handler assigned inside `connect`, not a top-level binding
- `_recorder.ondataavailable` callback (line 230) — inline event handler assigned inside `startRecording`, not a top-level binding
- `_recorder.onerror` callback (line 241) — inline event handler assigned inside `startRecording`, not a top-level binding
- `setTimeout` async callback inside `tryReconnectLoop` (line 293) — anonymous callback passed to `setTimeout`, not a top-level binding
- `fetchDeepgramToken` (line 20, imported) — imported from `arena-deepgram.token.ts`, not defined in this file
