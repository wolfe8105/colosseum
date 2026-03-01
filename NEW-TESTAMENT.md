# THE MODERATOR — STATE
### Last updated: March 1, 2026
### This file was reconstructed from 9 divergent state files. This is the single accurate version.
### Archive: OLD-TESTAMENT.md (brainstorm list, research, session summaries)

---

## WHAT IT IS

A live audio debate platform / emergence engine. Users hang out in themed sections (Sports, Politics, etc.), post hot takes, react, and when disagreements catch fire, debate structure appears around them. Revenue: consumer subs, token economy + ads, B2B data licensing. Digital third place — not a destination, a place you're already in.

---

## SOURCE OF TRUTH

**master-list.md** — 502 items across 10 areas. Every feature, every idea, every decision. This is the complete inventory. The state file tracks progress; the master list tracks everything.

---

## THREE CORE PROBLEMS

1. **Money pipe disconnected.** Full token economy exists, zero real dollars flow. No Stripe, no Apple Pay, nothing.
2. **Single-player pretending to be multiplayer.** No follows, friends, teams, DMs, notifications, share links. Zero reason to return.
3. **Sitting on a data business without collecting data.** B2B play requires real accounts + profile depth + recordings — none exist.

---

## V2 DIRECTION (decided Feb 26)

V1 (~265KB single HTML file) was built bottom-up. Features work but no real foundation. V2 rebuilds from scratch with full knowledge of the finished product. Foundation first.

**Architecture: Castle Ring Model** — concentric defensive rings from outer to inner. Auth is a ring. Payments is a deeper ring. User content is its own ring. B2B data sits near the keep. Cross-ring key distribution means no single breach unlocks everything.

**Build order:** Keep → Ring 2 → Ring 4 → Ring 3 → Ring 5 → Ring 6 → Ring 1

V1 remains valuable as feature reference, UX decisions, token economy design, and business logic.

---

## WHAT ACTUALLY EXISTS

### V1 App (reference, not the path forward)
- `the-moderator_2_1.html` — Main app (~265KB, vanilla JS, localStorage)
- `the-moderator_2_2.html` — Variant
- `server.js` + `package.json` — WebRTC signaling + Deepgram proxy
- Everything listed in master-list.md as ✅ EXISTS

### Live Features (working in production)
- `colosseum-auto-debate.html` — AI debate verdict page (Vercel rewrite: `/verdict` → this file). Loads debate from Supabase, renders rounds, scorecard, voting, sharing. **Bug fixed March 1** — `sb.rpc().catch()` threw TypeError because Supabase `rpc()` returns a query builder not a Promise. Was misdiagnosed as a race condition across multiple sessions.
- `colosseum-config.js` — Synchronous IIFE, real Supabase + Stripe test keys, feature flags, tier definitions, token economy config.
- `vercel.json` — Route rewrites, CSP headers, security headers.
- `middleware.js` — Rate limiting + CORS on `/api/*` routes only.

### V2 Code (built across sessions, NOT yet integrated together)

**Ring 2 — Payments (placeholder mode):**
- `coliseum-payments-client.js` — Stripe checkout redirect
- `coliseum-payments-server.js` — Stripe webhook handling

**Ring 4 — Auth, Profiles, Trust, Cosmetics, Achievements:**
- `coliseum-schema.sql` — Base schema (profiles, preferences, relationships, debates, votes, audit, transactions)
- `coliseum-schema-ring4.sql` — Trust scores, cosmetics catalog (45 items seeded), achievements (25 seeded), RLS policies
- `coliseum-auth.js` — Signup, login, logout, profile CRUD, password reset, account deletion
- `coliseum-trust.js` — Client-side trust reader, vote weight, permissions
- `coliseum-ring4-ui.html` — Login/signup, profile page, settings page
- `coliseum-config.js` — Placeholder config with auto-detection

