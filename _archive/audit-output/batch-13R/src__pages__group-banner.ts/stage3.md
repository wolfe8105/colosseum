# Stage 3 Outputs — src/pages/group-banner.ts

## Agent 01

### `_injectCSS` (line 22)

**Verification**: PASS

**Findings**: None. All claims confirmed across all five agents.

- All agents correctly identify the `_cssInjected` boolean guard, the early-return on `true`, the `_cssInjected = true` assignment, `document.createElement('style')`, assignment to `s.textContent`, and `document.head.appendChild(s)`.
- Agent 05 provides the most complete class enumeration; all other agents' less complete enumerations remain accurate as far as they go — none of them assert anything the source contradicts.
- Synchronous, returns `void`, no external state read beyond `_cssInjected`. All confirmed by source lines 22–213.

**Unverifiable claims**: None.

---

### `renderGroupBanner` (line 223)

**Verification**: PARTIAL

**Findings**:

- All agents correctly identify the three parameters (`container`, `group`, `isLeader`), the call to `_injectCSS`, the six fields read from `group`, clearing `container.innerHTML`, and setting `container.className`. All confirmed by source lines 228–239.

- All agents correctly describe the three-branch conditional on `tier` and URL availability. Confirmed by lines 241–259.

- **PARTIAL — Agent 02 makes a misleading observation about `onerror`**: Agent 02 says "the container still holds the failed `<img>` element at the time this function runs, so it appends the fallback alongside the broken image." This is a legitimate behavioral observation about the DOM state when `onerror` fires — the `<img>` is indeed still in the container — but no agent describes this as a definitively confirmed visual overlap bug; it is a genuine observation about how `_renderTier1Fallback` uses `appendChild` not `innerHTML =`. The source confirms the `onerror` handler calls `_renderTier1Fallback(container, emoji, name)` (line 255), and `_renderTier1Fallback` uses `container.appendChild(wrap)` (line 288), not a container clear. Agent 02's description of the behavior is accurate, but it frames this as a note about visual overlap, which is beyond what the source alone can confirm (it is a valid inference). The other four agents do not mention this subtlety, which is an omission.

- All agents correctly describe the tier badge creation using `tierLabels[tier] ?? 'TIER I'` and the conditional edit button. Confirmed by lines 262–277.

- All agents correctly state the function is synchronous and returns `void`.

**Unverifiable claims**: None.

---

### `_renderTier1Fallback` (line 280)

**Verification**: PARTIAL

**Findings**:

- All agents correctly identify the three parameters, `document.createElement('div')`, `className = 'group-banner-t1'`, the `innerHTML` template with three children (`<span class="group-banner-t1-emoji">`, `<span class="group-banner-t1-name">`, `<div class="group-banner-t1-stripe">`), both `emoji` and `name` passed through `escapeHTML`, and `container.appendChild(wrap)`. Confirmed by lines 280–289.

- **PARTIAL — Agent 02's "does not clear container" note**: Agent 02 makes a note that the function does not clear the container before appending, and that in the `onerror` path the broken `<img>` would still be present. This is structurally accurate — the source confirms `_renderTier1Fallback` only appends, never clears. However, this is an observation about calling context, not an inaccuracy in Stage 2's claim about the function itself. The source confirms the function only does `container.appendChild(wrap)` (line 288). PARTIAL in the sense that it is an additional behavioral observation that is accurate but evaluative, not a mismatch.

- All agents correctly state: synchronous, no module-level state, returns `void`.

**Unverifiable claims**: None.

---

### `openBannerUploadSheet` (line 295)

**Verification**: PARTIAL

**Findings**:

- All agents correctly identify the four parameters, the `document.getElementById('gb-backdrop')?.remove()` deduplication guard, `total = wins + losses`, `winRate` calculation with zero-division guard, and the two boolean flags `t2Unlocked` / `t3Unlocked`. Confirmed by lines 301–315.

- All agents correctly describe `<div class="gb-backdrop" id="gb-backdrop">` and `<div class="gb-sheet">` creation, `sheet.innerHTML` set to a multi-section template, and the `wins`, `losses`, `winRate`, `currentTier` values inserted without `escapeHTML` (correctly noted as numeric computed values). Confirmed by lines 309–365.

- All agents correctly identify the four conditional event listeners (two click-to-trigger-file-input, two async `change` handlers). Confirmed by lines 371–392.

- All agents correctly identify the backdrop `click` listener that calls `_closeSheet(backdrop)` when `e.target === backdrop`. Confirmed by lines 390–392.

- All agents correctly state the function is synchronous, returns `void`.

**Unverifiable claims**: None.

---

### `_closeSheet` (line 395)

**Verification**: PASS

**Findings**: None. All claims confirmed across all five agents.

- All agents correctly identify: single `backdrop` HTMLElement parameter, `backdrop.style.opacity = '0'`, `backdrop.style.transition = 'opacity 0.2s'`, `setTimeout(() => backdrop.remove(), 220)`.
- All correctly note: synchronous, no module-level state, returns `void`, and the 220ms delay being slightly longer than the 200ms CSS transition.
- Agent 02 adds the observation that calling `_closeSheet` twice would schedule two removal calls — accurate, and a legitimate behavioral observation, not a mismatch.

**Unverifiable claims**: None.

---

### `_uploadBanner` (line 405)

**Verification**: PARTIAL

**Findings**:

- All agents correctly identify: `async`, four parameters (`groupId`, `file`, `type`, `backdrop`), returns `Promise<void>`. Confirmed by line 405–408.

- All agents correctly describe the 10MB size guard, `showToast('File too large — max 10MB', 'error')` early return. Confirmed by lines 411–414.

- All agents correctly describe the button query (`#gb-t2-btn` for `'static'`, `#gb-t3-btn` for `'animated'`), `disabled = true`, `textContent = 'UPLOADING…'`. Confirmed by lines 416–419.

