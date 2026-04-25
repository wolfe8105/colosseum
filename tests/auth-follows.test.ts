// ============================================================
// AUTH FOLLOWS — tests/auth-follows.test.ts
// Source: src/auth.follows.ts
//
// CLASSIFICATION:
//   followUser()      — UUID validation + RPC → Contract test
//   unfollowUser()    — UUID validation + RPC → Contract test
//   getFollowers()    — Direct DB query → Contract test
//   getFollowing()    — Direct DB query → Contract test
//   getFollowCounts() — RPC wrapper → Contract test
//
// IMPORTS:
//   { getSupabaseClient, getIsPlaceholderMode, isUUID } from './auth.core.ts'
//   { safeRpc }                                           from './auth.rpc.ts'
//   import type { ... }                                   — type-only
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockIsUUID = vi.hoisted(() => vi.fn((s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
));
const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockSelectBuilder = vi.hoisted(() => ({
  from: vi.fn(),
}));

const VALID_UUID = '11111111-2222-3333-4444-555555555555';

function makeClient(selectResult: { data: unknown; count?: number | null; error: unknown }) {
  const eqFn = vi.fn().mockReturnValue({ ...selectResult });
  const limitFn = vi.fn().mockReturnValue({ ...selectResult });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn, limit: limitFn });
  eqFn.mockReturnValue({ limit: limitFn });
  limitFn.mockResolvedValue(selectResult);
  // Make eq return something with limit
  eqFn.mockReturnValue({ limit: vi.fn().mockResolvedValue(selectResult) });
  return {
    from: vi.fn().mockReturnValue({ select: selectFn }),
  };
}

const mockGetSupabaseClient = vi.hoisted(() => vi.fn(() => null as unknown));

vi.mock('../src/auth.core.ts', () => ({
  getSupabaseClient: mockGetSupabaseClient,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  isUUID: mockIsUUID,
}));

vi.mock('../src/auth.rpc.ts', () => ({
  safeRpc: mockSafeRpc,
}));

import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowCounts,
} from '../src/auth.follows.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockGetSupabaseClient.mockReturnValue(null);
  mockIsUUID.mockImplementation((s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
});

// ── followUser ────────────────────────────────────────────────

describe('TC1 — followUser: invalid UUID returns failure', () => {
  it('returns failure for non-UUID targetUserId without calling RPC', async () => {
    const result = await followUser('not-a-uuid');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC2 — followUser: placeholder mode returns success stub', () => {
  it('returns success without calling RPC in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await followUser(VALID_UUID);

    expect(result.success).toBe(true);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC3 — followUser: calls follow_user RPC with valid UUID', () => {
  it('calls safeRpc with "follow_user" and target id', async () => {
    mockSafeRpc.mockResolvedValue({ error: null });

    await followUser(VALID_UUID);

    expect(mockSafeRpc).toHaveBeenCalledWith('follow_user', { p_target_user_id: VALID_UUID });
  });
});

describe('TC4 — followUser: returns failure on RPC error', () => {
  it('returns success:false when safeRpc returns error', async () => {
    mockSafeRpc.mockResolvedValue({ error: { message: 'Already following' } });

    const result = await followUser(VALID_UUID);

    expect(result.success).toBe(false);
  });
});

// ── unfollowUser ──────────────────────────────────────────────

describe('TC5 — unfollowUser: invalid UUID returns failure', () => {
  it('returns failure for non-UUID without calling RPC', async () => {
    const result = await unfollowUser('bad-id');
    expect(result.success).toBe(false);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC6 — unfollowUser: calls unfollow_user RPC', () => {
  it('calls safeRpc with "unfollow_user"', async () => {
    mockSafeRpc.mockResolvedValue({ error: null });

    await unfollowUser(VALID_UUID);

    expect(mockSafeRpc).toHaveBeenCalledWith('unfollow_user', { p_target_user_id: VALID_UUID });
  });
});

// ── getFollowers / getFollowing (placeholder mode) ────────────

describe('TC7 — getFollowers: placeholder mode returns empty list', () => {
  it('returns empty data without DB query in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await getFollowers(VALID_UUID);

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});

describe('TC8 — getFollowing: placeholder mode returns empty list', () => {
  it('returns empty data without DB query in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await getFollowing(VALID_UUID);

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});

// ── getFollowCounts ───────────────────────────────────────────

describe('TC9 — getFollowCounts: calls get_follow_counts RPC', () => {
  it('calls safeRpc with "get_follow_counts" and user id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { followers: 5, following: 3 }, error: null });

    await getFollowCounts(VALID_UUID);

    expect(mockSafeRpc).toHaveBeenCalledWith('get_follow_counts', { p_user_id: VALID_UUID });
  });
});

describe('TC10 — getFollowCounts: placeholder mode returns zeros', () => {
  it('returns zeros without calling RPC in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await getFollowCounts(VALID_UUID);

    expect(result.followers).toBe(0);
    expect(result.following).toBe(0);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC11 — getFollowCounts: returns zeros on RPC error', () => {
  it('returns zeros when safeRpc returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const result = await getFollowCounts(VALID_UUID);

    expect(result.followers).toBe(0);
    expect(result.following).toBe(0);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/auth.follows.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.core.ts', './auth.rpc.ts', './auth.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/auth.follows.ts'),
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
