/**
 * arena-deepgram.token.ts — Deepgram token fetching
 * Fetches short-lived JWT from the deepgram-token Edge Function.
 * Extracted from arena-deepgram.ts (Session 254 track).
 */

import { getAccessToken } from '../auth.ts';
import { SUPABASE_URL } from '../config.ts';

export async function fetchDeepgramToken(): Promise<string | null> {
  try {
    const jwt = getAccessToken();
    if (!jwt) return null;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/deepgram-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
    });

    if (!res.ok) {
      console.warn(`[Deepgram] Token fetch failed: ${res.status}`);
      return null;
    }

    const body = await res.json();
    if (!body.token) {
      console.warn('[Deepgram] Token response missing token field');
      return null;
    }

    return body.token as string;
  } catch (err) {
    console.warn('[Deepgram] Token fetch error:', err);
    return null;
  }
}
