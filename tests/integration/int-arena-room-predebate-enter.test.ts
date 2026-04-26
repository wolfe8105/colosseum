/**
 * Integration tests — src/arena/arena-room-predebate.ts → arena-room-enter
 * Seam #295 | score:7
 *
 * Contract: showPreDebate() renders an ENTER BATTLE button that, when clicked,
 * calls enterRoom() from arena-room-enter.ts with the debate data.
 *
 * 8 TCs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── ARCH ─────────────────────────────────────────────────────────────────────

describe('ARCH: arena-room-predebate → arena-room-enter static import', () => {
  const src = readFileSync(
    resolve(__dirname, '../../src/arena/arena-room-predebate.ts'),
    'utf-8'
  );

  // TC1 — arena-room-predebate.ts has a static import from arena-room-enter
  it('TC1: has static import from ./arena-room-enter.ts', () => {
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const enterImport = importLines.find(l => l.includes('arena-room-enter'));
    expect(enterImport).toBeTruthy();
  });

  // TC2 — the import names enterRoom
  it('TC2: import from arena-room-enter includes enterRoom', () => {
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const enterImport = importLines.find(l => l.includes('arena-room-enter'));
    expect(enterImport).toMatch(/enterRoom/);
  });

  // TC3 — no wall-term imports present
  it('TC3: no forbidden imports (webrtc, deepgram, arena-sounds, etc.)', () => {
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const bad = importLines.filter(l =>
      /webrtc|feed-room|intro-music|cards\.ts|deepgram|realtime-client|voicememo|arena-css|arena-room-live-audio|arena-sounds|arena-sounds-core|peermetrics/.test(l)
    );
    expect(bad).toHaveLength(0);
  });
});

// ── Supabase stub (required by auth.ts barrel) ────────────────────────────────

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  })),
}));

// ── Integration test helpers ──────────────────────────────────────────────────

function makeDebate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'debate-int-295',
    topic: 'Integration test topic',
    role: 'a',
    mode: 'text',
    round: 1,
    totalRounds: 3,
    opponentName: 'Charlie',
    opponentId: 'opp-uuid-charlie',
    opponentElo: 1350,
    ranked: false,
    ruleset: 'standard',
    modView: false,
    ...overrides,
  };
}

// ── TC4–TC8: showPreDebate button calls enterRoom ─────────────────────────────

describe('TC4-8: showPreDebate enter button → enterRoom integration', () => {
  let enterRoomMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
    enterRoomMock = vi.fn();
  });

  // TC4 — enterRoom is called when enter button is clicked
  it('TC4: clicking ENTER BATTLE button calls enterRoom once', async () => {
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: enterRoomMock,
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentProfile: vi.fn(() => ({ display_name: 'Alice', username: 'alice', elo_rating: 1200, questions_answered: 5 })),
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
    }));
    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue({}),
      renderStakingPanel: vi.fn(() => ''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn(() => ''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      screenEl: document.getElementById('app'),
      activatedPowerUps: { clear: vi.fn() },
      silenceTimer: null,
      set_view: vi.fn(),
      set_currentDebate: vi.fn(),
      set_equippedForDebate: vi.fn(),
      set_shieldActive: vi.fn(),
      set_silenceTimer: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
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
    const debate = makeDebate();
    await showPreDebate(debate as any);

    const btn = document.getElementById('pre-debate-enter-btn') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(enterRoomMock).toHaveBeenCalledTimes(1);
  });

  // TC5 — enterRoom is called with the correct debate object
  it('TC5: enterRoom receives the debate data passed to showPreDebate', async () => {
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: enterRoomMock,
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentProfile: vi.fn(() => ({ display_name: 'Alice', username: 'alice', elo_rating: 1200, questions_answered: 5 })),
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
    }));
    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue({}),
      renderStakingPanel: vi.fn(() => ''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn(() => ''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      screenEl: document.getElementById('app'),
      activatedPowerUps: { clear: vi.fn() },
      silenceTimer: null,
      set_view: vi.fn(),
      set_currentDebate: vi.fn(),
      set_equippedForDebate: vi.fn(),
      set_shieldActive: vi.fn(),
      set_silenceTimer: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
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
    const debate = makeDebate({ id: 'specific-debate-999' });
    await showPreDebate(debate as any);

    document.getElementById('pre-debate-enter-btn')!.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(enterRoomMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'specific-debate-999' }));
  });

  // TC6 — enter button is disabled after click to prevent double-entry
  it('TC6: enter button is disabled after first click', async () => {
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: enterRoomMock,
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentProfile: vi.fn(() => ({ display_name: 'Alice', username: 'alice', elo_rating: 1200, questions_answered: 5 })),
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
    }));
    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue({}),
      renderStakingPanel: vi.fn(() => ''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn(() => ''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      screenEl: document.getElementById('app'),
      activatedPowerUps: { clear: vi.fn() },
      silenceTimer: null,
      set_view: vi.fn(),
      set_currentDebate: vi.fn(),
      set_equippedForDebate: vi.fn(),
      set_shieldActive: vi.fn(),
      set_silenceTimer: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
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
    await showPreDebate(makeDebate() as any);

    const btn = document.getElementById('pre-debate-enter-btn') as HTMLButtonElement;
    btn.click();
    // After the click handler fires, the button should be disabled
    await Promise.resolve();
    expect(btn.disabled).toBe(true);
  });

  // TC7 — double-click only calls enterRoom once (disabled guard prevents second entry)
  it('TC7: double-click on enter button calls enterRoom only once', async () => {
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: enterRoomMock,
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentProfile: vi.fn(() => ({ display_name: 'Alice', username: 'alice', elo_rating: 1200, questions_answered: 5 })),
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
    }));
    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue({}),
      renderStakingPanel: vi.fn(() => ''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn(() => ''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      screenEl: document.getElementById('app'),
      activatedPowerUps: { clear: vi.fn() },
      silenceTimer: null,
      set_view: vi.fn(),
      set_currentDebate: vi.fn(),
      set_equippedForDebate: vi.fn(),
      set_shieldActive: vi.fn(),
      set_silenceTimer: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
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
    await showPreDebate(makeDebate() as any);

    const btn = document.getElementById('pre-debate-enter-btn') as HTMLButtonElement;
    // Simulate a double-click
    btn.click();
    await Promise.resolve();
    btn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(enterRoomMock).toHaveBeenCalledTimes(1);
  });

  // TC8 — set_equippedForDebate is called with the final equipped list before enterRoom
  it('TC8: set_equippedForDebate is called before enterRoom on button click', async () => {
    const callOrder: string[] = [];
    const equippedMock = vi.fn(() => { callOrder.push('setEquipped'); });
    const enterMock = vi.fn(() => { callOrder.push('enterRoom'); });

    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: enterMock,
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentProfile: vi.fn(() => ({ display_name: 'Alice', username: 'alice', elo_rating: 1200, questions_answered: 5 })),
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
    }));
    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue({}),
      renderStakingPanel: vi.fn(() => ''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: ['shield'], questions_answered: 0 }),
      renderLoadout: vi.fn(() => ''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      screenEl: document.getElementById('app'),
      activatedPowerUps: { clear: vi.fn() },
      silenceTimer: null,
      set_view: vi.fn(),
      set_currentDebate: vi.fn(),
      set_equippedForDebate: equippedMock,
      set_shieldActive: vi.fn(),
      set_silenceTimer: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
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
    await showPreDebate(makeDebate() as any);

    document.getElementById('pre-debate-enter-btn')!.click();
    // Wait for the async click handler to resolve
    await new Promise(r => setTimeout(r, 10));

    expect(callOrder.indexOf('setEquipped')).toBeLessThan(callOrder.indexOf('enterRoom'));
    expect(enterMock).toHaveBeenCalledTimes(1);
  });
});
