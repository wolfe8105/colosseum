# THE COLOSSEUM — OLD TESTAMENT
### The Reference Vault — Read When Relevant
### Last Updated: Session 23 (March 2, 2026)

> **Read the New Testament every session.** This file contains historical build logs, detailed inventories, revenue models, and reference material. Pull specific sections only when the session's work touches those areas.

---

# TABLE OF CONTENTS

1. Session Build Logs (complete history, Sessions 1-23)
2. Revenue Model
3. B2B Data Play
4. Education (separate product)
5. Honest Assessment
6. Research Foundations
7. Complete Inventory (502 items)
8. User Acquisition & Growth Strategy
9. Design Documents & Supporting Files

---

# 1. SESSION BUILD LOGS

## 1.1. Session 1 (Feb 26) — Foundation
1.1.1. ✅ colosseum-payments.js, colosseum-stripe-functions.js, colosseum-schema-production.sql (18 tables, RLS, triggers, 45 cosmetics, 25 achievements)
1.1.2. ✅ colosseum-auth.js, colosseum-login.html, colosseum-settings.html, colosseum-config.js
1.1.3. ✅ colosseum-profile-depth.html (12 sections, 147 Qs), vercel.json, DEPLOYMENT-GUIDE.md

## 1.2. Session 2 (Feb 26)
1.2.1. ✅ index.html (app shell), colosseum-notifications.js, colosseum-paywall.js
1.2.2. ✅ colosseum-async.js (hot takes, BET challenge), colosseum-share.js, colosseum-leaderboard.js

## 1.3. Session 3 (Feb 26) — Full Rebuild
1.3.1. All 7 JS modules REBUILT with window.X global pattern + placeholder mode
1.3.2. All 3 HTML pages REBUILT, Schema REBUILT

## 1.4. Session 4 (Feb 26) — Clean Package
1.4.1. ✅ Assembled 22-file deployment folder, duplicates resolved, DEPLOYMENT-GUIDE rewritten

## 1.5. Session 5 (Feb 27) — Bug Sweep + Features
1.5.1. ✅ colosseum-stripe-functions.js CREATED, Ring 3 functions UPDATED (credit/debit tokens)
1.5.2. ✅ Built spectator mode, predictions UI, matchmaking timer, activity bar, post-debate survey
1.5.3. ✅ Login rate limiting, email verification handler, username validation. File count 22→24.

## 1.6. Session 6 (Feb 27) — Status Audit
1.6.1. Audited all 24 files. CONCLUSION: All buildable code complete. Remaining blockers = human paste tasks.

## 1.7. Session 7 (Feb 27) — Supabase Live
1.7.1. ✅ Supabase project created (faomczmipsccwbhpivmp), schema pasted, storage bucket created
1.7.2. ✅ Spelling fix: Coliseum → Colosseum across ALL files

## 1.8. Session 8 (Feb 27) — APP IS LIVE
1.8.1. ✅ Deployed to Vercel (colosseum-six.vercel.app), auth working end-to-end
1.8.2. ✅ Stripe sandbox created with 7 products, all keys pasted

## 1.9. Session 9 (Feb 27) — Password Reset Fix
1.9.1. ✅ Added "Set New Password" modal + PASSWORD_RECOVERY handler
1.9.2. ⚠️ Discovered Supabase free tier limits to 2 emails/hour — custom SMTP needed

## 1.10. Session 10 (Feb 27) — Bug Fixes + Stripe + SMTP
1.10.1. ✅ Fixed 4 bugs: auth race condition (async session check vs timeout guard), payments placeholder URL crash, login operator precedence, settings double updateProfile
1.10.2. ✅ Deployed Stripe Edge Functions via Supabase CLI, Resend SMTP configured
1.10.3. **AUTH BUG LESSON:** getSession() is async but a setTimeout was showing app content before auth resolved. Never render auth-gated content before the auth check actually resolves.

## 1.11. Session 11 (Feb 27) — Mobile UX Research + Home Redesign
1.11.1. ✅ Confirmed 8 content zones on home screen violates every mobile UX principle
1.11.2. ✅ Decision: kill multi-zone → spoke carousel. Hated Rivals mechanic added, Couples Court added.

## 1.12. Session 12 (Feb 28) — Visual Redesign
1.12.1. ✅ Spoke Carousel V3: 6 glassmorphism tiles, 18° tilt, thumb-spin
1.12.2. ✅ Visual system: Cinzel + Barlow Condensed, diagonal gradient, frosted glass
1.12.3. ✅ Login restructured: OAuth dominant, ticker bar + category tabs removed

