# Stage 2 Runtime Walk — src/arena/arena-feed-ui.ts

Anchors: 11 | Agents: 5 | All anchors covered by all agents

---

## Agent 01

### updateTimerDisplay (line 31)
- `document.getElementById('feed-timer')` → null-guarded via `if (!el) return`
- `el.textContent = formatTimer(Math.max(0, timeLeft))` — clamps negative timeLeft to 0, then formats

### updateTurnLabel (line 36)
- `document.getElementById('feed-turn-label')` → null-guarded
- `el.textContent = text` — sets label to passed string; silent no-op if element absent

### updateRoundLabel (line 41)
- `document.getElementById('feed-round-label')` → null-guarded
- `el.textContent = \`ROUND ${round}/${FEED_TOTAL_ROUNDS}\`` — template literal, no escaping (numeric values only)

### setDebaterInputEnabled (line 46)
- Acquires 3 elements: `feed-debater-input`, `feed-debater-send-btn`, `feed-debater-finish-btn`
- `input.disabled = !enabled`; `input.placeholder = enabled ? 'Your argument…' : 'Wait for your turn…'`
- `input.classList.toggle('feed-input-frozen', !enabled)`
- `sendBtn.disabled = !enabled || !(input && input.value.trim().length > 0)` — compound; send disabled if not enabled OR if input empty
- `finishBtn.disabled = !enabled`

### updateBudgetDisplay (line 61)
- Loops `pts` 1 through 5 (using `FEED_SCORE_BUDGET` keys)
- `limit = FEED_SCORE_BUDGET[pts] ?? 0`; `used = scoreUsed[pts] ?? 0`; `remaining = Math.max(0, limit - used)`
- `document.querySelector('.feed-score-badge[data-badge="${pts}"]')` → badge.textContent = String(remaining)
- `document.querySelector('.feed-score-btn[data-pts="${pts}"]')` → btn.disabled = remaining <= 0

### resetBudget (line 76)
- `set_budgetRound(newRound)` — updates budgetRound state via setter
- Direct mutation: `for (const pts of Object.keys(scoreUsed)) scoreUsed[pts] = 0` — no setter, mutates object in place
- Calls `updateBudgetDisplay()` to refresh UI

### updateSentimentGauge (line 84)
- `total = sentimentA + sentimentB`
- If `total <= 0`: `pctA = 50, pctB = 50`; else `pctA = Math.round((sentimentA / total) * 100)`, `pctB = 100 - pctA`
- `document.getElementById('feed-sentiment-a').style.width = \`${pctA}%\``
- `document.getElementById('feed-sentiment-b').style.width = \`${pctB}%\``

### applySentimentUpdate (line 94)
- `set_sentimentA(sentimentA + pendingSentimentA)`
- `set_sentimentB(sentimentB + pendingSentimentB)`
- `set_pendingSentimentA(0)`, `set_pendingSentimentB(0)`
- Calls `updateSentimentGauge()`

### updateCiteButtonState (line 102)
- Early return if `!btn`
- `isMyTurn = (phase === 'debate' && currentDebate?.current_turn === currentDebate?.my_side)`
- `uncited = loadedRefs.filter(r => !r.cited)`
- `btn.disabled = !isMyTurn || uncited.length === 0`
- Conditional textContent: only updates when `uncited.length === 0 && loadedRefs.length > 0` → sets `'📄 ALL CITED'`

### updateChallengeButtonState (line 117)
- Early return if `!btn`
- `isMyTurn = (phase === 'debate' && currentDebate?.current_turn === currentDebate?.my_side)`
- `challengeable = opponentCitedRefs.filter(r => !r.already_challenged)`
- `btn.disabled = !isMyTurn || challengeable.length === 0 || feedPaused || challengesRemaining <= 0`
- UNCONDITIONALLY: `btn.textContent = \`⚔️ CHALLENGE (${challengesRemaining})\`` — always overwrites, unlike cite button

### showDisconnectBanner (line 130)
- `document.getElementById('feed-disconnect-banner')?.remove()` — removes existing banner if present
- `const banner = document.createElement('div')`; `banner.id = 'feed-disconnect-banner'`; `banner.textContent = message` — XSS-safe
- `const room = document.querySelector('.feed-room')`; if `room`: `room.prepend(banner)`

