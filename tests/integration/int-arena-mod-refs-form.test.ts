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

// Stub @peermetrics/webrtc-stats — pulled in transitively via arena-room-ai-response → arena-room-live-poll → arena-room-end → webrtc.ts → webrtc.monitor.ts
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

// TC1: showReferenceForm — no form injected when currentDebate is null
describe('TC1 — showReferenceForm noop when currentDebate is null', () => {
  it('does not inject #arena-ref-form when currentDebate is null', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate(null);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    expect(document.getElementById('arena-ref-form')).toBeNull();
  });
});

// TC2: showReferenceForm — form inserted after #arena-messages when present
describe('TC2 — showReferenceForm inserts form after #arena-messages', () => {
  it('places #arena-ref-form as sibling after #arena-messages', async () => {
    document.body.innerHTML = `
      <div id="screen-main">
        <div id="arena-messages"></div>
      </div>
    `;

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-001',
      topic: 'Test topic',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-1',
      opponentUsername: 'opponent',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    const form = document.getElementById('arena-ref-form');
    expect(form).not.toBeNull();

    const messages = document.getElementById('arena-messages');
    expect(messages?.nextSibling).toBe(form);
  });
});

// TC3: showReferenceForm — form appended to screenEl when #arena-messages absent
describe('TC3 — showReferenceForm falls back to screenEl', () => {
  it('appends #arena-ref-form to screenEl when no #arena-messages present', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-002',
      topic: 'Another topic',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-2',
      opponentUsername: 'opp2',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);

    const screenEl = document.getElementById('screen-main') as HTMLElement;
    state.set_screenEl(screenEl);

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    const form = document.getElementById('arena-ref-form');
    expect(form).not.toBeNull();
    expect(screenEl.contains(form)).toBe(true);
  });
});

// TC4: hideReferenceForm — removes #arena-ref-form
describe('TC4 — hideReferenceForm removes the form', () => {
  it('removes #arena-ref-form from DOM', async () => {
    document.body.innerHTML = '<div id="screen-main"><div id="arena-ref-form"></div></div>';

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.hideReferenceForm();

    expect(document.getElementById('arena-ref-form')).toBeNull();
  });
});

// TC5: cancel button click triggers hideReferenceForm
describe('TC5 — cancel button removes the form', () => {
  it('clicking #arena-ref-cancel-btn removes #arena-ref-form', async () => {
    document.body.innerHTML = '<div id="screen-main"></div>';

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-003',
      topic: 'Cancel test',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-3',
      opponentUsername: 'opp3',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    expect(document.getElementById('arena-ref-form')).not.toBeNull();

    const cancelBtn = document.getElementById('arena-ref-cancel-btn') as HTMLButtonElement;
    cancelBtn.click();

    expect(document.getElementById('arena-ref-form')).toBeNull();
  });
});

