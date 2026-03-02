# THE COLOSSEUM — NEW TESTAMENT
### The Living Document — Read Every Session
### Last Updated: Session 25 (March 2, 2026)

> **The Old Testament** contains: ALL session build logs (1-24), 502+ item inventory, revenue model details, B2B data play, education plans, research foundations, growth strategy, and honest assessments. Read it when those areas are relevant.
> **Location:** `https://raw.githubusercontent.com/wolfe8105/colosseum/main/THE-COLOSSEUM-OLD-TESTAMENT.md`

---

# 1. WHAT THIS IS

1.1. Live audio debate platform / emergence engine
1.2. Users hang out in themed sections, post hot takes, react, debates emerge from disagreements
1.3. Four core mechanics: Post → React → Challenge → Structure appears
1.4. Revenue: consumer subs, token economy, ads, B2B data licensing
1.5. Philosophy: digital third place — not a destination, a place you're already in
1.6. Identity question (OPEN): "The Moderator" or "The Colosseum"
1.7. Owner: solo founder, no team, no money yet, no deadline

---

# 2. FOUNDER CONSTRAINTS (Session 18 — Critical Context)

2.1. Full-time engineering job (new job, no leverage yet)
2.2. Two children under age 10
2.3. No spouse assistance, no parents (both gone), no siblings, no extended family
2.4. No friends in 25 years — zero personal network
2.5. No social media accounts — none
2.6. Android phone
2.7. ~1 hour free per day after work and kids
2.8. Up to $100/month budget for growth tools
2.9. **IMPLICATION: "Send to 10 friends" is impossible. Manual marketing is impossible. All growth must be automated with zero human involvement.**

---

# 3. GUIDING PRINCIPLES

3.1. **Temporary functional placeholders** — never block on human action, use "PASTE HERE" markers, app runs with placeholders
3.2. **Slow down, suggest, wait** — Claude presents 2-4 options, owner picks direction
3.3. **Small chunks with downloads** — work in pieces, present file, pause, ask what's next
3.4. **Allowed to fail** — better to attempt and fail than plan forever
3.5. **Verify before claiming done** — when "saved," confirm it's actually there
3.6. **Full file replacement over patches** — always produce the complete finished file. Never diffs, patches, or partial snippets. Human deletes old file and replaces with new one.
3.7. **Bible is split** — New Testament read every session. Old Testament is reference, read only when relevant.
3.8. **Read the bible first** — every session starts by reading the New Testament.
3.9. **Zero founder marketing time** — all growth is bot-driven, fully automated. Founder does not review, approve, or post anything.
3.10. **Keep it simple** — Claude gives instructions in plain steps. No walls of text. One thing at a time.

---

# 4. KEY DECISIONS (Condensed — full list in Old Testament)

4.1. Rebrand to The Colosseum, target male opinion culture 16-65
4.2. Mobile-forward design, phone is default
4.3. Real-dollar tipping replaces token microtransactions
4.4. Education removed for moral reasons, separate product later (August 2026)
4.5. Profile Depth System approved — 12 sections, 157 Qs, mixed rewards, $14.99 reducible to $0.49
4.6. No B2B, no education, no bot defense until real users exist
4.7. Async debate mode is survival-critical (liquidity problem)
4.8. Predictions = core engagement loop
4.9. Supabase chosen for backend
4.10. Kill the tile grid → spoke carousel (6 tiles, hollow center, 18° tilt, thumb-spin)
4.11. Visual system: Cinzel + Barlow Condensed, diagonal gradient, dark frosted glass cards
4.12. Login flow: OAuth dominant, email collapsed behind toggle
4.13. All table writes locked behind server functions. Client JS uses supabase.rpc() for all mutations.
4.14. Hated Rivals mechanic, Couples Court category
4.15. Bot-driven growth model — fully automated 24/7 bot army, $6-16/mo actual cost
4.16. Groq free tier for AI generation — Llama 3.1 70B
4.17. Leg 3: Auto-Debate Rage-Click Engine — AI generates full debates, scores them lopsided, posts rage-bait hooks
4.18. Controversial scoring IS the marketing — AI deliberately picks the unpopular winner
4.19. react_hot_take() is a toggle function — single RPC handles both adding and removing
4.20. Bot starts in DRY_RUN mode — logs all actions without posting
4.21. Supabase has no CORS dashboard setting — protection comes from RLS, auth tokens, middleware.js, Edge Function CORS
4.22. Category overlays wired to Supabase — hot takes feed is live per category (Session 22)
4.23. Auth uses readyPromise pattern — never setTimeout for async state (Session 23)
4.24. User profile modals — tappable usernames throughout the app open bottom-sheet with stats + follow + rival (Session 23)
4.25. Predictions live in category overlay as a second tab alongside hot takes (Session 23)
4.26. Hated Rivals capped at 5 active per user — scarcity creates value (Session 23)
4.27. Version 2.2.0 — feature flags: followsUI, predictionsUI, rivals, arena (Session 24)
4.28. Arena supports 4 debate modes: Live Audio, Voice Memo (async), Text Battle, AI Sparring (Session 24)
4.29. AI Sparring is instant-start (no queue) — always-available opponent for cold-start liquidity (Session 24)
4.30. Arena lobby populates with Leg 3 auto-debates so it never looks empty (Session 24)
4.31. Queue timeout gracefully offers alternatives (AI sparring, retry, lobby) — never a dead end (Session 24)
4.32. AI Sparring powered by Groq Llama 3.1 70B via Supabase Edge Function — populist personality, full conversation memory, round-aware (Session 25)

