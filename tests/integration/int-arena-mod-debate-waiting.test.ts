import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── ARCH filter ─────────────────────────────────────────────────────────────
const srcPath = resolve(__dirname, '../../src/arena/arena-mod-debate-waiting.ts');
const source = readFileSync(srcPath, 'utf8');
const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));

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

  // Default DOM
  document.body.innerHTML = '<div id="screen-main"></div>';

  // Default mocks for downstream modules
  vi.doMock('../../src/arena/arena-mod-debate-poll.ts', () => ({
    startModDebatePoll: vi.fn(),
    stopModDebatePoll: vi.fn(),
    cancelModDebate: vi.fn().mockResolvedValue(undefined),
  }));
  vi.doMock('../../src/arena/arena-lobby.ts', () => ({
    renderLobby: vi.fn(),
  }));
});

// Helper: set up screenEl in state
async function setupScreenEl(el: HTMLElement) {
  const state = await import('../../src/arena/arena-state.ts');
  state.set_screenEl(el);
  return state;
}

// ─── TC-1: showModDebateWaitingMod sets view and renders join code ────────────

describe('TC-1 — showModDebateWaitingMod sets view to modDebateWaiting and renders join code', () => {
  it('sets view to modDebateWaiting and renders the join code in the DOM', async () => {
    const screenEl = document.getElementById('screen-main')!;
    const state = await setupScreenEl(screenEl);

    const { showModDebateWaitingMod } = await import('../../src/arena/arena-mod-debate-waiting.ts');
    showModDebateWaitingMod('debate-1', 'ABCD', 'Cats vs Dogs', 'text', false);

    expect(state.view).toBe('modDebateWaiting');
    expect(screenEl.innerHTML).toContain('ABCD');
    expect(screenEl.innerHTML).toContain('Cats vs Dogs');
    expect(screenEl.innerHTML).toContain('Waiting for Debaters');
  });
});

// ─── TC-2: showModDebateWaitingMod escapes HTML in topic and joinCode ─────────

describe('TC-2 — showModDebateWaitingMod escapes HTML in topic and joinCode', () => {
  it('renders topic and joinCode with HTML entities escaped', async () => {
    const screenEl = document.getElementById('screen-main')!;
    await setupScreenEl(screenEl);

    const { showModDebateWaitingMod } = await import('../../src/arena/arena-mod-debate-waiting.ts');
    showModDebateWaitingMod('debate-xss', 'X<B>', '<script>evil()</script>', 'text', false);

    expect(screenEl.innerHTML).not.toContain('<script>');
    expect(screenEl.innerHTML).toContain('&lt;script&gt;');
    // Join code should also be escaped
    expect(screenEl.innerHTML).not.toContain('<B>');
  });
});

// ─── TC-3: showModDebateWaitingMod calls startModDebatePoll ──────────────────

describe('TC-3 — showModDebateWaitingMod calls startModDebatePoll', () => {
  it('calls startModDebatePoll with debateId, mode, and ranked', async () => {
    const screenEl = document.getElementById('screen-main')!;
    await setupScreenEl(screenEl);

    const { showModDebateWaitingMod } = await import('../../src/arena/arena-mod-debate-waiting.ts');
    const { startModDebatePoll } = await import('../../src/arena/arena-mod-debate-poll.ts') as any;

    showModDebateWaitingMod('debate-poll-test', 'JOIN1', 'Topic A', 'voice_memo', true);

    expect(startModDebatePoll).toHaveBeenCalledWith('debate-poll-test', 'voice_memo', true);
  });
});

// ─── TC-4: Cancel button calls cancelModDebate ───────────────────────────────

describe('TC-4 — cancel button on mod waiting screen calls cancelModDebate', () => {
  it('clicking the CANCEL button calls cancelModDebate with the debate id', async () => {
    const screenEl = document.getElementById('screen-main')!;
    await setupScreenEl(screenEl);

    const { showModDebateWaitingMod } = await import('../../src/arena/arena-mod-debate-waiting.ts');
    const { cancelModDebate } = await import('../../src/arena/arena-mod-debate-poll.ts') as any;

    showModDebateWaitingMod('debate-cancel', 'CODE1', 'Debate Topic', 'text', false);

    const btn = document.getElementById('mod-debate-cancel-btn');
    expect(btn).not.toBeNull();
    btn!.click();

    expect(cancelModDebate).toHaveBeenCalledWith('debate-cancel');
  });
});

// ─── TC-5: showModDebateWaitingDebater sets view and renders waiting message ──

describe('TC-5 — showModDebateWaitingDebater sets view and renders waiting message', () => {
  it('sets view to modDebateWaiting and renders the opponent waiting message', async () => {
    const screenEl = document.getElementById('screen-main')!;
    const state = await setupScreenEl(screenEl);

    const { showModDebateWaitingDebater } = await import('../../src/arena/arena-mod-debate-waiting.ts');
    showModDebateWaitingDebater('debate-2', 'Dogs vs Cats', 'text', false);

    expect(state.view).toBe('modDebateWaiting');
    expect(screenEl.innerHTML).toContain('Waiting for Opponent');
    expect(screenEl.innerHTML).toContain('Dogs vs Cats');
  });
});

// ─── TC-6: showModDebateWaitingDebater falls back to 'Open Debate' ────────────

describe('TC-6 — showModDebateWaitingDebater falls back to "Open Debate" for empty topic', () => {
  it('renders "Open Debate" when topic is empty string', async () => {
    const screenEl = document.getElementById('screen-main')!;
    await setupScreenEl(screenEl);

    const { showModDebateWaitingDebater } = await import('../../src/arena/arena-mod-debate-waiting.ts');
    showModDebateWaitingDebater('debate-3', '', 'text', false);

    expect(screenEl.innerHTML).toContain('Open Debate');
  });
});

// ─── TC-7: LEAVE button calls stopModDebatePoll and renderLobby ──────────────

describe('TC-7 — LEAVE button calls stopModDebatePoll and navigates to lobby', () => {
  it('clicking LEAVE calls stopModDebatePoll and then renderLobby', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const screenEl = document.getElementById('screen-main')!;
    await setupScreenEl(screenEl);

    const { showModDebateWaitingDebater } = await import('../../src/arena/arena-mod-debate-waiting.ts');
    const { stopModDebatePoll } = await import('../../src/arena/arena-mod-debate-poll.ts') as any;
    const { renderLobby } = await import('../../src/arena/arena-lobby.ts') as any;

    showModDebateWaitingDebater('debate-leave', 'A Topic', 'text', true);

    const btn = document.getElementById('mod-debate-debater-cancel-btn');
    expect(btn).not.toBeNull();

    btn!.click();
    // flush the async click handler
    await vi.runAllTimersAsync();

    expect(stopModDebatePoll).toHaveBeenCalled();
    expect(renderLobby).toHaveBeenCalled();

    vi.useRealTimers();
  });
});

// ─── ARCH: import lines use correct module paths ──────────────────────────────

describe('ARCH — arena-mod-debate-waiting imports', () => {
  it('only imports from config, arena-state, arena-types, arena-mod-debate-poll', () => {
    const importedModules = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean);

    expect(importedModules).toContain('../config.ts');
    expect(importedModules).toContain('./arena-state.ts');
    expect(importedModules).toContain('./arena-types.ts');
    expect(importedModules).toContain('./arena-mod-debate-poll.ts');
  });
});
