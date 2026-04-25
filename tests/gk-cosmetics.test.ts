// ============================================================
// GK F-31 — COSMETICS STORE TESTS — tests/gk-cosmetics.test.ts
// Source: src/pages/cosmetics.ts
//
// SPEC: THE-MODERATOR-PUNCH-LIST.md row F-31
//   Backend: cosmetic_items, user_cosmetics tables;
//   get_cosmetic_catalog(), purchase_cosmetic(), equip_cosmetic() RPCs.
//   UI: moderator-cosmetics.html, src/pages/cosmetics.ts.
//
// IMPORTS (from source):
//   { ready, getCurrentUser, getCurrentProfile, getIsPlaceholderMode, safeRpc } from '../auth.ts'
//   { showToast, FEATURES } from '../config.ts'
//   { TABS } from './cosmetics.types.ts'
//   { renderTab as _renderTab } from './cosmetics.render.ts'
//   { initModalCallbacks, closeConfirmModal, closeInfoModal } from './cosmetics.modal.ts'
//   type { CosmeticItem, Category } from './cosmetics.types.ts'
//
// DESIGN NOTE: cosmetics.ts is a page controller with no exports.
// All behavior is triggered via DOMContentLoaded. Module is imported
// once to avoid listener accumulation from multiple dynamic imports.
// vi.hoisted() is used for all mock factories and shared test data.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc            = vi.hoisted(() => vi.fn());
const mockShowToast          = vi.hoisted(() => vi.fn());
const mockGetCurrentUser     = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile  = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholder   = vi.hoisted(() => vi.fn());
const mockRenderTab          = vi.hoisted(() => vi.fn());
const mockInitModalCallbacks = vi.hoisted(() => vi.fn());
const mockCloseConfirmModal  = vi.hoisted(() => vi.fn());
const mockCloseInfoModal     = vi.hoisted(() => vi.fn());
const mockFeatures           = vi.hoisted(() => ({ cosmetics: true }));
const MOCK_TABS              = vi.hoisted(() => [
  { key: 'badge',              label: 'Badges',      icon: '🏅' },
  { key: 'title',              label: 'Titles',      icon: '👑' },
  { key: 'border',             label: 'Borders',     icon: '⬡'  },
  { key: 'entrance_animation', label: 'Entrance',    icon: '⚡' },
  { key: 'reaction_effect',    label: 'Reactions',   icon: '🔥' },
  { key: 'profile_background', label: 'Backgrounds', icon: '🖼️' },
]);

vi.mock('../src/auth.ts', () => ({
  ready:                Promise.resolve(),
  getCurrentUser:       mockGetCurrentUser,
  getCurrentProfile:    mockGetCurrentProfile,
  getIsPlaceholderMode: mockGetIsPlaceholder,
  safeRpc:              mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  FEATURES:  mockFeatures,
}));

vi.mock('../src/pages/cosmetics.types.ts', () => ({
  TABS: MOCK_TABS,
}));

vi.mock('../src/pages/cosmetics.render.ts', () => ({
  renderTab: mockRenderTab,
}));

vi.mock('../src/pages/cosmetics.modal.ts', () => ({
  initModalCallbacks: mockInitModalCallbacks,
  closeConfirmModal:  mockCloseConfirmModal,
  closeInfoModal:     mockCloseInfoModal,
}));

// Import AFTER mocks — single import to avoid listener accumulation
import '../src/pages/cosmetics.ts';

// ── Helpers ───────────────────────────────────────────────────

function buildBaseDOM() {
  document.body.innerHTML = `
    <div id="cosmetics-loader"></div>
    <div id="cosmetics-app"></div>`;
}

function makeCatalogItem(overrides = {}) {
  return {
    cosmetic_id:      'item-1',
    name:             'Sword Badge',
    category:         'badge',
    tier:             1,
    sort_order:       1,
    unlock_type:      'token',
    token_cost:       100,
    owned:            false,
    equipped:         false,
    asset_url:        null,
    depth_threshold:  null,
    unlock_condition: null,
    acquired_via:     null,
    metadata:         null,
    ...overrides,
  };
}

async function fireDOMContentLoaded() {
  window.dispatchEvent(new Event('DOMContentLoaded'));
  await new Promise(r => setTimeout(r, 0));
  await new Promise(r => setTimeout(r, 0));
}

// ── Global hooks ──────────────────────────────────────────────

