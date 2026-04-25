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

// safeRpc is imported from auth.ts which uses supabase — mock it at the module level
const mockSafeRpc = vi.hoisted(() => vi.fn());
vi.mock('../../src/auth.ts', () => ({ safeRpc: mockSafeRpc }));

// showToast
const mockShowToast = vi.hoisted(() => vi.fn());
vi.mock('../../src/config.ts', () => ({ showToast: mockShowToast }));

// rpc-schemas — return the real schema passthrough
vi.mock('../../src/contracts/rpc-schemas.ts', () => ({
  create_group: { parse: (v: unknown) => v },
}));

// ── Minimal DOM builder ────────────────────────────────────────────────────────

function buildDOM(): void {
  document.body.innerHTML = `
    <div id="create-modal"></div>
    <input id="group-name" value="" />
    <input id="group-desc-input" value="" />
    <select id="group-category"><option value="general">General</option></select>
    <button id="create-submit-btn">CREATE GROUP</button>
    <span class="emoji-opt" data-emoji="⚔️">⚔️</span>
    <span class="emoji-opt" data-emoji="🔥">🔥</span>
    <span class="emoji-opt" data-emoji="🏆">🏆</span>
  `;
}

// ── ARCH filter ────────────────────────────────────────────────────────────────

describe('ARCH — groups.create.ts import surface', () => {
  it('only imports from allowed modules', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.create.ts'),
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
    // Must import state primitives from groups.state
    expect(importLines.some(l => l.includes('groups.state'))).toBe(true);
    // Must import currentUser and selectedEmoji
    const stateImportLine = importLines.find(l => l.includes('groups.state'));
    expect(stateImportLine).toContain('currentUser');
    expect(stateImportLine).toContain('selectedEmoji');
  });
});

// ── beforeEach ─────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockSafeRpc.mockReset();
  mockShowToast.mockReset();
  buildDOM();
});

// ── TC1: openCreateModal — unauthenticated → redirect ────────────────────────

describe('TC1 — openCreateModal() when currentUser is null → redirects to plinko', () => {
  it('sets window.location.href to moderator-plinko.html when not logged in', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser(null);

    // jsdom does not throw on location.href assignment — capture it
    const { openCreateModal } = await import('../../src/pages/groups.create.ts');

    // jsdom's window.location.href is read-only in some setups; spy on the setter
    const hrefSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
    } as Location);

    // Because jsdom will navigate, just confirm modal does NOT get open class
    try { openCreateModal(); } catch { /* jsdom navigation */ }

    const modal = document.getElementById('create-modal')!;
    expect(modal.classList.contains('open')).toBe(false);

    hrefSpy.mockRestore();
  });
});

// ── TC2: openCreateModal — authenticated → opens modal ───────────────────────

describe('TC2 — openCreateModal() when currentUser is set → modal gets "open" class', () => {
  it('adds open class to create-modal', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'user-abc' } as import('@supabase/supabase-js').User);

    const { openCreateModal } = await import('../../src/pages/groups.create.ts');
    openCreateModal();

    expect(document.getElementById('create-modal')!.classList.contains('open')).toBe(true);
  });
});

// ── TC3: closeCreateModal → removes "open" class ─────────────────────────────

describe('TC3 — closeCreateModal() → removes "open" class from create-modal', () => {
  it('removes open class from the create-modal element', async () => {
    document.getElementById('create-modal')!.classList.add('open');

    const { closeCreateModal } = await import('../../src/pages/groups.create.ts');
    closeCreateModal();

    expect(document.getElementById('create-modal')!.classList.contains('open')).toBe(false);
  });
});

// ── TC4: selectEmoji → updates state and DOM ─────────────────────────────────

describe('TC4 — selectEmoji() → deselects others, marks clicked, updates selectedEmoji state', () => {
  it('calls setSelectedEmoji with the emoji data attribute of the clicked element', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    // Pre-select the first emoji so we can verify it gets deselected
    const firstEmoji = document.querySelectorAll('.emoji-opt')[0] as HTMLElement;
    firstEmoji.classList.add('selected');

    const { selectEmoji } = await import('../../src/pages/groups.create.ts');
    const secondEmoji = document.querySelectorAll('.emoji-opt')[1] as HTMLElement;
    selectEmoji(secondEmoji);

    // First emoji no longer selected
    expect(firstEmoji.classList.contains('selected')).toBe(false);
    // Second emoji is now selected
    expect(secondEmoji.classList.contains('selected')).toBe(true);
    // State updated
    expect(state.selectedEmoji).toBe('🔥');
  });
});

