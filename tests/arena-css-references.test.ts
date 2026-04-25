// ============================================================
// ARENA-CSS-REFERENCES — tests/arena-css-references.test.ts
// Source: src/arena/arena-css-references.ts
//
// CLASSIFICATION:
//   injectReferencesCSS() — DOM side-effect, appends <style> to document.head
//            → Behavioral test
//
// IMPORTS: (none)
// ============================================================

import { describe, it, expect } from 'vitest';
import { injectReferencesCSS } from '../src/arena/arena-css-references.ts';

describe('TC1 — injectReferencesCSS: appends a style element to document.head', () => {
  it('adds a <style> element to document.head', () => {
    const before = document.head.querySelectorAll('style').length;
    injectReferencesCSS();
    expect(document.head.querySelectorAll('style').length).toBeGreaterThan(before);
  });
});

describe('TC2 — injectReferencesCSS: injected style contains expected CSS class', () => {
  it('style content includes .arena-ref-form', () => {
    injectReferencesCSS();
    const styles = Array.from(document.head.querySelectorAll('style'));
    const found = styles.some(s => s.textContent?.includes('.arena-ref-form'));
    expect(found).toBe(true);
  });
});

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-css-references.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list (file has no imports)', () => {
    const allowed: string[] = [];
    const source = readFileSync(resolve(__dirname, '../src/arena/arena-css-references.ts'), 'utf-8');
    const importLines = source.split('\n').filter(line => line.trimStart().startsWith('import '));
    const paths = importLines.map(line => line.match(/from\s+['"](.[^'"]+)['"]/)?.[1]).filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
