// ============================================================
// SHARE — tests/share.test.ts
// Source: src/share.ts
//
// CLASSIFICATION:
//   shareResult()    — Constructs URL/text, calls navigator.share → Behavioral test
//   shareProfile()   — Constructs URL/text → Behavioral test
//   shareTake()      — Constructs URL/text → Behavioral test
//   inviteFriend()   — Async via getStableInviteUrl → Integration test
//   handleDeepLink() — URLSearchParams + localStorage + navigateTo → Integration test
//
// IMPORTS:
//   { APP, showToast }        from './config.ts'
//   { getCurrentUser, ready } from './auth.ts'
//   { navigateTo }            from './navigation.ts'
//   { get_my_invite_link }    from './contracts/rpc-schemas.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockShowToast = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn(() => null));
const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockNavigateTo = vi.hoisted(() => vi.fn());
const mockAPP = vi.hoisted(() => ({ baseUrl: 'https://test.app' }));

vi.mock('../src/config.ts', () => ({
  get APP() { return mockAPP; },
  showToast: mockShowToast,
}));

vi.mock('../src/auth.ts', () => ({
  getCurrentUser: mockGetCurrentUser,
  ready: Promise.resolve(),
  safeRpc: mockSafeRpc,
  getSupabaseClient: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/navigation.ts', () => ({
  navigateTo: mockNavigateTo,
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_my_invite_link: { safeParse: vi.fn(() => ({ success: true })) },
}));

import {
  shareResult,
  shareProfile,
  shareTake,
  handleDeepLink,
} from '../src/share.ts';

beforeEach(() => {
  mockShowToast.mockReset();
  mockGetCurrentUser.mockReturnValue(null);
  mockSafeRpc.mockReset();
  mockNavigateTo.mockReset();
  localStorage.clear();
  vi.useRealTimers();
  // Reset window.location
  Object.defineProperty(window, 'location', {
    value: { search: '', origin: 'https://test.app' },
    configurable: true,
    writable: true,
  });
});

// ── shareResult ───────────────────────────────────────────────

describe('TC1 — shareResult: calls navigator.share when available', () => {
  it('invokes navigator.share with title and debate URL', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });

    shareResult({ debateId: 'debate-1', topic: 'Is coffee good?', winner: 'Alice', loser: 'Bob' });

    await new Promise(r => setTimeout(r, 0));
    expect(mockShare).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining('The Moderator'),
      url: expect.stringContaining('debate-1'),
    }));
  });
});

describe('TC2 — shareResult: uses clipboard fallback when navigator.share absent', () => {
  it('calls clipboard.writeText when navigator.share is not available', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const mockWrite = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWrite },
      configurable: true,
    });

    shareResult({ debateId: 'debate-x', winner: 'A', loser: 'B' });

    await new Promise(r => setTimeout(r, 0));
    expect(mockWrite).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('clipboard'));
  });
});

// ── shareProfile ──────────────────────────────────────────────

describe('TC3 — shareProfile: calls navigator.share with profile URL', () => {
  it('shares a URL containing the username', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });

    shareProfile({ username: 'debater99', displayName: 'Debater', elo: 1400 });

    await new Promise(r => setTimeout(r, 0));
    expect(mockShare).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.stringContaining('debater99'),
    }));
  });
});

// ── shareTake ─────────────────────────────────────────────────

describe('TC4 — shareTake: calls navigator.share with take URL', () => {
  it('shares a URL containing the take id', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });

    shareTake('take-42', 'Hot takes are overrated');

    await new Promise(r => setTimeout(r, 0));
    expect(mockShare).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.stringContaining('take-42'),
      text: expect.stringContaining('Hot Take'),
    }));
  });
});

// ── handleDeepLink ────────────────────────────────────────────

describe('TC5 — handleDeepLink: saves valid ref code to localStorage', () => {
  it('stores colosseum_referrer when ref is valid 5-char alphanumeric', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?ref=abc12', origin: 'https://test.app' },
      configurable: true,
    });

    handleDeepLink();

    expect(localStorage.getItem('colosseum_referrer')).toBe('abc12');
  });
});

describe('TC6 — handleDeepLink: ignores invalid ref codes', () => {
  it('does not save colosseum_referrer for invalid ref (too long)', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?ref=toolong123', origin: 'https://test.app' },
      configurable: true,
    });

    handleDeepLink();

    expect(localStorage.getItem('colosseum_referrer')).toBeNull();
  });
});

describe('TC7 — handleDeepLink: navigates to arena for debate param', () => {
  it('calls navigateTo("arena") after 500ms when debate param is present', () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'location', {
      value: { search: '?debate=debate-1', origin: 'https://test.app' },
      configurable: true,
    });

    handleDeepLink();

    vi.advanceTimersByTime(500);
    expect(mockNavigateTo).toHaveBeenCalledWith('arena');
  });
});

describe('TC8 — handleDeepLink: shows challenge toast for from param', () => {
  it('calls showToast with challenger name after 1000ms', () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'location', {
      value: { search: '?from=challenger99&topic=Is+AI+good', origin: 'https://test.app' },
      configurable: true,
    });

    handleDeepLink();

    vi.advanceTimersByTime(1000);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('challenger99')
    );
  });
});

describe('TC9 — handleDeepLink: sanitizes challenge name (strips non-alphanum)', () => {
  it('removes special characters from challenger name in toast', () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'location', {
      value: { search: '?from=evil<script>&topic=test', origin: 'https://test.app' },
      configurable: true,
    });

    handleDeepLink();

    vi.advanceTimersByTime(1000);
    const toastMsg = mockShowToast.mock.calls[0][0] as string;
    expect(toastMsg).not.toContain('<script>');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/share.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './config.ts',
      './auth.ts',
      './navigation.ts',
      './contracts/rpc-schemas.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/share.ts'),
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
