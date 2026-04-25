// ============================================================
// INTEGRATOR — arena-room-end-render.ts → arena-state
// Seam #030
// Boundary: renderPostDebate() reads screenEl from arena-state
//           and calls set_selectedRanked() before re-queuing.
// Mock boundary: @supabase/supabase-js only
// All source modules run real.
// ============================================================

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

// @peermetrics/webrtc-stats is not installed — mock webrtc.ts and webrtc.monitor.ts
// to break the transitive chain:
//   arena-room-ai-scoring → arena-room-ai-response → arena-room-live-poll
//   → arena-room-end → webrtc.ts → webrtc.monitor.ts → @peermetrics/webrtc-stats
vi.mock('../../src/webrtc.ts', () => ({
  leaveDebate: vi.fn(),
  setupRoom: vi.fn(),
  destroyWebRTC: vi.fn(),
}));

vi.mock('../../src/webrtc.monitor.ts', () => ({
  startWebRTCMonitor: vi.fn(),
  stopWebRTCMonitor: vi.fn(),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let renderPostDebate: (debate: unknown, ctx: unknown) => void;
let set_screenEl: (v: HTMLElement | null) => void;
let set_selectedRanked: (v: boolean) => void;
let selectedRanked: () => boolean;

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  document.body.innerHTML = '<div id="screen-main"></div>';

  const renderMod = await import('../../src/arena/arena-room-end-render.ts');
  renderPostDebate = renderMod.renderPostDebate as (debate: unknown, ctx: unknown) => void;

  const stateMod = await import('../../src/arena/arena-state.ts');
  set_screenEl = stateMod.set_screenEl as (v: HTMLElement | null) => void;
  set_selectedRanked = stateMod.set_selectedRanked as (v: boolean) => void;
  selectedRanked = () => stateMod.selectedRanked;
});

// ============================================================
// TC-I1: renderPostDebate renders verdict into screenEl
// ============================================================

describe('TC-I1: renderPostDebate renders verdict into screenEl from arena-state', () => {
  it('renders VICTORY into screenEl when player wins', () => {
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-1',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Test topic',
      opponentName: 'Bob',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 10,
      scoreB: 5,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 15,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    expect(screen.querySelector('.arena-post-title')?.textContent).toBe('VICTORY');
  });

  it('renders DEFEAT into screenEl when player loses', () => {
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-2',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Another topic',
      opponentName: 'Bob',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 3,
      scoreB: 10,
      winner: 'b',
      aiScores: null,
      eloChangeMe: -12,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    expect(screen.querySelector('.arena-post-title')?.textContent).toBe('DEFEAT');
  });
});

// ============================================================
// TC-I2: renderPostDebate renders DRAW verdict
// ============================================================

describe('TC-I2: renderPostDebate renders DRAW when winner is "draw"', () => {
  it('sets title to DRAW', () => {
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-3',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Draw topic',
      opponentName: 'Charlie',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 7,
      scoreB: 7,
      winner: 'draw',
      aiScores: null,
      eloChangeMe: 0,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    expect(screen.querySelector('.arena-post-title')?.textContent).toBe('DRAW');
  });
});

// ============================================================
// TC-I3: ELO change display from arena-state context
// ============================================================

describe('TC-I3: ELO change rendered with correct sign for ranked debate', () => {
  it('renders positive ELO change with + prefix', () => {
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-4',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Elo topic',
      opponentName: 'Dana',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 8,
      scoreB: 4,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 20,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    const eloEl = screen.querySelector('.arena-elo-change');
    expect(eloEl?.textContent).toContain('+20 ELO');
    expect(eloEl?.classList.contains('positive')).toBe(true);
  });

  it('renders negative ELO change without + prefix', () => {
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-5',
      role: 'b',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Elo loss topic',
      opponentName: 'Eve',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 9,
      scoreB: 2,
      winner: 'a',
      aiScores: null,
      eloChangeMe: -8,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    const eloEl = screen.querySelector('.arena-elo-change');
    expect(eloEl?.textContent).toContain('-8 ELO');
    expect(eloEl?.classList.contains('negative')).toBe(true);
  });
});

// ============================================================
// TC-I4: Rematch button calls set_selectedRanked from arena-state
// ============================================================

describe('TC-I4: Rematch button calls set_selectedRanked() via arena-state', () => {
  it('set_selectedRanked is true for ranked debate after rematch click', () => {
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);
    // Start with selectedRanked = false
    set_selectedRanked(false);

    const debate = {
      id: 'debate-6',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Rematch topic',
      opponentName: 'Frank',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 6,
      scoreB: 4,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 10,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    const rematchBtn = document.getElementById('arena-rematch') as HTMLButtonElement;
    expect(rematchBtn).not.toBeNull();
    rematchBtn.click();

    // set_selectedRanked(true) should have been called because debate.ranked = true
    expect(selectedRanked()).toBe(true);
  });

  it('set_selectedRanked is false for casual debate after rematch click', () => {
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);
    // Start with selectedRanked = true
    set_selectedRanked(true);

    const debate = {
      id: 'debate-7',
      role: 'a',
      ranked: false,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Casual rematch',
      opponentName: 'Gus',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 5,
      scoreB: 5,
      winner: 'draw',
      aiScores: null,
      eloChangeMe: 0,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    const rematchBtn = document.getElementById('arena-rematch') as HTMLButtonElement;
    rematchBtn.click();

    // set_selectedRanked(false) should have been called because debate.ranked = false
    expect(selectedRanked()).toBe(false);
  });
});

// ============================================================
// TC-I5: ADD RIVAL button only rendered when opponentId is set (non-AI)
// ============================================================

describe('TC-I5: ADD RIVAL button rendered only for human opponents', () => {
  it('renders ADD RIVAL button when opponentId present and mode is not ai', () => {
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-8',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Human debate',
      opponentName: 'Harry',
      opponentId: 'opp-uuid-1234',
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 7,
      scoreB: 3,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 12,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    expect(document.getElementById('arena-add-rival')).not.toBeNull();
  });

  it('does NOT render ADD RIVAL button when opponentId is null', () => {
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-9',
      role: 'a',
      ranked: false,
      ruleset: 'amplified',
      mode: 'ai',
      topic: 'AI debate',
      opponentName: 'AI',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 5,
      scoreB: 6,
      winner: 'b',
      aiScores: null,
      eloChangeMe: 0,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    expect(document.getElementById('arena-add-rival')).toBeNull();
  });
});

// ============================================================
// TC-I6: Unplugged ruleset shows no ELO change
// ============================================================

describe('TC-I6: Unplugged ruleset shows no rating change message', () => {
  it('renders unplugged label instead of ELO delta', () => {
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-10',
      role: 'a',
      ranked: true,
      ruleset: 'unplugged',
      mode: 'live',
      topic: 'Unplugged debate',
      opponentName: 'Ivan',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 8,
      scoreB: 5,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 0,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    const eloEl = screen.querySelector('.arena-elo-change');
    expect(eloEl?.textContent).toContain('Unplugged');
    expect(eloEl?.classList.contains('neutral')).toBe(true);
  });
});

// ============================================================
// ARCH — seam #030 import boundary unchanged
// ============================================================

describe('ARCH — seam #030 import boundary unchanged', () => {
  it('src/arena/arena-room-end-render.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });

  it('src/arena/arena-room-end-render.ts imports screenEl from arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const arenaStateImport = importLines.find(l => l.includes('arena-state'));
    expect(arenaStateImport).toMatch(/screenEl/);
  });

  it('src/arena/arena-room-end-render.ts imports set_selectedRanked from arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const arenaStateImport = importLines.find(l => l.includes('arena-state'));
    expect(arenaStateImport).toMatch(/set_selectedRanked/);
  });
});
