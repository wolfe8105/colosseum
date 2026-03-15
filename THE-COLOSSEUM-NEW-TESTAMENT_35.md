# THE COLOSSEUM — NEW TESTAMENT (Project Knowledge Edition)
### Last Updated: Session 114 (March 15, 2026)

> **This is the condensed NT for Claude Project Knowledge.** It loads automatically every session.
> Build logs live in the Old Testament. Land Mine Map stays in the repo — pull only when doing schema/auth/deployment work.
> Session handoffs go in the chat message, not this file.
>
> **Other bible docs (repo, read when relevant):**
> - `THE-COLOSSEUM-OLD-TESTAMENT.md` — All session build logs (1-62), 502+ item inventory, revenue model, B2B data play, growth strategy
> - `THE-COLOSSEUM-LAND-MINE-MAP.md` — 169+ documented pitfalls, failure modes, fixes. **Read before any SQL, schema, auth, or deployment change.**
> - `THE-COLOSSEUM-WAR-CHEST.md` — B2B intelligence play, auction model, pricing tiers, exclusivity framework, buyer list
> - `THE-COLOSSEUM-PRODUCT-VISION.md` — Psychology framework, visual game layer, sound-off solution, ad placement, gamification
> - `THE-COLOSSEUM-WAR-PLAN.md` — 5-phase strategy, shelved ideas, open decisions
> - `THE-COLOSSEUM-IDEAS-MASTER-MAP.docx` — Raw inventory of every unbuilt idea, organized by structural impact (Session 100)
> - `TOKEN-STAKING-POWERUP-PLAN.docx` — Token prediction staking + power-up shop implementation plan with questionnaire tier gate (Session 108)
> - `COLOSSEUM-FEATURE-ROOM-MAP.md` — Every idea placed into existing 6-chart architecture + 7 new rooms identified (Session 106)
> - `CLAUDE.md` — Claude Code guidance file (security rules, file conventions, architecture)

---

# 1. WHAT THIS IS

- Live audio debate platform / emergence engine
- Users hang out in themed sections, post hot takes, react, debates emerge from disagreements
- Four core mechanics: Post → React → Challenge → Structure appears
- Revenue: free platform → B2B data licensing + structural ad inventory. Consumer subs/tokens shelved at launch.
- Philosophy: digital third place — not a destination, a place you're already in
- Name: **The Colosseum** (locked)
- Owner: solo founder, no team, no money yet, no deadline

---

# 2. FOUNDER CONSTRAINTS

- Full-time engineering job (new job, no leverage yet)
- Two children under age 10, no spouse/family/friend assistance
- No personal network, no social media accounts
- Android phone, ~1 hour free per day, ~$100/month budget
- **All growth must be fully automated with zero human involvement**

---

# 3. GUIDING PRINCIPLES

- **Temporary functional placeholders** — never block on human action
- **Slow down, suggest, wait** — present 2-4 options, Pat picks
- **Small chunks with downloads** — work in pieces, pause, ask what's next
- **Full file replacement over patches** — always produce complete files, never diffs
- **Verify before claiming done** — confirm it's actually there
- **Zero founder marketing time** — all growth is bot-driven
- **Keep it simple** — plain steps, one thing at a time, no jargon

---

# 4. KEY DECISIONS

- Target male opinion culture 16-65, mobile-forward
- Real-dollar tipping replaces token microtransactions
- Profile Depth System: 12 sections, 157 Qs, mixed rewards, free at launch
- Async debate mode is survival-critical (liquidity problem)
- Predictions = core engagement loop
- Spoke carousel (6 tiles, hollow center, 18° tilt, thumb-spin)
- Visual: Cinzel + Barlow Condensed, diagonal gradient, dark frosted glass cards, navy/red/white/gold
- Login: OAuth dominant, email collapsed behind toggle
- All table writes locked behind server functions — client JS uses `supabase.rpc()` for all mutations
- Bot-driven growth: fully automated 24/7 bot army, $6-16/mo actual cost
- Groq free tier for AI: Llama 3.3 70B versatile (`llama-3.1-70b` is decommissioned)
- Leg 3: Auto-Debate Rage-Click Engine — AI generates full debates, scores lopsided, posts rage-bait
- Controversial scoring IS the marketing — AI deliberately picks the unpopular winner
- `react_hot_take()` is a toggle function — single RPC for add/remove
- Guest access is default — anonymous users see the full app, auth only for actions
- Auth init: `onAuthStateChange INITIAL_SESSION` is sole init path. `noOpLock` in `createClient`. 5s safety timeout.
- Three-zone architecture: Static Mirror (Cloudflare Pages) + Plinko Gate (login/signup) + Members Zone (Vercel)
- Arena supports 4 debate modes: Live Audio, Voice Memo (async), Text Battle, AI Sparring
- AI Sparring is instant-start — always-available opponent for cold-start liquidity
- Ranked vs Casual: Casual = open, no profile, Elo frozen. Ranked = 25%+ profile, Elo moves.
- Groups + Group vs Group: schema, UI, Group Elo all built and wired
- Public profile pages: `/u/username` via Vercel serverless, dynamic OG tags, Google-indexable
- Funnel analytics: `colosseum-analytics.js` (visitor UUID, auto page_view, referrer/UTM capture, signup detection)
- Tokens are **earned only, never purchased** — displayed as prestige signal, not currency
- Content-first bot strategy: native image posts with ESPN-style share cards stop the scroll; text+link spam is dead

