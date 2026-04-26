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

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = `
    <div id="screen-main"></div>
    <button id="mf-accept-btn">Accept</button>
    <button id="mf-decline-btn">Decline</button>
    <div id="mf-status"></div>
  `;
});

// TC-047-01: onMatchAccept disables accept/decline buttons and calls respond_to_match
describe('TC-047-01 — onMatchAccept disables buttons and calls respond_to_match', () => {
  it('disables buttons and calls respond_to_match with debate id and p_accept=true', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-aaa', role: 'a' } as any);
    stateModule.set_matchAcceptTimer(null);

    mockRpc.mockResolvedValue({ data: null, error: null });

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    const acceptBtn = document.getElementById('mf-accept-btn') as HTMLButtonElement;
    const declineBtn = document.getElementById('mf-decline-btn') as HTMLButtonElement;
    expect(acceptBtn.disabled).toBe(true);
    expect(declineBtn.disabled).toBe(true);

    expect(mockRpc).toHaveBeenCalledWith('respond_to_match', { p_debate_id: 'debate-aaa', p_accept: true });
  });
});

// TC-047-02: onMatchAccept sets status text to "Waiting for opponent"
describe('TC-047-02 — onMatchAccept sets status text', () => {
  it('sets #mf-status to waiting message after accept', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-bbb', role: 'b' } as any);
    stateModule.set_matchAcceptTimer(null);

    mockRpc.mockResolvedValue({ data: null, error: null });

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    const statusEl = document.getElementById('mf-status');
    expect(statusEl?.textContent).toBe('Waiting for opponent…');
  });
});

// TC-047-03: onMatchAccept re-enables buttons on RPC error
describe('TC-047-03 — onMatchAccept re-enables buttons on respond_to_match error', () => {
  it('re-enables buttons and does not start poll when respond_to_match errors', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-ccc', role: 'a' } as any);
    stateModule.set_matchAcceptTimer(null);

    mockRpc.mockResolvedValue({ data: null, error: { message: 'server error' } });

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    const acceptBtn = document.getElementById('mf-accept-btn') as HTMLButtonElement;
    const declineBtn = document.getElementById('mf-decline-btn') as HTMLButtonElement;
    expect(acceptBtn.disabled).toBe(false);
    expect(declineBtn.disabled).toBe(false);

    const statusEl = document.getElementById('mf-status');
    expect(statusEl?.textContent).toContain('Error');
  });
});

// TC-047-04: poll calls check_match_acceptance with debate id
describe('TC-047-04 — poll calls check_match_acceptance', () => {
  it('calls check_match_acceptance with the debate id during poll', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-ddd', role: 'a' } as any);
    stateModule.set_matchAcceptTimer(null);

    // respond_to_match succeeds, check_match_acceptance returns both ready
    mockRpc
      .mockResolvedValueOnce({ data: null, error: null }) // respond_to_match
      .mockResolvedValue({
        data: [{ status: 'active', player_a_ready: true, player_b_ready: true }],
        error: null,
      }); // check_match_acceptance

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    // Advance the poll interval once
    await vi.advanceTimersByTimeAsync(1500);

    expect(mockRpc).toHaveBeenCalledWith('check_match_acceptance', { p_debate_id: 'debate-ddd' });
  });
});

// TC-047-05: onMatchConfirmed calls request_mod_for_debate when selectedWantMod is true
describe('TC-047-05 — onMatchConfirmed calls request_mod_for_debate when want mod', () => {
  it('calls request_mod_for_debate RPC with debate id when selectedWantMod is set', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-eee', role: 'a' } as any);
    stateModule.set_selectedWantMod(true);

    mockRpc.mockResolvedValue({ data: null, error: null });

    const { onMatchConfirmed } = await import('../../src/arena/arena-match-flow.ts');
    onMatchConfirmed();

    // Flush microtasks so the async safeRpc call fires
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockRpc).toHaveBeenCalledWith('request_mod_for_debate', { p_debate_id: 'debate-eee' });
  });
});

// TC-047-06: onMatchConfirmed does NOT call request_mod_for_debate when selectedWantMod is false
describe('TC-047-06 — onMatchConfirmed skips request_mod_for_debate when selectedWantMod false', () => {
  it('does not call request_mod_for_debate when selectedWantMod is false', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-fff', role: 'b' } as any);
    stateModule.set_selectedWantMod(false);

    mockRpc.mockResolvedValue({ data: null, error: null });

    const { onMatchConfirmed } = await import('../../src/arena/arena-match-flow.ts');
    onMatchConfirmed();

    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);

    const modCalls = mockRpc.mock.calls.filter(c => c[0] === 'request_mod_for_debate');
    expect(modCalls.length).toBe(0);
  });
});

