# THE COLOSSEUM — NEW TESTAMENT
### The Living Document — Read Every Session
### Last Updated: Session 56 (March 8, 2026) — Security Audit Session D complete

> **The Old Testament** contains: ALL session build logs (1-47), 502+ item inventory, revenue model details, B2B data play, education plans, research foundations, growth strategy, and honest assessments. Read it when those areas are relevant.
> **Location:** `THE-COLOSSEUM-OLD-TESTAMENT.md`
>
> **The War Chest** contains: B2B intelligence play, auction model, pricing tiers, exclusivity framework, 45-day pitch, top 100 buyer list, stealth positioning, pre-sell strategy. Read when revenue/pitch topics arise.
> **Location:** `THE-COLOSSEUM-WAR-CHEST.md`
>
> **The Product Vision** contains: psychology framework, visual game layer spec, sound-off solution, ad placement map, social proof templates, polite nudge copy, gamification, DMs, rematch button. Read when building features.
> **Location:** `THE-COLOSSEUM-PRODUCT-VISION.md`

---

# 1. WHAT THIS IS

1.1. Live audio debate platform / emergence engine
1.2. Users hang out in themed sections, post hot takes, react, debates emerge from disagreements
1.3. Four core mechanics: Post → React → Challenge → Structure appears
1.4. Revenue: ads (structural unskippable model) + B2B data licensing (see WAR-CHEST.md). Consumer subs and token packs shelved at launch — code stays, flipped off. Free platform generates volume → volume generates premier data → data sells for seven figures.
1.5. Philosophy: digital third place — not a destination, a place you're already in
1.6. Name: **The Colosseum** (locked Session 28)
1.7. Owner: solo founder, no team, no money yet, no deadline

---

# 2. FOUNDER CONSTRAINTS (Critical Context)

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
3.6. **Full file replacement over patches** — always produce the complete finished file. Never diffs, patches, or partial snippets.
3.7. **Bible is split** — New Testament read every session. Old Testament is reference, read only when relevant.
3.8. **Read the bible first** — every session starts by reading the New Testament AND the Land Mine Map. Both. Every time. No exceptions.
3.9. **Zero founder marketing time** — all growth is bot-driven, fully automated.
3.10. **Keep it simple** — Claude gives instructions in plain steps. No walls of text. One thing at a time.

---

# 4. KEY DECISIONS (Condensed — full list in Old Testament)

