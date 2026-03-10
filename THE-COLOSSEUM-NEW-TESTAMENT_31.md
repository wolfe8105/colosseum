# THE COLOSSEUM — NEW TESTAMENT
### The Living Document — Read Every Session
### Last Updated: Session 69 (March 10, 2026)

> **Read this every session. No exceptions.**
> Session handoffs go in the chat message, not this file.
>
> **Other bible docs (repo, read when relevant):**
> - `THE-COLOSSEUM-OLD-TESTAMENT.md` — All session build logs (1-68), 502+ item inventory, revenue model, B2B data play, growth strategy
> - `THE-COLOSSEUM-LAND-MINE-MAP.md` — 158+ documented pitfalls, failure modes, fixes. **Read before any SQL, schema, auth, or deployment change.**
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
- Legal entity: **WHHW LLC** (confirmed)
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

- **Temporary functional placeholders** — never block on human action, use "PASTE HERE" markers
- **Slow down, suggest, wait** — Claude presents 2-4 options, owner picks direction
- **Small chunks with downloads** — work in pieces, present file, pause, ask what's next
- **Full file replacement over patches** — always produce complete files, never diffs
- **Verify before claiming done** — confirm it's actually there
- **Zero founder marketing time** — all growth is bot-driven
- **Keep it simple** — plain steps, one thing at a time, no jargon
- **Read the bible first** — every session starts by reading the NT. Land Mine Map when doing schema/auth/deployment.

---

# 4. KEY DECISIONS

### Product & Economy
- Target male opinion culture 16-65, mobile-forward
- **Tokens = prestige currency, earned only, never purchased.** Displayed everywhere as a status signal (profile, debate room, share cards, leaderboard). High token count = visible reputation that can't be bought.
- **Token earn events:** daily login, profile question sections (weighted — hard sections worth more), debating, prediction wins, streaks, milestones.
- **Token predictions:** stake tokens on debate outcomes; winners take from losers' pool. No cash = no gambling laws.
- **Real-money betting:** long-term target. Legal path (state licensing) must be solved before build. On the list, not building now.
- **Tipping:** still in the model, deprioritized.
- **Profile depth incentive reframe:** questions are self-expression + token earn events, not a form. Accumulates naturally through usage.
- **Human verification:** Verified Gladiator badge earned by completing one live audio debate. Voice intro required for Ranked. Profile depth + debate history as humanness proxy.
- Profile Depth System: 12 sections, 157 Qs, mixed rewards, free at launch
- Async debate mode is survival-critical (liquidity problem)
- Predictions = core engagement loop
- Customer segments (behavioral, NOT paywalled): Lurker, Contender, Champion, Creator. All free at launch.

### Architecture & Auth
- All table writes locked behind server functions — client JS uses `supabase.rpc()` for all mutations
- Guest access is default — anonymous users see the full app, auth only for actions. Critical for bot funnel.
- Auth init: `onAuthStateChange INITIAL_SESSION` is sole init path. `noOpLock` in `createClient`. 5s safety timeout.
- Three-zone architecture: Static Mirror (Cloudflare Pages) + Plinko Gate (login/signup) + Members Zone (Vercel)
- Mirror is JAMstack SSG — vanilla Node.js on VPS, 5-min cron, deploys to Cloudflare Pages via wrangler
- Mirror is NOT a shield — anyone can Google the Vercel app directly. Mirror controls where bot VOLUME goes.

### Arena & Debate
- Arena supports 4 debate modes: Live Audio, Voice Memo (async), Text Battle, AI Sparring
- AI Sparring is instant-start — always-available opponent for cold-start liquidity
- Ranked vs Casual: Casual = open, no profile, Elo frozen. Ranked = 25%+ profile, Elo moves.
- Reference/evidence system: debaters submit mid-round, moderator rules allow/deny within 60s. Auto-allowed on timeout.
- Moderator class: parallel identity to debater. Separate stats. Bias emerges from rulings, never declared.
- Groups + Group vs Group: schema, UI, Group Elo all built and wired
- `react_hot_take()` is a toggle function — single RPC for add/remove
- Controversial scoring IS the marketing — AI deliberately picks the unpopular winner

