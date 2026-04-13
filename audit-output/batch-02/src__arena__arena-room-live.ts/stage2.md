# Stage 2 Outputs — arena-room-live.ts

## Agent 01

### renderInputControls
Reads `mode` (DebateMode). Retrieves `arena-input-area` element; returns if absent. Switches on mode: for 'text' or 'ai', sets innerHTML to a textarea+send-button layout (maxlength from `TEXT_MAX_CHARS`), then queries those elements and attaches: textarea `input` listener (update char count, toggle send disabled, auto-resize to max 120px); send button `click` → `void submitTextArgument()`; textarea `keydown` Enter-without-Shift → `void submitTextArgument()`. For 'live', sets innerHTML to waveform canvas + mic button + status text, attaches `click` on mic button → `toggleLiveMute`. For 'voicememo', sets innerHTML to voice memo controls layout, calls `wireVoiceMemoControls()`.

### stopOpponentPoll
No parameters. If `opponentPollTimer` is set: calls `clearInterval(opponentPollTimer)`, calls `set_opponentPollTimer(null)`. Calls `set_opponentPollElapsed(0)`. Returns void.

### startOpponentPoll
Reads `debateId` (string), `myRole` (DebateRole), `round` (number). Calls `stopOpponentPoll()` first. Then calls `set_opponentPollTimer(setInterval(callback, OPPONENT_POLL_MS))`. The interval callback is async: increments `opponentPollElapsed` by `OPPONENT_POLL_MS / 1000` via `set_opponentPollElapsed`. If `opponentPollElapsed >= OPPONENT_POLL_TIMEOUT_SEC`: calls `stopOpponentPoll()`, calls `addSystemMessage` with timeout message, re-enables `arena-text-input` and `arena-record-btn`, returns. Otherwise: awaits `safeRpc<unknown>('get_debate_messages', { p_debate_id: debateId })`; on error or null data, returns. Parses data as an array of message objects, finds the first message from the opponent (side !== myRole) in the current round. If not found, returns. If found: calls `stopOpponentPoll()`, computes `oppSide = myRole === 'a' ? 'b' : 'a'`, calls `addMessage(oppSide, oppMsg.content, round, oppMsg.is_ai ?? false)`, re-enables textarea and record button, calls `advanceRound()`. On exception: silently returns (retry next tick).

### submitTextArgument
Async, no parameters. Retrieves `arena-text-input`; returns if null or empty. Captures trimmed text, clears input, resets height, resets char count to '0', disables send button. Reads `currentDebate!` as `debate`. Reads `debate.role` as side. Calls `addMessage(side, text, debate.round, false)` (optimistic local render). If not placeholder and not ai-local/placeholder id prefix: awaits `safeRpc('submit_debate_message', { p_debate_id, p_round, p_side, p_content })` in try-catch (exception silently ignored). If `debate.mode === 'ai'`: awaits `handleAIResponse(debate, text)`. Else (human PvP): disables textarea, calls `addSystemMessage('Waiting...')`, if placeholder/placeholder-id: sets a 2000-5000ms random timeout that adds a simulated response and calls `advanceRound()`; otherwise calls `startOpponentPoll(debate.id, side, debate.round)`.

### advanceRound
No parameters. Reads `currentDebate!` as `debate`. If `debate.round >= debate.totalRounds`: sets a 1500ms timeout that fires `void endCurrentDebate()`, returns. Otherwise: fires `safeRpc('close_debate_round', { p_debate_id, p_round: completedRound })` without await (void) for non-ai-local, non-placeholder, non-ai debates; in the .then: if result has pressure data, calls `addSystemMessage` for pressure notification; increments `debate.round`. Calls `nudge('round_end', ...)`. Calls `addSystemMessage` with round number. Updates `arena-round-label` text. If `debate.mode === 'live'`: calls `startLiveRoundTimer()`.

### startLiveRoundTimer
No parameters. Calls `set_roundTimeLeft(ROUND_DURATION)`. If `roundTimer` is set, calls `clearInterval(roundTimer)`. Queries `arena-room-timer` element. Calls `set_roundTimer(setInterval(callback, 1000))`. The callback: decrements `roundTimeLeft` by 1 via `set_roundTimeLeft(roundTimeLeft - 1)`, updates timer element text via `formatTimer(roundTimeLeft)`, toggles 'warning' class when ≤15s, and if `roundTimeLeft <= 0`: clears the timer, calls `addSystemMessage` about time's up, calls `advanceRound()`.

