# Refactor Prompt — api/profile.html.js (356 lines → 2 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor api/profile.html.js (356 lines).

Read CLAUDE.md first, then read api/profile.html.js in full before touching
anything. This file has one job (build HTML for profile page) but the bulk of
the line count is a large inline CSS block. Extract the CSS to its own file.

SPLIT MAP (verify against file before executing):

  api/profile.css.js  (~120 lines)
    Keeps: the entire CSS string that is embedded in the <style> tag inside
            buildProfileHtml. Extract it as a named export:
            export function getProfileCSS() { return `...`; }
    Imports: nothing
    Note: The CSS references no JS variables — it is a pure string.

  api/profile.html.js  (~240 lines)
    Removes: the inline CSS block
    Adds: import { getProfileCSS } from './profile.css.js';
    Calls: getProfileCSS() at the point where the CSS was embedded
    Keeps: buildProfileHtml, build404Html, BASE_URL, all imports from helpers

RULES:
- This is ESM (.js with import/export). Keep ESM syntax throughout.
- No barrel files. Direct imports only.
- api/ files are not compiled by Vite — no build gate needed.
  Instead verify: node -e "import('./api/profile.html.js').then(m => console.log(Object.keys(m)))"
  or simply confirm the three functions are still exported correctly.
- Log any landmines: // LANDMINE [LM-PROFILEHTML-NNN]: description. Do NOT fix them.
- Refactor only.

After confirming the exports look correct, commit and push directly to main:
git add -A
git commit -m "refactor: extract profile CSS string to api/profile.css.js"
git push origin HEAD:main
Confirm push succeeded.
```
