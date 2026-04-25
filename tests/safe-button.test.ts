/**
 * Tests for src/safe-button.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { safeButton } from '../src/safe-button.ts';

describe('safeButton — no-op when btn is null', () => {
  it('TC1: returns a function that does nothing when btn is null', () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const clickHandler = safeButton(null, 'LOADING', 'RESET', handler);
    expect(() => clickHandler()).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('safeButton — no-op when btn is already disabled', () => {
  it('TC2: does not call handler if button is already disabled', () => {
    const btn = document.createElement('button');
    btn.disabled = true;
    const handler = vi.fn().mockResolvedValue(undefined);
    const clickHandler = safeButton(btn, 'LOADING', 'RESET', handler);
    clickHandler();
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('safeButton — full signature disables button and changes text', () => {
  it('TC3: disables button and sets loading text while handler runs', async () => {
    const btn = document.createElement('button');
    btn.textContent = 'SAVE';
    let resolveHandler!: () => void;
    const handlerPromise = new Promise<void>(res => { resolveHandler = res; });
    const handler = vi.fn().mockReturnValue(handlerPromise);
    const clickHandler = safeButton(btn, 'SAVING…', 'SAVE', handler);
    clickHandler();
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toBe('SAVING…');
    resolveHandler();
    await handlerPromise;
    await Promise.resolve(); // flush finally
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('SAVE');
  });
});

describe('safeButton — re-enables button on handler error', () => {
  it('TC4: re-enables button even if handler throws', async () => {
    const btn = document.createElement('button');
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    const clickHandler = safeButton(btn, 'LOADING', 'DONE', handler);
    clickHandler();
    await new Promise(r => setTimeout(r, 0));
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('DONE');
  });
});

describe('safeButton — short signature (no text changes)', () => {
  it('TC5: disables and re-enables without changing text', async () => {
    const btn = document.createElement('button');
    btn.textContent = 'GO';
    const handler = vi.fn().mockResolvedValue(undefined);
    const clickHandler = safeButton(btn, handler);
    clickHandler();
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toBe('GO'); // unchanged
    await new Promise(r => setTimeout(r, 0));
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('GO'); // still unchanged
  });
});

describe('ARCH — src/safe-button.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed: string[] = [];
    const source = readFileSync(
      resolve(__dirname, '../src/safe-button.ts'),
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
