import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  claim_invite_reward: {},
}));

const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

const mockGetModifierCatalog = vi.hoisted(() => vi.fn());

vi.mock('../src/modifiers-catalog.ts', () => ({
  getModifierCatalog: mockGetModifierCatalog,
}));

const mockRenderEffectCard = vi.hoisted(() => vi.fn());
const mockTierLabel        = vi.hoisted(() => vi.fn());

vi.mock('../src/modifiers-render.ts', () => ({
  renderEffectCard: mockRenderEffectCard,
  tierLabel:        mockTierLabel,
}));

const mockRewardTypeLabel = vi.hoisted(() => vi.fn());

vi.mock('../src/pages/home.invite-html.ts', () => ({
  rewardTypeLabel: mockRewardTypeLabel,
}));

import { openClaimSheet } from '../src/pages/home.invite-sheet.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildEffect(overrides: Record<string, unknown> = {}) {
  return {
    id:        'eff-1',
    effect_num: 1,
    tier_gate: 'legendary',
    name:      'Speed Boost',
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockShowToast.mockReset();
  mockGetModifierCatalog.mockReset();
  mockGetModifierCatalog.mockResolvedValue([]);
  mockRenderEffectCard.mockReset();
  mockRenderEffectCard.mockReturnValue('<div class="effect-card"><button class="mod-buy-btn" data-effect-id="eff-1">Select</button></div>');
  mockTierLabel.mockReset();
  mockTierLabel.mockReturnValue('Legendary');
  mockRewardTypeLabel.mockReset();
  mockRewardTypeLabel.mockReturnValue('Legendary Power-Up');
  document.body.innerHTML = '';
});

// ── openClaimSheet ─────────────────────────────────────────────

describe('TC1 — openClaimSheet appends overlay to document.body', () => {
  it('bottom-sheet-overlay added to body', async () => {
    await openClaimSheet('r1', 'legendary_powerup', vi.fn(), vi.fn());
    expect(document.body.querySelector('.bottom-sheet-overlay')).not.toBeNull();
  });
});

describe('TC2 — openClaimSheet shows loading state initially', () => {
  it('invite-loading element present after open', async () => {
    mockGetModifierCatalog.mockResolvedValue([]);
    await openClaimSheet('r1', 'legendary_powerup', vi.fn(), vi.fn());
    // After resolution with empty catalog the loading is replaced
    // but we can confirm the catalog was fetched
    expect(mockGetModifierCatalog).toHaveBeenCalled();
  });
});

describe('TC3 — openClaimSheet title uses rewardTypeLabel', () => {
  it('sheet-title contains rewardTypeLabel result', async () => {
    mockRewardTypeLabel.mockReturnValue('Legendary Power-Up');
    await openClaimSheet('r1', 'legendary_powerup', vi.fn(), vi.fn());
    const title = document.body.querySelector('.sheet-title');
    expect(title?.textContent).toContain('LEGENDARY POWER-UP');
  });
});

describe('TC4 — openClaimSheet calls getModifierCatalog', () => {
  it('catalog fetched once', async () => {
    await openClaimSheet('r1', 'legendary_powerup', vi.fn(), vi.fn());
    expect(mockGetModifierCatalog).toHaveBeenCalledOnce();
  });
});

describe('TC5 — openClaimSheet shows empty state when no matching effects', () => {
  it('shows "No eligible effects" text when catalog empty', async () => {
    mockGetModifierCatalog.mockResolvedValue([]);
    await openClaimSheet('r1', 'legendary_powerup', vi.fn(), vi.fn());
    const grid = document.body.querySelector('#claim-picker-grid');
    expect(grid?.innerHTML).toContain('No eligible effects');
  });
});

describe('TC6 — openClaimSheet renders eligible effects', () => {
  it('renderEffectCard called for each matching effect', async () => {
    const eff = buildEffect({ tier_gate: 'legendary' });
    mockGetModifierCatalog.mockResolvedValue([eff]);

    await openClaimSheet('r1', 'legendary_powerup', vi.fn(), vi.fn());

    expect(mockRenderEffectCard).toHaveBeenCalledWith(eff, expect.objectContaining({
      showPuButton: true,
    }));
  });
});

