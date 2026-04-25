// ============================================================
// INTEGRATOR — leaderboard.list → bounties
// Boundary: renderList() calls bountyDot() (bounties.dot)
//           which reads internal _bountyDotSet populated by
//           loadBountyDotSet() via RPC get_bounty_dot_user_ids.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// HELPERS
// ============================================================

function makeEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    rank: 1,
    id: 'user-uuid-aaaa-0001',
    username: 'sharpmind',
    user: 'SHARPMIND',
    elo: 1800,
    wins: 120,
    losses: 30,
    streak: 10,
    level: 22,
    tier: 'champion',
    verified_gladiator: false,
    ...overrides,
  };
}

// ============================================================
// TESTS
// ============================================================

describe('leaderboard.list → bounties', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockFrom.mockReset();
    mockAuth.onAuthStateChange.mockReset();
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  // TC-1: bountyDot returns empty string when _bountyDotSet is empty (no RPC call made)
  it('TC-1: bountyDot returns empty string for user not in dot set', async () => {
    const { bountyDot, userHasBountyDot } = await import('../../src/bounties.dot.ts');
    expect(bountyDot('user-uuid-aaaa-0001')).toBe('');
    expect(userHasBountyDot('user-uuid-aaaa-0001')).toBe(false);
  });

  // TC-2: loadBountyDotSet calls RPC get_bounty_dot_user_ids and populates set
  it('TC-2: loadBountyDotSet calls RPC get_bounty_dot_user_ids and populates the dot set', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ user_id: 'user-uuid-bounty-001' }, { user_id: 'user-uuid-bounty-002' }],
      error: null,
    });

    const { loadBountyDotSet, userHasBountyDot } = await import('../../src/bounties.dot.ts');
    await loadBountyDotSet();

    expect(mockRpc).toHaveBeenCalledWith('get_bounty_dot_user_ids', expect.anything());
    expect(userHasBountyDot('user-uuid-bounty-001')).toBe(true);
    expect(userHasBountyDot('user-uuid-bounty-002')).toBe(true);
    expect(userHasBountyDot('user-uuid-not-there')).toBe(false);
  });

  // TC-3: bountyDot returns span with class bounty-dot after user is in set
  it('TC-3: bountyDot returns span.bounty-dot with 🟡 for a user in the dot set', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ user_id: 'user-uuid-aaaa-0001' }],
      error: null,
    });

    const { loadBountyDotSet, bountyDot } = await import('../../src/bounties.dot.ts');
    await loadBountyDotSet();

    const html = bountyDot('user-uuid-aaaa-0001');
    expect(html).toContain('class="bounty-dot"');
    expect(html).toContain('🟡');
    expect(html).toContain('Active bounty');
  });

  // TC-4: renderList injects bounty dot span into row HTML when user is in dot set
  it('TC-4: renderList includes bounty-dot span for a user with an active bounty', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ user_id: 'user-uuid-aaaa-0001' }],
      error: null,
    });

    const { loadBountyDotSet } = await import('../../src/bounties.dot.ts');
    await loadBountyDotSet();

    const { setLiveData, setIsLoading } = await import('../../src/leaderboard.state.ts');
    const entry = makeEntry({ id: 'user-uuid-aaaa-0001' });
    setLiveData([entry as never]);
    setIsLoading(false);

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();

    expect(html).toContain('class="bounty-dot"');
    expect(html).toContain('🟡');
  });

  // TC-5: renderList does NOT include bounty dot for a user not in the dot set
  it('TC-5: renderList omits bounty-dot for a user without an active bounty', async () => {
    // No bounty users seeded
    const { setLiveData, setIsLoading } = await import('../../src/leaderboard.state.ts');
    const entry = makeEntry({ id: 'user-uuid-aaaa-0099' });
    setLiveData([entry as never]);
    setIsLoading(false);

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();

    expect(html).not.toContain('class="bounty-dot"');
  });

  // TC-6: renderList renders error state when liveData is null and not loading
  it('TC-6: renderList shows error state when liveData is null and not loading', async () => {
    const { setLiveData, setIsLoading } = await import('../../src/leaderboard.state.ts');
    setLiveData(null);
    setIsLoading(false);

    const { renderList } = await import('../../src/leaderboard.list.ts');
    const html = renderList();

    expect(html).toContain("Couldn't load rankings");
  });

  // TC-7: loadBountyDotSet is resilient to RPC error — dot set remains empty, no throw
  it('TC-7: loadBountyDotSet handles RPC error gracefully and leaves dot set empty', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('DB down') });

    const { loadBountyDotSet, userHasBountyDot } = await import('../../src/bounties.dot.ts');
    await expect(loadBountyDotSet()).resolves.not.toThrow();
    expect(userHasBountyDot('user-uuid-aaaa-0001')).toBe(false);
  });

  // TC-8: ARCH — leaderboard.list.ts imports bounties only via bounties.ts barrel (no deep import)
  it('TC-8: ARCH — leaderboard.list.ts imports bountyDot from ./bounties.ts barrel', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(__dirname, '../../src/leaderboard.list.ts');
    const src = fs.readFileSync(filePath, 'utf8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const bountiesImport = importLines.find(l => l.includes("'./bounties.ts'") || l.includes('"./bounties.ts"') || l.includes("'./bounties'") || l.includes('"./bounties"'));
    expect(bountiesImport).toBeTruthy();
    expect(bountiesImport).toContain('bountyDot');
  });
});
