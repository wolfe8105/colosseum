/**
 * THE MODERATOR — F-57 Modifier Render Helpers
 * Label helpers and HTML-returning render functions for modifier cards/rows.
 */

import { escapeHTML } from './config.ts';
import type { ModifierEffect, OwnedModifier, PowerUpStock, RarityTier, ModifierTiming, ModifierCategory } from './modifiers.ts';

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
 * LANDMINE [LM-MODS-003]: identity function — kept for forward compat if more
 * complex mapping is needed. If the comment is still accurate 6 months from now,
 * inline it.
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
