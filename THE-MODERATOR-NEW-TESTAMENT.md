# THE MODERATOR — NEW TESTAMENT (Project Knowledge Edition)
### Last Updated: Session 179 (March 26, 2026)

> **This is the condensed NT for Claude Project Knowledge.** It loads automatically every session.
> Build logs live in the Old Testament. Land Mine Map stays in the repo — pull only when doing schema/auth/deployment work.
> Session handoffs go in the chat message, not this file.
>
> **Other bible docs (repo, read when relevant):**
> - `THE-MODERATOR-OLD-TESTAMENT.md` — All session build logs (1-173), 502+ item inventory, revenue model, B2B data play, growth strategy
> - `THE-MODERATOR-LAND-MINE-MAP.md` — 189+ documented pitfalls, failure modes, fixes. **Read before any SQL, schema, auth, or deployment change.**
> - `THE-MODERATOR-WIRING-MANIFEST.md` — Full C4-style architecture model. Every RPC, global, flow mapped. (Session 122)
> - `THE-MODERATOR-WAR-CHEST.md` — B2B intelligence play, auction model, pricing tiers, buyer list
> - `THE-MODERATOR-PRODUCT-VISION.md` — Psychology framework, visual game layer, ad placement, gamification
> - `THE-MODERATOR-WAR-PLAN.md` — 5-phase strategy, shelved ideas, open decisions
> - `MODERATOR-FEATURE-ROOM-MAP.md` — Every idea placed into existing 6-chart architecture + 7 new rooms (Session 106)
> - `THE-MODERATOR-PUNCH-LIST.md` — **Single source of truth for all open work: housekeeping, bugs, features.**
> - `TOKEN-STAKING-POWERUP-PLAN.docx` — Token staking + power-up implementation plan (Session 108)
> - `CLAUDE.md` — Claude Code guidance file (security rules, file conventions, architecture)

---

# 1. WHAT THIS IS

- Live audio debate platform / emergence engine
- Users hang out in themed sections, post hot takes, react, debates emerge from disagreements
- Four core mechanics: Post React Challenge Structure appears
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

# 4. KEY DECISIONS

- Target male opinion culture 16-65, mobile-forward
- Real-dollar tipping replaces token microtransactions
- Profile Depth System: 20 sections, 100 Qs (expanded Session 164), mixed rewards, free at launch
- Async debate mode is survival-critical (liquidity problem)
- Predictions = core engagement loop
- Spoke carousel (6 tiles, hollow center, 18 degree tilt, thumb-spin)
- Visual: Cinzel + Barlow Condensed, diagonal gradient, dark frosted glass cards, navy/red/white/gold
- Login: OAuth dominant, email collapsed behind toggle
- All table writes locked behind server functions — client JS uses `supabase.rpc()` for all mutations
- Bot-driven growth: fully automated 24/7 bot army, $6-16/mo actual cost
- Groq free tier for AI: Llama 3.3 70B versatile (`llama-3.1-70b` is decommissioned)
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
- Domain: thecolosseum.app or keep current URLs?
- PWA: when to add manifest + service worker? Prerequisite for TWA and Add to Home Screen.

---

# 5. THREE CORE PROBLEMS

1. **Money pipe connected** — Stripe Checkout live (sandbox), Edge Functions deployed, webhooks listening. Still sandbox mode.
2. **Single-player to multiplayer (in progress)** — follows, modals, predictions, rivals, arena, 4 debate modes, AI sparring, guest access, waiting room (F-01), match accept/decline (F-02), private lobby (F-46) all complete. Needs real users.
3. **No audience** — Bot army deployed, DRY_RUN=false. Bluesky image posting LIVE. Leg 1 ENABLED (10 replies/day). Lemmy DEAD. Reddit pending API approval. Discord deferred.

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

Supabase (faomczmipsccwbhpivmp): 43+ tables, RLS hardened, 62+ server functions, sanitization, rate limits, 9 analytics views, 3 security views. Token system complete. Token staking + power-up systems complete (5 tables, 7 RPCs, tested end-to-end). Arena fully built (4 modes). AI Sparring live (Groq). Moderator UI built. Reference Arsenal live. Groups + GvG live. Predictions live. Waiting room (F-01), match accept/decline (F-02), private lobby (F-46) all complete. F-47 Moderator Marketplace: fully complete — SQL Phases 1-3, Client Steps 1-7 (renderModScoring: debater 👍/👎, spectator slider), 8 test cases passing. Live debate feed schema complete (Session 178): debate_feed_events table, mod_dropout_log table, 7 new RPCs. Vercel (themoderator.app): auto-deploys from GitHub, Vite build live (Session 130). BASE_URL env var set. Bot army on DigitalOcean VPS ($6/mo, Ubuntu 24.04, NYC3, IP 161.35.137.21), PM2 managed, DRY_RUN=false. Security audit FULLY CLOSED. TypeScript migration complete: 30+ .ts files in src/, 19 bot army .ts files. Vitest: 113 tests passing. Zero legacy script tags.

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
| `moderator-plinko.html` | Plinko Gate — 4-step signup (OAuth, Age, Username, Done) |
| `moderator-groups.html` | Groups: discover, rankings, challenges, GvG |
| `moderator-spectate.html` | Spectator view for live debates |

