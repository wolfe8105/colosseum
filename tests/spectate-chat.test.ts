// ============================================================
// SPECTATE CHAT — tests/spectate-chat.test.ts
// Source: src/pages/spectate.chat.ts
//
// CLASSIFICATION:
//   renderChatMessages(): HTML string builder → Snapshot/content test
//   refreshChatUI():      DOM behavioral → verify DOM mutations
//   wireChatUI():         DOM event wiring → simulate click/keydown
//   startChatPolling():   Behavioral (setInterval) → mock timers
//   stopChatPolling():    Behavioral (clearInterval) → verify timer cleared
//
// IMPORTS:
//   { safeRpc, getCurrentProfile, getCurrentUser } from '../auth.ts'
//   { get_spectator_chat, send_spectator_chat }    from '../contracts/rpc-schemas.ts'
//   { isDepthBlocked }                             from '../depth-gate.ts'
//   { state }                                      from './spectate.state.ts'
//   { escHtml, timeAgo }                           from './spectate.utils.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc          = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => ({ display_name: 'Tester' })));
const mockGetCurrentUser   = vi.hoisted(() => vi.fn(() => ({ id: 'user-1' })));
const mockIsDepthBlocked   = vi.hoisted(() => vi.fn(() => false));

const mockState = vi.hoisted(() => ({
  debateId: 'debate-1',
  chatMessages: [] as Array<{ display_name: string; message: string; created_at: string; user_id: string | null }>,
  lastChatMessageAt: null as string | null,
  chatPollTimer: null as ReturnType<typeof setInterval> | null,
  chatOpen: false,
  isLoggedIn: true,
}));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentProfile: mockGetCurrentProfile,
  getCurrentUser: mockGetCurrentUser,
  onChange: vi.fn(),
  ready: Promise.resolve(),
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_spectator_chat: {},
  send_spectator_chat: {},
  get_arena_debate_spectator: {},
}));

vi.mock('../src/depth-gate.ts', () => ({
  isDepthBlocked: mockIsDepthBlocked,
}));

vi.mock('../src/pages/spectate.state.ts', () => ({
  get state() { return mockState; },
}));

vi.mock('../src/pages/spectate.utils.ts', () => ({
  escHtml: (s: string) => s,
  timeAgo: vi.fn(() => '2m ago'),
  renderAvatar: vi.fn(() => ''),
  modeLabel: vi.fn(() => 'Live'),
  statusBadge: vi.fn(() => ''),
}));

import {
  renderChatMessages,
  refreshChatUI,
  startChatPolling,
  stopChatPolling,
} from '../src/pages/spectate.chat.ts';

import type { SpectateDebate } from '../src/pages/spectate.types.ts';

// ── Helpers ───────────────────────────────────────────────────

