/**
 * Integration tests — Seam #276
 * src/async.render.predictions.ts → async.state
 *
 * Boundary: renderPredictions reads state.predictions,
 *           state.standaloneQuestions, and state.wiredContainers.
 * Mock boundary: @supabase/supabase-js only.
 * All source modules run real.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── hoisted mocks ────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  })),
}));

// ── module handles ───────────────────────────────────────────

let renderPredictions: (container: HTMLElement) => void;
let _setWirePredictions: (fn: (container: HTMLElement) => void) => void;
let state: {
  predictions: unknown[];
  standaloneQuestions: unknown[];
  wiredContainers: Set<HTMLElement>;
};

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });

  const stateMod = await import('../../src/async.state.ts');
  // async.state.ts does not define wiredContainers — patch it in as the barrel would
  (stateMod.state as unknown as Record<string, unknown>).wiredContainers = new Set<HTMLElement>();

  const renderMod = await import('../../src/async.render.predictions.ts');
  renderPredictions = renderMod.renderPredictions;
  _setWirePredictions = renderMod._setWirePredictions;
  state = stateMod.state as unknown as {
    predictions: unknown[];
    standaloneQuestions: unknown[];
    wiredContainers: Set<HTMLElement>;
  };
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — async.render.predictions.ts import boundary', () => {
  it('contains no wall-listed imports', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/async.render.predictions.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const wallList = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of importLines) {
      for (const wall of wallList) {
        expect(line, `wall hit: ${wall} in "${line}"`).not.toContain(wall);
      }
    }
  });

  it('imports state from async.state', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/async.render.predictions.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const stateLine = importLines.find(l => l.includes('./async.state'));
    expect(stateLine).toBeDefined();
    expect(stateLine).toContain('state');
  });
});

// ── TC2: empty state renders empty-state placeholder ─────────

describe('renderPredictions — empty state', () => {
  it('renders "No active predictions yet." when state has no predictions or questions', () => {
    state.predictions = [];
    state.standaloneQuestions = [];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).toContain('No active predictions yet.');
  });

  it('renders CREATE PREDICTION button in empty state', () => {
    state.predictions = [];
    state.standaloneQuestions = [];

    const container = document.createElement('div');
    renderPredictions(container);

    const btn = container.querySelector('[data-action="create-prediction"]');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain('CREATE PREDICTION');
  });
});

// ── TC3 + TC4: predictions in state renders debate cards ─────

describe('renderPredictions — with predictions', () => {
  const mockPrediction = {
    debate_id: 'abc-123',
    topic: 'Is remote work the future?',
    p1: 'OfficeChampion',
    p2: 'HomeHero',
    p1_elo: 1400,
    p2_elo: 1350,
    total: 500,
    pct_a: 40,
    pct_b: 60,
    user_pick: null,
    status: 'live',
  };

  it('renders prediction topic in card', () => {
    state.predictions = [mockPrediction];
    state.standaloneQuestions = [];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).toContain('Is remote work the future?');
  });

  it('renders player names and ELO values', () => {
    state.predictions = [mockPrediction];
    state.standaloneQuestions = [];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).toContain('OfficeChampion');
    expect(container.innerHTML).toContain('HomeHero');
    expect(container.innerHTML).toContain('1400');
    expect(container.innerHTML).toContain('1350');
  });

  it('renders predict buttons with correct data-action, data-id, and data-pick', () => {
    state.predictions = [mockPrediction];
    state.standaloneQuestions = [];

    const container = document.createElement('div');
    renderPredictions(container);

    const btnA = container.querySelector('[data-action="predict"][data-pick="a"]');
    const btnB = container.querySelector('[data-action="predict"][data-pick="b"]');

    expect(btnA).not.toBeNull();
    expect(btnA!.getAttribute('data-id')).toBe('abc-123');
    expect(btnB).not.toBeNull();
    expect(btnB!.getAttribute('data-id')).toBe('abc-123');
  });

  it('renders percentage bar values from state', () => {
    state.predictions = [mockPrediction];
    state.standaloneQuestions = [];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).toContain('40%');
    expect(container.innerHTML).toContain('60%');
  });

  it('renders total predictions count', () => {
    state.predictions = [mockPrediction];
    state.standaloneQuestions = [];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).toContain('500');
  });

  it('renders LIVE badge when status is live', () => {
    state.predictions = [{ ...mockPrediction, status: 'live' }];
    state.standaloneQuestions = [];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).toContain('LIVE');
  });

  it('renders UPCOMING badge when status is scheduled', () => {
    state.predictions = [{ ...mockPrediction, status: 'scheduled' }];
    state.standaloneQuestions = [];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).toContain('UPCOMING');
  });

  it('renders CREATE button header alongside predictions', () => {
    state.predictions = [mockPrediction];
    state.standaloneQuestions = [];

    const container = document.createElement('div');
    renderPredictions(container);

    const createBtn = container.querySelector('[data-action="create-prediction"]');
    expect(createBtn).not.toBeNull();
    expect(createBtn!.textContent).toContain('CREATE');
  });
});

// ── TC5: standalone questions ─────────────────────────────────

describe('renderPredictions — with standalone questions', () => {
  const mockQuestion = {
    id: 'q-xyz',
    topic: 'Should pineapple be on pizza?',
    side_a_label: 'Yes',
    side_b_label: 'No',
    category: 'food',
    picks_a: 30,
    picks_b: 70,
    total_picks: 100,
    creator_display_name: 'FoodDebater',
    creator_username: 'fooddebater',
    _userPick: null,
  };

  it('renders standalone question topic', () => {
    state.predictions = [];
    state.standaloneQuestions = [mockQuestion];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).toContain('Should pineapple be on pizza?');
  });

  it('renders standalone-pick buttons with correct data-action, data-id, data-pick', () => {
    state.predictions = [];
    state.standaloneQuestions = [mockQuestion];

    const container = document.createElement('div');
    renderPredictions(container);

    const btnA = container.querySelector('[data-action="standalone-pick"][data-pick="a"]');
    const btnB = container.querySelector('[data-action="standalone-pick"][data-pick="b"]');

    expect(btnA).not.toBeNull();
    expect(btnA!.getAttribute('data-id')).toBe('q-xyz');
    expect(btnB).not.toBeNull();
    expect(btnB!.getAttribute('data-id')).toBe('q-xyz');
  });

  it('renders side labels', () => {
    state.predictions = [];
    state.standaloneQuestions = [mockQuestion];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).toContain('Yes');
    expect(container.innerHTML).toContain('No');
  });

  it('renders creator name', () => {
    state.predictions = [];
    state.standaloneQuestions = [mockQuestion];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).toContain('FoodDebater');
  });

  it('renders total pick count', () => {
    state.predictions = [];
    state.standaloneQuestions = [mockQuestion];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).toContain('100');
  });

  it('renders COMMUNITY badge on standalone cards', () => {
    state.predictions = [];
    state.standaloneQuestions = [mockQuestion];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).toContain('COMMUNITY');
  });
});

// ── TC6: FEATURES.predictionsUI = false skips render ─────────

describe('renderPredictions — feature flag off', () => {
  it('does not modify container when FEATURES.predictionsUI is false', async () => {
    // Re-import config and toggle feature flag
    const configMod = await import('../../src/config.ts');
    const FEATURES = (configMod as unknown as Record<string, Record<string, boolean>>).FEATURES;
    const original = FEATURES.predictionsUI;
    FEATURES.predictionsUI = false;

    state.predictions = [
      {
        debate_id: 'd1',
        topic: 'Test topic',
        p1: 'A',
        p2: 'B',
        p1_elo: 1000,
        p2_elo: 1000,
        total: 10,
        pct_a: 50,
        pct_b: 50,
        user_pick: null,
        status: 'live',
      },
    ];

    const container = document.createElement('div');
    container.innerHTML = '<span>original</span>';
    renderPredictions(container);

    // Container should NOT have been modified
    expect(container.innerHTML).toBe('<span>original</span>');

    // Restore
    FEATURES.predictionsUI = original;
  });
});

// ── TC7: wiring callback fired once per unique container ──────

describe('renderPredictions — wired containers tracking', () => {
  it('calls _wirePredictions callback on first render for a container', () => {
    state.predictions = [
      {
        debate_id: 'd1',
        topic: 'Wire test',
        p1: 'X',
        p2: 'Y',
        p1_elo: 1100,
        p2_elo: 1100,
        total: 5,
        pct_a: 50,
        pct_b: 50,
        user_pick: null,
        status: 'live',
      },
    ];
    state.standaloneQuestions = [];

    const wireFn = vi.fn();
    _setWirePredictions(wireFn);

    const container = document.createElement('div');
    renderPredictions(container);

    expect(wireFn).toHaveBeenCalledTimes(1);
    expect(wireFn).toHaveBeenCalledWith(container);
  });

  it('does not call _wirePredictions again for the same container on second render', () => {
    state.predictions = [
      {
        debate_id: 'd1',
        topic: 'Wire test',
        p1: 'X',
        p2: 'Y',
        p1_elo: 1100,
        p2_elo: 1100,
        total: 5,
        pct_a: 50,
        pct_b: 50,
        user_pick: null,
        status: 'live',
      },
    ];
    state.standaloneQuestions = [];

    const wireFn = vi.fn();
    _setWirePredictions(wireFn);

    const container = document.createElement('div');
    renderPredictions(container);
    renderPredictions(container);

    expect(wireFn).toHaveBeenCalledTimes(1);
  });

  it('calls _wirePredictions separately for different containers', () => {
    state.predictions = [
      {
        debate_id: 'd1',
        topic: 'Wire test',
        p1: 'X',
        p2: 'Y',
        p1_elo: 1100,
        p2_elo: 1100,
        total: 5,
        pct_a: 50,
        pct_b: 50,
        user_pick: null,
        status: 'live',
      },
    ];
    state.standaloneQuestions = [];

    const wireFn = vi.fn();
    _setWirePredictions(wireFn);

    const container1 = document.createElement('div');
    const container2 = document.createElement('div');
    renderPredictions(container1);
    renderPredictions(container2);

    expect(wireFn).toHaveBeenCalledTimes(2);
  });
});

// ── XSS: escaping of user content ────────────────────────────

describe('renderPredictions — XSS escaping', () => {
  it('escapes HTML in prediction topic', () => {
    state.predictions = [
      {
        debate_id: 'xss-1',
        topic: '<script>alert(1)</script>',
        p1: 'SafeA',
        p2: 'SafeB',
        p1_elo: 1000,
        p2_elo: 1000,
        total: 0,
        pct_a: 50,
        pct_b: 50,
        user_pick: null,
        status: 'live',
      },
    ];
    state.standaloneQuestions = [];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).not.toContain('<script>');
    expect(container.innerHTML).toContain('&lt;script&gt;');
  });

  it('escapes HTML in standalone question topic', () => {
    state.predictions = [];
    state.standaloneQuestions = [
      {
        id: 'xss-q',
        topic: '<img src=x onerror=alert(1)>',
        side_a_label: 'Safe A',
        side_b_label: 'Safe B',
        category: null,
        picks_a: 0,
        picks_b: 0,
        _userPick: null,
      },
    ];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).not.toContain('<img src=x');
    expect(container.innerHTML).toContain('&lt;img');
  });
});
