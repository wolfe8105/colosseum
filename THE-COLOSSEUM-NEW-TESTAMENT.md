# THE COLOSSEUM — NEW TESTAMENT
### The Living Document — Read Every Session
### Last Updated: Session 41 (March 6, 2026)

> **The Old Testament** contains: ALL session build logs (1-25), 502+ item inventory, revenue model details, B2B data play, education plans, research foundations, growth strategy, and honest assessments. Read it when those areas are relevant.
> **Location:** `https://raw.githubusercontent.com/wolfe8105/colosseum/main/THE-COLOSSEUM-OLD-TESTAMENT.md`
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
4.5. Profile Depth System approved — 12 sections, 157 Qs, mixed rewards. Feature stays (generates rich demographic data for B2B). Price gate ($14.99→$0.49) shelved at launch — profile completion is free, incentivized by cosmetic rewards only.
4.6. No B2B sales until real users and data volume exist. BUT: analytics pipeline (event_log, 18 RPCs, 9 views) is already running. Pre-selling data futures is an option for upfront capital (see WAR-CHEST.md Section 8). Education and bot defense still wait.
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
4.36. Reference/evidence system: debaters submit mid-round, debate pauses, moderator (AI or human) rules allow/deny within 60s. Escalating token cost: free/5/15/35/50 per round per debater. Max 5 per round. Auto-allowed on 60s timeout. (Session 33)
4.37. Moderator class: parallel identity to debater. Same profile, separate stats (mod_rating, mod_approval_pct, mod_rulings_total). Scoring: debaters 0 or 25 pts each (happy/not), fans 1-50 average. Total out of 100. Bias emerges from rulings, never declared. (Session 33)
4.38. Moderator assignment: debaters pick from available mods, request specific mod by name, or system assigns highest-rated available. Online/offline toggle (green/red dot). Can't moderate your own debate. (Session 33)
4.39. Analytics event log: append-only `event_log` table, `log_event()` SECURITY DEFINER function, 9 aggregation views, `daily_snapshots` table. 250 data items mapped across 25 industries. All behavioral — zero surveys. (Session 33)
4.40. `supports_side` column on `debate_references` — tracks which side evidence supports. Enables moderator bias detection without asking. (Session 33)
4.36. Mirror is JAMstack SSG pattern — vanilla Node.js generator on VPS, hits Supabase REST API with native fetch (no @supabase/supabase-js), string concatenation templates, deployed to Cloudflare Pages via `wrangler pages deploy` every 5 minutes. (Session 28)
4.37. Mirror is NOT a shield — anyone can Google the Vercel app directly. Mirror controls where the bot army VOLUME goes. Real app still needs all 12 defense rings at full thickness. (Session 28)
4.38. Build fail safety — if generator queries fail, skip deploy, CDN keeps serving last good build. Site never goes down from a bad build. (Session 28)
4.39. Plinko Gate mental model — signup is a trust-building sequence, not a speed obstacle. Each step (OAuth, verify, age gate, display name) is a defense ring peg. 5-10 seconds is fine because it only happens once. (Session 28)
4.40. Platform name locked: "The Colosseum" — identity question resolved. (Session 28)
4.41. Reddit API now requires manual approval (as of late 2024). New accounts must submit a request form explaining the bot's purpose and expected volume. Approval takes days. Account: u/Master-Echo-2366. (Session 34)
4.42. VPS deployment: DigitalOcean $6/mo, Ubuntu 24.04, NYC3. Bot army managed by PM2 with ecosystem.config.js. DRY_RUN=true default. `pm2 startup && pm2 save` for reboot survival. (Session 34)
4.43. Supabase API keys: bot army and mirror generator must use the **legacy JWT format** service_role key (starts with `eyJ...`), not the new `sb_secret_*` format. Legacy keys tab is on Settings → API page. (Session 34)
4.44. **Revenue pivot: free platform, premier data.** Consumer subs/tokens shelved at launch. Revenue = B2B data licensing (auction model, tiered exclusivity) + structural ad inventory (unskippable 30-second breaks, 10-second tollbooths). Full strategy in `THE-COLOSSEUM-WAR-CHEST.md`. (Session 35)
4.45. **Product vision: visual game layer.** Debate is a game you can watch on mute. Swinging gauge, moderator effects, live transcription, animated reactions, haptic feedback. Audio is premium layer, not required layer. Solves 92% sound-off problem. Full spec in `THE-COLOSSEUM-PRODUCT-VISION.md`. (Session 35)
4.46. **Ad model: structural, unskippable, tiered.** 30-second round breaks (Tier 1 live, Tier 2 replay), 10-second tollbooths before every score reveal, lobby fill, replay entry. Near-100% view-through. No skip button. Banner ads are dead (0.05% CTR). Full map in PRODUCT-VISION.md Section 3. (Session 35)
4.47. **Social proof in bot army links.** Live viewer counts + category icons in link text. Three-phase templates (before/during/after debate). Specific odd numbers feel real. Mirror generator stamps counts into OG tags. PRODUCT-VISION.md Section 5. (Session 35)
4.48. **Polite nudge UX.** Every touchpoint: polite first, nudge second. Reciprocity lubricates ads and retention. Full copy map in PRODUCT-VISION.md Section 6. (Session 35)
4.49. **Stealth B2B positioning.** Consumer app is loud and public. B2B intelligence operation has no website, no LinkedIn, no press. Invisibility protects data integrity. WAR-CHEST.md Section 7. (Session 35)
4.50. **Legal identity: interactive computer service.** Platform classified under Section 230 CDA. Primary liability shield for user-generated content. AI auto-debates are platform speech (NOT protected by 230). Applicable laws: Section 230, COPPA, FTC Act Section 5, CAN-SPAM, DMCA, state privacy laws. Not applicable: 2257, FCRA, HIPAA, GLB, gambling, SEC/FINRA, FERPA. (Session 36)
4.51. **AI content must be labeled.** Auto-debates, AI sparring, and any AI-generated content must carry visible "AI-Generated" badges. Multiple states require disclosure; more are coming. Badge design in `colosseum-legal-snippets.html`. (Session 36)
4.52. **DMCA agent required.** Register with Copyright Office ($6, renew every 3 years). Designate dmca@thecolosseum.app. Required for safe harbor protection. (Session 36)
4.53. **Ranked vs Casual debate modes.** Casual = open to everyone, no profile required, Elo doesn't move, bar atmosphere. Ranked = Elo on the line, leaderboard matters, requires complete profile, skill-tiered matchmaking. Follows League of Legends normals/ranked model. Solves questionnaire incentive, intimidation, and B2B data segmentation. (Session 40)
4.54. **Profile questionnaire reframed as matchmaking protection.** "We use your profile to match you with opponents at your level." Age+experience=skill tier, topic knowledge=better debates, political leaning=real disagreement. Drip contextually (3-5 Qs at a time, context-aware), gate behind ranked mode. Casual needs zero profile. (Session 40)
4.55. **Celebrity/creator debate events approved.** Qualifier bracket (ranked-only, full profile required) → community votes → top 4 bracket → winner debates famous person. Micro-famous first (50K-100K subs). Bot army handles outreach via automated DMs on Bluesky/Reddit/Discord. Zero founder time. (Session 40)
4.56. **Groups + Group vs Group competition approved.** Groups have own debate rooms, leaderboard, hot takes feed. Group vs Group: each side picks champion, rest spectates. Group Elo moves. Solves liquidity (15 people who already disagree), inherently viral (rematch recruiting). Schema and build priority TBD. (Session 40)
4.57. **Bot army expanding to new platforms.** Priority 1: Bluesky (free API, all 3 legs, replaces useless Twitter). Priority 2: Lemmy (Reddit clone, full API). Priority 3: Mastodon (open API, fragmented reach). Skip: Nostr (wrong audience), Threads (business verification wall). Bot files not yet written. (Session 40)
4.58. **OWASP Top 10 audit completed.** 7/10 categories STRONG or MODERATE. Fixes deployed for A05 (CORS), A06 (SRI+pinned CDN), A08 (Deno.serve, deploy verification), A09 (security event logging). (Session 40)
4.59. **SRI hashes on all CDN imports.** supabase-js pinned to @2.98.0 with SHA-384 integrity + crossorigin="anonymous" on 6 HTML pages. Must regenerate hash when upgrading. (Session 40)
4.60. **Edge Functions use Deno.serve with CORS allowlist.** Removed deno.land/std imports (supply chain risk). CORS wildcard `*` replaced with allowlist: colosseum-six.vercel.app + thecolosseum.app. Zero external imports. (Session 40)
4.61. **Security logging via RAISE LOG + security_events table.** 5 event types: auth_failure, rate_limit_blocked, access_denied, input_violation, privilege_escalation_attempt. RAISE LOG survives transaction rollback. Queryable via Supabase Log Explorer. 3 monitoring views. (Session 40)
4.62. **Cloudflare Pages project live.** Project name: `colosseum` (URL: colosseum-f30.pages.dev, not colosseum.pages.dev — name was taken). Wrangler authenticated on VPS via API token. Test deploy successful. Bot army COLOSSEUM_URL set. (Session 41)

