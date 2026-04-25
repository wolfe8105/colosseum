// ============================================================
// GATEKEEPER -- F-23 DM Chat System
// Source: src/dm/dm.ts
// Spec: docs/product/THE-MODERATOR-FEATURE-SPECS-PENDING.md section F-23
//
// TC-GK-01  Thread name uses other_display_name when present
// TC-GK-02  Thread name falls back to other_username when other_display_name null
// TC-GK-03  Thread name falls back to User when both absent
// TC-GK-04  not_eligible error -> specific toast
// TC-GK-05  blocked error -> specific toast
// TC-GK-06  Other error -> generic toast
// TC-GK-07  Empty body -> sendMessage never called
// TC-GK-08  Successful send -> message unshifted into activeMessages
// TC-GK-09  Input cleared on successful send
// TC-GK-10  Input restored on not_eligible error
// TC-GK-11  Input disabled during send, re-enabled in finally
// TC-GK-12  Enter key triggers send
// TC-GK-13  Shift+Enter does NOT trigger send
// TC-GK-14  Back button -> setActiveThreadId(null)
// TC-GK-15  Back button -> setActiveMessages([])
// TC-GK-16  Back button -> fetchThreads() called
// TC-GK-17  Thread row click -> setActiveThreadId with thread id
// TC-GK-18  Thread row click -> fetchMessages with thread id
// TC-GK-19  dm-dot shown when unread count > 0
// TC-GK-20  dm-dot hidden when unread count = 0
// TC-GK-21  Realtime channel named dm:${threadId}
// TC-GK-22  Realtime: INSERT on dm_messages filtered by thread_id
// TC-GK-23  Realtime: message from self NOT added
// TC-GK-24  Realtime: message from other user added via unshift
// TC-GK-25  clampRealtime called with status + channel name
// ARCH      All imports from allowed list
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// -- Hoisted mocks ---------------------------------------------

const mockReady             = vi.hoisted(() => Promise.resolve());
const mockGetCurrentUser    = vi.hoisted(() => vi.fn(() => null as { id: string } | null));
const mockGetSupabaseClient = vi.hoisted(() => vi.fn(() => null as unknown));
const mockShowToast         = vi.hoisted(() => vi.fn());
const mockClampRealtime     = vi.hoisted(() => vi.fn());
const mockFetchThreads      = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockFetchMessages     = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockSendMessage       = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockFetchUnreadCount  = vi.hoisted(() => vi.fn().mockResolvedValue(0));
const mockRenderInbox       = vi.hoisted(() => vi.fn(() => ''));
const mockRenderThread      = vi.hoisted(() => vi.fn(() =>
  '<div><button id="dm-back-btn">Back</button>' +
  '<div id="dm-messages-container"></div>' +
  '<input id="dm-input" />' +
  '<button id="dm-send-btn">Send</button></div>'
));
const mockSetActiveThreadId = vi.hoisted(() => vi.fn());
const mockSetActiveMessages = vi.hoisted(() => vi.fn());

type MockThread = {
  thread_id: string; other_user_id: string;
  other_display_name: string | null; other_username: string;
  last_message: string | null; last_at: string; unread_count: number;
};
type MockMessage = {
  id: string; sender_id: string; body: string; created_at: string; read_at: string | null;
};

const dmStateVars = vi.hoisted(() => ({
  threads:        [] as MockThread[],
  activeThreadId: null as string | null,
  activeMessages: [] as MockMessage[],
}));

