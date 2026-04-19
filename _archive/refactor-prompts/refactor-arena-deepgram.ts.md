# Refactor Prompt — arena-deepgram.ts (404 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-deepgram.ts (404 lines).

Read CLAUDE.md first, then read src/arena/arena-deepgram.ts in full before touching anything. The file is the Deepgram transcription module — WebSocket connection, MediaRecorder audio capture, reconnect loop, token fetch, and status emission.

SPLIT MAP (verify against the file before executing):

1. arena-deepgram.ts (orchestrator, ~45 lines)
   Keeps: startTranscription, stopTranscription, isTranscribing, cleanupDeepgram exports and module-level state (socket, isActive, status callbacks, reconnect state). All imports. Delegates to sub-modules.

2. arena-deepgram-connection.ts (~90 lines)
   connect, handleResult, closeCleanly, emitStatus. WebSocket lifecycle — open, message parsing, close. handleResult parses Deepgram transcription messages and fires the transcript callback.

3. arena-deepgram-recording.ts (~50 lines)
   startRecording, stopRecording (the MediaRecorder recording, not the transcription session). Audio capture from microphone, chunk collection, sending to socket.

4. arena-deepgram-reconnect.ts (~55 lines)
   attemptReconnect, tryReconnectLoop, clearReconnectTimer. Reconnect backoff logic — detects disconnect, waits, retries connect.

5. arena-deepgram-token.ts (~45 lines)
   fetchDeepgramToken. Fetches a short-lived Deepgram token from the Supabase Edge Function. Falls back to the config key in placeholder mode.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (DeepgramStatus, DeepgramResult).
- Dependency direction: orchestrator imports all 4. connection imports recording (to stop on close) and reconnect (to trigger on error). reconnect imports connection (to call connect). token is standalone. No other cross-imports.
- Target under 95 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in arena-deepgram* files.

LANDMINES — log these as // LANDMINE [LM-DG-NNN]: description comments. Do NOT fix them:

- LM-DG-001 (in arena-deepgram-token.ts at fetchDeepgramToken): Falls back to DEEPGRAM_API_KEY from config.ts. In placeholder mode this value is the literal string 'PASTE_YOUR_DEEPGRAM_API_KEY_HERE' — sending this as an Authorization header to Deepgram's API will result in a 401, not a silent no-op. The isTranscribing guard in startTranscription prevents most cases but the fallback path has no placeholder check.

- LM-DG-002 (in arena-deepgram-reconnect.ts at tryReconnectLoop): Reconnect loop uses a fixed retry count with no exponential backoff. Rapid successive failures (e.g. network down) will hammer the server at full speed until the retry count is exhausted.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
