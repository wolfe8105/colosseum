/**
 * Tests for src/arena/arena-lobby.open-debates.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockIsPlaceholder = vi.hoisted(() => vi.fn());
const mockSet_selectedMode = vi.hoisted(() => vi.fn());
const mockSet_selectedRuleset = vi.hoisted(() => vi.fn());
const mockSet_selectedRounds = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  isPlaceholder: mockIsPlaceholder,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  set_selectedMode: mockSet_selectedMode,
  set_selectedRuleset: mockSet_selectedRuleset,
  set_selectedRounds: mockSet_selectedRounds,
  set_privateLobbyDebateId: vi.fn(),
  set_view: vi.fn(),
  get screenEl() { return null; },
}));

import { loadMyOpenDebates } from '../src/arena/arena-lobby.open-debates.ts';

function buildDOM() {
  document.body.innerHTML = `
    <div id="arena-my-open-section" style="display:none">
      <div id="arena-my-open-feed"></div>
    </div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  mockIsPlaceholder.mockReturnValue(false);
  mockGetCurrentUser.mockReturnValue({ id: 'user-1' });
});

describe('loadMyOpenDebates — no-ops when isPlaceholder', () => {
  it('TC1: returns early without calling safeRpc when isPlaceholder returns true', async () => {
    mockIsPlaceholder.mockReturnValue(true);
    await loadMyOpenDebates();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('loadMyOpenDebates — no-ops when no current user', () => {
  it('TC2: returns early without calling safeRpc when user is null', async () => {
    mockGetCurrentUser.mockReturnValue(null);
    await loadMyOpenDebates();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('loadMyOpenDebates — no-ops when DOM elements missing', () => {
  it('TC3: returns early when section/feed elements not found', async () => {
    document.body.innerHTML = '';
    await loadMyOpenDebates();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('loadMyOpenDebates — hides section when no debates returned', () => {
  it('TC4: sets section display to none when data array is empty', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadMyOpenDebates();
    const section = document.getElementById('arena-my-open-section')!;
    expect(section.style.display).toBe('none');
  });
});

describe('loadMyOpenDebates — calls safeRpc with get_my_open_debates', () => {
  it('TC5: calls safeRpc with correct RPC name', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadMyOpenDebates();
    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_open_debates', {});
  });
});

describe('loadMyOpenDebates — renders debate cards', () => {
  it('TC6: shows section and renders cards when debates are returned', async () => {
    mockSafeRpc.mockResolvedValue({
      data: [{
        debate_id: 'd1',
        topic: 'Is pineapple on pizza acceptable?',
        mode: 'text',
        ruleset: 'amplified',
        total_rounds: 4,
        visibility: 'public',
        join_code: null,
        invited_user_name: null,
        mod_invite_status: null,
        mod_invited_name: null,
        created_at: new Date().toISOString(),
      }],
      error: null,
    });
    await loadMyOpenDebates();
    const section = document.getElementById('arena-my-open-section')!;
    const feed = document.getElementById('arena-my-open-feed')!;
    expect(section.style.display).not.toBe('none');
    expect(feed.querySelector('[data-open-debate-id]')).not.toBeNull();
  });
});

describe('loadMyOpenDebates — returns on RPC error', () => {
  it('TC7: exits silently when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    await loadMyOpenDebates();
    const feed = document.getElementById('arena-my-open-feed')!;
    expect(feed.innerHTML).toBe('');
  });
});

describe('loadMyOpenDebates — cancel button calls safeRpc cancel_private_lobby', () => {
  it('TC8: clicking cancel calls safeRpc with cancel_private_lobby', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: [{
        debate_id: 'd2',
        topic: 'Test topic',
        mode: 'audio',
        ruleset: 'amplified',
        total_rounds: 4,
        visibility: 'public',
        join_code: null,
        invited_user_name: null,
        mod_invite_status: null,
        mod_invited_name: null,
        created_at: new Date().toISOString(),
      }],
      error: null,
    }).mockResolvedValue({ data: null, error: null });

    await loadMyOpenDebates();

    const cancelBtn = document.querySelector<HTMLButtonElement>('.open-debate-cancel-btn')!;
    cancelBtn.click();

    await new Promise(r => setTimeout(r, 0));
    expect(mockSafeRpc).toHaveBeenCalledWith('cancel_private_lobby', { p_debate_id: 'd2' });
  });
});

describe('ARCH — src/arena/arena-lobby.open-debates.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-core.utils.ts',
      './arena-state.ts',
      './arena-types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-lobby.open-debates.ts'),
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
