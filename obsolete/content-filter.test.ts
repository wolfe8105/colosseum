// ============================================================
// THE COLOSSEUM — CONTENT FILTER TESTS
// Tests filterContent(), filterHeadline(), filterDebate().
// Mocks logger to avoid winston/dotenv side effects.
// Session 132.
// ============================================================

import { describe, it, expect, vi } from 'vitest';

// Mock logger before importing content-filter
vi.mock('../lib/logger', () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { filterContent, filterHeadline, filterDebate } from '../lib/content-filter';
import type { FilterResult, DebateRound } from '../lib/content-filter';

// ── Clean content passes ─────────────────────────────────────

describe('filterContent — clean content', () => {
  it('passes normal headline', () => {
    const result = filterContent('Lakers beat Celtics in overtime thriller');
    expect(result.pass).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('passes political headline without slurs', () => {
    const result = filterContent('Congress debates new infrastructure bill');
    expect(result.pass).toBe(true);
  });

  it('passes opinionated but clean content', () => {
    const result = filterContent('This is the worst trade deal in NBA history and anyone who disagrees is wrong');
    expect(result.pass).toBe(true);
  });
});

// ── Blocked terms ────────────────────────────────────────────

describe('filterContent — blocked terms', () => {
  it('blocks racial slurs', () => {
    const result = filterContent('Some text with kike in it');
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('Blocked term');
  });

  it('blocks hate group names', () => {
    const result = filterContent('The proud boys are organizing');
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('proud boys');
  });

  it('blocks violence keywords', () => {
    const result = filterContent('We should kill all of them');
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('kill all');
  });

  it('blocks holocaust denial patterns', () => {
    const result = filterContent("The holocaust didn't happen");
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("holocaust didn");
  });

  it('blocks white supremacist terms', () => {
    const result = filterContent('White supremacy is on the rise');
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('white supremac');
  });

  it('blocks neo-nazi variants', () => {
    expect(filterContent('neo-nazi rally downtown').pass).toBe(false);
    expect(filterContent('neonazi gathering planned').pass).toBe(false);
  });

  it('blocks child abuse terms', () => {
    expect(filterContent('known pedophile arrested').pass).toBe(false);
  });

  it('blocks dehumanizing language', () => {
    expect(filterContent('they are subhuman creatures').pass).toBe(false);
    expect(filterContent('like cockroaches spreading').pass).toBe(false);
  });

  it('matching is case-insensitive', () => {
    expect(filterContent('WHITE SUPREMACY rising').pass).toBe(false);
    expect(filterContent('NEO-NAZI rally').pass).toBe(false);
  });
});

// ── Dangerous comparison patterns ────────────────────────────

describe('filterContent — dangerous comparison patterns', () => {
  it('blocks party-to-extremist comparisons', () => {
    const result = filterContent('Republicans are fascist sympathizers');
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('Dangerous comparison pattern');
  });

  it('blocks elimination rhetoric', () => {
    const result = filterContent('They should be eliminated from society');
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('Dangerous comparison pattern');
  });

  it('blocks politician-to-dictator comparisons', () => {
    // Direct comparisons without "is" prefix work
    const result = filterContent('Trump like Hitler');
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('Dangerous comparison pattern');
  });

  it('blocks "X is like/worse than Y" comparisons', () => {
    // Fixed Session 132: regex alternation reordered to try longest match first
    expect(filterContent('Trump is worse than Hitler').pass).toBe(false);
    expect(filterContent('Trump is like Hitler').pass).toBe(false);
    expect(filterContent('Biden is like Stalin').pass).toBe(false);
    // Plain "is" still works
    expect(filterContent('Trump is Hitler').pass).toBe(false);
  });

  it('blocks group-as-threat rhetoric', () => {
    const result = filterContent('Muslim people are the enemy of freedom');
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('Dangerous comparison pattern');
  });

  it('allows legitimate political discussion without extremist framing', () => {
    expect(filterContent('Democrats and Republicans disagree on immigration policy').pass).toBe(true);
    expect(filterContent('Trump announces new executive order').pass).toBe(true);
  });
});

// ── Empty/invalid input ──────────────────────────────────────

describe('filterContent — invalid input', () => {
  it('rejects empty string', () => {
    const result = filterContent('');
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('Empty or invalid content');
  });

  it('rejects non-string via type coercion', () => {
    // TypeScript would catch this, but runtime safety matters
    const result = filterContent(null as unknown as string);
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('Empty or invalid content');
  });

  it('rejects undefined via type coercion', () => {
    const result = filterContent(undefined as unknown as string);
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('Empty or invalid content');
  });
});

// ── filterHeadline (thin wrapper) ────────────────────────────

describe('filterHeadline', () => {
  it('passes clean headline', () => {
    expect(filterHeadline('New study shows exercise benefits').pass).toBe(true);
  });

  it('blocks dirty headline', () => {
    expect(filterHeadline('Gas the opposition').pass).toBe(false);
  });
});

// ── filterDebate ─────────────────────────────────────────────

describe('filterDebate', () => {
  it('passes clean topic with no rounds', () => {
    const result = filterDebate('Should college athletes be paid?');
    expect(result.pass).toBe(true);
  });

  it('blocks dirty topic', () => {
    const result = filterDebate('Kill all opponents of this policy');
    expect(result.pass).toBe(false);
  });

  it('passes clean topic with clean string rounds', () => {
    const result = filterDebate('Is remote work better?', [
      'Remote work increases productivity',
      'Office collaboration is irreplaceable',
    ]);
    expect(result.pass).toBe(true);
  });

  it('blocks dirty round (string format)', () => {
    const result = filterDebate('Political debate topic', [
      'This is a fair argument',
      'White supremacy is the answer',
    ]);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('Round 2');
  });

  it('passes clean topic with clean DebateRound objects', () => {
    const rounds: DebateRound[] = [
      { text: 'First argument for the topic' },
      { argument: 'Counter-argument against the topic' },
    ];
    const result = filterDebate('Should we have a 4-day work week?', rounds);
    expect(result.pass).toBe(true);
  });

  it('blocks dirty DebateRound text field', () => {
    const rounds: DebateRound[] = [
      { text: 'Normal argument' },
      { text: 'They deserve to die for disagreeing' },
    ];
    const result = filterDebate('Debate topic', rounds);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('Round 2');
  });

  it('blocks dirty DebateRound argument field', () => {
    const rounds: DebateRound[] = [
      { argument: 'Normal point' },
      { argument: 'Ethnic cleansing is justified' },
    ];
    const result = filterDebate('Debate topic', rounds);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('Round 2');
  });

  it('handles empty DebateRound objects gracefully', () => {
    const rounds: DebateRound[] = [{}];
    const result = filterDebate('Valid topic', rounds);
    // Empty round → empty string → filterContent('') → fails
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('Round 1');
  });

  it('handles undefined rounds array', () => {
    const result = filterDebate('Valid topic', undefined);
    expect(result.pass).toBe(true);
  });
});
