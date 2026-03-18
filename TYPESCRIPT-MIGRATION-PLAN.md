# THE COLOSSEUM — TYPESCRIPT MIGRATION PLAN
### Created: Session 122 (March 16, 2026) | Updated: Session 129 (March 17, 2026)

> **What this is:** A phased plan to migrate from vanilla JS + IIFEs to TypeScript
> with proper imports. Gradual — nothing breaks. App stays live throughout.
> Executed via Claude Code with Pat copy-pasting commands.

---

# THE PROBLEM

The codebase has 5 execution environments and 3 module systems:

| Layer | Current | Target |
|-------|---------|--------|
| Frontend (13 JS modules) | Vanilla JS, IIFE, window globals | TypeScript, ES modules, proper imports |
| Backend RPCs (30+ functions) | PL/pgSQL | PL/pgSQL (no change — this is correct) |
| Edge Functions (4) | Deno/TypeScript | Deno/TypeScript (no change — already correct) |
| Bot Army (17+ files) | Node.js CommonJS | TypeScript, ES modules |
| Vercel Serverless (1 file) | Node.js CommonJS | TypeScript |

The frontend is the big job. 13 modules + 9 HTML pages + inline scripts. The bot army
is secondary. Edge Functions and PL/pgSQL are already fine.

---

# WHAT THE MIGRATION BUYS US

1. **Type safety** — `tokens` vs `token_balance` caught at compile time, not runtime in production
2. **Proper imports** — `import { safeRpc } from './auth'` instead of hoping `window.ColosseumAuth` exists
3. **IDE support** — autocomplete, go-to-definition, refactor-rename across files
4. **Tooling** — dependency graph is machine-readable, not human-memorized
5. **Sellable codebase** — buyers see TypeScript + proper imports and don't deduct a rewrite budget
6. **Testable** — typed functions can be unit tested; IIFEs on window globals cannot
7. **Onboardable** — a new developer reads the types and knows the contract without reading 122 sessions of bible docs

---

# GUIDING PRINCIPLES

1. **One file at a time** — migrate, test, commit. Never batch.
2. **App stays live** — Vercel deploys after every commit. If it breaks, revert.
3. **TypeScript strict mode from day one** — `strict: true` in tsconfig. No `any` escapes unless explicitly justified.
4. **Build step via Vite** — lightweight, fast, handles TS compilation + bundling. Not webpack (too heavy).
5. **Keep the HTML pages** — we're NOT moving to React/Next.js. We're adding types and imports to the existing architecture. The HTML stays. The inline scripts get extracted into typed modules.
6. **Supabase types auto-generated** — `supabase gen types typescript` gives us the full DB schema as TypeScript interfaces. Column name bugs die permanently.
7. **Tests follow migration** — each migrated module gets at least basic type tests.

---

# PHASE 0: BUILD INFRASTRUCTURE (Session 1 — no code changes)

**Goal:** Add TypeScript, Vite, and the build step without changing any existing code.

### Steps:
1. Initialize package.json in repo root (currently no package.json for frontend)
2. Install dev dependencies: `typescript`, `vite`, `@supabase/supabase-js` (typed)
3. Create `tsconfig.json` with strict mode
4. Create `vite.config.ts` — multi-page app config pointing to all 9 HTML pages
5. Run `supabase gen types typescript` → creates `src/types/database.ts` with full schema types
6. Create `src/types/globals.d.ts` — declare existing window globals so TS doesn't error on them during migration
7. Verify: `npm run build` succeeds with zero changes to existing files
8. Verify: `npm run dev` serves the app locally identical to current Vercel behavior
9. Update `.gitignore` for `node_modules/`, `dist/`
10. Add Vercel build command: `npm run build` → output `dist/`

**After Phase 0:** The app builds and deploys exactly as before. No behavior changes. But we now have a compiler watching.

### New files:
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `src/types/database.ts` (auto-generated)
- `src/types/globals.d.ts` (bridge file for migration period)

---

# PHASE 1: FOUNDATION MODULES (Sessions 2-3)

**Goal:** Migrate the two most critical modules that everything depends on.

### Order matters:
1. **colosseum-config.js → src/config.ts**
   - Exports: escHtml(), showToast(), friendlyError(), credentials, feature flags
   - Why first: zero dependencies, everything imports from it
   - The window.ColosseumConfig global stays as a bridge until all consumers migrate

