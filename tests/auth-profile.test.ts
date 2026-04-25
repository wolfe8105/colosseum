import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

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
const mockFEATURES = vi.hoisted(() => ({ followsUI: true as boolean }));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
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

import { updateProfile, deleteAccount, getPublicProfile, showUserProfile } from '../src/auth.profile.ts';

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

// ── updateProfile ──────────────────────────────────────────────

describe('TC1 — updateProfile placeholder mode returns success + notifies', () => {
  it('fast-paths in placeholder mode, assigns updates, calls _notify', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const profile = buildViewerProfile();
    const user = { id: VIEWER_ID };
    mockGetCurrentProfile.mockReturnValue(profile);
    mockGetCurrentUser.mockReturnValue(user);

    const result = await updateProfile({ display_name: 'New Name' });

    expect(result.success).toBe(true);
    expect(mockNotify).toHaveBeenCalledWith(user, profile);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC2 — updateProfile normal mode calls safeRpc with correct name', () => {
  it("calls safeRpc('update_profile', ...)", async () => {
    mockGetCurrentProfile.mockReturnValue(buildViewerProfile());
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });
    mockSafeRpc.mockResolvedValue({ error: null });

    await updateProfile({ display_name: 'Changed' });

    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('update_profile');
  });
});

describe('TC3 — updateProfile sends all 6 named params', () => {
  it('params object contains all 6 p_* keys', async () => {
    mockGetCurrentProfile.mockReturnValue(buildViewerProfile());
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });
    mockSafeRpc.mockResolvedValue({ error: null });

    await updateProfile({ display_name: 'X', avatar_url: null, bio: 'bio', username: 'u', preferred_language: 'en', is_private: false });

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(Object.keys(params)).toEqual(expect.arrayContaining([
      'p_display_name', 'p_avatar_url', 'p_bio', 'p_username', 'p_preferred_language', 'p_is_private',
    ]));
  });
});

describe('TC4 — updateProfile RPC error returns failure', () => {
  it('returns { success: false, error } when safeRpc returns an error', async () => {
    mockGetCurrentProfile.mockReturnValue(buildViewerProfile());
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });
    mockSafeRpc.mockResolvedValue({ error: { message: 'update failed' } });

    const result = await updateProfile({ display_name: 'X' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('update failed');
  });
});

// ── deleteAccount ──────────────────────────────────────────────

describe('TC5 — deleteAccount placeholder mode returns success immediately', () => {
  it('skips RPC in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await deleteAccount();

    expect(result.success).toBe(true);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC6 — deleteAccount normal mode calls safeRpc + clears state', () => {
  it('calls soft_delete_account, _clearAuthState, and _notify(null, null)', async () => {
    const mockSignOut = vi.fn().mockResolvedValue({});
    mockGetSupabaseClient.mockReturnValue({ auth: { signOut: mockSignOut } });
    mockSafeRpc.mockResolvedValue({ error: null });

    const result = await deleteAccount();

    expect(result.success).toBe(true);
    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('soft_delete_account');
    expect(mockClearAuthState).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(null, null);
  });
});

describe('TC7 — deleteAccount RPC error returns failure', () => {
  it('returns { success: false, error } when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ error: { message: 'delete failed' } });

    const result = await deleteAccount();

    expect(result.success).toBe(false);
    expect(result.error).toContain('delete failed');
  });
});

// ── getPublicProfile ───────────────────────────────────────────

