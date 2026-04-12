/**
 * THE MODERATOR — Settings Page Controller (TypeScript)
 *
 * Extracted from moderator-settings.html inline script.
 * Account settings, toggles, moderator panel, logout, delete account.
 *
 * Migration: Session 128 (Phase 4)
 */

// ES imports (replaces window globals)
import {
  ready, getCurrentUser, getCurrentProfile, getIsPlaceholderMode, getSupabaseClient,
  safeRpc, updateProfile, logOut, resetPassword, deleteAccount,
  toggleModerator, toggleModAvailable, updateModCategories,
} from '../auth.ts';
import { isAnyPlaceholder, showToast } from '../config.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface SettingsData {
  display_name: string;
  username: string;
  bio: string;
  email: string;
  subscription_tier?: string;
  preferred_language: string;
  notif_challenge: boolean;
  notif_debate: boolean;
  notif_follow: boolean;
  notif_reactions: boolean;
  notif_rivals: boolean;
  notif_economy: boolean;
  audio_sfx: boolean;
  audio_mute: boolean;
  privacy_public: boolean;
  privacy_online: boolean;
  privacy_challenges: boolean;
}

// ============================================================
// STATE
// ============================================================

const isPlaceholder: boolean = isAnyPlaceholder;

const VALID_TIERS = ['free', 'contender', 'champion', 'creator'] as const;
type ValidTier = typeof VALID_TIERS[number];

const TIER_LABELS: Record<ValidTier, string> = {
  free: 'FREE', contender: 'CONTENDER', champion: 'CHAMPION', creator: 'CREATOR',
};

// ============================================================
// HELPERS
// ============================================================

function toast(msg: string): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function getEl<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function getChecked(id: string): boolean {
  return (getEl<HTMLInputElement>(id))?.checked ?? false;
}

function setChecked(id: string, val: boolean): void {
  const el = getEl<HTMLInputElement>(id);
  if (el) el.checked = val;
}

function validateTier(raw: string | undefined): ValidTier {
  return VALID_TIERS.includes(raw as ValidTier) ? (raw as ValidTier) : 'free';
}

// ============================================================
// LOAD SETTINGS
// ============================================================

function loadSettings(): void {
  let saved: Partial<SettingsData>;
  try {
    saved = JSON.parse(localStorage.getItem('colosseum_settings') || '{}');
  } catch {
    saved = {};
    localStorage.removeItem('colosseum_settings');
  }

  // Account fields
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

  // Tier badge
  const tier = validateTier(saved.subscription_tier);
  const badge = getEl('set-tier-badge');
  if (badge) {
    badge.textContent = TIER_LABELS[tier];
    badge.className = 'tier-badge ' + (tier !== 'free' ? tier : '');
  }

  // Toggles — default to true for notifications, false for mute
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

  // Language dropdown
  const langSelect = getEl<HTMLSelectElement>('set-language');
  if (langSelect) langSelect.value = saved.preferred_language ?? 'en';

  // Dark mode toggle — reads from data-theme attribute (set by head script from localStorage)
  setChecked('set-dark-mode', document.documentElement.getAttribute('data-theme') !== 'light');

  // If auth module has a profile, prefer that over localStorage
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

    // Language from profile overrides localStorage
    if (langSelect && typeof p.preferred_language === 'string') {
      langSelect.value = p.preferred_language;
    }

    // is_private from DB overrides localStorage (toggle is inverted: checked = public = not private)
    if (typeof p.is_private === 'boolean') {
      setChecked('set-privacy-public', !p.is_private);
    }
  }
}

// ============================================================
// SAVE SETTINGS
// ============================================================

