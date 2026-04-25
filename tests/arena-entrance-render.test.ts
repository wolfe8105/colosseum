// ============================================================
// ARENA ENTRANCE RENDER — tests/arena-entrance-render.test.ts
// Source: src/arena/arena-entrance-render.ts
//
// CLASSIFICATION:
//   renderTier1() — HTML string builder + DOM mutation → Snapshot test
//   renderTier2() — HTML string builder + DOM mutation → Snapshot test
//   renderTier3() — HTML string builder + DOM mutation → Snapshot test
//
// IMPORTS:
//   { escapeHTML } from '../config.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

import { renderTier1, renderTier2, renderTier3 } from '../src/arena/arena-entrance-render.ts';

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: string) => s);
});

const makeStage = () => document.createElement('div');

// ── TC1: renderTier1 — writes ent-t1-wrap to stage ───────────

describe('TC1 — renderTier1: writes ent-t1-wrap into stage', () => {
  it('sets innerHTML containing ent-t1-wrap', () => {
    const stage = makeStage();
    renderTier1(stage, 'A', 'Alice', 1200, 'B', 'Bob', 1100, false, false);
    expect(stage.innerHTML).toContain('ent-t1-wrap');
  });
});

// ── TC2: renderTier1 — escapes names ─────────────────────────

describe('TC2 — renderTier1: calls escapeHTML on player names', () => {
  it('calls escapeHTML with myName and oppName', () => {
    const stage = makeStage();
    renderTier1(stage, 'A', 'Alice<>', 1200, 'B', 'Bob<>', 1100, false, false);
    const calls = mockEscapeHTML.mock.calls.map(([s]) => s);
    expect(calls).toContain('Alice<>');
    expect(calls).toContain('Bob<>');
  });
});

// ── TC3: renderTier1 — shows ELO numbers ─────────────────────

describe('TC3 — renderTier1: includes ELO values in output', () => {
  it('renders myElo and oppElo', () => {
    const stage = makeStage();
    renderTier1(stage, 'A', 'Alice', 1350, 'B', 'Bob', 980, false, false);
    expect(stage.innerHTML).toContain('1350');
    expect(stage.innerHTML).toContain('980');
  });
});

// ── TC4: renderTier1 — AI opp shows robot icon ───────────────

describe('TC4 — renderTier1: AI opponent shows robot icon instead of initial', () => {
  it('renders 🤖 when isAI is true', () => {
    const stage = makeStage();
    renderTier1(stage, 'A', 'Alice', 1200, 'B', 'Bot', 1200, true, false);
    expect(stage.innerHTML).toContain('🤖');
    expect(stage.innerHTML).toContain('AI');
  });
});

// ── TC5: renderTier1 — ranked badge shown when isRanked ──────

describe('TC5 — renderTier1: ranked badge visible when isRanked=true', () => {
  it('includes ent-ranked-badge when ranked', () => {
    const stage = makeStage();
    renderTier1(stage, 'A', 'Alice', 1200, 'B', 'Bob', 1200, false, true);
    expect(stage.innerHTML).toContain('ent-ranked-badge');
  });

  it('omits ent-ranked-badge when not ranked', () => {
    const stage = makeStage();
    renderTier1(stage, 'A', 'Alice', 1200, 'B', 'Bob', 1200, false, false);
    expect(stage.innerHTML).not.toContain('ent-ranked-badge');
  });
});

// ── TC6: renderTier2 — writes ent-t2-wrap-outer ──────────────

describe('TC6 — renderTier2: writes ent-t2-wrap-outer into stage', () => {
  it('sets innerHTML containing ent-t2-wrap-outer', () => {
    const stage = makeStage();
    renderTier2(stage, 'A', 'Alice', 1200, 'B', 'Bob', 1100, false, 'Hot topic', false);
    expect(stage.innerHTML).toContain('ent-t2-wrap-outer');
  });
});

// ── TC7: renderTier2 — includes topic text ────────────────────

describe('TC7 — renderTier2: includes topic in output', () => {
  it('renders topic string inside ent-t2-topic', () => {
    const stage = makeStage();
    renderTier2(stage, 'A', 'Alice', 1200, 'B', 'Bob', 1100, false, 'AI is overrated', false);
    expect(stage.innerHTML).toContain('AI is overrated');
    expect(stage.innerHTML).toContain('ent-t2-topic');
  });
});

// ── TC8: renderTier3 — writes ent-t3-wrap ────────────────────

describe('TC8 — renderTier3: writes ent-t3-wrap into stage', () => {
  it('sets innerHTML containing ent-t3-wrap', () => {
    const stage = makeStage();
    renderTier3(stage, 'A', 'Alice', 1400, 10, 3, 'B', 'Bob', 1350, false, 'Topic', false);
    expect(stage.innerHTML).toContain('ent-t3-wrap');
  });
});

// ── TC9: renderTier3 — includes W-L record ───────────────────

describe('TC9 — renderTier3: renders wins-losses record', () => {
  it('includes W and L counts in ent-t3-record', () => {
    const stage = makeStage();
    renderTier3(stage, 'A', 'Alice', 1400, 7, 2, 'B', 'Bob', 1350, false, 'Topic', false);
    expect(stage.innerHTML).toContain('7');
    expect(stage.innerHTML).toContain('2');
    expect(stage.innerHTML).toContain('ent-t3-record');
  });
});

// ── TC10: renderTier3 — escapes topic ────────────────────────

describe('TC10 — renderTier3: calls escapeHTML on topic', () => {
  it('passes topic through escapeHTML', () => {
    const stage = makeStage();
    renderTier3(stage, 'A', 'Alice', 1400, 5, 2, 'B', 'Bob', 1350, false, '<script>xss</script>', false);
    const calls = mockEscapeHTML.mock.calls.map(([s]) => s);
    expect(calls).toContain('<script>xss</script>');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-entrance-render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-entrance-render.ts'),
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
