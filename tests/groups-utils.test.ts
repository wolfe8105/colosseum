// ============================================================
// GROUPS UTILS — tests/groups-utils.test.ts
// Source: src/pages/groups.utils.ts
//
// CLASSIFICATION:
//   clientRoleRank()  — Pure calculation → Unit test
//   assignableRoles() — Pure calculation → Unit test
//   roleLabel()       — Pure calculation → Unit test
//   renderEmpty()     — HTML string builder (uses escapeHTML) → Snapshot test
//   renderGroupList() — DOM event wiring + HTML builder → Behavioral/Integration test
//
// IMPORTS:
//   import type { GroupListItem } from './groups.types.ts' — type-only
//   { escapeHTML }    from '../config.ts'
//   { CATEGORY_LABELS } from './groups.state.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));
const mockCategoryLabels = vi.hoisted(() => ({
  value: { general: 'General', politics: '🏛️ Politics', sports: '🏆 Sports' } as Record<string, string>,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  SUPABASE_URL: 'https://faomczmipsccwbhpivmp.supabase.co',
  SUPABASE_ANON_KEY: 'mock-key',
  UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
}));

vi.mock('../src/pages/groups.state.ts', () => ({
  get CATEGORY_LABELS() { return mockCategoryLabels.value; },
  sb: null,
  currentUser: null,
  activeTab: 'discover',
  setSb: vi.fn(),
}));

import {
  clientRoleRank,
  assignableRoles,
  roleLabel,
  renderEmpty,
  renderGroupList,
} from '../src/pages/groups.utils.ts';

beforeEach(() => {
  mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
  document.body.innerHTML = '';
});

// ── clientRoleRank ────────────────────────────────────────────

describe('TC1 — clientRoleRank: leader has rank 1', () => {
  it('returns 1 for leader', () => {
    expect(clientRoleRank('leader')).toBe(1);
  });
});

describe('TC2 — clientRoleRank: authority order leader < co_leader < elder < member', () => {
  it('roles rank in ascending order by authority', () => {
    expect(clientRoleRank('leader')).toBeLessThan(clientRoleRank('co_leader'));
    expect(clientRoleRank('co_leader')).toBeLessThan(clientRoleRank('elder'));
    expect(clientRoleRank('elder')).toBeLessThan(clientRoleRank('member'));
  });
});

describe('TC3 — clientRoleRank: unknown role returns 99', () => {
  it('returns 99 for non-member and null', () => {
    expect(clientRoleRank('guest')).toBe(99);
    expect(clientRoleRank(null)).toBe(99);
  });
});

// ── assignableRoles ───────────────────────────────────────────

describe('TC4 — assignableRoles: leader can assign all roles', () => {
  it('leader can assign leader, co_leader, elder, member', () => {
    const roles = assignableRoles('leader');
    expect(roles).toContain('leader');
    expect(roles).toContain('co_leader');
    expect(roles).toContain('elder');
    expect(roles).toContain('member');
  });
});

describe('TC5 — assignableRoles: co_leader can assign elder and member only', () => {
  it('co_leader cannot assign leader or co_leader', () => {
    const roles = assignableRoles('co_leader');
    expect(roles).toContain('elder');
    expect(roles).toContain('member');
    expect(roles).not.toContain('leader');
    expect(roles).not.toContain('co_leader');
  });
});

describe('TC6 — assignableRoles: member can assign nothing', () => {
  it('member and unknown roles return empty array', () => {
    expect(assignableRoles('member')).toHaveLength(0);
    expect(assignableRoles('elder')).toHaveLength(0);
    expect(assignableRoles('guest')).toHaveLength(0);
  });
});

// ── roleLabel ─────────────────────────────────────────────────

describe('TC7 — roleLabel: known roles return proper labels', () => {
  it('returns correct labels for all 4 roles', () => {
    expect(roleLabel('leader')).toBe('Leader');
    expect(roleLabel('co_leader')).toBe('Co-Leader');
    expect(roleLabel('elder')).toBe('Elder');
    expect(roleLabel('member')).toBe('Member');
  });
});

describe('TC8 — roleLabel: unknown role returns itself', () => {
  it('returns the raw role string for unknown roles', () => {
    expect(roleLabel('overlord')).toBe('overlord');
  });
});

// ── renderEmpty ───────────────────────────────────────────────

describe('TC9 — renderEmpty: contains icon, title, and sub text', () => {
  it('renders icon, title, and sub in the empty state', () => {
    const html = renderEmpty('👥', 'No groups', 'Be the first');
    expect(html).toContain('👥');
    expect(html).toContain('No groups');
    expect(html).toContain('Be the first');
  });
});

describe('TC10 — renderEmpty: uses escapeHTML for inputs (import contract)', () => {
  it('escapeHTML mock is called for icon, title, sub', () => {
    mockEscapeHTML.mockClear();
    renderEmpty('🔥', 'Title', 'Sub');
    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

describe('TC11 — renderEmpty: omits sub section when sub is empty', () => {
  it('does not include empty-sub div when sub is empty string', () => {
    const html = renderEmpty('📭', 'Empty', '');
    expect(html).not.toContain('empty-sub');
  });
});

// ── renderGroupList ───────────────────────────────────────────

describe('TC12 — renderGroupList: renders group cards into container', () => {
  it('populates the container with group cards', () => {
    const el = document.createElement('div');
    el.id = 'groups-container';
    document.body.appendChild(el);

    const groups = [
      {
        id: 'group-1',
        name: 'Debate Club',
        description: 'A place to debate',
        category: 'politics',
        member_count: 5,
        elo_rating: 1200,
        avatar_emoji: '⚔️',
        rank: 1,
      },
    ];

    renderGroupList('groups-container', groups, false, false, vi.fn());

    expect(el.innerHTML).toContain('group-1');
    expect(el.innerHTML).toContain('Debate Club');
  });
});

describe('TC13 — renderGroupList: empty groups shows empty state', () => {
  it('shows empty state when groups array is empty', () => {
    const el = document.createElement('div');
    el.id = 'groups-empty';
    document.body.appendChild(el);

    renderGroupList('groups-empty', [], false, false, vi.fn());

    expect(el.innerHTML).toContain('empty');
  });
});

describe('TC14 — renderGroupList: click triggers onGroupClick callback', () => {
  it('calls onGroupClick with groupId when card is clicked', () => {
    const el = document.createElement('div');
    el.id = 'groups-clickable';
    document.body.appendChild(el);

    const onGroupClick = vi.fn();
    const groups = [
      {
        id: 'group-click-test',
        name: 'Click Me',
        description: '',
        category: 'sports',
        member_count: 3,
        elo_rating: 1000,
        avatar_emoji: '⚽',
        rank: 1,
      },
    ];

    renderGroupList('groups-clickable', groups, false, false, onGroupClick);

    const card = el.querySelector('[data-group-id="group-click-test"]') as HTMLElement;
    expect(card).not.toBeNull();
    card.click();
    expect(onGroupClick).toHaveBeenCalledWith('group-click-test');
  });
});

describe('TC15 — renderGroupList: missing container is a no-op', () => {
  it('does not throw when containerId does not exist in DOM', () => {
    expect(() => {
      renderGroupList('nonexistent-container', [], false, false, vi.fn());
    }).not.toThrow();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/pages/groups.utils.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './groups.types.ts',
      '../config.ts',
      './groups.state.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/groups.utils.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
