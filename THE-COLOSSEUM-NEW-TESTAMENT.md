# THE COLOSSEUM — NEW TESTAMENT
### The Living Document — Read Every Session
### Last Updated: Session 32 (March 4, 2026)

> **The Old Testament** contains: ALL session build logs (1-25), 502+ item inventory, revenue model details, B2B data play, education plans, research foundations, growth strategy, and honest assessments. Read it when those areas are relevant.
> **Location:** `https://raw.githubusercontent.com/wolfe8105/colosseum/main/THE-COLOSSEUM-OLD-TESTAMENT.md`

---

# 1. WHAT THIS IS

1.1. Live audio debate platform / emergence engine
1.2. Users hang out in themed sections, post hot takes, react, debates emerge from disagreements
1.3. Four core mechanics: Post → React → Challenge → Structure appears
1.4. Revenue: consumer subs, token economy, ads, B2B data licensing
1.5. Philosophy: digital third place — not a destination, a place you're already in
1.6. Name: **The Colosseum** (locked Session 28 — retired: "The Moderator")
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
3.8. **Read the bible first** — every session starts by reading the New Testament AND the Land Mine Map. Both. Every time. No exceptions.
3.8.1. New Testament: `THE-COLOSSEUM-NEW-TESTAMENT.md` — what exists, what's decided, what's next
3.8.2. Land Mine Map: `THE-COLOSSEUM-LAND-MINE-MAP.md` — cause/effect/fix for every decision. Cross-reference before any SQL, auth, schema, bot, or deployment change. If a suggestion would step on a mine, say so before proceeding.
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
4.33. Guest access is default — anonymous users see the full app, auth only required for actions (post, vote, debate, follow). Critical for bot army funnel. (Session 26)
4.34. Auth init pattern — onAuthStateChange INITIAL_SESSION is the sole init path. No separate getSession() call. No await inside callback. noOpLock in createClient config prevents navigator.locks deadlock. 5s safety timeout as fallback. (Session 26 original, rebuilt Session 31)
4.35. Three-zone architecture: Static Mirror (Cloudflare Pages) + Plinko Gate (login/signup) + Members Zone (Vercel app). Mirror is pure HTML, zero JS, zero auth. All bot army links point to mirror. Members zone assumes valid session. (Session 28)
4.36. Mirror is JAMstack SSG pattern — vanilla Node.js generator on VPS, hits Supabase REST API with native fetch (no @supabase/supabase-js), string concatenation templates, deployed to Cloudflare Pages via `wrangler pages deploy` every 5 minutes. (Session 28)
4.37. Mirror is NOT a shield — anyone can Google the Vercel app directly. Mirror controls where the bot army VOLUME goes. Real app still needs all 12 defense rings at full thickness. (Session 28)
4.38. Build fail safety — if generator queries fail, skip deploy, CDN keeps serving last good build. Site never goes down from a bad build. (Session 28)
4.39. Plinko Gate mental model — signup is a trust-building sequence, not a speed obstacle. Each step (OAuth, verify, age gate, display name) is a defense ring peg. 5-10 seconds is fine because it only happens once. (Session 28)
4.40. Platform name locked: "The Colosseum" — identity question resolved. (Session 28)

## 4.41. OPEN DECISIONS
4.41.1. Subscription price: $9.99 or $14.99 or tiered ($9.99/$19.99/$29.99)?
4.41.2. Minors policy: full app with restrictions or separate gated experience?
4.41.3. Launch date: what's real?
4.41.4. Domain: thecolosseum.app or keep colosseum-six.vercel.app + colosseum.pages.dev?

---

# 5. THREE CORE PROBLEMS

