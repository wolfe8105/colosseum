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
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  document.body.innerHTML = `
    <button id="vote-a">Side A</button>
    <button id="vote-b">Side B</button>
    <div id="vote-results"></div>
    <div id="bar-a"></div>
    <div id="bar-b"></div>
    <div id="vote-count"></div>
    <div id="pulse-a"></div>
    <div id="pulse-b"></div>
    <span class="pulse-empty">No votes yet</span>
  `;

  sessionStorage.clear();
  localStorage.clear();
});

// Helper: flush all pending microtasks without advancing fake timers
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
}

// TC-166-01: clicking #vote-a calls vote_arena_debate with p_vote:'a'
describe('TC-166-01 — clicking vote-a calls vote_arena_debate with p_vote a', () => {
  it('fires safeRpc vote_arena_debate with correct params for side a', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-111';
    stateModule.state.voteCast = false;

    mockRpc.mockResolvedValue({ data: null, error: null });

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    const d = { vote_count_a: 3, vote_count_b: 2 } as any;
    wireVoteButtons(d);

    document.getElementById('vote-a')!.click();
    await flushMicrotasks();

    expect(mockRpc).toHaveBeenCalledWith(
      'vote_arena_debate',
      { p_debate_id: 'debate-111', p_vote: 'a' }
    );
  });
});

// TC-166-02: clicking #vote-b calls vote_arena_debate with p_vote:'b'
describe('TC-166-02 — clicking vote-b calls vote_arena_debate with p_vote b', () => {
  it('fires safeRpc vote_arena_debate with correct params for side b', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-222';
    stateModule.state.voteCast = false;

    mockRpc.mockResolvedValue({ data: null, error: null });

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    const d = { vote_count_a: 1, vote_count_b: 4 } as any;
    wireVoteButtons(d);

    document.getElementById('vote-b')!.click();
    await flushMicrotasks();

    expect(mockRpc).toHaveBeenCalledWith(
      'vote_arena_debate',
      { p_debate_id: 'debate-222', p_vote: 'b' }
    );
  });
});

// TC-166-03: successful vote fires nudge with first_vote id
describe('TC-166-03 — successful vote fires nudge with first_vote id', () => {
  it('marks first_vote in sessionStorage after a successful vote', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-333';
    stateModule.state.voteCast = false;

    mockRpc.mockResolvedValue({ data: null, error: null });

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    const d = { vote_count_a: 0, vote_count_b: 0 } as any;
    wireVoteButtons(d);

    document.getElementById('vote-a')!.click();
    await flushMicrotasks();

    // nudge marks sessionStorage once fired
    const raw = sessionStorage.getItem('mod_nudge_session');
    const fired: string[] = raw ? JSON.parse(raw) : [];
    expect(fired).toContain('first_vote');
  });
});

// TC-166-04: when fresh data fetch returns null, vote bar uses fallback (d.vote_count_a/b + 1)
describe('TC-166-04 — successful vote with null fresh data falls back to local counts', () => {
  it('renders vote bar using d.vote_count_a/b incremented by the vote side when fresh data is null', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-444';
    stateModule.state.voteCast = false;

    // Both rpc calls return null data — triggers fallback path
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    // d has 3 a votes and 1 b vote; voting for 'a' → fva=4, fvb=1 → pctA=80%, pctB=20%
    const d = { vote_count_a: 3, vote_count_b: 1 } as any;
    wireVoteButtons(d);

    document.getElementById('vote-a')!.click();
    await flushMicrotasks();

    const barA = document.getElementById('bar-a');
    const barB = document.getElementById('bar-b');
    const countEl = document.getElementById('vote-count');
    // (3+1)/(3+1+1) = 4/5 = 80%, 20%
    expect(barA?.style.width).toBe('80%');
    expect(barB?.style.width).toBe('20%');
    expect(countEl?.textContent).toBe('5 votes');
  });
});

