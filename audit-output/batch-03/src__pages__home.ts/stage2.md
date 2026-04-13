# Stage 2 — Runtime Walk: home.ts

## Agent 01

### appInit (line 69)

Async. Invoked from module-level DOMContentLoaded handler or immediately if document already loaded; both invocations attach `.catch(e => console.error('appInit error:', e))`.

**Phase 1 — Auth wait:** `await Promise.race([ready, new Promise(r => setTimeout(r, 6000))])`. `ready` is the auth module's promise that resolves when Supabase auth state is known (user session loaded, profile fetched, or guest state confirmed). Timeout fallback is 6000ms (6 seconds). Wrapped in try-catch: if race throws, logs `'[Home] auth init failed:'` as console.warn and continues. Execution always proceeds past this block.

**Phase 2 — Loading screen:** Reads `#loading-screen`. Null-guarded with `if (loading)`. If present: adds class `'fade-out'` (triggers CSS animation), then schedules `loading.remove()` via `setTimeout(..., 400)` — removal is NOT synchronous, happens 400ms later.

**Phase 3 — Auth gate:** `if (!getCurrentUser() && !getIsPlaceholderMode())` — both must be true to redirect. Redirects to `'moderator-plinko.html'` via `window.location.href` and `return`s immediately. If user is logged in OR placeholder mode is active, continues.

**Phase 4 — Placeholder mode:** `if (getIsPlaceholderMode())` calls `updateUIFromProfile(null, { display_name: 'Debater', username: 'debater', elo_rating: 1200, wins: 0, losses: 0, current_streak: 0, level: 1, debates_completed: 0, token_balance: 50, subscription_tier: 'free', profile_depth_pct: 0 } as any)`. Injects hardcoded demo profile into UI. `as any` cast bypasses TypeScript validation. Synchronous DOM updates via `updateUIFromProfile`.

**Phase 5 — URL screen nav:** Wrapped in try-catch (logs `'[Home] screen nav failed:'` as warn). Reads `?screen=` query param via `new URLSearchParams(window.location.search).get('screen')`. Two guards: `urlScreen` truthy AND `document.getElementById('screen-' + urlScreen)` exists. Only calls `navigateTo(urlScreen)` if both pass.

**Phase 6 — Post-init calls (all fire-and-forget, none awaited in appInit):**
1. `loadFollowCounts()` — no `.catch` at callsite
2. `renderFeed().catch(e => console.error('renderFeed error:', e))` — async, fire-and-forget with error logging
3. `loadBountyDotSet().catch(e => console.warn('loadBountyDotSet error:', e))` — async, fire-and-forget with warn logging
4. `initTournaments()` — synchronous, no error handling at callsite

**Phase 7 — Drip card:** Reads `#screen-home`. Null-guarded with `if (homeEl)`. Calls `initDripCard(homeEl).catch(() => {})` — silent error suppression, no logging.

Returns `Promise<void>`.

---

## Agents 02–11

(All 11 agents produced substantially identical descriptions. Consensus summary follows.)

---

## Cross-Agent Consensus Summary

All 11 agents agree on all phases of `appInit` with no substantive contradictions.

**Confirmed observations across all 11 agents:**

- **Auth race timeout**: 6000ms (6 seconds). `ready` is the auth promise from `../auth.ts`. Try-catch wraps the race; execution always continues regardless of whether auth resolves or times out.
- **Loading screen**: `#loading-screen` is null-guarded. Removal is async via `setTimeout(..., 400)` — the 400ms delay allows CSS fade animation to complete.
- **Redirect condition**: requires BOTH `!getCurrentUser()` AND `!getIsPlaceholderMode()` to be true. Redirect target is `'moderator-plinko.html'`. Early return prevents all subsequent phases.
- **Placeholder profile values**: `null` user, hardcoded profile with `display_name: 'Debater'`, `elo_rating: 1200`, `wins: 0`, `losses: 0`, `current_streak: 0`, `level: 1`, `debates_completed: 0`, `token_balance: 50`, `subscription_tier: 'free'`, `profile_depth_pct: 0`.
- **URL screen nav**: two-guard pattern (`urlScreen` truthy AND DOM element exists), wrapped in try-catch.
- **Post-init calls**: none are awaited. `renderFeed()` and `loadBountyDotSet()` have `.catch()` handlers. `loadFollowCounts()` and `initTournaments()` do not.
- **Drip card**: `#screen-home` null-guarded, silent `.catch(() => {})`.
- **Return type**: `Promise<void>`.
