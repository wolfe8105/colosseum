// ============================================================
// GATEKEEPER — F-53 Profile Debate Archive
// tests/gk-profile-debate-archive.test.ts
// Source: src/profile-debate-archive.ts
//
// SPEC: THE-MODERATOR-PUNCH-LIST.md row F-53
//   Spreadsheet-style table on profile page.
//   RPCs: get_my_debate_archive, get_public_debate_archive,
//         get_my_recent_debates_for_archive, add_debate_to_archive,
//         update_archive_entry, remove_from_archive.
//   Manual curation, public by default, archive links permanent.
//
// IMPORTS:
//   { safeRpc }                         from './auth.rpc.ts'
//   { injectCSS }                       from './profile-debate-archive.css.ts'
//   { setEntries, setIsOwner,
//     resetFilters }                    from './profile-debate-archive.state.ts'
//   { renderTable }                     from './profile-debate-archive.render.ts'
//   { loadAndRender }                   from './profile-debate-archive.edit.ts'
//   import type { ArchiveEntry }        from './profile-debate-archive.types.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc       = vi.hoisted(() => vi.fn());
const mockInjectCSS     = vi.hoisted(() => vi.fn());
const mockRenderTable   = vi.hoisted(() => vi.fn());
const mockLoadAndRender = vi.hoisted(() => vi.fn());
const mockSetEntries    = vi.hoisted(() => vi.fn());
const mockSetIsOwner    = vi.hoisted(() => vi.fn());
const mockResetFilters  = vi.hoisted(() => vi.fn());

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

// ── TC1: loadPublicDebateArchive calls get_public_debate_archive RPC ──────────

describe('TC1 — loadPublicDebateArchive calls the get_public_debate_archive RPC', () => {
  it('uses the exact RPC name get_public_debate_archive (spec-named RPC)', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = document.createElement('div');

    await loadPublicDebateArchive(container, 'user-tc1');

    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [rpcName] = mockSafeRpc.mock.calls[0];
    expect(rpcName).toBe('get_public_debate_archive');
  });
});

// ── TC2: get_public_debate_archive receives the target user ID ────────────────

describe('TC2 — loadPublicDebateArchive passes target userId as p_user_id', () => {
  it('sends p_user_id matching the userId argument', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = document.createElement('div');

    await loadPublicDebateArchive(container, 'user-abc-123');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params).toEqual({ p_user_id: 'user-abc-123' });
  });
});

// ── TC3: injectCSS on owner load (spreadsheet-style table) ───────────────────

describe('TC3 — loadDebateArchive calls injectCSS for spreadsheet-style table styling', () => {
  it('injects CSS when loading owner archive', async () => {
    const container = document.createElement('div');
    mockLoadAndRender.mockResolvedValue(undefined);

    await loadDebateArchive(container, true);

    expect(mockInjectCSS).toHaveBeenCalled();
  });
});

// ── TC4: injectCSS on public load ────────────────────────────────────────────

describe('TC4 — loadPublicDebateArchive calls injectCSS for spreadsheet-style table styling', () => {
  it('injects CSS when loading public archive', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = document.createElement('div');

    await loadPublicDebateArchive(container, 'user-tc4');

    expect(mockInjectCSS).toHaveBeenCalled();
  });
});

// ── TC5: public by default — setIsOwner(false) on public load ────────────────

describe('TC5 — loadPublicDebateArchive sets isOwner=false (public by default)', () => {
  it('calls setIsOwner with false on public archive load', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = document.createElement('div');

    await loadPublicDebateArchive(container, 'user-tc5');

    expect(mockSetIsOwner).toHaveBeenCalledWith(false);
  });
});

// ── TC6: owner flag propagated on owner load ─────────────────────────────────

describe('TC6 — loadDebateArchive propagates isOwner=true to state', () => {
  it('calls setIsOwner with true when called as owner', async () => {
    const container = document.createElement('div');
    mockLoadAndRender.mockResolvedValue(undefined);

    await loadDebateArchive(container, true);

    expect(mockSetIsOwner).toHaveBeenCalledWith(true);
  });
});

// ── TC7: resetFilters on owner load (clean filter state) ─────────────────────

describe('TC7 — loadDebateArchive calls resetFilters before loading', () => {
  it('resets all filter state on owner archive load', async () => {
    const container = document.createElement('div');
    mockLoadAndRender.mockResolvedValue(undefined);

    await loadDebateArchive(container, true);

    expect(mockResetFilters).toHaveBeenCalled();
  });
});