## 1.13. Session 13 (Feb 28) — User Acquisition Strategy
1.13.1. ✅ Zero-budget growth strategy locked, 15-item priority list created
1.13.2. ✅ Polymarket/Hotmail/Dropbox/Airbnb/Reddit/Tinder case studies documented

## 1.14. Session 14 (Feb 28) — Growth Infrastructure
1.14.1. ✅ Ungated debate landing page, dynamic OG meta tags, share card generator (4 sizes)
1.14.2. ✅ Default OG card image, watermark on all share outputs. File count 25→28.

## 1.15. Session 15 (Feb 28) — Telegram + Discord Bots
1.15.1. ✅ Telegram bot (/debate, /settle, inline mode), Discord bot (/settle, gold embeds, vote buttons)
1.15.2. ✅ Zero npm deps across all 4 bot files. File count 28→32.

## 1.16. Session 16 (Mar 1) — Security Hardening (3 Moves)
1.16.1. ✅ Move 1: RLS audit found 7 critical vulnerabilities. All 30+ policies dropped and replaced. Guard trigger on profiles. credit_tokens locked to service_role.
1.16.2. ✅ Move 2: 20 server-side validation functions. All client writes gated behind SECURITY DEFINER.
1.16.3. ✅ Move 3: sanitize_text() + sanitize_url(). rate_limits table. vercel.json hardened (CSP, HSTS, 12 headers). middleware.js (API rate limit, CORS, payload limit).
1.16.4. Most dangerous vulnerability found: credit_tokens() callable by any authenticated user for any user — unlimited tokens.

## 1.17. Session 17 (Mar 1) — Client-Side RPC Migration
1.17.1. ✅ colosseum-ring3-move2.sql — 22 SECURITY DEFINER functions across 11 sections
1.17.2. ✅ colosseum-rls-hardened.sql — drops 34 old policies, 24 hardened replacements, guard trigger
1.17.3. ✅ colosseum-auth.js, colosseum-async.js, colosseum-notifications.js, colosseum-voicememo.js — all REPLACED with .rpc() calls
1.17.4. ✅ All SQL pasted, all JS pushed to GitHub. Security hardening FULLY LIVE.
1.17.5. ⚠️ Known: place_prediction() schema mismatch (UUID vs TEXT 'a'/'b')

## 1.18. Session 18 (Mar 1) — Founder Reality Check + Bot Model
1.18.1. ✅ Founder constraints fully documented (no network, no time, no marketing skill)
1.18.2. ✅ "Send to 10 friends" declared dead. Manual X Reply Guy declared dead.
1.18.3. ✅ Two financial spreadsheets created (original + bot-driven projections)
1.18.4. ✅ Bot-driven growth model adopted — two-leg architecture (Reactive + Proactive)
1.18.5. ✅ Combined daily reach: ~3,000-25,000+ impressions. Bot costs: ~$100/mo budget.

## 1.19. Session 19 (Mar 1) — Bot Army Built
1.19.1. ✅ 16 files, 2,304 lines. Complete standalone Node.js app.
1.19.2. Files: bot-engine.js, bot-config.js, ecosystem.config.js, .env.example, SETUP-GUIDE.md, package.json
1.19.3. Libs: ai-generator.js (Groq), supabase-client.js, logger.js, leg1-reddit.js, leg1-twitter.js, leg1-discord.js, leg2-news-scanner.js, leg2-debate-creator.js, leg2-twitter-poster.js
1.19.4. ✅ colosseum-bot-army-schema.sql — bot_activity table, bot_stats_24h view
1.19.5. Architecture: DigitalOcean $6/mo VPS, PM2, cron-based scheduling
1.19.6. AI: Groq free tier (Llama 3.1 70B). Actual costs revised: $6-16/mo (was $100/mo estimate)
1.19.7. Safety: DRY_RUN=true default, per-leg feature flags

## 1.20. Session 20 (Mar 1) — Leg 3 Auto-Debate Rage-Click Engine
1.20.1. ✅ lib/leg3-auto-debate.js — full pipeline: headline → setup → 3 rounds → lopsided score → save → rage hook
1.20.2. ✅ colosseum-auto-debate.html — verdict page with rounds, scorecard, judge's take, ungated voting
1.20.3. ✅ colosseum-auto-debate-schema.sql — auto_debates + auto_debate_votes tables, functions, stats view
1.20.4. ✅ Bot engine updated with Leg 3 support. Margin weighting: 40% landslide, 45% clear, 15% split. Max 6/day.
1.20.5. Total: 17 files, ~2,800+ lines across bot army.

