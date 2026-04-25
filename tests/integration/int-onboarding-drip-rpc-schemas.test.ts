import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, auth: mockAuth })),
}));

vi.mock('../../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockSafeRpc.mockResolvedValue({ data: null, error: null });
  document.body.innerHTML = '<div id="feed-container"></div>';
  document.head.innerHTML = '';
});

// ── TC1: initDripCard renders card when within 14 days and not all_done ──────
describe('TC1 — initDripCard renders card for active user', () => {
  it('inserts #drip-card into container when days_since <= 14 and all_done is false', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: { success: true, days_since: 3, completed: [1], all_done: false },
      error: null,
    });

    const { initDripCard } = await import('../../src/onboarding-drip.ts');
    const container = document.getElementById('feed-container') as HTMLElement;
    await initDripCard(container);

    expect(document.getElementById('drip-card')).not.toBeNull();
  });
});

// ── TC2: initDripCard does NOT render when days_since > 14 ───────────────────
describe('TC2 — initDripCard skips card after 14 days', () => {
  it('does not insert #drip-card when days_since > 14', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: { success: true, days_since: 15, completed: [1, 2], all_done: false },
      error: null,
    });

    const { initDripCard } = await import('../../src/onboarding-drip.ts');
    const container = document.getElementById('feed-container') as HTMLElement;
    await initDripCard(container);

    expect(document.getElementById('drip-card')).toBeNull();
  });
});

// ── TC3: initDripCard does NOT render when all_done is true ──────────────────
describe('TC3 — initDripCard skips card when all_done', () => {
  it('does not insert #drip-card when all_done is true', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: { success: true, days_since: 7, completed: [1, 2, 3, 4, 5, 6, 7], all_done: true },
      error: null,
    });

    const { initDripCard } = await import('../../src/onboarding-drip.ts');
    const container = document.getElementById('feed-container') as HTMLElement;
    await initDripCard(container);

    expect(document.getElementById('drip-card')).toBeNull();
  });
});

// ── TC4: initDripCard returns early when placeholder mode ─────────────────────
describe('TC4 — initDripCard skips all when getIsPlaceholderMode() is true', () => {
  it('makes no safeRpc call when placeholder mode is active', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    const { initDripCard } = await import('../../src/onboarding-drip.ts');
    const container = document.getElementById('feed-container') as HTMLElement;
    await initDripCard(container);

    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(document.getElementById('drip-card')).toBeNull();
  });
});

// ── TC5: triggerDripDay calls complete_onboarding_day RPC ────────────────────
describe('TC5 — triggerDripDay calls complete_onboarding_day with p_day param', () => {
  it('calls safeRpc with complete_onboarding_day and the correct day number', async () => {
    // Seed progress via initDripCard
    mockSafeRpc.mockResolvedValueOnce({
      data: { success: true, days_since: 1, completed: [], all_done: false },
      error: null,
    });
    // Response for complete_onboarding_day
    mockSafeRpc.mockResolvedValueOnce({
      data: { success: true, cosmetic_name: 'Newcomer badge', already_done: false },
      error: null,
    });

    const { initDripCard, triggerDripDay } = await import('../../src/onboarding-drip.ts');
    const container = document.getElementById('feed-container') as HTMLElement;
    await initDripCard(container);
    await triggerDripDay(1);

    const completeCalls = mockSafeRpc.mock.calls.filter(
      (call: unknown[]) => call[0] === 'complete_onboarding_day'
    );
    expect(completeCalls.length).toBe(1);
    expect(completeCalls[0][1]).toMatchObject({ p_day: 1 });
  });
});

// ── TC6: triggerDripDay is idempotent within the same session ─────────────────
describe('TC6 — triggerDripDay is idempotent (no double-claim per session)', () => {
  it('only calls complete_onboarding_day once for the same day even when called twice', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: { success: true, days_since: 1, completed: [], all_done: false },
      error: null,
    });
    mockSafeRpc.mockResolvedValue({
      data: { success: true, cosmetic_name: 'Newcomer badge', already_done: false },
      error: null,
    });

    const { initDripCard, triggerDripDay } = await import('../../src/onboarding-drip.ts');
    const container = document.getElementById('feed-container') as HTMLElement;
    await initDripCard(container);
    await triggerDripDay(2);
    await triggerDripDay(2); // second call — same session, same day

    const completeCalls = mockSafeRpc.mock.calls.filter(
      (call: unknown[]) => call[0] === 'complete_onboarding_day'
    );
    expect(completeCalls.length).toBe(1);
  });
});

// ── TC7: triggerDripDay skips already-completed days ─────────────────────────
describe('TC7 — triggerDripDay skips already-completed days from server', () => {
  it('does not call complete_onboarding_day for a day already in completed[]', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: { success: true, days_since: 2, completed: [1], all_done: false },
      error: null,
    });

    const { initDripCard, triggerDripDay } = await import('../../src/onboarding-drip.ts');
    const container = document.getElementById('feed-container') as HTMLElement;
    await initDripCard(container);
    await triggerDripDay(1); // day 1 is already completed

    const completeCalls = mockSafeRpc.mock.calls.filter(
      (call: unknown[]) => call[0] === 'complete_onboarding_day'
    );
    expect(completeCalls.length).toBe(0);
  });
});

// ── ARCH: seam #082 import boundary unchanged ────────────────────────────────
describe('ARCH — seam #082 import boundary: onboarding-drip.ts → rpc-schemas', () => {
  it('src/onboarding-drip.ts still imports from ./contracts/rpc-schemas', () => {
    const source = readFileSync(resolve(__dirname, '../../src/onboarding-drip.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('rpc-schemas'))).toBe(true);
  });

  it('imports get_onboarding_progress from rpc-schemas', () => {
    const source = readFileSync(resolve(__dirname, '../../src/onboarding-drip.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('get_onboarding_progress'))).toBe(true);
  });

  it('imports complete_onboarding_day from rpc-schemas', () => {
    const source = readFileSync(resolve(__dirname, '../../src/onboarding-drip.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('complete_onboarding_day'))).toBe(true);
  });
});
