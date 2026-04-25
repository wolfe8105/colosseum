// ============================================================
// GK F-18 — GROUP AUDITIONS TESTS
// Tests for src/pages/groups.auditions.ts
//
// IMPORTS (from source):
//   safeRpc                              from '../auth.ts'
//   request_audition, get_pending_auditions  from '../contracts/rpc-schemas.ts'
//   showToast                            from '../config.ts'
//   currentGroupId, callerRole           from './groups.state.ts'
//   GroupDetail (type only)              from './groups.types.ts'
//   RULE_LABELS, renderAuditionsList     from './groups.auditions.render.ts'
//   PendingAudition (type only)          from './groups.auditions.render.ts'
//
// CLASSIFICATION:
//   openAuditionModal()       DOM event wiring / module state mutation
//   closeAuditionModal()      DOM event wiring
//   submitAuditionRequest()   Multi-step orchestration — RPC + DOM
//   loadPendingAuditions()    RPC wrapper + DOM render
//   handleAuditionAction()    Multi-step orchestration — RPC + DOM
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── vi.hoisted: all mock factories must be hoisted to avoid TDZ ──

const mockSafeRpc            = vi.hoisted(() => vi.fn());
const mockShowToast          = vi.hoisted(() => vi.fn());
const mockRenderAuditionsList = vi.hoisted(() => vi.fn(() => '<div class="auditions-list"></div>'));
const mockCurrentGroupId     = vi.hoisted(() => ({ value: null as string | null }));
const mockCallerRole         = vi.hoisted(() => ({ value: null as string | null }));
const mockRuleLabels         = vi.hoisted(() => ({
  allowed_by_leader:  'Leader approval — no debate required',
  debate_leader_any:  'Complete a debate against the group leader',
  debate_member_any:  'Complete a debate against any group member',
  debate_leader_win:  'Win a debate against the group leader',
  debate_member_win:  'Win a debate against any group member',
} as Record<string, string>));

// ── vi.mock: must appear before any import of the file under test ──

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  onChange: vi.fn(),
  ready: Promise.resolve(),
  getCurrentUser: vi.fn(),
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  request_audition:      {},
  get_pending_auditions: {},
}));

vi.mock('../src/config.ts', () => ({
  showToast:  mockShowToast,
  escapeHTML: (s: string) => s,
  FEATURES:   {},
}));

vi.mock('../src/pages/groups.state.ts', () => ({
  get currentGroupId() { return mockCurrentGroupId.value; },
  get callerRole()     { return mockCallerRole.value; },
  setCurrentGroupId: vi.fn(),
  setCallerRole:     vi.fn(),
}));

vi.mock('../src/pages/groups.types.ts', () => ({}));

vi.mock('../src/pages/groups.auditions.render.ts', () => ({
  RULE_LABELS:          mockRuleLabels,
  renderAuditionsList:  mockRenderAuditionsList,
}));

// ── Import file under test AFTER mocks ──

import {
  openAuditionModal,
  closeAuditionModal,
  submitAuditionRequest,
  loadPendingAuditions,
  handleAuditionAction,
} from '../src/pages/groups.auditions.ts';

// ── DOM helpers ──

function buildDOM() {
  document.body.innerHTML = `
    <div id="audition-modal">
      <div id="audition-rule-desc"></div>
      <div id="audition-debate-params" style="display:none"></div>
      <input  id="audition-topic"    type="text"   value="existing" />
      <select id="audition-category">
        <option value="">--</option>
        <option value="sports">Sports</option>
      </select>
      <select id="audition-ruleset">
        <option value="amplified">Amplified</option>
        <option value="strict">Strict</option>
      </select>
      <select id="audition-rounds">
        <option value="2">2</option>
        <option value="4">4</option>
        <option value="6">6</option>
      </select>
      <div id="audition-topic-row"></div>
      <div id="audition-category-row"></div>
      <div id="audition-ruleset-row"></div>
      <div id="audition-rounds-row"></div>
      <div id="audition-error" style="display:block">old error</div>
      <button id="audition-submit-btn" disabled>OLD LABEL</button>
    </div>
    <div id="detail-auditions"></div>
  `;
}

