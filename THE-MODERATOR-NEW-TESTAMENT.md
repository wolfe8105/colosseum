# THE MODERATOR — NEW TESTAMENT (Project Knowledge Edition)
### Last Updated: Session 229 (April 4, 2026)

> **This is the condensed NT for Claude Project Knowledge.** It loads automatically every session.
> Build logs live in the Old Testament. Session handoffs go in the chat message, not this file.

---

## HOW TO USE THIS DOCUMENT

**Start every session here.** If you need more detail on something, the map below tells you exactly where to go.

### WHERE TO FIND THINGS

| Topic | Go Here |
|-------|---------|
| Open work (bugs, features, housekeeping) | **THE-MODERATOR-PUNCH-LIST.md** |
| Any SQL / schema / auth / deployment change | **THE-MODERATOR-LAND-MINE-MAP.md** first — 107 entries, 16 sections covering DB triggers, auth, Stripe, Supabase quirks |
| B2B strategy, pricing, buyer list, pitch | **THE-MODERATOR-WAR-CHEST.md** |
| Security rules, file conventions, build system | **CLAUDE.md** |
| Security & identity roadmap (YubiKey, WebAuthn, passkeys) | **THE-MODERATOR-SECURITY-ROADMAP.md** |
| Cross-file feature work / "what breaks if I change X?" | **THE-MODERATOR-WIRING-MANIFEST.md** — repo only, not in project knowledge. Pre-TS file refs, patterns still valid |
| Session history, past decisions, how we got here | **THE-MODERATOR-OLD-TESTAMENT.md** — repo only, not in project knowledge. Sessions 1-228 |
| Live debate feed feature (unbuilt) | **LIVE-DEBATE-FEED-SPEC.md** — repo only. 77 design questions answered. Referenced as F-51 in Punch List |
| QA / manual regression testing | **THE-MODERATOR-TEST-WALKTHROUGH.md** — repo only. Stale, needs full rewrite |

---

# 1. WHAT THIS IS

- Live audio debate platform / emergence engine
- Users hang out in themed sections, post hot takes, react, debates emerge from disagreements
- Four core mechanics: Post → React → Challenge → Structure appears
- Revenue: free platform → B2B data licensing + structural ad inventory. Consumer subs/tokens shelved at launch.
- Philosophy: digital third place — not a destination, a place you're already in
- Name: **The Moderator** (locked — renamed from The Colosseum, Session 160)
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

# 4. KEY DECISIONS (LOCKED)

- Target male opinion culture 16-65, mobile-forward
- Real-dollar tipping replaces token microtransactions
- Profile Depth System: 20 sections, 100 Qs (expanded Session 164), mixed rewards, free at launch
- Async debate mode is survival-critical (liquidity problem)
- Predictions = core engagement loop
- Spoke carousel (6 tiles, hollow center, 18 degree tilt, thumb-spin)
- Visual: Antonio font (display + UI + body), cyberpunk neon palette (cyan/magenta/orange on black), frosted glass cards. All styles via `var(--mod-*)` CSS tokens. (Updated Session 205 — replaced Cinzel/Barlow/navy/gold)
- Login: OAuth dominant, email collapsed behind toggle
- All table writes locked behind server functions — client JS uses `supabase.rpc()` for all mutations
- Bot-driven growth: fully automated 24/7 bot army, $6-16/mo actual cost
- Groq free tier for bot army AI only: Llama 3.3 70B versatile (`llama-3.1-70b` is decommissioned). Edge Functions (ai-sparring, ai-moderator) use Claude/Anthropic (Session 220).
- Leg 3: Auto-Debate Rage-Click Engine — AI generates full debates, scores lopsided, posts rage-bait
- Controversial scoring IS the marketing — AI deliberately picks the unpopular winner
- `react_hot_take()` is a toggle function — single RPC for add/remove
- Guest access is default — anonymous users see the full app, auth only for actions
- Auth init: `onAuthStateChange INITIAL_SESSION` is sole init path. `noOpLock` in `createClient`. 6s safety timeout (fixed Session 163 — was 4s, caused auth redirect loop bug).
- Three-zone architecture: Static Mirror (Cloudflare Pages) + Plinko Gate (login/signup) + Members Zone (Vercel)
- Arena supports 4 debate modes: Live Audio, Voice Memo (async), Text Battle, AI Sparring
- AI Sparring is instant-start — always-available opponent for cold-start liquidity
- Ranked vs Casual: Casual = open, no profile, Elo frozen. Ranked = 25%+ profile, Elo moves.
- Groups + Group vs Group: schema, UI, Group Elo all built and wired
- Public profile pages: `/u/username` via Vercel serverless, dynamic OG tags, Google-indexable
- Funnel analytics: `src/analytics.ts` (visitor UUID, auto page_view, referrer/UTM capture, signup detection)
- Tokens are **earned only, never purchased** — displayed as prestige signal, not currency
- Content-first bot strategy: native image posts with ESPN-style share cards stop the scroll; text+link spam is dead
- **Mobile distribution:** PWA first (manifest + service worker). TWA wrapper for Google Play later. Apple App Store deferred. Capacitor is fallback if native shell needed. No native rewrite. (Session 152)

