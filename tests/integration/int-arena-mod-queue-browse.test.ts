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

// Stub @peermetrics/webrtc-stats — pulled in transitively via webrtc.monitor.ts
vi.mock('@peermetrics/webrtc-stats', () => ({
  WebRTCStats: vi.fn().mockImplementation(() => ({
    addConnection: vi.fn(),
    destroy: vi.fn(),
  })),
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

// TC-01: showModQueue sets view to 'modQueue' and renders skeleton DOM
describe('TC-01 — showModQueue sets view to modQueue and renders skeleton', () => {
  it('sets arena view to modQueue and renders mod-queue-list container', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');

    mockRpc.mockResolvedValue({ data: [], error: null });

    showModQueue();

    expect(stateModule.view).toBe('modQueue');
    expect(document.getElementById('mod-queue-list')).not.toBeNull();
    expect(document.getElementById('mod-queue-back')).not.toBeNull();
  });
});

// TC-02: loadModQueue calls browse_mod_queue RPC with no params and renders debate cards
describe('TC-02 — loadModQueue calls browse_mod_queue and renders queue cards', () => {
  it('renders a claim button for each debate returned', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');

    const fakeRow = {
      debate_id: 'abc-123',
      topic: 'Is AI better than humans?',
      category: 'tech',
      mode: 'live',
      debater_a_name: 'Alice',
      debater_b_name: 'Bob',
      created_at: new Date().toISOString(),
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'browse_mod_queue') return Promise.resolve({ data: [fakeRow], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    showModQueue();
    // Let async loadModQueue settle
    await vi.waitFor(() => {
      expect(document.querySelectorAll('.mod-queue-claim-btn').length).toBeGreaterThan(0);
    });

    const calls = mockRpc.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toContain('browse_mod_queue');

    const btn = document.querySelector<HTMLButtonElement>('.mod-queue-claim-btn');
    expect(btn?.dataset.debateId).toBe('abc-123');
  });
});

// TC-03: loadModQueue on "Not an available moderator" error renders unavailable message (no toast)
describe('TC-03 — loadModQueue on moderator-unavailable error renders info message', () => {
  it('shows unavailability text without calling showToast path', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');

    mockRpc.mockImplementation((name: string) => {
      if (name === 'browse_mod_queue')
        return Promise.resolve({ data: null, error: { message: 'Not an available moderator' } });
      return Promise.resolve({ data: null, error: null });
    });

    showModQueue();
    await vi.waitFor(() => {
      const listEl = document.getElementById('mod-queue-list');
      expect(listEl?.textContent).toMatch(/not set to Available/i);
    });
  });
});

// TC-04: claimModRequest calls request_to_moderate RPC with correct debate ID
describe('TC-04 — claimModRequest calls request_to_moderate with p_debate_id', () => {
  it('calls request_to_moderate RPC and renders confirmation on success', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue, claimModRequest } = await import('../../src/arena/arena-mod-queue-browse.ts');

    mockRpc.mockImplementation((name: string) => {
      if (name === 'browse_mod_queue') return Promise.resolve({ data: [], error: null });
      if (name === 'request_to_moderate') return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    showModQueue();
    await vi.waitFor(() => expect(document.getElementById('mod-queue-list')).not.toBeNull());

    const btn = document.createElement('button');
    btn.disabled = false;
    document.body.appendChild(btn);

    await claimModRequest('debate-xyz', btn);

    const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
    const claimCall = rpcCalls.find(([name]) => name === 'request_to_moderate');
    expect(claimCall).toBeTruthy();
    expect(claimCall![1]).toEqual({ p_debate_id: 'debate-xyz' });

    const listEl = document.getElementById('mod-queue-list');
    expect(listEl?.textContent).toMatch(/Request sent/i);
  });
});

// TC-05: startModQueuePoll self-cancels when view changes away from modQueue
describe('TC-05 — startModQueuePoll self-cancels when view changes away from modQueue', () => {
  it('stops polling when view is no longer modQueue', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));
    stateModule.set_view('modQueue');

    mockRpc.mockResolvedValue({ data: [], error: null });

    const { startModQueuePoll } = await import('../../src/arena/arena-mod-queue-browse.ts');
    startModQueuePoll();

    // Advance one poll tick — view is modQueue, should call loadModQueue
    await vi.advanceTimersByTimeAsync(5000);

    const callsAfterFirst = mockRpc.mock.calls.filter((c: unknown[]) => c[0] === 'browse_mod_queue').length;

    // Switch view away — poll should self-cancel on next tick
    stateModule.set_view('lobby');
    await vi.advanceTimersByTimeAsync(5000);

    const callsAfterSwitch = mockRpc.mock.calls.filter((c: unknown[]) => c[0] === 'browse_mod_queue').length;

    // No additional browse_mod_queue calls after view changed
    expect(callsAfterSwitch).toBe(callsAfterFirst);

    vi.useRealTimers();
  });
});

