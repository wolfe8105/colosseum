# Stage 2 Outputs — modifiers-catalog.ts

## Agent 01

### getModifierCatalog

`getModifierCatalog` is async and takes no parameters. It reads two module-level variables — `_catalogCache` (a `ModifierEffect[]` or `null`) and `_catalogFetchedAt` (a numeric timestamp) — along with the module-level constant `CATALOG_TTL_MS` (3,600,000 ms). At the top of the function, it calls `Date.now()` to capture the current time. It then checks whether `_catalogCache` is non-null and whether the elapsed time since `_catalogFetchedAt` is less than `CATALOG_TTL_MS`; if both conditions are true, it returns `_catalogCache` immediately without making any network call. If the cache is absent or stale, the function awaits `safeRpc('get_modifier_catalog')`, which is imported from `./auth.ts` and issues a Supabase RPC call with 401-retry logic. When `safeRpc` settles, the function inspects `result.error` and whether `result.data` is an array. If either condition is bad — `result.error` is truthy or `result.data` is not an array — it logs to `console.error` with the prefix `[Modifiers] catalog fetch failed:` and returns `_catalogCache ?? []`, meaning it falls back to whatever was previously cached, or an empty array if nothing was ever cached. On success, it casts `result.data` to `ModifierEffect[]`, writes it into `_catalogCache`, writes the capture time into `_catalogFetchedAt`, and returns `_catalogCache`. There are no try/catch blocks; error detection is entirely via the `result.error` field. The function has no other side effects and writes no external state.

### getEffect

`getEffect` is async and accepts a single `effectId` string parameter. It awaits `getModifierCatalog()`, which either returns the in-memory cache or fetches it. Once the catalog array resolves, `getEffect` calls `Array.prototype.find` on it, comparing each element's `id` property against `effectId`. It returns the first matching `ModifierEffect` object, or `null` if no element matches (via the nullish coalescing fallback from `undefined`). The function reads no module-level state directly, writes no state, and has no branches beyond the `find` lookup.

### getEndOfDebateEffects

`getEndOfDebateEffects` is async and takes no parameters. It awaits `getModifierCatalog()` and then calls `Array.prototype.filter` on the resolved array, retaining only elements whose `timing` property strictly equals the string `'end_of_debate'`. It returns the resulting sub-array, which may be empty if no elements match. The function reads no module-level state directly, writes no state, and has no error paths of its own.

### getInDebateEffects

`getInDebateEffects` is async and takes no parameters. Its structure is identical to `getEndOfDebateEffects` except the filter predicate checks for `timing === 'in_debate'` instead of `'end_of_debate'`. It awaits `getModifierCatalog()`, applies `Array.prototype.filter` on the result, and returns the sub-array of matching `ModifierEffect` elements.

## Agent 02

### getModifierCatalog

`getModifierCatalog` is async. It reads two module-level variables — `_catalogCache` (a `ModifierEffect[]` or `null`) and `_catalogFetchedAt` (a numeric timestamp, initially `0`) — and the module-level constant `CATALOG_TTL_MS` (3,600,000 ms). It also calls `Date.now()` to capture the current time in `now`. If `_catalogCache` is non-null and the elapsed time since `_catalogFetchedAt` is less than `CATALOG_TTL_MS`, the function returns `_catalogCache` immediately without any network call. If the cache is absent or stale, the function calls `safeRpc('get_modifier_catalog')` and awaits the result. If `result.error` is truthy, or `result.data` is not an array, the function logs to `console.error` and returns `_catalogCache` if it is non-null, or an empty array `[]` if it is null — so a stale cache is preferred over an empty result when a refetch fails. On success, it writes `result.data` (cast to `ModifierEffect[]`) into `_catalogCache`, writes `now` into `_catalogFetchedAt`, and returns `_catalogCache`. There is no try/catch block; thrown exceptions from `safeRpc` propagate to the caller.

### getEffect

`getEffect` is async and accepts one parameter, `effectId: string`. It reads no module-level state directly. It awaits `getModifierCatalog()`, which returns the in-memory cache or a freshly fetched array. It then calls `Array.prototype.find` on the returned array, comparing each element's `id` field to `effectId`. It returns the first matching `ModifierEffect` object, or `null` if no element matches (via the nullish coalescing fallback from `undefined`). It writes nothing. There are no branches beyond what `getModifierCatalog` may encounter internally, no loops, and no error paths specific to this function.