### Open Decisions
- Launch date: what's real?
- Subscription pricing: $9.99/$19.99/$29.99 tiered model (current schema) or flat $14.99? Not active at launch but needs lock before Stripe goes live.
- Minors policy: full app with restrictions, or separate gated experience?
- Stripe production: when to switch from sandbox to live? Before or after first real users?
- ~~PWA: when to add manifest + service worker? Prerequisite for TWA and Add to Home Screen.~~ ✅ Session 233. Manifest + service worker live.

---

# 5. THREE CORE PROBLEMS

1. **Money pipe connected** — Stripe Checkout live (sandbox), Edge Functions deployed, webhooks listening. Still sandbox mode.
2. **Single-player to multiplayer (in progress)** — follows, modals, predictions, rivals, arena, 4 debate modes, AI sparring, guest access, waiting room (F-01), match accept/decline (F-02), private lobby (F-46) all complete. Needs real users.
3. **No audience** — Bot army quarantined (growth strategy discontinued, Session 195). VPS remains up ($6/mo), PM2 idle. No active posting on any platform.

---

# 6. ARCHITECTURE — CASTLE RING MODEL

- Ring 6 — Public Surface: Static Mirror on Cloudflare Pages, pure HTML, zero JS, zero auth
- Ring 5 — User Interaction: live debates, spectator chat, voting, hot takes, reactions, arena
- Ring 4 — Accounts & Trust: auth, profiles, trust scores, cosmetics, achievements
- Ring 3 — Platform Data: recordings, transcripts, Elo, sanitize, rate_limits, 30+ SECURITY DEFINER functions — COMPLETE
- Ring 2 — Financial Core: Stripe, subs, token ledger — CORS hardened
- Ring 1 — B2B Intelligence: aggregated sentiment, API-gated — NOT STARTED
- The Keep — Physical Gate: air-gapped backups, YubiKey — NOT STARTED

---

# 7. WHAT ACTUALLY EXISTS

## Infrastructure Summary

Supabase (faomczmipsccwbhpivmp): 43+ tables, RLS hardened, 174 server functions (fully exported and in sync as of S227), sanitization, rate limits, 9 analytics views, 3 security views. Token system complete. Token staking + power-up systems complete (5 tables, 7 RPCs, tested end-to-end). Arena fully built (4 modes). AI Sparring live (Claude/Anthropic via ai-sparring Edge Function — two modes: debate response + 4-criteria scoring). AI Moderator live (Claude/Anthropic via ai-moderator Edge Function). Moderator UI built. Reference Arsenal live. Groups + GvG live. Predictions live — wager picker (1-500 tokens), refund-on-update with net charge (S227). Waiting room (F-01), match accept/decline (F-02), private lobby (F-46) all complete. F-47 Moderator Marketplace: fully complete — SQL Phases 1-3, Client Steps 1-7, 8 test cases passing. F-48 Mod-Initiated Debate: fully complete (Session 210). Live debate feed schema complete (Session 178). app_config table: economy constants — editable without deploy (Session 195). Amplified/Unplugged ruleset system complete (Session 209). Cloudflare TURN server live (Session 221) — turn-credentials Edge Function fetches short-lived creds, client falls back to STUN. WebRTC ICE restart + 30s setup timeout (Sessions 221-222). Vercel (themoderator.app): auto-deploys from GitHub, Vite build live (Session 130). BASE_URL env var set. Bot army QUARANTINED (growth strategy discontinued, Session 195) — VPS ($6/mo, Ubuntu 24.04, NYC3, IP 161.35.137.21) remains up, PM2 idle. Security audit FULLY CLOSED (80 bugs across 18 files, Sessions 1-18 of audit). Full app recon complete (Sessions 212-214). All critical/high/medium/low bugs closed or dormant. RPC security audit complete (Sessions 226): 9 RPC hardening fixes deployed (token_balance CHECK, race condition FOR UPDATE locks, auth checks on debit_tokens/finalize_debate, duplicate claim prevention). Group RPC audit complete (Session 226). TypeScript migration complete: 30+ .ts files in src/, 19 bot army .ts files. Vitest: 113 tests passing. Zero legacy script tags. Design token migration complete (Session 205). All inline onclick handlers removed (Session 224) — CSP script-src unsafe-inline removable. Session 206: `/go` guest AI Sparring page live. 5 moderator discovery touchpoints deployed (F-50). supabase-deployed-functions-export.sql fully in sync with production (174 RPCs, re-exported S227).

