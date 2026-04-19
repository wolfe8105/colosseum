# Stage 3 Outputs — arena-feed-wiring.ts

## Agent 01

### renderControls
CONFIRM: All three branches (mod/spectator/debater) and their innerHTML templates are correctly described. CONFIRM: `wireModControls()` called synchronously for mod view. CONFIRM: `void wireSpectatorTipButtons(debate)` is fire-and-forget for spectator. CONFIRM: `wireDebaterControls(debate)` called synchronously for debater. CONFIRM: `escapeHTML` applied to debater names in mod and spectator branches. CONFIRM: `FEED_SCORE_BUDGET[1..5]` interpolated in mod branch. CONFIRM: `challengesRemaining` interpolated in debater branch. No errors found.

### wireDebaterControls
CONFIRM: Four DOM queries, all nullable. CONFIRM: textarea input listener adjusts send disabled and height (max 120px). CONFIRM: send button click fires `submitDebaterMessage()` void. CONFIRM: keydown Enter-without-Shift fires `submitDebaterMessage()`. CONFIRM: finish click calls `finishCurrentTurn()`. CONFIRM: concede click confirms, guards null/already-conceded, sets `d.concededBy = d.role`, calls clearFeedTimer/stopTranscription/clearInterimTranscript. CONFIRM: conditional `setDebaterInputEnabled(false)` on `!d.modView`. CONFIRM: feedPaused cleanup block runs if `feedPaused`. CONFIRM: `writeFeedEvent` is fired without await (void). CONFIRM: `startFinalAdBreak(d)` called. CONFIRM: cite/challenge buttons wired with feedPaused guard. No errors found.

### wireSpectatorTipButtons
CONFIRM: Async function. CONFIRM: tier initialized to 'Unranked'. CONFIRM: safeRpc 'get_user_watch_tier' awaited in try-catch. CONFIRM: two data shapes checked (array and object). CONFIRM: 'Unranked' early-return path correct. CONFIRM: enables buttons and sets statusEl for non-Unranked. CONFIRM: click listeners added per button, calling handleTip without await. No errors found.

### handleTip
CONFIRM: side and amount read from dataset. CONFIRM: early return on falsy. CONFIRM: all buttons disabled immediately. CONFIRM: safeRpc 'cast_sentiment_tip' awaited. CONFIRM: error/null path re-enables and returns. CONFIRM: result.error cases mapped to correct toast messages. CONFIRM: sentiment setters called correctly (pendingSentimentA or B). CONFIRM: applySentimentUpdate called. CONFIRM: 800ms setTimeout for re-enable. CONFIRM: catch block re-enables. No errors found.

### wireModControls
CONFIRM: input/send/keydown listeners wired. CONFIRM: delegated click on feed-stream handles pin, cite-claim, and comment selection in that order. CONFIRM: score button budget check uses FEED_SCORE_BUDGET and scoreUsed correctly. CONFIRM: safeRpc 'score_debate_comment' fired as .then chain. CONFIRM: button re-enabled on error. CONFIRM: selection cleared and score row hidden after submission. CONFIRM: score-cancel wired. CONFIRM: eject-a/b and null buttons wired with confirm + modNullDebate. No errors found.

FINDING — MISSING RE-ENABLE ON SUCCESSFUL SCORE: In `wireModControls`, when a score is successfully submitted (no error from `score_debate_comment`), the score button is NOT re-enabled. The `.then()` handler only re-enables on error. The button is permanently disabled after one successful score submission. This means a moderator can only score each button once per page load. Whether this is intentional (each score button should be one-shot per round, budget-tracked) or a bug depends on design intent. The `FEED_SCORE_BUDGET` system tracks usage counts, suggesting each score type has a usage budget — but if the button stays disabled after the first use regardless of budget, that contradicts the budget system. SEVERITY: Medium. Needs clarification.

### submitDebaterMessage
CONFIRM: currentDebate null guard. CONFIRM: textarea null/blank/disabled guard. CONFIRM: text trimmed and textarea cleared. CONFIRM: optimistic appendFeedEvent called with UUID. CONFIRM: writeFeedEvent awaited. No errors found.

### submitModComment
CONFIRM: currentDebate null guard. CONFIRM: textarea null/blank guard. CONFIRM: optimistic appendFeedEvent called. CONFIRM: writeFeedEvent awaited. No errors found.

