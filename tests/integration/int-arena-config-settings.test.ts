// int-arena-config-settings.test.ts
// Seam #241 — src/arena/arena-config-settings.ts → arena-types-results
// RankedCheckResult type drives the check_ranked_eligible RPC eligibility branch.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// Shared mock builders
function mockPlaceholderPath() {
  vi.doMock('../../src/auth.ts', () => ({
    safeRpc: mockRpc,
    getCurrentUser: vi.fn(() => null),
    getCurrentProfile: vi.fn(() => null),
    getSupabaseClient: vi.fn(() => null),
  }));
  vi.doMock('../../src/config.ts', () => ({
    isAnyPlaceholder: true,
    escapeHTML: (s: string) => s,
    friendlyError: vi.fn(),
    showToast: vi.fn(),
    FEATURES: { liveDebates: false },
    DEBATE: { defaultRounds: 3 },
  }));
  vi.doMock('../../src/arena/arena-state.ts', () => ({
    selectedRanked: false,
    selectedRuleset: 'amplified',
    set_selectedRanked: vi.fn(),
    set_selectedRuleset: vi.fn(),
  }));
  vi.doMock('../../src/arena/arena-config-mode-select.ts', () => ({
    showModeSelect: vi.fn(),
  }));
}

beforeEach(async () => {
  vi.resetModules();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
  document.getElementById('arena-rank-overlay')?.remove();
  document.getElementById('arena-ruleset-overlay')?.remove();
});

// ============================================================
// SEAM #241 — arena-config-settings → arena-types-results
// ============================================================

// TC1: showRankedPicker appends overlay to body (placeholder path bypasses auth redirect)
describe('TC1 — showRankedPicker renders overlay when isPlaceholder is true', () => {
  it('appends #arena-rank-overlay to document.body', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockPlaceholderPath();

    const { showRankedPicker } = await import('../../src/arena/arena-config-settings.ts');
    showRankedPicker();

    const overlay = document.getElementById('arena-rank-overlay');
    expect(overlay).not.toBeNull();
  });
});

// TC2: Casual card click — no check_ranked_eligible RPC
describe('TC2 — casual card click skips check_ranked_eligible RPC', () => {
  it('clicking [data-ranked="false"] does not call check_ranked_eligible', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockPlaceholderPath();

    const { showRankedPicker } = await import('../../src/arena/arena-config-settings.ts');
    showRankedPicker();

    const casualCard = document.querySelector('.arena-rank-card[data-ranked="false"]') as HTMLElement | null;
    expect(casualCard).not.toBeNull();
    casualCard?.click();

    await vi.advanceTimersByTimeAsync(100);
    await vi.runAllTicks();

    const eligibleCall = mockRpc.mock.calls.find((c: unknown[]) => c[0] === 'check_ranked_eligible');
    expect(eligibleCall).toBeUndefined();
  });
});

// TC3: Ranked card click — eligible user — calls check_ranked_eligible RPC
describe('TC3 — ranked card click calls check_ranked_eligible and proceeds on eligible=true', () => {
  it('calls safeRpc("check_ranked_eligible") when ranked card is clicked (non-placeholder)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeClient = { rpc: mockRpc, from: mockFrom, auth: mockAuth };
    const mockSafeRpc = vi.fn().mockImplementation(async (fn: string) => {
      if (fn === 'check_ranked_eligible') {
        return { data: { eligible: true, profile_pct: 80 }, error: null };
      }
      return { data: null, error: null };
    });

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: mockSafeRpc,
      getCurrentUser: vi.fn(() => ({ id: 'user-uuid-123' })),
      getCurrentProfile: vi.fn(() => null),
      getSupabaseClient: vi.fn(() => fakeClient),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      escapeHTML: (s: string) => s,
      friendlyError: vi.fn(),
      showToast: vi.fn(),
      FEATURES: { liveDebates: false },
      DEBATE: { defaultRounds: 3 },
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      selectedRanked: false,
      selectedRuleset: 'amplified',
      set_selectedRanked: vi.fn(),
      set_selectedRuleset: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-config-mode-select.ts', () => ({
      showModeSelect: vi.fn(),
    }));

    const { showRankedPicker } = await import('../../src/arena/arena-config-settings.ts');
    showRankedPicker();

    const rankedCard = document.querySelector('.arena-rank-card[data-ranked="true"]') as HTMLElement | null;
    expect(rankedCard).not.toBeNull();
    rankedCard?.click();

    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    const eligibleCall = mockSafeRpc.mock.calls.find((c: unknown[]) => c[0] === 'check_ranked_eligible');
    expect(eligibleCall).toBeDefined();
  });
});

