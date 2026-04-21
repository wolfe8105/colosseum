# Stage 3 Outputs — intro-music.ts

## Agent 01

### _refreshSelected (line 13)
**Verification**: PASS
**Findings**: None. Queries scoped to `sheet`, toggle logic confirmed.
**Unverifiable claims**: None

### _close (line 20)
**Verification**: PASS
**Findings**: Source at lines 21–22 confirms transition is set BEFORE opacity. The L-N1 finding from Batch 15R (transition set AFTER opacity — a bug that prevented CSS animation) is **NOT present in the current source**. The current source has the correct order. PREVIOUSLY FIXED (or never present in this version).
**Unverifiable claims**: None

### openIntroMusicPicker (line 26)
**Verification**: PARTIAL
**Findings**:
- PASS: Profile reads, tier2 logic, backdrop creation, track grid construction, file validation, save handler (try/catch with re-enable on error), backdrop dismiss — all confirmed.
- PARTIAL (L-N2 related): Lines 64–65 — `t.icon` and `t.id` are interpolated into innerHTML without escapeHTML. Agent 03 noted this is the same as L-N2 from Batch 15R. INTRO_TRACKS is a static constant in arena-sounds.ts, so no immediate XSS risk. PREVIOUSLY FILED as L-N2. Not re-reporting.
- PARTIAL (L-N3 related): Line 82 — `const pendingUrl = currentUrl`. On track button click (lines 87–89), `pendingFile = null` is cleared but `pendingUrl` is not cleared (it's `const`, so it can't be). If user had custom track (setting `pendingUrl` to a URL), then switches to standard track, `pendingUrl` retains the old value. This is PREVIOUSLY FILED as L-N3.
- PASS: `_close` call order at lines 21-22 is correct (transition before opacity). L-N1 bug is not present here.
**Unverifiable claims**: What `saveIntroMusic` does with pendingUrl when selectedId !== 'custom'.

## Agent 02

### _refreshSelected (line 13)
**Verification**: PASS
**Findings**: None.
**Unverifiable claims**: None

### _close (line 20)
**Verification**: PASS
**Findings**: L-N1 from Batch 15R (opacity-before-transition ordering bug) — source confirms transition is set FIRST (line 21), then opacity (line 22). The bug is not present in the current source. PREVIOUSLY FIXED.
**Unverifiable claims**: None

### openIntroMusicPicker (line 26)
**Verification**: PARTIAL
**Findings**:
- PASS: All core behavior claims confirmed.
- PARTIAL: `t.icon` and `t.id` unescaped in innerHTML — PREVIOUSLY FILED (L-N2). Static constant; low risk.
- PARTIAL: `pendingUrl` const not cleared on track switch — PREVIOUSLY FILED (L-N3).
- NOTE: Save button disabled at line 114 (`saveBtn.disabled = true`). On success, `_close(backdrop)` removes the entire backdrop/sheet from DOM — so the disabled button is removed. On error (catch), button is explicitly re-enabled at line 121. On success — no re-enable needed because DOM is removed. Correct pattern. No stuck-button bug.
**Unverifiable claims**: None

### needs_review
None new — all findings are previously filed.

## Agent 03

### _refreshSelected (line 13)
**Verification**: PASS
**Findings**: None.
**Unverifiable claims**: None

### _close (line 20)
**Verification**: PASS  
**Findings**: L-N1 (opacity-before-transition) — NOT present in current source. Transition at line 21, opacity at line 22. Correct order. PREVIOUSLY FIXED.
**Unverifiable claims**: None

### openIntroMusicPicker (line 26)
**Verification**: PARTIAL
**Findings**:
- PASS: All structural claims confirmed.
- PARTIAL: `t.icon`/`t.id` unescaped — L-N2 (PREVIOUSLY FILED).
- PARTIAL: `pendingUrl` not clearable on track switch — L-N3 (PREVIOUSLY FILED).
- PARTIAL: L-N4 (from Batch 15R) stated `p_custom_url: null` is sent for all non-custom saves, destructively clearing stored custom URL. This is in `intro-music-save.ts` (separate file), not in this module. Not in scope here. Note for completeness: `saveIntroMusic` is called at line 116 with `(selectedId, pendingFile, pendingUrl)`, where `pendingUrl = currentUrl` (the profile's current URL). Whether `saveIntroMusic` passes that to the RPC with null or non-null depends on the other file.
**Unverifiable claims**: What `saveIntroMusic` does with its parameters.

## Agent 04

### _refreshSelected (line 13)
**Verification**: PASS
**Findings**: None.
**Unverifiable claims**: None

### _close (line 20)
**Verification**: PASS
**Findings**: Order confirmed correct: transition first, opacity second. L-N1 bug not present.
**Unverifiable claims**: None

### openIntroMusicPicker (line 26)
**Verification**: PARTIAL
**Findings**:
- PASS: All claims confirmed.
- Previously filed items: L-N2 (t.icon/t.id unescaped) — still present but static constant, not re-filing.
- Previously filed items: L-N3 (pendingUrl not cleared on track switch) — still present, not re-filing.
- NEW NOTE: Line 87 — `selectedId = btn.dataset.id!` uses a non-null assertion on `dataset.id`. While all `.im-track-btn[data-id]` elements have `data-id` attributes set in the template literal, the `!` assertion suppresses TypeScript's null check. If a button somehow lacks the attribute, `selectedId` becomes `undefined`, which would cause `_refreshSelected` to find no match (all buttons lose `selected` class). Not a security issue; minor defensive coding gap.
**Unverifiable claims**: None

## Agent 05

### _refreshSelected (line 13)
**Verification**: PASS
**Findings**: None.
**Unverifiable claims**: None

### _close (line 20)
**Verification**: PASS
**Findings**: Transition-before-opacity order confirmed correct. L-N1 not present.
**Unverifiable claims**: None

### openIntroMusicPicker (line 26)
**Verification**: PARTIAL
**Findings**:
- PASS: Track wiring, file validation, save handler, backdrop dismiss all confirmed.
- L-N2 and L-N3: PREVIOUSLY FILED; not re-reporting.
- PASS: `uploadBtn.textContent = `🎵 ${escapeHTML(file.name.slice(0, 28))}`  at line 106 — `file.name` goes through `escapeHTML` before being set as `textContent`. However this is setting `textContent` via assignment to `textContent`, not via `innerHTML`. Setting `textContent` directly is always safe — no need for escapeHTML. The escaping here is harmless (double-safe) but unnecessary for `textContent`. No finding.
- NOTE: `URL.createObjectURL(file)` at line 108 creates an object URL that is never revoked. Memory concern but no security issue.
**Unverifiable claims**: None

---

## Cross-Agent Consensus Summary

**PASS**: `_refreshSelected` — 5/5. `_close` — 5/5.
**PARTIAL**: `openIntroMusicPicker` — 5/5 PARTIAL, all for previously-filed items.

**PREVIOUSLY FIXED (confirmed in this audit):**
- L-N1: The `_close` function's opacity-before-transition ordering bug is NOT present in the current source. `style.transition` is set at line 21 BEFORE `style.opacity` at line 22. The fix is already applied.

**PREVIOUSLY FILED items (not re-reporting):**
- L-N2: `t.icon` and `t.id` unescaped in innerHTML (Batch 15R). Still present.
- L-N3: `pendingUrl` const not cleared on standard track selection (Batch 15R). Still present.
- L-N4: Non-custom saves send `p_custom_url: null` (in intro-music-save.ts, not this file) (Batch 15R).

**No new findings.**
