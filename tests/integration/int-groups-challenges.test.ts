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

describe('ARCH — groups.challenges.ts import surface', () => {
  it('only imports from allowed modules', () => {
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
    // Must import state symbols from groups.state
    expect(importLines.some(l => l.includes('groups.state'))).toBe(true);
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
    <button id="gvg-submit-btn">SEND CHALLENGE ⚔️</button>
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

// ── TC1: openGvGModal redirects unauthenticated users ────────────────────────

describe('TC1 — openGvGModal() with no currentUser redirects to plinko', () => {
  it('sets window.location.href to plinko page when user is null', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser(null);
    state.setCurrentGroupId('group-abc');

    // Spy on location assignment
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
      pathname: '/moderator-groups.html',
    } as Location);
    let assignedHref = '';
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { assignedHref = v; } },
      writable: true,
    });

    const { openGvGModal } = await import('../../src/pages/groups.challenges.ts');
    openGvGModal();

    expect(assignedHref).toContain('moderator-plinko.html');
    locationSpy.mockRestore();
  });
});

// ── TC2: openGvGModal adds .open class when authenticated ────────────────────

describe('TC2 — openGvGModal() with currentUser opens the modal', () => {
  it('adds .open class to #gvg-modal and resets format to 1v1', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'user-123' } as import('@supabase/supabase-js').User);
    state.setCurrentGroupId('group-abc');

    // Remove active from 1v1, add to 3v3 to verify reset
    document.querySelector('.gvg-format-pill[data-format="1v1"]')!.classList.remove('active');
    document.querySelector('.gvg-format-pill[data-format="3v3"]')!.classList.add('active');

    const { openGvGModal } = await import('../../src/pages/groups.challenges.ts');
    openGvGModal();

    const modal = document.getElementById('gvg-modal')!;
    expect(modal.classList.contains('open')).toBe(true);
    // The 1v1 pill should be active again
    expect(document.querySelector('.gvg-format-pill[data-format="1v1"]')!.classList.contains('active')).toBe(true);
  });
});

// ── TC3: searchGroupsForChallenge clears container for short query ────────────

