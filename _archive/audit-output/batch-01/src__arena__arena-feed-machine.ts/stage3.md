# Stage 3 — Verification: src/arena/arena-feed-machine.ts

All 11 agents unanimous.

**Verdict: MOSTLY_ACCURATE**

---

## Confirmed correct

- All 10 anchor function line numbers verified against source ✓
- `clearFeedTimer`: reads `feedTurnTimer`, calls `clearInterval` if truthy, always calls `set_feedTurnTimer(null)` — exact match ✓
- `startPreRoundCountdown`: sets phase/timeLeft, 1s interval, `timeLeft <= 0` exit, fire-and-forget `writeFeedEvent`, calls `firstSpeaker(round)` then `startSpeakerTurn` — confirmed ✓
- `startSpeakerTurn`: `budgetRound !== round` guard for `resetBudget`, two `getCurrentProfile()` calls (lines 91, 94), `feedPaused` skip guard in setInterval (line 131), `timeLeft === 15` for timerWarning (line 138), `timeLeft <= 0` exit (line 140) — confirmed ✓
- `startSpeakerTurn` does NOT call `clearFeedTimer()` before starting its own interval (line 129 — no prior clear) — confirmed ✓
- `finishCurrentTurn`: exactly 3 early-return guards as documented — confirmed ✓
- `onTurnEnd`: `round >= FEED_TOTAL_ROUNDS` check (line 176) — confirmed ✓
- `startPause`: `FEED_PAUSE_DURATION`, `newRound` defaults to `false`, `clearFeedTimer()` before `startSpeakerTurn` on zero — confirmed ✓
- `startAdBreak`: `FEED_AD_BREAK_DURATION`, `votedRounds.has(round)` guard, `set_round(round+1)` before `startPreRoundCountdown` — confirmed ✓
- **Race condition confirmed**: in `pauseFeed`, `unpauseFeed()` at line 463 is called synchronously after attaching `.then(...).catch(...)` to the `safeRpc('insert_feed_event', ...)` promise — feed resumes before either RPC resolves ✓
- `unpauseFeed`: generic `'Side A\'s turn'` / `'Side B\'s turn'` labels at line 500, does NOT restart `feedTurnTimer` — confirmed ✓
- `endCurrentDebate` void + 2s `setTimeout` at line 299 — confirmed ✓

---

## PARTIAL findings (Stage 2 description errors)

### Finding 1 — Wrong duration constant in startFinalAdBreak

**Stage 2 stated:** `startFinalAdBreak` reads `FEED_AD_BREAK_DURATION`.
**Actual code (lines 265, 272):** `set_timeLeft(FEED_FINAL_AD_BREAK_DURATION)` and `showAdOverlay(FEED_FINAL_AD_BREAK_DURATION)`.

`FEED_FINAL_AD_BREAK_DURATION` is a distinct constant from `FEED_AD_BREAK_DURATION` — both are imported (line 32). Stage 2 described the wrong constant throughout its `startFinalAdBreak` entry. The behavior description is otherwise correct (countdown text, no round increment, vote gate branch).

**Not a code bug.** Stage 2 description error only.

---

## Incidental findings (not in Stage 2)

### Finding 2 — Private showVoteGate function not documented in Stage 2

`showVoteGate` (line 347) is a private function managing the vote gate overlay, its own `setInterval`, and `resolveGate` async handler. Stage 2 referenced it only as a called target (`showVoteGate(debate)`) but did not walk its internals. Not an anchor (unexported), so omission is expected. Noted for completeness:
- Creates `#feed-vote-gate` overlay, attaches click listeners to `#feed-gate-a` and `#feed-gate-b`
- On click or timeout: `set_hasVotedFinal(true)`, `clearFeedTimer()`, optionally calls `safeRpc('vote_arena_debate', ...)`, then `set_phase('finished')`, `playSound('debateEnd')`, `setTimeout(() => void endCurrentDebate(), 2000)`
- Same fire-and-forget `endCurrentDebate` pattern as the main finish path

### Finding 3 — handleRuling in showChallengeRulingPanel uses awaited RPCs (no race condition)

The manual mod ruling path (`handleRuling` inside `showChallengeRulingPanel`, lines 523–552) properly `await`s `insert_feed_event` before proceeding, and does NOT call `unpauseFeed()` directly. The comment at line 551 states "unpause is triggered by the mod_ruling event received via Realtime." The race condition exists **only** in the auto-accept (60s timeout) path in `pauseFeed`, not in the manual ruling path.
