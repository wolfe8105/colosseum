# Stage 2 Outputs — arena-room-end.ts

## Agent 01

### endCurrentDebate
Async, no parameters, returns Promise<void>. Calls `set_view('postDebate')` and `pushArenaState('postDebate')`. If `roundTimer` is set, calls `clearInterval(roundTimer)`. Calls `stopReferencePoll()`, `stopModStatusPoll()`, `stopOpponentPoll()`. Removes any `mod-request-modal` element from the DOM. Non-null asserts `currentDebate` into `debate`. Snapshots `citedRefs`: if `debate.mode === 'live'`, filters `loadedRefs` to only cited refs; otherwise empty array.

If `debate.mode === 'live'`: calls `cleanupFeedRoom()` and `leaveDebate()`.

If `debate._nulled`: clears `silenceTimer` if set (clearInterval + set_silenceTimer(null)), calls `removeShieldIndicator()`, `set_shieldActive(false)`, `activatedPowerUps.clear()`, removes `powerup-silence-overlay` and `powerup-reveal-popup` DOM elements. Builds a nulled post-debate screen with `screenEl.innerHTML = ''`, appends a new div with `DEBATE NULLED` messaging and `escapeHTML(debate.topic)` + `escapeHTML(reason)` where reason is `debate._nullReason || 'Debate nulled'`. Attaches a click listener to `arena-back-to-lobby` that dynamically imports `arena-lobby.ts` and calls `renderLobby()`. Returns early.

Otherwise, proceeds with scoring. Initializes `scoreA`, `scoreB`, `aiScores`, `winner` all to null. If `debate.concededBy`: sets `winner` to the non-conceder side. Else if `debate.mode === 'ai'` with messages: clears screenEl, shows "judging" animation, awaits `requestAIScoring(debate.topic, debate.messages)`; if scores returned, sums via `sumSideScore`; else uses fallback random 60-90 scores for both; sets `winner = scoreA >= scoreB ? 'a' : 'b'`. Else if `debate.mode === 'ai'` or no opponentId: uses random 60-90 scores, picks winner by comparison. Else (human PvP): all null, winner determined server-side.

Initializes `eloChangeMe = 0`. Defines the `InventoryEffect` union type locally. Initializes `endOfDebateBreakdown` to null.

If not modView, not placeholder, not ai-local, not placeholder id, not ai mode: awaits `safeRpc('apply_end_of_debate_modifiers', { p_debate_id })` in try-catch; if data returned, updates `scoreA` and `scoreB` from the final_score fields of the breakdown (for both role 'a' and 'b', same update happens — both branches set scoreA=debater_a.final_score, scoreB=debater_b.final_score regardless of role). On catch, logs warning.

If not modView, not placeholder, not ai-local, not placeholder id: awaits `safeRpc<UpdateDebateResult>('update_arena_debate', { p_debate_id, p_status: 'complete', p_current_round, p_winner, p_score_a, p_score_b })` in try-catch; on success reads result's authoritative winner, vote counts for null scores, and elo change for ranked debates. Then: for cited refs with a winner, fires `citeReference(ref.reference_id, debate.id, outcome)` for each (fire-and-forget, catch logged). If ranked and winner, fires `safeRpc('resolve_bounty_attempt', ...)` (fire-and-forget). If `tournament_match_id` and winner, calls `resolveTournamentMatch(...)`.then(result) showing tournament-complete toast on success. If aiScores, awaits `safeRpc('save_ai_scorecard', {...})`.

If `debate.ruleset !== 'unplugged'`: calls `claimAiSparring` or `claimDebate` based on mode; awaits `settleStakes(debate.id)` storing result in `debate._stakingResult`; dynamically imports safeRpc and awaits `safeRpc('settle_sentiment_tips', ...)` (try-catch); dynamically imports safeRpc and awaits `safeRpc('pay_reference_royalties', ...)` (try-catch); dynamically imports `getSupabaseClient` and awaits `_sb.rpc('resolve_audition_from_debate', ...)` (try-catch; NOTE: this uses `_sb.rpc()` directly, not `safeRpc()`). For non-ai ranked debates: reads `getCurrentUser()` and `getCurrentProfile()`, if both present fires `void safeRpc('convert_referral', ...)`.

