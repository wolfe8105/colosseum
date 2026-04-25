import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

import {
  saveDebateLoadout,
  getMyDebateLoadout,
  citeDebateReference,
  fileReferenceChallenge,
} from '../src/reference-arsenal.debate.ts';

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockSafeRpc.mockReset();
});

// ── saveDebateLoadout ──────────────────────────────────────────

describe('TC1 — saveDebateLoadout calls save_debate_loadout RPC', () => {
  it('calls safeRpc with "save_debate_loadout"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await saveDebateLoadout('debate-1', ['ref-a', 'ref-b']);

    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('save_debate_loadout');
  });
});

describe('TC2 — saveDebateLoadout sends p_debate_id and p_reference_ids', () => {
  it('params include both debate id and reference ids array', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    await saveDebateLoadout('debate-abc', ['ref-1', 'ref-2']);

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_debate_id).toBe('debate-abc');
    expect(params.p_reference_ids).toEqual(['ref-1', 'ref-2']);
  });
});

describe('TC3 — saveDebateLoadout throws on error', () => {
  it('throws when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'save failed' } });

    await expect(saveDebateLoadout('debate-1', [])).rejects.toThrow('save failed');
  });
});

// ── getMyDebateLoadout ─────────────────────────────────────────

describe('TC4 — getMyDebateLoadout calls get_my_debate_loadout RPC', () => {
  it('calls safeRpc with "get_my_debate_loadout"', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await getMyDebateLoadout('debate-1');

    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('get_my_debate_loadout');
  });
});

describe('TC5 — getMyDebateLoadout sends p_debate_id', () => {
  it('params include p_debate_id', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await getMyDebateLoadout('debate-xyz');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_debate_id).toBe('debate-xyz');
  });
});

describe('TC6 — getMyDebateLoadout returns data array', () => {
  it('returns data when safeRpc succeeds', async () => {
    const refs = [{ ref_id: 'ref-1', source_title: 'Test' }];
    mockSafeRpc.mockResolvedValue({ data: refs, error: null });

    const result = await getMyDebateLoadout('debate-1');

    expect(result).toEqual(refs);
  });
});

describe('TC7 — getMyDebateLoadout throws on error', () => {
  it('throws when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'loadout not found' } });

    await expect(getMyDebateLoadout('debate-1')).rejects.toThrow('loadout not found');
  });
});

// ── citeDebateReference ────────────────────────────────────────

describe('TC8 — citeDebateReference calls cite_debate_reference RPC', () => {
  it('calls safeRpc with "cite_debate_reference"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { cited: true }, error: null });

    await citeDebateReference('debate-1', 'ref-1', 2, 'pro');

    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('cite_debate_reference');
  });
});

describe('TC9 — citeDebateReference sends all params', () => {
  it('params include p_debate_id, p_reference_id, p_round, p_side', async () => {
    mockSafeRpc.mockResolvedValue({ data: { cited: true }, error: null });

    await citeDebateReference('debate-abc', 'ref-xyz', 3, 'con');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_debate_id).toBe('debate-abc');
    expect(params.p_reference_id).toBe('ref-xyz');
    expect(params.p_round).toBe(3);
    expect(params.p_side).toBe('con');
  });
});

describe('TC10 — citeDebateReference throws on RPC error', () => {
  it('throws when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'cite failed' } });

    await expect(citeDebateReference('d', 'r', 1, 'pro')).rejects.toThrow('cite failed');
  });
});

describe('TC11 — citeDebateReference throws when data is null', () => {
  it('throws when safeRpc returns no data and no error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    await expect(citeDebateReference('d', 'r', 1, 'pro')).rejects.toThrow('returned no data');
  });
});

// ── fileReferenceChallenge ─────────────────────────────────────

describe('TC12 — fileReferenceChallenge calls file_reference_challenge RPC', () => {
  it('calls safeRpc with "file_reference_challenge"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { challenged: true }, error: null });

    await fileReferenceChallenge('debate-1', 'ref-1', 1, 'pro');

    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('file_reference_challenge');
  });
});

describe('TC13 — fileReferenceChallenge sends all params', () => {
  it('params include p_debate_id, p_reference_id, p_round, p_side', async () => {
    mockSafeRpc.mockResolvedValue({ data: { challenged: true }, error: null });

    await fileReferenceChallenge('debate-abc', 'ref-xyz', 2, 'con');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_debate_id).toBe('debate-abc');
    expect(params.p_reference_id).toBe('ref-xyz');
    expect(params.p_round).toBe(2);
    expect(params.p_side).toBe('con');
  });
});

describe('TC14 — fileReferenceChallenge throws on RPC error', () => {
  it('throws when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'challenge failed' } });

    await expect(fileReferenceChallenge('d', 'r', 1, 'pro')).rejects.toThrow('challenge failed');
  });
});

describe('TC15 — fileReferenceChallenge throws when data is null', () => {
  it('throws when safeRpc returns no data and no error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    await expect(fileReferenceChallenge('d', 'r', 1, 'pro')).rejects.toThrow('returned no data');
  });
});

// ── Import contract ────────────────────────────────────────────

describe('TC16 — safeRpc import contract', () => {
  it('every RPC wrapper calls the safeRpc mock from auth.ts', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await getMyDebateLoadout('debate-1');
    expect(mockSafeRpc).toHaveBeenCalled();
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — reference-arsenal.debate.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './reference-arsenal.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/reference-arsenal.debate.ts'),
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
