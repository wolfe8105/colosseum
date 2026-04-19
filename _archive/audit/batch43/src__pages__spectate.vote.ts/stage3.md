# Stage 3 — Verification — spectate.vote.ts

Anchors: wireVoteButtons (13) · castVote (21) · updateVoteBar (64) · updatePulse (81)
Agents: 5 | Agreement: unanimous on all findings

---

## Stage 2 Accuracy

All five agents confirm the Stage 2 walk is accurate. One note: Agent 01 rejected "claimVote skipped in catch" as correct behavior; agents 02–05 confirmed it as Low. Decision: retained as Low (asymmetry with the soft-error path is an unintended inconsistency).

---

## Security Rule Checks

| Rule | Result | Detail |
|---|---|---|
| escapeHTML | PASS | No `innerHTML` anywhere in file. All DOM writes via `.textContent`, `.classList`, `.style`, `.disabled`. |
| Numeric cast | N/A | `Number()` rule applies to innerHTML — not used here. All numeric values go to `.textContent`. |
| Castle Defense | PASS | Single mutation `vote_arena_debate` via `safeRpc()`. No direct table writes. |
| UUID validation | N/A | `state.debateId` passed as RPC parameter, not interpolated into `.or()` filter. |
| setInterval destroy() | N/A | No polling intervals in this file. |
| getSession() ban | N/A | No auth calls. |

---

## Findings

### MEDIUM — SV-1: `state.voteCast` permanently locked after any failure (line 17 + catch block)
**All 5 agents confirm.** `state.voteCast = true` is set synchronously before the `try` block and is never reset in the `catch` block. A transient network failure, timeout, or any thrown exception from either `safeRpc` call permanently prevents the user from retrying their vote for the entire session lifetime. Buttons remain `disabled = true` with the `voted` class applied, with no user-facing error message and no recovery path. Fix: in the `catch` block, reset `state.voteCast = false`, re-enable both buttons, and show an error toast.

### MEDIUM — SV-2: Soft RPC error falls through to success UX + token award (line 33)
**All 5 agents confirm.** When `safeRpc('vote_arena_debate', ...)` returns `{ error }` (non-throwing — e.g., RLS rejection, already voted, debate closed), only `console.warn` fires on line 33. Execution continues unconditionally to: `nudge('first_vote', ...)` (success toast), the second `safeRpc` refresh call, `updateVoteBar`, `updatePulse`, and `claimVote`. The user receives visual vote confirmation and a token reward despite the vote never being recorded server-side. Fix: `if (error) { /* optional toast */ return; }` after the warn.

### LOW — SV-3: `state.debateId!` non-null assertion without runtime guard (line 55)
**All 5 agents confirm.** `claimVote(state.debateId!)` uses a TypeScript non-null assertion. If `state.debateId` is `undefined` at call time, the assertion is compile-time only — `undefined` is passed to `claimVote` at runtime. Fix: `if (state.debateId) claimVote(state.debateId)`.

### LOW — SV-4: Stale `d` snapshot used in optimistic fallback (lines 49–52, 57–60)
**All 5 agents confirm.** The `SpectateDebate` object `d` is the snapshot passed to `wireVoteButtons` at mount time. The fallback paths (null fresh data + catch block) compute `d.vote_count_a + 1` as the displayed total. If other spectators have voted since the component mounted, these counts are stale. Acceptable as a degraded-mode approximation, but the staleness window can be significant for popular debates.

### LOW — SV-5: `claimVote` not called in catch path (lines 56–61)
**4/5 agents confirm.** The `catch` block updates UI (optimistic bars) but omits `claimVote`. This creates asymmetry: the soft-error path (line 33) calls `claimVote` even on rejection; the thrown-exception path does not. Whether the catch omission is correct (conservative: don't award if possibly failed) or a bug is product-intent-dependent, but the inconsistency is unintentional — the catch was modeled on the fallback branch and the `claimVote` line was simply not carried over.

### LOW — SV-6: `updateVoteBar` zero-state displays "1 vote" (line 64)
**All 5 agents confirm.** `const total = va + vb || 1` — when `va = 0, vb = 0`, `total = 1`. This is correct for avoiding division by zero in percentage math, but the same `total` is used in `countEl.textContent = total + ' vote' + (...)`, producing "1 vote" when no votes exist. Fix: use a separate `displayTotal = va + vb` for the label, keeping the `|| 1` guard only for the percentage calculation.

---

## Summary

`spectate.vote.ts` passes all CLAUDE.md security rules cleanly — no innerHTML, no direct DB mutations, no auth calls. Two Medium logic bugs: the permanent vote lockout on failure (SV-1) and the false-success UX on server rejection (SV-2). Four Low findings: non-null assertion (SV-3), stale snapshot (SV-4), claimVote asymmetry (SV-5), zero-vote display bug (SV-6). No High severity.
