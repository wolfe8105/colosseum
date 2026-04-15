/**
 * intro-music.ts — F-21 Intro Music picker
 *
 * Renders a bottom sheet for picking one of 10 standard intro tracks
 * or uploading a custom 10-sec clip (Tier 2, unlocked at 35% profile depth).
 *
 * Depends on: auth.ts, arena-sounds.ts (for preview + INTRO_TRACKS)
 */

import { safeRpc, getCurrentProfile, getSupabaseClient } from './auth.ts';
import { escapeHTML, showToast } from './config.ts';
import { INTRO_TRACKS, playIntroMusic } from './arena/arena-sounds.ts';

// ============================================================
// CSS (injected once)
// ============================================================

let _cssInjected = false;
function _injectCSS(): void {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    .im-backdrop {
      position: fixed; inset: 0; z-index: 9000;
      background: rgba(0,0,0,0.6);
      animation: imFadeIn 0.2s ease;
    }
    @keyframes imFadeIn { from { opacity:0 } to { opacity:1 } }
    @keyframes imSlideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }

    .im-sheet {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9001;
      background: var(--mod-bg-card);
      border-top: 1px solid var(--mod-accent-border);
      border-radius: 16px 16px 0 0;
      padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px));
      max-height: 82dvh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      animation: imSlideUp 0.28s cubic-bezier(0.32,0.72,0,1);
    }

    .im-handle {
      width: 36px; height: 4px;
      background: var(--mod-border-primary);
      border-radius: 2px;
      margin: 0 auto 16px;
    }

    .im-title {
      font-family: var(--mod-font-display);
      font-size: 17px;
      font-weight: 700;
      color: var(--mod-text-heading);
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .im-subtitle {
      font-size: 12px;
      color: var(--mod-text-muted);
      margin-bottom: 18px;
      font-family: var(--mod-font-ui);
    }

    .im-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
    }

    .im-track-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 12px;
      background: var(--mod-bg-inset);
      border: 1px solid var(--mod-border-primary);
      border-radius: 10px;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s, background 0.15s;
      position: relative;
    }
    .im-track-btn:hover { background: var(--mod-accent-muted); }
    .im-track-btn.selected {
      border-color: var(--mod-accent);
      background: var(--mod-accent-muted);
    }
    .im-track-btn.selected::after {
      content: '✓';
      position: absolute;
      top: 6px; right: 8px;
      font-size: 11px;
      color: var(--mod-accent);
      font-weight: 700;
    }

    .im-track-icon  { font-size: 22px; flex-shrink: 0; }
    .im-track-info  { overflow: hidden; }
    .im-track-label {
      font-family: var(--mod-font-ui);
      font-size: 13px;
      font-weight: 700;
      color: var(--mod-text-heading);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .im-track-desc {
      font-size: 10px;
      color: var(--mod-text-muted);
      letter-spacing: 0.3px;
      margin-top: 1px;
    }

    .im-preview-btn {
      font-size: 14px;
      position: absolute;
      top: 50%; right: 8px;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: var(--mod-text-muted);
      display: none;
    }
    .im-track-btn:hover .im-preview-btn { display: block; }
    .im-preview-btn:hover { color: var(--mod-accent); }

    .im-tier2-section {
      border-top: 1px solid var(--mod-border-primary);
      padding-top: 14px;
      margin-top: 4px;
    }
    .im-tier2-label {
      font-family: var(--mod-font-ui);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      color: var(--mod-accent);
      margin-bottom: 8px;
    }
    .im-tier2-locked {
      font-size: 13px;
      color: var(--mod-text-muted);
      font-family: var(--mod-font-ui);
      padding: 10px 12px;
      background: var(--mod-bg-inset);
      border-radius: 8px;
    }
    .im-upload-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 12px;
      background: var(--mod-bg-inset);
      border: 1px dashed var(--mod-accent-border);
      border-radius: 10px;
      cursor: pointer;
      font-family: var(--mod-font-ui);
      font-size: 13px;
      font-weight: 600;
      color: var(--mod-accent);
      letter-spacing: 0.5px;
      transition: background 0.15s, border-color 0.15s;
    }
    .im-upload-btn:hover { background: var(--mod-accent-muted); border-color: var(--mod-accent); }
    .im-upload-btn.selected { border-style: solid; }
    .im-upload-desc {
      font-size: 11px;
      color: var(--mod-text-muted);
      margin-top: 6px;
      font-family: var(--mod-font-ui);
    }

    .im-save-btn {
      display: block;
      width: 100%;
      margin-top: 18px;
      padding: 14px;
      background: var(--mod-accent);
      color: var(--mod-bg-base);
      font-family: var(--mod-font-display);
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1.5px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .im-save-btn:disabled { opacity: 0.4; cursor: default; }
    .im-save-btn:not(:disabled):hover { opacity: 0.85; }
  `;
  document.head.appendChild(s);
}

// ============================================================
// OPEN SHEET
// ============================================================

export function openIntroMusicPicker(): void {
  _injectCSS();

  const profile = getCurrentProfile();
  const currentId    = profile?.intro_music_id ?? 'gladiator';
  const currentUrl   = profile?.custom_intro_url ?? null;
  const depthPct     = profile?.profile_depth_pct ?? 0;
  const tier2Unlocked = depthPct >= 35;

  // Remove any existing sheet
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
        <div class="im-tier2-locked">
          🔒 Unlock at 35% profile depth
          <span style="color:var(--mod-accent);margin-left:4px;">(${Math.round(depthPct)}% now)</span>
        </div>
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
    <button class="im-save-btn" id="im-save-btn">SAVE</button>
  `;

  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);

  // ── State ────────────────────────────────────────────────────
  let selectedId  = currentId;
  let pendingFile: File | null = null;
  let pendingUrl  = currentUrl;

  // ── Track buttons ────────────────────────────────────────────
  sheet.querySelectorAll<HTMLButtonElement>('.im-track-btn[data-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Don't fire if preview button was clicked
      if ((e.target as HTMLElement).closest('.im-preview-btn')) return;
      selectedId  = btn.dataset.id!;
      pendingFile = null;
      _refreshSelected(sheet, selectedId);
    });
  });

  // ── Preview buttons ──────────────────────────────────────────
  sheet.querySelectorAll<HTMLButtonElement>('.im-preview-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      playIntroMusic(btn.dataset.preview!);
    });
  });

  // ── Upload button (Tier 2) ───────────────────────────────────
  const uploadBtn  = sheet.querySelector<HTMLButtonElement>('#im-upload-btn');
  const fileInput  = sheet.querySelector<HTMLInputElement>('#im-file-input');

  uploadBtn?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large — max 5MB', 'error');
      return;
    }
    pendingFile = file;
    selectedId  = 'custom';
    if (uploadBtn) uploadBtn.textContent = `🎵 ${escapeHTML(file.name.slice(0, 28))}`;
    _refreshSelected(sheet, 'custom');
    // Preview it locally
    const localUrl = URL.createObjectURL(file);
    playIntroMusic('custom', localUrl);
  });

  // ── Save ─────────────────────────────────────────────────────
  const saveBtn = sheet.querySelector<HTMLButtonElement>('#im-save-btn');
  saveBtn?.addEventListener('click', async () => {
    if (!saveBtn) return;
    saveBtn.disabled = true;
    saveBtn.textContent = 'SAVING…';
    try {
      await _saveIntroMusic(selectedId, pendingFile, pendingUrl);
      showToast('Intro music saved ✓', 'success');
      _close(backdrop);
    } catch (err) {
      showToast((err as Error).message || 'Save failed', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'SAVE';
    }
  });

  // ── Dismiss ──────────────────────────────────────────────────
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) _close(backdrop);
  });
}

