// ============================================================
// GK — F-19 SHARE & REFERRAL TESTS
// Source: src/share.ts
// Spec: docs/product/THE-MODERATOR-FEATURE-SPECS-PENDING.md §F-59
//       + docs/THE-MODERATOR-PUNCH-LIST.md row F-59
//
// CLASSIFICATION:
//   inviteFriend()   — multi-step orchestration: getStableInviteUrl (safeRpc) → share
//   handleDeepLink() — multi-step orchestration: URLSearchParams + localStorage + safeRpc
//   shareResult()    — behavioral: constructs URL/text → navigator.share / clipboard
//   shareTake()      — behavioral: decodes text → navigator.share / clipboard
//
// NOTE: inviteFriend tests use vi.resetModules() + dynamic import to obtain a
//       fresh module instance each time, ensuring _cachedInviteUrl starts null.
//       Static imports (shareResult, shareTake, handleDeepLink) are unaffected.
//
// REGRESSION SURFACE: tests/share.test.ts (TC1–TC9) must still pass.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── All mocks hoisted to avoid TDZ in vi.mock factories ──────────────────────

const mockShowToast      = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn(() => null as unknown));
const mockSafeRpc        = vi.hoisted(() => vi.fn());
const mockNavigateTo     = vi.hoisted(() => vi.fn());
const mockShare          = vi.hoisted(() => vi.fn());
const mockClipboardWrite = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  get APP() { return { baseUrl: 'https://test.app' }; },
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
  shareTake,
  handleDeepLink,
} from '../src/share.ts';

// ── Global setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  mockShowToast.mockReset();
  mockGetCurrentUser.mockReturnValue(null);
  mockSafeRpc.mockReset();
  mockNavigateTo.mockReset();
  mockShare.mockReset();
  mockClipboardWrite.mockReset();
  localStorage.clear();
  vi.useRealTimers();
  Object.defineProperty(window, 'location', {
    value: { search: '', origin: 'https://test.app' },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(navigator, 'share', {
    value: mockShare,
    configurable: true,
  });
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockClipboardWrite },
    configurable: true,
  });
});

// ── TC-GK1: inviteFriend calls get_my_invite_link RPC ────────────────────────
// Spec (F-59): "get_my_invite_link" RPC returns the stable per-user invite URL.

describe('TC-GK1 — inviteFriend: calls safeRpc("get_my_invite_link") for stable URL', () => {
  it('calls get_my_invite_link to obtain the invite URL', async () => {
    vi.resetModules();
    mockSafeRpc.mockResolvedValue({ data: { url: 'https://themoderator.app/i/abc12' }, error: null });
    mockShare.mockResolvedValue(undefined);
    const { inviteFriend } = await import('../src/share.ts');
    inviteFriend();
    await new Promise(r => setTimeout(r, 50));
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'get_my_invite_link',
      {},
      expect.anything(),
    );
  });
});

// ── TC-GK2: inviteFriend caches URL per session ───────────────────────────────
// Spec (F-59): "fetched from server once per session, cached in memory."
// Repeated calls must NOT fire a second RPC request.

