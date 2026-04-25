/**
 * Integration tests — Seam #126
 * src/pages/groups.auditions.ts → groups.state
 *
 * Verifies that groups.auditions reads currentGroupId and callerRole
 * from groups.state and passes them correctly through its exported functions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── ARCH FILTER ───────────────────────────────────────────────────────────────
describe('ARCH: groups.auditions import lines', () => {
  it('imports currentGroupId and callerRole from groups.state', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.auditions.ts', 'utf-8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const stateImport = importLines.find(l => l.includes('groups.state'));
    expect(stateImport).toBeTruthy();
    expect(stateImport).toMatch(/currentGroupId/);
    expect(stateImport).toMatch(/callerRole/);
  });

  it('does NOT import any wall modules', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.auditions.ts', 'utf-8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const joined = importLines.join('\n');
    const wallPatterns = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const p of wallPatterns) {
      expect(joined, `wall import: ${p}`).not.toContain(p);
    }
  });
});

// ── MOCKS ─────────────────────────────────────────────────────────────────────

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}));

// Stable mock holders — reset per test
let mockSafeRpc: ReturnType<typeof vi.fn>;
let mockShowToast: ReturnType<typeof vi.fn>;
let mockRenderAuditionsList: ReturnType<typeof vi.fn>;

vi.mock('../../src/auth.ts', () => ({ safeRpc: (...a: unknown[]) => mockSafeRpc(...a) }));
vi.mock('../../src/config.ts', () => ({ showToast: (...a: unknown[]) => mockShowToast(...a) }));
vi.mock('../../src/contracts/rpc-schemas.ts', () => ({
  request_audition: {},
  get_pending_auditions: {},
}));
vi.mock('../../src/pages/groups.auditions.render.ts', () => ({
  RULE_LABELS: { allowed_by_leader: 'Allowed by leader', must_debate: 'Must debate' },
  renderAuditionsList: (...a: unknown[]) => mockRenderAuditionsList(...a),
}));

// ── DOM SETUP ─────────────────────────────────────────────────────────────────

function buildDom() {
  document.body.innerHTML = `
    <div id="audition-modal">
      <input id="audition-topic" />
      <select id="audition-category"><option value="">-</option></select>
      <select id="audition-ruleset"><option value="amplified">Amplified</option></select>
      <select id="audition-rounds"><option value="4">4</option></select>
      <div id="audition-rule-desc"></div>
      <div id="audition-debate-params" style="display:none"></div>
      <div id="audition-error" style="display:none"></div>
      <button id="audition-submit-btn">REQUEST AUDITION</button>
    </div>
    <div id="detail-auditions"></div>
  `;
}

// ── TESTS ─────────────────────────────────────────────────────────────────────

describe('groups.auditions → groups.state live binding', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    mockSafeRpc = vi.fn();
    mockShowToast = vi.fn();
    mockRenderAuditionsList = vi.fn().mockReturnValue('<div>auditions</div>');
    buildDom();
  });

  // TC1: handleAuditionAction('approve') uses currentGroupId from state
  it('TC1: approve action refreshes using currentGroupId from groups.state', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentGroupId('group-aaa');
    state.setCallerRole('leader');

    // Mock safeRpc: approve succeeds, then loadPendingAuditions succeeds
    mockSafeRpc
      .mockResolvedValueOnce({ data: JSON.stringify({}), error: null })   // approve_audition
      .mockResolvedValueOnce({ data: JSON.stringify([]), error: null });  // get_pending_auditions

    const mod = await import('../../src/pages/groups.auditions.ts');
    await mod.handleAuditionAction('aud-1', 'approve');

    // second safeRpc call is get_pending_auditions — check it was given group-aaa
    const secondCall = mockSafeRpc.mock.calls[1];
    expect(secondCall[1]).toMatchObject({ p_group_id: 'group-aaa' });
  });

  // TC2: handleAuditionAction('withdraw') uses currentAuditionGroupId, not currentGroupId
  it('TC2: withdraw action refreshes using currentAuditionGroupId, not currentGroupId', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentGroupId('group-leader-view');
    state.setCallerRole(null);

    // Open audition modal first to set currentAuditionGroupId
    const mod = await import('../../src/pages/groups.auditions.ts');
    mod.openAuditionModal({
      id: 'group-candidate-view',
      name: 'Test',
      audition_config: { rule: 'allowed_by_leader' },
    } as never);

    mockSafeRpc
      .mockResolvedValueOnce({ data: JSON.stringify({}), error: null })   // withdraw_audition
      .mockResolvedValueOnce({ data: JSON.stringify([]), error: null });  // get_pending_auditions

    await mod.handleAuditionAction('aud-2', 'withdraw');

    const secondCall = mockSafeRpc.mock.calls[1];
    expect(secondCall[1]).toMatchObject({ p_group_id: 'group-candidate-view' });
    // Confirm it did NOT use the leader's group
    expect(secondCall[1].p_group_id).not.toBe('group-leader-view');
  });

  // TC3: deny action uses currentGroupId, same as approve
  it('TC3: deny action refreshes using currentGroupId from groups.state', async () => {
    const state = await import('../../src/pages/groups.state.ts');
    state.setCurrentGroupId('group-bbb');
    state.setCallerRole('member');

    mockSafeRpc
      .mockResolvedValueOnce({ data: JSON.stringify({}), error: null })
      .mockResolvedValueOnce({ data: JSON.stringify([]), error: null });

    const mod = await import('../../src/pages/groups.auditions.ts');
    await mod.handleAuditionAction('aud-3', 'deny');

    const secondCall = mockSafeRpc.mock.calls[1];
    expect(secondCall[1]).toMatchObject({ p_group_id: 'group-bbb' });
  });

  // TC4: loadPendingAuditions passes myRole to renderAuditionsList
  it('TC4: loadPendingAuditions passes myRole to renderAuditionsList', async () => {
    mockSafeRpc.mockResolvedValueOnce({ data: JSON.stringify([{ id: 'a1' }]), error: null });

    const mod = await import('../../src/pages/groups.auditions.ts');
    await mod.loadPendingAuditions('group-ccc', 'leader');

    expect(mockRenderAuditionsList).toHaveBeenCalledWith(
      [{ id: 'a1' }],
      'leader'
    );
  });

  // TC5: openAuditionModal hides debate-params when rule is 'allowed_by_leader'
  it('TC5: openAuditionModal hides #audition-debate-params for allowed_by_leader rule', async () => {
    const mod = await import('../../src/pages/groups.auditions.ts');
    mod.openAuditionModal({
      id: 'group-ddd',
      name: 'Test',
      audition_config: { rule: 'allowed_by_leader' },
    } as never);

    const paramsEl = document.getElementById('audition-debate-params')!;
    expect(paramsEl.style.display).toBe('none');
  });

  // TC5b: openAuditionModal shows debate-params when rule requires debate
  it('TC5b: openAuditionModal shows #audition-debate-params for must_debate rule', async () => {
    const mod = await import('../../src/pages/groups.auditions.ts');
    mod.openAuditionModal({
      id: 'group-eee',
      name: 'Test',
      audition_config: { rule: 'must_debate' },
    } as never);

    const paramsEl = document.getElementById('audition-debate-params')!;
    expect(paramsEl.style.display).toBe('block');
  });

  // TC6: submitAuditionRequest calls loadPendingAuditions with currentAuditionGroupId after success
  it('TC6: submitAuditionRequest calls loadPendingAuditions(currentAuditionGroupId, null) on success', async () => {
    const mod = await import('../../src/pages/groups.auditions.ts');
    mod.openAuditionModal({
      id: 'group-fff',
      name: 'Test',
      audition_config: { rule: 'allowed_by_leader' },
    } as never);

    mockSafeRpc
      .mockResolvedValueOnce({ data: JSON.stringify({ ok: true }), error: null })  // request_audition
      .mockResolvedValueOnce({ data: JSON.stringify([]), error: null });             // get_pending_auditions

    await mod.submitAuditionRequest();

    // Second call should be get_pending_auditions for group-fff
    expect(mockSafeRpc).toHaveBeenCalledTimes(2);
    const secondCall = mockSafeRpc.mock.calls[1];
    expect(secondCall[0]).toBe('get_pending_auditions');
    expect(secondCall[1]).toMatchObject({ p_group_id: 'group-fff' });
  });

  // TC7: handleAuditionAction('accept') with debate_id navigates and does NOT call loadPendingAuditions
  it('TC7: accept with debate_id navigates to arena and skips loadPendingAuditions', async () => {
    const originalLocation = window.location;
    // jsdom lets us assign href
    delete (window as unknown as Record<string, unknown>).location;
    (window as unknown as Record<string, unknown>).location = { href: '' };

    mockSafeRpc.mockResolvedValueOnce({
      data: JSON.stringify({ debate_id: 'debate-xyz' }),
      error: null,
    });

    const mod = await import('../../src/pages/groups.auditions.ts');
    await mod.handleAuditionAction('aud-4', 'accept');

    expect((window.location as unknown as { href: string }).href).toContain('debate-xyz');
    // Only one safeRpc call — no subsequent loadPendingAuditions
    expect(mockSafeRpc).toHaveBeenCalledTimes(1);

    (window as unknown as Record<string, unknown>).location = originalLocation;
  });
});
