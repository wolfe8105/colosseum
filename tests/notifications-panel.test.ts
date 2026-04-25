// ============================================================
// NOTIFICATIONS PANEL — tests/notifications-panel.test.ts
// Source: src/notifications.panel.ts
//
// CLASSIFICATION:
//   updateBadge()  — DOM mutation → Behavioral test
//   renderList()   — DOM render → Behavioral test
//   createPanel()  — DOM creation → Behavioral test
//   open_panel()   — Show/animate → Behavioral test
//   close_panel()  — Hide/animate → Behavioral test
//
// IMPORTS:
//   { escapeHTML }                       from './config.ts'
//   { TYPES, ECONOMY_TYPES }             from './notifications.types.ts'
//   { notifications, unreadCount, ... }  from './notifications.state.ts'
//   { markRead, markAllRead, timeAgo }   from './notifications.actions.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));
const mockMarkRead = vi.hoisted(() => vi.fn());
const mockMarkAllRead = vi.hoisted(() => vi.fn());
const mockTimeAgo = vi.hoisted(() => vi.fn(() => '2m ago'));
const mockSetPanelOpen = vi.hoisted(() => vi.fn());

// Mutable state
const mockNotifications = vi.hoisted(() => [] as any[]);
let mockUnreadCount = 0;
let mockPanelOpen = false;

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: vi.fn(),
  FEATURES: {},
}));

vi.mock('../src/notifications.types.ts', () => ({
  TYPES: {
    system: { icon: '🔔', label: 'System' },
    challenge: { icon: '⚔️', label: 'Challenge' },
    reaction: { icon: '🔥', label: 'Reaction' },
    result: { icon: '🏆', label: 'Result' },
    stake_won: { icon: '🪙', label: 'Stake Won' },
    tier_up: { icon: '🏅', label: 'Tier Up' },
    follow: { icon: '👤', label: 'Follow' },
  },
  ECONOMY_TYPES: new Set(['stake_won', 'tier_up']),
}));

vi.mock('../src/notifications.state.ts', () => ({
  get notifications() { return mockNotifications; },
  get unreadCount() { return mockUnreadCount; },
  get panelOpen() { return mockPanelOpen; },
  setPanelOpen: mockSetPanelOpen,
  setNotifications: vi.fn(),
  computeUnreadCount: vi.fn(),
}));

vi.mock('../src/notifications.actions.ts', () => ({
  markRead: mockMarkRead,
  markAllRead: mockMarkAllRead,
  timeAgo: mockTimeAgo,
}));

import { updateBadge, renderList, createPanel, open_panel, close_panel } from '../src/notifications.panel.ts';

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
  mockNotifications.length = 0;
  mockUnreadCount = 0;
  mockPanelOpen = false;
  mockMarkRead.mockReset();
  mockMarkAllRead.mockReset();
  mockSetPanelOpen.mockReset();
  document.body.innerHTML = '';
});

// ── updateBadge ───────────────────────────────────────────────

describe('TC1 — updateBadge: hides dot when unreadCount is 0', () => {
  it('sets display:none when no unread', () => {
    document.body.innerHTML = '<div id="notif-dot"></div>';
    mockUnreadCount = 0;

    updateBadge();

    const dot = document.getElementById('notif-dot') as HTMLElement;
    expect(dot.style.display).toBe('none');
  });
});

describe('TC2 — updateBadge: shows dot when unreadCount > 0', () => {
  it('sets display:block when there are unread notifications', () => {
    document.body.innerHTML = '<div id="notif-dot"></div>';
    mockUnreadCount = 3;

    updateBadge();

    const dot = document.getElementById('notif-dot') as HTMLElement;
    expect(dot.style.display).toBe('block');
  });
});

describe('TC3 — updateBadge: no-op when #notif-dot absent', () => {
  it('does not throw when dot element is missing', () => {
    expect(() => updateBadge()).not.toThrow();
  });
});

// ── renderList ────────────────────────────────────────────────

describe('TC4 — renderList: no-op when #notif-list absent', () => {
  it('does not throw when list element is missing', () => {
    expect(() => renderList()).not.toThrow();
  });
});

