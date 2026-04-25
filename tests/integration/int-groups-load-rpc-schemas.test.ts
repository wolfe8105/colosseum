import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// Minimal DOM skeleton for groups.load.ts
function buildDOM(): void {
  document.body.innerHTML = `
    <div id="discover-list"></div>
    <div id="mine-list"></div>
    <div id="leaderboard-list"></div>
  `;
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  buildDOM();
});

// TC-01 (ARCH): groups.load.ts imports get_my_groups, get_group_leaderboard, and
//               discover_groups from contracts/rpc-schemas.ts
describe('TC-01 — ARCH: rpc-schemas imports present in groups.load.ts', () => {
  it('imports all three schemas from contracts/rpc-schemas', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.load.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const schemaImport = importLines.find(l => l.includes('rpc-schemas'));
    expect(schemaImport).toBeTruthy();
    expect(schemaImport).toContain('get_my_groups');
    expect(schemaImport).toContain('get_group_leaderboard');
    expect(schemaImport).toContain('discover_groups');
  });
});

// TC-02: discover_groups schema validates an array of valid GroupListItem objects
describe('TC-02 — discover_groups schema validates array of group objects', () => {
  it('parses a valid array of group items without throwing', async () => {
    const { discover_groups } = await import('../../src/contracts/rpc-schemas.ts');
    const input = [
      {
        id: 'grp-uuid-1',
        name: 'Debate Champions',
        avatar_emoji: '🏆',
        description: 'Top debaters worldwide',
        category: 'general',
        member_count: 42,
        elo_rating: 1500,
        role: null,
        rank: 1,
        is_member: false,
        my_role: null,
      },
    ];
    const result = discover_groups.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects non-array input (single object)', async () => {
    const { discover_groups } = await import('../../src/contracts/rpc-schemas.ts');
    const result = discover_groups.safeParse({ id: 'grp-1', name: 'Solo Group' });
    expect(result.success).toBe(false);
  });

  it('accepts an empty array', async () => {
    const { discover_groups } = await import('../../src/contracts/rpc-schemas.ts');
    const result = discover_groups.safeParse([]);
    expect(result.success).toBe(true);
  });
});

// TC-03: get_my_groups schema validates array of GroupListItem objects
describe('TC-03 — get_my_groups schema validates array of user group objects', () => {
  it('parses a valid array of groups the user has joined', async () => {
    const { get_my_groups } = await import('../../src/contracts/rpc-schemas.ts');
    const input = [
      {
        id: 'grp-uuid-2',
        name: 'My Home Group',
        avatar_emoji: '🔥',
        member_count: 10,
        elo_rating: 1200,
        role: 'member',
        is_member: true,
        my_role: 'member',
      },
    ];
    const result = get_my_groups.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects non-array (object instead of array)', async () => {
    const { get_my_groups } = await import('../../src/contracts/rpc-schemas.ts');
    const result = get_my_groups.safeParse({ id: 'grp-1', name: 'Lone Group' });
    expect(result.success).toBe(false);
  });
});

// TC-04: get_group_leaderboard schema validates valid data and rejects non-array
describe('TC-04 — get_group_leaderboard schema validates leaderboard data', () => {
  it('parses a valid leaderboard array', async () => {
    const { get_group_leaderboard } = await import('../../src/contracts/rpc-schemas.ts');
    const input = [
      { id: 'grp-uuid-3', name: 'Top Dogs', elo_rating: 1800, rank: 1, member_count: 25 },
      { id: 'grp-uuid-4', name: 'Runners Up', elo_rating: 1700, rank: 2, member_count: 18 },
    ];
    const result = get_group_leaderboard.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects null input', async () => {
    const { get_group_leaderboard } = await import('../../src/contracts/rpc-schemas.ts');
    const result = get_group_leaderboard.safeParse(null);
    expect(result.success).toBe(false);
  });
});

// TC-05: loadDiscover() calls safeRpc('discover_groups', { p_limit: 30, p_category }, ...)
//        and renders group cards into #discover-list
describe('TC-05 — loadDiscover calls discover_groups RPC and renders results', () => {
  it('calls discover_groups with p_limit:30 and renders group names', async () => {
    const fakeGroup = {
      id: 'grp-disc-1',
      name: 'Philosophy Club',
      avatar_emoji: '🧠',
      description: 'Deep thinkers only',
      member_count: 15,
      elo_rating: 1300,
      role: null,
      is_member: false,
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'discover_groups')
        return Promise.resolve({ data: [fakeGroup], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { loadDiscover } = await import('../../src/pages/groups.load.ts');
    await loadDiscover();

    const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
    const call = rpcCalls.find(([name]) => name === 'discover_groups');
    expect(call).toBeTruthy();
    expect(call![1]).toMatchObject({ p_limit: 30 });

    const container = document.getElementById('discover-list')!;
    expect(container.innerHTML).toContain('Philosophy Club');
  });

  it('renders error state when discover_groups RPC fails', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'discover_groups')
        return Promise.resolve({ data: null, error: { message: 'DB error' } });
      return Promise.resolve({ data: null, error: null });
    });

    const { loadDiscover } = await import('../../src/pages/groups.load.ts');
    await loadDiscover();

    const container = document.getElementById('discover-list')!;
    expect(container.innerHTML).toContain('Could not load groups');
  });
});

