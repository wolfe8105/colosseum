# SESSION 87 — CHART 5 EDGE TRACE
### Chart 5: Profile + Settings
### Date: March 12, 2026

---

## Summary
- **16 internal edges traced** (E223–E255)
- **2 cross-ref edges updated** (E326, E327)
- **8 wired, 8 unwired, 0 bugs**
- **Files involved:** profile-depth.html, colosseum-settings.html, colosseum-auth.js, colosseum-tokens.js, api/profile.js
- **0 bugs found** — all escaping uses escHtml(), all writes go through safeRpc(), input validation present

---

## PROFILE DEPTH SECTION (6 edges)

### E223: Profile Depth → Tap Section (expand Qs) ✅ WIRED
- `profile-depth.html L602-621` — `renderGrid()` builds 12 section tiles with click listeners
- `profile-depth.html L618-620` — click handler calls `openSection(tile.dataset.section)`
- `profile-depth.html L624-650` — `openSection()` renders question panel, wires inputs, scrolls into view

### E224: Tap Section → Complete Section (token reward + badge) ✅ WIRED
- `profile-depth.html L754-816` — `saveSection()`: checks all answered, saves to localStorage + Supabase
- `profile-depth.html L769` — `localStorage.setItem('colosseum_profile_depth', ...)`
- `profile-depth.html L776-778` — `ColosseumTokens.checkProfileMilestones(completedSections.size)`
- `colosseum-tokens.js L355-359` — `checkProfileMilestones()`: claims at 3/6/12 section thresholds (30/75/150 tokens)
- `profile-depth.html L781` — `showReward(section.reward)` displays reward toast
- `profile-depth.html L792` — `safeRpc('save_profile_depth', { p_section_id, p_answers })`

### E225: Profile Depth → Change Avatar ❌ UNWIRED
- No avatar change functionality exists in profile-depth.html
- No file upload, no avatar picker, no avatar URL input anywhere on the page
- The node exists in the diagram but has zero implementation

### E226: Profile Depth → Edit Bio ❌ UNWIRED
- `profile-depth.html L515` — "Unlock custom bio" appears as reward text for Social section
- No bio input field, no bio editor, no save-bio function exists
- The reward is cosmetic text only — completing the section doesn't actually unlock a bio input

### E230: Profile Depth → Stats Display (Elo | W/L | Tokens) ❌ UNWIRED
- No stats display section exists on the profile-depth page
- Page only has: back bar, discount banner, section grid, question panel, reward toast
- User stats (Elo, W/L, tokens) are not shown or fetched

### E231: Stats Display → Tap Rival → Profile ❌ UNWIRED
- Blocked by E230 — no stats display means no rival list to tap
- No rival query or rival rendering in profile-depth.html

### E232: Stats Display → Tap Following → Profile ❌ UNWIRED
- Blocked by E230 — no stats display means no following list to tap
- No following query or following rendering in profile-depth.html

### E234: Tap Rival → Public Profile Page ❌ UNWIRED
- Blocked by E231 — rival list doesn't exist, so navigation to profile is impossible

### E235: Tap Following → Public Profile Page ❌ UNWIRED
- Blocked by E232 — following list doesn't exist, so navigation to profile is impossible

---

## SETTINGS SECTION (7 edges)

### E243: Settings → Notification Preferences ✅ WIRED
- `settings.html L349-381` — 4 notification toggle rows (challenge, debate, follow, reactions)
- `settings.html L547-554` — `loadSettings()` sets toggle states from localStorage
- `settings.html L688-714` — DOMContentLoaded loads from `user_settings` table via Supabase `.from().select()`
- `settings.html L591-634` — `saveSettings()` saves to localStorage + `safeRpc('save_user_settings', {...9 toggle params})`

### E244: Settings → Privacy Policy ✅ WIRED
- `settings.html L783` — footer link `<a href="colosseum-privacy.html">Privacy Policy</a>`
- `colosseum-privacy.html` — standalone read-only page

### E245: Settings → Terms of Service ✅ WIRED
- `settings.html L785` — footer link `<a href="colosseum-terms.html">Terms of Service</a>`
- `colosseum-terms.html` — standalone read-only page

### E246: Settings → Change Password ❌ UNWIRED
- No password change UI in settings.html
- No password-related input, button, or function anywhere in the file
- Supabase Auth supports `updateUser({ password })` but it's not implemented

### E247: Settings → Delete Account ✅ WIRED
- `settings.html L492-493` — `🗑️ DELETE ACCOUNT` danger button
- `settings.html L497-513` — Delete confirmation modal with typed "DELETE" requirement
- `settings.html L651-660` — delete-btn click opens modal; input listener enables confirm only when "DELETE" typed
- `settings.html L667-673` — confirm click → `ColosseumAuth.deleteAccount()` → `localStorage.clear()` → redirect to plinko
- `colosseum-auth.js L350-367` — `deleteAccount()` → `safeRpc('soft_delete_account')` → signs out

