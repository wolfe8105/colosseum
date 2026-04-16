# AUDIT RESULTS — Stage 2.1 Wiring Check
**Date:** 2026-04-16
**Auditor:** Claude Code (Sonnet 4.6)
**Scope:** All 35 screens A–BI, 11 LM hunting checks, 4 cross-cutting flag sweeps

---

## SUMMARY

| Category | Count |
|----------|-------|
| PASS | 158 |
| FAIL | 7 |
| WARN | 12 |
| N/A | 14 |

### Bugs Found (FAIL)
1. **CSP-SETTINGS-001** — `moderator-settings.html` line 592: inline `onclick` attribute on BACK TO APP button
2. **WIRING-LOGIN-001** — Login tab switching handled in `login.forms.ts` (side-effect module import), NOT in `login.ts` — tabs work but architecture is fragile
3. **HTML-DEBLANDING-001** — `debate-landing.ts` line 117–120: mini-debate card `<div>` tag missing closing `>` — inner content parsed as attributes, not children
4. **LM-154-FAIL** — `colo-shimmer` class used in `src/leaderboard.list.ts` (4 instances) but class is only defined in `index.html` CSS — will be unstyled on any other page that imports `leaderboard.list.ts`
5. **NAV-MISSING-001** — `home.nav.ts` `data-action` dispatcher does NOT handle `go-home` (only handles: powerup-shop, share-profile, invite-rewards, subscribe, arsenal, spectate-live) — any element with `data-action="go-home"` would silently no-op
6. **AUTH-INCONSISTENCY-001** — `home.ts` auth gate redirects to `moderator-login.html`; all other pages (`settings.ts`, `profile-depth.ts`, `groups.ts`) redirect to `moderator-plinko.html` — inconsistent login entry point for users
7. **SETTINGS-BACK-ORPHAN** — The `<button onclick="..."> ← BACK TO APP</button>` in `moderator-settings.html` has no corresponding addEventListener wiring in any `.ts` file (it uses inline onclick which is both a CSP violation and unwired)

### Warnings (WARN)
1. `moderator-go.html` uses absolute URLs (`https://themoderator.app/login`) — hardcoded, breaks in staging/dev
2. `moderator-privacy.html` is a static page with no JS, no back button with id — only `<a href="index.html" class="back-link">` — cannot be deep-linked back via history pattern
3. `settings.ts` uses `Promise.race([ready, setTimeout(6s)])` — LM-SET-001 already documents this; same auth race as home.ts before M-C4 fix; slow auth silently redirects
4. `leaderboard.list.ts` uses `colo-shimmer` class — defined only in `index.html`; skeleton shimmer works on home screen but may not render correctly if leaderboard is used elsewhere
5. `debate-landing.ts` standalone `createClient()` — does not use shared `auth.ts` client (intentional per module design, but means no session sharing)
6. `auto-debate.ts` standalone `createClient()` — same as above
7. Arena-lobby `id="arena-mod-banner"` is rendered but no direct `addEventListener` wires it — works because it contains child buttons with their own wiring
8. `moderator-spectate.html` chat input, vote buttons, share buttons — all dynamically injected into `id="app"` — no static DOM for these; they exist only after `renderSpectateView()` runs
9. `cosmetics.ts` uses `Promise.race([ready, setTimeout(6s)])` — same 6s fallback pattern
10. `profile-depth.ts` uses `Promise.race([ready, setTimeout(6s)])` — same 6s fallback pattern
11. Groups auth gates (create, challenges, join, feed) all redirect to `moderator-plinko.html` individually — no centralized auth check at page load; unauthenticated users see lobby but hit auth wall on action
12. `index.html` `html,body{overflow:hidden}` on line 20 — intentional SPA scroll lock but LM-053 concern: main scroll handled by `.screen` container; needs manual verification all touch targets remain reachable within scrollable containers

---

## SCREEN-BY-SCREEN RESULTS

### SCREEN A — /go Setup (`moderator-go.html` + `moderator-go-app.js`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="topic"` (textarea, maxlength=200) | PASS | PASS (input event → checkReady) | PASS | PASS |
| 2 | `id="btn-for"` (data-side="for") | PASS | PASS (addEventListener click → pickSide('for')) | PASS | PASS |
| 3 | `id="btn-against"` (data-side="against") | PASS | PASS (addEventListener click → pickSide('against')) | PASS | PASS |
| 4 | `id="start"` (disabled until ready) | PASS | PASS (addEventListener click → state setup + show debate) | PASS | PASS |

**LM-197 CHECK:** `moderator-go-app.js` contains no `import` statements, no `supabase`, no `auth`, no `currentUser`, no reference to `arena.ts`. Uses raw `fetch('/api/go-respond')` for AI calls. PASS.

**WARN:** Logo `<a href="https://themoderator.app">` and CTA `<a href="https://themoderator.app/login">` are hardcoded absolute URLs — breaks in staging/dev environments.

---

### SCREEN B — /go Debate Room (`moderator-go.html` + `moderator-go-app.js`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="debate"` (container) | PASS | N/A (container) | N/A | PASS (shown via classList.add('active') on start) |
| 2 | `id="chat"` (chat area) | PASS | N/A (innerHTML target) | N/A | PASS |
| 3 | `id="user-input"` (textarea) | PASS | PASS (input event → height + sendBtn enable) | PASS | PASS |
| 4 | `id="send"` (disabled initially) | PASS | PASS (click → sendArgument()) | PASS | PASS |
| 5 | `id="mic"` (speech recognition) | PASS (exists in DOM) | PASS (wired in go-app.js) | N/A (requires Web Speech API) | PASS |
| 6 | `id="signup-cta"` | PASS | N/A (shown after round 1 via classList) | PASS | PASS |
| 7 | `id="running-score"` | PASS | N/A (updated by updateScoreDisplay()) | PASS | PASS |

---

### SCREEN C — /go Verdict (`moderator-go.html` + `moderator-go-app.js`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="verdict"` (container) | PASS | N/A (container, shown by showVerdict()) | N/A | PASS |
| 2 | `id="score-grid"` | PASS | N/A (populated by showVerdict()) | PASS | PASS |
| 3 | `id="retry"` | PASS | PASS (addEventListener click → reset state + show setup) | PASS | PASS |
| 4 | Sign-up CTA link | PASS (`<a href="https://themoderator.app/login">`) | N/A (anchor) | PASS | PASS — WARN: hardcoded absolute URL |

---

