// ============================================================
// INTEGRATOR — reference-arsenal.rpc
// Seam #148 | score: 13
// Boundary: forgeReference / editReference / deleteReference /
//           secondReference / citeReference / challengeReference /
//           getTrendingReferences / getLibrary all call safeRpc.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// ARCH FILTER — verify only @supabase/supabase-js is mocked
// ============================================================

describe('ARCH — reference-arsenal.rpc import boundary', () => {
  it('only imports from auth.ts and reference-arsenal.types.ts', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.rpc.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const externalImports = importLines.filter(
      l => !l.includes('./auth') && !l.includes('./reference-arsenal.types')
    );
    expect(externalImports).toHaveLength(0);
  });
});

// ============================================================
// MODULE HANDLES
// ============================================================

let forgeReference: (params: Record<string, unknown>) => Promise<unknown>;
let editReference: (refId: string, params: Record<string, unknown>) => Promise<unknown>;
let deleteReference: (refId: string) => Promise<void>;
let secondReference: (refId: string) => Promise<unknown>;
let citeReference: (refId: string, debateId: string, outcome?: string | null) => Promise<unknown>;
let challengeReference: (refId: string, grounds: string, contextDebateId?: string | null) => Promise<unknown>;
let getTrendingReferences: () => Promise<unknown[]>;
let getLibrary: (filters?: Record<string, unknown>) => Promise<unknown[]>;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      cb('INITIAL_SESSION', null);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  mockRpc.mockResolvedValue({ data: null, error: null });

  const mod = await import('../../src/reference-arsenal.rpc.ts');
  forgeReference = mod.forgeReference as typeof forgeReference;
  editReference = mod.editReference as typeof editReference;
  deleteReference = mod.deleteReference as typeof deleteReference;
  secondReference = mod.secondReference as typeof secondReference;
  citeReference = mod.citeReference as typeof citeReference;
  challengeReference = mod.challengeReference as typeof challengeReference;
  getTrendingReferences = mod.getTrendingReferences as typeof getTrendingReferences;
  getLibrary = mod.getLibrary as typeof getLibrary;
});

// ============================================================
// TC1: forgeReference — calls safeRpc with trimmed params
// ============================================================

describe('TC1 — forgeReference calls forge_reference RPC with trimmed params', () => {
  it('passes trimmed fields to safeRpc and returns data', async () => {
    const mockData = { id: 'ref-001', power: 42 };
    mockRpc.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await forgeReference({
      source_title: '  My Source  ',
      source_author: ' Jane Doe ',
      source_date: '2024-01-01',
      locator: '  p.42  ',
      claim_text: '  Earth is round  ',
      source_type: 'book',
      category: 'science',
      source_url: '  https://example.com  ',
    });

    expect(mockRpc).toHaveBeenCalledWith('forge_reference', expect.objectContaining({
      p_source_title: 'My Source',
      p_source_author: 'Jane Doe',
      p_locator: 'p.42',
      p_claim_text: 'Earth is round',
      p_source_url: 'https://example.com',
    }));
    expect(result).toEqual(mockData);
  });
});

// ============================================================
// TC2: forgeReference — throws on error
// ============================================================

describe('TC2 — forgeReference throws on RPC error', () => {
  it('throws with the error message when safeRpc returns an error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Duplicate reference' } });

    await expect(forgeReference({
      source_title: 'Title',
      source_author: 'Author',
      source_date: '2024-01-01',
      locator: 'p.1',
      claim_text: 'A claim',
      source_type: 'book',
      category: 'science',
    })).rejects.toThrow('Duplicate reference');
  });
});

// ============================================================
// TC3: editReference — passes ref ID and trimmed fields
// ============================================================

describe('TC3 — editReference calls edit_reference RPC with p_ref_id and trimmed fields', () => {
  it('includes p_ref_id and trimmed source fields', async () => {
    const mockData = { success: true };
    mockRpc.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await editReference('ref-abc', {
      source_title: '  Updated Title  ',
      source_author: ' Updated Author ',
      source_date: '2024-06-01',
      locator: '  ch.3  ',
      claim_text: '  Updated claim  ',
      category: 'politics',
    });

    expect(mockRpc).toHaveBeenCalledWith('edit_reference', expect.objectContaining({
      p_ref_id: 'ref-abc',
      p_source_title: 'Updated Title',
      p_source_author: 'Updated Author',
      p_locator: 'ch.3',
      p_claim_text: 'Updated claim',
      p_category: 'politics',
    }));
    expect(result).toEqual(mockData);
  });
});

// ============================================================
// TC4: deleteReference — calls delete_reference and throws on error
// ============================================================

describe('TC4 — deleteReference calls delete_reference and throws on error', () => {
  it('calls safeRpc with p_ref_id', async () => {
    mockRpc.mockResolvedValueOnce({ data: { action: 'deleted' }, error: null });

    await deleteReference('ref-delete-001');

    expect(mockRpc).toHaveBeenCalledWith('delete_reference', { p_ref_id: 'ref-delete-001' });
  });

  it('throws when safeRpc returns an error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Not authorized' } });

    await expect(deleteReference('ref-bad')).rejects.toThrow('Not authorized');
  });
});

// ============================================================
// TC5: secondReference — returns data; throws on error
// ============================================================

describe('TC5 — secondReference calls second_reference RPC', () => {
  it('returns SecondResult on success', async () => {
    const mockData = { action: 'seconded', new_seconds: 5 };
    mockRpc.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await secondReference('ref-002');

    expect(mockRpc).toHaveBeenCalledWith('second_reference', { p_ref_id: 'ref-002' });
    expect(result).toEqual(mockData);
  });

  it('throws on error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Already seconded' } });

    await expect(secondReference('ref-002')).rejects.toThrow('Already seconded');
  });
});

// ============================================================
// TC6: citeReference — passes outcome (including null)
// ============================================================

