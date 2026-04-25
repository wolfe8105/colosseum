// ============================================================
// ARENA ROOM AI SCORING — tests/arena-room-ai-scoring.test.ts
// Source: src/arena/arena-room-ai-scoring.ts
//
// CLASSIFICATION:
//   requestAIScoring()  — async fetch → Behavioral test
//   sumSideScore()      — pure math → Pure calculation test
//   renderAIScorecard() — HTML builder → Snapshot test
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockGetUserJwt = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  SUPABASE_URL: 'https://test.supabase.co',
}));

vi.mock('../src/arena/arena-room-ai-response.ts', () => ({
  getUserJwt: mockGetUserJwt,
}));

import { requestAIScoring, sumSideScore, renderAIScorecard } from '../src/arena/arena-room-ai-scoring.ts';

const makeSide = (score = 7) => ({
  logic:    { score, reason: 'Good logic' },
  evidence: { score, reason: 'Good evidence' },
  delivery: { score, reason: 'Good delivery' },
  rebuttal: { score, reason: 'Good rebuttal' },
});

const makeScores = () => ({
  side_a: makeSide(8),
  side_b: makeSide(6),
  verdict: 'Side A wins by a clear margin.',
});

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockGetUserJwt.mockReset();
});

// ── TC1: sumSideScore — sums all 4 criteria ───────────────────

describe('TC1 — sumSideScore: sums logic+evidence+delivery+rebuttal', () => {
  it('returns 32 for side with all scores = 8', () => {
    expect(sumSideScore(makeSide(8))).toBe(32);
  });
});

// ── TC2: sumSideScore — different values ─────────────────────

describe('TC2 — sumSideScore: returns correct sum for mixed scores', () => {
  it('returns 26 for 8+6+7+5', () => {
    const side = {
      logic:    { score: 8, reason: '' },
      evidence: { score: 6, reason: '' },
      delivery: { score: 7, reason: '' },
      rebuttal: { score: 5, reason: '' },
    };
    expect(sumSideScore(side)).toBe(26);
  });
});

// ── TC3: renderAIScorecard — contains ai-scorecard ───────────

describe('TC3 — renderAIScorecard: returns HTML with ai-scorecard', () => {
  it('contains class ai-scorecard', () => {
    const html = renderAIScorecard('Alice', 'Bob', 'a', makeScores());
    expect(html).toContain('ai-scorecard');
  });
});

// ── TC4: renderAIScorecard — shows player names ───────────────

describe('TC4 — renderAIScorecard: shows both player names', () => {
  it('contains Alice and Bob in output', () => {
    const html = renderAIScorecard('Alice', 'Bob', 'a', makeScores());
    expect(html).toContain('Alice');
    expect(html).toContain('Bob');
  });
});

// ── TC5: renderAIScorecard — winner class on higher score ─────

describe('TC5 — renderAIScorecard: winner class on higher total', () => {
  it('contains "winner" class for higher score side', () => {
    const html = renderAIScorecard('Alice', 'Bob', 'a', makeScores());
    expect(html).toContain('winner');
  });
});

// ── TC6: renderAIScorecard — escapes names ────────────────────

describe('TC6 — renderAIScorecard: escapes player names', () => {
  it('passes names through escapeHTML', () => {
    renderAIScorecard('<b>Alice</b>', 'Bob', 'a', makeScores());
    expect(mockEscapeHTML).toHaveBeenCalledWith('<b>Alice</b>');
  });
});

// ── TC7: requestAIScoring — returns null when no JWT ─────────

describe('TC7 — requestAIScoring: returns null when no JWT', () => {
  it('returns null when getUserJwt returns null', async () => {
    mockGetUserJwt.mockResolvedValue(null);
    const result = await requestAIScoring('topic', []);
    expect(result).toBeNull();
  });
});

// ── TC8: requestAIScoring — returns scores on success ────────

describe('TC8 — requestAIScoring: returns scores on success', () => {
  it('calls fetch and returns AIScoreResult', async () => {
    mockGetUserJwt.mockResolvedValue('jwt-token');
    const mockScores = makeScores();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ scores: mockScores }),
    } as Response);

    const result = await requestAIScoring('AI topic', [{ text: 'arg', role: 'user', round: 1 } as never]);
    expect(result).toEqual(mockScores);

    vi.restoreAllMocks();
  });
});

// ── TC9: requestAIScoring — returns null on fetch error ──────

describe('TC9 — requestAIScoring: returns null on fetch error', () => {
  it('returns null when fetch throws', async () => {
    mockGetUserJwt.mockResolvedValue('jwt-token');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await requestAIScoring('topic', []);
    expect(result).toBeNull();

    vi.restoreAllMocks();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-room-ai-scoring.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../config.ts',
      './arena-types.ts',
      './arena-types-ai-scoring.ts',
      './arena-room-ai-response.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-ai-scoring.ts'),
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
