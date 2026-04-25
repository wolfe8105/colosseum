// int-tokens-balance.test.ts
// Seam #136 — src/tokens.balance.ts → auth.core
// Tests: _notify call in updateBalance, _updateBalanceDisplay DOM/broadcast,
//        requireTokens gate, getSummary balance sync, ARCH import check.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
    },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// ----------------------------------------------------------------
// ARCH
// ----------------------------------------------------------------
describe('Seam #136 — tokens.balance.ts → auth.core', () => {
  it('ARCH: tokens.balance.ts imports _notify from ./auth.core.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/tokens.balance.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasImport = lines.some(
      (l: string) => l.includes('_notify') && l.includes('./auth.core')
    );
    expect(hasImport).toBe(true);
  });

  // ----------------------------------------------------------------
  // TC1: _updateBalanceDisplay updates lastKnownBalance and DOM
  // ----------------------------------------------------------------
  describe('_updateBalanceDisplay — DOM update', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC1: updates lastKnownBalance and [data-token-balance] elements', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        showToast: vi.fn(),
        escapeHTML: (s: string) => s,
        UUID_RE: /^[0-9a-f-]{36}$/i,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        friendlyError: vi.fn(),
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
        getIsPlaceholderMode: vi.fn(() => true),
      }));
      vi.doMock('../../src/auth.core.ts', () => ({
        _notify: vi.fn(),
      }));

      // Arrange DOM
      document.body.innerHTML = `
        <span data-token-balance></span>
        <span data-token-balance></span>
        <span id="token-balance"></span>
      `;

      const mod = await import('../../src/tokens.balance.ts');
      mod._updateBalanceDisplay(999);

      expect(mod.lastKnownBalance).toBe(999);
      document.querySelectorAll('[data-token-balance]').forEach(el => {
        expect(el.textContent).toBe('999');
      });
      const balEl = document.getElementById('token-balance');
      expect(balEl?.textContent).toBe('999');
    });
  });

  // ----------------------------------------------------------------
  // TC2: _updateBalanceDisplay broadcast via _initBroadcast
  // ----------------------------------------------------------------
  describe('_updateBalanceDisplay — broadcast flag', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC2: _initBroadcast wires BroadcastChannel and broadcast=true posts, broadcast=false skips', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        showToast: vi.fn(),
        escapeHTML: (s: string) => s,
        UUID_RE: /^[0-9a-f-]{36}$/i,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        friendlyError: vi.fn(),
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
        getIsPlaceholderMode: vi.fn(() => true),
      }));
      vi.doMock('../../src/auth.core.ts', () => ({
        _notify: vi.fn(),
      }));

      // Stub BroadcastChannel globally so _initBroadcast() wires it
      const postMessage = vi.fn();
      const mockBc = { postMessage, onmessage: null as ((e: MessageEvent) => void) | null };
      const MockBC = vi.fn(() => mockBc);
      (globalThis as unknown as Record<string, unknown>).BroadcastChannel = MockBC;

      const mod = await import('../../src/tokens.balance.ts');
      // Wire the channel
      mod._initBroadcast();

      // broadcast=false → no postMessage
      mod._updateBalanceDisplay(500, false);
      expect(postMessage).not.toHaveBeenCalled();

      // broadcast=true (default) → postMessage called
      mod._updateBalanceDisplay(500, true);
      expect(postMessage).toHaveBeenCalledWith(500);
    });
  });

  // ----------------------------------------------------------------
  // TC3: updateBalance calls _notify with user+updated profile
  // ----------------------------------------------------------------
  describe('updateBalance — _notify integration', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC3: updateBalance calls _notify when profile exists', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockNotify = vi.fn();
      const fakeUser = { id: 'user-abc' };
      const fakeProfile = { id: 'user-abc', token_balance: 100 };

      vi.doMock('../../src/config.ts', () => ({
        showToast: vi.fn(),
        escapeHTML: (s: string) => s,
        UUID_RE: /^[0-9a-f-]{36}$/i,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        friendlyError: vi.fn(),
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getCurrentUser: vi.fn(() => fakeUser),
        getCurrentProfile: vi.fn(() => fakeProfile),
        getIsPlaceholderMode: vi.fn(() => true),
      }));
      vi.doMock('../../src/auth.core.ts', () => ({
        _notify: mockNotify,
      }));

      const mod = await import('../../src/tokens.balance.ts');
      mod.updateBalance(777);

      expect(mockNotify).toHaveBeenCalledTimes(1);
      const [calledUser, calledProfile] = mockNotify.mock.calls[0] as [unknown, Record<string, unknown>];
      expect(calledUser).toBe(fakeUser);
      expect(calledProfile).not.toBeNull();
      expect((calledProfile as Record<string, unknown>).token_balance).toBe(777);
    });
  });

  // ----------------------------------------------------------------
  // TC4: updateBalance does NOT call _notify when profile is null
  // ----------------------------------------------------------------
  describe('updateBalance — no profile', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC4: updateBalance skips _notify when getCurrentProfile() returns null', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockNotify = vi.fn();

      vi.doMock('../../src/config.ts', () => ({
        showToast: vi.fn(),
        escapeHTML: (s: string) => s,
        UUID_RE: /^[0-9a-f-]{36}$/i,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        friendlyError: vi.fn(),
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getCurrentUser: vi.fn(() => null),
        getCurrentProfile: vi.fn(() => null),
        getIsPlaceholderMode: vi.fn(() => true),
      }));
      vi.doMock('../../src/auth.core.ts', () => ({
        _notify: mockNotify,
      }));

      const mod = await import('../../src/tokens.balance.ts');
      mod.updateBalance(333);

      expect(mockNotify).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // TC5: requireTokens returns false + showToast when balance insufficient
  // ----------------------------------------------------------------
  describe('requireTokens — gate', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC5: returns false and shows toast when balance < required amount', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockShowToast = vi.fn();
      const fakeProfile = { id: 'u1', token_balance: 10 };

      vi.doMock('../../src/config.ts', () => ({
        showToast: mockShowToast,
        escapeHTML: (s: string) => s,
        UUID_RE: /^[0-9a-f-]{36}$/i,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        friendlyError: vi.fn(),
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getCurrentUser: vi.fn(() => ({ id: 'u1' })),
        getCurrentProfile: vi.fn(() => fakeProfile),
        getIsPlaceholderMode: vi.fn(() => false),
      }));
      vi.doMock('../../src/auth.core.ts', () => ({
        _notify: vi.fn(),
      }));

      const mod = await import('../../src/tokens.balance.ts');
      const result = mod.requireTokens(50, 'join debate');

      expect(result).toBe(false);
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      const toastMsg = (mockShowToast.mock.calls[0] as string[])[0];
      expect(toastMsg).toContain('50');
      expect(toastMsg).toContain('join debate');
    });

    it('TC5b: returns true when balance is sufficient', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockShowToast = vi.fn();
      const fakeProfile = { id: 'u1', token_balance: 100 };

      vi.doMock('../../src/config.ts', () => ({
        showToast: mockShowToast,
        escapeHTML: (s: string) => s,
        UUID_RE: /^[0-9a-f-]{36}$/i,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        friendlyError: vi.fn(),
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: vi.fn(),
        getCurrentUser: vi.fn(() => ({ id: 'u1' })),
        getCurrentProfile: vi.fn(() => fakeProfile),
        getIsPlaceholderMode: vi.fn(() => false),
      }));
      vi.doMock('../../src/auth.core.ts', () => ({
        _notify: vi.fn(),
      }));

      const mod = await import('../../src/tokens.balance.ts');
      const result = mod.requireTokens(50, 'join debate');

      expect(result).toBe(true);
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // TC6: getSummary returns null when _rpc returns falsy success
  // ----------------------------------------------------------------
  describe('getSummary — RPC integration', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC6: getSummary returns null when RPC returns { success: false }', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockSafeRpc = vi.fn().mockResolvedValue({ data: { success: false }, error: null });

      vi.doMock('../../src/config.ts', () => ({
        showToast: vi.fn(),
        escapeHTML: (s: string) => s,
        UUID_RE: /^[0-9a-f-]{36}$/i,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        friendlyError: vi.fn(),
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc,
        getCurrentUser: vi.fn(() => ({ id: 'u1' })),
        getCurrentProfile: vi.fn(() => null),
        getIsPlaceholderMode: vi.fn(() => false),
      }));
      vi.doMock('../../src/auth.core.ts', () => ({
        _notify: vi.fn(),
      }));

      const mod = await import('../../src/tokens.balance.ts');
      const summaryPromise = mod.getSummary();
      await vi.advanceTimersByTimeAsync(100);
      const summary = await summaryPromise;

      expect(summary).toBeNull();
    });

    it('TC7: getSummary returns summary and updates balance display when success=true', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockSafeRpc = vi.fn().mockResolvedValue({
        data: { success: true, token_balance: 250 },
        error: null,
      });

      vi.doMock('../../src/config.ts', () => ({
        showToast: vi.fn(),
        escapeHTML: (s: string) => s,
        UUID_RE: /^[0-9a-f-]{36}$/i,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        friendlyError: vi.fn(),
        FEATURES: {},
      }));
      vi.doMock('../../src/auth.ts', () => ({
        safeRpc: mockSafeRpc,
        getCurrentUser: vi.fn(() => ({ id: 'u1' })),
        getCurrentProfile: vi.fn(() => null),
        getIsPlaceholderMode: vi.fn(() => false),
      }));
      vi.doMock('../../src/auth.core.ts', () => ({
        _notify: vi.fn(),
      }));

      document.body.innerHTML = `<span data-token-balance></span>`;

      const mod = await import('../../src/tokens.balance.ts');
      const summaryPromise = mod.getSummary();
      await vi.advanceTimersByTimeAsync(100);
      const summary = await summaryPromise;

      expect(summary).not.toBeNull();
      expect(summary?.success).toBe(true);
      expect(mod.lastKnownBalance).toBe(250);
      const el = document.querySelector('[data-token-balance]') as HTMLElement;
      expect(el.textContent).toBe('250');
    });
  });
});

