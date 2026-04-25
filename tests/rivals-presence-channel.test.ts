import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockGetSupabaseClient = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetMyRivals = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getSupabaseClient: mockGetSupabaseClient,
  getCurrentUser: mockGetCurrentUser,
  getMyRivals: mockGetMyRivals,
  getCurrentProfile: mockGetCurrentProfile,
}));

import { buildRivalSet, startPresence } from '../src/rivals-presence-channel.ts';
import type { ChannelState } from '../src/rivals-presence-channel.ts';

// ── Helpers ────────────────────────────────────────────────────

function buildMockChannel() {
  const mockTrack = vi.fn().mockResolvedValue(undefined);
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    track: mockTrack,
  };
  return mockChannel;
}

function buildMockSupabase(channel = buildMockChannel()) {
  return {
    channel: vi.fn().mockReturnValue(channel),
    removeChannel: vi.fn(),
    realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
  };
}

function buildState(overrides: Partial<ChannelState> = {}): ChannelState {
  return {
    rivalSet: new Set(),
    onlineRivals: new Set(),
    channelRef: { value: null },
    onAlert: vi.fn(),
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockGetSupabaseClient.mockReset();
  mockGetCurrentUser.mockReset();
  mockGetMyRivals.mockReset();
  mockGetCurrentProfile.mockReset();
});

// ── buildRivalSet ──────────────────────────────────────────────

describe('TC1 — buildRivalSet clears the set before fetching', () => {
  it('removes stale ids from rivalSet before awaiting getMyRivals', async () => {
    const rivalSet = new Set(['stale-id']);
    mockGetMyRivals.mockResolvedValue([]);

    await buildRivalSet(rivalSet);

    expect(rivalSet.has('stale-id')).toBe(false);
  });
});

describe('TC2 — buildRivalSet adds accepted rivals', () => {
  it('adds rival_id for accepted rivals', async () => {
    const rivalSet = new Set<string>();
    mockGetMyRivals.mockResolvedValue([
      { rival_id: 'user-a', status: 'accepted' },
      { rival_id: 'user-b', status: 'active' },
    ]);

    await buildRivalSet(rivalSet);

    expect(rivalSet.has('user-a')).toBe(true);
    expect(rivalSet.has('user-b')).toBe(true);
  });
});

describe('TC3 — buildRivalSet skips pending rivals', () => {
  it('does not add rival_id for pending status', async () => {
    const rivalSet = new Set<string>();
    mockGetMyRivals.mockResolvedValue([
      { rival_id: 'user-pending', status: 'pending' },
    ]);

    await buildRivalSet(rivalSet);

    expect(rivalSet.has('user-pending')).toBe(false);
  });
});

describe('TC4 — buildRivalSet handles getMyRivals failure gracefully', () => {
  it('leaves rivalSet empty on rejection without throwing', async () => {
    const rivalSet = new Set<string>();
    mockGetMyRivals.mockRejectedValue(new Error('network error'));

    await expect(buildRivalSet(rivalSet)).resolves.toBeUndefined();
    expect(rivalSet.size).toBe(0);
  });
});

describe('TC5 — buildRivalSet import contract — calls getMyRivals', () => {
  it('getMyRivals mock is called', async () => {
    mockGetMyRivals.mockResolvedValue([]);
    await buildRivalSet(new Set());
    expect(mockGetMyRivals).toHaveBeenCalled();
  });
});

// ── startPresence ──────────────────────────────────────────────

describe('TC6 — startPresence returns early if no supabase client', () => {
  it('does not throw and does not create a channel', async () => {
    mockGetSupabaseClient.mockReturnValue(null);
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    const state = buildState();

    await startPresence(state);

    expect(state.channelRef.value).toBeNull();
  });
});

describe('TC7 — startPresence returns early if no current user', () => {
  it('does not create a channel when user is null', async () => {
    mockGetSupabaseClient.mockReturnValue(buildMockSupabase());
    mockGetCurrentUser.mockReturnValue(null);
    const state = buildState();

    await startPresence(state);

    expect(state.channelRef.value).toBeNull();
  });
});

describe('TC8 — startPresence creates global-online channel', () => {
  it('calls supabase.channel with global-online', async () => {
    const mockSupabase = buildMockSupabase();
    mockGetSupabaseClient.mockReturnValue(mockSupabase);
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    const state = buildState();

    await startPresence(state);

    expect(mockSupabase.channel).toHaveBeenCalledWith('global-online', expect.any(Object));
  });
});

describe('TC9 — startPresence removes existing channel before creating new', () => {
  it('calls supabase.removeChannel if channelRef.value is already set', async () => {
    const existingChannel = buildMockChannel();
    const mockSupabase = buildMockSupabase();
    mockGetSupabaseClient.mockReturnValue(mockSupabase);
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    const state = buildState({ channelRef: { value: existingChannel as never } });

    await startPresence(state);

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(existingChannel);
  });
});

describe('TC10 — startPresence import contract — calls getSupabaseClient', () => {
  it('getSupabaseClient mock is called', async () => {
    mockGetSupabaseClient.mockReturnValue(null);
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    await startPresence(buildState());
    expect(mockGetSupabaseClient).toHaveBeenCalled();
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — rivals-presence-channel.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './async.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/rivals-presence-channel.ts'),
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
