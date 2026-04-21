# Stage 3 Outputs — src/pages/groups.detail.ts

## Agent 01

### openGroup (line 21)
**Verification**: PASS (all five agents)
**Findings**:
- All agents correctly state async signature `(groupId: string): Promise<void>` — confirmed line 21.
- All correctly identify `setCurrentGroupId(groupId)` called first — line 22.
- All correctly describe DOM setup: `view-lobby` → `'none'`, `view-detail` → `'flex'`, placeholder writes to `detail-name`, `detail-emoji`, `detail-desc`, `detail-members`, `detail-elo`, loading-state innerHTML for `detail-hot-takes`, `detail-challenges`, `detail-members-list`, `gvg-challenge-btn` hidden — lines 23–34.
- All correctly cite `switchDetailTab('hot-takes')` — line 35.
- All correctly describe the `safeRpc('get_group_details', { p_group_id: groupId })` await, error throw, and string/JSON data coercion — lines 38–40.
- All correctly describe writes to `detail-top-name`, `detail-emoji`, `detail-name`, `detail-desc`, `detail-members`, `detail-elo` with the listed fallbacks — lines 42–47.
- All correctly describe the `detail-banner` existence check and `renderGroupBanner(bannerEl, g, leader||co_leader)` call — lines 49–50.
- All correctly describe the `detail-fate` branch with `shared_fate_pct ?? 0`, `+{pct}%` vs `—`, and color toggle — lines 52–57.
- All correctly describe `setIsMember(g.is_member)`, `setCallerRole(g.my_role ?? null)`, assignment to `currentGroupData`, `updateJoinBtn(g)`, `gvg-challenge-btn` toggle, `detail-gear-btn` flex/none gated on leader, `detail-auditions-tab` inline-block gated on `audition` — lines 59–70.
- All correctly describe the bare `catch {}` writing `'Error loading group'` to `detail-name` — lines 71–73.
- All correctly describe the three fire-and-forget loader calls `loadGroupHotTakes`, `loadGroupChallenges`, `loadGroupMembers` after try/catch — lines 75–77.
- Agents 04 and 05 note `loadPendingAuditions` is imported but not invoked in this function — confirmed against imports (line 11) and function body.
**Unverifiable claims**: None

### updateJoinBtn (line 80)
**Verification**: PASS (all five agents)
**Findings**:
- All correctly state synchronous `(g: GroupDetail): void` signature — line 80.
- All correctly cite the `join-btn` lookup cast as `HTMLButtonElement` — line 81.
- All correctly describe the `!currentUser` branch: `'SIGN IN TO JOIN'`, `'join-btn join'`, `display='block'`, `disabled=false`, early return — lines 82–85.
- All correctly describe the `g.is_member` branch: leader → `'YOU OWN THIS GROUP'` else `'LEAVE GROUP'`, `className='join-btn leave'`, `disabled = (g.my_role === 'leader')`, `display='block'`, early return — lines 86–91.
- All correctly describe the fall-through: `mode = g.join_mode ?? 'open'`, `invite_only` → `display='none'` early return; else `display='block'`, `disabled=false`, `className='join-btn join'`, `textContent` = `'REQUEST AUDITION'` when `audition` else `'JOIN GROUP'` — lines 92–96.
**Unverifiable claims**: None

### toggleMembership (line 98)
**Verification**: PASS (all five agents)
**Findings**:
- All correctly state async, no params, `Promise<void>` — line 98.
- All correctly describe the `!currentUser` branch redirecting via `window.location.href = 'moderator-plinko.html?returnTo=' + encodeURIComponent(window.location.pathname + '?group=' + currentGroupId)` then return — lines 99–102.
- All correctly describe the `join-btn` lookup and `btn.disabled = true` — lines 103–104.
- All correctly describe the `isMember === true` branch: `safeRpc('leave_group', { p_group_id: currentGroupId })`, throw on error, `setIsMember(false)`, `setCallerRole(null)`, button text `'JOIN GROUP'`, `className='join-btn join'`, `gvg-challenge-btn` display `'none'`, `detail-members` decrement via `Number.parseInt` → subtract 1 → `String(...)` — lines 106–113.
- All correctly describe the `isMember === false` branch: `safeRpc('join_group', { p_group_id: currentGroupId })`, throw on error, `setIsMember(true)`, `setCallerRole('member')`, button text `'LEAVE GROUP'`, `className='join-btn leave'`, `gvg-challenge-btn` display `'block'`, `detail-members` increment by 1 — lines 114–122.
- All correctly describe `loadGroupMembers(currentGroupId!)` fire-and-forget after the branch — line 123.
- All correctly describe `catch (e)` calling `alert((e as Error).message || 'Something went wrong')` — lines 124–125.
- All correctly describe `finally { btn.disabled = false }` — lines 126–128.
**Unverifiable claims**: None

