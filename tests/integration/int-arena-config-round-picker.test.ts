// ============================================================
// INTEGRATOR — arena-config-round-picker + arena-state
// Seam #017 | score: 54
// Boundary: wireRoundPicker calls set_selectedRounds in arena-state
//           when the user clicks a round button.
//           roundPickerHTML renders ROUND_OPTIONS from arena-constants.
//           roundPickerCSS returns the style string.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let roundPickerCSS: () => string;
let roundPickerHTML: () => string;
let wireRoundPicker: (container: HTMLElement) => void;

let getSelectedRounds: () => number;

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  document.body.innerHTML = '';

  const pickerMod = await import('../../src/arena/arena-config-round-picker.ts');
  roundPickerCSS = pickerMod.roundPickerCSS;
  roundPickerHTML = pickerMod.roundPickerHTML;
  wireRoundPicker = pickerMod.wireRoundPicker;

  const stateMod = await import('../../src/arena/arena-state.ts');
  getSelectedRounds = () => stateMod.selectedRounds;
});

// ============================================================
// TC-I1: roundPickerHTML — returns HTML with round options
// ============================================================

describe('TC-I1: roundPickerHTML renders ROUND_OPTIONS from arena-constants', () => {
  it('returns a non-empty string containing at least one round button', () => {
    const html = roundPickerHTML();
    expect(html).toContain('arena-round-btn');
    expect(html).toContain('arena-round-picker');
  });

  it('contains arena-round-btn buttons with data-rounds attributes', () => {
    const html = roundPickerHTML();
    expect(html).toContain('data-rounds=');
  });
});

// ============================================================
// TC-I2: roundPickerCSS — returns a style block string
// ============================================================

describe('TC-I2: roundPickerCSS returns a non-empty CSS string', () => {
  it('returns a string containing .arena-round-picker rules', () => {
    const css = roundPickerCSS();
    expect(typeof css).toBe('string');
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain('arena-round-picker');
  });
});

// ============================================================
// TC-I3: wireRoundPicker — sets selectedRounds to default on wire
// ============================================================

describe('TC-I3: wireRoundPicker sets selectedRounds in arena-state on initialization', () => {
  it('calls set_selectedRounds with the default round count', () => {
    const container = document.createElement('div');
    container.innerHTML = roundPickerHTML();
    document.body.appendChild(container);

    wireRoundPicker(container);

    // Should have set to DEBATE.defaultRounds — any non-zero number
    expect(getSelectedRounds()).toBeGreaterThan(0);
  });
});

// ============================================================
// TC-I4: wireRoundPicker — clicking a button updates selectedRounds in arena-state
// ============================================================

describe('TC-I4: wireRoundPicker — clicking a round button updates selectedRounds in arena-state', () => {
  it('updates selectedRounds when any round button is clicked', () => {
    const container = document.createElement('div');
    container.innerHTML = roundPickerHTML();
    document.body.appendChild(container);
    wireRoundPicker(container);

    const buttons = container.querySelectorAll<HTMLButtonElement>('.arena-round-btn');
    expect(buttons.length).toBeGreaterThan(0);

    // Click the last button (whatever rounds value it has)
    const lastBtn = buttons[buttons.length - 1];
    const expectedRounds = parseInt(lastBtn.dataset.rounds || '0', 10);
    lastBtn.click();

    expect(getSelectedRounds()).toBe(expectedRounds);
  });

  it('moves the .selected class to the clicked button', () => {
    const container = document.createElement('div');
    container.innerHTML = roundPickerHTML();
    document.body.appendChild(container);
    wireRoundPicker(container);

    const buttons = container.querySelectorAll<HTMLButtonElement>('.arena-round-btn');
    const target = buttons[0];
    target.click();

    expect(target.classList.contains('selected')).toBe(true);
    // All others should not have selected
    Array.from(buttons).slice(1).forEach(btn => {
      expect(btn.classList.contains('selected')).toBe(false);
    });
  });
});

// ============================================================
// ARCH — arena-config-round-picker.ts imports only from config and arena-state
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — arena-config-round-picker.ts imports only from allowed modules', () => {
  it('imports only from config, arena-state, and arena-constants', () => {
    const allowed = new Set([
      '../config.ts',
      './arena-state.ts',
      './arena-constants.ts',
    ]);
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-config-round-picker.ts'),
      'utf-8'
    );
    const paths = source.split('\n')
      .filter(l => l.trimStart().startsWith('import '))
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter((p): p is string => Boolean(p));
    for (const path of paths) {
      expect(allowed, `Unexpected import in arena-config-round-picker.ts: ${path}`).toContain(path);
    }
  });
});
