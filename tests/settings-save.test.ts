/**
 * Tests for src/pages/settings.save.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockUpdateProfile = vi.hoisted(() => vi.fn());
const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockIsAnyPlaceholder = vi.hoisted(() => ({ value: false }));
const mockToast = vi.hoisted(() => vi.fn());
const mockGetEl = vi.hoisted(() => vi.fn((id: string) => document.getElementById(id)));
const mockGetChecked = vi.hoisted(() => vi.fn(() => true));

vi.mock('../src/auth.ts', () => ({
  updateProfile: mockUpdateProfile,
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  get isAnyPlaceholder() { return mockIsAnyPlaceholder.value; },
}));

vi.mock('../src/pages/settings.helpers.ts', () => ({
  toast: mockToast,
  getEl: mockGetEl,
  getChecked: mockGetChecked,
}));

function buildDOM() {
  document.body.innerHTML = `
    <button id="save-btn">💾 SAVE CHANGES</button>
    <input id="set-display-name" value="TestUser" />
    <input id="set-username" value="testuser" />
    <textarea id="set-bio">My bio</textarea>
    <span id="set-email-display">user@example.com</span>
    <select id="set-language"><option value="en" selected>EN</option></select>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  localStorage.clear();
  mockIsAnyPlaceholder.value = false;
  mockUpdateProfile.mockResolvedValue({ success: true });
  mockSafeRpc.mockResolvedValue({ data: null, error: null });
  mockGetEl.mockImplementation((id: string) => document.getElementById(id));
  mockGetChecked.mockReturnValue(true);
});

import { saveSettings } from '../src/pages/settings.save.ts';

describe('saveSettings — validates username format', () => {
  it('TC1: shows error toast when username has invalid characters', async () => {
    mockGetEl.mockImplementation((id: string) => {
      if (id === 'set-username') return { value: 'bad user!' } as HTMLInputElement;
      return document.getElementById(id);
    });
    await saveSettings();
    expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('Username'));
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('TC2: shows error toast when display name exceeds 30 chars', async () => {
    mockGetEl.mockImplementation((id: string) => {
      if (id === 'set-display-name') return { value: 'a'.repeat(31) } as HTMLInputElement;
      if (id === 'set-username') return { value: '' } as HTMLInputElement;
      if (id === 'set-bio') return { value: '' } as HTMLTextAreaElement;
      return document.getElementById(id);
    });
    await saveSettings();
    expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('Display name'));
  });

  it('TC3: shows error when bio exceeds 160 chars', async () => {
    mockGetEl.mockImplementation((id: string) => {
      if (id === 'set-display-name') return { value: '' } as HTMLInputElement;
      if (id === 'set-username') return { value: '' } as HTMLInputElement;
      if (id === 'set-bio') return { value: 'x'.repeat(161) } as HTMLTextAreaElement;
      return document.getElementById(id);
    });
    await saveSettings();
    expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('Bio'));
  });
});

describe('saveSettings — saves to localStorage', () => {
  it('TC4: writes settings to localStorage after validation passes', async () => {
    mockGetEl.mockImplementation((id: string) => {
      if (id === 'set-display-name') return { value: 'Name' } as HTMLInputElement;
      if (id === 'set-username') return { value: 'user1' } as HTMLInputElement;
      if (id === 'set-bio') return { value: 'bio' } as HTMLTextAreaElement;
      if (id === 'set-email-display') return { textContent: 'a@b.com' } as HTMLElement;
      if (id === 'set-language') return { value: 'en' } as HTMLSelectElement;
      return document.getElementById(id);
    });
    await saveSettings();
    const saved = JSON.parse(localStorage.getItem('colosseum_settings') || '{}');
    expect(saved.display_name).toBe('Name');
  });
});

describe('saveSettings — calls updateProfile when not placeholder', () => {
  it('TC5: calls updateProfile with display_name, username, bio', async () => {
    mockGetEl.mockImplementation((id: string) => {
      if (id === 'set-display-name') return { value: 'Name' } as HTMLInputElement;
      if (id === 'set-username') return { value: 'user1' } as HTMLInputElement;
      if (id === 'set-bio') return { value: 'bio' } as HTMLTextAreaElement;
      if (id === 'set-email-display') return { textContent: 'a@b.com' } as HTMLElement;
      if (id === 'set-language') return { value: 'en' } as HTMLSelectElement;
      return document.getElementById(id);
    });
    await saveSettings();
    expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({
      display_name: 'Name',
      username: 'user1',
    }));
  });
});

describe('saveSettings — calls safeRpc for notification settings', () => {
  it('TC6: calls safeRpc("save_user_settings") with notification params', async () => {
    mockGetEl.mockImplementation((id: string) => {
      if (id === 'set-display-name') return { value: '' } as HTMLInputElement;
      if (id === 'set-username') return { value: '' } as HTMLInputElement;
      if (id === 'set-bio') return { value: '' } as HTMLTextAreaElement;
      if (id === 'set-email-display') return { textContent: '' } as HTMLElement;
      if (id === 'set-language') return { value: 'en' } as HTMLSelectElement;
      return document.getElementById(id);
    });
    await saveSettings();
    expect(mockSafeRpc).toHaveBeenCalledWith('save_user_settings', expect.objectContaining({
      p_notif_challenge: expect.anything(),
    }));
  });
});

describe('saveSettings — shows success toast', () => {
  it('TC7: calls toast with success message on happy path', async () => {
    mockGetEl.mockImplementation((id: string) => {
      if (id === 'set-display-name') return { value: '' } as HTMLInputElement;
      if (id === 'set-username') return { value: '' } as HTMLInputElement;
      if (id === 'set-bio') return { value: '' } as HTMLTextAreaElement;
      if (id === 'set-email-display') return { textContent: '' } as HTMLElement;
      if (id === 'set-language') return { value: 'en' } as HTMLSelectElement;
      return document.getElementById(id);
    });
    await saveSettings();
    expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('saved'));
  });
});

describe('saveSettings — skips when save-btn already disabled', () => {
  it('TC8: returns early without calling updateProfile when button disabled', async () => {
    mockGetEl.mockImplementation((id: string) => {
      if (id === 'save-btn') return { disabled: true } as HTMLButtonElement;
      return document.getElementById(id);
    });
    await saveSettings();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});

describe('ARCH — src/pages/settings.save.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../config.ts', './settings.helpers.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/settings.save.ts'),
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
