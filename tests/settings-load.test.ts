/**
 * Tests for src/pages/settings.load.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockGetEl = vi.hoisted(() => vi.fn((id: string) => document.getElementById(id)));
const mockSetChecked = vi.hoisted(() => vi.fn());
const mockValidateTier = vi.hoisted(() => vi.fn((t: string | undefined) => t || 'free'));
const mockTierLabels = vi.hoisted(() => ({ free: 'FREE TIER', contender: 'CONTENDER', champion: 'CHAMPION', creator: 'CREATOR' }));

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/pages/settings.helpers.ts', () => ({
  getEl: mockGetEl,
  setChecked: mockSetChecked,
  validateTier: mockValidateTier,
  TIER_LABELS: mockTierLabels,
}));

function buildDOM() {
  document.body.innerHTML = `
    <input id="set-display-name" value="" />
    <input id="set-username" value="" />
    <textarea id="set-bio"></textarea>
    <span id="set-bio-count"></span>
    <span id="set-email-display"></span>
    <span id="set-tier-badge"></span>
    <select id="set-language"><option value="en">EN</option><option value="es">ES</option></select>
    <input type="checkbox" id="set-dark-mode" />
    <input type="checkbox" id="set-notif-challenge" />
    <input type="checkbox" id="set-notif-debate" />
    <input type="checkbox" id="set-privacy-public" />
    <input type="checkbox" id="set-audio-sfx" />
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  localStorage.clear();
  mockGetCurrentUser.mockReturnValue(null);
  mockGetCurrentProfile.mockReturnValue(null);
  mockGetEl.mockImplementation((id: string) => document.getElementById(id));
  mockValidateTier.mockReturnValue('free');
});

import { loadSettings } from '../src/pages/settings.load.ts';

describe('loadSettings — reads from localStorage', () => {
  it('TC1: populates display name from localStorage', () => {
    localStorage.setItem('colosseum_settings', JSON.stringify({ display_name: 'Gladiator' }));
    loadSettings();
    expect((document.getElementById('set-display-name') as HTMLInputElement).value).toBe('Gladiator');
  });

  it('TC2: populates bio from localStorage', () => {
    localStorage.setItem('colosseum_settings', JSON.stringify({ bio: 'My bio text' }));
    loadSettings();
    expect((document.getElementById('set-bio') as HTMLTextAreaElement).value).toBe('My bio text');
  });

  it('TC3: sets bio count from localStorage bio length', () => {
    localStorage.setItem('colosseum_settings', JSON.stringify({ bio: 'Hello' }));
    loadSettings();
    expect(document.getElementById('set-bio-count')!.textContent).toBe('5/160');
  });
});

describe('loadSettings — profile overrides localStorage', () => {
  it('TC4: profile display_name overrides saved display_name', () => {
    localStorage.setItem('colosseum_settings', JSON.stringify({ display_name: 'Old Name' }));
    mockGetCurrentProfile.mockReturnValue({ display_name: 'New Name', username: 'user1' });
    loadSettings();
    expect((document.getElementById('set-display-name') as HTMLInputElement).value).toBe('New Name');
  });

  it('TC5: email comes from getCurrentUser when profile present', () => {
    mockGetCurrentProfile.mockReturnValue({ display_name: 'User' });
    mockGetCurrentUser.mockReturnValue({ email: 'user@example.com' });
    loadSettings();
    expect(document.getElementById('set-email-display')!.textContent).toBe('user@example.com');
  });
});

describe('loadSettings — handles invalid localStorage gracefully', () => {
  it('TC6: recovers from malformed JSON without throwing', () => {
    localStorage.setItem('colosseum_settings', 'not-json{{{');
    expect(() => loadSettings()).not.toThrow();
  });
});

describe('loadSettings — calls setChecked for toggle settings', () => {
  it('TC7: calls setChecked for notif-challenge (defaults to true)', () => {
    loadSettings();
    expect(mockSetChecked).toHaveBeenCalledWith('set-notif-challenge', true);
  });

  it('TC8: calls setChecked for audio-mute (defaults to false)', () => {
    loadSettings();
    expect(mockSetChecked).toHaveBeenCalledWith('set-audio-mute', false);
  });
});

describe('loadSettings — sets dark mode from document theme attribute', () => {
  it('TC9: dark mode is true when no data-theme attribute', () => {
    document.documentElement.removeAttribute('data-theme');
    loadSettings();
    expect(mockSetChecked).toHaveBeenCalledWith('set-dark-mode', true);
  });

  it('TC10: dark mode is false when data-theme is "light"', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    loadSettings();
    expect(mockSetChecked).toHaveBeenCalledWith('set-dark-mode', false);
    document.documentElement.removeAttribute('data-theme');
  });
});

describe('ARCH — src/pages/settings.load.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', './settings.helpers.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/settings.load.ts'),
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
