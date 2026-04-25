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
