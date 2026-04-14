# Stage 2 Outputs — reference-arsenal.rpc.ts

## Agent 01
### forgeReference

`forgeReference` is async and accepts a single `ForgeParams` object. It reads all fields from the params object — `source_title`, `source_author`, `source_date`, `locator`, `claim_text`, `source_type`, `category`, and optional `source_url` — trimming all string fields in-place before passing them. It reads no module-level state. It calls `safeRpc` with the RPC name `'forge_reference'` and the mapped parameter object, then awaits the result. If `safeRpc` returns a non-null `error`, the function throws a `new Error` using `error.message` if present, otherwise the fallback string `'Failed to forge reference'`. No early returns exist before the RPC call; the only branch is the post-await error check. On success, `data` is cast to `ForgeResult` and returned.

### editReference

`editReference` is async and accepts a `referenceId` string and a `params` object typed as `ForgeParams` minus `source_type` and `source_url`. It reads `referenceId` directly and trims `source_title`, `source_author`, `locator`, and `claim_text` from params; `source_date` and `category` are passed untrimmed. It calls `safeRpc` with `'edit_reference'`, mapping `referenceId` to `p_ref_id`. No module-level state is read. After awaiting, if `error` is non-null, it throws with `error.message` or `'Failed to edit reference'`. On success, `data` is cast to `EditResult` and returned. Unlike `forgeReference`, `source_type` and `source_url` are not forwarded — they are absent from both the type signature and the RPC params object.

### deleteReference

`deleteReference` is async and accepts a single `referenceId` string. It calls `safeRpc` with `'delete_reference'` and `{ p_ref_id: referenceId }`, typed with a return of `{ action: string }`, and awaits the result. Only the `error` field from the destructured response is used; `data` is discarded. If `error` is non-null, the function throws with `error.message` or `'Failed to delete reference'`. On success, the function returns `void`. There are no branches before the RPC call and no early returns.

### secondReference

`secondReference` is async and accepts a single `referenceId` string. It calls `safeRpc` with `'second_reference'` and `{ p_ref_id: referenceId }`, typed with a return of `SecondResult`, and awaits the result. After awaiting, if `error` is non-null, it throws with `error.message` or `'Failed to second reference'`. On success, `data` is cast to `SecondResult` and returned. No module state is read and there are no branches before the RPC call.

### citeReference

`citeReference` is async and accepts `referenceId` (string), `debateId` (string), and `_outcome` (`'win' | 'loss' | null`, defaulting to `null`). The leading underscore on `_outcome` signals it is likely ignored server-side (the comment on line 98 notes this is a backward-compat wrapper and a no-op in F-55), but it is still forwarded to the RPC as `p_outcome`. It calls `safeRpc` with `'cite_reference'` and all three mapped params, awaiting the result. If `error` is non-null, it throws with `error.message` or `'Failed to cite reference'`. On success, `data` is cast to `{ action: string }` and returned. No module state is read.

### challengeReference

`challengeReference` is async and accepts `referenceId` (string), `grounds` (string), and optional `contextDebateId` (string or null, defaulting to `null`). It calls `safeRpc` with `'challenge_reference'`, mapping to `p_ref_id`, `p_grounds`, and `p_context_debate_id`, then awaits. None of the string params are trimmed before forwarding. If `error` is non-null, it throws with `error.message` or `'Failed to process challenge'`. On success, `data` is cast to `ChallengeResult` and returned. No module state is read and there are no pre-call branches.

### getTrendingReferences

`getTrendingReferences` is async and accepts no parameters. It calls `safeRpc` with `'get_trending_references'` and an empty params object `{}`, then awaits the result. No module state is read. The error handling behavior differs from the other RPCs: if `error` is non-null, the function does not throw — it silently returns an empty array `[]`. On success (or when `data` is null/undefined despite no error), it returns `data || []` cast to `TrendingReference[]`. This makes `getTrendingReferences` the only function in this module with a non-throwing error path.

### getLibrary

`getLibrary` is async and accepts an optional `LibraryFilters` object, defaulting to an empty object. It builds a `params` record dynamically: each of the seven filter fields (`search`, `category`, `rarity`, `sourceType`, `graduated`, `challengeStatus`, `sort`) is conditionally added to the params object only if the value is truthy (or, for `graduated`, non-null). The key for each filter is prefixed with `p_`. The `graduated` field uses a `!= null` check (not a truthiness check), so `false` is included as a valid value while `null` and `undefined` are excluded. After building params, it calls `safeRpc` with `'get_reference_library'` and the constructed params object, then awaits. If `error` is non-null, it throws with `error.message` or `'Failed to load library'`. On success, it returns `data || []` cast to `ArsenalReference[]`. Unlike `getTrendingReferences`, errors here throw rather than silently returning an empty array.

