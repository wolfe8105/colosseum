// int-arena-room-live-poll-core-utils.test.ts
// Seam #054: src/arena/arena-room-live-poll.ts → arena-core.utils
// Tests isPlaceholder() and formatTimer() as consumed by arena-room-live-poll.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

describe('Seam #054 | arena-room-live-poll → arena-core.utils', () => {
  // ── ARCH filter: verify the seam imports ─────────────────────────────────
  it('TC1: arena-room-live-poll imports isPlaceholder and formatTimer from arena-core.utils', async () => {
    vi.resetModules();
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve('src/arena/arena-room-live-poll.ts');
    const source = fs.readFileSync(filePath, 'utf8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const coreUtilsLine = importLines.find(l => l.includes('arena-core.utils'));
    expect(coreUtilsLine).toBeTruthy();
    expect(coreUtilsLine).toMatch(/isPlaceholder/);
    expect(coreUtilsLine).toMatch(/formatTimer/);
  });

  // ── formatTimer unit tests ────────────────────────────────────────────────
  describe('formatTimer', () => {
    let formatTimer: (sec: number) => string;

    beforeEach(async () => {
      vi.resetModules();
      const mod = await import('../../src/arena/arena-core.utils.ts');
      formatTimer = mod.formatTimer;
    });

    it('TC2: formatTimer(0) returns "0:00"', () => {
      expect(formatTimer(0)).toBe('0:00');
    });

    it('TC3: formatTimer(65) returns "1:05"', () => {
      expect(formatTimer(65)).toBe('1:05');
    });

    it('TC4: formatTimer(59) returns "0:59"', () => {
      expect(formatTimer(59)).toBe('0:59');
    });

    it('TC5: formatTimer(120) returns "2:00"', () => {
      expect(formatTimer(120)).toBe('2:00');
    });
  });

  // ── isPlaceholder unit tests ──────────────────────────────────────────────
  describe('isPlaceholder', () => {
    afterEach(() => {
      vi.resetModules();
      vi.restoreAllMocks();
    });

    it('TC6: isPlaceholder() returns true when getSupabaseClient returns null', async () => {
      vi.resetModules();
      vi.doMock('../../src/auth.ts', () => ({
        getSupabaseClient: vi.fn(() => null),
        safeRpc: vi.fn(),
      }));
      vi.doMock('../../src/config.ts', () => ({
        isAnyPlaceholder: false,
        ModeratorConfig: { escapeHTML: (s: string) => s },
        showToast: vi.fn(),
      }));
      const mod = await import('../../src/arena/arena-core.utils.ts');
      expect(mod.isPlaceholder()).toBe(true);
    });

    it('TC7: isPlaceholder() returns true when isAnyPlaceholder flag is true (even with client)', async () => {
      vi.resetModules();
      vi.doMock('../../src/auth.ts', () => ({
        getSupabaseClient: vi.fn(() => ({ rpc: vi.fn() })),
        safeRpc: vi.fn(),
      }));
      vi.doMock('../../src/config.ts', () => ({
        isAnyPlaceholder: true,
        ModeratorConfig: { escapeHTML: (s: string) => s },
        showToast: vi.fn(),
      }));
      const mod = await import('../../src/arena/arena-core.utils.ts');
      expect(mod.isPlaceholder()).toBe(true);
    });

    it('TC8: isPlaceholder() returns false when client exists and isAnyPlaceholder is false', async () => {
      vi.resetModules();
      vi.doMock('../../src/auth.ts', () => ({
        getSupabaseClient: vi.fn(() => ({ rpc: vi.fn() })),
        safeRpc: vi.fn(),
      }));
      vi.doMock('../../src/config.ts', () => ({
        isAnyPlaceholder: false,
        ModeratorConfig: { escapeHTML: (s: string) => s },
        showToast: vi.fn(),
      }));
      const mod = await import('../../src/arena/arena-core.utils.ts');
      expect(mod.isPlaceholder()).toBe(false);
    });
  });

  // ── Integration: startLiveRoundTimer uses formatTimer ─────────────────────
  describe('startLiveRoundTimer uses formatTimer via arena-room-live-poll', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.resetModules();
      vi.restoreAllMocks();
    });

    it('TC9: startLiveRoundTimer updates #arena-room-timer with formatted time each second', async () => {
      vi.resetModules();

      // Mock heavy deps before importing poll module
      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => ({
          auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
          rpc: vi.fn(),
          from: vi.fn(),
        })),
      }));
      vi.doMock('../../src/auth.ts', () => ({
        getSupabaseClient: vi.fn(() => ({ rpc: vi.fn() })),
        safeRpc: vi.fn(),
      }));
      vi.doMock('../../src/config.ts', () => ({
        isAnyPlaceholder: false,
        ModeratorConfig: { escapeHTML: (s: string) => s },
        showToast: vi.fn(),
        friendlyError: vi.fn((e: unknown) => String(e)),
      }));
      vi.doMock('../../src/nudge.ts', () => ({ nudge: vi.fn() }));
      vi.doMock('../../src/contracts/rpc-schemas.ts', () => ({
        get_debate_messages: {},
      }));
      vi.doMock('../../src/arena/arena-room-ai-response.ts', () => ({
        handleAIResponse: vi.fn(),
        generateSimulatedResponse: vi.fn(() => 'sim'),
      }));
      vi.doMock('../../src/arena/arena-room-end.ts', () => ({
        endCurrentDebate: vi.fn(),
      }));
      vi.doMock('../../src/arena/arena-room-live-messages.ts', () => ({
        addMessage: vi.fn(),
        addSystemMessage: vi.fn(),
      }));

      // Provide arena-state with a live debate and exposed setters
      let _roundTimer: ReturnType<typeof setInterval> | null = null;
      let _roundTimeLeft = 0;
      vi.doMock('../../src/arena/arena-state.ts', () => ({
        get currentDebate() {
          return { id: 'live-123', role: 'a', round: 2, totalRounds: 3, mode: 'live' };
        },
        get opponentPollTimer() { return null; },
        get opponentPollElapsed() { return 0; },
        get roundTimer() { return _roundTimer; },
        get roundTimeLeft() { return _roundTimeLeft; },
        set_opponentPollTimer: vi.fn(),
        set_opponentPollElapsed: vi.fn(),
        set_roundTimer: (t: ReturnType<typeof setInterval> | null) => { _roundTimer = t; },
        set_roundTimeLeft: (v: number) => { _roundTimeLeft = v; },
      }));
      vi.doMock('../../src/arena/arena-constants.ts', () => ({
        OPPONENT_POLL_MS: 3000,
        OPPONENT_POLL_TIMEOUT_SEC: 30,
        ROUND_DURATION: 120,
      }));

      // Create timer DOM element
      const timerEl = document.createElement('div');
      timerEl.id = 'arena-room-timer';
      document.body.appendChild(timerEl);

      try {
        const { startLiveRoundTimer } = await import('../../src/arena/arena-room-live-poll.ts');
        startLiveRoundTimer();

        // After 1 tick, roundTimeLeft decrements from 120 → 119 → formatTimer(119) = "1:59"
        await vi.advanceTimersByTimeAsync(1000);
        expect(timerEl.textContent).toBe('1:59');

        // After another tick: 118 → "1:58"
        await vi.advanceTimersByTimeAsync(1000);
        expect(timerEl.textContent).toBe('1:58');
      } finally {
        document.body.removeChild(timerEl);
        if (_roundTimer) clearInterval(_roundTimer);
      }
    });
  });
});
