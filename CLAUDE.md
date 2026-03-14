# CLAUDE.md — The Colosseum

This file provides guidance to Claude Code when working with this repository.

## What This Is

Live audio debate platform / "emergence engine." Users post hot takes in themed sections, react, challenge each other, and debates emerge from disagreements. Four debate modes: Live Audio, Voice Memo (async), Text Battle, AI Sparring.

Solo founder project. No build step, no bundler, no framework — plain JS modules loaded via `<script>` tags in HTML files. Deployed on Vercel (static frontend + serverless API) with Supabase (Postgres + Auth + Edge Functions + Storage) as the backend.

## Architecture

**Three-zone model:**
- **Ring 6 — Static Mirror** (Cloudflare Pages at `colosseum-f30.pages.dev`): Pure HTML, zero JS, zero auth. Bot army links route here.
- **Plinko Gate** (`colosseum-plinko.html`): 4-step signup (OAuth → Age → Username → Done)
- **Members Zone** (Vercel at `colosseum-six.vercel.app`): Full app, auto-deploys from GitHub

**Backend:** Supabase project `faomczmipsccwbhpivmp`. 35 tables, 44+ server functions, RLS hardened.

**Bot army:** DigitalOcean VPS at `161.35.137.21`, PM2 managed. Bot files live on VPS only, not in this repo (except `bot-config.js`).

## CRITICAL Security Rules — Never Violate

### Castle Defense: All mutations go through `.rpc()` calls
Never use direct `INSERT`, `UPDATE`, or `DELETE` from client JS. Every write goes through `supabase.rpc('function_name', params)` calling a SECURITY DEFINER function on the server. This is the single most important architectural rule.

### XSS Protection: `escapeHTML()` on all user content
Any user-supplied data entering `innerHTML` or template literals MUST pass through `ColosseumConfig.escapeHTML()`. This is a 5-character OWASP mapping: `&` `<` `>` `"` `'`. No exceptions.

### Numeric casting before innerHTML
Any numeric value displayed via innerHTML must be cast with `Number()` first to prevent injection through numeric fields.

### UUID validation before PostgREST filters
All `.or()` filters that interpolate user IDs must validate UUID format before interpolation. Never trust raw input in filter strings.

### `setInterval` polling must expose `destroy()`
Every polling interval must be clearable. Expose a `destroy()` function so pages can clean up on navigation.

### `guard_profile_columns` trigger
This DB trigger silently reverts direct UPDATEs on 21 protected columns (elo_rating, wins, losses, draws, current_streak, best_streak, debates_completed, level, xp, token_balance, subscription_tier, stripe_customer_id, stripe_subscription_id, trust_score, profile_depth_pct, is_minor, created_at, mod_rating, mod_debates_total, mod_rulings_total, mod_approval_pct) for non-service roles. If you need to update these, disable the trigger first, update, re-enable. All normal updates go through RPCs.

## Auth Pattern

- **`onAuthStateChange INITIAL_SESSION`** is the sole init path. Never use `getSession()` directly.
- **`noOpLock`** must load before Supabase CDN to prevent `navigator.locks` orphan bug that hangs `getSession()` indefinitely.
- **`readyPromise` pattern** — never use `setTimeout` for async auth state. Wait for the promise.
- **5-second safety timeout** on auth init.
- **Guest access is default** — anonymous users see the full app. Auth only required for actions. Login walls kill the bot army traffic funnel.

## File Conventions

### JS Modules (all use `window.X` global pattern)
| File | Purpose |
|------|---------|
| `colosseum-config.js` | Central config, credentials, feature flags, `escapeHTML()`, `showToast()`, `friendlyError()` |
| `colosseum-auth.js` | Auth, profile CRUD, follows, rivals, moderator RPCs, `safeRpc()` |
| `colosseum-payments.js` | Stripe Checkout, token purchases |
| `colosseum-notifications.js` | Notification center |
| `colosseum-async.js` | Hot takes, predictions, rivals, react toggle, challenge modal |
| `colosseum-arena.js` | Arena: lobby, 4 modes, matchmaking, debate room, AI sparring |
| `colosseum-tokens.js` | Token economy: milestones, streak freeze, daily login, gold coin animation |
| `colosseum-leaderboard.js` | Elo/Wins/Streak tabs |
| `colosseum-scoring.js` | Elo, XP, leveling (SELECT reads only) |
| `colosseum-share.js` | Web Share API, clipboard, referrals |
| `colosseum-cards.js` | Canvas share card generator |
| `colosseum-webrtc.js` | WebRTC audio via Supabase Realtime |
| `colosseum-voicememo.js` | Voice memo mode |
| `colosseum-analytics.js` | Funnel analytics: visitor UUID, page_view, UTM. **Uses raw `fetch()` to RPC endpoint instead of `safeRpc()` — intentional, analytics fires before auth init. Exception to the safeRpc rule.** |
| `colosseum-home.js` | Home screen logic |
| `colosseum-paywall.js` | Paywall gating logic |
| `colosseum-staking.js` | Token staking system |
| `colosseum-tiers.js` | Questionnaire tier lookup, badge rendering, progress calculation |

