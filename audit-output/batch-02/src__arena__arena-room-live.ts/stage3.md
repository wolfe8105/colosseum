# Stage 3 Outputs — arena-room-live.ts

## Agent 01

### renderInputControls
CONFIRM: All three mode branches correct. CONFIRM: text/ai — three event listeners wired on the elements inside the block scope. CONFIRM: live — single click listener on mic button. CONFIRM: voicememo — wireVoiceMemoControls called. No errors.

### stopOpponentPoll
CONFIRM. Simple and correct.

### startOpponentPoll
CONFIRM: stopOpponentPoll called first. CONFIRM: setInterval stored via set_opponentPollTimer. CONFIRM: elapsed incremented by OPPONENT_POLL_MS / 1000 each tick. CONFIRM: timeout check at OPPONENT_POLL_TIMEOUT_SEC. CONFIRM: re-enables both textarea and record button.

FINDING — startOpponentPoll READS MODULE VARIABLE opponentPollElapsed IN INTERVAL CALLBACK BUT CLOSURE CAPTURES THE SETTER: Each tick calls `set_opponentPollElapsed(opponentPollElapsed + OPPONENT_POLL_MS / 1000)`. The `opponentPollElapsed` read is the module variable at call time (not a closure over the value at tick-set time). This is correct — each tick reads the current module value and increments it. No bug.

FINDING — startOpponentPoll DOES NOT HANDLE CONCURRENT INVOCATIONS: If `startOpponentPoll` is called while a previous poll is still running (e.g., due to a race in advanceRound), `stopOpponentPoll()` at the start clears the prior interval. This is safe — the prior poll is killed before the new one starts.

### submitTextArgument
CONFIRM: input guards. CONFIRM: optimistic addMessage called before RPC. CONFIRM: for AI mode, handleAIResponse is awaited. CONFIRM: for human placeholder, simulated response with random 2000-5000ms delay. CONFIRM: for real human, startOpponentPoll called.

FINDING — submitTextArgument RPC FAILURE IS SILENTLY SWALLOWED: The try-catch around `submit_debate_message` (lines 148-155) catches all exceptions and does nothing (`/* warned */` comment but no actual warning logged). The message was already rendered optimistically. Other participants won't receive it (it won't be in the DB), but locally it appears sent. SEVERITY: Medium.

### advanceRound
CONFIRM: final round check with 1500ms delay. CONFIRM: close_debate_round is fire-and-forget with pressure feedback. CONFIRM: debate.round++ increments the local debate object.

FINDING — debate.round MUTATED DIRECTLY: `debate.round++` at line 205 mutates the module-level `currentDebate` object directly, not through a setter. This is consistent with the codebase pattern (currentDebate is a mutable object) but breaks the "set_*" convention seen elsewhere.

FINDING — startLiveRoundTimer CALLED EVEN IF ALREADY RUNNING: `advanceRound` calls `startLiveRoundTimer()` for live mode. `startLiveRoundTimer` itself clears the old timer before starting a new one. So if advanceRound is called while a timer is running, the old timer is cleared and a new one starts. This is safe, handled internally by startLiveRoundTimer.

### startLiveRoundTimer
CONFIRM: ROUND_DURATION reset. CONFIRM: prior timer cleared. CONFIRM: 1s interval with countdown, warning class, advanceRound at 0.

