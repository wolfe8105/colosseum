import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, auth: mockAuth })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });

  // Minimal DOM: tip status label + two tip buttons (side a and side b)
  document.body.innerHTML = `
    <div id="feed-tip-status"></div>
    <button class="feed-tip-btn" data-side="a" data-amount="5" disabled>+5 A</button>
    <button class="feed-tip-btn" data-side="b" data-amount="5" disabled>+5 B</button>
  `;
});

// TC-01: ARCH — arena-feed-wiring-spectator.ts still imports from rpc-schemas
describe('TC-01 — ARCH: seam #086 import boundary unchanged', () => {
  it('arena-feed-wiring-spectator.ts imports from rpc-schemas', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-feed-wiring-spectator.ts'),
      'utf-8',
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('rpc-schemas'))).toBe(true);
    expect(importLines.some(l => l.includes('get_user_watch_tier'))).toBe(true);
    expect(importLines.some(l => l.includes('cast_sentiment_tip'))).toBe(true);
  });
});

// TC-02: get_user_watch_tier schema — array-of-one branch (Postgres returns rows)
describe('TC-02 — get_user_watch_tier schema accepts array-of-one { tier: string }', () => {
  it('parses an array containing a single WatchTierRow', async () => {
    const { get_user_watch_tier } = await import('../../src/contracts/rpc-schemas.ts');
    const payload = [{ tier: 'Bronze' }];
    const result = get_user_watch_tier.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as { tier: string }[])[0].tier).toBe('Bronze');
    }
  });
});

// TC-03: get_user_watch_tier schema — single object branch
describe('TC-03 — get_user_watch_tier schema accepts a plain { tier: string } object', () => {
  it('parses a single WatchTierRow object', async () => {
    const { get_user_watch_tier } = await import('../../src/contracts/rpc-schemas.ts');
    const payload = { tier: 'Silver' };
    const result = get_user_watch_tier.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as { tier: string }).tier).toBe('Silver');
    }
  });
});

// TC-04: cast_sentiment_tip schema — success response shape
describe('TC-04 — cast_sentiment_tip schema accepts a successful tip response', () => {
  it('parses { success, new_total_a, new_total_b, new_balance }', async () => {
    const { cast_sentiment_tip } = await import('../../src/contracts/rpc-schemas.ts');
    const payload = {
      success: true,
      new_total_a: 25,
      new_total_b: 15,
      new_balance: 90,
    };
    const result = cast_sentiment_tip.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
      expect(result.data.new_total_a).toBe(25);
      expect(result.data.new_total_b).toBe(15);
      expect(result.data.new_balance).toBe(90);
    }
  });
});

// TC-05: cast_sentiment_tip schema — error response shape
describe('TC-05 — cast_sentiment_tip schema accepts an error response', () => {
  it('parses { error: "insufficient_tokens" }', async () => {
    const { cast_sentiment_tip } = await import('../../src/contracts/rpc-schemas.ts');
    const payload = { error: 'insufficient_tokens' };
    const result = cast_sentiment_tip.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error).toBe('insufficient_tokens');
    }
  });
});

// TC-06: wireSpectatorTipButtons — Unranked tier keeps buttons disabled and sets status text
describe('TC-06 — wireSpectatorTipButtons sets status text and leaves buttons disabled for Unranked', () => {
  it('shows unlock message and does not enable tip buttons when tier is Unranked', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_user_watch_tier')
        return Promise.resolve({ data: [{ tier: 'Unranked' }], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { wireSpectatorTipButtons } = await import('../../src/arena/arena-feed-wiring-spectator.ts');
    const fakeDebate = { id: 'debate-001' } as import('../../src/arena/arena-types.ts').CurrentDebate;

    await wireSpectatorTipButtons(fakeDebate);
    await vi.advanceTimersByTimeAsync(0);

    const statusEl = document.getElementById('feed-tip-status');
    const tipBtns = Array.from(document.querySelectorAll('.feed-tip-btn')) as HTMLButtonElement[];

    expect(statusEl?.textContent).toBe('Watch a full debate to unlock tipping.');
    tipBtns.forEach(btn => expect(btn.disabled).toBe(true));
  });
});

// TC-07: wireSpectatorTipButtons — non-Unranked tier enables tip buttons and sets tier status text
describe('TC-07 — wireSpectatorTipButtons enables tip buttons for non-Unranked tier', () => {
  it('enables buttons and shows tier · Tap to tip when tier is Bronze', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_user_watch_tier')
        return Promise.resolve({ data: [{ tier: 'Bronze' }], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    // Override depth-gate to pass (not blocked)
    vi.doMock('../../src/depth-gate.ts', () => ({ isDepthBlocked: () => false }));

    const { wireSpectatorTipButtons } = await import('../../src/arena/arena-feed-wiring-spectator.ts');
    const fakeDebate = { id: 'debate-002' } as import('../../src/arena/arena-types.ts').CurrentDebate;

    await wireSpectatorTipButtons(fakeDebate);
    await vi.advanceTimersByTimeAsync(0);

    const statusEl = document.getElementById('feed-tip-status');
    const tipBtns = Array.from(document.querySelectorAll('.feed-tip-btn')) as HTMLButtonElement[];

    expect(statusEl?.textContent).toBe('Bronze · Tap to tip');
    tipBtns.forEach(btn => expect(btn.disabled).toBe(false));
  });
});