## Toolchain
| Tool | Purpose |
|------|---------|
| Claude (chat sessions) | Primary build partner, architecture, code generation, bible maintenance |
| Claude Code (CLI) | Codebase-wide audits, bulk automated fixes |
| GitHub web UI | File deployment (drag-and-drop upload) |
| Supabase dashboard | Schema source of truth, SQL execution, RLS management |
| DigitalOcean VPS | Bot army hosting, mirror generator, PM2 |
| Vercel | Frontend hosting, auto-deploy from GitHub, Vite build |
| Cloudflare Pages | Static mirror hosting |

## TypeScript Source Modules (src/*.ts)
| File | Purpose |
|------|---------|
| `src/app-config.ts` | Economy constants loader: fetches milestone tokens/freezes + power-up costs from `app_config` table. 60-min cache, fallback to hardcoded. (Session 195) |
| `src/config.ts` | Central config, credentials, feature flags, `escapeHTML()`, `showToast()`, `friendlyError()` |
| `src/auth.ts` | Auth, profile CRUD, follows, rivals, moderator RPCs, `safeRpc()`, `updateModCategories()` |
| `src/payments.ts` | Stripe Checkout, token purchases |
| `src/notifications.ts` | Notification center |
| `src/paywall.ts` | 4 contextual paywall variants, `gate()` helper |
| `src/async.ts` | Hot takes feed, predictions, rivals display, react toggle, challenge modal. First-vote nudge wired (Session 190). |
| `src/share.ts` | Web Share API, clipboard, referrals, deep links |
| `src/leaderboard.ts` | Elo/Wins/Streak tabs, time filters, My Rank |
| `src/cards.ts` | Canvas share card generator, 4 sizes, ESPN aesthetic |
| `src/arena.ts` | Arena: lobby, 4 modes, matchmaking, debate room, AI sparring, moderator UX, ranked/casual |
| `src/scoring.ts` | Elo, XP, leveling (SELECT reads only) |
| `src/tokens.ts` | Token economy: milestones, streak freeze, daily login, gold coin fly-up animation |
| `src/tiers.ts` | Tier utility: 6 tiers (Unranked to Legend), `getTier()`, `renderTierBadge()`, `renderTierProgress()` |
| `src/staking.ts` | Token staking: `placeStake()`, `getPool()`, `settleStakes()`, parimutuel pool |
| `src/powerups.ts` | Power-up system: buy, equip, shop, loadout, 4 power-ups (2x Multiplier, Silence, Shield, Reveal) |
| `src/webrtc.ts` | WebRTC audio via Supabase Realtime channels |
| `src/voicememo.ts` | Voice memo mode |
| `src/analytics.ts` | Funnel analytics: visitor UUID, page_view, UTM. Uses raw fetch() — intentional, fires before auth init. |
| `src/navigation.ts` | Register/call pattern for page navigation. Zero window.navigateTo refs. (Session 163) |
| `src/nudge.ts` | Polite engagement toast engine. Suppression: once per session per ID, 24h cooldown per ID, 3-per-session cap. (F-35B, Session 190) |
| `src/reference-arsenal.ts` | 5-step forge form, reference card renderer, arsenal list + library browser (Session 147) |
| `src/rivals-presence.ts` | Rival online alert popup — injected CSS + DOM, slide-in/out animation, challenge/dismiss buttons |

## Page Modules (src/pages/*.ts)
`home.ts`, `login.ts`, `plinko.ts`, `settings.ts`, `profile-depth.ts`, `debate-landing.ts`, `auto-debate.ts`, `spectate.ts`, `groups.ts`, `terms.ts`

