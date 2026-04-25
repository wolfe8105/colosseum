// int-arena-room-predebate-core-utils.test.ts
// Seam #071 | src/arena/arena-room-predebate.ts → arena-core.utils
// 5 TCs

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  })),
}));

describe('Seam #071 | arena-room-predebate → arena-core.utils', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  });

  // TC1 — ARCH: static import of arena-core.utils present in arena-room-predebate.ts
  it('TC1 ARCH: arena-room-predebate.ts has static import from arena-core.utils', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(
      process.cwd(),
      'src/arena/arena-room-predebate.ts'
    );
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasUtil = importLines.some(l => l.includes('arena-core.utils'));
    expect(hasUtil).toBe(true);
  });

  // TC2 — pushArenaState calls history.pushState with the correct arenaView key
  it('TC2: pushArenaState("preDebate") calls history.pushState with { arenaView: "preDebate" }', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn(() => ({ auth: {} })),
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));

    const pushStateSpy = vi.spyOn(history, 'pushState');

    const { pushArenaState } = await import('../../src/arena/arena-core.utils.ts');
    pushArenaState('preDebate');

    expect(pushStateSpy).toHaveBeenCalledWith({ arenaView: 'preDebate' }, '');
    pushStateSpy.mockRestore();
  });

  // TC3 — pushArenaState uses empty string as second argument for any view name
  it('TC3: pushArenaState second argument is always empty string', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn(() => ({ auth: {} })),
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));

    const pushStateSpy = vi.spyOn(history, 'pushState');

    const { pushArenaState } = await import('../../src/arena/arena-core.utils.ts');
    pushArenaState('lobby');
    pushArenaState('room');
    pushArenaState('queue');

    for (const call of pushStateSpy.mock.calls) {
      expect(call[1]).toBe('');
    }
    pushStateSpy.mockRestore();
  });

  // TC4 — pushArenaState preserves arbitrary view name in the state object
  it('TC4: pushArenaState stores exactly the passed view name in arenaView', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn(() => ({ auth: {} })),
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));

    const pushStateSpy = vi.spyOn(history, 'pushState');

    const { pushArenaState } = await import('../../src/arena/arena-core.utils.ts');
    pushArenaState('customViewName');

    expect(pushStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ arenaView: 'customViewName' }),
      expect.any(String)
    );
    pushStateSpy.mockRestore();
  });

  // TC5 — showPreDebate calls pushArenaState which invokes history.pushState once
  it('TC5: showPreDebate calls pushArenaState("preDebate") → history.pushState called once with preDebate', async () => {
    const pushStateSpy = vi.spyOn(history, 'pushState');

    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: vi.fn(() => ({ auth: {} })),
      getCurrentProfile: vi.fn(() => ({ display_name: 'Alice', elo_rating: 1300 })),
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      escapeHTML: (s: string) => s,
      ModeratorConfig: { escapeHTML: (s: string) => s },
    }));
    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue(null),
      renderStakingPanel: vi.fn(() => ''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn(() => ''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      screenEl: null,
      activatedPowerUps: { clear: vi.fn() },
      silenceTimer: null,
      set_view: vi.fn(),
      set_currentDebate: vi.fn(),
      set_equippedForDebate: vi.fn(),
      set_shieldActive: vi.fn(),
      set_silenceTimer: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-types.ts', () => ({}));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: vi.fn(),
    }));
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      renderLoadoutPicker: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-loadout-presets.ts', () => ({
      renderPresetBar: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-bounty-claim.ts', () => ({
      renderBountyClaimDropdown: vi.fn().mockResolvedValue(undefined),
      resetBountyClaim: vi.fn(),
    }));
    vi.doMock('../../src/bounties.ts', () => ({
      bountyDot: vi.fn(() => ''),
    }));

    const { showPreDebate } = await import('../../src/arena/arena-room-predebate.ts');

    const debateData = {
      id: 'debate-abc-123',
      topic: 'Test Topic',
      opponentName: 'Bob',
      opponentId: 'opp-uuid-456',
      opponentElo: 1250,
      ranked: false,
      ruleset: 'standard',
      mode: 'live',
    } as any;

    await showPreDebate(debateData);
    await vi.advanceTimersByTimeAsync(0);

    const predebateCalls = pushStateSpy.mock.calls.filter(
      c => c[0] && (c[0] as Record<string, unknown>).arenaView === 'preDebate'
    );
    expect(predebateCalls.length).toBeGreaterThanOrEqual(1);
    expect(predebateCalls[0][1]).toBe('');

    pushStateSpy.mockRestore();
  });
});
