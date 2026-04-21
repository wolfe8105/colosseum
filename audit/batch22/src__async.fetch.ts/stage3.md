# Stage 3 Outputs — async.fetch.ts

## Agent 01

### fetchTakes (line 19)
**Verification**: PARTIAL
**Findings**:
- Agent 01: All claims confirmed. PASS.
- Agent 02: All claims confirmed. PASS.
- Agent 03: All claims confirmed. PASS.
- Agent 04: PARTIAL — claims `username` is "lowercased from profile or empty string" (line 49 of stage2). Source line 63 shows `username: (profiles?.['username'] as string) || ''` — there is no lowercasing applied; the value is taken verbatim from the profile, defaulting to empty string. The uppercasing only applies to the `user` field on line 64.
- Agent 05: All claims confirmed.

**Unverifiable claims**: None within this file.

### fetchPredictions (line 117)
**Verification**: PASS
**Findings**:
- All 5 agents' claims confirmed: early-return on `FEATURES.predictions`, `safeRpc('get_hot_predictions', { p_limit: 10 })` on lines 122-125, mapping logic and percentage branches confirmed at lines 127-160.
- Agents 03 and 04 correctly note that `sb` is bound but not subsequently used.

**Unverifiable claims**: None.

### fetchStandaloneQuestions (line 167)
**Verification**: PASS
**Findings**:
- All claims confirmed: no `FEATURES` flag check, `safeRpc('get_prediction_questions', { p_limit: 20, p_category: category || null })` confirmed at lines 173-179, `Array.isArray(data) && data.length > 0` check at line 181, verbatim assignment at line 182.
- Agents 03, 04 correctly note `sb` bound but unused.

**Unverifiable claims**: None.

### Cross-Agent Consensus Summary
- 14 PASS, 1 PARTIAL, 0 FAIL across 15 verdicts.
- Inter-agent disagreement: Agent 04 alone claims `username` is lowercased; all other agents correctly describe it as taken verbatim from profile. Source contradicts Agent 04.

### needs_review
None.

## Agent 02

### fetchTakes (line 19)
**Verification**: PARTIAL
**Findings**:
- Agents 01, 02, 03, 05: All claims confirmed.
- Agent 04: minor error — claims `username` is "lowercased from profile or empty string"; source line 63 reads `(profiles?.['username'] as string) || ''` — no lowercasing. The `user` field on line 64 is uppercased, but `username` is taken as-is.
- All agents correctly note that `_timeAgo` is called and `userReacted` is initialized to false.
- All agents correctly identify the field mappings (`reaction_count`→`reactions`, `challenge_count`→`challenges`, `content`→`text`, hardcoded `tokens: 0`).

**Unverifiable claims**: None

### fetchPredictions (line 117)
**Verification**: PASS
**Findings**: All five agents' claims confirmed (FEATURES gate line 118, client/placeholder check lines 119-120, `safeRpc` lines 122-125, error handling line 126, length check line 127, mapping lines 128-160, error log line 163).
- Agents 03, 04 correctly note `sb` is bound but not used after gate.

**Unverifiable claims**: None

### fetchStandaloneQuestions (line 167)
**Verification**: PASS
**Findings**: All five agents' claims confirmed; absence of FEATURES flag check correctly noted by all; client gate at lines 170-171; safeRpc call lines 173-179; error throw and catch logging confirmed; triple guard `data && Array.isArray(data) && data.length > 0` line 181; direct assignment line 182.

**Unverifiable claims**: None

### Cross-Agent Consensus Summary
- **fetchTakes**: 4 PASS, 1 PARTIAL (Agent 04 — incorrect "lowercased" claim about `username`).
- **fetchPredictions**: 5 PASS.
- **fetchStandaloneQuestions**: 5 PASS.
- Totals: 14 PASS, 1 PARTIAL, 0 FAIL.

### needs_review
- **TODO comment on `tokens` field (line 67)**: The source contains an inline comment `// TODO: token balances not available from hot_takes query`. Only Agent 02 explicitly mentioned the TODO. Minor omission, not substantive.
- **Type-cast scaffolding** (`as unknown as { from: ... }` at lines 24-39, 81-92): No agent describes these casts. Runtime no-op (TypeScript-only).

## Agent 03

### fetchTakes (line 19)
**Verification**: PARTIAL
**Findings**:
- Agent 01: All claims confirmed.
- Agent 02: All claims confirmed; `Promise<void>` return type confirmed.
- Agent 03: All claims confirmed; "empty catch block" description matches functional behavior of comment-only catch body (lines 107-109).
- Agent 04: PARTIAL — `username` is "lowercased" claim contradicted by line 63: `(profiles?.['username'] as string) || ''` (no `.toLowerCase()` call). Only `user` (line 64) is uppercased.
- Agent 05: All claims confirmed.

**Unverifiable claims**: None

### fetchPredictions (line 117)
**Verification**: PASS
**Findings**: All five agents confirmed. `safeRpc('get_hot_predictions', { p_limit: 10 })` lines 122-125, p1/p2 fallback chains lines 131-138, defaults 1200/0/50 lines 139-157, `user_pick: null` and `status` copy lines 158-159, error log line 163. Agents 03, 04 correctly identify unused `sb` after gate.

**Unverifiable claims**: None

### fetchStandaloneQuestions (line 167)
**Verification**: PASS
**Findings**: All five agents confirmed; no FEATURES check (lines 167-171), `safeRpc('get_prediction_questions', { p_limit: 20, p_category: category || null })` lines 173-179, `Array.isArray` and length check line 181, direct assignment without mapping line 182, error logging line 185.

