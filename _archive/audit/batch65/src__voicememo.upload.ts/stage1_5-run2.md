# Anchor List — voicememo.upload.ts

1. revokeAllFallbackURLs  (line 13)
2. uploadVoiceMemo  (line 25)

## Resolution notes
- `UploadResult` is excluded. All 5 agents agree it is an exported interface (with `url` and `path` fields), not a named function definition. Interfaces do not qualify under Stage 2 walking criteria regardless of export status.
- Both remaining items are named callable function definitions confirmed unanimously: `revokeAllFallbackURLs` is a synchronous exported function, `uploadVoiceMemo` is an exported async function. No disagreements, no tie-breaking required.