## HTML Pages
| File | Purpose |
|------|---------|
| `index.html` | Spoke carousel home, category overlays, pull-to-refresh |
| `moderator-login.html` | OAuth-dominant login, age gate, password reset |
| `moderator-settings.html` | All settings toggles incl. moderator category chips (F-47 Step 4) |
| `moderator-profile-depth.html` | 20 sections, 100 Qs, saves to DB via safeRpc |
| `moderator-terms.html` | Terms of Service |
| `moderator-privacy.html` | Privacy Policy |
| `moderator-debate-landing.html` | Ungated landing, vote without signup, OG tags |
| `moderator-auto-debate.html` | AI vs AI debate page, ungated voting, rage-click funnel |
| `moderator-plinko.html` | Plinko Gate — 5-step signup (OAuth, Age, Username, Moderator Opt-In, Done). Session 206: mod opt-in step added. |
| `moderator-groups.html` | Groups: discover, rankings, challenges, GvG. Bottom tab bar (Session 205). |
| `moderator-spectate.html` | Spectator view for live debates |
| `moderator-go.html` | `/go` — Guest AI Sparring. No auth, no DB. Topic input, For/Against, voice/text, 3 rounds, running score, verdict. Session 206. |

## Database: 30+ SQL migrations, 43+ tables, 174 server functions (fully exported S227)
## Supabase Edge Functions: ai-sparring (Claude/Anthropic), ai-moderator (Claude/Anthropic), turn-credentials (Cloudflare TURN), create-checkout-session (Stripe, sandbox)
## Vercel Serverless: api/profile.js (public profiles at /u/username), api/challenge.js (F-39 challenge links), api/go-respond.js (guest AI Sparring, calls Groq)

## VPS Bot Files (TypeScript — source .ts in repo, compiled .js in dist/)
- `bot-engine.ts` — PM2-managed orchestrator, legs 1/2/3
- `bot-config.ts` — Env loader, platform flags, timing config
- `card-generator.ts` — Server-side ESPN share card PNG generator
- `leg2-bluesky-poster.ts` — Image-first Bluesky posting with uploadBlob()
- `ai-generator.ts` — Auto-debate AI content + template fallback (125 combos/side)
- `supabase-client.ts` — Bot Supabase client + CATEGORY_TO_SLUG mapping
- `category-classifier.ts` — Keyword-based headline to category router (word-boundary regex). Keywords now loaded from `classifier_keywords` Supabase table (Session 195). Fallback to hardcoded arrays if DB unavailable.

## Legal Compliance
Privacy Policy live. Terms of Service live. AI content labeling deployed. DMCA agent registered (Session 204, tracking ID 280U2D1K, status: Payment Processing). Legal emails NOT created (need domain).

---

# 8. PRODUCT PHILOSOPHY

- **Emergence Engine** — not a debate app, a social system where debates emerge
- **Third Place Theory** — the bar, not the arena. Presence over sessions.
- **Spectators Are the Product** — design for the 90% who watch
- **Casual Is King** — protected lobbies, no sharks in casual waters
- **Reciprocal Gating** — can't unlock cosmetic until profile section complete
- **Liquidity Problem** — text async, voice memo, AI sparring solve cold-start
- **Mute-First Design** — 92% of mobile users view with sound off. Platform must work on mute: gauge, vote percentages, text feed, reactions. Audio is the premium layer, not the required one. Inverse of Clubhouse.
- **Structural Ads** — no banners (0.05% CTR, 86% blindness). Ads live at natural transition points: round breaks, score reveals, lobby fills. Unskippable because they're part of the game flow, not interruptions. Three tiers: live breaks (premium), replay breaks, highlight pre-rolls.
- **Thumb Zone** — all interaction elements in bottom third of screen. 75% of mobile users navigate with thumbs. 44px minimum touch targets.
- **Polite Nudge** — every message is polite first, nudge second. User never feels sold to. Implemented in nudge.ts with suppression rules (once/session, 24h cooldown, 3/session cap).
- **Psychology Framework** — Cialdini principles (social proof, scarcity/FOMO, unity, reciprocity) + primal triggers (visual dominance, contrast, self-interest). Detailed in War Chest for B2B pitch.

---

# 9. DESIGN DNA