4.1. Rebrand to The Colosseum, target male opinion culture 16-65
4.2. Mobile-forward design, phone is default
4.3. Real-dollar tipping replaces token microtransactions
4.4. Education removed for moral reasons, separate product later (August 2026)
4.5. Profile Depth System approved — 12 sections, 157 Qs, mixed rewards. Free at launch, incentivized by cosmetic rewards only.
4.6. No B2B sales until real users and data volume exist. Analytics pipeline already running (event_log, 18 RPCs, 9 views). Pre-selling data futures is an option (see WAR-CHEST.md Section 8).
4.7. Async debate mode is survival-critical (liquidity problem)
4.8. Predictions = core engagement loop
4.9. Supabase chosen for backend
4.10. Kill the tile grid → spoke carousel (6 tiles, hollow center, 18° tilt, thumb-spin)
4.11. Visual system: Cinzel + Barlow Condensed, diagonal gradient, dark frosted glass cards
4.12. Login flow: OAuth dominant, email collapsed behind toggle
4.13. All table writes locked behind server functions. Client JS uses supabase.rpc() for all mutations.
4.14. Hated Rivals mechanic, Couples Court category
4.15. Bot-driven growth model — fully automated 24/7 bot army, $6-16/mo actual cost
4.16. Groq free tier for AI generation — Llama 3.3 70B versatile (llama-3.1-70b decommissioned)
4.17. Leg 3: Auto-Debate Rage-Click Engine — AI generates full debates, scores them lopsided, posts rage-bait hooks
4.18. Controversial scoring IS the marketing — AI deliberately picks the unpopular winner
4.19. react_hot_take() is a toggle function — single RPC handles both adding and removing
4.20. Bot starts in DRY_RUN mode — logs all actions without posting
4.21. Supabase has no CORS dashboard setting — protection comes from RLS, auth tokens, middleware.js, Edge Function CORS
4.22. Auth uses readyPromise pattern — never setTimeout for async state
4.23. User profile modals — tappable usernames open bottom-sheet with stats + follow + rival
4.24. Version 2.2.0 — feature flags: followsUI, predictionsUI, rivals, arena
4.25. Arena supports 4 debate modes: Live Audio, Voice Memo (async), Text Battle, AI Sparring
4.26. AI Sparring is instant-start (no queue) — always-available opponent for cold-start liquidity
4.27. Guest access is default — anonymous users see the full app, auth only required for actions. Critical for bot army funnel.
4.28. Auth init: onAuthStateChange INITIAL_SESSION is sole init path. No separate getSession(). noOpLock in createClient. 5s safety timeout.
4.29. Three-zone architecture: Static Mirror (Cloudflare Pages) + Plinko Gate (login/signup) + Members Zone (Vercel). Mirror is pure HTML, zero JS, zero auth.
4.30. Reference/evidence system: debaters submit mid-round, moderator rules allow/deny within 60s. Escalating token cost. Auto-allowed on 60s timeout.
4.31. Moderator class: parallel identity to debater. Separate stats. Scoring: debaters 0 or 25 pts, fans 1-50 average. Bias emerges from rulings, never declared.
4.32. Analytics event log: append-only, service_role locked, 9 aggregation views, daily_snapshots. 250 data items mapped across 25 industries.
4.33. Mirror is JAMstack SSG — vanilla Node.js on VPS, 5-min cron, deploys to Cloudflare Pages via wrangler.
4.34. Mirror is NOT a shield — anyone can Google the Vercel app directly. Mirror controls where bot VOLUME goes.
4.35. Platform name locked: "The Colosseum"
4.36. Reddit API requires manual approval (late 2024). Account: u/Master-Echo-2366.
4.37. VPS: DigitalOcean $6/mo, Ubuntu 24.04, NYC3, IP 161.35.137.21. PM2 managed.
4.38. Supabase API keys: bot army and mirror use legacy JWT format (eyJ...), not new sb_secret_* format.
4.39. **Revenue pivot: free platform, premier data.** Consumer subs/tokens shelved. Revenue = B2B data licensing + structural ad inventory. Full strategy in WAR-CHEST.md.
4.40. **Legal identity: interactive computer service.** Section 230, COPPA, FTC Act §5, CAN-SPAM, DMCA, state privacy laws. AI auto-debates are NOT protected by 230.
4.41. **AI content must be labeled.** Auto-debates, AI sparring, any AI-generated content. Multiple states require disclosure.
4.42. **Ranked vs Casual.** Casual = open, no profile, Elo frozen. Ranked = 25%+ profile, Elo moves, tighter matchmaking (300 vs 400 range). AI Sparring always casual.
4.43. **Bluesky bot: wolfe8105.bsky.social.** Leg 2 posting enabled. Leg 1 disabled (opt-in only per Bluesky policy).
4.44. **Cloudflare Pages: colosseum-f30.pages.dev** (colosseum.pages.dev was taken). Deploy with --branch=production.
4.45. **SRI hashes on all CDN imports.** supabase-js pinned @2.98.0 with SHA-384. Must regenerate when upgrading.
4.46. **Edge Functions: Deno.serve, zero deno.land imports, CORS allowlist** (colosseum-six.vercel.app + thecolosseum.app).
4.47. **Security logging: RAISE LOG + security_events table + 3 monitoring views.**
4.48. **Groups + Group vs Group approved.** Schema + UI + Group Elo all built and wired (Sessions 49-53).
4.49. **Celebrity debate events approved.** Qualifier bracket, community voting, micro-famous first. Bot army outreach. Not yet built.
4.50. **Bot army expanding.** Bluesky (done). Lemmy (P2, planned). Mastodon (P3). Twitter free tier useless.

## 4.51. OPEN DECISIONS
4.51.1. Launch date: what's real?
4.51.2. Domain: thecolosseum.app or keep current URLs?
4.51.3. Public profile pages — shareable URL, Google-indexable. Value clear, build priority TBD.

---

# 5. THREE CORE PROBLEMS

5.1. **Money pipe connected** — Stripe Checkout live (sandbox), Edge Functions deployed, webhooks listening. Still sandbox mode.
5.2. **Single-player → multiplayer (in progress)** — follows, modals, predictions, rivals, arena, 4 debate modes, AI sparring, guest access. Needs real users.
5.3. **No audience and no way to build one manually** — Bot army deployed, DRY_RUN=false, live. Bluesky posting. Reddit pending API approval. Discord deferred.

