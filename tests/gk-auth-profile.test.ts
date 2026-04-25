// ============================================================
// F-54 GATEKEEPER — PRIVATE PROFILE TOGGLE
// Tests updateProfile + getPublicProfile from src/auth.profile.ts
// against the F-54 spec (THE-MODERATOR-FEATURE-SPECS-PENDING.md
// §F-54 + punch list row F-54 ✅ SHIPPED S272).
//
// Spec claims tested:
//   TC1 — updateProfile sends p_is_private: true  to RPC
//   TC2 — updateProfile sends p_is_private: false to RPC
//   TC3 — absent is_private field → p_is_private: null (no clobber)
//   TC4 — getPublicProfile returns null for null data + no error
//           (server-enforced private-profile gate)
//   TC5 — showUserProfile shows "User not found" when profile is private
//   ARCH — import contract matches allowed list
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks (vi.mock factories are hoisted before const declarations) ──

const mockGetSupabaseClient = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockIsUUID = vi.hoisted(() => vi.fn());
const mockNotify = vi.hoisted(() => vi.fn());
const mockClearAuthState = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.core.ts', () => ({
  getSupabaseClient: mockGetSupabaseClient,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
  isUUID: mockIsUUID,
  _notify: mockNotify,
  _clearAuthState: mockClearAuthState,
}));

const mockSafeRpc = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.rpc.ts', () => ({
  safeRpc: mockSafeRpc,
}));

const mockRequireAuth = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.gate.ts', () => ({
  requireAuth: mockRequireAuth,
}));

const mockEscapeHTML = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());
const mockFEATURES = vi.hoisted(() => ({ followsUI: true as boolean }));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
  get FEATURES() { return mockFEATURES; },
}));

const mockVgBadge = vi.hoisted(() => vi.fn());

vi.mock('../src/badge.ts', () => ({
  vgBadge: mockVgBadge,
}));

const mockFollowUser = vi.hoisted(() => vi.fn());
const mockUnfollowUser = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.follows.ts', () => ({
  followUser: mockFollowUser,
  unfollowUser: mockUnfollowUser,
}));

const mockDeclareRival = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.rivals.ts', () => ({
  declareRival: mockDeclareRival,
}));

const mockRenderProfileBountySection = vi.hoisted(() => vi.fn());
const mockBountySlotLimit = vi.hoisted(() => vi.fn());
const mockBountyDot = vi.hoisted(() => vi.fn());
const mockRenderMyBountiesSection = vi.hoisted(() => vi.fn());

vi.mock('../src/bounties.ts', () => ({
  renderProfileBountySection: mockRenderProfileBountySection,
  bountySlotLimit: mockBountySlotLimit,
  bountyDot: mockBountyDot,
  renderMyBountiesSection: mockRenderMyBountiesSection,
}));

// ── Import file under test AFTER all mocks ────────────────────

import { updateProfile, getPublicProfile, showUserProfile } from '../src/auth.profile.ts';

// ── Fixtures ───────────────────────────────────────────────────

const VIEWER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TARGET_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function buildPublicProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: TARGET_ID,
    username: 'gladiator',
    display_name: 'Gladiator',
    avatar_url: null,
    bio: null,
    elo_rating: 1200,
    wins: 5,
    losses: 3,
    current_streak: 2,
    level: 3,
    debates_completed: 8,
    followers: 12,
    following: 8,
    is_following: false,
    subscription_tier: 'free',
    created_at: '2026-01-01T00:00:00.000Z',
    verified_gladiator: false,
    is_private: false,
    ...overrides,
  };
}

function buildViewerProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: VIEWER_ID,
    display_name: 'Viewer',
    username: 'viewer',
    profile_depth_pct: 80,
    token_balance: 500,
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockGetSupabaseClient.mockReset();
  mockGetIsPlaceholderMode.mockReset();
  mockGetCurrentUser.mockReset();
  mockGetCurrentProfile.mockReset();
  mockIsUUID.mockReset();
  mockNotify.mockReset();
  mockClearAuthState.mockReset();
  mockSafeRpc.mockReset();
  mockRequireAuth.mockReset();
  mockEscapeHTML.mockReset();
  mockShowToast.mockReset();
  mockVgBadge.mockReset();
  mockFollowUser.mockReset();
  mockUnfollowUser.mockReset();
  mockDeclareRival.mockReset();
  mockRenderProfileBountySection.mockReset();
  mockBountySlotLimit.mockReset();
  mockBountyDot.mockReset();
  mockRenderMyBountiesSection.mockReset();

  // Sensible defaults
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockIsUUID.mockReturnValue(true);
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockVgBadge.mockReturnValue('');
  mockBountyDot.mockReturnValue('');
  mockBountySlotLimit.mockReturnValue(0);
  mockRequireAuth.mockReturnValue(true);
  mockFEATURES.followsUI = true;

  document.body.innerHTML = '';
});

// ── TC1: Setting profile to private ───────────────────────────

describe('TC1 — F-54: updateProfile with is_private: true sends p_is_private: true to update_profile RPC', () => {
  it('passes p_is_private: true when user flips profile to private', async () => {
    mockGetCurrentProfile.mockReturnValue(buildViewerProfile());
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });
    mockSafeRpc.mockResolvedValue({ error: null });

    await updateProfile({ is_private: true });

    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [fnName, params] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('update_profile');
    expect(params.p_is_private).toBe(true);
  });
});

// ── TC2: Reverting profile to public ──────────────────────────

describe('TC2 — F-54: updateProfile with is_private: false sends p_is_private: false to update_profile RPC', () => {
  it('passes p_is_private: false when user reverts profile to public', async () => {
    mockGetCurrentProfile.mockReturnValue(buildViewerProfile());
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });
    mockSafeRpc.mockResolvedValue({ error: null });

    await updateProfile({ is_private: false });

    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [fnName, params] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('update_profile');
    expect(params.p_is_private).toBe(false);
  });
});

// ── TC3: Absent is_private field → null (no clobber) ──────────

describe('TC3 — F-54: updateProfile without is_private in updates sends p_is_private: null (default public preserved)', () => {
  it('sends p_is_private: null when is_private is absent from the update payload', async () => {
    mockGetCurrentProfile.mockReturnValue(buildViewerProfile());
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });
    mockSafeRpc.mockResolvedValue({ error: null });

    await updateProfile({ display_name: 'New Name' });

    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_is_private).toBeNull();
  });
});

// ── TC4: getPublicProfile returns null for private profile ─────
// Spec: "the profile page is not viewable by other users"
// Server enforces privacy: returns null data with no error.

describe('TC4 — F-54: getPublicProfile returns null when server returns null data with no error (private profile)', () => {
  it('returns null when safeRpc succeeds but returns null data — server-side private-profile gate', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    const result = await getPublicProfile(TARGET_ID);

    expect(result).toBeNull();
    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [fnName, params] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('get_public_profile');
    expect(params.p_user_id).toBe(TARGET_ID);
  });
});

// ── TC5: showUserProfile shows "User not found" for private profile ──
// Spec: "the profile page is not viewable by other users"
// When getPublicProfile returns null (private profile), modal shows error state.

describe('TC5 — F-54: showUserProfile shows "User not found" when profile is private (getPublicProfile returns null)', () => {
  it('displays "User not found" error state when viewing a private profile', async () => {
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });
    mockGetCurrentProfile.mockReturnValue(buildViewerProfile());
    // Server returns null for private profile — no error, just null data
    mockSafeRpc.mockResolvedValue({ data: null, error: null });

    await showUserProfile(TARGET_ID);

    const modal = document.getElementById('user-profile-modal');
    expect(modal).not.toBeNull();
    expect(modal!.innerHTML).toContain('User not found');
  });
});

// ── ARCH: import contract ──────────────────────────────────────

describe('ARCH — src/auth.profile.ts only imports from the allowed dependency list', () => {
  it('has no imports outside the allowed modules (Step 2 contract)', () => {
    const allowed = [
      './auth.core.ts',
      './auth.rpc.ts',
      './auth.gate.ts',
      './config.ts',
      './badge.ts',
      './auth.follows.ts',
      './auth.rivals.ts',
      './auth.types.ts',
      './bounties.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/auth.profile.ts'),
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
