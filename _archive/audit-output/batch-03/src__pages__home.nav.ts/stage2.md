# Stage 2 — Runtime Walk: home.nav.ts

## Agent 01

### navigateTo (line 19)

Exported. Accepts `screenId: string`. Returns void.

**Validation:** `if (!VALID_SCREENS.includes(screenId)) screenId = 'home'`. VALID_SCREENS = `['home', 'arena', 'profile', 'shop', 'leaderboard', 'arsenal', 'invite']` (7 items). Invalid input silently falls back to `'home'`.

**Arena cleanup:** `if (state.currentScreen === 'arena' && screenId !== 'arena') { destroyArena(); }`. Both conditions required. Fires only when navigating *away* from arena (arena→home, arena→profile, etc.). Does NOT fire when arena→arena or from any non-arena screen.

**State write:** `state.currentScreen = screenId` — single write to module-level state (imported from home.state.ts). Executes after cleanup, before DOM changes.

**DOM deactivation:** `document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))` — removes `'active'` from all screen containers. `document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'))` — removes `'active'` from all nav buttons. No null guards (querySelectorAll returns empty NodeList if no matches, safe).

**DOM activation:**
- Screen: `document.getElementById('screen-' + screenId)` — null-guarded with `if (screen)`. Adds `'active'` class.
- Button: `document.querySelector('.bottom-nav-btn[data-screen="${screenId}"]')` — null-guarded with `if (btn)`. Adds `'active'` class.

**Screen-specific branches (4 active, 2 passive):**

- `home`: `renderFeed().catch(e => console.error('renderFeed error:', e))` — async fire-and-forget, error logged to console.
- `profile`: Three sub-actions:
  1. `ModeratorAsync?.renderRivals?.(document.getElementById('rivals-feed'))` — double optional chaining. `rivals-feed` element is passed directly (no guard; `renderRivals` may receive `null` if element absent). Safety relies on optional chaining short-circuit if `ModeratorAsync` or `renderRivals` is absent.
  2. `loadFollowCounts()` — no error handling at callsite.
  3. `const archiveEl = document.getElementById('profile-debate-archive'); if (archiveEl) void loadDebateArchive(archiveEl, true)` — null-guarded. Second arg is `true`. `void` discards the Promise.
- `arsenal`: `loadArsenalScreen()` — no guards, no error handling at callsite.
- `invite`: `const container = document.getElementById('invite-content'); if (container) loadInviteScreen(container)` — null-guarded.
- `shop`, `leaderboard`: No loader branch. DOM is activated but no data load occurs. Content must be pre-rendered HTML.

Returns void.

---

## Agents 02–11

(All 11 agents produced substantially identical descriptions. Consensus summary follows.)

---

## Cross-Agent Consensus Summary

All 11 agents agree on all aspects of `navigateTo` with no substantive contradictions.

**Confirmed observations across all 11 agents:**

- **VALID_SCREENS**: 7 values: `'home'`, `'arena'`, `'profile'`, `'shop'`, `'leaderboard'`, `'arsenal'`, `'invite'`. Invalid input reassigned to `'home'`.
- **Arena cleanup condition**: requires `state.currentScreen === 'arena'` AND `screenId !== 'arena'` simultaneously. Does not fire on same-screen navigation or when previous screen was not arena.
- **State write**: `state.currentScreen = screenId` is the sole state mutation. Executes between cleanup and DOM changes.
- **DOM pattern**: querySelectorAll batch-remove `'active'` from all `.screen` and `.bottom-nav-btn` elements, then targeted getElementById/querySelector with null guards to add `'active'` to target.
- **Screen element ID pattern**: `'screen-' + screenId` (hyphen, not underscore).
- **Button selector**: `.bottom-nav-btn[data-screen="${screenId}"]` attribute selector.
- **rivals-feed**: passed directly to `renderRivals()` without a null guard before the call — the element may be null. Optional chaining (`?.`) on the function protects against absent module/method, but not against a null element argument.
- **archiveEl**: explicitly null-guarded before `loadDebateArchive(archiveEl, true)`. `void` discards return value.
- **shop/leaderboard**: no loader branch — DOM-only navigation, no data fetch triggered.
- **renderFeed**: uses `.catch(e => console.error('renderFeed error:', e))`.
- **Return type**: void.
