# CHART 1: MAIN FUNNEL (Entry → Plinko → Home)
## Complete Edge Map — Files + Line Numbers
### Session 83 — March 12, 2026

**48 edges mapped. Every file, every line.**

---

## EDGE 1: ENTRY A: Bot Link → Mirror Page (Cloudflare)
**Flow:** Bot posts link on Bluesky/Reddit → user taps → lands on static mirror page

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-mirror-generator.js | 11-12 | SIGNUP_URL + APP_BASE_URL env vars define where CTAs link |
| colosseum-mirror-generator.js | 29-37 | CATEGORIES array — defines the 7 category pages generated |
| colosseum-mirror-generator.js | 252-276 | `buildLandingPage()` — generates index.html for mirror |
| colosseum-mirror-generator.js | 439-443 | `writeFile()` — writes generated HTML to _mirror_build/ |
| colosseum-mirror-generator.js | 504-538 | `main()` — orchestrates: fetch data → build all pages → deploy |
| VPS: bot-config.js | (not in repo) | Defines which platforms are enabled + mirror URL |
| VPS: leg2-bluesky-poster.js | (not in repo) | Posts share card images with mirror links to Bluesky |

---

## EDGE 2: Mirror Page → Tap 'Vote Now' CTA
**Flow:** User sees debate card on mirror, taps "Vote Now — Free" button

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-mirror-generator.js | 206-213 | `ctaBanner()` — generates CTA with "Vote Now — Free" label when URL is provided |
| colosseum-mirror-generator.js | 379-380 | Debate page calls `ctaBanner()` with auto-debate URL: `APP_BASE_URL/colosseum-auto-debate.html?id=${d.id}` |
| colosseum-mirror-generator.js | 229-247 | `debateCard()` — card links to `/debate/${id}.html` (mirror debate detail page) |

---

## EDGE 3: Mirror Page → Tap 'Sign Up' CTA
**Flow:** User sees "Sign Up Free" CTA on any mirror page

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-mirror-generator.js | 11 | SIGNUP_URL defaults to `colosseum-six.vercel.app/colosseum-plinko.html` |
| colosseum-mirror-generator.js | 206-213 | `ctaBanner()` — when no URL passed, defaults to SIGNUP_URL with "Sign Up Free" label |
| colosseum-mirror-generator.js | 216-225 | `pageFooter()` — "Join" link points to SIGNUP_URL |
| colosseum-mirror-generator.js | 275-276 | Landing page calls `ctaBanner('Ready to join the fight?')` (no URL = signup default) |

---

## EDGE 4: Mirror Page → Tap Category (stays on mirror)
**Flow:** User taps a category card (Politics, Sports, etc.) — stays on mirror

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-mirror-generator.js | 258-263 | Landing page category grid: `<a href="/category/${cat.slug}.html">` |
| colosseum-mirror-generator.js | 29-37 | CATEGORIES array defines slugs: politics, sports, entertainment, etc. |
| colosseum-mirror-generator.js | 128-135 | CSS for `.category-grid` and `.category-card` |

---

## EDGE 5: Tap Category → Mirror Page (loops back)
**Flow:** Category page has nav bar linking back to mirror home

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-mirror-generator.js | 197-203 | `navBar()` — generates `<a href="/">🏠 Home</a>` link |
| colosseum-mirror-generator.js | 282-320 | `buildCategoryPage()` — generates category page with navBar + debate cards |

---

## EDGE 6: Tap 'Vote Now' CTA → Chart 6: Auto-Debate Page
**Flow:** Mirror debate page "Vote Now" CTA opens the live Vercel auto-debate page

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-mirror-generator.js | 380 | `ctaBanner()` href: `${APP_BASE_URL}/colosseum-auto-debate.html?id=${d.id}` |
| colosseum-auto-debate.html | 347 | Header "JOIN FREE" link: `<a href="/colosseum-plinko.html">` |
| colosseum-auto-debate.html | 528-533 | Vote buttons: `castVote('a')` / `castVote('b')` — ungated, no auth needed |
| colosseum-auto-debate.html | 551 | Post-vote CTA: `<a href="/colosseum-plinko.html">ENTER THE ARENA</a>` |
| colosseum-auto-debate.html | 576-642 | `castVote()` function — reads ?id param, submits vote via RPC |

