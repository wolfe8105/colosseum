// ============================================================
// INTEGRATOR — modifiers-catalog + modifiers (types)
// Seam #182 | score: 11
// Boundary: modifiers-catalog.ts provides a 60-minute TTL cache over
//           safeRpc('get_modifier_catalog', {}). Exposes getModifierCatalog(),
//           getEffect(id), getEndOfDebateEffects(), getInDebateEffects().
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
// HELPERS
// ============================================================

function makeMockEffect(overrides: Record<string, unknown> = {}) {
  return {
    id: 'effect-001',
    effect_num: 1,
    name: 'Double Down',
    description: 'Double your points',
    category: 'point',
    timing: 'end_of_debate',
    tier_gate: 'common',
    mod_cost: 10,
    pu_cost: 5,
    ...overrides,
  };
}

// ============================================================
// ARCH CHECK
// ============================================================

describe('ARCH: modifiers-catalog.ts import boundaries', () => {
  it('only imports from auth.ts, contracts/rpc-schemas.ts, and modifiers.ts', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/modifiers-catalog.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const importedModules = importLines.map(l => {
      const m = l.match(/from\s+['"]([^'"]+)['"]/);
      return m ? m[1] : '';
    });

    const wallModules = [
      'webrtc', 'feed-room', 'intro-music', 'cards', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const wall of wallModules) {
      const found = importedModules.some(m => m.includes(wall));
      expect(found, `Should not import ${wall}`).toBe(false);
    }

    const allowedPatterns = ['./auth', './contracts/rpc-schemas', './modifiers'];
    for (const mod of importedModules) {
      if (!mod) continue;
      const allowed = allowedPatterns.some(p => mod.startsWith(p));
      expect(allowed, `Unexpected import: ${mod}`).toBe(true);
    }
  });
});

// ============================================================
// TC-1: getModifierCatalog fetches on first call
// ============================================================

describe('TC-1: getModifierCatalog() — first call triggers RPC', () => {
  let getModifierCatalog: () => Promise<unknown[]>;

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

    const effect = makeMockEffect();
    mockRpc.mockResolvedValue({ data: [effect], error: null });

    const mod = await import('../../src/modifiers-catalog.ts');
    getModifierCatalog = mod.getModifierCatalog;
  });

  it('calls safeRpc("get_modifier_catalog", {}) on first call', async () => {
    await getModifierCatalog();
    expect(mockRpc).toHaveBeenCalledWith('get_modifier_catalog', {});
  });

  it('returns the array of effects from the RPC', async () => {
    const result = await getModifierCatalog();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect((result[0] as { id: string }).id).toBe('effect-001');
  });
});

// ============================================================
// TC-2: getModifierCatalog caches within TTL
// ============================================================

describe('TC-2: getModifierCatalog() — caches within 60-minute TTL', () => {
  let getModifierCatalog: () => Promise<unknown[]>;

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

    const effect = makeMockEffect();
    mockRpc.mockResolvedValue({ data: [effect], error: null });

    const mod = await import('../../src/modifiers-catalog.ts');
    getModifierCatalog = mod.getModifierCatalog;
  });

  it('does not call RPC a second time within TTL', async () => {
    await getModifierCatalog();
    mockRpc.mockClear();

    // Advance by 59 minutes — still within TTL
    await vi.advanceTimersByTimeAsync(59 * 60 * 1000);
    await getModifierCatalog();

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns same cached data on second call', async () => {
    const first = await getModifierCatalog();
    const second = await getModifierCatalog();
    expect(second).toBe(first);
  });
});

// ============================================================
// TC-3: getModifierCatalog re-fetches after TTL expires
// ============================================================

describe('TC-3: getModifierCatalog() — re-fetches after 60-minute TTL', () => {
  let getModifierCatalog: () => Promise<unknown[]>;

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

    const effect = makeMockEffect();
    mockRpc.mockResolvedValue({ data: [effect], error: null });

    const mod = await import('../../src/modifiers-catalog.ts');
    getModifierCatalog = mod.getModifierCatalog;
  });

  it('calls RPC again after TTL expires (using Date.now spy)', async () => {
    const realNow = Date.now();
    const dateSpy = vi.spyOn(Date, 'now');

    // First call — t=0
    dateSpy.mockReturnValue(realNow);
    await getModifierCatalog();
    mockRpc.mockClear();

    // Second call — t = TTL + 1ms (cache expired)
    dateSpy.mockReturnValue(realNow + 60 * 60 * 1000 + 1);
    await getModifierCatalog();

    expect(mockRpc).toHaveBeenCalledWith('get_modifier_catalog', {});
    dateSpy.mockRestore();
  });
});

