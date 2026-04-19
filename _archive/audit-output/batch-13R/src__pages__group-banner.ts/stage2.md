# Stage 2 Outputs — src/pages/group-banner.ts

## Agent 01

### _injectCSS

`_injectCSS` reads the module-level boolean `_cssInjected`, which is initialized to `false`. If `_cssInjected` is already `true`, the function returns immediately without doing anything. Otherwise, it sets `_cssInjected` to `true`, creates a `<style>` element via `document.createElement('style')`, assigns a multi-rule CSS string to its `textContent`, and appends it to `document.head`. The CSS string defines styles for the banner zone (`.group-banner-zone`), the three tier variants (`.group-banner-t1`, `.group-banner-t2`, `.group-banner-t3`), the edit button, the tier badge, and all elements of the upload sheet (backdrop, sheet, handle, title, subtitle, tier rows, upload buttons, and win-rate row). The function is synchronous, returns `void`, and writes no module-level state other than flipping `_cssInjected`.

### renderGroupBanner

`renderGroupBanner` accepts three parameters: a `container` HTMLElement, a `group` object of type `GroupDetail`, and a boolean `isLeader`. It first calls `_injectCSS` to inject styles if not already done. It then reads six fields from `group` — `banner_tier` (defaulting to `1`), `banner_static_url` (defaulting to `null`), `banner_animated_url` (defaulting to `null`), `avatar_emoji` (defaulting to `'⚔️'`), `name` (defaulting to `''`), `gvg_wins` (defaulting to `0`), and `gvg_losses` (defaulting to `0`).

The function clears `container.innerHTML` and sets `container.className` to `'group-banner-zone'`. It then branches on `tier` and URL availability: if `tier === 3` and `animatedUrl` is truthy, it creates a `<video>` element with `autoplay`, `loop`, `muted`, and `playsInline` set, assigns `animatedUrl` as its `src`, and appends it to the container. If that branch does not match but `tier >= 2` and `staticUrl` is truthy, it creates an `<img>` element with `src` set to `staticUrl`, `alt` set to `name`, and an `onerror` handler that calls `_renderTier1Fallback(container, emoji, name)` — so if the image fails to load, the container is augmented with the Tier 1 fallback. If neither branch matches (tier is 1, or tier is 2/3 but the relevant URL is absent), it calls `_renderTier1Fallback(container, emoji, name)` directly.

After the media element branch, it unconditionally creates a `<div>` with class `group-banner-tier-badge`, sets its `textContent` to the entry at index `tier` in the array `['', 'TIER I', 'TIER II', 'TIER III']` (falling back to `'TIER I'` if `tier` is out of bounds), and appends it. If `isLeader` is `true`, it creates a `<button>` with class `group-banner-edit-btn` and text `'✏ BANNER'`, attaches a `click` listener that calls `openBannerUploadSheet(group.id!, tier, wins, losses)`, and appends it. The function is synchronous and returns `void`.

### _renderTier1Fallback

`_renderTier1Fallback` accepts a `container` HTMLElement, an `emoji` string, and a `name` string. It creates a `<div>` with class `group-banner-t1` and assigns its `innerHTML` to a template containing three children: a `<span class="group-banner-t1-emoji">` holding `escapeHTML(emoji)`, a `<span class="group-banner-t1-name">` holding `escapeHTML(name)`, and a `<div class="group-banner-t1-stripe">`. Both user-supplied strings pass through `escapeHTML` from `src/config.ts` before insertion into `innerHTML`. The constructed `wrap` div is then appended to `container`. The function is synchronous, reads no module-level state, writes only to the DOM, and returns `void`.

### openBannerUploadSheet

`openBannerUploadSheet` accepts `groupId` (string), `currentTier` (number), `wins` (number), and `losses` (number). It first removes any existing element with id `gb-backdrop` from the DOM via `document.getElementById('gb-backdrop')?.remove()`, preventing duplicate sheets. It computes `total` as `wins + losses` and `winRate` as `Math.round((wins / total) * 100)` if `total > 0`, otherwise `0`. It derives two booleans: `t2Unlocked = currentTier >= 2` and `t3Unlocked = currentTier >= 3`.

It creates a `<div class="gb-backdrop" id="gb-backdrop">` and a `<div class="gb-sheet">`, then sets the sheet's `innerHTML` to a block containing: a drag handle, a title, a subtitle, a win-rate summary row (displaying `wins`, `losses`, `winRate`, and `currentTier` as plain integer literals — these are computed values, not user-supplied strings, so no `escapeHTML` is applied), a Tier I row that is always marked unlocked, a Tier II row whose class and content depend on `t2Unlocked`, and a Tier III row whose class and content depend on `t3Unlocked`. When a tier is unlocked, its row includes a `<button>` (id `gb-t2-btn` or `gb-t3-btn`) and a hidden `<input type="file">` (id `gb-t2-input` or `gb-t3-input`).