---

# 6. ARCHITECTURE — CASTLE RING MODEL

6.1. Ring 6 — Public Surface: Static Mirror on Cloudflare Pages, pure HTML, zero JS, zero auth.
6.2. Ring 5 — User Interaction: live debates, spectator chat, voting, hot takes, reactions, arena
6.3. Ring 4 — Accounts & Trust: auth, profiles, trust scores, cosmetics, achievements
6.4. Ring 3 — Platform Data: recordings, transcripts, Elo, sanitize_text/url, rate_limits, 30+ SECURITY DEFINER functions — **COMPLETE**
6.5. Ring 2 — Financial Core: Stripe, subs, token ledger — CORS hardened
6.6. Ring 1 — B2B Intelligence: aggregated sentiment, API-gated — NOT STARTED
6.7. The Keep — Physical Gate: air-gapped backups, YubiKey — NOT STARTED

---

# 7. WHAT ACTUALLY EXISTS

## 7.1. LIVE INFRASTRUCTURE (Summary)

Supabase (faomczmipsccwbhpivmp): 34 tables, RLS hardened, 42+ server functions, sanitization, rate limits, 9 analytics views, 3 security views, 20 RPCs wired to log_event(). Vercel (colosseum-six.vercel.app): auto-deploys from GitHub. Stripe sandbox: 7 products, Edge Functions, webhooks. Auth working end-to-end. Resend SMTP configured. Security hardening fully live (Move 1 RLS + Move 2 functions + Move 3 sanitization). Bot army deployed to VPS, PM2 managed, DRY_RUN=false LIVE, 298 actions in first 24h. Bluesky L2 posting enabled. Discord connected (0 servers). Reddit pending. Mirror generator live (5-min cron, 41 pages/build, deploys to colosseum-f30.pages.dev). Arena fully built (4 modes). AI Sparring live (Groq). Moderator UI fully built. Reference/evidence system live. Analytics layer live. Legal docs live (Privacy Policy + Terms). Groups feature live. Ranked/Casual mode live. OWASP audit complete (7/10 STRONG). SRI hashes on 6 HTML files. Edge Functions hardened (Deno.serve, CORS allowlist). deploy-verify.sh on VPS.

## 7.2. FILE MANIFEST

### Core JS Modules (all use window.X global pattern)
| File | Purpose | Status |
|------|---------|--------|
| colosseum-config.js | Central config, credentials, feature flags (v2.2.0), escapeHTML() | ✅ |
| colosseum-auth.js | Auth, profile CRUD, follows, rivals, moderator RPCs, safeRpc(). noOpLock + INITIAL_SESSION. | ✅ |
| colosseum-mirror-generator.js | Static mirror SSG on VPS → Cloudflare Pages every 5 min | ✅ |
| colosseum-payments.js | Stripe Checkout, token purchases, sub upgrades | ✅ |
| colosseum-notifications.js | Notification center, mark read via rpc() | ✅ |
| colosseum-paywall.js | 4 contextual paywall variants, gate() helper | ✅ |
| colosseum-async.js | Hot takes feed, predictions, rivals display, react toggle, challenge modal | ✅ |
| colosseum-share.js | Web Share API, clipboard, referrals, deep links | ✅ |
| colosseum-leaderboard.js | Elo/Wins/Streak tabs, time filters, My Rank | ✅ |
| colosseum-cards.js | Canvas share card generator, 4 sizes, ESPN aesthetic | ✅ |
| colosseum-arena.js | Arena: lobby, 4 modes, matchmaking, debate room, post-debate. AI sparring, moderator UX, ranked/casual, browser back button. | ✅ |
| colosseum-home.js | Home screen logic | ✅ |
| colosseum-scoring.js | Elo, XP, leveling (SELECT reads only) | ✅ |
| colosseum-webrtc.js | WebRTC audio via Supabase Realtime channels | ✅ |
| colosseum-voicememo.js | Voice memo mode, voice takes via rpc() | ✅ |
| colosseum-locks-fix.js | OBSOLETE — harmless dead weight | ⚠️ |

