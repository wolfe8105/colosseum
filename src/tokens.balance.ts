/**
 * THE MODERATOR — Token Balance
 * Balance display, cross-tab broadcast, RPC helper, requireTokens, getSummary, getBalance.
 */

import { showToast } from './config.ts';
import { safeRpc, getCurrentUser, getCurrentProfile, getIsPlaceholderMode } from './auth.ts';
import { _notify } from './auth.core.ts';
import type { ClaimResult, TokenSummary } from './tokens.types.ts';

export let lastKnownBalance: number | null = null;
export let _bc: BroadcastChannel | null = null;

export function _updateBalanceDisplay(newBalance: number | null | undefined, broadcast = true): void {
  if (newBalance == null) return;
  lastKnownBalance = newBalance;
  document.querySelectorAll('[data-token-balance]').forEach(el => {
    el.textContent = newBalance.toLocaleString();
  });
  const balEl = document.getElementById('token-balance');
  if (balEl) balEl.textContent = newBalance.toLocaleString();
  if (broadcast && _bc) {
    try { _bc.postMessage(newBalance); } catch { /* ignore */ }
  }
}

export function updateBalance(newBalance: number): void {
  _updateBalanceDisplay(newBalance);
  const profile = getCurrentProfile();
  if (profile) {
    (profile as Record<string, unknown>).token_balance = newBalance;
    _notify(getCurrentUser(), profile);
  }
}

export async function _rpc(fnName: string, args: Record<string, unknown> = {}): Promise<ClaimResult | null> {
  if (getIsPlaceholderMode()) return null;
  if (!getCurrentUser()) return null;
  try {
    const { data, error } = await safeRpc(fnName, args);
    if (error) { console.warn(`[Tokens] ${fnName} error:`, (error as { message?: string }).message ?? error); return null; }
    return data as ClaimResult;
  } catch (e) {
    console.warn(`[Tokens] ${fnName} exception:`, e);
    return null;
  }
}

export function requireTokens(amount: number, actionLabel?: string): boolean {
  const profile = getCurrentProfile();
  if (!profile) return true;
  const balance = profile.token_balance || 0;
  if (balance >= amount) return true;
  const deficit = amount - balance;
  showToast(`Need ${amount} tokens to ${actionLabel ?? 'do that'} (${deficit} more to go)`, 'error');
  return false;
}

export async function getSummary(): Promise<TokenSummary | null> {
  const result = await _rpc('get_my_token_summary');
  if (!result?.success) return null;
  _updateBalanceDisplay((result as unknown as TokenSummary).token_balance);
  return result as unknown as TokenSummary;
}

export function getBalance(): number | null { return lastKnownBalance; }

export function _initBroadcast(): void {
  try {
    _bc = new BroadcastChannel('mod-token-balance');
    _bc.onmessage = (e: MessageEvent) => {
      if (typeof e.data === 'number') _updateBalanceDisplay(e.data, false);
    };
  } catch { /* BroadcastChannel not supported */ }
}