5.1. **Money pipe connected (Session 10)** — Stripe Checkout live (sandbox), Edge Functions deployed, webhooks receiving 4 event types. Still sandbox mode.
5.2. **Single-player → multiplayer (in progress)** — Session 23 added follows, user profile modals, predictions, hated rivals. Session 24 added full arena with matchmaking, 4 debate modes, post-debate flow. Session 25 added real AI sparring opponent. Session 26 removed login wall — anonymous users see everything, auth only gates actions. Social + competitive infrastructure exists. Still needs real users.
5.3. **No audience and no way to build one manually** — founder has zero network. Bot army code complete (Session 19), Leg 3 auto-debate engine added (Session 20), awaiting VPS deployment. Session 28 added three-zone architecture: static mirror on Cloudflare Pages absorbs all bot army traffic, reducing attack surface and Supabase load. Mirror generator design complete, ready to build.

---

# 6. ARCHITECTURE — CASTLE RING MODEL

6.1. Ring 6 — Public Surface (designed to fall): Static Mirror on Cloudflare Pages (colosseum.pages.dev), pure HTML, zero JS, zero auth. Bot army traffic lands here. CDN-backed, unhackable by design.
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
7.1.18. ✅ Three-zone architecture designed — Static Mirror (Cloudflare Pages) + Plinko Gate + Members Zone (Vercel). Generator design locked. (Session 28)
7.1.19. ✅ Land Mine Map created — 80 entries, 14 sections, cause/effect/fix for every major decision. Read every session alongside NT. (Session 29)
7.1.20. ✅ Mirror generator built — colosseum-mirror-generator.js, 537 lines, tested with mock data. (Session 30)
7.1.21. ✅ Plinko Gate built — colosseum-plinko.html, 4-step linear signup flow. (Session 30)
7.1.22. ⚠️ colosseum-locks-fix.js — OBSOLETE. Separate file approach failed (global mock too late). Superseded by Session 31 createClient fix. File is harmless dead weight. (Session 30)
7.1.23. ✅ Navigator.locks fix VERIFIED WORKING — noOpLock passed directly into createClient({ auth: { lock: noOpLock } }) per supabase-js#1594. colosseum-auth.js rebuilt from scratch: INITIAL_SESSION is sole init path (no separate getSession), no await inside onAuthStateChange callback. Profile loads, tier shows 'creator', console clean. (Session 31)
7.1.24. ✅ Guest logic stripped from Members Zone — 6 files modified, all login.html refs → Plinko, auth gates on settings + profile-depth. Auto-debate + debate-landing ungated by design. Click-by-click test walkthrough created (~180 rows). (Session 32)

## 7.2. FILE MANIFEST

### Core JS Modules (all use window.X global pattern)
| File | Purpose | Status |
|------|---------|--------|
| colosseum-config.js | Central config, all credentials, feature flags (v2.2.0) | ✅ Updated Session 24 |
| colosseum-locks-fix.js | OBSOLETE — global mock too late, superseded by Session 31 createClient fix. Harmless dead weight. | ⚠️ Session 30 |
| colosseum-auth.js | Supabase auth, profile CRUD, follows, user profile modal, rivals RPCs. noOpLock in createClient, INITIAL_SESSION sole init path. | ✅ Rebuilt Session 31 |
| colosseum-mirror-generator.js | Static mirror SSG — runs on VPS, deploys to Cloudflare Pages every 5 min | ✅ NEW Session 30 |
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
| colosseum-plinko.html | Plinko Gate — 4-step linear signup flow (OAuth → Age → Username → Done) | ✅ NEW Session 30 |

### Test Documents
| File | Purpose | Status |
|------|---------|--------|
| THE-COLOSSEUM-TEST-WALKTHROUGH.md | 54-scenario journey walkthrough — user flows end-to-end | ✅ Session 27 |
| THE-COLOSSEUM-TEST-WALKTHROUGH-SESSION32.docx | Click-by-click test walkthrough — every page, every entity, every clickable element with expected behavior. ~180 rows. Mirror section placeholder. | ✅ Session 32 |

