/**
 * THE MODERATOR — Cosmetics Shop (Armory) Page Controller
 *
 * Refactored: types → cosmetics.types.ts, render → cosmetics.render.ts,
 * modal → cosmetics.modal.ts.
 */

import { ready, getCurrentUser, getCurrentProfile, getIsPlaceholderMode, safeRpc } from '../auth.ts';
import { showToast, FEATURES } from '../config.ts';
import { TABS } from './cosmetics.types.ts';
import { renderTab as _renderTab } from './cosmetics.render.ts';
import { initModalCallbacks, closeConfirmModal, closeInfoModal } from './cosmetics.modal.ts';
import type { CosmeticItem, Category } from './cosmetics.types.ts';

let catalog: CosmeticItem[] = [];
let tokenBalance = 0;
let activeTab: Category = 'badge';
let isLoggedIn = false;

function rerender(): void { _renderTab(activeTab, catalog, isLoggedIn, activeTab, rerender); }

initModalCallbacks(() => tokenBalance, (n) => { tokenBalance = n; }, rerender);

window.addEventListener('DOMContentLoaded', async () => {
  if (!FEATURES.cosmetics) return;
  await Promise.race([ready, new Promise<void>(r => setTimeout(r, 6000))]);
  const user    = getCurrentUser();
  const profile = getCurrentProfile();
  isLoggedIn    = !!user && !getIsPlaceholderMode();
  tokenBalance  = (profile as { token_balance?: number } | null)?.token_balance ?? 0;
  await loadShop();
});

async function loadShop(): Promise<void> {
  showLoading(true);
  const { data, error } = await safeRpc<CosmeticItem[]>('get_cosmetic_catalog');
  if (error || !data) { showToast('Failed to load Armory. Please refresh.', 'error'); showLoading(false); return; }
  catalog = data;
  showLoading(false);
  renderShell();
  rerender();
}

function renderShell(): void {
  const app = document.getElementById('cosmetics-app');
  if (!app) return;

  app.innerHTML = `
    <div class="shop-header">
      <h1 class="shop-title">Armory</h1>
      ${isLoggedIn
        ? `<div class="token-display"><span class="token-icon">⚜</span><span class="token-amount" id="token-balance-display">${tokenBalance.toLocaleString()}</span><span class="token-label">tokens</span></div>`
        : `<a href="/moderator-plinko.html" class="btn-signin-header">Sign in</a>`}
    </div>
    <nav class="tab-nav" role="tablist">
      ${TABS.map(t => `<button class="tab-btn ${t.key === activeTab ? 'active' : ''}" data-tab="${t.key}" role="tab" aria-selected="${t.key === activeTab}"><span class="tab-icon">${t.icon}</span><span class="tab-label">${t.label}</span></button>`).join('')}
    </nav>
    <div class="tab-content" id="tab-content"></div>
    <div class="modal-overlay hidden" id="confirm-modal" role="dialog" aria-modal="true">
      <div class="modal-card">
        <div class="modal-item-name" id="modal-item-name"></div>
        <div class="modal-cost"><span class="token-icon">⚜</span><span id="modal-cost-amount"></span><span class="modal-cost-label">tokens</span></div>
        <div class="modal-balance-after" id="modal-balance-after"></div>
        <div class="modal-actions"><button class="btn-modal-cancel" id="modal-cancel">Cancel</button><button class="btn-modal-confirm" id="modal-confirm">Purchase</button></div>
      </div>
    </div>
    <div class="modal-overlay hidden" id="info-modal" role="dialog" aria-modal="true">
      <div class="modal-card">
        <div class="modal-item-name" id="info-modal-name"></div>
        <div class="modal-info-body" id="info-modal-body"></div>
        <div class="modal-actions"><button class="btn-modal-confirm" id="info-modal-close">Got it</button></div>
      </div>
    </div>`;

  app.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab as Category;
      app.querySelectorAll('.tab-btn').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-selected', String(b === btn)); });
      rerender();
    });
  });

  document.getElementById('confirm-modal')?.addEventListener('click', e => { if ((e.target as HTMLElement).id === 'confirm-modal') closeConfirmModal(); });
  document.getElementById('modal-cancel')?.addEventListener('click', closeConfirmModal);
  document.getElementById('info-modal')?.addEventListener('click', e => { if ((e.target as HTMLElement).id === 'info-modal') closeInfoModal(); });
  document.getElementById('info-modal-close')?.addEventListener('click', closeInfoModal);
}

function showLoading(on: boolean): void {
  document.getElementById('cosmetics-loader')?.classList.toggle('hidden', !on);
  document.getElementById('cosmetics-app')?.classList.toggle('hidden', on);
}