---

## EDGE 7: ENTRY B: Direct Visit (Vercel App) → No auth session? Auto-redirect
**Flow:** User goes directly to colosseum-six.vercel.app → index.html checks for auth session

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 10 | Loads colosseum-locks-fix.js (noOpLock for navigator.locks bug) |
| index.html | 11 | Loads Supabase CDN |
| index.html | 13-14 | Loads config.js then auth.js |
| index.html | 658-684 | `appInit()` — waits for auth, checks session, redirects if no user |
| index.html | 662-668 | `Promise.race([ColosseumAuth.ready, 4s timeout])` — never hang forever |
| index.html | 680-683 | Auth gate: `if(!ColosseumAuth.currentUser && !isPlaceholderMode) → redirect to plinko` |
| colosseum-auth.js | 37 | `readyPromise` — resolves when INITIAL_SESSION fires |
| colosseum-auth.js | 46-132 | `init()` — creates Supabase client, sets up onAuthStateChange |
| colosseum-auth.js | 74-78 | 5s safety timeout if INITIAL_SESSION never fires |
| colosseum-auth.js | 90-92 | `onAuthStateChange` — `INITIAL_SESSION` is sole init path |
| colosseum-config.js | (entire file) | Provides SUPABASE_URL, SUPABASE_ANON_KEY, feature flags |
| colosseum-locks-fix.js | (entire file) | noOpLock mock to prevent navigator.locks orphan bug |

---

## EDGE 8: ENTRY C: Public Profile → Tap Follow / Action / CTA
**Flow:** User lands on /u/username public profile → taps Follow or Challenge button

| File | Lines | What It Does |
|------|-------|-------------|
| api/profile.js | 10 | Route: `/u/:username` → `/api/profile?username=:username` via vercel.json |
| api/profile.js | 53-80 | `buildProfileHtml()` — renders full profile page server-side |
| api/profile.js | 229 | CSS for CTA buttons section |
| api/profile.js | 335-339 | CTA row: Challenge (`${BASE_URL}/#arena`) + Follow (`${BASE_URL}/login?returnTo=/u/${username}`) |
| api/profile.js | 262-263 | Header: logo link + "JOIN THE ARENA" button |

---

## EDGE 9: ENTRY C: Public Profile → Tap Debate in History
**Flow:** User sees debate record on public profile and taps to view a debate

| File | Lines | What It Does |
|------|-------|-------------|
| api/profile.js | 284-298 | Debate Record section — shows W/L/D bar + numbers |

**⚠️ NOTE:** Individual debate links are NOT currently rendered in the debate record. The record shows aggregate stats only (wins, losses, draws). This edge represents a planned feature — linking individual debate history entries to their debate landing pages.

---

## EDGE 10: Tap Debate in History → Chart 6: Debate Landing
**Flow:** (Planned) Tapping a debate in the user's history opens the debate landing page

| File | Lines | What It Does |
|------|-------|-------------|
| api/profile.js | 284-298 | Debate Record section (currently aggregate only, no individual links) |
| colosseum-debate-landing.html | (entire file) | Destination page for user-created debates |

**⚠️ NOTE:** Not wired yet. When implemented, api/profile.js will need to fetch the user's debate history and render clickable links to `/colosseum-debate-landing.html?id={debate_id}`.

---

## EDGE 11: Tap 'Sign Up' CTA (mirror) → PLINKO GATE
**Flow:** Mirror "Sign Up Free" link opens the Plinko Gate signup flow

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-mirror-generator.js | 11 | SIGNUP_URL = `colosseum-six.vercel.app/colosseum-plinko.html` |
| colosseum-mirror-generator.js | 206-213 | `ctaBanner()` — href defaults to SIGNUP_URL |
| colosseum-plinko.html | 324-355 | Step 1 HTML (auth method selection) — first screen user sees |

