/**
 * Integration tests -- src/bounties.render.ts -> bounties.rpc
 * SEAM: #518
 *
 * ARCH filter (import lines from source):
 *   import { loadBountyDotSet } from './bounties.dot.ts';
 *   import { escapeHTML } from './config.ts';
 *   import { postBounty, cancelBounty, getMyBounties, bountySlotLimit } from './bounties.rpc.ts';
 *   import type { BountyRow } from './bounties.types.ts';
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Supabase mock (only @supabase/supabase-js) -- hoisted
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

function makeBountyRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const baseExpires = new Date(Date.now() + 7 * 86_400_000).toISOString();
  return {
    id: 'bounty-uuid-001',
    target_id: 'target-uuid-001',
    poster_id: 'poster-uuid-001',
    poster_username: 'PosterUser',
    target_username: 'TargetUser',
    amount: 200,
    duration_days: 7,
    status: 'open',
    expires_at: baseExpires,
    ...overrides,
  };
}

function makeContainer(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

// ─── TC1: bountySlotLimit pure logic ─────────────────────────────────────────

describe('bountySlotLimit (pure, seam #518)', () => {
  let bountySlotLimit: (depthPct: number) => number;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(),
      getIsPlaceholderMode: vi.fn().mockReturnValue(false),
    }));

    const mod = await import('../../src/bounties.rpc.ts');
    bountySlotLimit = mod.bountySlotLimit;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('TC1a: returns 0 for depth < 25', () => {
    expect(bountySlotLimit(0)).toBe(0);
    expect(bountySlotLimit(24)).toBe(0);
  });

  it('TC1b: returns 1 for depth 25-34', () => {
    expect(bountySlotLimit(25)).toBe(1);
    expect(bountySlotLimit(34)).toBe(1);
  });

  it('TC1c: returns 6 for depth >= 75', () => {
    expect(bountySlotLimit(75)).toBe(6);
    expect(bountySlotLimit(100)).toBe(6);
  });

  it('TC1d: intermediate thresholds are correct', () => {
    expect(bountySlotLimit(35)).toBe(2);
    expect(bountySlotLimit(45)).toBe(3);
    expect(bountySlotLimit(55)).toBe(4);
    expect(bountySlotLimit(65)).toBe(5);
  });
});

// ─── TC2: depth gate message ──────────────────────────────────────────────────

describe('renderProfileBountySection - depth gate (seam #518)', () => {
  let renderProfileBountySection: (
    container: HTMLElement,
    targetId: string,
    viewerDepth: number,
    viewerBalance: number,
    openCountHint: number
  ) => Promise<void>;
  let container: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    vi.doMock('../../src/bounties.dot.ts', () => ({
      loadBountyDotSet: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: vi.fn((s: string) => String(s)),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(),
      getIsPlaceholderMode: vi.fn().mockReturnValue(false),
    }));
    vi.doMock('../../src/bounties.rpc.ts', () => ({
      bountySlotLimit: vi.fn((d: number) => (d >= 25 ? 1 : 0)),
      getMyBounties: vi.fn().mockResolvedValue({ incoming: [], outgoing: [] }),
      postBounty: vi.fn().mockResolvedValue({ success: true }),
      cancelBounty: vi.fn().mockResolvedValue({ success: true, refund: 170 }),
    }));

    const mod = await import('../../src/bounties.render.ts');
    renderProfileBountySection = mod.renderProfileBountySection;
    container = makeContainer();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    container?.remove();
  });

  it('TC2: shows depth-gate message when viewerDepth < 25', async () => {
    await renderProfileBountySection(container, 'target-uuid-001', 10, 500, 0);
    expect(container.innerHTML).toContain('Reach 25% profile depth to post bounties.');
  });
});

// ─── TC3: existing bounty display ─────────────────────────────────────────────

describe('renderProfileBountySection - existing bounty (seam #518)', () => {
  let renderProfileBountySection: (
    container: HTMLElement,
    targetId: string,
    viewerDepth: number,
    viewerBalance: number,
    openCountHint: number
  ) => Promise<void>;
  let container: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    vi.doMock('../../src/bounties.dot.ts', () => ({
      loadBountyDotSet: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: vi.fn((s: string) => String(s)),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(),
      getIsPlaceholderMode: vi.fn().mockReturnValue(false),
    }));
    vi.doMock('../../src/bounties.rpc.ts', () => ({
      bountySlotLimit: vi.fn().mockReturnValue(3),
      getMyBounties: vi.fn().mockResolvedValue({
        incoming: [],
        outgoing: [makeBountyRow({ target_id: 'target-uuid-001' })],
      }),
      postBounty: vi.fn().mockResolvedValue({ success: true }),
      cancelBounty: vi.fn().mockResolvedValue({ success: true, refund: 170 }),
    }));

    const mod = await import('../../src/bounties.render.ts');
    renderProfileBountySection = mod.renderProfileBountySection;
    container = makeContainer();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    container?.remove();
  });

  it('TC3: renders existing bounty info with cancel button when open bounty exists for targetId', async () => {
    await renderProfileBountySection(container, 'target-uuid-001', 50, 1000, 0);
    expect(container.innerHTML).toContain('200');
    expect(container.innerHTML).toContain('CANCEL BOUNTY');
    expect(container.innerHTML).toContain('day');
  });
});

// ─── TC4: post form renders ───────────────────────────────────────────────────

describe('renderProfileBountySection - post form (seam #518)', () => {
  let renderProfileBountySection: (
    container: HTMLElement,
    targetId: string,
    viewerDepth: number,
    viewerBalance: number,
    openCountHint: number
  ) => Promise<void>;
  let container: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    vi.doMock('../../src/bounties.dot.ts', () => ({
      loadBountyDotSet: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: vi.fn((s: string) => String(s)),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(),
      getIsPlaceholderMode: vi.fn().mockReturnValue(false),
    }));
    vi.doMock('../../src/bounties.rpc.ts', () => ({
      bountySlotLimit: vi.fn().mockReturnValue(3),
      getMyBounties: vi.fn().mockResolvedValue({ incoming: [], outgoing: [] }),
      postBounty: vi.fn().mockResolvedValue({ success: true }),
      cancelBounty: vi.fn().mockResolvedValue({ success: true, refund: 170 }),
    }));

    const mod = await import('../../src/bounties.render.ts');
    renderProfileBountySection = mod.renderProfileBountySection;
    container = makeContainer();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    container?.remove();
  });

  it('TC4: renders post-bounty form with amount/duration inputs when no existing bounty', async () => {
    await renderProfileBountySection(container, 'target-uuid-001', 50, 1000, 0);
    expect(container.querySelector('#bounty-amount-input')).not.toBeNull();
    expect(container.querySelector('#bounty-duration-input')).not.toBeNull();
    expect(container.querySelector('#bounty-post-btn')).not.toBeNull();
  });
});

// ─── TC5: renderMyBountiesSection empty state ────────────────────────────────

describe('renderMyBountiesSection - empty state (seam #518)', () => {
  let renderMyBountiesSection: (container: HTMLElement) => Promise<void>;
  let container: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    vi.doMock('../../src/bounties.dot.ts', () => ({
      loadBountyDotSet: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: vi.fn((s: string) => String(s)),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(),
      getIsPlaceholderMode: vi.fn().mockReturnValue(false),
    }));
    vi.doMock('../../src/bounties.rpc.ts', () => ({
      bountySlotLimit: vi.fn().mockReturnValue(3),
      getMyBounties: vi.fn().mockResolvedValue({ incoming: [], outgoing: [] }),
      postBounty: vi.fn().mockResolvedValue({ success: true }),
      cancelBounty: vi.fn().mockResolvedValue({ success: true, refund: 170 }),
    }));

    const mod = await import('../../src/bounties.render.ts');
    renderMyBountiesSection = mod.renderMyBountiesSection;
    container = makeContainer();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    container?.remove();
  });

  it('TC5: renders empty-state messages for both sections when arrays are empty', async () => {
    await renderMyBountiesSection(container);
    expect(container.innerHTML).toContain('No active bounties on you.');
    expect(container.innerHTML).toContain('haven');
    expect(container.innerHTML).toContain('posted any bounties');
  });
});

// ─── TC6: renderMyBountiesSection with rows ───────────────────────────────────

describe('renderMyBountiesSection - with rows (seam #518)', () => {
  let renderMyBountiesSection: (container: HTMLElement) => Promise<void>;
  let container: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    vi.doMock('../../src/bounties.dot.ts', () => ({
      loadBountyDotSet: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: vi.fn((s: string) => String(s)),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(),
      getIsPlaceholderMode: vi.fn().mockReturnValue(false),
    }));
    vi.doMock('../../src/bounties.rpc.ts', () => ({
      bountySlotLimit: vi.fn().mockReturnValue(3),
      getMyBounties: vi.fn().mockResolvedValue({
        incoming: [makeBountyRow({ poster_username: 'IncomingUser', status: 'open' })],
        outgoing: [makeBountyRow({ target_username: 'OutgoingTarget', status: 'open', id: 'out-001' })],
      }),
      postBounty: vi.fn().mockResolvedValue({ success: true }),
      cancelBounty: vi.fn().mockResolvedValue({ success: true, refund: 170 }),
    }));

    const mod = await import('../../src/bounties.render.ts');
    renderMyBountiesSection = mod.renderMyBountiesSection;
    container = makeContainer();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    container?.remove();
  });

  it('TC6: renders incoming and outgoing bounty rows with CANCEL button for open outgoing', async () => {
    await renderMyBountiesSection(container);
    expect(container.innerHTML).toContain('IncomingUser');
    expect(container.innerHTML).toContain('OutgoingTarget');
    const cancelBtn = container.querySelector('.bounty-cancel-row-btn');
    expect(cancelBtn).not.toBeNull();
    expect(cancelBtn?.textContent?.trim()).toBe('CANCEL');
  });
});

// ─── TC7: two-click cancel pattern ───────────────────────────────────────────

const cancelBountyMockStore = { fn: vi.fn() };

describe('renderMyBountiesSection - two-click cancel (seam #518)', () => {
  let renderMyBountiesSection: (container: HTMLElement) => Promise<void>;
  let container: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    cancelBountyMockStore.fn = vi.fn().mockResolvedValue({ success: true, refund: 170 });

    vi.doMock('../../src/bounties.dot.ts', () => ({
      loadBountyDotSet: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: vi.fn((s: string) => String(s)),
    }));
    vi.doMock('../../src/auth.ts', () => ({
      safeRpc: vi.fn(),
      getIsPlaceholderMode: vi.fn().mockReturnValue(false),
    }));
    vi.doMock('../../src/bounties.rpc.ts', () => ({
      bountySlotLimit: vi.fn().mockReturnValue(3),
      getMyBounties: vi.fn().mockResolvedValue({
        incoming: [],
        outgoing: [
          makeBountyRow({
            target_username: 'OutgoingTarget',
            status: 'open',
            id: 'out-001',
            amount: 200,
            duration_days: 7,
          }),
        ],
      }),
      postBounty: vi.fn().mockResolvedValue({ success: true }),
      cancelBounty: (...args: unknown[]) => cancelBountyMockStore.fn(...args),
    }));

    const mod = await import('../../src/bounties.render.ts');
    renderMyBountiesSection = mod.renderMyBountiesSection;
    container = makeContainer();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    container?.remove();
  });

  it('TC7: first click sets confirmed state; second click calls cancelBounty', async () => {
    await renderMyBountiesSection(container);
    const cancelBtn = container.querySelector('.bounty-cancel-row-btn') as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();

    // First click: must NOT call cancelBounty, must set dataset.confirmed
    cancelBtn.click();
    expect(cancelBountyMockStore.fn).not.toHaveBeenCalled();
    expect(cancelBtn.dataset.confirmed).toBe('1');
    expect(cancelBtn.textContent).toContain('Confirm');

    // Second click: triggers cancelBounty async
    cancelBtn.click();
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();
    expect(cancelBountyMockStore.fn).toHaveBeenCalledWith('out-001');
  });
});
