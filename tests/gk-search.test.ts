// ============================================================
// GATEKEEPER — F-24 Search
// Source: src/search.ts
// Spec: docs/product/THE-MODERATOR-FEATURE-SPECS-PENDING.md § F-24
//
// Written by Agent 2 (Gatekeeper). Tests prove the implementation
// matches the spec. Never written from the code.
//
// TC-S1  Three tabs: users, debates, groups (data-gs-tab attributes)
// TC-S2  No "takes" tab
// TC-S3  Tab label text: Users / Debates / Groups
// TC-S4  User search calls search_all RPC with p_types ['users']
// TC-S5  Debates tab calls search_all with p_types ['debates']
// TC-S6  Groups search calls search_all RPC with p_types ['groups']
// TC-S7  Blank query (< 2 chars) calls get_trending RPC
// TC-S8  User result row includes W/L record (XW/YL format)
// TC-S9  search_all called with p_query, p_types, p_limit params
// TC-S10 No-results message embeds the query: "No results for '<query>'"
// ARCH   src/search.ts only imports from ./auth.ts and ./config.ts
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetSupabaseClient = vi.hoisted(() => vi.fn(() => ({})));
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getSupabaseClient: mockGetSupabaseClient,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

// Dynamic import — re-imported after resetModules() each test
let renderSearchScreen: () => void;

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockSafeRpc.mockReset();
  mockGetSupabaseClient.mockReset();
  mockGetIsPlaceholderMode.mockReset();
  mockSafeRpc.mockResolvedValue({ data: [], error: null });
  mockGetSupabaseClient.mockReturnValue({});
  mockGetIsPlaceholderMode.mockReturnValue(false);
  document.body.innerHTML = '<div id="screen-search"></div>';
  const mod = await import('../src/search.ts');
  renderSearchScreen = mod.renderSearchScreen;
});

// ── TC-S1: Three tabs with correct data-gs-tab values ────────

describe('TC-S1 — three tabs exist with correct data-gs-tab attributes', () => {
  it('renders data-gs-tab="users", data-gs-tab="debates", data-gs-tab="groups"', () => {
    renderSearchScreen();
    const tabs = document.querySelectorAll('.gs-tab');
    const tabValues = Array.from(tabs).map(t => (t as HTMLElement).dataset.gsTab);
    expect(tabValues).toContain('users');
    expect(tabValues).toContain('debates');
    expect(tabValues).toContain('groups');
    expect(tabs).toHaveLength(3);
  });
});

// ── TC-S2: No "takes" tab ────────────────────────────────────

describe('TC-S2 — no "takes" tab exists', () => {
  it('does not render data-gs-tab="takes"', () => {
    renderSearchScreen();
    const tabs = document.querySelectorAll('.gs-tab');
    const tabValues = Array.from(tabs).map(t => (t as HTMLElement).dataset.gsTab);
    expect(tabValues).not.toContain('takes');
  });
});

// ── TC-S3: Tab label text ─────────────────────────────────────

describe('TC-S3 — tab labels are Users, Debates, Groups', () => {
  it('tab label text includes Users, Debates, Groups (not Takes)', () => {
    renderSearchScreen();
    const tabs = document.querySelectorAll('.gs-tab');
    const texts = Array.from(tabs).map(t => t.textContent?.toLowerCase() ?? '');
    expect(texts.some(t => t.includes('users'))).toBe(true);
    expect(texts.some(t => t.includes('debates'))).toBe(true);
    expect(texts.some(t => t.includes('groups'))).toBe(true);
    expect(texts.some(t => t.includes('takes'))).toBe(false);
  });
});

// ── TC-S4: User search calls search_all with p_types ['users'] ─

describe('TC-S4 — user search calls search_all RPC with p_types ["users"]', () => {
  it('calls safeRpc("search_all", { p_query, p_types: ["users"], p_limit })', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    renderSearchScreen();
    const input = document.getElementById('global-search-input') as HTMLInputElement;
    input.value = 'testuser';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'search_all',
      expect.objectContaining({ p_types: ['users'] })
    );
  });
});

// ── TC-S5: Debates tab calls search_all with p_types ['debates'] ─

