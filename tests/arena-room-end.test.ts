// ============================================================
// ARENA ROOM END — tests/arena-room-end.test.ts
// Source: src/arena/arena-room-end.ts
//
// CLASSIFICATION:
//   endCurrentDebate() — async orchestrator → Integration test
//
// STRATEGY:
//   Mock all imported modules. Test that:
//   - Nulled debates skip scoring and call renderNulledDebate.
//   - Placeholder non-nulled debates call renderPostDebate.
//   - view='postDebate' guard short-circuits.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const stateVars = vi.hoisted(() => ({
  view: 'room' as string,
  currentDebate: null as unknown,
  roundTimer: null as ReturnType<typeof setInterval> | null,
  silenceTimer: null as ReturnType<typeof setInterval> | null,
  activatedPowerUps: new Set<string>(),
  loadedRefs: [] as unknown[],
}));

const mockSet_view        = vi.hoisted(() => vi.fn((v: string) => { stateVars.view = v; }));
const mockSet_silenceTimer = vi.hoisted(() => vi.fn((v: unknown) => { stateVars.silenceTimer = v as ReturnType<typeof setInterval> | null; }));
const mockSet_shieldActive = vi.hoisted(() => vi.fn());

vi.mock('../src/arena/arena-state.ts', () => ({
  get view()            { return stateVars.view; },
  get currentDebate()   { return stateVars.currentDebate; },
  get roundTimer()      { return stateVars.roundTimer; },
  get silenceTimer()    { return stateVars.silenceTimer; },
  get activatedPowerUps() { return stateVars.activatedPowerUps; },
  get loadedRefs()      { return stateVars.loadedRefs; },
  set_view:          mockSet_view,
  set_silenceTimer:  mockSet_silenceTimer,
  set_shieldActive:  mockSet_shieldActive,
}));

const mockGetCurrentProfile    = vi.hoisted(() => vi.fn(() => ({ display_name: 'Alice' })));
const mockRemoveShieldIndicator = vi.hoisted(() => vi.fn());
const mockLeaveDebate          = vi.hoisted(() => vi.fn());
const mockNudge                = vi.hoisted(() => vi.fn());
const mockIsPlaceholder        = vi.hoisted(() => vi.fn(() => true));
const mockPushArenaState       = vi.hoisted(() => vi.fn());
const mockStopOpponentPoll     = vi.hoisted(() => vi.fn());
const mockStopReferencePoll    = vi.hoisted(() => vi.fn());
const mockStopModStatusPoll    = vi.hoisted(() => vi.fn());
const mockCleanupFeedRoom      = vi.hoisted(() => vi.fn());
const mockRenderNulledDebate   = vi.hoisted(() => vi.fn());
const mockGenerateScores       = vi.hoisted(() => vi.fn());
const mockApplyEndOfDebateModifiers = vi.hoisted(() => vi.fn());
const mockFinalizeDebate       = vi.hoisted(() => vi.fn());
const mockRenderPostDebate     = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({ getCurrentProfile: mockGetCurrentProfile }));
vi.mock('../src/powerups.ts', () => ({ removeShieldIndicator: mockRemoveShieldIndicator }));
vi.mock('../src/webrtc.ts', () => ({ leaveDebate: mockLeaveDebate }));
vi.mock('../src/nudge.ts', () => ({ nudge: mockNudge }));
vi.mock('../src/arena/arena-core.utils.ts', () => ({
  isPlaceholder: mockIsPlaceholder,
  pushArenaState: mockPushArenaState,
}));
vi.mock('../src/arena/arena-room-live-poll.ts', () => ({ stopOpponentPoll: mockStopOpponentPoll }));
vi.mock('../src/arena/arena-mod-refs.ts', () => ({ stopReferencePoll: mockStopReferencePoll }));
vi.mock('../src/arena/arena-mod-queue-status.ts', () => ({ stopModStatusPoll: mockStopModStatusPoll }));
vi.mock('../src/arena/arena-feed-room.ts', () => ({ cleanupFeedRoom: mockCleanupFeedRoom }));
vi.mock('../src/arena/arena-room-end-nulled.ts', () => ({ renderNulledDebate: mockRenderNulledDebate }));
vi.mock('../src/arena/arena-room-end-scores.ts', () => ({ generateScores: mockGenerateScores }));
vi.mock('../src/arena/arena-room-end-finalize.ts', () => ({
  applyEndOfDebateModifiers: mockApplyEndOfDebateModifiers,
  finalizeDebate: mockFinalizeDebate,
}));
vi.mock('../src/arena/arena-room-end-render.ts', () => ({ renderPostDebate: mockRenderPostDebate }));
vi.mock('../src/arena/arena-types-results.ts', () => ({}));

