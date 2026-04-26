// int-groups.feed.test.ts
// Seam #314 — src/pages/groups.feed.ts → feed-card
// Tests: renderFeedCard called per card, renderFeedEmpty exported, feed-card integration

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// ── ARCH ──────────────────────────────────────────────────────────────────────
describe('Seam #314 — groups.feed.ts → feed-card', () => {
  it('ARCH: groups.feed.ts imports renderFeedCard and renderFeedEmpty from ../feed-card.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/pages/groups.feed.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasFeedCardImport = lines.some(
      (l: string) => l.includes('../feed-card') && l.includes('renderFeedCard')
    );
    expect(hasFeedCardImport).toBe(true);
  });

  it('ARCH: groups.feed.ts imports UnifiedFeedCard type from ../feed-card.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/pages/groups.feed.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasTypeImport = lines.some(
      (l: string) => l.includes('../feed-card') && l.includes('UnifiedFeedCard')
    );
    expect(hasTypeImport).toBe(true);
  });

  // ── TC1: renderFeedCard called per card returned by get_unified_feed ──────
  describe('TC1: loadGroupFeed calls renderFeedCard for each card', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('calls renderFeedCard once per card and injects all results into #detail-feed', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const cards = [
        { id: 'c1', content: 'Take 1', status: 'open', category: 'grp1', reaction_count: 0, created_at: new Date().toISOString() },
        { id: 'c2', content: 'Take 2', status: 'live', category: 'grp1', reaction_count: 2, created_at: new Date().toISOString() },
        { id: 'c3', content: 'Take 3', status: 'complete', category: 'grp1', reaction_count: 5, created_at: new Date().toISOString() },
      ];

      const safeRpcMock = vi.fn().mockResolvedValue({ data: cards, error: null });
      const renderFeedCardMock = vi.fn((c: { id: string }) => `<div class="feed-card" data-id="${c.id}">card-${c.id}</div>`);

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({ currentUser: null }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: vi.fn(() => '<div class="empty">empty</div>'),
      }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: renderFeedCardMock,
        renderFeedEmpty: vi.fn(() => '<div class="feed-empty">empty</div>'),
      }));

      document.body.innerHTML = '<div id="detail-feed"></div>';

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.loadGroupFeed('grp1');

      expect(renderFeedCardMock).toHaveBeenCalledTimes(3);
      expect(renderFeedCardMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
      expect(renderFeedCardMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'c2' }));
      expect(renderFeedCardMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'c3' }));

      const container = document.getElementById('detail-feed');
      expect(container?.innerHTML).toContain('data-id="c1"');
      expect(container?.innerHTML).toContain('data-id="c2"');
      expect(container?.innerHTML).toContain('data-id="c3"');
    });
  });

  // ── TC2: empty data → renderEmpty (not renderFeedCard) ───────────────────
  describe('TC2: loadGroupFeed renders empty state when data is empty array', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('does NOT call renderFeedCard when data array is empty', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const renderFeedCardMock = vi.fn(() => '<div>card</div>');
      const renderEmptyMock = vi.fn(() => '<div class="empty-state">No posts yet</div>');

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({ currentUser: null }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({ renderEmpty: renderEmptyMock }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: renderFeedCardMock,
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = '<div id="detail-feed"></div>';

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.loadGroupFeed('grp2');

      expect(renderFeedCardMock).not.toHaveBeenCalled();
      const container = document.getElementById('detail-feed');
      expect(container?.innerHTML).toContain('empty-state');
    });
  });

  // ── TC3: error from safeRpc → renderEmpty with ⚠️ ───────────────────────
  describe('TC3: loadGroupFeed renders error state on RPC error', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('calls renderEmpty("⚠️", "Could not load feed", "") on RPC error', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockRejectedValue(new Error('Network failure'));
      const renderFeedCardMock = vi.fn(() => '<div>card</div>');
      const renderEmptyMock = vi.fn(() => '<div class="error-state">error</div>');

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({ currentUser: null }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({ renderEmpty: renderEmptyMock }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: renderFeedCardMock,
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = '<div id="detail-feed"></div>';

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.loadGroupFeed('grp3');

      expect(renderFeedCardMock).not.toHaveBeenCalled();
      expect(renderEmptyMock).toHaveBeenCalledWith('⚠️', 'Could not load feed', '');
      const container = document.getElementById('detail-feed');
      expect(container?.innerHTML).toContain('error-state');
    });
  });

  // ── TC4: safeRpc called with correct params (p_limit:50, p_category) ──────
  describe('TC4: loadGroupFeed calls get_unified_feed with correct params', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('passes p_limit:50 and p_category:groupId to safeRpc', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({
        data: [{ id: 'x1', content: 'test', status: 'open', category: 'mygroup', reaction_count: 0, created_at: new Date().toISOString() }],
        error: null,
      });

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({ currentUser: null }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: vi.fn(() => '<div>empty</div>'),
      }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: vi.fn(() => '<div class="card">c</div>'),
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = '<div id="detail-feed"></div>';

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.loadGroupFeed('mygroup');

      expect(safeRpcMock).toHaveBeenCalledWith('get_unified_feed', {
        p_limit: 50,
        p_category: 'mygroup',
      });
    });
  });

  // ── TC5: postGroupCard → safeRpc create_debate_card ──────────────────────
  describe('TC5: postGroupCard calls create_debate_card RPC', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('calls safeRpc("create_debate_card", { p_content, p_category }) when user is logged in', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const showToastMock = vi.fn();
      const safeRpcMock = vi.fn().mockImplementation((name: string) => {
        if (name === 'create_debate_card') return Promise.resolve({ data: null, error: null });
        return Promise.resolve({ data: [], error: null });
      });

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: { id: 'u1', email: 'test@test.com' },
      }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: showToastMock,
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: { schema: true } }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: vi.fn(() => '<div>empty</div>'),
      }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: vi.fn(() => '<div>card</div>'),
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = `
        <div id="detail-feed"></div>
        <textarea id="group-take-input">Controversial opinion here</textarea>
        <button id="group-take-post">POST</button>
        <span id="group-take-count">26/280</span>
      `;

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.postGroupCard('target-group');

      expect(safeRpcMock).toHaveBeenCalledWith(
        'create_debate_card',
        { p_content: 'Controversial opinion here', p_category: 'target-group' },
        expect.anything()
      );
      expect(showToastMock).toHaveBeenCalledWith('🔥 Posted', 'success');

      const input = document.getElementById('group-take-input') as HTMLTextAreaElement;
      expect(input.value).toBe('');
    });
  });

  // ── TC6: postGroupCard → redirect when no user ────────────────────────────
  describe('TC6: postGroupCard redirects to plinko when not authenticated', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('redirects to moderator-plinko.html and does not call RPC when currentUser is null', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({ currentUser: null }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: vi.fn(() => '<div>empty</div>'),
      }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: vi.fn(() => '<div>card</div>'),
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = `
        <div id="detail-feed"></div>
        <textarea id="group-take-input">Some opinion</textarea>
        <button id="group-take-post">POST</button>
        <span id="group-take-count">12/280</span>
      `;

      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost/', pathname: '/moderator-groups.html' },
        writable: true,
      });

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.postGroupCard('group-no-auth');

      expect(safeRpcMock).not.toHaveBeenCalled();
      expect(window.location.href).toContain('moderator-plinko.html');
    });
  });

  // ── TC7: startFeedCountdowns / stopFeedCountdowns from feed-card ──────────
  describe('TC7: feed-card startFeedCountdowns / stopFeedCountdowns interval lifecycle', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('startFeedCountdowns sets an interval that updates .feed-card-countdown elements', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      // Explicitly clear the feed-card mock so the real module loads
      vi.doMock('../../src/feed-card.ts', async (importOriginal) => {
        const actual = await importOriginal<typeof import('../../src/feed-card.ts')>();
        return actual;
      });
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/auth.ts', () => ({
        getCurrentUser: vi.fn(() => null),
        safeRpc: vi.fn(),
      }));
      vi.doMock('../../src/badge.ts', () => ({ vgBadge: vi.fn(() => '') }));
      vi.doMock('../../src/bounties.ts', () => ({ bountyDot: vi.fn(() => '') }));

      const feedCard = await import('../../src/feed-card.ts');

      // Create a countdown element that is "recent" — 5 minutes ago
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      document.body.innerHTML = `<span class="feed-card-countdown" data-expires="${fiveMinsAgo}">initial</span>`;

      const el = document.querySelector('.feed-card-countdown') as HTMLElement;
      expect(el.textContent).toBe('initial');

      feedCard.startFeedCountdowns();
      await vi.advanceTimersByTimeAsync(1000);

      // After 1s tick, the countdown text should be updated (not 'initial')
      expect(el.textContent).not.toBe('initial');
      expect(el.textContent).toMatch(/\d+:\d{2} left|expired/);

      feedCard.stopFeedCountdowns();
      const textAfterStop = el.textContent;
      await vi.advanceTimersByTimeAsync(2000);
      // After stop, text should not change
      expect(el.textContent).toBe(textAfterStop);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Seam #368 — src/pages/groups.feed.ts → groups.utils (renderEmpty)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Seam #368 — groups.feed.ts → groups.utils (renderEmpty)', () => {
  it('ARCH: groups.feed.ts imports renderEmpty from ./groups.utils.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/pages/groups.feed.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const utilsImport = lines.find((l: string) => l.includes('./groups.utils'));
    expect(utilsImport).toBeDefined();
    expect(utilsImport).toContain('renderEmpty');
  });

  // ── TC368-1: loadGroupFeed calls renderEmpty from groups.utils on RPC error ─
  describe('TC368-1: loadGroupFeed uses groups.utils renderEmpty on RPC error', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('calls renderEmpty from groups.utils with ("⚠️", "Could not load feed", "") when safeRpc rejects', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const renderEmptyMock = vi.fn(() => '<div class="utils-empty">utils error</div>');
      const safeRpcMock = vi.fn().mockRejectedValue(new Error('Supabase down'));

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({ currentUser: null }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({ renderEmpty: renderEmptyMock }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: vi.fn(() => '<div>card</div>'),
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = '<div id="detail-feed"></div>';

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.loadGroupFeed('err-group');

      expect(renderEmptyMock).toHaveBeenCalledWith('⚠️', 'Could not load feed', '');
      const container = document.getElementById('detail-feed');
      expect(container?.innerHTML).toContain('utils-empty');
    });
  });

  // ── TC368-2: loadGroupFeed calls renderEmpty from groups.utils for empty data ─
  describe('TC368-2: loadGroupFeed uses groups.utils renderEmpty for empty feed', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('calls renderEmpty from groups.utils with ("💬", "No posts yet", ...) when data is empty', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const renderEmptyMock = vi.fn(() => '<div class="utils-empty-posts">no posts</div>');
      const safeRpcMock = vi.fn().mockResolvedValue({ data: [], error: null });

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({ currentUser: null }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({ renderEmpty: renderEmptyMock }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: vi.fn(() => '<div>card</div>'),
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = '<div id="detail-feed"></div>';

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.loadGroupFeed('empty-group');

      expect(renderEmptyMock).toHaveBeenCalledWith('💬', 'No posts yet', 'Join and post the first one');
      const container = document.getElementById('detail-feed');
      expect(container?.innerHTML).toContain('utils-empty-posts');
    });
  });

  // ── TC368-3: groups.utils renderEmpty — ARCH: uses escapeHTML from config.ts ─
  describe('TC368-3: groups.utils renderEmpty uses escapeHTML from config.ts', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('ARCH: groups.utils.ts imports escapeHTML from ../config.ts', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const src = await import('../../src/pages/groups.utils.ts?raw');
      const lines: string[] = (src as unknown as { default: string }).default
        .split('\n')
        .filter((l: string) => /from\s+['"]/.test(l));
      const configImport = lines.find((l: string) => l.includes('../config') && l.includes('escapeHTML'));
      expect(configImport).toBeDefined();
      // Confirm it's the real escapeHTML, not a local shim
      expect(configImport).toMatch(/from\s+['"]\.\.\/config/);
    });
  });

  // ── TC368-4: loadGroupFeed injects composerHtml when user is logged in ────
  describe('TC368-4: loadGroupFeed shows composer when currentUser is set', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('injects composer textarea into #detail-feed when currentUser is non-null and data is empty', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const renderEmptyMock = vi.fn(() => '<div class="empty-state">no posts</div>');

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: { id: 'u99', email: 'user@test.com' },
      }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({ renderEmpty: renderEmptyMock }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: vi.fn(() => '<div>card</div>'),
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = '<div id="detail-feed"></div>';

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.loadGroupFeed('auth-group');

      // groups.utils renderEmpty still called for the "No posts yet" state
      expect(renderEmptyMock).toHaveBeenCalledWith('💬', 'No posts yet', 'Be the first to post');
      // Composer should be injected
      const container = document.getElementById('detail-feed');
      expect(container?.innerHTML).toContain('group-take-input');
    });
  });

  // ── TC368-5: loadGroupFeed null data path uses renderEmpty ────────────────
  describe('TC368-5: loadGroupFeed treats null data as empty and calls renderEmpty', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('calls renderEmpty when safeRpc returns { data: null, error: null }', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
      const renderEmptyMock = vi.fn(() => '<div class="empty-null">null result</div>');

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({ currentUser: null }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({ create_debate_card: {} }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({ renderEmpty: renderEmptyMock }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: vi.fn(() => '<div>card</div>'),
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = '<div id="detail-feed"></div>';

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.loadGroupFeed('null-group');

      expect(renderEmptyMock).toHaveBeenCalled();
      const container = document.getElementById('detail-feed');
      expect(container?.innerHTML).toContain('empty-null');
    });
  });
});
