// ============================================================
// RPC SCHEMAS — tests/rpc-schemas.test.ts
// Source: src/contracts/rpc-schemas.ts
//
// CLASSIFICATION:
//   All exports are Zod schemas — structural assertions + parse smoke tests.
//
// IMPORTS: { z } from 'zod' only
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';

import {
  get_arena_debate_spectator,
  get_my_invite_link,
  get_debate_messages,
  get_spectator_chat,
  send_spectator_chat,
  get_modifier_catalog,
  get_my_invite_stats,
} from '../src/contracts/rpc-schemas.ts';

// ── TC1 ───────────────────────────────────────────────────────

describe('TC1 — get_arena_debate_spectator schema parses valid spectate debate', () => {
  it('parse succeeds for a valid object with all required fields', () => {
    const result = get_arena_debate_spectator.safeParse({
      topic: 'Test',
      status: 'live',
      mode: 'voice',
      current_round: 1,
      total_rounds: 3,
      debater_a_name: 'Alice',
      debater_b_name: 'Bob',
      debater_a_elo: 1200,
      debater_b_elo: 1100,
      debater_a_avatar: null,
      debater_b_avatar: null,
      moderator_name: null,
      moderator_id: null,
      moderator_type: 'none',
      ruleset: null,
      spectator_count: 5,
      vote_count_a: 2,
      vote_count_b: 3,
      score_a: null,
      score_b: null,
      winner: null,
      ai_scorecard: null,
    });
    expect(result.success).toBe(true);
  });
});

// ── TC2 ───────────────────────────────────────────────────────

describe('TC2 — get_my_invite_link schema parses valid invite link response', () => {
  it('parse succeeds for an object with url field', () => {
    const result = get_my_invite_link.safeParse({ url: 'https://example.com/invite/abc' });
    expect(result.success).toBe(true);
  });
});

// ── TC3 ───────────────────────────────────────────────────────

describe('TC3 — get_debate_messages schema parses an empty array', () => {
  it('parse succeeds for empty array', () => {
    expect(get_debate_messages.safeParse([]).success).toBe(true);
  });
});

// ── TC4 ───────────────────────────────────────────────────────

describe('TC4 — get_spectator_chat schema parses empty array', () => {
  it('parses [] as valid', () => {
    expect(get_spectator_chat.safeParse([]).success).toBe(true);
  });
});

// ── TC5 ───────────────────────────────────────────────────────

describe('TC5 — send_spectator_chat schema parses success response', () => {
  it('parses {ok: true} for send_spectator_chat', () => {
    const result = send_spectator_chat.safeParse({ ok: true });
    expect(result.success).toBe(true);
  });
});

// ── TC6 ───────────────────────────────────────────────────────

describe('TC6 — get_modifier_catalog schema parses empty array', () => {
  it('parses [] as valid', () => {
    expect(get_modifier_catalog.safeParse([]).success).toBe(true);
  });
});

// ── TC7 ───────────────────────────────────────────────────────

describe('TC7 — all exported schemas are Zod schemas', () => {
  it('each export has a .safeParse method', () => {
    const schemas = [
      get_arena_debate_spectator,
      get_my_invite_link,
      get_debate_messages,
      get_spectator_chat,
      send_spectator_chat,
      get_modifier_catalog,
      get_my_invite_stats,
    ];
    for (const schema of schemas) {
      expect(typeof schema.safeParse).toBe('function');
    }
  });
});

// ── ARCH ─────────────────────────────────────────────────────

describe('ARCH — src/contracts/rpc-schemas.ts only imports from allowed modules', () => {
  it('only imports from zod', () => {
    const allowed = ['zod'];
    const source = readFileSync(
      resolve(__dirname, '../src/contracts/rpc-schemas.ts'),
      'utf-8'
    );
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
