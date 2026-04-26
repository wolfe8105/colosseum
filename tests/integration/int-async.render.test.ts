/**
 * Integration tests — Seam #434 & #435
 * src/async.render.ts → async.render.wager   (Seam #434)
 * src/async.render.ts → async.render.predictions  (Seam #435)
 *
 * Tests that the barrel correctly re-exports and wires both sub-modules.
 * Mock boundary: @supabase/supabase-js only.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── hoisted mocks ─────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
    },
  })),
}));

// ── helpers ───────────────────────────────────────────────────

/** Build a minimal card DOM that _showWagerPicker locates via querySelector */
function buildCardDOM(debateId: string): HTMLElement {
  document.body.innerHTML = '';
  const card = document.createElement('div');
  card.setAttribute('style', 'background:var(--mod-bg-card);');
  const btn = document.createElement('button');
  btn.setAttribute('data-action', 'predict');
  btn.setAttribute('data-id', debateId);
  card.appendChild(btn);
  document.body.appendChild(card);
  return card;
}

// ── module handles ────────────────────────────────────────────

let renderPredictions: (container: HTMLElement) => void;
let _showWagerPicker: (debateId: string, side: string) => void;
let _hideWagerPicker: () => void;
let _registerWiring: (takes: (c: HTMLElement) => void, preds: (c: HTMLElement) => void) => void;
let state: {
  predictions: unknown[];
  standaloneQuestions: unknown[];
  wiredContainers: Set<HTMLElement>;
};

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({
    toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'],
  });
  mockRpc.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });

  // Patch wiredContainers onto state (barrel relies on it)
  const stateMod = await import('../../src/async.state.ts');
  (stateMod.state as unknown as Record<string, unknown>).wiredContainers =
    new Set<HTMLElement>();
  state = stateMod.state as unknown as {
    predictions: unknown[];
    standaloneQuestions: unknown[];
    wiredContainers: Set<HTMLElement>;
  };

  // Import barrel (real)
  const barrelMod = await import('../../src/async.render.ts');
  renderPredictions = barrelMod.renderPredictions;
  _showWagerPicker = barrelMod._showWagerPicker;
  _hideWagerPicker = barrelMod._hideWagerPicker;
  _registerWiring = barrelMod._registerWiring;
});

// ─────────────────────────────────────────────────────────────
// ARCH — Seam #434 & #435
// ─────────────────────────────────────────────────────────────

describe('ARCH — async.render.ts import boundary', () => {
  it('imports _showWagerPicker and _hideWagerPicker from async.render.wager', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/async.render.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    const wagerLine = importLines.find((l) => l.includes('./async.render.wager'));
    expect(wagerLine).toBeDefined();
    expect(wagerLine).toContain('_showWagerPicker');
    expect(wagerLine).toContain('_hideWagerPicker');
  });

  it('imports renderPredictions and _setWirePredictions from async.render.predictions', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/async.render.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    const predsLine = importLines.find((l) =>
      l.includes('./async.render.predictions'),
    );
    expect(predsLine).toBeDefined();
    expect(predsLine).toContain('renderPredictions');
    expect(predsLine).toContain('_setWirePredictions');
  });

  it('contains no wall-listed imports', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/async.render.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    const wallList = [
      'webrtc',
      'feed-room',
      'intro-music',
      'cards.ts',
      'deepgram',
      'realtime-client',
      'voicememo',
      'arena-css',
      'arena-room-live-audio',
      'arena-sounds',
      'arena-sounds-core',
      'peermetrics',
    ];
    for (const line of importLines) {
      for (const wall of wallList) {
        expect(line, `wall hit: ${wall} in "${line}"`).not.toContain(wall);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// Seam #434 — barrel → async.render.wager
// ─────────────────────────────────────────────────────────────

describe('Seam #434 — barrel._showWagerPicker appends picker when prediction exists', () => {
  it('appends #wager-picker-wrapper to matching card', async () => {
    state.predictions = [
      {
        debate_id: 'w-1',
        topic: 'Barrel wager test',
        p1: 'Alice',
        p2: 'Bob',
        p1_elo: 1200,
        p2_elo: 1300,
        total: 100,
        pct_a: 40,
        pct_b: 60,
        user_pick: null,
        status: 'live',
      },
    ];
    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentProfile').mockReturnValue({
      id: 'u1',
      token_balance: 200,
    } as never);

    buildCardDOM('w-1');
    _showWagerPicker('w-1', 'a');

    expect(document.getElementById('wager-picker-wrapper')).not.toBeNull();
    expect(document.getElementById('wager-picker')).not.toBeNull();
  });
});

describe('Seam #434 — barrel._showWagerPicker no-op when prediction missing', () => {
  it('does not insert picker DOM', async () => {
    state.predictions = [];
    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentProfile').mockReturnValue({
      id: 'u1',
      token_balance: 100,
    } as never);

    buildCardDOM('w-none');
    _showWagerPicker('w-none', 'a');

    expect(document.getElementById('wager-picker-wrapper')).toBeNull();
  });
});

