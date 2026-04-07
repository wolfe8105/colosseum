/**
 * arena-feed-realtime.ts — Supabase Realtime channel + heartbeat + disconnect handling
 * for the live debate feed room.
 *
 * Extracted from arena-feed-room.ts (Session 241 split). Owns:
 *  - Channel subscription (postgres_changes for INSERT into debate_feed_events)
 *  - Heartbeat broadcast (send + staleness check)
 *  - Goodbye broadcast on page unload
 *  - Participant-gone handlers (debater + moderator disconnect, mod ejection/null)
 *  - Disconnect banner UI
 *
 * State lives in arena-feed-state.ts. UI helpers (appendFeedEvent, addLocalSystem,
 * writeFeedEvent, clearFeedTimer, setDebaterInputEnabled, clearInterimTranscript)
 * live in arena-feed-room.ts. There is a circular import (room ↔ realtime) but
 * it is safe because every cross-file call happens at runtime inside a function
 * body, never at module top level.
 */

import { safeRpc, getCurrentProfile, getSupabaseClient } from '../auth.ts';
import {
  currentDebate, feedRealtimeChannel, set_feedRealtimeChannel,
} from './arena-state.ts';
import {
  phase, round, scoreA, scoreB,
  lastSeen, heartbeatSendTimer, heartbeatCheckTimer, disconnectHandled,
  HEARTBEAT_INTERVAL_MS, HEARTBEAT_STALE_MS,
  set_heartbeatSendTimer, set_heartbeatCheckTimer, set_disconnectHandled,
} from './arena-feed-state.ts';
import type { CurrentDebate, FeedEvent } from './arena-types.ts';
import { isPlaceholder } from './arena-core.ts';
import { endCurrentDebate } from './arena-room-end.ts';
import { stopTranscription } from './arena-deepgram.ts';
import {
  appendFeedEvent, clearFeedTimer, addLocalSystem, setDebaterInputEnabled,
  writeFeedEvent, clearInterimTranscript, cleanupFeedRoom,
} from './arena-feed-room.ts';

// ============================================================
// REALTIME SUBSCRIPTION
// ============================================================

export function subscribeRealtime(debateId: string): void {
  const client = getSupabaseClient();
  if (!client || isPlaceholder()) return;

  const channel = (client as any)
    .channel(`feed:${debateId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'debate_feed_events',
        filter: `debate_id=eq.${debateId}`,
      },
      (payload: { new: FeedEvent }) => {
        appendFeedEvent(payload.new);
      },
    )
    .on(
      'broadcast',
      { event: 'heartbeat' },
      (payload: { payload?: { role?: string; ts?: number } }) => {
        const role = payload?.payload?.role;
        if (role) lastSeen[role] = Date.now();
      },
    )
    .on(
      'broadcast',
      { event: 'goodbye' },
      (payload: { payload?: { role?: string } }) => {
        const role = payload?.payload?.role;
        if (role) handleParticipantGone(role);
      },
    )
    .subscribe();

  set_feedRealtimeChannel(channel);

  // Start heartbeat send + staleness checker
  startHeartbeat();
}

export function unsubscribeRealtime(): void {
  const client = getSupabaseClient();
  if (client && feedRealtimeChannel) {
    (client as any).removeChannel(feedRealtimeChannel);
    set_feedRealtimeChannel(null);
  }
}

// ============================================================
// PHASE 5: BROADCAST HEARTBEAT + DISCONNECT DETECTION
// ============================================================

export function startHeartbeat(): void {
  const debate = currentDebate;
  if (!debate || isPlaceholder()) return;

  // Determine our role label for broadcasts
  const myRole = debate.modView ? 'mod' : debate.spectatorView ? 'spec' : debate.role;

  // Seed lastSeen for all expected participants so we don't false-trigger
  const now = Date.now();
  if (!debate.spectatorView) {
    lastSeen['a'] = now;
    lastSeen['b'] = now;
    if (debate.moderatorId && debate.moderatorType === 'human') lastSeen['mod'] = now;
  }
  set_disconnectHandled(false);

  // Send heartbeat every 10s
  const sendBeat = () => {
    if (!feedRealtimeChannel) return;
    (feedRealtimeChannel as any).send({
      type: 'broadcast',
      event: 'heartbeat',
      payload: { role: myRole, ts: Date.now() },
    });
  };
  // Send first beat immediately
  sendBeat();
  set_heartbeatSendTimer(setInterval(sendBeat, HEARTBEAT_INTERVAL_MS));

  // Check staleness every 5s (debaters and mod only — spectators watch but don't act)
  if (!debate.spectatorView) {
    set_heartbeatCheckTimer(setInterval(() => checkStaleness(), 5000));
  }
}

export function stopHeartbeat(): void {
  if (heartbeatSendTimer) { clearInterval(heartbeatSendTimer); set_heartbeatSendTimer(null); }
  if (heartbeatCheckTimer) { clearInterval(heartbeatCheckTimer); set_heartbeatCheckTimer(null); }
  delete lastSeen['a'];
  delete lastSeen['b'];
  delete lastSeen['mod'];
}

/** Send goodbye on page unload for instant detection */
export function sendGoodbye(): void {
  const debate = currentDebate;
  if (!debate || !feedRealtimeChannel) return;
  const myRole = debate.modView ? 'mod' : debate.spectatorView ? 'spec' : debate.role;
  // fire-and-forget — page is closing
  (feedRealtimeChannel as any).send({
    type: 'broadcast',
    event: 'goodbye',
    payload: { role: myRole },
  });
}

function checkStaleness(): void {
  if (disconnectHandled) return;
  if (phase === 'finished' || phase === 'vote_gate') return;
  const debate = currentDebate;
  if (!debate) return;
  // Don't check if debate already ended
  if (debate.concededBy || debate._nulled) return;

  const now = Date.now();

  // Check debater disconnect (only the OTHER debater acts)
  if (!debate.modView) {
    const opponentRole = debate.role === 'a' ? 'b' : 'a';
    const opponentTs = lastSeen[opponentRole];
    if (opponentTs && (now - opponentTs) > HEARTBEAT_STALE_MS) {
      handleParticipantGone(opponentRole);
      return;
    }
  }

  // Check mod disconnect (either debater can act)
  if (!debate.modView && debate.moderatorId && debate.moderatorType === 'human') {
    const modTs = lastSeen['mod'];
    if (modTs && (now - modTs) > HEARTBEAT_STALE_MS) {
      handleParticipantGone('mod');
      return;
    }
  }
}

function handleParticipantGone(role: string): void {
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
    handleModDisconnect(debate);
  } else if (role === 'a' || role === 'b') {
    if (debate.modView) {
      // Mod sees debater disconnect — show banner but don't call RPC (debaters handle it)
      handleDebaterDisconnectAsViewer(debate, role as 'a' | 'b');
    } else if (debate.spectatorView) {
      // Spectator sees it — show banner, auto-route to lobby
      handleDebaterDisconnectAsViewer(debate, role as 'a' | 'b');
    } else {
      // Other debater handles it — call RPC
      handleDebaterDisconnect(debate, role as 'a' | 'b');
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

function showDisconnectBanner(message: string): void {
  document.getElementById('feed-disconnect-banner')?.remove();
  const banner = document.createElement('div');
  banner.id = 'feed-disconnect-banner';
  banner.className = 'feed-disconnect-banner';
  banner.textContent = message;
  const room = document.querySelector('.feed-room');
  if (room) room.prepend(banner);
}
