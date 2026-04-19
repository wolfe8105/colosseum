# Anchor List — arena-room-voicememo.ts

1. wireVoiceMemoControls  (line 15)
2. startVoiceMemoRecording  (line 27)
3. stopVoiceMemoRecording  (line 52)
4. resetVoiceMemoUI  (line 70)
5. sendVoiceMemo  (line 91)

## Resolution notes

- `_sendingMemo` (line 89): excluded — it is a `let` binding to a boolean primitive (`false`), not a function definition. All five agents correctly classified it as a value binding, not a function.