import { endCurrentDebate } from '../src/arena/arena-room-end.ts';

const makeDebate = (overrides = {}): unknown => ({
  id: 'placeholder-1',
  topic: 'Test',
  mode: 'text',
  role: 'a',
  messages: [],
  _nulled: false,
  modView: false,
  ...overrides,
});

beforeEach(() => {
  stateVars.view = 'room';
  stateVars.currentDebate = makeDebate();
  stateVars.roundTimer = null;
  stateVars.silenceTimer = null;
  stateVars.activatedPowerUps = new Set();

  mockSet_view.mockClear();
  mockRenderNulledDebate.mockReset();
  mockRenderPostDebate.mockReset();
  mockRemoveShieldIndicator.mockReset();
  mockCleanupFeedRoom.mockReset();
  mockGenerateScores.mockReset();
  mockGenerateScores.mockResolvedValue({ scoreA: 7.5, scoreB: 6.5, aiScores: null, winner: 'a' });
  mockIsPlaceholder.mockReturnValue(true);
});

// ── TC1: guard — no-op when already postDebate ────────────────

describe('TC1 — endCurrentDebate: no-op when view=postDebate', () => {
  it('does not call set_view again when already postDebate', async () => {
    stateVars.view = 'postDebate';
    await endCurrentDebate();
    expect(mockSet_view).not.toHaveBeenCalled();
  });
});

// ── TC2: sets view to postDebate ──────────────────────────────

describe('TC2 — endCurrentDebate: sets view to postDebate', () => {
  it('calls set_view("postDebate")', async () => {
    await endCurrentDebate();
    expect(mockSet_view).toHaveBeenCalledWith('postDebate');
  });
});

// ── TC3: nulled debate calls renderNulledDebate ───────────────

describe('TC3 — endCurrentDebate: nulled debate calls renderNulledDebate', () => {
  it('calls renderNulledDebate and returns early', async () => {
    stateVars.currentDebate = makeDebate({ _nulled: true });
    await endCurrentDebate();
    expect(mockRenderNulledDebate).toHaveBeenCalledTimes(1);
    expect(mockGenerateScores).not.toHaveBeenCalled();
  });
});

// ── TC4: non-nulled calls generateScores ─────────────────────

describe('TC4 — endCurrentDebate: non-nulled debate calls generateScores', () => {
  it('calls generateScores for normal debate', async () => {
    await endCurrentDebate();
    expect(mockGenerateScores).toHaveBeenCalledTimes(1);
  });
});

// ── TC5: calls renderPostDebate ───────────────────────────────

describe('TC5 — endCurrentDebate: calls renderPostDebate at end', () => {
  it('calls renderPostDebate with debate and score data', async () => {
    await endCurrentDebate();
    expect(mockRenderPostDebate).toHaveBeenCalledTimes(1);
  });
});

// ── TC6: calls removeShieldIndicator ─────────────────────────

describe('TC6 — endCurrentDebate: clears shield state', () => {
  it('calls removeShieldIndicator', async () => {
    await endCurrentDebate();
    expect(mockRemoveShieldIndicator).toHaveBeenCalledTimes(1);
  });
});

// ── TC7: live mode cleans up feed room ───────────────────────

describe('TC7 — endCurrentDebate: live mode calls cleanupFeedRoom', () => {
  it('calls cleanupFeedRoom for live mode debate', async () => {
    stateVars.currentDebate = makeDebate({ mode: 'live' });
    await endCurrentDebate();
    expect(mockCleanupFeedRoom).toHaveBeenCalledTimes(1);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-room-end.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../powerups.ts',
      '../webrtc.ts',
      '../nudge.ts',
      './arena-state.ts',
      './arena-types-results.ts',
      './arena-core.utils.ts',
      './arena-room-live-poll.ts',
      './arena-mod-refs.ts',
      './arena-mod-queue-status.ts',
      './arena-feed-room.ts',
      './arena-room-end-nulled.ts',
      './arena-room-end-scores.ts',
      './arena-room-end-finalize.ts',
      './arena-room-end-render.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-end.ts'),
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