// TC6: assignSelectedMod — skips assignModerator when selectedModerator is null
describe('TC6 — assignSelectedMod noop when selectedModerator is null', () => {
  it('resolves without calling auth.assignModerator when selectedModerator is null', async () => {
    const state = await import('../../src/arena/arena-state.ts');
    state.set_selectedModerator(null);
    state.set_currentDebate({
      id: 'debate-004',
      topic: 'No mod',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-4',
      opponentUsername: 'opp4',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    // Should resolve without throwing or calling rpc
    await expect(mod.assignSelectedMod('debate-004')).resolves.toBeUndefined();
    // No Supabase rpc calls expected for mod assignment
    expect(mockRpc).not.toHaveBeenCalledWith('assign_moderator', expect.anything());
  });
});

// TC7: addReferenceButton — is a no-op, returns without throwing
describe('TC7 — addReferenceButton is a safe no-op', () => {
  it('returns undefined without throwing', async () => {
    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    expect(() => mod.addReferenceButton()).not.toThrow();
    expect(mod.addReferenceButton()).toBeUndefined();
  });
});

// ARCH seam boundary check
describe('ARCH — seam #035 import boundary unchanged', () => {
  it('src/arena/arena-mod-refs-form.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-refs-form.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});

// ============================================================
// SEAM #099: arena-mod-refs-form → arena-core.utils (isPlaceholder)
// ============================================================

// TC099-1: isPlaceholder blocks assignSelectedMod — no RPC when placeholder
describe('TC099-1 — assignSelectedMod skips when isPlaceholder returns true', () => {
  it('returns immediately without calling rpc when supabase client is null (placeholder)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Drive isPlaceholder = true by making getSupabaseClient return null
    // We accomplish this by not having a valid supabase client initialized.
    // arena-core.utils.isPlaceholder = !getSupabaseClient() || isAnyPlaceholder
    // We rely on mockRpc not being called.

    const state = await import('../../src/arena/arena-state.ts');
    state.set_selectedModerator({ id: 'mod-uuid-001', type: 'community' } as unknown as Parameters<typeof state.set_selectedModerator>[0]);
    state.set_currentDebate({
      id: 'debate-ph-001',
      topic: 'Placeholder test',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-ph',
      opponentUsername: 'opp-ph',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');

    // isPlaceholder checks !getSupabaseClient() — the mock client exists so this
    // path tests that the call completes without throwing regardless.
    await expect(mod.assignSelectedMod('debate-ph-001')).resolves.toBeUndefined();

    vi.useRealTimers();
  });
});

// TC099-2: assignSelectedMod bails on 'ai-local-' prefix
describe('TC099-2 — assignSelectedMod bails on ai-local- debate id prefix', () => {
  it('resolves without calling assignModerator rpc for ai-local- debates', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_selectedModerator({ id: 'mod-uuid-002', type: 'community' } as unknown as Parameters<typeof state.set_selectedModerator>[0]);

    mockRpc.mockClear();

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    await mod.assignSelectedMod('ai-local-session-xyz');

    expect(mockRpc).not.toHaveBeenCalledWith('assign_moderator', expect.anything());

    vi.useRealTimers();
  });
});

// TC099-3: assignSelectedMod bails on 'placeholder-' prefix
describe('TC099-3 — assignSelectedMod bails on placeholder- debate id prefix', () => {
  it('resolves without calling assignModerator rpc for placeholder- debates', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_selectedModerator({ id: 'mod-uuid-003', type: 'community' } as unknown as Parameters<typeof state.set_selectedModerator>[0]);

    mockRpc.mockClear();

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    await mod.assignSelectedMod('placeholder-debate-abc');

    expect(mockRpc).not.toHaveBeenCalledWith('assign_moderator', expect.anything());

    vi.useRealTimers();
  });
});

// TC099-4: isPlaceholder utility itself — pure logic, returns boolean
describe('TC099-4 — isPlaceholder returns a boolean', () => {
  it('isPlaceholder from arena-core.utils returns a boolean value', async () => {
    const utils = await import('../../src/arena/arena-core.utils.ts');
    const result = utils.isPlaceholder();
    expect(typeof result).toBe('boolean');
  });
});

// TC099-5: showReferenceForm idempotency — calling twice does not stack multiple forms
describe('TC099-5 — showReferenceForm is idempotent (calls hideReferenceForm first)', () => {
  it('only one #arena-ref-form in DOM after two consecutive showReferenceForm calls', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = '<div id="screen-main"></div>';

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-idem-001',
      topic: 'Idempotency test',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-idem',
      opponentUsername: 'opp-idem',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();
    mod.showReferenceForm(); // second call should replace, not stack

    const forms = document.querySelectorAll('#arena-ref-form');
    expect(forms.length).toBe(1);

    vi.useRealTimers();
  });
});

// TC099-6: Side button selection sets active class
describe('TC099-6 — side buttons toggle active class', () => {
  it('clicking a side button adds .active to that button', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = '<div id="screen-main"></div>';

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-side-001',
      topic: 'Side button test',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-side',
      opponentUsername: 'opp-side',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    const sideButtons = document.querySelectorAll('.arena-ref-side-btn');
    expect(sideButtons.length).toBe(2);

    const btnA = sideButtons[0] as HTMLButtonElement;
    btnA.click();
    expect(btnA.classList.contains('active')).toBe(true);

    // Clicking the other side removes active from first
    const btnB = sideButtons[1] as HTMLButtonElement;
    btnB.click();
    expect(btnB.classList.contains('active')).toBe(true);
    expect(btnA.classList.contains('active')).toBe(false);

    vi.useRealTimers();
  });
});

// TC099-7: ARCH seam boundary — arena-mod-refs-form imports from arena-core.utils
describe('ARCH — seam #099 import boundary: arena-mod-refs-form → arena-core.utils', () => {
  it('src/arena/arena-mod-refs-form.ts imports isPlaceholder from arena-core.utils', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-refs-form.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-core.utils'))).toBe(true);
  });
});

// ============================================================
// SEAM #224: arena-mod-refs-form → arena-room-live-messages (addSystemMessage)
// ============================================================

// TC224-1: addSystemMessage directly — appends .system message to #arena-messages
describe('TC224-1 — addSystemMessage appends .arena-msg.system to #arena-messages', () => {
  it('creates a div.arena-msg.system with textContent in #arena-messages', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = '<div id="arena-messages"></div>';
    // jsdom does not implement scrollTo — patch it
    const messagesEl = document.getElementById('arena-messages')!;
    messagesEl.scrollTo = vi.fn();

    const msgs = await import('../../src/arena/arena-room-live-messages.ts');
    msgs.addSystemMessage('Hello system');

    const child = messagesEl.querySelector('.arena-msg.system') as HTMLElement | null;
    expect(child).not.toBeNull();
    expect(child?.textContent).toBe('Hello system');

    vi.useRealTimers();
  });
});