---

## EDGE 12: No auth session? Auto-redirect → PLINKO GATE (yes)
**Flow:** index.html detects no session → redirects to plinko

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 680-683 | `if(!ColosseumAuth.currentUser && !isPlaceholderMode) { window.location.href='colosseum-plinko.html'; return; }` |
| colosseum-auth.js | 37 | `readyPromise` — resolved by init() |
| colosseum-auth.js | 90-92 | INITIAL_SESSION handler resolves readyPromise |
| colosseum-plinko.html | 324-355 | Step 1 HTML — landing destination |

---

## EDGE 13: Tap Follow / Action / CTA (profile) → PLINKO GATE
**Flow:** Follow button on public profile → login page → plinko for new users

| File | Lines | What It Does |
|------|-------|-------------|
| api/profile.js | 338 | Follow button: `href="${BASE_URL}/login?returnTo=/u/${username}"` |
| colosseum-login.html | 507-513 | `getReturnTo()` — parses ?returnTo from URL, validates relative path |
| colosseum-login.html | 423 | "Don't have an account? Sign up" link → plinko |

**Note:** The Follow CTA goes to login first. If user has no account, login page links them to plinko.

---

## EDGE 14: PLINKO GATE → Step 1: Auth (Google / Discord / Email)
**Flow:** Plinko card shows Step 1 auth options

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-plinko.html | 324-355 | Step 1 HTML: Google OAuth button, Apple button (hidden), email toggle |
| colosseum-plinko.html | 426-433 | Plinko controller init: placeholder detection |
| colosseum-plinko.html | 455-467 | `goToStep()` — step navigation |
| colosseum-plinko.html | 504-518 | Step 1 JS: `handleOAuth()` → calls `ColosseumAuth.oauthLogin()` |
| colosseum-plinko.html | 520-521 | Google + Apple click listeners |
| colosseum-plinko.html | 524-548 | Email toggle + email continue handler → `goToStep(2)` |
| colosseum-auth.js | 238-255 | `oauthLogin(provider, redirectTo)` — Supabase OAuth with redirect |

---

## EDGE 15: Step 1 → Step 2: Age Gate (success)
**Flow:** Auth succeeds → move to age verification

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-plinko.html | 536-548 | Email continue: validates email/password → `goToStep(2)` (line 547) |
| colosseum-plinko.html | 648-675 | OAuth return handler: `onAuthStateChange SIGNED_IN` → `goToStep(2)` (line 672) |
| colosseum-plinko.html | 357-389 | Step 2 HTML: DOB fields + TOS checkbox |
| colosseum-plinko.html | 462-467 | `goToStep(n)` — hides all steps, shows step n |

---

## EDGE 16: Step 2 → Step 3: Username (13+)
**Flow:** Age >= 13, TOS checked → move to username selection

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-plinko.html | 550-569 | Step 2 handler: validates DOB, checks age >= 13, checks TOS → `goToStep(3)` (line 569) |
| colosseum-plinko.html | 480-487 | `getAge()` helper — calculates age from DOB |
| colosseum-plinko.html | 489-502 | DOB select populators (days 1-31, years) |
| colosseum-plinko.html | 391-409 | Step 3 HTML: username + display name fields |

---

