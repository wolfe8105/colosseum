# Stage 2 Outputs — auth.moderator.ts

## Agent 01

### toggleModerator
Awaits `getCurrentProfile()` and `getCurrentUser()` into locals. Branches on `getIsPlaceholderMode()`: if true, mutates `currentProfile.is_moderator = enabled` and, when `enabled === false`, also writes `currentProfile.mod_available = false`; then calls `_notify(currentUser, currentProfile)` and returns `{success: true}`. Otherwise `try`: awaits `safeRpc('toggle_moderator_status', { p_enabled: enabled })`, throws if `error` truthy, applies the same two-field profile mutation, calls `_notify`. Returns `data` cast to `AuthResult` if non-null, else `{success: true}`. `catch` returns `{success: false, error: e.message}`. Mutates module-external state: the profile object returned by `getCurrentProfile()` (shared reference per header comment) and whatever subscribers `_notify` fans out to.

### toggleModAvailable
Same shape as `toggleModerator` without the cascade. Placeholder branch sets `currentProfile.mod_available = available`, fires `_notify`, returns success. Live branch awaits `safeRpc('toggle_mod_available', { p_available: available })`, throws on error, writes `currentProfile.mod_available = available`, calls `_notify`, returns data or `{success: true}`. Catch yields failure envelope. `is_moderator` never touched; unclear whether server rejects `available=true && is_moderator=false`.

### updateModCategories
Reads profile/user. Placeholder branch coerces `currentProfile` to `Record<string, unknown>` and writes `.mod_categories = categories`, `_notify` + success. Live branch awaits `safeRpc('update_mod_categories', { p_categories: categories })`, throws on error, applies the cast-and-assign, `_notify`, returns data or `{success: true}`. Catch returns failure. Accepts empty array without guard.

### submitReference
Signature accepts `debateId`, `url`, `description`, and unused `_supportsSide`. Placeholder branch returns `{success: true, reference_id: 'placeholder-ref-' + Date.now()}`. Live: URL protocol guard — if `url` truthy and fails `/^https?:\/\//i`, returns `{success: false, error: 'Invalid URL — must start with http:// or https://'}`; null url skips check. Try: awaits `safeRpc('submit_reference', { p_debate_id, p_content: url ?? null, p_reference_type: description ?? null })`. Parameter mapping mismatch: `url` sent as `p_content`, `description` as `p_reference_type` — unverified. Throws on error; returns data as `AuthResult & {reference_id?}` or `{success: true}`. Catch returns failure. No module state touched.

### ruleOnReference
Placeholder returns `{success: true}`. Live awaits `safeRpc('rule_on_reference', { p_reference_id, p_ruling, p_reason: reason ?? null })`. Throws on error; returns data or `{success: true}`. Catch returns failure. No validation on `ruling`. No module state.

### scoreModerator
Placeholder returns `{success: true}`. Live awaits `safeRpc('score_moderator', { p_debate_id, p_score })`. Throws on error; returns data or `{success: true}`. Catch returns failure. No client-side range check on `score`. No module state.

### assignModerator
First: if `moderatorId` truthy and fails `isUUID(moderatorId)`, short-circuits `{success: false, error: 'Invalid moderator ID'}`. Null skips check. Placeholder returns `{success: true, moderator_type: moderatorType ?? 'ai'}` — placeholder default `'ai'` while live call default is `'human'`, intentional mismatch flagged. Live awaits `safeRpc('assign_moderator', { p_debate_id, p_moderator_id: moderatorId ?? null, p_moderator_type: moderatorType ?? 'human' })`. Throws on error; returns data cast or `{success: true}` (without `moderator_type` in fallback). Catch returns failure. No module state.

### getAvailableModerators
Return type `ModeratorInfo[]` (not `AuthResult`). Placeholder returns two hardcoded entries (`mod-1 FairJudge`, `mod-2 NeutralMod`). Live awaits typed `safeRpc<ModeratorInfo[]>('get_available_moderators', { p_exclude_ids: excludeIds ?? [] })`. Throws on error; returns `data ?? []`. Catch logs `'getAvailableModerators error:'` and returns `[]` — failures swallowed, indistinguishable from a genuine empty result to caller.

