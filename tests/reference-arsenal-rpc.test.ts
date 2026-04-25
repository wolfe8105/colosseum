import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

import {
  forgeReference,
  editReference,
  deleteReference,
  secondReference,
  citeReference,
  challengeReference,
  getTrendingReferences,
  getLibrary,
} from '../src/reference-arsenal.rpc.ts';

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockSafeRpc.mockReset();
});

function buildForgeParams(overrides = {}) {
  return {
    source_title: 'IPCC Report',
    source_author: 'IPCC',
    source_date: '2023-01-01',
    locator: 'p.42',
    claim_text: 'Global temps rose 1.1°C',
    source_type: 'primary' as const,
    category: 'politics' as const,
    source_url: undefined,
    ...overrides,
  };
}

// ── forgeReference ─────────────────────────────────────────────

describe('TC1 — forgeReference calls forge_reference RPC', () => {
  it('calls safeRpc with "forge_reference"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { ref_id: 'ref-1', action: 'created' }, error: null });

    await forgeReference(buildForgeParams());

    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('forge_reference');
  });
});

describe('TC2 — forgeReference sends all named params', () => {
  it('params include p_source_title, p_claim_text, p_source_type', async () => {
    mockSafeRpc.mockResolvedValue({ data: { ref_id: 'ref-1', action: 'created' }, error: null });

    await forgeReference(buildForgeParams({ source_title: 'Test', claim_text: 'Claim', source_type: 'primary' }));

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_source_title).toBe('Test');
    expect(params.p_claim_text).toBe('Claim');
    expect(params.p_source_type).toBe('primary');
  });
});

describe('TC3 — forgeReference throws on RPC error', () => {
  it('throws when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'forge failed' } });

    await expect(forgeReference(buildForgeParams())).rejects.toThrow('forge failed');
  });
});

// ── editReference ──────────────────────────────────────────────

describe('TC4 — editReference calls edit_reference RPC', () => {
  it('calls safeRpc with "edit_reference"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { action: 'updated' }, error: null });

    await editReference('ref-abc', buildForgeParams());

    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('edit_reference');
  });
});

describe('TC5 — editReference sends p_ref_id', () => {
  it('params include p_ref_id matching the referenceId argument', async () => {
    mockSafeRpc.mockResolvedValue({ data: { action: 'updated' }, error: null });

    await editReference('ref-specific', buildForgeParams());

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_ref_id).toBe('ref-specific');
  });
});

// ── deleteReference ────────────────────────────────────────────

describe('TC6 — deleteReference calls delete_reference RPC', () => {
  it('calls safeRpc with "delete_reference"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { action: 'deleted' }, error: null });

    await deleteReference('ref-del');

    const [fnName, params] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('delete_reference');
    expect(params.p_ref_id).toBe('ref-del');
  });
});

describe('TC7 — deleteReference throws on error', () => {
  it('throws when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'not found' } });

    await expect(deleteReference('ref-x')).rejects.toThrow('not found');
  });
});

// ── secondReference ────────────────────────────────────────────

describe('TC8 — secondReference calls second_reference RPC', () => {
  it('calls safeRpc with "second_reference" and p_ref_id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { action: 'seconded' }, error: null });

    await secondReference('ref-sec');

    const [fnName, params] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('second_reference');
    expect(params.p_ref_id).toBe('ref-sec');
  });
});

// ── citeReference ──────────────────────────────────────────────

describe('TC9 — citeReference calls cite_reference RPC', () => {
  it('calls safeRpc with "cite_reference"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { action: 'cited' }, error: null });

    await citeReference('ref-cite', 'debate-1');

    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('cite_reference');
  });
});

describe('TC10 — citeReference sends p_reference_id and p_debate_id', () => {
  it('params include both IDs', async () => {
    mockSafeRpc.mockResolvedValue({ data: { action: 'cited' }, error: null });

    await citeReference('ref-cite', 'debate-xyz');

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_reference_id).toBe('ref-cite');
    expect(params.p_debate_id).toBe('debate-xyz');
  });
});

// ── challengeReference ─────────────────────────────────────────

describe('TC11 — challengeReference calls challenge_reference RPC', () => {
  it('calls safeRpc with "challenge_reference"', async () => {
    mockSafeRpc.mockResolvedValue({ data: { action: 'filed' }, error: null });

    await challengeReference('ref-ch', 'bad data', null);

    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('challenge_reference');
  });
});

describe('TC12 — challengeReference sends p_ref_id and p_grounds', () => {
  it('params include ref id and grounds text', async () => {
    mockSafeRpc.mockResolvedValue({ data: { action: 'filed' }, error: null });

    await challengeReference('ref-challenge', 'Misleading', null);

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_ref_id).toBe('ref-challenge');
    expect(params.p_grounds).toBe('Misleading');
  });
});

// ── getTrendingReferences ──────────────────────────────────────

describe('TC13 — getTrendingReferences calls get_trending_references RPC', () => {
  it('calls safeRpc with "get_trending_references"', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await getTrendingReferences();

    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('get_trending_references');
  });
});

describe('TC14 — getTrendingReferences returns empty array on error', () => {
  it('returns [] when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });

    const result = await getTrendingReferences();

    expect(result).toEqual([]);
  });
});

// ── getLibrary ─────────────────────────────────────────────────

describe('TC15 — getLibrary calls get_reference_library RPC', () => {
  it('calls safeRpc with "get_reference_library"', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await getLibrary();

    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('get_reference_library');
  });
});

describe('TC16 — getLibrary maps filters to p_ params', () => {
  it('includes p_search and p_category when filters are provided', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await getLibrary({ search: 'climate', category: 'politics', sort: 'power' });

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_search).toBe('climate');
    expect(params.p_category).toBe('politics');
    expect(params.p_sort).toBe('power');
  });
});

describe('TC17 — getLibrary omits undefined filter params', () => {
  it('does not include p_search when search filter is absent', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await getLibrary({ category: 'sports' });

    const [, params] = mockSafeRpc.mock.calls[0];
    expect('p_search' in params).toBe(false);
  });
});

// ── Import contract ────────────────────────────────────────────

describe('TC18 — safeRpc import contract', () => {
  it('every RPC wrapper calls the safeRpc mock from auth.ts', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await getTrendingReferences();
    expect(mockSafeRpc).toHaveBeenCalled();
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — reference-arsenal.rpc.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './reference-arsenal.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/reference-arsenal.rpc.ts'),
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
