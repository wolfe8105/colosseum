# Stage 3 Verdicts — async.rivals.ts

## Verdicts

| Function | Verdict |
|---|---|
| `_registerRivalWiring` | PASS |
| `renderRivals` | PARTIAL |
| `refreshRivals` | PASS |

---

## `_registerRivalWiring` — PASS

No discrepancies. All five agents accurately describe: single assignment of `fn` to module-level `_wireRivals`, no branches, no async, void return. No security concerns.

---

## `renderRivals` — PARTIAL

### Discrepancies

**D1 — Three hardcoded hex colors not flagged by any Stage 2 agent (all 5 agents flag this).**

Source:
- Line 42: `color:#6a7a90; /* TODO: needs CSS var token */` — empty-state div style
- Line 59: `background:#132240; /* TODO: needs CSS var token */` — rival card container style
- Line 63: `color:#6a7a90; /* TODO: needs CSS var token */` — ELO/W-L line style

Stage 2 describes the HTML rendering in detail but none of the five agents surface these violations. The source code itself acknowledges them with `/* TODO: needs CSS var token */` comments.

**D2 — Agent 03 (Stage 2) misstates control flow order.** Agent 03 lists calls starting with `_wireRivals?.(container)` as step 1, omitting the `!container` early-return guard at line 30 as the actual first step. All other agents correctly enumerate the guard first. Minor ordering error, not a logic misrepresentation.

**D3 — No Stage 2 agent explicitly documents `Number()` casting as a security measure.** The cast is present at line 63 (`Number(r.rival_elo ?? 1200)`, `Number(r.rival_wins ?? 0)`, `Number(r.rival_losses ?? 0)`) but Stage 2 agents do not call it out as a deliberate compliance measure. Not a false claim, but an omission.

### Security observations

- **(a) escapeHTML — PASS.** `rival_display_name`, `rival_username`, `rival_id`, `id` all pass through `esc()` (alias of `escapeHTML`) before innerHTML. Data attribute values `data-username` and `data-user-id` use the same escaped variables. Compliant.
- **(b) Number() casting — PASS.** `r.rival_elo`, `r.rival_wins`, `r.rival_losses` are each wrapped in `Number()` at line 63 before innerHTML interpolation. Compliant.
- **(c) Hardcoded hex colors — FAIL.** Three violations:
  - Line 42: `color:#6a7a90` (empty state)
  - Line 59: `background:#132240` (card background)
  - Line 63: `color:#6a7a90` (ELO/stats line)
  All three should use `var(--mod-*)` CSS tokens per CLAUDE.md design DNA rule. Developer-acknowledged (inline TODO comments). **LOW finding.**
- **(d) Missing error handling — MEDIUM.** `getMyRivals()` at line 38 is awaited with no try/catch. A network failure or Supabase error propagates as an unhandled rejection to `refreshRivals`, which also has no try/catch. Silent failure: rivals panel fails to render with no toast, no fallback, no user-visible feedback. **MEDIUM finding.**

---

## `refreshRivals` — PASS

No discrepancies. All five agents accurately describe the function. Inherits the `getMyRivals()` rejection propagation risk from `renderRivals` — no new issues.

---

## Findings Summary

| ID | Severity | Location | Description |
|---|---|---|---|
| M-B41-3a | MEDIUM | `renderRivals` line 38, `refreshRivals` line 78 | No try/catch around `getMyRivals()` call chain — unhandled rejection causes silent failure with no user feedback |
| L-B41-3b | LOW | `renderRivals` lines 42, 59, 63 | Three hardcoded hex colors (`#6a7a90` ×2, `#132240`) in inline styles — violates CLAUDE.md no-hardcoded-hex rule; developer-acknowledged with TODO comments |

---

## needs_review

None.
