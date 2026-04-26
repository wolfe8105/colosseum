// int-powerups.loadout.test.ts
// Seam #349 — src/powerups.loadout.ts → powerups.rpc
// Tests: wireLoadout slot click, equip RPC dispatch, success callback,
//        failure error display, in-flight disable, ARCH check.

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
describe('Seam #349 ARCH — powerups.loadout.ts imports equip from powerups.rpc', () => {
  it('imports equip from ./powerups.rpc.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.loadout.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const rpcLine = lines.find(
      (l: string) => l.includes('powerups.rpc') && l.includes('equip')
    );
    expect(rpcLine).toBeTruthy();
  });
});

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function buildLoadoutDOM(slotCount = 2, invIds = ['silence', 'shield']): void {
  // Build empty slots
  const slots = Array.from({ length: slotCount }, (_, i) =>
    `<div class="powerup-slot empty" data-slot="${i + 1}"></div>`
  ).join('');

  // Build inventory items
  const invItems = invIds
    .map(id => `<div class="powerup-inv-item" data-id="${id}">item</div>`)
    .join('');

  document.body.innerHTML = `
    <div class="powerup-slots">${slots}</div>
    <div id="powerup-inventory-picker" style="display:none;">${invItems}</div>
    <div id="powerup-equip-error" style="display:none;"></div>
  `;
}

// ----------------------------------------------------------------
// TC 1 — Clicking an empty slot shows the inventory picker
// ----------------------------------------------------------------
describe('Seam #349 TC1 — slot click shows inventory picker', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('clicking an empty slot reveals #powerup-inventory-picker', async () => {
    buildLoadoutDOM();
    const { wireLoadout } = await import('../../src/powerups.loadout.ts');
    wireLoadout('debate-abc');

    const slot = document.querySelector('.powerup-slot.empty') as HTMLElement;
    slot.click();

    const picker = document.getElementById('powerup-inventory-picker') as HTMLElement;
    expect(picker.style.display).toBe('block');
  });
});

// ----------------------------------------------------------------
// TC 2 — equip RPC fires with correct params on inv item click
// ----------------------------------------------------------------
describe('Seam #349 TC2 — equip RPC called with correct params', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('calls equip_power_up RPC with p_debate_id, p_power_up_id, p_slot_number', async () => {
    buildLoadoutDOM(1, ['silence']);

    const supabaseMod = await import('@supabase/supabase-js');
    const rpcMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    vi.mocked(supabaseMod.createClient).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn(),
    } as ReturnType<typeof supabaseMod.createClient>);

    const { wireLoadout } = await import('../../src/powerups.loadout.ts');
    wireLoadout('debate-xyz');

    // Select slot first
    (document.querySelector('.powerup-slot.empty') as HTMLElement).click();

    // Click inv item
    const invItem = document.querySelector('.powerup-inv-item[data-id="silence"]') as HTMLElement;
    invItem.click();

    await vi.advanceTimersByTimeAsync(0);

    const equipCall = rpcMock.mock.calls.find(c => c[0] === 'equip_power_up');
    expect(equipCall).toBeTruthy();
    expect(equipCall![1]).toMatchObject({
      p_debate_id: 'debate-xyz',
      p_power_up_id: 'silence',
      p_slot_number: 1,
    });
  });
});

