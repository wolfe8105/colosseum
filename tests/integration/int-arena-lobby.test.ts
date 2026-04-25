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

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = '<div id="screen-main"></div>';
});

// ============================================================
// TC1 — renderLobby sets view state to 'lobby'
// ============================================================
describe('TC1 — renderLobby sets view to lobby', () => {
  it('calls set_view("lobby") so the arena-state view binding becomes "lobby"', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const { set_view, set_screenEl } = await import('../../src/arena/arena-state.ts');
    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);
    set_screenEl(screenEl);

    // Spy on set_view via the state module binding
    const stateMod = await import('../../src/arena/arena-state.ts');
    const setViewSpy = vi.spyOn(stateMod, 'set_view');

    // Mock deps that renderLobby touches
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(true),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn().mockReturnValue(null),
      getCurrentProfile: vi.fn().mockReturnValue(null),
      safeRpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      removeShieldIndicator: vi.fn(),
      renderShop: vi.fn().mockResolvedValue('<div></div>'),
      buy: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-refs.ts', () => ({
      stopReferencePoll: vi.fn(),
    }));

    vi.resetModules();
    const { set_screenEl: setSE2 } = await import('../../src/arena/arena-state.ts');
    setSE2(screenEl);

    const { renderLobby } = await import('../../src/arena/arena-lobby.ts');
    renderLobby();

    const { view } = await import('../../src/arena/arena-state.ts');
    expect(view).toBe('lobby');

    vi.useRealTimers();
  });
});

// ============================================================
// TC2 — renderLobby resets selectedRanked to false
// ============================================================
describe('TC2 — renderLobby resets selectedRanked to false', () => {
  it('calls set_selectedRanked(false) so selectedRanked binding is false after renderLobby', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.resetModules();

    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);

    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(true),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn().mockReturnValue(null),
      getCurrentProfile: vi.fn().mockReturnValue(null),
      safeRpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      removeShieldIndicator: vi.fn(),
      renderShop: vi.fn().mockResolvedValue('<div></div>'),
      buy: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-refs.ts', () => ({
      stopReferencePoll: vi.fn(),
    }));

    const { set_screenEl, set_selectedRanked } = await import('../../src/arena/arena-state.ts');
    set_screenEl(screenEl);
    set_selectedRanked(true); // prime it to true first

    const { renderLobby } = await import('../../src/arena/arena-lobby.ts');
    renderLobby();

    const { selectedRanked } = await import('../../src/arena/arena-state.ts');
    expect(selectedRanked).toBe(false);

    vi.useRealTimers();
  });
});

// ============================================================
// TC3 — renderLobby resets selectedRuleset to 'amplified'
// ============================================================
describe('TC3 — renderLobby resets selectedRuleset to amplified', () => {
  it('calls set_selectedRuleset("amplified") so selectedRuleset binding becomes "amplified"', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.resetModules();

    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);

    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(true),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn().mockReturnValue(null),
      getCurrentProfile: vi.fn().mockReturnValue(null),
      safeRpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      removeShieldIndicator: vi.fn(),
      renderShop: vi.fn().mockResolvedValue('<div></div>'),
      buy: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-refs.ts', () => ({
      stopReferencePoll: vi.fn(),
    }));

    const { set_screenEl, set_selectedRuleset } = await import('../../src/arena/arena-state.ts');
    set_screenEl(screenEl);
    set_selectedRuleset('unplugged'); // prime to non-default

    const { renderLobby } = await import('../../src/arena/arena-lobby.ts');
    renderLobby();

    const { selectedRuleset } = await import('../../src/arena/arena-state.ts');
    expect(selectedRuleset).toBe('amplified');

    vi.useRealTimers();
  });
});

// ============================================================
// TC4 — renderLobby clears privateLobbyPollTimer if set
// ============================================================
describe('TC4 — renderLobby clears privateLobbyPollTimer', () => {
  it('clearInterval is called on the existing privateLobbyPollTimer and state is set to null', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.resetModules();

    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);

    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(true),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn().mockReturnValue(null),
      getCurrentProfile: vi.fn().mockReturnValue(null),
      safeRpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      removeShieldIndicator: vi.fn(),
      renderShop: vi.fn().mockResolvedValue('<div></div>'),
      buy: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-refs.ts', () => ({
      stopReferencePoll: vi.fn(),
    }));

    const { set_screenEl, set_privateLobbyPollTimer } = await import('../../src/arena/arena-state.ts');
    set_screenEl(screenEl);
    // Set a real-ish interval handle
    const fakeTimer = setInterval(() => {}, 10000);
    set_privateLobbyPollTimer(fakeTimer);

    const { renderLobby } = await import('../../src/arena/arena-lobby.ts');
    renderLobby();

    const { privateLobbyPollTimer } = await import('../../src/arena/arena-state.ts');
    expect(privateLobbyPollTimer).toBeNull();

    vi.useRealTimers();
  });
});

