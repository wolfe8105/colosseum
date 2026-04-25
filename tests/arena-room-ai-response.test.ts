// ============================================================
// ARENA ROOM AI RESPONSE — tests/arena-room-ai-response.test.ts
// Source: src/arena/arena-room-ai-response.ts
//
// CLASSIFICATION:
//   getUserJwt()                 — async auth → Behavioral test
//   generateAIDebateResponse()   — async fetch → Behavioral test
//   generateSimulatedResponse()  — pure picker → Pure calculation test
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSafeRpc           = vi.hoisted(() => vi.fn());
const mockGetAccessToken    = vi.hoisted(() => vi.fn(() => null));
const mockGetSupabaseClient = vi.hoisted(() => vi.fn(() => null));
const mockIsPlaceholder     = vi.hoisted(() => vi.fn(() => true));
const mockRandomFrom        = vi.hoisted(() => vi.fn((arr: string[]) => arr[0]));
const mockAddMessage        = vi.hoisted(() => vi.fn());
const mockAdvanceRound      = vi.hoisted(() => vi.fn());

const stateVars = vi.hoisted(() => ({
  currentDebate: null as unknown,
}));

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
  getAccessToken: mockGetAccessToken,
  getSupabaseClient: mockGetSupabaseClient,
}));

vi.mock('../src/config.ts', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  FEATURES: { aiSparring: true },
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return stateVars.currentDebate; },
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  AI_RESPONSES: {
    opening:  ['Let me open with this.'],
    rebuttal: ['Here is my rebuttal.'],
    closing:  ['In conclusion.'],
  },
  AI_TOPICS: [],
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  isPlaceholder: mockIsPlaceholder,
  randomFrom: mockRandomFrom,
}));

vi.mock('../src/arena/arena-room-live-messages.ts', () => ({
  addMessage: mockAddMessage,
}));

vi.mock('../src/arena/arena-room-live-poll.ts', () => ({
  advanceRound: mockAdvanceRound,
}));

import {
  getUserJwt,
  generateAIDebateResponse,
  generateSimulatedResponse,
} from '../src/arena/arena-room-ai-response.ts';

beforeEach(() => {
  mockGetAccessToken.mockReturnValue(null);
  mockGetSupabaseClient.mockReturnValue(null);
  mockIsPlaceholder.mockReturnValue(true);
  mockRandomFrom.mockImplementation((arr: string[]) => arr[0]);
  mockAddMessage.mockReset();
  mockAdvanceRound.mockReset();
  stateVars.currentDebate = null;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── TC1: getUserJwt — returns cached token when no client ─────

describe('TC1 — getUserJwt: returns getAccessToken when no Supabase client', () => {
  it('falls back to getAccessToken', async () => {
    mockGetSupabaseClient.mockReturnValue(null);
    mockGetAccessToken.mockReturnValue('cached-token');
    const result = await getUserJwt();
    expect(result).toBe('cached-token');
  });
});

// ── TC2: getUserJwt — returns session token when client has session ─

describe('TC2 — getUserJwt: returns session access_token from client', () => {
  it('returns session token', async () => {
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'session-jwt' } },
        }),
      },
    });
    const result = await getUserJwt();
    expect(result).toBe('session-jwt');
  });
});

// ── TC3: generateAIDebateResponse — calls fetch with JWT ──────

describe('TC3 — generateAIDebateResponse: returns response from Edge Function', () => {
  it('returns response string from successful fetch', async () => {
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'jwt-y' } },
        }),
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'AI response here' }),
    } as Response);

    const result = await generateAIDebateResponse('topic', 'arg', 1, 4);
    expect(result).toBe('AI response here');
  });
});

// ── TC4: generateAIDebateResponse — calls fetch with JWT ─────

describe('TC4 — generateAIDebateResponse: calls fetch with JWT when available', () => {
  it('calls fetch on the edge URL', async () => {
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'jwt-x' } },
        }),
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'AI says hello' }),
    } as Response);

    const result = await generateAIDebateResponse('topic', 'arg', 2, 4);
    expect(result).toBe('AI says hello');
  });
});

// ── TC5: generateSimulatedResponse — returns non-empty string ─

describe('TC5 — generateSimulatedResponse: returns non-empty string', () => {
  it('returns a string', () => {
    const result = generateSimulatedResponse(1);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/arena/arena-room-ai-response.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-constants.ts',
      './arena-core.utils.ts',
      './arena-room-live-messages.ts',
      './arena-room-live-poll.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-room-ai-response.ts'),
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
