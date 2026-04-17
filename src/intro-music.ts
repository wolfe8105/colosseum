/**
 * intro-music.ts — F-21 Intro Music Picker
 *
 * Refactored: CSS → intro-music-css.ts, save → intro-music-save.ts.
 */

import { getCurrentProfile } from './auth.ts';
import { escapeHTML, showToast } from './config.ts';
import { INTRO_TRACKS, playIntroMusic } from './arena/arena-sounds.ts';
import { injectIntroMusicCSS } from './intro-music-css.ts';
import { saveIntroMusic } from './intro-music-save.ts';

function _refreshSelected(sheet: HTMLElement, id: string): void {
  sheet.querySelectorAll('.im-track-btn').forEach(b =>
    b.classList.toggle('selected', (b as HTMLElement).dataset.id === id)
  );
  sheet.querySelector<HTMLElement>('#im-upload-btn')?.classList.toggle('selected', id === 'custom');
}

function _close(backdrop: HTMLElement): void {
  backdrop.style.transition = 'opacity 0.2s';
  backdrop.style.opacity = '0';
  setTimeout(() => backdrop.remove(), 220);
}

export function openIntroMusicPicker(): void {
  injectIntroMusicCSS();

  const profile        = getCurrentProfile();
  const currentId      = (profile?.intro_music_id as string | null | undefined) ?? 'gladiator';
  const currentUrl     = (profile?.custom_intro_url as string | null | undefined) ?? null;
  const depthPct       = profile?.profile_depth_pct ?? 0;
  const tier2Unlocked  = depthPct >= 35;

  document.getElementById('im-backdrop')?.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'im-backdrop';
  backdrop.id = 'im-backdrop';

  const sheet = document.createElement('div');
  sheet.className = 'im-sheet';

  const tier2Html = tier2Unlocked
    ? `<div class="im-tier2-section">
        <div class="im-tier2-label">⭐ CUSTOM — TIER 2</div>
        <button class="im-upload-btn${currentId === 'custom' ? ' selected' : ''}" id="im-upload-btn">
          🎵 ${currentId === 'custom' && currentUrl ? 'Replace custom intro' : 'Upload your intro (≤10 sec)'}
        </button>
        <input type="file" id="im-file-input" accept="audio/*" style="display:none">
        <div class="im-upload-desc">MP3 · M4A · OGG · WAV · WebM &nbsp;·&nbsp; Max 5MB &nbsp;·&nbsp; 10 seconds</div>
      </div>`
    : `<div class="im-tier2-section">
        <div class="im-tier2-label">⭐ CUSTOM — TIER 2</div>
        <div class="im-tier2-locked">🔒 Unlock at 35% profile depth <span style="color:var(--mod-accent);margin-left:4px;">(${Math.round(depthPct)}% now)</span></div>
      </div>`;

  sheet.innerHTML = `
    <div class="im-handle"></div>
    <div class="im-title">INTRO MUSIC</div>
    <div class="im-subtitle">Plays when your match is found</div>
    <div class="im-grid" id="im-track-grid">
      ${INTRO_TRACKS.map(t => `
        <button class="im-track-btn${t.id === currentId ? ' selected' : ''}" data-id="${t.id}">
          <span class="im-track-icon">${t.icon}</span>
          <div class="im-track-info">
            <div class="im-track-label">${escapeHTML(t.label)}</div>
            <div class="im-track-desc">${escapeHTML(t.description)}</div>
          </div>
          <button class="im-preview-btn" data-preview="${t.id}" title="Preview">▶</button>
        </button>
      `).join('')}
    </div>
    ${tier2Html}
    <button class="im-save-btn" id="im-save-btn">SAVE</button>`;

  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);

  let selectedId: string = currentId;
  let pendingFile: File | null = null;
  const pendingUrl = currentUrl;

  sheet.querySelectorAll<HTMLButtonElement>('.im-track-btn[data-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.im-preview-btn')) return;
      selectedId  = btn.dataset.id!;
      pendingFile = null;
      _refreshSelected(sheet, selectedId);
    });
  });

  sheet.querySelectorAll<HTMLButtonElement>('.im-preview-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); playIntroMusic(btn.dataset.preview!); });
  });

  const uploadBtn = sheet.querySelector<HTMLButtonElement>('#im-upload-btn');
  const fileInput = sheet.querySelector<HTMLInputElement>('#im-file-input');
  uploadBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('File too large — max 5MB', 'error'); return; }
    pendingFile = file;
    selectedId  = 'custom';
    if (uploadBtn) uploadBtn.textContent = `🎵 ${escapeHTML(file.name.slice(0, 28))}`;
    _refreshSelected(sheet, 'custom');
    playIntroMusic('custom', URL.createObjectURL(file));
  });

  const saveBtn = sheet.querySelector<HTMLButtonElement>('#im-save-btn');
  saveBtn?.addEventListener('click', async () => {
    if (!saveBtn) return;
    saveBtn.disabled = true; saveBtn.textContent = 'SAVING…';
    try {
      await saveIntroMusic(selectedId, pendingFile, pendingUrl);
      showToast('Intro music saved ✓', 'success');
      _close(backdrop);
    } catch (err) {
      showToast((err as Error).message || 'Save failed', 'error');
      saveBtn.disabled = false; saveBtn.textContent = 'SAVE';
    }
  });

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) _close(backdrop); });
}
