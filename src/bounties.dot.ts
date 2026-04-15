/**
 * THE MODERATOR — Bounty Dot
 * loadBountyDotSet, userHasBountyDot, bountyDot.
 */

import { safeRpc, getIsPlaceholderMode } from './auth.ts';

let _bountyDotSet = new Set<string>();

export async function loadBountyDotSet(): Promise<void> {
  if (getIsPlaceholderMode()) return;
  try {
    const { data, error } = await safeRpc<{ user_id: string }[]>('get_bounty_dot_user_ids');
    if (error) throw error;
    _bountyDotSet = new Set((data ?? []).map(r => r.user_id));
  } catch (e) {
    console.warn('[Bounties] loadBountyDotSet failed:', e);
  }
}

export function userHasBountyDot(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return _bountyDotSet.has(userId);
}

export function bountyDot(userId: string | null | undefined): string {
  if (!userHasBountyDot(userId)) return '';
  return '<span title="Active bounty" aria-label="Active bounty" style="display:inline-block;margin-left:4px;font-size:0.85em;line-height:1;vertical-align:middle;cursor:default;" class="bounty-dot">🟡</span>';
}