### Open Decisions
- Launch date: what's real?
- Domain: thecolosseum.app or keep current URLs?

---

# 5. THREE CORE PROBLEMS

1. **Money pipe connected** — Stripe Checkout live (sandbox), Edge Functions deployed, webhooks listening. Still sandbox mode.
2. **Single-player → multiplayer (in progress)** — follows, modals, predictions, rivals, arena, 4 debate modes, AI sparring, guest access. Needs real users.
3. **No audience** — Bot army deployed, DRY_RUN=false. Bluesky image posting LIVE and verified (Session 92). Bluesky profile branded ("The Colosseum" display name + bio, Session 94). Leg 2 links → category pages, Leg 3 links → individual debate pages (Session 94). Lemmy DEAD (files deleted from repo). Reddit pending API approval (submitted March 4). Discord deferred. **Session 98 finding: Cloudflare Web Analytics confirmed ZERO visits to mirror. Root cause: 0 Bluesky followers + Leg 1 was disabled = all posts going unseen. Leg 1 Bluesky now ENABLED (10 replies/day to trending arguments). Audience building starts now.**

---

# 6. ARCHITECTURE — CASTLE RING MODEL

- Ring 6 — Public Surface: Static Mirror on Cloudflare Pages, pure HTML, zero JS, zero auth
- Ring 5 — User Interaction: live debates, spectator chat, voting, hot takes, reactions, arena
- Ring 4 — Accounts & Trust: auth, profiles, trust scores, cosmetics, achievements
- Ring 3 — Platform Data: recordings, transcripts, Elo, sanitize, rate_limits, 30+ SECURITY DEFINER functions — **COMPLETE**
- Ring 2 — Financial Core: Stripe, subs, token ledger — CORS hardened
- Ring 1 — B2B Intelligence: aggregated sentiment, API-gated — NOT STARTED
- The Keep — Physical Gate: air-gapped backups, YubiKey — NOT STARTED

---

# 7. WHAT ACTUALLY EXISTS

## Infrastructure Summary
Supabase (faomczmipsccwbhpivmp): 36 tables, RLS hardened, 48+ server functions, sanitization, rate limits, 9 analytics views, 3 security views, 20 RPCs wired to log_event(). Token system Phase 3 complete (milestones, streak freezes, token display, gold coin animation). Landing page vote persistence live (landing_votes + fingerprint dedup + 2 anon RPCs, Session 107). Auto-debate staking backend live (auto_debate_stakes + 4 RPCs, Session 99). Vercel (colosseum-six.vercel.app): auto-deploys from GitHub, 1 serverless function (profile pages). Stripe sandbox: 7 products, Edge Functions, webhooks. Auth working end-to-end. Resend SMTP configured. Security audit FULLY COMPLETE (Sessions A-D + Session 92 Claude Code audit: 120+ issues found across 43 files, 29 critical fixes shipped). Bot army deployed to VPS (DigitalOcean $6/mo, Ubuntu 24.04, NYC3, IP 161.35.137.21), PM2 managed, DRY_RUN=false LIVE. Content-first upgrade: ESPN-style share card generation (card-generator.js) + Bluesky image posting LIVE (leg2-bluesky-poster.js v2, verified Session 92). Mirror generator live (5-min cron, 50+ pages/build, deploys to colosseum-f30.pages.dev, Cloudflare Web Analytics on all pages Session 96, mirror generator path fixed Session 96). Arena fully built (4 modes). AI Sparring live (Groq). Moderator UI fully built. Reference/evidence system live. Analytics layer live. Funnel analytics live (mirror + app). Legal docs live (Privacy Policy + Terms). Groups feature live (including group hot take composer, Session 105). Ranked/Casual mode live. Public profile pages live. OWASP audit complete (7/10 STRONG). SRI hashes on 6 HTML files. Edge Functions hardened (Deno.serve, CORS allowlist). Draw.io dead end audit: all 5 flagged dead ends resolved (Sessions 102-107).

## Toolchain
| Tool | Purpose |
|------|---------|
| Claude (chat sessions) | Primary build partner, architecture, full-file code generation, bible maintenance |
| Claude Code (CLI) | Codebase-wide audits, bulk automated fixes, PR generation (added Session 92) |
| GitHub web UI | File deployment (drag-and-drop upload), PR merges |
| Supabase dashboard | Schema source of truth, SQL execution, RLS management |
| DigitalOcean VPS | Bot army hosting, mirror generator, PM2 process management |
| Vercel | Frontend hosting, auto-deploy from GitHub |
| Cloudflare Pages | Static mirror hosting |

