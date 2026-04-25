// ============================================================
// ARENA FEED TRANSCRIPT — tests/arena-feed-transcript.test.ts
// Source: src/arena/arena-feed-transcript.ts
//
// CLASSIFICATION:
//   handleDeepgramTranscript() — Orchestration + RPC → Contract test
//   showInterimTranscript()    — DOM mutation → Integration test
//   clearInterimTranscript()   — DOM mutation → Integration test
//   updateDeepgramStatus()     — DOM mutation → Integration test
//
// IMPORTS:
//   { getCurrentProfile }          from '../auth.ts'
//   type { DeepgramStatus }        from './arena-deepgram.ts'
//   type { CurrentDebate }         from './arena-types.ts'
//   { round }                      from './arena-feed-state.ts'
//   { appendFeedEvent, writeFeedEvent } from './arena-feed-events.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCurrentProfile = vi.hoisted(() => vi.fn(() => null));
const mockAppendFeedEvent   = vi.hoisted(() => vi.fn());
const mockWriteFeedEvent    = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const stateVars = vi.hoisted(() => ({
  round: 1,
}));

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get round() { return stateVars.round; },
  firstSpeaker: vi.fn(() => 'a'),
  secondSpeaker: vi.fn(() => 'b'),
}));

vi.mock('../src/arena/arena-feed-events.ts', () => ({
  appendFeedEvent: mockAppendFeedEvent,
  writeFeedEvent: mockWriteFeedEvent,
}));

import {
  handleDeepgramTranscript,
  showInterimTranscript,
  clearInterimTranscript,
  updateDeepgramStatus,
} from '../src/arena/arena-feed-transcript.ts';

const makeDebate = (overrides = {}) => ({
  id: 'debate-1',
  role: 'pro' as const,
  mode: 'live' as const,
  ranked: false,
  topic: 'Topic',
  ...overrides,
});

beforeEach(() => {
  mockGetCurrentProfile.mockReset().mockReturnValue({ display_name: 'Alice' });
  mockAppendFeedEvent.mockReset();
  mockWriteFeedEvent.mockReset().mockResolvedValue(undefined);
  stateVars.round = 1;
  document.body.innerHTML = `
    <div id="feed-stream"></div>
    <div id="feed-turn-label"></div>
  `;
});

// ── TC1: handleDeepgramTranscript — no-op when text empty ────

describe('TC1 — handleDeepgramTranscript: no-op when text is empty', () => {
  it('does not call appendFeedEvent when text is empty', async () => {
    await handleDeepgramTranscript('', makeDebate() as never);
    expect(mockAppendFeedEvent).not.toHaveBeenCalled();
  });
});

// ── TC2: handleDeepgramTranscript — no-op when debate null ───

describe('TC2 — handleDeepgramTranscript: no-op when debate is falsy', () => {
  it('does not call appendFeedEvent when debate is null', async () => {
    await handleDeepgramTranscript('Hello', null as never);
    expect(mockAppendFeedEvent).not.toHaveBeenCalled();
  });
});

// ── TC3: handleDeepgramTranscript — calls appendFeedEvent ────

describe('TC3 — handleDeepgramTranscript: calls appendFeedEvent with speech event', () => {
  it('calls appendFeedEvent with event_type="speech"', async () => {
    await handleDeepgramTranscript('AI will rule', makeDebate() as never);
    expect(mockAppendFeedEvent).toHaveBeenCalledTimes(1);
    const [event] = mockAppendFeedEvent.mock.calls[0];
    expect(event.event_type).toBe('speech');
    expect(event.content).toBe('AI will rule');
  });
});

// ── TC4: handleDeepgramTranscript — calls writeFeedEvent ─────

describe('TC4 — handleDeepgramTranscript: calls writeFeedEvent to persist', () => {
  it('calls writeFeedEvent with speech type and text', async () => {
    await handleDeepgramTranscript('Hello', makeDebate() as never);
    expect(mockWriteFeedEvent).toHaveBeenCalledWith('speech', 'Hello', 'pro');
  });
});

// ── TC5: showInterimTranscript — creates element if absent ───

describe('TC5 — showInterimTranscript: creates #feed-interim-transcript if absent', () => {
  it('creates element and sets textContent', () => {
    showInterimTranscript('partial...');
    const el = document.getElementById('feed-interim-transcript');
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe('partial...');
  });
});

// ── TC6: showInterimTranscript — hides element on empty text ─

describe('TC6 — showInterimTranscript: hides element when text is empty', () => {
  it('sets display=none on empty text', () => {
    showInterimTranscript('partial');
    showInterimTranscript('');
    const el = document.getElementById('feed-interim-transcript')!;
    expect(el.style.display).toBe('none');
  });
});

// ── TC7: clearInterimTranscript — clears text and hides ──────

describe('TC7 — clearInterimTranscript: clears and hides interim element', () => {
  it('sets textContent="" and display=none', () => {
    showInterimTranscript('partial...');
    clearInterimTranscript();
    const el = document.getElementById('feed-interim-transcript')!;
    expect(el.textContent).toBe('');
    expect(el.style.display).toBe('none');
  });
});

// ── TC8: clearInterimTranscript — no-op when element absent ─

describe('TC8 — clearInterimTranscript: no-op when element is absent', () => {
  it('does not throw when #feed-interim-transcript is absent', () => {
    expect(() => clearInterimTranscript()).not.toThrow();
  });
});

// ── TC9: updateDeepgramStatus — hides element on "live" ──────

describe('TC9 — updateDeepgramStatus: hides element when status is live', () => {
  it('sets display:none when status=live', () => {
    const el = document.createElement('div');
    el.id = 'feed-deepgram-status';
    document.body.appendChild(el);
    updateDeepgramStatus('live');
    expect(el.style.display).toBe('none');
  });
});

// ── TC10: updateDeepgramStatus — shows connecting text ───────

describe('TC10 — updateDeepgramStatus: creates element and shows connecting text', () => {
  it('renders connecting message when status=connecting', () => {
    updateDeepgramStatus('connecting');
    const el = document.getElementById('feed-deepgram-status')!;
    expect(el).not.toBeNull();
    expect(el.textContent).toContain('Connecting');
  });
});

// ── TC11: updateDeepgramStatus — no-op when container absent ─

describe('TC11 — updateDeepgramStatus: no-op when #feed-turn-label absent', () => {
  it('does not throw when #feed-turn-label is missing', () => {
    document.body.innerHTML = '';
    expect(() => updateDeepgramStatus('connecting')).not.toThrow();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-feed-transcript.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      './arena-deepgram.ts',
      './arena-types.ts',
      './arena-feed-state.ts',
      './arena-feed-events.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-transcript.ts'),
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
