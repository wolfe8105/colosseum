# CLAUDE.md — The Moderator

This file provides guidance to Claude Code when working with this repository.

## What This Is

Live audio debate platform / "emergence engine." Users post hot takes in themed sections, react, challenge each other, and debates emerge from disagreements. Four debate modes: Live Audio, Voice Memo (async), Text Battle, AI Sparring. Renamed from "The Colosseum" to "The Moderator" in Session 160.

Solo founder project. **Vite + TypeScript build pipeline** — all source files in `src/`. Deployed on Vercel (Vite build + 1 serverless API function) with Supabase (Postgres + Auth + Edge Functions + Storage) as the backend.

## Architecture

**Three-zone model:**
- **Ring 6 — Static Mirror** (Cloudflare Pages at `colosseum-f30.pages.dev`): Pure HTML, zero JS, zero auth. Legacy entry point.
- **Plinko Gate** (`moderator-plinko.html`): 4-step signup (OAuth → Age → Username → Done)
- **Members Zone** (Vercel at `themoderator.app`): Full app, auto-deploys from GitHub via Vite build

**Backend:** Supabase project `faomczmipsccwbhpivmp`. 43+ tables, ~260 server functions, RLS hardened.

**Bot army: SCRATCHED (S248).** VPS ($6/mo, Ubuntu 24.04, NYC3, IP `161.35.137.21`) is up with PM2 idle — code is inert, no teardown plan. Ignore all bot army files (`bot-engine.ts`, `bot-config.ts`, `lib/leg*.ts`, etc.).

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

Most large modules were decomposed into domain sub-files (Session 254). The barrel entry point is kept for import compatibility. Sub-files follow the pattern `src/<module>.<domain>.ts`.

| File | Purpose |
|------|---------|
| `src/config.ts` | Central config, credentials, feature flags, `escapeHTML()`, `showToast()`, `friendlyError()` |
| `src/auth.ts` | Barrel. Sub-files: `auth.core`, `auth.follows`, `auth.moderator`, `auth.ops`, `auth.profile`, `auth.rivals`, `auth.rpc`, `auth.types`. `safeRpc()` lives in `auth.rpc.ts` (re-exported via barrel). `noOpLock` must load before Supabase CDN. |
| `src/async.ts` | Barrel. Sub-files: `async.actions`, `async.fetch`, `async.render`, `async.rivals`, `async.state`, `async.types`, `async.utils`. Hot takes, predictions, rivals, react toggle, challenge modal. |
| `src/arena.ts` | Barrel. 31 sub-files under `src/arena/`. See arena section below. |
| `src/reference-arsenal.ts` | Barrel. Sub-files: `reference-arsenal.constants`, `.debate`, `.forge`, `.loadout`, `.render`, `.rpc`, `.types`, `.utils`. 5-step forge form, reference card renderer, arsenal list. |
| `src/webrtc.ts` | Barrel. Sub-files: `webrtc.audio`, `.engine`, `.ice`, `.peer`, `.signaling`, `.state`, `.timer`, `.turn`, `.types`. ICE restart + 30s setup timeout live. |
| `src/tokens.ts` | Token economy: milestones, streak freeze, daily login, gold coin animation |
| `src/leaderboard.ts` | Elo/Wins/Streak tabs |
| `src/powerups.ts` | Power-up inventory and activation |
| `src/scoring.ts` | Elo, XP, leveling (SELECT reads only) |
| `src/share.ts` | Web Share API, clipboard, referrals |
| `src/cards.ts` | Canvas share card generator |
| `src/analytics.ts` | Funnel analytics. **Uses raw `fetch()` — intentional, fires before auth init.** |
| `src/navigation.ts` | Register/call pattern for page navigation. Zero `window.navigateTo` refs. |
| `src/paywall.ts` | Paywall gating logic |
| `src/staking.ts` | Token staking system |
| `src/tiers.ts` | Questionnaire tier lookup, badge rendering, progress calculation |
| `src/nudge.ts` | Polite engagement toast engine. Suppression: once per session per ID, 24h cooldown, 3-per-session cap. |
| `src/notifications.ts` | Notification center |
| `src/payments.ts` | Stripe Checkout, token purchases |
| `src/rivals-presence.ts` | Rivals presence tracking |
| `src/voicememo.ts` | Voice memo recording |
| `src/terms.ts` | Terms of service logic |

### Arena Sub-modules (src/arena/*.ts — 31 files)
`arena-core` (init, popstate, `?spectate=` handler) · `arena-lobby` (card rendering, spectator click intercept — **async-only chunk, dynamically imported**) · `arena-state` · `arena-types` · `arena-queue` · `arena-match` · `arena-css` · `arena-sounds` · `arena-deepgram` · `arena-config-mode` · `arena-config-settings` · `arena-private-lobby` · `arena-private-picker` · `arena-room-setup` · `arena-room-live` · `arena-room-end` · `arena-room-ai` · `arena-room-voicememo` · `arena-mod-debate` · `arena-mod-queue` · `arena-mod-refs` · `arena-mod-scoring` · `arena-feed-room` · `arena-feed-realtime` · `arena-feed-machine` · `arena-feed-wiring` · `arena-feed-events` · `arena-feed-state` · `arena-feed-transcript` · `arena-feed-ui` · `arena-feed-references`

### Page Modules (src/pages/*.ts)
Decomposed modules have sub-files following `<page>.<domain>.ts` pattern.