## 4.41. OPEN DECISIONS
4.41.1. ✅ ~~Subscription price~~ — **RESOLVED Session 35.** Free at launch. Subs stay in code, flipped off. Revenue is B2B data + ads. See WAR-CHEST.md.
4.41.2. ✅ ~~Minors policy~~ — **RESOLVED Session 36.** COPPA compliant: age gate in Plinko blocks under-13. Users 13-17 permitted with parental permission representation. Not directed at children. No knowingly collected under-13 data.
4.41.3. Launch date: what's real?
4.41.4. Domain: thecolosseum.app or keep colosseum-six.vercel.app + colosseum-f30.pages.dev?
4.41.5. Groups schema design — tables, permissions, group size limits, creation requirements (Session 40)
4.41.6. Public profile pages — standalone URL, shareable, Google-indexable. Value clear, build priority TBD. (Session 40)

---

# 5. THREE CORE PROBLEMS

5.1. **Money pipe connected (Session 10)** — Stripe Checkout live (sandbox), Edge Functions deployed, webhooks receiving 4 event types. Still sandbox mode.
5.2. **Single-player → multiplayer (in progress)** — Session 23 added follows, user profile modals, predictions, hated rivals. Session 24 added full arena with matchmaking, 4 debate modes, post-debate flow. Session 25 added real AI sparring opponent. Session 26 removed login wall — anonymous users see everything, auth only gates actions. Social + competitive infrastructure exists. Still needs real users.
5.3. **No audience and no way to build one manually** — founder has zero network. Bot army code complete (Session 19), Leg 3 auto-debate engine added (Session 20). **Session 34: Bot army deployed to VPS, PM2 managed, DRY_RUN=true.** Discord bot live (needs server invites). Reddit API approval pending. Mirror generator on VPS, needs Cloudflare Pages project.

---

# 6. ARCHITECTURE — CASTLE RING MODEL

6.1. Ring 6 — Public Surface (designed to fall): Static Mirror on Cloudflare Pages (colosseum-f30.pages.dev), pure HTML, zero JS, zero auth. Bot army traffic lands here. CDN-backed, unhackable by design.
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

