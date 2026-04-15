# Stage 3 Outputs — src/intro-music.ts

## Agent 01

### _injectCSS
| Claim | Verdict |
|-------|---------|
| Reads module-level boolean `_cssInjected`, initialized to `false` | PASS |
| If `_cssInjected` is already `true`, returns immediately | PASS |
| On first call: sets `_cssInjected = true`, creates `<style>` element, assigns CSS string to `s.textContent`, appends to `document.head` | PASS |
| CSS covers all picker classes + keyframes `imFadeIn` and `imSlideUp` | PASS |
| Synchronous, returns nothing | PASS |

### openIntroMusicPicker
| Claim | Verdict |
|-------|---------|
| Exported, synchronous | PASS |
| Calls `_injectCSS()` first | PASS |
| Calls `getCurrentProfile()` to read profile | PASS |
| Derives `currentId` (intro_music_id, default 'gladiator') | PASS |
| Derives `currentUrl` (custom_intro_url, default null) | PASS |
| Derives `depthPct` (profile_depth_pct, default 0) | PASS |
| Derives `tier2Unlocked` (depthPct >= 35) | PASS |
| Removes existing `im-backdrop` element from DOM | PASS |
| Creates `div.im-backdrop` with id `im-backdrop`, creates `div.im-sheet` | PASS |
| Builds tier2Html: if unlocked → upload button + hidden file input; if locked → shows current depthPct rounded | PASS |
| Sheet innerHTML includes: drag handle, title, subtitle, track grid from INTRO_TRACKS map (using `escapeHTML` on label/description), tier2Html, save button | PASS |
| Backdrop appended to `document.body` | PASS |
| Closure state: `selectedId` (= currentId), `pendingFile` (= null), `pendingUrl` (= currentUrl) | PASS |
| Track buttons: click listener, early-returns if `.im-preview-btn` clicked via `.closest()` | PARTIAL — claim says "if `.im-preview-btn` clicked" which omits that `.closest()` also catches clicks on any descendant of `.im-preview-btn` |
| Track buttons: else sets selectedId, clears pendingFile, calls `_refreshSelected(sheet, selectedId)` | PASS |
| Preview buttons: click calls `e.stopPropagation()` then `playIntroMusic(btn.dataset.preview!)` | PASS |
| Upload button: click delegates to `fileInput.click()` | PASS |
| File input change: reads files[0], returns if absent | PASS |
| If > 5MB calls `showToast('File too large — max 5MB', 'error')` and returns | PASS |
| Else sets pendingFile, selectedId='custom', updates uploadBtn.textContent with escaped filename (truncated to 28 chars), calls `_refreshSelected(sheet, 'custom')`, creates object URL, calls `playIntroMusic('custom', localUrl)` | PASS |
| Save button: async click, disables button, text='SAVING…', awaits `_saveIntroMusic(selectedId, pendingFile, pendingUrl)` | PASS |
| On success: showToast success + `_close(backdrop)` | PASS |
| On error: showToast error, re-enable, text='SAVE' | PASS |
| Backdrop click: calls `_close(backdrop)` only when `e.target === backdrop` | PASS |

### _refreshSelected
| Claim | Verdict |
|-------|---------|
| Takes `sheet: HTMLElement` and `id: string` | PASS |
| Queries all `.im-track-btn` within sheet, toggles `selected` class based on `dataset.id === id` | PASS |
| Queries `#im-upload-btn` within sheet, toggles `selected` based on `id === 'custom'` | PASS |
| Synchronous, returns nothing | PASS |

### _close
| Claim | Verdict |
|-------|---------|
| Takes `backdrop: HTMLElement` | PASS |
| Sets `backdrop.style.opacity = '0'` and `backdrop.style.transition = 'opacity 0.2s'` | PASS |
| Calls `setTimeout(() => backdrop.remove(), 220)` | PASS |
| 220ms > 200ms transition, element removed after fade completes | PASS |
| Synchronous, returns nothing | PASS |

