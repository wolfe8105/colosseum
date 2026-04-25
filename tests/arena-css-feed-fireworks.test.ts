// ============================================================
// ARENA-CSS-FEED-FIREWORKS — tests/arena-css-feed-fireworks.test.ts
// Source: src/arena/arena-css-feed-fireworks.ts
//
// CLASSIFICATION:
//   injectFeedFireworksCSS() — DOM side-effect, appends <style> to document.head
//            → Behavioral test
//
// IMPORTS: (none)
// ============================================================

import { describe, it, expect } from 'vitest';
import { injectFeedFireworksCSS } from '../src/arena/arena-css-feed-fireworks.ts';

describe('TC1 — injectFeedFireworksCSS: appends a style element to document.head', () => {
  it('adds a <style> element to document.head', () => {
    const before = document.head.querySelectorAll('style').length;
    injectFeedFireworksCSS();
    expect(document.head.querySelectorAll('style').length).toBeGreaterThan(before);
  });
});

describe('TC2 — injectFeedFireworksCSS: injected style contains expected CSS class', () => {
  it('style content includes .feed-fireworks', () => {
    injectFeedFireworksCSS();
    const styles = Array.from(document.head.querySelectorAll('style'));
    const found = styles.some(s => s.textContent?.includes('.feed-fireworks'));
    expect(found).toBe(true);
  });
});

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-css-feed-fireworks.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list (file has no imports)', () => {
    const allowed: string[] = [];
    const source = readFileSync(resolve(__dirname, '../src/arena/arena-css-feed-fireworks.ts'), 'utf-8');
    const importLines = source.split('\n').filter(line => line.trimStart().startsWith('import '));
    const paths = importLines.map(line => line.match(/from\s+['"](.[^'"]+)['"]/)?.[1]).filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