## EDGE 17: Step 3 → Step 4: Done! (unique username)
**Flow:** Username passes uniqueness check → account created → welcome screen

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-plinko.html | 573-641 | Step 3 handler: validates username format, calls signUp or update_profile |
| colosseum-plinko.html | 596-618 | Email path: `ColosseumAuth.signUp()` → clears credentials → `goToStep(4)` |
| colosseum-plinko.html | 620-633 | OAuth path: `supabase.rpc('update_profile')` → `goToStep(4)` |
| colosseum-plinko.html | 605-608 | Security: clears signupPassword + signupEmail from memory after use |
| colosseum-plinko.html | 411-418 | Step 4 HTML: welcome icon + "ENTER THE COLOSSEUM" button |
| colosseum-auth.js | 187-217 | `signUp()` — creates Supabase user, inserts profile via RPC |
| colosseum-auth.js | 317-346 | `updateProfile()` — updates display_name, username via RPC |

---

## EDGE 18: PLINKO GATE → 'Already have account?'
**Flow:** Plinko footer shows login link

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-plinko.html | 422-424 | Footer: `Already have an account? <a href="colosseum-login.html">Log in</a>` |

---

## EDGE 19: 'Already have account?' → Login Page
**Flow:** User clicks "Log in" → navigates to login page

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-plinko.html | 423 | `<a href="colosseum-login.html">Log in</a>` |
| colosseum-login.html | 1-778 | Entire login page (destination) |

---

## EDGE 20: Login Page → Login Success
**Flow:** User enters credentials or completes OAuth → login succeeds

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-login.html | 590-608 | Email login handler: calls `ColosseumAuth.logIn()` → success message |
| colosseum-login.html | 601 | `ColosseumAuth.logIn({ email, password })` |
| colosseum-login.html | 607-608 | Success: "Welcome back, gladiator." → redirect to `getReturnTo()` |
| colosseum-login.html | 670-678 | `handleOAuth(provider)` → `ColosseumAuth.oauthLogin(provider)` |
| colosseum-login.html | 730-738 | `onAuthStateChange`: `SIGNED_IN` → redirect |
| colosseum-login.html | 507-513 | `getReturnTo()` — validates returnTo param, defaults to index.html |
| colosseum-auth.js | 219-236 | `logIn({ email, password })` — Supabase signInWithPassword |
| colosseum-auth.js | 238-255 | `oauthLogin(provider, redirectTo)` — Supabase signInWithOAuth |

---