describe('TC-GK2 — inviteFriend: invite URL cached — RPC called only once per session', () => {
  it('does not call safeRpc a second time when URL is already cached', async () => {
    vi.resetModules();
    mockSafeRpc.mockResolvedValue({ data: { url: 'https://themoderator.app/i/abc12' }, error: null });
    mockShare.mockResolvedValue(undefined);
    const { inviteFriend } = await import('../src/share.ts');

    // First call — populates the in-memory cache
    inviteFriend();
    await new Promise(r => setTimeout(r, 50));
    const countAfterFirst = mockSafeRpc.mock.calls.length;
    expect(countAfterFirst).toBe(1);

    // Second call — must be served from cache (no new RPC)
    mockSafeRpc.mockReset();
    inviteFriend();
    await new Promise(r => setTimeout(r, 50));
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC-GK3: inviteFriend falls back to plinko.html when RPC fails ────────────
// Spec (F-59): On failure (unauthenticated / Plinko incomplete), the browser is
// redirected to "moderator-plinko.html" — the Plinko signup flow.

describe('TC-GK3 — inviteFriend: falls back to plinko.html URL when get_my_invite_link fails', () => {
  it('shares a URL containing "moderator-plinko.html" when RPC throws', async () => {
    vi.resetModules();
    mockSafeRpc.mockRejectedValue(new Error('network error'));
    mockShare.mockResolvedValue(undefined);
    const { inviteFriend } = await import('../src/share.ts');
    inviteFriend();
    await new Promise(r => setTimeout(r, 50));
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('moderator-plinko.html'),
      }),
    );
  });
});

// ── TC-GK4: inviteFriend includes RPC URL in share payload ───────────────────
// Spec (F-59): The invite link given to friends is the stable URL returned by
// get_my_invite_link — not a client-generated random code.

describe('TC-GK4 — inviteFriend: share payload URL matches the URL from get_my_invite_link', () => {
  it('passes the stable invite URL to navigator.share', async () => {
    vi.resetModules();
    const stableUrl = 'https://themoderator.app/i/x7k2m';
    mockSafeRpc.mockResolvedValue({ data: { url: stableUrl }, error: null });
    mockShare.mockResolvedValue(undefined);
    const { inviteFriend } = await import('../src/share.ts');
    inviteFriend();
    await new Promise(r => setTimeout(r, 50));
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({ url: stableUrl }),
    );
  });
});

// ── TC-GK5: handleDeepLink calls attribute_signup when already authenticated ─
// Spec (F-59): "If user is already authenticated (e.g. OAuth flow), attribute
// immediately" by calling attribute_signup RPC.

describe('TC-GK5 — handleDeepLink: calls attribute_signup immediately when user is authenticated', () => {
  it('calls safeRpc("attribute_signup") when getCurrentUser returns a user', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-123' });
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    Object.defineProperty(window, 'location', {
      value: { search: '?ref=abc12', origin: 'https://test.app' },
      configurable: true,
      writable: true,
    });

    handleDeepLink();
    await new Promise(r => setTimeout(r, 50));

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'attribute_signup',
      expect.objectContaining({ p_ref_code: 'abc12' }),
    );
  });
});

// ── TC-GK6: attribute_signup receives correct p_ref_code ────────────────────
// Spec (F-59): attribute_signup(p_ref_code text) — the ref code from the URL
// is passed verbatim.

describe('TC-GK6 — handleDeepLink: attribute_signup p_ref_code matches the URL ref param', () => {
  it('sends the exact ref code from the URL as p_ref_code', async () => {
    mockGetCurrentUser.mockReturnValue({ id: 'user-456' });
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    Object.defineProperty(window, 'location', {
      value: { search: '?ref=z9q4r', origin: 'https://test.app' },
      configurable: true,
      writable: true,
    });

    handleDeepLink();
    await new Promise(r => setTimeout(r, 50));

    const call = mockSafeRpc.mock.calls.find((c: unknown[]) => c[0] === 'attribute_signup');
    expect(call).toBeDefined();
    expect((call as unknown[])[1]).toMatchObject({ p_ref_code: 'z9q4r' });
  });
});

// ── TC-GK7: attribute_signup includes p_device_id when mod_visitor_id present ─
// Spec (F-59): Anti-fraud device fingerprint uses the analytics.ts visitor UUID
// stored in localStorage as "mod_visitor_id"; passed as p_device_id.

describe('TC-GK7 — handleDeepLink: attribute_signup includes p_device_id from mod_visitor_id', () => {
  it('passes p_device_id when mod_visitor_id is present in localStorage', async () => {
    localStorage.setItem('mod_visitor_id', 'device-uuid-abc');
    mockGetCurrentUser.mockReturnValue({ id: 'user-789' });
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    Object.defineProperty(window, 'location', {
      value: { search: '?ref=m3n4p', origin: 'https://test.app' },
      configurable: true,
      writable: true,
    });

    handleDeepLink();
    await new Promise(r => setTimeout(r, 50));

    const call = mockSafeRpc.mock.calls.find((c: unknown[]) => c[0] === 'attribute_signup');
    expect(call).toBeDefined();
    expect((call as unknown[])[1]).toMatchObject({ p_device_id: 'device-uuid-abc' });
  });
});

