# Stage 2 — Runtime Walk — spectate.vote.ts

Anchors: wireVoteButtons (13) · castVote (21) · updateVoteBar (64) · updatePulse (81)

## Agent 01

### wireVoteButtons(d)
1. Queries `#vote-a`, `#vote-b`. If either missing → return immediately, no listeners attached.
2. Attaches click listener to btnA → `castVote('a', d)`.
3. Attaches click listener to btnB → `castVote('b', d)`.
4. Closure captures stale `d` snapshot at wire time.

### castVote(side, d)
1. Guard: `state.voteCast` truthy → return immediately (idempotent).
2. Set `state.voteCast = true` synchronously before any await — correct, blocks re-entry on double-click.
3. Re-query `#vote-a`, `#vote-b`. Disable both buttons; add `.voted` to both; add `.selected` to winning side.
4. `await safeRpc('vote_arena_debate', { p_debate_id: state.debateId, p_vote: side })`.
5. On error → `console.warn` only; **execution continues**. Nudge, refresh RPC, `claimVote` all fire on error path.
6. `nudge('first_vote', ...)` fires unconditionally.
7. `await safeRpc('get_arena_debate_spectator', { p_debate_id: state.debateId })`.
8. Cast result: `rawFresh as { vote_count_a?: number; vote_count_b?: number } | null`.
9. If `fresh` truthy → `updateVoteBar(fresh.vote_count_a || 0, fresh.vote_count_b || 0)` + `updatePulse(...)`.
10. If `fresh` falsy → optimistic: `fva = (d.vote_count_a || 0) + (side==='a' ? 1 : 0)`, `fvb` symmetric; calls `updateVoteBar(fva, fvb)` + `updatePulse(fva, fvb)`.
11. `claimVote(state.debateId!)` — non-null assertion.
12. `catch` block: same optimistic fallback from stale `d`; `claimVote` NOT called here.

### updateVoteBar(va, vb)
1. Queries `#vote-results`, `#bar-a`, `#bar-b`, `#vote-count`.
2. Return if `#vote-results` missing.
3. `results.classList.add('show')`.
4. `total = va + vb || 1` — division guard (both-zero → total=1).
5. `pctA = Math.round(va/total*100)`, `pctB = 100 - pctA`.
6. `barA/barB.textContent = pctA/pctB + '%'` — computed integers only.
7. `countEl.textContent = total + ' vote' + (total!==1 ? 's' : '')`.

### updatePulse(va, vb)
1. `total = va + vb` (no `||1` guard — zero handled by explicit branch).
2. Queries `#pulse-a`, `#pulse-b`. Return if either missing.
3. `total === 0` branch: both = `50%` width, `'—'` textContent.
4. Non-zero: `pctA = Math.round(va/total*100)`, `pctB = 100 - pctA`. Both bars get `pctA/pctB + '%'` textContent.
5. `document.querySelector('.pulse-empty')` → `.remove()` if `total > 0`.

## Agent 02

### wireVoteButtons(d)
1. Queries `#vote-a`/`#vote-b`. Early return if either missing.
2. Listeners attached: `castVote('a', d)` and `castVote('b', d)`.
3. No deregistration mechanism; repeated calls accumulate handlers.

### castVote(side, d)
1. `state.voteCast` guard → set true before await.
2. Disable buttons + add CSS classes.
3. `await safeRpc('vote_arena_debate', ...)` — `state.debateId` may be null; error → console.warn, execution continues.
4. `nudge(...)` unconditional.
5. `await safeRpc('get_arena_debate_spectator', ...)` — refresh.
6. Fresh/fallback branching → `updateVoteBar` + `updatePulse`.
7. `claimVote(state.debateId!)` in try only; not in catch.
8. Catch: optimistic update, no `claimVote`.

### updateVoteBar / updatePulse
[Same trace as Agent 01 — unanimous.]

## Agent 03–05 consensus
All five agents produce the same trace. Key agreement points:
- `state.voteCast` write-once lock is permanent (no reset in catch).
- Soft RPC error falls through to nudge + `claimVote`.
- All textContent writes in `updateVoteBar`/`updatePulse` are computed integers (`Math.round`) — no user-controlled data.
- No innerHTML writes anywhere in this file.

## Cross-cutting notes
- **No user-supplied strings reach textContent anywhere** — all writes are percentage math results or string literals.
- **Castle Defense satisfied** — RPCs via `safeRpc()`.
- **No setInterval calls** — `destroy()` rule N/A.