describe('TC8 — getPublicProfile invalid UUID returns null', () => {
  it('returns null without calling safeRpc when isUUID is false', async () => {
    mockIsUUID.mockReturnValue(false);

    const result = await getPublicProfile('not-a-uuid');

    expect(result).toBeNull();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC9 — getPublicProfile placeholder mode returns stub profile', () => {
  it('returns a non-null placeholder profile without calling safeRpc', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const result = await getPublicProfile(TARGET_ID);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(TARGET_ID);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC10 — getPublicProfile calls safeRpc with correct name and param', () => {
  it("calls safeRpc('get_public_profile', { p_user_id })", async () => {
    mockSafeRpc.mockResolvedValue({ data: buildPublicProfile(), error: null });

    await getPublicProfile(TARGET_ID);

    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [fnName, params] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('get_public_profile');
    expect(params.p_user_id).toBe(TARGET_ID);
  });
});

describe('TC11 — getPublicProfile RPC error returns null', () => {
  it('returns null when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const result = await getPublicProfile(TARGET_ID);

    expect(result).toBeNull();
  });
});

// ── showUserProfile ────────────────────────────────────────────

describe('TC12 — showUserProfile invalid UUID does not append modal', () => {
  it('returns early when isUUID is false', async () => {
    mockIsUUID.mockReturnValue(false);
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });

    await showUserProfile('bad-id');

    expect(document.getElementById('user-profile-modal')).toBeNull();
  });
});

describe('TC13 — showUserProfile own userId does not append modal', () => {
  it('returns early when userId matches currentUser.id', async () => {
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });

    await showUserProfile(VIEWER_ID);

    expect(document.getElementById('user-profile-modal')).toBeNull();
  });
});

describe('TC14 — showUserProfile appends modal to body', () => {
  it('modal element is in the DOM after a successful profile load', async () => {
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });
    mockGetCurrentProfile.mockReturnValue(buildViewerProfile());
    mockSafeRpc.mockResolvedValue({ data: buildPublicProfile(), error: null });

    await showUserProfile(TARGET_ID);

    expect(document.getElementById('user-profile-modal')).not.toBeNull();
  });
});

describe('TC15 — showUserProfile null profile shows error text', () => {
  it('displays "User not found" when getPublicProfile returns null', async () => {
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });
    mockGetCurrentProfile.mockReturnValue(buildViewerProfile());
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'gone' } });

    await showUserProfile(TARGET_ID);

    const modal = document.getElementById('user-profile-modal');
    expect(modal?.innerHTML).toContain('User not found');
  });
});

describe('TC16 — showUserProfile close button removes modal', () => {
  it('clicking upm-close-btn removes the modal from DOM', async () => {
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });
    mockGetCurrentProfile.mockReturnValue(buildViewerProfile());
    mockSafeRpc.mockResolvedValue({ data: buildPublicProfile(), error: null });

    await showUserProfile(TARGET_ID);

    const closeBtn = document.getElementById('upm-close-btn') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();

    expect(document.getElementById('user-profile-modal')).toBeNull();
  });
});

describe('TC17 — showUserProfile follow button calls followUser', () => {
  it('clicking upm-follow-btn (not following) calls followUser with userId', async () => {
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });
    mockGetCurrentProfile.mockReturnValue(buildViewerProfile());
    mockSafeRpc.mockResolvedValue({ data: buildPublicProfile({ is_following: false }), error: null });
    mockFollowUser.mockResolvedValue({ success: true });

    await showUserProfile(TARGET_ID);

    const followBtn = document.getElementById('upm-follow-btn') as HTMLButtonElement;
    expect(followBtn).not.toBeNull();
    followBtn.click();

    await vi.waitFor(() => expect(mockFollowUser).toHaveBeenCalledWith(TARGET_ID));
  });
});

describe('TC18 — showUserProfile rival button calls declareRival', () => {
  it('clicking upm-rival-btn calls declareRival with userId', async () => {
    mockGetCurrentUser.mockReturnValue({ id: VIEWER_ID });
    mockGetCurrentProfile.mockReturnValue(buildViewerProfile());
    mockSafeRpc.mockResolvedValue({ data: buildPublicProfile(), error: null });
    mockDeclareRival.mockResolvedValue({ success: true });

    await showUserProfile(TARGET_ID);

    const rivalBtn = document.getElementById('upm-rival-btn') as HTMLButtonElement;
    expect(rivalBtn).not.toBeNull();
    rivalBtn.click();

    await vi.waitFor(() => expect(mockDeclareRival).toHaveBeenCalledWith(TARGET_ID));
  });
});

// ── ARCH — import structure ────────────────────────────────────

describe('ARCH — auth.profile.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
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
