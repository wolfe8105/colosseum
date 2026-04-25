// int-powerups.test.ts
// Seam #158 — src/powerups.ts → powerups.rpc
// Tests: buy (sufficient/insufficient/no-cost), equip, activate,
//        getMyPowerUps (with/without debateId), getOpponentPowerUps, ARCH check.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// ----------------------------------------------------------------
// ARCH
// ----------------------------------------------------------------
describe('Seam #158 ARCH — powerups.ts re-exports powerups.rpc', () => {
  it('powerups.ts imports buy/equip/activate/getMyPowerUps/getOpponentPowerUps from ./powerups.rpc.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const rpcLine = lines.find(
      (l: string) => l.includes('powerups.rpc') && l.includes('buy')
    );
    expect(rpcLine).toBeDefined();
  });

  it('powerups.rpc.ts imports safeRpc from ./auth.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.rpc.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasAuth = lines.some(
      (l: string) => l.includes('safeRpc') && l.includes('./auth')
    );
    expect(hasAuth).toBe(true);
  });
});

// ----------------------------------------------------------------
// Shared mock setup
// ----------------------------------------------------------------

const mockSafeRpc = vi.fn();
const mockGetBalance = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockSafeRpc.mockReset();
  mockGetBalance.mockReset();

  vi.doMock('../../src/auth.ts', () => ({
    safeRpc: mockSafeRpc,
    onChange: vi.fn(),
    getCurrentUser: vi.fn(() => null),
  }));

  vi.doMock('../../src/tokens.ts', () => ({
    getBalance: mockGetBalance,
    init: vi.fn(),
    requireTokens: vi.fn(),
    default: {},
  }));

  // tokens.balance is imported by powerups.rpc via tokens.ts
  vi.doMock('../../src/tokens.balance.ts', () => ({
    getBalance: mockGetBalance,
    lastKnownBalance: null,
    requireTokens: vi.fn(),
    updateBalance: vi.fn(),
    getSummary: vi.fn(),
    _initBroadcast: vi.fn(),
    _updateBalanceDisplay: vi.fn(),
    _rpc: vi.fn(),
  }));
});

// ----------------------------------------------------------------
// TC1: buy() with sufficient balance calls buy_power_up RPC
// ----------------------------------------------------------------
describe('TC1 — buy() with sufficient balance calls buy_power_up', () => {
  it('calls safeRpc with buy_power_up and correct params', async () => {
    mockGetBalance.mockReturnValue(100);
    mockSafeRpc.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const { buy } = await import('../../src/powerups.rpc.ts');
    const result = await buy('multiplier_2x', 1, 10);

    expect(mockSafeRpc).toHaveBeenCalledWith('buy_power_up', {
      p_power_up_id: 'multiplier_2x',
      p_quantity: 1,
    });
    expect(result.success).toBe(true);
  });
});

// ----------------------------------------------------------------
// TC2: buy() with insufficient balance returns error without calling RPC
// ----------------------------------------------------------------
describe('TC2 — buy() with insufficient balance returns error, no RPC call', () => {
  it('returns insufficient balance error and does not call safeRpc', async () => {
    mockGetBalance.mockReturnValue(10);

    const { buy } = await import('../../src/powerups.rpc.ts');
    const result = await buy('silence', 1, 50);

    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/[Ii]nsufficient/);
  });
});

// ----------------------------------------------------------------
// TC3: buy() with no cost skips balance check and calls RPC
// ----------------------------------------------------------------
describe('TC3 — buy() with no cost skips balance check', () => {
  it('calls buy_power_up even when balance is low (no cost guard)', async () => {
    mockGetBalance.mockReturnValue(0);
    mockSafeRpc.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const { buy } = await import('../../src/powerups.rpc.ts');
    const result = await buy('shield');

    expect(mockSafeRpc).toHaveBeenCalledWith('buy_power_up', {
      p_power_up_id: 'shield',
      p_quantity: 1,
    });
    expect(result.success).toBe(true);
  });
});

// ----------------------------------------------------------------
// TC4: equip() calls equip_power_up with correct params
// ----------------------------------------------------------------
describe('TC4 — equip() calls equip_power_up', () => {
  it('calls safeRpc with equip_power_up and correct params', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const { equip } = await import('../../src/powerups.rpc.ts');
    const result = await equip('debate-001', 'reveal', 1);

    expect(mockSafeRpc).toHaveBeenCalledWith('equip_power_up', {
      p_debate_id: 'debate-001',
      p_power_up_id: 'reveal',
      p_slot_number: 1,
    });
    expect(result.success).toBe(true);
  });
});

// ----------------------------------------------------------------
// TC5: activate() calls activate_power_up with correct params
// ----------------------------------------------------------------
describe('TC5 — activate() calls activate_power_up', () => {
  it('calls safeRpc with activate_power_up and correct params', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const { activate } = await import('../../src/powerups.rpc.ts');
    const result = await activate('debate-002', 'silence');

    expect(mockSafeRpc).toHaveBeenCalledWith('activate_power_up', {
      p_debate_id: 'debate-002',
      p_power_up_id: 'silence',
    });
    expect(result.success).toBe(true);
  });
});