// TC-166-05: server rejection resets voteCast and re-enables buttons
describe('TC-166-05 — server rejection resets voteCast and re-enables buttons', () => {
  it('re-enables buttons and resets voteCast when server returns an error', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-555';
    stateModule.state.voteCast = false;

    mockRpc.mockResolvedValue({ data: null, error: { message: 'already voted' } });

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    const d = { vote_count_a: 2, vote_count_b: 3 } as any;
    wireVoteButtons(d);

    document.getElementById('vote-a')!.click();
    await flushMicrotasks();

    expect(stateModule.state.voteCast).toBe(false);
    const btnA = document.getElementById('vote-a') as HTMLButtonElement;
    const btnB = document.getElementById('vote-b') as HTMLButtonElement;
    expect(btnA.disabled).toBe(false);
    expect(btnB.disabled).toBe(false);
    expect(btnA.classList.contains('voted')).toBe(false);
    expect(btnB.classList.contains('voted')).toBe(false);
  });
});

// TC-166-06: successful vote disables buttons and adds .voted class
describe('TC-166-06 — successful vote disables buttons and adds voted class', () => {
  it('disables both buttons and applies voted/selected classes after success', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-666';
    stateModule.state.voteCast = false;

    mockRpc.mockResolvedValue({ data: null, error: null });

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    const d = { vote_count_a: 5, vote_count_b: 5 } as any;
    wireVoteButtons(d);

    document.getElementById('vote-b')!.click();
    await flushMicrotasks();

    const btnA = document.getElementById('vote-a') as HTMLButtonElement;
    const btnB = document.getElementById('vote-b') as HTMLButtonElement;
    expect(btnA.disabled).toBe(true);
    expect(btnB.disabled).toBe(true);
    expect(btnB.classList.contains('voted')).toBe(true);
    expect(btnB.classList.contains('selected')).toBe(true);
    expect(btnA.classList.contains('selected')).toBe(false);
  });
});

// TC-166-07: updateVoteBar / updatePulse render percentages and remove pulse-empty
describe('TC-166-07 — updateVoteBar and updatePulse render correctly and remove pulse-empty', () => {
  it('shows vote-results, correct % in bars and count, removes pulse-empty', async () => {
    const { updateVoteBar, updatePulse } = await import('../../src/pages/spectate.vote.ts');

    updateVoteBar(2, 8);
    updatePulse(2, 8);

    const results = document.getElementById('vote-results');
    expect(results?.classList.contains('show')).toBe(true);

    const barA = document.getElementById('bar-a');
    const barB = document.getElementById('bar-b');
    const countEl = document.getElementById('vote-count');
    // 2/(2+8) = 20%, 80%
    expect(barA?.style.width).toBe('20%');
    expect(barB?.style.width).toBe('80%');
    expect(countEl?.textContent).toBe('10 votes');

    const pulseA = document.getElementById('pulse-a');
    const pulseB = document.getElementById('pulse-b');
    expect(pulseA?.style.width).toBe('20%');
    expect(pulseB?.style.width).toBe('80%');

    // .pulse-empty should be removed when total > 0
    expect(document.querySelector('.pulse-empty')).toBeNull();
  });
});

// TC-166-08: ARCH — spectate.vote.ts imports from nudge.ts
describe('TC-166-08 — ARCH: spectate.vote.ts imports nudge from nudge.ts', () => {
  it('has an import from nudge.ts', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.vote.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('nudge'))).toBe(true);
  });
});

// ─── Seam #259: spectate.vote.ts → tokens ───────────────────────────────────