## Core JS Modules (all use window.X global pattern)
| File | Purpose |
|------|---------|
| colosseum-config.js | Central config, credentials, feature flags (v2.2.0), escapeHTML(), showToast(), friendlyError() |
| colosseum-auth.js | Auth, profile CRUD, follows, rivals, moderator RPCs, safeRpc(). noOpLock + INITIAL_SESSION. |
| colosseum-payments.js | Stripe Checkout, token purchases, sub upgrades |
| colosseum-notifications.js | Notification center, mark read via rpc() |
| colosseum-paywall.js | 4 contextual paywall variants, gate() helper |
| colosseum-async.js | Hot takes feed, predictions, rivals display, react toggle, challenge modal, challenge→arena wiring (E83, Session 97) |
| colosseum-share.js | Web Share API, clipboard, referrals, deep links |
| colosseum-leaderboard.js | Elo/Wins/Streak tabs, time filters, My Rank |
| colosseum-cards.js | Canvas share card generator, 4 sizes, ESPN aesthetic |
| colosseum-arena.js | Arena: lobby, 4 modes, matchmaking, debate room, post-debate (rival/opponent profile wired E144/E145/E149, Session 97). AI sparring, moderator UX, ranked/casual. |
| colosseum-home.js | Home screen logic |
| colosseum-scoring.js | Elo, XP, leveling (SELECT reads only) |
| colosseum-tokens.js | Token economy: milestones (13 events), streak freeze mechanic, daily login, token display, gold coin fly-up animation |
| colosseum-webrtc.js | WebRTC audio via Supabase Realtime channels |
| colosseum-voicememo.js | Voice memo mode, voice takes via rpc() |
| colosseum-analytics.js | Funnel analytics: visitor UUID, auto page_view, referrer/UTM, signup detection |
| colosseum-mirror-generator.js | Static mirror SSG on VPS → Cloudflare Pages every 5 min |

## HTML Pages
| File | Purpose |
|------|---------|
| index.html | Spoke carousel home, category overlays, pull-to-refresh, activity indicators |
| colosseum-login.html | OAuth-dominant login, age gate, password reset |
| colosseum-settings.html | All settings toggles incl. moderator, account mgmt, bio edit (160 char, Session 105) |
| colosseum-profile-depth.html | 12 sections, 147 Qs, saves to DB via safeRpc |
| colosseum-terms.html | Terms of Service |
| colosseum-privacy.html | Privacy Policy |
| colosseum-debate-landing.html | Ungated landing, vote without signup, OG tags, backend vote persistence via landing_votes table + fingerprint dedup (Session 107), category pills link to /?cat=slug |
| colosseum-auto-debate.html | AI vs AI debate page, ungated voting, rage-click funnel, More Debates discovery section (E279/E280, Session 97) |
| colosseum-plinko.html | Plinko Gate — 4-step signup (OAuth → Age → Username → Done) |
| colosseum-groups.html | Groups: discover, my groups, rankings, detail view, hot takes, group hot take composer (Session 105) |

## Database: 25 SQL migrations, 36 tables, 48+ server functions
## Supabase Edge Functions: ai-sparring, ai-moderator, stripe-* (templates)
## Vercel Serverless: api/profile.js (public profile pages)
## Bot Army: 17+ files, ~3,200+ lines, DigitalOcean VPS, PM2 managed
## VPS Bot Files (not on GitHub):
- card-generator.js — Server-side ESPN share card PNG generator (canvas npm)
- leg2-bluesky-poster.js (v2) — Image-first Bluesky posting with uploadBlob()
- ai-generator.js — Auto-debate AI content generation + template fallback (125 combos/side)
- supabase-client.js — Bot Supabase client + CATEGORY_TO_SLUG mapping
- category-classifier.js — Keyword-based headline→category router (Session 98, fixes 60% "general" misrouting)

## Legal Compliance
Privacy Policy live. Terms of Service live. AI content labeling deployed. DMCA agent NOT registered. Legal emails NOT created (need domain).

---

# 8. PRODUCT PHILOSOPHY

- **Emergence Engine** — not a debate app, a social system where debates emerge
- **Third Place Theory** — the bar, not the arena. Presence over sessions.
- **Spectators Are the Product** — design for the 90% who watch
- **Casual Is King** — protected lobbies, no sharks in casual waters
- **Reciprocal Gating** — can't unlock cosmetic until profile section complete
- **Liquidity Problem** — text async, voice memo, AI sparring solve cold-start

---

# 9. DESIGN DNA