7.1.1. ✅ Supabase: faomczmipsccwbhpivmp (34 tables, RLS hardened, 42+ server functions, sanitization, 9 analytics views, 3 security views, **20 RPCs wired to log_event()**)
7.1.2. ✅ Vercel: colosseum-six.vercel.app (auto-deploys from GitHub)
7.1.3. ✅ Stripe sandbox: 7 products (3 subs + 4 token packs), Edge Functions deployed, webhooks listening
7.1.4. ✅ Auth working end-to-end (signup → email verify → auto-login)
7.1.5. ✅ Resend SMTP configured (custom email, rate limit removed)
7.1.6. ✅ Security hardening FULLY LIVE — Move 1 (RLS), Move 2 (22 functions), Move 3 (sanitization + rate limits)
7.1.7. ✅ Bot army code complete (Session 19-20) — 17 files, ~2,800+ lines, standalone Node.js app. **Deployed to VPS Session 34** — DigitalOcean $6/mo, PM2 managed, DRY_RUN=true. Discord connected (0 servers). Reddit pending API approval. Twitter not set.
7.1.8. ✅ Auto-debate schema + landing page live (Session 20)
7.1.9. ✅ vercel.json hardened + middleware.js deployed (Session 16, confirmed Session 21)
7.1.10. ✅ Node.js v24.14.0 + Supabase CLI on founder's dev machine
7.1.11. ✅ Hot takes feed wired to Supabase per category (Session 22)
7.1.12. ✅ Follow system UI, user profile modals, predictions tab, hated rivals mechanic (Session 23)
7.1.13. ✅ Auth race condition fixed — readyPromise pattern (Session 23)
7.1.14. ✅ GitHub repo fully synced — all code, SQL, bible, ops docs, bot army (Session 23)
7.1.15. ✅ Arena fully built — lobby, mode select (4 modes), matchmaking queue, debate room, post-debate (Session 24)
7.1.16. ✅ Arena schema live — debate_queue, arena_debates, debate_messages, arena_votes tables + 10 RPCs (Session 24)
7.1.17. ✅ Reference/evidence system live — debate_references, moderator_scores tables + moderator columns on debates + profiles + 6 RPCs (Session 33)
7.1.18. ✅ Analytics layer live — event_log, daily_snapshots tables + log_event() + run_daily_snapshot() + 9 aggregation views (Session 33)
7.1.17. ✅ AI Sparring live — Groq Edge Function deployed, GROQ_API_KEY secret set, real AI opponent active (Session 25)
7.1.18. ✅ Three-zone architecture designed — Static Mirror (Cloudflare Pages) + Plinko Gate + Members Zone (Vercel). Generator design locked. (Session 28)
7.1.19. ✅ Land Mine Map created — 80 entries, 14 sections, cause/effect/fix for every major decision. Read every session alongside NT. (Session 29)
7.1.20. ✅ Mirror generator built — colosseum-mirror-generator.js, 537 lines, tested with mock data. (Session 30)
7.1.21. ✅ Plinko Gate built — colosseum-plinko.html, 4-step linear signup flow. (Session 30)
7.1.22. ⚠️ colosseum-locks-fix.js — OBSOLETE. Separate file approach failed (global mock too late). Superseded by Session 31 createClient fix. File is harmless dead weight. (Session 30)
7.1.23. ✅ Navigator.locks fix VERIFIED WORKING — noOpLock passed directly into createClient({ auth: { lock: noOpLock } }) per supabase-js#1594. colosseum-auth.js rebuilt from scratch: INITIAL_SESSION is sole init path (no separate getSession), no await inside onAuthStateChange callback. Profile loads, tier shows 'creator', console clean. (Session 31)
7.1.24. ✅ Guest logic stripped from Members Zone — 6 files modified, all login.html refs → Plinko, auth gates on settings + profile-depth. Auto-debate + debate-landing ungated by design. Click-by-click test walkthrough created (~180 rows). (Session 32)
7.1.25. ✅ Analytics fully wired — 18/18 RPCs call log_event(). colosseum-wire-log-event.sql (16 functions, 1,239 lines) + colosseum-wire-log-event-rivals.sql (2 functions). (Session 34)
7.1.26. ✅ VPS live — DigitalOcean $6/mo, Ubuntu 24.04, NYC3, 1GB RAM, IP 161.35.137.21. Node.js 20, PM2 6.0.14, Wrangler 4.70.0. (Session 34)
7.1.27. ✅ Bot army deployed to VPS — PM2 managed, auto-restart, survives reboot. DRY_RUN=true. Discord bot online (0 servers). Reddit pending API approval. Schedules: Leg 2 every 15 min, Leg 3 every hour. (Session 34)
7.1.28. ✅ Legal docs created — colosseum-privacy.html (Privacy Policy) + colosseum-terms.html (Terms of Service, rebuilt). AI-generated content badges + legal footer snippets ready for paste. DMCA process documented. (Session 36)
7.1.29. ✅ Moderator UI fully built — settings toggles (is_moderator, mod_available, stats display), arena moderator picker (None/AI/Human list), evidence submission form, ruling panel bottom-sheet for human mods (60s auto-allow countdown), AI auto-ruling via Groq Edge Function, reference polling (3s), post-debate mod scoring (debaters: happy/unhappy, spectators: 1-50 slider). (Session 39)
7.1.30. ✅ ai-moderator Edge Function deployed — Groq Llama 3.1 70B, temp 0.3, biases toward ALLOW, falls back to auto-allow on any error. Shares GROQ_API_KEY secret with ai-sparring. (Session 39)
7.1.31. ✅ Supabase CLI v2.75.0 installed on VPS — authenticated, used to deploy ai-moderator Edge Function. (Session 39)
7.1.32. ✅ 4 new SECURITY DEFINER RPCs — toggle_moderator_status(), toggle_mod_available(), get_available_moderators(), get_debate_references(). SQL migration: colosseum-moderator-toggle.sql (20th paste). (Session 39)
7.1.33. ✅ OWASP Top 10 audit completed — 7/10 STRONG or MODERATE. SRI hashes on 6 HTML files (supabase-js pinned @2.98.0). Edge Functions rewritten (Deno.serve, CORS allowlist). Security logging (RAISE LOG + security_events table + 3 monitoring views). deploy-verify.sh on VPS. (Session 40)
7.1.34. ✅ colosseum-security-logging.sql — 18th SQL migration (725 lines). security_events table, RAISE LOG in 6 RPCs, guard_profile_update() logs privilege escalation attempts, 3 monitoring views (security_dashboard, security_alerts, security_hourly). Pasted to Supabase. (Session 40)
7.1.35. ✅ Edge Functions hardened — ai-sparring + ai-moderator rewritten: Deno.serve (zero deno.land imports), CORS allowlist (colosseum-six.vercel.app + thecolosseum.app). Deployed via Supabase CLI on VPS. (Session 40)
7.1.36. ✅ deploy-verify.sh on VPS — 7 checks (file existence, secret scan, SRI, headers, CORS, deno.land imports, git integrity). Blocks deploy on critical failures. Known false positives: settings_3 filename, password input in plinko. (Session 40)
7.1.37. ✅ cast_vote() and update_profile() now call log_event() — were missing from Session 34 wiring. Added in OWASP audit. Analytics coverage now 20/20 RPCs. (Session 40)
7.1.38. ✅ Cloudflare Pages project created — project name `colosseum`, URL colosseum-f30.pages.dev. Wrangler authenticated via API token on VPS. Test deploy successful ("Coming soon" placeholder). (Session 41)
7.1.39. ✅ Bot army COLOSSEUM_URL set — .env on VPS updated with https://colosseum-f30.pages.dev. All bot army links will point to mirror. (Session 41)
7.1.40. ✅ bot_activity table confirmed existing in Supabase — NT 12.1.8 was stale. (Session 41)

## 7.2. FILE MANIFEST

### Core JS Modules (all use window.X global pattern)
| File | Purpose | Status |
|------|---------|--------|
| colosseum-config.js | Central config, all credentials, feature flags (v2.2.0) | ✅ Updated Session 24 |
| colosseum-locks-fix.js | OBSOLETE — global mock too late, superseded by Session 31 createClient fix. Harmless dead weight. | ⚠️ Session 30 |
| colosseum-auth.js | Supabase auth, profile CRUD, follows, user profile modal, rivals RPCs, moderator RPCs (toggle, assign, score, references). noOpLock in createClient, INITIAL_SESSION sole init path. | ✅ Updated Session 39 |
| colosseum-mirror-generator.js | Static mirror SSG — runs on VPS, deploys to Cloudflare Pages every 5 min | ✅ NEW Session 30 |
| colosseum-payments.js | Stripe Checkout, token purchases, sub upgrades | ✅ |
| colosseum-notifications.js | Notification center, mark read via rpc() | ✅ Migrated Session 17 |
| colosseum-paywall.js | 4 contextual paywall variants, gate() helper | ✅ |
| colosseum-async.js | Hot takes feed, predictions (fetch/render/place), rivals display, react toggle, challenge modal | ✅ Rebuilt Session 23 |
| colosseum-share.js | Web Share API, clipboard, referrals, deep links | ✅ |
| colosseum-leaderboard.js | Elo/Wins/Streak tabs, time filters, My Rank | ✅ |
| colosseum-cards.js | Canvas share card generator, 4 sizes, ESPN aesthetic | ✅ |
| colosseum-arena.js | Arena: lobby, mode select, matchmaking queue, debate room (4 modes), post-debate. AI sparring calls Groq Edge Function with full conversation memory. Moderator UX: picker, evidence form, ruling panel, AI auto-ruling, post-debate scoring. | ✅ Updated Session 39 |
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
| colosseum-terms.html | Terms of Service — rebuilt with DMCA process, AI disclaimer, liability, dispute resolution (Ohio jurisdiction) | ✅ Rebuilt Session 36 |
| colosseum-privacy.html | Privacy Policy — data practices, COPPA, aggregated analytics sharing, California rights, AI disclosure | ✅ NEW Session 36 |
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
| colosseum-references-migration.sql | 13th | debate_references table, moderator columns on debates + profiles, 6 RPCs (submit/rule/auto-allow/score/assign), updated guard trigger | ✅ Pasted Session 33 |
| colosseum-analytics-migration.sql | 14th | event_log table, log_event(), 9 aggregation views, daily_snapshots, run_daily_snapshot() | ✅ Pasted Session 33 |
| colosseum-wire-log-event.sql | 15th | Wire log_event() into 16 RPCs (create_hot_take, react_hot_take, follow/unfollow, place_prediction, finalize_debate, advance_round, join_debate_queue, create_ai_debate, submit_debate_message, vote_arena_debate, submit_reference, rule_on_reference, auto_allow_expired_references, score_moderator, assign_moderator) | ✅ Pasted Session 34 |
| colosseum-wire-log-event-rivals.sql | 16th | Wire log_event() into declare_rival + respond_rival | ✅ Pasted Session 34 |
| colosseum-moderator-toggle.sql | 17th | toggle_moderator_status, toggle_mod_available, get_available_moderators, get_debate_references RPCs | ✅ Pasted Session 39 |
| colosseum-security-logging.sql | 18th | security_events table, RAISE LOG in 6 RPCs, guard_profile_update() escalation logging, 3 monitoring views | ✅ Pasted Session 40 |

