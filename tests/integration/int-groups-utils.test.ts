/**
 * Integration tests — src/pages/groups.utils.ts → groups.state
 * Seam #124
 *
 * Covers:
 *  - CATEGORY_LABELS from groups.state consumed by renderGroupList
 *  - clientRoleRank, assignableRoles, roleLabel
 *  - renderEmpty
 *  - renderGroupList (empty state + card rendering + click handlers)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ARCH filter — imports in source files
const SOURCE_FILES = [
  'src/pages/groups.utils.ts',
  'src/pages/groups.state.ts',
];

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

// We also need to mock ../config.ts so escapeHTML is available without a browser env
vi.mock('../../src/config.ts', () => ({
  escapeHTML: (s: string) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;'),
  ModeratorConfig: { escapeHTML: (s: string) => s },
}));

// ── helpers ──────────────────────────────────────────────────────────────────

type GroupsUtils = typeof import('../../src/pages/groups.utils.ts');
type GroupsState = typeof import('../../src/pages/groups.state.ts');

let utils: GroupsUtils;
let state: GroupsState;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();
  utils = await import('../../src/pages/groups.utils.ts');
  state = await import('../../src/pages/groups.state.ts');
});

// ── ARCH filter smoke test ────────────────────────────────────────────────────
describe('ARCH: import lines in source files', () => {
  it('groups.utils.ts only imports from expected modules', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/pages/groups.utils.ts', 'utf8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const forbidden = ['webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics'];
    for (const line of importLines) {
      for (const f of forbidden) {
        expect(line).not.toContain(f);
      }
    }
    // Must import from groups.state
    expect(importLines.some(l => l.includes('groups.state'))).toBe(true);
  });
});

// ── TC-1: CATEGORY_LABELS ─────────────────────────────────────────────────────
describe('CATEGORY_LABELS (groups.state)', () => {
  it('has the expected 6 category keys with correct display strings', () => {
    const labels = state.CATEGORY_LABELS;
    expect(labels['general']).toBe('General');
    expect(labels['politics']).toBe('🏛️ Politics');
    expect(labels['sports']).toBe('🏆 Sports');
    expect(labels['entertainment']).toBe('🎬 Entertainment');
    expect(labels['music']).toBe('🎵 Music');
    expect(labels['couples_court']).toBe('💔 Couples Court');
    expect(Object.keys(labels)).toHaveLength(6);
  });
});

// ── TC-2: clientRoleRank ──────────────────────────────────────────────────────
describe('clientRoleRank', () => {
  it('maps roles to correct numeric ranks', () => {
    expect(utils.clientRoleRank('leader')).toBe(1);
    expect(utils.clientRoleRank('co_leader')).toBe(2);
    expect(utils.clientRoleRank('elder')).toBe(3);
    expect(utils.clientRoleRank('member')).toBe(4);
  });

  it('returns 99 for null and unknown roles', () => {
    expect(utils.clientRoleRank(null)).toBe(99);
    expect(utils.clientRoleRank('spectator')).toBe(99);
    expect(utils.clientRoleRank('')).toBe(99);
  });
});

// ── TC-3: assignableRoles ─────────────────────────────────────────────────────
describe('assignableRoles', () => {
  it('leader can assign all 4 roles', () => {
    const roles = utils.assignableRoles('leader');
    expect(roles).toEqual(['leader', 'co_leader', 'elder', 'member']);
  });

  it('co_leader can only assign elder and member', () => {
    expect(utils.assignableRoles('co_leader')).toEqual(['elder', 'member']);
  });

  it('member and unknown roles return empty array', () => {
    expect(utils.assignableRoles('member')).toEqual([]);
    expect(utils.assignableRoles('elder')).toEqual([]);
    expect(utils.assignableRoles('unknown')).toEqual([]);
  });
});

// ── TC-4: roleLabel ───────────────────────────────────────────────────────────
describe('roleLabel', () => {
  it('returns human-readable labels for known roles', () => {
    expect(utils.roleLabel('leader')).toBe('Leader');
    expect(utils.roleLabel('co_leader')).toBe('Co-Leader');
    expect(utils.roleLabel('elder')).toBe('Elder');
    expect(utils.roleLabel('member')).toBe('Member');
  });

  it('returns raw string for unknown roles', () => {
    expect(utils.roleLabel('spectator')).toBe('spectator');
    expect(utils.roleLabel('admin')).toBe('admin');
  });
});

// ── TC-5: renderEmpty ─────────────────────────────────────────────────────────
describe('renderEmpty', () => {
  it('contains icon, title, and sub when sub is non-empty', () => {
    const html = utils.renderEmpty('👥', 'No groups', 'Be first');
    expect(html).toContain('👥');
    expect(html).toContain('No groups');
    expect(html).toContain('Be first');
    expect(html).toContain('empty-state');
  });

  it('omits the sub element when sub is empty string', () => {
    const html = utils.renderEmpty('👥', 'Empty', '');
    expect(html).not.toContain('empty-sub');
  });
});

// ── TC-6: renderGroupList — empty state ──────────────────────────────────────
describe('renderGroupList — empty array', () => {
  it('renders empty-state markup in the container', () => {
    document.body.innerHTML = '<div id="test-container"></div>';
    utils.renderGroupList('test-container', [], false, false, vi.fn());
    const el = document.getElementById('test-container')!;
    expect(el.innerHTML).toContain('empty-state');
    expect(el.innerHTML).toContain('No groups here yet');
  });

  it('does nothing when container element does not exist', () => {
    // Should not throw
    expect(() => {
      utils.renderGroupList('nonexistent-id', [], false, false, vi.fn());
    }).not.toThrow();
  });
});

// ── TC-7: renderGroupList — card rendering and click handlers ─────────────────
describe('renderGroupList — card rendering', () => {
  const sampleGroups = [
    {
      id: 'group-uuid-1',
      name: 'The Debaters',
      description: 'Hot takes daily',
      avatar_emoji: '🔥',
      category: 'politics',
      member_count: 42,
      elo_rating: 1250,
      role: 'leader',
      rank: 1,
    },
    {
      id: 'group-uuid-2',
      name: 'Sports Fans',
      description: '',
      avatar_emoji: '⚽',
      category: 'sports',
      member_count: 10,
      elo_rating: 980,
      role: null,
      rank: 2,
    },
  ];

  it('renders a card for each group with name, member_count, elo', () => {
    document.body.innerHTML = '<div id="groups-list"></div>';
    utils.renderGroupList('groups-list', sampleGroups as any, false, false, vi.fn());
    const el = document.getElementById('groups-list')!;
    expect(el.querySelectorAll('.group-card')).toHaveLength(2);
    expect(el.innerHTML).toContain('The Debaters');
    expect(el.innerHTML).toContain('Sports Fans');
    expect(el.innerHTML).toContain('42');
    expect(el.innerHTML).toContain('1250');
  });

  it('uses CATEGORY_LABELS for known categories', () => {
    document.body.innerHTML = '<div id="groups-list2"></div>';
    utils.renderGroupList('groups-list2', sampleGroups as any, false, false, vi.fn());
    const el = document.getElementById('groups-list2')!;
    // politics maps to '🏛️ Politics'
    expect(el.innerHTML).toContain('Politics');
    // sports maps to '🏆 Sports'
    expect(el.innerHTML).toContain('Sports');
  });

  it('calls onGroupClick with correct group id on card click', () => {
    document.body.innerHTML = '<div id="click-test"></div>';
    const onGroupClick = vi.fn();
    utils.renderGroupList('click-test', sampleGroups as any, false, false, onGroupClick);
    const cards = document.querySelectorAll('#click-test .group-card');
    (cards[0] as HTMLElement).click();
    expect(onGroupClick).toHaveBeenCalledWith('group-uuid-1');
    (cards[1] as HTMLElement).click();
    expect(onGroupClick).toHaveBeenCalledWith('group-uuid-2');
  });

  it('shows role badge when showRole is true and role exists', () => {
    document.body.innerHTML = '<div id="role-test"></div>';
    utils.renderGroupList('role-test', sampleGroups as any, true, false, vi.fn());
    const el = document.getElementById('role-test')!;
    expect(el.innerHTML).toContain('my-role-badge');
    expect(el.innerHTML).toContain('LEADER');
  });

  it('shows rank when showRank is true', () => {
    document.body.innerHTML = '<div id="rank-test"></div>';
    utils.renderGroupList('rank-test', sampleGroups as any, false, true, vi.fn());
    const el = document.getElementById('rank-test')!;
    expect(el.innerHTML).toContain('elo-label');
    expect(el.innerHTML).toContain('#1');
  });
});
