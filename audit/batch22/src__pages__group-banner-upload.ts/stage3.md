# Stage 3 Outputs — group-banner-upload.ts

## Agent 01

### openBannerUploadSheet (line 15)
**Verification**: PASS
**Findings**:
- All 5 agents claim it reads 4 parameters (`groupId`, `currentTier`, `wins`, `losses`) — confirmed by source line 15.
- All agents claim it removes any existing `#gb-backdrop` first — confirmed by line 16: `document.getElementById('gb-backdrop')?.remove()`.
- All agents claim `total = wins + losses`, `winRate = Math.round((wins / total) * 100)` if `total > 0` else `0` — confirmed lines 18-19.
- All agents claim `t2Unlocked = currentTier >= 2`, `t3Unlocked = currentTier >= 3` — confirmed lines 20-21.
- All agents claim two `div`s are created (`gb-backdrop`/id `gb-backdrop`, and `gb-sheet`) — confirmed lines 23-28.
- All agents claim the innerHTML interpolates `wins`, `losses`, `winRate`, `currentTier` and the unlock booleans without escaping — confirmed lines 29-50.
- All agents claim conditional rendering of `#gb-t2-btn`/`#gb-t2-input` (accept `image/*`) and `#gb-t3-btn`/`#gb-t3-input` (accept `video/*,image/gif`) — confirmed lines 43, 49.
- All agents claim `backdrop.appendChild(sheet)` then `document.body.appendChild(backdrop)` — confirmed lines 52-53.
- All agents claim 4 listeners: T2 click → triggers input click; T2 change → reads `files?.[0]` and awaits `_uploadBanner(groupId, file, 'static', backdrop)`; same for T3 with `'animated'` — confirmed lines 55-65.
- All agents claim backdrop click listener calls `_closeSheet(backdrop)` only when `e.target === backdrop` — confirmed line 67.
- All agents claim function is synchronous, returns void — confirmed by signature line 15.

**Unverifiable claims**: None.

### _closeSheet (line 70)
**Verification**: PASS
**Findings**:
- All agents claim it takes one `HTMLElement` parameter `backdrop` — confirmed line 70.
- All agents claim it sets `backdrop.style.transition = 'opacity 0.2s'` and `backdrop.style.opacity = '0'` — confirmed lines 71-72.
- All agents claim it schedules `backdrop.remove()` via `setTimeout` with 220ms delay — confirmed line 73.
- All agents claim function is synchronous, fire-and-forget, returns void, no branches/error handling — confirmed by signature line 70 and structure.

**Unverifiable claims**: None.

### _uploadBanner (line 76)
**Verification**: PASS
**Findings**:
- All agents claim it's `async`, takes `groupId`, `file`, `type` (`'static' | 'animated'`), `backdrop` — confirmed line 76.
- All agents claim early-return if `file.size > 10 * 1024 * 1024` with `showToast('File too large — max 10MB', 'error')`, no button reset (button not yet queried) — confirmed line 77.
- All agents claim `btn` queried as `#gb-t2-btn` for static, `#gb-t3-btn` for animated; if non-null sets `disabled=true` and `textContent='UPLOADING…'` — confirmed lines 79-80.
- All agents claim button mutation happens outside `try` block (LM-GB-001) — confirmed: `try` starts at line 82, button mutation on line 80.
- All agents claim `getSupabaseClient()` called inside try, throws `new Error('Not connected')` if falsy — confirmed lines 83-84.
- All agents claim `ext = file.name.split('.').pop() ?? ('jpg' for static / 'mp4' for animated)` — confirmed line 86.
- All agents claim `path = ${groupId}/${type}.${ext}` — confirmed line 87.
- All agents claim awaits `client.storage.from('group-banners').upload(path, file, { upsert: true, contentType: file.type })`, throws `new Error(upErr.message)` if `upErr` — confirmed lines 89-92.
- All agents claim awaits `createSignedUrl(path, 60 * 60 * 24 * 365)` (1 year), throws `new Error('Could not get URL')` if `signErr` or no `signedUrl` — confirmed lines 94-97.
- All agents claim awaits `safeRpc('save_group_banner', { p_group_id, p_static_url, p_animated_url })` with conditional URLs based on type — confirmed lines 100-104.
- All agents claim throws `new Error(error.message ?? 'Save failed')` if `error` truthy — confirmed line 105.
- All agents claim casts `data` to `{ error?: string } | null`, throws `new Error(result.error)` if truthy — confirmed lines 106-107.
- All agents claim success: `showToast('Banner updated ✓', 'success')`, `_closeSheet(backdrop)`, `window.dispatchEvent(new CustomEvent('group-banner-updated', { detail: { groupId } }))` — confirmed lines 109-111.
- All agents claim `catch (err)` calls `showToast((err as Error).message || 'Upload failed', 'error')` and resets button if non-null — confirmed lines 112-114.
- All agents claim no `finally` block — confirmed by source structure (catch ends at line 115, function ends line 116).
- All agents claim returns `Promise<void>` — confirmed line 76.

**Unverifiable claims**: None.

## Cross-Agent Consensus Summary

