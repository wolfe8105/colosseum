// ============================================================
// AUTH OPS — tests/auth-ops.test.ts
// Source: src/auth.ops.ts
//
// CLASSIFICATION:
//   signUp()         — Supabase auth wrapper → Integration test
//   logIn()          — Supabase auth wrapper → Integration test
//   oauthLogin()     — Supabase auth wrapper → Integration test
//   logOut()         — Supabase auth + state cleanup → Integration test
//   resetPassword()  — Supabase auth wrapper → Integration test
//   updatePassword() — Supabase auth wrapper → Integration test
//
// IMPORTS:
//   { getSupabaseClient, getIsPlaceholderMode, ... } from './auth.core.ts'
//   { APP }                                          from './config.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSupabaseClient = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockGetCurrentUser = vi.hoisted(() => vi.fn(() => null));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => null));
const mockNotify = vi.hoisted(() => vi.fn());
const mockClearAuthState = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.core.ts', () => ({
  getSupabaseClient: mockGetSupabaseClient,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
  _notify: mockNotify,
  _clearAuthState: mockClearAuthState,
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  APP: { baseUrl: 'https://themoderator.app' },
  escapeHTML: vi.fn((s: unknown) => String(s ?? '')),
  showToast: vi.fn(),
  FEATURES: { rivals: true },
}));

import { signUp, logIn, oauthLogin, logOut, resetPassword, updatePassword } from '../src/auth.ops.ts';

const makeAuthClient = (overrides: Partial<any> = {}) => ({
  auth: {
    signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' }, session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' }, session: null }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://oauth.example.com' }, error: null }),
    signOut: vi.fn().mockResolvedValue({}),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  },
});

beforeEach(() => {
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockGetSupabaseClient.mockReset();
  mockNotify.mockReset();
  mockClearAuthState.mockReset();
});

// ── signUp ────────────────────────────────────────────────────

describe('TC1 — signUp: placeholder mode returns success immediately', () => {
  it('returns { success: true, placeholder: true } without calling Supabase', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await signUp({ email: 'a@b.com', password: 'pw', username: 'u', displayName: 'U', dob: '2000-01-01' });

    expect(result.success).toBe(true);
    expect(result.placeholder).toBe(true);
    expect(mockGetSupabaseClient).not.toHaveBeenCalled();
  });
});

describe('TC2 — signUp: missing email returns error', () => {
  it('returns failure when email is empty', async () => {
    const result = await signUp({ email: '', password: 'pw', username: 'u', displayName: 'U', dob: '2000-01-01' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/required/i);
  });
});

describe('TC3 — signUp: missing password returns error', () => {
  it('returns failure when password is empty', async () => {
    const result = await signUp({ email: 'a@b.com', password: '', username: 'u', displayName: 'U', dob: '2000-01-01' });
    expect(result.success).toBe(false);
  });
});

describe('TC4 — signUp: Supabase error returns failure', () => {
  it('wraps thrown error in { success: false, error }', async () => {
    const client = makeAuthClient({ signUp: vi.fn().mockRejectedValue(new Error('Email already taken')) });
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await signUp({ email: 'x@y.com', password: 'pw', username: 'u', displayName: 'U', dob: '2000-01-01' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Email already taken');
  });
});

describe('TC5 — signUp: success returns user', () => {
  it('returns { success: true, user } on successful signup', async () => {
    mockGetSupabaseClient.mockReturnValue(makeAuthClient());

    const result = await signUp({ email: 'new@user.com', password: 'secret', username: 'newu', displayName: 'New', dob: '1995-06-15' });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
  });
});

// ── logIn ─────────────────────────────────────────────────────

describe('TC6 — logIn: placeholder mode returns success', () => {
  it('returns { success: true, placeholder: true }', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await logIn({ email: 'a@b.com', password: 'pw' });
    expect(result.success).toBe(true);
    expect(result.placeholder).toBe(true);
  });
});

describe('TC7 — logIn: Supabase error returns failure', () => {
  it('wraps error from signInWithPassword', async () => {
    const client = makeAuthClient({ signInWithPassword: vi.fn().mockRejectedValue(new Error('Invalid credentials')) });
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await logIn({ email: 'a@b.com', password: 'wrong' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid credentials');
  });
});

describe('TC8 — logIn: success returns user', () => {
  it('returns { success: true, user }', async () => {
    mockGetSupabaseClient.mockReturnValue(makeAuthClient());
    const result = await logIn({ email: 'a@b.com', password: 'correct' });
    expect(result.success).toBe(true);
  });
});

// ── oauthLogin ────────────────────────────────────────────────

describe('TC9 — oauthLogin: placeholder mode returns success', () => {
  it('skips OAuth in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await oauthLogin('google');
    expect(result.success).toBe(true);
    expect(result.placeholder).toBe(true);
  });
});

describe('TC10 — oauthLogin: success returns URL', () => {
  it('returns the OAuth redirect URL', async () => {
    mockGetSupabaseClient.mockReturnValue(makeAuthClient());
    const result = await oauthLogin('google');
    expect(result.success).toBe(true);
    expect(result.url).toBe('https://oauth.example.com');
  });
});

// ── logOut ────────────────────────────────────────────────────

describe('TC11 — logOut: placeholder mode returns success', () => {
  it('skips signOut in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await logOut();
    expect(result.success).toBe(true);
  });
});

describe('TC12 — logOut: calls _clearAuthState and _notify(null, null)', () => {
  it('cleans up local state after signing out', async () => {
    mockGetSupabaseClient.mockReturnValue(makeAuthClient());

    await logOut();

    expect(mockClearAuthState).toHaveBeenCalled();
    expect(mockNotify).toHaveBeenCalledWith(null, null);
  });
});

// ── resetPassword ─────────────────────────────────────────────

describe('TC13 — resetPassword: placeholder returns success', () => {
  it('skips reset in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await resetPassword('a@b.com');
    expect(result.success).toBe(true);
    expect(result.placeholder).toBe(true);
  });
});

describe('TC14 — resetPassword: Supabase error returns failure', () => {
  it('wraps error from resetPasswordForEmail', async () => {
    const client = makeAuthClient({ resetPasswordForEmail: vi.fn().mockRejectedValue(new Error('Not found')) });
    mockGetSupabaseClient.mockReturnValue(client);

    const result = await resetPassword('nobody@example.com');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Not found');
  });
});

// ── updatePassword ────────────────────────────────────────────

describe('TC15 — updatePassword: placeholder returns success', () => {
  it('skips update in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const result = await updatePassword('newpass');
    expect(result.success).toBe(true);
  });
});

describe('TC16 — updatePassword: success returns { success: true }', () => {
  it('calls updateUser and returns success', async () => {
    mockGetSupabaseClient.mockReturnValue(makeAuthClient());
    const result = await updatePassword('StrongPass123!');
    expect(result.success).toBe(true);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/auth.ops.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.core.ts', './config.ts', './auth.types.ts'];
    const source = readFileSync(resolve(__dirname, '../src/auth.ops.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
