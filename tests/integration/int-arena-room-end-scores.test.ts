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

// Mock requestAIScoring and sumSideScore from arena-room-ai-scoring
const mockRequestAIScoring = vi.hoisted(() => vi.fn());
const mockSumSideScore = vi.hoisted(() => vi.fn());

vi.mock('../../src/arena/arena-room-ai-scoring.ts', () => ({
  requestAIScoring: mockRequestAIScoring,
  sumSideScore: mockSumSideScore,
}));

// Mock arena-room-ai-response (used by arena-room-ai-scoring)
vi.mock('../../src/arena/arena-room-ai-response.ts', () => ({
  getUserJwt: vi.fn().mockResolvedValue('mock-jwt'),
}));

// Minimal CurrentDebate factory
function makeDebate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'debate-123',
    mode: 'ai' as const,
    topic: 'AI is good',
    round: 3,
    messages: [],
    opponentId: null,
    concededBy: null,
    ...overrides,
  };
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRequestAIScoring.mockReset();
  mockSumSideScore.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = '<div id="screen-main"></div>';
});

// ─── TC1: Concede by side A → winner is 'b' ──────────────────────────────────
describe('TC1 — concede by side A returns winner b', () => {
  it('sets winner to b when concededBy is a', async () => {
    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({ concededBy: 'a' });
    const result = await generateScores(debate as never);
    expect(result.winner).toBe('b');
    expect(result.scoreA).toBeNull();
    expect(result.scoreB).toBeNull();
    expect(result.aiScores).toBeNull();
  });
});

// ─── TC2: Concede by side B → winner is 'a' ──────────────────────────────────
describe('TC2 — concede by side B returns winner a', () => {
  it('sets winner to a when concededBy is b', async () => {
    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({ concededBy: 'b' });
    const result = await generateScores(debate as never);
    expect(result.winner).toBe('a');
    expect(result.scoreA).toBeNull();
    expect(result.scoreB).toBeNull();
  });
});

