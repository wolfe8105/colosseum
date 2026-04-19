# Stage 3 Outputs — groups.ts

## Agent 01

### switchTab
CONFIRM. Positional array mapping `['discover','mine','leaderboard'][i]` verified at line 68. Fragile to HTML button reordering but stable in current codebase. CONFIRM: conditional `loadMyGroups()` / `loadLeaderboard()` calls are correct.

FINDING — switchTab POSITIONAL ARRAY COUPLING: Confirmed. Three tab buttons in `#lobby-tabs .tab-btn` must appear in exact DOM order: discover, mine, leaderboard. If the HTML changes button order, the active class highlighting breaks silently. SEVERITY: Low.

### switchDetailTab
CONFIRM. Same positional pattern for 4 detail tabs.

FINDING — switchDetailTab PASSES null currentGroupId TO loadPendingAuditions: At line 91, `if (tab === 'auditions' && currentGroupId)` — there IS a null guard. The condition `&& currentGroupId` prevents the call if currentGroupId is null. Agent 01's concern in Stage 2 was incorrect — the guard exists. Non-bug.

---

## Agent 02

### filterCategory
CONFIRM. Simple and correct.

### loadDiscover
CONFIRM. `safeRpc` used correctly. `groups || []` fallback is correct. Error rendered as empty state.

FINDING — loadDiscover PARSES DATA TWICE PATTERN: `typeof data === 'string' ? JSON.parse(data) : data` appears 4 times across loadDiscover, loadMyGroups, loadLeaderboard, and openGroup. This is a known Supabase RPC pattern where some functions return JSON strings and others return parsed objects. Correct but repetitive. SEVERITY: None (non-bug pattern observation).

---

## Agent 03

### loadMyGroups
CONFIRM. Correct. Empty state rendered for empty results.

### loadLeaderboard
CONFIRM. Correct. `renderGroupList` with `isLeaderboard=true` (4th param).

---

## Agent 04

### openGroup — Setup and DOM reset
CONFIRM: 7 DOM fields reset to loading/placeholder text before RPC. `switchDetailTab('hot-takes')` called to reset tab state.

### openGroup — RPC and DOM population
CONFIRM: `g.name.toUpperCase()` at line 169 — risk if g.name is null. For a valid group returned by `get_group_details`, name is guaranteed non-null by DB constraint. Low concern.

CONFIRM: `setCallerRole(g.my_role ?? null)` at line 191 — null-coalesced correctly.

FINDING — openGroup DOES NOT RESET detail-auditions PANEL: Lines 158-160 reset hot-takes, challenges, and members-list panels. The `detail-auditions` panel is NOT reset on openGroup. If a user opens Group A (which shows auditions), then opens Group B (different group), the auditions panel still shows Group A's auditions until the user clicks the auditions tab (which triggers `loadPendingAuditions`). SEVERITY: Low.

---

## Agent 05

### openGroup — Fire-and-forget loaders
CONFIRM: Lines 210-212 are outside the try/catch. `loadGroupHotTakes(groupId)`, `loadGroupChallenges(groupId)`, `loadGroupMembers(groupId)` all called with the parameter `groupId`, not the module variable `currentGroupId`. Since `groupId` is the function parameter (closure-captured), rapid multi-click on different groups won't cross-contaminate these loaders. CONFIRM: this is correct.

FINDING — openGroup LOADERS OUTSIDE TRY/CATCH: Confirmed from Stage 2. These loaders fire even if `get_group_details` failed. Each loader handles its own error state. Acceptable. SEVERITY: Low.

---

## Agent 06

