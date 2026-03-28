# THE COLOSSEUM — OLD TESTAMENT
### The Reference Vault — Read When Relevant
### Last Updated: Session 117 (March 15, 2026) — Sessions 115-117 build logs added

> **Read the New Testament every session.** This file contains historical build logs, detailed inventories, revenue models, and reference material. Pull specific sections only when the session's work touches those areas.

---

# TABLE OF CONTENTS

1. Session Build Logs (complete history, Sessions 1-24)
2. Revenue Model
3. B2B Data Play
4. Education (separate product)
5. Honest Assessment
6. Research Foundations
7. Complete Inventory (502+ items)
8. User Acquisition & Growth Strategy
9. Design Documents & Supporting Files
10. Debugging Lessons
11. Session Build Logs (Sessions 24-47, summarized from NT cleanup)
12. Session Build Logs (Sessions 48-68, moved from NT consolidation)
13. Session Build Logs (Sessions 115-117)
14. Session Build Logs (Sessions 92-107, moved from NT consolidation Session 117)

> Note: Sessions 69-91 are embedded in NT reference sections (architecture, design, technical notes), not as standalone build logs. Sessions 108+ are the active NT build logs.

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

## 1.24. Session 24 (Mar 2) — Arena Full Build (Known Bug Fix + 4-Mode Debate System)
1.24.1. ✅ **Known bug identified and fixed** — `colosseum-arena.js` was referenced in index.html `<script>` tag but file did not exist in repo (404 on every page load). The big red 🎙️ center nav button led to a completely blank screen. Bible incorrectly marked it ✅.
1.24.2. ✅ **colosseum-arena.js BUILT** — 1,324 lines. Full arena module with CSS injection, 5 views (lobby, mode select, queue, debate room, post-debate), 4 debate modes (Live Audio, Voice Memo, Text Battle, AI Sparring). Integrates with ColosseumWebRTC (live audio, waveform, mute), ColosseumVoiceMemo (record/retake/send), ColosseumShare (post-debate sharing). Auto-populates lobby with Leg 3 auto-debates. Queue timeout offers graceful alternatives. AI sparring uses canned templates (TODO: Groq Edge Function).
1.24.3. ✅ **colosseum-arena-schema.sql CREATED** — 380 lines. 11th SQL file. 4 new tables: `debate_queue`, `arena_debates`, `debate_messages`, `arena_votes`. RLS on all. 10 SECURITY DEFINER RPCs: join_debate_queue, leave_debate_queue, check_queue_status, create_ai_debate, submit_debate_message, get_debate_messages, update_arena_debate, vote_arena_debate, get_arena_feed, expire_stale_queue.
1.24.4. ✅ **SQL pasted into Supabase** — first attempt failed (UNION ALL syntax error). Fixed by wrapping each SELECT branch in parentheses + explicit `::text` casts. Second paste succeeded.
1.24.5. ✅ **Supabase table inventory confirmed** — 29 tables/views live (see New Testament 7.3).
1.24.6. ✅ **Session 23 SQL confirmed pasted** — `rivals` table exists in Supabase, confirming Session 23 migration was applied.
1.24.7. ✅ colosseum-config.js version bumped to 2.2.0. Feature flag added: arena.
1.24.8. ✅ Both testaments updated with Session 24 content.
1.24.9. Files created: colosseum-arena.js, colosseum-arena-schema.sql. Files updated: colosseum-config.js, both testaments.
1.24.10. **SQL LESSON:** PostgreSQL does not allow `ORDER BY` or `LIMIT` inside individual branches of a `UNION ALL` unless each SELECT is wrapped in parentheses. Also: string literals in UNION need explicit type casts (`'arena'::text`) to match column types across branches.

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

# 5. HONEST ASSESSMENT (Updated Session 24)

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
5.11. **Session 24:** The red button works. Arena is built — lobby, matchmaking, 4 debate modes, post-debate flow, 29 tables live, 30+ RPC functions. The app is now feature-complete enough that a stranger landing from a bot link could: browse auto-debates, post a hot take, enter the arena, spar with AI, see a verdict. But user count is still 1. The bot army remains undeployed. Every session adds features; no session has added users.

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

# 7. COMPLETE INVENTORY (502+ Items)

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
7.1.74. Arena screen (fully built Session 24)

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

## 7.5. Session 24 Items (211-250)

### Arena Lobby
7.5.211. Hero CTA with pulsing "ENTER THE ARENA" button
7.5.212. Live debates feed section (from arena_debates)
7.5.213. Auto-debates from Leg 3 as spectatable lobby content
7.5.214. "Disagree with someone?" challenge CTA → navigates to home carousel
7.5.215. Recent verdicts feed section
7.5.216. Placeholder cards when Supabase empty (never a dead screen)
7.5.217. get_arena_feed() RPC — combines arena_debates + auto_debates

### Arena Mode Select
7.5.218. Bottom-sheet overlay with 4 mode cards
7.5.219. Live Audio mode card (🎙️, red accent, "Opponent needed")
7.5.220. Voice Memo mode card (🎤, gold accent, "Async — anytime")
7.5.221. Text Battle mode card (⌨️, blue accent, "Async — anytime")
7.5.222. AI Sparring mode card (🤖, green accent, "✅ Always ready")
7.5.223. Optional topic input field (200 char max)
7.5.224. Cancel button to dismiss

### Arena Matchmaking Queue
7.5.225. join_debate_queue() RPC — FIFO, ±400 ELO range, instant match if opponent waiting
7.5.226. leave_debate_queue() RPC — clears waiting entry
7.5.227. check_queue_status() RPC — polls for match (called every 2s)
7.5.228. Elapsed timer display
7.5.229. ELO display
7.5.230. Cancel button
7.5.231. Timeout handling: live=90s, async=10s, ai=instant
7.5.232. Graceful timeout: offers AI sparring / retry / back to lobby
7.5.233. expire_stale_queue() RPC — clears entries older than 5 min
7.5.234. Unique constraint: one waiting entry per user

### Arena Debate Room
7.5.235. VS banner with avatars, names, ELO for both sides
7.5.236. Round counter display
7.5.237. Spectator count display
7.5.238. Message feed (scrollable, auto-scroll to bottom)
7.5.239. System messages (round transitions, timeouts)
7.5.240. Side A/B message bubbles with labels and round numbers
7.5.241. Text input with char counter (2000 max), enter-to-send
7.5.242. Live Audio: waveform canvas, mute/unmute button, status text. Wires into ColosseumWebRTC.
7.5.243. Voice Memo: record/stop button with pulse animation, timer, retake/send buttons. Wires into ColosseumVoiceMemo.
7.5.244. AI Sparring: typing indicator (3 dots animation), canned response templates (opening/rebuttal/closing), 1-3s simulated delay
7.5.245. Round advancement logic (auto-advance after both sides submit)
7.5.246. Live mode: 120s round timer with warning animation at 15s

### Arena Post-Debate
7.5.247. Victory/defeat screen (🏆 or 💀)
7.5.248. Score display for both sides
7.5.249. Rematch button (re-enters queue with same mode + topic)
7.5.250. Share button (ColosseumShare or Web Share API fallback)
7.5.251. Back to lobby button

### Arena Database
7.5.252. debate_queue table (matchmaking, unique constraint, ELO-based matching)
7.5.253. arena_debates table (4 modes, status flow: pending→live→voting→complete)
7.5.254. debate_messages table (text/voice rounds, AI flag)
7.5.255. arena_votes table (spectator voting, unique per user per debate)
7.5.256. RLS policies on all 4 tables
7.5.257. create_ai_debate() RPC — instant, no queue
7.5.258. submit_debate_message() RPC — validates participant
7.5.259. get_debate_messages() RPC — returns ordered JSON
7.5.260. update_arena_debate() RPC — status/score/winner updates
7.5.261. vote_arena_debate() RPC — upsert + cached count update

## 7.6. Remaining Items (262-502+)

The full inventory covers: Couples Court, real-dollar tipping, tournament mode, premium rooms, PPV events, browser extension, embeddable widget, AI sparring with real AI (Groq), short-form video clips, community captains, and all planned features across the 12-month roadmap. These items are tracked in session notes and will be detailed when implementation begins.

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

10.6. **PostgreSQL UNION ALL Syntax (Session 24):** `ORDER BY` and `LIMIT` inside individual branches of a `UNION ALL` require wrapping each SELECT in parentheses. Also: string literals used in UNION need explicit type casts (e.g. `'arena'::text`) so column types match across branches. Without this, Supabase SQL Editor gives a cryptic `syntax error at or near "UNION"` message pointing at the UNION keyword, not the actual problem.

---

# 11. SESSION BUILD LOGS (Sessions 24-47) — Summarized from NT cleanup

## Session 24 (Mar 2) — Arena Full Build
colosseum-arena.js (1,324 lines, 5 views, 4 modes). colosseum-arena-schema.sql (4 tables, 10 RPCs). SQL UNION ALL bug fixed. Version 2.2.0 with feature flags.

## Session 25 (Mar 2) — Real AI Sparring via Groq
ai-sparring Edge Function deployed (Groq Llama 3.1 70B). Populist personality, full conversation memory, round-aware. GROQ_API_KEY set as Supabase secret.

## Session 26 (Mar 2) — Auth Timeout Fix + Guest Access
Navigator.locks spinner bug fixed (3s timeout). Login redirect removed — anonymous users see full app. Double safety net (3s + 4s). Critical for bot army funnel.

## Session 27 (Mar 2) — 7-Bug Fix Session
Arena feed, leaderboard, predictions RPCs, AI sparring config, auto_debate columns, voted_for, bot_activity all fixed. navigator.locks root blocker identified (final fix in Session 31).

## Session 28 (Mar 4) — Three-Zone Architecture Decision
Static Mirror (Cloudflare Pages) + Plinko Gate + Members Zone (Vercel). JAMstack SSG generator design locked. Platform name locked: "The Colosseum."

## Session 29 (Mar 4) — Land Mine Map Created
THE-COLOSSEUM-LAND-MINE-MAP.md created — 80 entries across 14 sections. NT updated to require LM reading every session.

## Session 30 (Mar 4) — Mirror Generator + Plinko Gate
colosseum-mirror-generator.js built (537 lines). colosseum-plinko.html built (4-step signup). Locks fix v3 attempted (global mock too late — superseded Session 31).

## Session 31 (Mar 4) — Navigator.locks Fix VERIFIED
colosseum-auth.js rebuilt: noOpLock in createClient config, INITIAL_SESSION sole init path, no await inside onAuthStateChange. Verified working. Problem-solving methodology documented.

## Session 32 (Mar 4) — Guest Logic Stripped + Test Walkthrough
6 files modified — all login.html refs → Plinko. Auth gates on settings + profile-depth. Click-by-click test walkthrough created (~180 rows).

