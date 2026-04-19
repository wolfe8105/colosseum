# Stage 3 Verification — home.invite-html.ts

Anchor list: rewardLabel (9), rewardTypeLabel (19), rewardRowHtml (23), activityRowHtml (41)
Verifiers: 5 agents

---

## Consensus on Stage 2 claims

### rewardLabel
All 5 agents: PASS. Sequential if-returns for 1/5/25; fallthrough = 'Mythic Power-Up'. Milestone-5 duplicate confirmed as noted-but-not-a-bug.

### rewardTypeLabel
All 5 agents: PASS. Returns string|undefined; LM-INVITE-001 accurately documented. In-file caller (line 30) uses `?? 'Reward'` before escapeHTML — safe.

### rewardRowHtml
4/5 agents: PASS on general escaping.
1 agent (Agent 01): claimed `date` was bare at line 32 — **AGENT ERROR**. Source line 32 reads `${escapeHTML(date)}`. Date IS escaped. Discard this false positive.
Agent 04: PARTIAL FAIL on `r.milestone` — see Finding 1 below.
Agents 02, 03, 05: confirmed `btnLabel`/`btnDisabled`/class conditional are all static-literal-only — no injection path.

### activityRowHtml
All 5 agents: PASS on username, status, msg construction. All confirmed `name` is pre-escaped and the `msg` values do not introduce double-encoding risk. `when` (line 51) assessed as low theoretical risk, not real XSS vector.

---

## Findings

### INVITE-001 (pre-existing, documented)
Already documented in source as LM-INVITE-001: `rewardTypeLabel` returns `undefined` for unrecognized `reward_type`. External callers doing `.toUpperCase()` will throw. Not a new finding — in-file usage is guarded. Referenced in AUDIT-FINDINGS.md as pre-existing.

### Finding 1 — LOW: Missing `Number()` cast on `r.milestone` (line 31)
**File:** src/pages/home.invite-html.ts  
**Line:** 31  
**Function:** rewardRowHtml  
**Agents raising:** 02, 04 (of 5)

`r.milestone` is interpolated bare into a template literal that becomes innerHTML:
```typescript
<span class="invite-reward-milestone">Milestone: ${r.milestone}</span>
```
CLAUDE.md rule: "Any numeric value displayed via innerHTML must be cast with `Number()` first."
TypeScript types the field as `number`, but the CLAUDE.md rule is a defensive coding requirement independent of declared types — if the Supabase RPC returns a non-numeric value (e.g., null from a nullable column, or a string from a type-widened response), TypeScript won't catch it at runtime and the raw value renders unescaped.

Fix: `Milestone: ${Number(r.milestone)}`

### Finding 2 — LOW: `when` unescaped in `activityRowHtml` (line 51)
**File:** src/pages/home.invite-html.ts  
**Line:** 51  
**Function:** activityRowHtml  
**Agents raising:** 02, 05 (of 5)

`when = new Date(a.event_at).toLocaleDateString()` is interpolated without `escapeHTML()`. Not a real XSS vector (Date API output is locale-controlled, not user-controlled). However: if `a.event_at` is null, undefined, or malformed, `new Date(null)` → valid epoch date, `new Date(undefined)` → `'Invalid Date'` string, which silently renders in the UI with no fallback.

Fix (defensive): `escapeHTML(when)` for consistency, or guard: `a.event_at ? new Date(a.event_at).toLocaleDateString() : '—'`

### Finding 3 — LOW: Label divergence between `rewardLabel` and `rewardTypeLabel`
**File:** src/pages/home.invite-html.ts  
**Lines:** 9–14, 19–21  
**Agents raising:** 04, 05 (of 5)

`rewardLabel` and `rewardTypeLabel` are parallel label-producing functions for the same reward domain with no shared constants. Examples:
- `rewardLabel(1)` → `'Legendary Power-Up'` vs `rewardTypeLabel('legendary_powerup')` → `'🟡 Legendary Power-Up'`
- `rewardLabel(5)` → `'Mythic Power-Up'` vs `rewardTypeLabel('mythic_powerup')` → `'🟣 Mythic Power-Up'`

If either is updated independently, user-facing labels silently diverge. Maintenance hazard, not a runtime bug.

---

## Summary

| Finding | Severity | Line | Function |
|---------|----------|------|----------|
| `r.milestone` missing `Number()` cast | LOW | 31 | rewardRowHtml |
| `when` unescaped + no Invalid Date guard | LOW | 51 | activityRowHtml |
| `rewardLabel`/`rewardTypeLabel` label divergence | LOW | 9–21 | rewardLabel, rewardTypeLabel |

No HIGH or MEDIUM findings. No Stage 2 claim falsified (Agent 01 false positive discarded after source verification).
