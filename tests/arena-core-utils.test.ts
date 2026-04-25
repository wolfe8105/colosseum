// ============================================================
// arena-core.utils.ts — Unit + Behavioral Tests
// Tests: isPlaceholder(), formatTimer(), randomFrom(), pushArenaState()
// jsdom environment (vitest.config.ts default).
// vi.hoisted() required — vi.mock factories hoist above const,
// so mocks must be declared with vi.hoisted() to avoid TDZ.
// isAnyPlaceholder is a boolean (not a function); mock uses a
// getter so per-test mutation reflects in the live binding.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────

const mockGetSupabaseClient = vi.hoisted(() => vi.fn());
const mockIsAnyPlaceholder = vi.hoisted(() => ({ value: false }));

vi.mock('../src/auth.ts', () => ({
  getSupabaseClient: mockGetSupabaseClient,
}));

vi.mock('../src/config.ts', () => ({
  get isAnyPlaceholder() { return mockIsAnyPlaceholder.value; },
}));

import {
  isPlaceholder,
  formatTimer,
  randomFrom,
  pushArenaState,
} from '../src/arena/arena-core.utils.ts';

// ── Setup ─────────────────────────────────────────────────────

beforeEach(() => {
  mockGetSupabaseClient.mockReset();
  mockIsAnyPlaceholder.value = false;
});

// ============================================================
// formatTimer — pure calculation
// ============================================================

describe('TC1 — formatTimer: 65 → "1:05"', () => {
  it('formats 65 seconds as "1:05"', () => {
    expect(formatTimer(65)).toBe('1:05');
  });
});

describe('TC2 — formatTimer: 0 → "0:00"', () => {
  it('formats 0 seconds as "0:00"', () => {
    expect(formatTimer(0)).toBe('0:00');
  });
});

describe('TC3 — formatTimer: 599 → "9:59"', () => {
  it('formats 599 seconds as "9:59"', () => {
    expect(formatTimer(599)).toBe('9:59');
  });
});

describe('TC4 — formatTimer: 60 → "1:00"', () => {
  it('formats 60 seconds as "1:00"', () => {
    expect(formatTimer(60)).toBe('1:00');
  });
});

describe('TC5 — formatTimer: 9 → "0:09" (leading zero on single-digit seconds)', () => {
  it('pads single-digit seconds with a leading zero', () => {
    expect(formatTimer(9)).toBe('0:09');
  });
});

describe('TC6 — formatTimer: 3661 → "61:01" (large value)', () => {
  it('handles large values beyond one hour', () => {
    expect(formatTimer(3661)).toBe('61:01');
  });
});

// ============================================================
// randomFrom — pure calculation (Math.random is a global)
// ============================================================

describe('TC7 — randomFrom: returns first element when Math.random is 0', () => {
  it('returns arr[0] when Math.random() === 0', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      expect(randomFrom(['a', 'b', 'c'])).toBe('a');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('TC8 — randomFrom: returns last element when Math.random approaches 1', () => {
  it('returns arr[last] when Math.random() = 0.9999', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    try {
      expect(randomFrom(['x', 'y', 'z'])).toBe('z');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('TC9 — randomFrom: single-element array always returns that element', () => {
  it('returns the only element regardless of Math.random', () => {
    expect(randomFrom([42])).toBe(42);
  });
});

describe('TC10 — randomFrom: every result is a member of the input array (100 trials)', () => {
  it('never returns a value outside the input array', () => {
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(randomFrom(arr));
    }
  });
});

// ============================================================
// isPlaceholder — behavioral (depends on imported state)
// ============================================================

describe('TC11 — isPlaceholder: null client → true', () => {
  it('returns true when getSupabaseClient returns null', () => {
    mockGetSupabaseClient.mockReturnValue(null);
    expect(isPlaceholder()).toBe(true);
  });
});

describe('TC12 — isPlaceholder: real client + isAnyPlaceholder true → true', () => {
  it('returns true when client exists but credentials are placeholder values', () => {
    mockGetSupabaseClient.mockReturnValue({});
    mockIsAnyPlaceholder.value = true;
    expect(isPlaceholder()).toBe(true);
  });
});

describe('TC13 — isPlaceholder: real client + isAnyPlaceholder false → false', () => {
  it('returns false when client exists and credentials are real', () => {
    mockGetSupabaseClient.mockReturnValue({});
    mockIsAnyPlaceholder.value = false;
    expect(isPlaceholder()).toBe(false);
  });
});

describe('TC14 — import contract: isPlaceholder calls getSupabaseClient', () => {
  it('calls the getSupabaseClient import (not a hardcoded value)', () => {
    mockGetSupabaseClient.mockReturnValue(null);
    isPlaceholder();
    expect(mockGetSupabaseClient).toHaveBeenCalled();
  });
});

// ============================================================
// pushArenaState — behavioral (browser API: history.pushState)
// ============================================================

describe('TC15 — pushArenaState("lobby") calls history.pushState with { arenaView: "lobby" }', () => {
  it('passes { arenaView: "lobby" } as the state object and "" as title', () => {
    const spy = vi.spyOn(history, 'pushState');
    try {
      pushArenaState('lobby');
      expect(spy).toHaveBeenCalledWith({ arenaView: 'lobby' }, '');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('TC16 — pushArenaState("match") passes viewName through unchanged', () => {
  it('threads the viewName argument into arenaView without mutation', () => {
    const spy = vi.spyOn(history, 'pushState');
    try {
      pushArenaState('match');
      expect(spy).toHaveBeenCalledWith({ arenaView: 'match' }, '');
    } finally {
      spy.mockRestore();
    }
  });
});

// ============================================================
// ARCH — structural import enforcement
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — arena-core.utils.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-core.utils.ts'),
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