### Supabase Edge Functions
| Function | Purpose | Status |
|----------|---------|--------|
| ai-sparring | Groq Llama 3.1 70B debate opponent. Populist personality, full conversation memory, round-aware (opener/rebuttal/knockout). Falls back to canned if Groq fails. Deno.serve, zero imports, CORS allowlist. | ✅ Rewritten Session 40 |
| ai-moderator | Groq Llama 3.1 70B evidence evaluator. Judges reference relevance to debate topic. Biases ALLOW, denies spam/trolling/off-topic. Falls back to auto-allow on error. temp 0.3. Deno.serve, zero imports, CORS allowlist. | ✅ Rewritten Session 40 |
| stripe-* | Stripe webhook + checkout functions | ✅ Deployed Session 10 |

### Bot Army (standalone Node.js — lives on VPS, not Vercel)
17 files, ~2,800+ lines. See Old Testament for full file list.

### Deployment & API
vercel.json, middleware.js, deploy-verify.sh (VPS — 7 security checks, blocks deploy on failures), Telegram bot (4 files), Discord bot (4 files), Stripe Edge Functions (deployed to Supabase).

## 7.3. LIVE SUPABASE TABLE INVENTORY (34 tables/views — confirmed Session 41)
achievements, arena_debates, arena_votes, async_debates, auto_debate_votes, auto_debates, cosmetics, debate_messages, debate_queue, debate_votes, debates, follows, hot_take_reactions, hot_takes, notifications, payments, predictions, profile_depth_answers, profiles, profiles_private (view), profiles_public (view), rate_limits, reports, rivals, security_events, token_transactions, user_achievements, user_cosmetics, user_settings

## 7.4. SECURITY STATUS — OWASP AUDITED (Session 40)
All hardening applied: RLS, 30+ functions, sanitization, rate limits, vercel.json (CSP/HSTS/12 headers), middleware.js, Stripe CORS. Client JS migrated to .rpc() calls. Session 40 OWASP Top 10 audit: SRI hashes on all CDN imports (pinned supabase-js@2.98.0), Edge Functions use Deno.serve with CORS allowlist (no wildcard, no deno.land imports), security event logging (RAISE LOG + security_events table + 3 monitoring views), deploy-verify.sh blocks deploys with critical failures. 7/10 categories STRONG, 3 MODERATE.

## 7.5. LEGAL COMPLIANCE STATUS (Session 36)
Privacy Policy live (colosseum-privacy.html). Terms of Service rebuilt (colosseum-terms.html). AI content labeling designed (snippets ready, not yet pasted into app). DMCA agent not yet registered. Legal email addresses not yet created (need domain). Data broker registration NOT yet required — triggers when B2B data sales begin.

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
9.8. Customer segments (behavioral tiers, NOT paywalled at launch): Lurker (free/ads), Contender, Champion, Creator. All free at launch — segments used for behavior tracking, feature access gating (future), and advertiser targeting. Pricing tiers shelved, code preserved. See WAR-CHEST.md for revenue model.

---

# 10. BOT-DRIVEN GROWTH (Condensed — full details in Old Testament)

10.1. Three-leg architecture: Leg 1 (Reactive — fish in arguments), Leg 2 (Proactive — create content), Leg 3 (Auto-Debate Rage-Click — AI generates full debates with wrong winners)
10.2. Daily capacity: ~370 Leg 1 mentions, 5-10 Leg 2 posts, 6 Leg 3 auto-debates
10.3. Combined daily reach: ~6,000-40,000+ impressions
10.4. Actual monthly cost: $6-16/mo (Groq free, Reddit free, Twitter free tier, Discord free)
10.5. ~~Month 1 estimate: ~12-20 new users. Month 12: ~300-600. Year 1 net profit: ~$2,100-6,100~~ **OBSOLETE — consumer sub projections replaced by B2B model.** Year 1 realistic range: $0 (bad) to $550K (lucky). Normal: 1-2 B2B contracts at $25K-$50K each. Year 2-3 target: $250K-$1.5M (normal) to $10M (lucky ceiling with exclusivity). Full projections with market research backing in WAR-CHEST.md Sections 16-17. Bot army user growth projections (10.5 original) still valid for volume targets — volume feeds B2B value.
10.6. 17 files, ~2,800+ lines. DigitalOcean $6/mo VPS. PM2 process manager. DRY_RUN=true default.
10.7. All bot army links point to static mirror (colosseum-f30.pages.dev), not the Vercel app. Reduces attack surface, eliminates auth bugs from funnel, saves Supabase bandwidth. (Session 28, URL confirmed Session 41)
10.8. **Bot army platform expansion approved (Session 40).** Priority 1: Bluesky (free API, all 3 legs, @atproto/api SDK, replaces useless Twitter free tier). Priority 2: Lemmy (Reddit clone, full API, lemmy-bot library). Priority 3: Mastodon (open API, botsin.space instance, fragmented reach). Bot files not yet written.

---

# 11. RECENT BUILD LOGS (Sessions 24-41)

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