### Database SQL (paste order matters)
| File | Order | Purpose | Status |
|------|-------|---------|--------|
| colosseum-schema-production.sql | 1st | 18 tables, triggers, 45 cosmetics, 25 achievements | ✅ Pasted |
| colosseum-ring3-functions.sql | 2nd | Ring 3 scoring/token functions | ✅ Pasted |
| colosseum-ring3-move2.sql | 3rd | 22 SECURITY DEFINER functions | ✅ Pasted |
| colosseum-move3-sanitize-ratelimit.sql | 4th | sanitize_text/url, rate_limits table | ✅ Pasted |
| colosseum-rls-hardened.sql | 5th | 24 hardened RLS policies, guard trigger, views | ✅ Pasted |
| colosseum-bot-army-schema.sql | 6th | Bot activity table, bot_stats_24h view | ✅ Pasted Session 27 |
| colosseum-auto-debate-schema.sql | 7th | auto_debates + auto_debate_votes tables | ✅ Pasted Session 20 |
| colosseum-fix-prediction.sql | 8th | place_prediction() fix | ✅ Pasted Session 21 |
| colosseum-session23-migration.sql | 9th | rivals table, follows RPCs, predictions RPCs, rival RPCs | ✅ Pasted Session 23 |
| colosseum-fix-auto-debate-rls.sql | 10th | Public SELECT on active auto_debates + votes | ✅ Pasted Session 23 |
| colosseum-arena-schema.sql | 11th | debate_queue, arena_debates, debate_messages, arena_votes, 10 RPCs | ✅ Pasted Session 24 |
| colosseum-session27-bugfix.sql | 12th | Fixed arena feed, leaderboard, predictions RPCs (wrong column names) | ✅ Pasted Session 27 |

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
All hardening applied: RLS, 30+ functions, sanitization, rate limits, vercel.json (CSP/HSTS/12 headers), middleware.js, Stripe CORS. Client JS migrated to .rpc() calls. Session 23 added 8 RPCs for follows, predictions, rivals. Session 24 added 10 RPCs for arena matchmaking, debate messages, lobby feed, voting. Session 31 rebuilt auth init: noOpLock in createClient, INITIAL_SESSION sole init path, no await in onAuthStateChange callback.

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
10.7. All bot army links point to static mirror (colosseum.pages.dev), not the Vercel app. Reduces attack surface, eliminates auth bugs from funnel, saves Supabase bandwidth. (Session 28)

---

# 11. RECENT BUILD LOGS (Sessions 24-32)

## 11.1. Session 24 (Mar 2) — Arena Full Build
11.1.1. ✅ **colosseum-arena.js** — 1,324 lines. 5 views: Lobby, Mode Select, Queue, Debate Room, Post-Debate. 4 modes: Live Audio, Voice Memo, Text Battle, AI Sparring.
11.1.2. ✅ **colosseum-arena-schema.sql** — 11th SQL file. 4 tables + 10 SECURITY DEFINER RPCs. All pasted and live.
11.1.3. ✅ **SQL bug fixed** — get_arena_feed() UNION ALL ordering fixed with wrapped subqueries.
11.1.4. Version 2.2.0. Feature flags: followsUI, predictionsUI, rivals, arena.

## 11.2. Session 25 (Mar 2) — Real AI Sparring via Groq
11.2.1. ✅ **colosseum-ai-sparring/index.ts** — Supabase Edge Function. 170 lines. Calls Groq Llama 3.1 70B. Personality: populist hot-takes debater, casual language, real-world examples, 2-4 sentences max, pushes back hard. Round-aware: bold opener R1, attacks specific weaknesses in middle rounds, knockout closer in final round. temperature: 0.85.
11.2.2. ✅ **colosseum-arena.js updated** — `addMessage()` now pushes all messages to `currentDebate.messages` for history tracking. `generateAIDebateResponse()` replaced — fetches Edge Function with full conversation history. Graceful fallback to canned responses if Edge Function fails.
11.2.3. ✅ **GROQ_API_KEY** — set as Supabase secret.
11.2.4. ✅ **Edge Function deployed** — `ai-sparring` live in Supabase.
11.2.5. Both files uploaded to GitHub. Vercel auto-deployed.