### Visual & UX
- Spoke carousel (6 tiles, hollow center, 18° tilt, thumb-spin)
- Visual: Cinzel + Barlow Condensed, diagonal gradient, dark frosted glass cards, navy/red/white/gold
- Login: OAuth dominant, email collapsed behind toggle
- Public profile pages: `/u/username` via Vercel serverless, dynamic OG tags, Google-indexable
- Funnel analytics: `colosseum-analytics.js` (visitor UUID, auto page_view, referrer/UTM capture, signup detection)

### Bot & Growth
- Bot-driven growth: fully automated 24/7 bot army, $6-16/mo actual cost
- Groq free tier for AI: Llama 3.3 70B versatile (`llama-3.1-70b` is decommissioned)
- Leg 3: Auto-Debate Rage-Click Engine — AI generates full debates, scores lopsided, posts rage-bait hooks
- Reddit API requires manual approval. Account: u/Master-Echo-2366
- Bluesky bot: wolfe8105.bsky.social. Leg 2 posting enabled. Leg 1 disabled (opt-in only per Bluesky policy).
- Cloudflare Pages: colosseum-f30.pages.dev. Deploy with `--branch=production`.

### Legal
- **Legal identity: interactive computer service.** Section 230, COPPA, FTC Act §5, CAN-SPAM, DMCA, state privacy laws.
- **AI content must be labeled.** Auto-debates, AI sparring, any AI-generated content. Multiple states require disclosure.
- **AI auto-debates are NOT protected by Section 230.**
- Revenue pivot: free platform, premier data. Full strategy in WAR-CHEST.md.

### Open Decisions
- Launch date: what's real?
- Domain: thecolosseum.app or keep current URLs?

---

# 5. THREE CORE PROBLEMS

1. **Money pipe connected** — Stripe Checkout live (sandbox), Edge Functions deployed, webhooks listening. Still sandbox mode.
2. **Single-player → multiplayer (in progress)** — follows, modals, predictions, rivals, arena, 4 debate modes, AI sparring, guest access. Needs real users.
3. **No audience** — Bot army deployed, DRY_RUN=false, live. Bluesky posting. Lemmy posting. Reddit pending API approval. Discord deferred.

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
Supabase (faomczmipsccwbhpivmp): 34 tables, RLS hardened, 42+ server functions, sanitization, rate limits, 9 analytics views, 3 security views, 20 RPCs wired to log_event(). Vercel (colosseum-six.vercel.app): auto-deploys from GitHub, 1 serverless function (profile pages). Stripe sandbox: 7 products, Edge Functions, webhooks. Auth working end-to-end. Resend SMTP configured. Bot army deployed to VPS (DigitalOcean $6/mo, Ubuntu 24.04, NYC3, IP 161.35.137.21), PM2 managed, DRY_RUN=false LIVE. Mirror generator live (5-min cron, 41 pages/build). Arena fully built (4 modes). AI Sparring live (Groq). Moderator UI fully built. Reference/evidence system live. Analytics layer live. Funnel analytics live. Legal docs live (Privacy Policy + Terms under WHHW LLC). Groups feature live. Ranked/Casual mode live. Public profile pages live.

## Security Status
OWASP audit complete (7/10 STRONG, 3 MODERATE). Code security audit COMPLETE: 80 bugs found and fixed across 18 files (Sessions 62-65). SRI hashes on 6 HTML files, pinned supabase-js @2.98.0. Edge Functions hardened (Deno.serve, CORS allowlist). Security event logging live. RLS hardened across all tables.

## Guest Funnel Status (verified Session 68 — CLEAN)
- Mirror home, sections, debate detail pages ✅
- `colosseum-auto-debate.html` — auto-fetches latest debate ID on bare URL, redirects, vote works, rage message fires ✅
- `colosseum-debate-landing.html` — vote works, live %, share buttons ✅
- `colosseum-groups.html` — loads for guests, empty state clean ✅
- `/u/username` public profile — loads, stats visible, CHALLENGE/FOLLOW gate correctly ✅
- All CTAs → Plinko correctly ✅

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
| colosseum-terms.html | Terms of Service (WHHW LLC) |
| colosseum-privacy.html | Privacy Policy |
| colosseum-debate-landing.html | Ungated landing, vote without signup, OG tags |
| colosseum-auto-debate.html | AI vs AI debate page, ungated voting, rage-click funnel. Auto-fetches latest debate on bare URL. |
| colosseum-plinko.html | Plinko Gate — 4-step signup (OAuth → Age → Username → Done) |
| colosseum-groups.html | Groups: discover, my groups, rankings, detail view, hot takes |

