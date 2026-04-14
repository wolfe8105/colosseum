# Refactor Handoff — Session 2026-04-14

## What this is

Parallel workstream to the audit. While audit batches 8Ra–15R are running,
we are refactoring the files that are already audited and not yet refactored.
These files are safe to touch — they are not in any pending audit batch.

---

## The 13 files that need refactoring (over 300 lines)

Sorted by size, largest first:

| File | Lines | Priority |
|---|---|---|
| `src/arena/arena-css.ts` | 773 | High — CSS-only file, splits cleanly by section |
| `src/arena/arena-room-end.ts` | 556 | High |
| `src/arena/arena-feed-machine.ts` | 556 | High |
| `src/pages/plinko.ts` | 551 | High |
| `src/arena/arena-feed-wiring.ts` | 482 | High |
| `src/arena/arena-types.ts` | 421 | Medium |
| `src/modifiers.ts` | 414 | Medium |
| `src/arena/arena-room-setup.ts` | 406 | Medium |
| `src/pages/home.arsenal-shop.ts` | 368 | Medium |
| `src/arena/arena-room-live.ts` | 352 | Medium |
| `src/pages/home.invite.ts` | 324 | Medium |
| `src/rivals-presence.ts` | 313 | Low |
| `src/arena/arena-feed-events.ts` | 304 | Low |

## The 7 files already under 300 lines (no refactor needed)

`share.ts` (281), `arena-loadout-presets.ts` (253), `arena-feed-ui.ts` (135),
`home.ts` (114), `home.arsenal.ts` (99), `home.nav.ts` (82), `api/invite.js` (42)

---

## Refactoring rules (same as previous refactor sessions)

- Target: under 300 lines, preference for 150
- No barrel files. No index.ts re-exports. Direct imports only.
- `import type` for all type-only imports.
- Dependency direction: types → state → utils → features → orchestrator. Nothing imports "up".
- No circular dependencies. If you need one, extract a shared primitive.
- Run `npm run build` after every decomposition and report chunk sizes + line counts.
- Log any landmines as comments in the affected files. Format: `// LANDMINE [LM-XXX-NNN]: description`
- Do NOT fix bugs found during refactoring — that is Phase 2. Refactor only.
- Read the FULL file before proposing any split. Wait for approval before writing code.

---

## Audit context (do not touch these files — they are in pending batches)

Pending audit batches 8Ra–15R cover completely different files. None of the
13 refactor targets above appear in any pending batch. Safe to proceed.

Current audit status: 32 of 57 files done. Findings in `AUDIT-FINDINGS.md`.

---

## How to run a refactor in Claude Code

1. Open fresh CC session pointed at `C:\Users\wolfe\colosseum-main`
2. Paste the prompt from `refactor-prompts/refactor-<filename>.md`
3. CC reads the file, proposes split map, waits for approval
4. On approval, CC executes split, runs build, reports results
5. Push to GitHub

Prompts are in `refactor-prompts/` — one file per target.

---

## How to start the next session

Open a fresh claude.ai chat and paste:

```
Read REFACTOR-HANDOFF.md from https://github.com/wolfe8105/colosseum.
We are refactoring the 13 audited files that are over 300 lines.
The prompts are in refactor-prompts/. Start with arena-css.ts.
```