FINDING — roundTimeLeft READ AS MODULE VARIABLE IN INTERVAL: Each tick calls `set_roundTimeLeft(roundTimeLeft - 1)` reading the module variable. If two concurrent timers somehow ran (shouldn't happen given the clearInterval guard), they'd both read the same module variable. Since startLiveRoundTimer always clears the prior timer, this is safe. One timer at a time.

### initLiveAudio
CONFIRM: 8 WebRTC event handlers registered. CONFIRM: joinDebate awaited. CONFIRM: mic-blocked fallback.

FINDING — DUPLICATE onWebRTC REGISTRATIONS IF initLiveAudio CALLED MULTIPLE TIMES: Each call to `onWebRTC(event, callback)` registers a new listener. If `initLiveAudio` is called more than once (e.g., on reconnect), the handlers stack up. `debateEnd` could fire `endCurrentDebate` multiple times. Whether `onWebRTC` de-duplicates is unclear from this file. SEVERITY: Medium.

### toggleLiveMute
CONFIRM. Simple passthrough.

### addMessage
CONFIRM: debate.messages push. CONFIRM: escapeHTML on name and text. CONFIRM: round number in innerHTML is a number literal (safe — not user-controlled). CONFIRM: scroll to bottom.

FINDING — addMessage USES innerHTML WITH round NUMBER NOT CAST VIA Number(): Line 338 contains `<div class="msg-round">Round ${round}</div>`. `round` is typed as `number` (parameter type) so it's safe. But it's not explicitly cast with `Number()`. In practice TypeScript guarantees it's a number, so this is not a real XSS risk. Low concern.

### addSystemMessage
CONFIRM: textContent used (not innerHTML). CONFIRM: no escapeHTML needed here. CONFIRM: scroll to bottom.

## Agent 02

### renderInputControls
CONFIRM.

### stopOpponentPoll
CONFIRM.

### startOpponentPoll
CONFIRM. One detail: `opponentPollElapsed` is read from the module variable at each tick. Since `set_opponentPollElapsed` updates the module export, the next tick reads the updated value. This is the correct pattern for mutable module state.

FINDING — get_debate_messages RETURNS ALL MESSAGES, NOT JUST THE CURRENT ROUND: The RPC `get_debate_messages` is called with only `p_debate_id` — no round filter. The client filters client-side via `msgs.find(m => m.side !== myRole && m.round === round)`. This means every poll fetches all debate messages and discards most of them. Inefficient, especially for long debates. SEVERITY: Low (performance, not correctness).

### submitTextArgument
CONFIRM. RPC failure silently swallowed — confirmed finding.

FINDING — OPTIMISTIC addMessage BEFORE RPC FAILS SILENTLY: If the RPC to submit_debate_message fails, the message appears locally but is never delivered to the opponent. The user sees their message but the opponent never receives it and the poll (startOpponentPoll) will time out waiting for a response that doesn't come. SEVERITY: Medium.

### advanceRound
CONFIRM.

FINDING — close_debate_round RACE CONDITION: Both debaters call `advanceRound` independently when a round ends. Both fire `close_debate_round` for the same round. The comment says "ON CONFLICT DO NOTHING on the server means only the first caller does work" — this is a server-side idempotency guarantee. The pressure check callback runs for the debater whose RPC resolved with data. If neither gets data (conflict prevented the second from executing), the second debater gets no pressure notification even if pressure hit them. SEVERITY: Low (debater might miss a pressure notification, but score is correctly applied server-side).

### startLiveRoundTimer
CONFIRM.

### initLiveAudio
CONFIRM. The duplicate-handler concern is valid — each call to onWebRTC stacks a new listener.

### toggleLiveMute
CONFIRM.

### addMessage
CONFIRM.

### addSystemMessage
CONFIRM.

## Agent 03

### renderInputControls
CONFIRM. Note: for the 'text'/'ai' case, the input element is queried immediately after innerHTML is set. The elements exist in DOM at query time.

### stopOpponentPoll
CONFIRM.

### startOpponentPoll
CONFIRM. Note: the interval callback reads `opponentPollElapsed` which is the module variable. Since JavaScript is single-threaded, reading it at the top of each async tick is safe.

### submitTextArgument
CONFIRM.

FINDING — INPUT REMAINS DISABLED IF RPC FAILS IN AI MODE: In the AI branch, `input.disabled` is not explicitly set before `handleAIResponse`. The input was NOT disabled before the RPC call. However, the send button was disabled (`sendBtnEl.disabled = true`). After `handleAIResponse` returns, there is no code in `submitTextArgument` to re-enable the send button. The re-enable presumably happens in `handleAIResponse` or `advanceRound`. Needs cross-check with arena-room-ai.ts. SEVERITY: unclear from this file.

### advanceRound
CONFIRM.

### startLiveRoundTimer
CONFIRM.

### initLiveAudio
CONFIRM.

FINDING — leaveDebate IMPORTED BUT NOT CALLED: `leaveDebate` is imported at line 6 but not called anywhere in this file. It is called in `arena-room-end.ts`. Dead import. SEVERITY: Low.

### toggleLiveMute
CONFIRM.

### addMessage
CONFIRM.

### addSystemMessage
CONFIRM.

## Agent 04

### renderInputControls
CONFIRM.

### stopOpponentPoll
CONFIRM.

### startOpponentPoll
CONFIRM.

### submitTextArgument
CONFIRM. Confirmed: the `// /* warned */` comment in the catch block is misleading — no warning is actually emitted. The comment implies there should be a console.warn but it was removed.

### advanceRound
CONFIRM.

FINDING — PRESSURE NOTIFICATION ONLY SHOWN IF close_debate_round RETURNS DATA: The `.then` callback checks `if (!data) return`. If the RPC succeeds but returns no data (e.g., no pressure was applied), pressure data is null and no notification fires. This is correct. If the RPC fails (rejected promise), `.catch(() => { /* non-fatal */ })` suppresses the error. If both debaters call it and one gets a conflict error, their catch fires silently. Confirmed non-bug.

### startLiveRoundTimer
CONFIRM.

### initLiveAudio
CONFIRM.

### toggleLiveMute
CONFIRM.

### addMessage
CONFIRM.

### addSystemMessage
CONFIRM.

## Agent 05

### renderInputControls
CONFIRM.

FINDING — screenEl IMPORTED BUT NOT USED: `screenEl` is imported from arena-state (line 10) but not referenced anywhere in this file. Dead import. SEVERITY: Low.

### stopOpponentPoll
CONFIRM.

### startOpponentPoll
CONFIRM. Note: OPPONENT_POLL_TIMEOUT_SEC is the timeout in seconds; elapsed is also tracked in seconds (ms / 1000). Unit consistency confirmed.

### submitTextArgument
CONFIRM.

### advanceRound
CONFIRM.

FINDING — nudge CALLED WITH 'round_end' KEY EVERY ROUND: `nudge('round_end', ...)` fires every round. The nudge module has suppression rules (once per session per ID, 24h cooldown, 3-per-session cap). After the third round, the nudge would be suppressed by the session cap. This is correct behavior — the nudge is a soft engagement prod, not critical info.

### startLiveRoundTimer
CONFIRM.

### initLiveAudio
CONFIRM.

### toggleLiveMute
CONFIRM.

### addMessage
CONFIRM.

### addSystemMessage
CONFIRM.

## Agent 06

### renderInputControls
CONFIRM.

### stopOpponentPoll
CONFIRM.

### startOpponentPoll
CONFIRM.

FINDING — startOpponentPoll RE-ENABLES arena-record-btn EVEN FOR TEXT MODE: After finding the opponent message, the code re-enables both `arena-text-input` and `arena-record-btn`. In text mode, there is no `arena-record-btn` (only in voicememo). The querySelector returns null if absent, and `if (rec) rec.disabled = false` guards correctly. Safe. Non-bug.

### submitTextArgument
CONFIRM.

### advanceRound
CONFIRM.

### startLiveRoundTimer
CONFIRM.

FINDING — startLiveRoundTimer READS roundTimeLeft FROM MODULE STATE EACH TICK: Each tick decrements via `set_roundTimeLeft(roundTimeLeft - 1)`. Since `roundTimeLeft` is the current module export (not a local variable), each read gets the current value. If another part of the code modifies `roundTimeLeft` mid-countdown (not seen in this file), the timer would use the modified value. The pattern is correct for single-threaded JS.

### initLiveAudio
CONFIRM.

### toggleLiveMute
CONFIRM.

### addMessage
CONFIRM.

### addSystemMessage
CONFIRM.

## Agent 07

### renderInputControls
CONFIRM.

### stopOpponentPoll
CONFIRM.

### startOpponentPoll
CONFIRM.

### submitTextArgument
CONFIRM.

FINDING — PLACEHOLDER SIMULATED RESPONSE USES generateSimulatedResponse(debate.round): The timeout callback captures `debate.round` via closure at the time `submitTextArgument` runs. `debate.round` is not incremented until `advanceRound` runs. So `generateSimulatedResponse` receives the current round number. When `advanceRound` is called inside the timeout, `debate.round` will be incremented. The round number passed to `addMessage` for the simulated response is correct.

### advanceRound
CONFIRM.

### startLiveRoundTimer
CONFIRM.

### initLiveAudio
CONFIRM.

### toggleLiveMute
CONFIRM.

### addMessage
CONFIRM. The `Round ${round}` in innerHTML: `round` is a function parameter typed as `number`. TypeScript ensures it's numeric. Not an XSS vector. However, to be consistent with the codebase's `Number()` casting convention, it could be written `${Number(round)}`. Minor style inconsistency only.

### addSystemMessage
CONFIRM.

## Agent 08

### renderInputControls
CONFIRM.

### stopOpponentPoll
CONFIRM.

### startOpponentPoll
CONFIRM.

FINDING — OPPONENT POLL TIMEOUT DOES NOT RE-ENABLE SEND BUTTON: When the poll times out (line 100-105), the code re-enables `arena-text-input` and `arena-record-btn` but does NOT re-enable `arena-send-btn`. The send button was not explicitly disabled in `submitTextArgument` before the poll was started — it was disabled when the user clicked send, and it's also auto-managed by the textarea `input` event listener (disabled when text is empty). Since the textarea was re-enabled, the user can type and the input listener will re-enable the send button. Non-bug, but subtle.

### submitTextArgument
CONFIRM.

### advanceRound
CONFIRM.

### startLiveRoundTimer
CONFIRM.

### initLiveAudio
CONFIRM.

### toggleLiveMute
CONFIRM.

### addMessage
CONFIRM.

### addSystemMessage
CONFIRM.

## Agent 09

### renderInputControls
CONFIRM.

### stopOpponentPoll
CONFIRM.

### startOpponentPoll
CONFIRM.

### submitTextArgument
CONFIRM.

### advanceRound
CONFIRM.

FINDING — endCurrentDebate CALLED VIA setTimeout: `setTimeout(() => void endCurrentDebate(), 1500)` at line 180. The 1500ms delay allows the final round UI to display before transitioning. This is an intentional UX delay, not a reliability concern. The `void` cast is correct.

### startLiveRoundTimer
CONFIRM.

### initLiveAudio
CONFIRM.

### toggleLiveMute
CONFIRM.

### addMessage
CONFIRM.

### addSystemMessage
CONFIRM.

## Agent 10

### renderInputControls
CONFIRM.

### stopOpponentPoll
CONFIRM.

### startOpponentPoll
CONFIRM.

### submitTextArgument
CONFIRM.

### advanceRound
CONFIRM.

### startLiveRoundTimer
CONFIRM.

### initLiveAudio
CONFIRM.

FINDING — initLiveAudio DOES NOT DEREGISTER onWebRTC HANDLERS: There is no mechanism to remove the event handlers registered via `onWebRTC`. If `initLiveAudio` is called again (e.g., for a new debate without page reload), duplicate handlers accumulate. Particularly dangerous for `debateEnd`, which would call `endCurrentDebate()` multiple times. Whether `onWebRTC` supports deregistration is unclear from this file. SEVERITY: Medium.

### toggleLiveMute
CONFIRM.

### addMessage
CONFIRM.

### addSystemMessage
CONFIRM.

## Agent 11

### renderInputControls
CONFIRM.

### stopOpponentPoll
CONFIRM.

### startOpponentPoll
CONFIRM.

### submitTextArgument
CONFIRM.

### advanceRound
CONFIRM.

### startLiveRoundTimer
CONFIRM.

### initLiveAudio
CONFIRM.

### toggleLiveMute
CONFIRM.

### addMessage
CONFIRM. Note: role pushed to `debate.messages` is either 'user' or 'assistant' (line 323), not 'a'/'b'. This is the AI message format. For human PvP debates, this transforms the roles. The messages array is used by `requestAIScoring` and in the transcript view. Consistent with how these messages are consumed.

### addSystemMessage
CONFIRM. textContent correctly used instead of innerHTML — no XSS risk for system messages.

## Consolidated Findings Summary

**REAL — Medium severity:**
1. **submitTextArgument RPC FAILURE SILENTLY SWALLOWED**: The catch around submit_debate_message swallows all errors with no log. The message appears locally but may not have been delivered. The opponent's poll will time out waiting for a message that doesn't exist.

2. **initLiveAudio DUPLICATE HANDLER RISK**: Each call stacks new onWebRTC handlers. If called more than once per debate session, `debateEnd` would fire `endCurrentDebate` multiple times.

**REAL — Low severity:**
3. **UNUSED IMPORTS**: `leaveDebate` (line 6) and `screenEl` (line 10) imported but never used.
4. **get_debate_messages FETCHES ALL MESSAGES, FILTERS CLIENT-SIDE**: Inefficient for long debates.
5. **close_debate_round RACE**: Both debaters fire the RPC; second gets conflict-suppressed and may miss pressure notification.
6. **debate.round MUTATED DIRECTLY** (not via setter): Pattern inconsistency.