describe('TC6 — citeReference calls cite_reference with outcome', () => {
  it('passes referenceId, debateId, and outcome to safeRpc', async () => {
    mockRpc.mockResolvedValueOnce({ data: { action: 'cited' }, error: null });

    const result = await citeReference('ref-003', 'debate-777', 'win');

    expect(mockRpc).toHaveBeenCalledWith('cite_reference', {
      p_reference_id: 'ref-003',
      p_debate_id: 'debate-777',
      p_outcome: 'win',
    });
    expect(result).toEqual({ action: 'cited' });
  });

  it('defaults outcome to null when not provided', async () => {
    mockRpc.mockResolvedValueOnce({ data: { action: 'cited' }, error: null });

    await citeReference('ref-004', 'debate-888');

    expect(mockRpc).toHaveBeenCalledWith('cite_reference', expect.objectContaining({
      p_outcome: null,
    }));
  });
});

// ============================================================
// TC7: challengeReference — passes grounds and optional context debate
// ============================================================

describe('TC7 — challengeReference calls challenge_reference RPC', () => {
  it('passes ref ID, grounds, and contextDebateId', async () => {
    const mockData = { action: 'challenged', status: 'open' };
    mockRpc.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await challengeReference('ref-005', 'Outdated data', 'debate-ctx-1');

    expect(mockRpc).toHaveBeenCalledWith('challenge_reference', {
      p_ref_id: 'ref-005',
      p_grounds: 'Outdated data',
      p_context_debate_id: 'debate-ctx-1',
    });
    expect(result).toEqual(mockData);
  });

  it('defaults contextDebateId to null when omitted', async () => {
    mockRpc.mockResolvedValueOnce({ data: { action: 'challenged' }, error: null });

    await challengeReference('ref-006', 'Bad source');

    expect(mockRpc).toHaveBeenCalledWith('challenge_reference', expect.objectContaining({
      p_context_debate_id: null,
    }));
  });
});

// ============================================================
// TC8: getTrendingReferences — returns [] on error, data on success
// ============================================================

describe('TC8 — getTrendingReferences gracefully handles errors', () => {
  it('returns empty array when safeRpc returns an error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const result = await getTrendingReferences();

    expect(result).toEqual([]);
  });

  it('returns trending references on success', async () => {
    const trending = [{ id: 'ref-t1', power: 99 }, { id: 'ref-t2', power: 88 }];
    mockRpc.mockResolvedValueOnce({ data: trending, error: null });

    const result = await getTrendingReferences();

    expect(result).toEqual(trending);
    expect(mockRpc).toHaveBeenCalledWith('get_trending_references', {});
  });
});

// ============================================================
// TC9: getLibrary — builds params selectively from filters
// ============================================================

describe('TC9 — getLibrary builds params selectively and throws on error', () => {
  it('passes only defined filter fields as params', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    await getLibrary({ search: 'climate', category: 'science', sort: 'power' });

    const callArgs = mockRpc.mock.calls[0];
    expect(callArgs[0]).toBe('get_reference_library');
    expect(callArgs[1]).toMatchObject({
      p_search: 'climate',
      p_category: 'science',
      p_sort: 'power',
    });
    // rarity, sourceType, graduated, challengeStatus not in params
    expect(callArgs[1]).not.toHaveProperty('p_rarity');
    expect(callArgs[1]).not.toHaveProperty('p_source_type');
  });

  it('calls with empty params object when no filters provided', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    await getLibrary();

    expect(mockRpc).toHaveBeenCalledWith('get_reference_library', {});
  });

  it('includes p_graduated when explicitly set to false', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    await getLibrary({ graduated: false });

    expect(mockRpc).toHaveBeenCalledWith(
      'get_reference_library',
      expect.objectContaining({ p_graduated: false })
    );
  });

  it('throws when safeRpc returns an error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Failed to load library' } });

    await expect(getLibrary()).rejects.toThrow('Failed to load library');
  });
});

// ============================================================
// SEAM #159 — reference-arsenal.ts → reference-arsenal.utils
// Pure utility functions: compositeScore, powerDisplay
// No RPC. No DOM. No Supabase.
// ============================================================

import { readFileSync as readFileSyncUtils } from 'fs';
import { resolve as resolveUtils } from 'path';

