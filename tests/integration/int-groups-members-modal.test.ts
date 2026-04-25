/**
 * Integration tests — src/pages/groups.members.modal.ts → groups.state
 * Seam #140
 *
 * Covers:
 *  - openMemberActionsModal reads currentGroupId and callerRole from groups.state
 *  - Promote section visibility gated by callerRole (elder → hidden, others → shown)
 *  - _executePromote, _executeKick, _executeBan early-return when currentGroupId is null
 *  - setGroupOpenCallback and setRefreshMembersCallback callbacks fire after successful actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';

// ── ARCH filter ───────────────────────────────────────────────────────────────
describe('ARCH: import lines in source file', () => {
  it('groups.members.modal.ts has no forbidden imports', () => {
    const src = fs.readFileSync('src/pages/groups.members.modal.ts', 'utf8');
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

  it('groups.members.modal.ts imports currentGroupId and callerRole from groups.state', () => {
    const src = fs.readFileSync('src/pages/groups.members.modal.ts', 'utf8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const stateImport = importLines.find(l => l.includes('groups.state'));
    expect(stateImport).toBeDefined();
    expect(stateImport).toContain('currentGroupId');
    expect(stateImport).toContain('callerRole');
  });
});

// ── Mock setup ────────────────────────────────────────────────────────────────

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
  showToast: vi.fn(),
  ModeratorConfig: {
    escapeHTML: (s: string) => s,
  },
}));

// safeRpc is re-exported from auth.ts barrel
vi.mock('../../src/auth.ts', () => ({
  safeRpc: vi.fn(),
}));

// ── Types ─────────────────────────────────────────────────────────────────────

type Modal = typeof import('../../src/pages/groups.members.modal.ts');
type State = typeof import('../../src/pages/groups.state.ts');
type Auth  = typeof import('../../src/auth.ts');

let modal: Modal;
let state: State;
let auth: Auth;

// ── Build the full modal DOM for tests ───────────────────────────────────────

function buildModalDom(): void {
  document.body.innerHTML = `
    <div id="member-actions-modal" style="display:none">
      <div id="mam-avatar"></div>
      <div id="mam-name"></div>
      <div id="mam-role-label"></div>
      <div id="mam-promote-section" style="display:none">
        <select id="mam-promote-select"></select>
        <button id="mam-promote-btn">SET ROLE</button>
      </div>
      <button id="mam-kick-btn">KICK MEMBER</button>
      <button id="mam-ban-btn">BAN MEMBER</button>
      <textarea id="mam-ban-reason"></textarea>
      <div id="mam-error" style="display:none"></div>
      <button id="mam-cancel-btn">CANCEL</button>
    </div>
  `;
}

function makeMember(overrides = {}) {
  return {
    user_id: 'user-uuid-123',
    username: 'debater99',
    display_name: 'Debater 99',
    role: 'member',
    ...overrides,
  };
}

// ── beforeEach — fresh module graph per test ──────────────────────────────────

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  vi.resetModules();
  modal = await import('../../src/pages/groups.members.modal.ts');
  state = await import('../../src/pages/groups.state.ts');
  auth  = await import('../../src/auth.ts');
  buildModalDom();
});

// ── TC-01: promote section shown when callerRole is 'leader' ─────────────────
describe('TC-01: promote section visibility — leader sees it', () => {
  it('shows promote section when callerRole is leader', () => {
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-abc');
    modal.openMemberActionsModal(makeMember({ role: 'member' }) as any);
    const section = document.getElementById('mam-promote-section')!;
    expect(section.style.display).toBe('block');
  });
});

// ── TC-02: promote section hidden when callerRole is 'elder' ─────────────────
describe('TC-02: promote section visibility — elder cannot promote', () => {
  it('hides promote section when callerRole is elder', () => {
    state.setCallerRole('elder');
    state.setCurrentGroupId('group-abc');
    modal.openMemberActionsModal(makeMember({ role: 'member' }) as any);
    const section = document.getElementById('mam-promote-section')!;
    expect(section.style.display).toBe('none');
  });
});

// ── TC-03: promote section hidden when callerRole is null ─────────────────────
describe('TC-03: promote section hidden when callerRole is null (non-member)', () => {
  it('hides promote section when callerRole is null', () => {
    state.setCallerRole(null);
    state.setCurrentGroupId('group-abc');
    modal.openMemberActionsModal(makeMember({ role: 'member' }) as any);
    const section = document.getElementById('mam-promote-section')!;
    expect(section.style.display).toBe('none');
  });
});

// ── TC-04: _executePromote early-returns when currentGroupId is null ──────────
describe('TC-04: _executePromote skips RPC when currentGroupId is null', () => {
  it('does not call safeRpc when currentGroupId is null', async () => {
    const safeRpcMock = vi.mocked(auth.safeRpc);
    safeRpcMock.mockResolvedValue({ data: null, error: null } as any);

    state.setCallerRole('leader');
    state.setCurrentGroupId(null);  // no group open

    modal.openMemberActionsModal(makeMember({ role: 'member' }) as any);

    // Set a role selection and click promote
    const sel = document.getElementById('mam-promote-select') as HTMLSelectElement;
    // Manually add option since the section may be hidden
    sel.innerHTML = '<option value="co_leader">Co-Leader</option>';

    // Click is handled via event listeners wired inside openMemberActionsModal.
    // We trigger the click and drain microtasks.
    document.getElementById('mam-promote-btn')!.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(safeRpcMock).not.toHaveBeenCalled();
  });
});

// ── TC-05: _executeKick skips RPC when currentGroupId is null ─────────────────
describe('TC-05: _executeKick skips RPC when currentGroupId is null', () => {
  it('does not call safeRpc when currentGroupId is null', async () => {
    const safeRpcMock = vi.mocked(auth.safeRpc);
    safeRpcMock.mockResolvedValue({ data: null, error: null } as any);

    state.setCallerRole('leader');
    state.setCurrentGroupId(null);

    modal.openMemberActionsModal(makeMember() as any);

    document.getElementById('mam-kick-btn')!.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(safeRpcMock).not.toHaveBeenCalled();
  });
});

// ── TC-06: _executeBan skips RPC when currentGroupId is null ──────────────────
describe('TC-06: _executeBan skips RPC when currentGroupId is null', () => {
  it('does not call safeRpc when currentGroupId is null', async () => {
    const safeRpcMock = vi.mocked(auth.safeRpc);
    safeRpcMock.mockResolvedValue({ data: null, error: null } as any);

    state.setCallerRole('leader');
    state.setCurrentGroupId(null);

    modal.openMemberActionsModal(makeMember() as any);

    document.getElementById('mam-ban-btn')!.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(safeRpcMock).not.toHaveBeenCalled();
  });
});

// ── TC-07: setGroupOpenCallback fires after leadership transfer ───────────────
describe('TC-07: setGroupOpenCallback fires on leadership transfer', () => {
  it('calls openGroupCb with currentGroupId when newRole is leader', async () => {
    const safeRpcMock = vi.mocked(auth.safeRpc);
    safeRpcMock.mockResolvedValue({ data: JSON.stringify({ success: true }), error: null } as any);

    const openGroupCb = vi.fn();
    modal.setGroupOpenCallback(openGroupCb);

    state.setCallerRole('leader');
    state.setCurrentGroupId('group-xyz');

    modal.openMemberActionsModal(makeMember({ role: 'member' }) as any);

    // Force select to 'leader'
    const sel = document.getElementById('mam-promote-select') as HTMLSelectElement;
    if (!sel.options.length) {
      const opt = document.createElement('option');
      opt.value = 'leader';
      sel.appendChild(opt);
    }
    sel.value = 'leader';

    document.getElementById('mam-promote-btn')!.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(safeRpcMock).toHaveBeenCalledWith('promote_group_member', expect.objectContaining({
      p_group_id: 'group-xyz',
      p_new_role: 'leader',
    }));
    expect(openGroupCb).toHaveBeenCalledWith('group-xyz');
  });
});

// ── TC-08: setRefreshMembersCallback fires after kick ─────────────────────────
describe('TC-08: setRefreshMembersCallback fires after kick', () => {
  it('calls refreshMembers callback with currentGroupId after successful kick', async () => {
    const safeRpcMock = vi.mocked(auth.safeRpc);
    safeRpcMock.mockResolvedValue({ data: JSON.stringify({ success: true }), error: null } as any);

    const refreshMembers = vi.fn().mockResolvedValue(undefined);
    modal.setRefreshMembersCallback(refreshMembers);

    state.setCallerRole('leader');
    state.setCurrentGroupId('group-kick-test');

    // Stub window.confirm to return true (bypass confirmation prompt)
    vi.stubGlobal('confirm', () => true);

    modal.openMemberActionsModal(makeMember() as any);

    document.getElementById('mam-kick-btn')!.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(safeRpcMock).toHaveBeenCalledWith('kick_group_member', expect.objectContaining({
      p_group_id: 'group-kick-test',
      p_user_id: 'user-uuid-123',
    }));
    expect(refreshMembers).toHaveBeenCalledWith('group-kick-test');

    vi.unstubAllGlobals();
  });
});

// ── TC-09: closeMemberActionsModal hides the modal ───────────────────────────
describe('TC-09: closeMemberActionsModal resets display and member state', () => {
  it('sets modal display to none', () => {
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-abc');
    modal.openMemberActionsModal(makeMember() as any);
    const el = document.getElementById('member-actions-modal')!;
    expect(el.style.display).toBe('flex');
    modal.closeMemberActionsModal();
    expect(el.style.display).toBe('none');
  });
});
