# CLAUDE.md — The Moderator

This file provides guidance to Claude Code when working with this repository.

## What This Is

Live audio debate platform / "emergence engine." Users post hot takes in themed sections, react, challenge each other, and debates emerge from disagreements. Four debate modes: Live Audio, Voice Memo (async), Text Battle, AI Sparring. Renamed from "The Colosseum" to "The Moderator" in Session 160.

Solo founder project. **Vite + TypeScript build pipeline** — all source files in `src/`. Deployed on Vercel (Vite build + 1 serverless API function) with Supabase (Postgres + Auth + Edge Functions + Storage) as the backend.

## Architecture

**Three-zone model:**
- **Ring 6 — Static Mirror** (Cloudflare Pages at `colosseum-f30.pages.dev`): Pure HTML, zero JS, zero auth. Bot army links route here.
- **Plinko Gate** (`moderator-plinko.html`): 4-step signup (OAuth → Age → Username → Done)
- **Members Zone** (Vercel at `themoderator.app`): Full app, auto-deploys from GitHub via Vite build

**Backend:** Supabase project `faomczmipsccwbhpivmp`. 41+ tables, 55+ server functions, RLS hardened.

**Bot army:** DigitalOcean VPS at `161.35.137.21`, PM2 managed. TypeScript source in repo (`bot-engine.ts`, `bot-config.ts`, etc.). PM2 runs compiled output from `dist/`.

**VPS paths:**
- Git repo root: `/opt/colosseum` (NOT `/opt/colosseum/bot-army/colosseum-bot-army/`)
- Bot army source on VPS: `/opt/colosseum/bot-army/colosseum-bot-army/`
- VPS deploy path: `/opt/colosseum/bot-army/colosseum-bot-army/`

## CRITICAL Security Rules — Never Violate

### Castle Defense: All mutations go through `.rpc()` calls
Never use direct `INSERT`, `UPDATE`, or `DELETE` from client JS. Every write goes through `supabase.rpc('function_name', params)` calling a SECURITY DEFINER function on the server.

### XSS Protection: `escapeHTML()` on all user content
Any user-supplied data entering `innerHTML` or template literals MUST pass through `ModeratorConfig.escapeHTML()`. 5-character OWASP mapping. No exceptions.

### Numeric casting before innerHTML
Any numeric value displayed via innerHTML must be cast with `Number()` first.

### UUID validation before PostgREST filters
All `.or()` filters that interpolate user IDs must validate UUID format before interpolation.

### `setInterval` polling must expose `destroy()`
Every polling interval must be clearable via a `destroy()` function.

### `guard_profile_columns` trigger
This DB trigger raises an exception on direct UPDATEs to 4 protected columns (`level`, `xp`, `streak_freezes`, `questions_answered`) for non-service roles. All updates to these columns go through SECURITY DEFINER RPCs. Note: older docs incorrectly listed 21 columns — it's 4.

## Auth Pattern

- **`onAuthStateChange INITIAL_SESSION`** is the sole init path. Never use `getSession()` directly.
- **`noOpLock`** must load before Supabase CDN to prevent `navigator.locks` orphan bug. Lives in `src/auth.ts`.
- **`readyPromise` pattern** — never use `setTimeout` for async auth state.
- **6-second safety timeout** on auth init (was 4s — fixed Session 163 to prevent redirect loop on cold visit).
- **Guest access is default** — anonymous users see the full app. Auth only required for actions.

## Build System

**Vite** is the build system. `npm run build` runs `vite build && cp og-card-default.png dist/`.

Vercel config (`vercel.json`): `buildCommand: "npm run build"`, `outputDirectory: "dist"`.

Every HTML page uses a single `<script type="module">` entry point. Zero legacy script tags remain.

Source lives in `src/`. Compiled output goes to `dist/`. Never edit `dist/` directly.

## File Conventions

### TypeScript Modules (src/*.ts)
| File | Purpose |
|------|---------|
| `src/config.ts` | Central config, credentials, feature flags, `escapeHTML()`, `showToast()`, `friendlyError()` |
| `src/auth.ts` | Auth, profile CRUD, follows, rivals, moderator RPCs, `safeRpc()`, `updateModCategories()` |
| `src/payments.ts` | Stripe Checkout, token purchases |
| `src/notifications.ts` | Notification center |
| `src/async.ts` | Hot takes, predictions, rivals, react toggle, challenge modal |
| `src/arena.ts` | Arena: lobby, 4 modes, matchmaking, debate room, AI sparring |
| `src/tokens.ts` | Token economy: milestones, streak freeze, daily login, gold coin animation |
| `src/leaderboard.ts` | Elo/Wins/Streak tabs |
| `src/scoring.ts` | Elo, XP, leveling (SELECT reads only) |
| `src/share.ts` | Web Share API, clipboard, referrals |
| `src/cards.ts` | Canvas share card generator |
| `src/analytics.ts` | Funnel analytics. **Uses raw `fetch()` — intentional, fires before auth init.** |
| `src/navigation.ts` | Register/call pattern for page navigation. Zero `window.navigateTo` refs. (Session 163) |
| `src/paywall.ts` | Paywall gating logic |
| `src/staking.ts` | Token staking system |
| `src/tiers.ts` | Questionnaire tier lookup, badge rendering, progress calculation |
| `src/nudge.ts` | Polite engagement toast engine. Suppression: once per session per ID, 24h cooldown, 3-per-session cap. |
| `src/reference-arsenal.ts` | 5-step forge form, reference card renderer, arsenal list |

