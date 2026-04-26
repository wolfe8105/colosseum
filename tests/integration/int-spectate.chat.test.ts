/**
 * Integration tests — spectate.chat.ts → spectate.utils
 * SEAM #352 | score: 6
 *
 * Boundary: renderChatMessages calls escHtml (display_name, message) and
 *           timeAgo (created_at) from spectate.utils.
 * RPC: safeRpc('send_spectator_chat'), safeRpc('get_spectator_chat')
 * DOM: #spec-chat-messages, #chat-count, #spec-chat-header, #spec-chat-body,
 *      #chat-toggle, #chat-input, #chat-send
 * Mock boundary: @supabase/supabase-js only.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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

// ---------------------------------------------------------------------------
// Module handles — re-imported fresh in each beforeEach via vi.resetModules()
// ---------------------------------------------------------------------------

let renderChatMessages: (msgs: unknown[]) => string;
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

  const stateMod = await import('../../src/pages/spectate.state.ts');
  state = stateMod.state;

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

// ---------------------------------------------------------------------------
// ARCH filter — verify import wiring from spectate.utils
// ---------------------------------------------------------------------------

describe('ARCH #352 — spectate.chat imports escHtml and timeAgo from spectate.utils', () => {
  it('imports escHtml from ./spectate.utils', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.chat.ts'),
      'utf8'
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const utilsLine = imports.find(l => l.includes('spectate.utils'));
    expect(utilsLine).toBeDefined();
    expect(utilsLine).toContain('escHtml');
  });

  it('imports timeAgo from ./spectate.utils', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.chat.ts'),
      'utf8'
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const utilsLine = imports.find(l => l.includes('spectate.utils'));
    expect(utilsLine).toBeDefined();
    expect(utilsLine).toContain('timeAgo');
  });

  it('does not import escHtml or timeAgo from any other path', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.chat.ts'),
      'utf8'
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const allowed = [
      '../auth',
      '../contracts/rpc-schemas',
      '../depth-gate',
      './spectate.state',
      './spectate.utils',
      './spectate.types',
    ];
    for (const line of imports) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!match) continue;
      const dep = match[1];
      expect(allowed.some(a => dep.startsWith(a)), `Unexpected import: ${dep}`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// TC-352-01: escHtml on display_name — XSS payload is escaped
// ---------------------------------------------------------------------------

describe('TC-352-01 — renderChatMessages escapes XSS in display_name via escHtml', () => {
  it('escapes <script> tag in display_name', () => {
    const msgs = [
      {
        display_name: '<script>alert(1)</script>',
        message: 'Hello',
        created_at: new Date().toISOString(),
        user_id: 'u1',
      },
    ];
    const html = renderChatMessages(msgs as any);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes double-quote in display_name preventing attribute injection', () => {
    const msgs = [
      {
        display_name: '"malicious"',
        message: 'Msg',
        created_at: new Date().toISOString(),
        user_id: 'u1',
      },
    ];
    const html = renderChatMessages(msgs as any);

    // escHtml maps " → &quot;
    expect(html).not.toContain('"malicious"');
    expect(html).toContain('&quot;malicious&quot;');
  });
});

// ---------------------------------------------------------------------------
// TC-352-02: escHtml on message — XSS payload in body is escaped
// ---------------------------------------------------------------------------

describe('TC-352-02 — renderChatMessages escapes XSS in message body via escHtml', () => {
  it('escapes <img onerror> in message field', () => {
    const msgs = [
      {
        display_name: 'Alice',
        message: '<img src=x onerror=alert(2)>',
        created_at: new Date().toISOString(),
        user_id: 'u1',
      },
    ];
    const html = renderChatMessages(msgs as any);

    // escHtml('<img src=x onerror=alert(2)>') → '&lt;img src=x onerror=alert(2)&gt;'
    // The raw tag is neutralised; no unescaped opening < remains for img
    expect(html).not.toContain('<img ');
    expect(html).toContain('&lt;img');
  });

  it('escapes single-quote in message body', () => {
    const msgs = [
      {
        display_name: 'Bob',
        message: "It's a trap' onmouseover='x",
        created_at: new Date().toISOString(),
        user_id: 'u2',
      },
    ];
    const html = renderChatMessages(msgs as any);

    // escHtml maps ' → &#39;
    expect(html).toContain('&#39;');
    expect(html).not.toContain("onmouseover='x");
  });
});

// ---------------------------------------------------------------------------
// TC-352-03: timeAgo on created_at — recent timestamp returns "now"
// ---------------------------------------------------------------------------

describe('TC-352-03 — renderChatMessages uses timeAgo for created_at < 60s → "now"', () => {
  it('renders "now" for a message created 10 seconds ago', () => {
    const recentTs = new Date(Date.now() - 10_000).toISOString();
    const msgs = [
      {
        display_name: 'Alice',
        message: 'Fresh message',
        created_at: recentTs,
        user_id: 'u1',
      },
    ];
    const html = renderChatMessages(msgs as any);

    expect(html).toContain('now');
    // Rendered inside the sc-msg-time span
    expect(html).toContain('class="sc-msg-time"');
  });
});

// ---------------------------------------------------------------------------
// TC-352-04: timeAgo on created_at — ~3 min ago returns "3m"
// ---------------------------------------------------------------------------

describe('TC-352-04 — renderChatMessages uses timeAgo for created_at ~3min → "3m"', () => {
  it('renders "3m" for a message created 3 minutes ago', () => {
    const threeMinAgo = new Date(Date.now() - 3 * 60_000).toISOString();
    const msgs = [
      {
        display_name: 'Bob',
        message: 'Older message',
        created_at: threeMinAgo,
        user_id: 'u2',
      },
    ];
    const html = renderChatMessages(msgs as any);

    expect(html).toContain('3m');
  });
});

// ---------------------------------------------------------------------------
// TC-352-05: timeAgo on created_at — null returns empty string (no crash)
// ---------------------------------------------------------------------------

describe('TC-352-05 — renderChatMessages handles null created_at via timeAgo gracefully', () => {
  it('does not throw and renders empty time span for null created_at', () => {
    const msgs = [
      {
        display_name: 'Carol',
        message: 'No timestamp',
        created_at: null,
        user_id: 'u3',
      },
    ];
    let html = '';
    expect(() => {
      html = renderChatMessages(msgs as any);
    }).not.toThrow();

    // timeAgo(null) returns '' — the span is present but empty
    expect(html).toContain('class="sc-msg-time"');
    expect(html).toContain('Carol');
  });
});

// ===========================================================================
// SEAM #398 — spectate.chat.ts → depth-gate (isDepthBlocked)
// ===========================================================================

// ---------------------------------------------------------------------------
// ARCH filter
// ---------------------------------------------------------------------------

describe('ARCH #398 — spectate.chat imports isDepthBlocked from depth-gate', () => {
  it('has an import line for isDepthBlocked from ../depth-gate', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.chat.ts'),
      'utf8'
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const gateLine = imports.find(l => l.includes('depth-gate'));
    expect(gateLine).toBeDefined();
    expect(gateLine).toContain('isDepthBlocked');
  });
});

// ---------------------------------------------------------------------------
// Shared helpers for SEAM #398
// ---------------------------------------------------------------------------

// wireChatUI clones input/sendBtn before wiring event listeners.
// The sendChat closure captures the ORIGINAL input element reference.
// Therefore: set input.value on the ORIGINAL element BEFORE calling wireChatUI,
// so the closure reads the correct value when the button fires.

const mockIsDepthBlocked = vi.hoisted(() => vi.fn(() => false));

vi.mock('../../src/depth-gate.ts', () => ({
  isDepthBlocked: mockIsDepthBlocked,
}));

// Build DOM and pre-fill original input BEFORE wireChatUI clones it.
// Returns original input so caller can set .value before wireChatUI is called.
function buildChatDomWithValue(msg: string): {
  originalInput: HTMLInputElement;
} {
  document.body.innerHTML = `
    <div id="spec-chat-header"></div>
    <div id="spec-chat-body"></div>
    <span id="chat-toggle"></span>
    <div id="spec-chat-messages"></div>
    <span id="chat-count"></span>
    <input id="chat-input" type="text" />
    <button id="chat-send">Send</button>
  `;
  const originalInput = document.getElementById('chat-input') as HTMLInputElement;
  originalInput.value = msg;
  return { originalInput };
}

// ---------------------------------------------------------------------------
// TC-398-01: isDepthBlocked blocks send — safeRpc not called
// ---------------------------------------------------------------------------

describe('TC-398-01 — depth gate blocks send when isDepthBlocked returns true', () => {
  it('does not call safeRpc when isDepthBlocked is true', async () => {
    mockIsDepthBlocked.mockReturnValue(true);
    mockRpc.mockReset();

    // Set value on original input BEFORE wireChatUI so the closure captures it
    buildChatDomWithValue('A valid message');

    const chatMod = await import('../../src/pages/spectate.chat.ts');
    const stateMod = await import('../../src/pages/spectate.state.ts');
    const s = stateMod.state;
    s.debateId = 'debate-uuid-002';
    s.isLoggedIn = true;

    chatMod.wireChatUI({} as any);

    // wireChatUI clones the button — get the fresh cloned element to click
    const freshSendBtn = document.getElementById('chat-send') as HTMLButtonElement;
    freshSendBtn.click();

    await Promise.resolve();
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(mockIsDepthBlocked).toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// TC-398-02: depth gate passes — safeRpc IS called with correct RPC name
// ---------------------------------------------------------------------------

describe('TC-398-02 — depth gate passes and safeRpc is called', () => {
  it('calls safeRpc send_spectator_chat when isDepthBlocked returns false', async () => {
    mockIsDepthBlocked.mockReturnValue(false);
    mockRpc.mockResolvedValue({ data: { success: true, display_name: 'Alice' }, error: null });

    buildChatDomWithValue('Hello debate!');

    const chatMod = await import('../../src/pages/spectate.chat.ts');
    const stateMod = await import('../../src/pages/spectate.state.ts');
    const s = stateMod.state;
    s.debateId = 'debate-uuid-003';
    s.isLoggedIn = true;

    chatMod.wireChatUI({} as any);

    const freshSendBtn = document.getElementById('chat-send') as HTMLButtonElement;
    freshSendBtn.click();

    await Promise.resolve();
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(mockIsDepthBlocked).toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledWith(
      'send_spectator_chat',
      expect.objectContaining({ p_debate_id: 'debate-uuid-003', p_message: 'Hello debate!' })
    );
  });
});

// ---------------------------------------------------------------------------
// TC-398-03: empty message — isDepthBlocked never called (short-circuit)
// ---------------------------------------------------------------------------

describe('TC-398-03 — empty message short-circuits before isDepthBlocked', () => {
  it('does not call isDepthBlocked when input is blank', async () => {
    mockIsDepthBlocked.mockClear();
    mockRpc.mockReset();

    // Set blank/whitespace value before wireChatUI
    buildChatDomWithValue('   ');

    const chatMod = await import('../../src/pages/spectate.chat.ts');
    const stateMod = await import('../../src/pages/spectate.state.ts');
    const s = stateMod.state;
    s.debateId = 'debate-uuid-004';
    s.isLoggedIn = true;

    chatMod.wireChatUI({} as any);

    const freshSendBtn = document.getElementById('chat-send') as HTMLButtonElement;
    freshSendBtn.click();

    await Promise.resolve();
    await vi.runAllTimersAsync();

    expect(mockIsDepthBlocked).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// TC-398-04: message > 280 chars — isDepthBlocked never called
// ---------------------------------------------------------------------------

describe('TC-398-04 — message over 280 chars short-circuits before isDepthBlocked', () => {
  it('does not call isDepthBlocked when message exceeds 280 characters', async () => {
    mockIsDepthBlocked.mockClear();
    mockRpc.mockReset();

    buildChatDomWithValue('x'.repeat(281));

    const chatMod = await import('../../src/pages/spectate.chat.ts');
    const stateMod = await import('../../src/pages/spectate.state.ts');
    const s = stateMod.state;
    s.debateId = 'debate-uuid-005';
    s.isLoggedIn = true;

    chatMod.wireChatUI({} as any);

    const freshSendBtn = document.getElementById('chat-send') as HTMLButtonElement;
    freshSendBtn.click();

    await Promise.resolve();
    await vi.runAllTimersAsync();

    expect(mockIsDepthBlocked).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// TC-398-05: not logged in — wireChatUI returns early, no send handler wired
// ---------------------------------------------------------------------------

describe('TC-398-05 — wireChatUI returns early when isLoggedIn is false', () => {
  it('does not call isDepthBlocked when user is not logged in', async () => {
    mockIsDepthBlocked.mockClear();
    mockRpc.mockReset();

    buildChatDomWithValue('Some message');

    const chatMod = await import('../../src/pages/spectate.chat.ts');
    const stateMod = await import('../../src/pages/spectate.state.ts');
    const s = stateMod.state;
    s.debateId = 'debate-uuid-006';
    s.isLoggedIn = false; // not logged in — wireChatUI returns early

    chatMod.wireChatUI({} as any);

    // Button is NOT cloned (early return) — clicking it does nothing
    const sendBtn = document.getElementById('chat-send') as HTMLButtonElement;
    sendBtn.click();

    await Promise.resolve();
    await vi.runAllTimersAsync();

    expect(mockIsDepthBlocked).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// TC-398-06: depth gate blocked — RPC is never reached
// ---------------------------------------------------------------------------

describe('TC-398-06 — when depth gate blocks, safeRpc is never reached', () => {
  it('never calls safeRpc when isDepthBlocked returns true', async () => {
    mockIsDepthBlocked.mockReturnValue(true);
    mockRpc.mockReset();

    buildChatDomWithValue('My blocked message');

    const chatMod = await import('../../src/pages/spectate.chat.ts');
    const stateMod = await import('../../src/pages/spectate.state.ts');
    const s = stateMod.state;
    s.debateId = 'debate-uuid-007';
    s.isLoggedIn = true;

    chatMod.wireChatUI({} as any);

    const freshSendBtn = document.getElementById('chat-send') as HTMLButtonElement;
    freshSendBtn.click();

    await Promise.resolve();
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(mockIsDepthBlocked).toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