- Cyberpunk neon aesthetic — frosted glass cards, neon accent stripes, wet-pavement reflections
- Palette: black base, cyan (trust), magenta (competition), orange (action)
- Fonts: Antonio (display + UI + body) — all via `var(--mod-font-display)` / `var(--mod-font-ui)` tokens
- Background: pure black `#000000` (dark theme), `#eaeef2` (light theme)
- Cards: frosted glass `rgba(22,28,38,0.78)` + backdrop-filter blur + left neon stripe + gloss overlay
- Design tokens: `src/moderator-tokens.css` (dark + light themes, semantic accent colors, typography, spacing, z-index). Shell layout: `src/lcars-shell.css` (header, tab bar, feed, cards, screen system, loading).
- Session 205: All inline styles in .ts files migrated to CSS token variables. Zero hardcoded hex colors or old fonts remain (except Canvas API in cards.ts).
- Mobile-forward: phone default, 44px touch targets, scroll-snap
- Responsive: @media (min-width: 768px) — .screen max-width 640px centered (Session 165)
- Topic tiers: Tier 1 Politics + Sports, Tier 2 Entertainment + Couples Court, Tier 3 Music/Movies/Cars

---

# 10. BOT-DRIVEN GROWTH

**QUARANTINED — Session 195.** Bot army as a growth strategy has been discontinued. VPS remains up ($6/mo) and files remain in repo for reference, but PM2 is idle and no platforms are actively posting.

Previous architecture (preserved for reference):
- Three-leg architecture: Leg 1 (Reactive), Leg 2 (Proactive), Leg 3 (Auto-Debate Rage-Click)
- Platforms attempted: Bluesky (was live), Lemmy (dead), Reddit (pending API), Discord (deferred)
- Groq TPD cap (100k tokens/day free tier) — falls back to 125-combo template system

---

# 11. WHAT TO DO NEXT

> **All feature work, bugs, and tech debt are tracked in THE-MODERATOR-PUNCH-LIST.md. Read that first.**

## Pat Action Items
- ~~Legal pages @thecolosseum.app emails~~ ✅ Fixed Session 229 (security hardening sessions). Domain email live, legal pages updated.
- Reddit API approval — check email, resubmit if rejected (submitted March 4)
- ~~Register DMCA agent at copyright.gov ($6)~~ ✅ Session 204. Tracking ID 280U2D1K.
- ~~Google OAuth re-enable + SMTP fix~~ ✅ Session 204. Both confirmed working.
- Second YubiKey TOTP seeds for Supabase and Vercel (deferred from Session 3)
- Negative testing — log into each locked service without key to confirm blocked (deferred from Session 3)

**Session 229 Doc Cleanup — Pat GitHub Actions:**
- Delete from GitHub: `PRODUCT-WALKTHROUGH.md`, `TECHNICAL-AUDIT.md`, `LCARS-Complete-Reference-Guide.md`
- Upload to GitHub: updated `THE-MODERATOR-LAND-MINE-MAP.md`, `THE-MODERATOR-NEW-TESTAMENT.md`, `THE-MODERATOR-PUNCH-LIST.md`
- Remove from project knowledge: `THE-MODERATOR-OLD-TESTAMENT.md`, `THE-MODERATOR-WIRING-MANIFEST.md`, `THE-MODERATOR-TEST-WALKTHROUGH.md`, `THE-MODERATOR-PRODUCT-VISION.md`, `LIVE-DEBATE-FEED-SPEC.md`
- Replace in project knowledge: `THE-MODERATOR-LAND-MINE-MAP.md`, `THE-MODERATOR-NEW-TESTAMENT.md`, `THE-MODERATOR-PUNCH-LIST.md`

## Bug Status (as of Session 228)
- **All critical/high/medium/low bugs: CLOSED** — Sessions 215-227
- **Dormant payment stack (ADV-4, PAY-BUG-1/2/3):** fix before Stripe goes live, 3-6 months out minimum
- **SESSION-218-BUG-TRACKER.md:** removed from project knowledge (S228), served its purpose
- **Remaining deferred items:** notifications polling (no scale issue), Stripe CDN (dormant), Stripe idempotency (dormant), browser test coverage (deferred), legal page emails (blocked on domain email)

## Monitoring
- Cloudflare Web Analytics — check for real visits
- Supabase: bot_stats_24h + auto_debate_stats + event_log (historical data intact)

---

# 12. CRITICAL TECHNICAL NOTES

> These are the things that bite hardest without a full Land Mine Map read. Grouped by area.

