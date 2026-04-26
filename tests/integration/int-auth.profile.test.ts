/**
 * Integration tests — Seam #358
 * src/auth.profile.ts → src/badge.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Supabase mock (only mock) ─────────────────────────────────────────────────
const mockRpc = vi.fn();
vi.mock('@supabase/supabase-js', () => {
  const mockClient = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    rpc: mockRpc,
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
  return {
    createClient: vi.fn(() => mockClient),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const VALID_UUID = '00000000-0000-0000-0000-000000000042';
const VIEWER_UUID = '00000000-0000-0000-0000-000000000001';

function makePublicProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    username: 'targetuser',
    display_name: 'Target User',
    avatar_url: null,
    bio: null,
    elo_rating: 1400,
    wins: 10,
    losses: 4,
    current_streak: 3,
    level: 5,
    debates_completed: 14,
    followers: 20,
    following: 10,
    is_following: false,
    subscription_tier: 'contender',
    created_at: new Date().toISOString(),
    verified_gladiator: false,
    ...overrides,
  };
}

describe('Seam #358 — auth.profile.ts → badge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    document.body.innerHTML = '';
  });

  afterEach(async () => {
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  // TC-358-05: ARCH filter — imports include badge.ts, no wall modules
  it('TC-358-05: ARCH — imports badge.ts and no wall modules', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(__dirname, '../../src/auth.profile.ts');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const importLines = raw.split('\n').filter(l => /from\s+['"]/.test(l));
    const joined = importLines.join('\n');

    expect(joined).toContain('badge');

    const wallPatterns = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const w of wallPatterns) {
      expect(joined).not.toContain(w);
    }
  });

  // TC-358-01: showUserProfile with verified_gladiator: true → modal has vg-badge
  it('TC-358-01: showUserProfile — verified user → modal contains vg-badge span', async () => {
    const profile = makePublicProfile({ verified_gladiator: true });

    // get_public_profile returns verified profile; bounty RPCs return empty
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_public_profile') return Promise.resolve({ data: profile, error: null });
      return Promise.resolve({ data: [], error: null });
    });

    const { showUserProfile } = await import('../../src/auth.profile.ts');
    const promise = showUserProfile(VALID_UUID);
    await vi.runAllTimersAsync();
    await promise;

    const modal = document.getElementById('user-profile-modal');
    expect(modal).not.toBeNull();
    expect(modal!.innerHTML).toContain('vg-badge');
    expect(modal!.innerHTML).toContain('🎖️');

    // Verify RPC was called with correct param
    const calls = mockRpc.mock.calls;
    const gpCall = calls.find(([fn]) => fn === 'get_public_profile');
    expect(gpCall).toBeDefined();
    expect(gpCall![1]).toMatchObject({ p_user_id: VALID_UUID });
  });

  // TC-358-02: showUserProfile with verified_gladiator: false → modal has NO vg-badge
  it('TC-358-02: showUserProfile — unverified user → modal has no vg-badge', async () => {
    const profile = makePublicProfile({ verified_gladiator: false });

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_public_profile') return Promise.resolve({ data: profile, error: null });
      return Promise.resolve({ data: [], error: null });
    });

    const { showUserProfile } = await import('../../src/auth.profile.ts');
    const promise = showUserProfile(VALID_UUID);
    await vi.runAllTimersAsync();
    await promise;

    const modal = document.getElementById('user-profile-modal');
    expect(modal).not.toBeNull();
    expect(modal!.innerHTML).not.toContain('vg-badge');

    // RPC still called
    const gpCall = mockRpc.mock.calls.find(([fn]) => fn === 'get_public_profile');
    expect(gpCall).toBeDefined();
  });

  // TC-358-03: updateProfile → calls update_profile RPC with correct params
  it('TC-358-03: updateProfile — calls update_profile RPC with p_display_name', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { updateProfile } = await import('../../src/auth.profile.ts');
    const result = await updateProfile({ display_name: 'NewName' });

    expect(result.success).toBe(true);

    const upCall = mockRpc.mock.calls.find(([fn]) => fn === 'update_profile');
    expect(upCall).toBeDefined();
    expect(upCall![1]).toMatchObject({ p_display_name: 'NewName' });
  });

  // TC-358-04: deleteAccount → calls soft_delete_account RPC
  it('TC-358-04: deleteAccount — calls soft_delete_account RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { deleteAccount } = await import('../../src/auth.profile.ts');
    const result = await deleteAccount();

    expect(result.success).toBe(true);

    const delCall = mockRpc.mock.calls.find(([fn]) => fn === 'soft_delete_account');
    expect(delCall).toBeDefined();
  });

  // TC-358-06: showUserProfile with invalid UUID → returns early, no modal, no RPC
  it('TC-358-06: showUserProfile — invalid UUID → no modal appended, no RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { showUserProfile } = await import('../../src/auth.profile.ts');
    await showUserProfile('not-a-uuid');

    expect(document.getElementById('user-profile-modal')).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seam #403 — auth.profile.ts → auth.rivals (declareRival)
// ─────────────────────────────────────────────────────────────────────────────
describe('Seam #403 — auth.profile.ts → auth.rivals', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    document.body.innerHTML = '';
  });

  afterEach(async () => {
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  // TC-403-01: ARCH — imports auth.rivals.ts, no wall modules
  it('TC-403-01: ARCH — imports auth.rivals.ts and no wall modules', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(__dirname, '../../src/auth.profile.ts');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const importLines = raw.split('\n').filter(l => /from\s+['"]/.test(l));
    const joined = importLines.join('\n');

    expect(joined).toContain('auth.rivals');

    const wallPatterns = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const w of wallPatterns) {
      expect(joined).not.toContain(w);
    }
  });

  // TC-403-02: Rival button click → declare_rival RPC called with p_target_id
  it('TC-403-02: rival btn click → declare_rival RPC with p_target_id', async () => {
    const profile = {
      id: VALID_UUID, username: 'rival', display_name: 'Rival',
      avatar_url: null, bio: null, elo_rating: 1200, wins: 3, losses: 2,
      current_streak: 1, level: 2, debates_completed: 5,
      followers: 5, following: 3, is_following: false,
      subscription_tier: 'free', created_at: new Date().toISOString(),
      verified_gladiator: false,
    };

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_public_profile') return Promise.resolve({ data: profile, error: null });
      if (fnName === 'declare_rival') return Promise.resolve({ data: { success: true }, error: null });
      return Promise.resolve({ data: [], error: null });
    });

    // Patch auth.core to return a logged-in user so requireAuth passes
    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getCurrentUser: () => ({ id: VIEWER_UUID }),
        getIsPlaceholderMode: () => false,
      };
    });

    const { showUserProfile } = await import('../../src/auth.profile.ts');
    const promise = showUserProfile(VALID_UUID);
    await vi.runAllTimersAsync();
    await promise;

    const rivalBtn = document.getElementById('upm-rival-btn') as HTMLButtonElement;
    expect(rivalBtn).not.toBeNull();
    rivalBtn.click();
    await vi.runAllTimersAsync();

    const rivalCall = mockRpc.mock.calls.find(([fn]) => fn === 'declare_rival');
    expect(rivalCall).toBeDefined();
    expect(rivalCall![1]).toMatchObject({ p_target_id: VALID_UUID });
  });

  // TC-403-03: declare_rival success → rival button shows SENT and is disabled
  it('TC-403-03: declare_rival success → btn text "⚔️ SENT" + disabled', async () => {
    const profile = {
      id: VALID_UUID, username: 'rival2', display_name: 'Rival2',
      avatar_url: null, bio: null, elo_rating: 1200, wins: 1, losses: 1,
      current_streak: 0, level: 1, debates_completed: 2,
      followers: 0, following: 0, is_following: false,
      subscription_tier: 'free', created_at: new Date().toISOString(),
      verified_gladiator: false,
    };

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_public_profile') return Promise.resolve({ data: profile, error: null });
      if (fnName === 'declare_rival') return Promise.resolve({ data: { success: true }, error: null });
      return Promise.resolve({ data: [], error: null });
    });

    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getCurrentUser: () => ({ id: VIEWER_UUID }),
        getIsPlaceholderMode: () => false,
      };
    });

    const { showUserProfile } = await import('../../src/auth.profile.ts');
    const promise = showUserProfile(VALID_UUID);
    await vi.runAllTimersAsync();
    await promise;

    const rivalBtn = document.getElementById('upm-rival-btn') as HTMLButtonElement;
    expect(rivalBtn).not.toBeNull();
    rivalBtn.click();
    await vi.runAllTimersAsync();

    expect(rivalBtn.textContent).toBe('⚔️ SENT');
    expect(rivalBtn.disabled).toBe(true);
  });

  // TC-403-04: declare_rival failure → rival button reverts to RIVAL after timeout
  it('TC-403-04: declare_rival failure → btn reverts to "⚔️ RIVAL" after 2000ms', async () => {
    const profile = {
      id: VALID_UUID, username: 'rival3', display_name: 'Rival3',
      avatar_url: null, bio: null, elo_rating: 1200, wins: 0, losses: 0,
      current_streak: 0, level: 1, debates_completed: 0,
      followers: 0, following: 0, is_following: false,
      subscription_tier: 'free', created_at: new Date().toISOString(),
      verified_gladiator: false,
    };

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_public_profile') return Promise.resolve({ data: profile, error: null });
      if (fnName === 'declare_rival') return Promise.resolve({ data: { success: false, error: 'Already rivals' }, error: null });
      return Promise.resolve({ data: [], error: null });
    });

    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getCurrentUser: () => ({ id: VIEWER_UUID }),
        getIsPlaceholderMode: () => false,
      };
    });

    const { showUserProfile } = await import('../../src/auth.profile.ts');
    const promise = showUserProfile(VALID_UUID);
    await vi.runAllTimersAsync();
    await promise;

    const rivalBtn = document.getElementById('upm-rival-btn') as HTMLButtonElement;
    expect(rivalBtn).not.toBeNull();
    rivalBtn.click();
    await vi.runAllTimersAsync();

    // After failure + timeout, text should revert
    expect(rivalBtn.textContent).toBe('⚔️ RIVAL');
  });

  // TC-403-05: declareRival called with invalid UUID → no RPC, returns error
  it('TC-403-05: declareRival with invalid UUID → { success: false } no RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { declareRival } = await import('../../src/auth.rivals.ts');
    const result = await declareRival('not-a-uuid');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seam #404 — auth.profile.ts → auth.gate (requireAuth)
// ─────────────────────────────────────────────────────────────────────────────
describe('Seam #404 — auth.profile.ts → auth.gate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    document.body.innerHTML = '';
  });

  afterEach(async () => {
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  // TC-404-01: ARCH — imports auth.gate.ts, no wall modules
  it('TC-404-01: ARCH — imports auth.gate.ts and no wall modules', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(__dirname, '../../src/auth.profile.ts');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const importLines = raw.split('\n').filter(l => /from\s+['"]/.test(l));
    const joined = importLines.join('\n');

    expect(joined).toContain('auth.gate');

    const wallPatterns = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const w of wallPatterns) {
      expect(joined).not.toContain(w);
    }
  });

  // TC-404-02: Unauthenticated follow click → auth-gate-modal appears, no RPC
  it('TC-404-02: unauthenticated follow click → auth-gate-modal shown, no follow RPC', async () => {
    const profile = {
      id: VALID_UUID, username: 'gatetest', display_name: 'Gate Test',
      avatar_url: null, bio: null, elo_rating: 1200, wins: 0, losses: 0,
      current_streak: 0, level: 1, debates_completed: 0,
      followers: 0, following: 0, is_following: false,
      subscription_tier: 'free', created_at: new Date().toISOString(),
      verified_gladiator: false,
    };

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_public_profile') return Promise.resolve({ data: profile, error: null });
      return Promise.resolve({ data: [], error: null });
    });

    // No logged-in user → requireAuth returns false
    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getCurrentUser: () => null,
        getIsPlaceholderMode: () => false,
      };
    });

    const { showUserProfile } = await import('../../src/auth.profile.ts');
    const promise = showUserProfile(VALID_UUID);
    await vi.runAllTimersAsync();
    await promise;

    const followBtn = document.getElementById('upm-follow-btn') as HTMLButtonElement;
    expect(followBtn).not.toBeNull();
    followBtn.click();
    await vi.runAllTimersAsync();

    expect(document.getElementById('auth-gate-modal')).not.toBeNull();
    // No follow/unfollow RPC should have been called
    const followRpcCall = mockRpc.mock.calls.find(([fn]) => fn === 'follow_user' || fn === 'unfollow_user');
    expect(followRpcCall).toBeUndefined();
  });

  // TC-404-03: Unauthenticated rival click → auth-gate-modal shown, no declare_rival RPC
  it('TC-404-03: unauthenticated rival click → auth-gate-modal shown, no declare_rival RPC', async () => {
    const profile = {
      id: VALID_UUID, username: 'gatetest2', display_name: 'Gate Test 2',
      avatar_url: null, bio: null, elo_rating: 1200, wins: 0, losses: 0,
      current_streak: 0, level: 1, debates_completed: 0,
      followers: 0, following: 0, is_following: false,
      subscription_tier: 'free', created_at: new Date().toISOString(),
      verified_gladiator: false,
    };

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_public_profile') return Promise.resolve({ data: profile, error: null });
      return Promise.resolve({ data: [], error: null });
    });

    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getCurrentUser: () => null,
        getIsPlaceholderMode: () => false,
      };
    });

    const { showUserProfile } = await import('../../src/auth.profile.ts');
    const promise = showUserProfile(VALID_UUID);
    await vi.runAllTimersAsync();
    await promise;

    const rivalBtn = document.getElementById('upm-rival-btn') as HTMLButtonElement;
    expect(rivalBtn).not.toBeNull();
    rivalBtn.click();
    await vi.runAllTimersAsync();

    expect(document.getElementById('auth-gate-modal')).not.toBeNull();
    const rivalRpcCall = mockRpc.mock.calls.find(([fn]) => fn === 'declare_rival');
    expect(rivalRpcCall).toBeUndefined();
  });

  // TC-404-04: Unauthenticated block click → auth-gate-modal shown, no block_user RPC
  it('TC-404-04: unauthenticated block click → auth-gate-modal shown, no block_user RPC', async () => {
    const profile = {
      id: VALID_UUID, username: 'gatetest3', display_name: 'Gate Test 3',
      avatar_url: null, bio: null, elo_rating: 1200, wins: 0, losses: 0,
      current_streak: 0, level: 1, debates_completed: 0,
      followers: 0, following: 0, is_following: false,
      subscription_tier: 'free', created_at: new Date().toISOString(),
      verified_gladiator: false,
    };

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'get_public_profile') return Promise.resolve({ data: profile, error: null });
      return Promise.resolve({ data: [], error: null });
    });

    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getCurrentUser: () => null,
        getIsPlaceholderMode: () => false,
      };
    });

    const { showUserProfile } = await import('../../src/auth.profile.ts');
    const promise = showUserProfile(VALID_UUID);
    await vi.runAllTimersAsync();
    await promise;

    const blockBtn = document.getElementById('upm-block-btn') as HTMLButtonElement;
    expect(blockBtn).not.toBeNull();
    blockBtn.click();
    await vi.runAllTimersAsync();

    expect(document.getElementById('auth-gate-modal')).not.toBeNull();
    const blockRpcCall = mockRpc.mock.calls.find(([fn]) => fn === 'block_user');
    expect(blockRpcCall).toBeUndefined();
  });

  // TC-404-05: requireAuth shows modal with actionLabel in text
  it('TC-404-05: requireAuth — auth-gate-modal contains actionLabel text', async () => {
    // Reset modules so auth.core returns no user
    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getCurrentUser: () => null,
        getIsPlaceholderMode: () => false,
      };
    });

    const { requireAuth } = await import('../../src/auth.gate.ts');
    const result = requireAuth('challenge opponents');

    expect(result).toBe(false);
    const modal = document.getElementById('auth-gate-modal');
    expect(modal).not.toBeNull();
    expect(modal!.innerHTML).toContain('challenge opponents');
  });

  // TC-404-06: requireAuth close button removes modal from DOM
  it('TC-404-06: requireAuth — close button removes auth-gate-modal', async () => {
    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getCurrentUser: () => null,
        getIsPlaceholderMode: () => false,
      };
    });

    const { requireAuth } = await import('../../src/auth.gate.ts');
    requireAuth('test action');

    const closeBtn = document.getElementById('auth-gate-close-btn') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();

    expect(document.getElementById('auth-gate-modal')).toBeNull();
  });

  // TC-404-07: requireAuth returns true when user is logged in (no modal shown)
  it('TC-404-07: requireAuth — authenticated user → returns true, no modal', async () => {
    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getCurrentUser: () => ({ id: VIEWER_UUID }),
        getIsPlaceholderMode: () => false,
      };
    });

    const { requireAuth } = await import('../../src/auth.gate.ts');
    const result = requireAuth('do something');

    expect(result).toBe(true);
    expect(document.getElementById('auth-gate-modal')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seam #405 — src/auth.profile.ts → auth.follows
// TCs: followUser / unfollowUser called from the profile modal follow button
// ─────────────────────────────────────────────────────────────────────────────

describe('Seam #405 — auth.profile.ts → auth.follows', () => {
  // ARCH filter: confirm seam imports
  it('ARCH: auth.profile.ts imports followUser and unfollowUser from auth.follows', async () => {
    const src = await import('../../src/auth.profile.ts?raw');
    const imports = src.default.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const followsImport = imports.find((l: string) => l.includes('auth.follows'));
    expect(followsImport).toBeTruthy();
    expect(followsImport).toContain('followUser');
    expect(followsImport).toContain('unfollowUser');
  });

  // TC-405-01: followUser with valid UUID calls follow_user RPC and returns success
  it('TC-405-01: followUser — valid UUID → calls follow_user RPC → success', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockResolvedValue({ data: null, error: null });

    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getIsPlaceholderMode: () => false,
        isUUID: (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
      };
    });

    vi.doMock('../../src/auth.rpc.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));

    const { followUser } = await import('../../src/auth.follows.ts');
    const result = await followUser(VALID_UUID);

    expect(result.success).toBe(true);

    const { safeRpc } = await import('../../src/auth.rpc.ts');
    expect(safeRpc).toHaveBeenCalledWith('follow_user', { p_target_user_id: VALID_UUID });

    vi.useRealTimers();
  });

  // TC-405-02: followUser with invalid UUID short-circuits, no RPC
  it('TC-405-02: followUser — invalid UUID → returns error, no RPC call', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSafeRpc = vi.fn();

    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getIsPlaceholderMode: () => false,
        isUUID: (_id: string) => false,
      };
    });

    vi.doMock('../../src/auth.rpc.ts', () => ({
      safeRpc: mockSafeRpc,
    }));

    const { followUser } = await import('../../src/auth.follows.ts');
    const result = await followUser('not-a-uuid');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid user ID');
    expect(mockSafeRpc).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  // TC-405-03: unfollowUser with valid UUID calls unfollow_user RPC and returns success
  it('TC-405-03: unfollowUser — valid UUID → calls unfollow_user RPC → success', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getIsPlaceholderMode: () => false,
        isUUID: (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
      };
    });

    vi.doMock('../../src/auth.rpc.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));

    const { unfollowUser } = await import('../../src/auth.follows.ts');
    const result = await unfollowUser(VALID_UUID);

    expect(result.success).toBe(true);

    const { safeRpc } = await import('../../src/auth.rpc.ts');
    expect(safeRpc).toHaveBeenCalledWith('unfollow_user', { p_target_user_id: VALID_UUID });

    vi.useRealTimers();
  });

  // TC-405-04: unfollowUser with invalid UUID short-circuits, no RPC
  it('TC-405-04: unfollowUser — invalid UUID → returns error, no RPC call', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSafeRpc = vi.fn();

    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getIsPlaceholderMode: () => false,
        isUUID: (_id: string) => false,
      };
    });

    vi.doMock('../../src/auth.rpc.ts', () => ({
      safeRpc: mockSafeRpc,
    }));

    const { unfollowUser } = await import('../../src/auth.follows.ts');
    const result = await unfollowUser('bad-id');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid user ID');
    expect(mockSafeRpc).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  // TC-405-05: followUser in placeholder mode returns success without RPC
  it('TC-405-05: followUser — placeholder mode → success, no RPC', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSafeRpc = vi.fn();

    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getIsPlaceholderMode: () => true,
        isUUID: (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
      };
    });

    vi.doMock('../../src/auth.rpc.ts', () => ({
      safeRpc: mockSafeRpc,
    }));

    const { followUser } = await import('../../src/auth.follows.ts');
    const result = await followUser(VALID_UUID);

    expect(result.success).toBe(true);
    expect(mockSafeRpc).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  // TC-405-06: followUser propagates RPC error as failure
  it('TC-405-06: followUser — RPC error → returns { success: false, error }', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getIsPlaceholderMode: () => false,
        isUUID: (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
      };
    });

    vi.doMock('../../src/auth.rpc.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: new Error('follow RPC failed') }),
    }));

    const { followUser } = await import('../../src/auth.follows.ts');
    const result = await followUser(VALID_UUID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('follow RPC failed');

    vi.useRealTimers();
  });

  // TC-405-07: unfollowUser propagates RPC error as failure
  it('TC-405-07: unfollowUser — RPC error → returns { success: false, error }', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/auth.core.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.core.ts')>();
      return {
        ...actual,
        getIsPlaceholderMode: () => false,
        isUUID: (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
      };
    });

    vi.doMock('../../src/auth.rpc.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: new Error('unfollow RPC failed') }),
    }));

    const { unfollowUser } = await import('../../src/auth.follows.ts');
    const result = await unfollowUser(VALID_UUID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('unfollow RPC failed');

    vi.useRealTimers();
  });
});