describe('Seam #434 — barrel._hideWagerPicker removes picker from DOM', () => {
  it('removes #wager-picker-wrapper after show→hide sequence', async () => {
    state.predictions = [
      {
        debate_id: 'w-2',
        topic: 'Hide via barrel',
        p1: 'P1',
        p2: 'P2',
        p1_elo: 1000,
        p2_elo: 1000,
        total: 0,
        pct_a: 50,
        pct_b: 50,
        user_pick: null,
        status: 'live',
      },
    ];
    const authMod = await import('../../src/auth.ts');
    vi.spyOn(authMod, 'getCurrentProfile').mockReturnValue({
      id: 'u2',
      token_balance: 100,
    } as never);

    buildCardDOM('w-2');
    _showWagerPicker('w-2', 'a');
    expect(document.getElementById('wager-picker-wrapper')).not.toBeNull();

    _hideWagerPicker();
    expect(document.getElementById('wager-picker-wrapper')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// Seam #435 — barrel → async.render.predictions
// ─────────────────────────────────────────────────────────────

describe('Seam #435 — barrel.renderPredictions empty state', () => {
  it('renders "No active predictions yet." placeholder', () => {
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

describe('Seam #435 — barrel.renderPredictions with predictions', () => {
  const mockPred = {
    debate_id: 'p-1',
    topic: 'Will AI replace developers?',
    p1: 'TechSkeptic',
    p2: 'AIBeliever',
    p1_elo: 1400,
    p2_elo: 1350,
    total: 500,
    pct_a: 45,
    pct_b: 55,
    user_pick: null,
    status: 'live',
  };

  it('renders topic, player names, and ELO values', () => {
    state.predictions = [mockPred];
    state.standaloneQuestions = [];

    const container = document.createElement('div');
    renderPredictions(container);

    expect(container.innerHTML).toContain('Will AI replace developers?');
    expect(container.innerHTML).toContain('TechSkeptic');
    expect(container.innerHTML).toContain('AIBeliever');
    expect(container.innerHTML).toContain('1400');
    expect(container.innerHTML).toContain('1350');
  });

  it('renders predict buttons with data-action, data-id, data-pick attributes', () => {
    state.predictions = [mockPred];
    state.standaloneQuestions = [];

    const container = document.createElement('div');
    renderPredictions(container);

    const btnA = container.querySelector('[data-action="predict"][data-pick="a"]');
    const btnB = container.querySelector('[data-action="predict"][data-pick="b"]');

    expect(btnA).not.toBeNull();
    expect(btnA!.getAttribute('data-id')).toBe('p-1');
    expect(btnB).not.toBeNull();
    expect(btnB!.getAttribute('data-id')).toBe('p-1');
  });
});

describe('Seam #435 — barrel._registerWiring wires predictions callback', () => {
  it('wire callback fires on first renderPredictions call', () => {
    state.predictions = [
      {
        debate_id: 'p-2',
        topic: 'Wire via barrel',
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
    _registerWiring(vi.fn(), wireFn);

    const container = document.createElement('div');
    renderPredictions(container);

    expect(wireFn).toHaveBeenCalledTimes(1);
    expect(wireFn).toHaveBeenCalledWith(container);
  });

  it('wire callback does not fire again for the same container', () => {
    state.predictions = [
      {
        debate_id: 'p-3',
        topic: 'No double wire',
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
    _registerWiring(vi.fn(), wireFn);

    const container = document.createElement('div');
    renderPredictions(container);
    renderPredictions(container);

    expect(wireFn).toHaveBeenCalledTimes(1);
  });
});