### getDebateReferences
Return type `DebateReference[]`. Placeholder returns `[]` (no mock data). Live awaits typed `safeRpc<DebateReference[]>('get_debate_references', { p_debate_id })`. Throws on error; returns `data ?? []`. Catch logs `'getDebateReferences error:'` and returns `[]`. No `debateId` format validation.

## Agent 02

### toggleModerator
Reads `currentProfile`, `currentUser` via module-level getters in `auth.core.ts`. Placeholder branch: mutates `currentProfile.is_moderator = enabled`; if `enabled` false, also clears `mod_available = false` on the same object reference (LM-AUTH-001); calls `_notify(currentUser, currentProfile)`; returns `{success: true}`. Live path awaits `safeRpc('toggle_moderator_status', {p_enabled})`. On `error` catch returns `{success: false, error: message}`; on success applies same local mutation + `_notify`, returns data cast or `{success: true}`. Uncertainty: if RPC succeeds but server rejected internally (`data.success === false`), local profile still gets mutated — stale client state on server-side denial.

### toggleModAvailable
Two-branch shape as above. Placeholder: writes `currentProfile.mod_available = available`, notify, success. Live: awaits `safeRpc('toggle_mod_available', {p_available})`, error returns failure, success writes mod_available + notify, returns data or success. Same caveat about negative `data.success`.

### updateModCategories
Placeholder: casts `currentProfile` to `Record<string, unknown>` to bypass typing and writes `mod_categories = categories`, notify, success. Live: awaits `safeRpc('update_mod_categories', {p_categories})`, error returns failure, success cast-and-assign + notify, returns data or success. Typed Profile shape apparently lacks `mod_categories` — schema/type drift.

### submitReference
`_supportsSide` accepted but unused. Placeholder returns synthetic `{success: true, reference_id: 'placeholder-ref-' + Date.now()}`. Live: URL protocol allowlist — if url truthy and not `/^https?:\/\//i`, returns `{success: false, error: 'Invalid URL ...'}` (Session 134 XSS guard vs `javascript:`/`data:`). Else awaits `safeRpc('submit_reference', { p_debate_id, p_content: url ?? null, p_reference_type: description ?? null })`. Error → failure envelope. Success returns data cast or success. Uncertainty: `p_content`/`p_reference_type` parameter naming mismatch with caller semantics.

### ruleOnReference
Pure passthrough. Placeholder returns `{success: true}`. Live awaits `safeRpc('rule_on_reference', { p_reference_id, p_ruling, p_reason: reason ?? null })`; error → failure; success → data cast or `{success: true}`. `ruling` typed `string` — no client-side enum check.

### scoreModerator
Passthrough. Placeholder returns success. Live awaits `safeRpc('score_moderator', { p_debate_id, p_score })`; error → failure; success → data or success. No range validation.

### assignModerator
Gate: `moderatorId` truthy && `isUUID` false → `{success: false, error: 'Invalid moderator ID'}`. Null moderatorId bypasses. Placeholder returns `{success: true, moderator_type: moderatorType ?? 'ai'}`. Live awaits `safeRpc('assign_moderator', { p_debate_id, p_moderator_id: moderatorId ?? null, p_moderator_type: moderatorType ?? 'human' })` — `'human'` default differs from placeholder `'ai'`, looks unintentional. Error → failure; success → data or `{success: true}`.

### getAvailableModerators
Placeholder returns hardcoded 2 entries (FairJudge rating 82, NeutralMod rating 71) regardless of `excludeIds` — exclusion dropped in placeholder. Live awaits typed RPC; on error catches, `console.error`s, returns `[]` — swallow, unlike AuthResult-returners. Success returns `data ?? []`. Callers cannot distinguish "no moderators available" from "RPC failed."

### getDebateReferences
Placeholder returns `[]`. Live awaits typed RPC; error caught, console.error, returns `[]`. Success returns `data ?? []`. Same caller-ambiguity.

**Module state touched:** currentProfile (mutated by three functions via shared reference from `getCurrentProfile()`), currentUser (read-only). No module-local variables in this file. **Cross-cutting:** three error-handling flavors (AuthResult envelope, array swallow, submitReference pre-flight). Every function short-circuits on placeholder first. `_notify` only called by profile-mutating trio.

