/**
 * THE MODERATOR — safeRpc (RPC wrapper with 401 recovery + contract validation)
 *
 * Extracted from auth.core.ts. Dependency direction: auth.rpc.ts → auth.core.ts.
 * auth.core.ts does NOT import from this file (no circular dep).
 *
 * Usage:
 *   // Unvalidated (legacy, still works):
 *   const { data, error } = await safeRpc('fn_name', { p_param: value });
 *
 *   // Validated (new — pass a Zod schema as 3rd arg):
 *   import { get_my_invite_link } from './contracts/rpc-schemas.ts';
 *   const { data, error } = await safeRpc('get_my_invite_link', {}, get_my_invite_link);
 */

import { getSupabaseClient } from './auth.core.ts';
import type { SafeRpcResult } from './auth.types.ts';
import type { ZodType } from 'zod';
import { trackEvent } from './analytics.ts';

/**
 * Wrapper around supabase.rpc() with 401 recovery and optional Zod contract validation.
 * On 401/PGRST301: refreshes session once, retries the call.
 * On refresh failure: triggers sign-out.
 *
 * When `schema` is provided:
 *   - DEV:  throws on validation failure (catch shape bugs immediately)
 *   - PROD: logs the violation (RPC name, expected shape, actual data) and falls through
 *
 * THIS IS THE ENTRY POINT FOR ALL FRONTEND RPC CALLS.
 * Every module must use this (via ModeratorAuth.safeRpc) — never bare supabase.rpc().
 */
export async function safeRpc<T = unknown>(
  fnName: string,
  args: Record<string, unknown> = {},
  schema?: ZodType<T>,
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

  // ── Contract validation ────────────────────────────────────────
  if (schema && result.data != null) {
    const parsed = schema.safeParse(result.data);
    if (!parsed.success) {
      const violation = {
        rpc: fnName,
        issues: parsed.error.issues,
        actual: result.data,
      };
      if (import.meta.env.DEV) {
        console.error('[safeRpc] CONTRACT VIOLATION in dev:', violation);
        throw new Error(
          `[safeRpc] Contract violation on "${fnName}": ${parsed.error.message}`
        );
      } else {
        // Prod: log + fire clamp event + fall through with raw data (no user-facing crash)
        console.warn('[safeRpc] CONTRACT VIOLATION (prod, non-blocking):', violation);
        trackEvent('clamp:rpc:contract_violation', {
          rpc: fnName,
          issues: parsed.error.issues.map(i => i.message).join('; '),
        });
      }
    }
  }

  return result;
}
