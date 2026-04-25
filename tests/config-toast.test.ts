// ============================================================
// CONFIG TOAST — tests/config-toast.test.ts
// Source: src/config.toast.ts
//
// CLASSIFICATION:
//   showToast() — DOM event wiring + setTimeout → Behavioral test
//
// IMPORTS:
//   import type { ToastType } from './config.types' — type-only, no mock needed.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showToast } from '../src/config.toast.ts';

beforeEach(() => {
  document.body.innerHTML = '';
  // Do not clear document.head — _toastKeyframeInjected flag persists in module scope.
  // The keyframe style injected by TC1 intentionally remains in head for TC5 to verify.
  vi.useRealTimers();
});

// ── showToast ─────────────────────────────────────────────────

describe('TC1 — showToast: appends toast element to body', () => {
  it('creates #colo-toast element in document.body', () => {
    showToast('Hello');
    expect(document.getElementById('colo-toast')).not.toBeNull();
  });
});

describe('TC2 — showToast: toast contains the message text', () => {
  it('sets textContent to the provided message', () => {
    showToast('Test message');
    const toast = document.getElementById('colo-toast');
    expect(toast?.textContent).toBe('Test message');
  });
});

describe('TC3 — showToast: toast has role="alert"', () => {
  it('sets role="alert" for accessibility', () => {
    showToast('Accessible toast');
    const toast = document.getElementById('colo-toast');
    expect(toast?.getAttribute('role')).toBe('alert');
  });
});

describe('TC4 — showToast: second call removes previous toast', () => {
  it('only one #colo-toast exists after two calls', () => {
    showToast('First');
    showToast('Second');
    const toasts = document.querySelectorAll('#colo-toast');
    expect(toasts).toHaveLength(1);
    expect(toasts[0].textContent).toBe('Second');
  });
});

describe('TC5 — showToast: injects keyframe style on first call', () => {
  it('appends a <style> to document.head on first call', () => {
    showToast('First call');
    const styles = document.head.querySelectorAll('style');
    expect(styles.length).toBeGreaterThan(0);
    // Find the keyframe style
    const hasKeyframe = Array.from(styles).some(s =>
      s.textContent?.includes('coloToastIn')
    );
    expect(hasKeyframe).toBe(true);
  });
});

describe('TC6 — showToast: error type (auto-remove after 4s)', () => {
  it('error toast fades after 4000ms', () => {
    vi.useFakeTimers();
    showToast('Error!', 'error');
    const toast = document.getElementById('colo-toast');
    expect(toast).not.toBeNull();
    vi.advanceTimersByTime(4000);
    // After timeout, opacity is set to '0'
    expect(toast?.style.opacity).toBe('0');
  });
});

describe('TC7 — showToast: default type is info', () => {
  it('does not throw when no type is provided', () => {
    expect(() => showToast('Info message')).not.toThrow();
    expect(document.getElementById('colo-toast')).not.toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/config.toast.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.types', './config.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/config.toast.ts'),
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
