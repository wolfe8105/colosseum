import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentProfile = vi.hoisted(() => vi.fn().mockReturnValue({ display_name: 'Alice', username: 'alice', elo_rating: 1200, token_balance: 50, questions_answered: 10 }));
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockGetMyPowerUps = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockRenderLoadout = vi.hoisted(() => vi.fn().mockReturnValue(''));
const mockWireLoadout = vi.hoisted(() => vi.fn());
const mockRenderActivationBar = vi.hoisted(() => vi.fn().mockReturnValue(''));
const mockWireActivationBar = vi.hoisted(() => vi.fn());
const mockRenderSilenceOverlay = vi.hoisted(() => vi.fn().mockReturnValue(null));
const mockRenderRevealPopup = vi.hoisted(() => vi.fn());
const mockRenderShieldIndicator = vi.hoisted(() => vi.fn());
const mockGetOpponentPowerUps = vi.hoisted(() => vi.fn().mockResolvedValue({ success: false }));
const mockHasMultiplier = vi.hoisted(() => vi.fn().mockReturnValue(false));
const mockNudge = vi.hoisted(() => vi.fn());

const mockScreenEl = vi.hoisted(() => ({ value: null as HTMLElement | null }));
const mockSelectedModerator = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockActivatedPowerUps = vi.hoisted(() => new Set<string>());
const mockEquippedForDebate = vi.hoisted(() => ({ value: [] as unknown[] }));
const mockSet_currentDebate = vi.hoisted(() => vi.fn());
const mockSet_shieldActive = vi.hoisted(() => vi.fn());
const mockSet_silenceTimer = vi.hoisted(() => vi.fn());

const mockIsPlaceholder = vi.hoisted(() => ({ value: false }));
const mockFormatTimer = vi.hoisted(() => vi.fn((t: number) => `${t}s`));
const mockPushArenaState = vi.hoisted(() => vi.fn());

const mockRenderInputControls = vi.hoisted(() => vi.fn());
const mockStartLiveRoundTimer = vi.hoisted(() => vi.fn());
const mockInitLiveAudio = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAddSystemMessage = vi.hoisted(() => vi.fn());
const mockAddReferenceButton = vi.hoisted(() => vi.fn());
const mockAssignSelectedMod = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockStartReferencePoll = vi.hoisted(() => vi.fn());
const mockStartModStatusPoll = vi.hoisted(() => vi.fn());
const mockBountyDot = vi.hoisted(() => vi.fn().mockReturnValue(''));

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/powerups.ts', () => ({
  getMyPowerUps: mockGetMyPowerUps,
  renderLoadout: mockRenderLoadout,
  wireLoadout: mockWireLoadout,
  renderActivationBar: mockRenderActivationBar,
  wireActivationBar: mockWireActivationBar,
  renderSilenceOverlay: mockRenderSilenceOverlay,
  renderRevealPopup: mockRenderRevealPopup,
  renderShieldIndicator: mockRenderShieldIndicator,
  getOpponentPowerUps: mockGetOpponentPowerUps,
  hasMultiplier: mockHasMultiplier,
}));

vi.mock('../src/nudge.ts', () => ({
  nudge: mockNudge,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get screenEl() { return mockScreenEl.value; },
  get selectedModerator() { return mockSelectedModerator.value; },
  get activatedPowerUps() { return mockActivatedPowerUps; },
  get equippedForDebate() { return mockEquippedForDebate.value; },
  set_currentDebate: mockSet_currentDebate,
  set_shieldActive: mockSet_shieldActive,
  set_silenceTimer: mockSet_silenceTimer,
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  ROUND_DURATION: 60,
  TEXT_MAX_CHARS: 500,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  get isPlaceholder() { return () => mockIsPlaceholder.value; },
  formatTimer: mockFormatTimer,
  pushArenaState: mockPushArenaState,
}));

vi.mock('../src/arena/arena-room-live-input.ts', () => ({
  renderInputControls: mockRenderInputControls,
}));

vi.mock('../src/arena/arena-room-live-poll.ts', () => ({
  startLiveRoundTimer: mockStartLiveRoundTimer,
  advanceRound: vi.fn(),
  submitTextArgument: vi.fn(),
}));

vi.mock('../src/arena/arena-room-live-audio.ts', () => ({
  initLiveAudio: mockInitLiveAudio,
}));

vi.mock('../src/arena/arena-room-live-messages.ts', () => ({
  addSystemMessage: mockAddSystemMessage,
  addMessage: vi.fn(),
}));

vi.mock('../src/arena/arena-mod-refs.ts', () => ({
  addReferenceButton: mockAddReferenceButton,
  assignSelectedMod: mockAssignSelectedMod,
  startReferencePoll: mockStartReferencePoll,
}));

