// ============================================================
// INTEGRATOR — arena-feed-wiring-spectator + arena-feed-state
// Seam #117 | score: 18
// Boundary: wireSpectatorTipButtons reads pendingSentimentA/B from
//           arena-feed-state, calls set_pendingSentimentA/B on
//           successful tip, reads get_user_watch_tier to gate buttons,
//           uses cast_sentiment_tip RPC for tip submission.
// Mock boundary: @supabase/supabase-js only.
// Transitive deps (arena-feed-ui, depth-gate) mocked.
// All source modules run real.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// NOTE: arena-feed-ui is NOT mocked at top level — the real implementation runs.
// This allows TC8-TC11 to exercise the real applySentimentUpdate/updateSentimentGauge
// without needing vi.unmock (which is hoisted and would break isolation).
// TC4/TC5 check sentimentA/B totals (post-flush) instead of pending values.

// Mock depth-gate to control isDepthBlocked
vi.mock('../../src/depth-gate.ts', () => ({
  isDepthBlocked: vi.fn().mockReturnValue(false),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let wireSpectatorTipButtons: (debate: unknown) => Promise<void>;

let getPendingSentimentA: () => number;
let getPendingSentimentB: () => number;
let getSentimentA: () => number;
let getSentimentB: () => number;
let resetFeedRoomState: () => void;

let isDepthBlockedMock: ReturnType<typeof vi.fn>;

const makeDebate = (overrides: Record<string, unknown> = {}) => ({
  id: 'debate-uuid-001',
  role: 'spectator',
  modView: false,
  topic: 'Test topic',
  ...overrides,
});

beforeEach(async () => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  document.body.innerHTML = `
    <div id="screen-main">
      <div id="feed-tip-status"></div>
      <div id="feed-sentiment-a" style="width:50%"></div>
      <div id="feed-sentiment-b" style="width:50%"></div>
      <button class="feed-tip-btn" data-side="a" data-amount="5" disabled></button>
      <button class="feed-tip-btn" data-side="b" data-amount="5" disabled></button>
    </div>
  `;

  const wiringMod = await import('../../src/arena/arena-feed-wiring-spectator.ts');
  wireSpectatorTipButtons = wiringMod.wireSpectatorTipButtons as (debate: unknown) => Promise<void>;

  const stateMod = await import('../../src/arena/arena-feed-state.ts');
  getPendingSentimentA = () => stateMod.pendingSentimentA;
  getPendingSentimentB = () => stateMod.pendingSentimentB;
  getSentimentA = () => stateMod.sentimentA;
  getSentimentB = () => stateMod.sentimentB;
  resetFeedRoomState = stateMod.resetFeedRoomState;

  // Reset state between tests
  resetFeedRoomState();

  const depthMod = await import('../../src/depth-gate.ts');
  isDepthBlockedMock = depthMod.isDepthBlocked as ReturnType<typeof vi.fn>;
  isDepthBlockedMock.mockReturnValue(false);
});

// ============================================================
// ARCH filter: import lines only
// ============================================================
describe('ARCH — import lines', () => {
  it('only imports from expected modules', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve('src/arena/arena-feed-wiring-spectator.ts');
    const source = fs.readFileSync(filePath, 'utf8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../config.ts',
      '../depth-gate.ts',
      './arena-types.ts',
      './arena-feed-state.ts',
      './arena-feed-ui.ts',
    ];
    for (const line of importLines) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!match) continue;
      expect(allowed).toContain(match[1]);
    }
  });
});

// ============================================================
// TC1: Unranked tier — status text set, buttons stay disabled
// ============================================================
describe('TC1 — Unranked tier disables tip buttons', () => {
  it('sets status text and leaves buttons disabled when tier is Unranked', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ tier: 'Unranked' }],
      error: null,
    });

    await wireSpectatorTipButtons(makeDebate());

    const statusEl = document.getElementById('feed-tip-status')!;
    expect(statusEl.textContent).toBe('Watch a full debate to unlock tipping.');

    const btns = Array.from(document.querySelectorAll('.feed-tip-btn')) as HTMLButtonElement[];
    btns.forEach(btn => expect(btn.disabled).toBe(true));
  });
});

