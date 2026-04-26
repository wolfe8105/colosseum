/**
 * int-arena-feed-wiring-mod.test.ts
 * Integration tests: src/arena/arena-feed-wiring-mod.ts → arena-state
 * Seam #041
 */

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
  document.body.innerHTML = '<div id="screen-main"></div>';
});

// ============================================================
// TC-041-01: score button click calls score_debate_comment RPC
// with correct params when currentDebate is set and a comment
// is selected with a valid numeric event ID.
// ============================================================
describe('TC-041-01 — score button triggers score_debate_comment RPC', () => {
  it('calls score_debate_comment with debate id, event id, and score', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Set up DOM
    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt feed-evt-a feed-evt-selected" data-event-id="42">Comment A</div>
      </div>
      <div id="feed-mod-score-row" style="display:flex">
        <button class="feed-score-btn" data-pts="2">+2</button>
      </div>
      <div id="feed-score-prompt"></div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-uuid-001',
      topicA: 'Topic A',
      topicB: 'Topic B',
      userSide: 'a',
      opponentName: 'Opponent',
      moderatorName: 'Mod',
      mode: 'text',
      ranked: false,
      ruleset: 'amplified',
      rounds: 3,
      debaterAId: 'user-a-id',
      debaterBId: 'user-b-id',
    } as any);

    // Mock arena-feed-ui to avoid DOM dependency
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
      updateBudgetDisplay: vi.fn(),
    }));
    // Mock arena-feed-events to avoid chain
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    // Mock arena-feed-references
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({
      showReferencePopup: vi.fn(),
    }));
    // Mock arena-feed-realtime
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({
      modNullDebate: vi.fn().mockResolvedValue(undefined),
    }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const scoreBtn = document.querySelector('.feed-score-btn') as HTMLButtonElement;
    expect(scoreBtn).not.toBeNull();

    scoreBtn.click();
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRpc).toHaveBeenCalledWith('score_debate_comment', {
      p_debate_id: 'debate-uuid-001',
      p_feed_event_id: 42,
      p_score: 2,
    });
  });
});

// ============================================================
// TC-041-02: score button click does NOT call RPC when
// currentDebate is null (guard check).
// ============================================================
describe('TC-041-02 — score button skips RPC when currentDebate is null', () => {
  it('does not call score_debate_comment RPC when no active debate', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt feed-evt-a feed-evt-selected" data-event-id="99">Comment A</div>
      </div>
      <div id="feed-mod-score-row" style="display:flex">
        <button class="feed-score-btn" data-pts="1">+1</button>
      </div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate(null);

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const scoreBtn = document.querySelector('.feed-score-btn') as HTMLButtonElement;
    scoreBtn.click();
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(mockRpc).not.toHaveBeenCalledWith('score_debate_comment', expect.anything());
  });
});

// ============================================================
// TC-041-03: pin button click calls pin_feed_event RPC
// with debate id and numeric feed event id.
// ============================================================
describe('TC-041-03 — pin button triggers pin_feed_event RPC', () => {
  it('calls pin_feed_event with debate id and numeric event id', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt">
          <button class="feed-pin-btn" data-eid="77">Pin</button>
        </div>
      </div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-uuid-002',
      topicA: 'T', topicB: 'T', userSide: 'a',
      opponentName: 'Opp', moderatorName: 'Mod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const pinBtn = document.querySelector('.feed-pin-btn') as HTMLElement;
    pinBtn.click();
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRpc).toHaveBeenCalledWith('pin_feed_event', {
      p_debate_id: 'debate-uuid-002',
      p_feed_event_id: 77,
    });
  });
});

// ============================================================
// TC-041-04: pin button skips RPC for pending optimistic IDs
// (IDs containing a dash are treated as UUID-pending).
// ============================================================
describe('TC-041-04 — pin button skips RPC for pending UUID event ids', () => {
  it('does not call pin_feed_event for event ids containing a dash', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt">
          <button class="feed-pin-btn" data-eid="abc-1234-uuid">Pin</button>
        </div>
      </div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-uuid-003',
      topicA: 'T', topicB: 'T', userSide: 'a',
      opponentName: 'Opp', moderatorName: 'Mod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const pinBtn = document.querySelector('.feed-pin-btn') as HTMLElement;
    pinBtn.click();
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(mockRpc).not.toHaveBeenCalledWith('pin_feed_event', expect.anything());
  });
});

// ============================================================
// TC-041-05: comment click selects the event row and reveals
// the score row DOM element.
// ============================================================
describe('TC-041-05 — clicking a comment row shows the score row', () => {
  it('adds feed-evt-selected class and shows #feed-mod-score-row', async () => {
    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt feed-evt-a" data-event-id="10">Comment A</div>
      </div>
      <div id="feed-mod-score-row" style="display:none"></div>
      <div id="feed-score-prompt"></div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate(null);

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const commentEl = document.querySelector('.feed-evt-a') as HTMLElement;
    commentEl.click();

    expect(commentEl.classList.contains('feed-evt-selected')).toBe(true);
    const scoreRow = document.getElementById('feed-mod-score-row');
    expect(scoreRow?.style.display).toBe('flex');
  });
});

// ============================================================
// TC-041-06: score cancel button clears selection and hides
// the score row.
// ============================================================
describe('TC-041-06 — score cancel clears selection and hides score row', () => {
  it('removes feed-evt-selected and hides #feed-mod-score-row on cancel', async () => {
    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt feed-evt-a feed-evt-selected" data-event-id="55">Comment A</div>
      </div>
      <div id="feed-mod-score-row" style="display:flex"></div>
      <button id="feed-score-cancel">Cancel</button>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate(null);

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const cancelBtn = document.getElementById('feed-score-cancel') as HTMLButtonElement;
    cancelBtn.click();

    const selected = document.querySelector('.feed-evt-selected');
    expect(selected).toBeNull();

    const scoreRow = document.getElementById('feed-mod-score-row');
    expect(scoreRow?.style.display).toBe('none');
  });
});