// ============================================================
// TC5 — loadLobbyFeed calls rpc('get_arena_feed', { p_limit: 20 })
// ============================================================
describe('TC5 — loadLobbyFeed calls get_arena_feed RPC with p_limit:20', () => {
  it('invokes rpc("get_arena_feed", { p_limit: 20 }) when not in placeholder mode', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.resetModules();

    document.body.innerHTML = `
      <div id="arena-live-feed"></div>
      <div id="arena-verdicts-feed"></div>
      <div id="arena-unplugged-feed"></div>
    `;

    const mockSafeRpc = vi.fn().mockResolvedValue({ data: [], error: null });

    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn().mockReturnValue({ id: 'user-1' }),
      getCurrentProfile: vi.fn().mockReturnValue({ token_balance: 50, login_streak: 3 }),
      safeRpc: mockSafeRpc,
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      removeShieldIndicator: vi.fn(),
      renderShop: vi.fn().mockResolvedValue('<div></div>'),
      buy: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-refs.ts', () => ({
      stopReferencePoll: vi.fn(),
    }));

    const { loadLobbyFeed } = await import('../../src/arena/arena-lobby.ts');
    await loadLobbyFeed();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_arena_feed', { p_limit: 20 });

    vi.useRealTimers();
  });
});

// ============================================================
// TC6 — loadLobbyFeed renders live cards into #arena-live-feed
// ============================================================
describe('TC6 — loadLobbyFeed populates #arena-live-feed with live debate cards', () => {
  it('sets innerHTML of #arena-live-feed when live debates are returned by RPC', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.resetModules();

    document.body.innerHTML = `
      <div id="arena-live-feed"></div>
      <div id="arena-verdicts-feed"></div>
      <div id="arena-unplugged-feed"></div>
    `;

    const liveDebate = {
      debate_id: 'debate-111',
      status: 'live',
      ruleset: 'amplified',
      source: 'matchmaking',
      topic: 'Is pineapple valid on pizza?',
      pro_username: 'alpha',
      con_username: 'beta',
      pro_elo: 1200,
      con_elo: 1100,
    };

    const mockSafeRpc = vi.fn().mockResolvedValue({ data: [liveDebate], error: null });

    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn().mockReturnValue({ id: 'user-1' }),
      getCurrentProfile: vi.fn().mockReturnValue({ token_balance: 50, login_streak: 3 }),
      safeRpc: mockSafeRpc,
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      removeShieldIndicator: vi.fn(),
      renderShop: vi.fn().mockResolvedValue('<div></div>'),
      buy: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-refs.ts', () => ({
      stopReferencePoll: vi.fn(),
    }));

    const { loadLobbyFeed } = await import('../../src/arena/arena-lobby.ts');
    await loadLobbyFeed();

    const liveFeed = document.getElementById('arena-live-feed');
    // Should have content (not the empty placeholder)
    expect(liveFeed?.innerHTML).not.toBe('');
    expect(liveFeed?.innerHTML).not.toContain('No live debates right now');

    vi.useRealTimers();
  });
});

// ============================================================
// TC7 — loadLobbyFeed renders empty state when no live debates
// ============================================================
describe('TC7 — loadLobbyFeed shows empty state when RPC returns no live debates', () => {
  it('populates #arena-live-feed with empty message when no live debates are returned', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.resetModules();

    document.body.innerHTML = `
      <div id="arena-live-feed"></div>
      <div id="arena-verdicts-feed"></div>
      <div id="arena-unplugged-feed"></div>
    `;

    // Only a complete debate (verdict), no live ones
    const completeDebate = {
      debate_id: 'debate-222',
      status: 'complete',
      ruleset: 'amplified',
      source: 'matchmaking',
      topic: 'Best OS?',
      pro_username: 'charlie',
      con_username: 'delta',
      pro_elo: 1300,
      con_elo: 1250,
    };

    const mockSafeRpc = vi.fn().mockResolvedValue({ data: [completeDebate], error: null });

    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn().mockReturnValue({ id: 'user-1' }),
      getCurrentProfile: vi.fn().mockReturnValue({ token_balance: 50, login_streak: 3 }),
      safeRpc: mockSafeRpc,
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      removeShieldIndicator: vi.fn(),
      renderShop: vi.fn().mockResolvedValue('<div></div>'),
      buy: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-refs.ts', () => ({
      stopReferencePoll: vi.fn(),
    }));

    const { loadLobbyFeed } = await import('../../src/arena/arena-lobby.ts');
    await loadLobbyFeed();

    const liveFeed = document.getElementById('arena-live-feed');
    expect(liveFeed?.innerHTML).toContain('No live debates right now');

    vi.useRealTimers();
  });
});

// ============================================================
// ARCH — seam #048
// ============================================================
describe('ARCH — seam #048', () => {
  it('src/arena/arena-lobby.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-lobby.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});
