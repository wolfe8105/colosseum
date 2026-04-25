// ============================================================
// BOUNTIES DOT — tests/bounties-dot.test.ts
// Source: src/bounties.dot.ts
//
// CLASSIFICATION:
//   loadBountyDotSet()  — RPC wrapper + placeholder guard → Contract test
//   userHasBountyDot()  — Pure Set lookup → Unit test
//   bountyDot()         — Pure HTML render → Unit test
//
// IMPORTS:
//   { safeRpc, getIsPlaceholderMode } from './auth.ts'
//
// NOTE: _bountyDotSet is module-level. Tests use loadBountyDotSet to populate it.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

import { loadBountyDotSet, userHasBountyDot, bountyDot } from '../src/bounties.dot.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
});

// ── loadBountyDotSet ──────────────────────────────────────────

describe('TC1 — loadBountyDotSet: calls get_bounty_dot_user_ids RPC', () => {
  it('calls safeRpc with "get_bounty_dot_user_ids"', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await loadBountyDotSet();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_bounty_dot_user_ids');
  });
});

describe('TC2 — loadBountyDotSet: placeholder mode skips RPC', () => {
  it('returns without calling safeRpc in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    await loadBountyDotSet();

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC3 — loadBountyDotSet: populates userHasBountyDot after load', () => {
  it('makes userHasBountyDot return true for loaded user ids', async () => {
    mockSafeRpc.mockResolvedValue({ data: [{ user_id: 'user-bounty-1' }], error: null });

    await loadBountyDotSet();

    expect(userHasBountyDot('user-bounty-1')).toBe(true);
  });
});

// ── userHasBountyDot ──────────────────────────────────────────

describe('TC4 — userHasBountyDot: returns false for null', () => {
  it('returns false when userId is null', () => {
    expect(userHasBountyDot(null)).toBe(false);
  });
});

describe('TC5 — userHasBountyDot: returns false for undefined', () => {
  it('returns false when userId is undefined', () => {
    expect(userHasBountyDot(undefined)).toBe(false);
  });
});

describe('TC6 — userHasBountyDot: returns false for unknown user', () => {
  it('returns false for a user not in the set', () => {
    expect(userHasBountyDot('nonexistent-user')).toBe(false);
  });
});

// ── bountyDot ─────────────────────────────────────────────────

describe('TC7 — bountyDot: returns empty string when user has no bounty', () => {
  it('returns "" for a user not in the bounty dot set', () => {
    expect(bountyDot('no-bounty-user')).toBe('');
  });
});

describe('TC8 — bountyDot: returns HTML when user has bounty', () => {
  it('returns span with bounty-dot class for user in bounty set', async () => {
    mockSafeRpc.mockResolvedValue({ data: [{ user_id: 'bounty-user-99' }], error: null });
    await loadBountyDotSet();

    const html = bountyDot('bounty-user-99');

    expect(html).toContain('bounty-dot');
    expect(html).toContain('🟡');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/bounties.dot.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/bounties.dot.ts'),
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