// ----------------------------------------------------------------
// TC6: getMyPowerUps() with no debateId calls get_my_power_ups with empty params
// ----------------------------------------------------------------
describe('TC6 — getMyPowerUps() without debateId calls RPC with empty params', () => {
  it('calls safeRpc with get_my_power_ups and no debate param', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, inventory: [], equipped: [], questions_answered: 0 },
      error: null,
    });

    const { getMyPowerUps } = await import('../../src/powerups.rpc.ts');
    const result = await getMyPowerUps();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_power_ups', {});
    expect(result.inventory).toEqual([]);
    expect(result.equipped).toEqual([]);
    expect(result.questions_answered).toBe(0);
  });
});

// ----------------------------------------------------------------
// TC7: getOpponentPowerUps() calls get_opponent_power_ups with debateId
// ----------------------------------------------------------------
describe('TC7 — getOpponentPowerUps() calls get_opponent_power_ups', () => {
  it('calls safeRpc with get_opponent_power_ups and returns equipped list', async () => {
    const equipped = [{ power_up_id: 'shield', slot_number: 1 }];
    mockSafeRpc.mockResolvedValue({
      data: { success: true, equipped },
      error: null,
    });

    const { getOpponentPowerUps } = await import('../../src/powerups.rpc.ts');
    const result = await getOpponentPowerUps('debate-003');

    expect(mockSafeRpc).toHaveBeenCalledWith('get_opponent_power_ups', {
      p_debate_id: 'debate-003',
    });
    expect(result.success).toBe(true);
    expect(result.equipped).toEqual(equipped);
  });
});

// ================================================================
// Seam #192 — src/powerups.ts → powerups.shop
// Tests: renderShop HTML output (pure function, no Supabase calls)
// ================================================================

// ----------------------------------------------------------------
// TC-S1: ARCH — powerups.ts re-exports renderShop from powerups.shop
// ----------------------------------------------------------------
describe('Seam #192 ARCH — powerups.ts re-exports renderShop from powerups.shop', () => {
  it('powerups.ts imports renderShop from ./powerups.shop.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const shopLine = lines.find(
      (l: string) => l.includes('powerups.shop') && l.includes('renderShop')
    );
    expect(shopLine).toBeDefined();
  });

  it('powerups.shop.ts imports CATALOG from ./powerups.types.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.shop.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const typesLine = lines.find(
      (l: string) => l.includes('powerups.types') && l.includes('CATALOG')
    );
    expect(typesLine).toBeDefined();
  });
});

// ----------------------------------------------------------------
// TC-S2: renderShop returns wrapper with .powerup-shop class
// ----------------------------------------------------------------
describe('Seam #192 TC-S2 — renderShop returns shop wrapper HTML', () => {
  it('returns a string containing the powerup-shop wrapper div', async () => {
    vi.resetModules();
    const { renderShop } = await import('../../src/powerups.shop.ts');
    const html = renderShop(100);
    expect(typeof html).toBe('string');
    expect(html).toContain('class="powerup-shop"');
    expect(html).toContain('POWER-UP SHOP');
  });
});

