import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockScreenEl = vi.hoisted(() => ({ value: null as HTMLElement | null }));
const mockSet_view = vi.hoisted(() => vi.fn());
const mockStartModDebatePoll = vi.hoisted(() => vi.fn());
const mockStopModDebatePoll = vi.hoisted(() => vi.fn());
const mockCancelModDebate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRenderLobby = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get screenEl() { return mockScreenEl.value; },
  set_view: mockSet_view,
}));

vi.mock('../src/arena/arena-mod-debate-poll.ts', () => ({
  startModDebatePoll: mockStartModDebatePoll,
  stopModDebatePoll: mockStopModDebatePoll,
  cancelModDebate: mockCancelModDebate,
}));

vi.mock('../src/arena/arena-lobby.ts', () => ({
  renderLobby: mockRenderLobby,
}));

import { showModDebateWaitingMod, showModDebateWaitingDebater } from '../src/arena/arena-mod-debate-waiting.ts';

describe('TC1 — showModDebateWaitingMod renders mod waiting screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
  });

  it('calls set_view with modDebateWaiting', () => {
    showModDebateWaitingMod('d-1', 'ABCDE', 'AI debate', 'text', false);
    expect(mockSet_view).toHaveBeenCalledWith('modDebateWaiting');
  });

  it('renders container with join code', () => {
    showModDebateWaitingMod('d-1', 'ABCDE', 'AI debate', 'text', false);
    expect(document.body.textContent).toContain('ABCDE');
  });

  it('renders cancel button', () => {
    showModDebateWaitingMod('d-1', 'ABCDE', 'AI debate', 'text', false);
    expect(document.getElementById('mod-debate-cancel-btn')).not.toBeNull();
  });

  it('calls startModDebatePoll', () => {
    showModDebateWaitingMod('d-1', 'ABCDE', 'AI debate', 'text', false);
    expect(mockStartModDebatePoll).toHaveBeenCalledWith('d-1', 'text', false);
  });

  it('cancel button calls cancelModDebate', () => {
    showModDebateWaitingMod('d-1', 'ABCDE', 'AI debate', 'text', false);
    document.getElementById('mod-debate-cancel-btn')?.click();
    expect(mockCancelModDebate).toHaveBeenCalledWith('d-1');
  });
});

describe('TC2 — showModDebateWaitingDebater renders debater waiting screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
  });

  it('calls set_view with modDebateWaiting', () => {
    showModDebateWaitingDebater('d-2', 'Economy', 'live', true);
    expect(mockSet_view).toHaveBeenCalledWith('modDebateWaiting');
  });

  it('renders leave button', () => {
    showModDebateWaitingDebater('d-2', 'Economy', 'live', true);
    expect(document.getElementById('mod-debate-debater-cancel-btn')).not.toBeNull();
  });

  it('calls startModDebatePoll', () => {
    showModDebateWaitingDebater('d-2', 'Economy', 'live', true);
    expect(mockStartModDebatePoll).toHaveBeenCalledWith('d-2', 'live', true);
  });

  it('leave button calls stopModDebatePoll and renderLobby', async () => {
    showModDebateWaitingDebater('d-2', 'Economy', 'live', true);
    document.getElementById('mod-debate-debater-cancel-btn')?.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockStopModDebatePoll).toHaveBeenCalled();
    expect(mockRenderLobby).toHaveBeenCalled();
  });
});

describe('ARCH — arena-mod-debate-waiting.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-mod-debate-poll.ts',
      './arena-lobby.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-mod-debate-waiting.ts'),
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
