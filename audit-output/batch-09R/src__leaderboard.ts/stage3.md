# Stage 3 Outputs — src/leaderboard.ts

## Agent 01

### fetchLeaderboard (line 103)

**Verification**: PARTIAL

**Findings**:

- **Early-return on isLoading**: PASS. Source line 104: `if (isLoading) return;`.
- **Early-return on missing client or placeholder mode**: PASS. Source line 107: `if (!sb || getIsPlaceholderMode()) return;`.
- **Sort column derivation**: PASS. Lines 111–114 confirm `'elo_rating'` / `'wins'` / `'current_streak'` mapping exactly.
- **safeRpc call with p_sort_by / p_limit / p_offset**: PASS. Lines 116–120 confirm all three params and the `'get_leaderboard'` RPC name.
- **Error/empty-data path sets `liveData = null` only when `!append`**: PASS. Line 123.
- **Error/empty-data path always sets `hasMore = false`**: PASS. Line 124.
- **Success path rank computation as `currentOffset + i + 1`**: PASS. Line 127.
- **`hasMore` set to `true` iff row count equals `PAGE_SIZE`**: PASS. Line 141.
- **Append vs replace of `liveData`**: PASS. Line 142: `liveData = append ? [...(liveData ?? []), ...rows] : rows`.
- **myRank update only when `!append`**: PASS. Lines 144–148.
- **catch block logs, sets `liveData = null` if not appending, sets `hasMore = false`**: PASS. Lines 151–153.
- **`isLoading = false` in all exit paths**: PASS. Line 155 (outside try/catch, always runs).

**Gap (PARTIAL)**: Agent 02 says `getCurrentUser()` is called "only when `append` is false." The source calls `getCurrentUser()` (line 144: `const me = getCurrentUser()?.id;`) inside the success branch unconditionally, then uses `me` inside `if (me && !append)`. The call itself occurs regardless of `append`; only the `myRank` write is guarded. Agents 01, 03, 04, and 05 describe this more accurately.

**Unverifiable claims**: None.

---

### getData (line 158)

**Verification**: PASS

**Findings**: None. All five agents accurately describe that the function returns `liveData` if non-null, otherwise `PLACEHOLDER_DATA`, with no side effects. Source lines 158–160 confirm exactly.

**Unverifiable claims**: None.

---

### renderShimmer (line 166)

**Verification**: PASS

**Findings**: All agents agree: six iterations, varying widths using `55 + i * 5` and `35 + i * 3`, returns concatenated HTML string, reads no state, writes nothing. Source lines 168–180 confirm all claims exactly.

**Unverifiable claims**: None.

---

### showEloExplainer (line 187)

**Verification**: PASS

**Findings**:

- **Removes existing modal first**: PASS. Line 188: `document.getElementById('elo-explainer-modal')?.remove()`.
- **Creates div, sets id, sets style.cssText, sets innerHTML**: PASS. Lines 190–250.
- **Attaches click listener for backdrop dismissal (`e.target === modal`)**: PASS. Lines 252–254.
- **Appends to `document.body`**: PASS. Line 255.
- **Close button wired by module-level delegation, not locally**: PASS. The local listener only handles `e.target === modal` (the backdrop). The `data-action="close-elo-explainer"` close button is handled by the delegation block at lines 498–499.
- **No module state read or written**: PASS.

- **Agent 05 note about "a question-mark span that triggers `show-elo-explainer`"**: The `showEloExplainer` function's modal content itself does not contain a `data-action="show-elo-explainer"` span — that span lives in the `render()` tab bar, not inside the modal. This is an error in Agent 05's description of `showEloExplainer`.

**Unverifiable claims**: None.

---

### renderList (line 262)

**Verification**: PARTIAL

**Findings**:

- **Early return on `liveData === null && !isLoading`**: PASS. Lines 263–267.
- **Calls `getData()` otherwise**: PASS. Line 268.
- **Shallow copy and sort descending by currentTab column**: PASS. Lines 269–274. The default comparator returns `0`, confirmed by line 273.
- **`forEach` mutates `rank` in-place**: PASS. Lines 276–278.
- **`data-username` attribute on each row holds escaped username**: PASS. Lines 302, 305.
- **`vgBadge(p.verified_gladiator)` and `bountyDot(p.id)` called inline**: PASS. Line 320.
- **Streak >= 5 colored var(--mod-magenta)**: PASS. Line 324.
- **"LOAD MORE" button appended if `hasMore`**: PASS. Lines 330–338.
- **Rank 1–3 get medal emoji and gold-tinted background**: PASS. Lines 307, 311.
- **escHtml on `p.user` and `p.user[0]`**: PASS. Lines 318, 320.

- **Genuine PARTIAL**: The spread at line 269 (`[...data]`) creates a shallow copy of the array but the objects inside are the same references. The `forEach` at line 276 writes `item.rank = i + 1`, which mutates the original objects in `liveData` (or `PLACEHOLDER_DATA`). No agent flagged that rank mutations bleed back into live state.

