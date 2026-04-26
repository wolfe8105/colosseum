import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── ARCH filter ──────────────────────────────────────────────────────────────
const source = readFileSync(resolve(__dirname, '../../src/arena/arena-entrance.ts'), 'utf8');
const imports = source.split('\n').filter(l => /from\s+['"]/.test(l));

// ── Supabase-only mock ───────────────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, auth: mockAuth })),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeDebate(overrides: Partial<{
  opponentName: string;
  opponentElo: number;
  mode: string;
  ranked: boolean;
  topic: string;
}> = {}) {
  return {
    opponentName: 'Opponent',
    opponentElo: 1200,
    mode: 'live',
    ranked: false,
    topic: 'Is pineapple on pizza acceptable?',
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  document.body.innerHTML = '';
});

// ── TC1 — ARCH: imports only arena-sounds (no webrtc / deepgram / etc.) ─────
describe('TC1 — ARCH: arena-entrance.ts import list', () => {
  it('imports arena-sounds but not webrtc, deepgram, voicememo, or cards', () => {
    const combined = imports.join('\n');
    expect(combined).toContain('arena-sounds');
    expect(combined).not.toMatch(/webrtc/);
    expect(combined).not.toMatch(/deepgram/);
    expect(combined).not.toMatch(/voicememo/);
    expect(combined).not.toMatch(/cards\.ts/);
  });
});

// ── TC2 — stage div appended to body ────────────────────────────────────────
describe('TC2 — playEntranceSequence appends ent-stage to document.body', () => {
  it('appends a div with class ent-stage and id ent-stage to body', async () => {
    // Profile with < 5 debates → tier 1
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentProfile: vi.fn(() => ({
        wins: 0, losses: 0, debates_completed: 2,
        display_name: 'Alice', username: 'alice', elo_rating: 1100,
      })),
      onAuthStateChange: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-sounds.ts', () => ({
      playSound: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-entrance-css.ts', () => ({
      injectEntranceCSS: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-entrance-render.ts', () => ({
      renderTier1: vi.fn(),
      renderTier2: vi.fn(),
      renderTier3: vi.fn(),
    }));

    const { playEntranceSequence } = await import('../../src/arena/arena-entrance.ts');
    const promise = playEntranceSequence(makeDebate());

    const stage = document.getElementById('ent-stage');
    expect(stage).not.toBeNull();
    expect(stage?.className).toBe('ent-stage');
    expect(document.body.contains(stage)).toBe(true);

    // advance timers so promise resolves cleanly
    vi.advanceTimersByTime(3000);
    await promise;
  });
});

// ── TC3 — tier 1: playSound called once ─────────────────────────────────────
describe('TC3 — tier 1 (< 5 debates): playSound called exactly once', () => {
  it('calls playSound("roundStart") once for tier-1', async () => {
    const playSoundMock = vi.fn();
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentProfile: vi.fn(() => ({
        wins: 0, losses: 0, debates_completed: 2,
        display_name: 'Alice', username: 'alice', elo_rating: 1100,
      })),
      onAuthStateChange: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-sounds.ts', () => ({
      playSound: playSoundMock,
    }));
    vi.doMock('../../src/arena/arena-entrance-css.ts', () => ({
      injectEntranceCSS: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-entrance-render.ts', () => ({
      renderTier1: vi.fn(),
      renderTier2: vi.fn(),
      renderTier3: vi.fn(),
    }));

    const { playEntranceSequence } = await import('../../src/arena/arena-entrance.ts');
    const promise = playEntranceSequence(makeDebate());

    // before any timers fire: one synchronous call
    expect(playSoundMock).toHaveBeenCalledTimes(1);
    expect(playSoundMock).toHaveBeenCalledWith('roundStart');

    vi.advanceTimersByTime(3000);
    await promise;
    // still exactly one call (no second scheduled for tier 1)
    expect(playSoundMock).toHaveBeenCalledTimes(1);
  });
});