### _saveIntroMusic
| Claim | Verdict |
|-------|---------|
| Async, takes `trackId: string`, `file: File | null`, `existingUrl: string | null | undefined` | PASS |
| Declares `uploadedUrl: string | undefined`, initially undefined | PASS |
| If `trackId === 'custom'` and `file` is truthy: calls `getSupabaseClient()` (throws 'Not connected' if falsy) | PASS |
| Calls `getCurrentProfile()` (throws 'Not signed in' if falsy) | PASS |
| Derives path `${profile.id}/intro.${ext}` (ext from filename, default 'mp3') | PASS |
| Awaits `client.storage.from('intro-music').upload(path, file, { upsert: true, contentType: file.type })`, throws on error | PASS |
| Awaits `createSignedUrl(path, 60 * 60 * 24 * 365)` (one year = 31,536,000 seconds) | PARTIAL — claim presents value as literal `31536000`; source uses the arithmetic expression `60 * 60 * 24 * 365` |
| Throws if error or no signedUrl, sets uploadedUrl | PASS |
| If `trackId === 'custom'` and no file but existingUrl: sets uploadedUrl = existingUrl | PASS |
| If `trackId === 'custom'` and neither: throws 'No file selected' | PASS |
| If trackId !== 'custom': skips block, uploadedUrl remains undefined | PASS |
| Always awaits `safeRpc('save_intro_music', { p_track_id: trackId, p_custom_url: uploadedUrl ?? null })` | PASS |
| Throws if error in RPC response | PASS |
| Casts data as `{ error?: string } | null`, throws if `result?.error` present | PASS |
| On success: calls `getCurrentProfile()` again, mutates profile in place: `intro_music_id = trackId`, `custom_intro_url = uploadedUrl ?? null` | PARTIAL — claim omits (a) the `if (profile)` guard wrapping the mutation and (b) the `as Record<string, unknown>` cast required to write to the typed profile |
| Returns Promise<void>, propagates all errors | PASS |

**Agent 01 summary:** 3 PARTIALs, 0 FAILs. Minor omissions. The `.closest()` traversal detail, the TTL expression form, and the profile mutation guard are the notable gaps.

---

## Agent 02

### _injectCSS
| Claim | Verdict |
|-------|---------|
| Synchronous, void, no parameters | PASS |
| Reads `_cssInjected`; if true, returns immediately | PASS |
| On first call: sets `_cssInjected = true`, creates `<style>`, assigns CSS string to `s.textContent`, appends to `document.head` | PASS |
| Every subsequent call is a no-op | PASS |

### openIntroMusicPicker
| Claim | Verdict |
|-------|---------|
| Synchronous, exported, void, no parameters | PASS |
| Calls `_injectCSS()`, then `getCurrentProfile()` | PASS |
| Reads `intro_music_id` (default 'gladiator'), `custom_intro_url` (default null), `profile_depth_pct` (default 0), derives `tier2Unlocked` (>= 35) | PASS |
| Removes pre-existing `im-backdrop` element via optional chaining | PASS |
| Builds tier2Html: if unlocked → upload button + hidden file input; if locked → message with `Math.round(depthPct)` interpolated directly (not through escapeHTML, but numeric) | PASS |
| Sheet innerHTML includes track grid from INTRO_TRACKS map with escapeHTML on label/description | PASS |
| Backdrop appended to `document.body` | PASS |
| Closure vars: `selectedId` (currentId), `pendingFile` (null), `pendingUrl` (currentUrl) | PASS |
| Track click: early-return if `.im-preview-btn`, else update selectedId, clear pendingFile, call `_refreshSelected` | PARTIAL — guard is `.closest('.im-preview-btn')` on the event target; catches descendants too, not just direct `.im-preview-btn` target |
| Preview click: stopPropagation + playIntroMusic | PASS |
| Upload click: delegates to fileInput.click() | PARTIAL — both `uploadBtn` and `fileInput` are acquired with optional chaining; the click handler is only attached if uploadBtn is non-null, and it calls `fileInput?.click()` (also optional-chained). Claim omits that both operations are guarded and silently no-op if elements are absent |
| File change: reads files[0], if > 5MB showToast error + return, else set pendingFile, selectedId='custom', update uploadBtn.textContent with truncated filename through escapeHTML, _refreshSelected, createObjectURL, playIntroMusic | PARTIAL — textContent assignment (not innerHTML) makes the `escapeHTML` call functionally redundant for XSS purposes, though the call is present. Also omits the `if (!file) return` guard preceding the size check |
| Save click: async, disable, 'SAVING…', await _saveIntroMusic, success → showToast + _close; error → showToast, re-enable, 'SAVE' | PARTIAL — handler opens with `if (!saveBtn) return` as a redundant guard (saveBtn confirmed non-null by the `?.addEventListener` pattern); claim omits this dead guard |
| Backdrop click: _close only when e.target === backdrop | PASS |

