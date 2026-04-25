// ============================================================
// PROFILE DEPTH RENDER — tests/profile-depth-render.test.ts
// Source: src/pages/profile-depth.render.ts
//
// CLASSIFICATION:
//   sectionPct():    Pure calculation — fraction of answered questions
//   ringSVG():       HTML string builder — returns SVG string
//   renderGrid():    DOM behavioral — builds grid HTML and attaches listeners
//   renderQuestion(): HTML string builder — per question type
//
// IMPORTS:
//   { escapeHTML }              from '../config.ts'
//   { SECTIONS }                from './profile-depth.data.ts'
//   { answers, completedSections, activeSection } from './profile-depth.state.ts'
//   type imports from './profile-depth.types.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockAnswers: Record<string, unknown>       = {};
const mockCompletedSections: Set<string>         = new Set();
let   mockActiveSection: string | null           = null;

vi.mock('../src/config.ts', () => ({
  escapeHTML: (s: string) => s,
  showToast: vi.fn(),
  FEATURES: {},
}));

vi.mock('../src/pages/profile-depth.data.ts', () => ({
  SECTIONS: [
    {
      id: 'basics',
      icon: '👤',
      name: 'THE BASICS',
      reward: { type: 'powerup', text: 'Free power-up', powerUpId: 'reveal' },
      questions: [
        { id: 'b1', label: 'Name?', type: 'input', placeholder: 'Display name' },
        { id: 'b2', label: 'Age?',  type: 'chips', options: ['18-24', '25-34'], multi: false },
        { id: 'b3', label: 'Income?', type: 'select', options: ['<$25K', '$25-50K'] },
      ],
    },
  ],
  DEPTH_MILESTONES: [],
}));

vi.mock('../src/pages/profile-depth.state.ts', () => ({
  get answers() { return mockAnswers; },
  get completedSections() { return mockCompletedSections; },
  get activeSection() { return mockActiveSection; },
  set activeSection(v: string | null) { mockActiveSection = v; },
}));

import { sectionPct, ringSVG, renderGrid, renderQuestion } from '../src/pages/profile-depth.render.ts';
import type { Section, Question } from '../src/pages/profile-depth.types.ts';

// ── Helpers ───────────────────────────────────────────────────

const testSection: Section = {
  id: 'basics',
  icon: '👤',
  name: 'THE BASICS',
  reward: { type: 'powerup', text: 'Free power-up', powerUpId: 'reveal' },
  questions: [
    { id: 'b1', label: 'Name?', type: 'input', placeholder: 'Display name' } as Question,
    { id: 'b2', label: 'Age?',  type: 'chips', options: ['18-24', '25-34'], multi: false } as Question,
  ],
};

beforeEach(() => {
  document.body.innerHTML = '';
  Object.keys(mockAnswers).forEach(k => delete mockAnswers[k]);
  mockCompletedSections.clear();
  mockActiveSection = null;
  vi.clearAllMocks();
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — sectionPct returns 0 when no questions answered', () => {
  it('returns 0 for a section with no answers', () => {
    expect(sectionPct(testSection)).toBe(0);
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — sectionPct returns 50 when half the questions answered', () => {
  it('returns 50 when 1 of 2 questions has a value', () => {
    mockAnswers['b1'] = 'Alice';
    expect(sectionPct(testSection)).toBe(50);
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — sectionPct returns 100 when all questions answered', () => {
  it('returns 100 when all questions have non-empty values', () => {
    mockAnswers['b1'] = 'Alice';
    mockAnswers['b2'] = '18-24';
    expect(sectionPct(testSection)).toBe(100);
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — sectionPct ignores empty string answers', () => {
  it('counts empty string as unanswered', () => {
    mockAnswers['b1'] = '';
    expect(sectionPct(testSection)).toBe(0);
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — sectionPct ignores empty array answers', () => {
  it('counts [] as unanswered', () => {
    mockAnswers['b1'] = [];
    expect(sectionPct(testSection)).toBe(0);
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — ringSVG returns an SVG string', () => {
  it('returns a string containing <svg>', () => {
    const svg = ringSVG(50);
    expect(svg).toContain('<svg>');
    expect(svg).toContain('ring-fill');
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — ringSVG sets stroke-dashoffset relative to pct', () => {
  it('dashoffset differs between 0% and 100%', () => {
    const svg0   = ringSVG(0);
    const svg100 = ringSVG(100);
    expect(svg0).not.toBe(svg100);
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — renderGrid injects tiles into #section-grid', () => {
  it('creates .section-tile elements for each section in SECTIONS', () => {
    const grid = document.createElement('div');
    grid.id = 'section-grid';
    document.body.appendChild(grid);

    renderGrid(() => {});
    expect(grid.querySelectorAll('.section-tile').length).toBeGreaterThan(0);
  });
});

// ── TC9 ───────────────────────────────────────────────────────

describe('TC9 — renderGrid fires onSectionClick when tile is clicked', () => {
  it('calls callback with the section id', () => {
    const grid = document.createElement('div');
    grid.id = 'section-grid';
    document.body.appendChild(grid);

    const onClick = vi.fn();
    renderGrid(onClick);

    const tile = grid.querySelector<HTMLElement>('.section-tile')!;
    tile.click();
    expect(onClick).toHaveBeenCalledWith('basics');
  });
});

// ── TC10 ──────────────────────────────────────────────────────

describe('TC10 — renderQuestion returns input HTML for type=input question', () => {
  it('contains q-input class and data-qid', () => {
    const q: Question = { id: 'b1', label: 'Name?', type: 'input', placeholder: 'Enter name' } as Question;
    const html = renderQuestion(q);
    expect(html).toContain('q-input');
    expect(html).toContain('data-qid="b1"');
  });
});

// ── TC11 ──────────────────────────────────────────────────────

describe('TC11 — renderQuestion returns chips HTML for type=chips question', () => {
  it('contains chip class for each option', () => {
    const q: Question = { id: 'b2', label: 'Age?', type: 'chips', options: ['18-24', '25-34'], multi: false } as Question;
    const html = renderQuestion(q);
    expect(html).toContain('chip');
    expect(html).toContain('18-24');
  });
});

// ── TC12 ──────────────────────────────────────────────────────

describe('TC12 — renderQuestion returns slider HTML for type=slider question', () => {
  it('contains q-slider class and the label text', () => {
    const q: Question = { id: 's1', label: 'How competitive?', type: 'slider', min: 1, max: 10, labels: ['Low', 'High'] } as Question;
    const html = renderQuestion(q);
    expect(html).toContain('q-slider');
    expect(html).toContain('How competitive?');
  });
});

// ── TC13 ──────────────────────────────────────────────────────

describe('TC13 — renderQuestion returns select HTML for type=select question', () => {
  it('contains q-select class and each option value', () => {
    const q: Question = { id: 'i1', label: 'Income?', type: 'select', options: ['<$25K', '$25-50K'] } as Question;
    const html = renderQuestion(q);
    expect(html).toContain('q-select');
    expect(html).toContain('<$25K');
  });
});

// ── TC14 ──────────────────────────────────────────────────────

describe('TC14 — renderQuestion marks selected chip', () => {
  it('adds "selected" class to the chip matching the current answer', () => {
    mockAnswers['b2'] = '18-24';
    const q: Question = { id: 'b2', label: 'Age?', type: 'chips', options: ['18-24', '25-34'], multi: false } as Question;
    const html = renderQuestion(q);
    expect(html).toMatch(/chip selected/);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/profile-depth.render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../config.ts',
      './profile-depth.data.ts',
      './profile-depth.state.ts',
      './profile-depth.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/profile-depth.render.ts'),
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
