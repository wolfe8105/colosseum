# Stage 3 — Verification: groups.auditions.ts

## Verification Results (11 agents)

### openAuditionModal (line 47) — PARTIAL

**Consensus:** The Stage 2 claim is accurate but incomplete on one point. `_populateAuditionFields()` is called **only when `needsDebate` is true** (i.e., rule !== 'allowed_by_leader'). Stage 2 said "calls `_populateAuditionFields()` synchronously before the error/button/modal steps" — this is correct for the truthy branch, but did not specify it is conditional. All other claims (module-level writes, DOM IDs, null-guard asymmetry, two separate reads of `#audition-submit-btn`) verified accurate.

**Finding:** Stage 2 omitted the conditionality of the `_populateAuditionFields()` call. Not a factual error, but an omission that could mislead a reader into thinking it is always called.

---

### closeAuditionModal (line 75) — PASS

All 11 agents confirmed: reads `#audition-modal`, removes class `'open'`, no null guard, no state writes, no RPC calls, returns void.

---

### submitAuditionRequest (line 79) — PASS

All 11 agents confirmed all claims: async, immediate button disable + 'REQUESTING…' text, error hide, four DOM reads (no null guards, correct defaults), `safeRpc('request_audition', ...)`, success path (closeModal → toast → loadPendingAuditions with `currentAuditionGroupId!, null`), catch path (error textContent, show error, re-enable button).

---

### loadPendingAuditions (line 109) — PASS

All 11 agents confirmed: null guard on `#detail-auditions` is the only guard; loading placeholder on innerHTML; `safeRpc('get_pending_auditions', ...)`, JSON.parse if string else `data ?? []`, sets innerHTML to `_renderAuditionsList` result, error path sets innerHTML to error string.

---

### handleAuditionAction (line 128) — PASS

All 11 agents confirmed: rpcMap lookup, early return on falsy rpc, `safeRpc(rpc, { p_audition_id })`, JSON.parse if string on result, accept+debate_id branch uses `window.location.href` (not a navigation helper), non-accept path uses module-level `currentGroupId!` and `callerRole` (not `currentAuditionGroupId`), error path calls `showToast(e.message || 'Action failed')`.

Note: Agent 10's Stage 2 claim that navigation used "the navigate function" was verified as incorrect by all 11 Stage 3 agents — source uses `window.location.href` directly.

---

### _populateAuditionFields (line 171) — PASS

All 11 agents confirmed: reads `currentAuditionConfig` as `cfg`, 4 field groups with lock/unlock pattern, row elements null-guarded with `if (rowEl)`, input/select elements not null-guarded, unlocked defaults (topic='', category='', ruleset='amplified', rounds='4'), no RPC calls, returns void.

---

### _renderAuditionsList (line 227) — PARTIAL

**Finding (Agent 01, confirmed by source read):** Stage 2 said "if isLeaderOrMember: denyBtn always built." This overstates the deny button's universality. The actual logic:

1. `denyBtn` is built unconditionally within the `if (isLeaderOrMember)` block.
2. It is **used** in three conditional branches:
   - `rule === 'allowed_by_leader' && myRole === 'leader'` → approve + denyBtn
   - `status === 'pending' && rule !== 'allowed_by_leader'` → accept + (denyBtn if leader)
   - `else` → `myRole === 'leader' ? denyBtn : ''`

In the `else` branch, a non-leader member (isLeaderOrMember=true, myRole not 'leader') receives **empty string** — no actions at all. Stage 2's "denyBtn always" framing was inaccurate for this case.

All other claims confirmed: pure string builder, no DOM touches, empty-state with clipboard emoji, escapeHTML on name/rule/topic, statusMap labels, 'Your audition' when !isLeaderOrMember, withdraw button for non-member.

---

## Cross-Agent Consensus Summary

**7 functions verified. 5 PASS, 2 PARTIAL.**

| Function | Result | Finding |
|---|---|---|
| openAuditionModal | PARTIAL | `_populateAuditionFields()` is conditional on `needsDebate`; Stage 2 omitted this |
| closeAuditionModal | PASS | — |
| submitAuditionRequest | PASS | — |
| loadPendingAuditions | PASS | — |
| handleAuditionAction | PASS | Stage 2 Agent 10 error on navigation (window.location.href) confirmed corrected |
| _populateAuditionFields | PASS | — |
| _renderAuditionsList | PARTIAL | "denyBtn always" overstated; non-leader member in else branch gets no actions |

**No FAIL results. Stage 2 is structurally accurate with two minor omissions/overgeneralizations documented above.**
