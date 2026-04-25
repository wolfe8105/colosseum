// ============================================================
// NOTIFICATIONS ACTIONS — tests/notifications-actions.test.ts
// Source: src/notifications.actions.ts
//
// CLASSIFICATION:
//   timeAgo()      — Pure date formatter → Unit test
//   markRead()     — State mutation + RPC → Integration test
//   markAllRead()  — State mutation + RPC → Integration test
//
// IMPORTS:
//   { safeRpc, getIsPlaceholderMode, getSupabaseClient } from './auth.ts'
//   { markOneRead, markAllAsRead }                       from './notifications.state.ts'
//   { updateBadge, renderList }                         from './notifications.panel.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockGetSupabaseClient = vi.hoisted(() => vi.fn(() => ({})));
const mockMarkOneRead = vi.hoisted(() => vi.fn(() => true));
const mockMarkAllAsRead = vi.hoisted(() => vi.fn());
const mockUpdateBadge = vi.hoisted(() => vi.fn());
const mockRenderList = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getSupabaseClient: mockGetSupabaseClient,
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/notifications.state.ts', () => ({
  markOneRead: mockMarkOneRead,
  markAllAsRead: mockMarkAllAsRead,
  setNotifications: vi.fn(),
  notifications: [],
  unreadCount: 0,
  panelOpen: false,
  pollInterval: null,
}));

vi.mock('../src/notifications.panel.ts', () => ({
  updateBadge: mockUpdateBadge,
  renderList: mockRenderList,
  createPanel: vi.fn(),
}));

import { timeAgo, markRead, markAllRead } from '../src/notifications.actions.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockSafeRpc.mockResolvedValue({ data: null, error: null });
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockGetSupabaseClient.mockReturnValue({});
  mockMarkOneRead.mockReturnValue(true);
  mockMarkAllAsRead.mockReset();
  mockUpdateBadge.mockReset();
  mockRenderList.mockReset();
});

// ── timeAgo ───────────────────────────────────────────────────

describe('TC1 — timeAgo: returns empty string for null/undefined', () => {
  it('returns "" for null', () => expect(timeAgo(null)).toBe(''));
  it('returns "" for undefined', () => expect(timeAgo(undefined)).toBe(''));
});

describe('TC2 — timeAgo: "just now" for under 60 seconds', () => {
  it('returns "just now" for 30 seconds ago', () => {
    const date = new Date(Date.now() - 30_000).toISOString();
    expect(timeAgo(date)).toBe('just now');
  });
});

describe('TC3 — timeAgo: minutes ago format', () => {
  it('returns "5m ago" for 5 minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(timeAgo(date)).toBe('5m ago');
  });
});

describe('TC4 — timeAgo: hours ago format', () => {
  it('returns "3h ago" for 3 hours ago', () => {
    const date = new Date(Date.now() - 3 * 3600_000).toISOString();
    expect(timeAgo(date)).toBe('3h ago');
  });
});

describe('TC5 — timeAgo: days ago format', () => {
  it('returns "2d ago" for 2 days ago', () => {
    const date = new Date(Date.now() - 2 * 24 * 3600_000).toISOString();
    expect(timeAgo(date)).toBe('2d ago');
  });
});

describe('TC6 — timeAgo: months ago format', () => {
  it('returns "1mo ago" for 31 days ago', () => {
    const date = new Date(Date.now() - 31 * 24 * 3600_000).toISOString();
    expect(timeAgo(date)).toBe('1mo ago');
  });
});

// ── markRead ──────────────────────────────────────────────────

describe('TC7 — markRead: calls updateBadge and renderList when markOneRead returns true', () => {
  it('updates UI after marking read', () => {
    markRead('notif-1');

    expect(mockUpdateBadge).toHaveBeenCalled();
    expect(mockRenderList).toHaveBeenCalled();
  });
});

describe('TC8 — markRead: calls safeRpc with notification id', () => {
  it('fires RPC to persist read state', async () => {
    markRead('notif-2');
    // allow the .then() to flush
    await new Promise(r => setTimeout(r, 0));

    expect(mockSafeRpc).toHaveBeenCalledWith('mark_notifications_read', {
      p_notification_ids: ['notif-2'],
    });
  });
});

describe('TC9 — markRead: skips RPC when no client', () => {
  it('does not call safeRpc when getSupabaseClient returns null', async () => {
    mockGetSupabaseClient.mockReturnValue(null);

    markRead('notif-3');
    await new Promise(r => setTimeout(r, 0));

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC10 — markRead: skips UI update when markOneRead returns false', () => {
  it('does not call updateBadge when notification was already read', () => {
    mockMarkOneRead.mockReturnValue(false);

    markRead('already-read');

    expect(mockUpdateBadge).not.toHaveBeenCalled();
  });
});

// ── markAllRead ───────────────────────────────────────────────

describe('TC11 — markAllRead: calls markAllAsRead, updateBadge, renderList', () => {
  it('updates state and re-renders', () => {
    markAllRead();

    expect(mockMarkAllAsRead).toHaveBeenCalled();
    expect(mockUpdateBadge).toHaveBeenCalled();
    expect(mockRenderList).toHaveBeenCalled();
  });
});

describe('TC12 — markAllRead: calls safeRpc with null ids to mark all', () => {
  it('fires RPC with p_notification_ids: null', async () => {
    markAllRead();
    await new Promise(r => setTimeout(r, 0));

    expect(mockSafeRpc).toHaveBeenCalledWith('mark_notifications_read', {
      p_notification_ids: null,
    });
  });
});

describe('TC13 — markAllRead: skips RPC in placeholder mode', () => {
  it('does not call safeRpc when in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    markAllRead();
    await new Promise(r => setTimeout(r, 0));

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/notifications.actions.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './notifications.state.ts', './notifications.panel.ts'];
    const source = readFileSync(resolve(__dirname, '../src/notifications.actions.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