After setting `innerHTML`, the function wires four event listeners conditionally — only present if the tier is unlocked and the elements exist in the DOM. For Tier 2: a `click` listener on `#gb-t2-btn` that triggers `#gb-t2-input`'s `click()`, and a `change` listener on `#gb-t2-input` that reads `files?.[0]` and, if a file is present, calls `await _uploadBanner(groupId, file, 'static', backdrop)`. For Tier 3: the same pattern with `#gb-t3-btn` and `#gb-t3-input`, calling `await _uploadBanner(groupId, file, 'animated', backdrop)`. Both `change` handlers are declared `async`.

Finally, a `click` listener on `backdrop` itself calls `_closeSheet(backdrop)` when the click target is the backdrop element directly (not a child). The function appends `sheet` to `backdrop`, appends `backdrop` to `document.body`, and returns `void`. It is synchronous at the top level; the async work lives inside the event handlers.

### _closeSheet

`_closeSheet` accepts a single `backdrop` HTMLElement. It sets `backdrop.style.opacity` to `'0'` and `backdrop.style.transition` to `'opacity 0.2s'`, producing a CSS fade-out. It then calls `setTimeout(() => backdrop.remove(), 220)`, which schedules removal of the backdrop element from the DOM after 220 milliseconds — slightly longer than the 200ms transition to allow the fade to complete. The function is synchronous, reads no module-level state, writes only to the DOM and the browser timer queue, and returns `void`.

### _uploadBanner

`_uploadBanner` is `async` and accepts `groupId` (string), `file` (File), `type` (`'static'` or `'animated'`), and `backdrop` (HTMLElement). It returns `Promise<void>`.

Its first action is a size guard: if `file.size` exceeds 10MB (`10 * 1024 * 1024`), it calls `showToast('File too large — max 10MB', 'error')` and returns early.

If the size check passes, it locates the relevant upload button in the DOM by querying `backdrop` for `#gb-t2-btn` (if `type === 'static'`) or `#gb-t3-btn` (if `type === 'animated'`). If the button element is found, it sets `btn.disabled = true` and `btn.textContent = 'UPLOADING…'`.

The rest of the function runs inside a `try/catch` block. In the `try` branch: it calls `getSupabaseClient()` from `src/auth.ts` and throws `'Not connected'` if the result is falsy. It derives a file extension from `file.name.split('.').pop()`, falling back to `'jpg'` for static or `'mp4'` for animated. It constructs a storage path as `${groupId}/${type}.${ext}`.

It then `await`s an upload to the Supabase Storage bucket `'group-banners'` using `client.storage.from('group-banners').upload(path, file, { upsert: true, contentType: file.type })`. The client is cast to `any` at this call site. If `upErr` is present, it throws with `upErr.message`.

Next it `await`s `client.storage.from('group-banners').createSignedUrl(path, 60 * 60 * 24 * 365)` to obtain a one-year signed URL. If `signErr` is present or `signedData?.signedUrl` is falsy, it throws `'Could not get URL'`.

It then `await`s `safeRpc('save_group_banner', ...)` from `src/auth.ts`, passing `p_group_id`, `p_static_url` (set to `url` if `type === 'static'`, else `null`), and `p_animated_url` (set to `url` if `type === 'animated'`, else `null`). If the RPC returns an `error`, it throws with `error.message ?? 'Save failed'`. It also checks `data` cast as `{ error?: string } | null` — if `result?.error` is truthy, it throws with that string.

On success it calls `showToast('Banner updated ✓', 'success')`, calls `_closeSheet(backdrop)` to dismiss the sheet, and dispatches a `CustomEvent('group-banner-updated', { detail: { groupId } })` on `window` as a fire-and-forget signal (no caller in this file consumes it).

In the `catch` branch, it calls `showToast` with the caught error's message or `'Upload failed'`, and if `btn` was found, it re-enables it by setting `btn.disabled = false` and `btn.textContent = 'UPLOAD'`.

## Agent 02

### _injectCSS

`_injectCSS` reads the module-level boolean `_cssInjected` and returns immediately if it is `true`. On the first call, it sets `_cssInjected` to `true`, creates a `<style>` element via `document.createElement('style')`, assigns a multi-rule CSS string to `s.textContent`, then appends the element to `document.head`. The CSS string is a string literal embedded in the source — it contains rules for `.group-banner-zone`, the three tier banner classes, the edit button, the tier badge, the upload sheet backdrop and slide-up sheet, and all child elements within the sheet. The function is synchronous and returns `void`. After the first call the module-level flag prevents any further DOM writes.

### renderGroupBanner

`renderGroupBanner` takes three parameters: a `container` HTMLElement, a `group` object of type `GroupDetail`, and a boolean `isLeader`. It first calls `_injectCSS` to guarantee the stylesheet is present. It then reads six fields from `group` — `banner_tier` (defaulting to `1`), `banner_static_url` (defaulting to `null`), `banner_animated_url` (defaulting to `null`), `avatar_emoji` (defaulting to `'⚔️'`), `name` (defaulting to `''`), `gvg_wins` (defaulting to `0`), and `gvg_losses` (defaulting to `0`). It clears the container by setting `innerHTML` to `''` and sets `container.className` to `'group-banner-zone'`.