After the big non-modView block: nullifies null scores to 0, defaults winner to 'draw'. Computes `isDraw`, `didWin`. Calls `nudge('final_score', ...)`. Cleans up power-up state (same pattern as nulled path). Reads profile for display name. Computes elo display string. Clears screenEl, builds the full post-debate HTML (verdict, elo, staking result, topic, scores, AI scorecard if present, renderAfterEffects, rival/rematch/share/transcript/lobby buttons). Appends to screenEl. Calls `injectAdSlot(post)`. If current user exists and not a moderator, fires another nudge. If debate has moderatorId, calls `renderModScoring(debate, post)`. Calls `injectAdSlot(post, { marginTop: '8px' })` again. Attaches click listeners for rematch (calls `enterQueue`), share (calls `shareResult`), lobby (dynamic import + renderLobby), rival (awaits `declareRival`, shows toast, handles errors). Attaches opponent name click → `void showUserProfile(debate.opponentId)`. Attaches transcript click: builds a transcript overlay with message bubbles grouped by round, appends to body, removes on outside click.

### renderAfterEffects
Sync. Parameters: `breakdown` (typed object with debater_a/debater_b/inventory_effects or null) and `myRole` (string). Returns string. If `breakdown` is null, returns empty string. Extracts `myData` and `oppData` based on `myRole === 'a'`. Extracts `myAdj`, `oppAdj`, `invEffects` (defaulting to empty arrays). If all three are empty, returns empty string.

Defines inner function `renderChain(d, label)`: if `d.adjustments` is empty, returns empty string; builds a chain of step spans for each adjustment (sign + delta + effect_name via escapeHTML), joined by arrow spans; wraps in an `ae-row` div with raw_score and final_score. Defines inner function `renderInventoryEvent(ev)`: maps effect keys ('mirror', 'burn_notice', 'parasite', 'chain_reaction') to human-readable labels (using a EFFECT_LABELS constant); builds detail text per effect type using escapeHTML on string fields; returns an `ae-inv-row` div. Falls through to a JSON.stringify default for unknown effects (note: the JSON.stringify is wrapped in escapeHTML).

Calls `renderChain(myData, 'You')`, `renderChain(oppData, 'Opponent')`. Builds `invSection` from invEffects mapped through `renderInventoryEvent` if non-empty. If all three (myChain, oppChain, invSection) are empty, returns empty string. Otherwise returns an `arena-after-effects` wrapper div containing the chains and inventory section.

## Agent 02

### endCurrentDebate
Async, no params. Calls `set_view('postDebate')`, `pushArenaState('postDebate')`. Clears `roundTimer` if set. Calls three poll-stoppers: `stopReferencePoll()`, `stopModStatusPoll()`, `stopOpponentPoll()`. Removes `mod-request-modal` from DOM. Non-null asserts `currentDebate` to `debate`. Sets `citedRefs` from `loadedRefs.filter(r => r.cited)` for live mode, empty array otherwise.

Live mode path: calls `cleanupFeedRoom()` and `leaveDebate()`.

Nulled path: power-up cleanup, builds nulled screen, returns early.

Score calculation: concede path sets winner to non-conceder; AI with messages path shows judging UI, awaits `requestAIScoring`, sums or randomizes scores; AI without messages path randomizes; human PvP leaves all null.

End-of-debate modifiers: awaits `apply_end_of_debate_modifiers` RPC if conditions met; updates score vars from breakdown.

Main RPC block: awaits `update_arena_debate`; on success updates winner/scores/elo from server response. Then fires: `citeReference` for each cited ref (fire-and-forget); `resolve_bounty_attempt` if ranked (fire-and-forget); `resolveTournamentMatch` if tournament match (fire-and-forget with toast on complete); `save_ai_scorecard` if AI scores (awaited).