**Unverifiable claims**: None.

---

### render (line 345)

**Verification**: PARTIAL

**Findings**:

- **Reads `document.getElementById('screen-leaderboard')`, returns if absent**: PASS. Lines 346–347.
- **Calls `getCurrentProfile()`**: PASS. Line 349.
- **`myElo` from `Number(profile?.elo_rating) || 1200`, `myWins` from `Number(profile?.wins) || 0`**: PASS. Lines 351–352.
- **`myName` from `(profile?.username ?? 'YOU').toUpperCase()` through `escHtml`**: PASS. Line 353.
- **`rankDisplay` = `#${myRank}` or `#--` if null**: PASS. Line 354.
- **Sets `container.innerHTML` to full shell**: PASS. Lines 356–414.
- **Three tab buttons with `data-action="set-tab"` and `data-tab`**: PASS. Lines 383–403.
- **ELO tab includes `?` span with `data-action="show-elo-explainer"`**: PASS. Lines 393–399.
- **`#lb-list` content is `renderShimmer()` when `isLoading`, else `renderList()`**: PASS. Line 411.
- **After innerHTML, attaches delegated click on `lb-list` for profile navigation**: PASS. Lines 417–425.
- **Navigation uses `window.location.href = '/u/' + encodeURIComponent(username)`**: PASS. Line 423.

- **Agent 02 note about multiple listeners**: Agent 02 correctly notes that `innerHTML` replacement re-creates the element, resetting accumulated listeners. PASS.

- **Agent 02 claim — "render reads... implicitly `liveData` (via the calls it makes)"**: PARTIAL. `render` does not directly read `liveData` itself; it accesses it indirectly via `renderList()`. The claim is technically correct but describes indirect access.

**Unverifiable claims**: None.

---

### setTab (line 432)

**Verification**: PARTIAL

**Findings**:

- **Writes `currentTab`, resets `currentOffset = 0`, `hasMore = false`, `liveData = null`**: PASS. Lines 433–436.
- **Calls `render()` synchronously first**: PASS. Line 437.
- **Awaits `fetchLeaderboard()` with no args**: PASS. Line 438.
- **Calls `render()` again after fetch**: PASS. Line 439.
- **Async, returns `Promise<void>`**: PASS. Line 432.

- **Agent 03 claim — first `render()` "will render the shimmer-or-empty state"**: PARTIAL. This is inaccurate: at the moment of the first `render()` call, `isLoading` is false (not yet set to `true` by `fetchLeaderboard`) and `liveData` is null. So `renderList()` hits the early-return error path (lines 263–267), showing the error div. The shimmer is never shown because shimmer requires `isLoading === true` (line 411). Agents 01, 02, 04, 05 correctly identify this.

**Unverifiable claims**: None.

---

### setTime (line 442)

**Verification**: PASS

**Findings**:

- **Synchronous, exported**: PASS. Line 442.
- **Writes `currentTime`**: PASS. Line 443.
- **Resets `currentOffset = 0`, `hasMore = false`**: PASS. Lines 444–445.
- **Calls `render()`**: PASS. Line 448.
- **Does not call `fetchLeaderboard()`**: PASS. No fetch call present in lines 442–449.
- **`liveData` not cleared**: PASS. No `liveData = null` in this function.
- **Comment about non-functional time filters**: PASS. Lines 446–448 comment confirms.

All five agents described this function consistently and accurately.

**Unverifiable claims**: None.

---

### loadMore (line 451)

**Verification**: PASS

**Findings**:

- **Guard on `isLoading || !hasMore`, returns immediately if either true**: PASS. Line 452.
- **Increments `currentOffset` by `PAGE_SIZE`**: PASS. Line 453.
- **Awaits `fetchLeaderboard(true)`**: PASS. Line 454.
- **Queries `document.getElementById('lb-list')`, sets `innerHTML = renderList()`**: PASS. Lines 455–456.
- **Does not call `render()` (only updates list portion)**: PASS. No `render()` call present.
- **Async, returns `Promise<void>`**: PASS. Line 451.

**Unverifiable claims**: None.

---

### init (line 463)

**Verification**: PARTIAL

**Findings**:

- **Reads `FEATURES.leaderboard`, returns immediately if falsy**: PASS. Line 464.
- **Creates `MutationObserver`**: PASS. Lines 465–471.
- **Observer callback checks `screen-leaderboard` has class `active` and `children.length === 0`**: PASS. Line 467.
- **Observer calls `observer.disconnect()` then `render()` then fires fetch-then-render as `void` promise**: PASS. Lines 468–470.
- **After creating observer, queries `screen-leaderboard` again and calls `observe` with `{ attributes: true, attributeFilter: ['class'] }`**: PASS. Lines 474–477.
- **If element absent, observer is created but never attached**: PASS. Lines 474–477 — the observe call is inside `if (screen)`.
- **Module-level `ready.then(() => init())`**: PASS. Line 521.

