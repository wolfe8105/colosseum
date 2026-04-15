# Refactor Prompt — login.ts (382 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/login.ts (382 lines).

Read CLAUDE.md first, then read src/pages/login.ts in full before touching anything. The file is the Login Page — email/password sign-in and sign-up, OAuth, rate limiting, and form field wiring.

SPLIT MAP (verify against the file before executing):

1. login.ts (orchestrator, ~45 lines)
   Keeps: module-level state, DOMContentLoaded init, all imports. Calls sub-modules to wire forms and handle actions.

2. login.helpers.ts (~45 lines)
   getReturnTo, showMsg, clearMsg, getAge, checkRateLimit, recordFailedAttempt, RateLimitCheck type. Pure utilities with no auth dependency.

3. login.email.ts (~100 lines)
   Email/password sign-in and sign-up handlers. Validation logic, safeRpc calls, success redirect, error display. Imports from helpers.

4. login.oauth.ts (~35 lines)
   handleOAuth and the OAuth provider button wiring. Google/Apple sign-in via Supabase OAuth.

5. login.wiring.ts (~110 lines)
   All DOMContentLoaded event listener setup — form tab switching, input field listeners, submit button wiring for email sign-in, sign-up, and OAuth buttons. Calls into email and oauth sub-modules.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- import type for all type-only imports (RateLimitCheck).
- Dependency direction: orchestrator imports email, oauth, wiring. wiring imports email and oauth. email and oauth import helpers. helpers is standalone.
- Target under 115 lines per file.
- Run npm run build after the split, report chunk sizes and line counts for every new file.
- Run npm run typecheck and confirm zero NEW errors in login* files.

LANDMINES — log these as // LANDMINE [LM-LOG-NNN]: description comments. Do NOT fix them:

- LM-LOG-001 (in login.email.ts): Sign-in and sign-up submit buttons are disabled on click. No try/finally — if the auth call throws unexpectedly, buttons stay disabled. Disable-button-no-finally pattern.

- LM-LOG-002 (in login.helpers.ts at checkRateLimit): Rate limit state is stored in module-level variables (not localStorage). A page refresh resets the rate limit counter, making the rate limiting bypassable with a simple refresh.

- LM-LOG-003 (in login.helpers.ts at getAge): getAge uses new Date(year, month - 1, day) which silently overflows invalid dates (e.g. Feb 31 → March 2). The age-gate check can pass or fail incorrectly for birthdays near month-end. Already catalogued as M-F4 in AUDIT-FINDINGS.md (found in plinko.ts — same pattern here).

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
