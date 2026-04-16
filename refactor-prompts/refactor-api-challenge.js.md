# Refactor Prompt — api/challenge.js (311 lines → 3 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor api/challenge.js (311 lines).

Read CLAUDE.md first, then read api/challenge.js in full before touching anything.
This Vercel serverless function renders a challenge link page with OG tags.
It has three distinct concerns: helpers, HTML builders, and the handler.

SPLIT MAP (verify against file before executing):

  api/challenge.helpers.js  (~35 lines)
    Keeps: escapeHtml, getCategoryLabel, getModeLabel
    Exports: all three (named exports)
    Imports: nothing

  api/challenge.html.js  (~235 lines)
    Keeps: buildChallengeHtml(preview, code), buildExpiredHtml()
    Both are HTML string builders for this page. BASE_URL constant used
    in buildExpiredHtml must be passed in or imported.
    Exports: buildChallengeHtml, buildExpiredHtml
    Imports: escapeHtml, getCategoryLabel, getModeLabel from ./challenge.helpers.js
    Imports: BASE_URL constant — either re-declare it or import from challenge.js
             (preferred: re-declare it in html.js to keep it self-contained)

  api/challenge.js  (handler, ~40 lines)
    Keeps: SUPABASE_URL, SUPABASE_ANON_KEY, BASE_URL constants,
            the handler (module.exports = async function handler(req, res))
    Removes: all helper functions and HTML builders
    Imports: buildChallengeHtml, buildExpiredHtml from ./challenge.html.js
    Handler logic stays exactly as-is.

RULES:
- This is CommonJS (.js). Use require/module.exports syntax throughout.
- No barrel files. Direct require() only.
- The entry point is module.exports = async function handler — must stay in challenge.js.
- Run npm run build after the split. Zero errors.
- Log any landmines: // LANDMINE [LM-CHALLENGE-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
```