The function then branches on `tier`. If `tier === 3` and `animatedUrl` is truthy, it creates a `<video>` element with `autoplay`, `loop`, `muted`, and `playsInline` set to `true` and its `src` set to `animatedUrl`, and appends it to the container. Otherwise, if `tier >= 2` and `staticUrl` is truthy, it creates an `<img>` element with `src = staticUrl` and sets an `onerror` handler that calls `_renderTier1Fallback(container, emoji, name)` — this handler fires if the image fails to load, replacing the container's content with the Tier 1 gradient. If neither condition matches, it calls `_renderTier1Fallback(container, emoji, name)` directly. After the media element branch, it creates a `<div>` with class `group-banner-tier-badge`, sets its text to one of `['', 'TIER I', 'TIER II', 'TIER III'][tier]` (falling back to `'TIER I'` if `tier` is out of range), and appends it to the container. Finally, if `isLeader` is `true`, it creates a `<button>` with class `group-banner-edit-btn`, sets its text to `'✏ BANNER'`, attaches a click listener that calls `openBannerUploadSheet(group.id!, tier, wins, losses)`, and appends it to the container. The function is synchronous and returns `void`.

### _renderTier1Fallback

`_renderTier1Fallback` takes a `container` HTMLElement, an `emoji` string, and a `name` string. It creates a `<div>` element, assigns it the class `'group-banner-t1'`, and sets its `innerHTML` to a template containing a `<span>` with the emoji and a `<span>` with the group name — both passed through `escapeHTML` from `src/config.ts` before insertion — plus a decorative stripe `<div>`. It then appends the constructed `<div>` to `container`. The function is synchronous and returns `void`. It does not clear the container before appending; in the `onerror` path triggered from `renderGroupBanner`, the container still holds the failed `<img>` element at the time this function runs, so it appends the fallback alongside the broken image rather than replacing it — it is not obvious from this file whether that visual overlap is intentional.

### openBannerUploadSheet

`openBannerUploadSheet` takes `groupId` (string), `currentTier` (number), `wins` (number), and `losses` (number). It first calls `document.getElementById('gb-backdrop')?.remove()` to discard any pre-existing sheet. It computes `winRate` as `Math.round((wins / total) * 100)` where `total = wins + losses`; if `total` is `0` the win rate is set to `0`. It derives two boolean flags: `t2Unlocked` (`currentTier >= 2`) and `t3Unlocked` (`currentTier >= 3`).

It creates a `<div>` backdrop element with class and id `'gb-backdrop'` and a `<div>` sheet element with class `'gb-sheet'`. It sets the sheet's `innerHTML` to a multi-section template that displays the GvG record and win rate, a locked Tier I row (always marked active), a Tier II row whose class, description text, status label, and upload button/input are conditional on `t2Unlocked`, and a Tier III row whose class, description, status, and upload button/input are conditional on `t3Unlocked`. The `wins`, `losses`, `winRate`, and `currentTier` values are inserted directly into the template as numbers — they are not passed through `escapeHTML`, but they are numeric values computed in this function, not raw user input.

After setting the sheet's `innerHTML`, the function appends the sheet to the backdrop and the backdrop to `document.body`. It then attaches event listeners conditionally: if `#gb-t2-btn` exists, clicking it triggers a click on the hidden `#gb-t2-input`; when `#gb-t2-input` fires a `change` event, the async handler reads `files[0]` and, if present, awaits `_uploadBanner(groupId, file, 'static', backdrop)`. The same pattern is attached for `#gb-t3-btn` and `#gb-t3-input`, passing `'animated'` as the type. A click listener on the backdrop calls `_closeSheet(backdrop)` when the click target is the backdrop element itself (not its children). The function is synchronous and returns `void`.

### _closeSheet

`_closeSheet` takes one parameter: `backdrop`, an HTMLElement. It sets `backdrop.style.opacity` to `'0'` and `backdrop.style.transition` to `'opacity 0.2s'`, triggering a CSS fade-out via inline style. It then calls `setTimeout(() => backdrop.remove(), 220)`, scheduling removal of the backdrop element from the DOM after 220 milliseconds. The function is synchronous and returns `void`. It does not cancel any previously scheduled removal, so calling it twice on the same element would schedule two removal calls.

### _uploadBanner

`_uploadBanner` is an async function taking `groupId` (string), `file` (File), `type` (`'static' | 'animated'`), and `backdrop` (HTMLElement). It begins with a size guard: if `file.size` exceeds 10 MB (10 × 1024 × 1024 bytes), it calls `showToast('File too large — max 10MB', 'error')` and returns early. Otherwise it queries the backdrop for the button matching `type` — `#gb-t2-btn` for `'static'`, `#gb-t3-btn` for `'animated'` — and if found, disables it and sets its text to `'UPLOADING…'`.

Inside a `try` block, it calls `getSupabaseClient()` and throws `new Error('Not connected')` if the result is falsy. It derives `ext` by splitting `file.name` on `'.'` and taking the last segment, falling back to `'jpg'` for static or `'mp4'` for animated. It constructs the storage path as `` `${groupId}/${type}.${ext}` ``.

