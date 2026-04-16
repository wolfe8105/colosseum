# Refactor Prompt — api/profile.js (460 lines → 3 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor api/profile.js (460 lines).

Read CLAUDE.md first, then read api/profile.js in full before touching anything.
This is a Vercel serverless function. It renders a server-side HTML profile page
with OG tags for social crawler link previews. It fetches from Supabase, caches
results in-memory, and returns full HTML.

SPLIT MAP (verify against file before executing):

  api/profile.helpers.js  (~65 lines)
    Keeps: escapeHtml, sanitizeAvatarUrl, getRankTier, formatDate,
            getInitials, parseEmojiAvatar
    Exports: all of the above (named exports)
    Imports: nothing

  api/profile.html.js  (~260 lines)
    Keeps: buildProfileHtml function (the large HTML template builder)
    Exports: buildProfileHtml
    Imports: all helper functions from ./profile.helpers.js

  api/profile.js  (orchestrator, ~100 lines)
    Keeps: SUPABASE_URL, SUPABASE_ANON_KEY, BASE_URL constants,
            profileCache, CACHE_TTL_MS,
            the main handler function (module.exports = async function(req, res))
    Imports: buildProfileHtml from ./profile.html.js
    Does NOT need the helper functions directly — html.js handles them

RULES:
- This is CommonJS (.js), not ESM. Use require/module.exports syntax.
- No barrel files. Direct require() only.
- The handler in api/profile.js is the Vercel entry point — it must remain
  module.exports = async function handler(req, res).
- Run npm run build after the split. Zero errors.
- Log any landmines: // LANDMINE [LM-PROFILE-NNN]: description. Do NOT fix them.
- Refactor only.

Wait for approval of the split map before writing any code.
```

AFTER BUILD PASSES — commit and push to main:
```
git add -A
git commit -m "refactor: <describe what was split>"
git push origin HEAD:main
```
Confirm the push succeeded before ending the session.
