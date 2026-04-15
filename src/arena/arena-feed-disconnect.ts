/**
 * arena-feed-disconnect.ts — Participant disconnect and mod-null handling
 *
 * handleParticipantGone, handleDebaterDisconnect, handleDebaterDisconnectAsViewer,
 * handleModDisconnect, modNullDebate, showDisconnectBanner
 *
 * Extracted from arena-feed-realtime.ts (Session 254 track).
 *
 * LANDMINE [LM-REALTIME-001] — checkStaleness (in arena-feed-heartbeat.ts) calls
 * handleParticipantGone via a registered callback to break the
 * heartbeat ↔ disconnect circular dep. Registered in subscribeRealtime()
 * (arena-feed-realtime.ts).
 */

import { safeRpc, getCurrentProfile } from '../auth.ts';
import {
  currentDebate, feedRealtimeChannel,
} from './arena-state.ts';
import {
  phase, round, scoreA, scoreB,
  disconnectHandled, set_disconnectHandled,
} from './arena-feed-state.ts';
import type { CurrentDebate } from './arena-types.ts';
import { endCurrentDebate } from './arena-room-end.ts';
import { stopTranscription } from './arena-deepgram.ts';
import {
  appendFeedEvent, addLocalSystem, setDebaterInputEnabled,
  writeFeedEvent, clearInterimTranscript, cleanupFeedRoom,
} from './arena-feed-room.ts';
import { clearFeedTimer } from './arena-feed-machine-turns.ts';
import { stopHeartbeat } from './arena-feed-heartbeat.ts';

export function handleParticipantGone(role: string): void {
  if (disconnectHandled) return;
  set_disconnectHandled(true);
  const debate = currentDebate;
  if (!debate) return;
  // Skip if already ending
  if (debate.concededBy || debate._nulled || phase === 'finished') return;

  // Stop everything
  clearFeedTimer();
  stopTranscription();
  clearInterimTranscript();
  stopHeartbeat();
  if (!debate.modView && !debate.spectatorView) setDebaterInputEnabled(false);

  if (role === 'mod') {
    // Moderator disconnected — null the debate via record_mod_dropout
    void handleModDisconnect(debate);
  } else if (role === 'a' || role === 'b') {
    if (debate.modView) {
      // Mod sees debater disconnect — show banner but don't call RPC (debaters handle it)
      handleDebaterDisconnectAsViewer(debate, role as 'a' | 'b');
    } else if (debate.spectatorView) {
      // Spectator sees it — show banner, auto-route to lobby
      handleDebaterDisconnectAsViewer(debate, role as 'a' | 'b');
    } else {
      // Other debater handles it — call RPC
      void handleDebaterDisconnect(debate, role as 'a' | 'b');
    }
  }
}

async function handleDebaterDisconnect(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): Promise<void> {
  const disconnectorName = disconnectedSide === 'a'
    ? (debate.role === 'a' ? (getCurrentProfile()?.display_name || 'You') : debate.opponentName)
    : (debate.role === 'b' ? (getCurrentProfile()?.display_name || 'You') : debate.opponentName);

  // Write feed event
  void writeFeedEvent('disconnect', `${disconnectorName} disconnected.`, 'mod');
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
  setTimeout(() => void endCurrentDebate(), 1500);
}

function handleDebaterDisconnectAsViewer(debate: CurrentDebate, disconnectedSide: 'a' | 'b'): void {
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
      import('./arena-lobby.ts').then(m => m.renderLobby());
    }, 5000);
  }
  // Mod viewer: just wait — endCurrentDebate will be triggered by the remaining debater's RPC
}

async function handleModDisconnect(debate: CurrentDebate): Promise<void> {
  const modName = debate.moderatorName || 'Moderator';
  void writeFeedEvent('disconnect', `${modName} disconnected.`, 'mod');
  addLocalSystem(`${modName} disconnected — debate nulled.`);
  showDisconnectBanner('Moderator disconnected — debate nulled');

  debate._nulled = true;
  debate._nullReason = 'Moderator disconnected — debate nulled';

  // Call record_mod_dropout — nulls debate + applies penalty
  await safeRpc('record_mod_dropout', {
    p_debate_id: debate.id,
  }).catch((e) => console.warn('[FeedRoom] record_mod_dropout failed:', e));

  setTimeout(() => void endCurrentDebate(), 1500);
}

/** Mod action: eject a debater or null the debate */
export async function modNullDebate(reason: 'eject_a' | 'eject_b' | 'null'): Promise<void> {
  if (disconnectHandled) return;
  set_disconnectHandled(true);
  const debate = currentDebate;
  if (!debate) return;

  clearFeedTimer();
  stopTranscription();
  clearInterimTranscript();
  stopHeartbeat();

  let msg: string;
  if (reason === 'null') {
    msg = 'Moderator nulled the debate.';
  } else {
    const ejectedName = reason === 'eject_a'
      ? (debate.debaterAName || 'Side A')
      : (debate.debaterBName || 'Side B');
    msg = `${ejectedName} ejected by moderator.`;
  }

  void writeFeedEvent('disconnect', msg, 'mod');
  addLocalSystem(msg);

  debate._nulled = true;
  debate._nullReason = msg;

  await safeRpc('mod_null_debate', {
    p_debate_id: debate.id,
    p_reason: reason,
  }).catch((e) => console.warn('[FeedRoom] mod_null_debate failed:', e));

  setTimeout(() => void endCurrentDebate(), 1500);
}

export function showDisconnectBanner(message: string): void {
  document.getElementById('feed-disconnect-banner')?.remove();
  const banner = document.createElement('div');
  banner.id = 'feed-disconnect-banner';
  banner.className = 'feed-disconnect-banner';
  banner.textContent = message;
  const room = document.querySelector('.feed-room');
  if (room) room.prepend(banner);
}

// Suppress unused import warning for feedRealtimeChannel
void feedRealtimeChannel;
void appendFeedEvent;
