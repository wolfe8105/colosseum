# Stage 3 Outputs — arena-room-end.ts

## Agent 01

### endCurrentDebate
CONFIRM: set_view, pushArenaState, clearInterval(roundTimer), three poll-stops, modal removal. CONFIRM: citedRefs snapshot for live mode. CONFIRM: live cleanup (cleanupFeedRoom + leaveDebate). CONFIRM: nulled path early return.

CONFIRM: score calculation branches correct. CONFIRM: judging UI shown before requestAIScoring. CONFIRM: sumSideScore used. CONFIRM: fallback random 60-90 for AI scoring failure.

CONFIRM: apply_end_of_debate_modifiers condition: `!debate.modView && !isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-') && debate.mode !== 'ai'`.

FINDING — APPLY_END_OF_DEBATE_MODIFIERS SCORE UPDATE BUG: Lines 157-162 show:
```
if (myRole === 'a') {
  scoreA = endOfDebateBreakdown.debater_a.final_score;
  scoreB = endOfDebateBreakdown.debater_b.final_score;
} else if (myRole === 'b') {
  scoreA = endOfDebateBreakdown.debater_a.final_score;
  scoreB = endOfDebateBreakdown.debater_b.final_score;
}
```
BOTH branches assign the SAME values (debater_a to scoreA, debater_b to scoreB). The conditional on `myRole` is meaningless — the role check does nothing since both branches are identical. This appears to be a copy-paste bug. The modifiers ARE applied correctly (debater_a maps to A, debater_b maps to B) but the role-specific logic is dead code. SEVERITY: Low (logic is correct by coincidence — A maps to A and B maps to B regardless of who's calling; the role check was probably intended to swap them but it doesn't matter for this use case).

CONFIRM: update_arena_debate called with correct params. CONFIRM: server winner, vote counts, elo read from result. CONFIRM: citeReference loops for cited refs (fire-and-forget). CONFIRM: resolve_bounty_attempt fire-and-forget. CONFIRM: resolveTournamentMatch chained with tournament-complete toast.

FINDING — DYNAMIC RE-IMPORT OF safeRpc: Lines 248, 254, 260 each dynamically `import('../auth.ts')` to get `safeRpc` or `getSupabaseClient`, despite `safeRpc` already being statically imported at line 4. The dynamic imports are unnecessary and introduce async overhead. The `resolve_audition_from_debate` call at line 262 uses `_sb.rpc()` directly (not safeRpc), bypassing the 401 retry wrapper. SEVERITY: Medium (bypasses retry logic; dynamic imports are wasteful).

CONFIRM: save_ai_scorecard awaited. CONFIRM: claimDebate/claimAiSparring called. CONFIRM: settleStakes awaited, result stored. CONFIRM: convert_referral fired as void for ranked PvP.

CONFIRM: null scores defaulted to 0. CONFIRM: winner defaulted to 'draw'. CONFIRM: nudge called. CONFIRM: power-up cleanup. CONFIRM: HTML rendered with escapeHTML on all user strings. CONFIRM: Number() cast on score values in innerHTML. CONFIRM: injectAdSlot called twice. CONFIRM: renderModScoring called. CONFIRM: all button listeners wired.

### renderAfterEffects
CONFIRM: null guard and empty guard. CONFIRM: myData/oppData selection. CONFIRM: renderChain and renderInventoryEvent inner functions. CONFIRM: escapeHTML used on effect_name, labels, and JSON default. CONFIRM: JSON.stringify fallback for unknown effects, passed through escapeHTML. No errors found.

## Agent 02

### endCurrentDebate
CONFIRM all behavior.

FINDING — roundTimer NOT RESET TO NULL AFTER clearInterval: Line 35 calls `clearInterval(roundTimer)` but does not call `set_roundTimer(null)`. The module state variable `roundTimer` retains its stale interval ID. Compare with the nulled path (line 56) and power-up cleanup (line 291) where `set_silenceTimer(null)` is called after `clearInterval`. Inconsistency. If `endCurrentDebate` is called multiple times (unlikely in practice), this stale ID could be passed to `clearInterval` again (harmless but incorrect). SEVERITY: Low.

