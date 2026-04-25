// ============================================================
// TOKENS BALANCE — tests/tokens-balance.test.ts
// Source: src/tokens.balance.ts
//
// CLASSIFICATION:
//   _updateBalanceDisplay() — DOM update + broadcast → Behavioral test
//   updateBalance()         — Side-effect orchestration → Integration test
//   _rpc()                  — RPC wrapper with guards → Contract test
//   requireTokens()         — Guard with toast → Unit test
//   getSummary()            — Orchestration via _rpc → Integration test
//   getBalance()            — Pure getter (module state) → Unit test
//
// IMPORTS:
//   { showToast }                              from './config.ts'
//   { safeRpc, getCurrentUser, getCurrentProfile, getIsPlaceholderMode } from './auth.ts'
//   { _notify }                                from './auth.core.ts'
//   import type { ... }                        — type-only
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockShowToast = vi.hoisted(() => vi.fn());
const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn(() => null));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => null));
const mockGetIsPlaceholderMode = vi.hoisted(() => vi.fn(() => false));
const mock_notify = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  escapeHTML: vi.fn((s: string) => s),
}));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentUser: mockGetCurrentUser,
  getCurrentProfile: mockGetCurrentProfile,
  getIsPlaceholderMode: mockGetIsPlaceholderMode,
  getSupabaseClient: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/auth.core.ts', () => ({
  _notify: mock_notify,
}));

import {
  _updateBalanceDisplay,
  updateBalance,
  _rpc,
  requireTokens,
  getSummary,
  getBalance,
} from '../src/tokens.balance.ts';

beforeEach(() => {
  mockShowToast.mockReset();
  mockSafeRpc.mockReset();
  mockGetCurrentUser.mockReturnValue(null);
  mockGetCurrentProfile.mockReturnValue(null);
  mockGetIsPlaceholderMode.mockReturnValue(false);
  mock_notify.mockReset();
  document.body.innerHTML = '';
});

// ── _updateBalanceDisplay ─────────────────────────────────────

describe('TC1 — _updateBalanceDisplay: updates data-token-balance elements', () => {
  it('sets textContent on all [data-token-balance] elements', () => {
    document.body.innerHTML = '<span data-token-balance></span><span data-token-balance></span>';

    _updateBalanceDisplay(250);

    const spans = document.querySelectorAll('[data-token-balance]');
    expect(spans[0].textContent).toBe('250');
    expect(spans[1].textContent).toBe('250');
  });
});

describe('TC2 — _updateBalanceDisplay: updates #token-balance element', () => {
  it('sets textContent on #token-balance when present', () => {
    document.body.innerHTML = '<span id="token-balance"></span>';

    _updateBalanceDisplay(1000);

    expect(document.getElementById('token-balance')!.textContent).toBe('1,000');
  });
});

describe('TC3 — _updateBalanceDisplay: no-op for null value', () => {
  it('does not throw and does not change DOM for null', () => {
    document.body.innerHTML = '<span id="token-balance">old</span>';

    _updateBalanceDisplay(null);

    expect(document.getElementById('token-balance')!.textContent).toBe('old');
  });
});

// ── getBalance ────────────────────────────────────────────────

describe('TC4 — getBalance: returns lastKnownBalance after update', () => {
  it('reflects the balance set by _updateBalanceDisplay', () => {
    _updateBalanceDisplay(777);
    expect(getBalance()).toBe(777);
  });
});

// ── requireTokens ─────────────────────────────────────────────

describe('TC5 — requireTokens: returns true when no profile', () => {
  it('returns true (passes gate) when getCurrentProfile returns null', () => {
    mockGetCurrentProfile.mockReturnValue(null);
    expect(requireTokens(100)).toBe(true);
  });
});

describe('TC6 — requireTokens: returns true when balance is sufficient', () => {
  it('returns true without toast when balance >= amount', () => {
    mockGetCurrentProfile.mockReturnValue({ token_balance: 200 });

    const result = requireTokens(100, 'buy');

    expect(result).toBe(true);
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

describe('TC7 — requireTokens: returns false and shows toast when insufficient', () => {
  it('calls showToast and returns false when balance < amount', () => {
    mockGetCurrentProfile.mockReturnValue({ token_balance: 50 });

    const result = requireTokens(100, 'buy item');

    expect(result).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('buy item'),
      'error'
    );
  });
});

// ── _rpc ──────────────────────────────────────────────────────

describe('TC8 — _rpc: returns null in placeholder mode', () => {
  it('returns null without calling safeRpc in placeholder mode', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(true);
    mockGetCurrentUser.mockReturnValue({ id: 'u-1' });

    const result = await _rpc('some_fn');

    expect(result).toBeNull();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC9 — _rpc: returns null when no user', () => {
  it('returns null without calling safeRpc when not authenticated', async () => {
    mockGetIsPlaceholderMode.mockReturnValue(false);
    mockGetCurrentUser.mockReturnValue(null);

    const result = await _rpc('some_fn');

    expect(result).toBeNull();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC10 — _rpc: calls safeRpc when authenticated', () => {
  it('calls safeRpc with fnName and args when user is present', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockSafeRpc.mockResolvedValue({ data: { success: true, tokens_earned: 10 }, error: null });

    await _rpc('claim_milestone', { p_key: 'test' });

    expect(mockSafeRpc).toHaveBeenCalledWith('claim_milestone', { p_key: 'test' });
  });
});

describe('TC11 — _rpc: returns null on RPC error', () => {
  it('returns null and does not throw when safeRpc returns error', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });

    const result = await _rpc('some_rpc');

    expect(result).toBeNull();
  });
});

// ── getSummary ────────────────────────────────────────────────

describe('TC12 — getSummary: calls get_my_token_summary via _rpc', () => {
  it('calls safeRpc with "get_my_token_summary"', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
    mockSafeRpc.mockResolvedValue({
      data: { success: true, token_balance: 500, streak_days: 5, streak_freezes: 1 },
      error: null,
    });

    await getSummary();

    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_token_summary', {});
  });
});

describe('TC13 — getSummary: returns null when _rpc fails', () => {
  it('returns null when user is not authenticated', async () => {
    mockGetCurrentUser.mockReturnValue(null);

    const result = await getSummary();

    expect(result).toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/tokens.balance.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './config.ts',
      './auth.ts',
      './auth.core.ts',
      './tokens.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/tokens.balance.ts'),
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
