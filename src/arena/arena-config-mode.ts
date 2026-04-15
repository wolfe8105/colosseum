// arena-config-mode.ts — Mode select, moderator picker, category picker
// Part of the arena.ts monolith split

import { safeRpc, getCurrentUser, getAvailableModerators } from '../auth.ts';
import { escapeHTML } from '../config.ts';
import {
  selectedModerator, selectedCategory, selectedWantMod,
  set_selectedModerator, set_selectedCategory, set_selectedWantMod,
  set_selectedRuleset,
} from './arena-state.ts';
import type { DebateMode } from './arena-types.ts';
import type { AvailableModerator } from './arena-types-moderator.ts';
import { MODES, QUEUE_CATEGORIES } from './arena-constants.ts';
import { isPlaceholder, pushArenaState } from './arena-core.ts';
import { enterQueue } from './arena-queue.ts';
import { maybeRoutePrivate } from './arena-private-picker.ts';
import { roundPickerCSS, roundPickerHTML, wireRoundPicker } from './arena-config-settings.ts';

// ============================================================
// MODE SELECT
// ============================================================

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
      <div class="arena-topic-section">
        <div class="arena-topic-label">Topic (optional)</div>
        <input class="arena-topic-input" id="arena-topic-input" type="text" placeholder="e.g. Is AI going to take all our jobs?" maxlength="200">
      </div>
      <div class="mod-picker-section" id="mod-picker-section">
        <div class="mod-picker-label">Moderator (optional)</div>
        <div class="mod-picker-opts" id="mod-picker-opts">
          <div class="mod-picker-opt selected" data-mod-type="none" data-mod-id="">
            <div class="mod-picker-avatar">\u2014</div>
            <div class="mod-picker-info">
              <div class="mod-picker-name">No Moderator</div>
              <div class="mod-picker-stats">Debate without moderation</div>
            </div>
            <div class="mod-picker-check">\u2713</div>
          </div>
          <div class="mod-picker-opt" data-mod-type="ai" data-mod-id="">
            <div class="mod-picker-avatar">\uD83E\uDD16</div>
            <div class="mod-picker-info">
              <div class="mod-picker-name">AI Moderator</div>
              <div class="mod-picker-stats">Instant rulings, always available</div>
            </div>
            <div class="mod-picker-check"></div>
          </div>
        </div>
        <div id="mod-picker-humans" style="margin-top:6px;"></div>
      </div>
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
      const topic = (document.getElementById('arena-topic-input') as HTMLInputElement | null)?.value?.trim() || '';
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

  // Wire mod picker selection
  wireModPicker(overlay);

  // Load available human moderators
  void loadAvailableModerators(overlay);

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
    const initial = ((m as AvailableModerator).display_name || (m as AvailableModerator).username || '?')[0].toUpperCase();
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

// ============================================================
// CATEGORY PICKER
// ============================================================

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
      <label id="arena-want-mod-row" style="display:flex;align-items:center;gap:10px;padding:12px 4px;cursor:pointer;user-select:none;">
        <input type="checkbox" id="arena-want-mod-toggle" style="width:18px;height:18px;accent-color:var(--mod-accent-primary);cursor:pointer;">
        <span style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-body);">🧑‍⚖️ Request a moderator for this debate</span>
      </label>
      <button class="arena-cat-cancel" id="arena-cat-cancel">Back</button>
    </div>
  `;
  document.body.appendChild(overlay);
  pushArenaState('categoryPicker');
  wireRoundPicker(overlay);

  // Wire category buttons
  overlay.querySelectorAll('.arena-cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      set_selectedCategory((btn as HTMLElement).dataset.cat ?? null);
      set_selectedWantMod((document.getElementById('arena-want-mod-toggle') as HTMLInputElement | null)?.checked ?? false);
      overlay.remove();
      enterQueue(mode, topic);
    });
  });

  // Wire "any" button
  document.getElementById('arena-cat-any')?.addEventListener('click', () => {
    set_selectedCategory(null);
    set_selectedWantMod((document.getElementById('arena-want-mod-toggle') as HTMLInputElement | null)?.checked ?? false);
    overlay.remove();
    enterQueue(mode, topic);
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