2. **colosseum-auth.js → src/auth.ts**
   - Exports: safeRpc(), ready, getUser(), getProfile(), signIn(), signOut(), updateProfile(), showUserProfile()
   - Why second: depends only on config. Everything else depends on this.
   - Typed safeRpc means every RPC call gets parameter type checking
   - The window.ColosseumAuth global stays as a bridge

### Migration pattern (same for every file):
```
1. Create src/modulename.ts
2. Move logic from IIFE into typed exports
3. Add a bridge at the bottom: window.ModuleName = { ...exports }
4. Update HTML script tag: <script type="module" src="/src/modulename.ts"></script>
5. Verify app works identically
6. Commit
```

### Key type definitions created in this phase:
- `RpcResult<T>` — typed return from safeRpc
- `Profile` — from database.ts (auto-generated, matches profiles table exactly)
- `ArenaDebate` — from database.ts
- `FeatureFlags` — typed config flags

**After Phase 1:** Config and auth are typed. Every future module that imports from them gets type checking on credentials, RPC calls, and profile data. The `tokens` vs `token_balance` class of bug is now impossible for any module that uses the typed safeRpc.

---

# PHASE 2: TOKEN + DEFENSE MODULES (Sessions 4-5)

**Goal:** Migrate the modules that handle money and access control.

### Order:
3. **colosseum-tokens.js → src/tokens.ts**
   - Milestones, streak freeze, claim functions, gold coin animation
   - Types: MilestoneKey (union type of all 13 keys), ClaimResult

4. **colosseum-tiers.js → src/tiers.ts**
   - Pure utility, zero dependencies
   - Types: Tier (0-5), TierThreshold, TierInfo

5. **colosseum-staking.js → src/staking.ts**
   - IIFE → named exports
   - This is where LM-185 dies permanently: `import { safeRpc } from './auth'` replaces `ColosseumAuth.safeRpc()`
   - Types: StakeParams, PoolData

6. **colosseum-powerups.js → src/powerups.ts**
   - Same IIFE→import fix as staking
   - Types: PowerUpType, EquipState, ActivationResult

**After Phase 2:** The entire defense layer is typed. Token balance operations, staking, tiers, and power-ups all have compile-time type checking. LM-185 (safeRpc scope bug) is structurally impossible.

---

# PHASE 3: ARENA + SOCIAL MODULES (Sessions 6-9)

**Goal:** Migrate the feature modules.

### Order:
7. **colosseum-arena.js → src/arena.ts** (biggest file, most complex)
   - Imports from: config, auth, staking, powerups, tokens
   - Types: DebateStatus (union: 'pending'|'lobby'|'matched'|'live'|'completed'), DebateMode, View
   - The status union type means inserting a debate as 'live' is a compile error

8. **colosseum-async.js → src/async.ts**
   - Hot takes, predictions, challenges
   - Types: HotTake, PredictionQuestion, Challenge

9. **colosseum-notifications.js → src/notifications.ts**
10. **colosseum-leaderboard.js → src/leaderboard.ts**
11. **colosseum-share.js → src/share.ts**
12. **colosseum-cards.js → src/cards.ts**
13. **colosseum-scoring.js → src/scoring.ts**
14. **colosseum-analytics.js → src/analytics.ts** (special: runs independently with anon client)
15. **colosseum-payments.js → src/payments.ts**
16. **colosseum-paywall.js → src/paywall.ts**
17. **colosseum-webrtc.js → src/webrtc.ts**
18. **colosseum-voicememo.js → src/voicememo.ts**

**After Phase 3:** All 13+ frontend modules are TypeScript with proper imports. Window globals can be removed (or kept as thin bridges for any remaining inline HTML scripts).

---

# PHASE 4: HTML PAGES (Sessions 10-12)

**Goal:** Extract inline scripts from HTML pages into typed modules.

### For each of the 9 HTML pages:
1. Extract inline `<script>` content into `src/pages/pagename.ts`
2. Replace inline script with `<script type="module" src="/src/pages/pagename.ts"></script>`
3. Type all DOM queries, event handlers, and RPC calls
4. Verify page works identically