// ============================================================
// TC2: isDepthBlocked() true — buttons stay disabled
// ============================================================
describe('TC2 — depth-gated users cannot tip', () => {
  it('returns early without enabling buttons when depth is blocked', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ tier: 'Bronze' }],
      error: null,
    });
    isDepthBlockedMock.mockReturnValue(true);

    await wireSpectatorTipButtons(makeDebate());

    const btns = Array.from(document.querySelectorAll('.feed-tip-btn')) as HTMLButtonElement[];
    btns.forEach(btn => expect(btn.disabled).toBe(true));
  });
});

// ============================================================
// TC3: Non-Unranked tier, not depth-blocked — buttons enabled, status set
// ============================================================
describe('TC3 — non-Unranked tier enables tip buttons', () => {
  it('enables buttons and sets status to tier + Tap to tip', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ tier: 'Silver' }],
      error: null,
    });

    await wireSpectatorTipButtons(makeDebate());

    const statusEl = document.getElementById('feed-tip-status')!;
    expect(statusEl.textContent).toBe('Silver · Tap to tip');

    const btns = Array.from(document.querySelectorAll('.feed-tip-btn')) as HTMLButtonElement[];
    btns.forEach(btn => expect(btn.disabled).toBe(false));
  });
});

// ============================================================
// TC4: Successful tip for side A — sentiment totals updated via applySentimentUpdate
// The real applySentimentUpdate flushes pending→total and zeroes pending.
// We assert sentimentA increases and pendingSentimentA is zeroed.
// ============================================================
describe('TC4 — successful tip updates sentimentA via applySentimentUpdate', () => {
  it('sentimentA increases by tip amount and pending is zeroed after side-a tip success', async () => {
    // Watch tier call
    mockRpc.mockResolvedValueOnce({ data: [{ tier: 'Gold' }], error: null });
    // cast_sentiment_tip call
    mockRpc.mockResolvedValueOnce({
      data: { success: true, new_total_a: 5, new_total_b: 0, new_balance: 95 },
      error: null,
    });

    await wireSpectatorTipButtons(makeDebate());

    const btnA = document.querySelector('.feed-tip-btn[data-side="a"]') as HTMLButtonElement;
    btnA.click();
    await vi.advanceTimersByTimeAsync(0);

    // applySentimentUpdate flushed pending into sentiment: sentimentA = 0 + 5 = 5
    expect(getSentimentA()).toBe(5);
    // pending was zeroed by applySentimentUpdate
    expect(getPendingSentimentA()).toBe(0);
  });
});

// ============================================================
// TC5: Successful tip for side B — sentimentB updated, status shows confirmation
// ============================================================
describe('TC5 — successful tip updates sentimentB and shows status confirmation', () => {
  it('sentimentB increases by tip amount and status shows "+N → B ✓"', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ tier: 'Gold' }], error: null });
    mockRpc.mockResolvedValueOnce({
      data: { success: true, new_total_a: 0, new_total_b: 5, new_balance: 95 },
      error: null,
    });

    await wireSpectatorTipButtons(makeDebate());

    const btnB = document.querySelector('.feed-tip-btn[data-side="b"]') as HTMLButtonElement;
    btnB.click();
    await vi.advanceTimersByTimeAsync(0);

    // applySentimentUpdate flushed pending into sentiment: sentimentB = 0 + 5 = 5
    expect(getSentimentB()).toBe(5);
    expect(getPendingSentimentB()).toBe(0);

    const statusEl = document.getElementById('feed-tip-status')!;
    expect(statusEl.textContent).toBe('+5 → B ✓');
  });
});

