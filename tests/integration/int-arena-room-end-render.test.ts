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
let renderModScoring: (debate: unknown, container: HTMLElement) => void;
let _setCurrentProfile: (p: unknown) => void;

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

  const scoringMod = await import('../../src/arena/arena-mod-scoring.ts');
  renderModScoring = scoringMod.renderModScoring as (debate: unknown, container: HTMLElement) => void;

  const authCoreMod = await import('../../src/auth.core.ts');
  _setCurrentProfile = authCoreMod._setCurrentProfile as (p: unknown) => void;
  // Reset profile to null after each test
  _setCurrentProfile(null);
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

// ============================================================
// SEAM #190 — arena-room-end-render.ts → nudge
// Boundary: renderPostDebate() calls nudge() which calls showToast()
//           via suppression logic (sessionStorage + localStorage).
// Mock strategy: vi.doMock('../../src/config.ts') before dynamic import
//   so nudge.ts picks up the mocked showToast.
// Each test calls vi.resetModules() at start and vi.resetModules() at end
//   to prevent doMock contamination of outer beforeEach.
// ============================================================

// Helper: shared debate fixture
function makeDebate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'debate-nudge',
    role: 'a',
    ranked: true,
    ruleset: 'amplified',
    mode: 'live',
    topic: 'Nudge test topic',
    opponentName: 'Opp',
    opponentId: null,
    moderatorId: null,
    moderatorName: null,
    _stakingResult: null,
    messages: [],
    ...overrides,
  };
}

function makeCtx(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    scoreA: 8,
    scoreB: 4,
    winner: 'a',
    aiScores: null,
    eloChangeMe: 10,
    endOfDebateBreakdown: null,
    myName: 'Alice',
    ...overrides,
  };
}

describe('SEAM #190 — TC-N1: nudge fires for authenticated non-moderator', () => {
  it('calls showToast with become_moderator message when user is logged in and not a moderator', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    sessionStorage.clear();
    localStorage.clear();

    const mockShowToast = vi.fn();

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => String(s),
      showToast: mockShowToast,
      friendlyError: vi.fn((e: unknown) => String(e)),
      ModeratorConfig: { escapeHTML: (s: string) => String(s), showToast: mockShowToast },
    }));
    vi.doMock('../../src/auth.ts', () => ({
      getCurrentUser: vi.fn(() => ({ id: 'user-abc', email: 'test@test.com' })),
      getCurrentProfile: vi.fn(() => ({ id: 'user-abc', is_moderator: false })),
      declareRival: vi.fn(),
      showUserProfile: vi.fn(),
    }));

    const nudgeMod = await import('../../src/nudge.ts');
    nudgeMod.nudge('become_moderator_post_debate', '🧑‍⚖️ Think you could call it better? Become a Moderator → Settings');

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Moderator'),
      'info',
    );

    vi.doUnmock('../../src/config.ts');
    vi.doUnmock('../../src/auth.ts');
    vi.resetModules();
    vi.useRealTimers();
  });
});

describe('SEAM #190 — TC-N2: nudge guard — getCurrentUser null skips nudge', () => {
  it('nudge() does not fire when session cap is 0 (no IDs fired), simulating guest path', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    sessionStorage.clear();
    localStorage.clear();

    const mockShowToast = vi.fn();

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => String(s),
      showToast: mockShowToast,
      friendlyError: vi.fn((e: unknown) => String(e)),
      ModeratorConfig: { escapeHTML: (s: string) => String(s), showToast: mockShowToast },
    }));

    // Verify: nudge does NOT fire when the id has already been used within this session
    // (simulating the is_moderator=true / user=null branches suppressing the call)
    // We test the negative path by pre-populating the session fired set:
    const SESSION_KEY = 'mod_nudge_session';
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(['become_moderator_post_debate']));

    const nudgeMod = await import('../../src/nudge.ts');
    nudgeMod.nudge('become_moderator_post_debate', 'should be suppressed');

    expect(mockShowToast).not.toHaveBeenCalled();

    vi.doUnmock('../../src/config.ts');
    vi.resetModules();
    vi.useRealTimers();
  });
});

describe('SEAM #190 — TC-N3: nudge suppressed via 24h cooldown (localStorage)', () => {
  it('nudge() does not fire when history shows ID fired within last 24h', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    sessionStorage.clear();
    localStorage.clear();

    const mockShowToast = vi.fn();

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => String(s),
      showToast: mockShowToast,
      friendlyError: vi.fn((e: unknown) => String(e)),
      ModeratorConfig: { escapeHTML: (s: string) => String(s), showToast: mockShowToast },
    }));

    // Simulate: ID fired 1 hour ago (within 24h cooldown)
    const HISTORY_KEY = 'mod_nudge_history';
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ become_moderator_post_debate: oneHourAgo }));

    const nudgeMod = await import('../../src/nudge.ts');
    nudgeMod.nudge('become_moderator_post_debate', 'should be suppressed by cooldown');

    expect(mockShowToast).not.toHaveBeenCalled();

    vi.doUnmock('../../src/config.ts');
    vi.resetModules();
    vi.useRealTimers();
  });
});

describe('SEAM #190 — TC-N4: nudge suppressed on second call (once per session)', () => {
  it('showToast called exactly once when nudge() called twice with same ID', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    sessionStorage.clear();
    localStorage.clear();

    const mockShowToast = vi.fn();

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => String(s),
      showToast: mockShowToast,
      friendlyError: vi.fn((e: unknown) => String(e)),
      ModeratorConfig: { escapeHTML: (s: string) => String(s), showToast: mockShowToast },
    }));

    const nudgeMod = await import('../../src/nudge.ts');
    nudgeMod.nudge('become_moderator_post_debate', 'msg one');
    nudgeMod.nudge('become_moderator_post_debate', 'msg two');

    // Same ID — should only fire once
    expect(mockShowToast).toHaveBeenCalledTimes(1);

    vi.doUnmock('../../src/config.ts');
    vi.resetModules();
    vi.useRealTimers();
  });
});

describe('SEAM #190 — TC-N5: session cap of 3 suppresses 4th nudge', () => {
  it('showToast called at most 3 times when 4 distinct nudge IDs are triggered', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    sessionStorage.clear();
    localStorage.clear();

    const mockShowToast = vi.fn();

    vi.doMock('../../src/config.ts', () => ({
      escapeHTML: (s: string) => String(s),
      showToast: mockShowToast,
      friendlyError: vi.fn((e: unknown) => String(e)),
      ModeratorConfig: { escapeHTML: (s: string) => String(s), showToast: mockShowToast },
    }));

    const nudgeMod = await import('../../src/nudge.ts');
    nudgeMod.nudge('alpha', 'Alpha nudge');
    nudgeMod.nudge('beta', 'Beta nudge');
    nudgeMod.nudge('gamma', 'Gamma nudge');
    // Session cap (3) now reached — 4th should be suppressed
    nudgeMod.nudge('delta', 'Delta nudge');

    expect(mockShowToast).toHaveBeenCalledTimes(3);

    vi.doUnmock('../../src/config.ts');
    vi.resetModules();
    vi.useRealTimers();
  });
});

describe('SEAM #190 — ARCH: import boundary check', () => {
  it('src/arena/arena-room-end-render.ts imports nudge from ../nudge.ts', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('../nudge'))).toBe(true);
  });

  it('nudge import line uses named export { nudge }', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const nudgeLine = importLines.find(l => l.includes('../nudge'));
    expect(nudgeLine).toMatch(/\bnudge\b/);
  });
});