### Cross-Agent Consensus Summary
- **PASS**: 15 (3 functions × 5 agents)
- **PARTIAL**: 0
- **FAIL**: 0
- **Agent disagreements**: None.

### needs_review
None.

## Agent 02

### openGroup (line 21)
**Verification**: PASS
**Findings**:
- All 5 agents correctly identify `setCurrentGroupId(groupId)` as the first call (line 22). PASS.
- All 5 agents correctly describe DOM placeholder writes on lines 23-34: view-lobby hidden, view-detail set to flex, detail-name "Loading…", detail-emoji "⚔️", detail-desc "", detail-members "—", detail-elo "—", three innerHTML loading-state divs, gvg-challenge-btn hidden. PASS.
- All 5 agents correctly identify `switchDetailTab('hot-takes')` on line 35. PASS.
- All 5 agents correctly describe the try block: `safeRpc('get_group_details', { p_group_id: groupId })` (line 38), error throw (line 39), string/object parse (line 40). PASS.
- All 5 agents correctly describe detail-top-name uppercased, detail-emoji fallback, detail-name, detail-desc fallback empty, detail-members, detail-elo writes (lines 42-47). PASS.
- All 5 agents correctly describe the `renderGroupBanner` call with leader/co_leader flag on line 50. PASS.
- All 5 agents correctly describe the detail-fate block (lines 52-57). PASS.
- All 5 agents correctly describe `setIsMember`, `setCallerRole`, `currentGroupData = g` (lines 59-61). PASS.
- All 5 agents correctly describe `updateJoinBtn(g)` call and gvg-challenge-btn toggle on is_member (lines 63-64). PASS.
- All 5 agents correctly describe detail-gear-btn, detail-auditions-tab branches (lines 66-70). PASS.
- Agents 1, 2, 3 correctly note the catch clause has no binding. Agents 4 and 5 describe the catch writing `'Error loading group'` but don't explicitly state "no binding" — minor stylistic difference, not a contradiction. PASS.
- All 5 agents correctly describe the three fire-and-forget loaders on lines 75-77. PASS.
- Agents 4 and 5 note `loadPendingAuditions` imported but not invoked — verified. PASS.
**Unverifiable claims**: None

### updateJoinBtn (line 80)
**Verification**: PASS
**Findings**:
- All 5 agents correctly describe reading `#join-btn` as `HTMLButtonElement` (line 81). PASS.
- All 5 agents correctly describe the `!currentUser` branch (lines 82-85). PASS.
- All 5 agents correctly describe the `g.is_member` branch (lines 86-90). PASS.
- All 5 agents correctly describe `mode = g.join_mode ?? 'open'` and `invite_only` → display none early return (lines 92-93). PASS.
- All 5 agents correctly describe the final branch (lines 94-95). PASS.
**Unverifiable claims**: None

### toggleMembership (line 98)
**Verification**: PASS
**Findings**:
- All 5 agents correctly describe the `!currentUser` branch with the exact URL construction (lines 99-101). PASS.
- All 5 agents correctly describe reading `#join-btn` and setting `btn.disabled = true` (lines 103-104). PASS.
- All 5 agents correctly describe the `isMember` true branch (lines 109-113). PASS.
- All 5 agents correctly describe the else branch (lines 115-121). PASS.
- All 5 agents correctly describe `loadGroupMembers(currentGroupId!)` fire-and-forget on line 123. PASS.
- All 5 agents correctly describe catch(e) with `alert(...)` (lines 124-125). PASS.
- All 5 agents correctly describe the finally block (lines 126-127). PASS.
**Unverifiable claims**: None

### Cross-Agent Consensus Summary
- **PASS**: 15 verdicts
- **PARTIAL**: 0
- **FAIL**: 0

### needs_review
None.

## Agent 03