describe('TC3 — searchGroupsForChallenge() clears results when query < 2 chars', () => {
  it('clears #gvg-opponent-results and returns without calling supabase', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);

    const container = document.getElementById('gvg-opponent-results')!;
    container.innerHTML = '<div>previous result</div>';

    const { searchGroupsForChallenge } = await import('../../src/pages/groups.challenges.ts');
    await searchGroupsForChallenge('a');

    expect(container.innerHTML).toBe('');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ── TC4: searchGroupsForChallenge renders results from supabase ───────────────

describe('TC4 — searchGroupsForChallenge() renders group results', () => {
  it('calls sb.from("groups") and renders result cards', async () => {
    const fakeGroups = [
      { id: 'g1', name: 'Team Alpha', avatar_emoji: '🔥', group_elo: 1250, member_count: 10 },
      { id: 'g2', name: 'Team Beta',  avatar_emoji: '⚡', group_elo: 1100, member_count: 5  },
    ];

    const chainMock = {
      select:  vi.fn().mockReturnThis(),
      ilike:   vi.fn().mockReturnThis(),
      neq:     vi.fn().mockReturnThis(),
      order:   vi.fn().mockReturnThis(),
      limit:   vi.fn().mockResolvedValue({ data: fakeGroups, error: null }),
    };
    mockFrom.mockReturnValue(chainMock);

    const state = await import('../../src/pages/groups.state.ts');
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);
    state.setCurrentGroupId('group-abc');

    const { searchGroupsForChallenge } = await import('../../src/pages/groups.challenges.ts');
    await searchGroupsForChallenge('Team');

    expect(mockFrom).toHaveBeenCalledWith('groups');
    const container = document.getElementById('gvg-opponent-results')!;
    expect(container.querySelectorAll('.gvg-opponent-option').length).toBe(2);
    expect(container.innerHTML).toContain('Team Alpha');
    expect(container.innerHTML).toContain('Team Beta');
  });
});

// ── TC5: submitGroupChallenge shows error when no opponent ────────────────────

describe('TC5 — submitGroupChallenge() shows error when no opponent selected', () => {
  it('displays error and does not call safeRpc when selectedOpponentGroup is null', async () => {
    // Ensure no opponent selected (fresh import = null)
    await import('../../src/pages/groups.challenges.ts');
    const { submitGroupChallenge } = await import('../../src/pages/groups.challenges.ts');

    await submitGroupChallenge();

    const errEl = document.getElementById('gvg-error')!;
    expect(errEl.style.display).toBe('block');
    expect(errEl.textContent).toContain('Select an opponent group');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ── TC6: submitGroupChallenge shows error when topic too short ────────────────

describe('TC6 — submitGroupChallenge() shows error when topic < 5 chars', () => {
  it('displays topic error and does not call safeRpc', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'user-123' } as import('@supabase/supabase-js').User);
    state.setCurrentGroupId('group-abc');

    // Open modal to select a group (sets selectedOpponentGroup via click)
    const fakeGroups = [
      { id: 'g1', name: 'Team Alpha', avatar_emoji: '🔥', group_elo: 1250, member_count: 10 },
    ];
    const chainMock = {
      select:  vi.fn().mockReturnThis(),
      ilike:   vi.fn().mockReturnThis(),
      neq:     vi.fn().mockReturnThis(),
      order:   vi.fn().mockReturnThis(),
      limit:   vi.fn().mockResolvedValue({ data: fakeGroups, error: null }),
    };
    mockFrom.mockReturnValue(chainMock);
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);

    const { searchGroupsForChallenge, submitGroupChallenge } = await import('../../src/pages/groups.challenges.ts');
    await searchGroupsForChallenge('Team');

    // Click the first result to select the opponent
    const firstOption = document.querySelector('.gvg-opponent-option') as HTMLElement;
    firstOption?.click();

    // Set topic too short
    (document.getElementById('gvg-topic') as HTMLInputElement).value = 'Hi';

    await submitGroupChallenge();

    const errEl = document.getElementById('gvg-error')!;
    expect(errEl.style.display).toBe('block');
    expect(errEl.textContent).toContain('at least 5 characters');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ── TC7: respondToChallenge silently rejects invalid UUID ────────────────────

describe('TC7 — respondToChallenge() returns without RPC for invalid UUID', () => {
  it('does not call safeRpc when challengeId is not a valid UUID', async () => {
    const { respondToChallenge } = await import('../../src/pages/groups.challenges.ts');
    await respondToChallenge('not-a-uuid', 'accept');

    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ── TC8: loadGroupChallenges calls get_group_challenges RPC ──────────────────

describe('TC8 — loadGroupChallenges() calls get_group_challenges and renders cards', () => {
  it('calls safeRpc with get_group_challenges and renders challenge cards', async () => {
    const fakeChallenges = [
      {
        id: 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1',
        challenger_group_id: 'group-abc',
        defender_group_id: 'group-xyz',
        challenger_name: 'Team Alpha',
        defender_name: 'Team Beta',
        challenger_emoji: '🔥',
        defender_emoji: '⚡',
        challenger_elo: 1200,
        defender_elo: 1100,
        status: 'pending',
        topic: 'Who wins in a debate on climate policy?',
        format: '1v1',
        winner_group_id: null,
      },
    ];

    // safeRpc calls sb.rpc(name, args) — return array directly (not JSON string)
    // so contract validation (z.array) passes without throwing in DEV
    mockRpc.mockResolvedValue({ data: fakeChallenges, error: null });

    const state = await import('../../src/pages/groups.state.ts');
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);
    state.setCurrentGroupId('group-abc');

    const { loadGroupChallenges } = await import('../../src/pages/groups.challenges.ts');
    await loadGroupChallenges('group-abc');

    // mockRpc is called with 2 args (schema is consumed internally by safeRpc, not forwarded)
    expect(mockRpc).toHaveBeenCalledWith(
      'get_group_challenges',
      { p_group_id: 'group-abc', p_limit: 10 },
    );

    const container = document.getElementById('detail-challenges')!;
    expect(container.querySelectorAll('.challenge-card').length).toBe(1);
    expect(container.innerHTML).toContain('Team Beta');
    expect(container.innerHTML).toContain('climate policy');
  });
});

// ── TC9: loadGroupChallenges renders empty state ──────────────────────────────

describe('TC9 — loadGroupChallenges() renders empty state when no challenges', () => {
  it('renders empty state when RPC returns empty array', async () => {
    // Return actual array (not JSON string) so z.array contract passes
    mockRpc.mockResolvedValue({ data: [], error: null });

    const state = await import('../../src/pages/groups.state.ts');
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);
    state.setCurrentGroupId('group-abc');
    state.setIsMember(false);

    const { loadGroupChallenges } = await import('../../src/pages/groups.challenges.ts');
    await loadGroupChallenges('group-abc');

    const container = document.getElementById('detail-challenges')!;
    expect(container.innerHTML).toContain('No challenges yet');
  });
});

// ── TC10: submitGroupChallenge calls create_group_challenge RPC ───────────────

describe('TC10 — submitGroupChallenge() calls create_group_challenge with correct params', () => {
  it('calls safeRpc with create_group_challenge and shows success toast on success', async () => {
    // First set up a selected opponent via search + click
    const fakeGroups = [
      { id: 'g1g1g1g1-g1g1-g1g1-g1g1-g1g1g1g1g1g1', name: 'Team Alpha', avatar_emoji: '🔥', group_elo: 1250, member_count: 10 },
    ];
    const chainMock = {
      select:  vi.fn().mockReturnThis(),
      ilike:   vi.fn().mockReturnThis(),
      neq:     vi.fn().mockReturnThis(),
      order:   vi.fn().mockReturnThis(),
      limit:   vi.fn().mockResolvedValue({ data: fakeGroups, error: null }),
    };
    mockFrom.mockReturnValue(chainMock);

    // create_group_challenge schema: z.object({error?, success?, challenge_id?})
    // Return a plain object so contract validation passes in DEV
    mockRpc
      .mockResolvedValueOnce({ data: { success: true }, error: null })  // create_group_challenge
      .mockResolvedValue({ data: [], error: null });                     // loadGroupChallenges

    const state = await import('../../src/pages/groups.state.ts');
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);
    state.setCurrentUser({ id: 'user-123' } as import('@supabase/supabase-js').User);
    state.setCurrentGroupId('group-abc');

    const { searchGroupsForChallenge, submitGroupChallenge } = await import('../../src/pages/groups.challenges.ts');

    // Search and click to select opponent
    await searchGroupsForChallenge('Team');
    const firstOption = document.querySelector('.gvg-opponent-option') as HTMLElement;
    firstOption?.click();

    // Set valid topic
    (document.getElementById('gvg-topic') as HTMLInputElement).value = 'Should AI be regulated by governments?';

    await submitGroupChallenge();

    // safeRpc forwards only (name, args) to mockRpc — schema is internal
    expect(mockRpc).toHaveBeenCalledWith(
      'create_group_challenge',
      {
        p_challenger_group_id: 'group-abc',
        p_defender_group_id:   'g1g1g1g1-g1g1-g1g1-g1g1-g1g1g1g1g1g1',
        p_topic:               'Should AI be regulated by governments?',
        p_category:            'general',
        p_format:              '1v1',
      },
    );
  });
});

// ── TC11: respondToChallenge calls respond_to_group_challenge ─────────────────

describe('TC11 — respondToChallenge() calls respond_to_group_challenge with valid UUID', () => {
  it('calls safeRpc with respond_to_group_challenge and reloads challenges on success', async () => {
    const validUUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    // respond_to_group_challenge schema: z.object({error?, success?})
    // Return plain object so contract validation passes in DEV
    mockRpc
      .mockResolvedValueOnce({ data: { success: true }, error: null })  // respond_to_group_challenge
      .mockResolvedValue({ data: [], error: null });                     // loadGroupChallenges

    const state = await import('../../src/pages/groups.state.ts');
    state.setSb({ from: mockFrom, rpc: mockRpc, auth: mockAuth } as unknown as import('@supabase/supabase-js').SupabaseClient);
    state.setCurrentGroupId('group-abc');

    const { respondToChallenge } = await import('../../src/pages/groups.challenges.ts');
    await respondToChallenge(validUUID, 'accept');

    // safeRpc forwards only (name, args) to mockRpc
    expect(mockRpc).toHaveBeenCalledWith(
      'respond_to_group_challenge',
      { p_challenge_id: validUUID, p_action: 'accept' },
    );
  });
});

// ── TC12: closeGvGModal removes .open class ───────────────────────────────────

describe('TC12 — closeGvGModal() removes .open class from modal', () => {
  it('removes .open class from #gvg-modal', async () => {
    const modal = document.getElementById('gvg-modal')!;
    modal.classList.add('open');

    const { closeGvGModal } = await import('../../src/pages/groups.challenges.ts');
    closeGvGModal();

    expect(modal.classList.contains('open')).toBe(false);
  });
});

// ── TC13: clearGvGOpponent hides selected-opponent ───────────────────────────

describe('TC13 — clearGvGOpponent() hides the selected opponent element', () => {
  it('sets #gvg-selected-opponent display to none', async () => {
    const sel = document.getElementById('gvg-selected-opponent')!;
    sel.style.display = 'block';

    const { clearGvGOpponent } = await import('../../src/pages/groups.challenges.ts');
    clearGvGOpponent();

    expect(sel.style.display).toBe('none');
  });
});
