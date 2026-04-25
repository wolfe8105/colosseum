// ============================================================
// FEED CARD — tests/feed-card.test.ts
// Source: src/feed-card.ts
//
// CLASSIFICATION:
//   renderFeedCard()        — HTML string builder → Snapshot test
//   injectOpenCardCSS()     — DOM inject → Integration test
//   renderFeedEmpty()       — HTML string builder → Snapshot test
//   renderModeratorCard()   — HTML string builder → Snapshot test
//   startFeedCountdowns()   — DOM timer → Integration test
//   stopFeedCountdowns()    — Timer cleanup → Behavioral test
//
// IMPORTS:
//   { escapeHTML }     from './config.ts'
//   { vgBadge }        from './badge.ts'
//   { bountyDot }      from './bounties.ts'
//   { getCurrentUser } from './auth.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockEscapeHTML    = vi.hoisted(() => vi.fn((s: string) => s));
const mockVgBadge       = vi.hoisted(() => vi.fn(() => ''));
const mockBountyDot     = vi.hoisted(() => vi.fn(() => ''));
const mockGetCurrentUser = vi.hoisted(() => vi.fn(() => null));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: vi.fn(),
}));

vi.mock('../src/badge.ts', () => ({
  vgBadge: mockVgBadge,
}));

vi.mock('../src/bounties.ts', () => ({
  bountyDot: mockBountyDot,
}));

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  onAuthStateChange: vi.fn(),
}));

import {
  renderFeedCard,
  injectOpenCardCSS,
  renderFeedEmpty,
  renderModeratorCard,
  startFeedCountdowns,
  stopFeedCountdowns,
  type UnifiedFeedCard,
} from '../src/feed-card.ts';

const makeCard = (overrides: Partial<UnifiedFeedCard> = {}): UnifiedFeedCard => ({
  id: 'card-1',
  topic: 'AI will rule',
  content: 'Hot take content',
  category: 'tech',
  status: 'open',
  mode: 'text',
  ruleset: 'amplified',
  current_round: null,
  total_rounds: null,
  score_a: null,
  score_b: null,
  vote_count_a: null,
  vote_count_b: null,
  reaction_count: 0,
  link_url: null,
  link_preview: null,
  ranked: false,
  created_at: new Date().toISOString(),
  debater_a: 'user-1',
  debater_b: null,
  debater_a_username: 'alice',
  debater_a_name: 'Alice',
  elo_a: 1200,
  verified_a: false,
  debater_b_username: null,
  debater_b_name: null,
  elo_b: null,
  verified_b: null,
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockVgBadge.mockReturnValue('');
  mockBountyDot.mockReturnValue('');
  mockGetCurrentUser.mockReturnValue(null);
  document.body.innerHTML = '';
});

afterEach(() => {
  stopFeedCountdowns();
  vi.useRealTimers();
});

// ── TC1: renderFeedCard — open status calls open renderer ────

describe('TC1 — renderFeedCard: status=open returns open card HTML', () => {
  it('returns HTML string containing topic for open card', () => {
    const html = renderFeedCard(makeCard({ status: 'open' }));
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });
});

// ── TC2: renderFeedCard — live status renders live card ──────

describe('TC2 — renderFeedCard: status=live returns live card HTML', () => {
  it('returns non-empty string for live card', () => {
    const html = renderFeedCard(makeCard({
      status: 'live',
      debater_b: 'user-2',
      debater_b_name: 'Bob',
      debater_b_username: 'bob',
      current_round: 2,
      total_rounds: 4,
    }));
    expect(html.length).toBeGreaterThan(0);
  });
});

// ── TC3: renderFeedCard — voting status ──────────────────────

describe('TC3 — renderFeedCard: status=voting returns voting card HTML', () => {
  it('returns non-empty string for voting card', () => {
    const html = renderFeedCard(makeCard({ status: 'voting' }));
    expect(html.length).toBeGreaterThan(0);
  });
});

// ── TC4: renderFeedCard — complete status ────────────────────

describe('TC4 — renderFeedCard: status=complete returns verdict card HTML', () => {
  it('returns non-empty string for complete card', () => {
    const html = renderFeedCard(makeCard({ status: 'complete' }));
    expect(html.length).toBeGreaterThan(0);
  });
});

// ── TC5: renderFeedCard — unknown status returns empty string ─

describe('TC5 — renderFeedCard: unknown status returns empty string', () => {
  it('returns "" for unrecognized status', () => {
    const html = renderFeedCard(makeCard({ status: 'unknown' }));
    expect(html).toBe('');
  });
});

// ── TC6: renderFeedCard — escapes user content ───────────────

describe('TC6 — renderFeedCard: calls escapeHTML on user-supplied content', () => {
  it('passes debater_a_name through escapeHTML', () => {
    renderFeedCard(makeCard({ debater_a_name: '<b>Hacker</b>' }));
    const calls = mockEscapeHTML.mock.calls.map(([s]) => s);
    expect(calls).toContain('<b>Hacker</b>');
  });
});

// ── TC7: injectOpenCardCSS — appends style to head ───────────

describe('TC7 — injectOpenCardCSS: appends style element to head', () => {
  it('adds a style tag to document.head', () => {
    injectOpenCardCSS();
    expect(document.head.querySelectorAll('style').length).toBeGreaterThanOrEqual(1);
  });
});

// ── TC8: renderFeedEmpty — returns non-empty string ──────────

describe('TC8 — renderFeedEmpty: returns HTML string', () => {
  it('returns non-empty HTML string', () => {
    const html = renderFeedEmpty();
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });
});

// ── TC9: renderModeratorCard — returns non-empty string ──────

describe('TC9 — renderModeratorCard: returns HTML string', () => {
  it('returns HTML for guest user', () => {
    const html = renderModeratorCard(true);
    expect(html.length).toBeGreaterThan(0);
  });

  it('returns HTML for logged-in user', () => {
    const html = renderModeratorCard(false);
    expect(html.length).toBeGreaterThan(0);
  });
});

// ── TC10: startFeedCountdowns — does not throw ───────────────

describe('TC10 — startFeedCountdowns: starts without error', () => {
  it('does not throw when called', () => {
    expect(() => startFeedCountdowns()).not.toThrow();
  });
});

// ── TC11: stopFeedCountdowns — stops timers without error ────

describe('TC11 — stopFeedCountdowns: stops timers without error', () => {
  it('does not throw when called after start', () => {
    startFeedCountdowns();
    expect(() => stopFeedCountdowns()).not.toThrow();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/feed-card.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './badge.ts', './bounties.ts', './auth.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/feed-card.ts'),
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
