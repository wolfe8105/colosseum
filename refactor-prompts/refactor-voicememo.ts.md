# Refactor Prompt — voicememo.ts (558 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/voicememo.ts (558 lines).

Read CLAUDE.md first, then read src/voicememo.ts in full before touching anything. The file is the Voice Memo module — recording, visualization, upload, playback, and the recorder sheet UI.

SPLIT MAP (verify against the file before executing):

1. voicememo.ts (orchestrator, ~55 lines)
   Keeps: module-level state (mediaRecorder, audioChunks, recordingStream, isRecordingState, recordingStartTime, recordingTimer, pendingRecording, isPlayingState), the default export object and named entry points (recordTake, replyToTake, debateReply, isEnabled), all imports. Delegates to sub-modules.

2. voicememo.record.ts (~130 lines)
   startRecording, stopRecording, cancelRecording, cleanupPendingRecording, cleanup, updateRecorderUI. Also contains startVisualization and stopVisualization (audioContext, analyser, animationFrame state moves here too) — visualization is always started/stopped as part of the recording session, keeping them together avoids passing the stream as a param.

3. voicememo.upload.ts (~50 lines)
   uploadVoiceMemo, revokeAllFallbackURLs, _fallbackObjectURLs. Pure upload/storage concern. Exports these 3 items only.

4. voicememo.player.ts (~65 lines)
   renderPlayer, playInline, togglePlayback. All inline playback concerns. renderPlayer returns HTML string; playInline and togglePlayback operate on existing DOM.

5. voicememo.sheet.ts (~75 lines)
   openRecorderSheet, closeRecorderSheet, toggleRecord, retake, send. The recorder bottom-sheet lifecycle. send imports from voicememo.upload.ts. toggleRecord imports from voicememo.record.ts.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (RecordingResult, UploadResult, RecorderContext).
- Dependency direction: orchestrator imports all 4. sheet.ts imports record.ts and upload.ts. player.ts is standalone. No cross-imports between record/upload/player.
- Target under 150 lines per file. record.ts at ~130 is acceptable.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in voicememo* files.

LANDMINES — log these as // LANDMINE [LM-VM-NNN]: description comments. Do NOT fix them:

- LM-VM-001 (in voicememo.sheet.ts at openRecorderSheet): The function body is a stub — "Full implementation in moderator-voicememo.js". The actual recorder sheet HTML/CSS lives in a legacy JS file, not in this TypeScript module. The TypeScript version provides typed signatures for compile-time checking only. The split must preserve this stub shape.

- LM-VM-002 (in voicememo.ts at helper exports): _currentUsername and _truncate are exported but marked "Available for future use" — neither is called anywhere in the module or imported anywhere in the codebase. Dead exports.

- LM-VM-003 (in voicememo.record.ts at startVisualization): Hardcodes rgba(212, 168, 67, ...) for the waveform bar color — no CSS var token equivalent exists yet.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
