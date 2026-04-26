// ============================================================
// INTEGRATOR -- src/pages/home.invite.ts -> home.invite-sheet (seam #552)
// Boundary: home.invite.ts calls openClaimSheet from home.invite-sheet.ts
//           home.invite-sheet calls safeRpc('claim_invite_reward', ...) and
//           getModifierCatalog() (which itself calls safeRpc)
// Mock boundary: @supabase/supabase-js only -- all source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Top-level mock -- must precede all imports

let _mockRpcImpl: (fn: string, params: unknown) => Promise<{ data: unknown; error: unknown }>;

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(async (fn: string, params: unknown) => {
      if (_mockRpcImpl) return _mockRpcImpl(fn, params);
      return { data: null, error: null };
    }),
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  })),
}));

// ARCH FILTER

const ROOT = resolve('C:/Users/wolfe/colosseum/colosseum');

const inviteSrc      = readFileSync(resolve(ROOT, 'src/pages/home.invite.ts'),       'utf-8');
const inviteSheetSrc = readFileSync(resolve(ROOT, 'src/pages/home.invite-sheet.ts'), 'utf-8');

const inviteImports      = inviteSrc.split('\n').filter(l => /from\s+['"]/.test(l));
const inviteSheetImports = inviteSheetSrc.split('\n').filter(l => /from\s+['"]/.test(l));

// Fake catalog entries

const legendaryEffect = {
  id: 'eff-leg-1', effect_num: 101,
  name: 'Gold Aura', tier_gate: 'legendary',
  timing: 'in_debate', category: 'token',
  description: 'Doubles token earn for 1 debate',
  mod_cost: 0, pu_cost: 0,
};

const mythicEffect = {
  id: 'eff-myth-1', effect_num: 201,
  name: 'Myth Storm', tier_gate: 'mythic',
  timing: 'in_debate', category: 'point',
  description: 'Triples point earn for 1 debate',
  mod_cost: 0, pu_cost: 0,
};

function makeDefaultRpcImpl(catalog: unknown[]) {
  return async (fn: string, _params: unknown): Promise<{ data: unknown; error: unknown }> => {
    if (fn === 'get_modifier_catalog') return { data: catalog, error: null };
    if (fn === 'claim_invite_reward')  return { data: { ok: true, effect_name: 'Gold Aura' }, error: null };
    return { data: null, error: null };
  };
}

type RewardType = 'legendary_powerup' | 'mythic_powerup' | 'mythic_modifier';

let openClaimSheet: (
  rewardId:   string,
  rewardType: RewardType,
  onClose:    () => void,
  onReload:   () => void,
) => Promise<() => void>;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();

  _mockRpcImpl = makeDefaultRpcImpl([legendaryEffect, mythicEffect]);

  const mod = await import(resolve(ROOT, 'src/pages/home.invite-sheet.ts') + '?t=' + Date.now());
  openClaimSheet = mod.openClaimSheet;
});

afterEach(() => {
  vi.useRealTimers();
  document.querySelectorAll('.bottom-sheet-overlay').forEach(el => el.remove());
});

// ARCH tests

describe('ARCH -- home.invite.ts imports', () => {
  it('home.invite.ts imports openClaimSheet from home.invite-sheet', () => {
    const sheetImport = inviteImports.find(l =>
      l.includes('openClaimSheet') && l.includes('home.invite-sheet'),
    );
    expect(sheetImport).toBeTruthy();
  });

  it('home.invite-sheet.ts imports safeRpc from auth', () => {
    const authImport = inviteSheetImports.find(l =>
      l.includes('safeRpc') && l.includes('auth'),
    );
    expect(authImport).toBeTruthy();
  });

  it('home.invite-sheet.ts imports getModifierCatalog', () => {
    const catalogImport = inviteSheetImports.find(l =>
      l.includes('getModifierCatalog'),
    );
    expect(catalogImport).toBeTruthy();
  });
});

// Behaviour tests

describe('openClaimSheet -- DOM wiring', () => {
  it('TC1: appends .bottom-sheet-overlay to document.body', async () => {
    expect(document.querySelector('.bottom-sheet-overlay')).toBeNull();

    const promise = openClaimSheet('reward-1', 'legendary_powerup', vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await promise;

    expect(document.querySelector('.bottom-sheet-overlay')).not.toBeNull();
  });

  it('TC2: cancel button calls onClose and removes overlay', async () => {
    const onClose = vi.fn();
    const promise = openClaimSheet('reward-2', 'legendary_powerup', onClose, vi.fn());
    await vi.runAllTimersAsync();
    await promise;

    const cancelBtn = document.querySelector<HTMLButtonElement>('#claim-cancel');
    expect(cancelBtn).not.toBeNull();

    cancelBtn!.click();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.bottom-sheet-overlay')).toBeNull();
  });

  it('TC3: clicking overlay backdrop calls onClose and removes overlay', async () => {
    const onClose = vi.fn();
    const promise = openClaimSheet('reward-3', 'legendary_powerup', onClose, vi.fn());
    await vi.runAllTimersAsync();
    await promise;

    const overlay = document.querySelector<HTMLElement>('.bottom-sheet-overlay');
    expect(overlay).not.toBeNull();

    overlay!.dispatchEvent(new MouseEvent('click', { bubbles: false }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.bottom-sheet-overlay')).toBeNull();
  });

  it('TC4: empty catalog shows no-eligible-effects message', async () => {
    _mockRpcImpl = makeDefaultRpcImpl([]);
    vi.resetModules();
    const mod2 = await import(resolve(ROOT, 'src/pages/home.invite-sheet.ts') + '?t=' + Date.now() + 'a');
    openClaimSheet = mod2.openClaimSheet;

    const promise = openClaimSheet('reward-4', 'legendary_powerup', vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await promise;

    const grid = document.querySelector('#claim-picker-grid');
    expect(grid?.textContent).toContain('No eligible effects found');
  });
});

describe('openClaimSheet -- tier filtering', () => {
  it('TC5: legendary_powerup renders only legendary-tier effects', async () => {
    const promise = openClaimSheet('reward-5', 'legendary_powerup', vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await promise;

    const grid = document.querySelector('#claim-picker-grid');
    expect(grid?.textContent).toContain('Gold Aura');
    expect(grid?.textContent).not.toContain('Myth Storm');
  });

  it('TC6: mythic_modifier renders only mythic-tier effects', async () => {
    const promise = openClaimSheet('reward-6', 'mythic_modifier', vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await promise;

    const grid = document.querySelector('#claim-picker-grid');
    expect(grid?.textContent).toContain('Myth Storm');
    expect(grid?.textContent).not.toContain('Gold Aura');
  });
});

describe('openClaimSheet -- claim RPC flow', () => {
  it('TC7: successful claim calls onReload and removes overlay', async () => {
    const onClose  = vi.fn();
    const onReload = vi.fn();
    const promise  = openClaimSheet('reward-7', 'legendary_powerup', onClose, onReload);
    await vi.runAllTimersAsync();
    await promise;

    const selectBtn = document.querySelector<HTMLButtonElement>('.mod-buy-btn');
    expect(selectBtn).not.toBeNull();

    selectBtn!.click();
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(onReload).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.bottom-sheet-overlay')).toBeNull();
  });
});
