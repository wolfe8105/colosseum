/**
 * Integration test: src/share.ts → src/contracts/rpc-schemas.ts
 * Seam #058
 *
 * Covers:
 *  TC-01 ARCH   — share.ts statically imports get_my_invite_link from rpc-schemas
 *  TC-02        — getStableInviteUrl returns url from safeRpc success response
 *  TC-03        — getStableInviteUrl returns fallback when safeRpc throws
 *  TC-04        — getStableInviteUrl returns fallback when safeRpc data is null
 *  TC-05        — getStableInviteUrl caches result (second inviteFriend skips safeRpc)
 *  TC-06        — inviteFriend builds share text that includes the resolved invite URL
 *  TC-07        — handleDeepLink calls attribute_signup (not get_my_invite_link) for ref param
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Supabase mock (only mock) ─────────────────────────────────────────────────
const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, auth: mockAuth })),
}));

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();   // reset to real before each test; each test activates fake timers itself
  mockRpc.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.getSession.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
});

// ── TC-01: ARCH ───────────────────────────────────────────────────────────────
describe('TC-01 ARCH — share.ts imports get_my_invite_link from rpc-schemas', () => {
  it('has an import statement referencing contracts/rpc-schemas', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/share.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasSchema = importLines.some(l =>
      l.includes('rpc-schemas') && l.includes('get_my_invite_link')
    );
    expect(hasSchema).toBe(true);
  });
});

// ── TC-02: safeRpc returns url → getStableInviteUrl returns it ────────────────
describe('TC-02 — getStableInviteUrl resolves to url from safeRpc data', () => {
  it('returns the url field when safeRpc succeeds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockResolvedValue({
      data: { url: 'https://themoderator.app/join?ref=abc12', ref_code: 'abc12' },
      error: null,
    });

    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true, writable: true });

    const { inviteFriend } = await import('../../src/share.ts');

    // Trigger inviteFriend which internally calls getStableInviteUrl → safeRpc
    inviteFriend();

    // Advance past auth safety timeout (6s) so ready resolves, then flush
    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://themoderator.app/join?ref=abc12' })
    );
  });
});

// ── TC-03: safeRpc throws → fallback URL ─────────────────────────────────────
describe('TC-03 — getStableInviteUrl returns fallback when safeRpc throws', () => {
  it('falls back to plinko URL on exception', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockRejectedValue(new Error('network error'));

    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true, writable: true });

    const { inviteFriend } = await import('../../src/share.ts');

    inviteFriend();

    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('moderator-plinko.html') })
    );
  });
});

// ── TC-04: safeRpc data null → fallback URL ───────────────────────────────────
describe('TC-04 — getStableInviteUrl returns fallback when safeRpc data is null', () => {
  it('falls back to plinko URL when data is null', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockResolvedValue({ data: null, error: null });

    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true, writable: true });

    const { inviteFriend } = await import('../../src/share.ts');

    inviteFriend();

    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('moderator-plinko.html') })
    );
  });
});

// ── TC-05: caching — second call skips safeRpc ────────────────────────────────
describe('TC-05 — getStableInviteUrl caches result in module memory', () => {
  it('only calls safeRpc once for get_my_invite_link across two inviteFriend calls', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockResolvedValue({
      data: { url: 'https://themoderator.app/join?ref=xyz99', ref_code: 'xyz99' },
      error: null,
    });

    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true, writable: true });

    const { inviteFriend } = await import('../../src/share.ts');

    // First call — should hit safeRpc
    inviteFriend();

    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    // Second call — should hit cache, not safeRpc again
    inviteFriend();

    await vi.advanceTimersByTimeAsync(100);
    await vi.runAllTicks();

    // Only one safeRpc call for get_my_invite_link
    const rpcCallsForInviteLink = mockRpc.mock.calls.filter(
      ([name]: [string]) => name === 'get_my_invite_link'
    );
    expect(rpcCallsForInviteLink.length).toBe(1);
  });
});

// ── TC-06: inviteFriend share text includes invite URL ────────────────────────
describe('TC-06 — inviteFriend share text contains the resolved invite URL', () => {
  it('passes invite URL in the text field to navigator.share', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockResolvedValue({
      data: { url: 'https://themoderator.app/join?ref=test1', ref_code: 'test1' },
      error: null,
    });

    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true, writable: true });

    const { inviteFriend } = await import('../../src/share.ts');

    inviteFriend();

    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    const callArg = shareSpy.mock.calls[0]?.[0] as { title: string; text: string; url: string } | undefined;
    expect(callArg).toBeDefined();
    expect(callArg!.text).toContain('https://themoderator.app/join?ref=test1');
    expect(callArg!.title).toBe('Join The Moderator');
  });
});

// ── TC-07: handleDeepLink calls attribute_signup for ref param ────────────────
describe('TC-07 — handleDeepLink calls attribute_signup (not get_my_invite_link) for ?ref=', () => {
  it('calls attribute_signup RPC and never calls get_my_invite_link', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Simulate authenticated user: onAuthStateChange fires SIGNED_IN
    mockAuth.onAuthStateChange.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        // Fire INITIAL_SESSION so ready resolves
        cb('INITIAL_SESSION', { user: { id: 'user-uuid-1234' } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }
    );

    // Set up URL with ref param
    Object.defineProperty(window, 'location', {
      value: {
        search: '?ref=abc12',
        origin: 'https://themoderator.app',
        href: 'https://themoderator.app/?ref=abc12',
      },
      configurable: true,
      writable: true,
    });
    localStorage.setItem('colosseum_referrer', 'abc12');

    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    const { handleDeepLink } = await import('../../src/share.ts');

    handleDeepLink();

    await vi.advanceTimersByTimeAsync(6000);
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(0);
    await vi.runAllTicks();

    // attribute_signup should be called
    const attributeCalls = mockRpc.mock.calls.filter(
      ([name]: [string]) => name === 'attribute_signup'
    );
    expect(attributeCalls.length).toBeGreaterThanOrEqual(1);

    // get_my_invite_link must NOT be called by handleDeepLink
    const inviteLinkCalls = mockRpc.mock.calls.filter(
      ([name]: [string]) => name === 'get_my_invite_link'
    );
    expect(inviteLinkCalls.length).toBe(0);
  });
});