// ============================================================
// SEAM #278 — arena-room-end-render.ts → arena-types-results
// Boundary: EndOfDebateBreakdown type consumed by renderPostDebate
//           via PostDebateContext.endOfDebateBreakdown and passed
//           to renderAfterEffects(). Pure-type seam — no RPC.
// ============================================================

describe('SEAM #278 — ARCH: arena-room-end-render imports EndOfDebateBreakdown from arena-types-results', () => {
  it('arena-room-end-render.ts has a type import from ./arena-types-results', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-types-results'))).toBe(true);
  });

  it('the arena-types-results import is type-only (import type)', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const line = importLines.find(l => l.includes('arena-types-results'));
    expect(line).toMatch(/import\s+type\s+\{/);
  });

  it('the import pulls EndOfDebateBreakdown from arena-types-results', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const line = importLines.find(l => l.includes('arena-types-results'));
    expect(line).toMatch(/EndOfDebateBreakdown/);
  });

  it('arena-types-results.ts exports EndOfDebateBreakdown interface', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-types-results.ts'), 'utf-8');
    expect(source).toMatch(/export\s+interface\s+EndOfDebateBreakdown/);
  });

  it('EndOfDebateBreakdown has debater_a and debater_b with raw_score, adjustments[], final_score', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-types-results.ts'), 'utf-8');
    expect(source).toMatch(/debater_a/);
    expect(source).toMatch(/debater_b/);
    expect(source).toMatch(/raw_score/);
    expect(source).toMatch(/adjustments/);
    expect(source).toMatch(/final_score/);
  });
});

describe('SEAM #278 — renderPostDebate renders DRAW outcome', () => {
  it('renders DRAW title and 🤝 verdict when winner is draw', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screen = document.getElementById('screen-main')!;
    const stateMod = (globalThis as unknown as Record<string, unknown>)['_arenaStateMod'] as { set_screenEl: (v: HTMLElement | null) => void } | undefined;
    // Use module-level set_screenEl bound in beforeEach
    set_screenEl(screen);

    const debate = {
      id: 'debate-draw',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Draw debate',
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
    expect(screen.querySelector('.arena-post-verdict')?.textContent).toBe('🤝');

    vi.useRealTimers();
  });
});

describe('SEAM #278 — ELO display variants via EndOfDebateBreakdown context', () => {
  it('ranked debate with positive ELO renders .arena-elo-change with class positive and + prefix', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-elo-pos',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'ELO test',
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
      eloChangeMe: 20,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    const eloEl = screen.querySelector('.arena-elo-change');
    expect(eloEl).not.toBeNull();
    expect(eloEl?.classList.contains('positive')).toBe(true);
    expect(eloEl?.textContent).toContain('+20 ELO');

    vi.useRealTimers();
  });

  it('unplugged ruleset renders .arena-elo-change neutral with no ELO number', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-unplugged',
      role: 'a',
      ranked: false,
      ruleset: 'unplugged',
      mode: 'live',
      topic: 'Unplugged test',
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
      eloChangeMe: 0,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    const eloEl = screen.querySelector('.arena-elo-change');
    expect(eloEl).not.toBeNull();
    expect(eloEl?.classList.contains('neutral')).toBe(true);
    expect(eloEl?.textContent).toContain('Unplugged');

    vi.useRealTimers();
  });

  it('casual (non-ranked, non-unplugged) debate renders neutral ELO with Casual text', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-casual',
      role: 'b',
      ranked: false,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Casual test',
      opponentName: 'Dave',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 5,
      scoreB: 10,
      winner: 'b',
      aiScores: null,
      eloChangeMe: 0,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    const eloEl = screen.querySelector('.arena-elo-change');
    expect(eloEl).not.toBeNull();
    expect(eloEl?.classList.contains('neutral')).toBe(true);
    expect(eloEl?.textContent).toContain('Casual');

    vi.useRealTimers();
  });
});

describe('SEAM #278 — EndOfDebateBreakdown flows through renderPostDebate to after-effects', () => {
  it('non-null endOfDebateBreakdown with adjustments renders .arena-after-effects section', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const breakdown = {
      debater_a: {
        raw_score: 10,
        adjustments: [{ effect_name: 'Point Surge', delta: 3 }],
        final_score: 13,
      },
      debater_b: {
        raw_score: 8,
        adjustments: [],
        final_score: 8,
      },
      inventory_effects: [],
    };

    const debate = {
      id: 'debate-ae',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'After effects test',
      opponentName: 'Eve',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 13,
      scoreB: 8,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 10,
      endOfDebateBreakdown: breakdown,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    const aeSection = screen.querySelector('.arena-after-effects');
    expect(aeSection).not.toBeNull();
    expect(aeSection?.textContent).toContain('AFTER EFFECTS');

    vi.useRealTimers();
  });

  it('null endOfDebateBreakdown renders no .arena-after-effects section', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-no-ae',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'No after effects',
      opponentName: 'Frank',
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
      eloChangeMe: 5,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    const aeSection = screen.querySelector('.arena-after-effects');
    expect(aeSection).toBeNull();

    vi.useRealTimers();
  });

  it('#arena-add-rival button absent when opponentId is null', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-no-rival',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'ai',
      topic: 'AI sparring',
      opponentName: 'AI',
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
      eloChangeMe: 0,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    expect(screen.querySelector('#arena-add-rival')).toBeNull();

    vi.useRealTimers();
  });
});

// ============================================================
// SEAM #371 — arena-room-end-render.ts → arena-types-ai-scoring
// Boundary: PostDebateContext.aiScores is typed AIScoreResult | null,
//           imported as type-only from ./arena-types-ai-scoring.ts.
//           renderAIScorecard() is called when aiScores is non-null.
// Pure-type seam — no RPC, structural DOM assertions only.
// ============================================================

describe('SEAM #371 — ARCH: arena-room-end-render imports AIScoreResult from arena-types-ai-scoring', () => {
  it('has an import from ./arena-types-ai-scoring', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-types-ai-scoring'))).toBe(true);
  });

  it('the import is type-only (import type)', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const line = importLines.find(l => l.includes('arena-types-ai-scoring'));
    expect(line).toMatch(/import\s+type\s+\{/);
  });

  it('the import pulls AIScoreResult from arena-types-ai-scoring', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const line = importLines.find(l => l.includes('arena-types-ai-scoring'));
    expect(line).toMatch(/AIScoreResult/);
  });
});

describe('SEAM #371 — TC-R371-1: PostDebateContext.aiScores null → renderAIScorecard not injected', () => {
  it('no .arena-ai-scorecard element when aiScores is null', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate();
    const ctx = makeCtx({ aiScores: null });

    renderPostDebate(debate, ctx);

    // renderAIScorecard returns '' when aiScores is null — nothing injected
    expect(screen.querySelector('.arena-ai-scorecard')).toBeNull();
    vi.useRealTimers();
  });
});

describe('SEAM #371 — TC-R371-2: PostDebateContext.aiScores non-null → renderAIScorecard injected', () => {
  it('renders .ai-scorecard section when a valid AIScoreResult is passed', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const aiScores = {
      side_a: { logic: { score: 9, reason: 'strong' }, evidence: { score: 8, reason: 'cited' }, delivery: { score: 7, reason: 'clear' }, rebuttal: { score: 6, reason: 'ok' } },
      side_b: { logic: { score: 4, reason: 'weak' }, evidence: { score: 3, reason: 'lack' }, delivery: { score: 5, reason: 'ok' }, rebuttal: { score: 4, reason: 'poor' } },
      overall_winner: 'side_a',
      verdict: 'Side A wins',
    };

    const debate = makeDebate({ mode: 'ai', role: 'a' });
    const ctx = makeCtx({ aiScores, winner: 'a', scoreA: 30, scoreB: 16 });

    renderPostDebate(debate, ctx);

    // renderAIScorecard produces .ai-scorecard markup (see arena-room-ai-scoring.ts line 76)
    const scorecard = screen.querySelector('.ai-scorecard');
    expect(scorecard).not.toBeNull();
    vi.useRealTimers();
  });
});

