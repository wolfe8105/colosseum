# Stage 3 Outputs — src/tiers.ts

## Agent 01

### getTier (line 73)
**Verification**: PASS
**Findings**:
- All 5 agents correctly describe the `typeof questionsAnswered === 'number'` coercion to `qa` (line 74). PASS
- All 5 agents correctly describe iteration over `TIER_THRESHOLDS` in descending order (100, 75, 50, 25, 10, 0) (lines 46-53, 75). PASS
- All 5 agents correctly describe the spread-and-augment return with `stakeCap: t.maxStake` and `questionsAnswered: qa` (lines 77-81). PASS
- All 5 agents correctly quote the fallback object `{ tier: 0, name: 'Unranked', icon: '🔒', maxStake: 0, stakeCap: 0, slots: 0, min: 0, questionsAnswered: qa }` (line 85). PASS
- All 5 agents describe the function as synchronous with no writes or external calls. PASS (line 73-86: only internal arithmetic and object construction)

**Unverifiable claims**: None

### canStake (line 89)
**Verification**: PASS
**Findings**:
- All 5 agents correctly describe this as `getTier(questionsAnswered).maxStake > 0` (line 90). PASS
- Agents 1, 3, and 5 note specific outcomes (false for tier 0, true for tier 1+), consistent with `TIER_THRESHOLDS` values (lines 47-52). PASS
- All 5 agents correctly note it is synchronous with no side effects. PASS

**Unverifiable claims**: None

### getPowerUpSlots (line 94)
**Verification**: PASS
**Findings**:
- All 5 agents correctly describe this as returning `.slots` from `getTier(questionsAnswered)` (line 95). PASS
- Agents 1, 3, and 5 correctly enumerate slot values (0 for tiers 0-1, 1 for tier 2, 2 for tier 3, 3 for tier 4, 4 for tier 5), matching `TIER_THRESHOLDS` (lines 47-52). PASS
- All 5 agents correctly note it is synchronous with no side effects. PASS

**Unverifiable claims**: None

### getNextTier (line 102)
**Verification**: PASS
**Findings**:
- All 5 agents correctly describe `qa` coercion via `typeof === 'number'` (line 103). PASS
- All 5 agents correctly describe the call to `getTier(qa)` → `current` (line 104). PASS
- All 5 agents correctly describe first early return `if (current.tier >= 5) return null` (line 105). PASS
- All 5 agents correctly describe `TIER_THRESHOLDS.find(t => t.tier === (current.tier + 1 as TierLevel))` (line 107). PASS
- All 5 agents correctly describe second early return `if (!next) return null` (line 108). PASS
- All 5 agents correctly describe the returned object with `tier`, `name`, `icon` from `next`; `questionsNeeded: next.min - qa`; `totalRequired: next.min`; `minQuestions: next.min` (lines 110-117). PASS
- Agents 1, 3, 4, and 5 note that `questionsNeeded` can be negative/zero without clamping. PASS — source shows no `Math.max(0, …)` guard (line 114).
- All 5 agents correctly note it is synchronous with no external state writes. PASS

**Unverifiable claims**: None

### renderTierBadge (line 125)
**Verification**: PASS
**Findings**:
- All 5 agents correctly describe `getTier(questionsAnswered)` → `t` (line 126). PASS
- All 5 agents correctly describe `TIER_COLORS[t.tier] ?? '#6b7280'` (line 127). PASS
- All 5 agents correctly describe the concatenation: `<span class="tier-badge" style="color:` + color + `; font-weight:600;">` + escaped name + `</span>` (lines 128-129). PASS
- Agents 1, 4 explicitly note that only `t.name` is escaped, not the color — confirmed by source (line 128, color is interpolated raw). PASS
- All 5 agents correctly note it imports and calls `escapeHTML` from `./config.ts` (line 10, line 129). PASS
- All 5 agents correctly note it is synchronous, returns a string, does not insert into the DOM. PASS

**Unverifiable claims**: None (the claim about `escapeHTML` being imported from `./config.ts` is verifiable from the file itself at line 10; the behavior of `escapeHTML` itself is unverifiable from this file alone but no agent made specific claims about its internal behavior beyond "sanitize")

