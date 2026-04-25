// ============================================================
// INTEGRATOR — spectate.chat → spectate.state
// Seam #262 | score: 8
// Boundary: spectate.chat reads/writes state.chatMessages,
//           state.chatOpen, state.debateId, state.isLoggedIn,
//           state.lastChatMessageAt, state.chatPollTimer
//           via the shared `state` object from spectate.state.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// ARCH CHECK
// ============================================================

it('ARCH: spectate.chat only imports from known seam files', async () => {
  const src = await import('../../src/pages/spectate.chat.ts?raw');
  const lines = src.default.split('\n').filter((l: string) => /from\s+['"]/.test(l));
  const allowed = [
    '../auth',
    '../contracts/rpc-schemas',
    '../depth-gate',
    './spectate.state',
    './spectate.utils',
    './spectate.types',
  ];
  for (const line of lines) {
    const match = line.match(/from\s+['"]([^'"]+)['"]/);
    if (!match) continue;
    const dep = match[1];
    expect(allowed.some(a => dep.startsWith(a)), `Unexpected import: ${dep}`).toBe(true);
  }
});

// ============================================================
// MODULE HANDLES
// ============================================================

let renderChatMessages: (msgs: unknown[]) => string;
let refreshChatUI: () => void;
let wireChatUI: (d: unknown) => void;
let startChatPolling: () => void;
let stopChatPolling: () => void;
let state: {
  chatMessages: unknown[];
  chatOpen: boolean;
  debateId: string | null;
  isLoggedIn: boolean;
  lastChatMessageAt: string | null;
  chatPollTimer: ReturnType<typeof setInterval> | null;
};

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  document.body.innerHTML = '';

  const chatMod = await import('../../src/pages/spectate.chat.ts');
  renderChatMessages = chatMod.renderChatMessages;
  refreshChatUI = chatMod.refreshChatUI;
  wireChatUI = chatMod.wireChatUI;
  startChatPolling = chatMod.startChatPolling;
  stopChatPolling = chatMod.stopChatPolling;

  const stateMod = await import('../../src/pages/spectate.state.ts');
  state = stateMod.state;

  // Reset state to clean defaults for each test
  state.chatMessages = [];
  state.chatOpen = true;
  state.debateId = 'debate-uuid-001';
  state.isLoggedIn = false;
  state.lastChatMessageAt = null;
  state.chatPollTimer = null;
});

afterEach(() => {
  vi.useRealTimers();
  if (state?.chatPollTimer) {
    clearInterval(state.chatPollTimer);
    state.chatPollTimer = null;
  }
});

// ============================================================
// TC-I1: renderChatMessages — builds HTML from state messages
// ============================================================

describe('TC-I1: renderChatMessages renders message list from state', () => {
  it('produces sc-msg HTML for each message', () => {
    const msgs = [
      { display_name: 'Alice', message: 'Hello there', created_at: new Date().toISOString(), user_id: 'u1' },
      { display_name: 'Bob', message: 'How goes it', created_at: new Date().toISOString(), user_id: 'u2' },
    ];
    const html = renderChatMessages(msgs as any);
    expect(html).toContain('class="sc-msg"');
    expect(html).toContain('Alice');
    expect(html).toContain('Hello there');
    expect(html).toContain('Bob');
    expect(html).toContain('How goes it');
  });

  it('escapes XSS in display_name and message', () => {
    const msgs = [
      { display_name: '<script>alert(1)</script>', message: '<img src=x onerror=alert(1)>', created_at: new Date().toISOString(), user_id: 'u1' },
    ];
    const html = renderChatMessages(msgs as any);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img');
  });

  it('returns empty string for empty array', () => {
    const html = renderChatMessages([]);
    expect(html).toBe('');
  });
});

// ============================================================
// TC-I2: refreshChatUI — reads state.chatMessages, writes DOM
// ============================================================

