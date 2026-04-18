/**
 * THE MODERATOR — Profile Debate Archive Edit
 * showEditSheet, toggleHide, removeEntry, loadAndRender.
 */

import { safeRpc } from './auth.rpc.ts';
import { escapeHTML, showToast } from './config.ts';
import { setEntries } from './profile-debate-archive.state.ts';
import { renderTable } from './profile-debate-archive.render.ts';
import type { ArchiveEntry } from './profile-debate-archive.types.ts';

export async function loadAndRender(container: HTMLElement): Promise<void> {
  const { data, error } = await safeRpc<ArchiveEntry[]>('get_my_debate_archive', {});
  if (error) {
    container.innerHTML = '<div class="dba-empty">Could not load archive.</div>';
    return;
  }
  setEntries((data ?? []) as ArchiveEntry[]);
  renderTable(container);
}

export function showEditSheet(entry: ArchiveEntry, container: HTMLElement): void {
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

  // LANDMINE [LM-DBA-002]: Save button disabled before RPC but re-enabled only on error path.
  // Success path calls overlay.remove() — button is removed from DOM without explicit re-enable.
  // Follows disable-button-no-finally pattern.
  overlay.querySelector('#dba-edit-save')?.addEventListener('click', async () => {
    const name = (overlay.querySelector<HTMLInputElement>('#dba-edit-name')!).value.trim() || null;
    const desc = (overlay.querySelector<HTMLInputElement>('#dba-edit-desc')!).value.trim() || null;
    const hide = (overlay.querySelector<HTMLInputElement>('#dba-edit-hide')!).checked;

    const saveBtn = overlay.querySelector<HTMLButtonElement>('#dba-edit-save')!;
    saveBtn.disabled = true;
    saveBtn.textContent = '…';

    try {
      const { error } = await safeRpc('update_archive_entry', {
        p_entry_id: entry.entry_id,
        p_custom_name: name,
        p_custom_desc: desc,
        p_hide_from_public: hide,
      });

      if (error) { showToast('Could not save', 'error'); return; }
      overlay.remove();
      showToast('Saved', 'success');
      await loadAndRender(container);
    } finally {
      // M-DBA-1: always re-enable save button (overlay.remove() may not have run on error/throw)
      if (overlay.isConnected) { saveBtn.disabled = false; saveBtn.textContent = 'SAVE'; }
    }
  });
}

export async function toggleHide(entry: ArchiveEntry, container: HTMLElement): Promise<void> {
  const newHide = !entry.hide_from_public;
  const { error } = await safeRpc('update_archive_entry', {
    p_entry_id: entry.entry_id,
    p_hide_from_public: newHide,
  });
  if (error) { showToast('Could not update', 'error'); return; }
  showToast(newHide ? 'Hidden from public' : 'Now visible', 'info');
  await loadAndRender(container);
}

export async function removeEntry(entry: ArchiveEntry, container: HTMLElement): Promise<void> {
  if (!confirm('Remove this debate from your archive?')) return;
  const { error } = await safeRpc('remove_from_archive', { p_entry_id: entry.entry_id });
  if (error) { showToast('Could not remove', 'error'); return; }
  showToast('Removed from archive', 'info');
  await loadAndRender(container);
}