function saveSettings(): void {
  const saveBtn = getEl<HTMLButtonElement>('save-btn');
  if (saveBtn?.disabled) return;
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Saving...'; }
  const displayName = getEl<HTMLInputElement>('set-display-name')?.value.trim() ?? '';
  const username = getEl<HTMLInputElement>('set-username')?.value.trim() ?? '';
  const bio = getEl<HTMLTextAreaElement>('set-bio')?.value.trim() ?? '';

  // SESSION 64: Client-side validation (defense in depth)
  if (username && (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username))) {
    toast('❌ Username: 3-20 chars, letters/numbers/underscores only');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 SAVE CHANGES'; }
    return;
  }
  if (displayName && displayName.length > 30) {
    toast('❌ Display name: max 30 characters');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 SAVE CHANGES'; }
    return;
  }
  if (bio.length > 160) {
    toast('❌ Bio: max 160 characters');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 SAVE CHANGES'; }
    return;
  }

  const settings: SettingsData = {
    display_name: displayName,
    username,
    bio,
    email: getEl('set-email-display')?.textContent ?? '',
    preferred_language: getEl<HTMLSelectElement>('set-language')?.value ?? 'en',
    notif_challenge: getChecked('set-notif-challenge'),
    notif_debate: getChecked('set-notif-debate'),
    notif_follow: getChecked('set-notif-follow'),
    notif_reactions: getChecked('set-notif-reactions'),
    notif_rivals: getChecked('set-notif-rivals'),
    notif_economy: getChecked('set-notif-economy'),
    audio_sfx: getChecked('set-audio-sfx'),
    audio_mute: getChecked('set-audio-mute'),
    privacy_public: getChecked('set-privacy-public'),
    privacy_online: getChecked('set-privacy-online'),
    privacy_challenges: getChecked('set-privacy-challenges'),
  };

  localStorage.setItem('colosseum_settings', JSON.stringify(settings));

  // Save to Supabase if auth is live
  if (!isPlaceholder) {
    updateProfile({
      display_name: settings.display_name,
      username: settings.username,
      bio: settings.bio,
      preferred_language: settings.preferred_language,
      is_private: !settings.privacy_public,
    }).catch((err: unknown) => { console.warn('[Settings] updateProfile failed:', err); });

    // SESSION 52/64: Save toggles via RPC (not direct upsert)
    safeRpc('save_user_settings', {
      p_notif_challenge: settings.notif_challenge,
      p_notif_debate: settings.notif_debate,
      p_notif_follow: settings.notif_follow,
      p_notif_reactions: settings.notif_reactions,
      p_notif_rivals: settings.notif_rivals,
      p_notif_economy: settings.notif_economy,
      p_audio_sfx: settings.audio_sfx,
      p_audio_mute: settings.audio_mute,
      p_privacy_public: settings.privacy_public,
      p_privacy_online: settings.privacy_online,
      p_privacy_challenges: settings.privacy_challenges,
    }).then((result: unknown) => {
      const r = result as { error?: { message: string } } | null;
      if (r?.error) console.warn('[Settings] save_user_settings RPC failed:', r.error.message);
    }).catch((err: unknown) => { console.warn('[Settings] save_user_settings failed:', err); });
  }

  toast('✅ Settings saved');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 SAVE CHANGES'; }
}

document.getElementById('save-btn')?.addEventListener('click', saveSettings);

// Dark mode toggle — immediate effect, separate from save button
getEl<HTMLInputElement>('set-dark-mode')?.addEventListener('change', (e: Event) => {
  const isDark = (e.target as HTMLInputElement).checked;
  const theme = isDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const meta = document.getElementById('meta-theme-color');
  if (meta) meta.setAttribute('content', isDark ? '#000000' : '#eaeef2');
});

// Bio character counter
getEl<HTMLTextAreaElement>('set-bio')?.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  const counter = getEl('set-bio-count');
  if (counter) counter.textContent = target.value.length + '/160';
});

// ============================================================
// LOGOUT
// ============================================================

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await logOut();
  localStorage.removeItem('colosseum_settings');
  window.location.href = 'moderator-plinko.html';
});

// ============================================================
// RESET PASSWORD
// ============================================================

document.getElementById('reset-pw-btn')?.addEventListener('click', async () => {
  const btn = getEl<HTMLButtonElement>('reset-pw-btn');
  if (btn?.disabled) return;
  const user = getCurrentUser() as { email?: string } | null;
  const email = user?.email;
  if (!email) { alert('You must be logged in to reset your password.'); return; }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Sending...'; }

  const result = await resetPassword(email);
  if (result.success) {
    if (btn) btn.textContent = '✅ Reset link sent!';
    setTimeout(() => { if (btn) { btn.textContent = '🔑 RESET PASSWORD'; btn.disabled = false; } }, 3000);
  } else {
    if (btn) { btn.textContent = '🔑 RESET PASSWORD'; btn.disabled = false; }
    alert('Failed to send reset email: ' + (result.error ?? 'Unknown error'));
  }
});