## EDGE 21: Step 4: Done! 'ENTER THE COLOSSEUM' → HOME SCREEN
**Flow:** User clicks final button → navigates to main app

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-plinko.html | 643-646 | `btn-enter` click → `window.location.href = getReturnTo()` |
| colosseum-plinko.html | 444-453 | `getReturnTo()` — returns returnTo param or default `'index.html'` |
| colosseum-plinko.html | 449-452 | Security: validates relative path, blocks `//`, `\`, `javascript:`, `data:` |
| index.html | 658-706 | `appInit()` — now has valid session, skips redirect, loads UI |

---

## EDGE 22: Login Success → HOME SCREEN
**Flow:** Login completes → redirect to index.html

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-login.html | 607-608 | Email success: `setTimeout(() => { window.location.href = getReturnTo(); }, 600)` |
| colosseum-login.html | 762-766 | Already-logged-in check: `ColosseumAuth.ready.then()` → redirect |
| colosseum-login.html | 507-513 | `getReturnTo()` — defaults to `'index.html'` |
| index.html | 658-706 | `appInit()` — now has valid session, renders UI |

---

## EDGE 23: HOME SCREEN → Notification Bell
**Flow:** User taps notification bell icon in top nav

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 206 | Bell button HTML: `<button class="nav-icon-btn" id="notif-btn">🔔</button>` |
| index.html | 55 | Notification dot CSS: `.notification-dot` |
| colosseum-notifications.js | 15 | `ColosseumNotifications` module init |
| colosseum-notifications.js | 271-278 | `_bindBellButton()` — attaches click listener to `notif-btn` |
| colosseum-notifications.js | 225-228 | `_updateBadge()` — shows/hides `notif-dot` based on unread count |
| colosseum-notifications.js | 250-268 | `_fetchNotifications()` — polls Supabase `notifications` table |
| colosseum-notifications.js | 231-236 | `_startPolling()` — 30s interval for notification refresh |

---

## EDGE 24: HOME SCREEN → Token Count (display only)
**Flow:** Token balance displayed in top nav bar

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 205 | Token bar HTML: `<div class="token-bar" id="token-display">🪙 <span id="token-count">0</span></div>` |
| index.html | 52 | Token bar CSS: `.token-bar` |
| index.html | 647 | `updateUIFromProfile()` sets `token-count` text from profile.token_balance |
| colosseum-tokens.js | 147-167 | `_updateBalanceDisplay()` — updates all `[data-token-balance]` elements + `token-count` + flash animation |
| colosseum-tokens.js | 89-105 | `_coinFlyUp()` — gold coin animation targets `token-display` element |
| colosseum-tokens.js | 159-160 | Specifically targets `token-count` span by ID |
| colosseum-tokens.js | 162-166 | Targets `token-display` bar for flash animation |

---

## EDGE 25: HOME SCREEN → Tap any Spoke (Politics, Sports, Entertainment...)
**Flow:** User taps a spoke tile on the carousel

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 79-94 | Spoke carousel CSS: `.spoke-wheel`, `.spoke-tile`, `.tile-inner` |
| index.html | 223 | Home screen HTML: `<div class="spoke-wheel" id="spokeWheel"></div>` |
| index.html | 323-330 | `CATEGORIES` array — 6 categories with id, icon, label, section name |
| index.html | 345-353 | `buildTiles()` — creates spoke tiles, attaches click listener |
| index.html | 350 | Click handler: `if(!wasSpin) openCategory(cat)` |
| index.html | 355-366 | `positionTiles()` — 3D carousel positioning (radius, tilt, scale) |
| index.html | 384-403 | Touch/mouse handlers for carousel spinning |

---

## EDGE 26: Tap any Spoke → Chart 3: Category Overlay
**Flow:** Spoke click opens full-screen category overlay with Hot Takes + Predictions

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 96-101 | Category overlay CSS: `.category-overlay`, transition, backdrop |
| index.html | 296-307 | Category overlay HTML: overlayTitle, tabs (Takes/Predictions), overlayContent |
| index.html | 405-454 | `openCategory(cat)` — sets title, resets tabs, fetches takes + predictions |
| index.html | 425-434 | Calls `ColosseumAsync.fetchTakes()` + `loadHotTakes()` |
| index.html | 446-453 | Calls `ColosseumAsync.fetchPredictions()` + `renderPredictions()` |
| index.html | 456-465 | Tab switching: click toggles takes/predictions visibility |
| index.html | 467-470 | Overlay close: button click + swipe-down gesture |
| colosseum-async.js | (entire file) | `ColosseumAsync` module: fetchTakes, loadHotTakes, fetchPredictions, renderPredictions |

---

## EDGE 27: HOME SCREEN → Tap 'Arena'
**Flow:** User taps Arena button in bottom nav

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 312 | Bottom nav HTML: `<button class="bottom-nav-btn action-btn" data-screen="arena"><div class="action-circle">🎙️</div></button>` |
| index.html | 167-176 | Bottom nav CSS: `.bottom-nav`, `.bottom-nav-btn`, `.action-circle` |
| index.html | 554-567 | `navigateTo(screenId)` — switches active screen, updates nav highlights |
| index.html | 567 | Nav button click listener: `navigateTo(btn.dataset.screen)` |
| index.html | 224 | Arena screen container: `<div class="screen" id="screen-arena"></div>` |

---

## EDGE 28: HOME SCREEN → Tap 'Leaderboard'
**Flow:** User taps Ranks button in bottom nav

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 311 | Bottom nav HTML: `<button class="bottom-nav-btn" data-screen="leaderboard">🏆 Ranks</button>` |
| index.html | 554-567 | `navigateTo('leaderboard')` — shows leaderboard screen |
| index.html | 293 | Leaderboard screen container: `<div class="screen" id="screen-leaderboard"></div>` |
| colosseum-leaderboard.js | (entire file) | `ColosseumLeaderboard` — renders Elo/Wins/Streak tabs, time filters |

---

## EDGE 29: HOME SCREEN → Tap 'Groups'
**Flow:** (Planned navigation path to Groups)

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-groups.html | (entire file) | Groups page: Discover, My Groups, Rankings, Detail view |

**⚠️ NOTE:** Groups is a separate HTML page (`colosseum-groups.html`), NOT a screen inside index.html. There is currently NO link to groups from the main app's bottom nav or dropdown. The bottom nav has: Home, Ranks, Arena, Shop, Profile. Groups navigation is not yet wired from the home screen. This edge represents a planned connection.

---

## EDGE 30: HOME SCREEN → Tap 'Profile'
**Flow:** User taps Profile button in bottom nav

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 314 | Bottom nav HTML: `<button class="bottom-nav-btn" data-screen="profile">👤 Profile</button>` |
| index.html | 554-567 | `navigateTo('profile')` |
| index.html | 562-565 | Profile-specific: loads rivals + follow counts when switching to profile |
| index.html | 225-260 | Profile screen HTML: avatar, name, tier, follows, depth bar, stat grid, links |
| index.html | 630-653 | `updateUIFromProfile()` — populates all profile UI elements from data |
| colosseum-auth.js | 432-444 | `getFollowCounts()` — fetches follower/following counts via RPC |
| colosseum-async.js | (renderRivals) | Renders rivals feed in profile screen |

---

## EDGE 31: Tap 'Arena' → Chart 2: Arena Lobby
**Flow:** Arena screen activates → arena.js renders lobby

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 554-567 | `navigateTo('arena')` — activates `#screen-arena` |
| index.html | 224 | `<div class="screen" id="screen-arena"></div>` — empty container |
| colosseum-arena.js | (entire file) | `ColosseumArena` — renders lobby with 4 mode cards + ranked/casual toggle |

