/**
 * arena-feed-disconnect-debater.ts — Debater disconnect handling
 *
 * handleDebaterDisconnect: called by the remaining debater's client to
 * record the outcome via RPC and route to the end screen.
 *
 * handleDebaterDisconnectAsViewer: called by mod/spectator clients that
 * observe a debater disconnect — shows the banner and auto-routes
 * spectators to lobby.
 */

import { safeRpc, getCurrentProfile } from '../auth.ts';
import type { CurrentDebate } from './arena-types.ts';
import { round, scoreA, scoreB } from './arena-feed-state.ts';
import { endCurrentDebate } from './arena-room-end.ts';
import { writeFeedEvent, addLocalSystem, cleanupFeedRoom } from './arena-feed-room.ts';
import { showDisconnectBanner } from './arena-feed-ui.ts';

export async function handleDebaterDisconnect(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): Promise<void> {
  const disconnectorName = disconnectedSide === 'a'
    ? (debate.role === 'a' ? (getCurrentProfile()?.display_name || 'You') : debate.opponentName)
    : (debate.role === 'b' ? (getCurrentProfile()?.display_name || 'You') : debate.opponentName);

  // Write feed event
  writeFeedEvent('disconnect', `${disconnectorName} disconnected.`, 'mod').catch(e => console.warn('[disconnect-debater] writeFeedEvent failed', e));
  addLocalSystem(`${disconnectorName} disconnected.`);

  // Determine outcome: was the disconnector winning?
  const disconnectorScore = disconnectedSide === 'a' ? scoreA : scoreB;
  const opponentScore = disconnectedSide === 'a' ? scoreB : scoreA;

  if (disconnectorScore > opponentScore) {
    // Disconnector was winning → null
    debate._nulled = true;
    debate._nullReason = `${disconnectorName} disconnected while ahead — debate nulled`;
    await safeRpc('update_arena_debate', {
      p_debate_id: debate.id,
      p_status: 'cancelled',
      p_current_round: round,
    }).catch((e) => console.warn('[FeedRoom] cancel debate failed:', e));
  } else {
    // Disconnector was losing or tied → loss for disconnector, win for opponent
    const winnerSide = disconnectedSide === 'a' ? 'b' : 'a';
    await safeRpc('update_arena_debate', {
      p_debate_id: debate.id,
      p_status: 'complete',
      p_current_round: round,
      p_winner: winnerSide,
      p_score_a: scoreA,
      p_score_b: scoreB,
    }).catch((e) => console.warn('[FeedRoom] finalize debate failed:', e));
    // endCurrentDebate will call update_arena_debate again but double-finalize guard catches it
  }

  // Go to end screen
  setTimeout(() => endCurrentDebate().catch(e => console.error('[disconnect-debater] endCurrentDebate failed', e)), 1500);
}

export function handleDebaterDisconnectAsViewer(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): void {
  const disconnectorName = disconnectedSide === 'a'
    ? (debate.debaterAName || 'Side A')
    : (debate.debaterBName || 'Side B');
  addLocalSystem(`${disconnectorName} disconnected.`);
  showDisconnectBanner(`${disconnectorName} disconnected — debate ending`);

  if (debate.spectatorView) {
    // Auto-route spectator to lobby after 5s
    setTimeout(() => {
      document.getElementById('feed-disconnect-banner')?.remove();
      cleanupFeedRoom();
      import('./arena-lobby.ts')
        .then(m => m.renderLobby())
        .catch(err => console.error('[disconnect-debater] Failed to load arena-lobby', err));
    }, 5000);
  }
  // Mod viewer: just wait — endCurrentDebate will be triggered by the remaining debater's RPC
}