**Auth Server (standalone, not yet connected to app):**
- `auth-server-v2.js` — Express server, bcrypt 12 rounds, JWT (15m access + 7d refresh), age gate (13+), ToS tracking, GDPR delete, rate limiting, audit logging
- `schema-launch.sql` — Standalone Postgres schema (no Supabase dependency)

**Other auth attempts (may be redundant):**
- `moderator-login.html` + `moderator-auth.js`
- `coliseum-login__1_.html`
- `auth-module.js` / `_1` / `_2`
- `supabase-schema.sql` / `schema_phase0.sql`
- `server-auth.js` / `_1`

### Design Documents (complete, not wired)
- `cosmetics-shop-expanded.json` — 45 items (15 borders, 18 badges, 12 effects)
- `subscription-tier-design.json` — Free vs Pro ($9.99/mo), feature mapping
- `token-earning-mechanics.json` — Daily challenges, streaks, leaderboard
- `paywall-modal-design.json` — 4 contextual variants
- `paywall-modal-mockup.html` — Visual preview
- `profile-depth-system.jsx` — 12 sections, 157 questions, interactive prototype

---

## RING STATUS

| Ring | What | Status |
|------|------|--------|
| Keep | Air-gap, YubiKey, human review | ⏭️ SKIPPED (needs DB first) |
| Ring 2 | Stripe payments | 📐 CODE EXISTS (placeholder) |
| **Ring 4** | **Auth, profiles, trust, cosmetics, achievements** | **📐 CODE COMPLETE, NOT INTEGRATED** |
| Ring 3 | Debate data, transcripts, confidence scoring | ❌ NOT STARTED |
| Ring 5 | Voting, chat, challenges, social feed | ❌ NOT STARTED |
| Ring 6 | Public frontend / landing page | 🟡 VERDICT PAGE LIVE, rest not started |
| Ring 1 | B2B intelligence | ❌ NOT STARTED (intentionally last) |

### Master List Items Completed (auth-server-v2)
- #190 Real email/password auth ✅
- #192 Password hashing (bcrypt) ✅
- #193 JWT sessions ✅
- #211 Age gate (13+) ✅
- #212 Under-18 flag ✅
- #210 ToS acceptance ✅
- #241 Delete account / GDPR ✅
- #236 Settings endpoints ✅

### Still Missing for ANY Launch
1. ❌ Login/signup UI connected to real backend
2. ❌ Auth wired into the actual app (still uses localStorage)
3. ~~❌ Database deployed somewhere~~ → ✅ Supabase project live (faomczmipsccwbhpivmp)
4. ❌ Auth server deployed somewhere
5. ❌ Stripe connected
6. ❌ Domain purchased

---

## OPEN DECISIONS

1. ~~**Identity:** "The Moderator" or "The Coliseum"?~~ → **RESOLVED: "The Colosseum."** Live at colosseum-six.vercel.app. GitHub: wolfe8105/colosseum.
2. **Subscription price:** $9.99 (Pro design) or $14.99 (Profile Depth prototype)?
3. **Education:** Separate app or mode within the app?
4. **Minors policy:** Full app with restrictions, or separate gated experience?
5. ~~**Deployment:** Where? Supabase? Raw Postgres? Which host?~~ → **RESOLVED: Supabase (faomczmipsccwbhpivmp) + Vercel (auto-deploy from GitHub main).**
6. **Integration:** When to wire Ring 4 modules into the main app?
7. **Launch date:** Pitch deck said Feb 25, 2026. What's real?

---

## WHAT WENT WRONG WITH THE STATE FILE

Each session created a new state file instead of updating the previous one. Downloads were never swapped back into the project folder. Every Claude session read the same stale file and had no idea what previous sessions accomplished. The New Testament / Old Testament split fixes that.

**Going forward:** At the end of every session, download the updated testaments and replace them in the project folder / GitHub.

---

## HOW TO UPDATE THIS FILE

1. Update date at top
2. Update ring status / master list items completed
3. Add new decisions or resolve open ones
4. Note what was built or changed
5. Keep it short. Details go in OLD-TESTAMENT.md.
