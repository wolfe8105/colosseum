/**
 * arena-realtime-client.ts — Typed accessor for Supabase realtime internals.
 *
 * The public SupabaseClient type does not expose .realtime.setAuth(),
 * .channel() with private config, or .removeChannel() at the type level,
 * even though all three exist at runtime. Rather than suppressing with
 * `as any` at each call site, this module provides narrow typed wrappers
 * that confine the cast to one place.
 *
 * All functions are no-ops if client is null.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '../webrtc.types.ts';

/** Internal cast — contained here, not spread across call sites. */
type RealtimeClient = {
  auth: { getSession(): Promise<{ data: { session: { access_token: string } | null } }> };
  realtime: { setAuth(token: string): void };
  channel(name: string, opts?: { config?: { private?: boolean } }): RealtimeChannel;
  removeChannel(channel: RealtimeChannel): void;
};

function asRealtime(client: SupabaseClient): RealtimeClient {
  return client as unknown as RealtimeClient;
}

/** Get the current session access token. Returns null if no session. */
export async function getAccessToken(client: SupabaseClient): Promise<string | null> {
  const { data } = await asRealtime(client).auth.getSession();
  return data?.session?.access_token ?? null;
}

/** Set the realtime auth token so private channels have a valid JWT context. */
export function setRealtimeAuth(client: SupabaseClient, token: string): void {
  asRealtime(client).realtime.setAuth(token);
}

/** Subscribe to a named channel, optionally private. */
export function createChannel(
  client: SupabaseClient,
  name: string,
  opts?: { private?: boolean },
): RealtimeChannel {
  return asRealtime(client).channel(name, opts ? { config: opts } : undefined);
}

/** Unsubscribe and remove a channel. */
export function removeChannel(client: SupabaseClient, channel: RealtimeChannel): void {
  asRealtime(client).removeChannel(channel);
}
