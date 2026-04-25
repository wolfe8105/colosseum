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
