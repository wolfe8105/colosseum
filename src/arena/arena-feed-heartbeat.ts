/**
 * arena-feed-heartbeat.ts — Heartbeat broadcast + staleness check
 *
 * startHeartbeat, stopHeartbeat, sendGoodbye, checkStaleness (private)
 * Extracted from arena-feed-realtime.ts (Session 254 track).
 *
 * LANDMINE [LM-REALTIME-001] — checkStaleness calls handleParticipantGone via
 * a registered callback to break the heartbeat ↔ disconnect circular dep.
 * Callback registered in subscribeRealtime() (arena-feed-realtime.ts) via
 * setParticipantGoneCallback(). Without the callback, heartbeat.ts would need
 * to import from disconnect.ts (handleParticipantGone) and disconnect.ts would
 * need stopHeartbeat from heartbeat.ts — a cycle.
 */

import {
  currentDebate, feedRealtimeChannel,
} from './arena-state.ts';
import {
  phase,
  lastSeen, heartbeatSendTimer, heartbeatCheckTimer, disconnectHandled,
  HEARTBEAT_INTERVAL_MS, HEARTBEAT_STALE_MS,
  set_heartbeatSendTimer, set_heartbeatCheckTimer, set_disconnectHandled,
} from './arena-feed-state.ts';
import { isPlaceholder } from './arena-core.utils.ts';

// Callback to call when a participant goes stale — set by arena-feed-realtime.ts
// to avoid heartbeat ↔ disconnect circular dep.
let _onParticipantGone: ((role: string) => void) | null = null;

export function setParticipantGoneCallback(fn: (role: string) => void): void {
  _onParticipantGone = fn;
}

export function startHeartbeat(): void {
  // TIMING-05 fix: clear any existing heartbeat first to prevent timer stacking
  // if startHeartbeat is called twice (e.g., feed room re-entered without cleanup).
  stopHeartbeat();

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
    feedRealtimeChannel.send({
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
  feedRealtimeChannel.send({
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
      _onParticipantGone?.(opponentRole);
      return;
    }
  }

  // Check mod disconnect (either debater can act)
  if (!debate.modView && debate.moderatorId && debate.moderatorType === 'human') {
    const modTs = lastSeen['mod'];
    if (modTs && (now - modTs) > HEARTBEAT_STALE_MS) {
      _onParticipantGone?.('mod');
      return;
    }
  }
}