### HTML Pages
All at repo root. Key pages: `index.html` (home), `colosseum-login.html`, `colosseum-plinko.html` (signup gate), `colosseum-auto-debate.html` (ungated AI debates), `colosseum-debate-landing.html` (ungated landing), `colosseum-profile-depth.html` (12 sections, 147 questions), `colosseum-groups.html`, `colosseum-settings.html`.

### Vercel Serverless
`api/profile.js` — public profile pages at `/u/username`, dynamic OG tags.

### SQL Migrations
`migrations/` folder, 25 files, applied in order.

## Key Patterns

- **`react_hot_take()`** is a toggle — single RPC handles both add and remove
- **`safeRpc()`** wraps all RPC calls with 401 retry (migration complete — all `.rpc()` calls wrapped except within `colosseum-auth.js` where it's defined)
- **Tokens are earned only, never purchased** — displayed as prestige signal
- **Full file replacement over patches** — always produce complete files, never diffs
- **Groq model is `llama-3.3-70b-versatile`** — `llama-3.1-70b-versatile` is decommissioned
- **SRI hashes pin supabase-js to @2.98.0** — must regenerate hashes when upgrading
- **Landing page votes** — `colosseum-debate-landing.html` has its own lightweight Supabase client (no auth). Votes go through `cast_landing_vote` / `get_landing_votes` RPCs (anon role). `voteCounted` flag prevents double-counting.

## Development

No build system. Serve the root directory with any static file server. The app needs Supabase credentials in `colosseum-config.js` to function. Node.js >= 18 required for bots and serverless functions.

**GitHub workflow:** All files at repo root. Upload via GitHub web UI drag-and-drop.

## VPS / Bot Army Notes

- VPS files not in this repo: `card-generator.js`, `leg2-bluesky-poster.js` (v2), `colosseum-mirror-generator.js`
- PM2 managed with daily 04:00 UTC cron restart
- `.env` changes require `pm2 restart all`
- Bot platform wiring requires THREE updates: config object + flags block in `bot-config.js` + `formatFlags()` in `bot-engine.js`. Missing any one = silent failure.
- Always use `\cp` on VPS (bypasses `cp -i` alias). Verify with grep after copy.

## Design DNA

- Palette: navy, red, white, GOLD
- Fonts: Cinzel (display) + Barlow Condensed (body)
- Background: diagonal gradient (`#1a2d4a` → `#2d5a8e` → `#5b8abf` → `#7aa3d4` → `#3d5a80`)
- Cards: dark frosted glass (`rgba(10,17,40,0.6)`) + `backdrop-filter: blur`
- Mobile-forward: 44px touch targets, scroll-snap
- Fox News chyron energy + ESPN stat cards + gladiator gold

## Important Documentation

- `THE-COLOSSEUM-NEW-TESTAMENT.md` — condensed project knowledge, key decisions, current state, prioritized roadmap
- `THE-COLOSSEUM-OLD-TESTAMENT.md` — all session build logs (1-62), 502+ item inventory
- `THE-COLOSSEUM-LAND-MINE-MAP.md` — 170+ documented pitfalls and fixes. **Read before any SQL, schema, auth, or deployment change.**
- `THE-COLOSSEUM-WAR-CHEST.md` — B2B intelligence play
- `THE-COLOSSEUM-WAR-PLAN.md` — 5-phase strategy, open decisions
- `THE-COLOSSEUM-PRODUCT-VISION.md` — psychology framework, gamification design
- `THE-COLOSSEUM-IDEAS-MASTER-MAP.docx` — raw inventory of every unbuilt idea, organized by structural impact

## Server-ready RPCs (no client wiring yet)

These RPCs exist on the Supabase server (created in Session 109) but have no client-side calls yet:
- `buy_power_up` — purchase a power-up with tokens
- `equip_power_up` — equip a power-up for a debate
- `get_my_power_ups` — fetch user's power-up inventory and equipped loadout

## Cloudflare / Deployment Notes

- Cloudflare Pages requires `--branch=production` for production deploys; `--branch=main` routes to Preview
- `wrangler login` fails on headless VPS — use API token approach
- Stripe webhook body must be read with `req.text()` to preserve raw body for HMAC
- Supabase API keys: bot army uses legacy JWT format (`eyJ...`), not new `sb_secret_*` format
- Edge Function CORS allowlist exists — check before adding new domains
