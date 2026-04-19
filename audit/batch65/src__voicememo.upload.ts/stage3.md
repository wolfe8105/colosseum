# Stage 3 Outputs — voicememo.upload.ts

## Agent 01

### revokeAllFallbackURLs (line 13) + uploadVoiceMemo (line 25)
**Verification**: PASS (all 5 Stage 2 agents)
**Findings**:
- PASS: All five agents correctly described `revokeAllFallbackURLs` while/pop/if(u)/revokeObjectURL loop, no try/catch.
- PASS: All five agents correctly described all four branches of `uploadVoiceMemo` (size exceeded, no client/placeholder, upload success, upload error).
- PASS: Correct identification of no-toast in Branch 2, console.log only.
- PASS: Correct identification of synchronous `getPublicUrl`, no `await`.
- PASS: Correct identification of `debateId ?? 'take'` path construction, always-`.webm` in Branch 2.
- PASS: No try/catch anywhere in the file — confirmed.

**Cross-Agent Consensus Summary**: All five agents agree on every behavioral detail. Agent 03 and 05 correctly noted `debateId ''` passes through as-is. Agent 04 noted `Date.now()` collision + `upsert:false` failure mode. Agent 04 and 05 noted `getPublicUrl` result not error-checked. No FAIL or PARTIAL verdicts.

### needs_review
1. **`debateId` unsanitized in storage path (line 46)**: `debateId` is interpolated directly into the Supabase Storage path with no UUID validation, length check, or character whitelist. A value containing `../` sequences would embed path-traversal characters raw into the storage path. The project's CLAUDE.md mandates UUID validation before PostgREST filters — the same principle applies to storage paths.
2. **`_fallbackObjectURLs` grows unboundedly (lines 30, 37, 56)**: The module-level array accumulates an object URL from every Branch 1, 2, and 4 call. `revokeAllFallbackURLs` is exported but never called within this file. If the caller omits cleanup (e.g., on component teardown), all referenced Blobs persist in browser memory for the page lifetime. No internal cap or partial-drain exists.
3. **`getPublicUrl` result not null-guarded (line 60)**: `const { data: urlData } = supabase.storage.from('debate-audio').getPublicUrl(path)` — if `urlData` is null or undefined (unexpected SDK state, private bucket, wrong SDK version), `urlData.publicUrl` throws a TypeError uncaught, breaking the no-throw contract the function otherwise maintains.
4. **`data` from `upload()` discarded (line 47)**: Supabase v2 `storage.upload()` returns `{ data: { path }, error }`. The locally-constructed `path` is used for `getPublicUrl`, not the server-confirmed path. If Supabase ever normalizes the path on ingestion, the function would call `getPublicUrl` with the wrong path.
5. **`blob.type` passed as `contentType` without validation (line 49)**: `blob.type` may be an empty string (browser declined to set it) or an arbitrary MIME type. Passed verbatim to Supabase Storage, which affects how the file is served from the public URL. An empty `contentType` may cause audio playback failures downstream.
6. **Branch 2 provides no user-visible feedback (line 38)**: When no Supabase client exists or placeholder mode is active, the function silently falls back to a local object URL with only a `console.log`. Unlike Branch 1 (toast) and Branch 4 (toast), the user receives no indication that their audio was not uploaded to the server.

---

## Agent 02

### revokeAllFallbackURLs (line 13) + uploadVoiceMemo (line 25)
**Verification**: PASS (all 5 Stage 2 agents)
**Findings**:
- PASS: All five agents correct on all four branches and `revokeAllFallbackURLs` mechanics.
- PASS: All key behavioral details verified: no try/catch, sync getPublicUrl, fallback path strings, debateId ?? 'take'.
- PASS: Agent 03 and 05 correctly noted `debateId ''` passes through as-is (??  not ||).
- PASS: Agent 04 and 05 correctly noted `getPublicUrl` result unchecked.

**Cross-Agent Consensus Summary**: No FAIL or PARTIAL. Strong consensus on all branches. Minority agents (03, 05) correctly captured the `debateId ''` edge case; minority agents (04, 05) correctly captured the `getPublicUrl` gap.

### needs_review
- **`debateId` unsanitized in path (line 46)**: Path traversal concern — no validation against UUID format or character set before embedding in storage path.
- **`_fallbackObjectURLs` memory leak risk**: Unbounded accumulation across calls; `revokeAllFallbackURLs` is caller-responsibility with no internal backstop.
- **`getPublicUrl` `urlData` not null-guarded**: Could throw TypeError propagating as unhandled rejection if SDK returns unexpected shape.
- **`data` from `upload()` discarded**: Locally-constructed path used for `getPublicUrl` rather than server-confirmed path.
- **`contentType: blob.type` unvalidated**: Empty or attacker-supplied MIME type passed through verbatim to Supabase Storage metadata.

---

## Agent 03

### revokeAllFallbackURLs (line 13) + uploadVoiceMemo (line 25)
**Verification**: PASS (all 5 Stage 2 agents)
**Findings**:
- PASS: All agents correct on all described behaviors.
- No factual errors found across any of the five agents.

