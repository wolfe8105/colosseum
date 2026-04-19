# Stage 3 Verdicts — auth.ops.ts

## Verdicts

| Function | Verdict |
|---|---|
| `signUp` | PASS |
| `logIn` | PASS |
| `oauthLogin` | PASS |
| `logOut` | PASS |
| `resetPassword` | PASS |
| `updatePassword` | PASS |

---

## `signUp` — PASS

No discrepancies. Stage 2 accurately describes all params, guards, `APP.baseUrl` redirect construction, `display_name`/`date_of_birth` mapping, `data.user ?? undefined` null-coalesce, and catch shape.

**Security:** No innerHTML, no numeric casting, no hex colors. All auth data goes directly to the Supabase SDK — no DOM surface. Clean.

---

## `logIn` — PASS

No discrepancies. Stage 2 correctly distinguishes that `data.user` is NOT null-coalesced here (unlike `signUp` line 28's `?? undefined`). Catch correctly propagated.

**Security:** No DOM interaction. Note: `data.user` may be `null` in the returned `AuthResult` — callers must guard against null.

---

## `oauthLogin` — PASS

No discrepancies. Stage 2 correctly identifies `provider as 'google'` as a TypeScript-only cast (runtime value unchanged), `redirectTo ?? window.location.href` nullish fallback, no browser navigation performed (URL returned to caller).

**Security:** No DOM interaction. The caller-supplied `redirectTo` is passed verbatim to Supabase — Supabase's allowed-redirect-URLs config is the only server-side mitigation. Low severity given external enforcement.

---

## `logOut` — PASS

No discrepancies. Stage 2 accurately describes the placeholder guard returning `{ success: true }` without `placeholder: true` (inconsistency correctly flagged); double-optional-chain `notif?.destroy?.()` on `window.ColosseumNotifications`; `Promise.race` with 3s resolving (never-rejecting) timeout; catch swallowing errors with `console.error`; unconditional `_clearAuthState()` + `_notify(null, null)` + `return { success: true }`.

**Security / structural observations:**
- **Error swallowing is intentional** ("continuing anyway" comment) but callers always receive `{ success: true }` and cannot detect a failed server-side session revocation.
- **Dangling `setTimeout`:** No `clearTimeout` handle stored. If `signOut()` completes in under 3s, the `setTimeout` callback still fires 3s later, emitting a spurious `console.warn`. Minor resource behavior issue.
- **`placeholder: true` field absent** (line 62): Returns `{ success: true }` — all other functions' placeholder guards return `{ success: true, placeholder: true }`. Behavioral inconsistency — see L-B41-4c below.

---

## `resetPassword` — PASS

No discrepancies. Stage 2 correctly notes `window.location.origin` (dynamic) is used for redirect URL — inconsistent with `signUp`'s `APP.baseUrl` (static). Only `{ error }` is destructured.

**Security:** No DOM interaction. `email` passed directly to Supabase SDK — no DOM vector. Redirect URL is not user-supplied — no open-redirect risk.

---

## `updatePassword` — PASS

No discrepancies. Stage 2 accurately describes the minimal flow: placeholder guard → `updateUser({ password: newPassword })` → throw on error → return `{ success: true }`.

**Security:** No DOM interaction. No client-side password strength validation (server-enforced). Requires active Supabase session — SDK enforces this.

---

## Findings Summary

| ID | Severity | Location | Description |
|---|---|---|---|
| L-B41-4a | LOW | Line 5 | `getCurrentUser` and `getCurrentProfile` imported but never used in this file — dead imports |
| L-B41-4b | LOW | `logOut` line 61–74 | Dangling `setTimeout` in `Promise.race`: no `clearTimeout` handle stored; `console.warn` fires 3s after completion even when `signOut()` wins the race |
| L-B41-4c | LOW | `logOut` line 62 | Placeholder guard returns `{ success: true }` — missing `placeholder: true` field present in all other functions' placeholder returns |
| L-B41-4d | LOW | `resetPassword` line 89 vs `signUp` line 17 | Inconsistent base URL strategy: `resetPassword` uses `window.location.origin` (dynamic); `signUp` uses `APP.baseUrl` (static) — may produce incorrect reset-link URLs in multi-environment deployments |

---

## needs_review

None.
