// ============================================================
// ARENA CONFIG ROUND PICKER — tests/arena-config-round-picker.test.ts
// Source: src/arena/arena-config-round-picker.ts
//
// CLASSIFICATION:
//   roundPickerCSS()  — HTML string builder → Snapshot test
//   roundPickerHTML() — HTML string builder → Snapshot test
//   wireRoundPicker() — DOM event wiring → Behavioral test
//
// IMPORTS:
//   { DEBATE }             from '../config.ts'
//   { set_selectedRounds } from './arena-state.ts'
//   { ROUND_OPTIONS }      from './arena-constants.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSet_selectedRounds = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  DEBATE: { defaultRounds: 4 },
  escapeHTML: (s: string) => s,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  set_selectedRounds: mockSet_selectedRounds,
  set_view: vi.fn(),
  set_currentDebate: vi.fn(),
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  ROUND_OPTIONS: [
    { rounds: 2, time: '2 min' },
    { rounds: 4, time: '4 min' },
    { rounds: 6, time: '6 min' },
    { rounds: 8, time: '8 min' },
  ],
}));

import {
  roundPickerCSS,
  roundPickerHTML,
  wireRoundPicker,
} from '../src/arena/arena-config-round-picker.ts';

beforeEach(() => {
  mockSet_selectedRounds.mockReset();
  document.body.innerHTML = '';
});

// ── TC1: roundPickerCSS — returns CSS string ──────────────────

describe('TC1 — roundPickerCSS: returns a CSS string with .arena-round-picker', () => {
  it('includes .arena-round-picker in output', () => {
    const css = roundPickerCSS();
    expect(css).toContain('.arena-round-picker');
  });
});

// ── TC2: roundPickerHTML — returns HTML with round buttons ────

describe('TC2 — roundPickerHTML: returns HTML containing round buttons', () => {
  it('includes .arena-round-btn elements for each ROUND_OPTION', () => {
    const html = roundPickerHTML();
    const matches = html.match(/arena-round-btn/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });
});

// ── TC3: roundPickerHTML — default round has selected class ──

describe('TC3 — roundPickerHTML: default round button has selected class', () => {
  it('marks default round (4) button as selected', () => {
    const html = roundPickerHTML();
    expect(html).toContain('selected');
  });
});

// ── TC4: wireRoundPicker — calls set_selectedRounds on init ──

describe('TC4 — wireRoundPicker: calls set_selectedRounds with defaultRounds', () => {
  it('initializes selected rounds to DEBATE.defaultRounds', () => {
    const container = document.createElement('div');
    container.innerHTML = roundPickerHTML();
    wireRoundPicker(container);
    expect(mockSet_selectedRounds).toHaveBeenCalledWith(4);
  });
});

// ── TC5: wireRoundPicker — click updates selected class ──────

describe('TC5 — wireRoundPicker: clicking a round button moves selected class', () => {
  it('removes selected from all and adds to clicked button', () => {
    const container = document.createElement('div');
    container.innerHTML = roundPickerHTML();
    document.body.appendChild(container);
    wireRoundPicker(container);

    const btns = container.querySelectorAll<HTMLElement>('.arena-round-btn');
    const firstBtn = btns[0];
    firstBtn.click();
    expect(firstBtn.classList.contains('selected')).toBe(true);
    // Others should not have selected
    const othersSelected = Array.from(btns).slice(1).some(b => b.classList.contains('selected'));
    expect(othersSelected).toBe(false);
  });
});

// ── TC6: wireRoundPicker — click calls set_selectedRounds ────

describe('TC6 — wireRoundPicker: clicking a button calls set_selectedRounds with that value', () => {
  it('calls set_selectedRounds with the rounds value from data-rounds attribute', () => {
    const container = document.createElement('div');
    container.innerHTML = roundPickerHTML();
    document.body.appendChild(container);
    wireRoundPicker(container);
    mockSet_selectedRounds.mockReset();

    const btn = container.querySelector<HTMLElement>('[data-rounds="2"]')!;
    btn.click();
    expect(mockSet_selectedRounds).toHaveBeenCalledWith(2);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-config-round-picker.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../config.ts', './arena-state.ts', './arena-constants.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-config-round-picker.ts'),
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