### getEndOfDebateEffects

`getEndOfDebateEffects` is async and accepts no parameters. It awaits `getModifierCatalog()` to obtain the full catalog array, then calls `Array.prototype.filter` on that array, retaining only elements whose `timing` field strictly equals the string `'end_of_debate'`. It returns the filtered array, which may be empty if no elements match. It reads no module-level state directly and writes nothing. There are no branches, loops, or error paths specific to this function beyond what propagates from `getModifierCatalog`.

### getInDebateEffects

`getInDebateEffects` is async and accepts no parameters. Its structure is identical to `getEndOfDebateEffects` except the filter predicate tests `e.timing === 'in_debate'`. It awaits `getModifierCatalog()`, filters the result to elements whose `timing` equals `'in_debate'`, and returns that filtered array. It reads no module-level state directly, writes nothing, and has no error paths of its own.

## Agent 03

### getModifierCatalog

`getModifierCatalog` is async. It reads two module-level variables, `_catalogCache` (a `ModifierEffect[]` or `null`) and `_catalogFetchedAt` (a number), along with the constant `CATALOG_TTL_MS` (3,600,000 ms). It calls `Date.now()` to capture the current timestamp. If `_catalogCache` is non-null and the elapsed time since `_catalogFetchedAt` is less than `CATALOG_TTL_MS`, the function returns `_catalogCache` immediately without making any network call. If the cache is absent or stale, the function awaits `safeRpc('get_modifier_catalog')`, passing no additional parameters. On return from `safeRpc`, the function inspects `result.error` and whether `result.data` is an array. If either `result.error` is truthy or `result.data` is not an array, it logs the error to `console.error` and returns `_catalogCache ?? []` — returning the stale cache contents if they exist, or an empty array if the cache was never populated. There is no `try/catch` block; error detection relies entirely on the `result.error` check. On the happy path, `_catalogCache` is set to `result.data` cast as `ModifierEffect[]`, `_catalogFetchedAt` is set to `now`, and the freshly cached array is returned.

### getEffect

`getEffect` is async. It accepts a single `effectId` string parameter and reads no module-level state directly. It awaits `getModifierCatalog()` to obtain the full catalog array, then calls `Array.prototype.find` on it, comparing each element's `id` property against `effectId`. It returns the first matching `ModifierEffect` object, or `null` if no match is found (via the `?? null` nullish coalescing on `undefined`). There are no branches beyond what `getModifierCatalog` contains, no early returns specific to this function, no loops other than the implicit iteration inside `find`, and no error handling beyond what propagates from `getModifierCatalog`.

### getEndOfDebateEffects

`getEndOfDebateEffects` is async. It accepts no parameters and reads no module-level state directly. It awaits `getModifierCatalog()` to obtain the full catalog array, then calls `Array.prototype.filter` on the result, returning a new array containing only those `ModifierEffect` elements whose `timing` property strictly equals the string `'end_of_debate'`. The return value is always an array. There are no branches, early returns, loops, or error paths specific to this function.

### getInDebateEffects

`getInDebateEffects` is async. It accepts no parameters and reads no module-level state directly. It awaits `getModifierCatalog()` to obtain the full catalog array, then calls `Array.prototype.filter` on the result, returning a new array containing only those `ModifierEffect` elements whose `timing` property strictly equals the string `'in_debate'`. The return value is always an array. The structure is identical to `getEndOfDebateEffects`, differing only in the `timing` string compared against.

## Agent 04

### getModifierCatalog

`getModifierCatalog` is async and takes no parameters. It reads two module-level variables — `_catalogCache` (a `ModifierEffect[]` or `null`) and `_catalogFetchedAt` (a numeric timestamp) — and the module-level constant `CATALOG_TTL_MS` (3,600,000 ms). At entry it calls `Date.now()` to capture the current time. It then checks whether `_catalogCache` is non-null and whether the elapsed time since `_catalogFetchedAt` is less than `CATALOG_TTL_MS`; if both conditions are true it returns `_catalogCache` immediately without any network call. If the cache is absent or stale, it awaits `safeRpc('get_modifier_catalog')`, passing only the RPC name and no additional parameters. On return from `safeRpc`, it inspects `result.error` and whether `result.data` is an array; if either check fails it logs to `console.error` and returns the current value of `_catalogCache` if it is non-null, otherwise returns an empty array — this early return path preserves the previous stale cache over returning nothing. On the happy path, it writes `result.data` (cast to `ModifierEffect[]`) into `_catalogCache` and writes `now` into `_catalogFetchedAt`, then returns `_catalogCache`. There is no try/catch block; any exception thrown by `safeRpc` propagates to the caller unhandled.

