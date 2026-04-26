/**
 * Integration tests — src/arena/arena-room-end-finalize.ts
 * SEAM #279: arena-room-end-finalize → reference-arsenal (citeReference)
 * SEAM #280: arena-room-end-finalize → arena-types-results (UpdateDebateResult, EndOfDebateBreakdown)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// ARCH test
// ---------------------------------------------------------------------------
describe('ARCH: arena-room-end-finalize only imports from allowed modules', () => {
  it('imports no wall dependencies', async () => {
    const src = await import('../../src/arena/arena-room-end-finalize.ts?raw').then(m => m.default);
    const imports = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const bad = [
      'webrtc', 'arena-feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of imports) {
      for (const wall of bad) {
        expect(line).not.toContain(wall);
      }
    }
  });

  it('imports citeReference from reference-arsenal (#279)', async () => {
    const src = await import('../../src/arena/arena-room-end-finalize.ts?raw').then(m => m.default);
    const imports = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const hasArsenal = imports.some(l => l.includes('reference-arsenal') && l.includes('citeReference'));
    expect(hasArsenal).toBe(true);
  });

  it('imports UpdateDebateResult and EndOfDebateBreakdown from arena-types-results (#280)', async () => {
    const src = await import('../../src/arena/arena-room-end-finalize.ts?raw').then(m => m.default);
    const imports = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const hasResults = imports.some(l => l.includes('arena-types-results') && l.includes('UpdateDebateResult'));
    const hasBreakdown = imports.some(l => l.includes('arena-types-results') && l.includes('EndOfDebateBreakdown'));
    expect(hasResults).toBe(true);
    expect(hasBreakdown).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ArenaMod = typeof import('../../src/arena/arena-room-end-finalize.ts');

function makeDebate(overrides: Record<string, unknown> = {}): import('../../src/arena/arena-types.ts').CurrentDebate {
  return {
    id: 'debate-abc',
    mode: 'live',
    role: 'a',
    round: 1,
    ranked: true,
    ruleset: 'standard',
    tournament_match_id: null,
    ...overrides,
  } as unknown as import('../../src/arena/arena-types.ts').CurrentDebate;
}

function makeRef(referenceId: string) {
  return { reference_id: referenceId } as unknown as import('../../src/arena/arena-types-feed-room.ts').LoadoutReference;
}

// ---------------------------------------------------------------------------
// Module + mock state (re-wired each test)
// ---------------------------------------------------------------------------

let applyEndOfDebateModifiers: ArenaMod['applyEndOfDebateModifiers'];
let finalizeDebate: ArenaMod['finalizeDebate'];

let mockRpc: ReturnType<typeof vi.fn>;
let mockCiteReference: ReturnType<typeof vi.fn>;
let mockGetCurrentUser: ReturnType<typeof vi.fn>;
let mockGetCurrentProfile: ReturnType<typeof vi.fn>;
let mockClaimDebate: ReturnType<typeof vi.fn>;
let mockClaimAiSparring: ReturnType<typeof vi.fn>;
let mockSettleStakes: ReturnType<typeof vi.fn>;
let mockResolveTournamentMatch: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();

  mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
  mockCiteReference = vi.fn().mockResolvedValue({ action: 'cited' });
  mockGetCurrentUser = vi.fn().mockReturnValue({ id: 'user-001' });
  mockGetCurrentProfile = vi.fn().mockReturnValue({ username: 'tester' });
  mockClaimDebate = vi.fn().mockResolvedValue(undefined);
  mockClaimAiSparring = vi.fn().mockResolvedValue(undefined);
  mockSettleStakes = vi.fn().mockResolvedValue({ settled: true });
  mockResolveTournamentMatch = vi.fn().mockResolvedValue({ tournament_complete: false });

  vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
      auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
      rpc: (...args: unknown[]) => mockRpc(...args),
    }),
  }));

  vi.mock('../../src/auth.ts', () => ({
    safeRpc: (...args: unknown[]) => mockRpc(...args),
    getCurrentUser: () => mockGetCurrentUser(),
    getCurrentProfile: () => mockGetCurrentProfile(),
  }));

  vi.mock('../../src/reference-arsenal.ts', () => ({
    citeReference: (...args: unknown[]) => mockCiteReference(...args),
  }));

  vi.mock('../../src/tokens.ts', () => ({
    claimDebate: (...args: unknown[]) => mockClaimDebate(...args),
    claimAiSparring: (...args: unknown[]) => mockClaimAiSparring(...args),
  }));

  vi.mock('../../src/staking.ts', () => ({
    settleStakes: (...args: unknown[]) => mockSettleStakes(...args),
  }));

  vi.mock('../../src/tournaments.ts', () => ({
    resolveTournamentMatch: (...args: unknown[]) => mockResolveTournamentMatch(...args),
  }));

  vi.mock('../../src/contracts/rpc-schemas.ts', () => ({
    apply_end_of_debate_modifiers: {},
  }));

  vi.mock('../../src/config.ts', () => ({
    showToast: vi.fn(),
  }));

  const mod = await import('../../src/arena/arena-room-end-finalize.ts');
  applyEndOfDebateModifiers = mod.applyEndOfDebateModifiers;
  finalizeDebate = mod.finalizeDebate;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// SEAM #280 — arena-types-results: EndOfDebateBreakdown via applyEndOfDebateModifiers
// ---------------------------------------------------------------------------

describe('SEAM #280 — TC1: applyEndOfDebateModifiers calls apply_end_of_debate_modifiers RPC', () => {
  it('calls safeRpc with p_debate_id', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    const debate = makeDebate({ id: 'debate-xyz' });

    await applyEndOfDebateModifiers(debate, 10, 8);

    expect(mockRpc).toHaveBeenCalledWith(
      'apply_end_of_debate_modifiers',
      { p_debate_id: 'debate-xyz' },
      expect.anything(),
    );
  });
});

describe('SEAM #280 — TC2: EndOfDebateBreakdown scores applied for role=a', () => {
  it('scoreA from debater_a.final_score, scoreB from debater_b.final_score when role=a', async () => {
    const breakdown = {
      debater_a: { raw_score: 10, adjustments: [], final_score: 12 },
      debater_b: { raw_score: 8, adjustments: [], final_score: 7 },
    };
    mockRpc.mockResolvedValueOnce({ data: breakdown, error: null });

    const debate = makeDebate({ role: 'a' });
    const result = await applyEndOfDebateModifiers(debate, 10, 8);

    expect(result.scoreA).toBe(12);
    expect(result.scoreB).toBe(7);
    expect(result.breakdown).toEqual(breakdown);
  });
});

describe('SEAM #280 — TC3: EndOfDebateBreakdown scores swapped for role=b', () => {
  it('scoreA from debater_b.final_score, scoreB from debater_a.final_score when role=b', async () => {
    const breakdown = {
      debater_a: { raw_score: 10, adjustments: [], final_score: 12 },
      debater_b: { raw_score: 8, adjustments: [], final_score: 7 },
    };
    mockRpc.mockResolvedValueOnce({ data: breakdown, error: null });

    const debate = makeDebate({ role: 'b' });
    const result = await applyEndOfDebateModifiers(debate, 10, 8);

    // role=b means my score comes from debater_b's perspective (swapped)
    expect(result.scoreA).toBe(7);
    expect(result.scoreB).toBe(12);
  });
});

describe('SEAM #280 — TC4: UpdateDebateResult.winner is used as authoritative winner', () => {
  it('final winner from server overrides local winner', async () => {
    // First call: update_arena_debate; subsequent calls: settle_sentiment_tips etc.
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'server-winner-id' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-001', role: 'a', mode: 'live', ranked: false });
    const result = await finalizeDebate(debate, 'local-winner-id', 10, 8, [], null);

    expect(result.winner).toBe('server-winner-id');
  });
});

describe('SEAM #280 — TC5: UpdateDebateResult.vote_count_a/b used when local scores are null', () => {
  it('display scores come from server vote_count when local scores are null', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: { ranked: false, winner: 'winner-id', vote_count_a: 15, vote_count_b: 9 },
        error: null,
      })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-002', mode: 'live', ranked: false });
    const result = await finalizeDebate(debate, null, null, null, [], null);

    expect(result.scoreA).toBe(15);
    expect(result.scoreB).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// SEAM #279 — reference-arsenal: citeReference called per cited ref
// ---------------------------------------------------------------------------

describe('SEAM #279 — TC6: citeReference fires cite_reference for each ref in citedRefs', () => {
  it('calls citeReference with reference_id, debate_id, and win/loss outcome', async () => {
    // update_arena_debate returns winner = 'a' (same as debate.role = 'a' → win)
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-003', role: 'a', mode: 'live', ranked: false });
    const citedRefs = [makeRef('ref-111'), makeRef('ref-222')];

    await finalizeDebate(debate, 'a', 10, 8, citedRefs, null);

    // Allow microtasks (citeReference calls are fire-and-forget .catch())
    await vi.runAllTimersAsync();

    expect(mockCiteReference).toHaveBeenCalledTimes(2);
    expect(mockCiteReference).toHaveBeenCalledWith('ref-111', 'debate-003', 'win');
    expect(mockCiteReference).toHaveBeenCalledWith('ref-222', 'debate-003', 'win');
  });

  it('uses loss outcome when debate.role !== winner', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'b' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-004', role: 'a', mode: 'live', ranked: false });
    const citedRefs = [makeRef('ref-333')];

    await finalizeDebate(debate, 'b', 5, 12, citedRefs, null);

    await vi.runAllTimersAsync();

    expect(mockCiteReference).toHaveBeenCalledWith('ref-333', 'debate-004', 'loss');
  });
});

describe('SEAM #279 — TC7: citeReference NOT called when citedRefs is empty', () => {
  it('does not call citeReference when no refs were cited', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-005', role: 'a', mode: 'live', ranked: false });

    await finalizeDebate(debate, 'a', 10, 8, [], null);

    await vi.runAllTimersAsync();

    expect(mockCiteReference).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// SEAM #317 — tokens: claimDebate / claimAiSparring called from finalizeDebate
// ---------------------------------------------------------------------------

// ARCH: source imports claimDebate and claimAiSparring from tokens.ts
describe('SEAM #317 — ARCH: arena-room-end-finalize imports claimDebate and claimAiSparring from tokens', () => {
  it('imports claimDebate and claimAiSparring from ../tokens.ts', async () => {
    const src = await import('../../src/arena/arena-room-end-finalize.ts?raw').then((m: { default: string }) => m.default);
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const tokensLine = importLines.find((l: string) => /['"]\.\.\/tokens(\.ts)?['"]/.test(l));
    expect(tokensLine).toBeDefined();
    expect(tokensLine).toContain('claimDebate');
    expect(tokensLine).toContain('claimAiSparring');
  });
});

// TC317-1: claimDebate called with debateId when mode !== 'ai' and ruleset !== 'unplugged'
describe('SEAM #317 — TC317-1: claimDebate called for non-AI standard debate', () => {
  it('calls claimDebate(debate.id) when mode=live, ruleset=standard', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-token-1', mode: 'live', ruleset: 'standard', ranked: false });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockClaimDebate).toHaveBeenCalledWith('debate-token-1');
    expect(mockClaimAiSparring).not.toHaveBeenCalled();
  });
});

// TC317-2: claimAiSparring called with debateId when mode === 'ai' and ruleset !== 'unplugged'
describe('SEAM #317 — TC317-2: claimAiSparring called for AI sparring debate', () => {
  it('calls claimAiSparring(debate.id) when mode=ai, ruleset=standard', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-token-2', mode: 'ai', ruleset: 'standard', ranked: false });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockClaimAiSparring).toHaveBeenCalledWith('debate-token-2');
    expect(mockClaimDebate).not.toHaveBeenCalled();
  });
});

// TC317-3: neither claimDebate nor claimAiSparring called when ruleset === 'unplugged'
describe('SEAM #317 — TC317-3: no token claim when ruleset is unplugged', () => {
  it('does not call claimDebate or claimAiSparring when ruleset=unplugged', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-token-3', mode: 'live', ruleset: 'unplugged', ranked: false });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockClaimDebate).not.toHaveBeenCalled();
    expect(mockClaimAiSparring).not.toHaveBeenCalled();
  });
});

// TC317-4: claimDebate called for text-battle mode (non-ai, non-unplugged)
describe('SEAM #317 — TC317-4: claimDebate called for text-battle mode debate', () => {
  it('calls claimDebate when mode=text, ruleset=standard', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-token-4', mode: 'text', ruleset: 'standard', ranked: false });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockClaimDebate).toHaveBeenCalledWith('debate-token-4');
    expect(mockClaimAiSparring).not.toHaveBeenCalled();
  });
});

// TC317-5: claimAiSparring called once, not claimDebate, for ai+ranked debate
describe('SEAM #317 — TC317-5: claimAiSparring called for ranked AI sparring', () => {
  it('calls claimAiSparring for ai+ranked, not claimDebate', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: true, winner: 'a', elo_change_a: 10, elo_change_b: -10 }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-token-5', mode: 'ai', ruleset: 'standard', ranked: true });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockClaimAiSparring).toHaveBeenCalledWith('debate-token-5');
    expect(mockClaimDebate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// SEAM #373 — arena-types-ai-scoring: AIScoreResult used in finalizeDebate
// ---------------------------------------------------------------------------

describe('SEAM #373 — ARCH: arena-room-end-finalize imports AIScoreResult from arena-types-ai-scoring', () => {
  it('imports AIScoreResult from ./arena-types-ai-scoring', async () => {
    const src = await import('../../src/arena/arena-room-end-finalize.ts?raw').then((m: { default: string }) => m.default);
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const line = importLines.find((l: string) => l.includes('arena-types-ai-scoring'));
    expect(line).toBeDefined();
    expect(line).toContain('AIScoreResult');
  });
});

// Helper: build a valid AIScoreResult
function makeAIScores(overrides: Partial<import('../../src/arena/arena-types-ai-scoring.ts').AIScoreResult> = {}): import('../../src/arena/arena-types-ai-scoring.ts').AIScoreResult {
  const side = (): import('../../src/arena/arena-types-ai-scoring.ts').SideScores => ({
    logic:    { score: 8, reason: 'Strong logic' },
    evidence: { score: 7, reason: 'Good evidence' },
    delivery: { score: 9, reason: 'Clear delivery' },
    rebuttal: { score: 6, reason: 'Solid rebuttal' },
  });
  return {
    side_a: side(),
    side_b: side(),
    overall_winner: 'a',
    verdict: 'Side A argued more persuasively.',
    ...overrides,
  };
}

// TC373-1: save_ai_scorecard called with p_debate_id and full AIScoreResult payload
describe('SEAM #373 — TC373-1: save_ai_scorecard called when aiScores is provided', () => {
  it('calls safeRpc save_ai_scorecard with p_debate_id and p_scorecard', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null }) // update_arena_debate
      .mockResolvedValue({ data: null, error: null });                               // all subsequent RPCs

    const debate = makeDebate({ id: 'debate-ai-1', mode: 'ai', ruleset: 'standard', ranked: false });
    const aiScores = makeAIScores();

    await finalizeDebate(debate, 'a', 10, 8, [], aiScores);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockRpc).toHaveBeenCalledWith('save_ai_scorecard', {
      p_debate_id: 'debate-ai-1',
      p_scorecard: aiScores,
    });
  });
});

// TC373-2: save_ai_scorecard NOT called when aiScores is null
describe('SEAM #373 — TC373-2: save_ai_scorecard skipped when aiScores is null', () => {
  it('does not call save_ai_scorecard when aiScores is null', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-ai-2', mode: 'live', ruleset: 'standard', ranked: false });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    const saveCall = (mockRpc.mock.calls as [string, unknown][]).find(
      ([name]) => name === 'save_ai_scorecard',
    );
    expect(saveCall).toBeUndefined();
  });
});

// TC373-3: AIScoreResult.overall_winner does not override winner returned by update_arena_debate
describe('SEAM #373 — TC373-3: server winner from update_arena_debate is authoritative (not aiScores.overall_winner)', () => {
  it('finalizeDebate returns server winner, ignores aiScores.overall_winner', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'server-side-b' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-ai-3', mode: 'ai', ruleset: 'standard', ranked: false });
    const aiScores = makeAIScores({ overall_winner: 'a' }); // AI says 'a' won

    const result = await finalizeDebate(debate, 'a', 10, 8, [], aiScores);
    await vi.advanceTimersByTimeAsync(100);

    // Server said 'server-side-b'; that should be the returned winner
    expect(result.winner).toBe('server-side-b');
  });
});

// TC373-4: AIScoreResult with all 4 CriterionScore fields preserved in p_scorecard
describe('SEAM #373 — TC373-4: full SideScores structure (logic/evidence/delivery/rebuttal) passed to save_ai_scorecard', () => {
  it('p_scorecard contains all criterion fields for both sides', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'b' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-ai-4', mode: 'ai', ruleset: 'standard', ranked: false });
    const aiScores = makeAIScores({
      overall_winner: 'b',
      verdict: 'Side B was superior.',
    });

    await finalizeDebate(debate, 'b', 5, 12, [], aiScores);
    await vi.advanceTimersByTimeAsync(100);

    const saveCall = (mockRpc.mock.calls as [string, Record<string, unknown>][]).find(
      ([name]) => name === 'save_ai_scorecard',
    );
    expect(saveCall).toBeDefined();
    const scorecard = saveCall![1].p_scorecard as typeof aiScores;
    expect(scorecard.side_a.logic.score).toBe(8);
    expect(scorecard.side_a.evidence.score).toBe(7);
    expect(scorecard.side_a.delivery.score).toBe(9);
    expect(scorecard.side_a.rebuttal.score).toBe(6);
    expect(scorecard.side_b.logic.score).toBe(8);
    expect(scorecard.verdict).toBe('Side B was superior.');
    expect(scorecard.overall_winner).toBe('b');
  });
});

// TC373-5: save_ai_scorecard still called even when ruleset is 'unplugged'
describe('SEAM #373 — TC373-5: save_ai_scorecard called regardless of ruleset', () => {
  it('calls save_ai_scorecard even when ruleset=unplugged', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-ai-5', mode: 'ai', ruleset: 'unplugged', ranked: false });
    const aiScores = makeAIScores();

    await finalizeDebate(debate, 'a', 10, 8, [], aiScores);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockRpc).toHaveBeenCalledWith('save_ai_scorecard', {
      p_debate_id: 'debate-ai-5',
      p_scorecard: aiScores,
    });
  });
});

// TC373-6: save_ai_scorecard failure is non-fatal — finalizeDebate still returns result
describe('SEAM #373 — TC373-6: save_ai_scorecard failure is non-fatal', () => {
  it('returns FinalizeResult even when save_ai_scorecard throws', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null }) // update_arena_debate
      .mockRejectedValueOnce(new Error('scorecard save failed'))                    // save_ai_scorecard
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-ai-6', mode: 'ai', ruleset: 'standard', ranked: false });
    const aiScores = makeAIScores();

    const result = await finalizeDebate(debate, 'a', 10, 8, [], aiScores);
    await vi.advanceTimersByTimeAsync(100);

    expect(result.winner).toBe('a');
    expect(result.scoreA).toBe(10);
    expect(result.scoreB).toBe(8);
  });
});

// TC373-7: applyEndOfDebateModifiers returns original scores when RPC returns null data
describe('SEAM #373 — TC373-7: applyEndOfDebateModifiers returns original scores when RPC returns no data', () => {
  it('passes through original scoreA/scoreB when data is null', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-ai-7', role: 'a' });
    const result = await applyEndOfDebateModifiers(debate, 42, 37);

    expect(result.scoreA).toBe(42);
    expect(result.scoreB).toBe(37);
    expect(result.breakdown).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SEAM #468 — staking: settleStakes called from finalizeDebate
// ---------------------------------------------------------------------------

// ARCH: source imports settleStakes from ../staking.ts
describe('SEAM #468 — ARCH: arena-room-end-finalize imports settleStakes from staking', () => {
  it('imports settleStakes from ../staking.ts', async () => {
    const src = await import('../../src/arena/arena-room-end-finalize.ts?raw').then((m: { default: string }) => m.default);
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const stakingLine = importLines.find((l: string) => /['"]\.\.\/staking(\.ts)?['"]/.test(l));
    expect(stakingLine).toBeDefined();
    expect(stakingLine).toContain('settleStakes');
  });
});

// TC468-1: settleStakes called with debate.id when ruleset !== 'unplugged'
describe('SEAM #468 — TC468-1: settleStakes called with debate.id for standard ruleset', () => {
  it('calls settleStakes(debate.id) when ruleset=standard', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-stake-1', mode: 'live', ruleset: 'standard', ranked: false });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockSettleStakes).toHaveBeenCalledWith('debate-stake-1');
  });
});

// TC468-2: settleStakes NOT called when ruleset === 'unplugged'
describe('SEAM #468 — TC468-2: settleStakes skipped for unplugged ruleset', () => {
  it('does not call settleStakes when ruleset=unplugged', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-stake-2', mode: 'live', ruleset: 'unplugged', ranked: false });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockSettleStakes).not.toHaveBeenCalled();
  });
});

// TC468-3: _stakingResult set on debate object after settleStakes resolves
describe('SEAM #468 — TC468-3: debate._stakingResult populated with settleStakes result', () => {
  it('sets debate._stakingResult to the SettleResult returned by settleStakes', async () => {
    const fakeSettle = { success: true, winners_paid: 3, total_paid: 150 };
    mockSettleStakes.mockResolvedValueOnce(fakeSettle);

    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-stake-3', mode: 'live', ruleset: 'standard', ranked: false });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((debate as any)._stakingResult).toEqual(fakeSettle);
  });
});

// TC468-4: settleStakes called once per finalizeDebate invocation
describe('SEAM #468 — TC468-4: settleStakes called exactly once per finalizeDebate', () => {
  it('settleStakes is called exactly once for a single finalizeDebate call', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-stake-4', mode: 'live', ruleset: 'standard', ranked: false });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockSettleStakes).toHaveBeenCalledTimes(1);
  });
});

// TC468-5: settleStakes failure is non-fatal — finalizeDebate still returns FinalizeResult
describe('SEAM #468 — TC468-5: settleStakes failure is non-fatal', () => {
  it('returns FinalizeResult even when settleStakes throws', async () => {
    mockSettleStakes.mockRejectedValueOnce(new Error('stakes exploded'));

    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'b' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-stake-5', mode: 'live', ruleset: 'standard', ranked: false });

    const result = await finalizeDebate(debate, 'b', 5, 12, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(result.winner).toBe('b');
    expect(result.scoreA).toBe(5);
    expect(result.scoreB).toBe(12);
  });
});

// TC468-6: settleStakes called for AI sparring mode (ruleset=standard) as well
describe('SEAM #468 — TC468-6: settleStakes called for AI sparring when ruleset=standard', () => {
  it('calls settleStakes for mode=ai, ruleset=standard', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({ id: 'debate-stake-6', mode: 'ai', ruleset: 'standard', ranked: false });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockSettleStakes).toHaveBeenCalledWith('debate-stake-6');
  });
});

// ---------------------------------------------------------------------------
// SEAM #525 — tournaments: resolveTournamentMatch called from finalizeDebate
// ---------------------------------------------------------------------------

// ARCH: source imports resolveTournamentMatch from ../tournaments.ts
describe('SEAM #525 — ARCH: arena-room-end-finalize imports resolveTournamentMatch from tournaments', () => {
  it('imports resolveTournamentMatch from ../tournaments.ts', async () => {
    const src = await import('../../src/arena/arena-room-end-finalize.ts?raw').then((m: { default: string }) => m.default);
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const line = importLines.find((l: string) => /['"]\.\.\/tournaments(\.ts)?['"]/.test(l));
    expect(line).toBeDefined();
    expect(line).toContain('resolveTournamentMatch');
  });
});

// TC525-1: resolveTournamentMatch called with matchId and winner when tournament_match_id is set
describe('SEAM #525 — TC525-1: resolveTournamentMatch called when tournament_match_id is set', () => {
  it('calls resolveTournamentMatch(tournament_match_id, winner)', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });
    mockResolveTournamentMatch.mockResolvedValueOnce({ success: true, tournament_complete: false });

    const debate = makeDebate({
      id: 'debate-tourn-1',
      mode: 'live',
      ruleset: 'standard',
      ranked: true,
      tournament_match_id: 'match-001',
    });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockResolveTournamentMatch).toHaveBeenCalledWith('match-001', 'a');
  });
});

// TC525-2: resolveTournamentMatch NOT called when tournament_match_id is null
describe('SEAM #525 — TC525-2: resolveTournamentMatch skipped when tournament_match_id is null', () => {
  it('does not call resolveTournamentMatch when tournament_match_id is null', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({
      id: 'debate-tourn-2',
      mode: 'live',
      ruleset: 'standard',
      ranked: true,
      tournament_match_id: null,
    });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockResolveTournamentMatch).not.toHaveBeenCalled();
  });
});

// TC525-3: resolveTournamentMatch NOT called when winner is null
describe('SEAM #525 — TC525-3: resolveTournamentMatch skipped when winner is null', () => {
  it('does not call resolveTournamentMatch when winner is null', async () => {
    // update_arena_debate returns no winner
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: null }, error: null })
      .mockResolvedValue({ data: null, error: null });

    const debate = makeDebate({
      id: 'debate-tourn-3',
      mode: 'live',
      ruleset: 'standard',
      ranked: true,
      tournament_match_id: 'match-003',
    });

    await finalizeDebate(debate, null, 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockResolveTournamentMatch).not.toHaveBeenCalled();
  });
});

// TC525-4: showToast fired with tournament-complete message when tournament_complete is true
describe('SEAM #525 — TC525-4: showToast fires tournament-complete message when tournament_complete=true', () => {
  it('calls showToast with success toast when tournament resolves as complete', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });
    mockResolveTournamentMatch.mockResolvedValueOnce({ success: true, tournament_complete: true });

    const debate = makeDebate({
      id: 'debate-tourn-4',
      mode: 'live',
      ruleset: 'standard',
      ranked: true,
      tournament_match_id: 'match-004',
    });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    // resolveTournamentMatch is fire-and-forget .then(); flush microtasks + timers
    await vi.advanceTimersByTimeAsync(100);

    const { showToast } = await import('../../src/config.ts');
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('Tournament complete'),
      'success',
    );
  });
});

// TC525-5: showToast NOT called when tournament_complete is false
describe('SEAM #525 — TC525-5: showToast NOT called when tournament_complete=false', () => {
  it('does not fire tournament-complete toast when tournament is not yet complete', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: null });
    mockResolveTournamentMatch.mockResolvedValueOnce({ success: true, tournament_complete: false });

    const debate = makeDebate({
      id: 'debate-tourn-5',
      mode: 'live',
      ruleset: 'standard',
      ranked: true,
      tournament_match_id: 'match-005',
    });

    await finalizeDebate(debate, 'a', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    const { showToast } = await import('../../src/config.ts');
    expect(showToast).not.toHaveBeenCalled();
  });
});

// TC525-6: resolveTournamentMatch failure is non-fatal — finalizeDebate still returns FinalizeResult
describe('SEAM #525 — TC525-6: resolveTournamentMatch failure is non-fatal', () => {
  it('returns FinalizeResult even when resolveTournamentMatch rejects', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'b' }, error: null })
      .mockResolvedValue({ data: null, error: null });
    mockResolveTournamentMatch.mockRejectedValueOnce(new Error('tournament RPC exploded'));

    const debate = makeDebate({
      id: 'debate-tourn-6',
      mode: 'live',
      ruleset: 'standard',
      ranked: true,
      tournament_match_id: 'match-006',
    });

    const result = await finalizeDebate(debate, 'b', 5, 12, [], null);
    await vi.advanceTimersByTimeAsync(100);

    expect(result.winner).toBe('b');
    expect(result.scoreA).toBe(5);
    expect(result.scoreB).toBe(12);
  });
});

// TC525-7: authoritative winner from server passed to resolveTournamentMatch (not local winner arg)
describe('SEAM #525 — TC525-7: server-authoritative winner is used in resolveTournamentMatch call', () => {
  it('passes server winner to resolveTournamentMatch when server overrides local winner', async () => {
    // Server returns a different winner than what was passed in
    mockRpc
      .mockResolvedValueOnce({ data: { ranked: false, winner: 'server-winner' }, error: null })
      .mockResolvedValue({ data: null, error: null });
    mockResolveTournamentMatch.mockResolvedValueOnce({ success: true, tournament_complete: false });

    const debate = makeDebate({
      id: 'debate-tourn-7',
      mode: 'live',
      ruleset: 'standard',
      ranked: true,
      tournament_match_id: 'match-007',
    });

    await finalizeDebate(debate, 'local-winner', 10, 8, [], null);
    await vi.advanceTimersByTimeAsync(100);

    // The code re-assigns winner = r.winner (server side), so resolveTournamentMatch
    // must be called with 'server-winner', not 'local-winner'
    expect(mockResolveTournamentMatch).toHaveBeenCalledWith('match-007', 'server-winner');
  });
});
