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

// ============================================================
// SEAM #284 — arena-lobby → powerups
// ============================================================

describe('SEAM #284 TC1 — showPowerUpShop redirects unauthenticated guest to plinko', () => {
  it('sets window.location.href to moderator-plinko.html when no user and not placeholder', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);

    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
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
    const mockBuy = vi.fn();
    const mockRenderShop = vi.fn().mockResolvedValue('<div class="powerup-shop"></div>');
    vi.doMock('../../src/powerups.ts', () => ({
      removeShieldIndicator: vi.fn(),
      renderShop: mockRenderShop,
      buy: mockBuy,
    }));
    vi.doMock('../../src/arena/arena-mod-refs.ts', () => ({
      stopReferencePoll: vi.fn(),
    }));

    const { set_screenEl } = await import('../../src/arena/arena-state.ts');
    set_screenEl(screenEl);

    // Capture location change
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
    } as Location);
    let hrefAssigned = '';
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        set href(val: string) { hrefAssigned = val; },
        get href() { return hrefAssigned; },
      },
      writable: true,
    });

    const { showPowerUpShop } = await import('../../src/arena/arena-lobby.ts');
    await showPowerUpShop();

    expect(hrefAssigned).toBe('moderator-plinko.html');
    expect(mockRenderShop).not.toHaveBeenCalled();

    locationSpy.mockRestore();
    vi.useRealTimers();
  });
});

describe('SEAM #284 TC2 — showPowerUpShop renders shop HTML for authenticated user', () => {
  it('calls renderShop(tokenBalance) and injects .powerup-shop into screenEl', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);

    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn().mockReturnValue({ id: 'user-abc' }),
      getCurrentProfile: vi.fn().mockReturnValue({ token_balance: 500, login_streak: 5 }),
      safeRpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    const mockRenderShop = vi.fn().mockReturnValue('<div class="powerup-shop">SHOP</div>');
    vi.doMock('../../src/powerups.ts', () => ({
      removeShieldIndicator: vi.fn(),
      renderShop: mockRenderShop,
      buy: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-refs.ts', () => ({
      stopReferencePoll: vi.fn(),
    }));

    const { set_screenEl } = await import('../../src/arena/arena-state.ts');
    set_screenEl(screenEl);

    const { showPowerUpShop } = await import('../../src/arena/arena-lobby.ts');
    await showPowerUpShop();

    expect(mockRenderShop).toHaveBeenCalledWith(500);
    expect(screenEl.querySelector('.powerup-shop')).not.toBeNull();

    vi.useRealTimers();
  });
});

describe('SEAM #284 TC3 — showPowerUpShop buy button calls buy_power_up RPC', () => {
  it('clicking .powerup-buy-btn triggers buy() with correct powerUpId and quantity=1', async () => {
    vi.resetModules();

    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);

    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn().mockReturnValue({ id: 'user-abc' }),
      getCurrentProfile: vi.fn().mockReturnValue({ token_balance: 500, login_streak: 5 }),
      safeRpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    const mockBuy = vi.fn().mockResolvedValue({ success: true });
    // renderShop returns HTML with a real buy button that showPowerUpShop will wire
    const mockRenderShop = vi.fn().mockReturnValue(
      '<div class="powerup-shop"><button class="powerup-buy-btn" data-id="shield" data-cost="50">50 🪙</button></div>'
    );
    vi.doMock('../../src/powerups.ts', () => ({
      removeShieldIndicator: vi.fn(),
      renderShop: mockRenderShop,
      buy: mockBuy,
    }));
    vi.doMock('../../src/arena/arena-mod-refs.ts', () => ({
      stopReferencePoll: vi.fn(),
    }));

    const { set_screenEl } = await import('../../src/arena/arena-state.ts');
    set_screenEl(screenEl);

    const { showPowerUpShop } = await import('../../src/arena/arena-lobby.ts');
    await showPowerUpShop();

    // Click the buy button
    const btn = screenEl.querySelector('.powerup-buy-btn') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();

    // Drain microtask queue — buy() is async, flush promise chain
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockBuy).toHaveBeenCalledWith('shield', 1, 50);
  });
});

