# Stage 2 Outputs — groups.feed.ts

## Agent 01

### loadGroupHotTakes

**Async function.** Reads `groupId` parameter. Reads module state: `sb` (Supabase client) and `currentUser`. Calls `sb.from('hot_takes').select(...).eq('section', groupId).eq('is_active', true).order('created_at', { ascending: false }).limit(30)` and awaits result, destructuring `{ data, error }`. Checks if `error` is truthy; if so, throws it into catch block. If no error and `data` is falsy or empty array: constructs `composerHtml` as HTML string (conditionally includes textarea/button if `currentUser` truthy). Sets `innerHTML` of element with id `detail-hot-takes` to `composerHtml + renderEmpty(...)`. Calls `_wireGroupTakeComposer(groupId)` synchronously. Returns early. If data exists and non-empty: maps over `data` array, for each item `t`, extracts author from `t.profiles_public.username` or `t.profiles_public.display_name` or fallback 'Unknown', escapes it with `escapeHTML(author)`, constructs HTML div with class `group-take` containing escaped author and escaped `t.content`. Joins all divs into `takesHtml` string. Sets `innerHTML` of element id `detail-hot-takes` to `composerHtml + takesHtml`. Calls `_wireGroupTakeComposer(groupId)` synchronously. On catch: sets `innerHTML` of element id `detail-hot-takes` to error state using `renderEmpty(...)`.

### _wireGroupTakeComposer

**Synchronous function.** Reads `groupId` parameter. Reads DOM: queries elements with ids `group-take-input`, `group-take-post`, `group-take-count`. If `!input || !btn`: returns early. Otherwise: adds 'input' event listener to `input` that updates `counter.textContent` to `input.value.length + '/280'` if `counter` is truthy. Adds 'click' event listener to `btn` that calls `postGroupHotTake(groupId)` synchronously (uncertainty: whether `postGroupHotTake` is awaited inside the listener is not visible).

### postGroupHotTake

**Async function.** Reads `groupId` parameter. Reads DOM: queries element with id `group-take-input`. If falsy, returns early. Reads `input.value`, trims it to `text`. If `text` is falsy: sets `input.style.borderColor` to `'var(--mod-magenta)'`, schedules setTimeout to reset after 1500ms. Returns early. If `currentUser` falsy: redirects `window.location.href`. Returns early. Reads DOM: queries element with id `group-take-post`. If button exists: sets `btn.disabled = true` and `btn.textContent = '…'`. Inside try block: calls `safeRpc('create_hot_take', { p_content: text, p_section: groupId })` and awaits, destructuring `{ error }`. If `error` truthy: calls `showToast('Post failed — try again', 'error')`. Resets button. Returns early. If no error: clears `input.value`, updates `group-take-count` to `'0/280'`, calls `showToast('🔥 Hot take posted', 'success')`, calls `loadGroupHotTakes(groupId)` and awaits it. Catch block: calls `showToast('Post failed — try again', 'error')`. After try/catch: resets button.

## Agent 02

### loadGroupHotTakes

Async function. Reads `groupId` parameter. Reads module state: `sb` (Supabase client), `currentUser`. Calls `sb.from('hot_takes').select(...).eq('section', groupId).eq('is_active', true).order('created_at', { ascending: false }).limit(30)` and awaits the response. On error, catches in try/catch and renders error state to `detail-hot-takes`. On success with empty data, constructs `composerHtml` conditionally (if `currentUser` truthy). Sets `detail-hot-takes` innerHTML to `composerHtml + renderEmpty(...)`, calls `_wireGroupTakeComposer(groupId)`, returns early. On success with data, maps over `data` array, escaping author and content, writes to `detail-hot-takes`, calls `_wireGroupTakeComposer(groupId)`. Control flow: try/catch with single early return on empty data.

### _wireGroupTakeComposer

Synchronous function. Reads `groupId` parameter and DOM elements `group-take-input`, `group-take-post`, `group-take-count`. Early return if `!input || !btn`. Adds 'input' listener: updates `counter.textContent` to `input.value.length + '/280'` if counter non-null. Adds 'click' listener: calls `postGroupHotTake(groupId)`.

### postGroupHotTake