// ----------------------------------------------------------------
// TC-S3: renderShop renders 4 shop items (one per CATALOG entry)
// ----------------------------------------------------------------
describe('Seam #192 TC-S3 — renderShop renders 4 shop items', () => {
  it('includes 4 powerup-shop-item divs matching CATALOG entries', async () => {
    vi.resetModules();
    const { renderShop } = await import('../../src/powerups.shop.ts');
    const html = renderShop(100);
    const matches = html.match(/class="powerup-shop-item"/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(4);
  });

  it('includes data-id for each CATALOG key (multiplier_2x, silence, shield, reveal)', async () => {
    vi.resetModules();
    const { renderShop } = await import('../../src/powerups.shop.ts');
    const html = renderShop(100);
    expect(html).toContain('data-id="multiplier_2x"');
    expect(html).toContain('data-id="silence"');
    expect(html).toContain('data-id="shield"');
    expect(html).toContain('data-id="reveal"');
  });
});

// ----------------------------------------------------------------
// TC-S4: renderShop renders buy buttons with correct data-cost attributes
// ----------------------------------------------------------------
describe('Seam #192 TC-S4 — renderShop renders buy buttons with correct data-cost', () => {
  it('includes correct data-cost for each CATALOG entry', async () => {
    vi.resetModules();
    const { renderShop } = await import('../../src/powerups.shop.ts');
    const html = renderShop(100);
    // CATALOG costs: multiplier_2x=15, silence=20, shield=25, reveal=10
    expect(html).toContain('data-id="multiplier_2x" data-cost="15"');
    expect(html).toContain('data-id="silence" data-cost="20"');
    expect(html).toContain('data-id="shield" data-cost="25"');
    expect(html).toContain('data-id="reveal" data-cost="10"');
  });
});

// ----------------------------------------------------------------
// TC-S5: renderShop enables/disables buttons based on token balance
// ----------------------------------------------------------------
describe('Seam #192 TC-S5 — renderShop disables buttons when balance < cost', () => {
  it('buttons for affordable items are NOT disabled when balance >= cost', async () => {
    vi.resetModules();
    const { renderShop } = await import('../../src/powerups.shop.ts');
    // balance=100 can afford all items (max cost 25)
    const html = renderShop(100);
    // No button should have disabled attribute
    const buttons = html.match(/<button[^>]*class="powerup-buy-btn"[^>]*>/g) ?? [];
    expect(buttons.length).toBe(4);
    const disabledCount = buttons.filter(b => b.includes(' disabled')).length;
    expect(disabledCount).toBe(0);
  });

  it('all buttons disabled when balance is 0', async () => {
    vi.resetModules();
    const { renderShop } = await import('../../src/powerups.shop.ts');
    const html = renderShop(0);
    const buttons = html.match(/<button[^>]*class="powerup-buy-btn"[^>]*>/g) ?? [];
    expect(buttons.length).toBe(4);
    const disabledCount = buttons.filter(b => b.includes(' disabled')).length;
    expect(disabledCount).toBe(4);
  });

  it('only affordable items are enabled when balance=12 (can afford reveal=10, not others)', async () => {
    vi.resetModules();
    const { renderShop } = await import('../../src/powerups.shop.ts');
    // balance=12: reveal(10)=affordable, multiplier_2x(15)/silence(20)/shield(25)=not
    const html = renderShop(12);
    const buttons = html.match(/<button[^>]*class="powerup-buy-btn"[^>]*>/g) ?? [];
    expect(buttons.length).toBe(4);
    const disabledCount = buttons.filter(b => b.includes(' disabled')).length;
    expect(disabledCount).toBe(3);
  });
});

// ----------------------------------------------------------------
// TC-S6: renderShop balance display shows correct value
// ----------------------------------------------------------------
describe('Seam #192 TC-S6 — renderShop balance display', () => {
  it('shows balance value in the shop header', async () => {
    vi.resetModules();
    const { renderShop } = await import('../../src/powerups.shop.ts');
    const html = renderShop(42);
    expect(html).toContain('Balance:');
    expect(html).toContain('>42 🪙<');
  });

  it('handles undefined/falsy balance by defaulting to 0', async () => {
    vi.resetModules();
    const { renderShop } = await import('../../src/powerups.shop.ts');
    // @ts-expect-error testing falsy input
    const html = renderShop(0);
    expect(html).toContain('>0 🪙<');
  });
});

// ================================================================
// SEAM #193 — src/powerups.ts → powerups.overlays
// Tests: renderSilenceOverlay, renderRevealPopup, renderShieldIndicator,
//        removeShieldIndicator, hasMultiplier
// ================================================================

// ----------------------------------------------------------------
// TC-193-1: ARCH — powerups.ts re-exports from powerups.overlays.ts
// ----------------------------------------------------------------
describe('Seam #193 ARCH — powerups.ts re-exports powerups.overlays', () => {
  it('powerups.ts imports renderSilenceOverlay and others from ./powerups.overlays.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const overlaysLine = lines.find(
      (l: string) => l.includes('powerups.overlays') && l.includes('renderSilenceOverlay')
    );
    expect(overlaysLine).toBeDefined();
  });

  it('powerups.overlays.ts imports escapeHTML from ./config.ts and CATALOG from ./powerups.types.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.overlays.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasConfig = lines.some((l: string) => l.includes('./config'));
    const hasTypes = lines.some((l: string) => l.includes('powerups.types'));
    expect(hasConfig).toBe(true);
    expect(hasTypes).toBe(true);
  });
});

// ----------------------------------------------------------------
// TC-193-2: renderSilenceOverlay() appends overlay with countdown starting at 10
// ----------------------------------------------------------------
describe('TC-193-2 — renderSilenceOverlay() appends #powerup-silence-overlay with countdown 10', () => {
  it('creates #powerup-silence-overlay and #silence-countdown starting at 10', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const { renderSilenceOverlay } = await import('../../src/powerups.overlays.ts');
    renderSilenceOverlay('Alice');

    const overlay = document.getElementById('powerup-silence-overlay');
    expect(overlay).not.toBeNull();
    expect(document.body.contains(overlay)).toBe(true);

    const countdown = document.getElementById('silence-countdown');
    expect(countdown).not.toBeNull();
    expect(countdown!.textContent).toBe('10');

    // cleanup
    overlay?.remove();
  });
});

