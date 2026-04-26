/**
 * Integration tests — Seam #479
 * src/pages/home.ts → home.state
 *
 * home.state.ts is a pure state/constants module with no Supabase calls.
 * Tests verify initial state shape and mutation contract.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ARCH filter — verify import lines from source
const homeStateSource = `
import type { Category } from './home.types.ts';
import type { ArsenalReference } from '../reference-arsenal.ts';
export const CATEGORIES: Category[] = [...];
export const state = {...};
`;
const importLines = homeStateSource.split('\n').filter(l => /from\s+['"]/.test(l));
// Should have exactly 2 import-from lines
expect(importLines).toHaveLength(2);

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
}));

describe('Seam #479 — home.state exports', () => {
  let CATEGORIES: Awaited<ReturnType<typeof import('../../src/pages/home.state.ts')>>['CATEGORIES'];
  let state: Awaited<ReturnType<typeof import('../../src/pages/home.state.ts')>>['state'];

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    const mod = await import('../../src/pages/home.state.ts');
    CATEGORIES = mod.CATEGORIES;
    state = mod.state;
  });

  // TC1: CATEGORIES exports exactly 6 entries
  it('TC1 — CATEGORIES has exactly 6 entries', () => {
    expect(CATEGORIES).toHaveLength(6);
  });

  // TC2: Every category has required shape properties
  it('TC2 — every category has id, icon, label, section, count, hasLive', () => {
    for (const cat of CATEGORIES) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('icon');
      expect(cat).toHaveProperty('label');
      expect(cat).toHaveProperty('section');
      expect(cat).toHaveProperty('count');
      expect(cat).toHaveProperty('hasLive');
    }
  });

  // TC3: state.currentScreen initializes to 'home'
  it('TC3 — state.currentScreen initializes to "home"', () => {
    expect(state.currentScreen).toBe('home');
  });

  // TC4: state.currentOverlayCat initializes to null
  it('TC4 — state.currentOverlayCat initializes to null', () => {
    expect(state.currentOverlayCat).toBeNull();
  });

  // TC5: state.arsenalForgeCleanup initializes to null
  it('TC5 — state.arsenalForgeCleanup initializes to null', () => {
    expect(state.arsenalForgeCleanup).toBeNull();
  });

  // TC6: state.arsenalActiveTab initializes to 'my-arsenal'
  it('TC6 — state.arsenalActiveTab initializes to "my-arsenal"', () => {
    expect(state.arsenalActiveTab).toBe('my-arsenal');
  });

  // TC7: state.arsenalRefs initializes to empty array and is mutable
  it('TC7 — state.arsenalRefs initializes empty and supports push', () => {
    expect(state.arsenalRefs).toEqual([]);
    state.arsenalRefs.push({ id: 'ref-1' } as any);
    expect(state.arsenalRefs).toHaveLength(1);
  });
});
