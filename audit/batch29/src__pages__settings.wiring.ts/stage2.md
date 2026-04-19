# Stage 2 Outputs — settings.wiring.ts

## Agent 01

### wireSettings

Synchronous function. Reads module state `isPlaceholder`. Attaches click/change/input listeners to DOM elements via `?.addEventListener`. Listeners execute independently of the function itself.

Listeners attached: `save-btn` click → `saveSettings()`; `settings-back-btn` click → `window.location.href = 'index.html'`; `set-dark-mode` change → toggles `data-theme` on documentElement, sets localStorage `theme`, updates `meta-theme-color` content (#000000 dark / #eaeef2 light); `set-bio` input → updates `set-bio-count` textContent; `logout-btn` click (async) → awaits `logOut()`, removes localStorage `colosseum_settings`, navigates to plinko; `reset-pw-btn` click (async) → early return if button disabled, calls `getCurrentUser()`, early return if no email (alert), disables button, awaits `resetPassword(email)`, success: updates text, setTimeout 3s to restore; failure: restores button, shows alert; `delete-btn` click → clears `delete-confirm-input` value, disables `delete-confirm`, adds `open` class to `delete-modal`; `delete-confirm-input` input → enables `delete-confirm` only when value is exactly 'DELETE'; `delete-cancel` click → removes `open` from `delete-modal`; `delete-modal` click → backdrop close if target === currentTarget; `delete-confirm` click (async) → if not isPlaceholder: awaits `deleteAccount()`, error: showToast and return; clears all localStorage, navigates to plinko.

### wireIntroMusicRow

Async function. Gets DOM elements `intro-music-row` and `intro-music-desc`. Early return if `intro-music-row` missing. Calls `getCurrentProfile()` (sync) to get `intro_music_id` (defaults to 'gladiator'). Awaits dynamic import of `arena-sounds.ts` to get `INTRO_TRACKS`. Finds matching track. If `introDesc` and `currentTrack` exist: sets textContent to `${icon} ${label}`. Else if `introDesc` and `currentId === 'custom'`: sets to '🎵 Custom'. Attaches click listener to `intro-music-row` that async-imports `intro-music.ts` and calls `openIntroMusicPicker()`.

## Agent 02

### wireSettings

Synchronous function attaching listeners to settings elements. Reads DOM, module state `isPlaceholder`. No try/catch. Errors handled inline via conditionals/alerts/toasts.

Key listener behaviors:
- Dark mode: sets `data-theme` on `document.documentElement`, localStorage `theme`, updates `meta-theme-color` content
- Bio counter: reads textarea value length, writes `set-bio-count` textContent
- Logout (async): awaits `logOut()`, removes `colosseum_settings` from localStorage, navigates to plinko
- Reset password (async): early return if disabled; gets email via `getCurrentUser()`; early return if no email (alert); disables button; awaits `resetPassword(email)`; success: text update + 3s setTimeout to restore; error: immediate restore + alert
- Delete modal: open clears input value and disables confirm button; input listener enables confirm button only when value === 'DELETE'; cancel and backdrop click remove `open` class
- Delete confirm (async): if not `isPlaceholder`, awaits `deleteAccount()`, shows error toast and returns early on error; clears all localStorage; navigates to plinko

### wireIntroMusicRow

Async function. Early return if `#intro-music-row` missing. Calls `getCurrentProfile()` synchronously to get `intro_music_id` (defaults to 'gladiator'). Awaits dynamic import of `arena-sounds.ts` for `INTRO_TRACKS`. Finds matching track. Conditionally sets `#intro-music-desc` textContent. Click listener async-imports `intro-music.ts` and calls `openIntroMusicPicker()`.

## Agent 03

### wireSettings

Synchronous void function. Attaches click/change/input listeners to settings page elements. No try/catch overall. Delete confirm listener does not have try/catch — if `deleteAccount()` throws, it becomes an unhandled promise rejection.

Listener behaviors:
- save-btn click: `saveSettings()`
- back-btn click: navigate to index.html
- dark mode change: sets document.documentElement data-theme, localStorage theme, meta-theme-color hex content
- bio input: updates set-bio-count with length/160
- logout (async): awaits logOut(), removes localStorage key, navigates to plinko
- reset-pw (async): if button disabled, return; get email; if no email, alert; disable button; await resetPassword(email); success: set text, setTimeout 3s restore; failure: restore button immediately, alert
- delete-btn: clear input, disable confirm, add open class to delete-modal
- delete-confirm-input input: enable confirm only when value.trim() === 'DELETE'
- delete-cancel: remove open class
- delete-modal click: backdrop close if target === currentTarget
- delete-confirm (async): if not isPlaceholder, await deleteAccount(); if result?.error, showToast and return; clear localStorage, navigate to plinko

### wireIntroMusicRow

Async function. Gets intro-music-row and intro-music-desc. Early return if intro-music-row not found. Calls getCurrentProfile() synchronously. Awaits dynamic import of arena-sounds.ts for INTRO_TRACKS. Finds matching track. Sets introDesc textContent if track found or if custom. Adds async click listener that imports intro-music.ts and calls openIntroMusicPicker().

## Agent 04

### wireSettings

Synchronous function. Attaches eleven event listeners to settings page elements. Reads module state `isPlaceholder`. Calls auth functions inside listeners. No try/catch.

Critical paths:
- Reset password: early return if disabled; alerts on no email; awaits resetPassword(email); button stuck in disabled/text state for 3s on success (setTimeout), re-enabled immediately on error
- Delete confirm: skips deleteAccount() if isPlaceholder; on error shows toast and returns; always clears localStorage and navigates on success
- Dark mode: hardcoded hex colors (#000000, #eaeef2) for meta theme-color

### wireIntroMusicRow

Async function. Gets DOM elements. Early return if introRow missing. Calls getCurrentProfile() synchronously. Awaits dynamic import of arena-sounds.ts. Finds track by id. Sets introDesc textContent. Click listener async-imports intro-music.ts and calls openIntroMusicPicker(). No error handling.

## Agent 05

### wireSettings

Synchronous function. Attaches 11 event listeners. Reads module state `isPlaceholder`. No try/catch in the function or event handlers.

Key behaviors:
- Logout (async listener): awaits logOut(), clears colosseum_settings, navigates
- Reset password (async listener): early return if disabled; getCurrentUser() for email; alert if no email; awaits resetPassword; success path disables button for 3s via setTimeout; failure path re-enables immediately + alert
- Delete confirm (async listener): if not isPlaceholder, awaits deleteAccount(); error path shows toast and returns early; success path clears all localStorage and navigates

### wireIntroMusicRow

Async function. Early return if intro-music-row missing. getCurrentProfile() for intro_music_id (default 'gladiator'). Awaits dynamic import of arena-sounds.ts for INTRO_TRACKS. Finds track by id. Sets introDesc textContent if track found or custom. Adds click listener that async-imports intro-music.ts and calls openIntroMusicPicker(). No try/catch.