// ----------------------------------------------------------------
// TC 3 — onEquipped callback fired on success
// ----------------------------------------------------------------
describe('Seam #349 TC3 — onEquipped callback fires on success', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('calls onEquipped with the result when equip succeeds', async () => {
    buildLoadoutDOM(1, ['shield']);

    const supabaseMod = await import('@supabase/supabase-js');
    const rpcMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    vi.mocked(supabaseMod.createClient).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn(),
    } as ReturnType<typeof supabaseMod.createClient>);

    const onEquipped = vi.fn();
    const { wireLoadout } = await import('../../src/powerups.loadout.ts');
    wireLoadout('debate-123', onEquipped);

    (document.querySelector('.powerup-slot.empty') as HTMLElement).click();
    (document.querySelector('.powerup-inv-item[data-id="shield"]') as HTMLElement).click();

    await vi.advanceTimersByTimeAsync(0);

    expect(onEquipped).toHaveBeenCalledOnce();
    expect(onEquipped).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ----------------------------------------------------------------
// TC 4 — Error text shown in #powerup-equip-error on failure
// ----------------------------------------------------------------
describe('Seam #349 TC4 — error element shown on equip failure', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('shows error message in #powerup-equip-error when equip fails', async () => {
    buildLoadoutDOM(1, ['silence']);

    const supabaseMod = await import('@supabase/supabase-js');
    const rpcMock = vi.fn().mockResolvedValue({
      data: { success: false, error: 'Already equipped' },
      error: null,
    });
    vi.mocked(supabaseMod.createClient).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn(),
    } as ReturnType<typeof supabaseMod.createClient>);

    const { wireLoadout } = await import('../../src/powerups.loadout.ts');
    wireLoadout('debate-err');

    (document.querySelector('.powerup-slot.empty') as HTMLElement).click();
    (document.querySelector('.powerup-inv-item[data-id="silence"]') as HTMLElement).click();

    await vi.advanceTimersByTimeAsync(0);

    const errorEl = document.getElementById('powerup-equip-error') as HTMLElement;
    expect(errorEl.style.display).toBe('block');
    expect(errorEl.textContent).toBe('Already equipped');
  });
});

// ----------------------------------------------------------------
// TC 5 — In-flight: item disabled during async equip call
// ----------------------------------------------------------------
describe('Seam #349 TC5 — item visually disabled while equip is in-flight', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('sets opacity 0.5 and pointerEvents none while equip is pending', async () => {
    buildLoadoutDOM(1, ['reveal']);

    const supabaseMod = await import('@supabase/supabase-js');
    let resolveRpc!: (v: { data: { success: boolean }; error: null }) => void;
    const rpcMock = vi.fn().mockReturnValue(
      new Promise<{ data: { success: boolean }; error: null }>(r => { resolveRpc = r; })
    );
    vi.mocked(supabaseMod.createClient).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn(),
    } as ReturnType<typeof supabaseMod.createClient>);

    const { wireLoadout } = await import('../../src/powerups.loadout.ts');
    wireLoadout('debate-inf');

    (document.querySelector('.powerup-slot.empty') as HTMLElement).click();
    const invItem = document.querySelector('.powerup-inv-item[data-id="reveal"]') as HTMLElement;
    invItem.click();

    // Still pending — check disabled state immediately
    expect(invItem.style.opacity).toBe('0.5');
    expect(invItem.style.pointerEvents).toBe('none');

    // Resolve and advance
    resolveRpc({ data: { success: true }, error: null });
    await vi.advanceTimersByTimeAsync(0);
  });
});

// ================================================================
// SEAM #441 — src/powerups.loadout.ts → tiers
// Tests: renderLoadout's use of getTier / getPowerUpSlots / getNextTier
// ================================================================

// ----------------------------------------------------------------
// ARCH #441 — imports from ./tiers.ts
// ----------------------------------------------------------------
describe('Seam #441 ARCH — powerups.loadout.ts imports from tiers', () => {
  it('imports getTier, getPowerUpSlots, getNextTier from ./tiers.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/powerups.loadout.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const tiersLine = lines.find((l: string) => l.includes('./tiers'));
    expect(tiersLine).toBeTruthy();
    expect(tiersLine).toContain('getTier');
    expect(tiersLine).toContain('getPowerUpSlots');
    expect(tiersLine).toContain('getNextTier');
  });
});

// ----------------------------------------------------------------
// TC #441-1 — tier 0 (0 questions): locked panel
// ----------------------------------------------------------------
describe('Seam #441 TC1 — renderLoadout tier 0 renders locked panel', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('renders POWER-UPS locked panel when questionsAnswered = 0', async () => {
    const { renderLoadout } = await import('../../src/powerups.loadout.ts');
    const html = renderLoadout([], [], 0, 'debate-id');
    expect(html).toContain('POWER-UPS');
    expect(html).toContain('🔒');
    expect(html).toContain('more questions to unlock power-up slots');
  });
});

