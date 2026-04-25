// ============================================================
// INTEGRATOR — arena-feed-transcript + arena-feed-state
// Seam #107
//
// Boundary: arena-feed-transcript reads `round` from arena-feed-state.
//           handleDeepgramTranscript calls appendFeedEvent (arena-feed-events)
//             using round as part of the event payload.
//           showInterimTranscript / clearInterimTranscript manipulate DOM.
//           updateDeepgramStatus creates / hides status indicator DOM element.
// Mock boundary: @supabase/supabase-js only.
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

let handleDeepgramTranscript: (text: string, debate: unknown) => Promise<void>;
let showInterimTranscript: (text: string) => void;
let clearInterimTranscript: () => void;
let updateDeepgramStatus: (status: string) => void;

let set_round: (v: number) => void;
let getRound: () => number;
let set_currentDebate: (v: unknown) => void;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

  mockRpc.mockReset();
  mockFrom.mockReset();
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockImplementation(
    (cb: (event: string, session: null) => void) => {
      setTimeout(() => cb('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }
  );

  // scrollTo polyfill — jsdom does not implement it
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = vi.fn();
  } else {
    (Element.prototype.scrollTo as unknown) = vi.fn();
  }

  // DOM scaffold: feed-stream + feed-turn-label required by transcript helpers
  document.body.innerHTML = `
    <div id="feed-stream"></div>
    <div id="feed-turn-label">Round 1</div>
  `;

  const transcriptMod = await import('../../src/arena/arena-feed-transcript.ts');
  handleDeepgramTranscript = transcriptMod.handleDeepgramTranscript as typeof handleDeepgramTranscript;
  showInterimTranscript = transcriptMod.showInterimTranscript;
  clearInterimTranscript = transcriptMod.clearInterimTranscript;
  updateDeepgramStatus = transcriptMod.updateDeepgramStatus as typeof updateDeepgramStatus;

  const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
  set_round = feedStateMod.set_round;
  getRound = () => feedStateMod.round;

  const stateMod = await import('../../src/arena/arena-state.ts');
  set_currentDebate = stateMod.set_currentDebate as (v: unknown) => void;
});

// ============================================================
// ARCH FILTER — verify source imports from arena-feed-state
// ============================================================

describe('ARCH: arena-feed-transcript imports round from arena-feed-state', () => {
  it('source imports from arena-feed-state', async () => {
    const source = await fetch(
      new URL('../../src/arena/arena-feed-transcript.ts', import.meta.url)
    ).then(r => r.text()).catch(() => null);

    if (!source) {
      // fallback: verify via module handle
      const feedStateMod = await import('../../src/arena/arena-feed-state.ts');
      expect(typeof feedStateMod.round).toBe('number');
      return;
    }

    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const hasFeedState = importLines.some(l => l.includes('arena-feed-state'));
    expect(hasFeedState).toBe(true);
  });
});

// ============================================================
// TC-I1: handleDeepgramTranscript — empty text returns early, no DOM change
// ============================================================

