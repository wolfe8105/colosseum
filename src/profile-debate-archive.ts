/**
 * THE MODERATOR — Profile Debate Archive (F-53)
 *
 * Spreadsheet-style table on the profile page.
 * One row per debate — topic, opponent, date, W/L, score, category.
 * Filterable. Owner can add/remove/hide. Public by default.
 * Each row links to canonical archive page.
 */

import { getCurrentUser, safeRpc } from './auth.core.ts';
import { escapeHTML, showToast } from './config.ts';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface ArchiveEntry {
  entry_id:          string;
  debate_id:         string;
  custom_name:       string | null;
  custom_desc:       string | null;
  hide_from_public:  boolean;
  entry_created_at:  string;
  topic:             string | null;
  category:          string | null;
  debate_created_at: string;
  opponent_id:       string | null;
  opponent_name:     string | null;
  opponent_username: string | null;
  my_side:           string;
  winner:            string | null;
  my_score:          number | null;
  opp_score:         number | null;
  is_win:            boolean;
  debate_mode:       string | null;
}

interface RecentDebate {
  debate_id:         string;
  topic:             string | null;
  category:          string | null;
  debate_created_at: string;
  opponent_name:     string | null;
  opponent_username: string | null;
  my_score:          number | null;
  opp_score:         number | null;
  is_win:            boolean;
  debate_mode:       string | null;
}

// --------------------------------------------------------------------------
// State
// --------------------------------------------------------------------------

let _entries: ArchiveEntry[] = [];
let _filterCat = 'all';
let _filterResult = 'all'; // 'all' | 'win' | 'loss'
let _filterSearch = '';
let _isOwner = false;
let _cssInjected = false;

// --------------------------------------------------------------------------
// CSS
// --------------------------------------------------------------------------