// TC-SV-01: successful vote triggers claim_action_tokens with p_action:'vote'
describe('TC-SV-01 — successful vote triggers claim_action_tokens with p_action vote', () => {
  it('calls claim_action_tokens with p_action vote and debateId as p_reference_id', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: null });

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

    // Inject a logged-in user so _rpc in tokens.balance.ts doesn't early-exit
    const authCore = await import('../../src/auth.core.ts');
    authCore._setCurrentUser({ id: 'user-sv01', email: 'test@test.com' } as any);

    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-sv01';
    stateModule.state.voteCast = false;

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    wireVoteButtons({ vote_count_a: 1, vote_count_b: 1 } as any);

    document.getElementById('vote-a')!.click();
    for (let i = 0; i < 30; i++) await Promise.resolve();

    // vote_arena_debate first, then claim_action_tokens
    const calls = mockRpc.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls).toContain('vote_arena_debate');
    expect(calls).toContain('claim_action_tokens');

    const claimCall = mockRpc.mock.calls.find((c: unknown[]) => c[0] === 'claim_action_tokens');
    expect(claimCall).toBeDefined();
    expect(claimCall![1]).toMatchObject({ p_action: 'vote', p_reference_id: 'debate-sv01' });
  });
});

// TC-SV-02: server-rejected vote does NOT call claim_action_tokens
describe('TC-SV-02 — server-rejected vote does not call claim_action_tokens', () => {
  it('skips claim_action_tokens when vote_arena_debate returns an error', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: { message: 'already voted' } });

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

    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-sv02';
    stateModule.state.voteCast = false;

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    wireVoteButtons({ vote_count_a: 0, vote_count_b: 0 } as any);

    document.getElementById('vote-b')!.click();
    for (let i = 0; i < 30; i++) await Promise.resolve();

    const claimCalls = mockRpc.mock.calls.filter((c: unknown[]) => c[0] === 'claim_action_tokens');
    expect(claimCalls).toHaveLength(0);
  });
});

// TC-SV-03: voteCast guard prevents double-vote RPC calls
describe('TC-SV-03 — voteCast guard prevents double-click from firing vote_arena_debate twice', () => {
  it('calls vote_arena_debate exactly once when button is clicked twice quickly', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: null });

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

    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-sv03';
    stateModule.state.voteCast = false;

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    wireVoteButtons({ vote_count_a: 2, vote_count_b: 2 } as any);

    // Double click
    document.getElementById('vote-a')!.click();
    document.getElementById('vote-a')!.click();
    for (let i = 0; i < 30; i++) await Promise.resolve();

    const voteCalls = mockRpc.mock.calls.filter((c: unknown[]) => c[0] === 'vote_arena_debate');
    expect(voteCalls).toHaveLength(1);
  });
});

// TC-SV-04: claimVote receives the exact debateId from state
describe('TC-SV-04 — claimVote receives the exact debateId stored in state', () => {
  it('passes state.debateId as p_reference_id to claim_action_tokens', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: null });

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

    const DEBATE_ID = 'aabbccdd-1234-5678-9abc-def012345678';

    // Inject a logged-in user so _rpc in tokens.balance.ts doesn't early-exit
    const authCore = await import('../../src/auth.core.ts');
    authCore._setCurrentUser({ id: 'user-sv04', email: 'test@test.com' } as any);

    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = DEBATE_ID;
    stateModule.state.voteCast = false;

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    wireVoteButtons({ vote_count_a: 0, vote_count_b: 0 } as any);

    document.getElementById('vote-b')!.click();
    for (let i = 0; i < 30; i++) await Promise.resolve();

    const claimCall = mockRpc.mock.calls.find((c: unknown[]) => c[0] === 'claim_action_tokens');
    expect(claimCall).toBeDefined();
    expect((claimCall![1] as Record<string, string>).p_reference_id).toBe(DEBATE_ID);
  });
});

// TC-SV-05: ARCH — spectate.vote.ts imports claimVote from tokens.ts
describe('TC-SV-05 — ARCH: spectate.vote.ts imports claimVote from tokens.ts', () => {
  it('has an import line containing claimVote from tokens', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.vote.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasClaimVote = importLines.some(l => l.includes('claimVote') && l.includes('tokens'));
    expect(hasClaimVote).toBe(true);
  });
});

