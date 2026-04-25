/**
 * GK Tests — F-07 Spectator Chat
 * Source: src/arena/arena-feed-spec-chat.ts
 *
 * Spec: docs/THE-MODERATOR-PUNCH-LIST.md row F-07 (line 72)
 * "In-debate spectator chat panel — collapsed by default, 5s poll via
 * get_spectator_chat, send via send_spectator_chat, report button → mailto,
 * cleanupSpecChat() on room exit, hidden from debaters/mods entirely."
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Hoisted mocks (must precede vi.mock factories) ────────────────────────────
const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getCurrentProfile: mockGetCurrentProfile,
}));

vi.mock('../src/contracts/rpc-schemas.ts', () => ({
  get_spectator_chat: {},
  send_spectator_chat: {},
}));

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

import { initSpecChat, destroy } from '../src/arena/arena-feed-spec-chat.ts';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SAMPLE_MSG = {
  id: 'msg-abc-1',
  user_id: 'user-999',
  display_name: 'Alice',
  avatar_url: null,
  message: 'Great debate!',
  created_at: '2026-01-01T00:00:01Z',
};

function buildPanel(loggedIn = true): void {
  document.body.innerHTML = '<div id="feed-spec-chat-panel"></div>';
  mockGetCurrentProfile.mockReturnValue(
    loggedIn ? { id: 'user-1', display_name: 'Tester' } : null,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  buildPanel();
  mockSafeRpc.mockResolvedValue({ data: [], error: null });
});

afterEach(() => {
  destroy();
});

// ── TC-01 — Panel collapsed by default ───────────────────────────────────────

describe('TC-01 — panel collapsed by default', () => {
  it('spec-chat-body has display:none immediately after init', () => {
    initSpecChat('debate-1');
    const body = document.getElementById('spec-chat-body');
    expect(body).not.toBeNull();
    expect(body!.style.display).toBe('none');
  });
});

// ── TC-02 — Clicking header expands panel ─────────────────────────────────────

describe('TC-02 — clicking header expands panel', () => {
  it('spec-chat-body becomes visible after header click', () => {
    initSpecChat('debate-1');
    document.getElementById('spec-chat-hdr')!.click();
    const body = document.getElementById('spec-chat-body');
    expect(body!.style.display).not.toBe('none');
  });

  it('spec-chat-toggle icon changes to ▲ when expanded', () => {
    initSpecChat('debate-1');
    document.getElementById('spec-chat-hdr')!.click();
    const toggle = document.getElementById('spec-chat-toggle');
    expect(toggle!.textContent).toBe('▲');
  });

  it('second click re-collapses panel', () => {
    initSpecChat('debate-1');
    document.getElementById('spec-chat-hdr')!.click();
    document.getElementById('spec-chat-hdr')!.click();
    const body = document.getElementById('spec-chat-body');
    expect(body!.style.display).toBe('none');
  });
});

// ── TC-03 — Polls every 5 seconds ─────────────────────────────────────────────

describe('TC-03 — polls every 5 seconds', () => {
  it('safeRpc is called again after 5000 ms', async () => {
    vi.useFakeTimers();
    try {
      initSpecChat('debate-1');
      await Promise.resolve();
      const beforeCount = mockSafeRpc.mock.calls.length;
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
      expect(mockSafeRpc.mock.calls.length).toBeGreaterThan(beforeCount);
    } finally {
      vi.useRealTimers();
    }
  });

  it('safeRpc is called a third time after 10000 ms', async () => {
    vi.useFakeTimers();
    try {
      initSpecChat('debate-1');
      await Promise.resolve();
      vi.advanceTimersByTime(10000);
      await Promise.resolve();
      // 1 initial + 2 polls = at least 3 calls
      expect(mockSafeRpc.mock.calls.length).toBeGreaterThanOrEqual(3);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ── TC-04 — get_spectator_chat RPC called with p_debate_id ────────────────────

describe('TC-04 — get_spectator_chat RPC called with p_debate_id', () => {
  it('safeRpc receives "get_spectator_chat" as the function name', async () => {
    initSpecChat('debate-abc');
    await Promise.resolve();
    const names = mockSafeRpc.mock.calls.map((c) => c[0]);
    expect(names).toContain('get_spectator_chat');
  });

  it('get_spectator_chat call includes p_debate_id matching the debate', async () => {
    initSpecChat('debate-xyz');
    await Promise.resolve();
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'get_spectator_chat',
      expect.objectContaining({ p_debate_id: 'debate-xyz' }),
      expect.anything(),
    );
  });
});

// ── TC-05 — send_spectator_chat RPC called on send ────────────────────────────

describe('TC-05 — send_spectator_chat RPC called on send', () => {
  it('clicking the send button calls safeRpc with "send_spectator_chat"', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: { success: true }, error: null })
      .mockResolvedValue({ data: [], error: null });

    initSpecChat('debate-1');
    await Promise.resolve();
    await Promise.resolve();

    const input = document.getElementById('spec-chat-input') as HTMLInputElement;
    input.value = 'Solid point!';
    document.getElementById('spec-chat-send')!.click();
    await Promise.resolve();
    await Promise.resolve();

    const names = mockSafeRpc.mock.calls.map((c) => c[0]);
    expect(names).toContain('send_spectator_chat');
  });
});

// ── TC-06 — send_spectator_chat receives p_debate_id and p_message ─────────────

describe('TC-06 — send_spectator_chat receives p_debate_id and p_message', () => {
  it('send RPC params include the debate ID and trimmed message text', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: { success: true }, error: null })
      .mockResolvedValue({ data: [], error: null });

    initSpecChat('debate-send-test');
    await Promise.resolve();
    await Promise.resolve();

    const input = document.getElementById('spec-chat-input') as HTMLInputElement;
    input.value = '  Fire take!  ';
    document.getElementById('spec-chat-send')!.click();
    await Promise.resolve();
    await Promise.resolve();

    const sendCall = mockSafeRpc.mock.calls.find((c) => c[0] === 'send_spectator_chat');
    expect(sendCall).toBeDefined();
    expect(sendCall![1]).toMatchObject({
      p_debate_id: 'debate-send-test',
      p_message: 'Fire take!',
    });
  });
});

// ── TC-07 — Report button navigates to mailto:reports@themoderator.app ────────

describe('TC-07 — report button navigates to mailto:reports@themoderator.app', () => {
  it('clicking report button sets window.location.href to a mailto: address', async () => {
    let capturedHref = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const savedLocation = window.location;
    // @ts-ignore — jsdom allows delete+reassign of location in test env
    delete window.location;
    // @ts-ignore
    window.location = {
      get href() { return capturedHref; },
      set href(v: string) { capturedHref = v; },
    };

    try {
      mockSafeRpc.mockResolvedValue({ data: [SAMPLE_MSG], error: null });
      initSpecChat('debate-1');
      await Promise.resolve();
      await Promise.resolve();

      const btn = document.querySelector<HTMLButtonElement>('.spec-chat-report-btn');
      expect(btn).not.toBeNull();
      btn!.click();

      expect(capturedHref).toContain('mailto:reports@themoderator.app');
    } finally {
      // @ts-ignore
      window.location = savedLocation;
    }
  });
});

// ── TC-08 — Report mailto includes message ID and content ─────────────────────

describe('TC-08 — report mailto URL encodes message ID and content', () => {
  it('mailto href contains encoded message ID and message text', async () => {
    let capturedHref = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const savedLocation = window.location;
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      get href() { return capturedHref; },
      set href(v: string) { capturedHref = v; },
    };

    try {
      mockSafeRpc.mockResolvedValue({ data: [SAMPLE_MSG], error: null });
      initSpecChat('debate-1');
      await Promise.resolve();
      await Promise.resolve();

      const btn = document.querySelector<HTMLButtonElement>('.spec-chat-report-btn');
      btn!.click();

      expect(capturedHref).toContain(encodeURIComponent(SAMPLE_MSG.id));
      expect(capturedHref).toContain(encodeURIComponent(SAMPLE_MSG.message));
    } finally {
      // @ts-ignore
      window.location = savedLocation;
    }
  });
});

// ── TC-09 — destroy() stops polling ───────────────────────────────────────────

describe('TC-09 — destroy() stops polling on room exit', () => {
  it('no further safeRpc calls after destroy()', async () => {
    vi.useFakeTimers();
    try {
      initSpecChat('debate-1');
      await Promise.resolve();
      destroy();
      const callsAtDestroy = mockSafeRpc.mock.calls.length;
      vi.advanceTimersByTime(20000);
      await Promise.resolve();
      expect(mockSafeRpc.mock.calls.length).toBe(callsAtDestroy);
    } finally {
      vi.useRealTimers();
    }
  });

  it('calling destroy() twice does not throw', () => {
    initSpecChat('debate-1');
    expect(() => {
      destroy();
      destroy();
    }).not.toThrow();
  });
});

// ── TC-10 — No panel element → safe no-op (hidden from debaters/mods) ─────────

describe('TC-10 — absent panel element → initSpecChat is a safe no-op', () => {
  it('does not throw when #feed-spec-chat-panel is missing', () => {
    document.body.innerHTML = '';
    expect(() => initSpecChat('debate-1')).not.toThrow();
  });

  it('renders no spec-chat-wrap when panel element is absent', () => {
    document.body.innerHTML = '';
    initSpecChat('debate-1');
    expect(document.getElementById('spec-chat-wrap')).toBeNull();
  });
});

// ── TC-11 — Logged-out user sees login prompt not input ──────────────────────

describe('TC-11 — logged-out user sees login prompt not input', () => {
  it('spec-chat-input absent when user is unauthenticated', () => {
    buildPanel(false);
    initSpecChat('debate-1');
    expect(document.getElementById('spec-chat-input')).toBeNull();
  });

  it('login prompt present when user is unauthenticated', () => {
    buildPanel(false);
    initSpecChat('debate-1');
    expect(document.querySelector('.spec-chat-login-prompt')).not.toBeNull();
  });
});

// ── TC-12 — Logged-in user sees chat input ───────────────────────────────────

describe('TC-12 — logged-in user sees chat input', () => {
  it('spec-chat-input rendered when user is authenticated', () => {
    initSpecChat('debate-1');
    expect(document.getElementById('spec-chat-input')).not.toBeNull();
  });

  it('send button rendered when user is authenticated', () => {
    initSpecChat('debate-1');
    expect(document.getElementById('spec-chat-send')).not.toBeNull();
  });
});

// ── TC-13 — Input cleared after successful send ───────────────────────────────

describe('TC-13 — input cleared after successful send', () => {
  it('input value is empty string after send succeeds', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: { success: true }, error: null })
      .mockResolvedValue({ data: [], error: null });

    initSpecChat('debate-1');
    await Promise.resolve();
    await Promise.resolve();

    const input = document.getElementById('spec-chat-input') as HTMLInputElement;
    input.value = 'send me!';
    document.getElementById('spec-chat-send')!.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(input.value).toBe('');
  });
});

// ── TC-14 — Error shown on send failure ──────────────────────────────────────

describe('TC-14 — error element shown on send failure', () => {
  it('spec-chat-send-error becomes visible when server returns success:false', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: { success: false, error: 'rate limit hit' }, error: null });

    initSpecChat('debate-1');
    await Promise.resolve();
    await Promise.resolve();

    const input = document.getElementById('spec-chat-input') as HTMLInputElement;
    input.value = 'fail message';
    document.getElementById('spec-chat-send')!.click();
    await Promise.resolve();
    await Promise.resolve();

    const errorEl = document.getElementById('spec-chat-send-error');
    expect(errorEl!.style.display).toBe('block');
  });

  it('error element contains the server error message', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: { success: false, error: 'slow down' }, error: null });

    initSpecChat('debate-1');
    await Promise.resolve();
    await Promise.resolve();

    const input = document.getElementById('spec-chat-input') as HTMLInputElement;
    input.value = 'fail message';
    document.getElementById('spec-chat-send')!.click();
    await Promise.resolve();
    await Promise.resolve();

    const errorEl = document.getElementById('spec-chat-send-error');
    expect(errorEl!.textContent).toContain('slow down');
  });
});

// ── TC-15 — Error auto-hides after 3 seconds ─────────────────────────────────

describe('TC-15 — error auto-hides after 3 seconds', () => {
  it('spec-chat-send-error reverts to display:none after 3000 ms', async () => {
    vi.useFakeTimers();
    try {
      mockSafeRpc
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: { success: false, error: 'too fast' }, error: null });

      initSpecChat('debate-1');
      await Promise.resolve();
      await Promise.resolve();

      const input = document.getElementById('spec-chat-input') as HTMLInputElement;
      input.value = 'boom';
      document.getElementById('spec-chat-send')!.click();
      await Promise.resolve();
      await Promise.resolve();

      const errorEl = document.getElementById('spec-chat-send-error');
      expect(errorEl!.style.display).toBe('block');

      vi.advanceTimersByTime(3000);
      await Promise.resolve();

      expect(errorEl!.style.display).toBe('none');
    } finally {
      vi.useRealTimers();
    }
  });
});

// ── TC-16 — Whitespace-only message does not trigger send RPC ─────────────────

describe('TC-16 — whitespace-only message does not trigger send RPC', () => {
  it('send_spectator_chat not called when input is blank whitespace', async () => {
    initSpecChat('debate-1');
    await Promise.resolve();

    const input = document.getElementById('spec-chat-input') as HTMLInputElement;
    input.value = '   ';
    document.getElementById('spec-chat-send')!.click();
    await Promise.resolve();

    expect(mockSafeRpc).not.toHaveBeenCalledWith(
      'send_spectator_chat',
      expect.anything(),
      expect.anything(),
    );
  });

  it('send_spectator_chat not called when input is completely empty', async () => {
    initSpecChat('debate-1');
    await Promise.resolve();

    const input = document.getElementById('spec-chat-input') as HTMLInputElement;
    input.value = '';
    document.getElementById('spec-chat-send')!.click();
    await Promise.resolve();

    expect(mockSafeRpc).not.toHaveBeenCalledWith(
      'send_spectator_chat',
      expect.anything(),
      expect.anything(),
    );
  });
});

// ── TC-17 — User content escaped via escapeHTML ───────────────────────────────

describe('TC-17 — user content escaped via escapeHTML', () => {
  it('escapeHTML called with display_name from returned message', async () => {
    const xssMsg = { ...SAMPLE_MSG, display_name: '<script>alert(1)</script>' };
    mockSafeRpc.mockResolvedValue({ data: [xssMsg], error: null });
    initSpecChat('debate-1');
    await Promise.resolve();
    await Promise.resolve();
    expect(mockEscapeHTML).toHaveBeenCalledWith('<script>alert(1)</script>');
  });

  it('escapeHTML called with message text from returned message', async () => {
    const xssMsg = { ...SAMPLE_MSG, message: '<img onerror="pwned">' };
    mockSafeRpc.mockResolvedValue({ data: [xssMsg], error: null });
    initSpecChat('debate-1');
    await Promise.resolve();
    await Promise.resolve();
    expect(mockEscapeHTML).toHaveBeenCalledWith('<img onerror="pwned">');
  });
});

// ── TC-18 — Messages rendered in ascending created_at order ──────────────────

describe('TC-18 — messages rendered in ascending created_at order', () => {
  it('earlier timestamp appears before later timestamp regardless of server order', async () => {
    const laterMsg = { ...SAMPLE_MSG, id: 'm2', display_name: 'Bob', message: 'second', created_at: '2026-01-01T00:00:02Z' };
    const earlierMsg = { ...SAMPLE_MSG, id: 'm1', display_name: 'Alice', message: 'first', created_at: '2026-01-01T00:00:01Z' };
    // Deliberately return in reverse order
    mockSafeRpc.mockResolvedValue({ data: [laterMsg, earlierMsg], error: null });

    initSpecChat('debate-1');
    await Promise.resolve();
    await Promise.resolve();

    const names = [...document.querySelectorAll('.spec-chat-msg-name')].map((el) => el.textContent);
    expect(names).toEqual(['Alice', 'Bob']);
  });
});

// ── TC-19 — No re-render when maxTime unchanged ───────────────────────────────

describe('TC-19 — no re-render when maxTime unchanged between polls', () => {
  it('escapeHTML not called again on second poll returning identical data', async () => {
    vi.useFakeTimers();
    try {
      mockSafeRpc.mockResolvedValue({ data: [SAMPLE_MSG], error: null });
      initSpecChat('debate-1');
      await Promise.resolve();
      await Promise.resolve();

      const escapeCallsAfterFirstLoad = mockEscapeHTML.mock.calls.length;

      vi.advanceTimersByTime(5000);
      await Promise.resolve();
      await Promise.resolve();

      // Same maxTime → renderMessages not called → escapeHTML not called again
      expect(mockEscapeHTML.mock.calls.length).toBe(escapeCallsAfterFirstLoad);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ── TC-20 — Enter key triggers send ──────────────────────────────────────────

describe('TC-20 — Enter key (without Shift) triggers send', () => {
  it('keydown Enter on chat input calls send_spectator_chat', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: { success: true }, error: null })
      .mockResolvedValue({ data: [], error: null });

    initSpecChat('debate-1');
    await Promise.resolve();
    await Promise.resolve();

    const input = document.getElementById('spec-chat-input') as HTMLInputElement;
    input.value = 'enter key msg';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSafeRpc).toHaveBeenCalledWith(
      'send_spectator_chat',
      expect.objectContaining({ p_message: 'enter key msg' }),
      expect.anything(),
    );
  });

  it('keydown Shift+Enter does not trigger send', async () => {
    initSpecChat('debate-1');
    await Promise.resolve();

    const input = document.getElementById('spec-chat-input') as HTMLInputElement;
    input.value = 'shift enter msg';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    await Promise.resolve();

    expect(mockSafeRpc).not.toHaveBeenCalledWith(
      'send_spectator_chat',
      expect.anything(),
      expect.anything(),
    );
  });
});

// ── ARCH — Import allow-list ──────────────────────────────────────────────────

describe('ARCH — src/arena/arena-feed-spec-chat.ts only imports from allowed modules', () => {
  it('all imports are from the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../config.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-spec-chat.ts'),
      'utf-8',
    );
    const importLines = source
      .split('\n')
      .filter((line) => line.trimStart().startsWith('import '));
    const paths = importLines
      .map((line) => line.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