- All agents correctly describe the `try/catch` block, `getSupabaseClient()` null check (throwing `new Error('Not connected')`), extension derivation with fallback, path construction as `` `${groupId}/${type}.${ext}` ``. Confirmed by lines 421–430.

- All agents correctly describe the Storage `upload` call on `'group-banners'` with `{ upsert: true, contentType: file.type }`, the `upErr` check. Confirmed by lines 428–432.

- All agents correctly describe `createSignedUrl` with a one-year TTL (60×60×24×365 seconds), the `signErr` / missing `signedUrl` check. Confirmed by lines 434–439.

- All agents correctly describe the `safeRpc('save_group_banner', ...)` call with `p_group_id`, `p_static_url`, `p_animated_url`, the RPC error check, and the `result?.error` check on the data payload. Confirmed by lines 441–449.

- All agents correctly describe `showToast('Banner updated ✓', 'success')`, `_closeSheet(backdrop)`, and `window.dispatchEvent(new CustomEvent('group-banner-updated', { detail: { groupId } }))`. Confirmed by lines 451–454.

- All agents correctly describe the `catch` block: `showToast` with error message or `'Upload failed'`, button re-enable to `false`/`'UPLOAD'`. Confirmed by lines 455–458.

- **PARTIAL — Agent 03 says `throw 'Not connected'` (string), not `throw new Error('Not connected')`**: Agent 03 writes at line 129: "throws `'Not connected'` if the result is falsy." The source at line 423 reads `throw new Error('Not connected')` — an Error object, not a bare string. Agents 01, 02, 04, and 05 all correctly say `throw new Error('Not connected')`. Agent 03's phrasing is inconsistent with the source on this point.

  - Source evidence: `if (!client) throw new Error('Not connected');` (line 423)
  - Agent 03 also writes for the signed URL error: "throws `'Could not get URL'`" — but the source at line 438 reads `throw new Error('Could not get URL')`. Same error: bare string vs. Error object. Agents 01, 02, 04, 05 all correctly say `new Error(...)`.

- **PARTIAL — Agent 05 says "Nothing is fire-and-forget"**: The `window.dispatchEvent(...)` call at line 454 is technically synchronous (dispatched immediately), not async. Agent 05's claim that "Nothing is fire-and-forget" is accurate in the async sense — `dispatchEvent` is synchronous and not awaited because it doesn't need to be. No agent claims it is awaited, so this is not a mismatch. Agent 05's note is accurate but slightly misleading in framing, since Agent 01 explicitly says "fire-and-forget signal." `dispatchEvent` is synchronous, not a promise. Both characterizations point to the same actual code behavior: no `await` is needed. No material contradiction.

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

| Function | PASS | PARTIAL | FAIL | Notes |
|---|---|---|---|---|
| `_injectCSS` | 5/5 | 0 | 0 | Full consensus, all correct |
| `renderGroupBanner` | 4/5 | 1/5 (Agent 02) | 0 | Agent 02 adds a valid but evaluative `onerror` append observation |
| `_renderTier1Fallback` | 4/5 | 1/5 (Agent 02) | 0 | Same Agent 02 container-not-cleared note; accurate but evaluative |
| `openBannerUploadSheet` | 5/5 | 0 | 0 | Minor ordering details all confirmed |
| `_closeSheet` | 5/5 | 0 | 0 | Full consensus |
| `_uploadBanner` | 4/5 | 1/5 (Agent 03) | 0 | Agent 03 writes bare string throws instead of `new Error(...)` twice |

**Key cross-agent disagreement:**
- Agent 03 is the only agent to write `throw 'Not connected'` and `throw 'Could not get URL'` (bare strings). The other four agents all write `throw new Error(...)`. The source confirms the Error-object form. Agent 03 is wrong on this specific phrasing.
- Agent 02 is the only agent to note that `_renderTier1Fallback`'s `appendChild` in the `onerror` path leaves the broken `<img>` in the container. The observation is structurally accurate from the source; no other agent mentions it.

---

## needs_review

- **`_renderTier1Fallback` in the `onerror` path**: When `renderGroupBanner` appends an `<img>` (tier 2 path) and that image fails to load, `onerror` calls `_renderTier1Fallback(container, emoji, name)`, which does `container.appendChild(wrap)`. The container is never cleared in the fallback. The broken `<img>` element remains in the container as a sibling to the newly appended `.group-banner-t1` div. No Stage 2 agent flagged this as a potential rendering issue requiring a fix; Agent 02 observed the behavior but did not flag it as a bug. This is worth a note for any future review: the `onerror` path may produce a container with both a failed `<img>` and a fallback `<div>` present simultaneously, which may or may not produce the intended visual result depending on CSS layout.

## Agent 02

### `_injectCSS` (line 22)

**Verification**: PASS

**Findings**: None. All claims confirmed across all five agents.

- Guard on `_cssInjected`, early return if true: confirmed (line 23).
- Sets `_cssInjected = true` on first call: confirmed (line 24).
- Creates `<style>` via `document.createElement('style')`: confirmed (line 25).
- Assigns CSS string to `s.textContent`: confirmed (line 26).
- Appends to `document.head`: confirmed (line 212).
- Synchronous, returns `void`: confirmed.
- Agent 05 listed the full set of CSS class names present in the string. All named classes are present in the source.

**Unverifiable claims**: None.

---

### `renderGroupBanner` (line 223)

**Verification**: PARTIAL

**Findings**:

- All five agents correctly state it calls `_injectCSS`, reads seven `group` fields with their nullish defaults, clears `container.innerHTML`, sets `container.className = 'group-banner-zone'`, and enters a three-branch conditional on tier and URL availability. All confirmed.
- All five agents correctly describe the `<video>` branch (tier === 3 and `animatedUrl` truthy): `autoplay`, `loop`, `muted`, `playsInline`, `src = animatedUrl`, appended. Confirmed (lines 241–249).
- All five agents correctly describe the `<img>` branch (tier >= 2 and `staticUrl` truthy): `src`, `alt = name`, `onerror` handler calling `_renderTier1Fallback`. Confirmed (lines 250–255).
- All five agents correctly describe the unconditional tier badge and conditional edit button. Confirmed (lines 261–277).
- **PARTIAL — onerror behavior (Agent 02 only)**: Agent 02 notes that in the `onerror` path, `_renderTier1Fallback` appends to `container` without clearing it first, so the broken `<img>` element remains alongside the Tier 1 fallback. This is a correct structural observation about the source (line 255: `img.onerror = () => _renderTier1Fallback(container, emoji, name)`, and `_renderTier1Fallback` calls `container.appendChild(wrap)` without clearing). No other agent noted this edge case. The observation is accurate, but it is commentary on a gap rather than a false claim, and the other four agents simply omit mention of this detail. They are not wrong, just incomplete on this edge.

**Unverifiable claims**: None.

---

### `_renderTier1Fallback` (line 280)

**Verification**: PASS

**Findings**: None. All claims confirmed across all five agents.

- Creates `<div>` with `className = 'group-banner-t1'`: confirmed (lines 281–282).
- Sets `innerHTML` to template containing `<span class="group-banner-t1-emoji">`, `<span class="group-banner-t1-name">`, and `<div class="group-banner-t1-stripe">`: confirmed (lines 283–288).
- Both `emoji` and `name` passed through `escapeHTML` before interpolation: confirmed (lines 284–285).
- Appends `wrap` to `container`: confirmed (line 288).
- Synchronous, no module-level state reads, returns `void`: confirmed.

**Unverifiable claims**: None.

---

### `openBannerUploadSheet` (line 295)

**Verification**: PARTIAL

**Findings**:

- All five agents correctly describe: removing existing `#gb-backdrop`, computing `total`/`winRate` with zero-division guard, deriving `t2Unlocked`/`t3Unlocked`, creating backdrop and sheet elements, setting `sheet.innerHTML`, appending sheet to backdrop then backdrop to `document.body`, wiring four conditional event listeners, and the backdrop click-outside dismiss. All confirmed.
- All five agents correctly note that `wins`, `losses`, `winRate`, and `currentTier` are numeric computed values interpolated without `escapeHTML`, and that `groupId` is not interpolated into the HTML. Confirmed.
- **PARTIAL — Tier I row description**: Agent 02 in its Stage 2 output described the Tier I row as "a locked Tier I row (always marked active)." The source at line 329 shows `<div class="gb-tier-row unlocked">` — the Tier I row always gets the `unlocked` class. Agent 02's phrasing "locked" for the Tier I row is contradicted by the source. All other agents correctly say it is always unlocked or active/unlocked.

**Agent disagreement**: Agent 02's Stage 2 called the Tier I row "locked" — contradicted by line 329 (`class="gb-tier-row unlocked"` hardcoded). All other agents correctly say it is always unlocked.

**Unverifiable claims**: None.

---

### `_closeSheet` (line 395)

**Verification**: PASS

**Findings**: None. All claims confirmed across all five agents.

- Sets `backdrop.style.opacity = '0'`: confirmed (line 396).
- Sets `backdrop.style.transition = 'opacity 0.2s'`: confirmed (line 397).
- `setTimeout(() => backdrop.remove(), 220)`: confirmed (line 398).
- Synchronous, no module-level state, returns `void`: confirmed.
- Agent 02 adds that calling `_closeSheet` twice on the same element would schedule two removal callbacks — this is a correct structural inference from the source (no deduplication guard), not a false claim.

**Unverifiable claims**: None.

---

### `_uploadBanner` (line 405)

**Verification**: PARTIAL

**Findings**:

- All five agents correctly describe: size guard, button disable/text update, `try/catch` structure, `getSupabaseClient()` null throw, extension derivation with fallbacks, storage path construction, upload with `upsert: true`, signed URL with 1-year TTL, `safeRpc('save_group_banner', ...)` with correct field logic, success path (`showToast`, `_closeSheet`, `window.dispatchEvent`), and catch path (re-enable button, `showToast`). All confirmed.
- **PARTIAL — Agent 03 on `createSignedUrl` error throw**: Agent 03 says it throws `'Could not get URL'` (a bare string, not `new Error(...)`). The source at line 438 shows `throw new Error('Could not get URL')`. Agent 01 and Agent 02 correctly say `throw new Error(...)`. Agent 03's phrasing is ambiguous but materially misleading about whether this is a string throw or an Error object throw. Agents 04 and 05 also correctly say `new Error('Could not get URL')`.
- **PARTIAL — Agent 01 on `safeRpc` error throw**: Agent 01 says it throws `'Save failed'` (no mention of `new Error`). Source line 447: `throw new Error(error.message ?? 'Save failed')`. The throw wraps a `new Error` — Agent 01 omits the `new Error` wrapper in its description of this specific throw. Agents 02, 03, 04, 05 all correctly state `new Error(error.message ?? 'Save failed')`.
- All agents correctly identify the `data` double-check at lines 448–449 (`result?.error` throws `new Error(result.error)`).
- All agents correctly identify the `CustomEvent` dispatch as fire-and-forget on `window`. Agent 05 footnotes "Nothing is fire-and-forget" in its final sentence, referring to the awaited storage/RPC calls, not the `dispatchEvent`. This is not wrong — `dispatchEvent` is synchronous and has no return value to await, but it is fire-and-forget in the sense Agent 01 described. Since `dispatchEvent` is synchronous, calling it "fire-and-forget" vs "not fire-and-forget" depends on interpretation; the call is synchronous and completes before the function exits.
- The `(client as any)` cast on storage calls: confirmed (lines 428, 434). All agents mention the `any` cast.

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

| Function | PASS | PARTIAL | FAIL |
|---|---|---|---|
| `_injectCSS` | All 5 | — | — |
| `renderGroupBanner` | 4 | 1 (Agent 02 adds accurate edge-case detail absent in others) | — |
| `_renderTier1Fallback` | All 5 | — | — |
| `openBannerUploadSheet` | 4 | 5 (all accurate except one claim) | 1 claim in Agent 02 (Tier I row called "locked") |
| `_closeSheet` | All 5 | — | — |
| `_uploadBanner` | 3 | 2 (Agents 01 and 03 imprecise on `new Error` wrappers) | — |