Non-unplugged block: claims debate tokens; awaits `settleStakes`; awaits `settle_sentiment_tips` (dynamic import); awaits `pay_reference_royalties` (dynamic import); awaits `resolve_audition_from_debate` (dynamic import, direct `_sb.rpc()` call); fires `convert_referral` for ranked PvP (void).

Post-block: sets null scores to 0, defaults winner to 'draw'. Fires nudge. Clears power-up state. Builds and appends post-debate screen HTML. Calls `injectAdSlot` twice. Fires moderator recruitment nudge. Calls `renderModScoring` if applicable. Wires rematch, share, lobby, rival, opponent-profile, transcript buttons.

### renderAfterEffects
Sync. Receives `breakdown | null` and `myRole`. Returns empty string if null or if no adjustments/inventory effects. Determines my/opp data by role. Has two inner functions: `renderChain` (renders score adjustment chain as HTML spans) and `renderInventoryEvent` (renders a single inventory effect event as HTML). Computes my chain, opp chain, and inventory section. Returns assembled HTML or empty string if all sections are empty.

## Agent 03

### endCurrentDebate
Async function. No parameters. Sets view to 'postDebate', pushes arena state. Clears round timer, stops three polls, removes mod-request modal. Reads current debate (non-null assert). Captures cited refs snapshot. Runs live-mode cleanup if applicable. Returns early with nulled-debate UI if `debate._nulled`. Otherwise: calculates scores (concede/AI-with-messages/AI-empty/human paths). Applies end-of-debate modifiers via RPC (conditional on non-mod, non-placeholder, non-ai). Calls update_arena_debate RPC (conditional on non-mod, non-placeholder), updating winner/scores/elo from result. Fires reference outcome logging, bounty resolution, tournament resolution, AI scorecard save. If non-unplugged: claims token rewards, settles stakes, settles sentiment tips, pays reference royalties, resolves audition, fires referral conversion. Renders post-debate UI with nudges, ad slots, action buttons. Wires UI interactions.

### renderAfterEffects
Sync function. Params: breakdown object or null, myRole string. Returns HTML string. Guards early on null or empty adjustments. Renders per-side score adjustment chains and inventory effect events. Uses two inner helper functions: renderChain and renderInventoryEvent.

## Agent 04

### endCurrentDebate
Async, no params. This is the only exported function. Performs the following sequence: (1) transitions view state to postDebate; (2) stops all polling and timers; (3) removes stale modal; (4) checks debate mode and branches to nulled-UI early return or scoring path; (5) computes scores via AI/concede/PvP branches; (6) applies end-of-debate modifiers via RPC; (7) calls update_arena_debate to finalize; (8) fires a series of side-effect RPCs (cite outcomes, bounty, tournament, AI scorecard save, stake settlement, sentiment tips, reference royalties, audition resolution, referral conversion); (9) renders the post-debate UI with elo, scores, staking results, action buttons; (10) wires UI event listeners.

Key behaviors: modView debates skip scoring and RPC calls (guarded by `!debate.modView`). Placeholder debates skip scoring. AI-local debates skip. Dynamic imports used for three RPCs (settle_sentiment_tips, pay_reference_royalties, resolve_audition_from_debate). `resolve_audition_from_debate` called via `_sb.rpc()` directly (not safeRpc). Multiple fire-and-forget patterns for non-critical RPCs.

### renderAfterEffects
Sync. Builds HTML for the "After Effects" section showing modifier chains. Returns '' if no effects fired. Uses escapeHTML throughout for user-provided content. Two inner functions: renderChain (builds score adjustment chain) and renderInventoryEvent (renders inventory effect events). Called from within endCurrentDebate's innerHTML template at line 337.

## Agent 05

