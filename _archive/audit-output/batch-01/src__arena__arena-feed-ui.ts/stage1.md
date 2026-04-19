# Stage 1 — Primitive Inventory: src/arena/arena-feed-ui.ts

All 11 agents unanimous.

1. updateTimerDisplay — function — line 31 — Reads `timeLeft` from state, clamps to ≥0 via `Math.max`, formats with `formatTimer`, and sets the textContent of `#feed-timer`.
2. updateTurnLabel — function — line 36 — Accepts a text string and sets the textContent of `#feed-turn-label`.
3. updateRoundLabel — function — line 41 — Reads `round` and `FEED_TOTAL_ROUNDS` from state/types, sets the textContent of `#feed-round-label` as `ROUND {round}/{total}`.
4. setDebaterInputEnabled — function — line 46 — Enables or disables `#feed-debater-input`, `#feed-debater-send-btn`, and `#feed-finish-turn` based on `enabled`; also toggles the `feed-input-frozen` CSS class on the input and conditionally disables the send button if the input is empty.
5. updateBudgetDisplay — function — line 61 — Iterates score point values 1–5, reads per-point usage from `scoreUsed` and limits from `FEED_SCORE_BUDGET`, updates badge text and disables/enables score buttons.
6. resetBudget — function — line 76 — Calls `set_budgetRound(newRound)`, zeroes out all `scoreUsed` entries 1–5, then calls `updateBudgetDisplay`.
7. setSpectatorVotingEnabled — function — line 84 — Accepts `_enabled: boolean`; intentionally no-op. Comment explains tip strip is always active during live debates; tier gate is the only lock.
8. updateSentimentGauge — function — line 91 — Reads `sentimentA` and `sentimentB` from state, computes percentage split (defaulting to 50/50 on zero total), and sets `style.width` on `#feed-sentiment-a` and `#feed-sentiment-b`.
9. applySentimentUpdate — function — line 101 — Flushes pending sentiment increments into live sentiment state (`set_sentimentA`, `set_sentimentB`), resets pending accumulators to 0, then calls `updateSentimentGauge`.
10. updateCiteButtonState — function — line 109 — Reads `currentDebate`, `phase`, `loadedRefs`, `feedPaused` from state; disables `#feed-cite-btn` if not my turn, no uncited refs, or feed is paused; updates button text to "📄 ALL CITED" if all refs are cited.
11. updateChallengeButtonState — function — line 124 — Reads `currentDebate`, `phase`, `opponentCitedRefs`, `challengesRemaining`, `feedPaused`; disables `#feed-challenge-btn` if not my turn, no challengeable refs, no challenges remaining, or feed is paused; always updates button text to "⚔️ CHALLENGE ({remaining})".