### _refreshSelected
| Claim | Verdict |
|-------|---------|
| Takes `sheet: HTMLElement`, `id: string` | PASS |
| Queries `.im-track-btn` within sheet, toggles `selected` based on `dataset.id === id` | PARTIAL — each element is cast to `HTMLElement` to access `.dataset.id`; claim omits cast detail |
| Queries `#im-upload-btn` within sheet, toggles `selected` based on `id === 'custom'` | PARTIAL — toggle is guarded with `if (uploadBtn)` — silently no-op when element absent; claim omits this guard |
| Synchronous, writes only to DOM, returns void | PASS |

### _close
| Claim | Verdict |
|-------|---------|
| Takes `backdrop: HTMLElement` | PASS |
| Sets opacity '0' and transition 'opacity 0.2s' | PARTIAL — source sets `opacity = '0'` first, then `transition = 'opacity 0.2s'`. Setting the transition after the opacity change means the fade animation likely does not trigger in practice |
| Calls `setTimeout(() => backdrop.remove(), 220)` | PASS |
| No error path, synchronous, returns void | PASS |
| The setTimeout callback is fire-and-forget; no mechanism to cancel it | PASS |

### _saveIntroMusic
| Claim | Verdict |
|-------|---------|
| Async, takes `trackId: string`, `file: File | null`, `existingUrl: string | null | undefined` | PASS |
| Declares `uploadedUrl: string | undefined`, initially unset | PASS |
| If trackId === 'custom' and file truthy: getSupabaseClient (throw if falsy), getCurrentProfile (throw if falsy), derives path `${profile.id}/intro.${ext}` (ext from filename, default 'mp3'), upload with upsert:true + contentType, throw if upErr | PASS |
| createSignedUrl(path, 31536000), throw if error or no signedUrl, set uploadedUrl | PARTIAL — source uses `60 * 60 * 24 * 365` expression; claim presents it as literal. Condition checks `signedData?.signedUrl` (nested property), not just `signedData` |
| If trackId === 'custom' and no file + existingUrl truthy: uploadedUrl = existingUrl | PASS |
| If trackId === 'custom' and both falsy: throw 'No file selected' | PARTIAL — thrown value is `new Error('No file selected')`, not a bare string |
| If trackId !== 'custom': skip block, uploadedUrl remains undefined | PASS |
| Always: await safeRpc('save_intro_music', { p_track_id, p_custom_url: uploadedUrl ?? null }) | PARTIAL — source uses explicit `{ p_track_id: trackId, p_custom_url: uploadedUrl ?? null }` not ES6 shorthand |
| Throw if error in response | PASS |
| Cast data as `{ error?: string } | null`, throw if result?.error | PASS |
| On success: getCurrentProfile() again, mutate in place: intro_music_id = trackId, custom_intro_url = uploadedUrl ?? null | PARTIAL — mutation is guarded with `if (profile)`; if getCurrentProfile() returns null, the in-memory update is silently skipped |
| Returns Promise<void>, propagates all errors | PASS |

**Agent 02 summary:** 11 PARTIALs, 0 FAILs. Most thorough omission-catching of the batch. Notably flags: opacity-before-transition ordering in `_close`, `textContent` + `escapeHTML` redundancy, null guards in `_refreshSelected` and upload button handlers, and the bare-string vs `new Error()` distinction.

---