## 11.10. Session 33 (Mar 4) — Mirror Fix + References + Moderator Class + Analytics Layer
11.10.1. ✅ **Mirror generator fixed** — anon key had 1-char typo (341→340), `verdict` column doesn't exist (→ `judge_reasoning`). Tested against live Supabase: 11 pages generated in 1s (1 landing, 7 category, 1 debate, 1 leaderboard, 1 arena).
11.10.2. ✅ **advance_round() bug fixed** — removed non-existent `moderator_id` column reference. Now only debater_a and debater_b can advance rounds. NT 12.3.10 resolved.
11.10.3. ✅ **Reference/evidence system built** — `colosseum-references-migration.sql`. New table `debate_references`, 6 SECURITY DEFINER functions: `submit_reference()`, `rule_on_reference()`, `auto_allow_expired_references()`, `score_moderator()`, `assign_moderator()`, updated `guard_profile_columns()`. Moderator columns added to `debates` and `profiles`.
11.10.4. ✅ **`supports_side` column added** — tracks which side evidence supports on `debate_references`. Enables behavioral bias detection for moderators.
11.10.5. ✅ **Analytics data layer built** — `colosseum-analytics-migration.sql`. 755 lines. `event_log` table (append-only, service-role locked), `log_event()` function, 9 aggregation views, `daily_snapshots` table, `run_daily_snapshot()` function. 250 data items mapped across 25 buyer industries inline.
11.10.6. ⚠️ ~~`log_event()` not yet wired~~ — **WIRED Session 34.** 18/18 RPCs now call log_event(). Full event coverage.

## 11.11. Session 34 (Mar 4) — Wire log_event() + VPS Deploy + Bot Army Live
11.11.1. ✅ **log_event() wired into 18 RPCs** — colosseum-wire-log-event.sql (1,239 lines, 16 functions) + colosseum-wire-log-event-rivals.sql (2 functions). Every user-facing RPC now emits analytics events. Event types: hot_take_posted, hot_take_reacted, follow, unfollow, prediction_placed, debate_completed, round_advanced, queue_joined, queue_matched, ai_spar_started, ai_spar_message, auto_debate_voted, reference_submitted, reference_ruled, reference_auto_allowed, moderator_scored, moderator_assigned, rival_declared, rival_accepted.
11.11.2. ✅ **auto_allow_expired_references() return type conflict** — live Supabase had different return type than repo. Fixed with DROP FUNCTION before CREATE OR REPLACE.
11.11.3. ✅ **VPS purchased** — DigitalOcean $6/mo droplet, Ubuntu 24.04, NYC3, 1GB RAM. IP: 161.35.137.21.
11.11.4. ✅ **VPS provisioned** — Node.js 20, PM2 6.0.14, Wrangler 4.70.0, Git installed. Repo cloned to /opt/colosseum.
11.11.5. ✅ **Bot army deployed** — unzipped colosseum-bot-army.zip, npm installed, .env configured. PM2 running with ecosystem.config.js. pm2 startup + pm2 save for reboot survival.
11.11.6. ✅ **Discord bot created** — token set in .env. Message Content Intent enabled. Bot online, connected to 0 servers (needs invite links).
11.11.7. ⏳ **Reddit API access requested** — form submitted for u/Master-Echo-2366. Awaiting approval (days). Reddit legs disabled in .env until approved.
11.11.8. ⏳ **Twitter/X not set up** — free tier can only post (LM-040). Legs disabled in .env.
11.11.9. ✅ **DRY_RUN=true** — bot army running, logging all actions, posting nothing. Legs active: L1-Discord, L2-News, L2-Debates, L3-AutoDebate. Schedules: Leg 2 every 15 min, Leg 3 every hour at :05.

## 11.12. Session 35 (Mar 5) — Revenue Pivot + Strategy Docs + NT Overhaul
11.12.1. ✅ **THE-COLOSSEUM-WAR-CHEST.md created** — B2B intelligence play. Auction model, 3 pricing tiers ($500K–$10M), 45-day pitch (verbatim), stealth positioning, pre-sell strategy, top 100 buyer list across 10 categories, 9 auction battlegrounds (litigation, pharma, tech, energy, labor, crypto, food, gambling, telecom). Example pitches: Lincoln Project + Bayer/Roundup.
11.12.2. ✅ **THE-COLOSSEUM-PRODUCT-VISION.md created** — Psychology framework (primal + Cialdini), 92% sound-off solution (visual game layer), ad model (structural unskippable, 3 tiers, full inventory map per debate), mobile interaction design (thumb zone, haptic, pattern interrupt), social proof link templates (3-phase, category icons), polite nudge copy map (10 touchpoints), gamification (7-day onboarding, streaks, rematch button), DMs spec, defense notes.
11.12.3. ✅ **NT surgical updates** — 7 edits: Section 1.4 revenue rewrite, Section 4.5 Profile Depth price gate removed, Section 4.6 B2B sequencing clarified, Section 4.41.1 subscription price resolved (free), Section 9.8 customer segments reframed (behavioral not financial), Section 10.5 revenue projections replaced (B2B), Section 12.3.11 token pricing conflict resolved. New key decisions 4.44–4.49 added. Cross-references to War Chest + Product Vision added to header.
11.12.4. ✅ **Land Mine Map updated** — LM-097 through LM-099 added (revenue pivot mines).
11.12.5. ✅ **Market research + honest projections added to War Chest** — Sections 16-17. Alt data market size ($11.65B, 63.4% CAGR), buyer spend data ($1.6M avg across 20 datasets, 40% cost ≤$25K), comparable pricing (sentiment tools $10K-$100K/year), political campaign spend ($15.9B cycle, $30K/poll, $10K/focus group). Tier pricing revised down from aspirational to market-backed: Tier 1 $25K-$100K, Tier 2 $100K-$500K, Tier 3 $500K-$2M+. Year 1 realistic range: $0-$550K (not $2.5M-$15M). NT Section 10.5 corrected.

## 11.13. Session 36 (Mar 5) — Legal Identity + Privacy Policy + Terms of Service
11.13.1. ✅ **Legal identity analysis** — Platform classified as "interactive computer service" under Section 230 CDA. Researched all applicable US law. Applicable: Section 230, COPPA, FTC Act §5, CAN-SPAM, DMCA, state privacy laws (20 states), data broker registration (future, when B2B sales start). Not applicable: 2257, FCRA, HIPAA, GLB, gambling, SEC/FINRA, FERPA.
11.13.2. ✅ **colosseum-privacy.html created** — 14-section Privacy Policy. Covers: data collection (direct + automatic), usage, AI content disclosure (Groq), aggregated analytics sharing (B2B surface covered honestly without exposing stealth per LM-098), COPPA compliance (under-13 blocked), California rights (CCPA), security measures, cookies, international transfers. Explicit "we do not sell personal information" under CCPA.
11.13.3. ✅ **colosseum-terms.html rebuilt** — 17-section Terms of Service. Covers: eligibility (13+), user content license, AI content disclaimer, prohibited conduct, content moderation (Section 230(c)(2) cited), DMCA takedown/counter-notice process, disclaimers, liability limitation ($50 cap), indemnification, dispute resolution (Ohio jurisdiction, Cuyahoga County). Replaces existing colosseum-terms.html.
11.13.4. ✅ **AI-generated content badges designed** — CSS + HTML snippets for auto-debate pages, AI sparring room, and debate landing (conditional). "AI-Generated Debate — Not Real People" badge. Matches Colosseum design DNA.
11.13.5. ✅ **Legal footer designed** — Fixed-bottom bar with Privacy Policy + Terms of Service + copyright links. Snippets ready for all 9 HTML pages.
11.13.6. ✅ **Land Mine Map updated** — LM-100 through LM-105 added (legal compliance mines).
11.13.7. ⏳ **Snippets not yet pasted** — colosseum-legal-snippets.html contains all CSS + HTML + paste instructions. Needs manual paste into 9 HTML pages + colosseum-arena.js.
11.13.8. ⏳ **DMCA agent not registered** — $6 at copyright.gov/dmca-directory. Needs legal name + mailing address + dmca@thecolosseum.app.
11.13.9. ⏳ **Legal email addresses not created** — privacy@, legal@, dmca@ all need thecolosseum.app domain first (12.3.12 still unresolved).
11.13.10. ✅ **Minors policy resolved** — COPPA compliant. Age gate in Plinko blocks under-13. 13-17 permitted. Not directed at children. Open decision 4.41.2 closed.

