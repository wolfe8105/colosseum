# Refactor Prompt — plinko.ts (552 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/pages/plinko.ts (552 lines).

Read CLAUDE.md first, then read src/pages/plinko.ts in full before touching anything. The file is THE MODERATOR's signup gate controller — a linear 5-step flow: OAuth/Email → Age Gate → Username → Mod Opt-in → Enter.

SPLIT MAP (verify against the file before executing):

1. plinko.ts (orchestrator, ~50 lines)
   Imports and invokes each step attacher, the helper modules, and the DOMContentLoaded handler. Keeps the TOTAL_STEPS constant and the isPlaceholder flag check + placeholder banner show. Calls `attachStep1`, `attachStep2`, `attachStep3`, `attachStep4`, `attachStep5`, and `attachAuthReturnHandler` inside DOMContentLoaded along with the existing `updateProgress()` + `ready.then()` already-logged-in check.

2. plinko-state.ts (~25 lines)
   Module-level mutable state with setter functions:
   - currentStep, signupMethod, signupEmail, signupPassword, signupDob, _isMinor
   - set_currentStep, set_signupMethod, set_signupEmail, set_signupPassword, set_signupDob, set_isMinor
   - TOTAL_STEPS constant (or keep it in the orchestrator)
   Follows the arena-state.ts pattern already in use in the codebase.

3. plinko-helpers.ts (~85 lines)
   getReturnTo, updateProgress, goToStep (which calls injectInviteNudge on step 5), showMsg, clearMsg, getAge, and the DOB select population code (days + years).

4. plinko-password.ts (~55 lines)
   validatePasswordComplexity and checkHIBP. Pure functions, no DOM.

5. plinko-invite-nudge.ts (~50 lines)
   injectInviteNudge — fetches get_my_invite_link and appends the "BRING YOUR FRIENDS" card to step 5. Used by goToStep in plinko-helpers.ts.

6. plinko-step1-method.ts (~70 lines)
   `export function attachStep1(): void` — wires the Google/Apple OAuth buttons, the email toggle, and the email-next button (which runs the password complexity + HIBP checks and advances to step 2). Imports validatePasswordComplexity and checkHIBP from plinko-password.ts.

7. plinko-step2-age.ts (~30 lines)
   `export function attachStep2(): void` — wires btn-age-next: validates DOB, TOS checkbox, minimum age 13, sets signupDob and _isMinor, advances to step 3.

8. plinko-step3-username.ts (~160 lines — largest section, acceptable)
   `export function attachStep3(): void` — wires btn-create. This function has two branches: email signup (calls signUp, handles result.session null → email confirmation UI, result.session present → step 4) and oauth (calls update_profile + set_profile_dob RPCs, goes to step 4). Keep both branches inline; if you want to reduce size, extract `handleEmailSignupResult` and `handleOAuthProfileUpdate` as file-local helpers.

9. plinko-step4-step5.ts (~25 lines)
   `export function attachStep4(): void` and `export function attachStep5(): void` — btn-enable-mod, btn-skip-mod, btn-enter. Small enough to share a file.

10. plinko-auth-return.ts (~80 lines)
    `export function attachAuthReturnHandler(): void` — the onAuthStateChange subscription + the hash-based email confirmation return handler. Both paths restore step 5 UI after email confirmation. Extract the shared restoration logic (restore step-5 title, show enterBtn, hide resendBtn) into a file-local `restoreStep5UI()` helper.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- `import type` for all type-only imports.
- Dependency direction: state → helpers → password/invite-nudge → step attachers → auth-return → orchestrator.
- Target under 300 lines, preference 150. Step 3 at ~160 is acceptable; splitting the email vs oauth branches further would fragment the single create-account flow awkwardly.
- Run `npm run build` after the split, report chunk sizes and line counts for every new file.
- Run `npm run typecheck` and confirm zero NEW errors in plinko* files.

LANDMINES — log these as `// LANDMINE [LM-PLINKO-NNN]: description` comments. Do NOT fix them:

- LM-PLINKO-001 (in plinko-state.ts): `_isMinor` is set at line 286 of the original file but never read anywhere. Either a dead variable or an incomplete feature (minor-specific UX was planned but not wired). Verify before cleanup.
- LM-PLINKO-002 (in plinko-step3-username.ts near the getSupabaseClient call): Line 383 uses `getSupabaseClient() as any` — the only `as any` in this file. Everything else uses explicit type assertions with shaped interfaces. Replace with a proper shape in a follow-up.
- LM-PLINKO-003 (in plinko-auth-return.ts): The step-5 UI restoration after email confirmation (restore title, show enterBtn, hide resendBtn, clear hash) is duplicated between the onAuthStateChange handler (lines 488-514 of the original) and the hash-based handler (lines 518-542 of the original). Extract to restoreStep5UI() — this IS acceptable to do in this refactor since the two blocks are byte-identical and extraction is purely structural.
- LM-PLINKO-004 (in plinko-auth-return.ts): The `ready.then(...)` already-logged-in redirect at line 546 runs in parallel with the onAuthStateChange SIGNED_IN handler registered at line 487. If a user is already signed in AND an INITIAL_SESSION event fires shortly after, both paths race — one redirects to getReturnTo(), the other advances to step 2. Verify intent; may be benign if the redirect always wins.

Do NOT fix landmines except LM-PLINKO-003 (the shared UI restoration is pure deduplication, not a bug fix). Refactor only.

Wait for approval of the split map before writing any code.
```
