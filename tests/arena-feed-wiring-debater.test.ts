import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockGetCurrentProfile = vi.hoisted(() => vi.fn().mockReturnValue({ display_name: 'Alice', username: 'alice' }));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockStopTranscription = vi.hoisted(() => vi.fn());

const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockFeedPaused = vi.hoisted(() => ({ value: false }));
const mockChallengeRulingTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockSet_feedPaused = vi.hoisted(() => vi.fn());
const mockSet_challengeRulingTimer = vi.hoisted(() => vi.fn());
const mockSet_activeChallengeRefId = vi.hoisted(() => vi.fn());

const mockRound = vi.hoisted(() => ({ value: 1 }));
const mockAppendFeedEvent = vi.hoisted(() => vi.fn());
const mockWriteFeedEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockSetDebaterInputEnabled = vi.hoisted(() => vi.fn());
const mockClearFeedTimer = vi.hoisted(() => vi.fn());
const mockFinishCurrentTurn = vi.hoisted(() => vi.fn());
const mockStartFinalAdBreak = vi.hoisted(() => vi.fn());
const mockShowCiteDropdown = vi.hoisted(() => vi.fn());
const mockShowChallengeDropdown = vi.hoisted(() => vi.fn());
const mockClearInterimTranscript = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

vi.mock('../src/arena/arena-deepgram.ts', () => ({
  stopTranscription: mockStopTranscription,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
  get feedPaused() { return mockFeedPaused.value; },
  get challengeRulingTimer() { return mockChallengeRulingTimer.value; },
  set_feedPaused: mockSet_feedPaused,
  set_challengeRulingTimer: mockSet_challengeRulingTimer,
  set_activeChallengeRefId: mockSet_activeChallengeRefId,
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get round() { return mockRound.value; },
}));

vi.mock('../src/arena/arena-feed-events.ts', () => ({
  appendFeedEvent: mockAppendFeedEvent,
  writeFeedEvent: mockWriteFeedEvent,
}));

vi.mock('../src/arena/arena-feed-ui.ts', () => ({
  setDebaterInputEnabled: mockSetDebaterInputEnabled,
}));

vi.mock('../src/arena/arena-feed-machine-turns.ts', () => ({
  clearFeedTimer: mockClearFeedTimer,
  finishCurrentTurn: mockFinishCurrentTurn,
}));

vi.mock('../src/arena/arena-feed-machine-ads.ts', () => ({
  startFinalAdBreak: mockStartFinalAdBreak,
}));

vi.mock('../src/arena/arena-feed-references.ts', () => ({
  showCiteDropdown: mockShowCiteDropdown,
  showChallengeDropdown: mockShowChallengeDropdown,
}));

vi.mock('../src/arena/arena-feed-transcript.ts', () => ({
  clearInterimTranscript: mockClearInterimTranscript,
}));

import { wireDebaterControls } from '../src/arena/arena-feed-wiring-debater.ts';

const baseDebate = {
  id: 'deb-1',
  role: 'a',
  modView: false,
  spectatorView: false,
  concededBy: null,
};

describe('TC1 — wireDebaterControls wires input events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <textarea id="feed-debater-input"></textarea>
      <button id="feed-debater-send-btn"></button>
      <button id="feed-finish-turn"></button>
      <button id="feed-concede"></button>
      <button id="feed-cite-btn"></button>
      <button id="feed-challenge-btn"></button>
    `;
    mockCurrentDebate.value = { ...baseDebate };
    mockFeedPaused.value = false;
  });

  it('enables send button on input event when text present', () => {
    wireDebaterControls(baseDebate as never);
    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    input.value = 'hello';
    input.dispatchEvent(new Event('input'));
    expect((document.getElementById('feed-debater-send-btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables send button on input event when text empty', () => {
    wireDebaterControls(baseDebate as never);
    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect((document.getElementById('feed-debater-send-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('send button click calls writeFeedEvent', async () => {
    wireDebaterControls(baseDebate as never);
    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    input.value = 'my argument';
    input.dispatchEvent(new Event('input'));
    document.getElementById('feed-debater-send-btn')?.click();
    await Promise.resolve();
    expect(mockWriteFeedEvent).toHaveBeenCalledWith('speech', 'my argument', 'a');
  });

  it('Enter key triggers send', async () => {
    wireDebaterControls(baseDebate as never);
    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    input.value = 'enter test';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await Promise.resolve();
    expect(mockWriteFeedEvent).toHaveBeenCalled();
  });

  it('Shift+Enter does not trigger send', async () => {
    wireDebaterControls(baseDebate as never);
    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    input.value = 'shift enter';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    await Promise.resolve();
    expect(mockWriteFeedEvent).not.toHaveBeenCalled();
  });

  it('finish button calls finishCurrentTurn', () => {
    wireDebaterControls(baseDebate as never);
    document.getElementById('feed-finish-turn')?.click();
    expect(mockFinishCurrentTurn).toHaveBeenCalled();
  });

  it('cite button calls showCiteDropdown when not paused', () => {
    wireDebaterControls(baseDebate as never);
    document.getElementById('feed-cite-btn')?.click();
    expect(mockShowCiteDropdown).toHaveBeenCalled();
  });

  it('cite button does nothing when feed is paused', () => {
    mockFeedPaused.value = true;
    wireDebaterControls(baseDebate as never);
    document.getElementById('feed-cite-btn')?.click();
    expect(mockShowCiteDropdown).not.toHaveBeenCalled();
  });

  it('challenge button calls showChallengeDropdown when not paused', () => {
    wireDebaterControls(baseDebate as never);
    document.getElementById('feed-challenge-btn')?.click();
    expect(mockShowChallengeDropdown).toHaveBeenCalled();
  });
});

describe('TC2 — submitDebaterMessage optimistic append', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <textarea id="feed-debater-input" value=""></textarea>
      <button id="feed-debater-send-btn"></button>
      <button id="feed-finish-turn"></button>
      <button id="feed-concede"></button>
      <button id="feed-cite-btn"></button>
      <button id="feed-challenge-btn"></button>
    `;
    mockCurrentDebate.value = { ...baseDebate };
    mockFeedPaused.value = false;
  });

  it('appends event optimistically before RPC', async () => {
    wireDebaterControls(baseDebate as never);
    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    input.value = 'test message';
    input.dispatchEvent(new Event('input'));
    document.getElementById('feed-debater-send-btn')?.click();
    await Promise.resolve();
    expect(mockAppendFeedEvent).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'speech',
      content: 'test message',
    }));
  });

  it('skips send when input is empty', async () => {
    wireDebaterControls(baseDebate as never);
    const input = document.getElementById('feed-debater-input') as HTMLTextAreaElement;
    input.value = '';
    document.getElementById('feed-debater-send-btn')?.click();
    await Promise.resolve();
    expect(mockWriteFeedEvent).not.toHaveBeenCalled();
  });
});

describe('ARCH — arena-feed-wiring-debater.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-deepgram.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-feed-state.ts',
      './arena-feed-events.ts',
      './arena-feed-ui.ts',
      './arena-feed-machine-turns.ts',
      './arena-feed-machine-ads.ts',
      './arena-feed-references.ts',
      './arena-feed-transcript.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-wiring-debater.ts'),
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