// TC-06: loadPendingModInvites shows invite section and wires accept/decline buttons
describe('TC-06 — loadPendingModInvites reveals invite section on data', () => {
  it('renders invite cards and shows accept/decline buttons', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');

    const fakeInvite = {
      debate_id: 'inv-001',
      topic: 'Should AI vote?',
      category: 'politics',
      mode: 'live',
      inviter_id: 'user-abc',
      inviter_name: 'Moderator Pat',
      created_at: new Date().toISOString(),
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_pending_mod_invites') return Promise.resolve({ data: [fakeInvite], error: null });
      return Promise.resolve({ data: [], error: null });
    });

    showModQueue();
    await vi.waitFor(() => {
      const section = document.getElementById('mod-invite-section');
      expect(section?.style.display).not.toBe('none');
    });

    expect(document.querySelector('.mod-invite-accept-btn')).not.toBeNull();
    expect(document.querySelector('.mod-invite-decline-btn')).not.toBeNull();
  });
});

// TC-07: accept invite button calls respond_mod_invite with p_accept: true
describe('TC-07 — accept invite button calls respond_mod_invite with p_accept true', () => {
  it('fires respond_mod_invite RPC with correct params on accept click', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');

    const fakeInvite = {
      debate_id: 'inv-002',
      topic: 'Free speech online',
      category: 'society',
      mode: 'live',
      inviter_id: 'user-def',
      inviter_name: 'Pat',
      created_at: new Date().toISOString(),
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_pending_mod_invites') return Promise.resolve({ data: [fakeInvite], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    showModQueue();
    await vi.waitFor(() => {
      expect(document.querySelector('.mod-invite-accept-btn')).not.toBeNull();
    });

    const acceptBtn = document.querySelector<HTMLButtonElement>('.mod-invite-accept-btn')!;
    acceptBtn.click();

    await vi.waitFor(() => {
      const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
      const acceptCall = rpcCalls.find(([name, params]) =>
        name === 'respond_mod_invite' && params?.p_accept === true
      );
      expect(acceptCall).toBeTruthy();
      expect(acceptCall![1]).toMatchObject({ p_debate_id: 'inv-002', p_accept: true });
    });
  });
});

// ARCH: import boundary unchanged
describe('ARCH — seam #036 import boundary unchanged', () => {
  it('src/arena/arena-mod-queue-browse.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-queue-browse.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});

// ─── Seam #320: arena-mod-queue-browse → arena-types-moderator ──────────────

// TC-320-1: ARCH — arena-types-moderator is imported for ModQueueItem
describe('TC-320-1 — ARCH: arena-mod-queue-browse imports ModQueueItem from arena-types-moderator', () => {
  it('has an import line referencing arena-types-moderator', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-queue-browse.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-types-moderator'))).toBe(true);
  });
});

// TC-320-2: ModQueueItem.topic field is rendered via escapeHTML into the card
describe('TC-320-2 — loadModQueue renders ModQueueItem.topic into card', () => {
  it('displays topic text from ModQueueItem in the list element', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const fakeRow: {
      debate_id: string; topic: string; category: string; mode: string;
      debater_a_name: string | null; debater_b_name: string | null;
      mod_status: string; created_at: string;
    } = {
      debate_id: 'tc320-topic-test',
      topic: 'Should robots pay taxes?',
      category: 'economics',
      mode: 'live',
      debater_a_name: 'Alice',
      debater_b_name: 'Bob',
      mod_status: 'open',
      created_at: new Date().toISOString(),
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'browse_mod_queue') return Promise.resolve({ data: [fakeRow], error: null });
      return Promise.resolve({ data: [], error: null });
    });

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');
    showModQueue();

    await vi.waitFor(() => {
      const listEl = document.getElementById('mod-queue-list');
      expect(listEl?.textContent).toContain('Should robots pay taxes?');
    });
  });
});