## Agent 03

### toggleModerator
Async. Reads `getCurrentProfile()`, `getCurrentUser()`, `getIsPlaceholderMode()`. Placeholder: when profile truthy, writes `is_moderator = enabled`; if enabled false, writes `mod_available = false` on same reference; `_notify(currentUser, currentProfile)`; returns `{success: true}`. Live: awaits `safeRpc('toggle_moderator_status', { p_enabled })`; thrown error routes to catch returning `{success: false, error: (e as Error).message}`; on success performs the same two writes + `_notify`, returns RPC data cast or fallback. Local mutation runs even if `data` payload signals failure (only thrown errors skip it) — uncertainty depends on whether `safeRpc` surfaces failures via `error` or `data.success`.

### toggleModAvailable
Reads profile/user. Placeholder: writes `mod_available = available` when profile truthy, `_notify`, returns success. Live: awaits RPC, thrown error returns failure, else writes mod_available + notify, returns data or success. Same caveat re local write preceding data-level failure inspection.

### updateModCategories
Placeholder: casts profile to `Record<string, unknown>` and writes `mod_categories = categories` (cast implies field absent from static type — uncertainty). Else notify, success. Live: await RPC, error → failure, success → cast-and-assign + notify + return data or success.

### submitReference
Params `debateId`, nullable `url`, nullable `description`, unused `_supportsSide`. Placeholder returns `{success: true, reference_id: 'placeholder-ref-' + Date.now()}`. Validation: url truthy + regex fail → `{success: false, error: 'Invalid URL ...'}` (session 134 guard). Live awaits `safeRpc('submit_reference', { p_debate_id, p_content: url ?? null, p_reference_type: description ?? null })`. Description forwarded into `p_reference_type`, url into `p_content` — parameter-name semantic mismatch flagged. Error → failure; success → data cast or success.

### ruleOnReference
Params `referenceId`, `ruling`, nullable `reason`. Placeholder returns success. Live awaits `safeRpc('rule_on_reference', { p_reference_id, p_ruling, p_reason: reason ?? null })`; error → failure; success → data cast or success. No UUID validation on `referenceId`.

### scoreModerator
Params `debateId`, numeric `score`. Placeholder success. Live awaits `safeRpc('score_moderator', { p_debate_id, p_score })`; error → failure; success → data or success. No client-side range check.

### assignModerator
Pre-RPC UUID guard: `moderatorId` truthy + `isUUID` false → `{success: false, error: 'Invalid moderator ID'}`. Placeholder returns `{success: true, moderator_type: moderatorType ?? 'ai'}` — default `'ai'` in placeholder vs `'human'` in live call (divergence noted). Live awaits `safeRpc('assign_moderator', { p_debate_id, p_moderator_id: moderatorId ?? null, p_moderator_type: moderatorType ?? 'human' })`. Error → failure; success → data cast or success. No UUID check on `debateId`.

### getAvailableModerators
Param optional `excludeIds`. Placeholder returns hardcoded 2-element fixture array. Live awaits typed RPC; thrown error caught, `console.error('getAvailableModerators error:', e)`, returns `[]`; success returns `data ?? []`. Divergent contract: never returns AuthResult-shaped error — callers get `[]` with only a console trace.

### getDebateReferences
Param `debateId`. Placeholder returns `[]`. Live awaits typed RPC; thrown error caught, `console.error('getDebateReferences error:', e)`, returns `[]`; success returns `data ?? []`. No UUID validation on `debateId`.

**Cross-cutting**: no module-local variables; shared state reached via `getCurrentUser()/getCurrentProfile()` from auth.core.ts; three mutators use direct in-place mutation of currentProfile (LM-AUTH-001); `_notify` only invoked by mutators; two error-handling contracts. `isUUID` only applied to `moderatorId`; `debateId`/`referenceId` pass through unvalidated on client. `submitReference` forwards description into `p_reference_type`, url into `p_content`.

## Agent 04