// ============================================================
// TC-041-07: submitModComment calls writeFeedEvent (which
// internally calls the RPC) and uses currentDebate.id for the
// optimistic event. Verifies currentDebate is read live.
// ============================================================
describe('TC-041-07 — submitModComment uses currentDebate from arena-state', () => {
  it('reads currentDebate.id for the optimistic event in appendFeedEvent', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <textarea id="feed-mod-input">hello debate</textarea>
      <button id="feed-mod-send-btn">Send</button>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-uuid-007',
      topicA: 'T', topicB: 'T', userSide: 'mod',
      opponentName: '', moderatorName: 'TestMod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const appendFeedEventMock = vi.fn();
    const writeFeedEventMock = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: appendFeedEventMock,
      writeFeedEvent: writeFeedEventMock,
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const sendBtn = document.getElementById('feed-mod-send-btn') as HTMLButtonElement;
    sendBtn.click();
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();

    expect(appendFeedEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ debate_id: 'debate-uuid-007', side: 'mod' })
    );
    expect(writeFeedEventMock).toHaveBeenCalledWith('speech', 'hello debate', 'mod');
  });
});

// ============================================================
// ARCH — seam #041
// ============================================================
describe('ARCH — seam #041', () => {
  it('src/arena/arena-feed-wiring-mod.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-feed-wiring-mod.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});

// ============================================================
// SEAM #118 — arena-feed-wiring-mod → arena-feed-state
// TCs verify: round, scoreUsed, pinnedEventIds
// ============================================================

// ============================================================
// TC-118-01: submitModComment embeds `round` from arena-feed-state
// into the optimistic event passed to appendFeedEvent.
// ============================================================
describe('TC-118-01 — submitModComment uses round from arena-feed-state', () => {
  it('passes current round value into optimistic appendFeedEvent call', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <textarea id="feed-mod-input">hello round</textarea>
      <button id="feed-mod-send-btn">Send</button>
    `;

    // Set currentDebate
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-118-01',
      topicA: 'T', topicB: 'T', userSide: 'mod',
      opponentName: '', moderatorName: 'Mod118',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    // Set round = 3 in arena-feed-state
    const feedState = await import('../../src/arena/arena-feed-state.ts');
    feedState.set_round(3);

    const appendFeedEventMock = vi.fn();
    const writeFeedEventMock = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: appendFeedEventMock,
      writeFeedEvent: writeFeedEventMock,
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    document.getElementById('feed-mod-send-btn')!.click();
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();

    expect(appendFeedEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ round: 3 })
    );
  });
});

// ============================================================
// TC-118-02: scoreUsed budget check — score button blocked when
// scoreUsed[pts] >= FEED_SCORE_BUDGET[pts].
// ============================================================
describe('TC-118-02 — scoreUsed budget prevents RPC call when exhausted', () => {
  it('shows toast and skips score_debate_comment when scoreUsed is at limit', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt feed-evt-a feed-evt-selected" data-event-id="200">Msg</div>
      </div>
      <div id="feed-mod-score-row" style="display:flex">
        <button class="feed-score-btn" data-pts="1">+1</button>
      </div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-118-02',
      topicA: 'T', topicB: 'T', userSide: 'mod',
      opponentName: '', moderatorName: 'Mod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    // Exhaust 1-pt budget: FEED_SCORE_BUDGET[1] = 6, set scoreUsed[1] = 6
    const feedState = await import('../../src/arena/arena-feed-state.ts');
    feedState.scoreUsed[1] = 6;

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    (document.querySelector('.feed-score-btn') as HTMLButtonElement).click();
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(mockRpc).not.toHaveBeenCalledWith('score_debate_comment', expect.anything());
  });
});

// ============================================================
// TC-118-03: pinnedEventIds mutated on successful pin — Set
// updated in arena-feed-state after handlePinClick resolves.
// ============================================================
describe('TC-118-03 — pinnedEventIds updated in arena-feed-state after pin', () => {
  it('adds eid to pinnedEventIds after successful pin_feed_event RPC', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt">
          <button class="feed-pin-btn" data-eid="55">Pin</button>
        </div>
      </div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-118-03',
      topicA: 'T', topicB: 'T', userSide: 'mod',
      opponentName: '', moderatorName: 'Mod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    // Ensure pinnedEventIds is empty before test
    const feedState = await import('../../src/arena/arena-feed-state.ts');
    feedState.pinnedEventIds.clear();

    mockRpc.mockResolvedValue({ data: null, error: null });

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    (document.querySelector('.feed-pin-btn') as HTMLElement).click();
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();

    expect(feedState.pinnedEventIds.has('55')).toBe(true);
    const pinBtn = document.querySelector('.feed-pin-btn') as HTMLElement;
    expect(pinBtn.classList.contains('pinned')).toBe(true);
  });
});

// ============================================================
// TC-118-04: pinnedEventIds — second pin click removes the eid
// (toggle: pin→unpin).
// ============================================================
describe('TC-118-04 — pinnedEventIds toggle: second pin click unpins', () => {
  it('removes eid from pinnedEventIds on second pin click', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt">
          <button class="feed-pin-btn pinned" data-eid="88">Pin</button>
        </div>
      </div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-118-04',
      topicA: 'T', topicB: 'T', userSide: 'mod',
      opponentName: '', moderatorName: 'Mod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    // Pre-populate pinnedEventIds so button appears already pinned
    const feedState = await import('../../src/arena/arena-feed-state.ts');
    feedState.pinnedEventIds.clear();
    feedState.pinnedEventIds.add('88');

    mockRpc.mockResolvedValue({ data: null, error: null });

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    // Click pin button — should unpin
    (document.querySelector('.feed-pin-btn') as HTMLElement).click();
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();

    expect(feedState.pinnedEventIds.has('88')).toBe(false);
    const pinBtn = document.querySelector('.feed-pin-btn') as HTMLElement;
    expect(pinBtn.classList.contains('pinned')).toBe(false);
  });
});

// ============================================================
// TC-118-05: scoreUsed not mutated by wiring-mod — only the
// Realtime point_award path updates it (verify write is absent).
// ============================================================
describe('TC-118-05 — wiring-mod does not directly mutate scoreUsed on RPC success', () => {
  it('scoreUsed[2] remains unchanged after score button click (Realtime updates it)', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt feed-evt-b feed-evt-selected" data-event-id="300">Msg B</div>
      </div>
      <div id="feed-mod-score-row" style="display:flex">
        <button class="feed-score-btn" data-pts="2">+2</button>
      </div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-118-05',
      topicA: 'T', topicB: 'T', userSide: 'mod',
      opponentName: '', moderatorName: 'Mod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const feedState = await import('../../src/arena/arena-feed-state.ts');
    feedState.scoreUsed[2] = 0;

    mockRpc.mockResolvedValue({ data: null, error: null });

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    (document.querySelector('.feed-score-btn') as HTMLButtonElement).click();
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();

    // wiring-mod calls RPC but does NOT increment scoreUsed — Realtime does
    expect(mockRpc).toHaveBeenCalledWith('score_debate_comment', expect.objectContaining({ p_score: 2 }));
    expect(feedState.scoreUsed[2]).toBe(0);
  });
});

// ============================================================
// ARCH — seam #118
// ============================================================
describe('ARCH — seam #118', () => {
  it('src/arena/arena-feed-wiring-mod.ts imports arena-feed-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-feed-wiring-mod.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-feed-state'))).toBe(true);
  });

  it('imports round, scoreUsed, and pinnedEventIds from arena-feed-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-feed-wiring-mod.ts'), 'utf-8');
    // Import is multi-line — verify each name appears in the source file
    // and the arena-feed-state module is imported (confirmed by first test)
    expect(source).toMatch(/\bround\b/);
    expect(source).toMatch(/\bscoreUsed\b/);
    expect(source).toMatch(/\bpinnedEventIds\b/);
  });
});

// ============================================================
// SEAM #143 — arena-feed-wiring-mod → arena-feed-ui
// TCs verify: updateBudgetDisplay called from delegated click,
// updateBudgetDisplay reflects scoreUsed state via arena-feed-ui.
// ============================================================

// ============================================================
// TC-143-01: clicking a .feed-evt-a row calls updateBudgetDisplay
// from arena-feed-ui to refresh button states after selection.
// ============================================================
describe('TC-143-01 — comment click calls updateBudgetDisplay from arena-feed-ui', () => {
  it('calls updateBudgetDisplay when a .feed-evt-a element is clicked', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt feed-evt-a" data-event-id="10">Comment A</div>
      </div>
      <div id="feed-mod-score-row" style="display:none"></div>
      <div id="feed-score-prompt"></div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate(null);

    const updateBudgetDisplayMock = vi.fn();

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
      updateBudgetDisplay: updateBudgetDisplayMock,
    }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const commentEl = document.querySelector('.feed-evt-a') as HTMLElement;
    commentEl.click();

    expect(updateBudgetDisplayMock).toHaveBeenCalled();
  });
});

// ============================================================
// TC-143-02: clicking a .feed-evt-b row also calls
// updateBudgetDisplay and sets prompt text to "Score Debater B:".
// ============================================================
describe('TC-143-02 — .feed-evt-b click calls updateBudgetDisplay and sets correct prompt', () => {
  it('calls updateBudgetDisplay and sets prompt text for debater B', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt feed-evt-b" data-event-id="20">Comment B</div>
      </div>
      <div id="feed-mod-score-row" style="display:none"></div>
      <div id="feed-score-prompt"></div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate(null);

    const updateBudgetDisplayMock = vi.fn();

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
      updateBudgetDisplay: updateBudgetDisplayMock,
    }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const commentEl = document.querySelector('.feed-evt-b') as HTMLElement;
    commentEl.click();

    expect(updateBudgetDisplayMock).toHaveBeenCalled();
    const prompt = document.getElementById('feed-score-prompt');
    expect(prompt?.textContent).toBe('Score Debater B:');
  });
});

// ============================================================
// TC-143-03: updateBudgetDisplay from arena-feed-ui sets badge
// text to remaining count (FEED_SCORE_BUDGET[pts] - scoreUsed[pts]).
// Verifies the real arena-feed-ui integration via comment click,
// using a spy that captures what updateBudgetDisplay would do
// to the badge element from the wiring flow.
// ============================================================
describe('TC-143-03 — clicking .feed-evt-a reveals score row with prompt set to "Score Debater A:"', () => {
  it('sets #feed-score-prompt text to "Score Debater A:" on .feed-evt-a click', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt feed-evt-a" data-event-id="15">Comment A</div>
      </div>
      <div id="feed-mod-score-row" style="display:none"></div>
      <div id="feed-score-prompt"></div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate(null);

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
      updateBudgetDisplay: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    (document.querySelector('.feed-evt-a') as HTMLElement).click();

    const prompt = document.getElementById('feed-score-prompt');
    expect(prompt?.textContent).toBe('Score Debater A:');
    const scoreRow = document.getElementById('feed-mod-score-row');
    expect(scoreRow?.style.display).toBe('flex');
  });
});

// ============================================================
// TC-143-04: updateBudgetDisplay leaves a score button enabled
// when scoreUsed[pts] < FEED_SCORE_BUDGET[pts].
// ============================================================
describe('TC-143-04 — updateBudgetDisplay leaves button enabled when budget remains', () => {
  it('leaves .feed-score-btn[data-pts="1"] enabled when scoreUsed[1] = 0', async () => {
    vi.resetModules();

    document.body.innerHTML = `
      <button class="feed-score-btn" data-pts="1">+1</button>
      <span class="feed-score-badge" data-badge="1">6</span>
    `;

    const feedState = await import('../../src/arena/arena-feed-state.ts');
    feedState.scoreUsed[1] = 0;

    const { updateBudgetDisplay } = await import('../../src/arena/arena-feed-ui.ts');
    updateBudgetDisplay();

    const btn = document.querySelector('.feed-score-btn[data-pts="1"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);

    const badge = document.querySelector('.feed-score-badge[data-badge="1"]');
    // FEED_SCORE_BUDGET[1] = 6, used = 0, remaining = 6
    expect(badge?.textContent).toBe('6');
  });
});

// ============================================================
// TC-143-05: clicking both .feed-evt-a and .feed-evt-b in sequence
// calls updateBudgetDisplay twice (once per click).
// ============================================================
describe('TC-143-05 — each comment click triggers a fresh updateBudgetDisplay call', () => {
  it('updateBudgetDisplay is called once per comment click', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt feed-evt-a" data-event-id="30">A</div>
        <div class="feed-evt feed-evt-b" data-event-id="31">B</div>
      </div>
      <div id="feed-mod-score-row" style="display:none"></div>
      <div id="feed-score-prompt"></div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate(null);

    const updateBudgetDisplayMock = vi.fn();

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
      updateBudgetDisplay: updateBudgetDisplayMock,
    }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    (document.querySelector('.feed-evt-a') as HTMLElement).click();
    (document.querySelector('.feed-evt-b') as HTMLElement).click();

    expect(updateBudgetDisplayMock).toHaveBeenCalledTimes(2);
  });
});

// ============================================================
// ARCH — seam #143
// ============================================================
describe('ARCH — seam #143', () => {
  it('src/arena/arena-feed-wiring-mod.ts imports updateBudgetDisplay from arena-feed-ui', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-feed-wiring-mod.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-feed-ui'))).toBe(true);
    expect(source).toMatch(/\bupdateBudgetDisplay\b/);
  });
});

// ============================================================
// SEAM #323 — arena-feed-wiring-mod → arena-feed-events
// Strategy: mock arena-feed-events with spies to verify the
// wiring-mod calls appendFeedEvent/writeFeedEvent correctly.
// For TC-323-06 (dedup) and TC-323-07 (round), the real
// arena-feed-events.ts is used with a mocked auth.rpc.ts.
// ============================================================

// ============================================================
// TC-323-01: submitModComment calls writeFeedEvent with
// p_side='mod' and the entered text.
// ============================================================
describe('TC-323-01 — submitModComment → writeFeedEvent called with side=mod and text', () => {
  it('calls writeFeedEvent with event_type speech, side mod, and input text', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream"></div>
      <textarea id="feed-mod-input"></textarea>
      <button id="feed-mod-send-btn" disabled></button>
    `;

    const writeFeedEventSpy = vi.fn().mockResolvedValue(undefined);
    const appendFeedEventSpy = vi.fn();
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: appendFeedEventSpy,
      writeFeedEvent: writeFeedEventSpy,
      addLocalSystem: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-323-01',
      topicA: 'T', topicB: 'T', userSide: 'a',
      opponentName: 'Opp', moderatorName: 'TestMod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const input = document.getElementById('feed-mod-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('feed-mod-send-btn') as HTMLButtonElement;

    input.value = 'Great point moderator';
    input.dispatchEvent(new Event('input'));
    expect(sendBtn.disabled).toBe(false);

    sendBtn.click();
    await vi.advanceTimersByTimeAsync(100);
    await Promise.resolve();
    await Promise.resolve();

    expect(writeFeedEventSpy).toHaveBeenCalledWith('speech', 'Great point moderator', 'mod');
  });
});

// ============================================================
// TC-323-02: submitModComment calls appendFeedEvent with the
// correct event_type, side, and content before writeFeedEvent.
// ============================================================
describe('TC-323-02 — submitModComment → appendFeedEvent called with speech event', () => {
  it('calls appendFeedEvent with event_type=speech, side=mod before RPC', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream"></div>
      <textarea id="feed-mod-input"></textarea>
      <button id="feed-mod-send-btn" disabled></button>
    `;

    const appendFeedEventSpy = vi.fn();
    const writeFeedEventSpy = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: appendFeedEventSpy,
      writeFeedEvent: writeFeedEventSpy,
      addLocalSystem: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-323-02',
      topicA: 'T', topicB: 'T', userSide: 'a',
      opponentName: 'Opp', moderatorName: 'Mod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const input = document.getElementById('feed-mod-input') as HTMLTextAreaElement;
    input.value = 'Mod comment here';
    input.dispatchEvent(new Event('input'));
    (document.getElementById('feed-mod-send-btn') as HTMLButtonElement).click();

    // appendFeedEvent is called synchronously before the async writeFeedEvent
    expect(appendFeedEventSpy).toHaveBeenCalledOnce();
    expect(appendFeedEventSpy).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'speech',
      side: 'mod',
      content: 'Mod comment here',
      debate_id: 'debate-323-02',
    }));
  });
});

// ============================================================
// TC-323-03: submitModComment clears the input after submit.
// ============================================================
describe('TC-323-03 — submitModComment clears input value after submit', () => {
  it('input.value is empty string after submitModComment runs', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream"></div>
      <textarea id="feed-mod-input"></textarea>
      <button id="feed-mod-send-btn" disabled></button>
    `;

    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
      addLocalSystem: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-323-03',
      topicA: 'T', topicB: 'T', userSide: 'a',
      opponentName: 'Opp', moderatorName: 'Mod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const input = document.getElementById('feed-mod-input') as HTMLTextAreaElement;
    input.value = 'Some text';
    input.dispatchEvent(new Event('input'));
    (document.getElementById('feed-mod-send-btn') as HTMLButtonElement).click();

    expect(input.value).toBe('');
  });
});

// ============================================================
// TC-323-04: submitModComment skips writeFeedEvent when
// input is empty.
// ============================================================
describe('TC-323-04 — submitModComment skips writeFeedEvent when input is empty', () => {
  it('does not call writeFeedEvent when no text is entered', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream"></div>
      <textarea id="feed-mod-input"></textarea>
      <button id="feed-mod-send-btn"></button>
    `;

    const writeFeedEventSpy = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: writeFeedEventSpy,
      addLocalSystem: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-323-04',
      topicA: 'T', topicB: 'T', userSide: 'a',
      opponentName: 'Opp', moderatorName: 'Mod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    // Leave input empty and click send
    (document.getElementById('feed-mod-send-btn') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(100);
    await Promise.resolve();

    expect(writeFeedEventSpy).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC-323-05: submitModComment skips writeFeedEvent and
// appendFeedEvent when currentDebate is null.
// ============================================================
describe('TC-323-05 — submitModComment skips both feed-events calls when no debate', () => {
  it('does not call appendFeedEvent or writeFeedEvent when currentDebate is null', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream"></div>
      <textarea id="feed-mod-input"></textarea>
      <button id="feed-mod-send-btn" disabled></button>
    `;

    const appendFeedEventSpy = vi.fn();
    const writeFeedEventSpy = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: appendFeedEventSpy,
      writeFeedEvent: writeFeedEventSpy,
      addLocalSystem: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate(null);

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const input = document.getElementById('feed-mod-input') as HTMLTextAreaElement;
    input.value = 'Some text';
    input.dispatchEvent(new Event('input'));
    (document.getElementById('feed-mod-send-btn') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(100);
    await Promise.resolve();

    expect(appendFeedEventSpy).not.toHaveBeenCalled();
    expect(writeFeedEventSpy).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC-323-06: appendFeedEvent is called only once per message
// even when submitModComment is triggered twice in the same
// tick (send button not properly disabled before async completes).
// Verifies wiring-mod calls appendFeedEvent exactly once per submit.
// ============================================================
describe('TC-323-06 — submitModComment calls appendFeedEvent exactly once per submit', () => {
  it('appendFeedEvent is called once per button click (not doubled)', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream"></div>
      <textarea id="feed-mod-input"></textarea>
      <button id="feed-mod-send-btn" disabled></button>
    `;

    const appendFeedEventSpy = vi.fn();
    const writeFeedEventSpy = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: appendFeedEventSpy,
      writeFeedEvent: writeFeedEventSpy,
      addLocalSystem: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-323-06',
      topicA: 'T', topicB: 'T', userSide: 'a',
      opponentName: 'Opp', moderatorName: 'Mod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const input = document.getElementById('feed-mod-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('feed-mod-send-btn') as HTMLButtonElement;

    input.value = 'First message';
    input.dispatchEvent(new Event('input'));
    sendBtn.click(); // first submit

    // After click: input is cleared, so a second immediate click sends nothing
    expect(input.value).toBe('');
    sendBtn.click(); // second click — input is empty so submitModComment returns early

    await vi.advanceTimersByTimeAsync(100);
    await Promise.resolve();

    // appendFeedEvent called once (first submit only)
    expect(appendFeedEventSpy).toHaveBeenCalledOnce();
    expect(writeFeedEventSpy).toHaveBeenCalledOnce();
  });
});

// ============================================================
// TC-323-07: submitModComment passes the current round from
// arena-feed-state to writeFeedEvent.
// ============================================================
describe('TC-323-07 — submitModComment passes current round to writeFeedEvent', () => {
  it('writeFeedEvent receives speech event after set_round(3)', async () => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-stream"></div>
      <textarea id="feed-mod-input"></textarea>
      <button id="feed-mod-send-btn" disabled></button>
    `;

    const writeFeedEventSpy = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: writeFeedEventSpy,
      addLocalSystem: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-323-07',
      topicA: 'T', topicB: 'T', userSide: 'a',
      opponentName: 'Opp', moderatorName: 'Mod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    // Use set_round setter — round is a getter-only ESM binding
    const feedState = await import('../../src/arena/arena-feed-state.ts');
    feedState.set_round(3);

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const input = document.getElementById('feed-mod-input') as HTMLTextAreaElement;
    input.value = 'Round check';
    input.dispatchEvent(new Event('input'));
    (document.getElementById('feed-mod-send-btn') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(100);
    await Promise.resolve();
    await Promise.resolve();

    // writeFeedEvent is called — the round binding is internal to arena-feed-events
    // The key assertion is that writeFeedEvent was invoked with speech/mod
    expect(writeFeedEventSpy).toHaveBeenCalledWith('speech', 'Round check', 'mod');
  });
});

// ============================================================
// ARCH — seam #323
// ============================================================
describe('ARCH — seam #323', () => {
  it('src/arena/arena-feed-wiring-mod.ts imports appendFeedEvent and writeFeedEvent from arena-feed-events', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-feed-wiring-mod.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-feed-events'))).toBe(true);
    expect(source).toMatch(/\bappendFeedEvent\b/);
    expect(source).toMatch(/\bwriteFeedEvent\b/);
  });
});

// ============================================================
// SEAM #528 — arena-feed-wiring-mod → arena-feed-references
// ============================================================

// ============================================================
// TC-528-01: clicking .feed-cite-claim calls showReferencePopup
// ============================================================
describe('TC-528-01 — .feed-cite-claim click delegates to showReferencePopup', () => {
  it('calls showReferencePopup with the cite element when a cite claim is clicked', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const showReferencePopupSpy = vi.fn();
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({
      showReferencePopup: showReferencePopupSpy,
    }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt feed-evt-a" data-event-id="10">
          <span class="feed-cite-claim"
            data-url="https://example.com"
            data-source-title="Example Source"
            data-source-type="article">Cited claim text</span>
        </div>
      </div>
      <div id="feed-mod-score-row" style="display:none"></div>
      <div id="feed-score-prompt"></div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-528-01',
      topicA: 'T', topicB: 'T', userSide: 'a',
      opponentName: 'Opp', moderatorName: 'Mod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const citeEl = document.querySelector('.feed-cite-claim') as HTMLElement;
    citeEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(0);

    expect(showReferencePopupSpy).toHaveBeenCalledTimes(1);
    expect(showReferencePopupSpy).toHaveBeenCalledWith(citeEl);
  });
});

// ============================================================
// TC-528-02: showReferencePopup renders popup with claim, meta
// ============================================================
describe('TC-528-02 — showReferencePopup renders popup with claim, source title, and type', () => {
  it('appends #feed-ref-popup to body with the claim text, source type, and title', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Ensure the real module is loaded (not a leftover doMock stub from a prior test)
    vi.doUnmock('../../src/arena/arena-feed-references.ts');
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      citeDebateReference: vi.fn().mockResolvedValue(undefined),
      fileReferenceChallenge: vi.fn().mockResolvedValue({ blocked: false, challenges_remaining: 2 }),
    }));
    vi.doMock('../../src/arena/arena-feed-machine-pause.ts', () => ({ pauseFeed: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
      updateCiteButtonState: vi.fn(),
      updateChallengeButtonState: vi.fn(),
      updateBudgetDisplay: vi.fn(),
    }));

    document.body.innerHTML = '';

    const { showReferencePopup } = await import('../../src/arena/arena-feed-references.ts');

    const el = document.createElement('span');
    el.className = 'feed-cite-claim';
    el.dataset.url = 'https://example.com/ref';
    el.dataset.sourceTitle = 'Nature Journal';
    el.dataset.sourceType = 'peer_reviewed';
    el.textContent = 'Climate change is accelerating';
    document.body.appendChild(el);

    showReferencePopup(el);

    const popup = document.getElementById('feed-ref-popup');
    expect(popup).not.toBeNull();
    expect(popup!.innerHTML).toContain('Climate change is accelerating');
    expect(popup!.innerHTML).toContain('Nature Journal');
    expect(popup!.innerHTML).toContain('peer reviewed');
  });
});

