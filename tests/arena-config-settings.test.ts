/**
 * Tests for src/arena/arena-config-settings.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockSelectedRanked = vi.hoisted(() => ({ value: false }));
const mockSet_selectedRanked = vi.hoisted(() => vi.fn());
const mockSet_selectedRuleset = vi.hoisted(() => vi.fn());
const mockIsPlaceholder = vi.hoisted(() => vi.fn());
const mockPushArenaState = vi.hoisted(() => vi.fn());
const mockShowModeSelect = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get selectedRanked() { return mockSelectedRanked.value; },
  set_selectedRanked: mockSet_selectedRanked,
  set_selectedRuleset: mockSet_selectedRuleset,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  isPlaceholder: mockIsPlaceholder,
  pushArenaState: mockPushArenaState,
}));

vi.mock('../src/arena/arena-config-mode-select.ts', () => ({
  showModeSelect: mockShowModeSelect,
}));

import {
  showRankedPicker,
  closeRankedPicker,
  showRulesetPicker,
  closeRulesetPicker,
} from '../src/arena/arena-config-settings.ts';

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  mockIsPlaceholder.mockReturnValue(false);
  mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
});

describe('showRankedPicker — appends overlay to body', () => {
  it('TC1: appends #arena-rank-overlay when user exists', () => {
    showRankedPicker();
    expect(document.getElementById('arena-rank-overlay')).not.toBeNull();
  });

  it('TC2: calls pushArenaState with rankedPicker', () => {
    showRankedPicker();
    expect(mockPushArenaState).toHaveBeenCalledWith('rankedPicker');
  });
});

describe('showRankedPicker — redirects without user', () => {
  it('TC3: does not append overlay when user is null and not placeholder', () => {
    mockGetCurrentUser.mockReturnValue(null);
    showRankedPicker();
    expect(document.getElementById('arena-rank-overlay')).toBeNull();
  });
});

describe('closeRankedPicker — removes overlay', () => {
  it('TC4: removes overlay from DOM', () => {
    showRankedPicker();
    closeRankedPicker();
    expect(document.getElementById('arena-rank-overlay')).toBeNull();
  });

  it('TC5: safe to call when overlay not present', () => {
    expect(() => closeRankedPicker()).not.toThrow();
  });
});

describe('showRankedPicker — backdrop click closes overlay', () => {
  it('TC6: clicking backdrop removes overlay', () => {
    showRankedPicker();
    document.getElementById('arena-rank-backdrop')!.click();
    expect(document.getElementById('arena-rank-overlay')).toBeNull();
  });
});

describe('showRankedPicker — casual card sets ranked false and proceeds', () => {
  it('TC7: clicking casual card calls set_selectedRanked(false)', () => {
    showRankedPicker();
    const casualCard = document.querySelector('[data-ranked="false"]') as HTMLElement;
    casualCard.click();
    // Need to wait for async handler
    return new Promise(r => setTimeout(r, 0)).then(() => {
      expect(mockSet_selectedRanked).toHaveBeenCalledWith(false);
    });
  });
});

describe('showRulesetPicker — appends ruleset overlay', () => {
  it('TC8: appends #arena-ruleset-overlay', () => {
    showRulesetPicker();
    expect(document.getElementById('arena-ruleset-overlay')).not.toBeNull();
  });

  it('TC9: calls pushArenaState with rulesetPicker', () => {
    showRulesetPicker();
    expect(mockPushArenaState).toHaveBeenCalledWith('rulesetPicker');
  });
});

describe('closeRulesetPicker — removes overlay', () => {
  it('TC10: removes ruleset overlay from DOM', () => {
    showRulesetPicker();
    closeRulesetPicker();
    expect(document.getElementById('arena-ruleset-overlay')).toBeNull();
  });
});

describe('showRulesetPicker — amplified card calls set_selectedRuleset', () => {
  it('TC11: clicking amplified card calls set_selectedRuleset("amplified") and showModeSelect', () => {
    showRulesetPicker();
    const ampCard = document.querySelector('[data-ruleset="amplified"]') as HTMLElement;
    ampCard.click();
    expect(mockSet_selectedRuleset).toHaveBeenCalledWith('amplified');
    expect(mockShowModeSelect).toHaveBeenCalled();
  });
});

describe('showRulesetPicker — unplugged card calls set_selectedRuleset', () => {
  it('TC12: clicking unplugged card calls set_selectedRuleset("unplugged")', () => {
    showRulesetPicker();
    const unpCard = document.querySelector('[data-ruleset="unplugged"]') as HTMLElement;
    unpCard.click();
    expect(mockSet_selectedRuleset).toHaveBeenCalledWith('unplugged');
  });
});

describe('ARCH — src/arena/arena-config-settings.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      './arena-state.ts',
      './arena-types-results.ts',
      './arena-core.utils.ts',
      './arena-config-mode-select.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-config-settings.ts'),
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
