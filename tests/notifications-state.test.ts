// ============================================================
// NOTIFICATIONS STATE — tests/notifications-state.test.ts
// Source: src/notifications.state.ts
//
// CLASSIFICATION:
//   setNotifications/setPanelOpen/setPollInterval — setters → Unit tests
//   markOneRead/markAllAsRead/computeUnreadCount  — pure logic → Unit tests
//   getPlaceholderNotifs                          — data fixture → Unit test
//
// IMPORTS:
//   import type { Notification } from './notifications.types.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as S from '../src/notifications.state.ts';

beforeEach(() => {
  S.setNotifications([]);
  S.setPanelOpen(false);
  S.setPollInterval(null);
});

// ── setNotifications ──────────────────────────────────────────

describe('TC1 — setNotifications: stores array', () => {
  it('updates notifications binding', () => {
    S.setNotifications([{ id: 'n-1', type: 'system', title: 'Hi', body: '', read: false }] as any);
    expect(S.notifications).toHaveLength(1);
    expect(S.notifications[0].id).toBe('n-1');
  });
});

// ── setPanelOpen ──────────────────────────────────────────────

describe('TC2 — setPanelOpen: toggles panelOpen', () => {
  it('sets to true then false', () => {
    S.setPanelOpen(true);
    expect(S.panelOpen).toBe(true);
    S.setPanelOpen(false);
    expect(S.panelOpen).toBe(false);
  });
});

// ── setPollInterval ───────────────────────────────────────────

describe('TC3 — setPollInterval: clears previous interval when setting new one', () => {
  it('calls clearInterval on old value', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const fakeInterval = 99 as unknown as ReturnType<typeof setInterval>;
    S.setPollInterval(fakeInterval);
    S.setPollInterval(null);
    expect(clearSpy).toHaveBeenCalledWith(fakeInterval);
    clearSpy.mockRestore();
  });
});

describe('TC4 — setPollInterval: stores null without error', () => {
  it('sets pollInterval to null', () => {
    S.setPollInterval(null);
    expect(S.pollInterval).toBeNull();
  });
});

// ── markOneRead ───────────────────────────────────────────────

describe('TC5 — markOneRead: marks notification as read and decrements unread', () => {
  it('sets read=true and decrements unreadCount', () => {
    S.setNotifications([
      { id: 'a', type: 'system', title: 'T', body: '', read: false },
    ] as any);
    S.computeUnreadCount();

    const result = S.markOneRead('a');

    expect(result).toBe(true);
    expect(S.notifications[0].read).toBe(true);
    expect(S.unreadCount).toBe(0);
  });
});

describe('TC6 — markOneRead: returns false for unknown id', () => {
  it('does not mutate unreadCount for missing notification', () => {
    S.setNotifications([]);
    const result = S.markOneRead('missing');
    expect(result).toBe(false);
  });
});

describe('TC7 — markOneRead: returns false when already read', () => {
  it('does not double-decrement for already-read notification', () => {
    S.setNotifications([
      { id: 'b', type: 'system', title: 'T', body: '', read: true },
    ] as any);
    S.computeUnreadCount(); // 0

    const result = S.markOneRead('b');
    expect(result).toBe(false);
    expect(S.unreadCount).toBe(0);
  });
});

// ── markAllAsRead ─────────────────────────────────────────────

describe('TC8 — markAllAsRead: marks all notifications as read', () => {
  it('sets read=true on every notification', () => {
    S.setNotifications([
      { id: '1', type: 'system', title: 'A', body: '', read: false },
      { id: '2', type: 'system', title: 'B', body: '', read: false },
    ] as any);
    S.computeUnreadCount();

    S.markAllAsRead();

    expect(S.notifications.every(n => n.read)).toBe(true);
    expect(S.unreadCount).toBe(0);
  });
});

// ── computeUnreadCount ────────────────────────────────────────

describe('TC9 — computeUnreadCount: counts unread notifications', () => {
  it('sets unreadCount to number of unread items', () => {
    S.setNotifications([
      { id: '1', type: 'system', title: 'A', body: '', read: false },
      { id: '2', type: 'system', title: 'B', body: '', read: true },
      { id: '3', type: 'system', title: 'C', body: '', read: false },
    ] as any);

    S.computeUnreadCount();

    expect(S.unreadCount).toBe(2);
  });
});

// ── getPlaceholderNotifs ──────────────────────────────────────

describe('TC10 — getPlaceholderNotifs: returns 7 placeholder notifications', () => {
  it('array has 7 items with required fields', () => {
    const notifs = S.getPlaceholderNotifs();
    expect(notifs).toHaveLength(7);
    for (const n of notifs) {
      expect(n.id).toBeTruthy();
      expect(n.type).toBeTruthy();
      expect(n.title).toBeTruthy();
    }
  });
});

describe('TC11 — getPlaceholderNotifs: some are unread', () => {
  it('at least one notification has read=false', () => {
    const notifs = S.getPlaceholderNotifs();
    expect(notifs.some(n => !n.read)).toBe(true);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/notifications.state.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./notifications.types.ts'];
    const source = readFileSync(resolve(__dirname, '../src/notifications.state.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
