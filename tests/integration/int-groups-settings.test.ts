import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRpcFn = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpcFn, auth: mockAuth })),
}));

// ── ARCH filter ───────────────────────────────────────────────────────────────

describe('ARCH — groups.settings.ts import surface', () => {
  it('only imports from allowed modules', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.settings.ts'),
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
    // Must import currentGroupId and callerRole from groups.state
    expect(importLines.some(l => l.includes('groups.state'))).toBe(true);
  });
});

// ── DOM helpers ───────────────────────────────────────────────────────────────

function setupDOM() {
  document.body.innerHTML = `
    <div id="view-detail" style="display:flex"></div>
    <div id="view-settings" style="display:none">
      <textarea id="settings-desc"></textarea>
      <select id="settings-category"><option value="general">General</option><option value="sports">Sports</option></select>
      <input type="checkbox" id="settings-is-public" checked />
      <span id="settings-emoji-selected" data-emoji="⚔️">⚔️</span>
      <input type="radio" name="join-mode" value="open" checked />
      <input type="radio" name="join-mode" value="requirements" />
      <input type="radio" name="join-mode" value="audition" />
      <div id="settings-requirements-section" style="display:none"></div>
      <div id="settings-audition-section" style="display:none"></div>
      <input id="settings-min-elo" value="" />
      <select id="settings-min-tier"><option value="">None</option><option value="gold">Gold</option></select>
      <input type="checkbox" id="settings-req-profile" />
      <select id="settings-aud-rule"><option value="allowed_by_leader">Leader</option><option value="open">Open</option></select>
      <input id="settings-aud-topic" value="" />
      <select id="settings-aud-category"><option value="">None</option></select>
      <select id="settings-aud-ruleset"><option value="">None</option></select>
      <select id="settings-aud-rounds"><option value="">None</option></select>
      <button id="settings-save-btn">SAVE</button>
      <div id="settings-delete-confirm" style="display:none">
        <input id="settings-delete-name-input" value="" />
        <button id="settings-delete-submit-btn">DELETE FOREVER</button>
      </div>
      <div class="settings-emoji-opt" data-emoji="⚔️"></div>
      <div class="settings-emoji-opt" data-emoji="🔥"></div>
    </div>
  `;
}

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  setupDOM();
  mockRpcFn.mockReset();
});

// ── TC-1: openGroupSettings blocks non-leaders ────────────────────────────────

describe('TC-1 — openGroupSettings blocks non-leaders', () => {
  it('does not change DOM visibility when callerRole is not leader', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCallerRole('member');

    const { openGroupSettings } = await import('../../src/pages/groups.settings.ts');

    const onSaved = vi.fn();
    const onDeleted = vi.fn();

    const viewSettings = document.getElementById('view-settings')!;
    const viewDetail   = document.getElementById('view-detail')!;
    const initialSettingsDisplay = viewSettings.style.display;
    const initialDetailDisplay   = viewDetail.style.display;

    openGroupSettings(
      { id: 'g1', name: 'TestGroup', description: null, category: 'general',
        is_public: true, avatar_emoji: '⚔️', join_mode: 'open',
        entry_requirements: {}, audition_config: {}, member_count: 0,
        pending_count: 0, user_role: null },
      { onSaved, onDeleted }
    );

    // DOM should not have changed
    expect(viewSettings.style.display).toBe(initialSettingsDisplay);
    expect(viewDetail.style.display).toBe(initialDetailDisplay);
    expect(onSaved).not.toHaveBeenCalled();
  });
});

// ── TC-2: openGroupSettings shows settings for leader ────────────────────────

describe('TC-2 — openGroupSettings shows settings view for leader', () => {
  it('toggles view-settings visible and view-detail hidden', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCallerRole('leader');

    const { openGroupSettings } = await import('../../src/pages/groups.settings.ts');

    const onSaved   = vi.fn();
    const onDeleted = vi.fn();

    openGroupSettings(
      { id: 'g1', name: 'TestGroup', description: 'desc', category: 'general',
        is_public: true, avatar_emoji: '⚔️', join_mode: 'open',
        entry_requirements: {}, audition_config: {}, member_count: 5,
        pending_count: 0, user_role: 'leader' },
      { onSaved, onDeleted }
    );

    expect(document.getElementById('view-settings')!.style.display).toBe('flex');
    expect(document.getElementById('view-detail')!.style.display).toBe('none');
  });
});

// ── TC-3: closeGroupSettings restores detail view ────────────────────────────

