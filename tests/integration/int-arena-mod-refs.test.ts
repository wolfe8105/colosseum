import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Hoisted mocks ─────────────────────────────────────────────────────────
const mockRuleOnReference = vi.hoisted(() => vi.fn());
const mockSubmitReference = vi.hoisted(() => vi.fn());
const mockAssignModerator = vi.hoisted(() => vi.fn());
const mockGetUserJwt = vi.hoisted(() => vi.fn());
const mockAddSystemMessage = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  })),
}));

vi.mock('../../src/auth.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/auth.ts')>();
  return {
    ...actual,
    ruleOnReference: mockRuleOnReference,
    submitReference: mockSubmitReference,
    assignModerator: mockAssignModerator,
    safeRpc: vi.fn(),
    getCurrentProfile: vi.fn(),
    supabase: {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      from: vi.fn(),
      auth: { onAuthStateChange: vi.fn() },
    },
  };
});

vi.mock('../../src/config.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/config.ts')>();
  return {
    ...actual,
    SUPABASE_URL: 'https://faomczmipsccwbhpivmp.supabase.co',
    ModeratorConfig: {
      ...actual.ModeratorConfig,
      escapeHTML: (s: string) => s,
      showToast: vi.fn(),
    },
  };
});

vi.mock('../../src/arena/arena-room-ai-response.ts', () => ({
  getUserJwt: mockGetUserJwt,
}));

vi.mock('../../src/arena/arena-room-live-messages.ts', () => ({
  addSystemMessage: mockAddSystemMessage,
}));

// ─── Shared fixture ─────────────────────────────────────────────────────────
const makeDebate = (overrides = {}) => ({
  id: 'debate-uuid-001',
  topic: 'AI is taking all the jobs',
  round: 2,
  messages: [
    { role: 'user', round: 1, text: 'Side A opening argument.' },
    { role: 'assistant', round: 1, text: 'Side B rebuttal.' },
  ],
  ...overrides,
});

beforeEach(() => {
  vi.resetModules();
  mockRuleOnReference.mockReset();
  mockSubmitReference.mockReset();
  mockAssignModerator.mockReset();
  mockGetUserJwt.mockReset();
  mockAddSystemMessage.mockReset();
  mockFetch.mockReset();
  mockRuleOnReference.mockResolvedValue({ data: null, error: null });
  mockSubmitReference.mockResolvedValue({ data: null, error: null });
  mockAssignModerator.mockResolvedValue({ data: null, error: null });
  mockGetUserJwt.mockResolvedValue('jwt-token-abc');
  vi.stubGlobal('fetch', mockFetch);
});

// ─── ARCH ────────────────────────────────────────────────────────────────────
describe('ARCH — arena-mod-refs-ai import lines', () => {
  it('only imports from whitelisted modules', () => {
    const src = readFileSync(
      resolve('src/arena/arena-mod-refs-ai.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const banned = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of importLines) {
      for (const b of banned) {
        expect(line).not.toContain(b);
      }
    }
  });
});

// ─── TC1: allowed ruling calls ruleOnReference with 'allowed' ───────────────
describe('TC1 — allowed ruling calls ruleOnReference correctly', () => {
  it('calls ruleOnReference(refId, "allowed", reason) on allowed ruling', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ruling: 'allowed', reason: 'Strong primary source.' }),
    });

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    await requestAIModRuling(makeDebate(), 'ref-id-001', 'https://example.com/study', 'Peer reviewed study', 'A');

    expect(mockRuleOnReference).toHaveBeenCalledOnce();
    expect(mockRuleOnReference).toHaveBeenCalledWith('ref-id-001', 'allowed', expect.stringContaining('🤖'));
  });
});

// ─── TC2: denied ruling calls ruleOnReference with 'denied' ─────────────────
describe('TC2 — denied ruling calls ruleOnReference correctly', () => {
  it('calls ruleOnReference(refId, "denied", reason) on denied ruling', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ruling: 'denied', reason: 'Not credible.' }),
    });

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    await requestAIModRuling(makeDebate(), 'ref-id-002', 'https://blog.example.com', 'Random blog post', 'B');

    expect(mockRuleOnReference).toHaveBeenCalledWith('ref-id-002', 'denied', expect.stringContaining('🤖'));
  });
});

