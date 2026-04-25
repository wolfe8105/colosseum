// int-tokens-animations.test.ts
// Seam #229 — src/tokens.ts → tokens.animations
// Tests: _injectCSS idempotency, _coinFlyUp DOM/timer, _tokenToast guard + showToast,
//        _milestoneToast DOM content/escaping/reward variants + timer.

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
describe('Seam #229 — tokens.animations.ts → config.ts', () => {
  it('ARCH: tokens.animations.ts imports escapeHTML and showToast from ./config.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/tokens.animations.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const configImport = lines.find((l: string) => l.includes('./config'));
    expect(configImport).toBeTruthy();
    expect(configImport).toContain('escapeHTML');
    expect(configImport).toContain('showToast');
  });

  // ----------------------------------------------------------------
  // TC1: _injectCSS idempotency — only injects one <style> tag
  // ----------------------------------------------------------------
  describe('_injectCSS — CSS injection', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.head.innerHTML = '';
      document.body.innerHTML = '';
    });

    it('TC1: injects <style> into document.head with tokenFlyUp keyframes; second call is no-op', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        FEATURES: {},
        friendlyError: vi.fn(),
        UUID_RE: /^[0-9a-f-]{36}$/i,
      }));

      const mod = await import('../../src/tokens.animations.ts');

      const stylesBefore = document.head.querySelectorAll('style').length;
      mod._injectCSS();
      const stylesAfterFirst = document.head.querySelectorAll('style').length;
      expect(stylesAfterFirst).toBe(stylesBefore + 1);

      // second call — idempotent
      mod._injectCSS();
      const stylesAfterSecond = document.head.querySelectorAll('style').length;
      expect(stylesAfterSecond).toBe(stylesAfterFirst);

      const styleEl = document.head.querySelector('style');
      expect(styleEl?.textContent).toContain('tokenFlyUp');
      expect(styleEl?.textContent).toContain('milestoneSlide');
      expect(styleEl?.textContent).toContain('token-fly-coin');
    });
  });

  // ----------------------------------------------------------------
  // TC2: _coinFlyUp appends .token-fly-coin and removes after 1000ms
  // ----------------------------------------------------------------
  describe('_coinFlyUp — coin animation', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.head.innerHTML = '';
      document.body.innerHTML = '';
    });

    it('TC2: appends .token-fly-coin with 🪙 to body; removes after 1000ms', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        FEATURES: {},
        friendlyError: vi.fn(),
        UUID_RE: /^[0-9a-f-]{36}$/i,
      }));

      const mod = await import('../../src/tokens.animations.ts');

      mod._coinFlyUp();
      const coin = document.body.querySelector('.token-fly-coin');
      expect(coin).toBeTruthy();
      expect(coin?.textContent).toBe('🪙');

      // before timer fires — still in DOM
      await vi.advanceTimersByTimeAsync(999);
      expect(document.body.querySelector('.token-fly-coin')).toBeTruthy();

      // after 1000ms — removed
      await vi.advanceTimersByTimeAsync(1);
      expect(document.body.querySelector('.token-fly-coin')).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // TC3: _coinFlyUp positions coin using #token-display bounding box
  // ----------------------------------------------------------------
  describe('_coinFlyUp — coin position with #token-display', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.head.innerHTML = '';
      document.body.innerHTML = '';
    });

    it('TC3: uses #token-display bounding rect to set coin position when present', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        FEATURES: {},
        friendlyError: vi.fn(),
        UUID_RE: /^[0-9a-f-]{36}$/i,
      }));

      // insert a mock #token-display bar
      const bar = document.createElement('div');
      bar.id = 'token-display';
      document.body.appendChild(bar);
      // JSDOM getBoundingClientRect returns zeros by default — override
      bar.getBoundingClientRect = vi.fn(() => ({
        left: 100, width: 40, bottom: 60,
        top: 0, right: 140, height: 60,
        x: 100, y: 0,
        toJSON: () => ({}),
      } as DOMRect));

      const mod = await import('../../src/tokens.animations.ts');
      mod._coinFlyUp();

      const coin = document.body.querySelector('.token-fly-coin') as HTMLElement;
      expect(coin).toBeTruthy();
      // left = rect.left + rect.width / 2 = 100 + 20 = 120px
      expect(coin.style.left).toBe('120px');
      // top = rect.bottom = 60px
      expect(coin.style.top).toBe('60px');
    });

    it('TC3b: falls back to top:60px when #token-display is absent', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        FEATURES: {},
        friendlyError: vi.fn(),
        UUID_RE: /^[0-9a-f-]{36}$/i,
      }));

      const mod = await import('../../src/tokens.animations.ts');
      mod._coinFlyUp();

      const coin = document.body.querySelector('.token-fly-coin') as HTMLElement;
      expect(coin).toBeTruthy();
      expect(coin.style.top).toBe('60px');
    });
  });

  // ----------------------------------------------------------------
  // TC4: _tokenToast guard and showToast integration
  // ----------------------------------------------------------------
  describe('_tokenToast — toast + coin', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.head.innerHTML = '';
      document.body.innerHTML = '';
    });

    it('TC4a: _tokenToast(0, label) is a no-op — no DOM change, no showToast', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockShowToast = vi.fn();
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: mockShowToast,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        FEATURES: {},
        friendlyError: vi.fn(),
        UUID_RE: /^[0-9a-f-]{36}$/i,
      }));

      const mod = await import('../../src/tokens.animations.ts');
      mod._tokenToast(0, 'Daily');

      expect(mockShowToast).not.toHaveBeenCalled();
      expect(document.body.querySelector('.token-fly-coin')).toBeNull();
    });

    it('TC4b: _tokenToast(5, "Daily") calls showToast with correct args and injects coin', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockShowToast = vi.fn();
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: mockShowToast,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        FEATURES: {},
        friendlyError: vi.fn(),
        UUID_RE: /^[0-9a-f-]{36}$/i,
      }));

      const mod = await import('../../src/tokens.animations.ts');
      mod._tokenToast(5, 'Daily');

      expect(mockShowToast).toHaveBeenCalledWith('+5 🪙 Daily', 'success');
      expect(document.body.querySelector('.token-fly-coin')).toBeTruthy();
    });

    it('TC4c: _tokenToast(-1, label) is a no-op — negative tokens guard', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const mockShowToast = vi.fn();
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: mockShowToast,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        FEATURES: {},
        friendlyError: vi.fn(),
        UUID_RE: /^[0-9a-f-]{36}$/i,
      }));

      const mod = await import('../../src/tokens.animations.ts');
      mod._tokenToast(-1, 'Negative');

      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // TC5: _milestoneToast DOM content + auto-remove at 3600ms
  // ----------------------------------------------------------------
  describe('_milestoneToast — milestone toast', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.head.innerHTML = '';
      document.body.innerHTML = '';
    });

    it('TC5: appends .milestone-toast with icon/label/reward text; removes after 3600ms', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        FEATURES: {},
        friendlyError: vi.fn(),
        UUID_RE: /^[0-9a-f-]{36}$/i,
      }));

      const mod = await import('../../src/tokens.animations.ts');
      mod._milestoneToast('🔥', 'First Debate', 10, 0);

      const toast = document.body.querySelector('.milestone-toast') as HTMLElement;
      expect(toast).toBeTruthy();
      expect(toast.querySelector('.mt-icon')?.textContent).toBe('🔥');
      expect(toast.querySelector('.mt-label')?.textContent).toBe('MILESTONE UNLOCKED');
      expect(toast.innerHTML).toContain('First Debate');
      expect(toast.querySelector('.mt-reward')?.textContent).toBe('+10 🪙 tokens');

      // before 3600ms — still present
      await vi.advanceTimersByTimeAsync(3599);
      expect(document.body.querySelector('.milestone-toast')).toBeTruthy();

      // at 3600ms — removed
      await vi.advanceTimersByTimeAsync(1);
      expect(document.body.querySelector('.milestone-toast')).toBeNull();
    });

    it('TC5b: _milestoneToast escapes XSS in icon and label', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) =>
          s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
           .replace(/"/g, '&quot;').replace(/'/g, '&#x27;'),
        showToast: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        FEATURES: {},
        friendlyError: vi.fn(),
        UUID_RE: /^[0-9a-f-]{36}$/i,
      }));

      const mod = await import('../../src/tokens.animations.ts');
      mod._milestoneToast('<script>', '<img onerror=alert(1)>', 5, 0);

      const toast = document.body.querySelector('.milestone-toast') as HTMLElement;
      expect(toast).toBeTruthy();
      // raw script tag must NOT be present in innerHTML
      expect(toast.innerHTML).not.toContain('<script>');
      expect(toast.innerHTML).toContain('&lt;script&gt;');
    });
  });

  // ----------------------------------------------------------------
  // TC6: _milestoneToast reward text variants
  // ----------------------------------------------------------------
  describe('_milestoneToast — reward text variants', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.head.innerHTML = '';
      document.body.innerHTML = '';
    });

    it('TC6a: tokens only — shows "+N 🪙 tokens"', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        FEATURES: {},
        friendlyError: vi.fn(),
        UUID_RE: /^[0-9a-f-]{36}$/i,
      }));

      const mod = await import('../../src/tokens.animations.ts');
      mod._milestoneToast('🏆', 'First Win', 25, 0);

      const reward = document.body.querySelector('.mt-reward')?.textContent;
      expect(reward).toBe('+25 🪙 tokens');
    });

    it('TC6b: freezes only (singular) — shows "+1 ❄️ streak freeze"', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        FEATURES: {},
        friendlyError: vi.fn(),
        UUID_RE: /^[0-9a-f-]{36}$/i,
      }));

      const mod = await import('../../src/tokens.animations.ts');
      mod._milestoneToast('❄️', 'Cold Streak', 0, 1);

      const reward = document.body.querySelector('.mt-reward')?.textContent;
      expect(reward).toBe('+1 ❄️ streak freeze');
    });

    it('TC6c: freezes only (plural) — shows "+3 ❄️ streak freezes"', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        FEATURES: {},
        friendlyError: vi.fn(),
        UUID_RE: /^[0-9a-f-]{36}$/i,
      }));

      const mod = await import('../../src/tokens.animations.ts');
      mod._milestoneToast('❄️', 'Freeze Pack', 0, 3);

      const reward = document.body.querySelector('.mt-reward')?.textContent;
      expect(reward).toBe('+3 ❄️ streak freezes');
    });

    it('TC6d: both tokens and freezes — shows combined "+N 🪙 + M ❄️"', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-key',
        placeholderMode: { supabase: true },
        FEATURES: {},
        friendlyError: vi.fn(),
        UUID_RE: /^[0-9a-f-]{36}$/i,
      }));

      const mod = await import('../../src/tokens.animations.ts');
      mod._milestoneToast('🏆', 'Grand Slam', 50, 2);

      const reward = document.body.querySelector('.mt-reward')?.textContent;
      expect(reward).toBe('+50 🪙 + 2 ❄️');
    });
  });
});