## 1.21. Session 21 (Mar 1) — Security Backlog Cleared
1.21.1. ✅ Confirmed middleware.js + vercel.json live on GitHub/Vercel
1.21.2. ✅ Supabase CORS confirmed non-existent — scratched
1.21.3. ✅ Stripe Edge Function CORS hardened — domain allowlist, redeployed via Supabase CLI
1.21.4. ✅ place_prediction() schema mismatch fixed (UUID→'a'/'b' + column name)
1.21.5. ✅ /verdict URL rewrite added. Node.js v24.14.0 installed on dev machine.

## 1.22. Session 22 (Mar 1) — Hot Takes Feed Wired + Bible Maintenance
1.22.1. ✅ colosseum-async.js REBUILT — fetchTakes(section) queries Supabase (hot_takes joined with profiles), loads user reactions, placeholder fallback. renderFeed() + renderComposer() build full UI.
1.22.2. ✅ index.html REBUILT — openCategory() is async, overlay shows loading → fetches real takes → renders composer + feed. Removed hardcoded SAMPLE_DEBATES. Section names on tiles.
1.22.3. ✅ Bible consolidated — 11 files merged to 2. Redundant versions killed.
1.22.4. ⚠️ Auth race condition still present in index.html (800ms setTimeout before auth check).
1.22.5. **VERDICT PAGE BUG LESSON (from pre-bible era):** Wrong diagnosis said race condition / script execution order. Real bug was line 344: `sb.rpc('view_auto_debate', {...}).catch(() => {})` — Supabase rpc() returns a query builder, NOT a Promise. `.catch()` threw TypeError. Fix: wrap in try/catch instead of chaining .catch(). **Pattern: walk the chain, find where it actually breaks. Don't build theories before testing each step.**

## 1.23. Session 23 (Mar 2) — Auth Fix + Follow System + Predictions + Rivals
1.23.1. ✅ **Auth race condition FIXED** — replaced 800ms setTimeout with `readyPromise` pattern. `ColosseumAuth.ready` resolves after `_checkSession()` completes. `index.html` now uses `await ColosseumAuth.ready` before fading loading screen. No more guessing.
1.23.2. ✅ **Follow system UI** — `getFollowCounts(userId)`, `getPublicProfile(userId)` RPCs added to colosseum-auth.js. Profile screen shows follower/following counts. Tappable usernames in hot takes open user profile modal (bottom sheet with avatar, stats, follow/unfollow button, ⚔️ RIVAL button).
1.23.3. ✅ **Predictions system UI** — `fetchPredictions()`, `renderPredictions()`, `placePrediction()` in colosseum-async.js. Category overlay now has tabbed UI (🔥 HOT TAKES | 🔮 PREDICTIONS). Vote buttons with percentage bars, optimistic UI updates.
1.23.4. ✅ **Hated Rivals mechanic** — `rivals` table (challenger_id, target_id, status, max 5 active). `declare_rival()`, `respond_rival()`, `get_my_rivals()` RPCs. Rivals feed on profile screen. Accept/decline incoming requests.
1.23.5. ✅ **colosseum-session23-migration.sql** — rivals table, indexes, RLS policies, 6 new RPC functions (get_follow_counts, is_following, get_public_profile, get_debate_predictions, get_hot_predictions, declare_rival, respond_rival, get_my_rivals). 9th SQL file in paste order.
1.23.6. ✅ **colosseum-fix-auto-debate-rls.sql** — allows anonymous SELECT on auto_debates (status='active') and auto_debate_votes. Unblocks verdict page for non-logged-in users. 10th SQL file.
1.23.7. ✅ **Repo audit + sync** — identified 3 missing files (colosseum-auto-debate.html, colosseum-debate-landing.html, middleware.js), all pushed to GitHub. Bible files pushed. 3 stale docs deleted (GENDER-AUDIT.md, SESSION-14-BIBLE-UPDATE.md, THE-MODERATOR-COMPLETE-NUMBERED__3_.md). Repo fully synced.
1.23.8. ✅ colosseum-config.js version bumped to 2.1.0. Feature flags: followsUI, predictionsUI, rivals.
1.23.9. Files touched: colosseum-auth.js, colosseum-async.js, colosseum-config.js, index.html (all REBUILT). 2 new SQL files created.