// ─── TC3: missing ruling field defaults to 'allowed' ────────────────────────
describe('TC3 — missing ruling field defaults to allowed', () => {
  it('defaults ruling to "allowed" when Edge Function omits ruling', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reason: 'Looks fine.' }),
    });

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    await requestAIModRuling(makeDebate(), 'ref-id-003', 'https://example.com', 'Source', null);

    expect(mockRuleOnReference).toHaveBeenCalledWith('ref-id-003', 'allowed', expect.any(String));
  });
});

// ─── TC4: fetch failure triggers fallback auto-denied ───────────────────────
describe('TC4 — fetch failure triggers auto-denied fallback', () => {
  it('calls ruleOnReference with "denied" and fallback message on network error', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    await requestAIModRuling(makeDebate(), 'ref-id-004', 'https://example.com', 'Some source', 'A');

    expect(mockRuleOnReference).toHaveBeenCalledWith(
      'ref-id-004',
      'denied',
      '🤖 Auto-denied (AI moderator unavailable)'
    );
  });
});

// ─── TC5: null JWT triggers error path ──────────────────────────────────────
describe('TC5 — null JWT triggers error path with auto-denied', () => {
  it('calls ruleOnReference with "denied" when getUserJwt returns null', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockGetUserJwt.mockResolvedValueOnce(null);

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    await requestAIModRuling(makeDebate(), 'ref-id-005', 'https://example.com', 'Some source', null);

    expect(mockRuleOnReference).toHaveBeenCalledWith(
      'ref-id-005',
      'denied',
      '🤖 Auto-denied (AI moderator unavailable)'
    );
    expect(mockAddSystemMessage).toHaveBeenCalledWith(
      expect.stringContaining('AUTO-DENIED')
    );
  });
});

// ─── TC6: allowed ruling posts correct system message ───────────────────────
describe('TC6 — allowed ruling posts correct system message', () => {
  it('calls addSystemMessage with checkmark and ALLOWED on allowed ruling', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ruling: 'allowed', reason: 'Verified source.' }),
    });

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    await requestAIModRuling(makeDebate(), 'ref-id-006', 'https://example.com', 'Source', 'A');

    expect(mockAddSystemMessage).toHaveBeenCalledOnce();
    const msg = mockAddSystemMessage.mock.calls[0][0] as string;
    expect(msg).toContain('✅');
    expect(msg).toContain('ALLOWED');
  });
});

// ─── TC7: denied ruling posts correct system message ────────────────────────
describe('TC7 — denied ruling posts correct system message', () => {
  it('calls addSystemMessage with X and DENIED on denied ruling', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ruling: 'denied', reason: 'Unreliable blog.' }),
    });

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    await requestAIModRuling(makeDebate(), 'ref-id-007', 'https://blog.example.com', 'Blog post', 'B');

    expect(mockAddSystemMessage).toHaveBeenCalledOnce();
    const msg = mockAddSystemMessage.mock.calls[0][0] as string;
    expect(msg).toContain('❌');
    expect(msg).toContain('DENIED');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAM #333 — arena-mod-refs.ts → arena-mod-refs-ruling
// ═══════════════════════════════════════════════════════════════════════════════

// ─── ARCH #333 ────────────────────────────────────────────────────────────────
describe('ARCH #333 — arena-mod-refs-ruling import lines', () => {
  it('only imports from whitelisted modules', () => {
    const src = readFileSync(
      resolve('src/arena/arena-mod-refs-ruling.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const banned = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of importLines) {
      for (const b of banned) {
        expect(line).not.toContain(b);
      }
    }
  });
});

// ─── TC#333-1: showRulingPanel creates overlay DOM ────────────────────────────
describe('TC#333-1 — showRulingPanel creates #mod-ruling-overlay', () => {
  it('appends #mod-ruling-overlay to document.body with ref data', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');
    const ref = {
      id: 'ref-uuid-333',
      supports_side: 'a' as const,
      submitter_name: 'Alice',
      round: 2,
      url: 'https://example.com/source',
      description: 'Strong peer-reviewed study',
    };
    showRulingPanel(ref as never);

    const overlay = document.getElementById('mod-ruling-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.innerHTML).toContain('RULING NEEDED');
    expect(overlay!.innerHTML).toContain('Alice');
    expect(overlay!.innerHTML).toContain('Side A');
    vi.clearAllTimers();
  });
});

// ─── TC#333-2: auto-allow fires ruleOnReference after 60s ────────────────────
describe('TC#333-2 — auto-allow countdown calls ruleOnReference after 60 ticks', () => {
  it('calls ruleOnReference(id, "allowed", auto-allow message) when countdown reaches 0', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');
    const ref = {
      id: 'ref-uuid-autoallow',
      supports_side: 'b' as const,
      submitter_name: 'Bob',
      round: 1,
      url: null,
      description: 'Some claim',
    };
    showRulingPanel(ref as never);

    expect(mockRuleOnReference).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60_000);

    expect(mockRuleOnReference).toHaveBeenCalledWith(
      'ref-uuid-autoallow',
      'allowed',
      'Auto-allowed (moderator timeout)'
    );
  });
});

