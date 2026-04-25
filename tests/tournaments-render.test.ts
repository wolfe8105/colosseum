// ============================================================
// TOURNAMENTS RENDER — tests/tournaments-render.test.ts
// Source: src/tournaments.render.ts
//
// CLASSIFICATION:
//   renderTournamentBanner() — pure HTML generator → Unit test
//   renderTournamentCard()   — pure HTML generator → Unit test
//
// IMPORTS:
//   { escapeHTML } from './config.ts'
// ============================================================

import { describe, it, expect, vi } from 'vitest';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: unknown) => String(s ?? '')));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: vi.fn(),
}));

import { renderTournamentBanner, renderTournamentCard } from '../src/tournaments.render.ts';

// ── renderTournamentBanner ────────────────────────────────────

const makeMatch = (overrides: Partial<any> = {}): any => ({
  id: 'm-1',
  tournament_id: 't-1',
  tournament_title: 'Championship',
  round: 1,
  prize_pool: 1000,
  status: 'active',
  ...overrides,
});

describe('TC1 — renderTournamentBanner: contains TOURNAMENT badge', () => {
  it('output contains "TOURNAMENT" text', () => {
    expect(renderTournamentBanner(makeMatch())).toContain('TOURNAMENT');
  });
});

describe('TC2 — renderTournamentBanner: round 1 shows "Round 1"', () => {
  it('maps round 1 to "Round 1" label', () => {
    expect(renderTournamentBanner(makeMatch({ round: 1 }))).toContain('Round 1');
  });
});

describe('TC3 — renderTournamentBanner: round 2 shows Quarterfinal', () => {
  it('maps round 2 to "Quarterfinal"', () => {
    expect(renderTournamentBanner(makeMatch({ round: 2 }))).toContain('Quarterfinal');
  });
});

describe('TC4 — renderTournamentBanner: round 3 shows Semifinal', () => {
  it('maps round 3 to "Semifinal"', () => {
    expect(renderTournamentBanner(makeMatch({ round: 3 }))).toContain('Semifinal');
  });
});

describe('TC5 — renderTournamentBanner: any other round shows Grand Final', () => {
  it('maps round 4 to "Grand Final"', () => {
    expect(renderTournamentBanner(makeMatch({ round: 4 }))).toContain('Grand Final');
  });
});

describe('TC6 — renderTournamentBanner: displays prize tokens', () => {
  it('shows a token prize value derived from prize_pool', () => {
    const html = renderTournamentBanner(makeMatch({ prize_pool: 1000 }));
    // prize = round(1000 * 0.9 * 0.7) = 630
    expect(html).toContain('630');
  });
});

describe('TC7 — renderTournamentBanner: escapes tournament title', () => {
  it('calls escapeHTML on title', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    renderTournamentBanner(makeMatch({ tournament_title: '<script>xss</script>' }));
    expect(mockEscapeHTML).toHaveBeenCalled();
  });
});

// ── renderTournamentCard ──────────────────────────────────────

const makeTournament = (overrides: Partial<any> = {}): any => ({
  id: 't-1',
  title: 'Weekly Championship',
  category: 'politics',
  entry_fee: 50,
  prize_pool: 1000,
  max_players: 16,
  player_count: 8,
  status: 'registration',
  is_entered: false,
  starts_at: new Date(Date.now() + 3_600_000).toISOString(), // 1h from now
  ...overrides,
});

describe('TC8 — renderTournamentCard: contains tournament title', () => {
  it('shows the tournament title', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    const html = renderTournamentCard(makeTournament({ title: 'Big League' }));
    expect(html).toContain('Big League');
  });
});

describe('TC9 — renderTournamentCard: shows 🏆 TOURNAMENT badge', () => {
  it('includes the tournament badge', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    expect(renderTournamentCard(makeTournament())).toContain('🏆 TOURNAMENT');
  });
});

describe('TC10 — renderTournamentCard: shows player count', () => {
  it('displays player_count / max_players', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    const html = renderTournamentCard(makeTournament({ player_count: 8, max_players: 16 }));
    expect(html).toContain('8');
    expect(html).toContain('16');
  });
});

describe('TC11 — renderTournamentCard: shows Join button when registration and not entered', () => {
  it('includes tc-join-btn for open registration', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    const html = renderTournamentCard(makeTournament({ status: 'registration', is_entered: false }));
    expect(html).toContain('tc-join-btn');
  });
});

describe('TC12 — renderTournamentCard: shows Entered label when is_entered', () => {
  it('shows ✓ Entered instead of join button', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    const html = renderTournamentCard(makeTournament({ is_entered: true }));
    expect(html).toContain('Entered');
    expect(html).not.toContain('tc-join-btn');
  });
});

describe('TC13 — renderTournamentCard: shows entry fee', () => {
  it('includes the entry fee amount', () => {
    mockEscapeHTML.mockImplementation((s: unknown) => String(s ?? ''));
    const html = renderTournamentCard(makeTournament({ entry_fee: 50 }));
    expect(html).toContain('50');
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/tournaments.render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./config.ts', './tournaments.types.ts'];
    const source = readFileSync(resolve(__dirname, '../src/tournaments.render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