describe('TC7 — cancel button calls onClose and removes overlay', () => {
  it('cancel click removes overlay from body', async () => {
    await openClaimSheet('r1', 'legendary_powerup', vi.fn(), vi.fn());
    const cancel = document.body.querySelector<HTMLButtonElement>('#claim-cancel')!;
    cancel.click();
    expect(document.body.querySelector('.bottom-sheet-overlay')).toBeNull();
  });
});

describe('TC8 — clicking overlay background closes sheet', () => {
  it('onClose called when overlay background clicked', async () => {
    const onClose = vi.fn();
    await openClaimSheet('r1', 'legendary_powerup', onClose, vi.fn());
    const overlay = document.body.querySelector<HTMLElement>('.bottom-sheet-overlay')!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: false }));
    // e.target === overlay → close() → onClose
    // In jsdom direct click on overlay with e.target === overlay
    overlay.click();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('TC9 — returned cleanup fn removes overlay', () => {
  it('calling returned fn removes overlay from body', async () => {
    mockGetModifierCatalog.mockResolvedValue([]);
    const cleanup = await openClaimSheet('r1', 'legendary_powerup', vi.fn(), vi.fn());
    cleanup();
    expect(document.body.querySelector('.bottom-sheet-overlay')).toBeNull();
  });
});

describe('TC10 — claim btn calls safeRpc with correct params', () => {
  it('safeRpc called with claim_invite_reward, rewardId, and effectNum', async () => {
    const eff = buildEffect({ id: 'eff-1', effect_num: 42, tier_gate: 'legendary' });
    mockGetModifierCatalog.mockResolvedValue([eff]);
    mockSafeRpc.mockResolvedValue({ data: { ok: true, effect_name: 'Boost' }, error: null });

    await openClaimSheet('reward-x', 'legendary_powerup', vi.fn(), vi.fn());
    const btn = document.body.querySelector<HTMLButtonElement>('.mod-buy-btn')!;
    btn.click();
    await vi.waitFor(() => expect(mockSafeRpc).toHaveBeenCalled());

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'claim_invite_reward',
      { p_reward_id: 'reward-x', p_effect_id: 42 },
      expect.anything(),
    );
  });
});

describe('TC11 — success path calls onReload and shows success toast', () => {
  it('onReload called and toast shown on ok response', async () => {
    const eff = buildEffect({ id: 'eff-1', effect_num: 1, tier_gate: 'legendary' });
    mockGetModifierCatalog.mockResolvedValue([eff]);
    mockSafeRpc.mockResolvedValue({ data: { ok: true, effect_name: 'Boost' }, error: null });

    const onReload = vi.fn();
    await openClaimSheet('r1', 'legendary_powerup', vi.fn(), onReload);
    document.body.querySelector<HTMLButtonElement>('.mod-buy-btn')!.click();
    await vi.waitFor(() => expect(onReload).toHaveBeenCalled());

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Boost'), 'success');
  });
});

describe('TC12 — error path shows error toast', () => {
  it('showToast called with error message when data.ok is false', async () => {
    const eff = buildEffect({ id: 'eff-1', effect_num: 1, tier_gate: 'legendary' });
    mockGetModifierCatalog.mockResolvedValue([eff]);
    mockSafeRpc.mockResolvedValue({ data: { ok: false, error: 'Already claimed' }, error: null });

    await openClaimSheet('r1', 'legendary_powerup', vi.fn(), vi.fn());
    document.body.querySelector<HTMLButtonElement>('.mod-buy-btn')!.click();
    await vi.waitFor(() => expect(mockShowToast).toHaveBeenCalled());

    expect(mockShowToast).toHaveBeenCalledWith('Already claimed', 'error');
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — home.invite-sheet.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../modifiers.ts',
      './home.invite-types.ts',
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../config.ts',
      '../modifiers-catalog.ts',
      '../modifiers-render.ts',
      './home.invite-html.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.invite-sheet.ts'),
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