### toggleModerator
Reads: `getIsPlaceholderMode()`, `getCurrentProfile()`, `getCurrentUser()`, param `enabled`. Writes: `currentProfile.is_moderator = enabled`; when `enabled=false`, also `currentProfile.mod_available = false` (shared ref, LM-AUTH-001). Calls: `safeRpc('toggle_moderator_status', { p_enabled })`, `_notify(currentUser, currentProfile)`. Control flow: placeholder branch mutates profile (when present), notifies, returns `{success:true}`. Real branch awaits RPC; on error throws into catch returning `{success:false, error: message}`. On success: mutates profile (guarded by currentProfile truthy), notifies, returns `data as AuthResult` or `{success:true}` fallback. Async: one awaited RPC. Error path: rejection/error-field coerces to failure envelope; profile NOT mutated and `_notify` NOT fired on failure.

### toggleModAvailable
Reads: placeholder, profile, user, param `available`. Writes: `mod_available = available` only if profile non-null. Calls: `safeRpc('toggle_mod_available', { p_available })`, `_notify`. Control flow mirrors toggleModerator without the cascade. Error: RPC failure skips mutation and notify; no rollback because no prior mutation.

### updateModCategories
Writes: `(currentProfile as Record<string, unknown>).mod_categories = categories` — cast because `mod_categories` absent from typed profile shape. Calls: `safeRpc('update_mod_categories', { p_categories })`, `_notify`. Control flow same pattern. Uncertainty: server full-replace vs merge semantics not visible.

### submitReference
Reads: placeholder, params including underscore-prefixed unused `_supportsSide` (forwarded nowhere). Writes: no module state. Calls: `safeRpc('submit_reference', { p_debate_id, p_content: url ?? null, p_reference_type: description ?? null })`. Control flow: (1) placeholder returns `{success: true, reference_id: 'placeholder-ref-' + Date.now()}`. (2) URL gate: truthy url && regex fail → `{success: false, error: 'Invalid URL ...'}` (Session 134 XSS guard vs `javascript:`/`data:`). (3) try awaits RPC; throw on error; success returns data cast or success. Uncertainty: param naming inverted — caller `url` maps to server `p_content`; caller `description` maps to `p_reference_type`.

### ruleOnReference
Reads: placeholder, params. Writes: none. Calls: `safeRpc('rule_on_reference', { p_reference_id, p_ruling, p_reason: reason ?? null })`. Placeholder returns success. Else await RPC, throw on error, return data cast or success. Uncertainty: `ruling` typed string; enum values server-enforced.

### scoreModerator
Reads: placeholder, params. Writes: none. Calls: `safeRpc('score_moderator', { p_debate_id, p_score })`. Standard placeholder/live/throw/catch envelope. Uncertainty: score range server-enforced.

### assignModerator
Reads: params, `isUUID`, placeholder. Writes: none. Calls: `isUUID(moderatorId)` preflight; `safeRpc('assign_moderator', { p_debate_id, p_moderator_id: moderatorId ?? null, p_moderator_type: moderatorType ?? 'human' })`. Control flow: (1) `moderatorId` truthy && !isUUID → pre-RPC failure. (2) Placeholder returns `{success: true, moderator_type: moderatorType ?? 'ai'}` — `'ai'` vs `'human'` asymmetry flagged (likely deliberate AI-mock, not documented). (3) Else await RPC, throw on error, return data cast or success.

### getAvailableModerators
Reads: placeholder, `excludeIds`. Writes: none. Calls: `safeRpc<ModeratorInfo[]>(...)`, `console.error` on failure. Placeholder returns hardcoded 2-element fixture (FairJudge, NeutralMod). Live awaits RPC; error throws to catch; returns `data ?? []`. Catch logs `'getAvailableModerators error:', e` and returns `[]` — swallows errors. Callers cannot distinguish empty list from RPC failure.

### getDebateReferences
Reads: placeholder, `debateId`. Writes: none. Placeholder returns `[]`. Live awaits typed RPC; throw on error; return `data ?? []`. Catch logs `'getDebateReferences error:'` and returns `[]`. Same swallow-to-empty pattern. No UUID check — contrast with `assignModerator`, asymmetry flagged.

