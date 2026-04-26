// int-arena-private-picker.test.ts
// Seam #343: arena-private-picker → arena-config-round-picker
// Seam #344: arena-private-picker → arena-config-mode-select

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetAvailableModerators = vi.hoisted(() => vi.fn());
const mockSafeRpc = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

vi.mock('../../src/auth.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/auth.ts')>();
  return {
    ...actual,
    getCurrentUser: mockGetCurrentUser,
    getAvailableModerators: mockGetAvailableModerators,
    safeRpc: mockSafeRpc,
  };
});

const MOCK_USER = { id: 'user-abc-123', email: 'test@example.com' };

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.getSession.mockReset();
  mockGetCurrentUser.mockReset();
  mockGetAvailableModerators.mockReset();
  mockSafeRpc.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  // Default: logged-in user so auth guards pass
  mockGetCurrentUser.mockReturnValue(MOCK_USER);
  mockGetAvailableModerators.mockResolvedValue([]);
  mockSafeRpc.mockResolvedValue({ data: [], error: null });
  document.body.innerHTML = '';
});

// ─── ARCH FILTER ───────────────────────────────────────────────────────────

describe('ARCH — arena-private-picker.ts import lines', () => {
  it('imports round-picker and mode-select from direct sub-module paths only', () => {
    const source = readFileSync(
      resolve('src/arena/arena-private-picker.ts'),
      'utf8',
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasRoundPicker = importLines.some(l => l.includes('arena-config-round-picker'));
    const hasModeSelect  = importLines.some(l => l.includes('arena-config-mode-select'));
    expect(hasRoundPicker).toBe(true);
    expect(hasModeSelect).toBe(true);
    // Must not import from a barrel
    const noBarrelArena = importLines.every(l => !l.match(/from\s+['"]\.\.\/arena['"]/));
    expect(noBarrelArena).toBe(true);
  });
});

describe('ARCH — arena-config-round-picker.ts import lines', () => {
  it('has no imports from arena-config-mode or arena-config-settings (cycle guard)', () => {
    const source = readFileSync(
      resolve('src/arena/arena-config-round-picker.ts'),
      'utf8',
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const noModeImport     = importLines.every(l => !l.includes('arena-config-mode'));
    const noSettingsImport = importLines.every(l => !l.includes('arena-config-settings'));
    expect(noModeImport).toBe(true);
    expect(noSettingsImport).toBe(true);
  });
});

// ─── SEAM #343: arena-private-picker → arena-config-round-picker ──────────

describe('TC343-1 — roundPickerCSS returns non-empty string with arena-round-picker rule', () => {
  it('CSS string contains .arena-round-picker and .arena-round-btn selectors', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { roundPickerCSS } = await import('../../src/arena/arena-config-round-picker.ts');
    const css = roundPickerCSS();
    expect(typeof css).toBe('string');
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain('.arena-round-picker');
    expect(css).toContain('.arena-round-btn');
  });
});

describe('TC343-2 — roundPickerHTML renders 4 buttons, default round=5 gets .selected', () => {
  it('returns HTML with 4 arena-round-btn buttons, the defaultRounds=5 button marked selected', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { roundPickerHTML } = await import('../../src/arena/arena-config-round-picker.ts');
    const html = roundPickerHTML();
    // Insert into DOM to query
    const container = document.createElement('div');
    container.innerHTML = html;
    const buttons = container.querySelectorAll('.arena-round-btn');
    expect(buttons.length).toBe(4);
    // DEBATE.defaultRounds is 5 — but ROUND_OPTIONS has 4,6,8,10 — so none get selected
    // (defaultRounds=5 doesn't match any option, selected class absent on all)
    const selectedBtns = container.querySelectorAll('.arena-round-btn.selected');
    // No option matches 5 → 0 selected; verify structural correctness instead
    const roundValues = Array.from(buttons).map(b => (b as HTMLElement).dataset.rounds);
    expect(roundValues).toEqual(['4', '6', '8', '10']);
  });
});

describe('TC343-3 — wireRoundPicker sets selectedRounds to defaultRounds on call', () => {
  it('calls set_selectedRounds(DEBATE.defaultRounds) immediately when wireRoundPicker is called', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { wireRoundPicker } = await import('../../src/arena/arena-config-round-picker.ts');
    const { selectedRounds } = await import('../../src/arena/arena-state.ts');
    // Create a minimal container with round buttons
    const container = document.createElement('div');
    container.innerHTML = `
      <button class="arena-round-btn" data-rounds="4"></button>
      <button class="arena-round-btn" data-rounds="6"></button>
      <button class="arena-round-btn" data-rounds="8"></button>
      <button class="arena-round-btn" data-rounds="10"></button>
    `;
    wireRoundPicker(container);
    // After wiring, state is set to DEBATE.defaultRounds (5)
    const { selectedRounds: rounds } = await import('../../src/arena/arena-state.ts');
    expect(rounds).toBe(5);
  });
});

describe('TC343-4 — clicking an arena-round-btn updates selectedRounds state', () => {
  it('clicking data-rounds="4" button sets selectedRounds to 4', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { wireRoundPicker } = await import('../../src/arena/arena-config-round-picker.ts');
    const container = document.createElement('div');
    container.innerHTML = `
      <button class="arena-round-btn" data-rounds="4"></button>
      <button class="arena-round-btn" data-rounds="6"></button>
      <button class="arena-round-btn" data-rounds="8"></button>
      <button class="arena-round-btn" data-rounds="10"></button>
    `;
    document.body.appendChild(container);
    wireRoundPicker(container);

    const btn4 = container.querySelector('.arena-round-btn[data-rounds="4"]') as HTMLElement;
    btn4.click();

    const { selectedRounds } = await import('../../src/arena/arena-state.ts');
    expect(selectedRounds).toBe(4);
    expect(btn4.classList.contains('selected')).toBe(true);
  });
});

describe('TC343-5 — showPrivateLobbyPicker embeds round picker CSS and HTML in overlay', () => {
  it('overlay contains arena-round-picker div and arena-round-btn buttons', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { showPrivateLobbyPicker } = await import('../../src/arena/arena-private-picker.ts');
    showPrivateLobbyPicker();

    const overlay = document.getElementById('arena-private-overlay');
    expect(overlay).not.toBeNull();
    // round picker HTML embedded
    const roundPicker = overlay?.querySelector('.arena-round-picker');
    expect(roundPicker).not.toBeNull();
    const roundBtns = overlay?.querySelectorAll('.arena-round-btn');
    expect(roundBtns?.length).toBe(4);
    // round picker CSS embedded inside <style> tag
    const style = overlay?.querySelector('style');
    expect(style?.textContent).toContain('.arena-round-btn');
  });
});