It awaits a Supabase Storage upload call on the `'group-banners'` bucket with `upsert: true`. The client is cast with `(client as any)`, so the exact storage API surface is not enforced by TypeScript here. If `upErr` is truthy it throws `new Error(upErr.message)`. It then awaits a `createSignedUrl` call for the same path with a one-year TTL (60 × 60 × 24 × 365 seconds). If `signErr` is truthy or `signedData?.signedUrl` is falsy it throws `new Error('Could not get URL')`. Otherwise `url` is set to `signedData.signedUrl`.

It then awaits `safeRpc('save_group_banner', { p_group_id, p_static_url, p_animated_url })`, where `p_static_url` is `url` when `type === 'static'` and `null` otherwise, and `p_animated_url` is `url` when `type === 'animated'` and `null` otherwise. If the RPC returns a truthy `error`, it throws `new Error(error.message ?? 'Save failed')`. If `data` cast as `{ error?: string } | null` contains an `error` property, it throws `new Error(result.error)`.

On success it calls `showToast('Banner updated ✓', 'success')`, calls `_closeSheet(backdrop)` to fade and remove the sheet, and fires `window.dispatchEvent(new CustomEvent('group-banner-updated', { detail: { groupId } }))` as a fire-and-forget browser event for external listeners to handle re-rendering. In the `catch` block, it calls `showToast` with the caught error's message (falling back to `'Upload failed'`), and if `btn` was found, re-enables it and resets its text to `'UPLOAD'`.

## Agent 03

### _injectCSS

`_injectCSS` reads the module-level boolean `_cssInjected`, which is initialized to `false`. If `_cssInjected` is already `true`, the function returns immediately without doing anything. Otherwise it sets `_cssInjected` to `true`, creates a `<style>` element via `document.createElement('style')`, assigns a multiline string of CSS rules to `s.textContent`, and appends the element to `document.head`. The CSS string is a literal — no external state is read to compose it. The function returns `void`. It is synchronous. After the first call, every subsequent call exits at the guard check, so the style element is inserted exactly once per page lifetime.

### renderGroupBanner

`renderGroupBanner` accepts three parameters: `container` (an `HTMLElement` to render into), `group` (a `GroupDetail` object carrying banner and identity data), and `isLeader` (a boolean). It begins by calling `_injectCSS`, which inserts the module's stylesheet on first call. It then reads `group.banner_tier` (defaulting to `1`), `group.banner_static_url`, `group.banner_animated_url`, `group.avatar_emoji` (defaulting to `'⚔️'`), `group.name`, `group.gvg_wins`, and `group.gvg_losses` from the `group` parameter.

The function clears `container.innerHTML`, sets `container.className` to `'group-banner-zone'`, then enters a three-branch conditional. If `tier === 3` and `animatedUrl` is truthy, it creates a `<video>` element with `autoplay`, `loop`, `muted`, and `playsInline` set to `true`, assigns `animatedUrl` to its `src`, and appends it to `container`. If `tier >= 2` and `staticUrl` is truthy, it creates an `<img>` element whose `src` is `staticUrl` and whose `onerror` handler calls `_renderTier1Fallback(container, emoji, name)` to replace failed image loads. If neither branch matches, it calls `_renderTier1Fallback(container, emoji, name)` directly. After the branch, it always creates a `<div>` with class `'group-banner-tier-badge'`, sets its `textContent` to one of `['', 'TIER I', 'TIER II', 'TIER III'][tier]` (falling back to `'TIER I'` if `tier` is out of bounds), and appends it to `container`. If `isLeader` is `true`, it creates a `<button>` with class `'group-banner-edit-btn'`, attaches a `click` listener that calls `openBannerUploadSheet(group.id!, tier, wins, losses)`, and appends it to `container`. The function returns `void` and is synchronous.

### _renderTier1Fallback

`_renderTier1Fallback` accepts `container` (an `HTMLElement`), `emoji` (a string), and `name` (a string). It creates a `<div>` element, sets its `className` to `'group-banner-t1'`, and assigns to its `innerHTML` a template literal containing a `<span>` for the emoji, a `<span>` for the name, and an empty stripe `<div>`. Both `emoji` and `name` are passed through `escapeHTML` (imported from `config.ts`) before interpolation into `innerHTML`. The resulting element is appended to `container`. The function does not read any module-level state, makes no network calls, and returns `void`. It is synchronous.

### openBannerUploadSheet

`openBannerUploadSheet` accepts `groupId` (a string), `currentTier` (a number), `wins` (a number), and `losses` (a number). It begins by querying the DOM for an element with id `'gb-backdrop'` and removing it if found, which collapses any previously open sheet. It computes `total` as `wins + losses` and `winRate` as `Math.round((wins / total) * 100)` when `total > 0`, or `0` when `total` is zero.