## Session 33 (Mar 4) — Mirror Fix + References + Moderator + Analytics
Mirror generator anon key typo fixed. advance_round() bug fixed. Reference/evidence system built (debate_references + 6 RPCs). supports_side column. Analytics layer built (event_log + log_event() + 9 views + daily_snapshots).

## Session 34 (Mar 4) — Wire log_event() + VPS Deploy + Bot Army Live
log_event() wired into 18 RPCs. VPS purchased (DigitalOcean $6/mo). Bot army deployed (PM2, DRY_RUN=true). Discord bot created. Reddit API approval requested.

## Session 35 (Mar 5) — Revenue Pivot + Strategy Docs
THE-COLOSSEUM-WAR-CHEST.md created (B2B intelligence play, auction model, top 100 buyer list). THE-COLOSSEUM-PRODUCT-VISION.md created (visual game layer, ad model, social proof). NT surgical updates for free platform pivot. Market research + honest projections added.

## Session 36 (Mar 5) — Legal Identity + Privacy Policy + Terms of Service
Platform classified as interactive computer service under Section 230. colosseum-privacy.html created (14 sections). colosseum-terms.html rebuilt (17 sections). AI badge snippets designed. COPPA, DMCA, FTC compliance documented. LM-100 through LM-105 added.

## Session 37 (Mar 5) — Legal Paste + Bug Fixes + Repo Cleanup
Legal snippets baked into all 9 HTML pages. AI badges deployed. 4 missing files pushed to GitHub. Login hang fixed (await readyPromise). Leaderboard wired to Supabase. Bebas Neue font fixed.

## Session 38 (Mar 5) — Mirror Hardening + App Shell Recovery
Mirror generator key removed (hardcoded fallback). vercel.json /privacy route fixed. Real app shell recovered from git (was overwritten by mirror output). Memory cleaned.

## Session 39 (Mar 5) — Full Moderator UX + AI Moderator Edge Function
colosseum-moderator-toggle.sql (4 RPCs). Moderator settings UI, arena picker, evidence form, ruling panel, AI auto-ruling, reference polling, post-debate scoring. ai-moderator Edge Function deployed. Supabase CLI installed on VPS.

## Session 40a (Mar 5) — Product Ideas (No Code)
Ranked vs Casual approved. Profile questionnaire reframed. Celebrity events approved. Groups approved. Bot expansion priorities set. Public profile pages discussed.

## Session 40b (Mar 5) — OWASP Top 10 Security Audit
Full audit: 7/10 STRONG after fixes. SRI hashes on 6 HTML files. Security logging (RAISE LOG + security_events + 3 views). Edge Functions hardened (Deno.serve, CORS allowlist). deploy-verify.sh on VPS. cast_vote() and update_profile() log_event() wired.

## Session 41 (Mar 6) — Cloudflare Pages + NT/LM Update
Cloudflare Pages project created (colosseum-f30.pages.dev). Wrangler authenticated on VPS. Test deploy successful. Bot army COLOSSEUM_URL set. Stale Worker deleted.

## Session 42 (Mar 6) — Mirror Generator Live + Bluesky Bot + Groq Fix
Mirror generator deployed (5-min cron, 41 pages/build, --branch=production). Bluesky bot built (leg1 + leg2 files, @atproto/api). Groq model updated to llama-3.3-70b-versatile (old model decommissioned). .gitignore created.

## Session 43 (Mar 7) — Edge Function Fix + Deploy-Verify Fix + Memory Trim
Groq model fixed in both Edge Functions. deploy-verify.sh false positives fixed (3 bugs). Memory edits trimmed 19→5.

## Session 44 (Mar 7) — Ranked vs Casual + Browser Back Button
colosseum-ranked-casual.sql (19th migration). Arena JS updated with ranked/casual picker, Elo display, profile gate. Browser back button wired via pushState.

## Session 45 (Mar 7) — Security Audit Battle Plan
Full defense audit with 6 web searches. SECURITY-AUDIT-BATTLE-PLAN.md created (14 nodes). Two HIGH risk findings: Stripe idempotency + rate limit race condition. Auth Session 31 fix validated.

## Session 46 (Mar 7) — Security Audit Session A + Bot Jitter
XSS fixed in 6 frontend files (escapeHTML). debit_tokens() locked to service_role. VPS hardened (SSH, fail2ban, UFW, chmod, unattended-upgrades). Cloudflare token rotated. Bot jitter fully applied (jitteredRun + all 5 crons wrapped).

## Session 47 (Mar 7) — Security Audit Session B Complete
RLS hardening (20th migration): TO scoping + (SELECT auth.uid()) wrapping. safeRpc() 401 recovery added. Node 7 (rate limit race) closed — already atomic. Node 8 (CSP) closed — already present.

---

---

# 12. SESSION BUILD LOGS (Sessions 48-68) — Moved from NT consolidation

## Session 48 (Mar 7) — Security Audit Session C Complete
12.1.1. ✅ **Stripe webhook hardened** — colosseum-stripe-functions.js rewritten: Deno.serve(), npm:stripe@14, npm:@supabase/supabase-js@2. Raw body via req.text() for HMAC. Idempotency via stripe_processed_events table (INSERT ON CONFLICT DO NOTHING). Migration 21.
12.1.2. ⚠️ **Stripe functions NOT deployed** — templates only. Deploy when activating Stripe for real users.

## Session 49 (Mar 7) — Scenario Audit + Groups Feature
12.2.1. ✅ **12 bugs identified** from 54-scenario code trace.
12.2.2. ✅ **Groups feature built** — colosseum-groups-schema.sql (Migration 22): 2 tables, 8 RPCs, update_group_elo(). colosseum-groups.html. vercel.json /groups route.

## Session 50 (Mar 7) — Bug Fixes + Groups Deployed
12.3.1. ✅ Groups deployed — SQL migration ran, files uploaded, Vercel live.
12.3.2. ✅ Bug 11 FIXED — profile_depth_answers now reach DB via safeRpc.
12.3.3. ✅ Bug 2 FIXED — Guest auth gates added.
12.3.4. ✅ Bug 3 FIXED — getReturnTo() open redirect blocked (LM-142).

## Session 51 (Mar 8) — Bot Army Go-Live + Bluesky Fix
12.4.1. ✅ **DRY_RUN=false flipped** — Bot army LIVE. 298 actions in first 24h.
12.4.2. ✅ Bluesky postHotTake wiring fixed.
12.4.3. ✅ Discord deferred — retention tool, not growth.
12.4.4. ⚠️ Groq TPD cap hit — 100k token/day free tier.

## Session 52 (Mar 8) — Bug Fixes + Edge Function Repo Sync
12.5.1. ✅ Bug 1 (dead config ref), Bug 6 (debate_view→log_event), Bug 7 (AI Sparring 401), Bug 12 (settings persist), Bug 5 (Edge Function paths) — all fixed.

## Session 53 (Mar 8) — Bug 6C Fix + Group Elo Wiring
12.6.1. ✅ placePrediction() auth gate added.
12.6.2. ✅ Migration 23: Group Elo wired — update_arena_debate() calls update_group_elo(). Groups feature complete.

## Session 54 (Mar 8) — Mobile UX + Activity Indicators + Leg 3 Bluesky
12.7.1. ✅ Leg 3 Bluesky wired (flag off until flipped).
12.7.2. ✅ Pull-to-refresh built.
12.7.3. ✅ Share card fix.
12.7.4. ✅ Migration 24: get_category_counts().
12.7.5. ✅ Activity indicators on carousel tiles.

## Session 55 (Mar 8) — Vercel Redeploy Unblocked
12.8.1. ✅ Vercel webhook miss diagnosed — dummy commit re-triggers. All Session 54 files live.

## Session 56 (Mar 8) — Security Audit Session D Complete
12.9.1. ✅ **Rate limit race condition fixed** — pg_advisory_xact_lock in check_rate_limit(). Migration 25.
12.9.2. ✅ **Security audit FULLY COMPLETE** — Sessions A-D all done.
12.9.3. ✅ Test walkthrough rewritten for three-zone architecture.

## Session 57 (Mar 8) — Lemmy Bot Wired
12.10.1. ✅ Lemmy bot files built (leg2-lemmy-poster.js, leg3-lemmy-poster.js). 10 communities.
12.10.2. ✅ bot-config.js + bot-engine.js + .env updated. Flags off until account ready.

## Session 58 (Mar 8) — Lemmy Activation + Bot Config Fixes
12.11.1. ✅ Lemmy poster files moved to correct directory (LM-148).
12.11.2. ✅ ecosystem.config.js rewritten with all env vars.
12.11.3. ✅ Bluesky flags added to bot-config.js (LM-149).

## Session 59 (Mar 8) — Three Critical Bot Fixes
12.12.1. ✅ **CRITICAL: Dead bot URLs fixed** — `debateLandingPath: null` caused broken URLs since go-live. LM-150.
12.12.2. ✅ Lemmy poster files delivered to VPS (were never actually there despite prior sessions claiming so).
12.12.3. ✅ Lemmy un-nested from Bluesky conditionals.
12.12.4. ✅ formatFlags() Lemmy entries added.
12.12.5. ✅ .env confirmed as primary env source (LM-151).
12.12.6. ⚠️ Windows download cache caused stale scp (LM-152).

## Session 60 (Mar 8) — Area 3 Polish: Elo Explainer, Friendly Errors, Shimmer, Toast
12.13.1. ✅ Global showToast() added to colosseum-config.js.
12.13.2. ✅ friendlyError() centralized error translator.
12.13.3. ✅ Elo explainer modal built.
12.13.4. ✅ Shimmer loading skeletons.
12.13.5. ✅ Arena errors wired to friendlyError().
12.13.6. ✅ Payment toasts migrated to showToast().

## Session 61 (Mar 8) — Public Profile Pages
12.14.1. ✅ `/u/username` via Vercel serverless function (api/profile.js). Dynamic OG tags server-side.
12.14.2. ✅ Google-indexable (canonical link, no noindex).
12.14.3. ✅ Design DNA matched. Themed 404 ("GLADIATOR NOT FOUND").
12.14.4. ✅ 5-minute edge cache. Username validation. Avatar URL sanitization (LM-158).

## Sessions 62-65 (Mar 9) — Code Security Audit COMPLETE (80 bugs, 18 files)
12.15.1. ✅ **80 bugs found and fixed across 18 files.** Full OWASP-informed audit.
12.15.2. Sessions 1-10 (52 bugs): config, auth, payments, async, arena, index.html, home, groups, auto-debate, debate-landing.
12.15.3. Sessions 11-13 (15 bugs): plinko (CRITICAL open redirect), profile-depth (CRITICAL XSS), settings (castle defense bypass + SQL migration).
12.15.4. Sessions 14-18 (13 bugs): leaderboard, cards, notifications, scoring, share.
12.15.5. Full repo verification: 89 files checked, all fixes confirmed on GitHub.
12.15.6. Notable: open redirect via backslash bypass, PostgREST filter injection, XSS via JSON.stringify in onclick, localStorage as trusted, direct upsert bypassing castle.

