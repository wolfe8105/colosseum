// ============================================================
// BOUNTIES RENDER — tests/bounties-render.test.ts
// Source: src/bounties.render.ts
//
// CLASSIFICATION:
//   renderProfileBountySection() — Orchestration + DOM + RPC → Integration test
//   renderMyBountiesSection()    — RPC + DOM → Integration test
//
// IMPORTS:
//   { loadBountyDotSet }                      from './bounties.dot.ts'
//   { escapeHTML }                             from './config.ts'
//   { postBounty, cancelBounty, getMyBounties, bountySlotLimit } from './bounties.rpc.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLoadBountyDotSet = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockEscapeHTML       = vi.hoisted(() => vi.fn((s: string) => s));
const mockPostBounty       = vi.hoisted(() => vi.fn());
const mockCancelBounty     = vi.hoisted(() => vi.fn());
const mockGetMyBounties    = vi.hoisted(() => vi.fn());
const mockBountySlotLimit  = vi.hoisted(() => vi.fn(() => 2));

vi.mock('../src/bounties.dot.ts', () => ({
  loadBountyDotSet: mockLoadBountyDotSet,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: vi.fn(),
}));

vi.mock('../src/bounties.rpc.ts', () => ({
  postBounty: mockPostBounty,
  cancelBounty: mockCancelBounty,
  getMyBounties: mockGetMyBounties,
  bountySlotLimit: mockBountySlotLimit,
}));

import {
  renderProfileBountySection,
  renderMyBountiesSection,
} from '../src/bounties.render.ts';

type BountyRow = {
  id: string;
  target_id?: string;
  poster_id?: string;
  target_username?: string;
  poster_username?: string;
  amount: number;
  duration_days: number;
  status: 'open' | 'expired' | 'collected';
  expires_at: string;
};

const makeBounty = (overrides: Partial<BountyRow> = {}): BountyRow => ({
  id: 'bounty-1',
  target_id: 'target-user',
  poster_id: 'poster-user',
  target_username: 'target99',
  poster_username: 'poster99',
  amount: 50,
  duration_days: 7,
  status: 'open',
  expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  ...overrides,
});

const makeContainer = () => document.createElement('div');

beforeEach(() => {
  mockLoadBountyDotSet.mockResolvedValue(undefined);
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockPostBounty.mockReset();
  mockCancelBounty.mockReset();
  mockGetMyBounties.mockReset();
  mockBountySlotLimit.mockReturnValue(2);
  document.body.innerHTML = '';
});

// ── TC1: renderProfileBountySection — slot limit 0 shows depth message ─

describe('TC1 — renderProfileBountySection: slot limit 0 shows depth gate message', () => {
  it('renders depth gate message when bountySlotLimit returns 0', async () => {
    mockBountySlotLimit.mockReturnValue(0);
    mockGetMyBounties.mockResolvedValue({ outgoing: [], incoming: [] });
    const container = makeContainer();
    document.body.appendChild(container);
    await renderProfileBountySection(container, 'target-1', 0, 100, 0);
    expect(container.innerHTML).toContain('25% profile depth');
  });
});

// ── TC2: renderProfileBountySection — shows post form when no existing bounty ─

describe('TC2 — renderProfileBountySection: shows post form when no existing bounty', () => {
  it('renders bounty post button when no existing open bounty on target', async () => {
    mockGetMyBounties.mockResolvedValue({ outgoing: [], incoming: [] });
    const container = makeContainer();
    document.body.appendChild(container);
    await renderProfileBountySection(container, 'target-1', 50, 200, 0);
    expect(document.getElementById('bounty-post-btn')).not.toBeNull();
  });
});

// ── TC3: renderProfileBountySection — shows cancel when existing bounty ──

describe('TC3 — renderProfileBountySection: shows cancel button for existing bounty', () => {
  it('renders CANCEL BOUNTY button when open bounty exists on target', async () => {
    const existing = makeBounty({ target_id: 'target-1' });
    mockGetMyBounties.mockResolvedValue({ outgoing: [existing], incoming: [] });
    const container = makeContainer();
    document.body.appendChild(container);
    await renderProfileBountySection(container, 'target-1', 50, 200, 1);
    expect(container.innerHTML).toContain('CANCEL BOUNTY');
  });
});