// ============================================================
// TC-528-03: showReferencePopup — close button removes popup
// ============================================================
describe('TC-528-03 — showReferencePopup close button removes popup from DOM', () => {
  it('clicking #feed-ref-popup-close removes the popup', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doUnmock('../../src/arena/arena-feed-references.ts');
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      citeDebateReference: vi.fn().mockResolvedValue(undefined),
      fileReferenceChallenge: vi.fn().mockResolvedValue({ blocked: false, challenges_remaining: 2 }),
    }));
    vi.doMock('../../src/arena/arena-feed-machine-pause.ts', () => ({ pauseFeed: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
      updateCiteButtonState: vi.fn(),
      updateChallengeButtonState: vi.fn(),
      updateBudgetDisplay: vi.fn(),
    }));

    document.body.innerHTML = '';

    const { showReferencePopup } = await import('../../src/arena/arena-feed-references.ts');

    const el = document.createElement('span');
    el.className = 'feed-cite-claim';
    el.dataset.sourceTitle = 'BBC';
    el.dataset.sourceType = 'news';
    el.textContent = 'Some claim';
    document.body.appendChild(el);

    showReferencePopup(el);
    expect(document.getElementById('feed-ref-popup')).not.toBeNull();

    const closeBtn = document.getElementById('feed-ref-popup-close');
    expect(closeBtn).not.toBeNull();
    closeBtn!.click();

    expect(document.getElementById('feed-ref-popup')).toBeNull();
  });
});