// ----------------------------------------------------------------
// TC-193-3: renderSilenceOverlay() countdown decrements and overlay removes at 0
// ----------------------------------------------------------------
describe('TC-193-3 — renderSilenceOverlay() countdown decrements and overlay auto-removes at 0', () => {
  it('decrements countdown each second and removes overlay after 10s', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const { renderSilenceOverlay } = await import('../../src/powerups.overlays.ts');
    renderSilenceOverlay('Bob');

    // After 5 ticks: remaining should be 5
    await vi.advanceTimersByTimeAsync(5000);
    const countdown = document.getElementById('silence-countdown');
    expect(countdown).not.toBeNull();
    expect(countdown!.textContent).toBe('5');

    // After 5 more ticks: overlay should be gone
    await vi.advanceTimersByTimeAsync(5000);
    expect(document.getElementById('powerup-silence-overlay')).toBeNull();
  });
});

// ----------------------------------------------------------------
// TC-193-4: renderRevealPopup() renders equipped items; close button removes popup
// ----------------------------------------------------------------
describe('TC-193-4 — renderRevealPopup() renders equipped items and close button dismisses', () => {
  it('renders #powerup-reveal-popup with equipped item names and close button removes it', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const { renderRevealPopup } = await import('../../src/powerups.overlays.ts');
    const equipped = [
      { power_up_id: 'shield', icon: '🛡️', name: 'Shield' },
      { power_up_id: 'silence', icon: '🤫', name: 'Silence' },
    ];
    renderRevealPopup(equipped as Parameters<typeof renderRevealPopup>[0]);

    const popup = document.getElementById('powerup-reveal-popup');
    expect(popup).not.toBeNull();
    expect(popup!.innerHTML).toContain('Shield');
    expect(popup!.innerHTML).toContain('Silence');

    // Close button click removes popup
    const closeBtn = document.getElementById('reveal-close-btn');
    expect(closeBtn).not.toBeNull();
    closeBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('powerup-reveal-popup')).toBeNull();
  });
});

// ----------------------------------------------------------------
// TC-193-5: renderRevealPopup() with empty array shows fallback message
// ----------------------------------------------------------------
describe('TC-193-5 — renderRevealPopup() with empty array shows no-power-ups message', () => {
  it('shows "No power-ups equipped" when equipped list is empty', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const { renderRevealPopup } = await import('../../src/powerups.overlays.ts');
    renderRevealPopup([]);

    const popup = document.getElementById('powerup-reveal-popup');
    expect(popup).not.toBeNull();
    expect(popup!.innerHTML).toContain('No power-ups equipped');

    popup?.remove();
  });
});

// ----------------------------------------------------------------
// TC-193-6: renderShieldIndicator() appends indicator; removeShieldIndicator() removes it
// ----------------------------------------------------------------
describe('TC-193-6 — renderShieldIndicator() / removeShieldIndicator() lifecycle', () => {
  it('appends #powerup-shield-indicator and removeShieldIndicator() removes it', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const { renderShieldIndicator, removeShieldIndicator } = await import('../../src/powerups.overlays.ts');

    const indicator = renderShieldIndicator();
    expect(indicator).not.toBeNull();
    expect(indicator.id).toBe('powerup-shield-indicator');
    expect(document.getElementById('powerup-shield-indicator')).not.toBeNull();

    removeShieldIndicator();
    expect(document.getElementById('powerup-shield-indicator')).toBeNull();
  });
});

// ----------------------------------------------------------------
// TC-193-7: hasMultiplier() returns true for multiplier_2x, false otherwise
// ----------------------------------------------------------------
describe('TC-193-7 — hasMultiplier() detects multiplier_2x in equipped list', () => {
  it('returns true when equipped contains multiplier_2x', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { hasMultiplier } = await import('../../src/powerups.overlays.ts');

    const withMultiplier = [
      { power_up_id: 'shield', slot_number: 1 },
      { power_up_id: 'multiplier_2x', slot_number: 2 },
    ];
    expect(hasMultiplier(withMultiplier as Parameters<typeof hasMultiplier>[0])).toBe(true);
  });

  it('returns false when no multiplier_2x in equipped list', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { hasMultiplier } = await import('../../src/powerups.overlays.ts');

    const noMultiplier = [
      { power_up_id: 'shield', slot_number: 1 },
      { power_up_id: 'silence', slot_number: 2 },
    ];
    expect(hasMultiplier(noMultiplier as Parameters<typeof hasMultiplier>[0])).toBe(false);
  });

  it('returns false for empty equipped list', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { hasMultiplier } = await import('../../src/powerups.overlays.ts');
    expect(hasMultiplier([])).toBe(false);
  });
});

// ================================================================
// SEAM #194 — src/powerups.ts → powerups.loadout
// Tests: renderLoadout (locked/unlocked/equipped/inventory), wireLoadout (slot click,
//        equip success, equip failure)
// ================================================================

