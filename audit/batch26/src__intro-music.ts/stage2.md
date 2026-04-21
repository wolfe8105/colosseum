# Stage 2 Outputs — intro-music.ts

## Agent 01

### _refreshSelected
Takes `sheet: HTMLElement` and `id: string`. Calls `sheet.querySelectorAll('.im-track-btn')` and for each button, toggles the `selected` CSS class based on whether `(b as HTMLElement).dataset.id === id`. Then queries `#im-upload-btn` within the sheet and toggles `selected` on it based on whether `id === 'custom'`. Returns void. No external state read or written.

### _close
Takes `backdrop: HTMLElement`. Sets `backdrop.style.transition = 'opacity 0.2s'` first, then sets `backdrop.style.opacity = '0'`. Schedules a 220ms setTimeout that calls `backdrop.remove()`. Returns void. No external state.

### openIntroMusicPicker
Synchronous outer function that sets up the intro music picker UI. Calls `injectIntroMusicCSS()`. Reads current profile via `getCurrentProfile()`. Reads `intro_music_id` (default `'gladiator'`), `custom_intro_url` (default `null`), `profile_depth_pct` (default `0`). Computes `tier2Unlocked = depthPct >= 35`. Removes any existing `#im-backdrop`. Creates a backdrop div (`id="im-backdrop"`) and a sheet div. Builds `tier2Html` based on `tier2Unlocked` — either an upload button or a locked message with `Math.round(depthPct)`. Sets `sheet.innerHTML` to the track grid template: `INTRO_TRACKS.map(...)` renders track buttons with `escapeHTML(t.label)` and `escapeHTML(t.description)`, but `t.icon` and `t.id` are interpolated raw (no escapeHTML). Track button data-id and preview button data-preview both use raw `t.id`. Appends sheet to backdrop, appends backdrop to `document.body`.

Declares `let selectedId = currentId`, `let pendingFile = null`, `const pendingUrl = currentUrl`.

Wires track buttons: click handler checks if target is inside `.im-preview-btn` (via `.closest`); if not, sets `selectedId = btn.dataset.id!` and `pendingFile = null`, calls `_refreshSelected`. Preview buttons: stopPropagation, call `playIntroMusic(btn.dataset.preview!)`.

Wires upload button and file input (if tier2): `uploadBtn` click triggers `fileInput.click()`. `fileInput` change: checks file existence and size (>5MB shows error toast and returns); sets `pendingFile = file`, `selectedId = 'custom'`, updates upload button text via `escapeHTML(file.name.slice(0, 28))`, calls `_refreshSelected`, calls `playIntroMusic('custom', URL.createObjectURL(file))`.

Save button: on click, disables button and sets text to SAVING…. In try block, awaits `saveIntroMusic(selectedId, pendingFile, pendingUrl)`. On success, shows success toast, calls `_close(backdrop)`. On error (catch), shows error toast, re-enables button, restores SAVE text.

Backdrop click: if `e.target === backdrop`, calls `_close(backdrop)`.

## Agent 02

### _refreshSelected
Takes sheet and id. Iterates all `.im-track-btn` elements within sheet, toggles `selected` class based on dataset.id match. Finds `#im-upload-btn` in sheet, toggles `selected` if `id === 'custom'`. Pure DOM operation, no return.

### _close
Takes backdrop. Sets `transition` property, then sets `opacity = '0'`. Starts 220ms timer to remove backdrop. Synchronous minus the timer.

### openIntroMusicPicker
Sets up the UI. Calls `injectIntroMusicCSS()`. Reads profile state. Removes old backdrop. Creates new backdrop and sheet. Sets sheet.innerHTML with track grid. `t.label` and `t.description` go through escapeHTML; `t.icon` (emoji) and `t.id` do not. Track buttons wired via forEach on `.im-track-btn[data-id]` — click handler skips if target is `.im-preview-btn`; sets `selectedId`, clears `pendingFile`, calls `_refreshSelected`. Preview buttons wired with stopPropagation, call `playIntroMusic`. File upload wired: validates size, sets pendingFile, updates UI, plays preview. Save wired: try/await/finally-style pattern using try/catch; on success calls _close; on failure restores button. Backdrop click calls _close.

