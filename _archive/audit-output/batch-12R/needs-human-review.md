# Needs Human Review — Batch 12R

Run ID: audit-run-20260414-batch12R
Files audited: 2
Generated: 2026-04-14

---

## File 1 — src/pages/spectate.render.ts

### NR-1 · LOW — `spectator_count || 1` minimum floor (renderSpectateView, line 295)

`(Number(d.spectator_count) || 1)` displays a minimum of 1 watcher even when the server returns `0` or null. No Stage 2 agent noted this. The `|| 1` floor means a debate with no spectators self-reports as having one. Confirm this is intentional (e.g., "you are the first spectator" UX) and document.

---

### NR-2 · LOW — `pulse-empty` div in zero-vote state (renderSpectateView, line 320)

When `totalVotes === 0` the pulse gauge appends `<div class="pulse-empty">Vote to move the gauge</div>` outside the track div. No Stage 2 agent explicitly named this element. Confirm the CSS places it correctly and that it is visible to the user when the track is empty.

---

### NR-3 · LOW — `updateVoteBar(d.vote_count_a || 0, d.vote_count_b || 0)` defensive coercions (renderSpectateView, line 488)

Two `|| 0` coercions guard against null/undefined vote counts before passing to `updateVoteBar`. Only one of five Stage 2 agents captured this. Confirm that `updateVoteBar`'s implementation tolerates `undefined` inputs without these guards — if it does not, removing them elsewhere would be unsafe.

---

### NR-4 · LOW — `renderTimeline` falls through to empty string when `!hasEnrichment && messages.length === 0` (line ~99)

The early return at line 99 (`if (!hasEnrichment && messages.length > 0) return renderMessages(messages, d)`) does not fire when `messages.length === 0`. In that case the function builds an empty `entries` array and returns `''`. The caller in `renderSpectateView` substitutes this as the timeline section. Confirm empty timeline is handled gracefully (no phantom div, correct empty-state display).

---

### NR-5 · LOW — `state.lastRenderedMessageCount` write is unconditional (renderSpectateView, line 481)

`state.app.innerHTML = html` is guarded by `if (state.app)` (line 480), but `state.lastRenderedMessageCount = messages.length` (line 481) is outside the guard and always executes. If `state.app` is null the DOM is not updated but the counter advances. Verify this does not cause a stale-count inconsistency on subsequent render calls.

---

### NR-6 · LOW — AI scorecard tie: both sides receive `'winner'` class simultaneously (renderSpectateView, lines 422–424)

The AI scorecard uses `>=` for both sides: `totalA >= totalB` gives A the winner class; `totalB >= totalA` gives B the winner class. In a tie both sides are marked as winners simultaneously. Confirm this is the intended UX and update any copy that refers to "the winner" in a tie state.

---

### NR-7 · LOW — `renderTimeline` `'power_up'` entries use `round: null` (line 152)

Power-up entries are pushed with `round: null`. Since the timeline sort and round-divider logic uses the `round` field to group and label entries, a `null` round means power-up entries are never associated with a round label. Confirm this is intentional and that the display renders correctly when a power-up event coincides with a round boundary.

---

## File 2 — src/arena/arena-feed-spec-chat.ts

### NR-8 · HIGH — Stored XSS via single-quote injection in `renderMessages` onclick (line 171)

**Action required.**

```typescript
onclick="window.location.href='mailto:reports@themoderator.app?subject=Spectator+Chat+Report&body=Message+ID:+${encodeURIComponent(m.id)}%0AContent:+${encodeURIComponent(m.message)}'"
```

`encodeURIComponent` does not encode the single-quote character `'` (it is in the RFC 3986 unreserved set). The `onclick` attribute embeds the encoded value inside a JS string delimited by single quotes. A stored message containing `'` terminates the JS string, enabling arbitrary JS execution in the clicking user's browser when the report button is pressed.

**Example payload:** a message of `'); alert(document.cookie); var x='` stored in the database would produce a live XSS trigger for every user who sees that message and clicks the report button.

**CLAUDE.md rule violated:** "Any user-supplied data entering `innerHTML` or template literals MUST pass through `escapeHTML()`."

**Recommended fix:** Remove the inline `onclick` string. Replace with `data-*` attributes (escaped via `escapeHTML`), then attach a delegated `click` listener after the `innerHTML` write:

```typescript
// In renderMessages template — replace the button with:
<button
  class="spec-chat-report-btn"
  title="Report message"
  data-msg-id="${escapeHTML(m.id)}"
  data-msg-content="${escapeHTML(m.message)}"
>&#9873;</button>

// After container.innerHTML assignment — add:
container.querySelectorAll<HTMLButtonElement>('.spec-chat-report-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.msgId ?? '';
    const content = btn.dataset.msgContent ?? '';
    window.location.href =
      `mailto:reports@themoderator.app?subject=Spectator+Chat+Report` +
      `&body=Message+ID:+${encodeURIComponent(id)}%0AContent:+${encodeURIComponent(content)}`;
  });
});
```

---

### NR-9 · MEDIUM — `loadMessages` deduplication by `created_at` of last array element (line 140)

`lastMessageTime` is set to `msgs[msgs.length - 1].created_at`. This assumes the RPC returns rows in ascending chronological order. Two failure modes:
1. If `get_spectator_chat` ever returns rows in non-ascending order, `lastMessageTime` is set to a non-latest timestamp and future polls may be silently dropped.
2. If two messages share an identical `created_at` string, a poll delivering only the first sets `lastMessageTime` to that timestamp; the second message arrives in the next poll with the same trailing `created_at` and is silently skipped.

Verify `get_spectator_chat` in `supabase/functions/arena.sql` has an `ORDER BY created_at ASC` guarantee. Consider switching to a cursor-based approach (e.g., last known message `id`) for stronger deduplication.

---

### NR-10 · LOW — `activeDebateId` written before panel null check (initSpecChat, lines 47–51)

`activeDebateId = debateId` executes on line 47 before `document.getElementById('feed-spec-chat-panel')` on line 50. If the panel element is absent the function returns early with `activeDebateId` already mutated and no polling started. The state is left inconsistent (non-null `activeDebateId`, no interval). Callers must invoke `cleanupSpecChat` to recover. Confirm this is handled and document the expected call contract.

---

### NR-11 · LOW — Dangling `setTimeout` not cancelled by `cleanupSpecChat` (handleSend, line 204)

`handleSend` schedules `setTimeout(() => { errorEl.style.display = 'none'; }, 3000)` to auto-hide the error element. `cleanupSpecChat` does not cancel this timer. If the feed room is torn down within 3 seconds of a send error, the callback fires against a possibly-detached element. In browsers this is a harmless no-op (detached nodes are kept alive through the closure). Low risk, but should be noted if the teardown sequence changes.

---

## Summary

| ID | File | Severity | Location | Issue |
|---|---|---|---|---|
| NR-1 | spectate.render.ts | LOW | `renderSpectateView` line 295 | `spectator_count \|\| 1` minimum floor |
| NR-2 | spectate.render.ts | LOW | `renderSpectateView` line 320 | `pulse-empty` div in zero-vote state |
| NR-3 | spectate.render.ts | LOW | `renderSpectateView` line 488 | `updateVoteBar \|\| 0` defensive coercions |
| NR-4 | spectate.render.ts | LOW | `renderTimeline` line ~99 | Empty-timeline fallthrough to `''` |
| NR-5 | spectate.render.ts | LOW | `renderSpectateView` line 481 | `lastRenderedMessageCount` write outside `state.app` guard |
| NR-6 | spectate.render.ts | LOW | `renderSpectateView` lines 422–424 | AI scorecard tie: both sides get `'winner'` class |
| NR-7 | spectate.render.ts | LOW | `renderTimeline` line 152 | `'power_up'` entries use `round: null` |
| NR-8 | arena-feed-spec-chat.ts | **HIGH** | `renderMessages` line 171 | **Stored XSS via `'` injection in onclick JS string** |
| NR-9 | arena-feed-spec-chat.ts | MEDIUM | `loadMessages` line 140 | Deduplication by `created_at` assumes server sort order |
| NR-10 | arena-feed-spec-chat.ts | LOW | `initSpecChat` lines 47–51 | `activeDebateId` mutated before panel null check |
| NR-11 | arena-feed-spec-chat.ts | LOW | `handleSend` line 204 | Dangling 3s `setTimeout` not cancelled by `cleanupSpecChat` |