---

## EDGE 32: Tap 'Leaderboard' → Chart 6: Leaderboard
**Flow:** Leaderboard screen activates → leaderboard.js renders

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 554-567 | `navigateTo('leaderboard')` — activates `#screen-leaderboard` |
| index.html | 293 | `<div class="screen" id="screen-leaderboard"></div>` — empty container |
| colosseum-leaderboard.js | (entire file) | `ColosseumLeaderboard` — 3 tabs (Elo, Wins, Streak), time filters, My Rank |

---

## EDGE 33: Tap 'Groups' → Chart 4: Groups
**Flow:** (Planned) Navigate to groups page

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-groups.html | (entire file) | Destination page |

**⚠️ NOTE:** No navigation link exists from index.html to colosseum-groups.html. This edge is planned but not wired.

---

## EDGE 34: Tap 'Profile' → Chart 5: Profile / Depth
**Flow:** Profile screen links to Profile Depth page

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 255 | Profile link: `<a href="colosseum-profile-depth.html">📊 Complete Your Profile</a>` |
| index.html | 217 | Dropdown link: `<a href="colosseum-profile-depth.html">📊 Complete Profile</a>` |
| index.html | 651 | Depth bar text links to profile-depth: `Profile ${depth}% complete — unlock rewards` |
| colosseum-profile-depth.html | (entire file) | 12 sections, 39 Qs, saves via safeRpc, tier banner (Session 117) |
| colosseum-tiers.js | (entire file) | Session 117: Tier lookup utility. getTier(), getNextTier(), renderTierBadge(), renderTierProgress() |
| Supabase RPC | increment_questions_answered | Session 117: Increments questions_answered on profile. Called from saveSection() |

---

