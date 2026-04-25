// ============================================================
// PAYWALL — tests/paywall.test.ts
// Source: src/paywall.ts
//
// CLASSIFICATION:
//   VARIANTS      — Constant data → Value test
//   gate()        — Pure guard + show() side-effect → Integration test
//   show()        — DOM creation → Behavioral test
//   dismiss()     — DOM removal → Behavioral test
//
// IMPORTS:
//   { escapeHTML }       from './config.ts'
//   { getCurrentProfile } from './auth.ts'
//   { navigateTo }        from './navigation.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => null));
const mockNavigateTo = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/navigation.ts', () => ({
  navigateTo: mockNavigateTo,
}));

import { VARIANTS, gate, show, dismiss } from '../src/paywall.ts';

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
  mockGetCurrentProfile.mockReturnValue(null);
  mockNavigateTo.mockReset();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

// ── VARIANTS ──────────────────────────────────────────────────

describe('TC1 — VARIANTS: has 4 paywall variants', () => {
  it('contains general, shop, social, leaderboard variants', () => {
    expect(VARIANTS.general).toBeDefined();
    expect(VARIANTS.shop).toBeDefined();
    expect(VARIANTS.social).toBeDefined();
    expect(VARIANTS.leaderboard).toBeDefined();
  });
});

describe('TC2 — VARIANTS: each variant has title, subtitle, cta, icon', () => {
  it('every variant has all required fields', () => {
    for (const [, v] of Object.entries(VARIANTS)) {
      expect(typeof v.title).toBe('string');
      expect(typeof v.subtitle).toBe('string');
      expect(typeof v.cta).toBe('string');
      expect(typeof v.icon).toBe('string');
    }
  });
});

// ── gate ──────────────────────────────────────────────────────

describe('TC3 — gate: returns true when no profile (non-blocking)', () => {
  it('allows through when getCurrentProfile returns null', () => {
    mockGetCurrentProfile.mockReturnValue(null);
    expect(gate('private_rooms')).toBe(true);
  });
});

describe('TC4 — gate: returns true when user tier meets requirement', () => {
  it('allows champion user for contender-required feature', () => {
    mockGetCurrentProfile.mockReturnValue({ subscription_tier: 'champion' });
    expect(gate('private_rooms', 'contender')).toBe(true);
    expect(document.getElementById('paywall-modal')).toBeNull();
  });
});

describe('TC5 — gate: returns false and shows modal when tier insufficient', () => {
  it('blocks free user from contender-required feature and shows modal', () => {
    mockGetCurrentProfile.mockReturnValue({ subscription_tier: 'free' });

    const allowed = gate('private_rooms', 'contender');

    expect(allowed).toBe(false);
    expect(document.getElementById('paywall-modal')).not.toBeNull();
  });
});

describe('TC6 — gate: picks correct variant for feature', () => {
  it('uses social variant for private_rooms feature', () => {
    mockGetCurrentProfile.mockReturnValue({ subscription_tier: 'free' });

    gate('private_rooms', 'contender');

    const modal = document.getElementById('paywall-modal');
    expect(modal?.innerHTML).toContain('CONNECT');
  });
});

// ── show ──────────────────────────────────────────────────────

describe('TC7 — show: creates #paywall-modal in DOM', () => {
  it('appends #paywall-modal to body', () => {
    show('general');
    expect(document.getElementById('paywall-modal')).not.toBeNull();
  });
});

describe('TC8 — show: replaces existing modal', () => {
  it('only one #paywall-modal exists after two show calls', () => {
    show('general');
    show('shop');
    expect(document.querySelectorAll('#paywall-modal')).toHaveLength(1);
  });
});

describe('TC9 — show: dismiss button removes modal', () => {
  it('clicking dismiss button removes #paywall-modal', () => {
    show('general');
    const dismissBtn = document.getElementById('paywall-dismiss-btn') as HTMLButtonElement;
    dismissBtn.click();
    expect(document.getElementById('paywall-modal')).toBeNull();
  });
});

describe('TC10 — show: CTA button calls navigateTo("shop")', () => {
  it('clicking CTA navigates to shop', () => {
    show('general');
    const ctaBtn = document.getElementById('paywall-cta-btn') as HTMLButtonElement;
    ctaBtn.click();
    expect(mockNavigateTo).toHaveBeenCalledWith('shop');
  });
});

describe('TC11 — show: backdrop click removes modal', () => {
  it('clicking the modal overlay (not sheet) removes it', () => {
    show('general');
    const modal = document.getElementById('paywall-modal')!;
    modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('paywall-modal')).toBeNull();
  });
});

// ── dismiss ───────────────────────────────────────────────────

describe('TC12 — dismiss: removes modal after 300ms animation', () => {
  it('modal is removed after setTimeout fires', () => {
    vi.useFakeTimers();
    show('general');
    dismiss();
    vi.advanceTimersByTime(300);
    expect(document.getElementById('paywall-modal')).toBeNull();
  });
});

describe('TC13 — dismiss: no-op when modal not present', () => {
  it('does not throw when #paywall-modal is absent', () => {
    expect(() => dismiss()).not.toThrow();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/paywall.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './auth.ts', './navigation.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/paywall.ts'),
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