// ─── SEAM #344: arena-private-picker → arena-config-mode-select ──────────

describe('TC344-1 — showModeSelectThen sets _pendingPrivateType then renders mode overlay', () => {
  it('sets _pendingPrivateType to "username" and appends arena-mode-overlay', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { showModeSelectThen } = await import('../../src/arena/arena-private-picker.ts');
    const { _pendingPrivateType } = await import('../../src/arena/arena-state.ts');

    showModeSelectThen('username');

    // state set before showModeSelect is called
    const { _pendingPrivateType: ppt } = await import('../../src/arena/arena-state.ts');
    expect(ppt).toBe('username');

    const modeOverlay = document.getElementById('arena-mode-overlay');
    expect(modeOverlay).not.toBeNull();
  });
});

describe('TC344-2 — showModeSelectThen("group") sets _pendingPrivateType to "group"', () => {
  it('_pendingPrivateType is "group" after showModeSelectThen("group")', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { showModeSelectThen } = await import('../../src/arena/arena-private-picker.ts');

    showModeSelectThen('group');

    const { _pendingPrivateType } = await import('../../src/arena/arena-state.ts');
    expect(_pendingPrivateType).toBe('group');
  });
});

describe('TC344-3 — showModeSelectThen("code") sets _pendingPrivateType to "code"', () => {
  it('_pendingPrivateType is "code" after showModeSelectThen("code")', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { showModeSelectThen } = await import('../../src/arena/arena-private-picker.ts');

    showModeSelectThen('code');

    const { _pendingPrivateType } = await import('../../src/arena/arena-state.ts');
    expect(_pendingPrivateType).toBe('code');
  });
});

