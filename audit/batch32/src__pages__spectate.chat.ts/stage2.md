# Stage 2 Outputs — spectate.chat.ts

## Agent 01

### renderChatMessages
Pure function. Accepts `msgs: SpectatorChatMessage[]`, returns an HTML string. No DOM reads/writes, no state access, no async. Iterates `msgs` with `for...of`; for each message concatenates a `.sc-msg` wrapper with three spans: `.sc-msg-name` (escHtml(m.display_name)), `.sc-msg-text` (escHtml(m.message)), `.sc-msg-time` (timeAgo(m.created_at)). The closing `</div>` is written per iteration. Returns empty string `''` if `msgs` is empty. display_name and message are XSS-sanitized via escHtml; created_at goes through timeAgo without escaping — timeAgo returns a formatted relative string, created_at is not user-supplied. No error handling; exceptions from escHtml/timeAgo propagate to caller.

### refreshChatUI
Queries `#spec-chat-messages` (container) and `#chat-count` (countEl). Returns early if container is null. Branch 1 (empty): sets container.innerHTML to a static empty-state string, no scroll. Branch 2 (messages): calls renderChatMessages(state.chatMessages) and assigns result to container.innerHTML, then calls container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }) — unconditional scroll-to-bottom. countEl (if present) updated via textContent (safe) to '(N)' or ''. State reads: state.chatMessages (length + array). No error handling.

### wireChatUI
Parameter `d: SpectateDebate` is accepted but never read — dead parameter. Phase 1 (always): queries `#spec-chat-header`; if found, attaches click listener that toggles state.chatOpen, then lazily queries `#spec-chat-body` and `#chat-toggle` per click to toggle 'open' class. Phase 2: if !state.isLoggedIn, returns — guests get the toggle but no send wiring. Phase 3: queries `#chat-input` and `#chat-send`; if either null, returns. Declares closure local `let sending = false`. Wires sendBtn click → sendChat and keydown Enter (no Shift) → sendChat. No AbortController, no removeEventListener — calling wireChatUI twice stacks duplicate listeners, creating double-sends per click.

### sendChat
Re-entrancy guard: `if (sending) return`. Reads `input!.value.trim()` → msg; returns silently if empty or >280 chars (no user feedback for >280). Sets sending=true, disables sendBtn, clears input.value. Awaits safeRpc('send_spectator_chat', { p_debate_id: state.debateId, p_message: msg }). Branch A (error truthy): logs warning, restores input.value = msg. Branch B (data.success === false): logs warning, sets placeholder to data.error, schedules untracked setTimeout(2s) to reset placeholder; restores input.value unless error includes 'Slow down'. Branch C (success): resolves displayName from data?.display_name → getCurrentProfile()?.display_name → 'You'; pushes optimistic SpectatorChatMessage onto state.chatMessages with created_at: new Date().toISOString() and user_id from getCurrentUser(); calls refreshChatUI(). Does NOT update state.lastChatMessageAt. Catch: logs + restores input. Post-try (always): sending=false, sendBtn.disabled=false, input.focus(). Post-try block is NOT in a finally — a secondary exception in catch would skip cleanup, leaving button disabled permanently.

### startChatPolling
Guard: if state.chatPollTimer, clearInterval it. Sets state.chatPollTimer = setInterval(async callback, 6000). Timer stored on state — accessible externally but no formal destroy() function exported. Poll callback: awaits safeRpc('get_spectator_chat', { p_debate_id: state.debateId, p_limit: 100 }); error is not destructured (silently discarded). Guards freshChat null/empty → early return. Deduplication: if state.lastChatMessageAt set, filters freshChat where m.created_at > lastChatMessageAt (ISO string comparison, correct for UTC). If no lastChatMessageAt, uses all freshChat. Guard newMessages empty → return. Pushes newMessages, updates state.lastChatMessageAt to last message of full state.chatMessages array, calls refreshChatUI(). Catch is empty. refreshChatUI() call is OUTSIDE the try block — if it throws, the error becomes an unhandled rejection.

---

## Agent 02

### renderChatMessages
Pure function, no side effects. Iterates msgs array; for each m concatenates four string fragments into a `.sc-msg` div block. display_name and message escaped via escHtml. created_at passed through timeAgo — timeAgo output enters innerHTML without escaping. Return: HTML string. No null guard on msgs; passing null would throw TypeError. No null guard on individual message fields.

### refreshChatUI
Queries #spec-chat-messages (container) and #chat-count (countEl). Early return if container null. Branch: length===0 → static empty-state innerHTML, no scroll; length>0 → innerHTML = renderChatMessages result, then container.scrollTo unconditionally (always scrolls to bottom, will interrupt user scrolling up to read history). countEl.textContent set via ternary (safe). scrollTo fires immediately after innerHTML — layout reflow may not have completed, scrollHeight may be stale.

### wireChatUI
d: SpectateDebate never used. Header click toggle always wired. Auth guard: !state.isLoggedIn → return. Input/button null guard. sending closure bool. Duplicate-listener risk on re-call. sendBtn click → sendChat by reference. keydown Enter/no-Shift → sendChat().

