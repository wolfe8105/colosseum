# Stage 2 Outputs — voicememo.upload.ts

## Agent 01

### revokeAllFallbackURLs

`revokeAllFallbackURLs` is a synchronous exported function that takes no parameters. It operates on the module-level `_fallbackObjectURLs: string[]` array, which is shared across the module lifetime and accumulates object URLs whenever `uploadVoiceMemo` falls back to a local object URL.

The function enters a `while` loop that continues as long as `_fallbackObjectURLs.length` is truthy. On each iteration it calls `_fallbackObjectURLs.pop()`, removing and returning the last element. Because `pop()` on a non-empty array returns `string | undefined`, the code guards with `if (u)` before calling `URL.revokeObjectURL(u)`. In practice the guard never skips a real URL — the array only contains non-empty strings pushed by `uploadVoiceMemo`. Each `URL.revokeObjectURL(u)` call invalidates the blob URL and frees the associated browser memory. The loop exits when the array is empty. No toast, no logging, no network calls. The function returns void. If `URL.revokeObjectURL` were to throw, the exception would propagate uncaught and any remaining URLs would not be revoked. Calling it on an already-empty array is a no-op.

### uploadVoiceMemo

`uploadVoiceMemo` is an exported async function taking `blob: Blob` and `debateId: string | null`, returning `Promise<UploadResult>`. It always resolves — it never rejects. All error paths return a valid `UploadResult` rather than throwing.

**Branch 1 — Blob exceeds 5 MB:** If `blob.size > MAX_FILE_BYTES` (5,242,880 bytes), computes `sizeMB` as `(blob.size / 1024 / 1024).toFixed(1)`, calls `showToast(...)` with a warning embedding `sizeMB`, creates a blob object URL, pushes it to `_fallbackObjectURLs`, and returns `{ url, path: 'local-fallback' }`. No Supabase interaction. No auth check.

**Branch 2 — No Supabase client or placeholder mode:** After size check, calls `getSupabaseClient()`. If falsy, or if `getIsPlaceholderMode()` returns true (short-circuit `||`), creates a blob object URL, pushes to `_fallbackObjectURLs`, logs `'[PLACEHOLDER] Voice memo stored locally: <url>'` (no toast), and returns `{ url, path: 'placeholder/' + Date.now() + '.webm' }`. The extension is always `.webm` regardless of `blob.type`.

**Branch 3 (happy path):** Calls `getCurrentUser()`; if truthy uses `user.id`, otherwise uses `'placeholder-user'`. Determines extension: if `blob.type.includes('mp4')`, `ext = 'mp4'`; otherwise `ext = 'webm'`. Constructs path: `` `voice-memos/${userId}/${debateId ?? 'take'}_${Date.now()}.${ext}` `` — `debateId` null becomes `'take'`. Awaits `supabase.storage.from('debate-audio').upload(path, blob, { contentType: blob.type, upsert: false })`. If upload returns no error, calls `supabase.storage.from('debate-audio').getPublicUrl(path)` (synchronous, no `await`), and returns `{ url: urlData.publicUrl, path }`. `_fallbackObjectURLs` is not mutated on success.

**Branch 4 — Upload error:** If `error` is truthy after the await, calls `console.error('Upload failed:', error)`, calls `showToast('⚠️ Upload failed. Saved locally.')`, creates a blob object URL, pushes to `_fallbackObjectURLs`, returns `{ url, path: 'local-fallback' }`.

There is no try/catch anywhere in the function. Any synchronous throw from `getSupabaseClient()`, `getCurrentUser()`, `URL.createObjectURL()`, or a rejection from the upload await would propagate as an unhandled promise rejection.

---

## Agent 02

### revokeAllFallbackURLs

`revokeAllFallbackURLs` is a synchronous exported function with no parameters. It drains the module-level `_fallbackObjectURLs: string[]` array and releases every object URL it contains. The function enters a `while` loop that continues as long as `_fallbackObjectURLs.length` is truthy. On each iteration it calls `_fallbackObjectURLs.pop()`, assigning the result to `u`. The `if (u)` guard defends against `undefined` before calling `URL.revokeObjectURL(u)`. After the loop, the array is empty. No toast, no logging, no network calls. No try/catch; an exception from `URL.revokeObjectURL` would propagate uncaught leaving remaining entries unrevoked.

