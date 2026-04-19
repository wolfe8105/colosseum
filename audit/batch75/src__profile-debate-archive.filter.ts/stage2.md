# Stage 2 Outputs — profile-debate-archive.filter.ts

## Agent 01

### archiveUrl

`archiveUrl` receives a single parameter, `entry`, typed as `ArchiveEntry`. It reads `entry.debate_mode` into a local constant `mode`, then reads `entry.debate_id`. It reads no module-level state, no DOM, no storage, and makes no network calls. It is synchronous and has no try/catch block. The control flow is a single branch: if `mode` is the string `'ai'`, it returns the string `/moderator-auto-debate.html?id=` with `entry.debate_id` passed through `encodeURIComponent`. For every other value of `mode` — including `'live'`, `'voicememo'`, `'text'`, or any unrecognized string — it falls through to the final return and produces `/moderator-spectate.html?id=` with the same encoded `debate_id`. The function always returns a string; there is no code path that returns `undefined` or throws.

### filtered

`filtered` takes no parameters. It reads four module-level state variables imported from `profile-debate-archive.state.ts`: `entries` (an array of `ArchiveEntry` objects), `filterCat` (a category string), `filterResult` (a result string), and `filterSearch` (a search string). It is synchronous, calls no external APIs, touches no DOM, and performs no I/O.

The function calls `entries.filter()`, passing a predicate that applies up to three sequential elimination checks on each entry `e`. First, if `filterCat` is not the string `'all'`, the predicate compares the entry's `category` field — coalescing to `'general'` when `category` is nullish — against `filterCat`; a mismatch causes an early `return false`. Second, if `filterResult` is `'win'`, entries where `e.is_win` is falsy are rejected; if `filterResult` is `'loss'`, entries where `e.is_win` is truthy are rejected. If `filterResult` holds any other value, neither branch fires. Third, if `filterSearch` is a non-empty string (truthy), the predicate lowercases it into `q`, then lowercases each of three entry fields — `e.topic` (coalescing nullish to `''`), `e.opponent_name ?? e.opponent_username` (coalescing both to `''`), and `e.custom_name` (coalescing nullish to `''`) — and rejects the entry if `q` is not a substring of any of the three. An entry passes all checks only when none of the three guards fires a `return false`. The function returns the resulting filtered array of `ArchiveEntry` objects. It does not mutate `entries` or any other module-level state.

## Agent 02

### archiveUrl

`archiveUrl` takes a single parameter, `entry`, typed as `ArchiveEntry`. It reads `entry.debate_mode` and `entry.debate_id` from that parameter and reads no module-level state, no DOM, and no external storage. It calls `encodeURIComponent` on `entry.debate_id` in both branches. The control flow is a single `if` branch: when `entry.debate_mode` is exactly the string `'ai'`, the function returns a URL string pointing to `/moderator-auto-debate.html` with the encoded debate ID as the `id` query parameter; in all other cases it returns a URL string pointing to `/moderator-spectate.html` with the same encoded ID. The function is synchronous, has no loops, no try/catch, and no early return before the branch — it always returns a string on every code path.

### filtered

`filtered` takes no parameters. It reads four module-level state variables imported from `./profile-debate-archive.state.ts`: `entries`, `filterCat`, `filterResult`, and `filterSearch`. It calls `entries.filter` with an inline predicate, evaluating each element `e` in sequence through up to three independent guard checks.

First, if `filterCat` is not `'all'`, the predicate compares `e.category` (defaulting via nullish coalescing to `'general'`) against `filterCat`; mismatch excludes the entry. Second, if `filterResult` equals `'win'`, entries where `e.is_win` is falsy are excluded; if `filterResult` equals `'loss'`, entries where `e.is_win` is truthy are excluded. Any other value causes neither sub-branch to fire. Third, if `filterSearch` is a non-empty string, the predicate lower-cases it, then lower-cases `e.topic ?? ''`, `(e.opponent_name ?? e.opponent_username) ?? ''`, and `e.custom_name ?? ''`; if none contain `q` as a substring, the entry is excluded. The function returns the resulting filtered array. It is synchronous, writes no state, and has no try/catch.

## Agent 03

### archiveUrl

