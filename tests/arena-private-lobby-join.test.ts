import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());
const mockFriendlyError = vi.hoisted(() => vi.fn((e: unknown) => String(e)));
const mockDEBATE = vi.hoisted(() => ({ defaultRounds: 3 }));
const mockSet_selectedMode = vi.hoisted(() => vi.fn());
const mockModDebateId = vi.hoisted(() => ({ value: null as string | null }));
const mockSet_modDebateId = vi.hoisted(() => vi.fn());
const mockAI_TOPICS = vi.hoisted(() => ['Topic A', 'Topic B']);
const mockIsPlaceholder = vi.hoisted(() => ({ value: false }));
const mockRandomFrom = vi.hoisted(() => vi.fn().mockReturnValue('Random Topic'));
const mockShowMatchFound = vi.hoisted(() => vi.fn());
const mockShowModDebateWaitingDebater = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/config.ts', () => ({
  showToast: mockShowToast,
  friendlyError: mockFriendlyError,
  get DEBATE() { return mockDEBATE; },
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  set_selectedMode: mockSet_selectedMode,
  get modDebateId() { return mockModDebateId.value; },
  set_modDebateId: mockSet_modDebateId,
}));

vi.mock('../src/arena/arena-constants.ts', () => ({
  get AI_TOPICS() { return mockAI_TOPICS; },
  TEXT_MAX_CHARS: 500,
  OPPONENT_POLL_MS: 3000,
  OPPONENT_POLL_TIMEOUT_SEC: 30,
  ROUND_DURATION: 60,
}));

vi.mock('../src/arena/arena-core.utils.ts', () => ({
  get isPlaceholder() { return () => mockIsPlaceholder.value; },
  randomFrom: mockRandomFrom,
}));

vi.mock('../src/arena/arena-match-found.ts', () => ({
  showMatchFound: mockShowMatchFound,
}));

vi.mock('../src/arena/arena-mod-debate-waiting.ts', () => ({
  showModDebateWaitingDebater: mockShowModDebateWaitingDebater,
}));

import { joinWithCode } from '../src/arena/arena-private-lobby.join.ts';

describe('TC1 — joinWithCode shows toast in placeholder mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPlaceholder.value = true;
  });

  it('calls showToast and returns early', async () => {
    await joinWithCode('ABC123');
    expect(mockShowToast).toHaveBeenCalled();
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });
});

describe('TC2 — joinWithCode calls join_private_lobby RPC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPlaceholder.value = false;
  });

  it('calls safeRpc with join_private_lobby and code', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: [{ debate_id: 'd-1', mode: 'text', topic: 'AI', total_rounds: 3, opponent_name: 'Bob', opponent_id: 'opp-1', opponent_elo: 1100, ruleset: 'amplified', language: 'en' }],
      error: null,
    });
    await joinWithCode('XYZ789');
    expect(mockSafeRpc).toHaveBeenCalledWith('join_private_lobby', { p_join_code: 'XYZ789' });
  });

  it('calls set_selectedMode with mode from result', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: [{ debate_id: 'd-1', mode: 'live', topic: 'AI', total_rounds: 3, opponent_name: 'Bob', opponent_id: 'opp-1', opponent_elo: 1100, ruleset: 'amplified', language: 'en' }],
      error: null,
    });
    await joinWithCode('XYZ789');
    expect(mockSet_selectedMode).toHaveBeenCalledWith('live');
  });

  it('calls showMatchFound on success', async () => {
    mockSafeRpc.mockResolvedValueOnce({
      data: [{ debate_id: 'd-1', mode: 'text', topic: 'Test', total_rounds: 3, opponent_name: 'Bob', opponent_id: 'opp-1', opponent_elo: 1100, ruleset: 'amplified', language: 'en' }],
      error: null,
    });
    await joinWithCode('CODE1');
    expect(mockShowMatchFound).toHaveBeenCalledWith(expect.objectContaining({ id: 'd-1', role: 'b', mode: 'text' }));
  });
});

describe('TC3 — joinWithCode falls back to join_mod_debate on RPC error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPlaceholder.value = false;
  });

  it('calls join_mod_debate when join_private_lobby fails', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'not found', code: '404' } })
      .mockResolvedValueOnce({
        data: { debate_id: 'd-2', mode: 'text', topic: 'Politics', total_rounds: 3, opponent_name: 'Alice', opponent_id: 'a-1', opponent_elo: 1200, ranked: false, ruleset: 'amplified', language: 'en', role: 'b' },
        error: null,
      });
    await joinWithCode('MODCODE');
    expect(mockSafeRpc).toHaveBeenCalledWith('join_mod_debate', { p_join_code: 'MODCODE' });
    expect(mockShowMatchFound).toHaveBeenCalled();
  });

  it('calls showModDebateWaitingDebater when role is a', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'err', code: '500' } })
      .mockResolvedValueOnce({
        data: { debate_id: 'd-3', mode: 'text', topic: 'X', total_rounds: 3, ranked: false, ruleset: 'amplified', language: 'en', role: 'a' },
        error: null,
      });
    await joinWithCode('MODA');
    expect(mockSet_modDebateId).toHaveBeenCalledWith('d-3');
    expect(mockShowModDebateWaitingDebater).toHaveBeenCalled();
  });

  it('calls showToast on both RPCs failing', async () => {
    mockSafeRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'err1', code: '404' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'err2', code: '404' } });
    await joinWithCode('BAD');
    expect(mockShowToast).toHaveBeenCalled();
  });
});

describe('ARCH — arena-private-lobby.join.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../config.ts',
      './arena-state.ts',
      './arena-types.ts',
      './arena-types-private-lobby.ts',
      './arena-types-moderator.ts',
      './arena-constants.ts',
      './arena-core.utils.ts',
      './arena-match-found.ts',
      './arena-mod-debate-waiting.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-private-lobby.join.ts'),
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