### handlePinClick
CONFIRM: currentDebate null guard. CONFIRM: eid absent or contains '-' check is the correct guard for unconfirmed UUIDs (client-generated IDs contain hyphens; server-confirmed integer IDs do not). CONFIRM: pointerEvents blocked before async call. CONFIRM: safeRpc 'pin_feed_event' awaited. CONFIRM: error path shows toast and returns. CONFIRM: pinnedEventIds set toggled. CONFIRM: CSS classes toggled on btn and parent. CONFIRM: pointerEvents restored in finally. No errors found.

## Agent 02

### renderControls
CONFIRM. All behavior matches source. One note: the score row is initially `style="display:none;"` — consistent with wireModControls showing it only when a comment is selected.

### wireDebaterControls
CONFIRM. One nuance: `writeFeedEvent` fires without await and the function returns (calls `startFinalAdBreak` synchronously after the void fire). The concede event is broadcast via the RPC chain but the local state has already been updated before the RPC completes.

FINDING — CONCEDE DOES NOT DISABLE SEND BUTTON: The concede handler sets `d.concededBy = d.role` and conditionally calls `setDebaterInputEnabled(false)` only if `!d.modView`. However, after concede, if `d.modView` is true, the send button remains enabled. This may allow a debater in a mod-view context to continue sending messages after conceding. Needs review. SEVERITY: Low.

### wireSpectatorTipButtons
CONFIRM. Note: `FEED_MAX_CHALLENGES` is imported but not used in this function — it appears to be imported but never referenced in the module at all (only `FEED_SCORE_BUDGET` is referenced in wireModControls).

FINDING — UNUSED IMPORT: `FEED_MAX_CHALLENGES` is imported from `./arena-types.ts` (lines 24-26) but never referenced in any function in this file. Dead import. SEVERITY: Low (lint issue).

### wireModControls
FINDING — SCORE BUTTON NOT RE-ENABLED AFTER SUCCESSFUL SCORE: Already noted. Confirmed by reading the .then handler: `(btn as HTMLButtonElement).disabled = false` is only inside the `if (error)` branch. On successful RPC, the button stays disabled permanently.

FINDING — SCORE SELECTION CLEAR HAPPENS OUTSIDE .then(): The `selected.classList.remove('feed-evt-selected')` and score row hide happen synchronously after calling `.then()`, before the RPC completes. This means if the RPC fails and the user sees an error toast, the visual selection has already been cleared. The re-enabled button has no selected event to score. This could be confusing UX. SEVERITY: Low.

### handlePinClick
CONFIRM. The '-' check relies on the fact that client-side UUIDs contain hyphens while server-confirmed integer event IDs do not. This is a correct approach given the optimistic rendering pattern.

### submitDebaterMessage
CONFIRM. Note the `appendFeedEvent` is called synchronously (optimistic render) before the awaited `writeFeedEvent`. If `writeFeedEvent` fails, the optimistic render is not rolled back. Potential ghost message.

FINDING — NO ROLLBACK ON writeFeedEvent FAILURE: In `submitDebaterMessage`, `appendFeedEvent` renders the message locally before `writeFeedEvent` is awaited. If `writeFeedEvent` throws or returns an error, the local message persists with no rollback logic. SEVERITY: Medium.

## Agent 03

### renderControls
CONFIRM. All three branches verified against source. The spectator branch reads `debate.debaterAName || 'Side A'` (not just 'A' as the debater names default). Confirmed correct.

### wireDebaterControls
CONFIRM. Multiple confirmations. The concede path calls `getCurrentProfile()?.display_name || 'Debater'` — note that `submitDebaterMessage` uses `display_name || username || 'You'` but the concede path only falls back to 'Debater', not to `username`. Minor inconsistency.

FINDING — CONCEDE DISPLAY NAME FALLBACK INCONSISTENCY: The concede handler uses `getCurrentProfile()?.display_name || 'Debater'` while `submitDebaterMessage` uses `profile?.display_name || profile?.username || 'You'`. If a user has no display_name but has a username, the concede broadcast will say "Debater has conceded" instead of their username. SEVERITY: Low.

### wireSpectatorTipButtons
CONFIRM. Note: after wiring click listeners, `wireSpectatorTipButtons` returns (the promise resolves). There is no mechanism to re-check the tier if the user's tier changes during the session.

