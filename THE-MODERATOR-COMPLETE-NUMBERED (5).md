# THE MODERATOR / THE COLOSSEUM — COMPLETE PROJECT BIBLE
### Numbered Hierarchical Format — February 27, 2026 (Updated Session 10)

---

# 1. WHAT THIS IS

1.1. Live audio debate platform / emergence engine
1.2. Users hang out in themed sections, post hot takes, react, debates emerge from disagreements
1.3. Four core mechanics: Post → React → Challenge → Structure appears
1.4. Revenue: consumer subs, token economy, ads, B2B data licensing
1.5. Philosophy: digital third place — not a destination, a place you're already in
1.6. Identity question (OPEN): "The Moderator" or "The Colosseum"
   1.6.1. The Moderator: neutral, authoritative, verb potential ("let's moderate this"), started as teen debate platform
   1.6.2. The Colosseum: aggressive, male-coded, arena energy, targets men 16-65, Fox News/ESPN aesthetic DNA
   1.6.3. Colosseum rebrand expanded audience, shifted to subs + events + real-dollar tipping, spun off education
1.7. Owner: solo founder, no team, no money yet, no deadline

---

# 2. GUIDING PRINCIPLES

2.1. **Temporary functional placeholders** — never block on human action, use "PASTE HERE" markers, app runs with placeholders
2.2. **Slow down, suggest, wait** — Claude presents 2-4 options, owner picks direction
2.3. **Small chunks with downloads** — work in pieces, present file, pause, ask what's next
2.4. **Allowed to fail** — better to attempt and fail than plan forever
2.5. **Verify before claiming done** — when "saved," confirm it's actually there

---

# 3. DECISIONS MADE

3.1. Feb 23: Rebrand to The Colosseum, target male opinion culture 16-65
3.2. Feb 23: Mobile-forward design, phone is default
3.3. Feb 23: Real-dollar tipping replaces token microtransactions (Colosseum model)
3.4. Feb 24: Education removed for moral reasons, separate product later (August 2026)
3.5. Feb 25: State file over handoff doc
3.6. Feb 25: Profile Depth System approved — 12 sections, 157 Qs, mixed rewards, $14.99 reducible to $0.49
3.7. Feb 25: Reward mix: not always money — discounts, badges, icons, cosmetic unlocks, feature unlocks
3.8. Feb 25: Question count ~157 — "painful but not so painful they stop"
3.9. Feb 25: Attack plan locked — 5 phases, 30 items, dependency-ordered
3.10. Feb 25: One honest document replaces all planning files
3.11. Feb 25: No B2B, no education, no bot defense until real users exist
3.12. Feb 25: Async debate mode is survival-critical
3.13. Feb 25: Predictions = core engagement loop
3.14. Feb 25: Follow system moves to free tier
3.15. Feb 25: Supabase chosen for backend
3.16. Feb 26: Kill the tile grid — themed sections with progressive disclosure
3.17. Feb 26: Banner presentation per section — championship banners with animation
3.18. Feb 26: Casual tier is king — protected lobbies, non-negotiable
3.19. Feb 26: Spectators are the primary user — design for the 90%
3.20. Feb 26: Emergence engine philosophy
3.21. Feb 26: Reciprocal gating for data collection
3.22. Feb 26: 30-second ad slots between rounds
3.23. Feb 26: 10 project areas defined
3.24. Feb 26: V2 rebuilds from scratch, foundation-first
3.25. Feb 26: Castle Ring Architecture
3.26. Feb 26: Temporary functional placeholders — never block on human action
3.27. Feb 26: All JS modules use window.X global pattern (survives load failures)
3.28. Feb 26: Session 3 rebuilt all 7 missing JS modules + 3 HTML pages + schema
3.29. Feb 26: Session 4 — clean deployment package assembled, 22 files, all duplicates resolved, DEPLOYMENT-GUIDE rewritten with accurate line numbers
3.30. Feb 27: Session 5 — bug sweep + feature pass. Fixed cross-module function mismatches (login→auth, settings→auth, index→auth). Built Stripe Edge Functions, spectator mode, predictions UI, matchmaking timer, activity bar, post-debate survey. Added login rate limiting, email verification handler, username validation, minor payment restrictions, continue-where-you-left-off. File count 22→24.
3.31. Feb 27: Session 8 — APP IS LIVE. Deployed to Vercel (colosseum-six.vercel.app). Auth working end-to-end (signup → email verify → auto-login). Stripe sandbox created with 7 products. All keys/IDs pasted into config and committed. Remaining: Stripe Edge Functions + webhooks for real payment processing.
3.32. Feb 27: Session 9 — Password reset flow fixed. Was broken: clicked reset link → flashed message → dumped back to login with no password form. Fix: added "Set New Password" modal to colosseum-login.html, added updatePassword() to colosseum-auth.js, added PASSWORD_RECOVERY event handler. Discovered Supabase free tier limits reset emails to 2/hour — custom SMTP (Resend) needed.
3.33. Feb 27: Session 10 — Bug fixes + Stripe fully wired + Resend SMTP. Fixed 4 bugs: auth race condition in index.html (async session check vs timeout guard), payments fetching placeholder URL (crash on buy/subscribe), login page operator precedence (email confirm redirect), settings double updateProfile with invalid columns. Deployed Stripe Edge Functions via Supabase CLI (create-checkout-session + stripe-webhook). Set Stripe secret key + webhook signing secret as Supabase secrets. Stripe webhook listening for 4 events. Resend SMTP configured — email rate limit removed. Node.js installed on dev machine. colosseum-config.js updated with real Stripe function URL. Only remaining PASTE: Deepgram API key.

## 3.30. OPEN DECISIONS

3.30.1. Identity: The Moderator or The Colosseum?
3.30.2. Subscription price: $9.99 or $14.99 or tiered ($9.99/$19.99/$29.99)?
3.30.3. Minors policy: full app with restrictions or separate gated experience?
3.30.4. ✅ Deployment: Vercel live at colosseum-six.vercel.app, Supabase project faomczmipsccwbhpivmp
3.30.5. Launch date: what's real?

---

# 4. THREE CORE PROBLEMS

4.1. **Money pipe connected (Session 10)** — Stripe Checkout live (sandbox), Edge Functions deployed, webhooks receiving 4 event types. Token purchases + subscriptions flow through. Still sandbox mode — switch to live when ready for real money.
4.2. **Single-player pretending to be multiplayer** — no follows, friends, teams, DMs, notifications, share links
4.3. **Sitting on a data business without collecting data** — B2B needs real accounts + profile depth + recordings, none exist

---

# 5. ARCHITECTURE — CASTLE RING MODEL

5.1. Ring 6 — Public Surface (designed to fall)
   5.1.1. Landing page, public debate listings, public leaderboard, public profiles, ToS
   5.1.2. Cloudflare CDN protection
5.2. Ring 5 — User Interaction (contained damage)
   5.2.1. Live debates (WebRTC audio), spectator chat, voting, predictions, Hot Takes feed, reactions
5.3. Ring 4 — Accounts & Trust (identity layer)
   5.3.1. Authentication, profiles, trust scores, cosmetics, achievements, settings
   5.3.2. Supabase auth + RLS policies
5.4. Ring 3 — Platform Data (integrity layer)
   5.4.1. Debate recordings, transcripts, Elo calculations, vote tallies, confidence scores
   5.4.2. Server-side only — never trust the client
5.5. Ring 2 — Financial Core (money layer)
   5.5.1. Stripe payments, subscription management, token ledger, transaction history
   5.5.2. Webhook-driven, no client-side financial logic
5.6. Ring 1 — B2B Intelligence
   5.6.1. Aggregated sentiment, argument trends, demographic cross-tabs, confidence scoring
   5.6.2. API-gated, rate-limited, watermarked
5.7. The Keep — Physical Gate
   5.7.1. Air-gapped backups — human plugs in USB nightly
   5.7.2. Script runs diff, flags anomalies, human reviews and approves
   5.7.3. YubiKey gates all B2B exports — no data leaves without physical key + human approval
5.8. Build order: Keep → Ring 2 → Ring 4 → Ring 3 → Ring 5 → Ring 6 → Ring 1

---

# 6. WHAT ACTUALLY EXISTS

## 6.1. V1 App (reference, not the path forward)

6.1.1. `the-moderator_2_1.html` — 2,933 lines, ~265KB, vanilla JS, localStorage
6.1.2. `the-moderator_2_2.html` — updated variant (~242KB)
6.1.3. `server.js` + `package.json` — WebRTC signaling + Deepgram proxy (not deployed)
6.1.4. `terms-of-service.html` — 19 sections

### 6.1.5. What V1 has that works:
6.1.5.1. 11 debate templates, 5 categories
6.1.5.2. 3 formats: Standard/Timed, Crossfire, Q&A Prep
6.1.5.3. 2-minute rounds, 30-second breaks
6.1.5.4. Real-time audio via WebRTC, speaker indicators, waveform visualizers
6.1.5.5. Elo rating, win/loss, XP/leveling, achievements, streaks
6.1.5.6. Waiting pool matchmaking
6.1.5.7. Spectator chat with emoji reactions
6.1.5.8. Report queue, mod dashboard (ban, mute, warn, dismiss)
6.1.5.9. Fight animation (DBZ/knight vs dragon), procedural audio
6.1.5.10. 5-step onboarding (name, avatar, interests, school)
6.1.5.11. 4 token packages in UI — all fake money
6.1.5.12. 10 cosmetics (3 borders, 4 badges, 3 effects)
6.1.5.13. Predictions system, fantasy picks
6.1.5.14. Client-side security: XSS, flood protection, fingerprinting, input validation

### 6.1.6. What V1 does NOT have:
6.1.6.1. Real authentication
6.1.6.2. Real payments
6.1.6.3. Any server-side validation
6.1.6.4. Any database
6.1.6.5. Social features
6.1.6.6. Debate recordings or transcripts
6.1.6.7. Settings page
6.1.6.8. Age verification
6.1.6.9. Any deployment

## 6.2. V2 Code — Session 1 Build (Feb 26)

### 6.2.1. Ring 2 — Payments (placeholder mode, BUILT)
6.2.1.1. ✅ `colosseum-payments.js` — Stripe Checkout client, token purchases, sub upgrades, placeholder modals
6.2.1.2. ✅ `colosseum-stripe-functions.js` — Edge Function code for checkout sessions + webhooks (deploy instructions inside)

