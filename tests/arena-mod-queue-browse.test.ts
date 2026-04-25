import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [], error: null }));
const mockGetCurrentProfile = vi.hoisted(() => vi.fn().mockReturnValue(null));
const mockShowToast = vi.hoisted(() => vi.fn());
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));

const mockView = vi.hoisted(() => ({ value: 'modQueue' as string }));
const mockScreenEl = vi.hoisted(() => ({ value: null as HTMLElement | null }));
const mockModQueuePollTimer = vi.hoisted(() => ({ value: null as ReturnType<typeof setInterval> | null }));
const mockSet_view = vi.hoisted(() => vi.fn());
const mockSet_modQueuePollTimer = vi.hoisted(() => vi.fn((v: ReturnType<typeof setInterval> | null) => { mockModQueuePollTimer.value = v; }));

const mockShowModDebatePicker = vi.hoisted(() => vi.fn());
const mockRenderLobby = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get view() { return mockView.value; },
  get screenEl() { return mockScreenEl.value; },
  get modQueuePollTimer() { return mockModQueuePollTimer.value; },
  set_view: mockSet_view,
  set_modQueuePollTimer: mockSet_modQueuePollTimer,
}));

vi.mock('../src/arena/arena-mod-debate-picker.ts', () => ({
  showModDebatePicker: mockShowModDebatePicker,
}));

vi.mock('../src/arena/arena-lobby.ts', () => ({
  renderLobby: mockRenderLobby,
}));

import { showModQueue, loadModQueue, claimModRequest, startModQueuePoll, stopModQueuePoll, loadPendingModInvites } from '../src/arena/arena-mod-queue-browse.ts';

const fakeRow = {
  debate_id: 'deb-1',
  topic: 'Climate',
  category: 'Politics',
  mode: 'text',
  debater_a_name: 'Alice',
  debater_b_name: 'Bob',
  created_at: new Date().toISOString(),
};

describe('TC1 — showModQueue renders UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="app"></div>';
    mockScreenEl.value = document.getElementById('app');
    mockGetCurrentProfile.mockReturnValue({ id: 'mod-1', is_moderator: false });
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
  });

  it('calls set_view with modQueue', () => {
    showModQueue();
    expect(mockSet_view).toHaveBeenCalledWith('modQueue');
  });

  it('renders back button', () => {
    showModQueue();
    expect(document.getElementById('mod-queue-back')).not.toBeNull();
  });

  it('does not render create-debate button for non-moderators', () => {
    showModQueue();
    expect(document.getElementById('mod-queue-create-debate')).toBeNull();
  });

  it('renders create-debate button for moderators', () => {
    mockGetCurrentProfile.mockReturnValue({ id: 'mod-1', is_moderator: true });
    showModQueue();
    expect(document.getElementById('mod-queue-create-debate')).not.toBeNull();
  });

  it('back button calls renderLobby', async () => {
    showModQueue();
    document.getElementById('mod-queue-back')?.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockRenderLobby).toHaveBeenCalled();
  });

  it('create-debate button calls showModDebatePicker', () => {
    mockGetCurrentProfile.mockReturnValue({ id: 'mod-1', is_moderator: true });
    showModQueue();
    document.getElementById('mod-queue-create-debate')?.click();
    expect(mockShowModDebatePicker).toHaveBeenCalled();
  });
});

describe('TC2 — loadModQueue populates list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="mod-queue-list"></div>';
    mockSafeRpc.mockResolvedValue({ data: [fakeRow], error: null });
  });

  it('renders claim button for each row', async () => {
    await loadModQueue();
    expect(document.querySelectorAll('.mod-queue-claim-btn').length).toBe(1);
  });

  it('renders empty message when no rows', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadModQueue();
    expect(document.getElementById('mod-queue-list')?.textContent).toContain('No debates waiting');
  });

  it('renders "Not an available moderator" message on specific error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Not an available moderator' } });
    await loadModQueue();
    expect(document.getElementById('mod-queue-list')?.textContent).toContain('not set to Available');
  });

  it('calls showToast on other errors', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Unknown error' } });
    await loadModQueue();
    expect(mockShowToast).toHaveBeenCalled();
  });
});

describe('TC3 — claimModRequest calls RPC and updates UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="mod-queue-list"></div>';
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
  });

  it('calls safeRpc request_to_moderate', async () => {
    const btn = document.createElement('button');
    await claimModRequest('deb-1', btn);
    expect(mockSafeRpc).toHaveBeenCalledWith('request_to_moderate', { p_debate_id: 'deb-1' });
  });

  it('skips when button is already disabled', async () => {
    const btn = document.createElement('button');
    btn.disabled = true;
    await claimModRequest('deb-1', btn);
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  it('shows toast and reloads on error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: new Error('taken') });
    const btn = document.createElement('button');
    await claimModRequest('deb-1', btn);
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Another mod'));
  });

  it('renders confirmation message on success', async () => {
    const btn = document.createElement('button');
    await claimModRequest('deb-1', btn);
    expect(document.getElementById('mod-queue-list')?.textContent).toContain('Request sent');
  });
});

describe('TC4 — startModQueuePoll / stopModQueuePoll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockModQueuePollTimer.value = null;
    mockView.value = 'modQueue';
    document.body.innerHTML = '<div id="mod-queue-list"></div>';
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stopModQueuePoll does nothing when timer is null', () => {
    stopModQueuePoll();
    expect(mockSet_modQueuePollTimer).not.toHaveBeenCalled();
  });

  it('stopModQueuePoll clears timer when active', () => {
    mockModQueuePollTimer.value = setInterval(() => {}, 99999);
    stopModQueuePoll();
    expect(mockSet_modQueuePollTimer).toHaveBeenCalledWith(null);
  });

  it('startModQueuePoll calls set_modQueuePollTimer', () => {
    startModQueuePoll();
    expect(mockSet_modQueuePollTimer).toHaveBeenCalledWith(expect.any(Object));
  });

  it('stops polling when view leaves modQueue', async () => {
    mockView.value = 'lobby';
    startModQueuePoll();
    await vi.advanceTimersByTimeAsync(5001);
    expect(mockSet_modQueuePollTimer).toHaveBeenCalledWith(null);
  });
});

describe('TC5 — loadPendingModInvites shows/hides section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="mod-invite-section" style="display:none;">
        <div id="mod-invite-list"></div>
      </div>
    `;
  });

  it('hides section when no invites', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadPendingModInvites();
    expect(document.getElementById('mod-invite-section')?.style.display).toBe('none');
  });

  it('shows section when invites exist', async () => {
    mockSafeRpc.mockResolvedValue({
      data: [{ debate_id: 'deb-1', topic: 'AI', category: 'tech', mode: 'text', inviter_id: 'u-1', inviter_name: 'Dave', created_at: new Date().toISOString() }],
      error: null,
    });
    await loadPendingModInvites();
    expect(document.getElementById('mod-invite-section')?.style.display).toBe('block');
  });

  it('renders accept button per invite', async () => {
    mockSafeRpc.mockResolvedValue({
      data: [{ debate_id: 'deb-2', topic: 'Sports', category: 'sports', mode: 'live', inviter_id: 'u-2', inviter_name: 'Eve', created_at: new Date().toISOString() }],
      error: null,
    });
    await loadPendingModInvites();
    expect(document.querySelectorAll('.mod-invite-accept-btn').length).toBe(1);
  });
});

describe('ARCH — arena-mod-queue-browse.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types-moderator.ts',
      './arena-mod-debate-picker.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-mod-queue-browse.ts'),
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
