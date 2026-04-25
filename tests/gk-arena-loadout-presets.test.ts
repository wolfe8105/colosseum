// ============================================================
// GK — F-60 SAVED LOADOUTS
// Source: src/arena/arena-loadout-presets.ts
// Spec: docs/THE-MODERATOR-PUNCH-LIST.md F-60
//
// Spec claims:
//   SC1  get_my_loadout_presets RPC called on render
//   SC2  Up to 6 presets — SAVE hidden at exactly 6
//   SC3  SAVE visible when < 6 presets
//   SC4  save_loadout_preset called with p_name/p_reference_ids/p_powerup_effect_ids
//   SC5  Preset name capped at 32 chars
//   SC6  delete_loadout_preset called with p_preset_id on confirmed long-press (600ms)
//   SC7  Tap chip calls renderLoadoutPicker with preset's reference_ids
//   SC8  Tap chip calls equip for each powerup_effect_id
//   SC9  Cancelled save prompt → save_loadout_preset not called
//   SC10 Cancelled delete confirm → delete_loadout_preset not called
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── All mocks hoisted ─────────────────────────────────────────

const mockSafeRpc             = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile   = vi.hoisted(() => vi.fn());
const mockEscapeHTML          = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowToast           = vi.hoisted(() => vi.fn());
const mockGetMyPowerUps       = vi.hoisted(() => vi.fn());
const mockEquip               = vi.hoisted(() => vi.fn());
const mockRenderLoadout       = vi.hoisted(() => vi.fn(() => ''));
const mockWireLoadout         = vi.hoisted(() => vi.fn());
const mockRenderLoadoutPicker = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
}));

vi.mock('../src/powerups.ts', () => ({
  getMyPowerUps: mockGetMyPowerUps,
  equip: mockEquip,
  renderLoadout: mockRenderLoadout,
  wireLoadout: mockWireLoadout,
}));

vi.mock('../src/reference-arsenal.loadout.ts', () => ({
  renderLoadoutPicker: mockRenderLoadoutPicker,
}));

import { renderPresetBar } from '../src/arena/arena-loadout-presets.ts';
import type { CurrentDebate } from '../src/arena/arena-types.ts';

// ── Helpers ───────────────────────────────────────────────────

const makeDebate = (mode = 'text'): CurrentDebate => ({
  id: 'd-1',
  topic: 'Test topic',
  mode,
  ruleset: 'amplified',
} as unknown as CurrentDebate);

const makePreset = (
  id: string,
  name = 'My Loadout',
  refIds: string[] = [],
  puIds: string[] = [],
) => ({ id, name, reference_ids: refIds, powerup_effect_ids: puIds });