// TC-06: loadMyGroups() shows auth gate when currentUser is null;
//        calls get_my_groups RPC when currentUser is set
describe('TC-06 — loadMyGroups shows auth gate for guests, calls RPC for logged-in users', () => {
  it('shows sign-in message when currentUser is null', async () => {
    // groups.state has currentUser = null by default (module re-imported fresh)
    const { loadMyGroups } = await import('../../src/pages/groups.load.ts');
    await loadMyGroups();

    const container = document.getElementById('mine-list')!;
    expect(container.innerHTML).toContain('Sign in to see your groups');

    // RPC should NOT be called when not logged in
    const rpcCalls = mockRpc.mock.calls as [string, unknown][];
    const myGroupsCall = rpcCalls.find(([name]) => name === 'get_my_groups');
    expect(myGroupsCall).toBeUndefined();
  });

  it('calls get_my_groups RPC when currentUser is present and renders groups', async () => {
    const fakeGroup = {
      id: 'grp-mine-1',
      name: 'My Debate Squad',
      avatar_emoji: '⚔️',
      member_count: 5,
      elo_rating: 1100,
      role: 'member',
      is_member: true,
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_my_groups')
        return Promise.resolve({ data: [fakeGroup], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    // Set a current user via the state setter before importing groups.load
    const { setCurrentUser } = await import('../../src/pages/groups.state.ts');
    setCurrentUser({ id: 'user-uuid-123' } as Parameters<typeof setCurrentUser>[0]);

    const { loadMyGroups } = await import('../../src/pages/groups.load.ts');
    await loadMyGroups();

    const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
    const call = rpcCalls.find(([name]) => name === 'get_my_groups');
    expect(call).toBeTruthy();

    const container = document.getElementById('mine-list')!;
    expect(container.innerHTML).toContain('My Debate Squad');
  });

  it('shows empty state when get_my_groups returns empty array', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_my_groups')
        return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { setCurrentUser } = await import('../../src/pages/groups.state.ts');
    setCurrentUser({ id: 'user-uuid-456' } as Parameters<typeof setCurrentUser>[0]);

    const { loadMyGroups } = await import('../../src/pages/groups.load.ts');
    await loadMyGroups();

    const container = document.getElementById('mine-list')!;
    expect(container.innerHTML).toContain("haven't joined any groups yet");
  });
});

// TC-07: loadLeaderboard() calls safeRpc('get_group_leaderboard', { p_limit: 20 }, ...)
//        and renders ranked groups into #leaderboard-list
describe('TC-07 — loadLeaderboard calls get_group_leaderboard RPC and renders rankings', () => {
  it('calls get_group_leaderboard with p_limit:20 and renders group names', async () => {
    const fakeGroups = [
      { id: 'grp-lb-1', name: 'Elite Debaters', elo_rating: 2000, rank: 1, member_count: 50 },
      { id: 'grp-lb-2', name: 'Silver Tongues', elo_rating: 1900, rank: 2, member_count: 40 },
    ];

    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_group_leaderboard')
        return Promise.resolve({ data: fakeGroups, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { loadLeaderboard } = await import('../../src/pages/groups.load.ts');
    await loadLeaderboard();

    const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
    const call = rpcCalls.find(([name]) => name === 'get_group_leaderboard');
    expect(call).toBeTruthy();
    expect(call![1]).toMatchObject({ p_limit: 20 });

    const container = document.getElementById('leaderboard-list')!;
    expect(container.innerHTML).toContain('Elite Debaters');
    expect(container.innerHTML).toContain('Silver Tongues');
  });

  it('renders error state when get_group_leaderboard RPC fails', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_group_leaderboard')
        return Promise.resolve({ data: null, error: { message: 'Server error' } });
      return Promise.resolve({ data: null, error: null });
    });

    const { loadLeaderboard } = await import('../../src/pages/groups.load.ts');
    await loadLeaderboard();

    const container = document.getElementById('leaderboard-list')!;
    expect(container.innerHTML).toContain('Could not load rankings');
  });
});