## EDGE 35: HOME SCREEN → Pull-to-Refresh (updates indicators)
**Flow:** User swipes down on category overlay to refresh content

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 472-551 | `initPullToRefresh()` IIFE — full pull-to-refresh implementation |
| index.html | 474-476 | Threshold (64px), max (90px), state vars |
| index.html | 478-503 | PTR indicator element + spinner CSS injection |
| index.html | 505-511 | touchstart: begins tracking if scrollTop is 0 |
| index.html | 513-522 | touchmove: calculates drag distance, updates visual indicator |
| index.html | 524-550 | touchend: if threshold reached → shows spinner → refreshes takes + predictions |
| index.html | 538-543 | Calls `ColosseumAsync.fetchTakes()`, `loadHotTakes()`, `fetchPredictions()`, `renderPredictions()` |
| colosseum-async.js | (fetchTakes, loadHotTakes, fetchPredictions, renderPredictions) | Data fetch + render functions called by PTR |
| colosseum-home.js | (not directly involved) | ColosseumHome.render() is commented out (line 958) — PTR uses ColosseumAsync directly |

---

## EDGE 36: HOME SCREEN → Tap Settings Gear
**Flow:** User taps settings link in dropdown menu

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 216 | Dropdown item: `<a href="colosseum-settings.html">⚙️ Settings</a>` |
| index.html | 256 | Profile link: `<a href="colosseum-settings.html">⚙️ Settings</a>` |
| index.html | 570-573 | Avatar click → dropdown toggle |

---

## EDGE 37: Tap Settings Gear → Chart 5: Settings
**Flow:** Navigate to settings page

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 216 | `<a href="colosseum-settings.html">⚙️ Settings</a>` |
| colosseum-settings.html | (entire file) | Settings toggles, account management, moderator panel |

---

## EDGE 38: Chart 2: Arena Lobby (cross-chart connector)
**Flow:** Cross-chart reference — Arena Lobby node connects Chart 1 to Chart 2

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 554-567 | `navigateTo('arena')` — activates arena screen |
| colosseum-arena.js | (entire file) | Renders arena lobby (4 mode cards, ranked/casual toggle) |

---

## EDGE 39: Chart 3: Category Overlay (cross-chart connector)
**Flow:** Cross-chart reference — Category Overlay connects Chart 1 to Chart 3

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 405-454 | `openCategory(cat)` — opens overlay, loads data |
| colosseum-async.js | (entire file) | Provides fetchTakes, loadHotTakes, fetchPredictions, renderPredictions |

---

## EDGE 40: Chart 4: Groups (cross-chart connector)
**Flow:** Cross-chart reference — Groups connects Chart 1 to Chart 4

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-groups.html | (entire file) | Groups page (not yet linked from index.html) |

**⚠️ NOTE:** Not wired from index.html. No navigation path exists yet.

---

## EDGE 41: Chart 5: Profile / Depth (cross-chart connector)
**Flow:** Cross-chart reference — Profile Depth connects Chart 1 to Chart 5

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 255 | `<a href="colosseum-profile-depth.html">` |
| colosseum-profile-depth.html | (entire file) | 12 sections, 39 Qs, tier banner + increment_questions_answered RPC (Session 117) |
| colosseum-tiers.js | (entire file) | Session 117: Tier utility dependency |

---

## EDGE 42: Chart 5: Settings (cross-chart connector)
**Flow:** Cross-chart reference — Settings connects Chart 1 to Chart 5

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 216 | `<a href="colosseum-settings.html">` |
| colosseum-settings.html | (entire file) | Settings page |

---

## EDGE 43: Chart 6: Auto-Debate Page (cross-chart connector)
**Flow:** Cross-chart reference — Auto-Debate connects Chart 1 (mirror) to Chart 6

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-mirror-generator.js | 380 | Mirror debate CTA → `APP_BASE_URL/colosseum-auto-debate.html?id=${d.id}` |
| colosseum-auto-debate.html | (entire file) | Auto-debate page with ungated voting |

---

## EDGE 44: Chart 6: Debate Landing (cross-chart connector)
**Flow:** Cross-chart reference — Debate Landing connects public profile to Chart 6

