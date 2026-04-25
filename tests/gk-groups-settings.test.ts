// ============================================================
// GK — F-16 GROUP SETTINGS
// Source: src/pages/groups.settings.ts
// Spec:   docs/THE-MODERATOR-PUNCH-LIST.md row F-16
//
// Testable spec claims:
//   TC1:  openGroupSettings is leader-only (non-leader blocked)
//   TC2:  openGroupSettings proceeds for leader
//   TC3:  submitGroupSettings calls RPC update_group_settings
//   TC4:  submitGroupSettings sends p_group_id
//   TC5:  submitGroupSettings sends p_join_mode
//   TC6:  entry_requirements JSONB sent when join_mode=requirements; else {}
//   TC7:  audition_config JSONB sent when join_mode=audition; else {}
//   TC8:  on RPC success — showToast('Settings saved')
//   TC9:  on RPC error   — showToast with error message
//   TC10: submitDeleteGroup — empty confirm name → toast, no RPC
//   TC11: submitDeleteGroup calls RPC delete_group
//   TC12: submitDeleteGroup sends p_confirm_name matching typed value
//   TC13: onJoinModeChange('invite_only') hides both conditional sections
//   ARCH: imports only from allowed modules
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc   = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
const mockShowToast = vi.hoisted(() => vi.fn());

let mockCurrentGroupId: string | null = 'group-abc';
let mockCallerRole: string | null = 'leader';

vi.mock('../src/auth.ts', () => ({
  safeRpc:  mockSafeRpc,
  onChange: vi.fn(),
  ready:    Promise.resolve(),
}));

vi.mock('../src/config.ts', () => ({
  showToast:  mockShowToast,
  escapeHTML: (s: string) => s,
  FEATURES:   {},
}));

vi.mock('../src/pages/groups.state.ts', () => ({
  get currentGroupId() { return mockCurrentGroupId; },
  get callerRole()     { return mockCallerRole; },
  currentUser:      null,
  isMember:         false,
  setCurrentGroupId: vi.fn(),
  setIsMember:       vi.fn(),
  setCallerRole:     vi.fn(),
}));

vi.mock('../src/pages/groups.types.ts', () => ({}));

import {
  openGroupSettings,
  onJoinModeChange,
  submitGroupSettings,
  submitDeleteGroup,
} from '../src/pages/groups.settings.ts';
import type { GroupDetail } from '../src/pages/groups.types.ts';

// ── Helpers ───────────────────────────────────────────────────

function makeGroup(overrides: Partial<GroupDetail> = {}): GroupDetail {
  return {
    id:                   'group-abc',
    name:                 'Arena Group',
    description:          'A test group',
    avatar_emoji:         '⚔️',
    is_public:            true,
    join_mode:            'open',
    category:             'general',
    entry_requirements:   {},
    audition_config:      {},
    ...overrides,
  } as GroupDetail;
}

