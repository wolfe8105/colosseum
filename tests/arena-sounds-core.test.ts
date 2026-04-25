// ============================================================
// ARENA SOUNDS CORE — tests/arena-sounds-core.test.ts
// Source: src/arena/arena-sounds-core.ts
//
// CLASSIFICATION:
//   sfxEnabled() — localStorage read → Pure calculation test
//   getCtx()     — AudioContext wrapper → Integration test (browser API)
//   osc(), noise() — AudioContext helpers → (audio primitives, not directly testable without real AudioContext)
//
// IMPORTS: (none)
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { sfxEnabled } from '../src/arena/arena-sounds-core.ts';

beforeEach(() => {
  localStorage.clear();
});

// ── TC1: sfxEnabled — defaults to true when no setting stored ─

describe('TC1 — sfxEnabled: defaults to true when localStorage has no setting', () => {
  it('returns true when moderator_settings is absent', () => {
    expect(sfxEnabled()).toBe(true);
  });
});

// ── TC2: sfxEnabled — returns false when audio_sfx is false ──

describe('TC2 — sfxEnabled: returns false when audio_sfx=false in settings', () => {
  it('returns false when moderator_settings has audio_sfx: false', () => {
    localStorage.setItem('moderator_settings', JSON.stringify({ audio_sfx: false }));
    expect(sfxEnabled()).toBe(false);
  });
});

// ── TC3: sfxEnabled — returns true when audio_sfx is true ────

describe('TC3 — sfxEnabled: returns true when audio_sfx=true in settings', () => {
  it('returns true when moderator_settings has audio_sfx: true', () => {
    localStorage.setItem('moderator_settings', JSON.stringify({ audio_sfx: true }));
    expect(sfxEnabled()).toBe(true);
  });
});

// ── TC4: sfxEnabled — returns true when settings JSON is corrupt

describe('TC4 — sfxEnabled: returns true when localStorage value is corrupt JSON', () => {
  it('returns true on JSON parse error', () => {
    localStorage.setItem('moderator_settings', 'not-json{{');
    expect(sfxEnabled()).toBe(true);
  });
});

// ── TC5: sfxEnabled — true when other keys present but not audio_sfx

describe('TC5 — sfxEnabled: returns true when audio_sfx key is absent', () => {
  it('returns true when settings object has other keys but not audio_sfx', () => {
    localStorage.setItem('moderator_settings', JSON.stringify({ theme: 'dark' }));
    expect(sfxEnabled()).toBe(true);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-sounds-core.ts has no imports', () => {
  it('has no import statements', () => {
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-sounds-core.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    expect(importLines).toHaveLength(0);
  });
});