describe('ARCH — reference-arsenal.utils import boundary (seam #159)', () => {
  it('only imports from reference-arsenal.types and reference-arsenal.constants (no Supabase, no DOM)', () => {
    const src = readFileSyncUtils(
      resolveUtils(__dirname, '../../src/reference-arsenal.utils.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const externalImports = importLines.filter(
      l =>
        !l.includes('./reference-arsenal.types') &&
        !l.includes('./reference-arsenal.constants')
    );
    expect(externalImports).toHaveLength(0);
  });
});

// ============================================================
// Utility module handle
// ============================================================

let compositeScore: (ref: {
  seconds: number;
  strikes: number;
  source_type: string;
  current_power: number;
  graduated: boolean;
}) => number;

let powerDisplay: (ref: {
  seconds: number;
  strikes: number;
  source_type: string;
  current_power: number;
  graduated: boolean;
}) => string;

// re-import in a separate beforeEach scoped to the utils describe block
// (the outer beforeEach resets modules but only imports rpc — we also need utils)
describe('reference-arsenal.utils — compositeScore + powerDisplay (seam #159)', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mod = await import('../../src/reference-arsenal.utils.ts');
    compositeScore = mod.compositeScore as typeof compositeScore;
    powerDisplay = mod.powerDisplay as typeof powerDisplay;
  });

  // TC-U1: compositeScore basic formula
  it('TC-U1 — compositeScore returns (seconds * 2) + strikes', async () => {
    const ref = { seconds: 3, strikes: 5, source_type: 'book', current_power: 2, graduated: false };
    expect(compositeScore(ref)).toBe(11); // (3 * 2) + 5
  });

  // TC-U2: compositeScore with zero values
  it('TC-U2 — compositeScore returns 0 when seconds and strikes are both 0', async () => {
    const ref = { seconds: 0, strikes: 0, source_type: 'news', current_power: 0, graduated: false };
    expect(compositeScore(ref)).toBe(0);
  });

  // TC-U3: compositeScore with large values
  it('TC-U3 — compositeScore handles large numbers correctly', async () => {
    const ref = { seconds: 100, strikes: 50, source_type: 'academic', current_power: 3, graduated: false };
    expect(compositeScore(ref)).toBe(250); // (100 * 2) + 50
  });

  // TC-U4: powerDisplay — non-graduated uses ceiling as-is
  it('TC-U4 — powerDisplay returns "power/ceiling" for non-graduated primary source', async () => {
    // primary has ceiling: 5
    const ref = { seconds: 2, strikes: 1, source_type: 'primary', current_power: 3, graduated: false };
    expect(powerDisplay(ref)).toBe('3/5');
  });

  // TC-U5: powerDisplay — graduated adds 1 to ceiling
  it('TC-U5 — powerDisplay adds 1 to ceiling when graduated=true', async () => {
    // book has ceiling: 3 → graduated ceiling = 4
    const ref = { seconds: 1, strikes: 0, source_type: 'book', current_power: 4, graduated: true };
    expect(powerDisplay(ref)).toBe('4/4');
  });

  // TC-U6: powerDisplay — falls back to ceiling=1 for unknown source_type
  it('TC-U6 — powerDisplay falls back to ceiling=1 for unknown source_type', async () => {
    const ref = { seconds: 1, strikes: 0, source_type: 'unknown_type', current_power: 1, graduated: false };
    expect(powerDisplay(ref)).toBe('1/1');
  });

  // TC-U7: powerDisplay — academic source ceiling
  it('TC-U7 — powerDisplay uses academic ceiling of 4', async () => {
    // academic has ceiling: 4
    const ref = { seconds: 5, strikes: 2, source_type: 'academic', current_power: 2, graduated: false };
    expect(powerDisplay(ref)).toBe('2/4');
  });
});

// ============================================================
// SEAM #200 — reference-arsenal.ts → reference-arsenal.debate
// Debate-context RPCs: saveDebateLoadout / getMyDebateLoadout /
//   citeDebateReference / fileReferenceChallenge — all call safeRpc.
// Mock boundary: @supabase/supabase-js only
// ============================================================

describe('ARCH — reference-arsenal.debate import boundary (seam #200)', () => {
  it('only imports from auth.ts and reference-arsenal.types (no Supabase, no webrtc, no DOM)', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.debate.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const externalImports = importLines.filter(
      l =>
        !l.includes('./auth') &&
        !l.includes('./reference-arsenal.types')
    );
    expect(externalImports).toHaveLength(0);
  });
});

// ============================================================
// Debate module handles
// ============================================================

let saveDebateLoadout: (debateId: string, referenceIds: string[]) => Promise<void>;
let getMyDebateLoadout: (debateId: string) => Promise<unknown[]>;
let citeDebateReference: (
  debateId: string,
  referenceId: string,
  round: number,
  side: string,
) => Promise<unknown>;
let fileReferenceChallenge: (
  debateId: string,
  referenceId: string,
  round: number,
  side: string,
) => Promise<unknown>;

describe('reference-arsenal.debate — in-match RPCs (seam #200)', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockAuth.onAuthStateChange.mockReset();
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: null) => void) => {
        cb('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }
    );
    mockRpc.mockResolvedValue({ data: null, error: null });

    const mod = await import('../../src/reference-arsenal.debate.ts');
    saveDebateLoadout = mod.saveDebateLoadout as typeof saveDebateLoadout;
    getMyDebateLoadout = mod.getMyDebateLoadout as typeof getMyDebateLoadout;
    citeDebateReference = mod.citeDebateReference as typeof citeDebateReference;
    fileReferenceChallenge = mod.fileReferenceChallenge as typeof fileReferenceChallenge;
  });

  // TC-D1: saveDebateLoadout — calls save_debate_loadout with correct params
  it('TC-D1 — saveDebateLoadout calls save_debate_loadout with p_debate_id and p_reference_ids', async () => {
    mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });

    await saveDebateLoadout('debate-abc', ['r1', 'r2', 'r3']);

    expect(mockRpc).toHaveBeenCalledWith('save_debate_loadout', {
      p_debate_id: 'debate-abc',
      p_reference_ids: ['r1', 'r2', 'r3'],
    });
  });

  // TC-D2: saveDebateLoadout — throws on RPC error
  it('TC-D2 — saveDebateLoadout throws with error message on failure', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Max 5 references allowed' } });

    await expect(saveDebateLoadout('debate-bad', ['r1'])).rejects.toThrow(
      'Max 5 references allowed'
    );
  });

  // TC-D3: getMyDebateLoadout — returns LoadoutRef[] on success
  it('TC-D3 — getMyDebateLoadout calls get_my_debate_loadout and returns data array', async () => {
    const loadout = [
      { id: 'r1', title: 'Ref One', power: 3 },
      { id: 'r2', title: 'Ref Two', power: 5 },
    ];
    mockRpc.mockResolvedValueOnce({ data: loadout, error: null });

    const result = await getMyDebateLoadout('debate-xyz');

    expect(mockRpc).toHaveBeenCalledWith('get_my_debate_loadout', {
      p_debate_id: 'debate-xyz',
    });
    expect(result).toEqual(loadout);
  });

  // TC-D4: getMyDebateLoadout — returns [] when data is null
  it('TC-D4 — getMyDebateLoadout returns empty array when RPC data is null', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await getMyDebateLoadout('debate-empty');

    expect(result).toEqual([]);
  });

  // TC-D5: citeDebateReference — passes all 4 params and returns CiteResult2
  it('TC-D5 — citeDebateReference calls cite_debate_reference with all required params', async () => {
    const citeResult = { action: 'cited', cite_count: 2, power_delta: 1 };
    mockRpc.mockResolvedValueOnce({ data: citeResult, error: null });

    const result = await citeDebateReference('debate-111', 'ref-999', 2, 'pro');

    expect(mockRpc).toHaveBeenCalledWith('cite_debate_reference', {
      p_debate_id: 'debate-111',
      p_reference_id: 'ref-999',
      p_round: 2,
      p_side: 'pro',
    });
    expect(result).toEqual(citeResult);
  });

  // TC-D6: citeDebateReference — throws on RPC error
  it('TC-D6 — citeDebateReference throws when safeRpc returns an error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Reference already cited this round' } });

    await expect(
      citeDebateReference('debate-err', 'ref-err', 1, 'con')
    ).rejects.toThrow('Reference already cited this round');
  });

  // TC-D7: fileReferenceChallenge — calls file_reference_challenge and returns ChallengeResult2
  it('TC-D7 — fileReferenceChallenge calls file_reference_challenge with all required params', async () => {
    const challengeResult = { action: 'challenged', challenge_id: 'ch-001', shield_blocked: false };
    mockRpc.mockResolvedValueOnce({ data: challengeResult, error: null });

    const result = await fileReferenceChallenge('debate-222', 'ref-888', 1, 'con');

    expect(mockRpc).toHaveBeenCalledWith('file_reference_challenge', {
      p_debate_id: 'debate-222',
      p_reference_id: 'ref-888',
      p_round: 1,
      p_side: 'con',
    });
    expect(result).toEqual(challengeResult);
  });
});

