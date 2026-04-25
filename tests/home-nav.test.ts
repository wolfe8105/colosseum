/**
 * Tests for src/pages/home.nav.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRegisterNavigate = vi.hoisted(() => vi.fn());
const mockShareProfile = vi.hoisted(() => vi.fn());
const mockInviteFriend = vi.hoisted(() => vi.fn());
const mockSubscribe = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockRefreshProfile = vi.hoisted(() => vi.fn());
const mockModeratorAsync = vi.hoisted(() => ({ renderRivals: vi.fn() }));
const mockRenderFeed = vi.hoisted(() => vi.fn());
const mockLoadArsenalScreen = vi.hoisted(() => vi.fn());
const mockLoadInviteScreen = vi.hoisted(() => vi.fn());
const mockCleanupInviteScreen = vi.hoisted(() => vi.fn());
const mockLoadFollowCounts = vi.hoisted(() => vi.fn());
const mockLoadDebateArchive = vi.hoisted(() => vi.fn());

vi.mock('../src/navigation.ts', () => ({
  registerNavigate: mockRegisterNavigate,
}));

vi.mock('../src/share.ts', () => ({
  shareProfile: mockShareProfile,
  inviteFriend: mockInviteFriend,
}));

vi.mock('../src/payments.ts', () => ({
  subscribe: mockSubscribe,
}));

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
  getCurrentUser: mockGetCurrentUser,
  refreshProfile: mockRefreshProfile,
}));

vi.mock('../src/async.ts', () => ({
  ModeratorAsync: mockModeratorAsync,
}));

vi.mock('../src/pages/home.feed.ts', () => ({
  renderFeed: mockRenderFeed,
}));

vi.mock('../src/pages/home.arsenal.ts', () => ({
  loadArsenalScreen: mockLoadArsenalScreen,
}));

vi.mock('../src/pages/home.invite.ts', () => ({
  loadInviteScreen: mockLoadInviteScreen,
  cleanupInviteScreen: mockCleanupInviteScreen,
}));

vi.mock('../src/pages/home.profile.ts', () => ({
  loadFollowCounts: mockLoadFollowCounts,
}));

vi.mock('../src/profile-debate-archive.ts', () => ({
  loadDebateArchive: mockLoadDebateArchive,
}));

vi.mock('../src/pages/home.state.ts', () => ({
  state: { currentScreen: 'home', arsenalRefs: [], arsenalForgeCleanup: null, arsenalActiveTab: 'my-arsenal', currentOverlayCat: null },
}));

vi.mock('../src/arena.ts', () => ({
  destroy: vi.fn(),
  showPowerUpShop: vi.fn(),
}));

function buildDOM() {
  document.body.innerHTML = `
    <div class="screen" id="screen-home"></div>
    <div class="screen" id="screen-arena"></div>
    <div class="screen" id="screen-profile"></div>
    <div class="screen" id="screen-shop"></div>
    <div class="screen" id="screen-leaderboard"></div>
    <div class="screen" id="screen-arsenal"></div>
    <div class="screen" id="screen-invite"></div>
    <div class="screen" id="screen-search"></div>
    <div class="screen" id="screen-dm"></div>
    <div id="invite-content"></div>
    <div id="rivals-feed"></div>
    <div id="profile-debate-archive"></div>
    <button class="bottom-nav-btn" data-screen="home">Home</button>
    <button class="bottom-nav-btn" data-screen="arena">Arena</button>
    <button class="bottom-nav-btn" data-screen="profile">Profile</button>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRefreshProfile.mockResolvedValue(undefined);
  mockRenderFeed.mockResolvedValue(undefined);
  mockLoadArsenalScreen.mockResolvedValue(undefined);
  mockLoadDebateArchive.mockResolvedValue(undefined);
  buildDOM();
});

describe('navigateTo — activates correct screen', () => {
  it('TC1: activates screen-arena when navigating to arena', async () => {
    const { navigateTo } = await import('../src/pages/home.nav.ts');
    navigateTo('arena');
    expect(document.getElementById('screen-arena')?.classList.contains('active')).toBe(true);
  });
});

describe('navigateTo — activates bottom nav button', () => {
  it('TC2: adds active class to matching nav button', async () => {
    const { navigateTo } = await import('../src/pages/home.nav.ts');
    navigateTo('home');
    const homeBtn = document.querySelector('.bottom-nav-btn[data-screen="home"]');
    expect(homeBtn?.classList.contains('active')).toBe(true);
  });
});

describe('navigateTo — home screen calls refreshProfile and renderFeed', () => {
  it('TC3: navigating home calls refreshProfile and renderFeed', async () => {
    const { navigateTo } = await import('../src/pages/home.nav.ts');
    navigateTo('home');
    await Promise.resolve();
    expect(mockRefreshProfile).toHaveBeenCalled();
    expect(mockRenderFeed).toHaveBeenCalled();
  });
});

describe('navigateTo — invalid screenId defaults to home', () => {
  it('TC4: unknown screen defaults to home', async () => {
    const { navigateTo } = await import('../src/pages/home.nav.ts');
    navigateTo('doesnotexist');
    expect(document.getElementById('screen-home')?.classList.contains('active')).toBe(true);
  });
});

describe('navigateTo — profile screen calls refreshProfile and loadFollowCounts', () => {
  it('TC5: navigating to profile calls refreshProfile and loadFollowCounts', async () => {
    const { navigateTo } = await import('../src/pages/home.nav.ts');
    navigateTo('profile');
    await Promise.resolve();
    expect(mockRefreshProfile).toHaveBeenCalled();
    expect(mockLoadFollowCounts).toHaveBeenCalled();
  });
});

describe('navigateTo — arsenal screen calls loadArsenalScreen', () => {
  it('TC6: navigating to arsenal calls loadArsenalScreen', async () => {
    const { navigateTo } = await import('../src/pages/home.nav.ts');
    navigateTo('arsenal');
    await Promise.resolve();
    expect(mockLoadArsenalScreen).toHaveBeenCalled();
  });
});

describe('navigateTo — invite screen calls loadInviteScreen', () => {
  it('TC7: navigating to invite calls loadInviteScreen with container', async () => {
    const { navigateTo } = await import('../src/pages/home.nav.ts');
    navigateTo('invite');
    expect(mockLoadInviteScreen).toHaveBeenCalledWith(document.getElementById('invite-content'));
  });
});

describe('navigateTo — registerNavigate is called at module init', () => {
  it('TC8: module calls registerNavigate with a function when first imported', async () => {
    vi.resetModules();
    // Re-mock to capture the call
    const capturedFn = vi.hoisted(() => ({ fn: null as unknown }));
    vi.mock('../src/navigation.ts', () => ({
      registerNavigate: (fn: unknown) => { capturedFn.fn = fn; },
    }));
    await import('../src/pages/home.nav.ts');
    expect(typeof capturedFn.fn).toBe('function');
  });
});

describe('ARCH — src/pages/home.nav.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../navigation.ts',
      '../share.ts',
      '../payments.ts',
      '../auth.ts',
      '../async.ts',
      './home.feed.ts',
      './home.arsenal.ts',
      './home.invite.ts',
      './home.profile.ts',
      '../profile-debate-archive.ts',
      './home.state.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.nav.ts'),
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
