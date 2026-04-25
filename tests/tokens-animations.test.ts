// ============================================================
// TOKENS ANIMATIONS — tests/tokens-animations.test.ts
// Source: src/tokens.animations.ts
//
// CLASSIFICATION:
//   _injectCSS()      — DOM mutation (module flag) → Behavioral test
//   _coinFlyUp()      — DOM + setTimeout → Behavioral test
//   _tokenToast()     — Orchestration (calls _coinFlyUp + showToast) → Integration test
//   _milestoneToast() — DOM + escapeHTML → Behavioral test
//
// IMPORTS:
//   { escapeHTML, showToast } from './config.ts'
//
// NOTE: cssInjected is module-level. Style injected in TC1 persists for TC2.
// Do NOT clear document.head in beforeEach.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));
const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
}));

import {
  _injectCSS,
  _coinFlyUp,
  _tokenToast,
  _milestoneToast,
} from '../src/tokens.animations.ts';

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
  mockShowToast.mockReset();
  document.body.innerHTML = '';
  // Do NOT clear document.head — cssInjected flag persists
});

// ── _injectCSS ────────────────────────────────────────────────

describe('TC1 — _injectCSS: injects style on first call', () => {
  it('appends a <style> with tokenFlyUp keyframe to document.head', () => {
    _injectCSS();
    const styles = Array.from(document.head.querySelectorAll('style'));
    const hasKeyframe = styles.some(s => s.textContent?.includes('tokenFlyUp'));
    expect(hasKeyframe).toBe(true);
  });
});

describe('TC2 — _injectCSS: second call does not inject again', () => {
  it('does not add a second tokenFlyUp style on repeated calls', () => {
    _injectCSS(); // first call from TC1 already set the flag
    _injectCSS();
    const styles = Array.from(document.head.querySelectorAll('style'));
    const count = styles.filter(s => s.textContent?.includes('tokenFlyUp')).length;
    expect(count).toBe(1);
  });
});

// ── _coinFlyUp ────────────────────────────────────────────────

describe('TC3 — _coinFlyUp: appends coin element to body', () => {
  it('adds a .token-fly-coin element to document.body', () => {
    _coinFlyUp();
    const coin = document.querySelector('.token-fly-coin');
    expect(coin).not.toBeNull();
    expect(coin!.textContent).toBe('🪙');
  });
});

describe('TC4 — _coinFlyUp: coin removed after 1000ms', () => {
  it('removes .token-fly-coin after setTimeout fires', () => {
    vi.useFakeTimers();
    _coinFlyUp();
    expect(document.querySelector('.token-fly-coin')).not.toBeNull();
    vi.advanceTimersByTime(1000);
    expect(document.querySelector('.token-fly-coin')).toBeNull();
    vi.useRealTimers();
  });
});

// ── _tokenToast ───────────────────────────────────────────────

describe('TC5 — _tokenToast: calls showToast with token count and label', () => {
  it('calls showToast with "+N 🪙 label" format', () => {
    _tokenToast(25, 'Daily Login');
    expect(mockShowToast).toHaveBeenCalledWith('+25 🪙 Daily Login', 'success');
  });
});

describe('TC6 — _tokenToast: no-op for zero tokens', () => {
  it('does not call showToast when tokens is 0', () => {
    _tokenToast(0, 'Empty');
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

describe('TC7 — _tokenToast: no-op for negative tokens', () => {
  it('does not call showToast when tokens is negative', () => {
    _tokenToast(-5, 'Neg');
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

// ── _milestoneToast ───────────────────────────────────────────

describe('TC8 — _milestoneToast: appends .milestone-toast to body', () => {
  it('adds a .milestone-toast element to document.body', () => {
    _milestoneToast('🏆', 'First Debate', 50, 0);
    expect(document.querySelector('.milestone-toast')).not.toBeNull();
  });
});

describe('TC9 — _milestoneToast: calls escapeHTML for icon and label', () => {
  it('passes icon and label through escapeHTML', () => {
    _milestoneToast('🎯', 'Hot Take', 10, 0);
    expect(mockEscapeHTML).toHaveBeenCalledWith('🎯');
    expect(mockEscapeHTML).toHaveBeenCalledWith('Hot Take');
  });
});

describe('TC10 — _milestoneToast: reward text shows tokens', () => {
  it('displays token reward in toast inner content', () => {
    _milestoneToast('🏅', 'Milestone', 100, 0);
    const toast = document.querySelector('.milestone-toast');
    expect(toast?.innerHTML).toContain('+100');
  });
});

describe('TC11 — _milestoneToast: reward text shows freezes', () => {
  it('displays freeze reward when freezes > 0', () => {
    _milestoneToast('❄️', 'Streak', 0, 3);
    const toast = document.querySelector('.milestone-toast');
    expect(toast?.innerHTML).toContain('+3');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/tokens.animations.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/tokens.animations.ts'),
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
