/**
 * Integration tests — seam #169
 * src/auth.moderator.ts → auth.core
 *
 * Tests: toggleModerator, toggleModAvailable, updateModCategories,
 *        submitReference, ruleOnReference, scoreModerator,
 *        assignModerator, getAvailableModerators, getDebateReferences
 * Covers: placeholder-mode short-circuit, safeRpc delegation,
 *         profile mutation via live object reference, _notify dispatch,
 *         UUID guard in assignModerator, URL validation in submitReference,
 *         error propagation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Constants ──────────────────────────────────────────────────────────────

const VALID_UUID = '00000000-0000-0000-0000-000000000001';
const VALID_UUID2 = '00000000-0000-0000-0000-000000000002';

// ── Module refs ────────────────────────────────────────────────────────────

let toggleModerator: typeof import('../../src/auth.moderator.ts').toggleModerator;
let toggleModAvailable: typeof import('../../src/auth.moderator.ts').toggleModAvailable;
let updateModCategories: typeof import('../../src/auth.moderator.ts').updateModCategories;
let submitReference: typeof import('../../src/auth.moderator.ts').submitReference;
let ruleOnReference: typeof import('../../src/auth.moderator.ts').ruleOnReference;
let scoreModerator: typeof import('../../src/auth.moderator.ts').scoreModerator;
let assignModerator: typeof import('../../src/auth.moderator.ts').assignModerator;
let getAvailableModerators: typeof import('../../src/auth.moderator.ts').getAvailableModerators;
let getDebateReferences: typeof import('../../src/auth.moderator.ts').getDebateReferences;

let mockGetIsPlaceholderMode: ReturnType<typeof vi.fn>;
let mockGetCurrentUser: ReturnType<typeof vi.fn>;
let mockGetCurrentProfile: ReturnType<typeof vi.fn>;
let mockIsUUID: ReturnType<typeof vi.fn>;
let mock_notify: ReturnType<typeof vi.fn>;
let mockSafeRpc: ReturnType<typeof vi.fn>;

// ── Setup ──────────────────────────────────────────────────────────────────

describe('seam #169 | auth.moderator.ts → auth.core', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    mockGetIsPlaceholderMode = vi.fn().mockReturnValue(false);
    mockGetCurrentUser = vi.fn().mockReturnValue({ id: VALID_UUID, email: 'user@test.com' });
    mockGetCurrentProfile = vi.fn().mockReturnValue({
      id: VALID_UUID,
      username: 'testuser',
      is_moderator: false,
      mod_available: false,
    });
    mockIsUUID = vi.fn((s: unknown): s is string =>
      typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
    );
    mock_notify = vi.fn();
    mockSafeRpc = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(),
    }));

    vi.doMock('../../src/auth.core.ts', () => ({
      getIsPlaceholderMode: mockGetIsPlaceholderMode,
      getCurrentUser: mockGetCurrentUser,
      getCurrentProfile: mockGetCurrentProfile,
      isUUID: mockIsUUID,
      _notify: mock_notify,
    }));

    vi.doMock('../../src/auth.rpc.ts', () => ({
      safeRpc: mockSafeRpc,
    }));

    vi.doMock('../../src/auth.types.ts', () => ({}));
    vi.doMock('../../src/config.ts', () => ({
      UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      placeholderMode: { supabase: false },
    }));

    const mod = await import('../../src/auth.moderator.ts');
    toggleModerator = mod.toggleModerator;
    toggleModAvailable = mod.toggleModAvailable;
    updateModCategories = mod.updateModCategories;
    submitReference = mod.submitReference;
    ruleOnReference = mod.ruleOnReference;
    scoreModerator = mod.scoreModerator;
    assignModerator = mod.assignModerator;
    getAvailableModerators = mod.getAvailableModerators;
    getDebateReferences = mod.getDebateReferences;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── ARCH check ─────────────────────────────────────────────────────────

  it('ARCH: only imports from auth.core, auth.rpc, auth.types', () => {
    const source = readFileSync(resolve(__dirname, '../../src/auth.moderator.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const allowedOrigins = [
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

  // ── TC1: toggleModerator placeholder short-circuit ─────────────────────

  it('TC1: toggleModerator in placeholder mode mutates profile and notifies without RPC', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const fakeProfile = { is_moderator: false, mod_available: true };
    mockGetCurrentProfile.mockReturnValue(fakeProfile);
    const fakeUser = { id: VALID_UUID };
    mockGetCurrentUser.mockReturnValue(fakeUser);

    const result = await toggleModerator(true);

    expect(result).toEqual({ success: true });
    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(fakeProfile.is_moderator).toBe(true);
    expect(mock_notify).toHaveBeenCalledWith(fakeUser, fakeProfile);
  });

  // ── TC2: toggleModerator real mode calls correct RPC ───────────────────

  it('TC2: toggleModerator calls safeRpc("toggle_moderator_status") and mutates profile', async () => {
    const fakeProfile = { is_moderator: false, mod_available: true };
    mockGetCurrentProfile.mockReturnValue(fakeProfile);
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    const result = await toggleModerator(true);

    expect(mockSafeRpc).toHaveBeenCalledWith('toggle_moderator_status', { p_enabled: true });
    expect(fakeProfile.is_moderator).toBe(true);
    expect(result).toEqual({ success: true });
    expect(mock_notify).toHaveBeenCalledWith(
      expect.objectContaining({ id: VALID_UUID }),
      fakeProfile
    );
  });

  // ── TC3: toggleModerator disabling also clears mod_available ──────────

  it('TC3: toggleModerator(false) sets mod_available=false on profile', async () => {
    const fakeProfile = { is_moderator: true, mod_available: true };
    mockGetCurrentProfile.mockReturnValue(fakeProfile);
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    await toggleModerator(false);

    expect(fakeProfile.is_moderator).toBe(false);
    expect(fakeProfile.mod_available).toBe(false);
  });

  // ── TC4: toggleModAvailable calls correct RPC and mutates profile ──────

  it('TC4: toggleModAvailable calls safeRpc("toggle_mod_available") and updates mod_available', async () => {
    const fakeProfile = { is_moderator: true, mod_available: false };
    mockGetCurrentProfile.mockReturnValue(fakeProfile);
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    const result = await toggleModAvailable(true);

    expect(mockSafeRpc).toHaveBeenCalledWith('toggle_mod_available', { p_available: true });
    expect(fakeProfile.mod_available).toBe(true);
    expect(result).toEqual({ success: true });
  });

  // ── TC5: updateModCategories calls correct RPC and mutates profile ─────

  it('TC5: updateModCategories calls safeRpc("update_mod_categories") with category array', async () => {
    const fakeProfile: Record<string, unknown> = { mod_categories: [] };
    mockGetCurrentProfile.mockReturnValue(fakeProfile);
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    const cats = ['politics', 'science'];

    const result = await updateModCategories(cats);

    expect(mockSafeRpc).toHaveBeenCalledWith('update_mod_categories', { p_categories: cats });
    expect(fakeProfile.mod_categories).toEqual(cats);
    expect(result).toEqual({ success: true });
  });

  // ── TC6: assignModerator rejects non-UUID moderatorId ─────────────────

  it('TC6: assignModerator rejects non-UUID moderatorId without calling safeRpc', async () => {
    const result = await assignModerator(VALID_UUID, 'not-a-valid-uuid');

    expect(result).toEqual({ success: false, error: 'Invalid moderator ID' });
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  // ── TC7: assignModerator real mode calls correct RPC ──────────────────

  it('TC7: assignModerator calls safeRpc("assign_moderator") with correct params', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, moderator_type: 'human' }, error: null });

    const result = await assignModerator(VALID_UUID, VALID_UUID2, 'human');

    expect(mockSafeRpc).toHaveBeenCalledWith('assign_moderator', {
      p_debate_id: VALID_UUID,
      p_moderator_id: VALID_UUID2,
      p_moderator_type: 'human',
    });
    expect(result).toMatchObject({ success: true });
  });

  // ── TC8: submitReference blocks non-http(s) URLs ───────────────────────

  it('TC8: submitReference rejects javascript: URLs and returns error without RPC call', async () => {
    const result = await submitReference(VALID_UUID, 'javascript:alert(1)', 'desc');

    expect(result).toEqual({ success: false, error: 'Invalid URL — must start with http:// or https://' });
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  // ── TC9: submitReference calls correct RPC for valid URL ──────────────

  it('TC9: submitReference calls safeRpc("submit_reference") for valid https URL', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    const url = 'https://example.com/source';

    const result = await submitReference(VALID_UUID, url, 'A reference');

    expect(mockSafeRpc).toHaveBeenCalledWith('submit_reference', {
      p_debate_id: VALID_UUID,
      p_content: url,
      p_reference_type: 'A reference',
    });
    expect(result).toEqual({ success: true });
  });

  // ── TC10: ruleOnReference calls correct RPC ────────────────────────────

  it('TC10: ruleOnReference calls safeRpc("rule_on_reference") with correct params', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true }, error: null });

    const result = await ruleOnReference(VALID_UUID, 'accepted', 'Clear source');

    expect(mockSafeRpc).toHaveBeenCalledWith('rule_on_reference', {
      p_reference_id: VALID_UUID,
      p_ruling: 'accepted',
      p_reason: 'Clear source',
    });
    expect(result).toEqual({ success: true });
  });

  // ── TC11: scoreModerator calls correct RPC ─────────────────────────────

  it('TC11: scoreModerator calls safeRpc("score_moderator") with debate id and score', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    const result = await scoreModerator(VALID_UUID, 85);

    expect(mockSafeRpc).toHaveBeenCalledWith('score_moderator', {
      p_debate_id: VALID_UUID,
      p_score: 85,
    });
    expect(result).toEqual({ success: true });
  });

  // ── TC12: getAvailableModerators calls correct RPC ─────────────────────

  it('TC12: getAvailableModerators calls safeRpc("get_available_moderators") and returns data', async () => {
    const fakeMods = [
      { id: VALID_UUID, display_name: 'ModA', mod_rating: 90, mod_debates_total: 20, mod_approval_pct: 85 },
    ];
    mockSafeRpc.mockResolvedValue({ data: fakeMods, error: null });

    const result = await getAvailableModerators([VALID_UUID2]);

    expect(mockSafeRpc).toHaveBeenCalledWith('get_available_moderators', {
      p_exclude_ids: [VALID_UUID2],
    });
    expect(result).toEqual(fakeMods);
  });

  // ── TC13: getAvailableModerators placeholder returns stub list ─────────

  it('TC13: getAvailableModerators in placeholder mode returns stub moderators without RPC', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await getAvailableModerators();

    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'mod-1', display_name: 'FairJudge' });
  });

  // ── TC14: getDebateReferences calls correct RPC ────────────────────────

  it('TC14: getDebateReferences calls safeRpc("get_debate_references") and returns data', async () => {
    const fakeRefs = [{ id: VALID_UUID, url: 'https://example.com', ruling: 'accepted' }];
    mockSafeRpc.mockResolvedValue({ data: fakeRefs, error: null });

    const result = await getDebateReferences(VALID_UUID);

    expect(mockSafeRpc).toHaveBeenCalledWith('get_debate_references', {
      p_debate_id: VALID_UUID,
    });
    expect(result).toEqual(fakeRefs);
  });

  // ── TC15: safeRpc error propagates back as AuthResult failure ──────────

  it('TC15: toggleModerator propagates safeRpc error as { success: false, error: message }', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: new Error('DB connection failed') });

    const result = await toggleModerator(true);

    expect(result).toEqual({ success: false, error: 'DB connection failed' });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// seam #184 | auth.moderator.ts → auth.rpc
// Tests the safeRpc wrapper behaviour: 401 retry, refresh failure, PGRST301,
// jwt-expired message path, no-client guard, and happy-path passthrough.
// ══════════════════════════════════════════════════════════════════════════════

describe('seam #184 | auth.moderator.ts → auth.rpc', () => {
  // shared mock handles — reassigned each beforeEach
  let mockRpc: ReturnType<typeof vi.fn>;
  let mockRefreshSession: ReturnType<typeof vi.fn>;
  let mockSignOut: ReturnType<typeof vi.fn>;
  let mockGetSupabaseClient: ReturnType<typeof vi.fn>;

  // re-imported after each module reset
  let safeRpc: typeof import('../../src/auth.rpc.ts').safeRpc;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    mockRpc = vi.fn();
    mockRefreshSession = vi.fn();
    mockSignOut = vi.fn();

    // Capture fresh refs in local vars so factory closures below see them correctly.
    const capturedMockRpc = mockRpc;
    const capturedMockRefreshSession = mockRefreshSession;
    const capturedMockSignOut = mockSignOut;

    const fakeSupabaseClient = {
      rpc: capturedMockRpc,
      auth: {
        refreshSession: capturedMockRefreshSession,
        signOut: capturedMockSignOut,
      },
    };

    mockGetSupabaseClient = vi.fn().mockReturnValue(fakeSupabaseClient);
    const capturedGetSupabaseClient = mockGetSupabaseClient;

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(),
    }));

    // Mock auth.core so safeRpc gets our fake supabase client.
    vi.doMock('../../src/auth.core.ts', () => ({
      getSupabaseClient: capturedGetSupabaseClient,
      getIsPlaceholderMode: vi.fn().mockReturnValue(false),
      getCurrentUser: vi.fn().mockReturnValue(null),
      getCurrentProfile: vi.fn().mockReturnValue(null),
      isUUID: vi.fn().mockReturnValue(true),
      _notify: vi.fn(),
    }));

    vi.doMock('../../src/auth.types.ts', () => ({}));

    // CRITICAL: seam #169 beforeEach registered a vi.doMock factory for auth.rpc.ts
    // that persists across vi.resetModules(). We must re-register auth.rpc.ts using
    // importActual so the real safeRpc implementation is loaded (not the stale mock).
    vi.doMock('../../src/auth.rpc.ts', async () => {
      const real = await vi.importActual<typeof import('../../src/auth.rpc.ts')>('../../src/auth.rpc.ts');
      return real;
    });

    const mod = await import('../../src/auth.rpc.ts');
    safeRpc = mod.safeRpc;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC1: no supabase client returns init error immediately ─────────────

  it('TC1: returns Supabase-not-initialized error when getSupabaseClient returns null', async () => {
    mockGetSupabaseClient.mockReturnValue(null);

    const result = await safeRpc('some_fn', {});

    expect(result).toEqual({ data: null, error: { message: 'Supabase not initialized' } });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  // ── TC2: happy path passes data through unchanged ──────────────────────

  it('TC2: returns data unchanged on successful RPC call with no error', async () => {
    const payload = { id: '123', label: 'ok' };
    mockRpc.mockResolvedValue({ data: payload, error: null });

    const result = await safeRpc('get_something', { p_id: '123' });

    expect(mockRpc).toHaveBeenCalledWith('get_something', { p_id: '123' });
    expect(result).toEqual({ data: payload, error: null });
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  // ── TC3: 401 status triggers refresh + retry, returns retried data ─────

  it('TC3: refreshes session and retries on 401 status, returning the retried result', async () => {
    const retryPayload = { success: true };
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { message: '401 Unauthorized', status: 401 } })
      .mockResolvedValueOnce({ data: retryPayload, error: null });
    mockRefreshSession.mockResolvedValue({ error: null });

    const result = await safeRpc('protected_fn', {});

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: retryPayload, error: null });
  });

  // ── TC4: PGRST301 code triggers refresh path ───────────────────────────

  it('TC4: refreshes session and retries when error.code is PGRST301', async () => {
    const retryPayload = [{ id: 'row-1' }];
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'JWT expired', code: 'PGRST301' } })
      .mockResolvedValueOnce({ data: retryPayload, error: null });
    mockRefreshSession.mockResolvedValue({ error: null });

    const result = await safeRpc('list_items', {});

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: retryPayload, error: null });
  });

  // ── TC5: "jwt expired" message triggers refresh path ──────────────────

  it('TC5: refreshes session on error message containing "jwt expired" (case-insensitive)', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'JWT Expired' } })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    mockRefreshSession.mockResolvedValue({ error: null });

    const result = await safeRpc('secure_fn', {});

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual({ ok: true });
  });

  // ── TC6: refresh failure triggers signOut and returns error ───────────

  it('TC6: calls signOut and returns error when session refresh fails after 401', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Unauthorized', status: 401 } });
    mockRefreshSession.mockResolvedValue({ error: new Error('Refresh token expired') });
    mockSignOut.mockResolvedValue({});

    const result = await safeRpc('guarded_fn', {});

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: null, error: { message: 'Refresh token expired' } });
    // should NOT retry the RPC after a failed refresh
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  // ── TC7: null data on success returns null without crash ───────────────

  it('TC7: returns { data: null, error: null } cleanly when RPC succeeds with null data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await safeRpc('void_fn', {});

    expect(result).toEqual({ data: null, error: null });
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });
});
