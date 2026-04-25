// int-groups-feed.test.ts
// Seam #155 — src/pages/groups.feed.ts → groups.state
// Tests: loadGroupFeed, postGroupCard, _wireGroupComposer — state reads and safeRpc calls.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// ── ARCH ──────────────────────────────────────────────────────────────────────
describe('Seam #155 — groups.feed.ts → groups.state', () => {
  it('ARCH: groups.feed.ts imports currentUser from ./groups.state.ts', async () => {
    vi.resetModules();
    const src = await import('../../src/pages/groups.feed.ts?raw');
    const lines: string[] = (src as unknown as { default: string }).default
      .split('\n')
      .filter((l: string) => /from\s+['"]/.test(l));
    const hasStateImport = lines.some(
      (l: string) => l.includes('./groups.state') && l.includes('currentUser')
    );
    expect(hasStateImport).toBe(true);
  });

  // ── loadGroupFeed ────────────────────────────────────────────────────────
  describe('loadGroupFeed', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC2: loadGroupFeed calls safeRpc("get_unified_feed") with p_limit:50 and p_category:groupId', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({
        data: [{ id: 'card1', content: 'Hot take', status: 'open', category: 'group1' }],
        error: null,
      });

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({ currentUser: null }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        create_debate_card: {},
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: vi.fn(() => '<div class="empty">empty</div>'),
      }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: vi.fn(() => '<div class="feed-card">card</div>'),
        renderFeedEmpty: vi.fn(() => '<div class="feed-empty">empty</div>'),
      }));

      document.body.innerHTML = '<div id="detail-feed"></div>';

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.loadGroupFeed('group1');

      expect(safeRpcMock).toHaveBeenCalledWith('get_unified_feed', {
        p_limit: 50,
        p_category: 'group1',
      });

      const container = document.getElementById('detail-feed');
      expect(container?.innerHTML).toContain('feed-card');
    });

    it('TC3: loadGroupFeed renders empty state + composer when data is empty and user is logged in', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const renderEmptyMock = vi.fn(() => '<div class="empty-state">No posts yet</div>');

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: { id: 'user1', email: 'user@test.com' },
      }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        create_debate_card: {},
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: renderEmptyMock,
      }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: vi.fn(() => '<div class="feed-card">card</div>'),
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = '<div id="detail-feed"></div>';

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.loadGroupFeed('group2');

      const container = document.getElementById('detail-feed');
      // Should include the composer textarea and empty state
      expect(container?.innerHTML).toContain('group-take-input');
      expect(container?.innerHTML).toContain('empty-state');
    });

    it('TC4: loadGroupFeed renders error state when safeRpc throws', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockRejectedValue(new Error('Network error'));
      const renderEmptyMock = vi.fn(() => '<div class="error-state">Could not load feed</div>');

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({ currentUser: null }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        create_debate_card: {},
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: renderEmptyMock,
      }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: vi.fn(() => '<div>card</div>'),
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = '<div id="detail-feed"></div>';

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.loadGroupFeed('group3');

      const container = document.getElementById('detail-feed');
      expect(renderEmptyMock).toHaveBeenCalledWith('⚠️', 'Could not load feed', '');
      expect(container?.innerHTML).toContain('error-state');
    });
  });

  // ── postGroupCard ────────────────────────────────────────────────────────
  describe('postGroupCard', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC5: postGroupCard redirects to plinko when currentUser is null and text is present', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn();

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({ currentUser: null }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        create_debate_card: {},
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: vi.fn(() => '<div>empty</div>'),
      }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: vi.fn(() => '<div>card</div>'),
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = `
        <div id="detail-feed"></div>
        <textarea id="group-take-input">My hot take</textarea>
        <button id="group-take-post">POST</button>
        <span id="group-take-count">0/280</span>
      `;

      const originalLocation = window.location.href;
      Object.defineProperty(window, 'location', {
        value: { href: originalLocation, pathname: '/moderator-groups.html' },
        writable: true,
      });

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.postGroupCard('groupX');

      expect(safeRpcMock).not.toHaveBeenCalled();
      expect(window.location.href).toContain('moderator-plinko.html');
    });

    it('TC6: postGroupCard calls safeRpc("create_debate_card") with text and groupId, then reloads feed', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const showToastMock = vi.fn();
      let safeRpcCallCount = 0;
      const safeRpcMock = vi.fn().mockImplementation((name: string) => {
        safeRpcCallCount++;
        if (name === 'create_debate_card') {
          return Promise.resolve({ data: null, error: null });
        }
        // get_unified_feed (reload)
        return Promise.resolve({ data: [], error: null });
      });

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: { id: 'user1', email: 'user@test.com' },
      }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: showToastMock,
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        create_debate_card: {},
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: vi.fn(() => '<div>empty</div>'),
      }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: vi.fn(() => '<div>card</div>'),
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = `
        <div id="detail-feed"></div>
        <textarea id="group-take-input">My opinion on this topic</textarea>
        <button id="group-take-post">POST</button>
        <span id="group-take-count">24/280</span>
      `;

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.postGroupCard('groupY');

      // First call should be create_debate_card
      expect(safeRpcMock).toHaveBeenCalledWith(
        'create_debate_card',
        { p_content: 'My opinion on this topic', p_category: 'groupY' },
        expect.anything()
      );
      expect(showToastMock).toHaveBeenCalledWith('🔥 Posted', 'success');

      // Input should be cleared after success
      const input = document.getElementById('group-take-input') as HTMLTextAreaElement;
      expect(input.value).toBe('');
    });
  });

  // ── _wireGroupComposer ───────────────────────────────────────────────────
  describe('_wireGroupComposer (via loadGroupFeed)', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = '';
    });

    it('TC7: character counter updates on textarea input events', async () => {
      vi.resetModules();
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

      const safeRpcMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const renderEmptyMock = vi.fn(() => '<div>empty</div>');

      vi.doMock('../../src/auth.ts', () => ({ safeRpc: safeRpcMock }));
      vi.doMock('../../src/pages/groups.state.ts', () => ({
        currentUser: { id: 'user1', email: 'user@test.com' },
      }));
      vi.doMock('../../src/config.ts', () => ({
        escapeHTML: (s: string) => s,
        showToast: vi.fn(),
      }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        create_debate_card: {},
      }));
      vi.doMock('../../src/pages/groups.utils.ts', () => ({
        renderEmpty: renderEmptyMock,
      }));
      vi.doMock('../../src/feed-card.ts', () => ({
        renderFeedCard: vi.fn(() => '<div>card</div>'),
        renderFeedEmpty: vi.fn(() => '<div>empty</div>'),
      }));

      document.body.innerHTML = '<div id="detail-feed"></div>';

      const mod = await import('../../src/pages/groups.feed.ts');
      await mod.loadGroupFeed('groupZ');

      // After loadGroupFeed with empty data + logged-in user, composer is rendered
      const input = document.getElementById('group-take-input') as HTMLTextAreaElement;
      const counter = document.getElementById('group-take-count');

      expect(input).not.toBeNull();
      expect(counter).not.toBeNull();

      // Simulate typing
      input.value = 'Hello world';
      input.dispatchEvent(new Event('input'));

      expect(counter?.textContent).toBe('11/280');
    });
  });
});
