# Stage 3 Outputs — src/reference-arsenal.loadout.ts

## Agent 01

### renderLoadoutPicker — PASS

**Claim: async function, three parameters (container, debateId, initialRefs defaulting to [])**
Verified. Line 15–19: `export async function renderLoadoutPicker(container: HTMLElement, debateId: string, initialRefs: string[] = [])`. Correct.

**Claim: immediately sets container.innerHTML to loading message**
Verified. Line 20: `container.innerHTML = '<p style="...">Loading arsenal...</p>'`. Correct.

**Claim: awaits safeRpc('get_my_arsenal', {}), error/falsy-data/throw all collapse to empty array**
Verified. Lines 23–29: try/catch wraps the call; lines 25–26 handle `error || !data`; catch block at line 27 assigns `[]`. All three paths covered. Correct.

**Claim: if arsenal empty, sets innerHTML to empty-state div and returns early**
Verified. Lines 31–38: `if (arsenal.length === 0)` sets the empty-state `div.ref-loadout-empty` and returns. Correct.

**Claim: filters out frozen entries, sorts descending by current_power then created_at**
Verified. Line 41: `arsenal = arsenal.filter(r => r.challenge_status !== 'frozen')`. Line 43: sort by `b.current_power - a.current_power || Date.parse(b.created_at) - Date.parse(a.created_at)`. Note: the filter is a reassignment to a new array, not in-place mutation. The statement in Stage 2 agents 01, 02, 04, 05 either omits or correctly implies this; only Agent 03 used "filters in place" language, which is imprecise.

**Claim: selected Set built from initialRefs filtered to existing IDs, capped at 5**
Verified. Lines 45–47: `new Set<string>(initialRefs.filter(id => arsenal.some(r => r.id === id)).slice(0, 5))`. Correct.

**Claim: inner render() builds HTML, writes to container.innerHTML, attaches click listeners to non-disabled cards**
Verified. Lines 49–91. render() constructs the header and grid HTML, writes to `container.innerHTML` at line 74, then queries `.ref-loadout-card:not(.disabled)` at line 76 and attaches listeners. Correct.

**Claim: click listener reads dataset.refId; if absent returns; toggles selected; calls render() recursively; calls saveDebateLoadout fire-and-forget with .catch(console.warn)**
Verified. Lines 77–89. `const refId = (card as HTMLElement).dataset.refId; if (!refId) return;` at lines 78–79. Toggle logic lines 80–84. `render()` call line 85. `saveDebateLoadout(...).catch(...)` lines 86–88. Correct.

**Claim: escapeHTML called on ref.id, srcInfo?.label || ref.source_type, ref.claim_text, ref.source_title, ref.source_author**
Verified. Lines 62–68 confirm all five fields passed through `escapeHTML`. Correct.

**needs_review:** The empty-arsenal guard (line 31) evaluates `arsenal.length === 0` against the raw RPC result, before the frozen-entry filter executes at line 41. If the user has one or more references but all are frozen, `arsenal.length` is non-zero at line 31, so the early-return path is skipped. After line 41 filters them all out, `render()` is called (line 93) on an empty `arsenal` array. `render()` will write a header row and an empty `div.ref-loadout-grid` — the intended empty-state message from lines 32–36 is never shown. This is a likely bug: the frozen filter should run before the empty check, or the empty check should be repeated after filtering.

---

## Agent 02

### renderLoadoutPicker — PASS

**Claim: sets innerHTML to loading placeholder immediately on entry**
Verified. Line 20. Correct.

**Claim: safeRpc call wrapped in try/catch; error, falsy data, and throw all produce empty array**
Verified. Lines 23–29. Three-path error collapse confirmed. Correct.

**Claim: if arsenal empty, innerHTML replaced with empty-state div, early return**
Verified. Lines 31–38. Correct.