## Agent 03

### _injectCSS
| Claim | Verdict |
|-------|---------|
| Takes no parameters, reads `_cssInjected` (module-level boolean, initialized false) | PASS |
| If `_cssInjected` is true, returns immediately | PASS |
| On first call: sets `_cssInjected = true`, calls `document.createElement('style')`, assigns CSS string to `textContent`, appends to `document.head` | PASS |
| Returns void, synchronous, writes nothing beyond `_cssInjected` | PASS |

### openIntroMusicPicker
| Claim | Verdict |
|-------|---------|
| Synchronous, no parameters | PASS |
| Calls `_injectCSS()` first | PASS |
| Calls `getCurrentProfile()` to read profile | PASS |
| Reads `intro_music_id` (default 'gladiator'), `custom_intro_url` (default null), `profile_depth_pct` (default 0) | PASS |
| Derives `tier2Unlocked` (depthPct >= 35) | PASS |
| Removes pre-existing `im-backdrop` element | PARTIAL — omits that the new `backdrop` div is also given `id="im-backdrop"` (not just a class) |
| Creates `div.im-backdrop` and `div.im-sheet` | PASS |
| Sheet innerHTML: maps INTRO_TRACKS with `escapeHTML` on label/description, marks matching currentId as selected, adds tier2Html, save button | PASS |
| tier2Html: if unlocked → upload button + hidden file input; if locked → message with rounded depthPct | PARTIAL — upload button label is conditional on `currentId === 'custom' && currentUrl` ('Replace custom intro' vs 'Upload your intro (≤10 sec)'); Stage 2 omits this conditional text |
| Backdrop appended to `document.body` | PASS |
| Closure state: `selectedId` (= currentId), `pendingFile` (= null), `pendingUrl` (= currentUrl) | PASS |
| Track buttons: click checks `.im-preview-btn` via closest(), returns early if so, else updates selectedId, clears pendingFile, calls _refreshSelected | PARTIAL — `pendingUrl` is NOT reset when a standard track is selected; only `pendingFile` is nulled. Stale `pendingUrl` can persist across track switches |
| Preview buttons: stopPropagation + playIntroMusic(btn.dataset.preview!) | PASS |
| Upload button: click delegates to fileInput?.click() | PASS |
| File input change: reads files?.[0], returns if absent; if > 5MB showToast error return; else pendingFile=file, selectedId='custom', updates uploadBtn.textContent (filename truncated to 28, through escapeHTML), _refreshSelected, createObjectURL, playIntroMusic('custom', localUrl) | PARTIAL — textContent with emoji prefix: `` `🎵 ${escapeHTML(file.name.slice(0, 28))}` ``; the emoji prefix was omitted |
| Save button: async click, disables, text='SAVING…', await _saveIntroMusic; success → showToast + _close; error → showToast, re-enable, text='SAVE' | PASS |
| Backdrop click: _close(backdrop) only when e.target === backdrop | PASS |

### _refreshSelected
| Claim | Verdict |
|-------|---------|
| Takes `sheet: HTMLElement`, `id: string` | PASS |
| Queries all `.im-track-btn`, toggles `selected` based on `dataset.id === id` | PASS |
| Queries `#im-upload-btn`, toggles `selected` based on `id === 'custom'` | PASS |
| Synchronous, returns void, reads no module state | PASS |

### _close
| Claim | Verdict |
|-------|---------|
| Takes `backdrop: HTMLElement` | PASS |
| Sets opacity '0' and transition 'opacity 0.2s' | PARTIAL — `opacity` is assigned before `transition`; the CSS transition is set after the opacity change has already been committed, meaning the fade animation likely does not fire |
| Calls `setTimeout(() => backdrop.remove(), 220)` | PASS |
| 220ms slightly longer than 200ms transition | PASS |
| Returns void immediately; backdrop.remove() is fire-and-forget in timer | PASS |
| No module state read or written | PASS |