### updateJoinBtn
CONFIRM. All three branches correctly handled. Leader disabled button is correct UX (leaders can't leave their own group).

FINDING — updateJoinBtn btn QUERIED EVERY CALL: `document.getElementById('join-btn')` is called on every `updateJoinBtn` invocation. No caching. Since this is called only when opening a group, not in a loop, this is not a performance concern. Non-bug.

FINDING — 'invite_only' HIDES BUTTON BUT DOES NOT RESET btn.disabled: When `join_mode === 'invite_only'`, line 234 sets `btn.style.display = 'none'` and returns. If `btn.disabled` was previously set to `true` from a prior call, it stays disabled. But since the button is hidden, this doesn't affect UX. Non-bug.

---

## Agent 07

### toggleMembership
CONFIRM. parseInt NaN risk confirmed at lines 260-261 and 270-271. The 'SIGN IN TO JOIN' state renders the button visible but pointing to auth redirect — detail-members textContent at that point is '—' from the loading reset. If a non-logged-in user somehow triggers toggleMembership (they can't from the rendered UI, but theoretically), the redirect fires immediately at line 246. The NaN path is only reachable if the user is logged in (the redirect guard fires first for non-users). For logged-in users, openGroup always sets detail-members to g.member_count which is numeric. CONFIRM: low real-world risk.

FINDING — toggleMembership USES alert() FOR ERRORS: Line 275: `alert((e as Error).message || 'Something went wrong')`. The codebase has `showToast()` imported at line 49 — but it's unused in this file. Using native `alert()` blocks the UI thread and breaks mobile UX. SEVERITY: Low.

---

## Agent 08

### showLobby
CONFIRM. Correct.

### openCreateModal
CONFIRM. Auth guard correct.

### closeCreateModal
CONFIRM. Idempotent.

### handleModalBackdrop
FINDING — handleModalBackdrop IS DEAD CODE: Confirmed from Stage 2. The function is declared at line 297 but is not registered as an event listener anywhere in this file. The create-modal backdrop behavior is handled at line 369-371 via `'create-modal-backdrop'` data-action. `handleModalBackdrop` is dead code. SEVERITY: Low.

---

## Agent 09

### selectEmoji
CONFIRM. `el.dataset.emoji` could be undefined. `setSelectedEmoji(undefined)` sets state to undefined. The `create_group` RPC call sends `p_avatar_emoji: undefined` which is treated as omitting the parameter — server default applies. Low real-world risk since the emoji picker HTML presumably always has data-emoji attributes.

### submitCreateGroup
CONFIRM. Form validation, RPC, cleanup correct. `p_is_public: true` hardcoded — intentional per design (no private group creation from this UI).

FINDING — submitCreateGroup DOES NOT RESET SELECTED EMOJI STATE: After `closeCreateModal()` at line 321, the input fields are cleared at lines 322-323, but `setSelectedEmoji(...)` is NOT called to reset the selected emoji state. On next openCreateModal, the previous emoji selection would still be active in state (though visually it depends on whether the modal DOM resets). If `selectedEmoji` persists with the old value, the next group creation would reuse the previous emoji. SEVERITY: Low.

---

## Agent 10

### Module-scope blocks

**init block:** CONFIRM. Correct initialization sequence.

**URL param handler:** CONFIRM. UUID regex validated. `ready.then` deferred. Confirmed: `loadDiscover` runs first (registered at line 61), then `openGroup(urlGroup)` runs second (registered at line 336). Both registered before `ready` resolves (synchronous code runs before the promise chain executes).

**Click delegation:** CONFIRM. 26 cases cover all UI actions.

FINDING — switch-tab NON-NULL ASSERTION `dataset.tab!`: Lines 352, 367. TypeScript non-null assertion used. If `data-tab` attribute is absent in HTML, undefined is passed to `switchTab`/`switchDetailTab`, resulting in no active tab and all panels hidden. Requires malformed HTML. SEVERITY: Low.

**group-banner-updated listener:** CONFIRM. `groupId === currentGroupId` guard prevents stale re-renders. Calls `openGroup` — reopens the full group detail. Correct.

---

## Agent 11

### escapeHTML and showToast Dead Imports
FINDING — escapeHTML AND showToast IMPORTED BUT NOT USED IN THIS FILE: Line 49: `import { escapeHTML, showToast } from '../config.ts'`. Neither `escapeHTML` nor `showToast` appear in any function in groups.ts. Both are dead imports in this specific file. `showToast` should have been used in `toggleMembership` error handling instead of `alert()`. SEVERITY: Low.

### safeRpc Usage
CONFIRM: All 6 RPC calls use safeRpc. CONFIRM: castle defense respected.

### XSS Review
CONFIRM: No user data enters innerHTML in this file. All user-controlled values (group name, description, member count, ELO) use `textContent`. The only innerHTML assignments are hardcoded loading strings. No XSS risks.

### Overall Cross-Cutting
- `currentGroupData` module variable (line 54): set in `openGroup` at line 192. Read in the delegation handler at line 393 (`openGroupSettings(currentGroupData, ...)`). If `openGroupSettings` is triggered before `openGroup` completes (user clicks gear very quickly), `currentGroupData` could be null. The gear button is hidden until `openGroup` sets `my_role === 'leader'` (line 199), which happens after the RPC completes. The gear button is not visible before openGroup finishes. Safe.

## Consolidated Findings Summary

**REAL — Low severity:**
1. **handleModalBackdrop IS DEAD CODE** (line 297): Function declared but never called or registered as listener.
2. **escapeHTML AND showToast IMPORTED BUT NOT USED** (line 49): Both dead imports in this file.
3. **toggleMembership USES alert() INSTEAD OF showToast**: Native alert blocks UI; showToast is available and imported.
4. **submitCreateGroup DOES NOT RESET selectedEmoji STATE** (line 321): Previous emoji selection persists in module state after modal close.
5. **Positional array tab coupling** in switchTab (line 68) and switchDetailTab (line 83): Button order in HTML must match array order.
6. **parseInt NaN risk in toggleMembership** (lines 260-261, 270-271): If member count is not yet numeric (e.g., '—'), count shows as 'NaN'. Low real-world probability.
7. **openGroup does not reset detail-auditions panel**: Stale auditions shown briefly when opening different group.
8. **switch-tab/switch-detail-tab non-null assertion** (lines 352, 367): Missing data-tab attribute would silently hide all panels.
9. **Fire-and-forget loaders run even on RPC failure** (lines 210-212): Each loader independently errors but creates multiple simultaneous error states.

**NON-BUG OBSERVATIONS:**
- safeRpc correctly used for all RPCs.
- No XSS risks — all user data via textContent.
- URL param UUID validated before use.
- switchDetailTab null guard on currentGroupId confirmed (contrary to Stage 2 Agent 01 concern — guard exists at line 90).
- join/leave optimistic count update is low-risk (followed by loadGroupMembers refresh).