The callback at lines 466–471 contains its own local `const screen = document.getElementById('screen-leaderboard')` — separate from the outer `screen` at line 474. Agent 02's claim that the callback re-queries each time is PASS.

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

| Function | PASS | PARTIAL | FAIL |
|---|---|---|---|
| fetchLeaderboard | 4 agents fully correct | 1 (Agent 02 overstates `getCurrentUser()` guard) | 0 |
| getData | 5 | 0 | 0 |
| renderShimmer | 5 | 0 | 0 |
| showEloExplainer | 5 | 0 | 0 |
| renderList | 4 | 1 (minor — `rank` mutation also affects originals) | 0 |
| render | 4 | 1 (Agent 02 "implicitly reads liveData" is indirect) | 0 |
| setTab | 4 | 1 (Agent 03 says "shimmer-or-empty"; actually shows error fallback, not shimmer) | 0 |
| setTime | 5 | 0 | 0 |
| loadMore | 5 | 0 | 0 |
| init | 5 | 0 | 0 |

**Totals across all functions**: 46 PASS, 4 PARTIAL, 0 FAIL.

**Notable agent disagreements**:
- **setTab first-render state**: Agents 01, 02, 04, 05 correctly identify that the first `render()` call in `setTab` displays `renderList()`'s error fallback (not the shimmer). Agent 03 says "shimmer-or-empty" — this is inaccurate.
- **fetchLeaderboard — getCurrentUser() call timing**: Agent 02 says the call happens "only when `append` is false." The other four agents correctly locate the guard on the `myRank` write, not on the `getCurrentUser()` call itself.

---

## needs_review

1. **`renderList` mutates objects shared with `liveData`/`PLACEHOLDER_DATA`**: The spread at line 269 (`[...data]`) creates a shallow copy of the array but the objects inside are the same references. The `forEach` at line 276 writes `item.rank = i + 1`, which mutates the original objects in `liveData` (or `PLACEHOLDER_DATA`). If `renderList` is called multiple times with different `currentTab` values before a fetch, ranks in the cached `liveData` objects are silently overwritten each time. This is a latent bug no Stage 2 agent mentioned.

2. **`setTime` writes `currentTime` but `currentTime` is never read by `fetchLeaderboard`**: The state variable `currentTime` is entirely orphaned — it is written by `setTime` and never consumed. This is correctly described but worth flagging as a dead-state issue.

3. **`render` re-attaches the `lb-list` click listener on every call**: Agent 02 noted this and correctly concluded it is harmless because `innerHTML` replacement recreates the element. However, if `lb-list` somehow persisted across a `render()` call, listeners would accumulate. The current implementation is safe but brittle.

## Agent 02

### fetchLeaderboard (line 103)

**Verification**: PARTIAL

**Findings**:

- All five agents correctly describe the `isLoading` guard, the `getSupabaseClient()` / `getIsPlaceholderMode()` early-return, the `isLoading = true` set, and the try/catch structure. PASS.
- Sort column derivation correct. PASS.
- `safeRpc` call parameters correct. PASS.
- Error/null/empty branch correct. PASS.
- Rank computation, numeric casting, defaults correct. PASS.
- `hasMore = rows.length === PAGE_SIZE`. PASS.
- Append vs replace behavior correct. PASS.
- `getCurrentUser()` / `findIndex` / `myRank` update conditional on `!append`. PASS.
- Catch block and `isLoading = false` correct. PASS.

- **Gap for all agents**: No agent notes that the `myRank` block only fires when `me` is truthy AND `!append`. Source line 145: `if (me && !append)`. Agents describe only `!append` as the condition, omitting the `me &&` guard. The myRank update is skipped if no current user is logged in even when `append` is false. PARTIAL for all agents.

**Unverifiable claims**: None.

---

### getData (line 158)

**Verification**: PASS

**Findings**: All five agents correctly describe: no parameters, reads `liveData`, returns it if non-null, returns `PLACEHOLDER_DATA` otherwise, no side effects. Source lines 158–160 confirm exactly.

**Unverifiable claims**: None.

---

### renderShimmer (line 166)

**Verification**: PASS

**Findings**: All agents correctly identify: no parameters, no module state read, six-iteration for loop, `colo-shimmer` CSS class, two varying-width shimmer bars using `55 + i * 5` and `35 + i * 3`, returns concatenated HTML string. Source lines 167–181 confirm exactly.

**Unverifiable claims**: None.

---

### showEloExplainer (line 187)

**Verification**: PARTIAL

**Findings**:

- All agents correctly describe: existing modal removal, new div creation, `id = 'elo-explainer-modal'`, `style.cssText`, `innerHTML`, backdrop click listener, `document.body.appendChild(modal)`. PASS.
- Close button wired by module-level event delegation. PASS.
- **Agent 05 claims the modal template includes "a question-mark span that triggers `show-elo-explainer`"**: FAIL. No such span exists inside the modal's `innerHTML`. The `?` explainer trigger span lives in the tab buttons rendered by `render()` (line 393), not inside the modal. This is an erroneous claim by Agent 05 only.

**Unverifiable claims**: None.

---

### renderList (line 262)

**Verification**: PARTIAL

**Findings**:

- All agents correctly describe null `liveData` + `isLoading === false` early return. PASS.
- All agents correctly describe calling `getData()`, spread copy, sort by `currentTab` descending, `forEach` rank mutation. PASS.
- Row HTML details all correct. PASS.
- **All agents claim "writes nothing to state" or "does not write to any state"**: FAIL for this specific claim. The function mutates `item.rank` in-place on line 277 (`sorted.forEach((item, i) => { item.rank = i + 1; })`). Since `sorted` is a shallow copy, the objects inside are the same references as in `liveData` (or `PLACEHOLDER_DATA`), so `item.rank = i + 1` **does mutate** the underlying `LeaderboardEntry` objects. All five agents miss this side effect.

**Unverifiable claims**: None.

---

### render (line 345)

**Verification**: PARTIAL

**Findings**:

- All agents correctly describe: reads `screen-leaderboard`, returns if absent. PASS.
- `getCurrentProfile()` and derivation of display values. PASS.
- Full `container.innerHTML` structure. PASS.
- `lb-list` click listener for profile navigation. PASS.
- **Agent 02 observation**: "multiple calls accumulate multiple listeners if element persists, though `innerHTML` replacement re-creates the element." This is accurate. PASS.
- **Agent 03 claim**: "Tab buttons and the elo explainer button are not directly wired here." Accurate for those specific actions. The `lb-list` profile navigation IS locally wired inside `render()`. PASS.

**Unverifiable claims**: None.

---

### setTab (line 432)

**Verification**: PARTIAL

**Findings**:

- All agents correctly describe: writes `currentTab`, resets state, calls `render()` synchronously, awaits `fetchLeaderboard()`, calls `render()` again. PASS.
- **Agent 01 claim** about first `render()` showing error div (not shimmer): PASS. Source confirms `isLoading` is false and `liveData` is null at that point.
- **Agent 03 claim — "renders the shimmer-or-empty state immediately"**: PARTIAL. At the first `render()` call, `isLoading` is false, `liveData` is null → `renderList` returns the error div, not shimmer.

**Unverifiable claims**: None.

---

### setTime (line 442)

**Verification**: PASS

**Findings**: All agents correctly describe: synchronous, writes `currentTime`, resets `currentOffset` and `hasMore`, calls `render()`, does not fetch, time filters non-functional per comment. PASS.

**Unverifiable claims**: None.

---

### loadMore (line 451)

**Verification**: PASS

**Findings**: All agents correctly describe guards, `currentOffset` increment, `fetchLeaderboard(true)`, `lb-list.innerHTML = renderList()`, no full `render()` call. PASS.

**Unverifiable claims**: None.

---

### init (line 463)

**Verification**: PARTIAL

**Findings**:

- All agents correctly describe: `FEATURES.leaderboard` guard, `MutationObserver` creation, callback checks, `observer.disconnect()` + `render()` + `void fetchLeaderboard().then(() => render())`, `observer.observe` call. PASS.
- **Agent 02 says callback "reads `document.getElementById('screen-leaderboard')` each time it fires"**: Confirmed. Source line 466 inside the callback: `const screen = document.getElementById('screen-leaderboard');` — a fresh query each fire. PASS.

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

| Function | PASS | PARTIAL | FAIL | Notes |
|---|---|---|---|---|
| fetchLeaderboard | All 5 broadly | All 5 (omit `me &&` guard on myRank update) | — | Minor omission: `myRank` update requires both `!append` AND truthy `me` |
| getData | All 5 | — | — | Clean consensus |
| renderShimmer | All 5 | — | — | Clean consensus |
| showEloExplainer | Agents 1–4 | — | Agent 05 | Agent 05 incorrectly places `show-elo-explainer` span inside the modal template; it lives in `render()`'s tab bar |
| renderList | All 5 on control flow | All 5 on side-effects claim | — | All agents claim no state written; in fact `rank` is mutated in-place on shared objects |
| render | All 5 | — | — | Clean consensus; Agent 02's note about listener accumulation is accurate |
| setTab | Agents 1,2,4,5 | Agent 03 | — | Agent 03 mislabels first `render()` as "shimmer-or-empty state"; it is the error div state |
| setTime | All 5 | — | — | Clean consensus |
| loadMore | All 5 | — | — | Clean consensus |
| init | All 5 | — | — | Clean consensus |

