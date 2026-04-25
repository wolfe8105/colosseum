/**
 * Tests for src/pages/profile-depth.state.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSections = vi.hoisted(() => [
  {
    id: 'section-1',
    questions: [
      { id: 'q1' },
      { id: 'q2' },
    ],
  },
  {
    id: 'section-2',
    questions: [
      { id: 'q3' },
    ],
  },
]);

vi.mock('../src/pages/profile-depth.data.ts', () => ({
  SECTIONS: mockSections,
  DEPTH_MILESTONES: [],
}));

beforeEach(() => {
  localStorage.clear();
});

import {
  sanitizeAnswers, sanitizeCompleted,
  setAnswer, setActiveSection, setServerQuestionsAnswered,
  addCompletedSection, snapshotAnswered, hasAnswer,
  previouslyAnsweredIds,
} from '../src/pages/profile-depth.state.ts';

describe('hasAnswer — pure predicate', () => {
  it('TC1: returns false for undefined', () => {
    expect(hasAnswer(undefined)).toBe(false);
  });

  it('TC2: returns false for empty string', () => {
    expect(hasAnswer('')).toBe(false);
  });

  it('TC3: returns false for empty array', () => {
    expect(hasAnswer([])).toBe(false);
  });

  it('TC4: returns true for non-empty string', () => {
    expect(hasAnswer('hello')).toBe(true);
  });

  it('TC5: returns true for a number', () => {
    expect(hasAnswer(42)).toBe(true);
  });

  it('TC6: returns true for non-empty array', () => {
    expect(hasAnswer(['a'])).toBe(true);
  });
});

describe('sanitizeAnswers — filters invalid keys', () => {
  it('TC7: keeps keys that match valid question IDs', () => {
    const result = sanitizeAnswers({ q1: 'answer', invalid_key: 'bad' });
    expect(result).toHaveProperty('q1', 'answer');
    expect(result).not.toHaveProperty('invalid_key');
  });

  it('TC8: filters out strings longer than 500 chars', () => {
    const result = sanitizeAnswers({ q1: 'x'.repeat(501) });
    expect(result).not.toHaveProperty('q1');
  });

  it('TC9: accepts numbers as answers', () => {
    const result = sanitizeAnswers({ q2: 5 });
    expect(result).toHaveProperty('q2', 5);
  });

  it('TC10: returns empty object for null input', () => {
    expect(sanitizeAnswers(null)).toEqual({});
  });
});

describe('sanitizeCompleted — filters invalid section IDs', () => {
  it('TC11: keeps valid section IDs', () => {
    const result = sanitizeCompleted(['section-1', 'section-2']);
    expect(result.has('section-1')).toBe(true);
    expect(result.has('section-2')).toBe(true);
  });

  it('TC12: excludes invalid section IDs', () => {
    const result = sanitizeCompleted(['section-1', 'bogus-section']);
    expect(result.has('bogus-section')).toBe(false);
  });

  it('TC13: returns empty Set for non-array input', () => {
    expect(sanitizeCompleted('not-an-array')).toEqual(new Set());
  });
});

describe('setters — callable without throwing', () => {
  it('TC14: setAnswer can be called', () => {
    expect(() => setAnswer('q1', 'value')).not.toThrow();
  });

  it('TC15: setActiveSection can be called', () => {
    expect(() => setActiveSection('section-1')).not.toThrow();
    expect(() => setActiveSection(null)).not.toThrow();
  });

  it('TC16: setServerQuestionsAnswered can be called', () => {
    expect(() => setServerQuestionsAnswered(5)).not.toThrow();
  });

  it('TC17: addCompletedSection can be called', () => {
    expect(() => addCompletedSection('section-1')).not.toThrow();
  });
});

describe('snapshotAnswered — populates previouslyAnsweredIds', () => {
  it('TC18: adds answered question IDs to previouslyAnsweredIds', () => {
    setAnswer('q1', 'some answer');
    snapshotAnswered();
    expect(previouslyAnsweredIds.has('q1')).toBe(true);
  });
});

describe('ARCH — src/pages/profile-depth.state.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./profile-depth.data.ts', './profile-depth.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/profile-depth.state.ts'),
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