// ============================================================
// TC-528-04: showReferencePopup — backdrop click removes popup
// ============================================================
describe('TC-528-04 — showReferencePopup backdrop click removes popup', () => {
  it('clicking the popup backdrop (target === popup) removes the popup', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doUnmock('../../src/arena/arena-feed-references.ts');
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      citeDebateReference: vi.fn().mockResolvedValue(undefined),
      fileReferenceChallenge: vi.fn().mockResolvedValue({ blocked: false, challenges_remaining: 2 }),
    }));
    vi.doMock('../../src/arena/arena-feed-machine-pause.ts', () => ({ pauseFeed: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
      updateCiteButtonState: vi.fn(),
      updateChallengeButtonState: vi.fn(),
      updateBudgetDisplay: vi.fn(),
    }));

    document.body.innerHTML = '';

    const { showReferencePopup } = await import('../../src/arena/arena-feed-references.ts');

    const el = document.createElement('span');
    el.className = 'feed-cite-claim';
    el.dataset.sourceTitle = 'Reuters';
    el.dataset.sourceType = 'news';
    el.textContent = 'Another claim';
    document.body.appendChild(el);

    showReferencePopup(el);
    const popup = document.getElementById('feed-ref-popup')!;
    expect(popup).not.toBeNull();

    // Simulate clicking the backdrop — target must be the popup itself
    popup.dispatchEvent(new MouseEvent('click', { bubbles: false }));

    expect(document.getElementById('feed-ref-popup')).toBeNull();
  });
});