## 11.3. Session 26 (Mar 2) — Auth Timeout Fix + Guest Access
11.3.1. ✅ **Spinner bug fixed** — `_checkSession()` hanging on orphaned Supabase navigator lock (`getSession()` never returned). Added 3s timeout so `readyPromise` always resolves.
11.3.2. ✅ **Login redirect removed** — `appInit()` no longer bounces unauthenticated users to login.html. Anonymous users see the full app as "Guest" with default stats.
11.3.3. ✅ **Double safety net** — `Promise.race` with 4s ceiling in index.html + 3s timeout in colosseum-auth.js. App always loads even if Supabase auth hangs.
11.3.4. ✅ **Critical for growth model** — bot army links from Reddit/Twitter/Discord now land directly into content. No login wall. Users only hit auth when they try to act (post, vote, debate, follow).
11.3.5. Both files pushed to GitHub. Vercel auto-deployed. Verified live.

## 11.4. Session 27 (Mar 2) — 7-Bug Fix Session
11.4.1. ✅ **Arena feed bug** — fixed
11.4.2. ✅ **Leaderboard bug** — fixed
11.4.3. ✅ **Predictions RPCs** — fixed
11.4.4. ✅ **AI sparring config** — fixed
11.4.5. ✅ **auto_debate columns** — fixed
11.4.6. ✅ **voted_for** — fixed
11.4.7. ✅ **bot_activity table** — fixed
11.4.8. ✅ **Root blocker RESOLVED:** `navigator.locks` hanging every `.rpc()` call. Session 27 deployed `value: undefined` — broke signOut. Session 30 tried separate `colosseum-locks-fix.js` — too late. **Session 31 fix: noOpLock in createClient config + auth.js rebuilt from scratch. Verified working.**
11.4.9. Open: login page hang, 4 missing SQL files in GitHub, leaderboard placeholder-only, Bebas Neue font.

## 11.5. Session 28 (Mar 4) — Three-Zone Architecture Decision
11.5.1. ✅ **Architecture decision: three-zone split** — Static Mirror (Cloudflare Pages) + Plinko Gate (login) + Members Zone (Vercel). Approved after defense-first analysis.
11.5.2. ✅ **JAMstack SSG research complete** — pattern is proven, used by Smashing Magazine, Shopify, and many Supabase+SSG projects. Key findings documented.
11.5.3. ✅ **Generator design locked:** single vanilla Node.js file, native fetch to Supabase REST API, string concatenation templates, zero dependencies, `wrangler pages deploy` to Cloudflare. 5-minute cron on VPS via PM2.
11.5.4. ✅ **Defense analysis:** mirror has zero JS attack surface. All 12 defense rings apply to all 3 zones at varying thickness. Mirror controls where bot army volume lands. Real app still fully exposed to direct traffic.
11.5.5. ✅ **Key research warnings documented:** #1 complexity trap (keep generator dead simple), #2 handle failed Supabase queries (skip deploy, serve last good build), #3 OG meta tags per debate page critical for bot army link previews, #4 use native fetch not @supabase/supabase-js, #5 no framework (no Astro/Hugo/Eleventy).
11.5.6. ✅ **Mirror pages designed:** landing page, 4 category feeds, individual auto-debate pages, leaderboard snapshot, arena lobby snapshot. Every interactive element replaced with "sign up to respond" link to Plinko Gate.
11.5.7. ✅ **Platform name locked:** "The Colosseum" — identity question resolved.

## 11.6. Session 29 (Mar 4) — Land Mine Map + Battle Plan
11.6.1. ✅ **Land Mine Map created** — THE-COLOSSEUM-LAND-MINE-MAP.md, 80 entries across 14 sections. Every major decision documented with cause/effect/fix.
11.6.2. ✅ **NT updated** — Land Mine Map reading required every session (Section 3.8), maintenance obligation added (Section 12.2.0).

