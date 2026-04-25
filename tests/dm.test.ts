// ============================================================
// DM MODULE — tests/dm.test.ts
// Source: src/dm/dm.ts
//
// CLASSIFICATION:
//   renderDMScreen() — Orchestration + DOM → Integration test
//   init()           — Behavioral (DOM + observer) → Behavioral test
//   ModeratorDM      — Re-export object, no separate test
//
// IMPORTS:
//   { ready, getCurrentUser, getSupabaseClient } from '../auth.ts'
//   { showToast }                                from '../config.ts'
//   { fetchThreads, fetchMessages, sendMessage, fetchUnreadCount } from './dm.fetch.ts'
//   { renderInbox, renderThread }               from './dm.render.ts'
//   { threads, activeThreadId, activeMessages,
//     setActiveThreadId, setActiveMessages }    from './dm.state.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReady           = vi.hoisted(() => Promise.resolve());
const mockGetCurrentUser  = vi.hoisted(() => vi.fn(() => null));
const mockGetSupabaseClient = vi.hoisted(() => vi.fn(() => null));
const mockShowToast       = vi.hoisted(() => vi.fn());
const mockFetchThreads    = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockFetchMessages   = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockSendMessage     = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockFetchUnreadCount = vi.hoisted(() => vi.fn().mockResolvedValue(0));
const mockRenderInbox     = vi.hoisted(() => vi.fn(() => '<div id="inbox"></div>'));
const mockRenderThread    = vi.hoisted(() => vi.fn(() => '<div id="thread-view"><button id="dm-back-btn"></button><div id="dm-messages-container"></div><input id="dm-input"><button id="dm-send-btn"></button></div>'));
const mockSetActiveThreadId = vi.hoisted(() => vi.fn());
const mockSetActiveMessages = vi.hoisted(() => vi.fn());

// Mutable state mirrors
const dmStateVars = vi.hoisted(() => ({
  threads: [] as unknown[],
  activeThreadId: null as string | null,
  activeMessages: [] as unknown[],
}));

vi.mock('../src/auth.ts', () => ({
  ready: mockReady,
  getCurrentUser: mockGetCurrentUser,
  getSupabaseClient: mockGetSupabaseClient,
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

vi.mock('../src/dm/dm.fetch.ts', () => ({
  fetchThreads: mockFetchThreads,
  fetchMessages: mockFetchMessages,
  sendMessage: mockSendMessage,
  fetchUnreadCount: mockFetchUnreadCount,
}));

vi.mock('../src/dm/dm.render.ts', () => ({
  renderInbox: mockRenderInbox,
  renderThread: mockRenderThread,
}));

vi.mock('../src/dm/dm.state.ts', () => ({
  get threads()          { return dmStateVars.threads; },
  get activeThreadId()   { return dmStateVars.activeThreadId; },
  get activeMessages()   { return dmStateVars.activeMessages; },
  setActiveThreadId: mockSetActiveThreadId,
  setActiveMessages: mockSetActiveMessages,
}));

import { renderDMScreen, init, ModeratorDM } from '../src/dm/dm.ts';

beforeEach(() => {
  mockFetchThreads.mockReset().mockResolvedValue(undefined);
  mockFetchMessages.mockReset().mockResolvedValue([]);
  mockSendMessage.mockReset().mockResolvedValue({});
  mockFetchUnreadCount.mockReset().mockResolvedValue(0);
  mockRenderInbox.mockReset().mockReturnValue('<div class="dm-thread-row" data-thread-id="t1"></div>');
  mockRenderThread.mockReset().mockReturnValue('<div><button id="dm-back-btn"></button><div id="dm-messages-container"></div><input id="dm-input"><button id="dm-send-btn">Send</button></div>');
  mockShowToast.mockReset();
  mockSetActiveThreadId.mockReset();
  mockSetActiveMessages.mockReset();
  dmStateVars.threads = [];
  dmStateVars.activeThreadId = null;
  dmStateVars.activeMessages = [];
  document.body.innerHTML = '';
});

// ── TC1: renderDMScreen — renders inbox when no activeThreadId ─

describe('TC1 — renderDMScreen: renders inbox when no active thread', () => {
  it('calls renderInbox and writes to #screen-dm', async () => {
    document.body.innerHTML = '<div id="screen-dm"></div>';
    dmStateVars.activeThreadId = null;
    await renderDMScreen();
    expect(mockRenderInbox).toHaveBeenCalledTimes(1);
    const screen = document.getElementById('screen-dm')!;
    expect(screen.innerHTML).toContain('MESSAGES');
  });
});

// ── TC2: renderDMScreen — renders thread view when activeThreadId set ──

describe('TC2 — renderDMScreen: renders thread when activeThreadId is set', () => {
  it('calls renderThread when activeThreadId is non-null', async () => {
    document.body.innerHTML = '<div id="screen-dm"></div>';
    dmStateVars.activeThreadId = 'thread-abc';
    dmStateVars.threads = [{ thread_id: 'thread-abc', other_display_name: 'Alice', other_username: 'alice99' }];
    await renderDMScreen();
    expect(mockRenderThread).toHaveBeenCalledWith('Alice');
  });
});

// ── TC3: renderDMScreen — no-op when #screen-dm missing ──────

describe('TC3 — renderDMScreen: no-op when container is missing', () => {
  it('does not throw when #screen-dm does not exist', async () => {
    document.body.innerHTML = '';
    await expect(renderDMScreen()).resolves.toBeUndefined();
    expect(mockRenderInbox).not.toHaveBeenCalled();
  });
});

// ── TC4: init — calls fetchUnreadCount to update badge ───────

describe('TC4 — init: calls fetchUnreadCount to update badge', () => {
  it('calls fetchUnreadCount on init', () => {
    document.body.innerHTML = '<div id="screen-dm"></div><div id="dm-dot" style="display:none;"></div>';
    mockFetchUnreadCount.mockResolvedValue(3);
    init();
    expect(mockFetchUnreadCount).toHaveBeenCalledTimes(1);
  });
});

// ── TC5: init — no-op when #screen-dm missing ────────────────

describe('TC5 — init: no-op when #screen-dm does not exist', () => {
  it('does not throw when screen-dm is absent', () => {
    document.body.innerHTML = '';
    expect(() => init()).not.toThrow();
  });
});

// ── TC6: ModeratorDM — exports expected functions ─────────────

describe('TC6 — ModeratorDM: exports renderDMScreen, fetchThreads, fetchUnreadCount', () => {
  it('ModeratorDM has the expected function keys', () => {
    expect(typeof ModeratorDM.renderDMScreen).toBe('function');
    expect(typeof ModeratorDM.fetchThreads).toBe('function');
    expect(typeof ModeratorDM.fetchUnreadCount).toBe('function');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/dm/dm.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      '../contracts/dependency-clamps.ts',
      './dm.fetch.ts',
      './dm.render.ts',
      './dm.state.ts',
      './dm.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/dm/dm.ts'),
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
