// ============================================================
// ARENA PENDING CHALLENGES — tests/arena-pending-challenges.test.ts
// Source: src/arena/arena-pending-challenges.ts
//
// CLASSIFICATION:
//   loadPendingChallenges() — RPC + DOM → Contract + Integration test
//
// IMPORTS:
//   { safeRpc }                    from '../auth.ts'
//   { escapeHTML, showToast, friendlyError, DEBATE } from '../config.ts'
//   { set_selectedMode }           from './arena-state.ts'
//   type { CurrentDebate, DebateMode } from './arena-types.ts'
//   type { PendingChallenge, JoinPrivateLobbyResult } from './arena-types-private-lobby.ts'
//   { AI_TOPICS }                  from './arena-constants.ts'
//   { randomFrom }                 from './arena-core.utils.ts'
//   { showMatchFound }             from './arena-match-found.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeRpc          = vi.hoisted(() => vi.fn());
const mockEscapeHTML       = vi.hoisted(() => vi.fn((s: string) => s));
const mockShowToast        = vi.hoisted(() => vi.fn());
const mockFriendlyError    = vi.hoisted(() => vi.fn((e: unknown) => String(e)));
const mockSet_selectedMode = vi.hoisted(() => vi.fn());
const mockShowMatchFound   = vi.hoisted(() => vi.fn());
const mockRandomFrom       = vi.hoisted(() => vi.fn(() => 'Default topic'));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
  showToast: mockShowToast,
  friendlyError: mockFriendlyError,
  DEBATE: { defaultRounds: 4 },
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  set_selectedMode: mockSet_selectedMode,
  set_view: vi.fn(),
  set_currentDebate: vi.fn(),
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  AI_TOPICS: ['Topic A', 'Topic B'],
  ROUND_OPTIONS: [],
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  randomFrom: mockRandomFrom,
  isPlaceholder: vi.fn(() => false),
}));

vi.mock('../src/arena/arena-match-found.ts', () => ({
  showMatchFound: mockShowMatchFound,
}));

import { loadPendingChallenges } from '../src/arena/arena-pending-challenges.ts';

const makeChallenge = (overrides = {}) => ({
  debate_id: 'debate-ch-1',
  challenger_id: 'user-x',
  challenger_name: 'Challenger',
  challenger_elo: 1100,
  mode: 'text',
  topic: 'AI will rule',
  ...overrides,
});

beforeEach(() => {
  mockSafeRpc.mockReset().mockResolvedValue({ data: [], error: null });
  mockEscapeHTML.mockImplementation((s: string) => s);
  mockShowToast.mockReset();
  mockSet_selectedMode.mockReset();
  mockShowMatchFound.mockReset();
  document.body.innerHTML = `
    <div id="arena-pending-challenges-section" style="display:none;"></div>
    <div id="arena-pending-challenges-feed"></div>
  `;
});

// ── TC1: loadPendingChallenges — calls get_pending_challenges ─

describe('TC1 — loadPendingChallenges: calls get_pending_challenges RPC', () => {
  it('calls safeRpc with get_pending_challenges', async () => {
    await loadPendingChallenges();
    expect(mockSafeRpc).toHaveBeenCalledWith('get_pending_challenges');
  });
});

// ── TC2: loadPendingChallenges — no-op when empty list ───────

describe('TC2 — loadPendingChallenges: no-op when RPC returns empty array', () => {
  it('keeps section hidden when no challenges', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadPendingChallenges();
    const section = document.getElementById('arena-pending-challenges-section')!;
    expect(section.style.display).toBe('none');
  });
});

// ── TC3: loadPendingChallenges — renders challenge cards ─────

describe('TC3 — loadPendingChallenges: renders a card per challenge', () => {
  it('shows section and renders .arena-card for each challenge', async () => {
    mockSafeRpc.mockResolvedValue({ data: [makeChallenge(), makeChallenge({ debate_id: 'ch-2' })], error: null });
    await loadPendingChallenges();
    const feed = document.getElementById('arena-pending-challenges-feed')!;
    expect(feed.querySelectorAll('.arena-card').length).toBe(2);
    expect(document.getElementById('arena-pending-challenges-section')!.style.display).toBe('');
  });
});

// ── TC4: loadPendingChallenges — escapes challenger name ─────

describe('TC4 — loadPendingChallenges: escapes challenger_name via escapeHTML', () => {
  it('calls escapeHTML with challenger_name', async () => {
    mockSafeRpc.mockResolvedValue({
      data: [makeChallenge({ challenger_name: '<b>Hacker</b>' })],
      error: null,
    });
    await loadPendingChallenges();
    const calls = mockEscapeHTML.mock.calls.map(([s]) => s);
    expect(calls).toContain('<b>Hacker</b>');
  });
});

// ── TC5: loadPendingChallenges — no-op on RPC error ──────────

describe('TC5 — loadPendingChallenges: no-op when RPC returns error', () => {
  it('keeps section hidden on RPC error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    await loadPendingChallenges();
    const section = document.getElementById('arena-pending-challenges-section')!;
    expect(section.style.display).toBe('none');
  });
});

// ── TC6: loadPendingChallenges — no-op when DOM absent ───────

describe('TC6 — loadPendingChallenges: no-op when DOM containers are missing', () => {
  it('does not throw when section/feed elements are absent', async () => {
    document.body.innerHTML = '';
    mockSafeRpc.mockResolvedValue({ data: [makeChallenge()], error: null });
    await expect(loadPendingChallenges()).resolves.toBeUndefined();
  });
});

// ── TC7: loadPendingChallenges — accept button calls join RPC ─

describe('TC7 — loadPendingChallenges: accept button calls join_private_lobby RPC', () => {
  it('calls safeRpc with join_private_lobby on ACCEPT click', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: [makeChallenge()], error: null })
      .mockResolvedValueOnce({
        data: { debate_id: 'd-1', topic: 'AI', total_rounds: 4, ruleset: 'amplified', language: 'en' },
        error: null,
      });
    await loadPendingChallenges();
    const acceptBtn = document.querySelector<HTMLButtonElement>('.challenge-accept-btn')!;
    acceptBtn.click();
    await new Promise(r => setTimeout(r, 0));
    const calls = mockSafeRpc.mock.calls.map(([name]) => name);
    expect(calls).toContain('join_private_lobby');
  });
});

// ── TC8: loadPendingChallenges — decline button removes card ─

describe('TC8 — loadPendingChallenges: decline button removes the card', () => {
  it('removes .arena-card from DOM on DECLINE click', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: [makeChallenge()], error: null })
      .mockResolvedValueOnce({ data: null, error: null }); // cancel RPC
    await loadPendingChallenges();
    const feed = document.getElementById('arena-pending-challenges-feed')!;
    expect(feed.querySelectorAll('.arena-card').length).toBe(1);
    const declineBtn = document.querySelector<HTMLButtonElement>('.challenge-decline-btn')!;
    declineBtn.click();
    await new Promise(r => setTimeout(r, 0));
    expect(feed.querySelectorAll('.arena-card').length).toBe(0);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-pending-challenges.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-private-lobby.ts',
      './arena-constants.ts',
      './arena-core.utils.ts',
      './arena-match-found.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-pending-challenges.ts'),
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
