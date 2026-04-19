# Stage 3 Verification — spectate.chat.ts

## Agent 01

### renderChatMessages (line 12)
**Verification**: PASS
**Findings**:
- LOW: `timeAgo(m.created_at)` output inserted into innerHTML without `escHtml()` wrapping. `created_at` is server-supplied ISO timestamp — not user-controlled, so exploitability is near-zero. However, project rule requires all data entering innerHTML to be escaped. Inconsistent with adjacent `escHtml(m.display_name)` and `escHtml(m.message)` calls.

### refreshChatUI (line 24)
**Verification**: PASS
**Findings**: None independent. Inherits LOW transitively from `renderChatMessages` via `container.innerHTML = renderChatMessages(state.chatMessages)`.

### wireChatUI (line 38)
**Verification**: PARTIAL — Stage 2 described "lazy DOM lookup" for the header element, which is incorrect. `#spec-chat-header` is queried eagerly at function entry; only `#spec-chat-body` and `#chat-toggle` are lazily queried inside the click callback.
**Findings**:
- MEDIUM: No listener teardown mechanism. Calling `wireChatUI` twice on the same DOM stacks duplicate `click` listeners on `#spec-chat-header` and duplicate `click`/`keydown` on `#chat-send`/`#chat-input`. Each duplicate fires independently — a single Enter keypress can submit chat N times after N calls. No `AbortController`, no `{ once: true }`, no stored handler reference.
- LOW: Parameter `d: SpectateDebate` is accepted but never read. `state.debateId` is used instead. Dead parameter — if state and the passed debate ever diverge, wrong debate ID is used silently.

### sendChat (line 58)
**Verification**: PASS
**Findings**:
- MEDIUM: Success branch pushes an optimistic message with `created_at: new Date().toISOString()` but does NOT update `state.lastChatMessageAt`. `startChatPolling` deduplicates by `m.created_at > state.lastChatMessageAt`. On the next poll tick, the server's copy of this message (with its own server timestamp ≥ `lastChatMessageAt`) passes the filter and is pushed again → user sees their own message duplicated after ~6 seconds.
- LOW: `msg.length > 280` returns silently with no user feedback — message discarded invisibly.
- LOW: `setTimeout(..., 2000)` handle for placeholder reset is not stored — cannot be cancelled on component teardown. If the input is unmounted before 2s, callback fires on a detached element.
- LOW: `sending = false; sendBtn.disabled = false; input.focus()` are sequential statements after the try/catch, not in a `finally` block. A secondary throw from within the `catch` block (unlikely) would skip cleanup and leave `sending` permanently `true` and the button disabled. Related to but distinct from the project's known "disable-button-no-finally" pattern (that pattern involved missing cleanup entirely; here cleanup runs for both normal-success and caught-error paths).

### startChatPolling (line 114)
**Verification**: PARTIAL — Stage 2 claim "refreshChatUI outside try" is factually wrong. `refreshChatUI()` is called INSIDE the try block.
**Findings**:
- MEDIUM: No exported `destroy()` or `stopChatPolling()` function. CLAUDE.md rule: "Every polling interval must be clearable via a `destroy()` function." Timer handle is stored in `state.chatPollTimer` (accessible externally) but no canonical stop API is exported. If spectate page unmounts without explicitly clearing the timer, the interval fires indefinitely.
- LOW: `safeRpc` error is not destructured in the poll callback — `const { data: rawFresh }` discards `error`. Non-exception RLS/auth errors are silently swallowed before reaching the catch block.
- LOW: `state.chatMessages` array has no maximum length. Grows unboundedly over long sessions.

---

## Agent 02

### renderChatMessages (line 12)
**Verification**: PASS
**Findings**: LOW: `timeAgo()` output unescaped in innerHTML. Not user-supplied in practice, but inconsistent with project XSS rule.

### refreshChatUI (line 24)
**Verification**: PASS
**Findings**: None.

### wireChatUI (line 38)
**Verification**: PARTIAL
**Findings**:
- MEDIUM: Duplicate listener accumulation on re-call.
- LOW: Unused `d` parameter.

### sendChat (line 58)
**Verification**: PASS
**Findings**:
- MEDIUM: Optimistic push without `state.lastChatMessageAt` update → duplicate message on next poll.
- LOW: >280 chars silent discard.
- LOW: `setTimeout` handle untracked.
- LOW: Cleanup not in `finally`.

### startChatPolling (line 114)
**Verification**: PARTIAL — `refreshChatUI` IS inside try (Stage 2 description error).
**Findings**:
- MEDIUM: No `destroy()` export.
- LOW: `error` not destructured from `safeRpc`.
- MEDIUM: Unbounded `state.chatMessages` growth.

---

## Agent 03

### renderChatMessages (line 12)
**Verification**: PASS
**Findings**: LOW: `timeAgo()` output unescaped.

### refreshChatUI (line 24)
**Verification**: PASS
**Findings**: None.

### wireChatUI (line 38)
**Verification**: PARTIAL
**Findings**:
- MEDIUM: Duplicate listener accumulation.
- LOW: Unused `d` parameter.