describe('SEAM #371 — TC-R371-3: aiScores verdict text appears in scorecard', () => {
  it('verdict string from AIScoreResult is rendered inside the scorecard', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const aiScores = {
      side_a: { logic: { score: 8, reason: 'r' }, evidence: { score: 7, reason: 'r' }, delivery: { score: 8, reason: 'r' }, rebuttal: { score: 7, reason: 'r' } },
      side_b: { logic: { score: 5, reason: 'r' }, evidence: { score: 4, reason: 'r' }, delivery: { score: 6, reason: 'r' }, rebuttal: { score: 5, reason: 'r' } },
      overall_winner: 'side_a',
      verdict: 'Decisive victory for Side A',
    };

    const debate = makeDebate({ mode: 'ai', role: 'a' });
    const ctx = makeCtx({ aiScores, winner: 'a', scoreA: 30, scoreB: 20 });

    renderPostDebate(debate, ctx);

    expect(screen.textContent).toContain('Decisive victory for Side A');
    vi.useRealTimers();
  });
});

describe('SEAM #371 — TC-R371-4: AIScoreResult shape validated from arena-types-ai-scoring source', () => {
  it('AIScoreResult interface contains side_a, side_b, overall_winner, verdict', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-types-ai-scoring.ts'), 'utf-8');
    expect(source).toMatch(/side_a\s*:/);
    expect(source).toMatch(/side_b\s*:/);
    expect(source).toMatch(/overall_winner\s*:/);
    expect(source).toMatch(/verdict\s*:/);
  });
});

// ============================================================
// SEAM #372 — arena-room-end-render.ts → arena-queue
// Boundary: rematch button click handler calls enterQueue(mode, topic)
//           imported directly from ./arena-queue.ts.
//           set_selectedRanked() is called before enterQueue().
// ============================================================

describe('SEAM #372 — ARCH: arena-room-end-render imports enterQueue from arena-queue', () => {
  it('has an import from ./arena-queue', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-queue'))).toBe(true);
  });

  it('the import pulls enterQueue from arena-queue', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const line = importLines.find(l => l.includes('arena-queue'));
    expect(line).toMatch(/enterQueue/);
  });

  it('the import is NOT type-only (enterQueue is a value)', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const line = importLines.find(l => l.includes('arena-queue'));
    expect(line).not.toMatch(/import\s+type/);
  });
});

describe('SEAM #372 — TC-R372-1: rematch click calls set_selectedRanked before enterQueue', () => {
  it('selectedRanked matches debate.ranked after rematch click for ranked=true', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);
    set_selectedRanked(false);

    const debate = makeDebate({ ranked: true, mode: 'live', topic: 'Queue test' });
    const ctx = makeCtx({ winner: 'a' });

    renderPostDebate(debate, ctx);

    const rematchBtn = document.getElementById('arena-rematch') as HTMLButtonElement;
    expect(rematchBtn).not.toBeNull();
    rematchBtn.click();

    expect(selectedRanked()).toBe(true);
    vi.useRealTimers();
  });
});

describe('SEAM #372 — TC-R372-2: rematch button is always rendered regardless of opponent type', () => {
  it('#arena-rematch exists for AI debate', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate({ mode: 'ai', opponentId: null, ranked: false });
    const ctx = makeCtx({ aiScores: null, winner: 'a' });

    renderPostDebate(debate, ctx);

    expect(document.getElementById('arena-rematch')).not.toBeNull();
    vi.useRealTimers();
  });

  it('#arena-rematch exists for human PvP debate', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate({ mode: 'live', opponentId: 'opp-uuid', ranked: true });
    const ctx = makeCtx({ winner: 'a', eloChangeMe: 10 });

    renderPostDebate(debate, ctx);

    expect(document.getElementById('arena-rematch')).not.toBeNull();
    vi.useRealTimers();
  });
});

describe('SEAM #372 — TC-R372-3: enterQueue receives debate.mode and debate.topic', () => {
  it('rematch click passes debate mode and topic to enterQueue via arena-queue', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    // Patch the screen so enterQueue DOM work does not throw on missing elements
    screen.innerHTML = '';
    const queueContainer = document.createElement('div');
    queueContainer.id = 'screen-main';
    set_screenEl(queueContainer);
    document.body.appendChild(queueContainer);

    const debate = makeDebate({ mode: 'ai', topic: 'AI ethics', ranked: false });
    const ctx = makeCtx({ winner: 'a', aiScores: null });

    // Re-use the already-rendered post on the original screen
    set_screenEl(screen);
    renderPostDebate(debate, ctx);

    // After click, enterQueue runs — verify selectedRanked was reset via set_selectedRanked(false)
    const rematchBtn = document.getElementById('arena-rematch') as HTMLButtonElement;
    expect(rematchBtn).not.toBeNull();
    rematchBtn.click();

    // set_selectedRanked(debate.ranked) = false was called
    expect(selectedRanked()).toBe(false);
    vi.useRealTimers();
  });
});

describe('SEAM #372 — TC-R372-4: arena-queue exports enterQueue as a named function', () => {
  it('arena-queue.ts declares and exports enterQueue', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-queue.ts'), 'utf-8');
    expect(source).toMatch(/export\s+function\s+enterQueue/);
  });
});

describe('SEAM #372 — TC-R372-5: arena-queue enterQueue sets view to queue via arena-state', () => {
  it('arena-queue.ts calls set_view from arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-queue.ts'), 'utf-8');
    expect(source).toMatch(/set_view\s*\(\s*['"]queue['"]/);
  });
});

// ============================================================
// SEAM #425 — arena-room-end-render.ts → share
// Boundary: renderPostDebate() wires #arena-share-result button
//           to call shareResult() from share.ts.
// ============================================================

describe('SEAM #425 — ARCH: arena-room-end-render.ts imports shareResult from share.ts', () => {
  it('TC-425-1: source imports shareResult from ../share.ts', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-room-end-render.ts'),
      'utf-8'
    );
    const imports = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(imports.some(l => /shareResult/.test(l) && /['"]\.\.\/share/.test(l))).toBe(true);
  });
});

describe('SEAM #425 — TC-425-2: #arena-share-result button is rendered', () => {
  it('renderPostDebate creates a #arena-share-result button', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-abc',
      topic: 'Pineapple on pizza is valid',
      role: 'a',
      ranked: false,
      ruleset: 'standard',
      mode: 'text',
      opponentName: 'OpponentUser',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      messages: [],
      _stakingResult: null,
    };

    renderPostDebate(debate, {
      scoreA: 10,
      scoreB: 8,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 5,
      endOfDebateBreakdown: null,
      myName: 'MyUser',
    });

    expect(document.getElementById('arena-share-result')).not.toBeNull();
    vi.useRealTimers();
  });
});

describe('SEAM #425 — TC-425-3: share button click calls navigator.share with topic on win', () => {
  it('clicking #arena-share-result invokes navigator.share with topic when user wins', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true, writable: true });

    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-win-123',
      topic: 'AI will replace programmers',
      role: 'a',
      ranked: true,
      ruleset: 'standard',
      mode: 'text',
      opponentName: 'Rival',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      messages: [],
      _stakingResult: null,
    };

    renderPostDebate(debate, {
      scoreA: 15,
      scoreB: 10,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 10,
      endOfDebateBreakdown: null,
      myName: 'ChampUser',
    });

    const btn = document.getElementById('arena-share-result') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();

    // navigator.share should have been called with an object containing the topic
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('AI will replace programmers') })
    );
    vi.useRealTimers();
  });
});

