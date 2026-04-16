// arena-config-category.ts — Category + rounds picker bottom sheet
// Part of the arena-config-mode split

import { set_selectedCategory, set_selectedWantMod } from './arena-state.ts';
import { QUEUE_CATEGORIES } from './arena-constants.ts';
import { pushArenaState } from './arena-core.utils.ts';
import { enterQueue } from './arena-queue.ts';
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
