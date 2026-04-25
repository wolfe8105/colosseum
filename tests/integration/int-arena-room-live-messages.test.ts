// ============================================================
// INTEGRATOR — arena-room-live-messages + arena-state + auth + config
// Boundary: addMessage() reads currentDebate (role, opponentName, messages)
//           from arena-state; getCurrentProfile() from auth.core;
//           escapeHTML() from config.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
// MODULE HANDLES
// ============================================================

let addMessage: (side: 'a' | 'b', text: string, round: number, isAI: boolean) => void;
let addSystemMessage: (text: string) => void;
let set_currentDebate: (v: unknown) => void;

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  // jsdom does not implement Element.scrollTo — polyfill for test environment
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = vi.fn();
  }

  document.body.innerHTML = '<div id="arena-messages"></div>';

  const msgMod = await import('../../src/arena/arena-room-live-messages.ts');
  addMessage = msgMod.addMessage;
  addSystemMessage = msgMod.addSystemMessage;

  const stateMod = await import('../../src/arena/arena-state.ts');
  set_currentDebate = stateMod.set_currentDebate as (v: unknown) => void;
});

// ============================================================
// TC-I1: Message labeled "You" when side matches debate.role
// ============================================================

describe('TC-I1: addMessage labels as "You" when side matches currentDebate.role', () => {
  it('shows profile display_name when authenticated and side === debate.role', async () => {
    // Simulate authenticated user with profile
    vi.resetModules();
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: { user: { id: string } } | null) => void) => {
        const mockUser = { id: 'user-a', email: 'a@test.com' };
        setTimeout(() => cb('INITIAL_SESSION', { user: mockUser } as any), 0);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }
    );
    mockRpc.mockResolvedValue({
      data: { id: 'user-a', display_name: 'Alice', username: 'alice' },
      error: null,
    });

    document.body.innerHTML = '<div id="arena-messages"></div>';
    const msgMod = await import('../../src/arena/arena-room-live-messages.ts');
    const stateMod = await import('../../src/arena/arena-state.ts');
    (stateMod.set_currentDebate as (v: unknown) => void)({
      id: 'debate-1',
      role: 'a',
      opponentName: 'Bob',
      messages: [],
    });

    // Wait for auth profile to load
    await new Promise(r => setTimeout(r, 20));
    msgMod.addMessage('a', 'Hello world', 1, false);

    const msgs = document.querySelectorAll('.arena-msg.side-a');
    expect(msgs.length).toBe(1);
    expect(msgs[0].querySelector('.msg-label')!.textContent).toBe('Alice');
  });

  it('falls back to "You" when profile has no display_name', () => {
    set_currentDebate({
      id: 'debate-1',
      role: 'a',
      opponentName: 'Bob',
      messages: [],
    });

    addMessage('a', 'My argument', 1, false);

    const label = document.querySelector('.arena-msg.side-a .msg-label')!;
    // getCurrentProfile() is null (guest) — falls back to 'You'
    expect(label.textContent).toBe('You');
  });
});

// ============================================================
// TC-I2: Message labeled with opponent name when side !== debate.role
// ============================================================

describe('TC-I2: addMessage uses opponentName from currentDebate when side !== role', () => {
  it('shows opponent display name for the opposing side', () => {
    set_currentDebate({
      id: 'debate-1',
      role: 'a',
      opponentName: 'Bob Jones',
      messages: [],
    });

    addMessage('b', 'Counter argument', 1, false);

    const label = document.querySelector('.arena-msg.side-b .msg-label')!;
    expect(label.textContent).toBe('Bob Jones');
  });

  it('falls back to "Opponent" when opponentName is absent', () => {
    set_currentDebate({
      id: 'debate-1',
      role: 'a',
      opponentName: null,
      messages: [],
    });

    addMessage('b', 'Counter argument', 1, false);

    const label = document.querySelector('.arena-msg.side-b .msg-label')!;
    expect(label.textContent).toBe('Opponent');
  });
});

// ============================================================
// TC-I3: AI message always uses 🤖 AI label
// ============================================================