## 11.14. Session 37 (Mar 5) — Legal Paste + Bug Fixes + Repo Cleanup
11.14.1. ✅ **Legal snippets baked into all 9 HTML pages** — footer CSS + HTML added to index.html, colosseum-login.html, colosseum-settings.html, colosseum-profile-depth.html, colosseum-terms.html, colosseum-debate-landing.html, colosseum-auto-debate.html, colosseum-plinko.html, colosseum-privacy.html. No more manual paste instructions.
11.14.2. ✅ **AI badges deployed** — auto-debate page (unconditional), debate-landing (conditional on `debate.is_auto`), arena.js AI sparring (conditional on `isAI`). AI badge CSS on index.html (arena renders there).
11.14.3. ✅ **4 missing files pushed to GitHub** — colosseum-privacy.html, colosseum-wire-log-event.sql (1,239 lines, 16 RPCs), colosseum-wire-log-event-rivals.sql (111 lines, 2 RPCs), colosseum-bot-army-schema.sql (76 lines). NT 12.3.7 resolved.
11.14.4. ✅ **Login hang fixed** — login page now awaits `ColosseumAuth.ready` before checking `currentUser` redirect. Previously checked synchronously at DOMContentLoaded before INITIAL_SESSION fired. NT 12.3.6 resolved.
11.14.5. ✅ **Leaderboard wired to Supabase** — queries `profiles_public` sorted by elo/wins/streak, shows real user rank, falls back to placeholder data when no connection or empty results. NT 12.3.8 resolved.
11.14.6. ✅ **Bebas Neue font fixed** — added to Google Fonts import on index.html. All JS modules using it now render correctly. NT 12.3.9 resolved.

## 11.15. Session 38 (Mar 5) — Mirror Hardening + App Shell Recovery
11.15.1. ✅ **Mirror generator key removed** — hardcoded Supabase anon key fallback removed from colosseum-mirror-generator.js. Now requires SUPABASE_URL and SUPABASE_ANON_KEY in .env or exits with error. NT 12.3.14 resolved.
11.15.2. ✅ **vercel.json fixed** — `/privacy` route was pointing to colosseum-terms.html instead of colosseum-privacy.html. Corrected.
11.15.3. ✅ **Members zone app shell recovered** — discovered current repo index.html was mirror generator output, not the real app. Real app shell (546 lines, spoke carousel, bottom nav, 5 screen containers, 16 JS imports) recovered from git commit e8b7b3b. Updated with legal footer, AI badge CSS, Bebas Neue import. Pushed as index.html replacement.
11.15.4. ✅ **Memory cleaned** — removed dead entries, updated session counts, added app shell overwrite finding to persistent memory.
11.15.5. ✅ ~~Moderator UI not started~~ — BUILT Session 39.

## 11.16. Session 39 (Mar 5) — Full Moderator UX + AI Moderator Edge Function
11.16.1. ✅ **colosseum-moderator-toggle.sql** — 17th SQL migration. 4 new SECURITY DEFINER RPCs: toggle_moderator_status(), toggle_mod_available(), get_available_moderators(), get_debate_references(). Needed DROP FUNCTION before replacing get_debate_references() due to return type change (LM-095 pattern).
11.16.2. ✅ **colosseum-auth.js updated** — 8 new public API methods: toggleModerator, toggleModAvailable, submitReference, ruleOnReference (now takes 4th param ruledByType), scoreModerator, assignModerator, getAvailableModerators, getDebateReferences. Mod fields added to placeholder profile.
11.16.3. ✅ **colosseum-settings.html updated** — New MODERATOR section between Audio and Privacy. "I'm a Moderator" toggle, "Available Now" toggle with green/red dot, stats card (rating, debates, rulings, approval %). Toggles save instantly via RPC, not localStorage.
11.16.4. ✅ **colosseum-arena.js updated** — Moderator picker in mode select (None/AI/Human list from get_available_moderators). Reference submission (📎 EVIDENCE button + form). Ruling panel bottom-sheet for human mods (allow/deny + reason + 60s auto-allow countdown). Reference polling (3s interval). AI auto-ruling (calls ai-moderator Edge Function, then ruleOnReference with type 'ai'). Post-debate mod scoring (debaters: happy/unhappy = 0 or 25, spectators: 1-50 slider). Mod bar in VS section.
11.16.5. ✅ **ai-moderator Edge Function deployed** — supabase/functions/ai-moderator/index.ts, 155 lines. Groq Llama 3.1 70B, temp 0.3. Evaluates evidence relevance to debate topic. Biases toward ALLOW. DENY only for off-topic, spam, trolling, personal attacks. Falls back to auto-allow on any error (LM-087 pattern). Shares GROQ_API_KEY with ai-sparring.
11.16.6. ✅ **Supabase CLI installed on VPS** — v2.75.0, authenticated via browser login. Used to deploy ai-moderator Edge Function.
11.16.7. ✅ **Column name caught** — debate_references uses 'ruling' column, not 'status'. Fixed in SQL and JS before deploy.

## 11.17. Session 40a (Mar 5) — Product Ideas (Brainstorming Only — No Code)
11.17.1. ✅ **Ranked vs Casual debate modes locked** — Casual (open, no profile, no Elo) + Ranked (full profile, Elo moves, matchmaking tiered). Follows LoL model.
11.17.2. ✅ **Profile questionnaire reframed** — matchmaking protection pitch, drip contextually (3-5 Qs), gate behind ranked. Casual needs zero profile.
11.17.3. ✅ **Celebrity debate events approved** — qualifier bracket → winner debates famous person. Micro-famous first. Bot army outreach. Ranked-only, full profile required.
11.17.4. ✅ **Groups + Group vs Group approved** — own rooms/leaderboard/hot takes. Group Elo. Schema TBD.
11.17.5. ✅ **Bot army platform expansion** — Bluesky (P1, free, all 3 legs), Lemmy (P2), Mastodon (P3). Replaces useless Twitter free tier. Files not yet written.
11.17.6. ✅ **Public profile pages discussed** — shareable URL, mirror-linkable, Google-indexable. Not yet decided.
11.17.7. ⚠️ **Nothing built this session** — all product direction, zero code. Read `THE-COLOSSEUM-SESSION-40-IDEAS.md` for full details.