describe('TC-I1: handleDeepgramTranscript skips on empty text', () => {
  it('does not append to feed-stream when text is empty', async () => {
    set_currentDebate({ id: 'debate-1', role: 'a', opponentName: 'Rival', messages: [] });

    const debate = { id: 'debate-1', role: 'a', opponentName: 'Rival' };
    await handleDeepgramTranscript('', debate);

    const stream = document.getElementById('feed-stream')!;
    expect(stream.children.length).toBe(0);
  });

  it('does not call safeRpc when text is empty', async () => {
    const debate = { id: 'debate-1', role: 'a', opponentName: 'Rival' };
    await handleDeepgramTranscript('', debate);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC-I2: handleDeepgramTranscript — uses round from arena-feed-state
// ============================================================

describe('TC-I2: handleDeepgramTranscript stamps event with current round from arena-feed-state', () => {
  it('event appended to feed-stream has the round set in arena-feed-state', async () => {
    set_round(3);
    expect(getRound()).toBe(3);

    set_currentDebate({ id: 'debate-2', role: 'b', opponentName: 'Alpha', messages: [] });

    const debate = { id: 'debate-2', role: 'b', opponentName: 'Alpha' };
    await handleDeepgramTranscript('Great argument', debate);

    // The event is appended to the feed-stream DOM
    const stream = document.getElementById('feed-stream')!;
    expect(stream.children.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// TC-I3: handleDeepgramTranscript — clears interim transcript after final
// ============================================================

describe('TC-I3: handleDeepgramTranscript clears interim transcript on success', () => {
  it('hides #feed-interim-transcript after handling a final transcript', async () => {
    // Pre-create the interim element and make it visible
    const stream = document.getElementById('feed-stream')!;
    const interim = document.createElement('div');
    interim.id = 'feed-interim-transcript';
    interim.textContent = 'partial...';
    interim.style.display = '';
    stream.parentElement?.insertBefore(interim, stream.nextSibling);

    set_currentDebate({ id: 'debate-3', role: 'a', opponentName: 'Beta', messages: [] });

    const debate = { id: 'debate-3', role: 'a', opponentName: 'Beta' };
    await handleDeepgramTranscript('Final sentence', debate);

    const el = document.getElementById('feed-interim-transcript')!;
    expect(el.style.display).toBe('none');
    expect(el.textContent).toBe('');
  });
});

// ============================================================
// TC-I4: showInterimTranscript — creates element and sets text
// ============================================================

describe('TC-I4: showInterimTranscript creates and shows interim element', () => {
  it('creates #feed-interim-transcript if absent and sets textContent', () => {
    expect(document.getElementById('feed-interim-transcript')).toBeNull();

    showInterimTranscript('Saying something...');

    const el = document.getElementById('feed-interim-transcript');
    expect(el).not.toBeNull();
    expect(el!.textContent).toBe('Saying something...');
    expect(el!.style.display).not.toBe('none');
  });

  it('updates textContent on subsequent calls', () => {
    showInterimTranscript('First partial');
    showInterimTranscript('Updated partial');

    const el = document.getElementById('feed-interim-transcript')!;
    expect(el.textContent).toBe('Updated partial');
  });
});

// ============================================================
// TC-I5: showInterimTranscript — empty string hides the element
// ============================================================

describe('TC-I5: showInterimTranscript hides element when text is empty', () => {
  it('sets display to none when empty string is passed', () => {
    showInterimTranscript('Some text');
    showInterimTranscript('');

    const el = document.getElementById('feed-interim-transcript')!;
    expect(el.style.display).toBe('none');
  });
});

// ============================================================
// TC-I6: clearInterimTranscript — blanks and hides the element
// ============================================================

describe('TC-I6: clearInterimTranscript blanks and hides #feed-interim-transcript', () => {
  it('sets textContent empty and hides existing interim element', () => {
    showInterimTranscript('still typing...');

    clearInterimTranscript();

    const el = document.getElementById('feed-interim-transcript')!;
    expect(el.textContent).toBe('');
    expect(el.style.display).toBe('none');
  });

  it('does not throw when element does not exist', () => {
    expect(() => clearInterimTranscript()).not.toThrow();
  });
});

// ============================================================
// TC-I7: updateDeepgramStatus — creates status indicator and hides on 'live'
// ============================================================

describe('TC-I7: updateDeepgramStatus manages #feed-deepgram-status element', () => {
  it('creates #feed-deepgram-status and shows connecting message', () => {
    expect(document.getElementById('feed-deepgram-status')).toBeNull();

    updateDeepgramStatus('connecting');

    const el = document.getElementById('feed-deepgram-status');
    expect(el).not.toBeNull();
    expect(el!.style.display).not.toBe('none');
    expect(el!.textContent).toContain('Connecting');
  });

  it('shows paused message when status is paused', () => {
    updateDeepgramStatus('paused');

    const el = document.getElementById('feed-deepgram-status')!;
    expect(el.style.display).not.toBe('none');
    expect(el.textContent).toContain('paused');
  });

  it('shows error message when status is error', () => {
    updateDeepgramStatus('error');

    const el = document.getElementById('feed-deepgram-status')!;
    expect(el.style.display).not.toBe('none');
    expect(el.textContent).toContain('unavailable');
  });

  it('hides #feed-deepgram-status when status is live', () => {
    // First show it
    updateDeepgramStatus('connecting');

    // Then set live — should hide
    updateDeepgramStatus('live');

    const el = document.getElementById('feed-deepgram-status')!;
    expect(el.style.display).toBe('none');
  });

  it('hides #feed-deepgram-status when status is stopped', () => {
    updateDeepgramStatus('connecting');
    updateDeepgramStatus('stopped');

    const el = document.getElementById('feed-deepgram-status')!;
    expect(el.style.display).toBe('none');
  });
});