### 6.2.2. Ring 4 — Auth, Profiles, Trust, Cosmetics, Achievements (BUILT)
6.2.2.1. ✅ `colosseum-schema-production.sql` — 18 tables, RLS, triggers, 45 cosmetics seeded, 25 achievements seeded, indexes. Paste into Supabase SQL Editor.
6.2.2.2. ✅ `colosseum-auth.js` — Supabase auth: signup, login, logout, OAuth (Google/Apple), profile CRUD, follows, password reset, account deletion, session management. Placeholder mode when no credentials.
6.2.2.3. ✅ `colosseum-login.html` — Login/signup UI with age gate, ToS acceptance, OAuth buttons, password reset. Colosseum aesthetic.
6.2.2.4. ✅ `colosseum-settings.html` — Full settings page: notifications, privacy, audio, subscription management, logout, delete account.
6.2.2.5. ✅ `colosseum-config.js` — Central config with all PASTE HERE markers. Every credential in one file. Feature flags for gradual rollout.
6.2.2.6. ✅ `colosseum-profile-depth.html` — 12 sections, 147 questions, discount waterfall ($14.99→$0.49), cosmetic rewards, saves to Supabase + localStorage fallback.

### 6.2.3. Deployment (BUILT)
6.2.3.1. ✅ `vercel.json` — Vercel config with routes, security headers, caching
6.2.3.2. ✅ `DEPLOYMENT-GUIDE.md` — Step-by-step paste instructions for Supabase, Stripe, Vercel

### 6.2.6. Session 2 Build (Feb 26)
6.2.6.1. ✅ `index.html` — Main app shell, loads all V2 modules, bottom nav, screens, ticker, auth-gated
6.2.6.2. ✅ `colosseum-notifications.js` — Notification center, slide-down panel, filters, mark read, 30s polling
6.2.6.3. ✅ `colosseum-paywall.js` — 4 contextual paywall variants, gate() helper, dismissible
6.2.6.4. ✅ `colosseum-async.js` — Hot takes feed, post composer, reactions, BET. challenge, async debate threads
6.2.6.5. ✅ `colosseum-share.js` — Share results/profiles, invite/referral, challenge links, deep links, post-debate prompt
6.2.6.6. ✅ `colosseum-leaderboard.js` — ELO/Wins/Streak tabs, time filters, My Rank card, Supabase-ready

### 6.2.7. Session 3 Build (Feb 26) — Files Actually Created & Delivered
6.2.7.1. ✅ `colosseum-config.js` — REBUILT. window.ColosseumConfig global, 8 PASTE HERE markers, feature flags, tier/token/debate constants, placeholder detection
6.2.7.2. ✅ `colosseum-auth.js` — REBUILT. window.ColosseumAuth global, Supabase auth with defensive CDN check, placeholder mode fallback, full profile CRUD, follows, session management
6.2.7.3. ✅ `colosseum-payments.js` — REBUILT. window.ColosseumPayments global, Stripe Checkout, placeholder modals when Stripe not connected
6.2.7.4. ✅ `colosseum-notifications.js` — REBUILT. window.ColosseumNotifications global, slide-down panel, filters, mark read, 30s polling, placeholder demo data
6.2.7.5. ✅ `colosseum-paywall.js` — REBUILT. window.ColosseumPaywall global, 4 variants, gate() helper, bottom sheet on mobile, dismissible
6.2.7.6. ✅ `colosseum-async.js` — REBUILT. window.ColosseumAsync global, hot takes feed, reactions, BET. challenge modal, post composer, placeholder data
6.2.7.7. ✅ `colosseum-share.js` — REBUILT. window.ColosseumShare global, Web Share API + clipboard fallback, share result/profile/take, invite, challenge link, post-debate prompt, deep link handler
6.2.7.8. ✅ `colosseum-leaderboard.js` — REBUILT. window.ColosseumLeaderboard global, ELO/Wins/Streak tabs, time filters, My Rank card, placeholder data
6.2.7.9. ✅ `colosseum-login.html` — REBUILT. Login/signup tabs, age gate (13+), OAuth Google/Apple, password reset, ToS checkbox, placeholder banner
6.2.7.10. ✅ `colosseum-settings.html` — REBUILT. Notification/privacy/audio toggles, account fields, tier display, logout, delete with confirm modal, localStorage + Supabase save
6.2.7.11. ✅ `colosseum-profile-depth.html` — REBUILT. 12 sections, ~60 representative questions, discount waterfall $14.99→$0.49, progress rings per section, reward toasts, chip/slider/select/input types
6.2.7.12. ✅ `colosseum-schema-production.sql` — REBUILT. 18 tables, RLS on all, 4 triggers (auto-profile, reaction counts, follower notification, updated_at), 45 cosmetics seeded, 25 achievements seeded, performance indexes

### 6.2.8. Session 3 Notes
6.2.8.1. All JS modules use `window.X = (() => {})()` pattern — survives load failures, always on global scope
6.2.8.2. All modules have placeholder mode — app runs without any credentials
6.2.8.3. Auth module has defensive Supabase CDN check — won't crash if CDN fails to load
6.2.8.4. index.html loads: config → auth → payments → notifications → paywall → async → share → leaderboard → scoring → webrtc → home → arena. All 7 missing modules now exist.
6.2.8.5. Schema must be pasted into Supabase BEFORE Ring 3 functions (colosseum-ring3-functions.sql)

### 6.2.9. Session 4 Build (Feb 26) — Clean Package Assembly
6.2.9.1. ✅ Assembled clean deployment folder — 22 files, all M-suffixes and __1_/__2_ duplicates resolved to clean names matching what index.html expects
6.2.9.2. ✅ `colosseum-login.html` — CREATED. Login/signup tabs, age gate (13+), DOB selects, OAuth Google/Apple, password reset modal, ToS checkbox, placeholder mode
6.2.9.3. ✅ `colosseum-settings.html` — CREATED. Notification/privacy/audio toggles, account fields, tier badge, logout, delete with confirm modal, localStorage + Supabase save
6.2.9.4. ✅ `colosseum-profile-depth.html` — CREATED. 12 sections, ~40 questions, discount waterfall $14.99→$0.49, progress rings, chip/slider/select/input types, reward toasts, reciprocal gating
6.2.9.5. ✅ `DEPLOYMENT-GUIDE.md` — REWRITTEN. Accurate line numbers for all 8 PASTE HERE markers, correct 22-file list, quick reference table
6.2.9.6. ✅ `colosseum-ring3-functions.sql` — renamed from M suffix
6.2.9.7. ✅ All files verified serving 200 on local server

### 6.2.10. Session 4 Notes
6.2.10.1. Old duplicates still in project folder — safe to delete: any file with M suffix or __1_/__2_ suffix
6.2.10.2. Only 4 PASTE markers needed to get app running: Supabase URL (line 13), Supabase anon key (line 14), Stripe publishable key (line 19), deployed URL (line 58)
6.2.10.3. Working instructions updated: no "slow down suggest wait" — just build, placeholder, move on

### 6.2.11. Session 5 Build (Feb 27) — Bug Sweep + Feature Pass
6.2.11.1. ✅ `colosseum-stripe-functions.js` — CREATED. Checkout session + webhook Edge Functions for Supabase. Handles subscription creation, token purchases, payment failures. Schema-matched (amount_cents, type columns).
6.2.11.2. ✅ `colosseum-ring3-functions.sql` — UPDATED. Added `credit_tokens()` and `debit_tokens()` server functions. Atomic balance updates with transaction logging. Called by Stripe webhook.
6.2.11.3. ✅ `colosseum-schema-production.sql` — UPDATED. Added `stripe_subscription_id` column to profiles table (was missing, webhook needs it).
6.2.11.4. ✅ `colosseum-login.html` — FIXED. signup() → signUp(), login() → logIn(), loginWithOAuth() → oauthLogin(). Error handling matched to auth module's {success, error} return format. Added username validation (alphanumeric, 3-20 chars). Added login rate limiting (5 attempts → 60s lockout). Added email confirmation redirect handler (#access_token hash).
6.2.11.5. ✅ `colosseum-settings.html` — FIXED. logout() → logOut(), updateSettings() → updateProfile(). Now matches auth module exports.
6.2.11.6. ✅ `index.html` — FIXED. Bare logOut() → ColosseumAuth.logOut(). Added localStorage screen persistence + URL deep links (?screen=arena). File correctly named (was index__2_.html).
6.2.11.7. ✅ `colosseum-config.js` — Correctly named (was colosseum-config__2_.js). No code changes needed.
6.2.11.8. ✅ `colosseum-webrtc.js` — FIXED. COLOSSEUM_CONFIG → ColosseumConfig. ICE_SERVERS now reads from config when available. defaultRounds fixed to 5.
6.2.11.9. ✅ `colosseum-payments.js` — UPDATED. Added _isMinor() gate on subscribe() and buyTokens(). Minors blocked from real-money transactions.
6.2.11.10. ✅ `colosseum-auth.js` — UPDATED. Added emailRedirectTo option to signUp for Supabase email confirmation flow.
6.2.11.11. ✅ `colosseum-arena.js` — UPDATED. Added spectator mode (spectate view with reactions, voting, chat, leave). Added matchmaking timer with elapsed time, rotating tips, 60s async suggestion. Added "Did this change your mind?" post-debate survey. Added cancelMatchmaking and submitSurvey to public API.
6.2.11.12. ✅ `colosseum-home.js` — UPDATED. WATCH LIVE buttons now open spectator mode in arena. Added activity bar (notification summary). Tonight's Card now has PREDICT button opening prediction modal with pick-a-winner + token wager. Added openPrediction and _submitPrediction to public API.
6.2.11.13. ✅ `DEPLOYMENT-GUIDE.md` — REWRITTEN. Accurate 24-file list, correct line numbers, PASTE reference table, storage bucket setup step, Stripe functions deployment, CORS setup.
6.2.11.14. ✅ `vercel.json` — Verified. Clean routes, security headers, microphone permission.