### E248: Settings → Log Out ✅ WIRED
- `settings.html L491` — `🚪 LOG OUT` button
- `settings.html L642-648` — logout-btn click → `ColosseumAuth.logOut()` → `localStorage.removeItem('colosseum_settings')` → redirect to plinko
- `colosseum-auth.js L257-268` — `logOut()` → `supabase.auth.signOut()`

### E255: Settings → Moderator Dashboard (if mod role) ✅ WIRED
- `settings.html L408-457` — Moderator section: enabled toggle, available toggle, stats (rating/debates/rulings/approval)
- `settings.html L718-745` — `loadModeratorSettings()` reads `currentProfile` mod fields, shows/hides conditional rows
- `settings.html L748-781` — Change handlers for mod toggles: `ColosseumAuth.toggleModerator(enabled)`, `ColosseumAuth.toggleModAvailable(available)`
- `colosseum-auth.js L626-662` — `toggleModerator()` + `toggleModAvailable()` → `safeRpc('toggle_moderator')` / `safeRpc('toggle_mod_available')`

---

## CROSS-REFERENCE EDGES UPDATED (2 edges)

### E326: → Chart 5: Public Profile (from debate-landing) ❌ UNWIRED
- `colosseum-debate-landing.html` has no `showUserProfile()` calls and no `/u/` links
- Debater names/avatars are displayed but not clickable

### E327: → Chart 5: Public Profile (from leaderboard) ❌ UNWIRED
- `colosseum-leaderboard.js` renders ranked rows but has no click handlers on entries
- No `showUserProfile()`, no `/u/` links, no profile navigation

---

## PUBLIC PROFILE PAGE (api/profile.js) — Referenced by multiple edges

The public profile page at `/u/username` is a Vercel serverless function:
- `api/profile.js L388-435` — `handler()`: validates username regex, queries `profiles_public` view via Supabase REST, returns full HTML
- `api/profile.js L22-24` — `escapeHtml()` with OWASP 5-char mapping
- `api/profile.js L27-31` — `sanitizeAvatarUrl()` allows only `https://` URLs
- `api/profile.js L53-349` — `buildProfileHtml()` renders full page with OG tags, avatar, name, bio, Elo, W/L/D, level, streaks, member since, CTAs
- OG tags are server-rendered for social crawlers (Bluesky, Discord, Google)
- Cache: 5-minute `s-maxage` with stale-while-revalidate
- 404 page: `build404Html()` shows "GLADIATOR NOT FOUND"

---

## SECURITY NOTES

1. **profile-depth.html**: All user input escaped via `escHtml()` (L410-418). Answer data validated by `sanitizeAnswers()` (L543-556) which rejects prototype pollution and unknown keys. All Supabase writes via `safeRpc()`. Typed DELETE confirmation on account delete.
2. **settings.html**: Username validated client-side (L582: 3-20 chars, alphanumeric+underscore). Tier badge validated against allowlist (L539-541). All settings saved via `safeRpc('save_user_settings')`. Moderator toggles use dedicated RPC functions.
3. **api/profile.js**: Username validated by regex (L392). All output escaped via `escapeHtml()`. Avatar URLs filtered by `sanitizeAvatarUrl()` (https-only). No user input reaches the page unescaped.

---

## UNWIRED EDGE ANALYSIS

The 8 unwired edges cluster into 3 missing features:

1. **Profile self-view (E225, E226, E230):** The profile-depth page is ONLY a questionnaire. It has no "my profile" view with avatar, bio, stats, rivals, or followers. Users complete sections and earn rewards, but they can't see themselves. This is the biggest gap — a "my profile" header card with avatar, bio edit, and stats would wire 3 edges instantly.

2. **Profile navigation from lists (E231, E232, E234, E235):** Even if the stats section existed, tapping rival/following names would need to route to `/u/username` public profile pages. Currently `showUserProfile()` in auth.js creates an in-app modal (not the same as the `/u/` serverless page). These are dependent on E230 being built first.

3. **Change Password (E246):** Supabase Auth provides `updateUser({ password })` for email-auth users. OAuth-only users (Google/Apple) don't have passwords to change. Implementation would need to detect auth method and show/hide the password field accordingly.

---

## Files Produced
- `Colosseum5-annotated.drawio` — Chart 5 annotations injected (16 edges + 2 cross-refs)
- `session-87-chart5-trace.md` — this file
