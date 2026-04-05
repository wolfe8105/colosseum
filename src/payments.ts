/**
 * THE MODERATOR — Payments Module (TypeScript)
 *
 * Runtime module — replaces moderator-payments.js when Vite build is active.
 * Depends on: config.ts, auth.ts, Stripe.js (CDN)
 *
 * Source of truth for runtime: this file (Phase 3 cutover)
 * Source of truth for types: this file
 *
 * Migration: Session 127 (Phase 3), Session 138 (ES imports, zero globalThis reads)
 */

import {
  escapeHTML,
  placeholderMode,
  showToast,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_PRICES,
  STRIPE_FUNCTION_URL,
  TIERS,
  TOKENS,
  isPlaceholder,
} from './config.ts';
import type { SubscriptionTiers } from './config.ts';
import { getCurrentUser, getCurrentProfile, ready } from './auth.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type SubscriptionTierKey = keyof SubscriptionTiers;

export interface TokenPackage {
  readonly id: string;
  readonly amount: number;
  readonly price: number;
}

export interface CheckoutResponse {
  sessionId: string;
}

// ============================================================
// STRIPE CDN GLOBAL
// ============================================================

/** Stripe.js global loaded via CDN */
declare function Stripe(key: string): {
  redirectToCheckout: (opts: { sessionId: string }) => Promise<void>;
};

// ============================================================
// STATE
// ============================================================

let stripe: ReturnType<typeof Stripe> | null = null;
let _isPlaceholderMode = true;

// ============================================================
// INIT
// ============================================================

export function init(): void {
  if (placeholderMode.stripe) {
    _isPlaceholderMode = true;
    console.warn('ModeratorPayments: Stripe credentials missing, placeholder mode');
    return;
  }
  if (typeof Stripe === 'undefined') {
    _isPlaceholderMode = true;
    return;
  }
  try {
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    _isPlaceholderMode = false;
  } catch (e) {
    console.error('ModeratorPayments: Stripe init failed', e);
    _isPlaceholderMode = true;
  }
}

// ============================================================
// HELPERS
// ============================================================

function isMinor(): boolean {
  return getCurrentProfile()?.is_minor === true;
}


function showPlaceholderModal(type: 'subscription' | 'tokens', detail: string): void {
  const existing = document.getElementById('payment-placeholder-modal');
  if (existing) existing.remove();

  const tierInfo = (TIERS as Record<string, { name: string; price: number }>)[detail];
  const tokenPkg = (TOKENS as unknown as { packages?: TokenPackage[] }).packages?.find(
    (p) => p.id === detail
  );

  let title: string;
  let body: string;

  if (type === 'subscription' && tierInfo) {
    title = `${tierInfo.name.toUpperCase()} — COMING SOON`;
    body = `Stripe not connected yet. When live, this button will open Stripe Checkout for the ${tierInfo.name} tier.`;
  } else if (type === 'tokens' && tokenPkg) {
    title = `${tokenPkg.amount} TOKENS — COMING SOON`;
    body = `Stripe not connected yet. When live, this will purchase ${tokenPkg.amount} tokens via Stripe Checkout.`;
  } else {
    title = 'PAYMENT';
    body = 'Stripe not connected. See moderator-config.js and DEPLOYMENT-GUIDE.md.';
  }

  const modal = document.createElement('div');
  modal.id = 'payment-placeholder-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:var(--mod-bg-overlay);z-index:10000;
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;
  modal.innerHTML = `
    <div style="background:#132240;border:1px solid var(--mod-accent-border);border-radius:12px;max-width:360px;width:100%;padding:24px;text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:var(--mod-accent);margin-bottom:8px;">${escapeHTML(title)}</div>
      <div style="color:var(--mod-text-sub);font-size:14px;line-height:1.5;margin-bottom:20px;">${escapeHTML(body)}</div>
      <div style="background:rgba(204,41,54,0.1);border:1px solid rgba(204,41,54,0.3);border-radius:8px;padding:12px;margin-bottom:20px;">
        <div style="color:var(--mod-magenta);font-size:12px;font-weight:700;">⚠️ PLACEHOLDER MODE</div>
        <div style="color:var(--mod-text-sub);font-size:11px;margin-top:4px;">Paste your Stripe keys into moderator-config.js</div>
      </div>
      <button id="payment-placeholder-close" style="background:var(--mod-bg-card);color:var(--mod-text-heading);border:1px solid var(--mod-border-primary);border-radius:8px;padding:12px 32px;font-weight:700;cursor:pointer;font-size:14px;width:100%;">
        GOT IT
      </button>
    </div>
  `;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
  document.getElementById('payment-placeholder-close')?.addEventListener('click', () => {
    document.getElementById('payment-placeholder-modal')?.remove();
  });
}

