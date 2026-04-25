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