FINDING — set_roundTimer IMPORTED BUT NOT USED: `set_roundTimer` is imported from arena-state (line 19) but never called in this file. Supports the finding above — the timer is cleared but not nulled. Dead import. SEVERITY: Low.

FINDING — equippedForDebate IMPORTED BUT NOT USED: `equippedForDebate` is imported from arena-state (line 16) but not referenced in any function. Dead import. SEVERITY: Low.

FINDING — view IMPORTED BUT NOT USED: `view` is imported from arena-state (line 15) but only `set_view` is called — the state reader itself is never used in this file. Dead import. SEVERITY: Low.

FINDING — friendlyError IMPORTED BUT NOT USED: `friendlyError` is imported from config (line 5) but never called. Dead import. SEVERITY: Low.

### renderAfterEffects
CONFIRM.

## Agent 03

### endCurrentDebate
CONFIRM: all major paths.

FINDING — resolve_audition_from_debate BYPASSES safeRpc: At line 262, the code does `await _sb.rpc('resolve_audition_from_debate', { p_debate_id: debate.id })` where `_sb` is the raw Supabase client obtained via `getSupabaseClient()`. This bypasses the `safeRpc` 401-retry wrapper. If the user's session has expired by the time the debate ends, this call will fail with a 401 without retry, while all other RPCs would succeed via safeRpc. SEVERITY: Medium.

FINDING — DYNAMIC IMPORTS OF auth.ts UNNECESSARY: Lines 248, 254, 260 each perform `await import('../auth.ts')` to get functions that were already statically imported at the top of the file (safeRpc at line 4, and getSupabaseClient is also available from auth.ts). The dynamic imports add async overhead and suggest copy-paste from another file without cleanup. SEVERITY: Low.

CONFIRM: escapeHTML used on debate.topic, reason, myName, opponentName. CONFIRM: Number() cast on scoreA/scoreB in innerHTML. CONFIRM: all action buttons wired.

### renderAfterEffects
CONFIRM. Note: the JSON.stringify fallback for unknown effect types passes through escapeHTML — this prevents XSS even on unknown server-supplied effect data.

## Agent 04

### endCurrentDebate
CONFIRM all major paths. CONFIRM all findings from other agents.

FINDING — APPLY_END_OF_DEBATE_MODIFIERS RUNS BUT MODIFIER GUARD DIFFERS FROM UPDATE_ARENA_DEBATE GUARD: The apply_end_of_debate_modifiers guard includes `debate.mode !== 'ai'` (line 149), but the update_arena_debate guard (line 171) does NOT include this condition. This means for AI debates: modifiers are NOT applied, but update_arena_debate IS called. The AI debate scores are computed locally (random or via requestAIScoring) and sent to update_arena_debate. This seems intentional — AI debates don't use the modifier system. Confirmed as design, not a bug.

FINDING — winner PASSED AS SIDE LETTER ('a'/'b') TO update_arena_debate BUT SERVER INTERPRETS AS USER_ID IN SOME CONTEXTS: The `p_winner` parameter is set from the local `winner` variable (which holds 'a', 'b', 'draw', or null). For human PvP where winner is null (server-determined), the server sets the winner. For other modes, side letters are passed. The `UpdateDebateResult` type is imported — its contents are not visible in this file, but the code trusts `r.winner` from the server response and overwrites the local winner. This means for human PvP, the local winner variable (null) is overridden by the server. Correct pattern.

### renderAfterEffects
CONFIRM.

## Agent 05

### endCurrentDebate
CONFIRM: The modifier guard includes `debate.mode !== 'ai'` while update_arena_debate does not — this is consistent with intentional design.

CONFIRM: safeRpc<UpdateDebateResult> is typed correctly.

FINDING — NO LOADING STATE FOR update_arena_debate: After the AI judging UI (for AI debates), when `endCurrentDebate` moves on to call `update_arena_debate`, the "judging" animation UI is cleared by the later `screenEl.innerHTML = ''` at line 309. Between the judging UI being cleared and the post-debate HTML being appended, screenEl is briefly empty. For non-AI debates, there is no loading indicator at all during the RPC calls. SEVERITY: Low (UX only).

