// ============================================================
// INTEGRATOR — reference-arsenal.loadout → reference-arsenal.debate
// Seam #337 | score: 6
// Boundary: renderLoadoutPicker calls safeRpc('get_my_arsenal'),
//           card click calls saveDebateLoadout which calls
//           safeRpc('save_debate_loadout').
//           Both modules run real; only @supabase/supabase-js mocked.
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
// ARCH FILTER
// ============================================================

describe('ARCH — reference-arsenal.loadout import boundary', () => {
  it('TC-1: loadout.ts has no external (npm) imports', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.loadout.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const external = importLines.filter(l => !l.includes('./'));
    expect(external).toHaveLength(0);
  });

  it('TC-2: reference-arsenal.debate.ts has no external (npm) imports', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/reference-arsenal.debate.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const external = importLines.filter(l => !l.includes('./'));
    expect(external).toHaveLength(0);
  });
});

// ============================================================
// HELPERS
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

// ============================================================
// INTEGRATION — renderLoadoutPicker + saveDebateLoadout
// ============================================================

describe('renderLoadoutPicker → saveDebateLoadout seam', () => {
  let renderLoadoutPicker: (
    container: HTMLElement,
    debateId: string,
    initialRefs?: string[]
  ) => Promise<void>;
  let saveDebateLoadout: (debateId: string, referenceIds: string[]) => Promise<void>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    mockRpc.mockReset();

    const loadoutMod = await import('../../src/reference-arsenal.loadout.ts');
    renderLoadoutPicker = loadoutMod.renderLoadoutPicker;

    const debateMod = await import('../../src/reference-arsenal.debate.ts');
    saveDebateLoadout = debateMod.saveDebateLoadout;
  });

  // TC-3: get_my_arsenal RPC error → empty-state DOM rendered
  it('TC-3: RPC error on get_my_arsenal renders empty-state DOM', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const container = document.createElement('div');
    await renderLoadoutPicker(container, 'debate-err');

    expect(mockRpc).toHaveBeenCalledWith('get_my_arsenal', {});
    const emptyEl = container.querySelector('.ref-loadout-empty');
    expect(emptyEl).not.toBeNull();
    expect(container.innerHTML).toContain('No references forged');
  });

  // TC-4: saveDebateLoadout calls save_debate_loadout with correct params and resolves
  it('TC-4: saveDebateLoadout calls save_debate_loadout RPC with correct params', async () => {
    mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });

    await expect(
      saveDebateLoadout('debate-abc', ['ref-1', 'ref-2'])
    ).resolves.toBeUndefined();

    expect(mockRpc).toHaveBeenCalledWith('save_debate_loadout', {
      p_debate_id: 'debate-abc',
      p_reference_ids: ['ref-1', 'ref-2'],
    });
  });

  // TC-5: saveDebateLoadout throws when RPC returns an error
  it('TC-5: saveDebateLoadout throws on RPC error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Save failed' } });

    await expect(
      saveDebateLoadout('debate-xyz', ['ref-3'])
    ).rejects.toThrow('Save failed');
  });

  // TC-6: clicking an unselected card calls save_debate_loadout with p_debate_id
  it('TC-6: card click triggers save_debate_loadout with correct debate ID and ref IDs', async () => {
    const ref = makeRef({ id: 'ref-click', claim_text: 'Click me' });
    mockRpc
      .mockResolvedValueOnce({ data: [ref], error: null })           // get_my_arsenal
      .mockResolvedValueOnce({ data: { success: true }, error: null }); // save_debate_loadout

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderLoadoutPicker(container, 'debate-click-test');

    const card = container.querySelector('[data-ref-id="ref-click"]') as HTMLElement;
    expect(card).not.toBeNull();
    card.click();

    // flush microtasks
    await Promise.resolve();

    expect(mockRpc).toHaveBeenCalledWith(
      'save_debate_loadout',
      expect.objectContaining({
        p_debate_id: 'debate-click-test',
        p_reference_ids: ['ref-click'],
      })
    );

    document.body.removeChild(container);
  });

  // TC-7: 6th ref card gets .disabled; clicking it does NOT call save_debate_loadout
  it('TC-7: 6th card is disabled and click does not trigger save_debate_loadout', async () => {
    const refs = Array.from({ length: 6 }, (_, i) =>
      makeRef({ id: `ref-${i}`, claim_text: `Claim ${i}`, current_power: 6 - i })
    );
    mockRpc.mockResolvedValueOnce({ data: refs, error: null }); // get_my_arsenal

    const container = document.createElement('div');
    document.body.appendChild(container);
    // Pre-select 5 refs (indexes 0–4)
    const initialSelected = refs.slice(0, 5).map(r => r.id as string);
    await renderLoadoutPicker(container, 'debate-max', initialSelected);

    // The 6th card (index 5) should be disabled
    const sixthCard = container.querySelector(`[data-ref-id="ref-5"]`) as HTMLElement;
    expect(sixthCard).not.toBeNull();
    expect(sixthCard.classList.contains('disabled')).toBe(true);

    // Click the disabled card — save_debate_loadout should NOT be called
    const rpcCallCountBefore = mockRpc.mock.calls.length;
    sixthCard.click();
    await Promise.resolve();

    expect(mockRpc.mock.calls.length).toBe(rpcCallCountBefore);

    document.body.removeChild(container);
  });
});