// ----------------------------------------------------------------
// TC-194-1: ARCH — powerups.ts re-exports renderLoadout/wireLoadout from powerups.loadout
// ----------------------------------------------------------------
describe('Seam #194 ARCH — powerups.ts re-exports powerups.loadout', () => {
  it('powerups.ts imports renderLoadout and wireLoadout from ./powerups.loadout.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const loadoutLine = lines.find(
      (l: string) => l.includes('powerups.loadout') && l.includes('renderLoadout')
    );
    expect(loadoutLine).toBeDefined();
  });

  it('powerups.loadout.ts imports equip from ./powerups.rpc.ts and CATALOG from ./powerups.types.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.loadout.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasRpc = lines.some((l: string) => l.includes('powerups.rpc') && l.includes('equip'));
    const hasTypes = lines.some((l: string) => l.includes('powerups.types') && l.includes('CATALOG'));
    expect(hasRpc).toBe(true);
    expect(hasTypes).toBe(true);
  });
});

// ----------------------------------------------------------------
// TC-194-2: renderLoadout locked state (questionsAnswered=0)
// ----------------------------------------------------------------
describe('TC-194-2 — renderLoadout locked when questionsAnswered=0', () => {
  it('returns locked HTML containing "POWER-UPS 🔒" and unlock hint', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { renderLoadout } = await import('../../src/powerups.loadout.ts');
    const html = renderLoadout([], [], 0, 'debate-001');

    expect(typeof html).toBe('string');
    expect(html).toContain('POWER-UPS 🔒');
    expect(html).toContain('more questions to unlock');
  });
});

// ----------------------------------------------------------------
// TC-194-3: renderLoadout unlocked state renders slots
// ----------------------------------------------------------------
describe('TC-194-3 — renderLoadout unlocked with slots renders powerup-loadout', () => {
  it('returns .powerup-loadout with powerup-slots and correct slot count label', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Need questionsAnswered that unlocks at least 1 slot — check tiers.ts behaviour
    // Using 999 which should unlock max slots
    const { renderLoadout } = await import('../../src/powerups.loadout.ts');
    const html = renderLoadout([], [], 999, 'debate-001');

    expect(html).toContain('class="powerup-loadout"');
    expect(html).toContain('class="powerup-slots"');
    expect(html).toContain('POWER-UPS');
  });
});

// ----------------------------------------------------------------
// TC-194-4: renderLoadout with equipped item renders .powerup-slot.filled
// ----------------------------------------------------------------
describe('TC-194-4 — renderLoadout with equipped item renders filled slot', () => {
  it('renders .powerup-slot.filled with item icon and name', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { renderLoadout } = await import('../../src/powerups.loadout.ts');
    const equipped = [
      { slot_number: 1, power_up_id: 'shield', icon: '🛡️', name: 'Shield' },
    ];
    const html = renderLoadout([], equipped as Parameters<typeof renderLoadout>[1], 999, 'debate-001');

    expect(html).toContain('powerup-slot filled');
    expect(html).toContain('Shield');
  });
});

// ----------------------------------------------------------------
// TC-194-5: renderLoadout with inventory items renders .powerup-inv-item entries
// ----------------------------------------------------------------
describe('TC-194-5 — renderLoadout with inventory renders powerup-inv-item entries', () => {
  it('renders one .powerup-inv-item per inventory entry with quantity > 0', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { renderLoadout } = await import('../../src/powerups.loadout.ts');
    const inventory = [
      { power_up_id: 'silence', icon: '🤫', name: 'Silence', quantity: 2 },
      { power_up_id: 'reveal', icon: '👁️', name: 'Reveal', quantity: 0 }, // quantity 0 filtered out
    ];
    const html = renderLoadout(inventory as Parameters<typeof renderLoadout>[0], [], 999, 'debate-001');

    const matches = html.match(/class="powerup-inv-item"/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1); // only quantity > 0
    expect(html).toContain('x2');
  });
});

// ----------------------------------------------------------------
// TC-194-6: wireLoadout clicking an empty slot shows inventory picker
// ----------------------------------------------------------------
describe('TC-194-6 — wireLoadout clicking empty slot reveals #powerup-inventory-picker', () => {
  it('sets picker display to block when empty slot is clicked', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/powerups.rpc.ts', () => ({
      equip: vi.fn().mockResolvedValue({ success: true }),
      buy: vi.fn(),
      activate: vi.fn(),
      getMyPowerUps: vi.fn(),
      getOpponentPowerUps: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(),
      onChange: vi.fn(),
      getCurrentUser: vi.fn(() => null),
    }));

    const { renderLoadout, wireLoadout } = await import('../../src/powerups.loadout.ts');
    const html = renderLoadout([], [], 999, 'debate-001');
    document.body.innerHTML = html;

    wireLoadout('debate-001');

    const emptySlot = document.querySelector('.powerup-slot.empty') as HTMLElement;
    expect(emptySlot).not.toBeNull();
    emptySlot.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const picker = document.getElementById('powerup-inventory-picker');
    expect(picker).not.toBeNull();
    expect(picker!.style.display).toBe('block');
  });
});

