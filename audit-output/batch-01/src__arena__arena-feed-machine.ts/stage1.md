# Stage 1 — Primitive Inventory: src/arena/arena-feed-machine.ts

All 11 agents unanimous.

1. clearFeedTimer — function — line 52 — Clears the active feed turn interval timer and resets it to null in state.
2. startPreRoundCountdown — function — line 57 — Runs a 3-second countdown before a round begins, then fires the round-start sound and hands off to the first speaker's turn.
3. startSpeakerTurn — function — line 79 — Activates a speaker's timed turn, sets UI labels, enables/disables input, optionally starts Deepgram transcription, and starts the countdown interval that calls onTurnEnd when time expires.
4. finishCurrentTurn — function — line 147 — Allows the currently active debater to voluntarily end their turn early, clearing the timer and calling onTurnEnd.
5. onTurnEnd — function — line 160 — Handles post-turn logic: disables input, stops transcription, then routes to a pause (between speakers), an ad break (between rounds), or the final ad break (after the last round).
6. startPause — function — line 186 — Runs the inter-speaker pause phase with a countdown before calling startSpeakerTurn for the next speaker.
7. startAdBreak — function — line 228 — Starts a mid-debate commercial break overlay, enables spectator voting, and advances to the next round when the timer expires.
8. startFinalAdBreak — function — line 263 — Starts the post-final-round commercial break, enables spectator voting, then routes to the vote gate (spectators) or debate conclusion.
9. pauseFeed — function — line 415 — Pauses the turn timer for a challenge-in-progress, disables all debater controls, and (for mod clients) shows the ruling panel with a 60-second auto-accept countdown.
10. unpauseFeed — function — line 469 — Resumes the feed after a challenge ruling by clearing the ruling timer, restoring saved time-left, re-enabling controls, and removing the ruling overlay.
