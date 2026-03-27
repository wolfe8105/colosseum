/**
 * THE MODERATOR — Cosmetics Shop (Armory) Page Controller (TypeScript)
 *
 * Extracted as standalone page module. Follows settings.ts auth pattern exactly.
 * Uses ready promise from auth.ts — never calls onAuthStateChange directly.
 * All mutations go through safeRpc(). Token balance from getCurrentProfile().
 *
 * Session 185
 */

import {
  ready,
  getCurrentUser,
  getCurrentProfile,
  getIsPlaceholderMode,
  safeRpc,
} from '../auth.ts';
import { showToast } from '../config.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

type Category =
  | 'badge'
  | 'title'
  | 'border'
  | 'entrance_animation'
  | 'reaction_effect'
  | 'profile_background';

interface CosmeticItem {
  cosmetic_id: string;
  name: string;
  category: Category;
  tier: number | null;
  unlock_type: 'auto' | 'token' | 'depth';
  token_cost: number | null;
  depth_threshold: number | null;
  unlock_condition: string | null;
  asset_url: string | null;
  sort_order: number;
  owned: boolean;
  equipped: boolean;
  acquired_via: string | null;
  metadata: Record<string, unknown> | null;
}

// ============================================================
// STATE
// ============================================================

let catalog: CosmeticItem[] = [];
let tokenBalance: number = 0;
let activeTab: Category = 'badge';
let isLoggedIn: boolean = false;

// ============================================================
// CONSTANTS
// ============================================================

const TABS: { key: Category; label: string; icon: string }[] = [
  { key: 'badge',              label: 'Badges',      icon: '🏅' },
  { key: 'title',              label: 'Titles',      icon: '👑' },
  { key: 'border',             label: 'Borders',     icon: '⬡'  },
  { key: 'entrance_animation', label: 'Entrance',    icon: '⚡' },
  { key: 'reaction_effect',    label: 'Reactions',   icon: '🔥' },
  { key: 'profile_background', label: 'Backgrounds', icon: '🖼️' },
];

// Thresholds stored as 0.0–1.0 in DB per Session 184 handoff
const DEPTH_LABEL: Record<string, string> = {
  '0.1':  '10%',  '0.25': '25%', '0.35': '35%',
  '0.5':  '50%',  '0.6':  '60%', '0.75': '75%',
  '0.9':  '90%',  '1':    '100%',
};

// ============================================================
// INIT — matches settings.ts DOMContentLoaded pattern exactly
// ============================================================

window.addEventListener('DOMContentLoaded', async () => {
  // Wait for auth to resolve (logged in or guest), 6s safety timeout
  await Promise.race([ready, new Promise<void>(r => setTimeout(r, 6000))]);

  const user    = getCurrentUser();
  const profile = getCurrentProfile();
  isLoggedIn    = !!user && !getIsPlaceholderMode();

  // Pull token balance from already-loaded profile — no extra DB call needed
  tokenBalance = (profile as { token_balance?: number } | null)?.token_balance ?? 0;

  await loadShop();
});

// ============================================================
// LOAD
// ============================================================

async function loadShop(): Promise<void> {
  showLoading(true);

  const { data, error } = await safeRpc<CosmeticItem[]>('get_cosmetic_catalog');

  if (error || !data) {
    showToast('Failed to load Armory. Please refresh.', 'error');
    showLoading(false);
    return;
  }

  catalog = data;
  showLoading(false);
  renderShell();
  renderTab(activeTab);
}

// ============================================================
// SHELL
// ============================================================

