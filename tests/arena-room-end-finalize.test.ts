import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockGetCurrentUser = vi.hoisted(() => vi.fn().mockReturnValue({ id: 'user-1' }));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn().mockReturnValue({ username: 'alice' }));
const mockApplyEndModSchema = vi.hoisted(() => ({}));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockCiteReference = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockClaimDebate = vi.hoisted(() => vi.fn());
const mockClaimAiSparring = vi.hoisted(() => vi.fn());
const mockSettleStakes = vi.hoisted(() => vi.fn().mockResolvedValue({ payout: 10 }));
const mockResolveTournamentMatch = vi.hoisted(() => vi.fn().mockResolvedValue({ tournament_complete: false }));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  apply_end_of_debate_modifiers: mockApplyEndModSchema,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

vi.mock('../src/reference-arsenal.ts', () => ({
  citeReference: mockCiteReference,
}));

vi.mock('../src/tokens.ts', () => ({
  claimDebate: mockClaimDebate,
  claimAiSparring: mockClaimAiSparring,
}));

vi.mock('../src/staking.ts', () => ({
  settleStakes: mockSettleStakes,
}));

vi.mock('../src/tournaments.ts', () => ({
  resolveTournamentMatch: mockResolveTournamentMatch,
}));

import { applyEndOfDebateModifiers, finalizeDebate } from '../src/arena/arena-room-end-finalize.ts';

const baseDebate = {
  id: 'debate-1',
  topic: 'Test',
  role: 'a' as const,
  mode: 'text' as const,
  round: 3,
  totalRounds: 3,
  opponentName: 'Bob',
  opponentId: 'opp-uuid',
  opponentElo: 1100,
  ranked: false,
  ruleset: 'standard',
  modView: false,
};

describe('TC1 — applyEndOfDebateModifiers calls safeRpc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls safeRpc with apply_end_of_debate_modifiers', async () => {
    await applyEndOfDebateModifiers({ ...baseDebate }, 80, 60);
    expect(mockSafeRpc).toHaveBeenCalledWith('apply_end_of_debate_modifiers', { p_debate_id: 'debate-1' }, mockApplyEndModSchema);
  });

  it('returns original scores when RPC returns no data', async () => {
    const result = await applyEndOfDebateModifiers({ ...baseDebate }, 80, 60);
    expect(result.scoreA).toBe(80);
    expect(result.scoreB).toBe(60);
    expect(result.breakdown).toBeNull();
  });

  it('overrides scores from breakdown for role a', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: { debater_a: { final_score: 90 }, debater_b: { final_score: 50 } },
      error: null,
    });
    const result = await applyEndOfDebateModifiers({ ...baseDebate, role: 'a' }, 80, 60);
    expect(result.scoreA).toBe(90);
    expect(result.scoreB).toBe(50);
  });

  it('swaps scores from breakdown for role b', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: { debater_a: { final_score: 90 }, debater_b: { final_score: 50 } },
      error: null,
    });
    const result = await applyEndOfDebateModifiers({ ...baseDebate, role: 'b' }, 80, 60);
    // role b: scoreA = debater_b.final_score, scoreB = debater_a.final_score
    expect(result.scoreA).toBe(50);
    expect(result.scoreB).toBe(90);
  });
});

describe('TC2 — finalizeDebate calls update_arena_debate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls safeRpc with update_arena_debate complete status', async () => {
    await finalizeDebate({ ...baseDebate }, 'a', 80, 60, [], null);
    expect(mockSafeRpc).toHaveBeenCalledWith('update_arena_debate', expect.objectContaining({
      p_status: 'complete',
      p_winner: 'a',
    }));
  });

  it('returns eloChangeMe from server for ranked debates', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: { winner: 'a', ranked: true, elo_change_a: 20, elo_change_b: -20 },
      error: null,
    });
    const result = await finalizeDebate({ ...baseDebate, ranked: true, role: 'a' }, 'a', 80, 60, [], null);
    expect(result.eloChangeMe).toBe(20);
  });

  it('returns winner from server', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: { winner: 'b', ranked: false },
      error: null,
    });
    const result = await finalizeDebate({ ...baseDebate }, null, null, null, [], null);
    expect(result.winner).toBe('b');
  });
});

describe('TC3 — finalizeDebate calls claimDebate for non-ai mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls claimDebate for text mode', async () => {
    await finalizeDebate({ ...baseDebate, mode: 'text' }, 'a', 80, 60, [], null);
    expect(mockClaimDebate).toHaveBeenCalledWith('debate-1');
  });

  it('calls claimAiSparring for ai mode', async () => {
    await finalizeDebate({ ...baseDebate, mode: 'ai' }, 'a', 80, 60, [], null);
    expect(mockClaimAiSparring).toHaveBeenCalledWith('debate-1');
  });

  it('does not call claimDebate for unplugged mode', async () => {
    await finalizeDebate({ ...baseDebate, ruleset: 'unplugged' }, 'a', 80, 60, [], null);
    expect(mockClaimDebate).not.toHaveBeenCalled();
  });
});

describe('TC4 — finalizeDebate cites references for winner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls citeReference for each cited ref when winner known', async () => {
    const citedRefs = [{ reference_id: 'ref-1' }, { reference_id: 'ref-2' }] as never[];
    await finalizeDebate({ ...baseDebate, role: 'a' }, 'a', 80, 60, citedRefs, null);
    expect(mockCiteReference).toHaveBeenCalledTimes(2);
    expect(mockCiteReference).toHaveBeenCalledWith('ref-1', 'debate-1', 'win');
    expect(mockCiteReference).toHaveBeenCalledWith('ref-2', 'debate-1', 'win');
  });

  it('calls citeReference with loss when role lost', async () => {
    const citedRefs = [{ reference_id: 'ref-1' }] as never[];
    await finalizeDebate({ ...baseDebate, role: 'a' }, 'b', 60, 80, citedRefs, null);
    expect(mockCiteReference).toHaveBeenCalledWith('ref-1', 'debate-1', 'loss');
  });
});

describe('TC5 — finalizeDebate saves AI scorecard when present', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls safeRpc save_ai_scorecard when aiScores provided', async () => {
    const aiScores = { summary: 'Good debate' } as never;
    await finalizeDebate({ ...baseDebate }, 'a', 80, 60, [], aiScores);
    expect(mockSafeRpc).toHaveBeenCalledWith('save_ai_scorecard', expect.objectContaining({
      p_debate_id: 'debate-1',
      p_scorecard: aiScores,
    }));
  });
});

describe('ARCH — arena-room-end-finalize.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../config.ts',
      '../reference-arsenal.ts',
      '../tokens.ts',
      '../staking.ts',
      '../tournaments.ts',
      './arena-types.ts',
      './arena-types-ai-scoring.ts',
      './arena-types-results.ts',
      './arena-types-feed-room.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-end-finalize.ts'),
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