### renderTierProgress (line 133)
**Verification**: PASS
**Findings**:
- All 5 agents correctly describe the calls to `getTier(questionsAnswered)` → `current` and `getNextTier(questionsAnswered)` → `next` (lines 134-135). PASS
- All 5 agents correctly describe the `if (!next)` early return with the static string (lines 136-138). PASS
- All 5 agents correctly describe `TIER_THRESHOLDS.find(t => t.tier === current.tier)` → `prevEntry` with `prevMin = prevEntry?.min ?? 0` (lines 140-141). PASS
- All 5 agents correctly describe `filled = questionsAnswered - prevMin`, `band = next.totalRequired - prevMin`, `pct = band > 0 ? Math.min(100, Math.round((filled / band) * 100)) : 0` (lines 142-144). PASS
- Agents 1, 3, 4 note that `filled` uses the raw `questionsAnswered`, not a normalized `qa`, leading to possible `NaN` with non-numeric input. Verified: line 142 uses `questionsAnswered` directly (not coerced). PASS
- All 5 agents correctly describe the concatenated HTML structure with escaped `String(questionsAnswered)`, `String(next.totalRequired)`, `String(next.questionsNeeded)`, and `next.name`, plus raw `pct` in the style attribute (lines 146-155). PASS
- All 5 agents correctly note that `pct` is not passed through `escapeHTML`. PASS (line 153)
- All 5 agents correctly note it is synchronous, returns a string, no DOM access. PASS

**Unverifiable claims**: None

---

### Cross-Agent Consensus Summary

**Functions verified**: 6 (getTier, canStake, getPowerUpSlots, getNextTier, renderTierBadge, renderTierProgress)

**Verdicts across all functions**: PASS 6/6, PARTIAL 0/6, FAIL 0/6

**Cross-agent disagreements**: None of substance. Minor phrasing differences only. All five agents are in substantive agreement with each other and with the source.

### needs_review
None.

## Agent 02

### getTier (line 73)
**Verification**: PASS
**Findings**:
- All 5 agents correctly describe: single parameter `questionsAnswered`, typeof check defaulting to `0` (line 74), iteration of `TIER_THRESHOLDS` in declared descending order, first-match return with spread + `stakeCap: t.maxStake` + `questionsAnswered: qa` (lines 75-82), hardcoded fallback object with `{ tier: 0, name: 'Unranked', icon: '🔒', maxStake: 0, stakeCap: 0, slots: 0, min: 0, questionsAnswered: qa }` (line 85). Confirmed.
- All agents correctly state: synchronous, no module-level writes, no I/O.

**Unverifiable claims**: None

### canStake (line 89)
**Verification**: PASS
**Findings**:
- All agents correctly state the single-line body `return getTier(questionsAnswered).maxStake > 0` (line 90). Confirmed.
- Agents 3 and 5's specific claim that `canStake` returns `false` for `qa < 10` — PASS, since tier 0 has `maxStake: 0` and tier 1 (Spectator+, min: 10) has `maxStake: 5`.

**Unverifiable claims**: None

### getPowerUpSlots (line 94)
**Verification**: PASS
**Findings**:
- All agents correctly state: calls `getTier(questionsAnswered)` and returns `.slots` (line 95). Confirmed.
- Enumerated values per tier (0,0,1,2,3,4) match `TIER_THRESHOLDS` slot values at lines 47-52. Confirmed.

**Unverifiable claims**: None

### getNextTier (line 102)
**Verification**: PASS
**Findings**:
- All agents correctly describe: typeof coercion (line 103), `getTier(qa)` call (line 104), `current.tier >= 5` early return to `null` (line 105), `TIER_THRESHOLDS.find(t => t.tier === (current.tier + 1 as TierLevel))` (line 107), `!next` → `null` (line 108), returned shape with `tier`, `name`, `icon` from `next`, `questionsNeeded: next.min - qa`, `totalRequired: next.min`, `minQuestions: next.min` (lines 110-117). Confirmed.
- Agent 1's "questionsNeeded can be negative" observation — PASS: line 114 is a raw subtraction with no clamp.