### 6.2.12. Session 5 Notes
6.2.12.1. Critical cross-module bugs were found and fixed — login page function calls didn't match auth module exports. App would have crashed on first signup/login attempt.
6.2.12.2. File count now 24 (added colosseum-stripe-functions.js, DEPLOYMENT-GUIDE.md). All files have clean names matching index.html script tags.
6.2.12.3. Every ColosseumAuth call across all files verified against actual exports.
6.2.12.4. Spectator mode is key — bible says 90% of users are watchers. Now they have a dedicated view with reactions, voting, and chat.
6.2.12.5. Predictions UI built as bottom-sheet modal — works with 10 users, not just 1,000.
6.2.12.6. Voice memo migration SQL needs to be pasted AFTER main schema (added to DEPLOYMENT-GUIDE step order).
6.2.12.7. The deploy zip contains all 24 files ready for Vercel. Download it.

### 6.2.4. Old/Redundant Files (reference only, superseded by above)
6.2.4.1. `auth-server-v2.js` — old Express auth (superseded by colosseum-auth.js + Supabase)
6.2.4.2. `schema-launch.sql` — old standalone Postgres schema (superseded by colosseum-schema-production.sql)
6.2.4.3. `supabase-schema.sql` — old 7-table schema (superseded by colosseum-schema-production.sql with 18 tables)
6.2.4.4. `moderator-auth.js` / `moderator-login.html` — old Moderator-branded auth (superseded)

### 6.2.5. Redundant auth files (multiple sessions built different solutions)
6.2.5.1. `auth-module.js` / `_1` / `_2`
6.2.5.2. `colosseum-login__1_.html`
6.2.5.3. `server-auth.js` / `_1`
6.2.5.4. `schema_phase0.sql`

## 6.3. Design Documents (complete, not wired)

6.3.1. `cosmetics-shop-expanded.json` — 45 items (15 borders, 18 badges, 12 effects)
6.3.2. `subscription-tier-design.json` — Free vs Pro ($9.99/mo)
6.3.3. `token-earning-mechanics.json` — daily challenges, streaks, leaderboard
6.3.4. `paywall-modal-design.json` — 4 contextual variants
6.3.5. `paywall-modal-mockup.html` — visual preview
6.3.6. `profile-depth-system.jsx` — 12 sections, 157 questions, interactive prototype

## 6.4. Bot Defense Scripts (save for later)

6.4.1. `backup_dump.py` — encrypted backups
6.4.2. `restore_and_compare.py` — decrypt and compare
6.4.3. `rollback.py` — rollback to clean state
6.4.4. `rules_engine.py` — 4 behavioral rules
6.4.5. `b2b_export.py` — encrypted export with YubiKey

## 6.5. Supporting Documents

6.5.1. `the-moderator-honest-document.docx` — reality check, solo founder roadmap
6.5.2. `the-moderator-b2b-industry-analysis.md` — 25 buyer industries
6.5.3. `b2b-industry-item-lists.md` — 250 data items mapped
6.5.4. `the-moderator-bot-defense-tiers.md` — 3-tier strategy
6.5.5. `the-moderator-education-deep-dive.md` — education market models
6.5.6. `the-moderator-education-extracted.md` — ~130 lines pulled from V1
6.5.7. `the-moderator-pitch-deck.html` / `.md` — investor pitch (numbers fantasy, ideas real)
6.5.8. `colosseum-ring-architecture__1_.md` — full castle ring architecture

---

# 7. PRODUCT PHILOSOPHY

## 7.1. The Emergence Engine
7.1.1. Not a debate app — a social system where debates emerge
7.1.2. Source: emergent gameplay theory (Juul, Smith, Salen & Zimmerman)
7.1.3. Four mechanics: Post → React → Challenge → Structure appears
7.1.4. You don't go to the app to debate — you're hanging out and a debate happens to you

## 7.2. Third Place Theory
7.2.1. Source: Ray Oldenburg (1989), Discord research
7.2.2. Social space separate from home and work
7.2.3. Neutral ground, conversation is main activity, mood is playful, regulars set tone
7.2.4. The bar, not the arena — default state is the hangout
7.2.5. "Kill the destination mentality" — people are tired of being told where to go
7.2.6. "Presence over sessions" — reward being around, not logging in to do a task
7.2.7. "No cold start" — the app is alive before you got there

## 7.3. Spectators Are the Product
7.3.1. Source: 90-9-1 Rule (Nielsen), updated to ~55-30-15
7.3.2. Design for the 90% who watch, vote, react
7.3.3. Debaters are content, predictors are audience
7.3.4. Predictions work with 10 people online, not just 1,000

## 7.4. Casual Is King
7.4.1. Source: SBMM research (gaming industry)
7.4.2. Most users are casual — "Is Iverson underrated?" energy
7.4.3. Protected lobbies, no sharks in casual waters
7.4.4. Get bodied in a fun argument about pizza = never come back

## 7.5. Structured Spontaneity
7.5.1. Sections/banners = STRUCTURE
7.5.2. Hot takes/reactions = SPONTANEITY
7.5.3. Neither works alone

## 7.6. Engineered Serendipity
7.6.1. Source: Zuckerman, MIT Civic Media Lab
7.6.2. "Pixar bathroom principle" — trip over debates you weren't looking for
7.6.3. Live scores, headlines, trending clips surface passively

## 7.7. Reciprocal Gating — "Make Everything Matter"
7.7.1. Every platform action tied to something user wants
7.7.2. Can't see debate score until you rate moderator
7.7.3. Can't unlock cosmetic until profile section complete
7.7.4. Don't ask nicely — make the rating the key that unlocks what they want

## 7.8. The Liquidity Problem (SURVIVAL CRITICAL)
7.8.1. Live audio needs two people, same time, same topic, opposite sides
7.8.2. At small scale: users open lobby, see nobody, leave
7.8.3. Solutions:
   7.8.3.1. Text async debate — post argument, opponent replies later
   7.8.3.2. Voice memo mode — record take, opponent records theirs later
   7.8.3.3. AI sparring — practice against AI when nobody's online

## 7.9. The Content Funnel
7.9.1. Casual space IS the feed, debate IS the event
7.9.2. Internal path: conversation in app → escalates to debate
7.9.3. External path: conversation elsewhere → "take it to the Moderator" → resolves here
7.9.4. "Bet." button — one-tap challenge from disagreement
7.9.5. Browser extension for challenging from any website
7.9.6. Embeddable link/button for Reddit, Twitter, group chats, Discord
7.9.7. Research note: target group chats/Discord/iMessage, not major platforms (walled garden resistance)

---

# 8. DESIGN DNA

## 8.1. Fox News Elements (from co-browsing session Feb 23)
8.1.1. Navy blue top nav, white text category tabs
8.1.2. Red "BREAKING" / "TRENDING" badges — urgency
8.1.3. Ticker bar: trending left, personalized data (weather, stocks) right
8.1.4. "Watch TV" red CTA button
8.1.5. "ON AIR NOW" promo cards
8.1.6. Chyron-style lower-third overlays — punchy 2-4 word labels
8.1.7. Content hierarchy: lead stories 2-column, sub-stories bulleted beneath
8.1.8. Read time + comment count — engagement social proof
8.1.9. Right rail sidebar (~30% width) — permanent upsell column
8.1.10. 3-column card grid, uniform cards
8.1.11. Branded category names ("KITCHEN CABINET" not "Food")
8.1.12. "Fox News IQ" predictions widget — audience participation baked in
8.1.13. Topics not segregated — one feed — validates "one arena, many categories"
8.1.14. Palette: navy, white, red. Gold absent = Colosseum differentiator

## 8.2. ESPN Elements
8.2.1. Scoreboard ticker with live/final scores
8.2.2. "Tonight's Card" for upcoming matchups
8.2.3. Horizontal swipeable result cards
8.2.4. Tab-based content sections
8.2.5. Stats-heavy profile cards

## 8.3. The Colosseum Aesthetic
8.3.1. Fox chyron energy + ESPN stat cards + gladiator gold
8.3.2. Palette: navy, red, white, GOLD
8.3.3. Mobile-forward: phone default, 44px touch targets, scroll-snap
8.3.4. Desktop 1100px+ gets sidebar
8.3.5. Three versions:
   8.3.5.1. V1 — flat desktop (exists)
   8.3.5.2. V2 — 3D depth (rounded corners, box shadows, beveled)
   8.3.5.3. V3 — mobile-forward (PRIORITY)

## 8.4. Topic Architecture
8.4.1. Tier 1 launch: Politics + Sports
8.4.2. Tier 2 bridge: Entertainment/Tabloids for co-ed pull
8.4.3. Tier 3 depth: Music, Movies/TV, Cars/Culture

## 8.5. Customer Segments (Colosseum)
8.5.1. Lurker (free/ads) — watches, votes
8.5.2. Contender ($9.99) — regular debater
8.5.3. Champion ($19.99) — competitor
8.5.4. Creator ($29.99) — showman, content creator tools

---

# 9. B2B DATA PLAY

## 9.1. What We're Selling
9.1.1. "Structured, real-time opinion intelligence from real people defending positions in transcribed, scored, time-stamped debates"
9.1.2. No one else has this data
9.1.3. Polls ask questions, social media scrapes noise, this platform generates structured conviction data

## 9.2. Who Buys It
9.2.1. 25 industries identified, 250 data items mapped (10 per industry)
9.2.2. Political campaigns, polling firms, media companies, hedge funds, PR firms, ad agencies, brand strategy, legal (jury consultants), think tanks, government, entertainment, sports networks, tech, healthcare, insurance, education research, real estate, retail, pharma, automotive, telecom, energy, nonprofit, financial services, food & beverage

## 9.3. Data to Collect
9.3.1. Tier 1 (most wanted): topic sentiment, winning/losing arguments, demographics, sentiment shift, topic velocity
9.3.2. Requires: real accounts, profile depth, recordings + transcripts, vote timelines, argument segmentation

## 9.4. Data Confidence Scoring
9.4.1. Every data point gets confidence score
9.4.2. Weighted by participant trust, moderator trust, audience composition
9.4.3. New-account-heavy topics get flagged
9.4.4. Clients see confidence scores on everything

## 9.5. Pricing
9.5.1. Tier A startups: $1K/month
9.5.2. Tier B mid-market: $10K/month
9.5.3. Tier C enterprise: $50K+/month

## 9.6. Honest Assessment
9.6.1. Strongest long-term idea
9.6.2. Requires ~80% of roadmap completed first
9.6.3. Build consumer product first, B2B comes when data exists

