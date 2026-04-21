/**
 * THE MODERATOR — Power-Up Visual Overlays
 * renderSilenceOverlay, renderRevealPopup, renderShieldIndicator,
 * removeShieldIndicator, hasMultiplier.
 *
 * LANDMINE [LM-PU-004]: Hardcoded hex #0f0f1a, #2a2a3e, #12122a in inline styles.
 */

import { escapeHTML } from './config.ts';
import { CATALOG } from './powerups.types.ts';
import type { PowerUpId, EquippedItem } from './powerups.types.ts';

export function renderSilenceOverlay(opponentName?: string): ReturnType<typeof setInterval> {
  const overlay = document.createElement('div');
  overlay.id = 'powerup-silence-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 16px;background:linear-gradient(135deg,var(--mod-accent-border),rgba(231,68,42,0.1));border-bottom:1px solid var(--mod-accent-border);z-index:200;animation:arenaFadeIn 0.3s ease;';
  overlay.innerHTML = `
    <span style="font-size:22px;">🤫</span>
    <span style="font-family:var(--mod-font-ui);font-size:14px;font-weight:600;color:var(--mod-text-heading);letter-spacing:1px;">${escapeHTML(opponentName ?? 'Opponent')} SILENCED</span>
    <span id="silence-countdown" style="font-family:'Oswald',sans-serif;font-size:18px;color:var(--mod-text-primary);min-width:30px;text-align:center;">10</span>
  `;
  document.body.appendChild(overlay);

  let remaining = 10;
  const timer = setInterval(() => {
    remaining--;
    const el = document.getElementById('silence-countdown');
    if (el) el.textContent = String(remaining);
    if (remaining <= 0) { clearInterval(timer); overlay.remove(); }
  }, 1000);

  return timer;
}

export function renderRevealPopup(equipped: EquippedItem[]): void {
  document.getElementById('powerup-reveal-popup')?.remove();

  const items = (equipped || []).map(eq => {
    const cat = CATALOG[eq.power_up_id as PowerUpId];
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--mod-bg-card);border:1px solid var(--mod-border-primary);border-radius:8px;">
        <span style="font-size:22px;">${escapeHTML(eq.icon ?? cat?.icon ?? '?')}</span>
        <span style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-primary);">${escapeHTML(eq.name ?? cat?.name ?? eq.power_up_id)}</span>
      </div>`;
  });

  const popup = document.createElement('div');
  popup.id = 'powerup-reveal-popup';
  popup.style.cssText = 'position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:var(--mod-bg-overlay);animation:arenaFadeIn 0.3s ease;';
  popup.innerHTML = `
    <div style="background:var(--mod-bg-card);border:1px solid var(--mod-text-heading)44;border-radius:14px;padding:20px;max-width:280px;width:90%;">
      <div style="font-family:'Oswald',sans-serif;font-size:14px;color:var(--mod-text-heading);letter-spacing:2px;text-align:center;margin-bottom:12px;">👁️ OPPONENT'S LOADOUT</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${items.length > 0 ? items.join('') : '<div style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-muted);text-align:center;">No power-ups equipped</div>'}
      </div>
      <button id="reveal-close-btn" style="display:block;width:100%;margin-top:14px;padding:10px;border-radius:10px;border:1px solid var(--mod-border-primary);background:none;color:var(--mod-text-muted);font-family:var(--mod-font-ui);font-size:13px;cursor:pointer;">DISMISS</button>
    </div>`;
  document.body.appendChild(popup);

  popup.addEventListener('click', (e) => {
    if (e.target === popup || (e.target as HTMLElement).id === 'reveal-close-btn') popup.remove();
  });
  setTimeout(() => popup.remove(), 8000);
}

export function renderShieldIndicator(): HTMLDivElement {
  const indicator = document.createElement('div');
  indicator.id = 'powerup-shield-indicator';
  indicator.style.cssText = 'position:fixed;top:0;right:16px;padding:6px 12px;background:var(--mod-accent-border);border:1px solid var(--mod-accent-border);border-radius:0 0 8px 8px;font-family:var(--mod-font-ui);font-size:11px;font-weight:600;color:var(--mod-text-heading);letter-spacing:1px;z-index:100;';
  indicator.textContent = '🛡️ SHIELD ACTIVE';
  document.body.appendChild(indicator);
  return indicator;
}

export function removeShieldIndicator(): void {
  document.getElementById('powerup-shield-indicator')?.remove();
}

export function hasMultiplier(equipped: EquippedItem[]): boolean {
  return (equipped || []).some(eq => eq.power_up_id === 'multiplier_2x');
}