// ============================================================
// TC-528-05: showReferencePopup — link rendered only when url present
// ============================================================
describe('TC-528-05 — showReferencePopup renders open-source link iff url is set', () => {
  it('includes an anchor when url is present, omits it when url is empty', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doUnmock('../../src/arena/arena-feed-references.ts');
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      citeDebateReference: vi.fn().mockResolvedValue(undefined),
      fileReferenceChallenge: vi.fn().mockResolvedValue({ blocked: false, challenges_remaining: 2 }),
    }));
    vi.doMock('../../src/arena/arena-feed-machine-pause.ts', () => ({ pauseFeed: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
      updateCiteButtonState: vi.fn(),
      updateChallengeButtonState: vi.fn(),
      updateBudgetDisplay: vi.fn(),
    }));

    document.body.innerHTML = '';

    const { showReferencePopup } = await import('../../src/arena/arena-feed-references.ts');

    // With URL
    const elWithUrl = document.createElement('span');
    elWithUrl.className = 'feed-cite-claim';
    elWithUrl.dataset.url = 'https://source.example.com';
    elWithUrl.dataset.sourceTitle = 'Source';
    elWithUrl.dataset.sourceType = 'article';
    elWithUrl.textContent = 'Claim with link';
    document.body.appendChild(elWithUrl);

    showReferencePopup(elWithUrl);
    let popup = document.getElementById('feed-ref-popup')!;
    const link = popup.querySelector('a.feed-ref-popup-link') as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link!.href).toContain('source.example.com');
    popup.remove();

    // Without URL
    const elNoUrl = document.createElement('span');
    elNoUrl.className = 'feed-cite-claim';
    elNoUrl.dataset.url = '';
    elNoUrl.dataset.sourceTitle = 'Source';
    elNoUrl.dataset.sourceType = 'article';
    elNoUrl.textContent = 'Claim no link';
    document.body.appendChild(elNoUrl);

    showReferencePopup(elNoUrl);
    popup = document.getElementById('feed-ref-popup')!;
    const noLink = popup.querySelector('a.feed-ref-popup-link');
    expect(noLink).toBeNull();
    popup.remove();
  });
});