## Session 66 (Mar 10) — Full Guest Walkthrough (Button-by-Button)
12.16.1. ✅ Verified all 4 Session 27 bugs are fixed (AI Sparring, Arena Feed, Leaderboard, Predictions).
12.16.2. 🐛 5 new bugs found: Groups createClient crash, Terms placeholder, Profile pages 404, Mirror section (not a bug), Mirror template text (stale cache).
12.16.3. ✅ Full working list confirmed: auto-debate, guest voting, debate landing, Plinko, login, terms, privacy, auth gates, mirror.

## Session 67 (Mar 10) — Bug Fix Session (5 from Session 66)
12.17.1. ✅ Groups page crash fixed (createClient → ColosseumAuth.supabase).
12.17.2. ✅ Terms placeholder fixed (WHHW LLC).
12.17.3. ✅ Public profile 404 fixed (api/profile.js deployed to correct path).
12.17.4. ✅ Bot army fallback templates expanded (hot takes 5→20, rounds 1→10 per side).
12.17.5. VPS path confirmed: `/opt/colosseum/bot-army/colosseum-bot-army/`.

## Session 68 (Mar 10) — Guest Funnel Verified Clean + Product Decisions
12.18.1. ✅ colosseum-auto-debate.html bare URL fixed (auto-fetches latest debate ID).
12.18.2. ✅ Guest funnel verified CLEAN — every ungated page tested, all CTAs route to Plinko.
12.18.3. 🔑 **Token economy redesigned:** prestige currency (earned only, never purchased), earn events, token predictions (stake on outcomes), real-money betting (long-term, needs licensing).
12.18.4. 🔑 **Profile depth reframed:** self-expression + token earn events, accumulates naturally.
12.18.5. 🔑 **Human verification locked:** Verified Gladiator badge, voice intro for Ranked, profile depth as humanness proxy.

---

*This is the Old Testament. For the living document that guides every session — see the New Testament.*

---

# 13. SESSION BUILD LOGS (Sessions 115-117)

> Sessions 69-82 and 89-114 remain in the NT only. Sessions 83-88 documented in Section 14 (added Session 191 cleanup). These entries are added for completeness as the bug quest closes and the token staking build begins.

## Session 115 (Mar 15) — Bug Quest Batch (Spectator Chat, Pulse Gauge, Share)
13.1.1. ✅ Bug 027 — Spectator chat. Live chat for spectators during debates.
13.1.2. ✅ Bug 028 — Audience pulse gauge. Real-time sentiment visual.
13.1.3. ✅ Bug 033 — Enhanced share flow for post-debate results.
13.1.4. Bug quest score: 31/36 → 32/36.

## Session 116 (Mar 15) — GvG Challenge + Groq Decision (Bug Quest Effectively Complete)
13.2.1. ✅ Bug 029 — Group vs Group Challenge System (full build). `group_challenges` table, 4 SECURITY DEFINER RPCs, Challenges tab in group detail, modal with opponent search, format pills, status badges.
13.2.2. ✅ Bug 012 — Groq Free Tier (CLOSED). Accept template fallback at 3 debates/day. Revisit at 10+/day.
13.2.3. Bug quest score: 32/36 → 34/36. **Bug quest effectively complete** (35/36 — sole remaining is Reddit API external blocker).

## Session 117 (Mar 15) — Token Staking Phase 1 (Questionnaire Tier Foundation)
13.3.1. ✅ SQL: `questions_answered` column on profiles, `guard_profile_columns` updated (now guards: level, xp, streak_freezes, questions_answered), `increment_questions_answered` RPC.
13.3.2. ✅ `colosseum-tiers.js` (NEW) — client-side tier utility. 6 tiers at 0/10/25/50/75/100 questions.
13.3.3. ✅ `colosseum-profile-depth.html` updated — tier banner with rank badge, progress bar, perk summary. Wired into `saveSection()` with double-count prevention. Migration sync for existing users.
13.3.4. Reddit API: still pending (11 days). Reddit tightened commercial API approval since Jan 2026.
13.3.5. Phase 1 complete. Phase 2 (staking backend) next.

---

# 14. SESSION BUILD LOGS (Sessions 83-107) — Moved from NT consolidation (Session 117)

> These session logs were moved from the NT during Session 117 consolidation.
> Sessions 108+ remain in the NT as the active build phase (token staking).
> Sessions 83–88 added to OT during Session 191 repo cleanup (were previously undocumented here).

---

## Session 83 (Mar 12) — Chart 1 Edge Map: Main Funnel (Entry → Plinko → Home)
Full edge trace of the main funnel. 48 edges mapped across 19 files with exact line numbers. Three entry paths documented: Bot Link → Mirror, Direct Visit → Vercel, Public Profile → CTA. Full Plinko Gate signup flow wired (Steps 1–4: Auth → Age → Username → Done). Three unwired edges identified at time of trace: Groups not linked from index.html bottom nav, individual debate history links not rendered on public profile pages, debate history → debate landing page not wired. File inventory: index.html (24 edges), colosseum-plinko.html (10), colosseum-mirror-generator.js (9), colosseum-auth.js (7), colosseum-login.html (5), api/profile.js (5).

## Session 84 (Mar 12) — Chart 2 Edge Map: Arena
Arena edge trace. 42 edges across 9 files. 27 fully wired, 11 unwired, 2 partially wired, 1 bug found. Arena was already a screen inside index.html at this point (not a separate HTML file). Unwired edges primarily in post-debate flow and async debate mode.

## Session 85 (Mar 12) — Chart 3 Edge Map: Category Overlay (Hot Takes + Predictions)
21 edges traced across 3 files (index.html, colosseum-async.js, colosseum-tokens.js) + colosseum-auth.js. 9 wired, 5 unwired. Happy path (open overlay, view takes, vote, react, post, view predictions, vote prediction) all wired. Unwired: challenge flow from hot take, first-vote nudge, prediction outcome resolution UI.

## Session 86 (Mar 12) — Chart 4 Edge Map: Groups
Groups trace. Happy path fully wired: Discover/My Groups/Rankings tabs, group cards, group detail (header + hot takes + members), join/leave toggles, group creation. 5 unwired edges in 2 clusters: (1) posting hot takes inside a group — data model existed but no post UI, (2) full GvG flow and member profile navigation — entirely unbuilt. No bugs found.

## Session 87 (Mar 12) — Chart 5 Edge Map: Profile + Settings
16 internal edges + 2 cross-refs. 8 wired, 8 unwired. Profile Depth wired: section expand, save, token milestone claims at 3/6/12 sections. Settings page wired: all toggles, logout, delete account. Unwired: moderator panel, subscription toggles, notification preferences, most settings persistence. No bugs found — all writes through safeRpc(), all escaping via escHtml().

## Session 88 (Mar 12) — Chart 6 Edge Map: Auto-Debate + Debate Landing + Leaderboard
27 internal edges + 6 cross-refs = 33 total. 15 wired, 8 unwired, 4 partially wired. Auto-debate ungated voting fully wired (fingerprint-based). Debate landing page wired for user-created debates. Leaderboard 3-tab system (Elo/Wins/Streak) wired. Unwired: share card download, audio replay, moderator verdict display, individual debate links from leaderboard rows, post-debate navigation back to category.

## Session 89–91 (Mar 12–13) — Navigation Architecture Doc
Full tap-target navigation map created (THE-MODERATOR-NAVIGATION-ARCHITECTURE.md + full navigation architecture.drawio). Documented every hub (screen/page) and every spoke (tap target) in the app. Cross-referenced the 6-chart edge maps. Identified all planned-but-unwired navigation paths. This doc was superseded by the Wiring Manifest (Session 122) which absorbed its content into the C4-style architecture model.

## Session 15 (Mar ?) — Telegram + Discord Bots Built (DEPLOYMENT-GUIDE, BOT-DEPLOYMENT-GUIDE, SETUP-BOTS, DISCORD-BOT-SETUP, TELEGRAM-BOT-SETUP)
Telegram `/debate` bot and Discord `/settle` bot built as Vercel serverless functions (api/telegram-webhook.js, api/telegram-setup.js, api/discord-interactions.js, api/discord-setup.js). Both created inline polls with debate links and Colosseum branding. Zero npm dependencies — native Node.js Ed25519 for Discord signature verification. DEPLOYMENT-GUIDE.md documented the full pre-TS-migration file inventory and deployment steps for Vercel + VPS. SETUP-GUIDE.md documented bot army VPS setup from scratch (buy VPS → create accounts → paste API keys → run deploy script). **Outcome:** Discord killed Session 111 — too much moderation overhead, zero conversion. Telegram deferred indefinitely — never launched. Both setup/deployment docs obsolete after TS migration (Session 125–131) replaced all referenced filenames. All five docs deleted Session 191 cleanup.

## Session ~Move 3 — Rate Limiting + CORS + Sanitization (MOVE3-HUMAN-ACTIONS)
MOVE3-HUMAN-ACTIONS.md was a 5-step human checklist for deploying rate limiting, CORS hardening, and input sanitization. Steps: (1) paste moderator-move3-sanitize-ratelimit.sql into Supabase, (2) replace vercel.json with security headers (CSP, HSTS + 7 others), (3) update Supabase CORS allowlist, (4) verify Edge Function CORS, (5) smoke test. All work completed and baked into the DB and repo. Checklist has no future use. SQL file (moderator-move3-sanitize-ratelimit.sql) remains in repo as migration record. Doc deleted Session 191 cleanup.

---

## Session 92 AUDIT SUMMARY

Full codebase audit via Claude Code CLI. 120+ issues found across 43 files. 29 critical fixes shipped in one PR (21 files, +250/-735 lines, net 485 lines deleted).

**Security (9 fixes):** escapeHTML consolidated and applied to all innerHTML paths, XSS vectors closed, open redirect blocked, UUID validation added to .or() filters.

**Bugs (9 fixes):** readyPromise hang on missing auth resolved, random ranked winner bug fixed, prediction math corrected, placeholder text in production removed.

**Performance (4 fixes):** Stripe.js and home.js removed from index.html (not needed there), font loading optimized, notification init deferred.

**Dead code (4 cleanups):** Lemmy files deleted from repo, dead feature flags removed, token purchase packages removed (tokens are earn-only).

**Quality (3 fixes):** escHtml consolidated to single source, console.logs stripped, Number() casts applied to all numeric innerHTML.

---

## SessionS 93-94 SUMMARY

**Session 93:** Template fallback quality fix. `fallbackAutoDebateRound()` in ai-generator.js had only 3 static templates per side — every template debate read identically. Replaced with 5 openers × 5 middles × 5 closers = 125 combos per side, randomly selected by round position. Deployed to VPS.

**Session 94: Funnel audit + bot army fixes.** Walked the live funnel from Bluesky post → mirror → signup. Found and fixed:

1. **Auto-debate frequency reduced** from 6/day to 3/day (`.env` change) — more debates get real Groq AI instead of template fallback.
2. **Mirror analytics wired** — `colosseum-analytics.js` script tag added to mirror generator `pageFooter()`. All mirror pages now fire `page_view` events.
3. **ecosystem.config.js cleaned** — Lemmy credentials and flags removed. All platform flags now come exclusively from `.env`.
4. **Leg 2 URLs fixed** — were all pointing to homepage (`/`), now point to category pages (`/category/sports.html`, etc.) with category-to-slug mapping.
5. **Bluesky profile branded** — display name set to "The Colosseum" + bio via `agent.upsertProfile()`. No longer blank.
6. **Known remaining:** Repetitive "Nobody's ready to talk about this:" openers on ~60% of posts — **fixed Session 95**.

**Files changed (VPS only):**
- `supabase-client.js` — CATEGORY_TO_SLUG mapping, Leg 2 URLs → category pages
- `colosseum-mirror-generator.js` — analytics script tag in pageFooter()
- `ecosystem.config.js` — stripped Lemmy creds/flags, platform flags from env block
- `.env` — AUTO_DEBATE_MAX_PER_DAY=3, removed duplicate entry

---

## Session 95 SUMMARY

**Bot army final fixes — bot work is DONE.**

1. **bot-config.js Bluesky wiring synced to GitHub** (LM-149 pattern). The VPS copy had been patched by `setup-bluesky.js` back in Session 42, so Bluesky image posting was already working on the live bot. But the GitHub repo copy was missing the `bluesky:` config section, the three Bluesky flags (`leg1Bluesky`, `leg2Bluesky`, `leg3BlueskyPost`), and the Bluesky credential validation. If the VPS ever refreshed from GitHub, Bluesky would have silently broken. Now synced.
2. **Repetitive fallback openers fixed.** `fallbackHotTake()` in `ai-generator.js` had 5 templates where 4 were generic filler with no headline context. Replaced with 10 diverse templates — all incorporate the actual headline, all sound distinct. Deployed to VPS.
3. **maxPerDay default updated** in bot-config.js from 6→3 (matching Session 94 .env change, so the code default now matches).

**Bot army is now fully autonomous.** No more bot build work. Only remaining bot action: flip Reddit flag in `.env` when API approval arrives.

**Files changed:**
- `bot-config.js` — Bluesky config section + flags + validation added, maxPerDay default 6→3 (GitHub + VPS)
- `ai-generator.js` — 10 headline-aware fallback hot take templates (VPS only)

---

## SessionS 96-97 SUMMARY

**Session 96: Mirror fixes.**
1. **Cloudflare Web Analytics live** — beacon token created, injected into mirror generator `pageFooter()`, tracking all 60 mirror pages.
2. **Mirror generator was broken** — cron runs from `/opt/colosseum/`, not the bot army dir. File on VPS was stale, logs dir didn't exist. Fixed: copied updated file, created logs dir, verified manual deploy.
3. **Fresh debate content on mirror** — 50 debates with real Groq arguments now live, replacing stale build.
4. **Reddit API still pending** (day 10+).

**Session 97: Product feature wiring — 5 edges closed.**
1. **E279/E280 More Debates discovery** (`colosseum-auto-debate.html`) — after voting, page now shows 6 more debates at the bottom (same category prioritized). Closes the dead end in the bot funnel.
2. **E83 Challenge → Arena** (`colosseum-async.js`) — successful challenge now navigates to arena and auto-starts AI sparring with the challenged topic. The emergence loop (Post → React → Challenge → Debate) now actually closes.
3. **E144/E145/E149 Post-debate engagement** (`colosseum-arena.js`) — "ADD RIVAL" button on post-debate screen (human opponents only), opponent name clickable → profile modal. Both degrade gracefully for AI sparring. Blocked on `check_queue_status` RPC returning `opponent_id` for real matches.
4. **Groq fallback decision:** live with template fallback for now (not worth upgrading plan at current traffic).

**Files changed (GitHub):**
- `colosseum-auto-debate.html` — More Debates section + CSS + loadMoreDebates()
- `colosseum-async.js` — _enterArenaWithTopic() after challenge success
- `colosseum-arena.js` — opponentId capture, rival button, opponent click, arena-clickable-opp CSS

---

## Session 98 SUMMARY

**Zero-traffic diagnosis + two critical fixes.**

1. **Cloudflare Web Analytics confirmed 0 visits** to the mirror (`colosseum-f30.pages.dev`). Bot army was running perfectly (39 Bluesky posts/day, 280 debates, 29 auto-debates) but nobody saw any of it.
2. **Root cause: Bluesky account (`wolfe8105.bsky.social`) had 0 followers and Leg 1 was disabled.** Leg 2/3 posts went into a void with no discovery mechanism. Leg 1 (reactive replies to trending argument posts) is the audience builder.
3. **Leg 1 Bluesky ENABLED** — `LEG1_BLUESKY_ENABLED=true` in `.env`. 10 replies/day to trending argument posts, 3 per cycle, 5s delay between replies. Conservative limits to avoid spam detection.
4. **Category classifier deployed** — `lib/category-classifier.js` on VPS, wired into `ai-generator.js`. 60% of auto-debates were landing in "general" because `fallbackAutoDebateSetup()` hardcoded `category: 'general'`. Now uses keyword matching against headline to route to sports/politics/entertainment/etc. Word-boundary regex prevents false positives on short keywords.
5. **Lemmy errors confirmed dead** — flags were already false in `.env`, error log entries were pre-restart from March 12.

**Files changed (VPS only):**
- `.env` — `LEG1_BLUESKY_ENABLED=true`
- `lib/category-classifier.js` — NEW file, keyword-based headline→category router
- `lib/ai-generator.js` — added `require('./category-classifier')` line 1, replaced `category: 'general'` with `category: classifyCategory(headline)`

---

## Session 100 SUMMARY

**Ideas Master Map + Debate Table Consolidation Plan.**

1. **Ideas Master Map created** — `THE-COLOSSEUM-IDEAS-MASTER-MAP.docx` in repo. Every unbuilt idea from NT, OT, Session 40, Product Vision, War Chest, War Plan, and Reference Arsenal Blueprint. Organized by structural impact: Part 1 = cross-cutting systems (6 systems touching 3+ sections), Part 2 = contained features by section. Nothing prioritized, nothing cut — raw inventory.
2. **Debate table consolidation identified** — Three parallel debate tables exist: `debates` (legacy), `arena_debates` (active), `async_debates` (separate system). Legacy `debates` table has 5 FK dependents (debate_votes, predictions, reports, debate_references, moderator_scores). 8 RPCs in wire-log-event.sql + 3 in move3 still reference `public.debates`. 2 direct client queries in colosseum-scoring.js (castle defense violations). `winner` column type mismatch: legacy uses UUID, arena uses TEXT.
3. **Consolidation plan written** — `DEBATE-TABLE-CONSOLIDATION-PLAN.md` in repo. 12-step execution plan for Claude Code. Steps 1-3 + 12 = SQL in Supabase Editor (Pat). Steps 4-11 = file changes (Claude Code). Target: single canonical table `arena_debates`.
4. **New feature idea (not in Ideas Master Map):** AI-generated post-debate summary — who won the crowd, what references landed, turning point. Content for mirror pages, replays, SEO.

**Files added to repo:**
- `THE-COLOSSEUM-IDEAS-MASTER-MAP.docx`
- `DEBATE-TABLE-CONSOLIDATION-PLAN.md`

---

## Session 101 — DEBATE TABLE CONSOLIDATION

**Goal:** Eliminate legacy `debates` table. Single canonical table: `arena_debates`.

**Execution order:**
1. Pat runs SQL Steps 1-3 in Supabase (expand schema, migrate data, re-point FKs)
2. Claude Code runs Steps 4-11 (file changes, commit, push)
3. Verify Vercel deploy works
4. Pat runs SQL Step 12 (DROP TABLE)

**Status:** Complete. Legacy `debates` table dropped. All post-success NT updates applied (Session 102).

---

## Session 102 — DEAD END FIXES + HOUSEKEEPING

**Goal:** Fix every dead-end navigation path that bot traffic hits, fix bugs, clean up repo.

**Via Claude Code — 3 commits pushed:**

1. **Leaderboard rows** — `data-username` + event delegation → `/u/username` profile navigation
2. **Auto-debate page** — profile navigation already wired; "More Debates" discovery loop already existed
3. **Debate-landing category pill** — dead `<div>` → clickable `<a>` linking back to main app
4. **Groups member rows** — `data-username` + event delegation → `/u/username`
5. **Hot take avatars** — navigate to `/u/username` instead of modal
6. **Rival avatars** — same pattern, `data-username` for profile nav
7. **Hot take share button** — apostrophe in topic text broke `onclick` attribute (XSS-adjacent)
8. **guard_profile_columns trigger** — verified protecting 4 columns: level, xp, streak_freezes, questions_answered (Session 117)
9. **GitHub cleanup** — deleted stray UUID HTML file, `DEBATE-TABLE-CONSOLIDATION-PLAN.md`, `session-102-guard-trigger-verify.sql` committed for audit trail

**Files changed:** `colosseum-leaderboard.js`, `colosseum-async.js`, `colosseum-debate-landing.html`, `colosseum-groups.html`, `CLAUDE.md`, `THE-COLOSSEUM-NEW-TESTAMENT.md`

---

## Session 103 — DEBATE-LANDING BACKEND PERSISTENCE

**Goal:** Replace localStorage-only voting on `colosseum-debate-landing.html` with real Supabase backend.

**SQL (Supabase Editor):**
1. Created `landing_vote_counts` table (topic_slug PK, yes_votes, no_votes, timestamps)
2. RLS enabled, no policies (deny all direct access — RPC only)
3. `cast_landing_vote(p_topic, p_side)` — SECURITY DEFINER, upsert with atomic increment, returns updated counts
4. `get_landing_votes(p_topics)` — SECURITY DEFINER, batch fetch by slug array
5. Both RPCs granted to `anon` role (anonymous voting is the entire funnel)
6. Seed data inserted: 4 demo debates with existing hardcoded counts

**File changes (`colosseum-debate-landing.html`):**
1. Supabase JS CDN added to `<head>`
2. Lightweight Supabase client init (no auth session, no token refresh)
3. `castVote()` calls `cast_landing_vote` RPC, updates debate object with returned counts
4. Init fetches real counts via `get_landing_votes` on page load, overwrites hardcoded numbers
5. `voteCounted` flag prevents double-counting between optimistic render and backend response
6. Graceful fallback: if Supabase fails, hardcoded seed data still displays
7. PLACEHOLDER at L507 removed

---

## Session 103 — DOC CLEANUP

**Goal:** Lean and mean. Update living docs, delete completed/stale docs, write prioritized roadmap.

**Updated:** NT (this file), Land Mine Map, CLAUDE.md