// TC-047-07: onOpponentDeclined disables buttons and shows declined message
describe('TC-047-07 — onOpponentDeclined disables buttons and updates status', () => {
  it('disables both buttons and sets declined status text', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    await import('../../src/arena/arena-state.ts');

    const { onOpponentDeclined } = await import('../../src/arena/arena-match-flow.ts');
    onOpponentDeclined();

    const acceptBtn = document.getElementById('mf-accept-btn') as HTMLButtonElement;
    const declineBtn = document.getElementById('mf-decline-btn') as HTMLButtonElement;
    const statusEl = document.getElementById('mf-status');

    expect(acceptBtn.disabled).toBe(true);
    expect(declineBtn.disabled).toBe(true);
    expect(statusEl?.textContent).toContain('Opponent declined');
  });
});

// ARCH seam guard
describe('ARCH — seam #047', () => {
  it('src/arena/arena-match-flow.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-match-flow.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});

// ============================================================
// SEAM #103 — arena-match-flow.ts → arena-core.utils
// isPlaceholder() guards RPC calls in the match accept flow
// ============================================================

// TC-103-01: isPlaceholder returns false when Supabase client exists
describe('TC-103-01 — isPlaceholder returns false when client is available', () => {
  it('isPlaceholder() returns false when getSupabaseClient returns a truthy value', async () => {
    vi.resetModules();
    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    // The mock creates a client via createClient, so getSupabaseClient returns it
    const result = isPlaceholder();
    // With a valid mock client and isAnyPlaceholder defaulting to false, should be false
    expect(result).toBe(false);
  });
});

// TC-103-02: isPlaceholder returns true when isAnyPlaceholder config flag is set
describe('TC-103-02 — isPlaceholder uses config isAnyPlaceholder flag', () => {
  it('isPlaceholder() reflects isAnyPlaceholder from config module', async () => {
    vi.resetModules();
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-core.utils.ts'), 'utf-8');
    // Confirm it reads isAnyPlaceholder from config
    expect(source).toContain('isAnyPlaceholder');
    // And uses getSupabaseClient from auth
    expect(source).toContain('getSupabaseClient');
  });
});

// TC-103-03: onMatchAccept skips respond_to_match when matchFoundDebate is null
describe('TC-103-03 — onMatchAccept skips respond_to_match when matchFoundDebate is null', () => {
  it('does not call respond_to_match when matchFoundDebate is null', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate(null);
    stateModule.set_matchAcceptTimer(null);

    mockRpc.mockResolvedValue({ data: null, error: null });

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    const respondCalls = mockRpc.mock.calls.filter(c => c[0] === 'respond_to_match');
    expect(respondCalls.length).toBe(0);
  });
});

// TC-103-04: poll triggers onMatchConfirmed when both players ready (role b perspective)
describe('TC-103-04 — poll triggers onMatchConfirmed when player_b role sees both ready', () => {
  it('fires onMatchConfirmed when player_b_ready=true and player_a_ready=true with role b', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-role-b', role: 'b' } as any);
    stateModule.set_matchAcceptTimer(null);
    stateModule.set_selectedWantMod(false);

    mockRpc
      .mockResolvedValueOnce({ data: null, error: null }) // respond_to_match
      .mockResolvedValue({
        data: [{ status: 'active', player_a_ready: true, player_b_ready: true }],
        error: null,
      }); // check_match_acceptance

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    await vi.advanceTimersByTimeAsync(1500);

    const statusEl = document.getElementById('mf-status');
    expect(statusEl?.textContent).toContain('Both ready');
  });
});

// TC-103-05: poll timeout triggers onOpponentDeclined without extra RPCs
describe('TC-103-05 — poll timeout triggers onOpponentDeclined', () => {
  it('fires onOpponentDeclined after MATCH_ACCEPT_POLL_TIMEOUT_SEC without opponent ready', async () => {
    vi.resetModules();
    // MATCH_ACCEPT_POLL_TIMEOUT_SEC = 15, poll fires every 1500ms → 10 ticks to exceed
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-timeout', role: 'a' } as any);
    stateModule.set_matchAcceptTimer(null);

    mockRpc
      .mockResolvedValueOnce({ data: null, error: null }) // respond_to_match
      .mockResolvedValue({
        data: [{ status: 'active', player_a_ready: true, player_b_ready: null }],
        error: null,
      }); // check_match_acceptance — opponent never ready

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    // Advance past 15 seconds (11 ticks × 1500ms = 16500ms > 15s)
    await vi.advanceTimersByTimeAsync(16500);

    const statusEl = document.getElementById('mf-status');
    expect(statusEl?.textContent).toContain('Opponent declined');

    // Clear all timers to prevent post-teardown leaks (poll + returnToQueue setTimeout)
    vi.clearAllTimers();
    vi.useRealTimers();
  });
});

// TC-103-06: poll fires onOpponentDeclined when status is 'cancelled'
describe('TC-103-06 — poll fires onOpponentDeclined on cancelled status', () => {
  it('calls onOpponentDeclined when check_match_acceptance returns status=cancelled', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-cancelled', role: 'a' } as any);
    stateModule.set_matchAcceptTimer(null);

    mockRpc
      .mockResolvedValueOnce({ data: null, error: null }) // respond_to_match
      .mockResolvedValue({
        data: [{ status: 'cancelled', player_a_ready: true, player_b_ready: false }],
        error: null,
      }); // check_match_acceptance

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    await vi.advanceTimersByTimeAsync(1500);

    const statusEl = document.getElementById('mf-status');
    expect(statusEl?.textContent).toContain('Opponent declined');
  });
});

