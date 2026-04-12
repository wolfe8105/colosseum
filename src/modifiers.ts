/**
 * THE MODERATOR — F-57 Modifier & Power-Up System (Phase 1)
 * Session 267 | April 12, 2026
 *
 * Phase 1 scope: catalog, buy, socket, equip, inventory reads.
 * Phase 2 (next session): scoring integration in score_debate_comment.
 *
 * Depends on: auth.ts (safeRpc), config.ts (escapeHTML, showToast)
 */

import { safeRpc } from './auth.ts';
import { escapeHTML, showToast } from './config.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type ModifierTiming = 'end_of_debate' | 'in_debate';

export type ModifierCategory =
  | 'token' | 'point' | 'reference' | 'elo_xp' | 'crowd' | 'survival'
  | 'self_mult' | 'self_flat' | 'opponent_debuff' | 'cite_triggered'
  | 'conditional' | 'special';

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';

export interface ModifierEffect {
  id: string;
  effect_num: number;
  name: string;
  description: string;
  category: ModifierCategory;
  timing: ModifierTiming;
  tier_gate: RarityTier;
  mod_cost: number;
  pu_cost: number;
}

export interface OwnedModifier {
  modifier_id: string;
  effect_id: string;
  name: string;
  description: string;
  category: ModifierCategory;
  timing: ModifierTiming;
  tier_gate: RarityTier;
  acquired_at: string;
  acquisition_type: 'purchase' | 'drop' | 'reward';
}

export interface PowerUpStock {
  effect_id: string;
  name: string;
  description: string;
  category: ModifierCategory;
  timing: ModifierTiming;
  tier_gate: RarityTier;
  quantity: number;
  pu_cost: number;
}

export interface EquippedLoadoutEntry {
  effect_id: string;
  name: string;
  description: string;
  category: ModifierCategory;
  timing: ModifierTiming;
  consumed: boolean;
  equipped_at: string;
}

export interface UserInventory {
  unsocketed_modifiers: OwnedModifier[];
  powerup_stock: PowerUpStock[];
  equipped_loadout: EquippedLoadoutEntry[];
}

// ============================================================
// CATALOG CACHE (60-min TTL, same pattern as app-config.ts)
// ============================================================

let _catalogCache: ModifierEffect[] | null = null;
let _catalogFetchedAt = 0;
const CATALOG_TTL_MS = 60 * 60 * 1000;

export async function getModifierCatalog(): Promise<ModifierEffect[]> {
  const now = Date.now();
  if (_catalogCache && now - _catalogFetchedAt < CATALOG_TTL_MS) {
    return _catalogCache;
  }

  const result = await safeRpc('get_modifier_catalog');
  if (result.error || !Array.isArray(result.data)) {
    console.error('[Modifiers] catalog fetch failed:', result.error);
    return _catalogCache ?? [];
  }

  _catalogCache = result.data as ModifierEffect[];
  _catalogFetchedAt = now;
  return _catalogCache;
}

/** Get a single effect by id. Hits catalog cache. */
export async function getEffect(effectId: string): Promise<ModifierEffect | null> {
  const catalog = await getModifierCatalog();
  return catalog.find(e => e.id === effectId) ?? null;
}

/** Filter catalog by timing bucket. */
export async function getEndOfDebateEffects(): Promise<ModifierEffect[]> {
  const catalog = await getModifierCatalog();
  return catalog.filter(e => e.timing === 'end_of_debate');
}

export async function getInDebateEffects(): Promise<ModifierEffect[]> {
  const catalog = await getModifierCatalog();
  return catalog.filter(e => e.timing === 'in_debate');
}

// ============================================================
// BUY
// ============================================================

/**
 * Purchase a permanent modifier (one item per call).
 * Returns modifier_id on success.
 */
export async function buyModifier(effectId: string): Promise<{
  success: boolean;
  modifier_id?: string;
  cost?: number;
  error?: string;
}> {
  const result = await safeRpc('buy_modifier', { p_effect_id: effectId });
  if (result.error) {
    return { success: false, error: result.error.message ?? String(result.error) };
  }
  return result.data as { success: boolean; modifier_id?: string; cost?: number; error?: string };
}

/**
 * Purchase power-up consumables (quantity 1–99).
 * Returns new_quantity on success.
 */