**Cross-Agent Consensus Summary**: All five agents PASS. Minor coverage differences (debateId '', getPublicUrl, Date.now() collision) but no false claims.

### needs_review
- **`debateId` path traversal (line 46)**: No sanitization before path construction. Caller-supplied string with `../` would embed literally.
- **`_fallbackObjectURLs` unbounded growth**: Module-level memory leak if caller never invokes `revokeAllFallbackURLs`.
- **`getPublicUrl` unguarded (line 60)**: `urlData?.publicUrl` not guarded; TypeError if `urlData` null.
- **`blob.type` as `contentType` (line 49)**: Unvalidated MIME type in upload options.
- **Branch 2 path hardcoded `.webm` (line 39)**: Extension mismatch vs. actual blob type in placeholder/no-client path; callers relying on path for type inference would receive wrong extension for MP4 blobs.
- **No `finally` in `uploadVoiceMemo`**: If caller disables a button or sets loading state before calling, unexpected throw (e.g., `blob.type` undefined, `URL.createObjectURL` TypeError) would leave UI in permanently loading/disabled state with no recovery. Matches existing audit pattern (B36, B39).

---

## Agent 04

### revokeAllFallbackURLs (line 13) + uploadVoiceMemo (line 25)
**Verification**: PASS (all 5 Stage 2 agents)
**Findings**:
- PASS: All five agents correctly described every branch.
- PASS: Exact toast messages verified character-for-character: Branch 1 `⚠️ Recording too large (${sizeMB} MB). Max is 5 MB.`; Branch 4 `⚠️ Upload failed. Saved locally.`.
- PASS: Branch 2 asymmetry (console.log only, no toast) confirmed.
- PASS: `data` from upload call destructured away — only `error` used.
- PASS: No `finally` block anywhere — confirmed zero `try`/`catch`/`finally` in the file.
- PASS: `revokeAllFallbackURLs` exported but never called within the file — confirmed.

**Cross-Agent Consensus Summary**: All five PASS. Strong consensus.

### needs_review
- **`debateId` unsanitized (line 46)**: Typed `string | null`, used raw in storage path. No UUID format check.
- **Unauthenticated users write to `voice-memos/placeholder-user/` (line 43)**: `getCurrentUser()` returning null → `userId = 'placeholder-user'` → all anonymous uploads share one directory prefix. With `upsert: false`, millisecond-level timestamp collisions between anonymous users produce upload errors and silently fall to local-fallback with no caller indication. Bucket RLS policy should be verified to ensure this prefix is not writable by anonymous sessions in production.
- **`_fallbackObjectURLs` module-scoped, caller must drain**: No internal cleanup mechanism; memory leak risk if `revokeAllFallbackURLs` not called on teardown.
- **`data` from `upload()` discarded**: Server-confirmed path not used; locally-constructed path assumed to match.
- **`blob.type` extension logic is binary catch-all**: Any MIME not containing `'mp4'` substring defaults to `.webm` extension — includes `audio/ogg`, `audio/wav`, `video/webm`, empty string. File stored with wrong extension if blob is non-webm non-mp4 audio.

---

## Agent 05

### revokeAllFallbackURLs (line 13) + uploadVoiceMemo (line 25)
**Verification**: PASS (all 5 Stage 2 agents)
**Findings**:
- PASS: All five agents correct on all described behaviors.
- PASS: No `finally` block confirmed. No `try`/`catch`/`finally` in entire 62-line file.
- PASS: `revokeAllFallbackURLs` exported, never called internally — confirmed.
- PASS: Function never throws / rejects in normal operation — behavioral contract, not structural.
- PASS: `getPublicUrl` synchronous and not awaited — confirmed. No error field on `getPublicUrl` in Supabase JS v2.

**Cross-Agent Consensus Summary**: All five PASS. No false claims from any agent.

### needs_review
- **Storage bucket name `'debate-audio'` (line 47, 60)**: Hardcoded. Cannot be verified from source alone — requires live Supabase project check. If bucket was provisioned under a different name, all uploads silently fall to local-fallback.
- **`data.path` from `upload()` discarded**: Server-confirmed storage path ignored; locally-constructed path used for `getPublicUrl`. Low risk in practice (Supabase echoes back supplied path) but implicit correctness assumption.
- **`_fallbackObjectURLs` unbounded growth**: Entire session's fallback URLs accumulate; caller must call `revokeAllFallbackURLs` to prevent leak. No internal cap. Confirm this is called in voicememo.ts teardown.
- **No `finally` block (cross-cutting pattern)**: If caller manages UI state around `uploadVoiceMemo`, an unexpected throw leaves caller state corrupted. Matches audit Medium pattern from B36/B39 findings.
- **`debateId` unsanitized in storage path**: No validation applied before path construction.
- **`blob.type` empty string edge case**: If browser sets `blob.type = ''`, upload proceeds with `contentType: ''` and extension defaults to `.webm`. No user warning, no validation.