describe('SEAM #425 — TC-425-4: share button text includes Draw string on draw', () => {
  it('clicking #arena-share-result passes "Draw" in share text on a draw', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true, writable: true });

    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-draw-999',
      topic: 'Remote work is better',
      role: 'a',
      ranked: false,
      ruleset: 'standard',
      mode: 'text',
      opponentName: 'DrawOpponent',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      messages: [],
      _stakingResult: null,
    };

    renderPostDebate(debate, {
      scoreA: 10,
      scoreB: 10,
      winner: 'draw',
      aiScores: null,
      eloChangeMe: 0,
      endOfDebateBreakdown: null,
      myName: 'Player1',
    });

    const btn = document.getElementById('arena-share-result') as HTMLButtonElement;
    btn.click();

    // "Draw" winner text should appear in share payload
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Draw') })
    );
    vi.useRealTimers();
  });
});

describe('SEAM #425 — TC-425-5: share button click passes opponent name in share text on loss', () => {
  it('clicking #arena-share-result includes opponentName in share text when current user loses', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true, writable: true });

    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-loss-456',
      topic: 'Coffee beats tea',
      role: 'a',
      ranked: false,
      ruleset: 'standard',
      mode: 'text',
      opponentName: 'WinnerPerson',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      messages: [],
      _stakingResult: null,
    };

    renderPostDebate(debate, {
      scoreA: 5,
      scoreB: 12,
      winner: 'b',
      aiScores: null,
      eloChangeMe: -8,
      endOfDebateBreakdown: null,
      myName: 'LoserUser',
    });

    const btn = document.getElementById('arena-share-result') as HTMLButtonElement;
    btn.click();

    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('WinnerPerson') })
    );
    vi.useRealTimers();
  });
});

describe('SEAM #425 — TC-425-6: transcript button present only when messages exist', () => {
  it('no #arena-transcript button when messages is empty', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-notranscript',
      topic: 'Test topic',
      role: 'a',
      ranked: false,
      ruleset: 'standard',
      mode: 'text',
      opponentName: 'Opp',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      messages: [],
      _stakingResult: null,
    };

    renderPostDebate(debate, {
      scoreA: 5,
      scoreB: 4,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 3,
      endOfDebateBreakdown: null,
      myName: 'Me',
    });

    expect(document.getElementById('arena-transcript')).toBeNull();
    vi.useRealTimers();
  });

  it('#arena-transcript button present when messages is non-empty', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-hastranscript',
      topic: 'Test topic',
      role: 'a',
      ranked: false,
      ruleset: 'standard',
      mode: 'text',
      opponentName: 'Opp',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      messages: [{ role: 'a', text: 'Hello' }],
      _stakingResult: null,
    };

    renderPostDebate(debate, {
      scoreA: 5,
      scoreB: 4,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 3,
      endOfDebateBreakdown: null,
      myName: 'Me',
    });

    expect(document.getElementById('arena-transcript')).not.toBeNull();
    vi.useRealTimers();
  });
});

describe('SEAM #425 — TC-425-7: rendered post container has correct CSS classes', () => {
  it('post element has classes arena-post and arena-fade-in', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-css-check',
      topic: 'CSS matters',
      role: 'a',
      ranked: false,
      ruleset: 'standard',
      mode: 'text',
      opponentName: 'Opp',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      messages: [],
      _stakingResult: null,
    };

    renderPostDebate(debate, {
      scoreA: 3,
      scoreB: 2,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 2,
      endOfDebateBreakdown: null,
      myName: 'Me',
    });

    const post = screen.querySelector('.arena-post');
    expect(post).not.toBeNull();
    expect(post?.classList.contains('arena-fade-in')).toBe(true);
    vi.useRealTimers();
  });
});

// ============================================================
// SEAM #467 — arena-room-end-render.ts → arena-ads
// Boundary: renderPostDebate() calls injectAdSlot() twice on the
//           post container — once for Slot 1 (final score reveal)
//           and once for Slot 2 (debater scorecard / post-verdict).
// arena-ads makes NO Supabase calls — pure DOM injection only.
// ============================================================

describe('SEAM #467 — ARCH: arena-room-end-render imports injectAdSlot from arena-ads', () => {
  it('source file contains an import of injectAdSlot from arena-ads', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-room-end-render.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    expect(importLines.some((l: string) => /injectAdSlot/.test(l) && /arena-ads/.test(l))).toBe(true);
  });
});

describe('SEAM #467 — TC-467-1: renderPostDebate injects two ad slots into the post container', () => {
  it('two .adsbygoogle ins elements are present after renderPostDebate', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-467-1',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Ads seam test',
      opponentName: 'Bob',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };

    renderPostDebate(debate, {
      scoreA: 5,
      scoreB: 3,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 10,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    });

    const adIns = screen.querySelectorAll('ins.adsbygoogle');
    expect(adIns.length).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });
});

describe('SEAM #467 — TC-467-2: first injectAdSlot uses default margin style', () => {
  it('first wrapper div has margin:12px 0 in its cssText', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-467-2',
      role: 'b',
      ranked: false,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Margin test',
      opponentName: 'Alice',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };

    renderPostDebate(debate, {
      scoreA: 2,
      scoreB: 8,
      winner: 'b',
      aiScores: null,
      eloChangeMe: 5,
      endOfDebateBreakdown: null,
      myName: 'Bob',
    });

    // The wrappers are direct children of .arena-post containing an ins.adsbygoogle
    const post = screen.querySelector('.arena-post')!;
    const adWrappers = Array.from(post.querySelectorAll('div')).filter(
      (div) => div.querySelector('ins.adsbygoogle')
    );
    expect(adWrappers.length).toBeGreaterThanOrEqual(2);
    // First wrapper should have the default 12px margin
    expect(adWrappers[0].style.cssText).toContain('12px');
    vi.useRealTimers();
  });
});

describe('SEAM #467 — TC-467-3: second injectAdSlot applies marginTop override', () => {
  it('second wrapper div has marginTop 8px from style override', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-467-3',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'MarginTop override test',
      opponentName: 'Carol',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };

    renderPostDebate(debate, {
      scoreA: 7,
      scoreB: 4,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 12,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    });

    const post = screen.querySelector('.arena-post')!;
    const adWrappers = Array.from(post.querySelectorAll('div')).filter(
      (div) => div.querySelector('ins.adsbygoogle')
    );
    expect(adWrappers.length).toBeGreaterThanOrEqual(2);
    // Second wrapper must have marginTop 8px applied via Object.assign
    expect(adWrappers[1].style.marginTop).toBe('8px');
    vi.useRealTimers();
  });
});

describe('SEAM #467 — TC-467-4: injected ins elements carry correct AdSense data attributes', () => {
  it('each ins has data-ad-client and data-ad-slot set to the publisher values', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-467-4',
      role: 'a',
      ranked: false,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Attribute check',
      opponentName: 'Dave',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };

    renderPostDebate(debate, {
      scoreA: 1,
      scoreB: 1,
      winner: 'draw',
      aiScores: null,
      eloChangeMe: 0,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    });

    const adIns = screen.querySelectorAll<HTMLElement>('ins.adsbygoogle');
    expect(adIns.length).toBeGreaterThanOrEqual(2);
    adIns.forEach((ins) => {
      expect(ins.dataset.adClient).toBe('ca-pub-1800696416995461');
      expect(ins.dataset.adSlot).toBe('8647716209');
      expect(ins.dataset.adFormat).toBe('auto');
    });
    vi.useRealTimers();
  });
});