### _saveIntroMusic
| Claim | Verdict |
|-------|---------|
| Async, takes `trackId: string`, `file: File | null`, `existingUrl: string | null | undefined` | PASS |
| Declares `uploadedUrl: string | undefined`, initially undefined | PASS |
| If trackId === 'custom' and file non-null: getSupabaseClient() (throw 'Not connected' if falsy), getCurrentProfile() (throw 'Not signed in' if falsy), derive path `${profile.id}/intro.${ext}` (ext from file.name, default 'mp3'), await upload (upsert:true, contentType:file.type), throw if error | PASS |
| await createSignedUrl(path, 31536000), throw if error or no signedUrl, set uploadedUrl | FAIL (corrected to PARTIAL) — claim says "31536000" as a literal; source uses `60 * 60 * 24 * 365` expression which evaluates to the same value. Arithmetically correct, notation inaccurate |
| If trackId === 'custom' and no file + existingUrl truthy: uploadedUrl = existingUrl | PASS |
| If trackId === 'custom' and both falsy: throw 'No file selected' | PASS |
| If trackId !== 'custom': skip, uploadedUrl stays undefined | PASS |
| Always: await safeRpc('save_intro_music', { p_track_id, p_custom_url: uploadedUrl ?? null }) | PARTIAL — source uses explicit key-value pairs, not shorthand; implies a local variable named `p_track_id` exists, which it does not |
| Throw if error in RPC response | PASS |
| Cast data as { error?: string } | null, throw if result?.error present | PASS |
| On success: getCurrentProfile() again, mutate profile.intro_music_id = trackId and profile.custom_intro_url = uploadedUrl ?? null | PARTIAL — mutation uses `as Record<string, unknown>` cast for each assignment; guarded by `if (profile)`; claim omits both details |
| Returns Promise<void>, all error paths throw | PASS |
| All awaits are sequential, no fire-and-forget awaits | PASS |

**Agent 03 summary:** 7 PARTIALs, 0 FAILs. Notable findings: `pendingUrl` not cleared on track switch; upload button conditional label text; opacity-before-transition ordering in `_close`.

---

## Agent 04

### _injectCSS
| Claim | Verdict |
|-------|---------|
| Reads module-level boolean `_cssInjected`, initialized to false | PASS |
| If true, returns immediately without doing anything | PASS |
| On first call: sets `_cssInjected = true`, creates `<style>`, assigns CSS string to `s.textContent` (covering all picker classes + 2 keyframe animations), appends to `document.head` | PASS |
| Synchronous, no parameters, returns void | PASS |

### openIntroMusicPicker
| Claim | Verdict |
|-------|---------|
| Synchronous in setup phase, attaches async save handler | PASS |
| Calls `_injectCSS()` to guarantee stylesheet present | PASS |
| Calls `getCurrentProfile()`, extracts `currentId` (default 'gladiator'), `currentUrl` (default null), `depthPct` (default 0), computes `tier2Unlocked` = depthPct >= 35 | PASS |
| Removes pre-existing `im-backdrop` element from DOM | PASS |
| Builds `div.im-backdrop` and `div.im-sheet` | PASS |
| Sheet innerHTML: static header, track grid from INTRO_TRACKS map (escapeHTML on label/description, selected class on matching track) | PARTIAL — `t.icon` is interpolated raw into innerHTML without `escapeHTML` (`<span class="im-track-icon">${t.icon}</span>`); `t.id` is interpolated raw into `data-id` and `data-preview` attributes. Stage 2 omitted these unescaped injection points |
| tier2 block (if unlocked: upload button + hidden file input; if locked: read-only message showing current depth) | PARTIAL — upload button label is conditional: shows "Replace custom intro" when `currentId === 'custom' && currentUrl`, else "Upload your intro (≤10 sec)". Stage 2 omits this conditional |
| SAVE button | PASS |
| Backdrop appended to `document.body` | PASS |
| Local closure state: `selectedId` (currentId), `pendingFile` (null), `pendingUrl` (currentUrl) | PASS |
| Track buttons: click ignores `.im-preview-btn` clicks, else sets selectedId to dataset.id, clears pendingFile, calls _refreshSelected | PASS |
| Preview buttons: stopPropagation + playIntroMusic(btn.dataset.preview!) | PASS |
| Upload button: click delegates to fileInput.click(); file input change reads files[0], returns if absent, showToast error if > 5MB, else pendingFile=file, selectedId='custom', update uploadBtn.textContent with truncated filename (escapeHTML), _refreshSelected, createObjectURL, playIntroMusic('custom', localUrl) | PASS |
| Save button async: disables, text='SAVING…', await _saveIntroMusic; success → showToast + _close; error → showToast, re-enable, text='SAVE' | PASS |
| Backdrop click: _close(backdrop) when e.target === backdrop | PASS |