// ----------------------------------------------------------------
// TC-194-7: wireLoadout equip success calls onEquipped callback
// ----------------------------------------------------------------
describe('TC-194-7 — wireLoadout equip success calls onEquipped callback', () => {
  it('calls onEquipped with result after successful equip RPC', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockEquip = vi.fn().mockResolvedValue({ success: true, error: null });
    vi.doMock('../../src/powerups.rpc.ts', () => ({
      equip: mockEquip,
      buy: vi.fn(),
      activate: vi.fn(),
      getMyPowerUps: vi.fn(),
      getOpponentPowerUps: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(),
      onChange: vi.fn(),
      getCurrentUser: vi.fn(() => null),
    }));

    const { renderLoadout, wireLoadout } = await import('../../src/powerups.loadout.ts');
    const inventory = [{ power_up_id: 'silence', icon: '🤫', name: 'Silence', quantity: 1 }];
    const html = renderLoadout(inventory as Parameters<typeof renderLoadout>[0], [], 999, 'debate-001');
    document.body.innerHTML = html;

    const onEquipped = vi.fn();
    wireLoadout('debate-001', onEquipped);

    // Click empty slot first to select it
    const emptySlot = document.querySelector('.powerup-slot.empty') as HTMLElement;
    emptySlot.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Click inventory item
    const invItem = document.querySelector('.powerup-inv-item') as HTMLElement;
    expect(invItem).not.toBeNull();
    invItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Flush async
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    expect(mockEquip).toHaveBeenCalledWith('debate-001', 'silence', expect.any(Number));
    expect(onEquipped).toHaveBeenCalledWith({ success: true, error: null });
  });
});

// ----------------------------------------------------------------
// TC-194-8: wireLoadout equip failure shows error in #powerup-equip-error
// ----------------------------------------------------------------
describe('TC-194-8 — wireLoadout equip failure shows error message', () => {
  it('shows error text in #powerup-equip-error when equip RPC fails', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockEquip = vi.fn().mockResolvedValue({ success: false, error: 'Not enough slots' });
    vi.doMock('../../src/powerups.rpc.ts', () => ({
      equip: mockEquip,
      buy: vi.fn(),
      activate: vi.fn(),
      getMyPowerUps: vi.fn(),
      getOpponentPowerUps: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(),
      onChange: vi.fn(),
      getCurrentUser: vi.fn(() => null),
    }));

    const { renderLoadout, wireLoadout } = await import('../../src/powerups.loadout.ts');
    const inventory = [{ power_up_id: 'reveal', icon: '👁️', name: 'Reveal', quantity: 1 }];
    const html = renderLoadout(inventory as Parameters<typeof renderLoadout>[0], [], 999, 'debate-001');
    document.body.innerHTML = html;

    wireLoadout('debate-001');

    // Click empty slot then inventory item
    const emptySlot = document.querySelector('.powerup-slot.empty') as HTMLElement;
    emptySlot.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const invItem = document.querySelector('.powerup-inv-item') as HTMLElement;
    invItem.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    const errorEl = document.getElementById('powerup-equip-error');
    expect(errorEl).not.toBeNull();
    expect(errorEl!.style.display).toBe('block');
    expect(errorEl!.textContent).toBe('Not enough slots');
  });
});

// ================================================================
// SEAM #195 — src/powerups.ts → powerups.activation
// Tests: renderActivationBar (HTML output), wireActivationBar (click→RPC+DOM)
// ================================================================

// ----------------------------------------------------------------
// TC-195-ARCH: powerups.ts re-exports renderActivationBar/wireActivationBar
//              from powerups.activation.ts; activation imports activate + escapeHTML
// ----------------------------------------------------------------
describe('Seam #195 ARCH — powerups.ts re-exports powerups.activation', () => {
  it('powerups.ts imports renderActivationBar/wireActivationBar from ./powerups.activation.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const activationLine = lines.find(
      (l: string) => l.includes('powerups.activation') && l.includes('renderActivationBar')
    );
    expect(activationLine).toBeDefined();
  });

  it('powerups.activation.ts imports activate from ./powerups.rpc.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.activation.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const rpcLine = lines.find(
      (l: string) => l.includes('powerups.rpc') && l.includes('activate')
    );
    expect(rpcLine).toBeDefined();
  });

  it('powerups.activation.ts imports escapeHTML from ./config.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.activation.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const configLine = lines.find(
      (l: string) => l.includes('./config') && l.includes('escapeHTML')
    );
    expect(configLine).toBeDefined();
  });
});

// ----------------------------------------------------------------
// TC-195-1: renderActivationBar([]) returns empty string
// ----------------------------------------------------------------
describe('TC-195-1 — renderActivationBar([]) returns empty string', () => {
  it('returns empty string when equipped list is empty', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { renderActivationBar } = await import('../../src/powerups.activation.ts');
    expect(renderActivationBar([])).toBe('');
  });

  it('returns empty string when equipped is falsy/undefined', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { renderActivationBar } = await import('../../src/powerups.activation.ts');
    // @ts-expect-error testing falsy input
    expect(renderActivationBar(null)).toBe('');
  });
});