function renderShell(): void {
  const app = document.getElementById('cosmetics-app');
  if (!app) return;

  app.innerHTML = `
    <div class="shop-header">
      <h1 class="shop-title">Armory</h1>
      ${isLoggedIn
        ? `<div class="token-display">
             <span class="token-icon">⚜</span>
             <span class="token-amount" id="token-balance-display">${tokenBalance.toLocaleString()}</span>
             <span class="token-label">tokens</span>
           </div>`
        : `<a href="/moderator-plinko.html" class="btn-signin-header">Sign in</a>`
      }
    </div>

    <nav class="tab-nav" role="tablist">
      ${TABS.map(t => `
        <button
          class="tab-btn ${t.key === activeTab ? 'active' : ''}"
          data-tab="${t.key}"
          role="tab"
          aria-selected="${t.key === activeTab}"
        >
          <span class="tab-icon">${t.icon}</span>
          <span class="tab-label">${t.label}</span>
        </button>
      `).join('')}
    </nav>

    <div class="tab-content" id="tab-content"></div>

    <!-- Purchase confirm modal -->
    <div class="modal-overlay hidden" id="confirm-modal" role="dialog" aria-modal="true">
      <div class="modal-card">
        <div class="modal-item-name" id="modal-item-name"></div>
        <div class="modal-cost">
          <span class="token-icon">⚜</span>
          <span id="modal-cost-amount"></span>
          <span class="modal-cost-label">tokens</span>
        </div>
        <div class="modal-balance-after" id="modal-balance-after"></div>
        <div class="modal-actions">
          <button class="btn-modal-cancel" id="modal-cancel">Cancel</button>
          <button class="btn-modal-confirm" id="modal-confirm">Purchase</button>
        </div>
      </div>
    </div>

    <!-- Info modal (depth-gated / badge detail) -->
    <div class="modal-overlay hidden" id="info-modal" role="dialog" aria-modal="true">
      <div class="modal-card">
        <div class="modal-item-name" id="info-modal-name"></div>
        <div class="modal-info-body" id="info-modal-body"></div>
        <div class="modal-actions">
          <button class="btn-modal-confirm" id="info-modal-close">Got it</button>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  app.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab as Category;
      app.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });
      renderTab(activeTab);
    });
  });

  // Modal backdrop click to close
  document.getElementById('confirm-modal')?.addEventListener('click', e => {
    if ((e.target as HTMLElement).id === 'confirm-modal') closeConfirmModal();
  });
  document.getElementById('modal-cancel')?.addEventListener('click', closeConfirmModal);

  document.getElementById('info-modal')?.addEventListener('click', e => {
    if ((e.target as HTMLElement).id === 'info-modal') closeInfoModal();
  });
  document.getElementById('info-modal-close')?.addEventListener('click', closeInfoModal);
}

// ============================================================
// TAB CONTENT
// ============================================================

function renderTab(category: Category): void {
  const container = document.getElementById('tab-content');
  if (!container) return;

  const items = catalog
    .filter(i => i.category === category)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (category === 'badge') {
    renderBadgeCabinet(container, items);
  } else {
    renderItemGrid(container, items);
  }
}

// ── Badge cabinet ──────────────────────────────────────────

function renderBadgeCabinet(container: HTMLElement, items: CosmeticItem[]): void {
  const owned   = items.filter(i => i.owned);
  const unowned = items.filter(i => !i.owned);

  container.innerHTML = `
    <div class="cabinet-label">Earned — ${owned.length} / ${items.length}</div>
    <div class="badge-grid">
      ${owned.map(item => `
        <div class="badge-tile owned" data-id="${item.cosmetic_id}"
             role="button" tabindex="0" aria-label="${escHtml(item.name)}">
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
    </div>
  `;

  container.querySelectorAll<HTMLElement>('.badge-tile.owned').forEach(tile => {
    const handler = () => {
      const item = catalog.find(i => i.cosmetic_id === tile.dataset.id);
      if (item) showInfoModal(item.name, item.unlock_condition ?? 'Achievement badge');
    };
    tile.addEventListener('click', handler);
    tile.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
  });
}

// ── Item grid ──────────────────────────────────────────────

function renderItemGrid(container: HTMLElement, items: CosmeticItem[]): void {
  container.innerHTML = `
    <div class="item-grid">
      ${items.map(renderItemCard).join('')}
    </div>
  `;

  container.querySelectorAll<HTMLElement>('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const { action, id } = el.dataset;
      if (!action || !id) return;

      if (action === 'purchase')   openConfirmModal(id);
      if (action === 'equip')      handleEquip(id, el);
      if (action === 'depth-info') {
        const item = catalog.find(i => i.cosmetic_id === id);
        if (item) showInfoModal(
          item.name,
          `Complete ${depthLabel(item.depth_threshold)} of your profile to unlock this item.`
        );
      }
    });
  });
}

