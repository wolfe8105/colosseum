/**
 * Tests for src/arena/arena-feed-spec-chat.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockGetCurrentProfile = vi.hoisted(() => vi.fn());
const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockGetSpecChat = vi.hoisted(() => ({}));
const mockSendSpecChat = vi.hoisted(() => ({}));

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

function buildDOM(loggedIn = true) {
  document.body.innerHTML = `
    <div id="feed-spec-chat-panel"></div>
  `;
  if (loggedIn) {
    mockGetCurrentProfile.mockReturnValue({ id: 'user-1', display_name: 'Alice' });
  } else {
    mockGetCurrentProfile.mockReturnValue(null);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  buildDOM();
  // Default: safeRpc returns empty messages
  mockSafeRpc.mockResolvedValue({ data: [], error: null });
});

afterEach(() => {
  destroy();
});

describe('initSpecChat — creates panel HTML', () => {
  it('TC1: renders spec-chat-wrap inside panel', () => {
    initSpecChat('debate-1');
    const wrap = document.getElementById('spec-chat-wrap');
    expect(wrap).not.toBeNull();
  });

  it('TC2: renders input row when user is logged in', () => {
    initSpecChat('debate-1');
    expect(document.getElementById('spec-chat-input')).not.toBeNull();
  });

  it('TC3: renders login prompt when user is not logged in', () => {
    buildDOM(false);
    initSpecChat('debate-1');
    expect(document.getElementById('spec-chat-input')).toBeNull();
    expect(document.querySelector('.spec-chat-login-prompt')).not.toBeNull();
  });
});

describe('initSpecChat — calls safeRpc for initial message load', () => {
  it('TC4: calls safeRpc with get_spectator_chat on init', async () => {
    initSpecChat('debate-1');
    await Promise.resolve();
    expect(mockSafeRpc).toHaveBeenCalledWith('get_spectator_chat', expect.objectContaining({ p_debate_id: 'debate-1' }), expect.anything());
  });
});

describe('initSpecChat — polls every 5s', () => {
  it('TC5: calls safeRpc again after 5 seconds', async () => {
    vi.useFakeTimers();
    try {
      initSpecChat('debate-1');
      await Promise.resolve();
      const initialCalls = mockSafeRpc.mock.calls.length;
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
      expect(mockSafeRpc.mock.calls.length).toBeGreaterThan(initialCalls);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('initSpecChat — toggle expands and collapses chat body', () => {
  it('TC6: clicking header toggles spec-chat-body display', () => {
    initSpecChat('debate-1');
    const body = document.getElementById('spec-chat-body')!;
    expect(body.style.display).toBe('none');
    document.getElementById('spec-chat-hdr')!.click();
    expect(body.style.display).not.toBe('none');
    document.getElementById('spec-chat-hdr')!.click();
    expect(body.style.display).toBe('none');
  });
});

describe('destroy — clears poll interval', () => {
  it('TC7: destroy stops polling (no more safeRpc calls after destroy)', async () => {
    vi.useFakeTimers();
    try {
      initSpecChat('debate-1');
      await Promise.resolve();
      destroy();
      const callsAfterDestroy = mockSafeRpc.mock.calls.length;
      vi.advanceTimersByTime(15000);
      await Promise.resolve();
      expect(mockSafeRpc.mock.calls.length).toBe(callsAfterDestroy);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('destroy — safe to call multiple times', () => {
  it('TC8: calling destroy twice does not throw', () => {
    initSpecChat('debate-1');
    expect(() => { destroy(); destroy(); }).not.toThrow();
  });
});

describe('initSpecChat — send button calls safeRpc with message', () => {
  it('TC9: clicking send calls safeRpc with send_spectator_chat', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: [], error: null }) // initial load
      .mockResolvedValueOnce({ data: { success: true }, error: null }) // send
      .mockResolvedValue({ data: [], error: null }); // reload after send

    initSpecChat('debate-1');
    await Promise.resolve();
    await Promise.resolve();

    // Open chat to make input visible
    document.getElementById('spec-chat-hdr')!.click();

    const input = document.getElementById('spec-chat-input') as HTMLInputElement;
    input.value = 'Hello debate!';
    document.getElementById('spec-chat-send')!.click();

    await Promise.resolve();
    await Promise.resolve();
    expect(mockSafeRpc).toHaveBeenCalledWith(
      'send_spectator_chat',
      expect.objectContaining({ p_debate_id: 'debate-1', p_message: 'Hello debate!' }),
      expect.anything(),
    );
  });
});

describe('initSpecChat — send with empty input does not call safeRpc', () => {
  it('TC10: clicking send when input is empty does not call send_spectator_chat', async () => {
    mockSafeRpc.mockResolvedValue({ data: [], error: null });
    initSpecChat('debate-1');
    await Promise.resolve();

    document.getElementById('spec-chat-hdr')!.click();
    const input = document.getElementById('spec-chat-input') as HTMLInputElement;
    input.value = '   '; // whitespace only
    document.getElementById('spec-chat-send')!.click();

    await Promise.resolve();
    // Only the initial load call should have happened
    expect(mockSafeRpc).not.toHaveBeenCalledWith('send_spectator_chat', expect.anything(), expect.anything());
  });
});

describe('initSpecChat — renders messages when data is returned', () => {
  it('TC11: renders message display names from returned data', async () => {
    mockSafeRpc.mockResolvedValue({
      data: [{
        id: 'm1',
        user_id: 'user-2',
        display_name: 'Bob',
        avatar_url: null,
        message: 'Great debate!',
        created_at: '2026-01-01T00:00:00Z',
      }],
      error: null,
    });
    initSpecChat('debate-1');
    await Promise.resolve();
    await Promise.resolve();
    expect(mockEscapeHTML).toHaveBeenCalledWith('Bob');
  });
});

describe('ARCH — src/arena/arena-feed-spec-chat.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../config.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-spec-chat.ts'),
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
