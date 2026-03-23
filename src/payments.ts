/**
 * THE COLOSSEUM — Payments Module (TypeScript)
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

function showToast(msg: string, type: 'success' | 'error' = 'success'): void {
  const t = document.createElement('div');
  const bg = type === 'error' ? '#e74c3c' : '#2ecc71';
  t.style.cssText = `position:fixed;top:80px;left:50%;transform:translateX(-50%);background:${bg};color:#fff;padding:12px 24px;border-radius:8px;font-weight:700;z-index:9999;font-size:14px;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
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
    title = `${tierInfo.name.toUpperCase()} — $${tierInfo.price}/mo`;
    body = `Stripe not connected yet. When live, this button will open Stripe Checkout for the ${tierInfo.name} tier.`;
  } else if (type === 'tokens' && tokenPkg) {
    title = `${tokenPkg.amount} TOKENS — $${tokenPkg.price}`;
    body = `Stripe not connected yet. When live, this will purchase ${tokenPkg.amount} tokens via Stripe Checkout.`;
  } else {
    title = 'PAYMENT';
    body = 'Stripe not connected. See moderator-config.js and DEPLOYMENT-GUIDE.md.';
  }

  const modal = document.createElement('div');
  modal.id = 'payment-placeholder-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;
  modal.innerHTML = `
    <div style="background:#132240;border:1px solid rgba(212,168,67,0.3);border-radius:12px;max-width:360px;width:100%;padding:24px;text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:#d4a843;margin-bottom:8px;">${escapeHTML(title)}</div>
      <div style="color:#a0a8b8;font-size:14px;line-height:1.5;margin-bottom:20px;">${escapeHTML(body)}</div>
      <div style="background:rgba(204,41,54,0.1);border:1px solid rgba(204,41,54,0.3);border-radius:8px;padding:12px;margin-bottom:20px;">
        <div style="color:#cc2936;font-size:12px;font-weight:700;">⚠️ PLACEHOLDER MODE</div>
        <div style="color:#a0a8b8;font-size:11px;margin-top:4px;">Paste your Stripe keys into moderator-config.js</div>
      </div>
      <button onclick="this.closest('#payment-placeholder-modal').remove()" style="background:#1a2d4a;color:#f0f0f0;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px 32px;font-weight:700;cursor:pointer;font-size:14px;width:100%;">
        GOT IT
      </button>
    </div>
  `;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
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
