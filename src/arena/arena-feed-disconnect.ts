/**
 * arena-feed-disconnect.ts — Disconnect orchestrator
 *
 * handleParticipantGone: public router — dispatches to debater or mod
 * disconnect path based on the role argument.
 *
 * Sub-files:
 *   arena-feed-disconnect-debater.ts — handleDebaterDisconnect,
 *                                      handleDebaterDisconnectAsViewer
 *   arena-feed-disconnect-mod.ts    — handleModDisconnect, modNullDebate
 *
 * LANDMINE [LM-REALTIME-001] — checkStaleness (in arena-feed-heartbeat.ts) calls
 * handleParticipantGone via a registered callback to break the
 * heartbeat ↔ disconnect circular dep. Registered in subscribeRealtime()
 * (arena-feed-realtime.ts).
 */

import { currentDebate, feedRealtimeChannel } from './arena-state.ts';
import {
  phase,
  disconnectHandled, set_disconnectHandled,
} from './arena-feed-state.ts';
import {
  appendFeedEvent, setDebaterInputEnabled, clearInterimTranscript,
} from './arena-feed-room.ts';
import { clearFeedTimer } from './arena-feed-machine-turns.ts';
import { stopTranscription } from './arena-deepgram.ts';
import { stopHeartbeat } from './arena-feed-heartbeat.ts';
import { handleDebaterDisconnect, handleDebaterDisconnectAsViewer } from './arena-feed-disconnect-debater.ts';
import { handleModDisconnect } from './arena-feed-disconnect-mod.ts';

export { modNullDebate } from './arena-feed-disconnect-mod.ts';
export { showDisconnectBanner } from './arena-feed-ui.ts';

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

// Suppress unused import warning for feedRealtimeChannel
void feedRealtimeChannel;
void appendFeedEvent;
