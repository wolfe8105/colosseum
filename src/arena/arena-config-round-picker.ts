// arena-config-round-picker.ts — Standalone round picker (CSS, HTML, wiring)
// Extracted from arena-config-settings.ts to break arena-config-mode ↔ arena-config-settings cycle.
// Zero dependencies on arena-config-mode.ts or arena-config-settings.ts.
// LANDMINE [LM-PICKER-001]: Any import added here must not re-introduce the cycle.

import { DEBATE } from '../config.ts';
import { set_selectedRounds } from './arena-state.ts';
import { ROUND_OPTIONS } from './arena-constants.ts';

export function roundPickerCSS(): string {
  return `
    .arena-round-picker { margin-bottom:12px; }
    .arena-round-label { font-family:var(--mod-font-ui); font-size:11px; font-weight:600; letter-spacing:2px; color:var(--mod-text-muted); text-transform:uppercase; margin-bottom:8px; }
    .arena-round-row { display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; }
    .arena-round-btn { display:flex; flex-direction:column; align-items:center; gap:2px; padding:10px 4px; border-radius:var(--mod-radius-md); border:1px solid var(--mod-border-primary); background:var(--mod-bg-card); cursor:pointer; transition:all 0.15s; }
    .arena-round-btn:active, .arena-round-btn.selected { border-color:var(--mod-accent); background:var(--mod-accent-muted); }
    .arena-round-count { font-family:var(--mod-font-ui); font-size:14px; font-weight:700; color:var(--mod-text-primary); }
    .arena-round-time { font-family:var(--mod-font-ui); font-size:10px; color:var(--mod-text-muted); }
  `;
}

export function roundPickerHTML(): string {
  return `
    <div class="arena-round-picker">
      <div class="arena-round-label">Rounds</div>
      <div class="arena-round-row">
        ${ROUND_OPTIONS.map(o => `
          <button class="arena-round-btn${o.rounds === DEBATE.defaultRounds ? ' selected' : ''}" data-rounds="${o.rounds}">
            <span class="arena-round-count">${o.rounds}</span>
            <span class="arena-round-time">${o.time}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

export function wireRoundPicker(container: HTMLElement): void {
  set_selectedRounds(DEBATE.defaultRounds);
  container.querySelectorAll('.arena-round-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.arena-round-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      set_selectedRounds(parseInt((btn as HTMLElement).dataset.rounds || '4', 10));
    });
  });
}
