# Refactor Prompt — debate-landing.ts (382 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/debate-landing.ts (382 lines).

Read CLAUDE.md first, then read src/pages/debate-landing.ts in full before touching anything. The file is the Debate Landing page — loads a single debate for sharing/preview, renders it, handles voting, shows vote results, share actions, and confetti.

SPLIT MAP (verify against the file before executing):

1. debate-landing.ts (orchestrator, ~50 lines)
   Keeps: module-level state, DOMContentLoaded init, auth gate, loadDebate call. All imports. Replaces local escHtml with escapeHTML from config.ts.

2. debate-landing.render.ts (~100 lines)
   render function. Builds the full debate landing HTML — topic, sides, category, vote buttons, share row. Uses escapeHTML.

3. debate-landing.vote.ts (~55 lines)
   castVote, loadBackendCounts, showResults. Voting flow — fingerprint dedup, RPC call, result percentages display. Imports spawnConfetti from share sub-module.

4. debate-landing.share.ts (~70 lines)
   shareDebate, downloadCard, goSignup, spawnConfetti. Share/download/signup/confetti — all the post-vote actions.

5. debate-landing.helpers.ts (~50 lines)
   escHtml (deleted — replaced by escapeHTML), getFingerprint, showError, getCatIcon (if present). Pure helpers.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- Delete local escHtml function. Replace all escHtml(...) calls with escapeHTML from config.ts.
- Dependency direction: orchestrator imports render, vote, share, helpers. vote imports share (for confetti). render imports helpers. share is otherwise standalone.
- Target under 105 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in debate-landing* files.

LANDMINES — log these as // LANDMINE [LM-DL-NNN]: description comments. Do NOT fix them:

- LM-DL-001 (fixed during refactor): Local escHtml duplicate of escapeHTML. Being replaced — no landmine comment needed.

- LM-DL-002 (in debate-landing.vote.ts at castVote): Vote button is disabled on click with no try/finally. If the RPC throws, buttons stay disabled. Disable-button-no-finally pattern.

- LM-DL-003 (in debate-landing.render.ts): render() sets container.innerHTML which resets scroll position and destroys any in-progress interactions if called while the user is reading the page.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
