/**
 * Integration tests — src/pages/groups.members.modal.ts → groups.utils
 * Seam #297
 *
 * Covers the specific seam between groups.members.modal and groups.utils:
 *   - assignableRoles() drives the promote dropdown options
 *   - roleLabel() formats role names displayed in the modal header and dropdown
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

describe('ARCH — groups.members.modal.ts → groups.utils import surface (seam #297)', () => {
  it('imports assignableRoles and roleLabel from groups.utils', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.members.modal.ts'),
      'utf8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const utilsImport = importLines.find(l => l.includes('groups.utils'));
    expect(utilsImport).toBeDefined();
    expect(utilsImport).toContain('assignableRoles');
    expect(utilsImport).toContain('roleLabel');
  });

  it('has no forbidden imports', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.members.modal.ts'),
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

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  buildModalDom();
});

// ── TC1: assignableRoles — leader sees full promote dropdown ──────────────────

describe('TC1 — seam #297: assignableRoles used for leader — all roles in dropdown', () => {
  it('populates promote select with co_leader, elder, member options for leader callerRole', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-abc');

    const modal = await import('../../src/pages/groups.members.modal.ts');
    modal.openMemberActionsModal(makeMember({ role: 'member' }) as any);

    const sel = document.getElementById('mam-promote-select') as HTMLSelectElement;
    const optValues = Array.from(sel.options).map(o => o.value);
    // assignableRoles('leader') = ['leader','co_leader','elder','member'], filtered to exclude current role 'member'
    expect(optValues).toContain('co_leader');
    expect(optValues).toContain('elder');
    expect(optValues).toContain('leader');
  });
});

// ── TC2: assignableRoles — co_leader sees restricted dropdown ────────────────

describe('TC2 — seam #297: assignableRoles used for co_leader — restricted options', () => {
  it('populates promote select with elder and member only for co_leader callerRole', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCallerRole('co_leader');
    state.setCurrentGroupId('group-abc');

    const modal = await import('../../src/pages/groups.members.modal.ts');
    modal.openMemberActionsModal(makeMember({ role: 'member' }) as any);

    const sel = document.getElementById('mam-promote-select') as HTMLSelectElement;
    const optValues = Array.from(sel.options).map(o => o.value);
    // assignableRoles('co_leader') = ['elder','member'], filtered to exclude 'member' → only 'elder'
    expect(optValues).not.toContain('leader');
    expect(optValues).not.toContain('co_leader');
  });
});

// ── TC3: assignableRoles — elder gets empty array → promote section hidden ────

describe('TC3 — seam #297: assignableRoles for elder returns empty → promote section hidden', () => {
  it('hides promote section when callerRole is elder (assignableRoles returns [])', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCallerRole('elder');
    state.setCurrentGroupId('group-abc');

    const modal = await import('../../src/pages/groups.members.modal.ts');
    modal.openMemberActionsModal(makeMember({ role: 'member' }) as any);

    const section = document.getElementById('mam-promote-section')!;
    expect(section.style.display).toBe('none');
  });
});

// ── TC4: roleLabel — displays current role text in modal header ───────────────

describe('TC4 — seam #297: roleLabel formats role in mam-role-label element', () => {
  it('sets mam-role-label text using roleLabel for co_leader target', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-abc');

    const modal = await import('../../src/pages/groups.members.modal.ts');
    modal.openMemberActionsModal(makeMember({ role: 'co_leader' }) as any);

    const label = document.getElementById('mam-role-label')!;
    // roleLabel('co_leader') = 'Co-Leader'
    expect(label.textContent).toContain('Co-Leader');
  });
});

// ── TC5: roleLabel — formats 'leader' role correctly ─────────────────────────

describe('TC5 — seam #297: roleLabel formats leader role in modal', () => {
  it('sets mam-role-label to "Current role: Leader" for leader target member', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-abc');

    const modal = await import('../../src/pages/groups.members.modal.ts');
    modal.openMemberActionsModal(makeMember({ role: 'leader' }) as any);

    const label = document.getElementById('mam-role-label')!;
    expect(label.textContent).toBe('Current role: Leader');
  });
});

// ── TC6: roleLabel — dropdown option text uses roleLabel ─────────────────────

describe('TC6 — seam #297: roleLabel used in promote dropdown option text', () => {
  it('dropdown option for elder reads "Elder" (via roleLabel)', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-abc');

    const modal = await import('../../src/pages/groups.members.modal.ts');
    // Target is 'member', so 'member' is excluded, 'elder' should appear
    modal.openMemberActionsModal(makeMember({ role: 'member' }) as any);

    const sel = document.getElementById('mam-promote-select') as HTMLSelectElement;
    const optTexts = Array.from(sel.options).map(o => o.text);
    expect(optTexts.some(t => t.includes('Elder'))).toBe(true);
  });
});

// ── TC7: assignableRoles — promote RPC fires with correct params ──────────────

describe('TC7 — seam #297: promote_group_member RPC called via promote flow', () => {
  it('calls safeRpc with promote_group_member params after clicking promote', async () => {
    const safeRpcModule = await import('../../src/auth.ts');
    const safeRpcMock = vi.spyOn(safeRpcModule, 'safeRpc').mockResolvedValue({ data: JSON.stringify({ success: true }), error: null } as any);

    const state = await import('../../src/pages/groups.state.ts');
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-promote-test');

    const modal = await import('../../src/pages/groups.members.modal.ts');
    modal.openMemberActionsModal(makeMember({ role: 'member', user_id: 'target-uid' }) as any);

    const sel = document.getElementById('mam-promote-select') as HTMLSelectElement;
    // Pick 'elder' option
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === 'elder') { sel.selectedIndex = i; break; }
    }

    document.getElementById('mam-promote-btn')!.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(safeRpcMock).toHaveBeenCalledWith(
      'promote_group_member',
      expect.objectContaining({
        p_group_id: 'group-promote-test',
        p_user_id: 'target-uid',
        p_new_role: 'elder',
      }),
    );

    safeRpcMock.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAM #444 — groups.members.modal.ts → groups.members.modal.html
// Tests the boundary between modal logic and HTML DOM builder
// ═══════════════════════════════════════════════════════════════════════════════

describe('ARCH — seam #444: groups.members.modal.ts imports _injectMemberActionsModal', () => {
  it('imports _injectMemberActionsModal from groups.members.modal.html', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.members.modal.ts'),
      'utf8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const htmlImport = importLines.find(l => l.includes('groups.members.modal.html'));
    expect(htmlImport).toBeDefined();
    expect(htmlImport).toContain('_injectMemberActionsModal');
  });
});

describe('TC-444-1 — _injectMemberActionsModal injects #member-actions-modal into body', () => {
  it('appends the modal element to document.body when called', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const { _injectMemberActionsModal } = await import('../../src/pages/groups.members.modal.html.ts');
    _injectMemberActionsModal();

    const modal = document.getElementById('member-actions-modal');
    expect(modal).not.toBeNull();
    expect(document.body.contains(modal)).toBe(true);
  });
});

describe('TC-444-2 — _injectMemberActionsModal is idempotent', () => {
  it('calling twice only creates one #member-actions-modal element', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const { _injectMemberActionsModal } = await import('../../src/pages/groups.members.modal.html.ts');
    _injectMemberActionsModal();
    _injectMemberActionsModal();

    const modals = document.querySelectorAll('#member-actions-modal');
    expect(modals.length).toBe(1);
  });
});

describe('TC-444-3 — all required child elements exist after injection', () => {
  it('injects mam-name, mam-avatar, mam-role-label, mam-promote-section, mam-promote-select, mam-promote-btn, mam-kick-btn, mam-ban-btn, mam-ban-reason, mam-error, mam-cancel-btn', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const { _injectMemberActionsModal } = await import('../../src/pages/groups.members.modal.html.ts');
    _injectMemberActionsModal();

    const requiredIds = [
      'mam-name', 'mam-avatar', 'mam-role-label',
      'mam-promote-section', 'mam-promote-select', 'mam-promote-btn',
      'mam-kick-btn', 'mam-ban-btn', 'mam-ban-reason',
      'mam-error', 'mam-cancel-btn',
    ];
    for (const id of requiredIds) {
      expect(document.getElementById(id), `#${id} should exist`).not.toBeNull();
    }
  });
});

describe('TC-444-4 — openMemberActionsModal triggers DOM injection and shows modal', () => {
  it('modal is in DOM with display:flex after openMemberActionsModal', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const state = await import('../../src/pages/groups.state.ts');
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-444-test');

    const modal = await import('../../src/pages/groups.members.modal.ts');
    modal.openMemberActionsModal({
      user_id: 'uid-444',
      username: 'tester444',
      display_name: 'Tester 444',
      role: 'member',
    } as any);

    const el = document.getElementById('member-actions-modal');
    expect(el).not.toBeNull();
    expect(el!.style.display).toBe('flex');
  });
});

describe('TC-444-5 — closeMemberActionsModal sets display:none on the modal', () => {
  it('hides modal after close', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const state = await import('../../src/pages/groups.state.ts');
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-444-close');

    const mod = await import('../../src/pages/groups.members.modal.ts');
    mod.openMemberActionsModal({
      user_id: 'uid-close',
      username: 'closetester',
      display_name: 'Close Tester',
      role: 'member',
    } as any);

    mod.closeMemberActionsModal();

    const el = document.getElementById('member-actions-modal');
    expect(el).not.toBeNull();
    expect(el!.style.display).toBe('none');
  });
});

describe('TC-444-6 — modal initial display is none after injection (before open)', () => {
  it('injected modal starts hidden', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const { _injectMemberActionsModal } = await import('../../src/pages/groups.members.modal.html.ts');
    _injectMemberActionsModal();

    const el = document.getElementById('member-actions-modal');
    expect(el).not.toBeNull();
    expect(el!.style.display).toBe('none');
  });
});

describe('TC-444-7 — openMemberActionsModal populates mam-name from member display_name', () => {
  it('sets mam-name textContent to member display_name via injection path', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const state = await import('../../src/pages/groups.state.ts');
    state.setCallerRole('leader');
    state.setCurrentGroupId('group-444-name');

    const mod = await import('../../src/pages/groups.members.modal.ts');
    mod.openMemberActionsModal({
      user_id: 'uid-name',
      username: 'nameuser',
      display_name: 'Alice Wonderland',
      role: 'elder',
    } as any);

    const nameEl = document.getElementById('mam-name');
    expect(nameEl).not.toBeNull();
    expect(nameEl!.textContent).toBe('Alice Wonderland');
  });
});
