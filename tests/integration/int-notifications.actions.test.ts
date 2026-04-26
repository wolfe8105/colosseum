/**
 * Integration tests — notifications.actions → notifications.state
 * Seam #338
 * TCs: 7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// ARCH filter — verify no wall imports in source
// ---------------------------------------------------------------------------
const WALL_TERMS = [
  'webrtc', 'feed-room', 'intro-music', 'cards.ts',
  'deepgram', 'realtime-client', 'voicememo', 'arena-css',
  'arena-room-live-audio', 'arena-sounds', 'arena-sounds-core', 'peermetrics',
];

describe('ARCH – notifications.actions import filter', () => {
  it('contains no wall imports', async () => {
    const source = await import('../../src/notifications.actions.ts?raw');
    const importLines = (source.default as string)
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    for (const term of WALL_TERMS) {
      const hit = importLines.find((l: string) => l.includes(term));
      expect(hit, `Wall import found: ${hit}`).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
vi.mock('@supabase/supabase-js');

let safeRpc: ReturnType<typeof vi.fn>;
let getIsPlaceholderMode: ReturnType<typeof vi.fn>;
let getSupabaseClient: ReturnType<typeof vi.fn>;

// Module-under-test handles
let timeAgo: (d: string | undefined | null) => string;
let markRead: (id: string) => void;
let markAllRead: () => void;

// State getters
let getNotifications: () => import('../../src/notifications.types.ts').Notification[];
let getUnreadCount: () => number;

function buildDOM() {
  document.body.innerHTML = `
    <div id="notif-dot" style="display:block;"></div>
    <div id="notif-list"></div>
  `;
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();

  safeRpc = vi.fn().mockResolvedValue({ data: null, error: null });
  getIsPlaceholderMode = vi.fn().mockReturnValue(false);
  getSupabaseClient = vi.fn().mockReturnValue({} /* truthy — not placeholder */);

  vi.doMock('../../src/auth.ts', () => ({
    safeRpc,
    getIsPlaceholderMode,
    getSupabaseClient,
  }));

  // notifications.panel.ts — mock updateBadge and renderList so we can
  // observe calls without needing a full DOM panel structure, but we still
  // want the real #notif-dot / #notif-list to be testable through the live
  // state. Keep real implementations via the actual module but set up minimal DOM.
  vi.doMock('../../src/notifications.panel.ts', () => ({
    updateBadge: vi.fn(() => {
      // Minimal real behaviour: hide dot if unreadCount is 0
      const dot = document.getElementById('notif-dot');
      if (dot) dot.style.display = 'none'; // simplified — actual check is on state
    }),
    renderList: vi.fn(() => {
      const list = document.getElementById('notif-list');
      if (list) list.innerHTML = '<div class="rendered"></div>';
    }),
  }));

  buildDOM();

  // Dynamic re-imports
  const actionsModule = await import('../../src/notifications.actions.ts');
  timeAgo = actionsModule.timeAgo;
  markRead = actionsModule.markRead;
  markAllRead = actionsModule.markAllRead;

  const stateModule = await import('../../src/notifications.state.ts');
  getNotifications = () => stateModule.notifications;
  getUnreadCount = () => stateModule.unreadCount;

  // Seed state: 2 unread + 1 read
  stateModule.setNotifications([
    { id: 'n1', type: 'challenge', title: 'Challenge!', body: 'Accept?', read: false },
    { id: 'n2', type: 'reaction',  title: 'Reaction',   body: 'Hot!',    read: false },
    { id: 'n3', type: 'system',    title: 'System',      body: 'Hello',   read: true  },
  ]);
  stateModule.computeUnreadCount(); // sets unreadCount = 2
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// TC1 — timeAgo: returns "just now" for very recent timestamps
// ---------------------------------------------------------------------------
describe('TC1 – timeAgo: just now', () => {
  it('returns "just now" for a timestamp ~5 seconds ago', () => {
    const recent = new Date(Date.now() - 5_000).toISOString();
    expect(timeAgo(recent)).toBe('just now');
  });
});