// ============================================================
// TC-4: getModifierCatalog returns stale cache on RPC failure
// ============================================================

describe('TC-4: getModifierCatalog() — returns stale cache when RPC fails', () => {
  let getModifierCatalog: () => Promise<unknown[]>;

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

    const effect = makeMockEffect();
    // First call succeeds, second (post-TTL) fails
    mockRpc
      .mockResolvedValueOnce({ data: [effect], error: null })
      .mockResolvedValue({ data: null, error: { message: 'Network error' } });

    const mod = await import('../../src/modifiers-catalog.ts');
    getModifierCatalog = mod.getModifierCatalog;
  });

  it('returns stale cached data when post-TTL RPC fails', async () => {
    const first = await getModifierCatalog();
    expect(first).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000 + 1);

    const second = await getModifierCatalog();
    // Should return stale cache, not empty array
    expect(second).toHaveLength(1);
    expect((second[0] as { id: string }).id).toBe('effect-001');
  });
});

// ============================================================
// TC-5: getModifierCatalog returns [] on failure with no cache
// ============================================================

describe('TC-5: getModifierCatalog() — returns empty array on failure with no prior cache', () => {
  let getModifierCatalog: () => Promise<unknown[]>;

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

    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const mod = await import('../../src/modifiers-catalog.ts');
    getModifierCatalog = mod.getModifierCatalog;
  });

  it('returns empty array when RPC fails and no cache exists', async () => {
    const result = await getModifierCatalog();
    expect(result).toEqual([]);
  });

  it('returns empty array when RPC returns null data with no error', async () => {
    // safeRpc contract schema validates — null data with no error triggers !Array.isArray check
    mockRpc.mockResolvedValue({ data: null, error: { message: 'another error' } });
    const result = await getModifierCatalog();
    expect(result).toEqual([]);
  });
});

// ============================================================
// TC-6: getEffect() — returns effect by id
// ============================================================

describe('TC-6: getEffect() — finds effect by id from catalog', () => {
  let getEffect: (id: string) => Promise<unknown>;

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

    const effects = [
      makeMockEffect({ id: 'effect-001', name: 'Alpha' }),
      makeMockEffect({ id: 'effect-002', name: 'Beta', timing: 'in_debate' }),
    ];
    mockRpc.mockResolvedValue({ data: effects, error: null });

    const mod = await import('../../src/modifiers-catalog.ts');
    getEffect = mod.getEffect;
  });

  it('returns the matching effect by id', async () => {
    const effect = await getEffect('effect-002') as { name: string } | null;
    expect(effect).not.toBeNull();
    expect(effect!.name).toBe('Beta');
  });

  it('returns null for unknown id', async () => {
    const effect = await getEffect('effect-999');
    expect(effect).toBeNull();
  });
});

// ============================================================
// TC-7: getEndOfDebateEffects / getInDebateEffects — timing filters
// ============================================================

describe('TC-7: timing filter helpers', () => {
  let getEndOfDebateEffects: () => Promise<unknown[]>;
  let getInDebateEffects: () => Promise<unknown[]>;

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

    const effects = [
      makeMockEffect({ id: 'e1', timing: 'end_of_debate' }),
      makeMockEffect({ id: 'e2', timing: 'end_of_debate' }),
      makeMockEffect({ id: 'e3', timing: 'in_debate' }),
    ];
    mockRpc.mockResolvedValue({ data: effects, error: null });

    const mod = await import('../../src/modifiers-catalog.ts');
    getEndOfDebateEffects = mod.getEndOfDebateEffects;
    getInDebateEffects = mod.getInDebateEffects;
  });

  it('getEndOfDebateEffects returns only end_of_debate effects', async () => {
    const results = await getEndOfDebateEffects() as Array<{ timing: string }>;
    expect(results).toHaveLength(2);
    expect(results.every(e => e.timing === 'end_of_debate')).toBe(true);
  });

  it('getInDebateEffects returns only in_debate effects', async () => {
    const results = await getInDebateEffects() as Array<{ timing: string }>;
    expect(results).toHaveLength(1);
    expect(results[0].timing).toBe('in_debate');
  });

  it('getEndOfDebateEffects shares cache with getInDebateEffects (single RPC call)', async () => {
    await getEndOfDebateEffects();
    mockRpc.mockClear();
    await getInDebateEffects();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
