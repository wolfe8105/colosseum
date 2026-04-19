# Stage 2 — Runtime Walk — share.ui.ts

Anchor: `showPostDebatePrompt` (line 23)

## Agent 01
**showPostDebatePrompt(result: ShareResultParams): void**
1. Feature flag guard: returns immediately if `!FEATURES.shareLinks` (line 24).
2. DOM deduplication: `document.getElementById('post-debate-share')` → `.remove()` if found (lines 25–26).
3. Module state write: `_pendingShareResult = result || {}` (line 28).
4. `won` read: `(result as Record<string, unknown> | undefined)?.['won']` (line 30).
5. Creates `div#post-debate-share` modal element, sets inline `style.cssText` (lines 32–37).
6. Sets `modal.innerHTML` to a hardcoded template string — no user-supplied data interpolated, only the ternary `won ? … : …` expressions on fixed string literals and emoji (lines 39–67).
7. Attaches backdrop listener: `modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); })` (lines 69–71).
8. `document.body.appendChild(modal)` (line 73).
9. Share button listener (via `getElementById`): calls `shareResult(_pendingShareResult)` if truthy, then `modal.remove()` (lines 75–78).
10. Invite button listener: calls `inviteFriend()`, then `modal.remove()` (lines 80–83).
11. Skip button listener: `modal.remove()` (lines 85–87).
12. Synchronous end — no `await`, no `setTimeout`, no promises.

## Agent 02
**showPostDebatePrompt(result: ShareResultParams): void**
1. Early return: `if (!FEATURES.shareLinks) return` (line 24).
2. Remove stale modal: `existing?.remove()` (line 26).
3. `_pendingShareResult = result || {}` stores state (line 28).
4. `won` extracted via bracket-access through `Record<string, unknown>` cast (line 30).
5. `modal` div created, `id='post-debate-share'`, fixed-position overlay via `style.cssText` (lines 32–37).
6. `modal.innerHTML` set to entirely hardcoded template; ternaries resolve to string literals and CSS variable references — zero user data in innerHTML (lines 39–67).
7. Backdrop click-outside handler attaches to `modal` itself (lines 69–71).
8. `document.body.appendChild(modal)` (line 73).
9. `#post-debate-share-btn` click: conditional `shareResult`, unconditional `modal.remove()` (lines 75–78).
10. `#post-debate-invite-btn` click: `inviteFriend()`, `modal.remove()` (lines 80–83).
11. `#post-debate-skip-btn` click: `modal.remove()` (lines 85–87).
12. Function returns; no async paths.

## Agent 03
**showPostDebatePrompt(result: ShareResultParams): void**
1. `FEATURES.shareLinks` gate (line 24).
2. Deduplicate: existing `#post-debate-share` removed (lines 25–26).
3. `_pendingShareResult = result || {}` (line 28).
4. `won` = `result?.['won']` via type cast (line 30).
5. `div#post-debate-share` built with inline CSS overlay styles (lines 32–37).
6. innerHTML assigned from static template literal; `won` ternaries produce only hardcoded strings — no user content inserted into DOM via innerHTML (lines 39–67).
7. Backdrop listener: `e.target === modal` check before `modal.remove()` (lines 69–71).
8. `document.body.appendChild(modal)` (line 73).
9. Three button listeners wired by `getElementById` (lines 75–87): share calls `shareResult(_pendingShareResult)`, invite calls `inviteFriend()`, skip is no-op beyond `modal.remove()`.
10. No async, no timers.

## Agent 04
**showPostDebatePrompt(result: ShareResultParams): void**
1. Feature flag guard (line 24).
2. Idempotency: remove existing modal by id (lines 25–26).
3. `_pendingShareResult = result || {}` (line 28).
4. `won` extracted via safe Record cast and bracket notation (line 30).
5. Modal div created with fixed-position full-screen overlay (lines 32–37).
6. `modal.innerHTML` = static template; only ternaries on known constant strings — no user-controlled HTML (lines 39–67).
7. Backdrop click listener (lines 69–71).
8. `appendChild` (line 73).
9. Share button (lines 75–78): reads `_pendingShareResult`, calls `shareResult()`, removes modal.
10. Invite button (lines 80–83): calls `inviteFriend()`, removes modal.
11. Skip button (lines 85–87): removes modal.
12. Synchronous function.

## Agent 05
**showPostDebatePrompt(result: ShareResultParams): void**
1. Returns if share links feature is disabled (line 24).
2. Removes pre-existing modal if present (lines 25–26).
3. Writes `result || {}` to `_pendingShareResult` (line 28).
4. `won` read via loose record cast (line 30).
5. Creates modal div with inline overlay CSS (lines 32–37).
6. Assigns static innerHTML — ternary conditions resolve to emoji / string literals, CSS variable names, no user data (lines 39–67).
7. Backdrop click-outside handler (lines 69–71).
8. Appends modal to body (line 73).
9. Share button click: guard on `_pendingShareResult`, `shareResult()`, `modal.remove()` (lines 75–78).
10. Invite button click: `inviteFriend()`, `modal.remove()` (lines 80–83).
11. Skip button click: `modal.remove()` (lines 85–87).
12. Pure sync — no promises, no timers.

## Consensus
All five agents agree unanimously on the runtime walk. `showPostDebatePrompt` is a synchronous DOM builder. No user-supplied data enters `innerHTML`. Module-level `_pendingShareResult` is the only shared state. Three button listeners close the modal and delegate to `share.ts` functions.
