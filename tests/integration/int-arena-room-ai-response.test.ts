// ============================================================
// INTEGRATOR — arena-room-ai-response.ts → arena-room-live-messages
// Seam #165 | score: 12
// Boundary: handleAIResponse calls addMessage (from arena-room-live-messages)
//           to render the AI reply into #arena-messages.
//           addMessage pushes onto currentDebate.messages and renders DOM.
// Mock boundary: @supabase/supabase-js only (functional tests).
//                Additional mocks for auth/config in handleAIResponse tests.
// All source modules run real unless noted.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// ARCH test — static import check, no module reset needed
// ---------------------------------------------------------------------------
describe('ARCH — seam #165', () => {
  it('arena-room-ai-response.ts imports addMessage from ./arena-room-live-messages', () => {
    const filePath = resolve(process.cwd(), 'src/arena/arena-room-ai-response.ts');
    const source = readFileSync(filePath, 'utf8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasImport = importLines.some(
      l => l.includes('addMessage') && l.includes('arena-room-live-messages')
    );
    expect(hasImport).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Shared mutable state — module-level so vi.mock factories can close over it
// ---------------------------------------------------------------------------
const state = {
  currentDebate: null as null | {
    id: string;
    role: string;
    round: number;
    totalRounds: number;
    topic: string;
    opponentName: string;
    messages: Array<{ role: string; text: string; round: number }>;
  },
  currentProfile: null as null | { display_name: string },
  isAnyPlaceholder: false,
};

// ---------------------------------------------------------------------------
// Hoist-safe vi.mock — @supabase/supabase-js
// ---------------------------------------------------------------------------
const mockRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockGetSession = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-jwt' } }, error: null })
);

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    auth: {
      onAuthStateChange: vi.fn((cb: (event: string, session: null) => void) => {
        cb('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      getSession: mockGetSession,
    },
  })),
}));

// ---------------------------------------------------------------------------
// Mock auth — provide safeRpc + getSupabaseClient + getCurrentProfile
// ---------------------------------------------------------------------------
const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockGetAccessToken = vi.hoisted(() => vi.fn().mockReturnValue('fallback-jwt'));

vi.mock('../../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getSupabaseClient: vi.fn(() => ({
    auth: { getSession: mockGetSession },
  })),
  getAccessToken: mockGetAccessToken,
  getCurrentProfile: vi.fn(() => state.currentProfile),
}));

// ---------------------------------------------------------------------------
// Mock config — FEATURES.aiSparring=true, SUPABASE_URL set
// ---------------------------------------------------------------------------
vi.mock('../../src/config.ts', () => ({
  get isAnyPlaceholder() { return state.isAnyPlaceholder; },
  SUPABASE_URL: 'https://example.supabase.co',
  FEATURES: { aiSparring: true },
  ModeratorConfig: { escapeHTML: (s: string) => s },
  escapeHTML: (s: string) => s,
}));

// ---------------------------------------------------------------------------
// Mock arena-state — live reference to state.currentDebate
// ---------------------------------------------------------------------------
vi.mock('../../src/arena/arena-state.ts', () => ({
  get currentDebate() { return state.currentDebate; },
}));

// ---------------------------------------------------------------------------
// Mock arena-room-live-poll — advanceRound not under test here
// ---------------------------------------------------------------------------
const mockAdvanceRound = vi.hoisted(() => vi.fn());
vi.mock('../../src/arena/arena-room-live-poll.ts', () => ({
  advanceRound: mockAdvanceRound,
}));

// ---------------------------------------------------------------------------
// Module handles
// ---------------------------------------------------------------------------
let addMessage: (side: string, text: string, round: number, isAI: boolean) => void;
let handleAIResponse: (debate: unknown, userText: string) => Promise<void>;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockSafeRpc.mockReset();
  mockSafeRpc.mockResolvedValue({ data: null, error: null });
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-jwt' } }, error: null });
  mockAdvanceRound.mockReset();

  state.currentDebate = null;
  state.currentProfile = null;
  state.isAnyPlaceholder = false;

  document.body.innerHTML = '';

  // jsdom does not implement Element.prototype.scrollTo — stub it globally
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = vi.fn();
  } else {
    vi.spyOn(Element.prototype, 'scrollTo').mockImplementation(() => undefined);
  }

  const msgMod = await import('../../src/arena/arena-room-live-messages.ts');
  addMessage = msgMod.addMessage as typeof addMessage;

  const aiMod = await import('../../src/arena/arena-room-ai-response.ts');
  handleAIResponse = aiMod.handleAIResponse as typeof handleAIResponse;
});

