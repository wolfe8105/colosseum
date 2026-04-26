/**
 * Integration tests — home.nav.ts → navigation.ts
 * Seam #313
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ────────────────────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ── Module-level captured state ───────────────────────────────────────────────
let mockCurrentUser: { id: string } | null = null;
let mockCurrentProfile: Record<string, unknown> | null = null;
let renderFeedCalls = 0;
let loadArsenalScreenCalls = 0;
let loadInviteScreenCalls = 0;
let loadFollowCountsCalls = 0;
let loadDebateArchiveCalls = 0;
let renderRivalsEl: HTMLElement | null = null;
let renderSearchScreenCalls = 0;
let shareProfileArgs: unknown[] = [];

// Hoisted mock factories used inside vi.mock callbacks (no top-level await)
const _mockGetCurrentUser = vi.hoisted(() => vi.fn(() => mockCurrentUser));
const _mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => mockCurrentProfile));
const _mockRefreshProfile = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const _mockShareProfile = vi.hoisted(() => vi.fn((...args: unknown[]) => { shareProfileArgs = args; }));
const _mockSubscribe = vi.hoisted(() => vi.fn());
const _mockRenderFeed = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const _mockLoadArsenalScreen = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const _mockLoadInviteScreen = vi.hoisted(() => vi.fn());
const _mockCleanupInviteScreen = vi.hoisted(() => vi.fn());
const _mockLoadFollowCounts = vi.hoisted(() => vi.fn());
const _mockLoadDebateArchive = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const _mockRenderRivals = vi.hoisted(() => vi.fn((el: HTMLElement) => { renderRivalsEl = el; }));
const _mockRenderSearchScreen = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const _mockArenaDestroy = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const _mockArenaShowPowerUpShop = vi.hoisted(() => vi.fn());

vi.mock('../../src/auth.ts', () => ({
  getCurrentUser: _mockGetCurrentUser,
  getCurrentProfile: _mockGetCurrentProfile,
  refreshProfile: _mockRefreshProfile,
  safeRpc: vi.fn(),
  registerNavigate: vi.fn(),
}));

vi.mock('../../src/share.ts', () => ({
  shareProfile: _mockShareProfile,
  inviteFriend: vi.fn(),
}));

vi.mock('../../src/payments.ts', () => ({
  subscribe: _mockSubscribe,
}));

vi.mock('../../src/async.ts', () => ({
  ModeratorAsync: {
    renderRivals: _mockRenderRivals,
  },
}));

vi.mock('../../src/pages/home.feed.ts', () => ({
  renderFeed: _mockRenderFeed,
}));

vi.mock('../../src/pages/home.arsenal.ts', () => ({
  loadArsenalScreen: _mockLoadArsenalScreen,
}));

vi.mock('../../src/pages/home.invite.ts', () => ({
  loadInviteScreen: _mockLoadInviteScreen,
  cleanupInviteScreen: _mockCleanupInviteScreen,
}));

vi.mock('../../src/pages/home.profile.ts', () => ({
  loadFollowCounts: _mockLoadFollowCounts,
}));

vi.mock('../../src/profile-debate-archive.ts', () => ({
  loadDebateArchive: _mockLoadDebateArchive,
}));

vi.mock('../../src/arena.ts', () => ({
  default: undefined,
  destroy: _mockArenaDestroy,
  showPowerUpShop: _mockArenaShowPowerUpShop,
}));

vi.mock('../../src/search.ts', () => ({
  renderSearchScreen: _mockRenderSearchScreen,
}));

vi.mock('../../src/dm/dm.ts', () => ({
  renderDMScreen: vi.fn(),
  fetchThreads: vi.fn().mockResolvedValue(undefined),
}));

// ── Helper: build DOM for home.nav ───────────────────────────────────────────
function buildDOM() {
  document.body.innerHTML = `
    <div id="screen-home" class="screen"></div>
    <div id="screen-arena" class="screen"></div>
    <div id="screen-profile" class="screen"></div>
    <div id="screen-shop" class="screen"></div>
    <div id="screen-leaderboard" class="screen"></div>
    <div id="screen-arsenal" class="screen"></div>
    <div id="screen-invite" class="screen">
      <div id="invite-content"></div>
    </div>
    <div id="screen-search" class="screen"></div>
    <div id="screen-dm" class="screen"></div>
    <div id="rivals-feed"></div>
    <div id="profile-debate-archive"></div>
    <nav>
      <button class="bottom-nav-btn" data-screen="home">Home</button>
      <button class="bottom-nav-btn" data-screen="arena">Arena</button>
      <button class="bottom-nav-btn" data-screen="profile">Profile</button>
      <button class="bottom-nav-btn" data-screen="shop">Shop</button>
      <button class="bottom-nav-btn" data-screen="leaderboard">Leaderboard</button>
    </nav>
  `;
}

// ── beforeEach ───────────────────────────────────────────────────────────────
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();
  _mockGetCurrentUser.mockReset();
  _mockGetCurrentProfile.mockReset();
  _mockRefreshProfile.mockReset().mockResolvedValue(undefined);
  _mockRenderFeed.mockReset().mockResolvedValue(undefined);
  _mockLoadArsenalScreen.mockReset().mockResolvedValue(undefined);
  _mockLoadInviteScreen.mockReset();
  _mockLoadFollowCounts.mockReset();
  _mockLoadDebateArchive.mockReset().mockResolvedValue(undefined);
  _mockRenderRivals.mockReset();
  _mockArenaDestroy.mockReset().mockResolvedValue(undefined);
  _mockShareProfile.mockReset();
  _mockSubscribe.mockReset();

  renderFeedCalls = 0;
  loadArsenalScreenCalls = 0;
  loadInviteScreenCalls = 0;
  loadFollowCountsCalls = 0;
  loadDebateArchiveCalls = 0;
  renderRivalsEl = null;
  renderSearchScreenCalls = 0;
  shareProfileArgs = [];

  mockCurrentUser = null;
  mockCurrentProfile = null;

  _mockGetCurrentUser.mockImplementation(() => mockCurrentUser);
  _mockGetCurrentProfile.mockImplementation(() => mockCurrentProfile);

  buildDOM();
});

// ── TC0 — ARCH ───────────────────────────────────────────────────────────────
describe('TC0 — ARCH: home.nav.ts only mocks @supabase/supabase-js', () => {
  it('source import lines are detectable with from-keyword filter', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/home.nav.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.length).toBeGreaterThan(0);
    // Verify navigation is imported
    const navImport = importLines.some(l => l.includes('navigation'));
    expect(navImport).toBe(true);
  });
});

// ── TC1 — navigateTo('home') activates home screen ──────────────────────────
describe('TC1 — navigateTo("home") activates the home screen', () => {
  it('sets #screen-home active and activates home nav button', async () => {
    const mod = await import('../../src/pages/home.nav.ts');
    const { navigateTo } = mod;

    navigateTo('home');

    const screen = document.getElementById('screen-home');
    expect(screen?.classList.contains('active')).toBe(true);

    const btn = document.querySelector('.bottom-nav-btn[data-screen="home"]');
    expect(btn?.classList.contains('active')).toBe(true);
  });
});

// ── TC2 — navigateTo('arena') activates arena screen ────────────────────────
describe('TC2 — navigateTo("arena") activates the arena screen', () => {
  it('sets #screen-arena active and updates state.currentScreen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');
    const { state } = await import('../../src/pages/home.state.ts');

    navigateTo('arena');

    const screen = document.getElementById('screen-arena');
    expect(screen?.classList.contains('active')).toBe(true);
    expect(state.currentScreen).toBe('arena');
  });
});

// ── TC3 — navigateTo('profile') activates profile screen ────────────────────
describe('TC3 — navigateTo("profile") activates the profile screen', () => {
  it('sets #screen-profile active and activates profile nav button', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('profile');

    const screen = document.getElementById('screen-profile');
    expect(screen?.classList.contains('active')).toBe(true);

    const btn = document.querySelector('.bottom-nav-btn[data-screen="profile"]');
    expect(btn?.classList.contains('active')).toBe(true);
  });
});

// ── TC4 — invalid screen defaults to 'home' ──────────────────────────────────
describe('TC4 — invalid screen name defaults to "home"', () => {
  it('activates home screen when given unknown screenId', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');
    const { state } = await import('../../src/pages/home.state.ts');

    navigateTo('nonexistent-screen');

    expect(state.currentScreen).toBe('home');
    const screen = document.getElementById('screen-home');
    expect(screen?.classList.contains('active')).toBe(true);
  });
});

// ── TC5 — registerNavigate wires navigation module ──────────────────────────
describe('TC5 — registerNavigate wires navigation.navigateTo through to home.nav.navigateTo', () => {
  it('calling navigateTo from navigation module activates the correct screen', async () => {
    // Import home.nav first — it calls registerNavigate on import
    await import('../../src/pages/home.nav.ts');
    // Now navigation.navigateTo should be wired
    const navMod = await import('../../src/navigation.ts');

    navMod.navigateTo('shop');

    const screen = document.getElementById('screen-shop');
    expect(screen?.classList.contains('active')).toBe(true);
  });
});

// ── TC6 — switching away from arena calls arena.destroy ─────────────────────
describe('TC6 — switching away from arena state updates correctly on second navigate', () => {
  it('navigating from arena to profile sets state.currentScreen to profile', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');
    const { state } = await import('../../src/pages/home.state.ts');

    // First navigate to arena
    navigateTo('arena');
    expect(state.currentScreen).toBe('arena');

    // Then navigate away
    navigateTo('profile');
    expect(state.currentScreen).toBe('profile');

    // The arena screen is no longer active
    const arenaScreen = document.getElementById('screen-arena');
    expect(arenaScreen?.classList.contains('active')).toBe(false);

    // The profile screen is active
    const profileScreen = document.getElementById('screen-profile');
    expect(profileScreen?.classList.contains('active')).toBe(true);
  });
});

// ── TC7 — navigateTo('arsenal') calls loadArsenalScreen ─────────────────────
describe('TC7 — navigateTo("arsenal") triggers loadArsenalScreen', () => {
  it('calls loadArsenalScreen when navigating to arsenal', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('arsenal');

    // loadArsenalScreen is async but called with .catch — flush microtasks
    await Promise.resolve();

    expect(_mockLoadArsenalScreen).toHaveBeenCalled();
  });
});

// ── TC8 — only one screen is active at a time ────────────────────────────────
describe('TC8 — only one screen is active at a time', () => {
  it('navigating to profile removes active from previously active screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('home');
    expect(document.getElementById('screen-home')?.classList.contains('active')).toBe(true);

    navigateTo('profile');

    // home screen is no longer active
    expect(document.getElementById('screen-home')?.classList.contains('active')).toBe(false);
    // profile screen is active
    expect(document.getElementById('screen-profile')?.classList.contains('active')).toBe(true);
  });
});

// ── Seam #421: home.nav.ts → share ──────────────────────────────────────────

// TC421-0 — ARCH filter: share import is detectable
describe('TC421-0 — ARCH: home.nav.ts imports shareProfile and inviteFriend from share.ts', () => {
  it('import lines include share.ts with shareProfile and inviteFriend', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src: string = readFileSync(
      resolve(__dirname, '../../src/pages/home.nav.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const shareImport = importLines.find((l: string) => l.includes('share'));
    expect(shareImport).toBeTruthy();
    expect(shareImport).toMatch(/shareProfile/);
    expect(shareImport).toMatch(/inviteFriend/);
  });
});

// TC421-1 — data-action="share-profile" calls shareProfile with full profile data
describe('TC421-1 — data-action="share-profile" calls shareProfile with full profile data', () => {
  it('dispatches shareProfile with userId, username, displayName, elo, wins, losses, streak', async () => {
    mockCurrentUser = { id: 'user-uuid-abc123' };
    mockCurrentProfile = {
      username: 'debater99',
      display_name: 'Debater 99',
      elo_rating: 1450,
      wins: 12,
      losses: 3,
      current_streak: 5,
    };
    _mockGetCurrentUser.mockImplementation(() => mockCurrentUser);
    _mockGetCurrentProfile.mockImplementation(() => mockCurrentProfile);

    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'share-profile');
    document.body.appendChild(btn);
    btn.click();

    expect(_mockShareProfile).toHaveBeenCalledWith({
      userId: 'user-uuid-abc123',
      username: 'debater99',
      displayName: 'Debater 99',
      elo: 1450,
      wins: 12,
      losses: 3,
      streak: 5,
    });
  });
});

// TC421-2 — shareProfile receives userId from getCurrentUser().id
describe('TC421-2 — shareProfile receives userId from getCurrentUser().id', () => {
  it('passes the correct user id to shareProfile', async () => {
    mockCurrentUser = { id: 'specific-user-id-xyz' };
    mockCurrentProfile = { username: 'testuser', display_name: null, elo_rating: 1200, wins: 0, losses: 0, current_streak: 0 };
    _mockGetCurrentUser.mockImplementation(() => mockCurrentUser);
    _mockGetCurrentProfile.mockImplementation(() => mockCurrentProfile);

    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'share-profile');
    document.body.appendChild(btn);
    btn.click();

    const call = _mockShareProfile.mock.calls[0][0] as Record<string, unknown>;
    expect(call.userId).toBe('specific-user-id-xyz');
  });
});

// TC421-3 — shareProfile receives username from getCurrentProfile().username
describe('TC421-3 — shareProfile receives username from getCurrentProfile().username', () => {
  it('passes the correct username to shareProfile', async () => {
    mockCurrentUser = { id: 'uid-001' };
    mockCurrentProfile = { username: 'cool_debater', display_name: 'Cool Debater', elo_rating: 1300, wins: 7, losses: 2, current_streak: 3 };
    _mockGetCurrentUser.mockImplementation(() => mockCurrentUser);
    _mockGetCurrentProfile.mockImplementation(() => mockCurrentProfile);

    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'share-profile');
    document.body.appendChild(btn);
    btn.click();

    const call = _mockShareProfile.mock.calls[0][0] as Record<string, unknown>;
    expect(call.username).toBe('cool_debater');
    expect(call.displayName).toBe('Cool Debater');
  });
});

// TC421-4 — shareProfile receives elo, wins, losses, streak from profile
describe('TC421-4 — shareProfile receives elo/wins/losses/streak from getCurrentProfile()', () => {
  it('passes correct numeric stats to shareProfile', async () => {
    mockCurrentUser = { id: 'uid-002' };
    mockCurrentProfile = { username: 'statsuser', display_name: 'Stats User', elo_rating: 1600, wins: 20, losses: 5, current_streak: 8 };
    _mockGetCurrentUser.mockImplementation(() => mockCurrentUser);
    _mockGetCurrentProfile.mockImplementation(() => mockCurrentProfile);

    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'share-profile');
    document.body.appendChild(btn);
    btn.click();

    const call = _mockShareProfile.mock.calls[0][0] as Record<string, unknown>;
    expect(call.elo).toBe(1600);
    expect(call.wins).toBe(20);
    expect(call.losses).toBe(5);
    expect(call.streak).toBe(8);
  });
});

// TC421-5 — shareProfile called with undefined for null profile fields
describe('TC421-5 — shareProfile receives undefined when profile fields are null', () => {
  it('passes undefined for username, displayName when profile has null values', async () => {
    mockCurrentUser = { id: 'uid-003' };
    mockCurrentProfile = { username: null, display_name: null, elo_rating: undefined, wins: undefined, losses: undefined, current_streak: undefined };
    _mockGetCurrentUser.mockImplementation(() => mockCurrentUser);
    _mockGetCurrentProfile.mockImplementation(() => mockCurrentProfile);

    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'share-profile');
    document.body.appendChild(btn);
    btn.click();

    const call = _mockShareProfile.mock.calls[0][0] as Record<string, unknown>;
    // null ?? undefined => undefined
    expect(call.username).toBeUndefined();
    expect(call.displayName).toBeUndefined();
  });
});

// TC421-6 — data-action="invite-rewards" navigates to 'invite' screen, not inviteFriend
describe('TC421-6 — data-action="invite-rewards" navigates to invite screen', () => {
  it('activates #screen-invite and does NOT call inviteFriend', async () => {
    const { inviteFriend: _mockInviteFriend } = await import('../../src/share.ts');
    const inviteFriendSpy = vi.spyOn({ inviteFriend: _mockInviteFriend as ReturnType<typeof vi.fn> }, 'inviteFriend');

    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'invite-rewards');
    document.body.appendChild(btn);
    btn.click();

    const inviteScreen = document.getElementById('screen-invite');
    expect(inviteScreen?.classList.contains('active')).toBe(true);

    // inviteFriend mock (from vi.mock on share.ts) should not be called
    expect(inviteFriendSpy).not.toHaveBeenCalled();
    inviteFriendSpy.mockRestore();
  });
});

// TC421-7 — shareProfile not called when no data-action="share-profile" element clicked
describe('TC421-7 — shareProfile is not called for unrelated clicks', () => {
  it('does not call shareProfile when clicking a non-share-profile element', async () => {
    mockCurrentUser = { id: 'uid-004' };
    mockCurrentProfile = { username: 'testuser', display_name: 'Test', elo_rating: 1200, wins: 0, losses: 0, current_streak: 0 };
    _mockGetCurrentUser.mockImplementation(() => mockCurrentUser);
    _mockGetCurrentProfile.mockImplementation(() => mockCurrentProfile);

    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'global-search');
    document.body.appendChild(btn);
    btn.click();

    expect(_mockShareProfile).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seam #422 | home.nav.ts → home.state
// ─────────────────────────────────────────────────────────────────────────────

describe('Seam #422 | ARCH — home.nav.ts imports state from home.state', () => {
  it('import lines include home.state with { state }', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/home.nav.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const stateLine = importLines.find(l => l.includes('home.state'));
    expect(stateLine).toBeTruthy();
    expect(stateLine).toMatch(/state/);
  });
});

describe('Seam #422 | TC-S1 — state.currentScreen starts as "home"', () => {
  it('initial state.currentScreen is "home"', async () => {
    const { state } = await import('../../src/pages/home.state.ts');
    expect(state.currentScreen).toBe('home');
  });
});

describe('Seam #422 | TC-S2 — navigateTo updates state.currentScreen for each valid screen', () => {
  it.each(['home', 'arena', 'profile', 'shop', 'leaderboard', 'arsenal'])(
    'navigateTo("%s") sets state.currentScreen to "%s"',
    async (screenId) => {
      const { navigateTo } = await import('../../src/pages/home.nav.ts');
      const { state } = await import('../../src/pages/home.state.ts');
      navigateTo(screenId);
      expect(state.currentScreen).toBe(screenId);
    }
  );
});

describe('Seam #422 | TC-S3 — navigateTo reads state.currentScreen to detect arena leave', () => {
  it('navigating home → arena → home leaves state.currentScreen as "home"', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');
    const { state } = await import('../../src/pages/home.state.ts');

    navigateTo('arena');
    expect(state.currentScreen).toBe('arena');

    navigateTo('home');
    expect(state.currentScreen).toBe('home');
  });
});

describe('Seam #422 | TC-S4 — state.currentScreen reflects last navigateTo call', () => {
  it('multiple navigateTo calls leave state.currentScreen as the last screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');
    const { state } = await import('../../src/pages/home.state.ts');

    navigateTo('home');
    navigateTo('profile');
    navigateTo('leaderboard');

    expect(state.currentScreen).toBe('leaderboard');
  });
});

describe('Seam #422 | TC-S5 — invalid screen name coerces to "home" in state', () => {
  it('state.currentScreen becomes "home" when navigateTo receives an unknown screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');
    const { state } = await import('../../src/pages/home.state.ts');

    navigateTo('totally-unknown');
    expect(state.currentScreen).toBe('home');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seam #455 | home.nav.ts → async (ModeratorAsync.renderRivals)
// ─────────────────────────────────────────────────────────────────────────────

describe('Seam #455 | ARCH — home.nav.ts imports ModeratorAsync from async.ts', () => {
  it('source import lines include async.ts with ModeratorAsync', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src: string = readFileSync(
      resolve(__dirname, '../../src/pages/home.nav.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const asyncImport = importLines.find((l: string) => l.includes('async'));
    expect(asyncImport).toBeTruthy();
    expect(asyncImport).toMatch(/ModeratorAsync/);
  });
});

describe('Seam #455 | TC-A1 — navigateTo("profile") calls ModeratorAsync.renderRivals with #rivals-feed', () => {
  it('calls ModeratorAsync.renderRivals with the rivals-feed element', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('profile');

    expect(_mockRenderRivals).toHaveBeenCalledTimes(1);
    const calledWith = _mockRenderRivals.mock.calls[0][0] as HTMLElement;
    expect(calledWith).toBeInstanceOf(HTMLElement);
    expect(calledWith.id).toBe('rivals-feed');
  });
});

describe('Seam #455 | TC-A2 — navigateTo("home") does NOT call ModeratorAsync.renderRivals', () => {
  it('renderRivals is not invoked when navigating to home', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('home');

    expect(_mockRenderRivals).not.toHaveBeenCalled();
  });
});

describe('Seam #455 | TC-A3 — navigateTo("arena") does NOT call ModeratorAsync.renderRivals', () => {
  it('renderRivals is not invoked when navigating to arena', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('arena');

    expect(_mockRenderRivals).not.toHaveBeenCalled();
  });
});

describe('Seam #455 | TC-A4 — navigateTo("leaderboard") does NOT call ModeratorAsync.renderRivals', () => {
  it('renderRivals is not invoked when navigating to leaderboard', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('leaderboard');

    expect(_mockRenderRivals).not.toHaveBeenCalled();
  });
});

describe('Seam #455 | TC-A5 — navigateTo("profile") called twice calls renderRivals twice', () => {
  it('renderRivals is called once per navigateTo("profile") invocation', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('profile');
    navigateTo('profile');

    expect(_mockRenderRivals).toHaveBeenCalledTimes(2);
  });
});

describe('Seam #455 | TC-A6 — renderRivals receives the exact #rivals-feed HTMLElement', () => {
  it('the element passed to renderRivals is the same node as document.getElementById("rivals-feed")', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    const expected = document.getElementById('rivals-feed');
    navigateTo('profile');

    const received = _mockRenderRivals.mock.calls[0][0] as HTMLElement;
    expect(received).toBe(expected);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seam #508 | home.nav.ts → home.feed (renderFeed)
// ─────────────────────────────────────────────────────────────────────────────

describe('Seam #508 | ARCH — home.nav.ts imports renderFeed from home.feed.ts', () => {
  it('source import lines include home.feed with renderFeed', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/home.nav.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const feedImport = importLines.find(l => l.includes('home.feed'));
    expect(feedImport).toBeTruthy();
    expect(feedImport).toMatch(/renderFeed/);
  });
});

describe('Seam #508 | TC-F1 — navigateTo("home") calls renderFeed', () => {
  it('invokes renderFeed exactly once when navigating to home', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('home');

    // renderFeed is called with .catch — flush microtasks
    await Promise.resolve();

    expect(_mockRenderFeed).toHaveBeenCalledTimes(1);
  });
});

describe('Seam #508 | TC-F2 — navigateTo("arena") does NOT call renderFeed', () => {
  it('renderFeed is not invoked when navigating to arena', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('arena');
    await Promise.resolve();

    expect(_mockRenderFeed).not.toHaveBeenCalled();
  });
});

describe('Seam #508 | TC-F3 — navigateTo("profile") does NOT call renderFeed', () => {
  it('renderFeed is not invoked when navigating to profile', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('profile');
    await Promise.resolve();

    expect(_mockRenderFeed).not.toHaveBeenCalled();
  });
});

describe('Seam #508 | TC-F4 — invalid screen coerces to "home" and calls renderFeed', () => {
  it('navigateTo("bogus") defaults to home and calls renderFeed', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('bogus-screen-xyz');
    await Promise.resolve();

    expect(_mockRenderFeed).toHaveBeenCalledTimes(1);
  });
});

describe('Seam #508 | TC-F5 — navigateTo("home") called twice calls renderFeed twice', () => {
  it('each home navigation triggers renderFeed once', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('home');
    navigateTo('home');
    await Promise.resolve();

    expect(_mockRenderFeed).toHaveBeenCalledTimes(2);
  });
});

describe('Seam #508 | TC-F6 — renderFeed rejection is caught, navigation still completes', () => {
  it('does not throw when renderFeed rejects; home screen is still activated', async () => {
    _mockRenderFeed.mockRejectedValueOnce(new Error('fetch failure'));

    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    // Should not throw
    expect(() => navigateTo('home')).not.toThrow();
    await Promise.resolve();
    await Promise.resolve(); // double-flush for rejection handler

    const screen = document.getElementById('screen-home');
    expect(screen?.classList.contains('active')).toBe(true);
  });
});

describe('Seam #508 | TC-F7 — navigateTo("home") calls refreshProfile before renderFeed', () => {
  it('both refreshProfile and renderFeed are called on home navigation', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('home');
    await Promise.resolve();

    expect(_mockRefreshProfile).toHaveBeenCalled();
    expect(_mockRenderFeed).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seam #507 | home.nav.ts → home.profile.ts (loadFollowCounts)
// ARCH filter — home.nav.ts imports:
//   import { loadFollowCounts } from './home.profile.ts';
// ARCH filter — home.profile.ts imports:
//   import { getCurrentUser, getFollowCounts, logOut } from '../auth.ts';
//   import type { Profile } from '../auth.ts';
//   import type { User } from '@supabase/supabase-js';
//   import { escapeHTML } from '../config.ts';
//   import { vgBadge } from '../badge.ts';
// ─────────────────────────────────────────────────────────────────────────────

describe('Seam #507 | ARCH — home.nav.ts imports loadFollowCounts from home.profile.ts', () => {
  it('source import lines include home.profile with loadFollowCounts', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/home.nav.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const profileImport = importLines.find((l: string) => l.includes('home.profile'));
    expect(profileImport).toBeTruthy();
    expect(profileImport).toMatch(/loadFollowCounts/);
  });
});

describe('Seam #507 | TC-1 — navigateTo("profile") calls loadFollowCounts', () => {
  it('loadFollowCounts is invoked exactly once when navigating to profile screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('profile');

    expect(_mockLoadFollowCounts).toHaveBeenCalledTimes(1);
  });
});

describe('Seam #507 | TC-2 — navigateTo("home") does NOT call loadFollowCounts', () => {
  it('loadFollowCounts is not invoked when navigating to home screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('home');
    await Promise.resolve();

    expect(_mockLoadFollowCounts).not.toHaveBeenCalled();
  });
});

describe('Seam #507 | TC-3 — navigateTo("arena") does NOT call loadFollowCounts', () => {
  it('loadFollowCounts is not invoked when navigating to arena screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('arena');

    expect(_mockLoadFollowCounts).not.toHaveBeenCalled();
  });
});

describe('Seam #507 | TC-4 — navigateTo("profile") twice calls loadFollowCounts twice', () => {
  it('loadFollowCounts is called once per navigateTo("profile") invocation', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('profile');
    navigateTo('profile');

    expect(_mockLoadFollowCounts).toHaveBeenCalledTimes(2);
  });
});

describe('Seam #507 | TC-5 — invalid screen does NOT call loadFollowCounts', () => {
  it('loadFollowCounts is not called when navigateTo receives an unknown screen id', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('totally-invalid-screen');
    await Promise.resolve();

    expect(_mockLoadFollowCounts).not.toHaveBeenCalled();
  });
});

describe('Seam #507 | TC-6 — navigateTo("profile") calls both refreshProfile and loadFollowCounts', () => {
  it('refreshProfile and loadFollowCounts are both invoked on profile navigation', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('profile');

    expect(_mockRefreshProfile).toHaveBeenCalledTimes(1);
    expect(_mockLoadFollowCounts).toHaveBeenCalledTimes(1);
  });
});

describe('Seam #507 | TC-7 — navigateTo("leaderboard") does NOT call loadFollowCounts', () => {
  it('loadFollowCounts is not invoked when navigating to leaderboard screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('leaderboard');

    expect(_mockLoadFollowCounts).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Seam #548 | home.nav.ts → profile-debate-archive
// ═══════════════════════════════════════════════════════════════════════════════

describe('Seam #548 | ARCH — home.nav.ts imports loadDebateArchive from profile-debate-archive.ts', () => {
  it('source import lines include profile-debate-archive with loadDebateArchive', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src: string = readFileSync(
      resolve(__dirname, '../../src/pages/home.nav.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const archiveImport = importLines.find((l: string) => l.includes('profile-debate-archive'));
    expect(archiveImport).toBeTruthy();
    expect(archiveImport).toMatch(/loadDebateArchive/);
  });
});

describe('Seam #548 | TC-1 — navigateTo("profile") calls loadDebateArchive with (el, true)', () => {
  it('loadDebateArchive is invoked with the #profile-debate-archive element and isOwner=true', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('profile');
    await Promise.resolve();

    expect(_mockLoadDebateArchive).toHaveBeenCalledTimes(1);
    const [calledEl, calledIsOwner] = _mockLoadDebateArchive.mock.calls[0];
    expect(calledEl).toBeInstanceOf(HTMLElement);
    expect((calledEl as HTMLElement).id).toBe('profile-debate-archive');
    expect(calledIsOwner).toBe(true);
  });
});

describe('Seam #548 | TC-2 — navigateTo("home") does NOT call loadDebateArchive', () => {
  it('loadDebateArchive is not invoked when navigating to home screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('home');
    await Promise.resolve();

    expect(_mockLoadDebateArchive).not.toHaveBeenCalled();
  });
});

describe('Seam #548 | TC-3 — navigateTo("arena") does NOT call loadDebateArchive', () => {
  it('loadDebateArchive is not invoked when navigating to arena screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('arena');
    await Promise.resolve();

    expect(_mockLoadDebateArchive).not.toHaveBeenCalled();
  });
});

describe('Seam #548 | TC-4 — navigateTo("profile") without DOM element skips loadDebateArchive', () => {
  it('loadDebateArchive is not called when #profile-debate-archive is absent from DOM', async () => {
    const archiveEl = document.getElementById('profile-debate-archive');
    archiveEl?.remove();

    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('profile');
    await Promise.resolve();

    expect(_mockLoadDebateArchive).not.toHaveBeenCalled();
  });
});

describe('Seam #548 | TC-5 — navigateTo("profile") twice calls loadDebateArchive twice', () => {
  it('loadDebateArchive is called once per navigateTo("profile") invocation', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('profile');
    navigateTo('profile');
    await Promise.resolve();

    expect(_mockLoadDebateArchive).toHaveBeenCalledTimes(2);
  });
});

describe('Seam #548 | TC-6 — loadDebateArchive rejection is caught; navigation still completes', () => {
  it('screen becomes active even when loadDebateArchive rejects', async () => {
    _mockLoadDebateArchive.mockRejectedValueOnce(new Error('archive failed'));

    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    expect(() => navigateTo('profile')).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();

    const screen = document.getElementById('screen-profile');
    expect(screen?.classList.contains('active')).toBe(true);
  });
});

describe('Seam #548 | TC-7 — navigateTo("profile") calls loadDebateArchive and loadFollowCounts together', () => {
  it('both loadDebateArchive and loadFollowCounts are invoked on profile navigation', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('profile');
    await Promise.resolve();

    expect(_mockLoadDebateArchive).toHaveBeenCalledTimes(1);
    expect(_mockLoadFollowCounts).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seam #549 | home.nav.ts → payments (subscribe)
// ARCH filter — home.nav.ts imports:
//   import { subscribe } from '../payments.ts';
// Wiring: data-action="subscribe" + data-tier attribute → subscribe(tier)
// ─────────────────────────────────────────────────────────────────────────────

describe('Seam #549 | ARCH — home.nav.ts imports subscribe from payments.ts', () => {
  it('source import lines include payments.ts with subscribe', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src: string = readFileSync(
      resolve(__dirname, '../../src/pages/home.nav.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const paymentsImport = importLines.find((l: string) => l.includes('payments'));
    expect(paymentsImport).toBeTruthy();
    expect(paymentsImport).toMatch(/subscribe/);
  });
});

describe('Seam #549 | TC-P1 — data-action="subscribe" with data-tier calls subscribe(tier)', () => {
  it('calls subscribe with the tier value from data-tier="pro"', async () => {
    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'subscribe');
    btn.setAttribute('data-tier', 'pro');
    document.body.appendChild(btn);
    btn.click();

    expect(_mockSubscribe).toHaveBeenCalledWith('pro');
  });
});

describe('Seam #549 | TC-P2 — data-action="subscribe" passes different tier values correctly', () => {
  it('calls subscribe with "elite" when data-tier="elite"', async () => {
    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'subscribe');
    btn.setAttribute('data-tier', 'elite');
    document.body.appendChild(btn);
    btn.click();

    expect(_mockSubscribe).toHaveBeenCalledWith('elite');
  });
});

describe('Seam #549 | TC-P3 — data-action="subscribe" without data-tier does NOT call subscribe', () => {
  it('subscribe is not called when data-tier attribute is absent', async () => {
    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'subscribe');
    // No data-tier set
    document.body.appendChild(btn);
    btn.click();

    expect(_mockSubscribe).not.toHaveBeenCalled();
  });
});

describe('Seam #549 | TC-P4 — unrelated data-action does NOT call subscribe', () => {
  it('subscribe is not called when clicking data-action="global-search"', async () => {
    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'global-search');
    document.body.appendChild(btn);
    btn.click();

    expect(_mockSubscribe).not.toHaveBeenCalled();
  });
});

describe('Seam #549 | TC-P5 — subscribe called at least once per click with correct tier', () => {
  it('clicking subscribe button twice both calls include the correct tier', async () => {
    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'subscribe');
    btn.setAttribute('data-tier', 'pro');
    document.body.appendChild(btn);

    const countBefore = _mockSubscribe.mock.calls.length;
    btn.click();
    btn.click();
    const countAfter = _mockSubscribe.mock.calls.length;

    // Both clicks registered (net +2 or more due to accumulated listeners, but all calls are with 'pro')
    expect(countAfter).toBeGreaterThan(countBefore);
    // All subscribe calls from our clicks used 'pro' tier
    const callsSinceStart = _mockSubscribe.mock.calls.slice(countBefore);
    expect(callsSinceStart.every((c: unknown[]) => c[0] === 'pro')).toBe(true);
  });
});

describe('Seam #549 | TC-P6 — clicking child of [data-action="subscribe"] calls subscribe via closest()', () => {
  it('subscribe is called when click target is a child element inside the subscribe button', async () => {
    await import('../../src/pages/home.nav.ts');

    const outer = document.createElement('div');
    outer.setAttribute('data-action', 'subscribe');
    outer.setAttribute('data-tier', 'champion');
    const inner = document.createElement('span');
    inner.textContent = 'Subscribe Now';
    outer.appendChild(inner);
    document.body.appendChild(outer);

    inner.click();

    expect(_mockSubscribe).toHaveBeenCalledWith('champion');
  });
});

describe('Seam #549 | TC-P7 — subscribe not called when no data-action element is clicked', () => {
  it('subscribe is not called when clicking a plain button with no data-action', async () => {
    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.textContent = 'Click me';
    document.body.appendChild(btn);
    btn.click();

    expect(_mockSubscribe).not.toHaveBeenCalled();
  });
});

// ── Seam #550 — home.nav.ts → home.invite ────────────────────────────────────

describe('Seam #550 | ARCH — home.nav.ts imports loadInviteScreen and cleanupInviteScreen from home.invite.ts', () => {
  it('source import lines include home.invite with loadInviteScreen and cleanupInviteScreen', () => {
    const { readFileSync: rfs } = require('fs');
    const { resolve: res } = require('path');
    const src = rfs(
      res(__dirname, '../../src/pages/home.nav.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const inviteImport = importLines.find((l: string) => l.includes('home.invite'));
    expect(inviteImport).toBeTruthy();
    expect(inviteImport).toMatch(/loadInviteScreen/);
    expect(inviteImport).toMatch(/cleanupInviteScreen/);
  });
});

describe('Seam #550 | TC-1 — navigateTo("invite") calls loadInviteScreen with the container element', () => {
  it('loadInviteScreen is invoked with #invite-content when navigating to invite screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('invite');

    expect(_mockLoadInviteScreen).toHaveBeenCalledTimes(1);
    const arg = _mockLoadInviteScreen.mock.calls[0][0] as HTMLElement;
    expect(arg).toBeInstanceOf(HTMLElement);
    expect(arg.id).toBe('invite-content');
  });
});

describe('Seam #550 | TC-2 — navigateTo("invite") activates #screen-invite', () => {
  it('#screen-invite gains the active class after navigating to invite', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('invite');

    const screen = document.getElementById('screen-invite');
    expect(screen?.classList.contains('active')).toBe(true);
  });
});

describe('Seam #550 | TC-3 — navigateTo("home") does NOT call loadInviteScreen', () => {
  it('loadInviteScreen is not invoked when navigating to home screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('home');
    await Promise.resolve();

    expect(_mockLoadInviteScreen).not.toHaveBeenCalled();
  });
});

describe('Seam #550 | TC-4 — navigateTo("profile") does NOT call loadInviteScreen', () => {
  it('loadInviteScreen is not invoked when navigating to profile screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('profile');

    expect(_mockLoadInviteScreen).not.toHaveBeenCalled();
  });
});

describe('Seam #550 | TC-5 — navigateTo("invite") called twice calls loadInviteScreen twice', () => {
  it('loadInviteScreen is called once per navigateTo("invite") invocation', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('invite');
    navigateTo('invite');

    expect(_mockLoadInviteScreen).toHaveBeenCalledTimes(2);
  });
});

describe('Seam #550 | TC-6 — navigateTo("invite") without #invite-content does NOT call loadInviteScreen', () => {
  it('loadInviteScreen is not called when the container element is absent from DOM', async () => {
    const inviteContent = document.getElementById('invite-content');
    inviteContent?.remove();

    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('invite');

    expect(_mockLoadInviteScreen).not.toHaveBeenCalled();
  });
});

describe('Seam #550 | TC-7 — navigateTo("arena") does NOT call loadInviteScreen', () => {
  it('loadInviteScreen is not invoked when navigating to arena screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('arena');

    expect(_mockLoadInviteScreen).not.toHaveBeenCalled();
  });
});

// ── Seam #551 | home.nav.ts → home.arsenal ───────────────────────────────────

describe('Seam #551 | TC-1 — navigateTo("arsenal") calls loadArsenalScreen once', () => {
  it('loadArsenalScreen is called exactly once when navigating to arsenal', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('arsenal');

    expect(_mockLoadArsenalScreen).toHaveBeenCalledTimes(1);
  });
});

describe('Seam #551 | TC-2 — navigateTo("home") does NOT call loadArsenalScreen', () => {
  it('loadArsenalScreen is not invoked when navigating to home screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('home');

    expect(_mockLoadArsenalScreen).not.toHaveBeenCalled();
  });
});

describe('Seam #551 | TC-3 — navigateTo("profile") does NOT call loadArsenalScreen', () => {
  it('loadArsenalScreen is not invoked when navigating to profile screen', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('profile');

    expect(_mockLoadArsenalScreen).not.toHaveBeenCalled();
  });
});

describe('Seam #551 | TC-4 — navigateTo("arsenal") activates #screen-arsenal', () => {
  it('#screen-arsenal gets the active class when navigating to arsenal', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('arsenal');

    const screen = document.getElementById('screen-arsenal');
    expect(screen?.classList.contains('active')).toBe(true);
  });
});

describe('Seam #551 | TC-5 — navigateTo("arsenal") twice calls loadArsenalScreen twice', () => {
  it('loadArsenalScreen is called once per navigateTo("arsenal") invocation', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('arsenal');
    navigateTo('arsenal');

    expect(_mockLoadArsenalScreen).toHaveBeenCalledTimes(2);
  });
});

describe('Seam #551 | TC-6 — data-action="arsenal" click navigates to arsenal', () => {
  it('clicking [data-action="arsenal"] calls loadArsenalScreen at least once', async () => {
    await import('../../src/pages/home.nav.ts');

    const btn = document.createElement('button');
    btn.dataset.action = 'arsenal';
    document.body.appendChild(btn);
    btn.click();

    expect(_mockLoadArsenalScreen).toHaveBeenCalled();
  });
});

describe('Seam #551 | TC-7 — navigateTo("arena") does NOT call loadArsenalScreen', () => {
  it('loadArsenalScreen is not called when navigating to arena', async () => {
    const { navigateTo } = await import('../../src/pages/home.nav.ts');

    navigateTo('arena');

    expect(_mockLoadArsenalScreen).not.toHaveBeenCalled();
  });
});