## Agent 02
### forgeReference

`forgeReference` is async and accepts a single `ForgeParams` object. It reads the following fields from `params`: `source_title`, `source_author`, `source_date`, `locator`, `claim_text`, `source_type`, `category`, and optionally `source_url`. String fields (`source_title`, `source_author`, `locator`, `claim_text`, and `source_url` when present) are trimmed before use; `source_url` defaults to `null` if absent or falsy. No module-level state is read.

The function makes a single awaited call to `safeRpc<ForgeResult>('forge_reference', ...)` passing the cleaned params as named Postgres parameters. On success, it casts and returns `data` as `ForgeResult`. On error, it throws a `new Error` using `error.message` if present, otherwise the string `'Failed to forge reference'`. There are no branches beyond the error check.

### editReference

`editReference` is async and accepts a `referenceId` string and a `params` object of type `ForgeParams` minus `source_type` and `source_url`. It reads `referenceId` directly and trims `source_title`, `source_author`, `locator`, and `claim_text` from `params`; `source_date` and `category` are passed as-is. No module-level state is read.

It makes a single awaited call to `safeRpc<EditResult>('edit_reference', ...)` passing `p_ref_id` as the reference ID and the trimmed fields. On success, it casts and returns `data` as `EditResult`. On error, it throws a `new Error` using `error.message` or `'Failed to edit reference'`. There are no other branches.

### deleteReference

`deleteReference` is async and accepts a single `referenceId` string. It reads no module-level state. It makes a single awaited call to `safeRpc<{ action: string }>('delete_reference', { p_ref_id: referenceId })`. The function discards the `data` return value entirely and only inspects `error`. On error, it throws a `new Error` using `error.message` or `'Failed to delete reference'`. On success, it returns `void`. There are no other branches.

### secondReference

`secondReference` is async and accepts a single `referenceId` string. It reads no module-level state. It makes a single awaited call to `safeRpc<SecondResult>('second_reference', { p_ref_id: referenceId })`. On success, it casts and returns `data` as `SecondResult`. On error, it throws a `new Error` using `error.message` or `'Failed to second reference'`. There are no other branches.

### citeReference

`citeReference` is async and accepts `referenceId` (string), `debateId` (string), and `_outcome` (`'win' | 'loss' | null`, defaulting to `null`). The leading underscore on `_outcome` signals the parameter is intentionally unused at the call site in some contexts; it is still passed through to the RPC as `p_outcome`. No module-level state is read.

It makes a single awaited call to `safeRpc<{ action: string }>('cite_reference', ...)` passing all three params as named Postgres parameters. The comment at line 98 indicates this function is kept for backward compatibility and the underlying RPC (`cite_reference`) may be a no-op as of F-55. On success, it casts and returns `data` as `{ action: string }`. On error, it throws a `new Error` using `error.message` or `'Failed to cite reference'`. There are no other branches.

### challengeReference

`challengeReference` is async and accepts `referenceId` (string), `grounds` (string), and `contextDebateId` (`string | null`, defaulting to `null`). It reads no module-level state. It makes a single awaited call to `safeRpc<ChallengeResult>('challenge_reference', ...)` passing all three as named Postgres parameters (`p_ref_id`, `p_grounds`, `p_context_debate_id`). `grounds` is passed without trimming. On success, it casts and returns `data` as `ChallengeResult`. On error, it throws a `new Error` using `error.message` or `'Failed to process challenge'`. There are no other branches.

### getTrendingReferences

`getTrendingReferences` is async and accepts no parameters. It reads no module-level state. It makes a single awaited call to `safeRpc<TrendingReference[]>('get_trending_references', {})` with an empty params object. The error path diverges from the other functions: on error, the function does not throw — it silently returns an empty array `[]`. On success (or when `data` is null/undefined despite no error), it returns `data || []` cast as `TrendingReference[]`, also defaulting to an empty array if `data` is nullish. There are no other branches.

### getLibrary

`getLibrary` is async and accepts an optional `filters` object of type `LibraryFilters`, defaulting to `{}`. It builds a local `params` record by conditionally copying each filter field to its corresponding Postgres parameter name: `search` → `p_search`, `category` → `p_category`, `rarity` → `p_rarity`, `sourceType` → `p_source_type`, `sort` → `p_sort`, `challengeStatus` → `p_challenge_status`. The `graduated` field is included only when it is not `null` or `undefined` (using `!= null`), allowing `false` to pass through; all other fields are included only when truthy. No module-level state is read.

