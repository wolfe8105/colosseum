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

// DOM helpers — build the audition modal skeleton that the module expects
function buildAuditionDOM(): void {
  document.body.innerHTML = `
    <div id="audition-modal">
      <input id="audition-topic" type="text" />
      <select id="audition-category"><option value="">--</option><option value="tech">tech</option></select>
      <select id="audition-ruleset"><option value="amplified">amplified</option></select>
      <select id="audition-rounds"><option value="4">4</option></select>
      <div id="audition-rule-desc"></div>
      <div id="audition-debate-params" style="display:none"></div>
      <div id="audition-error" style="display:none"></div>
      <button id="audition-submit-btn">REQUEST AUDITION</button>
    </div>
    <div id="detail-auditions"></div>
  `;
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
  buildAuditionDOM();
});

// TC-01 (ARCH): groups.auditions.ts imports request_audition and get_pending_auditions from rpc-schemas
describe('TC-01 — ARCH: rpc-schemas imports present in groups.auditions.ts', () => {
  it('imports request_audition and get_pending_auditions from contracts/rpc-schemas', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/pages/groups.auditions.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const schemaImport = importLines.find(l => l.includes('rpc-schemas'));
    expect(schemaImport).toBeTruthy();
    expect(schemaImport).toContain('request_audition');
    expect(schemaImport).toContain('get_pending_auditions');
  });
});

// TC-02: submitAuditionRequest calls safeRpc('request_audition') and closes modal + shows toast on success
describe('TC-02 — submitAuditionRequest calls request_audition RPC and closes modal on success', () => {
  it('calls request_audition RPC and hides modal after success', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'request_audition') return Promise.resolve({ data: { success: true, audition_id: 'aud-1' }, error: null });
      if (name === 'get_pending_auditions') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    // Prime currentAuditionGroupId by opening the modal first
    const { openAuditionModal, submitAuditionRequest } = await import('../../src/pages/groups.auditions.ts');
    openAuditionModal({ id: 'grp-abc', audition_config: { rule: 'allowed_by_leader' } } as any);

    const modal = document.getElementById('audition-modal')!;
    expect(modal.classList.contains('open')).toBe(true);

    await submitAuditionRequest();

    const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
    const call = rpcCalls.find(([name]) => name === 'request_audition');
    expect(call).toBeTruthy();
    expect(call![1]).toMatchObject({ p_group_id: 'grp-abc' });

    expect(modal.classList.contains('open')).toBe(false);
  });
});

// TC-03: submitAuditionRequest shows error element when safeRpc returns an error
describe('TC-03 — submitAuditionRequest shows error on RPC failure', () => {
  it('renders error message and re-enables submit button on failure', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'request_audition')
        return Promise.resolve({ data: null, error: { message: 'Not eligible for audition' } });
      return Promise.resolve({ data: null, error: null });
    });

    const { openAuditionModal, submitAuditionRequest } = await import('../../src/pages/groups.auditions.ts');
    openAuditionModal({ id: 'grp-xyz', audition_config: { rule: 'allowed_by_leader' } } as any);

    await submitAuditionRequest();

    const errEl = document.getElementById('audition-error')!;
    expect(errEl.style.display).not.toBe('none');
    expect(errEl.textContent).toContain('Not eligible for audition');

    const btn = document.getElementById('audition-submit-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('REQUEST AUDITION');
  });
});

