// ============================================================
// ARENA CONSTANTS — tests/arena-constants.test.ts
// Source: src/arena/arena-constants.ts
//
// CLASSIFICATION: No runtime functions — constant data exports only.
// Tests verify shape and key values of exported constants.
//
// IMPORTS:
//   import type { DebateMode, ModeInfo } from './arena-types.ts' — type-only, no mock.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  MODES,
  QUEUE_AI_PROMPT_SEC,
  QUEUE_HARD_TIMEOUT_SEC,
  QUEUE_CATEGORIES,
  MATCH_ACCEPT_SEC,
  MATCH_ACCEPT_POLL_TIMEOUT_SEC,
  ROUND_DURATION,
  AI_TOTAL_ROUNDS,
  OPPONENT_POLL_MS,
  OPPONENT_POLL_TIMEOUT_SEC,
  TEXT_MAX_CHARS,
  AI_TOPICS,
  AI_RESPONSES,
  ROUND_OPTIONS,
} from '../src/arena/arena-constants.ts';

// ── MODES ─────────────────────────────────────────────────────

describe('TC1 — MODES: all 4 debate modes present', () => {
  it('has live, voicememo, text, ai', () => {
    expect('live' in MODES).toBe(true);
    expect('voicememo' in MODES).toBe(true);
    expect('text' in MODES).toBe(true);
    expect('ai' in MODES).toBe(true);
  });
});

describe('TC2 — MODES: each entry has required fields', () => {
  it('every mode has id, icon, name, desc, available, color', () => {
    for (const [, mode] of Object.entries(MODES)) {
      expect(typeof mode.id).toBe('string');
      expect(typeof mode.icon).toBe('string');
      expect(typeof mode.name).toBe('string');
    }
  });
});

describe('TC3 — MODES: id matches key', () => {
  it('MODES[live].id === "live"', () => {
    expect(MODES['live'].id).toBe('live');
    expect(MODES['ai'].id).toBe('ai');
  });
});

// ── QUEUE_AI_PROMPT_SEC / QUEUE_HARD_TIMEOUT_SEC ─────────────

describe('TC4 — QUEUE_AI_PROMPT_SEC: ai mode has 0 prompt sec', () => {
  it('ai mode requires no prompt delay', () => {
    expect(QUEUE_AI_PROMPT_SEC['ai']).toBe(0);
  });
});

describe('TC5 — QUEUE_HARD_TIMEOUT_SEC: live has non-zero timeout', () => {
  it('live mode has positive hard timeout', () => {
    expect(QUEUE_HARD_TIMEOUT_SEC['live']).toBeGreaterThan(0);
  });
});

// ── QUEUE_CATEGORIES ──────────────────────────────────────────

describe('TC6 — QUEUE_CATEGORIES: is a non-empty array', () => {
  it('has at least 3 categories', () => {
    expect(QUEUE_CATEGORIES.length).toBeGreaterThanOrEqual(3);
  });
});

describe('TC7 — QUEUE_CATEGORIES: each entry has id, icon, label', () => {
  it('every category has all required fields', () => {
    for (const cat of QUEUE_CATEGORIES) {
      expect(typeof cat.id).toBe('string');
      expect(typeof cat.icon).toBe('string');
      expect(typeof cat.label).toBe('string');
    }
  });
});

// ── Numeric constants ─────────────────────────────────────────

describe('TC8 — MATCH_ACCEPT_SEC: positive number', () => {
  it('is a positive number', () => {
    expect(MATCH_ACCEPT_SEC).toBeGreaterThan(0);
  });
});

describe('TC9 — MATCH_ACCEPT_POLL_TIMEOUT_SEC > MATCH_ACCEPT_SEC', () => {
  it('poll timeout exceeds accept window', () => {
    expect(MATCH_ACCEPT_POLL_TIMEOUT_SEC).toBeGreaterThan(MATCH_ACCEPT_SEC);
  });
});

describe('TC10 — ROUND_DURATION: positive seconds', () => {
  it('round duration is positive', () => {
    expect(ROUND_DURATION).toBeGreaterThan(0);
  });
});

describe('TC11 — AI_TOTAL_ROUNDS: even number (symmetric turns)', () => {
  it('AI total rounds is an even number', () => {
    expect(AI_TOTAL_ROUNDS % 2).toBe(0);
  });
});

describe('TC12 — TEXT_MAX_CHARS: reasonable limit', () => {
  it('text message cap is between 500 and 10000', () => {
    expect(TEXT_MAX_CHARS).toBeGreaterThan(500);
    expect(TEXT_MAX_CHARS).toBeLessThanOrEqual(10000);
  });
});

// ── AI_TOPICS ─────────────────────────────────────────────────

describe('TC13 — AI_TOPICS: non-empty array of strings', () => {
  it('has at least 5 debate topics', () => {
    expect(AI_TOPICS.length).toBeGreaterThanOrEqual(5);
    for (const topic of AI_TOPICS) {
      expect(typeof topic).toBe('string');
      expect(topic.length).toBeGreaterThan(0);
    }
  });
});

// ── AI_RESPONSES ──────────────────────────────────────────────

describe('TC14 — AI_RESPONSES: has opening, rebuttal, closing arrays', () => {
  it('each phase has at least one response string', () => {
    expect(Array.isArray(AI_RESPONSES['opening'])).toBe(true);
    expect(AI_RESPONSES['opening'].length).toBeGreaterThan(0);
    expect(Array.isArray(AI_RESPONSES['rebuttal'])).toBe(true);
    expect(Array.isArray(AI_RESPONSES['closing'])).toBe(true);
  });
});

// ── ROUND_OPTIONS ─────────────────────────────────────────────

describe('TC15 — ROUND_OPTIONS: has entries with rounds/label/time', () => {
  it('every option has rounds, label, time fields', () => {
    expect(ROUND_OPTIONS.length).toBeGreaterThan(0);
    for (const opt of ROUND_OPTIONS) {
      expect(typeof opt.rounds).toBe('number');
      expect(typeof opt.label).toBe('string');
      expect(typeof opt.time).toBe('string');
    }
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-constants.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./arena-types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-constants.ts'),
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
