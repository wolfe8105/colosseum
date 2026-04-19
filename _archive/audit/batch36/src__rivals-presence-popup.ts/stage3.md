# Stage 3 Outputs — rivals-presence-popup.ts

## Agent 01

### destroy — FAIL
Clears `_dismissTimer` and `_showNextTimer` correctly. FAIL because it cannot cancel the 8s `const timer` local to `showNext` (line 85). That timer is unreachable from `destroy()`.

### dismissPopup — FAIL
LM-RIVALS-004: `if (!popup) return;` at line 43 exits before `state.active = false`. The only `state.active = false` is inside the 300ms callback (line 49). Confirmed FAIL.

### showNext — FAIL
8s timer is `const timer` (local). destroy() cannot cancel it. XSS coverage correct: only `${safeName}` is interpolated, `escapeHTML` applied. FAIL on timer management.

### queueAlert — PASS

### Finding Verifications
All 6 Stage 2 findings CONFIRMED.

### Additional Findings
LOW | showNext is exported with no guard against being called while `state.active = true`. If called directly while a popup is already showing, the old popup's 8s timer (still in closure) will later fire `dismissPopup` and prematurely dismiss the new popup. | line 57

LOW | state.active is set to false inside the 300ms callback, not at the dismissPopup function entry. During the 300ms animation window, `queueAlert` callers see `state.active = true` and cannot trigger immediate show. This is likely intentional (new arrivals queue during animation) but means the 900ms inter-popup gap is effectively forced on all callers. | line 49

---

## Agent 02

### destroy — PASS
### dismissPopup — PASS (with known landmine caveat)
### showNext — FAIL (8s timer)
### queueAlert — PASS

### Finding Verifications
MEDIUM-1 CONFIRMED | MEDIUM-2 CONFIRMED | LOW-1 CONFIRMED | LOW-2 CONFIRMED | INFO-1 CONFIRMED | INFO-2 CONFIRMED

### Additional Findings
LOW | `payload.user_id` passed to `showUserProfile()` after only a truthiness check, not UUID format validation. Per project CLAUDE.md rule: "UUID validation before PostgREST filters." If `showUserProfile` passes `user_id` into a `.or()` filter or similar, this is an injection surface. | line 101

---

## Agent 03

### Claim verifications (A-G)

A (8s timer local): CONFIRMED — line 85 assigns to `const timer`, not `_dismissTimer`.

B (LM-RIVALS-004): CONFIRMED — `if (!popup) return;` line 43 is before any `state.active = false`. The assignment lives in the 300ms callback at line 49.

C (nullish coalescing): CONFIRMED — `??` used at line 67. Empty string `""` bypasses fallback.

D (no deduplication): CONFIRMED — line 108, `state.queue.push(payload)` no duplicate check.

E (redundant dynamic import): CONFIRMED — line 100, `import('./auth.ts')`. Comment at lines 97–99 acknowledges redundancy (LM-RIVALS-006).

F (only safeName interpolated): CONFIRMED — `${safeName}` at line 75 is the only interpolation in the innerHTML template.

G (escapeHTML applied): CONFIRMED — line 68, `escapeHTML(displayName.toUpperCase())`.

### Additional observations
`payload.user_id` passed as JS argument to `showUserProfile`, not into innerHTML. No XSS risk from that path. UUID validation gap noted.

`state.active` never reset by `destroy()` — if called while popup showing, future `queueAlert` calls silently enqueue without display.

---

## Agent 04

### destroy — FAIL
Cannot cancel 8s local timer.

### dismissPopup — FAIL
LM-RIVALS-004: `if (!popup) return;` before `state.active = false`.

### showNext — FAIL
8s timer local. XSS coverage correct (single `${safeName}` interpolation). Empty-string displayName from `??` renders blank name div — visible UX bug when server returns `display_name: ""`.

### queueAlert — PASS