// ============================================================
// HELPERS
// ============================================================

function _refreshSelected(sheet: HTMLElement, id: string): void {
  sheet.querySelectorAll('.im-track-btn').forEach(b =>
    b.classList.toggle('selected', (b as HTMLElement).dataset.id === id)
  );
  const uploadBtn = sheet.querySelector<HTMLElement>('#im-upload-btn');
  if (uploadBtn) uploadBtn.classList.toggle('selected', id === 'custom');
}

function _close(backdrop: HTMLElement): void {
  backdrop.style.transition = 'opacity 0.2s';
  backdrop.style.opacity = '0';
  setTimeout(() => backdrop.remove(), 220);
}

// ============================================================
// SAVE (RPC + optional storage upload)
// ============================================================

async function _saveIntroMusic(
  trackId: string,
  file: File | null,
  existingUrl: string | null | undefined
): Promise<void> {
  let uploadedUrl: string | undefined;

  if (trackId === 'custom') {
    if (file) {
      // Upload to Supabase Storage
      const client = getSupabaseClient();
      if (!client) throw new Error('Not connected');
      const profile = getCurrentProfile();
      if (!profile) throw new Error('Not signed in');

      const ext  = file.name.split('.').pop() ?? 'mp3';
      const path = `${profile.id}/intro.${ext}`;

      const { error: upErr } = await client.storage
        .from('intro-music')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw new Error(upErr.message);

      const { data: signedData, error: signErr } = await client.storage
        .from('intro-music')
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1-year signed URL

      if (signErr || !signedData?.signedUrl) throw new Error('Could not get URL');
      uploadedUrl = signedData.signedUrl;
    } else if (existingUrl) {
      uploadedUrl = existingUrl;
    } else {
      throw new Error('No file selected');
    }
  }

  const { data, error } = await safeRpc('save_intro_music', {
    p_track_id:   trackId,
    p_custom_url: uploadedUrl ?? null,
  });

  if (error) throw new Error(error.message ?? 'Save failed');
  const result = data as { error?: string } | null;
  if (result?.error) throw new Error(result.error);

  // Update local profile cache
  const profile = getCurrentProfile();
  if (profile) {
    (profile as Record<string, unknown>).intro_music_id  = trackId;
    (profile as Record<string, unknown>).custom_intro_url = uploadedUrl ?? null;
  }
}
