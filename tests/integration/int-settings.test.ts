// int-settings.test.ts
// Seam #331 — src/pages/settings.ts → settings.helpers
// setChecked / getChecked / toast / getEl / validateTier helpers drive DB-loaded toggle wiring.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Supabase mock — hoisted so it applies before any module load
// ---------------------------------------------------------------------------
const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------
beforeEach(async () => {
  vi.resetModules();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// ARCH filter — verify settings.helpers is imported by settings.ts
// ---------------------------------------------------------------------------
describe('ARCH: settings.ts imports settings.helpers', () => {
  it('should import setChecked from settings.helpers', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/settings.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasHelpers = importLines.some(l => l.includes('settings.helpers'));
    expect(hasHelpers).toBe(true);
  });

  it('settings.helpers should export setChecked, getChecked, toast, getEl, validateTier', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/settings.helpers.ts'),
      'utf-8'
    );
    expect(src).toMatch(/export function setChecked/);
    expect(src).toMatch(/export function getChecked/);
    expect(src).toMatch(/export function toast/);
    expect(src).toMatch(/export function getEl/);
    expect(src).toMatch(/export function validateTier/);
  });
});

// ---------------------------------------------------------------------------
// TC1-TC2: setChecked — sets input.checked to given boolean
// ---------------------------------------------------------------------------
describe('setChecked', () => {
  it('TC1: sets input checked to true when element exists', async () => {
    document.body.innerHTML = `<input type="checkbox" id="set-notif-challenge" />`;
    const { setChecked } = await import('../../src/pages/settings.helpers.ts');
    setChecked('set-notif-challenge', true);
    const el = document.getElementById('set-notif-challenge') as HTMLInputElement;
    expect(el.checked).toBe(true);
  });

  it('TC2: sets input checked to false on a previously-checked input', async () => {
    document.body.innerHTML = `<input type="checkbox" id="set-notif-challenge" checked />`;
    const { setChecked } = await import('../../src/pages/settings.helpers.ts');
    setChecked('set-notif-challenge', false);
    const el = document.getElementById('set-notif-challenge') as HTMLInputElement;
    expect(el.checked).toBe(false);
  });

  it('TC3: is a no-op (no throw) when element does not exist', async () => {
    document.body.innerHTML = '';
    const { setChecked } = await import('../../src/pages/settings.helpers.ts');
    expect(() => setChecked('nonexistent-id', true)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// TC4-TC5: getChecked — reads checked state from DOM input
// ---------------------------------------------------------------------------
describe('getChecked', () => {
  it('TC4: returns true when the named checkbox is checked', async () => {
    document.body.innerHTML = `<input type="checkbox" id="set-audio-sfx" checked />`;
    const { getChecked } = await import('../../src/pages/settings.helpers.ts');
    expect(getChecked('set-audio-sfx')).toBe(true);
  });

  it('TC5: returns false when the element does not exist', async () => {
    document.body.innerHTML = '';
    const { getChecked } = await import('../../src/pages/settings.helpers.ts');
    expect(getChecked('missing-id')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TC6: toast — adds .show class and removes it after 2500ms
// ---------------------------------------------------------------------------
describe('toast', () => {
  it('TC6: adds .show to #toast and removes it after 2500 ms', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = `<div id="toast"></div>`;
    const { toast } = await import('../../src/pages/settings.helpers.ts');

    toast('Hello');
    const el = document.getElementById('toast')!;
    expect(el.textContent).toBe('Hello');
    expect(el.classList.contains('show')).toBe(true);

    await vi.advanceTimersByTimeAsync(2500);
    expect(el.classList.contains('show')).toBe(false);
  });

  it('TC6b: toast is a no-op when #toast element is absent', async () => {
    document.body.innerHTML = '';
    const { toast } = await import('../../src/pages/settings.helpers.ts');
    expect(() => toast('No element')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// TC7: validateTier — maps valid tiers through, falls back to 'free'
// ---------------------------------------------------------------------------
describe('validateTier', () => {
  it('TC7a: returns valid tier string unchanged', async () => {
    const { validateTier } = await import('../../src/pages/settings.helpers.ts');
    expect(validateTier('champion')).toBe('champion');
    expect(validateTier('contender')).toBe('contender');
    expect(validateTier('creator')).toBe('creator');
    expect(validateTier('free')).toBe('free');
  });

  it('TC7b: falls back to "free" for unrecognised tier strings', async () => {
    const { validateTier } = await import('../../src/pages/settings.helpers.ts');
    expect(validateTier('superstar')).toBe('free');
    expect(validateTier('')).toBe('free');
  });

  it('TC7c: falls back to "free" when raw is undefined', async () => {
    const { validateTier } = await import('../../src/pages/settings.helpers.ts');
    expect(validateTier(undefined as unknown as string)).toBe('free');
  });
});
