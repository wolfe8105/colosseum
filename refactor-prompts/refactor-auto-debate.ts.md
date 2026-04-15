# Refactor Prompt — auto-debate.ts (385 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/auto-debate.ts (385 lines).

Read CLAUDE.md first, then read src/pages/auto-debate.ts in full before touching anything. The file is the Auto-Debate page — loads a single AI debate, renders it, handles voting, loads more debates, share, and confetti.

SPLIT MAP (verify against the file before executing):

1. auto-debate.ts (orchestrator, ~50 lines)
   Keeps: module-level state, DOMContentLoaded init, auth gate, loadDebate call. All imports. Replaces local escHtml with escapeHTML from config.ts.

2. auto-debate.helpers.ts (~35 lines)
   getCatIcon, showError, getFingerprint. Pure helpers with no DOM dependency beyond showError's getElementById call.

3. auto-debate.render.ts (~110 lines)
   renderDebate, loadMoreDebates. Builds the full debate HTML and handles the "load more" append flow. Uses escapeHTML from config.ts.

4. auto-debate.vote.ts (~60 lines)
   castVoteImpl, showResults, loadBackendCounts. Voting flow — RPC call, result display, confetti trigger, backend count sync.

5. auto-debate.share.ts (~55 lines)
   shareDebateImpl, downloadCard, goSignup, spawnConfetti. Share, download, signup redirect, and the confetti animation.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- Delete local escHtml function. Replace all escHtml(...) calls with escapeHTML from config.ts.
- Dependency direction: orchestrator imports render, vote, share, helpers. render imports helpers. vote imports share (for confetti). share is otherwise standalone.
- Target under 115 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in auto-debate* files.

LANDMINES — log these as // LANDMINE [LM-AD-NNN]: description comments. Do NOT fix them:

- LM-AD-001 (fixed during refactor): Local escHtml is a duplicate of escapeHTML from config.ts. Being replaced as part of this refactor — no landmine comment needed.

- LM-AD-002 (in auto-debate.vote.ts at castVoteImpl): Vote button is disabled on click. If the RPC throws, the button stays disabled — no try/finally. Disable-button-no-finally pattern.

- LM-AD-003 (in auto-debate.render.ts at loadMoreDebates): Fetches the next debate by calling an RPC with the current debate ID and category. If the user navigates away mid-fetch, the result still resolves and may render into a DOM that no longer exists.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
