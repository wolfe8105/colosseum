import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockShowToast = vi.hoisted(() => vi.fn());

const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));

const mockRound = vi.hoisted(() => ({ value: 1 }));
const mockScoreUsed = vi.hoisted(() => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>));
const mockPinnedEventIds = vi.hoisted(() => new Set<string>());

const mockAppendFeedEvent = vi.hoisted(() => vi.fn());
const mockWriteFeedEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockUpdateBudgetDisplay = vi.hoisted(() => vi.fn());
const mockShowReferencePopup = vi.hoisted(() => vi.fn());
const mockModNullDebate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
}));

vi.mock('../src/arena/arena-types-feed-room.ts', () => ({
  FEED_SCORE_BUDGET: { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 },
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get round() { return mockRound.value; },
  get scoreUsed() { return mockScoreUsed; },
  get pinnedEventIds() { return mockPinnedEventIds; },
}));

vi.mock('../src/arena/arena-feed-events.ts', () => ({
  appendFeedEvent: mockAppendFeedEvent,
  writeFeedEvent: mockWriteFeedEvent,
}));

vi.mock('../src/arena/arena-feed-ui.ts', () => ({
  updateBudgetDisplay: mockUpdateBudgetDisplay,
}));

vi.mock('../src/arena/arena-feed-references.ts', () => ({
  showReferencePopup: mockShowReferencePopup,
}));

vi.mock('../src/arena/arena-feed-realtime.ts', () => ({
  modNullDebate: mockModNullDebate,
}));

import { wireModControls } from '../src/arena/arena-feed-wiring-mod.ts';

describe('TC1 — wireModControls wires mod input', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <textarea id="feed-mod-input"></textarea>
      <button id="feed-mod-send-btn" disabled></button>
      <div id="feed-stream"></div>
      <div id="feed-mod-score-row" style="display:none;"></div>
      <div id="feed-score-prompt"></div>
      <button class="feed-score-btn" data-pts="1">1</button>
      <button id="feed-score-cancel"></button>
      <button id="feed-mod-eject-a"></button>
      <button id="feed-mod-eject-b"></button>
      <button id="feed-mod-null"></button>
    `;
    mockCurrentDebate.value = { id: 'deb-1', role: 'a', modView: true, debaterAName: 'Alice', debaterBName: 'Bob' };
    mockScoreUsed[1] = 0;
  });

  it('enables send button on input event when text present', () => {
    wireModControls();
    const input = document.getElementById('feed-mod-input') as HTMLTextAreaElement;
    input.value = 'Great point';
    input.dispatchEvent(new Event('input'));
    expect((document.getElementById('feed-mod-send-btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables send button when text empty', () => {
    wireModControls();
    const input = document.getElementById('feed-mod-input') as HTMLTextAreaElement;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect((document.getElementById('feed-mod-send-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('send click calls writeFeedEvent', async () => {
    wireModControls();
    const sendBtn = document.getElementById('feed-mod-send-btn') as HTMLButtonElement;
    sendBtn.disabled = false;
    const input = document.getElementById('feed-mod-input') as HTMLTextAreaElement;
    input.value = 'Great debate';
    input.dispatchEvent(new Event('input'));
    sendBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockWriteFeedEvent).toHaveBeenCalled();
  });

  it('Enter calls writeFeedEvent', async () => {
    wireModControls();
    const input = document.getElementById('feed-mod-input') as HTMLTextAreaElement;
    input.value = 'comment';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(mockWriteFeedEvent).toHaveBeenCalled();
  });

  it('Shift+Enter does not submit', async () => {
    wireModControls();
    const input = document.getElementById('feed-mod-input') as HTMLTextAreaElement;
    input.value = 'comment';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    await Promise.resolve();
    expect(mockWriteFeedEvent).not.toHaveBeenCalled();
  });
});

describe('TC2 — wireModControls wires score row on comment click', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <textarea id="feed-mod-input"></textarea>
      <button id="feed-mod-send-btn"></button>
      <div id="feed-stream">
        <div class="feed-evt-a" data-event-id="evt-1">Argument A</div>
        <div class="feed-evt-b" data-event-id="evt-2">Argument B</div>
      </div>
      <div id="feed-mod-score-row" style="display:none;"></div>
      <div id="feed-score-prompt"></div>
      <button class="feed-score-btn" data-pts="1">1</button>
      <button id="feed-score-cancel"></button>
      <button id="feed-mod-eject-a"></button>
      <button id="feed-mod-eject-b"></button>
      <button id="feed-mod-null"></button>
    `;
    mockCurrentDebate.value = { id: 'deb-1', modView: true };
    mockScoreUsed[1] = 0;
  });

  it('clicking a feed-evt-a shows score row', () => {
    wireModControls();
    (document.querySelector('.feed-evt-a') as HTMLElement)?.click();
    expect(document.getElementById('feed-mod-score-row')?.style.display).toBe('flex');
  });

  it('clicking a feed-evt-b shows Debater B label', () => {
    wireModControls();
    (document.querySelector('.feed-evt-b') as HTMLElement)?.click();
    expect(document.getElementById('feed-score-prompt')?.textContent).toContain('B');
  });
});

describe('TC3 — eject/null buttons call modNullDebate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <textarea id="feed-mod-input"></textarea>
      <button id="feed-mod-send-btn"></button>
      <div id="feed-stream"></div>
      <div id="feed-mod-score-row"></div>
      <div id="feed-score-prompt"></div>
      <button class="feed-score-btn" data-pts="1">1</button>
      <button id="feed-score-cancel"></button>
      <button id="feed-mod-eject-a"></button>
      <button id="feed-mod-eject-b"></button>
      <button id="feed-mod-null"></button>
    `;
    mockCurrentDebate.value = { id: 'deb-1', modView: true };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('eject-a button calls modNullDebate with eject_a', async () => {
    wireModControls();
    document.getElementById('feed-mod-eject-a')?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockModNullDebate).toHaveBeenCalledWith('eject_a');
  });

  it('eject-b button calls modNullDebate with eject_b', async () => {
    wireModControls();
    document.getElementById('feed-mod-eject-b')?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockModNullDebate).toHaveBeenCalledWith('eject_b');
  });

  it('null button calls modNullDebate with null', async () => {
    wireModControls();
    document.getElementById('feed-mod-null')?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockModNullDebate).toHaveBeenCalledWith('null');
  });
});

describe('ARCH — arena-feed-wiring-mod.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types-feed-room.ts',
      './arena-feed-state.ts',
      './arena-feed-events.ts',
      './arena-feed-ui.ts',
      './arena-feed-references.ts',
      './arena-feed-realtime.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-wiring-mod.ts'),
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