## Other Infrastructure
- Database: 25 SQL migrations, 34 tables, 42+ server functions (full migration list in OT)
- Supabase Edge Functions: ai-sparring, ai-moderator, stripe-* (templates)
- Vercel Serverless: api/profile.js (public profile pages)
- Bot Army: 17+ files, ~3,200+ lines, DigitalOcean VPS, PM2 managed
- VPS path: `/opt/colosseum/bot-army/colosseum-bot-army/`

## Legal Compliance
Privacy Policy live. Terms of Service live (WHHW LLC). AI content labeling deployed. DMCA agent NOT registered. Legal emails NOT created (need domain).

---

# 8. PRODUCT PHILOSOPHY

- **Emergence Engine** — not a debate app, a social system where debates emerge
- **Third Place Theory** — the bar, not the arena. Presence over sessions.
- **Spectators Are the Product** — design for the 90% who watch
- **Casual Is King** — protected lobbies, no sharks in casual waters
- **Reciprocal Gating** — can't unlock cosmetic until profile section complete
- **Liquidity Problem** — text async, voice memo, AI sparring solve cold-start
- **Tokens as Status** — prestige currency, earned not bought. Visible everywhere. Can't fake it.
- **Profile as Accumulation** — profile depth fills naturally through usage, not in one sitting

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
- Daily capacity: ~370 L1 mentions, 5-10 L2 posts, 6 L3 auto-debates
- Combined daily reach: ~6,000-40,000+ impressions
- Actual monthly cost: $6-16/mo
- Bot army LIVE (DRY_RUN=false).
- All bot links → colosseum-f30.pages.dev (mirror), not Vercel app.
- Platforms: Bluesky (live, L2 posting), Lemmy (live, L2+L3 posting), Reddit (pending API), Discord (deferred).
- Groq TPD cap (100k tokens/day free tier) hits daily — falls back to templates.

---

# 11. WHAT TO DO NEXT

## Pending Human Actions
- ⏳ Register DMCA agent at copyright.gov ($6)
- ⏳ Purchase domain thecolosseum.app (blocks legal emails + mirror URL)
- ⏳ Reddit API approval — check email, update .env, enable Reddit legs
- ⏳ Invite Discord bot to servers (deferred until real users)
- ⏳ Upload updated bible files to GitHub
- ⏳ VPS reboot ("System restart required" pending)

## Next Build Priorities
- ⏳ Token system build — ledger table, earn events, display layer (profile, debate room, leaderboard, share cards)
- ⏳ Token predictions build — stake on debate outcomes, winner pool distribution
- ⏳ Voice memo UX + keyboard handling (needs real device test)
- ⏳ Watch what happens — monitor via bot_stats_24h + auto_debate_stats + event_log + `pm2 logs`
- ⏳ Build next thing based on what real users do

## Known Bugs / Tech Debt
- ⏳ Domain purchase blocking legal emails and mirror URL
- ⏳ DMCA agent not registered ($6)
- ⏳ Stripe Edge Function templates use old imports (not urgent, deploy when Stripe goes live)
- ⏳ Edge Function CORS allowlist missing mirror domain (OK since mirror is pure HTML)
- ⏳ 3 older RLS policies still have {public} scope (low priority)
- ⏳ safeRpc() not yet backfilled into all modules
- ⏳ bot-engine.js not in repo (VPS-only, backup exists)

## Bot Army Remaining
- ⏳ Reddit API approval → update .env → enable Reddit legs
- ⏳ Lemmy community check (March 11) — if nfl@lemmy.world bans → disable Lemmy, focus Bluesky. If survived → swap in fresh communities.
- ⏳ Optional: Twitter/X developer account

---

# 12. CRITICAL TECHNICAL NOTES

These are the things that bite hardest. Full details in the Land Mine Map.

- **guard_profile_columns trigger** silently reverts direct UPDATEs on protected columns. Disable trigger before updating, re-enable after.
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

---

*For all session build logs (1-68), the full inventory, revenue details, B2B strategy — see the Old Testament. For the B2B intelligence play — see the War Chest. For the product design north star — see the Product Vision. For documented pitfalls — see the Land Mine Map.*
