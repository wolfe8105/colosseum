// F-37 GATEKEEPER -- NOTIFICATION PREFERENCES TESTS
// Spec: PUNCH-LIST F-37 -- notif_rivals + notif_economy toggle
// columns on profiles. Settings UI wired: settings.helpers.ts,
// settings.load.ts, settings.save.ts. Passed through
// save_user_settings RPC via p_notif_rivals/p_notif_economy.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockGetEl = vi.hoisted(() => vi.fn((id: string) => document.getElementById(id)));
const mockSetChecked = vi.hoisted(() => vi.fn());
const mockValidateTier = vi.hoisted(() => vi.fn((t: string | undefined) => t ?? 'free'));
const mockTierLabels = vi.hoisted(() => ({
  free: 'FREE', contender: 'CONTENDER', champion: 'CHAMPION', creator: 'CREATOR',
}));
const mockUpdateProfile = vi.hoisted(() => vi.fn());
const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => vi.fn());
const mockGetChecked = vi.hoisted(() => vi.fn(() => true));
const mockIsAnyPlaceholderHolder = vi.hoisted(() => ({ value: false }));

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
  updateProfile: mockUpdateProfile,
  safeRpc: mockSafeRpc,
  ready: Promise.resolve(),
  getIsPlaceholderMode: vi.fn(() => false),
  getSupabaseClient: vi.fn(() => null),
}));

vi.mock('../src/config.ts', () => ({
  get isAnyPlaceholder() { return mockIsAnyPlaceholderHolder.value; },
  showToast: vi.fn(),
}));

vi.mock('../src/pages/settings.helpers.ts', () => ({
  getEl: mockGetEl,
  setChecked: mockSetChecked,
  validateTier: mockValidateTier,
  TIER_LABELS: mockTierLabels,
  toast: mockToast,
  getChecked: mockGetChecked,
}));

vi.mock('../src/pages/settings.moderator.ts', () => ({
  loadModeratorSettings: vi.fn(),
  wireModeratorToggles: vi.fn(),
}));

vi.mock('../src/pages/settings.wiring.ts', () => ({
  wireSettings: vi.fn(),
  wireIntroMusicRow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/pages/settings.blocks.ts', () => ({
  loadBlockedUsers: vi.fn().mockResolvedValue(undefined),
}));

function buildSaveDOM() {
  document.body.innerHTML = `
    <button id="save-btn">SAVE</button>
    <input id="set-display-name" value="" />
    <input id="set-username" value="" />
    <textarea id="set-bio"></textarea>
    <span id="set-email-display"></span>
    <select id="set-language"><option value="en" selected>EN</option></select>
    <input type="checkbox" id="set-notif-rivals" />
    <input type="checkbox" id="set-notif-economy" />
  `;
}

function buildLoadDOM() {
  document.body.innerHTML = `
    <input id="set-display-name" value="" />
    <input id="set-username" value="" />
    <textarea id="set-bio"></textarea>
    <span id="set-bio-count"></span>
    <span id="set-email-display"></span>
    <span id="set-tier-badge"></span>
    <select id="set-language"><option value="en">EN</option></select>
    <input type="checkbox" id="set-dark-mode" />
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
  `;
}

import { loadSettings } from '../src/pages/settings.load.ts';
import { saveSettings } from '../src/pages/settings.save.ts';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockGetCurrentUser.mockReturnValue(null);
  mockGetCurrentProfile.mockReturnValue(null);
  mockValidateTier.mockReturnValue('free');
  mockIsAnyPlaceholderHolder.value = false;
  mockUpdateProfile.mockResolvedValue({ success: true });
  mockSafeRpc.mockResolvedValue({ data: null, error: null });
  mockGetChecked.mockReturnValue(true);
});

describe('TC1 - SettingsData interface includes notif_rivals', () => {
  it('notif_rivals is a boolean field saved to localStorage by saveSettings', async () => {
    buildSaveDOM();
    mockGetEl.mockImplementation((id: string) => document.getElementById(id));
    mockGetChecked.mockReturnValue(true);
    await saveSettings();
    const saved = JSON.parse(localStorage.getItem('colosseum_settings') || '{}');
    expect(typeof saved.notif_rivals).toBe('boolean');
  });
});

describe('TC2 - SettingsData interface includes notif_economy', () => {
  it('notif_economy is a boolean field saved to localStorage by saveSettings', async () => {
    buildSaveDOM();
    mockGetEl.mockImplementation((id: string) => document.getElementById(id));
    mockGetChecked.mockReturnValue(false);
    await saveSettings();
    const saved = JSON.parse(localStorage.getItem('colosseum_settings') || '{}');
    expect(typeof saved.notif_economy).toBe('boolean');
  });
});