// TC-SV-06: successful claimVote with non-null RPC result keeps buttons disabled
describe('TC-SV-06 — successful claimVote with token claim success keeps buttons disabled', () => {
  it('buttons remain disabled after full successful vote + token claim', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();

    // vote_arena_debate succeeds; claim_action_tokens returns success with token reward
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'claim_action_tokens') {
        return Promise.resolve({ data: { success: true, new_balance: 50, tokens_earned: 5 }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

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

    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-sv06';
    stateModule.state.voteCast = false;

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    wireVoteButtons({ vote_count_a: 4, vote_count_b: 4 } as any);

    document.getElementById('vote-a')!.click();
    for (let i = 0; i < 30; i++) await Promise.resolve();

    const btnA = document.getElementById('vote-a') as HTMLButtonElement;
    const btnB = document.getElementById('vote-b') as HTMLButtonElement;
    expect(btnA.disabled).toBe(true);
    expect(btnB.disabled).toBe(true);
  });
});

// TC-SV-07: updateVoteBar with zero total uses 1 as denominator (0%/100%)
describe('TC-SV-07 — updateVoteBar with zero total uses 1 as denominator', () => {
  it('renders 0% for A and 100% for B when both vote counts are zero', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="vote-results"></div>
      <div id="bar-a"></div>
      <div id="bar-b"></div>
      <div id="vote-count"></div>
      <div id="pulse-a"></div>
      <div id="pulse-b"></div>
    `;

    const { updateVoteBar } = await import('../../src/pages/spectate.vote.ts');
    updateVoteBar(0, 0);

    const barA = document.getElementById('bar-a');
    const barB = document.getElementById('bar-b');
    const countEl = document.getElementById('vote-count');
    // total=0 → total || 1 = 1 → pctA=Math.round(0/1*100)=0, pctB=100-0=100
    expect(barA?.style.width).toBe('0%');
    expect(barA?.textContent).toBe('0%');
    expect(barB?.style.width).toBe('100%');
    expect(barB?.textContent).toBe('100%');
    expect(countEl?.textContent).toBe('1 vote');
  });
});

// ─── Seam #260: spectate.vote.ts → spectate.state ───────────────────────────

// TC-260-01: state.voteCast is set to true after a successful vote
describe('TC-260-01 — state.voteCast is set to true after a successful vote', () => {
  it('mutates state.voteCast to true on vote success', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: null });

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

    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-260-01';
    stateModule.state.voteCast = false;

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    wireVoteButtons({ vote_count_a: 1, vote_count_b: 1 } as any);

    document.getElementById('vote-a')!.click();
    for (let i = 0; i < 30; i++) await Promise.resolve();

    expect(stateModule.state.voteCast).toBe(true);
  });
});

// TC-260-02: state.voteCast guard prevents duplicate vote_arena_debate calls
describe('TC-260-02 — state.voteCast guard blocks vote when already true', () => {
  it('does not call vote_arena_debate when state.voteCast is pre-set to true', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: null });

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

    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-260-02';
    stateModule.state.voteCast = true; // already voted

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    wireVoteButtons({ vote_count_a: 3, vote_count_b: 2 } as any);

    document.getElementById('vote-a')!.click();
    for (let i = 0; i < 30; i++) await Promise.resolve();

    const voteCalls = mockRpc.mock.calls.filter((c: unknown[]) => c[0] === 'vote_arena_debate');
    expect(voteCalls).toHaveLength(0);
  });
});

// TC-260-03: server error resets state.voteCast to false
describe('TC-260-03 — server error resets state.voteCast to false', () => {
  it('restores state.voteCast to false when vote_arena_debate returns an error', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: { message: 'duplicate vote' } });

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

    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-260-03';
    stateModule.state.voteCast = false;

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    wireVoteButtons({ vote_count_a: 0, vote_count_b: 0 } as any);

    document.getElementById('vote-b')!.click();
    for (let i = 0; i < 30; i++) await Promise.resolve();

    expect(stateModule.state.voteCast).toBe(false);
  });
});

// TC-260-04: unexpected throw in castVote resets state.voteCast to false
describe('TC-260-04 — unexpected throw in castVote resets state.voteCast to false', () => {
  it('resets state.voteCast when safeRpc throws unexpectedly', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockRejectedValue(new Error('network failure'));

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

    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-260-04';
    stateModule.state.voteCast = false;

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    wireVoteButtons({ vote_count_a: 1, vote_count_b: 1 } as any);

    document.getElementById('vote-a')!.click();
    for (let i = 0; i < 30; i++) await Promise.resolve();

    expect(stateModule.state.voteCast).toBe(false);
  });
});

// TC-260-05: state.debateId is forwarded as p_debate_id to vote_arena_debate
describe('TC-260-05 — state.debateId is forwarded as p_debate_id to vote_arena_debate', () => {
  it('passes the exact debateId from state to the RPC p_debate_id param', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: null });

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

    const SPECIFIC_ID = 'ccdd1122-aaaa-bbbb-cccc-ddeeff001122';

    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = SPECIFIC_ID;
    stateModule.state.voteCast = false;

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    wireVoteButtons({ vote_count_a: 2, vote_count_b: 3 } as any);

    document.getElementById('vote-b')!.click();
    for (let i = 0; i < 30; i++) await Promise.resolve();

    const voteCall = mockRpc.mock.calls.find((c: unknown[]) => c[0] === 'vote_arena_debate');
    expect(voteCall).toBeDefined();
    expect((voteCall![1] as Record<string, string>).p_debate_id).toBe(SPECIFIC_ID);
  });
});

// TC-260-06: fresh data from get_arena_debate_spectator is used for updateVoteBar (not fallback)
describe('TC-260-06 — fresh data from get_arena_debate_spectator used for vote bar when available', () => {
  it('uses server-fresh vote counts rather than fallback d.vote_count_a/b', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();

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

    // vote_arena_debate succeeds; get_arena_debate_spectator returns fresh counts
    // Must satisfy the full Zod schema (all nullable fields present) to avoid DEV throw
    const freshData = {
      status: null, mode: null, topic: null,
      debater_a_name: null, debater_a_elo: null, debater_a_avatar: null,
      debater_b_name: null, debater_b_elo: null, debater_b_avatar: null,
      moderator_type: null, moderator_id: null, moderator_name: null,
      ruleset: null, spectator_count: null, current_round: null, total_rounds: null,
      vote_count_a: 10, vote_count_b: 5,
      score_a: null, score_b: null, winner: null, ai_scorecard: null,
    };
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_arena_debate_spectator') {
        return Promise.resolve({ data: freshData, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.debateId = 'debate-260-06';
    stateModule.state.voteCast = false;

    const { wireVoteButtons } = await import('../../src/pages/spectate.vote.ts');
    // d has different counts from the server-fresh data
    wireVoteButtons({ vote_count_a: 1, vote_count_b: 1 } as any);

    document.getElementById('vote-a')!.click();
    for (let i = 0; i < 30; i++) await Promise.resolve();

    const barA = document.getElementById('bar-a');
    const barB = document.getElementById('bar-b');
    // server fresh: 10a + 5b = 15 total → pctA=67%, pctB=33%
    expect(barA?.style.width).toBe('67%');
    expect(barB?.style.width).toBe('33%');
  });
});

// TC-260-07: ARCH — spectate.vote.ts imports state from spectate.state.ts
describe('TC-260-07 — ARCH: spectate.vote.ts imports state from spectate.state.ts', () => {
  it('has an import line containing state from spectate.state', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.vote.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const hasStateImport = importLines.some(
      (l: string) => l.includes('state') && l.includes('spectate.state')
    );
    expect(hasStateImport).toBe(true);
  });
});