describe('TC-3 — closeGroupSettings restores detail view', () => {
  it('hides view-settings and shows view-detail', async () => {
    const { closeGroupSettings } = await import('../../src/pages/groups.settings.ts');

    // Simulate settings being open
    document.getElementById('view-settings')!.style.display = 'flex';
    document.getElementById('view-detail')!.style.display   = 'none';

    closeGroupSettings();

    expect(document.getElementById('view-settings')!.style.display).toBe('none');
    expect(document.getElementById('view-detail')!.style.display).toBe('flex');
    expect(document.getElementById('settings-delete-confirm')!.style.display).toBe('none');
  });
});

// ── TC-4: onJoinModeChange('requirements') ───────────────────────────────────

describe('TC-4 — onJoinModeChange requirements', () => {
  it('shows requirements section, hides audition section', async () => {
    const { onJoinModeChange } = await import('../../src/pages/groups.settings.ts');

    onJoinModeChange('requirements');

    expect(document.getElementById('settings-requirements-section')!.style.display).toBe('block');
    expect(document.getElementById('settings-audition-section')!.style.display).toBe('none');
  });
});

// ── TC-5: onJoinModeChange('audition') ───────────────────────────────────────

describe('TC-5 — onJoinModeChange audition', () => {
  it('shows audition section, hides requirements section', async () => {
    const { onJoinModeChange } = await import('../../src/pages/groups.settings.ts');

    onJoinModeChange('audition');

    expect(document.getElementById('settings-requirements-section')!.style.display).toBe('none');
    expect(document.getElementById('settings-audition-section')!.style.display).toBe('block');
  });
});

// ── TC-6: onJoinModeChange('open') ───────────────────────────────────────────

describe('TC-6 — onJoinModeChange open', () => {
  it('hides both requirements and audition sections', async () => {
    const { onJoinModeChange } = await import('../../src/pages/groups.settings.ts');

    // First open them, then switch to open
    onJoinModeChange('requirements');
    onJoinModeChange('open');

    expect(document.getElementById('settings-requirements-section')!.style.display).toBe('none');
    expect(document.getElementById('settings-audition-section')!.style.display).toBe('none');
  });
});

// ── TC-7: submitGroupSettings calls safeRpc with currentGroupId ──────────────

describe('TC-7 — submitGroupSettings calls update_group_settings with currentGroupId', () => {
  it('invokes safeRpc with the correct RPC name and group id', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentGroupId('group-uuid-123');

    mockRpcFn.mockResolvedValue({ data: null, error: null });

    const { submitGroupSettings } = await import('../../src/pages/groups.settings.ts');

    // Set join mode to open (radio already checked)
    const openRadio = document.querySelector('input[name="join-mode"][value="open"]') as HTMLInputElement;
    openRadio.checked = true;

    await submitGroupSettings();

    // safeRpc wraps supabase rpc — check the underlying mock
    expect(mockRpcFn).toHaveBeenCalledWith(
      'update_group_settings',
      expect.objectContaining({
        p_group_id: 'group-uuid-123',
        p_join_mode: 'open',
      })
    );
  });
});

// ── TC-8: submitGroupSettings with requirements join_mode ────────────────────

describe('TC-8 — submitGroupSettings sends entry_requirements when join_mode is requirements', () => {
  it('includes min_elo and min_tier in p_entry_requirements', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentGroupId('group-req-456');

    mockRpcFn.mockResolvedValue({ data: null, error: null });

    const { submitGroupSettings } = await import('../../src/pages/groups.settings.ts');

    // Set join mode to requirements
    const reqRadio = document.querySelector('input[name="join-mode"][value="requirements"]') as HTMLInputElement;
    reqRadio.checked = true;
    (document.querySelector('input[name="join-mode"][value="open"]') as HTMLInputElement).checked = false;

    // Populate requirements fields
    (document.getElementById('settings-min-elo') as HTMLInputElement).value = '1200';
    (document.getElementById('settings-min-tier') as HTMLSelectElement).value = 'gold';
    (document.getElementById('settings-req-profile') as HTMLInputElement).checked = true;

    await submitGroupSettings();

    expect(mockRpcFn).toHaveBeenCalledWith(
      'update_group_settings',
      expect.objectContaining({
        p_group_id: 'group-req-456',
        p_join_mode: 'requirements',
        p_entry_requirements: expect.objectContaining({
          min_elo: 1200,
          min_tier: 'gold',
          require_profile_complete: true,
        }),
        p_audition_config: {},
      })
    );
  });
});

// ── TC-9: submitGroupSettings with audition join_mode ────────────────────────