`archiveUrl` receives a single parameter, `entry`, typed as `ArchiveEntry`. It reads `entry.debate_mode` and `entry.debate_id` from that parameter. It reads no module-level state and accesses no external state (no DOM, no storage, no network). The function is synchronous. It branches on `entry.debate_mode`: if the value equals the string `'ai'`, it returns `/moderator-auto-debate.html?id=` with `entry.debate_id` passed through `encodeURIComponent`. For every other value of `debate_mode`, it returns `/moderator-spectate.html?id=` with the same encoded ID. No error path, no loop, no side effects.

### filtered

`filtered` takes no parameters. It reads `entries`, `filterCat`, `filterResult`, and `filterSearch` from module-level state imported from `profile-debate-archive.state.ts`. It is synchronous.

It calls `entries.filter()` with a predicate applying up to three successive exclusion tests. First, if `filterCat` is not `'all'`, `e.category` (defaulting to `'general'`) is compared against `filterCat`; mismatch returns `false`. Second, if `filterResult` is `'win'`, falsy `e.is_win` returns `false`; if `'loss'`, truthy `e.is_win` returns `false`. Third, if `filterSearch` is non-empty, `q` is the lowercased search term; `topic`, `opp`, and `name` are lowercased entry fields with `''` fallbacks; if none include `q`, returns `false`. Passing all tests returns `true`. Returns the filtered `ArchiveEntry[]`. Writes nothing.

## Agent 04

### archiveUrl

`archiveUrl` accepts a single parameter, `entry`, typed as `ArchiveEntry`. It reads `entry.debate_mode` and `entry.debate_id` and reads no module-level state, no DOM, no storage, no network. It calls `encodeURIComponent` on `entry.debate_id` in both branches. The control flow is a single conditional: if `entry.debate_mode` is `'ai'`, returns URL pointing to `/moderator-auto-debate.html` with encoded `id`; for every other value, returns URL pointing to `/moderator-spectate.html` with same `id`. No loops, no error paths, no try/catch, synchronous.

### filtered

`filtered` accepts no parameters. Reads `entries`, `filterCat`, `filterResult`, and `filterSearch` from module-level state (imported from `./profile-debate-archive.state.ts`). Writes nothing. Returns `entries.filter(...)` result directly.

Inside the predicate, three sequential guard clauses run in order. First, if `filterCat !== 'all'`, compares against `e.category ?? 'general'`; mismatch returns `false`. Second, if `filterResult === 'win'`, returns `false` when `e.is_win` is falsy; if `filterResult === 'loss'`, returns `false` when `e.is_win` is truthy. Third, if `filterSearch` is non-empty: lowercases to `q`; lowercases `e.topic ?? ''`, `e.opponent_name ?? e.opponent_username ?? ''`, `e.custom_name ?? ''`; if none include `q`, returns `false`. All guards pass → returns `true`. Synchronous, no error paths.

## Agent 05

### archiveUrl

`archiveUrl` accepts a single parameter, an `ArchiveEntry` object. It reads `debate_mode` and checks whether it equals `'ai'`. If yes, returns `/moderator-auto-debate.html?id=<encodeURIComponent(debate_id)>`. Otherwise returns `/moderator-spectate.html?id=<encodeURIComponent(debate_id)>`. Reads no module-level state, writes nothing, no I/O. Only external call is `encodeURIComponent`, applied identically in both branches. Synchronous.

### filtered

`filtered` takes no parameters. Reads `entries`, `filterCat`, `filterResult`, and `filterSearch` from module-level state (imported from `profile-debate-archive.state.ts`). Calls `Array.prototype.filter` on `entries` with a three-gate predicate.

Gate 1: if `filterCat !== 'all'`, resolves `category` via nullish coalescing to `'general'`, rejects if mismatch. Gate 2: `filterResult === 'win'` rejects `is_win` falsy entries; `filterResult === 'loss'` rejects `is_win` truthy entries. Gate 3: if `filterSearch` is truthy, lowercases to `q`, lowercases `topic`, `opponent_name ?? opponent_username`, `custom_name` with `''` fallbacks; rejects entry if none contain `q`. Entries passing all gates return `true`. Returns filtered `ArchiveEntry[]`. Writes no state, no I/O, synchronous.
