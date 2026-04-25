// ============================================================
// ARENA-CSS-MODE-SELECT — tests/arena-css-mode-select.test.ts
// Source: src/arena/arena-css-mode-select.ts
//
// CLASSIFICATION:
//   injectModeSelectCSS() — DOM side-effect, appends <style> to document.head
//            → Behavioral test
//
// IMPORTS: (none)
// ============================================================

import { describe, it, expect } from 'vitest';
import { injectModeSelectCSS } from '../src/arena/arena-css-mode-select.ts';

describe('TC1 — injectModeSelectCSS: appends a style element to document.head', () => {
  it('adds a <style> element to document.head', () => {
    const before = document.head.querySelectorAll('style').length;
    injectModeSelectCSS();
    expect(document.head.querySelectorAll('style').length).toBeGreaterThan(before);
  });
});

describe('TC2 — injectModeSelectCSS: injected style contains expected CSS class', () => {
  it('style content includes .arena-mode-overlay', () => {
    injectModeSelectCSS();
    const styles = Array.from(document.head.querySelectorAll('style'));
    const found = styles.some(s => s.textContent?.includes('.arena-mode-overlay'));
    expect(found).toBe(true);
  });
});

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-css-mode-select.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list (file has no imports)', () => {
    const allowed: string[] = [];
    const source = readFileSync(resolve(__dirname, '../src/arena/arena-css-mode-select.ts'), 'utf-8');
    const importLines = source.split('\n').filter(line => line.trimStart().startsWith('import '));
    const paths = importLines.map(line => line.match(/from\s+['"](.[^'"]+)['"]/)?.[1]).filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
