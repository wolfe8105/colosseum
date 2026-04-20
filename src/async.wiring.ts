/**
 * THE MODERATOR — Async Module: Delegation Wiring (TypeScript)
 *
 * Registers click/input delegation for hot-takes, predictions, and rivals
 * containers. Imported by async.ts for its side effects only — exports nothing.
 */

import { state } from './async.state.ts';
import {
  loadHotTakes,
  _showWagerPicker,
  _hideWagerPicker,
  _registerWiring,
} from './async.render.ts';
import {
  react,
  challenge,
  placePrediction,
  pickStandaloneQuestion,
  openCreatePredictionForm,
} from './async.actions.ts';
import {
  refreshRivals,
  _registerRivalWiring,
} from './async.rivals.ts';
import { showToast } from './config.ts';
import {
  getCurrentProfile,
  requireAuth,
  showUserProfile,
  respondRival,
  toggleModerator,
} from './auth.ts';
import { shareTake } from './share.ts';
import { getBalance } from './tokens.ts';

// ============================================================
// WIRING — hot takes container
// ============================================================

function _wireTakeDelegation(container: HTMLElement): void {
  container.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest(
      '[data-action]'
    ) as HTMLElement | null;
    if (!btn) return;
    const action = btn.dataset['action'];
    if (action === 'react') react(btn.dataset['id'] ?? '');
    else if (action === 'challenge') challenge(btn.dataset['id'] ?? '');
    else if (action === 'share')
      shareTake(btn.dataset['id'] ?? '', btn.dataset['text'] ?? '');
    else if (action === 'become-mod') {
      // fire-and-forget: moderator toggle has .then() handling success inline
      void toggleModerator(true).then((result) => {
        if (!result.error) {
          showToast('🧑‍⚖️ You are now a Moderator!', 'success');
          loadHotTakes(state.currentFilter);
        }
      }).catch(err => console.error('[async.wiring] toggleModerator failed:', err));
    } else if (action === 'mod-signup') {
      window.location.href = 'moderator-plinko.html';
    } else if (action === 'expand') {
      const card = btn.closest('.mod-card');
      if (!card) return;
      const textEl = card.querySelector(
        '[data-action="expand"]'
      ) as HTMLElement | null;
      if (textEl) {
        textEl.style.display = '';
        textEl.style.webkitLineClamp = 'unset';
        textEl.style.overflow = 'visible';
      }
      const moreEl = card.querySelectorAll('[data-action="expand"]')[1] as
        | HTMLElement
        | undefined;
      if (moreEl && moreEl.textContent?.includes('tap')) moreEl.remove();
    } else if (action === 'profile') {
      if (btn.dataset['username'])
        window.location.href =
          '/u/' + encodeURIComponent(btn.dataset['username']);
      else showUserProfile(btn.dataset['userId'] ?? '');
    }
  });
}

// ============================================================
// WIRING — predictions container
// ============================================================

function _wirePredictionDelegation(container: HTMLElement): void {
  container.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest(
      '[data-action]'
    ) as HTMLElement | null;
    if (!btn) return;
    const action = btn.dataset['action'];
    if (action === 'predict') {
      if (!requireAuth('place predictions')) return;
      _showWagerPicker(btn.dataset['id'] ?? '', btn.dataset['pick'] ?? '');
    } else if (action === 'wager-quick') {
      const input = container.querySelector('#wager-amount-input') as HTMLInputElement | null;
      if (input) {
        input.value = btn.dataset['amount'] ?? '';
        input.dispatchEvent(new Event('input'));
      }
    } else if (action === 'wager-confirm') {
      const input = container.querySelector('#wager-amount-input') as HTMLInputElement | null;
      const amount = input ? parseInt(input.value, 10) : 0;
      const debateId = btn.dataset['id'] ?? '';
      const pick = btn.dataset['pick'] ?? '';
      if (amount >= 1 && amount <= 500 && debateId && pick) {
        const bal = getBalance();
        if (bal != null && amount > bal) {
          showToast(`Insufficient balance (${bal.toLocaleString()} tokens)`, 'error');
          return;
        }
        void placePrediction(debateId, pick, amount).catch(err =>
          console.error('[async.wiring] placePrediction fire-and-forget failed:', err)
        );
      }
    } else if (action === 'wager-cancel') {
      _hideWagerPicker();
    } else if (action === 'standalone-pick') {
      void pickStandaloneQuestion(
        btn.dataset['id'] ?? '',
        btn.dataset['pick'] ?? ''
      ).catch(err =>
        console.error('[async.wiring] pickStandaloneQuestion fire-and-forget failed:', err)
      );
    } else if (action === 'create-prediction') {
      openCreatePredictionForm();
    }
  });

  container.addEventListener('input', (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.id !== 'wager-amount-input') return;
    const amount = parseInt(input.value, 10);
    const confirmBtn = container.querySelector('[data-action="wager-confirm"]') as HTMLButtonElement | null;
    if (!confirmBtn) return;
    const balance = getCurrentProfile()?.token_balance || 0;
    const valid = amount >= 1 && amount <= 500 && amount <= balance;
    confirmBtn.disabled = !valid;
    confirmBtn.style.opacity = valid ? '1' : '0.5';
  });
}

// ============================================================
// WIRING — rivals container
// ============================================================

function _wireRivalDelegation(container: HTMLElement): void {
  container.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest(
      '[data-action]'
    ) as HTMLElement | null;
    if (!btn) return;
    if (btn.dataset['action'] === 'profile') {
      if (btn.dataset['username'])
        window.location.href =
          '/u/' + encodeURIComponent(btn.dataset['username']);
      else showUserProfile(btn.dataset['userId'] ?? '');
    } else if (btn.dataset['action'] === 'accept-rival') {
      respondRival(btn.dataset['id'] ?? '', true).then(() =>
        // fire-and-forget: UI refresh after rival accept — failure is non-critical
        void refreshRivals()
      );
    }
  });
}

// ============================================================
// REGISTRATION — side effects at module load time
// ============================================================

_registerWiring(_wireTakeDelegation, _wirePredictionDelegation);
_registerRivalWiring(_wireRivalDelegation);
