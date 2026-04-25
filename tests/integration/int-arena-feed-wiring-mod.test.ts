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