### Page Modules (src/pages/*.ts)
`home.ts`, `login.ts`, `plinko.ts`, `settings.ts`, `profile-depth.ts`, `debate-landing.ts`, `auto-debate.ts`, `spectate.ts`, `groups.ts`, `terms.ts`

### HTML Pages (all at repo root)
`index.html`, `moderator-login.html`, `moderator-plinko.html`, `moderator-settings.html`, `moderator-profile-depth.html`, `moderator-debate-landing.html`, `moderator-auto-debate.html`, `moderator-groups.html`, `moderator-spectate.html`, `moderator-terms.html`, `moderator-privacy.html`

### Vercel Serverless
`api/profile.js` — public profile pages at `/u/username`, dynamic OG tags.

### SQL Migrations
`migrations/` folder. Applied in order.

## Key Patterns

- **`react_hot_take()`** is a toggle — single RPC handles both add and remove
- **`safeRpc()`** wraps all RPC calls with 401 retry
- **`navigation.ts`** — use register/call pattern, never `window.navigateTo`
- **Tokens are earned only, never purchased** — prestige signal
- **Full file replacement over patches** — always produce complete files, never diffs
- **Groq model is `llama-3.3-70b-versatile`** — `llama-3.1-70b-versatile` is decommissioned
- **SRI hashes pin supabase-js to @2.98.0** — must regenerate hashes when upgrading
- **Single canonical debate table is `arena_debates`** — legacy `debates` table is gone
- **All log_event calls use named parameters** — `log_event(p_event_type :=, p_user_id :=, p_debate_id :=, p_category :=, p_side :=, p_metadata :=)`

## Development

TypeScript + Vite. Run `npm install` then `npm run build` to compile. Serve the `dist/` directory for local testing.

**GitHub workflow:** Upload files via GitHub web UI drag-and-drop. Vercel auto-deploys on every push.

## VPS / Bot Army Notes

- Bot TypeScript source is in repo. VPS compiles and runs from `dist/`.
- PM2 manages bots. Entry point: `dist/bot-engine.js`
- `.env` changes require `pm2 restart all`
- Bot platform wiring requires THREE updates: config object + flags block in `bot-config.ts` + `formatFlags()` in `bot-engine.ts`. Missing any one = silent failure.
- Always use `\cp` on VPS (bypasses `cp -i` alias). Verify with grep after copy.
- Git repo root on VPS is `/opt/colosseum` (NOT the bot-army subdirectory)

## F-47 Moderator Marketplace Schema (Session 173)

New columns:
- `profiles.mod_categories TEXT[] DEFAULT '{}'` + GIN index
- `arena_debates.mod_status TEXT DEFAULT 'none'` CHECK ('none'/'waiting'/'requested'/'claimed')
- `arena_debates.mod_requested_by UUID NULL`
- Partial index on `arena_debates(mod_status) WHERE mod_status = 'waiting'`

New RPCs: `browse_mod_queue`, `request_to_moderate` (FOR UPDATE SKIP LOCKED), `respond_to_mod_request`, `get_mod_profile`, `update_mod_categories`, `request_mod_for_debate`, `get_debate_mod_status`. Fixed: `assign_moderator`, `score_moderator`.

## Design DNA

- Palette: navy, red, white, GOLD
- Fonts: Cinzel (display) + Barlow Condensed (body)
- Background: diagonal gradient (`#1a2d4a` to `#3d5a80`)
- Cards: dark frosted glass (`rgba(10,17,40,0.6)`) + `backdrop-filter: blur`
- Mobile-forward: 44px touch targets, scroll-snap
- Responsive: `@media (min-width: 768px)` — `.screen` max-width 640px, centered

## Important Documentation

- `THE-MODERATOR-NEW-TESTAMENT.md` — condensed project knowledge, key decisions, current state
- `THE-MODERATOR-OLD-TESTAMENT.md` — all session build logs (1-191)
- `THE-MODERATOR-LAND-MINE-MAP.md` — 194+ documented pitfalls. **Read before any SQL, schema, auth, or deployment change.**
- `THE-MODERATOR-PUNCH-LIST.md` — single source of truth for all open work
- `THE-MODERATOR-WAR-CHEST.md` — B2B intelligence play
