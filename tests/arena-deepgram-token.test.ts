// ============================================================
// ARENA DEEPGRAM TOKEN — tests/arena-deepgram-token.test.ts
// Source: src/arena/arena-deepgram.token.ts
//
// CLASSIFICATION:
//   fetchDeepgramToken() — fetch wrapper → Contract test
//
// IMPORTS:
//   { getAccessToken } from '../auth.ts'
//   { SUPABASE_URL }   from '../config.ts'
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAccessToken = vi.hoisted(() => vi.fn(() => 'test-jwt'));

vi.mock('../src/auth.ts', () => ({
  getAccessToken: mockGetAccessToken,
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/config.ts', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
}));

import { fetchDeepgramToken } from '../src/arena/arena-deepgram.token.ts';

beforeEach(() => {
  mockGetAccessToken.mockReset().mockReturnValue('test-jwt');
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ token: 'deepgram-token-xyz' }),
  } as Response);
});

// ── TC1: fetchDeepgramToken — returns null when no access token

describe('TC1 — fetchDeepgramToken: returns null when getAccessToken returns null', () => {
  it('returns null when no JWT available', async () => {
    mockGetAccessToken.mockReturnValue(null);
    const result = await fetchDeepgramToken();
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});

// ── TC2: fetchDeepgramToken — calls deepgram-token edge function

describe('TC2 — fetchDeepgramToken: calls supabase deepgram-token edge function', () => {
  it('posts to /functions/v1/deepgram-token', async () => {
    await fetchDeepgramToken();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('deepgram-token'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});

// ── TC3: fetchDeepgramToken — includes Authorization header ──

describe('TC3 — fetchDeepgramToken: sends Authorization Bearer header', () => {
  it('includes Bearer JWT in request headers', async () => {
    await fetchDeepgramToken();
    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer test-jwt');
  });
});

// ── TC4: fetchDeepgramToken — returns token on success ───────

describe('TC4 — fetchDeepgramToken: returns token string on success', () => {
  it('returns the token field from response JSON', async () => {
    const result = await fetchDeepgramToken();
    expect(result).toBe('deepgram-token-xyz');
  });
});

// ── TC5: fetchDeepgramToken — returns null on HTTP error ─────

describe('TC5 — fetchDeepgramToken: returns null when response is not ok', () => {
  it('returns null when fetch response.ok is false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    } as Response);
    const result = await fetchDeepgramToken();
    expect(result).toBeNull();
  });
});

// ── TC6: fetchDeepgramToken — returns null when token field missing

describe('TC6 — fetchDeepgramToken: returns null when response has no token field', () => {
  it('returns null when JSON body has no token field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    const result = await fetchDeepgramToken();
    expect(result).toBeNull();
  });
});

// ── TC7: fetchDeepgramToken — returns null on fetch throw ────

describe('TC7 — fetchDeepgramToken: returns null when fetch throws', () => {
  it('returns null on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    const result = await fetchDeepgramToken();
    expect(result).toBeNull();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-deepgram.token.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../auth.ts', '../config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-deepgram.token.ts'),
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
