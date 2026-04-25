// ============================================================
// INTEGRATOR — arena-private-lobby.join → arena-types-moderator
// Seam #266 | score: 8
// Boundary: joinWithCode calls join_private_lobby first; on RPC error falls
//           through to join_mod_debate. The ModDebateJoinResult type from
//           arena-types-moderator shapes the join_mod_debate response.
//           role='b' → showMatchFound; role='a' → showModDebateWaitingDebater
//           + set_modDebateId. set_selectedMode always updated from modResult.mode.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let joinWithCode: (code: string) => Promise<void>;
let get_selectedMode: () => string;
let get_modDebateId: () => string | null;
let set_screenEl: (v: HTMLElement | null) => void;

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

  mockRpc.mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  document.body.innerHTML = '<div id="screen-main"></div>';

  const joinMod = await import('../../src/arena/arena-private-lobby.join.ts');
  joinWithCode = joinMod.joinWithCode;

  const stateMod = await import('../../src/arena/arena-state.ts');
  set_screenEl = stateMod.set_screenEl;
  get_selectedMode = () => stateMod.selectedMode as string;
  get_modDebateId = () => stateMod.modDebateId;

  set_screenEl(document.getElementById('screen-main'));
});

// ============================================================
// TC1 — join_mod_debate called with p_join_code when join_private_lobby fails
// ============================================================

describe('TC1 — join_mod_debate RPC called with correct p_join_code after join_private_lobby error', () => {
  it('passes the join code to join_mod_debate when join_private_lobby returns an error', async () => {
    // First RPC (join_private_lobby) fails
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Lobby not found', code: '404' } });
    // Second RPC (join_mod_debate) succeeds with role='b'
    mockRpc.mockResolvedValueOnce({
      data: {
        debate_id: 'debate-mod-001',
        role: 'b',
        status: 'ready',
        topic: 'Is remote work better?',
        mode: 'text',
        ranked: false,
        moderator_name: 'ModBot',
        opponent_name: 'Alice',
        opponent_id: 'user-alice',
        opponent_elo: 1300,
        ruleset: 'amplified',
        total_rounds: 3,
        language: 'en',
      },
      error: null,
    });

    await joinWithCode('CODE42').catch(() => {});

    const modJoinCall = mockRpc.mock.calls.find(c => c[0] === 'join_mod_debate');
    expect(modJoinCall).toBeTruthy();
    expect((modJoinCall![1] as Record<string, unknown>).p_join_code).toBe('CODE42');
  });
});

// ============================================================
// TC2 — ModDebateJoinResult role='b' triggers showMatchFound (DOM match found)
// ============================================================

describe('TC2 — role=b causes match-found screen to render', () => {
  it('renders arena-match or equivalent match-found container when role is b', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Not found', code: '404' } });
    mockRpc.mockResolvedValueOnce({
      data: {
        debate_id: 'debate-roleb',
        role: 'b',
        status: 'ready',
        topic: 'Hot take about AI',
        mode: 'text',
        ranked: true,
        moderator_name: 'Mod',
        opponent_name: 'Bob',
        opponent_id: 'user-bob',
        opponent_elo: 1250,
        ruleset: 'amplified',
        total_rounds: 3,
        language: 'en',
      },
      error: null,
    });

    await joinWithCode('ROLEB1').catch(() => {});

    // showMatchFound renders into screenEl — verify something was rendered
    const screen = document.getElementById('screen-main');
    expect(screen).toBeTruthy();
    expect(screen!.innerHTML.length).toBeGreaterThan(0);
  });
});

// ============================================================
// TC3 — ModDebateJoinResult role='a' triggers showModDebateWaitingDebater DOM
// ============================================================

describe('TC3 — role=a renders waiting-for-opponent screen', () => {
  it('shows Waiting for Opponent heading when role is a', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Not found', code: '404' } });
    mockRpc.mockResolvedValueOnce({
      data: {
        debate_id: 'debate-rolea',
        role: 'a',
        status: 'waiting',
        topic: 'Should pineapple go on pizza?',
        mode: 'text',
        ranked: false,
        moderator_name: 'Mod',
        opponent_name: null,
        opponent_id: null,
        opponent_elo: null,
        ruleset: 'amplified',
        total_rounds: 3,
        language: 'en',
      },
      error: null,
    });

    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    await joinWithCode('ROLEA1').catch(() => {});

    const screen = document.getElementById('screen-main');
    expect(screen).toBeTruthy();
    // showModDebateWaitingDebater renders "Waiting for Opponent" title
    expect(screen!.innerHTML).toContain('Waiting for Opponent');

    vi.useRealTimers();
  });
});

