// ============================================================
// F-59 GATEKEEPER — INVITE REWARDS  (home.invite.ts orchestrator)
// Spec source: docs/THE-MODERATOR-PUNCH-LIST.md row F-59
//
// Spec claims under test:
//   TC1  — loading state shown while RPC is pending
//   TC2  — get_my_invite_stats RPC called (F-59 spec: 7 new RPCs)
//   TC3  — error state on RPC failure
//   TC4  — error state when stats is null
//   TC5  — renderInvite called with fetched stats on success
//          (spec: progress band, activity feed, unclaimed rewards)
//   TC6  — onClaim callback opens claim sheet with rewardId + rewardType
//          (spec: unclaimed rewards with pulsing CLAIM buttons)
//   TC7  — existing sheet cleaned up before opening new sheet
//   TC8  — existing sheet cleaned up on re-entry to loadInviteScreen
//   TC9  — onClaimed callback triggers screen reload
//          (spec: screen updates after claim)
//   TC10 — cleanupInviteScreen calls stored sheet cleanup fn
//   TC11 — cleanupInviteScreen is a no-op when no sheet is open
//   ARCH — imports restricted to declared allowed list
// ============================================================

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
    invite_url: 'https://themoderator.app/i/ab1cd',
    total_converts: 1,
    total_signups: 2,
    total_clicks: 10,
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
  mockOpenClaimSheet.mockResolvedValue(vi.fn());
  document.body.innerHTML = '';
});

// ── TC1 — loading state shown while RPC is pending ────────────

describe('TC1 — loading state shown while RPC is pending', () => {
  it('container contains loading indicator before safeRpc resolves', async () => {
    let resolveRpc!: (v: unknown) => void;
    mockSafeRpc.mockReturnValue(new Promise(r => { resolveRpc = r; }));
    const container = document.createElement('div');

    const promise = loadInviteScreen(container);
    expect(container.innerHTML).toContain('invite-loading');

    resolveRpc({ data: buildStats(), error: null });
    await promise;
  });
});

// ── TC2 — get_my_invite_stats RPC called ──────────────────────

describe('TC2 — get_my_invite_stats RPC called', () => {
  it('safeRpc is called with "get_my_invite_stats" and empty params', async () => {
    mockSafeRpc.mockResolvedValue({ data: buildStats(), error: null });
    const container = document.createElement('div');

    await loadInviteScreen(container);

    expect(mockSafeRpc).toHaveBeenCalledWith('get_my_invite_stats', {}, expect.anything());
  });
});

// ── TC3 — error state on RPC failure ──────────────────────────

describe('TC3 — error state on RPC failure', () => {
  it('shows error message when safeRpc returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'unauthorized' } });
    const container = document.createElement('div');

    await loadInviteScreen(container);

    expect(container.innerHTML).toContain('Could not load');
  });
});

// ── TC4 — error state when stats is null ──────────────────────

describe('TC4 — error state when stats is null', () => {
  it('shows error message when data is null with no error object', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    const container = document.createElement('div');

    await loadInviteScreen(container);

    expect(container.innerHTML).toContain('Could not load');
  });
});

// ── TC5 — renderInvite called with fetched stats ───────────────

describe('TC5 — renderInvite called with fetched stats on success', () => {
  it('renderInvite receives container and exact stats object from RPC', async () => {
    const stats = buildStats({ total_converts: 3 });
    mockSafeRpc.mockResolvedValue({ data: stats, error: null });
    const container = document.createElement('div');

    await loadInviteScreen(container);

    expect(mockRenderInvite).toHaveBeenCalledWith(container, stats, expect.any(Function));
  });
});

// ── TC6 — onClaim opens claim sheet with rewardId + rewardType ─

describe('TC6 — onClaim callback opens claim sheet with rewardId and rewardType', () => {
  it('openClaimSheet called with correct rewardId and rewardType when onClaim fires', async () => {
    mockSafeRpc.mockResolvedValue({ data: buildStats(), error: null });
    const container = document.createElement('div');

    await loadInviteScreen(container);

    const onClaim = mockRenderInvite.mock.calls[0][2] as (id: string, type: string) => void;
    onClaim('reward-abc', 'legendary_powerup');

    expect(mockOpenClaimSheet).toHaveBeenCalledWith(
      'reward-abc',
      'legendary_powerup',
      expect.any(Function),
      expect.any(Function),
    );
  });
});

