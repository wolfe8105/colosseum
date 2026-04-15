# Stage 3 Verification — arena-feed-spec-chat.ts

Source: src/arena/arena-feed-spec-chat.ts
Anchor list: 7 functions (from stage1_5-anchor.md)
Agents: 5 parallel

---

## initSpecChat (line 46)

**Consensus: PARTIAL**

The Stage 2 description is functionally accurate on all wiring steps and their ordering. Two structural omissions noted across agents:

1. `activeDebateId = debateId` and `chatOpen = false` are written on lines 47–48, **before** the `panel` null check on line 51. If the panel element is absent the function returns early, but `activeDebateId` has already been set to the new `debateId` value and `chatOpen` has been reset to `false`. No poll is started, and no DOM is built — the state write is stranded. `cleanupSpecChat` would recover it, but a caller that detects the missing panel and does not call `cleanupSpecChat` would leave `activeDebateId` pointing at a debate with no active poll. Stage 2 does not flag this sequencing consequence.

2. The `<div class="spec-chat-send-error" id="spec-chat-send-error" style="display:none;">` element (source line 81) is rendered **unconditionally** — outside both the `isLoggedIn` and the else branch — meaning it is always injected into the DOM regardless of auth state. Stage 2 does not note this; it only mentions the error div in the context of `handleSend`. For a guest user the div exists but is never written by any code path, so it is harmless.

**needs_review:** `activeDebateId` mutation before panel null check (line 47–51). If `initSpecChat` is called on a page where `feed-spec-chat-panel` is absent, state is partially written with no polling started. Recoverable via `cleanupSpecChat` but undocumented.

---

## cleanupSpecChat (line 108)

**Consensus: PASS** (one agent noted a gap, others PASS)

The description accurately captures: conditional `clearInterval` + null, unconditional reset of `lastMessageTime`, `activeDebateId`, `chatOpen`, no DOM manipulation.

**needs_review (low):** `cleanupSpecChat` does not cancel the `setTimeout` that `handleSend` schedules on line 204 to auto-hide the error element after 3 seconds. If `cleanupSpecChat` is called while that timer is in-flight, the callback fires against a detached (or still-attached-but-irrelevant) element. Since the callback only writes `style.display = 'none'` against a captured local reference, it is a no-op on a detached node and not a crash risk. Low severity.

---

## toggleSpecChat (line 120)

**Consensus: PASS**

All five agents confirmed the description is accurate and complete. `chatOpen` inverted, body display `'flex'`/`'none'`, toggle text `'▲'`/`'▼'`, `scrollToBottom()` called only when `chatOpen` becomes `true`. No omissions.

---

## loadMessages (line 129)

**Consensus: PARTIAL**

All described logic is accurate. The primary omission: Stage 2 says "deduplication: if newest created_at === lastMessageTime return" without noting what `newest` is — specifically `msgs[msgs.length - 1].created_at` (the last element of the server-returned array, line 140). This deduplication is correct **only if the RPC returns rows in ascending chronological order**. No client-side sort is applied; the assumption is implicit.

**needs_review (medium):** Timestamp deduplication fragility. Two scenarios can cause missed renders:
- If `get_spectator_chat` returns rows in non-ascending order, `lastMessageTime` is set to a non-latest timestamp and subsequent polls may be silently skipped.
- If two messages share an identical `created_at` string, and the second arrives in a later poll, `newest === lastMessageTime` fires as `true` despite new content — the render is skipped.

**needs_review (low):** No concurrency guard. `loadMessages` is called from both the `setInterval` (every 5 s) and from `handleSend`'s success path (`await loadMessages()`, line 210). Concurrent executions share `lastMessageTime` state and can produce a redundant double-render on rapid send. Low severity in practice.

---

## renderMessages (line 150)

**Consensus: PARTIAL — SECURITY FINDING (HIGH)**

The description is accurate on: early return if container absent, empty-array → placeholder + return (no `scrollToBottom`), `getCurrentProfile()` for `myId`, `escapeHTML(display_name)` and `escapeHTML(message)` in span content, `encodeURIComponent(m.id)` and `encodeURIComponent(m.message)` in the `onclick` attribute, `container.innerHTML` assignment, `scrollToBottom()` after non-empty render.