// ============================================================
// TC4 — set_modDebateId called with debate_id when role='a'
// ============================================================

describe('TC4 — set_modDebateId updated with debate_id from ModDebateJoinResult when role=a', () => {
  it('arena-state.modDebateId equals the debate_id returned for role=a', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Not found', code: '404' } });
    mockRpc.mockResolvedValueOnce({
      data: {
        debate_id: 'debate-moddebateid',
        role: 'a',
        status: 'waiting',
        topic: 'Role A debate',
        mode: 'text',
        ranked: false,
        moderator_name: 'Mod',
        opponent_name: null,
        opponent_id: null,
        opponent_elo: null,
        ruleset: 'amplified',
        total_rounds: 3,
        language: 'en',
      },
      error: null,
    });

    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    await joinWithCode('ROLEA2').catch(() => {});

    expect(get_modDebateId()).toBe('debate-moddebateid');

    vi.useRealTimers();
  });
});

// ============================================================
// TC5 — set_selectedMode updated to modResult.mode after join_mod_debate
// ============================================================

describe('TC5 — set_selectedMode updated to mode from ModDebateJoinResult', () => {
  it('arena-state.selectedMode equals the mode returned by join_mod_debate', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Not found', code: '404' } });
    mockRpc.mockResolvedValueOnce({
      data: {
        debate_id: 'debate-modecheck',
        role: 'b',
        status: 'ready',
        topic: 'Voice debate topic',
        mode: 'voice',
        ranked: false,
        moderator_name: 'Mod',
        opponent_name: 'Charlie',
        opponent_id: 'user-charlie',
        opponent_elo: 1100,
        ruleset: 'unplugged',
        total_rounds: 5,
        language: 'es',
      },
      error: null,
    });

    await joinWithCode('MODECHK').catch(() => {});

    expect(get_selectedMode()).toBe('voice');
  });
});

// ============================================================
// TC6 — both RPCs fail → showToast called with a non-empty string
// ============================================================

describe('TC6 — both RPCs fail → showToast called with non-empty error string', () => {
  it('calls showToast with a non-empty string when both join_private_lobby and join_mod_debate error', async () => {
    // friendlyError(modErr) returns a generic message when the error has an unknown message.
    // The source does: showToast(friendlyError(modErr) || 'Code not found or already taken')
    // friendlyError never returns empty for a real error object, so the toast always shows.
    const configMod = await import('../../src/config.ts');
    const toastSpy = vi.spyOn(configMod, 'showToast').mockImplementation(() => {});

    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Lobby not found', code: '404' } });
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Mod debate not found', code: '404' } });

    await joinWithCode('BADBAD').catch(() => {});

    expect(toastSpy).toHaveBeenCalled();
    const toastMsg = toastSpy.mock.calls[0]![0] as string;
    expect(typeof toastMsg).toBe('string');
    expect(toastMsg.length).toBeGreaterThan(0);

    toastSpy.mockRestore();
  });
});

// ============================================================
// TC7 — join_private_lobby succeeds (no fallthrough to join_mod_debate)
// ============================================================

describe('TC7 — join_private_lobby success does not call join_mod_debate', () => {
  it('only calls join_private_lobby when it succeeds — join_mod_debate never called', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{
        debate_id: 'debate-pvt-success',
        status: 'matched',
        topic: 'Private lobby topic',
        mode: 'text',
        opponent_name: 'Dave',
        opponent_id: 'user-dave',
        opponent_elo: 1400,
        ruleset: 'amplified',
        total_rounds: 3,
        language: 'en',
      }],
      error: null,
    });

    await joinWithCode('PVTOK1').catch(() => {});

    const modJoinCalls = mockRpc.mock.calls.filter(c => c[0] === 'join_mod_debate');
    expect(modJoinCalls.length).toBe(0);
  });
});

// ============================================================
// ARCH — seam #266 import boundary: arena-private-lobby.join.ts → arena-types-moderator
// ============================================================

describe('ARCH — seam #266 import boundary unchanged', () => {
  it('arena-private-lobby.join.ts imports ModDebateJoinResult from arena-types-moderator', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-private-lobby.join.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const modTypesLine = importLines.find(l => l.includes('arena-types-moderator'));
    expect(modTypesLine).toBeTruthy();
    expect(modTypesLine).toContain('ModDebateJoinResult');
  });
});