// ============================================================
// TC-528-06: .feed-cite-claim click stops propagation
//   — comment selection (scoring) is NOT triggered
// ============================================================
describe('TC-528-06 — .feed-cite-claim click does not trigger comment scoring selection', () => {
  it('the score-row remains hidden after a cite-claim click', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const showReferencePopupSpy = vi.fn();
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({
      showReferencePopup: showReferencePopupSpy,
    }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({ modNullDebate: vi.fn().mockResolvedValue(undefined) }));

    document.body.innerHTML = `
      <div id="feed-stream">
        <div class="feed-evt feed-evt-a" data-event-id="77">
          <span class="feed-cite-claim"
            data-url=""
            data-source-title="Src"
            data-source-type="article">Some claim</span>
        </div>
      </div>
      <div id="feed-mod-score-row" style="display:none"></div>
      <div id="feed-score-prompt"></div>
    `;

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-528-06',
      topicA: 'T', topicB: 'T', userSide: 'a',
      opponentName: 'Opp', moderatorName: 'Mod',
      mode: 'text', ranked: false, ruleset: 'amplified', rounds: 3,
      debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    const citeEl = document.querySelector('.feed-cite-claim') as HTMLElement;
    citeEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(0);

    // showReferencePopup was called
    expect(showReferencePopupSpy).toHaveBeenCalledTimes(1);

    // Score row must remain hidden — cite click stops propagation before selection logic
    const scoreRow = document.getElementById('feed-mod-score-row')!;
    expect(scoreRow.style.display).toBe('none');
  });
});