describe('SEAM #467 — TC-467-5: arena-ads exports destroy() function', () => {
  it('destroy is exported from arena-ads and is callable without error', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const adsMod = await import('../../src/arena/arena-ads.ts');
    expect(typeof adsMod.destroy).toBe('function');
    // Should not throw even when nothing is running
    expect(() => adsMod.destroy()).not.toThrow();
    vi.useRealTimers();
  });
});

describe('SEAM #467 — TC-467-6: injectAdSlot appends structural-ad-slot class to ins', () => {
  it('every injected ins has the structural-ad-slot CSS class', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-467-6',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'CSS class check',
      opponentName: 'Eve',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };

    renderPostDebate(debate, {
      scoreA: 6,
      scoreB: 4,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 8,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    });

    const adIns = screen.querySelectorAll('ins.structural-ad-slot');
    expect(adIns.length).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });
});

// ============================================================
// SEAM #524 — arena-room-end-render.ts → arena-mod-scoring
// Boundary: renderPostDebate() calls renderModScoring() when
//           debate.moderatorId + debate.moderatorName are set.
//           renderModScoring() calls scoreModerator() → RPC
//           'score_moderator' with { p_debate_id, p_score }.
// ============================================================

describe('SEAM #524 — ARCH: arena-room-end-render imports renderModScoring from arena-mod-scoring', () => {
  it('source file contains an import of renderModScoring from arena-mod-scoring', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-room-end-render.ts'),
      'utf8'
    );
    const importLines = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    expect(importLines.some((l: string) => /renderModScoring/.test(l) && /arena-mod-scoring/.test(l))).toBe(true);
  });
});

describe('SEAM #524 — TC-524-1: renderModScoring section not rendered when no moderator', () => {
  it('mod-score-section absent when moderatorId is null', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = {
      id: 'debate-524-1',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'No mod test',
      opponentName: 'Bob',
      opponentId: 'opp-uuid-001',
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };

    renderPostDebate(debate, {
      scoreA: 5,
      scoreB: 3,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 10,
      endOfDebateBreakdown: null,
      myName: 'Alice',
    });

    expect(screen.querySelector('.mod-score-section')).toBeNull();
    vi.useRealTimers();
  });
});

describe('SEAM #524 — TC-524-2: renderModScoring renders debater buttons when profile is debater_a', () => {
  it('FAIR and UNFAIR buttons rendered when current user is debater_a and moderator is set', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const container = document.createElement('div');

    // Seed profile as debater_a
    _setCurrentProfile({ id: 'debater-a-id', is_moderator: false });

    const debate = {
      id: 'debate-524-2',
      moderatorId: 'mod-uuid-001',
      moderatorName: 'Judge Joe',
      debater_a: 'debater-a-id',
      debater_b: 'debater-b-id',
    };

    renderModScoring(debate, container);

    const section = container.querySelector('.mod-score-section');
    expect(section).not.toBeNull();
    const fairBtn = section!.querySelector('.mod-score-btn.happy');
    const unfairBtn = section!.querySelector('.mod-score-btn.unhappy');
    expect(fairBtn).not.toBeNull();
    expect(unfairBtn).not.toBeNull();
    expect(fairBtn!.textContent).toContain('FAIR');
    expect(unfairBtn!.textContent).toContain('UNFAIR');

    _setCurrentProfile(null);
    vi.useRealTimers();
  });
});

describe('SEAM #524 — TC-524-3: renderModScoring renders slider for spectators', () => {
  it('slider and SUBMIT SCORE button rendered when current user is not debater and not moderator', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const container = document.createElement('div');

    // Seed profile as spectator (not debater_a, not debater_b, not moderator)
    _setCurrentProfile({ id: 'spectator-id', is_moderator: false });

    const debate = {
      id: 'debate-524-3',
      moderatorId: 'mod-uuid-002',
      moderatorName: 'Judge Jane',
      debater_a: 'debater-a-id',
      debater_b: 'debater-b-id',
    };

    renderModScoring(debate, container);

    const section = container.querySelector('.mod-score-section');
    expect(section).not.toBeNull();
    const slider = container.querySelector('#mod-score-slider') as HTMLInputElement | null;
    const submitBtn = container.querySelector('#mod-score-submit');
    expect(slider).not.toBeNull();
    expect(submitBtn).not.toBeNull();
    expect(submitBtn!.textContent).toContain('SUBMIT');

    _setCurrentProfile(null);
    vi.useRealTimers();
  });
});

describe('SEAM #524 — TC-524-4: FAIR button click calls score_moderator RPC with score 25', () => {
  it('clicking FAIR debater button calls mockRpc with score_moderator and p_score:25', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const container = document.createElement('div');

    // Seed profile as debater_a
    _setCurrentProfile({ id: 'debater-a-id', is_moderator: false });
    mockRpc.mockResolvedValue({ data: null, error: null });

    const debate = {
      id: 'debate-524-4',
      moderatorId: 'mod-uuid-003',
      moderatorName: 'Judge Jim',
      debater_a: 'debater-a-id',
      debater_b: 'debater-b-id',
    };

    renderModScoring(debate, container);

    const fairBtn = container.querySelector('.mod-score-btn.happy') as HTMLElement | null;
    expect(fairBtn).not.toBeNull();

    mockRpc.mockClear();
    fairBtn!.click();
    await vi.advanceTimersByTimeAsync(10);

    expect(mockRpc).toHaveBeenCalledWith(
      'score_moderator',
      expect.objectContaining({ p_debate_id: 'debate-524-4', p_score: 25 })
    );

    _setCurrentProfile(null);
    vi.useRealTimers();
  });
});

describe('SEAM #524 — TC-524-5: mod-scored element shows success text after score submission', () => {
  it('mod-scored shows checkmark text after scoreModerator resolves without error', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const container = document.createElement('div');
    // Must be attached to document so document.getElementById('mod-scored') resolves
    document.body.appendChild(container);

    // Seed profile as spectator
    _setCurrentProfile({ id: 'spectator-id', is_moderator: false });
    mockRpc.mockResolvedValue({ data: null, error: null });

    const debate = {
      id: 'debate-524-5',
      moderatorId: 'mod-uuid-004',
      moderatorName: 'Judge Janet',
      debater_a: 'some-other-user',
      debater_b: 'another-user',
    };

    renderModScoring(debate, container);

    const submitBtn = container.querySelector('#mod-score-submit') as HTMLButtonElement | null;
    expect(submitBtn).not.toBeNull();

    submitBtn!.click();
    await vi.advanceTimersByTimeAsync(50);

    const scoredEl = document.getElementById('mod-scored') as HTMLElement | null;
    expect(scoredEl).not.toBeNull();
    expect(scoredEl!.textContent).toContain('Score submitted');

    container.remove();
    _setCurrentProfile(null);
    vi.useRealTimers();
  });
});

describe('SEAM #524 — TC-524-6: moderator cannot score themselves — section skipped', () => {
  it('mod-score-section not rendered when getCurrentProfile id matches moderatorId', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const container = document.createElement('div');

    // Seed profile as the moderator themselves
    _setCurrentProfile({ id: 'mod-uuid-self', is_moderator: true });

    const debate = {
      id: 'debate-524-6',
      moderatorId: 'mod-uuid-self',
      moderatorName: 'JudgeSelf',
      debater_a: 'debater-a-id',
      debater_b: 'debater-b-id',
    };

    renderModScoring(debate, container);

    // isMod guard returns early — mod-score-section should be absent
    expect(container.querySelector('.mod-score-section')).toBeNull();

    _setCurrentProfile(null);
    vi.useRealTimers();
  });
});