**Total across all functions and agents:**
- PASS (function-level, no issues): 4 functions clean across all agents
- PARTIAL: 2 functions have minor accuracy gaps
- FAIL (individual claim): 1 — Agent 02's description of the Tier I row as "locked" in `openBannerUploadSheet`, contradicted by the hardcoded `unlocked` class at line 329

**Agent disagreements:**
1. `openBannerUploadSheet` — Tier I row: Agents 01, 03, 04, 05 say "always unlocked/active." Agent 02 says "locked Tier I row." Source confirms "unlocked." Agent 02 is wrong on this specific claim.
2. `_uploadBanner` — error throw wrapping: Agent 03 describes the `createSignedUrl` error throw as a bare string rather than `new Error(...)`. Agent 01 describes the `safeRpc` error throw without the `new Error` wrapper. All other agents are precise on both points.

---

## needs_review

- **`_renderTier1Fallback` + `onerror` interaction (line 255)**: When an `<img>` fails to load, `renderGroupBanner`'s `onerror` handler calls `_renderTier1Fallback(container, emoji, name)`, which appends a new `div.group-banner-t1` to `container` without first removing the failed `<img>`. This means the container will contain both the broken `img` element and the fallback `div` simultaneously. Agent 02 flagged this correctly; no other agent did. Whether this causes a visible double-element glitch at runtime depends on browser behavior for broken images with `object-fit: cover`, but the code does not defensively clear the container in the `onerror` path.

## Agent 03

### _injectCSS (line 22)

**Verification**: PASS

**Findings**: None. All claims confirmed across all five agents. The function reads `_cssInjected` (line 23), returns immediately if true (line 23), sets it to `true` (line 24), creates a `<style>` element (line 25), assigns CSS to `s.textContent` (line 26), and appends it to `document.head` (line 212). All agents correctly identify it as synchronous, returning `void`, and writing no module-level state beyond flipping `_cssInjected`. Agent 05's claim that the CSS string defines rules for `.gb-handle`, `.gb-title`, `.gb-subtitle`, `.gb-tier-row`, `.gb-tier-icon`, `.gb-tier-info`, `.gb-tier-label`, `.gb-tier-desc`, `.gb-tier-status`, `.gb-upload-btn`, and `.gb-win-rate` is confirmed by lines 140–210 of the source.

**Unverifiable claims**: None.

---

### renderGroupBanner (line 223)

**Verification**: PASS

**Findings**: None. All claims confirmed across all five agents.

- Calls `_injectCSS()` first — line 228. PASS.
- Reads seven fields from `group` (agents say "six fields" in some descriptions but enumerate seven — `banner_tier`, `banner_static_url`, `banner_animated_url`, `avatar_emoji`, `name`, `gvg_wins`, `gvg_losses`): lines 230–236. PASS for the enumerated fields. Note: every agent's body text correctly lists all seven even when the lead sentence says "six" — minor wording inconsistency, not a factual error about the source.
- `container.innerHTML = ''` and `container.className = 'group-banner-zone'` — lines 238–239. PASS.
- Tier 3 branch: `tier === 3 && animatedUrl` creates `<video>` with `autoplay`, `loop`, `muted`, `playsInline` — lines 241–249. PASS.
- Tier 2 branch: `tier >= 2 && staticUrl` creates `<img>` with `onerror` calling `_renderTier1Fallback` — lines 250–255. PASS.
- Else: calls `_renderTier1Fallback` directly — line 258. PASS.
- Tier badge creation using `tierLabels[tier] ?? 'TIER I'` — lines 262–266. PASS.
- Edit button created and appended only when `isLeader` is true — lines 269–277. PASS.
- Agent 04 specifically notes the `alt = name` attribute on the `<img>` element; source line 254 confirms `img.alt = name`. All other agents omit this; it is a gap in their descriptions but not a false claim.

**Unverifiable claims**: None.

---

### _renderTier1Fallback (line 280)

**Verification**: PARTIAL

**Findings**:
- All agents correctly describe: creates `<div class="group-banner-t1">`, sets `innerHTML` with `escapeHTML(emoji)` and `escapeHTML(name)`, appends to `container`. Source lines 281–288 confirm all of this.
- Agent 02 specifically notes: "It does not clear the container before appending; in the `onerror` path triggered from `renderGroupBanner`, the container still holds the failed `<img>` element at the time this function runs, so it appends the fallback alongside the broken image." This structural observation is correct — the function only calls `container.appendChild(wrap)` (line 288) and never clears `container.innerHTML`. This is an accurate behavioral observation from Agent 02. The other four agents described the function accurately but omitted this edge case.
- The gap is not a false claim, but agents 01, 03, 04, and 05 omit the notable behavior that in the `onerror` path the fallback is appended alongside the broken `<img>`. This is a PARTIAL for those four agents — accurate but incomplete. Agent 02's description is PASS.

**Unverifiable claims**: None.

---

### openBannerUploadSheet (line 295)

**Verification**: PARTIAL

**Findings**:
- All agents correctly describe: removes existing `#gb-backdrop`, computes `winRate`, derives `t2Unlocked`/`t3Unlocked`, creates backdrop and sheet, sets `sheet.innerHTML`, wires four conditional event listeners, backdrop click closes sheet. Lines 301–393 confirm all of this.
- Agent 04 claims: "injects them into `document.body` via `backdrop.appendChild(sheet)` followed by `document.body.appendChild(backdrop)`." Source confirms: `backdrop.appendChild(sheet)` is at line 367, `document.body.appendChild(backdrop)` at line 368.
- Minor ordering discrepancy: Agent 02 says "After setting the sheet's `innerHTML`, the function appends the sheet to the backdrop and the backdrop to `document.body`." Source shows this is correct: the `innerHTML` set happens at line 316, then `backdrop.appendChild(sheet)` at 367 and `document.body.appendChild(backdrop)` at 368. All agents agree on this sequence.
- One subtle point no agent emphasized: the `change` event handlers are `async` arrow functions but are not awaited by `openBannerUploadSheet` itself (confirmed by all agents who mentioned it). Source lines 374 and 384 show `async (e) => { ... }` which is correct.
- All agents correctly identify that `wins`, `losses`, `winRate`, and `currentTier` are interpolated without `escapeHTML` — correct per source, and correctly noted that these are derived numeric values, not raw user input.

