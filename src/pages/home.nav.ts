/**
 * Home — Screen navigation and data-action click dispatch
 */
import { destroy as destroyArena, showPowerUpShop } from '../arena.ts';
import { registerNavigate } from '../navigation.ts';
import { shareProfile, inviteFriend } from '../share.ts';
import { subscribe } from '../payments.ts';
import { getCurrentProfile, getCurrentUser, refreshProfile } from '../auth.ts';
import { ModeratorAsync } from '../async.ts';
import { renderFeed } from './home.feed.ts';
import { loadArsenalScreen } from './home.arsenal.ts';
import { loadInviteScreen, cleanupInviteScreen } from './home.invite.ts';
import { loadFollowCounts } from './home.profile.ts';
import { loadDebateArchive } from '../profile-debate-archive.ts';
import { state } from './home.state.ts';

const VALID_SCREENS = ['home', 'arena', 'profile', 'shop', 'leaderboard', 'arsenal', 'invite', 'search', 'dm'];

export function navigateTo(screenId: string) {
  if (!VALID_SCREENS.includes(screenId)) screenId = 'home';

  // Clean up previous screen's resources
  if (state.currentScreen === 'arena' && screenId !== 'arena') {
    destroyArena();
  }
  state.currentScreen = screenId;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
  const screen = document.getElementById('screen-' + screenId); if (screen) screen.classList.add('active');
  const btn = document.querySelector(`.bottom-nav-btn[data-screen="${screenId}"]`); if (btn) btn.classList.add('active');

  if (screenId === 'home') {
    void refreshProfile();
    renderFeed().catch(e => console.error('renderFeed error:', e));
  }
  if (screenId === 'profile') {
    void refreshProfile();
    ModeratorAsync?.renderRivals?.(document.getElementById('rivals-feed')!);
    loadFollowCounts();
    const archiveEl = document.getElementById('profile-debate-archive');
    if (archiveEl) void loadDebateArchive(archiveEl, true);
  }
  if (screenId === 'arsenal') {
    loadArsenalScreen().catch(e => console.error('[home.nav]', e));
  }
  if (screenId === 'invite') {
    const container = document.getElementById('invite-content');
    if (container) loadInviteScreen(container);
  }
  if (screenId === 'search') {
    import('../search.ts').then(({ renderSearchScreen }) => renderSearchScreen()).catch(e => console.error('[search]', e));
  }
  if (screenId === 'dm') {
    import('../dm/dm.ts').then(({ renderDMScreen, fetchThreads }) => {
      void fetchThreads().then(() => renderDMScreen());
    }).catch(e => console.error('[dm]', e));
  }
}

// Bottom nav wiring
document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigateTo((btn as HTMLElement).dataset.screen!));
});
registerNavigate(navigateTo);

// data-action wiring
document.addEventListener('click', (e: Event) => {
  const el = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'powerup-shop') {
    navigateTo('arena');
    setTimeout(() => showPowerUpShop(), 300);
  } else if (action === 'share-profile') {
    const p = getCurrentProfile();
    const u = getCurrentUser();
    shareProfile({ userId: u?.id, username: p?.username ?? undefined, displayName: p?.display_name ?? undefined, elo: p?.elo_rating, wins: p?.wins, losses: p?.losses, streak: p?.current_streak });
  } else if (action === 'invite-rewards') {
    navigateTo('invite');
  } else if (action === 'subscribe') {
    const tier = el.dataset.tier;
    if (tier) subscribe(tier);
  } else if (action === 'arsenal') {
    navigateTo('arsenal');
  } else if (action === 'global-search') {
    navigateTo('search');
  } else if (action === 'open-dm') {
    navigateTo('dm');
  } else if (action === 'spectate-live') {
    const debateId = el.dataset.debateId;
    if (debateId) {
      window.location.href = `moderator-spectate.html?id=${encodeURIComponent(debateId)}`;
    }
  }
});