## 11.18. Session 40b (Mar 5) — OWASP Top 10 Security Audit + Fixes
11.18.1. ✅ **Full OWASP audit** — every SQL file, HTML page, Edge Function, middleware, vercel.json, config. Before: 4 STRONG, 4 MODERATE, 2 WEAK. After: 7 STRONG, 3 MODERATE.
11.18.2. ✅ **A06 fix: SRI hashes** — supabase-js pinned @2.98.0, SHA-384 integrity + crossorigin on 6 HTML files (index, login, plinko, profile-depth, settings_3, auto-debate).
11.18.3. ✅ **A09 fix: Security logging** — colosseum-security-logging.sql (18th migration, 725 lines). security_events table, RAISE LOG in 6 RPCs (create_hot_take, cast_vote, vote_arena_debate, join_debate_queue, update_profile, submit_reference). guard_profile_update() logs privilege escalation. 3 monitoring views.
11.18.4. ✅ **A08 fix: Edge Functions** — ai-sparring + ai-moderator rewritten with Deno.serve (zero deno.land imports). CORS `*` → allowlist.
11.18.5. ✅ **deploy-verify.sh** — 7 security checks on VPS. Blocks deploy on critical failures. Known false positives: settings_3 filename, password HTML input in plinko.
11.18.6. ✅ **Missing log_event() calls found** — cast_vote() and update_profile() weren't wired in Session 34. Fixed. Analytics now 20/20 RPCs.
11.18.7. ✅ **Edge Function paths changed on VPS** — now at supabase/functions/{name}/index.ts. Old paths (colosseum-ai-sparring/, ai-moderator-index.ts) deleted.

## 11.19. Session 41 (Mar 6) — Cloudflare Pages + NT/LM Update
11.19.1. ✅ **bot_activity table confirmed existing** — NT 12.1.8 was stale, table already pasted.
11.19.2. ✅ **Cloudflare Pages project created** — project name `colosseum`, URL colosseum-f30.pages.dev (colosseum.pages.dev was taken). Direct Upload method, not Git-connected.
11.19.3. ✅ **Wrangler authenticated on VPS** — Cloudflare API token (Edit Cloudflare Workers template). Token stored as CLOUDFLARE_API_TOKEN.
11.19.4. ✅ **Test deploy successful** — placeholder "Coming soon" page live at colosseum-f30.pages.dev.
11.19.5. ✅ **Bot army .env updated** — COLOSSEUM_URL=https://colosseum-f30.pages.dev added to VPS .env.
11.19.6. ✅ **Stale Worker deleted** — misty-salad-0c7a (accidental Worker creation) removed from Cloudflare dashboard.
11.19.7. ✅ **Session 40 Ideas + Build Log integrated into NT and Land Mine Map.**

---

# 12. WHAT TO DO NEXT

## 12.1. PENDING HUMAN ACTIONS

### Bot Infrastructure
12.1.1. ⏳ Telegram: talk to @BotFather, create bot, paste token into Vercel env vars, visit /api/telegram-setup
12.1.2. ✅ ~~Discord: create app at discord.com/developers, paste 3 env vars into Vercel, visit /api/discord-setup~~ — DONE Session 34. Bot created, token in VPS .env, Message Content Intent enabled.

### Bot Army Deployment (PARTIALLY COMPLETE — Session 34)
12.1.3. ✅ ~~Buy VPS: DigitalOcean $6/mo droplet (Ubuntu 24.04, NYC1, 1 GB RAM)~~ — DONE Session 34. IP: 161.35.137.21, NYC3.
12.1.4. ✅ ~~SSH into VPS, install Node.js 20 + PM2 + Git + Wrangler CLI~~ — DONE Session 34.
12.1.5. ✅ ~~Upload colosseum-bot-army files + colosseum-mirror generator, npm install~~ — DONE Session 34.
12.1.6. ⏳ Create Reddit bot app (API approval pending for u/Master-Echo-2366), create X/Twitter account
12.1.7. ✅ ~~Copy .env.example to .env, paste all credentials~~ — DONE Session 34. Reddit/Twitter placeholders.
12.1.8. ✅ ~~Paste colosseum-bot-army-schema.sql into Supabase SQL Editor~~ — DONE (confirmed Session 41, table exists).
12.1.9. ✅ ~~Create Cloudflare Pages project (colosseum.pages.dev)~~ — DONE Session 41. Project: `colosseum`, URL: colosseum-f30.pages.dev. Wrangler authenticated on VPS.
12.1.10. ✅ ~~Test DRY_RUN mode for bot army~~ — DONE Session 34. Bot validated, PM2 running, schedules active.

### Legal (NEW — Session 36)
12.1.13. ⏳ Register DMCA agent at copyright.gov/dmca-directory ($6, renew every 3 years)
12.1.14. ⏳ Purchase domain thecolosseum.app (blocks legal emails + mirror URL)
12.1.15. ⏳ Set up email forwards: privacy@, legal@, dmca@ → wolfe8105@gmail.com
12.1.16. ✅ ~~Paste legal snippets from colosseum-legal-snippets.html into all 9 HTML pages + colosseum-arena.js~~ — DONE Session 37. Baked directly into files, no manual paste.
12.1.17. ✅ ~~Upload colosseum-privacy.html to GitHub repo~~ — DONE Session 37.
12.1.18. ✅ ~~Replace colosseum-terms.html in GitHub repo with new version~~ — DONE Session 37.
12.1.19. ✅ ~~Push to main → Vercel auto-deploys~~ — DONE Session 37-38.

### Repo Cleanup (minor)
12.1.11. ⏳ Rename `package_1.json` → `package.json` on GitHub
12.1.12. ⏳ Upload updated bible files to GitHub

