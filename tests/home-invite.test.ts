import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks ──────────────────────────────────────────────

const mockSafeRpc = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_my_invite_stats: {},
}));

const mockRenderInvite = vi.hoisted(() => vi.fn());

vi.mock('../src/pages/home.invite-render.ts', () => ({
  renderInvite: mockRenderInvite,
}));

const mockOpenClaimSheet = vi.hoisted(() => vi.fn());

vi.mock('../src/pages/home.invite-sheet.ts', () => ({
  openClaimSheet: mockOpenClaimSheet,
}));

import { loadInviteScreen, cleanupInviteScreen } from '../src/pages/home.invite.ts';

// ── Fixtures ───────────────────────────────────────────────────

function buildStats(overrides: Record<string, unknown> = {}) {
  return {
    invite_url: 'https://themoderator.app/i/abc123',
    total_converts: 3,
    total_signups: 5,
    total_clicks: 20,
    next_milestone: 5,
    unclaimed_rewards: [],
    activity: [],
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────

beforeEach(() => {
  mockSafeRpc.mockReset();
  mockRenderInvite.mockReset();
  mockOpenClaimSheet.mockReset();
  mockOpenClaimSheet.mockResolvedValue(vi.fn()); // cleanup fn
  document.body.innerHTML = '';
});

// ── loadInviteScreen ───────────────────────────────────────────

describe('TC1 — loadInviteScreen shows loading state initially', () => {
  it('container innerHTML contains loading text before RPC resolves', async () => {
    let resolve!: (v: unknown) => void;
    mockSafeRpc.mockReturnValue(new Promise(r => { resolve = r; }));
    const container = document.createElement('div');

    const promise = loadInviteScreen(container);
    expect(container.innerHTML).toContain('invite-loading');

    resolve({ data: buildStats(), error: null });
    await promise;
  });
});

describe('TC2 — loadInviteScreen calls safeRpc with get_my_invite_stats', () => {
  it('safeRpc called with "get_my_invite_stats"', async () => {
    mockSafeRpc.mockResolvedValue({ data: buildStats(), error: null });
    const container = document.createElement('div');

    await loadInviteScreen(container);

    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_invite_stats', {}, expect.anything());
  });
});

describe('TC3 — loadInviteScreen shows error when RPC returns error', () => {
  it('container shows error message on RPC failure', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    const container = document.createElement('div');

    await loadInviteScreen(container);

    expect(container.innerHTML).toContain('Could not load');
  });
});

describe('TC4 — loadInviteScreen shows error when stats is null', () => {
  it('container shows error message when data is null and no error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    const container = document.createElement('div');

    await loadInviteScreen(container);

    expect(container.innerHTML).toContain('Could not load');
  });
});

describe('TC5 — loadInviteScreen calls renderInvite on success', () => {
  it('renderInvite called with container and stats', async () => {
    const stats = buildStats();
    mockSafeRpc.mockResolvedValue({ data: stats, error: null });
    const container = document.createElement('div');

    await loadInviteScreen(container);

    expect(mockRenderInvite).toHaveBeenCalledWith(container, stats, expect.any(Function));
  });
});

describe('TC6 — loadInviteScreen onClaim callback calls openClaimSheet', async () => {
  it('openClaimSheet called when renderInvite fires onClaim callback', async () => {
    mockSafeRpc.mockResolvedValue({ data: buildStats(), error: null });
    const container = document.createElement('div');

    await loadInviteScreen(container);

    // Get the onClaim callback passed to renderInvite
    const onClaim = mockRenderInvite.mock.calls[0][2] as (id: string, type: string) => void;
    onClaim('reward-1', 'legendary_powerup');

    expect(mockOpenClaimSheet).toHaveBeenCalledWith(
      'reward-1',
      'legendary_powerup',
      expect.any(Function),
      expect.any(Function),
    );
  });
});

// ── cleanupInviteScreen ────────────────────────────────────────

describe('TC7 — cleanupInviteScreen is a no-op when no sheet open', () => {
  it('does not throw when called without active sheet', () => {
    expect(() => cleanupInviteScreen()).not.toThrow();
  });
});

describe('TC8 — cleanupInviteScreen calls sheet cleanup when set', async () => {
  it('cleanup function from openClaimSheet is called', async () => {
    const cleanup = vi.fn();
    mockOpenClaimSheet.mockResolvedValue(cleanup);
    mockSafeRpc.mockResolvedValue({ data: buildStats(), error: null });
    const container = document.createElement('div');

    await loadInviteScreen(container);
    const onClaim = mockRenderInvite.mock.calls[0][2] as (id: string, type: string) => void;
    onClaim('reward-1', 'legendary_powerup');
    await vi.waitFor(() => {}); // let openClaimSheet.then() resolve

    cleanupInviteScreen();

    expect(cleanup).toHaveBeenCalled();
  });
});

// ── ARCH ──────────────────────────────────────────────────────

describe('ARCH — home.invite.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      './home.invite-types.ts',
      './home.invite-render.ts',
      './home.invite-sheet.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.invite.ts'),
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
