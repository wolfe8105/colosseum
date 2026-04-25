import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [], error: null }));
const mockGetCurrentUser = vi.hoisted(() => vi.fn().mockReturnValue({ id: 'user-1' }));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn().mockReturnValue({ token_balance: 100, login_streak: 3, is_moderator: false }));
const mockToggleModerator = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockBuyPowerUp = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true }));
const mockRenderShop = vi.hoisted(() => vi.fn().mockResolvedValue('<div>shop</div>'));
const mockRemoveShieldIndicator = vi.hoisted(() => vi.fn());
const mockNavigateTo = vi.hoisted(() => vi.fn());

const mockScreenEl = vi.hoisted(() => ({ value: null as HTMLElement | null }));
const mockActivatedPowerUps = vi.hoisted(() => new Set<string>());
const mockPrivateLobbyPollTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockPrivateLobbyDebateId = vi.hoisted(() => ({ value: null as string | null }));
const mockSilenceTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));

const mockSet_view = vi.hoisted(() => vi.fn());
const mockSet_selectedMode = vi.hoisted(() => vi.fn());
const mockSet_selectedModerator = vi.hoisted(() => vi.fn());
const mockSet_selectedRanked = vi.hoisted(() => vi.fn());
const mockSet_selectedRuleset = vi.hoisted(() => vi.fn());
const mockSet_selectedCategory = vi.hoisted(() => vi.fn());
const mockSet_selectedWantMod = vi.hoisted(() => vi.fn());
const mockSet_privateLobbyPollTimer = vi.hoisted(() => vi.fn());
const mockSet_privateLobbyDebateId = vi.hoisted(() => vi.fn());
const mockSet_shieldActive = vi.hoisted(() => vi.fn());
const mockSet_equippedForDebate = vi.hoisted(() => vi.fn());
const mockSet_silenceTimer = vi.hoisted(() => vi.fn());

const mockIsPlaceholder = vi.hoisted(() => ({ value: false }));
const mockPushArenaState = vi.hoisted(() => vi.fn());
const mockShowRankedPicker = vi.hoisted(() => vi.fn());
const mockShowPrivateLobbyPicker = vi.hoisted(() => vi.fn());
const mockShowModQueue = vi.hoisted(() => vi.fn());
const mockJoinWithCode = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLoadPendingChallenges = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLoadMyOpenDebates = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockStopReferencePoll = vi.hoisted(() => vi.fn());
const mockEnterFeedRoomAsSpectator = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRenderArenaFeedCard = vi.hoisted(() => vi.fn().mockReturnValue('<div class="arena-card"></div>'));
const mockRenderAutoDebateCard = vi.hoisted(() => vi.fn().mockReturnValue('<div class="arena-card"></div>'));
const mockRenderPlaceholderCards = vi.hoisted(() => vi.fn().mockReturnValue('<div>placeholder</div>'));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
  toggleModerator: mockToggleModerator,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

vi.mock('../src/powerups.ts', () => ({
  buy: mockBuyPowerUp,
  renderShop: mockRenderShop,
  removeShieldIndicator: mockRemoveShieldIndicator,
}));

vi.mock('../src/navigation.ts', () => ({
  navigateTo: mockNavigateTo,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get screenEl() { return mockScreenEl.value; },
  get selectedRuleset() { return 'amplified'; },
  get selectedRanked() { return false; },
  get privateLobbyPollTimer() { return mockPrivateLobbyPollTimer.value; },
  get privateLobbyDebateId() { return mockPrivateLobbyDebateId.value; },
  get activatedPowerUps() { return mockActivatedPowerUps; },
  get shieldActive() { return false; },
  get silenceTimer() { return mockSilenceTimer.value; },
  set_view: mockSet_view,
  set_selectedMode: mockSet_selectedMode,
  set_selectedModerator: mockSet_selectedModerator,
  set_selectedRanked: mockSet_selectedRanked,
  set_selectedRuleset: mockSet_selectedRuleset,
  set_selectedCategory: mockSet_selectedCategory,
  set_selectedWantMod: mockSet_selectedWantMod,
  set_privateLobbyPollTimer: mockSet_privateLobbyPollTimer,
  set_privateLobbyDebateId: mockSet_privateLobbyDebateId,
  set_shieldActive: mockSet_shieldActive,
  set_equippedForDebate: mockSet_equippedForDebate,
  set_silenceTimer: mockSet_silenceTimer,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  get isPlaceholder() { return () => mockIsPlaceholder.value; },
  pushArenaState: mockPushArenaState,
}));

vi.mock('../src/arena/arena-config-settings.ts', () => ({
  showRankedPicker: mockShowRankedPicker,
}));

vi.mock('../src/arena/arena-private-picker.ts', () => ({
  showPrivateLobbyPicker: mockShowPrivateLobbyPicker,
}));

vi.mock('../src/arena/arena-mod-queue-browse.ts', () => ({
  showModQueue: mockShowModQueue,
}));

vi.mock('../src/arena/arena-private-lobby.join.ts', () => ({
  joinWithCode: mockJoinWithCode,
}));

vi.mock('../src/arena/arena-pending-challenges.ts', () => ({
  loadPendingChallenges: mockLoadPendingChallenges,
}));

vi.mock('../src/arena/arena-lobby.open-debates.ts', () => ({
  loadMyOpenDebates: mockLoadMyOpenDebates,
}));

vi.mock('../src/arena/arena-mod-refs.ts', () => ({
  stopReferencePoll: mockStopReferencePoll,
}));