It creates a `div.gb-backdrop` with id `'gb-backdrop'` and a `div.gb-sheet`, then sets `sheet.innerHTML` to a multi-section template. Two local booleans, `t2Unlocked` (`currentTier >= 2`) and `t3Unlocked` (`currentTier >= 3`), control which tier rows receive the `'unlocked'` vs `'locked'` class and whether the upload button and hidden file input are rendered at all. The `wins`, `losses`, `winRate`, and `currentTier` values are interpolated directly into the HTML string without `escapeHTML`; `groupId` is not interpolated into the HTML. The sheet is appended to the backdrop, and the backdrop is appended to `document.body`.

After DOM insertion, four event listeners are conditionally wired. For Tier 2, if `t2Unlocked`, a `click` listener on `#gb-t2-btn` triggers a programmatic `.click()` on `#gb-t2-input`, and a `change` listener on `#gb-t2-input` reads `e.target.files[0]` and, if a file is present, awaits `_uploadBanner(groupId, file, 'static', backdrop)`. For Tier 3, if `t3Unlocked`, identical wiring is done for `#gb-t3-btn`/`#gb-t3-input`, calling `_uploadBanner(groupId, file, 'animated', backdrop)`. Because the button and input elements are only rendered when the tier is unlocked, the `querySelector` calls for locked tiers return `null` and the optional-chaining silently skips attachment. A `click` listener on the backdrop itself calls `_closeSheet(backdrop)` when `e.target === backdrop` (i.e., a click outside the sheet). The function returns `void` and is synchronous, though the upload callbacks it registers are async.

### _closeSheet

`_closeSheet` accepts a single parameter `backdrop` (an `HTMLElement`). It sets `backdrop.style.opacity` to `'0'` and `backdrop.style.transition` to `'opacity 0.2s'`, triggering a CSS fade-out. It then calls `setTimeout` with a callback that calls `backdrop.remove()` and a delay of `220` milliseconds. The 220ms delay is slightly longer than the 0.2s transition duration. The function does not read or write module-level state, does not await anything, and returns `void`. It is synchronous; the `setTimeout` callback fires asynchronously after the function returns.

### _uploadBanner

`_uploadBanner` is an `async` function accepting `groupId` (string), `file` (a `File` object), `type` (`'static'` or `'animated'`), and `backdrop` (an `HTMLElement`). It begins with a synchronous file-size guard: if `file.size` exceeds `10 * 1024 * 1024` (10MB), it calls `showToast('File too large — max 10MB', 'error')` and returns early.

If the file passes the size check, the function queries `backdrop` for the button matching `type` — `#gb-t2-btn` for `'static'`, `#gb-t3-btn` for `'animated'` — and, if found, disables it and sets its text to `'UPLOADING…'`. Everything after this point is inside a `try/catch` block.

In the `try` block, it calls `getSupabaseClient()` (imported from `auth.ts`) and throws `'Not connected'` if the result is falsy. It derives a file extension by splitting `file.name` on `'.'` and taking the last segment, defaulting to `'jpg'` for `'static'` or `'mp4'` for `'animated'` if no extension is found. The storage path is `${groupId}/${type}.${ext}`.

It then awaits `client.storage.from('group-banners').upload(path, file, { upsert: true, contentType: file.type })`, casting `client` to `any`. If the response contains an error, it throws a new `Error` with the error's message. Next it awaits `client.storage.from('group-banners').createSignedUrl(path, 60 * 60 * 24 * 365)` (a one-year signed URL). If that call errors or `signedData?.signedUrl` is falsy, it throws `'Could not get URL'`.

With a valid URL in hand, it awaits `safeRpc('save_group_banner', { p_group_id: groupId, p_static_url: url | null, p_animated_url: url | null })`. The `p_static_url` field receives `url` only when `type === 'static'`; otherwise it is `null`. Symmetrically, `p_animated_url` receives `url` only when `type === 'animated'`. If `safeRpc` returns an `error`, or if the returned `data` has a truthy `error` property, it throws. On success, it calls `showToast('Banner updated ✓', 'success')`, calls `_closeSheet(backdrop)` to dismiss the sheet, and dispatches a `CustomEvent` named `'group-banner-updated'` with `{ detail: { groupId } }` on `window`.

In the `catch` block, it calls `showToast` with the caught error's message (or `'Upload failed'` as a fallback), then re-enables the button and resets its text to `'UPLOAD'` if the button reference is non-null. The function returns `Promise<void>`.

## Agent 04

### _injectCSS

`_injectCSS` reads the module-level boolean `_cssInjected`, which is initialized to `false`. On the first call, the guard `if (_cssInjected) return` is false, so the function proceeds: it sets `_cssInjected` to `true`, creates a `<style>` element via `document.createElement('style')`, assigns a multi-block CSS string literal to `s.textContent`, and calls `document.head.appendChild(s)`. On every subsequent call, `_cssInjected` is `true` and the function returns immediately without touching the DOM. The function takes no parameters, returns `void`, and is synchronous.

### renderGroupBanner

`renderGroupBanner` is synchronous and takes three parameters: a `container` DOM element, a `group` object of type `GroupDetail`, and a boolean `isLeader`. It first calls `_injectCSS`, which injects styles if not already present. It then reads six fields from `group` with nullish fallbacks: `banner_tier` (defaulting to `1`), `banner_static_url` (defaulting to `null`), `banner_animated_url` (defaulting to `null`), `avatar_emoji` (defaulting to `'⚔️'`), `name` (defaulting to `''`), `gvg_wins` (defaulting to `0`), and `gvg_losses` (defaulting to `0`). It clears the container by setting `container.innerHTML = ''` and sets `container.className = 'group-banner-zone'`.