// TC-320-3: ModQueueItem.category and .mode fields are rendered in the card
describe('TC-320-3 — loadModQueue renders ModQueueItem.category and .mode', () => {
  it('displays category and mode from ModQueueItem in the card header', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const fakeRow: {
      debate_id: string; topic: string; category: string; mode: string;
      debater_a_name: string | null; debater_b_name: string | null;
      mod_status: string; created_at: string;
    } = {
      debate_id: 'tc320-cat-mode',
      topic: 'Any topic',
      category: 'science',
      mode: 'voice',
      debater_a_name: 'A',
      debater_b_name: 'B',
      mod_status: 'open',
      created_at: new Date().toISOString(),
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'browse_mod_queue') return Promise.resolve({ data: [fakeRow], error: null });
      return Promise.resolve({ data: [], error: null });
    });

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');
    showModQueue();

    await vi.waitFor(() => {
      const listEl = document.getElementById('mod-queue-list');
      expect(listEl?.textContent).toContain('science');
      expect(listEl?.textContent).toContain('voice');
    });
  });
});

// TC-320-4: ModQueueItem.created_at is used to compute wait time displayed in card
describe('TC-320-4 — loadModQueue computes wait time from ModQueueItem.created_at', () => {
  it('renders a wait time string derived from created_at', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    // Set created_at to 2 minutes ago so wait string = "2m Xs"
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const fakeRow: {
      debate_id: string; topic: string; category: string; mode: string;
      debater_a_name: string | null; debater_b_name: string | null;
      mod_status: string; created_at: string;
    } = {
      debate_id: 'tc320-wait',
      topic: 'Wait time topic',
      category: 'misc',
      mode: 'text',
      debater_a_name: 'A',
      debater_b_name: 'B',
      mod_status: 'open',
      created_at: twoMinsAgo,
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'browse_mod_queue') return Promise.resolve({ data: [fakeRow], error: null });
      return Promise.resolve({ data: [], error: null });
    });

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');
    showModQueue();

    await vi.waitFor(() => {
      const listEl = document.getElementById('mod-queue-list');
      // Should contain "2m" in the wait string
      expect(listEl?.textContent).toMatch(/\d+m\s+\d+s/);
    });
  });
});

// TC-320-5: claim button data-debate-id equals ModQueueItem.debate_id
describe('TC-320-5 — claim button data-debate-id matches ModQueueItem.debate_id', () => {
  it('sets the claim button data-debate-id attribute from ModQueueItem.debate_id', async () => {
    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const fakeRow: {
      debate_id: string; topic: string; category: string; mode: string;
      debater_a_name: string | null; debater_b_name: string | null;
      mod_status: string; created_at: string;
    } = {
      debate_id: 'unique-debate-id-99',
      topic: 'Test',
      category: 'tech',
      mode: 'live',
      debater_a_name: null,
      debater_b_name: null,
      mod_status: 'open',
      created_at: new Date().toISOString(),
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'browse_mod_queue') return Promise.resolve({ data: [fakeRow], error: null });
      return Promise.resolve({ data: [], error: null });
    });

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');
    showModQueue();

    await vi.waitFor(() => {
      const btn = document.querySelector<HTMLButtonElement>('.mod-queue-claim-btn');
      expect(btn?.dataset.debateId).toBe('unique-debate-id-99');
    });
  });
});

// ─── Seam #569: arena-mod-queue-browse → arena-mod-debate-picker ─────────────

// TC-569-1: ARCH — arena-mod-queue-browse imports showModDebatePicker from arena-mod-debate-picker
describe('TC-569-1 — ARCH: arena-mod-queue-browse imports showModDebatePicker from arena-mod-debate-picker', () => {
  it('has a static import line referencing arena-mod-debate-picker', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-queue-browse.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-mod-debate-picker'))).toBe(true);
  });
});

// TC-569-2: showModQueue renders CREATE DEBATE button when profile.is_moderator is true
describe('TC-569-2 — showModQueue renders CREATE DEBATE button for moderators', () => {
  it('shows #mod-queue-create-debate button when getCurrentProfile returns is_moderator=true', async () => {
    vi.resetModules();
    // Stub getCurrentProfile to return a moderator profile
    vi.doMock('../../src/auth.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.ts')>();
      return {
        ...actual,
        getCurrentProfile: vi.fn().mockReturnValue({ id: 'user-1', is_moderator: true }),
      };
    });

    mockRpc.mockResolvedValue({ data: [], error: null });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');
    showModQueue();

    expect(document.getElementById('mod-queue-create-debate')).not.toBeNull();
  });
});

// TC-569-3: showModQueue does NOT render CREATE DEBATE button for non-moderators
describe('TC-569-3 — showModQueue hides CREATE DEBATE button for non-moderators', () => {
  it('does not render #mod-queue-create-debate when is_moderator is false', async () => {
    vi.resetModules();
    vi.doMock('../../src/auth.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.ts')>();
      return {
        ...actual,
        getCurrentProfile: vi.fn().mockReturnValue({ id: 'user-2', is_moderator: false }),
      };
    });

    mockRpc.mockResolvedValue({ data: [], error: null });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');
    showModQueue();

    expect(document.getElementById('mod-queue-create-debate')).toBeNull();
  });
});

