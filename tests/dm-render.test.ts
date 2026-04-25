// ============================================================
// DM RENDER — tests/dm-render.test.ts
// Source: src/dm/dm.render.ts
//
// CLASSIFICATION:
//   renderInbox()   — HTML string builder, reads state → Snapshot test
//   renderThread()  — HTML string builder, reads state → Snapshot test
//
// IMPORTS:
//   { escapeHTML }     from '../config.ts'
//   { getCurrentUser } from '../auth.ts'
//   { threads, activeThreadId, activeMessages,
//     isLoadingThreads, isLoadingMessages } from './dm.state.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML    = vi.hoisted(() => vi.fn((s: string) => s));
const mockGetCurrentUser = vi.hoisted(() => vi.fn(() => null));

// Mutable state mirrors
const dmStateVars = vi.hoisted(() => ({
  threads: [] as unknown[],
  activeThreadId: null as string | null,
  activeMessages: [] as unknown[],
  isLoadingThreads: false,
  isLoadingMessages: false,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/dm/dm.state.ts', () => ({
  get threads()           { return dmStateVars.threads; },
  get activeThreadId()    { return dmStateVars.activeThreadId; },
  get activeMessages()    { return dmStateVars.activeMessages; },
  get isLoadingThreads()  { return dmStateVars.isLoadingThreads; },
  get isLoadingMessages() { return dmStateVars.isLoadingMessages; },
}));

import { renderInbox, renderThread } from '../src/dm/dm.render.ts';

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockGetCurrentUser.mockReturnValue(null);
  dmStateVars.threads = [];
  dmStateVars.activeThreadId = null;
  dmStateVars.activeMessages = [];
  dmStateVars.isLoadingThreads = false;
  dmStateVars.isLoadingMessages = false;
});

// ── TC1: renderInbox — shows shimmer when loading ─────────────

describe('TC1 — renderInbox: returns shimmer HTML when isLoadingThreads', () => {
  it('returns shimmer elements when loading', () => {
    dmStateVars.isLoadingThreads = true;
    const html = renderInbox();
    expect(html).toContain('colo-shimmer');
  });
});

// ── TC2: renderInbox — shows empty state when no threads ─────

describe('TC2 — renderInbox: shows empty state when no threads', () => {
  it('returns "No messages yet" when threads is empty', () => {
    dmStateVars.threads = [];
    const html = renderInbox();
    expect(html).toContain('No messages yet');
  });
});

// ── TC3: renderInbox — renders thread rows ────────────────────

describe('TC3 — renderInbox: renders a row per thread', () => {
  it('returns HTML with dm-thread-row for each thread', () => {
    dmStateVars.threads = [
      {
        thread_id: 't1',
        other_user_id: 'u1',
        other_display_name: 'Alice',
        other_username: 'alice99',
        last_message: 'Hello world',
        last_at: new Date().toISOString(),
        unread_count: 0,
      },
      {
        thread_id: 't2',
        other_user_id: 'u2',
        other_display_name: 'Bob',
        other_username: 'bob42',
        last_message: 'Hi there',
        last_at: new Date().toISOString(),
        unread_count: 2,
      },
    ];
    const html = renderInbox();
    const matches = html.match(/dm-thread-row/g) ?? [];
    expect(matches.length).toBe(2);
  });
});

// ── TC4: renderInbox — includes thread_id in data attribute ──

describe('TC4 — renderInbox: includes thread_id in data-thread-id attribute', () => {
  it('embeds the thread_id as a data attribute', () => {
    dmStateVars.threads = [{
      thread_id: 'thread-abc',
      other_user_id: 'u1',
      other_display_name: 'Alice',
      other_username: 'alice99',
      last_message: null,
      last_at: new Date().toISOString(),
      unread_count: 0,
    }];
    const html = renderInbox();
    expect(html).toContain('data-thread-id="thread-abc"');
  });
});

// ── TC5: renderInbox — unread thread shows accent styling ────

describe('TC5 — renderInbox: unread thread includes unread indicator', () => {
  it('includes unread dot when unread_count > 0', () => {
    dmStateVars.threads = [{
      thread_id: 't1',
      other_user_id: 'u1',
      other_display_name: 'Carol',
      other_username: 'carol',
      last_message: 'Ping',
      last_at: new Date().toISOString(),
      unread_count: 3,
    }];
    const html = renderInbox();
    // Unread dot is rendered as a colored div
    expect(html).toContain('mod-accent-muted');
  });
});

// ── TC6: renderThread — shows loading message when loading ───

describe('TC6 — renderThread: shows loading message when isLoadingMessages', () => {
  it('renders Loading... text when isLoadingMessages is true', () => {
    dmStateVars.isLoadingMessages = true;
    const html = renderThread('Alice');
    expect(html).toContain('Loading...');
  });
});

// ── TC7: renderThread — shows empty message when no messages ─

describe('TC7 — renderThread: shows "No messages yet" when activeMessages empty', () => {
  it('includes "No messages yet" when messages array is empty', () => {
    dmStateVars.activeMessages = [];
    const html = renderThread('Alice');
    expect(html).toContain('No messages yet');
  });
});

// ── TC8: renderThread — includes back button ─────────────────

describe('TC8 — renderThread: includes dm-back-btn', () => {
  it('renders a back button with id dm-back-btn', () => {
    const html = renderThread('Bob');
    expect(html).toContain('dm-back-btn');
  });
});

// ── TC9: renderThread — includes input and send button ───────

describe('TC9 — renderThread: includes dm-input and dm-send-btn', () => {
  it('renders the message input and send button', () => {
    const html = renderThread('Bob');
    expect(html).toContain('id="dm-input"');
    expect(html).toContain('id="dm-send-btn"');
  });
});

// ── TC10: renderThread — renders messages with correct alignment

describe('TC10 — renderThread: own messages are flex-end, others are flex-start', () => {
  it('own message (sender_id === myId) uses flex-end', () => {
    mockGetCurrentUser.mockReturnValue({ id: 'my-user-id' });
    dmStateVars.activeMessages = [
      { id: 'm1', sender_id: 'my-user-id', body: 'Hello', created_at: new Date().toISOString() },
    ];
    const html = renderThread('Bob');
    expect(html).toContain('flex-end');
  });

  it("other's message (different sender_id) uses flex-start", () => {
    mockGetCurrentUser.mockReturnValue({ id: 'my-user-id' });
    dmStateVars.activeMessages = [
      { id: 'm2', sender_id: 'other-user', body: 'Hi back', created_at: new Date().toISOString() },
    ];
    const html = renderThread('Bob');
    expect(html).toContain('flex-start');
  });
});

// ── TC11: renderThread — escapes message body ─────────────────

describe('TC11 — renderThread: calls escapeHTML on message bodies', () => {
  it('calls escapeHTML for each message body', () => {
    dmStateVars.activeMessages = [
      { id: 'm1', sender_id: 'u1', body: '<script>alert(1)</script>', created_at: new Date().toISOString() },
    ];
    renderThread('Alice');
    const calls = mockEscapeHTML.mock.calls.map(([s]) => s);
    expect(calls).toContain('<script>alert(1)</script>');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/dm/dm.render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../config.ts', '../auth.ts', './dm.state.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/dm/dm.render.ts'),
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
