# Anchor List — groups.ts (Arbiter Run 2)

Independent review of source file (446 lines) and Stage 1 outputs.

All 11 Stage 1 agents found the same 15 functions. Verified by independent line scan:

Line 65:  `function switchTab(tab: string)` — confirmed
Line 80:  `function switchDetailTab(tab: string)` — confirmed
Line 96:  `function filterCategory(cat: string | null, el: HTMLElement)` — confirmed
Line 104: `async function loadDiscover()` — confirmed
Line 117: `async function loadMyGroups()` — confirmed
Line 134: `async function loadLeaderboard()` — confirmed
Line 147: `async function openGroup(groupId: string)` — confirmed
Line 215: `function updateJoinBtn(g: GroupDetail)` — confirmed
Line 244: `async function toggleMembership()` — confirmed
Line 282: `function showLobby()` — confirmed
Line 290: `function openCreateModal()` — confirmed
Line 294: `function closeCreateModal()` — confirmed
Line 297: `function handleModalBackdrop(e: Event)` — confirmed
Line 300: `function selectEmoji(el: HTMLElement)` — confirmed
Line 305: `async function submitCreateGroup()` — confirmed

No other function declarations in the file. The module-scope init block (line 56-62), URL handler (334-337), click delegation (340-436), and custom event listener (440-445) are not function declarations.

**Anchor: 15 entries, 0 unresolved.**

## Resolution notes

Runs 1 and 2 agree. No reconciliation needed.
