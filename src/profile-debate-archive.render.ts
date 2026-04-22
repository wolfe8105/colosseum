/**
 * THE MODERATOR — Profile Debate Archive Render
 * renderTable, wireTable — build and wire the archive table DOM.
 */

import { escapeHTML } from './config.ts';
import { entries, isOwner, filterSearch, filterResult, filterCat, setFilterSearch, setFilterResult, setFilterCat } from './profile-debate-archive.state.ts';
import { filtered, archiveUrl } from './profile-debate-archive.filter.ts';
import { showAddPicker } from './profile-debate-archive.picker.ts';
import { showEditSheet, toggleHide, removeEntry } from './profile-debate-archive.edit.ts';

export function renderTable(container: HTMLElement): void {
  const esc = escapeHTML;
  const rows = filtered();
  const cats = [...new Set(entries.map(e => e.category ?? 'general'))];

  let html = `
    <div class="dba-header">
      <div class="dba-title">⚔️ Debate Archive</div>
      ${isOwner ? `<button class="dba-add-btn" id="dba-add-btn">+ ADD</button>` : ''}
    </div>
    <div class="dba-filters" id="dba-filters">
      <input class="dba-search" id="dba-search" placeholder="Search topic / opponent…" value="${esc(filterSearch)}">
      <div class="dba-chip ${filterResult === 'all' ? 'active' : ''}" data-result="all">ALL</div>
      <div class="dba-chip ${filterResult === 'win' ? 'active' : ''}" data-result="win">W</div>
      <div class="dba-chip ${filterResult === 'loss' ? 'active' : ''}" data-result="loss">L</div>
      ${cats.map(c => `<div class="dba-chip ${filterCat === c ? 'active' : ''}" data-cat="${esc(c)}">${esc(c.toUpperCase())}</div>`).join('')}
      ${cats.length > 0 ? `<div class="dba-chip ${filterCat === 'all' ? 'active' : ''}" data-cat="all">ALL CATS</div>` : ''}
    </div>`;

  if (rows.length === 0) {
    html += `
      <div class="dba-empty">
        <div class="dba-empty-icon">📭</div>
        ${entries.length === 0
          ? (isOwner ? 'No debates added yet.<br>Tap <strong>+ ADD</strong> to curate your archive.' : 'No debates in this archive.')
          : 'No debates match your filters.'}
      </div>`;
  } else {
    html += `
      <div class="dba-table-wrap">
        <table class="dba-table">
          <thead>
            <tr>
              <th>NAME / TOPIC</th><th>VS</th><th>DATE</th><th>RESULT</th><th>SCORE</th><th>CAT</th>
              ${isOwner ? '<th></th>' : ''}
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
      const hiddenFlag = (isOwner && e.hide_from_public) ? '<span class="dba-hidden-badge">🔒</span>' : '';

      html += `
        <tr class="dba-row" data-entry="${esc(e.entry_id)}" data-url="${esc(archiveUrl(e))}">
          <td class="dba-name">
            <div class="dba-name-main">${topicLabel}${hiddenFlag}</div>
            ${descLabel ? `<div class="dba-name-desc">${descLabel}</div>` : ''}
          </td>
          <td>${oppLabel}</td>
          <td style="white-space:nowrap">${date}</td>
          <td><span class="dba-badge ${result}">${resultLabel}</span></td>
          <td class="dba-score">${myS}–${oppS}</td>
          <td><span class="dba-cat">${catLabel}</span></td>
          ${isOwner ? `
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
  wireTable(container);
}

function wireTable(container: HTMLElement): void {
  const searchEl = container.querySelector<HTMLInputElement>('#dba-search');
  searchEl?.addEventListener('input', () => {
    setFilterSearch(searchEl.value);
    renderTable(container);
  });

  container.querySelectorAll<HTMLElement>('.dba-chip[data-result]').forEach(chip => {
    chip.addEventListener('click', () => { setFilterResult(chip.dataset.result!); renderTable(container); });
  });
  container.querySelectorAll<HTMLElement>('.dba-chip[data-cat]').forEach(chip => {
    chip.addEventListener('click', () => { setFilterCat(chip.dataset.cat!); renderTable(container); });
  });

  container.querySelectorAll<HTMLElement>('.dba-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.dba-actions')) return;
      const url = row.dataset.url;
      if (url) import('./arena/arena-ads.ts').then(m => m.showAdInterstitial(() => window.open(url, '_blank'))).catch(() => window.open(url, '_blank'));
    });
  });

  container.querySelector('#dba-add-btn')?.addEventListener('click', () => { void showAddPicker(container); });

  container.querySelectorAll<HTMLElement>('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action!;
      const entryId = btn.dataset.entry!;
      const entry = entries.find(x => x.entry_id === entryId);
      if (!entry) return;
      if (action === 'edit') showEditSheet(entry, container);
      else if (action === 'toggle-hide') void toggleHide(entry, container);
      else if (action === 'remove') void removeEntry(entry, container);
    });
  });
}
