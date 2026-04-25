// ============================================================
// COSMETICS MODAL — tests/cosmetics-modal.test.ts
// Source: src/pages/cosmetics.modal.ts
//
// CLASSIFICATION:
//   initModalCallbacks():  Pure side-effect (sets closures) → behavioral
//   openConfirmModal():    DOM behavioral — reads DOM, shows modal
//   closeConfirmModal():   DOM behavioral — hides modal
//   executePurchase():     RPC wrapper — calls safeRpc('purchase_cosmetic')
//   handleEquip():         RPC wrapper — calls safeRpc('equip_cosmetic')
//   showInfoModal():       DOM behavioral — populates and shows info modal
//   closeInfoModal():      DOM behavioral — hides info modal
//
// IMPORTS:
//   { safeRpc }   from '../auth.ts'
//   { showToast } from '../config.ts'
//   type CosmeticItem from './cosmetics.types.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc  = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  onChange: vi.fn(),
  ready: Promise.resolve(),
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  escapeHTML: (s: string) => s,
  FEATURES: {},
}));

import {
  initModalCallbacks,
  openConfirmModal,
  closeConfirmModal,
  executePurchase,
  handleEquip,
  showInfoModal,
  closeInfoModal,
} from '../src/pages/cosmetics.modal.ts';

// ── Helpers ───────────────────────────────────────────────────

function buildModalDOM() {
  document.body.innerHTML = `
    <div id="confirm-modal" class="hidden">
      <div id="modal-item-name"></div>
      <div id="modal-cost-amount"></div>
      <div id="modal-balance-after"></div>
      <button id="modal-confirm">Purchase</button>
      <button id="modal-cancel">Cancel</button>
    </div>
    <div id="info-modal" class="hidden">
      <div id="info-modal-name"></div>
      <div id="info-modal-body"></div>
      <button id="info-modal-close">Got it</button>
    </div>
    <span id="token-balance-display">500</span>
  `;
}

const makeCatalog = () => [
  {
    cosmetic_id: 'c1',
    name: 'Gold Badge',
    unlock_type: 'token',
    token_cost: 100,
    owned: false,
    equipped: false,
    category: 'badge',
  },
  {
    cosmetic_id: 'c2',
    name: 'Silver Badge',
    unlock_type: 'token',
    token_cost: 200,
    owned: false,
    equipped: false,
    category: 'badge',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  buildModalDOM();
  initModalCallbacks(() => 500, vi.fn(), vi.fn());
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — initModalCallbacks wires balance getter', () => {
  it('does not throw when called with valid callbacks', () => {
    expect(() => initModalCallbacks(() => 300, vi.fn(), vi.fn())).not.toThrow();
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — openConfirmModal shows modal for token-unlock item', () => {
  it('removes hidden class from confirm-modal', () => {
    openConfirmModal('c1', makeCatalog());
    const modal = document.getElementById('confirm-modal');
    expect(modal?.classList.contains('hidden')).toBe(false);
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — openConfirmModal sets item name in modal', () => {
  it('sets modal-item-name text to the item name', () => {
    openConfirmModal('c1', makeCatalog());
    expect(document.getElementById('modal-item-name')?.textContent).toBe('Gold Badge');
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — openConfirmModal does nothing for unknown cosmetic ID', () => {
  it('modal stays hidden when cosmeticId is not in catalog', () => {
    openConfirmModal('unknown', makeCatalog());
    expect(document.getElementById('confirm-modal')?.classList.contains('hidden')).toBe(true);
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — openConfirmModal disables confirm button when balance is insufficient', () => {
  it('btn.disabled is true when cost > balance', () => {
    initModalCallbacks(() => 50, vi.fn(), vi.fn()); // balance = 50, cost = 100
    openConfirmModal('c1', makeCatalog());
    const btn = document.getElementById('modal-confirm') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — closeConfirmModal adds hidden class to confirm-modal', () => {
  it('hides the confirm modal', () => {
    document.getElementById('confirm-modal')!.classList.remove('hidden');
    closeConfirmModal();
    expect(document.getElementById('confirm-modal')?.classList.contains('hidden')).toBe(true);
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — executePurchase calls safeRpc purchase_cosmetic', () => {
  it('calls safeRpc with purchase_cosmetic and p_cosmetic_id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { new_balance: 400 }, error: null });
    const btn = document.createElement('button') as HTMLButtonElement;
    document.body.appendChild(btn);

    await executePurchase('c1', btn, makeCatalog());
    expect(mockSafeRpc).toHaveBeenCalledWith('purchase_cosmetic', { p_cosmetic_id: 'c1' });
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — executePurchase shows toast on successful purchase', () => {
  it('calls showToast with success message', async () => {
    mockSafeRpc.mockResolvedValue({ data: { new_balance: 400 }, error: null });
    const btn = document.createElement('button') as HTMLButtonElement;
    document.body.appendChild(btn);

    await executePurchase('c1', btn, makeCatalog());
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Gold Badge'),
      'success'
    );
  });
});

// ── TC9 ───────────────────────────────────────────────────────

describe('TC9 — executePurchase shows error toast on RPC failure', () => {
  it('calls showToast with error type when safeRpc returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    const btn = document.createElement('button') as HTMLButtonElement;
    document.body.appendChild(btn);

    await executePurchase('c1', btn, makeCatalog());
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });
});

// ── TC10 ──────────────────────────────────────────────────────

describe('TC10 — handleEquip calls safeRpc equip_cosmetic', () => {
  it('calls safeRpc with equip_cosmetic and p_cosmetic_id', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    const btn = document.createElement('button') as HTMLButtonElement;
    document.body.appendChild(btn);

    await handleEquip('c1', btn, makeCatalog());
    expect(mockSafeRpc).toHaveBeenCalledWith('equip_cosmetic', { p_cosmetic_id: 'c1' });
  });
});

// ── TC11 ──────────────────────────────────────────────────────

describe('TC11 — showInfoModal populates and shows info modal', () => {
  it('sets info-modal-name, info-modal-body, and removes hidden class', () => {
    showInfoModal('Test Title', 'Test body text');
    expect(document.getElementById('info-modal-name')?.textContent).toBe('Test Title');
    expect(document.getElementById('info-modal-body')?.textContent).toBe('Test body text');
    expect(document.getElementById('info-modal')?.classList.contains('hidden')).toBe(false);
  });
});

// ── TC12 ──────────────────────────────────────────────────────

describe('TC12 — closeInfoModal hides the info modal', () => {
  it('adds hidden class to info-modal', () => {
    document.getElementById('info-modal')!.classList.remove('hidden');
    closeInfoModal();
    expect(document.getElementById('info-modal')?.classList.contains('hidden')).toBe(true);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/cosmetics.modal.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../config.ts', './cosmetics.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/cosmetics.modal.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
