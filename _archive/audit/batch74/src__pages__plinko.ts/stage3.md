# Stage 3 Outputs — plinko.ts

Anchor list was empty — no functions to verify.

## needs_review

**Misattribution note (informational):** Findings M-F4, L-F10, and L-F11 in AUDIT-FINDINGS.md are attributed to `plinko.ts` but refer to functions that no longer exist in this file:
- M-F4 (`getAge` overflow) — `getAge` is now in `src/pages/plinko-helpers.ts:48`
- L-F10 (`document.execCommand`) — now in `src/pages/plinko-invite-nudge.ts:42`
- L-F11 (`void injectInviteNudge()`) — call site is now in `src/pages/plinko-helpers.ts:30`

These findings were filed against the pre-decomposition monolith. The bugs themselves may still be present in their new files — they are not fixed, just moved. The attribution in AUDIT-FINDINGS.md is stale.