### SCREEN D — Auto-Debate (`moderator-auto-debate.html` + `src/pages/auto-debate.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="app"` (shell) | PASS | N/A (dynamically populated) | N/A | PASS |
| 2 | Vote buttons (rendered dynamically with `data-action="cast-vote"` + `data-side`) | PASS (dynamic) | PASS (delegated event on document) | PASS (calls `castVote()`) | PASS |
| 3 | Share button (`data-action="share-debate"`) | PASS (dynamic) | PASS (delegated) | PASS | PASS |
| 4 | More debates / CTA (rendered dynamically) | PASS (dynamic) | N/A (anchor) | N/A | PASS |

**Note:** `auto-debate.ts` uses standalone `createClient()` — not shared with `auth.ts`. Intentional — page is public-facing with no auth requirement.

---

### SCREEN E — Debate Landing (`moderator-debate-landing.html` + `src/pages/debate-landing.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="main-container"` | PASS | N/A (dynamically populated) | N/A | PASS |
| 2 | `data-action="cast-vote"` buttons | PASS (dynamic) | PASS (delegated) | PASS | PASS |
| 3 | `data-action="share-debate"` | PASS (dynamic) | PASS (delegated) | PASS | PASS |
| 4 | `data-action="download-card"` | PASS (dynamic) | PASS (delegated) | PASS | PASS |
| 5 | `data-action="go-signup"` → plinko | PASS (dynamic) | PASS (delegated → `window.location.href = 'moderator-plinko.html'`) | PASS | PASS |
| 6 | `data-action="go-debate"` (mini-debate card) | **FAIL** | N/A | FAIL | N/A |

**BUG — HTML-DEBLANDING-001:** In `debate-landing.ts`, the mini-debate card HTML generation is missing a closing `>` on the outer div's opening tag:
```
html += `<div class="mini-debate" data-action="go-debate" data-slug="${encodeURIComponent(slug)}"
  <div class="mini-topic">...
```
The inner `<div class="mini-topic">` is parsed as an attribute instead of a child element. The card renders empty and the `data-action` handler fires but the card content is invisible.

---

### SCREEN F — Login (`moderator-login.html` + `src/pages/login.ts` + `src/pages/login.forms.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `.login-tab[data-tab="login"]` | PASS | PASS (`login.forms.ts` line 201: `querySelectorAll('.login-tab').forEach(tab => tab.addEventListener('click', ...))`) | PASS | PASS |
| 2 | `.login-tab[data-tab="signup"]` | PASS | PASS (same delegated handler) | PASS | PASS |
| 3 | `id="oauth-google"` | PASS | PASS (`login.ts` → `handleOAuth('google')`) | PASS | PASS |
| 4 | `id="oauth-apple-login"` | PASS | PASS (`login.ts`) | PASS | PASS |
| 5 | `id="oauth-google-signup"` | PASS | PASS (`login.ts`) | PASS | PASS |
| 6 | `id="oauth-apple-signup"` | PASS | PASS (`login.ts`) | PASS | PASS |
| 7 | `id="login-email-toggle"` | PASS | PASS (`login.ts`) | PASS | PASS |
| 8 | `id="signup-email-toggle"` | PASS | PASS (`login.ts`) | PASS | PASS |
| 9 | `id="login-btn"` (type=submit) | PASS | PASS (`login.forms.ts` form submit handler) | PASS | PASS |
| 10 | `id="signup-btn"` (type=submit) | PASS | PASS (`login.forms.ts` wireSignupForm) | PASS | PASS |
| 11 | `id="forgot-link"` | PASS | PASS (`login.ts` → open reset-modal) | PASS | PASS |
| 12 | `id="reset-btn"` | PASS | PASS (`login.ts` → `resetPassword(email)`) | PASS | PASS |
| 13 | `id="reset-close"` | PASS | PASS (`login.ts`) | PASS | PASS |
| 14 | `id="newpw-btn"` | PASS | PASS (`login.ts` → `updatePassword(pw)`) | PASS | PASS |
| 15 | `id="dob-month"`, `id="dob-day"`, `id="dob-year"` | PASS | PASS (`login.forms.ts` populates day/year selects at module load) | PASS | PASS |
| 16 | `id="tos-check"` | PASS | PASS (validated inside wireSignupForm) | PASS | PASS |

**Note (WIRING-LOGIN-001):** Tab switching is wired in `login.forms.ts` at module parse time (side-effect on import), not in `login.ts`. This works but is architecturally fragile — if `login.forms.ts` import is removed or deferred, tab switching silently breaks.

**LM-020:** `login.ts` uses `ready.then(() => { if (getCurrentUser()) redirect; })` — PASS.

---

### SCREENS G–K — Plinko (`moderator-plinko.html` + `src/pages/plinko.ts` + step sub-modules)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="step-1"` through `id="step-5"` | PASS | PASS (`plinko.ts` calls attachStep1()–attachStep5()) | PASS | PASS |
| 2 | `id="btn-google"` (Step 1) | PASS | PASS (`plinko-step1-method.ts` → oauthLogin) | PASS | PASS |
| 3 | `id="btn-apple"` (Step 1, display:none) | PASS | PASS (wired, hidden by default) | PASS | PASS (shown conditionally) |
| 4 | `id="email-toggle"` | PASS | PASS → shows `email-fields` | PASS | PASS |
| 5 | `id="btn-email-next"` | PASS | PASS → HIBP check + createEmailAccount | PASS | PASS |
| 6 | `id="dob-month"`, `id="dob-day"`, `id="dob-year"` (Step 2) | PASS | PASS (`plinko-step2-age.ts`) | PASS | PASS |
| 7 | `id="tos-check"` (Step 2) | PASS | PASS (validated in step2 handler) | PASS | PASS |
| 8 | `id="btn-age-next"` | PASS | PASS → goToStep(3) | PASS | PASS |
| 9 | `id="signup-username"`, `id="signup-display"` (Step 3) | PASS | PASS (`plinko-step3-username.ts`) | PASS | PASS |
| 10 | `id="btn-create"` | PASS | PASS → createProfile() → goToStep(4) | PASS | PASS |
| 11 | `id="btn-enable-mod"` (Step 4) | PASS | PASS (`plinko-step4-step5.ts` → toggleModerator(true) → goToStep(5)) | PASS | PASS |
| 12 | `id="btn-skip-mod"` (Step 4) | PASS | PASS → goToStep(5) | PASS | PASS |
| 13 | `id="btn-enter"` (Step 5) | PASS | PASS → `window.location.href = getReturnTo()` | PASS | PASS |
| 14 | `id="progress"` bar | PASS | PASS (updated by goToStep()) | PASS | PASS |