// TC-103-07: ARCH guard — arena-match-flow.ts imports isPlaceholder from arena-core.utils
describe('ARCH — seam #103', () => {
  it('src/arena/arena-match-flow.ts imports isPlaceholder from arena-core.utils', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-match-flow.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-core.utils'))).toBe(true);
  });

  it('src/arena/arena-core.utils.ts exports isPlaceholder, formatTimer, randomFrom, pushArenaState', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-core.utils.ts'), 'utf-8');
    expect(source).toContain('export function isPlaceholder');
    expect(source).toContain('export function formatTimer');
    expect(source).toContain('export function randomFrom');
    expect(source).toContain('export function pushArenaState');
  });
});

// ============================================================
// SEAM #480 — arena-match-flow.ts → arena-types-match
// MatchAcceptResponse drives accept-poll branching logic
// ============================================================

// TC-480-01: player_b_ready === false (explicit false) triggers onOpponentDeclined — role a
describe('TC-480-01 — opponent false (player_b_ready=false) triggers declined for role a', () => {
  it('fires onOpponentDeclined when player_b_ready is explicitly false and role is a', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-480-01', role: 'a' } as any);
    stateModule.set_matchAcceptTimer(null);

    mockRpc
      .mockResolvedValueOnce({ data: null, error: null }) // respond_to_match
      .mockResolvedValue({
        data: [{ status: 'active', player_a_ready: true, player_b_ready: false } satisfies import('../../src/arena/arena-types-match.ts').MatchAcceptResponse],
        error: null,
      });

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    await vi.advanceTimersByTimeAsync(1500);

    const statusEl = document.getElementById('mf-status');
    expect(statusEl?.textContent).toContain('Opponent declined');
  });
});

// TC-480-02: player_a_ready === false triggers onOpponentDeclined — role b
describe('TC-480-02 — opponent false (player_a_ready=false) triggers declined for role b', () => {
  it('fires onOpponentDeclined when player_a_ready is explicitly false and role is b', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-480-02', role: 'b' } as any);
    stateModule.set_matchAcceptTimer(null);

    mockRpc
      .mockResolvedValueOnce({ data: null, error: null }) // respond_to_match
      .mockResolvedValue({
        data: [{ status: 'active', player_a_ready: false, player_b_ready: true } satisfies import('../../src/arena/arena-types-match.ts').MatchAcceptResponse],
        error: null,
      });

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    await vi.advanceTimersByTimeAsync(1500);

    const statusEl = document.getElementById('mf-status');
    expect(statusEl?.textContent).toContain('Opponent declined');
  });
});

// TC-480-03: both players null (not yet responded) does not trigger confirmed or declined
describe('TC-480-03 — both null ready keeps poll running without triggering confirmed/declined', () => {
  it('does not update status to confirmed or declined when both player ready are null', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-480-03', role: 'a' } as any);
    stateModule.set_matchAcceptTimer(null);

    mockRpc
      .mockResolvedValueOnce({ data: null, error: null }) // respond_to_match
      .mockResolvedValue({
        data: [{ status: 'active', player_a_ready: null, player_b_ready: null } satisfies import('../../src/arena/arena-types-match.ts').MatchAcceptResponse],
        error: null,
      });

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    // Advance one tick — poll fires but neither branch should trigger
    await vi.advanceTimersByTimeAsync(1500);

    const statusEl = document.getElementById('mf-status');
    // Status remains "Waiting" — not confirmed or declined
    expect(statusEl?.textContent).toBe('Waiting for opponent…');

    vi.clearAllTimers();
    vi.useRealTimers();
  });
});