### endCurrentDebate
Async function, no parameters. Sets view state and pushes URL state. Stops three polling operations and clears round timer. Removes mod-request modal from DOM. Reads `currentDebate` with non-null assertion. Snapshots cited refs (for live mode only). Handles live mode cleanup (feed + WebRTC). Handles nulled debate early return. Otherwise: score calculation with four branches (concede, AI-with-messages, AI-empty, human-PvP). Applies end-of-debate modifiers conditionally. Calls update_arena_debate conditionally. Fires multiple side-effect operations. Renders post-debate screen. Wires post-debate UI.

The condition guard for the main RPC block (`!debate.modView && !isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')`) is slightly different from the modifier guard (which also has `&& debate.mode !== 'ai'`). So modifiers are skipped for AI debates but update_arena_debate still runs for AI debates if they are not modView/placeholder.

### renderAfterEffects
Sync. Receives breakdown and myRole. Guards on null breakdown and empty effects. Renders HTML showing score adjustment chains and inventory effects. Returns empty string if nothing to show.

## Agent 06

### endCurrentDebate
Async. No params. Transitions to postDebate view. Clears round timer. Stops polls. Removes modal. Reads currentDebate. Snapshots live cited refs. Cleans up live debate (feed + WebRTC). Handles nulled path with early return. Four-branch score calculation. Modifier application (with mode !== 'ai' guard). update_arena_debate call (without mode !== 'ai' guard). Side-effect chain. Post-debate UI render. UI wiring.

NOTABLE: `set_roundTimer` is imported from arena-state but NOT called in this function — `clearInterval(roundTimer)` is called but the module variable is not reset to null after clearing. This could leave a stale timer reference in module state.

### renderAfterEffects
Sync. Builds After Effects HTML. Returns '' if no breakdown or no effects.

## Agent 07

### endCurrentDebate
Async, no params. Sets view to 'postDebate', pushes state, clears round timer, stops polls, removes modal. Non-null asserts currentDebate. Snapshots cited refs. Live mode: cleanupFeedRoom + leaveDebate. Nulled path: power-up cleanup, render null screen, return. Score path: four branches compute scoreA/B and winner. Modifier path: apply_end_of_debate_modifiers RPC (skip for AI debates). Update path: update_arena_debate RPC (runs for AI debates unlike modifiers). Reference outcomes, bounty, tournament, AI scorecard, stake settlement, sentiment tips, reference royalties, audition resolution, referral conversion. Post-debate render + wiring.

### renderAfterEffects
Returns '' for null or empty. Renders per-side score chains and inventory effect events. Uses escapeHTML.

## Agent 08

### endCurrentDebate
Async. No params. Step-by-step:
1. set_view('postDebate'), pushArenaState('postDebate')
2. clearInterval(roundTimer) if set
3. stopReferencePoll(), stopModStatusPoll(), stopOpponentPoll()
4. Remove mod-request-modal
5. const debate = currentDebate! (non-null assert)
6. citedRefs snapshot from loadedRefs for live mode
7. If live mode: cleanupFeedRoom(), leaveDebate()
8. If _nulled: power-up cleanup, render nulled UI, return
9. Initialize scoreA/scoreB/aiScores/winner = null
10. Score branch: concede → winner = opposite side; AI+messages → judging UI + requestAIScoring + sum/fallback; AI+no messages → random; PvP → null
11. Apply end-of-debate modifiers (if !modView, !placeholder, !ai-local, !ai-mode): safeRpc('apply_end_of_debate_modifiers')
12. Update debate (if !modView, !placeholder, !ai-local): safeRpc('update_arena_debate'). On success: update winner/scores/elo.
13. Fire side effects: citeReference per cited ref; resolve_bounty_attempt; resolveTournamentMatch; save_ai_scorecard.
14. If not unplugged: claimDebate/claimAiSparring; settleStakes; settle_sentiment_tips (dynamic import); pay_reference_royalties (dynamic import); resolve_audition_from_debate (dynamic import, direct _sb.rpc()); convert_referral (for ranked PvP).
15. Null-check scores → default 0; default winner to 'draw'.
16. Compute isDraw, didWin.
17. nudge()
18. Power-up cleanup
19. Render post-debate HTML (verdict, elo, staking, topic, scores, AI scorecard, after effects, action buttons)
20. injectAdSlot × 2
21. Moderator nudge
22. renderModScoring if applicable
23. Wire rematch, share, lobby, rival, opponent-profile, transcript listeners

