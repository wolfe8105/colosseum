/**
 * Integration tests — Seam #273
 * src/pages/settings.load.ts → settings.helpers
 *
 * settings.helpers has zero Supabase calls (pure DOM utils + constants).
 * settings.load.ts calls getCurrentUser / getCurrentProfile from auth barrel,
 * so we mock @supabase/supabase-js and stub those auth exports.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Supabase mock (required even though helpers don't use it — auth barrel does) ──
const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ── Auth stubs (loadSettings calls getCurrentProfile / getCurrentUser) ──
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => null));
const mockGetCurrentUser = vi.hoisted(() => vi.fn(() => null));

vi.mock('../../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
  getCurrentUser: mockGetCurrentUser,
}));

// ── Helpers ──

function buildDOM(): void {
  document.body.innerHTML = `
    <input id="set-display-name" />
    <input id="set-username" />
    <textarea id="set-bio"></textarea>
    <span id="set-bio-count"></span>
    <span id="set-email-display"></span>
    <span id="set-tier-badge"></span>
    <input type="checkbox" id="set-notif-challenge" />
    <input type="checkbox" id="set-notif-debate" />
    <input type="checkbox" id="set-notif-follow" />
    <input type="checkbox" id="set-notif-reactions" />
    <input type="checkbox" id="set-notif-rivals" />
    <input type="checkbox" id="set-notif-economy" />
    <input type="checkbox" id="set-audio-sfx" />
    <input type="checkbox" id="set-audio-mute" />
    <input type="checkbox" id="set-privacy-public" />
    <input type="checkbox" id="set-privacy-online" />
    <input type="checkbox" id="set-privacy-challenges" />
    <select id="set-language"><option value="en">EN</option><option value="es">ES</option></select>
    <input type="checkbox" id="set-dark-mode" />
    <div id="toast"></div>
  `;
}

// ── ARCH filter ──
describe('ARCH — settings.load.ts only imports from settings.helpers (no Supabase direct)', () => {
  it('import lines filtered by from clause do not include @supabase', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/settings.load.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const supabaseImports = importLines.filter(l => l.includes('@supabase'));
    expect(supabaseImports).toHaveLength(0);
  });

  it('imports getEl, setChecked, validateTier, TIER_LABELS from settings.helpers', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/settings.load.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const helpersLine = importLines.find(l => l.includes('settings.helpers'));
    expect(helpersLine).toBeDefined();
    expect(helpersLine).toMatch(/getEl/);
    expect(helpersLine).toMatch(/setChecked/);
    expect(helpersLine).toMatch(/validateTier/);
    expect(helpersLine).toMatch(/TIER_LABELS/);
  });
});

// ── Runtime TCs ──

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockGetCurrentProfile.mockReset();
  mockGetCurrentUser.mockReset();
  mockGetCurrentProfile.mockReturnValue(null);
  mockGetCurrentUser.mockReturnValue(null);
  buildDOM();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

// TC1 — empty localStorage → text fields empty
describe('TC1 — empty localStorage populates fields with empty strings', () => {
  it('sets display-name, username, bio to empty strings', async () => {
    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const nameEl = document.getElementById('set-display-name') as HTMLInputElement;
    const userEl = document.getElementById('set-username') as HTMLInputElement;
    const bioEl = document.getElementById('set-bio') as HTMLTextAreaElement;

    expect(nameEl.value).toBe('');
    expect(userEl.value).toBe('');
    expect(bioEl.value).toBe('');
  });
});

// TC2 — saved localStorage data populates fields
describe('TC2 — saved localStorage data populates text fields', () => {
  it('sets display-name, username, bio from stored settings', async () => {
    localStorage.setItem(
      'colosseum_settings',
      JSON.stringify({ display_name: 'Alice', username: 'alice99', bio: 'Hello world' }),
    );

    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const nameEl = document.getElementById('set-display-name') as HTMLInputElement;
    const userEl = document.getElementById('set-username') as HTMLInputElement;
    const bioEl = document.getElementById('set-bio') as HTMLTextAreaElement;

    expect(nameEl.value).toBe('Alice');
    expect(userEl.value).toBe('alice99');
    expect(bioEl.value).toBe('Hello world');
  });
});

// TC3 — bio count reflects bio length
describe('TC3 — bio count shows length/160', () => {
  it('sets bio-count textContent to "5/160" for bio of length 5', async () => {
    localStorage.setItem('colosseum_settings', JSON.stringify({ bio: 'Hello' }));

    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const bioCount = document.getElementById('set-bio-count') as HTMLElement;
    expect(bioCount.textContent).toBe('5/160');
  });

  it('sets bio-count to "0/160" when bio absent', async () => {
    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const bioCount = document.getElementById('set-bio-count') as HTMLElement;
    expect(bioCount.textContent).toBe('0/160');
  });
});

// TC4 — validateTier fallback: unknown tier shows FREE badge
describe('TC4 — invalid subscription_tier falls back to FREE', () => {
  it('badge shows FREE for unrecognised tier', async () => {
    localStorage.setItem(
      'colosseum_settings',
      JSON.stringify({ subscription_tier: 'ultra_premium' }),
    );

    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const badge = document.getElementById('set-tier-badge') as HTMLElement;
    expect(badge.textContent).toBe('FREE');
    expect(badge.className).toBe('tier-badge ');
  });

  it('badge shows CHAMPION for champion tier', async () => {
    localStorage.setItem(
      'colosseum_settings',
      JSON.stringify({ subscription_tier: 'champion' }),
    );

    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const badge = document.getElementById('set-tier-badge') as HTMLElement;
    expect(badge.textContent).toBe('CHAMPION');
    expect(badge.className).toBe('tier-badge champion');
  });
});

// TC5 — notification checkboxes default to true when absent from saved settings
describe('TC5 — notification checkboxes default true when absent', () => {
  it('notif-challenge and notif-debate checked by default', async () => {
    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const challenge = document.getElementById('set-notif-challenge') as HTMLInputElement;
    const debate = document.getElementById('set-notif-debate') as HTMLInputElement;
    const follow = document.getElementById('set-notif-follow') as HTMLInputElement;

    expect(challenge.checked).toBe(true);
    expect(debate.checked).toBe(true);
    expect(follow.checked).toBe(true);
  });

  it('audio-mute defaults to false when absent', async () => {
    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const mute = document.getElementById('set-audio-mute') as HTMLInputElement;
    expect(mute.checked).toBe(false);
  });
});

// TC6 — profile data overrides localStorage values
describe('TC6 — getCurrentProfile() overrides localStorage fields', () => {
  it('display-name, username, bio come from profile when profile available', async () => {
    localStorage.setItem(
      'colosseum_settings',
      JSON.stringify({ display_name: 'Alice', username: 'alice99', bio: 'Stored bio' }),
    );
    mockGetCurrentProfile.mockReturnValue({
      display_name: 'Bob',
      username: 'bob42',
      bio: 'Profile bio',
    });
    mockGetCurrentUser.mockReturnValue({ email: 'bob@example.com' });

    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const nameEl = document.getElementById('set-display-name') as HTMLInputElement;
    const userEl = document.getElementById('set-username') as HTMLInputElement;
    const bioEl = document.getElementById('set-bio') as HTMLTextAreaElement;

    expect(nameEl.value).toBe('Bob');
    expect(userEl.value).toBe('bob42');
    expect(bioEl.value).toBe('Profile bio');
  });

  it('is_private=true sets privacy-public checkbox to false', async () => {
    mockGetCurrentProfile.mockReturnValue({ is_private: true });

    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const privPublic = document.getElementById('set-privacy-public') as HTMLInputElement;
    expect(privPublic.checked).toBe(false);
  });

  it('email shown from getCurrentUser when profile present', async () => {
    mockGetCurrentProfile.mockReturnValue({ display_name: 'Bob' });
    mockGetCurrentUser.mockReturnValue({ email: 'bob@example.com' });

    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const emailDisp = document.getElementById('set-email-display') as HTMLElement;
    expect(emailDisp.textContent).toBe('bob@example.com');
  });
});

// TC7 — dark mode checkbox reflects data-theme attribute
describe('TC7 — dark mode checkbox uses data-theme attribute', () => {
  it('set-dark-mode is false when data-theme=light', async () => {
    document.documentElement.setAttribute('data-theme', 'light');

    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const darkMode = document.getElementById('set-dark-mode') as HTMLInputElement;
    expect(darkMode.checked).toBe(false);
  });

  it('set-dark-mode is true when data-theme is not light (default dark)', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');

    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const darkMode = document.getElementById('set-dark-mode') as HTMLInputElement;
    expect(darkMode.checked).toBe(true);
  });

  it('set-dark-mode is true when data-theme attribute absent', async () => {
    // attribute already removed in beforeEach
    const { loadSettings } = await import('../../src/pages/settings.load.ts');
    loadSettings();

    const darkMode = document.getElementById('set-dark-mode') as HTMLInputElement;
    expect(darkMode.checked).toBe(true);
  });
});