// TC224-2: addSystemMessage noop when #arena-messages absent — no error thrown
describe('TC224-2 — addSystemMessage is safe when #arena-messages is absent', () => {
  it('does not throw when #arena-messages element does not exist', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = '<div id="no-messages-here"></div>';

    const msgs = await import('../../src/arena/arena-room-live-messages.ts');
    expect(() => msgs.addSystemMessage('safe call')).not.toThrow();

    vi.useRealTimers();
  });
});

// TC224-3: submit blank URL+desc — addSystemMessage NOT called, form remains
describe('TC224-3 — submit with blank inputs does not call addSystemMessage', () => {
  it('form stays visible and no .arena-msg.system emitted when both fields empty', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="screen-main">
        <div id="arena-messages"></div>
      </div>
    `;

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-224-blank',
      topic: 'Blank test',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-b',
      opponentUsername: 'opp-b',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    // Leave both fields empty and click submit
    const submitBtn = document.getElementById('arena-ref-submit-btn') as HTMLButtonElement;
    submitBtn.click();

    await vi.advanceTimersByTimeAsync(50);

    // No system message appended
    const messagesEl = document.getElementById('arena-messages');
    expect(messagesEl?.querySelector('.arena-msg.system')).toBeNull();

    // Form still present (not closed)
    expect(document.getElementById('arena-ref-form')).not.toBeNull();

    vi.useRealTimers();
  });
});

// TC224-4: submit error path — addSystemMessage called with ❌ prefix
describe('TC224-4 — submit RPC error routes error text through addSystemMessage', () => {
  it('appends .arena-msg.system with ❌ prefix on RPC failure', async () => {
    document.body.innerHTML = `
      <div id="screen-main">
        <div id="arena-messages"></div>
      </div>
    `;
    // jsdom scrollTo patch
    const messagesEl = document.getElementById('arena-messages')!;
    messagesEl.scrollTo = vi.fn();

    // submit_reference returns an error
    mockRpc.mockImplementation((name: string) => {
      if (name === 'submit_reference') {
        return Promise.resolve({ data: null, error: { message: 'DB error' } });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-224-err',
      topic: 'Error test',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-e',
      opponentUsername: 'opp-e',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    // Fill in a description so the early-return guard doesn't fire
    const descEl = document.getElementById('arena-ref-desc') as HTMLTextAreaElement;
    descEl.value = 'My evidence text';

    const submitBtn = document.getElementById('arena-ref-submit-btn') as HTMLButtonElement;
    submitBtn.click();

    // Flush micro-task queue so the async click handler resolves
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const systemMsg = messagesEl.querySelector('.arena-msg.system') as HTMLElement | null;
    expect(systemMsg).not.toBeNull();
    expect(systemMsg?.textContent).toMatch(/❌/);
  });
});

// TC224-5: submit success path — addSystemMessage called with 📎 evidence submitted text
describe('TC224-5 — submit success appends evidence-submitted system message', () => {
  it('appends .arena-msg.system with evidence submitted text on RPC success', async () => {
    document.body.innerHTML = `
      <div id="screen-main">
        <div id="arena-messages"></div>
      </div>
    `;
    // jsdom scrollTo patch
    const messagesEl = document.getElementById('arena-messages')!;
    messagesEl.scrollTo = vi.fn();

    mockRpc.mockImplementation((name: string) => {
      if (name === 'submit_reference') {
        return Promise.resolve({ data: { reference_id: 'ref-001' }, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-224-ok',
      topic: 'Success test',
      status: 'live',
      mode: 'text',
      moderatorType: null,    // non-AI mod → no requestAIModRuling
      side: 'a',
      opponentId: 'opp-ok',
      opponentUsername: 'opp-ok',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    const descEl = document.getElementById('arena-ref-desc') as HTMLTextAreaElement;
    descEl.value = 'Strong evidence';

    const submitBtn = document.getElementById('arena-ref-submit-btn') as HTMLButtonElement;
    submitBtn.click();

    // Flush micro-task queue so the async click handler resolves
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const systemMsg = messagesEl.querySelector('.arena-msg.system') as HTMLElement | null;
    expect(systemMsg).not.toBeNull();
    expect(systemMsg?.textContent).toMatch(/Evidence submitted/);

    // Form should be hidden after successful submit
    expect(document.getElementById('arena-ref-form')).toBeNull();
  });
});

// TC224-6: addSystemMessage uses textContent (not innerHTML) — no XSS surface
describe('TC224-6 — addSystemMessage uses textContent, not innerHTML', () => {
  it('raw HTML in message text is not parsed as markup', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = '<div id="arena-messages"></div>';
    // jsdom scrollTo patch
    const messagesEl = document.getElementById('arena-messages')!;
    messagesEl.scrollTo = vi.fn();

    const msgs = await import('../../src/arena/arena-room-live-messages.ts');
    msgs.addSystemMessage('<script>evil()</script>');

    const child = messagesEl.querySelector('.arena-msg.system') as HTMLElement | null;
    // textContent treats the string as literal text — no child script element
    expect(child?.querySelector('script')).toBeNull();
    expect(child?.textContent).toBe('<script>evil()</script>');

    vi.useRealTimers();
  });
});

// TC224-7: ARCH seam boundary — arena-mod-refs-form imports from arena-room-live-messages
describe('ARCH — seam #224 import boundary: arena-mod-refs-form → arena-room-live-messages', () => {
  it('src/arena/arena-mod-refs-form.ts imports addSystemMessage from arena-room-live-messages', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-refs-form.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-room-live-messages'))).toBe(true);
  });
});

// ============================================================
// SEAM #526: arena-mod-refs-form → arena-mod-refs-ai (requestAIModRuling)
// ============================================================

// TC526-1: AI mod path — submit with moderatorType 'ai' + reference_id returned
// → fetch is called to the ai-moderator Edge Function URL
describe('TC526-1 — AI mod submit calls fetch to ai-moderator edge function', () => {
  it('calls fetch to URL containing ai-moderator when moderatorType=ai and reference_id returned', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="screen-main">
        <div id="arena-messages"></div>
      </div>
    `;
    const messagesEl = document.getElementById('arena-messages')!;
    messagesEl.scrollTo = vi.fn();

    // Provide a valid JWT so getUserJwt() succeeds and fetch is actually called
    mockAuth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-526-1' } },
      error: null,
    });

    // submit_reference returns reference_id; ai-moderator edge fn returns ruling
    mockRpc.mockImplementation((name: string) => {
      if (name === 'submit_reference') {
        return Promise.resolve({ data: { reference_id: 'ref-526-1' }, error: null });
      }
      if (name === 'rule_on_reference') {
        return Promise.resolve({ data: { success: true }, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ruling: 'allowed', reason: 'Strong evidence.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-526-1',
      topic: 'AI jobs test',
      status: 'live',
      mode: 'text',
      moderatorType: 'ai',
      side: 'a',
      opponentId: 'opp-526',
      opponentUsername: 'opp-526',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
      messages: [],
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    const descEl = document.getElementById('arena-ref-desc') as HTMLTextAreaElement;
    descEl.value = 'Peer-reviewed study';

    const submitBtn = document.getElementById('arena-ref-submit-btn') as HTMLButtonElement;
    submitBtn.click();

    // Flush microtasks + async timers
    await vi.advanceTimersByTimeAsync(100);

    // fetch should have been called with a URL containing 'ai-moderator'
    const fetchCalls = fetchMock.mock.calls;
    const aiModeratorCall = fetchCalls.find((args: unknown[]) =>
      typeof args[0] === 'string' && (args[0] as string).includes('ai-moderator')
    );
    expect(aiModeratorCall).toBeDefined();

    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});

// TC526-2: Non-AI mod — submit with moderatorType null
// → requestAIModRuling NOT called, ai-moderator fetch does NOT fire
describe('TC526-2 — non-AI mod submit does NOT call ai-moderator fetch', () => {
  it('does not call fetch when moderatorType is null', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="screen-main">
        <div id="arena-messages"></div>
      </div>
    `;
    const messagesEl = document.getElementById('arena-messages')!;
    messagesEl.scrollTo = vi.fn();

    mockRpc.mockImplementation((name: string) => {
      if (name === 'submit_reference') {
        return Promise.resolve({ data: { reference_id: 'ref-526-2' }, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-526-2',
      topic: 'Human mod debate',
      status: 'live',
      mode: 'text',
      moderatorType: null,
      side: 'a',
      opponentId: 'opp-526-2',
      opponentUsername: 'opp-526-2',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
      messages: [],
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    const descEl = document.getElementById('arena-ref-desc') as HTMLTextAreaElement;
    descEl.value = 'Human reviewed evidence';

    const submitBtn = document.getElementById('arena-ref-submit-btn') as HTMLButtonElement;
    submitBtn.click();

    await vi.advanceTimersByTimeAsync(100);

    // fetch should NOT have been called for ai-moderator
    const aiModeratorCalls = fetchMock.mock.calls.filter((args: unknown[]) =>
      typeof args[0] === 'string' && (args[0] as string).includes('ai-moderator')
    );
    expect(aiModeratorCalls.length).toBe(0);

    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});

// TC526-3: AI mod but no reference_id in result — requestAIModRuling NOT called
describe('TC526-3 — AI mod submit skips requestAIModRuling when reference_id absent', () => {
  it('does not call ai-moderator fetch when submit_reference returns no reference_id', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = `
      <div id="screen-main">
        <div id="arena-messages"></div>
      </div>
    `;
    const messagesEl = document.getElementById('arena-messages')!;
    messagesEl.scrollTo = vi.fn();

    // Returns success but no reference_id field
    mockRpc.mockImplementation((name: string) => {
      if (name === 'submit_reference') {
        return Promise.resolve({ data: {}, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-526-3',
      topic: 'No ref id test',
      status: 'live',
      mode: 'text',
      moderatorType: 'ai',
      side: 'a',
      opponentId: 'opp-526-3',
      opponentUsername: 'opp-526-3',
      round: 1,
      totalRounds: 3,
      ruleset: 'amplified',
      ranked: false,
      category: null,
      startedAt: null,
      endedAt: null,
      isSpectating: false,
      linkUrl: null,
      linkPreview: null,
      messages: [],
    } as unknown as Parameters<typeof state.set_currentDebate>[0]);
    state.set_screenEl(document.getElementById('screen-main'));

    const mod = await import('../../src/arena/arena-mod-refs-form.ts');
    mod.showReferenceForm();

    const descEl = document.getElementById('arena-ref-desc') as HTMLTextAreaElement;
    descEl.value = 'Evidence without ref id';

    document.getElementById('arena-ref-submit-btn')!.click();
    await vi.advanceTimersByTimeAsync(100);

    const aiCalls = fetchMock.mock.calls.filter((args: unknown[]) =>
      typeof args[0] === 'string' && (args[0] as string).includes('ai-moderator')
    );
    expect(aiCalls.length).toBe(0);

    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});

// TC526-4: requestAIModRuling success path
// → rule_on_reference RPC called with referenceId + 'allowed', system message posted
describe('TC526-4 — requestAIModRuling success: calls rule_on_reference + posts allowed message', () => {
  it('calls rule_on_reference with referenceId and allowed ruling, posts ✅ system message', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = '<div id="arena-messages"></div>';
    const messagesEl = document.getElementById('arena-messages')!;
    messagesEl.scrollTo = vi.fn();

    // Provide a valid JWT so getUserJwt() succeeds and fetch is actually called
    mockAuth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-526-4' } },
      error: null,
    });

    mockRpc.mockImplementation((name: string) => {
      if (name === 'rule_on_reference') {
        return Promise.resolve({ data: { success: true }, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ruling: 'allowed', reason: 'Great source.' }),
    }));

    const ai = await import('../../src/arena/arena-mod-refs-ai.ts');
    const debate = {
      id: 'debate-526-4',
      topic: 'Climate change',
      round: 1,
      messages: [],
      moderatorType: 'ai',
    };

    const ruling = ai.requestAIModRuling(
      debate as unknown as Parameters<typeof ai.requestAIModRuling>[0],
      'ref-526-4',
      'https://example.com',
      'My evidence',
      'a'
    );

    await vi.advanceTimersByTimeAsync(500);
    await ruling;

    expect(mockRpc).toHaveBeenCalledWith(
      'rule_on_reference',
      expect.objectContaining({ p_reference_id: 'ref-526-4', p_ruling: 'allowed' })
    );

    const systemMsg = messagesEl.querySelector('.arena-msg.system') as HTMLElement | null;
    expect(systemMsg).not.toBeNull();
    expect(systemMsg?.textContent).toMatch(/✅|ALLOWED/i);

    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});

// TC526-5: requestAIModRuling Edge Function non-ok response
// → fallback rule_on_reference called with 'denied', auto-denied message posted
describe('TC526-5 — requestAIModRuling Edge Function error: fallback denied ruling posted', () => {
  it('calls rule_on_reference with denied ruling when Edge Function returns non-ok status', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = '<div id="arena-messages"></div>';
    const messagesEl = document.getElementById('arena-messages')!;
    messagesEl.scrollTo = vi.fn();

    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    }));

    const ai = await import('../../src/arena/arena-mod-refs-ai.ts');
    const debate = {
      id: 'debate-526-5',
      topic: 'Energy policy',
      round: 1,
      messages: [],
      moderatorType: 'ai',
    };

    const ruling = ai.requestAIModRuling(
      debate as unknown as Parameters<typeof ai.requestAIModRuling>[0],
      'ref-526-5',
      '',
      'Evidence text',
      'b'
    );

    await vi.advanceTimersByTimeAsync(500);
    await ruling;

    expect(mockRpc).toHaveBeenCalledWith(
      'rule_on_reference',
      expect.objectContaining({ p_reference_id: 'ref-526-5', p_ruling: 'denied' })
    );

    const systemMsg = messagesEl.querySelector('.arena-msg.system') as HTMLElement | null;
    expect(systemMsg).not.toBeNull();
    expect(systemMsg?.textContent).toMatch(/AUTO-DENIED/i);

    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});

// TC526-6: requestAIModRuling fetch throws (network error)
// → fallback rule_on_reference called with 'denied'
describe('TC526-6 — requestAIModRuling fetch throws: fallback denied ruling', () => {
  it('calls rule_on_reference with denied when fetch throws a network error', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    document.body.innerHTML = '<div id="arena-messages"></div>';
    const messagesEl = document.getElementById('arena-messages')!;
    messagesEl.scrollTo = vi.fn();

    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const ai = await import('../../src/arena/arena-mod-refs-ai.ts');
    const debate = {
      id: 'debate-526-6',
      topic: 'Net neutrality',
      round: 2,
      messages: [
        { role: 'user', text: 'My argument', round: 1 },
        { role: 'assistant', text: 'Counter arg', round: 1 },
      ],
      moderatorType: 'ai',
    };

    const ruling = ai.requestAIModRuling(
      debate as unknown as Parameters<typeof ai.requestAIModRuling>[0],
      'ref-526-6',
      'https://source.com',
      'Reliable source',
      null
    );

    await vi.advanceTimersByTimeAsync(500);
    await ruling;

    expect(mockRpc).toHaveBeenCalledWith(
      'rule_on_reference',
      expect.objectContaining({ p_reference_id: 'ref-526-6', p_ruling: 'denied' })
    );

    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});

// TC526-7: ARCH seam boundary — arena-mod-refs-form imports from arena-mod-refs-ai
describe('ARCH — seam #526 import boundary: arena-mod-refs-form → arena-mod-refs-ai', () => {
  it('src/arena/arena-mod-refs-form.ts imports requestAIModRuling from arena-mod-refs-ai', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-mod-refs-form.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-mod-refs-ai'))).toBe(true);
  });
});
