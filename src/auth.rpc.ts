/**
 * THE MODERATOR — safeRpc (RPC wrapper with 401 recovery)
 *
 * Extracted from auth.core.ts. Dependency direction: auth.rpc.ts → auth.core.ts.
 * auth.core.ts does NOT import from this file (no circular dep).
 *
 * Usage: const { data, error } = await safeRpc('fn_name', { p_param: value });
 */

import { getSupabaseClient } from './auth.core.ts';
import type { SafeRpcResult } from './auth.types.ts';

/**
 * Wrapper around supabase.rpc() with 401 recovery.
 * On 401/PGRST301: refreshes session once, retries the call.
 * On refresh failure: triggers sign-out.
 *
 * THIS IS THE ENTRY POINT FOR ALL FRONTEND RPC CALLS.
 * Every module must use this (via ModeratorAuth.safeRpc) — never bare supabase.rpc().
 */
export async function safeRpc<T = unknown>(
  fnName: string,
  args: Record<string, unknown> = {}
): Promise<SafeRpcResult<T>> {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    return { data: null, error: { message: 'Supabase not initialized' } };
  }

  const attempt = async (): Promise<SafeRpcResult<T>> =>
    supabaseClient!.rpc(fnName, args) as unknown as Promise<SafeRpcResult<T>>;

  let result = await attempt();

  // 401 or JWT-expired error codes
  const is401 = result.error != null && (
    (result.error as { status?: number }).status === 401 ||
    result.error.code === 'PGRST301' ||
    (result.error.message ?? '').toLowerCase().includes('jwt expired')
  );

  if (is401) {
    console.warn('safeRpc: 401 on', fnName, '— attempting token refresh');
    const { error: refreshError } = await supabaseClient.auth.refreshSession();
    if (refreshError) {
      console.error('safeRpc: refresh failed, signing out', refreshError);
      void supabaseClient.auth.signOut();
      return { data: null, error: { message: refreshError.message } };
    }
    result = await attempt();
  }

  return result;
}
