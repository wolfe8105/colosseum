// ============================================================
// STAKING RENDER — tests/staking-render.test.ts
// Source: src/staking.render.ts
//
// CLASSIFICATION:
//   renderStakingPanel() — pure HTML generator with three branches → Unit test
//
// IMPORTS:
//   { escapeHTML }        from './config.ts'
//   { getTier, canStake, getNextTier } from './tiers.ts'
//   { getOdds }          from './staking.rpc.ts'
// ============================================================

import { describe, it, expect, vi } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));
const mockGetTier = vi.hoisted(() => vi.fn(() => ({ name: 'Contender', icon: '🥊', stakeCap: 25 })));
const mockCanStake = vi.hoisted(() => vi.fn(() => true));
const mockGetNextTier = vi.hoisted(() => vi.fn(() => ({ questionsNeeded: 5 })));
const mockGetOdds = vi.hoisted(() => vi.fn(() => ({ a: 60, b: 40, multiplierA: 1.2, multiplierB: 2.0 })));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: vi.fn(),
  FEATURES: {},
}));

vi.mock('../src/tiers.ts', () => ({
  getTier: mockGetTier,
  canStake: mockCanStake,
  getNextTier: mockGetNextTier,
}));

vi.mock('../src/staking.rpc.ts', () => ({
  getOdds: mockGetOdds,
  placeStake: vi.fn(),
  getPool: vi.fn(),
  settleStakes: vi.fn(),
}));

import { renderStakingPanel } from '../src/staking.render.ts';

const makePool = (overrides: Partial<any> = {}): any => ({
  total_side_a: 100,
  total_side_b: 100,
  user_stake: null,
  debate_id: 'debate-1',
  ...overrides,
});

// ── already staked branch ─────────────────────────────────────

describe('TC1 — renderStakingPanel: shows YOUR STAKE when user has already staked', () => {
  it('renders staking-placed div with stake amount', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    const pool = makePool({ user_stake: { side: 'a', amount: 20 } });

    const html = renderStakingPanel('d-1', 'Alice', 'Bob', pool, 30);

    expect(html).toContain('YOUR STAKE');
    expect(html).toContain('20 tokens');
  });
});

describe('TC2 — renderStakingPanel: shows staked side label for side a', () => {
  it('includes sideALabel in stake confirmation text', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    const pool = makePool({ user_stake: { side: 'a', amount: 15 } });

    const html = renderStakingPanel('d-1', 'Player1', 'Player2', pool, 30);

    expect(html).toContain('Player1');
  });
});

describe('TC3 — renderStakingPanel: shows staked side label for side b', () => {
  it('includes sideBLabel in stake confirmation text', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    const pool = makePool({ user_stake: { side: 'b', amount: 25 } });

    const html = renderStakingPanel('d-1', 'Alpha', 'Beta', pool, 30);

    expect(html).toContain('Beta');
  });
});

// ── locked branch ─────────────────────────────────────────────

describe('TC4 — renderStakingPanel: shows locked state when canStake is false', () => {
  it('renders staking-locked div', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    mockCanStake.mockReturnValue(false);
    mockGetNextTier.mockReturnValue({ questionsNeeded: 5 });

    const html = renderStakingPanel('d-2', 'A', 'B', makePool(), 0);

    expect(html).toContain('TOKEN STAKING');
    expect(html).toContain('🔒');
    expect(html).toContain('5');
  });
});

describe('TC5 — renderStakingPanel: locked state shows profile link', () => {
  it('includes profile-depth link', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    mockCanStake.mockReturnValue(false);
    mockGetNextTier.mockReturnValue({ questionsNeeded: 3 });

    const html = renderStakingPanel('d-3', 'A', 'B', makePool(), 0);

    expect(html).toContain('moderator-profile-depth.html');
  });
});

// ── active branch ─────────────────────────────────────────────

describe('TC6 — renderStakingPanel: shows STAKE TOKENS heading when active', () => {
  it('renders staking-active panel with STAKE TOKENS', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    mockCanStake.mockReturnValue(true);
    mockGetTier.mockReturnValue({ name: 'Contender', icon: '🥊', stakeCap: 25 });

    const html = renderStakingPanel('d-4', 'Left', 'Right', makePool(), 30);

    expect(html).toContain('STAKE TOKENS');
    expect(html).toContain('stake-side-btn');
  });
});

describe('TC7 — renderStakingPanel: active panel includes quick amount buttons', () => {
  it('includes stake-quick-btn buttons', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    mockCanStake.mockReturnValue(true);
    mockGetTier.mockReturnValue({ name: 'Gladiator', icon: '⚔️', stakeCap: 100 });

    const html = renderStakingPanel('d-5', 'A', 'B', makePool(), 50);

    expect(html).toContain('stake-quick-btn');
  });
});

describe('TC8 — renderStakingPanel: pool bar shows "No stakes yet" for empty pool', () => {
  it('renders empty pool message when total is 0', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    mockCanStake.mockReturnValue(true);
    mockGetTier.mockReturnValue({ name: 'Contender', icon: '🥊', stakeCap: 25 });
    mockGetOdds.mockReturnValue({ a: 50, b: 50, multiplierA: 2.0, multiplierB: 2.0 });

    const html = renderStakingPanel('d-6', 'A', 'B', makePool({ total_side_a: 0, total_side_b: 0 }), 30);

    expect(html).toContain('No stakes yet');
  });
});

describe('TC9 — renderStakingPanel: 100-cap unlocks the 100 quick button', () => {
  it('includes data-amount="100" when stakeCap >= 100', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    mockCanStake.mockReturnValue(true);
    mockGetTier.mockReturnValue({ name: 'Legend', icon: '🏆', stakeCap: 100 });

    const html = renderStakingPanel('d-7', 'A', 'B', makePool(), 100);

    expect(html).toContain('data-amount="100"');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/staking.render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './tiers.ts', './staking.rpc.ts', './staking.types.ts'];
    const source = readFileSync(resolve(__dirname, '../src/staking.render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
