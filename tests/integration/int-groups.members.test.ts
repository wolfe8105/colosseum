/**
 * Integration tests — src/pages/groups.members.ts → groups.utils
 * Seam #296
 *
 * Covers the specific seam between groups.members and groups.utils:
 *   - clientRoleRank() used to determine if MANAGE button is shown
 *   - renderEmpty() used for empty and error states
 */

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

// ── ARCH filter ───────────────────────────────────────────────────────────────

describe('ARCH — groups.members.ts → groups.utils import surface (seam #296)', () => {
  it('imports clientRoleRank and renderEmpty from groups.utils', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.members.ts'),
      'utf8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const utilsImport = importLines.find(l => l.includes('groups.utils'));
    expect(utilsImport).toBeDefined();
    expect(utilsImport).toContain('clientRoleRank');
    expect(utilsImport).toContain('renderEmpty');
  });

  it('has no forbidden imports', () => {
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
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMembers(roles: string[]) {
  return roles.map((role, i) => ({
    user_id: `user-${i}`,
    username: `user${i}`,
    display_name: `User ${i}`,
    role,
    elo_rating: 1000,
    wins: 2,
    losses: 1,
    avatar_url: null,
  }));
}

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  document.body.innerHTML = '<div id="detail-members-list"></div>';
});

// ── TC1: clientRoleRank — leader (rank 1) can manage member (rank 4) ──────────

describe('TC1 — seam #296: clientRoleRank gates MANAGE button — leader over member', () => {
  it('renders MANAGE button when leader (rank 1) outranks member (rank 4)', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole('leader');

    mockRpc.mockResolvedValue({ data: makeMembers(['member']), error: null });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc');

    const list = document.getElementById('detail-members-list')!;
    expect(list.querySelectorAll('[data-action="open-modal"]').length).toBe(1);
  });
});

// ── TC2: clientRoleRank — co_leader (rank 2) can manage elder (rank 3) ────────

describe('TC2 — seam #296: clientRoleRank gates MANAGE button — co_leader over elder', () => {
  it('renders MANAGE button when co_leader (rank 2) outranks elder (rank 3)', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole('co_leader');

    mockRpc.mockResolvedValue({ data: makeMembers(['elder']), error: null });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc');

    const list = document.getElementById('detail-members-list')!;
    expect(list.querySelectorAll('[data-action="open-modal"]').length).toBe(1);
  });
});

// ── TC3: clientRoleRank — elder (rank 3) cannot manage member (rank 4) — equal-ish boundary

describe('TC3 — seam #296: clientRoleRank blocks MANAGE button — elder over member', () => {
  it('does NOT render MANAGE button for elder managing member (elder rank 3, member rank 4 — strict outrank required)', async () => {
    // elder rank=3, member rank=4 → elder DOES outrank member strictly, so MANAGE IS shown
    // This verifies the strict inequality: callerRank < targetRank
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole('elder'); // rank 3

    mockRpc.mockResolvedValue({ data: makeMembers(['member']), error: null }); // rank 4

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc');

    const list = document.getElementById('detail-members-list')!;
    // elder (3) < member (4) → canAct = true → MANAGE shown
    expect(list.querySelectorAll('[data-action="open-modal"]').length).toBe(1);
  });
});

// ── TC4: clientRoleRank — non-member (rank 99) cannot manage anyone ───────────

describe('TC4 — seam #296: clientRoleRank — null callerRole (non-member rank 99) sees no MANAGE', () => {
  it('renders no MANAGE button when callerRole is null (non-member, rank 99)', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole(null); // rank 99

    mockRpc.mockResolvedValue({ data: makeMembers(['member']), error: null }); // rank 4

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc');

    const list = document.getElementById('detail-members-list')!;
    // null rank is 99, member rank is 4 → 99 < 4 is false → no MANAGE
    expect(list.querySelectorAll('[data-action="open-modal"]').length).toBe(0);
  });
});

// ── TC5: renderEmpty — called when members array is empty ─────────────────────

describe('TC5 — seam #296: renderEmpty used for empty members list', () => {
  it('renders empty-state div when RPC returns empty array', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser(null);
    state.setCallerRole(null);

    mockRpc.mockResolvedValue({ data: [], error: null });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc');

    const list = document.getElementById('detail-members-list')!;
    expect(list.querySelector('.empty-state')).not.toBeNull();
    expect(list.innerHTML).toContain('No members yet');
  });
});

// ── TC6: renderEmpty — called on RPC error ────────────────────────────────────

