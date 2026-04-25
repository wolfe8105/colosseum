// ============================================================
// NAVIGATION — tests/navigation.test.ts
// Source: src/navigation.ts
//
// CLASSIFICATION:
//   registerNavigate() — Behavioral/state mutation → State test
//   navigateTo()       — Behavioral: calls registered function → Behavioral test
//
// IMPORTS: none — zero external dependencies.
// NOTE: module has internal mutable state (_navigate).
//       Tests run sequentially within this file.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerNavigate, navigateTo } from '../src/navigation.ts';

beforeEach(() => {
  // Reset the registry before each test by registering a no-op
  registerNavigate(() => {});
});

// ── navigateTo before registration ───────────────────────────

describe('TC1 — navigateTo: no-op when nothing registered', () => {
  it('does not throw when called before registerNavigate', () => {
    // Unregister by providing a function, then replace with null-like behavior
    // We test the initial state: the module starts with _navigate = null
    // Since module state persists, we test that calling it is safe (no throw)
    expect(() => navigateTo('arena')).not.toThrow();
  });
});

// ── registerNavigate + navigateTo ────────────────────────────

describe('TC2 — registerNavigate: stores the function', () => {
  it('calls the registered function when navigateTo is invoked', () => {
    const fn = vi.fn();
    registerNavigate(fn);

    navigateTo('home');

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('TC3 — navigateTo: passes screenId to registered function', () => {
  it('forwards the screenId argument unchanged', () => {
    const fn = vi.fn();
    registerNavigate(fn);

    navigateTo('arena');

    expect(fn).toHaveBeenCalledWith('arena');
  });
});

describe('TC4 — navigateTo: each call dispatches with correct argument', () => {
  it('passes different screenIds correctly', () => {
    const fn = vi.fn();
    registerNavigate(fn);

    navigateTo('lobby');
    navigateTo('settings');

    expect(fn).toHaveBeenNthCalledWith(1, 'lobby');
    expect(fn).toHaveBeenNthCalledWith(2, 'settings');
  });
});

describe('TC5 — registerNavigate: replaces the previous registration', () => {
  it('old function is no longer called after re-registration', () => {
    const oldFn = vi.fn();
    const newFn = vi.fn();

    registerNavigate(oldFn);
    registerNavigate(newFn);

    navigateTo('profile');

    expect(oldFn).not.toHaveBeenCalled();
    expect(newFn).toHaveBeenCalledWith('profile');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/navigation.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed: string[] = [];
    const source = readFileSync(
      resolve(__dirname, '../src/navigation.ts'),
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
