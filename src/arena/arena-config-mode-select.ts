// arena-config-mode-select.ts — Mode select + moderator picker bottom sheet
// Part of the arena-config-mode split

// LANDMINE [LM-CONFIGMODE-001]: Circular dep with arena-private-picker.ts
// arena-config-mode-select → arena-private-picker → arena-config-mode-select
// Pre-existing cycle (one of 37 known in src/arena/). Do not fix here.

import { getCurrentUser, getAvailableModerators } from '../auth.ts';
import { escapeHTML } from '../config.ts';
import { set_selectedModerator, set_selectedRuleset } from './arena-state.ts';
import type { AvailableModerator } from './arena-types-moderator.ts';
import { MODES } from './arena-constants.ts';
import { isPlaceholder, pushArenaState } from './arena-core.utils.ts';
import { enterQueue } from './arena-queue.ts';
import { maybeRoutePrivate } from './arena-private-picker.ts';
import { showCategoryPicker } from './arena-config-category.ts';

export function showModeSelect(): void {
  if (!getCurrentUser() && !isPlaceholder()) {
    window.location.href = 'moderator-plinko.html';
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'arena-mode-overlay';
  overlay.id = 'arena-mode-overlay';
  overlay.innerHTML = `
    <div class="arena-mode-backdrop" id="arena-mode-backdrop"></div>
    <div class="arena-mode-sheet">
      <div class="arena-mode-handle"></div>
      <div class="arena-mode-title">Choose Your Weapon</div>
      <div class="arena-mode-subtitle">Pick how you want to fight</div>
      ${Object.values(MODES).map(m => `
        <div class="arena-mode-card" data-mode="${m.id}">
          <div class="arena-mode-icon" style="background:${m.color}15; border: 1px solid ${m.color}30;">${m.icon}</div>
          <div class="arena-mode-info">
            <div class="arena-mode-name">${m.name}</div>
            <div class="arena-mode-desc">${m.desc}</div>
            <div class="arena-mode-avail" style="color:${m.color}">${m.available}</div>
          </div>
          <div class="arena-mode-arrow">\u2192</div>
        </div>
      `).join('')}
      <button class="arena-mode-cancel" id="arena-mode-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pushArenaState('modeSelect');

  // Wire mode cards
  overlay.querySelectorAll('.arena-mode-card').forEach((card) => {
    const cardEl = card as HTMLElement;
    cardEl.addEventListener('click', () => {
      const mode = cardEl.dataset.mode!;
      const topic = '';
      // Capture selected moderator
      const selOpt = overlay.querySelector('.mod-picker-opt.selected') as HTMLElement | null;
      if (selOpt) {
        const modType = selOpt.dataset.modType!;
        const modId = selOpt.dataset.modId!;
        const modName = selOpt.querySelector('.mod-picker-name')?.textContent || '';
        set_selectedModerator(modType === 'none' ? null : { type: modType as 'human' | 'ai', id: modId || null, name: modName });
      } else {
        set_selectedModerator(null);
      }
      closeModeSelect(true);
      if (mode === 'ai') {
        set_selectedRuleset('amplified');
        enterQueue(mode, topic);
      } else if (maybeRoutePrivate(mode, topic)) {
        // routed to private lobby sub-picker — nothing more to do
      } else {
        showCategoryPicker(mode, topic);
      }
    });
  });

  // Wire close
  document.getElementById('arena-mode-backdrop')?.addEventListener('click', () => closeModeSelect());
  document.getElementById('arena-mode-cancel')?.addEventListener('click', () => closeModeSelect());
}

export function closeModeSelect(forward?: boolean): void {
  const overlay = document.getElementById('arena-mode-overlay');
  if (overlay) {
    overlay.remove();
    if (forward) {
      history.replaceState({ arenaView: 'lobby' }, '');
    } else {
      history.back();
    }
  }
}

// Session 39: Moderator picker logic
export function wireModPicker(container: HTMLElement): void {
  container.querySelectorAll('.mod-picker-opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      container.querySelectorAll('.mod-picker-opt').forEach((o) => {
        o.classList.remove('selected');
        const check = o.querySelector('.mod-picker-check');
        if (check) check.textContent = '';
      });
      opt.classList.add('selected');
      const check = opt.querySelector('.mod-picker-check');
      if (check) check.textContent = '\u2713';
    });
  });
}

export async function loadAvailableModerators(overlay: HTMLElement): Promise<void> {
  const user = getCurrentUser();
  const excludeIds = user ? [user.id] : [];
  const mods = await getAvailableModerators(excludeIds);
  const container = overlay.querySelector('#mod-picker-humans') as HTMLElement | null;
  if (!container || !mods || mods.length === 0) return;

  container.replaceChildren();
  mods.forEach((m) => {
    const initial = escapeHTML(((m as AvailableModerator).display_name || (m as AvailableModerator).username || '?')[0].toUpperCase());
    const opt = document.createElement('div');
    opt.className = 'mod-picker-opt';
    opt.dataset.modType = 'human';
    opt.dataset.modId = (m as AvailableModerator).id;
    opt.innerHTML = `
      <div class="mod-picker-avatar">${initial}</div>
      <div class="mod-picker-info">
        <div class="mod-picker-name">${escapeHTML((m as AvailableModerator).display_name || (m as AvailableModerator).username)}</div>
        <div class="mod-picker-stats">Rating: ${Number((m as AvailableModerator).mod_rating).toFixed(0)} \u00B7 ${(m as AvailableModerator).mod_debates_total} debates \u00B7 ${Number((m as AvailableModerator).mod_approval_pct).toFixed(0)}% approval</div>
      </div>
      <div class="mod-picker-check"></div>
    `;
    opt.addEventListener('click', () => {
      overlay.querySelectorAll('.mod-picker-opt').forEach((o) => {
        o.classList.remove('selected');
        const check = o.querySelector('.mod-picker-check');
        if (check) check.textContent = '';
      });
      opt.classList.add('selected');
      const check = opt.querySelector('.mod-picker-check');
      if (check) check.textContent = '\u2713';
    });
    container.appendChild(opt);
  });
}
