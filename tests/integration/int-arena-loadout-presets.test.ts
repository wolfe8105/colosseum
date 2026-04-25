/**
 * Integration tests — src/arena/arena-loadout-presets.ts → powerups
 * Seam #248
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Arch filter ──────────────────────────────────────────────────────────────

describe('ARCH: arena-loadout-presets imports', () => {
  const src = readFileSync(resolve(__dirname, '../../src/arena/arena-loadout-presets.ts'), 'utf-8');

  it('imports only expected modules (no wall terms)', () => {
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const bad = imports.filter(l =>
      /webrtc|feed-room|intro-music|cards\.ts|deepgram|realtime-client|voicememo|arena-css|arena-room-live-audio|arena-sounds/.test(l)
    );
    expect(bad).toHaveLength(0);
  });

  it('imports getMyPowerUps and equip from powerups', () => {
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const puLine = imports.find(l => /powerups/.test(l));
    expect(puLine).toBeTruthy();
    expect(puLine).toMatch(/getMyPowerUps/);
    expect(puLine).toMatch(/equip/);
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePreset(overrides: Partial<{ id: string; name: string; reference_ids: string[]; powerup_effect_ids: string[] }> = {}) {
  return {
    id: overrides.id ?? 'preset-uuid-1',
    name: overrides.name ?? 'My Preset',
    reference_ids: overrides.reference_ids ?? ['ref-1'],
    powerup_effect_ids: overrides.powerup_effect_ids ?? ['silence'],
  };
}

function makeDebate(overrides: Partial<{ id: string; mode: string }> = {}) {
  return {
    id: overrides.id ?? 'debate-uuid-1',
    mode: overrides.mode ?? 'live',
  };
}

/** Flush the microtask queue and any fake timers that enqueue more microtasks. */
async function flushAll() {
  await vi.runAllTimersAsync();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

// ── Mock setup (module-level, reset per test via vi.resetModules) ────────────

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  })),
}));

// ── TC-01: renderPresetBar calls get_my_loadout_presets ──────────────────────

describe('TC-01: renderPresetBar — calls get_my_loadout_presets', () => {
  let rpcMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    const { createClient } = await import('@supabase/supabase-js');
    rpcMock = vi.fn().mockResolvedValue({ data: [], error: null });
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls get_my_loadout_presets with empty params', async () => {
    const { renderPresetBar } = await import('../../src/arena/arena-loadout-presets.ts');
    const container = document.createElement('div');
    const debate = makeDebate();

    await renderPresetBar(container, debate as never, null, null);
    await flushAll();

    const calls = rpcMock.mock.calls as [string, Record<string, unknown>][];
    const presetCall = calls.find(([name]) => name === 'get_my_loadout_presets');
    expect(presetCall).toBeTruthy();
    expect(presetCall![1]).toEqual({});
  });
});

// ── TC-02: empty state renders preset-bar-empty and save button ──────────────

describe('TC-02: renderPresetBar — empty state', () => {
  let rpcMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    const { createClient } = await import('@supabase/supabase-js');
    rpcMock = vi.fn().mockResolvedValue({ data: [], error: null });
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders preset-bar-empty class and #preset-save-btn when no presets', async () => {
    const { renderPresetBar } = await import('../../src/arena/arena-loadout-presets.ts');
    const container = document.createElement('div');
    const debate = makeDebate();

    await renderPresetBar(container, debate as never, null, null);

    expect(container.querySelector('.preset-bar-empty')).not.toBeNull();
    expect(container.querySelector('#preset-save-btn')).not.toBeNull();
  });
});

// ── TC-03: save preset calls save_loadout_preset RPC ────────────────────────