### handleTip
CONFIRM. The 800ms setTimeout callback uses `allBtns` captured earlier in the outer function scope via `Array.from(document.querySelectorAll('.feed-tip-btn'))`. If the DOM changes (e.g., `renderControls` is called again) between the click and the 800ms timeout, `allBtns` might reference stale elements. The re-enable would succeed (still DOM elements) but if new buttons were injected by a new `renderControls` call, those new buttons would not be in `allBtns`.

FINDING — STALE allBtns REFERENCE IN setTimeout: The 800ms timeout in `handleTip` re-enables buttons using `allBtns`, a variable captured before the async RPC call. If `renderControls` is re-invoked between the click and the timeout, new DOM elements would not be in the captured array. This could leave new buttons in a disabled state. SEVERITY: Low.

### wireModControls
CONFIRM on all wiring. CONFIRM FINDING: score button not re-enabled on success.

FINDING — NULL DEBATE BUTTONS VISIBLE TO MOD: The eject-a, eject-b, and null buttons are always visible in the moderator controls. There is no guard preventing a moderator from ejecting a debater who has already conceded or from null-ing a debate that has already ended. The RPC on the server side would presumably reject these, but the UI provides no visual feedback that the debate is in a terminal state. SEVERITY: Low.

### submitDebaterMessage
CONFIRM. No rollback on writeFeedEvent failure — confirmed finding from Agent 02.

### submitModComment
CONFIRM. Same pattern as submitDebaterMessage — no rollback on writeFeedEvent failure. Ghost message possible.

### handlePinClick
CONFIRM. One note: `Number(eid)` where eid is a non-UUID server integer — if `eid` is somehow malformed (e.g., not a valid integer string), `Number(eid)` would produce `NaN`. The RPC would receive `NaN` as `p_feed_event_id`. Server-side behavior with NaN is unclear but likely results in an error, which is handled. Risk is low but validation could be added.

## Agent 04

### renderControls
CONFIRM. All three branches verified.

### wireDebaterControls
CONFIRM. All listener wiring verified.

FINDING — CITE/CHALLENGE BUTTONS NOT DISABLED WHEN DEBATE ENDS: The cite and challenge buttons are disabled initially but their click handlers only check `feedPaused`. After `startFinalAdBreak` is called (which fires when the debate ends or a debater concedes), the buttons remain visible and their `feedPaused` guard may not prevent interaction if `feedPaused` was not set to true by `startFinalAdBreak`. Needs cross-check with `arena-feed-machine.ts` to confirm `startFinalAdBreak` sets `feedPaused`. SEVERITY: Medium (potential post-concede action).

### wireSpectatorTipButtons
CONFIRM.

### handleTip
CONFIRM.

### wireModControls
CONFIRM. The delegated click handler on `feed-stream` runs `querySelectorAll('.feed-evt-selected').forEach(el => el.classList.remove('feed-evt-selected'))` before adding the class to the new target. This correctly deselects any previously selected items.

FINDING — SCORE ROW NEVER HIDDEN ON NON-COMMENT CLICK: The score row is shown when a comment is selected. It is hidden only by (a) successfully scoring a comment or (b) clicking `feed-score-cancel`. Clicking anywhere outside the stream (or on a non-comment area of the stream) does not hide the score row. If the selected comment's event element is removed from the DOM (e.g., by a new batch of feed events), the selection state persists in the score row UI. SEVERITY: Low.

### submitDebaterMessage
CONFIRM. No rollback on failure confirmed.

### submitModComment
CONFIRM. No rollback confirmed.

### handlePinClick
CONFIRM.

## Agent 05

### renderControls
CONFIRM. One observation: the spectator tip buttons start with `disabled` attribute. `wireSpectatorTipButtons` asynchronously enables them after checking the user's tier. This means there is a window where the buttons exist in DOM but are disabled while the RPC call is in-flight. This is intentional UX but means the async function must complete for any interactivity.

### wireDebaterControls
CONFIRM. The concede handler accesses `currentDebate` (module variable) not `debate` (parameter) for the actual concede logic. This is correct — the parameter is for initial setup, and by the time the user clicks, `currentDebate` should be the live debate object.

### wireSpectatorTipButtons
CONFIRM. The function does not handle the case where `safeRpc` returns `data` that is null AND `error` is also null (both falsy). In that case, `tier` stays 'Unranked' and the function returns early. This is a safe degradation.

### handleTip
CONFIRM. Note: the `result.error` check uses string equality, not a typed enum. If the server introduces a new error code, it falls through to the generic toast. This is safe but means new error codes won't produce specific messages without a code change.