// ============================================================
// SEAM #198 — reference-arsenal.ts → reference-arsenal.render
// renderReferenceCard (pure HTML builder) + renderArsenal (async, calls safeRpc)
// Mock boundary: @supabase/supabase-js only
// ============================================================

describe('ARCH — reference-arsenal.render import boundary (seam #198)', () => {
  it('only imports from auth.ts, config.ts, reference-arsenal.utils/constants/types', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.render.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const externalImports = importLines.filter(
      l =>
        !l.includes('./auth') &&
        !l.includes('./config') &&
        !l.includes('./reference-arsenal.utils') &&
        !l.includes('./reference-arsenal.constants') &&
        !l.includes('./reference-arsenal.types')
    );
    expect(externalImports).toHaveLength(0);
  });
});

// ============================================================
// Render module handles
// ============================================================

type ArsenalReferenceRender = {
  id: string;
  claim_text: string;
  source_type: string;
  source_title: string;
  source_author: string;
  source_date: string;
  locator: string;
  source_url?: string | null;
  rarity: string;
  current_power: number;
  seconds: number;
  strikes: number;
  graduated: boolean;
  challenge_status: string;
  owner_username?: string | null;
  sockets?: { socket_index: number; effect_id: string }[] | null;
  created_at: string;
};

let renderReferenceCardFn: (
  ref: ArsenalReferenceRender,
  showSecondBtn: boolean,
  showEditBtn?: boolean,
) => string;
let renderArsenalFn: (container: HTMLElement) => Promise<ArsenalReferenceRender[]>;

