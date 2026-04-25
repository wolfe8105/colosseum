// ============================================================
// SPECTATE RENDER TIMELINE — tests/spectate-render-timeline.test.ts
// Source: src/pages/spectate.render-timeline.ts
//
// CLASSIFICATION:
//   renderTimeline(): HTML string builder — returns HTML string with timeline
//
// IMPORTS:
//   { state }               from './spectate.state.ts'
//   { escHtml }             from './spectate.utils.ts'
//   { renderMessages, formatPointBadge } from './spectate.render-messages.ts'
//   type imports only from './spectate.types.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  replayData: null as null | {
    speech_events: unknown[];
    power_ups: unknown[];
    references: unknown[];
    point_awards?: unknown[];
    mod_scores: unknown[];
  },
  lastMessageTime: null as string | null,
}));

const mockRenderMessages   = vi.hoisted(() => vi.fn(() => '<div class="messages-fallback"></div>'));
const mockFormatPointBadge = vi.hoisted(() => vi.fn((pa: { points?: number }) => `+${pa.points ?? 0}pts`));

vi.mock('../src/pages/spectate.state.ts', () => ({
  get state() { return mockState; },
}));

vi.mock('../src/pages/spectate.utils.ts', () => ({
  escHtml: (s: string) => s,
  timeAgo: vi.fn(() => '1m ago'),
  renderAvatar: vi.fn(() => ''),
  modeLabel: vi.fn(() => 'Live'),
  statusBadge: vi.fn(() => ''),
}));

vi.mock('../src/pages/spectate.render-messages.ts', () => ({
  renderMessages: mockRenderMessages,
  formatPointBadge: mockFormatPointBadge,
}));

import { renderTimeline } from '../src/pages/spectate.render-timeline.ts';
import type { SpectateDebate, DebateMessage } from '../src/pages/spectate.types.ts';

// ── Helpers ───────────────────────────────────────────────────

const makeDebate = (overrides: Partial<SpectateDebate> = {}): SpectateDebate => ({
  id: 'd1',
  topic: 'Test topic',
  status: 'live',
  mode: 'voice',
  debater_a_name: 'Alice',
  debater_b_name: 'Bob',
  debater_a_elo: 1200,
  debater_b_elo: 1100,
  debater_a_avatar: null,
  debater_b_avatar: null,
  moderator_name: null,
  moderator_type: 'none',
  spectator_count: 5,
  current_round: 1,
  total_rounds: 3,
  vote_count_a: 0,
  vote_count_b: 0,
  score_a: null,
  score_b: null,
  winner: null,
  ai_scorecard: null,
  ...overrides,
} as unknown as SpectateDebate);

const makeMessage = (overrides: Partial<DebateMessage> = {}): DebateMessage => ({
  id: 'm1',
  content: 'Hello',
  side: 'a',
  round: 1,
  is_ai: false,
  created_at: '2026-01-01T00:00:01Z',
  ...overrides,
} as DebateMessage);