## 4.33. OPEN DECISIONS
4.33.1. Identity: The Moderator or The Colosseum?
4.33.2. Subscription price: $9.99 or $14.99 or tiered ($9.99/$19.99/$29.99)?
4.33.3. Minors policy: full app with restrictions or separate gated experience?
4.33.4. Launch date: what's real?

---

# 5. THREE CORE PROBLEMS

5.1. **Money pipe connected (Session 10)** — Stripe Checkout live (sandbox), Edge Functions deployed, webhooks receiving 4 event types. Still sandbox mode.
5.2. **Single-player → multiplayer (in progress)** — Session 23 added follows, user profile modals, predictions, hated rivals. Session 24 added full arena with matchmaking, 4 debate modes, post-debate flow. Session 25 added real AI sparring opponent. Social + competitive infrastructure exists. Still needs real users.
5.3. **No audience and no way to build one manually** — founder has zero network. Bot army code complete (Session 19), Leg 3 auto-debate engine added (Session 20), awaiting VPS deployment.

---

# 6. ARCHITECTURE — CASTLE RING MODEL

6.1. Ring 6 — Public Surface (designed to fall): landing page, public listings, Cloudflare CDN
6.2. Ring 5 — User Interaction (contained damage): live debates, spectator chat, voting, hot takes, reactions, arena
6.3. Ring 4 — Accounts & Trust (identity layer): auth, profiles, trust scores, cosmetics, achievements
6.4. Ring 3 — Platform Data (integrity layer): recordings, transcripts, Elo, sanitize_text/url, rate_limits, 30+ SECURITY DEFINER functions — **COMPLETE**
6.5. Ring 2 — Financial Core (money layer): Stripe, subs, token ledger — CORS hardened
6.6. Ring 1 — B2B Intelligence: aggregated sentiment, API-gated — NOT STARTED
6.7. The Keep — Physical Gate: air-gapped backups, YubiKey — NOT STARTED
6.8. Build order: Keep → Ring 2 → Ring 4 → Ring 3 → Ring 5 → Ring 6 → Ring 1

---

# 7. WHAT ACTUALLY EXISTS

## 7.1. LIVE INFRASTRUCTURE

7.1.1. ✅ Supabase: faomczmipsccwbhpivmp (29 tables, RLS hardened, 30+ server functions, sanitization)
7.1.2. ✅ Vercel: colosseum-six.vercel.app (auto-deploys from GitHub)
7.1.3. ✅ Stripe sandbox: 7 products (3 subs + 4 token packs), Edge Functions deployed, webhooks listening
7.1.4. ✅ Auth working end-to-end (signup → email verify → auto-login)
7.1.5. ✅ Resend SMTP configured (custom email, rate limit removed)
7.1.6. ✅ Security hardening FULLY LIVE — Move 1 (RLS), Move 2 (22 functions), Move 3 (sanitization + rate limits)
7.1.7. ✅ Bot army code complete (Session 19-20) — 17 files, ~2,800+ lines, standalone Node.js app, awaiting VPS deployment
7.1.8. ✅ Auto-debate schema + landing page live (Session 20)
7.1.9. ✅ vercel.json hardened + middleware.js deployed (Session 16, confirmed Session 21)
7.1.10. ✅ Node.js v24.14.0 + Supabase CLI on founder's dev machine
7.1.11. ✅ Hot takes feed wired to Supabase per category (Session 22)
7.1.12. ✅ Follow system UI, user profile modals, predictions tab, hated rivals mechanic (Session 23)
7.1.13. ✅ Auth race condition fixed — readyPromise pattern (Session 23)
7.1.14. ✅ GitHub repo fully synced — all code, SQL, bible, ops docs, bot army (Session 23)
7.1.15. ✅ Arena fully built — lobby, mode select (4 modes), matchmaking queue, debate room, post-debate (Session 24)
7.1.16. ✅ Arena schema live — debate_queue, arena_debates, debate_messages, arena_votes tables + 10 RPCs (Session 24)
7.1.17. ✅ AI Sparring live — Groq Edge Function deployed, GROQ_API_KEY secret set, real AI opponent active (Session 25)