describe('TC5 — renderList: shows empty state when no notifications', () => {
  it('renders "No notifications yet" when list is empty', () => {
    document.body.innerHTML = '<div id="notif-list"></div>';

    renderList();

    expect(document.getElementById('notif-list')!.innerHTML).toContain('No notifications yet');
  });
});

describe('TC6 — renderList: renders notification items', () => {
  it('includes notification title in the rendered list', () => {
    mockNotifications.push({ id: 'n-1', type: 'system', title: 'Hello World', body: 'Test body', read: false });
    document.body.innerHTML = '<div id="notif-list"></div>';

    renderList();

    expect(document.getElementById('notif-list')!.innerHTML).toContain('Hello World');
  });
});

describe('TC7 — renderList: filters economy notifications', () => {
  it('only shows stake_won and tier_up for economy filter', () => {
    mockNotifications.push(
      { id: 'n-1', type: 'system', title: 'System', body: '', read: true },
      { id: 'n-2', type: 'stake_won', title: 'Stake Won!', body: '', read: false },
    );
    document.body.innerHTML = '<div id="notif-list"></div>';

    renderList('economy');

    const html = document.getElementById('notif-list')!.innerHTML;
    expect(html).toContain('Stake Won!');
    expect(html).not.toContain('System');
  });
});

describe('TC8 — renderList: unread notification shows dot indicator', () => {
  it('unread items contain the unread dot HTML', () => {
    mockNotifications.push({ id: 'n-3', type: 'system', title: 'Unread', body: '', read: false });
    document.body.innerHTML = '<div id="notif-list"></div>';

    renderList();

    // The unread dot div has a specific background
    expect(document.getElementById('notif-list')!.innerHTML).toContain('mod-magenta');
  });
});

// ── createPanel ───────────────────────────────────────────────

describe('TC9 — createPanel: creates #notif-panel in DOM', () => {
  it('appends panel element to body', () => {
    createPanel();

    expect(document.getElementById('notif-panel')).not.toBeNull();
  });
});

describe('TC10 — createPanel: idempotent — does not create duplicate panel', () => {
  it('calling twice results in only one #notif-panel', () => {
    createPanel();
    createPanel();

    expect(document.querySelectorAll('#notif-panel')).toHaveLength(1);
  });
});

describe('TC11 — createPanel: close button is wired', () => {
  it('#notif-close button is present in panel', () => {
    createPanel();

    expect(document.getElementById('notif-close')).not.toBeNull();
  });
});

// ── open_panel ────────────────────────────────────────────────

describe('TC12 — open_panel: no-op when panel absent', () => {
  it('does not throw when #notif-panel missing', () => {
    expect(() => open_panel()).not.toThrow();
  });
});

describe('TC13 — open_panel: sets display:flex on panel', () => {
  it('makes panel visible', () => {
    createPanel();
    document.body.innerHTML += '<div id="notif-list"></div>';

    open_panel();

    const panel = document.getElementById('notif-panel') as HTMLElement;
    expect(panel.style.display).toBe('flex');
  });
});

describe('TC14 — open_panel: calls setPanelOpen(true)', () => {
  it('updates panelOpen state', () => {
    createPanel();

    open_panel();

    expect(mockSetPanelOpen).toHaveBeenCalledWith(true);
  });
});

// ── close_panel ───────────────────────────────────────────────

describe('TC15 — close_panel: no-op when panel absent', () => {
  it('does not throw when #notif-panel missing', () => {
    expect(() => close_panel()).not.toThrow();
  });
});

describe('TC16 — close_panel: calls setPanelOpen(false)', () => {
  it('updates state to closed', () => {
    createPanel();
    open_panel();
    mockSetPanelOpen.mockReset();

    close_panel();

    expect(mockSetPanelOpen).toHaveBeenCalledWith(false);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/notifications.panel.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './config.ts',
      './notifications.types.ts',
      './notifications.state.ts',
      './notifications.actions.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/notifications.panel.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