vi.mock('../src/arena/arena-feed-room.ts', () => ({
  enterFeedRoomAsSpectator: mockEnterFeedRoomAsSpectator,
}));

vi.mock('../src/arena/arena-lobby.cards.ts', () => ({
  renderArenaFeedCard: mockRenderArenaFeedCard,
  renderAutoDebateCard: mockRenderAutoDebateCard,
  renderPlaceholderCards: mockRenderPlaceholderCards,
}));

import { renderLobby, loadLobbyFeed, showPowerUpShop } from '../src/arena/arena-lobby.ts';

describe('TC1 — renderLobby resets state and renders DOM', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockPrivateLobbyPollTimer.value = null;
    mockSilenceTimer.value = null;
    mockIsPlaceholder.value = false;
  });

  it('calls set_view with lobby', () => {
    renderLobby();
    expect(mockSet_view).toHaveBeenCalledWith('lobby');
  });

  it('renders arena-lobby div', () => {
    renderLobby();
    expect(document.querySelector('.arena-lobby')).not.toBeNull();
  });

  it('calls stopReferencePoll', () => {
    renderLobby();
    expect(mockStopReferencePoll).toHaveBeenCalled();
  });

  it('calls loadPendingChallenges for non-placeholder', () => {
    renderLobby();
    expect(mockLoadPendingChallenges).toHaveBeenCalled();
  });

  it('does not call loadPendingChallenges in placeholder mode', () => {
    mockIsPlaceholder.value = true;
    renderLobby();
    expect(mockLoadPendingChallenges).not.toHaveBeenCalled();
  });
});

describe('TC2 — renderLobby wires buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockPrivateLobbyPollTimer.value = null;
    mockSilenceTimer.value = null;
    mockIsPlaceholder.value = false;
  });

  it('enter button calls showRankedPicker', () => {
    renderLobby();
    document.getElementById('arena-enter-btn')?.click();
    expect(mockShowRankedPicker).toHaveBeenCalled();
  });

  it('private button calls showPrivateLobbyPicker', () => {
    renderLobby();
    document.getElementById('arena-private-btn')?.click();
    expect(mockShowPrivateLobbyPicker).toHaveBeenCalled();
  });

  it('join code button calls joinWithCode with 5-char code', () => {
    renderLobby();
    const input = document.getElementById('arena-join-code-input') as HTMLInputElement;
    Object.defineProperty(input, 'value', { value: 'ABCDE', writable: true, configurable: true });
    document.getElementById('arena-join-code-btn')?.click();
    expect(mockJoinWithCode).toHaveBeenCalledWith('ABCDE');
  });

  it('join code button shows toast for invalid code', () => {
    renderLobby();
    const input = document.getElementById('arena-join-code-input') as HTMLInputElement;
    Object.defineProperty(input, 'value', { value: 'AB', writable: true, configurable: true });
    document.getElementById('arena-join-code-btn')?.click();
    expect(mockShowToast).toHaveBeenCalled();
    expect(mockJoinWithCode).not.toHaveBeenCalled();
  });
});

describe('TC3 — loadLobbyFeed calls safeRpc get_arena_feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="arena-live-feed"></div>
      <div id="arena-verdicts-feed"></div>
      <div id="arena-unplugged-feed"></div>
    `;
    mockIsPlaceholder.value = false;
  });

  it('calls safeRpc with get_arena_feed', async () => {
    await loadLobbyFeed();
    expect(mockSafeRpc).toHaveBeenCalledWith('get_arena_feed', { p_limit: 20 });
  });

  it('renders placeholder cards when no data', async () => {
    mockSafeRpc.mockResolvedValueOnce({ data: [], error: null });
    await loadLobbyFeed();
    expect(mockRenderPlaceholderCards).toHaveBeenCalled();
  });

  it('renders live feed cards from data', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: [
        { id: 'd-1', status: 'live', ruleset: 'amplified', topic: 'AI' },
        { id: 'd-2', status: 'complete', ruleset: 'amplified', topic: 'Tech' },
      ],
      error: null,
    });
    await loadLobbyFeed();
    expect(mockRenderArenaFeedCard).toHaveBeenCalled();
  });

  it('renders placeholder cards in placeholder mode', async () => {
    mockIsPlaceholder.value = true;
    await loadLobbyFeed();
    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(mockRenderPlaceholderCards).toHaveBeenCalled();
  });
});

describe('TC4 — showPowerUpShop renders shop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockIsPlaceholder.value = false;
  });

  it('calls set_view with powerUpShop', async () => {
    await showPowerUpShop();
    expect(mockSet_view).toHaveBeenCalledWith('powerUpShop');
  });

  it('calls pushArenaState with powerUpShop', async () => {
    await showPowerUpShop();
    expect(mockPushArenaState).toHaveBeenCalledWith('powerUpShop');
  });

  it('calls renderShop with token balance', async () => {
    await showPowerUpShop();
    expect(mockRenderShop).toHaveBeenCalledWith(100);
  });
});

describe('ARCH — arena-lobby.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      '../powerups.ts',
      '../navigation.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-feed-list.ts',
      './arena-core.utils.ts',
      './arena-config-settings.ts',
      './arena-private-picker.ts',
      './arena-mod-queue-browse.ts',
      './arena-private-lobby.join.ts',
      './arena-pending-challenges.ts',
      './arena-lobby.open-debates.ts',
      './arena-mod-refs.ts',
      './arena-feed-room.ts',
      './arena-lobby.cards.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-lobby.ts'),
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
