# Stage 2 — Runtime Walk: groups.auditions.ts

## Agent 01

### openAuditionModal (line 47)
Receives a `GroupDetail` object `g`. Writes `currentAuditionGroupId = g.id` and `currentAuditionConfig = g.audition_config ?? {}` to module-level variables. Reads `currentAuditionConfig.rule`, falling back to `'allowed_by_leader'`. Looks up label in `RULE_LABELS`.

DOM touches: `#audition-rule-desc` (sets textContent to ruleLabel, null-guarded); `#audition-debate-params` (sets display 'block'/'none' based on needsDebate, null-guarded); `#audition-error` (sets display='none', no null guard); `#audition-submit-btn` (sets disabled=false and textContent='REQUEST AUDITION', no null guard, two separate reads); `#audition-modal` (adds class 'open', no null guard).

If `needsDebate` is true (rule !== 'allowed_by_leader'), calls `_populateAuditionFields()` synchronously before the error/button/modal steps. Returns void. No error handling — throws uncaught on null dereference if unguarded elements are absent.

### closeAuditionModal (line 75)
Reads `#audition-modal` and removes class `'open'`. No null guard. Returns void. No state writes, no RPC calls.

### submitAuditionRequest (line 79)
Async. Immediately disables `#audition-submit-btn` and sets its text to 'REQUESTING…'. Hides `#audition-error`.

Reads four DOM inputs (no null guards): `#audition-topic` (HTMLInputElement, trimmed value or null), `#audition-category` (HTMLSelectElement, value or null), `#audition-ruleset` (HTMLSelectElement, value or 'amplified'), `#audition-rounds` (HTMLSelectElement, Number(value) or 4).

Calls `safeRpc('request_audition', { p_group_id: currentAuditionGroupId, p_topic, p_category, p_ruleset, p_total_rounds })`.

On success: calls `closeAuditionModal()`, `showToast('Audition requested! The group will be in touch.')`, then awaits `loadPendingAuditions(currentAuditionGroupId!, null)`.

On error (catch): sets `#audition-error` textContent to error message or 'Could not request audition', shows it, re-enables the button. Returns Promise<void>.

### loadPendingAuditions (line 109)
Async. Accepts `groupId: string` and `myRole: string | null`. Reads `#detail-auditions` — early returns if absent (only null guard in this function). Sets innerHTML to loading placeholder. Calls `safeRpc('get_pending_auditions', { p_group_id: groupId })`. Parses data (JSON.parse if string, else data ?? []). Sets `container.innerHTML = _renderAuditionsList(auditions, myRole)`. On error: sets innerHTML to error string. Returns Promise<void>.

### handleAuditionAction (line 128)
Async. Accepts `auditionId: string` and `action: 'accept'|'approve'|'deny'|'withdraw'`. Resolves RPC name via local `rpcMap` (accept→'accept_audition', approve→'approve_audition', deny→'deny_audition', withdraw→'withdraw_audition'). Returns early if rpc is falsy.

Calls `safeRpc(rpc, { p_audition_id: auditionId })`. Parses result (JSON.parse if string). If action==='accept' and result?.debate_id is truthy: calls `showToast('Audition accepted — debate created!')`, sets `window.location.href = 'index.html?screen=arena&lobby=${result.debate_id}'`, returns.

Otherwise: calls showToast with message from local `messages` map (approve→'Candidate admitted to the group', deny→'Audition denied', withdraw→'Audition withdrawn', fallback 'Done'). Then awaits `loadPendingAuditions(currentGroupId!, callerRole)`. Note: uses module-level `currentGroupId` and `callerRole`, not `currentAuditionGroupId`.

On error: calls `showToast(e.message || 'Action failed')`. Returns Promise<void>.

### _populateAuditionFields (line 171)
Reads `currentAuditionConfig` (as `cfg`). Processes 4 field groups, each following the same lock/unlock pattern:

- **Topic**: `#audition-topic` (input) + `#audition-topic-row`. If `cfg.locked_topic`: set value, disabled=true, row.dataset.locked='true'. Else: value='', disabled=false, delete row.dataset.locked.
- **Category**: `#audition-category` (select) + `#audition-category-row`. If `cfg.locked_category`: set value, disabled. Else: value=''.
- **Ruleset**: `#audition-ruleset` (select) + `#audition-ruleset-row`. If `cfg.locked_ruleset`: set value, disabled. Else: value='amplified'.
- **Rounds**: `#audition-rounds` (select) + `#audition-rounds-row`. If `cfg.locked_total_rounds`: value=String(...), disabled. Else: value='4'.

Row elements are null-guarded; input/select elements are not. Returns void. No RPC calls.

### _renderAuditionsList (line 227)
Private. Accepts `auditions: PendingAudition[]` and `myRole: string | null`. Returns HTML string. Touches no DOM.

If auditions is falsy or empty, returns static empty-state HTML with clipboard emoji.

Otherwise: `isLeaderOrMember = myRole !== null`. Maps each audition `a` to HTML:
- `name = escapeHTML(a.candidate_display_name || a.candidate_username || 'Unknown')`
- `rule = escapeHTML(RULE_LABELS[a.rule] ?? a.rule)`
- `topic = a.topic ? escapeHTML'd div : ''`
- `statusLabel` from statusMap (pending→'PENDING', claimed→'DEBATE SCHEDULED', in_progress→'IN PROGRESS') else `a.status.toUpperCase()`
- action buttons: if isLeaderOrMember: denyBtn always built; rule==='allowed_by_leader' && myRole==='leader': approve+deny; status==='pending' && rule!=='allowed_by_leader': accept + (deny if leader); else: deny if leader else ''. If !isLeaderOrMember: withdraw button.
- returns audition-row div with candidate name (or 'Your audition' if candidate), status, rule, topic, actions.

Returns joined string.

---

## Agents 02–11

(Agents 02 through 11 produced substantially identical descriptions. Consensus summary follows.)

---

## Cross-Agent Consensus Summary

All 11 agents agree on all 7 functions with no substantive contradictions, with one exception:

**handleAuditionAction — Agent 10**: Claimed navigation on accept uses "the navigate function" rather than `window.location.href`. The source uses `window.location.href = \`index.html?screen=arena&lobby=${result.debate_id}\`` directly. All other 10 agents correctly describe `window.location.href`. Agent 10's claim is incorrect.

**Confirmed observations across multiple agents:**
- `openAuditionModal`: `#audition-rule-desc` and `#audition-debate-params` are null-guarded; `#audition-error`, `#audition-submit-btn` (accessed twice), and `#audition-modal` are not null-guarded.
- `loadPendingAuditions`: the only null guard in the function is on `#detail-auditions`; early returns if absent.
- `handleAuditionAction`: uses module-level `currentGroupId` and `callerRole` (not `currentAuditionGroupId`) when refreshing the list after non-accept actions.
- `_populateAuditionFields`: all 4 `*-row` elements are null-guarded; all 4 input/select elements are not.
- `_renderAuditionsList`: pure string-builder, no DOM writes. Candidate name shows 'Your audition' when `isLeaderOrMember` is false.