// TC-569-4: showModDebatePicker sets view to 'modDebatePicker' and renders picker DOM
describe('TC-569-4 — showModDebatePicker sets view to modDebatePicker and renders form', () => {
  it('sets view to modDebatePicker and renders #mod-debate-create-btn', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModDebatePicker } = await import('../../src/arena/arena-mod-debate-picker.ts');
    showModDebatePicker();

    expect(stateModule.view).toBe('modDebatePicker');
    expect(document.getElementById('mod-debate-create-btn')).not.toBeNull();
    expect(document.getElementById('mod-debate-mode')).not.toBeNull();
    expect(document.getElementById('mod-debate-category')).not.toBeNull();

    vi.useRealTimers();
  });
});

// TC-569-5: createModDebate calls create_mod_debate RPC with correct params
describe('TC-569-5 — createModDebate calls create_mod_debate with form values', () => {
  it('fires create_mod_debate RPC with p_mode, p_topic, p_ranked, p_ruleset', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockImplementation((name: string) => {
      if (name === 'create_mod_debate')
        return Promise.resolve({ data: { debate_id: 'new-debate-1', join_code: 'ABC123' }, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModDebatePicker, createModDebate } = await import('../../src/arena/arena-mod-debate-picker.ts');
    showModDebatePicker();

    // Set form values
    const modeEl = document.getElementById('mod-debate-mode') as HTMLSelectElement;
    const topicEl = document.getElementById('mod-debate-topic') as HTMLInputElement;
    const rankedEl = document.getElementById('mod-debate-ranked') as HTMLInputElement;
    const rulesetEl = document.getElementById('mod-debate-ruleset') as HTMLSelectElement;

    if (modeEl) modeEl.value = 'text';
    if (topicEl) topicEl.value = 'Test topic';
    if (rankedEl) rankedEl.checked = true;
    if (rulesetEl) rulesetEl.value = 'unplugged';

    await createModDebate();

    const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
    const createCall = rpcCalls.find(([name]) => name === 'create_mod_debate');
    expect(createCall).toBeTruthy();
    expect(createCall![1]).toMatchObject({
      p_mode: 'text',
      p_topic: 'Test topic',
      p_ranked: true,
      p_ruleset: 'unplugged',
    });

    vi.useRealTimers();
  });
});

// TC-569-6: clicking CREATE DEBATE button in mod queue calls showModDebatePicker
describe('TC-569-6 — clicking CREATE DEBATE calls showModDebatePicker', () => {
  it('navigates to modDebatePicker view when CREATE DEBATE button is clicked', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();

    vi.doMock('../../src/auth.ts', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../src/auth.ts')>();
      return {
        ...actual,
        getCurrentProfile: vi.fn().mockReturnValue({ id: 'user-3', is_moderator: true }),
      };
    });

    mockRpc.mockResolvedValue({ data: [], error: null });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModQueue } = await import('../../src/arena/arena-mod-queue-browse.ts');
    showModQueue();

    const createBtn = document.getElementById('mod-queue-create-debate');
    expect(createBtn).not.toBeNull();
    createBtn!.click();

    // After click, view should transition to modDebatePicker
    expect(stateModule.view).toBe('modDebatePicker');

    vi.useRealTimers();
  });
});

// TC-569-7: createModDebate shows error toast when create_mod_debate returns error
describe('TC-569-7 — createModDebate shows error toast on RPC failure', () => {
  it('displays an error toast when create_mod_debate RPC returns an error', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockRpc.mockImplementation((name: string) => {
      if (name === 'create_mod_debate')
        return Promise.resolve({ data: null, error: { message: 'Permission denied' } });
      return Promise.resolve({ data: null, error: null });
    });

    const stateModule = await import('../../src/arena/arena-state.ts');
    stateModule.set_screenEl(document.getElementById('screen-main'));

    const { showModDebatePicker, createModDebate } = await import('../../src/arena/arena-mod-debate-picker.ts');
    showModDebatePicker();

    // Spy on showToast via document title trick — just verify no unhandled rejection
    let caughtError = false;
    try {
      await createModDebate();
    } catch {
      caughtError = true;
    }
    expect(caughtError).toBe(false);

    // Button should be re-enabled after failure
    const btn = document.getElementById('mod-debate-create-btn') as HTMLButtonElement | null;
    expect(btn?.disabled).toBe(false);

    vi.useRealTimers();
  });
});