**Unverifiable claims**: None

### Cross-Agent Consensus Summary
- 15 verdicts (3 functions × 5 agents): 14 PASS, 1 PARTIAL, 0 FAIL.
- Disagreements: Agent 04 unique on username lowercasing claim. Agents 03/04 unique on noting `sb` dead-binding (not contradicted, additive). Agent 03 says "empty catch block" while others note `non-critical` comment — both are consistent with source.

### needs_review
- **Type-erasure casts**: All five agents glossed over `as unknown as { from: ... }` scaffolding (lines 24-39, 81-92). Runtime/typing detail only.
- **`section` truthiness check** at line 47: `if (section && section !== 'all')` — Agents 01, 04 said "if `section` was provided" which conflates truthy with provided (an empty string would also skip the filter). Minor wording.

## Agent 04

### fetchTakes (line 19)
**Verification**: PARTIAL
**Findings**:
- Agents 01, 02, 03, 05: All claims confirmed (FEATURES.hotTakes gate line 20, sb/placeholder gate lines 21-22, query construction lines 24-45, section filter lines 47-49, await/throw lines 51-55, mapping lines 58-75, reactions sub-query lines 78-110, error logging line 113).
- Agent 04: Claims `username` is "lowercased from profile or empty string". Source line 63: `username: (profiles?.['username'] as string) || ''` — no lowercasing applied. Contradicted by source. The `user` field on line 64 is uppercased, not `username`. **FAIL on this single claim**.

**Unverifiable claims**: None

### fetchPredictions (line 117)
**Verification**: PASS
**Findings**: None. All claims confirmed by all five agents. Notable: Agents 03, 04 correctly identify that `sb` is bound but only used as a precondition gate (lines 119, 122).

**Unverifiable claims**: None

### fetchStandaloneQuestions (line 167)
**Verification**: PASS
**Findings**: None. All claims confirmed. Optional `category` lines 167-169, no FEATURES check (correctly noted by all), sb/placeholder gate lines 170-171, `safeRpc('get_prediction_questions', { p_limit: 20, p_category: category || null })` lines 173-179, error throw line 180, `Array.isArray` and length > 0 check line 181, assignment with cast and no transformation line 182, error log line 185.

**Unverifiable claims**: None

### Cross-Agent Consensus Summary
- 3 functions verified across 5 agents = 15 verdicts.
- 14 PASS, 1 PARTIAL (Agent 04 on fetchTakes username), 0 FAIL.
- Agent 04 alone made the "lowercased" claim. All other claims across all agents are mutually consistent and confirmed by source.

### needs_review
- **`tokens: 0` TODO comment (line 67)**: Only Agent 02 explicitly mentioned the inline `// TODO: token balances not available from hot_takes query` comment.
- **Type-cast scaffolding** lines 24-39, 81-92: All agents abstract over these as unknown casts.

## Agent 05

### fetchTakes (line 19)
**Verification**: PARTIAL
**Findings**:
- Agents 01, 02, 03, 05: All claims match source. Function signature, FEATURES gate (line 20), client gate (lines 21-22), query construction (lines 24-49), section filter (lines 47-49), error handling (lines 55, 112-114), state mutation (line 58), nested reactions query (lines 79-110), inner silent catch (line 107-109) all confirmed.
- Agent 04: FAIL on single sub-claim — claims "username (lowercased from profile or empty string)". Source line 63 reads `username: (profiles?.['username'] as string) || ''` — there is no `.toLowerCase()` call. Only the `user` field is uppercased (line 64). The username field is passed through verbatim.
- Agent 04 also has minor inaccuracy: claims "mutating each entry's `userReacted` to true when its id is in the set"—actually line 104 sets `userReacted = reactedIds.has(t.id)` which is idempotent (could be true or false).

**Unverifiable claims**: None

### fetchPredictions (line 117)
**Verification**: PASS
**Findings**: All five agents confirmed all claims (parameter-less signature, FEATURES.predictions gate line 118, client gate lines 119-120, `safeRpc('get_hot_predictions', { p_limit: 10 })` call lines 122-125, error throw/catch lines 126, 162-164, state mutation via mapping lines 128-160, p1/p2 fallback chain to `'Side A'`/`'Side B'`, elo default 1200, prediction_count branch with `Math.round((picks_a / prediction_count) * 100)` else 50, `user_pick: null`, and `status` copy). Agents 03, 04 correctly note `sb` is bound but unused after the gate.

**Unverifiable claims**: None

### fetchStandaloneQuestions (line 167)
**Verification**: PASS
**Findings**: All five agents confirmed all claims (optional `category` line 168, no FEATURES check, client gate lines 170-171, `safeRpc('get_prediction_questions', { p_limit: 20, p_category: category || null })` lines 173-179, error throw/catch lines 180, 184-186, `Array.isArray` check and length > 0 line 181, verbatim assignment to `state.standaloneQuestions` with no per-row mapping line 182). Agents 03, 04 correctly note `sb` is bound but unused after the gate.

**Unverifiable claims**: None

### Cross-Agent Consensus Summary
- 15 verdicts: 14 PASS, 1 PARTIAL (Agent 04 on fetchTakes username lowercasing), 0 FAIL.
- Agent 04 is the sole source of the "lowercased username" claim. The other four agents correctly describe the username as taken verbatim from the profile. Source line 63 contradicts Agent 04.

### needs_review
None. All substantive runtime behavior was covered by at least one agent.
