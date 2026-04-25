// ============================================================
// INTEGRATOR — reference-arsenal.loadout + reference-arsenal.utils
// Seam #256 | score: 8
// Boundary: renderLoadoutPicker calls safeRpc('get_my_arsenal')
//           and saveDebateLoadout calls safeRpc('save_debate_loadout').
//           powerDisplay / compositeScore are pure utils under test.
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

describe('ARCH — reference-arsenal.loadout import boundary', () => {
  it('source imports only come from internal modules and auth', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.loadout.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const external = importLines.filter(l => !l.includes('./'));
    expect(external).toHaveLength(0);
  });

  it('reference-arsenal.utils has no external imports', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.utils.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const external = importLines.filter(l => !l.includes('./'));
    expect(external).toHaveLength(0);
  });
});

// ============================================================
// UNIT — reference-arsenal.utils (pure functions)
// ============================================================

describe('powerDisplay — pure util from reference-arsenal.utils', () => {
  let powerDisplay: (ref: unknown) => string;
  let compositeScore: (ref: unknown) => number;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    const utils = await import('../../src/reference-arsenal.utils.ts');
    powerDisplay = utils.powerDisplay;
    compositeScore = utils.compositeScore;
  });

  // TC-1: powerDisplay for primary source (ceiling 5), not graduated
  it('TC-1: powerDisplay returns current_power/ceiling for non-graduated primary ref', () => {
    const ref = {
      current_power: 3,
      source_type: 'primary',
      graduated: false,
    };
    expect(powerDisplay(ref as never)).toBe('3/5');
  });

  // TC-2: powerDisplay adds 1 to ceiling when graduated=true
  it('TC-2: powerDisplay adds 1 to ceiling when ref is graduated', () => {
    const ref = {
      current_power: 3,
      source_type: 'primary',
      graduated: true,
    };
    expect(powerDisplay(ref as never)).toBe('3/6');
  });

  // TC-3: powerDisplay for news source (ceiling 1)
  it('TC-3: powerDisplay uses ceiling 1 for news source type', () => {
    const ref = {
      current_power: 1,
      source_type: 'news',
      graduated: false,
    };
    expect(powerDisplay(ref as never)).toBe('1/1');
  });

  // TC-4: powerDisplay falls back to ceiling 1 for unknown source_type
  it('TC-4: powerDisplay falls back to ceiling 1 for unknown source type', () => {
    const ref = {
      current_power: 2,
      source_type: 'unknown_type',
      graduated: false,
    };
    expect(powerDisplay(ref as never)).toBe('2/1');
  });

  // TC-5: compositeScore formula is (seconds * 2) + strikes
  it('TC-5: compositeScore = (seconds * 2) + strikes', () => {
    const ref = { seconds: 3, strikes: 4 };
    expect(compositeScore(ref as never)).toBe(10);
  });

  // TC-6: compositeScore with zeros
  it('TC-6: compositeScore returns 0 when seconds and strikes are 0', () => {
    const ref = { seconds: 0, strikes: 0 };
    expect(compositeScore(ref as never)).toBe(0);
  });
});

// ============================================================
// INTEGRATION — renderLoadoutPicker (DOM + RPC)
// ============================================================