---

# 10. REVENUE MODEL

## 10.1. Subscriptions (Moderator model)
10.1.1. Free ("Debater"): unlimited debates, 3 formats, 10 tokens/day, light ads
10.1.2. Pro ("Moderator Pro"): $9.99/mo, all cosmetics, teams, 30 tokens/day, ad-free
10.1.3. 7-day trial, no credit card
10.1.4. Annual $99.99/year (17% savings)
10.1.5. Profile Depth discount: $14.99 reducible to $0.49

## 10.2. Subscriptions (Colosseum model)
10.2.1. Lurker: free/ads
10.2.2. Contender: $9.99/mo
10.2.3. Champion: $19.99/mo
10.2.4. Creator: $29.99/mo

## 10.3. Token Economy
10.3.1. 4 packages: $0.99/50, $3.99/250, $7.99/600, $19.99/1800
10.3.2. Earning: daily login (1), challenge (3), first win (2), streaks (2-25), referrals (10), mod work (2)
10.3.3. Anti-abuse: no tokens from losses, 5+ min threshold, no rapid concede farming

## 10.4. Cosmetics Shop
10.4.1. 45 items: 15 borders, 18 badges, 12 effects
10.4.2. Rarity: Common / Rare / Legendary
10.4.3. Planned: limited edition, seasonal, bundles, gifting

## 10.5. Ads
10.5.1. 30-second slots between rounds — natural commercial breaks
10.5.2. Light banners on free tier
10.5.3. Featured Debate sponsored placement
10.5.4. Promoted Topics — orgs pay to surface topics

## 10.6. Events (Colosseum)
10.6.1. Tournaments with entry fees and prize pools
10.6.2. Premium rooms
10.6.3. PPV events
10.6.4. Real-dollar tipping during debates

## 10.7. Honest Projections
10.7.1. Solo founder realistic: $15K-72K Year 1 ARR
10.7.2. Colosseum conservative: $183K Year 1
10.7.3. Old pitch deck: $22M Year 1 (acknowledged fantasy)

---

# 11. EDUCATION (SEPARATE PRODUCT)

11.1. Decision: removed from main app for moral/liability reasons
11.2. Becomes "Colosseum Education" — target August 2026
11.3. Target: charter schools, homeschool co-ops
11.4. Extracted: ~130 lines of functions, EDU_TOPICS, 7 conditionals, 3 CSS classes
11.5. Compliance required:
   11.5.1. COPPA (under-13)
   11.5.2. FERPA (school data)
   11.5.3. Parental consent flow
   11.5.4. Data handling policies for minors
11.6. Revenue: $8/student/month, school licenses $3K-100K/year

---

# 12. HONEST ASSESSMENT

12.1. Financial projections were fantasy math ($22M Year 1 with no users)
12.2. Phase 1 marked COMPLETE but Stripe wasn't connected
12.3. Phase 0 designed but never integrated
12.4. Bot defense built before having users to defend
12.5. B2B pitch sells data that doesn't exist
12.6. Document sprawl creates illusion of progress (70+ files, plans about plans)
12.7. The pattern: StreamToStage → Expressions Network → Moderator/Colosseum — planning replaces building, building replaces shipping
12.8. Core message: auth + Stripe + deploy + 10 real humans using it

---

# 13. RESEARCH FOUNDATIONS

13.1. Third Place Theory (Oldenburg 1989)
13.2. Progressive Disclosure (Nielsen Norman Group) — 7-9 options max
13.3. 90-9-1 Rule (Nielsen) — spectators are primary, updated to ~55-30-15
13.4. Choice Overload / Jam Study (Iyengar) — 6 flavors 30% bought, 24 flavors 3%
13.5. Emergent Gameplay (Juul, Smith, Salen & Zimmerman)
13.6. Participatory Culture (Henry Jenkins, MIT) — watching IS participating
13.7. Engineered Serendipity (Zuckerman, MIT Civic Media Lab)
13.8. SBMM Research (gaming industry) — casual protection non-negotiable
13.9. Short-form Clips — possibly single biggest growth lever
13.10. App Fatigue (CleverTap, Fast Company) — 65% don't download apps in 3 months
13.11. Ambient Engagement (PLOS Digital Health) — embed where people already are

## 13.12. Build Priority from Research
13.12.1. 🟢 First: Hot Takes feed, spectator tools, casual protection, debate clips, section layout
13.12.2. 🟡 Second: banner animations, "Bet." button, trending with quality signals, embed/share links
13.12.3. 🔴 Later: community captains, curated front page

---

# 14. COMPLETE INVENTORY (502 items)

## 14.1. AREA 1: DEFENSE (62 items)

### 14.1.1. Client-Side Security (in V1)
14.1.1.1. ✅ XSS sanitization
14.1.1.2. ✅ Chat flood protection (5/10sec)
14.1.1.3. ✅ Ban evasion detection (fingerprinting)
14.1.1.4. ✅ New account cooldown (15min)
14.1.1.5. ✅ Mod privilege gating
14.1.1.6. ✅ Console wallet/elo protection
14.1.1.7. ✅ Input validation
14.1.1.8. ✅ Content blocklist
14.1.1.9. ✅ State protection (Object.freeze)
14.1.1.10. ✅ Report rate limiting
14.1.1.11. ✅ Prediction state freezing

### 14.1.2. Server-Side Security (not built)
14.1.2.1. ❌🔴 Server-side vote recording
14.1.2.2. ❌🔴 Server-side Elo calculation
14.1.2.3. ❌🔴 Server-side fingerprint storage
14.1.2.4. ❌🟡 Move all security server-side
14.1.2.5. ❌🟡 IP reputation checking
14.1.2.6. ❌🟢 Cloudflare CDN

### 14.1.3. Bot Defense Tier 1 — "Don't Get Embarrassed"
14.1.3.1. 📐 Browser fingerprinting (canvas, WebGL, audio context)
14.1.3.2. 📐 Headless browser detection
14.1.3.3. 📐 Device → account binding
14.1.3.4. 📐 Registration rate limiting
14.1.3.5. 💡 Audio verification (repeat random phrase)
14.1.3.6. 💡 Audio fingerprinting (voiceprint hash)
14.1.3.7. 💡 Minimum audio quality gate
14.1.3.8. 💡 Basic behavioral scoring
14.1.3.9. 💡 New accounts can't vote for 24hrs
14.1.3.10. 💡 Must complete 1 debate before votes count in B2B
14.1.3.11. 💡 Flag vote-only accounts (passive manipulation)

### 14.1.4. Bot Defense Tier 2 — "Real Money Flowing"
14.1.4.1. 💡 Advanced voice auth / deepfake detection
14.1.4.2. 💡 Real-time voice consistency checks
14.1.4.3. 💡 Liveness detection (random mid-debate prompts)
14.1.4.4. 💡 Coordinated behavior detection (graph analysis)
14.1.4.5. 💡 Account creation clustering
14.1.4.6. 💡 Topic heat anomaly (astroturfing)
14.1.4.7. 💡 Temporal pattern analysis
14.1.4.8. 💡🟡 Data confidence scoring
14.1.4.9. 💡 Graduated trust system
14.1.4.10. 💡 Honeypot debates
14.1.4.11. 💡 API/data access control
14.1.4.12. 💡 Scraping detection

### 14.1.5. Bot Defense Tier 3 — "Sell to Hedge Funds"
14.1.5.1. 💡⚪ AI voice arms race
14.1.5.2. 💡⚪ Deepfake vendor partnership
14.1.5.3. 💡⚪ Multi-modal liveness
14.1.5.4. 💡⚪ Network threat intelligence
14.1.5.5. 💡⚪ Geolocation verification
14.1.5.6. 💡⚪ Red team / pen testing
14.1.5.7. 💡⚪ Bug bounty
14.1.5.8. 💡⚪ Cryptographic data provenance
14.1.5.9. 💡⚪ ML anomaly detection
14.1.5.10. 💡⚪ KYC identity verification
14.1.5.11. 💡⚪ SOC 2 Type II
14.1.5.12. 💡⚪ Transparency reports

### 14.1.6. Vote Bombing Protection
14.1.6.1. 💡 Vote weight by trust score
14.1.6.2. 💡 Cluster voting flagging
14.1.6.3. 💡 Vote timestamp analysis
14.1.6.4. 💡 Honeypot debates

### 14.1.7. Air-Gapped Backup System (code exists, no DB)
14.1.7.1. 📐 backup_dump.py
14.1.7.2. 📐 restore_and_compare.py
14.1.7.3. 📐 rollback.py
14.1.7.4. 📐 YubiKey auth (string-length, not real hardware)
14.1.7.5. 📐 rules_engine.py
14.1.7.6. 📐 b2b_export.py

---

## 14.2. AREA 2: MONEY (47 items)

### 14.2.1. Payment Processing
14.2.1.1. ✅ Stripe integration for web (colosseum-payments.js + colosseum-stripe-functions.js)
14.2.1.2. ✅ Connect to existing token purchase UI (placeholder modals when Stripe not connected)
14.2.1.3. ✅ Transaction receipts and history (payments table + token_transactions table in schema)
14.2.1.4. 💡 Apple IAP
14.2.1.5. 💡 Google Play Billing

### 14.2.2. Subscription Tiers (Moderator)
14.2.2.1. 📐🔴 Free ("Debater")
14.2.2.2. 📐🔴 Pro ("Moderator Pro") $9.99/mo
14.2.2.3. 📐 7-day trial, no card
14.2.2.4. 📐 Annual $99.99
14.2.2.5. 💡 Profile Depth discount
14.2.2.6. 💡 Family/group pricing

### 14.2.3. Colosseum Tiers
14.2.3.1. ✅ Lurker (free/ads) — in schema + config
14.2.3.2. ✅ Contender ($9.99) — in schema + payments + config PASTE HERE
14.2.3.3. ✅ Champion ($19.99) — in schema + payments + config PASTE HERE
14.2.3.4. ✅ Creator ($29.99) — in schema + payments + config PASTE HERE
14.2.3.5. 💡 Real-dollar tipping
14.2.3.6. 💡 Events revenue

