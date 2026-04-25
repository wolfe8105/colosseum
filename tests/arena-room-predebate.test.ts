import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentProfile = vi.hoisted(() => vi.fn().mockReturnValue({ display_name: 'Alice', username: 'alice', elo_rating: 1200, token_balance: 50, questions_answered: 10 }));
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockGetPool = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockRenderStakingPanel = vi.hoisted(() => vi.fn().mockReturnValue('<div>staking</div>'));
const mockWireStakingPanel = vi.hoisted(() => vi.fn());
const mockGetMyPowerUps = vi.hoisted(() => vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }));
const mockRenderLoadout = vi.hoisted(() => vi.fn().mockReturnValue('<div>loadout</div>'));
const mockWireLoadout = vi.hoisted(() => vi.fn());

const mockScreenEl = vi.hoisted(() => ({ value: null as HTMLElement | null }));
const mockActivatedPowerUps = vi.hoisted(() => new Set<string>());
const mockSilenceTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockSet_view = vi.hoisted(() => vi.fn());
const mockSet_currentDebate = vi.hoisted(() => vi.fn());
const mockSet_equippedForDebate = vi.hoisted(() => vi.fn());
const mockSet_shieldActive = vi.hoisted(() => vi.fn());
const mockSet_silenceTimer = vi.hoisted(() => vi.fn());

const mockPushArenaState = vi.hoisted(() => vi.fn());
const mockInjectAdSlot = vi.hoisted(() => vi.fn());
const mockEnterRoom = vi.hoisted(() => vi.fn());
const mockRenderLoadoutPicker = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRenderPresetBar = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRenderBountyClaimDropdown = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockResetBountyClaim = vi.hoisted(() => vi.fn());
const mockBountyDot = vi.hoisted(() => vi.fn().mockReturnValue(''));

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/staking.ts', () => ({
  getPool: mockGetPool,
  renderStakingPanel: mockRenderStakingPanel,
  wireStakingPanel: mockWireStakingPanel,
}));

vi.mock('../src/powerups.ts', () => ({
  getMyPowerUps: mockGetMyPowerUps,
  renderLoadout: mockRenderLoadout,
  wireLoadout: mockWireLoadout,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get screenEl() { return mockScreenEl.value; },
  get activatedPowerUps() { return mockActivatedPowerUps; },
  get silenceTimer() { return mockSilenceTimer.value; },
  set_view: mockSet_view,
  set_currentDebate: mockSet_currentDebate,
  set_equippedForDebate: mockSet_equippedForDebate,
  set_shieldActive: mockSet_shieldActive,
  set_silenceTimer: mockSet_silenceTimer,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  pushArenaState: mockPushArenaState,
}));

vi.mock('../src/arena/arena-ads.ts', () => ({
  injectAdSlot: mockInjectAdSlot,
}));

vi.mock('../src/arena/arena-room-enter.ts', () => ({
  enterRoom: mockEnterRoom,
}));

vi.mock('../src/reference-arsenal.ts', () => ({
  renderLoadoutPicker: mockRenderLoadoutPicker,
}));

vi.mock('../src/arena/arena-loadout-presets.ts', () => ({
  renderPresetBar: mockRenderPresetBar,
}));

vi.mock('../src/arena/arena-bounty-claim.ts', () => ({
  renderBountyClaimDropdown: mockRenderBountyClaimDropdown,
  resetBountyClaim: mockResetBountyClaim,
}));

vi.mock('../src/bounties.ts', () => ({
  bountyDot: mockBountyDot,
}));

import { showPreDebate } from '../src/arena/arena-room-predebate.ts';

const baseDebate = {
  id: 'debate-1',
  topic: 'Is AI sentient?',
  role: 'a' as const,
  mode: 'text' as const,
  round: 1,
  totalRounds: 3,
  opponentName: 'Bob',
  opponentId: 'opp-uuid',
  opponentElo: 1100,
  ranked: false,
  ruleset: 'standard',
  modView: false,
};

