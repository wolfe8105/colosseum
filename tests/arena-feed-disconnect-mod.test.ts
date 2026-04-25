import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockSafeRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));

const mockCurrentDebate = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));
const mockDisconnectHandled = vi.hoisted(() => ({ value: false }));
const mockSet_disconnectHandled = vi.hoisted(() => vi.fn((v: boolean) => { mockDisconnectHandled.value = v; }));

const mockEndCurrentDebate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockStopTranscription = vi.hoisted(() => vi.fn());
const mockWriteFeedEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAddLocalSystem = vi.hoisted(() => vi.fn());
const mockClearInterimTranscript = vi.hoisted(() => vi.fn());
const mockClearFeedTimer = vi.hoisted(() => vi.fn());
const mockStopHeartbeat = vi.hoisted(() => vi.fn());
const mockShowDisconnectBanner = vi.hoisted(() => vi.fn());

vi.mock('../src/auth.ts', () => ({
  safeRpc: mockSafeRpc,
}));

vi.mock('../src/arena/arena-state.ts', () => ({
  get currentDebate() { return mockCurrentDebate.value; },
}));

vi.mock('../src/arena/arena-feed-state.ts', () => ({
  get disconnectHandled() { return mockDisconnectHandled.value; },
  set_disconnectHandled: mockSet_disconnectHandled,
}));

vi.mock('../src/arena/arena-room-end.ts', () => ({
  endCurrentDebate: mockEndCurrentDebate,
}));

vi.mock('../src/arena/arena-deepgram.ts', () => ({
  stopTranscription: mockStopTranscription,
}));

vi.mock('../src/arena/arena-feed-room.ts', () => ({
  writeFeedEvent: mockWriteFeedEvent,
  addLocalSystem: mockAddLocalSystem,
  clearInterimTranscript: mockClearInterimTranscript,
}));

vi.mock('../src/arena/arena-feed-machine-turns.ts', () => ({
  clearFeedTimer: mockClearFeedTimer,
}));

vi.mock('../src/arena/arena-feed-heartbeat.ts', () => ({
  stopHeartbeat: mockStopHeartbeat,
}));

vi.mock('../src/arena/arena-feed-ui.ts', () => ({
  showDisconnectBanner: mockShowDisconnectBanner,
}));

import { handleModDisconnect, modNullDebate } from '../src/arena/arena-feed-disconnect-mod.ts';

const baseDebate = {
  id: 'deb-1',
  role: 'a',
  moderatorName: 'Alice Mod',
  modView: false,
  spectatorView: false,
  _nulled: false,
  debaterAName: 'Dave',
  debaterBName: 'Eve',
};

describe('TC1 — handleModDisconnect nulls debate via RPC', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls addLocalSystem with disconnect message', async () => {
    await handleModDisconnect(baseDebate as never);
    expect(mockAddLocalSystem).toHaveBeenCalledWith(expect.stringContaining('disconnected'));
  });

  it('calls showDisconnectBanner', async () => {
    await handleModDisconnect(baseDebate as never);
    expect(mockShowDisconnectBanner).toHaveBeenCalled();
  });

  it('calls safeRpc record_mod_dropout', async () => {
    await handleModDisconnect(baseDebate as never);
    expect(mockSafeRpc).toHaveBeenCalledWith('record_mod_dropout', { p_debate_id: 'deb-1' });
  });

  it('sets debate._nulled = true', async () => {
    const debate = { ...baseDebate };
    await handleModDisconnect(debate as never);
    expect(debate._nulled).toBe(true);
  });

  it('calls endCurrentDebate after timeout', async () => {
    await handleModDisconnect(baseDebate as never);
    await vi.advanceTimersByTimeAsync(1501);
    expect(mockEndCurrentDebate).toHaveBeenCalled();
  });
});

describe('TC2 — modNullDebate ejects debater or nulls debate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockDisconnectHandled.value = false;
    mockCurrentDebate.value = { ...baseDebate };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when disconnectHandled is true', async () => {
    mockDisconnectHandled.value = true;
    await modNullDebate('null');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  it('does nothing when currentDebate is null', async () => {
    mockCurrentDebate.value = null;
    await modNullDebate('null');
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  it('calls safeRpc mod_null_debate with reason=null', async () => {
    await modNullDebate('null');
    expect(mockSafeRpc).toHaveBeenCalledWith('mod_null_debate', { p_debate_id: 'deb-1', p_reason: 'null' });
  });

  it('calls safeRpc mod_null_debate with reason=eject_a', async () => {
    await modNullDebate('eject_a');
    expect(mockSafeRpc).toHaveBeenCalledWith('mod_null_debate', expect.objectContaining({ p_reason: 'eject_a' }));
  });

  it('calls set_disconnectHandled(true)', async () => {
    await modNullDebate('null');
    expect(mockSet_disconnectHandled).toHaveBeenCalledWith(true);
  });

  it('calls clearFeedTimer', async () => {
    await modNullDebate('null');
    expect(mockClearFeedTimer).toHaveBeenCalled();
  });

  it('calls endCurrentDebate after timeout', async () => {
    await modNullDebate('null');
    await vi.advanceTimersByTimeAsync(1501);
    expect(mockEndCurrentDebate).toHaveBeenCalled();
  });
});

describe('ARCH — arena-feed-disconnect-mod.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      './arena-types.ts',
      './arena-state.ts',
      './arena-feed-state.ts',
      './arena-room-end.ts',
      './arena-deepgram.ts',
      './arena-feed-room.ts',
      './arena-feed-machine-turns.ts',
      './arena-feed-heartbeat.ts',
      './arena-feed-ui.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-feed-disconnect-mod.ts'),
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
