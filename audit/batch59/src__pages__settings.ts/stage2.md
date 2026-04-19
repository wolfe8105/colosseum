# Stage 2 Outputs — settings.ts

## Agent 01

### (no anchor functions)

## needs_review

**Authentication race condition (LM-SET-001)**: Lines 20-26 implement `Promise.race([ready, setTimeout(6000)])` to wait for auth initialization with a 6-second timeout. If the auth promise (`ready`) doesn't resolve within 6 seconds, the race completes due to timeout and execution continues. The code then checks `!getCurrentUser() && !getIsPlaceholderMode()` and redirects to `moderator-plinko.html` if both are falsy. However, if `ready` is still pending and the timeout fires, `getCurrentUser()` may return stale or undefined state, causing unintended redirects despite the user actually being authenticated. This is a **silent failure pattern** — no error is logged or shown to the user; slow auth simply redirects away with no visual feedback.

**Direct database query without error logging**: Lines 38-63 execute a direct Supabase query to `user_settings` table. Line 45 checks `if (!error && data)` but **silently ignores errors** — if the query fails, `error` will be truthy and the entire block is skipped with no logging or user notification. This creates a scenario where user settings fail to load with no indication to the user or developer. Additionally, there is no defensive null check on the `sb` object before method calls; although line 38 guards with `if (uid && sb)`, the `sb` type casting on lines 36-37 masks potential runtime errors if Supabase is undefined or malformed.

**Type casting masks structural assumptions**: Lines 36-37 use broad type assertions (`as { from: ... }`) to satisfy TypeScript, but this obscures whether `getSupabaseClient()` actually returns a properly initialized Supabase client.

**Missing validation on user ID**: Line 35 extracts `user?.id` with optional chaining but stores it as `uid` without validating it's a non-empty string. Line 42 uses `uid` directly in `.eq('user_id', uid)` — if `uid` is undefined or an empty string, the query may return unexpected results or fail silently.

## Agent 02

### (no anchor functions)

## needs_review

**Authentication Race Condition (Line 21)**
The handler uses `Promise.race([ready, new Promise<void>(r => setTimeout(r, 6000))])`, creating a 6-second timeout race with the auth readiness promise. If the auth subsystem is slow, the timeout expires and execution proceeds prematurely. The code checks `!getCurrentUser() && !getIsPlaceholderMode()` (line 23) but if `ready` never resolves and the timeout wins, `getCurrentUser()` will return a stale or undefined user state, leading to a silent redirect to `moderator-plinko.html` without any UI feedback. This mirrors the known issue flagged in the LM-SET-001 landmine comment and was previously fixed in `home.ts` as part of M-C4.

**Missing Error Handling in Database Query (Lines 39–43)**
The code queries `user_settings` table directly via Supabase client. The error is checked on line 45 (`if (!error && data)`), but there is no logging, user notification, or graceful degradation if the query fails. If the database is unreachable or user permissions are insufficient, the settings simply fail to load silently with no indication to the user.

**Type Assertions Without Validation (Lines 34, 36)**
Lines 34–36 use unsafe type assertions. The runtime does not validate that these types match actual values.

**Toggle State Management Inconsistency (Lines 59–61)**
The condition `if (val !== null && val !== undefined)` will skip setting any toggle where val is null/undefined, but may not reset toggles to false if the database value is explicitly false.

## Agent 03

### (no anchor functions)

## needs_review

**Line 21: Silent timeout on authentication race condition**
The DOMContentLoaded handler uses `Promise.race([ready, new Promise<void>(r => setTimeout(r, 6000))])` which races the auth initialization against a hard 6-second timeout. If the auth `ready` promise does not resolve within 6 seconds, the race completes silently and execution continues with potentially undefined authentication state.