function makeGroup(overrides: Partial<{ id: string; audition_config: Record<string, unknown> }> = {}) {
  return {
    id: 'group-001',
    name: 'Test Group',
    audition_config: {},
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  mockCurrentGroupId.value = null;
  mockCallerRole.value     = null;

  // Reset safeRpc to succeed by default (both audition action + loadPendingAuditions refresh)
  mockSafeRpc.mockResolvedValue({ data: [], error: null });
  mockRenderAuditionsList.mockReturnValue('<div class="auditions-list"></div>');
});

// ── TC1: allowed_by_leader hides debate-params ────────────────

describe('TC1 — allowed_by_leader rule hides debate-params section', () => {
  it('sets display:none on #audition-debate-params when rule is allowed_by_leader', () => {
    const g = makeGroup({ audition_config: { rule: 'allowed_by_leader' } });
    openAuditionModal(g);

    const paramsEl = document.getElementById('audition-debate-params')!;
    expect(paramsEl.style.display).toBe('none');
  });
});

// ── TC2: non-allowed_by_leader shows debate-params ────────────

describe('TC2 — non-allowed_by_leader rule shows debate-params section', () => {
  it.each([
    'debate_leader_any',
    'debate_member_any',
    'debate_leader_win',
    'debate_member_win',
  ])('sets display:block for rule "%s"', (rule) => {
    const g = makeGroup({ audition_config: { rule } });
    openAuditionModal(g);

    const paramsEl = document.getElementById('audition-debate-params')!;
    expect(paramsEl.style.display).toBe('block');
  });
});

// ── TC3: rule description populated from RULE_LABELS ─────────

describe('TC3 — rule description element populated from RULE_LABELS', () => {
  it('sets textContent of #audition-rule-desc to the label for the group rule', () => {
    const g = makeGroup({ audition_config: { rule: 'debate_leader_win' } });
    openAuditionModal(g);

    const ruleEl = document.getElementById('audition-rule-desc')!;
    expect(ruleEl.textContent).toBe(mockRuleLabels['debate_leader_win']);
  });
});

// ── TC4: form fields reset to defaults on open ────────────────

describe('TC4 — form fields reset to defaults on modal open', () => {
  it('resets topic to empty string, category to empty string, ruleset to amplified, rounds to 4', () => {
    const g = makeGroup({ audition_config: { rule: 'allowed_by_leader' } });
    openAuditionModal(g);

    expect((document.getElementById('audition-topic') as HTMLInputElement).value).toBe('');
    expect((document.getElementById('audition-category') as HTMLSelectElement).value).toBe('');
    expect((document.getElementById('audition-ruleset') as HTMLSelectElement).value).toBe('amplified');
    expect((document.getElementById('audition-rounds') as HTMLSelectElement).value).toBe('4');
  });
});

// ── TC5: audition-modal gains 'open' class ────────────────────

describe("TC5 — openAuditionModal adds 'open' class to #audition-modal", () => {
  it("adds class 'open' to the modal element", () => {
    const g = makeGroup();
    openAuditionModal(g);

    expect(document.getElementById('audition-modal')!.classList.contains('open')).toBe(true);
  });
});

// ── TC6: error hidden and submit button reset on open ─────────

describe('TC6 — error hidden and submit button reset on modal open', () => {
  it('hides #audition-error and resets submit button text and disabled state', () => {
    const g = makeGroup();
    openAuditionModal(g);

    const errEl = document.getElementById('audition-error')!;
    const btn   = document.getElementById('audition-submit-btn') as HTMLButtonElement;

    expect(errEl.style.display).toBe('none');
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('REQUEST AUDITION');
  });
});

// ── TC7: closeAuditionModal removes 'open' class ─────────────

describe("TC7 — closeAuditionModal removes 'open' class from #audition-modal", () => {
  it("removes class 'open'", () => {
    document.getElementById('audition-modal')!.classList.add('open');
    closeAuditionModal();

    expect(document.getElementById('audition-modal')!.classList.contains('open')).toBe(false);
  });
});

// ── TC8: submitAuditionRequest calls request_audition RPC ─────