**Inter-agent disagreements**:
- On the first `render()` call in `setTab`: Agents 01, 02, 04, 05 correctly identify it shows the error div (not shimmer). Agent 03 ambiguously says "shimmer-or-empty state," which is misleading.
- No other substantive disagreements between agents.

---

## needs_review

1. **`renderList` mutates shared object references**: Lines 276–278 run `sorted.forEach((item, i) => { item.rank = i + 1; })` on a shallow copy of the array. Because `getData()` returns direct references to objects inside `liveData` (or `PLACEHOLDER_DATA`), the `rank` property of those underlying objects is overwritten on every call to `renderList`. For `PLACEHOLDER_DATA`, which is a module-level constant, repeated calls to `renderList` while in placeholder mode will mutate the constant's objects' `rank` fields.

2. **`setTab` first `render()` shows error div, not shimmer**: When `setTab` calls `render()` with `liveData = null` and `isLoading = false`, `renderList` immediately returns the "Couldn't load rankings" error div (line 264–267). Users see a brief error message flash before the fetch populates `liveData`.

3. **`currentTime` is written but never read in any fetch path**: `setTime` writes `currentTime` and all agents note that the time filter has no effect on the RPC. The `currentTime` state variable exists at line 74 but is never read by `fetchLeaderboard` or any render path. Dead-write state.

4. **`ModeratorLeaderboard` named export object (line 508)**: No Stage 2 agent described this export. It is a const object re-exporting `render`, `setTab`, `setTime`, `loadMore`, and `showEloExplainer`. It is a real module-level export that external callers may use.

## Agent 03

### fetchLeaderboard (line 103)

**Verification**: PARTIAL

**Findings**:

- Async, `append` default `false`, `isLoading` guard, `getSupabaseClient()` / `getIsPlaceholderMode()` early-return, `isLoading = true`, try block: all PASS.
- Sort column derivation, safeRpc call, error/empty branch, success path mapping: all PASS.
- `hasMore = rows.length === PAGE_SIZE`: PASS.
- Append vs replace `liveData`: PASS.
- Catch block and `isLoading = false`: PASS.
- **Agent 04 claim** that `liveData ?? []` is used as base when appending: PASS. Source line 142: `liveData = append ? [...(liveData ?? []), ...rows] : rows`.

- **Gap all agents**: All agents say `myRank` update when `append` is false, but source line 145 adds `me &&` guard — myRank is not updated if no logged-in user (guest). PARTIAL for all agents.

**Unverifiable claims**: None.

---

### getData (line 158)

**Verification**: PASS

**Findings**: None. All claims confirmed. Source lines 158–160 confirm `return liveData ?? PLACEHOLDER_DATA;`.

**Unverifiable claims**: None.

---

### renderShimmer (line 166)

**Verification**: PARTIAL

**Findings**:

- Six iterations, width formulas `55 + i * 5` and `35 + i * 3`, HTML string return: all PASS.
- **Agent 04 claims "five child elements"**: Source shows 4 shimmer elements per row: rank placeholder (line 171), avatar placeholder (line 172), two text-line placeholders nested inside a non-shimmer wrapper div (lines 174–175), stat placeholder (line 177). The wrapper div has no `colo-shimmer` class. Agent 04's count of five is FAIL; correct count is four `colo-shimmer` elements.
- Agents 01, 02, 03, 05 do not give incorrect counts.

**Unverifiable claims**: None.

---

### showEloExplainer (line 187)

**Verification**: PARTIAL

**Findings**:

- Existing modal removal, div creation, id, style.cssText, innerHTML, backdrop click listener, `document.body.appendChild`: all PASS.
- Close button wired by module-level event delegation: PASS.
- **Agent 05 claim about `show-elo-explainer` span inside modal template**: FAIL. Source modal innerHTML (lines 195–250) contains no `data-action="show-elo-explainer"`. That span lives in `render()`'s tab bar (lines 393–399).

**Unverifiable claims**: None.

---

### renderList (line 262)

**Verification**: PASS

**Findings**:

- Early return when `liveData === null && !isLoading`: PASS. Source line 263.
- `getData()` call, spread copy, sort, `forEach` rank mutation: all PASS.
- Row HTML details (stat, label, medal colors, tier border, escHtml, vgBadge, bountyDot, streak color, LOAD MORE button): all PASS.
- All numeric values cast with `Number()`: PASS. Source line 321 confirms.

**Unverifiable claims**: None.

---

### render (line 345)

**Verification**: PASS

**Findings**:

- `screen-leaderboard` read, early return if absent: PASS.
- `getCurrentProfile()`, derivation of display values with defaults: PASS.
- Full `container.innerHTML` with header, stats card, three tab buttons, `#lb-list`: PASS.
- ELO `?` span with `data-action="show-elo-explainer"`: PASS.
- Shimmer vs renderList based on `isLoading`: PASS.
- `lb-list` click delegation for profile navigation: PASS.
- Tab buttons wired by module-level delegation (not locally): PASS. Lines 487–492 confirm.