### 14.2.4. Token Economy
14.2.4.1. ✅ 4 packages in UI (fake money)
14.2.4.2. 📐 Earning mechanics designed
14.2.4.3. 📐 Free ~10 tokens/day, Pro ~30/day
14.2.4.4. 📐 Weekly leaderboard rewards
14.2.4.5. 📐 Referral cap 50/month
14.2.4.6. 📐 Anti-abuse rules

### 14.2.5. Cosmetics Shop
14.2.5.1. ✅ 10 original cosmetics
14.2.5.2. 📐 Expanded to 45
14.2.5.3. 📐 Rarity tiers
14.2.5.4. 💡 Limited edition / seasonal
14.2.5.5. 💡 Bundles
14.2.5.6. 💡 Item preview
14.2.5.7. 💡 "My Inventory" / equip screen
14.2.5.8. 💡 Gifting
14.2.5.9. 💡 Pro-only exclusives

### 14.2.6. Paywalls
14.2.6.1. ✅ 4 variants (general, shop, social, leaderboard) — colosseum-paywall.js
14.2.6.2. ✅ Non-aggressive, dismissible
14.2.6.3. ✅ Trigger matches user intent — gate() helper
14.2.6.4. 📐 Target 8-12% conversion

### 14.2.7. Ad Revenue
14.2.7.1. 💡 30-sec slots between rounds
14.2.7.2. 💡 Banner ads free tier
14.2.7.3. 💡 Featured Debate sponsored placement
14.2.7.4. 💡 Promoted Topics

### 14.2.8. Reciprocal Gating
14.2.8.1. 💡 Can't see scores until you rate moderator
14.2.8.2. 💡 Every action tied to user reward
14.2.8.3. 💡 Gate rewards behind platform needs

---

## 14.3. AREA 3: USER INTERACTION (80 items)

### 14.3.1. Debate Formats
14.3.1.1. ✅ Standard/Timed
14.3.1.2. ✅ Crossfire
14.3.1.3. ✅ Q&A Prep
14.3.1.4. ✅ 2-min rounds, 30-sec breaks
14.3.1.5. 💡 Long-form debates
14.3.1.6. 💡 Tournament format
14.3.1.7. 💡 Custom room creation (Pro)

### 14.3.2. Debate Experience
14.3.2.1. ✅ WebRTC audio
14.3.2.2. ✅ Timer and round counter
14.3.2.3. ✅ Speaker indicator / waveforms
14.3.2.4. ✅ Mic controls
14.3.2.5. ✅ Fight animation
14.3.2.6. ✅ Procedural audio
14.3.2.7. ❌🟡 Text chat between debaters
14.3.2.8. 💡 Request time extension
14.3.2.9. 💡 "Call for evidence" pause
14.3.2.10. 💡 AI fact-check overlay
14.3.2.11. 💡 Recording indicator
14.3.2.12. 💡 Concede button (exists, not clean UX)
14.3.2.13. 💡 Pause for tech issues
14.3.2.14. 💡 Report mid-debate
14.3.2.15. 💡 Power-ups (extra 30sec for tokens — controversial)

### 14.3.3. Async Debate (SURVIVAL CRITICAL)
14.3.3.1. ✅ Text async — post argument, opponent replies later (colosseum-async.js)
14.3.3.2. ✅ Voice memo — record take, opponent records later (colosseum-voicememo.js, 809 lines, bottom sheet recorder, waveform, playback, upload to Supabase Storage)
14.3.3.3. 💡🟡 AI sparring — practice when nobody's online
14.3.3.4. ✅ Solves empty lobby problem — hot takes + challenge + async thread BUILT

### 14.3.4. Scoring & Rankings
14.3.4.1. ✅ Elo rating
14.3.4.2. ✅ Win/loss tracking
14.3.4.3. ✅ XP / leveling
14.3.4.4. ✅ Achievements
14.3.4.5. ✅ Streak tracking
14.3.4.6. ❌🟡 Moderator scoring formula
14.3.4.7. 💡 Debate quality rating
14.3.4.8. 💡 "Did this change your mind?"

### 14.3.5. Matchmaking & Lobby
14.3.5.1. ✅ Waiting pool
14.3.5.2. ✅ Accept match
14.3.5.3. ❌🟡 Elo range filter
14.3.5.4. ❌🟡 Topic preference
14.3.5.5. ✅ Estimated wait time (matchmaking timer built Session 5 — elapsed time, tips, 60s async suggestion)
14.3.5.6. ❌ Rematch option
14.3.5.7. 💡 Priority matchmaking (tokens)
14.3.5.8. 💡 Choose opponent (tokens)
14.3.5.9. 💡 Private room (tokens)
14.3.5.10. 💡 Scouting report (tokens)

### 14.3.6. Predictions / Wagering
14.3.6.1. ✅ Predictions system
14.3.6.2. ✅ Fantasy picks
14.3.6.3. 💡 Prediction streaks / leaderboard
14.3.6.4. 💡 "Who called it" social proof
14.3.6.5. 💡 Predictions as core engagement (works with 10 users)
14.3.6.6. 💡 Spectators = audience, debaters = content
14.3.6.7. 💡 Spectator brackets
14.3.6.8. 💡 Debate-to-reality correlation

### 14.3.7. Spectator Experience
14.3.7.1. ✅ Spectator chat (text + emoji)
14.3.7.2. 💡 Super chat (pin for tokens)
14.3.7.3. 💡 Reaction bombs (screen-wide for tokens)
14.3.7.4. 💡 Tip debater (tokens)
14.3.7.5. 💡 Emote/reaction system
14.3.7.6. 💡 Cheer mechanic
14.3.7.7. 💡 Follow from spectator view
14.3.7.8. 💡 Clip/share button

### 14.3.8. Post-Debate
14.3.8.1. ✅ "Change your mind?" survey (built Session 5 in colosseum-arena.js)
14.3.8.2. 💡 Expert annotation (AI breakdown for tokens)
14.3.8.3. 💡 Full transcript download (free=summary, premium=full)
14.3.8.4. 💡 Shareable highlight (free=watermark, premium=clean)
14.3.8.5. 💡 Rematch (tokens)
14.3.8.6. 💡 Bookmark/save debates

### 14.3.9. Moderation System
14.3.9.1. ✅ Report queue / mod dashboard
14.3.9.2. ✅ Mod actions (ban, mute, warn, dismiss)
14.3.9.3. ✅ "Judge Dredd" / "Jury Duty" achievements
14.3.9.4. ✅ "Book a Moderator" (75 tokens)
14.3.9.5. ❌ No real mod application process
14.3.9.6. ❌ No temp bans
14.3.9.7. ❌ No evidence preview
14.3.9.8. ❌ No mod performance tracking
14.3.9.9. 💡 Moderator tiers (Junior → Senior → Lead)
14.3.9.10. 💡 Certification flow
14.3.9.11. 💡 Revenue share from bookings
14.3.9.12. 💡 Code of conduct
14.3.9.13. 💡 Audit log visible to other mods

---

## 14.4. AREA 4: IDENTITY & ACCOUNTS (62 items)

### 14.4.1. Authentication
14.4.1.1. ✅ Real email/password auth (colosseum-auth.js)
14.4.1.2. ✅ Login/signup UI (colosseum-login.html)
14.4.1.3. ✅ Password hashing (Supabase handles bcrypt)
14.4.1.4. ✅ JWT sessions (Supabase handles 15m access + 7d refresh)
14.4.1.5. 📐 auth-module.js (old, superseded by colosseum-auth.js)
14.4.1.6. 📐 auth-server.js (old, superseded by Supabase)
14.4.1.7. 📐 schema_phase0.sql (old, superseded by colosseum-schema-production.sql)
14.4.1.8. ✅ Email verification — working (Session 8)
14.4.1.9. ✅ Password reset (colosseum-auth.js → resetPassword() + updatePassword()) — fixed Session 9, modal form added to login page
14.4.1.10. ✅ Account recovery / deletion (colosseum-auth.js → deleteAccount())
14.4.1.11. ❌ Cross-device session sync
14.4.1.12. ✅ Google OAuth (wired, needs enabling in Supabase → Auth → Providers)
14.4.1.13. ✅ Apple OAuth (wired, needs enabling in Supabase → Auth → Providers)
14.4.1.14. 💡 Phone verification
14.4.1.15. 💡 2FA/MFA
14.4.1.16. ✅ Rate limiting on login (built Session 5 — 5 attempts → 60s lockout)

### 14.4.2. Onboarding
14.4.2.1. ✅ 5-step creator flow
14.4.2.2. ✅ Welcome XP bonus
14.4.2.3. ✅ Intro animation
14.4.2.4. ✅ Real account creation (colosseum-login.html + colosseum-auth.js)
14.4.2.5. ✅ ToS shown during signup (colosseum-login.html checkbox)

### 14.4.3. Age Verification
14.4.3.1. ✅ Age gate (DOB field in colosseum-login.html)
14.4.3.2. ✅ Under-18 flag (is_minor in profiles table)
14.4.3.3. ❌ Parental consent flow
14.4.3.4. ✅ Restricted features for minors (built Session 5 — blocked from subscribe/buyTokens in colosseum-payments.js)

### 14.4.4. Profile System
14.4.4.1. ✅ Basic profile (name, avatar, bio)
14.4.4.2. ✅ User stats (Elo, wins, losses)
14.4.4.3. ✅ Achievement showcase
14.4.4.4. ✅ Cosmetics display
14.4.4.5. ✅ Profile Depth System (12 sections, 147 Qs) — colosseum-profile-depth.html
14.4.4.6. ✅ Mixed rewards (discounts, badges, icons, features)
14.4.4.7. ✅ Visual discount waterfall ($14.99 → $0.49)
14.4.4.8. 📐 Age-gated restricted version
14.4.4.9. 📐 B2B data pipeline from answers

### 14.4.4.10. Profile Depth Sections (all 📐)
14.4.4.10.1. The Basics (8 Qs) — demographics, reward: $2 off/mo
14.4.4.10.2. Who You Are (12 Qs) — cross-tab, reward: Profile Border Pack
14.4.4.10.3. Debate DNA (14 Qs) — argument taxonomy, reward: Debate DNA Badge
14.4.4.10.4. Hot Takes (20 Qs) — sentiment on 20 topics, reward: $2.50 off/mo
14.4.4.10.5. Your Media Diet (12 Qs) — news/media, reward: Custom Profile Theme
14.4.4.10.6. Money & Work (15 Qs) — purchasing power, reward: $2 off/mo
14.4.4.10.7. Values & Beliefs (14 Qs) — political/moral compass, reward: Values Badge
14.4.4.10.8. Lifestyle (12 Qs) — consumer behavior, reward: Lifestyle Badge
14.4.4.10.9. Tech & Digital (10 Qs) — digital behavior, reward: Tech Theme
14.4.4.10.10. Sports & Competition (12 Qs) — sports fandom, reward: Team Crest
14.4.4.10.11. Debate History (8 Qs) — experience, reward: Veteran Badge
14.4.4.10.12. Future & Predictions (10 Qs) — forward-looking, reward: $1.50 off/mo

