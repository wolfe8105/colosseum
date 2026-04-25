// ============================================================
// INTEGRATOR — reference-arsenal.armory
// Seam #228 | score: 9
// Boundary: renderArmory / renderLibrary call getLibrary and
//           getTrendingReferences (reference-arsenal.rpc.ts) which
//           call safeRpc → supabase.rpc.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Flush all pending microtasks (equivalent to flushPromises)
async function flush(): Promise<void> {
  // Multiple rounds to cover deeply nested async chains
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

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

describe('ARCH — reference-arsenal.armory import boundary', () => {
  it('only imports from local ./ modules (no external third-party deps)', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.armory.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const externalImports = importLines.filter(
      l => !l.includes('./') && !l.includes('from \'.')
    );
    expect(externalImports).toHaveLength(0);
  });
});

// ============================================================
// MODULE HANDLES
// ============================================================

let renderArmory: (container: HTMLElement) => Promise<void>;
let renderLibrary: (container: HTMLElement) => Promise<void>;

// Helper: make a minimal ArsenalReference object
function makeRef(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'ref-uuid-001',
    user_id: 'user-uuid-001',
    owner_username: 'testuser',
    claim_text: 'Test claim text',
    source_title: 'Test Source',
    source_author: 'Test Author',
    source_date: '2024-01-01',
    locator: 'p.42',
    source_type: 'book',
    source_url: null,
    category: 'science',
    rarity: 'common',
    graduated: false,
    challenge_status: 'none',
    strikes: 0,
    seconds: 0,
    cites: 0,
    power_score: 1.0,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

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

  // Default: getLibrary returns one card; getTrendingReferences returns empty
  mockRpc.mockImplementation((name: string) => {
    if (name === 'get_reference_library') {
      return Promise.resolve({ data: [makeRef()], error: null });
    }
    if (name === 'get_trending_references') {
      return Promise.resolve({ data: [], error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  const mod = await import('../../src/reference-arsenal.armory.ts');
  renderArmory = mod.renderArmory;
  renderLibrary = mod.renderLibrary;
});

afterEach(() => {
  vi.useRealTimers();
  // Clean up any sheet host appended to body
  document.getElementById('armory-sheet-host')?.remove();
});

// ============================================================
// TC1 — renderArmory initial load calls get_reference_library
// ============================================================

describe('TC1 — initial load calls get_reference_library with default sort', () => {
  it('calls supabase.rpc("get_reference_library") with p_sort: "power" on first render', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await flush();

    const calls = mockRpc.mock.calls.filter(c => c[0] === 'get_reference_library');
    expect(calls.length).toBeGreaterThanOrEqual(1);
    // Default state sends p_sort: 'power' (sort is always present in getLibrary)
    expect(calls[0][1]).toMatchObject({ p_sort: 'power' });

    container.remove();
  });
});

// ============================================================
// TC2 — cards render after successful getLibrary
// ============================================================

describe('TC2 — cards render when getLibrary returns references', () => {
  it('renders armory-card-wrap elements for each reference returned', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_reference_library') {
        return Promise.resolve({
          data: [makeRef({ id: 'ref-001' }), makeRef({ id: 'ref-002' })],
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await flush();

    const cards = container.querySelectorAll('.armory-card-wrap');
    expect(cards.length).toBe(2);
    expect(cards[0].getAttribute('data-ref-id')).toBe('ref-001');
    expect(cards[1].getAttribute('data-ref-id')).toBe('ref-002');

    container.remove();
  });
});

// ============================================================
// TC3 — empty state when getLibrary returns []
// ============================================================

describe('TC3 — empty state when getLibrary returns no results', () => {
  it('renders the "no blades" message and forge CTA button', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_reference_library') {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await flush();

    const cardsEl = container.querySelector('#armory-cards');
    expect(cardsEl).not.toBeNull();
    expect(cardsEl!.textContent).toContain('no blades');

    const forgeCta = container.querySelector('.armory-forge-cta');
    expect(forgeCta).not.toBeNull();

    container.remove();
  });
});

// ============================================================
// TC4 — error state when getLibrary rejects
// ============================================================

describe('TC4 — error state when getLibrary throws', () => {
  it('renders "Could not load the armory." on RPC error', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_reference_library') {
        return Promise.resolve({ data: null, error: { message: 'DB error' } });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await flush();

    const cardsEl = container.querySelector('#armory-cards');
    expect(cardsEl).not.toBeNull();
    expect(cardsEl!.textContent).toContain('Could not load the armory');

    container.remove();
  });
});

// ============================================================
// TC5 — trending shelf renders when getTrendingReferences returns items
// ============================================================

describe('TC5 — trending shelf renders when trending references exist', () => {
  it('renders .armory-trending-card elements for each trending reference', async () => {
    const trendingItem = {
      id: 'trend-001',
      claim_text: 'Trending claim',
      source_title: 'Trending Source',
      rarity: 'legendary',
      cite_count: 42,
      source_date: '',
      locator: '',
      source_url: null,
      created_at: '',
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_reference_library') {
        return Promise.resolve({ data: [makeRef()], error: null });
      }
      if (name === 'get_trending_references') {
        return Promise.resolve({ data: [trendingItem], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    // Flush multiple rounds: renderArmory → void loadCards() → void trending IIFE
    await flush();
    await flush();

    const trendCards = container.querySelectorAll('.armory-trending-card');
    expect(trendCards.length).toBe(1);
    expect(trendCards[0].getAttribute('data-ref-id')).toBe('trend-001');

    container.remove();
  });
});

// ============================================================
// TC6 — search debounce: 320ms timer before calling getLibrary
// ============================================================

describe('TC6 — search input is debounced 320ms before calling getLibrary', () => {
  it('does not call get_reference_library immediately on input; calls after 320ms with p_search', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await flush();

    // Reset call count after initial load
    mockRpc.mockClear();

    const searchInput = container.querySelector<HTMLInputElement>('#armory-search');
    expect(searchInput).not.toBeNull();

    // Simulate typing
    searchInput!.value = 'climate';
    searchInput!.dispatchEvent(new Event('input'));

    // No call yet — debounce not elapsed
    const callsBefore = mockRpc.mock.calls.filter(c => c[0] === 'get_reference_library');
    expect(callsBefore.length).toBe(0);

    // Advance 320ms to trigger debounce, then flush async chain
    await vi.advanceTimersByTimeAsync(320);
    await flush();

    const callsAfter = mockRpc.mock.calls.filter(c => c[0] === 'get_reference_library');
    expect(callsAfter.length).toBeGreaterThanOrEqual(1);
    expect(callsAfter[callsAfter.length - 1][1]).toMatchObject({ p_search: 'climate' });

    container.remove();
  });
});

// ============================================================
// TC7 — chip filter triggers reload with correct param
// ============================================================

describe('TC7 — clicking a category chip calls getLibrary with p_category', () => {
  it('adds p_category to get_reference_library params after chip click', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await flush();

    mockRpc.mockClear();

    // Find a category chip (data-filter="category")
    const categoryChip = container.querySelector<HTMLElement>('.armory-chip[data-filter="category"]');
    expect(categoryChip).not.toBeNull();

    const expectedCategory = categoryChip!.dataset.value!;
    categoryChip!.click();

    // loadCards is called synchronously after chip click; flush async chain
    await flush();

    const calls = mockRpc.mock.calls.filter(c => c[0] === 'get_reference_library');
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[calls.length - 1][1]).toMatchObject({ p_category: expectedCategory });

    container.remove();
  });
});

// ============================================================
// TC8 — renderLibrary is a backward-compat alias for renderArmory
// ============================================================

describe('TC8 — renderLibrary is a backward-compat alias for renderArmory', () => {
  it('renders identical structure as renderArmory', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderLibrary(container);
    await flush();

    // Should have rendered the armory search row
    expect(container.querySelector('#armory-search')).not.toBeNull();
    expect(container.querySelector('#armory-sharpen-btn')).not.toBeNull();

    container.remove();
  });
});

// ============================================================
// SEAM #258 — reference-arsenal.armory → reference-arsenal.rpc
// Additional TCs for rarity, sourceType, graduated, challengeStatus,
// sort, getTrendingReferences, and chip toggle-off behaviour.
// ============================================================

describe('Seam #258 — TC258-1 rarity chip passes p_rarity to get_reference_library', () => {
  it('calls get_reference_library with p_rarity after rarity chip click', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await flush();
    mockRpc.mockClear();

    const rarityChip = container.querySelector<HTMLElement>('.armory-chip[data-filter="rarity"]');
    expect(rarityChip).not.toBeNull();
    const expectedRarity = rarityChip!.dataset.value!;
    rarityChip!.click();
    await flush();

    const calls = mockRpc.mock.calls.filter(c => c[0] === 'get_reference_library');
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[calls.length - 1][1]).toMatchObject({ p_rarity: expectedRarity });

    container.remove();
  });
});