// ---------------------------------------------------------------------------
// TC-165-02 — addMessage renders AI message into #arena-messages
// ---------------------------------------------------------------------------
describe('TC-165-02 — addMessage renders AI message into #arena-messages', () => {
  it('appends a .arena-msg div containing the text', async () => {
    document.body.innerHTML = '<div id="arena-messages"></div>';
    state.currentDebate = {
      id: 'debate-1',
      role: 'a',
      round: 1,
      totalRounds: 3,
      topic: 'Topic',
      opponentName: 'Opp',
      messages: [],
    };

    addMessage('b', 'AI rebuttal text', 1, true);

    const messages = document.getElementById('arena-messages')!;
    const msgs = messages.querySelectorAll('.arena-msg');
    expect(msgs.length).toBe(1);
    expect(msgs[0].textContent).toContain('AI rebuttal text');
  });
});

// ---------------------------------------------------------------------------
// TC-165-03 — addMessage sets AI label to robot emoji + "AI" for isAI=true
// ---------------------------------------------------------------------------
describe('TC-165-03 — addMessage uses AI label when isAI=true', () => {
  it('.msg-label contains the robot emoji AI label', async () => {
    document.body.innerHTML = '<div id="arena-messages"></div>';
    state.currentDebate = {
      id: 'debate-1',
      role: 'a',
      round: 1,
      totalRounds: 3,
      topic: 'Topic',
      opponentName: 'Opp',
      messages: [],
    };

    addMessage('b', 'Some response', 2, true);

    const label = document.querySelector('.msg-label');
    expect(label).not.toBeNull();
    // The AI label uses the robot emoji 🤖 + " AI"
    expect(label!.textContent).toContain('AI');
    expect(label!.textContent).toContain('🤖');
  });
});

// ---------------------------------------------------------------------------
// TC-165-04 — addMessage pushes to currentDebate.messages
// ---------------------------------------------------------------------------
describe('TC-165-04 — addMessage pushes onto currentDebate.messages', () => {
  it('appends correct message object when side !== debate.role (assistant)', async () => {
    document.body.innerHTML = '<div id="arena-messages"></div>';
    const messages: Array<{ role: string; text: string; round: number }> = [];
    state.currentDebate = {
      id: 'debate-1',
      role: 'a',
      round: 2,
      totalRounds: 3,
      topic: 'Topic',
      opponentName: 'Opp',
      messages,
    };

    addMessage('b', 'AI says this', 2, true);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({ role: 'assistant', text: 'AI says this', round: 2 });
  });

  it('appends user role when side === debate.role', async () => {
    document.body.innerHTML = '<div id="arena-messages"></div>';
    const messages: Array<{ role: string; text: string; round: number }> = [];
    state.currentDebate = {
      id: 'debate-1',
      role: 'a',
      round: 1,
      totalRounds: 3,
      topic: 'Topic',
      opponentName: 'Opp',
      messages,
    };

    addMessage('a', 'User says this', 1, false);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({ role: 'user', text: 'User says this', round: 1 });
  });
});

// ---------------------------------------------------------------------------
// TC-165-05 — handleAIResponse calls submit_debate_message RPC with correct params
// ---------------------------------------------------------------------------
describe('TC-165-05 — handleAIResponse calls submit_debate_message when not placeholder', () => {
  it('calls safeRpc submit_debate_message with p_side:b and p_is_ai:true', async () => {
    document.body.innerHTML = `
      <div id="arena-messages"></div>
      <textarea id="arena-text-input"></textarea>
      <button id="arena-send-btn"></button>
    `;
    state.currentDebate = {
      id: 'real-debate-uuid',
      role: 'a',
      round: 1,
      totalRounds: 3,
      topic: 'Should AI be regulated?',
      opponentName: 'AI Opponent',
      messages: [],
    };
    state.isAnyPlaceholder = false;

    // Stub fetch to return a successful AI response
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'AI says: regulate it!' }),
    } as Response);

    const promise = handleAIResponse(state.currentDebate, 'Yes it should');
    await vi.runAllTimersAsync();
    await promise;

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'submit_debate_message',
      expect.objectContaining({
        p_debate_id: 'real-debate-uuid',
        p_round: 1,
        p_side: 'b',
        p_is_ai: true,
      })
    );

    fetchSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// TC-165-06 — handleAIResponse skips RPC when debate.id starts with 'ai-local-'