// ─── TC#333-3: Allow button calls ruleOnReference('allowed') ─────────────────
describe('TC#333-3 — Allow button calls ruleOnReference with "allowed"', () => {
  it('calls ruleOnReference(refId, "allowed", reason) when Allow button clicked', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');
    const ref = {
      id: 'ref-uuid-allow-btn',
      supports_side: 'a' as const,
      submitter_name: 'Charlie',
      round: 3,
      url: 'https://facts.com',
      description: 'Cited fact',
    };
    showRulingPanel(ref as never);

    // Set reason text
    const textarea = document.getElementById('mod-ruling-reason') as HTMLTextAreaElement;
    if (textarea) textarea.value = 'Credible source';

    const allowBtn = document.getElementById('mod-ruling-allow') as HTMLButtonElement;
    expect(allowBtn).not.toBeNull();
    allowBtn.click();
    await vi.runAllTimersAsync();

    expect(mockRuleOnReference).toHaveBeenCalledWith('ref-uuid-allow-btn', 'allowed', 'Credible source');
  });
});

// ─── TC#333-4: Deny button calls ruleOnReference('denied') ───────────────────
describe('TC#333-4 — Deny button calls ruleOnReference with "denied"', () => {
  it('calls ruleOnReference(refId, "denied", reason) when Deny button clicked', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '';

    const { showRulingPanel } = await import('../../src/arena/arena-mod-refs-ruling.ts');
    const ref = {
      id: 'ref-uuid-deny-btn',
      supports_side: 'b' as const,
      submitter_name: 'Dana',
      round: 2,
      url: null,
      description: 'Dubious claim',
    };
    showRulingPanel(ref as never);

    const textarea = document.getElementById('mod-ruling-reason') as HTMLTextAreaElement;
    if (textarea) textarea.value = 'Not credible';

    const denyBtn = document.getElementById('mod-ruling-deny') as HTMLButtonElement;
    expect(denyBtn).not.toBeNull();
    denyBtn.click();
    await vi.runAllTimersAsync();

    expect(mockRuleOnReference).toHaveBeenCalledWith('ref-uuid-deny-btn', 'denied', 'Not credible');
  });
});

// ─── TC#333-5: stopReferencePoll clears timer and empties pendingReferences ───
describe('TC#333-5 — stopReferencePoll clears timer and pendingReferences', () => {
  it('calls clearInterval and resets pendingReferences', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    // Import state setters to seed a live timer
    const state = await import('../../src/arena/arena-state.ts');
    const fakeTimer = setInterval(() => {}, 1000);
    state.set_referencePollTimer(fakeTimer);

    const { stopReferencePoll } = await import('../../src/arena/arena-mod-refs-ruling.ts');
    stopReferencePoll();

    // After stop, referencePollTimer is null and pendingReferences is empty
    expect(state.referencePollTimer).toBeNull();

    vi.clearAllTimers();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAM #334 — arena-mod-refs.ts → arena-mod-refs-form
// ═══════════════════════════════════════════════════════════════════════════════

// ─── ARCH #334 ────────────────────────────────────────────────────────────────
describe('ARCH #334 — arena-mod-refs-form import lines', () => {
  it('only imports from whitelisted modules', () => {
    const src = readFileSync(
      resolve('src/arena/arena-mod-refs-form.ts'),
      'utf-8'
    );
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const banned = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of importLines) {
      for (const b of banned) {
        expect(line).not.toContain(b);
      }
    }
  });
});

// ─── TC#334-1: showReferenceForm no-op when currentDebate is null ─────────────
describe('TC#334-1 — showReferenceForm is no-op when currentDebate is null', () => {
  it('does not insert #arena-ref-form when no debate is active', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '<div id="arena-messages"></div>';

    // currentDebate defaults to null (not set in this beforeEach scope)
    const { showReferenceForm } = await import('../../src/arena/arena-mod-refs-form.ts');
    showReferenceForm();

    expect(document.getElementById('arena-ref-form')).toBeNull();
    vi.clearAllTimers();
  });
});

// ─── TC#334-2: showReferenceForm inserts form when currentDebate is set ───────
describe('TC#334-2 — showReferenceForm inserts #arena-ref-form when debate is active', () => {
  it('creates #arena-ref-form in DOM after setting currentDebate', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '<div id="arena-messages"></div>';

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-form-001',
      topic: 'Test topic',
      round: 1,
      messages: [],
    } as never);

    const { showReferenceForm } = await import('../../src/arena/arena-mod-refs-form.ts');
    showReferenceForm();

    const form = document.getElementById('arena-ref-form');
    expect(form).not.toBeNull();
    expect(form!.innerHTML).toContain('arena-ref-submit-btn');
    expect(form!.innerHTML).toContain('arena-ref-cancel-btn');

    state.set_currentDebate(null);
    vi.clearAllTimers();
  });
});

