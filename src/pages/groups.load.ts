/**
 * THE MODERATOR — Groups Load Functions
 * loadDiscover, loadMyGroups, loadLeaderboard.
 */

import { safeRpc } from '../auth.ts';
import { get_my_groups } from '../contracts/rpc-schemas.ts';
import { activeCategory, currentUser } from './groups.state.ts';
import { renderEmpty, renderGroupList } from './groups.utils.ts';

// openGroup injected to avoid circular dep with groups.detail.ts
let _openGroup: ((id: string) => void) | null = null;
export function setLoadOpenGroupCallback(fn: (id: string) => void): void { _openGroup = fn; }

export async function loadDiscover(): Promise<void> {
  (document.getElementById('discover-list') as HTMLElement).innerHTML = '<div class="loading-state">Loading groups…</div>';
  try {
    const { data, error } = await safeRpc('discover_groups', { p_limit: 30, p_category: activeCategory });
    if (error) throw error;
    const groups = typeof data === 'string' ? JSON.parse(data) : data;
    renderGroupList('discover-list', groups || [], false, false, _openGroup!);
  } catch {
    (document.getElementById('discover-list') as HTMLElement).innerHTML = renderEmpty('⚠️', 'Could not load groups', 'Try again in a moment');
  }
}

export async function loadMyGroups(): Promise<void> {
  if (!currentUser) {
    (document.getElementById('mine-list') as HTMLElement).innerHTML = renderEmpty('🔒', 'Sign in to see your groups', '');
    return;
  }
  (document.getElementById('mine-list') as HTMLElement).innerHTML = '<div class="loading-state">Loading…</div>';
  try {
    const { data, error } = await safeRpc('get_my_groups', {}, get_my_groups);
    if (error) throw error;
    const groups = typeof data === 'string' ? JSON.parse(data) : data;
    if (!groups || groups.length === 0) {
      (document.getElementById('mine-list') as HTMLElement).innerHTML = renderEmpty('👥', "You haven't joined any groups yet", 'Discover groups or create your own');
      return;
    }
    renderGroupList('mine-list', groups, true, false, _openGroup!);
  } catch {
    (document.getElementById('mine-list') as HTMLElement).innerHTML = renderEmpty('⚠️', 'Could not load groups', '');
  }
}

export async function loadLeaderboard(): Promise<void> {
  (document.getElementById('leaderboard-list') as HTMLElement).innerHTML = '<div class="loading-state">Loading rankings…</div>';
  try {
    const { data, error } = await safeRpc('get_group_leaderboard', { p_limit: 20 });
    if (error) throw error;
    const groups = typeof data === 'string' ? JSON.parse(data) : data;
    renderGroupList('leaderboard-list', groups || [], false, true, _openGroup!);
  } catch {
    (document.getElementById('leaderboard-list') as HTMLElement).innerHTML = renderEmpty('⚠️', 'Could not load rankings', '');
  }
}
