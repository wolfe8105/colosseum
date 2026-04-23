// arena-config-category.ts — Category + rounds picker bottom sheet
// Part of the arena-config-mode split

import { set_selectedCategory, set_selectedWantMod, set_selectedLinkUrl, set_selectedLinkPreview } from './arena-state.ts';
import { escapeHTML } from '../config.ts';
import { clampVercel } from '../contracts/dependency-clamps.ts';
import { getSupabaseClient } from '../auth.ts';
import { QUEUE_CATEGORIES } from './arena-constants.ts';
import { pushArenaState } from './arena-core.utils.ts';
import { enterQueue } from './arena-queue.ts';
import { roundPickerCSS, roundPickerHTML, wireRoundPicker } from './arena-config-round-picker.ts';

export function showCategoryPicker(mode: string, topic: string): void {
  const overlay = document.createElement('div');
  overlay.className = 'arena-cat-overlay';
  overlay.id = 'arena-cat-overlay';
  overlay.innerHTML = `
    <style>
      .arena-cat-overlay { position:fixed; inset:0; z-index:300; display:flex; align-items:flex-end; }
      .arena-cat-backdrop { position:absolute; inset:0; background:var(--mod-bg-overlay); }
      .arena-cat-sheet { position:relative; width:100%; background:var(--mod-bg-base); border-radius:var(--mod-radius-lg) var(--mod-radius-lg) 0 0; padding:20px 20px calc(20px + var(--safe-bottom)); z-index:1; animation:slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
      @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
      .arena-cat-handle { width:36px; height:4px; border-radius:2px; background:var(--mod-border-primary); margin:0 auto 16px; }
      .arena-cat-title { font-family:var(--mod-font-ui); font-size:11px; font-weight:600; letter-spacing:3px; color:var(--mod-text-muted); text-transform:uppercase; text-align:center; margin-bottom:6px; }
      .arena-cat-subtitle { font-size:13px; color:var(--mod-text-body); text-align:center; margin-bottom:20px; }
      .arena-cat-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
      .arena-cat-btn { display:flex; align-items:center; gap:10px; padding:14px 16px; border-radius:var(--mod-radius-md); border:1px solid var(--mod-border-primary); background:var(--mod-bg-card); cursor:pointer; transition:all 0.15s; }
      .arena-cat-btn:active, .arena-cat-btn.selected { border-color:var(--mod-accent); background:var(--mod-accent-muted); }
      .arena-cat-icon { font-size:20px; flex-shrink:0; }
      .arena-cat-label { font-family:var(--mod-font-ui); font-size:13px; font-weight:600; color:var(--mod-text-primary); letter-spacing:0.5px; }
      .arena-cat-any { width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:14px; border-radius:var(--mod-radius-md); border:1px solid var(--mod-border-subtle); background:transparent; cursor:pointer; font-family:var(--mod-font-ui); font-size:13px; color:var(--mod-text-muted); letter-spacing:1px; margin-bottom:12px; transition:all 0.15s; }
      .arena-cat-any:active { background:var(--mod-bg-card); }
      .arena-cat-cancel { width:100%; padding:12px; border-radius:var(--mod-radius-pill); border:none; background:transparent; color:var(--mod-text-muted); font-family:var(--mod-font-ui); font-size:14px; cursor:pointer; }
      ${roundPickerCSS()}
    </style>
    <div class="arena-cat-backdrop" id="arena-cat-backdrop"></div>
    <div class="arena-cat-sheet">
      <div class="arena-cat-handle"></div>
      <div class="arena-cat-title">Choose Your Arena</div>
      <div class="arena-cat-subtitle">You'll only match opponents in the same room</div>
      <div class="arena-cat-grid">
        ${QUEUE_CATEGORIES.map(c => `
          <button class="arena-cat-btn" data-cat="${c.id}">
            <span class="arena-cat-icon">${c.icon}</span>
            <span class="arena-cat-label">${c.label}</span>
          </button>
        `).join('')}
      </div>
      <button class="arena-cat-any" id="arena-cat-any">⚡ ANY CATEGORY — FASTEST MATCH</button>
      ${roundPickerHTML()}
      <div style="margin-bottom:12px;">
        <div class="arena-round-label">Debate Title</div>
        <input id="arena-cat-title" type="text" maxlength="200" placeholder="e.g. Is AI going to take all our jobs?" style="width:100%;padding:10px 14px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;box-sizing:border-box;outline:none;">
      </div>
      <div style="margin-bottom:16px;">
        <div class="arena-round-label">Add a Link (optional)</div>
        <input id="arena-cat-link" type="url" maxlength="2000" placeholder="Paste a URL — image will appear on the debate card" style="width:100%;padding:10px 14px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;box-sizing:border-box;outline:none;">
        <div id="arena-cat-link-preview" style="display:none;margin-top:8px;"></div>
        <div id="arena-cat-link-error" style="display:none;color:var(--mod-status-live);font-size:12px;margin-top:4px;"></div>
      </div>
      <label id="arena-want-mod-row" style="display:flex;align-items:center;gap:14px;padding:16px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);cursor:pointer;user-select:none;margin-bottom:12px;">
        <input type="checkbox" id="arena-want-mod-toggle" style="width:22px;height:22px;accent-color:var(--mod-accent-primary);cursor:pointer;flex-shrink:0;">
        <div>
          <div style="font-family:var(--mod-font-ui);font-size:15px;font-weight:700;color:var(--mod-text-heading);letter-spacing:0.5px;">🧑‍⚖️ REQUEST A MODERATOR</div>
          <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-muted);margin-top:2px;">A human moderator will judge this debate</div>
        </div>
      </label>
      <button class="arena-cat-cancel" id="arena-cat-cancel">Back</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pushArenaState('categoryPicker');
  wireRoundPicker(overlay);

  // Helper: read title from input
  const getTitle = () => (document.getElementById('arena-cat-title') as HTMLInputElement | null)?.value?.trim() || topic;
  const getWantMod = () => (document.getElementById('arena-want-mod-toggle') as HTMLInputElement | null)?.checked ?? false;

  // Wire link scraping
  const linkInput = document.getElementById('arena-cat-link') as HTMLInputElement | null;
  if (linkInput) {
    let lastUrl = '';
    const scrapeLink = async () => {
      const url = linkInput.value.trim();
      const previewEl = document.getElementById('arena-cat-link-preview');
      const errorEl = document.getElementById('arena-cat-link-error');
      if (!url) { set_selectedLinkUrl(null); set_selectedLinkPreview(null); if (previewEl) previewEl.style.display = 'none'; return; }
      if (url === lastUrl) return;
      lastUrl = url;
      try { const u = new URL(url); if (u.protocol !== 'https:' && u.protocol !== 'http:') throw 0; }
      catch { if (errorEl) { errorEl.textContent = 'Enter a valid URL'; errorEl.style.display = 'block'; } return; }
      if (previewEl) { previewEl.style.display = 'block'; previewEl.innerHTML = '<div style="padding:8px;color:var(--mod-text-muted);font-size:12px;">Fetching preview…</div>'; }
      if (errorEl) errorEl.style.display = 'none';
      try {
        const client = getSupabaseClient();
        const session = client ? await client.auth.getSession() : null;
        const token = session?.data?.session?.access_token;
        if (!token) { if (errorEl) { errorEl.textContent = 'Sign in to add links'; errorEl.style.display = 'block'; } return; }
        const res = await fetch('/api/scrape-og?url=' + encodeURIComponent(url), { headers: { 'Authorization': 'Bearer ' + token } });
        clampVercel('/api/scrape-og', res);
        const data = await res.json();
        if (!res.ok) { set_selectedLinkUrl(null); set_selectedLinkPreview(null); if (previewEl) previewEl.style.display = 'none'; if (errorEl) { errorEl.textContent = data.error || 'Could not preview this link'; errorEl.style.display = 'block'; } return; }
        set_selectedLinkUrl(url);
        set_selectedLinkPreview(data);
        if (errorEl) errorEl.style.display = 'none';
        if (previewEl) {
          previewEl.style.display = 'block';
          previewEl.innerHTML = '<div style="border-radius:8px;overflow:hidden;border:1px solid var(--mod-border-secondary);">' +
            (data.image_url ? '<img src="' + escapeHTML(data.image_url) + '" style="width:100%;max-height:140px;object-fit:cover;" onerror="this.style.display=&quot;none&quot;">' : '') +
            '<div style="padding:8px 10px;"><div style="font-size:11px;color:var(--mod-text-muted);">' + escapeHTML(data.domain || '') + '</div>' +
            (data.og_title ? '<div style="font-size:13px;font-weight:600;color:var(--mod-text-heading);margin-top:2px;">' + escapeHTML(data.og_title) + '</div>' : '') +
            '</div></div>';
        }
      } catch { set_selectedLinkUrl(null); set_selectedLinkPreview(null); if (previewEl) previewEl.style.display = 'none'; if (errorEl) { errorEl.textContent = 'Could not fetch link'; errorEl.style.display = 'block'; } }
    };
    linkInput.addEventListener('blur', () => { void scrapeLink(); });
    linkInput.addEventListener('paste', () => { setTimeout(() => { void scrapeLink(); }, 100); });
  }

  // Wire category buttons
  overlay.querySelectorAll('.arena-cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      set_selectedCategory((btn as HTMLElement).dataset.cat ?? null);
      set_selectedWantMod(getWantMod());
      overlay.remove();
      enterQueue(mode, getTitle());
    });
  });

  // Wire "any" button
  document.getElementById('arena-cat-any')?.addEventListener('click', () => {
    set_selectedCategory(null);
    set_selectedWantMod(getWantMod());
    overlay.remove();
    enterQueue(mode, getTitle());
  });

  // Wire cancel — go back to lobby
  document.getElementById('arena-cat-cancel')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });

  // Backdrop tap = cancel
  document.getElementById('arena-cat-backdrop')?.addEventListener('click', () => {
    overlay.remove();
    history.back();
  });
}
