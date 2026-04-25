/**
 * Tests for src/pages/home.profile.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetFollowCounts = vi.hoisted(() => vi.fn());
const mockLogOut = vi.hoisted(() => vi.fn());
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockVgBadge = vi.hoisted(() => vi.fn(() => ''));

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  getFollowCounts: mockGetFollowCounts,
  logOut: mockLogOut,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/badge.ts', () => ({
  vgBadge: mockVgBadge,
}));

function buildDOM() {
  document.body.innerHTML = `
    <button id="user-avatar-btn"></button>
    <div id="user-dropdown"></div>
    <div id="desktop-panel"></div>
    <div id="profile-avatar"></div>
    <div id="profile-display-name"></div>
    <div id="profile-tier"></div>
    <div id="dropdown-name"></div>
    <div id="dropdown-tier"></div>
    <div id="stat-elo"></div>
    <div id="stat-wins"></div>
    <div id="stat-losses"></div>
    <div id="stat-streak"></div>
    <div id="stat-debates"></div>
    <div id="stat-tokens"></div>
    <div id="token-count"></div>
    <div id="shop-token-balance"></div>
    <div id="profile-depth-fill" style="width:0%"></div>
    <div id="profile-depth-text"></div>
    <div id="profile-followers"></div>
    <div id="profile-following"></div>
    <div id="logout-btn"></div>
    <div id="profile-bio-display"></div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
});

import { updateUIFromProfile, loadFollowCounts } from '../src/pages/home.profile.ts';

function makeProfile(overrides = {}) {
  return {
    display_name: 'TestUser',
    username: 'testuser',
    avatar_url: '',
    subscription_tier: 'free',
    elo_rating: 1200,
    wins: 5,
    losses: 3,
    current_streak: 2,
    debates_completed: 10,
    token_balance: 100,
    profile_depth_pct: 40,
    bio: 'My bio',
    verified_gladiator: false,
    ...overrides,
  };
}

describe('updateUIFromProfile — guest shows SIGN IN avatar', () => {
  it('TC1: sets avatar btn text to SIGN IN when profile is null', () => {
    updateUIFromProfile(null, null);
    expect(document.getElementById('user-avatar-btn')!.textContent).toBe('SIGN IN');
  });

  it('TC2: hides desktop panel for guests', () => {
    updateUIFromProfile(null, null);
    expect(document.getElementById('desktop-panel')!.style.display).toBe('none');
  });
});

describe('updateUIFromProfile — logged-in user sets stats', () => {
  it('TC3: sets stat-elo to profile elo_rating', () => {
    updateUIFromProfile({} as never, makeProfile({ elo_rating: 1500 }) as never);
    expect(document.getElementById('stat-elo')!.textContent).toBe('1500');
  });

  it('TC4: sets stat-wins to profile wins', () => {
    updateUIFromProfile({} as never, makeProfile({ wins: 7 }) as never);
    expect(document.getElementById('stat-wins')!.textContent).toBe('7');
  });

  it('TC5: sets profile-tier to FREE TIER for free tier', () => {
    updateUIFromProfile({} as never, makeProfile({ subscription_tier: 'free' }) as never);
    expect(document.getElementById('profile-tier')!.textContent).toBe('FREE TIER');
  });

  it('TC6: sets profile-tier to CHAMPION for champion tier', () => {
    updateUIFromProfile({} as never, makeProfile({ subscription_tier: 'champion' }) as never);
    expect(document.getElementById('profile-tier')!.textContent).toBe('CHAMPION');
  });
});

describe('updateUIFromProfile — bio rendering', () => {
  it('TC7: shows bio text when bio is non-empty', () => {
    updateUIFromProfile({} as never, makeProfile({ bio: 'Hello!' }) as never);
    expect(document.getElementById('profile-bio-display')!.textContent).toBe('Hello!');
    expect(document.getElementById('profile-bio-display')!.classList.contains('placeholder')).toBe(false);
  });

  it('TC8: shows placeholder text when bio is empty', () => {
    updateUIFromProfile({} as never, makeProfile({ bio: '' }) as never);
    expect(document.getElementById('profile-bio-display')!.textContent).toBe('Tap to add bio');
    expect(document.getElementById('profile-bio-display')!.classList.contains('placeholder')).toBe(true);
  });
});

describe('updateUIFromProfile — shows desktop panel for logged-in user', () => {
  it('TC9: desktop-panel style.display is reset for logged-in user', () => {
    document.getElementById('desktop-panel')!.style.display = 'none';
    updateUIFromProfile({} as never, makeProfile() as never);
    expect(document.getElementById('desktop-panel')!.style.display).toBe('');
  });
});

describe('loadFollowCounts — skips when no user', () => {
  it('TC10: does not call getFollowCounts when getCurrentUser returns null', async () => {
    mockGetCurrentUser.mockReturnValue(null);
    await loadFollowCounts();
    expect(mockGetFollowCounts).not.toHaveBeenCalled();
  });
});

describe('loadFollowCounts — updates follower/following counts', () => {
  it('TC11: sets profile-followers and profile-following from getFollowCounts', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockGetFollowCounts.mockResolvedValue({ followers: 42, following: 7 });
    await loadFollowCounts();
    expect(document.getElementById('profile-followers')!.textContent).toBe('42');
    expect(document.getElementById('profile-following')!.textContent).toBe('7');
  });
});

describe('ARCH — src/pages/home.profile.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../config.ts', '../badge.ts', '@supabase/supabase-js'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.profile.ts'),
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
