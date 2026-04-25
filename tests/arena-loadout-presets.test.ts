// ============================================================
// ARENA LOADOUT PRESETS — tests/arena-loadout-presets.test.ts
// Source: src/arena/arena-loadout-presets.ts
//
// CLASSIFICATION:
//   renderPresetBar() — async RPC + DOM builder → Integration test
//
// STRATEGY:
//   Mock auth.ts for safeRpc/getCurrentProfile.
//   Mock config.ts for escapeHTML/showToast.
//   Mock powerups.ts for getMyPowerUps/equip/renderLoadout/wireLoadout.
//   Mock reference-arsenal.loadout.ts for renderLoadoutPicker.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const makeDebate = (): CurrentDebate => ({
  id: 'd-1',
  topic: 'Test topic',
  mode: 'text',
  ruleset: 'amplified',
} as unknown as CurrentDebate);

beforeEach(() => {
  document.body.innerHTML = '';
  mockSafeRpc.mockReset();
  mockGetCurrentProfile.mockReset();
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockShowToast.mockReset();
  mockGetMyPowerUps.mockReset();
  mockEquip.mockReset();
});

// ── TC1: shows loading state then renders bar ─────────────────

describe('TC1 — renderPresetBar: initially shows loading text', () => {
  it('sets innerHTML to loading while awaiting', async () => {
    let resolveRpc!: (v: unknown) => void;
    mockSafeRpc.mockReturnValue(new Promise(r => { resolveRpc = r; }));
    const container = document.createElement('div');
    document.body.appendChild(container);
    const promise = renderPresetBar(container, makeDebate(), null, null);
    expect(container.innerHTML).toContain('Loading presets');
    resolveRpc({ data: [], error: null });
    await promise;
  });
});

// ── TC2: empty presets shows no-loadouts message ──────────────

describe('TC2 — renderPresetBar: empty presets renders empty state', () => {
  it('shows "No saved loadouts" when RPC returns empty array', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderPresetBar(container, makeDebate(), null, null);
    expect(container.innerHTML).toContain('No saved loadouts');
  });
});

// ── TC3: shows SAVE CURRENT button when no presets ───────────

describe('TC3 — renderPresetBar: shows save button when no presets', () => {
  it('renders #preset-save-btn', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderPresetBar(container, makeDebate(), null, null);
    expect(container.querySelector('#preset-save-btn')).not.toBeNull();
  });
});

// ── TC4: renders preset chips for each preset ─────────────────

describe('TC4 — renderPresetBar: renders one chip per preset', () => {
  it('creates 2 .preset-chip elements', async () => {
    mockSafeRpc.mockResolvedValue({
      data: [
        { id: 'p-1', name: 'Loadout A', reference_ids: [], powerup_effect_ids: [] },
        { id: 'p-2', name: 'Loadout B', reference_ids: [], powerup_effect_ids: [] },
      ],
      error: null,
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderPresetBar(container, makeDebate(), null, null);
    expect(container.querySelectorAll('.preset-chip').length).toBe(2);
  });
});

// ── TC5: escapes preset name ──────────────────────────────────

describe('TC5 — renderPresetBar: escapes preset name and id', () => {
  it('calls escapeHTML on preset name', async () => {
    mockSafeRpc.mockResolvedValue({
      data: [{ id: 'p-1', name: '<b>Hack</b>', reference_ids: [], powerup_effect_ids: [] }],
      error: null,
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderPresetBar(container, makeDebate(), null, null);
    expect(mockEscapeHTML).toHaveBeenCalledWith('<b>Hack</b>');
  });
});

// ── TC6: handles RPC error silently ──────────────────────────

describe('TC6 — renderPresetBar: handles RPC error, renders empty state', () => {
  it('falls back to empty preset bar on RPC error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: 'RPC error' });
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderPresetBar(container, makeDebate(), null, null);
    expect(container.innerHTML).toContain('No saved loadouts');
  });
});

// ── TC7: handles thrown RPC error silently ────────────────────

describe('TC7 — renderPresetBar: handles thrown error, renders empty state', () => {
  it('falls back to empty preset bar when RPC throws', async () => {
    mockSafeRpc.mockRejectedValue(new Error('Network error'));
    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderPresetBar(container, makeDebate(), null, null);
    expect(container.innerHTML).toContain('No saved loadouts');
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