## 12.2. NEXT BUILD PRIORITIES
12.2.0. ⏳ **Update Land Mine Map** — add new entries any time a decision bites us or a new mine is discovered. File: `THE-COLOSSEUM-LAND-MINE-MAP.md`
12.2.1. ✅ ~~Build the mirror generator~~ — DONE Session 30 (537 lines, tested)
12.2.2. ✅ ~~Build the Plinko Gate page~~ — DONE Session 30 (4-step signup flow)
12.2.3. ✅ ~~Verify navigator.locks fix~~ — DONE Session 31. noOpLock in createClient, auth.js rebuilt, verified working.
12.2.4. ✅ ~~Strip guest logic from Members Zone~~ — DONE Session 32. 6 files modified: index.html, colosseum-arena.js, colosseum-settings.html, colosseum-profile-depth.html, colosseum-auto-debate.html, colosseum-debate-landing.html. All login.html refs replaced with Plinko. Auth gates added to settings + profile-depth. Auto-debate + debate-landing remain ungated by design.
12.2.5. ✅ ~~Deploy bot army + mirror generator to VPS~~ — Bot army deployed Session 34. Cloudflare Pages project created Session 41. Mirror generator can now deploy via `wrangler pages deploy`. First real mirror deploy pending (generator needs .env with SUPABASE_URL + SUPABASE_ANON_KEY + CLOUDFLARE_API_TOKEN).
12.2.6. ✅ ~~Wire `log_event()` into all existing RPCs~~ — DONE Session 34. 18/18 RPCs wired. colosseum-wire-log-event.sql (16 functions) + colosseum-wire-log-event-rivals.sql (2 functions).
12.2.7. ✅ ~~Build moderator UI~~ — DONE Session 39. Settings toggles, arena picker, evidence form, ruling panel, AI auto-ruling, post-debate scoring.
12.2.8. ⏳ Go live: set DRY_RUN=false on VPS when Reddit approved + Discord bot in servers
12.2.9. Watch what happens — monitor via bot_stats_24h + auto_debate_stats + event_log + `pm2 logs`
12.2.10. Build next thing based on what real users do
12.2.11. ✅ ~~Paste legal snippets into app (footer + AI badges)~~ — DONE Session 37.
12.2.12. ⏳ **Wire mirror generator to live Supabase** — generator needs SUPABASE_URL, SUPABASE_ANON_KEY, CLOUDFLARE_API_TOKEN in .env. Then PM2 cron every 5 min. First real deploy replaces placeholder.
12.2.13. ⏳ **Build Bluesky bot leg** — Priority 1 from Session 40 bot expansion. @atproto/api SDK, all 3 legs. Free API, no approval. Replaces Twitter.
12.2.14. ⏳ **Build Ranked vs Casual mode split** — schema changes (debate mode flag, profile completion check for ranked entry). Arena UI update for mode selection.
12.2.15. ⏳ **Build Groups schema + basic UI** — tables, RPCs, group creation, group debate rooms, group leaderboard. Session 40 approved concept.
12.2.16. ⏳ **Celebrity debate event system** — qualifier bracket, community voting, scheduling. Session 40 approved concept.
12.2.17. ⏳ **Fix deploy-verify.sh false positives** — settings_3 filename mismatch, password input regex in plinko.

## 12.4. REMAINING BOT ARMY TASKS
12.4.1. ⏳ Reddit API approval — check email, then update .env on VPS with client_id/secret/password, set LEG1_REDDIT_ENABLED=true, LEG3_REDDIT_POST_ENABLED=true
12.4.2. ⏳ Invite Discord bot to argument-heavy servers — Discord Developer Portal → OAuth2 → URL Generator → bot scope + Send Messages + Read Messages
12.4.3. ✅ ~~Paste colosseum-bot-army-schema.sql into Supabase (bot_activity table + bot_stats_24h view)~~ — DONE (confirmed Session 41).
12.4.4. ✅ ~~Create Cloudflare Pages project + authenticate wrangler on VPS~~ — DONE Session 41. Project: colosseum (colosseum-f30.pages.dev). API token auth.
12.4.5. ⏳ Set DRY_RUN=false and restart: `pm2 restart all`
12.4.6. ⏳ Optional: create Twitter/X developer account for Leg 2/3 posting (may be replaced by Bluesky — Session 40)
12.4.7. ⏳ Build Bluesky bot files (Session 40 — Priority 1 expansion platform)
12.4.8. ⏳ Build Lemmy bot files (Session 40 — Priority 2 expansion platform)

## 12.3. KNOWN BUGS / TECH DEBT
12.3.1. ✅ ~~Auth race condition~~ — FIXED Session 23
12.3.2. ✅ ~~colosseum-arena.js missing~~ — BUILT Session 24
12.3.3. ✅ ~~AI Sparring uses canned response templates~~ — FIXED Session 25 (real Groq responses)
12.3.4. ✅ ~~Infinite spinner on index.html~~ — FIXED Session 26 (auth timeout + login redirect removed)
12.3.5. ✅ ~~navigator.locks fix~~ — FIXED Session 31 (noOpLock in createClient config)
12.3.6. ✅ ~~Login page may still hang~~ — FIXED Session 37. Await readyPromise before redirect check.
12.3.7. ✅ ~~4 missing SQL files in GitHub~~ — DONE Session 37. wire-log-event, wire-log-event-rivals, bot-army-schema pushed.
12.3.8. ✅ ~~Leaderboard is placeholder-only~~ — FIXED Session 37. Wired to profiles_public, falls back to placeholders.
12.3.9. ✅ ~~Bebas Neue font unresolved~~ — FIXED Session 37. Added to Google Fonts import on index.html.
12.3.10. ✅ ~~advance_round() references non-existent moderator_id column~~ — FIXED Session 33
12.3.11. ✅ ~~Conflicting token pack pricing sets~~ — **RESOLVED Session 35.** Token packs shelved at launch. Free platform model. Code preserved in Stripe sandbox. Conflict is moot until/unless consumer pricing reactivated.
12.3.12. ⏳ Domain purchase for thecolosseum.app — unresolved. **Now blocking legal emails (privacy@, legal@, dmca@) and mirror URL.**
12.3.13. ✅ ~~`log_event()` calls not wired into existing RPCs~~ — DONE Session 34. 18/18 RPCs wired.
12.3.14. ✅ ~~Mirror generator anon key hardcoded~~ — FIXED Session 38. Removed fallback, requires .env or exits.
12.3.15. ✅ ~~Legal snippets not yet pasted into app~~ — DONE Session 37. All 9 HTML pages + arena.js.
12.3.16. ⏳ DMCA agent not registered — $6 at copyright.gov. Blocks safe harbor protection.
12.3.17. ⏳ deploy-verify.sh false positives — expects `colosseum-settings_3.html` but repo has `colosseum-settings.html`. Also false-flags password HTML input in plinko. (Session 40)
12.3.18. ⏳ Stripe Edge Function templates still use deno.land imports — colosseum-stripe-functions.js not yet rewritten with Deno.serve pattern. Deployed version frozen, not urgent. (Session 40)
12.3.19. ⏳ Edge Function CORS allowlist missing mirror domain — colosseum-f30.pages.dev not in allowlist. OK because mirror is pure HTML (no JS calling Edge Functions), but note for future. (Session 41)
12.3.20. ⏳ Cloudflare API token in chat log — rotate token at dash.cloudflare.com/profile/api-tokens when convenient. (Session 41)

---

*This is the New Testament. For all 35 session build logs, the full inventory, revenue details, B2B strategy, education plans, research foundations, and growth strategy — see the Old Testament. For the B2B intelligence play — see the War Chest. For the product design north star — see the Product Vision. For Session 40 product ideas — see THE-COLOSSEUM-SESSION-40-IDEAS.md.*