### HTML Pages
| File | Purpose | Status |
|------|---------|--------|
| index.html | Spoke carousel home, category overlays, pull-to-refresh, activity indicators | ✅ |
| colosseum-login.html | OAuth-dominant login, age gate, password reset | ✅ |
| colosseum-settings.html | All settings toggles incl. moderator, account mgmt | ✅ |
| colosseum-profile-depth.html | 12 sections, 147 Qs, saves to DB via safeRpc | ✅ |
| colosseum-terms.html | Terms of Service — DMCA, AI disclaimer, Ohio jurisdiction | ✅ |
| colosseum-privacy.html | Privacy Policy — COPPA, analytics sharing, California rights | ✅ |
| colosseum-debate-landing.html | Ungated landing, vote without signup, OG tags | ✅ |
| colosseum-auto-debate.html | AI vs AI debate page, ungated voting, rage-click funnel | ✅ |
| colosseum-plinko.html | Plinko Gate — 4-step signup (OAuth → Age → Username → Done) | ✅ |
| colosseum-groups.html | Groups: discover, my groups, rankings, detail view, hot takes | ✅ |

### Test Documents
| File | Purpose |
|------|---------|
| THE-COLOSSEUM-TEST-WALKTHROUGH.md | 54-scenario journey walkthrough |
| THE-COLOSSEUM-TEST-WALKTHROUGH-SESSION32.docx | Click-by-click test (~180 rows) |

### Database SQL (paste order matters — 24 migrations)
| File | # | Purpose |
|------|---|---------|
| colosseum-schema-production.sql | 1 | 18 tables, triggers, 45 cosmetics, 25 achievements |
| colosseum-ring3-functions.sql | 2 | Ring 3 scoring/token functions |
| colosseum-ring3-move2.sql | 3 | 22 SECURITY DEFINER functions |
| colosseum-move3-sanitize-ratelimit.sql | 4 | sanitize_text/url, rate_limits table |
| colosseum-rls-hardened.sql | 5 | 24 hardened RLS policies, guard trigger, views |
| colosseum-bot-army-schema.sql | 6 | Bot activity table, bot_stats_24h view |
| colosseum-auto-debate-schema.sql | 7 | auto_debates + auto_debate_votes tables |
| colosseum-fix-prediction.sql | 8 | place_prediction() fix |
| colosseum-session23-migration.sql | 9 | rivals, follows RPCs, predictions RPCs, rival RPCs |
| colosseum-fix-auto-debate-rls.sql | 10 | Public SELECT on active auto_debates + votes |
| colosseum-arena-schema.sql | 11 | debate_queue, arena_debates, debate_messages, arena_votes, 10 RPCs |
| colosseum-session27-bugfix.sql | 12 | Fixed arena feed, leaderboard, predictions RPCs |
| colosseum-references-migration.sql | 13 | debate_references, moderator columns, 6 RPCs |
| colosseum-analytics-migration.sql | 14 | event_log, log_event(), 9 views, daily_snapshots |
| colosseum-wire-log-event.sql | 15 | Wire log_event() into 16 RPCs |
| colosseum-wire-log-event-rivals.sql | 16 | Wire log_event() into rival RPCs |
| colosseum-moderator-toggle.sql | 17 | toggle_moderator_status, get_available_moderators, etc. |
| colosseum-security-logging.sql | 18 | security_events table, RAISE LOG, 3 monitoring views |
| colosseum-ranked-casual.sql | 19 | ranked boolean, elo_change columns, check_ranked_eligible() |
| colosseum-session-b-rls.sql | 20 | RLS hardening: TO scoping + (SELECT auth.uid()) wrapping |
| colosseum-session-c-stripe-idempotency.sql | 21 | stripe_processed_events table, purge function |
| colosseum-groups-schema.sql | 22 | groups + group_members tables, 8 RPCs, update_group_elo() |
| Migration 23: Group Elo wiring | 23 | update_arena_debate() calls update_group_elo() |
| colosseum-session-d-rate-limit-lock.sql | 25 | `pg_advisory_xact_lock` in `check_rate_limit()` — race condition fix |

### Supabase Edge Functions
| Function | Purpose |
|----------|---------|
| ai-sparring | Groq Llama 3.3 70B debate opponent. Populist personality, round-aware. Deno.serve, CORS allowlist. |
| ai-moderator | Groq Llama 3.3 70B evidence evaluator. Biases ALLOW. Falls back to auto-allow on error. |
| stripe-* | Stripe webhook + checkout (templates — deploy when Stripe goes live) |