---

# 2. REVENUE MODEL

## 2.1. Subscriptions (Colosseum)
2.1.1. Lurker: free/ads
2.1.2. Contender: $9.99/mo
2.1.3. Champion: $19.99/mo
2.1.4. Creator: $29.99/mo

## 2.2. Subscriptions (Moderator model — legacy reference)
2.2.1. Free: unlimited debates, 3 formats, 10 tokens/day, light ads
2.2.2. Pro: $9.99/mo, all cosmetics, teams, 30 tokens/day, ad-free
2.2.3. 7-day trial, no credit card. Annual $99.99/year (17% savings)
2.2.4. Profile Depth discount: $14.99 reducible to $0.49

## 2.3. Token Economy
2.3.1. 4 packages: $0.99/50, $3.99/250, $7.99/600, $19.99/1800
2.3.2. Earning: daily login (1), challenge (3), first win (2), streaks (2-25), referrals (10), mod work (2)
2.3.3. Anti-abuse: no tokens from losses, 5+ min threshold, no rapid concede farming

## 2.4. Cosmetics Shop
2.4.1. 45 items: 15 borders, 18 badges, 12 effects. Common / Rare / Legendary.

## 2.5. Ads
2.5.1. 30-second slots between rounds, light banners on free tier, Featured Debate sponsored placement

## 2.6. Events
2.6.1. Tournaments with entry fees, premium rooms, PPV events, real-dollar tipping

## 2.7. Financial Projections (Updated Session 19-20)

### Bot-Driven (founder's real situation)
2.7.1. Month 1 MAU: 12-20 (was 9-15 pre-Leg 3)
2.7.2. Month 3 MAU: 40-70
2.7.3. Month 12 MAU: 500-900
2.7.4. Year 1 total signups: 1,200-2,000
2.7.5. Year 1 revenue: ~$4,000-8,000
2.7.6. Year 1 costs: ~$1,900 (including ~$72-192 bot costs at actual rates)
2.7.7. Year 1 net profit: ~$2,100-6,100
2.7.8. Break-even month: ~Month 6-8
2.7.9. Total risk if strategy fails: ~$600-800

### Scaling Math
2.7.10. Double bot budget ($200/mo) ≈ double output
2.7.11. Growth ceiling = wallet, not founder's time

---

# 3. B2B DATA PLAY

## 3.1. What We're Selling
3.1.1. "Structured, real-time opinion intelligence from real people defending positions in transcribed, scored, time-stamped debates"
3.1.2. No one else has this data

## 3.2. Who Buys It
3.2.1. 25 industries identified, 250 data items mapped
3.2.2. Political campaigns, polling firms, media, hedge funds, PR, ad agencies, brand strategy, legal (jury consultants), think tanks, government, entertainment, sports, tech, healthcare, insurance, education research, real estate, retail, pharma, automotive, telecom, energy, nonprofit, financial services, food & beverage

## 3.3. Pricing
3.3.1. Tier A startups: $1K/month
3.3.2. Tier B mid-market: $10K/month
3.3.3. Tier C enterprise: $50K+/month

## 3.4. Honest Assessment
3.4.1. Strongest long-term idea. Requires real accounts + profile depth + recordings. Build consumer product first.

---

# 4. EDUCATION (SEPARATE PRODUCT)

4.1. Decision: removed from main app for moral/liability reasons
4.2. Becomes "Colosseum Education" — target August 2026
4.3. Target: charter schools, homeschool co-ops
4.4. Compliance: COPPA, FERPA, parental consent
4.5. Revenue: $8/student/month, school licenses $3K-100K/year

---

# 5. HONEST ASSESSMENT (Updated Session 22)

5.1. Financial projections were fantasy math ($22M Year 1 with no users) — deleted and replaced with bot-driven model
5.2. Phase 1 marked COMPLETE but Stripe wasn't connected — fixed Session 10
5.3. Bot defense built before having users to defend
5.4. B2B pitch sells data that doesn't exist
5.5. Document sprawl creates illusion of progress (70+ files, plans about plans)
5.6. The pattern: StreamToStage → Expressions Network → Moderator/Colosseum — planning replaces building
5.7. **Session 18:** "10 real humans" plan assumed a network that doesn't exist. Bot-driven growth is the only viable path.
5.8. **Session 19:** Bot army code complete. Actual costs $6-16/mo vs $100 estimate. Gap between "built" and "deployed" = one 60-90 minute setup session.
5.9. **Session 22:** Infrastructure is real — 32+ files, 20+ tables, 22 functions, Stripe wired, auth working, security hardened, hot takes feed live. But user count is still 1.
5.10. **Session 23:** Social features now exist — follows, user profile modals, predictions, hated rivals. "Single-player pretending to be multiplayer" partially addressed. Still no real users to test with. Repo fully synced for the first time.