### 14.4.5. Settings
14.4.5.1. ✅ Settings page (colosseum-settings.html)
14.4.5.2. ✅ Notification preferences
14.4.5.3. ✅ Privacy controls
14.4.5.4. ✅ Audio/mic persistence
14.4.5.5. ✅ Account management (name, avatar, email, password)
14.4.5.6. ✅ Delete account (required for app stores, GDPR)

### 14.4.6. Database
14.4.6.1. 📐🔴 Supabase project — human must create at supabase.com (PASTE HERE credentials into colosseum-config.js)
14.4.6.2. ✅ Schema — colosseum-schema-production.sql (18 tables, paste into SQL Editor)
14.4.6.3. ✅ Tables: profiles, user_settings, profile_depth_answers, cosmetics, user_cosmetics, achievements, user_achievements, follows, notifications, debates, debate_votes, predictions, reports, token_transactions, payments, async_debates, hot_takes, hot_take_reactions

---

## 14.5. AREA 5: SOCIAL (31 items)

### 14.5.1. Follow / Friend System
14.5.1.1. ✅ Follow any user (colosseum-auth.js → followUser/unfollowUser)
14.5.1.2. ✅ Follower / following counts (getFollowers/getFollowing in auth module)
14.5.1.3. ❌ Activity feed ("people you follow" recent debates)
14.5.1.4. 💡 "Friend's debate starting" alerts
14.5.1.5. 💡🔴 Follow system MUST be free tier

### 14.5.2. Notifications
14.5.2.1. ✅ In-app notification center (colosseum-notifications.js)
14.5.2.2. ❌ Push notifications
14.5.2.3. ❌ Email notifications
14.5.2.4. ❌ Triggers: debate starts, challenged, ranked up, report resolved, topic follow
14.5.2.5. ✅ Notification system designed (bell, slide-down, filters, toasts) — BUILT

### 14.5.3. Share / Invite / Viral Loop
14.5.3.1. ✅ Share debate result card to social media (colosseum-share.js)
14.5.3.2. ✅ Share profile link
14.5.3.3. ✅ Invite friend with referral token
14.5.3.4. ✅ Deep links (open to debate or profile)
14.5.3.5. ✅ "Challenge a friend" invite link
14.5.3.6. ✅ Every debate ends with share prompt — showPostDebatePrompt()

### 14.5.4. Chat / DMs
14.5.4.1. ❌ Private messaging
14.5.4.2. ❌ Pre-debate coordination
14.5.4.3. ❌ Post-debate conversation
14.5.4.4. ❌ Rate-limited, content-filtered
14.5.4.5. ❌ Block user

### 14.5.5. Search & Discovery
14.5.5.1. ❌ Search users
14.5.5.2. ❌ Search topics/debates
14.5.5.3. ❌ Search by school
14.5.5.4. ❌ Filters (format, Elo, live/completed)

### 14.5.6. Teams / Squads
14.5.6.1. ❌ Create team (name, school, roster)
14.5.6.2. ❌ Team admin (coach/captain)
14.5.6.3. ❌ Team leaderboard/stats
14.5.6.4. ❌ Team cosmetics/badges
14.5.6.5. ❌ Team debate history
14.5.6.6. 💡 School-vs-school tournaments

---

## 14.6. AREA 6: EXPERIENCE DESIGN (50 items)

### 14.6.1. Layout & Navigation
14.6.1.1. ✅ Single-page app with go() navigation
14.6.1.2. ✅ Home, Discover, Lobby, Debate, Profile, Shop, Leaderboard
14.6.1.3. ✅ Bottom nav bar
14.6.1.4. ✅ "Continue where you left off" (built Session 5 — localStorage + URL deep links)
14.6.1.5. ✅ Notification summary on home (activity bar built Session 5 in colosseum-home.js)
14.6.1.6. ❌ Friend activity feed on home

### 14.6.2. Section/Banner Layout
14.6.2.1. 💡 Stop tile grid — distinct sections like newspaper
14.6.2.2. 💡 Banner presentation — championship banners with animation
14.6.2.3. 💡 Category identity — Politics=navy, Sports=team colors
14.6.2.4. 💡 Trending section — social media feed logic
14.6.2.5. 💡 Sections feel like "going somewhere"

### 14.6.3. Colosseum Rebrand
14.6.3.1. 💡 Name change: Moderator → Colosseum
14.6.3.2. 💡 Audience: teen debate → male opinion culture 16-65
14.6.3.3. 💡 Fox News / ESPN aesthetic DNA
14.6.3.4. 💡 "A person who thinks they're right and wants to prove it"
14.6.3.5. 📐 Colosseum V1 — flat desktop (exists)
14.6.3.6. 📐 Colosseum V2 — 3D depth
14.6.3.7. 📐🔴 Colosseum V3 — mobile-forward (PRIORITY)

### 14.6.4. Fox News Design Elements
14.6.4.1. Navy nav, white text tabs
14.6.4.2. Red BREAKING/TRENDING badges
14.6.4.3. Ticker bar (trending + personalized)
14.6.4.4. "Watch Live" red CTA
14.6.4.5. Chyron lower-thirds
14.6.4.6. Hero + sidebar + cards layout
14.6.4.7. "ON AIR NOW" cards

### 14.6.5. ESPN Design Elements
14.6.5.1. Scoreboard ticker
14.6.5.2. "Tonight's Card"
14.6.5.3. Swipeable result cards
14.6.5.4. Tab-based sections
14.6.5.5. Stats-heavy profiles

### 14.6.6. Mobile Design
14.6.6.1. ✅ Mobile-forward — phone default (index.html: safe area insets, 44px touch targets, mobile-first breakpoints, scroll-snap, bottom nav)
14.6.6.2. 💡 Sidebar → feed on mobile (swipeable horizontal)
14.6.6.3. 💡 44px minimum touch targets
14.6.6.4. 💡 Scroll-snap with touch momentum
14.6.6.5. 💡 Desktop 1100px+ gets sidebar

### 14.6.7. Topic Architecture
14.6.7.1. Tier 1 launch: Politics + Sports
14.6.7.2. Tier 2 bridge: Entertainment/Tabloids
14.6.7.3. Tier 3 depth: Music, Movies/TV, Cars/Culture

### 14.6.8. Onboarding / Tutorial
14.6.8.1. 💡 How Elo works
14.6.8.2. 💡 What tokens are for
14.6.8.3. 💡 Debate formats explained
14.6.8.4. 💡 "How to debate" guide
14.6.8.5. 💡 Contextual tooltips

### 14.6.9. Accessibility
14.6.9.1. 💡 Screen reader
14.6.9.2. 💡 Closed captions
14.6.9.3. 💡 High contrast
14.6.9.4. 💡 Keyboard navigation

### 14.6.10. Multi-Language
14.6.10.1. 💡⚪ Other languages
14.6.10.2. 💡⚪ Translated UI
14.6.10.3. 💡⚪ Language-filtered lobby

---

## 14.7. AREA 7: DATA / B2B (46 items)

### 14.7.1. B2B Data Product Definition
14.7.1.1. 📐 "Structured real-time opinion intelligence"
14.7.1.2. 📐 25 buyer industries identified
14.7.1.3. 📐 250 specific data items mapped
14.7.1.4. 📐 Common items tiered (Tier 1: 15+ industries, Tier 2: 8-14, Tier 3: 2-7)

### 14.7.2. Tier 1 Core Data Items
14.7.2.1. 💡 Topic sentiment breakdown
14.7.2.2. 💡 Winning/losing arguments
14.7.2.3. 💡 Demographic breakdown of opinion holders
14.7.2.4. 💡 Sentiment shift timeline
14.7.2.5. 💡 Topic velocity / emergence signals
14.7.2.6. 💡 Longitudinal tracking
14.7.2.7. 💡 Emotional intensity scoring
14.7.2.8. 💡 Source credibility scoring
14.7.2.9. 💡 Counter-argument mapping
14.7.2.10. 💡 Audience engagement depth

### 14.7.3. Data Items to Build
14.7.3.1. ❌ Vote timeline (intervals, not just final)
14.7.3.2. ❌ Argument segmentation (economic, moral, emotional, statistical)
14.7.3.3. ❌ Argument-level scoring
14.7.3.4. ❌ User demographic signals
14.7.3.5. ❌ Topic velocity tracker
14.7.3.6. ❌ Longitudinal topic index
14.7.3.7. ❌ Emotional intensity tags (audio tone)
14.7.3.8. ❌ Source credibility aggregation
14.7.3.9. ❌ Counter-argument graph
14.7.3.10. ❌ Engagement depth tracking
14.7.3.11. ❌ Entity/brand mention detection
14.7.3.12. ❌ Argument classification engine
14.7.3.13. ❌ Cross-topic correlation
14.7.3.14. ❌ Regional tagging
14.7.3.15. ❌ Alert/webhook for topic spikes
14.7.3.16. ❌ Debater influence scoring

### 14.7.4. B2B Infrastructure
14.7.4.1. ❌ API access
14.7.4.2. ❌ Data products (sentiment, arguments, demographics)
14.7.4.3. ❌ Anonymized/aggregated
14.7.4.4. ❌ Self-serve dashboard
14.7.4.5. ❌ Pricing tiers by depth/refresh
14.7.4.6. 📐 Pricing: $1K/$10K/$50K+ per month

### 14.7.5. Data Confidence Scoring
14.7.5.1. 💡 Every data point scored
14.7.5.2. 💡 Debate outcome confidence
14.7.5.3. 💡 Vote confidence (weighted by trust)
14.7.5.4. 💡 Sentiment confidence
14.7.5.5. 💡 Clients see scores on everything

