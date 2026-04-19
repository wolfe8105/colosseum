# Stage 3 — Verification: home.ts

## Verification Results (11 agents)

### appInit (line 69) — PASS

All 11 agents confirmed all Stage 2 claims. No corrections, no failures.

**Confirmed observations:**

- **Auth race**: `Promise.race([ready, new Promise(r => setTimeout(r, 6000))])` — timeout exactly 6000ms. Catch logs `'[Home] auth init failed:'` as `console.warn`. Execution continues unconditionally.
- **Loading screen**: element ID is `'loading-screen'`, null-guarded with `if (loading)`. Class added is `'fade-out'`. Removal delay is exactly 400ms via `setTimeout`.
- **Redirect condition**: `!getCurrentUser() && !getIsPlaceholderMode()` (both must be true). Redirect target is exactly `'moderator-plinko.html'`. Early return prevents all subsequent phases.
- **Placeholder profile**: 11 fields exactly: `display_name: 'Debater'`, `username: 'debater'`, `elo_rating: 1200`, `wins: 0`, `losses: 0`, `current_streak: 0`, `level: 1`, `debates_completed: 0`, `token_balance: 50`, `subscription_tier: 'free'`, `profile_depth_pct: 0`. Cast `as any`. No additional or missing fields.
- **URL screen nav**: try-catch covers both `URLSearchParams` creation and `navigateTo()` call. Catch logs `'[Home] screen nav failed:'` as `console.warn`. DOM check uses `'screen-' + urlScreen` (hyphen, not underscore). Both `urlScreen` and DOM element guards required.
- **Post-init calls order**: `loadFollowCounts()` → `renderFeed()` → `loadBountyDotSet()` → `initTournaments()`. None awaited. `loadFollowCounts()` and `initTournaments()` have no `.catch` at callsite. `renderFeed()` uses `console.error('renderFeed error:', e)`. `loadBountyDotSet()` uses `console.warn('loadBountyDotSet error:', e)`.
- **Drip card**: element ID `'screen-home'`, null-guarded with `if (homeEl)`. Error handler is empty `() => {}` (silent, no logging).
- **Invocation**: module-level `if (document.readyState === 'loading')` branch attaches DOMContentLoaded handler; else branch invokes directly. Both attach `.catch(e => console.error('appInit error:', e))`.
- **Return type**: `Promise<void>` (async function). The early `return` in Phase 3 resolves the promise with `undefined`, which is valid for `Promise<void>`.

---

## Cross-Agent Consensus Summary

**1 function verified. 1 PASS, 0 PARTIAL, 0 FAIL.**

| Function | Result | Finding |
|---|---|---|
| appInit | PASS | All Stage 2 claims confirmed accurate |

**Stage 2 is fully accurate. No corrections required.**
