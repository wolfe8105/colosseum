// ============================================================
// AUTH RPC — tests/auth-rpc.test.ts
// Source: src/auth.rpc.ts
//
// CLASSIFICATION:
//   safeRpc() — Multi-step orchestration → Integration test
//     - no client → early return with error
//     - happy path → returns RPC data
//     - 401 → refresh session + retry
//     - schema provided + valid data → returns data
//     - schema provided + invalid data in PROD → logs warning, falls through
//
// IMPORTS:
//   { getSupabaseClient } from './auth.core.ts'
//   import type { SafeRpcResult }     — type-only
//   import type { ZodType }           — type-only (real zod needed for schema tests)
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

const mockGetSupabaseClient = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.core.ts', () => ({
  getSupabaseClient: mockGetSupabaseClient,
}));

import { safeRpc } from '../src/auth.rpc.ts';

// ── helpers ───────────────────────────────────────────────────

function makeClient(rpcFn: ReturnType<typeof vi.fn>) {
  return {
    rpc: rpcFn,
    auth: {
      refreshSession: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  };
}

beforeEach(() => {
  mockGetSupabaseClient.mockReset();
  vi.restoreAllMocks();
});

// ── no client ─────────────────────────────────────────────────

describe('TC1 — safeRpc: no client returns error', () => {
  it('returns { data: null, error } when Supabase is not initialized', async () => {
    mockGetSupabaseClient.mockReturnValue(null);

    const result = await safeRpc('some_fn', {});

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.error!.message).toContain('not initialized');
  });
});

// ── happy path ────────────────────────────────────────────────

describe('TC2 — safeRpc: returns RPC data on success', () => {
  it('returns the data from the RPC call', async () => {
    const rpcFn = vi.fn().mockResolvedValue({ data: { id: 'abc' }, error: null });
    mockGetSupabaseClient.mockReturnValue(makeClient(rpcFn));

    const result = await safeRpc('my_fn', { p_id: 'x' });

    expect(result.data).toEqual({ id: 'abc' });
    expect(result.error).toBeNull();
  });
});

describe('TC3 — safeRpc: passes fnName and args to supabase.rpc', () => {
  it('calls supabase.rpc with the correct function name and args', async () => {
    const rpcFn = vi.fn().mockResolvedValue({ data: 'ok', error: null });
    mockGetSupabaseClient.mockReturnValue(makeClient(rpcFn));

    await safeRpc('create_debate', { p_topic: 'test' });

    expect(rpcFn).toHaveBeenCalledWith('create_debate', { p_topic: 'test' });
  });
});

describe('TC4 — safeRpc: import contract — calls getSupabaseClient', () => {
  it('getSupabaseClient mock is called on every safeRpc invocation', async () => {
    const rpcFn = vi.fn().mockResolvedValue({ data: null, error: null });
    mockGetSupabaseClient.mockReturnValue(makeClient(rpcFn));

    await safeRpc('test_fn', {});

    expect(mockGetSupabaseClient).toHaveBeenCalled();
  });
});

// ── 401 retry ─────────────────────────────────────────────────

describe('TC5 — safeRpc: 401 status triggers session refresh and retry', () => {
  it('retries the RPC after a successful refresh on 401', async () => {
    const rpcFn = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'JWT expired', status: 401 } })
      .mockResolvedValueOnce({ data: { refreshed: true }, error: null });
    const refreshSession = vi.fn().mockResolvedValue({ error: null });
    const client = { ...makeClient(rpcFn), auth: { ...makeClient(rpcFn).auth, refreshSession, signOut: vi.fn() } };
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await safeRpc('protected_fn', {});

    expect(rpcFn).toHaveBeenCalledTimes(2);
    expect(refreshSession).toHaveBeenCalled();
    expect(result.data).toEqual({ refreshed: true });
  });
});

describe('TC6 — safeRpc: 401 + refresh failure → sign out + return error', () => {
  it('signs out and returns error when refresh fails', async () => {
    const rpcFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'JWT expired', status: 401 } });
    const refreshSession = vi.fn().mockResolvedValue({ error: { message: 'Refresh failed' } });
    const signOut = vi.fn().mockResolvedValue({});
    const client = {
      rpc: rpcFn,
      auth: { refreshSession, signOut },
    };
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await safeRpc('protected_fn', {});

    expect(signOut).toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error?.message).toContain('Refresh failed');
  });
});

describe('TC7 — safeRpc: PGRST301 error code triggers 401 path', () => {
  it('treats PGRST301 error code as a 401 requiring refresh', async () => {
    const rpcFn = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'jwt error', code: 'PGRST301' } })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    const refreshSession = vi.fn().mockResolvedValue({ error: null });
    const client = {
      rpc: rpcFn,
      auth: { refreshSession, signOut: vi.fn() },
    };
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await safeRpc('guarded_fn', {});

    expect(refreshSession).toHaveBeenCalled();
    expect(result.data).toEqual({ ok: true });
  });
});

// ── schema validation ─────────────────────────────────────────

describe('TC8 — safeRpc: valid data passes schema validation', () => {
  it('returns data when it matches the Zod schema', async () => {
    const schema = z.object({ id: z.string(), count: z.number() });
    const rpcFn = vi.fn().mockResolvedValue({ data: { id: 'xyz', count: 3 }, error: null });
    mockGetSupabaseClient.mockReturnValue(makeClient(rpcFn));

    const result = await safeRpc('typed_fn', {}, schema);

    expect(result.data).toEqual({ id: 'xyz', count: 3 });
  });
});

describe('TC9 — safeRpc: null data skips schema validation', () => {
  it('does not throw when data is null even with schema provided', async () => {
    const schema = z.object({ id: z.string() });
    const rpcFn = vi.fn().mockResolvedValue({ data: null, error: null });
    mockGetSupabaseClient.mockReturnValue(makeClient(rpcFn));

    await expect(safeRpc('empty_fn', {}, schema)).resolves.not.toThrow();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/auth.rpc.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.core.ts', './auth.types.ts', 'zod'];
    const source = readFileSync(
      resolve(__dirname, '../src/auth.rpc.ts'),
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
