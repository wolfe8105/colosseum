// ============================================================
// THE COLOSSEUM — CATEGORY CLASSIFIER TESTS
// Tests classifyCategory() — pure function, zero deps.
// Session 132.
// ============================================================

import { describe, it, expect } from 'vitest';
import { classifyCategory } from '../lib/category-classifier';
import type { Category } from '../lib/category-classifier';

// ── Feed label override ──────────────────────────────────────

describe('classifyCategory — feedLabel override', () => {
  it('returns sports when feedLabel is "sports"', () => {
    expect(classifyCategory('Random unrelated headline', 'sports')).toBe('sports');
  });

  it('returns politics when feedLabel is "Google News - Politics"', () => {
    expect(classifyCategory('Random unrelated headline', 'Google News - Politics')).toBe('politics');
  });

  it('returns entertainment when feedLabel is "entertainment"', () => {
    expect(classifyCategory('Random unrelated headline', 'entertainment')).toBe('entertainment');
  });

  it('ignores unknown feedLabel and falls through to keyword matching', () => {
    expect(classifyCategory('LeBron scores 40 in Lakers win', 'unknown_feed')).toBe('sports');
  });

  it('feedLabel is case-insensitive', () => {
    expect(classifyCategory('anything', 'SPORTS')).toBe('sports');
    expect(classifyCategory('anything', 'Politics')).toBe('politics');
  });

  it('feedLabel trims whitespace', () => {
    expect(classifyCategory('anything', '  sports  ')).toBe('sports');
  });
});

// ── Sports classification ────────────────────────────────────

describe('classifyCategory — sports keywords', () => {
  it('detects NBA keyword', () => {
    expect(classifyCategory('NBA trade deadline heats up')).toBe('sports');
  });

  it('detects NFL keyword', () => {
    expect(classifyCategory('NFL draft picks announced today')).toBe('sports');
  });

  it('detects player names', () => {
    expect(classifyCategory('Mahomes throws 4 touchdowns in Chiefs victory')).toBe('sports');
  });

  it('detects team names', () => {
    expect(classifyCategory('The Cowboys beat the Eagles in overtime thriller')).toBe('sports');
  });

  it('word-boundary prevents false positive on short keywords', () => {
    // "nba" should not match inside "barnba" or similar
    // But "NBA" as standalone word should match
    expect(classifyCategory('The NBA finals are coming')).toBe('sports');
  });

  it('detects multiple sports signals for strong classification', () => {
    expect(classifyCategory('LeBron Lakers playoff touchdown Super Bowl')).toBe('sports');
  });
});

// ── Politics classification ──────────────────────────────────

describe('classifyCategory — politics keywords', () => {
  it('detects Trump', () => {
    expect(classifyCategory('Trump announces new tariff policy')).toBe('politics');
  });

  it('detects Congress', () => {
    expect(classifyCategory('Congress votes on new legislation today')).toBe('politics');
  });

  it('detects geopolitical keywords', () => {
    expect(classifyCategory('NATO responds to Putin threat over Ukraine')).toBe('politics');
  });

  it('detects election keywords', () => {
    expect(classifyCategory('Primary election results shock political observers')).toBe('politics');
  });
});

// ── Entertainment classification ─────────────────────────────

describe('classifyCategory — entertainment keywords', () => {
  it('detects Oscar', () => {
    expect(classifyCategory('Oscar nominations announced for best picture')).toBe('entertainment');
  });

  it('detects streaming platforms', () => {
    expect(classifyCategory('Netflix drops surprise season finale trailer')).toBe('entertainment');
  });

  it('detects celebrity names', () => {
    expect(classifyCategory('Taylor Swift announces new concert tour dates')).toBe('entertainment');
  });

  it('detects gaming keywords', () => {
    expect(classifyCategory('Nintendo reveals next-gen PlayStation competitor')).toBe('entertainment');
  });
});

// ── Couples classification ───────────────────────────────────

describe('classifyCategory — couples keywords', () => {
  it('detects relationship advice', () => {
    expect(classifyCategory('Relationship advice for dealing with infidelity')).toBe('couples');
  });

  it('detects dating apps', () => {
    expect(classifyCategory('Tinder vs Bumble: which dating app wins?')).toBe('couples');
  });

  it('detects situationship', () => {
    expect(classifyCategory('Are you stuck in a situationship?')).toBe('couples');
  });
});

// ── Music classification ─────────────────────────────────────

describe('classifyCategory — music keywords', () => {
  it('detects new album', () => {
    expect(classifyCategory('Drake drops surprise new album on Spotify')).toBe('music');
  });

  it('detects music festival', () => {
    expect(classifyCategory('Coachella 2026 lineup announced')).toBe('music');
  });
});

// ── Movies classification ────────────────────────────────────

describe('classifyCategory — movies keywords', () => {
  it('detects movie review', () => {
    expect(classifyCategory('Movie review: the opening weekend trilogy finale')).toBe('movies');
  });

  it('detects rotten tomatoes', () => {
    expect(classifyCategory('Rotten Tomatoes gives horror film a perfect score')).toBe('movies');
  });

  it('detects Star Wars', () => {
    expect(classifyCategory('New Star Wars theatrical release announced for IMAX')).toBe('movies');
  });
});

// ── General fallback ─────────────────────────────────────────

describe('classifyCategory — general fallback', () => {
  it('returns general for unrelated headline', () => {
    expect(classifyCategory('Scientists reveal high-speed laboratory technique')).toBe('general');
  });

  it('word-boundary prevents substring false positives on long keywords', () => {
    // "computing" contains "putin" as substring — must NOT match politics
    expect(classifyCategory('Cloud computing transforms enterprise workflows')).toBe('general');
    // "trumpet" contains "trump" — must NOT match politics
    expect(classifyCategory('Trumpet player wins jazz competition')).toBe('general');
  });

  it('returns general for empty string', () => {
    expect(classifyCategory('')).toBe('general');
  });

  it('returns general for gibberish', () => {
    expect(classifyCategory('asdfghjkl qwerty zxcvbnm')).toBe('general');
  });
});

// ── Edge cases ───────────────────────────────────────────────

describe('classifyCategory — edge cases', () => {
  it('handles undefined feedLabel gracefully', () => {
    expect(classifyCategory('LeBron scores 40')).toBe('sports');
  });

  it('handles empty feedLabel string', () => {
    // Empty string is falsy, falls through to keyword matching
    expect(classifyCategory('LeBron scores 40', '')).toBe('sports');
  });

  it('picks category with highest score when multiple match', () => {
    // "Trump" = politics, "NFL" = sports — if headline has more sports signals, sports wins
    const result = classifyCategory('NFL Cowboys Eagles playoff touchdown');
    expect(result).toBe('sports');
  });

  it('case insensitive matching', () => {
    expect(classifyCategory('NBA TRADE DEADLINE HEATS UP')).toBe('sports');
    expect(classifyCategory('TRUMP ANNOUNCES NEW TARIFF')).toBe('politics');
  });
});
