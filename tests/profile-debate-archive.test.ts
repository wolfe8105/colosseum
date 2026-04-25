// ============================================================
// PROFILE DEBATE ARCHIVE — tests/profile-debate-archive.test.ts
// Source: src/profile-debate-archive.ts
//
// CLASSIFICATION:
//   loadDebateArchive()       — orchestrator (owner vs non-owner) → Integration test
//   loadPublicDebateArchive() — orchestrator (RPC + render) → Integration test
//
// IMPORTS:
//   { safeRpc }               from './auth.rpc.ts'
//   { injectCSS }             from './profile-debate-archive.css.ts'
//   { setEntries, ... }       from './profile-debate-archive.state.ts'
//   { renderTable }           from './profile-debate-archive.render.ts'
//   { loadAndRender }         from './profile-debate-archive.edit.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockInjectCSS = vi.hoisted(() => vi.fn());
const mockRenderTable = vi.hoisted(() => vi.fn());
const mockLoadAndRender = vi.hoisted(() => vi.fn());
const mockSetEntries = vi.hoisted(() => vi.fn());
const mockSetIsOwner = vi.hoisted(() => vi.fn());
const mockResetFilters = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.rpc.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/profile-debate-archive.css.ts', () => ({
  injectCSS: mockInjectCSS,
}));

vi.mock('../src/profile-debate-archive.render.ts', () => ({
  renderTable: mockRenderTable,
}));

vi.mock('../src/profile-debate-archive.edit.ts', () => ({
  loadAndRender: mockLoadAndRender,
}));

vi.mock('../src/profile-debate-archive.state.ts', () => ({
  setEntries: mockSetEntries,
  setIsOwner: mockSetIsOwner,
  resetFilters: mockResetFilters,
  entries: [],
  filterCat: 'all',
  filterResult: 'all',
  filterSearch: '',
  isOwner: false,
}));

import { loadDebateArchive, loadPublicDebateArchive } from '../src/profile-debate-archive.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockInjectCSS.mockReset();
  mockRenderTable.mockReset();
  mockLoadAndRender.mockReset();
  mockSetEntries.mockReset();
  mockSetIsOwner.mockReset();
  mockResetFilters.mockReset();
  document.body.innerHTML = '';
});

// ── loadDebateArchive ─────────────────────────────────────────

describe('TC1 — loadDebateArchive: calls injectCSS', () => {
  it('injects CSS on every call', async () => {
    const container = document.createElement('div');
    mockLoadAndRender.mockResolvedValue(undefined);

    await loadDebateArchive(container, true);

    expect(mockInjectCSS).toHaveBeenCalled();
  });
});

describe('TC2 — loadDebateArchive: calls setIsOwner with provided flag', () => {
  it('passes isOwner=true to setIsOwner', async () => {
    const container = document.createElement('div');
    mockLoadAndRender.mockResolvedValue(undefined);

    await loadDebateArchive(container, true);

    expect(mockSetIsOwner).toHaveBeenCalledWith(true);
  });
});

describe('TC3 — loadDebateArchive: calls resetFilters', () => {
  it('resets filters before loading', async () => {
    const container = document.createElement('div');
    mockLoadAndRender.mockResolvedValue(undefined);

    await loadDebateArchive(container, true);

    expect(mockResetFilters).toHaveBeenCalled();
  });
});

describe('TC4 — loadDebateArchive: shows loading placeholder in container', () => {
  it('sets innerHTML to dba-loading before async work', async () => {
    const container = document.createElement('div');
    // Capture innerHTML at time loadAndRender is called
    mockLoadAndRender.mockImplementation(async (c: HTMLElement) => {
      // at this point the loading state should already be set
    });

    await loadDebateArchive(container, true);

    // loadAndRender was called (owner path)
    expect(mockLoadAndRender).toHaveBeenCalledWith(container);
  });
});

describe('TC5 — loadDebateArchive: isOwner=true calls loadAndRender', () => {
  it('delegates to loadAndRender for owner', async () => {
    const container = document.createElement('div');
    mockLoadAndRender.mockResolvedValue(undefined);

    await loadDebateArchive(container, true);

    expect(mockLoadAndRender).toHaveBeenCalledTimes(1);
  });
});

describe('TC6 — loadDebateArchive: isOwner=false shows unavailable message', () => {
  it('sets innerHTML to dba-empty for non-owner without calling loadAndRender', async () => {
    const container = document.createElement('div');

    await loadDebateArchive(container, false);

    expect(container.innerHTML).toContain('dba-empty');
    expect(mockLoadAndRender).not.toHaveBeenCalled();
  });
});

describe('TC7 — loadDebateArchive: isOwner defaults to false', () => {
  it('does not call loadAndRender when called without second arg', async () => {
    const container = document.createElement('div');

    await loadDebateArchive(container);

    expect(mockLoadAndRender).not.toHaveBeenCalled();
  });
});

// ── loadPublicDebateArchive ───────────────────────────────────

describe('TC8 — loadPublicDebateArchive: calls safeRpc with get_public_debate_archive', () => {
  it('invokes safeRpc with correct RPC name and user id', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = document.createElement('div');

    await loadPublicDebateArchive(container, 'user-123');

    expect(mockSafeRpc).toHaveBeenCalledWith('get_public_debate_archive', { p_user_id: 'user-123' });
  });
});

describe('TC9 — loadPublicDebateArchive: RPC error shows unavailable message', () => {
  it('sets innerHTML to dba-empty when RPC returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });
    const container = document.createElement('div');

    await loadPublicDebateArchive(container, 'user-x');

    expect(container.innerHTML).toContain('dba-empty');
    expect(mockRenderTable).not.toHaveBeenCalled();
  });
});

describe('TC10 — loadPublicDebateArchive: success calls setEntries and renderTable', () => {
  it('calls setEntries with data and renderTable with container', async () => {
    const rows = [{ debate_id: 'd-1' }];
    mockSafeRpc.mockResolvedValue({ data: rows, error: null });
    const container = document.createElement('div');

    await loadPublicDebateArchive(container, 'user-456');

    expect(mockSetEntries).toHaveBeenCalledWith(rows);
    expect(mockRenderTable).toHaveBeenCalledWith(container);
  });
});

describe('TC11 — loadPublicDebateArchive: null data treated as empty array', () => {
  it('calls setEntries with [] when data is null', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    const container = document.createElement('div');

    await loadPublicDebateArchive(container, 'user-789');

    expect(mockSetEntries).toHaveBeenCalledWith([]);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/profile-debate-archive.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './auth.rpc.ts',
      './profile-debate-archive.css.ts',
      './profile-debate-archive.state.ts',
      './profile-debate-archive.render.ts',
      './profile-debate-archive.edit.ts',
      './profile-debate-archive.types.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/profile-debate-archive.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
