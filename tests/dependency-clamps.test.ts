/**
 * Tests for src/contracts/dependency-clamps.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockTrackEvent = vi.hoisted(() => vi.fn());

vi.mock('../src/analytics.ts', () => ({
  trackEvent: mockTrackEvent,
}));

import {
  clampRealtime,
  clampStripe,
  clampDeepgram,
  clampVercel,
} from '../src/contracts/dependency-clamps.ts';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── clampRealtime ──────────────────────────────────────────────────────────────

describe('clampRealtime — SUBSCRIBED after disconnect fires reconnect event', () => {
  it('TC1: fires clamp:realtime:reconnect when reconnecting from disconnected', () => {
    // Must go connected → disconnected → reconnected to trigger the reconnect event
    clampRealtime('SUBSCRIBED', 'debate:d1');  // sets connected
    clampRealtime('TIMED_OUT', 'debate:d1');   // sets disconnectAt
    vi.clearAllMocks();
    clampRealtime('SUBSCRIBED', 'debate:d1');  // reconnect
    expect(mockTrackEvent).toHaveBeenCalledWith('clamp:realtime:reconnect', expect.objectContaining({ channel: 'debate:d1' }));
  });
});

describe('clampRealtime — SUBSCRIBED from idle is silent', () => {
  it('TC2: does not fire reconnect event on first-time SUBSCRIBED', () => {
    clampRealtime('SUBSCRIBED', 'debate:fresh');
    expect(mockTrackEvent).not.toHaveBeenCalledWith('clamp:realtime:reconnect', expect.anything());
  });
});

describe('clampRealtime — TIMED_OUT fires disconnect event', () => {
  it('TC3: fires clamp:realtime:disconnect when going from connected to TIMED_OUT', () => {
    clampRealtime('SUBSCRIBED', 'chan');
    vi.clearAllMocks();
    clampRealtime('TIMED_OUT', 'chan');
    expect(mockTrackEvent).toHaveBeenCalledWith('clamp:realtime:disconnect', expect.objectContaining({ channel: 'chan', status: 'TIMED_OUT' }));
  });
});

describe('clampRealtime — CHANNEL_ERROR fires error event', () => {
  it('TC4: fires clamp:realtime:error on CHANNEL_ERROR', () => {
    clampRealtime('CHANNEL_ERROR', 'chan2', new Error('timeout'));
    expect(mockTrackEvent).toHaveBeenCalledWith('clamp:realtime:error', expect.objectContaining({ channel: 'chan2' }));
  });
});

// ── clampStripe ────────────────────────────────────────────────────────────────

describe('clampStripe — fires failure event on null response', () => {
  it('TC5: fires clamp:stripe:failure when response is null', () => {
    clampStripe('create_session', null, 'network error');
    expect(mockTrackEvent).toHaveBeenCalledWith('clamp:stripe:failure', expect.objectContaining({ action: 'create_session' }));
  });
});

describe('clampStripe — fires failure event on non-ok response', () => {
  it('TC6: fires clamp:stripe:failure for HTTP 500', () => {
    const response = { ok: false, status: 500 } as Response;
    clampStripe('create_session', response);
    expect(mockTrackEvent).toHaveBeenCalledWith('clamp:stripe:failure', expect.objectContaining({ http_status: 500 }));
  });
});

describe('clampStripe — silent on ok response', () => {
  it('TC7: does not fire any trackEvent on successful response', () => {
    const response = { ok: true, status: 200 } as Response;
    clampStripe('create_session', response);
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});

// ── clampDeepgram ──────────────────────────────────────────────────────────────

describe('clampDeepgram — error then live fires recovered event', () => {
  it('TC8: fires clamp:deepgram:recovered when transitioning from error to live', () => {
    clampDeepgram('connecting');
    clampDeepgram('error');
    vi.clearAllMocks();
    clampDeepgram('live');
    expect(mockTrackEvent).toHaveBeenCalledWith('clamp:deepgram:recovered', expect.anything());
  });
});

describe('clampDeepgram — error fires error event', () => {
  it('TC9: fires clamp:deepgram:error on error status', () => {
    clampDeepgram('error');
    expect(mockTrackEvent).toHaveBeenCalledWith('clamp:deepgram:error', expect.anything());
  });
});

describe('clampDeepgram — paused fires paused event', () => {
  it('TC10: fires clamp:deepgram:paused on paused status', () => {
    clampDeepgram('paused');
    expect(mockTrackEvent).toHaveBeenCalledWith('clamp:deepgram:paused', expect.anything());
  });
});

// ── clampVercel ────────────────────────────────────────────────────────────────

describe('clampVercel — fires failure on null response', () => {
  it('TC11: fires clamp:vercel:failure when response is null', () => {
    clampVercel('/api/profile', null, 'network failure');
    expect(mockTrackEvent).toHaveBeenCalledWith('clamp:vercel:failure', expect.objectContaining({ route: '/api/profile', http_status: 0 }));
  });
});

describe('clampVercel — fires failure on HTTP 4xx/5xx', () => {
  it('TC12: fires clamp:vercel:failure for 404 response', () => {
    clampVercel('/api/profile', { status: 404 } as Response, 'not found');
    expect(mockTrackEvent).toHaveBeenCalledWith('clamp:vercel:failure', expect.objectContaining({ http_status: 404 }));
  });
});

describe('clampVercel — silent on 2xx response', () => {
  it('TC13: does not fire trackEvent on HTTP 200', () => {
    clampVercel('/api/profile', { status: 200 } as Response);
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});

describe('ARCH — src/contracts/dependency-clamps.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../analytics.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/contracts/dependency-clamps.ts'),
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
