/**
 * Integration tests — src/pages/groups.ts → groups.state
 * Seam #170
 *
 * Covers:
 *  - groups.state initial default values
 *  - setSb / setCurrentUser setters mutate state
 *  - setCurrentGroupId / currentGroupId round-trip
 *  - setIsMember / isMember toggle
 *  - setCallerRole / callerRole mutation
 *  - CATEGORY_LABELS constant shape
 *  - All remaining setters (activeTab, activeDetailTab, activeCategory, selectedEmoji)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ARCH filter — imports in source files
const SOURCE_FILES = [
  'src/pages/groups.ts',
  'src/pages/groups.state.ts',
];

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

vi.mock('../../src/config.ts', () => ({
  escapeHTML: (s: string) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;'),
  ModeratorConfig: {
    escapeHTML: (s: string) => s,
    supabaseUrl: 'https://fake.supabase.co',
    supabaseAnonKey: 'fake-key',
  },
  showToast: vi.fn(),
  friendlyError: vi.fn((e: unknown) => String(e)),
}));

// ── types ─────────────────────────────────────────────────────────────────────
type GroupsState = typeof import('../../src/pages/groups.state.ts');

let state: GroupsState;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();
  state = await import('../../src/pages/groups.state.ts');
});

// ── ARCH filter smoke test ────────────────────────────────────────────────────
describe('ARCH: import lines in source files', () => {
  it('groups.state.ts has no wall-condition imports', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/pages/groups.state.ts', 'utf8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const forbidden = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of importLines) {
      for (const f of forbidden) {
        expect(line).not.toContain(f);
      }
    }
  });

  it('groups.ts imports setSb, setCurrentUser, currentGroupId from groups.state', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/pages/groups.ts', 'utf8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const stateImportLine = importLines.find(l => l.includes('groups.state'));
    expect(stateImportLine).toBeDefined();
    expect(stateImportLine).toContain('setSb');
    expect(stateImportLine).toContain('setCurrentUser');
    expect(stateImportLine).toContain('currentGroupId');
  });
});

// ── TC-1: Initial default values ─────────────────────────────────────────────
describe('groups.state — initial default values', () => {
  it('sb and currentUser start as null', () => {
    expect(state.sb).toBeNull();
    expect(state.currentUser).toBeNull();
  });

  it('activeTab defaults to "discover"', () => {
    expect(state.activeTab).toBe('discover');
  });

  it('activeDetailTab defaults to "feed"', () => {
    expect(state.activeDetailTab).toBe('feed');
  });

  it('activeCategory defaults to null', () => {
    expect(state.activeCategory).toBeNull();
  });

  it('selectedEmoji defaults to ⚔️', () => {
    expect(state.selectedEmoji).toBe('⚔️');
  });

  it('currentGroupId defaults to null', () => {
    expect(state.currentGroupId).toBeNull();
  });

  it('isMember defaults to false', () => {
    expect(state.isMember).toBe(false);
  });

  it('callerRole defaults to null', () => {
    expect(state.callerRole).toBeNull();
  });
});

// ── TC-2: setSb setter ────────────────────────────────────────────────────────
describe('setSb', () => {
  it('stores the Supabase client in state.sb', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const fakeSb = createClient('https://x.supabase.co', 'key') as any;
    state.setSb(fakeSb);
    expect(state.sb).toBe(fakeSb);
  });

  it('accepts null to reset state.sb', () => {
    state.setSb(null);
    expect(state.sb).toBeNull();
  });
});

// ── TC-3: setCurrentUser setter ───────────────────────────────────────────────
describe('setCurrentUser', () => {
  it('stores a user object in state.currentUser', () => {
    const fakeUser = { id: 'user-abc', email: 'test@example.com' } as any;
    state.setCurrentUser(fakeUser);
    expect(state.currentUser).toBe(fakeUser);
  });

  it('accepts null to reset state.currentUser', () => {
    state.setCurrentUser(null);
    expect(state.currentUser).toBeNull();
  });
});

// ── TC-4: setCurrentGroupId / currentGroupId round-trip ──────────────────────
describe('setCurrentGroupId', () => {
  it('stores a valid UUID string in currentGroupId', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    state.setCurrentGroupId(uuid);
    expect(state.currentGroupId).toBe(uuid);
  });

  it('accepts null to clear the current group', () => {
    state.setCurrentGroupId('some-id');
    state.setCurrentGroupId(null);
    expect(state.currentGroupId).toBeNull();
  });
});

// ── TC-5: setIsMember ─────────────────────────────────────────────────────────
describe('setIsMember', () => {
  it('sets isMember to true', () => {
    state.setIsMember(true);
    expect(state.isMember).toBe(true);
  });

  it('sets isMember back to false', () => {
    state.setIsMember(true);
    state.setIsMember(false);
    expect(state.isMember).toBe(false);
  });
});

// ── TC-6: setCallerRole ───────────────────────────────────────────────────────
describe('setCallerRole', () => {
  it('stores "leader" role in callerRole', () => {
    state.setCallerRole('leader');
    expect(state.callerRole).toBe('leader');
  });

  it('stores "co_leader" role in callerRole', () => {
    state.setCallerRole('co_leader');
    expect(state.callerRole).toBe('co_leader');
  });

  it('accepts null to clear callerRole', () => {
    state.setCallerRole('elder');
    state.setCallerRole(null);
    expect(state.callerRole).toBeNull();
  });
});

// ── TC-7: CATEGORY_LABELS constant ───────────────────────────────────────────
describe('CATEGORY_LABELS', () => {
  it('has exactly 6 category keys', () => {
    expect(Object.keys(state.CATEGORY_LABELS)).toHaveLength(6);
  });

  it('maps all expected category keys to display strings', () => {
    expect(state.CATEGORY_LABELS['general']).toBe('General');
    expect(state.CATEGORY_LABELS['politics']).toBe('🏛️ Politics');
    expect(state.CATEGORY_LABELS['sports']).toBe('🏆 Sports');
    expect(state.CATEGORY_LABELS['entertainment']).toBe('🎬 Entertainment');
    expect(state.CATEGORY_LABELS['music']).toBe('🎵 Music');
    expect(state.CATEGORY_LABELS['couples_court']).toBe('💔 Couples Court');
  });

  it('CATEGORY_LABELS is a plain object (Record<string,string>)', () => {
    const labels = state.CATEGORY_LABELS;
    for (const val of Object.values(labels)) {
      expect(typeof val).toBe('string');
    }
  });
});

// ── TC-8: Remaining setters ───────────────────────────────────────────────────
describe('remaining setters — activeTab, activeDetailTab, activeCategory, selectedEmoji', () => {
  it('setActiveTab mutates activeTab', () => {
    state.setActiveTab('my-groups');
    expect(state.activeTab).toBe('my-groups');
  });

  it('setActiveDetailTab mutates activeDetailTab', () => {
    state.setActiveDetailTab('members');
    expect(state.activeDetailTab).toBe('members');
  });

  it('setActiveCategory stores a category string', () => {
    state.setActiveCategory('politics');
    expect(state.activeCategory).toBe('politics');
  });

  it('setActiveCategory accepts null to clear filter', () => {
    state.setActiveCategory('sports');
    state.setActiveCategory(null);
    expect(state.activeCategory).toBeNull();
  });

  it('setSelectedEmoji stores an emoji string', () => {
    state.setSelectedEmoji('🔥');
    expect(state.selectedEmoji).toBe('🔥');
  });
});
