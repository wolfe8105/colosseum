/**
 * Integration tests — src/pages/groups.feed.ts → rpc-schemas
 * Seam #079
 *
 * TCs:
 *   1. ARCH        — groups.feed.ts imports create_debate_card from rpc-schemas
 *   2. SCHEMA-OK   — create_debate_card schema validates success response { success, id }
 *   3. SCHEMA-ERR  — create_debate_card schema validates error-only response { error }
 *   4. FEED-RPC    — loadGroupFeed calls safeRpc('get_unified_feed', { p_limit: 50, p_category: groupId })
 *   5. FEED-EMPTY  — empty data renders empty-state into #detail-feed
 *   6. POST-RPC    — postGroupCard calls safeRpc('create_debate_card', ..., create_debate_card schema)
 *   7. POST-NOOP   — postGroupCard with empty text makes no safeRpc call
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ── ARCH filter ───────────────────────────────────────────────────────────────
const SOURCE_PATH = path.resolve(__dirname, '../../src/pages/groups.feed.ts');
const source = fs.readFileSync(SOURCE_PATH, 'utf-8');
const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));

// ── mock state ────────────────────────────────────────────────────────────────
let mockSafeRpcFn: ReturnType<typeof vi.fn>;

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  })),
}));

describe('Seam #079 | groups.feed.ts → rpc-schemas', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    mockSafeRpcFn = vi.fn();

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: mockSafeRpcFn,
    }));

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;'),
      showToast: vi.fn(),
      ModeratorConfig: {
        escapeHTML: (s: string) => s,
      },
    }));

    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null,
    }));

    vi.doMock('../../src/pages/groups.utils.ts', () => ({
      renderEmpty: (_icon: string, title: string, _sub: string) =>
        `<div class="empty-state">${title}</div>`,
    }));

    vi.doMock('../../src/feed-card.ts', () => ({
      renderFeedCard: (c: unknown) => `<div class="feed-card">${JSON.stringify(c)}</div>`,
      renderFeedEmpty: () => '<div class="feed-empty">No debates yet</div>',
    }));

    // Set up minimal DOM
    document.body.innerHTML = '<div id="detail-feed"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC-1: ARCH ────────────────────────────────────────────────────────────
  it('TC-1 ARCH: groups.feed.ts imports create_debate_card from rpc-schemas', () => {
    const hasImport = importLines.some(
      l => l.includes('create_debate_card') && l.includes('rpc-schemas'),
    );
    expect(hasImport).toBe(true);
  });

  // ── TC-2: SCHEMA-OK ───────────────────────────────────────────────────────
  it('TC-2 SCHEMA: create_debate_card schema validates success response', async () => {
    const { create_debate_card } = await import('../../src/contracts/rpc-schemas.ts');

    const successResponse = { success: true, id: 'card-uuid-123' };
    const result = create_debate_card.safeParse(successResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
      expect(result.data.id).toBe('card-uuid-123');
    }
  });

  // ── TC-3: SCHEMA-ERR ──────────────────────────────────────────────────────
  it('TC-3 SCHEMA: create_debate_card schema validates error-only response', async () => {
    const { create_debate_card } = await import('../../src/contracts/rpc-schemas.ts');

    const errorResponse = { error: 'duplicate post' };
    const result = create_debate_card.safeParse(errorResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error).toBe('duplicate post');
    }
  });

  // ── TC-4: FEED-RPC ────────────────────────────────────────────────────────
  it('TC-4 FEED-RPC: loadGroupFeed calls safeRpc with get_unified_feed and correct params', async () => {
    mockSafeRpcFn.mockResolvedValue({ data: [], error: null });

    const mod = await import('../../src/pages/groups.feed.ts');
    await mod.loadGroupFeed('group-abc-123');

    expect(mockSafeRpcFn).toHaveBeenCalledWith(
      'get_unified_feed',
      { p_limit: 50, p_category: 'group-abc-123' },
    );
  });

  // ── TC-5: FEED-EMPTY ──────────────────────────────────────────────────────
  it('TC-5 FEED-EMPTY: empty data array renders empty-state into #detail-feed', async () => {
    mockSafeRpcFn.mockResolvedValue({ data: [], error: null });

    const mod = await import('../../src/pages/groups.feed.ts');
    await mod.loadGroupFeed('group-empty');

    const el = document.getElementById('detail-feed')!;
    expect(el.innerHTML).toContain('No posts yet');
  });

  // ── TC-6: POST-RPC ────────────────────────────────────────────────────────
  it('TC-6 POST-RPC: postGroupCard calls safeRpc("create_debate_card") with schema', async () => {
    // Need a logged-in user for postGroupCard to proceed past auth check
    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: { id: 'user-001', username: 'tester' },
    }));
    vi.resetModules();
    // Re-set up all mocks after resetModules
    mockSafeRpcFn = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          onAuthStateChange: vi.fn(),
          getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        },
        rpc: vi.fn(),
        channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
      })),
    }));
    vi.doMock('../../src/auth.ts', () => ({ safeRpc: mockSafeRpcFn }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => s,
      showToast: vi.fn(),
    }));
    vi.doMock('../../src/pages/groups.utils.ts', () => ({
      renderEmpty: (_i: string, t: string, _s: string) => `<div>${t}</div>`,
    }));
    vi.doMock('../../src/feed-card.ts', () => ({
      renderFeedCard: () => '',
      renderFeedEmpty: () => '',
    }));

    document.body.innerHTML = `
      <div id="detail-feed"></div>
      <textarea id="group-take-input">Hot take text here</textarea>
      <button id="group-take-post">POST</button>
      <span id="group-take-count">17/280</span>
    `;

    const mod = await import('../../src/pages/groups.feed.ts');
    await mod.postGroupCard('group-xyz-456');

    expect(mockSafeRpcFn).toHaveBeenCalledWith(
      'create_debate_card',
      { p_content: 'Hot take text here', p_category: 'group-xyz-456' },
      expect.objectContaining({ safeParse: expect.any(Function) }),
    );
  });

  // ── TC-7: POST-NOOP ───────────────────────────────────────────────────────
  it('TC-7 POST-NOOP: postGroupCard with empty text makes no safeRpc call', async () => {
    mockSafeRpcFn.mockResolvedValue({ data: null, error: null });

    document.body.innerHTML = `
      <div id="detail-feed"></div>
      <textarea id="group-take-input">   </textarea>
      <button id="group-take-post">POST</button>
      <span id="group-take-count">3/280</span>
    `;

    const mod = await import('../../src/pages/groups.feed.ts');
    await mod.postGroupCard('group-noop');

    // Empty/whitespace-only text => early return, no RPC call
    expect(mockSafeRpcFn).not.toHaveBeenCalledWith(
      'create_debate_card',
      expect.anything(),
      expect.anything(),
    );
    await vi.advanceTimersByTimeAsync(2000);
  });
});