**Unverifiable claims**: None.

---

### setTab (line 432)

**Verification**: PARTIAL

**Findings**:

- Writes `currentTab`, resets state, calls `render()`, awaits `fetchLeaderboard()`, calls `render()` again: all PASS.
- **Agents 03 and 04** describe first `render()` as "shimmer-or-empty state" or "cleared state" — imprecise. Since `isLoading` is false and `liveData` is null at that point, `renderList` returns the error message div (not shimmer). PARTIAL for Agents 03 and 04.
- Agents 01, 02, 05 correctly identify this. PASS.

**Unverifiable claims**: None.

---

### setTime (line 442)

**Verification**: PASS

**Findings**: All agents correct. Source lines 442–449 confirm all claims.

**Unverifiable claims**: None.

---

### loadMore (line 451)

**Verification**: PASS

**Findings**: All agents correct. Source lines 451–457 confirm all claims.

**Unverifiable claims**: None.

---

### init (line 463)

**Verification**: PASS

**Findings**: All agents correct. Source lines 463–478 and line 521 confirm all claims. Observer callback contains its own local `getElementById` call (line 466), not reusing the outer `screen` variable.

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

| Function | PASS | PARTIAL | FAIL | Notes |
|---|---|---|---|---|
| `fetchLeaderboard` | All 5 | All 5 — miss `me &&` guard | — | myRank update requires both `!append` AND truthy `me` |
| `getData` | All 5 | — | — | Full consensus |
| `renderShimmer` | Agents 01–03, 05 | — | Agent 04 ("five child elements") | 4 shimmer elements per row |
| `showEloExplainer` | Agents 01–04 | — | Agent 05 | Agent 05 falsely claims modal contains show-elo-explainer span |
| `renderList` | All 5 | — | — | All substantially accurate |
| `render` | All 5 | — | — | All substantially accurate |
| `setTab` | Agents 01, 02, 05 | Agents 03, 04 | — | Agents 03/04 imprecise about which state shows on first render() |
| `setTime` | All 5 | — | — | Full consensus |
| `loadMore` | All 5 | — | — | Full consensus |
| `init` | All 5 | — | — | Full consensus |

**Totals**: 7 PASS, 3 PARTIAL, 0 FAIL

---

## needs_review

1. **`currentTime` is written but never read by any in-file consumer.** `setTime` writes `currentTime` to module state, but `fetchLeaderboard` passes no time parameter to the RPC. Dead-write state.

2. **`render()` re-creates `#lb-list` via `innerHTML` on every call.** This prevents listener accumulation but does mean every `render()` call tears down and rebuilds the list DOM entirely.

3. **`renderList` mutates shared object references.** Line 276–278: `sorted.forEach((item, i) => { item.rank = i + 1; })` mutates the original `LeaderboardEntry` objects in `liveData` (or `PLACEHOLDER_DATA`). No Stage 2 agent flagged this.

## Agent 04

### fetchLeaderboard (line 103)

**Verification**: PARTIAL

**Findings**:

- Async, `append` parameter, `isLoading` guard, `getSupabaseClient()` / `getIsPlaceholderMode()` check, `isLoading = true`, try/catch structure: all PASS.
- Sort column derivation, safeRpc call, error/empty branch, success mapping with rank and `Number()` casting: all PASS.
- `hasMore = rows.length === PAGE_SIZE`: PASS.
- Append vs replace `liveData`: PASS.
- Catch block and `isLoading = false`: PASS.

- **Gap (PARTIAL)**: All agents say "when `append` is false" for the `myRank` update. Source line 145: `if (me && !append)`. The `me &&` guard means the update is also skipped when there is no authenticated user. All agents miss this additional condition.

**Unverifiable claims**: None.

---

### getData (line 158)

**Verification**: PASS

**Findings**: None. All claims confirmed. Source lines 158–160.

**Unverifiable claims**: None.

---

### renderShimmer (line 166)

**Verification**: PARTIAL

**Findings**:

- Six iterations, varying widths, returns HTML string: PASS.
- **Agent 04 claims "five child elements" with `colo-shimmer`**: Source shows 4 `colo-shimmer` elements per row: rank (line 171), avatar (line 172), two text-line shimmers inside non-shimmer wrapper (lines 174–175), stat (line 177). The non-shimmer wrapper div at line 173 does not have `colo-shimmer`. Agent 04's count of five is incorrect.

**Unverifiable claims**: None.

---

### showEloExplainer (line 187)

**Verification**: PARTIAL

**Findings**:

- All claims by Agents 01–04 confirmed. PASS.
- **Agent 05 claim about `show-elo-explainer` span inside modal**: FAIL. No such span in the modal template. The `?` span lives in `render()`'s tab bar (lines 393–399).

**Unverifiable claims**: None.

---

### renderList (line 262)

**Verification**: PARTIAL