**Claim: filters out frozen entries (challenge_status === 'frozen')**
Verified. Line 41. Correct. Note: Stage 2 Agent 02 described this filter but did not enumerate `escapeHTML(srcInfo?.label || ref.source_type)` in the escapeHTML list, listing only `ref.id`, `ref.claim_text`, `ref.source_title`, `ref.source_author`. The source at line 64 shows `escapeHTML(srcInfo?.label || ref.source_type)` is also called. This omission in Stage 2 Agent 02 is a documentation gap, not a correctness failure in the code itself.

**Claim: sorts descending by current_power, ties broken by created_at descending via Date.parse**
Verified. Line 43. Correct.

**Claim: selected Set from initialRefs, filtered to IDs in arsenal, capped at 5**
Verified. Lines 45–47. Correct.

**Claim: render() builds full HTML, writes to container.innerHTML, attaches listeners to non-disabled cards**
Verified. Lines 49–91. Correct.

**Claim: saveDebateLoadout called fire-and-forget with .catch(console.warn)**
Verified. Lines 86–88: `.catch((e) => console.warn('[Arena] Loadout save failed:', e))`. Correct.

**needs_review:** The empty-arsenal check at line 31 precedes the frozen-entry filter at line 41. A user whose entire arsenal is frozen will pass line 31 (arsenal is non-empty), have all entries filtered out at line 41, and arrive at `render()` with an empty `arsenal` array. `render()` will produce a header and an empty grid div instead of the `div.ref-loadout-empty` empty-state message. The empty-state branch is effectively unreachable if the user has any frozen references. The fix is to move the empty check to after line 41, or to repeat it there.

---

## Agent 03

### renderLoadoutPicker — PARTIAL

**Claim: async function, three parameters**
Verified. Line 15–19. Correct.

**Claim: loading placeholder set immediately**
Verified. Line 20. Correct.

**Claim: safeRpc call; all failure paths collapse to empty array**
Verified. Lines 23–29. Correct.

**Claim: empty arsenal → innerHTML empty-state, early return**
Verified. Lines 31–38. Correct.

**Claim: "filters the array in place to remove entries whose challenge_status equals 'frozen'"**
PARTIAL. Line 41: `arsenal = arsenal.filter(r => r.challenge_status !== 'frozen')`. `Array.prototype.filter` returns a new array; the result is reassigned to `arsenal`. This is not in-place mutation. The phrase "filters in place" implies mutation of the existing array (e.g., via splice), which is not what occurs. The behavior is equivalent for all subsequent reads of `arsenal`, but the description is technically inaccurate.

**Claim: sorts descending by current_power then created_at**
Verified. Line 43. Correct.

**Claim: selected Set from initialRefs, filtered to existing IDs, capped at 5**
Verified. Lines 45–47. Correct.

**Claim: render() builds HTML with escapeHTML on user-supplied fields**
Verified. Lines 62–68 confirm escapeHTML on ref.id, srcInfo?.label || ref.source_type, ref.claim_text, ref.source_title, ref.source_author. Correct.

**Claim: click listeners on non-disabled cards; toggle selected; recursive render(); fire-and-forget saveDebateLoadout**
Verified. Lines 76–89. Correct.

**Verdict rationale:** One inaccurate statement ("filters in place") — the runtime behavior is correct, but the description implies mutation rather than reassignment.

**needs_review:** Same as other agents — empty-arsenal check at line 31 precedes frozen filter at line 41. All-frozen arsenal bypasses the empty-state message and calls `render()` with an empty array, producing a header-only grid.

---

## Agent 04

### renderLoadoutPicker — PARTIAL

**Claim: async, three parameters, no module-level state**
Verified. Lines 15–19. Correct.

**Claim: loading placeholder on entry**
Verified. Line 20. Correct.

**Claim: RPC error handling — error, falsy data, throw → empty array**
Verified. Lines 23–29. Correct.

**Claim: empty check → empty-state div, early return**
Verified. Lines 31–38. Correct.

