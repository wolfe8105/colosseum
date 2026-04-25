/**
 * Integration tests — seam #168
 * src/auth.ops.ts → auth.core
 *
 * Tests: signUp, logIn, oauthLogin, logOut, resetPassword, updatePassword
 * Covers: placeholder-mode short-circuit, Supabase auth method delegation,
 *         logOut side-effects (_clearAuthState + _notify), error propagation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeAuthClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://oauth.example.com/auth' }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
      ...overrides,
    },
  };
}

// ── Module refs ────────────────────────────────────────────────────────────

let signUp: typeof import('../../src/auth.ops.ts').signUp;
let logIn: typeof import('../../src/auth.ops.ts').logIn;
let oauthLogin: typeof import('../../src/auth.ops.ts').oauthLogin;
let logOut: typeof import('../../src/auth.ops.ts').logOut;
let resetPassword: typeof import('../../src/auth.ops.ts').resetPassword;
let updatePassword: typeof import('../../src/auth.ops.ts').updatePassword;

let mockGetIsPlaceholderMode: ReturnType<typeof vi.fn>;
let mockGetSupabaseClient: ReturnType<typeof vi.fn>;
let mockClearAuthState: ReturnType<typeof vi.fn>;
let mockNotify: ReturnType<typeof vi.fn>;

// ── Setup ──────────────────────────────────────────────────────────────────

describe('seam #168 | auth.ops.ts → auth.core', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    mockGetIsPlaceholderMode = vi.fn().mockReturnValue(false);
    mockGetSupabaseClient = vi.fn().mockReturnValue(makeAuthClient());
    mockClearAuthState = vi.fn();
    mockNotify = vi.fn();

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(),
    }));

    vi.doMock('../../src/auth.core.ts', () => ({
      getIsPlaceholderMode: mockGetIsPlaceholderMode,
      getSupabaseClient: mockGetSupabaseClient,
      getCurrentUser: vi.fn().mockReturnValue(null),
      getCurrentProfile: vi.fn().mockReturnValue(null),
      _clearAuthState: mockClearAuthState,
      _notify: mockNotify,
    }));

    vi.doMock('../../src/config.ts', () => ({
      APP: { baseUrl: 'https://themoderator.app' },
      UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      SUPABASE_URL: 'https://fake.supabase.co',
      SUPABASE_ANON_KEY: 'fake-anon-key',
      placeholderMode: { supabase: false },
    }));

    vi.doMock('../../src/auth.types.ts', () => ({}));

    const mod = await import('../../src/auth.ops.ts');
    signUp = mod.signUp;
    logIn = mod.logIn;
    oauthLogin = mod.oauthLogin;
    logOut = mod.logOut;
    resetPassword = mod.resetPassword;
    updatePassword = mod.updatePassword;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── ARCH check ─────────────────────────────────────────────────────────

  it('ARCH: only imports from auth.core, auth.types, config, and no banned modules', () => {
    const source = readFileSync(resolve(__dirname, '../../src/auth.ops.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const allowedOrigins = [
      './auth.core',
      './auth.types',
      './config',
    ];
    const banned = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of importLines) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!match) continue;
      const origin = match[1];
      expect(
        allowedOrigins.some(a => origin.startsWith(a)),
        `Unexpected import origin: ${line.trim()}`
      ).toBe(true);
      for (const b of banned) {
        expect(origin.includes(b), `Banned import found: ${line.trim()}`).toBe(false);
      }
    }
  });

  // ── TC1: placeholder mode short-circuits all functions ────────────────

  it('TC1: all functions return success immediately in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const su = await signUp({ email: 'a@b.com', password: 'pw', username: 'u', displayName: 'D', dob: '2000-01-01' });
    expect(su).toEqual({ success: true, placeholder: true });

    const li = await logIn({ email: 'a@b.com', password: 'pw' });
    expect(li).toEqual({ success: true, placeholder: true });

    const oa = await oauthLogin('google');
    expect(oa).toEqual({ success: true, placeholder: true });

    // logOut placeholder returns { success: true } (no placeholder field)
    const lo = await logOut();
    expect(lo).toEqual({ success: true });

    const rp = await resetPassword('a@b.com');
    expect(rp).toEqual({ success: true, placeholder: true });

    const up = await updatePassword('newpw');
    expect(up).toEqual({ success: true, placeholder: true });

    // No real Supabase calls were made
    expect(mockGetSupabaseClient).not.toHaveBeenCalled();
  });

  // ── TC2: signUp delegates to auth.signUp with correct params ──────────

  it('TC2: signUp calls auth.signUp with email, password, and metadata options', async () => {
    const fakeUser = { id: 'user-1', email: 'a@b.com' };
    const fakeSession = { access_token: 'tok' };
    const client = makeAuthClient({
      signUp: vi.fn().mockResolvedValue({ data: { user: fakeUser, session: fakeSession }, error: null }),
    });
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await signUp({
      email: 'a@b.com',
      password: 'secret',
      username: 'alice',
      displayName: 'Alice',
      dob: '2000-05-15',
    });

    expect(client.auth.signUp).toHaveBeenCalledOnce();
    const callArgs = (client.auth.signUp as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.email).toBe('a@b.com');
    expect(callArgs.password).toBe('secret');
    expect(callArgs.options.data.username).toBe('alice');
    expect(callArgs.options.data.display_name).toBe('Alice');
    expect(callArgs.options.data.date_of_birth).toBe('2000-05-15');
    expect(callArgs.options.emailRedirectTo).toContain('moderator-login.html');

    expect(result.success).toBe(true);
    expect(result.user).toBe(fakeUser);
    expect(result.session).toBe(fakeSession);
  });

  // ── TC3: signUp propagates error from Supabase ────────────────────────

  it('TC3: signUp returns error when Supabase auth.signUp throws', async () => {
    const client = makeAuthClient({
      signUp: vi.fn().mockResolvedValue({ data: null, error: new Error('Email already taken') }),
    });
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await signUp({ email: 'a@b.com', password: 'pw', username: 'u', displayName: 'D', dob: '2000-01-01' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Email already taken');
  });

  // ── TC4: logIn delegates to signInWithPassword ────────────────────────

  it('TC4: logIn calls auth.signInWithPassword with email and password', async () => {
    const fakeUser = { id: 'user-2', email: 'b@c.com' };
    const fakeSession = { access_token: 'tok2' };
    const client = makeAuthClient({
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: fakeUser, session: fakeSession }, error: null }),
    });
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await logIn({ email: 'b@c.com', password: 'mypass' });

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'b@c.com', password: 'mypass' });
    expect(result.success).toBe(true);
    expect(result.user).toBe(fakeUser);
    expect(result.session).toBe(fakeSession);
  });

  // ── TC5: logIn propagates error ───────────────────────────────────────

  it('TC5: logIn returns error when signInWithPassword fails', async () => {
    const client = makeAuthClient({
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: new Error('Invalid credentials') }),
    });
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await logIn({ email: 'bad@bad.com', password: 'wrong' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
  });

  // ── TC6: oauthLogin calls signInWithOAuth and returns url ────────────

  it('TC6: oauthLogin calls auth.signInWithOAuth and returns url on success', async () => {
    const oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?abc';
    const client = makeAuthClient({
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: oauthUrl }, error: null }),
    });
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await oauthLogin('google', 'https://themoderator.app/callback');

    expect(client.auth.signInWithOAuth).toHaveBeenCalledOnce();
    const callArgs = (client.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.provider).toBe('google');
    expect(callArgs.options.redirectTo).toBe('https://themoderator.app/callback');

    expect(result.success).toBe(true);
    expect(result.url).toBe(oauthUrl);
  });

  // ── TC7: logOut calls _clearAuthState and _notify(null, null) ─────────

  it('TC7: logOut calls _clearAuthState and _notify(null, null) after signOut', async () => {
    const client = makeAuthClient({
      signOut: vi.fn().mockResolvedValue({ error: null }),
    });
    mockGetSupabaseClient.mockReturnValue(client);

    // Advance timer to let signOut race resolve
    const resultPromise = logOut();
    await vi.advanceTimersByTimeAsync(100);
    const result = await resultPromise;

    expect(mockClearAuthState).toHaveBeenCalledOnce();
    expect(mockNotify).toHaveBeenCalledWith(null, null);
    expect(result).toEqual({ success: true });
  });

  // ── TC8: logOut proceeds even when signOut times out ─────────────────

  it('TC8: logOut resolves successfully when signOut races to 3s timeout', async () => {
    const client = makeAuthClient({
      // signOut never resolves
      signOut: vi.fn().mockImplementation(() => new Promise(() => {})),
    });
    mockGetSupabaseClient.mockReturnValue(client);

    const resultPromise = logOut();
    // Advance past the 3000ms timeout
    await vi.advanceTimersByTimeAsync(3500);
    const result = await resultPromise;

    // Even on timeout, cleanup still happens
    expect(mockClearAuthState).toHaveBeenCalledOnce();
    expect(mockNotify).toHaveBeenCalledWith(null, null);
    expect(result).toEqual({ success: true });
  });

  // ── TC9: resetPassword delegates to resetPasswordForEmail ─────────────

  it('TC9: resetPassword calls auth.resetPasswordForEmail with redirectTo', async () => {
    const client = makeAuthClient({
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    });
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await resetPassword('user@example.com');

    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledOnce();
    const callArgs = (client.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[0]).toBe('user@example.com');
    expect(callArgs[1].redirectTo).toContain('moderator-login.html');
    expect(callArgs[1].redirectTo).toContain('reset=true');
    expect(result).toEqual({ success: true });
  });

  // ── TC10: updatePassword delegates to auth.updateUser ────────────────

  it('TC10: updatePassword calls auth.updateUser with new password', async () => {
    const client = makeAuthClient({
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    });
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await updatePassword('supersecret123');

    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'supersecret123' });
    expect(result).toEqual({ success: true });
  });

  // ── TC11: updatePassword propagates error ────────────────────────────

  it('TC11: updatePassword returns error when updateUser fails', async () => {
    const client = makeAuthClient({
      updateUser: vi.fn().mockResolvedValue({ error: new Error('Password too short') }),
    });
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await updatePassword('abc');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Password too short');
  });

  // ── TC12: signUp requires email and password ──────────────────────────

  it('TC12: signUp returns error when email or password is missing', async () => {
    const result = await signUp({ email: '', password: '', username: 'u', displayName: 'D', dob: '2000-01-01' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Email and password are required/i);
    expect(mockGetSupabaseClient).not.toHaveBeenCalled();
  });
});