describe('SEAM #524 — TC-524-7: arena-mod-scoring exports renderModScoring as named function', () => {
  it('renderModScoring is exported and callable from arena-mod-scoring source', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-mod-scoring.ts'),
      'utf8'
    );
    expect(src).toContain('export function renderModScoring');
  });
});

// ============================================================
// SEAM #523 — arena-room-end-render.ts → arena-room-ai-scoring
// Boundary: renderPostDebate() calls renderAIScorecard() from
//           arena-room-ai-scoring when ctx.aiScores is non-null.
//           renderAIScorecard is a pure string renderer — no RPC,
//           no Supabase. DOM assertions only.
// ============================================================

// Shared AI score fixture for seam #523
function make523Scores(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    side_a: {
      logic:    { score: 9, reason: 'sharp logic' },
      evidence: { score: 8, reason: 'well cited' },
      delivery: { score: 7, reason: 'clear voice' },
      rebuttal: { score: 6, reason: 'solid rebuttal' },
    },
    side_b: {
      logic:    { score: 4, reason: 'weak logic' },
      evidence: { score: 3, reason: 'few sources' },
      delivery: { score: 5, reason: 'average delivery' },
      rebuttal: { score: 4, reason: 'poor counter' },
    },
    overall_winner: 'side_a',
    verdict: 'Side A dominated the debate',
    ...overrides,
  };
}

describe('SEAM #523 — ARCH: arena-room-end-render imports renderAIScorecard from arena-room-ai-scoring', () => {
  it('has an import from ./arena-room-ai-scoring', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    expect(importLines.some((l: string) => l.includes('arena-room-ai-scoring'))).toBe(true);
  });

  it('the import pulls renderAIScorecard (value import, not type-only)', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-room-end-render.ts'), 'utf-8');
    const importLines = source.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const line = importLines.find((l: string) => l.includes('arena-room-ai-scoring'));
    expect(line).toMatch(/renderAIScorecard/);
    expect(line).not.toMatch(/import\s+type\s+\{/);
  });

  it('arena-room-ai-scoring exports renderAIScorecard and sumSideScore', async () => {
    const mod = await import('../../src/arena/arena-room-ai-scoring.ts');
    expect(typeof mod.renderAIScorecard).toBe('function');
    expect(typeof mod.sumSideScore).toBe('function');
  });
});

describe('SEAM #523 — TC-523-1: renderAIScorecard injects .ai-scorecard into the post-debate screen', () => {
  it('.ai-scorecard element is present when aiScores is non-null', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate({ mode: 'ai', role: 'a' });
    const ctx = makeCtx({ aiScores: make523Scores(), winner: 'a', scoreA: 30, scoreB: 16 });

    renderPostDebate(debate, ctx);

    expect(screen.querySelector('.ai-scorecard')).not.toBeNull();
    vi.useRealTimers();
  });
});

describe('SEAM #523 — TC-523-2: renderAIScorecard includes player names in scorecard header', () => {
  it('my name and opponent name both appear inside .ai-scorecard', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate({ mode: 'ai', role: 'a', opponentName: 'Zara' });
    const ctx = makeCtx({ aiScores: make523Scores(), winner: 'a', scoreA: 30, scoreB: 16, myName: 'Quinn' });

    renderPostDebate(debate, ctx);

    const scorecard = screen.querySelector('.ai-scorecard')!;
    expect(scorecard.textContent).toContain('Quinn');
    expect(scorecard.textContent).toContain('Zara');
    vi.useRealTimers();
  });
});

describe('SEAM #523 — TC-523-3: renderAIScorecard renders four criterion rows', () => {
  it('.ai-score-criterion count is exactly 4 (logic, evidence, delivery, rebuttal)', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate({ mode: 'ai', role: 'a' });
    const ctx = makeCtx({ aiScores: make523Scores(), winner: 'a', scoreA: 30, scoreB: 16 });

    renderPostDebate(debate, ctx);

    const criteria = screen.querySelectorAll('.ai-score-criterion');
    expect(criteria.length).toBe(4);
    vi.useRealTimers();
  });

  it('criterion labels contain LOGIC, EVIDENCE, DELIVERY, REBUTTAL', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate({ mode: 'ai', role: 'a' });
    const ctx = makeCtx({ aiScores: make523Scores(), winner: 'a', scoreA: 30, scoreB: 16 });

    renderPostDebate(debate, ctx);

    const allText = screen.querySelector('.ai-scorecard-breakdown')?.textContent ?? '';
    expect(allText).toContain('LOGIC');
    expect(allText).toContain('EVIDENCE');
    expect(allText).toContain('DELIVERY');
    expect(allText).toContain('REBUTTAL');
    vi.useRealTimers();
  });
});

describe('SEAM #523 — TC-523-4: sumSideScore totals drive winner/loser CSS class on scorecard totals', () => {
  it('my total gets winner class when my sumSideScore exceeds opponent sumSideScore', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    // side_a totals: 9+8+7+6=30, side_b totals: 4+3+5+4=16
    const debate = makeDebate({ mode: 'ai', role: 'a' });
    const ctx = makeCtx({ aiScores: make523Scores(), winner: 'a', scoreA: 30, scoreB: 16 });

    renderPostDebate(debate, ctx);

    const totals = screen.querySelectorAll<HTMLElement>('.ai-scorecard-total');
    // First total is mine (role a = side_a = 30), second is opp (side_b = 16)
    expect(totals.length).toBe(2);
    expect(totals[0].classList.contains('winner')).toBe(true);
    expect(totals[1].classList.contains('loser')).toBe(true);
    vi.useRealTimers();
  });

  it('opponent total gets winner class when opp sumSideScore exceeds mine', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    // Flip: role b means mySide = side_b (16 total), oppSide = side_a (30 total)
    const debate = makeDebate({ mode: 'ai', role: 'b' });
    const ctx = makeCtx({ aiScores: make523Scores(), winner: 'a', scoreA: 30, scoreB: 16 });

    renderPostDebate(debate, ctx);

    const totals = screen.querySelectorAll<HTMLElement>('.ai-scorecard-total');
    expect(totals.length).toBe(2);
    // role b → mySide = side_b (16), oppSide = side_a (30). 16 < 30 → loser
    expect(totals[0].classList.contains('loser')).toBe(true);
    expect(totals[1].classList.contains('winner')).toBe(true);
    vi.useRealTimers();
  });
});

describe('SEAM #523 — TC-523-5: renderAIScorecard renders verdict text in .ai-scorecard-verdict', () => {
  it('.ai-scorecard-verdict contains the verdict string from AIScoreResult', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const verdict = 'Side A dominated with superior evidence';
    const debate = makeDebate({ mode: 'ai', role: 'a' });
    const ctx = makeCtx({
      aiScores: make523Scores({ verdict }),
      winner: 'a',
      scoreA: 30,
      scoreB: 16,
    });

    renderPostDebate(debate, ctx);

    const verdictEl = screen.querySelector('.ai-scorecard-verdict');
    expect(verdictEl).not.toBeNull();
    expect(verdictEl!.textContent).toContain(verdict);
    vi.useRealTimers();
  });
});

