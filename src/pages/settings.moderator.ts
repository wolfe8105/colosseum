/**
 * THE MODERATOR — Settings Moderator
 * loadModeratorSettings, moderator toggle event wiring.
 */

import { getCurrentProfile, toggleModerator, toggleModAvailable, updateModCategories } from '../auth.ts';
import { toast, getEl, setChecked } from './settings.helpers.ts';

export function loadModeratorSettings(): void {
  const profile = getCurrentProfile();
  if (!profile) return;
  const p = profile as Record<string, unknown>;

  const isMod = !!(p.is_moderator);
  const isAvail = !!(p.mod_available);

  setChecked('set-mod-enabled', isMod);
  setChecked('set-mod-available', isAvail);

  const availRow = getEl('mod-available-row');
  if (availRow) availRow.style.display = isMod ? 'flex' : 'none';
  const statsBlock = getEl('mod-stats');
  if (statsBlock) statsBlock.style.display = isMod ? 'block' : 'none';

  const cats = (p.mod_categories as string[]) ?? [];
  document.querySelectorAll<HTMLButtonElement>('.mod-cat-chip').forEach(chip => {
    const cat = chip.dataset.cat ?? '';
    chip.classList.toggle('selected', cats.includes(cat));
  });

  const dot = getEl('mod-dot');
  if (dot) dot.style.background = isAvail ? 'var(--success)' : 'var(--white-dim)';

  if (isMod) {
    const rating = getEl('mod-stat-rating');
    if (rating) rating.textContent = ((p.mod_rating as number) ?? 50).toFixed(1);
    const debates = getEl('mod-stat-debates');
    if (debates) debates.textContent = String((p.mod_debates_total as number) ?? 0);
    const rulings = getEl('mod-stat-rulings');
    if (rulings) rulings.textContent = String((p.mod_rulings_total as number) ?? 0);
    const approval = getEl('mod-stat-approval');
    if (approval) approval.textContent = ((p.mod_approval_pct as number) ?? 0).toFixed(0) + '%';
  }
}

export function wireModeratorToggles(): void {
  getEl<HTMLInputElement>('set-mod-enabled')?.addEventListener('change', async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const enabled = target.checked;
    target.disabled = true;
    try {
      const result = await toggleModerator(enabled);
      if (result?.error) {
        target.checked = !enabled;
        toast('❌ ' + result.error);
      } else {
        toast(enabled ? '⚖️ Moderator mode ON' : 'Moderator mode OFF');
        loadModeratorSettings();
      }
    } finally {
      target.disabled = false;
    }
  });

  getEl<HTMLInputElement>('set-mod-available')?.addEventListener('change', async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const available = target.checked;
    target.disabled = true;
    try {
      const result = await toggleModAvailable(available);
      if (result?.error) {
        target.checked = !available;
        toast('❌ ' + result.error);
      } else {
        const dot = getEl('mod-dot');
        if (dot) dot.style.background = available ? 'var(--success)' : 'var(--white-dim)';
        toast(available ? '🟢 Available to moderate' : '🔴 Offline');
      }
    } finally {
      target.disabled = false;
    }
  });

  document.querySelectorAll<HTMLButtonElement>('.mod-cat-chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      if (chip.disabled) return;
      chip.disabled = true;
      const cat = chip.dataset.cat ?? '';
      const isSelected = chip.classList.toggle('selected');
      const selected = Array.from(
        document.querySelectorAll<HTMLButtonElement>('.mod-cat-chip.selected')
      ).map(c => c.dataset.cat ?? '').filter(Boolean);

      const statusEl = getEl('mod-cat-status');
      if (statusEl) statusEl.textContent = 'Saving…';

      try {
        const result = await updateModCategories(selected);
        if (result?.error) {
          chip.classList.toggle('selected', !isSelected);
          if (statusEl) statusEl.textContent = '❌ ' + result.error;
          toast('❌ ' + result.error);
        } else {
          if (statusEl) statusEl.textContent = selected.length === 0
            ? 'Accepting all categories'
            : `${selected.length} categor${selected.length === 1 ? 'y' : 'ies'} selected`;
        }
      } finally {
        chip.disabled = false;
      }
    });
  });
}