### 14.7.6. Debate Recording & Transcripts (REQUIRED for B2B)
14.7.6.1. ❌🔴 Record all debates (currently evaporate)
14.7.6.2. ❌ Replay page (audio + transcript synced)
14.7.6.3. ❌ Shareable replay link
14.7.6.4. ❌ Timestamp comments on replay
14.7.6.5. ❌ Analytics overlay (speaking time, scores)

---

## 14.8. AREA 8: CONTENT ENGINE (39 items)

### 14.8.1. Hot Takes Feed
14.8.1.1. ✅ Casual social layer — talk happens naturally (colosseum-async.js)
14.8.1.2. ✅ Post → React → Challenge → Structure appears
14.8.1.3. ✅ You can post a take
14.8.1.4. ✅ You can react
14.8.1.5. ✅ You can challenge
14.8.1.6. 💡 System detects heat, offers structure

### 14.8.2. Trending & Discovery
14.8.2.1. ✅ Live activity ticker
14.8.2.2. ✅ Challenge heat scores
14.8.2.3. ❌ Trending section with feed logic
14.8.2.4. 💡 Engineered serendipity
14.8.2.5. 💡 "Pixar bathroom principle"

### 14.8.3. Highlights & Clips
14.8.3.1. 💡 Clip best moments from debates
14.8.3.2. 💡 Shareable clips (watermark / clean)
14.8.3.3. 💡 Clips feed as standalone content
14.8.3.4. 💡 "Best of the week" compilation

### 14.8.4. Leaderboards
14.8.4.1. ✅ Basic leaderboard (colosseum-leaderboard.js)
14.8.4.2. ✅ Filter by topic, format, time — tab + time filter UI
14.8.4.3. ✅ "My rank" quick-jump
14.8.4.4. ❌ Elo history chart
14.8.4.5. 💡 "Rising stars"
14.8.4.6. 💡 Team/school leaderboard
14.8.4.7. 💡 Regional leaderboard
14.8.4.8. 💡 Prediction leaderboard

### 14.8.5. Content Funnel
14.8.5.1. 💡 Social layer → formal debate
14.8.5.2. 💡 Conversation → "take it to the moderator"
14.8.5.3. 💡 Works both ways — internal and external
14.8.5.4. 💡 Casual space IS the feed, debate IS the event

### 14.8.6. External Integration / Viral Loop
14.8.6.1. 💡 Browser extension — challenge from any website
14.8.6.2. 💡 Embeddable link/button for Reddit, Twitter, Discord, group chats
14.8.6.3. 💡 Target: group chats/Discord/iMessage over major platforms (walled garden resistance)
14.8.6.4. 💡 "Take it to The Moderator" as shareable concept

### 14.8.7. Tournaments & Seasons
14.8.7.1. 💡 Bracket tournaments
14.8.7.2. 💡 Entry fees / prize pools
14.8.7.3. 💡 School-vs-school
14.8.7.4. 💡 Seasonal championships
14.8.7.5. 💡 Battle Pass / Season Pass
14.8.7.6. 💡 Exclusive cosmetics per season
14.8.7.7. 💡 Season narrative/theme

### 14.8.8. Scheduling
14.8.8.1. 💡 Future time debates
14.8.8.2. 💡 Invite participants
14.8.8.3. 💡 Spectator RSVP
14.8.8.4. 💡 Calendar integration
14.8.8.5. 💡 Reminder notifications

---

## 14.9. AREA 9: EDUCATION (29 items)

14.9.1. 💡🔴 DECISION: Remove from main app
14.9.2. 💡🔴 Separate product ("Colosseum Education")
14.9.3. 💡 Ship August 2026
14.9.4. 💡 Target: charter schools, homeschool co-ops
14.9.5. 📐 ~130 lines extracted and documented
14.9.6. 📐 EDU_TOPICS (5 categories, 4 topics each)
14.9.7. 📐 7 schoolMode conditionals
14.9.8. 📐 3 CSS classes, toggle button
14.9.9. 📐 Classroom mode with class codes
14.9.10. 📐 Teacher tools
14.9.11. 📐 Structured debate formats
14.9.12. 💡 School subscription tier
14.9.13. 💡 Admin dashboard for coaches
14.9.14. 💡 Debate templates
14.9.15. 💡 Content-safe mode
14.9.16. 💡 FERPA documentation
14.9.17. 💡 Debate calendar for class
14.9.18. 📐 Per-student $8/mo
14.9.19. 📐 School licenses $3K-100K/year
14.9.20. 📐 Hardware keys $5/mo
14.9.21. 📐 Freemium cosmetics (12% conversion)
14.9.22. ❌🔴 COPPA compliance
14.9.23. ❌🔴 FERPA compliance
14.9.24. ❌ Parental consent flow
14.9.25. ❌ Data handling for minors
14.9.26. 💡 District procurement understanding

---

## 14.10. AREA 10: PLATFORM PHILOSOPHY (36 items)

### 14.10.1. Core Identity
14.10.1.1. 💡🔴 "Emergence engine, not a debate app"
14.10.1.2. 💡 Four mechanics: Post → React → Challenge → Structure
14.10.1.3. 💡 "Social system where debates are most likely emergent outcome"
14.10.1.4. 💡 Casual tier is king

### 14.10.2. Design Principles
14.10.2.1. 💡 Structured spontaneity
14.10.2.2. 💡 Engineered serendipity
14.10.2.3. 💡 Participatory culture (Jenkins)
14.10.2.4. 💡 Third place theory
14.10.2.5. 💡 Emergent debate as new product category

### 14.10.3. Growth Philosophy
14.10.3.1. 💡 Funnel = emotional investment escalating naturally
14.10.3.2. 💡 Spectators → participants when someone says something they can't let slide
14.10.3.3. 💡 Debaters = content, predictors = audience

### 14.10.4. Honest Assessment
14.10.4.1. 📐🔴 70+ files, mostly plans about plans
14.10.4.2. 📐🔴 $0 revenue, 1 user (founder), deployed at colosseum-six.vercel.app
14.10.4.3. 📐🔴 Fantasy financial projections
14.10.4.4. 📐🔴 Phase 1 "COMPLETE" but Stripe missing
14.10.4.5. 📐🔴 Bot defense before users
14.10.4.6. 📐🔴 B2B pitch sells nonexistent data
14.10.4.7. 📐🔴 Document sprawl = illusion of progress

### 14.10.5. The Pattern
14.10.5.1. 💡🔴 StreamToStage — 38 files, production-ready, never launched
14.10.5.2. 💡🔴 Expressions Network — built, sitting
14.10.5.3. 💡🔴 Moderator/Colosseum — same trajectory
14.10.5.4. 💡🔴 Planning replaces building, building replaces shipping

### 14.10.6. Open Identity
14.10.6.1. 💡🔴 The Moderator or The Colosseum? Which one ships?

---

## 14.11. INFRASTRUCTURE & DEPLOYMENT (22 items)

### 14.11.1. What Exists
14.11.1.1. ✅ the-moderator_2_1.html (2,933 lines, ~265KB)
14.11.1.2. ✅ the-moderator_2_2.html (~242KB)
14.11.1.3. ✅ server.js (not deployed)
14.11.1.4. ✅ package.json
14.11.1.5. ✅ terms-of-service.html

### 14.11.2. Designed But Not Deployed
14.11.2.1. ✅ Supabase backend live (project faomczmipsccwbhpivmp)
14.11.2.2. ✅ Hosting Vercel (colosseum-six.vercel.app)
14.11.2.3. 📐 Domain (~$1/mo)
14.11.2.4. ✅ Stripe account (sandbox, The Colosseum)
14.11.2.5. 📐 Deepgram ($0.0043/min)
14.11.2.6. 📐 Resend (100/day free)

### 14.11.3. Deployment Steps (14 days to launch)
14.11.3.1. ✅ Day 1: Schema ready (colosseum-schema-production.sql) — human creates Supabase project, pastes schema
14.11.3.2. ✅ Day 2-3: Supabase auth integrated (colosseum-auth.js replaces localStorage)
14.11.3.3. ✅ Day 4: Login/signup UI, age verification (colosseum-login.html)
14.11.3.4. ✅ Day 5: Stripe account created, publishable key + 7 price IDs pasted into colosseum-config.js — done Session 8
14.11.3.5. ✅ Day 6-7: Stripe Checkout wired (colosseum-payments.js + colosseum-stripe-functions.js)
14.11.3.6. ✅ Day 8: Settings page (colosseum-settings.html)
14.11.3.7. ✅ Day 9: ToS acceptance at signup — DONE in login, ToS page built (colosseum-terms.html, 432 lines, Colosseum-branded, mobile-first)
14.11.3.8. ✅ Day 10: Vercel config ready (vercel.json + DEPLOYMENT-GUIDE.md) — human deploys
14.11.3.9. ✅ Day 11: WebRTC signaling — uses Supabase Realtime channels (no separate server needed). colosseum-webrtc.js handles offer/answer/ICE via broadcast.
14.11.3.10. ✅ Day 12-13: Bug fixes — done Session 10 (4 bugs fixed: auth race condition, payments placeholder URL crash, login operator precedence, settings double updateProfile)
14.11.3.11. ❌ Day 14: Send link to 10 people

---

# 15. WHAT TO DO NEXT

15.1. ✅ Schema built — colosseum-schema-production.sql ready to paste
15.2. ✅ Create Supabase project — done Session 7, project: faomczmipsccwbhpivmp
15.3. ✅ Auth wired (colosseum-auth.js + colosseum-login.html) — REBUILT Session 3, window global, placeholder mode
15.4. ✅ Create Stripe account (human) → keys pasted into colosseum-config.js — done Session 8
15.5. ✅ Stripe wired with placeholders (colosseum-payments.js + colosseum-stripe-functions.js)
15.6. ✅ Deploy to Vercel — done Session 8, URL: colosseum-six.vercel.app
15.7. ✅ Wire V2 modules into V1 app — index.html built, loads config + auth + payments + notifications + paywall + async + share + leaderboard
15.8. ✅ Build notification center (14.5.2) — REBUILT Session 3
15.9. ✅ Build paywall modals (14.2.6) — REBUILT Session 3
15.10. ✅ All 7 missing JS modules created — Session 3 filled the gap between indexM.html and the files it loads
15.11. ✅ All 3 linked HTML pages created — login, settings, profile-depth
15.12. ✅ Schema with seed data — 18 tables, 45 cosmetics, 25 achievements, 4 triggers
15.13. ✅ Schema + Ring 3 + voice memo migration pasted into Supabase SQL Editor — done Session 7
15.14. ✅ Clean deployment package assembled — 24 files, all verified, ready for Vercel
15.15. ⏳ Send link to 10 people
15.16. Watch what happens
15.17. Build next thing based on what real users do