### Bot Army (standalone Node.js — VPS only, not Vercel)
17 files + 2 Bluesky files, ~3,200+ lines. See Old Testament for full file list.

## 7.3. LIVE SUPABASE TABLES (34)
achievements, arena_debates, arena_votes, async_debates, auto_debate_votes, auto_debates, cosmetics, debate_messages, debate_queue, debate_votes, debates, follows, hot_take_reactions, hot_takes, notifications, payments, predictions, profile_depth_answers, profiles, profiles_private (view), profiles_public (view), rate_limits, reports, rivals, security_events, token_transactions, user_achievements, user_cosmetics, user_settings, groups, group_members, stripe_processed_events

## 7.4. SECURITY STATUS — OWASP AUDITED
All hardening applied: RLS, 30+ functions, sanitization, rate limits, vercel.json (CSP/HSTS/12 headers), middleware.js, Stripe CORS. SRI hashes on all CDN imports. Edge Functions hardened. Security event logging. deploy-verify.sh. 7/10 STRONG, 3 MODERATE.

## 7.5. LEGAL COMPLIANCE STATUS
Privacy Policy live. Terms of Service live. AI content labeling deployed. DMCA agent NOT registered. Legal emails NOT created (need domain). Data broker registration NOT yet required.

---

# 8. PRODUCT PHILOSOPHY (Condensed)

8.1. **Emergence Engine** — not a debate app, a social system where debates emerge.
8.2. **Third Place Theory** — the bar, not the arena. Presence over sessions.
8.3. **Spectators Are the Product** — design for the 90% who watch.
8.4. **Casual Is King** — protected lobbies, no sharks in casual waters.
8.5. **Reciprocal Gating** — can't unlock cosmetic until profile section complete.
8.6. **Liquidity Problem** — text async, voice memo, AI sparring solve cold-start.

---

# 9. DESIGN DNA (Condensed)

