// ============================================================
// INTEGRATOR — arena-feed-events + arena-state + arena-feed-state
// Boundary: appendFeedEvent reads currentDebate (role, opponentName),
//           feedPaused, opponentCitedRefs from arena-state.
//           renderedEventIds dedup guard from arena-feed-state.
//           writeFeedEvent reads currentDebate + round from state
//           and calls safeRpc('insert_feed_event').
// Mock boundary: @supabase/supabase-js only
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
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: mockAuth,
  })),
}));

// ============================================================
// MODULE HANDLES
// ============================================================

let appendFeedEvent: (ev: unknown) => void;
let addLocalSystem: (text: string) => void;
let writeFeedEvent: (
  eventType: string,
  content: string,
  side: 'a' | 'b' | 'mod' | null,
  score?: number | null,
) => Promise<void>;

let set_currentDebate: (v: unknown) => void;
let set_feedPaused: (v: boolean) => void;
let set_opponentCitedRefs: (v: unknown[]) => void;

let renderedEventIds: Set<string>;
let set_round: (v: number) => void;
let pendingSentimentA: () => number;
let pendingSentimentB: () => number;

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

  // polyfill scrollTo — jsdom does not implement it
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = vi.fn();
  } else {
    (Element.prototype.scrollTo as unknown) = vi.fn();
  }

  document.body.innerHTML = '<div id="feed-stream"></div>';

  const eventsMod = await import('../../src/arena/arena-feed-events.ts');
  appendFeedEvent = eventsMod.appendFeedEvent as (ev: unknown) => void;
  addLocalSystem = eventsMod.addLocalSystem;
  writeFeedEvent = eventsMod.writeFeedEvent as typeof writeFeedEvent;

  const stateMod = await import('../../src/arena/arena-state.ts');
  set_currentDebate = stateMod.set_currentDebate as (v: unknown) => void;
  set_feedPaused = stateMod.set_feedPaused;
  set_opponentCitedRefs = stateMod.set_opponentCitedRefs as (v: unknown[]) => void;

  const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
  renderedEventIds = feedStateMod.renderedEventIds;
  set_round = feedStateMod.set_round;
  pendingSentimentA = () => feedStateMod.pendingSentimentA;
  pendingSentimentB = () => feedStateMod.pendingSentimentB;
});

// ============================================================
// TC-I1: appendFeedEvent — dedup via renderedEventIds from arena-feed-state
// ============================================================

describe('TC-I1: appendFeedEvent deduplicates events using renderedEventIds', () => {
  it('appends only once when the same event id is submitted twice', () => {
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Bob', messages: [] });

    const ev = { id: 'evt-001', event_type: 'speech', side: 'a', round: 1, content: 'Hello' };
    appendFeedEvent(ev);
    appendFeedEvent(ev); // duplicate

    const stream = document.getElementById('feed-stream')!;
    expect(stream.children.length).toBe(1);
  });

  it('appends when two events share an id string only if their content differs (fallback key)', () => {
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Bob', messages: [] });

    // No id — fallback key = type:side:round:content
    const ev1 = { event_type: 'speech', side: 'a', round: 1, content: 'Point A' };
    const ev2 = { event_type: 'speech', side: 'a', round: 1, content: 'Point B' }; // different content
    appendFeedEvent(ev1);
    appendFeedEvent(ev2);

    const stream = document.getElementById('feed-stream')!;
    expect(stream.children.length).toBe(2);
  });
});

// ============================================================
// TC-I2: appendFeedEvent — author name resolution from arena-state.currentDebate
// ============================================================

describe('TC-I2: appendFeedEvent resolves author names from currentDebate in arena-state', () => {
  it('uses opponentName for side-b when user role is a', () => {
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Alice', messages: [] });

    appendFeedEvent({ id: 'e1', event_type: 'speech', side: 'b', round: 1, content: 'My point' });

    const stream = document.getElementById('feed-stream')!;
    expect(stream.innerHTML).toContain('Alice');
  });

  it('uses "You" as fallback for own side when no profile loaded (guest)', () => {
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Alice', messages: [] });

    appendFeedEvent({ id: 'e2', event_type: 'speech', side: 'a', round: 1, content: 'My point' });

    const stream = document.getElementById('feed-stream')!;
    expect(stream.innerHTML).toContain('You');
  });

  it('uses "Debater A" / "Debater B" when currentDebate is null', () => {
    set_currentDebate(null);

    appendFeedEvent({ id: 'e3', event_type: 'speech', side: 'a', round: 1, content: 'From A' });
    appendFeedEvent({ id: 'e4', event_type: 'speech', side: 'b', round: 1, content: 'From B' });

    const stream = document.getElementById('feed-stream')!;
    expect(stream.innerHTML).toContain('Debater A');
    expect(stream.innerHTML).toContain('Debater B');
  });
});

