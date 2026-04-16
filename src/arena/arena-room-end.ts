// arena-room-end.ts — endCurrentDebate orchestrator.
// Dispatches to phase modules: nulled → scores → modifiers → finalize → render.

import { getCurrentProfile } from '../auth.ts';
import { removeShieldIndicator } from '../powerups.ts';
import { leaveDebate } from '../webrtc.ts';
import { nudge } from '../nudge.ts';
import {
  view, currentDebate, roundTimer, silenceTimer, activatedPowerUps, loadedRefs,
  set_view, set_silenceTimer, set_shieldActive,
} from './arena-state.ts';
import type { EndOfDebateBreakdown } from './arena-types-results.ts';
import { isPlaceholder, pushArenaState } from './arena-core.utils.ts';
import { stopOpponentPoll } from './arena-room-live-poll.ts';
import { stopReferencePoll } from './arena-mod-refs.ts';
import { stopModStatusPoll } from './arena-mod-queue-status.ts';
import { cleanupFeedRoom } from './arena-feed-room.ts';
import { renderNulledDebate } from './arena-room-end-nulled.ts';
import { generateScores } from './arena-room-end-scores.ts';
import { applyEndOfDebateModifiers, finalizeDebate } from './arena-room-end-finalize.ts';
import { renderPostDebate } from './arena-room-end-render.ts';

export async function endCurrentDebate(): Promise<void> {
  if (view === 'postDebate') return;
  set_view('postDebate');
  pushArenaState('postDebate');
  if (roundTimer) clearInterval(roundTimer);
  stopReferencePoll();
  stopModStatusPoll();
  stopOpponentPoll();
  document.getElementById('mod-request-modal')?.remove();

  const debate = currentDebate!;

  // Snapshot cited references before cleanup wipes loadedRefs
  const citedRefs = debate.mode === 'live' ? loadedRefs.filter((r) => r.cited) : [];

  if (debate.mode === 'live') {
    // F-51: Clean up feed room (unsubscribe Realtime, clear turn timer)
    cleanupFeedRoom();
    // Legacy live audio cleanup (safe to call even if not connected)
    leaveDebate();
  }

  // Phase 5: Nulled debate — skip scoring, Elo, tokens entirely
  if (debate._nulled) {
    renderNulledDebate(debate);
    return;
  }

  let { scoreA, scoreB, aiScores, winner } = await generateScores(debate);

  let eloChangeMe = 0;
  let endOfDebateBreakdown: EndOfDebateBreakdown | null = null;

  // LANDMINE [LM-END-002]: this guard and the finalize guard below have overlapping predicates.
  // Consider extracting an `isRealDebate(debate)` helper.
  // F-57 Phase 3: Apply end-of-debate modifiers BEFORE update_arena_debate so modified scores drive winner + Elo.
  if (!debate.modView && !isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-') && debate.mode !== 'ai') {
    const mods = await applyEndOfDebateModifiers(debate, scoreA, scoreB);
    scoreA = mods.scoreA;
    scoreB = mods.scoreB;
    endOfDebateBreakdown = mods.breakdown;
  }

  // LANDMINE [LM-END-002]: overlapping predicate guard — see above.
  if (!debate.modView && !isPlaceholder() && !debate.id.startsWith('ai-local-') && !debate.id.startsWith('placeholder-')) {
    const fin = await finalizeDebate(debate, winner, scoreA, scoreB, citedRefs, aiScores);
    winner = fin.winner;
    scoreA = fin.scoreA;
    scoreB = fin.scoreB;
    eloChangeMe = fin.eloChangeMe;
  }

  // Ensure scores have display values
  if (scoreA == null) scoreA = 0;
  if (scoreB == null) scoreB = 0;
  if (!winner) winner = 'draw';

  const isDraw = winner === 'draw';
  const didWin = !isDraw && winner === debate.role;

  // LANDMINE [LM-END-005]: losses and draws both get nudge severity 'info' — visually indistinguishable if severity drives treatment.
  nudge('final_score', isDraw ? '\uD83E\uDD1D Draw. Evenly matched.' : didWin ? '\uD83C\uDFC6 Victory. The arena remembers.' : '\uD83D\uDC80 Defeat. Come back stronger.', isDraw ? 'info' : didWin ? 'success' : 'info');

  // Clean up power-up state
  if (silenceTimer) { clearInterval(silenceTimer); set_silenceTimer(null); }
  removeShieldIndicator();
  set_shieldActive(false);
  activatedPowerUps.clear();
  document.getElementById('powerup-silence-overlay')?.remove();
  document.getElementById('powerup-reveal-popup')?.remove();

  const profile = getCurrentProfile();
  const myName = profile?.display_name || 'You';

  renderPostDebate(debate, {
    scoreA, scoreB, winner, aiScores, eloChangeMe, endOfDebateBreakdown, myName,
  });
}
