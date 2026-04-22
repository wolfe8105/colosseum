/**
 * THE MODERATOR — Dependency Health Clamps
 *
 * One clamp per external dependency type. Each clamp detects failure at the
 * boundary and fires a trackEvent to PostHog (via analytics.ts dual-track).
 *
 * Clamp 1: Supabase Realtime — connection state (disconnect/reconnect)
 * Clamp 2: Stripe — checkout session creation failure
 * Clamp 3: Deepgram — WebSocket health (connect/disconnect/error)
 * Clamp 4: Vercel — serverless function health (response status)
 *
 * PostgREST clamp is handled separately by Zod validation in safeRpc()
 * (src/auth.rpc.ts). PostHog is the sink for all clamp events.
 *
 * Session: contract testing attack plan, step 3 addendum.
 */

import { trackEvent } from '../analytics.ts';

// ============================================================
// CLAMP 1: SUPABASE REALTIME
// ============================================================

type RealtimeState = 'connected' | 'disconnected' | 'error';
let _realtimeState: RealtimeState = 'disconnected';
let _realtimeDisconnectAt: number | null = null;

/**
 * Call from any .subscribe() status callback.
 * Supabase channels emit: SUBSCRIBED, TIMED_OUT, CLOSED, CHANNEL_ERROR.
 */
export function clampRealtime(status: string, channelName: string, err?: Error): void {
  if (status === 'SUBSCRIBED') {
    if (_realtimeState === 'disconnected' || _realtimeState === 'error') {
      const downtime = _realtimeDisconnectAt ? Date.now() - _realtimeDisconnectAt : 0;
      console.debug(`[clamp:realtime] ${channelName} connected (was down ${downtime}ms)`);
      if (_realtimeDisconnectAt) {
        trackEvent('clamp:realtime:reconnect', {
          channel: channelName,
          downtime_ms: downtime,
        });
      }
    }
    _realtimeState = 'connected';
    _realtimeDisconnectAt = null;
  } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
    if (_realtimeState === 'connected') {
      _realtimeDisconnectAt = Date.now();
      console.warn(`[clamp:realtime] ${channelName} disconnected: ${status}`);
      trackEvent('clamp:realtime:disconnect', {
        channel: channelName,
        status,
      });
    }
    _realtimeState = 'disconnected';
  } else if (status === 'CHANNEL_ERROR') {
    _realtimeDisconnectAt = _realtimeDisconnectAt || Date.now();
    console.error(`[clamp:realtime] ${channelName} error:`, err?.message || status);
    trackEvent('clamp:realtime:error', {
      channel: channelName,
      error: err?.message || status,
    });
    _realtimeState = 'error';
  }
}


// ============================================================
// CLAMP 2: STRIPE
// ============================================================

/**
 * Call after every Stripe checkout session fetch.
 * Pass the fetch Response (or null on network failure).
 */
export function clampStripe(
  action: string,
  response: Response | null,
  errorText?: string,
): void {
  if (!response || !response.ok) {
    const status = response?.status ?? 0;
    console.error(`[clamp:stripe] ${action} failed: HTTP ${status}`, errorText || '');
    trackEvent('clamp:stripe:failure', {
      action,
      http_status: status,
      error: errorText || `HTTP ${status}`,
    });
  }
  // Success is silent — only failures are clamp events.
}


// ============================================================
// CLAMP 3: DEEPGRAM
// ============================================================

type DeepgramClampState = 'idle' | 'connecting' | 'live' | 'error' | 'closed';
let _deepgramState: DeepgramClampState = 'idle';
let _deepgramConnectAt: number | null = null;

/**
 * Call from arena-deepgram.ts status callback.
 * Maps Deepgram statuses: connecting, live, paused, error, stopped.
 */
export function clampDeepgram(status: string): void {
  if (status === 'connecting') {
    _deepgramConnectAt = Date.now();
    _deepgramState = 'connecting';
  } else if (status === 'live') {
    const connectTime = _deepgramConnectAt ? Date.now() - _deepgramConnectAt : 0;
    if (_deepgramState === 'error') {
      // Recovered from error
      console.debug(`[clamp:deepgram] recovered, connect time ${connectTime}ms`);
      trackEvent('clamp:deepgram:recovered', { connect_time_ms: connectTime });
    }
    _deepgramState = 'live';
  } else if (status === 'error') {
    console.error('[clamp:deepgram] WebSocket error');
    trackEvent('clamp:deepgram:error', {
      previous_state: _deepgramState,
    });
    _deepgramState = 'error';
  } else if (status === 'paused') {
    // Tier 2 fallback — reconnect failed within 5s
    console.warn('[clamp:deepgram] entered paused state (Tier 2 fallback)');
    trackEvent('clamp:deepgram:paused', {
      time_since_connect_ms: _deepgramConnectAt ? Date.now() - _deepgramConnectAt : 0,
    });
  } else if (status === 'stopped') {
    _deepgramState = 'idle';
    _deepgramConnectAt = null;
  }
}


// ============================================================
// CLAMP 4: VERCEL SERVERLESS FUNCTIONS
// ============================================================

/**
 * Call after every fetch to /api/* routes.
 * Pass the route name and fetch Response (or null on network failure).
 */
export function clampVercel(
  route: string,
  response: Response | null,
  errorText?: string,
): void {
  if (!response) {
    console.error(`[clamp:vercel] ${route} network failure`);
    trackEvent('clamp:vercel:failure', {
      route,
      http_status: 0,
      error: errorText || 'network failure',
    });
    return;
  }
  if (response.status >= 400) {
    console.error(`[clamp:vercel] ${route} returned ${response.status}`);
    trackEvent('clamp:vercel:failure', {
      route,
      http_status: response.status,
      error: errorText || `HTTP ${response.status}`,
    });
  }
}