// ============================================================
// TC6: insufficient_tokens error — toast shown, buttons stay disabled (early return)
// ============================================================
describe('TC6 — insufficient_tokens error leaves buttons disabled (early return path)', () => {
  it('buttons stay disabled and pendingSentiment unchanged on insufficient_tokens', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ tier: 'Silver' }], error: null });
    mockRpc.mockResolvedValueOnce({
      data: { error: 'insufficient_tokens' },
      error: null,
    });

    await wireSpectatorTipButtons(makeDebate());

    const btnA = document.querySelector('.feed-tip-btn[data-side="a"]') as HTMLButtonElement;
    btnA.click();
    // Flush the RPC promise only — error path `return`s early inside try, no setTimeout fired
    await vi.advanceTimersByTimeAsync(0);

    // Source code: result.error branches return early inside try — no re-enable call
    // Buttons remain disabled (in-flight disable was not undone)
    const btns = Array.from(document.querySelectorAll('.feed-tip-btn')) as HTMLButtonElement[];
    btns.forEach(btn => expect(btn.disabled).toBe(true));

    // pendingSentiment must be unchanged
    expect(getPendingSentimentA()).toBe(0);
    expect(getPendingSentimentB()).toBe(0);
  });
});

// ============================================================
// TC7: Success re-enables buttons after 800ms setTimeout
// ============================================================
describe('TC7 — buttons re-enabled after 800ms on successful tip', () => {
  it('buttons disabled during in-flight, then re-enabled and status reset after 800ms', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ tier: 'Gold' }], error: null });
    mockRpc.mockResolvedValueOnce({
      data: { success: true, new_total_a: 5, new_total_b: 0, new_balance: 95 },
      error: null,
    });

    await wireSpectatorTipButtons(makeDebate());

    const btnA = document.querySelector('.feed-tip-btn[data-side="a"]') as HTMLButtonElement;
    btnA.click();

    // Flush RPC microtasks — 800ms timer is scheduled but not fired yet
    await vi.advanceTimersByTimeAsync(0);

    // After RPC resolves but before 800ms: buttons still disabled (in-flight)
    const btnsBeforeTimeout = Array.from(
      document.querySelectorAll('.feed-tip-btn')
    ) as HTMLButtonElement[];
    btnsBeforeTimeout.forEach(btn => expect(btn.disabled).toBe(true));

    // Now advance 800ms to fire the re-enable setTimeout
    await vi.advanceTimersByTimeAsync(800);

    const btnsAfter = Array.from(
      document.querySelectorAll('.feed-tip-btn')
    ) as HTMLButtonElement[];
    btnsAfter.forEach(btn => expect(btn.disabled).toBe(false));

    const statusEl = document.getElementById('feed-tip-status')!;
    expect(statusEl.textContent).toBe('Tap to tip');
  });
});

// ============================================================
// SEAM #142 — arena-feed-wiring-spectator → arena-feed-ui
// These TCs exercise arena-feed-ui's applySentimentUpdate and
// updateSentimentGauge functions directly, confirming the seam
// boundary behaves correctly end-to-end.
// Each test calls vi.resetModules() internally and imports ALL
// needed modules in the same cycle so they share one state instance.
// ============================================================

// ============================================================
// TC8: applySentimentUpdate flushes pending into sentiment vars
// (Real arena-feed-ui runs — no mock needed at this point)
// ============================================================
describe('TC8 — applySentimentUpdate flushes pending sentiment into totals', () => {
  it('adds pendingSentimentA/B to sentimentA/B and zeroes pending', async () => {
    // beforeEach already sets up a fresh module registry with real arena-feed-ui
    const stateMod = await import('../../src/arena/arena-feed-state.ts');
    const uiMod = await import('../../src/arena/arena-feed-ui.ts');

    stateMod.resetFeedRoomState();
    stateMod.set_sentimentA(10);
    stateMod.set_sentimentB(20);
    stateMod.set_pendingSentimentA(5);
    stateMod.set_pendingSentimentB(3);

    uiMod.applySentimentUpdate();

    expect(stateMod.sentimentA).toBe(15);
    expect(stateMod.sentimentB).toBe(23);
    expect(stateMod.pendingSentimentA).toBe(0);
    expect(stateMod.pendingSentimentB).toBe(0);
  });
});

