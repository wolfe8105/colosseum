/**
 * THE MODERATOR — Profile Debate Archive Picker
 * showAddPicker — bottom sheet for adding a debate to the archive.
 */

import { safeRpc } from './auth.core.ts';
import { escapeHTML, showToast } from './config.ts';
import { loadAndRender } from './profile-debate-archive.edit.ts';
import type { RecentDebate } from './profile-debate-archive.types.ts';

export async function showAddPicker(container: HTMLElement): Promise<void> {
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
      await loadAndRender(container);
    });
  });
}