describe('SEAM #284 TC4 — showPowerUpShop buy success shows toast and re-renders shop', () => {
  it('on successful buy(), calls buy_power_up once and shop re-renders', async () => {
    vi.resetModules();

    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);

    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn().mockReturnValue({ id: 'user-abc' }),
      getCurrentProfile: vi.fn().mockReturnValue({ token_balance: 500, login_streak: 5 }),
      safeRpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    const mockBuy = vi.fn().mockResolvedValue({ success: true });
    const mockRenderShop = vi.fn().mockReturnValue(
      '<div class="powerup-shop"><button class="powerup-buy-btn" data-id="silence" data-cost="75">75 🪙</button></div>'
    );
    vi.doMock('../../src/powerups.ts', () => ({
      removeShieldIndicator: vi.fn(),
      renderShop: mockRenderShop,
      buy: mockBuy,
    }));
    vi.doMock('../../src/arena/arena-mod-refs.ts', () => ({
      stopReferencePoll: vi.fn(),
    }));

    const { set_screenEl } = await import('../../src/arena/arena-state.ts');
    set_screenEl(screenEl);

    const { showPowerUpShop } = await import('../../src/arena/arena-lobby.ts');
    await showPowerUpShop();

    const btn = screenEl.querySelector('.powerup-buy-btn') as HTMLButtonElement;
    btn.click();

    // Drain promise chain for the click handler and re-render
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // buy called exactly once for the click
    expect(mockBuy).toHaveBeenCalledTimes(1);
    // renderShop called twice: initial render + re-render after success
    expect(mockRenderShop).toHaveBeenCalledTimes(2);
  });
});

describe('SEAM #284 TC5 — showPowerUpShop buy failure shows error toast without re-rendering', () => {
  it('on buy() returning success:false, renderShop is called only once (no re-render)', async () => {
    vi.resetModules();

    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);

    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      pushArenaState: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn().mockReturnValue({ id: 'user-abc' }),
      getCurrentProfile: vi.fn().mockReturnValue({ token_balance: 10, login_streak: 1 }),
      safeRpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    const mockBuy = vi.fn().mockResolvedValue({ success: false, error: 'Insufficient balance' });
    const mockRenderShop = vi.fn().mockReturnValue(
      '<div class="powerup-shop"><button class="powerup-buy-btn" data-id="shield" data-cost="50">50 🪙</button></div>'
    );
    vi.doMock('../../src/powerups.ts', () => ({
      removeShieldIndicator: vi.fn(),
      renderShop: mockRenderShop,
      buy: mockBuy,
    }));
    vi.doMock('../../src/arena/arena-mod-refs.ts', () => ({
      stopReferencePoll: vi.fn(),
    }));

    const { set_screenEl } = await import('../../src/arena/arena-state.ts');
    set_screenEl(screenEl);

    const { showPowerUpShop } = await import('../../src/arena/arena-lobby.ts');
    await showPowerUpShop();

    const btn = screenEl.querySelector('.powerup-buy-btn') as HTMLButtonElement;
    btn.click();

    // Drain promise chain for the click handler
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockBuy).toHaveBeenCalledTimes(1);
    // No re-render — renderShop called only once
    expect(mockRenderShop).toHaveBeenCalledTimes(1);
  });
});

describe('SEAM #284 TC6 — renderLobby removes powerup DOM overlays', () => {
  it('removes #powerup-shield-indicator, #powerup-silence-overlay, #powerup-reveal-popup on renderLobby', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);

    // Pre-seed the DOM with powerup overlays
    const shield = document.createElement('div');
    shield.id = 'powerup-shield-indicator';
    document.body.appendChild(shield);
    const silence = document.createElement('div');
    silence.id = 'powerup-silence-overlay';
    document.body.appendChild(silence);
    const reveal = document.createElement('div');
    reveal.id = 'powerup-reveal-popup';
    document.body.appendChild(reveal);

    const mockRemoveShieldIndicator = vi.fn(() => {
      document.getElementById('powerup-shield-indicator')?.remove();
    });

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
      removeShieldIndicator: mockRemoveShieldIndicator,
      renderShop: vi.fn().mockReturnValue('<div class="powerup-shop"></div>'),
      buy: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-refs.ts', () => ({
      stopReferencePoll: vi.fn(),
    }));

    const { set_screenEl } = await import('../../src/arena/arena-state.ts');
    set_screenEl(screenEl);

    const { renderLobby } = await import('../../src/arena/arena-lobby.ts');
    renderLobby();

    expect(document.getElementById('powerup-shield-indicator')).toBeNull();
    expect(document.getElementById('powerup-silence-overlay')).toBeNull();
    expect(document.getElementById('powerup-reveal-popup')).toBeNull();
    expect(mockRemoveShieldIndicator).toHaveBeenCalled();

    vi.useRealTimers();
  });
});