// ---------------------------------------------------------------------------
describe('TC-165-06 — handleAIResponse skips RPC for ai-local- debates', () => {
  it('does not call safeRpc when debate.id starts with ai-local-', async () => {
    document.body.innerHTML = `
      <div id="arena-messages"></div>
      <textarea id="arena-text-input"></textarea>
      <button id="arena-send-btn"></button>
    `;
    state.currentDebate = {
      id: 'ai-local-session-abc',
      role: 'a',
      round: 2,
      totalRounds: 3,
      topic: 'Is remote work better?',
      opponentName: 'AI Opponent',
      messages: [],
    };
    state.isAnyPlaceholder = false;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'My counter-argument.' }),
    } as Response);

    const promise = handleAIResponse(state.currentDebate, 'Yes, productivity gains');
    await vi.runAllTimersAsync();
    await promise;

    expect(mockSafeRpc).not.toHaveBeenCalledWith(
      'submit_debate_message',
      expect.anything()
    );

    fetchSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// TC-165-07 — handleAIResponse re-enables input and send button after completion
// ---------------------------------------------------------------------------
describe('TC-165-07 — handleAIResponse re-enables form controls in finally block', () => {
  it('input and send button are enabled after successful AI response', async () => {
    document.body.innerHTML = `
      <div id="arena-messages"></div>
      <textarea id="arena-text-input"></textarea>
      <button id="arena-send-btn"></button>
    `;
    const input = document.getElementById('arena-text-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('arena-send-btn') as HTMLButtonElement;

    state.currentDebate = {
      id: 'ai-local-test',
      role: 'a',
      round: 1,
      totalRounds: 3,
      topic: 'Test topic',
      opponentName: 'AI',
      messages: [],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'Test AI response.' }),
    } as Response);

    const promise = handleAIResponse(state.currentDebate, 'User argument');
    await vi.runAllTimersAsync();
    await promise;

    expect(input.disabled).toBe(false);
    expect(sendBtn.disabled).toBe(false);

    fetchSpy.mockRestore();
  });

  it('input and send button are re-enabled even when fetch fails', async () => {
    document.body.innerHTML = `
      <div id="arena-messages"></div>
      <textarea id="arena-text-input"></textarea>
      <button id="arena-send-btn"></button>
    `;
    const input = document.getElementById('arena-text-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('arena-send-btn') as HTMLButtonElement;

    state.currentDebate = {
      id: 'ai-local-fail',
      role: 'a',
      round: 1,
      totalRounds: 3,
      topic: 'Test fallback',
      opponentName: 'AI',
      messages: [],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const promise = handleAIResponse(state.currentDebate, 'User arg');
    // Advance past the 1.2-3s fallback delay inside generateAIDebateResponse
    await vi.advanceTimersByTimeAsync(4000);
    await promise;

    expect(input.disabled).toBe(false);
    expect(sendBtn.disabled).toBe(false);

    fetchSpy.mockRestore();
  });
});

// ============================================================
// INTEGRATOR — arena-room-ai-response.ts → arena-room-live-poll
// Seam #181 | score: 11
// Boundary: handleAIResponse calls advanceRound (from arena-room-live-poll)
//           after AI reply is added to the message thread.
//           advanceRound increments debate.round, updates #arena-round-label,
//           fires close_debate_round RPC for human debates, and triggers
//           endCurrentDebate when final round is reached.
// Mock boundary: @supabase/supabase-js only.
// Real modules: arena-room-live-poll (advanceRound under test).
// ============================================================

// ---------------------------------------------------------------------------
// Seam #181 state — isolated from seam #165 state above
// ---------------------------------------------------------------------------
const state181 = {
  currentDebate: null as null | {
    id: string;
    role: string;
    mode: string;
    round: number;
    totalRounds: number;
    topic: string;
    opponentName: string;
    messages: Array<{ role: string; text: string; round: number }>;
  },
};

// ---------------------------------------------------------------------------
// Hoist-safe mocks for seam #181
// ---------------------------------------------------------------------------
const mockSafeRpc181 = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockEndCurrentDebate181 = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockGetSession181 = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { session: { access_token: 'jwt-181' } }, error: null })
);

