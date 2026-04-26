/**
 * Integration tests — seam #536
 * src/notifications.ts -> notifications.actions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSafeRpc = vi.fn().mockResolvedValue({ error: null });
const mockGetSupabaseClient = vi.fn();
const mockGetIsPlaceholderMode = vi.fn();
const mockMarkOneRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockUpdateBadge = vi.fn();
const mockRenderList = vi.fn();

vi.mock('../../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getSupabaseClient: mockGetSupabaseClient,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getCurrentUser: vi.fn().mockReturnValue(null),
  ready: Promise.resolve(),
}));

vi.mock('../../src/notifications.state.ts', () => ({
  markOneRead: mockMarkOneRead,
  markAllAsRead: mockMarkAllAsRead,
  notifications: [],
  unreadCount: 0,
  pollInterval: null,
  panelOpen: false,
  setNotifications: vi.fn(),
  setPollInterval: vi.fn(),
  computeUnreadCount: vi.fn(),
  getPlaceholderNotifs: vi.fn().mockReturnValue([]),
  setPanelOpen: vi.fn(),
}));

vi.mock('../../src/notifications.panel.ts', () => ({
  updateBadge: mockUpdateBadge,
  renderList: mockRenderList,
  createPanel: vi.fn(),
  open_panel: vi.fn(),
  close_panel: vi.fn(),
}));

vi.mock('../../src/config.ts', () => ({
  FEATURES: { notifications: true },
  ModeratorConfig: { escapeHTML: (s: string) => s },
}));

vi.mock('../../src/push-notifications.ts', () => ({
  initPushNotifications: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/notifications.types.ts', () => ({
  TYPES: {},
  ECONOMY_TYPES: new Set(),
}));

function makeTimestamp(secondsAgo: number): string {
  return new Date(Date.now() - secondsAgo * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// timeAgo tests
// ---------------------------------------------------------------------------

describe('notifications.actions: timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('TC1: returns just now for a timestamp 30 seconds ago', async () => {
    const { timeAgo } = await import('../../src/notifications.actions.ts');
    expect(timeAgo(makeTimestamp(30))).toBe('just now');
  });

  it('TC2: formats minutes correctly', async () => {
    const { timeAgo } = await import('../../src/notifications.actions.ts');
    expect(timeAgo(makeTimestamp(5 * 60 + 10))).toBe('5m ago');
  });

  it('TC3: formats hours correctly', async () => {
    const { timeAgo } = await import('../../src/notifications.actions.ts');
    expect(timeAgo(makeTimestamp(3 * 3600 + 60))).toBe('3h ago');
  });

  it('TC4: formats days correctly', async () => {
    const { timeAgo } = await import('../../src/notifications.actions.ts');
    expect(timeAgo(makeTimestamp(2 * 86400 + 3600))).toBe('2d ago');
  });

  it('TC5: returns empty string for null undefined empty-string', async () => {
    const { timeAgo } = await import('../../src/notifications.actions.ts');
    expect(timeAgo(null)).toBe('');
    expect(timeAgo(undefined)).toBe('');
    expect(timeAgo('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// markRead tests
// ---------------------------------------------------------------------------

describe('notifications.actions: markRead', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    vi.clearAllMocks();
    mockSafeRpc.mockResolvedValue({ error: null });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('TC6: calls safeRpc mark_notifications_read with id array when not placeholder', async () => {
    mockMarkOneRead.mockReturnValue(true);
    mockGetSupabaseClient.mockReturnValue({ from: vi.fn() });
    mockGetIsPlaceholderMode.mockReturnValue(false);
    const { markRead } = await import('../../src/notifications.actions.ts');
    markRead('notif-abc');
    await vi.advanceTimersByTimeAsync(0);
    expect(mockSafeRpc).toHaveBeenCalledWith('mark_notifications_read', { p_notification_ids: ['notif-abc'] });
    expect(mockUpdateBadge).toHaveBeenCalled();
    expect(mockRenderList).toHaveBeenCalled();
  });

  it('TC7: skips RPC in placeholder mode', async () => {
    mockMarkOneRead.mockReturnValue(true);
    mockGetSupabaseClient.mockReturnValue({ from: vi.fn() });
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const { markRead } = await import('../../src/notifications.actions.ts');
    markRead('notif-xyz');
    await vi.advanceTimersByTimeAsync(0);
    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(mockUpdateBadge).toHaveBeenCalled();
    expect(mockRenderList).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// markAllRead tests
// ---------------------------------------------------------------------------

describe('notifications.actions: markAllRead', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    vi.clearAllMocks();
    mockSafeRpc.mockResolvedValue({ error: null });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('TC8: calls safeRpc mark_notifications_read with null when not placeholder', async () => {
    mockGetSupabaseClient.mockReturnValue({ from: vi.fn() });
    mockGetIsPlaceholderMode.mockReturnValue(false);
    const { markAllRead } = await import('../../src/notifications.actions.ts');
    markAllRead();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockMarkAllAsRead).toHaveBeenCalled();
    expect(mockSafeRpc).toHaveBeenCalledWith('mark_notifications_read', { p_notification_ids: null });
    expect(mockUpdateBadge).toHaveBeenCalled();
    expect(mockRenderList).toHaveBeenCalled();
  });

  it('TC9: skips RPC in placeholder mode', async () => {
    mockGetSupabaseClient.mockReturnValue({ from: vi.fn() });
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const { markAllRead } = await import('../../src/notifications.actions.ts');
    markAllRead();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockMarkAllAsRead).toHaveBeenCalled();
    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(mockUpdateBadge).toHaveBeenCalled();
    expect(mockRenderList).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// ARCH: import lines filter check
// ---------------------------------------------------------------------------

describe('notifications.actions: ARCH import lines', () => {
  it('TC10: imports only from auth state and panel', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve('src/notifications.actions.ts');
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    for (const line of importLines) {
      expect(line).toMatch(/from\s+['"](\.[/]auth|\.[/]notifications[.]state|\.[/]notifications[.]panel)/);
    }
  });
});