// ----------------------------------------------------------------
// TC-195-2: renderActivationBar(equipped) renders bar wrapper + buttons
// ----------------------------------------------------------------
describe('TC-195-2 — renderActivationBar renders #powerup-activation-bar with correct buttons', () => {
  it('returns wrapper div with id powerup-activation-bar', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { renderActivationBar } = await import('../../src/powerups.activation.ts');
    const html = renderActivationBar([
      { power_up_id: 'silence', slot_number: 1, icon: '🤫', name: 'Silence' } as Parameters<typeof renderActivationBar>[0][number],
    ]);
    expect(html).toContain('id="powerup-activation-bar"');
    expect(html).toContain('POWER-UPS');
  });

  it('renders one button per equipped item with data-id and data-slot attributes', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { renderActivationBar } = await import('../../src/powerups.activation.ts');
    const html = renderActivationBar([
      { power_up_id: 'silence', slot_number: 1, icon: '🤫', name: 'Silence' } as Parameters<typeof renderActivationBar>[0][number],
      { power_up_id: 'shield', slot_number: 2, icon: '🛡️', name: 'Shield' } as Parameters<typeof renderActivationBar>[0][number],
    ]);
    expect(html).toContain('data-id="silence"');
    expect(html).toContain('data-slot="1"');
    expect(html).toContain('data-id="shield"');
    expect(html).toContain('data-slot="2"');
  });
});

// ----------------------------------------------------------------
// TC-195-3: renderActivationBar renders multiplier_2x as passive/disabled
// ----------------------------------------------------------------
describe('TC-195-3 — renderActivationBar renders multiplier_2x as passive with disabled+ACTIVE', () => {
  it('multiplier_2x button has passive class and disabled attribute with ACTIVE label', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { renderActivationBar } = await import('../../src/powerups.activation.ts');
    const html = renderActivationBar([
      { power_up_id: 'multiplier_2x', slot_number: 1, icon: '✖️', name: 'Multiplier 2x' } as Parameters<typeof renderActivationBar>[0][number],
    ]);
    expect(html).toContain('powerup-activate-btn passive');
    expect(html).toContain('disabled');
    expect(html).toContain('ACTIVE');
  });

  it('non-multiplier buttons do not have passive class and show USE label', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { renderActivationBar } = await import('../../src/powerups.activation.ts');
    const html = renderActivationBar([
      { power_up_id: 'reveal', slot_number: 1, icon: '👁️', name: 'Reveal' } as Parameters<typeof renderActivationBar>[0][number],
    ]);
    expect(html).not.toContain('passive');
    expect(html).toContain('USE');
  });
});

// ----------------------------------------------------------------
// TC-195-4: wireActivationBar click on active button calls activate RPC
// ----------------------------------------------------------------
describe('TC-195-4 — wireActivationBar click calls activate RPC and marks button used', () => {
  it('calls activate(debateId, powerUpId) and adds used class + USED label on success', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const mockActivate = vi.fn().mockResolvedValue({ success: true });

    vi.doMock('../../src/powerups.rpc.ts', () => ({
      activate: mockActivate,
      buy: vi.fn(),
      equip: vi.fn(),
      getMyPowerUps: vi.fn(),
      getOpponentPowerUps: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));
    vi.doMock('../../src/powerups.types.ts', () => ({
      CATALOG: {
        silence: { icon: '🤫', name: 'Silence', cost: 20, description: 'Silence opponent' },
        shield: { icon: '🛡️', name: 'Shield', cost: 25, description: 'Block power-up' },
        reveal: { icon: '👁️', name: 'Reveal', cost: 10, description: 'Reveal equipped' },
        multiplier_2x: { icon: '✖️', name: '2x Multiplier', cost: 15, description: 'Double payout' },
      },
    }));

    const { wireActivationBar } = await import('../../src/powerups.activation.ts');

    document.body.innerHTML = `
      <button class="powerup-activate-btn" data-id="silence" data-slot="1">
        <span style="font-size:18px;">🤫</span>
        <span>USE</span>
      </button>`;

    const btn = document.querySelector('.powerup-activate-btn') as HTMLButtonElement;
    const callbacks = { onSilence: vi.fn(), onShield: vi.fn(), onReveal: vi.fn() };

    wireActivationBar('debate-xyz', callbacks);
    btn.click();

    await vi.advanceTimersByTimeAsync(50);

    expect(mockActivate).toHaveBeenCalledWith('debate-xyz', 'silence');
    expect(btn.classList.contains('used')).toBe(true);
    const label = btn.querySelector('span:last-child');
    expect(label?.textContent).toBe('USED');
  });
});