---

# 6. RESEARCH FOUNDATIONS

6.1. Third Place Theory (Oldenburg 1989)
6.2. Progressive Disclosure (Nielsen Norman Group) — 7-9 options max
6.3. 90-9-1 Rule (Nielsen) — spectators are primary, updated to ~55-30-15
6.4. Choice Overload / Jam Study (Iyengar) — 6 flavors 30% bought, 24 flavors 3%
6.5. Emergent Gameplay (Juul, Smith, Salen & Zimmerman)
6.6. Participatory Culture (Henry Jenkins, MIT)
6.7. Engineered Serendipity (Zuckerman, MIT Civic Media Lab)
6.8. SBMM Research (gaming industry) — casual protection non-negotiable
6.9. App Fatigue (CleverTap, Fast Company) — 65% don't download apps in 3 months
6.10. Ambient Engagement (PLOS Digital Health)

## 6.11. Mobile UX Research (Sessions 11-12)
6.11.1. Miller's Law: ~7 items (±2) in working memory
6.11.2. Information Overload (Bertram Gross, 1964)
6.11.3. 53% abandon apps >3sec load
6.11.4. Rules: One Primary Action Per Screen, Progressive Disclosure, White Space, Signal Over Noise
6.11.5. Gesture-driven nav reduces interaction time ~15%
6.11.6. TikTok: auto-plays on open, full-screen, no choice paralysis

## 6.12. Build Priority from Research
6.12.1. 🟢 First: Hot Takes feed, spectator tools, casual protection, debate clips, section layout
6.12.2. 🟡 Second: banner animations, "Bet." button, trending with quality signals
6.12.3. 🔴 Later: community captains, curated front page

---

# 7. COMPLETE INVENTORY (502 Items)

## 7.1. Core Features (Items 1-100)

### Authentication & Accounts
7.1.1. Email/password signup with validation
7.1.2. Google OAuth one-tap
7.1.3. Apple Sign-In
7.1.4. Email verification flow
7.1.5. Password reset with modal
7.1.6. Session management (Supabase)
7.1.7. Age gate (13+ verification)
7.1.8. Terms of Service acceptance
7.1.9. Account deletion (soft delete)
7.1.10. Login rate limiting

### Profiles
7.1.11. Display name, username, avatar
7.1.12. ELO rating display
7.1.13. Win/loss/streak stats
7.1.14. Level and XP display
7.1.15. Profile depth percentage bar
7.1.16. Subscription tier badge
7.1.17. Profile sharing
7.1.18. Public/private profile views (RLS)
7.1.19. Guard trigger on protected columns

### Profile Depth System (12 Sections, 157 Questions)
7.1.20. Demographics section
7.1.21. Personality section
7.1.22. Debate preferences section
7.1.23. Interests section
7.1.24. Media consumption section
7.1.25. Politics section
7.1.26. Sports section
7.1.27. Entertainment section
7.1.28. Lifestyle section
7.1.29. Values section
7.1.30. Technology section
7.1.31. Wildcards section
7.1.32. Completion percentage tracking
7.1.33. Discount waterfall ($14.99 → $0.49)
7.1.34. Section-locked cosmetic rewards

### Hot Takes Feed
7.1.35. Post composer (280 char limit)
7.1.36. Category-filtered feeds (politics, sports, entertainment, couples, trending, music)
7.1.37. Supabase-backed with profile join
7.1.38. Placeholder fallback when empty
7.1.39. 🔥 Fire reaction (toggle via RPC)
7.1.40. ⚔️ BET. challenge button
7.1.41. Challenge modal with counter-argument
7.1.42. Share button per take
7.1.43. Relative timestamps
7.1.44. User avatar + ELO display per take

### Debates
7.1.45. Live audio via WebRTC (Supabase Realtime)
7.1.46. Spectator mode
7.1.47. Voting system
7.1.48. Predictions with token wagering
7.1.49. Async text debate threads
7.1.50. Voice memo debate mode