describe('TC-I2: refreshChatUI reads state.chatMessages and updates DOM', () => {
  it('shows empty placeholder when chatMessages is empty', () => {
    document.body.innerHTML = '<div id="spec-chat-messages"></div><span id="chat-count"></span>';
    state.chatMessages = [];
    refreshChatUI();
    const container = document.getElementById('spec-chat-messages')!;
    expect(container.innerHTML).toContain('spec-chat-empty');
    expect(container.innerHTML).toContain('No messages yet');
  });

  it('renders messages into DOM when chatMessages has items', () => {
    document.body.innerHTML = '<div id="spec-chat-messages"></div><span id="chat-count"></span>';
    // jsdom does not implement scrollTo — stub it so refreshChatUI does not throw
    const container = document.getElementById('spec-chat-messages')!;
    (container as any).scrollTo = vi.fn();
    state.chatMessages = [
      { display_name: 'Alice', message: 'Test msg', created_at: new Date().toISOString(), user_id: 'u1' },
    ];
    refreshChatUI();
    expect(container.innerHTML).toContain('sc-msg');
    expect(container.innerHTML).toContain('Alice');
    expect(container.innerHTML).toContain('Test msg');
  });

  it('sets chat-count text to message count when non-empty', () => {
    document.body.innerHTML = '<div id="spec-chat-messages"></div><span id="chat-count"></span>';
    const container = document.getElementById('spec-chat-messages')!;
    (container as any).scrollTo = vi.fn();
    state.chatMessages = [
      { display_name: 'Alice', message: 'One', created_at: new Date().toISOString(), user_id: 'u1' },
      { display_name: 'Bob', message: 'Two', created_at: new Date().toISOString(), user_id: 'u2' },
    ];
    refreshChatUI();
    const countEl = document.getElementById('chat-count')!;
    expect(countEl.textContent).toContain('2');
  });

  it('clears chat-count when messages become empty', () => {
    document.body.innerHTML = '<div id="spec-chat-messages"></div><span id="chat-count"></span>';
    state.chatMessages = [];
    refreshChatUI();
    const countEl = document.getElementById('chat-count')!;
    expect(countEl.textContent).toBe('');
  });

  it('no-ops when #spec-chat-messages does not exist', () => {
    document.body.innerHTML = '';
    expect(() => refreshChatUI()).not.toThrow();
  });
});

// ============================================================
// TC-I3: wireChatUI — header toggle writes state.chatOpen
// ============================================================

describe('TC-I3: wireChatUI header click toggles state.chatOpen', () => {
  it('toggles state.chatOpen from true to false on header click', () => {
    document.body.innerHTML = `
      <div id="spec-chat-header"></div>
      <div id="spec-chat-body" class="open"></div>
      <div id="chat-toggle" class="open"></div>
    `;
    state.chatOpen = true;
    wireChatUI({} as any);
    const header = document.getElementById('spec-chat-header')!;
    header.click();
    expect(state.chatOpen).toBe(false);
  });

  it('toggles state.chatOpen from false to true on second click', () => {
    document.body.innerHTML = `
      <div id="spec-chat-header"></div>
      <div id="spec-chat-body"></div>
      <div id="chat-toggle"></div>
    `;
    state.chatOpen = false;
    wireChatUI({} as any);
    const header = document.getElementById('spec-chat-header')!;
    header.click();
    expect(state.chatOpen).toBe(true);
    header.click();
    expect(state.chatOpen).toBe(false);
  });

  it('adds/removes "open" class on spec-chat-body to match state.chatOpen', () => {
    document.body.innerHTML = `
      <div id="spec-chat-header"></div>
      <div id="spec-chat-body" class="open"></div>
      <div id="chat-toggle" class="open"></div>
    `;
    state.chatOpen = true;
    wireChatUI({} as any);
    const body = document.getElementById('spec-chat-body')!;
    const header = document.getElementById('spec-chat-header')!;
    header.click(); // chatOpen → false
    expect(body.classList.contains('open')).toBe(false);
    header.click(); // chatOpen → true
    expect(body.classList.contains('open')).toBe(true);
  });

  it('skips input/send wiring when state.isLoggedIn is false', () => {
    document.body.innerHTML = `
      <div id="spec-chat-header"></div>
      <input id="chat-input" type="text" />
      <button id="chat-send"></button>
    `;
    state.isLoggedIn = false;
    // wireChatUI should not throw even without a logged-in user
    expect(() => wireChatUI({} as any)).not.toThrow();
    // Input should remain in DOM untouched by clone/replace (no logged-in path)
    expect(document.getElementById('chat-input')).not.toBeNull();
  });
});

// ============================================================
// TC-I4: startChatPolling — polls safeRpc and updates state
// ============================================================

