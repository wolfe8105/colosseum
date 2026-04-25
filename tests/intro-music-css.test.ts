// ============================================================
// INTRO MUSIC CSS — tests/intro-music-css.test.ts
// Source: src/intro-music-css.ts
//
// CLASSIFICATION:
//   injectIntroMusicCSS() — DOM side-effect, guards with _cssInjected
//                         → Behavioral test — verify DOM state
//
// IMPORTS: (none — no external dependencies)
// ============================================================

import { describe, it, expect } from 'vitest';
import { injectIntroMusicCSS } from '../src/intro-music-css.ts';

// ── TC1: First call appends a style element ───────────────────

describe('TC1 — injectIntroMusicCSS: appends a style element to document.head', () => {
  it('adds a <style> element to document.head', () => {
    const before = document.head.querySelectorAll('style').length;
    injectIntroMusicCSS();
    const after = document.head.querySelectorAll('style').length;
    expect(after).toBeGreaterThan(before);
  });
});

// ── TC2: Idempotent — does not inject twice ───────────────────

describe('TC2 — injectIntroMusicCSS: is idempotent', () => {
  it('does not add a second style element when called again', () => {
    // TC1 already ran and set _cssInjected = true
    const count = document.head.querySelectorAll('style').length;
    injectIntroMusicCSS();
    injectIntroMusicCSS();
    expect(document.head.querySelectorAll('style').length).toBe(count);
  });
});

// ── TC3: Injected style contains key class names ─────────────

describe('TC3 — injectIntroMusicCSS: style content includes expected class names', () => {
  it('the injected style element contains .im-backdrop', () => {
    const styles = Array.from(document.head.querySelectorAll('style'));
    const found = styles.some(s => s.textContent?.includes('.im-backdrop'));
    expect(found).toBe(true);
  });

  it('the injected style element contains .im-save-btn', () => {
    const styles = Array.from(document.head.querySelectorAll('style'));
    const found = styles.some(s => s.textContent?.includes('.im-save-btn'));
    expect(found).toBe(true);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/intro-music-css.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list (file has no imports)', () => {
    const allowed: string[] = [];
    const source = readFileSync(
      resolve(__dirname, '../src/intro-music-css.ts'),
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
