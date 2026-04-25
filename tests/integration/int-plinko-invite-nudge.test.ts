/**
 * Integration tests — seam #095
 * src/pages/plinko-invite-nudge.ts → src/contracts/rpc-schemas.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── ARCH filter ──────────────────────────────────────────────────────────────
describe('ARCH — plinko-invite-nudge imports', () => {
  it('only imports from rpc-schemas and auth', async () => {
    const src = await import('../../src/pages/plinko-invite-nudge.ts?raw');
    const imports = src.default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));

    const allowed = ['../contracts/rpc-schemas', '../auth'];
    for (const line of imports) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!match) continue;
      const specifier = match[1];
      const ok = allowed.some((a) => specifier.includes(a));
      expect(ok, `Unexpected import: ${specifier}`).toBe(true);
    }
  });
});

// ── Schema unit tests ─────────────────────────────────────────────────────────
describe('rpc-schemas — get_my_invite_link', () => {
  it('TC-05: validates a valid response with url and ref_code', async () => {
    const { get_my_invite_link } = await import('../../src/contracts/rpc-schemas.ts');
    const result = get_my_invite_link.safeParse({ url: 'https://themoderator.app?ref=abc123', ref_code: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('TC-06: passthrough allows extra fields without throwing', async () => {
    const { get_my_invite_link } = await import('../../src/contracts/rpc-schemas.ts');
    const result = get_my_invite_link.safeParse({ url: 'https://example.com', ref_code: 'xyz', extra_field: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).extra_field).toBe(true);
    }
  });

  it('schema accepts partial response (url only)', async () => {
    const { get_my_invite_link } = await import('../../src/contracts/rpc-schemas.ts');
    const result = get_my_invite_link.safeParse({ url: 'https://themoderator.app?ref=abc' });
    expect(result.success).toBe(true);
  });

  it('schema accepts empty object (all fields optional)', async () => {
    const { get_my_invite_link } = await import('../../src/contracts/rpc-schemas.ts');
    const result = get_my_invite_link.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ── Behaviour tests ───────────────────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
  })),
}));

describe('injectInviteNudge — DOM behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC-01: does nothing when #step-5 is absent', async () => {
    // No #step-5 in DOM
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: { url: 'https://themoderator.app?ref=abc' }, error: null }),
    }));
    const { injectInviteNudge } = await import('../../src/pages/plinko-invite-nudge.ts');
    await injectInviteNudge();
    expect(document.getElementById('plinko-invite-nudge')).toBeNull();
  });

  it('TC-02: does nothing when #plinko-invite-nudge already exists (idempotent guard)', async () => {
    document.body.innerHTML = '<div id="step-5"><div id="plinko-invite-nudge">existing</div></div>';
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: { url: 'https://themoderator.app?ref=abc' }, error: null }),
    }));
    const { injectInviteNudge } = await import('../../src/pages/plinko-invite-nudge.ts');
    await injectInviteNudge();
    // Should still be the original element, not a second one
    const nudges = document.querySelectorAll('#plinko-invite-nudge');
    expect(nudges.length).toBe(1);
    expect(nudges[0].textContent).toBe('existing');
  });

  it('TC-03: injects #plinko-invite-nudge into #step-5 when safeRpc returns a URL', async () => {
    document.body.innerHTML = '<div id="step-5"></div>';
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: { url: 'https://themoderator.app?ref=testcode' }, error: null }),
    }));
    const { injectInviteNudge } = await import('../../src/pages/plinko-invite-nudge.ts');
    await injectInviteNudge();

    const nudge = document.getElementById('plinko-invite-nudge');
    expect(nudge).not.toBeNull();
    expect(document.getElementById('step-5')?.contains(nudge)).toBe(true);
    // Copy button must be present
    expect(nudge?.querySelector('#plinko-invite-copy')).not.toBeNull();
  });

  it('TC-04: does not inject nudge when safeRpc returns null data (no URL)', async () => {
    document.body.innerHTML = '<div id="step-5"></div>';
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    const { injectInviteNudge } = await import('../../src/pages/plinko-invite-nudge.ts');
    await injectInviteNudge();

    expect(document.getElementById('plinko-invite-nudge')).toBeNull();
  });

  it('TC-04b: does not inject nudge when safeRpc data has no url property', async () => {
    document.body.innerHTML = '<div id="step-5"></div>';
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: { ref_code: 'xyz' }, error: null }),
    }));
    const { injectInviteNudge } = await import('../../src/pages/plinko-invite-nudge.ts');
    await injectInviteNudge();

    expect(document.getElementById('plinko-invite-nudge')).toBeNull();
  });

  it('TC-07: clicking copy button calls navigator.clipboard.writeText with invite URL', async () => {
    document.body.innerHTML = '<div id="step-5"></div>';
    const testUrl = 'https://themoderator.app?ref=clicktest';
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn().mockResolvedValue({ data: { url: testUrl }, error: null }),
    }));

    // Mock clipboard
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardWriteText },
      writable: true,
      configurable: true,
    });

    const { injectInviteNudge } = await import('../../src/pages/plinko-invite-nudge.ts');
    await injectInviteNudge();

    const btn = document.getElementById('plinko-invite-copy') as HTMLButtonElement;
    expect(btn).not.toBeNull();

    btn.click();
    // Give the async click handler a tick
    await Promise.resolve();

    expect(clipboardWriteText).toHaveBeenCalledWith(testUrl);
  });

  it('TC-07b: safeRpc is called with correct RPC name and schema', async () => {
    document.body.innerHTML = '<div id="step-5"></div>';
    const mockSafeRpc = vi.fn().mockResolvedValue({ data: { url: 'https://themoderator.app?ref=abc' }, error: null });
    vi.doMock('../../src/auth.ts', () => ({ safeRpc: mockSafeRpc }));

    const { injectInviteNudge } = await import('../../src/pages/plinko-invite-nudge.ts');
    await injectInviteNudge();

    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [rpcName, rpcParams] = mockSafeRpc.mock.calls[0];
    expect(rpcName).toBe('get_my_invite_link');
    expect(rpcParams).toEqual({});
  });
});