afterEach(async () => {
  // Flush any async tails from the DOMContentLoaded handler so
  // they complete before the next test's beforeEach resets mocks.
  for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0));
});

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockShowToast.mockReset();
  mockGetCurrentUser.mockReset();
  mockGetCurrentProfile.mockReset();
  mockGetIsPlaceholder.mockReset();
  mockRenderTab.mockReset();
  mockInitModalCallbacks.mockReset();
  mockCloseConfirmModal.mockReset();
  mockCloseInfoModal.mockReset();
  mockFeatures.cosmetics = true;

  // Safe defaults so any async tails from prior tests complete without crashing.
  mockGetCurrentUser.mockReturnValue({ id: 'default-user' });
  mockGetCurrentProfile.mockReturnValue({ token_balance: 0 });
  mockGetIsPlaceholder.mockReturnValue(false);
  mockSafeRpc.mockResolvedValue({ data: [], error: null });

  buildBaseDOM();
});

// ── TC1: get_cosmetic_catalog RPC called on page load ─────────

describe('TC1 — get_cosmetic_catalog RPC called on page load', () => {
  it('calls safeRpc with "get_cosmetic_catalog" when FEATURES.cosmetics is true', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 0 });
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await fireDOMContentLoaded();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_cosmetic_catalog');
  });
});

// ── TC2: RPC error → showToast with error message ─────────────

describe('TC2 — RPC error shows error toast', () => {
  it('calls showToast("Failed to load Armory. Please refresh.", "error") on RPC failure', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 0 });
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'server error' } });

    await fireDOMContentLoaded();

    expect(mockShowToast).toHaveBeenCalledWith(
      'Failed to load Armory. Please refresh.',
      'error',
    );
  });
});

// ── TC3: RPC error → renderTab not called ─────────────────────

describe('TC3 — RPC error does not render shop', () => {
  it('does not call renderTab when catalog RPC fails', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 50 });
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });

    await fireDOMContentLoaded();

    expect(mockRenderTab).not.toHaveBeenCalled();
  });
});

// ── TC4: RPC success → renderTab is called ────────────────────

describe('TC4 — RPC success calls renderTab', () => {
  it('calls renderTab after a successful catalog fetch', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 200 });
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: [makeCatalogItem()], error: null });

    await fireDOMContentLoaded();

    expect(mockRenderTab).toHaveBeenCalled();
  });
});

// ── TC5: Token balance from profile is displayed in the shop header ──

describe('TC5 — token balance displayed from profile', () => {
  it('shows profile token_balance in the #token-balance-display element', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 1250 });
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: [makeCatalogItem()], error: null });

    await fireDOMContentLoaded();

    const balanceEl = document.getElementById('token-balance-display');
    expect(balanceEl).not.toBeNull();
    expect(balanceEl!.textContent).toBe((1250).toLocaleString());
  });
});

// ── TC6: renderShell renders tab nav with all 6 TABS ──────────

describe('TC6 — renderShell renders all 6 category tabs', () => {
  it('creates a tab button for each entry in TABS', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 0 });
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: [makeCatalogItem()], error: null });

    await fireDOMContentLoaded();

    const buttons = document.querySelectorAll('.tab-btn');
    expect(buttons.length).toBe(MOCK_TABS.length);
  });
});

// ── TC7: Tab click changes activeTab and calls rerender ────────

describe('TC7 — tab click rerenders with new active tab', () => {
  it('calls renderTab with the clicked tab key after clicking a different tab', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 0 });
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: [makeCatalogItem()], error: null });

    await fireDOMContentLoaded();

    mockRenderTab.mockReset();

    const titleTab = Array.from(document.querySelectorAll<HTMLButtonElement>('.tab-btn'))
      .find(b => b.dataset.tab === 'title');
    titleTab?.click();

    expect(mockRenderTab).toHaveBeenCalled();
    const callArgs = mockRenderTab.mock.calls[0];
    expect(callArgs[0]).toBe('title');
  });
});

// ── TC8: Clicking confirm-modal backdrop calls closeConfirmModal ─

describe('TC8 — confirm-modal backdrop click closes modal', () => {
  it('calls closeConfirmModal when clicking on confirm-modal overlay itself', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 0 });
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: [makeCatalogItem()], error: null });

    await fireDOMContentLoaded();

    const modal = document.getElementById('confirm-modal') as HTMLElement;
    modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(mockCloseConfirmModal).toHaveBeenCalled();
  });
});

// ── TC9: modal-cancel button closes confirm modal ──────────────

describe('TC9 — modal-cancel button closes confirm modal', () => {
  it('calls closeConfirmModal when the cancel button is clicked', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 0 });
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: [makeCatalogItem()], error: null });

    await fireDOMContentLoaded();

    const cancelBtn = document.getElementById('modal-cancel') as HTMLButtonElement;
    cancelBtn.click();

    expect(mockCloseConfirmModal).toHaveBeenCalled();
  });
});