function renderItemCard(item: CosmeticItem): string {
  const stateClass = item.equipped ? 'state-equipped'
    : item.owned   ? 'state-owned'
    : 'state-locked';

  let actionBtn: string;

  if (!isLoggedIn) {
    actionBtn = `<a href="/moderator-plinko.html" class="btn-item btn-guest">Sign in</a>`;
  } else if (item.equipped) {
    actionBtn = `<button class="btn-item btn-equipped" disabled>Equipped</button>`;
  } else if (item.owned) {
    actionBtn = `<button class="btn-item btn-equip" data-action="equip" data-id="${item.cosmetic_id}">Equip</button>`;
  } else if (item.unlock_type === 'token') {
    actionBtn = `
      <button class="btn-item btn-purchase" data-action="purchase" data-id="${item.cosmetic_id}">
        <span>⚜</span> ${(item.token_cost ?? 0).toLocaleString()}
      </button>`;
  } else if (item.unlock_type === 'depth') {
    actionBtn = `
      <button class="btn-item btn-depth-locked" data-action="depth-info" data-id="${item.cosmetic_id}">
        🔒 ${depthLabel(item.depth_threshold)} profile
      </button>`;
  } else {
    // unlock_type === 'auto' — free items, equip_cosmetic auto-grants on first equip
    actionBtn = `<button class="btn-item btn-equip" data-action="equip" data-id="${item.cosmetic_id}">Equip Free</button>`;
  }

  const tierBadge = item.tier
    ? `<span class="tier-pip tier-${item.tier}">T${item.tier}</span>`
    : '';

  return `
    <div class="item-card ${stateClass}">
      <div class="item-card-top">
        ${tierBadge}
        ${item.equipped ? '<span class="equipped-tag">✓ ON</span>' : ''}
      </div>
      <div class="item-preview">${itemPreview(item)}</div>
      <div class="item-card-body">
        <div class="item-name">${escHtml(item.name)}</div>
        ${item.unlock_condition
          ? `<div class="item-condition">${escHtml(item.unlock_condition)}</div>`
          : ''}
      </div>
      <div class="item-card-footer">${actionBtn}</div>
    </div>
  `;
}

// ============================================================
// ACTIONS
// ============================================================

function openConfirmModal(cosmeticId: string): void {
  const item = catalog.find(i => i.cosmetic_id === cosmeticId);
  if (!item || item.unlock_type !== 'token') return;

  const cost  = item.token_cost ?? 0;
  const after = tokenBalance - cost;

  document.getElementById('modal-item-name')!.textContent   = item.name;
  document.getElementById('modal-cost-amount')!.textContent = cost.toLocaleString();

  const afterEl = document.getElementById('modal-balance-after')!;
  if (after >= 0) {
    afterEl.textContent = `Balance after: ${after.toLocaleString()}`;
    afterEl.style.color = '';
  } else {
    afterEl.textContent = `Need ${(cost - tokenBalance).toLocaleString()} more tokens`;
    afterEl.style.color = '#e74c3c';
  }

  const confirmBtn = document.getElementById('modal-confirm') as HTMLButtonElement;
  confirmBtn.disabled    = after < 0;
  confirmBtn.textContent = 'Purchase';
  // Assign handler fresh each open — prevents stacked listeners
  confirmBtn.onclick = () => executePurchase(cosmeticId, confirmBtn);

  document.getElementById('confirm-modal')!.classList.remove('hidden');
}