// ── TC8: resetFilters on public load ─────────────────────────────────────────

describe('TC8 — loadPublicDebateArchive calls resetFilters before loading', () => {
  it('resets all filter state on public archive load', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const container = document.createElement('div');

    await loadPublicDebateArchive(container, 'user-tc8');

    expect(mockResetFilters).toHaveBeenCalled();
  });
});

// ── TC9: loading placeholder on owner path ───────────────────────────────────

describe('TC9 — loadDebateArchive shows loading placeholder before async work', () => {
  it('container has dba-loading class before loadAndRender resolves', async () => {
    const container = document.createElement('div');
    let htmlDuringLoad = '';
    mockLoadAndRender.mockImplementation(async () => {
      htmlDuringLoad = container.innerHTML;
    });

    await loadDebateArchive(container, true);

    expect(htmlDuringLoad).toContain('dba-loading');
  });
});

// ── TC10: loading placeholder on public path ─────────────────────────────────

describe('TC10 — loadPublicDebateArchive shows loading placeholder before RPC resolves', () => {
  it('container has dba-loading class before safeRpc resolves', async () => {
    const container = document.createElement('div');
    let htmlDuringRpc = '';
    mockSafeRpc.mockImplementation(async () => {
      htmlDuringRpc = container.innerHTML;
      return { data: [], error: null };
    });

    await loadPublicDebateArchive(container, 'user-tc10');

    expect(htmlDuringRpc).toContain('dba-loading');
  });
});

// ── TC11: owner path delegates to loadAndRender (manual curation) ────────────

describe('TC11 — loadDebateArchive delegates to loadAndRender for owner (manual curation)', () => {
  it('calls loadAndRender with the container when isOwner=true', async () => {
    const container = document.createElement('div');
    mockLoadAndRender.mockResolvedValue(undefined);

    await loadDebateArchive(container, true);

    expect(mockLoadAndRender).toHaveBeenCalledWith(container);
  });
});

// ── TC12: non-owner on loadDebateArchive shows unavailable, no loadAndRender ──

describe('TC12 — loadDebateArchive shows unavailable for non-owner, does not call loadAndRender', () => {
  it('renders dba-empty and skips loadAndRender when isOwner=false', async () => {
    const container = document.createElement('div');

    await loadDebateArchive(container, false);

    expect(container.innerHTML).toContain('dba-empty');
    expect(mockLoadAndRender).not.toHaveBeenCalled();
  });
});

// ── TC13: isOwner defaults to false ──────────────────────────────────────────

describe('TC13 — loadDebateArchive isOwner defaults to false', () => {
  it('does not call loadAndRender when called without second argument', async () => {
    const container = document.createElement('div');

    await loadDebateArchive(container);

    expect(mockLoadAndRender).not.toHaveBeenCalled();
    expect(container.innerHTML).toContain('dba-empty');
  });
});

// ── TC14: public RPC error shows unavailable, no renderTable ─────────────────

describe('TC14 — loadPublicDebateArchive RPC error shows unavailable message', () => {
  it('renders dba-empty and does not call renderTable when RPC returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const container = document.createElement('div');

    await loadPublicDebateArchive(container, 'user-tc14');

    expect(container.innerHTML).toContain('dba-empty');
    expect(mockRenderTable).not.toHaveBeenCalled();
  });
});

// ── TC15: public RPC success calls setEntries + renderTable ──────────────────

describe('TC15 — loadPublicDebateArchive success renders the archive table', () => {
  it('calls setEntries with data and renderTable with container on success', async () => {
    const rows = [{ debate_id: 'debate-a', topic: 'Is AI conscious?' }];
    mockSafeRpc.mockResolvedValue({ data: rows, error: null });
    const container = document.createElement('div');

    await loadPublicDebateArchive(container, 'user-tc15');

    expect(mockSetEntries).toHaveBeenCalledWith(rows);
    expect(mockRenderTable).toHaveBeenCalledWith(container);
  });
});

// ── TC16: null data treated as empty array (graceful empty archive) ───────────

describe('TC16 — loadPublicDebateArchive null data treated as empty array', () => {
  it('calls setEntries with [] when RPC returns null data (archive links permanent)', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    const container = document.createElement('div');

    await loadPublicDebateArchive(container, 'user-tc16');

    expect(mockSetEntries).toHaveBeenCalledWith([]);
    expect(mockRenderTable).toHaveBeenCalledWith(container);
  });
});

// ── ARCH ─────────────────────────────────────────────────────────────────────

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