describe("TC8 — submitAuditionRequest calls 'request_audition' RPC", () => {
  it("first safeRpc call uses 'request_audition' as the RPC name", async () => {
    openAuditionModal(makeGroup({ id: 'grp-tc8' }));
    await submitAuditionRequest();

    const firstCall = mockSafeRpc.mock.calls[0];
    expect(firstCall[0]).toBe('request_audition');
  });
});

// ── TC9: submitAuditionRequest sends all 5 named params ───────

describe('TC9 — submitAuditionRequest sends required named params to request_audition', () => {
  it('sends p_group_id, p_topic, p_category, p_ruleset, p_total_rounds', async () => {
    openAuditionModal(makeGroup({ id: 'grp-tc9', audition_config: { rule: 'allowed_by_leader' } }));

    // Set form values
    (document.getElementById('audition-topic')    as HTMLInputElement).value  = 'Is AI sentient?';
    (document.getElementById('audition-category') as HTMLSelectElement).value = 'sports';
    (document.getElementById('audition-ruleset')  as HTMLSelectElement).value = 'strict';
    (document.getElementById('audition-rounds')   as HTMLSelectElement).value = '6';

    await submitAuditionRequest();

    const [, params] = mockSafeRpc.mock.calls[0];
    expect(Object.keys(params)).toEqual(
      expect.arrayContaining(['p_group_id', 'p_topic', 'p_category', 'p_ruleset', 'p_total_rounds'])
    );
    expect(params.p_group_id).toBe('grp-tc9');
    expect(params.p_topic).toBe('Is AI sentient?');
    expect(params.p_category).toBe('sports');
    expect(params.p_ruleset).toBe('strict');
    expect(params.p_total_rounds).toBe(6);
  });
});

// ── TC10: success shows 'Audition requested!' toast ──────────

describe("TC10 — submitAuditionRequest shows 'Audition requested!' toast on success", () => {
  it('calls showToast with the audition-requested message', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    openAuditionModal(makeGroup({ id: 'grp-tc10' }));
    await submitAuditionRequest();

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Audition requested'));
  });
});

// ── TC11: success closes modal ────────────────────────────────

describe('TC11 — submitAuditionRequest closes modal on success', () => {
  it("removes 'open' class from #audition-modal after successful submit", async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    openAuditionModal(makeGroup({ id: 'grp-tc11' }));
    // modal was just opened
    expect(document.getElementById('audition-modal')!.classList.contains('open')).toBe(true);

    await submitAuditionRequest();

    expect(document.getElementById('audition-modal')!.classList.contains('open')).toBe(false);
  });
});

// ── TC12: error shows message in audition-error ───────────────

describe('TC12 — submitAuditionRequest shows error message in #audition-error on failure', () => {
  it('sets textContent and display:block on #audition-error when RPC returns an error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Duplicate audition' } });
    openAuditionModal(makeGroup({ id: 'grp-tc12' }));

    await submitAuditionRequest();

    const errEl = document.getElementById('audition-error')!;
    expect(errEl.style.display).toBe('block');
    expect(errEl.textContent).toContain('Duplicate audition');
  });
});

// ── TC13: submit button re-enabled in finally ─────────────────

describe('TC13 — submitAuditionRequest re-enables submit button in finally', () => {
  it('button is not disabled and reads REQUEST AUDITION after success', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: null });
    openAuditionModal(makeGroup({ id: 'grp-tc13' }));
    await submitAuditionRequest();

    const btn = document.getElementById('audition-submit-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('REQUEST AUDITION');
  });

  it('button is not disabled and reads REQUEST AUDITION after error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    openAuditionModal(makeGroup({ id: 'grp-tc13b' }));
    await submitAuditionRequest();

    const btn = document.getElementById('audition-submit-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('REQUEST AUDITION');
  });
});

// ── TC14: loadPendingAuditions calls get_pending_auditions ────

describe("TC14 — loadPendingAuditions calls 'get_pending_auditions' RPC with p_group_id", () => {
  it('calls safeRpc with correct RPC name and group-id param', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    await loadPendingAuditions('grp-tc14', null);

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'get_pending_auditions',
      { p_group_id: 'grp-tc14' },
      expect.anything(),
    );
  });
});