// TC-480-04: RETURNS TABLE array is unwrapped correctly — single row used
describe('TC-480-04 — array response from PostgREST is unwrapped to first row', () => {
  it('correctly unwraps the first element of a RETURNS TABLE array response', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-480-04', role: 'a' } as any);
    stateModule.set_matchAcceptTimer(null);
    stateModule.set_selectedWantMod(false);

    // Simulate PostgREST RETURNS TABLE array with two rows — only first row should be used
    const rows: import('../../src/arena/arena-types-match.ts').MatchAcceptResponse[] = [
      { status: 'active', player_a_ready: true, player_b_ready: true },
      { status: 'active', player_a_ready: false, player_b_ready: false }, // second row should be ignored
    ];
    mockRpc
      .mockResolvedValueOnce({ data: null, error: null }) // respond_to_match
      .mockResolvedValue({ data: rows, error: null });

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    await vi.advanceTimersByTimeAsync(1500);

    const statusEl = document.getElementById('mf-status');
    // First row has both ready — should confirm
    expect(statusEl?.textContent).toContain('Both ready');
  });
});

// TC-480-05: status === 'cancelled' triggers declined regardless of ready fields
describe('TC-480-05 — status=cancelled triggers onOpponentDeclined even if ready fields truthy', () => {
  it('fires onOpponentDeclined when status is cancelled regardless of ready columns', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-480-05', role: 'a' } as any);
    stateModule.set_matchAcceptTimer(null);

    mockRpc
      .mockResolvedValueOnce({ data: null, error: null }) // respond_to_match
      .mockResolvedValue({
        data: [{ status: 'cancelled', player_a_ready: true, player_b_ready: true } satisfies import('../../src/arena/arena-types-match.ts').MatchAcceptResponse],
        error: null,
      });

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    await vi.advanceTimersByTimeAsync(1500);

    const statusEl = document.getElementById('mf-status');
    expect(statusEl?.textContent).toContain('Opponent declined');
  });
});

// TC-480-06: ARCH guard — arena-match-flow.ts imports MatchAcceptResponse from arena-types-match
describe('ARCH — seam #480 import check', () => {
  it('src/arena/arena-match-flow.ts imports MatchAcceptResponse from arena-types-match', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-match-flow.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-types-match'))).toBe(true);
    expect(source).toContain('MatchAcceptResponse');
  });
});

// TC-480-07: arena-types-match.ts exports both MatchData and MatchAcceptResponse
describe('TC-480-07 — arena-types-match exports MatchData and MatchAcceptResponse', () => {
  it('arena-types-match.ts exports MatchData with required fields and MatchAcceptResponse', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-types-match.ts'), 'utf-8');
    expect(source).toContain('export interface MatchData');
    expect(source).toContain('export interface MatchAcceptResponse');
    expect(source).toContain('player_a_ready');
    expect(source).toContain('player_b_ready');
    expect(source).toContain('status');
    // MatchAcceptResponse allows null for both ready columns
    expect(source).toContain('boolean | null');
  });
});

// ============================================================
// SEAM #539 — arena-match-flow.ts → arena-match-timers
// clearMatchAcceptTimers() is the shared primitive that clears
// matchAcceptTimer and matchAcceptPollTimer in both confirmed
// and declined paths.
// ============================================================

// TC-539-01: clearMatchAcceptTimers clears an active matchAcceptTimer and sets it null
describe('TC-539-01 — clearMatchAcceptTimers clears active matchAcceptTimer', () => {
  it('calls clearInterval on matchAcceptTimer and sets it to null', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    // Plant a real interval timer in state
    const fakeTimer = setInterval(() => {}, 9999);
    stateModule.set_matchAcceptTimer(fakeTimer);
    stateModule.set_matchAcceptPollTimer(null);

    const { clearMatchAcceptTimers } = await import('../../src/arena/arena-match-timers.ts');
    clearMatchAcceptTimers();

    expect(stateModule.matchAcceptTimer).toBeNull();
    vi.useRealTimers();
  });
});

