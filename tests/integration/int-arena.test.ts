// ============================================================
// INTEGRATOR — src/arena.ts → arena-state (seam #049)
// Boundary: arena.ts re-exports state variables from arena-state.ts
//           arena-state is a pure state module (no Supabase calls)
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let view: string;
let selectedMode: string | null;
let selectedRanked: boolean;
let selectedRuleset: string;
let selectedRounds: number;
let shieldActive: boolean;
let pendingReferences: unknown[];
let activatedPowerUps: Set<string>;
let equippedForDebate: unknown[];
let challengesRemaining: number;
let feedPaused: boolean;
let vmRecording: boolean;
let vmSeconds: number;
let queueSeconds: number;

let set_view: (v: string) => void;
let set_selectedMode: (v: string | null) => void;
let set_selectedRanked: (v: boolean) => void;
let set_selectedRuleset: (v: 'amplified' | 'unplugged') => void;
let set_selectedRounds: (v: number) => void;
let set_shieldActive: (v: boolean) => void;
let set_pendingReferences: (v: unknown[]) => void;
let set_activatedPowerUps: (v: Set<string>) => void;
let set_queuePollTimer: (v: ReturnType<typeof setInterval> | null) => void;
let set_challengesRemaining: (v: number) => void;
let set_feedPaused: (v: boolean) => void;
let set_vmRecording: (v: boolean) => void;
let set_vmSeconds: (v: number) => void;
let set_queueSeconds: (v: number) => void;
let set_modQueuePollTimer: (v: ReturnType<typeof setInterval> | null) => void;
let resetState: () => void;

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (_cb: (event: string, session: null) => void) => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  );
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = '<div id="screen-main"></div>';

  const mod = await import('../../src/arena/arena-state.ts');
  // Re-read live bindings after import
  view = mod.view;
  selectedMode = mod.selectedMode;
  selectedRanked = mod.selectedRanked;
  selectedRuleset = mod.selectedRuleset;
  selectedRounds = mod.selectedRounds;
  shieldActive = mod.shieldActive;
  pendingReferences = mod.pendingReferences;
  activatedPowerUps = mod.activatedPowerUps;
  equippedForDebate = mod.equippedForDebate;
  challengesRemaining = mod.challengesRemaining;
  feedPaused = mod.feedPaused;
  vmRecording = mod.vmRecording;
  vmSeconds = mod.vmSeconds;
  queueSeconds = mod.queueSeconds;

  set_view = mod.set_view;
  set_selectedMode = mod.set_selectedMode;
  set_selectedRanked = mod.set_selectedRanked;
  set_selectedRuleset = mod.set_selectedRuleset;
  set_selectedRounds = mod.set_selectedRounds;
  set_shieldActive = mod.set_shieldActive;
  set_pendingReferences = mod.set_pendingReferences;
  set_activatedPowerUps = mod.set_activatedPowerUps;
  set_queuePollTimer = mod.set_queuePollTimer;
  set_challengesRemaining = mod.set_challengesRemaining;
  set_feedPaused = mod.set_feedPaused;
  set_vmRecording = mod.set_vmRecording;
  set_vmSeconds = mod.set_vmSeconds;
  set_queueSeconds = mod.set_queueSeconds;
  set_modQueuePollTimer = mod.set_modQueuePollTimer;
  resetState = mod.resetState;
});

// ============================================================
// TC-1: Initial state defaults
// ============================================================
describe('TC-1 — initial state defaults', () => {
  it('view defaults to lobby', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.view).toBe('lobby');
  });

  it('selectedMode defaults to null', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.selectedMode).toBeNull();
  });

  it('selectedRanked defaults to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.selectedRanked).toBe(false);
  });

  it('selectedRuleset defaults to amplified', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.selectedRuleset).toBe('amplified');
  });

  it('selectedRounds defaults to DEBATE.defaultRounds (5)', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.selectedRounds).toBe(5);
  });

  it('shieldActive defaults to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.shieldActive).toBe(false);
  });

  it('pendingReferences defaults to empty array', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(Array.isArray(mod.pendingReferences)).toBe(true);
    expect(mod.pendingReferences).toHaveLength(0);
  });

  it('activatedPowerUps defaults to empty Set', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.activatedPowerUps).toBeInstanceOf(Set);
    expect(mod.activatedPowerUps.size).toBe(0);
  });

  it('challengesRemaining defaults to 3', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.challengesRemaining).toBe(3);
  });

  it('vmRecording defaults to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.vmRecording).toBe(false);
  });

  it('vmSeconds defaults to 0', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.vmSeconds).toBe(0);
  });
});