### wireModControls
CONFIRM.

FINDING — SCORE COMMENT NOT RE-ENABLED ON SUCCESS (confirmed): The score button is permanently disabled after one successful score_debate_comment RPC call. With the budget system (`FEED_SCORE_BUDGET`), a moderator should be able to score `limit` comments at each point value per round. But if the button is disabled after the first, they can only score once per session. The `updateBudgetDisplay()` call from `appendFeedEvent` (triggered by Realtime's point_award event) would update badge counts but cannot re-enable the button.

### submitDebaterMessage
CONFIRM.

### submitModComment
CONFIRM.

### handlePinClick
CONFIRM. The `eid.includes('-')` check is the only validation before calling `Number(eid)`. Server-confirmed IDs are integers without hyphens. The check is correct for this pattern.

## Agent 06

### renderControls
CONFIRM. All paths verified. CONFIRM: `FEED_MAX_CHALLENGES` is imported but only `FEED_SCORE_BUDGET` is used in this file — confirms the dead import finding.

### wireDebaterControls
CONFIRM. Additional note: the challenge-button label in the rendered HTML interpolates `challengesRemaining` at render time (into the innerHTML string). The label is NOT updated dynamically if `challengesRemaining` changes after render. `wireDebaterControls` does not attach any listener to update the challenge button label. The count shown could be stale if challenges are consumed.

FINDING — CHALLENGE BUTTON LABEL IS STATIC AFTER RENDER: The challenge button's label (`CHALLENGE (${challengesRemaining})`) is set once via innerHTML in `renderControls`. Subsequent changes to the `challengesRemaining` module variable do not update the button label. The displayed count may be stale. SEVERITY: Low-Medium (UI desync, not a data bug).

### wireSpectatorTipButtons
CONFIRM.

### handleTip
CONFIRM. The success path does not decrement any local token balance. Token deduction is tracked server-side. `new_balance` is in the result type but is never read or displayed.

FINDING — new_balance RETURN VALUE IGNORED: The `cast_sentiment_tip` RPC returns `new_balance` in its result, but `handleTip` does not display or store the updated balance. If the app shows a token balance elsewhere, it may become stale after a tip. SEVERITY: Low (cosmetic/UX).

### wireModControls
CONFIRM all findings.

### submitDebaterMessage
CONFIRM. The `round` variable accessed is the module-level `round` imported from `./arena-feed-state.ts`. It reflects the current round at send time.

### submitModComment
CONFIRM.

### handlePinClick
CONFIRM.

## Agent 07

### renderControls
CONFIRM.

### wireDebaterControls
CONFIRM. Key point: `startFinalAdBreak(d)` is called inside the concede click handler after `void writeFeedEvent(...)`. This means the ad break starts while the RPC to broadcast the concession is still in-flight. Race condition: the ad break UI could appear before other participants receive the concession event.

FINDING — RACE: startFinalAdBreak RUNS BEFORE writeFeedEvent COMPLETES: In the concede handler, `startFinalAdBreak(d)` is called after `void writeFeedEvent(...)`, but since writeFeedEvent is not awaited, the ad break starts while the concession broadcast RPC is in-flight. Other participants may see the ad break transition before they receive the concession speech event via Realtime. SEVERITY: Medium (visual race, not data-integrity issue).

### wireSpectatorTipButtons
CONFIRM.

### handleTip
CONFIRM. One detail verified: both `if (!error && data && Array.isArray(data) && data[0])` and `else if (!error && data && typeof data === 'object' && 'tier' in data)` are checked. If `safeRpc` returns an array that has a falsy first element, the first branch fails and the second branch also fails (arrays are objects, and a typed array might have 'tier' on it, but `data[0]` being falsy means the tier wasn't extracted). In this edge case, tier stays 'Unranked'. Safe.

### wireModControls
CONFIRM all findings previously noted.

FINDING — stopPropagation IN DELEGATED HANDLER PREVENTS OTHER STREAM LISTENERS: The delegated click handler calls `e.stopPropagation()` for pin clicks and cite-claim clicks. This prevents any other event listeners attached above `feed-stream` in the DOM hierarchy from receiving these clicks. If other components also listen on a parent element for click events in feed-stream, they will be blocked. Whether this is intentional or a side effect is unclear without checking parent element listeners. SEVERITY: Low.

### submitDebaterMessage
CONFIRM.

### submitModComment
CONFIRM.

### handlePinClick
CONFIRM. The return statement inside the try block after `if (error)` means the finally block still runs (pointer events restored). Correct.

## Agent 08

### renderControls
CONFIRM.

### wireDebaterControls
CONFIRM. Confirmed: the concede block uses `const d = currentDebate` — so `d` is the live module variable, not the `debate` parameter. If `currentDebate` has been replaced since `wireDebaterControls` was called (e.g., the user joins a new debate), the concede handler would operate on the new debate. However, since `renderControls` would be re-called for each new debate, a new concede listener would be attached to a new element, so the old one wouldn't fire. Safe.

### wireSpectatorTipButtons
CONFIRM.

### handleTip
CONFIRM.

### wireModControls
CONFIRM. Additional finding:

FINDING — safeRpc SCORE PROMISE NOT AWAITED, SUCCESS BRANCH NOT HANDLED: The `safeRpc('score_debate_comment', ...)` is called via `.then()` chain but is NOT awaited at the call site (wrapped in `void` cast). This is fire-and-forget. The `then()` callback handles only the error case. The success case (no error) has no callback — `(btn as HTMLButtonElement).disabled = false` is commented as "Budget update happens via appendFeedEvent when the point_award arrives via Realtime." So the re-enable intentionally does NOT happen on success — the button stays disabled and the badge count updates via Realtime. This clarifies the "score button not re-enabled" finding: it IS intentional. The badge count depletes; if the budget is exhausted, the button stays permanently disabled. If not exhausted, the button is still permanently disabled, which seems like a bug — a moderator can only score each point value once per round per page-load even if the budget allows more. SEVERITY: Medium (design ambiguity; likely unintentional permanent disable).

### submitDebaterMessage
CONFIRM.

### submitModComment
CONFIRM.

### handlePinClick
CONFIRM.

## Agent 09

### renderControls
CONFIRM.

### wireDebaterControls
CONFIRM.

### wireSpectatorTipButtons
CONFIRM.

### handleTip
CONFIRM. One consistency check: in the error toast for `result.error === 'unranked_blocked'`, the message is 'Watch a full debate to unlock tipping' — this matches the message set in `wireSpectatorTipButtons` for Unranked tier, which is 'Watch a full debate to unlock tipping.' Consistent.

### wireModControls
CONFIRM.

FINDING — updateBudgetDisplay CALLED ON EVERY COMMENT SELECTION: Every time a comment is selected in the feed stream, `updateBudgetDisplay()` is called. This refreshes the score button badges. However, `updateBudgetDisplay` is imported from `arena-feed-ui.ts` and its exact behavior is not visible in this file. If it is expensive or has side effects, calling it on every click could be costly. Needs cross-check. SEVERITY: Low.

### submitDebaterMessage
CONFIRM.

### submitModComment
CONFIRM.

### handlePinClick
CONFIRM.

## Agent 10

### renderControls
CONFIRM. The mod view renders the score row with `style="display:none;"` initially. The challenge-related buttons in the debater view start disabled. These are consistent with how the wire functions enable/disable controls.

### wireDebaterControls
CONFIRM. The cite-btn and challenge-btn event listeners reference the `debate` parameter (the argument to `wireDebaterControls`) via closure, not `currentDebate`. If `currentDebate` is later replaced, the dropdown functions receive the original debate object. This could be incorrect if the debate state changes. But since `renderControls` (and thus `wireDebaterControls`) is re-called on new debates, the closure captures the correct debate for that render cycle.

### wireSpectatorTipButtons
CONFIRM.

### handleTip
CONFIRM.

### wireModControls
CONFIRM. The feed-stream delegated click finds `closest('.feed-evt-a, .feed-evt-b')`. This correctly handles nested child elements within an event row (e.g., clicking on the text inside the event bubble triggers selection on the parent row).

### submitDebaterMessage
CONFIRM.

### submitModComment
CONFIRM.

### handlePinClick
CONFIRM.

FINDING — handlePinClick RETURNS INSIDE TRY BLOCK ON ERROR WITHOUT CLEANUP: When `pin_feed_event` returns an error, the function calls `return` inside the `try` block after logging/showing toast. The `finally` block still runs (restoring pointerEvents). But the function does not indicate to the caller that the pin failed — it just returns void. Since callers fire it as `void handlePinClick(...)` with no await, there is no error propagation. This is consistent with the rest of the module's error handling pattern. Not a bug, just an observation.

## Agent 11

### renderControls
CONFIRM. All branches verified against source. One additional note: the moderator score-row renders `FEED_SCORE_BUDGET[1]`, `FEED_SCORE_BUDGET[2]`, etc. inline in the badge spans. At the time of render, these are the static budget values from the constant — they are NOT updated dynamically. If the budget values could change mid-session (unlikely given they are exported constants), the badges would be stale.

### wireDebaterControls
CONFIRM. Confirmed: `pauseFeed` is imported but never called in this file (it is in the import list on line 39 from `arena-feed-machine.ts`). Only `clearFeedTimer`, `finishCurrentTurn`, and `startFinalAdBreak` from that import are actually used.

FINDING — UNUSED IMPORT: `pauseFeed` is imported from `./arena-feed-machine.ts` (line 39) but never called anywhere in `arena-feed-wiring.ts`. Dead import. SEVERITY: Low.

### wireSpectatorTipButtons
CONFIRM.

### handleTip
CONFIRM. All four error code mappings verified: 'insufficient_tokens'→'Not enough tokens', 'unranked_blocked'→'Watch a full debate to unlock tipping', 'debate_not_live'→'Debate is no longer live', else→'Tip failed'. All verified against source.

### wireModControls
CONFIRM. Additional note: the `safeRpc('score_debate_comment', ...)` is called as `void safeRpc(...).then(...)` — the `void` operator discards the outer Promise returned by `safeRpc`, but the `.then()` callback still executes when the Promise resolves. So the then handler fires. The `void` just suppresses the unhandled-rejection linting warning by indicating the promise result is intentionally ignored at the call site. This is correct TypeScript idiom.

### submitDebaterMessage
CONFIRM. Verified: `debate.role` is read from the parameter (not from `currentDebate`). Since `submitDebaterMessage` reads `currentDebate` for null-guarding but uses `debate.role` (from `currentDebate` captured by closure via the module variable) — wait, actually `submitDebaterMessage` has no parameters. It reads `const debate = currentDebate`. So `debate.role` is from `currentDebate`. Correct.

### submitModComment
CONFIRM.

### handlePinClick
CONFIRM. The `eid.includes('-')` check works because Postgres integer IDs never contain hyphens, while UUID v4 strings always contain hyphens. The boundary condition (eid === '') is also caught by `!eid`. Correct guard logic.

## Consolidated Findings Summary

**REAL — Medium severity:**
1. **SCORE BUTTON NOT RE-ENABLED AFTER SUCCESSFUL SCORE** (wireModControls): The `(btn as HTMLButtonElement).disabled = false` is inside the `if (error)` branch of the `.then()` handler only. After a successful `score_debate_comment` RPC, the button stays permanently disabled. The comment says budget updates come via Realtime, but does not re-enable the button. If the budget allows multiple scores of the same point value, only the first can be submitted per page-load. This is likely unintentional.

2. **NO ROLLBACK ON writeFeedEvent FAILURE** (submitDebaterMessage, submitModComment): `appendFeedEvent` optimistically renders a message before `writeFeedEvent` completes. On failure, there is no rollback. Ghost messages can appear locally that were never persisted.

3. **RACE: startFinalAdBreak RUNS BEFORE writeFeedEvent COMPLETES** (wireDebaterControls concede path): The ad break starts while the concession broadcast RPC is still in-flight. Other participants may see the transition before they receive the concession event.

4. **CHALLENGE BUTTON LABEL IS STATIC AFTER RENDER** (wireDebaterControls/renderControls): The challenge count label is set once in innerHTML and never updated if `challengesRemaining` changes.

**REAL — Low severity:**
5. **UNUSED IMPORT: FEED_MAX_CHALLENGES** (line 24-26): Imported but never referenced.
6. **UNUSED IMPORT: pauseFeed** (line 39): Imported but never called.
7. **CONCEDE DISPLAY NAME FALLBACK INCONSISTENCY**: submitDebaterMessage falls back through username to 'You'; concede path only falls back to 'Debater'.
8. **new_balance RETURN VALUE IGNORED**: cast_sentiment_tip returns new_balance, never displayed.
9. **STALE allBtns IN setTimeout**: handleTip captures button list before async call; re-render between click and 800ms timeout could leave new buttons disabled.