### Scoring & Progression
7.1.51. ELO calculation
7.1.52. XP and leveling system
7.1.53. Win/loss tracking
7.1.54. Streak tracking
7.1.55. Daily token claims
7.1.56. Achievement auto-scan (25 conditions)

### Cosmetics & Shop
7.1.57. 45 items (15 borders, 18 badges, 12 effects)
7.1.58. Common/Rare/Legendary rarity
7.1.59. Purchase via RPC
7.1.60. Equip/unequip via RPC
7.1.61. Subscription tier cards (3 tiers)
7.1.62. Token pack grid (4 packs)

### Notifications
7.1.63. Notification center (slide-down)
7.1.64. Category filters
7.1.65. Mark read (bulk via RPC)
7.1.66. 90-day auto-cleanup
7.1.67. 30-second polling

### Navigation & UI
7.1.68. Spoke carousel (6 tiles, thumb-spin)
7.1.69. Bottom nav (5 tabs)
7.1.70. Category overlay (slides up)
7.1.71. User dropdown menu
7.1.72. Loading screen with spinner
7.1.73. Payment success/cancel toasts
7.1.74. Arena placeholder screen

### Settings
7.1.75. All toggle switches
7.1.76. Account management
7.1.77. Privacy controls
7.1.78. Notification preferences

### Sharing & Growth
7.1.79. Web Share API integration
7.1.80. Clipboard fallback
7.1.81. Referral system
7.1.82. Deep links
7.1.83. Share cards (4 sizes, ESPN aesthetic)
7.1.84. Watermark on all outputs
7.1.85. Dynamic OG meta tags
7.1.86. Default OG card image

### Landing Pages
7.1.87. Ungated debate landing page
7.1.88. Auto-debate verdict page
7.1.89. Terms of Service page
7.1.90. Login/signup page

### Payments
7.1.91. Stripe Checkout integration
7.1.92. 3 subscription products
7.1.93. 4 token pack products
7.1.94. Edge Functions (checkout + webhook)
7.1.95. 4 webhook event handlers
7.1.96. CORS-hardened Edge Functions

### Leaderboard
7.1.97. ELO/Wins/Streak tabs
7.1.98. Time filters
7.1.99. My Rank card
7.1.100. Supabase-ready queries

## 7.2. Security Items (101-140)

7.2.101-7.2.124. 24 hardened RLS policies
7.2.125-7.2.146. 22 SECURITY DEFINER functions
7.2.147. Guard trigger on profiles (blocks elo/tokens/wins/losses/tier/stripe edits)
7.2.148. sanitize_text() — strips XSS at DB boundary
7.2.149. sanitize_url() — validates URLs
7.2.150. rate_limits table + check_rate_limit()
7.2.151. vercel.json — CSP, HSTS, 12 security headers
7.2.152. middleware.js — API rate limiting, CORS, payload limit
7.2.153. Stripe CORS hardened (domain allowlist)
7.2.154. profiles_public + profiles_private views

## 7.3. Bot Army Items (141-180)

7.3.141. bot-engine.js (orchestrator)
7.3.142. bot-config.js (env loader, validator)
7.3.143. ecosystem.config.js (PM2)
7.3.144. .env.example (all placeholders)
7.3.145. SETUP-GUIDE.md
7.3.146. package.json (10 deps)
7.3.147. ai-generator.js (Groq Llama 3.1 70B)
7.3.148. supabase-client.js (service role)
7.3.149. logger.js (Winston daily rotate)
7.3.150. leg1-reddit.js (13 subreddits)
7.3.151. leg1-twitter.js (disabled, needs Basic API)
7.3.152. leg1-discord.js (persistent WebSocket)
7.3.153. leg2-news-scanner.js (7 RSS feeds)
7.3.154. leg2-debate-creator.js (AI → Supabase → URL)
7.3.155. leg2-twitter-poster.js (peak-hour timing)
7.3.156. leg3-auto-debate.js (full pipeline)
7.3.157. colosseum-bot-army-schema.sql
7.3.158. Auto-debate scoring: 40% landslide, 45% clear, 15% split
7.3.159. DRY_RUN mode
7.3.160. Per-leg feature flags

## 7.4. Session 23 Items (181-210)

### Follow System UI
7.4.181. get_follow_counts() RPC — returns {followers, following}
7.4.182. is_following() RPC — boolean check
7.4.183. get_public_profile() RPC — profile + follow counts + is_following
7.4.184. Follower/following counts on profile screen
7.4.185. Follow/unfollow buttons with optimistic UI