**Unverifiable claims**: None

### renderTierBadge (line 125)
**Verification**: PASS
**Findings**:
- All agents correctly describe: calls `getTier`, reads `TIER_COLORS[t.tier] ?? '#6b7280'` (line 127), concatenation with `escapeHTML(t.name)` wrapped in a `<span class="tier-badge" style="color:...; font-weight:600;">` (lines 128-129). Confirmed.
- Agents 1 and 4's observation that color is not escaped but only hex strings are used — PASS: `TIER_COLORS` (lines 56-63) and fallback `'#6b7280'` are only hex literals.

**Unverifiable claims**: None

### renderTierProgress (line 133)
**Verification**: PASS
**Findings**:
- All agents correctly describe: calls `getTier(questionsAnswered)` → `current` (line 134), `getNextTier(questionsAnswered)` → `next` (line 135), early return literal `'<div class="tier-progress-complete">Legend — Max Tier</div>'` when `!next` (lines 136-138). Confirmed.
- `TIER_THRESHOLDS.find(t => t.tier === current.tier)` → `prevEntry` (line 140), `prevMin = prevEntry?.min ?? 0` (line 141). Confirmed.
- `filled = questionsAnswered - prevMin` (line 142) — raw `questionsAnswered`, not `qa`. Agents 1, 3, 4 explicitly note this non-normalization difference. PASS.
- `band = next.totalRequired - prevMin` (line 143), `pct = band > 0 ? Math.min(100, Math.round((filled / band) * 100)) : 0` (line 144). Confirmed.
- Output HTML structure with `.tier-progress` wrapper, `.tier-progress-label` containing four `escapeHTML` calls on `String(questionsAnswered)`, `String(next.totalRequired)`, `String(next.questionsNeeded)`, and `next.name` (lines 146-155). Confirmed.
- All agents correctly note `pct` is interpolated raw without `escapeHTML`. Line 153 confirms.

**Unverifiable claims**: None

---

### Cross-Agent Consensus Summary

- Total functions verified: 6
- PASS: 6/6; PARTIAL: 0; FAIL: 0.
- Disagreements between agents: None.

### needs_review
None.

## Agent 03

### getTier (line 73)
**Verification**: PASS
**Findings**:
- All 5 agents correctly describe the type check `typeof questionsAnswered === 'number'` with `0` fallback — confirmed line 74.
- All agents correctly describe iteration over `TIER_THRESHOLDS` in descending min order — confirmed lines 47-52.
- All agents correctly describe the spread-return pattern adding `stakeCap: t.maxStake` and `questionsAnswered: qa` — confirmed lines 77-81.
- All agents correctly describe the fallback object at line 85 with exact fields.

**Unverifiable claims**: None

### canStake (line 89)
**Verification**: PASS
**Findings**:
- All agents correctly describe call to `getTier(questionsAnswered)` and return of `.maxStake > 0` — confirmed line 90.
- Agents 01, 03, 05 correctly enumerate the boolean outcomes.

**Unverifiable claims**: None

### getPowerUpSlots (line 94)
**Verification**: PASS
**Findings**:
- All agents correctly describe the call to `getTier(questionsAnswered)` and return of `.slots` — confirmed line 95.
- Agents 01, 03, 05 correctly enumerate returned values by tier.

**Unverifiable claims**: None

### getNextTier (line 102)
**Verification**: PASS
**Findings**:
- All agents correctly describe the `qa` normalization and `getTier(qa)` call — confirmed lines 103-104.
- All agents correctly describe early returns at lines 105 and 108.
- All agents correctly describe the returned object shape — lines 110-117.
- Agents 01, 03, 04, 05 correctly note the lack of clamping on `questionsNeeded`.

**Unverifiable claims**: None

### renderTierBadge (line 125)
**Verification**: PASS
**Findings**:
- All agents correctly describe the `getTier(questionsAnswered)` call and lookup `TIER_COLORS[t.tier] ?? '#6b7280'` — confirmed lines 126-127.
- All agents correctly describe the concatenated span structure — confirmed lines 128-129.
- Agents 01, 04 correctly observe that only `t.name` is escaped; the color value is not.

