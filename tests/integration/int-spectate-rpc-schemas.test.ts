import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockRpc = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc, auth: mockAuth })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
  mockRpc.mockReset();
  mockRpc.mockResolvedValue({ data: null, error: null });
});

// TC1: ARCH — spectate.ts imports the four rpc-schema exports it uses
describe('TC1 — ARCH: spectate.ts imports rpc-schemas exports', () => {
  it('source import line references get_arena_debate_spectator, get_debate_messages, get_debate_replay_data, get_spectator_chat', () => {
    const source = readFileSync(resolve(__dirname, '../../src/pages/spectate.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => /from\s+['"]/.test(l));
    const rpcSchemaImport = importLines.find(l => l.includes('rpc-schemas'));
    expect(rpcSchemaImport).toBeDefined();
    expect(rpcSchemaImport).toContain('get_arena_debate_spectator');
    expect(rpcSchemaImport).toContain('get_debate_messages');
    expect(rpcSchemaImport).toContain('get_debate_replay_data');
    expect(rpcSchemaImport).toContain('get_spectator_chat');
  });
});

// TC2: get_arena_debate_spectator validates a well-formed spectator debate object
describe('TC2 — get_arena_debate_spectator validates well-formed debate object', () => {
  it('parses object with all nullable fields successfully', async () => {
    const { get_arena_debate_spectator } = await import('../../src/contracts/rpc-schemas.ts');
    const input = {
      status: 'live',
      mode: 'audio',
      topic: 'Is TypeScript worth it?',
      debater_a_name: 'Alice',
      debater_a_elo: 1250,
      debater_a_avatar: null,
      debater_b_name: 'Bob',
      debater_b_elo: 1300,
      debater_b_avatar: 'https://example.com/bob.png',
      moderator_type: 'ai',
      moderator_id: null,
      moderator_name: 'The Moderator',
      ruleset: 'standard',
      spectator_count: 42,
      current_round: 2,
      total_rounds: 4,
      vote_count_a: 10,
      vote_count_b: 8,
      score_a: 120,
      score_b: 115,
      winner: null,
      ai_scorecard: null,
    };
    const result = get_arena_debate_spectator.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('live');
      expect(result.data.debater_a_name).toBe('Alice');
      expect(result.data.spectator_count).toBe(42);
    }
  });
});

// TC3: get_arena_debate_spectator accepts nulls on all nullable fields
describe('TC3 — get_arena_debate_spectator accepts all-null nullable fields', () => {
  it('parses object where every field is null', async () => {
    const { get_arena_debate_spectator } = await import('../../src/contracts/rpc-schemas.ts');
    const input = {
      status: null,
      mode: null,
      topic: null,
      debater_a_name: null,
      debater_a_elo: null,
      debater_a_avatar: null,
      debater_b_name: null,
      debater_b_elo: null,
      debater_b_avatar: null,
      moderator_type: null,
      moderator_id: null,
      moderator_name: null,
      ruleset: null,
      spectator_count: null,
      current_round: null,
      total_rounds: null,
      vote_count_a: null,
      vote_count_b: null,
      score_a: null,
      score_b: null,
      winner: null,
      ai_scorecard: null,
    };
    const result = get_arena_debate_spectator.safeParse(input);
    expect(result.success).toBe(true);
  });
});

// TC4: get_arena_debate_spectator passes through extra Postgres columns via .passthrough()
describe('TC4 — get_arena_debate_spectator passes through unknown extra fields', () => {
  it('preserves extra_postgres_column in parsed output', async () => {
    const { get_arena_debate_spectator } = await import('../../src/contracts/rpc-schemas.ts');
    const input = {
      status: 'complete',
      mode: 'text',
      topic: 'Topic',
      debater_a_name: null,
      debater_a_elo: null,
      debater_a_avatar: null,
      debater_b_name: null,
      debater_b_elo: null,
      debater_b_avatar: null,
      moderator_type: null,
      moderator_id: null,
      moderator_name: null,
      ruleset: null,
      spectator_count: null,
      current_round: null,
      total_rounds: null,
      vote_count_a: null,
      vote_count_b: null,
      score_a: null,
      score_b: null,
      winner: null,
      ai_scorecard: null,
      extra_postgres_column: 'should-survive',
    };
    const result = get_arena_debate_spectator.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).extra_postgres_column).toBe('should-survive');
    }
  });
});