describe('TC1 — showPreDebate sets state and renders DOM', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockSilenceTimer.value = null;
    mockActivatedPowerUps.clear();
  });

  it('calls set_view with room', async () => {
    await showPreDebate({ ...baseDebate });
    expect(mockSet_view).toHaveBeenCalledWith('room');
  });

  it('calls pushArenaState with preDebate', async () => {
    await showPreDebate({ ...baseDebate });
    expect(mockPushArenaState).toHaveBeenCalledWith('preDebate');
  });

  it('calls set_currentDebate with debate', async () => {
    const debate = { ...baseDebate };
    await showPreDebate(debate);
    expect(mockSet_currentDebate).toHaveBeenCalledWith(debate);
  });

  it('renders arena-pre-debate div', async () => {
    await showPreDebate({ ...baseDebate });
    expect(document.querySelector('.arena-pre-debate')).not.toBeNull();
  });

  it('calls injectAdSlot', async () => {
    await showPreDebate({ ...baseDebate });
    expect(mockInjectAdSlot).toHaveBeenCalled();
  });
});

describe('TC2 — showPreDebate wires staking panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockSilenceTimer.value = null;
  });

  it('calls getPool with debate id', async () => {
    await showPreDebate({ ...baseDebate });
    expect(mockGetPool).toHaveBeenCalledWith('debate-1');
  });

  it('calls renderStakingPanel', async () => {
    await showPreDebate({ ...baseDebate });
    expect(mockRenderStakingPanel).toHaveBeenCalled();
  });

  it('calls wireStakingPanel', async () => {
    await showPreDebate({ ...baseDebate });
    expect(mockWireStakingPanel).toHaveBeenCalledWith('debate-1');
  });
});

describe('TC3 — showPreDebate loads power-up loadout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockSilenceTimer.value = null;
  });

  it('calls getMyPowerUps with debate id', async () => {
    await showPreDebate({ ...baseDebate });
    expect(mockGetMyPowerUps).toHaveBeenCalledWith('debate-1');
  });

  it('calls renderLoadout', async () => {
    await showPreDebate({ ...baseDebate });
    expect(mockRenderLoadout).toHaveBeenCalled();
  });

  it('calls wireLoadout', async () => {
    await showPreDebate({ ...baseDebate });
    expect(mockWireLoadout).toHaveBeenCalled();
  });
});

describe('TC4 — showPreDebate renders reference picker for non-ai mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockSilenceTimer.value = null;
  });

  it('calls renderLoadoutPicker for text mode', async () => {
    await showPreDebate({ ...baseDebate });
    expect(mockRenderLoadoutPicker).toHaveBeenCalled();
  });

  it('does not call renderLoadoutPicker for ai mode', async () => {
    await showPreDebate({ ...baseDebate, mode: 'ai' });
    expect(mockRenderLoadoutPicker).not.toHaveBeenCalled();
  });
});

describe('TC5 — showPreDebate enter button calls enterRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockSilenceTimer.value = null;
  });

  it('calls enterRoom when enter button clicked', async () => {
    await showPreDebate({ ...baseDebate });
    const btn = document.getElementById('pre-debate-enter-btn') as HTMLButtonElement;
    await btn.click();
    await Promise.resolve();
    expect(mockEnterRoom).toHaveBeenCalled();
  });
});

describe('TC6 — showPreDebate resets power-up state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockSilenceTimer.value = null;
    mockActivatedPowerUps.add('shield');
  });

  it('calls set_shieldActive(false)', async () => {
    await showPreDebate({ ...baseDebate });
    expect(mockSet_shieldActive).toHaveBeenCalledWith(false);
  });

  it('calls set_equippedForDebate([])', async () => {
    await showPreDebate({ ...baseDebate });
    expect(mockSet_equippedForDebate).toHaveBeenCalledWith([]);
  });
});

describe('ARCH — arena-room-predebate.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      '../staking.ts',
      '../powerups.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-core.utils.ts',
      './arena-ads.ts',
      './arena-room-enter.ts',
      '../reference-arsenal.ts',
      './arena-loadout-presets.ts',
      './arena-bounty-claim.ts',
      '../bounties.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-predebate.ts'),
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
