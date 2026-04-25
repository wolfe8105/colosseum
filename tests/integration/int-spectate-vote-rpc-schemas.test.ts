import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, auth: mockAuth })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });

  // Minimal DOM for vote buttons, vote bar, and pulse
  document.body.innerHTML = `
    <button id="vote-a">Side A</button>
    <button id="vote-b">Side B</button>
    <div id="vote-results"></div>
    <div id="bar-a"></div>
    <div id="bar-b"></div>
    <div id="vote-count"></div>
    <div id="pulse-a"></div>
    <div id="pulse-b"></div>
  `;
});

// TC-01: ARCH — spectate.vote.ts still imports get_arena_debate_spectator from rpc-schemas
describe('TC-01 — ARCH: seam #064 import boundary unchanged', () => {
  it('spectate.vote.ts imports get_arena_debate_spectator from rpc-schemas', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.vote.ts'),
      'utf-8',
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('rpc-schemas'))).toBe(true);
    expect(importLines.some(l => l.includes('get_arena_debate_spectator'))).toBe(true);
  });
});

// TC-02: get_arena_debate_spectator schema validates vote_count_a and vote_count_b as nullable numbers
describe('TC-02 — get_arena_debate_spectator schema validates vote counts as nullable numbers', () => {
  it('parses valid numeric vote counts without error', async () => {
    const { get_arena_debate_spectator } = await import('../../src/contracts/rpc-schemas.ts');
    const payload = {
      status: 'live',
      mode: 'audio',
      topic: 'Test topic',
      debater_a_name: 'Alice',
      debater_a_elo: null,
      debater_a_avatar: null,
      debater_b_name: 'Bob',
      debater_b_elo: null,
      debater_b_avatar: null,
      moderator_type: null,
      moderator_id: null,
      moderator_name: null,
      ruleset: null,
      spectator_count: 5,
      current_round: 1,
      total_rounds: 3,
      vote_count_a: 10,
      vote_count_b: 20,
      score_a: null,
      score_b: null,
      winner: null,
      ai_scorecard: null,
    };
    const result = get_arena_debate_spectator.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vote_count_a).toBe(10);
      expect(result.data.vote_count_b).toBe(20);
    }
  });

  it('accepts null vote counts (nullable field)', async () => {
    const { get_arena_debate_spectator } = await import('../../src/contracts/rpc-schemas.ts');
    const payload = {
      status: null, mode: null, topic: null,
      debater_a_name: null, debater_a_elo: null, debater_a_avatar: null,
      debater_b_name: null, debater_b_elo: null, debater_b_avatar: null,
      moderator_type: null, moderator_id: null, moderator_name: null,
      ruleset: null, spectator_count: null, current_round: null, total_rounds: null,
      vote_count_a: null,
      vote_count_b: null,
      score_a: null, score_b: null, winner: null, ai_scorecard: null,
    };
    const result = get_arena_debate_spectator.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

// TC-03: get_arena_debate_spectator schema uses passthrough — extra fields don't cause failure
describe('TC-03 — get_arena_debate_spectator schema uses passthrough for extra fields', () => {
  it('parses payload with extra unknown fields without error', async () => {
    const { get_arena_debate_spectator } = await import('../../src/contracts/rpc-schemas.ts');
    const payload = {
      status: 'complete', mode: 'text', topic: 'Future of AI',
      debater_a_name: 'Alice', debater_a_elo: 1200, debater_a_avatar: null,
      debater_b_name: 'Bob', debater_b_elo: 1100, debater_b_avatar: null,
      moderator_type: 'human', moderator_id: 'mod-1', moderator_name: 'Judge',
      ruleset: 'standard', spectator_count: 42, current_round: 3, total_rounds: 3,
      vote_count_a: 7, vote_count_b: 3,
      score_a: 80, score_b: 60, winner: 'a', ai_scorecard: null,
      // Extra field not in schema
      some_future_column: 'extra_value',
    };
    const result = get_arena_debate_spectator.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

// TC-04: castVote success path — calls vote_arena_debate then get_arena_debate_spectator
describe('TC-04 — castVote success path calls both RPCs in sequence', () => {
  it('calls vote_arena_debate first, then get_arena_debate_spectator for fresh counts', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-abc';
    stateModule.state.voteCast = false;

    mockRpc.mockImplementation((name: string) => {
      if (name === 'vote_arena_debate') return Promise.resolve({ data: null, error: null });
      if (name === 'get_arena_debate_spectator')
        return Promise.resolve({
          data: { vote_count_a: 5, vote_count_b: 3 },
          error: null,
        });
      return Promise.resolve({ data: null, error: null });
    });

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    const fakeDebate = { vote_count_a: 4, vote_count_b: 2 } as import('../../src/pages/spectate.types.ts').SpectateDebate;
    wireVoteButtons(fakeDebate);

    const btnA = document.getElementById('vote-a') as HTMLButtonElement;
    btnA.click();

    await vi.advanceTimersByTimeAsync(0);
    await vi.waitFor(() => {
      const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
      return rpcCalls.some(([name]) => name === 'get_arena_debate_spectator');
    });

    const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
    const voteCall = rpcCalls.find(([name]) => name === 'vote_arena_debate');
    const freshCall = rpcCalls.find(([name]) => name === 'get_arena_debate_spectator');

    expect(voteCall).toBeTruthy();
    expect(voteCall![1]).toMatchObject({ p_debate_id: 'debate-abc', p_vote: 'a' });
    expect(freshCall).toBeTruthy();
    expect(freshCall![1]).toMatchObject({ p_debate_id: 'debate-abc' });
  });
});

// TC-05: castVote error path — server rejection resets voteCast and re-enables buttons
describe('TC-05 — castVote server-rejection path resets state (SV-2)', () => {
  it('resets voteCast and re-enables buttons when vote_arena_debate returns error', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-xyz';
    stateModule.state.voteCast = false;

    mockRpc.mockImplementation((name: string) => {
      if (name === 'vote_arena_debate')
        return Promise.resolve({ data: null, error: { message: 'Already voted' } });
      return Promise.resolve({ data: null, error: null });
    });

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    const fakeDebate = { vote_count_a: 1, vote_count_b: 1 } as import('../../src/pages/spectate.types.ts').SpectateDebate;
    wireVoteButtons(fakeDebate);

    const btnB = document.getElementById('vote-b') as HTMLButtonElement;
    btnB.click();

    await vi.advanceTimersByTimeAsync(0);
    await vi.waitFor(() => !stateModule.state.voteCast);

    expect(stateModule.state.voteCast).toBe(false);
    expect((document.getElementById('vote-a') as HTMLButtonElement).disabled).toBe(false);
    expect((document.getElementById('vote-b') as HTMLButtonElement).disabled).toBe(false);
  });
});

// TC-06: castVote throw path — unexpected throw resets voteCast (SV-1)
describe('TC-06 — castVote throw path resets voteCast (SV-1)', () => {
  it('resets voteCast when safeRpc throws unexpectedly', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-err';
    stateModule.state.voteCast = false;

    mockRpc.mockImplementation((name: string) => {
      if (name === 'vote_arena_debate') return Promise.reject(new Error('Network error'));
      return Promise.resolve({ data: null, error: null });
    });

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    const fakeDebate = { vote_count_a: 0, vote_count_b: 0 } as import('../../src/pages/spectate.types.ts').SpectateDebate;
    wireVoteButtons(fakeDebate);

    const btnA = document.getElementById('vote-a') as HTMLButtonElement;
    btnA.click();

    await vi.advanceTimersByTimeAsync(0);
    await vi.waitFor(() => !stateModule.state.voteCast);

    expect(stateModule.state.voteCast).toBe(false);
    expect((document.getElementById('vote-a') as HTMLButtonElement).disabled).toBe(false);
  });
});

// TC-07: updateVoteBar renders percentages and total vote count
describe('TC-07 — updateVoteBar renders percentages and total vote count', () => {
  it('sets bar widths, text content, and total vote label', async () => {
    const { updateVoteBar } = await import('../../src/pages/spectate.vote.ts');
    updateVoteBar(30, 70);

    const barA = document.getElementById('bar-a');
    const barB = document.getElementById('bar-b');
    const countEl = document.getElementById('vote-count');
    const results = document.getElementById('vote-results');

    expect(results?.classList.contains('show')).toBe(true);
    expect(barA?.style.width).toBe('30%');
    expect(barA?.textContent).toBe('30%');
    expect(barB?.style.width).toBe('70%');
    expect(barB?.textContent).toBe('70%');
    expect(countEl?.textContent).toBe('100 votes');
  });
});
