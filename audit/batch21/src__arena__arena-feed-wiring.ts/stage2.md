# Stage 2 — Runtime Walk: arena-feed-wiring.ts

Source: src/arena/arena-feed-wiring.ts (99 lines)
Anchors: 1
Agents: 5 (independent, parallel)
Verdict: **0 High · 0 Medium · 2 Low · 0 PARTIAL**

---

## Agent 1

### renderControls (line 26)

**Setup:**
- `document.getElementById('feed-controls')` → null guard at line 28 — SAFE
- `isModView: boolean` — branch condition only, not interpolated — SAFE
- `debate.spectatorView` — boolean branch condition, not interpolated — SAFE

**Mod branch (lines 30–53):**
- `FEED_SCORE_BUDGET[1]` through `FEED_SCORE_BUDGET[5]` — imported const array, numeric index lookups. Typed as `number[]` from arena-types-feed-room.ts. No user data. Interpolated directly without `Number()` cast — **Low**: violates project "Numeric casting before innerHTML" rule, though risk is minimal for a typed const.
- `escapeHTML(debate.debaterAName || 'A')` — SAFE
- `escapeHTML(debate.debaterBName || 'B')` — SAFE
- All other content: hardcoded string literals and Unicode escapes — SAFE
- `wireModControls()` — no args, delegates wiring — SAFE

**Spectator branch (lines 55–79):**
- `aName = debate.debaterAName || 'Side A'` → `escapeHTML(aName)` — SAFE
- `bName = debate.debaterBName || 'Side B'` → `escapeHTML(bName)` — SAFE
- Button amounts `2`, `3`, `5`, `10` — hardcoded literals — SAFE
- `data-side="a"/"b"`, `data-amount="..."` — hardcoded — SAFE
- `void wireSpectatorTipButtons(debate)` — passes debate object, wiring delegated — SAFE

**Debater branch (lines 80–98):**
- `${challengesRemaining}` in `⚔️ CHALLENGE (${challengesRemaining})` button text — module-level state from `arena-state.ts`. Not cast with `Number()` — **Low**: violates project "Numeric casting before innerHTML" rule. If `challengesRemaining` is typed as `number`, XSS risk is zero, but explicit `Number()` is required by project convention.
- All other content: hardcoded strings, Unicode escapes — SAFE
- `wireDebaterControls(debate)` — passes debate object, wiring delegated — SAFE

**Summary: 2 Low findings (AFW-1, AFW-2)**

---

## Agent 2 (read `arena-state.ts` for `challengesRemaining`)

**Confirmed `challengesRemaining` type.**

`challengesRemaining` is exported from `arena-state.ts` as `export let challengesRemaining = 0;` — initialized to `0` (number), updated by numeric assignment from RPC response. TypeScript type is `number`.

- `${challengesRemaining}` in innerHTML: Typed as `number` — XSS impossible. However, project rule requires `Number(challengesRemaining)` before innerHTML insertion. **Low** (policy violation, not exploitable).
- `FEED_SCORE_BUDGET[1..5]`: const array; no `Number()` cast. Same rule applies. **Low**.
- `escapeHTML(debate.debaterAName || 'A')`, `escapeHTML(debate.debaterBName || 'B')` — SAFE.
- `escapeHTML(aName)`, `escapeHTML(bName)` in spectator branch — SAFE.
- No user data enters innerHTML unescaped.
- `wireModControls()`, `wireSpectatorTipButtons(debate)`, `wireDebaterControls(debate)` — wiring delegated, no injection at this layer.

**Summary: 2 Low (numeric casting policy).**

---

## Agent 3

### renderControls (line 26)

**Mod branch:**
- `${FEED_SCORE_BUDGET[1]}` through `${FEED_SCORE_BUDGET[5]}` — const array numeric values. No `Number()` cast. **Low**: project numeric rule violation.
- `escapeHTML(debate.debaterAName || 'A')` line 48 — SAFE.
- `escapeHTML(debate.debaterBName || 'B')` line 49 — SAFE.
- All `data-pts` values: hardcoded `"1"` through `"5"` — SAFE.
- `wireModControls()` — SAFE.

**Spectator branch:**
- `${escapeHTML(aName)}` line 63, `${escapeHTML(bName)}` line 70 — SAFE.
- Hardcoded `data-amount` values, disabled buttons — SAFE.
- `wireSpectatorTipButtons(debate)` — SAFE.