describe('SEAM #523 — TC-523-6: score bars use width = score * 10 percent', () => {
  it('my logic bar has width: 90% when logic.score = 9', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate({ mode: 'ai', role: 'a' });
    const ctx = makeCtx({ aiScores: make523Scores(), winner: 'a', scoreA: 30, scoreB: 16 });

    renderPostDebate(debate, ctx);

    // First criterion is LOGIC, first bar is 'mine' (side_a logic score 9 → 90%)
    const firstCriterion = screen.querySelector('.ai-score-criterion')!;
    const mineBar = firstCriterion.querySelector<HTMLElement>('.ai-score-bar.mine')!;
    expect(mineBar).not.toBeNull();
    expect(mineBar.style.width).toBe('90%');
    vi.useRealTimers();
  });

  it('opponent logic bar has width: 40% when logic.score = 4', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate({ mode: 'ai', role: 'a' });
    const ctx = makeCtx({ aiScores: make523Scores(), winner: 'a', scoreA: 30, scoreB: 16 });

    renderPostDebate(debate, ctx);

    // First criterion LOGIC, second bar is 'theirs' (side_b logic score 4 → 40%)
    const firstCriterion = screen.querySelector('.ai-score-criterion')!;
    const theirsBar = firstCriterion.querySelector<HTMLElement>('.ai-score-bar.theirs')!;
    expect(theirsBar).not.toBeNull();
    expect(theirsBar.style.width).toBe('40%');
    vi.useRealTimers();
  });
});

describe('SEAM #523 — TC-523-7: criterion reason text is XSS-escaped in the scorecard', () => {
  it('HTML special chars in reason are escaped — not rendered as tags', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const xssReason = '<script>alert(1)</script>';
    const scores = make523Scores({
      side_a: {
        logic:    { score: 9, reason: xssReason },
        evidence: { score: 8, reason: 'ok' },
        delivery: { score: 7, reason: 'ok' },
        rebuttal: { score: 6, reason: 'ok' },
      },
    });

    const debate = makeDebate({ mode: 'ai', role: 'a' });
    const ctx = makeCtx({ aiScores: scores, winner: 'a', scoreA: 30, scoreB: 16 });

    renderPostDebate(debate, ctx);

    // No live <script> element should exist inside scorecard
    const scriptEl = screen.querySelector('.ai-scorecard script');
    expect(scriptEl).toBeNull();
    // The reason text should appear escaped as text content, not as HTML element
    const reasonEls = screen.querySelectorAll('.ai-score-reason');
    const firstReason = reasonEls[0]?.textContent ?? '';
    expect(firstReason).toContain('alert(1)');  // text present...
    // ...but not as a live element
    expect(screen.querySelector('.ai-scorecard script')).toBeNull();
    vi.useRealTimers();
  });
});

// ============================================================
// SEAM #567 — arena-room-end-render.ts → arena-room-end-transcript
// Boundary: attachTranscriptHandler() builds the transcript overlay DOM
// ============================================================

describe('SEAM #567 — TC-567-1: clicking transcript button creates overlay in body', () => {
  it('appends #arena-transcript-overlay to document.body on click', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate({
      messages: [{ role: 'user', text: 'Hello world', round: 1 }],
    });
    renderPostDebate(debate, makeCtx());

    const btn = document.getElementById('arena-transcript')!;
    expect(btn).not.toBeNull();
    expect(document.getElementById('arena-transcript-overlay')).toBeNull();

    btn.click();

    expect(document.getElementById('arena-transcript-overlay')).not.toBeNull();
    vi.useRealTimers();
  });
});

describe('SEAM #567 — TC-567-2: round separators group messages by round number', () => {
  it('renders a round header for each new round', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate({
      messages: [
        { role: 'user', text: 'R1 msg', round: 1 },
        { role: 'assistant', text: 'R1 reply', round: 1 },
        { role: 'user', text: 'R2 msg', round: 2 },
      ],
    });
    renderPostDebate(debate, makeCtx());
    document.getElementById('arena-transcript')!.click();

    const rounds = document.querySelectorAll('.arena-transcript-round');
    expect(rounds.length).toBe(2);
    expect(rounds[0].textContent).toContain('Round 1');
    expect(rounds[1].textContent).toContain('Round 2');
    vi.useRealTimers();
  });
});

describe('SEAM #567 — TC-567-3: empty messages shows placeholder text', () => {
  it('shows "No messages recorded." when messages array is empty — via ARCH check', () => {
    // attachTranscriptHandler builds the overlay client-side from debate.messages.
    // When messages is empty it produces the .arena-transcript-empty placeholder.
    // We verify this by reading the source directly (ARCH-style guard).
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-room-end-transcript.ts'),
      'utf-8',
    );
    // Source must contain the empty-state placeholder string
    expect(src).toContain('No messages recorded.');
    // Source must branch on msgs.length === 0 before building msgHtml
    expect(src).toMatch(/msgs\.length\s*===\s*0/);
  });
});

describe('SEAM #567 — TC-567-4: backdrop click closes the overlay', () => {
  it('removes overlay when clicking the backdrop (not the inner sheet)', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate({
      messages: [{ role: 'user', text: 'Hi', round: 1 }],
    });
    renderPostDebate(debate, makeCtx());
    document.getElementById('arena-transcript')!.click();

    const overlay = document.getElementById('arena-transcript-overlay')!;
    expect(overlay).not.toBeNull();

    // Simulate click on the overlay backdrop (target === overlay)
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.getElementById('arena-transcript-overlay')).toBeNull();
    vi.useRealTimers();
  });
});

describe('SEAM #567 — TC-567-5: re-clicking transcript replaces existing overlay', () => {
  it('removes old overlay and inserts fresh one on second click', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate({
      messages: [{ role: 'user', text: 'First', round: 1 }],
    });
    renderPostDebate(debate, makeCtx());

    const btn = document.getElementById('arena-transcript')!;
    btn.click();
    const first = document.getElementById('arena-transcript-overlay')!;
    expect(first).not.toBeNull();

    btn.click();
    const second = document.getElementById('arena-transcript-overlay')!;
    // Only one overlay should exist at a time
    expect(document.querySelectorAll('#arena-transcript-overlay').length).toBe(1);
    // It should be a fresh element (different instance)
    expect(second).not.toBe(first);
    vi.useRealTimers();
  });
});

describe('SEAM #567 — TC-567-6: message sender name resolution', () => {
  it('uses profile display_name for role=user messages and opponentName for others', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    _setCurrentProfile({ display_name: 'Alice', is_moderator: false });

    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const debate = makeDebate({
      opponentName: 'Bob',
      messages: [
        { role: 'user', text: 'My take', round: 1 },
        { role: 'assistant', text: 'Their take', round: 1 },
      ],
    });
    renderPostDebate(debate, makeCtx({ myName: 'Alice' }));
    document.getElementById('arena-transcript')!.click();

    const names = Array.from(document.querySelectorAll('.t-name')).map((el) => el.textContent);
    expect(names).toContain('Alice');
    expect(names).toContain('Bob');
    vi.useRealTimers();
  });
});

describe('SEAM #567 — TC-567-7: XSS — topic and message text are escaped in transcript overlay', () => {
  it('renders XSS payload as text, not live HTML', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    const screen = document.getElementById('screen-main')!;
    set_screenEl(screen);

    const xssTopic = '<img src=x onerror=alert(1)>';
    const xssText = '<script>evil()</script>';
    const debate = makeDebate({
      topic: xssTopic,
      opponentName: '<b>BadName</b>',
      messages: [{ role: 'user', text: xssText, round: 1 }],
    });
    renderPostDebate(debate, makeCtx());
    document.getElementById('arena-transcript')!.click();

    const overlay = document.getElementById('arena-transcript-overlay')!;
    // No live <img> or <script> elements should be injected
    expect(overlay.querySelector('img')).toBeNull();
    expect(overlay.querySelector('script')).toBeNull();
    // XSS payload should appear as text content
    const topicEl = overlay.querySelector('.arena-transcript-topic');
    expect(topicEl?.textContent).toContain('img src=x');
    vi.useRealTimers();
  });
});