**Deleted from repo (17 files):**
- `SESSION-1-BUG-FIXES.md`, `SESSION-102-TASK-LIST.md`, `CLAUDE-CODE-FIX-LIST.md`, `MOVE3-HUMAN-ACTIONS.md` — completed work
- `SECURITY-AUDIT-BATTLE-PLAN.md`, `SECURITY-AUDIT-BATTLE-PLAN-v1-sonnet.md` — audit complete
- `THE-COLOSSEUM-SESSION-40-IDEAS.md` — superseded by Ideas Master Map
- `THE-COLOSSEUM-DEFENSE-MAP.md`, `THE-COLOSSEUM-IMPLEMENTATION-MAP.md` — Session 27, stale
- `THE-COLOSSEUM-TEST-WALKTHROUGH.md`, `THE-COLOSSEUM-TEST-WALKTHROUGH-SESSION32.docx` — stale
- `CHART-1-EDGE-MAP.md`, `CHART-2-EDGE-MAP.md`, `session-85-chart3-trace.md`, `session-86-chart4-trace.md`, `session-87-chart5-trace.md`, `session-88-chart6-trace.md` — draw.io project complete
- `session-102-guard-trigger-verify.sql` — one-time verification

**Remaining docs (15 files):** NT, OT, LM, CLAUDE.md, War Chest, War Plan, Product Vision, Ideas Master Map, Feature Room Map, Token Staking Plan, Bot Deployment Guide, Deployment Guide, Setup Guide, Telegram Bot Setup, Discord Bot Setup

---

## Session 104 — EDGE MAP AUDIT + DEBATE-LANDING PERSISTENCE

**Goal:** Fix dead ends that bot traffic hits, audit full unwired edge inventory.

1. **Auto-debate category pill fix** — href changed from `/colosseum-plinko.html` to `/` (home). Pushed to GitHub.
2. **Edge map update** — 8 edges marked WIRED (E173, E213, E217, E276, E277, E306, E320, E327). 3 stale (E279, E280, E308). UNWIRED count: 41→30 real gaps.
3. **Debate-landing backend persistence rewrite** — Supabase SDK wired, `castVote()` calls `cast_landing_vote` RPC, `loadBackendCounts()` fetches real counts on load. Optimistic render + `voteCounted` flag.
4. **Bug catch** — two field name mismatches (`a/b` vs `yes/no`, `yes_count` vs `yes_votes`), fixed and delivered corrected file.
5. **Full ranked UNWIRED edge inventory** — 30 real gaps organized into 3 tiers by impact.

**Files changed:** `colosseum-debate-landing.html`, `colosseum-auto-debate.html`

---

## Session 105 — WIRABLE EDGES COMPLETE

**Goal:** Wire every remaining edge that doesn't require new feature development.

1. **Full re-audit** of all 30 unwired edges against live code — confirmed most were already wired in Sessions 102-104.
2. **E211 wired** — Group hot take posting. Composer UI (textarea + POST button) injected at top of hot takes tab, auth-gated, calls existing `create_hot_take` RPC with `p_section: groupId`.
3. **E246 wired** — Settings bio edit. Bio textarea added between Username and Email rows, 160 char max with live counter.

**Updated edge inventory:** 30 → 28 unwired. All 28 remaining are unbuilt features, not broken wiring.

**Files changed:** `colosseum-groups.html`, `colosseum-settings.html`

---

## Session 106 — FEATURE ROOM MAP

**Goal:** Place every idea from the Ideas Master Map (~90 items) into the existing 6-chart edge map architecture.

1. **Feature Room Map created** — `COLOSSEUM-FEATURE-ROOM-MAP.md` in repo.
2. **6 existing rooms** (Charts 1-6) absorb ~45 new features as furniture.
3. **7 new rooms** identified: Reference Library (A), Token Staking (B), Marketplace (C), DM Inbox (D), Tournaments (E), Notifications Hub (F), B2B Dashboard/API (G).
4. **~14 homeless features** placed with best guesses.
5. **Reference Library (New A)** is the most connected new room — spine of the reference economy.
6. **Token Staking (New B)** is the highest-impact missing feature per the Ideas Master Map.

**No code shipped. No SQL. Planning session only.**

---

## Session 107 — DEAD END FIXES COMPLETE

**Goal:** Close all 5 draw.io flagged dead ends.

1. **Category pill fix** — debate-landing.html and auto-debate.html pills now link to `/?cat=slug`. Added `?cat=` query param handler in index.html.
2. **debate-landing.html vote persistence** — created `landing_votes` table with fingerprint dedup, two SECURITY DEFINER RPCs (`cast_landing_vote`, `get_landing_vote_counts`), RLS enabled with no policies.
3. **Verified three other flagged dead ends are non-issues** — leaderboard rows already wired, auto-debate discovery loop already built, profile navigation not applicable on landing pages.

**All five draw.io dead ends resolved.**

**New Supabase objects:** Table `landing_votes`, index `idx_landing_votes_dedup`, RPCs `cast_landing_vote` and `get_landing_vote_counts`.

**Files changed:** `colosseum-debate-landing.html`, `colosseum-auto-debate.html`, `index.html`

---

## Session 108 — TOKEN STAKING & POWER-UP PLAN

**Goal:** Design the complete token spend loop — staking + power-ups + questionnaire gate.

1. **Full plan document created** — `TOKEN-STAKING-POWERUP-PLAN.docx` in repo.
2. **Design decisions locked:** Parimutuel pool split, pre-debate only, debaters can self-stake, free-form amounts, all 4 power-ups at launch (2x Multiplier, Silence, Shield, Reveal), slots gated by questionnaire tier.
3. **5-tier questionnaire gate:** Tier 1 (10 Qs, 5 token max, 0 slots) → Tier 5 (100 Qs, unlimited staking, 4 slots, all power-ups).
4. **6-phase implementation order:** Phase 1 questionnaire foundation → Phase 2 staking backend → Phase 3 staking frontend → Phase 4 power-up backend → Phase 5 power-up frontend → Phase 6 polish.
5. **Database schemas defined:** `stakes` table, `power_up_inventory` table, `questions_answered` column on profiles.
6. **Castle defense compliant:** All writes through SECURITY DEFINER RPCs, `resolve_stakes` service-role only, `questions_answered` added to `guard_profile_columns` trigger (Session 117).

**No code shipped. No SQL. Planning session only.**

**Open decisions carried forward (unresolved as of Session 191):**
- Platform rake: 0% at launch. Revisit if token inflation becomes a problem — obvious fix is 5–10% rake on staking pools as a token sink.
- Silence power-up in text debate mode: unresolved — options are block opponent typing for 10s, or make it audio-only. Needs testing.
- Power-up pricing (15/25/20/30 tokens): starting points only. Requires real earn-rate data before finalizing.

**SOURCE DOC:** `TOKEN-STAKING-POWERUP-PLAN.docx` — full spec (Session 105). Phases 1–5 complete (Sessions 108–124). Phase 6 (polish/balance) open. Doc deleted Session 191 cleanup.

---

## Session 109 — TOKEN STAKING PHASE 2 (BACKEND)

**Goal:** Build the staking backend from TOKEN-STAKING-POWERUP-PLAN.docx Phase 2.

1. **SQL migration** — `stakes` table, `stake_pools` table, 3 SECURITY DEFINER RPCs: `place_stake`, `get_stake_pool`, `settle_stakes`. Parimutuel pool model. Pre-debate only. Rate-limited.
2. **colosseum-staking.js** — NEW module. `getPool()`, `renderStakingPanel()`, `wireStakingPanel()`, `settleStakes()`. Renders staking UI with token input, side picker, pool visualization.
3. **colosseum-arena.js** — Pre-debate screen added (`showPreDebate()`). Loads staking panel between matchmaking and room entry. Staking settlement wired into `endCurrentDebate()`.

**Files changed:** `colosseum-staking.js` (new), `colosseum-arena.js`, SQL migration

---

## Session 110 — POWER-UPS FRONTEND (PHASE 5)

**Goal:** Build the power-up frontend from TOKEN-STAKING-POWERUP-PLAN.docx Phase 5.

1. **colosseum-powerups.js** — NEW module. 4 power-ups: 2x Multiplier (passive), Silence (10s mute), Shield (block reference challenge), Reveal (see opponent loadout). Inventory management, equip/unequip, activation handlers.
2. **Pre-debate loadout** — Power-up loadout panel renders in pre-debate screen. Equip from inventory before entering room.
3. **In-debate activation bar** — Horizontal bar above message stream. Tap to activate Silence/Shield/Reveal. Visual effects: silence countdown overlay, shield indicator badge, reveal popup showing opponent's equipped items.
4. **Power-up state cleanup** — `activatedPowerUps` Set, `shieldActive` flag, `silenceTimer` ref. All cleaned up in `renderLobby()` and `endCurrentDebate()`.
5. **Staking settlement with multiplier** — `settleStakes()` accepts multiplier parameter. 2x Multiplier power-up doubles staking payout on win.

**Files changed:** `colosseum-powerups.js` (new), `colosseum-arena.js`

---

## Session 111 — BUG QUEST BATCH + DISCORD KILLED

**Goal:** Continue bug audit, kill dead channels.

1. **3 bugs fixed** — Score: 21/36 → 24/36.
2. **Discord killed permanently** — `LEG1_DISCORD_ENABLED` hardcoded to `false` in bot-config.js. Discord bot code stays in repo but never runs. Do not suggest Discord as a channel.

**Files changed:** `bot-config.js`, plus bug fix files

---

## Session 112 — BUG QUEST BATCH + IDEAS PARKED

**Goal:** Continue bug audit, park new ideas.

1. **3 bugs fixed** — Bugs 025 (hot takes expand), 031 (password reset), 034 (confirmed already built). Score: 24/36 → 27/36.
2. **Two new ideas parked (not built):**
   - *Timed Powerup Data Harvests* — Colosseum cross-cutting system. Powerup activation prompts are disguised B2B data questions. Roadmapped after bug quest.
   - *Data Harvesting Game Studio* — SEPARATE venture (separate LLC, Supabase, everything). Clone top free mobile games via Unity reskin, replace IAP with data questions. $1k budget. Parked.

**Files changed:** `colosseum-async.js`, `colosseum-settings.html`

---

## Session 113 — PROFILE DEPTH + TRANSCRIPT + PREDICTIONS

**Goal:** Close bugs 030, 023, 026.

1. **Bug 030 — Profile depth.** Emoji avatar picker (20 options, saves as `emoji:⚔️` in avatar_url), inline bio edit (500 char), followers/following list modal with tap-to-profile.
2. **Bug 023 — Post-debate transcript.** "📝 TRANSCRIPT" button in post-debate actions. Opens bottom sheet with full message history — side-colored bubbles (blue A, red B), round dividers, scrollable.
3. **Bug 026 — Standalone prediction creation.** New `prediction_questions` and `prediction_picks` tables. 3 SECURITY DEFINER RPCs: `create_prediction_question`, `get_prediction_questions`, `pick_prediction`. Rate-limited (10 creates/hr, 30 picks/hr). CREATE button in predictions tab, bottom sheet form, optimistic UI with server sync.