**Cross-cutting**: mutator trio mutates currentProfile in place (LM-AUTH-001); real-branch mutation only after RPC resolves without error (no rollback needed); non-mutators return AuthResult envelopes; two getters swallow to `[]`; only `assignModerator` validates UUID; `submitReference` validates URL protocol; others forward unchecked.

## Agent 05

### toggleModerator
Module state mutated: shared `currentProfile` ref from `getCurrentProfile()` (LM-AUTH-001).
Reads: `getCurrentProfile()`, `getCurrentUser()`, `getIsPlaceholderMode()`, param `enabled`. Writes: `currentProfile.is_moderator = enabled`; on `enabled === false` also `mod_available = false`. Calls: `safeRpc('toggle_moderator_status', { p_enabled })` in non-placeholder; `_notify(currentUser, currentProfile)` in both branches on success. Control flow: (1) placeholder — mutates only if profile truthy, notifies, early-returns success. (2) real inside try: await RPC; if error, throw into catch; else conditionally mutates (nested `if`), notifies, returns `data ?? {success: true}`. Catch returns `{success: false, error: (e as Error).message}`. Async: one awaited RPC. Local mutation only after RPC resolves — optimistic state never written in error path. Placeholder is synchronous but declared async. Uncertainty: `is_moderator`/`mod_available` typing relies on Profile shape not loaded here.

### toggleModAvailable
Writes: `currentProfile.mod_available = available` (only if profile truthy). Standard placeholder/live envelope. Async: one await; mutation post-resolve. Uncertainty: no client guard preventing `mod_available=true && is_moderator=false`.

### updateModCategories
Writes: `(currentProfile as Record<string, unknown>).mod_categories = categories`. Cast implies field absent from typed Profile. Standard pattern. Uncertainty: no client-side validation of category strings.

### submitReference
Reads: placeholder, params including unused `_supportsSide` (underscore-prefixed, forwarded nowhere). Writes: none. Calls: `safeRpc('submit_reference', { p_debate_id, p_content: url ?? null, p_reference_type: description ?? null })`. Anomalous argument naming — `description` passed as `p_reference_type`. Control flow: placeholder returns synthetic placeholder-ref; URL protocol gate (truthy url && regex fail → early failure per Session 134); try/await/throw/catch envelope.

### ruleOnReference
Reads: placeholder, params. Writes: none. Calls `safeRpc('rule_on_reference', { p_reference_id, p_ruling, p_reason: reason ?? null })`. No client validation of `ruling` enum or `referenceId` UUID.

### scoreModerator
Standard envelope. No numeric casting or range clamping — `Number()` not applied (CLAUDE.md's numeric-casting rule targets innerHTML, not RPC args, so likely intentional). No UUID check on `debateId`.

### assignModerator
UUID preflight on `moderatorId`. Placeholder returns `{success: true, moderator_type: moderatorType ?? 'ai'}` — default `'ai'` diverges from real-path default `'human'` (semantic inconsistency flagged). Standard try/catch envelope. Uncertainty: `'ai'` vs `'human'` default divergence looks like a bug or intentional stubbing — can't confirm.

### getAvailableModerators
Placeholder returns hardcoded 2-element fixture. Live awaits typed RPC; catch logs + returns `[]`. Divergent return shape from mutators — plain array, not AuthResult. UI cannot distinguish "no moderators" from "rpc failed." Uncertainty: no UUID validation on entries of `excludeIds` — contrast with `assignModerator`.

### getDebateReferences
Placeholder returns `[]`. Live awaits typed RPC; catch logs + returns `[]`. No UUID check on `debateId`. Silent degradation to empty list.

**Cross-cutting notes:**
- All functions guard on `getIsPlaceholderMode()` first.
- Mutator trio mutates currentProfile in place; non-mutators return AuthResult envelopes; two getters swallow to `[]`.
- Real-branch mutation only after RPC resolves without error — no rollback needed.
- Only `assignModerator` validates UUID; `submitReference` validates URL protocol; other functions forward unchecked.
- Anomalies flagged: `_supportsSide` unused; `description` sent as `p_reference_type`; `assignModerator` placeholder vs real default-type divergence.