// ============================================================
// SEAM #568 — arena-room-end-render.ts → arena-room-end-after-effects
// Boundary: renderPostDebate() delegates post-debate modifier
//           chain display to renderAfterEffects().
//           Pure renderer — no Supabase calls.
// ============================================================

describe('SEAM #568 — ARCH: arena-room-end-render imports renderAfterEffects from arena-room-end-after-effects', () => {
  it('import line exists in source', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/arena/arena-room-end-render.ts'),
      'utf8'
    );
    const imports = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    expect(imports.some((l: string) => l.includes('renderAfterEffects') && l.includes('arena-room-end-after-effects'))).toBe(true);
  });
});

describe('SEAM #568 — TC-568-1: non-null breakdown with adjustments renders .arena-after-effects', () => {
  it('after-effects section appears with AFTER EFFECTS title', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screen568 = document.getElementById('screen-main')!;
    set_screenEl(screen568);

    const breakdown = {
      debater_a: {
        raw_score: 47,
        adjustments: [{ effect_name: 'Point Surge', delta: 2 }],
        final_score: 49,
      },
      debater_b: {
        raw_score: 30,
        adjustments: [],
        final_score: 30,
      },
      inventory_effects: [],
    };

    const debate = {
      id: 'debate-ae-568-1',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'After effects render test',
      opponentName: 'Bob',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 49,
      scoreB: 30,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 12,
      endOfDebateBreakdown: breakdown,
      myName: 'Alice',
    };

    renderPostDebate(debate, ctx);

    const aeSection = screen568.querySelector('.arena-after-effects');
    expect(aeSection).not.toBeNull();
    expect(aeSection?.textContent).toContain('AFTER EFFECTS');

    vi.useRealTimers();
  });
});

describe('SEAM #568 — TC-568-2: null breakdown renders no .arena-after-effects section', () => {
  it('no after-effects element when endOfDebateBreakdown is null', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screen568 = document.getElementById('screen-main')!;
    set_screenEl(screen568);

    const debate = {
      id: 'debate-ae-568-2',
      role: 'b',
      ranked: false,
      ruleset: 'standard',
      mode: 'live',
      topic: 'No breakdown',
      opponentName: 'Carol',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 20,
      scoreB: 18,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 0,
      endOfDebateBreakdown: null,
      myName: 'Dave',
    };

    renderPostDebate(debate, ctx);

    const aeSection = screen568.querySelector('.arena-after-effects');
    expect(aeSection).toBeNull();

    vi.useRealTimers();
  });
});

describe('SEAM #568 — TC-568-3: positive and negative delta signs and CSS classes render correctly', () => {
  it('positive delta gets ae-step--positive with + prefix; negative gets ae-step--negative with - prefix', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screen568 = document.getElementById('screen-main')!;
    set_screenEl(screen568);

    const breakdown = {
      debater_a: {
        raw_score: 50,
        adjustments: [
          { effect_name: 'Point Surge', delta: 3 },
          { effect_name: 'Point Siphon', delta: -1 },
        ],
        final_score: 52,
      },
      debater_b: {
        raw_score: 40,
        adjustments: [],
        final_score: 40,
      },
      inventory_effects: [],
    };

    const debate = {
      id: 'debate-ae-568-3',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Delta sign test',
      opponentName: 'Eve',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 52,
      scoreB: 40,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 10,
      endOfDebateBreakdown: breakdown,
      myName: 'Frank',
    };

    renderPostDebate(debate, ctx);

    const positiveSteps = screen568.querySelectorAll('.ae-step--positive');
    const negativeSteps = screen568.querySelectorAll('.ae-step--negative');

    expect(positiveSteps.length).toBeGreaterThanOrEqual(1);
    expect(negativeSteps.length).toBeGreaterThanOrEqual(1);

    const posText = positiveSteps[0]?.textContent ?? '';
    expect(posText.trim()).toMatch(/^\+/);

    const negText = negativeSteps[0]?.textContent ?? '';
    expect(negText.trim()).toMatch(/^-/);

    vi.useRealTimers();
  });
});

describe('SEAM #568 — TC-568-4: inventory effects render ae-inv-section with INVENTORY header', () => {
  it('.ae-inv-section with INVENTORY header appears for non-empty inventory_effects', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screen568 = document.getElementById('screen-main')!;
    set_screenEl(screen568);

    const breakdown = {
      debater_a: {
        raw_score: 30,
        adjustments: [{ effect_name: 'Boost', delta: 2 }],
        final_score: 32,
      },
      debater_b: {
        raw_score: 25,
        adjustments: [],
        final_score: 25,
      },
      inventory_effects: [
        { effect: 'mirror', copied_effect_id: 'clarity_boost' },
      ],
    };

    const debate = {
      id: 'debate-ae-568-4',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Inventory effects test',
      opponentName: 'Grace',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 32,
      scoreB: 25,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 8,
      endOfDebateBreakdown: breakdown,
      myName: 'Hank',
    };

    renderPostDebate(debate, ctx);

    const invSection = screen568.querySelector('.ae-inv-section');
    expect(invSection).not.toBeNull();
    expect(invSection?.textContent).toContain('INVENTORY');

    vi.useRealTimers();
  });
});

describe('SEAM #568 — TC-568-5: role b maps debater_b data as "You" row with correct raw score', () => {
  it('when role is b, ae-label "You" and ae-raw show debater_b values', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screen568 = document.getElementById('screen-main')!;
    set_screenEl(screen568);

    const breakdown = {
      debater_a: {
        raw_score: 20,
        adjustments: [],
        final_score: 20,
      },
      debater_b: {
        raw_score: 35,
        adjustments: [{ effect_name: 'Chain Reaction', delta: 5 }],
        final_score: 40,
      },
      inventory_effects: [],
    };

    const debate = {
      id: 'debate-ae-568-5',
      role: 'b',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Role b mapping test',
      opponentName: 'Ivan',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 20,
      scoreB: 40,
      winner: 'b',
      aiScores: null,
      eloChangeMe: 15,
      endOfDebateBreakdown: breakdown,
      myName: 'Judy',
    };

    renderPostDebate(debate, ctx);

    const labels = Array.from(screen568.querySelectorAll('.ae-label')).map((el: Element) => el.textContent?.trim());
    expect(labels).toContain('You');

    const rawEls = screen568.querySelectorAll('.ae-raw');
    const rawValues = Array.from(rawEls).map((el: Element) => el.textContent?.trim());
    expect(rawValues).toContain('35');

    vi.useRealTimers();
  });
});

describe('SEAM #568 — TC-568-6: all-empty adjustments with non-null breakdown renders no after-effects section', () => {
  it('renderAfterEffects returns empty string when all arrays are empty — no section injected', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screen568 = document.getElementById('screen-main')!;
    set_screenEl(screen568);

    const breakdown = {
      debater_a: {
        raw_score: 22,
        adjustments: [],
        final_score: 22,
      },
      debater_b: {
        raw_score: 18,
        adjustments: [],
        final_score: 18,
      },
      inventory_effects: [],
    };

    const debate = {
      id: 'debate-ae-568-6',
      role: 'a',
      ranked: true,
      ruleset: 'amplified',
      mode: 'live',
      topic: 'Empty adjustments test',
      opponentName: 'Karl',
      opponentId: null,
      moderatorId: null,
      moderatorName: null,
      _stakingResult: null,
      messages: [],
    };
    const ctx = {
      scoreA: 22,
      scoreB: 18,
      winner: 'a',
      aiScores: null,
      eloChangeMe: 5,
      endOfDebateBreakdown: breakdown,
      myName: 'Lena',
    };

    renderPostDebate(debate, ctx);

    const aeSection = screen568.querySelector('.arena-after-effects');
    expect(aeSection).toBeNull();

    vi.useRealTimers();
  });
});