describe('SEAM #284 TC7 — renderShop disables buy buttons when balance is 0', () => {
  it('all .powerup-buy-btn elements have disabled attribute when token balance is zero', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    // Import the real renderShop to verify it correctly disables buttons
    const { renderShop } = await import('../../src/powerups.shop.ts');
    const html = renderShop(0);

    // Parse HTML
    const container = document.createElement('div');
    container.innerHTML = html;
    const buttons = container.querySelectorAll('.powerup-buy-btn');

    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach(btn => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });

    vi.useRealTimers();
  });
});

// ============================================================
// ARCH — seam #284
// ============================================================
describe('ARCH — seam #284', () => {
  it('src/arena/arena-lobby.ts imports buy and renderShop from powerups', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-lobby.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('powerups'))).toBe(true);
  });

  it('src/arena/arena-lobby.ts imports removeShieldIndicator from powerups', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-lobby.ts'), 'utf-8');
    expect(source).toContain('removeShieldIndicator');
    expect(source).toContain('powerups');
  });
});

// ============================================================
// SEAM #384 — arena-lobby → navigation
// ============================================================

describe('SEAM #384 TC1 — challenge CTA click calls navigateTo("home")', () => {
  it('clicking #arena-challenge-cta invokes the registered navigation handler with "home"', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);

    const mockNavigateFn = vi.fn();

    vi.doMock('../../src/navigation.ts', () => ({
      navigateTo: mockNavigateFn,
      registerNavigate: vi.fn(),
    }));
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

    const { set_screenEl } = await import('../../src/arena/arena-state.ts');
    set_screenEl(screenEl);

    const { renderLobby } = await import('../../src/arena/arena-lobby.ts');
    renderLobby();

    const cta = document.getElementById('arena-challenge-cta');
    expect(cta).not.toBeNull();
    cta!.click();

    expect(mockNavigateFn).toHaveBeenCalledWith('home');

    vi.useRealTimers();
  });
});

describe('SEAM #384 TC2 — navigateTo is a no-op before registerNavigate is called', () => {
  it('navigateTo("home") does not throw when no handler is registered', async () => {
    vi.resetModules();

    const { navigateTo } = await import('../../src/navigation.ts');

    // Should not throw
    expect(() => navigateTo('home')).not.toThrow();
  });
});

describe('SEAM #384 TC3 — registerNavigate stores handler, navigateTo invokes it', () => {
  it('after registerNavigate, navigateTo calls the registered fn with the screenId', async () => {
    // Use vi.importActual to bypass any vi.doMock factory for navigation.ts
    const navMod = await vi.importActual<typeof import('../../src/navigation.ts')>('../../src/navigation.ts');

    const handler = vi.fn();
    navMod.registerNavigate(handler);
    navMod.navigateTo('home');

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith('home');
  });
});

describe('SEAM #384 TC4 — navigateTo passes arbitrary screenId to handler', () => {
  it('navigateTo("settings") calls handler with "settings"', async () => {
    // Use vi.importActual to bypass any vi.doMock factory for navigation.ts
    const navMod = await vi.importActual<typeof import('../../src/navigation.ts')>('../../src/navigation.ts');

    const handler = vi.fn();
    navMod.registerNavigate(handler);
    navMod.navigateTo('settings');

    expect(handler).toHaveBeenCalledWith('settings');
  });
});

describe('SEAM #384 TC5 — challenge CTA is rendered in lobby DOM', () => {
  it('#arena-challenge-cta element exists in the DOM after renderLobby', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);

    vi.doMock('../../src/navigation.ts', () => ({
      navigateTo: vi.fn(),
      registerNavigate: vi.fn(),
    }));
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

    const { set_screenEl } = await import('../../src/arena/arena-state.ts');
    set_screenEl(screenEl);

    const { renderLobby } = await import('../../src/arena/arena-lobby.ts');
    renderLobby();

    const cta = document.getElementById('arena-challenge-cta');
    expect(cta).not.toBeNull();
    expect(cta!.querySelector('.arena-challenge-text')?.textContent).toContain('DISAGREE');

    vi.useRealTimers();
  });
});