export async function buyPowerup(effectId: string, quantity = 1): Promise<{
  success: boolean;
  new_quantity?: number;
  cost?: number;
  error?: string;
}> {
  const result = await safeRpc('buy_powerup', {
    p_effect_id: effectId,
    p_quantity: quantity,
  });
  if (result.error) {
    return { success: false, error: result.error.message ?? String(result.error) };
  }
  return result.data as { success: boolean; new_quantity?: number; cost?: number; error?: string };
}

// ============================================================
// SOCKET
// ============================================================

/**
 * Permanently socket a modifier into a reference.
 * socket_index is 0-based (slot 1 = index 0).
 */
export async function socketModifier(
  referenceId: string,
  socketIndex: number,
  modifierId: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await safeRpc('socket_modifier', {
    p_reference_id: referenceId,
    p_socket_index: socketIndex,
    p_modifier_id: modifierId,
  });
  if (result.error) {
    return { success: false, error: result.error.message ?? String(result.error) };
  }
  return result.data as { success: boolean; error?: string };
}

// ============================================================
// EQUIP (pre-debate loadout)
// ============================================================

/**
 * Equip a power-up for an upcoming debate.
 * Deducts 1 from inventory immediately. Max 3 per debate.
 */
export async function equipPowerupForDebate(
  debateId: string,
  effectId: string,
): Promise<{ success: boolean; slots_used?: number; error?: string }> {
  const result = await safeRpc('equip_powerup_for_debate', {
    p_debate_id: debateId,
    p_effect_id: effectId,
  });
  if (result.error) {
    return { success: false, error: result.error.message ?? String(result.error) };
  }
  return result.data as { success: boolean; slots_used?: number; error?: string };
}

// ============================================================
// INVENTORY READ
// ============================================================

/**
 * Load the caller's full modifier inventory.
 * Pass debateId to also get equipped loadout for that debate.
 */
export async function getUserInventory(debateId?: string): Promise<UserInventory | null> {
  const result = await safeRpc('get_user_modifier_inventory', {
    p_debate_id: debateId ?? null,
  });
  if (result.error) {
    console.error('[Modifiers] inventory fetch failed:', result.error);
    return null;
  }
  return result.data as UserInventory;
}

// ============================================================
// RENDER HELPERS
// ============================================================