### openGroup (line 21)
**Verification**: PASS
**Findings**:
- Line 22 confirms `setCurrentGroupId(groupId)`. PASS.
- Lines 23-24 confirm `view-lobby` -> `'none'` and `view-detail` -> `'flex'`. PASS.
- Lines 26-30 confirm placeholder writes. PASS.
- Lines 31-33 confirm `innerHTML` loading-state. PASS.
- Line 34 confirms `gvg-challenge-btn` display = 'none'. Line 35 confirms `switchDetailTab('hot-takes')`. PASS.
- Line 38 confirms `await safeRpc('get_group_details', { p_group_id: groupId })`. Line 39 confirms `if (error) throw error`. PASS.
- Line 40 confirms `typeof data === 'string' ? JSON.parse(data) : data`. PASS.
- Lines 42-47 confirm DOM writes. PASS.
- Lines 49-50 confirm `renderGroupBanner` call. PASS.
- Lines 52-57 confirm `detail-fate` handling. PASS.
- Lines 59-61 confirm state writes and `currentGroupData = g`. PASS.
- Lines 63-64 confirm `updateJoinBtn(g)` and button toggle. PASS.
- Lines 66-67 confirm `detail-gear-btn` branch. PASS.
- Lines 69-70 confirm `detail-auditions-tab` branch. PASS.
- Lines 71-73 confirm bare `catch {}` writing `'Error loading group'`. PASS.
- Lines 75-77 confirm fire-and-forget loader calls. PASS.
- Agents 04/05 note `loadPendingAuditions` imported but not invoked — confirmed. PASS.
**Unverifiable claims**: None

### updateJoinBtn (line 80)
**Verification**: PASS
**Findings**:
- Lines 81-82 confirm `btn` obtained and `currentUser` read. PASS.
- Lines 82-85 confirm `!currentUser` branch. PASS.
- Lines 86-91 confirm `g.is_member` branch. PASS.
- Line 92 confirms `mode = g.join_mode ?? 'open'`. PASS.
- Line 93 confirms `mode === 'invite_only'` → `display='none'` and return. PASS.
- Lines 94-95 confirm final branch. PASS.
- Agents 01 and 04/05 differ slightly in phrasing on `disabled` in the member branch but both accurately describe `btn.disabled = g.my_role === 'leader'` at line 89. PASS.
**Unverifiable claims**: None

### toggleMembership (line 98)
**Verification**: PASS
**Findings**:
- Lines 99-102 confirm `!currentUser` redirect branch. PASS.
- Lines 103-104 confirm `btn` lookup and `btn.disabled = true`. PASS.
- Lines 106-113 confirm `isMember` true branch. PASS.
- Lines 114-122 confirm `isMember` false branch. PASS.
- Line 123 confirms fire-and-forget `loadGroupMembers(currentGroupId!)`. PASS.
- Lines 124-125 confirm catch/alert. PASS.
- Lines 126-128 confirm finally block. PASS.
**Unverifiable claims**: None

### Cross-Agent Consensus Summary
- Total verdicts: 15
- PASS: 15
- PARTIAL: 0
- FAIL: 0

### needs_review
None.

## Agent 04

### openGroup (line 21)
**Verification**: PASS
**Findings**:
- All 5 agents correctly describe `setCurrentGroupId(groupId)` first call (line 22).
- All 5 agents correctly describe hiding/showing lobby/detail views (lines 23-24).
- All 5 agents correctly describe placeholder writes (lines 26-33).
- All 5 agents correctly describe hiding `gvg-challenge-btn` and calling `switchDetailTab('hot-takes')` (lines 34-35).
- All 5 agents correctly describe `safeRpc` await, error throw, JSON parse pattern (lines 38-40).
- All 5 agents correctly describe success-path DOM writes (lines 42-47).
- All 5 agents correctly describe `renderGroupBanner` branch (line 50).
- All 5 agents correctly describe `detail-fate` branch (lines 52-57).
- All 5 agents correctly describe state writes + `currentGroupData = g` + `updateJoinBtn(g)` (lines 59-63).
- All 5 agents correctly describe `gvg-challenge-btn`, `detail-gear-btn`, `detail-auditions-tab` toggles (lines 64, 66-67, 69-70).
- All 5 agents correctly describe bare catch writing "Error loading group" (lines 71-73).
- All 5 agents correctly describe three fire-and-forget loaders (lines 75-77).
- Agents 04/05 correctly note `loadPendingAuditions` imported but unused.
**Unverifiable claims**: None

