/**
 * Integration tests — Seam #456
 * src/pages/home.invite-sheet.ts → modifiers-render
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn(),
    auth: mockAuth,
  })),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEffect(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'eff-111',
    effect_num: 42,
    name: 'Test Effect',
    description: 'Does something cool',
    tier_gate: 'legendary',
    timing: 'in_debate',
    category: 'token',
    mod_cost: 100,
    pu_cost: 50,
    ...overrides,
  };
}

// ── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  mockRpc.mockReset();
  mockAuth.getSession.mockReset();
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockAuth.onAuthStateChange.mockReset();

  // Default catalog RPC response
  mockRpc.mockResolvedValue({ data: [makeEffect()], error: null });

  document.body.innerHTML = '';
});

// ────────────────────────────────────────────────────────────────────────────
// ARCH: no disallowed imports in home.invite-sheet.ts
// ────────────────────────────────────────────────────────────────────────────

describe('ARCH: home.invite-sheet.ts import surface', () => {
  it('only imports modifiers-render (renderEffectCard, tierLabel) — no wall-listed deps', () => {
    const src = readFileSync(
      resolve('src/pages/home.invite-sheet.ts'),
      'utf8',
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));

    // Must import renderEffectCard and tierLabel from modifiers-render
    expect(imports.some(l => l.includes('modifiers-render'))).toBe(true);
    expect(src).toContain('renderEffectCard');
    expect(src).toContain('tierLabel');

    // Wall check
    const wall = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css',
      'arena-room-live-audio', 'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const banned of wall) {
      expect(imports.some(l => l.includes(banned))).toBe(false);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC-1: openClaimSheet appends bottom sheet overlay to DOM
// ────────────────────────────────────────────────────────────────────────────

describe('TC-1: openClaimSheet mounts overlay to DOM', () => {
  it('appends .bottom-sheet-overlay to document.body', async () => {
    mockRpc.mockResolvedValue({ data: [makeEffect()], error: null });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const onClose = vi.fn();
    const onReload = vi.fn();

    const cleanup = openClaimSheet('reward-abc', 'legendary_powerup', onClose, onReload);

    // Let async catalog fetch resolve
    await vi.runAllTimersAsync();
    await cleanup;

    const overlay = document.body.querySelector('.bottom-sheet-overlay');
    expect(overlay).not.toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC-2: Sheet title reflects reward type via rewardTypeLabel
// ────────────────────────────────────────────────────────────────────────────

describe('TC-2: Sheet title reflects reward type', () => {
  it('title contains PICK YOUR for legendary_powerup', async () => {
    mockRpc.mockResolvedValue({ data: [makeEffect({ tier_gate: 'legendary' })], error: null });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const prom = openClaimSheet('r1', 'legendary_powerup', vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await prom;

    const title = document.body.querySelector('.sheet-title')?.textContent ?? '';
    expect(title).toContain('PICK YOUR');
  });

  it('title contains PICK YOUR for mythic_modifier', async () => {
    mockRpc.mockResolvedValue({ data: [makeEffect({ tier_gate: 'mythic' })], error: null });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const prom = openClaimSheet('r2', 'mythic_modifier', vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await prom;

    const title = document.body.querySelector('.sheet-title')?.textContent ?? '';
    expect(title).toContain('PICK YOUR');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC-3: Tier filter — legendary_powerup → legendary tier; mythic_modifier → mythic
// ────────────────────────────────────────────────────────────────────────────

describe('TC-3: tier_gate filter applied correctly', () => {
  it('legendary_powerup shows only legendary effects from catalog', async () => {
    const legendaryEff = makeEffect({ id: 'leg-1', tier_gate: 'legendary', name: 'Legendary Thing' });
    const mythicEff = makeEffect({ id: 'myth-1', tier_gate: 'mythic', name: 'Mythic Thing' });
    mockRpc.mockResolvedValue({ data: [legendaryEff, mythicEff], error: null });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const prom = openClaimSheet('r3', 'legendary_powerup', vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await prom;

    const grid = document.body.querySelector('#claim-picker-grid');
    expect(grid?.innerHTML).toContain('Legendary Thing');
    expect(grid?.innerHTML).not.toContain('Mythic Thing');
  });

  it('mythic_modifier shows only mythic effects from catalog', async () => {
    const legendaryEff = makeEffect({ id: 'leg-2', tier_gate: 'legendary', name: 'Leg Effect' });
    const mythicEff = makeEffect({ id: 'myth-2', tier_gate: 'mythic', name: 'Myth Effect' });
    mockRpc.mockResolvedValue({ data: [legendaryEff, mythicEff], error: null });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const prom = openClaimSheet('r4', 'mythic_modifier', vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await prom;

    const grid = document.body.querySelector('#claim-picker-grid');
    expect(grid?.innerHTML).not.toContain('Leg Effect');
    expect(grid?.innerHTML).toContain('Myth Effect');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC-4: renderEffectCard button visibility per reward type
// ────────────────────────────────────────────────────────────────────────────

describe('TC-4: renderEffectCard button variants per reward_type', () => {
  it('mythic_modifier → mod-buy-btn--modifier present, not powerup', async () => {
    mockRpc.mockResolvedValue({
      data: [makeEffect({ tier_gate: 'mythic' })],
      error: null,
    });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const prom = openClaimSheet('r5', 'mythic_modifier', vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await prom;

    const grid = document.body.querySelector('#claim-picker-grid');
    expect(grid?.querySelector('.mod-buy-btn--modifier')).not.toBeNull();
    expect(grid?.querySelector('.mod-buy-btn--powerup')).toBeNull();
  });

  it('legendary_powerup → mod-buy-btn--powerup present, not modifier', async () => {
    mockRpc.mockResolvedValue({
      data: [makeEffect({ tier_gate: 'legendary' })],
      error: null,
    });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const prom = openClaimSheet('r6', 'legendary_powerup', vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await prom;

    const grid = document.body.querySelector('#claim-picker-grid');
    expect(grid?.querySelector('.mod-buy-btn--powerup')).not.toBeNull();
    expect(grid?.querySelector('.mod-buy-btn--modifier')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC-5: Clicking .mod-buy-btn fires claim_invite_reward RPC with correct params
// ────────────────────────────────────────────────────────────────────────────

describe('TC-5: claim button fires claim_invite_reward RPC', () => {
  it('sends p_reward_id and p_effect_id (effect_num) to RPC', async () => {
    const eff = makeEffect({ id: 'eff-999', effect_num: 77, tier_gate: 'mythic' });
    // First call: catalog, second call: claim
    mockRpc
      .mockResolvedValueOnce({ data: [eff], error: null })
      .mockResolvedValueOnce({ data: { ok: true, effect_name: 'Test Item' }, error: null });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const onClose = vi.fn();
    const onReload = vi.fn();
    const prom = openClaimSheet('reward-xyz', 'mythic_modifier', onClose, onReload);
    await vi.runAllTimersAsync();
    await prom;

    const btn = document.body.querySelector<HTMLButtonElement>('.mod-buy-btn');
    expect(btn).not.toBeNull();
    btn!.click();
    await vi.runAllTimersAsync();

    expect(mockRpc).toHaveBeenCalledWith(
      'claim_invite_reward',
      expect.objectContaining({
        p_reward_id: 'reward-xyz',
        p_effect_id: 77,
      }),
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC-6: Successful claim triggers onReload and removes overlay
// ────────────────────────────────────────────────────────────────────────────

describe('TC-6: successful claim calls onReload and closes sheet', () => {
  it('calls onReload and removes overlay on ok=true', async () => {
    const eff = makeEffect({ id: 'eff-ok', effect_num: 10, tier_gate: 'mythic' });
    mockRpc
      .mockResolvedValueOnce({ data: [eff], error: null })
      .mockResolvedValueOnce({ data: { ok: true, effect_name: 'Power Surge' }, error: null });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const onClose = vi.fn();
    const onReload = vi.fn();
    const prom = openClaimSheet('r-ok', 'mythic_modifier', onClose, onReload);
    await vi.runAllTimersAsync();
    await prom;

    const btn = document.body.querySelector<HTMLButtonElement>('.mod-buy-btn');
    btn!.click();
    await vi.runAllTimersAsync();

    expect(onReload).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('.bottom-sheet-overlay')).toBeNull();
  });

  it('does NOT call onReload on ok=false, shows error', async () => {
    const eff = makeEffect({ id: 'eff-fail', effect_num: 11, tier_gate: 'mythic' });
    mockRpc
      .mockResolvedValueOnce({ data: [eff], error: null })
      .mockResolvedValueOnce({ data: { ok: false, error: 'Already claimed' }, error: null });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const onReload = vi.fn();
    const prom = openClaimSheet('r-fail', 'mythic_modifier', vi.fn(), onReload);
    await vi.runAllTimersAsync();
    await prom;

    const btn = document.body.querySelector<HTMLButtonElement>('.mod-buy-btn');
    btn!.click();
    await vi.runAllTimersAsync();

    expect(onReload).not.toHaveBeenCalled();
    // Overlay still present
    expect(document.body.querySelector('.bottom-sheet-overlay')).not.toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC-7: Cancel button and overlay click call onClose and remove sheet
// ────────────────────────────────────────────────────────────────────────────

describe('TC-7: cancel and overlay-click close the sheet', () => {
  it('cancel button calls onClose and removes overlay', async () => {
    mockRpc.mockResolvedValue({ data: [makeEffect()], error: null });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const onClose = vi.fn();
    const prom = openClaimSheet('r-cancel', 'legendary_powerup', onClose, vi.fn());
    await vi.runAllTimersAsync();
    await prom;

    const cancelBtn = document.body.querySelector<HTMLButtonElement>('#claim-cancel');
    expect(cancelBtn).not.toBeNull();
    cancelBtn!.click();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('.bottom-sheet-overlay')).toBeNull();
  });

  it('clicking overlay backdrop calls onClose and removes overlay', async () => {
    mockRpc.mockResolvedValue({ data: [makeEffect()], error: null });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const onClose = vi.fn();
    const prom = openClaimSheet('r-bg', 'legendary_powerup', onClose, vi.fn());
    await vi.runAllTimersAsync();
    await prom;

    const overlay = document.body.querySelector<HTMLElement>('.bottom-sheet-overlay');
    expect(overlay).not.toBeNull();

    // Simulate click directly on the overlay (not a child)
    overlay!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('.bottom-sheet-overlay')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TC-8: Empty eligible catalog shows empty state message
// ────────────────────────────────────────────────────────────────────────────

describe('TC-8: empty eligible catalog shows empty-state message', () => {
  it('shows "No eligible effects found." when catalog has no matching tier', async () => {
    // All effects are common — none match legendary or mythic
    mockRpc.mockResolvedValue({
      data: [makeEffect({ tier_gate: 'common' })],
      error: null,
    });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const prom = openClaimSheet('r-empty', 'legendary_powerup', vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await prom;

    const grid = document.body.querySelector('#claim-picker-grid');
    expect(grid?.textContent).toContain('No eligible effects found.');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SEAM #510: home.invite-sheet → home.invite-html (rewardTypeLabel)
// ────────────────────────────────────────────────────────────────────────────

describe('ARCH #510: home.invite-sheet imports rewardTypeLabel from home.invite-html', () => {
  it('home.invite-sheet.ts imports from home.invite-html', () => {
    const src = readFileSync(
      resolve('src/pages/home.invite-sheet.ts'),
      'utf8',
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(imports.some(l => l.includes('home.invite-html'))).toBe(true);
    expect(src).toContain('rewardTypeLabel');
  });
});

describe('TC-510-1: rewardTypeLabel returns correct labels', () => {
  it('returns Legendary Power-Up label for legendary_powerup', async () => {
    vi.resetModules();
    const { rewardTypeLabel } = await import('../../src/pages/home.invite-html.ts');
    expect(rewardTypeLabel('legendary_powerup')).toContain('Legendary Power-Up');
  });

  it('returns Mythic Power-Up label for mythic_powerup', async () => {
    vi.resetModules();
    const { rewardTypeLabel } = await import('../../src/pages/home.invite-html.ts');
    expect(rewardTypeLabel('mythic_powerup')).toContain('Mythic Power-Up');
  });

  it('returns Mythic Modifier label for mythic_modifier', async () => {
    vi.resetModules();
    const { rewardTypeLabel } = await import('../../src/pages/home.invite-html.ts');
    expect(rewardTypeLabel('mythic_modifier')).toContain('Mythic Modifier');
  });

  it('returns undefined for an unrecognized reward_type', async () => {
    vi.resetModules();
    const { rewardTypeLabel } = await import('../../src/pages/home.invite-html.ts');
    // Cast to bypass TS narrowing — tests the documented LANDMINE [LM-INVITE-001]
    expect(rewardTypeLabel('unknown_type' as any)).toBeUndefined();
  });
});

describe('TC-510-2: sheet title derived from rewardTypeLabel via home.invite-html', () => {
  it('title includes LEGENDARY POWER-UP text for legendary_powerup reward', async () => {
    vi.resetModules();
    mockRpc.mockResolvedValue({ data: [makeEffect({ tier_gate: 'legendary' })], error: null });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const prom = openClaimSheet('r-lpu', 'legendary_powerup', vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await prom;

    const title = document.body.querySelector('.sheet-title')?.textContent ?? '';
    // rewardTypeLabel returns '🟡 Legendary Power-Up' → toUpperCase → sheet title includes
    expect(title.toUpperCase()).toContain('LEGENDARY POWER-UP');
  });

  it('title includes MYTHIC MODIFIER text for mythic_modifier reward', async () => {
    vi.resetModules();
    mockRpc.mockResolvedValue({ data: [makeEffect({ tier_gate: 'mythic' })], error: null });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    const prom = openClaimSheet('r-mmod', 'mythic_modifier', vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await prom;

    const title = document.body.querySelector('.sheet-title')?.textContent ?? '';
    expect(title.toUpperCase()).toContain('MYTHIC MODIFIER');
  });

  it('title falls back to REWARD when rewardTypeLabel returns undefined', async () => {
    vi.resetModules();
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { openClaimSheet } = await import('../../src/pages/home.invite-sheet.ts');
    // Cast unknown type to bypass TS — tests the ?? 'REWARD' fallback in openClaimSheet
    const prom = openClaimSheet('r-unk', 'unknown_type' as any, vi.fn(), vi.fn());
    await vi.runAllTimersAsync();
    await prom;

    const title = document.body.querySelector('.sheet-title')?.textContent ?? '';
    expect(title).toContain('REWARD');
  });
});