### sendChat
sending guard. msg validation (empty/>280, silent for >280). Optimistic UI: sending=true, disabled=true, input cleared. safeRpc await. Branch A error: console.warn, restore input. Branch B success===false: placeholder = data.error, untracked setTimeout, conditional restore (skips if 'Slow down'). Branch C success: optimistic push to state.chatMessages, state.lastChatMessageAt NOT updated — next poll deduplication fails by timestamp, duplicate message rendered. Catch. Post-try cleanup (not finally — secondary throw skips cleanup). 

### startChatPolling
clearInterval guard, state.chatPollTimer set. p_limit:100 hardcoded. error not destructured from RPC call. freshChat null/empty guard. newMessages filter with string comparison. push + lastChatMessageAt update + refreshChatUI call. refreshChatUI outside try. Silent catch. No destroy() function — only accessible via state.chatPollTimer. Unbounded state.chatMessages growth.

---

## Agent 03

### renderChatMessages
Pure. Iterates msgs for...of. escHtml on display_name and message, timeAgo on created_at (not user-supplied, no escaping). Returns '' for empty array. created_at typed as string|undefined — timeAgo(undefined) behavior depends on its implementation. No crash path but possibly returns malformed output.

### refreshChatUI
getElementById for container and countEl. Early return if container null. Branch empty: static innerHTML. Branch non-empty: innerHTML = renderChatMessages result, scrollTo unconditionally. countEl textContent update (safe). scrollHeight read synchronously post-innerHTML assignment — browser reflow may not have completed, scroll may land short. Unbounded re-render on every call.

### wireChatUI
d never used. Toggle always wired; deferred DOM lookup in listener. isLoggedIn guard. sending = false. duplicate listener risk. No cleanup. sendBtn click → sendChat. keydown Enter → sendChat.

### sendChat
sending guard. Trim, empty/280 guards. Pre-await: sending=true, disabled, cleared. safeRpc await. Three branches. Success path: optimistic push without updating state.lastChatMessageAt → poll creates duplicate. setTimeout not clearable. Catch restores input. Post-try (not finally) resets flags.

### startChatPolling
clearInterval guard. setInterval 6000ms. No formal destroy() — CLAUDE.md requires destroy() function. error not captured from poll RPC. Filter by state.lastChatMessageAt. Unbounded array growth. refreshChatUI outside try. Empty catch.

---

## Agent 04

### renderChatMessages
Pure. Builds HTML per message. display_name + message escaped. created_at through timeAgo — inserted unescaped. Returns ''. No null guards on fields. The closing `</div>` is written per iteration (line 19 in source).

### refreshChatUI
Container and countEl queries. Early return on no container. Empty branch: static string. Non-empty branch: innerHTML = renderChatMessages, then unconditional scrollTo. countEl textContent = '(N)' or ''. state.chatMessages.length is array length (always safe integer), goes through textContent not innerHTML.

### wireChatUI
d: SpectateDebate unused. Header toggle unconditional. isLoggedIn guard. input/sendBtn null guard. sending closure. Duplicate listener risk on re-entry. No removeEventListener. sendChat wired to click + keydown Enter.

### sendChat
sending guard. >280 silent. Pre-flight: sending=true, disabled, cleared. safeRpc await. Error branch: restore. success===false: placeholder, untracked setTimeout race (multiple calls within 2s create racing timers), conditional restore (Slow down check fragile against localization). Success: optimistic push, lastChatMessageAt not updated, refreshChatUI. Catch. Post-try not-finally cleanup.

### startChatPolling
clearInterval guard. setInterval assigned to state.chatPollTimer. CLAUDE.md: destroy() required — this is accessible via state but no named function. RPC error discarded. Filter by lastChatMessageAt. Optimistic-message duplicate race. refreshChatUI outside try. Empty catch. Unbounded growth.

---

## Agent 05

### renderChatMessages
Pure, returns HTML string. escHtml on user fields. timeAgo output unescaped in innerHTML — inconsistent with other fields; created_at is not user-supplied so risk is theoretical. Empty array returns ''. No null guards on fields.

### refreshChatUI
Container/countEl queries. Early return if no container. Empty vs non-empty branch. Unconditional smooth scroll on non-empty — disrupts user scrolling up. countEl textContent update (safe). Unbounded DOM churn — full re-render on every call.

### wireChatUI
d never used (dead parameter). Header toggle always wired; lazy DOM lookup inside click listener. isLoggedIn guard. sending = false (new closure per call — duplicate listeners create independent sending guards, bypassing concurrency protection). No teardown. Click and keydown listeners stacked on re-call. This is a Medium bug if wireChatUI is ever called more than once per debate.

### sendChat
sending guard. >280 silent discard. Optimistic clear. safeRpc await. Three branches. Success: optimistic push with client timestamp, lastChatMessageAt not updated → next poll includes server copy → duplicate. rate-limit branch: untracked setTimeout, 'Slow down' string match fragile. Post-try not-finally cleanup — secondary catch exception leaves button stuck. state.debateId used directly without UUID validation (minor — named param, not .or() filter).

### startChatPolling
clearInterval guard. Interval on state.chatPollTimer — no destroy() export (violates CLAUDE.md rule). RPC error silently discarded. p_limit 100 can miss messages in bursts. Filter by lastChatMessageAt (ISO string comparison correct for UTC). Unbounded array. refreshChatUI outside try → unhandled rejection on DOM exception. Empty catch.