// ============================================================
// PUBLIC API
// ============================================================

export async function subscribe(tier: string): Promise<void> {
  if (isMinor()) {
    showToast('Subscriptions require parental consent for users under 18.', 'error');
    return;
  }

  if (_isPlaceholderMode) {
    showPlaceholderModal('subscription', tier);
    return;
  }

  const priceId = (STRIPE_PRICES as Record<string, string>)[`${tier}_monthly`];
  if (!priceId || isPlaceholder(priceId)) {
    showPlaceholderModal('subscription', tier);
    return;
  }

  try {
    if (!STRIPE_FUNCTION_URL || isPlaceholder(STRIPE_FUNCTION_URL)) {
      showPlaceholderModal('subscription', tier);
      return;
    }

    const userId = getCurrentUser()?.id ?? 'unknown';
    const res = await fetch(STRIPE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_checkout',
        priceId,
        userId,
        mode: 'subscription',
        successUrl: `${window.location.origin}/?payment=success`,
        cancelUrl: `${window.location.origin}/?payment=canceled`,
      }),
    });

    if (!res.ok) throw new Error(`Stripe error: ${res.status} ${res.statusText}`);
    const { sessionId } = (await res.json()) as CheckoutResponse;
    await stripe!.redirectToCheckout({ sessionId });
  } catch (e) {
    console.error('ModeratorPayments: subscribe error', e);
    showToast('Payment error. Try again.', 'error');
  }
}

export async function buyTokens(packageId: string): Promise<void> {
  if (isMinor()) {
    showToast('Token purchases require parental consent for users under 18.', 'error');
    return;
  }

  if (_isPlaceholderMode) {
    showPlaceholderModal('tokens', packageId);
    return;
  }

  const priceId = (STRIPE_PRICES as Record<string, string>)[packageId];
  if (!priceId || isPlaceholder(priceId)) {
    showPlaceholderModal('tokens', packageId);
    return;
  }

  try {
    if (!STRIPE_FUNCTION_URL || isPlaceholder(STRIPE_FUNCTION_URL)) {
      showPlaceholderModal('tokens', packageId);
      return;
    }

    const userId = getCurrentUser()?.id ?? 'unknown';
    const res = await fetch(STRIPE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_checkout',
        priceId,
        userId,
        mode: 'payment',
        successUrl: `${window.location.origin}/?payment=success`,
        cancelUrl: `${window.location.origin}/?payment=canceled`,
      }),
    });

    if (!res.ok) throw new Error(`Stripe error: ${res.status} ${res.statusText}`);
    const { sessionId } = (await res.json()) as CheckoutResponse;
    await stripe!.redirectToCheckout({ sessionId });
  } catch (e) {
    console.error('ModeratorPayments: buyTokens error', e);
    showToast('Payment error. Try again.', 'error');
  }
}

export function getIsPlaceholderMode(): boolean {
  return _isPlaceholderMode;
}

// ============================================================

export const ModeratorPayments = {
  subscribe,
  buyTokens,
  get isPlaceholderMode() {
    return _isPlaceholderMode;
  },
} as const;

// ============================================================
// AUTO-INIT (waits for auth ready, then inits Stripe)
// ============================================================
ready.then(() => init());