describe('Seam #258 — TC258-2 sourceType chip passes p_source_type to get_reference_library', () => {
  it('calls get_reference_library with p_source_type after source-type chip click', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await flush();
    mockRpc.mockClear();

    const stChip = container.querySelector<HTMLElement>('.armory-chip[data-filter="sourceType"]');
    expect(stChip).not.toBeNull();
    const expectedSourceType = stChip!.dataset.value!;
    stChip!.click();
    await flush();

    const calls = mockRpc.mock.calls.filter(c => c[0] === 'get_reference_library');
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[calls.length - 1][1]).toMatchObject({ p_source_type: expectedSourceType });

    container.remove();
  });
});

describe('Seam #258 — TC258-3 graduated chip passes p_graduated: true to get_reference_library', () => {
  it('calls get_reference_library with p_graduated: true after graduated chip click', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await flush();
    mockRpc.mockClear();

    const gradChip = container.querySelector<HTMLElement>('.armory-chip[data-filter="graduated"][data-value="true"]');
    expect(gradChip).not.toBeNull();
    gradChip!.click();
    await flush();

    const calls = mockRpc.mock.calls.filter(c => c[0] === 'get_reference_library');
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[calls.length - 1][1]).toMatchObject({ p_graduated: true });

    container.remove();
  });
});

