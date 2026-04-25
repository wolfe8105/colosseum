// int-arena-private-picker-core-utils.test.ts
// Seam #073 — src/arena/arena-private-picker.ts → arena-core.utils
// TCs: 7 written

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js');

describe('Seam #073 — arena-private-picker → arena-core.utils', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // DOM stub
    document.body.innerHTML = '';

    // Stub history
    vi.spyOn(history, 'pushState').mockImplementation(() => {});
    vi.spyOn(history, 'back').mockImplementation(() => {});

    // Stub window.location.href (jsdom allows assignment)
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // TC-ARCH: confirm the seam import is still present
  it('TC-ARCH: arena-private-picker.ts imports from ./arena-core.utils', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(
      process.cwd(),
      'src/arena/arena-private-picker.ts'
    );
    const source = fs.readFileSync(filePath, 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasSeam = importLines.some(l => l.includes('./arena-core.utils'));
    expect(hasSeam).toBe(true);
  });

  // TC-isPlaceholder-falsy: isPlaceholder returns false when client is truthy
  it('TC-isPlaceholder-falsy: isPlaceholder() returns false when client is truthy and isAnyPlaceholder is false', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: () => ({ from: vi.fn() }),
      getCurrentUser: () => ({ id: 'user-1' }),
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      escapeHTML: (s: string) => s,
      showToast: vi.fn(),
      friendlyError: vi.fn(),
    }));

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(false);
  });

  // TC-isPlaceholder-no-client: isPlaceholder returns true when getSupabaseClient returns null
  it('TC-isPlaceholder-no-client: isPlaceholder() returns true when getSupabaseClient returns null', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: () => null,
      getCurrentUser: () => null,
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      escapeHTML: (s: string) => s,
      showToast: vi.fn(),
      friendlyError: vi.fn(),
    }));

    const { isPlaceholder } = await import('../../src/arena/arena-core.utils.ts');
    expect(isPlaceholder()).toBe(true);
  });

  // TC-pushArenaState-privatePicker: showPrivateLobbyPicker pushes 'privatePicker'
  it('TC-pushArenaState-privatePicker: showPrivateLobbyPicker() pushes arena state "privatePicker"', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: () => ({ from: vi.fn() }),
      getCurrentUser: () => ({ id: 'user-1' }),
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      escapeHTML: (s: string) => s,
      showToast: vi.fn(),
      friendlyError: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      _pendingPrivateType: null,
      selectedCategory: 'general',
      selectedRanked: false,
      selectedRuleset: 'standard',
      selectedRounds: 3,
      set__pendingPrivateType: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-config-round-picker.ts', () => ({
      roundPickerCSS: () => '',
      roundPickerHTML: () => '',
      wireRoundPicker: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-config-mode-select.ts', () => ({
      showModeSelect: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-private-lobby.ts', () => ({
      createAndWaitPrivateLobby: vi.fn(),
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_my_groups: {},
    }));

    const { showPrivateLobbyPicker } = await import('../../src/arena/arena-private-picker.ts');
    showPrivateLobbyPicker();

    expect(history.pushState).toHaveBeenCalledWith(
      { arenaView: 'privatePicker' },
      ''
    );
  });

  // TC-pushArenaState-userSearch: showUserSearchPicker pushes 'userSearch'
  it('TC-pushArenaState-userSearch: showUserSearchPicker() pushes arena state "userSearch"', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: () => ({ from: vi.fn() }),
      getCurrentUser: () => ({ id: 'user-1' }),
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      escapeHTML: (s: string) => s,
      showToast: vi.fn(),
      friendlyError: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      _pendingPrivateType: null,
      selectedCategory: 'general',
      selectedRanked: false,
      selectedRuleset: 'standard',
      selectedRounds: 3,
      set__pendingPrivateType: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-config-round-picker.ts', () => ({
      roundPickerCSS: () => '',
      roundPickerHTML: () => '',
      wireRoundPicker: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-config-mode-select.ts', () => ({
      showModeSelect: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-private-lobby.ts', () => ({
      createAndWaitPrivateLobby: vi.fn(),
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_my_groups: {},
    }));

    const { showUserSearchPicker } = await import('../../src/arena/arena-private-picker.ts');
    showUserSearchPicker('text', 'Is pizza the best food?');

    expect(history.pushState).toHaveBeenCalledWith(
      { arenaView: 'userSearch' },
      ''
    );
  });

  // TC-pushArenaState-groupPick: showGroupLobbyPicker pushes 'groupPick'
  it('TC-pushArenaState-groupPick: showGroupLobbyPicker() pushes arena state "groupPick"', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: () => ({ from: vi.fn() }),
      getCurrentUser: () => ({ id: 'user-1' }),
      safeRpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      escapeHTML: (s: string) => s,
      showToast: vi.fn(),
      friendlyError: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      _pendingPrivateType: null,
      selectedCategory: 'general',
      selectedRanked: false,
      selectedRuleset: 'standard',
      selectedRounds: 3,
      set__pendingPrivateType: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-config-round-picker.ts', () => ({
      roundPickerCSS: () => '',
      roundPickerHTML: () => '',
      wireRoundPicker: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-config-mode-select.ts', () => ({
      showModeSelect: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-private-lobby.ts', () => ({
      createAndWaitPrivateLobby: vi.fn(),
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_my_groups: {},
    }));

    const { showGroupLobbyPicker } = await import('../../src/arena/arena-private-picker.ts');
    // Don't await — we just need to verify the pushState call which happens synchronously
    void showGroupLobbyPicker('text', 'Is coffee superior to tea?');

    // Advance timers to settle any microtasks-triggered timer chains
    await vi.advanceTimersByTimeAsync(0);

    expect(history.pushState).toHaveBeenCalledWith(
      { arenaView: 'groupPick' },
      ''
    );
  });

  // TC-redirect-no-auth: redirects to plinko when no user and not placeholder
  it('TC-redirect-no-auth: showPrivateLobbyPicker() redirects to plinko when no user and isPlaceholder is false', async () => {
    vi.doMock('../../src/auth.ts', () => ({
      getSupabaseClient: () => ({ from: vi.fn() }),
      getCurrentUser: () => null,
      safeRpc: vi.fn(),
    }));
    vi.doMock('../../src/config.ts', () => ({
      isAnyPlaceholder: false,
      escapeHTML: (s: string) => s,
      showToast: vi.fn(),
      friendlyError: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-state.ts', () => ({
      _pendingPrivateType: null,
      selectedCategory: 'general',
      selectedRanked: false,
      selectedRuleset: 'standard',
      selectedRounds: 3,
      set__pendingPrivateType: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-config-round-picker.ts', () => ({
      roundPickerCSS: () => '',
      roundPickerHTML: () => '',
      wireRoundPicker: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-config-mode-select.ts', () => ({
      showModeSelect: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-private-lobby.ts', () => ({
      createAndWaitPrivateLobby: vi.fn(),
    }));
    vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
      get_my_groups: {},
    }));
    // isPlaceholder() checks getSupabaseClient() — truthy here, so returns false
    // getCurrentUser() — null, so redirect fires

    const { showPrivateLobbyPicker } = await import('../../src/arena/arena-private-picker.ts');
    showPrivateLobbyPicker();

    expect(window.location.href).toBe('moderator-plinko.html');
    // pushState should NOT have been called
    expect(history.pushState).not.toHaveBeenCalled();
  });
});
