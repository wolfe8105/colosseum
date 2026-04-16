/**
 * arena-feed-realtime.ts — Supabase Realtime channel subscription
 * for the live debate feed room.
 *
 * Owns: channel subscription (postgres_changes INSERT into debate_feed_events)
 * + broadcast wiring (heartbeat, goodbye events).
 *
 * Heartbeat logic extracted to arena-feed-heartbeat.ts.
 * Disconnect handling extracted to arena-feed-disconnect.ts.
 *
 * LANDMINE [LM-REALTIME-001] — setParticipantGoneCallback wires handleParticipantGone
 * into the heartbeat module to avoid heartbeat ↔ disconnect circular dep.
 * This wiring happens in subscribeRealtime() at runtime.
 *
 * Session 241 split from arena-feed-room.ts. Session 254 refactor.
 */

import { getSupabaseClient } from '../auth.ts';
import {
  currentDebate, feedRealtimeChannel, set_feedRealtimeChannel,
} from './arena-state.ts';
import {
  lastSeen,
} from './arena-feed-state.ts';
import type { FeedEvent } from './arena-types-feed-room.ts';
import { isPlaceholder } from './arena-core.utils.ts';
import {
  appendFeedEvent,
} from './arena-feed-room.ts';
import { startHeartbeat, stopHeartbeat, sendGoodbye, setParticipantGoneCallback } from './arena-feed-heartbeat.ts';
import { handleParticipantGone, modNullDebate } from './arena-feed-disconnect.ts';

// Wire the callback on module load so heartbeat can call handleParticipantGone
// without a direct import (which would create a circular dep).
setParticipantGoneCallback(handleParticipantGone);

export async function subscribeRealtime(debateId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || isPlaceholder()) return;

  // Set auth token before subscribing so the private channel has a valid JWT context.
  const { data: sessionData } = await (client as any).auth.getSession();
  const accessToken = sessionData?.session?.access_token ?? null;
  if (accessToken) (client as any).realtime.setAuth(accessToken);

  const channel = (client as any)
    .channel(`feed:${debateId}`, { config: { private: true } })
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

// Re-export for backward compat — callers of this module may use these
export { startHeartbeat, stopHeartbeat, sendGoodbye } from './arena-feed-heartbeat.ts';
export { modNullDebate } from './arena-feed-disconnect.ts';

// Suppress unused import
void currentDebate;