describe('reference-arsenal.render — renderReferenceCard + renderArsenal (seam #198)', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockAuth.onAuthStateChange.mockReset();
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: null) => void) => {
        cb('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }
    );

    const mod = await import('../../src/reference-arsenal.render.ts');
    renderReferenceCardFn = mod.renderReferenceCard as typeof renderReferenceCardFn;
    renderArsenalFn = mod.renderArsenal as typeof renderArsenalFn;
  });

  function makeRef(overrides: Partial<ArsenalReferenceRender> = {}): ArsenalReferenceRender {
    return {
      id: 'ref-r01',
      claim_text: 'The Earth is round',
      source_type: 'book',
      source_title: 'Science 101',
      source_author: 'Jane Doe',
      source_date: '2020-01-01',
      locator: 'p.10',
      source_url: null,
      rarity: 'common',
      current_power: 1,
      seconds: 2,
      strikes: 1,
      graduated: false,
      challenge_status: 'none',
      owner_username: null,
      sockets: null,
      created_at: '2024-01-01T00:00:00Z',
      ...overrides,
    };
  }

  // TC-R1: basic HTML structure
  it('TC-R1 — renderReferenceCard emits ref-card, escaped claim and source fields', () => {
    const ref = makeRef();
    const html = renderReferenceCardFn(ref, false);

    expect(html).toContain('ref-card');
    expect(html).toContain('data-ref-id="ref-r01"');
    expect(html).toContain('The Earth is round');
    expect(html).toContain('Science 101');
    expect(html).toContain('COMMON');
  });

  // TC-R2: showSecondBtn toggling
  it('TC-R2 — showSecondBtn=true renders second button; false omits it', () => {
    const ref = makeRef();

    const withBtn = renderReferenceCardFn(ref, true);
    expect(withBtn).toContain('ref-card-second-btn');

    const withoutBtn = renderReferenceCardFn(ref, false);
    expect(withoutBtn).not.toContain('ref-card-second-btn');
  });

  // TC-R3: showEditBtn renders edit and delete buttons
  it('TC-R3 — showEditBtn=true renders both edit and delete buttons', () => {
    const ref = makeRef();
    const html = renderReferenceCardFn(ref, false, true);

    expect(html).toContain('ref-card-edit-btn');
    expect(html).toContain('ref-card-delete-btn');
  });

  // TC-R4: XSS escaping on user content
  it('TC-R4 — XSS in claim_text is escaped in output', () => {
    const ref = makeRef({ claim_text: '<script>alert("xss")</script>' });
    const html = renderReferenceCardFn(ref, false);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  // TC-R5: renderArsenal — no current user shows sign-in message
  it('TC-R5 — renderArsenal with no user renders sign-in message', async () => {
    // auth has INITIAL_SESSION with null → getCurrentUser() returns null
    const container = { innerHTML: '' } as unknown as HTMLElement;

    const result = await renderArsenalFn(container);

    expect(result).toEqual([]);
    expect(container.innerHTML).toContain('arsenal-empty');
    expect(container.innerHTML).toContain('Sign in');
  });

  // TC-R6: renderArsenal — RPC error renders "Could not load" message
  it('TC-R6 — renderArsenal with RPC error renders error state', async () => {
    vi.resetModules();
    mockAuth.onAuthStateChange.mockReset();
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: { user: { id: string } }) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'user-abc' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }
    );
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const mod2 = await import('../../src/reference-arsenal.render.ts');
    const renderArsenalLoggedIn = mod2.renderArsenal as typeof renderArsenalFn;

    const container = { innerHTML: '' } as unknown as HTMLElement;
    const result = await renderArsenalLoggedIn(container);

    expect(result).toEqual([]);
    expect(container.innerHTML).toContain('Could not load');
  });

  // TC-R7: renderArsenal — success renders sorted arsenal grid
  it('TC-R7 — renderArsenal renders sorted cards highest power first', async () => {
    vi.resetModules();
    mockAuth.onAuthStateChange.mockReset();
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: { user: { id: string } }) => void) => {
        cb('INITIAL_SESSION', { user: { id: 'user-abc' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }
    );
    const refs: ArsenalReferenceRender[] = [
      makeRef({ id: 'ref-low', current_power: 1, source_title: 'Low Power Book', rarity: 'common' }),
      makeRef({ id: 'ref-high', current_power: 5, source_title: 'High Power Book', rarity: 'legendary' }),
    ];
    mockRpc.mockResolvedValueOnce({ data: refs, error: null });

    const mod2 = await import('../../src/reference-arsenal.render.ts');
    const renderArsenalLoggedIn = mod2.renderArsenal as typeof renderArsenalFn;

    const container = { innerHTML: '' } as unknown as HTMLElement;
    const result = await renderArsenalLoggedIn(container);

    expect(result).toHaveLength(2);
    expect(container.innerHTML).toContain('arsenal-grid');
    // high-power card should appear before low-power card
    const highIdx = container.innerHTML.indexOf('ref-high');
    const lowIdx = container.innerHTML.indexOf('ref-low');
    expect(highIdx).toBeLessThan(lowIdx);
    expect(mockRpc).toHaveBeenCalledWith('get_my_arsenal', {});
  });
});

// ============================================================
// SEAM #199 — reference-arsenal.ts → reference-arsenal.loadout
// renderLoadoutPicker: fetches arsenal via get_my_arsenal RPC,
// filters frozen refs, sorts by power, renders selectable grid,
// saves loadout on click via saveDebateLoadout RPC.
// Mock boundary: @supabase/supabase-js only
// ============================================================

import { readFileSync as readFileSyncLoadout } from 'fs';
import { resolve as resolveLoadout } from 'path';