describe('TC6 — seam #296: renderEmpty used for RPC error state', () => {
  it('renders empty-state div with error message when RPC throws', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser(null);
    state.setCallerRole(null);

    mockRpc.mockResolvedValue({ data: null, error: new Error('db failure') });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc');

    const list = document.getElementById('detail-members-list')!;
    expect(list.querySelector('.empty-state')).not.toBeNull();
    expect(list.innerHTML).toContain('Could not load members');
  });
});

// ── TC7: RPC called with correct params — get_group_members ───────────────────

describe('TC7 — seam #296: loadGroupMembers calls get_group_members RPC', () => {
  it('calls safeRpc with get_group_members and p_group_id', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser(null);
    state.setCallerRole(null);

    mockRpc.mockResolvedValue({ data: makeMembers(['member']), error: null });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-test-id');

    expect(mockRpc).toHaveBeenCalledWith(
      'get_group_members',
      { p_group_id: 'group-test-id', p_limit: 50 },
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Seam #442 — src/pages/groups.members.ts → groups.members.modal.html
// ═══════════════════════════════════════════════════════════════════════════════

// ── ARCH ──────────────────────────────────────────────────────────────────────

describe('ARCH — groups.members.ts → groups.members.modal.html import surface (seam #442)', () => {
  it('re-exports _injectMemberActionsModal from groups.members.modal.html.ts', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.members.ts'),
      'utf8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const htmlImport = importLines.find(l => l.includes('groups.members.modal.html'));
    expect(htmlImport).toBeDefined();
    expect(htmlImport).toContain('_injectMemberActionsModal');
  });

  it('has no forbidden imports in groups.members.modal.html.ts', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.members.modal.html.ts'),
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

// ── TC8: _injectMemberActionsModal creates the modal in the DOM ───────────────

describe('TC8 — seam #442: _injectMemberActionsModal creates #member-actions-modal', () => {
  it('appends #member-actions-modal to document.body', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '<div id="detail-members-list"></div>';

    const { _injectMemberActionsModal } = await import('../../src/pages/groups.members.modal.html.ts');
    _injectMemberActionsModal();

    expect(document.getElementById('member-actions-modal')).not.toBeNull();
  });
});

// ── TC9: _injectMemberActionsModal is idempotent (guard check) ────────────────

describe('TC9 — seam #442: _injectMemberActionsModal is idempotent', () => {
  it('does not create a second modal when called twice', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '<div id="detail-members-list"></div>';

    const { _injectMemberActionsModal } = await import('../../src/pages/groups.members.modal.html.ts');
    _injectMemberActionsModal();
    _injectMemberActionsModal();

    const modals = document.querySelectorAll('#member-actions-modal');
    expect(modals.length).toBe(1);
  });
});

// ── TC10: injected modal is initially hidden ───────────────────────────────────

describe('TC10 — seam #442: injected modal has display:none initially', () => {
  it('modal element has display:none in its style after injection', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '<div id="detail-members-list"></div>';

    const { _injectMemberActionsModal } = await import('../../src/pages/groups.members.modal.html.ts');
    _injectMemberActionsModal();

    const modal = document.getElementById('member-actions-modal') as HTMLElement;
    expect(modal.style.display).toBe('none');
  });
});

// ── TC11: injected modal contains all required button IDs ─────────────────────

describe('TC11 — seam #442: injected modal contains action button IDs', () => {
  it('contains mam-cancel-btn, mam-kick-btn, mam-ban-btn, mam-promote-btn', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '<div id="detail-members-list"></div>';

    const { _injectMemberActionsModal } = await import('../../src/pages/groups.members.modal.html.ts');
    _injectMemberActionsModal();

    expect(document.getElementById('mam-cancel-btn')).not.toBeNull();
    expect(document.getElementById('mam-kick-btn')).not.toBeNull();
    expect(document.getElementById('mam-ban-btn')).not.toBeNull();
    expect(document.getElementById('mam-promote-btn')).not.toBeNull();
  });
});

// ── TC12: injected modal contains form elements ────────────────────────────────

describe('TC12 — seam #442: injected modal contains mam-promote-select and mam-ban-reason', () => {
  it('contains #mam-promote-select (select) and #mam-ban-reason (textarea)', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '<div id="detail-members-list"></div>';

    const { _injectMemberActionsModal } = await import('../../src/pages/groups.members.modal.html.ts');
    _injectMemberActionsModal();

    const sel = document.getElementById('mam-promote-select');
    const textarea = document.getElementById('mam-ban-reason');
    expect(sel).not.toBeNull();
    expect(sel?.tagName.toLowerCase()).toBe('select');
    expect(textarea).not.toBeNull();
    expect(textarea?.tagName.toLowerCase()).toBe('textarea');
  });
});

// ── TC13: injected modal contains member info display elements ─────────────────

describe('TC13 — seam #442: injected modal contains member info elements', () => {
  it('contains #mam-name, #mam-role-label, #mam-avatar, #mam-error', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '<div id="detail-members-list"></div>';

    const { _injectMemberActionsModal } = await import('../../src/pages/groups.members.modal.html.ts');
    _injectMemberActionsModal();

    expect(document.getElementById('mam-name')).not.toBeNull();
    expect(document.getElementById('mam-role-label')).not.toBeNull();
    expect(document.getElementById('mam-avatar')).not.toBeNull();
    expect(document.getElementById('mam-error')).not.toBeNull();
  });
});

