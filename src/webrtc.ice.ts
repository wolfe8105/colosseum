/**
 * THE MODERATOR — WebRTC ICE / TURN Credentials
 *
 * TURN credential fetching. Async, network-only. No debate logic.
 */

import { state, FALLBACK_ICE_SERVERS } from './webrtc.state.ts';
import { getAccessToken } from './auth.ts';
import { SUPABASE_URL } from './config.ts';

/** Fetch short-lived TURN credentials from Edge Function. Returns null on failure. */
async function fetchTurnCredentials(): Promise<RTCIceServer[] | null> {
  try {
    const jwt = getAccessToken();
    if (!jwt) return null;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/turn-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
    });

    if (!res.ok) {
      console.warn(`[WebRTC] TURN credential fetch failed: ${res.status}`);
      return null;
    }

    const body = await res.json();
    if (!body.iceServers || !Array.isArray(body.iceServers)) {
      console.warn('[WebRTC] TURN response missing iceServers');
      return null;
    }

    console.debug('[WebRTC] TURN credentials acquired');
    return body.iceServers as RTCIceServer[];
  } catch (err) {
    console.warn('[WebRTC] TURN credential fetch error:', err);
    return null;
  }
}

/** Get ICE servers — uses fetched TURN credentials or falls back to STUN-only. */
export async function getIceServers(): Promise<RTCIceServer[]> {
  if (state.fetchedIceServers) return state.fetchedIceServers;

  // Deduplicate: if a fetch is already in flight, await it
  if (!state.turnFetchPromise) {
    state.turnFetchPromise = fetchTurnCredentials();
  }

  const result = await state.turnFetchPromise;
  state.turnFetchPromise = null;

  if (result) {
    state.fetchedIceServers = result;
    return result;
  }

  return FALLBACK_ICE_SERVERS;
}