It makes a single awaited call to `safeRpc<ArsenalReference[]>('get_reference_library', params)` with the conditionally-built params object. On error, it throws a `new Error` using `error.message` or `'Failed to load library'`. On success, it returns `data || []` cast as `ArsenalReference[]`. This diverges from `getTrendingReferences` in that errors throw rather than return an empty array.

## Agent 03
### forgeReference

`forgeReference` is async. It receives a `ForgeParams` object and immediately passes trimmed string fields (`source_title`, `source_author`, `locator`, `claim_text`, optional `source_url`) plus untrimmed `source_date`, `source_type`, and `category` to `safeRpc` as named parameters targeting the `forge_reference` database function. `source_url` is trimmed if present and coerced to `null` if absent or empty string. There is no pre-call validation or module state read beyond the params argument. The single await is on `safeRpc`. If `safeRpc` returns a non-null `error`, the function throws a `new Error` using `error.message` or the fallback string `'Failed to forge reference'`. If `error` is null, `data` is cast to `ForgeResult` and returned. There are no other branches and no cleanup path.

### editReference

`editReference` is async. It takes a `referenceId` string and a `ForgeParams`-derived object that omits `source_type` and `source_url`. It passes the reference ID as `p_ref_id` and trimmed versions of `source_title`, `source_author`, `locator`, `claim_text`, plus untrimmed `source_date` and `category`, to `safeRpc` targeting `edit_reference`. No module state is read. The single await is on `safeRpc`. If `error` is non-null, the function throws using `error.message` or `'Failed to edit reference'`. Otherwise it casts `data` to `EditResult` and returns it. There is no branch for a missing reference — that concern is delegated to the server function.

### deleteReference

`deleteReference` is async and returns `void`. It accepts a `referenceId` string, passes it as `p_ref_id` to `safeRpc` targeting `delete_reference`, and awaits the result. Only `error` is destructured from the response; `data` is not read. If `error` is non-null, it throws using `error.message` or `'Failed to delete reference'`. On success it returns `undefined` implicitly. There are no branches beyond the error check and no reads of module state.

### secondReference

`secondReference` is async. It accepts a single `referenceId` string, passes it as `p_ref_id` to `safeRpc` targeting `second_reference`, and awaits the result. No module state is read. If `error` is non-null, it throws using `error.message` or `'Failed to second reference'`. Otherwise it casts `data` to `SecondResult` and returns it. The function has no additional branching; the toggle or idempotency behavior (if any) is entirely in the server function, which this wrapper does not inspect.

### citeReference

`citeReference` is async. It accepts a `referenceId` string, a `debateId` string, and an optional `_outcome` parameter typed as `'win' | 'loss' | null` that defaults to `null`. The underscore prefix signals the parameter is accepted for interface compatibility but is passed through without any client-side use or transformation. All three values are forwarded to `safeRpc` targeting `cite_reference` as `p_reference_id`, `p_debate_id`, and `p_outcome`. A comment at the call site marks this function as kept for backward compatibility and describes it as a no-op in F-55 (uncertainty: the actual server-side behavior of `cite_reference` under F-55 is not visible here). The single await is on `safeRpc`. If `error` is non-null, it throws using `error.message` or `'Failed to cite reference'`. Otherwise it casts `data` to `{ action: string }` and returns it.

### challengeReference

`challengeReference` is async. It accepts a `referenceId` string, a `grounds` string, and an optional `contextDebateId` string that defaults to `null`. All three are passed to `safeRpc` targeting `challenge_reference` as `p_ref_id`, `p_grounds`, and `p_context_debate_id`. No trimming or validation is applied to `grounds` at this layer. No module state is read. The single await is on `safeRpc`. If `error` is non-null, it throws using `error.message` or `'Failed to process challenge'`. Otherwise it casts `data` to `ChallengeResult` and returns it. There is no branch distinguishing a null versus non-null `contextDebateId`; that distinction is left to the server function.

### getTrendingReferences

`getTrendingReferences` is async. It takes no parameters and calls `safeRpc` targeting `get_trending_references` with an empty params object `{}`, then awaits the result. No module state is read. The error path is silent: if `error` is non-null, the function returns an empty array `[]` rather than throwing. On success, it returns `(data || [])` cast to `TrendingReference[]`, with the `|| []` guard covering a null `data` response. This is the only function in the file that swallows errors rather than propagating them.