---

## Agent 02

### updateTimerDisplay (line 31)
- Gets `feed-timer` element; early-return if null
- `el.textContent = formatTimer(Math.max(0, timeLeft))` — reads `timeLeft` from state; clamps negative to 0

### updateTurnLabel (line 36)
- Gets `feed-turn-label`; early-return if null
- `el.textContent = text` — pure pass-through, no sanitization (caller controls content)

### updateRoundLabel (line 41)
- Gets `feed-round-label`; early-return if null
- `el.textContent = \`ROUND ${round}/${FEED_TOTAL_ROUNDS}\`` — numeric interpolation only

### setDebaterInputEnabled (line 46)
- 3-element acquisition; all null-guarded separately
- Input: `disabled`, `placeholder` toggled, `classList.toggle('feed-input-frozen', !enabled)`
- SendBtn: `disabled = !enabled || !(input && input.value.trim().length > 0)` — sticky disabled when input empty even if enabled=true
- FinishBtn: `disabled = !enabled`

### updateBudgetDisplay (line 61)
- Iterates pts 1–5; for each:
  - Computes `remaining = Math.max(0, (FEED_SCORE_BUDGET[pts] ?? 0) - (scoreUsed[pts] ?? 0))`
  - Badge: `textContent = String(remaining)` — numeric, safe
  - Button: `disabled = remaining <= 0`

### resetBudget (line 76)
- `set_budgetRound(newRound)`
- `scoreUsed[pts] = 0` for all pts — direct object mutation (no set_scoreUsed setter exists)
- `updateBudgetDisplay()` call

### updateSentimentGauge (line 84)
- Reads `sentimentA`, `sentimentB`; computes `total`
- Guard: `total <= 0` → 50/50 split
- Style width assignment; no null guard on elements (assumes DOM ready)

### applySentimentUpdate (line 94)
- Flush pending to accumulators via setters
- Zero out pending via setters
- Call `updateSentimentGauge()`

### updateCiteButtonState (line 102)
- Compound `isMyTurn` check; `uncited` filter
- `btn.disabled` set based on turn + uncited count
- textContent only updated on the "all cited" condition (preserves default text otherwise)

### updateChallengeButtonState (line 117)
- 4-part disabled condition: `!isMyTurn || challengeable.length === 0 || feedPaused || challengesRemaining <= 0`
- textContent always set to `\`⚔️ CHALLENGE (${challengesRemaining})\`` — always reflects current count even when disabled

### showDisconnectBanner (line 130)
- Idempotent remove; createElement; `textContent` assignment (safe); room.prepend

---

## Agent 03

### updateTimerDisplay (line 31)
- Reads `timeLeft` from `arena-feed-state.ts`; passes `Math.max(0, timeLeft)` to `formatTimer`
- Assigns result to `el.textContent`; null guard present

### updateTurnLabel (line 36)
- Direct textContent assignment of caller-supplied `text`
- No escaping; caller is internal (not user input)

### updateRoundLabel (line 41)
- Template: `\`ROUND ${round}/${FEED_TOTAL_ROUNDS}\`` — both numeric, textContent (safe)

### setDebaterInputEnabled (line 46)
- Note on sendBtn logic: `!enabled || !(input && input.value.trim().length > 0)` means the send button is disabled both when turn is inactive AND when the input field is empty, even when it's the user's turn. This is intentional (prevent empty submission) but means button state can be stale after programmatic state changes.

### updateBudgetDisplay (line 61)
- Loops 5 point values; null-guards badge and btn elements individually
- `remaining` floored at 0 by `Math.max`

### resetBudget (line 76)
- Direct mutation of `scoreUsed` object (no setter) — only valid because `scoreUsed` is a module-level object reference
- `set_budgetRound` is the only setter used; `budgetRound` import itself is unused (dead import)

### updateSentimentGauge (line 84)
- Positive total guard prevents divide-by-zero
- No guard if `sentimentA` or `sentimentB` individually negative (unusual but not clamped)

### applySentimentUpdate (line 94)
- Four state mutations then one render call; atomic from UI perspective

### updateCiteButtonState (line 102)
- `loadedRefs.length > 0` condition on textContent means if arsenal is empty, text stays at default (not 'ALL CITED') even if `uncited.length === 0`

