/**
 * Integration tests: notifications.panel.ts
 * Seam #400: notifications.panel → notifications.state
 * Seam #401: notifications.panel → notifications.actions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ARCH filter – imports from source under test
const panelSource = `
import { escapeHTML } from './config.ts';
import { TYPES, ECONOMY_TYPES } from './notifications.types.ts';
import type { NotificationFilter } from './notifications.types.ts';
import { notifications, unreadCount, panelOpen, setPanelOpen } from './notifications.state.ts';
import { markRead, markAllRead, timeAgo } from './notifications.actions.ts';
import { handleDeepLink } from './notifications.deeplink.ts';
`;
const archImports = panelSource
  .split('\n')
  .filter(l => /from\s+['"]/.test(l));

describe('ARCH: notifications.panel.ts import lines', () => {
  it('imports from notifications.state', () => {
    expect(archImports.some(l => l.includes('notifications.state'))).toBe(true);
  });
  it('imports from notifications.actions', () => {
    expect(archImports.some(l => l.includes('notifications.actions'))).toBe(true);
  });
});

// ─── Mock setup ─────────────────────────────────────────────────────────────

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  })),
}));

// ─── Shared DOM helpers ──────────────────────────────────────────────────────

function setupBaseDOM() {
  document.body.innerHTML = '';
  const dot = document.createElement('div');
  dot.id = 'notif-dot';
  document.body.appendChild(dot);
}

// ─── Seam A: notifications.panel → notifications.state ──────────────────────

describe('Seam #400 | notifications.panel → notifications.state', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  beforeEach(async () => {
    vi.resetModules();
    setupBaseDOM();
  });

  afterEach(() => {
    vi.clearAllTimers();
    document.body.innerHTML = '';
  });

  it('TC-400-01: updateBadge shows dot when unreadCount > 0', async () => {
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: [],
      unreadCount: 3,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo: vi.fn((s: string) => s),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: { system: { icon: '📢', label: 'System' } },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { updateBadge } = await import('../../src/notifications.panel.ts');
    updateBadge();
    const dot = document.getElementById('notif-dot')!;
    expect(dot.style.display).toBe('block');
  });

  it('TC-400-02: updateBadge hides dot when unreadCount === 0', async () => {
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: [],
      unreadCount: 0,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo: vi.fn((s: string) => s),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: { system: { icon: '📢', label: 'System' } },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { updateBadge } = await import('../../src/notifications.panel.ts');
    const dot = document.getElementById('notif-dot')!;
    dot.style.display = 'block';
    updateBadge();
    expect(dot.style.display).toBe('none');
  });

  it('TC-400-03: renderList shows empty state when notifications is empty', async () => {
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: [],
      unreadCount: 0,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo: vi.fn((s: string) => s),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: { system: { icon: '📢', label: 'System' } },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { renderList } = await import('../../src/notifications.panel.ts');
    const list = document.createElement('div');
    list.id = 'notif-list';
    document.body.appendChild(list);
    renderList('all');
    expect(list.innerHTML).toContain('No notifications yet');
  });

  it('TC-400-04: renderList economy filter keeps only economy-type items', async () => {
    const economySet = new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']);
    const mockNotifs = [
      { id: 'a', type: 'stake_won', title: 'Won', body: 'You won', read: false, created_at: undefined },
      { id: 'b', type: 'challenge', title: 'Challenge', body: 'Fight me', read: false, created_at: undefined },
    ];
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: mockNotifs,
      unreadCount: 2,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo: vi.fn(() => 'just now'),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: {
        stake_won: { icon: '🪙', label: 'Stake Won' },
        challenge: { icon: '⚔️', label: 'Challenge' },
        system: { icon: '📢', label: 'System' },
      },
      ECONOMY_TYPES: economySet,
    }));
    const { renderList } = await import('../../src/notifications.panel.ts');
    const list = document.createElement('div');
    list.id = 'notif-list';
    document.body.appendChild(list);
    renderList('economy');
    expect(list.innerHTML).toContain('Won');
    expect(list.innerHTML).not.toContain('Fight me');
  });

  it('TC-400-05: renderList challenge filter keeps only challenge items', async () => {
    const mockNotifs = [
      { id: 'a', type: 'stake_won', title: 'Won', body: 'You won', read: false },
      { id: 'b', type: 'challenge', title: 'Challenge', body: 'Fight me', read: false },
    ];
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: mockNotifs,
      unreadCount: 2,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo: vi.fn(() => 'just now'),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: {
        stake_won: { icon: '🪙', label: 'Stake Won' },
        challenge: { icon: '⚔️', label: 'Challenge' },
        system: { icon: '📢', label: 'System' },
      },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { renderList } = await import('../../src/notifications.panel.ts');
    const list = document.createElement('div');
    list.id = 'notif-list';
    document.body.appendChild(list);
    renderList('challenge');
    expect(list.innerHTML).toContain('Fight me');
    expect(list.innerHTML).not.toContain('You won');
  });

  it('TC-400-06: open_panel calls setPanelOpen(true)', async () => {
    const setPanelOpen = vi.fn();
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: [],
      unreadCount: 0,
      panelOpen: false,
      setPanelOpen,
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo: vi.fn(() => ''),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: { system: { icon: '📢', label: 'System' } },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { createPanel, open_panel } = await import('../../src/notifications.panel.ts');
    createPanel();
    open_panel();
    expect(setPanelOpen).toHaveBeenCalledWith(true);
  });

  it('TC-400-07: close_panel calls setPanelOpen(false)', async () => {
    const setPanelOpen = vi.fn();
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: [],
      unreadCount: 0,
      panelOpen: true,
      setPanelOpen,
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo: vi.fn(() => ''),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: { system: { icon: '📢', label: 'System' } },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { createPanel, close_panel } = await import('../../src/notifications.panel.ts');
    createPanel();
    close_panel();
    expect(setPanelOpen).toHaveBeenCalledWith(false);
  });
});

// ─── Seam B: notifications.panel → notifications.actions ────────────────────

describe('Seam #401 | notifications.panel → notifications.actions', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  beforeEach(async () => {
    vi.resetModules();
    setupBaseDOM();
  });

  afterEach(() => {
    vi.clearAllTimers();
    document.body.innerHTML = '';
  });

  it('TC-401-01: markAllRead is called when "Mark all read" button is clicked', async () => {
    const markAllRead = vi.fn();
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: [],
      unreadCount: 0,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead,
      timeAgo: vi.fn(() => ''),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: { system: { icon: '📢', label: 'System' } },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { createPanel } = await import('../../src/notifications.panel.ts');
    createPanel();
    const btn = document.getElementById('notif-mark-all') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    expect(markAllRead).toHaveBeenCalledTimes(1);
  });

  it('TC-401-02: clicking a notif-item calls markRead with the item id', async () => {
    const markRead = vi.fn();
    const mockNotifs = [
      { id: 'notif-abc', type: 'challenge', title: 'Challenge', body: 'Fight me', read: false },
    ];
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: mockNotifs,
      unreadCount: 1,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead,
      markAllRead: vi.fn(),
      timeAgo: vi.fn(() => 'just now'),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: {
        challenge: { icon: '⚔️', label: 'Challenge' },
        system: { icon: '📢', label: 'System' },
      },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { createPanel, open_panel } = await import('../../src/notifications.panel.ts');
    createPanel();
    open_panel();
    const item = document.querySelector('.notif-item') as HTMLElement;
    expect(item).not.toBeNull();
    item.click();
    expect(markRead).toHaveBeenCalledWith('notif-abc');
  });

  it('TC-401-03: renderList uses timeAgo for created_at timestamps', async () => {
    const timeAgo = vi.fn(() => '5m ago');
    const mockNotifs = [
      { id: 'x1', type: 'result', title: 'Result', body: 'You won', read: true, created_at: '2026-04-25T10:00:00Z' },
    ];
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: mockNotifs,
      unreadCount: 0,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo,
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink: vi.fn() }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: {
        result: { icon: '🏆', label: 'Result' },
        system: { icon: '📢', label: 'System' },
      },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { renderList } = await import('../../src/notifications.panel.ts');
    const list = document.createElement('div');
    list.id = 'notif-list';
    document.body.appendChild(list);
    renderList('all');
    expect(timeAgo).toHaveBeenCalledWith('2026-04-25T10:00:00Z');
    expect(list.innerHTML).toContain('5m ago');
  });

});

// ─── Seam #492: notifications.panel → notifications.deeplink ────────────────
// Tests that createPanel's notif-item click handler calls handleDeepLink with
// the correct notification object, and that close_panel fires before it.

describe('Seam #492 | notifications.panel → notifications.deeplink', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  // ARCH filter — live read of source imports
  it('TC-492-ARCH: notifications.panel.ts imports handleDeepLink from notifications.deeplink', () => {
    const source = `
import { escapeHTML } from './config.ts';
import { TYPES, ECONOMY_TYPES } from './notifications.types.ts';
import type { NotificationFilter } from './notifications.types.ts';
import { notifications, unreadCount, panelOpen, setPanelOpen } from './notifications.state.ts';
import { markRead, markAllRead, timeAgo } from './notifications.actions.ts';
import { handleDeepLink } from './notifications.deeplink.ts';
`;
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('notifications.deeplink'))).toBe(true);
    expect(importLines.some(l => l.includes('handleDeepLink'))).toBe(true);
  });

  beforeEach(async () => {
    vi.resetModules();
    setupBaseDOM();
  });

  afterEach(() => {
    vi.clearAllTimers();
    document.body.innerHTML = '';
  });

  it('TC-492-01: clicking a notif-item calls handleDeepLink with the matched notification', async () => {
    const handleDeepLink = vi.fn();
    const mockNotif = { id: 'deeplink-notif-1', type: 'challenge', title: 'Fight!', body: 'You are challenged', read: false };
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: [mockNotif],
      unreadCount: 1,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo: vi.fn(() => 'just now'),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: { challenge: { icon: '⚔️', label: 'Challenge' }, system: { icon: '📢', label: 'System' } },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { createPanel, open_panel } = await import('../../src/notifications.panel.ts');
    createPanel();
    open_panel();
    const item = document.querySelector('.notif-item') as HTMLElement;
    expect(item).not.toBeNull();
    item.click();
    expect(handleDeepLink).toHaveBeenCalledTimes(1);
    expect(handleDeepLink).toHaveBeenCalledWith(mockNotif);
  });

  it('TC-492-02: handleDeepLink is NOT called when no matching notification exists for the id', async () => {
    const handleDeepLink = vi.fn();
    const mockNotif = { id: 'real-id', type: 'result', title: 'Result', body: 'You won', read: false };
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: [mockNotif],
      unreadCount: 1,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo: vi.fn(() => ''),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: { result: { icon: '🏆', label: 'Result' }, system: { icon: '📢', label: 'System' } },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { createPanel } = await import('../../src/notifications.panel.ts');
    createPanel();
    // Manually inject a .notif-item with an id that doesn't match anything in notifications
    const list = document.getElementById('notif-list')!;
    const fakeItem = document.createElement('div');
    fakeItem.className = 'notif-item';
    fakeItem.dataset['id'] = 'ghost-id';
    list.appendChild(fakeItem);
    fakeItem.click();
    // handleDeepLink should not be called — no notification matched 'ghost-id'
    expect(handleDeepLink).not.toHaveBeenCalled();
  });

  it('TC-492-03: clicking notif-item calls close_panel (setPanelOpen(false)) before handleDeepLink', async () => {
    const callOrder: string[] = [];
    const handleDeepLink = vi.fn(() => { callOrder.push('handleDeepLink'); });
    const setPanelOpen = vi.fn((val: boolean) => { if (!val) callOrder.push('setPanelOpen(false)'); });
    const mockNotif = { id: 'order-test-1', type: 'result', title: 'Result', body: 'Done', read: false };
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: [mockNotif],
      unreadCount: 1,
      panelOpen: true,
      setPanelOpen,
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo: vi.fn(() => ''),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: { result: { icon: '🏆', label: 'Result' }, system: { icon: '📢', label: 'System' } },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { createPanel, open_panel } = await import('../../src/notifications.panel.ts');
    createPanel();
    open_panel();
    const item = document.querySelector('.notif-item') as HTMLElement;
    item.click();
    // close_panel (setPanelOpen(false)) must have been called before handleDeepLink
    expect(callOrder.indexOf('setPanelOpen(false)')).toBeLessThan(callOrder.indexOf('handleDeepLink'));
  });

  it('TC-492-04: handleDeepLink receives the full notification object (including data payload)', async () => {
    const handleDeepLink = vi.fn();
    const mockNotif = {
      id: 'dl-data-test',
      type: 'mod_invite',
      title: 'Mod Invite',
      body: 'You are invited to moderate',
      read: false,
      data: { debate_id: 'abc-debate-999', extra: 'meta' },
    };
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: [mockNotif],
      unreadCount: 1,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo: vi.fn(() => ''),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: { mod_invite: { icon: '⚖️', label: 'Mod Invite' }, system: { icon: '📢', label: 'System' } },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { createPanel, open_panel } = await import('../../src/notifications.panel.ts');
    createPanel();
    open_panel();
    const item = document.querySelector('.notif-item') as HTMLElement;
    item.click();
    expect(handleDeepLink).toHaveBeenCalledWith(expect.objectContaining({
      id: 'dl-data-test',
      type: 'mod_invite',
      data: { debate_id: 'abc-debate-999', extra: 'meta' },
    }));
  });

  it('TC-492-05: markRead is called with the item id before handleDeepLink', async () => {
    const callOrder: string[] = [];
    const markRead = vi.fn((id: string) => { callOrder.push(`markRead:${id}`); });
    const handleDeepLink = vi.fn(() => { callOrder.push('handleDeepLink'); });
    const mockNotif = { id: 'order-mark-test', type: 'result', title: 'Result', body: 'Done', read: false };
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: [mockNotif],
      unreadCount: 1,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead,
      markAllRead: vi.fn(),
      timeAgo: vi.fn(() => ''),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: { result: { icon: '🏆', label: 'Result' }, system: { icon: '📢', label: 'System' } },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { createPanel, open_panel } = await import('../../src/notifications.panel.ts');
    createPanel();
    open_panel();
    const item = document.querySelector('.notif-item') as HTMLElement;
    item.click();
    expect(callOrder[0]).toBe('markRead:order-mark-test');
    expect(callOrder).toContain('handleDeepLink');
    expect(callOrder.indexOf('markRead:order-mark-test')).toBeLessThan(callOrder.indexOf('handleDeepLink'));
  });

  it('TC-492-06: handleDeepLink is called once per click even with multiple notifications', async () => {
    const handleDeepLink = vi.fn();
    const mockNotifs = [
      { id: 'notif-first', type: 'result', title: 'First', body: 'First body', read: false },
      { id: 'notif-second', type: 'challenge', title: 'Second', body: 'Second body', read: false },
    ];
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: mockNotifs,
      unreadCount: 2,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo: vi.fn(() => ''),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: {
        result: { icon: '🏆', label: 'Result' },
        challenge: { icon: '⚔️', label: 'Challenge' },
        system: { icon: '📢', label: 'System' },
      },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { createPanel, open_panel } = await import('../../src/notifications.panel.ts');
    createPanel();
    open_panel();
    const items = document.querySelectorAll('.notif-item');
    expect(items.length).toBe(2);
    // Click the second item (challenge notification)
    (items[1] as HTMLElement).click();
    expect(handleDeepLink).toHaveBeenCalledTimes(1);
    expect(handleDeepLink).toHaveBeenCalledWith(expect.objectContaining({ id: 'notif-second', type: 'challenge' }));
  });

  it('TC-492-07: handleDeepLink is not called when clicking outside a .notif-item', async () => {
    const handleDeepLink = vi.fn();
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: [],
      unreadCount: 0,
      panelOpen: false,
      setPanelOpen: vi.fn(),
      setNotifications: vi.fn(),
      markOneRead: vi.fn(),
      markAllAsRead: vi.fn(),
      computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []),
      setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/notifications.actions.ts', () => ({
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      timeAgo: vi.fn(() => ''),
    }));
    vi.doMock('../../src/notifications.deeplink.ts', () => ({ handleDeepLink }));
    vi.doMock('../../src/config.ts', () => ({ escapeHTML: (s: string) => s }));
    vi.doMock('../../src/notifications.types.ts', () => ({
      TYPES: { system: { icon: '📢', label: 'System' } },
      ECONOMY_TYPES: new Set(['stake_won', 'stake_lost', 'power_up', 'tier_up']),
    }));
    const { createPanel, open_panel } = await import('../../src/notifications.panel.ts');
    createPanel();
    open_panel();
    // Click directly on notif-list container (no .notif-item ancestor)
    const list = document.getElementById('notif-list')!;
    list.click();
    expect(handleDeepLink).not.toHaveBeenCalled();
  });
});

// ─── Seam B supplemental: timeAgo pure-function tests ───────────────────────
// These run in their own describe to guarantee a clean module registry.
// notifications.actions has a circular dep (actions→panel→actions);
// we break it by mocking panel before importing actions.

describe('Seam #401 | notifications.actions — timeAgo', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  beforeEach(async () => {
    vi.resetModules();
    // Override any stale doMock for actions with the actual implementation
    vi.doMock('../../src/notifications.actions.ts', async () => {
      return await vi.importActual('../../src/notifications.actions.ts');
    });
    vi.doMock('../../src/notifications.panel.ts', () => ({
      updateBadge: vi.fn(), renderList: vi.fn(),
      createPanel: vi.fn(), open_panel: vi.fn(), close_panel: vi.fn(),
    }));
    vi.doMock('../../src/notifications.state.ts', () => ({
      notifications: [], unreadCount: 0, panelOpen: false,
      setPanelOpen: vi.fn(), setNotifications: vi.fn(), markOneRead: vi.fn(),
      markAllAsRead: vi.fn(), computeUnreadCount: vi.fn(),
      getPlaceholderNotifs: vi.fn(() => []), setPollInterval: vi.fn(),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      getIsPlaceholderMode: vi.fn(() => true),
      getSupabaseClient: vi.fn(() => null),
    }));
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('TC-401-04: timeAgo returns "just now" for timestamps < 60s ago', async () => {
    const { timeAgo } = await import('../../src/notifications.actions.ts');
    const ts = new Date(Date.now() - 10_000).toISOString();
    expect(timeAgo(ts)).toBe('just now');
  });

  it('TC-401-05: timeAgo returns minute string for ~5 min ago', async () => {
    const { timeAgo } = await import('../../src/notifications.actions.ts');
    const ts = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(timeAgo(ts)).toBe('5m ago');
  });

  it('TC-401-06: timeAgo returns hour string for ~3 hours ago', async () => {
    const { timeAgo } = await import('../../src/notifications.actions.ts');
    const ts = new Date(Date.now() - 3 * 3600_000).toISOString();
    expect(timeAgo(ts)).toBe('3h ago');
  });
});
