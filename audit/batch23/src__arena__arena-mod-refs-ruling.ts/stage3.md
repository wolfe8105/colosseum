# Stage 3 Verification — src/arena/arena-mod-refs-ruling.ts

Verifiers: A, B, C, D, E (5 independent agents)
Anchors: showRulingPanel (line 10), startReferencePoll (line 107), stopReferencePoll (line 118)

---

## Claim Verdicts

### showRulingPanel

| Claim | Verdict | Lines |
|-------|---------|-------|
| Removes prior #mod-ruling-overlay on entry via optional chaining | PASS | 11 |
| sideLabel derived from ref.supports_side (a→Side A, b→Side B, else Neutral) | PASS | 13 |
| innerHTML template: escapeHTML on submitter_name, url, description | PASS | 23, 27, 28 |
| ref.round interpolated raw — no escapeHTML, no Number() cast | CONFIRMED (finding) | 26 |
| countdown=60; clears prior _rulingCountdownTimer if truthy | PASS | 41–43 |
| setInterval 1000ms; tick decrements countdown, writes textContent | PASS | 44–46 |
| countdown<=0: clearInterval, null state, overlay.remove(), fire-and-forget ruleOnReference with .catch | PASS | 47–52 |
| _rulingBusy=false local guard declared once, shared by allow/deny closures | PASS | 56 |
| Allow handler: async, busy guard, disable buttons, clearInterval+null, read reason, await ruleOnReference | PASS | 57–67 |
| Error branch (result?.error truthy): addSystemMessage, reset busy, re-enable buttons | PASS | 68–72 |
| overlay.remove() unconditional — outside if/else, fires on both success and error | PASS | 76 |
| Success branch: addSystemMessage | PASS | 73–75 |
| No try/catch around await ruleOnReference | PASS | 57–77 |
| Deny handler: same shape as allow, passes 'denied' | PASS | 79–99 |
| Deny overlay.remove() also unconditional | PASS | 98 |
| Backdrop click: registered listener, empty body (intentional no-op) | PASS | 102–104 |

### startReferencePoll

| Claim | Verdict | Lines |
|-------|---------|-------|
| Accepts _debateId (unused), body is comment block + single return | PASS | 107–116 |
| Complete no-op stub, F-55 retired | PASS | 108–115 |

### stopReferencePoll

| Claim | Verdict | Lines |
|-------|---------|-------|
| Reads referencePollTimer; if truthy: clearInterval + set_referencePollTimer(null) | PASS | 119 |
| Unconditionally: set_pendingReferences([]) | PASS | 120 |
| No async, no DOM, no error paths | PASS | 118–121 |

---

## Findings

### F-1 — Medium | XSS / Rule Violation: ref.round raw in innerHTML

**File:** src/arena/arena-mod-refs-ruling.ts  
**Line:** 26  
**Rule:** CLAUDE.md — "Numeric casting before innerHTML" and "escapeHTML on all user content"

```ts
<div class="mod-ruling-ref-meta">ROUND ${ref.round || '?'} · ${sideLabel}</div>
```

`ref.round` is a `ReferenceItem` field sourced from a Supabase RPC result. It is interpolated directly into `innerHTML` with no `escapeHTML()` call and no `Number()` cast. All five verifiers agree this was missed by the commit 8bc9ae6 XSS sweep (which covered `submitter_name`, `url`, and `description` but not `round`).

If `round` is stored as a numeric type in the database this is safe in practice, but the project security rule requires `Number()` cast before any numeric innerHTML and `escapeHTML()` on any user-controlled string.

**Fix:** `ROUND ${Number(ref.round) || '?'} · ${sideLabel}` (if round is always numeric), or `${escapeHTML(String(ref.round || '?'))}` (if it can be a string).

**Consensus:** All 5 verifiers flagged this. Not previously fixed.

---

### F-2 — Low | Logic: overlay.remove() fires unconditionally, making error retry dead code

**File:** src/arena/arena-mod-refs-ruling.ts  
**Lines:** 68–76 (allow handler), 90–98 (deny handler)

In both allow and deny handlers, the error branch resets `_rulingBusy = false` and re-enables both buttons — correct intent to let the moderator retry. However, `overlay.remove()` at lines 76 and 98 is unconditional (outside the `if/else`), so it runs immediately after, destroying the overlay and its buttons. The re-enable code is dead: the DOM elements no longer exist by the time `disabled = false` could matter.

Net effect: a failed ruling closes the panel. The moderator sees the `addSystemMessage` failure toast but cannot retry from the panel; they must wait for the next reference poll cycle.

**Fix:** Move `overlay.remove()` inside the `else` (success) branch of both handlers. The error branch can either keep the overlay open for retry, or close it intentionally — but currently the intent to support retry is defeated by the unconditional remove.

**Consensus:** All 5 verifiers flagged this.

---

### F-3 — Low | Correctness: no try/catch around await ruleOnReference in button handlers

**File:** src/arena/arena-mod-refs-ruling.ts  
**Lines:** 67 (allow), 89 (deny)

Both async button handlers `await ruleOnReference(...)` without a `try/catch`. If `ruleOnReference` ever throws rather than returning `{ error }` (network error, uncaught internal exception), the async handler rejects. At that point `_rulingBusy` stays `true`, buttons stay disabled, the countdown timer has already been cleared, and the overlay remains open but locked. No recovery path exists.

Mitigated in practice because `ruleOnReference` in `auth.ts` is expected to catch internally and return `{ error }`. But the defensive pattern requires a `try/catch` here. Severity is Low given the defensive internal wrapper.

**Fix:** Wrap lines 67–75 and 89–97 each in `try/catch`; in the `catch` block, reset `_rulingBusy = false`, re-enable buttons, and call `addSystemMessage` with a generic failure message. Then decide whether to keep or close the overlay.

**Consensus:** Verifiers A, B, C, D, E all noted this.

---

## Summary

| Anchor | Result |
|--------|--------|
| showRulingPanel | NEEDS_REVIEW — 3 findings (F-1 Medium, F-2 Low, F-3 Low) |
| startReferencePoll | PASS |
| stopReferencePoll | PASS |

**File verdict: NEEDS_REVIEW**  
Findings: 1 Medium (XSS rule violation — ref.round), 2 Low (overlay-remove logic, missing try/catch)  
Previously-fixed items: None re-reported. Findings are new.
