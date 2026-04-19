# Stage 2 — Runtime Walk: src/arena/arena-feed-machine.ts

All 11 agents unanimous on all major points.

---

## 1. clearFeedTimer (line 52)

**Reads:** `feedTurnTimer` (arena-state)
**Writes:** `set_feedTurnTimer(null)`
**Control flow:** Reads `feedTurnTimer`; if truthy, calls `clearInterval(feedTurnTimer)`. Always calls `set_feedTurnTimer(null)` unconditionally.
**DOM:** None.
**Async:** None. Fully synchronous.

---

## 2. startPreRoundCountdown(debate) (line 57)

**Reads:** None from state at call time (phase/timeLeft set immediately).
**Writes:** `set_phase('pre_round')`, `set_timeLeft(3)`, then `set_timeLeft(timeLeft-1)` on each tick.
**Side effects:**
- Calls `updateTimerDisplay()`, `updateTurnLabel('Starting...')`
- Starts 1s `setInterval` via `set_feedTurnTimer`
- Each tick: `set_timeLeft(timeLeft-1)`, `updateTimerDisplay()`
- On zero: `clearFeedTimer()`, `playSound('roundStart')`, `writeFeedEvent('round_divider', ...)` [fire-and-forget void], `addLocalSystem(...)`, resolves `firstSpeaker(round)`, calls `startSpeakerTurn(first, debate)`
**Async:** `writeFeedEvent` is awaited inside an async IIFE / void wrapper — fire-and-forget.

---

## 3. startSpeakerTurn(speaker, debate) (line 79)

**Reads:** `round` (arena-feed-state), `FEED_TURN_DURATION` (arena-types), `modView` (arena-state), `spectatorView` (arena-state), `currentProfile` via `getCurrentProfile()` [called twice — once for own side, once to compare with speaker], `getLocalStream()` (webrtc, only if `isMyTurn`)
**Writes:** `set_phase(...)`, `set_timeLeft(FEED_TURN_DURATION)`, then `set_timeLeft(timeLeft-1)` per tick
**Side effects:**
- `playSound('turnSwitch')`
- Conditionally `resetBudget(round)` (arena-feed-state)
- `updateTurnLabel(...)`, `updateTimerDisplay()`, `updateRoundLabel()`
- If `!modView`: queries `#feed-finish-turn`, `#feed-concede` buttons; calls `setDebaterInputEnabled(isMyTurn)`, `updateCiteButtonState()`, `updateChallengeButtonState()`
- If `isMyTurn`: calls `getLocalStream()`, calls `startTranscription(...)` (arena-deepgram) — fire-and-forget void
- Starts 1s `setInterval` via `set_feedTurnTimer`
- Each tick: skips entirely if `feedPaused`; else `set_timeLeft(timeLeft-1)`, `updateTimerDisplay()`, `classList.toggle('warning', timeLeft<=15)` on `#feed-timer`, `playSound('timerWarning')` at exactly `timeLeft===15`
- On zero: `clearFeedTimer()`, `onTurnEnd(speaker, debate)`
**Note:** Does NOT clear prior timer before starting new interval. Callers (e.g., startPause, startAdBreak) are responsible for calling `clearFeedTimer()` before invoking `startSpeakerTurn`.

---

## 4. finishCurrentTurn() (line 147)

**Reads:** `currentDebate` (arena-state), `phase` (arena-feed-state)
**Early returns (3 guards):**
1. `!debate` — no active debate
2. `!speaker` — `phase` is not `'speaker_a'` or `'speaker_b'`
3. `debate.role !== speaker || debate.modView` — caller is not the active speaker or is in mod view
**Writes:** (only if past guards) `clearFeedTimer()`, then delegates to `onTurnEnd`
**Side effects:** `addLocalSystem('You finished your turn early.')`, `onTurnEnd(speaker, debate)`
**Async:** None.

---

## 5. onTurnEnd(speaker, debate) (line 160)

