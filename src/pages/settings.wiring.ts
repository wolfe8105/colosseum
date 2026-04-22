/**
 * THE MODERATOR — Settings Wiring
 * All module-level event listeners: dark mode, bio counter, logout,
 * reset password, delete account, intro music row.
 */

import { getCurrentUser, getCurrentProfile, logOut, resetPassword, deleteAccount } from '../auth.ts';
import { isAnyPlaceholder, showToast } from '../config.ts';
import { getEl } from './settings.helpers.ts';
import { saveSettings } from './settings.save.ts';

const isPlaceholder: boolean = isAnyPlaceholder;

export function wireSettings(): void {
  document.getElementById('save-btn')?.addEventListener('click', saveSettings);
  document.getElementById('settings-back-btn')?.addEventListener('click', () => { window.location.href = 'index.html'; });

  // Dark mode toggle — immediate effect
  getEl<HTMLInputElement>('set-dark-mode')?.addEventListener('change', (e: Event) => {
    const isDark = (e.target as HTMLInputElement).checked;
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const meta = document.getElementById('meta-theme-color');
    // meta theme-color requires literal hex; CSS vars not supported here
    if (meta) meta.setAttribute('content', isDark ? '#000000' : '#eaeef2');
  });

  // Bio character counter
  getEl<HTMLTextAreaElement>('set-bio')?.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    const counter = getEl('set-bio-count');
    if (counter) counter.textContent = target.value.length + '/160';
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await logOut();
    localStorage.removeItem('colosseum_settings');
    window.location.href = 'moderator-plinko.html';
  });

  // Reset password
  document.getElementById('reset-pw-btn')?.addEventListener('click', async () => {
    const btn = getEl<HTMLButtonElement>('reset-pw-btn');
    if (btn?.disabled) return;
    const user = getCurrentUser() as { email?: string } | null;
    const email = user?.email;
    if (!email) { showToast('You must be logged in to reset your password.', 'error'); return; }
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sending...'; }
    try {
      const result = await resetPassword(email);
      if (result.success) {
        if (btn) btn.textContent = '✅ Reset link sent!';
      } else {
        showToast('Failed to send reset email: ' + (result.error ?? 'Unknown error'), 'error');
      }
    } catch {
      showToast('Failed to send reset email. Please try again.', 'error');
    } finally {
      setTimeout(() => { if (btn) { btn.textContent = '🔑 RESET PASSWORD'; btn.disabled = false; } }, 3000);
    }
  });

  // Delete account modal
  document.getElementById('delete-btn')?.addEventListener('click', () => {
    const input = getEl<HTMLInputElement>('delete-confirm-input');
    if (input) input.value = '';
    const confirm = getEl<HTMLButtonElement>('delete-confirm');
    if (confirm) confirm.disabled = true;
    document.getElementById('delete-modal')?.classList.add('open');
  });

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
      if (result?.error) { showToast('Delete failed — try again', 'error'); return; }
    }
    localStorage.clear();
    window.location.href = 'moderator-plinko.html';
  });
}

export async function wireIntroMusicRow(): Promise<void> {
  const introRow = document.getElementById('intro-music-row');
  const introDesc = document.getElementById('intro-music-desc');
  if (!introRow) return;

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