describe('ARCH — reference-arsenal.loadout import boundary (seam #199)', () => {
  it('only imports from auth, config, reference-arsenal.utils, .constants, .debate, .types', () => {
    const src = readFileSyncLoadout(
      resolveLoadout(__dirname, '../../src/reference-arsenal.loadout.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const externalImports = importLines.filter(
      l =>
        !l.includes('./auth') &&
        !l.includes('./config') &&
        !l.includes('./reference-arsenal.utils') &&
        !l.includes('./reference-arsenal.constants') &&
        !l.includes('./reference-arsenal.debate') &&
        !l.includes('./reference-arsenal.types')
    );
    expect(externalImports).toHaveLength(0);
  });
});

// ============================================================
// Loadout module handle
// ============================================================

let renderLoadoutPickerL: (
  container: HTMLElement,
  debateId: string,
  initialRefs?: string[]
) => Promise<void>;

describe('reference-arsenal.loadout — renderLoadoutPicker (seam #199)', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockAuth.onAuthStateChange.mockReset();
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: null) => void) => {
        cb('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }
    );
    mockRpc.mockResolvedValue({ data: null, error: null });

    const mod = await import('../../src/reference-arsenal.loadout.ts');
    renderLoadoutPickerL = mod.renderLoadoutPicker as typeof renderLoadoutPickerL;
  });

  // TC-L2: empty arsenal renders empty state
  it('TC-L2 — empty arsenal renders ref-loadout-empty with no-weapons message', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const container = document.createElement('div');
    await renderLoadoutPickerL(container, 'debate-001');

    expect(container.querySelector('.ref-loadout-empty')).not.toBeNull();
    expect(container.innerHTML).toContain('No references forged');
    expect(container.querySelector('.ref-loadout-grid')).toBeNull();
  });

  // TC-L3: frozen refs filtered out
  it('TC-L3 — refs with challenge_status frozen are excluded from the grid', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'ref-live',
          challenge_status: 'open',
          current_power: 3,
          created_at: '2024-01-02T00:00:00Z',
          source_type: 'book',
          rarity: 'common',
          claim_text: 'Live claim',
          source_title: 'Book A',
          source_author: 'Author A',
        },
        {
          id: 'ref-frozen',
          challenge_status: 'frozen',
          current_power: 5,
          created_at: '2024-01-01T00:00:00Z',
          source_type: 'news',
          rarity: 'uncommon',
          claim_text: 'Frozen claim',
          source_title: 'News B',
          source_author: 'Author B',
        },
      ],
      error: null,
    });

    const container = document.createElement('div');
    await renderLoadoutPickerL(container, 'debate-002');

    const cards = container.querySelectorAll('[data-ref-id]');
    const ids = Array.from(cards).map(c => (c as HTMLElement).dataset.refId);
    expect(ids).toContain('ref-live');
    expect(ids).not.toContain('ref-frozen');
  });

  // TC-L4: cards sorted by descending current_power
  it('TC-L4 — cards render in descending current_power order', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'ref-low',
          challenge_status: null,
          current_power: 1,
          created_at: '2024-01-01T00:00:00Z',
          source_type: 'book',
          rarity: 'common',
          claim_text: 'Low power',
          source_title: 'S1',
          source_author: 'A1',
        },
        {
          id: 'ref-high',
          challenge_status: null,
          current_power: 9,
          created_at: '2024-01-01T00:00:00Z',
          source_type: 'academic',
          rarity: 'rare',
          claim_text: 'High power',
          source_title: 'S2',
          source_author: 'A2',
        },
        {
          id: 'ref-mid',
          challenge_status: null,
          current_power: 5,
          created_at: '2024-01-01T00:00:00Z',
          source_type: 'news',
          rarity: 'uncommon',
          claim_text: 'Mid power',
          source_title: 'S3',
          source_author: 'A3',
        },
      ],
      error: null,
    });

    const container = document.createElement('div');
    await renderLoadoutPickerL(container, 'debate-003');

    const cards = container.querySelectorAll('[data-ref-id]');
    const ids = Array.from(cards).map(c => (c as HTMLElement).dataset.refId);
    expect(ids[0]).toBe('ref-high');
    expect(ids[1]).toBe('ref-mid');
    expect(ids[2]).toBe('ref-low');
  });

  // TC-L5: initialRefs pre-selects cards and shows count
  it('TC-L5 — initialRefs pre-selects matching cards and count shows N/5', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'ref-a',
          challenge_status: null,
          current_power: 3,
          created_at: '2024-01-01T00:00:00Z',
          source_type: 'book',
          rarity: 'common',
          claim_text: 'Claim A',
          source_title: 'SA',
          source_author: 'AA',
        },
        {
          id: 'ref-b',
          challenge_status: null,
          current_power: 2,
          created_at: '2024-01-01T00:00:00Z',
          source_type: 'news',
          rarity: 'common',
          claim_text: 'Claim B',
          source_title: 'SB',
          source_author: 'AB',
        },
      ],
      error: null,
    });

    const container = document.createElement('div');
    await renderLoadoutPickerL(container, 'debate-004', ['ref-a']);

    const selectedCards = container.querySelectorAll('.ref-loadout-card.selected');
    expect(selectedCards).toHaveLength(1);
    expect((selectedCards[0] as HTMLElement).dataset.refId).toBe('ref-a');

    const countEl = container.querySelector('#ref-loadout-count');
    expect(countEl?.textContent).toBe('1/5');
  });

  // TC-L6: clicking an unselected card selects it and calls saveDebateLoadout
  it('TC-L6 — clicking unselected card selects it and calls save_debate_loadout RPC', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'ref-click',
          challenge_status: null,
          current_power: 4,
          created_at: '2024-01-01T00:00:00Z',
          source_type: 'book',
          rarity: 'common',
          claim_text: 'Clickable claim',
          source_title: 'SC',
          source_author: 'AC',
        },
      ],
      error: null,
    });
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });

    const container = document.createElement('div');
    await renderLoadoutPickerL(container, 'debate-005');

    const card = container.querySelector('[data-ref-id="ref-click"]') as HTMLElement;
    expect(card).not.toBeNull();
    card.click();

    await vi.runAllTimersAsync();

    expect(container.querySelector('[data-ref-id="ref-click"]')?.classList.contains('selected')).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('save_debate_loadout', expect.objectContaining({
      p_debate_id: 'debate-005',
    }));
  });

  // TC-L7: clicking a selected card deselects it and calls saveDebateLoadout
  it('TC-L7 — clicking selected card deselects it and calls save_debate_loadout RPC', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'ref-desel',
          challenge_status: null,
          current_power: 2,
          created_at: '2024-01-01T00:00:00Z',
          source_type: 'news',
          rarity: 'common',
          claim_text: 'Deselectable claim',
          source_title: 'SD',
          source_author: 'AD',
        },
      ],
      error: null,
    });
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });

    const container = document.createElement('div');
    await renderLoadoutPickerL(container, 'debate-006', ['ref-desel']);

    // card should be pre-selected
    let card = container.querySelector('[data-ref-id="ref-desel"]') as HTMLElement;
    expect(card?.classList.contains('selected')).toBe(true);

    card.click();
    await vi.runAllTimersAsync();

    card = container.querySelector('[data-ref-id="ref-desel"]') as HTMLElement;
    expect(card?.classList.contains('selected')).toBe(false);
    expect(mockRpc).toHaveBeenCalledWith('save_debate_loadout', expect.objectContaining({
      p_debate_id: 'debate-006',
    }));
  });
});

// ============================================================
// SEAM #227 | src/reference-arsenal.ts → reference-arsenal.forge
// Boundary: showForgeForm — multi-step forge form, submit calls
//           forge_reference or edit_reference via reference-arsenal.forge-submit.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

describe('ARCH — reference-arsenal.forge import boundary', () => {
  it('only imports from reference-arsenal sub-modules and config', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src = readFileSync(resolve(__dirname, '../../src/reference-arsenal.forge.ts'), 'utf8');
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const externalImports = importLines.filter(
      (l: string) =>
        !l.includes('./reference-arsenal.forge-render') &&
        !l.includes('./reference-arsenal.forge-wiring') &&
        !l.includes('./reference-arsenal.forge-submit') &&
        !l.includes('./reference-arsenal.types')
    );
    expect(externalImports).toHaveLength(0);
  });
});

let showForgeFormL: (
  container: HTMLElement,
  onComplete: (refId: string) => void,
  onCancel: () => void,
  editRef?: Record<string, unknown>,
) => () => void;