### getLibrary

`getLibrary` is async. It accepts an optional `LibraryFilters` object that defaults to `{}`. It builds a `params` record by conditionally assigning each filter field only when the field is truthy (or, for `graduated`, non-null). `search`, `category`, `rarity`, `sourceType`, `challengeStatus`, and `sort` are only included if they are truthy strings. `graduated` is included if it is not `null` or `undefined`, meaning `false` is a valid value that gets passed. The resulting `params` object is forwarded to `safeRpc` targeting `get_reference_library`. The single await is on `safeRpc`. If `error` is non-null, it throws using `error.message` or `'Failed to load library'`. On success it returns `(data || [])` cast to `ArsenalReference[]`. Unlike `getTrendingReferences`, errors here are thrown, not swallowed.

## Agent 04
### forgeReference

`forgeReference` is async and takes a single `ForgeParams` object. It reads seven required fields (`source_title`, `source_author`, `source_date`, `locator`, `claim_text`, `source_type`, `category`) and one optional field (`source_url`) from `params`, trimming all string fields inline before passing them. No module-level state is read. It calls `safeRpc<ForgeResult>('forge_reference', {...})` and awaits the result. If `error` is truthy, it throws a new `Error` using `error.message` with the fallback string `'Failed to forge reference'`. On the success path it casts `data` to `ForgeResult` and returns it. `source_url` is normalized to `null` if absent or empty after trimming.

### editReference

`editReference` is async and takes a `referenceId` string and a `params` object that is `ForgeParams` with `source_type` and `source_url` omitted. It maps `referenceId` to `p_ref_id` and trims `source_title`, `source_author`, `locator`, and `claim_text` inline before passing them to `safeRpc<EditResult>('edit_reference', {...})`. `source_date` and `category` are forwarded without transformation. No module-level state is read. It awaits the single `safeRpc` call. If `error` is non-null it throws with `error.message` or the fallback `'Failed to edit reference'`. On success it casts and returns `data` as `EditResult`.

### deleteReference

`deleteReference` is async and accepts a single `referenceId: string`. No module-level state is read. It calls `safeRpc<{ action: string }>('delete_reference', { p_ref_id: referenceId })` and awaits the result, discarding the `data` field entirely. If `error` is truthy it throws a new `Error` using `error.message` or `'Failed to delete reference'`. On success the function returns `void`.

### secondReference

`secondReference` is async and accepts a single `referenceId: string`. No module-level state is read. It calls `safeRpc<SecondResult>('second_reference', { p_ref_id: referenceId })` and awaits the result. If `error` is truthy it throws using `error.message` or `'Failed to second reference'`. On success it casts `data` to `SecondResult` and returns it.

### citeReference

`citeReference` is async and accepts `referenceId: string`, `debateId: string`, and an optional `_outcome` parameter typed `'win' | 'loss' | null` that defaults to `null`. The leading underscore on `_outcome` signals the parameter is unused or deprecated on the client side; the comment notes it is a no-op as of F-55. All three values are passed to `safeRpc<{ action: string }>('cite_reference', {...})` as `p_reference_id`, `p_debate_id`, and `p_outcome` respectively, and the call is awaited. If `error` is non-null it throws with `error.message` or `'Failed to cite reference'`. On success it casts and returns `data` as `{ action: string }`. No module-level state is read.

### challengeReference

`challengeReference` is async and accepts `referenceId: string`, `grounds: string`, and an optional `contextDebateId: string | null` defaulting to `null`. It maps these to `p_ref_id`, `p_grounds`, and `p_context_debate_id` and passes them to `safeRpc<ChallengeResult>('challenge_reference', {...})`, awaiting the result. No trimming or transformation is applied to `grounds` at this layer. If `error` is non-null it throws with `error.message` or `'Failed to process challenge'`. On success it casts and returns `data` as `ChallengeResult`. No module-level state is read.

### getTrendingReferences

`getTrendingReferences` is async and takes no parameters. It passes an empty object `{}` to `safeRpc<TrendingReference[]>('get_trending_references', {})` and awaits the result. No module-level state is read. The error path does not throw: if `error` is non-null the function returns an empty array `[]` silently. On success it returns `data || []` cast to `TrendingReference[]`, so a null or undefined `data` also yields an empty array. The function never throws.

### getLibrary