// ============================================================
// TC-2: Setters mutate state
// ============================================================
describe('TC-2 — setters mutate live state', () => {
  it('set_view updates view', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_view('room');
    expect(mod.view).toBe('room');
  });

  it('set_selectedMode updates selectedMode', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedMode('text');
    expect(mod.selectedMode).toBe('text');
  });

  it('set_selectedRanked toggles to true', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedRanked(true);
    expect(mod.selectedRanked).toBe(true);
  });

  it('set_selectedRuleset updates to unplugged', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedRuleset('unplugged');
    expect(mod.selectedRuleset).toBe('unplugged');
  });

  it('set_selectedRounds updates round count', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedRounds(3);
    expect(mod.selectedRounds).toBe(3);
  });

  it('set_shieldActive sets to true', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_shieldActive(true);
    expect(mod.shieldActive).toBe(true);
  });

  it('set_pendingReferences stores items', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    const refs = [{ id: 'ref-1' }, { id: 'ref-2' }];
    mod.set_pendingReferences(refs);
    expect(mod.pendingReferences).toHaveLength(2);
    expect(mod.pendingReferences).toEqual(refs);
  });

  it('set_activatedPowerUps stores a Set', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    const s = new Set(['speed-boost', 'shield']);
    mod.set_activatedPowerUps(s);
    expect(mod.activatedPowerUps.has('speed-boost')).toBe(true);
    expect(mod.activatedPowerUps.has('shield')).toBe(true);
  });

  it('set_challengesRemaining updates count', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_challengesRemaining(1);
    expect(mod.challengesRemaining).toBe(1);
  });

  it('set_feedPaused toggles to true', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_feedPaused(true);
    expect(mod.feedPaused).toBe(true);
  });

  it('set_vmRecording sets to true', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_vmRecording(true);
    expect(mod.vmRecording).toBe(true);
  });

  it('set_vmSeconds stores elapsed time', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_vmSeconds(42);
    expect(mod.vmSeconds).toBe(42);
  });

  it('set_queueSeconds accumulates queue time', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_queueSeconds(15);
    expect(mod.queueSeconds).toBe(15);
  });
});

// ============================================================
// TC-3: resetState() zeroes values
// ============================================================
describe('TC-3 — resetState() zeroes mutable state', () => {
  it('resets view to lobby', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_view('room');
    mod.resetState();
    expect(mod.view).toBe('lobby');
  });

  it('resets selectedMode to null', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedMode('text');
    mod.resetState();
    expect(mod.selectedMode).toBeNull();
  });

  it('resets selectedRanked to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedRanked(true);
    mod.resetState();
    expect(mod.selectedRanked).toBe(false);
  });

  it('resets selectedRuleset to amplified', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedRuleset('unplugged');
    mod.resetState();
    expect(mod.selectedRuleset).toBe('amplified');
  });

  it('resets selectedRounds to DEBATE.defaultRounds (5)', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedRounds(3);
    mod.resetState();
    expect(mod.selectedRounds).toBe(5);
  });

  it('resets shieldActive to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_shieldActive(true);
    mod.resetState();
    expect(mod.shieldActive).toBe(false);
  });

  it('resets pendingReferences to empty array', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_pendingReferences([{ id: 'ref-1' }]);
    mod.resetState();
    expect(mod.pendingReferences).toHaveLength(0);
  });

  it('resets activatedPowerUps to empty Set', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_activatedPowerUps(new Set(['shield']));
    mod.resetState();
    expect(mod.activatedPowerUps.size).toBe(0);
  });

  it('resets challengesRemaining to 3', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_challengesRemaining(0);
    mod.resetState();
    expect(mod.challengesRemaining).toBe(3);
  });

  it('resets feedPaused to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_feedPaused(true);
    mod.resetState();
    expect(mod.feedPaused).toBe(false);
  });

  it('resets vmRecording to false', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_vmRecording(true);
    mod.resetState();
    expect(mod.vmRecording).toBe(false);
  });

  it('resets vmSeconds to 0', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_vmSeconds(30);
    mod.resetState();
    expect(mod.vmSeconds).toBe(0);
  });

  it('resets queueSeconds to 0', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_queueSeconds(60);
    mod.resetState();
    expect(mod.queueSeconds).toBe(0);
  });
});