const makeRef = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'ref-001',
  user_id: 'user-abc',
  source_title: 'Test Source',
  source_author: 'Test Author',
  source_date: '2024-01-01',
  locator: 'p.42',
  claim_text: 'Test claim',
  source_type: 'academic',
  category: 'politics',
  source_url: null,
  seconds: 2,
  strikes: 1,
  rarity: 'common',
  current_power: 2,
  graduated: false,
  challenge_status: 'none',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('renderLoadoutPicker — RPC + DOM integration', () => {
  let renderLoadoutPicker: (container: HTMLElement, debateId: string, initialRefs?: string[]) => Promise<void>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    mockRpc.mockReset();
    const mod = await import('../../src/reference-arsenal.loadout.ts');
    renderLoadoutPicker = mod.renderLoadoutPicker;
  });

  // TC-7: calls get_my_arsenal with empty params; empty result renders empty state
  it('TC-7: calls get_my_arsenal; empty arsenal renders empty state message', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const container = document.createElement('div');
    await renderLoadoutPicker(container, 'debate-001');

    expect(mockRpc).toHaveBeenCalledWith('get_my_arsenal', {});
    expect(container.querySelector('.ref-loadout-empty')).not.toBeNull();
    expect(container.innerHTML).toContain('No references forged');
  });

  // TC-8: frozen refs are filtered out and not rendered
  it('TC-8: frozen refs are filtered out before rendering', async () => {
    const frozenRef = makeRef({ id: 'ref-frozen', challenge_status: 'frozen', claim_text: 'Frozen claim' });
    const normalRef = makeRef({ id: 'ref-normal', claim_text: 'Normal claim' });
    mockRpc.mockResolvedValueOnce({ data: [frozenRef, normalRef], error: null });

    const container = document.createElement('div');
    await renderLoadoutPicker(container, 'debate-001');

    expect(container.innerHTML).not.toContain('Frozen claim');
    expect(container.innerHTML).toContain('Normal claim');
  });

  // TC-9: arsenal renders sorted by current_power desc, powerDisplay shown in each card
  it('TC-9: cards render sorted by power desc with powerDisplay string', async () => {
    const lowRef = makeRef({ id: 'ref-low', current_power: 1, source_type: 'news', claim_text: 'Low power' });
    const highRef = makeRef({ id: 'ref-high', current_power: 4, source_type: 'primary', claim_text: 'High power' });
    mockRpc.mockResolvedValueOnce({ data: [lowRef, highRef], error: null });

    const container = document.createElement('div');
    await renderLoadoutPicker(container, 'debate-001');

    const cards = container.querySelectorAll('.ref-loadout-card');
    expect(cards).toHaveLength(2);
    // First card should be high power (sorted desc)
    expect(cards[0].innerHTML).toContain('High power');
    // Power display strings
    expect(container.innerHTML).toContain('PWR 4/5'); // primary graduated=false ceiling=5+0
    expect(container.innerHTML).toContain('PWR 1/1'); // news ceiling=1+0
  });

  // TC-10: initialRefs seeds pre-selected cards; count badge shows correctly
  it('TC-10: initialRefs pre-selects cards and shows count in badge', async () => {
    const ref1 = makeRef({ id: 'ref-001', claim_text: 'Claim One' });
    const ref2 = makeRef({ id: 'ref-002', claim_text: 'Claim Two' });
    mockRpc.mockResolvedValueOnce({ data: [ref1, ref2], error: null });

    const container = document.createElement('div');
    await renderLoadoutPicker(container, 'debate-001', ['ref-001']);

    const countBadge = container.querySelector('#ref-loadout-count');
    expect(countBadge?.textContent).toBe('1/5');
    // ref-001 should be selected
    const selectedCard = container.querySelector('[data-ref-id="ref-001"]');
    expect(selectedCard?.classList.contains('selected')).toBe(true);
  });

  // TC-11: clicking a card toggles selection and calls save_debate_loadout RPC
  it('TC-11: clicking an unselected card adds it and calls save_debate_loadout', async () => {
    const ref = makeRef({ id: 'ref-click', claim_text: 'Clickable' });
    mockRpc
      .mockResolvedValueOnce({ data: [ref], error: null })  // get_my_arsenal
      .mockResolvedValueOnce({ data: { success: true }, error: null }); // save_debate_loadout

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderLoadoutPicker(container, 'debate-xyz');

    const card = container.querySelector('[data-ref-id="ref-click"]') as HTMLElement;
    expect(card).not.toBeNull();
    card.click();

    // Allow microtasks to flush
    await Promise.resolve();

    expect(mockRpc).toHaveBeenCalledWith(
      'save_debate_loadout',
      expect.objectContaining({
        p_debate_id: 'debate-xyz',
        p_reference_ids: ['ref-click'],
      })
    );

    document.body.removeChild(container);
  });

  // TC-12: clicking a selected card deselects it; count decrements
  it('TC-12: clicking a selected card removes it from selection', async () => {
    const ref = makeRef({ id: 'ref-deselect', claim_text: 'Toggle me' });
    mockRpc
      .mockResolvedValueOnce({ data: [ref], error: null })  // get_my_arsenal
      .mockResolvedValueOnce({ data: { success: true }, error: null }); // first save (from initial click)

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderLoadoutPicker(container, 'debate-def', ['ref-deselect']);

    // Card starts selected
    let card = container.querySelector('[data-ref-id="ref-deselect"]') as HTMLElement;
    expect(card.classList.contains('selected')).toBe(true);

    // Second click: save_debate_loadout will be called with empty array
    mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });
    card.click();
    await Promise.resolve();

    // After deselect, count badge should be 0/5
    const countBadge = container.querySelector('#ref-loadout-count');
    expect(countBadge?.textContent).toBe('0/5');

    // The deselected card should not have .selected class
    card = container.querySelector('[data-ref-id="ref-deselect"]') as HTMLElement;
    expect(card.classList.contains('selected')).toBe(false);

    document.body.removeChild(container);
  });
});
