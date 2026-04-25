/**
 * Tests for src/pages/group-banner-css.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

beforeEach(() => {
  document.head.innerHTML = '';
  vi.resetModules();
});

describe('injectGroupBannerCSS — appends style on first call', () => {
  it('TC1: adds a style element to document.head', async () => {
    const { injectGroupBannerCSS } = await import('../src/pages/group-banner-css.ts');
    injectGroupBannerCSS();
    expect(document.head.querySelectorAll('style').length).toBeGreaterThan(0);
  });

  it('TC2: style contains .group-banner-zone', async () => {
    const { injectGroupBannerCSS } = await import('../src/pages/group-banner-css.ts');
    injectGroupBannerCSS();
    const style = document.head.querySelector('style');
    expect(style?.textContent).toContain('.group-banner-zone');
  });
});

describe('injectGroupBannerCSS — idempotent (does not inject twice)', () => {
  it('TC3: calling twice still results in only one style element', async () => {
    const { injectGroupBannerCSS } = await import('../src/pages/group-banner-css.ts');
    injectGroupBannerCSS();
    injectGroupBannerCSS();
    const styles = document.head.querySelectorAll('style');
    expect(styles.length).toBe(1);
  });
});

describe('ARCH — src/pages/group-banner-css.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed: string[] = [];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/group-banner-css.ts'),
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