### uploadVoiceMemo

`uploadVoiceMemo` is an exported async function taking `blob: Blob` and `debateId: string | null`, always resolving to `UploadResult = { url: string; path: string }`. It never rejects — all error conditions return fallback results.

**Branch 1 — Size exceeded:** `blob.size > MAX_FILE_BYTES` (5,242,880). Computes `sizeMB` to one decimal, calls `showToast(...)`, creates object URL, pushes to `_fallbackObjectURLs`, returns `{ url, path: 'local-fallback' }`. No Supabase, no auth.

**Branch 2 — No client or placeholder mode:** Calls `getSupabaseClient()`; if falsy or `getIsPlaceholderMode()` true, creates object URL, pushes to `_fallbackObjectURLs`, logs `[PLACEHOLDER]` to console (no toast), returns `{ url, path: 'placeholder/' + Date.now() + '.webm' }`. Path extension is always `.webm`.

**Branch 3 — Upload success:** Resolves `userId` from `getCurrentUser()` or fallback `'placeholder-user'`. Derives `ext` from `blob.type.includes('mp4')`. Constructs `path = voice-memos/<userId>/<debateId ?? 'take'>_<Date.now()>.<ext>`. Awaits upload with `upsert: false`. On success calls synchronous `getPublicUrl(path)` and returns `{ url: urlData.publicUrl, path }`.

**Branch 4 — Upload error:** `console.error`, `showToast('⚠️ Upload failed. Saved locally.')`, creates object URL, pushes to `_fallbackObjectURLs`, returns `{ url, path: 'local-fallback' }`.

No try/catch anywhere. If any intermediate call throws or the upload rejects, the promise rejects to the caller. `getPublicUrl` return value is not checked for errors.

---

## Agent 03

### revokeAllFallbackURLs

`revokeAllFallbackURLs` takes no parameters and returns `void`. It drains the module-level `_fallbackObjectURLs` array via a `while` loop: on each iteration `pop()` removes the last element; if the element is truthy `URL.revokeObjectURL()` releases it. Continues until the array is empty. Calling it on an empty array is a no-op. No try/catch: an exception from `URL.revokeObjectURL` propagates uncaught and halts the loop, leaving remaining entries unrevoked.

### uploadVoiceMemo

An exported async function, always resolves to `UploadResult`, never rejects in documented paths.

**Oversized blob:** `blob.size > 5,242,880` → format `sizeMB` to one decimal, `showToast` warning, `URL.createObjectURL`, push to `_fallbackObjectURLs`, return `{ url, path: 'local-fallback' }`.

**No client or placeholder:** `getSupabaseClient()` falsy or `getIsPlaceholderMode()` true → `URL.createObjectURL`, push to `_fallbackObjectURLs`, `console.log('[PLACEHOLDER] ...')` (no toast), return `{ url, path: 'placeholder/' + Date.now() + '.webm' }`. Extension always `.webm` regardless of blob type.

**Normal upload:** `getCurrentUser()` for `userId` (fallback `'placeholder-user'`); `blob.type.includes('mp4')` for extension; path = `` `voice-memos/${userId}/${debateId ?? 'take'}_${Date.now()}.${ext}` ``; await `upload(path, blob, { contentType: blob.type, upsert: false })`; on success call synchronous `getPublicUrl(path)` and return `{ url: urlData.publicUrl, path }`.

**Upload error:** `console.error`, `showToast('⚠️ Upload failed. Saved locally.')`, `URL.createObjectURL`, push to `_fallbackObjectURLs`, return `{ url, path: 'local-fallback' }`.

No try/catch. Unhandled exceptions from helpers or a promise rejection from the upload await propagate out. `debateId` of empty string `''` passes through as-is (only `null`/`undefined` triggers the `'take'` substitution).

---

## Agent 04

### revokeAllFallbackURLs

`revokeAllFallbackURLs` is a synchronous exported function with no parameters. It uses a `while (_fallbackObjectURLs.length)` loop, calling `pop()` and then `URL.revokeObjectURL(u)` (with `if (u)` guard) on each iteration. Empties the array completely in LIFO order. If `URL.revokeObjectURL` throws, the exception propagates uncaught and remaining entries are not revoked. No toast, no logging, no network calls. Idempotent — calling on empty array exits immediately.

