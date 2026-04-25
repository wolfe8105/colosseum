// ============================================================
// PROFILE DEPTH DATA — tests/profile-depth-data.test.ts
// Source: src/pages/profile-depth.data.ts
//
// CLASSIFICATION:
//   SECTIONS, DEPTH_MILESTONES: Pure data constants → structural assertions
//
// IMPORTS: type-only — nothing to mock
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { SECTIONS, DEPTH_MILESTONES } from '../src/pages/profile-depth.data.ts';

// ── TC1 ────────────────────────────────────────��──────────────

describe('TC1 — SECTIONS exports an array of sections', () => {
  it('SECTIONS is a non-empty array', () => {
    expect(Array.isArray(SECTIONS)).toBe(true);
    expect(SECTIONS.length).toBeGreaterThan(0);
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — every section has required fields', () => {
  it('each section has id, icon, name, reward, and questions', () => {
    for (const s of SECTIONS) {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('icon');
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('reward');
      expect(s).toHaveProperty('questions');
      expect(Array.isArray(s.questions)).toBe(true);
    }
  });
});

// ── TC3 ─────────────────────────────────────���─────────────────

describe('TC3 — all section IDs are unique', () => {
  it('no two sections share the same id', () => {
    const ids = SECTIONS.map(s => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ── TC4 ────────────────────────���──────────────────────────────

describe('TC4 — every question has id, label, and type', () => {
  it('each question in each section has required fields', () => {
    for (const s of SECTIONS) {
      for (const q of s.questions) {
        expect(q).toHaveProperty('id');
        expect(q).toHaveProperty('label');
        expect(q).toHaveProperty('type');
      }
    }
  });
});

// ── TC5 ─────────────────────────────────��─────────────────────

describe('TC5 — total question count is at least 100', () => {
  it('sums to >= 100 questions across all sections', () => {
    const total = SECTIONS.reduce((acc, s) => acc + s.questions.length, 0);
    expect(total).toBeGreaterThanOrEqual(100);
  });
});

// ── TC6 ──────────────��─────────────────────────────────��──────

describe('TC6 — DEPTH_MILESTONES has 4 entries', () => {
  it('exports exactly 4 milestones', () => {
    expect(DEPTH_MILESTONES).toHaveLength(4);
  });
});

// ── TC7 ──────────────────────────────────────────���────────────

describe('TC7 — DEPTH_MILESTONES thresholds are ordered ascending', () => {
  it('milestones progress from 25 to 100', () => {
    const thresholds = DEPTH_MILESTONES.map(m => m.threshold);
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
    }
    expect(thresholds[thresholds.length - 1]).toBe(100);
  });
});

// ── TC8 ─────────────────────────���─────────────────────────────

describe('TC8 — "basics" section is the first section', () => {
  it('first section id is "basics"', () => {
    expect(SECTIONS[0].id).toBe('basics');
  });
});

// ── ARCH ───────────────────────────────────────────────────���─

describe('ARCH — src/pages/profile-depth.data.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./profile-depth.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/profile-depth.data.ts'),
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
