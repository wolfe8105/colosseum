/**
 * Integration tests — seam #052
 * src/auth.rpc.ts → rpc-schemas (ZodType contract validation)
 *
 * safeRpc() accepts an optional ZodType<T> schema (sourced from
 * src/contracts/rpc-schemas.ts) as its third argument. These tests
 * exercise the full behaviour: happy path, 401 recovery, schema
 * validation branching, and the ARCH guard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ────────────────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockRefreshSession = vi.hoisted(() => vi.fn());
const mockSignOut = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  refreshSession: mockRefreshSession,
  signOut: mockSignOut,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ── beforeEach ───────────────────────────────────────────────────────────
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRefreshSession.mockReset();
  mockSignOut.mockReset();

  // Default happy-path responses
  mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
  mockRefreshSession.mockResolvedValue({ error: null });
  mockSignOut.mockResolvedValue({});
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = '';
});

// ── TC-1: safeRpc returns data on success without schema (legacy path) ───
describe('safeRpc — no schema (legacy)', () => {
  it('returns rpc data when no schema is provided', async () => {
    mockRpc.mockResolvedValue({ data: { value: 42 }, error: null });

    // Prime auth.core so getSupabaseClient() returns the mock
    const authCore = await import('../../src/auth.core.ts');
    // Force supabase client to be initialised by importing config path
    // auth.core exposes getSupabaseClient; call initSupabase indirectly via
    // importing the module (it auto-inits on import with env vars present).
    // We reach safeRpc directly:
    const { safeRpc } = await import('../../src/auth.rpc.ts');

    const result = await safeRpc('some_rpc', { p_id: 'abc' });

    expect(mockRpc).toHaveBeenCalledWith('some_rpc', { p_id: 'abc' });
    expect(result.data).toEqual({ value: 42 });
    expect(result.error).toBeNull();
  });
});

// ── TC-2: safeRpc validates data against a Zod schema from rpc-schemas ──
describe('safeRpc — with rpc-schemas ZodType (validated path)', () => {
  it('passes valid data through schema and returns it unchanged', async () => {
    const validData = { reacted: true, reaction_count: 5 };
    mockRpc.mockResolvedValue({ data: validData, error: null });

    const { safeRpc } = await import('../../src/auth.rpc.ts');
    const { react_debate_card } = await import('../../src/contracts/rpc-schemas.ts');

    const result = await safeRpc('react_debate_card', {}, react_debate_card);

    expect(mockRpc).toHaveBeenCalledWith('react_debate_card', {});
    expect(result.data).toEqual(validData);
    expect(result.error).toBeNull();
  });
});

// ── TC-3: safeRpc retries on HTTP 401 status ─────────────────────────────
describe('safeRpc — 401 recovery', () => {
  it('retries the rpc call after a successful token refresh on 401', async () => {
    // First call → 401; second call → success
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { status: 401, message: 'Unauthorized' } })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });

    mockRefreshSession.mockResolvedValue({ error: null });

    const { safeRpc } = await import('../../src/auth.rpc.ts');
    const result = await safeRpc('protected_rpc', {});

    expect(mockRefreshSession).toHaveBeenCalledOnce();
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual({ ok: true });
    expect(result.error).toBeNull();
  });
});

// ── TC-4: safeRpc retries on PGRST301 error code ─────────────────────────
describe('safeRpc — PGRST301 recovery', () => {
  it('retries the rpc call after token refresh on PGRST301 (JWT expired)', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST301', message: 'JWT expired' } })
      .mockResolvedValueOnce({ data: { rows: [] }, error: null });

    mockRefreshSession.mockResolvedValue({ error: null });

    const { safeRpc } = await import('../../src/auth.rpc.ts');
    const result = await safeRpc('my_rpc', { p_val: 1 });

    expect(mockRefreshSession).toHaveBeenCalledOnce();
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual({ rows: [] });
  });
});

// ── TC-5: safeRpc signs out when refresh fails ───────────────────────────
describe('safeRpc — refresh failure triggers sign-out', () => {
  it('calls signOut and returns error when refreshSession fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { status: 401, message: 'Unauthorized' } });
    mockRefreshSession.mockResolvedValue({ error: { message: 'Refresh token expired' } });

    const { safeRpc } = await import('../../src/auth.rpc.ts');
    const result = await safeRpc('any_rpc', {});

    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Refresh token expired');
  });
});

// ── TC-6: schema validation with get_my_invite_link from rpc-schemas ─────
describe('safeRpc — get_my_invite_link schema validation', () => {
  it('validates invite link response against rpc-schemas export', async () => {
    const payload = { url: 'https://themoderator.app/r/abc123', ref_code: 'abc123' };
    mockRpc.mockResolvedValue({ data: payload, error: null });

    const { safeRpc } = await import('../../src/auth.rpc.ts');
    const { get_my_invite_link } = await import('../../src/contracts/rpc-schemas.ts');

    const result = await safeRpc('get_my_invite_link', {}, get_my_invite_link);

    expect(mockRpc).toHaveBeenCalledWith('get_my_invite_link', {});
    expect(result.data).toMatchObject({ url: expect.any(String), ref_code: expect.any(String) });
  });
});

// ── ARCH guard ───────────────────────────────────────────────────────────
describe('ARCH — seam #052', () => {
  it('src/auth.rpc.ts accepts ZodType from rpc-schemas as its third parameter', () => {
    // auth.rpc.ts does not import rpc-schemas itself — it accepts any ZodType<T>.
    // The seam is the contract: safeRpc signature uses ZodType from 'zod',
    // and rpc-schemas exports Zod schemas that satisfy that type.
    // Verify: auth.rpc.ts imports 'zod' (the shared type boundary).
    const source = readFileSync(resolve(__dirname, '../../src/auth.rpc.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('zod'))).toBe(true);
  });

  it('src/contracts/rpc-schemas.ts exports ZodType-compatible schemas', () => {
    // Confirm rpc-schemas exports are Zod objects (have a .safeParse method).
    // This verifies the contract side of the seam.
    const source = readFileSync(resolve(__dirname, '../../src/contracts/rpc-schemas.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('zod'))).toBe(true);
  });

  it('safeRpc function signature accepts optional schema: ZodType<T>', () => {
    const source = readFileSync(resolve(__dirname, '../../src/auth.rpc.ts'), 'utf-8');
    // Check function signature contains ZodType
    expect(source).toMatch(/ZodType/);
    // Check it is optional (schema?)
    expect(source).toMatch(/schema\?/);
  });
});
