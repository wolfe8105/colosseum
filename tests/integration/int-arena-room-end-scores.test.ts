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
