# THE COLOSSEUM — NEW TESTAMENT (Project Knowledge Edition)
### Last Updated: Session 91 (March 13, 2026)

> **This is the condensed NT for Claude Project Knowledge.** It loads automatically every session.
> Build logs live in the Old Testament. Land Mine Map stays in the repo — pull only when doing schema/auth/deployment work.
> Session handoffs go in the chat message, not this file.
>
> **Other bible docs (repo, read when relevant):**
> - `THE-COLOSSEUM-OLD-TESTAMENT.md` — All session build logs (1-62), 502+ item inventory, revenue model, B2B data play, growth strategy
> - `THE-COLOSSEUM-LAND-MINE-MAP.md` — 168+ documented pitfalls, failure modes, fixes. **Read before any SQL, schema, auth, or deployment change.**
> - `THE-COLOSSEUM-WAR-CHEST.md` — B2B intelligence play, auction model, pricing tiers, exclusivity framework, buyer list
> - `THE-COLOSSEUM-PRODUCT-VISION.md` — Psychology framework, visual game layer, sound-off solution, ad placement, gamification
> - `THE-COLOSSEUM-TEST-WALKTHROUGH.md` — 54-scenario journey walkthrough

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
- **Pat switches between multiple computers** — file downloads from Claude may land on different machines. Never trust SCP delivered the right file; verify content on VPS after every transfer.

---

# 3. GUIDING PRINCIPLES

- **Temporary functional placeholders** — never block on human action
- **Slow down, suggest, wait** — present 2-4 options, Pat picks
- **Small chunks with downloads** — work in pieces, pause, ask what's next
- **Full file replacement over patches** — always produce complete files, never diffs
- **Prefer VPS sed for bot files** — SCP from Downloads is unreliable (LM-152, LM-166). Use sed to patch VPS files directly when possible.
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
3. **No audience** — Bot army deployed, DRY_RUN=false. Bluesky L2 flag fixed and posting (text-only confirmed March 12; image posting v2 on VPS, awaiting verification after Session 91 config fix). Lemmy DEAD (files deleted, flags removed, config block removed). Reddit pending API approval (submitted March 4). Discord deferred.

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
Supabase (faomczmipsccwbhpivmp): 34 tables, RLS hardened, 42+ server functions, sanitization, rate limits, 9 analytics views, 3 security views, 20 RPCs wired to log_event(). Token system Phase 3 complete (milestones, streak freezes, token display, gold coin animation). Vercel (colosseum-six.vercel.app): auto-deploys from GitHub, 1 serverless function (profile pages). Stripe sandbox: 7 products, Edge Functions, webhooks. Auth working end-to-end. Resend SMTP configured. Security audit FULLY COMPLETE (Sessions A-D). Bot army deployed to VPS (DigitalOcean $6/mo, Ubuntu 24.04, NYC3, IP 161.35.137.21), PM2 managed, DRY_RUN=false LIVE. Content-first upgrade: ESPN-style share card generation (card-generator.js) + Bluesky image posting (leg2-bluesky-poster.js v2). Mirror generator live (5-min cron, 41 pages/build, deploys to colosseum-f30.pages.dev). Arena fully built (4 modes). AI Sparring live (Groq). Moderator UI fully built. Reference/evidence system live. Analytics layer live. Funnel analytics live. Legal docs live (Privacy Policy + Terms). Groups feature live. Ranked/Casual mode live. Public profile pages live. OWASP audit complete (7/10 STRONG). SRI hashes on 6 HTML files. Edge Functions hardened (Deno.serve, CORS allowlist).

**IMPORTANT: bot-config.js on VPS is authoritative, NOT the GitHub version.** The VPS copy has a `bluesky: { ... }` config block added by setup-bluesky.js that does not exist in the GitHub version. Uploading bot-config.js from GitHub to VPS will break Bluesky posting (LM-166).

## Core JS Modules (all use window.X global pattern)
| File | Purpose |
|------|---------|
| colosseum-config.js | Central config, credentials, feature flags (v2.2.0), escapeHTML(), showToast(), friendlyError() |
| colosseum-auth.js | Auth, profile CRUD, follows, rivals, moderator RPCs, safeRpc(). noOpLock + INITIAL_SESSION. |
| colosseum-payments.js | Stripe Checkout, token purchases, sub upgrades |
| colosseum-notifications.js | Notification center, mark read via rpc() |
| colosseum-paywall.js | 4 contextual paywall variants, gate() helper |
| colosseum-async.js | Hot takes feed, predictions, rivals display, react toggle, challenge modal |
| colosseum-share.js | Web Share API, clipboard, referrals, deep links |
| colosseum-leaderboard.js | Elo/Wins/Streak tabs, time filters, My Rank |
| colosseum-cards.js | Canvas share card generator, 4 sizes, ESPN aesthetic |
| colosseum-arena.js | Arena: lobby, 4 modes, matchmaking, debate room, post-debate. AI sparring, moderator UX, ranked/casual. |
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
| colosseum-auto-debate.html | AI vs AI debate page, ungated voting, rage-click funnel |
| colosseum-plinko.html | Plinko Gate — 4-step signup (OAuth → Age → Username → Done) |
| colosseum-groups.html | Groups: discover, my groups, rankings, detail view, hot takes |