// TC-04: loadPendingAuditions calls get_pending_auditions RPC and populates #detail-auditions
describe('TC-04 — loadPendingAuditions calls get_pending_auditions and renders audition rows', () => {
  it('calls get_pending_auditions with p_group_id and renders returned auditions', async () => {
    const fakeAudition = {
      id: 'aud-1',
      candidate_user_id: 'user-111',
      candidate_username: 'debater_dan',
      candidate_display_name: 'Dan',
      rule: 'debate_to_join',
      status: 'pending',
      topic: 'Is coffee overrated?',
      category: 'lifestyle',
      ruleset: 'amplified',
      total_rounds: 4,
      debate_id: null,
      created_at: new Date().toISOString(),
    };

    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_pending_auditions') return Promise.resolve({ data: [fakeAudition], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { loadPendingAuditions } = await import('../../src/pages/groups.auditions.ts');
    await loadPendingAuditions('grp-001', 'leader');

    const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
    const auditCall = rpcCalls.find(([name]) => name === 'get_pending_auditions');
    expect(auditCall).toBeTruthy();
    expect(auditCall![1]).toMatchObject({ p_group_id: 'grp-001' });

    const container = document.getElementById('detail-auditions')!;
    expect(container.innerHTML).not.toContain('Loading auditions');
    // renderAuditionsList should produce something non-empty for 1 audition
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});

// TC-05: loadPendingAuditions shows error state when safeRpc throws
describe('TC-05 — loadPendingAuditions shows error state on RPC failure', () => {
  it('renders could-not-load message when get_pending_auditions errors', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_pending_auditions')
        return Promise.resolve({ data: null, error: { message: 'permission denied' } });
      return Promise.resolve({ data: null, error: null });
    });

    const { loadPendingAuditions } = await import('../../src/pages/groups.auditions.ts');
    await loadPendingAuditions('grp-002', null);

    const container = document.getElementById('detail-auditions')!;
    expect(container.innerHTML).toContain('Could not load auditions');
  });
});

// TC-06: handleAuditionAction('accept') calls accept_audition and redirects when debate_id present
describe('TC-06 — handleAuditionAction accept redirects to debate lobby when debate_id returned', () => {
  it('calls accept_audition and sets window.location.href when debate_id present', async () => {
    const originalLocation = window.location;
    // jsdom allows href assignment
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });

    mockRpc.mockImplementation((name: string) => {
      if (name === 'accept_audition')
        return Promise.resolve({ data: { debate_id: 'debate-999' }, error: null });
      if (name === 'get_pending_auditions') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { openAuditionModal, handleAuditionAction } = await import('../../src/pages/groups.auditions.ts');
    openAuditionModal({ id: 'grp-accept', audition_config: { rule: 'allowed_by_leader' } } as any);

    await handleAuditionAction('aud-accept-1', 'accept');

    const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
    const acceptCall = rpcCalls.find(([name]) => name === 'accept_audition');
    expect(acceptCall).toBeTruthy();
    expect(acceptCall![1]).toMatchObject({ p_audition_id: 'aud-accept-1' });

    expect(window.location.href).toContain('debate-999');

    // Restore
    Object.defineProperty(window, 'location', { writable: true, value: originalLocation });
  });
});

// TC-07: handleAuditionAction('withdraw') uses currentAuditionGroupId for refresh
describe('TC-07 — handleAuditionAction withdraw uses currentAuditionGroupId for refresh', () => {
  it('refreshes auditions using audition group id, not groups.state currentGroupId', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'withdraw_audition') return Promise.resolve({ data: null, error: null });
      if (name === 'get_pending_auditions') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { openAuditionModal, handleAuditionAction } = await import('../../src/pages/groups.auditions.ts');
    // Set currentAuditionGroupId to 'grp-withdraw'
    openAuditionModal({ id: 'grp-withdraw', audition_config: { rule: 'allowed_by_leader' } } as any);

    await handleAuditionAction('aud-withdraw-1', 'withdraw');

    const rpcCalls = mockRpc.mock.calls as [string, Record<string, unknown>][];
    const withdrawCall = rpcCalls.find(([name]) => name === 'withdraw_audition');
    expect(withdrawCall).toBeTruthy();

    // get_pending_auditions should be called with grp-withdraw
    const refreshCall = rpcCalls.find(
      ([name, params]) => name === 'get_pending_auditions' && (params as any)?.p_group_id === 'grp-withdraw'
    );
    expect(refreshCall).toBeTruthy();
  });
});