| Verdict | Count |
|---------|-------|
| PASS | 3 (openBannerUploadSheet, _closeSheet, _uploadBanner) |
| PARTIAL | 0 |
| FAIL | 0 |

All 5 Stage 2 agents (Agent 01–05) produced consistent and accurate descriptions. No disagreements on any substantive claim.

## needs_review

None. Stage 2 covered all 3 functions in the file, no behavior missed.

## Agent 02

### openBannerUploadSheet (line 15)
**Verification**: PASS
**Findings**: All claims confirmed: 4 parameters; `getElementById('gb-backdrop')?.remove()` at line 16; `total`/`winRate`/`t2Unlocked`/`t3Unlocked` math at lines 18-21; two divs created at lines 23-28; innerHTML interpolation at lines 29-50; tier-conditional buttons/inputs at lines 43, 49; appendChild calls at lines 52-53; 4 listener wirings at lines 55-65; backdrop close-on-self at line 67; synchronous void return.
**Unverifiable claims**: None.

### _closeSheet (line 70)
**Verification**: PASS
**Findings**: All claims confirmed: single `backdrop` HTMLElement parameter at line 70; `transition='opacity 0.2s'` line 71; `opacity='0'` line 72; `setTimeout` 220ms calling `remove()` at line 73; synchronous void, fire-and-forget.
**Unverifiable claims**: None.

### _uploadBanner (line 76)
**Verification**: PASS
**Findings**: All claims confirmed: async, 4 parameters at line 76; oversize early-return at line 77; btn query and mutation at lines 79-80 (outside try); `getSupabaseClient()` and 'Not connected' throw at lines 83-84; ext/path computation at lines 86-87; storage upload await with upErr throw at lines 89-92; createSignedUrl with 1-year TTL and 'Could not get URL' throw at lines 94-97; signedUrl assignment at line 98; safeRpc save_group_banner at lines 100-104; error.message throw at line 105; data cast and result.error throw at lines 106-107; success path showToast/_closeSheet/dispatchEvent at lines 109-111; catch block showToast and conditional btn restore at lines 112-115; no finally; returns Promise<void>; awaited calls in order: upload → createSignedUrl → safeRpc.
**Unverifiable claims**:
- Agent 02/04 claims about `safeRpc` retry behavior depend on `auth.rpc.ts`; not verifiable from this file.
- Claims about `showToast` behavior defined in `config.ts`; not verifiable from this file.

### Cross-Agent Consensus Summary
- 3 functions, all PASS. No PARTIAL, no FAIL.
- No substantive disagreements between agents.

### needs_review
None.

## Agent 03

### openBannerUploadSheet (line 15)
**Verification**: PASS
**Findings**: All claims confirmed line by line. Agent 05's claim about locked-row "Unlocks at 26%/51%" copy confirmed at lines 42, 48.
**Unverifiable claims**: None.

### _closeSheet (line 70)
**Verification**: PASS
**Findings**: All claims confirmed.
**Unverifiable claims**: None.

### _uploadBanner (line 76)
**Verification**: PASS
**Findings**: All claims confirmed line by line including LM-GB-001 button-stuck-on-pre-try-throw observation, sequential await order, error and result.error double-throw paths, success path event dispatch.
**Unverifiable claims**: None.

### Cross-Agent Consensus Summary
- 3 PASS, 0 PARTIAL, 0 FAIL.
- All 5 agents converge on the same control flow.

### needs_review
None.

## Agent 04

### openBannerUploadSheet (line 15)
**Verification**: PASS
**Findings**: All ~20 distinct claims confirmed against source.
**Unverifiable claims**: None.

### _closeSheet (line 70)
**Verification**: PASS
**Findings**: All claims confirmed.
**Unverifiable claims**: None.

### _uploadBanner (line 76)
**Verification**: PASS
**Findings**: All claims confirmed.
- Agent 05's phrasing "throws that string" for `result.error` is loose — source actually throws `new Error(result.error)`. Functionally PASS but phrasing PARTIAL on that one line.
**Unverifiable claims**: None.

### Cross-Agent Consensus Summary
- 3 PASS overall. ~59 claims PASS, 1 minor phrasing PARTIAL (Agent 05 wrapping detail), 0 FAIL.
- No substantive disagreements.

### needs_review
None.

## Agent 05

### openBannerUploadSheet (line 15)
**Verification**: PASS
**Findings**: All claims confirmed against source. Agent 02's note that "groupId is not interpolated into HTML" confirmed — `groupId` only used in event handler closures, not in template literal.
**Unverifiable claims**: None.

### _closeSheet (line 70)
**Verification**: PASS
**Findings**: All claims confirmed.
**Unverifiable claims**: None.

### _uploadBanner (line 76)
**Verification**: PASS
**Findings**: All claims confirmed including LM-GB-001 observation, await order, both error throw paths, no finally block.
- Agent 05 phrasing "throws that string" noted as PARTIAL (source wraps in `new Error()`), other agents quoted correctly.
**Unverifiable claims**:
- Internal behavior of `safeRpc`, `getSupabaseClient`, `showToast` — defined in other files.

### Cross-Agent Consensus Summary
- 3 functions, all PASS. 0 PARTIAL, 0 FAIL.
- No substantive disagreements.

### needs_review
None.