function buildDOM(joinModeChecked = 'open') {
  document.body.innerHTML = `
    <div id="view-detail"   style="display:flex"></div>
    <div id="view-settings" style="display:none"></div>
    <textarea id="settings-desc">Some description</textarea>
    <select id="settings-category"><option value="general" selected>General</option></select>
    <input type="checkbox" id="settings-is-public" checked>
    <div id="settings-emoji-selected" data-emoji="⚔️">⚔️</div>
    <div class="settings-emoji-opt" data-emoji="⚔️">⚔️</div>
    <div class="settings-emoji-opt" data-emoji="🔥">🔥</div>
    <input type="radio" name="join-mode" value="open"         ${joinModeChecked === 'open'         ? 'checked' : ''}>
    <input type="radio" name="join-mode" value="requirements" ${joinModeChecked === 'requirements' ? 'checked' : ''}>
    <input type="radio" name="join-mode" value="audition"     ${joinModeChecked === 'audition'     ? 'checked' : ''}>
    <input type="radio" name="join-mode" value="invite_only"  ${joinModeChecked === 'invite_only'  ? 'checked' : ''}>
    <div id="settings-requirements-section" style="display:none"></div>
    <div id="settings-audition-section"     style="display:none"></div>
    <input  id="settings-min-elo"      value="1200">
    <select id="settings-min-tier"><option value="gold" selected>Gold</option><option value="">Any</option></select>
    <input  type="checkbox" id="settings-req-profile" checked>
    <select id="settings-aud-rule"><option value="first_come" selected>FC</option></select>
    <input  id="settings-aud-topic"    value="Climate">
    <select id="settings-aud-category"><option value="science" selected>Science</option><option value="">Any</option></select>
    <select id="settings-aud-ruleset" ><option value="oxford"  selected>Oxford</option> <option value="">Any</option></select>
    <select id="settings-aud-rounds"  ><option value="3"       selected>3</option>       <option value="">Any</option></select>
    <button id="settings-save-btn">SAVE</button>
    <div    id="settings-delete-confirm" style="display:none"></div>
    <input  id="settings-delete-name-input" value="">
    <button id="settings-delete-submit-btn">DELETE</button>
  `;
  HTMLElement.prototype.scrollIntoView = vi.fn() as unknown as typeof HTMLElement.prototype.scrollIntoView;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCurrentGroupId = 'group-abc';
  mockCallerRole     = 'leader';
  buildDOM();
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — openGroupSettings is leader-only: non-leader is blocked', () => {
  it('does not open settings view when callerRole is not leader', () => {
    mockCallerRole = 'member';
    openGroupSettings(makeGroup(), { onSaved: vi.fn(), onDeleted: vi.fn() });
    expect(
      (document.getElementById('view-settings') as HTMLElement).style.display
    ).toBe('none');
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — openGroupSettings proceeds for leader', () => {
  it('shows view-settings when callerRole is leader', () => {
    mockCallerRole = 'leader';
    openGroupSettings(makeGroup(), { onSaved: vi.fn(), onDeleted: vi.fn() });
    expect(
      (document.getElementById('view-settings') as HTMLElement).style.display
    ).toBe('flex');
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — submitGroupSettings calls RPC update_group_settings', () => {
  it('calls safeRpc with function name update_group_settings', async () => {
    await submitGroupSettings();
    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [rpcName] = mockSafeRpc.mock.calls[0];
    expect(rpcName).toBe('update_group_settings');
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — submitGroupSettings sends p_group_id', () => {
  it('sends p_group_id matching currentGroupId', async () => {
    await submitGroupSettings();
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_group_id).toBe('group-abc');
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — submitGroupSettings sends p_join_mode from selected radio', () => {
  it('sends p_join_mode = "open" when open radio is checked', async () => {
    await submitGroupSettings();
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_join_mode).toBe('open');
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — entry_requirements JSONB sent when join_mode=requirements; else empty {}', () => {
  it('sends non-empty entry_requirements when join_mode is requirements', async () => {
    buildDOM('requirements');
    await submitGroupSettings();
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_join_mode).toBe('requirements');
    // entry_requirements must be a non-empty object (spec: entry_requirements JSONB)
    expect(typeof params.p_entry_requirements).toBe('object');
    expect(Object.keys(params.p_entry_requirements).length).toBeGreaterThan(0);
  });

  it('sends empty {} for entry_requirements when join_mode is not requirements', async () => {
    buildDOM('open');
    await submitGroupSettings();
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_entry_requirements).toEqual({});
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — audition_config JSONB sent when join_mode=audition; else empty {}', () => {
  it('sends non-empty audition_config when join_mode is audition', async () => {
    buildDOM('audition');
    await submitGroupSettings();
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_join_mode).toBe('audition');
    // audition_config must be a non-empty object (spec: audition_config JSONB)
    expect(typeof params.p_audition_config).toBe('object');
    expect(Object.keys(params.p_audition_config).length).toBeGreaterThan(0);
  });

  it('sends empty {} for audition_config when join_mode is not audition', async () => {
    buildDOM('open');
    await submitGroupSettings();
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_audition_config).toEqual({});
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — on RPC success showToast("Settings saved")', () => {
  it('toasts "Settings saved" when update_group_settings succeeds', async () => {
    mockSafeRpc.mockResolvedValue({ error: null });
    await submitGroupSettings();
    expect(mockShowToast).toHaveBeenCalledWith('Settings saved');
  });
});

// ── TC9 ───────────────────────────────────────────────────────

describe('TC9 — on RPC error showToast with error message', () => {
  it('toasts the error message when update_group_settings fails', async () => {
    mockSafeRpc.mockResolvedValue({ error: { message: 'Not the leader' } });
    await submitGroupSettings();
    expect(mockShowToast).toHaveBeenCalledWith('Not the leader');
  });
});

// ── TC10 ──────────────────────────────────────────────────────

describe('TC10 — submitDeleteGroup: empty confirm name → toast, no RPC', () => {
  it('calls showToast and does not call safeRpc when confirm name is blank', async () => {
    (document.getElementById('settings-delete-name-input') as HTMLInputElement).value = '';
    await submitDeleteGroup();
    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalled();
  });
});

// ── TC11 ──────────────────────────────────────────────────────

describe('TC11 — submitDeleteGroup calls RPC delete_group', () => {
  it('calls safeRpc with function name delete_group', async () => {
    (document.getElementById('settings-delete-name-input') as HTMLInputElement).value = 'Arena Group';
    await submitDeleteGroup();
    expect(mockSafeRpc).toHaveBeenCalledTimes(1);
    const [rpcName] = mockSafeRpc.mock.calls[0];
    expect(rpcName).toBe('delete_group');
  });
});

// ── TC12 ──────────────────────────────────────────────────────

describe('TC12 — submitDeleteGroup sends p_confirm_name matching typed value', () => {
  it('sends exactly the typed confirmation name', async () => {
    (document.getElementById('settings-delete-name-input') as HTMLInputElement).value = 'Arena Group';
    await submitDeleteGroup();
    const [, params] = mockSafeRpc.mock.calls[0];
    expect(params.p_confirm_name).toBe('Arena Group');
  });
});

// ── TC13 ──────────────────────────────────────────────────────

describe('TC13 — onJoinModeChange("invite_only") hides both conditional sections', () => {
  it('both requirements and audition sections are hidden for invite_only mode', () => {
    onJoinModeChange('invite_only');
    expect(
      (document.getElementById('settings-requirements-section') as HTMLElement).style.display
    ).toBe('none');
    expect(
      (document.getElementById('settings-audition-section') as HTMLElement).style.display
    ).toBe('none');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/pages/groups.settings.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './groups.state.ts',
      './groups.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/groups.settings.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