**Claim: "filters arsenal in place, removing entries whose challenge_status equals 'frozen'"**
PARTIAL. Line 41: `arsenal = arsenal.filter(...)`. `Array.filter` creates a new array; `arsenal` is reassigned to point to it. There is no in-place mutation. The Stage 2 Agent 04 description says "filters arsenal in place" — this is imprecise. The end-state of `arsenal` after line 41 is identical whether done by reassignment or splice-based mutation, so no runtime difference exists, but the description does not match the actual operation.

**Claim: sorts by current_power desc then created_at desc**
Verified. Line 43. Correct.

**Claim: selected Set, initialRefs filtered and capped at 5**
Verified. Lines 45–47. Correct.

**Claim: escapeHTML on all user-supplied string fields**
Verified. Lines 62–68: ref.id, srcInfo?.label || ref.source_type, ref.claim_text, ref.source_title, ref.source_author. Correct.

**Claim: render() writes innerHTML, queries non-disabled cards, attaches click listeners; click toggles selection, calls render() and saveDebateLoadout fire-and-forget**
Verified. Lines 74–89. Correct.

**Verdict rationale:** "Filters in place" inaccuracy inherited from Stage 2 Agent 04. Behavior is correct; description is imprecise.

**needs_review:** Empty-array guard (line 31) runs on unfiltered arsenal. If every entry is frozen, `arsenal` after line 41 is empty, but the early-return at line 37 was already skipped. `render()` at line 93 iterates an empty array and writes a grid div with no cards. The `div.ref-loadout-empty` message is never rendered for an all-frozen arsenal.

---

## Agent 05

### renderLoadoutPicker — PASS

**Claim: async function, container / debateId / initialRefs parameters, no module-level state**
Verified. Lines 15–19. Correct.

**Claim: container.innerHTML set to loading placeholder on entry**
Verified. Line 20. Correct.

**Claim: safeRpc result destructured as {data, error}; error truthy or data falsy → empty array; throw → empty array**
Verified. Lines 23–29. Lines 25: `if (error || !data) { arsenal = []; }`, catch line 28: `arsenal = [];`. Correct.

**Claim: arsenal.length === 0 → empty-state div + early return**
Verified. Lines 31–38. Correct.

**Claim: filter removes frozen entries; sort descending by current_power then created_at via Date.parse**
Verified. Lines 41–43. The filter is implemented as `arsenal = arsenal.filter(...)` (reassignment to new array, not mutation) — Stage 2 Agent 05 did not claim in-place mutation and described this accurately. Correct.

**Claim: selected Set from initialRefs, IDs validated against arsenal, capped at 5**
Verified. Lines 45–47. Correct.

**Claim: render() reads SOURCE_TYPES and RARITY_COLORS; calls escapeHTML on ref.id, source label/type fallback, ref.claim_text, ref.source_title, ref.source_author; calls powerDisplay(ref)**
Verified. Lines 58–68. All five fields confirmed at lines 62–68. Correct.

**Claim: isSelected / isDisabled booleans drive CSS class application**
Verified. Lines 56–57, 61. `isSelected = selected.has(ref.id)`, `isDisabled = !isSelected && selected.size >= 5`. CSS classes applied at line 61. Correct.

**Claim: render() writes innerHTML, attaches click listeners to non-disabled cards; listener toggles selected and calls render() + saveDebateLoadout fire-and-forget**
Verified. Lines 74–89. Correct.

**needs_review:** The `arsenal.length === 0` check (line 31) evaluates before the frozen-entry filter (line 41). If the RPC returns a non-empty array that is entirely composed of frozen references, the early-return path is skipped, the filter at line 41 empties the array, and `render()` is called at line 93 on an empty `arsenal`. The result is a rendered header row with an empty grid — not the intended "no references forged" message. The fix requires moving the early-return check to after the filter, or adding a second check post-filter.