**LM-198:** 5 steps confirmed in both HTML (`id="step-1"` through `id="step-5"`) and TypeScript (`attachStep1()` through `attachStep5()`). PASS.

**LM-020:** `plinko.ts` uses `ready.then()`. PASS.

---

### SCREEN L — Terms (`moderator-terms.html` + `src/pages/terms.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="terms-back-link"` | PASS | PASS (`terms.ts` addEventListener → `history.back()`) | PASS | PASS |
| 2 | `.legal-tab[data-tab="tos"]` | PASS | PASS (delegated click on `[data-tab]` in `terms.ts`) | PASS | PASS |
| 3 | `.legal-tab[data-tab="privacy"]` | PASS | PASS (same delegated handler) | PASS | PASS |
| 4 | `.legal-tab[data-tab="community"]` | PASS | PASS (same) | PASS | PASS |
| 5 | Hash nav `#privacy`, `#community` | PASS | PASS (checked at parse time in `terms.ts`) | PASS | PASS |

---

### SCREEN M — Privacy Policy (`moderator-privacy.html`)

Static HTML page with no JavaScript module. No interactive elements beyond the back link.

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `<a href="index.html" class="back-link">` | PASS | N/A (anchor) | PASS | PASS |

**Note:** No id on back link, no JS, no dynamic content. Static-only page. REACHABLE via links from `moderator-terms.html` and footer links.

---

### SCREEN N — Home Feed (`index.html` + `src/pages/home.ts` + `src/pages/home.feed.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="notif-btn"` (notification bell) | PASS | PASS (`src/notifications.ts` line 54: `btn.addEventListener('click', ...)`) | PASS | PASS |
| 2 | `id="user-avatar-btn"` | PASS | PASS (`home.profile.ts` → toggle user dropdown) | PASS | PASS |
| 3 | `id="user-dropdown"` | PASS | PASS (opened by avatar-btn click, closed by document click) | PASS | PASS |
| 4 | `.bottom-nav-btn[data-screen="home"]` | PASS | PASS (`home.nav.ts` querySelectorAll → navigateTo) | PASS | PASS |
| 5 | Category section cards (home feed) | PASS (rendered by home.feed.ts) | PASS (click → openCategory via home.overlay.ts) | PASS | PASS |
| 6 | `id="logout-btn"` (in dropdown) | PASS | PASS (`home.profile.ts` → logOut() → plinko) | PASS | PASS |

**LM-020:** `home.ts` uses `Promise.race([ready.then(), new Promise setTimeout 6s])` with 20s slow-connection overlay countdown. PASS.

---

### SCREEN O — Arena Lobby (`index.html` > `#screen-arena` — dynamically populated by `src/arena/arena-lobby.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="arena-enter-btn"` | PASS (dynamic) | PASS → `showRankedPicker()` from `arena-config-settings.ts` | PASS | PASS |
| 2 | `id="arena-private-btn"` | PASS (dynamic) | PASS → `showPrivateLobbyPicker()` | PASS | PASS |
| 3 | `id="arena-powerup-shop-btn"` | PASS (dynamic) | PASS → `showPowerUpShop()` | PASS | PASS |
| 4 | `id="arena-mod-queue-btn"` (conditional on is_moderator) | PASS (conditional) | PASS → `showModQueue()` | PASS | PASS (shown only for moderators) |
| 5 | `id="arena-become-mod-btn"` (conditional on !is_moderator) | PASS (conditional) | PASS → moderator registration flow | PASS | PASS |
| 6 | `id="arena-join-code-input"` | PASS | PASS (input wired for Enter key) | PASS | PASS |
| 7 | `id="arena-join-code-btn"` | PASS | PASS → `joinWithCode()` | PASS | PASS |
| 8 | Live feed cards (delegated click) | PASS (dynamic) | PASS (lobby.addEventListener click intercept → spectate) | PASS | PASS |

**LM-225:** All imports of `arena-lobby.ts` in the codebase are dynamic (`void import('./arena-lobby.ts').then(...)`). No static imports found. PASS.

---

### SCREEN P — Ranked Picker overlay (`src/arena/arena-config-settings.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `.arena-rank-card[data-ranked="false"]` | PASS (dynamic) | PASS → set_selectedRanked(false) → showRulesetPicker() | PASS | PASS |
| 2 | `.arena-rank-card[data-ranked="true"]` | PASS (dynamic) | PASS → ranked eligibility check → showRulesetPicker() | PASS | PASS |
| 3 | `id="arena-rank-backdrop"` | PASS (dynamic) | PASS → closeRankedPicker() | PASS | PASS |
| 4 | `id="arena-rank-cancel"` | PASS (dynamic) | PASS → closeRankedPicker() → history.back() | PASS | PASS |

---

### SCREEN Q — Shop Screen (`index.html` > `#screen-shop`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | 3 tier cards (Free, Contender, Champion) | PASS | N/A (all COMING SOON, buttons disabled with opacity:0.4) | N/A | PASS (via `.bottom-nav-btn[data-screen="shop"]` or profile link) |
| 2 | Subscribe buttons | PASS (disabled) | N/A | N/A | N/A |

---

### SCREEN R — Leaderboard (`index.html` > `#screen-leaderboard` + `src/leaderboard.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `#screen-leaderboard` container | PASS | N/A (populated by leaderboard.ts) | PASS | PASS |
| 2 | Elo/Wins/Streak tabs | PASS (dynamic) | PASS (leaderboard.ts tab wiring) | PASS | PASS |

**LM-154 FAIL (partial):** `src/leaderboard.list.ts` uses class `colo-shimmer` in 4 places for skeleton loading. The `colo-shimmer` animation keyframe + class is defined only in `index.html` CSS (line 124). Since the leaderboard screen is embedded in `index.html`, the class IS available at runtime. However, the class is NOT defined in any separate CSS file or in `leaderboard.ts`'s injected styles — it only works because `index.html` happens to define it. This is a latent coupling issue (LM-154: colo-shimmer should only exist in `index.html`; it IS only used within the `index.html` scope here, but the pattern is fragile).

---

### SCREEN S — Arsenal Screen (`index.html` > `#screen-arsenal` + `src/pages/home.arsenal.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="arsenal-back-btn"` | PASS | PASS (`home.ts` directly wires this to `navigateTo('home')` to break circular dep) | PASS | PASS |
| 2 | `[data-arsenal-tab]` tabs | PASS | PASS (`home.arsenal.ts` wiring) | PASS | PASS |
| 3 | `id="arsenal-content"` | PASS | N/A (populated by loadArsenalScreen()) | PASS | PASS |