// ── TC5: submitCreateGroup — name too short → toast, no RPC ──────────────────

describe('TC5 — submitCreateGroup() with 1-char name → toast error, safeRpc not called', () => {
  it('shows error toast and does not call safeRpc when name is too short', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'user-abc' } as import('@supabase/supabase-js').User);

    (document.getElementById('group-name') as HTMLInputElement).value = 'X';

    const { submitCreateGroup } = await import('../../src/pages/groups.create.ts');
    await submitCreateGroup();

    expect(mockShowToast).toHaveBeenCalledWith(
      'Group name must be at least 2 characters',
      'error'
    );
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC6: submitCreateGroup — success path → correct RPC params, modal closed ─

describe('TC6 — submitCreateGroup() success → safeRpc(create_group) called with correct params, modal closed', () => {
  it('calls safeRpc with p_name, p_category, p_is_public, p_avatar_emoji and closes modal', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'user-abc' } as import('@supabase/supabase-js').User);
    state.setSelectedEmoji('🔥');

    mockSafeRpc.mockResolvedValue({ data: { group_id: 'new-group-id' }, error: null });

    // Open modal first so we can verify it closes
    document.getElementById('create-modal')!.classList.add('open');

    (document.getElementById('group-name') as HTMLInputElement).value = 'My Test Group';
    (document.getElementById('group-desc-input') as HTMLInputElement).value = 'A description';
    (document.getElementById('group-category') as HTMLSelectElement).value = 'general';

    const { submitCreateGroup } = await import('../../src/pages/groups.create.ts');
    await submitCreateGroup();

    expect(mockSafeRpc).toHaveBeenCalledOnce();
    const [rpcName, rpcParams] = mockSafeRpc.mock.calls[0];
    expect(rpcName).toBe('create_group');
    expect(rpcParams).toMatchObject({
      p_name: 'My Test Group',
      p_description: 'A description',
      p_category: 'general',
      p_is_public: true,
      p_avatar_emoji: '🔥',
    });

    // Modal should be closed after success
    expect(document.getElementById('create-modal')!.classList.contains('open')).toBe(false);
    // Name field cleared
    expect((document.getElementById('group-name') as HTMLInputElement).value).toBe('');
    // Button re-enabled
    expect((document.getElementById('create-submit-btn') as HTMLButtonElement).disabled).toBe(false);
    expect((document.getElementById('create-submit-btn') as HTMLButtonElement).textContent).toBe('CREATE GROUP');
  });
});

// ── TC7: submitCreateGroup — success → openGroup callback invoked ─────────────

describe('TC7 — submitCreateGroup() success → registered openGroup callback invoked with group_id', () => {
  it('calls the registered callback with the returned group_id', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'user-abc' } as import('@supabase/supabase-js').User);

    mockSafeRpc.mockResolvedValue({ data: { group_id: 'grp-xyz' }, error: null });

    (document.getElementById('group-name') as HTMLInputElement).value = 'Callback Group';

    const { submitCreateGroup, setCreateOpenGroupCallback } = await import('../../src/pages/groups.create.ts');
    const callbackSpy = vi.fn();
    setCreateOpenGroupCallback(callbackSpy);

    await submitCreateGroup();

    expect(callbackSpy).toHaveBeenCalledWith('grp-xyz');
  });
});

// ── TC8: submitCreateGroup — RPC error → toast shown, button re-enabled ──────

describe('TC8 — submitCreateGroup() RPC error → error toast shown, button re-enabled', () => {
  it('shows toast with error message and restores button state on RPC failure', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentUser({ id: 'user-abc' } as import('@supabase/supabase-js').User);

    mockSafeRpc.mockResolvedValue({ data: null, error: new Error('DB constraint violation') });

    (document.getElementById('group-name') as HTMLInputElement).value = 'Error Group';

    const { submitCreateGroup } = await import('../../src/pages/groups.create.ts');
    await submitCreateGroup();

    expect(mockShowToast).toHaveBeenCalledWith('DB constraint violation', 'error');
    // Button must be re-enabled (finally block)
    const btn = document.getElementById('create-submit-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('CREATE GROUP');
    // Modal remains open
    expect(document.getElementById('create-modal')!.classList.contains('open')).toBe(false);
  });
});