**Score: 27/36 → 30/36.**

**New Supabase objects:** Tables `prediction_questions`, `prediction_picks`. RPCs `create_prediction_question`, `get_prediction_questions`, `pick_prediction`.

**Files changed:** `index.html`, `colosseum-auth.js`, `api/profile.js`, `colosseum-arena.js`, `colosseum-async.js`, `colosseum-prediction-questions.sql`

---

## Session 114 — SPECTATOR VIEW PATH + PREDICTIONS FIX

**Goal:** Bug 024 (spectator view path), verify Bug 026 prediction flow, fix predictions tab visibility.

1. **Bug 024 — Spectator view path.** New standalone page `colosseum-spectate.html`. Loads debate via `get_arena_debate_spectator` RPC. Message stream with round dividers, 5-second auto-polling for live debates, vote buttons, spectator count via `bump_spectator_count`, share buttons.
2. **Predictions tab visibility fix.** `overlay-predictions-tab` ID rename bug fixed.
3. **Bug 026 verified end-to-end.**

**Score: 30/36 → 31/36.**

**New Supabase objects:** RPCs `get_arena_debate_spectator`, `bump_spectator_count`.

**Files changed:** `colosseum-spectate.html` (new), `colosseum-spectate-rpcs.sql` (new), `colosseum-arena.js`, `index.html`

---

## Session 115 — BUG QUEST BATCH (SPECTATOR CHAT, PULSE GAUGE, SHARE)

**Goal:** Close bugs 027, 028, 033.

1. **Bug 027 — Spectator chat.** Live chat for spectators during debates.
2. **Bug 028 — Audience pulse gauge.** Real-time sentiment visual showing which side is winning.
3. **Bug 033 — Enhanced share.** Improved share flow for post-debate results.

**Score: 31/36 → 32/36.**

**Files changed:** `colosseum-spectate.html`, `colosseum-arena.js`, `colosseum-share.js`

---

## Session 116 — GVG CHALLENGE + GROQ DECISION (BUG QUEST EFFECTIVELY COMPLETE)

**Goal:** Close bugs 029 (Groups GvG) and 012 (Groq tier decision).

1. **Bug 029 — Group vs Group Challenge System.** SQL: `group_challenges` table, status flow (pending→accepted→declined→expired→live→completed), 48-hour auto-expiry. 4 SECURITY DEFINER RPCs: `create_group_challenge`, `respond_to_group_challenge`, `resolve_group_challenge`, `get_group_challenges`. HTML/JS: Challenges tab, GvG button, full modal with opponent search, topic input, format pills (1v1/3v3/5v5).
2. **Bug 012 — Groq Free Tier (CLOSED).** Decision: Accept template fallback. At 3 debates/day the free tier rarely hits.

**Score: 32/36 → 34/36. Bug quest effectively complete.** Sole remaining: Bug 014 (Reddit API approval — external blocker).

**New Supabase objects:** Table `group_challenges`. RPCs `create_group_challenge`, `respond_to_group_challenge`, `resolve_group_challenge`, `get_group_challenges`.

**Files changed:** `colosseum-groups.html`, `colosseum-gvg-challenge.sql` (new)

---

## Session 117 — TOKEN STAKING PHASE 1 (QUESTIONNAIRE TIER FOUNDATION)

**Goal:** Begin token staking build. Phase 1: questionnaire tier system.

1. **SQL migration.** Added `questions_answered` integer column to `profiles` (default 0). Updated `guard_profile_columns` trigger (now guards: level, xp, streak_freezes, questions_answered). Created `increment_questions_answered(p_count)` SECURITY DEFINER RPC.
2. **colosseum-tiers.js (NEW).** 6 tiers: Unranked (0), Spectator+ (10), Contender (25), Gladiator (50), Champion (75), Legend (100). `getTier(qa)`, `getNextTier(qa)`, `renderTierBadge(qa)`, `renderTierProgress(qa)`.
3. **colosseum-profile-depth.html.** Tier banner UI added. `saveSection()` wired to `increment_questions_answered`. Init migration sync on page load.
4. **Threshold note:** Current questionnaire has 39 questions — users can reach Tier 2 (25) but not Tier 3+ (50/75/100). Thresholds recalibrated Session 164.

**New Supabase objects:** Column `profiles.questions_answered`. RPC `increment_questions_answered`. Trigger `guard_profile_columns` updated.

**Files changed:** `colosseum-tiers.js` (new), `colosseum-profile-depth.html`, `colosseum-token-staking-phase1.sql` (new)

---

## Session 118 — STAKING & POWER-UP AUDIT (4 RPC BUGS FIXED)

**Goal:** Begin Phase 2 staking backend. Discovered Phases 2-5 were already built (Sessions 109-110). Audited all RPCs and fixed 4 bugs.

**Bug 1 — `place_stake` column mismatch (LM-174).** `tokens` → `token_balance`.
**Bug 2 — `settle_stakes` join mismatch (LM-175).** `pool_id` → `debate_id`.
**Bug 3 — `buy_power_up` column mismatch (LM-174).** `tokens` → `token_balance`.
**Bug 4 — `activate_power_up` missing boolean (LM-176).** Added `activated = true`.

**Phases 1-5 COMPLETE. Phase 6 (Polish & Balance) is next.**

**No new files. SQL-only fixes (4 RPCs patched in Supabase).**

---

> Sessions 119-120: Not in project chat record.

## Session 121 — ARENA NAVIGATION FIX + STAKING TEST START

**Goal:** Fix arena popstate bugs, fix AI debate status for staking, begin staking end-to-end test.

1. **Popstate rewrite (LM-183).** Removed `_skipNextPop` boolean. New pattern: forward → `replaceState`, back/cancel → `history.back()`. Arrow function wrapping required on listeners.
2. **AI debate status fix (LM-184).** `create_ai_debate` RPC: `'live'` → `'pending'`. Flip to `'live'` happens in `enterRoom()` only.
3. **Staking test started.** Pre-debate screen renders, stake placed (tokens 55→50). Settlement not yet tested.

**Files changed:** `colosseum-arena.js` (GitHub), `create_ai_debate` RPC (Supabase)

---

## Session 122 — WIRING MANIFEST COMPLETE + TYPESCRIPT MIGRATION PLAN

**Goal:** Complete the Wiring Manifest, plan TypeScript migration.

1. **Wiring Manifest completed** — 1,546 lines. All 8 sections. Validated by tracing AI Sparring end-to-end.
2. **TypeScript Migration Plan written** — 6-phase plan: Phase 0 → Phase 6.
3. **Five-runtime technical debt identified.** Frontend (vanilla JS), Bot Army (Node CommonJS) are the migration targets.

**New files:** `THE-MODERATOR-WIRING-MANIFEST.md`, `TYPESCRIPT-MIGRATION-PLAN.md`

---

## Session 123 — STAKING END-TO-END TEST (5 BUGS FIXED)

**Goal:** Complete staking end-to-end test.

1. **Double `settle_stakes` call (LM-182).** Deleted duplicate Session 109 block from `endCurrentDebate()`.
2. **`stake_pools.winner` column missing (LM-177).** Added via ALTER TABLE.
3. **`claim_action_tokens` dead `debates` table reference.** Removed.
4. **`claim_action_tokens` log_event signature mismatch (LM-178).** Fixed to named parameters.
5. **End-to-end staking test PASSED.**

**Files changed:** `colosseum-arena.js` (GitHub), `settle_stakes`/`claim_action_tokens` RPCs (Supabase), `stake_pools` table (Supabase)

---

## Session 124 — 3 RPC BUGS FIXED (CONSOLE CLEAN)

**Goal:** Fix remaining console errors from Session 123.

1. **`get_my_milestones` + `claim_milestone` — column "action" (LM-179).** Fixed to `earn_type`. Milestone keys stored as `'milestone:key_name'` pattern in `earn_type`, `reference_id` NULL.
2. **`get_category_counts` 404 (LM-180, LM-181).** Fixed bare `record` return → `RETURNS TABLE(...)`. Fixed legacy `public.debates` reference → `arena_debates`.

**Console status:** Clean. SQL-only fixes (3 RPCs patched in Supabase).**

---

## Session 125 — TYPESCRIPT MIGRATION PHASE 0 (BUILD INFRASTRUCTURE)

**Goal:** Add TypeScript, Vite, and build step without changing existing code.

1. **6 files created.** `package.json`, `tsconfig.json` (strict mode, ES2022), `vite.config.ts` (multi-page), `src/types/globals.d.ts`, `src/types/database.ts`, `.gitignore` updated.
2. **Verified.** `npm install` clean, `tsc --noEmit` passes.
3. **Vercel unchanged.** `vercel.json` still `buildCommand: null`.

---

## Session 126 — TYPESCRIPT PHASES 1-2 (FOUNDATION + DEFENSE)

**Goal:** Migrate foundation and defense modules.

1. **Phase 1 — Foundation.** `src/config.ts`, `src/auth.ts` (typed `safeRpc<T>`).
2. **Phase 2 — Defense.** `src/tiers.ts`, `src/tokens.ts`, `src/staking.ts`, `src/powerups.ts`.
3. **All 8 files compile clean** — strict mode.

---

## Session 127 — TYPESCRIPT PHASE 3 (ALL REMAINING MODULES)

**Goal:** Migrate remaining 12 frontend modules.

1. **12 modules migrated.** `src/scoring.ts`, `src/notifications.ts`, `src/leaderboard.ts`, `src/share.ts`, `src/cards.ts`, `src/analytics.ts`, `src/payments.ts`, `src/paywall.ts`, `src/webrtc.ts`, `src/voicememo.ts`, `src/arena.ts`, `src/async.ts`.
2. **16 of 16 frontend modules** now have typed TypeScript mirrors in `src/`.

---

## Session 128 — TYPESCRIPT PHASE 4 (HTML INLINE SCRIPT EXTRACTION)

**Goal:** Extract inline `<script>` blocks from all 10 HTML pages into typed modules.

1. **10 page modules created** in `src/pages/`. 7 fully hand-typed. 3 heavy files (spectate, groups, home) with `any` annotations — need full typing pass (closed Session 166).
2. **10 HTML files updated** — single `<script type="module">` each.

---

## Session 130 — VITE BUILD ENABLED + 3 COSMETIC BUGS FIXED

**Goal:** Fix 3 cosmetic bugs, enable Vite build in production.

1. **"Answer NaN more questions" fixed.** `next.questionsNeeded` replaces `next.minQuestions`.
2. **"NaN ELO" on AI bot fixed.** `opponentElo: 1200`.
3. **Vite build enabled.** `vercel.json`: `buildCommand: "npm run build"`, `outputDirectory: "dist"`. First successful build confirmed.
4. **Power-up shop entry points added.** `navigateTo` exposed on window.