// ── TC4 — tier 3: playSound called twice (second at +600ms) ─────────────────
describe('TC4 — tier 3 (win-rate > 50%, >= 5 debates): playSound called twice', () => {
  it('calls playSound("roundStart") immediately and again after 600ms', async () => {
    const playSoundMock = vi.fn();
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentProfile: vi.fn(() => ({
        wins: 8, losses: 2, debates_completed: 10,
        display_name: 'Alice', username: 'alice', elo_rating: 1400,
      })),
      onAuthStateChange: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-sounds.ts', () => ({
      playSound: playSoundMock,
    }));
    vi.doMock('../../src/arena/arena-entrance-css.ts', () => ({
      injectEntranceCSS: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-entrance-render.ts', () => ({
      renderTier1: vi.fn(),
      renderTier2: vi.fn(),
      renderTier3: vi.fn(),
    }));

    const { playEntranceSequence } = await import('../../src/arena/arena-entrance.ts');
    const promise = playEntranceSequence(makeDebate());

    // immediate call
    expect(playSoundMock).toHaveBeenCalledTimes(1);

    // advance past 600ms threshold
    vi.advanceTimersByTime(601);
    expect(playSoundMock).toHaveBeenCalledTimes(2);
    expect(playSoundMock).toHaveBeenNthCalledWith(2, 'roundStart');

    vi.advanceTimersByTime(2500);
    await promise;
  });
});

// ── TC5 — stage removed and promise resolves after ~2610ms ──────────────────
describe('TC5 — stage removed and promise resolves after DURATION + fade', () => {
  it('removes ent-stage from DOM and resolves after ~2610ms', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentProfile: vi.fn(() => ({
        wins: 2, losses: 3, debates_completed: 6,
        display_name: 'Bob', username: 'bob', elo_rating: 1200,
      })),
      onAuthStateChange: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-sounds.ts', () => ({
      playSound: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-entrance-css.ts', () => ({
      injectEntranceCSS: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-entrance-render.ts', () => ({
      renderTier1: vi.fn(),
      renderTier2: vi.fn(),
      renderTier3: vi.fn(),
    }));

    const { playEntranceSequence } = await import('../../src/arena/arena-entrance.ts');
    let resolved = false;
    const promise = playEntranceSequence(makeDebate()).then(() => { resolved = true; });

    // stage present before DURATION elapses
    expect(document.getElementById('ent-stage')).not.toBeNull();

    // advance past DURATION (2450) but not fade (2450 + 160 = 2610)
    vi.advanceTimersByTime(2450);
    expect(resolved).toBe(false);

    // advance past the fade timeout
    vi.advanceTimersByTime(160);
    await promise;
    expect(resolved).toBe(true);
    expect(document.getElementById('ent-stage')).toBeNull();
  });
});

// ── TC6 — tier-1 branch: debates_completed < 5 overrides win-rate ────────────
describe('TC6 — tier forced to 1 when debates_completed < 5 (even with high wins)', () => {
  it('calls renderTier1, not renderTier2 or renderTier3, for a 4-debate profile', async () => {
    const renderTier1Mock = vi.fn();
    const renderTier2Mock = vi.fn();
    const renderTier3Mock = vi.fn();
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentProfile: vi.fn(() => ({
        wins: 10, losses: 0, debates_completed: 4, // < 5 → tier 1
        display_name: 'Alice', username: 'alice', elo_rating: 1600,
      })),
      onAuthStateChange: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-sounds.ts', () => ({
      playSound: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-entrance-css.ts', () => ({
      injectEntranceCSS: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-entrance-render.ts', () => ({
      renderTier1: renderTier1Mock,
      renderTier2: renderTier2Mock,
      renderTier3: renderTier3Mock,
    }));

    const { playEntranceSequence } = await import('../../src/arena/arena-entrance.ts');
    const promise = playEntranceSequence(makeDebate());

    expect(renderTier1Mock).toHaveBeenCalledTimes(1);
    expect(renderTier2Mock).not.toHaveBeenCalled();
    expect(renderTier3Mock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);
    await promise;
  });
});

// ── TC7 — playSound throwing does not reject the promise ────────────────────
describe('TC7 — playSound error is caught; promise still resolves', () => {
  it('swallows playSound exceptions and resolves normally', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentProfile: vi.fn(() => ({
        wins: 1, losses: 1, debates_completed: 3,
        display_name: 'Charlie', username: 'charlie', elo_rating: 1200,
      })),
      onAuthStateChange: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-sounds.ts', () => ({
      playSound: vi.fn(() => { throw new Error('AudioContext unavailable'); }),
    }));
    vi.doMock('../../src/arena/arena-entrance-css.ts', () => ({
      injectEntranceCSS: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-entrance-render.ts', () => ({
      renderTier1: vi.fn(),
      renderTier2: vi.fn(),
      renderTier3: vi.fn(),
    }));

    const { playEntranceSequence } = await import('../../src/arena/arena-entrance.ts');
    const promise = playEntranceSequence(makeDebate());

    // advance all timers — should not throw
    vi.advanceTimersByTime(3000);
    await expect(promise).resolves.toBeUndefined();
  });
});