**Reads:** `round` (arena-feed-state), `FEED_TOTAL_ROUNDS` (arena-types), `firstSpeaker` (arena-feed-state), `secondSpeaker` (arena-feed-state), `modView` (arena-state)
**Writes:** (via called functions)
**Side effects:**
- If `!modView`: `setDebaterInputEnabled(false)`
- `stopTranscription()` (arena-deepgram)
- `clearInterimTranscript()` (arena-feed-transcript)
**Routing logic:**
- If `speaker === firstSpeaker(round)` → `startPause(pausePhase, debate)`
- Else if `speaker === secondSpeaker && round >= FEED_TOTAL_ROUNDS` → `startFinalAdBreak(debate)`
- Else → `startAdBreak(debate)`
**Async:** None directly.

---

## 6. startPause(pausePhase, debate, newRound=false) (line 186)

**Reads:** `round` (arena-feed-state), `FEED_PAUSE_DURATION` (arena-types), `firstSpeaker`/`secondSpeaker` (arena-feed-state)
**Writes:** `set_phase(pausePhase)`, `set_timeLeft(FEED_PAUSE_DURATION)`, then `set_timeLeft(timeLeft-1)` per tick
**Side effects:**
- Calls `getCurrentProfile()` twice (own + speaker comparison)
- If `newRound`: `firstSpeaker(round)`, `playSound('roundStart')`, `writeFeedEvent(...)` [void], `addLocalSystem(...)`
- Else: resolves `secondSpeaker(round)`
- `updateTurnLabel(...)`, `updateTimerDisplay()`
- Starts 1s `setInterval` via `set_feedTurnTimer`
- Each tick: `set_timeLeft(timeLeft-1)`, updates timer display + turn label countdown
- On zero: `clearFeedTimer()`, `startSpeakerTurn(nextSpeakerSide, debate)`

---

## 7. startAdBreak(debate) (line 228)

**Reads:** `round` (arena-feed-state), `FEED_AD_BREAK_DURATION` (arena-types), `modView`, `spectatorView`, `votedRounds` (arena-feed-state)
**Writes:** `set_phase('ad_break')`, `set_timeLeft(FEED_AD_BREAK_DURATION)`, then `set_timeLeft(timeLeft-1)` per tick
**Side effects:**
- If `!modView`: `setDebaterInputEnabled(false)`
- `updateTurnLabel('COMMERCIAL BREAK')`, `updateTimerDisplay()`
- `showAdOverlay(FEED_AD_BREAK_DURATION)` — creates `div#feed-ad-overlay`, appends to `.feed-room`, pushes entry to `window.adsbygoogle`
- If `spectatorView && !votedRounds.has(round)`: `setSpectatorVotingEnabled(true)`
- Starts 1s `setInterval` via `set_feedTurnTimer`
- Each tick: `set_timeLeft(timeLeft-1)`, `updateTimerDisplay()`, updates overlay inner text to `Next round in ${timeLeft}s`
- On zero: `clearFeedTimer()`, `overlay?.remove()`, `setSpectatorVotingEnabled(false)`, `applySentimentUpdate()`, `set_round(round+1)`, `updateRoundLabel()`, `startPreRoundCountdown(debate)`

---

## 8. startFinalAdBreak(debate) (line 263)

**Reads:** `FEED_AD_BREAK_DURATION` (arena-types), `spectatorView`, `hasVotedFinal` (arena-feed-state)
**Writes:** `set_phase('final_ad_break')`, `set_timeLeft(FEED_AD_BREAK_DURATION)`, then `set_timeLeft(timeLeft-1)` per tick
**Side effects:** Identical setup to `startAdBreak` except:
- Countdown text: `Results in ${timeLeft}s`
- Does NOT increment round on completion
- On zero: `clearFeedTimer()`, `overlay?.remove()`, `setSpectatorVotingEnabled(false)`, `applySentimentUpdate()`
- Branch: if `spectatorView && !hasVotedFinal` → `showVoteGate(debate)` [private function]; else `set_phase('finished')`, `playSound('debateEnd')`, `addLocalSystem('Debate complete!')`, `nudge('feed_debate_end', '⚖️ The debate has concluded.')`, `setTimeout(() => void endCurrentDebate(), 2000)` [fire-and-forget, 2s delay]

