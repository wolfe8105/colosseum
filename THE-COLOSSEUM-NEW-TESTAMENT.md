# THE COLOSSEUM — NEW TESTAMENT (Project Knowledge Edition)
### Last Updated: Session 101 (March 14, 2026)

> **This is the condensed NT for Claude Project Knowledge.** It loads automatically every session.
> Build logs live in the Old Testament. Land Mine Map stays in the repo — pull only when doing schema/auth/deployment work.
> Session handoffs go in the chat message, not this file.
>
> **Other bible docs (repo, read when relevant):**
> - `THE-COLOSSEUM-OLD-TESTAMENT.md` — All session build logs (1-62), 502+ item inventory, revenue model, B2B data play, growth strategy
> - `THE-COLOSSEUM-LAND-MINE-MAP.md` — 169+ documented pitfalls, failure modes, fixes. **Read before any SQL, schema, auth, or deployment change.**
> - `THE-COLOSSEUM-WAR-CHEST.md` — B2B intelligence play, auction model, pricing tiers, exclusivity framework, buyer list
> - `THE-COLOSSEUM-PRODUCT-VISION.md` — Psychology framework, visual game layer, sound-off solution, ad placement, gamification
> - `THE-COLOSSEUM-TEST-WALKTHROUGH.md` — 54-scenario journey walkthrough
> - `THE-COLOSSEUM-IDEAS-MASTER-MAP.docx` — Raw inventory of every unbuilt idea, organized by structural impact (Session 100)

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
Supabase (faomczmipsccwbhpivmp): 34 tables, RLS hardened, 42+ server functions, sanitization, rate limits, 9 analytics views, 3 security views, 20 RPCs wired to log_event(). Token system Phase 3 complete (milestones, streak freezes, token display, gold coin animation). Vercel (colosseum-six.vercel.app): auto-deploys from GitHub, 1 serverless function (profile pages). Stripe sandbox: 7 products, Edge Functions, webhooks. Auth working end-to-end. Resend SMTP configured. Security audit FULLY COMPLETE (Sessions A-D + Session 92 Claude Code audit: 120+ issues found across 43 files, 29 critical fixes shipped). Bot army deployed to VPS (DigitalOcean $6/mo, Ubuntu 24.04, NYC3, IP 161.35.137.21), PM2 managed, DRY_RUN=false LIVE. Content-first upgrade: ESPN-style share card generation (card-generator.js) + Bluesky image posting LIVE (leg2-bluesky-poster.js v2, verified Session 92). Mirror generator live (5-min cron, 50+ pages/build, deploys to colosseum-f30.pages.dev, Cloudflare Web Analytics on all pages Session 96, mirror generator path fixed Session 96). Arena fully built (4 modes). AI Sparring live (Groq). Moderator UI fully built. Reference/evidence system live. Analytics layer live. Funnel analytics live (mirror + app). Legal docs live (Privacy Policy + Terms). Groups feature live. Ranked/Casual mode live. Public profile pages live. OWASP audit complete (7/10 STRONG). SRI hashes on 6 HTML files. Edge Functions hardened (Deno.serve, CORS allowlist).

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
| colosseum-settings.html | All settings toggles incl. moderator, account mgmt |
| colosseum-profile-depth.html | 12 sections, 147 Qs, saves to DB via safeRpc |
| colosseum-terms.html | Terms of Service |
| colosseum-privacy.html | Privacy Policy |
| colosseum-debate-landing.html | Ungated landing, vote without signup, OG tags |
| colosseum-auto-debate.html | AI vs AI debate page, ungated voting, rage-click funnel, More Debates discovery section (E279/E280, Session 97) |
| colosseum-plinko.html | Plinko Gate — 4-step signup (OAuth → Age → Username → Done) |
| colosseum-groups.html | Groups: discover, my groups, rankings, detail view, hot takes |

## Database: 25 SQL migrations, 34 tables, 42+ server functions
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

## Pending Human Actions
- ⏳ Register DMCA agent at copyright.gov ($6)
- ⏳ Purchase domain thecolosseum.app (blocks legal emails + mirror URL)
- ⏳ Reddit API approval — check email, update .env, enable Reddit legs (submitted March 4, 9+ days)
- ⏳ Invite Discord bot to servers (deferred until real users)
- ⏳ Upload updated bible files to GitHub

## Next Build Priorities
- ✅ **Debate table consolidation (Session 101)** — completed. Single canonical table: `arena_debates`. Legacy `debates` table eliminated.
- ⏳ Monitor Leg 1 Bluesky — check `pm2 logs` for `[LEG1][BLUESKY]` entries, watch follower count on `wolfe8105.bsky.social`
- ⏳ Check Cloudflare Web Analytics in 3-5 days — first real visits should appear once Leg 1 builds followers
- ⏳ Groq fallback quality — decision: live with template fallback for now (Session 97)
- ⏳ Content guardrails — extreme debate framings ("Republicans VS Nazis") risk Bluesky account bans
- ⏳ Mirror More Debates section — static mirror debate pages are still dead ends (Vercel auto-debate page has it, mirror doesn't)
- ⏳ `category-classifier.js` not yet on GitHub — VPS only, add to repo for backup
- ⏳ Unwired edges needing SQL: E131 (share live debate link), E144/E145/E149 (need `check_queue_status` RPC to return `opponent_id`), E211 (group hot take posting UI), E212/E215 (GvG unbuilt), E279/E280 frontend done but mirror pages need matching update
- ⏳ Token prediction staking — users bet earned tokens on debate outcomes (core engagement loop, no UI exists)
- ⏳ Create Prediction UI — completely missing (no UI, no RPC, predictions only come from debates)
- ⏳ Spectator features — audience pulse, spectator chat, live share during debates
- ⏳ Voice memo UX + keyboard handling (needs real device test)
- ⏳ Watch what happens — monitor via bot_stats_24h + auto_debate_stats + event_log + `pm2 logs`

## Known Bugs / Tech Debt
- ⏳ Domain purchase blocking legal emails and mirror URL
- ⏳ DMCA agent not registered ($6)
- ⏳ Stripe Edge Function templates use old imports (not urgent, deploy when Stripe goes live)
- ⏳ Edge Function CORS allowlist missing mirror domain (OK since mirror is pure HTML)
- ⏳ 3 older RLS policies still have {public} scope (low priority)
- ⏳ VPS-only bot files not in repo: bot-engine.js, ai-generator.js, supabase-client.js, card-generator.js, category-classifier.js (backups exist on VPS)

## Bot Army Status: COMPLETE ✅
- Bot army is fully operational and autonomous. No more bot build work.
- ⏳ Reddit API approval → update .env → enable Reddit legs (5-min task when email arrives)
- ⏳ Optional: Twitter/X developer account

---

# 12. CRITICAL TECHNICAL NOTES

These are the things that bite hardest. Full details in the Land Mine Map.

- **Single canonical debate table: `arena_debates`** — legacy `debates` table eliminated in Session 101. All debate RPCs use `arena_debates` only.
- **guard_profile_columns trigger** protects level, xp, streak_freezes (updated Session 77). Silently reverts direct UPDATEs on these columns. Disable trigger before updating, re-enable after.
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

*For all session build logs, the full inventory, revenue details, B2B strategy — see the Old Testament. For the B2B intelligence play — see the War Chest. For the product design north star — see the Product Vision. For documented pitfalls — see the Land Mine Map (clone repo first).*