// TC5: get_debate_messages validates a well-formed message array
describe('TC5 — get_debate_messages validates well-formed messages array', () => {
  it('parses array of debate messages with all required fields', async () => {
    const { get_debate_messages } = await import('../../src/contracts/rpc-schemas.ts');
    const input = [
      {
        round: 1,
        side: 'a',
        is_ai: false,
        content: 'My opening argument.',
        created_at: '2026-04-25T10:00:00Z',
      },
      {
        round: 1,
        side: 'b',
        is_ai: true,
        content: null,
        created_at: null,
      },
    ];
    const result = get_debate_messages.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].side).toBe('a');
      expect(result.data[1].is_ai).toBe(true);
    }
  });
});

// TC6: get_debate_replay_data validates a well-formed replay data object
describe('TC6 — get_debate_replay_data validates well-formed replay data', () => {
  it('parses object with all five array fields successfully', async () => {
    const { get_debate_replay_data } = await import('../../src/contracts/rpc-schemas.ts');
    const input = {
      power_ups: [
        {
          power_up_id: 'pu-1',
          user_id: 'u-1',
          activated_at: '2026-04-25T10:01:00Z',
          power_up_name: 'Silence',
          power_up_icon: '🔇',
          user_name: 'Alice',
          side: 'a',
        },
      ],
      references: [
        {
          id: 'ref-1',
          submitter_id: 'u-1',
          round: 2,
          url: 'https://example.com/source',
          description: 'Supporting source',
          supports_side: 'a',
          ruling: 'accepted',
          ruling_reason: null,
          created_at: '2026-04-25T10:02:00Z',
          ruled_at: null,
          submitter_name: 'Alice',
          side: 'a',
        },
      ],
      mod_scores: [
        {
          scorer_id: 'mod-1',
          scorer_role: 'human_moderator',
          score: 85,
          created_at: '2026-04-25T10:05:00Z',
          scorer_name: 'Judge',
        },
      ],
      point_awards: [
        {
          id: 'pa-1',
          created_at: '2026-04-25T10:03:00Z',
          round: 1,
          side: 'a',
          base_score: 10,
          metadata: {
            scored_event_id: 'evt-1',
            score_a_after: 10,
            score_b_after: 0,
            base_score: 10,
            in_debate_multiplier: 1,
            in_debate_flat: 0,
            final_contribution: 10,
          },
        },
      ],
      speech_events: [
        {
          id: 'se-1',
          created_at: '2026-04-25T10:00:30Z',
          round: 1,
          side: 'a',
          content: 'Opening words.',
          user_id: 'u-1',
          debater_name: 'Alice',
        },
      ],
    };
    const result = get_debate_replay_data.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.power_ups).toHaveLength(1);
      expect(result.data.references).toHaveLength(1);
      expect(result.data.mod_scores).toHaveLength(1);
      expect(result.data.point_awards).toHaveLength(1);
      expect(result.data.speech_events).toHaveLength(1);
    }
  });
});

// TC7: get_debate_replay_data accepts empty arrays for all five fields
describe('TC7 — get_debate_replay_data accepts all-empty arrays', () => {
  it('parses object with empty arrays for all five fields', async () => {
    const { get_debate_replay_data } = await import('../../src/contracts/rpc-schemas.ts');
    const input = {
      power_ups: [],
      references: [],
      mod_scores: [],
      point_awards: [],
      speech_events: [],
    };
    const result = get_debate_replay_data.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.power_ups).toHaveLength(0);
      expect(result.data.speech_events).toHaveLength(0);
    }
  });
});