**Line 23-26: Incomplete auth check after timeout**
The guard `if (!getCurrentUser() && !getIsPlaceholderMode())` only redirects if BOTH conditions fail. If the 6-second timeout wins the race, `getCurrentUser()` may return null due to unresolved auth, but `getIsPlaceholderMode()` could independently return true, allowing the handler to fall through to lines 28-65 with partial/undefined user state.

**Line 28-31: Unconditional initialization without auth verification**
`loadSettings()`, `loadModeratorSettings()`, `wireSettings()`, and `wireModeratorToggles()` are called unconditionally after the weak auth guard. No try/catch or .catch() covers these calls.

**Line 34-63: Direct Supabase query without error handling structure**
Lines 39-43 execute a direct `.from('user_settings').select('*').eq('user_id', uid).single()` call. While there is error checking on line 45, errors are silently ignored with no logging and no runtime schema validation on the returned data.

**Line 65: Async operation without error handling**
`await wireIntroMusicRow()` is awaited, but if it rejects, the entire DOMContentLoaded handler will throw an unhandled promise rejection because there is no try-catch wrapping the entire async callback.

## Agent 04

### (no anchor functions)

## needs_review

**Auth race condition with silent failure (lines 20–26)**
Uses `Promise.race([ready, setTimeout(6000)])`. If auth finishes after 6 seconds, `getCurrentUser()` will be null and the handler silently redirects to `moderator-plinko.html` with no UI notification or error logging. This mirrors the pattern flagged as "LM-SET-001".

**Type casting without validation (lines 34–36)**
`getCurrentUser()` is cast as `{ id?: string } | null` (line 34), but the actual return type from the import is not validated.

**Direct Supabase query without RPC abstraction (lines 39–43)**
Directly calls `sb.from('user_settings').select('*').eq('user_id', uid).single()`. This bypasses any RPC function wrapper. If the RLS policy denies access or the table is missing a column, the error is silently ignored (line 45), leaving toggles unset.

**Silent error absorption (line 45)**
`if (!error && data)` means any error results in no setChecked calls and no error reporting. The UI loads with defaults from localStorage, creating ambiguity about whether toggles came from the server or local cache.

**No await error handling on wireIntroMusicRow() (line 65)**
`await wireIntroMusicRow()` is called but there is no error handling for exceptions from this function. If it throws, the entire handler fails silently.

**localStorage/database sync gap (lines 28, 45–61)**
`loadSettings()` loads from localStorage first (line 28), then lines 45–61 conditionally override with database values. If the database query fails, the UI shows stale localStorage values.

## Agent 05

### (no anchor functions)

## needs_review

**1. Auth Race Condition (Lines 20–26)**
The code uses `Promise.race([ready, new Promise<void>(r => setTimeout(r, 6000))])` to wait for authentication initialization with a 6-second timeout. The comment on line 18 explicitly flags this as a known landmine ("LM-SET-001"), noting it mirrors a pre-M-C4 bug in home.ts.

**2. Missing Error Handling on Database Queries (Lines 38–62)**
The code directly queries the `user_settings` table via `sb.from('user_settings').select('*').eq('user_id', uid).single()`. While it checks `if (!error && data)` at line 45, if an error occurs, it silently fails with no user notification or fallback. Users would see unchecked UI toggles even if their settings exist in the database.

**3. Type Casting Without Validation (Line 34)**
`getCurrentUser()` is cast to `{ id?: string } | null` with a comment (line 34), but the actual return type is not verified.

**4. Loose Supabase Client Type (Line 36)**
The `getSupabaseClient()` return value is manually typed as an object with nested method signatures.

**5. Potential Race Between Load Operations (Lines 28–31)**
The calls to `loadSettings()`, `loadModeratorSettings()`, `wireSettings()`, and `wireModeratorToggles()` are synchronous and run sequentially before the async database query. If `wireSettings()` triggers DOM updates that depend on data from `user_settings`, those updates race the database load.

**6. No Handling of Missing User Settings**
If a user has no row in `user_settings` (new user), the `.single()` call will return an error, and the toggles will remain in their default DOM state.