**Unverifiable claims**: None

### renderTierProgress (line 133)
**Verification**: PASS
**Findings**:
- All agents correctly describe `getTier` → `current` and `getNextTier` → `next` — confirmed lines 134-135.
- All agents correctly describe the `if (!next)` early return — confirmed lines 136-138.
- All agents correctly describe `prevEntry` lookup and `prevMin = prevEntry?.min ?? 0` — confirmed lines 140-141.
- All agents correctly describe `filled`, `band`, `pct` computation — lines 142-144.
- Agents 01, 03, 04 correctly flag that `filled` uses raw `questionsAnswered` (not normalized).
- All agents correctly describe the four `escapeHTML` calls and the raw `pct` injection — lines 146-155.

**Unverifiable claims**: None

---

### Cross-Agent Consensus Summary

PASS: 6; PARTIAL: 0; FAIL: 0. No contradictions between agents.

### needs_review
None.

## Agent 04

### getTier (line 73)
**Verification**: PASS
**Findings**: All five agents' claims are confirmed by the source:
- Parameter coercion via `typeof questionsAnswered === 'number'` check with `0` fallback — matches line 74.
- Iterates `TIER_THRESHOLDS` in declared/descending `min` order — matches lines 46-53, 75.
- First-match returns spread of `t` plus `stakeCap: t.maxStake` and `questionsAnswered: qa` — matches lines 77-81.
- Fallback object literal — matches line 85.
- Synchronous, no external state writes, no function calls — confirmed.

**Unverifiable claims**: None

### canStake (line 89)
**Verification**: PASS
**Findings**: All five agents' claims confirmed:
- Calls `getTier(questionsAnswered)` and returns `.maxStake > 0` — matches line 90.

**Unverifiable claims**: None

### getPowerUpSlots (line 94)
**Verification**: PASS
**Findings**: All five agents' claims confirmed:
- Calls `getTier(questionsAnswered)` and returns `.slots` — matches line 95.

**Unverifiable claims**: None

### getNextTier (line 102)
**Verification**: PASS
**Findings**: All five agents' claims confirmed:
- `qa` coercion mirrors `getTier`'s — matches line 103.
- Calls `getTier(qa)` → `current` — matches line 104.
- Early return `null` when `current.tier >= 5` — matches line 105.
- `TIER_THRESHOLDS.find(t => t.tier === (current.tier + 1 as TierLevel))` — matches line 107.
- Second `null` return when `find` yields undefined — matches line 108.
- Returns object with `tier`, `name`, `icon`, `questionsNeeded: next.min - qa`, `totalRequired: next.min`, `minQuestions: next.min` — matches lines 110-117.

**Unverifiable claims**: None

### renderTierBadge (line 125)
**Verification**: PASS
**Findings**: All five agents' claims confirmed:
- Calls `getTier(questionsAnswered)` → `t` — matches line 126.
- `TIER_COLORS[t.tier] ?? '#6b7280'` — matches line 127.
- Concatenated string `<span …>` + `escapeHTML(t.name)` + `</span>` — matches lines 128-129.

**Unverifiable claims**: None

### renderTierProgress (line 133)
**Verification**: PASS
**Findings**: All five agents' claims confirmed:
- Calls `getTier(questionsAnswered)` → `current` and `getNextTier(questionsAnswered)` → `next` — matches lines 134-135.
- Early return `'<div class="tier-progress-complete">Legend — Max Tier</div>'` when `next` is null — matches lines 136-138.
- `TIER_THRESHOLDS.find(t => t.tier === current.tier)` → `prevEntry`, with `prevEntry?.min ?? 0` → `prevMin` — matches lines 140-141.
- `filled = questionsAnswered - prevMin` uses raw parameter, not `qa` — matches line 142.
- `pct = band > 0 ? Math.min(100, Math.round((filled / band) * 100)) : 0` — matches line 144.
- HTML structure with four `escapeHTML` calls and raw `pct` in style — matches lines 146-155.