| Module | Sub-files |
|--------|-----------|
| `home.ts` | `home.arsenal`, `home.depth`, `home.feed`, `home.nav`, `home.overlay`, `home.profile`, `home.state`, `home.types` |
| `spectate.ts` | `spectate.chat`, `spectate.render`, `spectate.share`, `spectate.state`, `spectate.types`, `spectate.utils`, `spectate.vote` |
| `groups.ts` | `groups.challenges`, `groups.feed`, `groups.members`, `groups.state`, `groups.types`, `groups.utils` |
| `settings.ts`, `login.ts`, `plinko.ts`, `profile-depth.ts`, `debate-landing.ts`, `terms.ts`, `cosmetics.ts` | (monoliths) |

### HTML Pages (all at repo root)
`index.html`, `moderator-login.html`, `moderator-plinko.html`, `moderator-settings.html`, `moderator-profile-depth.html`, `moderator-debate-landing.html`, `moderator-auto-debate.html`, `moderator-groups.html`, `moderator-spectate.html`, `moderator-terms.html`, `moderator-privacy.html`

### Vercel Serverless
`api/profile.js` — public profile pages at `/u/username`, dynamic OG tags.

### SQL Migrations
SQL migration files live at repo root (e.g. `moderator-schema-production.sql`). GitHub repo is NOT source of truth for live schema — always verify against Supabase directly.

### SQL Domain Files (supabase/functions/*.sql)
Deployed RPCs are split into 10 domain files (Session 254 Track C). Use the relevant domain file instead of loading all 11k lines.

| File | Functions | Domain |
|------|-----------|--------|
| `supabase/functions/arena.sql` | 55 | Matchmaking, debates, scoring, queue |
| `supabase/functions/auth.sql` | 33 | Auth, profiles, follows, rivals |
| `supabase/functions/moderation.sql` | 22 | Mod marketplace, scoring, F-47/F-48 |
| `supabase/functions/references.sql` | 20 | Reference arsenal, forge, citations |
| `supabase/functions/groups.sql` | 17 | Groups, GvG, challenges |
| `supabase/functions/tokens.sql` | 11 | Token economy, staking, power-ups |
| `supabase/functions/predictions.sql` | 9 | Prediction staking, settlement |
| `supabase/functions/hot-takes.sql` | 10 | Hot takes, reactions, async feed |
| `supabase/functions/admin.sql` | 10 | Admin, analytics, app_config |
| `supabase/functions/notifications.sql` | 4 | Notification RPCs |

## Key Patterns

- **`react_hot_take()`** is a toggle — single RPC handles both add and remove
- **`safeRpc()`** wraps all RPC calls with 401 retry
- **`navigation.ts`** — use register/call pattern, never `window.navigateTo`
- **Tokens are earned only, never purchased** — prestige signal
- **Full file replacement over patches** — always produce complete files, never diffs
- **Groq model is `llama-3.3-70b-versatile`** — `llama-3.1-70b-versatile` is decommissioned
- **SRI hashes pin supabase-js to @2.101.1** — must regenerate hashes when upgrading
- **Single canonical debate table is `arena_debates`** — legacy `debates` table is gone
- **All log_event calls use named parameters** — `log_event(p_event_type :=, p_user_id :=, p_debate_id :=, p_category :=, p_side :=, p_metadata :=)`

## Development

TypeScript + Vite. Run `npm install` then `npm run build` to compile. Serve the `dist/` directory for local testing.

**GitHub workflow:** Upload files via GitHub web UI drag-and-drop. Vercel auto-deploys on every push.

### 3-Gate Verification (run after every decomposition or major refactor)
```bash
npm run build                                                         # Gate 1: types
npx madge --circular --extensions ts --ts-config tsconfig.json src/  # Gate 2: cycles
npx knip                                                              # Gate 3: dead exports
```
Notes: Knip may OOM on this repo (pre-existing oxc-parser issue) — manual grep if it crashes. 37 pre-existing circular deps in `src/arena/` — all known.

### Import Rules
1. No barrel files — no `index.ts` re-exports. Direct imports only.
2. `import type` for all type-only imports.
3. Dependency direction: types → state → utils → features → orchestrator. Nothing imports "up".
4. No circular deps — extract a shared primitive or use late-bound ref in state.

## Codebase State (April 16, 2026)

- **372 modules** — full TypeScript refactor complete. Every file under 300 lines.
- **Audit complete** — 63 files, 5-agent method. All findings fixed. See `BUG-FIX-PATTERNS.md`.
- **Design phase closed.** All features shipped and live-tested. Next phase: launch.

## Design DNA

- Palette: CSS variables via `--mod-*` tokens (migrated S205). No hardcoded hex colors anywhere except `src/cards.ts` Canvas API (intentional).
- Fonts: `--mod-font-body`, `--mod-font-ui` tokens. Legacy Cinzel/Barlow refs are stale.
- Mobile-forward: 44px touch targets, scroll-snap
- Responsive: `@media (min-width: 768px)` — `.screen` max-width 640px, centered

## Important Documentation

- `THE-MODERATOR-NEW-TESTAMENT.md` — condensed project knowledge, key decisions, current state
- `THE-MODERATOR-OLD-TESTAMENT.md` — session build logs (1-228). S229-present in NT infrastructure section.
- `THE-MODERATOR-LAND-MINE-MAP.md` — 194+ documented pitfalls. **Read before any SQL, schema, auth, or deployment change.**
- `THE-MODERATOR-PUNCH-LIST.md` — single source of truth for all open work
- `THE-MODERATOR-WAR-CHEST.md` — B2B intelligence play
- `AUDIT-FINDINGS.md` — full audit findings (63 files, 0 High, 47 Medium, 86 Low)
- `BUG-FIX-PATTERNS.md` — all findings grouped by pattern for sweep fixes
