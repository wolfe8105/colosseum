/**
 * int-arena-pending-challenges-core-utils.test.ts
 * Seam #098 — src/arena/arena-pending-challenges.ts → arena-core.utils
 *
 * Tests the integration between arena-pending-challenges and arena-core.utils,
 * focused on the randomFrom utility imported and used in the accept-button handler.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
  })),
}));

// ── ARCH TEST ────────────────────────────────────────────────────────────────

describe('ARCH — arena-pending-challenges imports arena-core.utils', () => {
  it('has a from-import line referencing arena-core.utils', () => {
    const srcPath = path.resolve(
      __dirname,
      '../../src/arena/arena-pending-challenges.ts',
    );
    const source = fs.readFileSync(srcPath, 'utf8');
    const importLines = source
      .split('\n')
      .filter(l => /from\s+['"]/.test(l));

    const hasImport = importLines.some(l => l.includes('arena-core.utils'));
    expect(hasImport).toBe(true);
  });

  it('specifically imports randomFrom from arena-core.utils', () => {
    const srcPath = path.resolve(
      __dirname,
      '../../src/arena/arena-pending-challenges.ts',
    );
    const source = fs.readFileSync(srcPath, 'utf8');
    const importLines = source
      .split('\n')
      .filter(l => /from\s+['"]/.test(l));

    const coreUtilsLine = importLines.find(l => l.includes('arena-core.utils'));
    expect(coreUtilsLine).toBeDefined();
    expect(coreUtilsLine).toMatch(/randomFrom/);
  });
});

// ── UNIT TESTS FOR randomFrom ─────────────────────────────────────────────

describe('randomFrom (arena-core.utils)', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'],
    });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC1: returns an element that exists in the array', async () => {
    const { randomFrom } = await import(
      '../../src/arena/arena-core.utils.ts'
    );
    const arr = ['alpha', 'beta', 'gamma'] as const;
    const result = randomFrom(arr);
    expect(arr).toContain(result);
  });

  it('TC2: always returns the only element for a single-element array', async () => {
    const { randomFrom } = await import(
      '../../src/arena/arena-core.utils.ts'
    );
    const arr = ['only'] as const;
    // Run multiple times to be confident
    for (let i = 0; i < 10; i++) {
      expect(randomFrom(arr)).toBe('only');
    }
  });

  it('TC3: returns first element when Math.random returns 0', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { randomFrom } = await import(
      '../../src/arena/arena-core.utils.ts'
    );
    const arr = ['first', 'second', 'third'] as const;
    expect(randomFrom(arr)).toBe('first');
    vi.spyOn(Math, 'random').mockRestore();
  });

  it('TC4: returns last element when Math.random returns just below 1', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    const { randomFrom } = await import(
      '../../src/arena/arena-core.utils.ts'
    );
    const arr = ['first', 'second', 'third'] as const;
    expect(randomFrom(arr)).toBe('third');
    vi.spyOn(Math, 'random').mockRestore();
  });

  it('TC5: returns middle element when Math.random returns ~0.5', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { randomFrom } = await import(
      '../../src/arena/arena-core.utils.ts'
    );
    const arr = ['first', 'second', 'third'] as const;
    // Math.floor(0.5 * 3) = Math.floor(1.5) = 1 → 'second'
    expect(randomFrom(arr)).toBe('second');
    vi.spyOn(Math, 'random').mockRestore();
  });

  it('TC6: works with numeric arrays', async () => {
    const { randomFrom } = await import(
      '../../src/arena/arena-core.utils.ts'
    );
    const arr = [10, 20, 30, 40] as const;
    const result = randomFrom(arr);
    expect(arr).toContain(result);
  });
});

// ── INTEGRATION: loadPendingChallenges early-exit paths ───────────────────

describe('loadPendingChallenges — early-exit paths', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'],
    });
    vi.resetModules();

    // Provide minimal DOM
    document.body.innerHTML = `
      <div id="arena-pending-challenges-section" style="display:none;"></div>
      <div id="arena-pending-challenges-feed"></div>
    `;
  });

  afterEach(async () => {
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });

  it('TC7: returns without rendering when RPC returns an error', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: new Error('rpc error') }),
      getSupabaseClient: vi.fn().mockReturnValue(null),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
      showToast: vi.fn(),
      friendlyError: vi.fn((e: unknown) => String(e)),
      isAnyPlaceholder: false,
      DEBATE: { defaultRounds: 3 },
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_selectedMode: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-match-found.ts', () => ({
      showMatchFound: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-constants.ts', () => ({
      AI_TOPICS: ['Topic A', 'Topic B'],
    }));

    const { loadPendingChallenges } = await import(
      '../../src/arena/arena-pending-challenges.ts'
    );
    await loadPendingChallenges();

    const section = document.getElementById('arena-pending-challenges-section');
    // Section should remain hidden — no challenges rendered
    expect(section?.style.display).toBe('none');
  });

  it('TC8: returns without rendering when RPC returns empty array', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      getSupabaseClient: vi.fn().mockReturnValue(null),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
      showToast: vi.fn(),
      friendlyError: vi.fn((e: unknown) => String(e)),
      isAnyPlaceholder: false,
      DEBATE: { defaultRounds: 3 },
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_selectedMode: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-match-found.ts', () => ({
      showMatchFound: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-constants.ts', () => ({
      AI_TOPICS: ['Topic A', 'Topic B'],
    }));

    const { loadPendingChallenges } = await import(
      '../../src/arena/arena-pending-challenges.ts'
    );
    await loadPendingChallenges();

    const section = document.getElementById('arena-pending-challenges-section');
    expect(section?.style.display).toBe('none');
  });
});
