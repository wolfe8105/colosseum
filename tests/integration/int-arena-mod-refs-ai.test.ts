/**
 * Integration tests — seam #186
 * src/arena/arena-mod-refs-ai.ts → arena-room-live-messages
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Supabase mock ────────────────────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => {
  const rpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
  const getSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
  const onAuthStateChange = vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  const client = {
    rpc,
    auth: { getSession, onAuthStateChange },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { createClient: vi.fn(() => client) };
});

// ─── Helper: create #arena-messages div with scrollTo polyfill ───────────────
function makeDom(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = 'arena-messages';
  // jsdom does not implement scrollTo on elements — polyfill it
  (el as HTMLDivElement & { scrollTo: unknown }).scrollTo = vi.fn();
  document.body.appendChild(el);
  return el;
}

function buildDebate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'debate-uuid-001',
    topic: 'AI will replace jobs',
    round: 2,
    role: 'A' as const,
    opponentName: 'Opponent',
    messages: [
      { role: 'user', text: 'Point one', round: 1 },
      { role: 'assistant', text: 'Counter one', round: 1 },
    ],
    ...overrides,
  };
}

// ─── Supabase client factory for re-mock after resetModules ──────────────────
function makeSupabaseMock(sessionToken: string | null = 'test-jwt-token', rpcResult = { data: { success: true }, error: null }) {
  return {
    createClient: vi.fn(() => ({
      rpc: vi.fn().mockResolvedValue(rpcResult),
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: sessionToken ? { access_token: sessionToken } : null },
          error: null,
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  };
}

// ─── ARCH filter ─────────────────────────────────────────────────────────────
describe('ARCH: arena-mod-refs-ai imports', () => {
  const source = readFileSync(
    resolve(__dirname, '../../src/arena/arena-mod-refs-ai.ts'),
    'utf-8',
  );
  const importLines = source.split('\n').filter((l) => /from\s+['"]/.test(l));

  it('only imports from allowed modules (no banned deps)', () => {
    const banned = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const line of importLines) {
      for (const token of banned) {
        expect(line, `Banned import found: ${line}`).not.toContain(token);
      }
    }
  });

  it('imports addSystemMessage from arena-room-live-messages', () => {
    const hasImport = importLines.some(
      (l) => l.includes('arena-room-live-messages') && l.includes('addSystemMessage'),
    );
    expect(hasImport).toBe(true);
  });
});

// ─── addSystemMessage DOM integration ────────────────────────────────────────
describe('addSystemMessage — DOM integration', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC1: appends a system message div when #arena-messages exists', async () => {
    makeDom();
    const { addSystemMessage } = await import('../../src/arena/arena-room-live-messages.ts');
    addSystemMessage('Test system message');
    const messages = document.getElementById('arena-messages')!;
    expect(messages.children.length).toBe(1);
    expect(messages.children[0].textContent).toBe('Test system message');
    expect(messages.children[0].className).toContain('system');
    expect(messages.children[0].className).toContain('arena-fade-in');
  });

  it('TC2: is a no-op when #arena-messages is absent', async () => {
    // No DOM setup — should not throw
    const { addSystemMessage } = await import('../../src/arena/arena-room-live-messages.ts');
    expect(() => addSystemMessage('no container')).not.toThrow();
  });

  it('TC3: multiple calls append multiple children in order', async () => {
    makeDom();
    const { addSystemMessage } = await import('../../src/arena/arena-room-live-messages.ts');
    addSystemMessage('First');
    addSystemMessage('Second');
    const messages = document.getElementById('arena-messages')!;
    expect(messages.children.length).toBe(2);
    expect(messages.children[0].textContent).toBe('First');
    expect(messages.children[1].textContent).toBe('Second');
  });
});

// ─── requestAIModRuling — allowed ruling ─────────────────────────────────────
describe('requestAIModRuling — allowed ruling', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
    makeDom();

    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ruling: 'allowed', reason: 'Source is credible' }),
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('TC4: calls fetch to edge function and shows allowed icon in DOM', async () => {
    vi.doMock('@supabase/supabase-js', () => makeSupabaseMock('test-jwt-token'));

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    const debate = buildDebate();

    await requestAIModRuling(debate as never, 'ref-uuid-001', 'https://example.com', 'Good source', 'A');

    // fetch was called with the edge function URL
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/functions/v1/ai-moderator');
    expect(opts.method).toBe('POST');

    // DOM: allowed icon appended
    const messages = document.getElementById('arena-messages')!;
    const texts = Array.from(messages.children).map((c) => c.textContent ?? '');
    expect(texts.some((t) => t.includes('AI Moderator') && t.includes('ALLOWED'))).toBe(true);
    expect(texts.some((t) => t.includes('✅'))).toBe(true);
  });

  it('TC5: calls fetch with correct body shape — topic, reference, round, debateContext', async () => {
    vi.doMock('@supabase/supabase-js', () => makeSupabaseMock('jwt-abc'));

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    const debate = buildDebate({ topic: 'Climate change', round: 3 });

    await requestAIModRuling(debate as never, 'ref-uuid-002', 'https://source.com', 'Climate study', 'B');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.topic).toBe('Climate change');
    expect(body.round).toBe(3);
    expect(body.reference.url).toBe('https://source.com');
    expect(body.reference.description).toBe('Climate study');
    expect(body.reference.supports_side).toBe('B');
  });
});

// ─── requestAIModRuling — denied ruling ──────────────────────────────────────
describe('requestAIModRuling — denied ruling', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
    makeDom();

    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ruling: 'denied', reason: 'Unreliable source' }),
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('TC6: appends denied icon when edge function returns denied', async () => {
    vi.doMock('@supabase/supabase-js', () => makeSupabaseMock('jwt-xyz'));

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    const debate = buildDebate();

    await requestAIModRuling(debate as never, 'ref-uuid-003', 'https://bad.com', 'Bad source', null);

    const messages = document.getElementById('arena-messages')!;
    const texts = Array.from(messages.children).map((c) => c.textContent ?? '');
    expect(texts.some((t) => t.includes('DENIED') && t.includes('Unreliable source'))).toBe(true);
    expect(texts.some((t) => t.includes('❌'))).toBe(true);
  });
});

// ─── requestAIModRuling — error paths ────────────────────────────────────────
describe('requestAIModRuling — error paths', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
    makeDom();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('TC7: edge function non-ok status → auto-denied system message in DOM', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));
    vi.doMock('@supabase/supabase-js', () => makeSupabaseMock('jwt-err'));

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    const debate = buildDebate();

    await requestAIModRuling(debate as never, 'ref-uuid-004', 'https://fail.com', 'Failing source', 'A');

    const messages = document.getElementById('arena-messages')!;
    const texts = Array.from(messages.children).map((c) => c.textContent ?? '');
    expect(texts.some((t) => t.includes('AUTO-DENIED') && t.includes('moderator unavailable'))).toBe(true);
    expect(texts.some((t) => t.includes('❌'))).toBe(true);
  });

  it('TC8: getUserJwt returns null → catch path fires auto-denied system message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ruling: 'allowed', reason: 'Fine' }),
    }));
    // null session → getUserJwt returns null → throws "Not authenticated"
    vi.doMock('@supabase/supabase-js', () => makeSupabaseMock(null));

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    const debate = buildDebate();

    await requestAIModRuling(debate as never, 'ref-uuid-005', 'https://any.com', 'Any source', null);

    const messages = document.getElementById('arena-messages')!;
    const texts = Array.from(messages.children).map((c) => c.textContent ?? '');
    // catch path always lands on auto-denied
    expect(texts.some((t) => t.includes('AUTO-DENIED'))).toBe(true);
  });

  it('TC9: ruleOnReference returning error object still shows system message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ruling: 'allowed', reason: 'OK source' }),
    }));
    // rpc returns error in the data shape that ruleOnReference handles via console.warn
    vi.doMock('@supabase/supabase-js', () =>
      makeSupabaseMock('jwt-rpc-err', { data: { success: false }, error: null })
    );

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    const debate = buildDebate();

    await requestAIModRuling(debate as never, 'ref-uuid-006', 'https://ok.com', 'OK source', 'A');

    // System message still appended despite rpc returning failure
    const messages = document.getElementById('arena-messages')!;
    expect(messages.children.length).toBeGreaterThanOrEqual(1);
    const texts = Array.from(messages.children).map((c) => c.textContent ?? '');
    expect(texts.some((t) => t.includes('AI Moderator'))).toBe(true);
  });
});

// ─── debateContext slicing ────────────────────────────────────────────────────
describe('requestAIModRuling — debateContext slicing', () => {
  let capturedBody: Record<string, unknown> | null = null;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '';
    makeDom();
    capturedBody = null;

    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedBody = JSON.parse(opts.body as string);
      return Promise.resolve({
        ok: true,
        json: async () => ({ ruling: 'allowed', reason: 'Fine' }),
      });
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('TC10: slices messages to last 6 and formats them as Side A/B lines', async () => {
    vi.doMock('@supabase/supabase-js', () => makeSupabaseMock('jwt-slice'));

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');

    // 9 messages — should slice to last 6
    const msgs = Array.from({ length: 9 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      text: `Message ${i + 1}`,
      round: Math.floor(i / 2) + 1,
    }));
    const debate = buildDebate({ messages: msgs });

    await requestAIModRuling(debate as never, 'ref-uuid-007', 'https://test.com', 'Test', 'A');

    expect(capturedBody).not.toBeNull();
    const context = (capturedBody as Record<string, unknown>).debateContext as string;
    // Should have exactly 6 lines (last 6 messages)
    const lines = context.split('\n').filter(Boolean);
    expect(lines.length).toBe(6);
    // Lines should start with "Side A" or "Side B"
    for (const line of lines) {
      expect(line).toMatch(/^Side [AB]/);
    }
    // First included message is index 3 (0-based) → "Message 4"
    expect(lines[0]).toContain('Message 4');
  });

  it('TC11: empty messages array results in null debateContext', async () => {
    vi.doMock('@supabase/supabase-js', () => makeSupabaseMock('jwt-empty'));

    const { requestAIModRuling } = await import('../../src/arena/arena-mod-refs-ai.ts');
    const debate = buildDebate({ messages: [] });

    await requestAIModRuling(debate as never, 'ref-uuid-008', 'https://empty.com', 'Empty', null);

    expect(capturedBody).not.toBeNull();
    expect((capturedBody as Record<string, unknown>).debateContext).toBeNull();
  });
});
