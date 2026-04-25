/**
 * Integration tests — seam #152
 * src/auth.follows.ts → auth.core
 *
 * Tests: followUser, unfollowUser, getFollowers, getFollowing, getFollowCounts
 * Covers: UUID guard, placeholder-mode short-circuit, safeRpc delegation,
 *         direct Supabase client calls, and error propagation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Helpers ────────────────────────────────────────────────────────────────

const VALID_UUID = '00000000-0000-0000-0000-000000000001';
const VALID_UUID2 = '00000000-0000-0000-0000-000000000002';

function makeFromChain(
  rows: unknown[] = [],
  count: number | null = 0,
  error: unknown = null,
) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: rows, count, error }),
  };
  return chain;
}

// ── Module refs ────────────────────────────────────────────────────────────

let followUser: typeof import('../../src/auth.follows.ts').followUser;
let unfollowUser: typeof import('../../src/auth.follows.ts').unfollowUser;
let getFollowers: typeof import('../../src/auth.follows.ts').getFollowers;
let getFollowing: typeof import('../../src/auth.follows.ts').getFollowing;
let getFollowCounts: typeof import('../../src/auth.follows.ts').getFollowCounts;

let mockGetSupabaseClient: ReturnType<typeof vi.fn>;
let mockGetIsPlaceholderMode: ReturnType<typeof vi.fn>;
let mockIsUUID: ReturnType<typeof vi.fn>;
let mockSafeRpc: ReturnType<typeof vi.fn>;

// ── Setup ──────────────────────────────────────────────────────────────────

describe('seam #152 | auth.follows.ts → auth.core', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    // Default: not placeholder, real UUID validator, no client
    mockGetIsPlaceholderMode = vi.fn().mockReturnValue(false);
    mockGetSupabaseClient = vi.fn().mockReturnValue(null);
    mockIsUUID = vi.fn((s: unknown): s is string =>
      typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
    );
    mockSafeRpc = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(),
    }));

    vi.doMock('../../src/auth.core.ts', () => ({
      getSupabaseClient: mockGetSupabaseClient,
      getIsPlaceholderMode: mockGetIsPlaceholderMode,
      isUUID: mockIsUUID,
    }));

    vi.doMock('../../src/auth.rpc.ts', () => ({
      safeRpc: mockSafeRpc,
    }));

    vi.doMock('../../src/auth.types.ts', () => ({}));

    const mod = await import('../../src/auth.follows.ts');
    followUser = mod.followUser;
    unfollowUser = mod.unfollowUser;
    getFollowers = mod.getFollowers;
    getFollowing = mod.getFollowing;
    getFollowCounts = mod.getFollowCounts;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── ARCH check ─────────────────────────────────────────────────────────

  it('ARCH: only imports from @supabase/supabase-js, auth.core, auth.rpc, auth.types', () => {
    const source = readFileSync(resolve(__dirname, '../../src/auth.follows.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const allowedOrigins = [
      '@supabase/supabase-js',
      './auth.core',
      './auth.rpc',
      './auth.types',
    ];
    for (const line of importLines) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!match) continue;
      const origin = match[1];
      expect(
        allowedOrigins.some(a => origin.startsWith(a)),
        `Unexpected import: ${line.trim()}`
      ).toBe(true);
    }
  });

  // ── TC1: followUser rejects non-UUID ───────────────────────────────────

  it('TC1: followUser returns invalid-UUID error for non-UUID target', async () => {
    const result = await followUser('not-a-uuid');
    expect(result).toEqual({ success: false, error: 'Invalid user ID' });
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  // ── TC2: followUser short-circuits in placeholder mode ─────────────────

  it('TC2: followUser returns success immediately in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await followUser(VALID_UUID);
    expect(result).toEqual({ success: true });
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  // ── TC3: followUser delegates to safeRpc on valid UUID ────────────────

  it('TC3: followUser calls safeRpc("follow_user") and returns success', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    const result = await followUser(VALID_UUID);
    expect(mockSafeRpc).toHaveBeenCalledWith('follow_user', { p_target_user_id: VALID_UUID });
    expect(result).toEqual({ success: true });
  });

  // ── TC4: unfollowUser rejects non-UUID ────────────────────────────────

  it('TC4: unfollowUser returns invalid-UUID error for non-UUID target', async () => {
    const result = await unfollowUser('bad');
    expect(result).toEqual({ success: false, error: 'Invalid user ID' });
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  // ── TC5: getFollowers returns empty array in placeholder mode ─────────

  it('TC5: getFollowers returns empty result in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await getFollowers(VALID_UUID2);
    expect(result).toEqual({ success: true, data: [], count: 0 });
    expect(mockGetSupabaseClient).not.toHaveBeenCalled();
  });

  // ── TC6: getFollowing calls supabase .from chain and returns rows ──────

  it('TC6: getFollowing uses supabase client .from("follows") and returns data with count', async () => {
    const mockRows = [{ following_id: VALID_UUID, profiles: [{ username: 'alice', display_name: 'Alice', elo_rating: 1200 }] }];
    const chain = makeFromChain(mockRows, 1, null);
    const fakeClient = { from: vi.fn().mockReturnValue(chain) };
    mockGetSupabaseClient.mockReturnValue(fakeClient);

    const result = await getFollowing(VALID_UUID2);

    expect(fakeClient.from).toHaveBeenCalledWith('follows');
    expect(chain.eq).toHaveBeenCalledWith('follower_id', VALID_UUID2);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockRows);
    expect(result.count).toBe(1);
  });

  // ── TC7: getFollowCounts uses safeRpc and returns counts ──────────────

  it('TC7: getFollowCounts calls safeRpc("get_follow_counts") and returns followers/following counts', async () => {
    mockSafeRpc.mockResolvedValue({ data: { followers: 5, following: 3 }, error: null });
    const result = await getFollowCounts(VALID_UUID);
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'get_follow_counts',
      { p_user_id: VALID_UUID }
    );
    expect(result).toEqual({ followers: 5, following: 3 });
  });

  // ── TC8: getFollowCounts returns zeros in placeholder mode ────────────

  it('TC8: getFollowCounts returns { followers: 0, following: 0 } in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await getFollowCounts(VALID_UUID);
    expect(result).toEqual({ followers: 0, following: 0 });
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  // ── TC9: followUser propagates safeRpc error ──────────────────────────

  it('TC9: followUser returns failure when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const result = await followUser(VALID_UUID);
    expect(result.success).toBe(false);
    expect(result.error).toBe('DB error');
  });

  // ── TC10: unfollowUser delegates to safeRpc on valid UUID ─────────────

  it('TC10: unfollowUser calls safeRpc("unfollow_user") and returns success', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    const result = await unfollowUser(VALID_UUID);
    expect(mockSafeRpc).toHaveBeenCalledWith('unfollow_user', { p_target_user_id: VALID_UUID });
    expect(result).toEqual({ success: true });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// seam #164 | src/auth.follows.ts → auth.rpc
//
// Tests auth.follows.ts end-to-end with real safeRpc and mocked Supabase
// client — verifies that each follows function invokes safeRpc with the
// correct RPC name + params, and that safeRpc's 401-retry logic is visible
// through the follows API surface.
//
// Pattern: shared mutable ref object lets the mock factory and test body
// refer to the same client without closure-timing issues.
// ────────────────────────────────────────────────────────────────────────────

// Shared mutable slot — the mock factory reads from this on every call.
const _164_clientSlot: { current: unknown } = { current: null };

function makeSupaMock164(
  rpcImpl: (...args: unknown[]) => Promise<{ data: unknown; error: unknown }>,
  refreshImpl: () => Promise<{ error: unknown }> = async () => ({ error: null }),
  signOutImpl: () => Promise<void> = async () => {},
) {
  return {
    rpc: vi.fn(rpcImpl),
    auth: {
      refreshSession: vi.fn(refreshImpl),
      signOut: vi.fn(signOutImpl),
    },
  };
}

describe('seam #164 | auth.follows.ts → auth.rpc', () => {
  let followUser164: typeof import('../../src/auth.follows.ts').followUser;
  let unfollowUser164: typeof import('../../src/auth.follows.ts').unfollowUser;
  let getFollowCounts164: typeof import('../../src/auth.follows.ts').getFollowCounts;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    _164_clientSlot.current = null; // reset to null; tests set it before calling follows fns

    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

    vi.doMock('../../src/auth.core.ts', () => ({
      // getSupabaseClient reads the mutable slot on every call
      getSupabaseClient: () => _164_clientSlot.current,
      getIsPlaceholderMode: () => false,
      isUUID: (s: unknown): s is string =>
        typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
    }));

    vi.doMock('../../src/auth.types.ts', () => ({}));

    // Override seam #152's mock of auth.rpc.ts with the REAL implementation.
    // The real safeRpc will use our mocked auth.core.ts above.
    vi.doMock('../../src/auth.rpc.ts', async () => {
      const actual = await vi.importActual<typeof import('../../src/auth.rpc.ts')>('../../src/auth.rpc.ts');
      return actual;
    });

    const mod = await import('../../src/auth.follows.ts');
    followUser164 = mod.followUser;
    unfollowUser164 = mod.unfollowUser;
    getFollowCounts164 = mod.getFollowCounts;
  });

  afterEach(() => {
    _164_clientSlot.current = null;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── ARCH: auth.rpc.ts only imports from auth.core, auth.types, zod ────

  it('ARCH: auth.rpc.ts only imports from auth.core, auth.types, and zod (real import lines only)', () => {
    const source = readFileSync(resolve(__dirname, '../../src/auth.rpc.ts'), 'utf-8');
    // Filter to actual import statements (exclude comment lines)
    const importLines = source.split('\n').filter(l => /^\s*import\s/.test(l) && /from\s+['"]/.test(l));
    const allowedOrigins = ['./auth.core', './auth.types', 'zod'];
    for (const line of importLines) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!match) continue;
      const origin = match[1];
      expect(
        allowedOrigins.some(a => origin.startsWith(a)),
        `Unexpected import in auth.rpc.ts: ${line.trim()}`
      ).toBe(true);
    }
  });

  // ── TC2: followUser → safeRpc → supabase.rpc("follow_user") ──────────

  it('TC2: followUser → safeRpc → supabase.rpc("follow_user") called with correct params', async () => {
    const supa = makeSupaMock164(async () => ({ data: null, error: null }));
    _164_clientSlot.current = supa;

    const result = await followUser164(VALID_UUID);

    expect(supa.rpc).toHaveBeenCalledWith('follow_user', { p_target_user_id: VALID_UUID });
    expect(result).toEqual({ success: true });
  });

  // ── TC3: unfollowUser → safeRpc → supabase.rpc("unfollow_user") ──────

  it('TC3: unfollowUser → safeRpc → supabase.rpc("unfollow_user") called with correct params', async () => {
    const supa = makeSupaMock164(async () => ({ data: null, error: null }));
    _164_clientSlot.current = supa;

    const result = await unfollowUser164(VALID_UUID);

    expect(supa.rpc).toHaveBeenCalledWith('unfollow_user', { p_target_user_id: VALID_UUID });
    expect(result).toEqual({ success: true });
  });

  // ── TC4: getFollowCounts → safeRpc → supabase.rpc("get_follow_counts")

  it('TC4: getFollowCounts → safeRpc → supabase.rpc("get_follow_counts") with p_user_id', async () => {
    const supa = makeSupaMock164(async () => ({ data: { followers: 4, following: 2 }, error: null }));
    _164_clientSlot.current = supa;

    const result = await getFollowCounts164(VALID_UUID);

    expect(supa.rpc).toHaveBeenCalledWith('get_follow_counts', { p_user_id: VALID_UUID });
    expect(result).toEqual({ followers: 4, following: 2 });
  });

  // ── TC5: 401 on followUser triggers refresh + retry ───────────────────

  it('TC5: followUser retries after 401 — safeRpc refresh loop visible end-to-end', async () => {
    let callCount = 0;
    const supa = makeSupaMock164(
      async () => {
        callCount++;
        if (callCount === 1) return { data: null, error: { status: 401, message: 'Unauthorized' } };
        return { data: null, error: null };
      },
      async () => ({ error: null }),
    );
    _164_clientSlot.current = supa;

    const result = await followUser164(VALID_UUID);

    expect(supa.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(supa.rpc).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true });
  });

  // ── TC6: 401 + refresh failure → signOut; followUser returns error ────

  it('TC6: followUser returns failure when 401 + refresh fails — safeRpc signs out', async () => {
    const supa = makeSupaMock164(
      async () => ({ data: null, error: { status: 401, message: 'Unauthorized' } }),
      async () => ({ error: { message: 'refresh_token_not_found' } }),
    );
    _164_clientSlot.current = supa;

    const result = await followUser164(VALID_UUID);

    expect(supa.auth.signOut).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.error).toBe('refresh_token_not_found');
    // RPC attempted once, NOT retried after failed refresh
    expect(supa.rpc).toHaveBeenCalledTimes(1);
  });

  // ── TC7: PGRST301 treated as 401 — unfollowUser retries ──────────────

  it('TC7: unfollowUser retries on PGRST301 — safeRpc treats PGRST301 as 401', async () => {
    let callCount = 0;
    const supa = makeSupaMock164(
      async () => {
        callCount++;
        if (callCount === 1) return { data: null, error: { code: 'PGRST301', message: 'JWT expired' } };
        return { data: null, error: null };
      },
      async () => ({ error: null }),
    );
    _164_clientSlot.current = supa;

    const result = await unfollowUser164(VALID_UUID2);

    expect(supa.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(supa.rpc).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true });
  });
});