// ── TC15: loadPendingAuditions parses JSON-string data ────────

describe('TC15 — loadPendingAuditions handles JSON-string data', () => {
  it('parses JSON string and passes array to renderAuditionsList', async () => {
    const audition = { id: 'aud-1', rule: 'debate_leader_any', status: 'pending', created_at: '2026-01-01' };
    mockSafeRpc.mockResolvedValue({ data: JSON.stringify([audition]), error: null });

    await loadPendingAuditions('grp-tc15', null);

    expect(mockRenderAuditionsList).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'aud-1' })]),
      null,
    );
  });
});

// ── TC16: loadPendingAuditions passes result to renderAuditionsList ──

describe('TC16 — loadPendingAuditions passes auditions array to renderAuditionsList', () => {
  it('calls renderAuditionsList with the parsed auditions and myRole', async () => {
    const rows = [{ id: 'aud-2', status: 'pending', rule: 'debate_member_any', created_at: '2026-01-01' }];
    mockSafeRpc.mockResolvedValue({ data: rows, error: null });

    await loadPendingAuditions('grp-tc16', 'leader');

    expect(mockRenderAuditionsList).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'aud-2' })]),
      'leader',
    );
  });
});

// ── TC17: loadPendingAuditions on error shows failure state ───

describe("TC17 — loadPendingAuditions shows 'Could not load auditions' on RPC error", () => {
  it('sets innerHTML to could-not-load message when safeRpc returns error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'db fail' } });

    await loadPendingAuditions('grp-tc17', null);

    const container = document.getElementById('detail-auditions')!;
    expect(container.innerHTML).toContain('Could not load auditions');
  });
});

// ── TC18: loadPendingAuditions returns early if container absent ──

