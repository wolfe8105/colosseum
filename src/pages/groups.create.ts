/**
 * THE MODERATOR — Groups Create Modal
 */

import { safeRpc } from '../auth.ts';
import { showToast } from '../config.ts';
import { currentUser, selectedEmoji, setSelectedEmoji } from './groups.state.ts';

let _openGroup: ((id: string) => void) | null = null;
export function setCreateOpenGroupCallback(fn: (id: string) => void): void { _openGroup = fn; }

export function openCreateModal(): void {
  if (!currentUser) { window.location.href = 'moderator-plinko.html'; return; }
  document.getElementById('create-modal')!.classList.add('open');
}

export function closeCreateModal(): void {
  document.getElementById('create-modal')!.classList.remove('open');
}

export function selectEmoji(el: HTMLElement): void {
  document.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  setSelectedEmoji(el.dataset.emoji ?? "");
}

export async function submitCreateGroup(): Promise<void> {
  const name = (document.getElementById('group-name') as HTMLInputElement).value.trim();
  if (!name || name.length < 2) { showToast('Group name must be at least 2 characters', 'error'); return; }
  const btn = document.getElementById('create-submit-btn') as HTMLButtonElement;
  btn.disabled = true; btn.textContent = 'CREATING…';
  try {
    const { data, error } = await safeRpc('create_group', {
      p_name:         name,
      p_description:  (document.getElementById('group-desc-input') as HTMLInputElement).value.trim() || null,
      p_category:     (document.getElementById('group-category') as HTMLSelectElement).value,
      p_is_public:    true,
      p_avatar_emoji: selectedEmoji,
    });
    if (error) throw error;
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    closeCreateModal();
    (document.getElementById('group-name') as HTMLInputElement).value       = '';
    (document.getElementById('group-desc-input') as HTMLInputElement).value = '';
    if (result.group_id && _openGroup) _openGroup(result.group_id);
  } catch (e) {
    showToast((e as Error).message || 'Could not create group', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'CREATE GROUP';
  }
}