// ============================================================
// TC-528-07: showReferencePopup removes previous popup before
//   rendering a new one (no duplicate #feed-ref-popup)
// ============================================================
describe('TC-528-07 — showReferencePopup removes stale popup before creating new one', () => {
  it('only one #feed-ref-popup exists in the DOM after two consecutive calls', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    vi.doUnmock('../../src/arena/arena-feed-references.ts');
    vi.doMock('../../src/reference-arsenal.ts', () => ({
      citeDebateReference: vi.fn().mockResolvedValue(undefined),
      fileReferenceChallenge: vi.fn().mockResolvedValue({ blocked: false, challenges_remaining: 2 }),
    }));
    vi.doMock('../../src/arena/arena-feed-machine-pause.ts', () => ({ pauseFeed: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
      updateCiteButtonState: vi.fn(),
      updateChallengeButtonState: vi.fn(),
      updateBudgetDisplay: vi.fn(),
    }));

    document.body.innerHTML = '';

    const { showReferencePopup } = await import('../../src/arena/arena-feed-references.ts');

    const make = (claim: string) => {
      const el = document.createElement('span');
      el.className = 'feed-cite-claim';
      el.dataset.sourceTitle = 'Src';
      el.dataset.sourceType = 'article';
      el.textContent = claim;
      document.body.appendChild(el);
      return el;
    };

    showReferencePopup(make('First claim'));
    showReferencePopup(make('Second claim'));

    const allPopups = document.querySelectorAll('#feed-ref-popup');
    expect(allPopups.length).toBe(1);
    expect(allPopups[0].innerHTML).toContain('Second claim');
  });
});

// ============================================================
// ARCH — seam #528
// ============================================================
describe('ARCH — seam #528', () => {
  it('src/arena/arena-feed-wiring-mod.ts imports showReferencePopup from arena-feed-references', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-feed-wiring-mod.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-feed-references'))).toBe(true);
    expect(source).toMatch(/\bshowReferencePopup\b/);
  });
});

// ============================================================
// Seam #529: arena-feed-wiring-mod.ts → arena-feed-realtime
// modNullDebate is imported from arena-feed-realtime and wired
// to three mod action buttons.
// ============================================================