### initLiveAudio
Async, no parameters. Reads `currentDebate!` as `debate`. Registers WebRTC event handlers via `onWebRTC(event, callback)`: 'micReady' → updates status text, creates waveform from local stream; 'connected' → updates status text; 'disconnected' → updates status text based on recovering flag; 'reconnecting' → updates status with attempt/max; 'connectionFailed' → updates status; 'muteChanged' → updates mic button text/class and status text; 'tick' → updates timer element with timeLeft via formatTimer, toggles warning class; 'debateEnd' → fires `void endCurrentDebate()`. Then awaits `joinDebate(debate.id, debate.role, debate.totalRounds)` in try-catch; on exception: sets status text to mic-blocked message.

### toggleLiveMute
No parameters. Calls `toggleMute()`. Returns void. (A thin wrapper over the webrtc module's toggleMute.)

### addMessage
Reads `side` (DebateRole), `text` (string), `round` (number), `isAI` (boolean). Retrieves `arena-messages` element; returns if absent. Reads `currentDebate` as `debate`. If `debate?.messages` exists, pushes a message object `{ role: side === debate.role ? 'user' : 'assistant', text, round }` onto it. Reads `getCurrentProfile()`. Computes display name: if isAI → '🤖 AI'; if my side → profile display_name ?? 'You'; else → debate opponentName ?? 'Opponent'. Creates a div with classes `arena-msg side-${side} arena-fade-in`, sets innerHTML with `escapeHTML(name)` and `escapeHTML(text)` and the round number. Appends to messages. Scrolls messages to bottom.

### addSystemMessage
Reads `text` (string). Retrieves `arena-messages` element; returns if absent. Creates a div with class `arena-msg system arena-fade-in`, sets `.textContent = text` (not innerHTML — no escapeHTML needed). Appends, scrolls to bottom.

## Agent 02

### renderInputControls
Reads mode. Gets `arena-input-area`; returns if not found. Three cases: text/ai → textarea + send button HTML with TEXT_MAX_CHARS maxlength, wires input (char count + resize + disable send), click + enter-key fire `submitTextArgument()`; live → waveform canvas + mic button, wires mic click to `toggleLiveMute`; voicememo → voice-memo controls HTML, calls `wireVoiceMemoControls()`.

### stopOpponentPoll
Clears and nulls the opponent poll timer. Resets elapsed to 0.

### startOpponentPoll
Calls stopOpponentPoll first. Registers a setInterval (OPPONENT_POLL_MS) that increments elapsed, checks for timeout, polls get_debate_messages RPC, finds opponent message for the current round, calls addMessage and advanceRound on discovery. On timeout: adds system message, re-enables input. On exception: silently continues.

### submitTextArgument
Async. Reads and clears text input. Adds local message. Submits to server (non-placeholder). Handles AI response or human poll branch.

### advanceRound
Reads currentDebate. Ends debate if final round (1500ms delay). Otherwise: fires close_debate_round (fire-and-forget), increments round, fires nudge, adds system message, updates round label, starts live timer if live mode.

### startLiveRoundTimer
Resets round time, clears prior timer, starts 1s interval that counts down, updates UI, triggers advanceRound on expiry.

### initLiveAudio
Async. Registers 7 WebRTC event callbacks. Awaits joinDebate. Handles mic-blocked error.

### toggleLiveMute
Calls toggleMute(). One-liner wrapper.

### addMessage
Reads side/text/round/isAI. Appends to debate.messages array. Builds and appends DOM message element with escapeHTML. Scrolls to bottom.

### addSystemMessage
Reads text. Builds and appends DOM system message. Scrolls to bottom.

## Agent 03

### renderInputControls
Receives mode. Gets input area. Switch on mode: text/ai builds textarea with maxlength=TEXT_MAX_CHARS, wires input event (char count, send enable, resize), click and keydown-Enter→submitTextArgument; live builds waveform/mic/status, wires mic click→toggleLiveMute; voicememo builds VM controls, calls wireVoiceMemoControls.

### stopOpponentPoll
Clears opponentPollTimer if set, nulls it, resets elapsed to 0.

### startOpponentPoll
Stops prior poll. Starts setInterval at OPPONENT_POLL_MS. Each tick: increments elapsed, checks timeout (stopPoll + system message + re-enable input), polls get_debate_messages, extracts opponent message for round, calls addMessage + re-enable input + advanceRound. Silent on exception.

### submitTextArgument
Async. Gets and clears text input. Optimistic addMessage. RPC submit (non-placeholder). AI branch (awaits handleAIResponse) or human branch (disable input, system message, placeholder simulation or real poll).

### advanceRound
End-of-rounds check with 1500ms delay to endCurrentDebate. close_debate_round RPC (fire-and-forget, with pressure feedback). Increment round, nudge, system message, label update, start live timer if live.

### startLiveRoundTimer
Resets time, clears old timer, starts 1s interval countdown. On 0: adds system message, calls advanceRound.

### initLiveAudio
Async. Registers 7 WebRTC listeners (micReady, connected, disconnected, reconnecting, connectionFailed, muteChanged, tick, debateEnd). Awaits joinDebate. Handles mic error.

### toggleLiveMute
Calls toggleMute(). Wrapper.

### addMessage
Reads params. Appends to debate.messages. Creates DOM element with escapeHTML. Scrolls to bottom.

### addSystemMessage
Reads text. Creates system DOM element via textContent. Scrolls to bottom.

## Agent 04

### renderInputControls
Injects mode-appropriate input controls. For text/ai: textarea (maxlength TEXT_MAX_CHARS), send button (initially disabled), char counter. Wires input→resize+enable, click+Enter→submitTextArgument. For live: waveform canvas, mic button wired to toggleLiveMute, status element. For voicememo: recording controls, calls wireVoiceMemoControls.

### stopOpponentPoll
Guard-clears the opponentPollTimer interval. Resets elapsed to 0.

### startOpponentPoll
Calls stopOpponentPoll. Starts polling interval. Each interval tick: increments elapsed time by OPPONENT_POLL_MS/1000. Checks against OPPONENT_POLL_TIMEOUT_SEC. On timeout: stops poll, shows system message, re-enables text input and record button. On each tick: awaits get_debate_messages RPC. If opponent message found for round: stops poll, adds message, re-enables input, advances round.

### submitTextArgument
Async, no params. Gets text input, returns if empty. Clears and disables input. Adds local message (addMessage). Conditionally submits via RPC. For AI mode: awaits handleAIResponse. For human mode: disables input, shows waiting message, for placeholder uses timeout+simulated response, for real debate starts opponent poll.

### advanceRound
Reads currentDebate. If final round: schedules endCurrentDebate after 1500ms. Otherwise: fires close_debate_round (non-blocking), increments debate.round, calls nudge, adds system message, updates label, starts live timer for live mode.

### startLiveRoundTimer
Sets roundTimeLeft to ROUND_DURATION. Clears any existing roundTimer. Starts 1s interval. Each tick decrements roundTimeLeft, updates timer display, toggles warning class at 15s, calls advanceRound when hits 0.

### initLiveAudio
Async. Registers callbacks on WebRTC events: micReady (start waveform), connected (status), disconnected (status+recovering flag), reconnecting (status), connectionFailed (status), muteChanged (btn+status), tick (timer), debateEnd (endCurrentDebate). Awaits joinDebate.

### toggleLiveMute
Wrapper around toggleMute().

### addMessage
Adds message to currentDebate.messages array and to DOM. Uses escapeHTML for name and text. Scrolls to bottom.

### addSystemMessage
Adds system message to DOM via textContent. Scrolls.

## Agent 05

### renderInputControls
Mode switch. text/ai: HTML injection + three listener attachments. live: HTML injection + one listener. voicememo: HTML injection + wireVoiceMemoControls().

### stopOpponentPoll
Clears interval, nulls ref, resets elapsed.

### startOpponentPoll
Calls stop first, then creates polling interval. Increment elapsed → check timeout → poll RPC → find opponent msg → trigger next round.

### submitTextArgument
Async. Guards empty/null. Clears input. Optimistic render. RPC submit. AI or human branch.

### advanceRound
End-debate if final round. Otherwise close_debate_round + round++ + nudge + message + label + live timer.

### startLiveRoundTimer
ROUND_DURATION reset, prior timer clear, 1s interval countdown, advanceRound at 0.

### initLiveAudio
Register 8 WebRTC event handlers. joinDebate.

### toggleLiveMute
toggleMute().

### addMessage
Push to debate.messages, build DOM element with escapeHTML, scroll.

### addSystemMessage
Append system element via textContent, scroll.

## Agent 06

### renderInputControls
Reads mode. Injects HTML into arena-input-area based on mode, then wires events. text/ai case wires three events (input, click, keydown). live case wires one click event. voicememo case calls wireVoiceMemoControls().

### stopOpponentPoll
Clears opponentPollTimer interval if set, nulls it via setter, resets elapsed via setter.

### startOpponentPoll
Stops any active poll. Sets a new interval polling at OPPONENT_POLL_MS. Interval handler increments elapsed, checks timeout (with re-enable and system message), polls get_debate_messages, extracts matching opponent message, if found: stops poll, adds message, re-enables inputs, advances round.

### submitTextArgument
Async. Null/empty guard. Clear and disable input. addMessage (optimistic). Conditional RPC submit. AI: handleAIResponse. Human: disable + system msg + placeholder simulation or real poll.

### advanceRound
Final round check (→ endCurrentDebate after 1500ms). close_debate_round fire-and-forget with pressure feedback callback. Increment round. nudge + system msg + label update. Live: startLiveRoundTimer.

### startLiveRoundTimer
Reset time. Clear prior timer. Start 1s countdown. Update DOM. advanceRound at 0.

### initLiveAudio
Register 8 onWebRTC handlers. joinDebate with error fallback.

### toggleLiveMute
toggleMute() passthrough.

### addMessage
Push to debate.messages. Build and append DOM element. escapeHTML on name and text.

### addSystemMessage
Append DOM system element via textContent.

## Agent 07

### renderInputControls
Mode-dependent HTML injection and event wiring for the input area.

### stopOpponentPoll
Clears poll, nulls timer ref, resets elapsed to 0.

### startOpponentPoll
Stops existing poll. Creates interval that polls get_debate_messages every OPPONENT_POLL_MS until timeout or opponent message found.

### submitTextArgument
Async. Clears input, renders optimistically, submits to server, then either awaits AI response or starts human poll.

### advanceRound
If last round, schedules endCurrentDebate after delay. Otherwise closes round, increments round number, fires round-end events.

### startLiveRoundTimer
Countdown timer from ROUND_DURATION, calling advanceRound at zero.

### initLiveAudio
Registers all WebRTC event handlers, then joins the debate.

### toggleLiveMute
Passes through to toggleMute.

### addMessage
Renders a debate message to the DOM with proper escaping, adds to in-memory array.

### addSystemMessage
Renders a system message to the DOM using textContent.

## Agent 08

### renderInputControls
Gets inputArea, returns if null. Switches on mode: text/ai sets innerHTML with textarea and send button, wires input+click+keydown; live sets innerHTML with waveform+mic+status, wires mic click; voicememo sets innerHTML with VM layout, calls wireVoiceMemoControls.

### stopOpponentPoll
Clears interval if set. Nulls timer ref. Resets elapsed.

### startOpponentPoll
Stops prior. Starts interval at OPPONENT_POLL_MS. Tick: increment elapsed, timeout check (stop + re-enable + system msg), RPC poll, find opponent msg, stop + addMessage + re-enable + advanceRound.

### submitTextArgument
Async. Guard null/empty. Clear/disable input. Optimistic addMessage. Non-placeholder RPC submit. AI → handleAIResponse. Human → disable + wait msg + simulated or polled opponent.

### advanceRound
Final round → 1500ms → endCurrentDebate. Else: close_debate_round fire-and-forget + round++ + nudge + system msg + label + live timer if live.

### startLiveRoundTimer
Set time, clear old timer, start 1s interval: decrement, update DOM, advanceRound at 0.

### initLiveAudio
8 WebRTC handlers + joinDebate + mic error fallback.

### toggleLiveMute
toggleMute() wrapper.

### addMessage
Push to debate.messages. DOM element creation with escapeHTML. Scroll.

### addSystemMessage
DOM element via textContent. Scroll.

## Agent 09

### renderInputControls
Mode switch with HTML injection and event wiring. Three modes: text/ai, live, voicememo.

### stopOpponentPoll
Clear + null + reset elapsed.

### startOpponentPoll
Polling interval that increments elapsed, checks timeout, RPC-polls for opponent message.

### submitTextArgument
Async clear-input → optimistic render → RPC submit → AI or human branch.

### advanceRound
End on final round. close_debate_round fire-and-forget with pressure callback. Increment round. Round-end UI updates.

### startLiveRoundTimer
Countdown from ROUND_DURATION, advanceRound at 0.

### initLiveAudio
WebRTC event handler registration + joinDebate.

### toggleLiveMute
toggleMute() passthrough.

### addMessage
Append to debate.messages. Build DOM element. escapeHTML. Scroll.

### addSystemMessage
textContent system message. Scroll.

## Agent 10

### renderInputControls
Reads mode. Retrieves arena-input-area; returns if null. Switch on mode: text/ai → HTML with TEXT_MAX_CHARS maxlength, wires input (char count + resize + disable), click+keydown(Enter) → submitTextArgument; live → waveform + mic + status, mic click → toggleLiveMute; voicememo → VM HTML, wireVoiceMemoControls. Returns void.

### stopOpponentPoll
If opponentPollTimer set: clearInterval + set_opponentPollTimer(null). set_opponentPollElapsed(0). Returns void.

### startOpponentPoll
Calls stopOpponentPoll. Sets timer via setInterval(callback, OPPONENT_POLL_MS). Callback: increments elapsed by OPPONENT_POLL_MS/1000, checks timeout (stopOpponentPoll + addSystemMessage + re-enable inputs + return), awaits safeRpc get_debate_messages, finds oppMsg, if found: stopOpponentPoll + addMessage + re-enable inputs + advanceRound. Catch: silent. Returns void.

### submitTextArgument
Async. Gets textarea, returns if null/empty. Trims/clears/resets input, disables send. Reads currentDebate. Side = debate.role. addMessage(side, text, round, false). Conditional RPC. If AI: await handleAIResponse. Else: disable textarea, system message, placeholder simulation or startOpponentPoll. Returns void.

### advanceRound
Reads currentDebate. If round >= totalRounds: setTimeout 1500ms → void endCurrentDebate, return. Else: void close_debate_round RPC (non-placeholder, non-ai) with pressure callback. debate.round++. nudge. addSystemMessage. Update label. If live: startLiveRoundTimer. Returns void.

### startLiveRoundTimer
set_roundTimeLeft(ROUND_DURATION). clearInterval(roundTimer) if set. Get timerEl. set_roundTimer(setInterval(1000ms callback)). Callback: set_roundTimeLeft(roundTimeLeft - 1), update timerEl text and warning class, if roundTimeLeft <= 0: clearInterval + addSystemMessage + advanceRound. Returns void.

### initLiveAudio
Async. Reads currentDebate. Registers 8 onWebRTC callbacks: micReady (status + waveform), connected (status), disconnected (status + recovering flag), reconnecting (status + attempt/max), connectionFailed (status), muteChanged (btn class/text + status), tick (timer display), debateEnd (endCurrentDebate). Awaits joinDebate(debate.id, debate.role, debate.totalRounds). On catch: sets status text. Returns void.

### toggleLiveMute
Calls toggleMute(). Returns void.

### addMessage
Reads side, text, round, isAI. Gets arena-messages, returns if null. Reads currentDebate. Pushes to debate.messages if exists. Reads getCurrentProfile. Computes name (AI/me/opponent). Creates div element with class, sets innerHTML with escapeHTML(name) and escapeHTML(text). Appends. Scrolls. Returns void.

### addSystemMessage
Reads text. Gets arena-messages, returns if null. Creates div with system class. Sets textContent = text. Appends. Scrolls. Returns void.

## Agent 11

### renderInputControls
Mode-dependent control injection. text/ai: textarea with TEXT_MAX_CHARS + send btn disabled; three events wired. live: canvas + mic + status; mic click → toggleLiveMute. voicememo: VM layout; wireVoiceMemoControls called.

### stopOpponentPoll
Clears and nulls opponentPollTimer. Resets opponentPollElapsed to 0.

### startOpponentPoll
Stops prior. Creates interval polling at OPPONENT_POLL_MS. Tick increments elapsed. Timeout guard re-enables inputs and returns. Otherwise polls RPC, finds opponent message, stops polling, adds message, re-enables, advances round.

### submitTextArgument
Async. Guard and clear input. Optimistic local render. Non-placeholder RPC submit. AI branch or human branch.

### advanceRound
Final-round guard → endCurrentDebate after 1500ms. Otherwise: close_debate_round RPC (fire-and-forget, non-ai); increment round; nudge; system message; update label; start live timer if live.

### startLiveRoundTimer
Reset time to ROUND_DURATION. Clear existing timer. Start 1s countdown that updates DOM and triggers advanceRound at 0.

### initLiveAudio
Register 8 WebRTC event callbacks. joinDebate. Mic-blocked error fallback.

### toggleLiveMute
toggleMute() one-liner.

### addMessage
Append to debate.messages array. Build DOM message bubble. escapeHTML on name and text. Scroll to bottom.

### addSystemMessage
Build system message bubble via textContent. Scroll to bottom.