The function then enters a three-branch conditional on `tier`. If `tier === 3` and `animatedUrl` is truthy, it creates a `<video>` element with `autoplay`, `loop`, `muted`, and `playsInline` attributes set to true, assigns `src = animatedUrl`, and appends it to the container. If that branch is not taken but `tier >= 2` and `staticUrl` is truthy, it creates an `<img>` element, sets `src = staticUrl` and `alt = name`, and assigns an `onerror` handler that calls `_renderTier1Fallback(container, emoji, name)` — replacing the image in the container with the Tier 1 gradient if the image fails to load. If neither branch is taken, it calls `_renderTier1Fallback(container, emoji, name)` directly. After the media branch, it creates a `<div>` for the tier badge using `tierLabels[tier] ?? 'TIER I'` (where `tierLabels` is a local array `['', 'TIER I', 'TIER II', 'TIER III']`) and appends it to the container. Finally, if `isLeader` is `true`, it creates a `<button>` with class `group-banner-edit-btn`, assigns a click listener that calls `openBannerUploadSheet(group.id!, tier, wins, losses)`, and appends it to the container. The function returns `void`.

### _renderTier1Fallback

`_renderTier1Fallback` is synchronous and takes a `container` DOM element, an `emoji` string, and a `name` string. It creates a `<div>` element, sets its `className` to `'group-banner-t1'`, and assigns `innerHTML` using a template literal that passes both `emoji` and `name` through `escapeHTML` (imported from `config.ts`) before interpolation. The resulting HTML contains a `<span>` for the emoji, a `<span>` for the name, and a `<div>` for a diagonal-stripe overlay. It then calls `container.appendChild(wrap)`, adding the constructed element to the container. The function returns `void` and does not read or write any module-level state.

### openBannerUploadSheet

`openBannerUploadSheet` is synchronous in its outer body and takes four parameters: `groupId` (string), `currentTier` (number), `wins` (number), and `losses` (number). It reads no module-level state. It begins by calling `document.getElementById('gb-backdrop')?.remove()` to remove any previously open sheet from the DOM.

It computes `winRate` as `Math.round((wins / total) * 100)` where `total = wins + losses`; if `total` is `0`, `winRate` is set to `0`. It derives two booleans: `t2Unlocked = currentTier >= 2` and `t3Unlocked = currentTier >= 3`. It then builds a `backdrop` div with id `'gb-backdrop'` and a `sheet` div, injects them into `document.body` via `backdrop.appendChild(sheet)` followed by `document.body.appendChild(backdrop)`. The sheet's `innerHTML` is set using a template literal that embeds `wins`, `losses`, `winRate`, and `currentTier` as raw numeric values (no `escapeHTML` — these come from `GroupDetail` fields, not direct user input). The Tier 2 row conditionally includes `#gb-t2-btn` and `#gb-t2-input` elements when `t2Unlocked` is true; the Tier 3 row similarly includes `#gb-t3-btn` and `#gb-t3-input` when `t3Unlocked` is true.

After injecting the HTML, the function attaches event listeners to the sheet. If `#gb-t2-btn` exists, a click listener calls `sheet.querySelector<HTMLInputElement>('#gb-t2-input')?.click()` to open the file picker. The `change` event on `#gb-t2-input` extracts `files?.[0]`; if a file is present, it `await`s `_uploadBanner(groupId, file, 'static', backdrop)` — making the change handler an async function, though the outer `openBannerUploadSheet` call does not await it. The same pattern applies for `#gb-t3-btn` and `#gb-t3-input`, with `type` passed as `'animated'`. A click listener on the backdrop itself calls `_closeSheet(backdrop)` when `e.target === backdrop`. The function returns `void`.

### _closeSheet

`_closeSheet` is synchronous and takes a single parameter: `backdrop`, an `HTMLElement`. It sets `backdrop.style.opacity = '0'` and `backdrop.style.transition = 'opacity 0.2s'` directly on the element's inline styles, then calls `setTimeout(() => backdrop.remove(), 220)`. The 220ms delay gives the CSS opacity transition approximately 20ms of overlap before the element is removed from the DOM. The function reads and writes no module-level state and returns `void`.

### _uploadBanner

`_uploadBanner` is `async` and takes four parameters: `groupId` (string), `file` (File), `type` (`'static' | 'animated'`), and `backdrop` (HTMLElement).

It first checks `file.size > 10 * 1024 * 1024`. If the file exceeds 10MB, it calls `showToast('File too large — max 10MB', 'error')` and returns early with `void`.

If the size check passes, it queries `backdrop` for the relevant button (`#gb-t2-btn` for `'static'`, `#gb-t3-btn` for `'animated'`). If the button is found, it sets `btn.disabled = true` and `btn.textContent = 'UPLOADING…'`.

