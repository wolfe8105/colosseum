# Stage 3 — Verification: staking.wire.ts

Anchors: `_updateConfirmButton` (line 11), `wireStakingPanel` (line 34)

---

## Stage 2 Claim Verdicts

| Claim | Verdict |
|-------|---------|
| `_updateConfirmButton` uses `querySelector('.stake-confirm-btn')` | **WRONG** — source uses `getElementById('stake-confirm-btn')` (lines 12–13). Stage 2 doc error only; IDs are correct in source. |
| Amount parsed with `Number()` | **WRONG** — source uses `Number.parseInt(amountInput.value, 10)` (lines 16, 82). Stricter than described; not a bug. |
| Two branches in `_updateConfirmButton` (disabled vs enabled) | **WRONG** — source has THREE branches: (1) `selectedSide && amount > 0` → enabled, text `STAKE ${amount} ON SIDE ${selectedSide.toUpperCase()}`; (2) `selectedSide` but no amount → disabled, "ENTER AMOUNT"; (3) no selectedSide → disabled, "SELECT A SIDE". Stage 2 collapsed (2)+(3) and misquoted the text. |
| Button text on enabled branch is `Stake ${amount} on ${selectedSide}` | **WRONG** — actual: `STAKE ${amount} ON SIDE ${selectedSide.toUpperCase()}`. |
| No hardcoded colors in `_updateConfirmButton` | CONFIRMED |
| Hardcoded hex colors in `wireStakingPanel` (lines 45–54, 92), all TODO-commented | CONFIRMED — 9 distinct values: `#2563eb44`, `#cc000044`, `#2563eb11`, `#cc000011`, `#2563eb`, `#2563eb33`, `#cc0000`, `#cc000033`, `#16a34a` |
| Error written via `textContent` (safe from XSS) | CONFIRMED — line 99 |
| Button re-enabled on failure path | CONFIRMED — line 96 |
| `onStakePlaced` optional, called only on success | CONFIRMED — line 94 |
| `placeStake` imported from `staking.rpc.ts` | CONFIRMED — line 8 |

---

## Real Code Findings

### F1 — No try/catch around `await placeStake()` [MEDIUM]

Lines 85–104: the async confirm handler disables the button before awaiting `placeStake()` (line 88) but has no try/catch. If `placeStake()` throws (network error, malformed response, etc.), the handler exits without re-enabling the button, without showing an error, and without calling `onStakePlaced`. The button stays permanently disabled until page reload. The failure branch (lines 95–101) is only reached if `result.success === false` — it is never reached on a thrown exception.

### F2 — Hardcoded hex colors throughout `wireStakingPanel` [LOW]

Lines 45–46, 50–54, 92: 9 inline hex color values applied via `element.style.*`. All marked with `// TODO: needs CSS var token`. CLAUDE.md rule: no hardcoded hex colors except in `src/cards.ts` Canvas API. This file is not cards.ts. LOW because it's a design/token rule, not a security or logic defect; the TODO comments indicate awareness.

### F3 — `wireStakingPanel` exposes no cleanup/destroy function [LOW]

Lines 38, 62, 73, 79: four `addEventListener` calls with no corresponding removal. If the staking panel DOM is rendered and wired multiple times in a session (SPA navigation), listeners accumulate. Not a CLAUDE.md violation by the letter (that rule targets `setInterval`), but the spirit — every wireable surface should be unwireable — applies. LOW because staking is a single-use modal flow; unlikely to be wired multiple times in practice.

---

## Stage 2 Doc Errors (not code defects)

- `querySelector` vs `getElementById` — source uses IDs (lines 12–13, 64, 68, 71, 78, 84, 97, 100)
- `Number()` vs `Number.parseInt(..., 10)` — source is stricter
- Branch logic undercount and incorrect button text — source has 3 branches with all-caps text

These are Stage 2 description errors only. The source code behavior is correct in all three cases.

---

## Agent Consensus

All 5 agents confirmed F2 (hardcoded hex colors). All 5 confirmed the querySelector→getElementById doc error. F1 (no try/catch) was independently flagged by 4 of 5 agents. F3 (no destroy) was flagged by 2 of 5 agents. No agent found a HIGH-severity security defect.