## 11.7. Session 30 (Mar 4) — Mirror Generator + Plinko Gate + Locks Fix v3
11.7.1. ✅ **Mirror generator built** — colosseum-mirror-generator.js, 537 lines, vanilla Node.js, zero dependencies. Tested with mock data — all checks passed.
11.7.2. ✅ **Plinko Gate built** — colosseum-plinko.html, 4-step linear signup flow (OAuth → Age Gate → Username → Done). Progress bar, email toggle, age verification, username validation.
11.7.3. ✅ **Locks fix v3** — Previous approaches failed: `value: undefined` (Session 27) broke signOut, mock in auth.js init() (Session 30 first attempt) was too late. Fix: new `colosseum-locks-fix.js` loads as first `<script>` tag before Supabase CDN on all 6 HTML pages.
11.7.4. ✅ **Land Mine Map updated** — LM-022 rewritten with full 3-attempt history, LM-051 updated with correct 4-file script load order.
11.7.5. ✅ **Subscription tier** — set to 'creator' in Supabase via SQL using user ID (email column didn't work). App still shows 'free' due to guest fallback from broken session — locks fix should resolve.
11.7.6. ⚠️ **Locks fix approach failed** — colosseum-locks-fix.js global mock was too late. GoTrueClient captures lock reference at module parse time. Superseded by Session 31 createClient fix.
11.7.7. ⚠️ **Auto-debate page broken** — noticed during GitHub push. Not yet diagnosed.

## 11.8. Session 31 (Mar 4) — Navigator.locks Fix VERIFIED
11.8.1. ✅ **colosseum-auth.js rebuilt from scratch** — same public API, only init plumbing changed. Three key fixes: (1) noOpLock passed into `createClient({ auth: { lock: noOpLock } })` per supabase-js#1594. (2) Removed separate `getSession()` call — `onAuthStateChange` INITIAL_SESSION is sole init path. (3) No `await` inside onAuthStateChange callback (Supabase docs say this deadlocks). Profile loading dispatched outside callback via `setTimeout`.
11.8.2. ✅ **Verified working** — hard reload test: email present, profile loaded, tier shows 'creator', placeholder mode false, console clean, no timeout warnings.
11.8.3. ✅ **colosseum-locks-fix.js confirmed dead weight** — global mock approach was too late. File still loads on all pages but does nothing useful. Harmless.
11.8.4. ✅ **Problem-solving methodology documented** — never theorize in a closed loop. Search the web like a conversation: describe problem → try top answer → if failed, search with what failed → repeat. Each iteration adds context.

## 11.9. Session 32 (Mar 4) — Guest Logic Stripped + Click-by-Click Test Walkthrough
11.9.1. ✅ **Guest logic stripped from Members Zone** — 6 files modified. All `login.html` redirects replaced with `colosseum-plinko.html`. Auth gates added to settings + profile-depth (redirect to Plinko if no session). Auto-debate + debate-landing remain ungated by design (LM-067 rage-click funnel + bot army link previews).
11.9.2. ✅ **Files modified:** index.html (logout + auth gate), colosseum-arena.js (mode select redirect), colosseum-settings.html (logout + delete + auth gate), colosseum-profile-depth.html (auth gate), colosseum-auto-debate.html (2 CTAs), colosseum-debate-landing.html (CTA + goSignup).
11.9.3. ✅ **login.html references preserved** — colosseum-auth.js lines 174, 175, 266 (emailRedirectTo + password reset). These are Supabase auth redirect URLs and must stay forever (LM-047).
11.9.4. ✅ **Verification complete** — zero login.html refs in Members Zone files, 11 Plinko refs confirmed across 6 files, zero "Guest" fallback refs in index.html, placeholder mode preserved for dev/local.
11.9.5. ✅ **Click-by-click test walkthrough created** — `THE-COLOSSEUM-TEST-WALKTHROUGH-SESSION32.docx`. Every page, every entity (Guest/User), every clickable element mapped with expected behavior + checkbox + notes column. ~180 test rows across 8 pages. Placeholder section for static mirror pages. Complements the 54-scenario journey walkthrough (`THE-COLOSSEUM-TEST-WALKTHROUGH.md`).

---

# 12. WHAT TO DO NEXT

## 12.1. PENDING HUMAN ACTIONS

### Bot Infrastructure
12.1.1. ⏳ Telegram: talk to @BotFather, create bot, paste token into Vercel env vars, visit /api/telegram-setup
12.1.2. ⏳ Discord: create app at discord.com/developers, paste 3 env vars into Vercel, visit /api/discord-setup

### Bot Army Deployment (THE PRIORITY)
12.1.3. ⏳ Buy VPS: DigitalOcean $6/mo droplet (Ubuntu 24.04, NYC1, 1 GB RAM)
12.1.4. ⏳ SSH into VPS, install Node.js 20 + PM2 + Git + Wrangler CLI
12.1.5. ⏳ Upload colosseum-bot-army files + colosseum-mirror generator, npm install
12.1.6. ⏳ Create Reddit bot account, create X/Twitter account, create Discord bot
12.1.7. ⏳ Copy .env.example to .env, paste all credentials (incl. Cloudflare API token)
12.1.8. ⏳ Paste colosseum-bot-army-schema.sql into Supabase SQL Editor
12.1.9. ⏳ Create Cloudflare Pages project (colosseum.pages.dev)
12.1.10. ⏳ Test DRY_RUN mode for bot army, test mirror generator, then go live with PM2

### Repo Cleanup (minor)
12.1.11. ⏳ Rename `package_1.json` → `package.json` on GitHub
12.1.12. ⏳ Upload updated bible files to GitHub

## 12.2. NEXT BUILD PRIORITIES
12.2.0. ⏳ **Update Land Mine Map** — add new entries any time a decision bites us or a new mine is discovered. File: `THE-COLOSSEUM-LAND-MINE-MAP.md`
12.2.1. ✅ ~~Build the mirror generator~~ — DONE Session 30 (537 lines, tested)
12.2.2. ✅ ~~Build the Plinko Gate page~~ — DONE Session 30 (4-step signup flow)
12.2.3. ✅ ~~Verify navigator.locks fix~~ — DONE Session 31. noOpLock in createClient, auth.js rebuilt, verified working.
12.2.4. ✅ ~~Strip guest logic from Members Zone~~ — DONE Session 32. 6 files modified: index.html, colosseum-arena.js, colosseum-settings.html, colosseum-profile-depth.html, colosseum-auto-debate.html, colosseum-debate-landing.html. All login.html refs replaced with Plinko. Auth gates added to settings + profile-depth. Auto-debate + debate-landing remain ungated by design.
12.2.5. ⏳ Deploy bot army + mirror generator to VPS
12.2.6. Watch what happens — monitor via bot_stats_24h + auto_debate_stats
12.2.7. Build next thing based on what real users do

## 12.3. KNOWN BUGS / TECH DEBT
12.3.1. ✅ ~~Auth race condition~~ — FIXED Session 23
12.3.2. ✅ ~~colosseum-arena.js missing~~ — BUILT Session 24
12.3.3. ✅ ~~AI Sparring uses canned response templates~~ — FIXED Session 25 (real Groq responses)
12.3.4. ✅ ~~Infinite spinner on index.html~~ — FIXED Session 26 (auth timeout + login redirect removed)
12.3.5. ✅ ~~navigator.locks fix~~ — FIXED Session 31 (noOpLock in createClient config)
12.3.6. ⏳ Login page may still hang
12.3.7. ⏳ 4 missing SQL files in GitHub
12.3.8. ⏳ Leaderboard is placeholder-only
12.3.9. ⏳ Bebas Neue font unresolved
12.3.10. ⏳ advance_round() references non-existent moderator_id column
12.3.11. ⏳ Conflicting token pack pricing sets — needs human decision
12.3.12. ⏳ Domain purchase for thecolosseum.app — unresolved

---

*This is the New Testament. For all 32 session build logs, the full inventory, revenue details, B2B strategy, education plans, research foundations, and growth strategy — see the Old Testament.*
