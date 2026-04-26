/**
 * Integration tests — src/arena/arena-room-ai-scoring.ts → arena-types-ai-scoring
 * SEAM #299
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AIScoreResult, SideScores } from '../../src/arena/arena-types-ai-scoring.ts';

// ---------------------------------------------------------------------------
// ARCH test
// ---------------------------------------------------------------------------
describe('ARCH: arena-room-ai-scoring only imports from allowed modules', () => {
  it('has no wall deps', async () => {
    const src = await import('../../src/arena/arena-room-ai-scoring.ts?raw').then(m => m.default);
    const imports = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const bad = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of imports) {
      for (const wall of bad) {
        expect(line).not.toContain(wall);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSideScores(score: number): SideScores {
  return {
    logic:    { score, reason: 'logic reason' },
    evidence: { score, reason: 'evidence reason' },
    delivery: { score, reason: 'delivery reason' },
    rebuttal: { score, reason: 'rebuttal reason' },
  };
}

function makeAIScoreResult(aScore: number, bScore: number): AIScoreResult {
  return {
    side_a: makeSideScores(aScore),
    side_b: makeSideScores(bScore),
    overall_winner: aScore >= bScore ? 'a' : 'b',
    verdict: 'Side A argued more effectively.',
  };
}

// ---------------------------------------------------------------------------
// Module-under-test (re-imported fresh each test)
// ---------------------------------------------------------------------------

let sumSideScore: typeof import('../../src/arena/arena-room-ai-scoring.ts')['sumSideScore'];
let renderAIScorecard: typeof import('../../src/arena/arena-room-ai-scoring.ts')['renderAIScorecard'];
let requestAIScoring: typeof import('../../src/arena/arena-room-ai-scoring.ts')['requestAIScoring'];

let mockGetUserJwt: ReturnType<typeof vi.fn>;
let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();

  mockGetUserJwt = vi.fn().mockResolvedValue('mock-jwt-token');
  mockFetch = vi.fn();

  vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
      auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }));

  vi.mock('../../src/arena/arena-room-ai-response.ts', () => ({
    getUserJwt: (...args: unknown[]) => mockGetUserJwt(...args),
    handleAIResponse: vi.fn(),
    generateAIDebateResponse: vi.fn(),
    generateSimulatedResponse: vi.fn(),
  }));

  // Patch global fetch
  vi.stubGlobal('fetch', mockFetch);

  const mod = await import('../../src/arena/arena-room-ai-scoring.ts');
  sumSideScore = mod.sumSideScore;
  renderAIScorecard = mod.renderAIScorecard;
  requestAIScoring = mod.requestAIScoring;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// TC-01: sumSideScore sums all four criteria
// ---------------------------------------------------------------------------
describe('TC-01: sumSideScore sums all four criteria', () => {
  it('returns 28 when every criterion is 7', () => {
    const side = makeSideScores(7);
    expect(sumSideScore(side)).toBe(28);
  });
});

// ---------------------------------------------------------------------------
// TC-02: sumSideScore handles zero scores
// ---------------------------------------------------------------------------
describe('TC-02: sumSideScore handles zero scores', () => {
  it('returns 0 when all criteria are 0', () => {
    const side = makeSideScores(0);
    expect(sumSideScore(side)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TC-03: renderAIScorecard marks my side winner when side_a total > side_b
// ---------------------------------------------------------------------------
describe('TC-03: renderAIScorecard winner/loser classes — player wins', () => {
  it('my total gets winner class when side_a > side_b and myRole=a', () => {
    const scores = makeAIScoreResult(8, 5); // side_a=32, side_b=20
    const html = renderAIScorecard('Alice', 'Bob', 'a', scores);
    // The two ai-scorecard-total divs: first is mine, second is opp
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const totals = doc.querySelectorAll('.ai-scorecard-total');
    expect(totals.length).toBe(2);
    expect(totals[0].classList.contains('winner')).toBe(true);
    expect(totals[0].classList.contains('loser')).toBe(false);
    expect(totals[1].classList.contains('loser')).toBe(true);
    expect(totals[1].classList.contains('winner')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TC-04: renderAIScorecard marks my side loser when opp wins
// ---------------------------------------------------------------------------
describe('TC-04: renderAIScorecard winner/loser classes — player loses', () => {
  it('my total gets loser class when side_a < side_b and myRole=a', () => {
    const scores = makeAIScoreResult(3, 9); // side_a=12, side_b=36
    const html = renderAIScorecard('Alice', 'Bob', 'a', scores);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const totals = doc.querySelectorAll('.ai-scorecard-total');
    expect(totals.length).toBe(2);
    expect(totals[0].classList.contains('loser')).toBe(true);
    expect(totals[1].classList.contains('winner')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-05: renderAIScorecard escapes HTML in names and verdict
// ---------------------------------------------------------------------------
describe('TC-05: renderAIScorecard escapes user-controlled strings', () => {
  it('escapes XSS in myName and verdict', () => {
    const scores = makeAIScoreResult(5, 5);
    scores.verdict = '<script>alert(1)</script>';
    const html = renderAIScorecard('<img src=x onerror=alert(1)>', 'Bob', 'a', scores);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
  });
});

// ---------------------------------------------------------------------------
// TC-06: requestAIScoring calls fetch with correct URL and payload
// ---------------------------------------------------------------------------
describe('TC-06: requestAIScoring calls fetch with mode=score payload', () => {
  it('resolves with AIScoreResult from data.scores on success', async () => {
    const expectedScores = makeAIScoreResult(7, 5);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ scores: expectedScores }),
    });

    const messages = [
      { role: 'a' as const, text: 'Hello world', timestamp: Date.now() },
    ];

    const result = await requestAIScoring('Is pineapple on pizza fine?', messages);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/functions\/v1\/ai-sparring$/);
    const body = JSON.parse(opts.body as string);
    expect(body.mode).toBe('score');
    expect(body.topic).toBe('Is pineapple on pizza fine?');
    expect(Array.isArray(body.messageHistory)).toBe(true);
    expect(result).toEqual(expectedScores);
  });
});

// ---------------------------------------------------------------------------
// TC-07: requestAIScoring returns null on HTTP error
// ---------------------------------------------------------------------------
describe('TC-07: requestAIScoring returns null when fetch fails', () => {
  it('returns null and does not throw when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await requestAIScoring('topic', []);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(result).toBeNull();
  });
});

// ===========================================================================
// SEAM #406 — arena-room-ai-scoring.ts → arena-room-ai-response (getUserJwt)
// ===========================================================================

// ---------------------------------------------------------------------------
// TC-08: requestAIScoring uses JWT from getUserJwt in Authorization header
// ---------------------------------------------------------------------------
describe('TC-08: requestAIScoring passes getUserJwt token to Authorization header', () => {
  it('sets Bearer token from getUserJwt on the fetch call', async () => {
    mockGetUserJwt.mockResolvedValueOnce('test-jwt-xyz');
    const expectedScores = makeAIScoreResult(6, 4);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ scores: expectedScores }),
    });

    await requestAIScoring('test topic', []);

    expect(mockGetUserJwt).toHaveBeenCalledOnce();
    const [, opts] = mockFetch.mock.calls[0];
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer test-jwt-xyz');
  });
});

// ---------------------------------------------------------------------------
// TC-09: requestAIScoring returns null when getUserJwt returns null
// ---------------------------------------------------------------------------
describe('TC-09: requestAIScoring returns null when getUserJwt yields no token', () => {
  it('returns null and skips fetch when JWT is null', async () => {
    mockGetUserJwt.mockResolvedValueOnce(null);

    const result = await requestAIScoring('no-auth topic', []);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC-10: requestAIScoring returns null when fetch rejects (network error)
// ---------------------------------------------------------------------------
describe('TC-10: requestAIScoring returns null on network-level fetch rejection', () => {
  it('catches fetch rejection and returns null', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const result = await requestAIScoring('network-fail topic', []);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC-11: sumSideScore handles mixed scores correctly
// ---------------------------------------------------------------------------
describe('TC-11: sumSideScore sums mixed criterion scores', () => {
  it('returns correct sum for non-uniform scores', () => {
    const side: import('../../src/arena/arena-types-ai-scoring.ts').SideScores = {
      logic:    { score: 9, reason: 'strong logic' },
      evidence: { score: 6, reason: 'some evidence' },
      delivery: { score: 4, reason: 'weak delivery' },
      rebuttal: { score: 8, reason: 'good rebuttal' },
    };
    expect(sumSideScore(side)).toBe(27);
  });
});

// ---------------------------------------------------------------------------
// TC-12: renderAIScorecard uses myRole='b' to swap sides correctly
// ---------------------------------------------------------------------------
describe('TC-12: renderAIScorecard role=b correctly maps sides', () => {
  it('my scorecard-total reflects side_b score when myRole is b', () => {
    const scores = makeAIScoreResult(3, 9); // side_a=12, side_b=36
    const html = renderAIScorecard('Bob', 'Alice', 'b', scores);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const totals = doc.querySelectorAll('.ai-scorecard-total');
    // myRole=b means first total is side_b (36), second is side_a (12)
    expect(totals[0].textContent?.trim()).toBe('36');
    expect(totals[0].classList.contains('winner')).toBe(true);
    expect(totals[1].textContent?.trim()).toBe('12');
    expect(totals[1].classList.contains('loser')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-13: ARCH filter — no wall deps in arena-room-ai-scoring.ts (seam #406)
// ---------------------------------------------------------------------------
describe('TC-13: ARCH seam #406 — arena-room-ai-scoring imports only from allowed modules', () => {
  it('import lines contain no wall deps', async () => {
    const src = await import('../../src/arena/arena-room-ai-scoring.ts?raw').then((m) => m.default);
    const imports = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const wall = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of imports) {
      for (const dep of wall) {
        expect(line).not.toContain(dep);
      }
    }
  });
});