### _refreshSelected
| Claim | Verdict |
|-------|---------|
| Takes `sheet: HTMLElement`, `id: string` | PASS |
| Queries `.im-track-btn` within sheet, toggles `selected` based on dataset.id === id | PASS |
| Queries `#im-upload-btn` within sheet, toggles `selected` based on id === 'custom' | PARTIAL — toggle is guarded by `if (uploadBtn)` null check; absent when tier2 locked |
| Synchronous, writes only to DOM, returns void | PASS |

### _close
| Claim | Verdict |
|-------|---------|
| Takes `backdrop: HTMLElement` | PASS |
| Sets opacity '0' and transition 'opacity 0.2s' | FAIL — source sets `backdrop.style.opacity = '0'` FIRST, then `backdrop.style.transition = 'opacity 0.2s'`. Setting transition after opacity means the fade animation does not fire; the element jumps to transparent immediately and is removed 220ms later. This is a functional bug undetected by Stage 2 |
| Calls setTimeout(() => backdrop.remove(), 220) | PASS |
| Synchronous, no error path, returns void | PASS |

### _saveIntroMusic
| Claim | Verdict |
|-------|---------|
| Async, takes `trackId: string`, `file: File | null`, `existingUrl: string | null | undefined` | PASS |
| Declares `uploadedUrl: string | undefined`, initially undefined | PASS |
| If trackId === 'custom' and file truthy: getSupabaseClient (throw if falsy), getCurrentProfile (throw if falsy), derive path `${profile.id}/intro.${ext}` (ext from filename, default 'mp3'), await upload (upsert:true, contentType), throw if upErr | PASS |
| await createSignedUrl(path, 31536000), throw if error or no signedUrl, set uploadedUrl | PARTIAL — TTL is expression `60 * 60 * 24 * 365` in source, not the literal 31536000; math is correct |
| If trackId === 'custom' and no file + existingUrl truthy: uploadedUrl = existingUrl without network call | PASS |
| If trackId === 'custom' and both absent: throw 'No file selected' | PASS |
| If trackId !== 'custom': skip entire block, uploadedUrl remains undefined | PASS |
| Always: await safeRpc('save_intro_music', { p_track_id, p_custom_url: uploadedUrl ?? null }) | PARTIAL — source uses explicit named params `{ p_track_id: trackId, p_custom_url: uploadedUrl ?? null }` |
| Throw if top-level error in response | PASS |
| Cast data as { error?: string } | null, throw if data.error | PASS |
| On success: getCurrentProfile() again, mutate intro_music_id = trackId, custom_intro_url = uploadedUrl ?? null (cast to Record<string, unknown>) | PARTIAL — mutation guarded by `if (profile)`; claim omits this guard |
| Returns Promise<void>, propagates all errors to caller's catch block | PASS |

**Agent 04 summary:** 1 FAIL, 5 PARTIALs. Independently confirmed the `_close` opacity-before-transition ordering bug as a FAIL. First agent to explicitly flag `t.icon` and `t.id` as unescaped in innerHTML.

---

## Agent 05

### _injectCSS
| Claim | Verdict |
|-------|---------|
| Reads `_cssInjected` (module-level boolean, false initially); if true, returns immediately | PASS |
| Otherwise: sets `_cssInjected = true`, creates `<style>`, assigns CSS string, appends to `document.head` | PASS |
| CSS defines all styles for bottom-sheet UI | PASS |
| Synchronous, returns nothing, idempotent after first call | PASS |