// ── TC7 — existing sheet cleaned up before opening new sheet ───

describe('TC7 — existing sheet cleanup called before opening second sheet', () => {
  it('stored cleanup fn is invoked before openClaimSheet is called a second time', async () => {
    const firstCleanup = vi.fn();
    mockOpenClaimSheet.mockResolvedValueOnce(firstCleanup);
    mockSafeRpc.mockResolvedValue({ data: buildStats(), error: null });
    const container = document.createElement('div');

    await loadInviteScreen(container);

    const onClaim = mockRenderInvite.mock.calls[0][2] as (id: string, type: string) => void;
    onClaim('reward-1', 'legendary_powerup');
    await vi.waitFor(() => expect(mockOpenClaimSheet).toHaveBeenCalledTimes(1));

    // Trigger onClaim again while first sheet is still open
    onClaim('reward-2', 'mythic_powerup');

    expect(firstCleanup).toHaveBeenCalled();
    expect(mockOpenClaimSheet).toHaveBeenCalledTimes(2);
  });
});

// ── TC8 — existing sheet cleaned up on re-entry to loadInviteScreen ─

describe('TC8 — existing sheet cleanup called when loadInviteScreen is called again', () => {
  it('stored cleanup fn is invoked at the start of a second loadInviteScreen call', async () => {
    const firstCleanup = vi.fn();
    mockOpenClaimSheet.mockResolvedValueOnce(firstCleanup);
    mockSafeRpc.mockResolvedValue({ data: buildStats(), error: null });
    const container = document.createElement('div');

    await loadInviteScreen(container);
    const onClaim = mockRenderInvite.mock.calls[0][2] as (id: string, type: string) => void;
    onClaim('reward-1', 'legendary_powerup');
    await vi.waitFor(() => expect(mockOpenClaimSheet).toHaveBeenCalledTimes(1));

    // Navigate away and back — re-entry should close the old sheet
    await loadInviteScreen(container);

    expect(firstCleanup).toHaveBeenCalled();
  });
});

// ── TC9 — onClaimed callback triggers screen reload ────────────

describe('TC9 — onClaimed callback reloads the invite screen', () => {
  it('safeRpc is called a second time after onClaimed fires', async () => {
    mockSafeRpc.mockResolvedValue({ data: buildStats(), error: null });
    const container = document.createElement('div');

    await loadInviteScreen(container);
    expect(mockSafeRpc).toHaveBeenCalledTimes(1);

    const onClaim = mockRenderInvite.mock.calls[0][2] as (id: string, type: string) => void;
    onClaim('reward-1', 'legendary_powerup');

    // onClaimed is the 4th arg to openClaimSheet
    const onClaimed = mockOpenClaimSheet.mock.calls[0][3] as () => void;
    onClaimed();

    await vi.waitFor(() => expect(mockSafeRpc).toHaveBeenCalledTimes(2));
  });
});

// ── TC10 — cleanupInviteScreen calls stored sheet cleanup fn ───

describe('TC10 — cleanupInviteScreen calls stored sheet cleanup fn', () => {
  it('cleanup fn returned by openClaimSheet is called by cleanupInviteScreen', async () => {
    const cleanup = vi.fn();
    mockOpenClaimSheet.mockResolvedValue(cleanup);
    mockSafeRpc.mockResolvedValue({ data: buildStats(), error: null });
    const container = document.createElement('div');

    await loadInviteScreen(container);
    const onClaim = mockRenderInvite.mock.calls[0][2] as (id: string, type: string) => void;
    onClaim('reward-1', 'legendary_powerup');
    await vi.waitFor(() => {});

    cleanupInviteScreen();

    expect(cleanup).toHaveBeenCalled();
  });
});

// ── TC11 — cleanupInviteScreen is a no-op when no sheet open ──

describe('TC11 — cleanupInviteScreen is a no-op when no sheet is open', () => {
  it('does not throw when cleanupInviteScreen is called without a prior open sheet', () => {
    expect(() => cleanupInviteScreen()).not.toThrow();
  });
});

// ── ARCH — imports restricted to allowed list ──────────────────

describe('ARCH — home.invite.ts only imports from allowed modules', () => {
  it('every import path is on the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      './home.invite-types.ts',
      './home.invite-render.ts',
      './home.invite-sheet.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/home.invite.ts'),
      'utf-8',
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