**Findings**:

- Early return, `getData()`, spread copy, sort, `forEach` rank mutation: all PASS.
- Row HTML details: all PASS.

- **All agents claim "writes nothing to state"**: FAIL for this specific claim. The `forEach` on line 276–278 (`sorted.forEach((item, i) => { item.rank = i + 1; })`) mutates `rank` on shared `LeaderboardEntry` objects in `liveData`/`PLACEHOLDER_DATA`. This is an unacknowledged side effect.

**Unverifiable claims**: None.

---

### render (line 345)

**Verification**: PASS

**Findings**: All claims confirmed. Source lines 345–426 confirm all structural and behavioral claims.

**Unverifiable claims**: None.

---

### setTab (line 432)

**Verification**: PARTIAL

**Findings**:

- State resets, two `render()` calls around `fetchLeaderboard()` await: all PASS.
- **Agents 03 and 04 say "cleared state" / "shimmer-or-empty"**: PARTIAL. First `render()` shows error div not shimmer (since `isLoading === false`). Agents 01, 02, 05 correctly identify this.

**Unverifiable claims**: None.

---

### setTime (line 442)

**Verification**: PASS

**Findings**: All claims confirmed.

**Unverifiable claims**: None.

---

### loadMore (line 451)

**Verification**: PASS

**Findings**: All claims confirmed.

**Unverifiable claims**: None.

---

### init (line 463)

**Verification**: PASS

**Findings**: All claims confirmed. Observer callback at line 466 contains its own `getElementById` query (not reusing outer `screen`).

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

| Function | PASS | PARTIAL | FAIL | Notes |
|---|---|---|---|---|
| `fetchLeaderboard` | All 5 on most claims | All 5 — `me &&` guard omission | — | |
| `getData` | All 5 | — | — | Full consensus |
| `renderShimmer` | Agents 01, 02, 03, 05 | — | Agent 04 | Agent 04: 5 elements; correct is 4 |
| `showEloExplainer` | Agents 01–04 | — | Agent 05 | Agent 05: spurious `show-elo-explainer` span claim |
| `renderList` | All 5 on flow | All 5 — miss rank mutation side effect | — | |
| `render` | All 5 | — | — | |
| `setTab` | Agents 01, 02, 05 | Agents 03, 04 | — | First render: error div, not shimmer |
| `setTime` | All 5 | — | — | |
| `loadMore` | All 5 | — | — | |
| `init` | All 5 | — | — | |

**Total**: ~39 PASS, ~6 PARTIAL, ~1 FAIL

---

## needs_review

1. **`renderList` mutates shared objects**: Line 276–278 mutates `rank` on objects shared with `liveData`/`PLACEHOLDER_DATA`.
2. **`setTab` intermediate render shows error div**: Not shimmer — potential UX concern.
3. **`currentTime` dead write**: Written in `setTime`, never consumed by fetch path.
4. **`ModeratorLeaderboard` export**: Not described by any Stage 2 agent.

## Agent 05

### `fetchLeaderboard` (line 103)

**Verification**: PARTIAL

**Findings**:

- Async, `append` default `false`, `isLoading` guard, `getSupabaseClient()` / `getIsPlaceholderMode()` check, sort column derivation, safeRpc call, error/empty branch, success mapping, `hasMore`, append/replace, catch block, `isLoading = false`: all PASS.
- **Agent 01 wording on `hasMore`**: "sets `hasMore` to `true` if the returned row count equals `PAGE_SIZE`" — slightly implies only a true assignment, but the source does a boolean assignment `hasMore = rows.length === PAGE_SIZE`. Minor.
- **Gap all agents**: All describe the `myRank` update as guarded by `!append`, but source line 145: `if (me && !append)`. The update also requires a truthy `me` (authenticated user). All agents miss the `me &&` guard. PARTIAL.

**Unverifiable claims**: None.

---

### `getData` (line 158)

**Verification**: PASS

**Findings**: None. All claims confirmed.

**Unverifiable claims**: None.

---

### `renderShimmer` (line 166)

**Verification**: PARTIAL

**Findings**:

- Six iterations, widths via `55 + i * 5` and `35 + i * 3`, HTML string: all PASS.
- **Agent 04 claims "five child elements"**: Source shows 4 `colo-shimmer` elements per row. Agent 04's count is wrong. Agents 01, 02, 03, 05 are ambiguous or say four. Agent 03 says "four shimmer placeholder elements" which is correct.

**Unverifiable claims**: None.

---

### `showEloExplainer` (line 187)

**Verification**: PASS

**Findings**:

- Existing modal removal, new div creation, id, style.cssText, innerHTML, backdrop click listener, `document.body.appendChild`, close button via module-level delegation: all PASS for Agents 01–04.
- **Agent 05 claim — "a question-mark span that triggers `show-elo-explainer`" inside modal template**: FAIL. Source modal innerHTML (lines 195–250) contains no `data-action="show-elo-explainer"`. That span lives in `render()`'s tab bar (lines 393–399), not inside the explainer modal.