describe('TC-S5 — debates tab calls search_all with p_types ["debates"]', () => {
  it('clicking debates tab and typing calls search_all with p_types ["debates"]', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    renderSearchScreen();
    const debatesTab = Array.from(document.querySelectorAll('.gs-tab'))
      .find(t => (t as HTMLElement).dataset.gsTab === 'debates') as HTMLElement;
    debatesTab.click();
    const input = document.getElementById('global-search-input') as HTMLInputElement;
    input.value = 'climate';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    const searchAllCalls = mockSafeRpc.mock.calls.filter(([name]: [string]) => name === 'search_all');
    const debateCall = searchAllCalls.find(
      ([, params]: [string, Record<string, unknown>]) =>
        Array.isArray(params.p_types) && params.p_types.includes('debates')
    );
    expect(debateCall).toBeDefined();
  });
});

// ── TC-S6: Groups search calls search_all with p_types ['groups'] ─

describe('TC-S6 — groups search calls search_all RPC with p_types ["groups"]', () => {
  it('clicking groups tab and typing calls search_all with p_types ["groups"]', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    renderSearchScreen();
    const groupsTab = Array.from(document.querySelectorAll('.gs-tab'))
      .find(t => (t as HTMLElement).dataset.gsTab === 'groups') as HTMLElement;
    groupsTab.click();
    const input = document.getElementById('global-search-input') as HTMLInputElement;
    input.value = 'science';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    const searchAllCalls = mockSafeRpc.mock.calls.filter(([name]: [string]) => name === 'search_all');
    const groupCall = searchAllCalls.find(
      ([, params]: [string, Record<string, unknown>]) =>
        Array.isArray(params.p_types) && params.p_types.includes('groups')
    );
    expect(groupCall).toBeDefined();
  });
});

// ── TC-S7: Blank query calls get_trending RPC ─────────────────

describe('TC-S7 — blank/short query calls get_trending RPC', () => {
  it('on initial render with no query, calls get_trending (not static message)', async () => {
    renderSearchScreen();
    await vi.waitFor(() => {
      expect(mockSafeRpc).toHaveBeenCalledWith('get_trending', expect.any(Object));
    }, { timeout: 500 });
  });

  it('clearing input back to < 2 chars calls get_trending', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    renderSearchScreen();
    await vi.runAllTimersAsync();
    mockSafeRpc.mockClear();

    const input = document.getElementById('global-search-input') as HTMLInputElement;
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    await vi.runAllTimersAsync();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_trending', expect.any(Object));
  });
});

// ── TC-S8: User result includes W/L record ────────────────────

describe('TC-S8 — user result row includes W/L record in XW/YL format', () => {
  it('renders wins and losses as XW/YL in user result HTML', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockSafeRpc.mockResolvedValue({
      data: [{
        id: 'u1',
        username: 'gladiator',
        display_name: 'Gladiator',
        elo_rating: 1847,
        wins: 23,
        losses: 12,
      }],
      error: null,
    });
    renderSearchScreen();
    await vi.runAllTimersAsync();

    const input = document.getElementById('global-search-input') as HTMLInputElement;
    input.value = 'gladiator';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    const results = document.getElementById('global-search-results');
    expect(results?.innerHTML).toMatch(/23W\/12L/);
  });
});

// ── TC-S9: search_all params include p_query, p_types, p_limit ─

describe('TC-S9 — search_all called with p_query, p_types, and p_limit', () => {
  it('passes all three required params to search_all', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    renderSearchScreen();
    const input = document.getElementById('global-search-input') as HTMLInputElement;
    input.value = 'findme';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    const searchAllCall = mockSafeRpc.mock.calls.find(([name]: [string]) => name === 'search_all');
    expect(searchAllCall).toBeDefined();
    const params = searchAllCall![1] as Record<string, unknown>;
    expect(params).toHaveProperty('p_query', 'findme');
    expect(params).toHaveProperty('p_types');
    expect(params).toHaveProperty('p_limit');
  });
});

// ── TC-S10: No-results embeds query in message ────────────────

describe('TC-S10 — no-results message embeds query: "No results for \'<query>\'"', () => {
  it('shows "No results for \'<query>\'" not generic "No results found"', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    renderSearchScreen();
    const input = document.getElementById('global-search-input') as HTMLInputElement;
    input.value = 'xyznotfound';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    const results = document.getElementById('global-search-results');
    expect(results?.innerHTML).toContain('No results for');
    expect(results?.innerHTML).toContain('xyznotfound');
    expect(results?.innerHTML).not.toContain('No results found');
  });
});

// ── ARCH: Only allowed imports ────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/search.ts only imports from allowed modules', () => {
  it('has no imports outside ./auth.ts and ./config.ts', () => {
    const allowed = ['./auth.ts', './config.ts'];
    const source = readFileSync(resolve(__dirname, '../src/search.ts'), 'utf-8');
    const importLines = source.split('\n').filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