Async function. Reads `groupId` parameter. Gets `group-take-input` DOM element. Early return if null. Trims input value to `text`. If falsy: sets borderColor to magenta, schedules setTimeout to revert after 1500ms, returns early. If `!currentUser`: redirects `window.location.href`, returns early. Gets `group-take-post`. If exists, disables button. Awaits `safeRpc('create_hot_take', ...)`. If error: showToast, reset button, return early. On success: clears input, resets counter to '0/280', showToast success, awaits `loadGroupHotTakes(groupId)`. Catch: showToast error. After try/catch: reset button.

## Agent 03

### loadGroupHotTakes

Async function called with `groupId` parameter. Reads `sb` and `currentUser` from module state. Queries `hot_takes` table with joins, awaits. If error, throws into catch. Constructs composerHtml if currentUser truthy. If data empty/falsy, writes to `detail-hot-takes`, calls `_wireGroupTakeComposer`, returns. Otherwise maps over data, escapes author and content, writes to `detail-hot-takes`, calls `_wireGroupTakeComposer`. Catch block writes error state to `detail-hot-takes`.

### _wireGroupTakeComposer

Synchronous. Reads `groupId`. Gets `group-take-input`, `group-take-post`, `group-take-count` from DOM. Returns early if input or btn null. Adds input listener to update counter. Adds click listener to call `postGroupHotTake(groupId)`.

### postGroupHotTake

Async function. Gets `group-take-input`. Returns early if null. Trims input value. If empty, sets borderColor red, setTimeout to reset after 1500ms, returns. If `!currentUser`, redirects to plinko, returns. Gets `group-take-post`. Disables if exists. Awaits `safeRpc('create_hot_take', ...)`. If error, showToast, re-enable btn, return. Success: clear input, reset counter, showToast, await `loadGroupHotTakes`. Catch: showToast error. After try/catch: re-enable button. Uncertainty: whether the try block continues after loadGroupHotTakes or whether awaiting loadGroupHotTakes fully completes before the final if statement executes.

## Agent 04

### loadGroupHotTakes

Async function. Reads `groupId`, module state `sb` and `currentUser`. Executes Supabase query on `hot_takes` table filtered by section=groupId and is_active=true, ordered by created_at descending, limit 30. Throws error if query returns error. Builds composerHtml if currentUser truthy. If data falsy or empty, writes to `detail-hot-takes`, calls `_wireGroupTakeComposer`, returns early. Otherwise maps over data, escaping author and content, writes to `detail-hot-takes`, calls `_wireGroupTakeComposer`. Catch writes error state to `detail-hot-takes`.

### _wireGroupTakeComposer

Synchronous. Reads `groupId`. Gets three DOM elements. Returns early if input or btn null. Adds input listener updating counter. Adds click listener calling `postGroupHotTake(groupId)`.

### postGroupHotTake

Async function. Gets `group-take-input`. Returns early if null. Trims input value. If empty: sets borderColor to magenta, setTimeout 1500ms to restore, returns. If `!currentUser`: redirects to plinko with returnTo param, returns. Gets `group-take-post`. Disables if exists. Awaits `safeRpc('create_hot_take', ...)`. If error: showToast, re-enables btn, returns early. Success: clear input, reset counter to '0/280', showToast success, awaits `loadGroupHotTakes(groupId)`. Catch: showToast error. After try/catch: re-enables button.

## Agent 05

### loadGroupHotTakes

Async function. Reads `groupId`, module state `sb` and `currentUser`. Queries `hot_takes` table. On error, throws to catch. Builds composerHtml if currentUser truthy. If data empty/falsy, writes composerHtml plus empty state to `detail-hot-takes`, calls `_wireGroupTakeComposer`, returns early. Otherwise maps over data, calls `escapeHTML` on author and content, writes to `detail-hot-takes`, calls `_wireGroupTakeComposer`. Catch writes error state to `detail-hot-takes`.

### _wireGroupTakeComposer

Synchronous. Gets `group-take-input`, `group-take-post`, `group-take-count`. Returns early if input or btn null. Adds input listener updating counter. Adds click listener calling `postGroupHotTake(groupId)`.

### postGroupHotTake

Async function. Gets `group-take-input`. Returns early if null. Trims input. If empty: sets borderColor, setTimeout 1500ms, returns early. If `!currentUser`: sets window.location.href to plinko with encoded returnTo, returns. Gets `group-take-post`. Disables if exists. Awaits `safeRpc('create_hot_take', ...)`. If error: showToast, re-enables btn, returns. Success: clears input, resets counter to '0/280', showToast success, calls `loadGroupHotTakes(groupId)` and awaits it. Catch: showToast error. After try/catch: re-enables button.