## 7.2. FILE MANIFEST

### Core JS Modules (all use window.X global pattern)
| File | Purpose | Status |
|------|---------|--------|
| colosseum-config.js | Central config, all credentials, feature flags (v2.2.0) | ✅ Updated Session 24 |
| colosseum-auth.js | Supabase auth, profile CRUD, follows, user profile modal, rivals RPCs | ✅ Rebuilt Session 23 |
| colosseum-payments.js | Stripe Checkout, token purchases, sub upgrades | ✅ |
| colosseum-notifications.js | Notification center, mark read via rpc() | ✅ Migrated Session 17 |
| colosseum-paywall.js | 4 contextual paywall variants, gate() helper | ✅ |
| colosseum-async.js | Hot takes feed, predictions (fetch/render/place), rivals display, react toggle, challenge modal | ✅ Rebuilt Session 23 |
| colosseum-share.js | Web Share API, clipboard, referrals, deep links | ✅ |
| colosseum-leaderboard.js | Elo/Wins/Streak tabs, time filters, My Rank | ✅ |
| colosseum-cards.js | Canvas share card generator, 4 sizes, ESPN aesthetic | ✅ |
| colosseum-arena.js | Arena: lobby, mode select, matchmaking queue, debate room (4 modes), post-debate. AI sparring calls Groq Edge Function with full conversation memory. | ✅ Updated Session 25 |
| colosseum-home.js | Home screen logic (legacy, superseded by inline carousel) | ✅ |
| colosseum-scoring.js | Elo, XP, leveling (SELECT reads only) | ✅ |
| colosseum-webrtc.js | WebRTC audio via Supabase Realtime channels | ✅ |
| colosseum-voicememo.js | Voice memo mode, voice takes via rpc() | ✅ Migrated Session 17 |

### HTML Pages
| File | Purpose | Status |
|------|---------|--------|
| index.html | Spoke carousel home, category overlays (tabbed: hot takes + predictions), follow counts, rivals feed, await ready auth | ✅ Rebuilt Session 23 |
| colosseum-login.html | OAuth-dominant login, age gate, password reset | ✅ |
| colosseum-settings.html | All settings toggles, account mgmt, delete | ✅ |
| colosseum-profile-depth.html | 12 sections, 147 Qs, discount waterfall | ✅ |
| colosseum-terms.html | Terms of Service, Colosseum-branded | ✅ |
| colosseum-debate-landing.html | Ungated landing, vote without signup, OG tags | ✅ |
| colosseum-auto-debate.html | AI vs AI debate page, ungated voting, rage-click funnel | ✅ Session 20 |

### Database SQL (paste order matters)
| File | Order | Purpose | Status |
|------|-------|---------|--------|
| colosseum-schema-production.sql | 1st | 18 tables, triggers, 45 cosmetics, 25 achievements | ✅ Pasted |
| colosseum-ring3-functions.sql | 2nd | Ring 3 scoring/token functions | ✅ Pasted |
| colosseum-ring3-move2.sql | 3rd | 22 SECURITY DEFINER functions | ✅ Pasted |
| colosseum-move3-sanitize-ratelimit.sql | 4th | sanitize_text/url, rate_limits table | ✅ Pasted |
| colosseum-rls-hardened.sql | 5th | 24 hardened RLS policies, guard trigger, views | ✅ Pasted |
| colosseum-bot-army-schema.sql | 6th | Bot activity table, bot_stats_24h view | ⏳ Paste during bot deployment |
| colosseum-auto-debate-schema.sql | 7th | auto_debates + auto_debate_votes tables | ✅ Pasted Session 20 |
| colosseum-fix-prediction.sql | 8th | place_prediction() fix | ✅ Pasted Session 21 |
| colosseum-session23-migration.sql | 9th | rivals table, follows RPCs, predictions RPCs, rival RPCs | ✅ Pasted Session 23 |
| colosseum-fix-auto-debate-rls.sql | 10th | Public SELECT on active auto_debates + votes | ✅ Pasted Session 23 |
| colosseum-arena-schema.sql | 11th | debate_queue, arena_debates, debate_messages, arena_votes, 10 RPCs | ✅ Pasted Session 24 |