9.1. Fox News chyron energy + ESPN stat cards + gladiator gold
9.2. Palette: navy, red, white, GOLD
9.3. Fonts: Cinzel (display) + Barlow Condensed (body)
9.4. Background: diagonal gradient (#1a2d4a → #2d5a8e → #5b8abf → #7aa3d4 → #3d5a80)
9.5. Cards: dark frosted glass (rgba(10,17,40,0.6)) + backdrop-filter blur
9.6. Mobile-forward: phone default, 44px touch targets, scroll-snap
9.7. Topic tiers: Tier 1 Politics + Sports, Tier 2 Entertainment + Couples Court, Tier 3 Music/Movies/Cars
9.8. Customer segments (behavioral, NOT paywalled): Lurker, Contender, Champion, Creator. All free at launch.

---

# 10. BOT-DRIVEN GROWTH (Condensed)

10.1. Three-leg architecture: Leg 1 (Reactive), Leg 2 (Proactive), Leg 3 (Auto-Debate Rage-Click)
10.2. Daily capacity: ~370 L1 mentions, 5-10 L2 posts, 6 L3 auto-debates
10.3. Combined daily reach: ~6,000-40,000+ impressions
10.4. Actual monthly cost: $6-16/mo
10.5. Bot army LIVE (DRY_RUN=false). 298 actions in first 24h (278 L2, 20 L3).
10.6. 17 files, ~2,800+ lines. DigitalOcean VPS. PM2 managed.
10.7. All bot links → colosseum-f30.pages.dev (mirror), not Vercel app.
10.8. Platforms: Bluesky (done, L2 posting), Reddit (pending API), Lemmy (planned), Discord (deferred).

---

# 11. RECENT BUILD LOGS (Sessions 48-55)

## 11.1. Session 48 (Mar 7) — Security Audit Session C Complete

11.1.1. ✅ **Stripe webhook hardened — LM-117 + LM-130 + LM-131 all fixed.** colosseum-stripe-functions.js rewritten: Deno.serve(), npm:stripe@14, npm:@supabase/supabase-js@2. Raw body via req.text() for HMAC. Idempotency via stripe_processed_events table (INSERT ON CONFLICT DO NOTHING).
11.1.2. ✅ **SQL migration created** — colosseum-session-c-stripe-idempotency.sql (21st migration).
11.1.3. ⚠️ **Stripe functions NOT deployed** — templates only. Deploy when activating Stripe for real users.

## 11.2. Session 49 (Mar 7) — Scenario Audit + Groups Feature

11.2.1. ✅ **12 bugs identified** from 54-scenario code trace. Priority ordered.
11.2.2. ✅ **Groups feature built** — colosseum-groups-schema.sql (22nd migration): 2 tables, 8 RPCs, update_group_elo(). colosseum-groups.html. vercel.json /groups route.
11.2.3. ✅ **Hot takes shortcut** — group hot takes reuse hot_takes table with section=group_id (UUID). Zero schema change.

## 11.3. Session 50 (Mar 7) — Bug Fixes + Groups Deployed + Research Gate

11.3.1. ✅ **Groups deployed** — SQL migration ran, files uploaded, Vercel live.
11.3.2. ✅ **Bug 11 FIXED** — profile_depth_answers now reach DB via safeRpc.
11.3.3. ✅ **Bug 2 FIXED** — Guest auth gates added. requireAuth() shows "JOIN THE ARENA" modal.
11.3.4. ✅ **Bug 3 FIXED** — getReturnTo() in Plinko + Login. Open redirect blocked (LM-142).

## 11.4. Session 51 (Mar 8) — Bot Army Go-Live + Bluesky Fix

11.4.1. ✅ **DRY_RUN=false flipped** — Bot army LIVE. 298 actions in first 24h.
11.4.2. ✅ **Bluesky postHotTake wiring fixed** — was imported but never called in pipeline.
11.4.3. ✅ **Discord deferred** — retention tool, not growth. Deferred until real users.
11.4.4. ⚠️ **Groq TPD cap hit** — 100k token/day free tier. Falls back to templates.
11.4.5. ⚠️ **Leg 3 Bluesky postAutoDebate not wired** — LEG3_BLUESKY_POST_ENABLED=false, not urgent.

## 11.5. Session 52 (Mar 8) — Bug Fixes + Edge Function Repo Sync

11.5.1. ✅ **Bug 1 FIXED** — bot-config.js dead reference removed.
11.5.2. ✅ **Bug 6 FIXED** — debate_view RPC replaced with log_event().
11.5.3. ✅ **Bug 7 FIXED** — AI Sparring 401 fixed (Authorization header added).
11.5.4. ✅ **Bug 12 FIXED** — settings toggles now persist to user_settings DB table.
11.5.5. ✅ **Bug 5 FIXED** — Edge Function files in repo corrected to proper paths.
11.5.6. ⚠️ **GitHub push requires PAT** — no SSH key on VPS. PAT must be saved.

## 11.6. Session 53 (Mar 8) — Bug 6C Fix + Group Elo Wiring

11.6.1. ✅ **Bug 6C FIXED** — placePrediction() auth gate added.
11.6.2. ✅ **Migration 23: Group Elo wired** — update_arena_debate() now calls update_group_elo().
11.6.3. ✅ **Groups feature complete** (12.2.15).

## 11.7. Session 54 (Mar 8) — Mobile UX + Activity Indicators + Leg 3 Bluesky

11.7.1. ✅ **Leg 3 Bluesky postAutoDebate wired** — LEG3_BLUESKY_POST_ENABLED=false until flipped. LM-143 false-positive patch guard documented.
11.7.2. ✅ **Pull-to-refresh built** — 64px drag threshold, calls fetchTakes/loadHotTakes/fetchPredictions/renderPredictions.
11.7.3. ✅ **Share card fix** — ColosseumCards.shareCard() for all 4 card sizes.
11.7.4. ✅ **Migration 24: get_category_counts()** — returns live_debates + hot_takes per section.
11.7.5. ✅ **Activity indicators on carousel tiles** — red pulsing "X Live", "X Hot", or "Quiet".
11.7.6. ⚠️ **Voice memo UX + keyboard handling** — deferred, need real device test.

## 11.9. Session 56 (Mar 8) — Security Audit Session D Complete

11.9.1. ✅ **Rate limit race condition fixed** — `check_rate_limit()` now calls `pg_advisory_xact_lock(hashtext(user_id || '|' || action))` before the upsert. Serializes all concurrent calls per user+action pair. Lock auto-releases on transaction end. No deadlock risk (single lock per call). Migration 25: `colosseum-session-d-rate-limit-lock.sql`.
11.9.2. ✅ **Security audit FULLY COMPLETE** — Sessions A (RLS TO scoping), B (RLS SELECT wrapping), C (Stripe webhook hardening), D (rate limit race fix). All 4 sessions done.
11.9.3. ✅ **Bug 8 FIXED** — Test walkthrough 1A/1B/1C rewritten for three-zone architecture. "Reddit" → "Bluesky". Mirror → Vercel flow documented. 1C split into two sub-cases.

## 11.8. Session 55 (Mar 8) — Vercel Redeploy Unblocked

11.8.1. ✅ **Vercel webhook miss diagnosed** — GitHub web UI uploads sometimes fail to fire webhook. Fix: make a dummy commit to re-trigger.
11.8.2. ✅ **Vercel redeployed** — All Session 54 files now live in production.

---

# 12. WHAT TO DO NEXT

## 12.1. PENDING HUMAN ACTIONS

### Legal
12.1.1. ⏳ Register DMCA agent at copyright.gov ($6, renew every 3 years)
12.1.2. ⏳ Purchase domain thecolosseum.app (blocks legal emails + mirror URL)
12.1.3. ⏳ Set up email forwards: privacy@, legal@, dmca@ → wolfe8105@gmail.com

### Bot Infrastructure
12.1.4. ⏳ Reddit API approval — check email, update .env, enable Reddit legs
12.1.5. ⏳ Invite Discord bot to argument-heavy servers (deferred until real users)
12.1.6. ⏳ Telegram: talk to @BotFather, create bot, paste token

### Repo Cleanup (minor)
12.1.7. ⏳ Rename `package_1.json` → `package.json` on GitHub
12.1.8. ⏳ Upload updated bible files to GitHub

## 12.2. NEXT BUILD PRIORITIES

12.2.1. ✅ **Security audit Session D COMPLETE** — Rate limit race condition fixed: `pg_advisory_xact_lock(hashtext(user_id || action))` before upsert in `check_rate_limit()`. Serializes concurrent calls per user+action. Auto-releases at transaction end. Zero deadlock risk. Migration: `colosseum-session-d-rate-limit-lock.sql` (Migration 25). Security audit now FULLY COMPLETE (Sessions A–D).
12.2.2. ⏳ **Celebrity debate event system** — qualifier bracket, community voting, scheduling.
12.2.3. ⏳ **Area 2 remaining** — Voice memo UX + keyboard handling (needs real device test).
12.2.4. ⏳ **Area 3 remaining** — Elo explainer, friendlier error copy, loading state consistency.
12.2.5. ✅ **Bug 8 FIXED** — Test walkthrough scenarios 1A/1B/1C rewritten for three-zone architecture. Mirror vs Vercel app vs Plinko Gate now accurately documented. Scenario 1C split into 1C-i (mirror direct) and 1C-ii (Vercel direct). "Reddit" references replaced with "Bluesky" (actual live platform).
12.2.6. ⏳ **Build Lemmy bot files** — Priority 2 expansion platform.
12.2.7. Watch what happens — monitor via bot_stats_24h + auto_debate_stats + event_log + `pm2 logs`
12.2.8. Build next thing based on what real users do

## 12.3. KNOWN BUGS / TECH DEBT

12.3.1. ⏳ Domain purchase for thecolosseum.app — blocking legal emails and mirror URL.
12.3.2. ⏳ DMCA agent not registered — $6 at copyright.gov. Blocks safe harbor.
12.3.3. ⏳ Stripe Edge Function templates use old imports — not urgent, deploy when Stripe goes live.
12.3.4. ⏳ Edge Function CORS allowlist missing mirror domain (colosseum-f30.pages.dev) — OK for now since mirror is pure HTML.
12.3.5. ⏳ 3 older RLS policies still have {public} scope (hot_takes delete, rivals select, async_debates insert/update) — low priority.
12.3.6. ⏳ safeRpc() not yet backfilled into all modules — migrate when touching arena/home/async files.
12.3.7. ⏳ bot-engine.js not in repo — VPS-only file, source of truth on VPS.

## 12.4. REMAINING BOT ARMY TASKS
12.4.1. ⏳ Reddit API approval → update .env → enable Reddit legs
12.4.2. ⏳ Build Lemmy bot files
12.4.3. ⏳ Optional: create Twitter/X developer account (may be replaced by Bluesky)

---

*This is the New Testament. For all session build logs (1-47), the full inventory, revenue details, B2B strategy, education plans, research foundations, and growth strategy — see the Old Testament. For the B2B intelligence play — see the War Chest. For the product design north star — see the Product Vision.*
