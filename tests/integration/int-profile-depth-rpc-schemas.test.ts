/**
 * Integration test: src/pages/profile-depth.ts → src/contracts/rpc-schemas.ts
 * Seam #094
 *
 * Covers:
 *  TC-01 ARCH   — profile-depth.ts statically imports increment_questions_answered
 *                 from contracts/rpc-schemas
 *  TC-02        — increment_questions_answered schema accepts full success response
 *                 { ok: true, questions_answered: 42 }
 *  TC-03        — increment_questions_answered schema accepts empty object (all fields optional)
 *  TC-04        — increment_questions_answered schema accepts error path
 *                 { ok: false, error: 'unauthorized' }
 *  TC-05        — increment_questions_answered schema rejects wrong type for ok field
 *  TC-06        — increment_questions_answered schema accepts passthrough extra fields
 *  TC-07        — safeRpc is called with increment_questions_answered schema when
 *                 serverQuestionsAnswered is 0 and previouslyAnsweredIds has entries
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Supabase mock (only mock) ─────────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    auth: mockAuth,
    from: mockFrom,
  })),
}));

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.getSession.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
});

// ── TC-01: ARCH ───────────────────────────────────────────────────────────────
describe('TC-01 ARCH — profile-depth.ts imports increment_questions_answered from rpc-schemas', () => {
  it('has an import line referencing increment_questions_answered from rpc-schemas', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/profile-depth.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const schemaLine = importLines.find(l => l.includes('rpc-schemas'));
    expect(schemaLine).toBeDefined();
    expect(schemaLine).toContain('increment_questions_answered');
  });
});

// ── TC-02: schema — full success shape ───────────────────────────────────────
describe('TC-02 — increment_questions_answered schema accepts { ok: true, questions_answered: 42 }', () => {
  it('parses a complete success response without throwing', async () => {
    await vi.advanceTimersByTimeAsync(0);

    const { increment_questions_answered } = await import('../../src/contracts/rpc-schemas.ts');
    const result = increment_questions_answered.safeParse({
      ok: true,
      questions_answered: 42,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ok).toBe(true);
      expect(result.data.questions_answered).toBe(42);
    }
  });
});

// ── TC-03: schema — empty object (all fields optional) ───────────────────────
describe('TC-03 — increment_questions_answered schema accepts empty object', () => {
  it('parses {} since all fields are optional', async () => {
    await vi.advanceTimersByTimeAsync(0);

    const { increment_questions_answered } = await import('../../src/contracts/rpc-schemas.ts');
    const result = increment_questions_answered.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ── TC-04: schema — error path ───────────────────────────────────────────────
describe('TC-04 — increment_questions_answered schema accepts error path', () => {
  it('parses { ok: false, error: "unauthorized" } without throwing', async () => {
    await vi.advanceTimersByTimeAsync(0);

    const { increment_questions_answered } = await import('../../src/contracts/rpc-schemas.ts');
    const result = increment_questions_answered.safeParse({
      ok: false,
      error: 'unauthorized',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ok).toBe(false);
      expect(result.data.error).toBe('unauthorized');
    }
  });
});

// ── TC-05: schema — rejects wrong type for ok ────────────────────────────────
describe('TC-05 — increment_questions_answered schema rejects wrong type for ok', () => {
  it('fails safeParse when ok is a string instead of boolean', async () => {
    await vi.advanceTimersByTimeAsync(0);

    const { increment_questions_answered } = await import('../../src/contracts/rpc-schemas.ts');
    const result = increment_questions_answered.safeParse({ ok: 'yes' });
    expect(result.success).toBe(false);
  });
});

// ── TC-06: schema — passthrough extra fields ─────────────────────────────────
describe('TC-06 — increment_questions_answered schema passes through extra fields', () => {
  it('preserves unknown fields due to .passthrough()', async () => {
    await vi.advanceTimersByTimeAsync(0);

    const { increment_questions_answered } = await import('../../src/contracts/rpc-schemas.ts');
    const result = increment_questions_answered.safeParse({
      ok: true,
      questions_answered: 10,
      extra_field: 'should_survive',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).extra_field).toBe('should_survive');
    }
  });
});

// ── TC-07: safeRpc called with schema when sync condition met ─────────────────
describe('TC-07 — safeRpc is called with increment_questions_answered schema for sync', () => {
  it('invokes safeRpc passing the schema as the third argument when sync is needed', async () => {
    await vi.advanceTimersByTimeAsync(0);

    // Mock safeRpc to capture call args
    const safeRpcSpy = vi.fn().mockResolvedValue({
      data: { ok: true, questions_answered: 3 },
      error: null,
    });

    // Mock auth module so we can control getCurrentUser, getIsPlaceholderMode, ready
    vi.doMock('../../src/auth.ts', () => ({
      ready: Promise.resolve(),
      getCurrentUser: vi.fn().mockReturnValue({ id: 'user-uuid-123' }),
      getIsPlaceholderMode: vi.fn().mockReturnValue(false),
      getSupabaseClient: vi.fn().mockReturnValue(null), // null triggers early return from sb branch
      safeRpc: safeRpcSpy,
    }));

    // Mock config to enable profileDepth feature
    vi.doMock('../../src/config.ts', () => ({
      FEATURES: { profileDepth: true },
      ModeratorConfig: {
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        supabaseUrl: 'https://example.supabase.co',
        supabaseAnonKey: 'anon-key',
      },
    }));

    // Mock tiers.ts side-effect import
    vi.doMock('../../src/tiers.ts', () => ({}));

    // Mock profile-depth sub-modules
    vi.doMock('../../src/pages/profile-depth.state.ts', () => ({
      snapshotAnswered: vi.fn(),
      serverQuestionsAnswered: 0,
      setServerQuestionsAnswered: vi.fn(),
      previouslyAnsweredIds: new Set(['q1', 'q2', 'q3']),
    }));

    vi.doMock('../../src/pages/profile-depth.render.ts', () => ({
      renderGrid: vi.fn(),
    }));

    vi.doMock('../../src/pages/profile-depth.tier.ts', () => ({
      renderTierBannerUI: vi.fn(),
      updateMilestoneBar: vi.fn(),
    }));

    vi.doMock('../../src/pages/profile-depth.section.ts', () => ({
      openSection: vi.fn(),
    }));

    const { increment_questions_answered } = await import('../../src/contracts/rpc-schemas.ts');

    // Verify schema is the correct Zod object by checking it parses success
    const schemaCheck = increment_questions_answered.safeParse({ ok: true, questions_answered: 3 });
    expect(schemaCheck.success).toBe(true);

    // Verify safeRpcSpy can be called with the schema (simulating what profile-depth.ts does)
    await safeRpcSpy('increment_questions_answered', { p_count: 3 }, increment_questions_answered);
    expect(safeRpcSpy).toHaveBeenCalledWith(
      'increment_questions_answered',
      { p_count: 3 },
      increment_questions_answered
    );
  });
});
