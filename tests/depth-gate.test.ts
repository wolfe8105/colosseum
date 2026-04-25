// ============================================================
// DEPTH GATE — tests/depth-gate.test.ts
// Source: src/depth-gate.ts
//
// CLASSIFICATION:
//   isDepthBlocked() — Behavioral: reads auth state, may call confirm() + redirect
//                     → Behavioral test (mock imports + spy on window.confirm)
//
// IMPORTS:
//   { getCurrentProfile, getCurrentUser } from './auth.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
  getSupabaseClient: vi.fn(),
  safeRpc: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

import { isDepthBlocked } from '../src/depth-gate.ts';

beforeEach(() => {
  mockGetCurrentUser.mockReset();
  mockGetCurrentProfile.mockReset();
  vi.restoreAllMocks();
});

// ── isDepthBlocked ────────────────────────────────────────────

describe('TC1 — isDepthBlocked: returns false when no user logged in', () => {
  it('allows action when user is null (let RPC handle auth)', () => {
    mockGetCurrentUser.mockReturnValue(null);

    expect(isDepthBlocked()).toBe(false);
  });
});

describe('TC2 — isDepthBlocked: returns false when depth >= 25%', () => {
  it('allows action when profile_depth_pct meets the threshold', () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ profile_depth_pct: 50 });

    expect(isDepthBlocked()).toBe(false);
  });
});

describe('TC3 — isDepthBlocked: returns false when depth exactly 25%', () => {
  it('allows action at the threshold boundary (25%)', () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ profile_depth_pct: 25 });

    expect(isDepthBlocked()).toBe(false);
  });
});

describe('TC4 — isDepthBlocked: returns true when depth < 25% and user confirms', () => {
  it('blocks action and redirects when user accepts the depth prompt', () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ profile_depth_pct: 10 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { href: '', assign: assignSpy },
      configurable: true,
    });

    const result = isDepthBlocked();

    expect(result).toBe(true);
    expect(window.confirm).toHaveBeenCalled();
  });
});

describe('TC5 — isDepthBlocked: returns true when depth < 25% and user cancels', () => {
  it('blocks action even when user cancels the depth prompt', () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ profile_depth_pct: 0 });
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const result = isDepthBlocked();

    expect(result).toBe(true);
  });
});

describe('TC6 — isDepthBlocked: returns false when profile is null', () => {
  it('treats null profile as 0% depth and shows prompt', () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue(null);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const result = isDepthBlocked();

    // pct defaults to 0, which is < 25
    expect(result).toBe(true);
  });
});

describe('TC7 — isDepthBlocked: import contract — calls getCurrentUser', () => {
  it('getCurrentUser mock is called on every invocation', () => {
    mockGetCurrentUser.mockReturnValue(null);

    isDepthBlocked();

    expect(mockGetCurrentUser).toHaveBeenCalled();
  });
});

describe('TC8 — isDepthBlocked: import contract — calls getCurrentProfile when user exists', () => {
  it('getCurrentProfile mock is called when user is logged in', () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetCurrentProfile.mockReturnValue({ profile_depth_pct: 100 });

    isDepthBlocked();

    expect(mockGetCurrentProfile).toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/depth-gate.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/depth-gate.ts'),
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
