import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));

const mockView = vi.hoisted(() => ({ value: 'room' as string }));
const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockModStatusPollTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockModCountdownTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockModRequestModalShown = vi.hoisted(() => ({ value: false }));

const mockSet_modStatusPollTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockModStatusPollTimer.value = v; }));
const mockSet_modCountdownTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockModCountdownTimer.value = v; }));
const mockSet_modRequestModalShown = vi.hoisted(() => vi.fn((v: boolean) => { mockModRequestModalShown.value = v; }));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get view() { return mockView.value; },
  get currentDebate() { return mockCurrentDebate.value; },
  get modStatusPollTimer() { return mockModStatusPollTimer.value; },
  get modCountdownTimer() { return mockModCountdownTimer.value; },
  get modRequestModalShown() { return mockModRequestModalShown.value; },
  set_modStatusPollTimer: mockSet_modStatusPollTimer,
  set_modCountdownTimer: mockSet_modCountdownTimer,
  set_modRequestModalShown: mockSet_modRequestModalShown,
}));

import { startModStatusPoll, stopModStatusPoll, showModRequestModal, handleModResponse } from '../src/arena/arena-mod-queue-status.ts';

describe('TC1 — stopModStatusPoll clears timers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockModStatusPollTimer.value = null;
    mockModCountdownTimer.value = null;
  });

  it('does nothing when both timers are null', () => {
    stopModStatusPoll();
    expect(mockSet_modStatusPollTimer).not.toHaveBeenCalled();
    expect(mockSet_modCountdownTimer).not.toHaveBeenCalled();
  });

  it('clears modStatusPollTimer when active', () => {
    mockModStatusPollTimer.value = setInterval(() => {}, 99999);
    stopModStatusPoll();
    expect(mockSet_modStatusPollTimer).toHaveBeenCalledWith(null);
  });

  it('clears modCountdownTimer when active', () => {
    mockModCountdownTimer.value = setInterval(() => {}, 99999);
    stopModStatusPoll();
    expect(mockSet_modCountdownTimer).toHaveBeenCalledWith(null);
  });
});

describe('TC2 — startModStatusPoll sets interval and resets modal flag', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockView.value = 'room';
    mockModStatusPollTimer.value = null;
    mockModCountdownTimer.value = null;
    mockModRequestModalShown.value = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls set_modRequestModalShown(false)', () => {
    startModStatusPoll('d-1');
    expect(mockSet_modRequestModalShown).toHaveBeenCalledWith(false);
  });

  it('calls set_modStatusPollTimer with an interval', () => {
    startModStatusPoll('d-1');
    expect(mockSet_modStatusPollTimer).toHaveBeenCalledWith(expect.any(Object));
  });

  it('stops polling when view leaves room', async () => {
    mockView.value = 'lobby';
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    startModStatusPoll('d-1');
    await vi.advanceTimersByTimeAsync(4001);
    expect(mockSet_modStatusPollTimer).toHaveBeenCalledWith(null);
  });

  it('calls safeRpc get_debate_mod_status on tick', async () => {
    mockSafeRpc.mockResolvedValue({ data: { mod_status: 'waiting' }, error: null });
    startModStatusPoll('d-1');
    await vi.advanceTimersByTimeAsync(4001);
    expect(mockSafeRpc).toHaveBeenCalledWith('get_debate_mod_status', { p_debate_id: 'd-1' });
  });

  it('calls showModRequestModal when status is requested', async () => {
    mockModRequestModalShown.value = false;
    mockSafeRpc.mockResolvedValue({
      data: { mod_status: 'requested', moderator_display_name: 'Alice', moderator_id: 'mod-1' },
      error: null,
    });
    startModStatusPoll('d-1');
    await vi.advanceTimersByTimeAsync(4001);
    expect(document.getElementById('mod-request-modal')).not.toBeNull();
  });
});

describe('TC3 — showModRequestModal renders overlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    document.body.innerHTML = '';
    mockModCountdownTimer.value = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.getElementById('mod-request-modal')?.remove();
  });

  it('appends mod-request-modal to body', () => {
    showModRequestModal('Alice', 'mod-1', 'deb-1');
    expect(document.getElementById('mod-request-modal')).not.toBeNull();
  });

  it('renders accept and decline buttons', () => {
    showModRequestModal('Alice', 'mod-1', 'deb-1');
    expect(document.getElementById('mod-req-accept')).not.toBeNull();
    expect(document.getElementById('mod-req-decline')).not.toBeNull();
  });

  it('calls set_modRequestModalShown(true)', () => {
    showModRequestModal('Alice', 'mod-1', 'deb-1');
    expect(mockSet_modRequestModalShown).toHaveBeenCalledWith(true);
  });

  it('calls set_modCountdownTimer with interval', () => {
    showModRequestModal('Alice', 'mod-1', 'deb-1');
    expect(mockSet_modCountdownTimer).toHaveBeenCalledWith(expect.any(Object));
  });
});

describe('TC4 — handleModResponse calls RPC and removes modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="mod-request-modal">
        <button id="mod-req-accept">ACCEPT</button>
        <button id="mod-req-decline">DECLINE</button>
      </div>
    `;
    mockModStatusPollTimer.value = null;
    mockModCountdownTimer.value = null;
    mockCurrentDebate.value = { moderatorId: null, moderatorName: null };
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
  });

  it('calls safeRpc respond_to_mod_request', async () => {
    const modal = document.getElementById('mod-request-modal')!;
    await handleModResponse(true, 'deb-1', modal, 'mod-1', 'Alice');
    expect(mockSafeRpc).toHaveBeenCalledWith('respond_to_mod_request', { p_debate_id: 'deb-1', p_accept: true });
  });

  it('removes modal on success', async () => {
    const modal = document.getElementById('mod-request-modal')!;
    await handleModResponse(true, 'deb-1', modal, 'mod-1', 'Alice');
    expect(document.getElementById('mod-request-modal')).toBeNull();
  });

  it('shows toast on accept', async () => {
    const modal = document.getElementById('mod-request-modal')!;
    await handleModResponse(true, 'deb-1', modal, 'mod-1', 'Alice');
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Moderator accepted'));
  });

  it('removes modal on decline', async () => {
    const modal = document.getElementById('mod-request-modal')!;
    await handleModResponse(false, 'deb-1', modal, 'mod-1', 'Alice');
    expect(document.getElementById('mod-request-modal')).toBeNull();
  });

  it('removes modal on RPC error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: new Error('fail') });
    const modal = document.getElementById('mod-request-modal')!;
    await handleModResponse(true, 'deb-1', modal, 'mod-1', 'Alice');
    expect(document.getElementById('mod-request-modal')).toBeNull();
  });
});

describe('ARCH — arena-mod-queue-status.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types-moderator.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-mod-queue-status.ts'),
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