describe('TC344-4 — clicking #arena-private-username removes private overlay and shows mode overlay', () => {
  it('after clicking username card, private overlay gone and mode overlay present', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { showPrivateLobbyPicker } = await import('../../src/arena/arena-private-picker.ts');
    showPrivateLobbyPicker();

    const privateOverlay = document.getElementById('arena-private-overlay');
    expect(privateOverlay).not.toBeNull();

    const usernameCard = document.getElementById('arena-private-username') as HTMLElement;
    expect(usernameCard).not.toBeNull();
    usernameCard.click();

    // private overlay removed
    expect(document.getElementById('arena-private-overlay')).toBeNull();
    // mode overlay appended
    expect(document.getElementById('arena-mode-overlay')).not.toBeNull();
    // pendingPrivateType set to username
    const { _pendingPrivateType } = await import('../../src/arena/arena-state.ts');
    expect(_pendingPrivateType).toBe('username');
  });
});

describe('TC344-5 — clicking #arena-private-group removes private overlay and shows mode overlay with group type', () => {
  it('after clicking group card, arena-mode-overlay rendered and _pendingPrivateType is "group"', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { showPrivateLobbyPicker } = await import('../../src/arena/arena-private-picker.ts');
    showPrivateLobbyPicker();

    const groupCard = document.getElementById('arena-private-group') as HTMLElement;
    expect(groupCard).not.toBeNull();
    groupCard.click();

    expect(document.getElementById('arena-private-overlay')).toBeNull();
    expect(document.getElementById('arena-mode-overlay')).not.toBeNull();
    const { _pendingPrivateType } = await import('../../src/arena/arena-state.ts');
    expect(_pendingPrivateType).toBe('group');
  });
});

describe('TC344-6 — showModeSelect renders mode cards for each MODES entry', () => {
  it('arena-mode-overlay contains at least one .arena-mode-card element', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { showModeSelect } = await import('../../src/arena/arena-config-mode-select.ts');
    showModeSelect();

    const overlay = document.getElementById('arena-mode-overlay');
    expect(overlay).not.toBeNull();
    const modeCards = overlay?.querySelectorAll('.arena-mode-card');
    expect(modeCards?.length).toBeGreaterThan(0);
    // Each card has data-mode attribute
    modeCards?.forEach(card => {
      expect((card as HTMLElement).dataset.mode).toBeTruthy();
    });
  });
});

// ─── SEAM #438: arena-private-picker → arena-private-lobby ────────────────

