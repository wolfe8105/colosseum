# THE COLOSSEUM — NEW TESTAMENT (Project Knowledge Edition)
### Last Updated: Session 117 (March 15, 2026)

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
- ⏳ Reddit API approval — check email, resubmit if rejected (submitted March 4, 11+ days, Reddit tightened commercial approvals since Jan 2026)
- ⏳ Register DMCA agent at copyright.gov ($6)
- ⏳ Purchase domain thecolosseum.app

## Prioritized Roadmap

### Tier 1 — Must Do Before Any Public Exposure
- ⏳ **PII scrub** — hardcoded email, name, user ID throughout codebase. Must move to env vars before repo goes public or any real users arrive.
- ⏳ **Content guardrails** — extreme debate framings ("Republicans VS Nazis") risk Bluesky account bans. AI generator needs topic filtering.

### Tier 2 — Active Build (Token Staking)
- ✅ **Phase 1: Questionnaire Tier Foundation** (Session 117) — questions_answered column, guard trigger, increment RPC, tier utility, profile-depth UI
- ⏳ **Phase 2: Staking Backend** — stakes table, place_stake/get_debate_stakes/resolve_stakes RPCs, wire into debate completion flow
- ⏳ **Phase 3: Staking Frontend** — pre-debate staking panel, confirmation dialog, live pool updates, results notification, staking history
- ⏳ **Phase 4: Power-Up Backend** — power_up_inventory table, purchase/equip/activate/unequip RPCs
- ⏳ **Phase 5: Power-Up Frontend** — shop screen, equip screen, in-debate buttons, visual effects
- ⏳ **Phase 6: Polish & Balance** — economy audit, price tuning, Orange Dot integration, bot content templates

### Tier 3 — Future Features (See Ideas Master Map)
- Reference Arsenal system
- Tournament brackets
- DM system
- Mirror More Debates section
- Tier threshold recalibration (39 questions vs 100-question Legend tier)

## Known Bugs / Tech Debt
- ⏳ Auth redirect loop on cold visit (workaround: click Log In link)
- ⏳ Stripe Edge Function templates use old imports (not urgent, deploy when Stripe goes live)
- ⏳ Edge Function CORS allowlist missing mirror domain (OK since mirror is pure HTML)
- ⏳ 3 older RLS policies still have {public} scope (low priority)
- ⏳ VPS-only bot files not in repo: bot-engine.js, ai-generator.js, supabase-client.js, card-generator.js, category-classifier.js (backups exist on VPS)

## Monitoring
- Leg 1 Bluesky — `pm2 logs` for `[LEG1][BLUESKY]`, watch follower count on `wolfe8105.bsky.social`
- Cloudflare Web Analytics — check for real visits
- Groq fallback quality — living with template fallback for now (Session 97 decision, reconfirmed Session 116)
- Bot stats: `bot_stats_24h` + `auto_debate_stats` + `event_log` + `pm2 logs`

## Bug Quest Status: COMPLETE ✅
- 35 of 36 bugs resolved or closed.
- Sole remaining: Bug 014 (Reddit API approval — external blocker, no code action possible).
- ⏳ Reddit API approval → update .env → enable Reddit legs (5-min task when email arrives)
- ⏳ Optional: Twitter/X developer account

---

# 12. CRITICAL TECHNICAL NOTES

These are the things that bite hardest. Full details in the Land Mine Map.

- **Single canonical debate table: `arena_debates`** — legacy `debates` table eliminated in Session 101. All debate RPCs use `arena_debates` only.
- **guard_profile_columns trigger** protects 4 columns: `level`, `xp`, `streak_freezes`, `questions_answered`. Raises exception on direct UPDATE for non-service roles. SECURITY DEFINER RPCs bypass it (they run as postgres). Previous documentation (LM-001, LM-085) incorrectly listed 21 columns — corrected in Session 117.
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
- **Token staking & power-up plan (Session 108, Phase 1 complete Session 117)** — Full implementation plan in `TOKEN-STAKING-POWERUP-PLAN.docx`. Phase 1 (questionnaire tier foundation) complete: `questions_answered` column on profiles, `guard_profile_columns` updated to protect it, `increment_questions_answered` RPC, `colosseum-tiers.js` client-side tier utility, tier badge + progress bar wired into `colosseum-profile-depth.html`. 5 tiers (Unranked/Spectator+/Contender/Gladiator/Champion/Legend) at 0/10/25/50/75/100 questions. Current questionnaire has 39 questions (max Tier 2). Phase 2 (staking backend) next.