**Unverifiable claims**: None.

---

### `renderList` (line 262)

**Verification**: PARTIAL

**Findings**:

- Early return, `getData()`, spread copy, sort, `forEach` rank mutation, row HTML details: all PASS.
- **All agents claim no state is written**: PARTIAL. Line 276–278: `sorted.forEach((item, i) => { item.rank = i + 1; })` mutates `rank` on shared object references in `liveData` (or `PLACEHOLDER_DATA`). No agent flagged this. The spread copies the array but not the objects; rank mutations write back to the original entry objects.

**Unverifiable claims**: None.

---

### `render` (line 345)

**Verification**: PARTIAL

**Findings**:

- `screen-leaderboard` DOM read, early return: PASS.
- `getCurrentProfile()`, display values with defaults: PASS.
- Full `container.innerHTML` structure, tab buttons, ELO `?` span, `#lb-list` shimmer/list toggle: all PASS.
- `lb-list` click delegation for profile navigation: PASS.
- **Agent 05 says nothing is wired inside render**: PARTIAL. The `lb-list` profile navigation click IS wired locally inside `render()` at lines 419–424. Agents 01–04 correctly note this local wiring.
- **Agent 02's listener accumulation note**: Correct — `innerHTML` replacement recreates `lb-list`, preventing accumulation. PASS.

**Unverifiable claims**: None.

---

### `setTab` (line 432)

**Verification**: PARTIAL

**Findings**:

- State resets (`currentTab`, `currentOffset`, `hasMore`, `liveData`), synchronous `render()`, `await fetchLeaderboard()`, second `render()`: all PASS.
- **Agents 03 and 04 say "shimmer/cleared state"**: PARTIAL. First `render()` shows error div (not shimmer) since `isLoading === false` when render is called before `fetchLeaderboard` sets it to true.
- Agents 01, 02, 05 correctly identify the error div state. PASS.

**Unverifiable claims**: None.

---

### `setTime` (line 442)

**Verification**: PASS

**Findings**: All claims confirmed. Source lines 442–449.

**Unverifiable claims**: None.

---

### `loadMore` (line 451)

**Verification**: PASS

**Findings**: All claims confirmed. Source lines 451–457.

**Unverifiable claims**: None.

---

### `init` (line 463)

**Verification**: PARTIAL

**Findings**:

- `FEATURES.leaderboard` guard, `MutationObserver`, callback conditions, `disconnect()` + `render()` + void fetch-then-render, `observer.observe` with `{ attributes: true, attributeFilter: ['class'] }`: all PASS.
- Observer callback uses local `const screen = document.getElementById(...)` (line 466) — fresh query each fire. All agents confirmed. PASS.
- Module-level `ready.then(() => init())`: PASS.

**Unverifiable claims**: None.

---

## Cross-Agent Consensus Summary

| Function | PASS | PARTIAL | FAIL | Notes |
|---|---|---|---|---|
| `fetchLeaderboard` | All 5 broadly | All 5 (miss `me &&` auth guard) | 0 | |
| `getData` | All 5 | 0 | 0 | |
| `renderShimmer` | Agents 01–03, 05 | 0 | Agent 04 | Agent 04: five elements (should be four) |
| `showEloExplainer` | Agents 01–04 | 0 | Agent 05 | Agent 05: spurious `show-elo-explainer` span |
| `renderList` | All 5 on flow | All 5 — rank mutation side-effect missed | 0 | |
| `render` | Agents 01–04 | Agent 05 | 0 | Agent 05 implies nothing wired locally in render |
| `setTab` | Agents 01, 02, 05 | Agents 03, 04 | 0 | First render shows error div, not shimmer |
| `setTime` | All 5 | 0 | 0 | |
| `loadMore` | All 5 | 0 | 0 | |
| `init` | All 5 | 0 | 0 | |

**Total**: ~39 PASS, ~6 PARTIAL, ~1 FAIL

---

## needs_review

1. **`setTab` intermediate render shows error-div, not shimmer**: `isLoading` is false when `setTab` calls `render()` before the fetch starts. `renderList` returns the error string. No shimmer shown during tab switch.

2. **`currentTime` written but never consumed**: Dead-write state variable.

3. **`ready` import not listed in Stage 2 imports descriptions**: The module imports `ready` from `./auth.ts` and fires `ready.then(() => init())` at line 521. All agents describe the pattern in `init`, but `vgBadge` (from `badge.ts`) and `bountyDot` (from `bounties.ts`) are cross-module calls whose behavior cannot be verified from `leaderboard.ts` alone.

4. **`ModeratorLeaderboard` named export (lines 508–514)**: No Stage 2 agent described this const object re-exporting `render`, `setTab`, `setTime`, `loadMore`, and `showEloExplainer`.
