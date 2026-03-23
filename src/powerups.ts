/**
 * THE COLOSSEUM — Power-Up System (TypeScript)
 *
 * Runtime module (replaces colosseum-powerups.js).
 * Depends on: auth.ts (safeRpc), tiers.ts (getTier, getPowerUpSlots, getNextTier)
 *
 * Migration: Session 126 (Phase 2). Window bridge: Session 140.
 */

import { safeRpc } from './auth.ts';
import { getTier, getPowerUpSlots, getNextTier } from './tiers.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type PowerUpId = 'multiplier_2x' | 'silence' | 'shield' | 'reveal';

export interface PowerUpCatalogEntry {
  readonly name: string;
  readonly icon: string;
  readonly cost: number;
  readonly desc: string;
}

export interface PowerUpResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface InventoryItem {
  power_up_id: string;
  name?: string;
  icon?: string;
  quantity: number;
  [key: string]: unknown;
}

export interface EquippedItem {
  power_up_id: string;
  slot_number: number;
  name?: string;
  icon?: string;
  activated?: boolean;
  activated_at?: string | null;
  [key: string]: unknown;
}

export interface MyPowerUpsResult {
  success: boolean;
  inventory: InventoryItem[];
  equipped: EquippedItem[];
  questions_answered: number;
}

export interface ActivationCallbacks {
  onSilence?: () => void;
  onShield?: () => void;
  onReveal?: () => void;
}

// ============================================================
// STATIC CATALOG
// ============================================================

export const CATALOG: Readonly<Record<PowerUpId, PowerUpCatalogEntry>> = {
  multiplier_2x: { name: '2x Multiplier', icon: '⚡', cost: 15, desc: 'Double your staking payout if you win' },
  silence:       { name: 'Silence',        icon: '🤫', cost: 20, desc: 'Mute opponent for 10 seconds' },
  shield:        { name: 'Shield',         icon: '🛡️', cost: 25, desc: 'Block one reference challenge' },
  reveal:        { name: 'Reveal',         icon: '👁️', cost: 10, desc: "See opponent's equipped power-ups" },
} as const;

// ============================================================
// RPC FUNCTIONS
// ============================================================

/** Buy a power-up from the shop. Deducts token_balance. */
export async function buy(powerUpId: string, quantity = 1): Promise<PowerUpResult> {
  const result = await safeRpc<PowerUpResult>('buy_power_up', {
    p_power_up_id: powerUpId,
    p_quantity: quantity,
  });
  if (result.error) return { success: false, error: result.error.message ?? 'Purchase failed' };
  return result.data ?? { success: false, error: 'No response' };
}

/** Equip a power-up for a specific debate. */
export async function equip(debateId: string, powerUpId: string, slotNumber: number): Promise<PowerUpResult> {
  const result = await safeRpc<PowerUpResult>('equip_power_up', {
    p_debate_id: debateId,
    p_power_up_id: powerUpId,
    p_slot_number: slotNumber,
  });
  if (result.error) return { success: false, error: result.error.message ?? 'Equip failed' };
  return result.data ?? { success: false, error: 'No response' };
}

/** Activate a power-up during an active debate. Sets activated=true AND activated_at=now(). */
export async function activate(debateId: string, powerUpId: string): Promise<PowerUpResult> {
  const result = await safeRpc<PowerUpResult>('activate_power_up', {
    p_debate_id: debateId,
    p_power_up_id: powerUpId,
  });
  if (result.error) return { success: false, error: result.error.message ?? 'Activation failed' };
  return result.data ?? { success: false, error: 'No response' };
}

/** Get user's inventory + equipped power-ups for a debate. */
export async function getMyPowerUps(debateId: string | null = null): Promise<MyPowerUpsResult> {
  const empty: MyPowerUpsResult = { success: false, inventory: [], equipped: [], questions_answered: 0 };
  const params: Record<string, unknown> = {};
  if (debateId) params.p_debate_id = debateId;

  const result = await safeRpc<MyPowerUpsResult>('get_my_power_ups', params);
  if (result.error) return empty;
  return result.data ?? empty;
}