### updateChallengeButtonState (line 117)
- Unlike cite button, no conditional on textContent: always writes count string
- Count uses `challengesRemaining` from `arena-state.ts` (not local state)

### showDisconnectBanner (line 130)
- `?. remove()` on existing: safe if no prior banner
- `textContent` assignment prevents XSS in banner message

---

## Agent 04

### updateTimerDisplay (line 31)
- DOM read → clamp → format → assign. No side effects beyond textContent.

### updateTurnLabel (line 36)
- Minimal: one DOM write. No state read.

### updateRoundLabel (line 41)
- Reads `round` (state) and `FEED_TOTAL_ROUNDS` (constant). Template literal textContent.

### setDebaterInputEnabled (line 46)
- Most complex function in file. Three-element parallel update.
- sendBtn condition is a compound boolean: evaluates input existence before `.value.trim()` to avoid null-deref.

### updateBudgetDisplay (line 61)
- Does NOT read `budgetRound` despite it being imported — confirms dead import.
- Loop runs for pts values defined in `FEED_SCORE_BUDGET` keys.

### resetBudget (line 76)
- Mutation pattern: `scoreUsed` is a plain object (not reactive); direct key assignment is the only way to mutate it.
- Calling `updateBudgetDisplay()` immediately after ensures UI consistency.

### updateSentimentGauge (line 84)
- Positive-total guard; pctB computed as `100 - pctA` (not independently rounded) — avoids 101% sum.

### applySentimentUpdate (line 94)
- No guard for negative pending values; if pending is negative this subtracts from sentiment scores.

### updateCiteButtonState (line 102)
- textContent conditional is subtle: `uncited.length === 0 && loadedRefs.length > 0` — all refs cited AND at least one exists. Handles empty-arsenal edge case.

### updateChallengeButtonState (line 117)
- Always writes textContent with current `challengesRemaining`. Keeps count visible even when button is disabled.

### showDisconnectBanner (line 130)
- `?.remove()` is optional chaining — handles first-time call with no existing banner. Safe pattern.

---

## Agent 05

### updateTimerDisplay (line 31)
- Flow: get element → guard null → clamp timeLeft → format → assign textContent
- `formatTimer` is imported from `arena-core.utils.ts`; its behavior is external to this file

### updateTurnLabel (line 36)
- Flow: get element → guard null → assign text param to textContent
- Caller is always internal arena code (not user-supplied strings)

### updateRoundLabel (line 41)
- Flow: get element → guard null → assign `ROUND N/M` textContent
- Both `round` and `FEED_TOTAL_ROUNDS` are numeric; no XSS concern

### setDebaterInputEnabled (line 46)
- Flow: get 3 elements (all individually null-guarded) → set disabled/placeholder/class on input → compute sendBtn compound disabled → set finishBtn disabled
- send button "stickiness": if user clears input while it's their turn, send button goes disabled (re-evaluated on each call)

### updateBudgetDisplay (line 61)
- Flow: for each pt value → compute remaining → update badge text → update button disabled state
- Badge text uses `String()` cast (numeric, not user data)

### resetBudget (line 76)
- Flow: set budgetRound → zero all scoreUsed keys → refresh display
- `scoreUsed` mutation is direct on object reference — no reactivity system involved

### updateSentimentGauge (line 84)
- Flow: compute total → guard zero-total → compute pctA/pctB → set width styles
- `pctB = 100 - pctA` avoids floating-point rounding issues that would occur from two independent Math.round calls

### applySentimentUpdate (line 94)
- Flow: flush pending into running totals → zero pending → trigger gauge update
- All via state setters; no direct mutation

### updateCiteButtonState (line 102)
- Flow: guard null → compute isMyTurn → filter uncited → set disabled → conditionally update textContent
- Empty-arsenal guard on textContent: won't show 'ALL CITED' if no refs were ever loaded

### updateChallengeButtonState (line 117)
- Flow: guard null → compute isMyTurn → filter challengeable → set disabled (4 conditions) → unconditionally set textContent with count
- Difference from cite: text always written; cite text only written on state change

### showDisconnectBanner (line 130)
- Flow: remove existing → create new → set textContent (safe) → prepend to room
- Idempotent: calling multiple times replaces prior banner
