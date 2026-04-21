# Stage 3 Outputs — arena-config-settings.ts

## Agent 01

### showRankedPicker (line 14)
**Verification**: PASS
**Findings**: All claims confirmed. Guard at lines 15-18 redirects guest non-placeholders to plinko. Overlay construction (20-22). innerHTML (23-54) static markup with `.arena-rank-card` data-ranked `"false"/"true"` and cancel button. Unicode escapes `\uD83C\uDF7A`, `\u2694\uFE0F`, `\u00B7` (lines 32, 43, 49). `pushArenaState('rankedPicker')` (56). Async click (59-86): `isRanked = dataset.ranked === 'true'` (62); `safeRpc<RankedCheckResult>('check_ranked_eligible')` (67); throw on error (68); ineligible path (70-76); catch logs warn (77-79) — FALLS THROUGH to happy path (fail-open, unanimous flag). `set_selectedRanked(isRanked)`, `closeRankedPicker(true)`, `showRulesetPicker()` (82-84). Backdrop/cancel optional-chain listeners (89-90).
**Unverifiable claims**: None.

### closeRankedPicker (line 93)
**Verification**: PASS
**Findings**: Lines 93-102 confirm. `getElementById('arena-rank-overlay')` (94); null no-op; `overlay.remove()` (96); forward truthy `history.replaceState({ arenaView: 'lobby' }, '')` (98); falsy `history.back()` (100). Sync, no RPC.
**Unverifiable claims**: None.

### showRulesetPicker (line 109)
**Verification**: PASS
**Findings**: Lines 109-161 confirm. No auth guard. Div className `arena-rank-overlay` id `arena-ruleset-overlay` (111-112). Static innerHTML with `data-ruleset="amplified"/"unplugged"`. Unicode escapes `\u26A1`, `\uD83C\uDFB8`, `\u2014` (123, 133, 126). `pushArenaState('rulesetPicker')` (146). Sync click at 149-156 with unchecked cast `dataset.ruleset as 'amplified' | 'unplugged'` (152); `closeRulesetPicker(true)`, `showModeSelect()`. Backdrop/cancel (159-160).
**Unverifiable claims**: None.

### closeRulesetPicker (line 163)
**Verification**: PASS
**Findings**: Lines 163-173 mirror `closeRankedPicker` on `id='arena-ruleset-overlay'`. Null no-op; remove; forward-branch replaceState vs back.
**Unverifiable claims**: None.

### Module-level
Confirmed: `selectedRanked` unread (line 5 import); `getCurrentProfile` unread (line 4 import); shared `arena-rank-overlay` class with distinct ids; no XSS surface (static innerHTML).

## Cross-Agent Consensus Summary
- PASS: 4; PARTIAL: 0; FAIL: 0.
- Unanimous flags: (1) ranked eligibility RPC catch falls-through to happy path (fail-open), (2) `selectedRanked` dead import, (3) unchecked dataset.ruleset cast, (4) history model (push/replaceState/back). No agent disagreements.

## needs_review
- Fail-open eligibility on catch (lines 77-84) — intentional leniency or latent security gap.
- Dead imports `selectedRanked` (line 5) and `getCurrentProfile` (line 4) — trivial cleanup.
- Unchecked cast line 152 — brittle but safe given DOM-template control.

---

## Agent 02

### showRankedPicker (line 14)
**Verification**: PASS
**Findings**: Entry guard (15-18). Overlay build (20-54). Pushes history (55-56). Async click (59-86) with eligibility RPC, ineligible `confirm()` + profile-depth redirect, catch logs and falls through. Happy path at 82-84. Backdrop/cancel no-arg close.
**Unverifiable claims**: None.

### closeRankedPicker (line 93)
**Verification**: PASS
**Findings**: Confirmed at lines 93-102.
**Unverifiable claims**: None.

### showRulesetPicker (line 109)
**Verification**: PASS
**Findings**: Confirmed at lines 109-161. No auth guard. Unchecked cast at 152.
**Unverifiable claims**: None.

### closeRulesetPicker (line 163)
**Verification**: PASS
**Findings**: Confirmed at lines 163-173.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary
- PASS 4, PARTIAL 0, FAIL 0.
- Unanimous: fail-open RPC catch, dead imports, unchecked cast, history model, no XSS.

## needs_review
- Eligibility fail-open (77-84).
- Dead imports (4, 5).
- Consider disabling ranked card during pending RPC.