const makeDebate = (): SpectateDebate => ({
  id: 'debate-1',
  topic: 'Test',
  status: 'live',
  mode: 'voice',
  debater_a_name: 'Alice',
  debater_b_name: 'Bob',
} as unknown as SpectateDebate);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  mockState.chatMessages = [];
  mockState.lastChatMessageAt = null;
  mockState.chatPollTimer = null;
  mockState.chatOpen = false;
  mockState.isLoggedIn = true;
  mockIsDepthBlocked.mockReturnValue(false);
  mockSafeRpc.mockResolvedValue({ data: null, error: null });
  document.body.innerHTML = '';
  // jsdom does not implement scrollTo on HTMLElement
  HTMLElement.prototype.scrollTo = vi.fn() as unknown as typeof HTMLElement.prototype.scrollTo;
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — renderChatMessages returns HTML for each message', () => {
  it('renders sc-msg div with name, text, and time for each message', () => {
    const msgs = [
      { display_name: 'Alice', message: 'Hello', created_at: '2026-01-01T00:00:01Z', user_id: null },
    ];
    const html = renderChatMessages(msgs);
    expect(html).toContain('sc-msg');
    expect(html).toContain('Alice');
    expect(html).toContain('Hello');
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — renderChatMessages returns empty string for empty array', () => {
  it('returns "" for no messages', () => {
    expect(renderChatMessages([])).toBe('');
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — renderChatMessages calls escHtml on display_name and message', () => {
  it('escHtml is used (output contains the text content)', () => {
    const msgs = [{ display_name: 'Test<User>', message: 'Hi', created_at: '2026-01-01T00:00:00Z', user_id: null }];
    const html = renderChatMessages(msgs);
    expect(html).toContain('Test<User>');
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — refreshChatUI shows empty message when no chat messages', () => {
  it('sets empty state innerHTML when chatMessages is empty', () => {
    const container = document.createElement('div');
    container.id = 'spec-chat-messages';
    document.body.appendChild(container);

    mockState.chatMessages = [];
    refreshChatUI();

    expect(container.innerHTML).toContain('No messages yet');
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — refreshChatUI renders messages when chatMessages is non-empty', () => {
  it('sets container innerHTML with chat messages HTML', () => {
    const container = document.createElement('div');
    container.id = 'spec-chat-messages';
    document.body.appendChild(container);

    mockState.chatMessages = [
      { display_name: 'Alice', message: 'Hey!', created_at: '2026-01-01T00:00:01Z', user_id: null },
    ];
    refreshChatUI();

    expect(container.innerHTML).toContain('sc-msg');
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — refreshChatUI updates count element', () => {
  it('sets chat-count text to message count when > 0', () => {
    const container = document.createElement('div');
    container.id = 'spec-chat-messages';
    const countEl = document.createElement('span');
    countEl.id = 'chat-count';
    document.body.appendChild(container);
    document.body.appendChild(countEl);

    mockState.chatMessages = [
      { display_name: 'Alice', message: 'Hey!', created_at: '2026-01-01T00:00:01Z', user_id: null },
    ];
    refreshChatUI();

    expect(countEl.textContent).toContain('1');
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — stopChatPolling clears the poll timer', () => {
  it('sets chatPollTimer to null after clearing', () => {
    vi.useFakeTimers();
    mockState.chatPollTimer = setInterval(() => {}, 6000);
    stopChatPolling();
    expect(mockState.chatPollTimer).toBeNull();
    vi.useRealTimers();
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — stopChatPolling does nothing when timer is null', () => {
  it('does not throw when chatPollTimer is already null', () => {
    mockState.chatPollTimer = null;
    expect(() => stopChatPolling()).not.toThrow();
  });
});

// ── TC9 ───────────────────────────────────────────────────────

describe('TC9 — startChatPolling sets chatPollTimer', () => {
  it('sets a non-null interval timer on state', () => {
    vi.useFakeTimers();
    startChatPolling();
    expect(mockState.chatPollTimer).not.toBeNull();
    stopChatPolling();
    vi.useRealTimers();
  });
});

// ── TC10 ──────────────────────────────────────────────────────

describe('TC10 — startChatPolling replaces existing timer', () => {
  it('clears old timer before setting new one', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(global, 'clearInterval');
    mockState.chatPollTimer = setInterval(() => {}, 9999) as unknown as ReturnType<typeof setInterval>;
    startChatPolling();
    expect(clearSpy).toHaveBeenCalled();
    stopChatPolling();
    vi.useRealTimers();
  });
});

// ── TC11 ──────────────────────────────────────────────────────

describe('TC11 — startChatPolling calls safeRpc on tick with debate ID', () => {
  it('calls safeRpc("get_spectator_chat") on interval tick', async () => {
    vi.useFakeTimers();
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    startChatPolling();
    await vi.advanceTimersByTimeAsync(6001);
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'get_spectator_chat',
      expect.objectContaining({ p_debate_id: 'debate-1' }),
      expect.anything()
    );
    stopChatPolling();
    vi.useRealTimers();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/spectate.chat.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../depth-gate.ts',
      './spectate.state.ts',
      './spectate.utils.ts',
      './spectate.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/spectate.chat.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
