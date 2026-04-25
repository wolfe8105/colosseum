/**
 * Tests for src/pages/groups.load.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockRenderEmpty = vi.hoisted(() => vi.fn((icon: string, title: string, sub: string) => `<div>${title}</div>`));
const mockRenderGroupList = vi.hoisted(() => vi.fn());
const mockActiveCategory = vi.hoisted(() => ({ value: null as string | null }));
const mockCurrentUser = vi.hoisted(() => ({ value: null as { id: string } | null }));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_my_groups: {},
  get_group_leaderboard: {},
  discover_groups: {},
}));

vi.mock('../src/pages/groups.state.ts', () => ({
  get activeCategory() { return mockActiveCategory.value; },
  get currentUser() { return mockCurrentUser.value; },
}));

vi.mock('../src/pages/groups.utils.ts', () => ({
  renderEmpty: mockRenderEmpty,
  renderGroupList: mockRenderGroupList,
}));

import { loadDiscover, loadMyGroups, loadLeaderboard } from '../src/pages/groups.load.ts';

function buildDOM() {
  document.body.innerHTML = `
    <div id="discover-list"></div>
    <div id="mine-list"></div>
    <div id="leaderboard-list"></div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  mockActiveCategory.value = null;
  mockCurrentUser.value = { id: 'user-1' };
});

describe('loadDiscover — calls safeRpc with discover_groups', () => {
  it('TC1: calls safeRpc("discover_groups") with correct params', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadDiscover();
    expect(mockSafeRpc).toHaveBeenCalledWith('discover_groups', expect.objectContaining({ p_limit: 30 }), expect.anything());
  });
});

describe('loadDiscover — calls renderGroupList on success', () => {
  it('TC2: calls renderGroupList with returned groups', async () => {
    const groups = [{ id: 'g1', name: 'Test Group' }];
    mockSafeRpc.mockResolvedValue({ data: groups, error: null });
    await loadDiscover();
    expect(mockRenderGroupList).toHaveBeenCalledWith('discover-list', groups, false, false, null);
  });
});

describe('loadDiscover — shows error on failure', () => {
  it('TC3: shows error HTML when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    await loadDiscover();
    expect(mockRenderEmpty).toHaveBeenCalled();
  });
});

describe('loadMyGroups — shows sign-in prompt when no user', () => {
  it('TC4: renders sign-in prompt when currentUser is null', async () => {
    mockCurrentUser.value = null;
    await loadMyGroups();
    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(mockRenderEmpty).toHaveBeenCalled();
  });
});

describe('loadMyGroups — calls safeRpc with get_my_groups', () => {
  it('TC5: calls safeRpc("get_my_groups") when user is logged in', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadMyGroups();
    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_groups', {}, expect.anything());
  });
});

describe('loadMyGroups — shows empty state when no groups', () => {
  it('TC6: renders empty state HTML when groups array is empty', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadMyGroups();
    expect(mockRenderEmpty).toHaveBeenCalled();
  });
});

describe('loadLeaderboard — calls safeRpc with get_group_leaderboard', () => {
  it('TC7: calls safeRpc("get_group_leaderboard") with limit 20', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadLeaderboard();
    expect(mockSafeRpc).toHaveBeenCalledWith('get_group_leaderboard', { p_limit: 20 }, expect.anything());
  });
});

describe('loadLeaderboard — shows error on failure', () => {
  it('TC8: shows error HTML when safeRpc throws', async () => {
    mockSafeRpc.mockRejectedValue(new Error('network'));
    await loadLeaderboard();
    expect(mockRenderEmpty).toHaveBeenCalled();
  });
});

describe('ARCH — src/pages/groups.load.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      './groups.state.ts',
      './groups.utils.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/groups.load.ts'),
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