### Order (by complexity):
1. colosseum-login.html (simple — just OAuth handlers)
2. colosseum-plinko.html (4-step wizard)
3. colosseum-settings.html (toggles + delete account)
4. colosseum-spectate.html (read-only)
5. colosseum-terms.html / colosseum-privacy.html (no JS)
6. colosseum-profile-depth.html (tier banner + saveSection)
7. colosseum-debate-landing.html (anon voting + fingerprinting)
8. colosseum-auto-debate.html (voting + tokens)
9. colosseum-groups.html (biggest inline script — groups logic)
10. index.html (app shell — spoke carousel, all overlays)

**After Phase 4:** Zero inline scripts. Every line of JavaScript is in a .ts file, typed, importable, testable.

---

# PHASE 5: BOT ARMY (Sessions 13-14)

**Goal:** Migrate VPS code from CommonJS to TypeScript.

### Steps:
1. Add `tsconfig.json` to bot-army directory
2. Migrate file by file (same pattern as frontend):
   - bot-config.js → bot-config.ts
   - supabase-client.ts (typed with database.ts)
   - ai-generator.ts
   - category-classifier.ts
   - leg1-bluesky.ts, leg2-*.ts, leg3-*.ts
   - card-generator.ts
   - bot-engine.ts (orchestrator — last, depends on everything)
3. Update ecosystem.config.js to run compiled JS (or use ts-node)
4. Verify on VPS: `pm2 restart all` → logs show same behavior

**After Phase 5:** Bot army is typed. Category slug mismatches, config field typos, and RPC parameter errors caught at compile time.

---

# PHASE 6: TESTING + CLEANUP (Sessions 15-16)

**Goal:** Add basic tests, remove migration bridges, clean up.

### Steps:
1. Add Vitest (Vite-native test runner)
2. Write type tests for critical paths: safeRpc return types, staking parameter validation, debate status transitions
3. Remove all `window.GlobalName` bridges (only if no remaining consumers)
4. Remove `src/types/globals.d.ts` bridge file
5. Final `npm run build` with zero warnings
6. Update Wiring Manifest to reflect new file structure
7. Update NT with migration completion

**After Phase 6:** Unified TypeScript codebase. One language, one module system, one build step, proper imports, full type safety, testable, sellable.

---

# TIMELINE ESTIMATE

| Phase | Sessions | What | Status |
|-------|----------|------|--------|
| 0 | 1 | Build infrastructure (no code changes) | ✅ Session 125 |
| 1 | 2 | Config + Auth (foundation) | ✅ Session 126 |
| 2 | 2 | Tokens + Tiers + Staking + Power-ups (defense) | ✅ Session 126 |
| 3 | 4 | Arena + all social/utility modules | ✅ Session 127 |
| 4 | 3 | HTML page inline script extraction | ✅ Session 128 |
| 5 | 2 | Bot army | ⏳ Future |
| 6 | 2 | Tests + cleanup | ⏳ Future |
| **Total** | **~16 sessions** | | **Phases 0-4 COMPLETE** |

Phases 0-4 completed in 4 sessions (125-128) vs estimated 12. Remaining: Phase 5 (bot army) and Phase 6 (tests + cleanup).

Note: 3 heavy page modules (spectate.ts, groups.ts, home.ts) were mechanically extracted with `any` annotations. They compile but need a full typing pass for real type safety.

---

# RISKS

1. **Vite + multi-page HTML** — Vite handles this but the config is tricky. Phase 0 is where we prove it works.
2. **Supabase CDN script** — currently loaded via CDN with SRI hash. After migration, it's an npm import bundled by Vite. SRI hashes go away (no longer needed — the bundle is local).
3. **Vercel build** — currently zero-build (static files). After Phase 0, Vercel runs `npm run build`. If build fails, deploy fails. This is actually a feature — broken code can't deploy.
4. **Bot army deploy** — VPS currently runs raw JS. After Phase 5, need either `tsc` compile step or `ts-node` runtime. PM2 config changes.
5. **Inline scripts in HTML** — some pages have substantial inline JS (groups.html). Extraction is mechanical but tedious.

---

# WHAT DOESN'T CHANGE

- PL/pgSQL RPCs (already correct)
- Edge Functions (already TypeScript/Deno)
- Castle defense pattern (RPCs for all writes)
- RLS policies
- Database schema
- Design DNA (Cinzel, Barlow, gradient, glass cards)
- Deployment targets (Vercel, Cloudflare Pages, DigitalOcean VPS)
- The Wiring Manifest (update file paths as modules move)