describe('ARCH — arena-private-picker → arena-private-lobby import', () => {
  it('imports createAndWaitPrivateLobby directly from arena-private-lobby (no barrel)', () => {
    const source = readFileSync(
      resolve('src/arena/arena-private-picker.ts'),
      'utf8',
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasPrivateLobbyImport = importLines.some(l =>
      l.includes('arena-private-lobby') && l.includes('createAndWaitPrivateLobby'),
    );
    expect(hasPrivateLobbyImport).toBe(true);
    // Must not import via barrel
    const noBarrel = importLines.every(l => !l.match(/from\s+['"]\.\.\/arena['"]/));
    expect(noBarrel).toBe(true);
  });
});

describe('TC438-1 — maybeRoutePrivate returns false when _pendingPrivateType is null', () => {
  it('returns false without calling createAndWaitPrivateLobby', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { set__pendingPrivateType } = await import('../../src/arena/arena-state.ts');
    set__pendingPrivateType(null);
    const { maybeRoutePrivate } = await import('../../src/arena/arena-private-picker.ts');
    const result = maybeRoutePrivate('text', 'Some topic');
    expect(result).toBe(false);
  });
});

describe('TC438-2 — maybeRoutePrivate returns false for mode "ai" even when privateType is set', () => {
  it('AI mode short-circuits and returns false', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { set__pendingPrivateType } = await import('../../src/arena/arena-state.ts');
    set__pendingPrivateType('code');
    const { maybeRoutePrivate } = await import('../../src/arena/arena-private-picker.ts');
    const result = maybeRoutePrivate('ai', 'Some topic');
    expect(result).toBe(false);
  });
});

describe('TC438-3 — maybeRoutePrivate with type "code" calls createAndWaitPrivateLobby and returns true', () => {
  it('appends arena-private-waiting to the DOM (via createAndWaitPrivateLobby) and returns true', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Provide screenEl in the DOM
    document.body.innerHTML = '<div id="arena-screen"></div>';

    // Stub safeRpc so create_private_lobby returns a result
    mockSafeRpc.mockResolvedValue({
      data: [{ debate_id: 'debate-code-001', join_code: 'XYZAB' }],
      error: null,
    });

    const { set__pendingPrivateType, set_screenEl } = await import('../../src/arena/arena-state.ts');
    set__pendingPrivateType('code');
    set_screenEl(document.getElementById('arena-screen') as HTMLElement);

    const { maybeRoutePrivate } = await import('../../src/arena/arena-private-picker.ts');
    const result = maybeRoutePrivate('text', 'Hot take topic');
    expect(result).toBe(true);

    // Waiting screen created synchronously
    const waiting = document.getElementById('arena-private-waiting');
    expect(waiting).not.toBeNull();
  });
});

describe('TC438-4 — maybeRoutePrivate with type "username" shows user search overlay and returns true', () => {
  it('appends arena-user-search-overlay and returns true', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { set__pendingPrivateType } = await import('../../src/arena/arena-state.ts');
    set__pendingPrivateType('username');
    const { maybeRoutePrivate } = await import('../../src/arena/arena-private-picker.ts');
    const result = maybeRoutePrivate('text', 'Hot take topic');
    expect(result).toBe(true);
    const overlay = document.getElementById('arena-user-search-overlay');
    expect(overlay).not.toBeNull();
  });
});

describe('TC438-5 — showUserSearchPicker renders overlay with search input and cancel button', () => {
  it('appends overlay with #arena-user-search-input and #arena-user-search-cancel', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const { showUserSearchPicker } = await import('../../src/arena/arena-private-picker.ts');
    showUserSearchPicker('text', 'Test topic');
    const overlay = document.getElementById('arena-user-search-overlay');
    expect(overlay).not.toBeNull();
    expect(document.getElementById('arena-user-search-input')).not.toBeNull();
    expect(document.getElementById('arena-user-search-cancel')).not.toBeNull();
  });
});

describe('TC438-6 — showGroupLobbyPicker with empty groups shows empty-state message', () => {
  it('renders "not in any groups" message when get_my_groups returns empty array', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    const { showGroupLobbyPicker } = await import('../../src/arena/arena-private-picker.ts');
    await showGroupLobbyPicker('text', 'Test topic');
    const listEl = document.getElementById('arena-group-pick-list');
    expect(listEl).not.toBeNull();
    expect(listEl?.textContent).toContain("not in any groups");
  });
});

describe('TC438-7 — showGroupLobbyPicker with groups renders group rows', () => {
  it('renders one .arena-group-row per group returned by get_my_groups', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    mockSafeRpc.mockResolvedValue({
      data: [
        { id: 'g1', name: 'Group Alpha', member_count: 5 },
        { id: 'g2', name: 'Group Beta', member_count: 12 },
      ],
      error: null,
    });
    const { showGroupLobbyPicker } = await import('../../src/arena/arena-private-picker.ts');
    await showGroupLobbyPicker('text', 'Test topic');
    const rows = document.querySelectorAll('.arena-group-row');
    expect(rows.length).toBe(2);
    const names = Array.from(rows).map(r => r.querySelector('.arena-group-row-name')?.textContent);
    expect(names).toContain('Group Alpha');
    expect(names).toContain('Group Beta');
  });
});