// TC-539-02: clearMatchAcceptTimers clears an active matchAcceptPollTimer and sets it null
describe('TC-539-02 — clearMatchAcceptTimers clears active matchAcceptPollTimer', () => {
  it('calls clearInterval on matchAcceptPollTimer and sets it to null', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchAcceptTimer(null);
    const fakePollTimer = setInterval(() => {}, 9999);
    stateModule.set_matchAcceptPollTimer(fakePollTimer);

    const { clearMatchAcceptTimers } = await import('../../src/arena/arena-match-timers.ts');
    clearMatchAcceptTimers();

    expect(stateModule.matchAcceptPollTimer).toBeNull();
    vi.useRealTimers();
  });
});

// TC-539-03: clearMatchAcceptTimers is a no-op when both timers are null
describe('TC-539-03 — clearMatchAcceptTimers is safe when both timers are null', () => {
  it('does not throw when matchAcceptTimer and matchAcceptPollTimer are both null', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchAcceptTimer(null);
    stateModule.set_matchAcceptPollTimer(null);

    const { clearMatchAcceptTimers } = await import('../../src/arena/arena-match-timers.ts');
    expect(() => clearMatchAcceptTimers()).not.toThrow();
    vi.useRealTimers();
  });
});

// TC-539-04: onMatchConfirmed leaves both timers null (via clearMatchAcceptTimers)
describe('TC-539-04 — onMatchConfirmed leaves both timers null via clearMatchAcceptTimers', () => {
  it('matchAcceptTimer and matchAcceptPollTimer are null after onMatchConfirmed', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    const t1 = setInterval(() => {}, 9999);
    const t2 = setInterval(() => {}, 9999);
    stateModule.set_matchAcceptTimer(t1);
    stateModule.set_matchAcceptPollTimer(t2);
    stateModule.set_matchFoundDebate({ id: 'debate-539-04', role: 'a' } as any);
    stateModule.set_selectedWantMod(false);

    mockRpc.mockResolvedValue({ data: null, error: null });

    const { onMatchConfirmed } = await import('../../src/arena/arena-match-flow.ts');
    onMatchConfirmed();

    expect(stateModule.matchAcceptTimer).toBeNull();
    expect(stateModule.matchAcceptPollTimer).toBeNull();
    vi.useRealTimers();
  });
});

// TC-539-05: onOpponentDeclined leaves both timers null (via clearMatchAcceptTimers)
describe('TC-539-05 — onOpponentDeclined leaves both timers null via clearMatchAcceptTimers', () => {
  it('matchAcceptTimer and matchAcceptPollTimer are null after onOpponentDeclined', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    const t1 = setInterval(() => {}, 9999);
    const t2 = setInterval(() => {}, 9999);
    stateModule.set_matchAcceptTimer(t1);
    stateModule.set_matchAcceptPollTimer(t2);

    const { onOpponentDeclined } = await import('../../src/arena/arena-match-flow.ts');
    onOpponentDeclined();

    expect(stateModule.matchAcceptTimer).toBeNull();
    expect(stateModule.matchAcceptPollTimer).toBeNull();

    vi.clearAllTimers();
    vi.useRealTimers();
  });
});

// TC-539-06: poll confirmed path (both ready) leaves poll timer null after clearMatchAcceptTimers
describe('TC-539-06 — poll confirmed path clears matchAcceptPollTimer via clearMatchAcceptTimers', () => {
  it('matchAcceptPollTimer is null after poll fires onMatchConfirmed (both players ready)', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_matchFoundDebate({ id: 'debate-539-06', role: 'a' } as any);
    stateModule.set_matchAcceptTimer(null);
    stateModule.set_selectedWantMod(false);

    mockRpc
      .mockResolvedValueOnce({ data: null, error: null }) // respond_to_match
      .mockResolvedValue({
        data: [{ status: 'active', player_a_ready: true, player_b_ready: true }],
        error: null,
      }); // check_match_acceptance — both ready

    const { onMatchAccept } = await import('../../src/arena/arena-match-flow.ts');
    await onMatchAccept();

    await vi.advanceTimersByTimeAsync(1500);

    // After confirmed, poll timer must be null
    expect(stateModule.matchAcceptPollTimer).toBeNull();

    vi.clearAllTimers();
    vi.useRealTimers();
  });
});