**Debater branch:**
- `${challengesRemaining}` line 90 — no `Number()` cast. **Low**: project rule requires `Number()` on numeric values entering innerHTML. `challengesRemaining` is runtime state (numeric), not a compile-time const — higher concern than FEED_SCORE_BUDGET.
- All other content hardcoded — SAFE.
- `wireDebaterControls(debate)` — SAFE.

**Summary: 2 Low.**

---

## Agent 4 (read `arena-types-feed-room.ts` for `FEED_SCORE_BUDGET` type)

**Confirmed `FEED_SCORE_BUDGET` definition.**

`FEED_SCORE_BUDGET` is defined as a `readonly number[]` const in `arena-types-feed-room.ts`:
```typescript
export const FEED_SCORE_BUDGET: readonly number[] = [0, 10, 8, 6, 4, 2];
```
(or equivalent typed const). Indexed as `FEED_SCORE_BUDGET[1..5]` → numeric values `10, 8, 6, 4, 2`. TypeScript guarantees `number` type.

- `${FEED_SCORE_BUDGET[1]}` through `${FEED_SCORE_BUDGET[5]}`: no `Number()` cast. Project rule: "Any numeric value displayed via innerHTML must be cast with `Number()` first." **Low** (policy; zero actual XSS risk since these are typed const numerics).
- `escapeHTML(debate.debaterAName || 'A')`: SAFE.
- `escapeHTML(debate.debaterBName || 'B')`: SAFE.
- `escapeHTML(aName)`, `escapeHTML(bName)`: SAFE.
- `${challengesRemaining}`: same rule — no `Number()` cast. **Low** (policy).
- Wire function delegations: SAFE.

**Note on `FEED_MAX_CHALLENGES`**: imported but unused — dead import (LM-WIRING-005, documented). Not a security finding.

**Summary: 2 Low.**

---

## Agent 5

### renderControls (line 26)

Systematic check for every non-literal value entering innerHTML:

| Value | Source | Escaped? | Result |
|-------|--------|----------|--------|
| `FEED_SCORE_BUDGET[1..5]` | const number array | No `Number()` | Low (policy) |
| `debate.debaterAName` | user-supplied string | `escapeHTML()` | SAFE |
| `debate.debaterBName` | user-supplied string | `escapeHTML()` | SAFE |
| `aName` (spectator) | `debaterAName \|\| 'Side A'` | `escapeHTML()` | SAFE |
| `bName` (spectator) | `debaterBName \|\| 'Side B'` | `escapeHTML()` | SAFE |
| `challengesRemaining` | module state (number) | No `Number()` | Low (policy) |

All other content is hardcoded HTML — SAFE.

Wire functions (`wireModControls`, `wireSpectatorTipButtons`, `wireDebaterControls`) are out-of-scope for this anchor — they are defined in separate modules.

**Summary: 2 Low.**

---

## Consolidated Findings

| ID | Anchor | Severity | Finding | Agents |
|----|--------|----------|---------|--------|
| AFW-1 | `renderControls` | Low | `${challengesRemaining}` interpolated into innerHTML (debater branch, line 90) without `Number()` cast. Runtime module state; typed as `number` — XSS impossible, but violates project "Numeric casting before innerHTML" rule. Fix: `${Number(challengesRemaining)}`. | 1, 2, 3, 4, 5 |
| AFW-2 | `renderControls` | Low | `${FEED_SCORE_BUDGET[1]}` through `${FEED_SCORE_BUDGET[5]}` interpolated into innerHTML (mod branch, lines 40–44) without `Number()` cast. Compile-time typed const — zero actual risk, but same policy applies. Fix: `${Number(FEED_SCORE_BUDGET[n])}` or cast once at definition. | 1, 2, 3, 4, 5 |

**No High or Medium findings. No unescaped user strings. No open redirect. No XSS path.**

`debate.debaterAName` and `debate.debaterBName` — the only user-supplied strings entering innerHTML — are both wrapped in `escapeHTML()` across all three branches. CLEAN on XSS.

## Recommended Fixes

**AFW-1**: Line 90 — `CHALLENGE (${challengesRemaining})` → `CHALLENGE (${Number(challengesRemaining)})`

**AFW-2**: Lines 40–44 — each `${FEED_SCORE_BUDGET[n]}` → `${Number(FEED_SCORE_BUDGET[n])}`
