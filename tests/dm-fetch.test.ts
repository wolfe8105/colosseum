// ============================================================
// DM FETCH — tests/dm-fetch.test.ts
// Source: src/dm/dm.fetch.ts
//
// CLASSIFICATION:
//   fetchThreads()      — RPC + orchestration → Contract test
//   fetchMessages()     — RPC + orchestration → Contract test
//   sendMessage()       — RPC wrapper → Contract test
//   blockUser()         — RPC wrapper → Contract test
//   unblockUser()       — RPC wrapper → Contract test
//   fetchUnreadCount()  — RPC + state → Contract test
//
// IMPORTS:
//   { safeRpc }  from '../auth.ts'
//   { setThreads, setActiveMessages, setIsLoadingThreads,
//     setIsLoadingMessages, setUnreadTotal } from './dm.state.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc            = vi.hoisted(() => vi.fn());
const mockSetThreads         = vi.hoisted(() => vi.fn());
const mockSetActiveMessages  = vi.hoisted(() => vi.fn());
const mockSetIsLoadingThreads   = vi.hoisted(() => vi.fn());
const mockSetIsLoadingMessages  = vi.hoisted(() => vi.fn());
const mockSetUnreadTotal     = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/dm/dm.state.ts', () => ({
  setThreads: mockSetThreads,
  setActiveMessages: mockSetActiveMessages,
  setIsLoadingThreads: mockSetIsLoadingThreads,
  setIsLoadingMessages: mockSetIsLoadingMessages,
  setUnreadTotal: mockSetUnreadTotal,
}));

import {
  fetchThreads,
  fetchMessages,
  sendMessage,
  blockUser,
  unblockUser,
  fetchUnreadCount,
} from '../src/dm/dm.fetch.ts';

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockSetThreads.mockReset();
  mockSetActiveMessages.mockReset();
  mockSetIsLoadingThreads.mockReset();
  mockSetIsLoadingMessages.mockReset();
  mockSetUnreadTotal.mockReset();
});

// ── TC1: fetchThreads — calls get_dm_threads RPC ─────────────

describe('TC1 — fetchThreads: calls get_dm_threads RPC', () => {
  it('calls safeRpc with get_dm_threads', async () => {
    mockSafeRpc.mockResolvedValue({ data: { threads: [] }, error: null });
    await fetchThreads();
    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('get_dm_threads');
  });
});

// ── TC2: fetchThreads — sets threads from response ───────────

describe('TC2 — fetchThreads: sets threads from response', () => {
  it('calls setThreads with the threads array', async () => {
    const threads = [{ thread_id: 't1', unread_count: 2 }];
    mockSafeRpc.mockResolvedValue({ data: { threads }, error: null });
    await fetchThreads();
    expect(mockSetThreads).toHaveBeenCalledWith(threads);
  });
});

// ── TC3: fetchThreads — calculates unread total ──────────────

describe('TC3 — fetchThreads: calculates total unread count', () => {
  it('calls setUnreadTotal with sum of unread_count across threads', async () => {
    const threads = [
      { thread_id: 't1', unread_count: 3 },
      { thread_id: 't2', unread_count: 5 },
    ];
    mockSafeRpc.mockResolvedValue({ data: { threads }, error: null });
    await fetchThreads();
    expect(mockSetUnreadTotal).toHaveBeenCalledWith(8);
  });
});

// ── TC4: fetchThreads — clears threads on RPC error ──────────

describe('TC4 — fetchThreads: clears threads on RPC error', () => {
  it('calls setThreads([]) when RPC returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    await fetchThreads();
    expect(mockSetThreads).toHaveBeenCalledWith([]);
  });
});

// ── TC5: fetchThreads — sets isLoading to false after ────────

describe('TC5 — fetchThreads: resets isLoadingThreads after fetch', () => {
  it('calls setIsLoadingThreads(false) after completion', async () => {
    mockSafeRpc.mockResolvedValue({ data: { threads: [] }, error: null });
    await fetchThreads();
    const calls = mockSetIsLoadingThreads.mock.calls.map(([v]) => v);
    expect(calls).toContain(false);
  });
});

// ── TC6: fetchMessages — calls get_dm_messages RPC ───────────

