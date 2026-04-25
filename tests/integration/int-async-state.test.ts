/**
 * Integration tests — Seam #209
 * src/async.ts → async.state
 *
 * Tests: state object accessors, PLACEHOLDER_PREDICTIONS shape,
 *        init() behaviour under feature flag, destroy() teardown.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Supabase mock ────────────────────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ── reset between each test ──────────────────────────────────────────────────
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
});

// ── ARCH filter ──────────────────────────────────────────────────────────────
describe('ARCH — async.ts only imports allowed modules', () => {
  it('contains no wall-listed imports', () => {
    const src = readFileSync(resolve(__dirname, '../../src/async.ts'), 'utf8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const wallList = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of importLines) {
      for (const wall of wallList) {
        expect(line).not.toContain(wall);
      }
    }
  });

  it('imports state and PLACEHOLDER_PREDICTIONS from async.state', () => {
    const src = readFileSync(resolve(__dirname, '../../src/async.ts'), 'utf8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const stateImport = importLines.some(l => l.includes('async.state'));
    expect(stateImport).toBe(true);
  });
});

// ── TC1: PLACEHOLDER_PREDICTIONS shape ──────────────────────────────────────
describe('TC1 — PLACEHOLDER_PREDICTIONS has correct shape', () => {
  it('exports 3 placeholder items with required fields', async () => {
    const { PLACEHOLDER_PREDICTIONS } = await import('../../src/async.state.ts');

    expect(PLACEHOLDER_PREDICTIONS).toHaveLength(3);

    for (const p of PLACEHOLDER_PREDICTIONS) {
      expect(p).toHaveProperty('debate_id');
      expect(p).toHaveProperty('topic');
      expect(p).toHaveProperty('p1');
      expect(p).toHaveProperty('p2');
      expect(p).toHaveProperty('pct_a');
      expect(p).toHaveProperty('pct_b');
      expect(p.user_pick).toBeNull();
    }
  });

  it('first placeholder has debate_id "d1" and status "live"', async () => {
    const { PLACEHOLDER_PREDICTIONS } = await import('../../src/async.state.ts');
    expect(PLACEHOLDER_PREDICTIONS[0].debate_id).toBe('d1');
    expect(PLACEHOLDER_PREDICTIONS[0].status).toBe('live');
  });
});

// ── TC2: state getter/setter — predictions ───────────────────────────────────
describe('TC2 — state.predictions getter/setter round-trip', () => {
  it('sets and reads back a predictions array', async () => {
    const { state } = await import('../../src/async.state.ts');

    const mock = [
      {
        debate_id: 'test-1',
        topic: 'Test topic',
        p1: 'Alice',
        p2: 'Bob',
        p1_elo: 1200,
        p2_elo: 1200,
        total: 100,
        pct_a: 50,
        pct_b: 50,
        user_pick: null as null,
        status: 'live',
      },
    ];
    state.predictions = mock;
    expect(state.predictions).toEqual(mock);
    expect(state.predictions).toHaveLength(1);
    expect(state.predictions[0].debate_id).toBe('test-1');
  });
});

// ── TC3: state getter/setter — standaloneQuestions ───────────────────────────
describe('TC3 — state.standaloneQuestions getter/setter round-trip', () => {
  it('sets and reads back a standaloneQuestions array', async () => {
    const { state } = await import('../../src/async.state.ts');

    const mockQ = [
      {
        id: 'sq-1',
        topic: 'Should pineapple go on pizza?',
        side_a_label: 'Yes',
        side_b_label: 'No',
        category: 'Food',
        picks_a: 300,
        picks_b: 200,
      },
    ];
    state.standaloneQuestions = mockQ;
    expect(state.standaloneQuestions).toEqual(mockQ);
    expect(state.standaloneQuestions[0].id).toBe('sq-1');
  });
});

// ── TC4: state.predictingInFlight is a live Set ───────────────────────────────
describe('TC4 — state.predictingInFlight is a mutable Set', () => {
  it('allows add/has/delete on predictingInFlight', async () => {
    const { state } = await import('../../src/async.state.ts');

    state.predictingInFlight.add('uuid-abc');
    expect(state.predictingInFlight.has('uuid-abc')).toBe(true);
    state.predictingInFlight.delete('uuid-abc');
    expect(state.predictingInFlight.has('uuid-abc')).toBe(false);
  });
});

// ── TC5: init() with asyncDebates=true seeds PLACEHOLDER_PREDICTIONS ─────────
describe('TC5 — init() with FEATURES.asyncDebates=true seeds placeholder data', () => {
  it('populates state.predictions with PLACEHOLDER_PREDICTIONS', async () => {
    // Patch config before importing async.ts
    vi.doMock('../../src/config.ts', async (importOriginal) => {
      const original = await importOriginal() as Record<string, unknown>;
      return {
        ...original,
        FEATURES: {
          ...(original.FEATURES as Record<string, unknown>),
          asyncDebates: true,
        },
      };
    });

    const { init } = await import('../../src/async.ts');
    const { state } = await import('../../src/async.state.ts');

    init();

    expect(state.predictions.length).toBe(3);
    expect(state.predictions[0].debate_id).toBe('d1');
  });
});

// ── TC6: init() with asyncDebates=false leaves state empty ───────────────────
describe('TC6 — init() with FEATURES.asyncDebates=false leaves predictions empty', () => {
  it('does not seed predictions when feature flag is off', async () => {
    vi.doMock('../../src/config.ts', async (importOriginal) => {
      const original = await importOriginal() as Record<string, unknown>;
      return {
        ...original,
        FEATURES: {
          ...(original.FEATURES as Record<string, unknown>),
          asyncDebates: false,
        },
      };
    });

    const { init } = await import('../../src/async.ts');
    const { state } = await import('../../src/async.state.ts');

    // Ensure clean state
    state.predictions = [];
    init();

    expect(state.predictions).toHaveLength(0);
  });
});

// ── TC7: destroy() clears all state fields ────────────────────────────────────
describe('TC7 — destroy() resets all state fields', () => {
  it('empties predictions, standaloneQuestions, and predictingInFlight', async () => {
    const { destroy } = await import('../../src/async.ts');
    const { state } = await import('../../src/async.state.ts');

    // Pre-populate state
    state.predictions = [
      {
        debate_id: 'x1', topic: 'T', p1: 'A', p2: 'B',
        p1_elo: 1000, p2_elo: 1000, total: 10,
        pct_a: 50, pct_b: 50, user_pick: null, status: 'live',
      },
    ];
    state.standaloneQuestions = [
      {
        id: 'sq-x', topic: 'Q', side_a_label: 'Y', side_b_label: 'N',
        category: null, picks_a: 5, picks_b: 5,
      },
    ];
    state.predictingInFlight.add('fly-id');

    destroy();

    expect(state.predictions).toHaveLength(0);
    expect(state.standaloneQuestions).toHaveLength(0);
    expect(state.predictingInFlight.size).toBe(0);
  });
});