| File | Lines | What It Does |
|------|-------|-------------|
| api/profile.js | 284-298 | Debate record section (aggregate only, no individual links yet) |
| colosseum-debate-landing.html | (entire file) | Debate landing page |

**⚠️ NOTE:** Not wired. Individual debate links from public profiles are not yet implemented.

---

## EDGE 45: Chart 6: Leaderboard (cross-chart connector)
**Flow:** Cross-chart reference — Leaderboard connects Chart 1 to Chart 6

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 554-567 | `navigateTo('leaderboard')` |
| colosseum-leaderboard.js | (entire file) | Leaderboard module |

---

## EDGE 46: Chart 1: Home Screen (inbound cross-chart connector)
**Flow:** Other charts navigate back to Home Screen

| File | Lines | What It Does |
|------|-------|-------------|
| index.html | 658-706 | `appInit()` — entry point for all returns to index.html |
| index.html | 691-696 | Restores last screen from URL param or localStorage |
| colosseum-settings.html | 490 | "← BACK TO APP" button: `window.location.href='index.html'` |

---

## EDGE 47: Chart 1: Plinko Gate (inbound from Settings)
**Flow:** Settings page logout → Plinko Gate

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-settings.html | 647 | Logout: `window.location.href = 'colosseum-plinko.html'` |
| colosseum-settings.html | 650-672 | Delete Account → `window.location.href = 'colosseum-plinko.html'` |
| colosseum-settings.html | 682 | Account deletion confirmed → redirect to plinko |

---

## EDGE 48: Chart 1: Plinko Gate (inbound from Auto-Debate)
**Flow:** Auto-debate page "ENTER THE ARENA" CTA → Plinko Gate

| File | Lines | What It Does |
|------|-------|-------------|
| colosseum-auto-debate.html | 347 | Header: `<a href="/colosseum-plinko.html" class="join-btn">JOIN FREE</a>` |
| colosseum-auto-debate.html | 551 | Post-vote CTA: `<a href="/colosseum-plinko.html" class="cta-btn">ENTER THE ARENA</a>` |

---

## SUMMARY

| Stat | Count |
|------|-------|
| Total edges mapped | 48 |
| Unique files involved | 13 |
| Unwired edges (planned) | 3 (Edges 9, 10, 29/33/40 — Groups nav + debate history links) |
| VPS-only files (not in repo) | 2 (bot-config.js, leg2-bluesky-poster.js) |

### Files Touched by Chart 1

| File | Edge Count | Role |
|------|-----------|------|
| index.html | 24 | Central hub — nav, auth gate, carousel, overlay, screens |
| colosseum-plinko.html | 10 | Signup flow — 4 steps |
| colosseum-mirror-generator.js | 9 | Static mirror page generation |
| colosseum-login.html | 5 | Login page |
| api/profile.js | 5 | Public profile serverless function |
| colosseum-auth.js | 7 | Auth module — signUp, logIn, oauthLogin, readyPromise |
| colosseum-auto-debate.html | 4 | Ungated voting page |
| colosseum-notifications.js | 1 | Notification bell |
| colosseum-tokens.js | 1 | Token display |
| colosseum-async.js | 3 | Hot takes, predictions data |
| colosseum-leaderboard.js | 2 | Leaderboard rendering |
| colosseum-arena.js | 2 | Arena lobby rendering |
| colosseum-settings.html | 3 | Settings + logout/delete redirects |
| colosseum-groups.html | 2 | Groups page (unwired) |
| colosseum-profile-depth.html | 2 | Profile depth page + tier banner (Session 117) |
| colosseum-tiers.js | 1 | Session 117: Tier lookup utility (dependency of profile-depth) |
| colosseum-home.js | 1 | Home module (mostly dormant — render() commented out) |
| colosseum-config.js | 1 | Config + credentials |
| colosseum-locks-fix.js | 1 | noOpLock for navigator.locks bug |
| colosseum-debate-landing.html | 1 | Debate landing (unwired from profile) |