// ── TC4: renderProfileBountySection — post button calls postBounty ───────

describe('TC4 — renderProfileBountySection: post button calls postBounty', () => {
  it('calls postBounty with targetId, amount, duration on click', async () => {
    mockGetMyBounties.mockResolvedValue({ outgoing: [], incoming: [] });
    mockPostBounty.mockResolvedValue({ success: true, bounty_id: 'b1' });
    const container = makeContainer();
    document.body.appendChild(container);
    await renderProfileBountySection(container, 'target-xyz', 50, 500, 0);

    const amtInput = document.getElementById('bounty-amount-input') as HTMLInputElement;
    const durInput = document.getElementById('bounty-duration-input') as HTMLInputElement;
    amtInput.value = '100';
    durInput.value = '7';

    document.getElementById('bounty-post-btn')?.click();
    await new Promise(r => setTimeout(r, 0));

    expect(mockPostBounty).toHaveBeenCalledWith('target-xyz', 100, 7);
  });
});

// ── TC5: renderProfileBountySection — calls getMyBounties ────────────────

describe('TC5 — renderProfileBountySection: calls getMyBounties to check existing bounties', () => {
  it('calls getMyBounties on render', async () => {
    mockGetMyBounties.mockResolvedValue({ outgoing: [], incoming: [] });
    const container = makeContainer();
    document.body.appendChild(container);
    await renderProfileBountySection(container, 'target-1', 50, 100, 0);
    expect(mockGetMyBounties).toHaveBeenCalledTimes(1);
  });
});

// ── TC6: renderMyBountiesSection — calls getMyBounties ───────────────────

describe('TC6 — renderMyBountiesSection: calls getMyBounties', () => {
  it('calls getMyBounties on render', async () => {
    mockGetMyBounties.mockResolvedValue({ outgoing: [], incoming: [] });
    await renderMyBountiesSection(makeContainer());
    expect(mockGetMyBounties).toHaveBeenCalledTimes(1);
  });
});

// ── TC7: renderMyBountiesSection — shows incoming bounties ───────────────

describe('TC7 — renderMyBountiesSection: renders incoming bounties', () => {
  it('renders bounty row for each incoming bounty', async () => {
    const incoming = [makeBounty({ id: 'b1', poster_username: 'hunter1' })];
    mockGetMyBounties.mockResolvedValue({ outgoing: [], incoming });
    const container = makeContainer();
    await renderMyBountiesSection(container);
    const rows = container.querySelectorAll('.bounty-list-row');
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});

// ── TC8: renderMyBountiesSection — shows empty state ─────────────────────

describe('TC8 — renderMyBountiesSection: shows empty state for no bounties', () => {
  it('renders "No active bounties" when both lists are empty', async () => {
    mockGetMyBounties.mockResolvedValue({ outgoing: [], incoming: [] });
    const container = makeContainer();
    await renderMyBountiesSection(container);
    expect(container.innerHTML).toContain('No active bounties on you');
    expect(container.innerHTML).toContain("You haven't posted any bounties");
  });
});

// ── TC9: renderMyBountiesSection — cancel button calls cancelBounty ──────

describe('TC9 — renderMyBountiesSection: cancel button calls cancelBounty after confirm', () => {
  it('calls cancelBounty with bounty id after two clicks (confirm pattern)', async () => {
    const outgoing = [makeBounty({ id: 'b-cancel', status: 'open' })];
    mockGetMyBounties.mockResolvedValue({ outgoing, incoming: [] });
    mockCancelBounty.mockResolvedValue({ success: true, refund: 45 });
    const container = makeContainer();
    await renderMyBountiesSection(container);

    const cancelBtn = container.querySelector<HTMLButtonElement>('.bounty-cancel-row-btn')!;
    cancelBtn.click(); // first click = confirm mode
    await new Promise(r => setTimeout(r, 0));
    cancelBtn.click(); // second click = actual cancel
    await new Promise(r => setTimeout(r, 0));

    expect(mockCancelBounty).toHaveBeenCalledWith('b-cancel');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/bounties.render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './bounties.dot.ts',
      './config.ts',
      './bounties.rpc.ts',
      './bounties.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/bounties.render.ts'),
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