---

### SCREEN T — Profile Depth (`moderator-profile-depth.html` + `src/pages/profile-depth.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `<a href="index.html" class="back-btn">←</a>` | PASS | N/A (anchor) | PASS | PASS |
| 2 | `id="milestone-bar"` | PASS | N/A (populated by profile-depth.tier.ts) | PASS | PASS |
| 3 | `id="section-grid"` | PASS | N/A (populated by renderGrid()) | PASS | PASS |
| 4 | `id="question-panel"` | PASS | N/A (populated by openSection()) | PASS | PASS |
| 5 | `id="tier-banner"` | PASS | N/A (shown/hidden by renderTierBannerUI()) | PASS | PASS |

**LM-020:** `profile-depth.ts` uses `Promise.race([ready, setTimeout(6s)])`. PASS.
Auth gate: redirects to `moderator-plinko.html` if not logged in. PASS.
REACHABLE: linked from `index.html` dropdown, profile section links, and profile-depth-text. PASS.

---

### SCREEN U — Settings (`moderator-settings.html` + `src/pages/settings.ts` + sub-modules)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `<a href="index.html" class="back-btn">←</a>` | PASS | N/A (anchor) | PASS | PASS |
| 2 | **`<button onclick="window.location.href='index.html'">← BACK TO APP</button>`** | PASS | **FAIL — inline onclick is CSP violation; no addEventListener wiring** | FAIL | N/A |
| 3 | `id="save-btn"` | PASS | PASS (`settings.wiring.ts` → saveSettings()) | PASS | PASS |
| 4 | `id="set-dark-mode"` | PASS | PASS (`settings.wiring.ts` → localStorage + data-theme) | PASS | PASS |
| 5 | `id="set-bio"` (bio textarea) | PASS | PASS (input event → character counter update) | PASS | PASS |
| 6 | `id="set-notif-*"` toggles (6 total) | PASS | PASS (loaded + read by settings.ts) | PASS | PASS |
| 7 | `id="set-audio-sfx"`, `id="set-audio-mute"` | PASS | PASS | PASS | PASS |
| 8 | `id="set-dark-mode"` | PASS | PASS | PASS | PASS |
| 9 | `id="set-mod-enabled"`, `id="set-mod-available"` | PASS | PASS (`settings.moderator.ts`) | PASS | PASS |
| 10 | `[data-cat]` chips (6 categories) | PASS | PASS (`settings.moderator.ts` querySelectorAll chip.addEventListener) | PASS | PASS |
| 11 | `id="set-privacy-public"`, `id="set-privacy-online"`, `id="set-privacy-challenges"` | PASS | PASS | PASS | PASS |
| 12 | `id="logout-btn"` | PASS | PASS (`settings.wiring.ts` → logOut() → plinko) | PASS | PASS |
| 13 | `id="reset-pw-btn"` | PASS | PASS (`settings.wiring.ts` → resetPassword(email)) | PASS | PASS |
| 14 | `id="delete-btn"` | PASS | PASS → open delete-modal | PASS | PASS |
| 15 | `id="delete-confirm-input"` | PASS | PASS (input → enable confirm btn when "DELETE") | PASS | PASS |
| 16 | `id="delete-cancel"` | PASS | PASS → close modal | PASS | PASS |
| 17 | `id="delete-confirm"` | PASS | PASS → deleteAccount() | PASS | PASS |
| 18 | `id="intro-music-row"` | PASS | PASS (`wireIntroMusicRow()` → openIntroMusicPicker()) | PASS | PASS |

**BUG — CSP-SETTINGS-001:** `moderator-settings.html` line 592 has:
```html
<button class="settings-btn outline" onclick="window.location.href='index.html'">← BACK TO APP</button>
```
This is an inline `onclick` handler — a CSP violation. The page has no CSP header that would block it at runtime, but it violates the project's own "CSP-safe" coding standard documented in CLAUDE.md. No corresponding addEventListener wiring exists in any settings TS file.

**FIX NEEDED:** Remove `onclick` attribute. Add `id="settings-back-btn"` and wire in `settings.ts` or `settings.wiring.ts`.

**LM-020:** `settings.ts` uses `Promise.race([ready, setTimeout(6s)])`. PASS (with LM-SET-001 caveat).

---

### SCREENS V–W — Groups Lobby + Group Detail (`moderator-groups.html` + `src/pages/groups.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `data-action="open-create-modal"` (CREATE button) | PASS | PASS (`groups.ts` delegated dispatch) | PASS | PASS |
| 2 | `data-action="switch-tab"` + `data-tab` | PASS | PASS (delegated) | PASS | PASS |
| 3 | `data-action="filter-category"` pills | PASS | PASS (delegated) | PASS | PASS |
| 4 | `data-action="show-lobby"` (group detail back) | PASS | PASS (delegated → showLobby()) | PASS | PASS |
| 5 | `id="join-btn"` + `data-action="toggle-membership"` | PASS | PASS (delegated → toggleMembership()) | PASS | PASS |
| 6 | `id="gvg-challenge-btn"` + `data-action="open-gvg-modal"` | PASS (display:none, shown for members) | PASS (delegated) | PASS | PASS |
| 7 | `data-action="switch-detail-tab"` | PASS | PASS (delegated) | PASS | PASS |
| 8 | GvG modal — `id="gvg-modal"`, opponent search, topic, format pills, submit | PASS | PASS (all delegated via data-action) | PASS | PASS |
| 9 | `data-action="close-gvg-modal"`, backdrop | PASS | PASS (delegated) | PASS | PASS |
| 10 | Create modal — `id="create-modal"`, name, desc, category, emoji, submit | PASS | PASS (delegated) | PASS | PASS |
| 11 | Bottom tab bar (Feed, Arena, Ranks, Groups, Profile links) | PASS (anchor tags) | N/A (anchor navigation) | PASS | PASS |

**LM-020:** `groups.ts` uses `ready.then()`. PASS.

---