Note: `pendingUrl` is declared `const pendingUrl = currentUrl` and never reassigned. On track button click, `pendingFile = null` is cleared but `pendingUrl` is NOT cleared. If user selected a custom track (with a pendingUrl), then switches to a standard track, `pendingUrl` retains the old URL. However, `saveIntroMusic` receives this `pendingUrl` and whether it uses it depends on the `selectedId` being 'custom' or not (unverifiable from this file).

## Agent 03

### _refreshSelected
Scopes queries to `sheet` parameter. Toggles `selected` class on all `.im-track-btn` buttons and on `#im-upload-btn`. Pure DOM, no external state.

### _close
Sets transition before opacity, so the CSS transition animates correctly. Removes backdrop after 220ms delay. (Note: this is the CORRECT order — transition is set FIRST, then opacity. This is the fixed version of the L-N1 finding from Batch 15R which noted the order was wrong. The current source has them in the correct order: transition first at line 21, opacity second at line 22.)

### openIntroMusicPicker
Main entry point. Injects CSS. Gets profile. Calculates tier unlock. Removes stale backdrop. Builds UI structure. Populates track grid from INTRO_TRACKS. Wires all interactions: track selection, preview, file upload, save, backdrop dismiss. The save handler is wrapped in try/catch with button state management — disables on click, re-enables on catch, closes on success.

Key observations:
- `t.icon` and `t.id` in the track grid template are not passed through escapeHTML (lines 65, 64, 70). INTRO_TRACKS is a static constant, so currently no XSS risk. (Previously flagged as L-N2 in Batch 15R.)
- `pendingUrl` is `const` and cannot be reassigned (line 82). Standard track selection clears `pendingFile` but not `pendingUrl`. (Previously flagged as L-N3 in Batch 15R.)
- Save button is re-enabled in catch block only; no finally. If `saveIntroMusic` succeeds, `_close` removes the sheet. This is correct — no stuck button risk on success because the entire UI is removed.

## Agent 04

### _refreshSelected
Takes sheet element and selected id string. Queries all `.im-track-btn` within sheet; toggles `selected` class. Queries `#im-upload-btn` within sheet; toggles `selected` based on id === 'custom'. Void return.

### _close
Takes backdrop. Applies transition property first (line 21), then sets opacity to 0 (line 22). Schedules backdrop removal after 220ms. The order — transition before opacity — means the browser will animate the opacity change.

### openIntroMusicPicker
Calls `injectIntroMusicCSS()`. Reads profile fields. Removes existing `#im-backdrop`. Creates and configures backdrop + sheet. Sets sheet.innerHTML with INTRO_TRACKS mapped to buttons. `t.label`/`t.description` escaped; `t.icon`/`t.id` not escaped (static constant). Appends to DOM. Initializes `selectedId`, `pendingFile`, `pendingUrl` (const). Wires: track button click (with preview-btn guard), preview button click (stopPropagation + playIntroMusic), upload button (file input trigger), file input change (validate size, set pendingFile/selectedId, update button text with escaped filename, play preview), save button (async try/catch, disables then re-enables or closes), backdrop click (close on self-target). Returns void.

## Agent 05

### _refreshSelected
Queries within `sheet` scope. Toggles `selected` class on all track buttons and upload button. Pure.

### _close
Sets `style.transition` then `style.opacity = '0'`, then removes after 220ms. The transition-before-opacity order is correct for CSS animation.

### openIntroMusicPicker
Calls CSS injector. Reads profile for currentId, currentUrl, depthPct. Computes tier2Unlocked. Removes old backdrop. Creates backdrop + sheet. Template literal sets sheet.innerHTML — `t.label` and `t.description` escaped, `t.icon` and `t.id` unescaped (hardcoded constant, low risk; same as L-N2 finding Batch 15R). Appends to body. Captures `selectedId`, `pendingFile`, `pendingUrl` (const — cannot be changed by handlers). Wires track buttons with closest() guard for preview sub-button. Wires preview buttons with stopPropagation. Wires upload/file-input pair with size validation. Wires save button with async try/catch — on success, closes; on failure, re-enables button. Wires backdrop self-click to close.