// TC4: Ranked card click — ineligible user — confirm shown with profile_pct in message
describe('TC4 — ineligible ranked attempt shows confirm dialog with profile_pct from RankedCheckResult', () => {
  it('calls window.confirm with message containing profile_pct when eligible=false', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const fakeClient = { rpc: mockRpc, from: mockFrom, auth: mockAuth };
    const mockSafeRpc = vi.fn().mockImplementation(async (fn: string) => {
      if (fn === 'check_ranked_eligible') {
        return { data: { eligible: false, profile_pct: 10 }, error: null };
      }
      return { data: null, error: null };
    });

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: mockSafeRpc,
      getCurrentUser: vi.fn(() => ({ id: 'user-uuid-456' })),
      getCurrentProfile: vi.fn(() => null),
      getSupabaseClient: vi.fn(() => fakeClient),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      escapeHTML: (s: string) => s,
      friendlyError: vi.fn(),
      showToast: vi.fn(),
      FEATURES: { liveDebates: false },
      DEBATE: { defaultRounds: 3 },
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      selectedRanked: false,
      selectedRuleset: 'amplified',
      set_selectedRanked: vi.fn(),
      set_selectedRuleset: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-config-mode-select.ts', () => ({
      showModeSelect: vi.fn(),
    }));

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { showRankedPicker } = await import('../../src/arena/arena-config-settings.ts');
    showRankedPicker();

    const rankedCard = document.querySelector('.arena-rank-card[data-ranked="true"]') as HTMLElement | null;
    expect(rankedCard).not.toBeNull();
    rankedCard?.click();

    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    expect(confirmSpy).toHaveBeenCalled();
    const confirmMsg: string = confirmSpy.mock.calls[0]?.[0] ?? '';
    expect(confirmMsg).toContain('10%');

    confirmSpy.mockRestore();
  });
});

// TC5: Backdrop click removes ranked overlay and calls history.back()
describe('TC5 — backdrop click closes ranked picker overlay', () => {
  it('clicking #arena-rank-backdrop removes #arena-rank-overlay from DOM', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const histBack = vi.spyOn(history, 'back').mockImplementation(() => {});
    mockPlaceholderPath();

    const { showRankedPicker } = await import('../../src/arena/arena-config-settings.ts');
    showRankedPicker();

    expect(document.getElementById('arena-rank-overlay')).not.toBeNull();

    const backdrop = document.getElementById('arena-rank-backdrop') as HTMLElement | null;
    expect(backdrop).not.toBeNull();
    backdrop?.click();

    expect(document.getElementById('arena-rank-overlay')).toBeNull();
    histBack.mockRestore();
  });
});

// TC6: showRulesetPicker appends overlay and sets selectedRuleset on card click
describe('TC6 — showRulesetPicker sets selectedRuleset to "unplugged" on card click', () => {
  it('clicking [data-ruleset="unplugged"] calls set_selectedRuleset with "unplugged"', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSetRuleset = vi.fn();
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: mockRpc,
      getCurrentUser: vi.fn(() => null),
      getCurrentProfile: vi.fn(() => null),
      getSupabaseClient: vi.fn(() => null),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: true,
      escapeHTML: (s: string) => s,
      friendlyError: vi.fn(),
      showToast: vi.fn(),
      FEATURES: { liveDebates: false },
      DEBATE: { defaultRounds: 3 },
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      selectedRanked: false,
      selectedRuleset: 'amplified',
      set_selectedRanked: vi.fn(),
      set_selectedRuleset: mockSetRuleset,
    }));
    vi.doMock('../../src/arena/arena-config-mode-select.ts', () => ({
      showModeSelect: vi.fn(),
    }));

    const { showRulesetPicker } = await import('../../src/arena/arena-config-settings.ts');

    showRulesetPicker();

    const overlay = document.getElementById('arena-ruleset-overlay');
    expect(overlay).not.toBeNull();

    const unpluggedCard = document.querySelector('.arena-rank-card[data-ruleset="unplugged"]') as HTMLElement | null;
    expect(unpluggedCard).not.toBeNull();
    unpluggedCard?.click();

    await vi.advanceTimersByTimeAsync(100);
    await vi.runAllTicks();

    expect(mockSetRuleset).toHaveBeenCalledWith('unplugged');
  });
});

// TC7: Cancel button closes ranked picker and calls history.back()
describe('TC7 — cancel button closes ranked picker overlay', () => {
  it('clicking #arena-rank-cancel removes #arena-rank-overlay and calls history.back()', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const histBack = vi.spyOn(history, 'back').mockImplementation(() => {});
    mockPlaceholderPath();

    const { showRankedPicker } = await import('../../src/arena/arena-config-settings.ts');
    showRankedPicker();

    expect(document.getElementById('arena-rank-overlay')).not.toBeNull();

    const cancelBtn = document.getElementById('arena-rank-cancel') as HTMLButtonElement | null;
    expect(cancelBtn).not.toBeNull();
    cancelBtn?.click();

    expect(document.getElementById('arena-rank-overlay')).toBeNull();
    expect(histBack).toHaveBeenCalledTimes(1);
    histBack.mockRestore();
  });
});

// ARCH: seam import check — arena-config-settings imports arena-types-results
describe('ARCH — seam #241', () => {
  it('src/arena/arena-config-settings.ts imports from arena-types-results', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-config-settings.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-types-results'))).toBe(true);
  });
});