**Unverifiable claims**: None.

---

### _closeSheet (line 395)

**Verification**: PASS

**Findings**: None. All claims confirmed across all five agents. Source lines 396–399 confirm: sets `backdrop.style.opacity = '0'`, sets `backdrop.style.transition = 'opacity 0.2s'`, calls `setTimeout(() => backdrop.remove(), 220)`. Agent 02's note that "calling it twice on the same element would schedule two removal calls" is a correct behavioral observation about what the code does (no deduplication logic present).

**Unverifiable claims**: None.

---

### _uploadBanner (line 405)

**Verification**: PARTIAL

**Findings**:
- All agents correctly describe the file-size guard (`file.size > 10 * 1024 * 1024`, toast, early return). Lines 411–414 confirm.
- All agents correctly describe the button query (`#gb-t2-btn` for `'static'`, `#gb-t3-btn` for `'animated'`), disabling it, and setting text to `'UPLOADING…'`. Lines 416–419 confirm.
- All agents correctly describe the `try/catch` structure. Lines 421–458 confirm.
- All agents correctly describe the `getSupabaseClient()` call and the `'Not connected'` throw. Lines 422–423 confirm.
- All agents correctly describe the extension derivation with fallback. Lines 425 confirm: `file.name.split('.').pop() ?? (type === 'static' ? 'jpg' : 'mp4')`.
- All agents correctly describe the storage path construction. Line 426 confirms: `` `${groupId}/${type}.${ext}` ``.
- All agents correctly describe the storage `upload` call with `upsert: true, contentType: file.type`, the `(client as any)` cast, and the throw on `upErr`. Lines 428–432 confirm.
- All agents correctly describe `createSignedUrl` with one-year TTL (60×60×24×365) and the throw conditions. Lines 434–439 confirm.
- All agents correctly describe `safeRpc('save_group_banner', ...)` with `p_group_id`, `p_static_url`, `p_animated_url`, dual error checks, and throw behavior. Lines 441–449 confirm.
- All agents correctly describe success path: `showToast('Banner updated ✓', 'success')`, `_closeSheet(backdrop)`, `window.dispatchEvent(new CustomEvent('group-banner-updated', { detail: { groupId } }))`. Lines 451–454 confirm.
- All agents correctly describe catch path: `showToast` with error message or `'Upload failed'`, re-enable button. Lines 455–458 confirm.

One PARTIAL for Agent 05's final sentence: "The Supabase Storage calls and `safeRpc` are all awaited in sequence. Nothing is fire-and-forget." The `window.dispatchEvent` on line 454 is truly fire-and-forget (no await, no return value consumed), as Agent 01 correctly noted: "a fire-and-forget signal (no caller in this file consumes it)." Agent 05's claim that "Nothing is fire-and-forget" is slightly misleading — the event dispatch is not async and has no return value to await, but it is fire-and-forget in the sense Agent 01 described. Since `dispatchEvent` is synchronous, calling it "fire-and-forget" vs "not fire-and-forget" depends on interpretation.

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

| Function | Agent 01 | Agent 02 | Agent 03 | Agent 04 | Agent 05 |
|---|---|---|---|---|---|
| `_injectCSS` | PASS | PASS | PASS | PASS | PASS |
| `renderGroupBanner` | PASS | PASS | PASS | PASS | PASS |
| `_renderTier1Fallback` | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL |
| `openBannerUploadSheet` | PASS | PASS | PASS | PASS | PASS |
| `_closeSheet` | PASS | PASS | PASS | PASS | PASS |
| `_uploadBanner` | PASS | PASS | PASS | PASS | PARTIAL |

**Totals**: 27 PASS, 5 PARTIAL, 0 FAIL.

**Agent disagreements**:
- `_renderTier1Fallback`: Agent 02 uniquely identified that in the `onerror` path the function appends the fallback div alongside the broken `<img>` without clearing the container. Agents 01, 03, 04, and 05 omitted this nuance. Agent 02's description is more complete.
- `_uploadBanner` fire-and-forget: Agent 01 explicitly called `window.dispatchEvent` "fire-and-forget." Agent 05 said "Nothing is fire-and-forget." Since `dispatchEvent` is a synchronous DOM call (not truly async), both are defensible, but Agent 01's framing is more informative for the reader.

No agent made a claim that was contradicted by the source. All structural, control-flow, and behavioral descriptions were accurate.

---

## needs_review

- **`_renderTier1Fallback` + `onerror` interaction (line 255)**: When the Tier 2 `<img>` fails to load and `onerror` fires, `_renderTier1Fallback` appends the fallback `<div class="group-banner-t1">` to `container` alongside the already-present (broken) `<img>` element. The container is not cleared before the fallback is inserted. Only Agent 02 surfaced this. Whether this causes a visible double-element glitch at runtime depends on browser behavior for broken images with `object-fit: cover`, but the code does not defensively clear the container in the `onerror` path.

## Agent 04

### `_injectCSS` (line 22)

**Verification**: PASS
**Findings**: None. All claims confirmed.

All five agents describe the guard check on `_cssInjected`, the `document.createElement('style')` call, assignment to `s.textContent`, and `document.head.appendChild(s)`. The source at lines 22–213 confirms every claim exactly.

