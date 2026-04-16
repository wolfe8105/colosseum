# Refactor Handoff — Session 2026-04-14

## STATUS: COMPLETE — April 16, 2026

Full TypeScript refactor finished. 372 modules, every file under 300 lines, 4 circular dependency cycles eliminated. All 9 CC bug-fix sweeps also complete. Design phase closed.

---

## Original brief (for reference)

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

## IMPORTANT — Read this first

The GitHub repo at `wolfe8105/colosseum` shows an old flat JavaScript version of the project. **Do not browse GitHub.** Clone the repo using the command below to get the correct TypeScript codebase.

**Clone command (run this in bash first):**
```bash
git clone https://YOUR_GITHUB_TOKEN@github.com/wolfe8105/colosseum.git /home/claude/colosseum
cd /home/claude/colosseum
```

Get the token from a recent past chat — search for "github token colosseum ghp" in past conversations.

After cloning you will see `src/`, `src/arena/`, `src/pages/`, `refactor-prompts/` etc. If you see only flat `.js` files, you did not clone correctly.

---

## How to start the next session

Open a fresh claude.ai chat and paste exactly this:

```
Search past chats for "github token colosseum ghp" to get the token. Then clone https://TOKEN@github.com/wolfe8105/colosseum.git into /home/claude/colosseum using bash_tool. Then read REFACTOR-HANDOFF.md from the cloned repo. We are refactoring the 13 audited TypeScript files that are over 300 lines. The individual CC prompts are in refactor-prompts/. Start by reading src/arena/arena-css.ts in full, then propose a split map.
```

