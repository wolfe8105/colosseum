/**
 * Integration tests — Seam #287
 * src/contracts/dependency-clamps.ts → analytics
 *
 * analytics.ts uses raw fetch() (intentional, fires before auth init).
 * We mock globalThis.fetch — not @supabase/supabase-js — for analytics calls.
 * @supabase/supabase-js is mocked to prevent createClient errors on import.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---- Supabase mock (required to prevent module init errors) ----
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

// ---- Helpers ----
function capturedEventTypes(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map((call) => {
    try {
      const body = JSON.parse(call[1]?.body as string);
      return body.p_event_type as string;
    } catch {
      return '';
    }
  });
}

function capturedMetadata(
  fetchMock: ReturnType<typeof vi.fn>,
  callIndex = 0,
): Record<string, unknown> {
  const body = JSON.parse(fetchMock.mock.calls[callIndex][1]?.body as string);
  return body.p_metadata as Record<string, unknown>;
}

// ---- ARCH filter test ----
describe('ARCH — dependency-clamps.ts only imports analytics', () => {
  it('imports only from analytics.ts (no heavy deps)', () => {
    const src = readFileSync(
      resolve('src/contracts/dependency-clamps.ts'),
      'utf-8',
    );
    const importLines = src
      .split('\n')
      .filter((l) => /from\s+['"]/.test(l));
    // All imports must reference ../analytics (no webrtc, cards, deepgram module, etc.)
    expect(importLines.length).toBeGreaterThan(0);
    const forbidden = ['webrtc', 'cards', 'arena-deepgram', 'realtime-client', 'voicememo'];
    for (const line of importLines) {
      for (const dep of forbidden) {
        expect(line).not.toContain(dep);
      }
    }
    expect(importLines.some((l) => l.includes('analytics'))).toBe(true);
  });
});

// ============================================================
// TC1 — clampRealtime: first SUBSCRIBED fires no trackEvent
// ============================================================
describe('TC1 — clampRealtime first SUBSCRIBED fires no fetch', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('no fetch call when connecting for the first time', async () => {
    const { clampRealtime } = await import('../../src/contracts/dependency-clamps.ts');
    clampRealtime('SUBSCRIBED', 'test-channel');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC2 — clampRealtime: TIMED_OUT then SUBSCRIBED fires reconnect event
// ============================================================
describe('TC2 — clampRealtime TIMED_OUT then SUBSCRIBED fires clamp:realtime:reconnect', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('fires disconnect then reconnect events with channel in metadata', async () => {
    const { clampRealtime } = await import('../../src/contracts/dependency-clamps.ts');

    // First connect (no event)
    clampRealtime('SUBSCRIBED', 'ch');
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockClear();

    // Disconnect
    clampRealtime('TIMED_OUT', 'ch');
    const disconnectEvents = capturedEventTypes(globalThis.fetch as ReturnType<typeof vi.fn>);
    expect(disconnectEvents).toContain('clamp:realtime:disconnect');

    // Advance time so downtime_ms > 0
    await vi.advanceTimersByTimeAsync(100);

    // Reconnect
    clampRealtime('SUBSCRIBED', 'ch');

    const allEvents = capturedEventTypes(globalThis.fetch as ReturnType<typeof vi.fn>);
    expect(allEvents).toContain('clamp:realtime:reconnect');

    // Find the reconnect call and check metadata
    const reconnectCallIdx = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.findIndex(
      (call) => {
        try {
          return JSON.parse(call[1]?.body as string).p_event_type === 'clamp:realtime:reconnect';
        } catch {
          return false;
        }
      },
    );
    expect(reconnectCallIdx).toBeGreaterThanOrEqual(0);
    const meta = capturedMetadata(globalThis.fetch as ReturnType<typeof vi.fn>, reconnectCallIdx);
    expect(meta.channel).toBe('ch');
    expect(typeof meta.downtime_ms).toBe('number');
  });
});

// ============================================================
// TC3 — clampRealtime CHANNEL_ERROR fires clamp:realtime:error
// ============================================================
describe('TC3 — clampRealtime CHANNEL_ERROR fires clamp:realtime:error', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('fires clamp:realtime:error with error message in metadata', async () => {
    const { clampRealtime } = await import('../../src/contracts/dependency-clamps.ts');

    clampRealtime('CHANNEL_ERROR', 'ch', new Error('socket boom'));

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const events = capturedEventTypes(fetchMock);
    expect(events).toContain('clamp:realtime:error');

    const errCallIdx = fetchMock.mock.calls.findIndex((call) => {
      try {
        return JSON.parse(call[1]?.body as string).p_event_type === 'clamp:realtime:error';
      } catch {
        return false;
      }
    });
    const meta = capturedMetadata(fetchMock, errCallIdx);
    expect(meta.channel).toBe('ch');
    expect(meta.error).toBe('socket boom');
  });
});

// ============================================================
// TC4 — clampStripe failure: non-ok Response fires clamp:stripe:failure
// ============================================================
describe('TC4 — clampStripe failure fires clamp:stripe:failure with http_status', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('fires clamp:stripe:failure with http_status 403', async () => {
    const { clampStripe } = await import('../../src/contracts/dependency-clamps.ts');

    clampStripe('create_session', new Response(null, { status: 403 }));

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const events = capturedEventTypes(fetchMock);
    expect(events).toContain('clamp:stripe:failure');

    const callIdx = fetchMock.mock.calls.findIndex((call) => {
      try {
        return JSON.parse(call[1]?.body as string).p_event_type === 'clamp:stripe:failure';
      } catch {
        return false;
      }
    });
    const meta = capturedMetadata(fetchMock, callIdx);
    expect(meta.http_status).toBe(403);
  });
});

// ============================================================
// TC5 — clampStripe success: ok Response fires no fetch
// ============================================================
describe('TC5 — clampStripe success fires no fetch', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('no fetch call on successful Stripe response', async () => {
    const { clampStripe } = await import('../../src/contracts/dependency-clamps.ts');

    clampStripe('create_session', new Response(null, { status: 200 }));

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC6 — clampDeepgram: error then live fires recovered event
// ============================================================
describe('TC6 — clampDeepgram error → live fires clamp:deepgram:error then clamp:deepgram:recovered', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('fires deepgram:error then deepgram:recovered in sequence', async () => {
    const { clampDeepgram } = await import('../../src/contracts/dependency-clamps.ts');

    clampDeepgram('connecting');
    clampDeepgram('error');
    clampDeepgram('live'); // recover

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const events = capturedEventTypes(fetchMock);
    expect(events).toContain('clamp:deepgram:error');
    expect(events).toContain('clamp:deepgram:recovered');

    // error fires before recovered
    const errIdx = events.indexOf('clamp:deepgram:error');
    const recIdx = events.indexOf('clamp:deepgram:recovered');
    expect(errIdx).toBeLessThan(recIdx);
  });
});

// ============================================================
// TC7 — clampVercel null response fires clamp:vercel:failure with http_status 0
// ============================================================
describe('TC7 — clampVercel null response fires clamp:vercel:failure', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('fires clamp:vercel:failure with http_status 0 and route in metadata', async () => {
    const { clampVercel } = await import('../../src/contracts/dependency-clamps.ts');

    clampVercel('/api/profile', null);

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const events = capturedEventTypes(fetchMock);
    expect(events).toContain('clamp:vercel:failure');

    const callIdx = fetchMock.mock.calls.findIndex((call) => {
      try {
        return JSON.parse(call[1]?.body as string).p_event_type === 'clamp:vercel:failure';
      } catch {
        return false;
      }
    });
    const meta = capturedMetadata(fetchMock, callIdx);
    expect(meta.http_status).toBe(0);
    expect(meta.route).toBe('/api/profile');
  });
});
