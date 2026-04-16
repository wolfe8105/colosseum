/**
 * THE MODERATOR — Power-Up Loadout Render + Wire
 * renderLoadout, wireLoadout.
 *
 * LANDMINE [LM-PU-002]: Hardcoded hex colors in inline styles — #1a1a2e, #2a2a3e, #0f0f1a.
 * LANDMINE [LM-PU-003]: wireLoadout queries .powerup-slot globally — breaks if multiple
 * loadout panels exist on the page simultaneously.
 */

import { escapeHTML } from './config.ts';
import { getTier, getPowerUpSlots, getNextTier } from './tiers.ts';
import { CATALOG } from './powerups.types.ts';
import { equip } from './powerups.rpc.ts';
import type { PowerUpId, InventoryItem, EquippedItem, PowerUpResult } from './powerups.types.ts';

export function renderLoadout(
  inventory: InventoryItem[],
  equipped: EquippedItem[],
  questionsAnswered: number,
  _debateId: string
): string {
  const maxSlots = getPowerUpSlots(questionsAnswered || 0);
  const tier = getTier(questionsAnswered || 0);

  if (maxSlots === 0) {
    const next = getNextTier(questionsAnswered || 0);
    const remaining = next ? next.questionsNeeded : 0;
    return `
      <div class="powerup-loadout" style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:10px;padding:16px;margin:12px 0;opacity:0.7;">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;color:#8a879a;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">POWER-UPS 🔒</div>
        <div style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-muted);">Answer ${remaining} more questions to unlock power-up slots.</div>
      </div>`;
  }

  const equippedMap: Record<number, EquippedItem> = {};
  if (equipped?.length) equipped.forEach(e => { equippedMap[e.slot_number] = e; });

  const slots: string[] = [];
  for (let i = 1; i <= maxSlots; i++) {
    const eq = equippedMap[i];
    if (eq) {
      const cat = CATALOG[eq.power_up_id as PowerUpId];
      slots.push(`
        <div class="powerup-slot filled" data-slot="${i}" style="flex:1;min-width:60px;padding:10px 8px;background:var(--mod-text-heading)11;border:1px solid var(--mod-text-heading)44;border-radius:8px;text-align:center;cursor:default;">
          <div style="font-size:24px;">${escapeHTML(eq.icon ?? cat?.icon ?? '?')}</div>
          <div style="font-family:var(--mod-font-ui);font-size:10px;color:var(--mod-text-heading);margin-top:4px;">${escapeHTML(eq.name ?? cat?.name ?? '')}</div>
        </div>`);
    } else {
      slots.push(`
        <div class="powerup-slot empty" data-slot="${i}" style="flex:1;min-width:60px;padding:10px 8px;background:#0f0f1a;border:1px dashed #2a2a3e;border-radius:8px;text-align:center;cursor:pointer;">
          <div style="font-size:24px;opacity:0.3;">+</div>
          <div style="font-family:var(--mod-font-ui);font-size:10px;color:var(--mod-text-muted);margin-top:4px;">Slot ${i}</div>
        </div>`);
    }
  }

  const invItems = (inventory || []).filter(item => item.quantity > 0).map(item => {
    const cat = CATALOG[item.power_up_id as PowerUpId];
    return `
      <div class="powerup-inv-item" data-id="${item.power_up_id}" style="display:flex;align-items:center;gap:8px;padding:8px;background:#0f0f1a;border:1px solid #2a2a3e;border-radius:6px;cursor:pointer;margin-bottom:4px;">
        <span style="font-size:20px;">${escapeHTML(item.icon ?? cat?.icon ?? '?')}</span>
        <span style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-primary);flex:1;">${escapeHTML(item.name ?? cat?.name ?? '')}</span>
        <span style="font-family:var(--mod-font-ui);font-size:11px;color:var(--mod-text-muted);">x${item.quantity}</span>
      </div>`;
  });

  return `
    <div class="powerup-loadout" style="background:#1a1a2e;border:1px solid #2a2a3e;border-radius:10px;padding:16px;margin:12px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;color:var(--mod-text-heading);letter-spacing:1px;text-transform:uppercase;">POWER-UPS</div>
        <div style="font-family:var(--mod-font-ui);font-size:11px;color:var(--mod-text-muted);">${tier.icon} ${tier.name} · ${maxSlots} slot${maxSlots !== 1 ? 's' : ''}</div>
      </div>
      <div class="powerup-slots" style="display:flex;gap:8px;margin-bottom:8px;">${slots.join('')}</div>
      <div id="powerup-inventory-picker" style="display:none;margin-top:8px;">
        <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-muted);margin-bottom:6px;">Choose a power-up:</div>
        ${invItems.length > 0 ? invItems.join('') : '<div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-muted);">No power-ups owned. <a href="#" class="powerup-open-shop" style="color:var(--mod-text-heading);text-decoration:none;">Buy some →</a></div>'}
      </div>
      <div id="powerup-equip-error" style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-accent);margin-top:4px;display:none;"></div>
    </div>`;
}

export function wireLoadout(debateId: string, onEquipped?: (result: PowerUpResult) => void): void {
  let selectedSlot: number | null = null;

  document.querySelectorAll('.powerup-slot.empty').forEach(slot => {
    slot.addEventListener('click', () => {
      selectedSlot = Number.parseInt((slot as HTMLElement).dataset.slot ?? '0', 10);
      const picker = document.getElementById('powerup-inventory-picker');
      if (picker) picker.style.display = 'block';
      document.querySelectorAll('.powerup-slot').forEach(s => {
        (s as HTMLElement).style.borderColor = s === slot ? 'var(--mod-text-heading)' : (s.classList.contains('filled') ? 'var(--mod-text-heading)44' : '#2a2a3e');
      });
    });
  });

  document.querySelectorAll('.powerup-inv-item').forEach(item => {
    item.addEventListener('click', async () => {
      if (selectedSlot === null) return;
      const powerUpId = (item as HTMLElement).dataset.id ?? '';
      const errorEl = document.getElementById('powerup-equip-error');
      (item as HTMLElement).style.opacity = '0.5';
      (item as HTMLElement).style.pointerEvents = 'none';
      const result = await equip(debateId, powerUpId, selectedSlot);
      if (result.success) {
        if (errorEl) errorEl.style.display = 'none';
        if (onEquipped) onEquipped(result);
      } else {
        (item as HTMLElement).style.opacity = '1';
        (item as HTMLElement).style.pointerEvents = 'auto';
        if (errorEl) { errorEl.textContent = result.error ?? 'Equip failed'; errorEl.style.display = 'block'; }
      }
    });
  });
}