### Supabase Edge Functions
| Function | Purpose | Status |
|----------|---------|--------|
| ai-sparring | Groq Llama 3.1 70B debate opponent. Populist personality, full conversation memory, round-aware (opener/rebuttal/knockout). Falls back to canned if Groq fails. | ✅ Deployed Session 25 |
| stripe-* | Stripe webhook + checkout functions | ✅ Deployed Session 10 |

### Bot Army (standalone Node.js — lives on VPS, not Vercel)
17 files, ~2,800+ lines. See Old Testament for full file list.

### Deployment & API
vercel.json, middleware.js, Telegram bot (4 files), Discord bot (4 files), Stripe Edge Functions (deployed to Supabase).

## 7.3. LIVE SUPABASE TABLE INVENTORY (29 tables/views — confirmed Session 24)
achievements, arena_debates, arena_votes, async_debates, auto_debate_votes, auto_debates, cosmetics, debate_messages, debate_queue, debate_votes, debates, follows, hot_take_reactions, hot_takes, notifications, payments, predictions, profile_depth_answers, profiles, profiles_private (view), profiles_public (view), rate_limits, reports, rivals, token_transactions, user_achievements, user_cosmetics, user_settings

## 7.4. SECURITY STATUS — FULLY LIVE (Session 21, expanded Session 24)
All hardening applied: RLS, 30+ functions, sanitization, rate limits, vercel.json (CSP/HSTS/12 headers), middleware.js, Stripe CORS. Client JS migrated to .rpc() calls. Session 23 added 8 RPCs for follows, predictions, rivals. Session 24 added 10 RPCs for arena matchmaking, debate messages, lobby feed, voting.

---

# 8. PRODUCT PHILOSOPHY (Condensed)

8.1. **Emergence Engine** — not a debate app, a social system where debates emerge. Post → React → Challenge → Structure.
8.2. **Third Place Theory** — the bar, not the arena. Presence over sessions. No cold start.
8.3. **Spectators Are the Product** — design for the 90% who watch. Predictions work with 10 people.
8.4. **Casual Is King** — protected lobbies, no sharks in casual waters.
8.5. **Reciprocal Gating** — can't unlock cosmetic until profile section complete. Make everything matter.
8.6. **Liquidity Problem** — text async debate, voice memo mode, AI sparring solve the cold-start emptiness. Arena never shows dead screen.

---

# 9. DESIGN DNA (Condensed)