beforeEach(async () => {
  const mod227 = await import('../../src/reference-arsenal.forge.ts');
  showForgeFormL = mod227.showForgeForm as typeof showForgeFormL;
});

// ============================================================
// TC-227-01: showForgeForm renders step 1 DOM
// ============================================================

describe('TC-227-01 — showForgeForm renders step-1 DOM', () => {
  it('mounts forge title/author/date/locator/url inputs and nav buttons', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();

    const { showForgeForm } = await import('../../src/reference-arsenal.forge.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);

    showForgeForm(container, vi.fn(), vi.fn());

    expect(container.querySelector('#forge-title')).not.toBeNull();
    expect(container.querySelector('#forge-author')).not.toBeNull();
    expect(container.querySelector('#forge-date')).not.toBeNull();
    expect(container.querySelector('#forge-locator')).not.toBeNull();
    expect(container.querySelector('#forge-url')).not.toBeNull();
    expect(container.querySelector('#forge-cancel')).not.toBeNull();
    expect(container.querySelector('#forge-next')).not.toBeNull();

    document.body.removeChild(container);
  });
});

// ============================================================
// TC-227-02: clicking Next with valid step 1 data advances to step 2
// ============================================================

describe('TC-227-02 — Next with valid step 1 advances to step 2', () => {
  it('renders #forge-claim after valid step 1 data + Next click', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();

    const { showForgeForm } = await import('../../src/reference-arsenal.forge.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);

    showForgeForm(container, vi.fn(), vi.fn());

    // Fill step 1 fields
    const titleEl = container.querySelector('#forge-title') as HTMLInputElement;
    const authorEl = container.querySelector('#forge-author') as HTMLInputElement;
    const dateEl = container.querySelector('#forge-date') as HTMLInputElement;
    const locatorEl = container.querySelector('#forge-locator') as HTMLInputElement;

    titleEl.value = 'IPCC Climate Report 2023';
    titleEl.dispatchEvent(new Event('input'));
    authorEl.value = 'IPCC Working Group I';
    authorEl.dispatchEvent(new Event('input'));
    dateEl.value = '2023-06-15';
    dateEl.dispatchEvent(new Event('input'));
    locatorEl.value = 'p.42';
    locatorEl.dispatchEvent(new Event('input'));

    const nextBtn = container.querySelector('#forge-next') as HTMLButtonElement;
    nextBtn.click();

    expect(container.querySelector('#forge-claim')).not.toBeNull();
    expect(container.querySelector('#forge-title')).toBeNull();

    document.body.removeChild(container);
  });
});

// ============================================================
// TC-227-03: Next on step 1 with short title shows toast error
// ============================================================

describe('TC-227-03 — Next with invalid step 1 shows toast, does not advance', () => {
  it('stays on step 1 when source title is too short', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();

    const { showForgeForm } = await import('../../src/reference-arsenal.forge.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);

    showForgeForm(container, vi.fn(), vi.fn());

    // Fill with a too-short title (< 2 chars)
    const titleEl = container.querySelector('#forge-title') as HTMLInputElement;
    titleEl.value = 'X';
    titleEl.dispatchEvent(new Event('input'));

    const nextBtn = container.querySelector('#forge-next') as HTMLButtonElement;
    nextBtn.click();

    // Still on step 1 — #forge-title still present
    expect(container.querySelector('#forge-title')).not.toBeNull();
    // step 2 should NOT be rendered
    expect(container.querySelector('#forge-claim')).toBeNull();

    document.body.removeChild(container);
  });
});

// ============================================================
// TC-227-04: Full 5-step flow calls forge_reference RPC
// ============================================================

describe('TC-227-04 — full 5-step submit calls forge_reference RPC', () => {
  it('calls forge_reference with all fields and invokes onComplete with ref_id', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: { action: 'forged', ref_id: 'new-ref-99' }, error: null });

    const { showForgeForm } = await import('../../src/reference-arsenal.forge.ts');

    const onComplete = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);

    showForgeForm(container, onComplete, vi.fn());

    // Step 1
    (container.querySelector('#forge-title') as HTMLInputElement).value = 'Science Daily';
    (container.querySelector('#forge-title') as HTMLInputElement).dispatchEvent(new Event('input'));
    (container.querySelector('#forge-author') as HTMLInputElement).value = 'Jane Smith';
    (container.querySelector('#forge-author') as HTMLInputElement).dispatchEvent(new Event('input'));
    (container.querySelector('#forge-date') as HTMLInputElement).value = '2024-03-01';
    (container.querySelector('#forge-date') as HTMLInputElement).dispatchEvent(new Event('input'));
    (container.querySelector('#forge-locator') as HTMLInputElement).value = 'Section 2';
    (container.querySelector('#forge-locator') as HTMLInputElement).dispatchEvent(new Event('input'));
    (container.querySelector('#forge-next') as HTMLButtonElement).click();

    // Step 2
    (container.querySelector('#forge-claim') as HTMLTextAreaElement).value = 'CO2 levels hit record highs';
    (container.querySelector('#forge-claim') as HTMLTextAreaElement).dispatchEvent(new Event('input'));
    (container.querySelector('#forge-next') as HTMLButtonElement).click();

    // Step 3 — pick a source type
    const sourceBtn = container.querySelector('.forge-source-btn') as HTMLButtonElement;
    sourceBtn.click();

    // After source type click re-render, click Next
    (container.querySelector('#forge-next') as HTMLButtonElement).click();

    // Step 4 — pick a category
    const catBtn = container.querySelector('.forge-cat-btn') as HTMLButtonElement;
    catBtn.click();

    // After category click re-render, click Next
    (container.querySelector('#forge-next') as HTMLButtonElement).click();

    // Step 5 — submit
    const submitBtn = container.querySelector('#forge-submit') as HTMLButtonElement;
    submitBtn.click();

    await vi.advanceTimersByTimeAsync(100);

    expect(mockRpc).toHaveBeenCalledWith(
      'forge_reference',
      expect.objectContaining({
        p_source_title: 'Science Daily',
        p_source_author: 'Jane Smith',
        p_source_date: '2024-03-01',
        p_locator: 'Section 2',
        p_claim_text: 'CO2 levels hit record highs',
      })
    );
    expect(onComplete).toHaveBeenCalledWith('new-ref-99');

    document.body.removeChild(container);
  });
});