describe('TC6 — fetchMessages: calls get_dm_messages with thread ID', () => {
  it('calls safeRpc with get_dm_messages and p_thread_id', async () => {
    mockSafeRpc.mockResolvedValue({ data: { messages: [] }, error: null });
    await fetchMessages('thread-abc');
    const [fnName, params] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('get_dm_messages');
    expect(params.p_thread_id).toBe('thread-abc');
  });
});

// ── TC7: fetchMessages — passes p_before cursor when provided ─

describe('TC7 — fetchMessages: includes p_before when before param is given', () => {
  it('passes p_before to the RPC params', async () => {
    mockSafeRpc.mockResolvedValue({ data: { messages: [] }, error: null });
    await fetchMessages('thread-1', 'cursor-xyz');
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_before).toBe('cursor-xyz');
  });
});

// ── TC8: fetchMessages — returns messages array ───────────────

describe('TC8 — fetchMessages: returns messages from response', () => {
  it('returns the messages array and calls setActiveMessages', async () => {
    const msgs = [{ id: 'm1', body: 'hello' }];
    mockSafeRpc.mockResolvedValue({ data: { messages: msgs }, error: null });
    const result = await fetchMessages('thread-1');
    expect(result).toEqual(msgs);
    expect(mockSetActiveMessages).toHaveBeenCalledWith(msgs);
  });
});

// ── TC9: fetchMessages — returns [] on error ─────────────────

describe('TC9 — fetchMessages: returns empty array on RPC error', () => {
  it('returns [] when RPC returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    const result = await fetchMessages('thread-1');
    expect(result).toEqual([]);
  });
});

// ── TC10: sendMessage — calls send_dm RPC ────────────────────

describe('TC10 — sendMessage: calls send_dm RPC', () => {
  it('calls safeRpc with send_dm and correct params', async () => {
    mockSafeRpc.mockResolvedValue({ data: { thread_id: 't1' }, error: null });
    await sendMessage('user-id-123', 'Hello!');
    const [fnName, params] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('send_dm');
    expect(params.p_recipient_id).toBe('user-id-123');
    expect(params.p_body).toBe('Hello!');
  });
});

// ── TC11: sendMessage — returns error object on RPC failure ──

describe('TC11 — sendMessage: returns error object on RPC failure', () => {
  it('returns { error: "send_failed" } when RPC returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    const result = await sendMessage('user-id', 'Hi');
    expect(result).toEqual({ error: 'send_failed' });
  });
});

// ── TC12: blockUser — calls block_dm_user RPC ────────────────

describe('TC12 — blockUser: calls block_dm_user RPC', () => {
  it('calls safeRpc with block_dm_user and p_blocked_id', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    await blockUser('blocked-user-id');
    const [fnName, params] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('block_dm_user');
    expect(params.p_blocked_id).toBe('blocked-user-id');
  });

  it('returns true on success', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    expect(await blockUser('u1')).toBe(true);
  });
});

// ── TC13: unblockUser — calls unblock_dm_user RPC ────────────

describe('TC13 — unblockUser: calls unblock_dm_user RPC', () => {
  it('calls safeRpc with unblock_dm_user', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    await unblockUser('blocked-user-id');
    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('unblock_dm_user');
  });

  it('returns false when RPC returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    expect(await unblockUser('u1')).toBe(false);
  });
});

// ── TC14: fetchUnreadCount — calls get_dm_unread_count RPC ───

describe('TC14 — fetchUnreadCount: calls get_dm_unread_count RPC', () => {
  it('calls safeRpc with get_dm_unread_count', async () => {
    mockSafeRpc.mockResolvedValue({ data: 5, error: null });
    await fetchUnreadCount();
    const [fnName] = mockSafeRpc.mock.calls[0];
    expect(fnName).toBe('get_dm_unread_count');
  });

  it('returns the count from RPC data', async () => {
    mockSafeRpc.mockResolvedValue({ data: 7, error: null });
    const count = await fetchUnreadCount();
    expect(count).toBe(7);
  });

  it('returns 0 on error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    expect(await fetchUnreadCount()).toBe(0);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/dm/dm.fetch.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', './dm.types.ts', './dm.state.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/dm/dm.fetch.ts'),
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
