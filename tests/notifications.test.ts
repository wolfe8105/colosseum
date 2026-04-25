// ============================================================
// NOTIFICATIONS — tests/notifications.test.ts
// Source: src/notifications.ts
//
// CLASSIFICATION:
//   init()    — Orchestration (creates panel, starts polling) → Integration test
//   destroy() — Side-effect cleanup → Behavioral test
//
// IMPORTS:
//   { safeRpc, getCurrentUser, getIsPlaceholderMode, getSupabaseClient, ready } from './auth.ts'
//   { FEATURES }                                                                   from './config.ts'
//   sub-modules: notifications.state, notifications.panel, notifications.actions
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn(() => null));
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockGetSupabaseClient = vi.hoisted(() => vi.fn(() => null));
const mockFeatures = vi.hoisted(() => ({ notifications: true }));

const mockSetNotifications = vi.hoisted(() => vi.fn());
const mockSetPollInterval = vi.hoisted(() => vi.fn());
const mockComputeUnreadCount = vi.hoisted(() => vi.fn());
const mockGetPlaceholderNotifs = vi.hoisted(() => vi.fn(() => []));
const mockPollIntervalRef = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockPanelOpenRef = vi.hoisted(() => ({ value: false }));

const mockCreatePanel = vi.hoisted(() => vi.fn());
const mockOpen_panel = vi.hoisted(() => vi.fn());
const mockClose_panel = vi.hoisted(() => vi.fn());
const mockUpdateBadge = vi.hoisted(() => vi.fn());
const mockRenderList = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentUser: mockGetCurrentUser,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getSupabaseClient: mockGetSupabaseClient,
  ready: Promise.resolve(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  get FEATURES() { return mockFeatures; },
}));

vi.mock('../src/notifications.state.ts', () => ({
  get notifications() { return []; },
  get unreadCount() { return 0; },
  get pollInterval() { return mockPollIntervalRef.value; },
  get panelOpen() { return mockPanelOpenRef.value; },
  setNotifications: mockSetNotifications,
  setPollInterval: mockSetPollInterval,
  computeUnreadCount: mockComputeUnreadCount,
  getPlaceholderNotifs: mockGetPlaceholderNotifs,
}));

vi.mock('../src/notifications.panel.ts', () => ({
  createPanel: mockCreatePanel,
  open_panel: mockOpen_panel,
  close_panel: mockClose_panel,
  updateBadge: mockUpdateBadge,
  renderList: mockRenderList,
}));

vi.mock('../src/notifications.actions.ts', () => ({
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  timeAgo: vi.fn((d: Date) => 'now'),
}));

vi.mock('../src/notifications.types.ts', () => ({
  TYPES: {},
  ECONOMY_TYPES: [],
}));

import { init, destroy } from '../src/notifications.ts';

beforeEach(() => {
  mockSetNotifications.mockReset();
  mockSetPollInterval.mockReset();
  mockComputeUnreadCount.mockReset();
  mockCreatePanel.mockReset();
  mockUpdateBadge.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockGetCurrentUser.mockReturnValue(null);
  mockPollIntervalRef.value = null;
  document.body.innerHTML = '';
  Object.assign(mockFeatures, { notifications: true });
});

// ── init ──────────────────────────────────────────────────────

describe('TC1 — init: no-op when FEATURES.notifications is false', () => {
  it('does not call createPanel when feature is disabled', () => {
    mockFeatures.notifications = false;

    init();

    expect(mockCreatePanel).not.toHaveBeenCalled();
  });
});

describe('TC2 — init: calls createPanel when feature enabled', () => {
  it('calls createPanel on init', () => {
    init();
    expect(mockCreatePanel).toHaveBeenCalled();
  });
});

describe('TC3 — init: placeholder mode sets placeholder notifs', () => {
  it('calls setNotifications with placeholder data in placeholder mode', () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const fakeNotifs = [{ id: 'n1', type: 'test', message: 'hello' }];
    mockGetPlaceholderNotifs.mockReturnValue(fakeNotifs);

    init();

    expect(mockSetNotifications).toHaveBeenCalledWith(fakeNotifs);
    expect(mockComputeUnreadCount).toHaveBeenCalled();
    expect(mockUpdateBadge).toHaveBeenCalled();
  });
});

describe('TC4 — init: wires notif-btn click handler', () => {
  it('attaches click listener to #notif-btn if present', () => {
    document.body.innerHTML = '<button id="notif-btn"></button>';

    init();

    const btn = document.getElementById('notif-btn')!;
    btn.click();
    // panel is closed initially so open_panel should be called
    expect(mockOpen_panel).toHaveBeenCalled();
  });
});

// ── destroy ───────────────────────────────────────────────────

describe('TC5 — destroy: clears pollInterval when set', () => {
  it('calls setPollInterval(null) and clearInterval when interval exists', () => {
    const fakeInterval = setInterval(() => {}, 10000) as ReturnType<typeof setInterval>;
    mockPollIntervalRef.value = fakeInterval;

    destroy();

    expect(mockSetPollInterval).toHaveBeenCalledWith(null);
    clearInterval(fakeInterval);
  });
});

describe('TC6 — destroy: resets notifications to empty', () => {
  it('calls setNotifications([]) and updateBadge', () => {
    destroy();
    expect(mockSetNotifications).toHaveBeenCalledWith([]);
    expect(mockUpdateBadge).toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/notifications.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './auth.ts',
      './config.ts',
      './notifications.state.ts',
      './notifications.panel.ts',
      './notifications.actions.ts',
      './notifications.types.ts',
      './push-notifications.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/notifications.ts'),
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
