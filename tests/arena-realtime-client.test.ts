// ============================================================
// ARENA REALTIME CLIENT — tests/arena-realtime-client.test.ts
// Source: src/arena/arena-realtime-client.ts
//
// CLASSIFICATION:
//   getAccessToken()   — Async wrapper → Contract test
//   setRealtimeAuth()  — Delegate wrapper → Behavioral test
//   createChannel()    — Delegate wrapper → Behavioral test
//   removeChannel()    — Delegate wrapper → Behavioral test
//
// IMPORTS:
//   type { SupabaseClient }  from '@supabase/supabase-js'
//   type { RealtimeChannel } from '../webrtc.types.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAccessToken,
  setRealtimeAuth,
  createChannel,
  removeChannel,
} from '../src/arena/arena-realtime-client.ts';

const makeClient = (overrides: Record<string, unknown> = {}) => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { access_token: 'tok-abc' } },
    }),
  },
  realtime: { setAuth: vi.fn() },
  channel: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
  removeChannel: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ── TC1: getAccessToken — returns token from session ─────────

describe('TC1 — getAccessToken: returns access_token from getSession', () => {
  it('returns the access_token string', async () => {
    const client = makeClient();
    const result = await getAccessToken(client as never);
    expect(result).toBe('tok-abc');
  });
});

// ── TC2: getAccessToken — returns null when no session ───────

describe('TC2 — getAccessToken: returns null when session is null', () => {
  it('returns null when getSession returns null session', async () => {
    const client = makeClient({
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    });
    const result = await getAccessToken(client as never);
    expect(result).toBeNull();
  });
});

// ── TC3: setRealtimeAuth — delegates to realtime.setAuth ─────

describe('TC3 — setRealtimeAuth: calls realtime.setAuth with token', () => {
  it('passes token to realtime.setAuth', () => {
    const client = makeClient();
    setRealtimeAuth(client as never, 'my-jwt');
    expect(client.realtime.setAuth).toHaveBeenCalledWith('my-jwt');
  });
});

// ── TC4: createChannel — calls channel() with name ───────────

describe('TC4 — createChannel: calls client.channel with the channel name', () => {
  it('passes channel name to client.channel', () => {
    const client = makeClient();
    createChannel(client as never, 'debate:123');
    expect(client.channel).toHaveBeenCalledWith('debate:123', undefined);
  });
});

// ── TC5: createChannel — passes private config when opts given ─

describe('TC5 — createChannel: passes {config:{private:true}} when opts.private=true', () => {
  it('wraps opts in config object', () => {
    const client = makeClient();
    createChannel(client as never, 'debate:123', { private: true });
    expect(client.channel).toHaveBeenCalledWith('debate:123', { config: { private: true } });
  });
});

// ── TC6: createChannel — returns the channel object ──────────

describe('TC6 — createChannel: returns the channel returned by client.channel', () => {
  it('returns whatever client.channel returns', () => {
    const fakeChannel = { subscribe: vi.fn() };
    const client = makeClient({ channel: vi.fn().mockReturnValue(fakeChannel) });
    const result = createChannel(client as never, 'ch');
    expect(result).toBe(fakeChannel);
  });
});

// ── TC7: removeChannel — calls client.removeChannel ──────────

describe('TC7 — removeChannel: calls client.removeChannel with channel', () => {
  it('delegates to client.removeChannel', () => {
    const client = makeClient();
    const channel = { unsubscribe: vi.fn() };
    removeChannel(client as never, channel as never);
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-realtime-client.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['@supabase/supabase-js', '../webrtc.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-realtime-client.ts'),
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
