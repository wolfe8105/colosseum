# Stage 2 — Runtime Walk: src/arena/arena-feed-ui.ts

All 11 agents unanimous on all major points.

---

## 1. updateTimerDisplay (line 31)

**Reads:** `timeLeft` (arena-feed-state)
**DOM:** Queries `#feed-timer`; if found: `textContent = formatTimer(Math.max(0, timeLeft))`
**Writes:** None.
**Async:** None. Fully synchronous.

---

## 2. updateTurnLabel(text) (line 36)

**Reads:** None from state. Parameter: `text: string`.
**DOM:** Queries `#feed-turn-label`; if found: `textContent = text`
**Writes:** None.
**Async:** None. Fully synchronous.

---

## 3. updateRoundLabel (line 41)

**Reads:** `round` (arena-feed-state), `FEED_TOTAL_ROUNDS` (arena-types)
**DOM:** Queries `#feed-round-label`; if found: `textContent = \`ROUND ${round}/${FEED_TOTAL_ROUNDS}\``
**Writes:** None.
**Async:** None. Fully synchronous.

---

## 4. setDebaterInputEnabled(enabled) (line 46)

**Reads:** None from state. Parameter: `enabled: boolean`.
**DOM queries:** `#feed-debater-input` (textarea), `#feed-debater-send-btn` (button), `#feed-finish-turn` (button)
**DOM mutations:**
- input: `disabled = !enabled`, `placeholder = enabled ? 'Type your argument...' : 'Waiting for opponent...'`, `classList.toggle('feed-input-frozen', !enabled)`
- sendBtn: `disabled = !enabled || !(input && input.value.trim().length > 0)` — composite condition; disabled if not enabled OR if input is empty
- finishBtn: `disabled = !enabled` — simple toggle only
**Writes:** None.
**Async:** None.
**Notable:** Send button disable condition is stricter than finishBtn — requires both `enabled` AND non-empty input value. Each DOM element is independently optional-chained (null-checked via `if`).

---

## 5. updateBudgetDisplay (line 61)

**Reads:** `scoreUsed` (arena-feed-state, object), `FEED_SCORE_BUDGET` (arena-types, object)
**DOM:** For `pts` in 1..5: queries `.feed-score-badge[data-badge="${pts}"]` → sets `textContent = String(remaining)`; queries `.feed-score-btn[data-pts="${pts}"]` → sets `disabled = remaining <= 0`
**Writes:** None.
**Async:** None.
**Notable:** Uses `??` fallback to 0 for both `FEED_SCORE_BUDGET[pts]` and `scoreUsed[pts]` — handles missing keys gracefully.

---

## 6. resetBudget(newRound) (line 76)

**Reads:** None from state at call time.
**Writes:** `set_budgetRound(newRound)`, direct mutation `scoreUsed[pts] = 0` for pts 1..5
**Calls:** `updateBudgetDisplay()`
**Async:** None.
**Notable:** `scoreUsed` is mutated directly (object property assignment), not through a setter. This is the intended pattern — `scoreUsed` is a mutable object in arena-feed-state, not a primitive with a setter.

---

## 7. setSpectatorVotingEnabled(_enabled) (line 84)

**Reads:** None.
**Writes:** None.
**DOM:** None.
**Async:** None.
**Body:** Intentional no-op. The `_enabled` parameter is unused (underscore prefix). Comment states: "F-58: Tip strip is always active during live debates. The tier gate (Unranked check in cast_sentiment_tip) is the only lock — not the round timer."

---

## 8. updateSentimentGauge (line 91)

**Reads:** `sentimentA`, `sentimentB` (arena-feed-state)
**DOM:** Queries `#feed-sentiment-a`, `#feed-sentiment-b`; sets `style.width` on each
**Computation:** `total = sentimentA + sentimentB`; if `total > 0`: `pctA = Math.round(sentimentA/total*100)`, `pctB = 100 - pctA`; else: `pctA = pctB = 50`
**Writes:** None.
**Async:** None.

---

## 9. applySentimentUpdate (line 101)

**Reads:** `sentimentA`, `sentimentB`, `pendingSentimentA`, `pendingSentimentB` (arena-feed-state)
**Writes:** `set_sentimentA(sentimentA + pendingSentimentA)`, `set_sentimentB(sentimentB + pendingSentimentB)`, `set_pendingSentimentA(0)`, `set_pendingSentimentB(0)`
**Calls:** `updateSentimentGauge()` after writing
**Async:** None.
**Notable:** Reads current values at call time, then adds pending increments. No DOM access directly — delegates entirely to `updateSentimentGauge`.

---

## 10. updateCiteButtonState (line 109)

**Reads:** `currentDebate` (arena-state), `phase` (arena-feed-state), `loadedRefs` (arena-state), `feedPaused` (arena-state)
**DOM:** Queries `#feed-cite-btn`; returns early if not found
**Computation:**
- `isMyTurn = debate && !debate.modView && ((phase==='speaker_a' && role==='a') || (phase==='speaker_b' && role==='b'))`
- `uncited = loadedRefs.filter((r) => !r.cited)`
**DOM mutations:**
- `btn.disabled = !isMyTurn || uncited.length === 0 || feedPaused`
- If `uncited.length === 0 && loadedRefs.length > 0`: `btn.textContent = '📄 ALL CITED'`
**Writes:** None.
**Async:** None.
**Notable:** Button text is only updated when all refs are cited AND loadedRefs is non-empty. If `loadedRefs.length === 0` (refs not yet loaded), button text is not changed — it retains whatever text was in the DOM. This means a previously-set "📄 ALL CITED" label would not be cleared if loadedRefs is reset to `[]`.

---

## 11. updateChallengeButtonState (line 124)

**Reads:** `currentDebate` (arena-state), `phase` (arena-feed-state), `opponentCitedRefs` (arena-state), `challengesRemaining` (arena-state), `feedPaused` (arena-state)
**DOM:** Queries `#feed-challenge-btn`; returns early if not found
**Computation:**
- `isMyTurn`: same composite check as `updateCiteButtonState`
- `challengeable = opponentCitedRefs.filter((r) => !r.already_challenged)`
**DOM mutations:**
- `btn.disabled = !isMyTurn || challengeable.length === 0 || challengesRemaining <= 0 || feedPaused`
- `btn.textContent = \`⚔️ CHALLENGE (${challengesRemaining})\`` — ALWAYS updated, even when disabled
**Writes:** None.
**Async:** None.
**Notable:** Unlike `updateCiteButtonState`, the text update here is unconditional — every call refreshes the count display regardless of enabled/disabled state.

---

## Cross-cutting findings

1. **All 11 functions are pure DOM helpers**: No timers set, no RPC calls, no async operations. File header comment is accurate.

2. **`scoreUsed` direct mutation in `resetBudget`**: `scoreUsed[pts] = 0` mutates the object directly rather than using a setter. Consistent with `scoreUsed` being a mutable object in arena-feed-state by design.

3. **`setSpectatorVotingEnabled` is a permanent no-op**: Any caller expecting this function to gate spectator tip/vote access is silently ignored. The effective gate is in the DB RPC (`cast_sentiment_tip`'s Unranked check).

4. **`updateCiteButtonState` stale-text edge case**: If `loadedRefs` goes from non-empty to empty (via `set_loadedRefs([])`), the button text is not reset — it retains the last-set label (including "📄 ALL CITED" if that was the last state).
