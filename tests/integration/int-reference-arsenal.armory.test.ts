/**
 * Integration tests — src/reference-arsenal.armory.ts → reference-arsenal.render
 * SEAM #396
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// ARCH filter
// ---------------------------------------------------------------------------
describe('ARCH: reference-arsenal.armory imports only allowed modules', () => {
  it('has no wall dependencies', async () => {
    const src = await import('../../src/reference-arsenal.armory.ts?raw').then((m) => m.default);
    const imports = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const bad = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of imports) {
      for (const wall of bad) {
        expect(line).not.toContain(wall);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRef(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'ref-001',
    claim_text: 'Test claim',
    source_title: 'Test Source',
    source_author: 'Author',
    source_date: '2024-01-01',
    source_type: 'academic',
    source_url: null,
    locator: 'p.42',
    rarity: 'common',
    graduated: false,
    challenge_status: 'none',
    seconds: 5,
    strikes: 2,
    current_power: 10,
    cite_count: 3,
    user_id: 'user-aaa',
    owner_username: 'forge_user',
    sockets: [],
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function teardown(el: HTMLElement): void {
  el.remove();
  // remove any sheet host added by renderArmory
  document.getElementById('armory-sheet-host')?.remove();
}

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

let mockGetLibrary: ReturnType<typeof vi.fn>;
let mockGetTrendingReferences: ReturnType<typeof vi.fn>;
let mockGetCurrentUser: ReturnType<typeof vi.fn>;
let mockOpenSheet: ReturnType<typeof vi.fn>;
let mockCloseSheet: ReturnType<typeof vi.fn>;

let renderArmory: typeof import('../../src/reference-arsenal.armory.ts')['renderArmory'];
let renderLibrary: typeof import('../../src/reference-arsenal.armory.ts')['renderLibrary'];

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();

  mockGetLibrary = vi.fn().mockResolvedValue([]);
  mockGetTrendingReferences = vi.fn().mockResolvedValue([]);
  mockGetCurrentUser = vi.fn().mockReturnValue(null);
  mockOpenSheet = vi.fn();
  mockCloseSheet = vi.fn();

  vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
      auth: {
        onAuthStateChange: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      },
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }));

  vi.mock('../../src/reference-arsenal.rpc.ts', () => ({
    getLibrary: (...args: unknown[]) => mockGetLibrary(...args),
    getTrendingReferences: (...args: unknown[]) => mockGetTrendingReferences(...args),
    secondReference: vi.fn().mockResolvedValue({}),
    challengeReference: vi.fn().mockResolvedValue({ action: 'filed' }),
  }));

  vi.mock('../../src/auth.ts', () => ({
    getCurrentUser: () => mockGetCurrentUser(),
    safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    onAuthStateChange: vi.fn(),
  }));

  vi.mock('../../src/config.ts', () => ({
    escapeHTML: (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;'),
    sanitizeUrl: (u: string) => u,
    showToast: vi.fn(),
    ModeratorConfig: { escapeHTML: (s: string) => s },
  }));

  vi.mock('../../src/reference-arsenal.armory.sheet.ts', () => ({
    openSheet: (...args: unknown[]) => mockOpenSheet(...args),
    closeSheet: (...args: unknown[]) => mockCloseSheet(...args),
  }));

  const mod = await import('../../src/reference-arsenal.armory.ts');
  renderArmory = mod.renderArmory;
  renderLibrary = mod.renderLibrary;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// TC-1: cards rendered for returned references
// ---------------------------------------------------------------------------
describe('TC-1: renderArmory renders .armory-card-wrap for each returned reference', () => {
  it('renders one card wrap per reference from getLibrary', async () => {
    const refs = [makeRef({ id: 'ref-001' }), makeRef({ id: 'ref-002' })];
    mockGetLibrary.mockResolvedValue(refs);
    mockGetTrendingReferences.mockResolvedValue([]);

    const container = makeContainer();
    const renderPromise = renderArmory(container);
    // flush async microtasks
    await vi.runAllTimersAsync();
    await renderPromise;

    const wraps = container.querySelectorAll('.armory-card-wrap');
    expect(wraps.length).toBe(2);
    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-2: empty state shows forge CTA button
// ---------------------------------------------------------------------------
describe('TC-2: renderArmory shows empty state when getLibrary returns []', () => {
  it('shows .armory-forge-cta when no references returned', async () => {
    mockGetLibrary.mockResolvedValue([]);
    mockGetTrendingReferences.mockResolvedValue([]);

    const container = makeContainer();
    const renderPromise = renderArmory(container);
    await vi.runAllTimersAsync();
    await renderPromise;

    const forgeBtn = container.querySelector('.armory-forge-cta');
    expect(forgeBtn).not.toBeNull();

    const cardsEl = container.querySelector('#armory-cards');
    expect(cardsEl?.textContent).toContain('no blades');
    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-3: error state
// ---------------------------------------------------------------------------
describe('TC-3: renderArmory shows error state when getLibrary rejects', () => {
  it('shows error message on rejection', async () => {
    mockGetLibrary.mockRejectedValue(new Error('network error'));
    mockGetTrendingReferences.mockResolvedValue([]);

    const container = makeContainer();
    const renderPromise = renderArmory(container);
    await vi.runAllTimersAsync();
    await renderPromise;

    const cardsEl = container.querySelector('#armory-cards');
    expect(cardsEl?.textContent).toContain('Could not load the armory');
    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-4: search debounce — getLibrary not called immediately on input
// ---------------------------------------------------------------------------
describe('TC-4: search debounces getLibrary call', () => {
  it('does not call getLibrary immediately on search input, only after timer fires', async () => {
    mockGetLibrary.mockResolvedValue([]);
    mockGetTrendingReferences.mockResolvedValue([]);

    const container = makeContainer();
    const renderPromise = renderArmory(container);
    // flush initial loadCards
    await vi.runAllTimersAsync();
    await renderPromise;

    const callsBefore = mockGetLibrary.mock.calls.length;
    const searchEl = container.querySelector<HTMLInputElement>('#armory-search');
    expect(searchEl).not.toBeNull();

    // Simulate typing
    searchEl!.value = 'climate';
    searchEl!.dispatchEvent(new Event('input'));

    // Should NOT have called getLibrary yet (debounce pending)
    expect(mockGetLibrary.mock.calls.length).toBe(callsBefore);

    // Now advance timers past debounce threshold (320ms)
    await vi.advanceTimersByTimeAsync(400);

    expect(mockGetLibrary.mock.calls.length).toBeGreaterThan(callsBefore);
    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-5: filter badge count updates on chip click
// ---------------------------------------------------------------------------
describe('TC-5: filter badge reflects active filter count', () => {
  it('increments badge when a filter chip is activated and clears on second click', async () => {
    mockGetLibrary.mockResolvedValue([]);
    mockGetTrendingReferences.mockResolvedValue([]);

    const container = makeContainer();
    const renderPromise = renderArmory(container);
    await vi.runAllTimersAsync();
    await renderPromise;

    const badge = container.querySelector<HTMLElement>('#armory-filter-badge');
    expect(badge).not.toBeNull();
    // badge should start hidden (0 active filters)
    expect(badge?.style.display).toBe('none');

    // Click a category chip
    const chip = container.querySelector<HTMLElement>('[data-filter="category"]');
    expect(chip).not.toBeNull();
    chip!.click();
    await vi.runAllTimersAsync();

    expect(badge?.textContent).toBe('1');
    expect(badge?.style.display).toBe('inline-flex');

    // Click same chip again to deselect
    chip!.click();
    await vi.runAllTimersAsync();

    expect(badge?.style.display).toBe('none');
    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-6: trending shelf populated
// ---------------------------------------------------------------------------
describe('TC-6: trending shelf populated with .armory-trending-card elements', () => {
  it('renders one trending card per trending reference', async () => {
    const trending = [
      { id: 'trend-001', claim_text: 'Hot take 1', source_title: 'Source A', rarity: 'legendary', cite_count: 10, source_type: 'academic' },
      { id: 'trend-002', claim_text: 'Hot take 2', source_title: 'Source B', rarity: 'rare', cite_count: 5, source_type: 'academic' },
    ];
    mockGetTrendingReferences.mockResolvedValue(trending);
    mockGetLibrary.mockResolvedValue([]);

    const container = makeContainer();
    const renderPromise = renderArmory(container);
    await vi.runAllTimersAsync();
    await renderPromise;

    const trendEl = container.querySelector('#armory-trending');
    const cards = trendEl?.querySelectorAll('.armory-trending-card');
    expect(cards?.length).toBe(2);
    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-7: renderReferenceCard output appears inside .armory-card-wrap
// ---------------------------------------------------------------------------
describe('TC-7: renderReferenceCard output (.ref-card) appears in .armory-card-wrap', () => {
  it('each card wrap contains a .ref-card element generated by renderReferenceCard', async () => {
    const refs = [makeRef({ id: 'ref-999', claim_text: 'Unique claim XYZ' })];
    mockGetLibrary.mockResolvedValue(refs);
    mockGetTrendingReferences.mockResolvedValue([]);

    const container = makeContainer();
    const renderPromise = renderArmory(container);
    await vi.runAllTimersAsync();
    await renderPromise;

    const wrap = container.querySelector('.armory-card-wrap');
    expect(wrap).not.toBeNull();
    // renderReferenceCard produces .ref-card
    const refCard = wrap?.querySelector('.ref-card');
    expect(refCard).not.toBeNull();
    teardown(container);
  });
});

// ---------------------------------------------------------------------------
// TC-BONUS: renderLibrary is a compat alias for renderArmory
// ---------------------------------------------------------------------------
describe('TC-BONUS: renderLibrary is a backward-compat alias for renderArmory', () => {
  it('renderLibrary populates the same structure as renderArmory', async () => {
    mockGetLibrary.mockResolvedValue([makeRef()]);
    mockGetTrendingReferences.mockResolvedValue([]);

    const container = makeContainer();
    const renderPromise = renderLibrary(container);
    await vi.runAllTimersAsync();
    await renderPromise;

    const wraps = container.querySelectorAll('.armory-card-wrap');
    expect(wraps.length).toBe(1);
    teardown(container);
  });
});
