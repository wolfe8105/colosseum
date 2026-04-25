/**
 * Integration tests — seam #109
 * src/auth.rpc.ts → auth.core
 *
 * Tests the safeRpc wrapper: null-client guard, success path, 401 retry,
 * PGRST301 retry, refresh-fail sign-out, Zod schema validation, and
 * ARCH import check.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// ── Supabase mock factory ───────────────────────────────────────────────────

function makeSupaMock(
  rpcImpl: () => Promise<{ data: unknown; error: unknown }>,
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

// ── Shared module refs ──────────────────────────────────────────────────────

let safeRpc: typeof import('../../src/auth.rpc.ts').safeRpc;
let getSupabaseClientMock: ReturnType<typeof vi.fn>;

// ── Tests ───────────────────────────────────────────────────────────────────

describe('seam #109 | auth.rpc.ts → auth.core', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    // Default: getSupabaseClient returns null (no client)
    getSupabaseClientMock = vi.fn().mockReturnValue(null);

    vi.doMock('../../src/auth.core.ts', () => ({
      getSupabaseClient: getSupabaseClientMock,
    }));

    vi.doMock('../../src/config.ts', () => ({
      UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      placeholderMode: { supabase: false },
    }));

    vi.doMock('../../src/auth.types.ts', () => ({}));

    const mod = await import('../../src/auth.rpc.ts');
    safeRpc = mod.safeRpc;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC1 — null client returns initialization error ──────────────────────
  it('TC1: returns error when Supabase client is null (not initialized)', async () => {
    getSupabaseClientMock.mockReturnValue(null);

    const result = await safeRpc('some_fn', {});

    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({ message: 'Supabase not initialized' });
  });

  // ── TC2 — successful RPC call returns data ──────────────────────────────
  it('TC2: returns RPC data on success', async () => {
    const mockData = { id: 'u1', username: 'tester' };
    const supa = makeSupaMock(async () => ({ data: mockData, error: null }));
    getSupabaseClientMock.mockReturnValue(supa);

    const result = await safeRpc('get_own_profile', {});

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
    expect(supa.rpc).toHaveBeenCalledTimes(1);
    expect(supa.rpc).toHaveBeenCalledWith('get_own_profile', {});
  });

  // ── TC3 — 401 status triggers token refresh + retry ────────────────────
  it('TC3: retries on 401 status error, returns retry result', async () => {
    const retryData = { id: 'u1' };
    let callCount = 0;
    const supa = makeSupaMock(
      async () => {
        callCount++;
        if (callCount === 1) return { data: null, error: { status: 401, message: 'Unauthorized' } };
        return { data: retryData, error: null };
      },
      async () => ({ error: null }),
    );
    getSupabaseClientMock.mockReturnValue(supa);

    const result = await safeRpc('some_fn', {});

    expect(supa.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(supa.rpc).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual(retryData);
    expect(result.error).toBeNull();
  });

  // ── TC4 — PGRST301 error code triggers token refresh + retry ───────────
  it('TC4: retries on PGRST301 error code', async () => {
    const retryData = { id: 'u2' };
    let callCount = 0;
    const supa = makeSupaMock(
      async () => {
        callCount++;
        if (callCount === 1) return { data: null, error: { code: 'PGRST301', message: 'JWT expired' } };
        return { data: retryData, error: null };
      },
      async () => ({ error: null }),
    );
    getSupabaseClientMock.mockReturnValue(supa);

    const result = await safeRpc('another_fn', {});

    expect(supa.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual(retryData);
  });

  // ── TC5 — 401 + refresh failure triggers signOut and returns error ──────
  it('TC5: signs out and returns error when 401 occurs and refresh fails', async () => {
    const supa = makeSupaMock(
      async () => ({ data: null, error: { status: 401, message: 'Unauthorized' } }),
      async () => ({ error: { message: 'refresh_token_not_found' } }),
    );
    getSupabaseClientMock.mockReturnValue(supa);

    const result = await safeRpc('some_fn', {});

    expect(supa.auth.signOut).toHaveBeenCalledTimes(1);
    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({ message: 'refresh_token_not_found' });
    // Should NOT have retried the RPC after refresh failure
    expect(supa.rpc).toHaveBeenCalledTimes(1);
  });

  // ── TC6 — Zod schema passes validation and returns data ─────────────────
  it('TC6: passes Zod schema validation and returns data when shape matches', async () => {
    const schema = z.object({ id: z.string() });
    const mockData = { id: 'abc' };
    const supa = makeSupaMock(async () => ({ data: mockData, error: null }));
    getSupabaseClientMock.mockReturnValue(supa);

    const result = await safeRpc('fn_with_schema', {}, schema);

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });

  // ── TC7 — ARCH: auth.rpc.ts only imports getSupabaseClient from auth.core ─
  it('TC7: ARCH — auth.rpc.ts only imports getSupabaseClient from auth.core', async () => {
    const fs = await import('fs');
    // import.meta.url in Vitest on Windows: file:///C:/Users/.../tests/integration/int-auth-rpc.test.ts
    // Extract the drive+path by stripping the file:/// prefix then turning forward slashes to backslashes
    const selfUrl = import.meta.url; // file:///C:/Users/...
    // Remove "file://" leaving /C:/... or C:/...
    const rawPath = selfUrl.replace(/^file:\/\//, '');
    // rawPath is now /C:/Users/.../int-auth-rpc.test.ts
    // Strip the leading slash before a drive letter on Windows
    const absPath = rawPath.replace(/^\/([A-Za-z]:)/, '$1');
    // absPath is now C:/Users/.../tests/integration/int-auth-rpc.test.ts
    const dirPath = absPath.substring(0, absPath.lastIndexOf('/'));
    const filePath = dirPath + '/../../src/auth.rpc.ts';
    const source = fs.readFileSync(filePath, 'utf8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const coreImportLine = importLines.find(l => l.includes('./auth.core'));

    expect(coreImportLine).toBeDefined();
    // Must import getSupabaseClient and nothing else from auth.core
    expect(coreImportLine).toMatch(/getSupabaseClient/);
    // Ensure there are no other named imports from auth.core (destructuring check)
    const coreMatch = coreImportLine!.match(/\{([^}]+)\}/);
    expect(coreMatch).toBeTruthy();
    const coreImports = coreMatch![1].split(',').map(s => s.trim()).filter(Boolean);
    expect(coreImports).toEqual(['getSupabaseClient']);
  });
});