One minor omission: `isMine ? 'mine' : ''` produces `class="spec-chat-msg "` (trailing space) for non-own messages. Cosmetic.

**needs_review — HIGH — XSS in `renderMessages` onclick (line 171):**

```typescript
onclick="window.location.href='mailto:reports@themoderator.app?subject=Spectator+Chat+Report&body=Message+ID:+${encodeURIComponent(m.id)}%0AContent:+${encodeURIComponent(m.message)}'"
```

All five agents independently confirmed this is a stored XSS vector.

**Root cause:** The `onclick` attribute uses double-quote outer delimiters (`onclick="..."`) and single-quote inner delimiters for the JS string (`href='...'`). `encodeURIComponent` percent-encodes for URL safety but **does not encode the single-quote character `'`** — single quote is in the RFC 3986 unreserved set and passes through unchanged.

Any message value containing `'` terminates the JS string literal inside the `onclick` handler. For example, a stored message of `'); alert(document.cookie); var x='` causes the `onclick` attribute to execute `alert(document.cookie)` in the clicking user's browser context. The `m.id` field is a server-generated UUID and is safe; `m.message` is fully user-controlled.

**Project rule violated:** CLAUDE.md — "Any user-supplied data entering `innerHTML` or template literals MUST pass through `escapeHTML()`." The `encodeURIComponent` output is embedded into an `innerHTML` template literal without an `escapeHTML` pass.

**Recommended fix:** Replace the inline `onclick` string with a `data-msg-id` + `data-msg-content` pair on the button, then attach a delegated `click` listener after the `innerHTML` write that constructs the `mailto:` URL using those attributes. This eliminates the injection surface entirely.

---

## handleSend (line 180)

**Consensus: PASS** (two agents noted minor gaps; core logic confirmed accurate by all)

All described logic is accurate. Minor points not captured in Stage 2:

- The failure condition (`error || !data || !success`) includes the case where `data` is truthy with `success: false` — a server-side rate-limit or moderation rejection. Stage 2 does not distinguish this case from a network error, though the behavior is identical (show error message).
- Error message is assigned via `errorEl.textContent` (line 202), not `innerHTML` — safe regardless of server content. Stage 2 correctly implies this via `textContent` but does not call it out explicitly.
- The `setTimeout` error-hide on line 204 is captured by `errorEl` closure. If the panel is torn down before 3 s, the callback operates on a detached element (no-op). See `cleanupSpecChat` note above.

---

## scrollToBottom (line 220)

**Consensus: PASS**

All five agents confirmed accurate and complete. Queries `spec-chat-msgs`, sets `scrollTop = scrollHeight` if found, synchronous, no state reads or writes beyond the DOM operation.

---

## Summary

| Function | Verdict | Priority Finding |
|---|---|---|
| `initSpecChat` | PARTIAL | State mutated before panel null check |
| `cleanupSpecChat` | PASS | Dangling setTimeout (low) |
| `toggleSpecChat` | PASS | — |
| `loadMessages` | PARTIAL | Deduplication assumes server sort order (medium) |
| `renderMessages` | PARTIAL | **XSS via single-quote injection in onclick (HIGH)** |
| `handleSend` | PASS | — |
| `scrollToBottom` | PASS | — |

## needs_review Items

| ID | Severity | Location | Issue |
|---|---|---|---|
| NR-1 | HIGH | `renderMessages` line 171 | Stored XSS: `encodeURIComponent(m.message)` in single-quote-delimited `onclick` JS string; single quotes not encoded; user message with `'` injects arbitrary JS |
| NR-2 | MEDIUM | `loadMessages` line 140 | Deduplication by last element's `created_at` assumes ascending server sort; timestamp ties cause missed renders |
| NR-3 | LOW | `initSpecChat` lines 47–51 | `activeDebateId` written before panel null check; stranded state if panel absent |
| NR-4 | LOW | `cleanupSpecChat` / `handleSend` line 204 | `cleanupSpecChat` does not cancel the 3s error-hide `setTimeout` from `handleSend` |
| NR-5 | LOW | `loadMessages` | No concurrency guard against simultaneous poll + send-triggered invocations |
