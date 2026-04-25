// ============================================================
// ARENA ROOM END SCORES — tests/arena-room-end-scores.test.ts
// Source: src/arena/arena-room-end-scores.ts
//
// CLASSIFICATION:
//   generateScores() — async score computation → Pure calculation test
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const stateVars = vi.hoisted(() => ({
  screenEl: null as HTMLElement | null,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get screenEl() { return stateVars.screenEl; },
}));

const mockRequestAIScoring = vi.hoisted(() => vi.fn());
const mockSumSideScore     = vi.hoisted(() => vi.fn((side: unknown) => 75));

vi.mock('../src/arena/arena-room-ai-scoring.ts', () => ({
  requestAIScoring: mockRequestAIScoring,
  sumSideScore: mockSumSideScore,
}));

import { generateScores } from '../src/arena/arena-room-end-scores.ts';
import type { CurrentDebate } from '../src/arena/arena-types.ts';

const makeDebate = (overrides = {}): CurrentDebate => ({
  id: 'd-1',
  topic: 'Test',
  mode: 'text',
  role: 'a',
  round: 2,
  messages: [],
  opponentId: 'user-b',
  ...overrides,
} as unknown as CurrentDebate);

beforeEach(() => {
  document.body.innerHTML = '';
  const screen = document.createElement('div');
  document.body.appendChild(screen);
  stateVars.screenEl = screen;
  mockRequestAIScoring.mockReset();
  mockSumSideScore.mockImplementation(() => 75);
});

// ── TC1: concede — winner is opposite of conceder ─────────────

describe('TC1 — generateScores: concededBy=a gives winner=b', () => {
  it('returns winner=b when side a concedes', async () => {
    const result = await generateScores(makeDebate({ concededBy: 'a' }));
    expect(result.winner).toBe('b');
    expect(result.scoreA).toBeNull();
  });
});

describe('TC1b — generateScores: concededBy=b gives winner=a', () => {
  it('returns winner=a when side b concedes', async () => {
    const result = await generateScores(makeDebate({ concededBy: 'b' }));
    expect(result.winner).toBe('a');
  });
});

// ── TC2: ai mode with messages calls requestAIScoring ─────────

describe('TC2 — generateScores: ai mode with messages calls AI scoring', () => {
  it('calls requestAIScoring', async () => {
    mockRequestAIScoring.mockResolvedValue({
      side_a: { clarity: 80 },
      side_b: { clarity: 70 },
    });
    const debate = makeDebate({ mode: 'ai', messages: [{ text: 'arg', role: 'user', round: 1 }] });
    await generateScores(debate);
    expect(mockRequestAIScoring).toHaveBeenCalledTimes(1);
  });
});

// ── TC3: ai mode no messages returns random scores ────────────

describe('TC3 — generateScores: ai mode no messages returns random scores', () => {
  it('returns numeric scores without calling AI scoring', async () => {
    const result = await generateScores(makeDebate({ mode: 'ai', messages: [] }));
    expect(typeof result.scoreA).toBe('number');
    expect(typeof result.scoreB).toBe('number');
    expect(mockRequestAIScoring).not.toHaveBeenCalled();
  });
});

// ── TC4: human PvP returns all null ──────────────────────────

describe('TC4 — generateScores: human PvP returns all null scores', () => {
  it('returns null scoreA, scoreB, winner for text mode with opponent', async () => {
    const result = await generateScores(makeDebate({ mode: 'text', opponentId: 'user-b' }));
    expect(result.scoreA).toBeNull();
    expect(result.scoreB).toBeNull();
    expect(result.winner).toBeNull();
  });
});

// ── TC5: ai mode renders judging screen when screenEl set ─────

describe('TC5 — generateScores: ai mode with messages renders judging screen', () => {
  it('appends .arena-judging to screenEl', async () => {
    mockRequestAIScoring.mockResolvedValue(null);
    const debate = makeDebate({ mode: 'ai', messages: [{ text: 'arg', role: 'user', round: 1 }] });
    await generateScores(debate);
    expect(stateVars.screenEl!.querySelector('.arena-judging')).not.toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-room-end-scores.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-ai-scoring.ts',
      './arena-room-ai-scoring.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-end-scores.ts'),
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