describe('TC-03: save preset — calls save_loadout_preset RPC', () => {
  let rpcMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    const { createClient } = await import('@supabase/supabase-js');

    rpcMock = vi.fn().mockImplementation((name: string) => {
      if (name === 'get_my_loadout_presets') return Promise.resolve({ data: [], error: null });
      if (name === 'get_my_power_ups') return Promise.resolve({
        data: {
          success: true,
          inventory: [],
          equipped: [{ effect_id: 'silence', slot_number: 1 }],
          questions_answered: 5,
        },
        error: null,
      });
      if (name === 'save_loadout_preset') return Promise.resolve({ data: { success: true, id: 'new-preset-id' }, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    vi.spyOn(window, 'prompt').mockReturnValue('My Loadout');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls save_loadout_preset with p_name, p_reference_ids, p_powerup_effect_ids', async () => {
    const { renderPresetBar } = await import('../../src/arena/arena-loadout-presets.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const debate = makeDebate();

    // Build a refsContainer with a selected ref card
    const refsContainer = document.createElement('div');
    const refCard = document.createElement('div');
    refCard.className = 'ref-loadout-card selected';
    refCard.dataset.refId = 'ref-abc';
    refsContainer.appendChild(refCard);

    await renderPresetBar(container, debate as never, refsContainer, null);

    const saveBtn = container.querySelector<HTMLButtonElement>('#preset-save-btn');
    expect(saveBtn).not.toBeNull();

    // Click triggers the async handleSave chain
    saveBtn!.click();

    // Drain the microtask queue across the sequential RPC calls
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
    }

    const calls = rpcMock.mock.calls as [string, Record<string, unknown>][];
    const saveCall = calls.find(([name]) => name === 'save_loadout_preset');
    expect(saveCall).toBeTruthy();
    expect(saveCall![1]).toMatchObject({
      p_name: 'My Loadout',
      p_reference_ids: ['ref-abc'],
    });
    expect(Array.isArray(saveCall![1].p_powerup_effect_ids)).toBe(true);

    document.body.removeChild(container);
  }, 10000);
});

// ── TC-04: apply preset equips power-ups via equip_power_up RPC ──────────────

describe('TC-04: apply preset — equips matching inventory items', () => {
  let rpcMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    const { createClient } = await import('@supabase/supabase-js');

    const preset = makePreset({ powerup_effect_ids: ['silence'] });

    rpcMock = vi.fn().mockImplementation((name: string) => {
      if (name === 'get_my_loadout_presets') return Promise.resolve({ data: [preset], error: null });
      if (name === 'get_my_power_ups') return Promise.resolve({
        data: {
          success: true,
          inventory: [{
            id: 'inv-uuid-1',
            power_up_id: 'silence',
            effect_id: 'silence',
            quantity: 1,
            equipped: false,
            name: 'Silence',
            icon: '🔇',
          }],
          equipped: [],
          questions_answered: 10,
        },
        error: null,
      });
      if (name === 'equip_power_up') return Promise.resolve({ data: { success: true }, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
  });

  it('calls equip_power_up with correct debate_id, power_up_id, slot_number', async () => {
    const { renderPresetBar } = await import('../../src/arena/arena-loadout-presets.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const debate = makeDebate({ id: 'debate-uuid-99' });

    const powerupContainer = document.createElement('div');
    document.body.appendChild(powerupContainer);

    await renderPresetBar(container, debate as never, null, powerupContainer);

    const chip = container.querySelector<HTMLElement>('.preset-chip');
    expect(chip).not.toBeNull();

    // Simulate a clean tap (no long-press: pointerdown immediately followed by pointerup + click)
    chip!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    chip!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    chip!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Drain microtasks across async chains (getMyPowerUps + equip + dynamic import)
    for (let i = 0; i < 30; i++) {
      await Promise.resolve();
    }

    const calls = rpcMock.mock.calls as [string, Record<string, unknown>][];
    const equipCall = calls.find(([name]) => name === 'equip_power_up');
    expect(equipCall).toBeTruthy();
    expect(equipCall![1]).toMatchObject({
      p_debate_id: 'debate-uuid-99',
      p_power_up_id: 'inv-uuid-1',
      p_slot_number: 1,
    });

    document.body.removeChild(container);
    document.body.removeChild(powerupContainer);
  }, 10000);
});

// ── TC-05: apply preset refreshes powerup panel ──────────────────────────────

describe('TC-05: apply preset — refreshes powerupContainer innerHTML', () => {
  let rpcMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    const { createClient } = await import('@supabase/supabase-js');

    const preset = makePreset({ powerup_effect_ids: ['silence'] });

    rpcMock = vi.fn().mockImplementation((name: string) => {
      if (name === 'get_my_loadout_presets') return Promise.resolve({ data: [preset], error: null });
      if (name === 'get_my_power_ups') return Promise.resolve({
        data: {
          success: true,
          inventory: [{
            id: 'inv-uuid-1',
            power_up_id: 'silence',
            effect_id: 'silence',
            quantity: 1,
            equipped: false,
            name: 'Silence',
            icon: '🔇',
          }],
          equipped: [],
          questions_answered: 10,
        },
        error: null,
      });
      if (name === 'equip_power_up') return Promise.resolve({ data: { success: true }, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
  });

  it('sets powerupContainer.innerHTML with powerup-loadout class after apply', async () => {
    const { renderPresetBar } = await import('../../src/arena/arena-loadout-presets.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const debate = makeDebate();

    const powerupContainer = document.createElement('div');
    document.body.appendChild(powerupContainer);

    await renderPresetBar(container, debate as never, null, powerupContainer);

    const chip = container.querySelector<HTMLElement>('.preset-chip');
    chip!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    chip!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    chip!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    for (let i = 0; i < 30; i++) {
      await Promise.resolve();
    }

    expect(powerupContainer.innerHTML).toContain('powerup-loadout');

    document.body.removeChild(container);
    document.body.removeChild(powerupContainer);
  }, 10000);
});

// ── TC-06: long-press deletes preset via delete_loadout_preset RPC ───────────

describe('TC-06: long-press — calls delete_loadout_preset RPC', () => {
  let rpcMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    const { createClient } = await import('@supabase/supabase-js');

    const preset = makePreset();

    rpcMock = vi.fn().mockImplementation((name: string) => {
      if (name === 'get_my_loadout_presets') return Promise.resolve({ data: [preset], error: null });
      if (name === 'delete_loadout_preset') return Promise.resolve({ data: { success: true }, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls delete_loadout_preset with p_preset_id after 600ms long-press', async () => {
    const { renderPresetBar } = await import('../../src/arena/arena-loadout-presets.ts');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const debate = makeDebate();

    await renderPresetBar(container, debate as never, null, null);

    const chip = container.querySelector<HTMLElement>('.preset-chip');
    expect(chip).not.toBeNull();

    // Trigger long-press: pointerdown, then advance 700ms (past the 600ms threshold)
    chip!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const calls = rpcMock.mock.calls as [string, Record<string, unknown>][];
    const deleteCall = calls.find(([name]) => name === 'delete_loadout_preset');
    expect(deleteCall).toBeTruthy();
    expect(deleteCall![1]).toEqual({ p_preset_id: 'preset-uuid-1' });

    document.body.removeChild(container);
  });
});

// ── TC-07: 6 presets hides save button ───────────────────────────────────────

describe('TC-07: 6 presets — save button hidden', () => {
  let rpcMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    const { createClient } = await import('@supabase/supabase-js');

    const sixPresets = Array.from({ length: 6 }, (_, i) =>
      makePreset({ id: `preset-${i}`, name: `Preset ${i}` })
    );

    rpcMock = vi.fn().mockResolvedValue({ data: sixPresets, error: null });

    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render #preset-save-btn when 6 presets exist', async () => {
    const { renderPresetBar } = await import('../../src/arena/arena-loadout-presets.ts');
    const container = document.createElement('div');
    const debate = makeDebate();

    await renderPresetBar(container, debate as never, null, null);

    expect(container.querySelectorAll('.preset-chip')).toHaveLength(6);
    expect(container.querySelector('#preset-save-btn')).toBeNull();
  });
});
