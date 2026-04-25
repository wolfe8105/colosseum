/**
 * Integration tests — seam #090
 * src/arena/arena-private-lobby.join.ts → arena-core.utils
 *
 * Covers: isPlaceholder, randomFrom (the two symbols imported by join.ts)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────────────────────
// ARCH test — confirms the import seam still exists in source
// ──────────────────────────────────────────────────────────────
describe('ARCH — seam #090 import declaration', () => {
  it('arena-private-lobby.join.ts imports from ./arena-core.utils', () => {
    const srcPath = path.resolve(
      __dirname,
      '../../src/arena/arena-private-lobby.join.ts'
    );
    const source = fs.readFileSync(srcPath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasImport = importLines.some(l => l.includes('./arena-core.utils'));
    expect(hasImport).toBe(true);
  });

  it('arena-private-lobby.join.ts imports isPlaceholder from arena-core.utils', () => {
    const srcPath = path.resolve(
      __dirname,
      '../../src/arena/arena-private-lobby.join.ts'
    );
    const source = fs.readFileSync(srcPath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const utilsLine = importLines.find(l => l.includes('./arena-core.utils'));
    expect(utilsLine).toMatch(/isPlaceholder/);
  });

  it('arena-private-lobby.join.ts imports randomFrom from arena-core.utils', () => {
    const srcPath = path.resolve(
      __dirname,
      '../../src/arena/arena-private-lobby.join.ts'
    );
    const source = fs.readFileSync(srcPath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const utilsLine = importLines.find(l => l.includes('./arena-core.utils'));
    expect(utilsLine).toMatch(/randomFrom/);
  });
});

// ──────────────────────────────────────────────────────────────
// Functional tests for arena-core.utils exports
// ──────────────────────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

describe('isPlaceholder — seam #090', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({
      toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'],
    });
  });

  it('TC2: returns true when getSupabaseClient returns null', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: () => null,
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      showToast: vi.fn(),
      friendlyError: vi.fn(),
      DEBATE: { defaultRounds: 3 },
    }));

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(true);
  });

  it('TC3: returns false when client is truthy and isAnyPlaceholder is false', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: () => ({ rpc: vi.fn() }),
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      showToast: vi.fn(),
      friendlyError: vi.fn(),
      DEBATE: { defaultRounds: 3 },
    }));

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(false);
  });

  it('TC6: returns true when isAnyPlaceholder is true even if client exists', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: () => ({ rpc: vi.fn() }),
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: true,
      showToast: vi.fn(),
      friendlyError: vi.fn(),
      DEBATE: { defaultRounds: 3 },
    }));

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(true);
  });
});

describe('randomFrom — seam #090', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({
      toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'],
    });
  });

  it('TC4: returns an element that belongs to the input array', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: () => ({ rpc: vi.fn() }),
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      showToast: vi.fn(),
      friendlyError: vi.fn(),
      DEBATE: { defaultRounds: 3 },
    }));

    const { randomFrom } = await import('../../src/arena/arena-core.utils.ts');
    const arr = ['alpha', 'beta', 'gamma', 'delta'] as const;
    const result = randomFrom(arr);
    expect(arr).toContain(result);
  });

  it('TC5: single-element array always returns that element', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: () => ({ rpc: vi.fn() }),
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      showToast: vi.fn(),
      friendlyError: vi.fn(),
      DEBATE: { defaultRounds: 3 },
    }));

    const { randomFrom } = await import('../../src/arena/arena-core.utils.ts');
    const arr = ['only'] as const;
    for (let i = 0; i < 10; i++) {
      expect(randomFrom(arr)).toBe('only');
    }
  });

  it('TC7: multi-element array returns a valid index element across many calls', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: () => ({ rpc: vi.fn() }),
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      showToast: vi.fn(),
      friendlyError: vi.fn(),
      DEBATE: { defaultRounds: 3 },
    }));

    const { randomFrom } = await import('../../src/arena/arena-core.utils.ts');
    const arr = [1, 2, 3, 4, 5] as const;
    const results = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const r = randomFrom(arr);
      expect(arr).toContain(r);
      results.add(r);
    }
    // With 200 draws from 5 items, expect at least 3 distinct values
    expect(results.size).toBeGreaterThanOrEqual(3);
  });
});