// ============================================================
// TC-I3: appendFeedEvent — no-op when #feed-stream is absent
// ============================================================

describe('TC-I3: appendFeedEvent is a no-op when #feed-stream does not exist', () => {
  it('does not throw when the feed container is missing', () => {
    document.body.innerHTML = '';
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Bob', messages: [] });

    expect(() =>
      appendFeedEvent({ id: 'e5', event_type: 'speech', side: 'a', round: 1, content: 'Test' })
    ).not.toThrow();
  });
});

// ============================================================
// TC-I4: appendFeedEvent — round_divider renders
// ============================================================

describe('TC-I4: appendFeedEvent renders round_divider event', () => {
  it('creates a feed-evt-divider element with correct content', () => {
    appendFeedEvent({ id: 'e6', event_type: 'round_divider', side: null, round: 2, content: 'Round 2' });

    const stream = document.getElementById('feed-stream')!;
    const el = stream.querySelector('.feed-evt-divider');
    expect(el).not.toBeNull();
    expect(el!.textContent).toContain('Round 2');
  });
});

// ============================================================
// TC-I5: appendFeedEvent — disconnect event renders
// ============================================================

describe('TC-I5: appendFeedEvent renders disconnect event', () => {
  it('creates a feed-evt-disconnect element', () => {
    appendFeedEvent({ id: 'e7', event_type: 'disconnect', side: 'b', round: 1, content: 'Opponent disconnected' });

    const stream = document.getElementById('feed-stream')!;
    const el = stream.querySelector('.feed-evt-disconnect');
    expect(el).not.toBeNull();
    expect(el!.textContent).toContain('Opponent disconnected');
  });
});

// ============================================================
// TC-I6: appendFeedEvent — sentiment events do NOT append to DOM
// ============================================================

describe('TC-I6: appendFeedEvent — sentiment_tip and sentiment_vote return early without DOM append', () => {
  it('sentiment_tip accumulates pendingSentimentA without adding DOM element', () => {
    appendFeedEvent({
      id: 'e8',
      event_type: 'sentiment_tip',
      side: 'a',
      round: 1,
      content: '',
      metadata: { amount: 3 },
    });

    const stream = document.getElementById('feed-stream')!;
    expect(stream.children.length).toBe(0);
    expect(pendingSentimentA()).toBe(3);
  });

  it('sentiment_vote accumulates pendingSentimentB without adding DOM element', () => {
    appendFeedEvent({ id: 'e9', event_type: 'sentiment_vote', side: 'b', round: 1, content: '' });

    const stream = document.getElementById('feed-stream')!;
    expect(stream.children.length).toBe(0);
    expect(pendingSentimentB()).toBe(1);
  });
});

// ============================================================
// TC-I7: appendFeedEvent — point_award updates score DOM from arena-feed-state
// ============================================================

describe('TC-I7: appendFeedEvent point_award updates score display', () => {
  it('updates #feed-score-a when side is a', () => {
    document.body.innerHTML = `
      <div id="feed-stream"></div>
      <span id="feed-score-a">0</span>
    `;
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Bob', messages: [] });

    appendFeedEvent({
      id: 'e10',
      event_type: 'point_award',
      side: 'a',
      round: 1,
      score: 3,
      content: 'Good argument',
      metadata: { score_a_after: 3 },
    });

    const scoreEl = document.getElementById('feed-score-a')!;
    expect(scoreEl.textContent).toBe('3');
  });

  it('renders a .feed-points-badge element', () => {
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Bob', messages: [] });

    appendFeedEvent({
      id: 'e11',
      event_type: 'point_award',
      side: 'b',
      round: 1,
      score: 2,
      content: 'Good rebuttal',
    });

    const stream = document.getElementById('feed-stream')!;
    const badge = stream.querySelector('.feed-points-badge');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('+2');
  });
});

// ============================================================
// TC-I8: appendFeedEvent — reference_cite tracks opponentCitedRefs in arena-state
// ============================================================