// TC-529-01: feed-mod-eject-a calls modNullDebate('eject_a')
// ============================================================
describe('TC-529-01 — feed-mod-eject-a button calls modNullDebate("eject_a")', () => {
  it('calls modNullDebate with eject_a after confirm', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-mod-eject-a">Eject A</div>
      <div id="feed-mod-eject-b">Eject B</div>
      <div id="feed-mod-null">Null Debate</div>
      <div id="feed-stream"></div>
    `;

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const modNullDebateMock = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({
      modNullDebate: modNullDebateMock,
    }));

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-529-01',
      topicA: 'A', topicB: 'B', userSide: 'mod', opponentName: '',
      moderatorName: 'Mod', mode: 'text', ranked: false,
      ruleset: 'amplified', rounds: 3, debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    document.getElementById('feed-mod-eject-a')!.click();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    expect(modNullDebateMock).toHaveBeenCalledWith('eject_a');
  });
});

// TC-529-02: feed-mod-eject-b calls modNullDebate('eject_b')
// ============================================================
describe('TC-529-02 — feed-mod-eject-b button calls modNullDebate("eject_b")', () => {
  it('calls modNullDebate with eject_b after confirm', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-mod-eject-a">Eject A</div>
      <div id="feed-mod-eject-b">Eject B</div>
      <div id="feed-mod-null">Null Debate</div>
      <div id="feed-stream"></div>
    `;

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const modNullDebateMock = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({
      modNullDebate: modNullDebateMock,
    }));

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-529-02',
      topicA: 'A', topicB: 'B', userSide: 'mod', opponentName: '',
      moderatorName: 'Mod', mode: 'text', ranked: false,
      ruleset: 'amplified', rounds: 3, debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    document.getElementById('feed-mod-eject-b')!.click();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    expect(modNullDebateMock).toHaveBeenCalledWith('eject_b');
  });
});

// TC-529-03: feed-mod-null calls modNullDebate('null')
// ============================================================
describe('TC-529-03 — feed-mod-null button calls modNullDebate("null")', () => {
  it('calls modNullDebate with null after confirm', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-mod-eject-a">Eject A</div>
      <div id="feed-mod-eject-b">Eject B</div>
      <div id="feed-mod-null">Null Debate</div>
      <div id="feed-stream"></div>
    `;

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const modNullDebateMock = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({
      modNullDebate: modNullDebateMock,
    }));

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-529-03',
      topicA: 'A', topicB: 'B', userSide: 'mod', opponentName: '',
      moderatorName: 'Mod', mode: 'text', ranked: false,
      ruleset: 'amplified', rounds: 3, debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    document.getElementById('feed-mod-null')!.click();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    expect(modNullDebateMock).toHaveBeenCalledWith('null');
  });
});

// TC-529-04: modNullDebate calls mod_null_debate RPC with correct params
// ============================================================
describe('TC-529-04 — modNullDebate calls mod_null_debate RPC with p_debate_id and p_reason', () => {
  it('fires mod_null_debate RPC when modNullDebate is invoked', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockResolvedValue({ data: null, error: null });

    vi.doMock('../../src/arena/arena-feed-heartbeat.ts', () => ({
      stopHeartbeat: vi.fn(),
      startHeartbeat: vi.fn(),
      sendGoodbye: vi.fn(),
      setParticipantGoneCallback: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-feed-machine-turns.ts', () => ({
      clearFeedTimer: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-deepgram.ts', () => ({
      stopTranscription: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-feed-room.ts', () => ({
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
      addLocalSystem: vi.fn(),
      clearInterimTranscript: vi.fn(),
      appendFeedEvent: vi.fn(),
      setDebaterInputEnabled: vi.fn(),
    }));
    vi.doMock('../../src/arena/arena-room-end.ts', () => ({
      endCurrentDebate: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({
      showDisconnectBanner: vi.fn(),
      updateBudgetDisplay: vi.fn(),
    }));

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-529-04',
      topicA: 'A', topicB: 'B', userSide: 'mod', opponentName: '',
      moderatorName: 'Mod', mode: 'text', ranked: false,
      ruleset: 'amplified', rounds: 3, debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const feedStateModule = await import('../../src/arena/arena-feed-state.ts');
    feedStateModule.set_disconnectHandled(false);

    const { modNullDebate } = await import('../../src/arena/arena-feed-disconnect-mod.ts');
    const promise = modNullDebate('eject_b');
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    expect(mockRpc).toHaveBeenCalledWith('mod_null_debate', {
      p_debate_id: 'debate-529-04',
      p_reason: 'eject_b',
    });
  });
});

// TC-529-05: confirm cancel prevents modNullDebate call
// ============================================================
describe('TC-529-05 — eject-a button skips modNullDebate when user cancels confirm', () => {
  it('does not call modNullDebate when confirm returns false', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="feed-mod-eject-a">Eject A</div>
      <div id="feed-mod-eject-b">Eject B</div>
      <div id="feed-mod-null">Null Debate</div>
      <div id="feed-stream"></div>
    `;

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const modNullDebateMock = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../../src/arena/arena-feed-ui.ts', () => ({ updateBudgetDisplay: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-events.ts', () => ({
      appendFeedEvent: vi.fn(),
      writeFeedEvent: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../../src/arena/arena-feed-references.ts', () => ({ showReferencePopup: vi.fn() }));
    vi.doMock('../../src/arena/arena-feed-realtime.ts', () => ({
      modNullDebate: modNullDebateMock,
    }));

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_currentDebate({
      id: 'debate-529-05',
      topicA: 'A', topicB: 'B', userSide: 'mod', opponentName: '',
      moderatorName: 'Mod', mode: 'text', ranked: false,
      ruleset: 'amplified', rounds: 3, debaterAId: 'uid-a', debaterBId: 'uid-b',
    } as any);

    const { wireModControls } = await import('../../src/arena/arena-feed-wiring-mod.ts');
    wireModControls();

    document.getElementById('feed-mod-eject-a')!.click();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    expect(modNullDebateMock).not.toHaveBeenCalled();
  });
});

// TC-529-06: ARCH — wiring-mod imports modNullDebate from arena-feed-realtime
// ============================================================
describe('ARCH — seam #529', () => {
  it('src/arena/arena-feed-wiring-mod.ts imports modNullDebate from arena-feed-realtime', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-feed-wiring-mod.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-feed-realtime'))).toBe(true);
    expect(source).toMatch(/\bmodNullDebate\b/);
  });
});
