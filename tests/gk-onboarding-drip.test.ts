// ============================================================
// GATEKEEPER -- F-36 ONBOARDING DRIP
// Tests initDripCard() and triggerDripDay() from src/onboarding-drip.ts.
// Spec: docs/THE-MODERATOR-PUNCH-LIST.md row F-36.
// Claim: 7 cosmetic rewards, drip card UI, Day 1-7 progression,
// escalating titles Rookie->Regular->Gladiator, 14-day window.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc             = vi.hoisted(() => vi.fn());
const mockGetIsPlaceholder    = vi.hoisted(() => vi.fn(() => false));
const mockShowToast           = vi.hoisted(() => vi.fn());
const mockGetOnboardingSchema = vi.hoisted(() => ({ safeParse: vi.fn(() => ({ success: true })) }));
const mockCompleteDaySchema   = vi.hoisted(() => ({ safeParse: vi.fn(() => ({ success: true })) }));

vi.mock('../src/auth.ts', () => ({
  safeRpc:              mockSafeRpc,
  getIsPlaceholderMode: mockGetIsPlaceholder,
  getSupabaseClient:    vi.fn(),
  getCurrentUser:       vi.fn(),
  onAuthStateChange:    vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  showToast:  mockShowToast,
  escapeHTML: vi.fn((s: unknown) => String(s ?? '')),
  FEATURES:   {},
  APP:        { baseUrl: 'https://themoderator.app' },
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_onboarding_progress: mockGetOnboardingSchema,
  complete_onboarding_day: mockCompleteDaySchema,
  place_prediction:        { safeParse: vi.fn(() => ({ success: true })) },
}));

import { initDripCard, triggerDripDay } from '../src/onboarding-drip.ts';

const makeProgress = (overrides: Partial<any> = {}): any => ({
  success:    true,
  days_since: 3,
  completed:  [],
  all_done:   false,
  ...overrides,
});

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockGetIsPlaceholder.mockReturnValue(false);
  mockShowToast.mockReset();
  document.body.innerHTML = '';
});

// -- TC-GK-1 -- initDripCard is exported ----------------------

describe('TC-GK-1 -- initDripCard is exported and callable', () => {
  it('is a function', () => {
    expect(typeof initDripCard).toBe('function');
  });
});

// -- TC-GK-2 -- triggerDripDay is exported --------------------

describe('TC-GK-2 -- triggerDripDay is exported and callable', () => {
  it('is a function', () => {
    expect(typeof triggerDripDay).toBe('function');
  });
});

// -- TC-GK-3 -- initDripCard calls get_onboarding_progress RPC

describe('TC-GK-3 -- initDripCard calls get_onboarding_progress RPC', () => {
  it('invokes safeRpc with "get_onboarding_progress"', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'no data' } });
    const container = document.createElement('div');

    await initDripCard(container);

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'get_onboarding_progress',
      {},
      mockGetOnboardingSchema,
    );
  });
});

// -- TC-GK-4 -- placeholder mode skips RPC in initDripCard ----