describe('Seam #258 — TC258-4 challengeStatus chip passes p_challenge_status to get_reference_library', () => {
  it('calls get_reference_library with p_challenge_status after challenge status chip click', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await flush();
    mockRpc.mockClear();

    const csChip = container.querySelector<HTMLElement>('.armory-chip[data-filter="challengeStatus"]');
    expect(csChip).not.toBeNull();
    const expectedStatus = csChip!.dataset.value!;
    csChip!.click();
    await flush();

    const calls = mockRpc.mock.calls.filter(c => c[0] === 'get_reference_library');
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[calls.length - 1][1]).toMatchObject({ p_challenge_status: expectedStatus });

    container.remove();
  });
});

describe('Seam #258 — TC258-5 sort chip passes p_sort with selected value', () => {
  it('calls get_reference_library with p_sort: "newest" after newest sort chip click', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await flush();
    mockRpc.mockClear();

    const sortChip = container.querySelector<HTMLElement>('.armory-chip[data-filter="sort"][data-value="newest"]');
    expect(sortChip).not.toBeNull();
    sortChip!.click();
    await flush();

    const calls = mockRpc.mock.calls.filter(c => c[0] === 'get_reference_library');
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[calls.length - 1][1]).toMatchObject({ p_sort: 'newest' });

    container.remove();
  });
});

describe('Seam #258 — TC258-6 getTrendingReferences calls get_trending_references with no params', () => {
  it('calls supabase.rpc("get_trending_references") with empty params object', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_reference_library') return Promise.resolve({ data: [makeRef()], error: null });
      if (name === 'get_trending_references') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await flush();
    await flush();

    const trendCalls = mockRpc.mock.calls.filter(c => c[0] === 'get_trending_references');
    expect(trendCalls.length).toBeGreaterThanOrEqual(1);
    // getLibrary passes empty object {} as params when no filters
    expect(trendCalls[0][1]).toEqual({});

    container.remove();
  });
});

describe('Seam #258 — TC258-7 second click on chip deselects filter — p_category absent', () => {
  it('removes p_category from get_reference_library params when chip is clicked twice (toggle off)', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderArmory(container);
    await flush();

    // Click once to activate
    const categoryChip = container.querySelector<HTMLElement>('.armory-chip[data-filter="category"]');
    expect(categoryChip).not.toBeNull();
    categoryChip!.click();
    await flush();
    mockRpc.mockClear();

    // Click same chip again to deselect
    categoryChip!.click();
    await flush();

    const calls = mockRpc.mock.calls.filter(c => c[0] === 'get_reference_library');
    expect(calls.length).toBeGreaterThanOrEqual(1);
    // p_category should NOT be present in params after deselect
    expect(calls[calls.length - 1][1]).not.toHaveProperty('p_category');

    container.remove();
  });
});