FINDING — STAKING RESULT STORED ON debate OBJECT: `debate._stakingResult = stakeResult` at line 243 mutates the currentDebate object to store the staking result. This is used later in the HTML template at line 317. This side-channel mutation is a code smell — the staking result is written to the debate object rather than a local variable. SEVERITY: Low.

### renderAfterEffects
CONFIRM.

## Agent 06

### endCurrentDebate
CONFIRM all behavior.

FINDING — TRANSCRIPT OVERLAY USES msgs VARIABLE THAT IS debate.messages: The transcript uses `const msgs = debate.messages || []`. For live debates (`mode === 'live'`), messages may be empty (live debates use feed events, not the `messages` array). The "TRANSCRIPT" button is only shown if `debate.messages && debate.messages.length > 0` (line 345), so the transcript is not shown for empty-messages debates. However, for live debates, `debate.messages` appears to be the AI/text mode message array, not the feed events. If a live debate has no `messages`, the transcript button is hidden. This is correct behavior for live debates. Confirmed non-bug.

FINDING — NUMBER() CAST ON SCORES CONFIRMS XSS PROTECTION: Lines 328 and 333 use `${Number(debate.role === 'a' ? scoreA : scoreB)}` and the same for the other side. Scores were previously validated as numbers (set to 0 if null), so this is redundant but correct.

FINDING — REMATCH DOES NOT RESET debate STATE: The rematch button calls `set_selectedRanked(debate.ranked || false); enterQueue(debate.mode, debate.topic)`. This starts a new queue entry but does not clear `currentDebate`. The old debate persists in module state until the new debate is found. `endCurrentDebate` is called when the new debate ends, at which point `currentDebate!` is the new debate. Safe.

### renderAfterEffects
CONFIRM.

## Agent 07

### endCurrentDebate
CONFIRM.

FINDING — NULLED PATH CLEANS POWER-UPS BUT SKIPS TIMER CLEANUP: In the nulled path (lines 56-80), `silenceTimer` is cleared and `removeShieldIndicator` etc. are called. However, `roundTimer` was already cleared at line 35 (before the nulled check). `set_roundTimer(null)` is never called in either path. Minor inconsistency confirmed.

FINDING — APPLY_END_OF_DEBATE_MODIFIERS RETURNS BREAKDOWN FOR BOTH SIDES BUT ONLY CALLED BY ONE DEBATER: This is a client-side function that runs on both debaters' clients. Each debater calls `apply_end_of_debate_modifiers`. If both call it, the RPC runs twice. The server should be idempotent for this case. The function result updates the local scoreA/B variables which are then passed to `update_arena_debate`. Both debaters send their own `update_arena_debate` call with potentially different score values if the modifier RPC isn't idempotent. This could cause a race condition where both debaters finalize with different scores. SEVERITY: High (potential score divergence in competitive matches).

### renderAfterEffects
CONFIRM.

## Agent 08

### endCurrentDebate
CONFIRM.

CONFIRM FINDING: Both branches of the role check in apply_end_of_debate_modifiers assign identical values. This is a copy-paste bug but functionally harmless because debater_a maps to scoreA and debater_b maps to scoreB in both cases.

FINDING — update_arena_debate CALLED BY BOTH DEBATERS: Similar to the modifier double-call issue. Both debaters (role 'a' and role 'b') call `update_arena_debate` (since the guard only excludes modView/placeholder). Both send `p_winner` and `p_score_*`. The server needs to handle concurrent calls gracefully. Without knowing the RPC implementation, it's unclear whether the last write wins, causing a race, or the RPC is idempotent. For human PvP where both send `winner = null`, the server determines winner from vote counts, so this is safe. For AI debates where each client sends their computed random scores independently, the two debaters may compute different random scores and the last one to call wins. This is a real race condition. SEVERITY: High (random score divergence for AI debates in two-player context, though AI debates are typically solo).

### renderAfterEffects
CONFIRM.

## Agent 09

### endCurrentDebate
CONFIRM all.