The remainder runs inside a `try/catch`. In the try block: it calls `getSupabaseClient()` and throws `new Error('Not connected')` if the result is falsy. It derives a file extension from `file.name.split('.').pop()`, falling back to `'jpg'` for static or `'mp4'` for animated. It constructs a storage path as `${groupId}/${type}.${ext}`.

It then `await`s a Supabase Storage `upload` call on the `'group-banners'` bucket with `{ upsert: true, contentType: file.type }`. If `upErr` is truthy, it throws `new Error(upErr.message)`. Next it `await`s `createSignedUrl` on the same path with a one-year TTL (60 × 60 × 24 × 365 seconds). If `signErr` is truthy or `signedData?.signedUrl` is falsy, it throws `new Error('Could not get URL')`. The resulting URL is stored in `url`.

It then `await`s `safeRpc('save_group_banner', { p_group_id: groupId, p_static_url: url or null, p_animated_url: url or null })` — `p_static_url` receives `url` only if `type === 'static'`, and `p_animated_url` receives `url` only if `type === 'animated'`; the other field is `null`. If the RPC returns an `error`, it throws `new Error(error.message ?? 'Save failed')`. If `data` casts to an object with a truthy `error` string, it throws `new Error(result.error)`.

On success, it calls `showToast('Banner updated ✓', 'success')`, calls `_closeSheet(backdrop)`, and dispatches a `CustomEvent('group-banner-updated', { detail: { groupId } })` on `window`. In the catch block, it calls `showToast` with the error message or `'Upload failed'`, re-enables the button by setting `btn.disabled = false` and `btn.textContent = 'UPLOAD'`. The function returns `Promise<void>`.

## Agent 05

### _injectCSS

`_injectCSS` reads the module-level boolean `_cssInjected`, which is initialized to `false`. If `_cssInjected` is already `true`, the function returns immediately without doing anything. Otherwise it sets `_cssInjected` to `true`, creates a `<style>` element via `document.createElement('style')`, assigns a multi-rule CSS string to `s.textContent`, and appends the element to `document.head`. The CSS string defines all styles used by the banner zone and upload sheet: `.group-banner-zone`, `.group-banner-t1` and its children, `.group-banner-t2`, `.group-banner-t3`, `.group-banner-edit-btn`, `.group-banner-tier-badge`, `.gb-backdrop`, `.gb-sheet`, `.gb-handle`, `.gb-title`, `.gb-subtitle`, `.gb-tier-row`, `.gb-tier-icon`, `.gb-tier-info`, `.gb-tier-label`, `.gb-tier-desc`, `.gb-tier-status`, `.gb-upload-btn`, and `.gb-win-rate`. The function is synchronous, returns `void`, and writes only to the DOM and to `_cssInjected`.

### renderGroupBanner

`renderGroupBanner` takes three parameters: a `container` HTMLElement, a `group` object of type `GroupDetail`, and a boolean `isLeader`. It calls `_injectCSS` first. It then reads `group.banner_tier` (defaulting to `1`), `group.banner_static_url` (defaulting to `null`), `group.banner_animated_url` (defaulting to `null`), `group.avatar_emoji` (defaulting to `'⚔️'`), `group.name` (defaulting to `''`), `group.gvg_wins` (defaulting to `0`), and `group.gvg_losses` (defaulting to `0`). It clears `container.innerHTML` and sets `container.className` to `'group-banner-zone'`.

The function then branches on `tier` and URL availability. If `tier === 3` and `animatedUrl` is truthy, it creates a `<video>` element with `className='group-banner-t3'`, sets `src`, `autoplay`, `loop`, `muted`, and `playsInline`, then appends it to `container`. If that branch does not apply but `tier >= 2` and `staticUrl` is truthy, it creates an `<img>` element with `className='group-banner-t2'`, sets `src` and `alt`, and attaches an `onerror` handler that calls `_renderTier1Fallback(container, emoji, name)`; the image is then appended to `container`. If neither branch applies, it calls `_renderTier1Fallback(container, emoji, name)` directly. After placing the media element, it creates a `<div>` with `className='group-banner-tier-badge'`, sets its `textContent` to a value looked up from the array `['', 'TIER I', 'TIER II', 'TIER III']` using `tier` as the index (falling back to `'TIER I'` if the index is out of range), and appends it to `container`. If `isLeader` is `true`, it creates a `<button>` with `className='group-banner-edit-btn'` and text `'✏ BANNER'`, attaches a click listener that calls `openBannerUploadSheet(group.id!, tier, wins, losses)`, and appends it to `container`. The function is synchronous and returns `void`.

### _renderTier1Fallback

`_renderTier1Fallback` takes a `container` HTMLElement, an `emoji` string, and a `name` string. It creates a `<div>` element, sets `className` to `'group-banner-t1'`, and sets `innerHTML` to a template literal that renders a `<span class="group-banner-t1-emoji">`, a `<span class="group-banner-t1-name">`, and a `<div class="group-banner-t1-stripe">`. Both `emoji` and `name` are passed through `escapeHTML` from `config.ts` before insertion into `innerHTML`. The constructed `div` is appended to `container`. The function is synchronous, returns `void`, and writes only to the DOM.

