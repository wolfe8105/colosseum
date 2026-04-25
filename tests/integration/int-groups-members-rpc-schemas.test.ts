/**
 * Integration tests — src/pages/groups.members.ts → rpc-schemas
 * Seam #067
 *
 * TCs:
 *   1. ARCH   — groups.members.ts imports get_group_members from rpc-schemas
 *   2. RPC-NAME  — safeRpc called with 'get_group_members'
 *   3. PARAMS    — safeRpc called with { p_group_id, p_limit: 50 }
 *   4. SCHEMA    — get_group_members schema validates array with user_id + role
 *   5. EMPTY     — empty array response → empty-state HTML in #detail-members-list
 *   6. RENDER    — member data rendered into #detail-members-list
 *   7. ERROR     — RPC error → error fallback HTML in #detail-members-list
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ── ARCH filter ──────────────────────────────────────────────────────────────
const SOURCE_PATH = path.resolve(__dirname, '../../src/pages/groups.members.ts');
const source = fs.readFileSync(SOURCE_PATH, 'utf-8');
const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));

// ── mock state ───────────────────────────────────────────────────────────────
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

describe('Seam #067 | groups.members.ts → rpc-schemas', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    mockSafeRpcFn = vi.fn();

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: mockSafeRpcFn,
      currentUser: null,
    }));

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;'),
      ModeratorConfig: {
        escapeHTML: (s: string) => s,
      },
    }));

    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null,
      callerRole: 'member',
    }));

    vi.doMock('../../src/pages/groups.utils.ts', () => ({
      clientRoleRank: (role: string) => {
        const map: Record<string, number> = { owner: 0, admin: 1, moderator: 2, member: 3 };
        return map[role] ?? 99;
      },
      renderEmpty: (_icon: string, title: string, _sub: string) =>
        `<div class="empty-state">${title}</div>`,
    }));

    vi.doMock('../../src/pages/groups.members.modal.ts', () => ({
      openMemberActionsModal: vi.fn(),
      setGroupOpenCallback: vi.fn(),
      setRefreshMembersCallback: vi.fn(),
    }));

    vi.doMock('../../src/pages/groups.members.modal.html.ts', () => ({
      _injectMemberActionsModal: vi.fn(),
    }));

    // Set up a minimal DOM
    document.body.innerHTML = '<div id="detail-members-list"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC-1: ARCH ────────────────────────────────────────────────────────────
  it('TC-1 ARCH: groups.members.ts imports get_group_members from rpc-schemas', () => {
    const hasImport = importLines.some(
      l => l.includes('get_group_members') && l.includes('rpc-schemas'),
    );
    expect(hasImport).toBe(true);
  });

  // ── TC-2: RPC-NAME ────────────────────────────────────────────────────────
  it('TC-2 RPC-NAME: safeRpc is called with "get_group_members"', async () => {
    mockSafeRpcFn.mockResolvedValue({ data: [], error: null });

    const mod = await import('../../src/pages/groups.members.ts');
    await mod.loadGroupMembers('group-abc');

    expect(mockSafeRpcFn).toHaveBeenCalledWith(
      'get_group_members',
      expect.any(Object),
      expect.anything(),
    );
  });

  // ── TC-3: PARAMS ──────────────────────────────────────────────────────────
  it('TC-3 PARAMS: safeRpc receives { p_group_id, p_limit: 50 }', async () => {
    mockSafeRpcFn.mockResolvedValue({ data: [], error: null });

    const mod = await import('../../src/pages/groups.members.ts');
    await mod.loadGroupMembers('group-xyz');

    expect(mockSafeRpcFn).toHaveBeenCalledWith(
      'get_group_members',
      { p_group_id: 'group-xyz', p_limit: 50 },
      expect.anything(),
    );
  });

  // ── TC-4: SCHEMA-SHAPE ────────────────────────────────────────────────────
  it('TC-4 SCHEMA: get_group_members schema validates array with user_id and role', async () => {
    const { get_group_members } = await import('../../src/contracts/rpc-schemas.ts');

    const valid = [
      { user_id: 'uuid-1', role: 'member', username: 'alice', elo_rating: 1200, wins: 5, losses: 2 },
      { user_id: 'uuid-2', role: 'admin', username: 'bob' },
    ];
    const result = get_group_members.safeParse(valid);
    expect(result.success).toBe(true);

    // missing user_id should fail
    const invalid = [{ role: 'member' }];
    const bad = get_group_members.safeParse(invalid);
    expect(bad.success).toBe(false);
  });

  // ── TC-5: EMPTY ───────────────────────────────────────────────────────────
  it('TC-5 EMPTY: empty array response renders empty-state into #detail-members-list', async () => {
    mockSafeRpcFn.mockResolvedValue({ data: [], error: null });

    const mod = await import('../../src/pages/groups.members.ts');
    await mod.loadGroupMembers('group-empty');

    const el = document.getElementById('detail-members-list')!;
    expect(el.innerHTML).toContain('No members yet');
  });

  // ── TC-6: RENDER ──────────────────────────────────────────────────────────
  it('TC-6 RENDER: member data rendered into #detail-members-list', async () => {
    const members = [
      {
        user_id: 'uuid-1',
        role: 'member',
        username: 'alice',
        display_name: 'Alice',
        avatar_url: null,
        elo_rating: 1350,
        wins: 10,
        losses: 3,
        level: 5,
      },
    ];
    mockSafeRpcFn.mockResolvedValue({ data: members, error: null });

    const mod = await import('../../src/pages/groups.members.ts');
    await mod.loadGroupMembers('group-full');

    const el = document.getElementById('detail-members-list')!;
    expect(el.innerHTML).toContain('Alice');
    expect(el.innerHTML).toContain('1350');
  });

  // ── TC-7: ERROR ───────────────────────────────────────────────────────────
  it('TC-7 ERROR: RPC error renders error fallback into #detail-members-list', async () => {
    mockSafeRpcFn.mockResolvedValue({ data: null, error: new Error('db error') });

    const mod = await import('../../src/pages/groups.members.ts');
    await mod.loadGroupMembers('group-err');

    const el = document.getElementById('detail-members-list')!;
    expect(el.innerHTML).toContain('Could not load members');
  });
});