vi.mock('../src/auth.ts', () => ({
  ready:             mockReady,
  getCurrentUser:    mockGetCurrentUser,
  getSupabaseClient: mockGetSupabaseClient,
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

vi.mock('../src/contracts/dependency-clamps.ts', () => ({
  clampRealtime: mockClampRealtime,
}));

vi.mock('../src/dm/dm.fetch.ts', () => ({
  fetchThreads:     mockFetchThreads,
  fetchMessages:    mockFetchMessages,
  sendMessage:      mockSendMessage,
  fetchUnreadCount: mockFetchUnreadCount,
}));

vi.mock('../src/dm/dm.render.ts', () => ({
  renderInbox:  mockRenderInbox,
  renderThread: mockRenderThread,
}));

vi.mock('../src/dm/dm.state.ts', () => ({
  get threads()        { return dmStateVars.threads; },
  get activeThreadId() { return dmStateVars.activeThreadId; },
  get activeMessages() { return dmStateVars.activeMessages; },
  setActiveThreadId: mockSetActiveThreadId,
  setActiveMessages: mockSetActiveMessages,
}));

import { renderDMScreen, init } from '../src/dm/dm.ts';

// -- beforeEach -----------------------------------------------

beforeEach(() => {
  mockGetCurrentUser.mockReset().mockReturnValue(null);
  mockGetSupabaseClient.mockReset().mockReturnValue(null);
  mockShowToast.mockReset();
  mockClampRealtime.mockReset();
  mockFetchThreads.mockReset().mockResolvedValue(undefined);
  mockFetchMessages.mockReset().mockResolvedValue([]);
  mockSendMessage.mockReset().mockResolvedValue({});
  mockFetchUnreadCount.mockReset().mockResolvedValue(0);
  mockRenderInbox.mockReset().mockReturnValue('');
  mockRenderThread.mockReset().mockReturnValue(
    '<div><button id="dm-back-btn">Back</button>' +
    '<div id="dm-messages-container"></div>' +
    '<input id="dm-input" />' +
    '<button id="dm-send-btn">Send</button></div>'
  );
  mockSetActiveThreadId.mockReset();
  mockSetActiveMessages.mockReset();
  dmStateVars.threads        = [];
  dmStateVars.activeThreadId = null;
  dmStateVars.activeMessages = [];
  document.body.innerHTML    = '';
});

// -- Shared fixture --------------------------------------------

const BASE_THREAD: MockThread = {
  thread_id:          'thread-1',
  other_user_id:      'user-b',
  other_display_name: 'Alice',
  other_username:     'alice99',
  last_message:       null,
  last_at:            '',
  unread_count:       0,
};

async function setupThreadMode(overrides: Partial<MockThread> = {}): Promise<void> {
  const thread = { ...BASE_THREAD, ...overrides };
  dmStateVars.threads        = [thread];
  dmStateVars.activeThreadId = thread.thread_id;
  dmStateVars.activeMessages = [];
  document.body.innerHTML    = '<div id="screen-dm"></div>';
  await renderDMScreen();
}

async function drain(): Promise<void> {
  await new Promise(r => setTimeout(r, 30));
}

// -- TC-GK-01 ------------------------------------------------

describe('TC-GK-01 -- thread name uses other_display_name when present', () => {
  it('passes other_display_name to renderThread', async () => {
    dmStateVars.threads = [{ ...BASE_THREAD, other_display_name: 'Bob Display', other_username: 'bobuser' }];
    dmStateVars.activeThreadId = 'thread-1';
    document.body.innerHTML = '<div id="screen-dm"></div>';
    await renderDMScreen();
    expect(mockRenderThread).toHaveBeenCalledWith('Bob Display');
  });
});

// -- TC-GK-02 ------------------------------------------------

describe('TC-GK-02 -- thread name falls back to other_username when other_display_name is null', () => {
  it('passes other_username to renderThread when other_display_name is null', async () => {
    dmStateVars.threads = [{ ...BASE_THREAD, other_display_name: null, other_username: 'fallback_user' }];
    dmStateVars.activeThreadId = 'thread-1';
    document.body.innerHTML = '<div id="screen-dm"></div>';
    await renderDMScreen();
    expect(mockRenderThread).toHaveBeenCalledWith('fallback_user');
  });
});

// -- TC-GK-03 ------------------------------------------------

describe('TC-GK-03 -- thread name falls back to User when no thread found', () => {
  it("passes 'User' to renderThread when thread is not in state", async () => {
    dmStateVars.threads        = [];
    dmStateVars.activeThreadId = 'thread-unknown';
    document.body.innerHTML    = '<div id="screen-dm"></div>';
    await renderDMScreen();
    expect(mockRenderThread).toHaveBeenCalledWith('User');
  });
});

// -- TC-GK-04 ------------------------------------------------

describe('TC-GK-04 -- not_eligible -> specific toast', () => {
  it('shows eligibility gate toast when sendMessage returns not_eligible', async () => {
    mockSendMessage.mockResolvedValue({ error: 'not_eligible' });
    await setupThreadMode();
    const input = document.getElementById('dm-input') as HTMLInputElement;
    input.value = 'hey there';
    document.getElementById('dm-send-btn')!.click();
    await drain();
    expect(mockShowToast).toHaveBeenCalledWith(
      'You need to interact with this user first (debate, spectate, or tip).',
      'error'
    );
  });
});

// -- TC-GK-05 ------------------------------------------------

describe('TC-GK-05 -- blocked -> specific toast', () => {
  it('shows blocked toast when sendMessage returns blocked', async () => {
    mockSendMessage.mockResolvedValue({ error: 'blocked' });
    await setupThreadMode();
    const input = document.getElementById('dm-input') as HTMLInputElement;
    input.value = 'hello';
    document.getElementById('dm-send-btn')!.click();
    await drain();
    expect(mockShowToast).toHaveBeenCalledWith(
      'This conversation is no longer available.',
      'error'
    );
  });
});

// -- TC-GK-06 ------------------------------------------------

describe('TC-GK-06 -- other send error -> generic toast', () => {
  it('shows generic failure toast for any unrecognised error code', async () => {
    mockSendMessage.mockResolvedValue({ error: 'rate_limited' });
    await setupThreadMode();
    const input = document.getElementById('dm-input') as HTMLInputElement;
    input.value = 'test';
    document.getElementById('dm-send-btn')!.click();
    await drain();
    expect(mockShowToast).toHaveBeenCalledWith(
      'Message failed to send. Try again.',
      'error'
    );
  });
});

// -- TC-GK-07 ------------------------------------------------

describe('TC-GK-07 -- empty/whitespace body never calls sendMessage', () => {
  it('does not call sendMessage when input trims to empty', async () => {
    await setupThreadMode();
    const input = document.getElementById('dm-input') as HTMLInputElement;
    input.value = '   ';
    document.getElementById('dm-send-btn')!.click();
    await drain();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});

// -- TC-GK-08 ------------------------------------------------

describe('TC-GK-08 -- successful send unshifts new message into activeMessages (newest-first)', () => {
  it('adds sent message as first element of activeMessages', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-me' });
    mockSendMessage.mockResolvedValue({ message_id: 'msg-new' });
    await setupThreadMode();
    const input = document.getElementById('dm-input') as HTMLInputElement;
    input.value = 'spec-driven message';
    document.getElementById('dm-send-btn')!.click();
    await drain();
    expect(dmStateVars.activeMessages.length).toBeGreaterThan(0);
    expect(dmStateVars.activeMessages[0].body).toBe('spec-driven message');
    expect(dmStateVars.activeMessages[0].sender_id).toBe('user-me');
  });
});

// -- TC-GK-09 ------------------------------------------------

describe('TC-GK-09 -- input cleared after successful send', () => {
  it('sets input.value to empty string once sendMessage succeeds', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-me' });
    mockSendMessage.mockResolvedValue({ message_id: 'msg-1' });
    await setupThreadMode();
    const input = document.getElementById('dm-input') as HTMLInputElement;
    input.value = 'clear me';
    document.getElementById('dm-send-btn')!.click();
    await drain();
    expect(input.value).toBe('');
  });
});

// -- TC-GK-10 ------------------------------------------------

describe('TC-GK-10 -- input value restored on not_eligible error', () => {
  it('restores original body into input.value when error is not_eligible', async () => {
    mockSendMessage.mockResolvedValue({ error: 'not_eligible' });
    await setupThreadMode();
    const input = document.getElementById('dm-input') as HTMLInputElement;
    input.value = 'original text';
    document.getElementById('dm-send-btn')!.click();
    await drain();
    expect(input.value).toBe('original text');
  });
});

// -- TC-GK-11 ------------------------------------------------

describe('TC-GK-11 -- input disabled during send, re-enabled in finally', () => {
  it('disables input during sendMessage call and re-enables it regardless of outcome', async () => {
    let wasDisabledDuringSend = false;
    mockSendMessage.mockImplementation(async () => {
      const inp = document.getElementById('dm-input') as HTMLInputElement;
      if (inp) wasDisabledDuringSend = inp.disabled;
      return {};
    });
    await setupThreadMode();
    const input = document.getElementById('dm-input') as HTMLInputElement;
    input.value = 'test message';
    document.getElementById('dm-send-btn')!.click();
    await drain();
    expect(wasDisabledDuringSend).toBe(true);
    expect(input.disabled).toBe(false);
  });
});

// -- TC-GK-12 ------------------------------------------------

describe('TC-GK-12 -- Enter key (no Shift) triggers send', () => {
  it('calls sendMessage when Enter is pressed without Shift', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-me' });
    mockSendMessage.mockResolvedValue({});
    await setupThreadMode();
    const input = document.getElementById('dm-input') as HTMLInputElement;
    input.value = 'enter key send';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true }));
    await drain();
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });
});

