import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRuleOnReference = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
const mockSUPABASE_URL = vi.hoisted(() => ({ value: 'https://supabase.example.com' }));
const mockGetUserJwt = vi.hoisted(() => vi.fn().mockResolvedValue('jwt-token-123'));
const mockAddSystemMessage = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  ruleOnReference: mockRuleOnReference,
}));

vi.mock('../src/config.ts', () => ({
  get SUPABASE_URL() { return mockSUPABASE_URL.value; },
}));

vi.mock('../src/arena/arena-room-ai-response.ts', () => ({
  getUserJwt: mockGetUserJwt,
  handleAIResponse: vi.fn(),
  generateSimulatedResponse: vi.fn(),
}));

vi.mock('../src/arena/arena-room-live-messages.ts', () => ({
  addSystemMessage: mockAddSystemMessage,
  addMessage: vi.fn(),
}));

import { requestAIModRuling } from '../src/arena/arena-mod-refs-ai.ts';

const baseDebate = {
  id: 'debate-1',
  topic: 'AI sentience',
  role: 'a' as const,
  mode: 'text' as const,
  round: 2,
  totalRounds: 3,
  opponentName: 'Bob',
  opponentId: 'opp-uuid',
  opponentElo: 1100,
  ranked: false,
  ruleset: 'standard',
  modView: false,
  messages: [],
};

describe('TC1 — requestAIModRuling calls Edge Function and ruleOnReference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ruling: 'allowed', reason: 'Credible source.' }),
    } as Response);
  });

  it('calls getUserJwt', async () => {
    await requestAIModRuling(baseDebate as never, 'ref-1', 'https://example.com', 'A study', 'a');
    expect(mockGetUserJwt).toHaveBeenCalled();
  });

  it('calls fetch with edge function URL', async () => {
    await requestAIModRuling(baseDebate as never, 'ref-1', 'https://example.com', 'A study', 'a');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('ai-moderator'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('calls ruleOnReference with ruling from Edge Function', async () => {
    await requestAIModRuling(baseDebate as never, 'ref-1', 'https://example.com', 'A study', 'a');
    expect(mockRuleOnReference).toHaveBeenCalledWith('ref-1', 'allowed', expect.any(String));
  });

  it('calls addSystemMessage with allowed verdict', async () => {
    await requestAIModRuling(baseDebate as never, 'ref-1', 'https://example.com', 'A study', 'a');
    expect(mockAddSystemMessage).toHaveBeenCalledWith(expect.stringContaining('ALLOWED'));
  });
});

describe('TC2 — requestAIModRuling handles denied ruling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ruling: 'denied', reason: 'Unreliable source.' }),
    } as Response);
  });

  it('calls addSystemMessage with denied verdict', async () => {
    await requestAIModRuling(baseDebate as never, 'ref-2', 'https://bad.com', 'Bad source', 'b');
    expect(mockAddSystemMessage).toHaveBeenCalledWith(expect.stringContaining('DENIED'));
  });
});

describe('TC3 — requestAIModRuling auto-denies on Edge Function error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);
  });

  it('falls back to auto-denied ruling', async () => {
    await requestAIModRuling(baseDebate as never, 'ref-3', 'https://example.com', 'Study', 'a');
    expect(mockRuleOnReference).toHaveBeenCalledWith('ref-3', 'denied', expect.stringContaining('Auto-denied'));
  });

  it('calls addSystemMessage with auto-denied message', async () => {
    await requestAIModRuling(baseDebate as never, 'ref-3', 'https://example.com', 'Study', 'a');
    expect(mockAddSystemMessage).toHaveBeenCalledWith(expect.stringContaining('AUTO-DENIED'));
  });
});

describe('TC4 — requestAIModRuling auto-denies when no JWT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserJwt.mockResolvedValueOnce(null);
    global.fetch = vi.fn();
  });

  it('does not call fetch when no JWT', async () => {
    await requestAIModRuling(baseDebate as never, 'ref-4', 'https://example.com', 'Study', 'a');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('auto-denies when no JWT', async () => {
    await requestAIModRuling(baseDebate as never, 'ref-4', 'https://example.com', 'Study', 'a');
    expect(mockRuleOnReference).toHaveBeenCalledWith('ref-4', 'denied', expect.any(String));
  });
});

describe('ARCH — arena-mod-refs-ai.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-types.ts',
      './arena-room-ai-response.ts',
      './arena-room-live-messages.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-mod-refs-ai.ts'),
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