**Files changed:** `package.json`, `vercel.json`, `colosseum-powerups.js`, `colosseum-arena.js`, `index.html`, `src/pages/home.ts`

---

## Session 131 — PHASE 5 COMPLETE (BOT ARMY TS MIGRATION)

**Goal:** Complete bot army TypeScript migration.

1. **Phase 5 complete.** 19 files (17 .ts + tsconfig.json + types.d.ts). PM2 running compiled JS from `dist/`. `ecosystem.config.js` updated to `dist/bot-engine.js`. Original .js kept as rollback.

**Files changed:** 19 new .ts files on VPS + GitHub, `ecosystem.config.js`

---

## Session 132 — VITEST + BOT ARMY TESTS (PHASE 6 STARTED)

**Goal:** Install Vitest, write bot army tests, fix 2 bugs found by tests.

1. **Vitest installed.** 3 test files: category-classifier (35 tests), content-filter (32 tests), bot-config (29 tests). 97/97 passing.
2. **Bug 1 fixed:** category classifier `\b` word-boundary regex on ALL keywords.
3. **Bug 2 fixed:** content filter regex alternation reordered.

**Files:** `vitest.config.ts`, `lib/category-classifier.ts`, `lib/content-filter.ts`, `tests/*.test.ts`, `package.json`

---

> Sessions 133-134 were conducted in a separate project chat (security audit).

## Session 133 — SECURITY AUDIT PHASE 1-2 (PII SCRUB + XSS)

1. **Phase 1 PII scrub.** Personal Gmail removed from `colosseum-legal-snippets.html`.
2. **Phase 2 XSS fixes.** `submitReference` URL validation added.
3. **DOB-in-JWT issue identified.**

**Files changed:** `colosseum-auth.js`, `colosseum-legal-snippets.html`

---

## Session 134 — SECURITY AUDIT PHASE 3 (AUTH FIXES + DOB-IN-JWT)

1. **requireAuth() placeholder bypass fixed.**
2. **UUID validation added** to 14 functions.
3. **`_notify` removed from public API.**
4. **DOB-in-JWT fix shipped.** Trigger strips DOB. `set_profile_dob()` RPC created.
5. **innerHTML fixes shipped.** `_esc()` helpers added to payments, paywall, tokens.

**Security audit status: CLOSED.** All 120+ issues resolved.

**Files changed:** `colosseum-auth.js`, `colosseum-payments.js`, `colosseum-paywall.js`, `colosseum-tokens.js`, `src/pages/plinko.ts`, `colosseum-dob-fix.sql`

---

> Sessions 135-141: Not in project chat record.

## Session 142 — LEGACY SCRIPT TAG REMOVAL (VIA CLAUDE CODE)

**Goal:** Remove all legacy `<script>` tags from HTML files.

1. **76 legacy `<script>` tags removed** across all 11 HTML pages (19 from index.html + 57 from 10 others). Every page now runs single `<script type="module">` via Vite.
2. **Verified live on Vercel.** index.html, colosseum-groups.html, colosseum-settings.html all rendering correctly.

**Files changed:** All 11 HTML files, 8 page .ts files.

---

> Sessions 143-145: Not in project chat record.

## Session 146 — REFERENCE ARSENAL DESIGN + STRIPE FIX + DEAD FILE CLEANUP

1. **Stripe console error fixed.** `typeof Stripe === 'undefined'` guard in `src/payments.ts`.
2. **Three dead files deleted.** `src/types/database.ts`, `database.ts` (root), `globals.d.ts` (root).
3. **Reference Arsenal designed.** 5-step forge form, 6 source types, community verification, -10 penalty on rejected challenge. `arsenal_references` (21 cols), `reference_verifications` (6 cols), 4 SECURITY DEFINER RPCs.

**Files changed:** `src/payments.ts`. 3 files deleted.

---

## Session 147 — REFERENCE ARSENAL MIGRATION + TYPESCRIPT MODULE

1. **Migration SQL executed.** 2 tables, 6 RPCs live in Supabase. LM-186 bug fixed (rivals columns are `challenger_id`/`target_id`, not `user_id`/`rival_id`).
2. **`src/reference-arsenal.ts` built.** 730 lines. Compiles clean strict mode.

**Files changed:** `src/reference-arsenal.ts` (new). Supabase: `arsenal_references`, `reference_verifications`, 6 RPCs.

---

> Sessions 148-149: Not in project chat record.

## Session 150 — EDIT BUG FIX + VERIFY FLOW CONFIRMED

1. **edit_reference RPC bug fixed.** log_event positional args → named params.
2. **Verify flow tested end-to-end.** Duplicate vote blocked. Owner card shows locked indicator.
3. **Login/signup flow problems noted.** Google OAuth disabled. Email confirmation failing.

**Files changed:** Supabase: edit_reference RPC patched.

---

## Session 151 — LM-188 FULL AUDIT: log_event NAMED PARAMS

**Goal:** Eliminate all positional log_event calls across entire codebase.

1. **7 broken calls fixed** across 6 RPCs. join_debate_queue (×2), toggle_moderator_status, update_arena_debate, claim_debate_tokens, create_group, join_group.
2. **22 fragile calls converted** to named params across 20 RPCs.
3. **29 total calls, 26 RPCs, zero positional calls remain.**

**Files changed:** Supabase: 26 RPCs patched. Zero GitHub. Zero VPS.

---

## Session 152 — PWA MOBILE DISTRIBUTION DECISION

**Goal:** Decide mobile distribution strategy.

1. **Decision locked:** PWA first (manifest + service worker → Add to Home Screen on Android/iOS). TWA wrapper for Google Play later if warranted. Apple App Store deferred — requires Mac, $99/yr, Apple rejects WebView-only apps. Capacitor is the fallback path if native shell is ever needed. No native rewrite.

**No code shipped. Decision only.**

---

> Sessions 153-159: Not in project chat record.

## Session 160 — COLOSSEUM → MODERATOR FILE RENAME

**Goal:** Rename project from "The Colosseum" to "The Moderator."

1. **All HTML files renamed.** `colosseum-*.html` → `moderator-*.html`.
2. **All bible docs renamed.** `THE-COLOSSEUM-*.md` → `THE-MODERATOR-*.md`, `COLOSSEUM-FEATURE-ROOM-MAP.md` → `MODERATOR-FEATURE-ROOM-MAP.md`.
3. **Internal content not fully updated.** NT, OT, War Plan, Wiring Manifest, Land Mine Map still have "Colosseum" in body text (H-03, tracked in Punch List).

**Files changed:** File renames only. No code changes.

---

> Session 161: Not in project chat record.

## Session 162 — PUNCH LIST CREATED

**Goal:** Create single source of truth for everything that needs doing.

1. **THE-MODERATOR-PUNCH-LIST.md created.** Three sections: Housekeeping (11 items), Bugs (8 items), Features (44 items). Source of truth for all open work going forward.

**Files changed:** `THE-MODERATOR-PUNCH-LIST.md` (new).

---

## Session 163 — ARENA BUG AUDIT + NAVIGATION MODULE + TIMEOUT FIX

**Goal:** Close B-01 (arena blank), B-02 (auth redirect loop), B-06 (AI sparring nav), housekeeping cleanup.

1. **B-01 closed.** Not a bug — arena is a screen inside index.html via `arena.init()`, not a separate HTML file. Wiring Manifest stale reference.
2. **B-02 fixed.** Root cause: 4000ms page timeout vs 5000ms auth timeout = 1s gap. Fix: 4000→6000ms in home.ts, profile-depth.ts, settings.ts.
3. **B-06 closed.** Not reproducible — killed by TS migration Session 142.
4. **H-02 closed.** `src/navigation.ts` created — register/call pattern for page navigation. `(window as any).navigateTo` removed. 4 consumers updated. Zero `window.navigateTo` refs remain.
5. **H-04 closed.** `colosseum-arena.html` stale Wiring Manifest reference. Arena is inline in index.html.
6. **H-09 closed.** `bot-engine.js` straggler already deleted.
7. **H-10/H-11 closed.** TYPESCRIPT-MIGRATION-PLAN.md and NAVIGATION-ARCHITECTURE.md removed from project knowledge.

**Files changed:** `src/navigation.ts` (new), `src/pages/home.ts`, `src/pages/profile-depth.ts`, `src/pages/settings.ts`

---

## Session 164 — QUESTIONNAIRE EXPANSION (39 → 100 QUESTIONS)

**Goal:** Close B-05 — tier thresholds 3-5 unreachable with only 39 questions.

1. **Profile depth expanded.** 39 → 100 questions. 12 → 20 sections. 8 new B2B-driven sections added (covers consumer behavior, spending, values, media habits, etc.). All tier thresholds (10/25/50/75/100) now reachable.

**Files changed:** `src/pages/profile-depth.ts`, `moderator-profile-depth.html`

**Spec doc:** `profile-depth-expansion.md` (408 lines) — full B2B data spec mapping every question to buyer needs, implementation notes, grid layout guidance. Work complete. Doc deleted Session 191 cleanup.

---

## Session 165 — RESPONSIVE BREAKPOINTS + any TYPING PASS (PARTIAL)

**Goal:** Close B-07 (no responsive breakpoints), begin H-01 (any annotations).

1. **B-07 closed.** `@media (min-width: 768px)` added. `.screen` capped at `max-width: 640px` + centered. Home screen ring nav exempted. Profile-depth grid 4-col on desktop.
2. **H-01 partial.** `home.ts`: 4 `any` → `Category`, `Profile`, `User`. `groups.ts`: 4 `any` → `SupabaseClient`, `User`, `GroupListItem`.
3. **F-45 added** to punch list (desktop-optimized arena layout).

**Files changed:** CSS in index.html and moderator-groups.html, `src/pages/home.ts`, `src/pages/groups.ts`

---

## Session 166 — spectate.ts TYPING + GROUP FEATURE DESIGN QUESTIONS ANSWERED

**Goal:** Close H-01 (spectate.ts), answer 6 of 7 open group design questions.

1. **H-01 closed.** `spectate.ts`: 14 `any` → `SpectateDebate`, `DebateMessage`, `SpectatorChatMessage`. All eslint-disables removed. Vite build clean.
2. **6 of 7 open questions answered:**
   - F-18 Audition: Exhibition only. 5 entry rules via leader dropdown.
   - F-19 Banners: Auto-unlock at win% thresholds (0-25% standard, 26-50% custom static, 51%+ custom animated 10s max). Permanent once crossed.
   - F-20 Shared fate: `floor(avg_questions/100 × win_pct × 80)`. Max 80%.
   - F-21 Intro music: 10 standard intros for everyone; custom 10-sec upload at 35%+ questions.
3. **Q7 (member contribution tracking) still open.**

**Files changed:** `src/pages/spectate.ts`

---

