# Stage 1 Outputs — groups.ts

## Agent 01

### Callable Inventory
Top-level named function declarations:
1. `switchTab` (line 65) — sync, not exported
2. `switchDetailTab` (line 80) — sync, not exported
3. `filterCategory` (line 96) — sync, not exported
4. `loadDiscover` (line 104) — async, not exported
5. `loadMyGroups` (line 117) — async, not exported
6. `loadLeaderboard` (line 134) — async, not exported
7. `openGroup` (line 147) — async, not exported (but passed as callback)
8. `updateJoinBtn` (line 215) — sync, not exported
9. `toggleMembership` (line 244) — async, not exported
10. `showLobby` (line 282) — sync, not exported
11. `openCreateModal` (line 290) — sync, not exported
12. `closeCreateModal` (line 294) — sync, not exported
13. `handleModalBackdrop` (line 297) — sync, not exported
14. `selectEmoji` (line 300) — sync, not exported
15. `submitCreateGroup` (line 305) — async, not exported

### Module-scope code (not functions but critical paths):
- `ready.then()` init block (lines 56-62)
- URL param handler (lines 334-337)
- Global click delegation listener (lines 340-436)
- `group-banner-updated` custom event listener (lines 440-445)
- `let currentGroupData` module variable (line 54)

---

## Agent 02

### Callable Inventory
Confirmed 15 functions:
1. switchTab (65)
2. switchDetailTab (80)
3. filterCategory (96)
4. loadDiscover (104)
5. loadMyGroups (117)
6. loadLeaderboard (134)
7. openGroup (147)
8. updateJoinBtn (215)
9. toggleMembership (244)
10. showLobby (282)
11. openCreateModal (290)
12. closeCreateModal (294)
13. handleModalBackdrop (297)
14. selectEmoji (300)
15. submitCreateGroup (305)

None are exported. `openGroup` is passed to external modules via `setGroupOpenCallback(openGroup)` at line 60.

Note: `handleModalBackdrop` is declared (line 297) but not wired to any event listener in this file. The click delegation handles the backdrop via `'create-modal-backdrop'` action (line 369), which uses a different pattern. `handleModalBackdrop` may be dead code.

---

## Agent 03

### Callable Inventory
Confirmed 15.

Additional observation: The click delegation switch at lines 344-435 handles 26 distinct `data-action` values, all of which call into the 15 local functions or the imported functions from groups.settings.ts, groups.auditions.ts, groups.members.ts, groups.challenges.ts.

`filterCategory` takes two parameters: `cat: string | null` and `el: HTMLElement`. It is called at line 355 from the delegation handler passing `actionEl.dataset.category || null` (category can be null for "All") and `actionEl` as the element.

---

## Agent 04

### Callable Inventory
Confirmed 15.

`handleModalBackdrop` (line 297): Takes an `Event` parameter, checks `e.target === document.getElementById('create-modal')`. This is a standard modal click-outside-to-close pattern. However, no event listener calls this function in this file. The delegation at line 369 handles `'create-modal-backdrop'` by checking `e.target === actionEl` directly — equivalent logic but independent implementation. `handleModalBackdrop` appears to be dead code leftover from before the delegation refactor.

---

## Agent 05

### Callable Inventory
Confirmed 15.

Observation on `openGroup` (line 147): This function is the heaviest in the file. It:
1. Sets state (currentGroupId)
2. Toggles view visibility
3. Resets all detail fields to loading state
4. Calls `switchDetailTab('hot-takes')`
5. Calls `safeRpc('get_group_details')` — awaited
6. Populates 8+ DOM elements
7. Calls `renderGroupBanner` (F-19)
8. Shows/hides shared fate display (F-20)
9. Sets state (isMember, callerRole, currentGroupData)
10. Calls `updateJoinBtn`
11. Shows/hides gear button and auditions tab
12. Falls through to call `loadGroupHotTakes`, `loadGroupChallenges`, `loadGroupMembers` (all outside the try/catch — fire-and-forget style)

Lines 210-212 (`loadGroupHotTakes`, `loadGroupChallenges`, `loadGroupMembers`) are called outside the try/catch block. They are NOT awaited. Their errors are self-contained in their own modules.

---

## Agent 06

### Callable Inventory
Confirmed 15.

