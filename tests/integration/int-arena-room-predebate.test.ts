/**
 * Integration tests — src/arena/arena-room-predebate.ts
 * Seam #341: arena-room-predebate → staking
 * Seam #342: arena-room-predebate → arena-ads
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CurrentDebate } from '../../src/arena/arena-types.ts';

// ---------------------------------------------------------------------------
// ARCH test
// ---------------------------------------------------------------------------
describe('ARCH: arena-room-predebate import wall check', () => {
  it('contains no walled imports', async () => {
    const src = await import('../../src/arena/arena-room-predebate.ts?raw').then((m) => m.default);
    const imports = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const bad = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of imports) {
      for (const wall of bad) {
        expect(line).not.toContain(wall);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDebate(overrides: Partial<CurrentDebate> = {}): CurrentDebate {
  return {
    id: 'debate-test-001',
    topic: 'Is pineapple on pizza valid?',
    mode: 'live',
    ranked: true,
    ruleset: 'standard',
    opponentName: 'Opponent',
    opponentId: 'opp-uuid-001',
    opponentElo: 1250,
    side: 'a',
    ...overrides,
  } as CurrentDebate;
}

// ---------------------------------------------------------------------------
// Module-level bindings (re-imported fresh each test via beforeEach)
// ---------------------------------------------------------------------------

let showPreDebate: typeof import('../../src/arena/arena-room-predebate.ts')['showPreDebate'];

// Staking mocks (closure-captured by vi.mock factories)
let mockGetPool: ReturnType<typeof vi.fn>;
let mockRenderStakingPanel: ReturnType<typeof vi.fn>;
let mockWireStakingPanel: ReturnType<typeof vi.fn>;

// Arena-ads mock
let mockInjectAdSlot: ReturnType<typeof vi.fn>;

// Stable screenEl ref — created in beforeEach, kept alive across test body
let screenEl: HTMLDivElement;

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();

  // Create screenEl BEFORE registering mocks so it exists when factories run
  screenEl = document.createElement('div');
  screenEl.id = 'arena-screen-mock';
  document.body.appendChild(screenEl);

  // Fresh mock functions
  mockGetPool = vi.fn().mockResolvedValue({
    exists: true,
    total_side_a: 50,
    total_side_b: 30,
    pool_status: 'open',
    user_stake: null,
  });
  mockRenderStakingPanel = vi.fn().mockReturnValue(
    '<div class="staking-panel staking-active">STAKE PANEL</div>',
  );
  mockWireStakingPanel = vi.fn();
  mockInjectAdSlot = vi.fn();

  // Use vi.doMock (not hoisted) so it runs fresh each beforeEach after
  // vi.resetModules() — critical for per-test DOM state in arena-state mock

  vi.doMock('@supabase/supabase-js', () => ({
    createClient: () => ({
      auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }));

  vi.doMock('../../src/staking.ts', () => ({
    getPool: (...args: unknown[]) => mockGetPool(...args),
    renderStakingPanel: (...args: unknown[]) => mockRenderStakingPanel(...args),
    wireStakingPanel: (...args: unknown[]) => mockWireStakingPanel(...args),
    placeStake: vi.fn().mockResolvedValue({ success: true }),
    getOdds: vi.fn().mockReturnValue({ a: 63, b: 37, multiplierA: '1.59', multiplierB: '2.70' }),
  }));

  vi.doMock('../../src/arena/arena-ads.ts', () => ({
    injectAdSlot: (...args: unknown[]) => mockInjectAdSlot(...args),
    showAdInterstitial: vi.fn(),
    destroy: vi.fn(),
  }));

  // arena-state: capture outer screenEl — it's already in the DOM
  vi.doMock('../../src/arena/arena-state.ts', () => ({
    screenEl,
    activatedPowerUps: new Set(),
    silenceTimer: null,
    set_view: vi.fn(),
    set_currentDebate: vi.fn(),
    set_equippedForDebate: vi.fn(),
    set_shieldActive: vi.fn(),
    set_silenceTimer: vi.fn(),
  }));

  vi.doMock('../../src/auth.ts', () => ({
    getCurrentProfile: () => ({
      id: 'user-001',
      username: 'debater1',
      display_name: 'Debater One',
      elo_rating: 1300,
      questions_answered: 40,
    }),
    safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    onAuthStateChange: vi.fn(),
  }));

  vi.doMock('../../src/powerups.ts', () => ({
    getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 40 }),
    renderLoadout: vi.fn().mockReturnValue('<div class="loadout-panel">LOADOUT</div>'),
    wireLoadout: vi.fn(),
  }));

  vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
    pushArenaState: vi.fn(),
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
    bountyDot: vi.fn().mockReturnValue(''),
  }));

  vi.doMock('../../src/config.ts', () => ({
    escapeHTML: (s: string) => s,
    ModeratorConfig: {},
  }));

  const mod = await import('../../src/arena/arena-room-predebate.ts');
  showPreDebate = mod.showPreDebate;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

// ===========================================================================
// SEAM #341 — arena-room-predebate → staking
// ===========================================================================

describe('SEAM #341: arena-room-predebate → staking', () => {

  // TC-341-01: getPool called with correct debateId via safeRpc('get_stake_pool', ...)
  describe('TC-341-01: getPool called with the debate id', () => {
    it('calls getPool with debateData.id', async () => {
      const debate = makeDebate({ id: 'debate-abc-123' });
      await showPreDebate(debate);
      expect(mockGetPool).toHaveBeenCalledWith('debate-abc-123');
    });
  });

  // TC-341-02: renderStakingPanel output injected into #pre-debate-staking
  describe('TC-341-02: staking panel HTML injected into #pre-debate-staking', () => {
    it('sets innerHTML of #pre-debate-staking to renderStakingPanel output', async () => {
      const debate = makeDebate();
      await showPreDebate(debate);

      const stakingEl = document.getElementById('pre-debate-staking');
      expect(stakingEl).not.toBeNull();
      expect(stakingEl!.innerHTML).toContain('staking-panel');
    });
  });

  // TC-341-03: renderStakingPanel called with correct args
  describe('TC-341-03: renderStakingPanel receives correct arguments', () => {
    it('passes debateId, player name, opponent name, pool, questions_answered', async () => {
      const pool = {
        exists: true,
        total_side_a: 100,
        total_side_b: 200,
        pool_status: 'open',
        user_stake: null,
      };
      mockGetPool.mockResolvedValue(pool);

      const debate = makeDebate({ id: 'debate-xyz', opponentName: 'Rival' });
      await showPreDebate(debate);

      expect(mockRenderStakingPanel).toHaveBeenCalledWith(
        'debate-xyz',      // debateId
        'Debater One',     // sideALabel — display_name from mock profile
        'Rival',           // sideBLabel — opponentName
        pool,              // pool data from getPool
        40,                // questions_answered from mock profile
      );
    });
  });

  // TC-341-04: wireStakingPanel called after render
  describe('TC-341-04: wireStakingPanel wires the panel', () => {
    it('calls wireStakingPanel with the correct debate id', async () => {
      const debate = makeDebate({ id: 'debate-wire-me' });
      await showPreDebate(debate);

      expect(mockWireStakingPanel).toHaveBeenCalledWith('debate-wire-me');
    });
  });

  // TC-341-05: getPool error → graceful degradation, no throw
  describe('TC-341-05: getPool rejection handled gracefully', () => {
    it('resolves without throwing and leaves #pre-debate-staking empty', async () => {
      mockGetPool.mockRejectedValue(new Error('DB timeout'));

      const debate = makeDebate();
      await expect(showPreDebate(debate)).resolves.not.toThrow();

      // renderStakingPanel must not have been called on error
      expect(mockRenderStakingPanel).not.toHaveBeenCalled();
      const stakingEl = document.getElementById('pre-debate-staking');
      expect(stakingEl?.innerHTML ?? '').toBe('');
    });
  });
});

// ===========================================================================
// SEAM #342 — arena-room-predebate → arena-ads
// ===========================================================================

describe('SEAM #342: arena-room-predebate → arena-ads', () => {

  // TC-342-01: injectAdSlot called once with the .arena-pre-debate container and style
  describe('TC-342-01: injectAdSlot called on the pre-debate container', () => {
    it('passes the .arena-pre-debate HTMLElement and margin style option', async () => {
      const debate = makeDebate();
      await showPreDebate(debate);

      expect(mockInjectAdSlot).toHaveBeenCalledTimes(1);

      const [firstArg, secondArg] = mockInjectAdSlot.mock.calls[0] as [HTMLElement, unknown];
      expect(firstArg).toBeInstanceOf(HTMLElement);
      expect(firstArg.classList.contains('arena-pre-debate')).toBe(true);
      expect(secondArg).toEqual({ margin: '8px 0 4px' });
    });
  });

  // TC-342-02: ad slot injected even when staking fails
  describe('TC-342-02: ad slot injected even when staking getPool throws', () => {
    it('injectAdSlot is still called once when getPool rejects', async () => {
      mockGetPool.mockRejectedValue(new Error('staking exploded'));

      const debate = makeDebate();
      await showPreDebate(debate);

      // injectAdSlot is called synchronously before any async staking work
      expect(mockInjectAdSlot).toHaveBeenCalledTimes(1);
    });
  });

  // TC-342-03: exactly one ad slot per showPreDebate call
  describe('TC-342-03: exactly one injectAdSlot call per showPreDebate', () => {
    it('does not inject duplicate ad slots', async () => {
      const debate = makeDebate();
      await showPreDebate(debate);

      expect(mockInjectAdSlot).toHaveBeenCalledTimes(1);
    });
  });

  // TC-342-04: real injectAdSlot appends ins.adsbygoogle with correct data attributes
  describe('TC-342-04: real injectAdSlot writes correct ins element', () => {
    it('appends ins.adsbygoogle with publisher and slot IDs', async () => {
      // Load real arena-ads (unmocked) via vi.importActual — bypasses the doMock above
      const { injectAdSlot: realInject } = await vi.importActual<
        typeof import('../../src/arena/arena-ads.ts')
      >('../../src/arena/arena-ads.ts');

      type W = typeof window & { adsbygoogle?: unknown[] };
      (window as W).adsbygoogle = [];

      const container = document.createElement('div');
      document.body.appendChild(container);

      realInject(container, { margin: '8px 0 4px' });

      const ins = container.querySelector<HTMLElement>('ins.adsbygoogle');
      expect(ins).not.toBeNull();
      expect(ins!.dataset.adClient).toBe('ca-pub-1800696416995461');
      expect(ins!.dataset.adSlot).toBe('8647716209');

      container.remove();
    });
  });
});

// ===========================================================================
// Shared helper: register all standard mocks plus custom overrides.
// Called by the seam-specific beforeEach blocks that need to override one dep.
// ---------------------------------------------------------------------------

async function setupWithOverrides(overrides: {
  presetBar?: ReturnType<typeof vi.fn>;
  bountyDropdown?: ReturnType<typeof vi.fn>;
  resetBounty?: ReturnType<typeof vi.fn>;
}): Promise<typeof import('../../src/arena/arena-room-predebate.ts')['showPreDebate']> {
  vi.resetModules();

  const screenDiv = document.querySelector<HTMLDivElement>('#arena-screen-mock') ?? (() => {
    const d = document.createElement('div');
    d.id = 'arena-screen-mock';
    document.body.appendChild(d);
    return d;
  })();

  vi.doMock('@supabase/supabase-js', () => ({
    createClient: () => ({
      auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }));

  vi.doMock('../../src/staking.ts', () => ({
    getPool: vi.fn().mockResolvedValue({ exists: true, total_side_a: 50, total_side_b: 30, pool_status: 'open', user_stake: null }),
    renderStakingPanel: vi.fn().mockReturnValue('<div class="staking-panel">STAKE</div>'),
    wireStakingPanel: vi.fn(),
    placeStake: vi.fn().mockResolvedValue({ success: true }),
    getOdds: vi.fn().mockReturnValue({ a: 63, b: 37 }),
  }));

  vi.doMock('../../src/arena/arena-ads.ts', () => ({
    injectAdSlot: vi.fn(),
    showAdInterstitial: vi.fn(),
    destroy: vi.fn(),
  }));

  vi.doMock('../../src/arena/arena-state.ts', () => ({
    screenEl: screenDiv,
    activatedPowerUps: new Set(),
    silenceTimer: null,
    set_view: vi.fn(),
    set_currentDebate: vi.fn(),
    set_equippedForDebate: vi.fn(),
    set_shieldActive: vi.fn(),
    set_silenceTimer: vi.fn(),
  }));

  vi.doMock('../../src/auth.ts', () => ({
    getCurrentProfile: () => ({
      id: 'user-001',
      username: 'debater1',
      display_name: 'Debater One',
      elo_rating: 1300,
      questions_answered: 40,
    }),
    safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    onAuthStateChange: vi.fn(),
  }));

  vi.doMock('../../src/powerups.ts', () => ({
    getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 40 }),
    renderLoadout: vi.fn().mockReturnValue('<div class="loadout-panel">LOADOUT</div>'),
    wireLoadout: vi.fn(),
    equip: vi.fn().mockResolvedValue({ success: true }),
  }));

  vi.doMock('../../src/arena/arena-core.utils.ts', () => ({ pushArenaState: vi.fn() }));
  vi.doMock('../../src/arena/arena-room-enter.ts', () => ({ enterRoom: vi.fn() }));
  vi.doMock('../../src/reference-arsenal.ts', () => ({ renderLoadoutPicker: vi.fn().mockResolvedValue(undefined) }));
  vi.doMock('../../src/reference-arsenal.loadout.ts', () => ({ renderLoadoutPicker: vi.fn().mockResolvedValue(undefined) }));
  vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn().mockReturnValue(''), getOpponentBounties: vi.fn().mockResolvedValue([]), selectBountyClaim: vi.fn() }));
  vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s, ModeratorConfig: {}, showToast: vi.fn() }));

  vi.doMock('../../src/arena/arena-loadout-presets.ts', () => ({
    renderPresetBar: overrides.presetBar ?? vi.fn().mockResolvedValue(undefined),
  }));

  vi.doMock('../../src/arena/arena-bounty-claim.ts', () => ({
    renderBountyClaimDropdown: overrides.bountyDropdown ?? vi.fn().mockResolvedValue(undefined),
    resetBountyClaim: overrides.resetBounty ?? vi.fn(),
  }));

  const mod = await import('../../src/arena/arena-room-predebate.ts');
  return mod.showPreDebate;
}

// ===========================================================================
// SEAM #436 — arena-room-predebate → arena-loadout-presets
// ===========================================================================

describe('SEAM #436: arena-room-predebate → arena-loadout-presets', () => {
  let mockRenderPresetBar: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockRenderPresetBar = vi.fn().mockResolvedValue(undefined);
    showPreDebate = await setupWithOverrides({ presetBar: mockRenderPresetBar });
  });

  // TC-436-01: renderPresetBar called with #pre-debate-presets container and debate
  describe('TC-436-01: renderPresetBar receives the container element and debate object', () => {
    it('passes HTMLElement for #pre-debate-presets and the full debate', async () => {
      const debate = makeDebate({ mode: 'live' });
      await showPreDebate(debate);

      expect(mockRenderPresetBar).toHaveBeenCalledTimes(1);
      const [containerArg, debateArg] = mockRenderPresetBar.mock.calls[0] as [HTMLElement, CurrentDebate];
      expect(containerArg).toBeInstanceOf(HTMLElement);
      expect(containerArg.id).toBe('pre-debate-presets');
      expect(debateArg.id).toBe(debate.id);
    });
  });

  // TC-436-02: renderPresetBar receives refsEl and loadoutEl as 3rd and 4th args
  describe('TC-436-02: renderPresetBar receives refsEl and loadoutEl containers', () => {
    it('passes valid HTMLElements for refsContainer and powerupContainer', async () => {
      const debate = makeDebate({ mode: 'live' });
      await showPreDebate(debate);

      const [, , refsArg, loadoutArg] = mockRenderPresetBar.mock.calls[0] as [
        HTMLElement, CurrentDebate, HTMLElement | null, HTMLElement | null
      ];
      // refsEl should be the #pre-debate-refs element
      expect(refsArg).toBeInstanceOf(HTMLElement);
      expect((refsArg as HTMLElement).id).toBe('pre-debate-refs');
      // loadoutEl should be the #pre-debate-loadout element
      expect(loadoutArg).toBeInstanceOf(HTMLElement);
      expect((loadoutArg as HTMLElement).id).toBe('pre-debate-loadout');
    });
  });

  // TC-436-03: renderPresetBar NOT called when mode === 'ai'
  describe('TC-436-03: renderPresetBar skipped for AI debates', () => {
    it('does not call renderPresetBar when mode is ai', async () => {
      const debate = makeDebate({ mode: 'ai' });
      await showPreDebate(debate);

      expect(mockRenderPresetBar).not.toHaveBeenCalled();
    });
  });

  // TC-436-04: renderPresetBar called exactly once per showPreDebate
  describe('TC-436-04: renderPresetBar called exactly once per invocation', () => {
    it('fires only once for a single showPreDebate call', async () => {
      const debate = makeDebate({ mode: 'live' });
      await showPreDebate(debate);

      expect(mockRenderPresetBar).toHaveBeenCalledTimes(1);
    });
  });

  // TC-436-05: renderPresetBar rejection does not throw from showPreDebate
  describe('TC-436-05: renderPresetBar rejection handled gracefully', () => {
    it('showPreDebate resolves even when renderPresetBar rejects', async () => {
      mockRenderPresetBar.mockRejectedValue(new Error('preset fetch failed'));
      const debate = makeDebate({ mode: 'live' });
      // void-fire (not awaited in source) — showPreDebate should still resolve
      await expect(showPreDebate(debate)).resolves.not.toThrow();
    });
  });
});

// ===========================================================================
// SEAM #437 — arena-room-predebate → arena-bounty-claim
// ===========================================================================

describe('SEAM #437: arena-room-predebate → arena-bounty-claim', () => {
  let mockRenderBountyClaimDropdown: ReturnType<typeof vi.fn>;
  let mockResetBountyClaim: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockRenderBountyClaimDropdown = vi.fn().mockResolvedValue(undefined);
    mockResetBountyClaim = vi.fn();
    showPreDebate = await setupWithOverrides({
      bountyDropdown: mockRenderBountyClaimDropdown,
      resetBounty: mockResetBountyClaim,
    });
  });

  // TC-437-01: resetBountyClaim called before renderBountyClaimDropdown on ranked debate
  describe('TC-437-01: resetBountyClaim is called before renderBountyClaimDropdown', () => {
    it('resets state then renders dropdown for ranked debate', async () => {
      const debate = makeDebate({ ranked: true, mode: 'live', opponentId: 'opp-001' });
      await showPreDebate(debate);

      expect(mockResetBountyClaim).toHaveBeenCalledTimes(1);
      expect(mockRenderBountyClaimDropdown).toHaveBeenCalledTimes(1);

      // Verify call order: reset before dropdown
      const resetOrder = mockResetBountyClaim.mock.invocationCallOrder[0];
      const renderOrder = mockRenderBountyClaimDropdown.mock.invocationCallOrder[0];
      expect(resetOrder).toBeLessThan(renderOrder);
    });
  });

  // TC-437-02: renderBountyClaimDropdown called with correct args
  describe('TC-437-02: renderBountyClaimDropdown receives correct arguments', () => {
    it('passes container, debateId, opponentId, opponentName', async () => {
      const debate = makeDebate({
        id: 'debate-bounty-01',
        ranked: true,
        mode: 'live',
        opponentId: 'opp-bounty-uuid',
        opponentName: 'BountyTarget',
      });
      await showPreDebate(debate);

      expect(mockRenderBountyClaimDropdown).toHaveBeenCalledTimes(1);
      const [containerArg, debateIdArg, oppIdArg, oppNameArg] =
        mockRenderBountyClaimDropdown.mock.calls[0] as [HTMLElement, string, string, string];

      expect(containerArg).toBeInstanceOf(HTMLElement);
      expect(containerArg.id).toBe('pre-debate-bounty');
      expect(debateIdArg).toBe('debate-bounty-01');
      expect(oppIdArg).toBe('opp-bounty-uuid');
      expect(oppNameArg).toBe('BountyTarget');
    });
  });

  // TC-437-03: renderBountyClaimDropdown NOT called when ranked === false
  describe('TC-437-03: renderBountyClaimDropdown skipped when ranked is false', () => {
    it('does not call dropdown for casual debates', async () => {
      const debate = makeDebate({ ranked: false, mode: 'live', opponentId: 'opp-001' });
      await showPreDebate(debate);

      expect(mockRenderBountyClaimDropdown).not.toHaveBeenCalled();
    });
  });

  // TC-437-04: renderBountyClaimDropdown NOT called when mode === 'ai'
  describe('TC-437-04: renderBountyClaimDropdown skipped for AI debates', () => {
    it('does not call dropdown for ai mode even if ranked', async () => {
      const debate = makeDebate({ ranked: true, mode: 'ai', opponentId: 'opp-001' });
      await showPreDebate(debate);

      expect(mockRenderBountyClaimDropdown).not.toHaveBeenCalled();
    });
  });

  // TC-437-05: renderBountyClaimDropdown NOT called when opponentId is falsy
  describe('TC-437-05: renderBountyClaimDropdown skipped when opponentId is missing', () => {
    it('does not call dropdown when opponentId is empty string', async () => {
      const debate = makeDebate({ ranked: true, mode: 'live', opponentId: '' });
      await showPreDebate(debate);

      expect(mockRenderBountyClaimDropdown).not.toHaveBeenCalled();
    });
  });

  // TC-437-06: resetBountyClaim is called even when renderBountyClaimDropdown rejects
  describe('TC-437-06: resetBountyClaim fires even when renderBountyClaimDropdown rejects', () => {
    it('showPreDebate resolves and reset was called despite dropdown error', async () => {
      mockRenderBountyClaimDropdown.mockRejectedValue(new Error('dropdown fetch failed'));

      const debate = makeDebate({ ranked: true, mode: 'live', opponentId: 'opp-error' });
      // showPreDebate void-fires renderBountyClaimDropdown — rejection should not propagate
      await expect(showPreDebate(debate)).resolves.not.toThrow();

      // reset was called before the void-fired dropdown
      expect(mockResetBountyClaim).toHaveBeenCalledTimes(1);
    });
  });
});