### openIntroMusicPicker
| Claim | Verdict |
|-------|---------|
| Synchronous, returns nothing | PASS |
| Calls `_injectCSS` first | PASS |
| Calls `getCurrentProfile()`, extracts `intro_music_id` (default 'gladiator'), `custom_intro_url` (default null), `profile_depth_pct` (default 0) | PASS |
| Derives `tier2Unlocked` (depthPct >= 35) | PASS |
| Removes existing `im-backdrop` element from DOM | PASS |
| Constructs `div.im-backdrop` with `div.im-sheet` whose innerHTML is built from INTRO_TRACKS array (escapeHTML on label and description) | PARTIAL — `t.icon` is interpolated raw into innerHTML without escaping; `t.id` is interpolated raw into `data-id` and `data-preview` attributes without escaping |
| If tier2Unlocked: file upload button + hidden file input; else locked placeholder with current depth percentage | PASS |
| Upload button initial label conditional: `currentId === 'custom' && currentUrl` → 'Replace custom intro', else 'Upload your intro (≤10 sec)' | PASS |
| Closure state: `selectedId` (currentId), `pendingFile` (null), `pendingUrl` (currentUrl) | PASS |
| Track buttons: check if `.im-preview-btn` via `.closest()`, early return if so; else update selectedId, clear pendingFile, call `_refreshSelected` | PARTIAL — `.closest()` is not strictly a descendant check; it also matches the element itself |
| Preview buttons: stopPropagation + playIntroMusic with track id | PASS |
| Upload button: triggers `fileInput.click()`; file input change reads files[0], early return if absent, showToast error if > 5MB, else set pendingFile/selectedId='custom', update button textContent with filename (truncated to 28 chars, through escapeHTML), `_refreshSelected`, `createObjectURL`, `playIntroMusic('custom', localUrl)` | PARTIAL — `pendingUrl` is NOT updated after a new file selection; only `pendingFile` and `selectedId` are updated. The pending URL remains as `currentUrl` from closure |
| Save button async: disable, 'SAVING…', await `_saveIntroMusic`; success → showToast + `_close`; error → showToast, re-enable, 'SAVE' | PASS |
| Backdrop click: `_close` only when `e.target === backdrop` | PASS |

### _refreshSelected
| Claim | Verdict |
|-------|---------|
| Accepts sheet element and track id string | PASS |
| Queries `.im-track-btn` within sheet, toggles `selected` on each based on `dataset.id === id` | PASS |
| Queries `#im-upload-btn`, toggles `selected` based on `id === 'custom'` | PASS (guarded by `if (uploadBtn)`) |
| Synchronous, returns nothing | PASS |

### _close
| Claim | Verdict |
|-------|---------|
| Accepts `backdrop` element | PASS |
| Sets opacity '0' and transition 'opacity 0.2s' | FAIL — source sets `opacity = '0'` BEFORE setting `transition = 'opacity 0.2s'`. The transition must be registered before the property change to animate; setting it after means the opacity jump is instant, not faded |
| Calls `setTimeout(() => backdrop.remove(), 220); 20ms longer than transition` | PASS |
| Synchronous, returns nothing | PASS |

### _saveIntroMusic
| Claim | Verdict |
|-------|---------|
| Async, takes `trackId: string`, `file: File | null`, `existingUrl: string | null | undefined` | PASS |
| Declares `uploadedUrl: string | undefined`, initially undefined | PASS |
| If trackId === 'custom' and file truthy: getSupabaseClient (throw if falsy), getCurrentProfile (throw if falsy), derive path `${profile.id}/intro.${ext}` (ext from file name, default 'mp3'), await upload (upsert:true, contentType), throw if error | PASS |
| await `createSignedUrl(path, 31536000)`, throw if error or no signedUrl, set uploadedUrl | PARTIAL — TTL is arithmetic expression `60 * 60 * 24 * 365` = 31,536,000 seconds in source |
| If trackId === 'custom' and no file + existingUrl truthy: uploadedUrl = existingUrl | PASS |
| If trackId === 'custom' and both falsy: throw 'No file selected' | PARTIAL — thrown as `new Error('No file selected')`, not a plain string |
| If trackId !== 'custom': skip conditional, uploadedUrl remains undefined | PASS |
| Always: await safeRpc, throw if error | PASS |
| Cast data as `{ error?: string } | null`, throw if result.error | PASS |
| On success: getCurrentProfile() again, mutate `intro_music_id` and `custom_intro_url` on profile object | PARTIAL — mutation sets `custom_intro_url` to `uploadedUrl ?? null`; when trackId !== 'custom', `uploadedUrl` is undefined, so the cache sets `custom_intro_url = null`, potentially wiping an existing custom URL from the in-memory cache when switching away from custom. Mutation is also guarded by `if (profile)` (omitted by Stage 2) |
| Returns void, propagates errors | PASS |

