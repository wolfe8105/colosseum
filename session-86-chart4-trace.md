# Session 86 — Chart 4 Trace: Groups (Discover → Detail → GvG)

**Date:** March 12, 2026
**Chart:** 4 of 6
**File traced:** `colosseum-groups.html` (917 lines, live on Vercel)
**Edges in chart:** 14
**Result:** 9 wired, 5 unwired, 0 bugs found

---

## Edge-by-Edge Trace

### GROUPS SCREEN → Tab Actions (4 edges)

**E197: GROUPS SCREEN → Tap group in Discover** ✅ WIRED
- L396: `onclick="switchTab('discover')"` — Discover is default active tab
- L558: `loadDiscover()` called on ColosseumAuth.ready init
- L596-608: `loadDiscover()` → `sb.rpc('discover_groups', { p_limit: 30, p_category: activeCategory })`
- L642-677: `renderGroupList()` renders cards with `data-group-id`, attaches click handler at L672-675 → `openGroup(card.dataset.groupId)`
- Category filter wired: L588-593 `filterCategory()` sets activeCategory, re-calls loadDiscover()

**E198: GROUPS SCREEN → Tap group in My Groups** ✅ WIRED
- L397: `onclick="switchTab('mine')"`
- L571: `if (tab === 'mine' && currentUser) loadMyGroups()`
- L572-574: Not logged in → shows "Sign in to see your groups" empty state
- L615: `sb.rpc('get_my_groups')` — no params needed, uses auth context
- L622: `renderGroupList('mine-list', groups, true)` — showRole=true shows OWNER/MEMBER badges
- Same click handler → `openGroup()`

**E199: GROUPS SCREEN → Tap +CREATE (auth gated)** ✅ WIRED
- L392: `onclick="openCreateModal()"`
- L853-859: `openCreateModal()` — auth gate at L854: `if (!currentUser)` → redirect to plinko
- L858: `document.getElementById('create-modal').classList.add('open')` shows modal overlay
- Modal at L478-524: name input (maxlength=50), description textarea, category select, emoji picker (12 options)
- L523: submit button → `submitCreateGroup()`

**E200: GROUPS SCREEN → Tap group in Rankings** ✅ WIRED
- L398: `onclick="switchTab('leaderboard')"`
- L575: `if (tab === 'leaderboard') loadLeaderboard()`
- L632: `sb.rpc('get_group_leaderboard', { p_limit: 20 })`
- L635: `renderGroupList('leaderboard-list', groups, false, true)` — showRank=true shows #1, #2, etc.
- Same click handler → `openGroup()`

### Tab → GROUP DETAIL transitions (4 edges)

**E202: Tap group in Discover → GROUP DETAIL** ✅ WIRED
- L674: `openGroup(card.dataset.groupId)` triggered by card click
- L688-727: `openGroup()` — hides lobby (L690), shows detail view (L691), resets all fields (L694-701)
- L705: `sb.rpc('get_group_details', { p_group_id: groupId })` loads header data
- L709-714: Populates name, emoji, description, member count, Elo
- L716-717: Sets `isMember` flag, calls `updateJoinBtn()`
- L723: `loadGroupHotTakes(groupId)` — reads `hot_takes` table where `section = groupId`
- L726: `loadGroupMembers(groupId)` — `sb.rpc('get_group_members', { p_group_id, p_limit: 50 })`
- L910-913: URL param support — `?group=UUID` opens group directly on page load

**E203: Tap group in My Groups → GROUP DETAIL** ✅ WIRED
- Same `renderGroupList()` click handler (L672-675) → same `openGroup()` path
- Identical to E202

**E204: Tap +CREATE → GROUP DETAIL ("created")** ✅ WIRED
- L875-907: `submitCreateGroup()` — validates name (min 2 chars)
- L884: `sb.rpc('create_group', { p_name, p_description, p_category, p_is_public: true, p_avatar_emoji })`
- L894: `closeCreateModal()` — clears modal
- L895-896: Resets form fields
- L899: `if (result.group_id) openGroup(result.group_id)` — auto-opens newly created group
- Full flow: create modal → RPC → close modal → open group detail

**E205: Tap group in Rankings → GROUP DETAIL** ✅ WIRED
- Same `renderGroupList()` click handler → same `openGroup()` path
- Identical to E202

### GROUP DETAIL → Actions (4 edges)