describe('TC-I4: startChatPolling polls get_spectator_chat and updates state.chatMessages', () => {
  it('calls safeRpc(get_spectator_chat) with state.debateId after one interval tick', async () => {
    const freshMsg = {
      display_name: 'Charlie',
      message: 'Polling msg',
      created_at: new Date(Date.now() + 1000).toISOString(),
      user_id: 'u3',
    };
    mockRpc.mockResolvedValue({ data: [freshMsg], error: null });

    document.body.innerHTML = '<div id="spec-chat-messages"></div><span id="chat-count"></span>';
    // jsdom does not implement scrollTo — stub it
    const container = document.getElementById('spec-chat-messages')!;
    (container as any).scrollTo = vi.fn();
    state.debateId = 'debate-uuid-001';
    state.chatMessages = [];
    state.lastChatMessageAt = null;

    startChatPolling();
    expect(state.chatPollTimer).not.toBeNull();

    await vi.advanceTimersByTimeAsync(6000);

    expect(mockRpc).toHaveBeenCalledWith(
      'get_spectator_chat',
      expect.objectContaining({ p_debate_id: 'debate-uuid-001', p_limit: 100 })
    );
    expect(state.chatMessages).toHaveLength(1);
    expect((state.chatMessages[0] as any).message).toBe('Polling msg');
  });

  it('deduplicates — does not add messages older than lastChatMessageAt', async () => {
    const oldTs = new Date(Date.now() - 10000).toISOString();
    const oldMsg = { display_name: 'Dave', message: 'Old msg', created_at: oldTs, user_id: 'u4' };
    mockRpc.mockResolvedValue({ data: [oldMsg], error: null });

    state.debateId = 'debate-uuid-001';
    state.chatMessages = [];
    state.lastChatMessageAt = new Date(Date.now()).toISOString(); // set to "now"

    startChatPolling();
    await vi.advanceTimersByTimeAsync(6000);

    // oldMsg.created_at < lastChatMessageAt so it should be filtered out
    expect(state.chatMessages).toHaveLength(0);
  });

  it('updates state.lastChatMessageAt to the last message timestamp', async () => {
    const ts = new Date(Date.now() + 5000).toISOString();
    const msg = { display_name: 'Eve', message: 'Latest', created_at: ts, user_id: 'u5' };
    mockRpc.mockResolvedValue({ data: [msg], error: null });

    document.body.innerHTML = '<div id="spec-chat-messages"></div><span id="chat-count"></span>';
    const container2 = document.getElementById('spec-chat-messages')!;
    (container2 as any).scrollTo = vi.fn();

    state.debateId = 'debate-uuid-001';
    state.chatMessages = [];
    state.lastChatMessageAt = null;

    startChatPolling();
    await vi.advanceTimersByTimeAsync(6000);

    expect(state.lastChatMessageAt).toBe(ts);
  });
});

// ============================================================
// TC-I5: stopChatPolling — clears interval and nulls timer
// ============================================================

describe('TC-I5: stopChatPolling clears chatPollTimer and sets it null', () => {
  it('sets state.chatPollTimer to null after stopping', () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    startChatPolling();
    expect(state.chatPollTimer).not.toBeNull();

    stopChatPolling();
    expect(state.chatPollTimer).toBeNull();
  });

  it('does not throw when called with no active timer (null)', () => {
    state.chatPollTimer = null;
    expect(() => stopChatPolling()).not.toThrow();
    expect(state.chatPollTimer).toBeNull();
  });

  it('stops polling — no further RPC calls after stopChatPolling', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    document.body.innerHTML = '<div id="spec-chat-messages"></div><span id="chat-count"></span>';
    const cStop = document.getElementById('spec-chat-messages')!;
    (cStop as any).scrollTo = vi.fn();
    state.debateId = 'debate-uuid-001';
    state.chatMessages = [];
    state.lastChatMessageAt = null;

    startChatPolling();
    await vi.advanceTimersByTimeAsync(6000);
    const callCountAfterOne = mockRpc.mock.calls.length;

    stopChatPolling();
    await vi.advanceTimersByTimeAsync(12000);
    const callCountAfterStop = mockRpc.mock.calls.length;

    expect(callCountAfterStop).toBe(callCountAfterOne);
  });
});

// ============================================================
// TC-I6: startChatPolling — replaces existing timer on restart
// ============================================================

describe('TC-I6: startChatPolling clears previous timer before starting new one', () => {
  it('replaces old chatPollTimer with a new one when called twice', () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    startChatPolling();
    const firstTimer = state.chatPollTimer;
    expect(firstTimer).not.toBeNull();

    startChatPolling();
    const secondTimer = state.chatPollTimer;
    expect(secondTimer).not.toBeNull();
    // The second timer replaces the first
    expect(secondTimer).not.toBe(firstTimer);
  });
});

// ============================================================
// TC-I7: wireChatUI + send — optimistic append updates state on success
// ============================================================

describe('TC-I7: wireChatUI send path — optimistic append to state.chatMessages on RPC success', () => {
  it('appends optimistic message to state.chatMessages and calls send_spectator_chat RPC', async () => {
    document.body.innerHTML = `
      <div id="spec-chat-header"></div>
      <input id="chat-input" type="text" value="Great point!" />
      <button id="chat-send"></button>
      <div id="spec-chat-messages"></div>
      <span id="chat-count"></span>
    `;
    // jsdom does not implement scrollTo — stub it before wireChatUI runs
    const msgContainer = document.getElementById('spec-chat-messages')!;
    (msgContainer as any).scrollTo = vi.fn();

    state.isLoggedIn = true;
    state.debateId = 'debate-uuid-001';
    state.chatMessages = [];

    mockRpc.mockResolvedValue({
      data: { success: true, display_name: 'Alice' },
      error: null,
    });

    wireChatUI({} as any);

    // After wireChatUI, input is cloned so re-query
    const sendBtn = document.getElementById('chat-send') as HTMLButtonElement;
    sendBtn.click();

    // Let the async sendChat run
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(mockRpc).toHaveBeenCalledWith(
      'send_spectator_chat',
      expect.objectContaining({
        p_debate_id: 'debate-uuid-001',
        p_message: 'Great point!',
      })
    );
    expect(state.chatMessages).toHaveLength(1);
    expect((state.chatMessages[0] as any).message).toBe('Great point!');
  });
});
