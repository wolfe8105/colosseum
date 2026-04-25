/**
 * Tests for src/pages/settings.wiring.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockLogOut = vi.hoisted(() => vi.fn());
const mockResetPassword = vi.hoisted(() => vi.fn());
const mockDeleteAccount = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());
const mockGetEl = vi.hoisted(() => vi.fn((id: string) => document.getElementById(id)));
const mockSaveSettings = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
  logOut: mockLogOut,
  resetPassword: mockResetPassword,
  deleteAccount: mockDeleteAccount,
}));

vi.mock('../src/config.ts', () => ({
  isAnyPlaceholder: false,
  showToast: mockShowToast,
}));

vi.mock('../src/pages/settings.helpers.ts', () => ({
  getEl: mockGetEl,
}));

vi.mock('../src/pages/settings.save.ts', () => ({
  saveSettings: mockSaveSettings,
}));

function buildDOM() {
  document.body.innerHTML = `
    <button id="save-btn">SAVE</button>
    <button id="settings-back-btn">BACK</button>
    <input type="checkbox" id="set-dark-mode" checked />
    <meta id="meta-theme-color" content="#000000" />
    <textarea id="set-bio"></textarea>
    <span id="set-bio-count">0/160</span>
    <button id="logout-btn">LOGOUT</button>
    <button id="reset-pw-btn">RESET PASSWORD</button>
    <button id="delete-btn">DELETE</button>
    <input id="delete-confirm-input" value="" />
    <button id="delete-confirm" disabled>CONFIRM DELETE</button>
    <button id="delete-cancel">CANCEL</button>
    <div id="delete-modal"></div>
    <div id="intro-music-row"></div>
    <div id="intro-music-desc"></div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  mockGetEl.mockImplementation((id: string) => document.getElementById(id));
  mockGetCurrentUser.mockReturnValue(null);
  mockGetCurrentProfile.mockReturnValue(null);
  mockLogOut.mockResolvedValue(undefined);
  mockResetPassword.mockResolvedValue({ success: true });
  mockDeleteAccount.mockResolvedValue({ error: null });
});

import { wireSettings, wireIntroMusicRow } from '../src/pages/settings.wiring.ts';

describe('wireSettings — save button wired to saveSettings', () => {
  it('TC1: clicking save-btn calls saveSettings', () => {
    wireSettings();
    document.getElementById('save-btn')!.click();
    expect(mockSaveSettings).toHaveBeenCalled();
  });
});

describe('wireSettings — dark mode toggle', () => {
  it('TC2: toggling dark mode sets data-theme attribute', () => {
    wireSettings();
    const toggle = document.getElementById('set-dark-mode') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('TC3: dark mode stores theme in localStorage', () => {
    wireSettings();
    const toggle = document.getElementById('set-dark-mode') as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});

describe('wireSettings — bio counter', () => {
  it('TC4: typing in bio textarea updates bio count', () => {
    wireSettings();
    const bio = document.getElementById('set-bio') as HTMLTextAreaElement;
    bio.value = 'Hello world';
    bio.dispatchEvent(new Event('input'));
    expect(document.getElementById('set-bio-count')!.textContent).toBe('11/160');
  });
});

describe('wireSettings — delete modal', () => {
  it('TC5: clicking delete-btn opens delete modal', () => {
    wireSettings();
    document.getElementById('delete-btn')!.click();
    expect(document.getElementById('delete-modal')!.classList.contains('open')).toBe(true);
  });

  it('TC6: clicking delete-cancel closes delete modal', () => {
    wireSettings();
    document.getElementById('delete-modal')!.classList.add('open');
    document.getElementById('delete-cancel')!.click();
    expect(document.getElementById('delete-modal')!.classList.contains('open')).toBe(false);
  });

  it('TC7: typing DELETE enables the confirm button', () => {
    wireSettings();
    const input = document.getElementById('delete-confirm-input') as HTMLInputElement;
    input.value = 'DELETE';
    input.dispatchEvent(new Event('input'));
    expect((document.getElementById('delete-confirm') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('wireSettings — reset password', () => {
  it('TC8: shows error toast when no user email', async () => {
    wireSettings();
    mockGetCurrentUser.mockReturnValue(null);
    document.getElementById('reset-pw-btn')!.click();
    await Promise.resolve();
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('logged in'), 'error');
  });

  it('TC9: calls resetPassword with user email', async () => {
    wireSettings();
    mockGetCurrentUser.mockReturnValue({ email: 'user@example.com' });
    document.getElementById('reset-pw-btn')!.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockResetPassword).toHaveBeenCalledWith('user@example.com');
  });
});

describe('wireIntroMusicRow — no-ops when intro-music-row missing', () => {
  it('TC10: returns without throwing when row element absent', async () => {
    document.getElementById('intro-music-row')?.remove();
    await expect(wireIntroMusicRow()).resolves.toBeUndefined();
  });
});

describe('ARCH — src/pages/settings.wiring.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../config.ts', './settings.helpers.ts', './settings.save.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/settings.wiring.ts'),
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