**E210: GROUP DETAIL → Join / Leave Group** ✅ WIRED
- L458: `onclick="toggleMembership()"`
- L813-843: Auth gate at L814 — unauthenticated → plinko redirect with returnTo param
- L821-837: Toggle logic:
  - If member: `sb.rpc('leave_group', { p_group_id: currentGroupId })`, decrements member count display
  - If not member: `sb.rpc('join_group', { p_group_id: currentGroupId })`, increments member count display
- L729-745: `updateJoinBtn()` — owner gets "YOU OWN THIS GROUP" (disabled), member gets "LEAVE GROUP", non-member gets "JOIN GROUP", unauthenticated gets "SIGN IN TO JOIN"

**E211: GROUP DETAIL → Post Hot Take (group-scoped)** ❌ UNWIRED
- No post input field or button exists in the detail view HTML (L433-474)
- L748-776: `loadGroupHotTakes()` is read-only — fetches and displays hot takes but no way to create one
- No `postGroupHotTake()`, `submitTake()`, or similar function anywhere in the file
- Hot takes display references `hot_takes` table with `section = groupId`, but there's no UI to write into it
- **Impact:** Groups appear to support hot takes (data model exists, display works) but users cannot actually post them

**E212: GROUP DETAIL → Challenge Another Group (GvG)** ❌ UNWIRED
- The drawio shows "GvG Button" in the GROUP DETAIL screen, but no such button exists in HTML
- `grep -n 'gvg\|GvG\|challengeGroup\|challenge.*group\|versus\|vs_group'` returns zero hits
- No GvG-related function exists in the file
- **Impact:** The entire Group vs Group feature is unbuilt on the frontend. Schema/RPCs may exist but no UI calls them.

**E213: GROUP DETAIL → Tap Member Avatar** ❌ UNWIRED
- L791-806: Renders `member-row` divs with avatar, name, Elo, role badge
- No click handler attached to `member-row` or `member-avatar` elements
- No navigation to `/u/username` or in-app profile modal
- `grep -n 'member.*click\|member.*onclick\|member.*href\|/u/'` returns zero hits
- **Impact:** Members list is display-only, cannot navigate to any member's profile

### GvG Flow + Cross-Chart (2 edges)

**E215: Challenge Another Group → Pick opposing group + format** ❌ UNWIRED
- Depends on E212 (GvG button) which does not exist
- No opponent picker UI, no format selection modal, no opponent group search
- **Impact:** Entire GvG challenge flow is unbuilt

**E217: Tap Member Avatar → Chart 5: Public Profile** ❌ UNWIRED
- Depends on E213 (member avatar click handler) which does not exist
- No navigation code to `/u/username` from member list
- **Impact:** Cannot reach public profile from group context

---

## Summary

| Status | Count | Edges |
|--------|-------|-------|
| ✅ Wired | 9 | E197, E198, E199, E200, E202, E203, E204, E205, E210 |
| ❌ Unwired | 5 | E211, E212, E213, E215, E217 |
| ⚠️ Partially wired | 0 | — |
| 🐛 Bugs | 0 | — |

### Key Findings

1. **The happy path works.** Discover/My Groups/Rankings tabs all load correctly via RPCs, group cards are clickable, group detail loads header + hot takes + members, join/leave toggles work with proper auth gating, group creation works end-to-end and auto-opens the new group. URL param deep linking (`?group=UUID`) also works.

2. **Groups are read-only social containers.** You can browse, join, and leave groups, but you cannot *do* anything inside them. No posting hot takes, no GvG challenges. The group detail view is essentially a display page.

3. **5 unwired edges form 2 missing feature clusters:**
   - **Group Hot Takes (E211):** Data model and display exist but no post UI. This is the simplest gap to close — needs an input field + submit button + RPC call.
   - **GvG (E212, E215) + Member Profiles (E213, E217):** The entire GvG flow and member-to-profile navigation are unbuilt. GvG is a bigger lift; member avatar clicks are simple to add.

4. **No bugs found.** All escaping uses `ColosseumConfig.escapeHTML()` consistently. Data flows through RPCs for writes. No innerHTML injection risks. `parseInt()` used for numeric displays.

5. **Security notes:** Auth gating correct on create (L854) and join/leave (L814). Owner cannot leave (L739). Hot takes query uses `.eq('section', groupId)` which is parameterized. All user input in cards/members escaped.

---

## Files Produced
- `Colosseum4-annotated.drawio` — Chart 4 annotations injected (14 edges)
- `session-86-chart4-trace.md` — this file