// ============================================================
// DELETE ACCOUNT
// ============================================================

document.getElementById('delete-btn')?.addEventListener('click', () => {
  // SESSION 64: Reset confirmation input each time modal opens
  const input = getEl<HTMLInputElement>('delete-confirm-input');
  if (input) input.value = '';
  const confirm = getEl<HTMLButtonElement>('delete-confirm');
  if (confirm) confirm.disabled = true;
  document.getElementById('delete-modal')?.classList.add('open');
});

// SESSION 64: Enable delete button only when user types DELETE
getEl<HTMLInputElement>('delete-confirm-input')?.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const confirm = getEl<HTMLButtonElement>('delete-confirm');
  if (confirm) confirm.disabled = target.value.trim() !== 'DELETE';
});

document.getElementById('delete-cancel')?.addEventListener('click', () => {
  document.getElementById('delete-modal')?.classList.remove('open');
});

document.getElementById('delete-modal')?.addEventListener('click', (e: Event) => {
  if (e.target === e.currentTarget) (e.currentTarget as HTMLElement).classList.remove('open');
});

document.getElementById('delete-confirm')?.addEventListener('click', async () => {
  if (!isPlaceholder) {
    const result = await deleteAccount();
    if (result?.error) {
      showToast('Delete failed — try again', 'error');
      return;
    }
  }
  localStorage.clear();
  window.location.href = 'moderator-plinko.html';
});

// ============================================================
// MODERATOR SETTINGS (SESSION 39)
// ============================================================

function loadModeratorSettings(): void {
  const profile = getCurrentProfile();
  if (!profile) return;
  const p = profile as Record<string, unknown>;

  const isMod = !!(p.is_moderator);
  const isAvail = !!(p.mod_available);

  setChecked('set-mod-enabled', isMod);
  setChecked('set-mod-available', isAvail);

  // Show/hide conditional rows
  const availRow = getEl('mod-available-row');
  if (availRow) availRow.style.display = isMod ? 'flex' : 'none';
  const statsBlock = getEl('mod-stats');
  if (statsBlock) statsBlock.style.display = isMod ? 'block' : 'none';

  // Load category chips
  const cats = (p.mod_categories as string[]) ?? [];
  document.querySelectorAll<HTMLButtonElement>('.mod-cat-chip').forEach(chip => {
    const cat = chip.dataset.cat ?? '';
    chip.classList.toggle('selected', cats.includes(cat));
  });

  // Dot color
  const dot = getEl('mod-dot');
  if (dot) dot.style.background = isAvail ? 'var(--success)' : 'var(--white-dim)';

  // Stats
  if (isMod) {
    const rating = getEl('mod-stat-rating');
    if (rating) rating.textContent = ((p.mod_rating as number) ?? 50).toFixed(1);
    const debates = getEl('mod-stat-debates');
    if (debates) debates.textContent = String((p.mod_debates_total as number) ?? 0);
    const rulings = getEl('mod-stat-rulings');
    if (rulings) rulings.textContent = String((p.mod_rulings_total as number) ?? 0);
    const approval = getEl('mod-stat-approval');
    if (approval) approval.textContent = ((p.mod_approval_pct as number) ?? 0).toFixed(0) + '%';
  }
}

// Wire moderator toggles (instant save via RPC)
getEl<HTMLInputElement>('set-mod-enabled')?.addEventListener('change', async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const enabled = target.checked;
  target.disabled = true;

  const result = await toggleModerator(enabled);
  if (result?.error) {
    target.checked = !enabled;
    toast('❌ ' + result.error);
  } else {
    toast(enabled ? '⚖️ Moderator mode ON' : 'Moderator mode OFF');
    loadModeratorSettings();
  }
  target.disabled = false;
});

