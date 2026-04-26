/**
 * Integration tests — Seam #357
 * src/pages/home.profile.ts → src/badge.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Supabase mock (only mock) ─────────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => {
  const mockClient = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
  return {
    createClient: vi.fn(() => mockClient),
    __mockClient: mockClient,
  };
});

// ── Helper: build a minimal Profile ──────────────────────────────────────────
function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'testuser',
    display_name: 'Test User',
    avatar_url: null,
    bio: null,
    elo_rating: 1200,
    wins: 5,
    losses: 3,
    current_streak: 2,
    debates_completed: 8,
    token_balance: 100,
    subscription_tier: 'free',
    profile_depth_pct: 50,
    level: 3,
    verified_gladiator: false,
    ...overrides,
  };
}

function makeUser() {
  return { id: '00000000-0000-0000-0000-000000000001', email: 'test@example.com' };
}

// ── DOM setup helpers ─────────────────────────────────────────────────────────
function setupDOM() {
  document.body.innerHTML = `
    <div id="user-avatar-btn"></div>
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
    <div id="profile-depth-fill"></div>
    <div id="profile-depth-text"></div>
    <div id="dp-name"></div>
    <div id="dp-tier"></div>
    <div id="dp-avatar"></div>
    <div id="dp-elo"></div>
    <div id="dp-wins"></div>
    <div id="dp-losses"></div>
    <div id="dp-streak"></div>
    <div id="dp-tokens"></div>
    <div id="dp-depth-fill"></div>
    <div id="dp-depth-pct"></div>
    <div id="profile-bio-display"></div>
    <div id="profile-followers"></div>
    <div id="profile-following"></div>
    <button id="logout-btn"></button>
  `;
}

describe('Seam #357 — home.profile.ts → badge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    setupDOM();
  });

  afterEach(async () => {
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  // TC-357-05: ARCH filter — imports include badge.ts, no wall modules
  it('TC-357-05: ARCH — imports badge.ts and no wall modules', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(__dirname, '../../src/pages/home.profile.ts');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const importLines = raw.split('\n').filter(l => /from\s+['"]/.test(l));
    const joined = importLines.join('\n');

    expect(joined).toContain('badge');

    const wallPatterns = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const w of wallPatterns) {
      expect(joined).not.toContain(w);
    }
  });

  // TC-357-01: verified_gladiator true → profile-display-name contains vg-badge
  it('TC-357-01: verified user → profile-display-name contains vg-badge span', async () => {
    const { updateUIFromProfile } = await import('../../src/pages/home.profile.ts');
    const profile = makeProfile({ verified_gladiator: true });
    const user = makeUser() as never;

    updateUIFromProfile(user, profile as never);

    const el = document.getElementById('profile-display-name')!;
    expect(el.innerHTML).toContain('vg-badge');
    expect(el.innerHTML).toContain('🎖️');
  });

  // TC-357-02: verified_gladiator false → profile-display-name has NO vg-badge
  it('TC-357-02: unverified user → profile-display-name has no badge', async () => {
    const { updateUIFromProfile } = await import('../../src/pages/home.profile.ts');
    const profile = makeProfile({ verified_gladiator: false });
    const user = makeUser() as never;

    updateUIFromProfile(user, profile as never);

    const el = document.getElementById('profile-display-name')!;
    expect(el.innerHTML).not.toContain('vg-badge');
  });

  // TC-357-03: verified_gladiator true → dp-name also contains vg-badge
  it('TC-357-03: verified user → dp-name (desktop panel) contains vg-badge span', async () => {
    const { updateUIFromProfile } = await import('../../src/pages/home.profile.ts');
    const profile = makeProfile({ verified_gladiator: true });
    const user = makeUser() as never;

    updateUIFromProfile(user, profile as never);

    const dpName = document.getElementById('dp-name')!;
    expect(dpName.innerHTML).toContain('vg-badge');
    expect(dpName.innerHTML).toContain('🎖️');
  });

  // TC-357-04: guest path (null profile) → avatar says SIGN IN, no badge rendered
  it('TC-357-04: guest (null profile) → avatar shows SIGN IN text', async () => {
    const { updateUIFromProfile } = await import('../../src/pages/home.profile.ts');

    updateUIFromProfile(null, null);

    const avatarBtn = document.getElementById('user-avatar-btn')!;
    expect(avatarBtn.textContent).toBe('SIGN IN');

    // desktop-panel should be hidden for guests
    const panel = document.getElementById('desktop-panel')!;
    expect(panel.style.display).toBe('none');
  });
});