## Database: 25 SQL migrations, 34 tables, 42+ server functions
## Supabase Edge Functions: ai-sparring, ai-moderator, stripe-* (templates)
## Vercel Serverless: api/profile.js (public profile pages)
## Bot Army: 17+ files, ~3,200+ lines, DigitalOcean VPS, PM2 managed
## VPS Bot Files (not on GitHub):
- card-generator.js — Server-side ESPN share card PNG generator (canvas npm)
- leg2-bluesky-poster.js (v2) — Image-first Bluesky posting with uploadBlob()
- bot-engine.js — Main orchestrator, cron scheduling, pipeline execution

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
- Daily capacity: ~370 L1 mentions, 5-10 L2 posts, 6 L3 auto-debates
- Combined daily reach: ~6,000-40,000+ impressions
- Actual monthly cost: $6-16/mo
- Bot army LIVE (DRY_RUN=false).
- All bot links → colosseum-f30.pages.dev (mirror), not Vercel app. APP_BASE_URL fixed Session 91.
- **Platforms:**
  - **Bluesky:** L2 flag fixed (Session 90), config block + flags block fixed (Session 91). Image poster v2 on VPS. **Awaiting verification** that image posts actually fire on next pipeline cycle.
  - **Lemmy:** DEAD. Files deleted, flags removed from bot-config.js, config block removed. .env values set to false. Commented out in bot-engine.js.
  - **Reddit:** Pending API approval (submitted March 4, 9+ days).
  - **Discord:** Deferred until real users.
- Groq TPD cap (100k tokens/day free tier) hits daily — falls back to templates.

---

# 11. WHAT TO DO NEXT

## Pending Human Actions
- ⏳ Register DMCA agent at copyright.gov ($6)
- ⏳ Purchase domain thecolosseum.app (blocks legal emails + mirror URL)
- ⏳ Reddit API approval — check email, update .env, enable Reddit legs (submitted March 4, 9+ days)
- ⏳ Invite Discord bot to servers (deferred until real users)
- ⏳ Rename `package_1.json` → `package.json` on GitHub
- ⏳ Upload updated bible files to GitHub (NT, LM)
- ⏳ Upload fixed bot-config.js to GitHub (sync VPS version back to repo)

## Next Build Priorities
- 🔴 **Verify Bluesky image posts** — run `pm2 logs --lines 40 --nostream | grep -iE "bluesky|image|card|upload"` after next pipeline cycle. If errors, debug image poster v2.
- ⏳ Unwired edges needing SQL (E131, E144/E145/E149, E211, E212/E215, E279/E280)
- ⏳ Finish guest walkthrough — started Session 77, found template text in debate content, truncated titles, zero real votes
- ⏳ Mirror analytics — mirror pages have zero tracking, completely blind on traffic
- ⏳ Mirror debate content — currently all template text, not real AI arguments
- ⏳ Voice memo UX + keyboard handling (needs real device test)
- ⏳ Clean ecosystem.config.js — remove Lemmy references
- ⏳ Watch what happens — monitor via bot_stats_24h + auto_debate_stats + event_log + `pm2 logs`

## Known Bugs / Tech Debt
- ⏳ Domain purchase blocking legal emails and mirror URL
- ⏳ DMCA agent not registered ($6)
- ⏳ Stripe Edge Function templates use old imports (not urgent, deploy when Stripe goes live)
- ⏳ Edge Function CORS allowlist missing mirror domain (OK since mirror is pure HTML)
- ⏳ 3 older RLS policies still have {public} scope (low priority)
- ⏳ safeRpc() not yet backfilled into all modules
- ⏳ bot-engine.js not in repo (VPS-only, backup exists)
- ⏳ bot-config.js on GitHub is stale (missing bluesky block, still has Lemmy) — VPS is authoritative

## Bot Army Remaining
- 🔴 Verify Bluesky image posts fire on next cycle
- ⏳ Reddit API approval → update .env → enable Reddit legs
- ⏳ Optional: Twitter/X developer account

---

# 12. CRITICAL TECHNICAL NOTES

These are the things that bite hardest. Full details in the Land Mine Map.

- **bot-config.js on VPS ≠ GitHub** (LM-166). The VPS copy has a `bluesky: {}` config block added by setup-bluesky.js. GitHub version does not. Uploading from GitHub overwrites it and breaks Bluesky. **VPS is authoritative for bot-config.js.** When patching, use `sed` directly on VPS instead of SCP.
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
- **Windows download cache** can cause stale scp uploads — re-output with unique filename if needed
- **Bot platform wiring requires THREE updates** (LM-149): config object + flags block in bot-config.js + formatFlags() in bot-engine.js. Missing any one = silent failure.
- **VPS file copies**: always use `\cp` (backslash prefix) to bypass `cp -i` alias. Always verify with grep after copy.
- **SCP from multiple machines is unreliable** (LM-167): Pat switches computers. SCP may deliver stale files from a different machine's Downloads. Always verify content on VPS with `grep` after transfer. Prefer `sed` patches over SCP for bot files.

---

*For all session build logs, the full inventory, revenue details, B2B strategy — see the Old Testament. For the B2B intelligence play — see the War Chest. For the product design north star — see the Product Vision. For documented pitfalls — see the Land Mine Map (clone repo first).*