describe('TC-I3: AI messages use the AI label regardless of role', () => {
  it('labels as 🤖 AI for side a when isAI is true', () => {
    set_currentDebate({ id: 'debate-1', role: 'b', opponentName: 'Alice', messages: [] });
    addMessage('a', 'AI response', 2, true);
    const label = document.querySelector('.arena-msg.side-a .msg-label')!;
    expect(label.textContent).toBe('🤖 AI');
  });

  it('labels as 🤖 AI for side b when isAI is true', () => {
    set_currentDebate({ id: 'debate-1', role: 'a', opponentName: 'Bob', messages: [] });
    addMessage('b', 'AI response', 3, true);
    const label = document.querySelector('.arena-msg.side-b .msg-label')!;
    expect(label.textContent).toBe('🤖 AI');
  });
});

// ============================================================
// TC-I4: debate.messages array is mutated by addMessage
// ============================================================

describe('TC-I4: addMessage pushes to debate.messages in arena-state', () => {
  it('appends a message object to currentDebate.messages', async () => {
    const debateMessages: { role: string; text: string; round: number }[] = [];
    set_currentDebate({
      id: 'debate-1',
      role: 'a',
      opponentName: 'Bob',
      messages: debateMessages,
    });

    addMessage('a', 'First point', 1, false);
    addMessage('b', 'Rebuttal', 1, false);

    expect(debateMessages.length).toBe(2);
    expect(debateMessages[0]).toMatchObject({ role: 'user', text: 'First point', round: 1 });
    expect(debateMessages[1]).toMatchObject({ role: 'assistant', text: 'Rebuttal', round: 1 });
  });
});

// ============================================================
// TC-I5: escapeHTML from config neutralizes XSS in message text and name
// ============================================================

describe('TC-I5: escapeHTML from config wired — XSS payload neutralized in rendered message', () => {
  it('escapes < > & in message text before innerHTML insertion', () => {
    set_currentDebate({
      id: 'debate-1',
      role: 'a',
      opponentName: '<script>alert(1)</script>',
      messages: [],
    });

    addMessage('b', '<img src=x onerror=alert(1)>', 1, false);

    const container = document.getElementById('arena-messages')!;
    const html = container.innerHTML;
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ============================================================
// TC-I6: addSystemMessage creates system-classed element
// ============================================================

describe('TC-I6: addSystemMessage appends a .system.arena-msg element', () => {
  it('creates a system message with correct text', () => {
    addSystemMessage('Debate is starting in 3...');
    const msgs = document.querySelectorAll('.arena-msg.system');
    expect(msgs.length).toBe(1);
    expect(msgs[0].textContent).toBe('Debate is starting in 3...');
  });

  it('appends multiple system messages in order', () => {
    addSystemMessage('Round 1 begins');
    addSystemMessage('Round 2 begins');
    const msgs = document.querySelectorAll('.arena-msg.system');
    expect(msgs.length).toBe(2);
    expect(msgs[0].textContent).toBe('Round 1 begins');
    expect(msgs[1].textContent).toBe('Round 2 begins');
  });
});

// ============================================================
// TC-I7: Missing DOM element → graceful no-op (no crash)
// ============================================================

describe('TC-I7: addMessage/addSystemMessage are no-ops when #arena-messages is absent', () => {
  it('does not throw when #arena-messages does not exist', () => {
    document.body.innerHTML = '';
    set_currentDebate({ id: 'debate-1', role: 'a', opponentName: 'Bob', messages: [] });
    expect(() => addMessage('a', 'Test', 1, false)).not.toThrow();
    expect(() => addSystemMessage('System')).not.toThrow();
  });
});

// ============================================================
// ARCH — import boundaries have not changed
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — arena-room-live-messages.ts import boundaries', () => {
  it('imports only from auth, config, arena-state, and arena-types', () => {
    const allowed = new Set([
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
    ]);
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-room-live-messages.ts'),
      'utf-8'
    );
    const paths = source.split('\n')
      .filter(l => l.trimStart().startsWith('import '))
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter((p): p is string => Boolean(p));
    for (const path of paths) {
      expect(allowed, `Unexpected import in arena-room-live-messages.ts: ${path}`).toContain(path);
    }
  });
});
