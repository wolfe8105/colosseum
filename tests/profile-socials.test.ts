/**
 * Tests for src/profile-socials.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockUpdateProfile = vi.hoisted(() => vi.fn());
const mockOnChange = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
  updateProfile: mockUpdateProfile,
  onChange: mockOnChange,
}));

import { initProfileSocials } from '../src/profile-socials.ts';

function buildDOM() {
  document.body.innerHTML = `
    <div id="profile-socials"></div>
    <button id="profile-socials-edit-btn">EDIT SOCIALS</button>
    <div id="profile-socials-edit" style="display:none">
      <input id="social-twitter" value="" />
      <input id="social-instagram" value="" />
      <input id="social-tiktok" value="" />
      <input id="social-youtube" value="" />
      <input id="social-snapchat" value="" />
      <input id="social-bluesky" value="" />
      <button id="socials-save-btn">SAVE</button>
      <button id="socials-cancel-btn">CANCEL</button>
    </div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
});

describe('initProfileSocials — no-ops when DOM elements missing', () => {
  it('TC1: returns early if required elements not found', () => {
    document.body.innerHTML = '';
    expect(() => initProfileSocials()).not.toThrow();
  });
});

describe('initProfileSocials — edit button shows edit panel', () => {
  it('TC2: clicking edit btn shows panel and populates inputs', () => {
    const profile = {
      social_twitter: 'testuser',
      social_instagram: '',
      social_tiktok: '',
      social_youtube: '',
      social_snapchat: '',
      social_bluesky: '',
    };
    mockGetCurrentProfile.mockReturnValue(profile);
    initProfileSocials();

    const editBtn = document.getElementById('profile-socials-edit-btn') as HTMLButtonElement;
    const editPanel = document.getElementById('profile-socials-edit') as HTMLDivElement;

    editBtn.click();

    expect(editPanel.style.display).toBe('block');
    expect(editBtn.style.display).toBe('none');
    const twitterInput = document.getElementById('social-twitter') as HTMLInputElement;
    expect(twitterInput.value).toBe('testuser');
  });
});

describe('initProfileSocials — cancel button hides panel', () => {
  it('TC3: clicking cancel restores edit btn and hides panel', () => {
    mockGetCurrentProfile.mockReturnValue({ social_twitter: '', social_instagram: '', social_tiktok: '', social_youtube: '', social_snapchat: '', social_bluesky: '' });
    initProfileSocials();

    const editBtn = document.getElementById('profile-socials-edit-btn') as HTMLButtonElement;
    const cancelBtn = document.getElementById('socials-cancel-btn') as HTMLButtonElement;
    const editPanel = document.getElementById('profile-socials-edit') as HTMLDivElement;

    editBtn.click();
    cancelBtn.click();

    expect(editPanel.style.display).toBe('none');
    expect(editBtn.style.display).toBe('inline-block');
  });
});

describe('initProfileSocials — save calls updateProfile with form values', () => {
  it('TC4: clicking save calls updateProfile with trimmed values', async () => {
    mockGetCurrentProfile.mockReturnValue({ social_twitter: '', social_instagram: '', social_tiktok: '', social_youtube: '', social_snapchat: '', social_bluesky: '' });
    mockUpdateProfile.mockResolvedValue(undefined);
    initProfileSocials();

    (document.getElementById('social-twitter') as HTMLInputElement).value = '@alice';
    (document.getElementById('social-instagram') as HTMLInputElement).value = 'alice_gram';

    const saveBtn = document.getElementById('socials-save-btn') as HTMLButtonElement;
    saveBtn.click();

    await new Promise(r => setTimeout(r, 0));

    expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({
      social_twitter: 'alice', // @ stripped
      social_instagram: 'alice_gram',
    }));
  });
});

describe('initProfileSocials — onChange registers listener', () => {
  it('TC5: calls onChange to register profile change listener', () => {
    initProfileSocials();
    expect(mockOnChange).toHaveBeenCalled();
  });
});

describe('initProfileSocials — save does not call updateProfile when already disabled', () => {
  it('TC6: does not double-call updateProfile on double-click', async () => {
    mockGetCurrentProfile.mockReturnValue({ social_twitter: '', social_instagram: '', social_tiktok: '', social_youtube: '', social_snapchat: '', social_bluesky: '' });
    mockUpdateProfile.mockResolvedValue(undefined);
    initProfileSocials();

    const saveBtn = document.getElementById('socials-save-btn') as HTMLButtonElement;
    saveBtn.click();
    saveBtn.click(); // second click while disabled

    await new Promise(r => setTimeout(r, 0));
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
  });
});

describe('ARCH — src/profile-socials.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './auth.ts', './auth.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/profile-socials.ts'),
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