// ============================================================
// ARCH — seam #428 | arena-lobby → arena-mod-refs
// ============================================================
describe('ARCH — seam #428 | arena-lobby → arena-mod-refs', () => {
  it('TC1: arena-lobby.ts imports stopReferencePoll from arena-mod-refs', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-lobby.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-mod-refs') && l.includes('stopReferencePoll'))).toBe(true);
  });

  it('TC2: stopReferencePoll is the only symbol imported from arena-mod-refs in arena-lobby.ts', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-lobby.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const modRefsImport = importLines.find(l => l.includes('arena-mod-refs'));
    expect(modRefsImport).toBeDefined();
    // Should only contain stopReferencePoll (not startReferencePoll, showRulingPanel, etc.)
    expect(modRefsImport).toContain('stopReferencePoll');
    expect(modRefsImport).not.toContain('startReferencePoll');
    expect(modRefsImport).not.toContain('showRulingPanel');
  });

  it('TC3: arena-mod-refs.ts re-exports stopReferencePoll from arena-mod-refs-ruling', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-refs.ts'), 'utf-8');
    expect(source).toContain('stopReferencePoll');
    expect(source).toContain('arena-mod-refs-ruling');
  });

  it('TC4: stopReferencePoll clears referencePollTimer when set', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    // Import both modules in the same reset cycle so they share the same state singleton
    const state = await import('../../src/arena/arena-state.ts');
    const { stopReferencePoll } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    // Install a live interval and store it in state
    const timer = setInterval(() => {}, 1000);
    state.set_referencePollTimer(timer);
    expect(state.referencePollTimer).not.toBeNull();

    stopReferencePoll();

    // After stop, state timer should be null
    expect(state.referencePollTimer).toBeNull();
    vi.useRealTimers();
  });

  it('TC5: stopReferencePoll is a no-op when referencePollTimer is null', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const state = await import('../../src/arena/arena-state.ts');
    const { stopReferencePoll } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    state.set_referencePollTimer(null);
    expect(() => stopReferencePoll()).not.toThrow();
    expect(state.referencePollTimer).toBeNull();
    vi.useRealTimers();
  });

  it('TC6: startReferencePoll is a no-op — installs no interval in arena-state', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const state = await import('../../src/arena/arena-state.ts');
    // Import from the sub-file directly (barrel mock may shadow the re-export)
    const { startReferencePoll } = await import('../../src/arena/arena-mod-refs-ruling.ts');

    state.set_referencePollTimer(null);
    startReferencePoll('some-debate-id');

    // referencePollTimer must remain null — startReferencePoll is retired (F-55)
    expect(state.referencePollTimer).toBeNull();
    vi.useRealTimers();
  });

  it('TC7: renderLobby calls stopReferencePoll (source contains stopReferencePoll() invocation)', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-lobby.ts'), 'utf-8');
    expect(source).toContain('stopReferencePoll()');
  });
});

// ============================================================
// ARCH — seam #384
// ============================================================
describe('ARCH — seam #384', () => {
  it('src/arena/arena-lobby.ts imports navigateTo from navigation', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-lobby.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('navigation'))).toBe(true);
  });

  it('src/arena/arena-lobby.ts uses navigateTo("home") in challenge CTA handler', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-lobby.ts'), 'utf-8');
    expect(source).toContain("navigateTo('home')");
  });
});

