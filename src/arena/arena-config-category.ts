// arena-config-category.ts — Category + rounds picker bottom sheet
// Part of the arena-config-mode split

import { set_selectedCategory, set_selectedWantMod, set_selectedLinkUrl, set_selectedLinkPreview, selectedRounds } from './arena-state.ts';
import { escapeHTML, showToast } from '../config.ts';
import { clampVercel } from '../contracts/dependency-clamps.ts';
import { getSupabaseClient, safeRpc } from '../auth.ts';
import { create_debate_card } from '../contracts/rpc-schemas.ts';
import { QUEUE_CATEGORIES } from './arena-constants.ts';
import { pushArenaState } from './arena-core.utils.ts';
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
      <label id="arena-want-mod-row" style="display:flex;align-items:center;gap:14px;padding:16px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);cursor:pointer;user-select:none;margin-bottom:8px;">
        <input type="checkbox" id="arena-want-mod-toggle" style="width:22px;height:22px;accent-color:var(--mod-accent-primary);cursor:pointer;flex-shrink:0;">
        <div>
          <div style="font-family:var(--mod-font-ui);font-size:15px;font-weight:700;color:var(--mod-text-heading);letter-spacing:0.5px;">🧑‍⚖️ REQUEST A MODERATOR</div>
          <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-muted);margin-top:2px;">A human moderator will judge this debate</div>
        </div>
      </label>
      <button id="arena-invite-mod-btn" style="display:none;width:100%;padding:12px 16px;border-radius:var(--mod-radius-md);border:1px dashed var(--mod-border-primary);background:transparent;color:var(--mod-text-body);font-family:var(--mod-font-ui);font-size:14px;cursor:pointer;text-align:left;margin-bottom:12px;">
        👤 INVITE A SPECIFIC MODERATOR
      </button>
      <div id="arena-mod-invite-search" style="display:none;margin-bottom:12px;">
        <input id="arena-mod-search-input" type="text" placeholder="Search by username…" style="width:100%;padding:10px 14px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-accent);background:var(--mod-bg-card);color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;box-sizing:border-box;outline:none;">
        <div id="arena-mod-search-results" style="margin-top:6px;"></div>
        <div id="arena-mod-invited-card" style="display:none;margin-top:6px;padding:10px 14px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-accent);background:var(--mod-accent-muted);font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-primary);display:flex;align-items:center;justify-content:space-between;"></div>
      </div>
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

  // Mod invite state
  let invitedModId: string | null = null;
  let invitedModName: string | null = null;

  // Show/hide invite button when checkbox toggled
  const wantModToggle = document.getElementById('arena-want-mod-toggle') as HTMLInputElement | null;
  const inviteModBtn = document.getElementById('arena-invite-mod-btn');
  const modInviteSearch = document.getElementById('arena-mod-invite-search');
  wantModToggle?.addEventListener('change', () => {
    if (wantModToggle.checked) {
      if (inviteModBtn) inviteModBtn.style.display = 'block';
    } else {
      if (inviteModBtn) inviteModBtn.style.display = 'none';
      if (modInviteSearch) modInviteSearch.style.display = 'none';
      invitedModId = null;
      invitedModName = null;
    }
  });

  // Open search panel
  inviteModBtn?.addEventListener('click', () => {
    if (modInviteSearch) modInviteSearch.style.display = 'block';
    (document.getElementById('arena-mod-search-input') as HTMLInputElement | null)?.focus();
  });

  // Moderator search
  const modSearchInput = document.getElementById('arena-mod-search-input') as HTMLInputElement | null;
  const modSearchResults = document.getElementById('arena-mod-search-results');
  const modInvitedCard = document.getElementById('arena-mod-invited-card');
  let modSearchTimer: ReturnType<typeof setTimeout> | null = null;

  modSearchInput?.addEventListener('input', () => {
    if (modSearchTimer) clearTimeout(modSearchTimer);
    const q = modSearchInput.value.trim();
    if (!q || q.length < 2) { if (modSearchResults) modSearchResults.innerHTML = ''; return; }
    modSearchTimer = setTimeout(async () => {
      try {
        const { data, error } = await safeRpc<{ id: string; username: string; display_name: string; mod_rating: number; mod_debates_total: number }[]>('search_moderators', { p_query: q });
        if (error || !data || !(data as unknown[]).length) {
          if (modSearchResults) modSearchResults.innerHTML = '<div style="padding:8px;font-size:13px;color:var(--mod-text-muted);">No moderators found</div>';
          return;
        }
        const mods = data as { id: string; username: string; display_name: string; mod_rating: number; mod_debates_total: number }[];
        if (modSearchResults) {
          modSearchResults.innerHTML = mods.map(m => `
            <div class="mod-search-result" data-id="${escapeHTML(m.id)}" data-name="${escapeHTML(m.display_name || m.username)}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:var(--mod-radius-md);border:1px solid var(--mod-border-primary);background:var(--mod-bg-card);margin-bottom:6px;cursor:pointer;">
              <div>
                <div style="font-family:var(--mod-font-ui);font-size:14px;font-weight:600;color:var(--mod-text-primary);">${escapeHTML(m.display_name || m.username)}</div>
                <div style="font-size:12px;color:var(--mod-text-muted);">@${escapeHTML(m.username)} · ${m.mod_debates_total ?? 0} debates moderated</div>
              </div>
              <div style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-accent);">${m.mod_rating ? Number(m.mod_rating).toFixed(1) + '★' : ''}</div>
            </div>
          `).join('');
          modSearchResults.querySelectorAll('.mod-search-result').forEach(el => {
            el.addEventListener('click', () => {
              invitedModId = (el as HTMLElement).dataset.id ?? null;
              invitedModName = (el as HTMLElement).dataset.name ?? null;
              modSearchResults.innerHTML = '';
              if (modSearchInput) modSearchInput.value = '';
              if (modInviteSearch) modInviteSearch.style.display = 'none';
              if (inviteModBtn) inviteModBtn.style.display = 'none';
              if (modInvitedCard) {
                modInvitedCard.style.display = 'flex';
                modInvitedCard.innerHTML = `<span>⚖️ ${escapeHTML(invitedModName ?? '')} invited</span><button id="arena-mod-invite-clear" style="background:none;border:none;color:var(--mod-text-muted);font-size:18px;cursor:pointer;padding:0;">×</button>`;
                document.getElementById('arena-mod-invite-clear')?.addEventListener('click', () => {
                  invitedModId = null;
                  invitedModName = null;
                  modInvitedCard.style.display = 'none';
                  if (inviteModBtn) inviteModBtn.style.display = 'block';
                });
              }
            });
          });
        }
      } catch { if (modSearchResults) modSearchResults.innerHTML = '<div style="padding:8px;font-size:13px;color:var(--mod-text-muted);">Search failed</div>'; }
    }, 350);
  });

  // Post debate card and trigger background OG scrape
  const postDebate = async (category: string | null) => {
    const title = getTitle();
    const linkUrl = (document.getElementById('arena-cat-link') as HTMLInputElement | null)?.value?.trim() || null;
    const wantMod = getWantMod();

    if (!title) {
      const titleInput = document.getElementById('arena-cat-title') as HTMLInputElement | null;
      if (titleInput) { titleInput.style.borderColor = 'var(--mod-magenta)'; setTimeout(() => { titleInput.style.borderColor = 'var(--mod-border-primary)'; }, 1500); }
      return;
    }

    set_selectedCategory(category);
    set_selectedWantMod(wantMod);

    const params: Record<string, unknown> = {
      p_content: title,
      p_category: category || 'trending',
      p_total_rounds: selectedRounds,
      p_want_moderator: wantMod || !!invitedModId,
    };
    if (linkUrl) params.p_link_url = linkUrl;

    overlay.remove();

    const { data: cardData, error } = await safeRpc('create_debate_card', params, create_debate_card);
    if (error) {
      showToast('Could not post debate — try again', 'error');
      return;
    }

    // If a specific moderator was invited, send the invite now that we have the debate_id
    const debateId = (cardData as Record<string, unknown>)?.debate_id as string | undefined;
    if (invitedModId && debateId) {
      try {
        await safeRpc('invite_moderator', { p_debate_id: debateId, p_moderator_id: invitedModId });
      } catch { /* non-critical — debate is posted, invite just didn't send */ }
    }

    showToast('⚔️ Debate posted! Challengers incoming.', 'success');

    // Claim tokens
    try {
      const { claimActionTokens, claimMilestone } = await import('../tokens.claims.ts');
      void claimActionTokens?.('hot_take', '');
      void claimMilestone?.('first_hot_take');
    } catch { /* non-critical */ }

    // Background OG scrape if link provided
    if (linkUrl && (cardData as Record<string, unknown>)?.debate_id) {
      const debateId = (cardData as Record<string, unknown>).debate_id as string;
      void _scrapeOgBackground(linkUrl, debateId);
    }

    // Navigate home to see the card in the feed
    const { navigateTo } = await import('../navigation.ts');
    navigateTo('home');
  };

  // Background OG scrape — same pattern as home.feed.ts
  const _scrapeOgBackground = async (linkUrl: string, debateId: string): Promise<void> => {
    try {
      const client = getSupabaseClient();
      const session = client ? await client.auth.getSession() : null;
      const token = session?.data?.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/scrape-og?url=' + encodeURIComponent(linkUrl), { headers: { 'Authorization': 'Bearer ' + token } });
      clampVercel('/api/scrape-og', res);
      if (!res.ok) return;
      const preview = await res.json();
      if (!preview?.image_url) return;
      const supabase = getSupabaseClient();
      if (supabase) await (supabase as any).from('arena_debates').update({ link_preview: preview }).eq('id', debateId);
    } catch { /* silent */ }
  };

  // Wire category buttons
  overlay.querySelectorAll('.arena-cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      void postDebate((btn as HTMLElement).dataset.cat ?? null);
    });
  });

  // Wire "any" button
  document.getElementById('arena-cat-any')?.addEventListener('click', () => {
    void postDebate(null);
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
