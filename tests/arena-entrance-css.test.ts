// ============================================================
// ARENA ENTRANCE CSS — tests/arena-entrance-css.test.ts
// Source: src/arena/arena-entrance-css.ts
//
// CLASSIFICATION:
//   injectEntranceCSS() — DOM inject with _cssInjected guard → Integration test
//
// IMPORTS: (none)
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';

beforeEach(() => {
  document.head.innerHTML = '';
  // Reset the module-level _cssInjected guard by reimporting
});

// ── TC1: injectEntranceCSS — appends a <style> to document.head ──

describe('TC1 — injectEntranceCSS: appends style to document.head', () => {
  it('adds a style element to document.head on first call', async () => {
    const { injectEntranceCSS } = await import('../src/arena/arena-entrance-css.ts?v=ent-css-1');
    injectEntranceCSS();
    const styles = document.head.querySelectorAll('style');
    expect(styles.length).toBeGreaterThanOrEqual(1);
  });
});

// ── TC2: injectEntranceCSS — contains key CSS classes ────────

describe('TC2 — injectEntranceCSS: CSS content includes .ent-stage', () => {
  it('injected style contains .ent-stage class', async () => {
    document.head.innerHTML = '';
    const { injectEntranceCSS } = await import('../src/arena/arena-entrance-css.ts?v=ent-css-2');
    injectEntranceCSS();
    const style = document.head.querySelector('style');
    expect(style?.textContent).toContain('.ent-stage');
  });
});

// ── TC3: injectEntranceCSS — contains tier classes ───────────

describe('TC3 — injectEntranceCSS: CSS includes tier class names', () => {
  it('includes .ent-t1-wrap, .ent-t2-wrap, .ent-t3-wrap', async () => {
    document.head.innerHTML = '';
    const { injectEntranceCSS } = await import('../src/arena/arena-entrance-css.ts?v=ent-css-3');
    injectEntranceCSS();
    const style = document.head.querySelector('style');
    expect(style?.textContent).toContain('.ent-t1-wrap');
    expect(style?.textContent).toContain('.ent-t2-wrap');
    expect(style?.textContent).toContain('.ent-t3-wrap');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-entrance-css.ts has no imports', () => {
  it('has no import statements', () => {
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-entrance-css.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    expect(importLines).toHaveLength(0);
  });
});