describe('TC3 - loadSettings defaults notif_rivals to ON', () => {
  it('calls setChecked for notif-rivals with true when no value in localStorage', () => {
    buildLoadDOM();
    mockGetEl.mockImplementation((id: string) => document.getElementById(id));
    localStorage.setItem('colosseum_settings', JSON.stringify({}));
    loadSettings();
    expect(mockSetChecked).toHaveBeenCalledWith('set-notif-rivals', true);
  });
});

describe('TC4 - loadSettings defaults notif_economy to ON', () => {
  it('calls setChecked for notif-economy with true when no value in localStorage', () => {
    buildLoadDOM();
    mockGetEl.mockImplementation((id: string) => document.getElementById(id));
    localStorage.setItem('colosseum_settings', JSON.stringify({}));
    loadSettings();
    expect(mockSetChecked).toHaveBeenCalledWith('set-notif-economy', true);
  });
});

describe('TC5 - loadSettings respects explicit false for notif_rivals', () => {
  it('calls setChecked for notif-rivals with false when localStorage has notif_rivals: false', () => {
    buildLoadDOM();
    mockGetEl.mockImplementation((id: string) => document.getElementById(id));
    localStorage.setItem('colosseum_settings', JSON.stringify({ notif_rivals: false }));
    loadSettings();
    expect(mockSetChecked).toHaveBeenCalledWith('set-notif-rivals', false);
  });
});

describe('TC6 - loadSettings respects explicit false for notif_economy', () => {
  it('calls setChecked for notif-economy with false when localStorage has notif_economy: false', () => {
    buildLoadDOM();
    mockGetEl.mockImplementation((id: string) => document.getElementById(id));
    localStorage.setItem('colosseum_settings', JSON.stringify({ notif_economy: false }));
    loadSettings();
    expect(mockSetChecked).toHaveBeenCalledWith('set-notif-economy', false);
  });
});

describe('TC7 - saveSettings passes p_notif_rivals to save_user_settings RPC', () => {
  it('safeRpc is called with p_notif_rivals key', async () => {
    buildSaveDOM();
    mockGetEl.mockImplementation((id: string) => document.getElementById(id));
    mockGetChecked.mockReturnValue(true);
    await saveSettings();
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'save_user_settings',
      expect.objectContaining({ p_notif_rivals: expect.anything() })
    );
  });
});

describe('TC8 - saveSettings passes p_notif_economy to save_user_settings RPC', () => {
  it('safeRpc is called with p_notif_economy key', async () => {
    buildSaveDOM();
    mockGetEl.mockImplementation((id: string) => document.getElementById(id));
    mockGetChecked.mockReturnValue(true);
    await saveSettings();
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'save_user_settings',
      expect.objectContaining({ p_notif_economy: expect.anything() })
    );
  });
});

describe('TC9 - p_notif_rivals value reflects the toggle state', () => {
  it('passes p_notif_rivals: false when notif-rivals toggle is off', async () => {
    buildSaveDOM();
    mockGetEl.mockImplementation((id: string) => document.getElementById(id));
    mockGetChecked.mockImplementation((id: string) => {
      if (id === 'set-notif-rivals') return false;
      return true;
    });
    await saveSettings();
    const [, args] = mockSafeRpc.mock.calls[0];
    expect(args.p_notif_rivals).toBe(false);
  });
});

describe('TC10 - p_notif_economy value reflects the toggle state', () => {
  it('passes p_notif_economy: false when notif-economy toggle is off', async () => {
    buildSaveDOM();
    mockGetEl.mockImplementation((id: string) => document.getElementById(id));
    mockGetChecked.mockImplementation((id: string) => {
      if (id === 'set-notif-economy') return false;
      return true;
    });
    await saveSettings();
    const [, args] = mockSafeRpc.mock.calls[0];
    expect(args.p_notif_economy).toBe(false);
  });
});

describe('TC11 - settings.ts init maps notif_rivals from user_settings DB row', () => {
  it('toggleMap in settings.ts contains set-notif-rivals mapped to data.notif_rivals', () => {
    const source = readFileSync(
      resolve(__dirname, '../src/pages/settings.ts'),
      'utf-8'
    );
    expect(source).toContain("'set-notif-rivals': data.notif_rivals");
  });
});

describe('TC12 - settings.ts init maps notif_economy from user_settings DB row', () => {
  it('toggleMap in settings.ts contains set-notif-economy mapped to data.notif_economy', () => {
    const source = readFileSync(
      resolve(__dirname, '../src/pages/settings.ts'),
      'utf-8'
    );
    expect(source).toContain("'set-notif-economy': data.notif_economy");
  });
});

describe('ARCH - src/pages/settings.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      './settings.load.ts',
      './settings.moderator.ts',
      './settings.wiring.ts',
      './settings.helpers.ts',
      './settings.blocks.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/settings.ts'),
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