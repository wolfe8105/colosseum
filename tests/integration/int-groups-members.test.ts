import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, auth: mockAuth })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMembers(roles: string[]) {
  return roles.map((role, i) => ({
    user_id: `user-${i}`,
    username: `user${i}`,
    display_name: `User ${i}`,
    role,
    elo_rating: 1000,
    wins: 0,
    losses: 0,
    avatar_url: null,
  }));
}

// ── ARCH filter ───────────────────────────────────────────────────────────────

describe('ARCH — groups.members.ts import surface', () => {
  it('only imports from allowed modules', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.members.ts'),
      'utf8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const banned = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of importLines) {
      for (const b of banned) {
        expect(line, `banned import "${b}" found`).not.toContain(b);
      }
    }
    // Must import currentUser and callerRole from groups.state
    expect(importLines.some(l => l.includes('groups.state'))).toBe(true);
  });
});

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockAuth.getSession.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  // Minimal DOM: the one element loadGroupMembers reads/writes
  document.body.innerHTML = '<div id="detail-members-list"></div>';
});

// ── TC1: guest user — canAct always false ────────────────────────────────────

describe('TC1 — guest user (currentUser=null) → no MANAGE button for any member', () => {
  it('renders member rows without MANAGE button when not authenticated', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser(null);
    state.setCallerRole('leader');

    mockRpc.mockResolvedValue({ data: makeMembers(['member', 'elder']), error: null });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc');

    const list = document.getElementById('detail-members-list')!;
    expect(list.querySelectorAll('[data-action="open-modal"]').length).toBe(0);
  });
});

// ── TC2: leader acts on member → MANAGE shown ────────────────────────────────

describe('TC2 — leader callerRole → MANAGE button visible for member targets', () => {
  it('renders MANAGE button for member rows when callerRole is leader', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole('leader'); // rank 1

    mockRpc.mockResolvedValue({ data: makeMembers(['member']), error: null }); // rank 4

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc');

    const list = document.getElementById('detail-members-list')!;
    expect(list.querySelectorAll('[data-action="open-modal"]').length).toBe(1);
  });
});

// ── TC3: same-rank — member cannot act on member ────────────────────────────

describe('TC3 — callerRole member → no MANAGE for another member (equal rank)', () => {
  it('does not render MANAGE button when caller and target share the same role rank', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole('member'); // rank 4

    mockRpc.mockResolvedValue({ data: makeMembers(['member']), error: null }); // rank 4

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc');

    const list = document.getElementById('detail-members-list')!;
    expect(list.querySelectorAll('[data-action="open-modal"]').length).toBe(0);
  });
});

// ── TC4: member cannot act on elder (higher rank) ────────────────────────────

describe('TC4 — callerRole member → no MANAGE for elder (higher authority)', () => {
  it('does not render MANAGE button when target outranks caller', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole('member'); // rank 4

    mockRpc.mockResolvedValue({ data: makeMembers(['elder']), error: null }); // rank 3

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc');

    const list = document.getElementById('detail-members-list')!;
    expect(list.querySelectorAll('[data-action="open-modal"]').length).toBe(0);
  });
});

// ── TC5: RPC error → error empty state rendered, no crash ────────────────────

describe('TC5 — RPC error → error empty state shown, no crash', () => {
  it('renders error empty state when RPC returns an error', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser(null);
    state.setCallerRole(null);

    mockRpc.mockResolvedValue({ data: null, error: new Error('db failure') });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc');

    const list = document.getElementById('detail-members-list')!;
    // renderEmpty produces a non-empty string; the element innerHTML is not blank
    expect(list.innerHTML.length).toBeGreaterThan(0);
  });
});

// ── TC6: empty members array → empty state rendered ─────────────────────────

describe('TC6 — empty members array → empty state shown', () => {
  it('renders empty state when RPC returns an empty array', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser(null);
    state.setCallerRole(null);

    mockRpc.mockResolvedValue({ data: [], error: null });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc');

    const list = document.getElementById('detail-members-list')!;
    expect(list.innerHTML.length).toBeGreaterThan(0);
    expect(list.querySelectorAll('.member-row').length).toBe(0);
  });
});

// ── TC7: admin acts on member → MANAGE shown ─────────────────────────────────

describe('TC7 — co_leader callerRole → MANAGE button visible for member target', () => {
  it('renders MANAGE button when co_leader (rank 2) acts on member (rank 4)', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole('co_leader'); // rank 2

    mockRpc.mockResolvedValue({ data: makeMembers(['member']), error: null }); // rank 4

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc');

    const list = document.getElementById('detail-members-list')!;
    expect(list.querySelectorAll('[data-action="open-modal"]').length).toBe(1);
  });
});
