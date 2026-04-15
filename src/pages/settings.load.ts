/**
 * THE MODERATOR — Settings Load
 * loadSettings — reads localStorage and profile, populates form fields.
 */

import { getCurrentUser, getCurrentProfile } from '../auth.ts';
import { getEl, setChecked, validateTier, TIER_LABELS } from './settings.helpers.ts';
import type { SettingsData } from './settings.helpers.ts';

export function loadSettings(): void {
  let saved: Partial<SettingsData>;
  try {
    saved = JSON.parse(localStorage.getItem('colosseum_settings') || '{}');
  } catch {
    saved = {};
    localStorage.removeItem('colosseum_settings');
  }

  const nameEl = getEl<HTMLInputElement>('set-display-name');
  if (nameEl) nameEl.value = saved.display_name ?? '';
  const userEl = getEl<HTMLInputElement>('set-username');
  if (userEl) userEl.value = saved.username ?? '';
  const bioEl = getEl<HTMLTextAreaElement>('set-bio');
  if (bioEl) bioEl.value = saved.bio ?? '';

  const bioCount = getEl('set-bio-count');
  if (bioCount) bioCount.textContent = (saved.bio ?? '').length + '/160';

  const emailDisp = getEl('set-email-display');
  if (emailDisp) emailDisp.textContent = saved.email ?? '—';

  const tier = validateTier(saved.subscription_tier);
  const badge = getEl('set-tier-badge');
  if (badge) {
    badge.textContent = TIER_LABELS[tier];
    badge.className = 'tier-badge ' + (tier !== 'free' ? tier : '');
  }

  setChecked('set-notif-challenge', saved.notif_challenge !== false);
  setChecked('set-notif-debate', saved.notif_debate !== false);
  setChecked('set-notif-follow', saved.notif_follow !== false);
  setChecked('set-notif-reactions', saved.notif_reactions !== false);
  setChecked('set-notif-rivals', saved.notif_rivals !== false);
  setChecked('set-notif-economy', saved.notif_economy !== false);
  setChecked('set-audio-sfx', saved.audio_sfx !== false);
  setChecked('set-audio-mute', saved.audio_mute === true);
  setChecked('set-privacy-public', saved.privacy_public !== false);
  setChecked('set-privacy-online', saved.privacy_online !== false);
  setChecked('set-privacy-challenges', saved.privacy_challenges !== false);

  const langSelect = getEl<HTMLSelectElement>('set-language');
  if (langSelect) langSelect.value = saved.preferred_language ?? 'en';

  setChecked('set-dark-mode', document.documentElement.getAttribute('data-theme') !== 'light');

  const profile = getCurrentProfile();
  if (profile) {
    const p = profile as Record<string, unknown>;
    if (nameEl) nameEl.value = (p.display_name as string) ?? saved.display_name ?? '';
    if (userEl) userEl.value = (p.username as string) ?? saved.username ?? '';
    if (bioEl) bioEl.value = (p.bio as string) ?? saved.bio ?? '';
    if (bioCount) bioCount.textContent = ((p.bio as string) ?? saved.bio ?? '').length + '/160';

    const user = getCurrentUser() as { email?: string } | null;
    if (emailDisp) emailDisp.textContent = user?.email ?? saved.email ?? '—';

    const profileTier = validateTier(p.subscription_tier as string | undefined);
    if (badge) {
      badge.textContent = TIER_LABELS[profileTier];
      badge.className = 'tier-badge ' + (profileTier !== 'free' ? profileTier : '');
    }

    if (langSelect && typeof p.preferred_language === 'string') {
      langSelect.value = p.preferred_language;
    }

    if (typeof p.is_private === 'boolean') {
      setChecked('set-privacy-public', !p.is_private);
    }
  }
}
