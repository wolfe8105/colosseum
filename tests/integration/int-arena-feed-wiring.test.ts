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

// Stub @peermetrics/webrtc-stats — pulled in transitively via webrtc chain
vi.mock('@peermetrics/webrtc-stats', () => ({
  WebRTCStats: vi.fn().mockImplementation(() => ({
    addConnection: vi.fn(),
    destroy: vi.fn(),
  })),
}));

// Stub the sub-wiring modules — they have deep chains (deepgram, realtime, auth)
// that are not under test here. renderControls calls them but their internal
// behaviour is covered by their own seam tests.
vi.mock('../../src/arena/arena-feed-wiring-debater.ts', () => ({
  wireDebaterControls: vi.fn(),
}));
vi.mock('../../src/arena/arena-feed-wiring-spectator.ts', () => ({
  wireSpectatorTipButtons: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../src/arena/arena-feed-wiring-mod.ts', () => ({
  wireModControls: vi.fn(),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = '<div id="screen-main"><div id="feed-controls"></div></div>';
});

// ---------------------------------------------------------------------------
// TC1: renderControls — debater view renders challenge button with default count
// ---------------------------------------------------------------------------
describe('TC1 — debater view renders challenge button showing default challengesRemaining (3)', () => {
  it('injects #feed-challenge-btn with text "CHALLENGE (3)" when challengesRemaining is 3', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    // challengesRemaining defaults to 3 — no explicit set needed
    expect(state.challengesRemaining).toBe(3);

    const mod = await import('../../src/arena/arena-feed-wiring.ts');
    mod.renderControls(
      {
        id: 'debate-001',
        topic: 'Test topic',
        status: 'live',
        mode: 'text',
        moderatorType: null,
        side: 'a',
        opponentId: 'opp-1',
        opponentUsername: 'opponent',
        round: 1,
        totalRounds: 3,
        ruleset: 'amplified',
        ranked: false,
        category: null,
        startedAt: null,
        endedAt: null,
        isSpectating: false,
        spectatorView: false,
        debaterAName: 'Alice',
        debaterBName: 'Bob',
        linkUrl: null,
        linkPreview: null,
      } as unknown as import('../../src/arena/arena-types.ts').CurrentDebate,
      false
    );

    const btn = document.getElementById('feed-challenge-btn');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain('CHALLENGE (3)');
  });
});

// ---------------------------------------------------------------------------
// TC2: renderControls — debater view reflects a mutated challengesRemaining
// ---------------------------------------------------------------------------
describe('TC2 — debater view reflects mutated challengesRemaining via live binding', () => {
  it('shows updated count after set_challengesRemaining(1)', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_challengesRemaining(1);

    const mod = await import('../../src/arena/arena-feed-wiring.ts');
    mod.renderControls(
      {
        id: 'debate-002',
        topic: 'Binding test',
        status: 'live',
        mode: 'text',
        moderatorType: null,
        side: 'b',
        opponentId: 'opp-2',
        opponentUsername: 'opponent2',
        round: 2,
        totalRounds: 3,
        ruleset: 'amplified',
        ranked: false,
        category: null,
        startedAt: null,
        endedAt: null,
        isSpectating: false,
        spectatorView: false,
        debaterAName: 'Alice',
        debaterBName: 'Bob',
        linkUrl: null,
        linkPreview: null,
      } as unknown as import('../../src/arena/arena-types.ts').CurrentDebate,
      false
    );

    const btn = document.getElementById('feed-challenge-btn');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain('CHALLENGE (1)');
  });
});

