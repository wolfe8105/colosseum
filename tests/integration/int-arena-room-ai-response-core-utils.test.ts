/**
 * Integration tests: src/arena/arena-room-ai-response.ts → arena-core.utils
 * Seam #072
 *
 * Verifies that arena-room-ai-response.ts correctly uses isPlaceholder() and
 * randomFrom() from arena-core.utils.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// ARCH test — static, no module reset needed
// ---------------------------------------------------------------------------
describe('ARCH — arena-room-ai-response imports arena-core.utils', () => {
  it('source file contains import from ./arena-core.utils', () => {
    const filePath = resolve(process.cwd(), 'src/arena/arena-room-ai-response.ts');
    const src = readFileSync(filePath, 'utf8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasImport = importLines.some(l => l.includes('arena-core.utils'));
    expect(hasImport).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Shared mutable state — module-level so vi.mock factories can close over it
// ---------------------------------------------------------------------------
const state = {
  supabaseClient: {} as object | null,
  isAnyPlaceholder: false,
  currentDebate: null as object | null,
};

// ---------------------------------------------------------------------------
// Hoist-safe vi.mock calls
// ---------------------------------------------------------------------------
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => state.supabaseClient),
}));

vi.mock('../../src/auth.ts', () => ({
  getSupabaseClient: vi.fn(() => state.supabaseClient),
  safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  getAccessToken: vi.fn().mockReturnValue(null),
}));

vi.mock('../../src/config.ts', () => ({
  get isAnyPlaceholder() { return state.isAnyPlaceholder; },
  SUPABASE_URL: 'https://example.supabase.co',
  FEATURES: { aiSparring: true },
  ModeratorConfig: { escapeHTML: (s: string) => s },
}));

vi.mock('../../src/arena/arena-state.ts', () => ({
  get currentDebate() { return state.currentDebate; },
}));

vi.mock('../../src/arena/arena-types.ts', () => ({}));

vi.mock('../../src/arena/arena-constants.ts', () => ({
  AI_RESPONSES: {
    opening: ['Opening response A', 'Opening response B'],
    rebuttal: ['Rebuttal response A', 'Rebuttal response B'],
    closing: ['Closing response A', 'Closing response B'],
  },
}));

vi.mock('../../src/arena/arena-room-live-messages.ts', () => ({
  addMessage: vi.fn(),
}));

vi.mock('../../src/arena/arena-room-live-poll.ts', () => ({
  advanceRound: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Functional tests
// ---------------------------------------------------------------------------
describe('arena-room-ai-response × arena-core.utils integration', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    // Reset shared state to healthy defaults
    state.supabaseClient = {};
    state.isAnyPlaceholder = false;
    state.currentDebate = null;
  });

  // -----------------------------------------------------------------------
  // TC1 — isPlaceholder returns true when supabase client is null
  // -----------------------------------------------------------------------
  it('TC1: isPlaceholder() returns true when getSupabaseClient() is null', async () => {
    state.supabaseClient = null;

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(true);
  });

  // -----------------------------------------------------------------------
  // TC2 — isPlaceholder returns false when client exists and flag is false
  // -----------------------------------------------------------------------
  it('TC2: isPlaceholder() returns false when client exists and isAnyPlaceholder is false', async () => {
    state.supabaseClient = {};
    state.isAnyPlaceholder = false;

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(false);
  });

  // -----------------------------------------------------------------------
  // TC3 — isPlaceholder returns true when isAnyPlaceholder flag is true
  // -----------------------------------------------------------------------
  it('TC3: isPlaceholder() returns true when isAnyPlaceholder is true even with client', async () => {
    state.supabaseClient = {};
    state.isAnyPlaceholder = true;

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(true);
  });

  // -----------------------------------------------------------------------
  // TC4 — randomFrom returns an element belonging to the input array
  // -----------------------------------------------------------------------
  it('TC4: randomFrom() returns an element that belongs to the input array', async () => {
    const { randomFrom } = await import('../../src/arena/arena-core.utils.ts');
    const arr = ['alpha', 'beta', 'gamma', 'delta'] as const;
    const result = randomFrom(arr);
    expect(arr).toContain(result);
  });

  // -----------------------------------------------------------------------
  // TC5 — randomFrom with a single-element array always returns that element
  // -----------------------------------------------------------------------
  it('TC5: randomFrom() always returns the sole element for a single-element array', async () => {
    const { randomFrom } = await import('../../src/arena/arena-core.utils.ts');
    const arr = ['only'] as const;
    for (let i = 0; i < 10; i++) {
      expect(randomFrom(arr)).toBe('only');
    }
  });

  // -----------------------------------------------------------------------
  // TC6 — generateSimulatedResponse returns a non-empty string for any round
  // -----------------------------------------------------------------------
  it('TC6: generateSimulatedResponse() returns a non-empty string', async () => {
    const { generateSimulatedResponse } = await import('../../src/arena/arena-room-ai-response.ts');
    const result = generateSimulatedResponse(1);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // TC7 — generateAIDebateResponse falls back to local response when fetch fails
  // -----------------------------------------------------------------------
  it('TC7: generateAIDebateResponse() returns a non-empty fallback string when fetch fails', async () => {
    // Stub global fetch to reject
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    state.supabaseClient = {};
    state.isAnyPlaceholder = false;

    const { generateAIDebateResponse } = await import('../../src/arena/arena-room-ai-response.ts');

    // Kick off the call (it awaits a 1.2-3s random delay internally on fallback)
    const promise = generateAIDebateResponse('Is AI dangerous?', 'Yes because...', 1, 3);

    // Advance past the fallback delay (up to 3 seconds)
    await vi.advanceTimersByTimeAsync(4000);

    const result = await promise;
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);

    fetchSpy.mockRestore();
  });
});
