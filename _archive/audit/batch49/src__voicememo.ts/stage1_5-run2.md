# Anchor List — voicememo.ts

1. recordTake  (line 44)
2. replyToTake  (line 48)
3. debateReply  (line 52)
4. _currentUsername  (line 58)
5. _truncate  (line 59)
6. isEnabled  (line 64)

## Resolution notes

- voicememo (line 72): top-level `const` bound to object literal (as const), not a function expression. Excluded.
- startRecording, stopRecording, cancelRecording, cleanupPendingRecording, isRecordingState: imported from voicememo.record.ts and re-exported; defined elsewhere. Excluded.
- uploadVoiceMemo, revokeAllFallbackURLs: imported from voicememo.upload.ts; defined elsewhere. Excluded.
- renderPlayer, playInline, togglePlayback: imported from voicememo.player.ts; defined elsewhere. Excluded.
- openRecorderSheet, closeRecorderSheet, toggleRecord, retake, send: imported from voicememo.sheet.ts; defined elsewhere. Excluded.
- RecorderContext (line 24): interface type definition, not a callable binding. Excluded.
- RecordingResult (line 22): type re-export only. Excluded.
- Arrow at line 76 `(url) => cleanupPendingRecording(url)`: inline callback inside object literal, not a top-level binding. Excluded.
- get isRecording (line 90) and get isEnabled (line 91): object literal getters, not top-level bindings. Excluded.