describe('TC-I8: appendFeedEvent reference_cite adds to opponentCitedRefs in arena-state', () => {
  it('adds a new entry to opponentCitedRefs when opponent cites a reference', async () => {
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Bob', messages: [] });
    set_opponentCitedRefs([]);

    appendFeedEvent({
      id: 'e12',
      event_type: 'reference_cite',
      side: 'b',        // opponent side (role is 'a')
      round: 1,
      content: 'Climate data shows...',
      reference_id: 'ref-999',
      metadata: { source_url: 'https://example.com', source_title: 'Science.org', source_type: 'article' },
    });

    // Re-import to get live binding
    const stateMod = await import('../../src/arena/arena-state.ts');
    expect(stateMod.opponentCitedRefs.length).toBe(1);
    expect(stateMod.opponentCitedRefs[0].reference_id).toBe('ref-999');
  });

  it('does NOT add to opponentCitedRefs when the same side as user cites', async () => {
    set_currentDebate({ id: 'd1', role: 'a', opponentName: 'Bob', messages: [] });
    set_opponentCitedRefs([]);

    appendFeedEvent({
      id: 'e13',
      event_type: 'reference_cite',
      side: 'a',        // own side — not opponent
      round: 1,
      content: 'My evidence',
      reference_id: 'ref-888',
      metadata: { source_url: 'https://example.com', source_title: 'Pub.org', source_type: 'paper' },
    });

    const stateMod = await import('../../src/arena/arena-state.ts');
    expect(stateMod.opponentCitedRefs.length).toBe(0);
  });
});

// ============================================================
// TC-I9: addLocalSystem — appends system message without arena-state
// ============================================================

describe('TC-I9: addLocalSystem appends a system-class element to feed-stream', () => {
  it('creates .feed-evt-system element with correct text', () => {
    addLocalSystem('Round 2 is starting');

    const stream = document.getElementById('feed-stream')!;
    const el = stream.querySelector('.feed-evt-system');
    expect(el).not.toBeNull();
    expect(el!.textContent).toBe('Round 2 is starting');
  });

  it('is a no-op when #feed-stream is missing', () => {
    document.body.innerHTML = '';
    expect(() => addLocalSystem('Test message')).not.toThrow();
  });
});

// ============================================================
// TC-I10: writeFeedEvent — calls safeRpc when currentDebate is set and not placeholder
// ============================================================

describe('TC-I10: writeFeedEvent calls safeRpc with debate context from arena-state', () => {
  it('calls insert_feed_event RPC with debate id and current round', async () => {
    set_currentDebate({ id: 'debate-xyz', role: 'a', opponentName: 'Bob', messages: [] });
    set_round(3);
    mockRpc.mockResolvedValue({ data: null, error: null });

    await writeFeedEvent('speech', 'My closing argument', 'a', null);

    expect(mockRpc).toHaveBeenCalledWith(
      'insert_feed_event',
      expect.objectContaining({
        p_debate_id: 'debate-xyz',
        p_event_type: 'speech',
        p_round: 3,
        p_side: 'a',
        p_content: 'My closing argument',
      }),
    );
  });

  it('is a no-op when currentDebate is null', async () => {
    set_currentDebate(null);

    await writeFeedEvent('speech', 'Test', 'a', null);

    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC-I11: writeFeedEvent — swallows RPC errors (silent catch)
// ============================================================

describe('TC-I11: writeFeedEvent does not throw on RPC failure', () => {
  it('silently catches when safeRpc rejects', async () => {
    set_currentDebate({ id: 'debate-abc', role: 'a', opponentName: 'Bob', messages: [] });
    mockRpc.mockRejectedValue(new Error('network error'));

    await expect(writeFeedEvent('round_divider', 'Round 2', null, null)).resolves.toBeUndefined();
  });
});

// ============================================================
// ARCH — arena-feed-events.ts import boundaries
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — arena-feed-events.ts imports only from allowed modules', () => {
  it('imports only from auth, config, arena-core.utils, arena-state, arena-feed-state, arena-feed-events-render, and arena-types', () => {
    const allowed = new Set([
      '../auth.ts',
      './arena-core.utils.ts',
      './arena-state.ts',
      './arena-types-feed-room.ts',
      './arena-feed-state.ts',
      './arena-feed-events-render.ts',
    ]);
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-feed-events.ts'),
      'utf-8'
    );
    const paths = source.split('\n')
      .filter(l => l.trimStart().startsWith('import '))
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter((p): p is string => Boolean(p));
    for (const path of paths) {
      expect(allowed, `Unexpected import in arena-feed-events.ts: ${path}`).toContain(path);
    }
  });
});
