/**
 * Integration tests — seam #216
 * src/pages/home.invite-sheet.ts → modifiers
 *
 * Covers: openClaimSheet DOM mounting, catalog filtering by tier,
 * cancel/overlay-close, claim RPC call, success/error toast flow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ARCH filter (source.split('\n').filter(l => /from\s+['"]/.test(l))):
//   import type { ModifierEffect, RarityTier } from '../modifiers.ts';
//   import type { InviteReward } from './home.invite-types.ts';
//   import { safeRpc } from '../auth.ts';
//   import { claim_invite_reward } from '../contracts/rpc-schemas.ts';
//   import { showToast } from '../config.ts';
//   import { getModifierCatalog } from '../modifiers-catalog.ts';
//   import { renderEffectCard, tierLabel } from '../modifiers-render.ts';
//   import { rewardTypeLabel } from './home.invite-html.ts';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEffect(
  overrides: Partial<import('../../src/modifiers').ModifierEffect> = {},
): import('../../src/modifiers').ModifierEffect {
  return {
    id: 'eff-001',
    effect_num: 1,
    name: 'Iron Will',
    description: '+5 points per round',
    category: 'point',
    timing: 'in_debate',
    tier_gate: 'mythic',
    mod_cost: 500,
    pu_cost: 250,
    ...overrides,
  };
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('seam #216 | home.invite-sheet → modifiers', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  let sheetModule: typeof import('../../src/pages/home.invite-sheet');
  let catalogMock: ReturnType<typeof vi.fn>;
  let safeRpcMock: ReturnType<typeof vi.fn>;
  let showToastMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    // Mock config
    showToastMock = vi.fn();
    vi.doMock('../../src/config.ts', () => ({
      showToast: showToastMock,
      ModeratorConfig: {
        escapeHTML: (s: string) => s,
      },
      escapeHTML: (s: string) => s,
      friendlyError: (e: unknown) => String(e),
    }));

    // Mock auth (safeRpc)
    safeRpcMock = vi.fn();
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: safeRpcMock,
    }));

    // Mock modifiers-catalog
    catalogMock = vi.fn();
    vi.doMock('../../src/modifiers-catalog.ts', () => ({
      getModifierCatalog: catalogMock,
    }));

    // Mock contracts/rpc-schemas (just pass through the symbol)
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      claim_invite_reward: {},
      get_modifier_catalog: {},
    }));

    sheetModule = await import('../../src/pages/home.invite-sheet');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ── TC1: openClaimSheet mounts overlay into DOM ────────────────────────

  it('TC1: openClaimSheet appends bottom-sheet-overlay with loading state before catalog resolves', async () => {
    // Make catalog hang indefinitely so we can inspect DOM before it resolves
    let resolveCatalog!: (v: import('../../src/modifiers').ModifierEffect[]) => void;
    catalogMock.mockReturnValue(new Promise(r => { resolveCatalog = r; }));

    const onClose  = vi.fn();
    const onReload = vi.fn();

    // Don't await — inspect mid-flight
    const promise = sheetModule.openClaimSheet('reward-abc', 'mythic_modifier', onClose, onReload);

    // Overlay should already be in DOM
    const overlay = document.querySelector('.bottom-sheet-overlay');
    expect(overlay).not.toBeNull();

    const grid = document.querySelector('#claim-picker-grid');
    expect(grid).not.toBeNull();
    expect(grid!.textContent).toContain('Loading catalog');

    // Resolve catalog to avoid leaking promise
    resolveCatalog([]);
    await promise;
  });

  // ── TC2: Cancel button calls onClose and removes overlay ──────────────

  it('TC2: clicking Cancel button removes overlay and calls onClose', async () => {
    catalogMock.mockResolvedValue([]);
    const onClose  = vi.fn();
    const onReload = vi.fn();

    await sheetModule.openClaimSheet('reward-abc', 'mythic_modifier', onClose, onReload);

    const cancelBtn = document.querySelector<HTMLButtonElement>('#claim-cancel');
    expect(cancelBtn).not.toBeNull();

    cancelBtn!.click();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.bottom-sheet-overlay')).toBeNull();
  });

  // ── TC3: Overlay background click closes the sheet ────────────────────

  it('TC3: clicking the overlay backdrop closes the sheet and calls onClose', async () => {
    catalogMock.mockResolvedValue([]);
    const onClose  = vi.fn();
    const onReload = vi.fn();

    await sheetModule.openClaimSheet('reward-xyz', 'legendary_powerup', onClose, onReload);

    const overlay = document.querySelector<HTMLElement>('.bottom-sheet-overlay')!;
    expect(overlay).not.toBeNull();

    // Simulate click directly on the overlay element (target === overlay)
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.bottom-sheet-overlay')).toBeNull();
  });

  // ── TC4: Eligible effects render .mod-buy-btn buttons ─────────────────

  it('TC4: mythic_modifier with matching catalog effects renders mod-buy-btn buttons with data-effect-id', async () => {
    const effect1 = makeEffect({ id: 'eff-m1', effect_num: 10, tier_gate: 'mythic' });
    const effect2 = makeEffect({ id: 'eff-m2', effect_num: 11, tier_gate: 'mythic' });
    const effectOther = makeEffect({ id: 'eff-leg', effect_num: 5, tier_gate: 'legendary' });
    catalogMock.mockResolvedValue([effect1, effect2, effectOther]);

    const onClose  = vi.fn();
    const onReload = vi.fn();

    await sheetModule.openClaimSheet('reward-111', 'mythic_modifier', onClose, onReload);

    const buttons = document.querySelectorAll<HTMLButtonElement>('.mod-buy-btn');
    // mythic_modifier uses showModButton — should render one button per mythic effect
    expect(buttons.length).toBeGreaterThanOrEqual(2);

    const effectIds = Array.from(buttons).map(b => b.dataset.effectId);
    expect(effectIds).toContain('eff-m1');
    expect(effectIds).toContain('eff-m2');
    // Non-mythic should not appear
    expect(effectIds).not.toContain('eff-leg');
  });

  // ── TC5: Empty catalog shows empty-state message ──────────────────────

  it('TC5: when no catalog effects match the tier, grid shows empty-state message', async () => {
    // Only legendary effects in catalog, but reward wants mythic
    const effectLeg = makeEffect({ id: 'eff-only-leg', tier_gate: 'legendary' });
    catalogMock.mockResolvedValue([effectLeg]);

    const onClose  = vi.fn();
    const onReload = vi.fn();

    await sheetModule.openClaimSheet('reward-empty', 'mythic_modifier', onClose, onReload);

    const grid = document.querySelector('#claim-picker-grid')!;
    expect(grid.textContent).toContain('No eligible effects found');
    expect(document.querySelectorAll('.mod-buy-btn')).toHaveLength(0);
  });

  // ── TC6: Clicking mod-buy-btn calls claim_invite_reward RPC ──────────

  it('TC6: clicking a mod-buy-btn calls safeRpc("claim_invite_reward") with p_reward_id and p_effect_id', async () => {
    const effect = makeEffect({ id: 'eff-claimable', effect_num: 42, tier_gate: 'mythic' });
    catalogMock.mockResolvedValue([effect]);

    // Pending claim — don't resolve to avoid state change side effects
    safeRpcMock.mockResolvedValue({ data: { ok: false, error: 'test-stop' }, error: null });

    const onClose  = vi.fn();
    const onReload = vi.fn();

    await sheetModule.openClaimSheet('reward-claim-tc6', 'mythic_modifier', onClose, onReload);

    const btn = document.querySelector<HTMLButtonElement>('.mod-buy-btn[data-effect-id="eff-claimable"]');
    expect(btn).not.toBeNull();

    btn!.click();
    // Allow microtasks to flush
    await vi.advanceTimersByTimeAsync(0);

    expect(safeRpcMock).toHaveBeenCalledWith(
      'claim_invite_reward',
      { p_reward_id: 'reward-claim-tc6', p_effect_id: 42 },
      expect.anything(),
    );
  });

  // ── TC7: Successful claim triggers toast, onReload, and closes sheet ──

  it('TC7: successful claim (data.ok=true) shows success toast, calls onReload, and closes overlay', async () => {
    const effect = makeEffect({ id: 'eff-win', effect_num: 99, tier_gate: 'mythic' });
    catalogMock.mockResolvedValue([effect]);

    safeRpcMock.mockResolvedValue({
      data: { ok: true, effect_name: 'Iron Will' },
      error: null,
    });

    const onClose  = vi.fn();
    const onReload = vi.fn();

    await sheetModule.openClaimSheet('reward-win-tc7', 'mythic_modifier', onClose, onReload);

    const btn = document.querySelector<HTMLButtonElement>('.mod-buy-btn[data-effect-id="eff-win"]');
    expect(btn).not.toBeNull();

    btn!.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(onReload).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith(
      expect.stringContaining('Iron Will'),
      'success',
    );
    expect(document.querySelector('.bottom-sheet-overlay')).toBeNull();
  });
});
