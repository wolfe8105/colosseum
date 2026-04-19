/**
 * Home — Profile stat rendering, dropdown, logout, follow counts
 */
import { getCurrentUser, getFollowCounts, logOut } from '../auth.ts';
import type { Profile } from '../auth.ts';
import type { User } from '@supabase/supabase-js';
import { escapeHTML } from '../config.ts';

function _renderAvatar(el: HTMLElement, profile: Profile) {
  const url = profile.avatar_url || '';
  if (url.startsWith('emoji:')) {
    const emoji = url.slice(6);
    el.textContent = '';
    el.style.fontSize = '32px';
    el.innerHTML = escapeHTML(emoji) + '<span class="avatar-hint">✏️</span>';
  } else {
    const initial = (profile.display_name || profile.username || '?')[0].toUpperCase();
    el.textContent = '';
    el.style.fontSize = '';
    el.innerHTML = escapeHTML(initial) + '<span class="avatar-hint">✏️</span>';
  }
}

function _renderNavAvatar(el: HTMLElement, profile: Profile) {
  const url = profile.avatar_url || '';
  if (url.startsWith('emoji:')) {
    el.textContent = url.slice(6);
    el.style.fontSize = '18px';
  } else {
    el.textContent = (profile.display_name || profile.username || '?')[0].toUpperCase();
    el.style.fontSize = '';
  }
}

export function updateUIFromProfile(user: User | null, profile: Profile | null) {
  if (!profile) return;

  // Helper: safe element setter — silently skips if element doesn't exist on current page
  const _set = (id: string, value: string) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const _setHTML = (id: string, value: string) => { const el = document.getElementById(id); if (el) el.innerHTML = value; };

  const navAvatar = document.getElementById('user-avatar-btn'); if (navAvatar) _renderNavAvatar(navAvatar, profile);
  const profileAvatar = document.getElementById('profile-avatar'); if (profileAvatar) _renderAvatar(profileAvatar, profile);
  _set('profile-display-name', (profile.display_name || profile.username || 'GLADIATOR').toUpperCase());
  const tierLabels: Record<string, string> = { free: 'FREE TIER', contender: 'CONTENDER', champion: 'CHAMPION', creator: 'CREATOR' };
  const tier = profile.subscription_tier || 'free';
  _set('profile-tier', tierLabels[tier] || 'FREE TIER');
  _set('dropdown-name', profile.display_name || profile.username || 'Gladiator');
  _set('dropdown-tier', tierLabels[tier] || 'Free Tier');
  _set('stat-elo', String(profile.elo_rating || 1200));
  _set('stat-wins', String(profile.wins || 0));
  _set('stat-losses', String(profile.losses || 0));
  _set('stat-streak', String(profile.current_streak || 0));
  _set('stat-debates', String(profile.debates_completed || 0));
  _set('stat-tokens', (profile.token_balance || 0).toLocaleString());
  _set('token-count', (profile.token_balance || 0).toLocaleString());
  _set('shop-token-balance', (profile.token_balance || 0).toLocaleString());
  const depth = Number(profile.profile_depth_pct) || 0;
  const depthFill = document.getElementById('profile-depth-fill') as HTMLElement | null; if (depthFill) depthFill.style.width = depth + '%';
  _setHTML('profile-depth-text', `Profile ${depth}% complete — <a href="moderator-profile-depth.html" style="color:var(--mod-text-heading);">unlock rewards</a>`);

  // F-45: Desktop panel
  const dpName = document.getElementById('dp-name'); if (dpName) dpName.textContent = (profile.display_name || profile.username || 'GLADIATOR').toUpperCase();
  const dpTier = document.getElementById('dp-tier'); if (dpTier) dpTier.textContent = tierLabels[tier] || 'Free Tier';
  const dpAvatar = document.getElementById('dp-avatar'); if (dpAvatar) dpAvatar.textContent = (profile.display_name || profile.username || '?')[0].toUpperCase();
  const dpElo = document.getElementById('dp-elo'); if (dpElo) dpElo.textContent = String(profile.elo_rating || 1200);
  const dpWins = document.getElementById('dp-wins'); if (dpWins) dpWins.textContent = String(profile.wins || 0);
  const dpLosses = document.getElementById('dp-losses'); if (dpLosses) dpLosses.textContent = String(profile.losses || 0);
  const dpStreak = document.getElementById('dp-streak'); if (dpStreak) dpStreak.textContent = String(profile.current_streak || 0);
  const dpTokens = document.getElementById('dp-tokens'); if (dpTokens) dpTokens.textContent = (profile.token_balance || 0).toLocaleString();
  const dpDepthFill = document.getElementById('dp-depth-fill') as HTMLElement | null; if (dpDepthFill) dpDepthFill.style.width = depth + '%';
  const dpDepthPct = document.getElementById('dp-depth-pct'); if (dpDepthPct) dpDepthPct.textContent = depth + '% complete';
  const bioEl = document.getElementById('profile-bio-display');
  if (bioEl) {
    const bio = profile.bio || '';
    if (bio.trim()) { bioEl.textContent = bio; bioEl.classList.remove('placeholder'); }
    else { bioEl.textContent = 'Tap to add bio'; bioEl.classList.add('placeholder'); }
  }
}

export async function loadFollowCounts() {
  const user = getCurrentUser();
  if (!user?.id) return;
  try {
    const counts = await getFollowCounts(user.id);
    const followersEl = document.getElementById('profile-followers'); if (followersEl) followersEl.textContent = String(counts.followers || 0);
    const followingEl = document.getElementById('profile-following'); if (followingEl) followingEl.textContent = String(counts.following || 0);
  } catch (e) { console.warn('[Home] follow counts render failed:', e); }
}

// User dropdown toggle
const avatarBtn = document.getElementById('user-avatar-btn');
const dropdown = document.getElementById('user-dropdown');
if (avatarBtn && dropdown) {
  avatarBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); });
  document.addEventListener('click', () => { dropdown.classList.remove('open'); });
}

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await logOut();
    window.location.href = 'moderator-plinko.html';
  });
}