// -- TC-GK-13 ------------------------------------------------

describe('TC-GK-13 -- Shift+Enter does NOT trigger send', () => {
  it('does not call sendMessage when Shift+Enter is pressed', async () => {
    await setupThreadMode();
    const input = document.getElementById('dm-input') as HTMLInputElement;
    input.value = 'no send on shift enter';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    await drain();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});

// -- TC-GK-14 ------------------------------------------------

describe('TC-GK-14 -- back button calls setActiveThreadId(null)', () => {
  it('clears the active thread id when back is pressed', async () => {
    await setupThreadMode();
    document.getElementById('dm-back-btn')!.click();
    await drain();
    expect(mockSetActiveThreadId).toHaveBeenCalledWith(null);
  });
});

// -- TC-GK-15 ------------------------------------------------

describe('TC-GK-15 -- back button calls setActiveMessages([])', () => {
  it('clears active messages when back is pressed', async () => {
    await setupThreadMode();
    document.getElementById('dm-back-btn')!.click();
    await drain();
    expect(mockSetActiveMessages).toHaveBeenCalledWith([]);
  });
});

// -- TC-GK-16 ------------------------------------------------

describe('TC-GK-16 -- back button calls fetchThreads to refresh inbox', () => {
  it('calls fetchThreads once after back button pressed', async () => {
    await setupThreadMode();
    mockFetchThreads.mockClear();
    document.getElementById('dm-back-btn')!.click();
    await drain();
    expect(mockFetchThreads).toHaveBeenCalledTimes(1);
  });
});

// -- TC-GK-17 ------------------------------------------------

describe('TC-GK-17 -- thread row click calls setActiveThreadId with the thread id', () => {
  it('passes the data-thread-id value to setActiveThreadId', async () => {
    document.body.innerHTML = '<div id="screen-dm"></div>';
    dmStateVars.activeThreadId = null;
    dmStateVars.threads = [{ ...BASE_THREAD }];
    mockRenderInbox.mockReturnValue('<div class="dm-thread-row" data-thread-id="thread-1"></div>');
    await renderDMScreen();
    (document.querySelector('.dm-thread-row') as HTMLElement).click();
    await drain();
    expect(mockSetActiveThreadId).toHaveBeenCalledWith('thread-1');
  });
});

// -- TC-GK-18 ------------------------------------------------

describe('TC-GK-18 -- thread row click calls fetchMessages with the thread id', () => {
  it('fetches messages for the clicked thread id', async () => {
    document.body.innerHTML = '<div id="screen-dm"></div>';
    dmStateVars.activeThreadId = null;
    dmStateVars.threads = [{ ...BASE_THREAD }];
    mockRenderInbox.mockReturnValue('<div class="dm-thread-row" data-thread-id="thread-1"></div>');
    await renderDMScreen();
    (document.querySelector('.dm-thread-row') as HTMLElement).click();
    await drain();
    expect(mockFetchMessages).toHaveBeenCalledWith('thread-1');
  });
});

// -- TC-GK-19 ------------------------------------------------

describe('TC-GK-19 -- dm-dot shown when unread count > 0', () => {
  it('sets dm-dot display to block when fetchUnreadCount returns 5', async () => {
    document.body.innerHTML = '<div id="screen-dm"></div><div id="dm-dot" style="display:none;"></div>';
    mockFetchUnreadCount.mockResolvedValue(5);
    init();
    await drain();
    expect(document.getElementById('dm-dot')!.style.display).toBe('block');
  });
});

// -- TC-GK-20 ------------------------------------------------

describe('TC-GK-20 -- dm-dot hidden when unread count = 0', () => {
  it('sets dm-dot display to none when fetchUnreadCount returns 0', async () => {
    document.body.innerHTML = '<div id="screen-dm"></div><div id="dm-dot" style="display:block;"></div>';
    mockFetchUnreadCount.mockResolvedValue(0);
    init();
    await drain();
    expect(document.getElementById('dm-dot')!.style.display).toBe('none');
  });
});

// -- Realtime helpers -----------------------------------------

type InsertCb = (payload: { new: Record<string, unknown> }) => void;
type SubCb    = (status: string, err?: Error) => void;

interface RealtimeCapture {
  mockSb: {
    channel: ReturnType<typeof vi.fn>;
    removeChannel: ReturnType<typeof vi.fn>;
  };
  channelName: () => string | null;
  insertCb: () => InsertCb | null;
  subscribeCb: () => SubCb | null;
  config: () => Record<string, unknown> | null;
}

function buildRealtimeSb(): RealtimeCapture {
  let _channelName: string | null              = null;
  let _insertCb: InsertCb | null               = null;
  let _subscribeCb: SubCb | null               = null;
  let _config: Record<string, unknown> | null  = null;

  const mockSb = {
    channel: vi.fn((name: string) => {
      _channelName = name;
      return {
        on: vi.fn((_evt: string, cfg: Record<string, unknown>, cb: InsertCb) => {
          _config   = cfg;
          _insertCb = cb;
          return {
            subscribe: vi.fn((cb2: SubCb) => {
              _subscribeCb = cb2;
              return {};
            }),
          };
        }),
      };
    }),
    removeChannel: vi.fn(),
  };

  return {
    mockSb,
    channelName:  () => _channelName,
    insertCb:     () => _insertCb,
    subscribeCb:  () => _subscribeCb,
    config:       () => _config,
  };
}

async function openThreadViaInboxClick(): Promise<RealtimeCapture> {
  const rt = buildRealtimeSb();
  mockGetSupabaseClient.mockReturnValue(rt.mockSb);
  mockGetCurrentUser.mockReturnValue({ id: 'user-me' });
  document.body.innerHTML = '<div id="screen-dm"></div>';
  dmStateVars.activeThreadId = null;
  dmStateVars.threads = [{ ...BASE_THREAD }];
  mockRenderInbox.mockReturnValue('<div class="dm-thread-row" data-thread-id="thread-1"></div>');
  await renderDMScreen();
  (document.querySelector('.dm-thread-row') as HTMLElement).click();
  await drain();
  return rt;
}

// -- TC-GK-21 ------------------------------------------------

describe('TC-GK-21 -- realtime channel named dm:threadId', () => {
  it('creates supabase channel with name dm:thread-1', async () => {
    const rt = await openThreadViaInboxClick();
    expect(rt.mockSb.channel).toHaveBeenCalledWith('dm:thread-1');
  });
});

// -- TC-GK-22 ------------------------------------------------

describe('TC-GK-22 -- realtime: INSERT on dm_messages filtered by thread_id=eq.thread-1', () => {
  it('subscribes to INSERT events on dm_messages table with correct filter', async () => {
    const rt = await openThreadViaInboxClick();
    const cfg = rt.config()!;
    expect(cfg.event).toBe('INSERT');
    expect(cfg.schema).toBe('public');
    expect(cfg.table).toBe('dm_messages');
    expect(cfg.filter).toBe('thread_id=eq.thread-1');
  });
});

// -- TC-GK-23 ------------------------------------------------

describe('TC-GK-23 -- realtime: message from self (same sender_id) NOT added to activeMessages', () => {
  it('does not unshift a message whose sender_id matches the current user id', async () => {
    const rt = await openThreadViaInboxClick();
    const before = dmStateVars.activeMessages.length;
    rt.insertCb()!({ new: { id: 'self-msg', sender_id: 'user-me', body: 'my own msg', created_at: '', read_at: null } });
    expect(dmStateVars.activeMessages.length).toBe(before);
  });
});

// -- TC-GK-24 ------------------------------------------------

describe('TC-GK-24 -- realtime: message from other user added via unshift', () => {
  it('unshifts incoming message from a different sender into activeMessages', async () => {
    const rt = await openThreadViaInboxClick();
    const incoming = { id: 'other-msg', sender_id: 'user-other', body: 'incoming!', created_at: '2026-01-01T00:00:00Z', read_at: null };
    rt.insertCb()!({ new: incoming as Record<string, unknown> });
    expect(dmStateVars.activeMessages.length).toBeGreaterThan(0);
    expect(dmStateVars.activeMessages[0]).toMatchObject({ sender_id: 'user-other', body: 'incoming!' });
  });
});

// -- TC-GK-25 ------------------------------------------------

describe('TC-GK-25 -- clampRealtime called with status and channel name on subscribe', () => {
  it('invokes clampRealtime(status, dm:thread-1, err) when subscribe fires', async () => {
    const rt = await openThreadViaInboxClick();
    rt.subscribeCb()!('SUBSCRIBED', undefined);
    expect(mockClampRealtime).toHaveBeenCalledWith('SUBSCRIBED', 'dm:thread-1', undefined);
  });
});

// -- ARCH ----------------------------------------------------

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH -- src/dm/dm.ts imports only from the allowed dependency list', () => {
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
    const source = readFileSync(resolve(__dirname, '../src/dm/dm.ts'), 'utf-8');
    const paths = source
      .split('\n')
      .filter((l: string) => l.trimStart().startsWith('import '))
      .map((l: string) => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const p of paths) {
      expect(allowed, `Unexpected import: ${p}`).toContain(p);
    }
  });
});