// ============================================================
// TC9: updateSentimentGauge computes correct widths
// ============================================================
describe('TC9 — updateSentimentGauge sets correct width percentages on DOM elements', () => {
  it('sets #feed-sentiment-a to 33% and #feed-sentiment-b to 67% when sentimentA=10, B=20', async () => {
    document.body.innerHTML = `
      <div id="feed-sentiment-a" style="width:50%"></div>
      <div id="feed-sentiment-b" style="width:50%"></div>
    `;

    const stateMod = await import('../../src/arena/arena-feed-state.ts');
    const uiMod = await import('../../src/arena/arena-feed-ui.ts');

    stateMod.resetFeedRoomState();
    stateMod.set_sentimentA(10);
    stateMod.set_sentimentB(20);

    uiMod.updateSentimentGauge();

    const fillA = document.getElementById('feed-sentiment-a')!;
    const fillB = document.getElementById('feed-sentiment-b')!;
    expect(fillA.style.width).toBe('33%');
    expect(fillB.style.width).toBe('67%');
  });
});

// ============================================================
// TC10: updateSentimentGauge defaults to 50/50 when totals are zero
// ============================================================
describe('TC10 — updateSentimentGauge defaults to 50/50 when both sentiments are zero', () => {
  it('keeps 50% widths when sentimentA=0 and sentimentB=0', async () => {
    document.body.innerHTML = `
      <div id="feed-sentiment-a" style="width:99%"></div>
      <div id="feed-sentiment-b" style="width:1%"></div>
    `;

    const stateMod = await import('../../src/arena/arena-feed-state.ts');
    const uiMod = await import('../../src/arena/arena-feed-ui.ts');

    stateMod.resetFeedRoomState();
    // sentimentA/B are 0 after reset

    uiMod.updateSentimentGauge();

    const fillA = document.getElementById('feed-sentiment-a')!;
    const fillB = document.getElementById('feed-sentiment-b')!;
    expect(fillA.style.width).toBe('50%');
    expect(fillB.style.width).toBe('50%');
  });
});

// ============================================================
// TC11: applySentimentUpdate triggers DOM gauge update
// ============================================================
describe('TC11 — applySentimentUpdate triggers DOM gauge update via updateSentimentGauge', () => {
  it('DOM widths reflect the post-flush totals after applySentimentUpdate', async () => {
    // beforeEach DOM already has feed-sentiment-a/b from the shared HTML
    const stateMod = await import('../../src/arena/arena-feed-state.ts');
    const uiMod = await import('../../src/arena/arena-feed-ui.ts');

    stateMod.resetFeedRoomState();
    stateMod.set_sentimentA(0);
    stateMod.set_sentimentB(0);
    stateMod.set_pendingSentimentA(100);

    uiMod.applySentimentUpdate();

    // After flush: sentimentA=100, B=0 → 100% for A
    const fillA = document.getElementById('feed-sentiment-a')!;
    expect(fillA.style.width).toBe('100%');
  });
});

// ============================================================
// TC12: get_user_watch_tier RPC called with correct rpc name and args
// ============================================================
describe('TC12 — wireSpectatorTipButtons calls get_user_watch_tier RPC with correct name', () => {
  it('invokes supabase.rpc with "get_user_watch_tier" and an empty params object', async () => {
    // Use the beforeEach-imported wireSpectatorTipButtons (already set up with mockRpc)
    mockRpc.mockReset();
    mockRpc.mockResolvedValueOnce({ data: [{ tier: 'Unranked' }], error: null });

    document.body.innerHTML = `<div id="feed-tip-status"></div>`;

    await wireSpectatorTipButtons(
      { id: 'debate-uuid-abc', role: 'spectator', modView: false, topic: 'T' }
    );

    // safeRpc calls supabase.rpc(fnName, args) — only 2 positional args
    expect(mockRpc).toHaveBeenCalledWith('get_user_watch_tier', {});
  });
});