**Unverifiable claims**: None

---

## Cross-Agent Consensus Summary

- Total functions verified: 6
- PASS: 6
- PARTIAL: 0
- FAIL: 0

## needs_review

None.

## Agent 05

### getTier (line 73)
**Verification**: PASS
**Findings**:
- Agent 01: Claim that qa coercion uses `typeof === 'number'` with fallback `0` — PASS (line 74).
- Agent 01: Claim it iterates TIER_THRESHOLDS in declared order — PASS (lines 46-53, 75).
- Agent 01: Claim the return spreads `t` and adds `stakeCap: t.maxStake` and `questionsAnswered: qa` — PASS (lines 77-81).
- Agent 01: Claim the fallback object is `{ tier: 0, name: 'Unranked', icon: '🔒', maxStake: 0, stakeCap: 0, slots: 0, min: 0, questionsAnswered: qa }` — PASS (line 85).
- Agents 02–05 make the same claims and all PASS against lines 73-86.

**Unverifiable claims**: None

### canStake (line 89)
**Verification**: PASS
**Findings**:
- All agents: Calls `getTier(questionsAnswered)` and returns `maxStake > 0` — PASS (line 90).
- Agents 01, 03, 05: Claim `true` for tier 1+ and `false` for tier 0 — PASS (thresholds on lines 47-52 confirm).

**Unverifiable claims**: None

### getPowerUpSlots (line 94)
**Verification**: PASS
**Findings**:
- All agents: Calls `getTier(questionsAnswered)` and returns `.slots` — PASS (line 95).
- Agents 01, 03, 05: Slot values 0, 0, 1, 2, 3, 4 for tiers 0-5 — PASS (lines 47-52).

**Unverifiable claims**: None

### getNextTier (line 102)
**Verification**: PASS
**Findings**:
- All agents: qa coercion via `typeof === 'number'` fallback 0 — PASS (line 103).
- All agents: Calls `getTier(qa)` to get `current` — PASS (line 104).
- All agents: First early return `null` if `current.tier >= 5` — PASS (line 105).
- All agents: Uses `TIER_THRESHOLDS.find(t => t.tier === (current.tier + 1 as TierLevel))` — PASS (line 107).
- All agents: Second early return `null` if not found — PASS (line 108).
- All agents: Returns `{tier, name, icon, questionsNeeded: next.min - qa, totalRequired: next.min, minQuestions: next.min}` — PASS (lines 110-117).
- Agent 01/03/04/05: Note `questionsNeeded` isn't floored at zero — PASS (line 114 shows raw subtraction).

**Unverifiable claims**: None

### renderTierBadge (line 125)
**Verification**: PASS
**Findings**:
- All agents: Calls `getTier(questionsAnswered)` into `t` — PASS (line 126).
- All agents: Reads `TIER_COLORS[t.tier]` with `?? '#6b7280'` fallback — PASS (line 127).
- All agents: Returns concatenated span string with `escapeHTML(t.name)` — PASS (lines 128-129).
- Agents 01, 04: Color value is not escaped, but originates from constant table — PASS.

**Unverifiable claims**: None

### renderTierProgress (line 133)
**Verification**: PASS
**Findings**:
- All agents: Calls `getTier` and `getNextTier` — PASS (lines 134-135).
- All agents: If `next` is falsy/null, returns `'<div class="tier-progress-complete">Legend — Max Tier</div>'` — PASS (lines 136-138).
- All agents: `prevMin = prevEntry?.min ?? 0` — PASS (lines 140-141).
- All agents: `filled = questionsAnswered - prevMin` (raw parameter) — PASS (line 142).
- All agents: `pct = band > 0 ? Math.min(100, Math.round((filled / band) * 100)) : 0` — PASS (line 144).
- All agents: Four `escapeHTML` calls plus raw `pct` in style — PASS (lines 146-155).

**Unverifiable claims**: None

### Cross-Agent Consensus Summary

PASS: 6 functions × 5 agents = 30 function-level assessments, all PASS. No cross-agent disagreements.

### needs_review

None.