### getEffect

`getEffect` is async and accepts a single string parameter `effectId`. It reads no module-level state directly. It awaits `getModifierCatalog()`, which either serves the in-memory cache or fetches from the network as described above, and assigns the returned array to `catalog`. It then calls `Array.prototype.find` on that array, testing each element's `id` property for strict equality with `effectId`. If a match is found it returns that `ModifierEffect`; if no match is found, `find` returns `undefined` and the nullish-coalescing operator substitutes `null`, which is returned. There are no branches beyond the implicit ones inside `getModifierCatalog`, no loops written explicitly here, no error path of its own, and no try/catch.

### getEndOfDebateEffects

`getEndOfDebateEffects` is async and takes no parameters. It reads no module-level state directly. It awaits `getModifierCatalog()` and assigns the result to `catalog`. It then calls `Array.prototype.filter` on that array, keeping every element whose `timing` property strictly equals the string `'end_of_debate'`. It returns the filtered array, which may be empty if no elements match. There are no branches, early returns, loops, error paths, or try/catch blocks in the function body itself.

### getInDebateEffects

`getInDebateEffects` is async and takes no parameters. Its structure is identical to `getEndOfDebateEffects` except that the `filter` predicate tests `e.timing === 'in_debate'` instead of `'end_of_debate'`. It awaits `getModifierCatalog()`, filters the returned array for elements whose `timing` is `'in_debate'`, and returns the result.

## Agent 05

### getModifierCatalog

`getModifierCatalog` is async and takes no parameters. It reads two module-level variables — `_catalogCache` (a `ModifierEffect[]` or `null`) and `_catalogFetchedAt` (a numeric timestamp) — along with the module-level constant `CATALOG_TTL_MS` (3,600,000 ms). At the top of the function it calls `Date.now()` and compares the result against `_catalogFetchedAt`. If `_catalogCache` is non-null and the elapsed time is less than `CATALOG_TTL_MS`, the function returns `_catalogCache` immediately without touching the network. When the cache is absent or stale, the function awaits `safeRpc('get_modifier_catalog')`, passing the RPC name as the sole argument. The awaited `result` object is then inspected: if `result.error` is truthy or `result.data` is not an array, the function logs to `console.error` and returns either the existing stale `_catalogCache` (if one exists from a prior successful fetch) or an empty array — it does not throw. On the success path, it casts `result.data` to `ModifierEffect[]`, writes it to `_catalogCache`, writes `now` to `_catalogFetchedAt`, and returns the newly cached array. There are no try/catch blocks and no loops. The function has no side-effects beyond writing those two module-level variables.

### getEffect

`getEffect` is async and accepts a single `effectId` string parameter. It reads no module-level state directly. It calls `getModifierCatalog()` and awaits the result, receiving either a populated `ModifierEffect[]` or an empty array. It then calls `Array.prototype.find` on that array, comparing each element's `id` property against `effectId`. If a matching element is found, it is returned; otherwise the nullish-coalescing operator produces `null`. There are no branches beyond the implicit found/not-found split inside `find`, no error path of its own, and no try/catch blocks.

### getEndOfDebateEffects

`getEndOfDebateEffects` is async and takes no parameters. It calls `getModifierCatalog()` and awaits the result. It then calls `Array.prototype.filter` on the returned array, retaining only elements whose `timing` property strictly equals the string `'end_of_debate'`. The filtered array is returned directly; it may be empty. There is no branching, no error path of its own, no try/catch, and no module-level state accessed or written beyond what `getModifierCatalog` already touches.

### getInDebateEffects

`getInDebateEffects` is async and takes no parameters. Its structure is identical to `getEndOfDebateEffects`: it awaits `getModifierCatalog()` and passes the result through `Array.prototype.filter`, retaining only elements whose `timing` property strictly equals `'in_debate'`. The filtered array is returned. As with `getEndOfDebateEffects`, the result may be empty and there is no independent error path or try/catch.
