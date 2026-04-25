import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [], error: null }));
const mockGetCurrentUser = vi.hoisted(() => vi.fn().mockReturnValue({ id: 'user-1' }));
const mockGetMyGroupsSchema = vi.hoisted(() => ({}));
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockFriendlyError = vi.hoisted(() => vi.fn());

const mockPendingPrivateType = vi.hoisted(() => ({ value: null as string | null }));
const mockSet__pendingPrivateType = vi.hoisted(() => vi.fn((v: string | null) => { mockPendingPrivateType.value = v; }));
const mockSelectedCategory = vi.hoisted(() => ({ value: null as string | null }));
const mockSelectedRanked = vi.hoisted(() => ({ value: false }));
const mockSelectedRuleset = vi.hoisted(() => ({ value: 'amplified' }));
const mockSelectedRounds = vi.hoisted(() => ({ value: 3 }));

const mockIsPlaceholder = vi.hoisted(() => ({ value: false }));
const mockPushArenaState = vi.hoisted(() => vi.fn());
const mockRoundPickerCSS = vi.hoisted(() => vi.fn().mockReturnValue(''));
const mockRoundPickerHTML = vi.hoisted(() => vi.fn().mockReturnValue(''));
const mockWireRoundPicker = vi.hoisted(() => vi.fn());
const mockShowModeSelect = vi.hoisted(() => vi.fn());
const mockCreateAndWaitPrivateLobby = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_my_groups: mockGetMyGroupsSchema,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
  friendlyError: mockFriendlyError,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get _pendingPrivateType() { return mockPendingPrivateType.value; },
  get selectedCategory() { return mockSelectedCategory.value; },
  get selectedRanked() { return mockSelectedRanked.value; },
  get selectedRuleset() { return mockSelectedRuleset.value; },
  get selectedRounds() { return mockSelectedRounds.value; },
  set__pendingPrivateType: mockSet__pendingPrivateType,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  get isPlaceholder() { return () => mockIsPlaceholder.value; },
  pushArenaState: mockPushArenaState,
}));

vi.mock('../src/arena/arena-config-round-picker.ts', () => ({
  roundPickerCSS: mockRoundPickerCSS,
  roundPickerHTML: mockRoundPickerHTML,
  wireRoundPicker: mockWireRoundPicker,
}));

vi.mock('../src/arena/arena-config-mode-select.ts', () => ({
  showModeSelect: mockShowModeSelect,
}));

vi.mock('../src/arena/arena-private-lobby.ts', () => ({
  createAndWaitPrivateLobby: mockCreateAndWaitPrivateLobby,
}));

import {
  showPrivateLobbyPicker,
  showModeSelectThen,
  maybeRoutePrivate,
  showUserSearchPicker,
  showGroupLobbyPicker,
} from '../src/arena/arena-private-picker.ts';

describe('TC1 — showPrivateLobbyPicker redirects unauthenticated non-placeholder users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    mockIsPlaceholder.value = false;
  });

  it('redirects to plinko when no user and not placeholder', () => {
    mockGetCurrentUser.mockReturnValueOnce(null);
    const spy = vi.spyOn(window, 'location', 'get');
    // Just check it doesn't render overlay
    showPrivateLobbyPicker();
    expect(document.getElementById('arena-private-overlay')).toBeNull();
    spy.mockRestore();
  });

  it('renders overlay when user is logged in', () => {
    showPrivateLobbyPicker();
    expect(document.getElementById('arena-private-overlay')).not.toBeNull();
  });

  it('calls pushArenaState with privatePicker', () => {
    showPrivateLobbyPicker();
    expect(mockPushArenaState).toHaveBeenCalledWith('privatePicker');
  });

  it('calls wireRoundPicker', () => {
    showPrivateLobbyPicker();
    expect(mockWireRoundPicker).toHaveBeenCalled();
  });
});

describe('TC2 — showModeSelectThen sets pending type and calls showModeSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls set__pendingPrivateType with the type', () => {
    showModeSelectThen('code');
    expect(mockSet__pendingPrivateType).toHaveBeenCalledWith('code');
  });

  it('calls showModeSelect', () => {
    showModeSelectThen('username');
    expect(mockShowModeSelect).toHaveBeenCalled();
  });
});

describe('TC3 — maybeRoutePrivate routes by pending type', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when _pendingPrivateType is null', () => {
    mockPendingPrivateType.value = null;
    expect(maybeRoutePrivate('text', 'Topic')).toBe(false);
  });

  it('returns false for ai mode even with pending type', () => {
    mockPendingPrivateType.value = 'code';
    expect(maybeRoutePrivate('ai', 'Topic')).toBe(false);
  });

  it('calls createAndWaitPrivateLobby with code when type is code', () => {
    mockPendingPrivateType.value = 'code';
    expect(maybeRoutePrivate('text', 'My topic')).toBe(true);
    expect(mockCreateAndWaitPrivateLobby).toHaveBeenCalledWith('text', 'My topic', 'code');
  });

  it('calls showUserSearchPicker when type is username', () => {
    mockPendingPrivateType.value = 'username';
    document.body.innerHTML = '';
    expect(maybeRoutePrivate('text', 'Debate')).toBe(true);
    // showUserSearchPicker renders an overlay
    expect(document.getElementById('arena-user-search-overlay')).not.toBeNull();
  });
});

describe('TC4 — showUserSearchPicker renders search overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('appends user search overlay to body', () => {
    showUserSearchPicker('text', 'AI topic');
    expect(document.getElementById('arena-user-search-overlay')).not.toBeNull();
  });

  it('calls pushArenaState with userSearch', () => {
    showUserSearchPicker('text', 'AI topic');
    expect(mockPushArenaState).toHaveBeenCalledWith('userSearch');
  });

  it('renders search input', () => {
    showUserSearchPicker('text', 'AI topic');
    expect(document.getElementById('arena-user-search-input')).not.toBeNull();
  });
});

describe('TC5 — showGroupLobbyPicker calls safeRpc get_my_groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    mockSafeRpc.mockResolvedValue({
      data: [{ id: 'g-1', name: 'Debate Club', member_count: 12 }],
      error: null,
    });
  });

  it('calls safeRpc with get_my_groups schema', async () => {
    await showGroupLobbyPicker('text', 'Economy');
    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_groups', {}, mockGetMyGroupsSchema);
  });

  it('renders group overlay', async () => {
    await showGroupLobbyPicker('text', 'Economy');
    expect(document.getElementById('arena-group-pick-overlay')).not.toBeNull();
  });

  it('renders group rows from data', async () => {
    await showGroupLobbyPicker('text', 'Economy');
    expect(document.querySelectorAll('.arena-group-row').length).toBe(1);
  });

  it('shows empty message when no groups', async () => {
    mockSafeRpc.mockResolvedValueOnce({ data: [], error: null });
    await showGroupLobbyPicker('text', 'Economy');
    expect(document.getElementById('arena-group-pick-list')?.textContent).toContain("not in any groups");
  });
});

describe('ARCH — arena-private-picker.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-core.utils.ts',
      './arena-config-round-picker.ts',
      './arena-config-mode-select.ts',
      './arena-private-lobby.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-private-picker.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