### openBannerUploadSheet

`openBannerUploadSheet` takes four parameters: `groupId` (string), `currentTier` (number), `wins` (number), and `losses` (number). It is synchronous. It first removes any existing element with id `'gb-backdrop'` from the document via `document.getElementById('gb-backdrop')?.remove()`, preventing duplicate sheets. It computes `total` as `wins + losses` and `winRate` as `Math.round((wins / total) * 100)` if `total > 0`, otherwise `0`. It derives `t2Unlocked` as `currentTier >= 2` and `t3Unlocked` as `currentTier >= 3`.

It then creates a `<div>` backdrop element with `className='gb-backdrop'` and `id='gb-backdrop'`, and a `<div>` sheet element with `className='gb-sheet'`. It sets `sheet.innerHTML` to an HTML string that contains the GvG record display, the Tier I row (always shown as unlocked), the Tier II row (shown as `unlocked` or `locked` depending on `t2Unlocked`, and including an upload button and hidden file input only if `t2Unlocked` is true), and the Tier III row (shown as `unlocked` or `locked` depending on `t3Unlocked`, and including an upload button and hidden file input only if `t3Unlocked` is true). The `wins`, `losses`, `winRate`, and `currentTier` values are inserted directly into the HTML string without escaping; the tier description strings are static literals, not user content.

After setting `innerHTML`, the function appends `sheet` to `backdrop` and appends `backdrop` to `document.body`. It then attaches event listeners. For Tier 2: a click listener on `#gb-t2-btn` that programmatically clicks `#gb-t2-input`; a `change` listener on `#gb-t2-input` that reads `files?.[0]` and, if present, awaits `_uploadBanner(groupId, file, 'static', backdrop)`. For Tier 3: a click listener on `#gb-t3-btn` that programmatically clicks `#gb-t3-input`; a `change` listener on `#gb-t3-input` that reads `files?.[0]` and, if present, awaits `_uploadBanner(groupId, file, 'animated', backdrop)`. These `change` listeners are declared `async`. A click listener on `backdrop` calls `_closeSheet(backdrop)` when the click target is the backdrop element itself (i.e., clicking outside the sheet). The upload button and file input elements are only queried and wired if the respective tier is unlocked; if they are absent from the DOM, the `querySelector` calls return `null` and no listeners are attached.

### _closeSheet

`_closeSheet` takes a single `backdrop` HTMLElement. It sets `backdrop.style.opacity` to `'0'` and `backdrop.style.transition` to `'opacity 0.2s'`, triggering a CSS fade-out. It then calls `setTimeout(() => backdrop.remove(), 220)`, scheduling removal of the element from the DOM after 220 milliseconds. The function is synchronous, returns `void`, and does not interact with any module-level state.

### _uploadBanner

`_uploadBanner` is an `async` function that takes `groupId` (string), `file` (File), `type` (`'static' | 'animated'`), and `backdrop` (HTMLElement). It first checks `file.size > 10 * 1024 * 1024`; if true, it calls `showToast('File too large — max 10MB', 'error')` and returns early without doing anything else.

If the size check passes, it queries `backdrop` for the upload button — `#gb-t2-btn` if `type === 'static'`, `#gb-t3-btn` if `type === 'animated'` — and, if found, disables it and sets its `textContent` to `'UPLOADING…'`. The rest of the function body is inside a `try/catch`.

In the `try` block: it calls `getSupabaseClient()` and throws `new Error('Not connected')` if the result is falsy. It derives a file extension from `file.name.split('.').pop()`, falling back to `'jpg'` for `'static'` or `'mp4'` for `'animated'`. It constructs a storage path as `` `${groupId}/${type}.${ext}` ``. It then awaits a Supabase Storage `upload` call on the `'group-banners'` bucket with `{ upsert: true, contentType: file.type }`; if the response contains an error, it throws `new Error(upErr.message)`. Next it awaits a `createSignedUrl` call on the same path with a 1-year TTL (60 * 60 * 24 * 365 seconds); if that produces an error or the response lacks `signedUrl`, it throws `new Error('Could not get URL')`. The signed URL is stored in `url`.

It then awaits `safeRpc('save_group_banner', { p_group_id: groupId, p_static_url: url if type === 'static' else null, p_animated_url: url if type === 'animated' else null })`. If the RPC response contains an error, it throws `new Error(error.message ?? 'Save failed')`. It also checks the `data` payload cast as `{ error?: string } | null`: if `result?.error` is truthy, it throws `new Error(result.error)`.

On success, it calls `showToast('Banner updated ✓', 'success')`, calls `_closeSheet(backdrop)`, and dispatches a `CustomEvent` named `'group-banner-updated'` with `detail: { groupId }` on `window`. The `catch` block calls `showToast` with the caught error's message or `'Upload failed'`, and if the button reference is still held, re-enables it and resets its `textContent` to `'UPLOAD'`. The Supabase Storage calls and `safeRpc` are all awaited in sequence. Nothing is fire-and-forget.