**Agent 05 summary:** 2 FAILs (both on `_close` ordering), 6 PARTIALs. Unique finding: `custom_intro_url` is set to `null` in the profile cache for non-custom tracks, which destructively overwrites any existing custom URL from the in-memory profile on a non-custom save.

---

## Cross-Agent Consensus

### Verdict tally by function

| Function | Agent 01 | Agent 02 | Agent 03 | Agent 04 | Agent 05 | Consensus |
|----------|----------|----------|----------|----------|----------|-----------|
| _injectCSS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| openIntroMusicPicker | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | **PARTIAL** |
| _refreshSelected | PASS | PARTIAL | PASS | PARTIAL | PASS | **PASS** |
| _close | PASS | PARTIAL | PARTIAL | FAIL | FAIL | **PARTIAL/FAIL** |
| _saveIntroMusic | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | **PARTIAL** |

**Overall: 1 PASS / 3 PARTIAL / 1 PARTIAL-FAIL (2 of 5 agents scored FAIL)**

### Items flagged by 3+ agents (needs_review candidates)

| # | Item | Agents | Severity |
|---|------|--------|----------|
| 1 | `_close`: `opacity` set before `transition` — CSS fade likely does not animate | 02, 03, 04, 05 | High (functional bug) |
| 2 | `openIntroMusicPicker`: `t.icon` not passed through `escapeHTML` in innerHTML | 04, 05 | Medium (potential XSS if track data ever user-influenced) |
| 3 | `openIntroMusicPicker`: `t.id` interpolated raw into `data-id` and `data-preview` attributes | 04, 05 | Low (data attributes, not innerHTML display) |
| 4 | `openIntroMusicPicker`: upload button initial label is conditional on `currentId === 'custom' && currentUrl` — Stage 2 missed this | 03, 04, 05 | Info |
| 5 | `openIntroMusicPicker`: `pendingUrl` not cleared when switching to a standard track (only `pendingFile` nulled) | 03, 05 | Medium (latent correctness issue) |
| 6 | `_saveIntroMusic`: `if (profile)` guard on in-memory mutation omitted by Stage 2 | 01, 02, 03, 04, 05 | Info |
| 7 | `_saveIntroMusic`: `custom_intro_url` set to `null` in cache for non-custom tracks — destructively clears existing custom URL on cache | 05 | Medium (unique finding) |

### Items NOT flagged by Stage 2 (uniform miss)

- **`_close` opacity/transition ordering:** All 5 Stage 2 agents described the two property assignments without detecting that the order prevents animation. 4 of 5 Stage 3 agents flagged this.
- **`pendingUrl` stale across track switch:** When the user clicks a standard track after having selected 'custom', `pendingFile` is cleared to null but `pendingUrl` retains `currentUrl`. If the user then clicks SAVE on a standard track, `_saveIntroMusic` receives a non-null `existingUrl` for a non-custom track, but the `if (trackId === 'custom')` branch is not entered, so `uploadedUrl` remains undefined and `p_custom_url` is sent as `null` — effectively harmless to the RPC but misleads about closure state.
- **`t.icon` raw injection:** Both `t.icon` (emoji value) and `t.id` in data attributes are injected into innerHTML without escaping. If INTRO_TRACKS ever contains user-sourced data, these are XSS vectors.