/** Reveal: fetch opponent's equipped power-ups for a debate. */
export async function getOpponentPowerUps(debateId: string): Promise<{ success: boolean; equipped: EquippedItem[] }> {
  const result = await safeRpc<{ success: boolean; equipped: EquippedItem[] }>('get_opponent_power_ups', {
    p_debate_id: debateId,
  });
  if (result.error) return { success: false, equipped: [] };
  return result.data ?? { success: false, equipped: [] };
}

// ============================================================
// RENDER: SHOP
// ============================================================

/** Render the power-up shop HTML. All data from CATALOG constant. */
export function renderShop(tokenBalance: number): string {
  const balance = tokenBalance || 0;
  const items = (Object.entries(CATALOG) as [PowerUpId, PowerUpCatalogEntry][]).map(([id, pu]) => {
    const canAfford = balance >= pu.cost;
    return `
      <div class="powerup-shop-item" style="display:flex;align-items:center;gap:12px;padding:12px;background:#1a1a2e;border:1px solid #2a2a3e;border-radius:8px;margin-bottom:8px;">
        <div style="font-size:28px;width:40px;text-align:center;">${pu.icon}</div>
        <div style="flex:1;">
          <div style="font-family:var(--mod-font-ui);font-size:15px;font-weight:600;color:var(--mod-text-primary);">${pu.name}</div>
          <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-muted);">${pu.desc}</div>
        </div>
        <button class="powerup-buy-btn" data-id="${id}" data-cost="${pu.cost}" ${canAfford ? '' : 'disabled'} style="padding:8px 14px;border:none;border-radius:6px;background:${canAfford ? 'linear-gradient(135deg,var(--mod-text-heading),#B8860B)' : '#2a2a3e'};color:${canAfford ? '#0f0f1a' : '#666'};font-family:var(--mod-font-ui);font-size:13px;font-weight:600;cursor:${canAfford ? 'pointer' : 'default'};white-space:nowrap;">${pu.cost} 🪙</button>
      </div>`;
  });

  return `
    <div class="powerup-shop" style="padding:4px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;color:var(--mod-text-heading);letter-spacing:1px;text-transform:uppercase;">POWER-UP SHOP</div>
        <div style="font-family:var(--mod-font-ui);font-size:12px;color:var(--mod-text-muted);">Balance: <span style="color:var(--mod-text-heading);font-weight:600;">${balance} 🪙</span></div>
      </div>
      ${items.join('')}
    </div>`;
}

// ============================================================
// RENDER: EQUIP LOADOUT
// ============================================================

