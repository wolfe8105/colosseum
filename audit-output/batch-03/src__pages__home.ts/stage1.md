# Stage 1 — Primitive Inventory: home.ts

## Consensus Inventory (23 named bindings)

### Value Imports

| Line | Kind | Name | Source |
|------|------|------|--------|
| 24 | import | initDripCard | ../onboarding-drip.ts |
| 27 | import | ready | ../auth.ts |
| 27 | import | getCurrentUser | ../auth.ts |
| 27 | import | getIsPlaceholderMode | ../auth.ts |
| 27 | import | onChange | ../auth.ts |
| 30 | import | initRivalsPresence | ../rivals-presence.ts (aliased from `init`) |
| 30 | import | destroyRivalsPresence | ../rivals-presence.ts (aliased from `destroy`) |
| 31 | import | showToast | ../config.ts |
| 32 | import | renderFeed | ./home.feed.ts |
| 33 | import | loadBountyDotSet | ../bounties.ts |
| 34 | import | initTournaments | ../tournaments.ts |
| 35 | import | openCategory | ./home.overlay.ts |
| 35 | import | initPullToRefresh | ./home.overlay.ts |
| 36 | import | navigateTo | ./home.nav.ts |
| 37 | import | updateUIFromProfile | ./home.profile.ts |
| 37 | import | loadFollowCounts | ./home.profile.ts |
| 38 | import | CATEGORIES | ./home.state.ts |
| 38 | import | state | ./home.state.ts |

### Type Imports

| Line | Kind | Name | Source |
|------|------|------|--------|
| 28 | import type | Profile | ../auth.ts |
| 29 | import type | User | @supabase/supabase-js |

### Declarations

| Line | Kind | Name | Description |
|------|------|------|-------------|
| 69 | async function | appInit | Main initialization orchestrator; awaits auth ready, removes loading screen, redirects if no session, runs screen nav, feed, bounties, tournaments, drip card |
| 108 | const | urlParams | URLSearchParams from window.location.search |
| 113 | const | catParam | string \| null from urlParams.get('cat') |

**Total: 23 named bindings** (18 value imports + 2 type imports + 1 function + 2 consts)

Note: 13 side-effect imports (lines 11–23) bind no names and are excluded.

---

## Agent Variance Notes

- **Agent 03**: Missed `urlParams` (line 108) and `catParam` (line 113) — reported 21 bindings total.
- **Agent 06**: Received abbreviated source with renumbered lines; line numbers incorrect but names correct.
- **Agent 09**: Arithmetic error — claimed 22 value imports (correct count is 18); their table correctly lists 18 value import names. Final count of 27 is wrong; correct is 23.
- **Agent 11**: Incorrectly included `matchedCat` as a module-scope binding. `matchedCat` is declared inside an if-block at module level but is block-scoped (const inside `{}`), not accessible at module scope.
- **Agents 01, 02, 04, 05, 07, 08, 10**: All correctly identified 23 bindings with correct line numbers.
