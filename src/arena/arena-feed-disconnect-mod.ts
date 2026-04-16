/**
 * arena-feed-disconnect-mod.ts — Moderator disconnect and mod-null handling
 *
 * handleModDisconnect: called when the moderator's presence disappears —
 * nulls the debate via record_mod_dropout and routes to end screen.
 *
 * modNullDebate: public action the mod triggers manually to eject a
 * debater or null the debate outright.
 */

import { safeRpc } from '../auth.ts';
import type { CurrentDebate } from './arena-types.ts';
import { currentDebate } from './arena-state.ts';
import {
  disconnectHandled, set_disconnectHandled,
} from './arena-feed-state.ts';
import { endCurrentDebate } from './arena-room-end.ts';
import { stopTranscription } from './arena-deepgram.ts';
import { writeFeedEvent, addLocalSystem, clearInterimTranscript } from './arena-feed-room.ts';
import { clearFeedTimer } from './arena-feed-machine-turns.ts';
import { stopHeartbeat } from './arena-feed-heartbeat.ts';
import { showDisconnectBanner } from './arena-feed-ui.ts';

export async function handleModDisconnect(debate: CurrentDebate): Promise<void> {
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
