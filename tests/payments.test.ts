// ============================================================
// PAYMENTS — tests/payments.test.ts
// Source: src/payments.ts
//
// CLASSIFICATION:
//   init()              — Stripe init (placeholder mode) → Behavioral test
//   subscribe()         — Placeholder modal + minor guard → Behavioral test
//   buyTokens()         — Placeholder modal + minor guard → Behavioral test
//   getIsPlaceholderMode() — State getter → Pure test
//   ModeratorPayments   — Re-export object → Shape test
//
// STRATEGY:
//   Mock config with placeholderMode.stripe=true so init() stays in placeholder mode.
//   Mock auth.ts to control user/profile state.
//   ready resolves immediately via Promise.resolve().
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCurrentUser    = vi.hoisted(() => vi.fn(() => null));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => null));
const mockShowToast         = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: (s: string) => s,
  placeholderMode: { stripe: true },
  showToast: mockShowToast,
  STRIPE_PUBLISHABLE_KEY: '',
  STRIPE_PRICES: {},
  STRIPE_FUNCTION_URL: '',
  TIERS: {},
  TOKENS: { packages: [] },
  isPlaceholder: (s: string) => !s || s.startsWith('YOUR_'),
}));

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
  ready: Promise.resolve(),
  onAuthStateChange: vi.fn(),
}));

import { subscribe, buyTokens, getIsPlaceholderMode, init, ModeratorPayments } from '../src/payments.ts';

beforeEach(() => {
  mockGetCurrentUser.mockReset().mockReturnValue(null);
  mockGetCurrentProfile.mockReset().mockReturnValue(null);
  mockShowToast.mockReset();
  document.body.innerHTML = '';
  init(); // reset state to placeholder mode
});

// ── TC1: getIsPlaceholderMode — returns true in placeholder mode ─

describe('TC1 — getIsPlaceholderMode: returns true when Stripe credentials missing', () => {
  it('returns true', () => {
    expect(getIsPlaceholderMode()).toBe(true);
  });
});

// ── TC2: subscribe — shows placeholder modal in placeholder mode ─

describe('TC2 — subscribe: shows placeholder modal when in placeholder mode', () => {
  it('appends #payment-placeholder-modal to body', async () => {
    await subscribe('pro');
    expect(document.getElementById('payment-placeholder-modal')).not.toBeNull();
  });
});

// ── TC3: subscribe — close button removes modal ───────────────

describe('TC3 — subscribe: close button removes the modal', () => {
  it('removes modal when GOT IT button is clicked', async () => {
    await subscribe('pro');
    const closeBtn = document.getElementById('payment-placeholder-close') as HTMLButtonElement;
    closeBtn.click();
    expect(document.getElementById('payment-placeholder-modal')).toBeNull();
  });
});

// ── TC4: subscribe — blocks minor users ──────────────────────

describe('TC4 — subscribe: shows toast and returns early for minors', () => {
  it('calls showToast with consent message when is_minor=true', async () => {
    mockGetCurrentProfile.mockReturnValue({ is_minor: true });
    await subscribe('pro');
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('parental consent'),
      'error'
    );
    expect(document.getElementById('payment-placeholder-modal')).toBeNull();
  });
});

// ── TC5: buyTokens — shows placeholder modal ─────────────────

describe('TC5 — buyTokens: shows placeholder modal in placeholder mode', () => {
  it('appends #payment-placeholder-modal to body', async () => {
    await buyTokens('package-50');
    expect(document.getElementById('payment-placeholder-modal')).not.toBeNull();
  });
});

// ── TC6: buyTokens — blocks minor users ──────────────────────

describe('TC6 — buyTokens: shows toast for minors', () => {
  it('calls showToast when is_minor=true', async () => {
    mockGetCurrentProfile.mockReturnValue({ is_minor: true });
    await buyTokens('package-50');
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('parental consent'),
      'error'
    );
  });
});

// ── TC7: ModeratorPayments — exports expected functions ──────

describe('TC7 — ModeratorPayments: exports subscribe and buyTokens', () => {
  it('has subscribe and buyTokens', () => {
    expect(typeof ModeratorPayments.subscribe).toBe('function');
    expect(typeof ModeratorPayments.buyTokens).toBe('function');
  });
});

// ── TC8: backdrop click removes modal ────────────────────────

describe('TC8 — subscribe: clicking backdrop removes modal', () => {
  it('removes modal when background overlay is clicked', async () => {
    await subscribe('pro');
    const modal = document.getElementById('payment-placeholder-modal')!;
    modal.click();
    expect(document.getElementById('payment-placeholder-modal')).toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/payments.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './auth.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/payments.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
