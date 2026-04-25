// ============================================================
// ARENA ROOM LIVE MESSAGES — tests/arena-room-live-messages.test.ts
// Source: src/arena/arena-room-live-messages.ts
//
// CLASSIFICATION:
//   addMessage()       — DOM mutation + state read → Integration test
//   addSystemMessage() — DOM mutation → Integration test
//
// IMPORTS:
//   { getCurrentProfile } from '../auth.ts'
//   { escapeHTML }        from '../config.ts'
//   { currentDebate }     from './arena-state.ts'
//   type { DebateRole }   from './arena-types.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => null));
const mockEscapeHTML        = vi.hoisted(() => vi.fn((s: string) => s));

const stateVars = vi.hoisted(() => ({
  currentDebate: null as unknown,
}));

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return stateVars.currentDebate; },
  set_view: vi.fn(),
  set_currentDebate: vi.fn(),
}));

import { addMessage, addSystemMessage } from '../src/arena/arena-room-live-messages.ts';

beforeEach(() => {
  mockGetCurrentProfile.mockReset().mockReturnValue(null);
  mockEscapeHTML.mockImplementation((s: string) => s);
  stateVars.currentDebate = null;
  document.body.innerHTML = '<div id="arena-messages"></div>';
  // jsdom doesn't implement scrollTo on elements
  const el = document.getElementById('arena-messages');
  if (el) el.scrollTo = vi.fn();
});

// ── TC1: addMessage — no-op when #arena-messages missing ─────

describe('TC1 — addMessage: no-op when #arena-messages not in DOM', () => {
  it('does not throw when container is absent', () => {
    document.body.innerHTML = '';
    expect(() => addMessage('pro', 'Hello', 1, false)).not.toThrow();
  });
});

// ── TC2: addMessage — appends message element ─────────────────

describe('TC2 — addMessage: appends .arena-msg to #arena-messages', () => {
  it('creates a child element with class arena-msg', () => {
    addMessage('pro', 'Test message', 1, false);
    const container = document.getElementById('arena-messages')!;
    expect(container.querySelector('.arena-msg')).not.toBeNull();
  });
});

// ── TC3: addMessage — includes side class ────────────────────

describe('TC3 — addMessage: message element has side-{role} class', () => {
  it('adds side-pro class for pro side', () => {
    addMessage('pro', 'Pro argument', 1, false);
    const container = document.getElementById('arena-messages')!;
    expect(container.querySelector('.side-pro')).not.toBeNull();
  });
});

// ── TC4: addMessage — includes round number ───────────────────

describe('TC4 — addMessage: shows round number in message', () => {
  it('renders Round 3 in msg-round element', () => {
    addMessage('pro', 'Argument', 3, false);
    const container = document.getElementById('arena-messages')!;
    expect(container.innerHTML).toContain('Round 3');
  });
});

// ── TC5: addMessage — AI shows robot label ───────────────────

describe('TC5 — addMessage: AI message shows robot name', () => {
  it('renders 🤖 AI label when isAI=true', () => {
    addMessage('pro', 'AI says...', 1, true);
    const container = document.getElementById('arena-messages')!;
    expect(container.innerHTML).toContain('🤖 AI');
  });
});

// ── TC6: addMessage — escapes text ───────────────────────────

describe('TC6 — addMessage: calls escapeHTML on message text', () => {
  it('passes message text through escapeHTML', () => {
    addMessage('con', '<script>xss</script>', 1, false);
    const calls = mockEscapeHTML.mock.calls.map(([s]) => s);
    expect(calls).toContain('<script>xss</script>');
  });
});

// ── TC7: addMessage — pushes to debate.messages when present ─

describe('TC7 — addMessage: pushes message to debate.messages array', () => {
  it('appends to messages array when currentDebate.messages exists', () => {
    const messages: unknown[] = [];
    stateVars.currentDebate = { role: 'pro', messages, opponentName: 'Bob', mode: 'live' };
    addMessage('pro', 'Hello', 1, false);
    expect(messages.length).toBe(1);
  });
});

// ── TC8: addSystemMessage — no-op when container missing ─────

describe('TC8 — addSystemMessage: no-op when #arena-messages absent', () => {
  it('does not throw when container is absent', () => {
    document.body.innerHTML = '';
    expect(() => addSystemMessage('System event')).not.toThrow();
  });
});

// ── TC9: addSystemMessage — appends system message ───────────

describe('TC9 — addSystemMessage: appends .system element', () => {
  it('creates element with class arena-msg system', () => {
    addSystemMessage('Round started');
    const container = document.getElementById('arena-messages')!;
    expect(container.querySelector('.arena-msg.system')).not.toBeNull();
    expect(container.textContent).toContain('Round started');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-room-live-messages.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../config.ts', './arena-state.ts', './arena-types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-live-messages.ts'),
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