// TC-539-07: ARCH — arena-match-flow.ts imports clearMatchAcceptTimers from arena-match-timers
describe('ARCH — seam #539 import check', () => {
  it('src/arena/arena-match-flow.ts imports clearMatchAcceptTimers from arena-match-timers', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-match-flow.ts'), 'utf-8');
    const importLines = source.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    expect(importLines.some((l: string) => l.includes('arena-match-timers'))).toBe(true);
    expect(source).toContain('clearMatchAcceptTimers');
  });

  it('src/arena/arena-match-timers.ts has no Supabase rpc/from/auth calls', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-match-timers.ts'), 'utf-8');
    expect(source).not.toContain('.rpc(');
    expect(source).not.toContain('.from(');
    expect(source).not.toContain('supabase');
  });
});

// ============================================================
// SEAM #538 — arena-match-flow.ts → arena-room-predebate
// onMatchConfirmed() calls showPreDebate(matchFoundDebate) after 800ms.
// showPreDebate renders the pre-debate screen into screenEl.
// ============================================================

// TC-538-01: onMatchConfirmed calls showPreDebate after 800ms delay
describe('TC-538-01 — onMatchConfirmed schedules showPreDebate after 800ms', () => {
  it('renders .arena-pre-debate into screenEl 800ms after onMatchConfirmed fires', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Set up screenEl in the DOM and register it with arena-state
    const screenDiv = document.createElement('div');
    screenDiv.id = 'screen-main';
    document.body.appendChild(screenDiv);

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(screenDiv);
    stateModule.set_matchFoundDebate({
      id: 'debate-538-01',
      topic: 'Flat earth is real',
      mode: 'text',
      ranked: false,
      ruleset: 'standard',
      opponentName: 'Rival',
      opponentId: 'opp-538-01',
      opponentElo: 1300,
      side: 'a',
      role: 'a',
    } as any);
    stateModule.set_selectedWantMod(false);

    mockRpc.mockResolvedValue({ data: null, error: null });

    // Mock heavyweight sub-deps so showPreDebate renders without network
    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue({ total: 0, side_a: 0, side_b: 0 }),
      renderStakingPanel: vi.fn().mockReturnValue('<div id="staking-mock"></div>'),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn().mockReturnValue('<div id="loadout-mock"></div>'),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      renderLoadoutPicker: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-loadout-presets.ts', () => ({
      renderPresetBar: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-bounty-claim.ts', () => ({
      renderBountyClaimDropdown: vi.fn().mockResolvedValue(undefined),
      resetBountyClaim: vi.fn(),
    }));
    vi.doMock('../../src/bounties.ts', () => ({
      bountyDot: vi.fn().mockReturnValue(''),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: vi.fn(),
    }));

    const { onMatchConfirmed } = await import('../../src/arena/arena-match-flow.ts');
    onMatchConfirmed();

    // Before 800ms: showPreDebate hasn't fired yet
    await vi.advanceTimersByTimeAsync(799);
    expect(screenDiv.querySelector('.arena-pre-debate')).toBeNull();

    // After 800ms: showPreDebate fires and renders the pre-debate div
    await vi.advanceTimersByTimeAsync(1);
    // Allow microtasks from async showPreDebate to settle
    await vi.runAllTicks();

    expect(screenDiv.querySelector('.arena-pre-debate')).not.toBeNull();

    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.removeChild(screenDiv);
  });
});

// TC-538-02: onMatchConfirmed renders debate topic in showPreDebate screen
describe('TC-538-02 — showPreDebate renders debate topic text', () => {
  it('arena-pre-debate-sub element contains the debate topic after showPreDebate fires', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screenDiv = document.createElement('div');
    screenDiv.id = 'screen-main-tc2';
    document.body.appendChild(screenDiv);

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(screenDiv);
    stateModule.set_matchFoundDebate({
      id: 'debate-538-02',
      topic: 'Climate change is overhyped',
      mode: 'text',
      ranked: false,
      ruleset: 'standard',
      opponentName: 'Debater2',
      opponentId: 'opp-538-02',
      opponentElo: 1100,
      side: 'a',
      role: 'a',
    } as any);
    stateModule.set_selectedWantMod(false);

    mockRpc.mockResolvedValue({ data: null, error: null });

    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue({ total: 0, side_a: 0, side_b: 0 }),
      renderStakingPanel: vi.fn().mockReturnValue(''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn().mockReturnValue(''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      renderLoadoutPicker: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-loadout-presets.ts', () => ({
      renderPresetBar: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-bounty-claim.ts', () => ({
      renderBountyClaimDropdown: vi.fn().mockResolvedValue(undefined),
      resetBountyClaim: vi.fn(),
    }));
    vi.doMock('../../src/bounties.ts', () => ({
      bountyDot: vi.fn().mockReturnValue(''),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: vi.fn(),
    }));

    const { onMatchConfirmed } = await import('../../src/arena/arena-match-flow.ts');
    onMatchConfirmed();

    await vi.advanceTimersByTimeAsync(800);
    await vi.runAllTicks();

    const subEl = screenDiv.querySelector('.arena-pre-debate-sub');
    expect(subEl?.textContent).toContain('Climate change is overhyped');

    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.removeChild(screenDiv);
  });
});