// ─── TC3: No RPC called on concede path ──────────────────────────────────────
describe('TC3 — concede path makes no RPC calls', () => {
  it('does not call supabase rpc on concede', async () => {
    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({ concededBy: 'a' });
    await generateScores(debate as never);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ─── TC4: AI mode with messages, scoring succeeds → winner from scores ────────
describe('TC4 — AI mode with messages, scoring succeeds', () => {
  it('calls requestAIScoring and derives winner from sumSideScore', async () => {
    const screenEl = document.createElement('div');
    screenEl.id = 'arena-screen';
    document.body.appendChild(screenEl);

    // Set screenEl in arena-state
    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_screenEl(screenEl);

    mockRequestAIScoring.mockResolvedValue({
      side_a: { logic: { score: 8, reason: 'good' }, evidence: { score: 7, reason: 'ok' }, delivery: { score: 9, reason: 'great' }, rebuttal: { score: 6, reason: 'meh' } },
      side_b: { logic: { score: 5, reason: 'weak' }, evidence: { score: 4, reason: 'poor' }, delivery: { score: 6, reason: 'ok' }, rebuttal: { score: 5, reason: 'ok' } },
      verdict: 'Side A wins',
    });
    // sumSideScore: side_a = 30, side_b = 20
    mockSumSideScore.mockReturnValueOnce(30).mockReturnValueOnce(20);

    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({
      mode: 'ai',
      messages: [{ role: 'a', text: 'hello' }],
      round: 2,
    });
    const result = await generateScores(debate as never);

    expect(mockRequestAIScoring).toHaveBeenCalledWith('AI is good', debate.messages);
    expect(result.aiScores).not.toBeNull();
    expect(result.scoreA).toBe(30);
    expect(result.scoreB).toBe(20);
    expect(result.winner).toBe('a');
  });
});

// ─── TC5: AI mode with messages, scoring fails → random scores ───────────────
describe('TC5 — AI mode with messages, scoring returns null → random fallback', () => {
  it('returns random scores 60-89 and a winner when AI scoring returns null', async () => {
    const screenEl = document.createElement('div');
    screenEl.id = 'arena-screen-2';
    document.body.appendChild(screenEl);

    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_screenEl(screenEl);

    mockRequestAIScoring.mockResolvedValue(null);

    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({
      mode: 'ai',
      messages: [{ role: 'a', text: 'hello' }],
      round: 1,
    });
    const result = await generateScores(debate as never);

    expect(result.aiScores).toBeNull();
    expect(result.scoreA).not.toBeNull();
    expect(result.scoreB).not.toBeNull();
    expect(result.scoreA!).toBeGreaterThanOrEqual(60);
    expect(result.scoreA!).toBeLessThan(90);
    expect(result.scoreB!).toBeGreaterThanOrEqual(60);
    expect(result.scoreB!).toBeLessThan(90);
    expect(result.winner).toMatch(/^[ab]$/);
  });
});

// ─── TC6: AI mode with no messages → random scores, no AI call ───────────────
describe('TC6 — AI mode with empty messages skips judging UI and AI scoring call', () => {
  it('returns random scores without calling requestAIScoring', async () => {
    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({ mode: 'ai', messages: [], opponentId: null });
    const result = await generateScores(debate as never);

    expect(mockRequestAIScoring).not.toHaveBeenCalled();
    expect(result.scoreA).not.toBeNull();
    expect(result.scoreB).not.toBeNull();
    expect(result.winner).toMatch(/^[ab]$/);
  });
});

// ─── TC7: PvP mode → all null ─────────────────────────────────────────────────
describe('TC7 — PvP mode returns all nulls', () => {
  it('returns null scores and null winner for human PvP debate', async () => {
    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({ mode: 'live', opponentId: 'user-456', concededBy: null, messages: [] });
    const result = await generateScores(debate as never);

    expect(result.scoreA).toBeNull();
    expect(result.scoreB).toBeNull();
    expect(result.aiScores).toBeNull();
    expect(result.winner).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ─── TC8: Judging UI renders with numeric casts ───────────────────────────────
describe('TC8 — judging UI renders message count and round with Number()', () => {
  it('injects judging div into screenEl with correct numeric values', async () => {
    const screenEl = document.createElement('div');
    screenEl.id = 'arena-screen-3';
    document.body.appendChild(screenEl);

    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_screenEl(screenEl);

    mockRequestAIScoring.mockResolvedValue(null);

    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({
      mode: 'ai',
      messages: [{ role: 'a', text: 'arg1' }, { role: 'b', text: 'arg2' }],
      round: 4,
    });
    await generateScores(debate as never);

    const judging = screenEl.querySelector('.arena-judging');
    expect(judging).not.toBeNull();
    expect(judging!.innerHTML).toContain('2');
    expect(judging!.innerHTML).toContain('4');
    expect(judging!.querySelector('.arena-judging-text')!.textContent).toBe('THE JUDGE IS REVIEWING...');
  });
});

// ─── ARCH: seam #029 ──────────────────────────────────────────────────────────
describe('ARCH — seam #029', () => {
  it('src/arena/arena-room-end-scores.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-scores.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});

// ============================================================
// SEAM #370 — arena-room-end-scores.ts → arena-types-ai-scoring
// Boundary: GeneratedScores.aiScores is typed as AIScoreResult | null
//           imported from arena-types-ai-scoring.ts.
// This is a pure-type seam — no RPC, no DOM. Tests verify:
//   1. The import exists and is type-only.
//   2. AIScoreResult has the expected shape (side_a, side_b, overall_winner, verdict).
//   3. generateScores() returns an aiScores value conforming to AIScoreResult.
//   4. GeneratedScores.aiScores is null on non-AI paths.
// ============================================================

describe('SEAM #370 — ARCH: arena-room-end-scores imports AIScoreResult from arena-types-ai-scoring', () => {
  it('has an import from ./arena-types-ai-scoring', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-scores.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-types-ai-scoring'))).toBe(true);
  });

  it('the import is type-only (import type)', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-scores.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const line = importLines.find(l => l.includes('arena-types-ai-scoring'));
    expect(line).toMatch(/import\s+type\s+\{/);
  });

  it('arena-types-ai-scoring exports AIScoreResult with side_a, side_b, overall_winner, verdict', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-types-ai-scoring.ts'), 'utf-8');
    expect(source).toMatch(/export\s+interface\s+AIScoreResult/);
    expect(source).toMatch(/side_a/);
    expect(source).toMatch(/side_b/);
    expect(source).toMatch(/overall_winner/);
    expect(source).toMatch(/verdict/);
  });
});

describe('SEAM #370 — TC-S370-1: aiScores populated from AIScoreResult on successful AI scoring', () => {
  it('returns aiScores with side_a and side_b matching the AIScoreResult fixture', async () => {
    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);
    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_screenEl(screenEl);

    const fixture = {
      side_a: { logic: { score: 9, reason: 'strong' }, evidence: { score: 8, reason: 'cited' }, delivery: { score: 7, reason: 'clear' }, rebuttal: { score: 6, reason: 'ok' } },
      side_b: { logic: { score: 4, reason: 'weak' }, evidence: { score: 3, reason: 'lacking' }, delivery: { score: 5, reason: 'ok' }, rebuttal: { score: 4, reason: 'poor' } },
      overall_winner: 'side_a',
      verdict: 'Side A dominated',
    };
    mockRequestAIScoring.mockResolvedValue(fixture);
    mockSumSideScore.mockReturnValueOnce(30).mockReturnValueOnce(16);

    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({ mode: 'ai', messages: [{ role: 'a', text: 'arg' }], round: 1 });
    const result = await generateScores(debate as never);

    expect(result.aiScores).not.toBeNull();
    expect(result.aiScores!.side_a).toBeDefined();
    expect(result.aiScores!.side_b).toBeDefined();
    expect(result.aiScores!.verdict).toBe('Side A dominated');
  });
});

describe('SEAM #370 — TC-S370-2: aiScores is null on concede path (no AI involved)', () => {
  it('aiScores is null when concededBy is set', async () => {
    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({ concededBy: 'b', mode: 'live' });
    const result = await generateScores(debate as never);
    expect(result.aiScores).toBeNull();
    expect(mockRequestAIScoring).not.toHaveBeenCalled();
  });
});

describe('SEAM #370 — TC-S370-3: aiScores is null on PvP path', () => {
  it('aiScores is null for human PvP (no concede, no AI mode)', async () => {
    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({ mode: 'live', opponentId: 'opp-uuid', concededBy: null, messages: [] });
    const result = await generateScores(debate as never);
    expect(result.aiScores).toBeNull();
    expect(mockRequestAIScoring).not.toHaveBeenCalled();
  });
});

describe('SEAM #370 — TC-S370-4: SideScores shape — all four criteria present in AIScoreResult', () => {
  it('arena-types-ai-scoring.ts SideScores has logic, evidence, delivery, rebuttal', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-types-ai-scoring.ts'), 'utf-8');
    expect(source).toMatch(/export\s+interface\s+SideScores/);
    expect(source).toMatch(/logic/);
    expect(source).toMatch(/evidence/);
    expect(source).toMatch(/delivery/);
    expect(source).toMatch(/rebuttal/);
  });
});

describe('SEAM #370 — TC-S370-5: CriterionScore shape — score and reason fields', () => {
  it('arena-types-ai-scoring.ts CriterionScore has score and reason', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-types-ai-scoring.ts'), 'utf-8');
    expect(source).toMatch(/export\s+interface\s+CriterionScore/);
    expect(source).toMatch(/score\s*:/);
    expect(source).toMatch(/reason\s*:/);
  });
});

// ============================================================
// SEAM #522 — arena-room-end-scores.ts → arena-room-ai-scoring
// Boundary: generateScores() delegates AI scoring to requestAIScoring()
//           and score summing to sumSideScore(). Both are imported from
//           arena-room-ai-scoring.ts. No Supabase RPC is called directly;
//           the edge function call happens inside requestAIScoring.
// Tests verify:
//   1. ARCH: correct imports exist from arena-room-ai-scoring
//   2. requestAIScoring is called with correct args on AI+messages path
//   3. sumSideScore called twice (side_a, side_b) on success
//   4. sumSideScore result drives winner determination (a when scoreA >= scoreB)
//   5. sumSideScore result drives winner determination (b when scoreB > scoreA)
//   6. sumSideScore NOT called when requestAIScoring returns null
//   7. requestAIScoring NOT called on concede path
// ============================================================

describe('SEAM #522 — ARCH: arena-room-end-scores imports requestAIScoring and sumSideScore from arena-room-ai-scoring', () => {
  it('has an import from ./arena-room-ai-scoring', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-scores.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-room-ai-scoring'))).toBe(true);
  });

  it('imports requestAIScoring from arena-room-ai-scoring', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-scores.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const line = importLines.find(l => l.includes('arena-room-ai-scoring'));
    expect(line).toMatch(/requestAIScoring/);
  });

  it('imports sumSideScore from arena-room-ai-scoring', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-scores.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const line = importLines.find(l => l.includes('arena-room-ai-scoring'));
    expect(line).toMatch(/sumSideScore/);
  });
});

describe('SEAM #522 — TC-S522-1: requestAIScoring called with topic and messages on AI+messages path', () => {
  it('passes debate.topic and debate.messages to requestAIScoring', async () => {
    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);
    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_screenEl(screenEl);

    mockRequestAIScoring.mockResolvedValue(null);

    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const msgs = [{ role: 'a', text: 'claim' }, { role: 'b', text: 'counter' }];
    const debate = makeDebate({ mode: 'ai', messages: msgs, round: 2 });
    await generateScores(debate as never);

    expect(mockRequestAIScoring).toHaveBeenCalledOnce();
    expect(mockRequestAIScoring).toHaveBeenCalledWith('AI is good', msgs);
  });
});

describe('SEAM #522 — TC-S522-2: sumSideScore called twice with side_a and side_b on success', () => {
  it('calls sumSideScore with side_a then side_b when requestAIScoring resolves', async () => {
    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);
    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_screenEl(screenEl);

    const aiResult = {
      side_a: { logic: { score: 8, reason: 'r' }, evidence: { score: 7, reason: 'r' }, delivery: { score: 9, reason: 'r' }, rebuttal: { score: 6, reason: 'r' } },
      side_b: { logic: { score: 4, reason: 'r' }, evidence: { score: 3, reason: 'r' }, delivery: { score: 5, reason: 'r' }, rebuttal: { score: 4, reason: 'r' } },
      overall_winner: 'side_a',
      verdict: 'A wins',
    };
    mockRequestAIScoring.mockResolvedValue(aiResult);
    mockSumSideScore.mockReturnValueOnce(30).mockReturnValueOnce(16);

    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({ mode: 'ai', messages: [{ role: 'a', text: 'go' }], round: 1 });
    await generateScores(debate as never);

    expect(mockSumSideScore).toHaveBeenCalledTimes(2);
    expect(mockSumSideScore).toHaveBeenNthCalledWith(1, aiResult.side_a);
    expect(mockSumSideScore).toHaveBeenNthCalledWith(2, aiResult.side_b);
  });
});

describe('SEAM #522 — TC-S522-3: winner is a when sumSideScore(side_a) >= sumSideScore(side_b)', () => {
  it('sets winner to a when scoreA equals scoreB (tie goes to a)', async () => {
    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);
    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_screenEl(screenEl);

    const aiResult = {
      side_a: { logic: { score: 5, reason: 'r' }, evidence: { score: 5, reason: 'r' }, delivery: { score: 5, reason: 'r' }, rebuttal: { score: 5, reason: 'r' } },
      side_b: { logic: { score: 5, reason: 'r' }, evidence: { score: 5, reason: 'r' }, delivery: { score: 5, reason: 'r' }, rebuttal: { score: 5, reason: 'r' } },
      overall_winner: 'tie',
      verdict: 'Tie',
    };
    mockRequestAIScoring.mockResolvedValue(aiResult);
    mockSumSideScore.mockReturnValueOnce(20).mockReturnValueOnce(20); // tie → a wins

    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({ mode: 'ai', messages: [{ role: 'a', text: 'go' }], round: 1 });
    const result = await generateScores(debate as never);

    expect(result.winner).toBe('a');
    expect(result.scoreA).toBe(20);
    expect(result.scoreB).toBe(20);
  });
});