// ============================================================
// TC-227-05: Edit mode pre-fills form and calls edit_reference
// ============================================================

describe('TC-227-05 — edit mode pre-fills form and calls edit_reference', () => {
  it('renders pre-filled step 1 with source_type buttons disabled, submits edit_reference', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: { action: 'updated' }, error: null });

    const { showForgeForm } = await import('../../src/reference-arsenal.forge.ts');

    const onComplete = vi.fn();
    const editRef = {
      id: 'ref-edit-01',
      source_title: 'Existing Source',
      source_author: 'Existing Author',
      source_date: '2023-01-01',
      locator: 'p.10',
      claim_text: 'Existing claim text',
      source_type: 'academic',
      category: 'science',
      source_url: '',
    };

    const container = document.createElement('div');
    document.body.appendChild(container);

    showForgeForm(container, onComplete, vi.fn(), editRef as never);

    // Pre-filled values should be in the inputs
    expect((container.querySelector('#forge-title') as HTMLInputElement).value).toBe('Existing Source');
    expect((container.querySelector('#forge-author') as HTMLInputElement).value).toBe('Existing Author');

    // Advance through all steps to get to submit
    (container.querySelector('#forge-next') as HTMLButtonElement).click(); // step 1 → 2
    (container.querySelector('#forge-next') as HTMLButtonElement).click(); // step 2 → 3

    // In edit mode, source type buttons should all be disabled
    const sourceBtns = container.querySelectorAll('.forge-source-btn');
    sourceBtns.forEach(btn => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });

    (container.querySelector('#forge-next') as HTMLButtonElement).click(); // step 3 → 4

    // Pick a category for step 4
    const catBtn = container.querySelector('.forge-cat-btn') as HTMLButtonElement;
    catBtn.click();
    (container.querySelector('#forge-next') as HTMLButtonElement).click(); // step 4 → 5

    // Step 5 submit
    (container.querySelector('#forge-submit') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(100);

    expect(mockRpc).toHaveBeenCalledWith(
      'edit_reference',
      expect.objectContaining({
        p_ref_id: 'ref-edit-01',
        p_source_title: 'Existing Source',
        p_claim_text: 'Existing claim text',
      })
    );
    expect(onComplete).toHaveBeenCalledWith('ref-edit-01');

    document.body.removeChild(container);
  });
});

// ============================================================
// TC-227-06: forge_reference collision shows error, no onComplete
// ============================================================

describe('TC-227-06 — collision result shows error toast, no onComplete call', () => {
  it('does not call onComplete when RPC returns collision action', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({
      data: { action: 'collision', existing_name: 'Duplicate Weapon', ref_id: null },
      error: null,
    });

    const { showForgeForm } = await import('../../src/reference-arsenal.forge.ts');

    const onComplete = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);

    showForgeForm(container, onComplete, vi.fn());

    // Step 1
    (container.querySelector('#forge-title') as HTMLInputElement).value = 'Dupe Source';
    (container.querySelector('#forge-title') as HTMLInputElement).dispatchEvent(new Event('input'));
    (container.querySelector('#forge-author') as HTMLInputElement).value = 'Dupe Author';
    (container.querySelector('#forge-author') as HTMLInputElement).dispatchEvent(new Event('input'));
    (container.querySelector('#forge-date') as HTMLInputElement).value = '2024-01-01';
    (container.querySelector('#forge-date') as HTMLInputElement).dispatchEvent(new Event('input'));
    (container.querySelector('#forge-locator') as HTMLInputElement).value = 'p.1';
    (container.querySelector('#forge-locator') as HTMLInputElement).dispatchEvent(new Event('input'));
    (container.querySelector('#forge-next') as HTMLButtonElement).click();

    // Step 2
    (container.querySelector('#forge-claim') as HTMLTextAreaElement).value = 'Collision claim here';
    (container.querySelector('#forge-claim') as HTMLTextAreaElement).dispatchEvent(new Event('input'));
    (container.querySelector('#forge-next') as HTMLButtonElement).click();

    // Step 3 — pick source type
    (container.querySelector('.forge-source-btn') as HTMLButtonElement).click();
    (container.querySelector('#forge-next') as HTMLButtonElement).click();

    // Step 4 — pick category
    (container.querySelector('.forge-cat-btn') as HTMLButtonElement).click();
    (container.querySelector('#forge-next') as HTMLButtonElement).click();

    // Step 5 — submit
    (container.querySelector('#forge-submit') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(100);

    expect(mockRpc).toHaveBeenCalledWith('forge_reference', expect.any(Object));
    expect(onComplete).not.toHaveBeenCalled();

    document.body.removeChild(container);
  });
});

// ============================================================
// TC-227-07: destroy function clears container and prevents re-render
// ============================================================

describe('TC-227-07 — destroy function clears container innerHTML', () => {
  it('clearing container and further events do not re-populate it', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();

    const { showForgeForm } = await import('../../src/reference-arsenal.forge.ts');

    const container = document.createElement('div');
    document.body.appendChild(container);

    const destroy = showForgeForm(container, vi.fn(), vi.fn());

    // Container should have content after init
    expect(container.innerHTML).not.toBe('');

    destroy();

    // Container should be empty after destroy
    expect(container.innerHTML).toBe('');

    document.body.removeChild(container);
  });
});
