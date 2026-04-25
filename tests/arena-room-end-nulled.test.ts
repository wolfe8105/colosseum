// ============================================================
// ARENA ROOM END NULLED — tests/arena-room-end-nulled.test.ts
// Source: src/arena/arena-room-end-nulled.ts
//
// CLASSIFICATION:
//   renderNulledDebate() — DOM mutation + cleanup → Integration test
//
// IMPORTS:
//   { escapeHTML }            from '../config.ts'
//   { removeShieldIndicator } from '../powerups.ts'
//   { silenceTimer, activatedPowerUps, screenEl,
//     set_silenceTimer, set_shieldActive } from './arena-state.ts'
//   type { CurrentDebate }    from './arena-types.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockEscapeHTML           = vi.hoisted(() => vi.fn((s: string) => s));
const mockRemoveShieldIndicator = vi.hoisted(() => vi.fn());
const mockSet_silenceTimer     = vi.hoisted(() => vi.fn());
const mockSet_shieldActive     = vi.hoisted(() => vi.fn());

const stateVars = vi.hoisted(() => ({
  silenceTimer: null as ReturnType<typeof setInterval> | null,
  screenEl: null as HTMLElement | null,
  activatedPowerUps: new Set<string>(),
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/powerups.ts', () => ({
  removeShieldIndicator: mockRemoveShieldIndicator,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get silenceTimer()       { return stateVars.silenceTimer; },
  get screenEl()           { return stateVars.screenEl; },
  get activatedPowerUps()  { return stateVars.activatedPowerUps; },
  set_silenceTimer: mockSet_silenceTimer,
  set_shieldActive: mockSet_shieldActive,
  set_view: vi.fn(),
  set_currentDebate: vi.fn(),
}));

import { renderNulledDebate } from '../src/arena/arena-room-end-nulled.ts';

const makeDebate = (overrides = {}) => ({
  id: 'debate-1',
  topic: 'AI will rule',
  mode: 'live' as const,
  ranked: false,
  _nullReason: 'User disconnected',
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockRemoveShieldIndicator.mockReset();
  mockSet_silenceTimer.mockReset();
  mockSet_shieldActive.mockReset();
  stateVars.silenceTimer = null;
  stateVars.activatedPowerUps = new Set();
  document.body.innerHTML = '';
  const screen = document.createElement('div');
  screen.id = 'screen-arena';
  document.body.appendChild(screen);
  stateVars.screenEl = screen;
});

afterEach(() => {
  vi.useRealTimers();
});

// ── TC1: renderNulledDebate — renders NULLED heading ─────────

describe('TC1 — renderNulledDebate: renders NULLED title in screenEl', () => {
  it('appends post with DEBATE NULLED title', () => {
    renderNulledDebate(makeDebate() as never);
    expect(stateVars.screenEl?.innerHTML).toContain('DEBATE NULLED');
  });
});

// ── TC2: renderNulledDebate — includes topic ──────────────────

describe('TC2 — renderNulledDebate: includes topic in output', () => {
  it('renders topic string in the post', () => {
    renderNulledDebate(makeDebate({ topic: 'Cats vs dogs' }) as never);
    expect(stateVars.screenEl?.innerHTML).toContain('Cats vs dogs');
  });
});

// ── TC3: renderNulledDebate — includes null reason ───────────

describe('TC3 — renderNulledDebate: includes _nullReason in output', () => {
  it('renders _nullReason in arena-null-reason element', () => {
    renderNulledDebate(makeDebate({ _nullReason: 'Timed out' }) as never);
    expect(stateVars.screenEl?.innerHTML).toContain('Timed out');
  });
});

// ── TC4: renderNulledDebate — defaults reason when absent ────

describe('TC4 — renderNulledDebate: uses fallback reason when _nullReason absent', () => {
  it('shows "Debate nulled" when no _nullReason', () => {
    const debate = makeDebate();
    delete (debate as Record<string, unknown>)._nullReason;
    renderNulledDebate(debate as never);
    expect(stateVars.screenEl?.innerHTML).toContain('Debate nulled');
  });
});

// ── TC5: renderNulledDebate — calls removeShieldIndicator ────

describe('TC5 — renderNulledDebate: calls removeShieldIndicator', () => {
  it('calls removeShieldIndicator during cleanup', () => {
    renderNulledDebate(makeDebate() as never);
    expect(mockRemoveShieldIndicator).toHaveBeenCalledTimes(1);
  });
});

// ── TC6: renderNulledDebate — clears silence timer ───────────

describe('TC6 — renderNulledDebate: clears silenceTimer when set', () => {
  it('calls set_silenceTimer(null) when silenceTimer is active', () => {
    stateVars.silenceTimer = setInterval(() => {}, 1000);
    renderNulledDebate(makeDebate() as never);
    expect(mockSet_silenceTimer).toHaveBeenCalledWith(null);
  });
});

// ── TC7: renderNulledDebate — calls escapeHTML on topic ──────

describe('TC7 — renderNulledDebate: calls escapeHTML on topic', () => {
  it('passes topic through escapeHTML', () => {
    renderNulledDebate(makeDebate({ topic: '<b>XSS</b>' }) as never);
    const calls = mockEscapeHTML.mock.calls.map(([s]) => s);
    expect(calls).toContain('<b>XSS</b>');
  });
});

// ── TC8: renderNulledDebate — renders back-to-lobby button ───

describe('TC8 — renderNulledDebate: renders #arena-back-to-lobby button', () => {
  it('appends button with id arena-back-to-lobby', () => {
    renderNulledDebate(makeDebate() as never);
    expect(document.getElementById('arena-back-to-lobby')).not.toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-room-end-nulled.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../config.ts',
      '../powerups.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-lobby.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-end-nulled.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