describe('TC-GK-4 -- initDripCard skips RPC in placeholder mode', () => {
  it('does not call safeRpc when getIsPlaceholderMode returns true', async () => {
    mockGetIsPlaceholder.mockReturnValue(true);
    const container = document.createElement('div');

    await initDripCard(container);

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// -- TC-GK-5 -- card shown within 14-day window ---------------

describe('TC-GK-5 -- card shown within 14-day signup window', () => {
  it('renders #drip-card when days_since <= 14 and all_done is false', async () => {
    mockSafeRpc.mockResolvedValue({ data: makeProgress({ days_since: 14, all_done: false }), error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);

    await initDripCard(container);

    expect(container.querySelector('#drip-card')).not.toBeNull();
  });
});

// -- TC-GK-6 -- card NOT shown beyond 14 days -----------------

describe('TC-GK-6 -- card NOT shown when days_since > 14', () => {
  it('does not render card when user signed up more than 14 days ago', async () => {
    mockSafeRpc.mockResolvedValue({ data: makeProgress({ days_since: 15 }), error: null });
    const container = document.createElement('div');

    await initDripCard(container);

    expect(container.querySelector('#drip-card')).toBeNull();
  });
});

// -- TC-GK-7 -- card NOT shown when all 7 days are done -------

describe('TC-GK-7 -- card NOT shown when all_done is true', () => {
  it('does not render card when all 7 drip days are completed', async () => {
    mockSafeRpc.mockResolvedValue({ data: makeProgress({ all_done: true }), error: null });
    const container = document.createElement('div');

    await initDripCard(container);

    expect(container.querySelector('#drip-card')).toBeNull();
  });
});

// -- TC-GK-8 -- card has exactly 7 progression rows -----------

describe('TC-GK-8 -- rendered card has exactly 7 progression rows (Day 1-7)', () => {
  it('drip-row count equals 7 to match 7-cosmetic-reward spec', async () => {
    mockSafeRpc.mockResolvedValue({ data: makeProgress(), error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);

    await initDripCard(container);

    const rows = container.querySelectorAll('.drip-row');
    expect(rows.length).toBe(7);
  });
});

// -- TC-GK-9 -- card contains 'Rookie' reward -----------------

describe('TC-GK-9 -- rendered card contains "Rookie" escalating title', () => {
  it('card HTML includes the word "Rookie"', async () => {
    mockSafeRpc.mockResolvedValue({ data: makeProgress(), error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);

    await initDripCard(container);

    expect(container.innerHTML).toContain('Rookie');
  });
});

// -- TC-GK-10 -- card contains 'Regular' reward ---------------

describe('TC-GK-10 -- rendered card contains "Regular" escalating title', () => {
  it('card HTML includes the word "Regular"', async () => {
    mockSafeRpc.mockResolvedValue({ data: makeProgress(), error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);

    await initDripCard(container);

    expect(container.innerHTML).toContain('Regular');
  });
});

// -- TC-GK-11 -- card contains 'Gladiator' ultimate title -----

describe('TC-GK-11 -- rendered card contains "Gladiator" ultimate reward', () => {
  it('card HTML includes the word "Gladiator"', async () => {
    mockSafeRpc.mockResolvedValue({ data: makeProgress(), error: null });
    const container = document.createElement('div');
    document.body.appendChild(container);

    await initDripCard(container);

    expect(container.innerHTML).toContain('Gladiator');
  });
});

// -- TC-GK-12 -- triggerDripDay calls complete_onboarding_day -

describe('TC-GK-12 -- triggerDripDay calls complete_onboarding_day with p_day', () => {
  it('invokes safeRpc("complete_onboarding_day", { p_day: n })', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, already_done: false }, error: null });

    await triggerDripDay(3);

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'complete_onboarding_day',
      { p_day: 3 },
      mockCompleteDaySchema,
    );
  });
});

// -- TC-GK-13 -- triggerDripDay skips RPC in placeholder mode -

describe('TC-GK-13 -- triggerDripDay skips RPC in placeholder mode', () => {
  it('does not call safeRpc when getIsPlaceholderMode returns true', async () => {
    mockGetIsPlaceholder.mockReturnValue(true);

    await triggerDripDay(1);

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// -- TC-GK-14 -- showToast called on successful day completion -

describe('TC-GK-14 -- showToast called with "success" on day completion', () => {
  it('calls showToast with type "success" when RPC succeeds', async () => {
    mockSafeRpc.mockResolvedValue({
      data: { success: true, already_done: false, cosmetic_name: 'Spectator Badge' },
      error: null,
    });

    await triggerDripDay(4);

    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'success');
  });
});

// -- TC-GK-15 -- no toast when already_done = true ------------

describe('TC-GK-15 -- no toast when RPC returns already_done = true', () => {
  it('does not call showToast when already_done is true', async () => {
    mockSafeRpc.mockResolvedValue({ data: { success: true, already_done: true }, error: null });

    await triggerDripDay(5);

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

// -- TC-GK-16 -- no toast on RPC error ------------------------

describe('TC-GK-16 -- no toast on RPC error', () => {
  it('does not call showToast when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    await triggerDripDay(6);

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

// -- ARCH -----------------------------------------------------

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH -- src/onboarding-drip.ts only imports from allowed modules', () => {
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