// ----------------------------------------------------------------
// TC #441-2 — tier 1 (10 questions): still locked (slots=0)
// ----------------------------------------------------------------
describe('Seam #441 TC2 — renderLoadout tier 1 (10 qa) still locked', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('renders locked panel when questionsAnswered = 10 (slots = 0)', async () => {
    const { renderLoadout } = await import('../../src/powerups.loadout.ts');
    const html = renderLoadout([], [], 10, 'debate-id');
    // Spectator+ tier has 0 slots — should still show locked state
    expect(html).toContain('more questions to unlock power-up slots');
    expect(html).not.toContain('powerup-slots');
  });
});

// ----------------------------------------------------------------
// TC #441-3 — tier 2 (25 questions): 1 slot unlocked
// ----------------------------------------------------------------
describe('Seam #441 TC3 — renderLoadout tier 2 (25 qa) renders 1 slot', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('renders unlocked panel with 1 empty slot when questionsAnswered = 25', async () => {
    const { renderLoadout } = await import('../../src/powerups.loadout.ts');
    const html = renderLoadout([], [], 25, 'debate-id');
    expect(html).toContain('powerup-slots');
    expect(html).toContain('data-slot="1"');
    expect(html).toContain('Contender');
    expect(html).toContain('1 slot');
    // Should NOT have slot 2
    expect(html).not.toContain('data-slot="2"');
  });
});

// ----------------------------------------------------------------
// TC #441-4 — tier 3 (50 questions): 2 slots, shows Gladiator
// ----------------------------------------------------------------
describe('Seam #441 TC4 — renderLoadout tier 3 (50 qa) renders 2 slots', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('renders 2 slots and Gladiator tier name when questionsAnswered = 50', async () => {
    const { renderLoadout } = await import('../../src/powerups.loadout.ts');
    const html = renderLoadout([], [], 50, 'debate-id');
    expect(html).toContain('Gladiator');
    expect(html).toContain('data-slot="1"');
    expect(html).toContain('data-slot="2"');
    expect(html).toContain('2 slots');
  });
});

// ----------------------------------------------------------------
// TC #441-5 — equipped item renders filled slot with name/icon
// ----------------------------------------------------------------
describe('Seam #441 TC5 — renderLoadout renders filled slot for equipped item', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('renders filled slot with power-up name from equipped item', async () => {
    const { renderLoadout } = await import('../../src/powerups.loadout.ts');
    const equipped = [{ power_up_id: 'shield', slot_number: 1, name: 'Shield', icon: '🛡️' }];
    const html = renderLoadout([], equipped, 25, 'debate-id');
    expect(html).toContain('powerup-slot filled');
    expect(html).toContain('data-slot="1"');
    expect(html).toContain('Shield');
  });
});

// ----------------------------------------------------------------
// TC #441-6 — inventory items render in picker
// ----------------------------------------------------------------
describe('Seam #441 TC6 — renderLoadout renders inventory items in picker', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('renders inventory items with quantity and name in picker', async () => {
    const { renderLoadout } = await import('../../src/powerups.loadout.ts');
    const inventory = [{ power_up_id: 'silence', name: 'Silence', icon: '🤫', quantity: 2 }];
    const html = renderLoadout(inventory, [], 25, 'debate-id');
    expect(html).toContain('powerup-inv-item');
    expect(html).toContain('data-id="silence"');
    expect(html).toContain('Silence');
    expect(html).toContain('x2');
  });
});

// ----------------------------------------------------------------
// TC #441-7 — legend tier (100 questions): 4 slots, no "more questions" text
// ----------------------------------------------------------------
describe('Seam #441 TC7 — renderLoadout tier 5 (100 qa) renders 4 slots', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  it('renders 4 slots and Legend tier at max tier (questionsAnswered = 100)', async () => {
    const { renderLoadout } = await import('../../src/powerups.loadout.ts');
    const html = renderLoadout([], [], 100, 'debate-id');
    expect(html).toContain('Legend');
    expect(html).toContain('data-slot="4"');
    expect(html).toContain('4 slots');
    expect(html).not.toContain('more questions to unlock');
  });
});
