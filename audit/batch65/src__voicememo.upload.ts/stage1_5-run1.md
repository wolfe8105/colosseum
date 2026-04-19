# Anchor List — voicememo.upload.ts

1. revokeAllFallbackURLs  (line 13)
2. uploadVoiceMemo  (line 25)

## Resolution notes
- `UploadResult` (line 20): excluded — exported interface, not a callable function definition. All 5 agents correctly identified it as an interface; line-number variance (20/21/22) is immaterial.
- `MAX_FILE_BYTES` (line 9) and `_fallbackObjectURLs` (line 11): const bindings, not function definitions. Neither appeared in agent reports.
- Both anchored functions confirmed against source: `revokeAllFallbackURLs` at line 13, `uploadVoiceMemo` at line 25. Unanimous agent consensus.