## Database / Schema
- **Single canonical debate table: `arena_debates`** — legacy `debates` table eliminated Session 101.
- **`guard_profile_columns` trigger** protects 4 columns: `level`, `xp`, `streak_freezes`, `questions_answered`. Raises exception on direct UPDATE for non-service roles. SECURITY DEFINER RPCs bypass it. Older docs incorrectly listed 21 columns — it's 4.
- **Token balance column is `token_balance`** (not `tokens`). See LM-174. CHECK constraint `token_balance >= 0` added Session 226 (defense-in-depth).
- **All mutations go through `.rpc()` calls** — never direct INSERT/UPDATE from client.
- **Supabase dashboard is schema source of truth** — verify column names before assuming.
- **`token_earn_log` column is `earn_type` not `action`** (LM-179). Milestones stored as 'milestone:key_name' with NULL reference_id.
- **PostgREST 404s on untyped record returns** (LM-180). RPCs must use RETURNS TABLE(...) not bare record.
- **All `log_event` calls MUST use named parameters** (LM-188). Every call: `log_event(p_event_type :=, p_user_id :=, p_debate_id :=, p_category :=, p_side :=, p_metadata :=)`. Full audit Session 151 — zero positional calls remain.
- **`place_prediction` takes TEXT not UUID** for `p_predicted_winner` ('a'/'b'). S226 migration changed it to UUID, S227 reverted to TEXT with IN ('a','b') validation. All S226 security fixes preserved.
- **`supabase-deployed-functions-export.sql` is fully in sync** with production (174 RPCs, re-exported Session 227). Keep it in sync — re-export after any future RPC changes.

## Auth
- **`navigator.locks` orphan bug** — noOpLock mock must load before Supabase CDN. Lives in `src/auth.ts`.
- **Auth safety timeout is 6000ms** (was 4000ms — fixed Session 163). In home.ts, profile-depth.ts, settings.ts.
- **Auth uses `readyPromise` pattern** — never setTimeout for async state. INITIAL_SESSION is sole init path.
- **Google OAuth provider confirmed working** (Session 204).
- **SMTP confirmed working** (Session 204). Resend, port 465, noreply@themoderator.app.
- **DOB stripped from JWT metadata** — handle_new_user trigger strips DOB. set_profile_dob RPC for OAuth users. Session 134.

## Build / Deploy
- **Vite build is live on Vercel** — buildCommand: "npm run build", outputDirectory: "dist". Build script: vite build && cp colosseum-*.js dist/ && cp og-card-default.png dist/. Session 130.
- **Zero legacy script tags** — Every HTML page uses single `<script type="module">`. Session 142.
- **SRI hashes pin supabase-js to @2.98.0** — must regenerate when upgrading.
- **Cloudflare Pages requires `--branch=production`** for production deploys; `--branch=main` routes to Preview.
- **`wrangler login` fails on headless VPS** — use API token approach.

## VPS / Bot Army
- **VPS git root is `/opt/colosseum`** — NOT `/opt/colosseum/bot-army/colosseum-bot-army/`. Deploy commands (Edge Functions, git pull) must run from `/opt/colosseum`.
- **VPS `.env` edits require `pm2 restart all`** to take effect.
- **Bot platform wiring requires THREE updates** (LM-149): config object + flags block in bot-config.ts + formatFlags() in bot-engine.ts. Missing any one = silent failure.
- **VPS file copies**: always use `\cp` (backslash prefix) to bypass `cp -i` alias. Always verify with grep after copy.
- **ecosystem.config.js env block overrides .env** — stripped all platform flags Session 94. .env is single source of truth.
- **Bot category to mirror slug mapping** — bot uses `couples`, mirror uses `couples-court`. CATEGORY_TO_SLUG in supabase-client.ts handles this.
- **Mirror generator path** — /opt/colosseum/colosseum-mirror-generator.js (NOT inside bot-army dir). Cron sources /opt/colosseum/mirror.env.
- **Bot army runs TypeScript** — PM2 runs dist/bot-engine.js (compiled from .ts). Original .js files are rollback only.
- **Supabase API keys**: bot army and mirror use legacy JWT format (eyJ...), not new sb_secret_* format.

## Stripe
- **Stripe webhook body must be read with `req.text()`** to preserve raw body for HMAC.

