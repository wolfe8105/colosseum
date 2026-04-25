/**
 * Integration tests — src/pages/groups.detail.ts → rpc-schemas
 * Seam #080
 *
 * TCs:
 *   1. ARCH         — groups.detail.ts imports get_group_details from rpc-schemas
 *   2. SCHEMA-VALID — get_group_details schema accepts a full valid group object
 *   3. SCHEMA-REQ-ID   — get_group_details schema rejects missing `id`
 *   4. SCHEMA-REQ-NAME — get_group_details schema rejects missing `name`
 *   5. SCHEMA-OPTIONAL — get_group_details accepts all optional fields populated
 *   6. SCHEMA-JOIN-MODE — join_mode enum accepts valid values, rejects invalid
 *   7. SCHEMA-PASSTHROUGH — get_group_details passes through unknown fields
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ── ARCH filter ──────────────────────────────────────────────────────────────
const SOURCE_PATH = path.resolve(__dirname, '../../src/pages/groups.detail.ts');
const source = fs.readFileSync(SOURCE_PATH, 'utf-8');
const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));

// ── Supabase mock (mandatory, only this) ─────────────────────────────────────
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

// ── mock state ───────────────────────────────────────────────────────────────
let mockSafeRpcFn: ReturnType<typeof vi.fn>;

describe('Seam #080 | groups.detail.ts → rpc-schemas', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    mockSafeRpcFn = vi.fn();

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: mockSafeRpcFn,
      currentUser: null,
    }));

    vi.doMock('../../src/config.ts', () => ({
      showToast: vi.fn(),
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

    vi.doMock('../../src/pages/group-banner.ts', () => ({
      renderGroupBanner: vi.fn(),
    }));

    vi.doMock('../../src/pages/groups.feed.ts', () => ({
      loadGroupHotTakes: vi.fn(),
    }));

    vi.doMock('../../src/pages/groups.members.ts', () => ({
      loadGroupMembers: vi.fn(),
    }));

    vi.doMock('../../src/pages/groups.challenges.ts', () => ({
      loadGroupChallenges: vi.fn(),
    }));

    vi.doMock('../../src/pages/groups.auditions.ts', () => ({
      loadPendingAuditions: vi.fn(),
    }));

    vi.doMock('../../src/pages/groups.state.ts', () => ({
      currentUser: null,
      currentGroupId: 'group-123',
      isMember: false,
      callerRole: null,
      setCurrentGroupId: vi.fn(),
      setIsMember: vi.fn(),
      setCallerRole: vi.fn(),
    }));

    vi.doMock('../../src/pages/groups.nav.ts', () => ({
      switchDetailTab: vi.fn(),
    }));

    // Set up minimal DOM
    document.body.innerHTML = `
      <div id="view-lobby"></div>
      <div id="view-detail" style="display:none"></div>
      <div id="detail-name"></div>
      <div id="detail-emoji"></div>
      <div id="detail-desc"></div>
      <div id="detail-members"></div>
      <div id="detail-elo"></div>
      <div id="detail-feed"></div>
      <div id="detail-challenges"></div>
      <div id="detail-members-list"></div>
      <div id="detail-top-name"></div>
      <div id="detail-banner"></div>
      <div id="detail-fate"></div>
      <button id="gvg-challenge-btn" style="display:none"></button>
      <button id="detail-gear-btn"></button>
      <div id="detail-auditions-tab" style="display:none"></div>
      <button id="join-btn"></button>
    `;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── TC-1: ARCH ────────────────────────────────────────────────────────────
  it('TC-1 ARCH: groups.detail.ts imports get_group_details from rpc-schemas', () => {
    const hasImport = importLines.some(
      l => l.includes('get_group_details') && l.includes('rpc-schemas'),
    );
    expect(hasImport).toBe(true);
  });

  // ── TC-2: SCHEMA-VALID ────────────────────────────────────────────────────
  it('TC-2 SCHEMA-VALID: get_group_details schema accepts a valid group object', async () => {
    const { get_group_details } = await import('../../src/contracts/rpc-schemas.ts');

    const valid = {
      id: 'group-uuid-001',
      name: 'The Debaters',
    };
    const result = get_group_details.safeParse(valid);
    expect(result.success).toBe(true);
  });

  // ── TC-3: SCHEMA-REQ-ID ───────────────────────────────────────────────────
  it('TC-3 SCHEMA-REQ-ID: get_group_details schema rejects missing id', async () => {
    const { get_group_details } = await import('../../src/contracts/rpc-schemas.ts');

    const missing_id = { name: 'No Id Group' };
    const result = get_group_details.safeParse(missing_id);
    expect(result.success).toBe(false);
  });

  // ── TC-4: SCHEMA-REQ-NAME ─────────────────────────────────────────────────
  it('TC-4 SCHEMA-REQ-NAME: get_group_details schema rejects missing name', async () => {
    const { get_group_details } = await import('../../src/contracts/rpc-schemas.ts');

    const missing_name = { id: 'group-uuid-002' };
    const result = get_group_details.safeParse(missing_name);
    expect(result.success).toBe(false);
  });

  // ── TC-5: SCHEMA-OPTIONAL ─────────────────────────────────────────────────
  it('TC-5 SCHEMA-OPTIONAL: get_group_details accepts all optional fields populated', async () => {
    const { get_group_details } = await import('../../src/contracts/rpc-schemas.ts');

    const full = {
      id: 'group-uuid-003',
      name: 'Full Group',
      avatar_emoji: '⚔️',
      description: 'A test group',
      category: 'general',
      member_count: 42,
      elo_rating: 1400,
      role: 'member',
      rank: 3,
      is_member: true,
      my_role: 'co_leader',
      slug: 'full-group',
      owner_id: 'owner-uuid',
      is_public: true,
      created_at: '2025-01-01T00:00:00Z',
      join_mode: 'open' as const,
      entry_requirements: { min_elo: 1000 },
      audition_config: { rule: 'debate', locked_topic: null },
      gvg_wins: 5,
      gvg_losses: 2,
      banner_tier: 1 as const,
      banner_static_url: null,
      banner_animated_url: null,
      shared_fate_pct: 10,
    };
    const result = get_group_details.safeParse(full);
    expect(result.success).toBe(true);
  });

  // ── TC-6: SCHEMA-JOIN-MODE ────────────────────────────────────────────────
  it('TC-6 SCHEMA-JOIN-MODE: join_mode enum accepts valid values, rejects invalid', async () => {
    const { get_group_details } = await import('../../src/contracts/rpc-schemas.ts');

    const validModes = ['open', 'requirements', 'audition', 'invite_only'] as const;
    for (const mode of validModes) {
      const result = get_group_details.safeParse({ id: 'g', name: 'G', join_mode: mode });
      expect(result.success).toBe(true);
    }

    const badResult = get_group_details.safeParse({ id: 'g', name: 'G', join_mode: 'free_for_all' });
    expect(badResult.success).toBe(false);
  });

  // ── TC-7: SCHEMA-PASSTHROUGH ──────────────────────────────────────────────
  it('TC-7 SCHEMA-PASSTHROUGH: get_group_details passes through unknown fields', async () => {
    const { get_group_details } = await import('../../src/contracts/rpc-schemas.ts');

    const withExtra = {
      id: 'group-uuid-004',
      name: 'Passthrough Test',
      some_future_field: 'extra_value',
      nested_unknown: { foo: 'bar' },
    };
    const result = get_group_details.safeParse(withExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).some_future_field).toBe('extra_value');
    }
  });
});
