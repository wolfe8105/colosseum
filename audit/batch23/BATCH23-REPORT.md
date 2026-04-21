# Full Monty Audit — Batch 23 Report

Run ID: audit-run-20260417-batch23  
Date: 2026-04-17  
Method: THE-MODERATOR-AUDIT-METHOD-V3 (5 agents per stage, 4 stages)  
Files: 4  
Stage 1.5 reconciliation runs needed: 0  
Unresolved human-review items: 0

---

## File Results Summary

| File | Anchors | Verdict | Findings |
|------|---------|---------|----------|
| src/tiers.ts | 6 | PASS | 0 |
| src/pages/home.profile.ts | 4 | NEEDS_REVIEW | 2 (1 Medium, 1 Low) |
| src/arena/arena-mod-refs-ruling.ts | 3 | NEEDS_REVIEW | 3 (1 Medium, 2 Low) |
| src/async.state.ts | 1 | PASS | 3 (0 Medium, 3 Low) |

---

## Findings Detail

### src/tiers.ts — PASS

No findings. All 6 anchors (getTier, canStake, getPowerUpSlots, getNextTier, renderTierBadge, renderTierProgress) verified clean across all 5 verifiers.

---

### src/pages/home.profile.ts — NEEDS_REVIEW

**F-1 — Medium | Missing Number() cast on `depth` before innerHTML**
- Line 55: `depth` (derived from `profile.profile_depth_pct || 0`) interpolated into innerHTML without `Number()` cast.
- Rule violated: CLAUDE.md "Numeric casting before innerHTML"
- Same family as M-D2 (already fixed in modifiers.ts). Fix: `Number(profile.profile_depth_pct || 0)`.

**F-2 — Low | Module-level event wiring at import time with non-null assertions**
- Lines 86–96: `#user-avatar-btn!` and `#logout-btn!` wired at module evaluation time.
- Non-null assertions throw if elements are absent.
- `logOut()` awaited then hard redirect to `moderator-plinko.html`.
- Not a security finding; UX/correctness concern for pages where these elements may be absent.

---

### src/arena/arena-mod-refs-ruling.ts — NEEDS_REVIEW

**F-1 — Medium | XSS: ref.round interpolated raw into innerHTML (line 26)**
- `ROUND ${ref.round || '?'}` inserted without `escapeHTML()` or `Number()` cast.
- Missed by commit 8bc9ae6 XSS sweep (covered submitter_name, url, description but not round).
- Fix: `${Number(ref.round) || '?'}` or `${escapeHTML(String(ref.round || '?'))}`
- All 5 verifiers flagged.

**F-2 — Low | overlay.remove() fires unconditionally on RPC error path (lines 76, 98)**
- Allow/deny handlers reset `_rulingBusy` and re-enable buttons on error, then immediately call `overlay.remove()` — making the re-enable dead code.
- Moderator cannot retry a failed ruling from the panel.
- Fix: move `overlay.remove()` inside the `else` (success) branch.

**F-3 — Low | No try/catch around await ruleOnReference in button handlers (lines 67, 89)**
- If `ruleOnReference` throws (rather than returning `{error}`), busy guard stays true, buttons stay disabled, no recovery path.
- Mitigated in practice because `ruleOnReference` internally wraps errors and returns `{error}`.
- Fix: add try/catch resetting `_rulingBusy` in catch branch.

---

### src/async.state.ts — PASS (Low findings only)

**F-1 — Low | pendingChallengeId setter accepts arbitrary strings (line 57)**
- No UUID format validation. IDs originate from DB rows in normal operation; placeholder sentinel IDs are gated by `getIsPlaceholderMode()`. Value is passed as RPC param (not .or() filter), so strict "UUID before .or() filter" rule technically not violated. Defense-in-depth gap.

**F-2 — Low | Live array references from hotTakes/predictions/standaloneQuestions getters**
- In-place mutation bypasses setter. Architectural fragility, not current bug.

**F-3 — Low | reactingIds/predictingInFlight Sets externally mutable despite getter-only**
- `.clear()` by any caller defeats dedup guards. No current evidence of misuse.

---

## Batch Totals

| Severity | Count | Files |
|----------|-------|-------|
| High | 0 | — |
| Medium | 2 | home.profile.ts (numeric cast), arena-mod-refs-ruling.ts (XSS round) |
| Low | 7 | home.profile.ts (1), arena-mod-refs-ruling.ts (2), async.state.ts (3), tiers.ts (0) |

**Previously-fixed items re-reported: 0**  
**New High findings: 0**

---

## Action Items

Priority order:

1. **src/pages/home.profile.ts line 55** — add `Number()` cast: `const depth = Number(profile.profile_depth_pct || 0);`
2. **src/arena/arena-mod-refs-ruling.ts line 26** — wrap ref.round: `ROUND ${Number(ref.round) || '?'}`
3. **src/arena/arena-mod-refs-ruling.ts lines 76, 98** — move `overlay.remove()` into success branch
4. **src/arena/arena-mod-refs-ruling.ts lines 67, 89** — add try/catch around await ruleOnReference
5. Low items (async.state.ts, home.profile.ts F-2) — optional hardening, no production urgency