function closeConfirmModal(): void {
  document.getElementById('confirm-modal')!.classList.add('hidden');
}

async function executePurchase(cosmeticId: string, btn: HTMLButtonElement): Promise<void> {
  // Disable immediately — prevents double-tap double-charge regardless of RPC behavior
  btn.disabled    = true;
  btn.textContent = 'Purchasing…';

  const { data, error } = await safeRpc<{ new_balance: number }>(
    'purchase_cosmetic',
    { p_cosmetic_id: cosmeticId }
  );

  if (error || !data) {
    showToast('Purchase failed. Check your token balance and try again.', 'error');
    btn.disabled    = false;
    btn.textContent = 'Purchase';
    return;
  }

  const item = catalog.find(i => i.cosmetic_id === cosmeticId);
  if (item) item.owned = true;

  tokenBalance = data.new_balance;
  const balanceEl = document.getElementById('token-balance-display');
  if (balanceEl) balanceEl.textContent = tokenBalance.toLocaleString();

  closeConfirmModal();
  showToast(`${item?.name ?? 'Item'} added to your Armory!`, 'success');
  renderTab(activeTab);
}

async function handleEquip(cosmeticId: string, btn: HTMLElement): Promise<void> {
  (btn as HTMLButtonElement).disabled = true;
  btn.textContent = '…';

  const { error } = await safeRpc('equip_cosmetic', { p_cosmetic_id: cosmeticId });

  if (error) {
    showToast('Could not equip item. Please try again.', 'error');
    (btn as HTMLButtonElement).disabled = false;
    btn.textContent = 'Equip';
    return;
  }

  // Unequip all in same category, equip this one
  const item = catalog.find(i => i.cosmetic_id === cosmeticId);
  if (item) {
    catalog.forEach(i => { if (i.category === item.category) i.equipped = false; });
    item.owned   = true;   // handles auto-grant case — idempotent if already owned
    item.equipped = true;
  }

  showToast(`${item?.name ?? 'Item'} equipped!`, 'success');
  renderTab(activeTab);
}

function showInfoModal(title: string, body: string): void {
  document.getElementById('info-modal-name')!.textContent = title;
  document.getElementById('info-modal-body')!.textContent = body;
  document.getElementById('info-modal')!.classList.remove('hidden');
}

function closeInfoModal(): void {
  document.getElementById('info-modal')!.classList.add('hidden');
}

// ============================================================
// HELPERS
// ============================================================

function showLoading(on: boolean): void {
  document.getElementById('cosmetics-loader')?.classList.toggle('hidden', !on);
  document.getElementById('cosmetics-app')?.classList.toggle('hidden', on);
}

function depthLabel(threshold: number | null): string {
  if (threshold === null) return '?%';
  const key = String(parseFloat(threshold.toFixed(2)));
  return DEPTH_LABEL[key] ?? `${Math.round(threshold * 100)}%`;
}

function badgeIcon(item: CosmeticItem): string {
  if (item.asset_url) {
    return `<img src="${escHtml(item.asset_url)}" alt="${escHtml(item.name)}" class="badge-img">`;
  }
  return item.name.charAt(0).toUpperCase();
}

function itemPreview(item: CosmeticItem): string {
  if (item.asset_url) {
    if (item.category === 'entrance_animation' || item.category === 'reaction_effect') {
      return `<video src="${escHtml(item.asset_url)}" autoplay loop muted playsinline class="preview-video"></video>`;
    }
    return `<img src="${escHtml(item.asset_url)}" alt="${escHtml(item.name)}" class="preview-img">`;
  }
  const glyphs: Record<Category, string> = {
    badge:              '🏅',
    title:              '👑',
    border:             '⬡',
    entrance_animation: '⚡',
    reaction_effect:    '🔥',
    profile_background: '🖼️',
  };
  return `<span class="preview-glyph">${glyphs[item.category]}</span>`;
}

function escHtml(str: string | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