---

# SESSION BUILD LOGS (Sessions 108-117)

> Sessions 92-107 moved to Old Testament during Session 117 consolidation.

# 13. SESSION 108 — TOKEN STAKING & POWER-UP PLAN

**Goal:** Design the complete token spend loop — staking + power-ups + questionnaire gate.

1. **Full plan document created** — `TOKEN-STAKING-POWERUP-PLAN.docx` in repo.
2. **Design decisions locked:** Parimutuel pool split, pre-debate only, debaters can self-stake, free-form amounts, all 4 power-ups at launch (2x Multiplier, Silence, Shield, Reveal), slots gated by questionnaire tier.
3. **5-tier questionnaire gate:** Tier 1 (10 Qs, 5 token max, 0 slots) → Tier 5 (100 Qs, unlimited staking, 4 slots, all power-ups).
4. **6-phase implementation order:** Phase 1 questionnaire foundation → Phase 2 staking backend → Phase 3 staking frontend → Phase 4 power-up backend → Phase 5 power-up frontend → Phase 6 polish.
5. **Database schemas defined:** `stakes` table, `power_up_inventory` table, `questions_answered` column on profiles.
6. **Castle defense compliant:** All writes through SECURITY DEFINER RPCs, `resolve_stakes` service-role only, `questions_answered` added to `guard_profile_columns` trigger (Session 117).

**No code shipped. No SQL. Planning session only.**

*For all session build logs, the full inventory, revenue details, B2B strategy — see the Old Testament. For the B2B intelligence play — see the War Chest. For the product design north star — see the Product Vision. For documented pitfalls — see the Land Mine Map (clone repo first).*

# 14. SESSION 109 — TOKEN STAKING PHASE 2 (BACKEND)

**Goal:** Build the staking backend from TOKEN-STAKING-POWERUP-PLAN.docx Phase 2.

1. **SQL migration** — `stakes` table, `stake_pools` table, 3 SECURITY DEFINER RPCs: `place_stake`, `get_stake_pool`, `settle_stakes`. Parimutuel pool model. Pre-debate only. Rate-limited.
2. **colosseum-staking.js** — NEW module. `getPool()`, `renderStakingPanel()`, `wireStakingPanel()`, `settleStakes()`. Renders staking UI with token input, side picker, pool visualization.
3. **colosseum-arena.js** — Pre-debate screen added (`showPreDebate()`). Loads staking panel between matchmaking and room entry. Staking settlement wired into `endCurrentDebate()`.

**Files changed:** `colosseum-staking.js` (new), `colosseum-arena.js`, SQL migration

---

# 15. SESSION 110 — POWER-UPS FRONTEND (PHASE 5)

**Goal:** Build the power-up frontend from TOKEN-STAKING-POWERUP-PLAN.docx Phase 5.

1. **colosseum-powerups.js** — NEW module. 4 power-ups: 2x Multiplier (passive), Silence (10s mute), Shield (block reference challenge), Reveal (see opponent loadout). Inventory management, equip/unequip, activation handlers.
2. **Pre-debate loadout** — Power-up loadout panel renders in pre-debate screen. Equip from inventory before entering room.
3. **In-debate activation bar** — Horizontal bar above message stream. Tap to activate Silence/Shield/Reveal. Visual effects: silence countdown overlay, shield indicator badge, reveal popup showing opponent's equipped items.
4. **Power-up state cleanup** — `activatedPowerUps` Set, `shieldActive` flag, `silenceTimer` ref. All cleaned up in `renderLobby()` and `endCurrentDebate()`.
5. **Staking settlement with multiplier** — `settleStakes()` accepts multiplier parameter. 2x Multiplier power-up doubles staking payout on win.

**Files changed:** `colosseum-powerups.js` (new), `colosseum-arena.js`

---

# 16. SESSION 111 — BUG QUEST BATCH + DISCORD KILLED

**Goal:** Continue bug audit, kill dead channels.

1. **3 bugs fixed** — Score: 21/36 → 24/36.
2. **Discord killed permanently** — `LEG1_DISCORD_ENABLED` hardcoded to `false` in bot-config.js. Discord bot code stays in repo but never runs. Do not suggest Discord as a channel.

