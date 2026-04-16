/**
 * staking.wire.ts — Staking panel DOM event wiring
 *
 * wireStakingPanel, _updateConfirmButton (private)
 * Extracted from staking.ts (Session 254 track).
 */

import { placeStake } from './staking.rpc.ts';
import type { StakeResult } from './staking.types.ts';

function _updateConfirmButton(selectedSide: string | null): void {
  const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement | null;
  const amountInput = document.getElementById('stake-amount-input') as HTMLInputElement | null;
  if (!confirmBtn) return;

  const amount = amountInput ? Number.parseInt(amountInput.value, 10) : 0;

  if (selectedSide && amount > 0) {
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.textContent = `STAKE ${amount} ON SIDE ${selectedSide.toUpperCase()}`;
  } else if (selectedSide) {
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
    confirmBtn.textContent = 'ENTER AMOUNT';
  } else {
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
    confirmBtn.textContent = 'SELECT A SIDE';
  }
}

/** Wire up click handlers after inserting renderStakingPanel HTML into the DOM. */
export function wireStakingPanel(debateId: string, onStakePlaced?: (result: StakeResult) => void): void {
  let selectedSide: string | null = null;

  // Side buttons
  document.querySelectorAll('.stake-side-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLButtonElement;
      selectedSide = el.dataset.side ?? null;

      document.querySelectorAll('.stake-side-btn').forEach(b => {
        const bEl = b as HTMLElement;
        bEl.style.borderColor = bEl.dataset.side === 'a' ? '#2563eb44' : '#cc000044'; // TODO: needs CSS var token
        bEl.style.background = bEl.dataset.side === 'a' ? '#2563eb11' : '#cc000011'; // TODO: needs CSS var token
      });

      if (selectedSide === 'a') {
        el.style.borderColor = '#2563eb'; // TODO: needs CSS var token
        el.style.background = '#2563eb33'; // TODO: needs CSS var token
      } else {
        el.style.borderColor = '#cc0000'; // TODO: needs CSS var token
        el.style.background = '#cc000033'; // TODO: needs CSS var token
      }

      _updateConfirmButton(selectedSide);
    });
  });

  // Quick amount buttons
  document.querySelectorAll('.stake-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('stake-amount-input') as HTMLInputElement | null;
      if (input) input.value = (btn as HTMLElement).dataset.amount ?? '';
      _updateConfirmButton(selectedSide);
    });
  });

  // Amount input
  const amountInput = document.getElementById('stake-amount-input') as HTMLInputElement | null;
  if (amountInput) {
    amountInput.addEventListener('input', () => _updateConfirmButton(selectedSide));
  }

  // Confirm button
  const confirmBtn = document.getElementById('stake-confirm-btn') as HTMLButtonElement | null;
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!selectedSide || !amountInput?.value) return;

      const amount = Number.parseInt(amountInput.value, 10);
      const errorEl = document.getElementById('stake-error');

      confirmBtn.disabled = true;
      confirmBtn.textContent = 'PLACING STAKE...';

      const result = await placeStake(debateId, selectedSide, amount);

      if (result.success) {
        confirmBtn.textContent = 'STAKE PLACED ✓';
        confirmBtn.style.background = '#16a34a'; // TODO: needs CSS var token
        if (errorEl) errorEl.style.display = 'none';
        if (onStakePlaced) onStakePlaced(result);
      } else {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'CONFIRM STAKE';
        if (errorEl) {
          errorEl.textContent = result.error ?? 'Stake failed';
          errorEl.style.display = 'block';
        }
      }
    });
  }
}
