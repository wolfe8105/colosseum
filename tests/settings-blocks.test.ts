/**
 * Tests for src/pages/settings.blocks.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  escapeHTML: mockEscapeHTML,
}));

function buildDOM() {
  document.body.innerHTML = `
    <div id="blocked-users-section"></div>
    <div id="blocked-users-list"></div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
});

import { loadBlockedUsers } from '../src/pages/settings.blocks.ts';

describe('loadBlockedUsers — returns early when elements missing', () => {
  it('TC1: no-ops when blocked-users-list is absent', async () => {
    document.body.innerHTML = '';
    await loadBlockedUsers();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('loadBlockedUsers — calls safeRpc("get_blocked_users")', () => {
  it('TC2: calls safeRpc with get_blocked_users', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadBlockedUsers();
    expect(mockSafeRpc).toHaveBeenCalledWith('get_blocked_users', {});
  });
});

describe('loadBlockedUsers — empty state', () => {
  it('TC3: shows "No blocked users" when list is empty', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadBlockedUsers();
    expect(document.getElementById('blocked-users-list')!.innerHTML).toContain('No blocked users');
  });
});

describe('loadBlockedUsers — renders blocked users', () => {
  it('TC4: renders user rows with UNBLOCK buttons', async () => {
    mockSafeRpc.mockResolvedValue({
      data: [{ id: 'u1', username: 'fighter99', display_name: 'Fighter' }],
      error: null,
    });
    await loadBlockedUsers();
    const list = document.getElementById('blocked-users-list')!;
    expect(list.querySelectorAll('.unblock-btn').length).toBe(1);
  });

  it('TC5: renders user display name in row', async () => {
    mockSafeRpc.mockResolvedValue({
      data: [{ id: 'u1', username: 'fighter99', display_name: 'Fighter' }],
      error: null,
    });
    await loadBlockedUsers();
    expect(document.getElementById('blocked-users-list')!.innerHTML).toContain('FIGHTER');
  });
});

describe('loadBlockedUsers — unblock button', () => {
  it('TC6: clicking UNBLOCK calls safeRpc("unblock_user")', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: [{ id: 'u1', username: 'user1', display_name: 'User' }], error: null })
      .mockResolvedValue({ data: null, error: null });
    await loadBlockedUsers();
    document.querySelector<HTMLButtonElement>('.unblock-btn')!.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockSafeRpc).toHaveBeenCalledWith('unblock_user', { p_blocked_id: 'u1' });
  });

  it('TC7: unblock success removes the row', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: [{ id: 'u1', username: 'user1', display_name: 'User' }], error: null })
      .mockResolvedValue({ data: null, error: null });
    await loadBlockedUsers();
    document.querySelector<HTMLButtonElement>('.unblock-btn')!.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector('.blocked-user-row')).toBeNull();
  });
});

describe('loadBlockedUsers — error state', () => {
  it('TC8: shows error message when safeRpc throws', async () => {
    mockSafeRpc.mockRejectedValue(new Error('network'));
    await loadBlockedUsers();
    expect(document.getElementById('blocked-users-list')!.innerHTML).toContain('Could not load');
  });
});

describe('ARCH — src/pages/settings.blocks.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/settings.blocks.ts'),
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
