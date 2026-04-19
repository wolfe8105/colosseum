# Batch 36 Audit Summary

**Date:** 2026-04-18
**Method:** Full Monty V3 (5-agent, 4-stage)
**Files audited:** 4
**Previously fixed items encountered:** 0

---

## Files Completed

| File | Stage 1.5 arbiter runs | Reconciliation | Unresolved |
|------|------------------------|----------------|------------|
| src/pages/home.arsenal-shop-sheet.ts | 2 | No | 0 |
| src/pages/cosmetics.modal.ts | 2 | No | 0 |
| src/pages/groups.utils.ts | 2 | No | 0 |
| src/rivals-presence-popup.ts | 2 | No | 0 |

All 4 files completed all 4 stages with no `needs_review` flags at Stage 1.5.

---

## All Findings

### src/pages/home.arsenal-shop-sheet.ts

| Severity | Finding | Line |
|----------|---------|------|
| MEDIUM | `openBottomSheet` overlay stays open permanently if `safeRpc` throws. `close()` is inside the `try` body at line 100 after `await`; no `finally` block. On throw, overlay is not removed. Matches LM-COS-002 pattern. | 100 |
| LOW | `tierLabel(effect.tier_gate)` interpolated into `socketNote` HTML without `escapeHTML`. `RarityTier` is an enum with fixed values; risk is LOW but verify against callers of `tierLabel`. | ~67 |

### src/pages/cosmetics.modal.ts

| Severity | Finding | Line |
|----------|---------|------|
| MEDIUM | `executePurchase`: `btn.disabled = true` set before async `safeRpc` call, no `try/finally`. If `safeRpc` throws (not just returns error), button stays permanently disabled. Pre-documented as LM-COS-002. | ~58–75 |
| MEDIUM | `handleEquip`: same pattern — `btn.disabled = true` before async call, no `try/finally`. Pre-documented as LM-COS-003. | ~78–100 |
| LOW | `showInfoModal` uses `.textContent` (not `.innerHTML`) for user-supplied title and body — confirmed safe. No finding; noted for completeness. | ~45 |

### src/pages/groups.utils.ts

| Severity | Finding | Line |
|----------|---------|------|
| LOW | `roleLabel` default branch returns raw unescaped `role` string. Callers inserting the return value into `innerHTML` without `escapeHTML()` wrapping introduce XSS. All current callers safe; latent risk for future callers. | 50–51 |
| LOW | `data-group-id` set with `esc(g.id)` — browsers decode HTML entities from attributes on read, so `dataset.groupId` returns the original UUID. For UUIDs (no HTML-special chars) this is harmless; pattern is semantically over-escaped. | 82, 103 |
| INFO | `catLabel` from `CATEGORY_LABELS` inserted into innerHTML without `escapeHTML` — safe, static developer-defined constant. | 88 |
| INFO | `esc(g.role)` used as CSS class name; `escapeHTML` does not escape spaces; negligible risk given server-enforced DB enum. | 80 |

### src/rivals-presence-popup.ts

| Severity | Finding | Line |
|----------|---------|------|
| MEDIUM | 8-second auto-dismiss timer stored in `const timer` (local to `showNext`), not in `_dismissTimer`. `destroy()` cannot cancel it. If `destroy()` called while popup is showing, the 8s timer fires against stale/torn-down state and may call `dismissPopup` + `showNext` on a dead context. Fix: assign to `_dismissTimer` instead of a local const. | 85 |
| MEDIUM | LM-RIVALS-004: `dismissPopup` returns early without `state.active = false` when `#rival-alert-popup` is not in the DOM. Queue permanently deadlocked. Pre-documented in source as M-E7. Fix: `if (!popup) { state.active = false; return; }` | 43 |
| LOW | `displayName` fallback uses `??` (nullish coalescing) — empty-string `display_name` from server bypasses fallback to `username`/'YOUR RIVAL', rendering blank popup name. Use `||` instead. | 67 |
| LOW | `queueAlert` has no `user_id` deduplication. Rapid presence events for the same rival queue multiple identical popups. | 108 |
| LOW | `payload.user_id` passed to `showUserProfile` after only a truthiness check, not UUID format validation. Project rule requires UUID validation before PostgREST filter calls. | 101 |
| INFO | Redundant `import('./auth.ts')` in challenge button handler. Pre-documented as LM-RIVALS-006 / L-E1. auth.ts statically loaded; dynamic import resolves from cache. | 100 |
| INFO | XSS safe: `escapeHTML(displayName.toUpperCase())` correctly applied. Only user-sourced value in innerHTML template. | 68, 75 |

---

## Totals

| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 5 |
| LOW | 7 |
| INFO | 5 |

---

## Stage 2 Agent Error — home.arsenal-shop-sheet.ts (resolved at Stage 3)

Agent 05 in Stage 2 for home.arsenal-shop-sheet.ts claimed "the overlay is removed whether the buy call succeeded or threw." Stage 3 agents unanimously identified this as FAIL: `close()` at line 100 is inside the `try` body after `await`, not in a `finally` block. On throw, `close()` is skipped and the overlay remains open. The finding was correctly classified MEDIUM based on Stage 3 consensus.