---

## 9. pauseFeed(debate) (line 415)

**Reads:** `timeLeft` (snapshot at call time), `challengeRulingTimer` (arena-state), `FEED_CHALLENGE_RULING_SEC` (arena-types), `activeChallengeRefId` (arena-state), `activeChallengeId` (arena-state), `round` (arena-feed-state)
**Writes:** `set_feedPaused(true)`, `set_feedPauseTimeLeft(timeLeft)`
**Side effects:**
- `setDebaterInputEnabled(false)`, `updateCiteButtonState()`, `updateChallengeButtonState()`
- `updateTurnLabel('⚔️ CHALLENGE IN PROGRESS')`
- DOM: `#feed-finish-turn` disabled=true
- If `modView`:
  - `showChallengeRulingPanel(debate)` — appends `#feed-challenge-overlay` to `document.body`
  - Clears prior `challengeRulingTimer`
  - Sets new 60s countdown interval (stored via `set_challengeRulingTimer`)
  - Each tick: sets `#feed-timer` textContent = `⚔️ ${countdown}s`
  - On `countdown <= 0`:
    1. `clearInterval(challengeRulingTimer)`, `set_challengeRulingTimer(null)`
    2. `safeRpc('insert_feed_event', { ruling: 'upheld', ... })` [returns Promise]
    3. `.then(() => safeRpc('rule_on_reference', ...)).catch(warn)`
    4. **`unpauseFeed()` called synchronously** — feed timer resumes and debater controls restored BEFORE `insert_feed_event` / `rule_on_reference` RPCs resolve. **Race condition.**
**Note:** The `startSpeakerTurn` setInterval continues running during pause; ticks are no-ops because `feedPaused` is true. Unpausing is safe — no restart needed.

---

## 10. unpauseFeed() (line 469)

**Reads:** `challengeRulingTimer` (arena-state), `feedPauseTimeLeft` (arena-state), `currentDebate` (arena-state), `phase` (arena-feed-state), `modView` (arena-state)
**Writes:** `set_feedPaused(false)`, clears `challengeRulingTimer` (set to null), `set_activeChallengeRefId(null)`, `set_activeChallengeId(null)`, `set_timeLeft(feedPauseTimeLeft)`, `set_feedPauseTimeLeft(0)`
**Side effects:**
- DOM: `#feed-challenge-overlay?.remove()`
- `updateTimerDisplay()`
- If `debate && !modView`: `setDebaterInputEnabled(isMyTurn)`, `#feed-finish-turn` disabled=!isMyTurn, `updateCiteButtonState()`, `updateChallengeButtonState()`
- `updateTurnLabel(...)` — uses generic "Side A's turn"/"Side B's turn" phrasing (NOT resolved player display names)
**Note:** Does NOT restart `feedTurnTimer`. The existing `setInterval` from `startSpeakerTurn` resumes automatically on the next tick once `feedPaused` becomes false.

---

## Cross-cutting findings

1. **Race condition in pauseFeed auto-accept path**: `unpauseFeed()` is called synchronously after initiating the `safeRpc('insert_feed_event', ...)` promise chain. Feed timer and debater controls restore before the DB write and `rule_on_reference` RPC complete. If either RPC fails, the ruling is lost but the feed has already resumed.

2. **No defensive clearFeedTimer in startSpeakerTurn**: `startSpeakerTurn` does not call `clearFeedTimer()` before starting its own interval. All callers (startPause, startAdBreak on round advance) must clear prior timers. If a caller fails to do so, two intervals run simultaneously.

3. **unpauseFeed uses generic turn labels**: `updateTurnLabel` in `unpauseFeed` emits generic side strings rather than resolved player names, producing a visual regression if the challenge panel closed mid-turn.

4. **endCurrentDebate fire-and-forget**: In `startFinalAdBreak`, `setTimeout(() => void endCurrentDebate(), 2000)` — the 2s delay and void discard means any error in `endCurrentDebate` is silently lost.