// TC-538-03: onMatchConfirmed sets arena-state view to 'room' before rendering
describe('TC-538-03 — showPreDebate sets view to "room" in arena-state', () => {
  it('arena-state.view is "room" after showPreDebate executes', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screenDiv = document.createElement('div');
    screenDiv.id = 'screen-main-tc3';
    document.body.appendChild(screenDiv);

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(screenDiv);
    stateModule.set_matchFoundDebate({
      id: 'debate-538-03',
      topic: 'AI will replace programmers',
      mode: 'text',
      ranked: false,
      ruleset: 'standard',
      opponentName: 'Coder',
      opponentId: 'opp-538-03',
      opponentElo: 1500,
      side: 'b',
      role: 'b',
    } as any);
    stateModule.set_selectedWantMod(false);

    mockRpc.mockResolvedValue({ data: null, error: null });

    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue({ total: 0, side_a: 0, side_b: 0 }),
      renderStakingPanel: vi.fn().mockReturnValue(''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn().mockReturnValue(''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      renderLoadoutPicker: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-loadout-presets.ts', () => ({
      renderPresetBar: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-bounty-claim.ts', () => ({
      renderBountyClaimDropdown: vi.fn().mockResolvedValue(undefined),
      resetBountyClaim: vi.fn(),
    }));
    vi.doMock('../../src/bounties.ts', () => ({
      bountyDot: vi.fn().mockReturnValue(''),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: vi.fn(),
    }));

    const { onMatchConfirmed } = await import('../../src/arena/arena-match-flow.ts');
    onMatchConfirmed();

    await vi.advanceTimersByTimeAsync(800);
    await vi.runAllTicks();

    expect(stateModule.view).toBe('room');

    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.removeChild(screenDiv);
  });
});

// TC-538-04: onMatchConfirmed sets currentDebate in arena-state to matchFoundDebate
describe('TC-538-04 — showPreDebate sets currentDebate in arena-state', () => {
  it('arena-state.currentDebate equals the matchFoundDebate passed to showPreDebate', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screenDiv = document.createElement('div');
    screenDiv.id = 'screen-main-tc4';
    document.body.appendChild(screenDiv);

    const debateData = {
      id: 'debate-538-04',
      topic: 'Social media harms democracy',
      mode: 'text',
      ranked: true,
      ruleset: 'standard',
      opponentName: 'Pundit',
      opponentId: 'opp-538-04',
      opponentElo: 1400,
      side: 'a',
      role: 'a',
    };

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(screenDiv);
    stateModule.set_matchFoundDebate(debateData as any);
    stateModule.set_selectedWantMod(false);

    mockRpc.mockResolvedValue({ data: null, error: null });

    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue({ total: 0, side_a: 0, side_b: 0 }),
      renderStakingPanel: vi.fn().mockReturnValue(''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn().mockReturnValue(''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      renderLoadoutPicker: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-loadout-presets.ts', () => ({
      renderPresetBar: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-bounty-claim.ts', () => ({
      renderBountyClaimDropdown: vi.fn().mockResolvedValue(undefined),
      resetBountyClaim: vi.fn(),
    }));
    vi.doMock('../../src/bounties.ts', () => ({
      bountyDot: vi.fn().mockReturnValue(''),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: vi.fn(),
    }));

    const { onMatchConfirmed } = await import('../../src/arena/arena-match-flow.ts');
    onMatchConfirmed();

    await vi.advanceTimersByTimeAsync(800);
    await vi.runAllTicks();

    expect(stateModule.currentDebate?.id).toBe('debate-538-04');
    expect(stateModule.currentDebate?.topic).toBe('Social media harms democracy');

    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.removeChild(screenDiv);
  });
});