- Fox News chyron energy + ESPN stat cards + gladiator gold
- Palette: navy, red, white, GOLD
- Fonts: Cinzel (display) + Barlow Condensed (body)
- Background: diagonal gradient (#1a2d4a → #2d5a8e → #5b8abf → #7aa3d4 → #3d5a80)
- Cards: dark frosted glass (rgba(10,17,40,0.6)) + backdrop-filter blur
- Mobile-forward: phone default, 44px touch targets, scroll-snap
- Topic tiers: Tier 1 Politics + Sports, Tier 2 Entertainment + Couples Court, Tier 3 Music/Movies/Cars

---

# 10. BOT-DRIVEN GROWTH

- Three-leg architecture: Leg 1 (Reactive), Leg 2 (Proactive), Leg 3 (Auto-Debate Rage-Click)
- **Content-first strategy (Session 77):** Native image posts with ESPN-style share cards. Text+bare-URL link spam is dead — Bluesky and all modern platforms punish it. Share cards stop the scroll.
- Daily capacity: ~370 L1 mentions, 5-10 L2 posts, 3 L3 auto-debates (reduced from 6, Session 94 — improves AI quality vs template fallback)
- Combined daily reach: ~6,000-40,000+ impressions
- Actual monthly cost: $6-16/mo
- Bot army LIVE (DRY_RUN=false).
- All bot links → colosseum-f30.pages.dev (mirror), not Vercel app.
- **Leg 2 links → category pages** (e.g. /category/sports.html). Category-to-slug mapping handles `couples` → `couples-court` mismatch (Session 94).
- **Leg 3 links → individual debate pages** (e.g. /debate/{id}.html). Already correct pre-Session 94.
- Platforms: Bluesky (image posting LIVE, profile branded as "The Colosseum" with bio, Session 94; **Leg 1 reactive replies ENABLED Session 98** — 10 replies/day to trending argument posts), Lemmy (DEAD — files deleted from repo, ecosystem.config.js cleaned Session 94), Reddit (pending API approval since March 4), Discord (deferred).
- **Session 98 finding:** Cloudflare Web Analytics confirmed zero visits. Bluesky account (`wolfe8105.bsky.social`) has 0 followers. Leg 1 was disabled so nobody discovered the account. Leg 1 now on — only audience-building mechanism running. Expect slow organic growth (2-4 weeks to meaningful follower count).
- Groq TPD cap (100k tokens/day free tier) hits daily — falls back to 10 diverse headline-aware templates (Session 95, replaced repetitive openers).

---

# 11. WHAT TO DO NEXT

## Pat Action Items
- ⏳ **Make GitHub repo private** (Settings → Danger Zone → Change visibility) — PII is hardcoded throughout
- ⏳ Reddit API approval — check email, update .env, enable Reddit legs (submitted March 4, 10+ days)
- ⏳ Register DMCA agent at copyright.gov ($6)
- ⏳ Purchase domain thecolosseum.app

## Prioritized Roadmap

### Tier 1 — Must Do Before Any Public Exposure
- ⏳ **PII scrub** — hardcoded email, name, user ID throughout codebase. Must move to env vars before repo goes public or any real users arrive.
- ⏳ **Content guardrails** — extreme debate framings ("Republicans VS Nazis") risk Bluesky account bans. AI generator needs topic filtering.

### Tier 2 — High-Impact Features (Next Build Work)
- ⏳ **Token prediction staking + power-up shop** — full plan in `TOKEN-STAKING-POWERUP-PLAN.docx` (Session 108). Parimutuel staking, 4 power-ups, 5-tier questionnaire gate. 6-phase implementation order defined.
- ⏳ **Prediction UI** — completely missing (no UI, no RPC)
- ⏳ **Mirror More Debates section** — static mirror debate pages are still dead ends (Vercel auto-debate page has it, mirror doesn't)
- ⏳ **Remaining unwired edges (28)** — all unbuilt features: GvG (E212/E215), Create Prediction (E90), DMs, tournaments, marketplace. See Feature Room Map for full list.
- ✅ **Dead end fixes COMPLETE** (Sessions 102-107) — category pills, leaderboard rows, debate-landing vote persistence, auto-debate discovery loop, profile navigation. All 5 draw.io flagged dead ends resolved.

### Tier 3 — Future Features (See Ideas Master Map)
- Spectator features (audience pulse, chat, live share)
- Voice memo UX + keyboard handling
- Reference Arsenal system
- Tournament brackets
- DM system

## Known Bugs / Tech Debt
- ⏳ Stripe Edge Function templates use old imports (not urgent, deploy when Stripe goes live)
- ⏳ Edge Function CORS allowlist missing mirror domain (OK since mirror is pure HTML)
- ⏳ 3 older RLS policies still have {public} scope (low priority)
- ⏳ VPS-only bot files not in repo: bot-engine.js, ai-generator.js, supabase-client.js, card-generator.js, category-classifier.js (backups exist on VPS)

## Monitoring
- Leg 1 Bluesky — `pm2 logs` for `[LEG1][BLUESKY]`, watch follower count on `wolfe8105.bsky.social`
- Cloudflare Web Analytics — check for real visits
- Groq fallback quality — living with template fallback for now (Session 97 decision)
- Bot stats: `bot_stats_24h` + `auto_debate_stats` + `event_log` + `pm2 logs`

## Bot Army Status: COMPLETE ✅
- Fully operational and autonomous. No more bot build work.
- ⏳ Reddit API approval → update .env → enable Reddit legs (5-min task when email arrives)
- ⏳ Optional: Twitter/X developer account

---

# 12. CRITICAL TECHNICAL NOTES

These are the things that bite hardest. Full details in the Land Mine Map.

- **Single canonical debate table: `arena_debates`** — legacy `debates` table eliminated in Session 101. All debate RPCs use `arena_debates` only.
- **guard_profile_columns trigger** protects 21 columns: elo_rating, wins, losses, draws, current_streak, best_streak, debates_completed, level, xp, token_balance, subscription_tier, stripe_customer_id, stripe_subscription_id, trust_score, profile_depth_pct, is_minor, created_at, mod_rating, mod_debates_total, mod_rulings_total, mod_approval_pct. Silently reverts direct UPDATEs on these columns for non-service roles. Disable trigger before manual updates, re-enable after.
- **All mutations go through `.rpc()` calls** — never direct INSERT/UPDATE from client
- **Supabase dashboard is schema source of truth** — verify column names before assuming
- **`navigator.locks` orphan bug** — Supabase JS client can hang `getSession()` indefinitely. noOpLock mock must load before Supabase CDN.
- **Auth uses `readyPromise` pattern** — never setTimeout for async state. INITIAL_SESSION is sole init path.
- **Cloudflare Pages requires `--branch=production`** for production deploys; `--branch=main` routes to Preview
- **`wrangler login` fails on headless VPS** — use API token approach
- **Stripe webhook body must be read with `req.text()`** to preserve raw body for HMAC verification
- **VPS `.env` edits require `pm2 restart all`** to take effect
- **`auto_allow_expired_references()` return type mismatch** — run `DROP FUNCTION` before `CREATE OR REPLACE`
- **SRI hashes pin supabase-js to @2.98.0** — must regenerate when upgrading
- **Groq model is `llama-3.3-70b-versatile`** — `llama-3.1-70b-versatile` is decommissioned
- **Supabase API keys**: bot army and mirror use legacy JWT format (eyJ...), not new sb_secret_* format
- **Windows download cache** can cause stale scp uploads — always check `dir $env:USERPROFILE\Downloads\filename*` and use the latest numbered copy (e.g. `supabase-client_2.js` not `supabase-client.js`)
- **Bot platform wiring requires THREE updates** (LM-149): config object + flags block in bot-config.js + formatFlags() in bot-engine.js. Missing any one = silent failure. Session 95 found VPS had Bluesky patches (from setup script) but GitHub didn't — always verify BOTH copies match.
- **VPS file copies**: always use `\cp` (backslash prefix) to bypass `cp -i` alias. Always verify with grep after copy.
- **escapeHTML consolidated** (Session 92): single `escHtml()` in colosseum-config.js is the canonical implementation. Do not duplicate in other modules.
- **ecosystem.config.js env block overrides .env** — platform flags in the PM2 config will override the same flags in `.env`. Session 94 stripped all platform flags from ecosystem.config.js so `.env` is the single source of truth.
- **Bot category → mirror slug mapping** — bot uses `couples`, mirror uses `couples-court`. Mapping in `supabase-client.js` CATEGORY_TO_SLUG handles this (Session 94).
- **Mirror generator path** — file lives at `/opt/colosseum/colosseum-mirror-generator.js` (NOT inside bot-army dir). Cron sources `/opt/colosseum/mirror.env`. Updating the bot-army copy of this file does nothing.
- **Post-debate opponentId** — `check_queue_status` RPC does not currently return `opponent_id`. Arena captures it from match data but the field is always null until the RPC is updated. Rival button and opponent profile click degrade gracefully (hidden when null).
- **Bluesky handle is `wolfe8105.bsky.social`** — display name "The Colosseum". Profile search API shows 0 posts (Bluesky counter bug) but posts exist in the feed. Account had 0 followers as of Session 98.
- **Category classifier** — `lib/category-classifier.js` on VPS. Uses word-boundary regex for short keywords (≤4 chars) to prevent false positives like "social" matching "cia". Wired into `ai-generator.js` line 1 via require, replaces hardcoded `category: 'general'` in `fallbackAutoDebateSetup()`.
- **Landing page vote persistence (Session 107)** — `landing_votes` table (id, topic_slug, side, fingerprint, created_at) with unique index on (topic_slug, fingerprint) for dedup. RLS enabled, no policies (RPC-only). Two SECURITY DEFINER RPCs: `cast_landing_vote(p_topic_slug, p_side, p_fingerprint)` and `get_landing_vote_counts(p_topic_slug)`. Both granted to `anon` role. Uses `getFingerprint()` from Session 103 for anonymous dedup. Fallback to hardcoded placeholders for topics with no real votes.
- **Token staking & power-up plan (Session 108)** — Full implementation plan in `TOKEN-STAKING-POWERUP-PLAN.docx`. New tables: `stakes`, `power_up_inventory`. New column on `profiles`: `questions_answered` (integer, default 0). 5-tier questionnaire gate controls stake caps and power-up slots. `guard_profile_columns` must be updated to protect `questions_answered` before Phase 1 ships. `resolve_stakes` RPC is service-role only.

---

# 13. SESSION 92 AUDIT SUMMARY

Full codebase audit via Claude Code CLI. 120+ issues found across 43 files. 29 critical fixes shipped in one PR (21 files, +250/-735 lines, net 485 lines deleted).

**Security (9 fixes):** escapeHTML consolidated and applied to all innerHTML paths, XSS vectors closed, open redirect blocked, UUID validation added to .or() filters.

**Bugs (9 fixes):** readyPromise hang on missing auth resolved, random ranked winner bug fixed, prediction math corrected, placeholder text in production removed.

**Performance (4 fixes):** Stripe.js and home.js removed from index.html (not needed there), font loading optimized, notification init deferred.

**Dead code (4 cleanups):** Lemmy files deleted from repo, dead feature flags removed, token purchase packages removed (tokens are earn-only).

**Quality (3 fixes):** escHtml consolidated to single source, console.logs stripped, Number() casts applied to all numeric innerHTML.

---

# 14. SESSIONS 93-94 SUMMARY

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

# 15. SESSION 95 SUMMARY

**Bot army final fixes — bot work is DONE.**

1. **bot-config.js Bluesky wiring synced to GitHub** (LM-149 pattern). The VPS copy had been patched by `setup-bluesky.js` back in Session 42, so Bluesky image posting was already working on the live bot. But the GitHub repo copy was missing the `bluesky:` config section, the three Bluesky flags (`leg1Bluesky`, `leg2Bluesky`, `leg3BlueskyPost`), and the Bluesky credential validation. If the VPS ever refreshed from GitHub, Bluesky would have silently broken. Now synced.
2. **Repetitive fallback openers fixed.** `fallbackHotTake()` in `ai-generator.js` had 5 templates where 4 were generic filler with no headline context. Replaced with 10 diverse templates — all incorporate the actual headline, all sound distinct. Deployed to VPS.
3. **maxPerDay default updated** in bot-config.js from 6→3 (matching Session 94 .env change, so the code default now matches).

**Bot army is now fully autonomous.** No more bot build work. Only remaining bot action: flip Reddit flag in `.env` when API approval arrives.

**Files changed:**
- `bot-config.js` — Bluesky config section + flags + validation added, maxPerDay default 6→3 (GitHub + VPS)
- `ai-generator.js` — 10 headline-aware fallback hot take templates (VPS only)

---

# 16. SESSIONS 96-97 SUMMARY

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

# 17. SESSION 98 SUMMARY

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

# 18. SESSION 100 SUMMARY

**Ideas Master Map + Debate Table Consolidation Plan.**

1. **Ideas Master Map created** — `THE-COLOSSEUM-IDEAS-MASTER-MAP.docx` in repo. Every unbuilt idea from NT, OT, Session 40, Product Vision, War Chest, War Plan, and Reference Arsenal Blueprint. Organized by structural impact: Part 1 = cross-cutting systems (6 systems touching 3+ sections), Part 2 = contained features by section. Nothing prioritized, nothing cut — raw inventory.
2. **Debate table consolidation identified** — Three parallel debate tables exist: `debates` (legacy), `arena_debates` (active), `async_debates` (separate system). Legacy `debates` table has 5 FK dependents (debate_votes, predictions, reports, debate_references, moderator_scores). 8 RPCs in wire-log-event.sql + 3 in move3 still reference `public.debates`. 2 direct client queries in colosseum-scoring.js (castle defense violations). `winner` column type mismatch: legacy uses UUID, arena uses TEXT.
3. **Consolidation plan written** — `DEBATE-TABLE-CONSOLIDATION-PLAN.md` in repo. 12-step execution plan for Claude Code. Steps 1-3 + 12 = SQL in Supabase Editor (Pat). Steps 4-11 = file changes (Claude Code). Target: single canonical table `arena_debates`.
4. **New feature idea (not in Ideas Master Map):** AI-generated post-debate summary — who won the crowd, what references landed, turning point. Content for mirror pages, replays, SEO.

**Files added to repo:**
- `THE-COLOSSEUM-IDEAS-MASTER-MAP.docx`
- `DEBATE-TABLE-CONSOLIDATION-PLAN.md`

---

# 19. SESSION 101 — DEBATE TABLE CONSOLIDATION

**Goal:** Eliminate legacy `debates` table. Single canonical table: `arena_debates`.

**Execution order:**
1. Pat runs SQL Steps 1-3 in Supabase (expand schema, migrate data, re-point FKs)
2. Claude Code runs Steps 4-11 (file changes, commit, push)
3. Verify Vercel deploy works
4. Pat runs SQL Step 12 (DROP TABLE)

**Status:** Complete. Legacy `debates` table dropped. All post-success NT updates applied (Session 102).

---

# 20. SESSION 102 — DEAD END FIXES + HOUSEKEEPING

**Goal:** Fix every dead-end navigation path that bot traffic hits, fix bugs, clean up repo.

**Via Claude Code — 3 commits pushed:**

1. **Leaderboard rows** — `data-username` + event delegation → `/u/username` profile navigation
2. **Auto-debate page** — profile navigation already wired; "More Debates" discovery loop already existed
3. **Debate-landing category pill** — dead `<div>` → clickable `<a>` linking back to main app
4. **Groups member rows** — `data-username` + event delegation → `/u/username`
5. **Hot take avatars** — navigate to `/u/username` instead of modal
6. **Rival avatars** — same pattern, `data-username` for profile nav
7. **Hot take share button** — apostrophe in topic text broke `onclick` attribute (XSS-adjacent)
8. **guard_profile_columns trigger** — verified protecting all 21 columns including 4 mod columns
9. **GitHub cleanup** — deleted stray UUID HTML file, `DEBATE-TABLE-CONSOLIDATION-PLAN.md`, `session-102-guard-trigger-verify.sql` committed for audit trail

**Files changed:** `colosseum-leaderboard.js`, `colosseum-async.js`, `colosseum-debate-landing.html`, `colosseum-groups.html`, `CLAUDE.md`, `THE-COLOSSEUM-NEW-TESTAMENT.md`

---

# 21. SESSION 103 — DEBATE-LANDING BACKEND PERSISTENCE

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

# 22. SESSION 103 — DOC CLEANUP

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

# 23. SESSION 104 — EDGE MAP AUDIT + DEBATE-LANDING PERSISTENCE

**Goal:** Fix dead ends that bot traffic hits, audit full unwired edge inventory.

1. **Auto-debate category pill fix** — href changed from `/colosseum-plinko.html` to `/` (home). Pushed to GitHub.
2. **Edge map update** — 8 edges marked WIRED (E173, E213, E217, E276, E277, E306, E320, E327). 3 stale (E279, E280, E308). UNWIRED count: 41→30 real gaps.
3. **Debate-landing backend persistence rewrite** — Supabase SDK wired, `castVote()` calls `cast_landing_vote` RPC, `loadBackendCounts()` fetches real counts on load. Optimistic render + `voteCounted` flag.
4. **Bug catch** — two field name mismatches (`a/b` vs `yes/no`, `yes_count` vs `yes_votes`), fixed and delivered corrected file.
5. **Full ranked UNWIRED edge inventory** — 30 real gaps organized into 3 tiers by impact.

**Files changed:** `colosseum-debate-landing.html`, `colosseum-auto-debate.html`

---

# 24. SESSION 105 — WIRABLE EDGES COMPLETE

**Goal:** Wire every remaining edge that doesn't require new feature development.

1. **Full re-audit** of all 30 unwired edges against live code — confirmed most were already wired in Sessions 102-104.
2. **E211 wired** — Group hot take posting. Composer UI (textarea + POST button) injected at top of hot takes tab, auth-gated, calls existing `create_hot_take` RPC with `p_section: groupId`.
3. **E246 wired** — Settings bio edit. Bio textarea added between Username and Email rows, 160 char max with live counter.

**Updated edge inventory:** 30 → 28 unwired. All 28 remaining are unbuilt features, not broken wiring.

**Files changed:** `colosseum-groups.html`, `colosseum-settings.html`

---

# 25. SESSION 106 — FEATURE ROOM MAP

**Goal:** Place every idea from the Ideas Master Map (~90 items) into the existing 6-chart edge map architecture.

1. **Feature Room Map created** — `COLOSSEUM-FEATURE-ROOM-MAP.md` in repo.
2. **6 existing rooms** (Charts 1-6) absorb ~45 new features as furniture.
3. **7 new rooms** identified: Reference Library (A), Token Staking (B), Marketplace (C), DM Inbox (D), Tournaments (E), Notifications Hub (F), B2B Dashboard/API (G).
4. **~14 homeless features** placed with best guesses.
5. **Reference Library (New A)** is the most connected new room — spine of the reference economy.
6. **Token Staking (New B)** is the highest-impact missing feature per the Ideas Master Map.

**No code shipped. No SQL. Planning session only.**

---

# 26. SESSION 107 — DEAD END FIXES COMPLETE

**Goal:** Close all 5 draw.io flagged dead ends.

1. **Category pill fix** — debate-landing.html and auto-debate.html pills now link to `/?cat=slug`. Added `?cat=` query param handler in index.html.
2. **debate-landing.html vote persistence** — created `landing_votes` table with fingerprint dedup, two SECURITY DEFINER RPCs (`cast_landing_vote`, `get_landing_vote_counts`), RLS enabled with no policies.
3. **Verified three other flagged dead ends are non-issues** — leaderboard rows already wired, auto-debate discovery loop already built, profile navigation not applicable on landing pages.

**All five draw.io dead ends resolved.**

**New Supabase objects:** Table `landing_votes`, index `idx_landing_votes_dedup`, RPCs `cast_landing_vote` and `get_landing_vote_counts`.

**Files changed:** `colosseum-debate-landing.html`, `colosseum-auto-debate.html`, `index.html`

---

# 27. SESSION 108 — TOKEN STAKING & POWER-UP PLAN

**Goal:** Design the complete token spend loop — staking + power-ups + questionnaire gate.

1. **Full plan document created** — `TOKEN-STAKING-POWERUP-PLAN.docx` in repo.
2. **Design decisions locked:** Parimutuel pool split, pre-debate only, debaters can self-stake, free-form amounts, all 4 power-ups at launch (2x Multiplier, Silence, Shield, Reveal), slots gated by questionnaire tier.
3. **5-tier questionnaire gate:** Tier 1 (10 Qs, 5 token max, 0 slots) → Tier 5 (100 Qs, unlimited staking, 4 slots, all power-ups).
4. **6-phase implementation order:** Phase 1 questionnaire foundation → Phase 2 staking backend → Phase 3 staking frontend → Phase 4 power-up backend → Phase 5 power-up frontend → Phase 6 polish.
5. **Database schemas defined:** `stakes` table, `power_up_inventory` table, `questions_answered` column on profiles.
6. **Castle defense compliant:** All writes through SECURITY DEFINER RPCs, `resolve_stakes` service-role only, `questions_answered` must be added to `guard_profile_columns` trigger.

**No code shipped. No SQL. Planning session only.**

*For all session build logs, the full inventory, revenue details, B2B strategy — see the Old Testament. For the B2B intelligence play — see the War Chest. For the product design north star — see the Product Vision. For documented pitfalls — see the Land Mine Map (clone repo first).*

# 28. SESSION 109 — TOKEN STAKING PHASE 2 (BACKEND)

**Goal:** Build the staking backend from TOKEN-STAKING-POWERUP-PLAN.docx Phase 2.

1. **SQL migration** — `stakes` table, `stake_pools` table, 3 SECURITY DEFINER RPCs: `place_stake`, `get_stake_pool`, `settle_stakes`. Parimutuel pool model. Pre-debate only. Rate-limited.
2. **colosseum-staking.js** — NEW module. `getPool()`, `renderStakingPanel()`, `wireStakingPanel()`, `settleStakes()`. Renders staking UI with token input, side picker, pool visualization.
3. **colosseum-arena.js** — Pre-debate screen added (`showPreDebate()`). Loads staking panel between matchmaking and room entry. Staking settlement wired into `endCurrentDebate()`.

**Files changed:** `colosseum-staking.js` (new), `colosseum-arena.js`, SQL migration

---

# 29. SESSION 110 — POWER-UPS FRONTEND (PHASE 5)

**Goal:** Build the power-up frontend from TOKEN-STAKING-POWERUP-PLAN.docx Phase 5.

1. **colosseum-powerups.js** — NEW module. 4 power-ups: 2x Multiplier (passive), Silence (10s mute), Shield (block reference challenge), Reveal (see opponent loadout). Inventory management, equip/unequip, activation handlers.
2. **Pre-debate loadout** — Power-up loadout panel renders in pre-debate screen. Equip from inventory before entering room.
3. **In-debate activation bar** — Horizontal bar above message stream. Tap to activate Silence/Shield/Reveal. Visual effects: silence countdown overlay, shield indicator badge, reveal popup showing opponent's equipped items.
4. **Power-up state cleanup** — `activatedPowerUps` Set, `shieldActive` flag, `silenceTimer` ref. All cleaned up in `renderLobby()` and `endCurrentDebate()`.
5. **Staking settlement with multiplier** — `settleStakes()` accepts multiplier parameter. 2x Multiplier power-up doubles staking payout on win.

**Files changed:** `colosseum-powerups.js` (new), `colosseum-arena.js`

---

# 30. SESSION 111 — BUG QUEST BATCH + DISCORD KILLED

**Goal:** Continue bug audit, kill dead channels.

1. **3 bugs fixed** — Score: 21/36 → 24/36.
2. **Discord killed permanently** — `LEG1_DISCORD_ENABLED` hardcoded to `false` in bot-config.js. Discord bot code stays in repo but never runs. Do not suggest Discord as a channel.

**Files changed:** `bot-config.js`, plus bug fix files

---

# 31. SESSION 112 — BUG QUEST BATCH + IDEAS PARKED

**Goal:** Continue bug audit, park new ideas.

1. **3 bugs fixed** — Bugs 025 (hot takes expand), 031 (password reset), 034 (confirmed already built). Score: 24/36 → 27/36.
2. **Two new ideas parked (not built):**
   - *Timed Powerup Data Harvests* — Colosseum cross-cutting system. Powerup activation prompts are disguised B2B data questions. Roadmapped after bug quest.
   - *Data Harvesting Game Studio* — SEPARATE venture (separate LLC, Supabase, everything). Clone top free mobile games via Unity reskin, replace IAP with data questions. $1k budget. Parked.

**Files changed:** `colosseum-async.js`, `colosseum-settings.html`

---

# 32. SESSION 113 — PROFILE DEPTH + TRANSCRIPT + PREDICTIONS

**Goal:** Close bugs 030, 023, 026.

1. **Bug 030 — Profile depth.** Emoji avatar picker (20 options, saves as `emoji:⚔️` in avatar_url), inline bio edit (500 char), followers/following list modal with tap-to-profile. `_renderAvatar()` and `_renderNavAvatar()` helpers. Emoji avatar support added to `showUserProfile()` modal and `/u/:username` public page.
2. **Bug 023 — Post-debate transcript.** "📝 TRANSCRIPT" button in post-debate actions. Opens bottom sheet with full message history — side-colored bubbles (blue A, red B), round dividers, scrollable. Add rival and opponent profile confirmed already built.
3. **Bug 026 — Standalone prediction creation.** New `prediction_questions` and `prediction_picks` tables. 3 SECURITY DEFINER RPCs: `create_prediction_question`, `get_prediction_questions`, `pick_prediction`. Rate-limited (10 creates/hr, 30 picks/hr). CREATE button in predictions tab, bottom sheet form, optimistic UI with server sync.

**Score: 27/36 → 30/36.**

**New Supabase objects:** Tables `prediction_questions`, `prediction_picks`. RPCs `create_prediction_question`, `get_prediction_questions`, `pick_prediction`.

**Files changed:** `index.html`, `colosseum-auth.js`, `api/profile.js`, `colosseum-arena.js`, `colosseum-async.js`, `colosseum-prediction-questions.sql`

---

# 33. SESSION 114 — SPECTATOR VIEW PATH + PREDICTIONS FIX

**Goal:** Bug 024 (spectator view path), verify Bug 026 prediction flow, fix predictions tab visibility.

1. **Bug 024 — Spectator view path.** New standalone page `colosseum-spectate.html`. Loads debate via `get_arena_debate_spectator` RPC (joins arena_debates + profiles for names/elo/avatars). Message stream with round dividers, 5-second auto-polling for live debates, vote buttons (reuses `vote_arena_debate`), spectator count via `bump_spectator_count`, share buttons, CTA for non-users. `colosseum-arena.js` patched: all lobby feed cards now get `data-link` — arena debates route to spectate page, auto debates to auto-debate page.
2. **Predictions tab visibility fix.** `index.html` line 489 renamed the predictions tab element ID from `overlay-predictions-tab` to `predictions-feed`, breaking the tab switcher (which still looked up the old ID). Predictions content was rendered but permanently hidden. Removed the ID rename; all references now consistently use `overlay-predictions-tab`.
3. **Bug 026 verified end-to-end.** Category → Predictions tab → CREATE → fill form → POST → new prediction appears in list. Confirmed working.

**Score: 30/36 → 31/36.**

**New Supabase objects:** RPCs `get_arena_debate_spectator`, `bump_spectator_count`.

**Files changed:** `colosseum-spectate.html` (new), `colosseum-spectate-rpcs.sql` (new), `colosseum-arena.js`, `index.html`

