// ============================================================
// PROFILE DEBATE ARCHIVE PICKER — tests/profile-debate-archive-picker.test.ts
// Source: src/profile-debate-archive.picker.ts
//
// CLASSIFICATION:
//   showAddPicker() — Multi-step orchestration + RPC + DOM event wiring
//     → Integration test: mock safeRpc, escapeHTML, showToast, loadAndRender
//
// IMPORTS:
//   { safeRpc }       from './auth.rpc.ts'
//   { escapeHTML, showToast } from './config.ts'
//   { loadAndRender } from './profile-debate-archive.edit.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc      = vi.hoisted(() => vi.fn());
const mockEscapeHTML   = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowToast    = vi.hoisted(() => vi.fn());
const mockLoadAndRender = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../src/auth.rpc.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
}));

vi.mock('../src/profile-debate-archive.edit.ts', () => ({
  loadAndRender: mockLoadAndRender,
}));

import { showAddPicker } from '../src/profile-debate-archive.picker.ts';

const makeContainer = () => document.createElement('div');

const FAKE_DEBATES = [
  {
    debate_id: 'debate-1',
    topic: 'AI will take all jobs',
    opponent_name: 'Alice',
    opponent_username: 'alice99',
    debate_created_at: '2024-01-15T10:00:00Z',
    is_win: true,
  },
  {
    debate_id: 'debate-2',
    topic: null,
    opponent_name: null,
    opponent_username: 'bob42',
    debate_created_at: '2024-01-10T10:00:00Z',
    is_win: false,
  },
];

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockShowToast.mockReset();
  mockLoadAndRender.mockReset().mockResolvedValue(undefined);
  mockEscapeHTML.mockImplementation((s: string) => s);
  document.body.innerHTML = '';
});

// ── TC1: calls safeRpc with get_my_recent_debates_for_archive ─

describe('TC1 — showAddPicker: calls get_my_recent_debates_for_archive RPC', () => {
  it('calls safeRpc with correct function name', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await showAddPicker(makeContainer());
    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('get_my_recent_debates_for_archive');
  });

  it('passes p_limit: 30', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await showAddPicker(makeContainer());
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_limit).toBe(30);
  });
});

// ── TC2: shows error toast on RPC error ──────────────────────

describe('TC2 — showAddPicker: shows error toast when RPC fails', () => {
  it('calls showToast with error level when RPC returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });
    await showAddPicker(makeContainer());
    expect(mockShowToast).toHaveBeenCalledWith('Could not load debates', 'error');
  });

  it('does not append overlay to DOM on RPC error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'err' } });
    await showAddPicker(makeContainer());
    expect(document.querySelector('.dba-picker-overlay')).toBeNull();
  });
});

// ── TC3: appends overlay to document.body on success ─────────

describe('TC3 — showAddPicker: appends picker overlay to document.body', () => {
  it('adds .dba-picker-overlay to the DOM', async () => {
    mockSafeRpc.mockResolvedValue({ data: FAKE_DEBATES, error: null });
    await showAddPicker(makeContainer());
    expect(document.querySelector('.dba-picker-overlay')).not.toBeNull();
  });
});

// ── TC4: renders debate rows ──────────────────────────────────

describe('TC4 — showAddPicker: renders one row per debate', () => {
  it('creates a .dba-picker-row for each returned debate', async () => {
    mockSafeRpc.mockResolvedValue({ data: FAKE_DEBATES, error: null });
    await showAddPicker(makeContainer());
    const rows = document.querySelectorAll('.dba-picker-row');
    expect(rows.length).toBe(FAKE_DEBATES.length);
  });
});

// ── TC5: shows empty state when no debates returned ──────────

describe('TC5 — showAddPicker: shows empty state for empty list', () => {
  it('renders .dba-picker-empty when RPC returns empty array', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await showAddPicker(makeContainer());
    expect(document.querySelector('.dba-picker-empty')).not.toBeNull();
  });
});

// ── TC6: clicking overlay backdrop closes it ─────────────────

describe('TC6 — showAddPicker: clicking overlay backdrop closes it', () => {
  it('removes overlay from DOM when backdrop is clicked directly', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await showAddPicker(makeContainer());
    const overlay = document.querySelector<HTMLElement>('.dba-picker-overlay')!;
    const evt = new MouseEvent('click', { bubbles: false });
    Object.defineProperty(evt, 'target', { value: overlay });
    overlay.dispatchEvent(evt);
    expect(document.querySelector('.dba-picker-overlay')).toBeNull();
  });
});

// ── TC7: clicking a row adds debate and calls loadAndRender ──

describe('TC7 — showAddPicker: clicking a row adds debate and reloads', () => {
  it('calls safeRpc(add_debate_to_archive) and then loadAndRender on row click', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: FAKE_DEBATES, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const container = makeContainer();
    await showAddPicker(container);

    const row = document.querySelector<HTMLElement>('.dba-picker-row')!;
    row.click();
    await new Promise(r => setTimeout(r, 0));

    expect(mockSafeRpc).toHaveBeenCalledTimes(2);
    const [addFnName, addParams] = mockSafeRpc.mock.calls[1];
    expect(addFnName).toBe('add_debate_to_archive');
    expect(addParams.p_debate_id).toBe('debate-1');
    expect(mockLoadAndRender).toHaveBeenCalledWith(container);
  });
});

// ── TC8: row click shows success toast ───────────────────────

describe('TC8 — showAddPicker: successful row click shows success toast', () => {
  it('calls showToast("Added to archive", "success")', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: FAKE_DEBATES, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    await showAddPicker(makeContainer());
    document.querySelector<HTMLElement>('.dba-picker-row')!.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockShowToast).toHaveBeenCalledWith('Added to archive', 'success');
  });
});

// ── TC9: row click error shows error toast ────────────────────

describe('TC9 — showAddPicker: add RPC error shows error toast', () => {
  it('calls showToast("Could not add debate", "error") on add failure', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: FAKE_DEBATES, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'fail' } });

    await showAddPicker(makeContainer());
    document.querySelector<HTMLElement>('.dba-picker-row')!.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockShowToast).toHaveBeenCalledWith('Could not add debate', 'error');
    expect(mockLoadAndRender).not.toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/profile-debate-archive.picker.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './auth.rpc.ts',
      './config.ts',
      './profile-debate-archive.edit.ts',
      './profile-debate-archive.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/profile-debate-archive.picker.ts'),
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
