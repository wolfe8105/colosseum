// ============================================================
// INTEGRATOR — arena-mod-queue-status + arena-state
// Seam #015 | score: 54
// Boundary: startModStatusPoll reads view + currentDebate +
//           modStatusPollTimer + modCountdownTimer + modRequestModalShown
//           from arena-state; sets them via set_* setters.
//           stopModStatusPoll clears timers in arena-state.
//           showModRequestModal renders modal using escapeHTML from config.
//           handleModResponse mutates currentDebate.moderatorId/Name.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
// MODULE HANDLES
// ============================================================

let startModStatusPoll: (debateId: string) => void;
let stopModStatusPoll: () => void;
let showModRequestModal: (modName: string, modId: string, debateId: string) => void;
let handleModResponse: (accept: boolean, debateId: string, modal: HTMLElement, modId: string, modName: string) => Promise<void>;

let set_view: (v: string) => void;
let set_currentDebate: (v: unknown) => void;
let set_modStatusPollTimer: (v: ReturnType<typeof setInterval> | null) => void;
let getModStatusPollTimer: () => ReturnType<typeof setInterval> | null;
let getModRequestModalShown: () => boolean;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  document.body.innerHTML = '';

  const mod = await import('../../src/arena/arena-mod-queue-status.ts');
  startModStatusPoll = mod.startModStatusPoll;
  stopModStatusPoll = mod.stopModStatusPoll;
  showModRequestModal = mod.showModRequestModal;
  handleModResponse = mod.handleModResponse;

  const stateMod = await import('../../src/arena/arena-state.ts');
  set_view = stateMod.set_view as (v: string) => void;
  set_currentDebate = stateMod.set_currentDebate as (v: unknown) => void;
  set_modStatusPollTimer = stateMod.set_modStatusPollTimer;
  getModStatusPollTimer = () => stateMod.modStatusPollTimer;
  getModRequestModalShown = () => stateMod.modRequestModalShown;
});

// ============================================================
// TC-I1: startModStatusPoll — sets interval in arena-state
// ============================================================

describe('TC-I1: startModStatusPoll sets modStatusPollTimer in arena-state', () => {
  it('sets modStatusPollTimer to a non-null value after start', () => {
    set_view('room');
    startModStatusPoll('debate-123');
    expect(getModStatusPollTimer()).not.toBeNull();
  });

  it('calls stopModStatusPoll first — clears any pre-existing timer', () => {
    // Seed a pre-existing timer
    const fakePrev = setInterval(() => {}, 10000);
    set_modStatusPollTimer(fakePrev);

    startModStatusPoll('debate-abc');

    // The pre-existing timer is replaced
    expect(getModStatusPollTimer()).not.toBe(fakePrev);
    expect(getModStatusPollTimer()).not.toBeNull();
  });
});

// ============================================================
// TC-I2: stopModStatusPoll — clears timers in arena-state
// ============================================================

describe('TC-I2: stopModStatusPoll clears modStatusPollTimer in arena-state', () => {
  it('sets modStatusPollTimer to null after stop', () => {
    set_view('room');
    startModStatusPoll('debate-456');
    expect(getModStatusPollTimer()).not.toBeNull();

    stopModStatusPoll();
    expect(getModStatusPollTimer()).toBeNull();
  });

  it('is safe to call when no timers are active', () => {
    expect(() => stopModStatusPoll()).not.toThrow();
  });
});

// ============================================================
// TC-I3: startModStatusPoll — auto-stops when view changes away from room
// ============================================================

describe('TC-I3: startModStatusPoll auto-stops when view is no longer room', () => {
  it('clears the poll timer when view transitions away', async () => {
    set_view('room');
    mockRpc.mockResolvedValue({ data: null, error: { message: 'not found' } });
    startModStatusPoll('debate-789');

    // Change view before the interval fires
    set_view('queue');

    // Tick exactly one 4s poll interval — the handler checks view !== 'room' and stops
    await vi.advanceTimersByTimeAsync(4001);

    expect(getModStatusPollTimer()).toBeNull();
  });
});

// ============================================================
// TC-I4: showModRequestModal — renders modal with escaped mod name
// ============================================================

describe('TC-I4: showModRequestModal renders modal with moderator name (XSS-safe)', () => {
  it('inserts a modal element into the DOM', () => {
    showModRequestModal('Alice Mod', 'mod-id-1', 'debate-111');

    const modal = document.getElementById('mod-request-modal');
    expect(modal).not.toBeNull();
  });

  it('escapes HTML in moderator display name', () => {
    showModRequestModal('<script>alert(1)</script>', 'mod-id-2', 'debate-222');

    const modal = document.getElementById('mod-request-modal')!;
    expect(modal.innerHTML).not.toContain('<script>');
    expect(modal.innerHTML).toContain('&lt;script&gt;');
  });

  it('renders accept and decline buttons', () => {
    showModRequestModal('Bob', 'mod-id-3', 'debate-333');

    expect(document.getElementById('mod-req-accept')).not.toBeNull();
    expect(document.getElementById('mod-req-decline')).not.toBeNull();
  });

  it('replaces a previous modal rather than stacking', () => {
    showModRequestModal('Alice', 'mod-id-1', 'debate-444');
    showModRequestModal('Bob', 'mod-id-2', 'debate-444');

    const modals = document.querySelectorAll('#mod-request-modal');
    expect(modals.length).toBe(1);
  });
});

// ============================================================
// TC-I5: handleModResponse — accept: mutates currentDebate in arena-state
// ============================================================

describe('TC-I5: handleModResponse accept mutates currentDebate in arena-state', () => {
  it('sets moderatorId and moderatorName on currentDebate when accepted', async () => {
    const debate = { id: 'd1', role: 'a', opponentName: 'Bob', messages: [], moderatorId: null, moderatorName: null };
    set_currentDebate(debate);

    mockRpc.mockResolvedValue({ data: null, error: null });
    const modal = document.createElement('div');
    document.body.appendChild(modal);

    await handleModResponse(true, 'd1', modal, 'mod-uuid-99', 'Carol');

    const stateMod = await import('../../src/arena/arena-state.ts');
    expect(stateMod.currentDebate?.moderatorId).toBe('mod-uuid-99');
    expect(stateMod.currentDebate?.moderatorName).toBe('Carol');
  });
});

// ============================================================
// ARCH — arena-mod-queue-status.ts import boundaries
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — arena-mod-queue-status.ts imports only from allowed modules', () => {
  it('imports only from auth, config, arena-state, and arena-types-moderator', () => {
    const allowed = new Set([
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types-moderator.ts',
    ]);
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-mod-queue-status.ts'),
      'utf-8'
    );
    const paths = source.split('\n')
      .filter(l => l.trimStart().startsWith('import '))
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter((p): p is string => Boolean(p));
    for (const path of paths) {
      expect(allowed, `Unexpected import in arena-mod-queue-status.ts: ${path}`).toContain(path);
    }
  });
});