function _injectCSS(): void {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    /* ===== F-53 DEBATE ARCHIVE ===== */
    .dba-section { padding: 0 16px 80px; }
    .dba-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .dba-title { font-family: var(--mod-font-display); font-size: 11px; letter-spacing: 3px; color: var(--mod-text-muted); text-transform: uppercase; }
    .dba-add-btn { background: var(--mod-accent); color: var(--mod-bg-base); border: none; border-radius: 8px; padding: 6px 12px; font-family: var(--mod-font-display); font-size: 11px; letter-spacing: 2px; cursor: pointer; }
    .dba-add-btn:active { opacity: 0.75; }

    /* Filter bar */
    .dba-filters { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; align-items: center; }
    .dba-chip { padding: 5px 10px; border-radius: 20px; border: 1px solid var(--mod-border-primary); background: var(--mod-bg-card); color: var(--mod-text-muted); font-size: 11px; letter-spacing: 1px; cursor: pointer; white-space: nowrap; -webkit-tap-highlight-color: transparent; }
    .dba-chip.active { background: var(--mod-accent); border-color: var(--mod-accent); color: var(--mod-bg-base); }
    .dba-search { flex: 1; min-width: 100px; background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); border-radius: 8px; padding: 5px 10px; color: var(--mod-text-body); font-size: 12px; outline: none; }
    .dba-search::placeholder { color: var(--mod-text-muted); }

    /* Table wrapper — horizontal scroll on mobile */
    .dba-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--mod-border-primary); border-radius: 10px; }
    .dba-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .dba-table th { padding: 8px 10px; text-align: left; font-family: var(--mod-font-display); font-size: 10px; letter-spacing: 2px; color: var(--mod-text-muted); background: var(--mod-bg-elevated); border-bottom: 1px solid var(--mod-border-primary); white-space: nowrap; }
    .dba-table td { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--mod-text-body); vertical-align: middle; }
    .dba-table tr:last-child td { border-bottom: none; }
    .dba-table tr:hover td { background: rgba(255,255,255,0.02); }
    .dba-row { cursor: pointer; }

    /* W/L badge */
    .dba-badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-family: var(--mod-font-display); font-size: 10px; letter-spacing: 1px; }
    .dba-badge.win  { background: rgba(22,199,132,0.15); color: #16c784; border: 1px solid rgba(22,199,132,0.3); }
    .dba-badge.loss { background: rgba(204,41,54,0.12);  color: var(--mod-magenta); border: 1px solid rgba(204,41,54,0.25); }
    .dba-badge.draw { background: rgba(255,255,255,0.06); color: var(--mod-text-muted); border: 1px solid var(--mod-border-primary); }

    /* Category chip */
    .dba-cat { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; letter-spacing: 1px; background: var(--mod-bg-elevated); color: var(--mod-text-muted); text-transform: uppercase; }

    /* Score */
    .dba-score { font-family: var(--mod-font-display); color: var(--mod-text-heading); white-space: nowrap; }

    /* Hidden indicator */
    .dba-hidden-badge { font-size: 10px; color: var(--mod-text-muted); margin-left: 4px; opacity: 0.6; }

    /* Name cell */
    .dba-name { max-width: 140px; }
    .dba-name-main { color: var(--mod-text-heading); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dba-name-desc { font-size: 10px; color: var(--mod-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }

    /* Owner action row */
    .dba-actions { display: flex; gap: 6px; }
    .dba-action-btn { background: none; border: 1px solid var(--mod-border-primary); border-radius: 6px; padding: 4px 8px; font-size: 11px; color: var(--mod-text-muted); cursor: pointer; white-space: nowrap; }
    .dba-action-btn:hover { border-color: var(--mod-accent); color: var(--mod-accent); }
    .dba-action-btn.danger:hover { border-color: var(--mod-magenta); color: var(--mod-magenta); }

    /* Empty state */
    .dba-empty { padding: 32px 16px; text-align: center; color: var(--mod-text-muted); font-size: 13px; }
    .dba-empty-icon { font-size: 28px; margin-bottom: 8px; }
    .dba-loading { padding: 24px 16px; text-align: center; color: var(--mod-text-muted); font-size: 12px; letter-spacing: 1px; }

    /* Add picker sheet */
    .dba-picker-overlay { position: fixed; inset: 0; background: var(--mod-bg-overlay); z-index: 9000; display: flex; align-items: flex-end; justify-content: center; }
    .dba-picker-sheet { background: var(--mod-bg-elevated); border-top-left-radius: 20px; border-top-right-radius: 20px; width: 100%; max-width: 480px; max-height: 70vh; display: flex; flex-direction: column; padding-bottom: max(16px, env(safe-area-inset-bottom)); }
    .dba-picker-handle { width: 36px; height: 4px; background: var(--mod-bg-control); border-radius: 2px; margin: 12px auto 16px; flex-shrink: 0; }
    .dba-picker-title { font-family: var(--mod-font-display); font-size: 12px; letter-spacing: 3px; color: var(--mod-text-muted); text-align: center; margin-bottom: 12px; flex-shrink: 0; }
    .dba-picker-list { overflow-y: auto; flex: 1; }
    .dba-picker-row { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; }
    .dba-picker-row:hover { background: rgba(255,255,255,0.03); }
    .dba-picker-topic { font-size: 13px; color: var(--mod-text-heading); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dba-picker-meta { font-size: 11px; color: var(--mod-text-muted); }
    .dba-picker-empty { padding: 32px 16px; text-align: center; color: var(--mod-text-muted); font-size: 13px; }

    /* Edit sheet */
    .dba-edit-field { margin: 0 16px 12px; }
    .dba-edit-label { font-size: 11px; letter-spacing: 1px; color: var(--mod-text-muted); margin-bottom: 4px; text-transform: uppercase; }
    .dba-edit-input { width: 100%; background: var(--mod-bg-card); border: 1px solid var(--mod-border-primary); border-radius: 8px; padding: 10px 12px; color: var(--mod-text-body); font-size: 13px; outline: none; box-sizing: border-box; }
    .dba-edit-input:focus { border-color: var(--mod-accent); }
    .dba-edit-toggle { display: flex; align-items: center; gap: 10px; margin: 0 16px 16px; }
    .dba-edit-toggle-label { font-size: 13px; color: var(--mod-text-body); flex: 1; }
    .dba-edit-actions { display: flex; gap: 8px; margin: 0 16px 8px; }
    .dba-edit-save { flex: 1; background: var(--mod-accent); color: var(--mod-bg-base); border: none; border-radius: 10px; padding: 12px; font-family: var(--mod-font-display); font-size: 13px; letter-spacing: 2px; cursor: pointer; }
    .dba-edit-cancel { padding: 12px 16px; background: var(--mod-bg-subtle); color: var(--mod-text-muted); border: 1px solid var(--mod-border-primary); border-radius: 10px; font-size: 13px; cursor: pointer; }
  `;
  document.head.appendChild(s);
}

// --------------------------------------------------------------------------
// Archive link helper
// --------------------------------------------------------------------------

function _archiveUrl(entry: ArchiveEntry): string {
  const mode = entry.debate_mode;
  if (mode === 'ai') return `/moderator-auto-debate.html?id=${encodeURIComponent(entry.debate_id)}`;
  return `/moderator-spectate.html?id=${encodeURIComponent(entry.debate_id)}`;
}

// --------------------------------------------------------------------------
// Filtering
// --------------------------------------------------------------------------

function _filtered(): ArchiveEntry[] {
  return _entries.filter(e => {
    if (_filterCat !== 'all' && (e.category ?? 'general') !== _filterCat) return false;
    if (_filterResult === 'win' && !e.is_win) return false;
    if (_filterResult === 'loss' && e.is_win) return false;
    if (_filterSearch) {
      const q = _filterSearch.toLowerCase();
      const topic = (e.topic ?? '').toLowerCase();
      const opp = (e.opponent_name ?? e.opponent_username ?? '').toLowerCase();
      const name = (e.custom_name ?? '').toLowerCase();
      if (!topic.includes(q) && !opp.includes(q) && !name.includes(q)) return false;
    }
    return true;
  });
}

// --------------------------------------------------------------------------
// Render
// --------------------------------------------------------------------------

function _renderTable(container: HTMLElement): void {
  const esc = escapeHTML;
  const rows = _filtered();

  const cats = [...new Set(_entries.map(e => e.category ?? 'general'))];

  let html = `
    <div class="dba-header">
      <div class="dba-title">⚔️ Debate Archive</div>
      ${_isOwner ? `<button class="dba-add-btn" id="dba-add-btn">+ ADD</button>` : ''}
    </div>
    <div class="dba-filters" id="dba-filters">
      <input class="dba-search" id="dba-search" placeholder="Search topic / opponent…" value="${esc(_filterSearch)}">
      <div class="dba-chip ${_filterResult === 'all' ? 'active' : ''}" data-result="all">ALL</div>
      <div class="dba-chip ${_filterResult === 'win' ? 'active' : ''}" data-result="win">W</div>
      <div class="dba-chip ${_filterResult === 'loss' ? 'active' : ''}" data-result="loss">L</div>
      ${cats.map(c => `<div class="dba-chip ${_filterCat === c ? 'active' : ''}" data-cat="${esc(c)}">${esc(c.toUpperCase())}</div>`).join('')}
      ${cats.length > 0 ? `<div class="dba-chip ${_filterCat === 'all' ? 'active' : ''}" data-cat="all">ALL CATS</div>` : ''}
    </div>`;

  if (rows.length === 0) {
    html += `
      <div class="dba-empty">
        <div class="dba-empty-icon">📭</div>
        ${_entries.length === 0
          ? (_isOwner ? 'No debates added yet.<br>Tap <strong>+ ADD</strong> to curate your archive.' : 'No debates in this archive.')
          : 'No debates match your filters.'}
      </div>`;
  } else {
    html += `
      <div class="dba-table-wrap">
        <table class="dba-table">
          <thead>
            <tr>
              <th>NAME / TOPIC</th>
              <th>VS</th>
              <th>DATE</th>
              <th>RESULT</th>
              <th>SCORE</th>
              <th>CAT</th>
              ${_isOwner ? '<th></th>' : ''}
            </tr>
          </thead>
          <tbody>`;

    for (const e of rows) {
      const date = new Date(e.debate_created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      const result = e.winner === null ? 'draw' : (e.is_win ? 'win' : 'loss');
      const resultLabel = result === 'win' ? 'W' : result === 'loss' ? 'L' : 'D';
      const oppLabel = esc(e.opponent_name ?? e.opponent_username ?? 'Unknown');
      const topicLabel = esc(e.custom_name ?? e.topic ?? 'Untitled');
      const descLabel = e.custom_desc ? esc(e.custom_desc) : (e.custom_name && e.topic ? esc(e.topic) : '');
      const myS = e.my_score != null ? e.my_score.toFixed(1) : '—';
      const oppS = e.opp_score != null ? e.opp_score.toFixed(1) : '—';
      const catLabel = esc((e.category ?? 'general').toUpperCase());
      const hiddenFlag = (_isOwner && e.hide_from_public) ? '<span class="dba-hidden-badge">🔒</span>' : '';

      html += `
        <tr class="dba-row" data-entry="${esc(e.entry_id)}" data-url="${esc(_archiveUrl(e))}">
          <td class="dba-name">
            <div class="dba-name-main">${topicLabel}${hiddenFlag}</div>
            ${descLabel ? `<div class="dba-name-desc">${descLabel}</div>` : ''}
          </td>
          <td>${oppLabel}</td>
          <td style="white-space:nowrap">${date}</td>
          <td><span class="dba-badge ${result}">${resultLabel}</span></td>
          <td class="dba-score">${myS}–${oppS}</td>
          <td><span class="dba-cat">${catLabel}</span></td>
          ${_isOwner ? `
          <td>
            <div class="dba-actions">
              <button class="dba-action-btn" data-action="edit" data-entry="${esc(e.entry_id)}">✏️</button>
              <button class="dba-action-btn" data-action="toggle-hide" data-entry="${esc(e.entry_id)}">${e.hide_from_public ? '👁' : '🔒'}</button>
              <button class="dba-action-btn danger" data-action="remove" data-entry="${esc(e.entry_id)}">✕</button>
            </div>
          </td>` : ''}
        </tr>`;
    }

    html += `</tbody></table></div>`;
  }

  container.innerHTML = html;
  _wireTable(container);
}

function _wireTable(container: HTMLElement): void {
  // Search
  const searchEl = container.querySelector<HTMLInputElement>('#dba-search');
  searchEl?.addEventListener('input', () => {
    _filterSearch = searchEl.value;
    _renderTable(container);
  });

  // Filter chips
  container.querySelectorAll<HTMLElement>('.dba-chip[data-result]').forEach(chip => {
    chip.addEventListener('click', () => {
      _filterResult = chip.dataset.result!;
      _renderTable(container);
    });
  });
  container.querySelectorAll<HTMLElement>('.dba-chip[data-cat]').forEach(chip => {
    chip.addEventListener('click', () => {
      _filterCat = chip.dataset.cat!;
      _renderTable(container);
    });
  });

  // Row click → archive link
  container.querySelectorAll<HTMLElement>('.dba-row').forEach(row => {
    row.addEventListener('click', (e) => {
      // Don't navigate if an action button was clicked
      if ((e.target as HTMLElement).closest('.dba-actions')) return;
      const url = row.dataset.url;
      if (url) window.open(url, '_blank');
    });
  });

  // Add button
  container.querySelector('#dba-add-btn')?.addEventListener('click', () => {
    void _showAddPicker(container);
  });

  // Owner action buttons
  container.querySelectorAll<HTMLElement>('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action!;
      const entryId = btn.dataset.entry!;
      const entry = _entries.find(x => x.entry_id === entryId);
      if (!entry) return;

      if (action === 'edit') {
        _showEditSheet(entry, container);
      } else if (action === 'toggle-hide') {
        void _toggleHide(entry, container);
      } else if (action === 'remove') {
        void _removeEntry(entry, container);
      }
    });
  });
}

// --------------------------------------------------------------------------
// Add picker
// --------------------------------------------------------------------------

async function _showAddPicker(container: HTMLElement): Promise<void> {
  const { data: rows, error } = await safeRpc<RecentDebate[]>('get_my_recent_debates_for_archive', { p_limit: 30 });
  if (error) { showToast('Could not load debates', 'error'); return; }

  const list = (rows ?? []) as RecentDebate[];
  const esc = escapeHTML;

  const overlay = document.createElement('div');
  overlay.className = 'dba-picker-overlay';
  overlay.innerHTML = `
    <div class="dba-picker-sheet">
      <div class="dba-picker-handle"></div>
      <div class="dba-picker-title">ADD DEBATE TO ARCHIVE</div>
      <div class="dba-picker-list">
        ${list.length === 0
          ? '<div class="dba-picker-empty">No unarchived completed debates.</div>'
          : list.map(d => {
              const date = new Date(d.debate_created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
              const opp = esc(d.opponent_name ?? d.opponent_username ?? 'Unknown');
              const result = d.winner === undefined ? '' : (d.is_win ? '✅ W' : '❌ L');
              return `
                <div class="dba-picker-row" data-debate="${esc(d.debate_id)}">
                  <div class="dba-picker-topic">${esc(d.topic ?? 'Untitled debate')}</div>
                  <div class="dba-picker-meta">vs ${opp} &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; ${result}</div>
                </div>`;
            }).join('')}
      </div>
    </div>`;

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  overlay.querySelectorAll<HTMLElement>('.dba-picker-row').forEach(row => {
    row.addEventListener('click', async () => {
      overlay.remove();
      const debateId = row.dataset.debate!;
      const { error: addErr } = await safeRpc('add_debate_to_archive', { p_debate_id: debateId });
      if (addErr) { showToast('Could not add debate', 'error'); return; }
      showToast('Added to archive', 'success');
      await _loadAndRender(container);
    });
  });
}

// --------------------------------------------------------------------------
// Edit sheet
// --------------------------------------------------------------------------

function _showEditSheet(entry: ArchiveEntry, container: HTMLElement): void {
  const esc = escapeHTML;
  const overlay = document.createElement('div');
  overlay.className = 'dba-picker-overlay';
  overlay.innerHTML = `
    <div class="dba-picker-sheet" style="padding-top:0;">
      <div class="dba-picker-handle"></div>
      <div class="dba-picker-title">EDIT ARCHIVE ENTRY</div>
      <div class="dba-edit-field">
        <div class="dba-edit-label">Name (optional)</div>
        <input class="dba-edit-input" id="dba-edit-name" maxlength="80" placeholder="e.g. My best win" value="${esc(entry.custom_name ?? '')}">
      </div>
      <div class="dba-edit-field">
        <div class="dba-edit-label">Description (optional)</div>
        <input class="dba-edit-input" id="dba-edit-desc" maxlength="200" placeholder="Short note about this debate…" value="${esc(entry.custom_desc ?? '')}">
      </div>
      <div class="dba-edit-toggle">
        <div class="dba-edit-toggle-label">Hide from public profile</div>
        <input type="checkbox" id="dba-edit-hide" ${entry.hide_from_public ? 'checked' : ''}>
      </div>
      <div class="dba-edit-actions">
        <button class="dba-edit-cancel" id="dba-edit-cancel">CANCEL</button>
        <button class="dba-edit-save" id="dba-edit-save">SAVE</button>
      </div>
    </div>`;

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  overlay.querySelector('#dba-edit-cancel')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector('#dba-edit-save')?.addEventListener('click', async () => {
    const name = (overlay.querySelector<HTMLInputElement>('#dba-edit-name')!).value.trim() || null;
    const desc = (overlay.querySelector<HTMLInputElement>('#dba-edit-desc')!).value.trim() || null;
    const hide = (overlay.querySelector<HTMLInputElement>('#dba-edit-hide')!).checked;

    const saveBtn = overlay.querySelector<HTMLButtonElement>('#dba-edit-save')!;
    saveBtn.disabled = true;
    saveBtn.textContent = '…';

    const { error } = await safeRpc('update_archive_entry', {
      p_entry_id: entry.entry_id,
      p_custom_name: name,
      p_custom_desc: desc,
      p_hide_from_public: hide,
    });

    if (error) { showToast('Could not save', 'error'); saveBtn.disabled = false; saveBtn.textContent = 'SAVE'; return; }
    overlay.remove();
    showToast('Saved', 'success');
    await _loadAndRender(container);
  });
}

// --------------------------------------------------------------------------
// Toggle hide
// --------------------------------------------------------------------------

async function _toggleHide(entry: ArchiveEntry, container: HTMLElement): Promise<void> {
  const newHide = !entry.hide_from_public;
  const { error } = await safeRpc('update_archive_entry', {
    p_entry_id: entry.entry_id,
    p_hide_from_public: newHide,
  });
  if (error) { showToast('Could not update', 'error'); return; }
  showToast(newHide ? 'Hidden from public' : 'Now visible', 'info');
  await _loadAndRender(container);
}

// --------------------------------------------------------------------------
// Remove entry
// --------------------------------------------------------------------------

async function _removeEntry(entry: ArchiveEntry, container: HTMLElement): Promise<void> {
  if (!confirm('Remove this debate from your archive?')) return;
  const { error } = await safeRpc('remove_from_archive', { p_entry_id: entry.entry_id });
  if (error) { showToast('Could not remove', 'error'); return; }
  showToast('Removed from archive', 'info');
  await _loadAndRender(container);
}

// --------------------------------------------------------------------------
// Load + render
// --------------------------------------------------------------------------

async function _loadAndRender(container: HTMLElement): Promise<void> {
  const { data, error } = await safeRpc<ArchiveEntry[]>('get_my_debate_archive', {});
  if (error) {
    container.innerHTML = '<div class="dba-empty">Could not load archive.</div>';
    return;
  }
  _entries = (data ?? []) as ArchiveEntry[];
  _renderTable(container);
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Load and render the debate archive into `container`.
 * Pass `isOwner: true` when the viewer is the profile owner.
 */
export async function loadDebateArchive(container: HTMLElement, isOwner = false): Promise<void> {
  _injectCSS();
  _isOwner = isOwner;
  _entries = [];
  _filterCat = 'all';
  _filterResult = 'all';
  _filterSearch = '';

  container.innerHTML = '<div class="dba-loading">LOADING ARCHIVE…</div>';

  if (isOwner) {
    await _loadAndRender(container);
  } else {
    // For public view — caller must pass userId separately; handled in wiring.
    container.innerHTML = '<div class="dba-empty">Archive unavailable.</div>';
  }
}

/**
 * Load public archive for a given user ID.
 */
export async function loadPublicDebateArchive(container: HTMLElement, userId: string): Promise<void> {
  _injectCSS();
  _isOwner = false;
  _entries = [];
  _filterCat = 'all';
  _filterResult = 'all';
  _filterSearch = '';

  container.innerHTML = '<div class="dba-loading">LOADING ARCHIVE…</div>';

  const { data, error } = await safeRpc<ArchiveEntry[]>('get_public_debate_archive', { p_user_id: userId });
  if (error) {
    container.innerHTML = '<div class="dba-empty">Archive unavailable.</div>';
    return;
  }
  _entries = (data ?? []) as ArchiveEntry[];
  _renderTable(container);
}