// ---------------------------------------------------------------------------
// TC2 — timeAgo: formatted strings for various durations
// ---------------------------------------------------------------------------
describe('TC2 – timeAgo: formatted durations', () => {
  it('returns Xm ago for ~90 seconds ago', () => {
    const ts = new Date(Date.now() - 90_000).toISOString();
    expect(timeAgo(ts)).toBe('1m ago');
  });

  it('returns Xh ago for ~7200 seconds ago', () => {
    const ts = new Date(Date.now() - 7_200_000).toISOString();
    expect(timeAgo(ts)).toBe('2h ago');
  });

  it('returns Xd ago for ~2 days ago', () => {
    const ts = new Date(Date.now() - 2 * 24 * 3_600_000).toISOString();
    expect(timeAgo(ts)).toBe('2d ago');
  });

  it('returns empty string for null/undefined', () => {
    expect(timeAgo(null)).toBe('');
    expect(timeAgo(undefined)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// TC3 — markRead: marks unread notification, fires RPC, updates DOM
// ---------------------------------------------------------------------------
describe('TC3 – markRead: marks notification read and fires RPC', () => {
  it('flips read flag, decrements unreadCount, calls RPC, updates DOM', async () => {
    expect(getUnreadCount()).toBe(2);

    markRead('n1');
    await vi.advanceTimersByTimeAsync(0);

    // State updated
    const notif = getNotifications().find(n => n.id === 'n1');
    expect(notif?.read).toBe(true);
    expect(getUnreadCount()).toBe(1);

    // RPC called with correct params
    expect(safeRpc).toHaveBeenCalledWith(
      'mark_notifications_read',
      { p_notification_ids: ['n1'] },
    );

    // DOM: renderList was called (list has content)
    const list = document.getElementById('notif-list');
    expect(list?.innerHTML).not.toBe('');
  });
});

// ---------------------------------------------------------------------------
// TC4 — markRead: no-ops for already-read notification
// ---------------------------------------------------------------------------
describe('TC4 – markRead: no-op on already-read notification', () => {
  it('does not call RPC or re-render when notification is already read', async () => {
    markRead('n3'); // n3 is already read
    await vi.advanceTimersByTimeAsync(0);

    expect(safeRpc).not.toHaveBeenCalled();
    // DOM not updated (renderList not invoked)
    const list = document.getElementById('notif-list');
    expect(list?.innerHTML).toBe('');
  });
});

// ---------------------------------------------------------------------------
// TC5 — markRead: skips RPC in placeholder mode
// ---------------------------------------------------------------------------
describe('TC5 – markRead: skips RPC in placeholder mode', () => {
  it('updates state but does not call RPC when placeholder mode is active', async () => {
    getIsPlaceholderMode.mockReturnValue(true);

    markRead('n1');
    await vi.advanceTimersByTimeAsync(0);

    const notif = getNotifications().find(n => n.id === 'n1');
    expect(notif?.read).toBe(true);
    expect(safeRpc).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// TC6 — markAllRead: marks all as read, unreadCount = 0, fires RPC with null
// ---------------------------------------------------------------------------
describe('TC6 – markAllRead: marks all read and fires RPC with null', () => {
  it('sets unreadCount to 0, calls RPC with p_notification_ids: null, updates DOM', async () => {
    expect(getUnreadCount()).toBe(2);

    markAllRead();
    await vi.advanceTimersByTimeAsync(0);

    // All notifications now read
    expect(getNotifications().every(n => n.read)).toBe(true);
    expect(getUnreadCount()).toBe(0);

    // RPC called with null to mark all
    expect(safeRpc).toHaveBeenCalledWith(
      'mark_notifications_read',
      { p_notification_ids: null },
    );

    // DOM updated
    const list = document.getElementById('notif-list');
    expect(list?.innerHTML).not.toBe('');
  });
});

// ---------------------------------------------------------------------------
// TC7 — markAllRead: skips RPC in placeholder mode
// ---------------------------------------------------------------------------
describe('TC7 – markAllRead: skips RPC in placeholder mode', () => {
  it('updates state/DOM but does not call RPC when placeholder mode is active', async () => {
    getIsPlaceholderMode.mockReturnValue(true);

    markAllRead();
    await vi.advanceTimersByTimeAsync(0);

    expect(getUnreadCount()).toBe(0);
    expect(safeRpc).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Seam #391 — notifications.actions → notifications.panel
// TCs: 7
// All tests in a single describe block with their own beforeEach so the
// outer beforeEach (seam #338) is not polluted.
// ===========================================================================
describe('Seam #391 – notifications.actions → notifications.panel', () => {
  let updateBadgeMock: ReturnType<typeof vi.fn>;
  let renderListMock:  ReturnType<typeof vi.fn>;
  let markReadP: (id: string) => void;
  let markAllReadP: () => void;
  let safeRpcP: ReturnType<typeof vi.fn>;
  let getIsPlaceholderModeP: ReturnType<typeof vi.fn>;
  let getSupabaseClientP: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    updateBadgeMock      = vi.fn();
    renderListMock       = vi.fn();
    safeRpcP             = vi.fn().mockResolvedValue({ data: null, error: null });
    getIsPlaceholderModeP = vi.fn().mockReturnValue(false);
    getSupabaseClientP   = vi.fn().mockReturnValue({});

    vi.doMock('@supabase/supabase-js', () => ({}));

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: safeRpcP,
      getIsPlaceholderMode: getIsPlaceholderModeP,
      getSupabaseClient: getSupabaseClientP,
    }));

    vi.doMock('../../src/notifications.panel.ts', () => ({
      updateBadge: updateBadgeMock,
      renderList:  renderListMock,
    }));

    const actionsModule = await import('../../src/notifications.actions.ts');
    markReadP    = actionsModule.markRead;
    markAllReadP = actionsModule.markAllRead;

    const stateModule = await import('../../src/notifications.state.ts');
    stateModule.setNotifications([
      { id: 'p1', type: 'challenge', title: 'Panel TC', body: 'Unread 1', read: false },
      { id: 'p2', type: 'reaction',  title: 'Panel TC', body: 'Unread 2', read: false },
      { id: 'p3', type: 'system',    title: 'Panel TC', body: 'Read',     read: true  },
    ]);
    stateModule.computeUnreadCount();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // TC8 — markRead on unread notification calls updateBadge once
  // -------------------------------------------------------------------------
  it('TC8 – markRead calls updateBadge exactly once on unread notification', () => {
    markReadP('p1');
    expect(updateBadgeMock).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // TC9 — markRead on unread notification calls renderList once
  // -------------------------------------------------------------------------
  it('TC9 – markRead calls renderList exactly once on unread notification', () => {
    markReadP('p1');
    expect(renderListMock).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // TC10 — markRead on already-read notification calls neither panel function
  // -------------------------------------------------------------------------
  it('TC10 – markRead calls neither updateBadge nor renderList for already-read notification', () => {
    markReadP('p3'); // p3 is already read
    expect(updateBadgeMock).not.toHaveBeenCalled();
    expect(renderListMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // TC11 — markAllRead always calls updateBadge and renderList once each
  // -------------------------------------------------------------------------
  it('TC11 – markAllRead calls updateBadge and renderList exactly once each', () => {
    markAllReadP();
    expect(updateBadgeMock).toHaveBeenCalledTimes(1);
    expect(renderListMock).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // TC12 — markRead in placeholder mode still calls panel functions
  // -------------------------------------------------------------------------
  it('TC12 – markRead in placeholder mode still calls updateBadge and renderList', () => {
    getIsPlaceholderModeP.mockReturnValue(true);
    markReadP('p1');
    expect(updateBadgeMock).toHaveBeenCalledTimes(1);
    expect(renderListMock).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // TC13 — markAllRead in placeholder mode still calls panel functions
  // -------------------------------------------------------------------------
  it('TC13 – markAllRead in placeholder mode still calls updateBadge and renderList', () => {
    getIsPlaceholderModeP.mockReturnValue(true);
    markAllReadP();
    expect(updateBadgeMock).toHaveBeenCalledTimes(1);
    expect(renderListMock).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // TC14 — sequential markRead calls each invoke panel functions independently
  // -------------------------------------------------------------------------
  it('TC14 – sequential markRead calls each fire updateBadge and renderList once', () => {
    markReadP('p1');
    markReadP('p2');
    expect(updateBadgeMock).toHaveBeenCalledTimes(2);
    expect(renderListMock).toHaveBeenCalledTimes(2);
  });
});
