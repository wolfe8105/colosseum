# Anchor List — arena-room-voicememo.ts

1. wireVoiceMemoControls  (line 15)
2. startVoiceMemoRecording  (line 27)
3. stopVoiceMemoRecording  (line 52)
4. resetVoiceMemoUI  (line 70)
5. sendVoiceMemo  (line 91)

## Resolution notes

- `_sendingMemo` (line 89): excluded — module-level `let` binding to a boolean value `false`, not a function definition.
- All five agents consistently identified the same five function definitions; no candidates were proposed by any agent and then contradicted by the source, and no additional top-level function definitions were found in the source that all agents missed.
