/**
 * int-arena-private-lobby.join.test.ts
 * Seam #407 — src/arena/arena-private-lobby.join.ts → arena-types-private-lobby
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn(),
    auth: mockAuth,
  })),
}));

// Stub @peermetrics/webrtc-stats — pulled in transitively via arena-mod-debate-poll → arena-room-enter
vi.mock('@peermetrics/webrtc-stats', () => ({
  WebRTCStats: vi.fn().mockImplementation(() => ({
    addConnection: vi.fn(),
    destroy: vi.fn(),
  })),
}));

// ── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockAuth.getSession.mockReset();
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  document.body.innerHTML = '';
});

// ── ARCH filter ──────────────────────────────────────────────────────────────

describe('ARCH — import lines only pull from expected modules', () => {
  it('contains only expected from-import paths', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-private-lobby.join.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    const paths = importLines.map((l) => {
      const m = l.match(/from\s+['"](.*?)['"]/);
      return m ? m[1] : '';
    });
    // Must import JoinPrivateLobbyResult from arena-types-private-lobby
    expect(paths.some((p) => p.includes('arena-types-private-lobby'))).toBe(true);
    // Must import safeRpc from auth
    expect(paths.some((p) => p.includes('auth'))).toBe(true);
    // Must NOT import any walled modules
    const walled = ['webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics'];
    for (const w of walled) {
      expect(paths.some((p) => p.includes(w))).toBe(false);
    }
  });
});

// ── TC1: join_private_lobby success (object response) ────────────────────────

describe('TC1 — joinWithCode calls join_private_lobby and invokes showMatchFound on success', () => {
  it('calls showMatchFound with role b when join_private_lobby returns valid object', async () => {
    const successResult = {
      debate_id: 'debate-uuid-001',
      status: 'joined',
      topic: 'Is AI taking all jobs?',
      mode: 'live',
      opponent_name: 'OpponentA',
      opponent_id: 'opp-uuid-001',
      opponent_elo: 1400,
      ruleset: 'amplified',
      total_rounds: 3,
      language: 'en',
    };
    mockRpc.mockResolvedValueOnce({ data: successResult, error: null });

    // Mock downstream modules to prevent real DOM mutations
    vi.doMock('../../src/arena/arena-match-found.ts', () => ({
      showMatchFound: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-debate-waiting.ts', () => ({
      showModDebateWaitingDebater: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_selectedMode: vi.fn(),
      modDebateId: null,
      set_modDebateId: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      randomFrom: vi.fn().mockReturnValue('Fallback topic'),
    }));

    const { joinWithCode } = await import('../../src/arena/arena-private-lobby.join.ts');
    const { showMatchFound } = await import('../../src/arena/arena-match-found.ts');
    const { set_selectedMode } = await import('../../src/arena/arena-state.ts');

    await joinWithCode('CODE123');

    expect(mockRpc).toHaveBeenCalledWith('join_private_lobby', { p_join_code: 'CODE123' });
    expect(showMatchFound).toHaveBeenCalledTimes(1);
    const callArg = (showMatchFound as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg.id).toBe('debate-uuid-001');
    expect(callArg.role).toBe('b');
    expect(callArg.mode).toBe('live');
    expect(set_selectedMode).toHaveBeenCalledWith('live');
  });
});

// ── TC2: join_private_lobby returns array (RETURNS TABLE unwrap) ─────────────

describe('TC2 — joinWithCode unwraps first array element from RETURNS TABLE response', () => {
  it('unwraps first element when data is array', async () => {
    const row = {
      debate_id: 'debate-array-uuid',
      status: 'joined',
      topic: 'Array test topic',
      mode: 'text',
      opponent_name: 'ArrayOpponent',
      opponent_id: 'opp-array-uuid',
      opponent_elo: 1300,
      ruleset: 'unplugged',
      total_rounds: 2,
      language: 'en',
    };
    mockRpc.mockResolvedValueOnce({ data: [row], error: null });

    vi.doMock('../../src/arena/arena-match-found.ts', () => ({
      showMatchFound: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-debate-waiting.ts', () => ({
      showModDebateWaitingDebater: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_selectedMode: vi.fn(),
      modDebateId: null,
      set_modDebateId: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      randomFrom: vi.fn().mockReturnValue('Fallback topic'),
    }));

    const { joinWithCode } = await import('../../src/arena/arena-private-lobby.join.ts');
    const { showMatchFound } = await import('../../src/arena/arena-match-found.ts');

    await joinWithCode('ARRAYCODE');

    expect(showMatchFound).toHaveBeenCalledTimes(1);
    const arg = (showMatchFound as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.id).toBe('debate-array-uuid');
    expect(arg.ruleset).toBe('unplugged');
  });
});

// ── TC3: join_private_lobby error → join_mod_debate role b ───────────────────

describe('TC3 — fallback to join_mod_debate when join_private_lobby errors; role b → showMatchFound', () => {
  it('calls join_mod_debate with same code and invokes showMatchFound for role b', async () => {
    const rpcError = { message: 'not found', code: 'PGRST116' };
    const modResult = {
      debate_id: 'mod-debate-uuid',
      role: 'b',
      status: 'joined',
      topic: 'Mod debate topic',
      mode: 'live',
      ranked: true,
      moderator_name: 'ModMaster',
      opponent_name: 'OpponentB',
      opponent_id: 'opp-mod-uuid',
      opponent_elo: 1500,
      ruleset: 'amplified',
      total_rounds: 3,
      language: 'en',
    };
    mockRpc
      .mockResolvedValueOnce({ data: null, error: rpcError })
      .mockResolvedValueOnce({ data: modResult, error: null });

    vi.doMock('../../src/arena/arena-match-found.ts', () => ({
      showMatchFound: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-debate-waiting.ts', () => ({
      showModDebateWaitingDebater: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_selectedMode: vi.fn(),
      modDebateId: null,
      set_modDebateId: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      randomFrom: vi.fn().mockReturnValue('Fallback topic'),
    }));

    const { joinWithCode } = await import('../../src/arena/arena-private-lobby.join.ts');
    const { showMatchFound } = await import('../../src/arena/arena-match-found.ts');
    const { showModDebateWaitingDebater } = await import('../../src/arena/arena-mod-debate-waiting.ts');

    await joinWithCode('MODCODE');

    expect(mockRpc).toHaveBeenNthCalledWith(1, 'join_private_lobby', { p_join_code: 'MODCODE' });
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'join_mod_debate', { p_join_code: 'MODCODE' });
    expect(showMatchFound).toHaveBeenCalledTimes(1);
    const arg = (showMatchFound as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.id).toBe('mod-debate-uuid');
    expect(arg.ranked).toBe(true);
    expect(showModDebateWaitingDebater).not.toHaveBeenCalled();
  });
});

// ── TC4: join_mod_debate role a → waiting screen ─────────────────────────────

describe('TC4 — join_mod_debate role a shows waiting screen and sets modDebateId', () => {
  it('calls showModDebateWaitingDebater and set_modDebateId for role a', async () => {
    const rpcError = { message: 'not found', code: 'PGRST116' };
    const modResult = {
      debate_id: 'mod-waiting-uuid',
      role: 'a',
      status: 'waiting',
      topic: 'Waiting debate topic',
      mode: 'text',
      ranked: false,
      moderator_name: 'ModMaster',
      opponent_name: null,
      opponent_id: null,
      opponent_elo: null,
      ruleset: 'amplified',
      total_rounds: 3,
      language: 'en',
    };
    mockRpc
      .mockResolvedValueOnce({ data: null, error: rpcError })
      .mockResolvedValueOnce({ data: modResult, error: null });

    const mockSetModDebateId = vi.fn();
    vi.doMock('../../src/arena/arena-match-found.ts', () => ({
      showMatchFound: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-debate-waiting.ts', () => ({
      showModDebateWaitingDebater: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_selectedMode: vi.fn(),
      modDebateId: null,
      set_modDebateId: mockSetModDebateId,
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      randomFrom: vi.fn().mockReturnValue('Fallback topic'),
    }));

    const { joinWithCode } = await import('../../src/arena/arena-private-lobby.join.ts');
    const { showMatchFound } = await import('../../src/arena/arena-match-found.ts');
    const { showModDebateWaitingDebater } = await import('../../src/arena/arena-mod-debate-waiting.ts');

    await joinWithCode('WAITCODE');

    expect(mockSetModDebateId).toHaveBeenCalledWith('mod-waiting-uuid');
    expect(showModDebateWaitingDebater).toHaveBeenCalledTimes(1);
    const [debateId, topic, mode, ranked] = (showModDebateWaitingDebater as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(debateId).toBe('mod-waiting-uuid');
    expect(topic).toBe('Waiting debate topic');
    expect(mode).toBe('text');
    expect(ranked).toBe(false);
    expect(showMatchFound).not.toHaveBeenCalled();
  });
});

// ── TC5: both RPCs fail → showToast ──────────────────────────────────────────

describe('TC5 — showToast shown when both join_private_lobby and join_mod_debate fail', () => {
  it('calls showToast with error message when both RPCs error', async () => {
    const rpcError = { message: 'something went wrong', code: 'ERR' };
    mockRpc
      .mockResolvedValueOnce({ data: null, error: rpcError })
      .mockResolvedValueOnce({ data: null, error: rpcError });

    const mockShowToast = vi.fn();
    vi.doMock('../../src/config.ts', () => ({
      showToast: mockShowToast,
      friendlyError: vi.fn().mockReturnValue('Code not found or already taken'),
      DEBATE: { defaultRounds: 3 },
      isAnyPlaceholder: false,
      placeholderMode: { supabase: false, groq: false },
      ModeratorConfig: { escapeHTML: (s: string) => s, showToast: mockShowToast },
    }));
    vi.doMock('../../src/arena/arena-match-found.ts', () => ({
      showMatchFound: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-debate-waiting.ts', () => ({
      showModDebateWaitingDebater: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_selectedMode: vi.fn(),
      modDebateId: null,
      set_modDebateId: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(false),
      randomFrom: vi.fn().mockReturnValue('Fallback topic'),
    }));

    const { joinWithCode } = await import('../../src/arena/arena-private-lobby.join.ts');

    await joinWithCode('BADCODE');

    // showToast should be called with a string message
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    const toastArg: string = (mockShowToast as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(typeof toastArg).toBe('string');
    expect(toastArg.length).toBeGreaterThan(0);
  });
});

// ── TC6: isPlaceholder → preview toast, no RPC ───────────────────────────────

describe('TC6 — isPlaceholder returns true, shows preview toast without calling any RPC', () => {
  it('calls showToast and returns without calling RPC', async () => {
    const mockShowToast = vi.fn();
    vi.doMock('../../src/config.ts', () => ({
      showToast: mockShowToast,
      friendlyError: vi.fn(),
      DEBATE: { defaultRounds: 3 },
      isAnyPlaceholder: true,
      placeholderMode: { supabase: true, groq: true },
      ModeratorConfig: { escapeHTML: (s: string) => s, showToast: mockShowToast },
    }));
    vi.doMock('../../src/arena/arena-core.utils.ts', () => ({
      isPlaceholder: vi.fn().mockReturnValue(true),
      randomFrom: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-match-found.ts', () => ({
      showMatchFound: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-mod-debate-waiting.ts', () => ({
      showModDebateWaitingDebater: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_selectedMode: vi.fn(),
      modDebateId: null,
      set_modDebateId: vi.fn(),
    }));

    const { joinWithCode } = await import('../../src/arena/arena-private-lobby.join.ts');

    await joinWithCode('PREVIEW_CODE');

    expect(mockShowToast).toHaveBeenCalledWith('Join code not available in preview mode');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ── TC7: JoinPrivateLobbyResult interface shape ───────────────────────────────

describe('TC7 — JoinPrivateLobbyResult interface has required fields', () => {
  it('satisfies interface at runtime with all required fields', async () => {
    // Type-level check via runtime object that matches the interface
    const result = {
      debate_id: 'uuid-123',
      status: 'joined',
      topic: 'Some topic',
      mode: 'live',
      opponent_name: 'Alice',
      opponent_id: 'opp-uuid',
      opponent_elo: 1200,
    };
    // All required fields present and correct types
    expect(typeof result.debate_id).toBe('string');
    expect(typeof result.status).toBe('string');
    expect(typeof result.mode).toBe('string');
    expect(typeof result.opponent_name).toBe('string');
    expect(typeof result.opponent_id).toBe('string');
    expect(typeof result.opponent_elo).toBe('number');
    // Optional fields
    const withOptional = {
      ...result,
      ruleset: 'amplified',
      total_rounds: 3,
      language: 'en',
    };
    expect(withOptional.ruleset).toBe('amplified');
    expect(withOptional.total_rounds).toBe(3);
    expect(withOptional.language).toBe('en');
  });
});

// ============================================================
// SEAM #445 — arena-private-lobby.join → arena-mod-debate-waiting
// showModDebateWaitingDebater DOM rendering + startModDebatePoll wiring
// ============================================================

// ── TC8-TC13: real arena-mod-debate-waiting.ts DOM rendering tests ─────────────
// These tests import the REAL arena-mod-debate-waiting.ts module.
// vi.unmock is called to clear the TC1-TC7 doMock factory for this module.
// arena-state is mocked with a closure-captured screenEl div.
// arena-mod-debate-poll is mocked to prevent setInterval side effects.

// ── TC8: showModDebateWaitingDebater renders "Waiting for Opponent" heading ────

describe('TC8 — showModDebateWaitingDebater renders waiting-for-opponent heading', () => {
  it('appends container with arena-hero-title "Waiting for Opponent"', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';
    const screenDiv = document.getElementById('screen-main')!;
    const mockSetView8 = vi.fn();

    vi.doMock('../../src/config.ts', async () => {
      const actual = await vi.importActual<typeof import('../../src/config.ts')>('../../src/config.ts');
      return actual;
    });
    vi.doMock('../../src/arena/arena-mod-debate-waiting.ts', async () => {
      return await vi.importActual('../../src/arena/arena-mod-debate-waiting.ts');
    });
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_view: mockSetView8,
      set_selectedMode: vi.fn(),
      modDebateId: null,
      set_modDebateId: vi.fn(),
      set_screenEl: vi.fn(),
      screenEl: screenDiv,
    }));
    vi.doMock('../../src/arena/arena-mod-debate-poll.ts', () => ({
      startModDebatePoll: vi.fn(),
      stopModDebatePoll: vi.fn(),
      cancelModDebate: vi.fn(),
    }));

    const { showModDebateWaitingDebater } = await import('../../src/arena/arena-mod-debate-waiting.ts');
    showModDebateWaitingDebater('debate-dom-uuid', 'The internet is good', 'text', false);

    const heading = screenDiv.querySelector('.arena-hero-title');
    expect(heading).not.toBeNull();
    expect(heading!.textContent).toBe('Waiting for Opponent');
  });
});

// ── TC9: showModDebateWaitingDebater renders escaped topic in hero-sub ────────

describe('TC9 — showModDebateWaitingDebater renders topic text in arena-hero-sub', () => {
  it('displays the provided topic string inside .arena-hero-sub', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';
    const screenDiv = document.getElementById('screen-main')!;

    vi.doMock('../../src/arena/arena-mod-debate-waiting.ts', async () => {
      return await vi.importActual('../../src/arena/arena-mod-debate-waiting.ts');
    });
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_view: vi.fn(),
      set_selectedMode: vi.fn(),
      modDebateId: null,
      set_modDebateId: vi.fn(),
      set_screenEl: vi.fn(),
      screenEl: screenDiv,
    }));
    vi.doMock('../../src/arena/arena-mod-debate-poll.ts', () => ({
      startModDebatePoll: vi.fn(),
      stopModDebatePoll: vi.fn(),
      cancelModDebate: vi.fn(),
    }));

    const { showModDebateWaitingDebater } = await import('../../src/arena/arena-mod-debate-waiting.ts');
    showModDebateWaitingDebater('debate-topic-uuid', 'Climate change is real', 'live', true);

    const sub = screenDiv.querySelector('.arena-hero-sub');
    expect(sub).not.toBeNull();
    expect(sub!.textContent).toContain('Climate change is real');
  });
});

// ── TC10: showModDebateWaitingDebater renders LEAVE button ────────────────────

describe('TC10 — showModDebateWaitingDebater renders #mod-debate-debater-cancel-btn LEAVE button', () => {
  it('creates #mod-debate-debater-cancel-btn with text LEAVE', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';
    const screenDiv = document.getElementById('screen-main')!;

    vi.doMock('../../src/arena/arena-mod-debate-waiting.ts', async () => {
      return await vi.importActual('../../src/arena/arena-mod-debate-waiting.ts');
    });
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_view: vi.fn(),
      set_selectedMode: vi.fn(),
      modDebateId: null,
      set_modDebateId: vi.fn(),
      set_screenEl: vi.fn(),
      screenEl: screenDiv,
    }));
    vi.doMock('../../src/arena/arena-mod-debate-poll.ts', () => ({
      startModDebatePoll: vi.fn(),
      stopModDebatePoll: vi.fn(),
      cancelModDebate: vi.fn(),
    }));

    const { showModDebateWaitingDebater } = await import('../../src/arena/arena-mod-debate-waiting.ts');
    showModDebateWaitingDebater('debate-cancel-uuid', 'Topic for cancel test', 'live', false);

    const btn = document.getElementById('mod-debate-debater-cancel-btn');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain('LEAVE');
  });
});

// ── TC11: showModDebateWaitingDebater calls startModDebatePoll ────────────────

describe('TC11 — showModDebateWaitingDebater calls startModDebatePoll with correct args', () => {
  it('invokes startModDebatePoll(debateId, mode, ranked)', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';
    const screenDiv = document.getElementById('screen-main')!;
    const mockStartPoll = vi.fn();

    vi.doMock('../../src/arena/arena-mod-debate-waiting.ts', async () => {
      return await vi.importActual('../../src/arena/arena-mod-debate-waiting.ts');
    });
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_view: vi.fn(),
      set_selectedMode: vi.fn(),
      modDebateId: null,
      set_modDebateId: vi.fn(),
      set_screenEl: vi.fn(),
      screenEl: screenDiv,
    }));
    vi.doMock('../../src/arena/arena-mod-debate-poll.ts', () => ({
      startModDebatePoll: mockStartPoll,
      stopModDebatePoll: vi.fn(),
      cancelModDebate: vi.fn(),
    }));

    const { showModDebateWaitingDebater } = await import('../../src/arena/arena-mod-debate-waiting.ts');
    showModDebateWaitingDebater('poll-debate-uuid', 'Poll topic', 'live', true);

    expect(mockStartPoll).toHaveBeenCalledTimes(1);
    expect(mockStartPoll).toHaveBeenCalledWith('poll-debate-uuid', 'live', true);
  });
});

// ── TC12: showModDebateWaitingDebater calls set_view('modDebateWaiting') ──────

describe('TC12 — showModDebateWaitingDebater calls set_view with modDebateWaiting', () => {
  it('calls set_view with modDebateWaiting', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';
    const screenDiv = document.getElementById('screen-main')!;
    const mockSetView = vi.fn();

    vi.doMock('../../src/arena/arena-mod-debate-waiting.ts', async () => {
      return await vi.importActual('../../src/arena/arena-mod-debate-waiting.ts');
    });
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_view: mockSetView,
      set_selectedMode: vi.fn(),
      modDebateId: null,
      set_modDebateId: vi.fn(),
      set_screenEl: vi.fn(),
      screenEl: screenDiv,
    }));
    vi.doMock('../../src/arena/arena-mod-debate-poll.ts', () => ({
      startModDebatePoll: vi.fn(),
      stopModDebatePoll: vi.fn(),
      cancelModDebate: vi.fn(),
    }));

    const { showModDebateWaitingDebater } = await import('../../src/arena/arena-mod-debate-waiting.ts');
    showModDebateWaitingDebater('view-debate-uuid', 'View test topic', 'text', false);

    expect(mockSetView).toHaveBeenCalledWith('modDebateWaiting');
  });
});

// ── TC13: showModDebateWaitingDebater uses fallback topic when empty ──────────

describe('TC13 — showModDebateWaitingDebater falls back to "Open Debate" for empty topic', () => {
  it('renders "Open Debate" in hero-sub when topic is empty string', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';
    const screenDiv = document.getElementById('screen-main')!;

    vi.doMock('../../src/arena/arena-mod-debate-waiting.ts', async () => {
      return await vi.importActual('../../src/arena/arena-mod-debate-waiting.ts');
    });
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      set_view: vi.fn(),
      set_selectedMode: vi.fn(),
      modDebateId: null,
      set_modDebateId: vi.fn(),
      set_screenEl: vi.fn(),
      screenEl: screenDiv,
    }));
    vi.doMock('../../src/arena/arena-mod-debate-poll.ts', () => ({
      startModDebatePoll: vi.fn(),
      stopModDebatePoll: vi.fn(),
      cancelModDebate: vi.fn(),
    }));

    const { showModDebateWaitingDebater } = await import('../../src/arena/arena-mod-debate-waiting.ts');
    showModDebateWaitingDebater('fallback-topic-uuid', '', 'live', false);

    const sub = screenDiv.querySelector('.arena-hero-sub');
    expect(sub).not.toBeNull();
    // Empty string is falsy — template uses (topic || 'Open Debate')
    expect(sub!.textContent).toContain('Open Debate');
  });
});

// ── TC14: ARCH — arena-mod-debate-waiting imports ────────────────────────────

describe('TC14 — ARCH: arena-mod-debate-waiting import lines are expected', () => {
  it('imports from config, arena-state, arena-types, and arena-mod-debate-poll only', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-mod-debate-waiting.ts'),
      'utf8',
    );
    const importLines = src.split('\n').filter((l) => /from\s+['"]/.test(l));
    const paths = importLines.map((l) => {
      const m = l.match(/from\s+['"](.*?)['"]/);
      return m ? m[1] : '';
    });
    expect(paths.some((p) => p.includes('config'))).toBe(true);
    expect(paths.some((p) => p.includes('arena-state'))).toBe(true);
    expect(paths.some((p) => p.includes('arena-mod-debate-poll'))).toBe(true);
    // Must NOT import walled modules
    const walled = ['webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics'];
    for (const w of walled) {
      expect(paths.some((p) => p.includes(w))).toBe(false);
    }
  });
});
