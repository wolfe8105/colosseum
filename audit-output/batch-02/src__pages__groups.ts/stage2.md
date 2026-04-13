# Stage 2 Outputs — groups.ts

## Agent 01

### switchTab (line 65)
Sets activeTab state. Iterates over `#lobby-tabs .tab-btn` buttons with forEach, toggling 'active' class by positional array index (`['discover','mine','leaderboard'][i]`). Then shows/hides the three tab panels by setting `style.display`. Conditionally calls `loadMyGroups()` if tab is 'mine' and user is logged in, or renders an auth-required message if not. Calls `loadLeaderboard()` if tab is 'leaderboard'.

FINDING — POSITIONAL ARRAY INDEX FOR TAB MATCHING: `['discover','mine','leaderboard'][i]` at line 68. If the HTML renders a fourth button inside `#lobby-tabs .tab-btn`, the fourth button (index 3) would compare against `undefined`, never getting the 'active' class. More importantly, if the button order in HTML differs from the array, the wrong button gets highlighted. Fragile DOM coupling. SEVERITY: Low (style/robustness).

### switchDetailTab (line 80)
Same positional pattern for `['hot-takes','challenges','members','auditions']`. Shows/hides 4 detail panels. Conditionally calls `loadPendingAuditions(currentGroupId, callerRole)` when switching to 'auditions' tab.