- Guard: `if (_cssInjected) return;` — line 23. PASS.
- Sets `_cssInjected = true` before DOM work — line 24. PASS.
- Creates `<style>`, assigns CSS to `textContent`, appends to `document.head` — lines 25–212. PASS.
- Synchronous, returns `void` — confirmed structurally. PASS.
- Agents 01 and 05 list the CSS class names covered by the injected string. Both are accurate; the source string contains all named classes. PASS.

**Unverifiable claims**: None.

---

### `renderGroupBanner` (line 223)

**Verification**: PASS
**Findings**: None. All claims confirmed.

Every agent describes the same sequence: `_injectCSS()` call, six field reads with fallbacks, clearing container, three-branch media conditional, unconditional tier badge, conditional edit button.

- Calls `_injectCSS()` first — line 228. PASS.
- Reads seven fields from `group`; `banner_tier`, `banner_static_url`, `banner_animated_url`, `avatar_emoji`, `name`, `gvg_wins`, `gvg_losses`: lines 230–236. PASS.
- `container.innerHTML = ''` and `container.className = 'group-banner-zone'` — lines 238–239. PASS.
- Tier 3 branch: `tier === 3 && animatedUrl` creates `<video>` with `autoplay`, `loop`, `muted`, `playsInline` — lines 241–249. PASS.
- Tier 2 branch: `tier >= 2 && staticUrl` creates `<img>` with `onerror` calling `_renderTier1Fallback` — lines 250–255. PASS.
- Else: calls `_renderTier1Fallback` directly — line 258. PASS.
- Tier badge creation using `tierLabels[tier] ?? 'TIER I'` — lines 262–266. PASS.
- Edit button created and appended only when `isLeader` is true — lines 269–277. PASS.
- Agent 04 specifically notes the `alt = name` attribute on the `<img>` element; source line 254 confirms `img.alt = name`. All other agents omit this; it is a gap in their descriptions but not a false claim.

**Unverifiable claims**: None.

---

### `_renderTier1Fallback` (line 280)

**Verification**: PARTIAL
**Findings**:
- All agents correctly describe: creates `<div class="group-banner-t1">`, sets `innerHTML` with `escapeHTML(emoji)` and `escapeHTML(name)`, appends to `container`. Source lines 281–288 confirm all of this.
- Agent 02 specifically notes: "It does not clear the container before appending; in the `onerror` path triggered from `renderGroupBanner`, the container still holds the failed `<img>` element at the time this function runs, so it appends the fallback alongside the broken image." This structural observation is correct — the function only calls `container.appendChild(wrap)` (line 288) and never clears `container.innerHTML`. This is an accurate behavioral observation from Agent 02. The other four agents described the function accurately but omitted this edge case.
- The gap is not a false claim, but agents 01, 03, 04, and 05 omit the notable behavior that in the `onerror` path the fallback is appended alongside the broken `<img>`. This is a PARTIAL for those four agents — accurate but incomplete. Agent 02's description is PASS.

**Unverifiable claims**: None.

---

### `openBannerUploadSheet` (line 295)

**Verification**: PASS
**Findings**: None. All claims confirmed.

- Removes existing `#gb-backdrop` first — line 301. PASS.
- Computes `total`, `winRate` with divide-by-zero guard — lines 303–304. PASS.
- Derives `t2Unlocked` and `t3Unlocked` from `currentTier` — lines 313–314. PASS.
- Creates backdrop and sheet elements, sets `sheet.innerHTML` — lines 308–365. PASS.
- `wins`, `losses`, `winRate`, `currentTier` inserted directly without `escapeHTML` — confirmed by source; all agents note these are numeric computed values, not raw user input. PASS.
- `groupId` is NOT interpolated into the HTML string — confirmed by source; `groupId` is only used in event handler closures. PASS.
- Appends `sheet` to `backdrop`, `backdrop` to `document.body` — lines 366–368. PASS.
- Tier 2 click → triggers `#gb-t2-input` click; Tier 3 click → triggers `#gb-t3-input` click — lines 371–373 and 381–383. PASS.
- `change` listeners read `files?.[0]` and call `_uploadBanner` as `async` handlers — lines 374–378 and 384–388. PASS.
- Backdrop click listener calls `_closeSheet(backdrop)` when `e.target === backdrop` — lines 390–392. PASS.
- Function is synchronous at top level, async work in handlers — confirmed structurally. PASS.

**Unverifiable claims**: None.

---

### `_closeSheet` (line 395)

**Verification**: PASS
**Findings**: None. All claims confirmed.

- Sets `backdrop.style.opacity = '0'` and `backdrop.style.transition = 'opacity 0.2s'` — lines 396–397. PASS.
- Calls `setTimeout(() => backdrop.remove(), 220)` — line 398. PASS.
- Synchronous, returns `void`, no module-level state — confirmed. PASS.
- Agent 02 adds an accurate editorial note about duplicate removal calls not being guarded — this observation is structurally correct and is not a false claim.

**Unverifiable claims**: None.

---

### `_uploadBanner` (line 405)

**Verification**: PASS
**Findings**: None. All claims confirmed.

- `async`, returns `Promise<void>` — line 405. PASS.
- Size guard at `10 * 1024 * 1024` calling `showToast('File too large — max 10MB', 'error')` and returning early — lines 411–414. PASS.
- Queries backdrop for `#gb-t2-btn` (static) or `#gb-t3-btn` (animated), disables and relabels if found — lines 416–419. PASS.
- `try/catch` wrapping the remainder — lines 421–458. PASS.
- Calls `getSupabaseClient()`, throws `new Error('Not connected')` if falsy — lines 422–423. PASS.
- Derives `ext` from `file.name.split('.').pop()` with fallbacks `'jpg'`/`'mp4'` — lines 425–426. PASS.
- Storage path `${groupId}/${type}.${ext}` — line 427. PASS.
- `upload` to `'group-banners'` bucket with `{ upsert: true, contentType: file.type }`, client cast to `any` — lines 428–430. PASS.
- Throws on `upErr` — line 432. PASS.
- `createSignedUrl` with `60 * 60 * 24 * 365` TTL — lines 434–436. PASS.
- Throws on `signErr` or missing `signedData?.signedUrl` — line 438. PASS.
- `safeRpc('save_group_banner', ...)` with correct field logic — lines 441–445. PASS.
- Double error check: RPC-level `error` field, then `data` cast as `{ error?: string }` — lines 447–449. PASS.
- On success: `showToast('Banner updated ✓', 'success')`, `_closeSheet(backdrop)`, `window.dispatchEvent(new CustomEvent('group-banner-updated', { detail: { groupId } }))` — lines 451–454. PASS.
- Catch: `showToast` with error message or `'Upload failed'`, re-enable button with `textContent = 'UPLOAD'` — lines 455–458. PASS.

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