describe('SEAM #522 — TC-S522-4: winner is b when sumSideScore(side_b) > sumSideScore(side_a)', () => {
  it('sets winner to b when scoreB strictly greater than scoreA', async () => {
    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);
    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_screenEl(screenEl);

    const aiResult = {
      side_a: { logic: { score: 3, reason: 'r' }, evidence: { score: 3, reason: 'r' }, delivery: { score: 3, reason: 'r' }, rebuttal: { score: 3, reason: 'r' } },
      side_b: { logic: { score: 9, reason: 'r' }, evidence: { score: 9, reason: 'r' }, delivery: { score: 9, reason: 'r' }, rebuttal: { score: 9, reason: 'r' } },
      overall_winner: 'side_b',
      verdict: 'B wins',
    };
    mockRequestAIScoring.mockResolvedValue(aiResult);
    mockSumSideScore.mockReturnValueOnce(12).mockReturnValueOnce(36);

    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({ mode: 'ai', messages: [{ role: 'b', text: 'dominate' }], round: 1 });
    const result = await generateScores(debate as never);

    expect(result.winner).toBe('b');
    expect(result.scoreA).toBe(12);
    expect(result.scoreB).toBe(36);
  });
});

describe('SEAM #522 — TC-S522-5: sumSideScore NOT called when requestAIScoring returns null', () => {
  it('does not call sumSideScore when AI scoring fails', async () => {
    const screenEl = document.createElement('div');
    document.body.appendChild(screenEl);
    const arenaState = await import('../../src/arena/arena-state.ts');
    arenaState.set_screenEl(screenEl);

    mockRequestAIScoring.mockResolvedValue(null);

    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({ mode: 'ai', messages: [{ role: 'a', text: 'hello' }], round: 1 });
    await generateScores(debate as never);

    expect(mockSumSideScore).not.toHaveBeenCalled();
  });
});

describe('SEAM #522 — TC-S522-6: requestAIScoring NOT called on concede path', () => {
  it('skips requestAIScoring entirely when debate.concededBy is set', async () => {
    const { generateScores } = await import('../../src/arena/arena-room-end-scores.ts');
    const debate = makeDebate({ concededBy: 'a', mode: 'ai', messages: [{ role: 'a', text: 'quit' }] });
    await generateScores(debate as never);

    expect(mockRequestAIScoring).not.toHaveBeenCalled();
    expect(mockSumSideScore).not.toHaveBeenCalled();
  });
});
