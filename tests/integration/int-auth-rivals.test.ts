/**
 * Integration tests — seam #150
 * src/auth.rivals.ts → auth.core
 *
 * Tests: declareRival UUID guard, placeholder-mode short-circuits,
 * RPC delegation, respondRival, getMyRivals.
 *
 * seam #163 appended below: src/auth.rivals.ts → auth.rpc
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Shared module refs ──────────────────────────────────────────────────────

let declareRival: typeof import('../../src/auth.rivals.ts').declareRival;
let respondRival: typeof import('../../src/auth.rivals.ts').respondRival;
let getMyRivals: typeof import('../../src/auth.rivals.ts').getMyRivals;

let safeRpcMock: ReturnType<typeof vi.fn>;
let getIsPlaceholderModeMock: ReturnType<typeof vi.fn>;
let isUUIDMock: ReturnType<typeof vi.fn>;

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const INVALID_UUID = 'not-a-uuid';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('seam #150 | auth.rivals.ts → auth.core', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    safeRpcMock = vi.fn();
    getIsPlaceholderModeMock = vi.fn().mockReturnValue(false);
    isUUIDMock = vi.fn().mockImplementation((s: unknown) =>
      typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
    );

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(),
    }));

    vi.doMock('../../src/auth.core.ts', () => ({
      getIsPlaceholderMode: getIsPlaceholderModeMock,
      isUUID: isUUIDMock,
    }));

    vi.doMock('../../src/auth.rpc.ts', () => ({
      safeRpc: safeRpcMock,
    }));

    vi.doMock('../../src/auth.types.ts', () => ({}));

    const mod = await import('../../src/auth.rivals.ts');
    declareRival = mod.declareRival;
    respondRival = mod.respondRival;
    getMyRivals = mod.getMyRivals;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC1: declareRival rejects invalid UUID ────────────────────────────────

  it('TC1: declareRival returns failure for invalid UUID without calling RPC', async () => {
    const result = await declareRival(INVALID_UUID);

    expect(result).toEqual({ success: false, error: 'Invalid user ID' });
    expect(safeRpcMock).not.toHaveBeenCalled();
  });

  // ── TC2: declareRival short-circuits in placeholder mode ──────────────────

  it('TC2: declareRival returns success immediately in placeholder mode', async () => {
    getIsPlaceholderModeMock.mockReturnValue(true);

    const result = await declareRival(VALID_UUID, 'rivalry message');

    expect(result).toEqual({ success: true });
    expect(safeRpcMock).not.toHaveBeenCalled();
  });

  // ── TC3: declareRival calls RPC with correct params ───────────────────────

  it('TC3: declareRival delegates to safeRpc with valid UUID and message', async () => {
    safeRpcMock.mockResolvedValue({ data: { success: true }, error: null });

    const result = await declareRival(VALID_UUID, 'let us battle');

    expect(safeRpcMock).toHaveBeenCalledWith('declare_rival', {
      p_target_id: VALID_UUID,
      p_message: 'let us battle',
    });
    expect(result).toEqual({ success: true });
  });

  // ── TC4: declareRival handles RPC error gracefully ────────────────────────

  it('TC4: declareRival returns failure when RPC returns an error', async () => {
    safeRpcMock.mockResolvedValue({ data: null, error: new Error('DB failure') });

    const result = await declareRival(VALID_UUID);

    expect(result).toMatchObject({ success: false, error: 'DB failure' });
  });

  // ── TC5: respondRival short-circuits in placeholder mode ─────────────────

  it('TC5: respondRival returns success immediately in placeholder mode', async () => {
    getIsPlaceholderModeMock.mockReturnValue(true);

    const result = await respondRival('some-rival-id', true);

    expect(result).toEqual({ success: true });
    expect(safeRpcMock).not.toHaveBeenCalled();
  });

  // ── TC6: respondRival delegates to RPC with accept=false ─────────────────

  it('TC6: respondRival passes accept=false to safeRpc when declining', async () => {
    safeRpcMock.mockResolvedValue({ data: { success: true }, error: null });

    const result = await respondRival('rival-xyz', false);

    expect(safeRpcMock).toHaveBeenCalledWith('respond_rival', {
      p_rival_id: 'rival-xyz',
      p_accept: false,
    });
    expect(result).toEqual({ success: true });
  });

  // ── TC7: getMyRivals returns empty array in placeholder mode ──────────────

  it('TC7: getMyRivals returns [] in placeholder mode without calling RPC', async () => {
    getIsPlaceholderModeMock.mockReturnValue(true);

    const result = await getMyRivals();

    expect(result).toEqual([]);
    expect(safeRpcMock).not.toHaveBeenCalled();
  });

  // ── TC8 (ARCH): only permitted imports used ───────────────────────────────

  it('TC8 (ARCH): auth.rivals.ts only imports from permitted modules', async () => {
    const source = await import('../../src/auth.rivals.ts?raw');
    const lines: string[] = source.default.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const forbidden = ['webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics'];

    for (const line of lines) {
      for (const dep of forbidden) {
        expect(line).not.toContain(dep);
      }
    }

    // Must import from auth.core and auth.rpc
    const importBlock = lines.join('\n');
    expect(importBlock).toContain('auth.core');
    expect(importBlock).toContain('auth.rpc');
  });
});

// ── seam #163 | auth.rivals.ts → auth.rpc ──────────────────────────────────
//
// Tests safeRpc behaviour as exercised by auth.rivals.ts:
//   - clean success path (single rpc call)
//   - 401 status triggers refresh + retry
//   - PGRST301 code triggers refresh + retry
//   - JWT expired message triggers refresh + retry
//   - refresh failure triggers signOut, returns error
//   - Supabase not initialized returns structured error
//   - declareRival via live safeRpc reaches supabase.rpc with correct call shape
// ─────────────────────────────────────────────────────────────────────────────

describe('seam #163 | auth.rivals.ts → auth.rpc (safeRpc integration)', () => {
  let rpcMock: ReturnType<typeof vi.fn>;
  let refreshSessionMock: ReturnType<typeof vi.fn>;
  let signOutMock: ReturnType<typeof vi.fn>;
  let getSupabaseClientMock: ReturnType<typeof vi.fn>;

  let safeRpcFn: typeof import('../../src/auth.rpc.ts').safeRpc;
  let declareRivalFn: typeof import('../../src/auth.rivals.ts').declareRival;

  const VALID_UUID_163 = 'deadbeef-dead-beef-dead-beefdeadbeef';

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    rpcMock = vi.fn();
    refreshSessionMock = vi.fn();
    signOutMock = vi.fn();

    const fakeClient = {
      rpc: rpcMock,
      auth: {
        refreshSession: refreshSessionMock,
        signOut: signOutMock,
      },
    };

    getSupabaseClientMock = vi.fn().mockReturnValue(fakeClient);

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(),
    }));

    vi.doMock('../../src/auth.core.ts', () => ({
      getSupabaseClient: getSupabaseClientMock,
      getIsPlaceholderMode: vi.fn().mockReturnValue(false),
      isUUID: vi.fn().mockImplementation((s: unknown) =>
        typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
      ),
    }));

    vi.doMock('../../src/auth.types.ts', () => ({}));

    // Explicitly un-mock auth.rpc.ts so the real implementation is loaded
    // (seam #150's beforeEach registered a doMock for it; vi.resetModules()
    //  clears the cache but NOT the doMock registrations, so we must undo it)
    vi.doUnmock('../../src/auth.rpc.ts');
    vi.doUnmock('../../src/auth.rivals.ts');

    // import real safeRpc (not mocked) to test its internals
    const rpcMod = await import('../../src/auth.rpc.ts');
    safeRpcFn = rpcMod.safeRpc;

    // import real auth.rivals.ts wired to the real safeRpc above
    const rivalsMod = await import('../../src/auth.rivals.ts');
    declareRivalFn = rivalsMod.declareRival;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC1: clean success — single rpc call ─────────────────────────────────

  it('TC1: safeRpc returns data on clean success without retrying', async () => {
    rpcMock.mockResolvedValue({ data: [{ id: '1' }], error: null });

    const result = await safeRpcFn('get_my_rivals');

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('get_my_rivals', {});
    expect(result).toEqual({ data: [{ id: '1' }], error: null });
  });

  // ── TC2: 401 status triggers refresh + retry ─────────────────────────────

  it('TC2: safeRpc retries after 401 status and returns second attempt result', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { status: 401, message: 'Unauthorized' } })
      .mockResolvedValueOnce({ data: [{ id: '2' }], error: null });
    refreshSessionMock.mockResolvedValue({ error: null });

    const result = await safeRpcFn('get_my_rivals');

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: [{ id: '2' }], error: null });
  });

  // ── TC3: PGRST301 code triggers refresh + retry ──────────────────────────

  it('TC3: safeRpc retries on PGRST301 error code', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST301', message: 'JWT expired' } })
      .mockResolvedValueOnce({ data: { success: true }, error: null });
    refreshSessionMock.mockResolvedValue({ error: null });

    const result = await safeRpcFn('declare_rival', { p_target_id: VALID_UUID_163, p_message: null });

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual({ success: true });
  });

  // ── TC4: JWT expired message triggers refresh + retry ────────────────────

  it('TC4: safeRpc retries when error message contains "jwt expired"', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { message: 'JWT expired' } })
      .mockResolvedValueOnce({ data: { success: true }, error: null });
    refreshSessionMock.mockResolvedValue({ error: null });

    const result = await safeRpcFn('respond_rival', { p_rival_id: 'some-id', p_accept: true });

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual({ success: true });
  });

  // ── TC5: refresh failure triggers signOut, returns error ─────────────────

  it('TC5: safeRpc signs out and returns error when refresh fails', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { status: 401, message: 'Unauthorized' } });
    refreshSessionMock.mockResolvedValue({ error: new Error('Refresh token revoked') });

    const result = await safeRpcFn('get_my_rivals');

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ data: null, error: { message: 'Refresh token revoked' } });
    // Should not retry after failed refresh
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  // ── TC6: Supabase not initialized returns structured error ────────────────

  it('TC6: safeRpc returns structured error when Supabase client is null', async () => {
    getSupabaseClientMock.mockReturnValue(null);

    const result = await safeRpcFn('get_my_rivals');

    expect(rpcMock).not.toHaveBeenCalled();
    expect(result).toEqual({ data: null, error: { message: 'Supabase not initialized' } });
  });

  // ── TC7: declareRival via live safeRpc reaches supabase.rpc ──────────────

  it('TC7: declareRival via live safeRpc calls supabase.rpc with correct call shape', async () => {
    rpcMock.mockResolvedValue({ data: { success: true }, error: null });

    const result = await declareRivalFn(VALID_UUID_163, 'you are my nemesis');

    expect(rpcMock).toHaveBeenCalledWith('declare_rival', {
      p_target_id: VALID_UUID_163,
      p_message: 'you are my nemesis',
    });
    expect(result).toEqual({ success: true });
  });
});