// ----------------------------------------------------------------
// Seam #201 — src/tokens.ts → tokens.balance (additional TCs)
// ----------------------------------------------------------------
describe('Seam #201 — tokens.ts → tokens.balance', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('ARCH-201: tokens.balance.ts has no wall imports', async () => {
    vi.resetModules();
    const src = await import('../../src/tokens.balance.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const wallPatterns = ['webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram', 'realtime-client', 'voicememo', 'arena-css', 'arena-sounds'];
    for (const pat of wallPatterns) {
      const hit = lines.some(l => l.includes(pat));
      expect(hit, `Should not import ${pat}`).toBe(false);
    }
  });

  it('TC-201-1: _updateBalanceDisplay with null does not update lastKnownBalance', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/config.ts', () => ({
      showToast: vi.fn(),
      escapeHTML: (s: string) => s,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-key',
      placeholderMode: { supabase: true },
      friendlyError: vi.fn(),
      FEATURES: {},
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(),
      getCurrentUser: vi.fn(() => null),
      getCurrentProfile: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => true),
    }));
    vi.doMock('../../src/auth.core.ts', () => ({ _notify: vi.fn() }));

    document.body.innerHTML = `<span data-token-balance>OLD</span>`;
    const mod = await import('../../src/tokens.balance.ts');

    mod._updateBalanceDisplay(null as unknown as number);
    expect(mod.lastKnownBalance).toBeNull();
    expect(document.querySelector('[data-token-balance]')?.textContent).toBe('OLD');

    mod._updateBalanceDisplay(undefined as unknown as number);
    expect(mod.lastKnownBalance).toBeNull();
    expect(document.querySelector('[data-token-balance]')?.textContent).toBe('OLD');
  });

  it('TC-201-2: _rpc returns null immediately when getIsPlaceholderMode()=true', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSafeRpc = vi.fn();

    vi.doMock('../../src/config.ts', () => ({
      showToast: vi.fn(),
      escapeHTML: (s: string) => s,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-key',
      placeholderMode: { supabase: true },
      friendlyError: vi.fn(),
      FEATURES: {},
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: mockSafeRpc,
      getCurrentUser: vi.fn(() => ({ id: 'u1' })),
      getCurrentProfile: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => true),
    }));
    vi.doMock('../../src/auth.core.ts', () => ({ _notify: vi.fn() }));

    const mod = await import('../../src/tokens.balance.ts');
    const result = await mod._rpc('some_fn', {});

    expect(result).toBeNull();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  it('TC-201-3: _rpc returns null when no user (not placeholder mode)', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSafeRpc = vi.fn();

    vi.doMock('../../src/config.ts', () => ({
      showToast: vi.fn(),
      escapeHTML: (s: string) => s,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-key',
      placeholderMode: { supabase: false },
      friendlyError: vi.fn(),
      FEATURES: {},
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: mockSafeRpc,
      getCurrentUser: vi.fn(() => null),
      getCurrentProfile: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => false),
    }));
    vi.doMock('../../src/auth.core.ts', () => ({ _notify: vi.fn() }));

    const mod = await import('../../src/tokens.balance.ts');
    const result = await mod._rpc('some_fn', {});

    expect(result).toBeNull();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  it('TC-201-4: requireTokens returns true and no toast when no profile', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockShowToast = vi.fn();

    vi.doMock('../../src/config.ts', () => ({
      showToast: mockShowToast,
      escapeHTML: (s: string) => s,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-key',
      placeholderMode: { supabase: true },
      friendlyError: vi.fn(),
      FEATURES: {},
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(),
      getCurrentUser: vi.fn(() => null),
      getCurrentProfile: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => true),
    }));
    vi.doMock('../../src/auth.core.ts', () => ({ _notify: vi.fn() }));

    const mod = await import('../../src/tokens.balance.ts');
    const result = mod.requireTokens(100, 'some action');

    expect(result).toBe(true);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('TC-201-5: getBalance returns lastKnownBalance', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doMock('../../src/config.ts', () => ({
      showToast: vi.fn(),
      escapeHTML: (s: string) => s,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-key',
      placeholderMode: { supabase: true },
      friendlyError: vi.fn(),
      FEATURES: {},
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(),
      getCurrentUser: vi.fn(() => null),
      getCurrentProfile: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => true),
    }));
    vi.doMock('../../src/auth.core.ts', () => ({ _notify: vi.fn() }));

    const mod = await import('../../src/tokens.balance.ts');
    expect(mod.getBalance()).toBeNull();

    mod._updateBalanceDisplay(42);
    expect(mod.getBalance()).toBe(42);
  });

  it('TC-201-6: _rpc returns null when safeRpc returns an error', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const mockSafeRpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });

    vi.doMock('../../src/config.ts', () => ({
      showToast: vi.fn(),
      escapeHTML: (s: string) => s,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-key',
      placeholderMode: { supabase: false },
      friendlyError: vi.fn(),
      FEATURES: {},
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: mockSafeRpc,
      getCurrentUser: vi.fn(() => ({ id: 'u1' })),
      getCurrentProfile: vi.fn(() => null),
      getIsPlaceholderMode: vi.fn(() => false),
    }));
    vi.doMock('../../src/auth.core.ts', () => ({ _notify: vi.fn() }));

    const mod = await import('../../src/tokens.balance.ts');
    const rpcPromise = mod._rpc('failing_fn', {});
    await vi.advanceTimersByTimeAsync(100);
    const result = await rpcPromise;

    expect(result).toBeNull();
    expect(mockSafeRpc).toHaveBeenCalledWith('failing_fn', {});
  });
});