// ---------------------------------------------------------------------------
// Seam #181 describe block
// ---------------------------------------------------------------------------
describe('Seam #181 — arena-room-ai-response → arena-room-live-poll', () => {
  // -------------------------------------------------------------------------
  // TC-181-01 — ARCH: advanceRound is imported from ./arena-room-live-poll
  // -------------------------------------------------------------------------
  it('TC-181-01: arena-room-ai-response.ts imports advanceRound from ./arena-room-live-poll', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const filePath = resolve(process.cwd(), 'src/arena/arena-room-ai-response.ts');
    const source = readFileSync(filePath, 'utf8');
    const importLines = source.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = importLines.some(
      (l: string) => l.includes('advanceRound') && l.includes('arena-room-live-poll')
    );
    expect(hasImport).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Functional TCs — use vi.resetModules() + dynamic re-import
  // -------------------------------------------------------------------------
  describe('TC-181-02 through TC-181-05 — functional', () => {
    let handleAIResponse181: (debate: unknown, userText: string) => Promise<void>;
    let advanceRoundReal: () => void;

    beforeEach(async () => {
      vi.resetModules();
      // Explicitly un-mock arena-room-live-poll so the real module loads
      // (the outer vi.mock for this module mocks advanceRound away — we need the real one)
      vi.doUnmock('../../src/arena/arena-room-live-poll.ts');
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      mockSafeRpc181.mockReset();
      mockSafeRpc181.mockResolvedValue({ data: null, error: null });
      mockEndCurrentDebate181.mockReset();
      mockGetSession181.mockReset();
      mockGetSession181.mockResolvedValue({ data: { session: { access_token: 'jwt-181' } }, error: null });

      state181.currentDebate = null;

      document.body.innerHTML = '';

      if (!Element.prototype.scrollTo) {
        Element.prototype.scrollTo = vi.fn();
      } else {
        vi.spyOn(Element.prototype, 'scrollTo').mockImplementation(() => undefined);
      }

      // Mock @supabase/supabase-js
      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => ({
          rpc: mockSafeRpc181,
          auth: {
            onAuthStateChange: vi.fn((cb: (event: string, session: null) => void) => {
              cb('INITIAL_SESSION', null);
              return { data: { subscription: { unsubscribe: vi.fn() } } };
            }),
            getSession: mockGetSession181,
          },
        })),
      }));

      // Mock auth
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc181,
        getSupabaseClient: vi.fn(() => ({
          auth: { getSession: mockGetSession181 },
        })),
        getAccessToken: vi.fn().mockReturnValue('jwt-181'),
        getCurrentProfile: vi.fn(() => null),
      }));

      // Mock config
      vi.doMock('../../src/config.ts', () => ({
        isAnyPlaceholder: false,
        SUPABASE_URL: 'https://example.supabase.co',
        FEATURES: { aiSparring: true },
        DEBATE: { defaultRounds: 3 },
        ModeratorConfig: { escapeHTML: (s: string) => s },
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));

      // Mock arena-state — live reference to state181.currentDebate
      vi.doMock('../../src/arena/arena-state.ts', () => {
        let _roundTimer: ReturnType<typeof setInterval> | null = null;
        let _roundTimeLeft = 0;
        let _opponentPollTimer: ReturnType<typeof setInterval> | null = null;
        let _opponentPollElapsed = 0;
        return {
          get currentDebate() { return state181.currentDebate; },
          get roundTimer() { return _roundTimer; },
          get roundTimeLeft() { return _roundTimeLeft; },
          get opponentPollTimer() { return _opponentPollTimer; },
          get opponentPollElapsed() { return _opponentPollElapsed; },
          set_currentDebate: vi.fn((v: unknown) => { state181.currentDebate = v as typeof state181.currentDebate; }),
          set_roundTimer: vi.fn((v: ReturnType<typeof setInterval> | null) => { _roundTimer = v; }),
          set_roundTimeLeft: vi.fn((v: number) => { _roundTimeLeft = v; }),
          set_opponentPollTimer: vi.fn((v: ReturnType<typeof setInterval> | null) => { _opponentPollTimer = v; }),
          set_opponentPollElapsed: vi.fn((v: number) => { _opponentPollElapsed = v; }),
        };
      });

      // Mock arena-room-end — has webrtc dep, must not load
      vi.doMock('../../src/arena/arena-room-end.ts', () => ({
        endCurrentDebate: mockEndCurrentDebate181,
      }));

      // Mock nudge
      vi.doMock('../../src/nudge.ts', () => ({
        nudge: vi.fn(),
      }));

      // Mock arena-core.utils — isPlaceholder returns false by default
      vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
        isPlaceholder: vi.fn(() => false),
        formatTimer: vi.fn((n: number) => String(n)),
        randomFrom: vi.fn((arr: string[]) => arr[0]),
        pushArenaState: vi.fn(),
      }));

      // Mock arena-constants
      vi.doMock('../../src/arena/arena-constants.ts', () => ({
        OPPONENT_POLL_MS: 3000,
        OPPONENT_POLL_TIMEOUT_SEC: 30,
        ROUND_DURATION: 90,
        AI_RESPONSES: {
          opening: ['Opening statement.'],
          rebuttal: ['Rebuttal response.'],
          closing: ['Closing argument.'],
        },
      }));

      // Mock arena-room-live-messages
      vi.doMock('../../src/arena/arena-room-live-messages.ts', () => ({
        addMessage: vi.fn(),
        addSystemMessage: vi.fn(),
      }));

      // Mock contracts/rpc-schemas
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        get_debate_messages: { parse: vi.fn((v: unknown) => v) },
      }));

      // Dynamically import real modules after mocks are set
      const pollMod = await import('../../src/arena/arena-room-live-poll.ts');
      advanceRoundReal = pollMod.advanceRound;

      const aiMod = await import('../../src/arena/arena-room-ai-response.ts');
      handleAIResponse181 = aiMod.handleAIResponse as typeof handleAIResponse181;
    });

    // -----------------------------------------------------------------------
    // TC-181-02 — handleAIResponse calls advanceRound, incrementing round
    // -----------------------------------------------------------------------
    it('TC-181-02: handleAIResponse increments debate.round via advanceRound', async () => {
      document.body.innerHTML = `
        <div id="arena-messages"></div>
        <textarea id="arena-text-input"></textarea>
        <button id="arena-send-btn"></button>
        <span id="arena-round-label"></span>
      `;
      state181.currentDebate = {
        id: 'ai-local-181',
        role: 'a',
        mode: 'ai',
        round: 1,
        totalRounds: 3,
        topic: 'Is remote work productive?',
        opponentName: 'AI',
        messages: [],
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'AI counter.' }),
      } as Response);

      const promise = handleAIResponse181(state181.currentDebate, 'Yes it is');
      await vi.runAllTimersAsync();
      await promise;

      // advanceRound increments round on the debate object
      expect(state181.currentDebate!.round).toBe(2);

      fetchSpy.mockRestore();
    });

    // -----------------------------------------------------------------------
    // TC-181-03 — advanceRound calls close_debate_round RPC for human debates
    // -----------------------------------------------------------------------
    it('TC-181-03: advanceRound calls safeRpc close_debate_round for non-ai non-placeholder debates', () => {
      document.body.innerHTML = `
        <div id="arena-messages"></div>
        <span id="arena-round-label"></span>
      `;
      state181.currentDebate = {
        id: 'human-debate-uuid',
        role: 'a',
        mode: 'text',
        round: 1,
        totalRounds: 3,
        topic: 'Climate policy',
        opponentName: 'Bob',
        messages: [],
      };

      advanceRoundReal();

      expect(mockSafeRpc181).toHaveBeenCalledWith(
        'close_debate_round',
        expect.objectContaining({
          p_debate_id: 'human-debate-uuid',
          p_round: 1,
        })
      );
    });

    // -----------------------------------------------------------------------
    // TC-181-04 — advanceRound updates #arena-round-label DOM element
    // -----------------------------------------------------------------------
    it('TC-181-04: advanceRound sets #arena-round-label to new round number', () => {
      document.body.innerHTML = `
        <div id="arena-messages"></div>
        <span id="arena-round-label">ROUND 1/3</span>
      `;
      state181.currentDebate = {
        id: 'ai-local-dom-test',
        role: 'a',
        mode: 'ai',
        round: 1,
        totalRounds: 3,
        topic: 'Test topic',
        opponentName: 'AI',
        messages: [],
      };

      advanceRoundReal();

      const label = document.getElementById('arena-round-label');
      expect(label).not.toBeNull();
      expect(label!.textContent).toBe('ROUND 2/3');
    });

    // -----------------------------------------------------------------------
    // TC-181-05 — advanceRound triggers endCurrentDebate when final round done
    // -----------------------------------------------------------------------
    it('TC-181-05: advanceRound fires endCurrentDebate via setTimeout when round >= totalRounds', async () => {
      document.body.innerHTML = `
        <div id="arena-messages"></div>
        <span id="arena-round-label"></span>
      `;
      state181.currentDebate = {
        id: 'ai-local-final',
        role: 'a',
        mode: 'ai',
        round: 3,
        totalRounds: 3,
        topic: 'Final round',
        opponentName: 'AI',
        messages: [],
      };

      advanceRoundReal();

      // endCurrentDebate is called inside setTimeout(1500)
      expect(mockEndCurrentDebate181).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1600);
      expect(mockEndCurrentDebate181).toHaveBeenCalledTimes(1);
    });
  });
});

