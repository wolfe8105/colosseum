/**
 * Integration tests: src/dm/dm.fetch.ts → dm.state
 * SEAM #463
 *
 * Boundary: dm.fetch.ts calls safeRpc and writes to dm.state setters.
 * Mock boundary: @supabase/supabase-js only.
 * All source modules run real.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    auth: mockAuth,
  })),
}));

// ── beforeEach ─────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  mockRpc.mockReset();
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockAuth.onAuthStateChange.mockReset();

  mockRpc.mockResolvedValue({ data: null, error: null });
});

// ── TC1: ARCH — dm.fetch.ts imports from dm.state ─────────────────────────────

describe('TC1 — ARCH: dm.fetch.ts imports setters from dm.state', () => {
  it('source imports setThreads, setActiveMessages, setUnreadTotal from dm.state', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/dm/dm.fetch.ts'),
      'utf8',
    );
    // The import of dm.state may span multiple lines; verify the full source
    // contains a from-import pointing to dm.state
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const stateImportLine = importLines.find(l => l.includes('dm.state'));
    expect(stateImportLine).toBeDefined();
    // Verify the named setters appear somewhere in the source (multi-line import)
    expect(src).toMatch(/setThreads/);
    expect(src).toMatch(/setActiveMessages/);
    expect(src).toMatch(/setUnreadTotal/);
  });
});

// ── TC2: fetchThreads success path ────────────────────────────────────────────

describe('TC2 — fetchThreads: success path sets threads and unreadTotal', () => {
  it('calls get_dm_threads, writes threads to state, sums unread counts', async () => {
    const threads = [
      {
        thread_id: 'tid-001',
        other_user_id: 'uid-aaa',
        other_username: 'alice',
        other_display_name: 'Alice',
        last_message: 'Hey!',
        last_at: '2026-04-25T00:00:00Z',
        unread_count: 3,
      },
      {
        thread_id: 'tid-002',
        other_user_id: 'uid-bbb',
        other_username: 'bob',
        other_display_name: 'Bob',
        last_message: 'What up',
        last_at: '2026-04-24T00:00:00Z',
        unread_count: 1,
      },
    ];

    mockRpc.mockResolvedValueOnce({ data: { threads }, error: null });

    const { fetchThreads } = await import('../../src/dm/dm.fetch.ts');
    const { threads: stateThreads, unreadTotal } = await import('../../src/dm/dm.state.ts');

    await fetchThreads();

    expect(mockRpc).toHaveBeenCalledWith('get_dm_threads', expect.anything());

    // Re-import to get updated module-level state
    const state = await import('../../src/dm/dm.state.ts');
    expect(state.threads).toEqual(threads);
    expect(state.unreadTotal).toBe(4); // 3 + 1
    expect(state.isLoadingThreads).toBe(false);
  });
});

// ── TC3: fetchThreads error path ───────────────────────────────────────────────

describe('TC3 — fetchThreads: error path sets threads to empty array', () => {
  it('sets threads to [] when safeRpc returns an error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const { fetchThreads } = await import('../../src/dm/dm.fetch.ts');
    await fetchThreads();

    const state = await import('../../src/dm/dm.state.ts');
    expect(state.threads).toEqual([]);
    expect(state.isLoadingThreads).toBe(false);
  });
});

// ── TC4: fetchMessages success path ───────────────────────────────────────────

describe('TC4 — fetchMessages: calls get_dm_messages with p_thread_id and returns messages', () => {
  it('calls rpc with correct params and sets activeMessages', async () => {
    const messages = [
      { id: 'msg-001', sender_id: 'uid-aaa', body: 'Hello', created_at: '2026-04-25T10:00:00Z', read_at: null },
      { id: 'msg-002', sender_id: 'uid-bbb', body: 'Hi there', created_at: '2026-04-25T10:01:00Z', read_at: '2026-04-25T10:02:00Z' },
    ];

    mockRpc.mockResolvedValueOnce({ data: { messages }, error: null });

    const { fetchMessages } = await import('../../src/dm/dm.fetch.ts');
    const result = await fetchMessages('tid-001');

    expect(mockRpc).toHaveBeenCalledWith(
      'get_dm_messages',
      expect.objectContaining({ p_thread_id: 'tid-001' }),
    );

    const state = await import('../../src/dm/dm.state.ts');
    expect(state.activeMessages).toEqual(messages);
    expect(state.isLoadingMessages).toBe(false);
    expect(result).toEqual(messages);
  });
});

// ── TC5: fetchMessages with before cursor ─────────────────────────────────────

describe('TC5 — fetchMessages: includes p_before when before arg is provided', () => {
  it('passes p_before to rpc when cursor is given', async () => {
    mockRpc.mockResolvedValueOnce({ data: { messages: [] }, error: null });

    const { fetchMessages } = await import('../../src/dm/dm.fetch.ts');
    await fetchMessages('tid-001', 'cursor-abc');

    expect(mockRpc).toHaveBeenCalledWith(
      'get_dm_messages',
      expect.objectContaining({ p_thread_id: 'tid-001', p_before: 'cursor-abc' }),
    );
  });
});

// ── TC6: sendMessage success path ─────────────────────────────────────────────

describe('TC6 — sendMessage: calls send_dm with recipient and body, returns result', () => {
  it('calls rpc with p_recipient_id and p_body and returns ok result', async () => {
    const sendResult = { ok: true, thread_id: 'tid-001', message_id: 'msg-999' };
    mockRpc.mockResolvedValueOnce({ data: sendResult, error: null });

    const { sendMessage } = await import('../../src/dm/dm.fetch.ts');
    const result = await sendMessage('uid-bbb', 'Great point!');

    expect(mockRpc).toHaveBeenCalledWith(
      'send_dm',
      expect.objectContaining({ p_recipient_id: 'uid-bbb', p_body: 'Great point!' }),
    );
    expect(result).toMatchObject({ ok: true, thread_id: 'tid-001' });
  });
});

// ── TC7: blockUser and unblockUser ────────────────────────────────────────────

describe('TC7 — blockUser / unblockUser: call correct RPCs and return boolean', () => {
  it('blockUser returns true on success and calls block_dm_user', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const { blockUser } = await import('../../src/dm/dm.fetch.ts');
    const result = await blockUser('uid-evil');

    expect(mockRpc).toHaveBeenCalledWith(
      'block_dm_user',
      expect.objectContaining({ p_blocked_id: 'uid-evil' }),
    );
    expect(result).toBe(true);
  });

  it('unblockUser returns true on success and calls unblock_dm_user', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const { unblockUser } = await import('../../src/dm/dm.fetch.ts');
    const result = await unblockUser('uid-evil');

    expect(mockRpc).toHaveBeenCalledWith(
      'unblock_dm_user',
      expect.objectContaining({ p_blocked_id: 'uid-evil' }),
    );
    expect(result).toBe(true);
  });

  it('blockUser returns false when rpc returns error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Forbidden' } });

    const { blockUser } = await import('../../src/dm/dm.fetch.ts');
    const result = await blockUser('uid-evil');

    expect(result).toBe(false);
  });
});

// ── TC8: fetchUnreadCount ──────────────────────────────────────────────────────

describe('TC8 — fetchUnreadCount: calls get_dm_unread_count and updates unreadTotal', () => {
  it('calls rpc, sets unreadTotal in state, and returns numeric count', async () => {
    mockRpc.mockResolvedValueOnce({ data: 7, error: null });

    const { fetchUnreadCount } = await import('../../src/dm/dm.fetch.ts');
    const count = await fetchUnreadCount();

    expect(mockRpc).toHaveBeenCalledWith('get_dm_unread_count', expect.anything());
    expect(count).toBe(7);

    const state = await import('../../src/dm/dm.state.ts');
    expect(state.unreadTotal).toBe(7);
  });

  it('returns 0 when rpc returns error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    const { fetchUnreadCount } = await import('../../src/dm/dm.fetch.ts');
    const count = await fetchUnreadCount();

    expect(count).toBe(0);
  });
});
