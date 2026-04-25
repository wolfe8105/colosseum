// ============================================================
// GROUPS SETTINGS — tests/groups-settings.test.ts
// Source: src/pages/groups.settings.ts
//
// CLASSIFICATION:
//   openGroupSettings():   DOM behavioral — leader-only, opens settings view
//   closeGroupSettings():  DOM behavioral — closes settings view
//   onJoinModeChange():    DOM behavioral — shows/hides conditional sections
//   submitGroupSettings(): RPC behavioral — saves settings
//   showDeleteConfirm():   DOM behavioral — shows delete confirm section
//   submitDeleteGroup():   RPC behavioral — deletes group
//   selectSettingsEmoji(): DOM behavioral — selects emoji option
//
// IMPORTS:
//   { safeRpc }                 from '../auth.ts'
//   { escapeHTML, showToast }   from '../config.ts'
//   { currentGroupId, callerRole } from './groups.state.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc   = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockShowToast = vi.hoisted(() => vi.fn());

let mockCurrentGroupId: string | null = 'g1';
let mockCallerRole: string | null = 'leader';

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  onChange: vi.fn(),
  ready: Promise.resolve(),
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  escapeHTML: (s: string) => s,
  FEATURES: {},
}));

vi.mock('../src/pages/groups.state.ts', () => ({
  get currentGroupId() { return mockCurrentGroupId; },
  get callerRole()     { return mockCallerRole; },
  currentUser: null,
  isMember: false,
  setCurrentGroupId: vi.fn(),
  setIsMember: vi.fn(),
  setCallerRole: vi.fn(),
}));

vi.mock('../src/pages/groups.types.ts', () => ({}));

import {
  openGroupSettings,
  closeGroupSettings,
  onJoinModeChange,
  showDeleteConfirm,
  submitDeleteGroup,
  selectSettingsEmoji,
} from '../src/pages/groups.settings.ts';
import type { GroupDetail } from '../src/pages/groups.types.ts';

// ── Helpers ───────────────────────────────────────────────────

function makeGroup(overrides: Partial<GroupDetail> = {}): GroupDetail {
  return {
    id: 'g1',
    name: 'Test Group',
    description: 'A great group',
    avatar_emoji: '⚔️',
    is_public: true,
    join_mode: 'open',
    category: 'general',
    entry_requirements: {},
    audition_config: {},
    ...overrides,
  } as GroupDetail;
}