// ----------------------------------------------------------------
// TC-195-5: wireActivationBar triggers correct callback per powerUpId
// ----------------------------------------------------------------
describe('TC-195-5 — wireActivationBar triggers correct callback on successful activation', () => {
  it('calls onSilence when silence power-up activated', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const mockActivate = vi.fn().mockResolvedValue({ success: true });

    vi.doMock('../../src/powerups.rpc.ts', () => ({
      activate: mockActivate,
      buy: vi.fn(), equip: vi.fn(), getMyPowerUps: vi.fn(), getOpponentPowerUps: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));
    vi.doMock('../../src/powerups.types.ts', () => ({
      CATALOG: {
        silence: { icon: '🤫', name: 'Silence', cost: 20, description: 'Silence opponent' },
        shield: { icon: '🛡️', name: 'Shield', cost: 25, description: 'Block' },
        reveal: { icon: '👁️', name: 'Reveal', cost: 10, description: 'Reveal' },
        multiplier_2x: { icon: '✖️', name: '2x Multiplier', cost: 15, description: 'Double' },
      },
    }));

    const { wireActivationBar } = await import('../../src/powerups.activation.ts');

    document.body.innerHTML = `<button class="powerup-activate-btn" data-id="silence" data-slot="1">
      <span>🤫</span><span>USE</span></button>`;

    const onSilence = vi.fn();
    const onShield = vi.fn();
    const onReveal = vi.fn();
    wireActivationBar('debate-abc', { onSilence, onShield, onReveal });

    (document.querySelector('.powerup-activate-btn') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(50);

    expect(onSilence).toHaveBeenCalledOnce();
    expect(onShield).not.toHaveBeenCalled();
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('calls onShield when shield power-up activated', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const mockActivate = vi.fn().mockResolvedValue({ success: true });

    vi.doMock('../../src/powerups.rpc.ts', () => ({
      activate: mockActivate,
      buy: vi.fn(), equip: vi.fn(), getMyPowerUps: vi.fn(), getOpponentPowerUps: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));
    vi.doMock('../../src/powerups.types.ts', () => ({
      CATALOG: {
        silence: { icon: '🤫', name: 'Silence', cost: 20, description: 'Silence' },
        shield: { icon: '🛡️', name: 'Shield', cost: 25, description: 'Block' },
        reveal: { icon: '👁️', name: 'Reveal', cost: 10, description: 'Reveal' },
        multiplier_2x: { icon: '✖️', name: '2x', cost: 15, description: 'Double' },
      },
    }));

    const { wireActivationBar } = await import('../../src/powerups.activation.ts');

    document.body.innerHTML = `<button class="powerup-activate-btn" data-id="shield" data-slot="2">
      <span>🛡️</span><span>USE</span></button>`;

    const onSilence = vi.fn();
    const onShield = vi.fn();
    const onReveal = vi.fn();
    wireActivationBar('debate-def', { onSilence, onShield, onReveal });

    (document.querySelector('.powerup-activate-btn') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(50);

    expect(onShield).toHaveBeenCalledOnce();
    expect(onSilence).not.toHaveBeenCalled();
    expect(onReveal).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// TC-195-6: wireActivationBar re-enables button on RPC failure (success=false)
// ----------------------------------------------------------------
describe('TC-195-6 — wireActivationBar re-enables button when activate returns success=false', () => {
  it('button is re-enabled and does NOT have used class when activation fails', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const mockActivate = vi.fn().mockResolvedValue({ success: false, error: 'cooldown' });

    vi.doMock('../../src/powerups.rpc.ts', () => ({
      activate: mockActivate,
      buy: vi.fn(), equip: vi.fn(), getMyPowerUps: vi.fn(), getOpponentPowerUps: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));
    vi.doMock('../../src/powerups.types.ts', () => ({
      CATALOG: {
        silence: { icon: '🤫', name: 'Silence', cost: 20, description: 'Silence' },
        shield: { icon: '🛡️', name: 'Shield', cost: 25, description: 'Block' },
        reveal: { icon: '👁️', name: 'Reveal', cost: 10, description: 'Reveal' },
        multiplier_2x: { icon: '✖️', name: '2x', cost: 15, description: 'Double' },
      },
    }));

    const { wireActivationBar } = await import('../../src/powerups.activation.ts');

    document.body.innerHTML = `<button class="powerup-activate-btn" data-id="reveal" data-slot="1">
      <span>👁️</span><span>USE</span></button>`;

    const btn = document.querySelector('.powerup-activate-btn') as HTMLButtonElement;
    wireActivationBar('debate-fail', { onSilence: vi.fn(), onShield: vi.fn(), onReveal: vi.fn() });

    btn.click();
    await vi.advanceTimersByTimeAsync(50);

    expect(btn.classList.contains('used')).toBe(false);
    expect(btn.disabled).toBe(false);
    expect(btn.style.opacity).toBe('1');
  });
});
