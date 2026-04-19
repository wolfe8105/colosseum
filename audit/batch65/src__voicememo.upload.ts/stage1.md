# Stage 1 Outputs — voicememo.upload.ts

## Agent 01
- `revokeAllFallbackURLs` (line 13) — releases all cached fallback object URLs created during failed or placeholder uploads
- `UploadResult` (line 22) — interface defining the shape of a successful upload result (`url` and `path` fields)
- `uploadVoiceMemo` (line 26) — async function that uploads a voice memo Blob to Supabase Storage (or falls back to a local object URL on error, size overflow, or placeholder mode)

## Agent 02
- `revokeAllFallbackURLs` (line 13) — Revokes all accumulated fallback object URLs and empties the internal list.
- `UploadResult` (line 22) — Interface describing the return shape of an upload operation: a public URL and a storage path.
- `uploadVoiceMemo` (line 26) — Uploads a voice memo Blob to Supabase Storage, falling back to a local object URL on size violation, placeholder mode, or upload error.

## Agent 03
- `revokeAllFallbackURLs` (line 13) — Revokes all object URLs stored in the fallback array and clears it.
- `UploadResult` (line 22) — Interface defining the shape of a successful upload result with `url` and `path` fields.
- `uploadVoiceMemo` (line 26) — Async function that uploads a voice memo blob to Supabase Storage, falling back to a local object URL on oversized, placeholder-mode, or upload-error conditions.

## Agent 04
- `revokeAllFallbackURLs` (line 13) — revokes all cached fallback object URLs created during failed or placeholder uploads
- `UploadResult` (line 21) — interface describing the return shape of a successful upload: a public URL and a storage path
- `uploadVoiceMemo` (line 25) — uploads a voice memo Blob to Supabase Storage, falling back to a local object URL on size violation, placeholder mode, or upload error

## Agent 05
- `revokeAllFallbackURLs` (line 13) — revokes all cached fallback object URLs created during failed or placeholder uploads
- `UploadResult` (line 21) — interface describing the return shape of an upload operation (url string + path string)
- `uploadVoiceMemo` (line 25) — uploads a voice memo Blob to Supabase Storage, falling back to a local object URL if over size limit, in placeholder mode, or on upload error