9.1. Fox News chyron energy + ESPN stat cards + gladiator gold
9.2. Palette: navy, red, white, GOLD
9.3. Fonts: Cinzel (display) + Barlow Condensed (body)
9.4. Background: diagonal gradient (#1a2d4a → #2d5a8e → #5b8abf → #7aa3d4 → #3d5a80)
9.5. Cards: dark frosted glass (rgba(10,17,40,0.6)) + backdrop-filter blur
9.6. Mobile-forward: phone default, 44px touch targets, scroll-snap
9.7. Topic tiers: Tier 1 Politics + Sports, Tier 2 Entertainment + Couples Court, Tier 3 Music/Movies/Cars
9.8. Customer segments: Lurker (free/ads), Contender ($9.99), Champion ($19.99), Creator ($29.99)

---

# 10. BOT-DRIVEN GROWTH (Condensed — full details in Old Testament)

10.1. Three-leg architecture: Leg 1 (Reactive — fish in arguments), Leg 2 (Proactive — create content), Leg 3 (Auto-Debate Rage-Click — AI generates full debates with wrong winners)
10.2. Daily capacity: ~370 Leg 1 mentions, 5-10 Leg 2 posts, 6 Leg 3 auto-debates
10.3. Combined daily reach: ~6,000-40,000+ impressions
10.4. Actual monthly cost: $6-16/mo (Groq free, Reddit free, Twitter free tier, Discord free)
10.5. Month 1 estimate: ~12-20 new users. Month 12: ~300-600. Year 1 net profit: ~$2,100-6,100
10.6. 17 files, ~2,800+ lines. DigitalOcean $6/mo VPS. PM2 process manager. DRY_RUN=true default.

---

# 11. RECENT BUILD LOGS (Sessions 23-25)

## 11.1. Session 23 (Mar 2) — Auth Fix + Follow System + Predictions + Rivals
11.1.1. ✅ **Auth race condition FIXED** — `readyPromise` pattern replaces 800ms setTimeout.
11.1.2. ✅ **Follow system UI** — follower/following counts, tappable usernames, user profile modal.
11.1.3. ✅ **Predictions UI** — tabbed overlay (🔥 HOT TAKES | 🔮 PREDICTIONS), vote buttons, optimistic UI.
11.1.4. ✅ **Hated Rivals** — rivals table, declare/respond/get RPCs, max 5 active per user.
11.1.5. ✅ **SQL migration** — 9th file. rivals table + 8 new RPCs.
11.1.6. ✅ **Auto-debate RLS fix** — 10th file. Anonymous SELECT on active auto_debates and votes.
11.1.7. ✅ **Repo fully synced** — 3 missing files pushed, bible pushed, 3 stale docs deleted. Version 2.1.0.

## 11.2. Session 24 (Mar 2) — Arena Full Build
11.2.1. ✅ **colosseum-arena.js** — 1,324 lines. 5 views: Lobby, Mode Select, Queue, Debate Room, Post-Debate. 4 modes: Live Audio, Voice Memo, Text Battle, AI Sparring.
11.2.2. ✅ **colosseum-arena-schema.sql** — 11th SQL file. 4 tables + 10 SECURITY DEFINER RPCs. All pasted and live.
11.2.3. ✅ **SQL bug fixed** — get_arena_feed() UNION ALL ordering fixed with wrapped subqueries.
11.2.4. Version 2.2.0. Feature flags: followsUI, predictionsUI, rivals, arena.

## 11.3. Session 25 (Mar 2) — Real AI Sparring via Groq
11.3.1. ✅ **colosseum-ai-sparring/index.ts** — Supabase Edge Function. 170 lines. Calls Groq Llama 3.1 70B. Personality: populist hot-takes debater, casual language, real-world examples, 2-4 sentences max, pushes back hard. Round-aware: bold opener R1, attacks specific weaknesses in middle rounds, knockout closer in final round. temperature: 0.85.
11.3.2. ✅ **colosseum-arena.js updated** — `addMessage()` now pushes all messages to `currentDebate.messages` for history tracking. `generateAIDebateResponse()` replaced — fetches Edge Function with full conversation history. Graceful fallback to canned responses if Edge Function fails.
11.3.3. ✅ **GROQ_API_KEY** — set as Supabase secret.
11.3.4. ✅ **Edge Function deployed** — `ai-sparring` live in Supabase.
11.3.5. Both files uploaded to GitHub. Vercel auto-deployed.

---

# 12. WHAT TO DO NEXT

## 12.1. PENDING HUMAN ACTIONS

### Bot Infrastructure
12.1.1. ⏳ Telegram: talk to @BotFather, create bot, paste token into Vercel env vars, visit /api/telegram-setup
12.1.2. ⏳ Discord: create app at discord.com/developers, paste 3 env vars into Vercel, visit /api/discord-setup

### Bot Army Deployment (THE PRIORITY)
12.1.3. ⏳ Buy VPS: DigitalOcean $6/mo droplet (Ubuntu 24.04, NYC1, 1 GB RAM)
12.1.4. ⏳ SSH into VPS, install Node.js 20 + PM2 + Git
12.1.5. ⏳ Upload colosseum-bot-army files, npm install
12.1.6. ⏳ Create Reddit bot account, create X/Twitter account, create Discord bot
12.1.7. ⏳ Copy .env.example to .env, paste all credentials
12.1.8. ⏳ Paste colosseum-bot-army-schema.sql into Supabase SQL Editor
12.1.9. ⏳ Test DRY_RUN mode, then go live with PM2

### Repo Cleanup (minor)
12.1.10. ⏳ Rename `package_1.json` → `package.json` on GitHub
12.1.11. ⏳ Upload updated bible files to GitHub

## 12.2. NEXT BUILD PRIORITIES
12.2.1. ⏳ Deploy the bot army — this is the only thing that matters right now
12.2.2. Watch what happens — monitor via bot_stats_24h + auto_debate_stats
12.2.3. Build next thing based on what real users do

## 12.3. KNOWN BUGS / TECH DEBT
12.3.1. ✅ ~~Auth race condition~~ — FIXED Session 23
12.3.2. ✅ ~~colosseum-arena.js missing~~ — BUILT Session 24
12.3.3. ✅ ~~AI Sparring uses canned response templates~~ — FIXED Session 25 (real Groq responses)

---

*This is the New Testament. For all 25 session build logs, the full inventory, revenue details, B2B strategy, education plans, research foundations, and growth strategy — see the Old Testament.*