### User Profile Modal
7.4.186. Bottom-sheet modal triggered by tapping usernames
7.4.187. Avatar, display name, tier, bio display
7.4.188. Stats row: ELO, W-L, Followers, Following
7.4.189. Follow/Unfollow button in modal
7.4.190. ⚔️ RIVAL button in modal
7.4.191. Tappable usernames on hot take cards
7.4.192. Tappable avatars on hot take cards

### Predictions UI
7.4.193. get_debate_predictions() RPC
7.4.194. get_hot_predictions() RPC
7.4.195. Predictions tab in category overlay (🔥 HOT TAKES | 🔮 PREDICTIONS)
7.4.196. Prediction cards with topic, status (LIVE/UPCOMING), count
7.4.197. Side A / Side B vote buttons with ELO
7.4.198. Percentage bar showing vote distribution
7.4.199. Highlights user's pick if already voted
7.4.200. placePrediction() with optimistic UI

### Hated Rivals Mechanic
7.4.201. rivals table (challenger_id, target_id, status, challenger_message)
7.4.202. Max 5 active rivals per user
7.4.203. declare_rival() RPC — creates pending rivalry
7.4.204. respond_rival() RPC — accept/decline
7.4.205. get_my_rivals() RPC — returns JSON array with profile info
7.4.206. Rivals feed on profile screen
7.4.207. Rival cards with avatar, name, ELO, W-L, status
7.4.208. ACCEPT button on incoming requests
7.4.209. RLS policies on rivals table

### Auth Fix
7.4.210. readyPromise pattern — replaces 800ms setTimeout

## 7.5. Remaining Items (211-502+)

The full inventory covers: Couples Court, real-dollar tipping, tournament mode, premium rooms, PPV events, browser extension, embeddable widget, AI sparring partner, short-form video clips, community captains, and all planned features across the 12-month roadmap. These items are tracked in session notes and will be detailed when implementation begins.

---

# 8. USER ACQUISITION & GROWTH STRATEGY

## 8.1. Core Philosophy
8.1.1. Every shared link is an ad
8.1.2. Every user is an unwitting promoter
8.1.3. Intercept arguments where they already happen
8.1.4. Group chats > public platforms
8.1.5. The product IS the growth hack
8.1.6. Speed wins: debate page for trending topics within minutes
8.1.7. Founder touches nothing (Session 18)

## 8.2. Case Studies
8.2.1. **Hotmail** — "Get your free email" footer on every sent email
8.2.2. **Dropbox** — 250MB per referral. Grew 3,900% in 15 months.
8.2.3. **Polymarket** — became the CNN of prediction markets by piggybacking on news
8.2.4. **Airbnb** — scraped Craigslist, emailed owners to cross-post
8.2.5. **Reddit** — founders created fake accounts to make site appear active
8.2.6. **Tinder** — exclusive college parties requiring app download

## 8.3. The Conversion Funnel
8.3.1. Bot finds argument → drops contextual reply with link → user lands on topic page → votes (ungated, one tap) → gets hooked → signs up (Google OAuth one-tap)
8.3.2. RULE: never require signup to consume

## 8.4. Three-Leg Bot Architecture (Sessions 18-20)

### Leg 1 — Reactive
8.4.1. Scan Reddit, X, Discord for existing arguments. Drop contextual replies with links.
8.4.2. Reddit: 10 rotating accounts × 25 comments/day = 250/day. X: 3 accounts × 30 = 90/day. Discord: 15 servers = ~30/day.
8.4.3. ~370/day raw, ~185 visible after moderation. ~3% CTR.

### Leg 2 — Proactive
8.4.4. Scan Google News, ESPN, trending X topics. Auto-generate hot take + debate page. Post to @TheColosseum X.
8.4.5. 5-10 posts/day. 500-5,000 impressions per well-timed post. ~5-8% CTR.

### Leg 3 — Auto-Debate Rage-Click (Session 20)
8.4.6. AI generates FULL debate — picks controversial framing, writes 3 rounds, deliberately scores lopsided.
8.4.7. Creates real debate page with rounds, scorecard, ungated voting.
8.4.8. Generates rage-bait hook → posts to Reddit + Twitter.
8.4.9. **The controversial score IS the marketing.** Selling the outrage, not the app.
8.4.10. Up to 6/day. ~8-12% CTR (rage-bait, people NEED to see the "wrong" result).