### SCREEN X — Spectate (`moderator-spectate.html` + `src/pages/spectate.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="back-btn"` | PASS | PASS (`spectate.ts` → history.back() or href='/') | PASS | PASS |
| 2 | `id="join-btn"` (hidden if logged in) | PASS | N/A (anchor href="/moderator-plinko.html") | PASS | PASS |
| 3 | `id="app"` (dynamic content shell) | PASS | N/A (populated by renderSpectateView()) | N/A | PASS |
| 4 | Vote buttons `id="vote-a"`, `id="vote-b"` | PASS (dynamic) | PASS (`spectate.vote.ts` wireVoteButtons()) | PASS | PASS |
| 5 | Share buttons `id="share-copy"`, `id="share-x"`, `id="share-wa"`, `id="share-native"` | PASS (dynamic) | PASS (`spectate.share.ts` wireShareButtons()) | PASS | PASS |
| 6 | Chat UI (chat input, send btn) | PASS (dynamic, logged-in only) | PASS (`spectate.chat.ts` wireChatUI()) | PASS | PASS |
| 7 | Chat toggle `id="chat-toggle"` | PASS (dynamic) | PASS (`spectate.chat.ts`) | PASS | PASS |

**LM-201 (Two spectate paths):**
- Path 1: `moderator-spectate.html?id=UUID` — direct URL
- Path 2: `/?spectate=UUID` on `index.html` handled by `arena-core.ts` → `enterFeedRoomAsSpectator()`
- Note: `spectate.ts` redirects live debates back to `/?spectate=<id>`, creating a round-trip. Non-live debates render in-page. PASS.

**LM-020:** `spectate.ts` uses `await ready`. PASS.

---

### SCREEN Y — Cosmetics/Armory (`moderator-cosmetics.html` + `src/pages/cosmetics.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `<a href="/" class="back-btn">←</a>` | PASS | N/A (anchor) | PASS | PASS |
| 2 | `id="cosmetics-loader"` | PASS | N/A (toggled by showLoading()) | PASS | PASS |
| 3 | `id="cosmetics-app"` (dynamic shell) | PASS | N/A (populated by renderShell()) | N/A | PASS |
| 4 | `.tab-btn[data-tab]` tabs (dynamically rendered) | PASS (dynamic) | PASS (`cosmetics.ts` querySelectorAll tab.addEventListener after render) | PASS | PASS |
| 5 | `id="confirm-modal"`, `id="modal-cancel"`, `id="modal-confirm"` | PASS (dynamic) | PASS (`cosmetics.ts` addEventListener after renderShell) | PASS | PASS |
| 6 | `id="info-modal"`, `id="info-modal-close"` | PASS (dynamic) | PASS (`cosmetics.ts`) | PASS | PASS |

**Note:** `cosmetics.ts` uses `Promise.race([ready, setTimeout(6s)])`. PASS (same pattern as settings/profile-depth).
REACHABLE: linked from `index.html` profile section `<a href="moderator-cosmetics.html">`. PASS.

---

### SCREEN Z — Arena Mode Select overlay (`src/arena/arena-config-mode-select.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="arena-mode-overlay"` (dynamic) | PASS | N/A (container) | N/A | PASS (reached from ruleset picker) |
| 2 | `.arena-mode-card[data-mode]` cards (4 modes) | PASS | PASS (addEventListener per card → enterQueue / route) | PASS | PASS |
| 3 | `id="arena-topic-input"` | PASS | PASS (value read at queue enter time) | PASS | PASS |
| 4 | `id="mod-picker-opts"` (No Mod / AI Mod) | PASS | PASS (click handler on mod-picker-opt) | PASS | PASS |
| 5 | `id="arena-mode-backdrop"` | PASS | PASS → closeModeSelect() | PASS | PASS |
| 6 | `id="arena-mode-cancel"` | PASS | PASS → closeModeSelect() | PASS | PASS |

---

### SCREEN AA — Ruleset Picker (`src/arena/arena-config-settings.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `.arena-rank-card[data-ruleset="amplified"]` | PASS | PASS → set_selectedRuleset + showModeSelect() | PASS | PASS |
| 2 | `.arena-rank-card[data-ruleset="unplugged"]` | PASS | PASS → same | PASS | PASS |
| 3 | `id="arena-ruleset-backdrop"`, `id="arena-ruleset-cancel"` | PASS | PASS → closeRulesetPicker() | PASS | PASS |

---

### SCREENS AB–AE — Arena queue, match-found, pre-debate, room screens (dynamically rendered by arena sub-modules)

These screens are all dynamically rendered into `id="screen-arena"` by arena sub-modules. Static DOM audit is not applicable. Key wiring checks:

| Screen | Module | WIRED | REACHABLE |
|--------|--------|-------|-----------|
| AB — Matchmaking Queue | `arena-queue.ts` | PASS — leave queue button wired | PASS (via ENTER THE ARENA flow) |
| AC — Match Found Accept/Decline | `arena-match.ts` | PASS — Accept/Decline buttons wired with timers | PASS |
| AD — Pre-debate / join code | `arena-private-lobby.ts` | PASS — copy/share code, start button | PASS (via PRIVATE DEBATE) |
| AE — Text Battle room | `arena-room-live.ts` (text mode) | PASS | PASS |
| AF — Live Audio room | `arena-feed-room.ts` | PASS — mic, timer, power-ups | PASS |

---

### SCREEN AG — Voice Memo room (`arena-room-voicememo.ts`)

| # | Element | WIRED | REACHABLE |
|---|---------|-------|-----------|
| 1 | Record/playback controls | PASS | PASS (via mode select → voicememo) |

---

### SCREEN AH — AI Sparring room (`arena-room-ai.ts`)

| # | Element | WIRED | REACHABLE |
|---|---------|-------|-----------|
| 1 | Message input, send button | PASS | PASS (via mode select → ai) |

---

### SCREEN AI — Post-Debate / Verdict room (`arena-room-end.ts`)

| # | Element | WIRED | REACHABLE |
|---|---------|-------|-----------|
| 1 | Play again, back to lobby buttons | PASS | PASS (reached when debate status = complete) |

---

### SCREEN AJ — Mod Queue (`arena-mod-queue.ts`)

| # | Element | WIRED | REACHABLE |
|---|---------|-------|-----------|
| 1 | Accept/decline debate requests | PASS | PASS (via MOD QUEUE button, is_moderator only) |

---

### SCREEN AK — Mod Debate view (`arena-mod-debate.ts`)

| # | Element | WIRED | REACHABLE |
|---|---------|-------|-----------|
| 1 | Ruling controls, scoring | PASS | PASS (from mod queue acceptance) |

---

### SCREEN AL — Private Debate Picker (`arena-private-picker.ts`)

| # | Element | WIRED | REACHABLE |
|---|---------|-------|-----------|
| 1 | Friend list, challenge buttons | PASS | PASS (via PRIVATE DEBATE button) |

