import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { injectRivalsPresenceCSS } from '../src/rivals-presence-css.ts';

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

// ── TC1: injects a style element ──────────────────────────────

describe('TC1 — injectRivalsPresenceCSS appends style to head', () => {
  it('adds a <style> element to document.head', () => {
    injectRivalsPresenceCSS();
    const style = document.getElementById('rival-presence-css');
    expect(style).not.toBeNull();
    expect(style?.tagName).toBe('STYLE');
  });
});

// ── TC2: style content includes keyframe names ────────────────

describe('TC2 — injected style contains keyframe animations', () => {
  it('style textContent contains rivalSlideIn and rivalSlideOut', () => {
    injectRivalsPresenceCSS();
    const style = document.getElementById('rival-presence-css') as HTMLStyleElement;
    expect(style.textContent).toContain('rivalSlideIn');
    expect(style.textContent).toContain('rivalSlideOut');
  });
});

// ── TC3: idempotent — does not inject twice ───────────────────

describe('TC3 — injectRivalsPresenceCSS is idempotent', () => {
  it('does not add a second style element on repeated calls', () => {
    injectRivalsPresenceCSS();
    injectRivalsPresenceCSS();
    const styles = document.querySelectorAll('#rival-presence-css');
    expect(styles.length).toBe(1);
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — rivals-presence-css.ts has no external imports', () => {
  it('has no import statements', () => {
    const source = readFileSync(
      resolve(__dirname, '../src/rivals-presence-css.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    // Leaf module — no imports at all
    expect(importLines.length).toBe(0);
  });
});