---

## Agent 03

### showRankedPicker (line 14)
**Verification**: PASS
**Findings**: None. All claims confirmed against source lines 14-91.
**Unverifiable claims**: None.

### closeRankedPicker (line 93)
**Verification**: PASS
**Findings**: None. Lines 93-102 match.
**Unverifiable claims**: Agent 04's "triggers popstate in arena-core" — out-of-file inference, self-flagged.

### showRulesetPicker (line 109)
**Verification**: PASS
**Findings**: None. Lines 109-161 match.
**Unverifiable claims**: None.

### closeRulesetPicker (line 163)
**Verification**: PASS
**Findings**: None. Lines 163-173 match.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary
PASS 4, PARTIAL 0, FAIL 0. No substantive disagreements.

## needs_review
- Unanimous: eligibility fail-open (77-84), `selectedRanked` dead import, unchecked dataset.ruleset cast.
- Agent 02 uniquely caught `getCurrentProfile` dead import (line 4).

---

## Agent 04

### showRankedPicker (line 14)
**Verification**: PASS
**Findings**: Lines 14-91 confirm all claims. Guard, overlay build, static innerHTML, push history, async click with eligibility RPC, catch logs + falls through (fail-open), happy-path advance, backdrop/cancel listeners.
**Unverifiable claims**: None.

### closeRankedPicker (line 93)
**Verification**: PASS
**Findings**: Lines 93-102 confirm.
**Unverifiable claims**: Popstate handler in arena-core (not in this file).

### showRulesetPicker (line 109)
**Verification**: PASS
**Findings**: Lines 109-161 confirm. No auth guard. Shared class, distinct id. Unchecked cast at 152.
**Unverifiable claims**: None.

### closeRulesetPicker (line 163)
**Verification**: PASS
**Findings**: Lines 163-173 confirm.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary
PASS 4, PARTIAL 0, FAIL 0.
Unique Agent 04 observation: `confirm()` runs after `closeRankedPicker()` already removed the overlay — user sees dialog on a backdrop-less page. Harmless but worth noting.

## needs_review
- Fail-open eligibility (77-84).
- Dead imports `selectedRanked`, `getCurrentProfile`.
- Unchecked `dataset.ruleset` cast (152).
- `confirm()` after overlay removal — UX edge.

---

## Agent 05

### showRankedPicker (line 14)
**Verification**: PASS
**Findings**: Lines 14-91 confirm. Agent 05 noted overlay-shared class with distinct ids and `safeRpc` 401-retry wrapper per project convention. One minor presentation issue: Agent 05 mentioned `\u26A1`, `\uD83C\uDFB8`, `\u2014` in the ranked-picker prose but those glyphs belong to `showRulesetPicker` (lines 123, 133, 126). Conflation, not a factual claim error — ranked picker unicode at 32, 43, 49 is correct.
**Unverifiable claims**: None.

### closeRankedPicker (line 93)
**Verification**: PASS
**Findings**: Lines 93-102 confirm.
**Unverifiable claims**: None.

### showRulesetPicker (line 109)
**Verification**: PASS
**Findings**: Lines 109-161 confirm.
**Unverifiable claims**: None.

### closeRulesetPicker (line 163)
**Verification**: PASS
**Findings**: Lines 163-173 confirm.
**Unverifiable claims**: None.

## Cross-Agent Consensus Summary
| Verdict | Count |
|---------|-------|
| PASS | 4 |
| PARTIAL | 0 |
| FAIL | 0 |

Unanimous observations: fail-open eligibility, dead imports, unchecked ruleset cast, history model, no XSS surface. Minor Agent 05 conflation of unicode glyphs between pickers — not a factual error, just stylistic drift.

## needs_review
- **Eligibility fail-open** (lines 77-84): unanimous flag — requires human review to confirm graceful-degrade intent vs bug. If intentional, code comment warranted.
- **Dead imports** (lines 4, 5): trivial cleanup.
- **Unchecked cast** (152): brittle, currently safe via template control.
- **Re-entrancy on ranked card**: no click-debouncing during pending RPC — double-tap would stack a second ruleset overlay.
- **`confirm()` after overlay removal**: user sees a system dialog with no arena context behind it.
- **`arena-types-results.ts` import path**: not listed among `arena-types*` modules in CLAUDE.md — verify downstream.
