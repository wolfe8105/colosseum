/**
 * Tests for src/pages/home.state.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { CATEGORIES, state } from '../src/pages/home.state.ts';

describe('CATEGORIES — exported constant has correct structure', () => {
  it('TC1: contains at least 4 category entries', () => {
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(4);
  });

  it('TC2: each category has id, icon, label, section, count, hasLive', () => {
    for (const cat of CATEGORIES) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('icon');
      expect(cat).toHaveProperty('label');
      expect(cat).toHaveProperty('section');
      expect(cat).toHaveProperty('count');
      expect(typeof cat.hasLive).toBe('boolean');
    }
  });

  it('TC3: politics category exists', () => {
    expect(CATEGORIES.find(c => c.id === 'politics')).toBeDefined();
  });
});

describe('state — initial values', () => {
  it('TC4: currentOverlayCat starts as null', () => {
    expect(state.currentOverlayCat).toBeNull();
  });

  it('TC5: currentScreen starts as "home"', () => {
    expect(state.currentScreen).toBe('home');
  });

  it('TC6: arsenalRefs starts as empty array', () => {
    expect(state.arsenalRefs).toEqual([]);
  });
});

describe('ARCH — src/pages/home.state.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./home.types.ts', '../reference-arsenal.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.state.ts'),
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