## Session 167 — WAITING ROOM LAYER 1

**Goal:** F-01 Layer 1: waiting room queue screen upgrade.

1. **Queue screen upgraded.** Dual search ring animation, 4-phase status text, 60s AI fallback prompt, 180s hard timeout, cancel button.

**Files changed:** `src/pages/home.ts`, `src/arena.ts`, CSS in `index.html`

---

## Session 168 — MATCH FOUND ACCEPT/DECLINE SCREEN (F-02)

**Goal:** F-02: match found accept/decline screen.

1. **Accept/decline screen built.** 12s countdown, accept/decline buttons. `respond_to_match` + `check_match_acceptance` RPCs. `player_a_ready`/`player_b_ready` columns on `arena_debates`. `MatchAcceptResponse` interface.

**New Supabase objects:** Columns `player_a_ready`, `player_b_ready` on `arena_debates`. RPCs `respond_to_match`, `check_match_acceptance`.

**Files changed:** `src/arena.ts`, `src/pages/home.ts`, SQL migration (`moderator-match-accept-migration.sql`)

---

## Session 169 — AI SPARRING BADGE FIX + WAITING ROOM LAYER 2

**Goal:** B-08 (badge overlap), F-01 Layer 2 (queue population + spectator feed).

1. **B-08 closed.** `ai-generated-badge` div moved out of `.arena-room-header` flex row — placed between header and `.arena-vs-bar` as centered standalone element.
2. **F-01 Layer 2 done.** Queue population count + spectator feed added to waiting room. `check_queue_status()` RPC replaced via `moderator-queue-population-migration.sql`.

**Files changed:** `src/arena.ts`, `moderator-queue-population-migration.sql` (new)

---

## Session 170 — WAITING ROOM LAYER 3 + PRIVATE LOBBY RESEARCH

**Goal:** F-01 Layer 3 (category-scoped queues), research F-46.

1. **F-01 Layer 3 done.** `QUEUE_CATEGORIES` const (6 categories). `showCategoryPicker()` bottom sheet inserted between mode select and queue. Queue title shows "TEXT BATTLE · POLITICS" etc. AI Sparring bypasses picker. SQL: `join_debate_queue()` two-phase match (strict category → any category fallback). Queue count scoped to mode + category.
2. **F-46 research complete.** Private lobby / invite-only debate spec: `visibility` column on `arena_debates`, `debate_invites` table, notification path, "waiting for opponent" lobby UI. Build deferred.

**Files changed:** `src/arena.ts`, `src/pages/home.ts`, SQL updates

---

> Sessions 171-172: Not in project chat record.

## Session 173 — F-46 COMPLETE + F-47 MODERATOR MARKETPLACE SQL + CLIENT STEP 4

**Goal:** Complete F-46 (private lobby), begin F-47 (Moderator Marketplace).

1. **F-46 complete.** Private lobby / invite-only debate shipped. Tests 8-12 skipped by Pat's decision.
2. **F-47 SQL Phase 1 — 2 broken RPCs fixed** (table reference `debates` → `arena_debates`): `assign_moderator`, `score_moderator`.
3. **F-47 SQL Phase 2 — Schema additions:**
   - `mod_categories TEXT[] DEFAULT '{}'` + GIN index on `profiles`
   - `mod_status TEXT DEFAULT 'none'` CHECK (`'none'`/`'waiting'`/`'requested'`/`'claimed'`) on `arena_debates`
   - `mod_requested_by UUID NULL` on `arena_debates`
   - Partial index on `arena_debates (mod_status) WHERE mod_status = 'waiting'`
4. **F-47 SQL Phase 3 — 4 new RPCs + 1 supporting RPC:**
   - `browse_mod_queue()` — returns waiting debates filtered to mod's categories
   - `request_to_moderate(p_debate_id)` — mod claims a debate, `FOR UPDATE SKIP LOCKED`
   - `respond_to_mod_request(p_debate_id, p_accept)` — debater accepts/declines
   - `get_mod_profile(p_moderator_id)` — public mod profile
   - `update_mod_categories(p_categories)` — saves mod's category specialties
5. **F-47 Client Step 4 — Moderator settings category multi-select:**
   - `src/auth.ts` — `updateModCategories()` added + exported
   - `src/pages/settings.ts` — chip load in `loadModeratorSettings()`, chip wire listeners
   - `moderator-settings.html` — 6 category chips UI + CSS inside `#mod-stats` block

**F-47 remaining:** Step 5 (Mod Queue tab), Step 6 (Debater-side mod request flow), Step 7 (Post-debate mod scoring UI), Step 8 (8 test cases).

**Files changed:** `src/auth.ts`, `src/pages/settings.ts`, `moderator-settings.html`. Supabase: `assign_moderator`, `score_moderator` (fixed), `browse_mod_queue`, `request_to_moderate`, `respond_to_mod_request`, `get_mod_profile`, `update_mod_categories` (new). Schema: `profiles.mod_categories`, `arena_debates.mod_status`, `arena_debates.mod_requested_by`, 2 indexes.

---

## Session 190 — March 28, 2026

**F-35B — In-app nudge toasts: CLOSED**

Confirmed `src/nudge.ts` already existed with full suppression logic (once/session per ID, 24h cooldown per ID, 3/session cap). 7 of 8 trigger points already wired. Missing: first_vote nudge in `src/async.ts` hot take reaction flow.

Fix: added `import { nudge } from './nudge.ts'` to `async.ts`. Added `nudge('first_vote', '🗳️ Vote cast. Your voice shapes the verdict.')` inside `react_hot_take` success block, scoped to `reacted === true` only (not on toggle-off). TypeScript clean — zero src/ errors.

**F-35 fully closed.** A (newsletter cron, Session 187) + B (toasts, Session 190) both complete.

**H-03 partial — api/profile.js BASE_URL fix:**

`api/profile.js` had `BASE_URL` hardcoded to `'https://colosseum-six.vercel.app'`. Fixed to `process.env.BASE_URL || 'https://themoderator.app'`. Consistent with SUPABASE_URL pattern two lines above it.

`BASE_URL=https://themoderator.app` env var added to Vercel (all environments). Deployed to production in 25s. Confirmed live.

**Domain confirmed:** `themoderator.app` is the live production domain, wired to Vercel. `colosseum-six.vercel.app` still works but is no longer the canonical URL.

**Bible doc updates:**
- NT: Vercel URL updated, `nudge.ts` added to modules table, `async.ts` entry updated
- Punch List: F-35 closed, H-03 progress noted, session 190 in change log
- CLAUDE.md: Members Zone URL updated
- BOT-DEPLOYMENT-GUIDE.md: 3 colosseum-six refs → themoderator.app
- WAR-PLAN.md: domain status updated to ✅ themoderator.app
- OT: this entry

**Files changed:** `src/async.ts`, `api/profile.js`, 5 bible docs.

## Session 191 — March 28, 2026 — REPO CLEANUP

Full doc audit and cleanup. Cloned repo, catalogued all 37 docs, processed each group.

**Docs deleted (22 total):**
- Architecture traces (Sessions 83-88, nav architecture, 2 drawio files) — pre-TS-migration codebase, superseded by Wiring Manifest
- Historical (TYPESCRIPT-MIGRATION-PLAN.md, SESSION-133-AUDIT.md, SESSION-117-HANDOFF.docx) — absorbed into OT
- Deployment/ops (BOT-DEPLOYMENT-GUIDE.md, DEPLOYMENT-GUIDE.md, SETUP-GUIDE.md, SETUP-BOTS.md, DISCORD-BOT-SETUP.md, TELEGRAM-BOT-SETUP.md, MOVE3-HUMAN-ACTIONS.md) — Discord killed, Telegram never launched, pre-TS filenames, work complete
- Unrelated (Reskin_How_To_Guide.docx, 2025 Top Mobile Games.txt) — wrong project
- profile-depth-expansion.md — B-05 closed, work complete
- TOKEN-STAKING-POWERUP-PLAN.docx — Phases 1-5 complete, open decisions moved to Punch List
- THE-MODERATOR-WAR-PLAN.md — see below
- MODERATOR-FEATURE-ROOM-MAP.md — see below

**THE-MODERATOR-WAR-PLAN.md (Session 27) — deleted Session 191:**
5-phase strategy doc created Session 27 by reading all prior conversation history. Covered: end goal, honest "where we are" assessment, 5-phase build order (bot army → watch/seed → first improvements → monetization → scale), shelved ideas, founder constraints, open decisions, guiding principles for Claude, document system. By Session 191, Phase 1 was complete (bot army live), most open decisions resolved (name locked, domain live), guiding principles absorbed into NT session rules. Surviving content absorbed into NT: open decisions (subscription pricing, minors policy, Stripe production timing) added to NT Open Decisions section. Founder self-awareness note preserved here: this is the founder's fourth project following the same trajectory (StreamToStage, The Expressions Network, The Moderator/Colosseum — deepest yet, same risk of planning replacing shipping). The Colosseum has broken further through this pattern than any previous project — it's actually deployed, live, and has a real user acquisition engine running.

**MODERATOR-FEATURE-ROOM-MAP.md (Session 106) — deleted Session 191:**
Created Session 106 to place every feature from the Ideas Master Map (~90 items) into the existing 6-chart architecture. 6 existing rooms (Arena/Home, Leaderboard, Category Overlay, Groups, Profile Depth, Settings/Public Profile) with new furniture mapped to each. 7 new rooms defined: Reference Library (NEW A), Token Prediction Staking (NEW B), Marketplace (NEW C), DM Inbox (NEW D), Tournament System (NEW E), Notifications Hub (NEW F), B2B Dashboard/API (NEW G). Full door map between rooms. By Session 191, the Punch List had absorbed all actionable content from this doc. The Product Walkthrough (PRODUCT-WALKTHROUGH.md, kept) now serves the screen-by-screen build queue role this doc was attempting to fill.

**OT additions this session:**
- Sessions 83-91 documented for the first time (edge maps, nav architecture)
- Session 15 Telegram/Discord bot build documented
- Move 3 (rate limiting/sanitization checklist) documented
- profile-depth-expansion.md referenced in Session 164 entry
- TOKEN-STAKING-POWERUP-PLAN.docx open decisions added to Session 108 entry

**NT updates this session:**
- Header: removed War Plan, Feature Room Map, Token Staking docx refs. Added filename-staleness notes on Land Mine Map and Wiring Manifest.
- Open Decisions: removed resolved domain decision, added subscription pricing, minors policy, Stripe production timing.

**Housekeeping items added:**
- Land Mine Map: internal filenames are pre-TS-migration (colosseum-auth.js etc.) — patterns valid, names stale
- Wiring Manifest: same issue — file references need updating to src/*.ts names
- THE-MODERATOR-TEST-WALKTHROUGH.md: kept, flagged for future dedicated update session
- PRODUCT-WALKTHROUGH.md: kept, flagged for future dedicated continuation session