/** Render the pre-debate power-up loadout panel. */
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

  // Build equipped map
  const equippedMap: Record<number, EquippedItem> = {};
  if (equipped?.length) {
    equipped.forEach(e => { equippedMap[e.slot_number] = e; });
  }

  // Build slot HTML
  const slots: string[] = [];
  for (let i = 1; i <= maxSlots; i++) {
    const eq = equippedMap[i];
    if (eq) {
      const cat = CATALOG[eq.power_up_id as PowerUpId];
      slots.push(`
        <div class="powerup-slot filled" data-slot="${i}" style="flex:1;min-width:60px;padding:10px 8px;background:var(--mod-text-heading)11;border:1px solid var(--mod-text-heading)44;border-radius:8px;text-align:center;cursor:default;">
          <div style="font-size:24px;">${eq.icon ?? cat?.icon ?? '?'}</div>
          <div style="font-family:var(--mod-font-ui);font-size:10px;color:var(--mod-text-heading);margin-top:4px;">${eq.name ?? cat?.name ?? ''}</div>
        </div>`);
    } else {
      slots.push(`
        <div class="powerup-slot empty" data-slot="${i}" style="flex:1;min-width:60px;padding:10px 8px;background:#0f0f1a;border:1px dashed #2a2a3e;border-radius:8px;text-align:center;cursor:pointer;">
          <div style="font-size:24px;opacity:0.3;">+</div>
          <div style="font-family:var(--mod-font-ui);font-size:10px;color:var(--mod-text-muted);margin-top:4px;">Slot ${i}</div>
        </div>`);
    }
  }

  // Build inventory picker
  const invItems = (inventory || []).filter(item => item.quantity > 0).map(item => {
    const cat = CATALOG[item.power_up_id as PowerUpId];
    return `
      <div class="powerup-inv-item" data-id="${item.power_up_id}" style="display:flex;align-items:center;gap:8px;padding:8px;background:#0f0f1a;border:1px solid #2a2a3e;border-radius:6px;cursor:pointer;margin-bottom:4px;">
        <span style="font-size:20px;">${item.icon ?? cat?.icon ?? '?'}</span>
        <span style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-primary);flex:1;">${item.name ?? cat?.name ?? ''}</span>
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

// ============================================================
// WIRE: LOADOUT INTERACTIVITY
// ============================================================

/** Wire empty slot clicks and inventory picker after inserting renderLoadout HTML. */
export function wireLoadout(debateId: string, onEquipped?: (result: PowerUpResult) => void): void {
  let selectedSlot: number | null = null;

  document.querySelectorAll('.powerup-slot.empty').forEach(slot => {
    slot.addEventListener('click', () => {
      selectedSlot = parseInt((slot as HTMLElement).dataset.slot ?? '0', 10);
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
        if (errorEl) {
          errorEl.textContent = result.error ?? 'Equip failed';
          errorEl.style.display = 'block';
        }
      }
    });
  });
}

// ============================================================
// RENDER: IN-DEBATE ACTIVATION BAR
// ============================================================

/** Render equipped power-ups as tappable buttons during debate. 2x Multiplier is passive. */
export function renderActivationBar(equipped: EquippedItem[]): string {
  if (!equipped?.length) return '';

  const buttons = equipped.map(eq => {
    const cat = CATALOG[eq.power_up_id as PowerUpId];
    const isPassive = eq.power_up_id === 'multiplier_2x';
    return `
      <button class="powerup-activate-btn ${isPassive ? 'passive' : ''}"
        data-id="${eq.power_up_id}" data-slot="${eq.slot_number}"
        ${isPassive ? 'disabled title="Active — doubles staking payout"' : ''}
        style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;border:1px solid ${isPassive ? 'var(--mod-text-heading)44' : 'var(--mod-text-heading)66'};background:${isPassive ? 'var(--mod-text-heading)11' : 'rgba(15,15,26,0.9)'};color:${isPassive ? 'var(--mod-text-heading)' : '#fff'};font-family:var(--mod-font-ui);font-size:12px;font-weight:600;cursor:${isPassive ? 'default' : 'pointer'};white-space:nowrap;transition:all 0.2s;">
        <span style="font-size:18px;">${eq.icon ?? cat?.icon ?? '?'}</span>
        <span>${isPassive ? 'ACTIVE' : 'USE'}</span>
      </button>`;
  });

  return `
    <div id="powerup-activation-bar" style="display:flex;gap:8px;padding:8px 16px;overflow-x:auto;flex-shrink:0;border-top:1px solid var(--mod-accent-border);background:var(--mod-bg-card);">
      <div style="font-family:'Oswald',sans-serif;font-size:10px;color:var(--mod-text-heading);letter-spacing:1.5px;display:flex;align-items:center;margin-right:4px;text-transform:uppercase;white-space:nowrap;">POWER-UPS</div>
      ${buttons.join('')}
    </div>`;
}

// ============================================================
// WIRE: ACTIVATION BAR
// ============================================================

/** Wire click handlers on activation buttons. */
export function wireActivationBar(debateId: string, callbacks: ActivationCallbacks): void {
  document.querySelectorAll('.powerup-activate-btn:not(.passive):not(.used)').forEach(btn => {
    btn.addEventListener('click', async () => {
      const el = btn as HTMLButtonElement;
      const powerUpId = el.dataset.id ?? '';

      el.disabled = true;
      el.style.opacity = '0.5';

      const result = await activate(debateId, powerUpId);

      if (!result.success) {
        el.disabled = false;
        el.style.opacity = '1';
        return;
      }

      el.classList.add('used');
      el.style.background = 'rgba(46,204,113,0.1)';
      el.style.borderColor = 'rgba(46,204,113,0.3)';
      const label = el.querySelector('span:last-child');
      if (label) label.textContent = 'USED';

      if (powerUpId === 'silence') callbacks.onSilence?.();
      else if (powerUpId === 'shield') callbacks.onShield?.();
      else if (powerUpId === 'reveal') callbacks.onReveal?.();
    });
  });
}

// ============================================================
// VISUAL EFFECTS
// ============================================================

/** Render silence countdown overlay. Returns the interval ID for cleanup. */
export function renderSilenceOverlay(opponentName?: string): ReturnType<typeof setInterval> {
  const overlay = document.createElement('div');
  overlay.id = 'powerup-silence-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 16px;background:linear-gradient(135deg,var(--mod-accent-border),rgba(231,68,42,0.1));border-bottom:1px solid var(--mod-accent-border);z-index:200;animation:arenaFadeIn 0.3s ease;';
  overlay.innerHTML = `
    <span style="font-size:22px;">🤫</span>
    <span style="font-family:var(--mod-font-ui);font-size:14px;font-weight:600;color:var(--mod-text-heading);letter-spacing:1px;">${opponentName ?? 'Opponent'} SILENCED</span>
    <span id="silence-countdown" style="font-family:'Oswald',sans-serif;font-size:18px;color:var(--mod-text-primary);min-width:30px;text-align:center;">10</span>
  `;
  document.body.appendChild(overlay);

  let remaining = 10;
  const timer = setInterval(() => {
    remaining--;
    const el = document.getElementById('silence-countdown');
    if (el) el.textContent = String(remaining);
    if (remaining <= 0) {
      clearInterval(timer);
      overlay.remove();
    }
  }, 1000);

  return timer;
}

/** Render reveal popup showing opponent's equipped power-ups. */
export function renderRevealPopup(equipped: EquippedItem[]): void {
  document.getElementById('powerup-reveal-popup')?.remove();

  const items = (equipped || []).map(eq => {
    const cat = CATALOG[eq.power_up_id as PowerUpId];
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px;background:#0f0f1a;border:1px solid #2a2a3e;border-radius:8px;">
        <span style="font-size:22px;">${eq.icon ?? cat?.icon ?? '?'}</span>
        <span style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-primary);">${eq.name ?? cat?.name ?? eq.power_up_id}</span>
      </div>`;
  });

  const popup = document.createElement('div');
  popup.id = 'powerup-reveal-popup';
  popup.style.cssText = 'position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);animation:arenaFadeIn 0.3s ease;';
  popup.innerHTML = `
    <div style="background:#12122a;border:1px solid var(--mod-text-heading)44;border-radius:14px;padding:20px;max-width:280px;width:90%;">
      <div style="font-family:'Oswald',sans-serif;font-size:14px;color:var(--mod-text-heading);letter-spacing:2px;text-align:center;margin-bottom:12px;">👁️ OPPONENT'S LOADOUT</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${items.length > 0 ? items.join('') : '<div style="font-family:var(--mod-font-ui);font-size:13px;color:var(--mod-text-muted);text-align:center;">No power-ups equipped</div>'}
      </div>
      <button id="reveal-close-btn" style="display:block;width:100%;margin-top:14px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:none;color:var(--mod-text-muted);font-family:var(--mod-font-ui);font-size:13px;cursor:pointer;">DISMISS</button>
    </div>
  `;
  document.body.appendChild(popup);

  popup.addEventListener('click', (e) => {
    if (e.target === popup || (e.target as HTMLElement).id === 'reveal-close-btn') popup.remove();
  });

  setTimeout(() => popup.remove(), 8000);
}

/** Render shield active indicator badge. Returns the element for cleanup. */
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

/** Check if 2x multiplier is in the equipped list. */
export function hasMultiplier(equipped: EquippedItem[]): boolean {
  return (equipped || []).some(eq => eq.power_up_id === 'multiplier_2x');
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

const powerups = {
  CATALOG,
  buy,
  equip,
  activate,
  getMyPowerUps,
  getOpponentPowerUps,
  renderShop,
  renderLoadout,
  wireLoadout,
  renderActivationBar,
  wireActivationBar,
  renderSilenceOverlay,
  renderRevealPopup,
  renderShieldIndicator,
  removeShieldIndicator,
  hasMultiplier,
} as const;

export default powerups;