| Function | A01 | A02 | A03 | A04 | A05 |
|---|---|---|---|---|---|
| `_injectCSS` | PASS | PASS | PASS | PASS | PASS |
| `renderGroupBanner` | PASS | PASS | PASS | PASS | PASS |
| `_renderTier1Fallback` | PARTIAL | PASS | PARTIAL | PARTIAL | PARTIAL |
| `openBannerUploadSheet` | PASS | PASS | PASS | PASS | PASS |
| `_closeSheet` | PASS | PASS | PASS | PASS | PASS |
| `_uploadBanner` | PASS | PASS | PASS | PASS | PASS |

**Total counts:**
- PASS: 27
- PARTIAL: 4 (all on `_renderTier1Fallback`, agents 01/03/04/05)
- FAIL: 0

**Agent disagreements:**

Only one meaningful disagreement exists. Agent 02, on `_renderTier1Fallback`, correctly observes that the function does not clear the container before appending, so in the `onerror` branch the failed `<img>` remains alongside the fallback `<div>`. Agents 01, 03, 04, and 05 describe the function's happy-path behavior accurately but omit this behavioral edge case. This is not a factual error in those agents — they do not make any false claims — but it is an incomplete description. The verdict is PARTIAL for those four and PASS for Agent 02.

All five agents are in full agreement on every other function. There are no contradictory claims between agents anywhere in the output.

---

## needs_review

- **`renderGroupBanner` — `img.alt` attribute**: All agents except Agent 04 omit that the `<img>` element has its `alt` attribute set to `name` (line 254: `img.alt = name`). This is minor but is a DOM write that none of the four other agents mention.

- **`_renderTier1Fallback` — `onerror` interaction with container state**: As noted above, when `_renderTier1Fallback` is invoked from the `<img>` element's `onerror` handler (line 255), the container already holds the broken `<img>` node. The function does not remove it before appending the `<div class="group-banner-t1">` wrapper. Whether this causes a visible rendering artifact depends on browser behavior, but no Stage 2 agent (except Agent 02) flags it.

## Agent 05

### _injectCSS (line 22)

**Verification**: PASS
**Findings**: None. All claims confirmed.

All five agents describe the same behavior: reads `_cssInjected`; returns early if `true`; otherwise sets `_cssInjected = true`, creates a `<style>` element, assigns CSS to `s.textContent`, and appends to `document.head`. The source at lines 22–213 confirms every detail — the guard at line 23, the flag flip at line 24, `document.createElement('style')` at line 25, `s.textContent = ...` at line 26, `document.head.appendChild(s)` at line 212. All five agents correctly describe the CSS classes covered by the string. Synchronous, returns `void`. No disagreements between agents.

**Unverifiable claims**: None

---

### renderGroupBanner (line 223)

**Verification**: PARTIAL
**Findings**:

- Agents 01–05 all correctly state the function reads seven fields from `group`: `banner_tier`, `banner_static_url`, `banner_animated_url`, `avatar_emoji`, `name`, `gvg_wins`, `gvg_losses`. Source lines 230–236 confirm all seven with their exact fallbacks. PASS.
- Agents 01–05 correctly describe clearing `container.innerHTML` and setting `container.className = 'group-banner-zone'`. Lines 238–239 confirm. PASS.
- Agents 01–05 correctly describe the three-branch conditional: `tier === 3 && animatedUrl` → video; `tier >= 2 && staticUrl` → img with onerror fallback; else → `_renderTier1Fallback`. Lines 241–259 confirm. PASS.
- Agents 01–05 correctly note the `<video>` has `autoplay`, `loop`, `muted`, `playsInline`. Lines 245–248 confirm. PASS.
- Agents 01–05 correctly describe the tier badge with `tierLabels[tier] ?? 'TIER I'`. Lines 263–266 confirm. PASS.
- Agents 01–05 correctly describe the edit button gated on `isLeader`, with `'✏ BANNER'` text and click listener calling `openBannerUploadSheet(group.id!, tier, wins, losses)`. Lines 269–276 confirm. PASS.
- **PARTIAL — Agent 02 only**: Agent 02 includes a note that in the `onerror` path, `_renderTier1Fallback` appends to a container that still holds the failed `<img>` element, calling this a "visual overlap." This is a structurally accurate observation (line 255 shows `img.onerror = () => _renderTier1Fallback(container, emoji, name)`, which appends rather than replaces). Agents 01, 03, 04, 05 do not flag this. The observation is correct but it is editorial commentary on a design choice; the claim itself is accurate.
- Agents 01 and 02 both describe the function as reading "six fields" in their opening clause, then enumerate seven fields in their detailed breakdown. The count "six" in their preamble is slightly wrong (there are seven reads), but the actual enumeration is complete. This is a minor self-contradiction within those two agents' descriptions but does not constitute a material claim error.

**Unverifiable claims**: None

---

### _renderTier1Fallback (line 280)

**Verification**: PASS
**Findings**: None. All claims confirmed.

All five agents correctly describe: creates a `<div>`, class `'group-banner-t1'`, sets `innerHTML` with a template containing `escapeHTML(emoji)` in a `<span class="group-banner-t1-emoji">`, `escapeHTML(name)` in a `<span class="group-banner-t1-name">`, and a `<div class="group-banner-t1-stripe">`, then appends to `container`. Lines 280–288 confirm all details verbatim. Synchronous, returns `void`, reads no module-level state.