### 15.18. SESSION 5 COMPLETED ITEMS
15.18.0. ✅ Stripe Edge Functions created (colosseum-stripe-functions.js) — was completely missing

### 15.19a. SESSION 6 STATUS CHECK (Feb 27)
15.19a.0. Audited all 24 files against the master checklist
15.19a.1. ✅ colosseum-terms.html was already built (432 lines, Colosseum-branded, mobile-first) — marked done
15.19a.2. ✅ WebRTC signaling uses Supabase Realtime channels — no separate server needed — marked done
15.19a.3. ✅ Mobile-forward design already in index.html (safe areas, 44px targets, scroll-snap) — marked done
15.19a.4. ✅ Voice memo mode already built (colosseum-voicememo.js, 809 lines) — marked done
15.19a.5. ✅ Matchmaking timer, post-debate survey, continue-where-you-left-off, activity bar, login rate limiting, minor restrictions — all built Session 5, now marked done in inventory
15.19a.6. CONCLUSION: All buildable code items are complete. 24 files ready. Remaining blockers are human paste tasks (Supabase project, Stripe account, deploy to Vercel).

### 15.19b. SESSION 7 (Feb 27) — Supabase Live + Spelling Fix
15.19b.1. ✅ Supabase project created (faomczmipsccwbhpivmp)
15.19b.2. ✅ Supabase URL + anon key pasted into colosseum-config.js
15.19b.3. ✅ Schema pasted into Supabase SQL Editor — 18 tables live
15.19b.4. ✅ Ring 3 functions pasted — server-side scoring/token functions live
15.19b.5. ✅ Voice memo migration pasted — voice memo tables live
15.19b.6. ✅ debate-audio storage bucket created (public)
15.19b.7. ✅ Spelling fix: Coliseum → Colosseum across ALL 24 files + filenames + Supabase seed data
15.19b.8. ✅ Stripe account created — done Session 8
15.19b.9. ✅ Stripe products + price IDs created (7 products) — done Session 8
15.19b.10. ⏳ Deploy Stripe Edge Functions to Supabase (next — requires CLI)

### 15.19c. SESSION 8 (Feb 27) — Deployed Live + Stripe Connected
15.19c.1. ✅ Vercel account created, colosseum repo imported, deployed to colosseum-six.vercel.app
15.19c.2. ✅ Deployed URL pasted into colosseum-config.js and committed to GitHub
15.19c.3. ✅ Supabase auth Site URL changed from localhost:3000 to colosseum-six.vercel.app — email verification redirect working
15.19c.4. ✅ First real user signup + email verification + auto-login — WORKING
15.19c.5. ✅ Stripe sandbox account created (The Colosseum)
15.19c.6. ✅ 7 Stripe products created: Contender ($9.99/mo), Champion ($19.99/mo), Creator ($29.99/mo), 50 Tokens ($0.99), 250 Tokens ($3.99), 600 Tokens ($7.99), 1800 Tokens ($19.99)
15.19c.7. ✅ Stripe publishable key + 7 price IDs pasted into colosseum-config.js and committed to GitHub
15.19c.8. ✅ Deploy Stripe Edge Functions — done Session 10 via Supabase CLI (create-checkout-session + stripe-webhook)
15.19c.9. ✅ Set up Stripe webhooks — done Session 10 (4 events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed)
15.19c.10. ⏳ Send link to 10 people

### 15.19d. SESSION 9 (Feb 27) — Password Reset Fix
15.19d.1. ✅ BUG: Password reset link from email flashed a message then dumped user back to login — no new password form existed
15.19d.2. ✅ colosseum-login.html — Added "Set New Password" modal (two fields: new password + confirm), wired to Supabase PASSWORD_RECOVERY auth event
15.19d.3. ✅ colosseum-auth.js — Added updatePassword() function (calls supabase.auth.updateUser), added PASSWORD_RECOVERY event to auth listener, exported updatePassword in public API
15.19d.4. ✅ Replaced old hash-parsing recovery handler with proper Supabase onAuthStateChange listener
15.19d.5. ⚠️ Discovered Supabase free tier rate limit: 2 reset emails/hour. Custom SMTP (Resend, free 100/day) recommended.
15.19d.6. ✅ Set up Resend SMTP in Supabase — done Session 10 (resend.com, API key, 100 emails/day free)
15.18.1a. ✅ credit_tokens() + debit_tokens() added to Ring 3
15.18.2a. ✅ stripe_subscription_id added to profiles table
15.18.3a. ✅ Login/signup function calls fixed to match auth module (was crashing)
15.18.4a. ✅ Settings logout/updateSettings calls fixed
15.18.5a. ✅ Index.html logout call fixed
15.18.6a. ✅ WebRTC config reference fixed (COLOSSEUM_CONFIG → ColosseumConfig)
15.18.7a. ✅ Spectator mode built (14.3.7) — reactions, voting, chat, live timer
15.18.8a. ✅ Predictions UI built (14.8.1) — pick-a-winner modal, token wager
15.18.9a. ✅ Activity bar on home (14.6.1.5)
15.18.10a. ✅ Post-debate survey (14.3.8.1) — "Did this change your mind?"
15.18.11a. ✅ Matchmaking timer (14.3.5.5) — elapsed time, tips, async suggestion at 60s
15.18.12a. ✅ Login rate limiting (14.4.1.16) — 5 attempts → 60s lockout
15.18.13a. ✅ Email verification redirect handler (14.4.1.8)
15.18.14a. ✅ Username validation (14.4.2.3) — alphanumeric + underscore, 3-20 chars
15.18.15a. ✅ Minor payment restrictions (14.4.3.4) — blocked from subscribe/buyTokens
15.18.16a. ✅ Continue where you left off (14.6.1.4) — localStorage + URL deep links
15.18.17a. ✅ WATCH LIVE buttons wired to spectator mode (was toast-only)
15.18.18a. ✅ DEPLOYMENT-GUIDE rewritten with 24-file list and correct line numbers

## 15.19. HUMAN ACTION ITEMS (copy/paste tasks)
15.19.1. ✅ colosseum-config.js fully configured. All PASTE spots filled EXCEPT Deepgram API key (not needed until debate recording is built).
15.19.2. ✅ colosseum-schema-production.sql → pasted into Supabase SQL Editor → Success
15.19.3. ✅ colosseum-ring3-functions.sql → pasted into Supabase SQL Editor → Success
15.19.4. ✅ colosseum-migration-voicememo.sql → pasted into Supabase SQL Editor → Success
15.19.5. ✅ Supabase → Storage → debate-audio bucket created → Public ON
15.19.6. ✅ Supabase → Settings → API → URL + anon key copied → pasted into colosseum-config.js
15.19.7. ✅ Stripe → Developers → API Keys → publishable key pasted into colosseum-config.js — done Session 8
15.19.8. ✅ Stripe → Products → 7 products created (3 subs + 4 token packs) → price IDs pasted into colosseum-config.js — done Session 8
15.19.9. ✅ colosseum-stripe-functions.js → deployed as Supabase Edge Functions — done Session 10
15.19.10. ✅ Stripe function files created with real price IDs, deployed URL, and webhook handler — done Session 10
15.19.11. ✅ Deploy to Vercel → deployed URL (colosseum-six.vercel.app) pasted into colosseum-config.js → auto-redeployed — done Session 8
15.19.12. ✅ Supabase auth Site URL set to colosseum-six.vercel.app — email verification redirect working — done Session 8
15.19.13. ✅ Set up Resend SMTP in Supabase (Auth → Email → Custom SMTP) — done Session 10, email rate limit removed

### 15.19e. SESSION 10 (Feb 27) — Bug Fixes + Stripe Fully Wired + Resend SMTP
15.19e.1. ✅ BUG FIX: Auth race condition in index.html — session check is async but 800ms timeout guard fired before it completed, dumping logged-in users to login page. Replaced with onChange callback + safety timeout.
15.19e.2. ✅ BUG FIX: Payments module fetched garbage URL — Stripe key exists (isPlaceholderMode=false) but STRIPE_FUNCTION_URL was still placeholder. Now checks isPlaceholder() on function URL before fetch, shows placeholder modal instead of crashing.
15.19e.3. ✅ BUG FIX: Login page operator precedence — line 801 `hash.includes('type=signup') || hash.includes('type=email')` missing parentheses, would always evaluate true on any hash.
15.19e.4. ✅ BUG FIX: Settings page called updateProfile twice — second call passed notification/privacy/audio toggle values as profile columns, which don't exist in profiles table. Removed duplicate call, added TODO comment for user_settings table.
15.19e.5. ✅ colosseum-config.js — Added stripeFunction placeholder flag to placeholderMode object.
15.19e.6. ✅ Node.js installed on dev machine (v24.14.0 LTS)
15.19e.7. ✅ Supabase CLI installed (v2.76.15), logged in, project linked
15.19e.8. ✅ Stripe Edge Functions deployed: create-checkout-session + stripe-webhook (both live on Supabase)
15.19e.9. ✅ Supabase secrets set: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
15.19e.10. ✅ Stripe webhook created: endpoint URL pointing to stripe-webhook function, listening for 4 events
15.19e.11. ✅ colosseum-config.js STRIPE_FUNCTION_URL updated with real URL (https://faomczmipsccwbhpivmp.supabase.co/functions/v1/create-checkout-session)
15.19e.12. ✅ Resend account created (resend.com), API key generated
15.19e.13. ✅ Supabase Custom SMTP configured (smtp.resend.com, port 465, sender: The Colosseum via onboarding@resend.dev)
15.19e.14. ✅ 5 files updated: index.html, colosseum-payments.js, colosseum-login.html, colosseum-settings.html, colosseum-config.js
15.19e.15. ⏳ Send link to 10 people — only remaining pre-launch item

---

*502 items + Session 3, 4, 5, 9 & 10 additions. Every decision. Every principle. Every idea. One file.*
