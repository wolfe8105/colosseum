# Refactor Prompt — arena-room-end.ts (556 lines)

Read CLAUDE.md first. Then paste the block below into Claude Code:

```
Refactor src/arena/arena-room-end.ts (556 lines).

Read CLAUDE.md first, then read src/arena/arena-room-end.ts in full before touching anything. The file is one huge async function `endCurrentDebate()` plus a pure HTML helper `renderAfterEffects()`.

SPLIT MAP (verify against the file before executing):

1. arena-room-end.ts (orchestrator, ~80 lines)
   Keeps `endCurrentDebate()` as the entry point. Responsibilities:
   - initial teardown (set_view, pushArenaState, clear roundTimer, stop polls, remove mod-request-modal)
   - snapshot citedRefs
   - live-mode cleanup (cleanupFeedRoom, leaveDebate)
   - dispatch to the phase modules below and thread results between them
   - power-up cleanup block (silenceTimer, removeShieldIndicator, activatedPowerUps.clear, overlay/popup removes)
   - final call to renderPostDebate

2. arena-room-end-nulled.ts (~45 lines)
   `export function renderNulledDebate(debate: CurrentDebate): void`
   Handles the whole `if (debate._nulled)` early-return path: power-up cleanup + the nulled post-debate screen DOM + back-to-lobby handler. Called from the orchestrator BEFORE scoring when `debate._nulled` is true.

3. arena-room-end-scores.ts (~75 lines)
   `export async function generateScores(debate: CurrentDebate): Promise<{ scoreA, scoreB, aiScores, winner }>`
   Encapsulates the concede / AI / placeholder / PvP scoring logic AND renders the "THE JUDGE IS REVIEWING..." loading screen during AI scoring.

4. arena-room-end-finalize.ts (~140 lines — largest section file, acceptable)
   Two exports:
   - `export async function applyEndOfDebateModifiers(debate, scoreA, scoreB)` — wraps the apply_end_of_debate_modifiers RPC and updates scoreA/scoreB from the breakdown.
   - `export async function finalizeDebate(debate, winner, scoreA, scoreB, citedRefs, aiScores)` — the server update_arena_debate call + all side effects: arsenal reference stats (citeReference loop), bounty resolution, tournament resolution, AI scorecard save, token claims, settleStakes, settle_sentiment_tips, pay_reference_royalties, resolve_audition, convert_referral.
   Grouped together because they share a tight context (debate, winner, scoreA, scoreB, citedRefs, aiScores) and splitting further would force passing all of that through 3+ function signatures.

5. arena-room-end-render.ts (~130 lines)
   `export function renderPostDebate(debate, { scoreA, scoreB, winner, aiScores, eloChangeMe, endOfDebateBreakdown, myName })`
   Builds the post-debate screen HTML and wires the rematch / share / lobby / add-rival / clickable-opp event handlers. Calls injectAdSlot twice and calls renderModScoring. Delegates transcript modal to the transcript module.

6. arena-room-end-transcript.ts (~55 lines)
   `export function attachTranscriptHandler(debate: CurrentDebate): void` — attaches the click handler for #arena-transcript that builds the transcript bottom-sheet overlay.

7. arena-room-end-after-effects.ts (~100 lines)
   `export function renderAfterEffects(breakdown, myRole): string` + the two inner helpers `renderChain` and `renderInventoryEvent`. The `InventoryEffect` type stays with this file if it's only used here.

RULES:
- No barrel files. No index.ts re-exports. Direct imports only.
- `import type` for all type-only imports (CurrentDebate, AIScoreResult, UpdateDebateResult, DebateRole, InventoryEffect).
- Dependency direction: orchestrator imports all 6 phase files. Render imports after-effects and transcript. Other files are flat — no cross-imports.
- Target under 300 lines, preference 150. Finalize at ~140 is acceptable.
- Run `npm run build` after the split, report chunk sizes and line counts for every new file.
- Run `npm run typecheck` and confirm zero NEW errors in arena-room-end* files.

LANDMINES — log these as `// LANDMINE [LM-END-NNN]: description` comments. Do NOT fix them:

- LM-END-001 (in finalize.ts): Lines 155-163 have IDENTICAL branches for `myRole === 'a'` and `myRole === 'b'` — both assign `scoreA = debater_a.final_score; scoreB = debater_b.final_score;`. The role check is dead code. Likely an incomplete refactor — the 'b' branch may have been intended to swap.
- LM-END-002 (in orchestrator): Lines 149 and 171 have two separate guards with overlapping predicates. Consider extracting an `isRealDebate(debate)` helper.
- LM-END-003 (in finalize.ts finalizeDebate): Lines 247-256 do two separate dynamic `import('../auth.ts')` calls, one aliased as `_safeRpc`. Both are redundant — module-level safeRpc is already in scope.
- LM-END-004 (in finalize.ts finalizeDebate): Lines 264-277 — referral conversion `if` is indented inconsistently inside the `if (debate.ruleset !== 'unplugged')` block. Verify intent.
- LM-END-005 (in orchestrator near nudge): Line 287 — losses and draws both get nudge severity 'info'. Visually indistinguishable if severity drives treatment.
- LM-END-006 (in render.ts near injectAdSlot): Lines 352 and 365 call injectAdSlot(post) twice on the same container. Verify intent.

Do NOT fix landmines. Refactor only.

Wait for approval of the split map before writing any code.
```