// ============================================================
// ARCH — seam #540 | arena-lobby → arena-private-picker
// ============================================================
describe('ARCH — seam #540 | arena-lobby → arena-private-picker', () => {
  it('TC1: arena-lobby.ts imports showPrivateLobbyPicker from arena-private-picker', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-lobby.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-private-picker'))).toBe(true);
    expect(importLines.some(l => l.includes('showPrivateLobbyPicker'))).toBe(true);
  });

  it('TC2: showPrivateLobbyPicker creates #arena-private-overlay and appends to body', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { getCurrentUser } = await import('../../src/auth.ts');
    // getCurrentUser returns null by default — trigger plinko redirect guard
    // We need a logged-in user so the overlay is created instead of redirecting
    const authModule = await import('../../src/auth.ts');
    vi.spyOn(authModule, 'getCurrentUser').mockReturnValue({ id: 'user-abc' } as ReturnType<typeof authModule.getCurrentUser>);

    const { showPrivateLobbyPicker } = await import('../../src/arena/arena-private-picker.ts');
    showPrivateLobbyPicker();
    const overlay = document.getElementById('arena-private-overlay');
    expect(overlay).not.toBeNull();
    vi.useRealTimers();
  });

  it('TC3: showPrivateLobbyPicker — clicking Cancel removes the overlay', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const authModule = await import('../../src/auth.ts');
    vi.spyOn(authModule, 'getCurrentUser').mockReturnValue({ id: 'user-abc' } as ReturnType<typeof authModule.getCurrentUser>);

    const { showPrivateLobbyPicker } = await import('../../src/arena/arena-private-picker.ts');
    showPrivateLobbyPicker();
    expect(document.getElementById('arena-private-overlay')).not.toBeNull();

    (document.getElementById('arena-private-cancel') as HTMLButtonElement).click();
    expect(document.getElementById('arena-private-overlay')).toBeNull();
    vi.useRealTimers();
  });

  it('TC4: showPrivateLobbyPicker — clicking backdrop removes the overlay', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const authModule = await import('../../src/auth.ts');
    vi.spyOn(authModule, 'getCurrentUser').mockReturnValue({ id: 'user-abc' } as ReturnType<typeof authModule.getCurrentUser>);

    const { showPrivateLobbyPicker } = await import('../../src/arena/arena-private-picker.ts');
    showPrivateLobbyPicker();
    expect(document.getElementById('arena-private-overlay')).not.toBeNull();

    (document.getElementById('arena-private-backdrop') as HTMLElement).click();
    expect(document.getElementById('arena-private-overlay')).toBeNull();
    vi.useRealTimers();
  });

  it('TC5: showUserSearchPicker — typing triggers search_users_by_username RPC after debounce', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    const mockSafeRpc = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: mockSafeRpc,
      getCurrentUser: vi.fn().mockReturnValue({ id: 'user-abc' }),
      getCurrentProfile: vi.fn().mockReturnValue(null),
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      pushArenaState: vi.fn(),
    }));

    const { showUserSearchPicker } = await import('../../src/arena/arena-private-picker.ts');
    showUserSearchPicker('text', 'Is pineapple on pizza valid?');

    const input = document.getElementById('arena-user-search-input') as HTMLInputElement;
    expect(input).not.toBeNull();

    input.value = 'alice';
    input.dispatchEvent(new Event('input'));

    // advance past the 350ms debounce
    await vi.advanceTimersByTimeAsync(400);

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'search_users_by_username',
      expect.objectContaining({ p_query: 'alice' })
    );
    vi.useRealTimers();
  });

  it('TC6: showGroupLobbyPicker — calls get_my_groups RPC and renders group rows', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    const mockSafeRpc = vi.fn().mockResolvedValue({
      data: [
        { id: 'g1', name: 'The Debaters', member_count: 5 },
        { id: 'g2', name: 'Sports Talk', member_count: 12 },
      ],
      error: null,
    });
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: mockSafeRpc,
      getCurrentUser: vi.fn().mockReturnValue({ id: 'user-abc' }),
      getCurrentProfile: vi.fn().mockReturnValue(null),
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      pushArenaState: vi.fn(),
    }));

    const { showGroupLobbyPicker } = await import('../../src/arena/arena-private-picker.ts');
    await showGroupLobbyPicker('text', 'Test topic');

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'get_my_groups',
      expect.anything(),
      expect.anything()
    );
    const listEl = document.getElementById('arena-group-pick-list');
    expect(listEl).not.toBeNull();
    expect(listEl!.querySelectorAll('.arena-group-row').length).toBe(2);
    vi.useRealTimers();
  });

  it('TC7: showGroupLobbyPicker — empty groups renders "not in any groups" message', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    const mockSafeRpc = vi.fn().mockResolvedValue({ data: [], error: null });
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: mockSafeRpc,
      getCurrentUser: vi.fn().mockReturnValue({ id: 'user-abc' }),
      getCurrentProfile: vi.fn().mockReturnValue(null),
      toggleModerator: vi.fn(),
      onChange: vi.fn(),
      ready: Promise.resolve(),
      isUUID: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      refreshProfile: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      pushArenaState: vi.fn(),
    }));

    const { showGroupLobbyPicker } = await import('../../src/arena/arena-private-picker.ts');
    await showGroupLobbyPicker('text', 'Test topic');

    const listEl = document.getElementById('arena-group-pick-list');
    expect(listEl).not.toBeNull();
    expect(listEl!.textContent).toContain("not in any groups");
    vi.useRealTimers();
  });
});