beforeEach(() => {
  document.body.innerHTML = '';
  mockSafeRpc.mockReset();
  mockGetCurrentProfile.mockReset();
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockShowToast.mockReset();
  mockGetMyPowerUps.mockReset();
  mockEquip.mockReset();
  mockRenderLoadout.mockReturnValue('');
  mockWireLoadout.mockReset();
  mockRenderLoadoutPicker.mockReset();
  mockGetCurrentProfile.mockReturnValue({ questions_answered: 0 });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── TC1: get_my_loadout_presets RPC called on render ──────────

describe('TC1 — renderPresetBar calls get_my_loadout_presets RPC', () => {
  it('calls safeRpc("get_my_loadout_presets", {}) on initial render', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = document.createElement('div');
    await renderPresetBar(container, makeDebate(), null, null);
    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_loadout_presets', {});
  });
});

// ── TC2: SAVE button hidden at exactly 6 presets ──────────────

describe('TC2 — SAVE button hidden when 6 presets exist (up-to-6 cap enforced)', () => {
  it('does not render #preset-save-btn when presets.length === 6', async () => {
    const presets = Array.from({ length: 6 }, (_, i) =>
      makePreset(`p-${i + 1}`, `Loadout ${i + 1}`),
    );
    mockSafeRpc.mockResolvedValue({ data: presets, error: null });
    const container = document.createElement('div');
    await renderPresetBar(container, makeDebate(), null, null);
    expect(container.querySelector('#preset-save-btn')).toBeNull();
  });
});

// ── TC3: SAVE button visible when fewer than 6 presets ────────

describe('TC3 — SAVE button visible when fewer than 6 presets', () => {
  it('renders #preset-save-btn when presets.length === 5', async () => {
    const presets = Array.from({ length: 5 }, (_, i) =>
      makePreset(`p-${i + 1}`, `Loadout ${i + 1}`),
    );
    mockSafeRpc.mockResolvedValue({ data: presets, error: null });
    const container = document.createElement('div');
    await renderPresetBar(container, makeDebate(), null, null);
    expect(container.querySelector('#preset-save-btn')).not.toBeNull();
  });
});

// ── TC4: save_loadout_preset called with correct param keys ───

describe('TC4 — save_loadout_preset RPC called with p_name, p_reference_ids, p_powerup_effect_ids', () => {
  it('calls safeRpc("save_loadout_preset") with all three required keys', async () => {
    // Initial render: no presets
    mockSafeRpc.mockResolvedValueOnce({ data: [], error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderPresetBar(container, makeDebate(), null, null);

    vi.spyOn(window, 'prompt').mockReturnValue('Test Loadout');
    mockGetMyPowerUps.mockResolvedValue({ inventory: [], equipped: [] });
    // save_loadout_preset call
    mockSafeRpc.mockResolvedValueOnce({ data: { success: true }, error: null });
    // refresh get_my_loadout_presets after save
    mockSafeRpc.mockResolvedValueOnce({ data: [], error: null });

    container.querySelector<HTMLButtonElement>('#preset-save-btn')!.click();

    await vi.waitFor(() => {
      expect(mockSafeRpc).toHaveBeenCalledWith(
        'save_loadout_preset',
        expect.objectContaining({
          p_name: expect.any(String),
          p_reference_ids: expect.any(Array),
          p_powerup_effect_ids: expect.any(Array),
        }),
      );
    });
  });
});

// ── TC5: preset name capped at 32 characters ──────────────────

describe('TC5 — preset name is truncated to 32 characters on save', () => {
  it('p_name passed to save_loadout_preset has length <= 32 even for a 40-char input', async () => {
    mockSafeRpc.mockResolvedValueOnce({ data: [], error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderPresetBar(container, makeDebate(), null, null);

    vi.spyOn(window, 'prompt').mockReturnValue('A'.repeat(40));
    mockGetMyPowerUps.mockResolvedValue({ inventory: [], equipped: [] });
    mockSafeRpc.mockResolvedValueOnce({ data: { success: true }, error: null });
    mockSafeRpc.mockResolvedValueOnce({ data: [], error: null });

    container.querySelector<HTMLButtonElement>('#preset-save-btn')!.click();

    await vi.waitFor(() => {
      const saveCall = mockSafeRpc.mock.calls.find(c => c[0] === 'save_loadout_preset');
      expect(saveCall).toBeDefined();
      const pName = (saveCall![1] as Record<string, unknown>).p_name as string;
      expect(pName.length).toBeLessThanOrEqual(32);
    });
  });
});

// ── TC6: delete_loadout_preset RPC called on confirmed long-press ─

describe('TC6 — delete_loadout_preset called with p_preset_id after confirmed 600ms long-press', () => {
  it('calls safeRpc("delete_loadout_preset", { p_preset_id }) when confirm returns true', async () => {
    vi.useFakeTimers();

    mockSafeRpc.mockResolvedValue({ data: [makePreset('p-1', 'My Loadout')], error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderPresetBar(container, makeDebate(), null, null);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockSafeRpc.mockReset();
    mockSafeRpc.mockResolvedValue({ error: null });

    const chip = container.querySelector<HTMLElement>('.preset-chip')!;
    chip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    await vi.advanceTimersByTimeAsync(600);
    vi.useRealTimers();

    await vi.waitFor(() => {
      expect(mockSafeRpc).toHaveBeenCalledWith('delete_loadout_preset', { p_preset_id: 'p-1' });
    });
  });
});

// ── TC7: tap chip calls renderLoadoutPicker with reference_ids ─

describe('TC7 — tap chip calls renderLoadoutPicker with preset reference_ids', () => {
  it('calls renderLoadoutPicker(refsContainer, debateId, reference_ids) on chip click', async () => {
    const refIds = ['r-1', 'r-2'];
    mockSafeRpc.mockResolvedValue({
      data: [makePreset('p-1', 'Refs Loadout', refIds, [])],
      error: null,
    });
    const container = document.createElement('div');
    const refsContainer = document.createElement('div');
    document.body.appendChild(container);
    mockRenderLoadoutPicker.mockResolvedValue(undefined);

    await renderPresetBar(container, makeDebate('text'), refsContainer, null);

    container.querySelector<HTMLElement>('.preset-chip')!.click();

    await vi.waitFor(() => {
      expect(mockRenderLoadoutPicker).toHaveBeenCalledWith(refsContainer, 'd-1', refIds);
    });
  });
});

// ── TC8: tap chip equips power-ups by effect_id ───────────────

describe('TC8 — tap chip calls equip for each powerup_effect_id in preset', () => {
  it('calls equip(debateId, inventoryItemId, slot) for matching inventory item', async () => {
    const puIds = ['e-1'];
    mockSafeRpc.mockResolvedValue({
      data: [makePreset('p-1', 'PU Loadout', [], puIds)],
      error: null,
    });
    const container = document.createElement('div');
    const powerupContainer = document.createElement('div');
    document.body.appendChild(container);

    mockGetMyPowerUps.mockResolvedValue({
      inventory: [{ id: 'pu-uuid-1', effect_id: 'e-1', equipped: false }],
      equipped: [],
    });
    mockEquip.mockResolvedValue(undefined);

    await renderPresetBar(container, makeDebate('text'), null, powerupContainer);

    container.querySelector<HTMLElement>('.preset-chip')!.click();

    await vi.waitFor(() => {
      expect(mockEquip).toHaveBeenCalledWith('d-1', 'pu-uuid-1', 1);
    });
  });
});

// ── TC9: cancelled save prompt does not call save RPC ─────────

describe('TC9 — cancelled save prompt does not call save_loadout_preset', () => {
  it('does not call safeRpc("save_loadout_preset") when prompt returns null', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderPresetBar(container, makeDebate(), null, null);

    vi.spyOn(window, 'prompt').mockReturnValue(null);
    mockSafeRpc.mockReset();

    container.querySelector<HTMLButtonElement>('#preset-save-btn')!.click();
    await new Promise(r => setTimeout(r, 50));

    expect(mockSafeRpc).not.toHaveBeenCalledWith('save_loadout_preset', expect.anything());
  });
});

// ── TC10: cancelled delete confirm does not call delete RPC ───

describe('TC10 — cancelled delete confirm does not call delete_loadout_preset', () => {
  it('does not call safeRpc("delete_loadout_preset") when confirm returns false', async () => {
    vi.useFakeTimers();
    mockSafeRpc.mockResolvedValue({ data: [makePreset('p-1', 'My Loadout')], error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderPresetBar(container, makeDebate(), null, null);

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    mockSafeRpc.mockReset();

    const chip = container.querySelector<HTMLElement>('.preset-chip')!;
    chip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    await vi.advanceTimersByTimeAsync(600);
    vi.useRealTimers();

    await new Promise(r => setTimeout(r, 50));
    expect(mockSafeRpc).not.toHaveBeenCalledWith('delete_loadout_preset', expect.anything());
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-loadout-presets.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      '../powerups.ts',
      '../reference-arsenal.loadout.ts',
      './arena-types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-loadout-presets.ts'),
      'utf-8',
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