FINDING — switchDetailTab CALLS loadPendingAuditions WITH currentGroupId THAT COULD BE NULL: `currentGroupId` at line 91 is the module variable. It is set via `setCurrentGroupId(groupId)` at the start of `openGroup`. The 'auditions' tab is only visible after openGroup has run (it's in the detail view). However, there is no null guard — if `switchDetailTab('auditions')` were called before `openGroup`, `loadPendingAuditions` would receive null. In practice this path is safe, but no guard. SEVERITY: Low.

---

## Agent 02

### filterCategory (line 96)
Simple: removes 'active' from all `.cat-pill` elements, adds to the clicked element, sets `activeCategory` state, calls `loadDiscover()`. Correct. No error paths needed.

### loadDiscover (line 104)
Sets loading state on `discover-list`. Calls `safeRpc('discover_groups', { p_limit: 30, p_category: activeCategory })`. `activeCategory` is null for "All" categories. On success: parses data (handles JSON string or object). Calls `renderGroupList('discover-list', groups || [], false, false, openGroup)`. On error: renders empty/error state.

No issues. `groups || []` fallback handles null/undefined data correctly.

---

## Agent 03

### loadMyGroups (line 117)
Loading state → `safeRpc('get_my_groups')` → parse → render or empty state. Same pattern as loadDiscover. Correct.

### loadLeaderboard (line 134)
Loading state → `safeRpc('get_group_leaderboard', { p_limit: 20 })` → parse → `renderGroupList('leaderboard-list', groups || [], false, true, openGroup)`. The `true` flag is the `isLeaderboard` boolean for renderGroupList. Correct.

---

## Agent 04

### openGroup (line 147) — Part 1: Setup and RPC call

1. `setCurrentGroupId(groupId)` — state updated immediately.
2. View toggle: hides lobby, shows detail.
3. Resets 7 text/innerHTML elements to loading states.
4. Hides `gvg-challenge-btn`.
5. Calls `switchDetailTab('hot-takes')` — resets detail tab.
6. Calls `safeRpc('get_group_details', { p_group_id: groupId })` — awaited.
7. On success: populates 8 DOM elements with group data.
8. Renders banner (F-19) and fate display (F-20).
9. Sets state: isMember, callerRole, currentGroupData.
10. Calls updateJoinBtn.
11. Shows/hides gear button and auditions tab.
12. On catch: sets detail-name to 'Error loading group'.

Note at line 173: `document.getElementById('detail-members').textContent = g.member_count`. No `Number()` cast and uses textContent (not innerHTML) — safe from XSS but `g.member_count` could be any type from the RPC. If it's a number, textContent coerces it to string implicitly. Correct.

Note at line 174: `document.getElementById('detail-elo').textContent = g.elo_rating`. Same — textContent, safe.

Note at line 169: `g.name.toUpperCase()` — if `g.name` is null/undefined, this throws. But `get_group_details` should always return a name for a valid group. Low risk.

---

## Agent 05

### openGroup (line 147) — Part 2: Post-catch fire-and-forget

Lines 210-212:
```
loadGroupHotTakes(groupId);
loadGroupChallenges(groupId);
loadGroupMembers(groupId);
```

These three calls are OUTSIDE the try/catch block. They run regardless of whether the RPC succeeded or failed. If `get_group_details` fails (catch at line 206 sets name to 'Error loading group'), the detail view still shows partial error state but the hot takes, challenges, and members loaders also fire — they'll show their own loading/error states independently.

FINDING — FIRE-AND-FORGET LOADERS OUTSIDE TRY/CATCH: If `openGroup` is called with an invalid groupId, the `get_group_details` RPC fails and the detail view shows an error, but `loadGroupHotTakes`, `loadGroupChallenges`, and `loadGroupMembers` are still called with the invalid groupId. Each will make their own RPCs and likely show their own error states. This is acceptable UX (each panel handles its own error) but could result in 4 separate error states rendering simultaneously. SEVERITY: Low.

FINDING — currentGroupId IS SET BEFORE RPC COMPLETES: `setCurrentGroupId(groupId)` runs at line 148, before the await. If the user rapidly opens multiple groups, currentGroupId is set to the last-clicked groupId immediately. The subsequent RPC calls use the `groupId` closure variable (parameter), not `currentGroupId`, so data from concurrent calls won't cross-contaminate. Correct.

---

## Agent 06

### updateJoinBtn (line 215)
Takes a `GroupDetail` parameter. Queries `#join-btn`. Three cases:
1. No current user: shows 'SIGN IN TO JOIN', enabled.
2. Is member: shows 'YOU OWN THIS GROUP' (disabled) or 'LEAVE GROUP' (enabled) based on `my_role === 'leader'`.
3. Not member, based on `join_mode`:
   - `'invite_only'`: hides button entirely.
   - `'audition'`: shows 'REQUEST AUDITION'.
   - anything else (default 'open'): shows 'JOIN GROUP'.

All cases set `btn.style.display`. Correct.

FINDING — join_mode DEFAULTED TO 'open' IF NULL: Line 232: `const mode = g.join_mode ?? 'open'`. If `join_mode` is null from DB, defaults to 'open'. This is a safe default.

---

## Agent 07

### toggleMembership (line 244)
1. No user → redirect to plinko with returnTo URL. `encodeURIComponent` used — correct for URL safety.
2. Disables button.
3. Branch on `isMember`:
   - Leave: calls `leave_group` RPC. On success: updates state and DOM. Decrements member count via `parseInt(textContent) - 1`.
   - Join: calls `join_group` RPC. On success: updates state and DOM. Increments member count.
4. In both cases: calls `loadGroupMembers(currentGroupId)` to re-render.
5. On catch: `alert(message)`.
6. Finally: re-enables button.

FINDING — parseInt(textContent) NaN RISK: Lines 260-261 and 270-271. `parseInt(document.getElementById('detail-members').textContent)` — if textContent is '—' (not yet loaded) or anything non-numeric, parseInt returns NaN, and `String(NaN - 1)` = `'NaN'`. The join-btn is only visible after `openGroup` completes successfully and `detail-members` has been set to a numeric string. So in practice this is safe, but no explicit guard against the NaN case. SEVERITY: Low.

FINDING — leave_group CALLED WITH currentGroupId (MODULE STATE): `safeRpc('leave_group', { p_group_id: currentGroupId })` uses the module variable `currentGroupId`, not a closure over the groupId at function call time. Since `toggleMembership` is only callable while a group detail is open (button is only visible in detail view), and the button is bound to the current group, this is correct. No race possible here in single-threaded JS.

---

## Agent 08

### showLobby (line 282)
Clears currentGroupId and callerRole state. Hides detail view, shows lobby. Simple and correct.

### openCreateModal (line 290)
Auth gate: redirects to plinko if no user. Otherwise adds 'open' class to create-modal. Simple and correct.

### closeCreateModal (line 294)
Removes 'open' class from create-modal. Idempotent. Correct.

### handleModalBackdrop (line 297)
FINDING — handleModalBackdrop IS DEAD CODE: This function is declared but never passed to an addEventListener call in this file. The backdrop behavior is handled via `'create-modal-backdrop'` data-action in the delegation handler (line 369). The delegation handler does `if (e.target === actionEl) closeCreateModal()` — equivalent logic. `handleModalBackdrop` is a dead function. SEVERITY: Low.

---

## Agent 09

### selectEmoji (line 300)
Removes 'selected' from all `.emoji-opt` elements, adds to clicked element, calls `setSelectedEmoji(el.dataset.emoji)`.

FINDING — el.dataset.emoji COULD BE UNDEFINED: If an element with `.emoji-opt` class lacks a `data-emoji` attribute, `el.dataset.emoji` is `undefined`. `setSelectedEmoji(undefined)` would set `selectedEmoji` to undefined. Then `submitCreateGroup` would call `create_group` with `p_avatar_emoji: undefined`. The DB function may accept null but undefined in Supabase RPC params is typically treated as omitting the parameter. The DB likely has a default emoji if the column is nullable. Low risk in practice. SEVERITY: Low.

### submitCreateGroup (line 305)
Name validation: `name.length < 2`. Button disable/loading. `create_group` RPC with 5 params. On success: closes modal, clears form, opens new group. On error: `alert()`. Finally: re-enables.

FINDING — GROUP NAME NOT SANITIZED BEFORE RPC: `name = (input).value.trim()` at line 306. The name is sent directly as `p_name` to the RPC. The server-side `create_group` function should sanitize or validate the name. No `escapeHTML()` is applied here — but since the name goes to the DB via RPC (not directly to innerHTML), the escapeHTML would be needed when rendering the name to the DOM, not when sending it. When the name is rendered, `renderGroupList` and `openGroup` use `textContent` (not innerHTML) for the name. No XSS risk.

Note: `p_is_public: true` hardcoded — private groups not creatable from this UI by design.

---

## Agent 10

### Module-scope blocks

**init block (lines 56-62):**
```
ready.then(() => {
  setSb(getSupabaseClient());
  setCurrentUser(getCurrentUser());
  _injectMemberActionsModal();
  setGroupOpenCallback(openGroup);
  loadDiscover();
});
```
Sets up dependencies, injects the member actions modal into DOM, registers `openGroup` as a callback in groups.members.ts, then loads discover tab. Correct init sequence.

**URL param handler (lines 334-337):**
```
const urlGroup = new URLSearchParams(window.location.search).get('group');
if (urlGroup && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlGroup)) {
  ready.then(() => openGroup(urlGroup));
}
```
UUID regex validated before call. `ready.then` defers until auth. CONFIRM: UUID regex is correct standard UUID v4 pattern. No issues.

**Global click delegation (lines 340-436):**
26 data-action cases. All imported functions are called with correct parameters from context. 

FINDING — switch-tab AND switch-detail-tab CASES DO NOT NULL-CHECK dataset.tab: Lines 352-353 and 367-368: `switchTab(actionEl.dataset.tab!)` and `switchDetailTab(actionEl.dataset.tab!)`. TypeScript non-null assertion (`!`) is used. If `data-tab` is missing from the HTML element, `dataset.tab` is undefined, and `switchTab(undefined)` would run: `setActiveTab(undefined)`, then the array comparison `['discover','mine','leaderboard'][i] === undefined` would never match, no tab gets 'active', all panels get hidden. Recoverable but broken UX. SEVERITY: Low (requires malformed HTML).

**group-banner-updated listener (lines 440-445):**
Listens for custom event dispatched when group banner upload completes. Calls `openGroup(groupId)` to re-render. Guarded: only fires if `groupId === currentGroupId`. Correct.

---

## Agent 11

### Cross-Cutting Analysis

**safeRpc usage:** All 5 RPC calls (`discover_groups`, `get_my_groups`, `get_group_leaderboard`, `get_group_details`, `leave_group`/`join_group`, `create_group`) use `safeRpc` — correct per CLAUDE.md castle defense pattern.

**innerHTML vs textContent:** In `openGroup`, all user-controlled data (group name, description, etc.) is set via `textContent` — correct, no XSS risk. The only innerHTML assignments in this file are for loading states (`'<div class="loading-state">...'`) which contain no user data.

**`escapeHTML` imported but not directly called in this file:** `escapeHTML` is imported from config.ts (line 49) but never used in groups.ts itself. The rendering functions (`renderGroupList`, etc.) in groups.utils.ts presumably use it. In this file, textContent is used exclusively for user data. Dead import in this file specifically.

FINDING — escapeHTML IMPORTED BUT NOT USED IN THIS FILE: Line 49 imports `{ escapeHTML, showToast }` from config.ts. `escapeHTML` is never called in groups.ts. `showToast` is also not called in groups.ts (no `showToast()` calls found). Both may be dead imports in this orchestrator file. SEVERITY: Low.

FINDING — data-action SWITCH HAS NO DEFAULT CASE: The switch statement at line 344 has no `default` case. Unrecognized `data-action` values silently do nothing. This is intentional defensive programming, not a bug. Non-finding.

FINDING — join_group AND leave_group ONLY DO OPTIMISTIC STATE UPDATE: After `leave_group` RPC succeeds, the code immediately updates the UI (member count, button text, callerRole). There's no call to reload the full group data from the server. The member count is updated with a +/-1 arithmetic which could be wrong if there's a concurrent join/leave from another user. However, the subsequent `loadGroupMembers(currentGroupId)` call at line 273 will refresh the member list (though not the header count). SEVERITY: Low.
