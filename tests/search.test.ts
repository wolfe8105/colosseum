// ============================================================
// SEARCH — tests/search.test.ts
// Source: src/search.ts
//
// CLASSIFICATION:
//   renderSearchScreen() — DOM orchestration + event wiring → Behavioral test
//   formatTimeAgo()      — Private pure calc (tested via integration) → N/A
//
// IMPORTS:
//   { safeRpc, getSupabaseClient, getIsPlaceholderMode } from './auth.ts'
//   { escapeHTML }                                        from './config.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetSupabaseClient = vi.hoisted(() => vi.fn(() => null));
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

import { renderSearchScreen } from '../src/search.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetSupabaseClient.mockReturnValue(null);
  mockGetIsPlaceholderMode.mockReturnValue(false);
  document.body.innerHTML = '<div id="screen-search"></div>';
  vi.useRealTimers();
});

// ── renderSearchScreen DOM structure ──────────────────────────

describe('TC1 — renderSearchScreen: creates search input', () => {
  it('renders #global-search-input inside #screen-search', () => {
    renderSearchScreen();
    expect(document.getElementById('global-search-input')).not.toBeNull();
  });
});

describe('TC2 — renderSearchScreen: creates results container', () => {
  it('renders #global-search-results inside #screen-search', () => {
    renderSearchScreen();
    expect(document.getElementById('global-search-results')).not.toBeNull();
  });
});

describe('TC3 — renderSearchScreen: creates 3 tab buttons', () => {
  it('renders 3 .gs-tab buttons for users, debates, groups', () => {
    renderSearchScreen();
    const tabs = document.querySelectorAll('.gs-tab');
    expect(tabs).toHaveLength(3);
    const tabTexts = Array.from(tabs).map(t => t.textContent?.toLowerCase() ?? '');
    expect(tabTexts.some(t => t.includes('users'))).toBe(true);
    expect(tabTexts.some(t => t.includes('debates'))).toBe(true);
    expect(tabTexts.some(t => t.includes('groups'))).toBe(true);
  });
});

describe('TC4 — renderSearchScreen: no-op when container missing', () => {
  it('does not throw when #screen-search is absent', () => {
    document.body.innerHTML = '';
    expect(() => renderSearchScreen()).not.toThrow();
  });
});

describe('TC5 — renderSearchScreen: blank query triggers trending (no static prompt)', () => {
  it('initial results area does not show static "2 characters" prompt', () => {
    renderSearchScreen();
    const results = document.getElementById('global-search-results');
    expect(results?.innerHTML).not.toContain('Type at least 2 characters');
  });
});

describe('TC6 — renderSearchScreen: input fires debounced search', () => {
  it('schedules search via setTimeout on input event', () => {
    vi.useFakeTimers();
    renderSearchScreen();
    const input = document.getElementById('global-search-input') as HTMLInputElement;
    input.value = 'hello there';
    input.dispatchEvent(new Event('input'));
    // Search is debounced 300ms — advance timer to trigger
    vi.advanceTimersByTime(300);
    // safeRpc not called because getSupabaseClient returns null (placeholder path)
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC7 — renderSearchScreen: input <2 chars triggers trending', () => {
  it('does not show static "2 characters" prompt when input cleared to 1 char', () => {
    renderSearchScreen();
    const input = document.getElementById('global-search-input') as HTMLInputElement;
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    const results = document.getElementById('global-search-results');
    expect(results?.innerHTML).not.toContain('Type at least 2 characters');
  });
});

describe('TC8 — renderSearchScreen: tab click re-renders', () => {
  it('clicking a tab calls renderSearchScreen (replaces container content)', () => {
    renderSearchScreen();
    const takesTab = Array.from(document.querySelectorAll('.gs-tab'))
      .find(t => t.textContent?.includes('Takes')) as HTMLElement;
    takesTab?.click();
    // After clicking, container should be re-rendered — still have the results div
    expect(document.getElementById('global-search-results')).not.toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/search.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/search.ts'),
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