// ---------------------------------------------------------------------------
// TC3: renderControls — debater view renders all key debater elements
// ---------------------------------------------------------------------------
describe('TC3 — debater view renders full debater control set', () => {
  it('injects textarea, send btn, cite btn, finish-turn btn, concede btn', async () => {
    const mod = await import('../../src/arena/arena-feed-wiring.ts');
    mod.renderControls(
      {
        id: 'debate-003',
        topic: 'Full debater controls',
        status: 'live',
        mode: 'text',
        moderatorType: null,
        side: 'a',
        opponentId: 'opp-3',
        opponentUsername: 'opponent3',
        round: 1,
        totalRounds: 3,
        ruleset: 'amplified',
        ranked: false,
        category: null,
        startedAt: null,
        endedAt: null,
        isSpectating: false,
        spectatorView: false,
        debaterAName: 'Alice',
        debaterBName: 'Bob',
        linkUrl: null,
        linkPreview: null,
      } as unknown as import('../../src/arena/arena-types.ts').CurrentDebate,
      false
    );

    expect(document.getElementById('feed-debater-input')).not.toBeNull();
    expect(document.getElementById('feed-debater-send-btn')).not.toBeNull();
    expect(document.getElementById('feed-cite-btn')).not.toBeNull();
    expect(document.getElementById('feed-finish-turn')).not.toBeNull();
    expect(document.getElementById('feed-concede')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC4: renderControls — mod view renders mod-specific elements
// ---------------------------------------------------------------------------
describe('TC4 — mod view renders moderator-specific controls', () => {
  it('injects #feed-mod-send-btn, eject buttons, and null button', async () => {
    const mod = await import('../../src/arena/arena-feed-wiring.ts');
    mod.renderControls(
      {
        id: 'debate-004',
        topic: 'Mod view',
        status: 'live',
        mode: 'text',
        moderatorType: null,
        side: 'a',
        opponentId: 'opp-4',
        opponentUsername: 'opponent4',
        round: 1,
        totalRounds: 3,
        ruleset: 'amplified',
        ranked: false,
        category: null,
        startedAt: null,
        endedAt: null,
        isSpectating: false,
        spectatorView: false,
        debaterAName: 'Alice',
        debaterBName: 'Bob',
        linkUrl: null,
        linkPreview: null,
      } as unknown as import('../../src/arena/arena-types.ts').CurrentDebate,
      true
    );

    expect(document.getElementById('feed-mod-send-btn')).not.toBeNull();
    expect(document.getElementById('feed-mod-eject-a')).not.toBeNull();
    expect(document.getElementById('feed-mod-eject-b')).not.toBeNull();
    expect(document.getElementById('feed-mod-null')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC5: renderControls — mod view escapes debater names (XSS guard)
// ---------------------------------------------------------------------------
describe('TC5 — mod view escapes debater names in eject buttons', () => {
  it('XSS payload in debaterAName is escaped in eject button text', async () => {
    const mod = await import('../../src/arena/arena-feed-wiring.ts');
    mod.renderControls(
      {
        id: 'debate-005',
        topic: 'XSS test',
        status: 'live',
        mode: 'text',
        moderatorType: null,
        side: 'a',
        opponentId: 'opp-5',
        opponentUsername: 'opponent5',
        round: 1,
        totalRounds: 3,
        ruleset: 'amplified',
        ranked: false,
        category: null,
        startedAt: null,
        endedAt: null,
        isSpectating: false,
        spectatorView: false,
        debaterAName: '<script>alert(1)</script>',
        debaterBName: '<img onerror="pwned()">',
        linkUrl: null,
        linkPreview: null,
      } as unknown as import('../../src/arena/arena-types.ts').CurrentDebate,
      true
    );

    const ejectA = document.getElementById('feed-mod-eject-a');
    const ejectB = document.getElementById('feed-mod-eject-b');
    expect(ejectA).not.toBeNull();
    expect(ejectB).not.toBeNull();
    // Raw script tags must not appear in innerHTML
    expect(ejectA!.innerHTML).not.toContain('<script>');
    expect(ejectB!.innerHTML).not.toContain('<img');
    // Escaped form should be present
    expect(ejectA!.innerHTML).toContain('&lt;script&gt;');
  });
});

// ---------------------------------------------------------------------------
// TC6: renderControls — spectator view renders tip buttons for both sides
// ---------------------------------------------------------------------------
describe('TC6 — spectator view renders tip buttons for both sides', () => {
  it('injects .feed-tip-btn-a and .feed-tip-btn-b elements', async () => {
    const mod = await import('../../src/arena/arena-feed-wiring.ts');
    mod.renderControls(
      {
        id: 'debate-006',
        topic: 'Spectator view',
        status: 'live',
        mode: 'text',
        moderatorType: null,
        side: 'a',
        opponentId: 'opp-6',
        opponentUsername: 'opponent6',
        round: 1,
        totalRounds: 3,
        ruleset: 'amplified',
        ranked: false,
        category: null,
        startedAt: null,
        endedAt: null,
        isSpectating: true,
        spectatorView: true,
        debaterAName: 'Alice',
        debaterBName: 'Bob',
        linkUrl: null,
        linkPreview: null,
      } as unknown as import('../../src/arena/arena-types.ts').CurrentDebate,
      false
    );

    const tipBtnsA = document.querySelectorAll('.feed-tip-btn-a');
    const tipBtnsB = document.querySelectorAll('.feed-tip-btn-b');
    expect(tipBtnsA.length).toBeGreaterThan(0);
    expect(tipBtnsB.length).toBeGreaterThan(0);
    expect(document.getElementById('feed-tip-status')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC7: renderControls — noop when #feed-controls is absent
// ---------------------------------------------------------------------------
describe('TC7 — renderControls is a noop when #feed-controls is absent', () => {
  it('does not throw when #feed-controls element does not exist', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>'; // no #feed-controls

    const mod = await import('../../src/arena/arena-feed-wiring.ts');
    expect(() =>
      mod.renderControls(
        {
          id: 'debate-007',
          topic: 'No controls el',
          status: 'live',
          mode: 'text',
          moderatorType: null,
          side: 'a',
          opponentId: 'opp-7',
          opponentUsername: 'opponent7',
          round: 1,
          totalRounds: 3,
          ruleset: 'amplified',
          ranked: false,
          category: null,
          startedAt: null,
          endedAt: null,
          isSpectating: false,
          spectatorView: false,
          debaterAName: 'Alice',
          debaterBName: 'Bob',
          linkUrl: null,
          linkPreview: null,
        } as unknown as import('../../src/arena/arena-types.ts').CurrentDebate,
        false
      )
    ).not.toThrow();

    // Nothing injected — no feed-challenge-btn
    expect(document.getElementById('feed-challenge-btn')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ARCH — seam #040 boundary check
// ---------------------------------------------------------------------------
describe('ARCH — seam #040', () => {
  it('src/arena/arena-feed-wiring.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-feed-wiring.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});
