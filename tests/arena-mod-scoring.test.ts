// ============================================================
// ARENA MOD SCORING — tests/arena-mod-scoring.test.ts
// Source: src/arena/arena-mod-scoring.ts
//
// CLASSIFICATION:
//   renderModScoring() — DOM builder + event wiring → Integration test
//
// STRATEGY:
//   Mock auth.ts for getCurrentProfile and scoreModerator.
//   Mock config.ts for escapeHTML/friendlyError.
//   Mock arena-ads.ts for injectAdSlot.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockScoreModerator    = vi.hoisted(() => vi.fn());
const mockEscapeHTML        = vi.hoisted(() => vi.fn((s: string) => s));
const mockFriendlyError     = vi.hoisted(() => vi.fn((e: unknown) => String(e)));
const mockInjectAdSlot      = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
  scoreModerator: mockScoreModerator,
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  friendlyError: mockFriendlyError,
}));

vi.mock('../src/arena/arena-ads.ts', () => ({
  injectAdSlot: mockInjectAdSlot,
}));

import { renderModScoring } from '../src/arena/arena-mod-scoring.ts';
import type { CurrentDebate } from '../src/arena/arena-types.ts';

const makeDebate = (overrides = {}): CurrentDebate => ({
  id: 'd-1',
  topic: 'Test topic',
  debater_a: 'user-a',
  debater_b: 'user-b',
  moderatorId: 'mod-1',
  moderatorName: 'Alice',
  ruleset: 'amplified',
  totalRounds: 4,
  currentRound: 1,
  messages: [],
  ...overrides,
} as unknown as CurrentDebate);

beforeEach(() => {
  document.body.innerHTML = '';
  mockGetCurrentProfile.mockReset();
  mockScoreModerator.mockReset();
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockFriendlyError.mockImplementation((e: unknown) => String(e));
  mockInjectAdSlot.mockReset();
});

// ── TC1: no-op when no moderatorId ───────────────────────────

describe('TC1 — renderModScoring: no-op when debate has no moderatorId', () => {
  it('does not append anything', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockGetCurrentProfile.mockReturnValue({ id: 'user-a' });
    renderModScoring(makeDebate({ moderatorId: null }) as never, container);
    expect(container.children.length).toBe(0);
  });
});

// ── TC2: no-op when no profile ────────────────────────────────

describe('TC2 — renderModScoring: no-op when getCurrentProfile returns null', () => {
  it('does not append section', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockGetCurrentProfile.mockReturnValue(null);
    renderModScoring(makeDebate(), container);
    expect(container.children.length).toBe(0);
  });
});

// ── TC3: no-op when viewer is the moderator ──────────────────

describe('TC3 — renderModScoring: no-op when viewer is the moderator', () => {
  it('does not append section for the mod themselves', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockGetCurrentProfile.mockReturnValue({ id: 'mod-1' });
    renderModScoring(makeDebate(), container);
    expect(container.children.length).toBe(0);
  });
});

// ── TC4: debater sees FAIR/UNFAIR buttons ────────────────────

describe('TC4 — renderModScoring: debater sees FAIR/UNFAIR buttons', () => {
  it('renders .mod-score-btn buttons for debater', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockGetCurrentProfile.mockReturnValue({ id: 'user-a' });
    renderModScoring(makeDebate(), container);
    expect(container.querySelectorAll('.mod-score-btn').length).toBe(2);
  });
});

// ── TC5: spectator sees slider ────────────────────────────────

describe('TC5 — renderModScoring: spectator sees slider', () => {
  it('renders #mod-score-slider for non-debater non-mod', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockGetCurrentProfile.mockReturnValue({ id: 'spectator-x' });
    renderModScoring(makeDebate(), container);
    expect(document.getElementById('mod-score-slider')).not.toBeNull();
  });
});

// ── TC6: escapes moderatorName ────────────────────────────────

describe('TC6 — renderModScoring: escapes moderatorName', () => {
  it('passes moderatorName through escapeHTML', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockGetCurrentProfile.mockReturnValue({ id: 'user-a' });
    renderModScoring(makeDebate({ moderatorName: '<b>Admin</b>' }), container);
    expect(mockEscapeHTML).toHaveBeenCalledWith('<b>Admin</b>');
  });
});

// ── TC7: injectAdSlot called ──────────────────────────────────

describe('TC7 — renderModScoring: calls injectAdSlot', () => {
  it('calls injectAdSlot with container', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockGetCurrentProfile.mockReturnValue({ id: 'spectator-x' });
    renderModScoring(makeDebate(), container);
    expect(mockInjectAdSlot).toHaveBeenCalledWith(container);
  });
});

// ── TC8: FAIR button click calls scoreModerator ───────────────

describe('TC8 — renderModScoring: FAIR button calls scoreModerator', () => {
  it('calls scoreModerator with score 25 on FAIR click', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    mockGetCurrentProfile.mockReturnValue({ id: 'user-a' });
    mockScoreModerator.mockResolvedValue({});
    renderModScoring(makeDebate(), container);
    const fairBtn = container.querySelector('.mod-score-btn.happy') as HTMLButtonElement;
    fairBtn.click();
    await Promise.resolve();
    expect(mockScoreModerator).toHaveBeenCalledWith('d-1', 25);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-mod-scoring.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-types.ts',
      './arena-ads.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-mod-scoring.ts'),
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
