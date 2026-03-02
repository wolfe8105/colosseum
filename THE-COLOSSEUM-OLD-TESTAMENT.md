# THE COLOSSEUM — OLD TESTAMENT
### The Reference Vault — Read When Relevant
### Last Updated: Session 19 (March 1, 2026)

> **Read the New Testament every session.** This file contains historical records, detailed inventories, and reference material. Pull specific sections only when the session's work touches those areas.
> **New Testament location:** `https://raw.githubusercontent.com/wolfe8105/colosseum/main/THE-COLOSSEUM-NEW-TESTAMENT.md`

---

# TABLE OF CONTENTS

1. Session Build Logs (detailed history of every session's work)
2. Revenue Model
3. B2B Data Play
4. Education (separate product)
5. Honest Assessment
6. Research Foundations
7. Complete Inventory (502 items)
8. User Acquisition & Growth Strategy

---

# 1. SESSION BUILD LOGS

## 1.1. Session 1 Build (Feb 26) — Foundation

1.1.1. ✅ `colosseum-payments.js` — Stripe Checkout client, token purchases, sub upgrades, placeholder modals
1.1.2. ✅ `colosseum-stripe-functions.js` — Edge Function code for checkout sessions + webhooks
1.1.3. ✅ `colosseum-schema-production.sql` — 18 tables, RLS, triggers, 45 cosmetics seeded, 25 achievements seeded, indexes
1.1.4. ✅ `colosseum-auth.js` — Supabase auth: signup, login, logout, OAuth, profile CRUD, follows, password reset, account deletion, session management
1.1.5. ✅ `colosseum-login.html` — Login/signup UI with age gate, ToS acceptance, OAuth buttons, password reset
1.1.6. ✅ `colosseum-settings.html` — Full settings page
1.1.7. ✅ `colosseum-config.js` — Central config with all PASTE HERE markers
1.1.8. ✅ `colosseum-profile-depth.html` — 12 sections, 147 questions, discount waterfall
1.1.9. ✅ `vercel.json` — Vercel config with routes, security headers, caching
1.1.10. ✅ `DEPLOYMENT-GUIDE.md` — Step-by-step paste instructions

## 1.2. Session 2 Build (Feb 26)

1.2.1. ✅ `index.html` — Main app shell, loads all V2 modules, bottom nav, screens, ticker, auth-gated
1.2.2. ✅ `colosseum-notifications.js` — Notification center, slide-down panel, filters, mark read, 30s polling
1.2.3. ✅ `colosseum-paywall.js` — 4 contextual paywall variants, gate() helper, dismissible
1.2.4. ✅ `colosseum-async.js` — Hot takes feed, post composer, reactions, BET challenge, async debate threads
1.2.5. ✅ `colosseum-share.js` — Share results/profiles, invite/referral, challenge links, deep links, post-debate prompt
1.2.6. ✅ `colosseum-leaderboard.js` — ELO/Wins/Streak tabs, time filters, My Rank card, Supabase-ready

## 1.3. Session 3 Build (Feb 26) — Full Rebuild of All Modules

1.3.1. All 7 JS modules REBUILT with window.X global pattern + placeholder mode
1.3.2. All 3 HTML pages REBUILT (login, settings, profile-depth)
1.3.3. Schema REBUILT with 18 tables, 4 triggers, seed data
1.3.4. Notes: All modules have defensive CDN check, all have placeholder fallback, auth module won't crash if CDN fails

## 1.4. Session 4 Build (Feb 26) — Clean Package Assembly

1.4.1. ✅ Assembled clean deployment folder — 22 files, all duplicates resolved
1.4.2. ✅ DEPLOYMENT-GUIDE rewritten with accurate line numbers
1.4.3. Notes: Old duplicates (M suffix, __1_/__2_ suffix) safe to delete. Only 4 PASTE markers needed to get app running.

## 1.5. Session 5 Build (Feb 27) — Bug Sweep + Feature Pass

1.5.1. ✅ `colosseum-stripe-functions.js` — CREATED. Checkout session + webhook Edge Functions for Supabase
1.5.2. ✅ `colosseum-ring3-functions.sql` — UPDATED. Added credit_tokens() and debit_tokens()
1.5.3. ✅ `colosseum-schema-production.sql` — UPDATED. Added stripe_subscription_id column
1.5.4. ✅ Fixed cross-module function mismatches (login→auth, settings→auth, index→auth)
1.5.5. ✅ Built spectator mode, predictions UI, matchmaking timer, activity bar, post-debate survey
1.5.6. ✅ Added login rate limiting, email verification handler, username validation, minor payment restrictions, continue-where-you-left-off
1.5.7. File count 22→24

## 1.6. Session 6 (Feb 27) — Status Audit

1.6.1. Audited all 24 files against master checklist
1.6.2. Confirmed colosseum-terms.html already built, WebRTC uses Supabase Realtime, voice memo built
1.6.3. CONCLUSION: All buildable code items complete. Remaining blockers are human paste tasks.

## 1.7. Session 7 (Feb 27) — Supabase Live + Spelling Fix

1.7.1. ✅ Supabase project created (faomczmipsccwbhpivmp)
1.7.2. ✅ Schema + Ring 3 + voice memo migration pasted
1.7.3. ✅ debate-audio storage bucket created (public)
1.7.4. ✅ Spelling fix: Coliseum → Colosseum across ALL files

## 1.8. Session 8 (Feb 27) — APP IS LIVE

1.8.1. ✅ Deployed to Vercel (colosseum-six.vercel.app)
1.8.2. ✅ Auth working end-to-end (signup → email verify → auto-login)
1.8.3. ✅ Stripe sandbox created with 7 products
1.8.4. ✅ All keys/IDs pasted into config and committed

## 1.9. Session 9 (Feb 27) — Password Reset Fix

1.9.1. ✅ BUG: Password reset link dumped back to login with no form
1.9.2. ✅ Added "Set New Password" modal to login page
1.9.3. ✅ Added updatePassword() to auth module + PASSWORD_RECOVERY event handler
1.9.4. ⚠️ Discovered Supabase free tier limits reset emails to 2/hour — custom SMTP needed

## 1.10. Session 10 (Feb 27) — Bug Fixes + Stripe Fully Wired + Resend SMTP

1.10.1. ✅ Fixed 4 bugs: auth race condition, payments placeholder URL crash, login operator precedence, settings double updateProfile
1.10.2. ✅ Deployed Stripe Edge Functions via Supabase CLI
1.10.3. ✅ Set Stripe secret key + webhook signing secret as Supabase secrets
1.10.4. ✅ Stripe webhook listening for 4 events
1.10.5. ✅ Resend SMTP configured — email rate limit removed
1.10.6. ✅ Node.js installed on dev machine
1.10.7. ✅ colosseum-config.js updated with real Stripe function URL
1.10.8. Only remaining PASTE: Deepgram API key

## 1.11. Session 11 (Feb 27) — Mobile UX Research + Home Screen Redesign

1.11.1. ✅ Confirmed current home screen has 8 content zones, violates every mobile UX principle
1.11.2. ✅ Key findings: one primary action per screen, progressive disclosure, white space, signal over noise, consistency
1.11.3. ✅ Decision: kill the multi-zone home screen → one card at a time → TikTok-style → spoke carousel
1.11.4. ✅ Flag spinner concept (lazy susan) — rotating category selector with wind physics flags
1.11.5. ✅ Home V2 prototype built — "meh" — needs iteration
1.11.6. ✅ Hated Rivals mechanic added, Couples Court added

## 1.12. Session 12 (Feb 28) — New-Age Visual Redesign

1.12.1. ✅ Home V3: Spoke Carousel — 6 glassmorphism tiles orbit hollow center, 18° tilt, thumb-spin
1.12.2. ✅ Visual system overhaul — Cinzel + Barlow Condensed, diagonal gradient, frosted glass
1.12.3. ✅ Login restructured: OAuth dominant (Google/Apple full-width top, email collapsed)
1.12.4. ✅ Ticker bar + category tabs removed — spoke carousel IS the navigation
1.12.5. ✅ All 5 HTML pages replaced with new visual system

## 1.13. Session 13 (Feb 28) — User Acquisition Strategy

1.13.1. ✅ Zero-budget growth strategy locked
1.13.2. ✅ Polymarket, Hotmail, Dropbox, Airbnb, Reddit, Tinder case studies documented
1.13.3. ✅ F5Bot, n8n, ReplyAgent, Brand24 tool landscape mapped
1.13.4. ✅ Conversion funnel defined: ungated first action → OAuth one-tap after hook
1.13.5. ✅ Telegram mini app + Discord bot identified as high-potential channels
1.13.6. ✅ X Reply Guy strategy adopted (manual only, no API automation)
1.13.7. ✅ 15-item master priority list created

## 1.14. Session 14 (Feb 28) — Growth Infrastructure Build

1.14.1. ✅ Ungated debate landing page (colosseum-debate-landing.html)
1.14.2. ✅ Dynamic OG meta tags on landing page
1.14.3. ✅ Share card generator (colosseum-cards.js) — 4 sizes, ESPN aesthetic
1.14.4. ✅ Default OG card image (og-card-default.png)
1.14.5. ✅ Watermark on all share outputs
1.14.6. ✅ vercel.json updated with /debate route
1.14.7. File count 25→28. GitHub repo confirmed clean.

## 1.15. Session 15 (Feb 28) — Telegram Bot + Discord Bot

1.15.1. ✅ Telegram bot (api/telegram-webhook.js + api/telegram-setup.js) — /debate, /settle, inline mode
1.15.2. ✅ Discord bot (api/discord-interactions.js + api/discord-setup.js) — /settle, gold embeds, vote buttons
1.15.3. ✅ Landing page patched for custom topics via ?title= param
1.15.4. ✅ Zero npm deps across all 4 bot files
1.15.5. File count 28→32

## 1.16. Session 16 (Mar 1) — Security Hardening (3 Moves)

1.16.1. ✅ Move 1: RLS audit found 7 critical vulnerabilities. All 30+ policies dropped and replaced. Guard trigger on profiles. profiles_public + profiles_private views. credit_tokens locked to service_role. purchase_cosmetic function added.
1.16.2. ✅ Move 2: 20 server-side validation functions. All client writes gated behind SECURITY DEFINER functions. Covers async debates, token earning, achievements, hot takes, reports, profiles, cosmetics, notifications, settings, social.
1.16.3. ✅ Move 3: sanitize_text() + sanitize_url() at DB boundary. rate_limits table. All Move 2 functions patched. vercel.json hardened (CSP, HSTS, 12 headers). middleware.js added (API rate limit, CORS, payload limit). Stripe CORS patch prepared.
1.16.4. Most dangerous vulnerability found: credit_tokens() was callable by any authenticated user for any user — unlimited tokens with one API call.
1.16.5. Client migration cheat sheet created (old .from() → new .rpc())
1.16.6. rate_limits table is table 19 (schema was 18, now 19)

## 1.17. Session 17 (Mar 1) — Client-Side RPC Migration + Security Deployment

1.17.1. ✅ `colosseum-ring3-move2.sql` — NEW. 22 SECURITY DEFINER functions across 11 sections: async debates (join, submit_round, vote, finalize), token earning (daily claim, earn with 9 reasons + daily caps), achievements (auto-scan 25 conditions), hot takes (create, react toggle), reports (submit), profile (update with validation, save depth with completion % calc), cosmetics (equip/unequip/purchase), notifications (mark read bulk, cleanup 90-day), settings (update all toggles), social (follow/unfollow), voice (create_voice_take).
1.17.2. ✅ `colosseum-rls-hardened.sql` — NEW. Drops 34 old policies, creates 24 hardened replacements. Guard trigger blocks client changes to elo/tokens/wins/losses/tier/stripe IDs. profiles_public + profiles_private views.
1.17.3. ✅ `colosseum-auth.js` — REPLACED. Profile writes → rpc('update_profile'). Follow/unfollow → rpc(). Signup upsert removed (auto-profile trigger handles it). deleteAccount kept as direct update (allowed by guard trigger).
1.17.4. ✅ `colosseum-async.js` — REPLACED. Hot take insert → rpc('create_hot_take'). Reactions → rpc('react_hot_take') toggle (single RPC adds or removes).
1.17.5. ✅ `colosseum-notifications.js` — REPLACED. Mark read → rpc('mark_notifications_read') with UUID array or null.
1.17.6. ✅ `colosseum-voicememo.js` — REPLACED. Voice takes → rpc('create_voice_take'). Storage operations unchanged.
1.17.7. All 3 SQL files pasted into Supabase: Move 2 → Move 3 → Move 1 (functions before policies).
1.17.8. 4 JS files + 2 SQL files pushed to GitHub, Vercel auto-deployed.
1.17.9. colosseum-scoring.js verified clean — SELECT reads only, no migration needed.
1.17.10. ⚠️ Known schema mismatch: Ring 3 place_prediction() expects UUID for predicted_winner, but predictions table has TEXT CHECK ('a','b'). Needs alignment later.
1.17.11. Security hardening FULLY LIVE: Move 1 (RLS), Move 2 (22 functions), Move 3 (sanitization + rate limits) all applied. Castle Ring 3 complete.
1.17.12. ⏳ middleware.js + hardened vercel.json from Session 16 still not pushed to GitHub.
1.17.13. ⏳ Telegram bot setup — BotFather + env vars in Vercel.
1.17.14. ⏳ Discord bot setup — Developer Portal + env vars in Vercel.

## 1.18. Session 18 (Mar 1) — Founder Reality Check + Bot-Driven Growth Model

1.18.1. ✅ Founder constraints fully documented: full-time engineer, 2 kids under 10, no spouse help, no parents/siblings/family, no friends in 25 years, no coworkers, no social media accounts, Android, ~1hr/day free, $100/mo budget.
1.18.2. ✅ "Send to 10 friends" strategy declared dead — founder has no network.
1.18.3. ✅ Manual X Reply Guy strategy declared dead — founder has no time, no accounts, no marketing skill.
1.18.4. ✅ `colosseum-financials-session18.xlsx` — CREATED. Original projections assuming organic network (50 MAU Month 1, 2,000 Month 12, $8,200 Year 1 revenue). 5 tabs: Assumptions, Projections, Year 1 Monthly, What Changed, Honest Assessment.
1.18.5. ✅ `colosseum-financials-v2-botdriven.xlsx` — CREATED. Bot-driven projections based on founder's real constraints (9 MAU Month 1, 338 Month 12, $3,100 Year 1 revenue, $1,200 Year 1 profit). 4 tabs: Bot Funnel Math, Year 1 Projections, Snapshot, Old vs New.
1.18.6. ✅ Bot-driven growth model adopted — TWO-LEG architecture:
   - Leg 1 (Reactive): 10 Reddit accounts (250 comments/day), 3 X reply accounts (90 replies/day), 15 Discord servers (30 interactions/day) = ~370 mentions/day raw, ~185 visible after moderation.
   - Leg 2 (Proactive): Scans Google News, ESPN, trending X topics continuously. Auto-generates hot take posts on @TheColosseum X account (5-10/day) and auto-creates matching debate/vote pages on the app. Page exists before anyone clicks. 500-5,000 impressions per well-timed post. Higher CTR (5-8%) because the content IS the hook.
1.18.7. ✅ Combined daily reach: ~3,000-25,000+ impressions. Leg 2 becomes dominant driver as X account builds followers.
1.18.7. ✅ Conversion funnel mapped: 3% CTR → 30% ungated vote → 15% signup → 1.3x WOM = ~9 new users/month starting Month 1.
1.18.8. ✅ Bot costs locked: $100/month ($10 VPS, $30 social listening, $30 ReplyAgent, $15 proxies, $15 reserve).
1.18.9. ✅ Key insight: growth scales with money, not founder energy. Double budget ≈ double output.
1.18.10. ✅ Break-even shifted to Month 8-9. Total risk if strategy fails: ~$600-800 in bot costs.
1.18.11. ✅ Guiding principle added: "Zero founder marketing time" — all growth fully automated.
1.18.12. ⏳ Bot army not yet built — next build priority.
1.18.13. ⏳ Reddit, X, Discord accounts not yet created.

## 1.19. Session 19 (Mar 1) — Bot Army Built

1.19.1. ✅ `bot-engine.js` — CREATED. Main orchestrator: boots all modules, validates config, runs cron schedules (Reddit every 20 min, News every 15 min, Twitter per peak hours), manages graceful shutdown, logs stats every 6 hours.
1.19.2. ✅ `bot-config.js` — CREATED. Loads .env, validates all required credentials, refuses to start if any PASTE_YOUR placeholder remains. Feature flags per leg/platform. Configurable subreddit list, argument keywords, posting limits, cooldowns.
1.19.3. ✅ `ecosystem.config.js` — CREATED. PM2 config: auto-restart on crash, 200M memory limit, daily 4 AM refresh, log rotation.
1.19.4. ✅ `.env.example` — CREATED. All credentials as PASTE_YOUR_*_HERE placeholders. Detailed inline instructions for where to get each key. DRY_RUN=true by default.
1.19.5. ✅ `lib/ai-generator.js` — CREATED. Groq Llama 3.1 70B integration. Three generation modes: hot takes (Leg 2 brand posts, temp 0.9), contextual replies (Leg 1 reactive, temp 0.85), debate topics (structured JSON output, temp 0.7). Fallback templates when AI is down. System prompts tuned for sports/politics/entertainment voice.
1.19.6. ✅ `lib/supabase-client.js` — CREATED. Service role connection (bypasses RLS). Creates hot take entries for Leg 2 auto-generated debate pages. Logs all bot activity to bot_activity table. Dedup check against processed headlines. Stats query for monitoring.
1.19.7. ✅ `lib/logger.js` — CREATED. Winston with daily rotating files (30-day retention), separate error log (60-day), colored console output, convenience methods for leg1/leg2/metric logging.
1.19.8. ✅ `lib/leg1-reddit.js` — CREATED. Snoowrap client with proxy support. Scans 13 argument-heavy subreddits. Argument detection via regex patterns (overrated, hot take, you're wrong, etc.). Filters: min score, not stickied/locked/NSFW, not already replied. Max 8 replies per cycle, 2-min cooldown between replies, one reply per subreddit per cycle.
1.19.9. ✅ `lib/leg1-twitter.js` — CREATED. Twitter API v2 client. Searches for argument keywords. Disabled by default (LEG1_TWITTER_ENABLED=false) because Free tier is write-only — scanning requires Basic API ($100/mo). Max 3 replies per cycle.
1.19.10. ✅ `lib/leg1-discord.js` — CREATED. Discord.js v14 persistent WebSocket bot. Detects arguments via keyword matching in any server message. 10-minute cooldown per channel. Replies with contextual comment + app link. Requires MESSAGE CONTENT INTENT enabled.
1.19.11. ✅ `lib/leg2-news-scanner.js` — CREATED. RSS parser scans 7 feeds (Google News Top/Sports/Politics/Entertainment + ESPN Top/NBA/NFL). Debate-worthiness scoring based on keyword signals (trade, controversial, overrated, ban, scandal, etc.). Sensitive topic filtering (death, shooting, suicide — hard skip). Auto-categorization by source + keyword fallback.
1.19.12. ✅ `lib/leg2-debate-creator.js` — CREATED. Full pipeline: headline → AI generates hot take text + structured debate topic (JSON with title, sideA, sideB, description) → creates hot_take entry in Supabase → returns shareable URL. Page exists before anyone clicks the link.
1.19.13. ✅ `lib/leg2-twitter-poster.js` — CREATED. Posts hot takes to @TheColosseum brand X account. Peak-hour timing (EST: 7-9am, 12-1pm, 5-9pm). Max 8 posts/day. Daily counter auto-resets. Urgent flag bypasses off-peak blocking for breaking news. Works on Free API tier (write-only).
1.19.14. ✅ `colosseum-bot-army-schema.sql` — CREATED. bot_activity table (leg, platform, action_type, source_url, generated_text, debate_id, success, error, metadata JSONB). Indexes on created_at, leg+platform, action_type. RLS enabled with no public policies (service role only). Added is_bot_generated, source_headline, source_url columns to hot_takes table. bot_stats_24h view for monitoring.
1.19.15. ✅ `SETUP-GUIDE.md` — CREATED. Complete step-by-step deployment guide: buy VPS (DigitalOcean $6/mo), SSH setup, file upload, npm install, credential setup for each platform (Groq, Reddit, X, Discord, proxy), .env configuration, database migration, dry run testing, PM2 go-live, monitoring commands, troubleshooting table.
1.19.16. ✅ `package.json` — CREATED. 10 dependencies: node-cron, dotenv, snoowrap (Reddit), twitter-api-v2, discord.js, rss-parser, groq-sdk, @supabase/supabase-js, https-proxy-agent, winston + daily-rotate-file.
1.19.17. Total: 16 files, 2,304 lines. Standalone Node.js app, ready for VPS deployment.
1.19.18. Architecture decision: DigitalOcean $6/mo VPS (Ubuntu 24.04, 1 vCPU, 1 GB RAM, NYC1). PM2 process manager for 24/7 uptime.
1.19.19. AI decision: Groq free tier (Llama 3.1 70B) for all text generation. Zero cost. Fallback templates when rate-limited.
1.19.20. Safety: DRY_RUN=true by default — logs all actions without posting. Per-leg feature flags for gradual rollout.
1.19.21. Actual bot costs revised down: $6-16/mo (was estimated $100/mo in Session 18). Groq free, Reddit API free, Twitter free tier, Discord free. Only VPS + optional proxy cost money.
1.19.22. ✅ New Testament updated to Session 19 — bot army in file manifest, updated costs, deployment steps in human actions.
1.19.23. ✅ Old Testament updated to Session 19 — this build log added.
1.19.24. ⏳ VPS not yet purchased. Reddit/X/Discord accounts not yet created. Bot not yet deployed.

## 1.20. Sessions 20-21 (Mar 1) — NOT LOGGED

1.20.1. ⚠️ Sessions 20-21 were not added to the Old Testament. Refer to New Testament sections 4.42-4.49 and 7.1.10-7.1.16 for what was built. Key items: Leg 3 auto-debate rage-click engine (Session 20), security backlog cleared + Stripe CORS + schema mismatch fix (Session 21).

## 1.21. Session 22 (Mar 1) — Verdict Page Bug Fix

1.21.1. ✅ **Root cause found:** `sb.rpc('view_auto_debate', {...}).catch(() => {})` on line 344 of `colosseum-auto-debate.html` threw TypeError. Supabase `rpc()` returns a query builder, not a Promise. `.catch()` doesn't exist on it. Exception caught by outer try/catch → `showError('Failed to load debate.')` → `renderDebate()` never executed.
1.21.2. ✅ **Fix applied:** replaced with `try { sb.rpc('view_auto_debate', { p_debate_id: debateId }); } catch(e) {}`.
1.21.3. ✅ **Verified live:** verdict page loads debate rounds, scorecard, voting, share buttons at `/verdict?id=7e3d9f0c-75bf-4397-a5f0-7261544c2ad3`.
1.21.4. ⚠️ **Previous misdiagnosis:** multiple prior sessions blamed a "race condition" between `colosseum-config.js` and the inline script. Config is a synchronous IIFE — no race condition existed. The bug was always the `.catch()` call.
1.21.5. **Debugging method:** systematically verified every link in the chain (Vercel rewrite, deployed code, config loading, Supabase 200 responses, RLS policies, render logic) → narrowed to "something throws inside loadDebate's try block" → reproduced exact IIFE code in console → caught the TypeError.
1.21.6. ✅ New Testament updated to Session 22.
1.21.7. ✅ Old Testament updated to Session 22.

---

# 2. REVENUE MODEL

## 2.1. Subscriptions (Colosseum model)
2.1.1. Lurker: free/ads
2.1.2. Contender: $9.99/mo
2.1.3. Champion: $19.99/mo
2.1.4. Creator: $29.99/mo

## 2.2. Subscriptions (Moderator model — legacy reference)
2.2.1. Free ("Debater"): unlimited debates, 3 formats, 10 tokens/day, light ads
2.2.2. Pro ("Moderator Pro"): $9.99/mo, all cosmetics, teams, 30 tokens/day, ad-free
2.2.3. 7-day trial, no credit card
2.2.4. Annual $99.99/year (17% savings)
2.2.5. Profile Depth discount: $14.99 reducible to $0.49

## 2.3. Token Economy
2.3.1. 4 packages: $0.99/50, $3.99/250, $7.99/600, $19.99/1800
2.3.2. Earning: daily login (1), challenge (3), first win (2), streaks (2-25), referrals (10), mod work (2)
2.3.3. Anti-abuse: no tokens from losses, 5+ min threshold, no rapid concede farming

## 2.4. Cosmetics Shop
2.4.1. 45 items: 15 borders, 18 badges, 12 effects
2.4.2. Rarity: Common / Rare / Legendary
2.4.3. Planned: limited edition, seasonal, bundles, gifting

## 2.5. Ads
2.5.1. 30-second slots between rounds — natural commercial breaks
2.5.2. Light banners on free tier
2.5.3. Featured Debate sponsored placement
2.5.4. Promoted Topics — orgs pay to surface topics

## 2.6. Events (Colosseum)
2.6.1. Tournaments with entry fees and prize pools
2.6.2. Premium rooms
2.6.3. PPV events
2.6.4. Real-dollar tipping during debates

## 2.7. Honest Projections (Updated Session 18)

### 2.7.1. Original Projections (assumed organic network)
2.7.1.1. Solo founder with network: $15K-72K Year 1 ARR
2.7.1.2. Colosseum conservative with network: $8,200 Year 1 revenue
2.7.1.3. Old pitch deck: $22M Year 1 (acknowledged fantasy, deleted)

### 2.7.2. Bot-Driven Projections (founder's real situation — Session 18, two-leg architecture)
2.7.2.1. Month 1 MAU: 9-15
2.7.2.2. Month 3 MAU: 30-50
2.7.2.3. Month 12 MAU: 400-700 (higher than initial bot estimate due to Leg 2 proactive posting)
2.7.2.4. Year 1 total signups: 900-1,500
2.7.2.5. Year 1 revenue: ~$3,100-6,000
2.7.2.6. Year 1 costs: ~$1,900 ($700 infrastructure + $1,200 bot costs)
2.7.2.7. **Year 1 net profit: ~$1,200-4,100**
2.7.2.8. Break-even month: ~Month 7-9
2.7.2.9. Months 1-7: lose ~$100/month while bot builds audience
2.7.2.10. Total risk if strategy fails: ~$600-800

### 2.7.3. Why Numbers Dropped from Old Model
2.7.3.1. Old model assumed 50 MAU Month 1 from word of mouth — founder has no mouth to word
2.7.3.2. Old model assumed 2,000 MAU by Month 12 — bot funnel math produces 338
2.7.3.3. Revenue dropped from $8,200 to $3,100 — fewer users = less money
2.7.3.4. Costs increased from $670 to $1,900 — added $100/mo bot automation
2.7.3.5. Still profitable — just smaller and more honest

### 2.7.4. Scaling Math
2.7.4.1. Double bot budget ($200/mo) ≈ double output ≈ ~800-1,400 Month 12 MAU
2.7.4.2. Triple bot budget ($300/mo) ≈ ~1,200-2,000 Month 12 MAU
2.7.4.3. Growth ceiling = wallet, not founder's time
2.7.4.4. Leg 2 (proactive X posting) scales faster than Leg 1 because follower growth compounds

---

# 3. B2B DATA PLAY

## 3.1. What We're Selling
3.1.1. "Structured, real-time opinion intelligence from real people defending positions in transcribed, scored, time-stamped debates"
3.1.2. No one else has this data
3.1.3. Polls ask questions, social media scrapes noise, this platform generates structured conviction data

## 3.2. Who Buys It
3.2.1. 25 industries identified, 250 data items mapped (10 per industry)
3.2.2. Political campaigns, polling firms, media companies, hedge funds, PR firms, ad agencies, brand strategy, legal (jury consultants), think tanks, government, entertainment, sports networks, tech, healthcare, insurance, education research, real estate, retail, pharma, automotive, telecom, energy, nonprofit, financial services, food & beverage

## 3.3. Data to Collect
3.3.1. Tier 1 (most wanted): topic sentiment, winning/losing arguments, demographics, sentiment shift, topic velocity
3.3.2. Requires: real accounts, profile depth, recordings + transcripts, vote timelines, argument segmentation

## 3.4. Data Confidence Scoring
3.4.1. Every data point gets confidence score
3.4.2. Weighted by participant trust, moderator trust, audience composition
3.4.3. New-account-heavy topics get flagged
3.4.4. Clients see confidence scores on everything

## 3.5. Pricing
3.5.1. Tier A startups: $1K/month
3.5.2. Tier B mid-market: $10K/month
3.5.3. Tier C enterprise: $50K+/month

## 3.6. Honest Assessment
3.6.1. Strongest long-term idea
3.6.2. Requires ~80% of roadmap completed first
3.6.3. Build consumer product first, B2B comes when data exists

---

# 4. EDUCATION (SEPARATE PRODUCT)

4.1. Decision: removed from main app for moral/liability reasons
4.2. Becomes "Colosseum Education" — target August 2026
4.3. Target: charter schools, homeschool co-ops
4.4. Extracted: ~130 lines of functions, EDU_TOPICS, 7 conditionals, 3 CSS classes
4.5. Compliance required: COPPA (under-13), FERPA (school data), parental consent flow, data handling policies for minors
4.6. Revenue: $8/student/month, school licenses $3K-100K/year

---

# 5. HONEST ASSESSMENT (Updated Session 18)

5.1. Financial projections were fantasy math ($22M Year 1 with no users) — now deleted and replaced with bot-driven model
5.2. Phase 1 marked COMPLETE but Stripe wasn't connected — now fixed (Session 10)
5.3. Phase 0 designed but never integrated
5.4. Bot defense built before having users to defend
5.5. B2B pitch sells data that doesn't exist
5.6. Document sprawl creates illusion of progress (70+ files, plans about plans)
5.7. The pattern: StreamToStage → Expressions Network → Moderator/Colosseum — planning replaces building, building replaces shipping
5.8. Core message: auth + Stripe + deploy + 10 real humans using it
5.9. **Session 18 addition:** The "10 real humans" plan assumed a personal network that doesn't exist. Founder has zero friends, zero family support, zero social presence. All previous growth strategies were written for a different person. Bot-driven growth is the only viable path.
5.10. **Session 18 addition:** Infrastructure is genuinely real now — 32+ files, 19 tables, 22 server functions, Stripe wired, auth working, security hardened. This is no longer plans about plans. But the user count is still 1.
5.11. **Session 18 addition:** The financial model is the most honest it's ever been. $3,100 Year 1 revenue with $1,200 profit. Small, but real, and built on math instead of hope.
5.12. **Session 19 addition:** Bot army code complete — 16 files, 2,304 lines, ready for deployment. Actual costs came in at $6-16/mo vs the $100/mo estimate. The gap between "built" and "deployed" is now one 60-90 minute setup session. Still 1 user.

---

# 6. RESEARCH FOUNDATIONS

6.1. Third Place Theory (Oldenburg 1989)
6.2. Progressive Disclosure (Nielsen Norman Group) — 7-9 options max
6.3. 90-9-1 Rule (Nielsen) — spectators are primary, updated to ~55-30-15
6.4. Choice Overload / Jam Study (Iyengar) — 6 flavors 30% bought, 24 flavors 3%
6.5. Emergent Gameplay (Juul, Smith, Salen & Zimmerman)
6.6. Participatory Culture (Henry Jenkins, MIT) — watching IS participating
6.7. Engineered Serendipity (Zuckerman, MIT Civic Media Lab)
6.8. SBMM Research (gaming industry) — casual protection non-negotiable
6.9. Short-form Clips — possibly single biggest growth lever
6.10. App Fatigue (CleverTap, Fast Company) — 65% don't download apps in 3 months
6.11. Ambient Engagement (PLOS Digital Health) — embed where people already are

## 6.12. Build Priority from Research
6.12.1. 🟢 First: Hot Takes feed, spectator tools, casual protection, debate clips, section layout
6.12.2. 🟡 Second: banner animations, "Bet." button, trending with quality signals, embed/share links
6.12.3. 🔴 Later: community captains, curated front page

## 6.13. Mobile UX Research — Session 11: Layout & Information Overload

6.13.1. Core problem confirmed: mobile screens are 5–6 inches — most apps replicate desktop layouts on tiny surfaces
6.13.2. Miller's Law: humans hold ~7 items (±2) in working memory
6.13.3. Decision fatigue: too many options = choice paralysis
6.13.4. Information Overload (Bertram Gross, 1964): when info exceeds processing capacity, decision quality drops
6.13.5. The 80/20 Rule: only 20% of features deliver 80% of value
6.13.6. Key stats: 53% abandon apps >3sec load, fintech cut 7 screens to 2 → 43% day-1 retention increase
6.13.7. Rules: One Primary Action Per Screen, Progressive Disclosure, White Space, Signal Over Noise, Consistency
6.13.8. The Colosseum problem: 8 distinct content zones on home — too much by every UX principle
6.13.9. Answer: live debate → hottest take → tonight's matchup. Not seven sections.

## 6.14. Mobile UX Research — Session 12: New Age Ideas & Examples

### 6.14.1. Full-Screen, Content-First Design
6.14.1.1. TikTok: auto-plays on open, full-screen, no choice paralysis
6.14.1.2. Twitch: straight into live content, chat layered on top
6.14.1.3. Colosseum application: open app → live debate within 1 second

### 6.14.2. Gesture-Driven Navigation
6.14.2.1. Swipe, pinch, edge-swipe reduce interaction time ~15%
6.14.2.2. Colosseum application: swipe up/down between debates, left for sidebar, right for chat

### 6.14.3. Micro-Interactions & Haptic Feedback
6.14.3.1. Vote = haptic tap + visual burst, KO = colosseum roar, challenge = rumble notification

### 6.14.4. Adaptive & Predictive UI (Phase 2-3)
6.14.4.1. App layout unique per user — rearranges based on behavior/context
6.14.4.2. Colosseum: Couples Court fan opens to Couples Court, politics fan sees political matchup first

### 6.14.5. Glassmorphism & Liquid Glass
6.14.5.1. Apple iOS 18 "Liquid Glass" — frosted translucent surfaces
6.14.5.2. ✅ Implemented Session 12: dark frosted glass cards across all pages

### 6.14.6. Emotional Design & Personality
6.14.6.1. "Ready to throw down?" not "Start Debate"
6.14.6.2. Crowd roar entering debate, ambient arena sounds, gladiator energy everywhere

### 6.14.7. Zero UI & Voice-First (long-term)
6.14.7.1. Voice commands to navigate, voice-to-take recording, voice reactions

### 6.14.8. Agentic UX (long-term)
6.14.8.1. The Moderator curates experience — learns topics, suggests challengers, auto-builds Tonight's Card

### 6.14.9. Thumb-Zone Architecture
6.14.9.1. Primary actions in bottom third, content up top
6.14.9.2. ✅ Implemented Session 12: spoke carousel thumb-drag, Hot Take FAB, bottom nav

### 6.14.10. Implementation Priority
6.14.10.1. ✅ Immediate: full-screen content-first, gesture nav, thumb-zone, brand personality
6.14.10.2. 🟡 Medium-term: glassmorphism (done), emotional empty states, sound design, voice
6.14.10.3. 🔴 Long-term: adaptive/predictive UI, agentic UX, generative UI

---

# 7. COMPLETE INVENTORY (502 items)

## 7.1. AREA 1: DEFENSE (62 items)

### 7.1.1. Client-Side Security (in V1)
7.1.1.1. ✅ XSS sanitization
7.1.1.2. ✅ Chat flood protection (5/10sec)
7.1.1.3. ✅ Ban evasion detection (fingerprinting)
7.1.1.4. ✅ New account cooldown (15min)
7.1.1.5. ✅ Mod privilege gating
7.1.1.6. ✅ Console wallet/elo protection
7.1.1.7. ✅ Input validation
7.1.1.8. ✅ Content blocklist
7.1.1.9. ✅ State protection (Object.freeze)
7.1.1.10. ✅ Report rate limiting
7.1.1.11. ✅ Prediction state freezing

### 7.1.2. Server-Side Security
7.1.2.1. ✅ Server-side vote recording — cast_vote() + vote_async_debate()
7.1.2.2. ✅ Server-side Elo calculation — finalize_debate()
7.1.2.3. ❌🔴 Server-side fingerprint storage
7.1.2.4. ✅ Move all security server-side — 22 SECURITY DEFINER functions, all writes gated, client JS migrated to .rpc() calls (Session 17)
7.1.2.5. ❌🟡 IP reputation checking
7.1.2.6. ❌🟢 Cloudflare CDN

### 7.1.3. Bot Defense Tier 1 — "Don't Get Embarrassed"
7.1.3.1. 📐 Browser fingerprinting (canvas, WebGL, audio context)
7.1.3.2. 📐 Headless browser detection
7.1.3.3. 📐 Device → account binding
7.1.3.4. 📐 Registration rate limiting
7.1.3.5. 💡 Audio verification (repeat random phrase)
7.1.3.6. 💡 Audio fingerprinting (voiceprint hash)
7.1.3.7. 💡 Minimum audio quality gate
7.1.3.8. 💡 Basic behavioral scoring
7.1.3.9. 💡 New accounts can't vote for 24hrs
7.1.3.10. 💡 Must complete 1 debate before votes count in B2B
7.1.3.11. 💡 Flag vote-only accounts (passive manipulation)

### 7.1.4. Bot Defense Tier 2 — "Real Money Flowing"
7.1.4.1. 💡 Advanced voice auth / deepfake detection
7.1.4.2. 💡 Real-time voice consistency checks
7.1.4.3. 💡 Liveness detection (random mid-debate prompts)
7.1.4.4. 💡 Coordinated behavior detection (graph analysis)
7.1.4.5. 💡 Account creation clustering
7.1.4.6. 💡 Topic heat anomaly (astroturfing)
7.1.4.7. 💡 Temporal pattern analysis
7.1.4.8. 💡🟡 Data confidence scoring
7.1.4.9. 💡 Graduated trust system
7.1.4.10. 💡 Honeypot debates
7.1.4.11. 💡 API/data access control
7.1.4.12. 💡 Scraping detection

### 7.1.5. Bot Defense Tier 3 — "Sell to Hedge Funds"
7.1.5.1. 💡⚪ AI voice arms race
7.1.5.2. 💡⚪ Deepfake vendor partnership
7.1.5.3. 💡⚪ Multi-modal liveness
7.1.5.4. 💡⚪ Network threat intelligence
7.1.5.5. 💡⚪ Geolocation verification
7.1.5.6. 💡⚪ Red team / pen testing
7.1.5.7. 💡⚪ Bug bounty
7.1.5.8. 💡⚪ Cryptographic data provenance
7.1.5.9. 💡⚪ ML anomaly detection
7.1.5.10. 💡⚪ KYC identity verification
7.1.5.11. 💡⚪ SOC 2 Type II
7.1.5.12. 💡⚪ Transparency reports

### 7.1.6. Vote Bombing Protection
7.1.6.1. 💡 Vote weight by trust score
7.1.6.2. 💡 Cluster voting flagging
7.1.6.3. 💡 Vote timestamp analysis
7.1.6.4. 💡 Honeypot debates

### 7.1.7. Air-Gapped Backup System (code exists, no DB)
7.1.7.1. 📐 backup_dump.py
7.1.7.2. 📐 restore_and_compare.py
7.1.7.3. 📐 rollback.py
7.1.7.4. 📐 YubiKey auth (string-length, not real hardware)
7.1.7.5. 📐 rules_engine.py
7.1.7.6. 📐 b2b_export.py

---

## 7.2. AREA 2: MONEY (47 items)

### 7.2.1. Payment Processing
7.2.1.1. ✅ Stripe integration for web
7.2.1.2. ✅ Connect to existing token purchase UI
7.2.1.3. ✅ Transaction receipts and history (payments + token_transactions tables)
7.2.1.4. 💡 Apple IAP
7.2.1.5. 💡 Google Play Billing

### 7.2.2. Colosseum Tiers
7.2.2.1. ✅ Lurker (free/ads)
7.2.2.2. ✅ Contender ($9.99)
7.2.2.3. ✅ Champion ($19.99)
7.2.2.4. ✅ Creator ($29.99)
7.2.2.5. 💡 Real-dollar tipping
7.2.2.6. 💡 Events revenue

### 7.2.3. Token Economy
7.2.3.1. ✅ 4 packages in UI
7.2.3.2. 📐 Earning mechanics designed
7.2.3.3. 📐 Free ~10 tokens/day, Pro ~30/day
7.2.3.4. 📐 Weekly leaderboard rewards
7.2.3.5. 📐 Referral cap 50/month
7.2.3.6. 📐 Anti-abuse rules

### 7.2.4. Cosmetics Shop
7.2.4.1. ✅ 10 original cosmetics
7.2.4.2. 📐 Expanded to 45
7.2.4.3. 📐 Rarity tiers
7.2.4.4. 💡 Limited edition / seasonal
7.2.4.5. 💡 Bundles
7.2.4.6. 💡 Item preview
7.2.4.7. 💡 "My Inventory" / equip screen
7.2.4.8. 💡 Gifting
7.2.4.9. 💡 Pro-only exclusives

### 7.2.5. Paywalls
7.2.5.1. ✅ 4 variants (general, shop, social, leaderboard)
7.2.5.2. ✅ Non-aggressive, dismissible
7.2.5.3. ✅ Trigger matches user intent — gate() helper
7.2.5.4. 📐 Target 8-12% conversion

### 7.2.6. Ad Revenue
7.2.6.1. 💡 30-sec slots between rounds
7.2.6.2. 💡 Banner ads free tier
7.2.6.3. 💡 Featured Debate sponsored placement
7.2.6.4. 💡 Promoted Topics

### 7.2.7. Reciprocal Gating
7.2.7.1. 💡 Can't see scores until you rate moderator
7.2.7.2. 💡 Every action tied to user reward
7.2.7.3. 💡 Gate rewards behind platform needs

---

## 7.3. AREA 3: USER INTERACTION (80 items)

### 7.3.1. Debate Formats
7.3.1.1. ✅ Standard/Timed
7.3.1.2. ✅ Crossfire
7.3.1.3. ✅ Q&A Prep
7.3.1.4. ✅ 2-min rounds, 30-sec breaks
7.3.1.5. 💡 Long-form debates
7.3.1.6. 💡 Tournament format
7.3.1.7. 💡 Custom room creation (Pro)

### 7.3.2. Debate Experience
7.3.2.1. ✅ WebRTC audio
7.3.2.2. ✅ Timer and round counter
7.3.2.3. ✅ Speaker indicator / waveforms
7.3.2.4. ✅ Mic controls
7.3.2.5. ✅ Fight animation
7.3.2.6. ✅ Procedural audio
7.3.2.7. ❌🟡 Text chat between debaters
7.3.2.8. 💡 Request time extension
7.3.2.9. 💡 "Call for evidence" pause
7.3.2.10. 💡 AI fact-check overlay
7.3.2.11. 💡 Recording indicator
7.3.2.12. 💡 Concede button
7.3.2.13. 💡 Pause for tech issues
7.3.2.14. 💡 Report mid-debate
7.3.2.15. 💡 Power-ups (extra 30sec for tokens)

### 7.3.3. Async Debate (SURVIVAL CRITICAL)
7.3.3.1. ✅ Text async — post argument, opponent replies later
7.3.3.2. ✅ Voice memo — record take, opponent records later
7.3.3.3. 💡🟡 AI sparring — practice when nobody's online
7.3.3.4. ✅ Solves empty lobby problem

### 7.3.4. Scoring & Rankings
7.3.4.1. ✅ Elo rating
7.3.4.2. ✅ Win/loss tracking
7.3.4.3. ✅ XP / leveling
7.3.4.4. ✅ Achievements
7.3.4.5. ✅ Streak tracking
7.3.4.6. ❌🟡 Moderator scoring formula
7.3.4.7. 💡 Debate quality rating
7.3.4.8. 💡 "Did this change your mind?"

### 7.3.5. Matchmaking & Lobby
7.3.5.1. ✅ Waiting pool
7.3.5.2. ✅ Accept match
7.3.5.3. ❌🟡 Elo range filter
7.3.5.4. ❌🟡 Topic preference
7.3.5.5. ✅ Estimated wait time (matchmaking timer)
7.3.5.6. ❌ Rematch option
7.3.5.7. 💡 Priority matchmaking (tokens)
7.3.5.8. 💡 Choose opponent (tokens)
7.3.5.9. 💡 Private room (tokens)
7.3.5.10. 💡 Scouting report (tokens)
7.3.5.11. 💡 Hated Rivals — designated rival, 2x points on win

### 7.3.6. Predictions / Wagering
7.3.6.1. ✅ Predictions system
7.3.6.2. ✅ Fantasy picks
7.3.6.3. 💡 Prediction streaks / leaderboard
7.3.6.4. 💡 "Who called it" social proof
7.3.6.5. 💡 Predictions as core engagement
7.3.6.6. 💡 Spectators = audience, debaters = content
7.3.6.7. 💡 Spectator brackets
7.3.6.8. 💡 Debate-to-reality correlation

### 7.3.7. Spectator Experience
7.3.7.1. ✅ Spectator chat (text + emoji)
7.3.7.2. 💡 Super chat (pin for tokens)
7.3.7.3. 💡 Reaction bombs (screen-wide for tokens)
7.3.7.4. 💡 Tip debater (tokens)
7.3.7.5. 💡 Emote/reaction system
7.3.7.6. 💡 Cheer mechanic
7.3.7.7. 💡 Follow from spectator view
7.3.7.8. 💡 Clip/share button

### 7.3.8. Post-Debate
7.3.8.1. ✅ "Change your mind?" survey
7.3.8.2. 💡 Expert annotation
7.3.8.3. 💡 Full transcript download
7.3.8.4. 💡 Shareable highlight
7.3.8.5. 💡 Rematch (tokens)
7.3.8.6. 💡 Bookmark/save debates

### 7.3.9. Moderation System
7.3.9.1. ✅ Report queue / mod dashboard
7.3.9.2. ✅ Mod actions (ban, mute, warn, dismiss)
7.3.9.3. ✅ "Judge Dredd" / "Jury Duty" achievements
7.3.9.4. ✅ "Book a Moderator" (75 tokens)
7.3.9.5. ❌ No real mod application process
7.3.9.6. ❌ No temp bans
7.3.9.7. ❌ No evidence preview
7.3.9.8. ❌ No mod performance tracking
7.3.9.9. 💡 Moderator tiers
7.3.9.10. 💡 Certification flow
7.3.9.11. 💡 Revenue share from bookings
7.3.9.12. 💡 Code of conduct
7.3.9.13. 💡 Audit log visible to other mods

---

## 7.4. AREA 4: IDENTITY & ACCOUNTS (62 items)

### 7.4.1. Authentication
7.4.1.1. ✅ Real email/password auth
7.4.1.2. ✅ Login/signup UI
7.4.1.3. ✅ Password hashing (Supabase bcrypt)
7.4.1.4. ✅ JWT sessions (15m access + 7d refresh)
7.4.1.5. ✅ Email verification — working
7.4.1.6. ✅ Password reset — fixed Session 9
7.4.1.7. ✅ Account recovery / deletion
7.4.1.8. ❌ Cross-device session sync
7.4.1.9. ✅ Google OAuth (wired, needs enabling in Supabase)
7.4.1.10. ✅ Apple OAuth (wired, needs enabling in Supabase)
7.4.1.11. 💡 Phone verification
7.4.1.12. 💡 2FA/MFA
7.4.1.13. ✅ Rate limiting on login (5 attempts → 60s lockout)

### 7.4.2. Onboarding
7.4.2.1. ✅ 5-step creator flow
7.4.2.2. ✅ Welcome XP bonus
7.4.2.3. ✅ Intro animation
7.4.2.4. ✅ Real account creation
7.4.2.5. ✅ ToS shown during signup

### 7.4.3. Age Verification
7.4.3.1. ✅ Age gate (DOB field)
7.4.3.2. ✅ Under-18 flag (is_minor in profiles)
7.4.3.3. ❌ Parental consent flow
7.4.3.4. ✅ Restricted features for minors (blocked from payments)

### 7.4.4. Profile System
7.4.4.1. ✅ Basic profile (name, avatar, bio)
7.4.4.2. ✅ User stats (Elo, wins, losses)
7.4.4.3. ✅ Achievement showcase
7.4.4.4. ✅ Cosmetics display
7.4.4.5. ✅ Profile Depth System (12 sections, 147 Qs)
7.4.4.6. ✅ Mixed rewards (discounts, badges, icons, features)
7.4.4.7. ✅ Visual discount waterfall ($14.99 → $0.49)
7.4.4.8. 📐 Age-gated restricted version
7.4.4.9. 📐 B2B data pipeline from answers

### 7.4.4.10. Profile Depth Sections (all 📐)
7.4.4.10.1. The Basics (8 Qs) — $2 off/mo
7.4.4.10.2. Who You Are (12 Qs) — Profile Border Pack
7.4.4.10.3. Debate DNA (14 Qs) — Debate DNA Badge
7.4.4.10.4. Hot Takes (20 Qs) — $2.50 off/mo
7.4.4.10.5. Your Media Diet (12 Qs) — Custom Profile Theme
7.4.4.10.6. Money & Work (15 Qs) — $2 off/mo
7.4.4.10.7. Values & Beliefs (14 Qs) — Values Badge
7.4.4.10.8. Lifestyle (12 Qs) — Lifestyle Badge
7.4.4.10.9. Tech & Digital (10 Qs) — Tech Theme
7.4.4.10.10. Sports & Competition (12 Qs) — Team Crest
7.4.4.10.11. Debate History (8 Qs) — Veteran Badge
7.4.4.10.12. Future & Predictions (10 Qs) — $1.50 off/mo

### 7.4.5. Settings
7.4.5.1. ✅ Settings page
7.4.5.2. ✅ Notification preferences
7.4.5.3. ✅ Privacy controls
7.4.5.4. ✅ Audio/mic persistence
7.4.5.5. ✅ Account management
7.4.5.6. ✅ Delete account (GDPR)

### 7.4.6. Database
7.4.6.1. ✅ Supabase project live (faomczmipsccwbhpivmp)
7.4.6.2. ✅ Schema — 18 tables (19 with rate_limits, 20 with bot_activity)
7.4.6.3. ✅ Tables: profiles, user_settings, profile_depth_answers, cosmetics, user_cosmetics, achievements, user_achievements, follows, notifications, debates, debate_votes, predictions, reports, token_transactions, payments, async_debates, hot_takes, hot_take_reactions, rate_limits, bot_activity

---

## 7.5. AREA 5: SOCIAL (31 items)

### 7.5.1. Follow / Friend System
7.5.1.1. ✅ Follow any user
7.5.1.2. ✅ Follower / following counts
7.5.1.3. ❌ Activity feed
7.5.1.4. 💡 "Friend's debate starting" alerts
7.5.1.5. 💡🔴 Follow system MUST be free tier

### 7.5.2. Notifications
7.5.2.1. ✅ In-app notification center
7.5.2.2. ❌ Push notifications
7.5.2.3. ❌ Email notifications
7.5.2.4. ❌ Triggers: debate starts, challenged, ranked up, report resolved
7.5.2.5. ✅ Notification system designed (bell, slide-down, filters, toasts)

### 7.5.3. Share / Invite / Viral Loop
7.5.3.1. ✅ Share debate result card
7.5.3.2. ✅ Share profile link
7.5.3.3. ✅ Invite friend with referral token
7.5.3.4. ✅ Deep links
7.5.3.5. ✅ "Challenge a friend" invite link
7.5.3.6. ✅ Every debate ends with share prompt

### 7.5.4. Chat / DMs
7.5.4.1. ❌ Private messaging
7.5.4.2. ❌ Pre-debate coordination
7.5.4.3. ❌ Post-debate conversation
7.5.4.4. ❌ Rate-limited, content-filtered
7.5.4.5. ❌ Block user

### 7.5.5. Search & Discovery
7.5.5.1. ❌ Search users
7.5.5.2. ❌ Search topics/debates
7.5.5.3. ❌ Search by school
7.5.5.4. ❌ Filters

### 7.5.6. Teams / Squads
7.5.6.1. ❌ Create team
7.5.6.2. ❌ Team admin
7.5.6.3. ❌ Team leaderboard/stats
7.5.6.4. ❌ Team cosmetics/badges
7.5.6.5. ❌ Team debate history
7.5.6.6. 💡 School-vs-school tournaments

---

## 7.6. AREA 6: EXPERIENCE DESIGN (50 items)

### 7.6.1. Layout & Navigation
7.6.1.1. ✅ Single-page app with go() navigation
7.6.1.2. ✅ Home, Discover, Lobby, Debate, Profile, Shop, Leaderboard
7.6.1.3. ✅ Bottom nav bar
7.6.1.4. ✅ "Continue where you left off"
7.6.1.5. ✅ Notification summary on home
7.6.1.6. ❌ Friend activity feed on home

### 7.6.2. Section/Banner Layout
7.6.2.1. 💡 Distinct sections like newspaper
7.6.2.2. 💡 Championship banners with animation
7.6.2.3. 💡 Category identity — Politics=navy, Sports=team colors
7.6.2.4. 💡 Trending section — social media feed logic
7.6.2.5. 💡 Sections feel like "going somewhere"

### 7.6.3. Colosseum Visual Versions
7.6.3.1. 📐 V1 — flat desktop (exists)
7.6.3.2. 📐 V2 — 3D depth
7.6.3.3. ✅ V3 — mobile-forward spoke carousel (PRIORITY, built Session 12)

### 7.6.4. Mobile Design
7.6.4.1. ✅ Mobile-forward — phone default
7.6.4.2. ✅ 44px minimum touch targets
7.6.4.3. ✅ Scroll-snap with touch momentum
7.6.4.4. 💡 Desktop 1100px+ gets sidebar

### 7.6.5. Topic Architecture
7.6.5.1. Tier 1: Politics + Sports
7.6.5.2. Tier 2: Entertainment/Tabloids + Couples Court
7.6.5.3. Tier 3: Music, Movies/TV, Cars/Culture

### 7.6.6. Onboarding / Tutorial
7.6.6.1. 💡 How Elo works
7.6.6.2. 💡 What tokens are for
7.6.6.3. 💡 Debate formats explained
7.6.6.4. 💡 "How to debate" guide
7.6.6.5. 💡 Contextual tooltips

### 7.6.7. Accessibility
7.6.7.1. 💡 Screen reader
7.6.7.2. 💡 Closed captions
7.6.7.3. 💡 High contrast
7.6.7.4. 💡 Keyboard navigation

### 7.6.8. Multi-Language
7.6.8.1. 💡⚪ Other languages
7.6.8.2. 💡⚪ Translated UI
7.6.8.3. 💡⚪ Language-filtered lobby

---

## 7.7. AREA 7: DATA / B2B (46 items)

### 7.7.1. Tier 1 Core Data Items
7.7.1.1. 💡 Topic sentiment breakdown
7.7.1.2. 💡 Winning/losing arguments
7.7.1.3. 💡 Demographic breakdown
7.7.1.4. 💡 Sentiment shift timeline
7.7.1.5. 💡 Topic velocity / emergence signals
7.7.1.6. 💡 Longitudinal tracking
7.7.1.7. 💡 Emotional intensity scoring
7.7.1.8. 💡 Source credibility scoring
7.7.1.9. 💡 Counter-argument mapping
7.7.1.10. 💡 Audience engagement depth

### 7.7.2. Data Items to Build
7.7.2.1. ❌ Vote timeline (intervals, not just final)
7.7.2.2. ❌ Argument segmentation
7.7.2.3. ❌ Argument-level scoring
7.7.2.4. ❌ User demographic signals
7.7.2.5. ❌ Topic velocity tracker
7.7.2.6. ❌ Longitudinal topic index
7.7.2.7. ❌ Emotional intensity tags
7.7.2.8. ❌ Source credibility aggregation
7.7.2.9. ❌ Counter-argument graph
7.7.2.10. ❌ Engagement depth tracking
7.7.2.11. ❌ Entity/brand mention detection
7.7.2.12. ❌ Argument classification engine
7.7.2.13. ❌ Cross-topic correlation
7.7.2.14. ❌ Regional tagging
7.7.2.15. ❌ Alert/webhook for topic spikes
7.7.2.16. ❌ Debater influence scoring

### 7.7.3. B2B Infrastructure
7.7.3.1. ❌ API access
7.7.3.2. ❌ Data products
7.7.3.3. ❌ Anonymized/aggregated
7.7.3.4. ❌ Self-serve dashboard
7.7.3.5. ❌ Pricing tiers

### 7.7.4. Debate Recording & Transcripts (REQUIRED for B2B)
7.7.4.1. ❌🔴 Record all debates (currently evaporate)
7.7.4.2. ❌ Replay page
7.7.4.3. ❌ Shareable replay link
7.7.4.4. ❌ Timestamp comments on replay
7.7.4.5. ❌ Analytics overlay

---

## 7.8. AREA 8: CONTENT ENGINE (39 items)

### 7.8.1. Hot Takes Feed
7.8.1.1. ✅ Casual social layer
7.8.1.2. ✅ Post → React → Challenge → Structure appears
7.8.1.3. ✅ Post, react, challenge all built
7.8.1.4. 💡 System detects heat, offers structure

### 7.8.2. Trending & Discovery
7.8.2.1. ✅ Live activity ticker
7.8.2.2. ✅ Challenge heat scores
7.8.2.3. ❌ Trending section with feed logic
7.8.2.4. 💡 Engineered serendipity

### 7.8.3. Highlights & Clips
7.8.3.1. 💡 Clip best moments
7.8.3.2. 💡 Shareable clips (watermark / clean)
7.8.3.3. 💡 Clips feed
7.8.3.4. 💡 "Best of the week"

### 7.8.4. Leaderboards
7.8.4.1. ✅ Basic leaderboard
7.8.4.2. ✅ Filter by topic, format, time
7.8.4.3. ✅ "My rank" quick-jump
7.8.4.4. ❌ Elo history chart
7.8.4.5. 💡 "Rising stars"
7.8.4.6. 💡 Team/school leaderboard
7.8.4.7. 💡 Regional leaderboard
7.8.4.8. 💡 Prediction leaderboard

### 7.8.5. Content Funnel
7.8.5.1. 💡 Social layer → formal debate
7.8.5.2. 💡 "Take it to the moderator"
7.8.5.3. 💡 Works both ways — internal and external

### 7.8.6. External Integration / Viral Loop
7.8.6.1. 💡 Browser extension
7.8.6.2. 💡 Embeddable link/button
7.8.6.3. 💡 Target group chats/Discord/iMessage
7.8.6.4. 💡 "Take it to The Moderator" as concept

### 7.8.7. Tournaments & Seasons
7.8.7.1. 💡 Bracket tournaments
7.8.7.2. 💡 Entry fees / prize pools
7.8.7.3. 💡 School-vs-school
7.8.7.4. 💡 Seasonal championships
7.8.7.5. 💡 Battle Pass / Season Pass
7.8.7.6. 💡 Exclusive cosmetics per season
7.8.7.7. 💡 Season narrative/theme

### 7.8.8. Scheduling
7.8.8.1. 💡 Future time debates
7.8.8.2. 💡 Invite participants
7.8.8.3. 💡 Spectator RSVP
7.8.8.4. 💡 Calendar integration
7.8.8.5. 💡 Reminder notifications

---

## 7.9. AREA 9: EDUCATION (29 items)

7.9.1. 💡🔴 DECISION: Remove from main app
7.9.2. 💡🔴 Separate product ("Colosseum Education")
7.9.3. 💡 Ship August 2026
7.9.4. 💡 Target: charter schools, homeschool co-ops
7.9.5. 📐 ~130 lines extracted and documented
7.9.6. 📐 EDU_TOPICS (5 categories, 4 topics each)
7.9.7. 📐 7 schoolMode conditionals
7.9.8. 📐 3 CSS classes, toggle button
7.9.9. 📐 Classroom mode with class codes
7.9.10. 📐 Teacher tools
7.9.11. 📐 Structured debate formats
7.9.12. 💡 School subscription tier
7.9.13. 💡 Admin dashboard for coaches
7.9.14. 💡 Debate templates
7.9.15. 💡 Content-safe mode
7.9.16. 💡 FERPA documentation
7.9.17. 💡 Debate calendar for class
7.9.18. 📐 Per-student $8/mo
7.9.19. 📐 School licenses $3K-100K/year
7.9.20. ❌🔴 COPPA compliance
7.9.21. ❌🔴 FERPA compliance
7.9.22. ❌ Parental consent flow
7.9.23. ❌ Data handling for minors

---

## 7.10. AREA 10: PLATFORM PHILOSOPHY (36 items)

### 7.10.1. Core Identity
7.10.1.1. 💡🔴 "Emergence engine, not a debate app"
7.10.1.2. 💡 Four mechanics: Post → React → Challenge → Structure
7.10.1.3. 💡 Casual tier is king

### 7.10.2. Design Principles
7.10.2.1. 💡 Structured spontaneity
7.10.2.2. 💡 Engineered serendipity
7.10.2.3. 💡 Participatory culture
7.10.2.4. 💡 Third place theory

### 7.10.3. Growth Philosophy
7.10.3.1. 💡 Funnel = emotional investment escalating naturally
7.10.3.2. 💡 Spectators → participants when someone says something they can't let slide
7.10.3.3. 💡 Debaters = content, predictors = audience

### 7.10.4. Honest Assessment
7.10.4.1. 📐🔴 70+ files, mostly plans about plans
7.10.4.2. 📐🔴 $0 revenue, 1 user (founder), deployed at colosseum-six.vercel.app, bot army built but not yet deployed
7.10.4.3. 📐🔴 Fantasy financial projections — replaced with bot-driven model (Session 18)
7.10.4.4. 📐🔴 The pattern: planning replaces building, building replaces shipping

### 7.10.5. Open Identity
7.10.5.1. 💡🔴 The Moderator or The Colosseum? Which one ships?

---

# 8. USER ACQUISITION & GROWTH STRATEGY

### Research completed Session 13 (Feb 28), revised Session 18 (Mar 1). Zero-budget → $100/mo bot-driven, solo-founder, mobile-forward.

## 8.1. CORE THESIS (Updated Session 18)

8.1.1. People are already arguing on Reddit, X, Discord, Telegram, and group chats — The Colosseum intercepts demand, doesn't create it
8.1.2. Nobody leaves a platform unless the new thing is frictionless, immediately rewarding, and doesn't require signup to taste
8.1.3. Every shared link is an ad. Every debate result is a billboard. Every user is a promoter
8.1.4. ~~Paid advertising is not viable — all tactics must be $0 or near-$0~~ **Updated: $100/month bot budget allocated (Session 18)**
8.1.5. The install is NOT the goal — engagement is. 80% of app users churn within 3 days
8.1.6. **Founder has no personal network, no social presence, no time for manual marketing. All growth must be fully automated with zero human involvement. (Session 18)**
8.1.7. **Growth scales with money, not founder energy. Double the bot budget = roughly double the output. (Session 18)**

## 8.2. CASE STUDIES

8.2.1. **Polymarket** — 0 to 500M visitors in 6 months, near-zero paid ads. Rich link previews, organic social, meme marketing, X partnership (20,000x userbase). 50% direct URL, 30% organic search, 5% social.
8.2.2. **Hotmail** — "Get your own free Hotmail" signature → 20K to 1M in one year, 86M by 2001
8.2.3. **Dropbox** — referral program → 3,900% growth in 15 months
8.2.4. **Airbnb** — scraped Craigslist, emailed owners to cross-post
8.2.5. **Reddit** — founders created fake accounts to make site appear active
8.2.6. **Tinder** — exclusive college parties requiring app download
8.2.7. Key pattern: every breakout found where users already were and built a bridge

## 8.3. THE CONVERSION FUNNEL

8.3.1. Bot finds argument on Reddit/X/Discord
8.3.2. → Bot drops contextual comment with Colosseum link (rich preview card)
8.3.3. → User lands on topic page — sees live votes, hot takes
8.3.4. → Votes with one tap — NO ACCOUNT REQUIRED
8.3.5. → Gets hooked — sees results
8.3.6. → "Want to debate this? Sign up in 10 seconds"
8.3.7. → Google OAuth one-tap → they're in
8.3.8. RULE: never require signup to consume

## 8.4. BOT-DRIVEN GROWTH — TWO-LEG ARCHITECTURE (Session 18)

### 8.4.0. Two Legs
8.4.0.1. **Leg 1 — Reactive (fishing in other people's ponds):** Scan Reddit, X, Discord for existing arguments. Drop contextual replies with Colosseum links. ~3% CTR. Steady drip from established communities.
8.4.0.2. **Leg 2 — Proactive (creating your own pond):** Scan Google News, ESPN, trending X topics every few minutes. When something breaks, auto-generate a hot take post on @TheColosseum X and auto-create a matching debate/vote page on the app. Page exists before anyone clicks. ~5-8% CTR. Higher value — you own the content, you own the audience, no ban risk.
8.4.0.3. Both legs run 24/7 simultaneously.
8.4.0.4. Leg 2 becomes the dominant growth driver as @TheColosseum X account builds followers.

### 8.4.1. Leg 1 — Reactive Capacity
8.4.1.1. Reddit: 10 rotating accounts × 25 comments/day = 250 comments/day
8.4.1.2. X/Twitter reply accounts: 3 accounts × 30 replies/day = 90/day
8.4.1.3. Discord: 15 servers, bots respond to arguments = ~30 interactions/day
8.4.1.4. Leg 1 total raw mentions: ~370/day
8.4.1.5. ~50% survive moderation/bans = ~185 visible/day
8.4.1.6. ~5,550 visible mentions/month

### 8.4.1b. Leg 2 — Proactive Capacity
8.4.1b.1. Google News / ESPN / trending topic scan: continuous
8.4.1b.2. @TheColosseum X posts: 5-10 hot takes/day timed to breaking news
8.4.1b.3. Auto-generated debate pages on app for each post (page exists before anyone clicks)
8.4.1b.4. X organic reach on trending topics: 500-5,000 impressions per well-timed post
8.4.1b.5. Leg 2 total: 5-10 original posts/day, ~2,500-25,000 impressions/day
8.4.1b.6. Leg 2 has higher CTR (~5-8%) because the content IS the hook

### 8.4.2. Combined Funnel Math
8.4.2.1. Leg 1 CTR: ~3% (stranger in someone else's conversation) → ~167 visits/month
8.4.2.2. Leg 2 CTR: ~5-8% (original content, direct link) → scales with impressions
8.4.2.3. Combined: total daily reach ~3,000-25,000+ impressions
8.4.2.4. 30% of visitors vote (ungated, one tap)
8.4.2.5. 15% of voters sign up (OAuth one-tap)
8.4.2.6. 1.3x word-of-mouth multiplier → ~9-15 new users/month (Month 1)
8.4.2.7. By Month 12: ~200-400 new users/month (Leg 2 dominant as X account grows)

### 8.4.3. Bot Costs ($100/month budget — actual ~$6-16/mo as of Session 19)
8.4.3.1. VPS hosting (bot runs 24/7): $6 (DigitalOcean Basic — Session 19)
8.4.3.2. Groq AI (hot take + reply generation): $0 (free tier — Session 19)
8.4.3.3. Reddit API: $0 (free)
8.4.3.4. Twitter/X API: $0 (free tier, write-only — Session 19)
8.4.3.5. Discord API: $0 (free)
8.4.3.6. Proxy rotation (optional, avoid IP bans): $5-10
8.4.3.7. Reserve/scaling budget: $84-89
8.4.3.8. **Note:** Session 18 estimated $100/mo. Session 19 built the actual bot and found most tools have free tiers. Real cost is $6-16/mo, leaving ~$84-94/mo for scaling later.

### 8.4.4. Platform-Specific Bot Rules
8.4.4.1. **Reddit:** New accounts get ~1 comment/10 min. Aged accounts ~1/min. Shadowbans are silent — bot must detect them. Accounts are free, rotate when burned.
8.4.4.2. **X/Twitter:** 50-100 posts/replies per day per account before throttling. Scheduled hot takes timed to news cycle. 3-5 per day from @TheColosseum brand account.
8.4.4.3. **Discord:** Bots that spam get kicked. Respond only to actual arguments. Already-built /settle and /debate bots live in servers permanently.

### 8.4.5. Founder Involvement: ZERO
8.4.5.1. Founder does not review comments
8.4.5.2. Founder does not approve posts
8.4.5.3. Founder does not choose threads
8.4.5.4. The machine runs itself
8.4.5.5. Founder's only job: keep paying the hosting bill

## 8.5. LEGACY TACTICS (still valid, lower priority)

### 8.5.1. F5Bot — Free Reddit/HN Radar
8.5.1.1. f5bot.com monitors ALL of Reddit, HN, Lobsters for keywords — emails within minutes
8.5.1.2. Free. Keywords: "hot take", "debate me", "change my mind", "settle this", "who wins", "unpopular opinion"
8.5.1.3. Now feeds into Leg 1 bot — bot receives F5Bot alerts and auto-responds

### 8.5.2. Built Growth Infrastructure
8.5.2.1. ✅ Dynamic OG meta tags (Session 14)
8.5.2.2. ✅ Watermark on all share outputs (Session 14)
8.5.2.3. ✅ Shareable result cards (Session 14)
8.5.2.4. ✅ Ungated debate landing page (Session 14)
8.5.2.5. ✅ Telegram bot (Session 15)
8.5.2.6. ✅ Discord bot (Session 15)

## 8.6. FUTURE BUILDS (when user count justifies)

8.6.1. Chrome extension MVP — when 50+ users
8.6.2. Embeddable widget — when content exists
8.6.3. Short-form video clips — when live debates exist
8.6.4. AI agent debates — if trend emerges

## 8.7. INDUSTRY TRENDS (2025-2026)

8.7.1. Retention-first: 80% of future mobile revenue from 20% of existing customers
8.7.2. Intent > volume: target high-intent users (people already arguing)
8.7.3. Privacy-first attribution: behavioral tracking dead, first-party data essential
8.7.4. Community > ads: Discord, Telegram, niche forums where organic growth happens
8.7.5. Mobile is the persistent home base across all platforms

## 8.8. KEY RULES (Updated Session 18)

8.8.1. Don't require signup to consume
8.8.2. Reddit 80/20 rule: 80% value, 20% self-promo (bot must follow this)
8.8.3. Every output carries branding — watermark, OG card, share card
8.8.4. Intercept arguments where they already happen
8.8.5. Group chats > public platforms
8.8.6. The product IS the growth hack — if debates are entertaining, people share them
8.8.7. Speed wins: have a Colosseum debate page for trending topics within minutes
8.8.8. **Founder touches nothing — bot handles all outreach (Session 18)**
8.8.9. **Burned accounts are expected cost of business — free to create, rotate when banned (Session 18)**
8.8.10. **Scale with money, not with sleep deprivation (Session 18)**

---

## 8.9. Design Documents (complete, not wired)

8.9.1. `cosmetics-shop-expanded.json` — 45 items
8.9.2. `subscription-tier-design.json` — Free vs Pro ($9.99/mo)
8.9.3. `token-earning-mechanics.json` — daily challenges, streaks, leaderboard
8.9.4. `paywall-modal-design.json` — 4 contextual variants
8.9.5. `paywall-modal-mockup.html` — visual preview
8.9.6. `profile-depth-system.jsx` — 12 sections, 157 questions, interactive prototype

## 8.10. Supporting Documents

8.10.1. `the-moderator-honest-document.docx` — reality check, solo founder roadmap
8.10.2. `the-moderator-b2b-industry-analysis.md` — 25 buyer industries
8.10.3. `b2b-industry-item-lists.md` — 250 data items mapped
8.10.4. `the-moderator-bot-defense-tiers.md` — 3-tier strategy
8.10.5. `the-moderator-education-deep-dive.md` — education market models
8.10.6. `the-moderator-education-extracted.md` — ~130 lines pulled from V1
8.10.7. `the-moderator-pitch-deck.html` / `.md` — investor pitch
8.10.8. `colosseum-ring-architecture__1_.md` — full castle ring architecture

## 8.11. Financial Models (Session 18)

8.11.1. `colosseum-financials-session18.xlsx` — Original projections (assumed organic network exists)
8.11.2. `colosseum-financials-v2-botdriven.xlsx` — Bot-driven projections (founder's real constraints). 4 tabs: Bot Funnel Math, Year 1 Projections, Snapshot, Old vs New.
8.11.3. **Session 19 note:** Bot costs came in at $6-16/mo vs the $100/mo modeled. Year 1 bot costs drop from ~$1,200 to ~$72-192, improving net profit. Financial spreadsheets not updated yet — numbers are conservative.

---

*This is the Old Testament. For the living document that guides every session — see the New Testament.*
