import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom, auth: mockAuth })),
}));

// Stub @peermetrics/webrtc-stats — pulled in transitively via webrtc.monitor.ts
vi.mock('@peermetrics/webrtc-stats', () => ({
  WebRTCStats: vi.fn().mockImplementation(() => ({
    addConnection: vi.fn(),
    destroy: vi.fn(),
  })),
}));

const FAKE_CHALLENGE = {
  debate_id: 'aaa00000-0000-0000-0000-000000000001',
  mode: 'live' as const,
  topic: 'Pineapple belongs on pizza',
  challenger_id: 'bbb00000-0000-0000-0000-000000000002',
  challenger_name: 'ChallengerUser',
  challenger_elo: 1350,
};

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockRpc.mockResolvedValue({ data: [], error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  document.body.innerHTML = `
    <div id="screen-main">
      <div id="arena-pending-challenges-section" style="display:none"></div>
      <div id="arena-pending-challenges-feed"></div>
    </div>
  `;
  // Reset window.confirm mock
  window.confirm = vi.fn().mockReturnValue(true);
});

// TC-001: loadPendingChallenges renders cards and shows section
describe('TC-001 — loadPendingChallenges renders challenge cards', () => {
  it('renders a card and shows section when get_pending_challenges returns data', async () => {
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_pending_challenges') {
        return Promise.resolve({ data: [FAKE_CHALLENGE], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { loadPendingChallenges } = await import('../../src/arena/arena-pending-challenges.ts');
    await loadPendingChallenges();

    const section = document.getElementById('arena-pending-challenges-section')!;
    const feed = document.getElementById('arena-pending-challenges-feed')!;

    expect(section.style.display).not.toBe('none');
    expect(feed.querySelectorAll('.arena-card').length).toBe(1);
    expect(feed.innerHTML).toContain('ChallengerUser');
    expect(feed.innerHTML).toContain('Pineapple belongs on pizza');
  });
});

// TC-002: loadPendingChallenges hides section on empty result
describe('TC-002 — loadPendingChallenges hides section when no challenges', () => {
  it('leaves section hidden when get_pending_challenges returns empty array', async () => {
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_pending_challenges') {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { loadPendingChallenges } = await import('../../src/arena/arena-pending-challenges.ts');
    await loadPendingChallenges();

    const section = document.getElementById('arena-pending-challenges-section')!;
    expect(section.style.display).toBe('none');
  });
});

// TC-003: Accept button calls join_private_lobby RPC with correct params
describe('TC-003 — Accept button calls join_private_lobby with debate id', () => {
  it('calls join_private_lobby RPC with p_debate_id and p_join_code null on accept click', async () => {
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_pending_challenges') {
        return Promise.resolve({ data: [FAKE_CHALLENGE], error: null });
      }
      if (rpcName === 'join_private_lobby') {
        return Promise.resolve({
          data: {
            debate_id: FAKE_CHALLENGE.debate_id,
            topic: FAKE_CHALLENGE.topic,
            total_rounds: 3,
            ruleset: 'amplified',
            language: 'en',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { loadPendingChallenges } = await import('../../src/arena/arena-pending-challenges.ts');
    await loadPendingChallenges();

    const acceptBtn = document.querySelector('.challenge-accept-btn') as HTMLButtonElement;
    expect(acceptBtn).not.toBeNull();
    acceptBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const joinCall = mockRpc.mock.calls.find(c => c[0] === 'join_private_lobby');
    expect(joinCall).toBeDefined();
    expect(joinCall![1]).toMatchObject({
      p_debate_id: FAKE_CHALLENGE.debate_id,
      p_join_code: null,
    });
  });
});

// TC-004: Accept success calls set_selectedMode via arena-state
describe('TC-004 — Accept success sets selectedMode in arena-state', () => {
  it('selectedMode in arena-state reflects the challenge mode after accept', async () => {
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_pending_challenges') {
        return Promise.resolve({ data: [FAKE_CHALLENGE], error: null });
      }
      if (rpcName === 'join_private_lobby') {
        return Promise.resolve({
          data: {
            debate_id: FAKE_CHALLENGE.debate_id,
            topic: FAKE_CHALLENGE.topic,
            total_rounds: 3,
            ruleset: 'amplified',
            language: 'en',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { loadPendingChallenges } = await import('../../src/arena/arena-pending-challenges.ts');
    const arenaState = await import('../../src/arena/arena-state.ts');

    await loadPendingChallenges();

    const acceptBtn = document.querySelector('.challenge-accept-btn') as HTMLButtonElement;
    acceptBtn.click();

    // Wait for async accept chain to complete
    await new Promise(r => setTimeout(r, 50));

    expect(arenaState.selectedMode).toBe('live');
  });
});

// TC-005: Decline button calls cancel_private_lobby RPC
describe('TC-005 — Decline button calls cancel_private_lobby RPC', () => {
  it('calls cancel_private_lobby with the debate id when DECLINE is clicked', async () => {
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_pending_challenges') {
        return Promise.resolve({ data: [FAKE_CHALLENGE], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { loadPendingChallenges } = await import('../../src/arena/arena-pending-challenges.ts');
    await loadPendingChallenges();

    const declineBtn = document.querySelector('.challenge-decline-btn') as HTMLButtonElement;
    expect(declineBtn).not.toBeNull();
    declineBtn.click();

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const cancelCall = mockRpc.mock.calls.find(c => c[0] === 'cancel_private_lobby');
    expect(cancelCall).toBeDefined();
    expect(cancelCall![1]).toMatchObject({ p_debate_id: FAKE_CHALLENGE.debate_id });
  });
});

// TC-006: Decline removes card from DOM and hides section when last card
describe('TC-006 — Decline removes card and hides section when no cards remain', () => {
  it('removes the declined card and hides section when it was the only card', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_pending_challenges') {
        return Promise.resolve({ data: [FAKE_CHALLENGE], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { loadPendingChallenges } = await import('../../src/arena/arena-pending-challenges.ts');
    await loadPendingChallenges();

    const section = document.getElementById('arena-pending-challenges-section')!;
    expect(section.style.display).not.toBe('none');
    expect(document.querySelectorAll('.arena-card').length).toBe(1);

    const declineBtn = document.querySelector('.challenge-decline-btn') as HTMLButtonElement;
    declineBtn.click();

    await new Promise(r => setTimeout(r, 50));

    expect(document.querySelectorAll('.arena-card').length).toBe(0);
    expect(section.style.display).toBe('none');
  });
});

// TC-007: Block button calls block_user RPC and removes card
describe('TC-007 — Block button calls block_user and removes card', () => {
  it('calls cancel_private_lobby and block_user RPCs after confirm, then removes the card', async () => {
    window.confirm = vi.fn().mockReturnValue(true);

    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_pending_challenges') {
        return Promise.resolve({ data: [FAKE_CHALLENGE], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { loadPendingChallenges } = await import('../../src/arena/arena-pending-challenges.ts');
    await loadPendingChallenges();

    const blockBtn = document.querySelector('.challenge-block-btn') as HTMLButtonElement;
    expect(blockBtn).not.toBeNull();
    blockBtn.click();

    await new Promise(r => setTimeout(r, 50));

    const cancelCall = mockRpc.mock.calls.find(c => c[0] === 'cancel_private_lobby');
    const blockCall = mockRpc.mock.calls.find(c => c[0] === 'block_user');

    expect(cancelCall).toBeDefined();
    expect(blockCall).toBeDefined();
    expect(blockCall![1]).toMatchObject({ p_blocked_id: FAKE_CHALLENGE.challenger_id });
    expect(document.querySelectorAll('.arena-card').length).toBe(0);
  });
});

// ARCH: seam boundary unchanged
describe('ARCH — seam #033 import boundary unchanged', () => {
  it('src/arena/arena-pending-challenges.ts still imports arena-state', () => {
    const source = readFileSync(resolve(__dirname, '../../src/arena/arena-pending-challenges.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-state'))).toBe(true);
  });
});

// ─── SEAM #098: arena-pending-challenges → arena-core.utils (randomFrom) ───

// TC-098-001: randomFrom is imported from arena-core.utils
describe('TC-098-001 — ARCH: randomFrom imported from arena-core.utils', () => {
  it('arena-pending-challenges.ts imports randomFrom from arena-core.utils', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-pending-challenges.ts'),
      'utf-8',
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-core.utils') && l.includes('randomFrom'))).toBe(true);
  });
});

// TC-098-002: randomFrom used as topic fallback when join result has no topic and dataset topic is empty
describe('TC-098-002 — randomFrom supplies topic fallback when join result and dataset both lack a topic', () => {
  it('showMatchFound receives a non-empty topic drawn from AI_TOPICS via randomFrom', async () => {
    const capturedDebates: unknown[] = [];

    // Intercept showMatchFound by mocking arena-match-found
    vi.doMock('../../src/arena/arena-match-found.ts', () => ({
      showMatchFound: vi.fn((d: unknown) => capturedDebates.push(d)),
    }));

    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_pending_challenges') {
        // Challenge has no topic
        return Promise.resolve({
          data: [{ ...FAKE_CHALLENGE, topic: '' }],
          error: null,
        });
      }
      if (rpcName === 'join_private_lobby') {
        // join result also has no topic
        return Promise.resolve({
          data: {
            debate_id: FAKE_CHALLENGE.debate_id,
            topic: null,
            total_rounds: 3,
            ruleset: 'amplified',
            language: 'en',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { loadPendingChallenges } = await import('../../src/arena/arena-pending-challenges.ts');
    const { AI_TOPICS } = await import('../../src/arena/arena-constants.ts');

    await loadPendingChallenges();

    const acceptBtn = document.querySelector('.challenge-accept-btn') as HTMLButtonElement;
    expect(acceptBtn).not.toBeNull();
    acceptBtn.click();

    await new Promise(r => setTimeout(r, 80));

    expect(capturedDebates.length).toBe(1);
    const debate = capturedDebates[0] as { topic: string };
    // topic must be one of the AI_TOPICS entries (randomFrom result)
    expect(AI_TOPICS).toContain(debate.topic);
  });
});

// TC-098-003: randomFrom unit — always returns element from array
describe('TC-098-003 — randomFrom unit: returns an element from the supplied array', () => {
  it('randomFrom always picks a value contained in the input array', async () => {
    const { randomFrom } = await import('../../src/arena/arena-core.utils.ts');
    const arr = ['alpha', 'beta', 'gamma', 'delta'] as const;
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(randomFrom(arr));
    }
  });
});

// TC-098-004: randomFrom uses array length — single-element array always returns that element
describe('TC-098-004 — randomFrom with single-element array always returns that element', () => {
  it('randomFrom returns the only element when array has length 1', async () => {
    const { randomFrom } = await import('../../src/arena/arena-core.utils.ts');
    expect(randomFrom(['only'] as const)).toBe('only');
  });
});

// TC-098-005: AI_TOPICS is the array passed to randomFrom as fallback
describe('TC-098-005 — ARCH: AI_TOPICS is the fallback topic pool used with randomFrom', () => {
  it('arena-pending-challenges.ts imports AI_TOPICS from arena-constants', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/arena/arena-pending-challenges.ts'),
      'utf-8',
    );
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    expect(importLines.some(l => l.includes('arena-constants') && l.includes('AI_TOPICS'))).toBe(true);
  });

  it('AI_TOPICS is a non-empty array of strings', async () => {
    const { AI_TOPICS } = await import('../../src/arena/arena-constants.ts');
    expect(Array.isArray(AI_TOPICS)).toBe(true);
    expect(AI_TOPICS.length).toBeGreaterThan(0);
    expect(typeof AI_TOPICS[0]).toBe('string');
  });
});