## Database: 25+ SQL migrations, 41+ tables, 55+ server functions
## Supabase Edge Functions: ai-sparring, ai-moderator, stripe-* (templates)
## Vercel Serverless: api/profile.js (public profile pages at /u/username)

## VPS Bot Files (TypeScript — source .ts in repo, compiled .js in dist/)
- `bot-engine.ts` — PM2-managed orchestrator, legs 1/2/3
- `bot-config.ts` — Env loader, platform flags, timing config
- `card-generator.ts` — Server-side ESPN share card PNG generator
- `leg2-bluesky-poster.ts` — Image-first Bluesky posting with uploadBlob()
- `ai-generator.ts` — Auto-debate AI content + template fallback (125 combos/side)
- `supabase-client.ts` — Bot Supabase client + CATEGORY_TO_SLUG mapping
- `category-classifier.ts` — Keyword-based headline to category router (word-boundary regex)

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
- Background: diagonal gradient (#1a2d4a to #2d5a8e to #5b8abf to #7aa3d4 to #3d5a80)
- Cards: dark frosted glass (rgba(10,17,40,0.6)) + backdrop-filter blur
- Mobile-forward: phone default, 44px touch targets, scroll-snap
- Responsive: @media (min-width: 768px) — .screen max-width 640px centered (Session 165)
- Topic tiers: Tier 1 Politics + Sports, Tier 2 Entertainment + Couples Court, Tier 3 Music/Movies/Cars

---

# 10. BOT-DRIVEN GROWTH

- Three-leg architecture: Leg 1 (Reactive), Leg 2 (Proactive), Leg 3 (Auto-Debate Rage-Click)
- Content-first strategy: Native image posts with ESPN-style share cards stop the scroll; text+link spam is dead
- Daily capacity: ~370 L1 mentions, 5-10 L2 posts, 3 L3 auto-debates
- Combined daily reach: ~6,000-40,000+ impressions
- Actual monthly cost: $6-16/mo
- Bot army LIVE (DRY_RUN=false). All bot links to colosseum-f30.pages.dev (mirror).
- Platforms: Bluesky LIVE (image posting + Leg 1 replies enabled, 10/day). Lemmy DEAD. Reddit pending. Discord deferred.
- Groq TPD cap (100k tokens/day free tier) — falls back to 125-combo template system.

---

# 11. WHAT TO DO NEXT

> **All feature work, bugs, and tech debt are tracked in THE-MODERATOR-PUNCH-LIST.md. Read that first.**

## Pat Action Items
- Reddit API approval — check email, resubmit if rejected (submitted March 4)
- Register DMCA agent at copyright.gov ($6)
- Purchase domain thecolosseum.app
- Google OAuth re-enable + SMTP fix (currently: signup via Google fails, email confirm broken)

## Monitoring
- Leg 1 Bluesky — `pm2 logs` for [LEG1][BLUESKY], watch follower count on wolfe8105.bsky.social
- Cloudflare Web Analytics — check for real visits
- Bot stats: bot_stats_24h + auto_debate_stats + event_log + pm2 logs

---

# 12. CRITICAL TECHNICAL NOTES

These are the things that bite hardest. Full details in the Land Mine Map.

- **Single canonical debate table: `arena_debates`** — legacy `debates` table eliminated Session 101.
- **`guard_profile_columns` trigger** protects 4 columns: `level`, `xp`, `streak_freezes`, `questions_answered`. Raises exception on direct UPDATE for non-service roles. SECURITY DEFINER RPCs bypass it. Note: older docs incorrectly listed 21 columns — corrected Session 117.
- **Token balance column is `token_balance`** (not `tokens`). See LM-174.
- **All mutations go through `.rpc()` calls** — never direct INSERT/UPDATE from client
- **Supabase dashboard is schema source of truth** — verify column names before assuming
- **`navigator.locks` orphan bug** — noOpLock mock must load before Supabase CDN. Lives in `src/auth.ts`.
- **Auth safety timeout is 6000ms** (was 4000ms — fixed Session 163). In home.ts, profile-depth.ts, settings.ts.
- **Auth uses `readyPromise` pattern** — never setTimeout for async state. INITIAL_SESSION is sole init path.
- **Cloudflare Pages requires `--branch=production`** for production deploys; `--branch=main` routes to Preview
- **`wrangler login` fails on headless VPS** — use API token approach
- **Stripe webhook body must be read with `req.text()`** to preserve raw body for HMAC
- **VPS `.env` edits require `pm2 restart all`** to take effect
- **SRI hashes pin supabase-js to @2.98.0** — must regenerate when upgrading
- **Groq model is `llama-3.3-70b-versatile`** — `llama-3.1-70b-versatile` is decommissioned
- **Supabase API keys**: bot army and mirror use legacy JWT format (eyJ...), not new sb_secret_* format
- **Bot platform wiring requires THREE updates** (LM-149): config object + flags block in bot-config.ts + formatFlags() in bot-engine.ts. Missing any one = silent failure.
- **VPS file copies**: always use `\cp` (backslash prefix) to bypass `cp -i` alias. Always verify with grep after copy.
- **ecosystem.config.js env block overrides .env** — stripped all platform flags Session 94. .env is single source of truth.
- **Bot category to mirror slug mapping** — bot uses `couples`, mirror uses `couples-court`. CATEGORY_TO_SLUG in supabase-client.ts handles this.
- **Mirror generator path** — /opt/colosseum/colosseum-mirror-generator.js (NOT inside bot-army dir). Cron sources /opt/colosseum/mirror.env.
- **All `log_event` calls MUST use named parameters** (LM-188). Every call: `log_event(p_event_type :=, p_user_id :=, p_debate_id :=, p_category :=, p_side :=, p_metadata :=)`. Full audit Session 151 — zero positional calls remain.
- **Google OAuth provider disabled** (LM-189). Only way to create test accounts: Supabase dashboard with Auto Confirm on.
- **Vite build is live on Vercel** — buildCommand: "npm run build", outputDirectory: "dist". Build script: vite build && cp colosseum-*.js dist/ && cp og-card-default.png dist/. Session 130.
- **Zero legacy script tags** — Every HTML page uses single `<script type="module">`. Session 142.
- **DOB stripped from JWT metadata** — handle_new_user trigger strips DOB. set_profile_dob RPC for OAuth users. Session 134.
- **`navigateTo` uses register/call pattern** — src/navigation.ts. Zero window.navigateTo refs. Session 163.
- **Bot army runs TypeScript** — PM2 runs dist/bot-engine.js (compiled from .ts). Original .js files are rollback only.
- **Token staking + power-up ALL PHASES COMPLETE** (Sessions 108-110/117-118/123-124). Phase 6 (polish/balance) remains.
- **`token_earn_log` column is `earn_type` not `action`** (LM-179). Milestones stored as 'milestone:key_name' with NULL reference_id.
- **PostgREST 404s on untyped record returns** (LM-180). RPCs must use RETURNS TABLE(...) not bare record.
- **Arena popstate: replaceState for forward, history.back for back** (LM-183). Arrow function wrapping required on listeners.
- **AI debates must be created as `'pending'` not `'live'`** (LM-184). Flip to live happens in enterRoom() only.
- **F-47 schema additions (Session 173):**
  - profiles.mod_categories TEXT[] DEFAULT '{}' + GIN index
  - arena_debates.mod_status TEXT DEFAULT 'none' CHECK ('none'/'waiting'/'requested'/'claimed')
  - arena_debates.mod_requested_by UUID NULL
  - Partial index on arena_debates (mod_status) WHERE mod_status = 'waiting'
- **FOR UPDATE SKIP LOCKED** used in request_to_moderate RPC — race-condition-safe mod claim. First mod to lock the row wins; others skip.
- **mod_status = 'waiting' debates** sit inside their category (visible in category feed, not general feed). 3-minute timeout before reset to 'waiting' on no debater response. Debaters cannot cancel mod request — hard gate.
- **Arena debate queue** — join_debate_queue() uses two-phase match: strict category first, then any-category fallback. queue_count scoped to mode + category (Session 170).
- **match acceptance** — respond_to_match + check_match_acceptance RPCs. player_a_ready/player_b_ready columns. 12s countdown. (Session 168)
- **F-47 Steps 5-6 (Session 174):**
  - `browse_mod_queue()` — RETURNS TABLE with `debate_id` (not `id` — ambiguity fix), filters `status IN ('pending','lobby','matched','live')`. Caller must be `is_moderator=true AND mod_available=true`.
  - `request_mod_for_debate(p_debate_id)` — sets `mod_status='waiting'`. Guard: caller must be debater_a or debater_b, `mod_status` must be `'none'` (idempotent on repeat call).
  - `get_debate_mod_status(p_debate_id)` — returns `{mod_status, mod_requested_by, moderator_display_name}`. Caller must be debater.
  - Client: MOD QUEUE button in Arena lobby, gated by `is_moderator`. `showModQueue()` view with 5s poll. `claimModRequest()` handles race condition gracefully.
  - Client: "Request a moderator" toggle in category picker sets `selectedWantMod`. After both players accept (`onMatchConfirmed`), fires `request_mod_for_debate` if toggled — best-effort, never blocks debate entry.
  - Client: `startModStatusPoll(debateId)` runs in debate room (4s interval), surfaces `showModRequestModal` when `mod_status='requested'`. 30s auto-decline countdown. `respond_to_mod_request` called on accept/decline.
  - `selectedWantMod` resets on `renderLobby()`. Modal cleaned up in `endCurrentDebate()`.
  - F-48 concept added: mod-initiated debate (reverse of F-47, reuses F-46 private lobby infrastructure).

- **Session 178 — Live Debate Feed + Moderator Scoring + Dropout Penalties:**
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

*For all session build logs (1-173) — see the Old Testament. For documented pitfalls — see the Land Mine Map. For open work — see the Punch List.*