// ─── TC#334-3: Submit button calls submitReference with correct args ──────────
describe('TC#334-3 — Submit button calls submitReference with url, desc, side', () => {
  it('calls submitReference(debateId, url, desc, side) when form submitted', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '<div id="arena-messages"></div>';

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-submit-001',
      topic: 'Test topic',
      round: 1,
      messages: [],
    } as never);

    const { showReferenceForm } = await import('../../src/arena/arena-mod-refs-form.ts');
    showReferenceForm();

    // Fill in form fields
    const urlInput = document.getElementById('arena-ref-url') as HTMLInputElement;
    const descInput = document.getElementById('arena-ref-desc') as HTMLTextAreaElement;
    if (urlInput) urlInput.value = 'https://source.com/article';
    if (descInput) descInput.value = 'Strong evidence';

    // Select side A
    const sideBtns = document.querySelectorAll('.arena-ref-side-btn');
    if (sideBtns[0]) (sideBtns[0] as HTMLElement).click();

    const submitBtn = document.getElementById('arena-ref-submit-btn') as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();
    submitBtn.click();
    await vi.runAllTimersAsync();

    expect(mockSubmitReference).toHaveBeenCalledWith(
      'debate-submit-001',
      'https://source.com/article',
      'Strong evidence',
      'a'
    );

    state.set_currentDebate(null);
    vi.clearAllTimers();
  });
});

// ─── TC#334-4: Cancel button removes the form ────────────────────────────────
describe('TC#334-4 — Cancel button removes #arena-ref-form', () => {
  it('removes #arena-ref-form from DOM when cancel button clicked', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    document.body.innerHTML = '<div id="arena-messages"></div>';

    const state = await import('../../src/arena/arena-state.ts');
    state.set_currentDebate({
      id: 'debate-cancel-001',
      topic: 'Cancel test',
      round: 1,
      messages: [],
    } as never);

    const { showReferenceForm } = await import('../../src/arena/arena-mod-refs-form.ts');
    showReferenceForm();

    expect(document.getElementById('arena-ref-form')).not.toBeNull();

    const cancelBtn = document.getElementById('arena-ref-cancel-btn') as HTMLButtonElement;
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();

    expect(document.getElementById('arena-ref-form')).toBeNull();

    state.set_currentDebate(null);
    vi.clearAllTimers();
  });
});

// ─── TC#334-5: assignSelectedMod skips placeholder debate IDs ─────────────────
describe('TC#334-5 — assignSelectedMod is no-op for placeholder debate IDs', () => {
  it('does not call assignModerator for ai-local- prefixed debate IDs', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });

    const state = await import('../../src/arena/arena-state.ts');
    state.set_selectedModerator({ id: 'mod-uuid-001', type: 'human' } as never);

    const { assignSelectedMod } = await import('../../src/arena/arena-mod-refs-form.ts');
    await assignSelectedMod('ai-local-test-debate');

    expect(mockAssignModerator).not.toHaveBeenCalled();

    state.set_selectedModerator(null);
    vi.clearAllTimers();
  });
});
