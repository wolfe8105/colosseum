/**
 * THE MODERATOR — Groups Navigation
 * switchTab, switchDetailTab, filterCategory, showLobby.
 */

import {
  activeCategory, currentGroupId, callerRole,
  setActiveTab, setActiveDetailTab, setActiveCategory, setCurrentGroupId, setCallerRole,
} from './groups.state.ts';
import { loadPendingAuditions } from './groups.auditions.ts';

// Forward declaration — openGroup lives in groups.detail.ts but is needed here
// for loadMyGroups/loadLeaderboard. Injected via setOpenGroupCallback.
let _openGroup: ((id: string) => void) | null = null;
export function setNavOpenGroupCallback(fn: (id: string) => void): void { _openGroup = fn; }

export function switchTab(tab: string): void {
  setActiveTab(tab);
  document.querySelectorAll('#lobby-tabs .tab-btn').forEach((b, i) => {
    b.classList.toggle('active', ['discover', 'mine', 'leaderboard'][i] === tab);
  });
  (document.getElementById('tab-discover') as HTMLElement).style.display     = tab === 'discover'    ? 'block' : 'none';
  (document.getElementById('tab-mine') as HTMLElement).style.display         = tab === 'mine'        ? 'block' : 'none';
  (document.getElementById('tab-leaderboard') as HTMLElement).style.display  = tab === 'leaderboard' ? 'block' : 'none';
  if (tab === 'mine') { import('./groups.load.ts').then(({ loadMyGroups }) => loadMyGroups()); }
  if (tab === 'leaderboard') { import('./groups.load.ts').then(({ loadLeaderboard }) => loadLeaderboard()); }
}

export function switchDetailTab(tab: string): void {
  setActiveDetailTab(tab);
  const tabs = ['feed', 'challenges', 'members', 'auditions'];
  document.querySelectorAll('#detail-tabs .tab-btn').forEach((b, i) => {
    b.classList.toggle('active', tabs[i] === tab);
  });
  (document.getElementById('detail-feed') as HTMLElement).style.display    = tab === 'feed'  ? 'block' : 'none';
  (document.getElementById('detail-challenges') as HTMLElement).style.display   = tab === 'challenges' ? 'block' : 'none';
  (document.getElementById('detail-members-list') as HTMLElement).style.display = tab === 'members'    ? 'block' : 'none';
  (document.getElementById('detail-auditions') as HTMLElement).style.display    = tab === 'auditions'  ? 'block' : 'none';
  if (tab === 'auditions' && currentGroupId) loadPendingAuditions(currentGroupId, callerRole);
}

export function filterCategory(cat: string | null, el: HTMLElement): void {
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  setActiveCategory(cat);
  import('./groups.load.ts').then(({ loadDiscover }) => loadDiscover());
}

export function showLobby(): void {
  setCurrentGroupId(null);
  setCallerRole(null);
  (document.getElementById('view-detail') as HTMLElement).style.display = 'none';
  (document.getElementById('view-lobby') as HTMLElement).style.display  = 'block';
}
