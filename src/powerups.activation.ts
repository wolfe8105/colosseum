/**
 * THE MODERATOR — Power-Up Activation Bar
 * renderActivationBar, wireActivationBar.
 */

import { escapeHTML } from './config.ts';
import { CATALOG } from './powerups.types.ts';
import { activate } from './powerups.rpc.ts';
import type { PowerUpId, EquippedItem, ActivationCallbacks } from './powerups.types.ts';

export function renderActivationBar(equipped: EquippedItem[]): string {
  if (!equipped?.length) return '';

  const buttons = equipped.map(eq => {
    const cat = CATALOG[eq.power_up_id as PowerUpId];
    const isPassive = eq.power_up_id === 'multiplier_2x';
    return `
      <button class="powerup-activate-btn ${isPassive ? 'passive' : ''}"
        data-id="${eq.power_up_id}" data-slot="${eq.slot_number}"
        ${isPassive ? 'disabled title="Active — doubles staking payout"' : ''}
        style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;border:1px solid ${isPassive ? 'var(--mod-text-heading)44' : 'var(--mod-text-heading)66'};background:${isPassive ? 'var(--mod-text-heading)11' : 'rgba(15,15,26,0.9)'};color:${isPassive ? 'var(--mod-text-heading)' : 'var(--mod-text-on-accent)'};font-family:var(--mod-font-ui);font-size:12px;font-weight:600;cursor:${isPassive ? 'default' : 'pointer'};white-space:nowrap;transition:all 0.2s;">
        <span style="font-size:18px;">${escapeHTML(eq.icon ?? cat?.icon ?? '?')}</span>
        <span>${isPassive ? 'ACTIVE' : 'USE'}</span>
      </button>`;
  });

  return `
    <div id="powerup-activation-bar" style="display:flex;gap:8px;padding:8px 16px;overflow-x:auto;flex-shrink:0;border-top:1px solid var(--mod-accent-border);background:var(--mod-bg-card);">
      <div style="font-family:'Oswald',sans-serif;font-size:10px;color:var(--mod-text-heading);letter-spacing:1.5px;display:flex;align-items:center;margin-right:4px;text-transform:uppercase;white-space:nowrap;">POWER-UPS</div>
      ${buttons.join('')}
    </div>`;
}

export function wireActivationBar(debateId: string, callbacks: ActivationCallbacks): void {
  document.querySelectorAll('.powerup-activate-btn:not(.passive):not(.used)').forEach(btn => {
    btn.addEventListener('click', async () => {
      const el = btn as HTMLButtonElement;
      const powerUpId = el.dataset.id ?? '';
      el.disabled = true;
      el.style.opacity = '0.5';

      try {
        const result = await activate(debateId, powerUpId);
        if (!result.success) { return; }

        el.classList.add('used');
        el.style.background = 'rgba(46,204,113,0.1)';
        el.style.borderColor = 'rgba(46,204,113,0.3)';
        const label = el.querySelector('span:last-child');
        if (label) label.textContent = 'USED';

        if (powerUpId === 'silence') callbacks.onSilence?.();
        else if (powerUpId === 'shield') callbacks.onShield?.();
        else if (powerUpId === 'reveal') callbacks.onReveal?.();
      } catch {
        // swallow — finally restores button
      } finally {
        if (!el.classList.contains('used')) {
          el.disabled = false;
          el.style.opacity = '1';
        }
      }
    });
  });
}
