/**
 * Tests for src/pages/home.depth.ts
 * Self-wiring module (no exports). Tests verify DOM wiring by simulating events.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockUpdateProfile = vi.hoisted(() => vi.fn());
const mockGetFollowers = vi.hoisted(() => vi.fn());
const mockGetFollowing = vi.hoisted(() => vi.fn());
const mockShowUserProfile = vi.hoisted(() => vi.fn());
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
  updateProfile: mockUpdateProfile,
  getFollowers: mockGetFollowers,
  getFollowing: mockGetFollowing,
  showUserProfile: mockShowUserProfile,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
}));

// Build DOM before module load — module wires events at import time
document.body.innerHTML = `
  <div id="profile-avatar"></div>
  <div id="profile-bio-display"></div>
  <div id="profile-bio-edit" style="display:none"></div>
  <textarea id="profile-bio-textarea"></textarea>
  <span id="bio-charcount"></span>
  <button id="bio-cancel-btn"></button>
  <button id="bio-save-btn">SAVE</button>
  <div id="followers-stat"></div>
  <div id="following-stat"></div>
`;

await import('../src/pages/home.depth.ts');

beforeEach(() => {
  vi.clearAllMocks();
  // Reset mutable DOM state between tests
  const bioDisplay = document.getElementById('profile-bio-display')!;
  const bioEdit = document.getElementById('profile-bio-edit')!;
  bioDisplay.style.display = '';
  bioEdit.style.display = 'none';
  (document.getElementById('profile-bio-textarea') as HTMLTextAreaElement).value = '';
  (document.getElementById('bio-save-btn') as HTMLButtonElement).disabled = false;
  (document.getElementById('bio-save-btn') as HTMLButtonElement).textContent = 'SAVE';
  document.getElementById('follow-list-sheet')?.remove();
  document.getElementById('avatar-picker-sheet')?.remove();
  mockGetCurrentProfile.mockReturnValue({ bio: 'Existing bio', avatar_url: '' });
  mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
});

describe('bio display click — shows edit panel', () => {
  it('TC1: clicking bio display hides display and shows edit panel', () => {
    document.getElementById('profile-bio-display')!.click();
    expect(document.getElementById('profile-bio-display')!.style.display).toBe('none');
    expect(document.getElementById('profile-bio-edit')!.style.display).toBe('block');
  });

  it('TC2: clicking bio display loads current bio into textarea', () => {
    mockGetCurrentProfile.mockReturnValue({ bio: 'My bio text', avatar_url: '' });
    document.getElementById('profile-bio-display')!.click();
    expect((document.getElementById('profile-bio-textarea') as HTMLTextAreaElement).value).toBe('My bio text');
  });
});

describe('bio cancel — hides edit panel', () => {
  it('TC3: clicking cancel hides edit panel and shows display', () => {
    document.getElementById('profile-bio-display')!.click();
    document.getElementById('bio-cancel-btn')!.click();
    expect(document.getElementById('profile-bio-edit')!.style.display).toBe('none');
    expect(document.getElementById('profile-bio-display')!.style.display).toBe('');
  });
});

describe('bio save — calls updateProfile', () => {
  it('TC4: clicking save calls updateProfile with textarea value', async () => {
    mockUpdateProfile.mockResolvedValue({ success: true });
    document.getElementById('profile-bio-display')!.click();
    (document.getElementById('profile-bio-textarea') as HTMLTextAreaElement).value = 'New bio';
    document.getElementById('bio-save-btn')!.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockUpdateProfile).toHaveBeenCalledWith({ bio: 'New bio' });
  });

  it('TC5: successful save shows success toast', async () => {
    mockUpdateProfile.mockResolvedValue({ success: true });
    document.getElementById('profile-bio-display')!.click();
    (document.getElementById('profile-bio-textarea') as HTMLTextAreaElement).value = 'Bio';
    document.getElementById('bio-save-btn')!.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockShowToast).toHaveBeenCalledWith('Bio updated!', 'success');
  });
});

describe('avatar click — creates picker sheet', () => {
  it('TC6: clicking profile-avatar creates #avatar-picker-sheet in body', () => {
    document.getElementById('profile-avatar')!.click();
    const sheet = document.getElementById('avatar-picker-sheet');
    expect(sheet).not.toBeNull();
    expect(sheet!.querySelector('.avatar-grid')).not.toBeNull();
  });

  it('TC7: avatar grid contains emoji options', () => {
    document.getElementById('profile-avatar')!.click();
    const options = document.querySelectorAll('.avatar-option');
    expect(options.length).toBeGreaterThan(0);
  });
});

describe('avatar selection — calls updateProfile', () => {
  it('TC8: clicking an avatar option calls updateProfile with emoji: prefix', async () => {
    mockUpdateProfile.mockResolvedValue({ success: true });
    document.getElementById('profile-avatar')!.click();
    const option = document.querySelector<HTMLElement>('.avatar-option')!;
    option.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_url: expect.stringContaining('emoji:') })
    );
  });
});

describe('followers-stat click — opens follow list for followers', () => {
  it('TC9: clicking followers-stat calls getFollowers with user id', async () => {
    mockGetFollowers.mockResolvedValue({ success: true, data: [] });
    document.getElementById('followers-stat')!.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockGetFollowers).toHaveBeenCalledWith('user-1');
  });

  it('TC10: shows "No followers yet" when getFollowers returns empty', async () => {
    mockGetFollowers.mockResolvedValue({ success: true, data: [] });
    document.getElementById('followers-stat')!.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    const sheet = document.getElementById('follow-list-sheet');
    expect(sheet?.innerHTML).toContain('No followers yet');
  });
});

describe('ARCH — src/pages/home.depth.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../auth.types.ts', '../config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.depth.ts'),
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
