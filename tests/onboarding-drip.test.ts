// ============================================================
// ONBOARDING DRIP — tests/onboarding-drip.test.ts
// Source: src/onboarding-drip.ts
//
// CLASSIFICATION:
//   initDripCard()   — RPC + DOM render → Integration test
//   triggerDripDay() — RPC + toast + re-render → Integration test
//
// IMPORTS:
//   { safeRpc, getIsPlaceholderMode } from './auth.ts'
//   { showToast }                     from './config.ts'
//   { get_onboarding_progress, complete_onboarding_day } from './contracts/rpc-schemas.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockGetOnboardingSchema = vi.hoisted(() => ({ safeParse: vi.fn(() => ({ success: true })) }));
const mockCompleteDaySchema = vi.hoisted(() => ({ safeParse: vi.fn(() => ({ success: true })) }));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  escapeHTML: vi.fn((s: unknown) => String(s ?? '')),
  FEATURES: {},
  APP: { baseUrl: 'https://themoderator.app' },
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_onboarding_progress: mockGetOnboardingSchema,
  complete_onboarding_day: mockCompleteDaySchema,
  place_prediction: { safeParse: vi.fn(() => ({ success: true })) },
}));

import { initDripCard, triggerDripDay } from '../src/onboarding-drip.ts';

const makeProgress = (overrides: Partial<any> = {}): any => ({
  success: true,
  days_since: 3,
  completed: [],
  all_done: false,
  ...overrides,
});

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mockShowToast.mockReset();
  document.body.innerHTML = '';
  // Clear module-level session cache by re-triggering fresh test isolation
  // (module state _claimedThisSession and _progress persist within the test process)
});

// ── initDripCard ──────────────────────────────────────────────

describe('TC1 — initDripCard: placeholder mode returns without RPC', () => {
  it('does not call safeRpc in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    const container = document.createElement('div');

    await initDripCard(container);

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC2 — initDripCard: calls get_onboarding_progress RPC', () => {
  it('invokes safeRpc with "get_onboarding_progress"', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'no data' } });
    const container = document.createElement('div');

    await initDripCard(container);

    expect(mockSafeRpc).toHaveBeenCalledWith('get_onboarding_progress', {}, mockGetOnboardingSchema);
  });
});

describe('TC3 — initDripCard: RPC error skips render', () => {
  it('does not append .drip-card when RPC returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'forbidden' } });
    const container = document.createElement('div');

    await initDripCard(container);

    expect(container.querySelector('.drip-card')).toBeNull();
  });
});

describe('TC4 — initDripCard: skips render when all_done is true', () => {
  it('does not render card when all_done=true', async () => {
    mockSafeRpc.mockResolvedValue({ data: makeProgress({ all_done: true }), error: null });
    const container = document.createElement('div');

    await initDripCard(container);

    expect(container.querySelector('#drip-card')).toBeNull();
  });
});

describe('TC5 — initDripCard: skips render when days_since > 14', () => {
  it('does not render card when user signed up more than 14 days ago', async () => {
    mockSafeRpc.mockResolvedValue({ data: makeProgress({ days_since: 15 }), error: null });
    const container = document.createElement('div');

    await initDripCard(container);

    expect(container.querySelector('#drip-card')).toBeNull();
  });
});

describe('TC6 — initDripCard: renders card for active user', () => {
  it('appends #drip-card to container for user within 14 days with tasks remaining', async () => {
    mockSafeRpc.mockResolvedValue({ data: makeProgress({ days_since: 3, all_done: false }), error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);

    await initDripCard(container);

    expect(container.querySelector('#drip-card')).not.toBeNull();
  });
});

describe('TC7 — initDripCard: card contains "YOUR FIRST WEEK" heading', () => {
  it('rendered card has the expected title text', async () => {
    mockSafeRpc.mockResolvedValue({ data: makeProgress(), error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);

    await initDripCard(container);

    expect(container.innerHTML).toContain('YOUR FIRST WEEK');
  });
});

describe('TC8 — initDripCard: dismiss button fades card', () => {
  it('#drip-dismiss click sets opacity to 0', async () => {
    mockSafeRpc.mockResolvedValue({ data: makeProgress(), error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);

    await initDripCard(container);

    const btn = container.querySelector('#drip-dismiss') as HTMLButtonElement;
    btn.click();

    const card = container.querySelector('#drip-card') as HTMLElement;
    expect(card.style.opacity).toBe('0');
  });
});

// ── triggerDripDay ────────────────────────────────────────────

describe('TC9 — triggerDripDay: placeholder mode skips RPC', () => {
  it('does not call safeRpc in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);

    await triggerDripDay(1);

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC10 — triggerDripDay: calls complete_onboarding_day RPC', () => {
  it('invokes safeRpc with day parameter', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, already_done: false }, error: null });

    await triggerDripDay(2);

    expect(mockSafeRpc).toHaveBeenCalledWith('complete_onboarding_day', { p_day: 2 }, mockCompleteDaySchema);
  });
});

describe('TC11 — triggerDripDay: shows toast on successful completion', () => {
  it('calls showToast with success type', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, already_done: false, cosmetic_name: 'Voter Badge' }, error: null });

    // Use day 5 — unique across all tests in this file
    await triggerDripDay(5);

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Day 5'), 'success');
  });
});

describe('TC12 — triggerDripDay: no toast when already_done is true', () => {
  it('does not show toast when RPC returns already_done=true', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, already_done: true }, error: null });

    // Use day 6 — unique
    await triggerDripDay(6);

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

describe('TC13 — triggerDripDay: no toast on RPC error', () => {
  it('does not show toast when safeRpc returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    // Use day 7 — unique
    await triggerDripDay(7);

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/onboarding-drip.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./auth.ts', './config.ts', './contracts/rpc-schemas.ts'];
    const source = readFileSync(resolve(__dirname, '../src/onboarding-drip.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
