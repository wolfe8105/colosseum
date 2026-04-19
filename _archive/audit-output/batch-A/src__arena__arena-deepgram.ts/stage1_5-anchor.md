# Anchor List — arena-deepgram.ts

Source: src/arena/arena-deepgram.ts
Produced by: stage 1.5 (arbiter + optional reconciliation)
Unresolved items: 0

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
All five stage-1 agents agreed on exactly the same 13 function definitions. Both arbiter runs agreed. No reconciliation required. No candidates were excluded. Inline callbacks (WebSocket event handlers, MediaRecorder callbacks, setTimeout callback) and the imported `fetchDeepgramToken` were confirmed as non-qualifying.
