# Refactor Prompt — src/auth.core.ts (319 lines → 3 files)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/auth.core.ts (319 lines).

Read CLAUDE.md first, then read src/auth.core.ts in full before touching anything.
This file manages Supabase auth state, init, and utilities. Two functions are
genuinely self-contained and can be extracted without touching shared state.

SPLIT MAP (verify against file before executing):

  src/auth.rpc.ts  (~45 lines)
    Keeps: safeRpc function only.
    Imports: getSupabaseClient (from auth.core.ts, to avoid circular — use lazy
             import or restructure: safeRpc can import getSupabaseClient from auth.core.ts
             only if auth.core.ts does NOT import from auth.rpc.ts)
    NOTE: safeRpc needs supabaseClient. The safest approach: pass supabaseClient
          as a parameter, OR keep a getter import. Check for circular dep before committing.
          If circular dep arises, keep safeRpc in auth.core.ts and only extract auth.gate.ts.

  src/auth.gate.ts  (~55 lines)
    Keeps: requireAuth function only.
    Imports: getCurrentUser, getIsPlaceholderMode from auth.core.ts
             escapeHTML from config.ts

  src/auth.core.ts  (orchestrator, ~225 lines)
    Removes: safeRpc (moved to auth.rpc.ts), requireAuth (moved to auth.gate.ts)
    Re-exports: safeRpc from auth.rpc.ts, requireAuth from auth.gate.ts
                (so all existing "import { safeRpc } from './auth.ts'" imports stay valid
                 — auth.ts re-exports everything, so no import path changes needed downstream)

CRITICAL CHECK:
  src/auth.ts is the public facade that re-exports from auth.core.ts and sibling files.
  Verify that auth.ts continues to re-export safeRpc and requireAuth after the split.
  Any file that imports from './auth.ts' must continue to work unchanged.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports.
- Dependency direction: types → auth.rpc.ts/auth.gate.ts → auth.core.ts.
- Run npm run build after the split. Zero errors.
- Run npm run typecheck. Zero new errors.
- Log any landmines: // LANDMINE [LM-AUTHCORE-NNN]: description. Do NOT fix them.
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