**Files changed:** `bot-config.js`, plus bug fix files

---

# 17. SESSION 112 — BUG QUEST BATCH + IDEAS PARKED

**Goal:** Continue bug audit, park new ideas.

1. **3 bugs fixed** — Bugs 025 (hot takes expand), 031 (password reset), 034 (confirmed already built). Score: 24/36 → 27/36.
2. **Two new ideas parked (not built):**
   - *Timed Powerup Data Harvests* — Colosseum cross-cutting system. Powerup activation prompts are disguised B2B data questions. Roadmapped after bug quest.
   - *Data Harvesting Game Studio* — SEPARATE venture (separate LLC, Supabase, everything). Clone top free mobile games via Unity reskin, replace IAP with data questions. $1k budget. Parked.

**Files changed:** `colosseum-async.js`, `colosseum-settings.html`

---

# 18. SESSION 113 — PROFILE DEPTH + TRANSCRIPT + PREDICTIONS

**Goal:** Close bugs 030, 023, 026.

1. **Bug 030 — Profile depth.** Emoji avatar picker (20 options, saves as `emoji:⚔️` in avatar_url), inline bio edit (500 char), followers/following list modal with tap-to-profile. `_renderAvatar()` and `_renderNavAvatar()` helpers. Emoji avatar support added to `showUserProfile()` modal and `/u/:username` public page.
2. **Bug 023 — Post-debate transcript.** "📝 TRANSCRIPT" button in post-debate actions. Opens bottom sheet with full message history — side-colored bubbles (blue A, red B), round dividers, scrollable. Add rival and opponent profile confirmed already built.
3. **Bug 026 — Standalone prediction creation.** New `prediction_questions` and `prediction_picks` tables. 3 SECURITY DEFINER RPCs: `create_prediction_question`, `get_prediction_questions`, `pick_prediction`. Rate-limited (10 creates/hr, 30 picks/hr). CREATE button in predictions tab, bottom sheet form, optimistic UI with server sync.

**Score: 27/36 → 30/36.**

**New Supabase objects:** Tables `prediction_questions`, `prediction_picks`. RPCs `create_prediction_question`, `get_prediction_questions`, `pick_prediction`.

**Files changed:** `index.html`, `colosseum-auth.js`, `api/profile.js`, `colosseum-arena.js`, `colosseum-async.js`, `colosseum-prediction-questions.sql`

---

# 19. SESSION 114 — SPECTATOR VIEW PATH + PREDICTIONS FIX

**Goal:** Bug 024 (spectator view path), verify Bug 026 prediction flow, fix predictions tab visibility.

1. **Bug 024 — Spectator view path.** New standalone page `colosseum-spectate.html`. Loads debate via `get_arena_debate_spectator` RPC (joins arena_debates + profiles for names/elo/avatars). Message stream with round dividers, 5-second auto-polling for live debates, vote buttons (reuses `vote_arena_debate`), spectator count via `bump_spectator_count`, share buttons, CTA for non-users. `colosseum-arena.js` patched: all lobby feed cards now get `data-link` — arena debates route to spectate page, auto debates to auto-debate page.
2. **Predictions tab visibility fix.** `index.html` line 489 renamed the predictions tab element ID from `overlay-predictions-tab` to `predictions-feed`, breaking the tab switcher (which still looked up the old ID). Predictions content was rendered but permanently hidden. Removed the ID rename; all references now consistently use `overlay-predictions-tab`.
3. **Bug 026 verified end-to-end.** Category → Predictions tab → CREATE → fill form → POST → new prediction appears in list. Confirmed working.

**Score: 30/36 → 31/36.**

**New Supabase objects:** RPCs `get_arena_debate_spectator`, `bump_spectator_count`.

**Files changed:** `colosseum-spectate.html` (new), `colosseum-spectate-rpcs.sql` (new), `colosseum-arena.js`, `index.html`

---

# 20. SESSION 115 — BUG QUEST BATCH (SPECTATOR CHAT, PULSE GAUGE, SHARE)

**Goal:** Close bugs 027, 028, 033. Bug quest push.

1. **Bug 027 — Spectator chat.** Live chat for spectators during debates.
2. **Bug 028 — Audience pulse gauge.** Real-time sentiment visual showing which side is winning.
3. **Bug 033 — Enhanced share.** Improved share flow for post-debate results.

