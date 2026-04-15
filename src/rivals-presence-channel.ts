/**
 * THE MODERATOR — Rivals Presence Channel (F-25)
 *
 * Supabase Realtime presence channel: builds the rival set, subscribes to
 * global-online, fires onAlert when an accepted rival joins.
 * Takes state-accessor objects to avoid an import cycle back to the orchestrator.
 * No imports from rivals-presence-popup or rivals-presence-css.
 */

import { getSupabaseClient, getCurrentUser, getMyRivals } from './auth.ts';
import type { RivalEntry } from './async.ts';

// Redeclared locally to avoid importing up to orchestrator (structural typing keeps them compatible).
interface PresencePayload {
  user_id: string;
  username: string | null;
  display_name: string | null;
}

type PresenceChannel = ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>['channel']>;

export interface ChannelState {
  rivalSet: Set<string>;
  onlineRivals: Set<string>;
  channelRef: { value: PresenceChannel | null };
  onAlert: (p: PresencePayload) => void;
}

// ============================================================
// PRESENCE CHANNEL
// ============================================================

export async function buildRivalSet(rivalSet: Set<string>): Promise<void> {
  // Clear before the await so stale IDs never persist if getMyRivals() rejects.
  // Previously cleared after the await (LANDMINE LM-RIVALS-002 / M-E5).
  rivalSet.clear();
  try {
    const rivals = (await getMyRivals()) as unknown as RivalEntry[];
    for (const r of rivals) {
      // Only alert for accepted/active rivals — skip pending
      if (r.status !== 'pending' && r.rival_id) {
        rivalSet.add(r.rival_id);
      }
    }
  } catch (e) {
    console.warn('[RivalsPresence] Failed to load rivals:', e);
  }
}

export async function startPresence(state: ChannelState): Promise<void> {
  const supabase = getSupabaseClient();
  const user = getCurrentUser();
  if (!supabase || !user) return;

  if (state.channelRef.value) {
    supabase.removeChannel(state.channelRef.value);
    state.channelRef.value = null;
  }

  // ADV-2: Set auth token for Realtime private channel RLS
  try { await supabase.realtime.setAuth(); } catch { /* session not ready */ }

  state.channelRef.value = supabase.channel('global-online', {
    config: {
      private: true, // ADV-2: enforce RLS on realtime.messages
      presence: { key: user.id },
    },
  });

  // When any user joins — check if they're a rival
  state.channelRef.value.on('presence', { event: 'join' }, ({ newPresences }: { newPresences: Array<Record<string, unknown>> }) => {
    for (const p of newPresences) {
      const payload = p as unknown as PresencePayload;
      if (!payload.user_id || payload.user_id === user.id) continue;
      if (!state.rivalSet.has(payload.user_id)) continue;
      if (state.onlineRivals.has(payload.user_id)) continue; // already alerted this session

      state.onlineRivals.add(payload.user_id);
      state.onAlert(payload);
    }
  });

  // When a rival leaves — allow re-alerting if they come back
  state.channelRef.value.on('presence', { event: 'leave' }, ({ leftPresences }: { leftPresences: Array<Record<string, unknown>> }) => {
    for (const p of leftPresences) {
      const payload = p as unknown as PresencePayload;
      if (payload.user_id) state.onlineRivals.delete(payload.user_id);
    }
  });

  state.channelRef.value.subscribe(async (status: string, err?: Error) => {
    if (status === 'SUBSCRIBED') {
      // Track own presence
      const profile = (await import('./auth.ts')).getCurrentProfile();
      try {
        await state.channelRef.value!.track({
          user_id: user.id,
          username: profile?.username ?? null,
          display_name: profile?.display_name ?? null,
        });
      } catch (e) {
        console.warn('[RivalsPresence] track() failed:', e);
      }
    } else if (status === 'CHANNEL_ERROR') {
      // ADV-2: RLS rejected — log and degrade gracefully
      console.warn('[RivalsPresence] Channel denied:', err?.message ?? 'no permissions');
    }
  });
}
