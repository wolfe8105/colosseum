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

No candidates were excluded. All five agents agreed on exactly the same 13 function definitions, and a direct scan of the source file confirms no additional top-level named callable bindings exist. The following items from the source were verified as non-qualifying:

- `_ws.onopen` callback (line 147) — inline callback assigned to an event handler property, not a top-level named binding
- `_ws.onmessage` callback (line 167) — same; inline event handler assignment
- `_ws.onerror` callback (line 179) — same
- `_ws.onclose` callback (line 183) — same
- `_recorder.ondataavailable` callback (line 230) — inline callback on recorder instance
- `_recorder.onerror` callback (line 241) — same
- `setTimeout` callback inside `tryReconnectLoop` (line 293) — inner anonymous async callback, not a top-level binding
- `fetchDeepgramToken` (imported, line 20) — defined in `arena-deepgram.token.ts`, not in this file