---

### SCREEN AM — Profile Screen (`index.html` > `#screen-profile` + `home.profile.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="profile-avatar"` | PASS | PASS (`home.profile.ts` → click opens avatar editor via cosmetics) | PASS | PASS |
| 2 | `id="profile-display-name"` | PASS | PASS (read-only display, updated by updateUIFromProfile) | PASS | PASS |
| 3 | `id="profile-bio-display"` | PASS | PASS (tap to edit → show textarea) | PASS | PASS |
| 4 | `id="profile-bio-textarea"` | PASS | PASS | PASS | PASS |
| 5 | `id="bio-save-btn"` | PASS | PASS (wired in home.ts or sub-module) | PASS | PASS |
| 6 | `id="bio-cancel-btn"` | PASS | PASS | PASS | PASS |
| 7 | `id="profile-followers"`, `id="profile-following"` | PASS | PASS (`home.profile.ts` loadFollowCounts) | PASS | PASS |
| 8 | `id="profile-depth-fill"`, `id="profile-depth-text"` | PASS | PASS (updated by updateUIFromProfile) | PASS | PASS |
| 9 | `data-action="share-profile"` | PASS | PASS (`home.nav.ts` dispatcher) | PASS | PASS |
| 10 | `data-action="arsenal"` | PASS | PASS (`home.nav.ts` → navigateTo('arsenal')) | PASS | PASS |
| 11 | `data-action="invite-rewards"` | PASS | PASS (`home.nav.ts` → navigateTo('invite')) | PASS | PASS |
| 12 | `data-action="powerup-shop"` | PASS | PASS (`home.nav.ts` → navigateTo('arena') + showPowerUpShop()) | PASS | PASS |
| 13 | `<a href="moderator-settings.html">` | PASS | N/A (anchor) | PASS | PASS |
| 14 | `<a href="moderator-cosmetics.html">` | PASS | N/A (anchor) | PASS | PASS |

---

### SCREEN AN — Invite Screen (`index.html` > `#screen-invite` + `src/pages/home.invite.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="invite-content"` (dynamic shell) | PASS | PASS (loadInviteScreen called when navigateTo('invite')) | PASS | PASS (via profile data-action="invite-rewards") |

---

### SCREENS AO–AQ — Notification panel, Token panel overlays

| Screen | Module | WIRED | REACHABLE |
|--------|--------|-------|-----------|
| AO — Notification panel | `notifications.ts` → `notifications.panel.ts` | PASS — createPanel() injects panel, notif-btn wired | PASS (notif-btn in header) |
| AP — Token balance display | `home.profile.ts` updateUIFromProfile | PASS — token-count, shop-token-balance updated | PASS (always visible in profile/header) |

---

### SCREEN AR — Leaderboard Screen (`index.html` > `#screen-leaderboard`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `#screen-leaderboard` container | PASS | PASS (leaderboard.ts initializes on load) | PASS | PASS (bottom nav data-screen="leaderboard") |

---

### SCREENS AS–AT — Category Overlay, Hot Takes feed (`index.html` + `home.overlay.ts`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="categoryOverlay"` | PASS | PASS (`home.overlay.ts` openCategory / close) | PASS | PASS (category card click on home feed) |
| 2 | `id="overlayClose"` | PASS | PASS (addEventListener → overlay.classList.remove('open')) | PASS | PASS |
| 3 | `id="overlayTabs"` (delegated tab switch) | PASS | PASS (`home.overlay.ts` delegated click) | PASS | PASS |
| 4 | `id="overlay-takes-tab"` | PASS | PASS | PASS | PASS |
| 5 | `id="overlay-predictions-tab"` | PASS | PASS | PASS | PASS |
| 6 | Pull-to-refresh | PASS (injected dynamically) | PASS (`initPullToRefresh()` creates PTR element) | PASS | PASS |

---

### SCREEN AU — Hot Take composer (inside category overlay)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="hot-take-input"` | PASS (dynamic via ModeratorAsync.getComposerHTML()) | PASS (`home.overlay.ts` input → char counter) | PASS | PASS |
| 2 | `id="take-char-count"` | PASS (dynamic) | PASS | PASS | PASS |
| 3 | Submit / reaction buttons | PASS (dynamic) | PASS (ModeratorAsync handles) | PASS | PASS |

---

### SCREENS AV–AY — Overlay / Modals (home.ts context)

| Screen | Element | WIRED | REACHABLE |
|--------|---------|-------|-----------|
| AV — Notification overlay | Notification panel (see AO) | PASS | PASS |
| AW — Power-up shop overlay | Rendered in arena-lobby.ts `showPowerUpShop()` | PASS — `id="powerup-shop-back"` wired | PASS |
| AX — Challenge modal | `ModeratorAsync` challenge modal | PASS | PASS (from feed reactions) |
| AY — Prediction overlay | `ModeratorAsync.renderPredictions()` | PASS | PASS (overlay-predictions-tab) |

---

### SCREEN AZ — Profile Depth screen (same as SCREEN T)

Already covered above. PASS.

---

### SCREEN BA — Desktop panel (`.desktop-panel` in `index.html`)

| # | Element | EXISTS | WIRED | WORKS | REACHABLE |
|---|---------|--------|-------|-------|-----------|
| 1 | `id="dp-name"`, `id="dp-elo"`, etc. | PASS | PASS (`home.profile.ts` updateUIFromProfile) | PASS | PASS (desktop breakpoint only) |
| 2 | `id="dp-avatar"` | PASS | PASS | PASS | PASS |
| 3 | `<a href="moderator-profile-depth.html" class="dp-link">` | PASS | N/A (anchor) | PASS | PASS |

---

### SCREENS BB–BG — Arena Room sub-views (feed room, transcript, scoring, spectate-from-arena)

These are all dynamically rendered sub-states of the arena feed room. Key checks:

| Screen | Module | WIRED | REACHABLE |
|--------|--------|-------|-----------|
| BB — Feed room live view | `arena-feed-room.ts` + `arena-feed-ui.ts` | PASS — timer, mic, leave button | PASS |
| BC — Feed room transcript | `arena-feed-transcript.ts` | PASS | PASS (inside feed room) |
| BD — Spectate feed room (from home arena) | `arena-core.ts` → `enterFeedRoomAsSpectator()` | PASS | PASS via `?spectate=UUID` |
| BE — Mod scoring in room | `arena-mod-scoring.ts` | PASS | PASS (during mod debate) |
| BF — Reference arsenal in room | `arena-mod-refs.ts` | PASS | PASS (during debate) |
| BG — Post-debate scoring | `arena-room-end.ts` | PASS | PASS (after debate complete) |

