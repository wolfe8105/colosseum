# SESSION 1 — Home Page Bug Fixes
**Date:** March 8, 2026
**Scope:** index.html, colosseum-config.js, colosseum-home.js

---

## FIXES APPLIED

### FIX 1 (CRITICAL): Spoke carousel was being destroyed on load
**File:** colosseum-home.js (line 877)
**Problem:** 900ms after page load, `ColosseumHome.render('screen-home')` replaced the entire `#screen-home` innerHTML — nuking the spoke carousel, all touch listeners, and category overlay handlers. Users saw a flash of the carousel, then a completely different section-based layout.
**Research:** innerHTML replacement destroys all descendant event listeners (MDN, SitePoint, multiple sources confirm). No way to preserve them — the DOM nodes are gone.
**Fix:** Commented out the auto-render. Spoke carousel (built in index.html) stays as the home screen. ColosseumHome module is still available if you want to call it explicitly later.

### FIX 2: touch-action:none (NOT A BUG after Fix 1)
**Problem was:** #screen-home had touch-action:none which blocks scrolling. This was only a bug when home.js replaced the carousel with scrollable content.
**With Fix 1:** Carousel stays, touch-action:none is correct for drag-to-spin. No change needed.

### FIX 3: Missing categories in config SECTIONS
**File:** colosseum-config.js (line 117)
**Problem:** Spoke carousel has 6 categories (politics, sports, entertainment, couples, trending, music). Config SECTIONS only had 4 (missing couples + music). Any code that loops SECTIONS to build DB queries or validate section IDs would miss these two.
**Fix:** Added `{ id: 'couples', name: 'COUPLES COURT', icon: '💔', tier: 2 }` and `{ id: 'music', name: 'THE STAGE', icon: '🎵', tier: 3 }`.

### FIX 4: Legal footer covers bottom nav
**File:** index.html (line 178)
**Problem:** `.colosseum-legal-footer` was `position:fixed; bottom:0; z-index:9999`. Bottom nav is also at the bottom with `z-index:100`. Footer sat on top of the nav, blocking Home/Ranks/Shop/Profile buttons.
**Fix:** Changed `bottom:0` → `bottom:calc(var(--bottom-nav-height) + var(--safe-bottom))` and `z-index:9999` → `z-index:50`. Footer now sits above the nav bar, below it in stacking order.

### FIX 5: Duplicate showToast in home.js
**File:** colosseum-home.js (line 415)
**Problem:** ColosseumHome had its own showToast() (bottom of screen, different style) while ColosseumConfig.showToast() (Session 60) is the global standard. Two different toasts appearing in different places.
**Fix:** Replaced home.js showToast with a wrapper that calls ColosseumConfig.showToast().

### FIX 6: aiSparring feature flag was false
**File:** colosseum-config.js (line ~175)
**Problem:** `aiSparring: false` in FEATURES, but NT says AI Sparring is live. Any code checking this flag would skip the feature.
**Fix:** Set `aiSparring: true`.

---

## FILES TO UPLOAD TO GITHUB
Replace these 3 files in the repo root:
1. `index.html`
2. `colosseum-config.js`
3. `colosseum-home.js`

Vercel auto-deploys from GitHub, so changes go live after upload.

---

## REMAINING (Sessions 2-10)
- Session 2: Login & Auth
- Session 3: Hot Takes & Reactions
- Session 4: Arena Feed (includes arena feed RPC bug)
- Session 5: AI Sparring (includes supabaseUrl casing bug)
- Session 6: Leaderboard (includes account_standing bug)
- Session 7: Predictions (includes participant_1_id bug)
- Session 8: Profile & Settings
- Session 9: Payments, Paywall, Notifications, Share
- Session 10: Groups, Analytics, Bot Army schema, Legal