## Navigation / Frontend
- **`navigateTo` uses register/call pattern** — src/navigation.ts. Zero window.navigateTo refs. Session 163.
- **Arena popstate: replaceState for forward, history.back for back** (LM-183). Arrow function wrapping required on listeners.
- **Groups page is separate HTML** — `moderator-groups.html` is not an inline SPA screen. Has its own bottom tab bar (Session 205). Other tabs link back to `index.html?screen=X`.

## Arena / Debates
- **AI debates must be created as `'pending'` not `'live'`** (LM-184). Flip to live happens in enterRoom() only.
- **Arena debate queue** — join_debate_queue() uses two-phase match: strict category first, then any-category fallback. queue_count scoped to mode + category (Session 170).
- **Match acceptance** — respond_to_match + check_match_acceptance RPCs. player_a_ready/player_b_ready columns. 12s countdown. (Session 168)
- **Token staking + power-up ALL PHASES COMPLETE** (Sessions 108-110/117-118/123-124). Phase 6 (polish/balance) remains.
- **Edge Functions use Claude/Anthropic** (Session 220) — `ANTHROPIC_API_KEY` in Supabase env vars. `GROQ_API_KEY` is only used by bot army on VPS and api/go-respond.js on Vercel.
- **AI Sparring has two modes** — `mode: 'score'` for 4-criteria judging (Logic/Evidence/Delivery/Rebuttal), default for debate responses. Both via Claude.
- **Prediction system** — wager picker UI (1-500 tokens), refund-on-update with net charge calculation (Session 227). `place_prediction` takes TEXT ('a'/'b') for `p_predicted_winner`.
- **localStorage key is `moderator_settings`** (renamed from `colosseum_settings`, Session 227). Migration code reads old key on first load, copies to new, deletes old.