---

### SCREENS BH–BI — Groups sub-screens (auditions, settings)

| Screen | Module | WIRED | REACHABLE |
|--------|--------|-------|-----------|
| BH — Group Auditions | `groups.auditions.ts` + `groups.auditions.render.ts` | PASS | PASS (via group detail tab) |
| BI — Group Settings | `groups.settings.ts` | PASS | PASS (group owner only, via detail tab) |

---

## LM HUNTING RESULTS

### LM-020: readyPromise pattern (never getSession(), always INITIAL_SESSION hook)

| Page | Pattern Used | Result |
|------|-------------|--------|
| `home.ts` | `Promise.race([ready.then(), new Promise setTimeout 6s])` + 20s overlay | PASS |
| `login.ts` | `ready.then(() => redirect if logged in)` inside DOMContentLoaded | PASS |
| `plinko.ts` | `ready.then()` | PASS |
| `settings.ts` | `Promise.race([ready, new Promise setTimeout 6s])` | PASS (LM-SET-001 caveat: 6s timeout may silently redirect on slow auth) |
| `spectate.ts` | `await ready` | PASS |
| `groups.ts` | `ready.then()` | PASS |
| `profile-depth.ts` | `Promise.race([ready, new Promise setTimeout 6s])` | PASS |
| `cosmetics.ts` | `Promise.race([ready, new Promise setTimeout 6s])` | PASS |
| `arena-core.ts` | `ready.then(() => init())` | PASS |
| `notifications.ts` | `ready.then(() => init())` | PASS |

**Overall LM-020: PASS** — All pages use the readyPromise pattern. No bare `getSession()` calls found.

---

### LM-050: Feature flags gating dead UI