`toggleMembership` (line 244):
- If not logged in: redirects to plinko. Returns immediately.
- If member: calls `leave_group` RPC. On success: setIsMember(false), setCallerRole(null), updates button, hides gvg button, decrements member count display.
- If not member: calls `join_group` RPC. On success: setIsMember(true), setCallerRole('member'), updates button, shows gvg button, increments member count display.

Note: The member count update at lines 261 and 271 uses `parseInt(textContent)` — if the textContent is '—' (initial loading state) or a non-numeric string, `parseInt` returns `NaN`, and `String(NaN - 1)` = `'NaN'`. This could briefly display 'NaN' if called before openGroup completes. However, `toggleMembership` is only reachable via the 'toggle-membership' data-action which requires the join-btn to exist and have been rendered via updateJoinBtn, which requires openGroup to have completed. So in practice the race is unlikely but theoretically possible.

---

## Agent 07

### Callable Inventory
Confirmed 15.

`submitCreateGroup` (line 305):
- Name validation: requires length >= 2.
- Disables button, shows 'CREATING…'
- Calls `create_group` RPC with 5 params.
- On success: closes modal, clears form fields, opens the new group via `openGroup(result.group_id)`.
- On error: `alert(message)`.
- Finally: re-enables button.

Note: `p_is_public: true` is hardcoded — users cannot create private groups from this UI.

---

## Agent 08

### Callable Inventory
Confirmed 15.

URL param handling (lines 334-337):
```
const urlGroup = new URLSearchParams(window.location.search).get('group');
if (urlGroup && /^[0-9a-f]{8}-...$/i.test(urlGroup)) {
  ready.then(() => openGroup(urlGroup));
}
```
UUID validation regex is applied before `openGroup` is called. Correct. The `ready.then` defers until auth is ready.

Note: This block runs at module evaluation time (not inside a function). The URL param handler fires independently of the `ready.then(() => { ... loadDiscover() })` block at line 56. Two `.then()` calls on the same `ready` promise run in order of registration — the init block at line 56 fires first, then the URL handler at line 336. So `loadDiscover()` runs before `openGroup(urlGroup)`. This means the discover list will briefly load before the group detail opens. This is intentional/harmless behavior.

---

## Agent 09

### Callable Inventory
Confirmed 15.

`showLobby` (line 282): Simple. Sets currentGroupId to null, callerRole to null, hides detail view, shows lobby view. No async, no error paths. Correct.

`openCreateModal` (line 290): Guards with currentUser check — redirects to plinko if not logged in. Otherwise adds 'open' class.

`closeCreateModal` (line 294): Removes 'open' class. No guards needed — idempotent.

`selectEmoji` (line 300): Removes 'selected' from all `.emoji-opt` elements, adds to the clicked element, sets `selectedEmoji` state from `el.dataset.emoji`. Note: `el.dataset.emoji` could be undefined if the element lacks the attribute. `setSelectedEmoji(undefined)` would set state to undefined, and a subsequent `create_group` call would send `p_avatar_emoji: undefined`. RPC behavior depends on whether the server has a default. Low concern.

---

## Agent 10

### Callable Inventory
Confirmed 15.

`switchTab` (line 65): Uses array index positional mapping: `['discover','mine','leaderboard'][i]` — the index i comes from forEach. This works as long as the DOM order of buttons matches the array order. Fragile if buttons are reordered in HTML.

`switchDetailTab` (line 80): Same pattern: `['hot-takes','challenges','members','auditions']`. Fragile.

Both functions call `document.querySelectorAll` which returns all matching elements — if there are extra `.tab-btn` elements outside the intended container, they'd be affected. The selector is scoped (`#lobby-tabs .tab-btn` and `#detail-tabs .tab-btn`) which limits the scope.

---

## Agent 11

### Callable Inventory
Confirmed 15. Full list with lines:
1. switchTab (65)
2. switchDetailTab (80)
3. filterCategory (96)
4. loadDiscover (104)
5. loadMyGroups (117)
6. loadLeaderboard (134)
7. openGroup (147)
8. updateJoinBtn (215)
9. toggleMembership (244)
10. showLobby (282)
11. openCreateModal (290)
12. closeCreateModal (294)
13. handleModalBackdrop (297)
14. selectEmoji (300)
15. submitCreateGroup (305)

Note: No exported functions. `openGroup` is effectively exported via `setGroupOpenCallback` at line 60. All HTML interaction goes through event delegation.

Notable dead code candidate: `handleModalBackdrop` (line 297) — declared but never passed to addEventListener or referenced from the delegation handler.
