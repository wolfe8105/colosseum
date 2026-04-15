/**
 * THE MODERATOR — Rivals Presence (F-25)
 *
 * Tracks rival users coming online via Supabase Realtime presence.
 * When an accepted rival joins the global-online channel, fires an alert popup.
 *
 * Orchestrator: owns shared state, wires sub-modules, exposes init/destroy.
 * Depends on: auth.ts, config.ts, rivals-presence-channel.ts, rivals-presence-popup.ts
 * Init: called from pages/home.ts onChange after user + profile exist
 */

import { getSupabaseClient, getCurrentUser, getIsPlaceholderMode } from './auth.ts';
import { FEATURES } from './config.ts';
import { buildRivalSet, startPresence } from './rivals-presence-channel.ts';
import { queueAlert } from './rivals-presence-popup.ts';
import type { PopupState } from './rivals-presence-popup.ts';
import type { ChannelState } from './rivals-presence-channel.ts';

// ============================================================
// TYPES
// ============================================================

export interface PresencePayload {
  user_id: string;
  username: string | null;
  display_name: string | null;
}

// ============================================================
// STATE
// ============================================================

type PresenceChannel = ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>['channel']>;

const rivalSet = new Set<string>();
const onlineRivals = new Set<string>();
const popupState: PopupState = { queue: [], active: false };
const channelRef: { value: PresenceChannel | null } = { value: null };
let initialized = false;

// ============================================================
// PUBLIC API
// ============================================================

export async function init(): Promise<void> {
  if (!FEATURES.rivals) return;
  if (getIsPlaceholderMode()) return;
  const user = getCurrentUser();
  if (!user) return;
  if (initialized) return; // only init once per session

  initialized = true;

  await buildRivalSet(rivalSet);

  const channelState: ChannelState = {
    rivalSet,
    onlineRivals,
    channelRef,
    onAlert: (p) => queueAlert(p, popupState),
  };
  await startPresence(channelState);
}

export function destroy(): void {
  const supabase = getSupabaseClient();
  if (supabase && channelRef.value) {
    supabase.removeChannel(channelRef.value);
    channelRef.value = null;
  }
  rivalSet.clear();
  onlineRivals.clear();
  popupState.queue.length = 0;
  popupState.active = false;
  initialized = false;

  const popup = document.getElementById('rival-alert-popup');
  if (popup) popup.remove();
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

const rivalsPresence = { init, destroy } as const;
export default rivalsPresence;