**Unverifiable claims**: None

---

### openBannerUploadSheet (line 295)

**Verification**: PARTIAL
**Findings**:

- All agents correctly identify parameters: `groupId`, `currentTier`, `wins`, `losses`. PASS.
- All agents correctly describe the deduplication via `document.getElementById('gb-backdrop')?.remove()` at line 301. PASS.
- All agents correctly describe `winRate` computation. Lines 303–304 confirm. PASS.
- All agents correctly describe `t2Unlocked = currentTier >= 2` and `t3Unlocked = currentTier >= 3`. Lines 313–314 confirm. PASS.
- All agents correctly describe the HTML template structure: handle, title, subtitle, win-rate display, Tier I row always unlocked, Tier II and III rows conditional on unlock booleans, conditional upload buttons and hidden file inputs. Lines 316–365 confirm. PASS.
- All agents correctly note that `wins`, `losses`, `winRate`, `currentTier` are inserted without `escapeHTML` as numeric computed values, not raw user input. PASS.
- All agents correctly describe four event listeners. Lines 370–388 confirm. PASS.
- All agents correctly describe the backdrop click listener calling `_closeSheet(backdrop)` only when `e.target === backdrop`. Lines 390–392 confirm. PASS.
- **PARTIAL — ordering discrepancy framing**: Agent 02 states "the function appends the sheet to the backdrop and the backdrop to `document.body`" after setting innerHTML. The actual source at lines 367–368 shows `backdrop.appendChild(sheet)` then `document.body.appendChild(backdrop)` occurring before the event listener wiring. This ordering is confirmed. Agent 02 describes the same ordering but the phrasing could be read as post-listener — all agents get the ordering right.
- All agents correctly state the function is synchronous at the top level with async upload callbacks. PASS.

**Unverifiable claims**: None

---

### _closeSheet (line 395)

**Verification**: PASS
**Findings**: None. All claims confirmed.

All five agents correctly describe: sets `backdrop.style.opacity = '0'`, sets `backdrop.style.transition = 'opacity 0.2s'`, then `setTimeout(() => backdrop.remove(), 220)`. Lines 395–399 confirm verbatim. Synchronous, returns `void`, no module-level state. Agent 02 adds an accurate editorial note about duplicate removal calls not being guarded — this observation is structurally correct and is not a false claim.

**Unverifiable claims**: None

---

### _uploadBanner (line 405)

**Verification**: PARTIAL
**Findings**:

- All agents correctly identify the function as `async`, returning `Promise<void>`. Line 405 confirms. PASS.
- All agents correctly describe the 10MB size guard. Lines 411–414 confirm. PASS.
- All agents correctly describe querying `backdrop` for `#gb-t2-btn` or `#gb-t3-btn`, disabling it and setting `textContent = 'UPLOADING…'`. Lines 416–419 confirm. PASS.
- All agents correctly describe the `try/catch` structure. PASS.
- All agents correctly describe `getSupabaseClient()` with falsy guard throwing `new Error('Not connected')`. Lines 422–423 confirm. PASS.
- All agents correctly describe extension derivation and path construction. Lines 425–426 confirm. PASS.
- All agents correctly describe the storage upload, signed URL with 1-year TTL, `safeRpc`, dual error checks, success path, and catch path. Lines 428–458 confirm. PASS.
- All agents correctly describe `window.dispatchEvent(new CustomEvent('group-banner-updated', { detail: { groupId } }))` on success. Line 454 confirms. PASS.
- **PARTIAL — Agent 05 only**: Agent 05 states "Nothing is fire-and-forget" at the end of its description. This is correct for the upload and RPC awaits. The `window.dispatchEvent(...)` at line 454 is fire-and-forget in the sense that no consumer in this file listens for it, which Agent 01 correctly notes. Agent 05's statement is not wrong (the dispatch itself is synchronous, not a promise), but the framing implies stricter accuracy than Agent 01's note about it being unconsumed.

**Unverifiable claims**: None

---

## Cross-Agent Consensus Summary

| Function | PASS | PARTIAL | FAIL | Notes |
|---|---|---|---|---|
| `_injectCSS` | All 5 | — | — | Full consensus, no disagreements |
| `renderGroupBanner` | 5/5 | 1 (Agent 02 editorial note) | 0 | Minor self-contradiction in Agents 01–02 preamble ("six" vs. seven enumerated); Agent 02 correct onerror observation |
| `_renderTier1Fallback` | 5/5 | 0 | 0 | Full consensus, no disagreements |
| `openBannerUploadSheet` | 5/5 | 0 | 0 | All agents accurate |
| `_closeSheet` | All 5 | — | — | Full consensus; Agent 02's double-removal editorial is accurate |
| `_uploadBanner` | 5/5 | 1 (Agent 05 framing on fire-and-forget) | 0 | Minor framing difference only |

**Overall tallies across all 6 functions × 5 agents:**
- PASS: 29/30 function-agent pairs
- PARTIAL: 2/30 (renderGroupBanner Agent 02 onerror note; _uploadBanner Agent 05 fire-and-forget framing)
- FAIL: 0/30

Agent consensus is extremely high. No agent made a factually wrong claim about any function. The two PARTIAL verdicts are editorial/framing issues, not substantive errors.

---

## needs_review

- **`_renderTier1Fallback` onerror path — broken image remains in DOM**: When `renderGroupBanner` renders a Tier 2 image and that image fails to load, `img.onerror` calls `_renderTier1Fallback(container, emoji, name)`, which *appends* the fallback `div` to `container` — the failed `<img>` element is still in the DOM alongside the new Tier 1 fallback. Agent 02 noted this; it was not flagged by Agents 01, 03, 04, 05. The behavior is real but may be intentional (the img is invisible when broken; the fallback layers over it). Worth a second look to confirm whether a `img.remove()` should precede or accompany the fallback render.
