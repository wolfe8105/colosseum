/**
 * THE MODERATOR — Cosmetics Modal
 * openConfirmModal, closeConfirmModal, executePurchase, handleEquip,
 * showInfoModal, closeInfoModal.
 *
 * LANDMINE [LM-COS-002]: executePurchase sets btn.disabled but no try/finally.
 * If the RPC throws, the button stays permanently disabled.
 */

import { safeRpc } from '../auth.ts';
import { showToast } from '../config.ts';
import type { CosmeticItem } from './cosmetics.types.ts';

// tokenBalance and activeTab are read/written via callbacks to avoid circular deps
let _getTokenBalance: () => number = () => 0;
let _setTokenBalance: (n: number) => void = () => {};
let _rerenderTab: () => void = () => {};

export function initModalCallbacks(
  getBalance: () => number,
  setBalance: (n: number) => void,
  rerender: () => void
): void {
  _getTokenBalance = getBalance;
  _setTokenBalance = setBalance;
  _rerenderTab = rerender;
}

export function openConfirmModal(cosmeticId: string, catalog: CosmeticItem[]): void {
  const item = catalog.find(i => i.cosmetic_id === cosmeticId);
  if (!item || item.unlock_type !== 'token') return;

  const cost  = item.token_cost ?? 0;
  const after = _getTokenBalance() - cost;

  document.getElementById('modal-item-name')!.textContent   = item.name;
  document.getElementById('modal-cost-amount')!.textContent = cost.toLocaleString();

  const afterEl = document.getElementById('modal-balance-after')!;
  if (after >= 0) {
    afterEl.textContent = `Balance after: ${after.toLocaleString()}`;
    afterEl.style.color = '';
  } else {
    afterEl.textContent = `Need ${(cost - _getTokenBalance()).toLocaleString()} more tokens`;
    afterEl.style.color = 'var(--mod-accent)';
  }

  const confirmBtn = document.getElementById('modal-confirm') as HTMLButtonElement;
  confirmBtn.disabled    = after < 0;
  confirmBtn.textContent = 'Purchase';
  confirmBtn.onclick = () => executePurchase(cosmeticId, confirmBtn, catalog);
  document.getElementById('confirm-modal')!.classList.remove('hidden');
}

export function closeConfirmModal(): void {
  document.getElementById('confirm-modal')!.classList.add('hidden');
}

export async function executePurchase(cosmeticId: string, btn: HTMLButtonElement, catalog: CosmeticItem[]): Promise<void> {
  btn.disabled = true;
  btn.textContent = 'Purchasing…';

  try {
    const { data, error } = await safeRpc<{ new_balance: number }>('purchase_cosmetic', { p_cosmetic_id: cosmeticId });

    if (error || !data) {
      showToast('Purchase failed. Check your token balance and try again.', 'error');
      return;
    }

    const item = catalog.find(i => i.cosmetic_id === cosmeticId);
    if (item) item.owned = true;

    _setTokenBalance(data.new_balance);
    const balanceEl = document.getElementById('token-balance-display');
    if (balanceEl) balanceEl.textContent = data.new_balance.toLocaleString();

    closeConfirmModal();
    showToast(`${item?.name ?? 'Item'} added to your Armory!`, 'success');
    _rerenderTab();
  } finally {
    // LM-COS-002: always re-enable button so user can retry
    btn.disabled = false;
    btn.textContent = 'Purchase';
  }
}

export async function handleEquip(cosmeticId: string, btn: HTMLElement, catalog: CosmeticItem[]): Promise<void> {
  // LANDMINE [LM-COS-003]: On success, renderTab rebuilds the DOM — btn reference is stale.
  (btn as HTMLButtonElement).disabled = true;
  btn.textContent = '…';

  try {
    const { error } = await safeRpc('equip_cosmetic', { p_cosmetic_id: cosmeticId });

    if (error) {
      showToast('Could not equip item. Please try again.', 'error');
      return;
    }

    const item = catalog.find(i => i.cosmetic_id === cosmeticId);
    if (item) {
      catalog.forEach(i => { if (i.category === item.category) i.equipped = false; });
      item.owned = true;
      item.equipped = true;
    }

    showToast(`${item?.name ?? 'Item'} equipped!`, 'success');
    _rerenderTab();
  } finally {
    // LM-COS-003: re-enable button — _rerenderTab() rebuilds DOM so this is a no-op on success but guards on throw
    (btn as HTMLButtonElement).disabled = false;
    btn.textContent = 'Equip';
  }
}

export function showInfoModal(title: string, body: string): void {
  document.getElementById('info-modal-name')!.textContent = title;
  document.getElementById('info-modal-body')!.textContent = body;
  document.getElementById('info-modal')!.classList.remove('hidden');
}

export function closeInfoModal(): void {
  document.getElementById('info-modal')!.classList.add('hidden');
}
