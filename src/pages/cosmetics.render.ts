/**
 * THE MODERATOR — Cosmetics Render
 * renderTab, renderBadgeCabinet, renderItemGrid, renderItemCard, helpers.
 */

import { escapeHTML } from '../config.ts';
import type { CosmeticItem, Category } from './cosmetics.types.ts';
import { DEPTH_LABEL } from './cosmetics.types.ts';
import { openConfirmModal, handleEquip, showInfoModal } from './cosmetics.modal.ts';

// Use project-standard escapeHTML — local escHtml duplicate removed (LM-COS-001 fixed).
const escHtml = escapeHTML;

export function depthLabel(threshold: number | null): string {
  if (threshold === null) return '?%';
  const key = String(parseFloat(threshold.toFixed(2)));
  return DEPTH_LABEL[key] ?? `${Math.round(threshold * 100)}%`;
}

export function badgeIcon(item: CosmeticItem): string {
  if (item.asset_url) return `<img src="${escHtml(item.asset_url)}" alt="${escHtml(item.name)}" class="badge-img">`;
  return item.name.charAt(0).toUpperCase();
}

export function itemPreview(item: CosmeticItem): string {
  if (item.asset_url) {
    if (item.category === 'entrance_animation' || item.category === 'reaction_effect') {
      return `<video src="${escHtml(item.asset_url)}" autoplay loop muted playsinline class="preview-video"></video>`;
    }
    return `<img src="${escHtml(item.asset_url)}" alt="${escHtml(item.name)}" class="preview-img">`;
  }
  const glyphs: Record<Category, string> = {
    badge: '🏅', title: '👑', border: '⬡',
    entrance_animation: '⚡', reaction_effect: '🔥', profile_background: '🖼️',
  };
  return `<span class="preview-glyph">${glyphs[item.category]}</span>`;
}

export function renderItemCard(item: CosmeticItem, isLoggedIn: boolean): string {
  const stateClass = item.equipped ? 'state-equipped' : item.owned ? 'state-owned' : 'state-locked';
  let actionBtn: string;

  if (!isLoggedIn) {
    actionBtn = `<a href="/moderator-plinko.html" class="btn-item btn-guest">Sign in</a>`;
  } else if (item.equipped) {
    actionBtn = `<button class="btn-item btn-equipped" disabled>Equipped</button>`;
  } else if (item.owned) {
    actionBtn = `<button class="btn-item btn-equip" data-action="equip" data-id="${escHtml(item.cosmetic_id)}">Equip</button>`;
  } else if (item.unlock_type === 'token') {
    actionBtn = `<button class="btn-item btn-purchase" data-action="purchase" data-id="${escHtml(item.cosmetic_id)}"><span>⚜</span> ${(item.token_cost ?? 0).toLocaleString()}</button>`;
  } else if (item.unlock_type === 'depth') {
    actionBtn = `<button class="btn-item btn-depth-locked" data-action="depth-info" data-id="${escHtml(item.cosmetic_id)}">🔒 ${depthLabel(item.depth_threshold)} profile</button>`;
  } else {
    actionBtn = `<button class="btn-item btn-equip" data-action="equip" data-id="${escHtml(item.cosmetic_id)}">Equip Free</button>`;
  }

  const tierBadge = item.tier ? `<span class="tier-pip tier-${item.tier}">T${item.tier}</span>` : '';

  return `
    <div class="item-card ${stateClass}">
      <div class="item-card-top">${tierBadge}${item.equipped ? '<span class="equipped-tag">✓ ON</span>' : ''}</div>
      <div class="item-preview">${itemPreview(item)}</div>
      <div class="item-card-body">
        <div class="item-name">${escHtml(item.name)}</div>
        ${item.unlock_condition ? `<div class="item-condition">${escHtml(item.unlock_condition)}</div>` : ''}
      </div>
      <div class="item-card-footer">${actionBtn}</div>
    </div>`;
}

export function renderBadgeCabinet(container: HTMLElement, items: CosmeticItem[], catalog: CosmeticItem[]): void {
  const owned   = items.filter(i => i.owned);
  const unowned = items.filter(i => !i.owned);

  container.innerHTML = `
    <div class="cabinet-label">Earned — ${owned.length} / ${items.length}</div>
    <div class="badge-grid">
      ${owned.map(item => `
        <div class="badge-tile owned" data-id="${escHtml(item.cosmetic_id)}" role="button" tabindex="0" aria-label="${escHtml(item.name)}">
          <div class="badge-icon">${badgeIcon(item)}</div>
          <div class="badge-name">${escHtml(item.name)}</div>
        </div>
      `).join('')}
      ${unowned.map(() => `
        <div class="badge-tile locked" aria-hidden="true">
          <div class="badge-icon locked-icon">?</div>
          <div class="badge-name locked-name">???</div>
        </div>
      `).join('')}
    </div>`;

  container.querySelectorAll<HTMLElement>('.badge-tile.owned').forEach(tile => {
    const handler = () => {
      const item = catalog.find(i => i.cosmetic_id === tile.dataset.id);
      if (item) showInfoModal(item.name, item.unlock_condition ?? 'Achievement badge');
    };
    tile.addEventListener('click', handler);
    tile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
  });
}

export function renderItemGrid(container: HTMLElement, items: CosmeticItem[], isLoggedIn: boolean, catalog: CosmeticItem[]): void {
  container.innerHTML = `<div class="item-grid">${items.map(i => renderItemCard(i, isLoggedIn)).join('')}</div>`;

  container.querySelectorAll<HTMLElement>('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const { action, id } = el.dataset;
      if (!action || !id) return;
      if (action === 'purchase') openConfirmModal(id, catalog);
      if (action === 'equip') void handleEquip(id, el, catalog);
      if (action === 'depth-info') {
        const item = catalog.find(i => i.cosmetic_id === id);
        if (item) showInfoModal(item.name, `Complete ${depthLabel(item.depth_threshold)} of your profile to unlock this item.`);
      }
    });
  });
}

export function renderTab(category: Category, catalog: CosmeticItem[], isLoggedIn: boolean, activeTab: Category, onRender: () => void): void {
  const container = document.getElementById('tab-content');
  if (!container) return;

  const items = catalog.filter(i => i.category === category).sort((a, b) => a.sort_order - b.sort_order);
  if (category === 'badge') renderBadgeCabinet(container, items, catalog);
  else renderItemGrid(container, items, isLoggedIn, catalog);
}
