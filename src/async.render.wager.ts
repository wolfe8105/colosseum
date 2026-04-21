/**
 * THE MODERATOR — Async Module: Wager Picker
 *
 * _showWagerPicker, _hideWagerPicker — inline prediction wager UI.
 */

import { state } from './async.state.ts';
import { escapeHTML } from './config.ts';
import { getCurrentProfile } from './auth.ts';

const esc = escapeHTML;

let _activeWagerDebateId: string | null = null;

export function _showWagerPicker(debateId: string, side: string): void {
  // Remove any existing picker first
  _hideWagerPicker();

  const balance = getCurrentProfile()?.token_balance || 0;
  const pred = state.predictions.find((p) => p.debate_id === debateId);
  if (!pred) return;

  const sideLabel = side === 'a' ? esc(pred.p1) : esc(pred.p2);
  const safeDebateId = esc(debateId);
  const safeSide = side === 'a' ? 'a' : 'b';

  const quickAmounts = [10, 25, 50, 100, 250].filter(a => a <= Math.min(500, balance));

  const pickerHtml = `
    <div id="wager-picker" style="background:var(--mod-bg-card);border:1px solid var(--mod-accent-border);border-radius:10px;padding:14px;margin-top:8px;animation:fadeIn 0.15s ease-out;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-family:var(--mod-font-display);font-size:13px;color:var(--mod-accent);letter-spacing:1px;">WAGER ON ${esc(sideLabel.toUpperCase())}</div>
        <div style="font-size:11px;color:var(--mod-text-sub);">Balance: ${Number(balance)} tokens</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;">
        <input type="number" id="wager-amount-input" min="1" max="${Math.min(500, balance)}" placeholder="1–${Math.min(500, balance)}" style="flex:1;padding:8px 10px;background:var(--mod-bg-base);border:1px solid var(--mod-border-primary);border-radius:6px;color:var(--mod-text-primary);font-family:var(--mod-font-ui);font-size:14px;outline:none;-moz-appearance:textfield;" />
        ${quickAmounts.map(a => `<button data-action="wager-quick" data-amount="${a}" style="padding:6px 10px;background:var(--mod-bg-subtle);border:1px solid var(--mod-border-secondary);border-radius:6px;color:var(--mod-text-body);font-size:12px;font-family:var(--mod-font-ui);cursor:pointer;">${a}</button>`).join('')}
      </div>
      <div style="display:flex;gap:8px;">
        <button data-action="wager-confirm" data-id="${safeDebateId}" data-pick="${safeSide}" disabled style="flex:1;padding:10px;background:var(--mod-bar-accent);background-image:var(--mod-gloss);border:none;border-radius:8px;color:var(--mod-text-on-accent);font-family:var(--mod-font-ui);font-size:14px;font-weight:600;letter-spacing:1px;cursor:pointer;opacity:0.5;transition:all 0.2s;">CONFIRM WAGER</button>
        <button data-action="wager-cancel" style="padding:10px 16px;background:var(--mod-bg-subtle);border:1px solid var(--mod-border-secondary);border-radius:8px;color:var(--mod-text-sub);font-family:var(--mod-font-ui);font-size:13px;cursor:pointer;">✕</button>
      </div>
      ${balance < 1 ? '<div style="font-size:12px;color:var(--mod-accent);margin-top:8px;">You need at least 1 token to predict.</div>' : ''}
    </div>`;

  // Find the prediction card and append the picker
  const card = document.querySelector(`[data-action="predict"][data-id="${safeDebateId}"]`)?.closest('div[style*="background:var(--mod-bg-card)"]') as HTMLElement | null;
  if (!card) return;

  // Remove existing picker from any other card
  _activeWagerDebateId = debateId;

  const pickerEl = document.createElement('div');
  pickerEl.id = 'wager-picker-wrapper';
  pickerEl.innerHTML = pickerHtml;
  card.appendChild(pickerEl);

  // Focus the input
  const input = card.querySelector('#wager-amount-input') as HTMLInputElement | null;
  if (input) input.focus();
}

export function _hideWagerPicker(): void {
  _activeWagerDebateId = null;
  const existing = document.getElementById('wager-picker-wrapper');
  if (existing) existing.remove();
}
