/**
 * Tests for src/pages/groups.nav.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSetActiveTab = vi.hoisted(() => vi.fn());
const mockSetActiveDetailTab = vi.hoisted(() => vi.fn());
const mockSetActiveCategory = vi.hoisted(() => vi.fn());
const mockSetCurrentGroupId = vi.hoisted(() => vi.fn());
const mockSetCallerRole = vi.hoisted(() => vi.fn());
const mockActiveCategory = vi.hoisted(() => ({ value: null as string | null }));
const mockCurrentGroupId = vi.hoisted(() => ({ value: null as string | null }));
const mockCallerRole = vi.hoisted(() => ({ value: null as string | null }));
const mockLoadPendingAuditions = vi.hoisted(() => vi.fn());
const mockLoadMyGroups = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLoadLeaderboard = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLoadDiscover = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../src/pages/groups.state.ts', () => ({
  get activeCategory() { return mockActiveCategory.value; },
  get currentGroupId() { return mockCurrentGroupId.value; },
  get callerRole() { return mockCallerRole.value; },
  setActiveTab: mockSetActiveTab,
  setActiveDetailTab: mockSetActiveDetailTab,
  setActiveCategory: mockSetActiveCategory,
  setCurrentGroupId: mockSetCurrentGroupId,
  setCallerRole: mockSetCallerRole,
}));

vi.mock('../src/pages/groups.auditions.ts', () => ({
  loadPendingAuditions: mockLoadPendingAuditions,
}));

vi.mock('../src/pages/groups.load.ts', () => ({
  loadMyGroups: mockLoadMyGroups,
  loadLeaderboard: mockLoadLeaderboard,
  loadDiscover: mockLoadDiscover,
}));

import { switchTab, switchDetailTab, filterCategory, showLobby } from '../src/pages/groups.nav.ts';

function buildDOM() {
  document.body.innerHTML = `
    <div id="lobby-tabs">
      <button class="tab-btn">discover</button>
      <button class="tab-btn">mine</button>
      <button class="tab-btn">leaderboard</button>
    </div>
    <div id="tab-discover"></div>
    <div id="tab-mine"></div>
    <div id="tab-leaderboard"></div>
    <div id="detail-tabs">
      <button class="tab-btn">feed</button>
      <button class="tab-btn">challenges</button>
      <button class="tab-btn">members</button>
      <button class="tab-btn">auditions</button>
    </div>
    <div id="detail-feed"></div>
    <div id="detail-challenges"></div>
    <div id="detail-members-list"></div>
    <div id="detail-auditions"></div>
    <span class="cat-pill active" data-cat="all">All</span>
    <span class="cat-pill" data-cat="sports">Sports</span>
    <div id="view-lobby"></div>
    <div id="view-detail" style="display:block"></div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  mockCurrentGroupId.value = null;
  mockCallerRole.value = null;
});

describe('switchTab — calls setActiveTab', () => {
  it('TC1: calls setActiveTab with provided tab', () => {
    switchTab('mine');
    expect(mockSetActiveTab).toHaveBeenCalledWith('mine');
  });
});

describe('switchTab — shows correct panel, hides others', () => {
  it('TC2: discover tab shows discover panel, hides mine and leaderboard', () => {
    switchTab('discover');
    expect(document.getElementById('tab-discover')!.style.display).toBe('block');
    expect(document.getElementById('tab-mine')!.style.display).toBe('none');
    expect(document.getElementById('tab-leaderboard')!.style.display).toBe('none');
  });

  it('TC3: mine tab shows mine panel', () => {
    switchTab('mine');
    expect(document.getElementById('tab-mine')!.style.display).toBe('block');
    expect(document.getElementById('tab-discover')!.style.display).toBe('none');
  });
});

describe('switchTab — activates correct tab button', () => {
  it('TC4: marks the correct tab button active', () => {
    switchTab('leaderboard');
    const btns = document.querySelectorAll('#lobby-tabs .tab-btn');
    expect(btns[2].classList.contains('active')).toBe(true);
    expect(btns[0].classList.contains('active')).toBe(false);
    expect(btns[1].classList.contains('active')).toBe(false);
  });
});

describe('switchTab — triggers dynamic load on mine tab', () => {
  it('TC5: switching to mine triggers loadMyGroups (via dynamic import)', async () => {
    switchTab('mine');
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(mockLoadMyGroups).toHaveBeenCalled();
  });
});

describe('switchDetailTab — calls setActiveDetailTab', () => {
  it('TC6: calls setActiveDetailTab with provided tab', () => {
    switchDetailTab('feed');
    expect(mockSetActiveDetailTab).toHaveBeenCalledWith('feed');
  });
});

describe('switchDetailTab — shows correct detail panel', () => {
  it('TC7: members tab shows members panel', () => {
    switchDetailTab('members');
    expect(document.getElementById('detail-members-list')!.style.display).toBe('block');
    expect(document.getElementById('detail-feed')!.style.display).toBe('none');
  });
});

describe('switchDetailTab — auditions tab calls loadPendingAuditions when groupId set', () => {
  it('TC8: calls loadPendingAuditions when currentGroupId is set', () => {
    mockCurrentGroupId.value = 'g1';
    mockCallerRole.value = 'leader';
    switchDetailTab('auditions');
    expect(mockLoadPendingAuditions).toHaveBeenCalledWith('g1', 'leader');
  });

  it('TC9: does not call loadPendingAuditions when currentGroupId is null', () => {
    mockCurrentGroupId.value = null;
    switchDetailTab('auditions');
    expect(mockLoadPendingAuditions).not.toHaveBeenCalled();
  });
});

describe('filterCategory — updates active pill and calls loadDiscover', () => {
  it('TC10: removes active from other pills and adds to clicked pill', async () => {
    const pill = document.querySelector<HTMLElement>('.cat-pill[data-cat="sports"]')!;
    filterCategory('sports', pill);
    await Promise.resolve();
    await Promise.resolve();
    expect(pill.classList.contains('active')).toBe(true);
    expect(document.querySelector('.cat-pill[data-cat="all"]')!.classList.contains('active')).toBe(false);
  });

  it('TC11: calls setActiveCategory with the given cat', async () => {
    const pill = document.querySelector<HTMLElement>('.cat-pill[data-cat="sports"]')!;
    filterCategory('sports', pill);
    expect(mockSetActiveCategory).toHaveBeenCalledWith('sports');
  });

  it('TC12: triggers loadDiscover (via dynamic import)', async () => {
    const pill = document.querySelector<HTMLElement>('.cat-pill[data-cat="sports"]')!;
    filterCategory('sports', pill);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(mockLoadDiscover).toHaveBeenCalled();
  });
});

describe('showLobby — resets state and swaps views', () => {
  it('TC13: calls setCurrentGroupId(null) and setCallerRole(null)', () => {
    showLobby();
    expect(mockSetCurrentGroupId).toHaveBeenCalledWith(null);
    expect(mockSetCallerRole).toHaveBeenCalledWith(null);
  });

  it('TC14: hides view-detail and shows view-lobby', () => {
    showLobby();
    expect(document.getElementById('view-detail')!.style.display).toBe('none');
    expect(document.getElementById('view-lobby')!.style.display).toBe('block');
  });
});

describe('ARCH — src/pages/groups.nav.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./groups.state.ts', './groups.auditions.ts', './groups.load.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/groups.nav.ts'),
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