describe('TC-9 — submitGroupSettings sends audition_config when join_mode is audition', () => {
  it('includes locked_topic and rule in p_audition_config', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentGroupId('group-aud-789');

    mockRpcFn.mockResolvedValue({ data: null, error: null });

    const { submitGroupSettings } = await import('../../src/pages/groups.settings.ts');

    // Set join mode to audition
    const audRadio = document.querySelector('input[name="join-mode"][value="audition"]') as HTMLInputElement;
    audRadio.checked = true;
    (document.querySelector('input[name="join-mode"][value="open"]') as HTMLInputElement).checked = false;

    // Populate audition fields
    (document.getElementById('settings-aud-topic') as HTMLInputElement).value = 'Best pizza topping';
    (document.getElementById('settings-aud-rule') as HTMLSelectElement).value = 'open';

    await submitGroupSettings();

    expect(mockRpcFn).toHaveBeenCalledWith(
      'update_group_settings',
      expect.objectContaining({
        p_group_id: 'group-aud-789',
        p_join_mode: 'audition',
        p_entry_requirements: {},
        p_audition_config: expect.objectContaining({
          rule: 'open',
          locked_topic: 'Best pizza topping',
        }),
      })
    );
  });
});

// ── TC-10: submitDeleteGroup requires name confirmation ───────────────────────

describe('TC-10 — submitDeleteGroup rejects empty confirmation name', () => {
  it('shows toast and does not call delete_group RPC when name input is empty', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentGroupId('group-del-000');

    mockRpcFn.mockResolvedValue({ data: null, error: null });

    const { submitDeleteGroup } = await import('../../src/pages/groups.settings.ts');

    // Leave input empty
    (document.getElementById('settings-delete-name-input') as HTMLInputElement).value = '';

    await submitDeleteGroup();

    expect(mockRpcFn).not.toHaveBeenCalled();
  });
});

// ── TC-11: submitDeleteGroup calls delete_group RPC with correct params ───────

describe('TC-11 — submitDeleteGroup calls delete_group with currentGroupId and confirm name', () => {
  it('invokes safeRpc delete_group with p_group_id and p_confirm_name', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentGroupId('group-del-abc');

    mockRpcFn.mockResolvedValue({ data: null, error: null });

    const { submitDeleteGroup } = await import('../../src/pages/groups.settings.ts');

    (document.getElementById('settings-delete-name-input') as HTMLInputElement).value = 'My Group';

    await submitDeleteGroup();

    expect(mockRpcFn).toHaveBeenCalledWith(
      'delete_group',
      expect.objectContaining({
        p_group_id: 'group-del-abc',
        p_confirm_name: 'My Group',
      })
    );

    // view-settings should be hidden after deletion
    expect(document.getElementById('view-settings')!.style.display).toBe('none');
  });
});

// ── TC-12: selectSettingsEmoji updates emoji display ─────────────────────────

describe('TC-12 — selectSettingsEmoji updates selected emoji display element', () => {
  it('marks selected option and updates settings-emoji-selected element', async () => {
    const { selectSettingsEmoji } = await import('../../src/pages/groups.settings.ts');

    const emojiOpts = document.querySelectorAll('.settings-emoji-opt');
    const fireEmoji = emojiOpts[1] as HTMLElement; // data-emoji="🔥"

    selectSettingsEmoji(fireEmoji);

    const display = document.getElementById('settings-emoji-selected') as HTMLElement;
    expect(display.dataset.emoji).toBe('🔥');
    expect(display.textContent).toBe('🔥');
    expect(fireEmoji.classList.contains('selected')).toBe(true);

    // Other emoji should not be selected
    expect(emojiOpts[0].classList.contains('selected')).toBe(false);
  });
});

// ── TC-13: showDeleteConfirm reveals the danger zone ─────────────────────────

describe('TC-13 — showDeleteConfirm shows the delete confirmation block', () => {
  it('makes settings-delete-confirm visible and clears input', async () => {
    const { showDeleteConfirm } = await import('../../src/pages/groups.settings.ts');

    // Pre-populate input to verify it's cleared
    (document.getElementById('settings-delete-name-input') as HTMLInputElement).value = 'old value';

    // jsdom does not implement scrollIntoView — stub it
    const confirmEl = document.getElementById('settings-delete-confirm')!;
    confirmEl.scrollIntoView = vi.fn();

    showDeleteConfirm();

    expect(confirmEl.style.display).toBe('block');
    expect((document.getElementById('settings-delete-name-input') as HTMLInputElement).value).toBe('');
  });
});
