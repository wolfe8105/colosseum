/**
 * Integration tests: src/arena/arena-feed-events.ts → arena-core.utils
 * Seam #057
 *
 * Verifies that arena-feed-events.ts correctly uses isPlaceholder() from
 * arena-core.utils.ts as a guard inside writeFeedEvent.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// ARCH test — static, no module reset needed
// ---------------------------------------------------------------------------
describe('ARCH — arena-feed-events imports arena-core.utils', () => {
  it('source file contains import from ./arena-core.utils', () => {
    const filePath = resolve(process.cwd(), 'src/arena/arena-feed-events.ts');
    const src = readFileSync(filePath, 'utf8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasImport = importLines.some(l => l.includes('arena-core.utils'));
    expect(hasImport).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Shared mutable state — module-level so vi.mock factories can close over it
// ---------------------------------------------------------------------------
const state = {
  supabaseClient: {} as object | null,
  isAnyPlaceholder: false,
  currentDebate: null as object | null,
  round: 1,
};

// safeRpc spy — recreated per test
let mockSafeRpc = vi.fn().mockResolvedValue({ data: null, error: null });

// ---------------------------------------------------------------------------
// Hoist-safe vi.mock calls — factories read from module-level `state` object
// ---------------------------------------------------------------------------
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => state.supabaseClient),
}));

vi.mock('../../src/auth.ts', () => ({
  getSupabaseClient: vi.fn(() => state.supabaseClient),
  safeRpc: (...args: unknown[]) => mockSafeRpc(...args),
  getCurrentProfile: vi.fn(() => ({ display_name: 'Alice', username: 'alice' })),
}));

vi.mock('../../src/config.ts', () => ({
  get isAnyPlaceholder() { return state.isAnyPlaceholder; },
  ModeratorConfig: { escapeHTML: (s: string) => s },
}));

vi.mock('../../src/arena/arena-state.ts', () => ({
  get currentDebate() { return state.currentDebate; },
}));

vi.mock('../../src/arena/arena-feed-state.ts', () => ({
  renderedEventIds: new Set<string>(),
  get round() { return state.round; },
}));

vi.mock('../../src/arena/arena-types-feed-room.ts', () => ({}));

vi.mock('../../src/arena/arena-feed-events-render.ts', () => ({
  renderSpeechEvent: vi.fn(),
  renderPointAwardEvent: vi.fn(),
  renderRoundDividerEvent: vi.fn(),
  renderReferenceCiteEvent: vi.fn(),
  renderReferenceChallengeEvent: vi.fn(),
  renderModRulingEvent: vi.fn(),
  renderPowerUpEvent: vi.fn(),
  renderDisconnectEvent: vi.fn(),
  renderDefaultEvent: vi.fn(),
  applySentimentEvent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Functional tests
// ---------------------------------------------------------------------------
describe('arena-feed-events × arena-core.utils integration', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    // Reset shared state to healthy defaults
    state.supabaseClient = {};
    state.isAnyPlaceholder = false;
    state.currentDebate = null;
    state.round = 1;

    // Fresh spy
    mockSafeRpc = vi.fn().mockResolvedValue({ data: null, error: null });
  });

  // -----------------------------------------------------------------------
  // TC1 — isPlaceholder returns true when supabase client is null
  // -----------------------------------------------------------------------
  it('TC1: isPlaceholder() returns true when getSupabaseClient() is null', async () => {
    state.supabaseClient = null;

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(true);
  });

  // -----------------------------------------------------------------------
  // TC2 — isPlaceholder returns true when isAnyPlaceholder flag is true
  // -----------------------------------------------------------------------
  it('TC2: isPlaceholder() returns true when isAnyPlaceholder is true even with client', async () => {
    state.supabaseClient = {};
    state.isAnyPlaceholder = true;

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(true);
  });

  // -----------------------------------------------------------------------
  // TC3 — isPlaceholder returns false when client exists and flag is false
  // -----------------------------------------------------------------------
  it('TC3: isPlaceholder() returns false when client exists and isAnyPlaceholder is false', async () => {
    state.supabaseClient = {};
    state.isAnyPlaceholder = false;

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(false);
  });

  // -----------------------------------------------------------------------
  // TC4 — writeFeedEvent exits early when isPlaceholder() is true
  // -----------------------------------------------------------------------
  it('TC4: writeFeedEvent() does not call safeRpc when isPlaceholder() is true', async () => {
    state.supabaseClient = null;  // isPlaceholder() → true
    state.currentDebate = { id: 'debate-123', role: 'a', opponentName: 'Bob' };

    const { writeFeedEvent } = await import('../../src/arena/arena-feed-events.ts');
    await writeFeedEvent('speech', 'Hello', 'a');

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // TC5 — writeFeedEvent exits early when currentDebate is null
  // -----------------------------------------------------------------------
  it('TC5: writeFeedEvent() does not call safeRpc when currentDebate is null', async () => {
    state.supabaseClient = {};   // client present → not placeholder
    state.currentDebate = null;

    const { writeFeedEvent } = await import('../../src/arena/arena-feed-events.ts');
    await writeFeedEvent('speech', 'Hello', 'a');

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // TC6 — writeFeedEvent calls safeRpc with correct params when healthy
  // -----------------------------------------------------------------------
  it('TC6: writeFeedEvent() calls safeRpc("insert_feed_event", ...) with correct params', async () => {
    state.supabaseClient = {};
    state.currentDebate = { id: 'debate-abc', role: 'a', opponentName: 'Bob' };
    state.round = 2;

    const { writeFeedEvent } = await import('../../src/arena/arena-feed-events.ts');
    await writeFeedEvent('point_award', 'Good point', 'b', 5);

    expect(mockSafeRpc).toHaveBeenCalledOnce();
    expect(mockSafeRpc).toHaveBeenCalledWith('insert_feed_event', {
      p_debate_id: 'debate-abc',
      p_event_type: 'point_award',
      p_round: 2,
      p_side: 'b',
      p_content: 'Good point',
      p_score: 5,
    });
  });

  // -----------------------------------------------------------------------
  // TC7 — writeFeedEvent defaults p_score to null when score omitted
  // -----------------------------------------------------------------------
  it('TC7: writeFeedEvent() passes p_score: null when score argument is omitted', async () => {
    state.supabaseClient = {};
    state.currentDebate = { id: 'debate-xyz', role: 'b', opponentName: 'Carol' };
    state.round = 1;

    const { writeFeedEvent } = await import('../../src/arena/arena-feed-events.ts');
    await writeFeedEvent('speech', 'Test content', 'a');

    expect(mockSafeRpc).toHaveBeenCalledOnce();
    const callArgs = mockSafeRpc.mock.calls[0][1] as Record<string, unknown>;
    expect(callArgs.p_score).toBeNull();
  });
});