**Score: 31/36 → 32/36.**

**Files changed:** `colosseum-spectate.html`, `colosseum-arena.js`, `colosseum-share.js`

---

# 21. SESSION 116 — GVG CHALLENGE + GROQ DECISION (BUG QUEST EFFECTIVELY COMPLETE)

**Goal:** Close bugs 029 (Groups GvG) and 012 (Groq tier decision).

1. **Bug 029 — Group vs Group Challenge System (full build from scratch).** SQL: `group_challenges` table with status flow (pending→accepted→declined→expired→live→completed). 48-hour auto-expiry. Self-challenge prevention. 4 SECURITY DEFINER RPCs: `create_group_challenge` (rate limited 3 pending/group, duplicate detection), `respond_to_group_challenge` (defender-only, expiry check), `resolve_group_challenge` (Elo calc, admin-only), `get_group_challenges` (priority-sorted). HTML/JS: New "Challenges" tab in group detail (3 tabs: Hot Takes, Challenges, Members). GvG button below join/leave (member-only). Full modal: opponent search with 350ms debounce, topic input, category select, format pills (1v1/3v3/5v5). Challenge list renderer with status badges. Accept/decline via data-* attributes + event delegation. UUID regex validation. All castle defense compliant.
2. **Bug 012 — Groq Free Tier (CLOSED).** Decision: Accept template fallback. At 3 debates/day the free tier rarely hits. 125-combo template system + headline fallback produces passable content. Groq paid tier ~$0.01-0.05/month — not worth a paid dependency pre-launch.

**Score: 32/36 → 34/36. Bug quest effectively complete.** 35 of 36 resolved or closed. Sole remaining: Bug 014 (Reddit API approval — external blocker, no code action possible).

**New Supabase objects:** Table `group_challenges`. RPCs `create_group_challenge`, `respond_to_group_challenge`, `resolve_group_challenge`, `get_group_challenges`.

**Files changed:** `colosseum-groups.html`, `colosseum-gvg-challenge.sql` (new)

---

# 22. SESSION 117 — TOKEN STAKING PHASE 1 (QUESTIONNAIRE TIER FOUNDATION)

**Goal:** Begin token staking build. Phase 1: questionnaire tier system.

1. **SQL migration (colosseum-token-staking-phase1.sql).** Added `questions_answered` integer column to `profiles` (default 0). Updated `guard_profile_columns` trigger to protect `questions_answered` (now guards: level, xp, streak_freezes, questions_answered). Created `increment_questions_answered(p_count)` SECURITY DEFINER RPC — validates auth, caps batch at 50, returns new total.
2. **colosseum-tiers.js (NEW).** Client-side tier utility. 6 tiers: Unranked (0), Spectator+ (10), Contender (25), Gladiator (50), Champion (75), Legend (100). `getTier(qa)`, `getNextTier(qa)`, `renderTierBadge(qa)`, `renderTierProgress(qa)`. Display only — server enforces all caps. `_escTier()` helper resolves to whichever HTML escape function is available.
3. **colosseum-profile-depth.html (UPDATED).** Tier banner UI between discount banner and section grid — shows current rank badge, progress bar to next tier, perk summary (max stake, power-up slots). `saveSection()` wired: counts newly answered questions (avoids double-counting via `previouslyAnsweredIds` Set), calls `increment_questions_answered`, updates tier banner live. Init migration sync: on page load, fetches `questions_answered` from profile; if server=0 but user has local answers, does one-time catch-up increment.
4. **Reddit API status checked.** Since January 2026 Reddit has made commercial API approval significantly stricter. Application submitted March 4 still pending after 11 days. May require resubmission with detailed use case.
5. **Threshold note:** Current questionnaire has 39 questions. Users can reach Tier 2 (needs 25) but not Tier 3+ (50/75/100). More questions can be added later, or thresholds recalibrated.

**Phase 1 complete. Phase 2 (staking backend) next.**

**New Supabase objects:** Column `profiles.questions_answered`. RPC `increment_questions_answered`. Trigger `guard_profile_columns` updated.

**Files changed:** `colosseum-tiers.js` (new), `colosseum-profile-depth.html`, `colosseum-token-staking-phase1.sql` (new)