// ── TC-GK8: attribute_signup omits p_device_id when mod_visitor_id absent ────
// Spec (F-59): p_device_id is only included when a visitor UUID is available.

describe('TC-GK8 — handleDeepLink: attribute_signup omits p_device_id when mod_visitor_id absent', () => {
  it('does not send p_device_id when mod_visitor_id is not in localStorage', async () => {
    // localStorage cleared in beforeEach — mod_visitor_id is not set
    mockGetCurrentUser.mockReturnValue({ id: 'user-999' });
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    Object.defineProperty(window, 'location', {
      value: { search: '?ref=t5u6v', origin: 'https://test.app' },
      configurable: true,
      writable: true,
    });

    handleDeepLink();
    await new Promise(r => setTimeout(r, 50));

    const call = mockSafeRpc.mock.calls.find((c: unknown[]) => c[0] === 'attribute_signup');
    expect(call).toBeDefined();
    expect((call as unknown[])[1]).not.toHaveProperty('p_device_id');
  });
});

// ── TC-GK9: unauthenticated user does NOT trigger attribute_signup ────────────
// Spec (F-59): For unauthenticated users, attribution is deferred to the
// localStorage happy-path at signup time — NOT triggered at deep-link time.

describe('TC-GK9 — handleDeepLink: does not call attribute_signup for unauthenticated user', () => {
  it('skips attribute_signup when getCurrentUser returns null', async () => {
    mockGetCurrentUser.mockReturnValue(null);
    Object.defineProperty(window, 'location', {
      value: { search: '?ref=abc12', origin: 'https://test.app' },
      configurable: true,
      writable: true,
    });

    handleDeepLink();
    await new Promise(r => setTimeout(r, 50));

    const attributeCalls = mockSafeRpc.mock.calls.filter((c: unknown[]) => c[0] === 'attribute_signup');
    expect(attributeCalls).toHaveLength(0);
  });
});

// ── TC-GK10: shareResult text includes ELO values ────────────────────────────
// Spec: ShareResultParams exposes winnerElo and loserElo — they must appear
// in the shared text so recipients see the ELO context.

describe('TC-GK10 — shareResult: share text includes winner and loser ELO values', () => {
  it('embeds winnerElo and loserElo in the share text', async () => {
    mockShare.mockResolvedValue(undefined);

    shareResult({ winner: 'Alice', winnerElo: 1450, loser: 'Bob', loserElo: 1350, debateId: 'd1', topic: 'Test' });
    await new Promise(r => setTimeout(r, 0));

    const text: string = (mockShare.mock.calls[0] as [{ text: string }])[0].text;
    expect(text).toContain('1450');
    expect(text).toContain('1350');
  });
});

// ── TC-GK11: shareResult text includes spectator count ───────────────────────
// Spec: ShareResultParams exposes spectators — viewership context belongs in
// the share text.

describe('TC-GK11 — shareResult: share text includes spectator count', () => {
  it('embeds the spectator count in the share text', async () => {
    mockShare.mockResolvedValue(undefined);

    shareResult({ winner: 'Alice', loser: 'Bob', debateId: 'd2', spectators: 42 });
    await new Promise(r => setTimeout(r, 0));

    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('42'),
      }),
    );
  });
});

// ── TC-GK12: shareTake decodes URI-encoded text ───────────────────────────────
// Spec: shareTake receives a takeText that may be URI-encoded (stored as a URL
// param); the shared text must be human-readable (decoded).

describe('TC-GK12 — shareTake: decodes URI-encoded takeText before including in share text', () => {
  it('decodes percent-encoded characters so the share text is human-readable', async () => {
    mockShare.mockResolvedValue(undefined);

    shareTake('take-1', 'Hello%20World%21');
    await new Promise(r => setTimeout(r, 0));

    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Hello World!'),
      }),
    );
  });
});

// ── ARCH — src/share.ts imports only from allowed modules ────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/share.ts only imports from the allowed module list', () => {
  it('has no static imports outside the allowed set', () => {
    const allowed = [
      './config.ts',
      './auth.ts',
      './navigation.ts',
      './contracts/rpc-schemas.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/share.ts'),
      'utf-8',
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