/** Map tier to display label (capitalised). */
export function tierLabel(tier: RarityTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/** Map timing to short label. */
export function timingLabel(timing: ModifierTiming): string {
  return timing === 'end_of_debate' ? 'Post-Match' : 'In-Debate';
}

/** Map category to display label. */
export function categoryLabel(cat: ModifierCategory): string {
  const map: Record<ModifierCategory, string> = {
    token:           'Token',
    point:           'Point',
    reference:       'Reference',
    elo_xp:          'Elo / XP',
    crowd:           'Crowd',
    survival:        'Survival',
    self_mult:       'Multiplier',
    self_flat:       'Flat Bonus',
    opponent_debuff: 'Debuff',
    cite_triggered:  'Cite',
    conditional:     'Conditional',
    special:         'Special',
  };
  return map[cat] ?? cat;
}

/**
 * CSS class suffix for rarity tier badge colouring.
 * Use: `class="rarity-badge rarity-badge--${rarityClass(tier)}"`
 */
export function rarityClass(tier: RarityTier): string {
  return tier; // 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic'
}

/**
 * Render a modifier effect card (read-only).
 * Returns an HTML string. Caller appends to container.
 */
export function renderEffectCard(effect: ModifierEffect, opts: {
  showModButton?: boolean;
  showPuButton?: boolean;
  modButtonLabel?: string;
  puButtonLabel?: string;
} = {}): string {
  const timingBadge = effect.timing === 'in_debate'
    ? '<span class="mod-timing-badge mod-timing-badge--live">In-Debate</span>'
    : '<span class="mod-timing-badge mod-timing-badge--post">Post-Match</span>';

  const modBtn = opts.showModButton
    ? `<button class="mod-buy-btn mod-buy-btn--modifier" data-effect-id="${escapeHTML(effect.id)}">
         ${escapeHTML(opts.modButtonLabel ?? `Buy Modifier · ${effect.mod_cost} tokens`)}
       </button>`
    : '';

  const puBtn = opts.showPuButton
    ? `<button class="mod-buy-btn mod-buy-btn--powerup" data-effect-id="${escapeHTML(effect.id)}">
         ${escapeHTML(opts.puButtonLabel ?? `Buy Power-Up · ${effect.pu_cost} tokens`)}
       </button>`
    : '';

  return `
    <div class="mod-effect-card mod-effect-card--${rarityClass(effect.tier_gate)}"
         data-effect-id="${escapeHTML(effect.id)}">
      <div class="mod-effect-card__header">
        <span class="mod-effect-card__name">${escapeHTML(effect.name)}</span>
        <span class="mod-rarity-badge mod-rarity-badge--${rarityClass(effect.tier_gate)}">
          ${tierLabel(effect.tier_gate)}
        </span>
        ${timingBadge}
      </div>
      <p class="mod-effect-card__desc">${escapeHTML(effect.description)}</p>
      <div class="mod-effect-card__meta">
        <span class="mod-category-tag">${categoryLabel(effect.category)}</span>
      </div>
      <div class="mod-effect-card__actions">
        ${modBtn}
        ${puBtn}
      </div>
    </div>
  `.trim();
}

/**
 * Render an owned (unsocketed) modifier row for the inventory list.
 */
export function renderModifierRow(mod: OwnedModifier, opts: {
  showSocketButton?: boolean;
} = {}): string {
  const socketBtn = opts.showSocketButton
    ? `<button class="mod-socket-btn" data-modifier-id="${escapeHTML(mod.modifier_id)}">
         Socket
       </button>`
    : '';

  return `
    <div class="mod-inventory-row" data-modifier-id="${escapeHTML(mod.modifier_id)}">
      <div class="mod-inventory-row__info">
        <span class="mod-inventory-row__name">${escapeHTML(mod.name)}</span>
        <span class="mod-rarity-badge mod-rarity-badge--${rarityClass(mod.tier_gate)}">
          ${tierLabel(mod.tier_gate)}
        </span>
        <span class="mod-timing-badge mod-timing-badge--${mod.timing === 'in_debate' ? 'live' : 'post'}">
          ${timingLabel(mod.timing)}
        </span>
      </div>
      <p class="mod-inventory-row__desc">${escapeHTML(mod.description)}</p>
      ${socketBtn}
    </div>
  `.trim();
}

/**
 * Render a power-up stock row for the inventory list.
 */
export function renderPowerupRow(pu: PowerUpStock, opts: {
  showEquipButton?: boolean;
  debateId?: string;
} = {}): string {
  const equipBtn = opts.showEquipButton && opts.debateId
    ? `<button class="mod-equip-btn"
               data-effect-id="${escapeHTML(pu.effect_id)}"
               data-debate-id="${escapeHTML(opts.debateId)}">
         Equip
       </button>`
    : '';

  return `
    <div class="mod-powerup-row" data-effect-id="${escapeHTML(pu.effect_id)}">
      <div class="mod-powerup-row__info">
        <span class="mod-powerup-row__name">${escapeHTML(pu.name)}</span>
        <span class="mod-powerup-row__qty">×${pu.quantity}</span>
        <span class="mod-timing-badge mod-timing-badge--${pu.timing === 'in_debate' ? 'live' : 'post'}">
          ${timingLabel(pu.timing)}
        </span>
      </div>
      <p class="mod-powerup-row__desc">${escapeHTML(pu.description)}</p>
      ${equipBtn}
    </div>
  `.trim();
}

/**
 * Buy flow helper — handles confirm + toast feedback.
 * Used by the F-10 shop UI once built.
 */
export async function handleBuyModifier(effectId: string, effectName: string): Promise<boolean> {
  const res = await buyModifier(effectId);
  if (res.success) {
    showToast(`${effectName} modifier added to inventory`, 'success');
    return true;
  }
  showToast(res.error ?? 'Purchase failed', 'error');
  return false;
}

export async function handleBuyPowerup(
  effectId: string,
  effectName: string,
  quantity = 1,
): Promise<boolean> {
  const res = await buyPowerup(effectId, quantity);
  if (res.success) {
    showToast(`${effectName} ×${quantity} added to inventory`, 'success');
    return true;
  }
  showToast(res.error ?? 'Purchase failed', 'error');
  return false;
}

export async function handleEquip(
  debateId: string,
  effectId: string,
  effectName: string,
): Promise<boolean> {
  const res = await equipPowerupForDebate(debateId, effectId);
  if (res.success) {
    showToast(`${effectName} equipped (slot ${res.slots_used}/3)`, 'success');
    return true;
  }
  showToast(res.error ?? 'Equip failed', 'error');
  return false;
}