### uploadVoiceMemo

Exported async function: `(blob: Blob, debateId: string | null): Promise<UploadResult>`. Always resolves to `{ url, path }`. Never rejects documented paths.

**Branch 1 (size guard):** `blob.size > MAX_FILE_BYTES` → `sizeMB = (blob.size / 1048576).toFixed(1)` → `showToast` warning → `URL.createObjectURL(blob)` → push to `_fallbackObjectURLs` → return `{ url, path: 'local-fallback' }`.

**Branch 2 (no client/placeholder):** After size check, `getSupabaseClient()` returns falsy or `getIsPlaceholderMode()` returns true → `URL.createObjectURL` → push to `_fallbackObjectURLs` → `console.log('[PLACEHOLDER] ...')` → return `{ url, path: 'placeholder/' + Date.now() + '.webm' }`. The `.webm` extension is hardcoded; `Date.now()` evaluated at return.

**Branch 3 (success):** `getCurrentUser()` → `userId = user ? user.id : 'placeholder-user'`; `ext = blob.type.includes('mp4') ? 'mp4' : 'webm'`; path constructed with `debateId ?? 'take'` and `Date.now()`; `await supabase.storage.from('debate-audio').upload(path, blob, { contentType: blob.type, upsert: false })`; `getPublicUrl(path)` called synchronously; return `{ url: urlData.publicUrl, path }`. `_fallbackObjectURLs` not mutated.

**Branch 4 (upload error):** `error` truthy → `console.error('Upload failed:', error)` → `showToast('⚠️ Upload failed. Saved locally.')` → `URL.createObjectURL` → push to `_fallbackObjectURLs` → return `{ url, path: 'local-fallback' }`.

No try/catch. Throws from `getSupabaseClient`, `getCurrentUser`, `URL.createObjectURL`, or a rejected upload promise propagate as unhandled rejections. `getPublicUrl` result is not error-checked; if `urlData.publicUrl` is undefined, `undefined` is silently returned as the URL. `Date.now()` collision with `upsert: false` could cause an upload error on rapid sequential calls with same userId/debateId.

---

## Agent 05

### revokeAllFallbackURLs

Synchronous, no parameters, returns void. `while (_fallbackObjectURLs.length)` loop: `pop()` each element, `if (u)` guard, `URL.revokeObjectURL(u)`. Drains `_fallbackObjectURLs` completely. No try/catch. Exception from `URL.revokeObjectURL` propagates uncaught leaving remaining entries. Empty-array call is no-op.

### uploadVoiceMemo

Exported async function `(blob: Blob, debateId: string | null): Promise<UploadResult>`. Always resolves, never rejects in documented paths. Four branches:

**Path 1 — Size exceeded:** `blob.size > 5,242,880` → compute `sizeMB` to one decimal → `showToast` warning → `URL.createObjectURL` → push to `_fallbackObjectURLs` → return `{ url, path: 'local-fallback' }`.

**Path 2 — No client or placeholder:** `getSupabaseClient()` falsy or `getIsPlaceholderMode()` true → `URL.createObjectURL` → push to `_fallbackObjectURLs` → `console.log('[PLACEHOLDER] Voice memo stored locally:', url)` (no toast) → return `{ url, path: 'placeholder/' + Date.now() + '.webm' }`. Path extension always `.webm`.

**Path 3 — Upload success:** `userId = getCurrentUser()?.id ?? 'placeholder-user'` logic; `ext` from `blob.type.includes('mp4')`; path = `` `voice-memos/${userId}/${debateId ?? 'take'}_${Date.now()}.${ext}` ``; `await supabase.storage.from('debate-audio').upload(path, blob, { contentType: blob.type, upsert: false })`; synchronous `getPublicUrl(path)`; return `{ url: urlData.publicUrl, path }`.

**Path 4 — Upload error:** `error` truthy → `console.error` → `showToast('⚠️ Upload failed. Saved locally.')` → `URL.createObjectURL` → push to `_fallbackObjectURLs` → return `{ url, path: 'local-fallback' }`.

No try/catch anywhere. Unhandled exceptions/rejections propagate out. `getPublicUrl` not awaited and not error-checked. `debateId` empty string `''` passes through as-is. Unauthenticated calls proceed with `userId = 'placeholder-user'`.
