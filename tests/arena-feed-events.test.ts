import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn().mockReturnValue({ display_name: 'Alice' }));
const mockIsPlaceholder = vi.hoisted(() => ({ value: false }));

const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockRenderedEventIds = vi.hoisted(() => new Set<string>());
const mockRound = vi.hoisted(() => ({ value: 2 }));

const mockRenderSpeechEvent = vi.hoisted(() => vi.fn());
const mockRenderPointAwardEvent = vi.hoisted(() => vi.fn());
const mockRenderRoundDividerEvent = vi.hoisted(() => vi.fn());
const mockRenderReferenceCiteEvent = vi.hoisted(() => vi.fn());
const mockRenderReferenceChallengeEvent = vi.hoisted(() => vi.fn());
const mockRenderModRulingEvent = vi.hoisted(() => vi.fn());
const mockRenderPowerUpEvent = vi.hoisted(() => vi.fn());
const mockRenderDisconnectEvent = vi.hoisted(() => vi.fn());
const mockRenderDefaultEvent = vi.hoisted(() => vi.fn());
const mockApplySentimentEvent = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  get isPlaceholder() { return () => mockIsPlaceholder.value; },
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get renderedEventIds() { return mockRenderedEventIds; },
  get round() { return mockRound.value; },
}));

vi.mock('../src/arena/arena-feed-events-render.ts', () => ({
  renderSpeechEvent: mockRenderSpeechEvent,
  renderPointAwardEvent: mockRenderPointAwardEvent,
  renderRoundDividerEvent: mockRenderRoundDividerEvent,
  renderReferenceCiteEvent: mockRenderReferenceCiteEvent,
  renderReferenceChallengeEvent: mockRenderReferenceChallengeEvent,
  renderModRulingEvent: mockRenderModRulingEvent,
  renderPowerUpEvent: mockRenderPowerUpEvent,
  renderDisconnectEvent: mockRenderDisconnectEvent,
  renderDefaultEvent: mockRenderDefaultEvent,
  applySentimentEvent: mockApplySentimentEvent,
}));

import { appendFeedEvent, addLocalSystem, writeFeedEvent } from '../src/arena/arena-feed-events.ts';

// jsdom doesn't implement scrollTo
Element.prototype.scrollTo = vi.fn() as never;

const baseSpeechEvent = {
  id: 'evt-1',
  debate_id: 'deb-1',
  event_type: 'speech',
  round: 1,
  side: 'a',
  content: 'Hello world',
  created_at: new Date().toISOString(),
};

describe('TC1 — appendFeedEvent dedup and dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderedEventIds.clear();
    document.body.innerHTML = '<div id="feed-stream"></div>';
    mockCurrentDebate.value = { id: 'deb-1', role: 'a', opponentName: 'Bob' };
  });

  it('does nothing when feed-stream is absent', () => {
    document.body.innerHTML = '';
    appendFeedEvent(baseSpeechEvent as never);
    expect(mockRenderSpeechEvent).not.toHaveBeenCalled();
  });

  it('calls renderSpeechEvent for speech events', () => {
    appendFeedEvent(baseSpeechEvent as never);
    expect(mockRenderSpeechEvent).toHaveBeenCalled();
  });

  it('deduplicates events with same id', () => {
    appendFeedEvent(baseSpeechEvent as never);
    appendFeedEvent(baseSpeechEvent as never);
    expect(mockRenderSpeechEvent).toHaveBeenCalledTimes(1);
  });

  it('calls renderPointAwardEvent for point_award', () => {
    appendFeedEvent({ ...baseSpeechEvent, id: 'evt-pa', event_type: 'point_award' } as never);
    expect(mockRenderPointAwardEvent).toHaveBeenCalled();
  });

  it('calls renderRoundDividerEvent for round_divider', () => {
    appendFeedEvent({ ...baseSpeechEvent, id: 'evt-rd', event_type: 'round_divider' } as never);
    expect(mockRenderRoundDividerEvent).toHaveBeenCalled();
  });

  it('calls renderDisconnectEvent for disconnect', () => {
    appendFeedEvent({ ...baseSpeechEvent, id: 'evt-dc', event_type: 'disconnect' } as never);
    expect(mockRenderDisconnectEvent).toHaveBeenCalled();
  });

  it('calls applySentimentEvent for sentiment_tip', () => {
    appendFeedEvent({ ...baseSpeechEvent, id: 'evt-st', event_type: 'sentiment_tip' } as never);
    expect(mockApplySentimentEvent).toHaveBeenCalled();
  });

  it('calls renderDefaultEvent for unknown types', () => {
    appendFeedEvent({ ...baseSpeechEvent, id: 'evt-unk', event_type: 'unknown_type' } as never);
    expect(mockRenderDefaultEvent).toHaveBeenCalled();
  });
});

describe('TC2 — addLocalSystem appends to feed-stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="feed-stream"></div>';
  });

  it('appends a system message element', () => {
    addLocalSystem('Opponent left');
    const stream = document.getElementById('feed-stream');
    expect(stream?.querySelector('.feed-evt-system')).not.toBeNull();
  });

  it('sets textContent to the message', () => {
    addLocalSystem('Test system msg');
    expect(document.querySelector('.feed-evt-system')?.textContent).toBe('Test system msg');
  });

  it('does nothing when feed-stream is absent', () => {
    document.body.innerHTML = '';
    expect(() => addLocalSystem('test')).not.toThrow();
  });
});

describe('TC3 — writeFeedEvent calls safeRpc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPlaceholder.value = false;
    mockCurrentDebate.value = { id: 'deb-1' };
    mockRound.value = 2;
  });

  it('calls safeRpc insert_feed_event', async () => {
    await writeFeedEvent('speech', 'Hello', 'a');
    expect(mockSafeRpc).toHaveBeenCalledWith('insert_feed_event', expect.objectContaining({
      p_debate_id: 'deb-1',
      p_event_type: 'speech',
      p_round: 2,
      p_side: 'a',
      p_content: 'Hello',
    }));
  });

  it('skips when currentDebate is null', async () => {
    mockCurrentDebate.value = null;
    await writeFeedEvent('speech', 'Hello', 'a');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  it('skips in placeholder mode', async () => {
    mockIsPlaceholder.value = true;
    await writeFeedEvent('speech', 'Hello', 'a');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('ARCH — arena-feed-events.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      './arena-core.utils.ts',
      './arena-state.ts',
      './arena-types-feed-room.ts',
      './arena-feed-state.ts',
      './arena-feed-events-render.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-events.ts'),
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