beforeEach(() => {
  mockState.replayData = null;
  mockState.lastMessageTime = null;
  mockRenderMessages.mockReturnValue('<div class="messages-fallback"></div>');
  vi.clearAllMocks();
  mockRenderMessages.mockReturnValue('<div class="messages-fallback"></div>');
  mockFormatPointBadge.mockReturnValue('+5pts');
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — renderTimeline falls back to renderMessages when no enrichment data', () => {
  it('delegates to renderMessages when replayData is null and messages exist', () => {
    const messages = [makeMessage()];
    mockState.replayData = null;
    renderTimeline(messages, makeDebate());
    expect(mockRenderMessages).toHaveBeenCalledWith(messages, expect.any(Object));
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — renderTimeline returns renderMessages result for no-enrichment path', () => {
  it('returns the string produced by renderMessages', () => {
    mockRenderMessages.mockReturnValue('<div id="msg-stub"></div>');
    mockState.replayData = null;
    const result = renderTimeline([makeMessage()], makeDebate());
    expect(result).toBe('<div id="msg-stub"></div>');
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — renderTimeline includes round divider when round changes', () => {
  it('emits a round-divider element between rounds', () => {
    mockState.replayData = {
      speech_events: [],
      power_ups: [],
      references: [],
      point_awards: [{ created_at: '2026-01-01T00:00:00Z', side: 'a', round: 1, points: 1, metadata: {} }],
      mod_scores: [],
    };
    const messages = [
      makeMessage({ id: 'm1', round: 1, created_at: '2026-01-01T00:00:01Z' }),
      makeMessage({ id: 'm2', round: 2, created_at: '2026-01-01T00:00:02Z' }),
    ];
    const result = renderTimeline(messages, makeDebate());
    expect(result).toContain('round-divider');
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — renderTimeline renders power-up events when replayData has power_ups', () => {
  it('includes power-up-event class in output', () => {
    mockState.replayData = {
      speech_events: [],
      power_ups: [{
        activated_at: '2026-01-01T00:00:02Z',
        side: 'a',
        round: null,
        user_name: 'Alice',
        power_up_name: 'Silence',
        power_up_icon: '🔇',
      }],
      references: [],
      point_awards: [],
      mod_scores: [],
    };
    const result = renderTimeline([makeMessage()], makeDebate());
    expect(result).toContain('power-up-event');
    expect(result).toContain('Silence');
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — renderTimeline renders reference events when replayData has references', () => {
  it('includes reference-event class and submitter name in output', () => {
    mockState.replayData = {
      speech_events: [],
      power_ups: [],
      references: [{
        created_at: '2026-01-01T00:00:03Z',
        side: 'b',
        round: 1,
        submitter_name: 'Bob',
        description: 'Some source',
        url: 'https://example.com',
        ruling: 'accepted',
        ruling_reason: 'Valid',
      }],
      point_awards: [],
      mod_scores: [],
    };
    const result = renderTimeline([makeMessage()], makeDebate());
    expect(result).toContain('reference-event');
    expect(result).toContain('Bob');
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — renderTimeline renders score events from orphan point_awards', () => {
  it('includes score-event when point_award has no scored_event_id', () => {
    mockState.replayData = {
      speech_events: [],
      power_ups: [],
      references: [],
      point_awards: [{
        created_at: '2026-01-01T00:00:04Z',
        side: 'a',
        round: 1,
        points: 5,
        metadata: {},
      }],
      mod_scores: [],
    };
    const result = renderTimeline([makeMessage()], makeDebate());
    expect(result).toContain('score-event');
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — renderTimeline uses speech events path when speech_events exist', () => {
  it('does not call renderMessages when speech_events are present', () => {
    mockState.replayData = {
      speech_events: [{
        id: 'se1',
        created_at: '2026-01-01T00:00:01Z',
        side: 'a',
        round: 1,
        debater_name: 'Alice',
        content: 'My argument',
      }],
      power_ups: [],
      references: [],
      point_awards: [],
      mod_scores: [],
    };
    renderTimeline([], makeDebate());
    expect(mockRenderMessages).not.toHaveBeenCalled();
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — renderTimeline updates state.lastMessageTime for messages', () => {
  it('sets state.lastMessageTime to the most recent message timestamp', () => {
    mockState.replayData = {
      speech_events: [],
      power_ups: [],
      references: [],
      point_awards: [{ created_at: '2025-12-31T00:00:00Z', side: 'a', round: 1, points: 1, metadata: {} }],
      mod_scores: [],
    };
    const messages = [
      makeMessage({ created_at: '2026-01-01T00:00:01Z' }),
      makeMessage({ created_at: '2026-01-01T00:00:05Z' }),
    ];
    renderTimeline(messages, makeDebate());
    expect(mockState.lastMessageTime).toBe('2026-01-01T00:00:05Z');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/spectate.render-timeline.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './spectate.state.ts',
      './spectate.utils.ts',
      './spectate.render-messages.ts',
      './spectate.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/spectate.render-timeline.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
