// ============================================================
// AUTH CORE — tests/auth-core.test.ts
// Source: src/auth.core.ts
//
// CLASSIFICATION:
//   isUUID()           — Pure calculation → Pure test
//   onChange()/_notify() — Observer pattern → Behavioral test
//   Getters            — State accessors → Pure test
//   _clearAuthState()  — State mutation → Behavioral test
//
// STRATEGY:
//   Mock config with placeholderMode.supabase=true so init() takes the
//   placeholder path — avoids real Supabase createClient call.
//
// IMPORTS:
//   { createClient }   from '@supabase/supabase-js'
//   { UUID_RE, SUPABASE_URL, SUPABASE_ANON_KEY, placeholderMode } from './config.ts'
//   type { Profile, AuthListener } from './auth.types.ts'
// ============================================================

import { describe, it, expect, vi } from 'vitest';

// Mock config BEFORE importing auth.core so init() uses placeholder mode
vi.mock('../src/config.ts', () => ({
  UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  placeholderMode: { supabase: true }, // forces placeholder path — no real createClient
  escapeHTML: (s: string) => s,
  showToast: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

import {
  isUUID,
  getCurrentUser,
  getCurrentProfile,
  getIsPlaceholderMode,
  _clearAuthState,
  _setCurrentUser,
  _setCurrentProfile,
  _notify,
  onChange,
} from '../src/auth.core.ts';

// ── TC1: isUUID — valid UUID returns true ─────────────────────

describe('TC1 — isUUID: returns true for valid UUID v4', () => {
  it('returns true for a well-formed UUID', () => {
    expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });
});

// ── TC2: isUUID — non-UUID strings return false ───────────────

describe('TC2 — isUUID: returns false for non-UUID strings', () => {
  it('returns false for plain string', () => {
    expect(isUUID('not-a-uuid')).toBe(false);
  });
  it('returns false for empty string', () => {
    expect(isUUID('')).toBe(false);
  });
  it('returns false for number', () => {
    expect(isUUID(123)).toBe(false);
  });
  it('returns false for null', () => {
    expect(isUUID(null)).toBe(false);
  });
});

// ── TC3: placeholder mode — getCurrentUser returns placeholder ─

describe('TC3 — placeholder mode: getCurrentUser returns placeholder user', () => {
  it('returns a user with id "placeholder-user"', () => {
    const user = getCurrentUser();
    expect(user?.id).toBe('placeholder-user');
  });
});

// ── TC4: placeholder mode — getCurrentProfile returns placeholder ─

describe('TC4 — placeholder mode: getCurrentProfile returns placeholder profile', () => {
  it('returns profile with username "gladiator"', () => {
    const profile = getCurrentProfile();
    expect(profile?.username).toBe('gladiator');
  });
});

// ── TC5: getIsPlaceholderMode — returns true in placeholder mode ─

describe('TC5 — getIsPlaceholderMode: returns true when in placeholder mode', () => {
  it('returns true', () => {
    expect(getIsPlaceholderMode()).toBe(true);
  });
});

// ── TC6: _clearAuthState — clears user and profile ───────────

describe('TC6 — _clearAuthState: nulls out currentUser and currentProfile', () => {
  it('returns null from getCurrentUser and getCurrentProfile after clear', () => {
    _clearAuthState();
    expect(getCurrentUser()).toBeNull();
    expect(getCurrentProfile()).toBeNull();
  });
});

// ── TC7: _setCurrentUser / _setCurrentProfile — setters work ─

describe('TC7 — _setCurrentUser/_setCurrentProfile: update getters', () => {
  it('sets and retrieves currentUser', () => {
    _setCurrentUser({ id: 'test-user-1' } as never);
    expect(getCurrentUser()?.id).toBe('test-user-1');
  });

  it('sets and retrieves currentProfile', () => {
    _setCurrentProfile({ username: 'tester' } as never);
    expect(getCurrentProfile()?.username).toBe('tester');
  });
});

// ── TC8: onChange — listener fires immediately if user exists ─

describe('TC8 — onChange: fires listener immediately when a user is set', () => {
  it('calls listener synchronously when currentUser is non-null', () => {
    _setCurrentUser({ id: 'some-user' } as never);
    const fn = vi.fn();
    onChange(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ── TC9: _notify — calls all registered listeners ────────────

describe('TC9 — _notify: calls all onChange listeners with user and profile', () => {
  it('passes user and profile to each registered listener', () => {
    const fn = vi.fn();
    onChange(fn);
    const prevCount = fn.mock.calls.length;
    _notify({ id: 'u1' } as never, { username: 'bob' } as never);
    expect(fn.mock.calls.length).toBeGreaterThan(prevCount);
    const lastCall = fn.mock.calls[fn.mock.calls.length - 1];
    expect(lastCall[0]?.id).toBe('u1');
    expect(lastCall[1]?.username).toBe('bob');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/auth.core.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '@supabase/supabase-js',
      './config.ts',
      './auth.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/auth.core.ts'),
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