// ── TC10: info-modal backdrop click closes info modal ─────────

describe('TC10 — info-modal backdrop click closes info modal', () => {
  it('calls closeInfoModal when clicking the info-modal overlay itself', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 0 });
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: [makeCatalogItem()], error: null });

    await fireDOMContentLoaded();

    const infoModal = document.getElementById('info-modal') as HTMLElement;
    infoModal.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(mockCloseInfoModal).toHaveBeenCalled();
  });
});

// ── TC11: info-modal-close button closes info modal ───────────

describe('TC11 — info-modal-close button closes info modal', () => {
  it('calls closeInfoModal when the "Got it" close button is clicked', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 0 });
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: [makeCatalogItem()], error: null });

    await fireDOMContentLoaded();

    const closeBtn = document.getElementById('info-modal-close') as HTMLButtonElement;
    closeBtn.click();

    expect(mockCloseInfoModal).toHaveBeenCalled();
  });
});

// ── TC12: showLoading(true) toggles visibility ────────────────

describe('TC12 — showLoading true shows loader and hides app', () => {
  it('loader loses "hidden" and app gains "hidden" while loading', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 0 });
    mockGetIsPlaceholder.mockReturnValue(false);

    // Make safeRpc never resolve so the loading state persists during the check.
    let resolveRpc!: (v: unknown) => void;
    mockSafeRpc.mockReturnValue(new Promise(r => { resolveRpc = r; }));

    window.dispatchEvent(new Event('DOMContentLoaded'));
    // One tick: DOMContentLoaded handler fires, awaits ready, calls loadShop → showLoading(true)
    await new Promise(r => setTimeout(r, 0));

    const loader = document.getElementById('cosmetics-loader')!;
    const app    = document.getElementById('cosmetics-app')!;
    expect(loader.classList.contains('hidden')).toBe(false);
    expect(app.classList.contains('hidden')).toBe(true);

    // Settle the pending RPC so afterEach flush completes cleanly.
    resolveRpc({ data: [], error: null });
    await new Promise(r => setTimeout(r, 0));
  });
});

// ── TC13: showLoading(false) restores visibility ──────────────

describe('TC13 — showLoading false hides loader and shows app', () => {
  it('loader gains "hidden" and app loses "hidden" after successful load', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 0 });
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: [makeCatalogItem()], error: null });

    await fireDOMContentLoaded();

    const loader = document.getElementById('cosmetics-loader')!;
    const app    = document.getElementById('cosmetics-app')!;
    expect(loader.classList.contains('hidden')).toBe(true);
    expect(app.classList.contains('hidden')).toBe(false);
  });
});

// ── TC14: Logged-in user sees token balance display ───────────

describe('TC14 — logged-in user sees token balance display', () => {
  it('renders token-display with token-balance-display element when logged in', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ token_balance: 500 });
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await fireDOMContentLoaded();

    const tokenDisplay = document.querySelector('.token-display');
    expect(tokenDisplay).not.toBeNull();
    const balanceEl = document.getElementById('token-balance-display');
    expect(balanceEl).not.toBeNull();
  });
});

// ── TC15: Logged-out user sees sign-in link ───────────────────

describe('TC15 — logged-out user sees sign-in link', () => {
  it('renders a sign-in link (no token-display) when user is not logged in', async () => {
    mockGetCurrentUser.mockReturnValue(null);
    mockGetCurrentProfile.mockReturnValue(null);
    mockGetIsPlaceholder.mockReturnValue(false);
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await fireDOMContentLoaded();

    expect(document.querySelector('.token-display')).toBeNull();
    const signInLink = document.querySelector('a.btn-signin-header, a[href*="plinko"]');
    expect(signInLink).not.toBeNull();
  });
});

// ── ARCHITECTURE: allowed-import contract ─────────────────────

describe('ARCHITECTURE — src/pages/cosmetics.ts import contract', () => {
  it('has no imports outside the allowed list', () => {
    const src = readFileSync(resolve(__dirname, '../src/pages/cosmetics.ts'), 'utf-8');

    const ALLOWED = [
      '../auth.ts',
      '../config.ts',
      './cosmetics.types.ts',
      './cosmetics.render.ts',
      './cosmetics.modal.ts',
    ];

    const importLines = src
      .split('\n')
      .filter(l => /^import\s/.test(l));

    for (const line of importLines) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!match) continue;
      expect(ALLOWED).toContain(match[1]);
    }
  });
});
