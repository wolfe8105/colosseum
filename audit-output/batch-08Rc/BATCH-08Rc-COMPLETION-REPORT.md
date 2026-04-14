# Batch 8Rc Audit Completion Report

**Date:** 2026-04-14
**Batch:** 8Rc
**Files:** 4
**Total bytes:** 7,357

## Files Audited

| File | Stage 1 | Stage 1.5 | Stage 2 | Stage 3 |
|------|---------|-----------|---------|---------|
| `vite.config.ts` | done | done (agreed) | done | done |
| `src/async.types.ts` | done | done (agreed) | done | done |
| `src/pages/home.feed.ts` | done | done (agreed) | done | done |
| `src/pages/home.types.ts` | done | done (agreed) | done | done |

## Summary

- **Files completed:** 4 of 4
- **Needs-review at stage 1.5:** 0
- **Stage errors:** 0
- **needs-human-review.md:** empty (no unresolved items)

## Key Findings

### vite.config.ts
Pure configuration file. Empty anchor list — no top-level named functions. The only function-like construct is an anonymous inline `manualChunks(id)` method on the Rollup output config (lines 32–42), correctly excluded by all agents. Its two-branch chunk-splitting logic (vendor / shared / default) is noted in Stage 3 `needs_review` for future reference.

### src/async.types.ts
Pure type declaration file. Empty anchor list — 7 exported interfaces/type aliases, no runtime code. Stage 3 `needs_review` flagged: `CategoryFilter` uses an open union with `| string` fallback (making named literals documentation-only); `_userPick` in `StandaloneQuestion` uses a leading underscore (client-side augmented field convention); `RivalEntry.status` and `.direction` are closed unions.

### src/pages/home.feed.ts
Two functions: `fetchLiveDebates` (async, private) and `renderFeed` (async, exported). Both described with high accuracy by all Stage 2 agents. Stage 3 findings:
- **PASS:** `fetchLiveDebates` — all 5 agents, all claims confirmed.
- **PARTIAL:** `renderFeed` — minor issues across agents:
  - `verified_gladiator` is selected in the PostgREST query (line 16) but never mapped into the returned `LiveDebate` object — over-fetching with no behavioral impact.
  - Numeric fallbacks (`|| 0`, `|| 1`, `|| 5`) are applied redundantly in both `fetchLiveDebates` and the `renderFeed` template literal (line 72).
  - Debater name fallbacks are re-applied at render time in addition to the mapping defaults.
  - No try/catch in `renderFeed` itself — errors from `ModeratorAsync.fetchTakes()` would propagate uncaught.

### src/pages/home.types.ts
Pure type declaration file. Empty anchor list — 2 exported interfaces (`Category`, `LiveDebate`), no runtime code.

## Actionable Items from home.feed.ts

1. **Over-fetching `verified_gladiator`** (line 16): `verified_gladiator` is selected from both profile joins but unused in the `.map()`. Consider removing from the select if it's not needed downstream.
2. **Double numeric fallbacks** (line 72 vs. lines 27–29): Fallbacks are applied in both the mapping step and the render template. The render-time `|| 0` on `spectator_count` would re-trigger for any debate with 0 actual spectators (correct behavior, but the double-guard is redundant).
3. **No error boundary in `renderFeed`**: `ModeratorAsync.fetchTakes()` rejection would leave the feed in spinner state. Consider wrapping in try/catch.
