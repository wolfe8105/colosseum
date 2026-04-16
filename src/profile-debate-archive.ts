/**
 * THE MODERATOR — Profile Debate Archive (F-53)
 *
 * Spreadsheet-style table on the profile page.
 * Refactored: split into css, state, filter, render, picker, edit sub-modules.
 */

import { safeRpc } from './auth.rpc.ts';
import { injectCSS } from './profile-debate-archive.css.ts';
import { setEntries, setIsOwner, resetFilters } from './profile-debate-archive.state.ts';
import { renderTable } from './profile-debate-archive.render.ts';
import { loadAndRender } from './profile-debate-archive.edit.ts';
import type { ArchiveEntry } from './profile-debate-archive.types.ts';

export async function loadDebateArchive(container: HTMLElement, isOwner = false): Promise<void> {
  injectCSS();
  setIsOwner(isOwner);
  resetFilters();
  container.innerHTML = '<div class="dba-loading">LOADING ARCHIVE…</div>';

  if (isOwner) {
    await loadAndRender(container);
  } else {
    container.innerHTML = '<div class="dba-empty">Archive unavailable.</div>';
  }
}

export async function loadPublicDebateArchive(container: HTMLElement, userId: string): Promise<void> {
  injectCSS();
  setIsOwner(false);
  resetFilters();
  container.innerHTML = '<div class="dba-loading">LOADING ARCHIVE…</div>';

  const { data, error } = await safeRpc<ArchiveEntry[]>('get_public_debate_archive', { p_user_id: userId });
  if (error) {
    container.innerHTML = '<div class="dba-empty">Archive unavailable.</div>';
    return;
  }
  setEntries((data ?? []) as ArchiveEntry[]);
  renderTable(container);
}
