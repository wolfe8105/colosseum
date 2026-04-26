/**
 * Integration tests — src/pages/groups.challenges.ts → groups.utils
 * Seam #298
 *
 * Covers the specific seam between groups.challenges and groups.utils:
 *   - renderEmpty() used for empty and error states in loadGroupChallenges
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    auth: mockAuth,
    from: mockFrom,
  })),
}));

// ── ARCH filter ───────────────────────────────────────────────────────────────

describe('ARCH — groups.challenges.ts → groups.utils import surface (seam #298)', () => {
  it('imports renderEmpty from groups.utils', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.challenges.ts'),
      'utf8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const utilsImport = importLines.find(l => l.includes('groups.utils'));
    expect(utilsImport).toBeDefined();
    expect(utilsImport).toContain('renderEmpty');
  });

  it('has no forbidden imports', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.challenges.ts'),
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
  });
});

// ── DOM scaffold ──────────────────────────────────────────────────────────────

function buildDOM() {
  document.body.innerHTML = `
    <div id="gvg-modal"></div>
    <input id="gvg-opponent-search" type="text" />
    <div id="gvg-opponent-results"></div>
    <div id="gvg-selected-opponent" style="display:none;"></div>
    <input id="gvg-topic" type="text" />
    <div id="gvg-error" style="display:none;"></div>
    <button class="gvg-format-pill active" data-format="1v1">1v1</button>
    <button class="gvg-format-pill" data-format="3v3">3v3</button>
    <button id="gvg-submit-btn">SEND CHALLENGE</button>
    <select id="gvg-category"><option value="general">General</option></select>
    <div id="detail-challenges"></div>
  `;
}

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  buildDOM();
  mockRpc.mockReset();
  mockFrom.mockReset();
});

// ── TC1: renderEmpty — called with member-join sub when not a member ───────────

describe('TC1 — seam #298: renderEmpty called with join-prompt sub when isMember=false', () => {
  it('renders empty-state with join text when isMember is false and challenges is empty', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const state = await import('../../src/pages/groups.state.ts');
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);
    state.setCurrentGroupId('group-abc');
    state.setIsMember(false);

    const { loadGroupChallenges } = await import('../../src/pages/groups.challenges.ts');
    await loadGroupChallenges('group-abc');

    const container = document.getElementById('detail-challenges')!;
    expect(container.querySelector('.empty-state')).not.toBeNull();
    expect(container.innerHTML).toContain('No challenges yet');
    expect(container.innerHTML).toContain('Join this group to send challenges');
  });
});

// ── TC2: renderEmpty — called with member prompt when isMember=true ───────────

describe('TC2 — seam #298: renderEmpty called with challenge-prompt sub when isMember=true', () => {
  it('renders empty-state with challenge text when isMember is true and challenges empty', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const state = await import('../../src/pages/groups.state.ts');
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);
    state.setCurrentGroupId('group-abc');
    state.setIsMember(true);

    const { loadGroupChallenges } = await import('../../src/pages/groups.challenges.ts');
    await loadGroupChallenges('group-abc');

    const container = document.getElementById('detail-challenges')!;
    expect(container.querySelector('.empty-state')).not.toBeNull();
    expect(container.innerHTML).toContain('Challenge another group to get started');
  });
});

// ── TC3: renderEmpty — called on RPC error ────────────────────────────────────

describe('TC3 — seam #298: renderEmpty called on RPC error in loadGroupChallenges', () => {
  it('renders empty-state with error message when RPC throws', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('db error') });

    const state = await import('../../src/pages/groups.state.ts');
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);
    state.setCurrentGroupId('group-abc');

    const { loadGroupChallenges } = await import('../../src/pages/groups.challenges.ts');
    await loadGroupChallenges('group-abc');

    const container = document.getElementById('detail-challenges')!;
    expect(container.querySelector('.empty-state')).not.toBeNull();
    expect(container.innerHTML).toContain('Could not load challenges');
  });
});

// ── TC4: get_group_challenges RPC called with correct params ──────────────────

describe('TC4 — seam #298: loadGroupChallenges calls get_group_challenges with correct params', () => {
  it('calls safeRpc(get_group_challenges, {p_group_id, p_limit: 10})', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const state = await import('../../src/pages/groups.state.ts');
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);
    state.setCurrentGroupId('group-xyz');
    state.setIsMember(false);

    const { loadGroupChallenges } = await import('../../src/pages/groups.challenges.ts');
    await loadGroupChallenges('group-xyz');

    expect(mockRpc).toHaveBeenCalledWith(
      'get_group_challenges',
      { p_group_id: 'group-xyz', p_limit: 10 },
    );
  });
});

// ── TC5: renderEmpty — detail-challenges container absent → no crash ──────────

describe('TC5 — seam #298: loadGroupChallenges returns early when container absent', () => {
  it('does not throw when #detail-challenges element is missing from DOM', async () => {
    document.getElementById('detail-challenges')!.remove();

    const state = await import('../../src/pages/groups.state.ts');
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);
    state.setCurrentGroupId('group-abc');

    const { loadGroupChallenges } = await import('../../src/pages/groups.challenges.ts');
    await expect(loadGroupChallenges('group-abc')).resolves.not.toThrow();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ── TC6: renderEmpty — escapes icon/title content ────────────────────────────

describe('TC6 — seam #298: renderEmpty output structure contains empty-icon and empty-title', () => {
  it('rendered empty-state has .empty-icon and .empty-title child elements', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const state = await import('../../src/pages/groups.state.ts');
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);
    state.setCurrentGroupId('group-abc');
    state.setIsMember(false);

    const { loadGroupChallenges } = await import('../../src/pages/groups.challenges.ts');
    await loadGroupChallenges('group-abc');

    const container = document.getElementById('detail-challenges')!;
    expect(container.querySelector('.empty-icon')).not.toBeNull();
    expect(container.querySelector('.empty-title')).not.toBeNull();
  });
});

// ── TC7: challenge cards rendered when RPC returns data ──────────────────────

describe('TC7 — seam #298: loadGroupChallenges renders challenge-card elements (no renderEmpty)', () => {
  it('renders .challenge-card elements when RPC returns challenges — renderEmpty NOT called', async () => {
    const fakeChallenges = [
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        challenger_group_id: 'group-abc',
        defender_group_id: 'group-xyz',
        challenger_name: 'Team Alfa',
        defender_name: 'Team Bravo',
        challenger_emoji: '🔥',
        defender_emoji: '⚡',
        challenger_elo: 1200,
        defender_elo: 1100,
        status: 'pending',
        topic: 'Should term limits exist?',
        format: '1v1',
        winner_group_id: null,
      },
    ];
    mockRpc.mockResolvedValue({ data: fakeChallenges, error: null });

    const state = await import('../../src/pages/groups.state.ts');
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);
    state.setCurrentGroupId('group-abc');

    const { loadGroupChallenges } = await import('../../src/pages/groups.challenges.ts');
    await loadGroupChallenges('group-abc');

    const container = document.getElementById('detail-challenges')!;
    expect(container.querySelectorAll('.challenge-card').length).toBe(1);
    expect(container.querySelector('.empty-state')).toBeNull();
    expect(container.innerHTML).toContain('Team Bravo');
  });
});