### renderAfterEffects
Sync. Returns '' if null or no effects. Renders score adjustment chain and inventory effects as HTML. Uses escapeHTML throughout.

## Agent 09

### endCurrentDebate
Large async function with many sequential operations. Sets view state, clears timer, stops polls, removes modal, reads debate. Handles three high-level paths: (1) nulled debate → early return with null-debate UI; (2) normal scoring path → score calculation, modifier application, update_arena_debate, side effects, UI render; (3) throughout, modView/placeholder debates skip most RPCs. Multiple dynamic imports for auth module (settle_sentiment_tips, pay_reference_royalties, resolve_audition_from_debate) — each re-imports `safeRpc` or `getSupabaseClient` unnecessarily (they could reuse the statically imported `safeRpc`). The `resolve_audition_from_debate` call uses `_sb.rpc()` directly rather than `safeRpc()`, bypassing the 401 retry logic.

### renderAfterEffects
Sync renderer. Null-checks and early returns. Renders two per-side chains and an inventory section. Uses escapeHTML.

## Agent 10

### endCurrentDebate
Async, no parameters. Long function performing end-of-debate cleanup, scoring, RPC calls, and UI rendering. Key branching: modView debates skip scoring RPCs; _nulled debates get a simplified null-result screen and early return; AI debates with messages get AI scoring; human PvP gets server-determined scores. The `apply_end_of_debate_modifiers` RPC is skipped for AI debates (mode === 'ai' guard) but `update_arena_debate` is not. The `update_arena_debate` result is authoritative for winner and vote counts. Side-effect RPCs (bounty, tournament, royalties, audition) are fire-and-forget with logged errors. The `resolve_audition_from_debate` call uses a direct `_sb.rpc()` call without safeRpc, bypassing 401 retry. Post-debate UI is rendered entirely via innerHTML.

### renderAfterEffects
Sync. Returns empty string for null input or all-empty effects. Renders adjustment chains and inventory effects as HTML strings. Uses escapeHTML on user-controlled strings. Inner helpers renderChain and renderInventoryEvent handle the respective rendering.

## Agent 11

### endCurrentDebate
Async function. Sets view and pushes history state. Clears round timer and stops polls. Removes modal. Reads and non-null asserts currentDebate. Snapshots live cited refs. For live debates: cleanupFeedRoom + leaveDebate. For nulled debates: power-up cleanup + null screen + return. Score calculation: concede path, AI-with-messages path (async AI judging UI), AI-empty or no-opponent path (random scores), human-PvP path (null scores). Applies end-of-debate modifiers via RPC (not for AI, not for modView, not for placeholder). Calls update_arena_debate (not for modView/placeholder, but runs for AI). Updates winner/votes/elo from server result. Fires reference cite outcomes, bounty resolution, tournament resolution, AI scorecard save. Non-unplugged: claims tokens, settles stakes, settles sentiment tips, pays royalties, resolves audition, converts referral. Sets 0 defaults, computes isDraw/didWin. Calls nudge. Clears power-ups. Builds post-debate screen HTML and appends. Two ad slot injections. Mod recruitment nudge. renderModScoring call. Wires six event listeners on post-debate action buttons.

### renderAfterEffects
Sync. Takes breakdown (complex type or null) and myRole. Returns HTML string. Early return '' for null or no effects. Computes chains for my side and opponent. Computes inventory section. Returns '' if all empty. Otherwise wraps in arena-after-effects div.
