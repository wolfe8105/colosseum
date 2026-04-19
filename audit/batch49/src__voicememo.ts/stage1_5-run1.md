# Anchor List — voicememo.ts

1. recordTake  (line 44)
2. replyToTake  (line 48)
3. debateReply  (line 52)
4. _currentUsername  (line 58)
5. _truncate  (line 59)
6. isEnabled  (line 64)

## Resolution notes

- voicememo (line 72): `const` bound to object literal, not a callable function. Excluded.
- startRecording, stopRecording, cancelRecording, cleanupPendingRecording, isRecordingState: imported from voicememo.record.ts and re-exported; not defined in this file. Excluded.
- uploadVoiceMemo, revokeAllFallbackURLs: imported from voicememo.upload.ts; not defined here. Excluded.
- renderPlayer, playInline, togglePlayback: imported from voicememo.player.ts; not defined here. Excluded.
- openRecorderSheet, closeRecorderSheet, toggleRecord, retake, send: imported from voicememo.sheet.ts; not defined here. Excluded.
- RecorderContext (line 24): interface type definition. Excluded.
- RecordingResult (line 22): type re-export only. Excluded.
- Arrow inside voicememo at line 76 `(url) => cleanupPendingRecording(url)`: inline callback in object literal, not top-level. Excluded.
- get isRecording (line 90) and get isEnabled (line 91) inside voicememo: object literal getters, not top-level bindings. Excluded.