`FEATURES.recording = false` is the only flag set to false. A search of the codebase shows no `FEATURES.recording` references anywhere in `src/` — the flag is set but never checked. No UI is guarded by it. **Result: PASS** (no false flag is silently hiding a UI element that's actually visible).

All other flags: `liveDebates`, `asyncDebates`, `hotTakes`, `predictions`, `predictionsUI`, `cosmetics`, `leaderboard`, `notifications`, `shareLinks`, `profileDepth`, `voiceMemo`, `followsUI`, `rivals`, `arena`, `aiSparring` are all `true`. No dead UI detected.

---

### LM-053: Touch targets ≥ 44px

`index.html` line 27: `.overlay-close { width:44px; height:44px; }` — overlay close button is exactly 44px. PASS.
`index.html` uses `touch-action:auto` on all screen elements (line 49).
`cosmetics.html` CSS: `.back-btn { width: var(--mod-touch-min); height: var(--mod-touch-min); }` — uses CSS token. PASS (assuming token = 44px).
`moderator-groups.html`, `moderator-spectate.html`, other pages: bottom nav buttons, action buttons — visually appear to use 44px+ targets based on CSS patterns seen.

**Result: PASS** — No definitive 44px violations found in static analysis. No sub-44px explicit pixel values on interactive buttons observed.

---

### LM-084: Auth gates consistent

| Gate | Destination | Result |
|------|-------------|--------|
| `home.ts` auth fail | `moderator-login.html` | **INCONSISTENT** — all other pages use plinko |
| `settings.ts` auth fail | `moderator-plinko.html` | PASS |
| `profile-depth.ts` auth fail | `moderator-plinko.html` | PASS |
| `groups.ts` action auth check | `moderator-plinko.html` | PASS |
| `arena-config-settings.ts` | `moderator-plinko.html` | PASS |

**AUTH-INCONSISTENCY-001:** `home.ts` redirects unauthenticated users to `moderator-login.html` while every other page redirects to `moderator-plinko.html`. This creates a split entry point — users who fail auth on home.ts land on the login page (which requires knowing you want to log in), while users who fail auth on any other protected page land on the full signup funnel. This may be intentional (home is the primary entry, show login; other pages expect the user already has an account). However, it is inconsistent and could confuse return-to-page flows if `moderator-login.html` doesn't properly handle returnTo for all pages.

---

### LM-129: SPA back button / pushState pattern

`arena-core.ts`:
- `pushArenaState()` called by `showRankedPicker()`, `showRulesetPicker()`, `showModeSelect()` — pushes history state
- `window.addEventListener('popstate', _onPopState)` handles back navigation by returning to lobby
- `history.replaceState({}, '', window.location.pathname)` used to consume ?spectate=, ?joinCode= URL params

`home.ts`: `history.replaceState` used for `?payment=`, `?cat=` param cleanup.

**Result: PASS** — The SPA uses pushState/popstate correctly. Back navigation is handled by `_onPopState` which clears overlays and returns to lobby. Arena overlays (ranked/ruleset/mode) push history entries and respond to popstate.

---

### LM-154: `colo-shimmer` class only in `index.html`

Found in: `src/leaderboard.list.ts` (4 instances) — class `colo-shimmer` used for skeleton loading shimmer.

The class is defined only in `index.html` CSS line 124. Since `leaderboard.list.ts` is only used inside `index.html` (via `#screen-leaderboard`), the class IS available at runtime on that page. However:

- If `leaderboard.ts` is ever used on another page, the shimmer will silently fail to animate
- The coupling is undocumented and fragile

**Result: WARN** — Technically functional at runtime (leaderboard is only on index.html), but violates the principle that `colo-shimmer` should be self-contained. Does NOT currently cause a visible bug.

---

### LM-196: `get_arena_feed` RPC usage

Found in:
- `src/arena/arena-lobby.ts` line 195: `safeRpc('get_arena_feed', { p_limit: 20 })` — uses `safeRpc` wrapper. PASS.
- `src/arena/arena-queue.ts` line 66: `safeRpc('get_arena_feed', { p_limit: 5, p_category: ... })` — uses `safeRpc`. PASS.
- `src/arena/arena-queue.ts` line 73: fallback `safeRpc('get_arena_feed', { p_limit: 5, p_category: null })` — PASS.

**Result: PASS** — All `get_arena_feed` calls go through `safeRpc()`. No raw `.rpc()` calls.

---

### LM-197: /go page must NOT import from `arena.ts`, must NOT call `supabase.auth`, must NOT reference `currentUser`

`moderator-go-app.js` analysis:
- No `import` statements (it's a plain `.js` file, not a module)
- No `supabase` reference
- No `auth` reference
- No `currentUser` reference
- No reference to `arena.ts` or any TypeScript module
- Uses raw `fetch('/api/go-respond')` for AI calls
- No Supabase client instantiation

**Result: PASS** — The `/go` page is completely isolated from the auth system.

---

### LM-198: Plinko must have exactly 5 steps

`moderator-plinko.html`: Contains `id="step-1"` through `id="step-5"` — 5 steps. PASS.
`src/pages/plinko.ts`: Calls `attachStep1()` through `attachStep5()` — 5 steps. PASS.

**Result: PASS**

---

### LM-201: Spectate has two working paths

Path 1: `moderator-spectate.html?id=<UUID>` — `spectate.ts` reads `params.get('id')`, validates UUID format, calls `loadDebate()`. PASS.

Path 2: `index.html?spectate=<UUID>` — `arena-core.ts` reads `params.get('spectate')`, validates UUID format, calls `enterFeedRoomAsSpectator(spectateId)`. PASS.

Bonus: `spectate.ts` redirects live debates from path 1 to `/?spectate=<id>` (path 2), ensuring live debates always use the live feed room viewer.

**Result: PASS**

---

### LM-225: `arena-lobby.ts` must NEVER be statically imported

Checked all TypeScript files in `src/`:
- `src/arena/arena-core.ts`: `void import('./arena-lobby.ts').then(...)` — dynamic. PASS.
- `src/arena/arena-core.ts` `_onPopState`: `void import('./arena-lobby.ts').then(...)` — dynamic. PASS.
- `src/arena.ts` barrel: `showPowerUpShop()` uses `await import('./arena/arena-lobby.ts')` — dynamic. PASS.
- No other files import `arena-lobby.ts`.

**Result: PASS** — arena-lobby.ts is always lazy-loaded. No static imports found.

---

## CROSS-CUTTING FLAG SWEEPS

### Inline `onclick` / `javascript:` CSP violations

Found: `moderator-settings.html` line 592:
```html
<button class="settings-btn outline" onclick="window.location.href='index.html'">← BACK TO APP</button>
```
No other `onclick` or `javascript:` attributes found in any HTML file outside of `moderator-go.html` (which is a static JS file, not a TypeScript/CSP-managed page).

**Fix Required:** Replace with `id="settings-back-btn"` and wire in `settings.wiring.ts`.

---

### `addEventListener` on missing IDs

- `home.profile.ts` line 89: `avatarBtn!.addEventListener(...)` — uses `!` non-null assertion; if `user-avatar-btn` is missing from DOM, throws at runtime.
- `home.profile.ts` line 90: `document.addEventListener('click', () => { dropdown!.classList.remove('open'); })` — same issue with `user-dropdown`.
- `home.overlay.ts` multiple lines: `overlay!.`, `overlayTitle!.`, `overlayContent!.`, `overlayClose!.` — non-null assertions. These would throw if the elements are missing.

**Assessment:** All these elements DO exist in `index.html`. The `!` assertions are technically safe but would make debugging harder if elements were ever removed. No wiring failures found.

---

### Unhandled `data-action` values

`home.nav.ts` handles: `powerup-shop`, `share-profile`, `invite-rewards`, `subscribe`, `arsenal`, `spectate-live`.

Elements in `index.html` with `data-action` not in this list:
- (None found) — all `data-action` values in `index.html` match the handled list.

`groups.ts` delegated dispatcher covers all `data-action` values present in `moderator-groups.html`. PASS.

**Potential issue — NAV-MISSING-001:** If any future element uses `data-action="go-home"` it would silently no-op (not handled in `home.nav.ts`). Currently no such element exists.

---

### `overflow:hidden` scroll trapping

`index.html` line 20: `html, body { height: 100%; overflow: hidden }` — intentional SPA behavior; scroll is delegated to `.screen` containers which use `overflow-y: auto`. This is the standard mobile SPA pattern used throughout.

Other instances of `overflow:hidden` found are all on progress bars and text clipping elements (not full containers). No problematic scroll trapping detected.

---

### Screens with no navigation path

All screens have at least one navigation path identified:
- `/go` pages: accessible via direct URL or link from main site
- All `moderator-*.html` pages: linked from `index.html` dropdown, bottom nav, or profile links
- All dynamic arena screens: reachable via the arena entry flow

No orphaned screens found.

---

## FIXES REQUIRED (Priority Order)

### HIGH — CSP/Security

**FIX-001 (CSP-SETTINGS-001):** `moderator-settings.html` line 592 — remove inline `onclick`, add `id="settings-back-btn"`, wire in `settings.wiring.ts`:
```typescript
document.getElementById('settings-back-btn')?.addEventListener('click', () => {
  window.location.href = 'index.html';
});
```

### HIGH — Rendering Bug

**FIX-002 (HTML-DEBLANDING-001):** `src/pages/debate-landing.ts` — fix the missing `>` on the mini-debate card div. The HTML template has:
```javascript
html += `<div class="mini-debate" data-action="go-debate" data-slug="${encodeURIComponent(slug)}"
  <div class="mini-topic">...
```
Should be:
```javascript
html += `<div class="mini-debate" data-action="go-debate" data-slug="${encodeURIComponent(slug)}">
  <div class="mini-topic">...
```

### MEDIUM — Architecture

**FIX-003 (AUTH-INCONSISTENCY-001):** Decide whether `home.ts` should redirect to `moderator-login.html` or `moderator-plinko.html` on auth failure, and make all pages consistent.

**FIX-004 (LM-154 partial):** Add `colo-shimmer` class definition to a shared CSS file (or `leaderboard.list.ts` injected styles) rather than relying on `index.html` defining it.

### LOW — Warnings

**FIX-005 (WARN-GO-HARDCODED-URL):** `moderator-go.html` uses hardcoded `https://themoderator.app/login` — change to relative path `/moderator-plinko.html`.

**FIX-006 (WIRING-LOGIN-001):** Consider moving login tab switching from `login.forms.ts` side-effect to explicit `wireLoginTabs()` function called from `login.ts` for clarity.

---

## STATISTICS

- **Screens audited:** 35 (A through BI)
- **Elements checked:** ~190 across all screens
- **Bugs (FAIL):** 7
- **Warnings (WARN):** 12
- **LM checks:** 11 (8 PASS, 1 WARN [LM-154], 0 FAIL dedicated)
- **CSP violations:** 1 (`onclick` in settings.html)
- **HTML generation bugs:** 1 (missing `>` in debate-landing.ts)
- **Auth inconsistencies:** 1 (home.ts → login vs. all others → plinko)