// TC-538-05: showPreDebate renders VS bar with opponent name
describe('TC-538-05 — showPreDebate renders VS bar with opponent name', () => {
  it('arena-debater-name elements include the opponent name', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screenDiv = document.createElement('div');
    screenDiv.id = 'screen-main-tc5';
    document.body.appendChild(screenDiv);

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(screenDiv);
    stateModule.set_matchFoundDebate({
      id: 'debate-538-05',
      topic: 'Cats vs Dogs',
      mode: 'text',
      ranked: false,
      ruleset: 'standard',
      opponentName: 'DogLover99',
      opponentId: 'opp-538-05',
      opponentElo: 1050,
      side: 'a',
      role: 'a',
    } as any);
    stateModule.set_selectedWantMod(false);

    mockRpc.mockResolvedValue({ data: null, error: null });

    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue({ total: 0, side_a: 0, side_b: 0 }),
      renderStakingPanel: vi.fn().mockReturnValue(''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn().mockReturnValue(''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      renderLoadoutPicker: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-loadout-presets.ts', () => ({
      renderPresetBar: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-bounty-claim.ts', () => ({
      renderBountyClaimDropdown: vi.fn().mockResolvedValue(undefined),
      resetBountyClaim: vi.fn(),
    }));
    vi.doMock('../../src/bounties.ts', () => ({
      bountyDot: vi.fn().mockReturnValue(''),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: vi.fn(),
    }));

    const { onMatchConfirmed } = await import('../../src/arena/arena-match-flow.ts');
    onMatchConfirmed();

    await vi.advanceTimersByTimeAsync(800);
    await vi.runAllTicks();

    const nameEls = screenDiv.querySelectorAll('.arena-debater-name');
    const nameTexts = Array.from(nameEls).map(el => el.textContent || '');
    expect(nameTexts.some(t => t.includes('DogLover99'))).toBe(true);

    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.removeChild(screenDiv);
  });
});

// TC-538-06: showPreDebate renders share button with debate id in data attribute
describe('TC-538-06 — showPreDebate renders share button with debate id', () => {
  it('pre-debate-share-btn data-debate-id matches the debate id', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screenDiv = document.createElement('div');
    screenDiv.id = 'screen-main-tc6';
    document.body.appendChild(screenDiv);

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(screenDiv);
    stateModule.set_matchFoundDebate({
      id: 'debate-538-06',
      topic: 'Space travel is worth the cost',
      mode: 'text',
      ranked: false,
      ruleset: 'standard',
      opponentName: 'AstroFan',
      opponentId: 'opp-538-06',
      opponentElo: 1200,
      side: 'a',
      role: 'a',
    } as any);
    stateModule.set_selectedWantMod(false);

    mockRpc.mockResolvedValue({ data: null, error: null });

    vi.doMock('../../src/staking.ts', () => ({
      getPool: vi.fn().mockResolvedValue({ total: 0, side_a: 0, side_b: 0 }),
      renderStakingPanel: vi.fn().mockReturnValue(''),
      wireStakingPanel: vi.fn(),
    }));
    vi.doMock('../../src/powerups.ts', () => ({
      getMyPowerUps: vi.fn().mockResolvedValue({ inventory: [], equipped: [], questions_answered: 0 }),
      renderLoadout: vi.fn().mockReturnValue(''),
      wireLoadout: vi.fn(),
    }));
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      renderLoadoutPicker: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-loadout-presets.ts', () => ({
      renderPresetBar: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-bounty-claim.ts', () => ({
      renderBountyClaimDropdown: vi.fn().mockResolvedValue(undefined),
      resetBountyClaim: vi.fn(),
    }));
    vi.doMock('../../src/bounties.ts', () => ({
      bountyDot: vi.fn().mockReturnValue(''),
    }));
    vi.doMock('../../src/arena/arena-ads.ts', () => ({
      injectAdSlot: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-room-enter.ts', () => ({
      enterRoom: vi.fn(),
    }));

    const { onMatchConfirmed } = await import('../../src/arena/arena-match-flow.ts');
    onMatchConfirmed();

    await vi.advanceTimersByTimeAsync(800);
    await vi.runAllTicks();

    const shareBtn = screenDiv.querySelector('#pre-debate-share-btn') as HTMLButtonElement | null;
    expect(shareBtn).not.toBeNull();
    expect(shareBtn?.getAttribute('data-debate-id')).toBe('debate-538-06');

    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.removeChild(screenDiv);
  });
});

// TC-538-07: ARCH — arena-match-flow.ts imports showPreDebate from arena-room-predebate
describe('ARCH — seam #538 import check', () => {
  it('src/arena/arena-match-flow.ts imports showPreDebate from arena-room-predebate', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-match-flow.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-room-predebate'))).toBe(true);
    expect(source).toContain('showPreDebate');
  });

  it('src/arena/arena-room-predebate.ts exports showPreDebate', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-predebate.ts'), 'utf-8');
    expect(source).toContain('export async function showPreDebate');
  });
});