getEl<HTMLInputElement>('set-mod-available')?.addEventListener('change', async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const available = target.checked;
  target.disabled = true;

  const result = await toggleModAvailable(available);
  if (result?.error) {
    target.checked = !available;
    toast('❌ ' + result.error);
  } else {
    const dot = getEl('mod-dot');
    if (dot) dot.style.background = available ? 'var(--success)' : 'var(--white-dim)';
    toast(available ? '🟢 Available to moderate' : '🔴 Offline');
  }
  target.disabled = false;
});

// Wire category chip toggles
document.querySelectorAll<HTMLButtonElement>('.mod-cat-chip').forEach(chip => {
  chip.addEventListener('click', async () => {
    if (chip.disabled) return;
    chip.disabled = true;
    const cat = chip.dataset.cat ?? '';
    const isSelected = chip.classList.toggle('selected');
    const selected = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.mod-cat-chip.selected')
    ).map(c => c.dataset.cat ?? '').filter(Boolean);

    const statusEl = getEl('mod-cat-status');
    if (statusEl) statusEl.textContent = 'Saving…';

    const result = await updateModCategories(selected);
    if (result?.error) {
      chip.classList.toggle('selected', !isSelected); // revert
      if (statusEl) statusEl.textContent = '❌ ' + result.error;
      toast('❌ ' + result.error);
    } else {
      if (statusEl) statusEl.textContent = selected.length === 0
        ? 'Accepting all categories'
        : `${selected.length} categor${selected.length === 1 ? 'y' : 'ies'} selected`;
    }
    chip.disabled = false;
  });
});

// ============================================================
// INIT
// ============================================================

window.addEventListener('DOMContentLoaded', async () => {
  // SESSION 32: Members Zone auth gate
  await Promise.race([ready, new Promise<void>(r => setTimeout(r, 6000))]);

  if (!getCurrentUser() && !getIsPlaceholderMode()) {
    window.location.href = 'moderator-plinko.html';
    return;
  }

  loadSettings();
  loadModeratorSettings();

  // SESSION 52: Load toggles from user_settings table (overrides localStorage)
  const user = getCurrentUser() as { id?: string } | null;
  const uid = user?.id;
  const sb = getSupabaseClient() as { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: Record<string, boolean | null> | null; error: unknown }> } } } } | null;

  if (uid && sb) {
    const { data, error } = await sb
      .from('user_settings')
      .select('*')
      .eq('user_id', uid)
      .single();

    if (!error && data) {
      const toggleMap: Record<string, boolean | null> = {
        'set-notif-challenge': data.notif_challenge,
        'set-notif-debate': data.notif_debate,
        'set-notif-follow': data.notif_follow,
        'set-notif-reactions': data.notif_reactions,
        'set-notif-rivals': data.notif_rivals,
        'set-notif-economy': data.notif_economy,
        'set-audio-sfx': data.audio_sfx,
        'set-audio-mute': data.audio_mute,
        'set-privacy-public': data.privacy_public,
        'set-privacy-online': data.privacy_online,
        'set-privacy-challenges': data.privacy_challenges,
      };
      for (const [id, val] of Object.entries(toggleMap)) {
        if (val !== null && val !== undefined) setChecked(id, val);
      }
    }
  }

  // F-21: Intro Music row
  const introRow  = document.getElementById('intro-music-row');
  const introDesc = document.getElementById('intro-music-desc');
  if (introRow) {
    // Show current track name in the description
    const profile = getCurrentProfile();
    const currentId = profile?.intro_music_id ?? 'gladiator';
    const { INTRO_TRACKS } = await import('../arena/arena-sounds.ts');
    const currentTrack = INTRO_TRACKS.find(t => t.id === currentId);
    if (introDesc && currentTrack) {
      introDesc.textContent = `${currentTrack.icon} ${currentTrack.label}`;
    } else if (introDesc && currentId === 'custom') {
      introDesc.textContent = '🎵 Custom';
    }
    introRow.addEventListener('click', async () => {
      const { openIntroMusicPicker } = await import('../intro-music.ts');
      openIntroMusicPicker();
    });
  }
});