`getLibrary` is async and accepts an optional `filters: LibraryFilters` object that defaults to `{}`. It reads up to seven optional filter fields from the argument — `search`, `category`, `rarity`, `sourceType`, `graduated`, `challengeStatus`, `sort` — and constructs a `params` record by conditionally appending each one only when it is truthy, except `graduated` which uses a `!= null` check (admitting `false` as a valid value). Fields absent from `filters` are not sent to the RPC at all, leaving the server to apply its own defaults. It then calls `safeRpc<ArsenalReference[]>('get_reference_library', params)` and awaits the result. On error it throws using `error.message` or `'Failed to load library'`. On success it returns `data || []` cast to `ArsenalReference[]`.

## Agent 05
### forgeReference

`forgeReference` is async and accepts a single `ForgeParams` object. It reads six required string fields (`source_title`, `source_author`, `source_date`, `locator`, `claim_text`, `source_type`, `category`) and one optional string field (`source_url`) from `params`. String fields are trimmed inline before being mapped to named RPC parameters; `source_url` is trimmed if present or coerced to `null`. No module-level state is read. It awaits a single call to `safeRpc<ForgeResult>('forge_reference', {...})`. If `error` is truthy, it throws a `new Error` using `error.message` with the fallback `'Failed to forge reference'`. If `error` is null, `data` is cast to `ForgeResult` and returned.

### editReference

`editReference` is async and accepts `referenceId: string` and a `params` object that is `ForgeParams` minus `source_type` and `source_url`. It maps `referenceId` to `p_ref_id` and trims `source_title`, `source_author`, `locator`, and `claim_text` inline. `source_date` and `category` are forwarded without transformation. No module-level state is read. It awaits the single `safeRpc` call. If `error` is non-null it throws with `error.message` or `'Failed to edit reference'`. On success it casts and returns `data` as `EditResult`.

### deleteReference

`deleteReference` is async and accepts a single `referenceId: string`. It passes `referenceId` as `p_ref_id` to `safeRpc<{ action: string }>('delete_reference', {...})` and awaits the result. The return value of `data` is discarded; only `error` is inspected. If `error` is non-null it throws with `error.message` or `'Failed to delete reference'`. On success the function returns `void`.

### secondReference

`secondReference` is async and accepts a single `referenceId: string`. It passes `referenceId` as `p_ref_id` to `safeRpc<SecondResult>('second_reference', {...})` and awaits the result. If `error` is non-null it throws with `error.message` or `'Failed to second reference'`. On success it casts `data` to `SecondResult` and returns it.

### citeReference

`citeReference` is async and accepts `referenceId: string`, `debateId: string`, and an optional `_outcome` parameter typed `'win' | 'loss' | null` that defaults to `null`. The leading underscore on `_outcome` signals that the value is forwarded but treated as semantically unused at this layer (the comment notes it is a no-op as of F-55). All three values are passed to `safeRpc<{ action: string }>('cite_reference', {...})` as `p_reference_id`, `p_debate_id`, and `p_outcome`. On error it throws with `error.message` or `'Failed to cite reference'`. On success it casts and returns `data` as `{ action: string }`.

### challengeReference

`challengeReference` is async and accepts `referenceId: string`, `grounds: string`, and an optional `contextDebateId: string | null` defaulting to `null`. It maps these to `p_ref_id`, `p_grounds`, and `p_context_debate_id` and passes them to `safeRpc<ChallengeResult>('challenge_reference', {...})`. No trimming is applied to `grounds`. If `error` is non-null it throws with `error.message` or `'Failed to process challenge'`. On success it casts and returns `data` as `ChallengeResult`.

### getTrendingReferences

`getTrendingReferences` is async and takes no parameters. It passes an empty object `{}` to `safeRpc<TrendingReference[]>('get_trending_references', {})` and awaits the result. The error path does not throw: if `error` is non-null the function returns an empty array `[]` silently. On success it returns `data || []` cast to `TrendingReference[]`. This function is the only one in the file that swallows errors rather than re-throwing them.

### getLibrary

`getLibrary` is async and accepts an optional `filters: LibraryFilters` object that defaults to `{}`. It builds a `params` record by conditionally adding each filter field: `search`, `category`, `rarity`, `sourceType`, `challengeStatus`, and `sort` are only added if truthy; `graduated` is added if it is not `null` or `undefined` (using `!= null`), meaning `false` is included while `null`/`undefined` are excluded. Each filter maps to a prefixed RPC parameter name. The assembled `params` object is passed to `safeRpc<ArsenalReference[]>('get_reference_library', params)`. On error it throws with `error.message` or `'Failed to load library'`. On success it returns `data || []` cast to `ArsenalReference[]`.