### sendChat (line 58)
**Verification**: PASS
**Findings**:
- MEDIUM: Optimistic push / stale `lastChatMessageAt` watermark → duplicate on poll.
- LOW: >280 silent discard.
- LOW: `setTimeout` untracked.
- LOW: Cleanup not in `finally`.

### startChatPolling (line 114)
**Verification**: PASS (confirms `refreshChatUI` inside try)
**Findings**:
- MEDIUM: No `destroy()` export — CLAUDE.md rule violation.
- LOW: `error` silently discarded.
- MEDIUM: Unbounded array growth.

---

## Agent 04

### renderChatMessages (line 12)
**Verification**: PASS
**Findings**: LOW: `timeAgo()` output unescaped. Created_at is programmer-controlled (ISO string), so risk is theoretical.

### refreshChatUI (line 24)
**Verification**: PASS
**Findings**: None.

### wireChatUI (line 38)
**Verification**: PARTIAL
**Findings**:
- MEDIUM: Duplicate listener accumulation on re-call.
- LOW: `d` parameter dead.

### sendChat (line 58)
**Verification**: PASS
**Findings**:
- MEDIUM: `lastChatMessageAt` not updated in success branch → duplicate message on poll.
- LOW: Silent >280 discard.
- LOW: `setTimeout` handle untracked.
- LOW: Cleanup not in `finally`.

### startChatPolling (line 114)
**Verification**: PARTIAL — Stage 2 "refreshChatUI outside try" incorrect.
**Findings**:
- MEDIUM: No `destroy()` export.
- LOW: `error` from safeRpc discarded.
- MEDIUM: Unbounded array growth.

---

## Agent 05

### renderChatMessages (line 12)
**Verification**: PASS
**Findings**: LOW: `timeAgo()` unescaped in innerHTML. Project rule applies; `created_at` is server data in user context.

### refreshChatUI (line 24)
**Verification**: PASS
**Findings**: None.

### wireChatUI (line 38)
**Verification**: PASS (no description inaccuracy noted)
**Findings**:
- LOW: `d` parameter declared, never used. State divergence between `state.debateId` and `d.id` would silently use wrong debate.
- MEDIUM: No listener teardown (same finding).

### sendChat (line 58)
**Verification**: PASS
**Findings**:
- MEDIUM: Success branch does not update `state.lastChatMessageAt` → poll deduplication fails → duplicate messages.
- LOW: >280 silent.
- LOW: `setTimeout` untracked.

### startChatPolling (line 114)
**Verification**: PASS (confirms `refreshChatUI` inside try)
**Findings**:
- LOW: No `destroy()` export (CLAUDE.md rule violation).
- LOW: Duplicate message accumulation compound with sendChat.
- LOW: No explicit deduplication by message ID.

---

## Cross-Agent Consensus

**Stage 2 error confirmed**: All 5 Stage 3 agents verified that `refreshChatUI()` is called INSIDE the try block in `startChatPolling`. Stage 2 claim "refreshChatUI outside try" was incorrect.

| Anchor | PASS | PARTIAL | FAIL | Consensus Findings |
|--------|------|---------|------|--------------------|
| renderChatMessages | 5 | 0 | 0 | LOW: timeAgo unescaped |
| refreshChatUI | 5 | 0 | 0 | None |
| wireChatUI | 1 | 4 | 0 | MEDIUM: duplicate listeners; LOW: unused d param |
| sendChat | 4 | 1 | 0 | MEDIUM: lastChatMessageAt not updated → dup; LOW: silent 280, setTimeout untracked, cleanup not finally |
| startChatPolling | 2 | 3 | 0 | MEDIUM: no destroy(); LOW: error dropped, unbounded growth |

**needs_review**: None

## Consolidated Findings for Batch Report

| Severity | Location | Finding |
|----------|----------|---------|
| MEDIUM | sendChat (line 85–93) | Optimistic push does not update `state.lastChatMessageAt` — next poll includes server copy → duplicate message rendered |
| MEDIUM | wireChatUI (lines 105–111) | No listener teardown — duplicate click/keydown handlers stack on re-call, bypassing `sending` guard |
| MEDIUM | startChatPolling (line 116) | No `destroy()` export — violates CLAUDE.md setInterval rule; timer stored on `state.chatPollTimer` but no formal stop API |
| LOW | renderChatMessages (line 18) | `timeAgo(m.created_at)` output enters innerHTML unescaped — inconsistent with project XSS rule (created_at is server data, exploitability theoretical) |
| LOW | wireChatUI (line 38) | Parameter `d: SpectateDebate` never read — dead parameter |
| LOW | sendChat (line 61) | Message >280 chars discarded silently with no user feedback |
| LOW | sendChat (line 80) | `setTimeout` handle for placeholder reset not stored — untrackable, fires on detached elements |
| LOW | sendChat (lines 100–102) | Cleanup (`sending=false, disabled=false, focus`) after try/catch but not in `finally` — secondary catch throw would leave button disabled |
| LOW | startChatPolling (line 118) | `safeRpc` `error` field not destructured — RPC-level errors silently discarded before catch |
| LOW | startChatPolling (line 125) | `state.chatMessages` grows without bound — no max-length eviction |