### updateJoinBtn (line 80)
**Verification**: PASS
**Findings**:
- Line 81 cast confirmed.
- Lines 82-85 `!currentUser` branch confirmed.
- Lines 86-91 `g.is_member` branch confirmed.
- Line 92 `mode` read confirmed.
- Line 93 `invite_only` early return confirmed.
- Lines 94-95 fall-through confirmed.
**Unverifiable claims**: None

### toggleMembership (line 98)
**Verification**: PASS
**Findings**:
- Lines 99-102 redirect confirmed.
- Lines 103-104 button disable confirmed.
- Lines 107-113 leave branch confirmed.
- Lines 115-121 join branch confirmed.
- Line 123 fire-and-forget `loadGroupMembers` confirmed.
- Lines 124-126 catch/alert confirmed.
- Lines 126-128 finally confirmed.
**Unverifiable claims**: None

### Cross-Agent Consensus Summary
- **openGroup**: 5 PASS, 0 PARTIAL, 0 FAIL
- **updateJoinBtn**: 5 PASS, 0 PARTIAL, 0 FAIL
- **toggleMembership**: 5 PASS, 0 PARTIAL, 0 FAIL

**Total**: 15 PASS, 0 PARTIAL, 0 FAIL

### needs_review
None.

## Agent 05

### openGroup (line 21)
**Verification**: PASS
**Findings**:
- All five agents correctly identify `setCurrentGroupId(groupId)` called first (line 22). PASS.
- All five agents correctly describe hiding `view-lobby` (line 23) and showing `view-detail` as flex (line 24). PASS.
- Placeholder resets and `gvg-challenge-btn` hide all match lines 26–34. PASS.
- `switchDetailTab('hot-takes')` at line 35 confirmed. PASS.
- `safeRpc('get_group_details', ...)` with throw on error — lines 38–39. PASS.
- JSON string parsing at line 40 confirmed. PASS.
- DOM writes at lines 42–47 confirmed. PASS.
- `renderGroupBanner` call at lines 49–50 confirmed. PASS.
- `detail-fate` handling at lines 52–57 confirmed. PASS.
- `setIsMember`, `setCallerRole`, `currentGroupData = g` at lines 59–61 confirmed. PASS.
- `updateJoinBtn(g)` at line 63 confirmed. PASS.
- `gvg-challenge-btn` display toggle at line 64 confirmed. PASS.
- `detail-gear-btn` branch at lines 66–67 confirmed. PASS.
- `detail-auditions-tab` branch at lines 69–70 confirmed. PASS.
- Bare `catch {}` writing `'Error loading group'` at lines 71–73 confirmed. PASS.
- Three fire-and-forget calls at lines 75–77 confirmed. PASS.
- Agents 04/05 `loadPendingAuditions` observation confirmed.
**Unverifiable claims**: None

### updateJoinBtn (line 80)
**Verification**: PASS
**Findings**:
- DOM lookup `#join-btn` at line 81 confirmed.
- `!currentUser` branch at lines 82–84 confirmed.
- `g.is_member` branch at lines 86–90 confirmed.
- `mode` fallback at line 92 confirmed.
- `mode === 'invite_only'` branch at line 93 confirmed.
- Fall-through branch at lines 94–95 confirmed.
**Unverifiable claims**: None

### toggleMembership (line 98)
**Verification**: PASS
**Findings**:
- `!currentUser` redirect at lines 99–102 confirmed.
- `#join-btn` read and `disabled=true` at lines 103–104 confirmed.
- `isMember` true branch at lines 106–113 confirmed.
- `isMember` false branch at lines 114–122 confirmed.
- `loadGroupMembers(currentGroupId!)` fire-and-forget at line 123 confirmed.
- `catch (e)` alert at lines 124–125 confirmed.
- `finally { btn.disabled = false }` at lines 126–127 confirmed.
**Unverifiable claims**: None (internal `safeRpc` behavior is outside this file).

### Cross-Agent Consensus Summary
- **PASS**: 15 (3 × 5)
- **PARTIAL**: 0
- **FAIL**: 0
- **Agent disagreements**: None.

### needs_review
None.