### Combined Capacity
8.4.11. Total daily reach: ~6,000-40,000+ impressions across all three legs
8.4.12. Month 1 estimate: ~12-20 new users. Month 12: ~300-600.

### Bot Costs ($100/month budget — actual $6-16/mo)
8.4.13. VPS: $6. Groq AI: $0 (free). Reddit API: $0. Twitter: $0 (free tier). Discord: $0. Proxy (optional): $5-10.

### Platform Rules
8.4.14. Reddit: new accounts ~1 comment/10 min. Shadowbans are silent. Accounts free, rotate when burned.
8.4.15. X/Twitter: 50-100 posts/day before throttling. Leg 1 Twitter scanning disabled (needs $100/mo Basic API).
8.4.16. Discord: respond only to actual arguments. No spam.

### Founder Involvement: ZERO
8.4.17. Does not review comments, approve posts, or choose threads. Machine runs itself.

## 8.5. Built Growth Infrastructure
8.5.1. ✅ Dynamic OG meta tags, watermark, share cards, ungated landing page (Session 14)
8.5.2. ✅ Telegram + Discord bots (Session 15)
8.5.3. ✅ Bot army (Session 19) + Leg 3 engine (Session 20)
8.5.4. ⏳ Chrome extension (when 50+ users), embeddable widget (when content exists)

## 8.6. Industry Trends
8.6.1. Retention-first: 80% of future revenue from 20% of existing customers
8.6.2. Intent > volume: target high-intent users (people already arguing)
8.6.3. Privacy-first: behavioral tracking dead, first-party data essential
8.6.4. Community > ads: Discord, Telegram, niche forums

---

# 9. DESIGN DOCUMENTS & SUPPORTING FILES

## 9.1. Design Docs (complete, not wired)
9.1.1. cosmetics-shop-expanded.json — 45 items
9.1.2. subscription-tier-design.json — Free vs Pro
9.1.3. token-earning-mechanics.json — daily challenges, streaks
9.1.4. paywall-modal-design.json — 4 contextual variants
9.1.5. paywall-modal-mockup.html — visual preview
9.1.6. profile-depth-system.jsx — interactive prototype

## 9.2. Supporting Documents
9.2.1. the-moderator-honest-document.docx — reality check
9.2.2. the-moderator-b2b-industry-analysis.md — 25 buyer industries
9.2.3. b2b-industry-item-lists.md — 250 data items
9.2.4. the-moderator-bot-defense-tiers.md — 3-tier strategy
9.2.5. the-moderator-education-deep-dive.md — education market
9.2.6. the-moderator-pitch-deck.html/.md — investor pitch
9.2.7. colosseum-ring-architecture__1_.md — castle ring architecture

## 9.3. Financial Models
9.3.1. colosseum-financials-session18.xlsx — Original projections
9.3.2. colosseum-financials-v2-botdriven.xlsx — Bot-driven projections (current model)
9.3.3. Note: Bot costs came in at $6-16/mo vs modeled $100/mo. Spreadsheets conservative.

---

# 10. DEBUGGING LESSONS

10.1. **Auth Race Condition (Session 10):** getSession() is async but setTimeout showed content before auth resolved. Never render auth-gated content before auth check completes.

10.2. **Verdict Page Bug (pre-bible era):** Wrong diagnosis: "race condition / script execution order / IIFE timing." Real bug: `sb.rpc(...).catch(() => {})` — Supabase rpc() returns query builder not Promise. `.catch()` threw TypeError that crashed loadDebate(). Outer try/catch silently showed "Failed to load debate." Fix: `try { sb.rpc(...); } catch(e) {}` instead of chaining `.catch()`.

10.3. **Debugging Pattern That Works:** Verify every link in the chain (network, config, RLS, query, render). Narrow to where it actually breaks. Reproduce step-by-step in console.

10.4. **Pattern to Avoid:** Building plausible theories before testing each step. The wrong handoff proposed fixes (DOMContentLoaded wrapper, hardcoding keys) that would have masked the real problem.

10.5. **Auth Race Condition — The Real Fix (Session 23):** The 800ms setTimeout was a band-aid from Session 10. Real fix: `readyPromise` that resolves only when `_checkSession()` actually completes (or placeholder mode activates). Consumer code uses `await ColosseumAuth.ready`. **Pattern: when waiting for async state, use a Promise that resolves on the actual event — never an arbitrary timeout.**

---

*This is the Old Testament. For the living document that guides every session — see the New Testament.*