### Confirmed findings
MEDIUM | 8s auto-dismiss timer assigned to local `const timer`, destroy() cannot cancel it | line 85
MEDIUM | LM-RIVALS-004: early return without state.active = false, queue deadlock | line 43
LOW | Empty-string displayName bypasses `??` fallback, blank name renders | line 67

---

## Agent 05

### destroy — FAIL
### dismissPopup — FAIL
### showNext — FAIL
### queueAlert — PASS

### Finding Verifications
MEDIUM-1: CONFIRMED
MEDIUM-2: CONFIRMED
LOW-1: CONFIRMED
LOW-2: CONFIRMED
INFO-1: CONFIRMED
INFO-2: CONFIRMED

EXTRA-1: CONFIRMED — `if (payload.user_id)` guard present at line 96. `user_id` passed as JS argument to `showUserProfile`, never inserted into innerHTML.

EXTRA-2: CONFIRMED — Potential state corruption: when `showNext` is called (via queueAlert or direct call) while a prior `_dismissTimer` 300ms callback is still in-flight, the callback will later execute `state.active = false` (line 49), clobbering the `state.active = true` set by showNext (line 61). This leaves the new popup visible but `state.active = false`, causing the next `queueAlert` to immediately call `showNext` again — double popup. Reachable if `showNext` is called directly or via `_showNextTimer` during an edge timing window.

### New findings
LOW | _showNextTimer callback fires showNext unconditionally after 600ms. If during that 600ms window queueAlert is called and directly calls showNext (state.active = false), _showNextTimer will still fire and call showNext a second time. The second call hits the empty-queue guard and sets state.active = false — clobbering the active popup's state flag. | lines 51–53

---

## Synthesis

**Confirmed findings (all 5 agents agree on all Stage 2 findings):**

**MEDIUM | 8-second auto-dismiss timer not cancellable by destroy() | showNext line 85**
`const timer = setTimeout(() => dismissPopup(state), 8000)` is stored in a local closure variable. `destroy()` only clears `_dismissTimer` and `_showNextTimer`. If `destroy()` is called while a popup is showing and no button is clicked, the 8s timer fires after teardown, calling `dismissPopup(state)` on stale state. This can trigger LM-RIVALS-004 (early return, state.active left true) if the DOM has been cleaned up, or it can call `showNext` again on a torn-down context.

**MEDIUM | LM-RIVALS-004 — dismissPopup early return without state.active = false | line 43**
Pre-documented in source (catalogued as M-E7). `if (!popup) return;` fires before `state.active = false`. Queue permanently deadlocked when popup is missing from DOM. Fix: `if (!popup) { state.active = false; return; }`.

**LOW | displayName fallback uses `??` (nullish coalescing) — empty-string display_name bypasses fallback | line 67**
`payload.display_name ?? payload.username ?? 'YOUR RIVAL'` — `??` only falls through on null/undefined. Server `display_name: ""` produces a blank `.rap-name` div. Use `||` to also catch empty strings.

**LOW | queueAlert no user_id deduplication | line 108**
`state.queue.push(payload)` with no duplicate check. Rapid presence events for the same rival produce multiple sequential popups. No queue depth limit.

**LOW | payload.user_id passed to showUserProfile without UUID format validation | line 101**
(Raised by 2/5 agents.) Per project rule: "UUID validation before PostgREST filters." Truthiness check at line 96 (`if (payload.user_id)`) does not validate UUID format. Depends on what showUserProfile does internally, but project pattern requires UUID validation at call site.

**INFO | Redundant dynamic import | line 100**
Pre-documented in source as LM-RIVALS-006 / L-E1. auth.ts is statically loaded at page init; dynamic import resolves from cache immediately.

**INFO | XSS safe | line 68, 75**
`safeName = escapeHTML(displayName.toUpperCase())` — only user-sourced value in innerHTML template. Correctly sanitized. `payload.user_id` passed as JS argument, not inserted into DOM.