FINDING — AI JUDGING UI NOT SHOWN FOR SOLO AI DEBATES WHERE mode='ai' BUT messages.length === 0: The judging UI is shown only when `debate.mode === 'ai' && debate.messages.length > 0`. If no messages (empty debate), it falls to the random-score branch at line 121 without showing any UI. This means the judging animation is skipped for empty debates. Fine for UX since there's nothing to judge.

FINDING — CONCEDE WINNER LOGIC: `winner = debate.concededBy === 'a' ? 'b' : 'a'`. This correctly sets the winner to the non-conceder. However, `debate.concededBy` holds the role ('a' or 'b'), not a user ID. Consistent with the `p_winner` parameter being a role letter. Confirmed correct.

### renderAfterEffects
CONFIRM.

## Agent 10

### endCurrentDebate
CONFIRM.

FINDING — SHARE RESULT HARDCODES spectators: 0: Line 374 calls `shareResult({ ..., spectators: 0 })`. Live debates may have had actual spectators. The spectator count is not retrieved from the debate object or the server. The shared card will always show 0 spectators. SEVERITY: Low (cosmetic).

FINDING — OPPONENT PROFILE CLICK USES debate.opponentId FROM CLOSURE: The opponent-profile click listener at line 403 captures `debate.opponentId` in a closure at render time. Since `debate` is a local const pointing to `currentDebate` at the time of render, and `currentDebate` is not expected to change until the user enters a new debate, this is safe.

### renderAfterEffects
CONFIRM.

## Agent 11

### endCurrentDebate
CONFIRM.

FINDING — LIVE MODE citedRefs SNAPSHOT TIMING: `citedRefs` is snapshotted at line 44 before `cleanupFeedRoom()` at line 48. `cleanupFeedRoom()` presumably clears `loadedRefs`. The snapshot at line 44 correctly captures the refs before cleanup. If the snapshot were taken after cleanup, it would always be empty. Confirmed correct order.

FINDING — save_ai_scorecard AWAITED INSIDE NON-MODVIEW BLOCK: The `save_ai_scorecard` call (lines 226-234) is inside the `!debate.modView && !isPlaceholder() && ...` block. This means AI scorecard is saved for the debater but not for the moderator-view observer. For moderator views, the scorecard won't be saved by their client. Whether the debater's client always saves it (and the moderator's client is redundant) depends on whether both debaters call this function for AI sparring debates. For AI sparring, `debate.opponentId` is typically the AI, so there's only one human debater — the save happens once. Confirmed safe.

## Consolidated Findings Summary

**REAL — High severity:**
1. **DOUBLE-CALL RACE: update_arena_debate CALLED BY BOTH DEBATERS**: Both human debaters independently call `update_arena_debate` with their computed scores. For AI debates (random scores), they may compute different values, with the last call winning. The server's behavior under concurrent finalize calls is unknown from this file.

2. **DOUBLE-CALL RACE: apply_end_of_debate_modifiers CALLED BY BOTH DEBATERS**: Both debaters call the modifier RPC. If the modifier RPC is not idempotent, effects could be applied twice.

**REAL — Medium severity:**
3. **resolve_audition_from_debate BYPASSES safeRpc**: Direct `_sb.rpc()` call at line 262 skips the 401-retry wrapper. Session expiry during long debates could cause silent failure for audition resolution.

4. **DYNAMIC RE-IMPORTS OF auth.ts ARE UNNECESSARY**: Lines 248, 254, 260 re-import functions already statically imported at line 4. Adds async overhead.

**REAL — Low severity:**
5. **DEAD ROLE BRANCHES IN apply_end_of_debate_modifiers SCORE UPDATE**: Both `if (myRole === 'a')` and `else if (myRole === 'b')` do identical assignments. Dead code.
6. **roundTimer NOT RESET TO NULL AFTER clearInterval** (set_roundTimer imported but never called).
7. **UNUSED IMPORTS**: `friendlyError`, `view`, `equippedForDebate`, `set_roundTimer` — all imported but never used.
8. **STAKING RESULT STORED ON debate OBJECT** via mutation (`debate._stakingResult`).
9. **SHARE RESULT HARDCODES spectators: 0**.