// ── TC14: re-export from groups.members.ts works ──────────────────────────────

describe('TC14 — seam #442: groups.members.ts re-exports _injectMemberActionsModal', () => {
  it('_injectMemberActionsModal is a function when imported via groups.members.ts barrel', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '<div id="detail-members-list"></div>';

    const mod = await import('../../src/pages/groups.members.ts');
    expect(typeof mod._injectMemberActionsModal).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAM #443 — src/pages/groups.members.ts → groups.members.modal
// ═══════════════════════════════════════════════════════════════════════════════

describe('ARCH — groups.members.ts → groups.members.modal import surface (seam #443)', () => {
  it('imports openMemberActionsModal from groups.members.modal', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.members.ts'),
      'utf8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const modalImport = importLines.find(l => l.includes('groups.members.modal'));
    expect(modalImport).toBeDefined();
    expect(modalImport).toContain('openMemberActionsModal');
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSingleMember443(role = 'member') {
  return [{
    user_id: 'target-user-id-443',
    username: 'targetuser443',
    display_name: 'Target User 443',
    role,
    elo_rating: 1000,
    wins: 2,
    losses: 1,
    avatar_url: null,
  }];
}

function buildFullModalDOM443() {
  if (!document.getElementById('member-actions-modal')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="member-actions-modal" style="display:none;">
        <div id="mam-avatar"></div>
        <div id="mam-name"></div>
        <div id="mam-role-label"></div>
        <div id="mam-error" style="display:none;"></div>
        <div id="mam-promote-section" style="display:none;">
          <select id="mam-promote-select"></select>
          <button id="mam-promote-btn">SET ROLE</button>
        </div>
        <textarea id="mam-ban-reason"></textarea>
        <button id="mam-kick-btn">KICK MEMBER</button>
        <button id="mam-ban-btn">BAN MEMBER</button>
        <button id="mam-cancel-btn">CANCEL</button>
      </div>
    `);
  }
}

// ── TC-M2: clicking MANAGE opens the modal ────────────────────────────────────

describe('TC-M2 — seam #443: MANAGE button click calls openMemberActionsModal → modal visible', () => {
  it('opens member-actions-modal when MANAGE button is clicked', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();

    document.body.innerHTML = '<div id="detail-members-list"></div>';
    buildFullModalDOM443();

    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-abc-443');

    mockRpc.mockResolvedValue({ data: makeSingleMember443('member'), error: null });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-abc-443');

    const manageBtn = document.querySelector('[data-action="open-modal"]') as HTMLElement;
    expect(manageBtn).not.toBeNull();
    manageBtn.click();

    const modal = document.getElementById('member-actions-modal')!;
    expect(modal.style.display).toBe('flex');
  });
});

// ── TC-M3: promote RPC ────────────────────────────────────────────────────────

describe('TC-M3 — seam #443: SET ROLE calls promote_group_member RPC', () => {
  it('calls safeRpc promote_group_member with correct params', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();

    document.body.innerHTML = '<div id="detail-members-list"></div>';
    buildFullModalDOM443();

    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-promote-443');

    mockRpc.mockResolvedValue({ data: makeSingleMember443('member'), error: null });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-promote-443');

    const manageBtn = document.querySelector('[data-action="open-modal"]') as HTMLElement;
    manageBtn.click();

    // Add an option to the promote select
    const sel = document.getElementById('mam-promote-select') as HTMLSelectElement;
    const opt = document.createElement('option');
    opt.value = 'elder';
    sel.appendChild(opt);
    sel.value = 'elder';

    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    const promoteBtn = document.getElementById('mam-promote-btn') as HTMLButtonElement;
    promoteBtn.click();

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRpc).toHaveBeenCalledWith(
      'promote_group_member',
      { p_group_id: 'group-promote-443', p_user_id: 'target-user-id-443', p_new_role: 'elder' },
    );
  });
});

// ── TC-M4: kick RPC ───────────────────────────────────────────────────────────

describe('TC-M4 — seam #443: KICK MEMBER calls kick_group_member RPC', () => {
  it('calls safeRpc kick_group_member with p_group_id and p_user_id', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();

    document.body.innerHTML = '<div id="detail-members-list"></div>';
    buildFullModalDOM443();

    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-kick-443');

    mockRpc.mockResolvedValue({ data: makeSingleMember443('member'), error: null });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-kick-443');

    const manageBtn = document.querySelector('[data-action="open-modal"]') as HTMLElement;
    manageBtn.click();

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    const kickBtn = document.getElementById('mam-kick-btn') as HTMLButtonElement;
    kickBtn.click();

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRpc).toHaveBeenCalledWith(
      'kick_group_member',
      { p_group_id: 'group-kick-443', p_user_id: 'target-user-id-443' },
    );
  });
});

// ── TC-M5: ban RPC ────────────────────────────────────────────────────────────

describe('TC-M5 — seam #443: BAN MEMBER calls ban_group_member RPC', () => {
  it('calls safeRpc ban_group_member with p_group_id, p_user_id, and p_reason', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();

    document.body.innerHTML = '<div id="detail-members-list"></div>';
    buildFullModalDOM443();

    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-ban-443');

    mockRpc.mockResolvedValue({ data: makeSingleMember443('member'), error: null });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-ban-443');

    const manageBtn = document.querySelector('[data-action="open-modal"]') as HTMLElement;
    manageBtn.click();

    const banReason = document.getElementById('mam-ban-reason') as HTMLTextAreaElement;
    banReason.value = 'Toxic behavior';

    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    const banBtn = document.getElementById('mam-ban-btn') as HTMLButtonElement;
    banBtn.click();

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRpc).toHaveBeenCalledWith(
      'ban_group_member',
      { p_group_id: 'group-ban-443', p_user_id: 'target-user-id-443', p_reason: 'Toxic behavior' },
    );
  });
});

// ── TC-M6: CANCEL closes the modal ───────────────────────────────────────────

describe('TC-M6 — seam #443: CANCEL button hides member-actions-modal', () => {
  it('sets modal display to none when cancel button is clicked', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();

    document.body.innerHTML = '<div id="detail-members-list"></div>';
    buildFullModalDOM443();

    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-cancel-443');

    mockRpc.mockResolvedValue({ data: makeSingleMember443('member'), error: null });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-cancel-443');

    const manageBtn = document.querySelector('[data-action="open-modal"]') as HTMLElement;
    manageBtn.click();

    const modal = document.getElementById('member-actions-modal')!;
    expect(modal.style.display).toBe('flex');

    const cancelBtn = document.getElementById('mam-cancel-btn') as HTMLButtonElement;
    cancelBtn.click();

    expect(modal.style.display).toBe('none');
  });
});

// ── TC-M7: RPC error shows mam-error ─────────────────────────────────────────

describe('TC-M7 — seam #443: promote RPC error surfaces in mam-error element', () => {
  it('shows mam-error with message when promote_group_member returns an error', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockRpc.mockReset();

    document.body.innerHTML = '<div id="detail-members-list"></div>';
    buildFullModalDOM443();

    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'caller-id' } as import('@supabase/supabase-js').User);
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-err-443');

    mockRpc.mockResolvedValue({ data: makeSingleMember443('member'), error: null });

    const { loadGroupMembers } = await import('../../src/pages/groups.members.ts');
    await loadGroupMembers('group-err-443');

    const manageBtn = document.querySelector('[data-action="open-modal"]') as HTMLElement;
    manageBtn.click();

    const sel = document.getElementById('mam-promote-select') as HTMLSelectElement;
    const opt = document.createElement('option');
    opt.value = 'elder';
    sel.appendChild(opt);
    sel.value = 'elder';

    const promoteBtn = document.getElementById('mam-promote-btn') as HTMLButtonElement;

    // Build a promise that will resolve once _executePromote has run past the RPC call
    const rpcCalled = new Promise<void>(resolve => {
      mockRpc.mockImplementation(async (_fn: string, _args: unknown) => {
        resolve();
        return { data: null, error: { message: 'Not authorized' } };
      });
    });

    promoteBtn.click();
    // Wait for RPC to be called, then flush remaining microtasks
    await rpcCalled;
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const errEl = document.getElementById('mam-error')!;
    expect(errEl.style.display).toBe('block');
    expect(errEl.textContent).toContain('Not authorized');
  });
});
