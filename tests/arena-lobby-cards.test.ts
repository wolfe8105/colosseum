// ============================================================
// ARENA LOBBY CARDS — tests/arena-lobby-cards.test.ts
// Source: src/arena/arena-lobby.cards.ts
//
// CLASSIFICATION:
//   renderArenaFeedCard()    — HTML string builder → Snapshot test
//   renderAutoDebateCard()   — HTML string builder → Snapshot test
//   renderPlaceholderCards() — HTML string builder → Snapshot test
//
// IMPORTS:
//   { escapeHTML }     from '../config.ts'
//   type { ArenaFeedItem, AutoDebateItem } from './arena-types-feed-list.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

import {
  renderArenaFeedCard,
  renderAutoDebateCard,
  renderPlaceholderCards,
} from '../src/arena/arena-lobby.cards.ts';

const makeCard = (overrides = {}) => ({
  id: 'd-1',
  topic: 'AI will rule',
  debater_a_name: 'Alice',
  debater_b_name: 'Bob',
  status: 'complete',
  source: 'user',
  ruleset: 'amplified',
  total_rounds: 4,
  vote_count_a: 3,
  vote_count_b: 5,
  score_a: 8.2,
  score_b: 7.1,
  link_url: null,
  link_preview: null,
  ...overrides,
});

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: string) => s);
});

// ── TC1: renderArenaFeedCard — returns HTML string ────────────

describe('TC1 — renderArenaFeedCard: returns HTML with arena-card', () => {
  it('returns string containing arena-card class', () => {
    const html = renderArenaFeedCard(makeCard() as never, 'complete');
    expect(html).toContain('arena-card');
  });
});

// ── TC2: renderArenaFeedCard — live card has LIVE badge ───────

describe('TC2 — renderArenaFeedCard: live status shows LIVE badge', () => {
  it('includes LIVE badge for live card', () => {
    const html = renderArenaFeedCard(makeCard({ status: 'live' }) as never, 'live');
    expect(html).toContain('LIVE');
  });
});

// ── TC3: renderArenaFeedCard — complete card has VERDICT badge ─

describe('TC3 — renderArenaFeedCard: complete status shows VERDICT badge', () => {
  it('includes VERDICT badge', () => {
    const html = renderArenaFeedCard(makeCard({ status: 'complete' }) as never, 'complete');
    expect(html).toContain('VERDICT');
  });
});

// ── TC4: renderArenaFeedCard — auto source has AI DEBATE badge ─

describe('TC4 — renderArenaFeedCard: auto source shows AI DEBATE badge', () => {
  it('includes AI DEBATE badge for auto debate', () => {
    const html = renderArenaFeedCard(makeCard({ source: 'auto_debate', status: 'complete' }) as never, 'complete');
    expect(html).toContain('AI DEBATE');
  });
});

// ── TC5: renderArenaFeedCard — escapes topic ──────────────────

describe('TC5 — renderArenaFeedCard: calls escapeHTML on topic', () => {
  it('passes topic through escapeHTML', () => {
    renderArenaFeedCard(makeCard({ topic: '<script>xss</script>' }) as never, 'complete');
    const calls = mockEscapeHTML.mock.calls.map(([s]) => s);
    expect(calls).toContain('<script>xss</script>');
  });
});

// ── TC6: renderArenaFeedCard — includes debater names ─────────

describe('TC6 — renderArenaFeedCard: includes debater names in VS block', () => {
  it('renders debater A and B names', () => {
    const html = renderArenaFeedCard(makeCard({ debater_a_name: 'Alice', debater_b_name: 'Bob' }) as never, 'complete');
    expect(html).toContain('Alice');
    expect(html).toContain('Bob');
  });
});

// ── TC7: renderArenaFeedCard — shows vote count ───────────────

describe('TC7 — renderArenaFeedCard: shows vote count', () => {
  it('renders total vote count (3 + 5 = 8)', () => {
    const html = renderArenaFeedCard(makeCard({ vote_count_a: 3, vote_count_b: 5 }) as never, 'complete');
    expect(html).toContain('8 votes');
  });
});

// ── TC8: renderAutoDebateCard — returns AI debate card ────────

describe('TC8 — renderAutoDebateCard: returns HTML with card-ai class', () => {
  it('returns string containing card-ai', () => {
    const html = renderAutoDebateCard({
      id: 'auto-1',
      topic: 'AI ethics',
      side_a_label: 'Pro AI',
      side_b_label: 'Anti AI',
      score_a: 75,
      score_b: 65,
    } as never);
    expect(html).toContain('card-ai');
  });
});

// ── TC9: renderPlaceholderCards — returns placeholder HTML ────

describe('TC9 — renderPlaceholderCards: returns HTML for non-live type', () => {
  it('returns HTML containing arena-card elements', () => {
    const html = renderPlaceholderCards('complete');
    expect(html).toContain('arena-card');
  });
});

// ── TC10: renderPlaceholderCards — live returns empty state ──

describe('TC10 — renderPlaceholderCards: live type returns empty state', () => {
  it('returns arena-empty element for "live" type', () => {
    const html = renderPlaceholderCards('live');
    expect(html).toContain('arena-empty');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-lobby.cards.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../config.ts', './arena-types-feed-list.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-lobby.cards.ts'),
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