## F-47 Moderator Marketplace (Sessions 173-174)
- profiles.mod_categories TEXT[] DEFAULT '{}' + GIN index
- arena_debates.mod_status TEXT DEFAULT 'none' CHECK ('none'/'waiting'/'requested'/'claimed')
- arena_debates.mod_requested_by UUID NULL
- Partial index on arena_debates (mod_status) WHERE mod_status = 'waiting'
- **FOR UPDATE SKIP LOCKED** used in request_to_moderate RPC — race-condition-safe mod claim. First mod to lock the row wins; others skip.
- mod_status = 'waiting' debates sit inside their category. 3-minute timeout before reset on no debater response. Debaters cannot cancel mod request — hard gate.
- `browse_mod_queue()` — RETURNS TABLE with `debate_id` (not `id` — ambiguity fix), filters `status IN ('pending','lobby','matched','live')`. Caller must be `is_moderator=true AND mod_available=true`.
- `request_mod_for_debate(p_debate_id)` — sets `mod_status='waiting'`. Guard: caller must be debater_a or debater_b, mod_status must be 'none' (idempotent on repeat call).
- `get_debate_mod_status(p_debate_id)` — returns {mod_status, mod_requested_by, moderator_display_name}. Caller must be debater.
- Client: MOD QUEUE button in Arena lobby, gated by is_moderator. showModQueue() view with 5s poll. claimModRequest() handles race condition gracefully.
- Client: startModStatusPoll(debateId) runs in debate room (4s interval), surfaces showModRequestModal when mod_status='requested'. 30s auto-decline countdown.
- selectedWantMod resets on renderLobby(). Modal cleaned up in endCurrentDebate().
## Session 209 — Amplified vs Unplugged Ruleset System
- `arena_debates.ruleset` TEXT column, DEFAULT 'amplified', CHECK ('amplified', 'unplugged')
- Amplified = default. Boosts, Elo, tokens, staking — everything on.
- Unplugged = stripped. No boosts, no Elo, no tokens. Staking allowed. Scoring determines winner.
- AI Sparring always Amplified (no picker).
- `update_arena_debate` — Elo gate includes `AND COALESCE(v_debate.ruleset, 'amplified') != 'unplugged'`. Unplugged skips Elo, XP, stats, group Elo.
- `join_debate_queue` — new `p_ruleset` param, passes through to INSERT.
- `create_private_lobby` — new `p_ruleset` param, passes through to INSERT.
- `get_arena_feed` — returns ruleset column. Auto-debates hardcoded as 'amplified'.
- Client: 3-step picker (Ranked/Casual → Amplified/Unplugged → Mode). Unplugged debate room hides ELO, power-ups, spectator bar. Post-debate skips token claims. Feed has 🎸 UNPLUGGED section. CSS: `.arena-rank-badge.unplugged` (warm amber #c29a58).

## F-48 Mod-Initiated Debate (Session 210)
- `arena_debates.debater_a` ALTER to allow NULL (mod creates before debaters join).
- `create_mod_debate(p_mode, p_topic, p_category, p_ranked, p_ruleset)` — moderator-only. Inserts row with debater_a=NULL, debater_b=NULL, moderator_id=caller, mod_status='claimed', visibility='code'. Generates 6-char join code. Returns debate_id + join_code.
- `join_mod_debate(p_join_code)` — fills first empty slot (debater_a if NULL, else debater_b). Second joiner sets status='matched'. FOR NO KEY UPDATE SKIP LOCKED for race safety. Guards: not the mod, not already joined, not full.
- `check_mod_debate(p_debate_id)` — polled by mod and first-join debater (4s). Returns status, both debater names/IDs, topic, ruleset.
- `cancel_mod_debate(p_debate_id)` — moderator-only, lobby status only, sets status='cancelled'.
- Client: CREATE DEBATE button in Mod Queue → showModDebatePicker (mode, category, topic, ranked, ruleset) → createModDebate → showModDebateWaitingMod (join code + slot names). Debaters enter code via joinWithCode → join_private_lobby fails → falls back to join_mod_debate. First joiner gets waiting screen, second joiner gets matchFound. Mod enters room in modView=true (observer). Cancel calls cancel_mod_debate (not cancel_private_lobby).

## Session 178 — Live Debate Feed + Moderator Scoring + Dropout Penalties
- `debate_feed_events` table — append-only B2B archive, one row per event (speech, reference_cite, reference_challenge, point_award, mod_ruling, round_divider, sentiment_vote, power_up). Columns: id BIGSERIAL, debate_id, user_id (NULL for system events), event_type, round (0-10), side (a/b/mod), content, score (1-5 for point_award), reference_id, metadata JSONB, created_at. SELECT public. INSERT/UPDATE/DELETE blocked (SECURITY DEFINER only). Trigger: broadcast_feed_event → realtime.broadcast_changes on private channel 'debate:<uuid>'.
- `mod_dropout_log` table — append-only, one row per moderator dropout. Columns: id BIGSERIAL, moderator_id, debate_id, cooldown_minutes, offense_number, created_at. "Daily reset" = count WHERE created_at >= date_trunc('day', now() UTC). No cron.
- `arena_debates.scoring_budget_per_round` INT DEFAULT NULL — parked. NULL = unlimited. Enforced by score_debate_comment when non-null.
- `insert_feed_event(p_debate_id, p_event_type, p_round, p_side, p_content, p_score, p_reference_id, p_metadata)` — role-validates by event type, double-writes to event_log. Does NOT handle point_award (use score_debate_comment).
- `get_feed_events(p_debate_id, p_after, p_limit)` — backfill on reconnect or full replay. p_after=NULL = all events. Hard cap 1000.
- `score_debate_comment(p_debate_id, p_feed_event_id, p_score)` — moderator-only. Atomically increments score_a or score_b on arena_debates, inserts point_award with running totals in metadata. Double-scoring guard via EXISTS check. Writes DIRECTLY to debate_feed_events (not via insert_feed_event). See LM-191.
- `pin_feed_event(p_debate_id, p_feed_event_id)` — moderator-only, toggles metadata.pinned on speech events. Only UPDATE exception on append-only table. No broadcast. See LM-192.
- `record_mod_dropout(p_debate_id)` — debater-only, human-moderated live debates only. Nulls debate (status→cancelled), logs dropout, inserts synthetic 0-score into moderator_scores (ON CONFLICT DO NOTHING), recalculates mod_approval_pct. Idempotent: second caller gets { already_processed: true }. See LM-194.
- `check_mod_cooldown(p_moderator_id)` — call before showing "Accept" on browse_mod_queue. Returns { in_cooldown, dropouts_today, cooldown_expires_at, cooldown_remaining_seconds, next_offense_cooldown_minutes }.
- `get_mod_cooldown_minutes(p_offense_number)` — IMMUTABLE helper. 1→10min, 2→60min, 3+→1440min.
- **Broadcast private channels require setAuth() + { config: { private: true } }** — see LM-193.
- **Supabase Dashboard → Realtime → Settings: "Allow public access" must be DISABLED** for private channels to work.

---

*For all session build logs (1-210) — see the Old Testament. For documented pitfalls — see the Land Mine Map. For open work — see the Punch List.*