vi.mock('../src/arena/arena-mod-queue-status.ts', () => ({
  startModStatusPoll: mockStartModStatusPoll,
}));

vi.mock('../src/bounties.ts', () => ({
  bountyDot: mockBountyDot,
}));

import { renderRoom } from '../src/arena/arena-room-render.ts';

const baseDebate = {
  id: 'debate-1',
  topic: 'Test topic',
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

describe('TC1 — renderRoom calls pushArenaState and set_currentDebate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockEquippedForDebate.value = [];
    mockIsPlaceholder.value = false;
    mockSelectedModerator.value = null;
  });

  it('calls pushArenaState with room', () => {
    renderRoom({ ...baseDebate });
    expect(mockPushArenaState).toHaveBeenCalledWith('room');
  });

  it('calls set_currentDebate with the debate', () => {
    const debate = { ...baseDebate };
    renderRoom(debate);
    expect(mockSet_currentDebate).toHaveBeenCalledWith(debate);
  });

  it('calls nudge on enter_debate', () => {
    renderRoom({ ...baseDebate });
    expect(mockNudge).toHaveBeenCalledWith('enter_debate', expect.any(String));
  });
});

describe('TC2 — renderRoom renders DOM structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockEquippedForDebate.value = [];
    mockIsPlaceholder.value = false;
    mockSelectedModerator.value = null;
  });

  it('appends arena-room div to screenEl', () => {
    renderRoom({ ...baseDebate });
    expect(document.querySelector('.arena-room')).not.toBeNull();
  });

  it('calls renderInputControls with debate mode', () => {
    renderRoom({ ...baseDebate });
    expect(mockRenderInputControls).toHaveBeenCalledWith('text');
  });

  it('calls addReferenceButton', () => {
    renderRoom({ ...baseDebate });
    expect(mockAddReferenceButton).toHaveBeenCalled();
  });

  it('calls addSystemMessage with round info', () => {
    renderRoom({ ...baseDebate });
    expect(mockAddSystemMessage).toHaveBeenCalledWith(expect.stringContaining('Round 1'));
  });
});

describe('TC3 — renderRoom live mode starts timer and audio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockEquippedForDebate.value = [];
    mockIsPlaceholder.value = false;
    mockSelectedModerator.value = null;
  });

  it('calls startLiveRoundTimer for live mode', () => {
    renderRoom({ ...baseDebate, mode: 'live' });
    expect(mockStartLiveRoundTimer).toHaveBeenCalled();
  });

  it('calls initLiveAudio for live mode', () => {
    renderRoom({ ...baseDebate, mode: 'live' });
    expect(mockInitLiveAudio).toHaveBeenCalled();
  });

  it('does not call startLiveRoundTimer for text mode', () => {
    renderRoom({ ...baseDebate, mode: 'text' });
    expect(mockStartLiveRoundTimer).not.toHaveBeenCalled();
  });
});

describe('TC4 — renderRoom ai mode calls safeRpc for real debate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockEquippedForDebate.value = [];
    mockIsPlaceholder.value = false;
    mockSelectedModerator.value = null;
  });

  it('calls safeRpc update_arena_debate for real ai debate', async () => {
    renderRoom({ ...baseDebate, mode: 'ai' });
    await Promise.resolve();
    expect(mockSafeRpc).toHaveBeenCalledWith('update_arena_debate', expect.objectContaining({ p_status: 'live' }));
  });

  it('does not call safeRpc for ai-local debates', async () => {
    renderRoom({ ...baseDebate, id: 'ai-local-123', mode: 'ai' });
    await Promise.resolve();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC5 — renderRoom starts mod status poll for non-mod text debates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockEquippedForDebate.value = [];
    mockIsPlaceholder.value = false;
    mockSelectedModerator.value = null;
  });

  it('calls startModStatusPoll for real text debate', () => {
    renderRoom({ ...baseDebate });
    expect(mockStartModStatusPoll).toHaveBeenCalledWith('debate-1');
  });

  it('does not call startModStatusPoll for modView debates', () => {
    renderRoom({ ...baseDebate, modView: true });
    expect(mockStartModStatusPoll).not.toHaveBeenCalled();
  });

  it('does not call startModStatusPoll for ai mode', () => {
    renderRoom({ ...baseDebate, mode: 'ai' });
    expect(mockStartModStatusPoll).not.toHaveBeenCalled();
  });
});

describe('ARCH — arena-room-render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      '../powerups.ts',
      '../nudge.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-constants.ts',
      './arena-core.utils.ts',
      './arena-room-live-input.ts',
      './arena-room-live-poll.ts',
      './arena-room-live-audio.ts',
      './arena-room-live-messages.ts',
      './arena-mod-refs.ts',
      './arena-mod-queue-status.ts',
      '../bounties.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-render.ts'),
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
