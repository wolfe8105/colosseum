/**
 * Tests for src/pages/spectate.vote.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockClaimVote = vi.hoisted(() => vi.fn());
const mockNudge = vi.hoisted(() => vi.fn());
const mockState = vi.hoisted(() => ({
  voteCast: false,
  debateId: 'debate-1',
}));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_arena_debate_spectator: {},
}));

vi.mock('../src/tokens.ts', () => ({
  claimVote: mockClaimVote,
}));

vi.mock('../src/nudge.ts', () => ({
  nudge: mockNudge,
}));

vi.mock('../src/pages/spectate.state.ts', () => ({
  get state() { return mockState; },
}));

function buildDOM() {
  document.body.innerHTML = `
    <button id="vote-a">Side A</button>
    <button id="vote-b">Side B</button>
    <div id="vote-results"></div>
    <div id="bar-a" style="width:50%">50%</div>
    <div id="bar-b" style="width:50%">50%</div>
    <div id="vote-count"></div>
    <div id="pulse-a" style="width:50%">—</div>
    <div id="pulse-b" style="width:50%">—</div>
    <div class="pulse-empty">No votes yet</div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  mockState.voteCast = false;
  mockState.debateId = 'debate-1';
  mockSafeRpc.mockResolvedValue({ data: null, error: null });
});

import { wireVoteButtons, updateVoteBar, updatePulse } from '../src/pages/spectate.vote.ts';

const makeDebate = () => ({ id: 'debate-1', vote_count_a: 5, vote_count_b: 3 } as never);

describe('wireVoteButtons — registers click handlers', () => {
  it('TC1: clicking vote-a calls safeRpc("vote_arena_debate") with side "a"', async () => {
    wireVoteButtons(makeDebate());
    document.getElementById('vote-a')!.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockSafeRpc).toHaveBeenCalledWith('vote_arena_debate', expect.objectContaining({ p_vote: 'a' }));
  });

  it('TC2: clicking vote-b calls safeRpc("vote_arena_debate") with side "b"', async () => {
    wireVoteButtons(makeDebate());
    document.getElementById('vote-b')!.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockSafeRpc).toHaveBeenCalledWith('vote_arena_debate', expect.objectContaining({ p_vote: 'b' }));
  });

  it('TC3: disables both buttons after voting', async () => {
    wireVoteButtons(makeDebate());
    document.getElementById('vote-a')!.click();
    await Promise.resolve();
    expect((document.getElementById('vote-a') as HTMLButtonElement).disabled).toBe(true);
    expect((document.getElementById('vote-b') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('wireVoteButtons — prevents double vote', () => {
  it('TC4: second click does not call safeRpc again when voteCast is true', async () => {
    mockState.voteCast = true;
    wireVoteButtons(makeDebate());
    document.getElementById('vote-a')!.click();
    await Promise.resolve();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('wireVoteButtons — server error resets state', () => {
  it('TC5: resets voteCast and re-enables buttons when server returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'already voted' } });
    wireVoteButtons(makeDebate());
    document.getElementById('vote-a')!.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockState.voteCast).toBe(false);
    expect((document.getElementById('vote-a') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('updateVoteBar — renders vote percentages', () => {
  it('TC6: shows correct percentages with 3A 1B (75/25)', () => {
    updateVoteBar(3, 1);
    expect(document.getElementById('bar-a')!.textContent).toBe('75%');
    expect(document.getElementById('bar-b')!.textContent).toBe('25%');
  });

  it('TC7: shows vote count text', () => {
    updateVoteBar(2, 3);
    expect(document.getElementById('vote-count')!.textContent).toBe('5 votes');
  });

  it('TC8: handles zero votes (uses fallback total 1)', () => {
    updateVoteBar(0, 0);
    expect(document.getElementById('bar-a')!.textContent).toBe('0%');
    expect(document.getElementById('bar-b')!.textContent).toBe('100%');
  });
});

describe('updatePulse — renders audience gauge', () => {
  it('TC9: shows 50/50 dashes when total is 0', () => {
    updatePulse(0, 0);
    expect(document.getElementById('pulse-a')!.textContent).toBe('—');
    expect(document.getElementById('pulse-b')!.textContent).toBe('—');
  });

  it('TC10: renders correct percentages with votes', () => {
    updatePulse(3, 1);
    expect(document.getElementById('pulse-a')!.textContent).toBe('75%');
    expect(document.getElementById('pulse-b')!.textContent).toBe('25%');
  });

  it('TC11: removes pulse-empty element once votes appear', () => {
    updatePulse(1, 0);
    expect(document.querySelector('.pulse-empty')).toBeNull();
  });
});

describe('ARCH — src/pages/spectate.vote.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../contracts/rpc-schemas.ts', '../tokens.ts', '../nudge.ts', './spectate.state.ts', './spectate.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/spectate.vote.ts'),
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