// ============================================================
// TC-4: resetState() clears active intervals
// ============================================================
describe('TC-4 — resetState() clears active intervals', () => {
  it('clears queuePollTimer on reset', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const mod = await import('../../src/arena/arena-state.ts');
    const timer = setInterval(() => {}, 1000);
    mod.set_queuePollTimer(timer);
    expect(mod.queuePollTimer).not.toBeNull();
    mod.resetState();
    expect(mod.queuePollTimer).toBeNull();
    vi.useRealTimers();
  });

  it('clears modQueuePollTimer on reset', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const mod = await import('../../src/arena/arena-state.ts');
    const timer = setInterval(() => {}, 500);
    mod.set_modQueuePollTimer(timer);
    expect(mod.modQueuePollTimer).not.toBeNull();
    mod.resetState();
    expect(mod.modQueuePollTimer).toBeNull();
    vi.useRealTimers();
  });

  it('clears vmTimer on reset', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const mod = await import('../../src/arena/arena-state.ts');
    const timer = setInterval(() => {}, 1000);
    mod.set_vmTimer(timer);
    expect(mod.vmTimer).not.toBeNull();
    mod.resetState();
    expect(mod.vmTimer).toBeNull();
    vi.useRealTimers();
  });
});

// ============================================================
// TC-5: currentDebate starts null, set/reset works
// ============================================================
describe('TC-5 — currentDebate lifecycle', () => {
  it('currentDebate defaults to null', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.currentDebate).toBeNull();
  });

  it('set_currentDebate stores debate object', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    const debate = { id: 'debate-abc', topic: 'Test topic' } as unknown as Parameters<typeof mod.set_currentDebate>[0];
    mod.set_currentDebate(debate);
    expect(mod.currentDebate).not.toBeNull();
    expect((mod.currentDebate as unknown as { id: string }).id).toBe('debate-abc');
  });

  it('resetState nulls currentDebate', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    const debate = { id: 'debate-abc' } as unknown as Parameters<typeof mod.set_currentDebate>[0];
    mod.set_currentDebate(debate);
    mod.resetState();
    expect(mod.currentDebate).toBeNull();
  });
});

// ============================================================
// TC-6: selectedCategory default and setter
// ============================================================
describe('TC-6 — selectedCategory state', () => {
  it('selectedCategory defaults to null', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    expect(mod.selectedCategory).toBeNull();
  });

  it('set_selectedCategory stores a category string', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedCategory('politics');
    expect(mod.selectedCategory).toBe('politics');
  });

  it('resetState clears selectedCategory to null', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_selectedCategory('sports');
    mod.resetState();
    expect(mod.selectedCategory).toBeNull();
  });
});

// ============================================================
// TC-7: screenEl and cssInjected are preserved across resetState
// ============================================================
describe('TC-7 — screenEl and cssInjected preserved on reset', () => {
  it('screenEl is NOT cleared by resetState (intentional)', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    const el = document.getElementById('screen-main');
    mod.set_screenEl(el);
    expect(mod.screenEl).not.toBeNull();
    mod.resetState();
    // screenEl intentionally NOT reset per arena-state.ts comment
    expect(mod.screenEl).not.toBeNull();
  });

  it('cssInjected is NOT cleared by resetState (intentional)', async () => {
    const mod = await import('../../src/arena/arena-state.ts');
    mod.set_cssInjected(true);
    expect(mod.cssInjected).toBe(true);
    mod.resetState();
    // cssInjected intentionally NOT reset — CSS only injected once
    expect(mod.cssInjected).toBe(true);
  });
});

// ============================================================
// ARCH — seam #049
// ============================================================
describe('ARCH — seam #049', () => {
  it('src/arena.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});
