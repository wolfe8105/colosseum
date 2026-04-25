import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = '<div id="screen-main"></div>';
});

// TC1: ARCH — get_my_groups is imported from rpc-schemas
describe('TC1 — ARCH: arena-private-picker.ts imports get_my_groups from rpc-schemas', () => {
  it('has import line referencing rpc-schemas', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-private-picker.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasRpcSchemas = importLines.some(l => l.includes('rpc-schemas') && l.includes('get_my_groups'));
    expect(hasRpcSchemas).toBe(true);
  });
});

// TC2: showGroupLobbyPicker — renders group rows when RPC returns valid array
describe('TC2 — showGroupLobbyPicker renders group rows on success', () => {
  it('injects group rows with member counts into the DOM', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { id: 'g1', name: 'Debaters Club', member_count: 12 },
        { id: 'g2', name: 'Rhetoric Society', member_count: 5 },
      ],
      error: null,
    });

    const mod = await import('../../src/arena/arena-private-picker.ts');
    const promise = mod.showGroupLobbyPicker('text', 'Climate change');
    await vi.runAllTimersAsync();
    await promise;

    const overlay = document.getElementById('arena-group-pick-overlay');
    expect(overlay).not.toBeNull();
    const rows = overlay!.querySelectorAll('.arena-group-row');
    expect(rows.length).toBe(2);
    expect(overlay!.innerHTML).toContain('Debaters Club');
    expect(overlay!.innerHTML).toContain('12');
    expect(overlay!.innerHTML).toContain('Rhetoric Society');
    expect(overlay!.innerHTML).toContain('5');
  });
});

// TC3: showGroupLobbyPicker — renders "not in any groups" when RPC returns error
describe('TC3 — showGroupLobbyPicker shows empty-state on RPC error', () => {
  it('renders empty-state message when error is returned', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const mod = await import('../../src/arena/arena-private-picker.ts');
    const promise = mod.showGroupLobbyPicker('text', 'AI');
    await vi.runAllTimersAsync();
    await promise;

    const listEl = document.getElementById('arena-group-pick-list');
    expect(listEl).not.toBeNull();
    expect(listEl!.innerHTML).toContain("not in any groups");
  });
});

// TC4: showGroupLobbyPicker — renders "not in any groups" when RPC returns empty array
describe('TC4 — showGroupLobbyPicker shows empty-state on empty array', () => {
  it('renders empty-state message when data is empty array', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const mod = await import('../../src/arena/arena-private-picker.ts');
    const promise = mod.showGroupLobbyPicker('voice', 'Space exploration');
    await vi.runAllTimersAsync();
    await promise;

    const listEl = document.getElementById('arena-group-pick-list');
    expect(listEl).not.toBeNull();
    expect(listEl!.innerHTML).toContain("not in any groups");
  });
});

// TC5: showGroupLobbyPicker — renders "Failed to load groups" when RPC throws
describe('TC5 — showGroupLobbyPicker shows failure message when RPC throws', () => {
  it('renders failure message on thrown exception', async () => {
    mockRpc.mockRejectedValue(new Error('Network error'));

    const mod = await import('../../src/arena/arena-private-picker.ts');
    const promise = mod.showGroupLobbyPicker('text', 'Democracy');
    await vi.runAllTimersAsync();
    await promise;

    const listEl = document.getElementById('arena-group-pick-list');
    expect(listEl).not.toBeNull();
    expect(listEl!.innerHTML).toContain('Failed to load groups');
  });
});

// TC6: showUserSearchPicker — debounces search and calls RPC after 350ms
describe('TC6 — showUserSearchPicker debounces and calls search_users_by_username', () => {
  it('calls safeRpc with search_users_by_username after 350ms debounce', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { id: 'u1', username: 'testuser', display_name: 'Test User', elo_rating: 1200 },
      ],
      error: null,
    });

    const mod = await import('../../src/arena/arena-private-picker.ts');
    mod.showUserSearchPicker('text', 'Science');

    const input = document.getElementById('arena-user-search-input') as HTMLInputElement;
    expect(input).not.toBeNull();

    input.value = 'test';
    input.dispatchEvent(new Event('input'));

    // Before debounce fires — no RPC call yet
    expect(mockRpc).not.toHaveBeenCalled();

    // Advance past debounce + flush promises
    await vi.advanceTimersByTimeAsync(400);

    expect(mockRpc).toHaveBeenCalledWith('search_users_by_username', { p_query: 'test' });

    const results = document.getElementById('arena-user-search-results');
    expect(results).not.toBeNull();
    expect(results!.innerHTML).toContain('Test User');
  });
});

// TC7: get_my_groups schema validates array of group objects
describe('TC7 — get_my_groups schema validates correctly', () => {
  it('accepts valid array of group items', async () => {
    const { get_my_groups } = await import('../../src/contracts/rpc-schemas.ts');

    const valid = [
      { id: 'g1', name: 'Group One', member_count: 10 },
      { id: 'g2', name: 'Group Two', member_count: 0, avatar_emoji: '🏛️' },
    ];
    const result = get_my_groups.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects when id is missing', async () => {
    const { get_my_groups } = await import('../../src/contracts/rpc-schemas.ts');

    const invalid = [{ name: 'No ID Group', member_count: 3 }];
    const result = get_my_groups.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
