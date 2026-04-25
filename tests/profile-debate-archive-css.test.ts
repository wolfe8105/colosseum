// ============================================================
// PROFILE DEBATE ARCHIVE CSS — tests/profile-debate-archive-css.test.ts
// Source: src/profile-debate-archive.css.ts
//
// CLASSIFICATION:
//   injectCSS() — DOM side-effect, guards with _cssInjected
//               → Behavioral test — verify DOM state
//
// IMPORTS: (none — no external dependencies)
// ============================================================

import { describe, it, expect } from 'vitest';
import { injectCSS } from '../src/profile-debate-archive.css.ts';

// ── TC1: First call appends a style element ───────────────────

describe('TC1 — injectCSS: appends a style element to document.head', () => {
  it('adds a <style> element to document.head', () => {
    const before = document.head.querySelectorAll('style').length;
    injectCSS();
    const after = document.head.querySelectorAll('style').length;
    expect(after).toBeGreaterThan(before);
  });
});

// ── TC2: Idempotent — does not inject twice ───────────────────

describe('TC2 — injectCSS: is idempotent', () => {
  it('does not add a second style element when called again', () => {
    // TC1 already ran and set _cssInjected = true
    const count = document.head.querySelectorAll('style').length;
    injectCSS();
    injectCSS();
    expect(document.head.querySelectorAll('style').length).toBe(count);
  });
});

// ── TC3: Injected style contains key class names ─────────────

describe('TC3 — injectCSS: style content includes expected class names', () => {
  it('contains .dba-section', () => {
    const styles = Array.from(document.head.querySelectorAll('style'));
    const found = styles.some(s => s.textContent?.includes('.dba-section'));
    expect(found).toBe(true);
  });

  it('contains .dba-table', () => {
    const styles = Array.from(document.head.querySelectorAll('style'));
    const found = styles.some(s => s.textContent?.includes('.dba-table'));
    expect(found).toBe(true);
  });

  it('contains .dba-badge', () => {
    const styles = Array.from(document.head.querySelectorAll('style'));
    const found = styles.some(s => s.textContent?.includes('.dba-badge'));
    expect(found).toBe(true);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/profile-debate-archive.css.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list (file has no imports)', () => {
    const allowed: string[] = [];
    const source = readFileSync(
      resolve(__dirname, '../src/profile-debate-archive.css.ts'),
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