function buildDOM() {
  document.body.innerHTML = `
    <div id="view-detail" style="display:flex"></div>
    <div id="view-settings" style="display:none"></div>
    <textarea id="settings-desc"></textarea>
    <select id="settings-category"><option value="general">General</option></select>
    <input type="checkbox" id="settings-is-public">
    <div id="settings-emoji-selected" data-emoji="⚔️">⚔️</div>
    <div class="settings-emoji-opt" data-emoji="⚔️">⚔️</div>
    <div class="settings-emoji-opt" data-emoji="🔥">🔥</div>
    <input type="radio" name="join-mode" value="open" checked>
    <input type="radio" name="join-mode" value="requirements">
    <input type="radio" name="join-mode" value="audition">
    <div id="settings-requirements-section" style="display:none"></div>
    <div id="settings-audition-section" style="display:none"></div>
    <input id="settings-min-elo" value="">
    <select id="settings-min-tier"><option value="">Any</option></select>
    <input type="checkbox" id="settings-req-profile">
    <select id="settings-aud-rule"><option value="allowed_by_leader">Leader</option></select>
    <input id="settings-aud-topic" value="">
    <select id="settings-aud-category"><option value="">Any</option></select>
    <select id="settings-aud-ruleset"><option value="">Any</option></select>
    <select id="settings-aud-rounds"><option value="">Any</option></select>
    <button id="settings-save-btn">SAVE</button>
    <div id="settings-delete-confirm" style="display:none"></div>
    <input id="settings-delete-name-input" value="">
    <button id="settings-delete-submit-btn">DELETE</button>
  `;
  // scrollIntoView polyfill
  HTMLElement.prototype.scrollIntoView = vi.fn() as unknown as typeof HTMLElement.prototype.scrollIntoView;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCurrentGroupId = 'g1';
  mockCallerRole = 'leader';
  buildDOM();
});

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — openGroupSettings shows settings view for leader', () => {
  it('sets view-settings display to flex', () => {
    openGroupSettings(makeGroup(), { onSaved: vi.fn(), onDeleted: vi.fn() });
    expect((document.getElementById('view-settings') as HTMLElement).style.display).toBe('flex');
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — openGroupSettings does nothing for non-leader', () => {
  it('returns early when callerRole is not leader', () => {
    mockCallerRole = 'member';
    openGroupSettings(makeGroup(), { onSaved: vi.fn(), onDeleted: vi.fn() });
    expect((document.getElementById('view-settings') as HTMLElement).style.display).toBe('none');
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — closeGroupSettings hides settings view and shows detail view', () => {
  it('swaps display between view-settings and view-detail', () => {
    (document.getElementById('view-settings') as HTMLElement).style.display = 'flex';
    (document.getElementById('view-detail') as HTMLElement).style.display   = 'none';
    closeGroupSettings();
    expect((document.getElementById('view-settings') as HTMLElement).style.display).toBe('none');
    expect((document.getElementById('view-detail') as HTMLElement).style.display).toBe('flex');
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — onJoinModeChange shows requirements section for "requirements" mode', () => {
  it('sets settings-requirements-section display to block', () => {
    onJoinModeChange('requirements');
    expect((document.getElementById('settings-requirements-section') as HTMLElement).style.display).toBe('block');
    expect((document.getElementById('settings-audition-section') as HTMLElement).style.display).toBe('none');
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — onJoinModeChange shows audition section for "audition" mode', () => {
  it('sets settings-audition-section display to block', () => {
    onJoinModeChange('audition');
    expect((document.getElementById('settings-audition-section') as HTMLElement).style.display).toBe('block');
    expect((document.getElementById('settings-requirements-section') as HTMLElement).style.display).toBe('none');
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — onJoinModeChange hides both sections for "open" mode', () => {
  it('both sections hidden for open join mode', () => {
    onJoinModeChange('open');
    expect((document.getElementById('settings-requirements-section') as HTMLElement).style.display).toBe('none');
    expect((document.getElementById('settings-audition-section') as HTMLElement).style.display).toBe('none');
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — showDeleteConfirm shows delete confirm section', () => {
  it('sets settings-delete-confirm display to block', () => {
    showDeleteConfirm();
    expect((document.getElementById('settings-delete-confirm') as HTMLElement).style.display).toBe('block');
  });
});

// ── TC8 ───────────────────────────────────────────────────────

describe('TC8 — submitDeleteGroup does nothing when confirm name is empty', () => {
  it('calls showToast and does not call safeRpc', async () => {
    (document.getElementById('settings-delete-name-input') as HTMLInputElement).value = '';
    await submitDeleteGroup();
    expect(mockSafeRpc).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalled();
  });
});

// ── TC9 ───────────────────────────────────────────────────────

describe('TC9 — submitDeleteGroup calls safeRpc delete_group with confirm name', () => {
  it('calls safeRpc with p_confirm_name', async () => {
    mockSafeRpc.mockResolvedValue({ error: null });
    (document.getElementById('settings-delete-name-input') as HTMLInputElement).value = 'Test Group';
    // Need view-settings in DOM for onGroupDeleted path
    await submitDeleteGroup();
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'delete_group',
      expect.objectContaining({ p_confirm_name: 'Test Group' })
    );
  });
});

// ── TC10 ──────────────────────────────────────────────────────

describe('TC10 — selectSettingsEmoji marks clicked emoji as selected', () => {
  it('adds "selected" class to clicked option and updates display', () => {
    // Use the first .settings-emoji-opt element (avoids emoji encoding issues in jsdom data attrs)
    const opt = document.querySelectorAll<HTMLElement>('.settings-emoji-opt')[0]!;
    const emoji = opt.dataset.emoji ?? '⚔️';
    selectSettingsEmoji(opt);
    expect(opt.classList.contains('selected')).toBe(true);
    expect((document.getElementById('settings-emoji-selected') as HTMLElement).dataset.emoji).toBe(emoji);
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