describe('TC18 — loadPendingAuditions returns early if #detail-auditions is absent', () => {
  it('does not call safeRpc when container element does not exist', async () => {
    document.getElementById('detail-auditions')!.remove();

    await loadPendingAuditions('grp-tc18', null);

    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

// ── TC19: handleAuditionAction 'accept' → accept_audition ────

describe("TC19 — handleAuditionAction 'accept' calls 'accept_audition' RPC", () => {
  it("passes 'accept_audition' as RPC name to safeRpc", async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: { debate_id: 'deb-001' }, error: null }) // accept_audition
      // no second call needed — navigates and returns
    ;
    openAuditionModal(makeGroup({ id: 'grp-tc19' }));

    await handleAuditionAction('aud-tc19', 'accept');

    expect(mockSafeRpc.mock.calls[0][0]).toBe('accept_audition');
  });
});

// ── TC20: handleAuditionAction 'approve' → approve_audition ──

describe("TC20 — handleAuditionAction 'approve' calls 'approve_audition' RPC", () => {
  it("passes 'approve_audition' as RPC name to safeRpc", async () => {
    mockCurrentGroupId.value = 'grp-tc20';
    mockSafeRpc.mockResolvedValue({ data: {}, error: null });
    openAuditionModal(makeGroup({ id: 'grp-tc20' }));

    await handleAuditionAction('aud-tc20', 'approve');

    expect(mockSafeRpc.mock.calls[0][0]).toBe('approve_audition');
  });
});

// ── TC21: handleAuditionAction 'deny' → deny_audition ────────

describe("TC21 — handleAuditionAction 'deny' calls 'deny_audition' RPC", () => {
  it("passes 'deny_audition' as RPC name to safeRpc", async () => {
    mockCurrentGroupId.value = 'grp-tc21';
    mockSafeRpc.mockResolvedValue({ data: {}, error: null });
    openAuditionModal(makeGroup({ id: 'grp-tc21' }));

    await handleAuditionAction('aud-tc21', 'deny');

    expect(mockSafeRpc.mock.calls[0][0]).toBe('deny_audition');
  });
});

// ── TC22: handleAuditionAction 'withdraw' → withdraw_audition ─

describe("TC22 — handleAuditionAction 'withdraw' calls 'withdraw_audition' RPC", () => {
  it("passes 'withdraw_audition' as RPC name to safeRpc", async () => {
    mockSafeRpc.mockResolvedValue({ data: {}, error: null });
    openAuditionModal(makeGroup({ id: 'grp-tc22' }));

    await handleAuditionAction('aud-tc22', 'withdraw');

    expect(mockSafeRpc.mock.calls[0][0]).toBe('withdraw_audition');
  });
});

// ── TC23: accept + debate_id → toast + navigate ───────────────

describe("TC23 — handleAuditionAction 'accept' with debate_id shows toast and navigates to lobby", () => {
  it("shows 'Audition accepted — debate created!' and sets window.location.href", async () => {
    const mockLocation = { href: '' };
    vi.stubGlobal('location', mockLocation);

    mockSafeRpc.mockResolvedValueOnce({ data: { debate_id: 'deb-abc' }, error: null });
    openAuditionModal(makeGroup({ id: 'grp-tc23' }));

    await handleAuditionAction('aud-tc23', 'accept');

    expect(mockShowToast).toHaveBeenCalledWith('Audition accepted — debate created!');
    expect(mockLocation.href).toContain('deb-abc');
    vi.unstubAllGlobals();
  });
});

// ── TC24: approve → 'Candidate admitted to the group' toast ──

describe("TC24 — handleAuditionAction 'approve' shows 'Candidate admitted to the group' toast", () => {
  it('calls showToast with the admission message', async () => {
    mockCurrentGroupId.value = 'grp-tc24';
    mockSafeRpc.mockResolvedValue({ data: {}, error: null });
    openAuditionModal(makeGroup({ id: 'grp-tc24' }));

    await handleAuditionAction('aud-tc24', 'approve');

    expect(mockShowToast).toHaveBeenCalledWith('Candidate admitted to the group');
  });
});

// ── TC25: deny → 'Audition denied' toast ─────────────────────

describe("TC25 — handleAuditionAction 'deny' shows 'Audition denied' toast", () => {
  it('calls showToast with the denial message', async () => {
    mockCurrentGroupId.value = 'grp-tc25';
    mockSafeRpc.mockResolvedValue({ data: {}, error: null });
    openAuditionModal(makeGroup({ id: 'grp-tc25' }));

    await handleAuditionAction('aud-tc25', 'deny');

    expect(mockShowToast).toHaveBeenCalledWith('Audition denied');
  });
});

// ── TC26: withdraw → 'Audition withdrawn' toast ──────────────

describe("TC26 — handleAuditionAction 'withdraw' shows 'Audition withdrawn' toast", () => {
  it('calls showToast with the withdrawal message', async () => {
    mockSafeRpc.mockResolvedValue({ data: {}, error: null });
    openAuditionModal(makeGroup({ id: 'grp-tc26' }));

    await handleAuditionAction('aud-tc26', 'withdraw');

    expect(mockShowToast).toHaveBeenCalledWith('Audition withdrawn');
  });
});

// ── TC27: withdraw uses currentAuditionGroupId for refresh ────

describe('TC27 — withdraw uses currentAuditionGroupId (L-C8 fix) for loadPendingAuditions refresh', () => {
  it('passes currentAuditionGroupId (not currentGroupId) as groupId in the get_pending_auditions call after withdraw', async () => {
    // openAuditionModal sets currentAuditionGroupId = 'audition-group'
    openAuditionModal(makeGroup({ id: 'audition-group' }));
    // currentGroupId is different — set to a separate group
    mockCurrentGroupId.value = 'detail-page-group';

    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await handleAuditionAction('aud-tc27', 'withdraw');

    // The second safeRpc call is loadPendingAuditions → get_pending_auditions
    const refreshCall = mockSafeRpc.mock.calls.find(c => c[0] === 'get_pending_auditions');
    expect(refreshCall).toBeTruthy();
    expect(refreshCall![1].p_group_id).toBe('audition-group');
  });
});

// ── TC28: approve/deny use currentGroupId for refresh ─────────

describe('TC28 — approve/deny use currentGroupId (not currentAuditionGroupId) for refresh', () => {
  it('passes currentGroupId as groupId in get_pending_auditions call after approve', async () => {
    openAuditionModal(makeGroup({ id: 'audition-group-tc28' }));
    mockCurrentGroupId.value = 'detail-page-group-tc28';

    mockSafeRpc.mockResolvedValue({ data: [], error: null });

    await handleAuditionAction('aud-tc28', 'approve');

    const refreshCall = mockSafeRpc.mock.calls.find(c => c[0] === 'get_pending_auditions');
    expect(refreshCall).toBeTruthy();
    expect(refreshCall![1].p_group_id).toBe('detail-page-group-tc28');
  });
});

// ── TC29: handleAuditionAction on RPC error shows toast ───────

describe('TC29 — handleAuditionAction shows error toast when RPC fails', () => {
  it('calls showToast with the error message from the thrown error', async () => {
    mockSafeRpc.mockResolvedValue({ data: null, error: { message: 'Not a member' } });
    openAuditionModal(makeGroup({ id: 'grp-tc29' }));

    await handleAuditionAction('aud-tc29', 'deny');

    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Not a member'));
  });
});

// ── TC30: locked_topic sets and disables topic input ──────────

describe('TC30 — openAuditionModal with locked_topic: topic input value set and disabled', () => {
  it('sets input value to locked_topic and marks it disabled', () => {
    const g = makeGroup({
      audition_config: { rule: 'debate_leader_any', locked_topic: 'Is capitalism failing?' },
    });
    openAuditionModal(g);

    const topicInput = document.getElementById('audition-topic') as HTMLInputElement;
    expect(topicInput.value).toBe('Is capitalism failing?');
    expect(topicInput.disabled).toBe(true);
  });
});

// ── TC31: locked_category sets and disables category select ───

describe('TC31 — openAuditionModal with locked_category: category select value set and disabled', () => {
  it('sets select value to locked_category and marks it disabled', () => {
    const g = makeGroup({
      audition_config: { rule: 'debate_member_any', locked_category: 'sports' },
    });
    openAuditionModal(g);

    const catSelect = document.getElementById('audition-category') as HTMLSelectElement;
    expect(catSelect.value).toBe('sports');
    expect(catSelect.disabled).toBe(true);
  });
});

// ── TC32: locked_ruleset sets and disables ruleset select ─────

describe('TC32 — openAuditionModal with locked_ruleset: ruleset select value set and disabled', () => {
  it('sets select value to locked_ruleset and marks it disabled', () => {
    const g = makeGroup({
      audition_config: { rule: 'debate_leader_win', locked_ruleset: 'strict' },
    });
    openAuditionModal(g);

    const rulesetSelect = document.getElementById('audition-ruleset') as HTMLSelectElement;
    expect(rulesetSelect.value).toBe('strict');
    expect(rulesetSelect.disabled).toBe(true);
  });
});

// ── TC33: locked_total_rounds sets and disables rounds select ─

describe('TC33 — openAuditionModal with locked_total_rounds: rounds select value set and disabled', () => {
  it('sets select value to locked_total_rounds (as string) and marks it disabled', () => {
    const g = makeGroup({
      audition_config: { rule: 'debate_member_win', locked_total_rounds: 6 },
    });
    openAuditionModal(g);

    const roundsSelect = document.getElementById('audition-rounds') as HTMLSelectElement;
    expect(roundsSelect.value).toBe('6');
    expect(roundsSelect.disabled).toBe(true);
  });
});

// ── ARCH: import contract ─────────────────────────────────────

describe('ARCH — src/pages/groups.auditions.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed set defined in Step 2', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/pages/groups.auditions.ts'),
      'utf8',
    );

    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../config.ts',
      './groups.state.ts',
      './groups.types.ts',
      './groups.auditions.render.ts',
    ];

    const importLines = src
      .split('\n')
      .filter(l => /^import\s/.test(l.trim()))
      .map(l => {
        const m = l.match(/from\s+['"]([^'"]+)['"]/);
        return m ? m[1] : null;
      })
      .filter(Boolean) as string[];

    for (const imp of importLines) {
      expect(allowed).toContain(imp);
    }
  });
});
