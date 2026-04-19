# Stage 2 — Runtime Walk: staking.wire.ts

Anchors: `_updateConfirmButton` (line 11), `wireStakingPanel` (line 34)

---

## `_updateConfirmButton(selectedSide)` — line 11

**Signature:** `function _updateConfirmButton(selectedSide: string | null)`
**Exported:** No (private helper)

**Runtime walk:**
1. Queries DOM: `document.querySelector('.stake-confirm-btn')` → `btn`; `document.querySelector('.stake-amount-input')` → `amountInput`
2. Early return if `!btn`
3. Reads `amountInput?.value` → `amount`
4. **Branch A** — `!selectedSide || !amount`: sets `btn.disabled = true`, `btn.style.opacity = '0.5'`, `btn.textContent = 'Select side & amount'`
5. **Branch B** — `selectedSide && amount`: sets `btn.disabled = false`, `btn.style.opacity = '1'`, `btn.textContent = \`Stake ${amount} on ${selectedSide}\``

**Hardcoded values:** No hardcoded hex colors in this function.

**Security:** No user content written to innerHTML; textContent only. Clean.

---

## `wireStakingPanel(debateId, onStakePlaced?)` — line 34

**Signature:** `export function wireStakingPanel(debateId: string, onStakePlaced?: (result: StakeResult) => void)`
**Exported:** Yes

**Runtime walk:**
1. Declares closure variable `let selectedSide: string | null = null`
2. **`.stake-side-btn` click listeners** — `querySelectorAll('.stake-side-btn')`, iterates with `forEach`:
   - Reads `btn.dataset.side` → `side`
   - Sets `selectedSide = side`
   - Resets all `.stake-side-btn` inline styles to transparent backgrounds (hardcoded hex: `#2563eb11` for 'for' side, `#cc000011` for 'against' side)
   - Applies highlight to clicked button (hardcoded hex: `#2563eb44` for 'for', `#cc000044` for 'against', `#2563eb` border for 'for', `#cc0000` border for 'against')
   - Calls `_updateConfirmButton(selectedSide)`
3. **`.stake-quick-btn` click listeners** — `querySelectorAll('.stake-quick-btn')`, iterates:
   - Reads `btn.dataset.amount`
   - Writes to `amountInput.value = btn.dataset.amount`
   - Calls `_updateConfirmButton(selectedSide)`
4. **Amount input `input` event** — `querySelector('.stake-amount-input')`, addEventListener `'input'`:
   - Calls `_updateConfirmButton(selectedSide)`
5. **Confirm button `click` handler** — `querySelector('.stake-confirm-btn')`, async handler:
   - Early returns if `!selectedSide || !amountInput?.value`
   - Disables button during request
   - Parses `Number(amountInput.value)` → `amount`
   - Awaits `placeStake(debateId, selectedSide, amount)`
   - **On success (`result.success`)**: sets `confirmBtn.textContent = 'Stake placed!'`, `confirmBtn.style.background = '#16a34a'` (hardcoded hex), hides error element, calls `onStakePlaced?.(result)`
   - **On failure**: re-enables button, shows error message via `errorEl.textContent = result.error || 'Failed to place stake'`

**Hardcoded hex colors (lines ~45–54):** `#2563eb44`, `#cc000044`, `#2563eb11`, `#cc000011`, `#2563eb`, `#2563eb33`, `#cc0000`, `#cc000033`, `#16a34a` — all marked with `// TODO: needs CSS var token` comments. CLAUDE.md violation.

**Number() cast present:** `Number(amountInput.value)` — correct.

**Error written via textContent:** `errorEl.textContent = result.error` — safe, no innerHTML.

**onStakePlaced callback:** Optional. Called only on success path, after DOM updates.

**safeRpc:** `placeStake()` is imported from `staking.rpc.ts` — that module is responsible for safeRpc wrapping; not visible in this file.

---

## Agent consensus summary

All 5 agents agreed on the core runtime paths. Minor wording variations only. No contradictions on logic branches, DOM queries, or the hardcoded hex color violation.
