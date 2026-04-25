/**
 * Integration tests — spectate.render-messages.ts → spectate.state
 * SEAM #261
 *
 * renderMessages reads/writes state.lastMessageTime.
 * formatPointBadge is pure but exported from the same seam.
 * No RPC calls are made in this module — tests focus on DOM output and state mutation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Only mock @supabase/supabase-js — not needed by render-messages but
// spectate.state imports SupabaseClient type so the module chain must resolve.
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: vi.fn(), from: vi.fn(), auth: { onAuthStateChange: vi.fn() } })),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});

// ---------------------------------------------------------------------------
// ARCH filter
// ---------------------------------------------------------------------------
describe('ARCH — spectate.render-messages imports only from within spectate', () => {
  it('has no imports outside spectate.* or spectate types', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.render-messages.ts'),
      'utf8'
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    for (const line of imports) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!match) continue;
      const path = match[1];
      // Must be a relative spectate.* import — no external deps
      expect(path).toMatch(/^\.\/spectate\./);
    }
  });
});

// ---------------------------------------------------------------------------
// TC-261-01: empty messages array → empty string, state.lastMessageTime unchanged
// ---------------------------------------------------------------------------
describe('TC-261-01 — renderMessages with empty array returns empty string and leaves state untouched', () => {
  it('returns empty string and does not modify state.lastMessageTime', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;

    const { renderMessages } = await import('../../src/pages/spectate.render-messages.ts');

    const d = {
      debater_a_name: 'Alice',
      debater_b_name: 'Bob',
    } as any;

    const html = renderMessages([], d);

    expect(html).toBe('');
    expect(stateModule.state.lastMessageTime).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC-261-02: single message from side 'a' → renders .msg.side-a with debater name
// ---------------------------------------------------------------------------
describe('TC-261-02 — renderMessages renders side-a message with debater_a_name', () => {
  it('outputs .msg.side-a containing debater_a_name', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;

    const { renderMessages } = await import('../../src/pages/spectate.render-messages.ts');

    const messages = [
      { round: 1, side: 'a', is_ai: false, content: 'My argument', created_at: '2026-01-01T10:00:00Z' },
    ] as any[];

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderMessages(messages, d);

    expect(html).toContain('class="msg side-a"');
    expect(html).toContain('Alice');
    expect(html).toContain('My argument');
  });
});

// ---------------------------------------------------------------------------
// TC-261-03: single message from side 'b' → renders .msg.side-b with debater_b_name
// ---------------------------------------------------------------------------
describe('TC-261-03 — renderMessages renders side-b message with debater_b_name', () => {
  it('outputs .msg.side-b containing debater_b_name', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;

    const { renderMessages } = await import('../../src/pages/spectate.render-messages.ts');

    const messages = [
      { round: 2, side: 'b', is_ai: false, content: 'Counter argument', created_at: '2026-01-01T10:01:00Z' },
    ] as any[];

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderMessages(messages, d);

    expect(html).toContain('class="msg side-b"');
    expect(html).toContain('Bob');
    expect(html).toContain('Counter argument');
  });
});

// ---------------------------------------------------------------------------
// TC-261-04: round change emits .round-divider; same round does not repeat it
// ---------------------------------------------------------------------------
describe('TC-261-04 — renderMessages emits .round-divider on round transition', () => {
  it('inserts one round-divider per unique round number', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;

    const { renderMessages } = await import('../../src/pages/spectate.render-messages.ts');

    const messages = [
      { round: 1, side: 'a', is_ai: false, content: 'R1 A', created_at: '2026-01-01T10:00:00Z' },
      { round: 1, side: 'b', is_ai: false, content: 'R1 B', created_at: '2026-01-01T10:00:01Z' },
      { round: 2, side: 'a', is_ai: false, content: 'R2 A', created_at: '2026-01-01T10:01:00Z' },
    ] as any[];

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderMessages(messages, d);

    const dividerMatches = html.match(/class="round-divider"/g) ?? [];
    expect(dividerMatches).toHaveLength(2); // round 1 and round 2
    expect(html).toContain('Round 1');
    expect(html).toContain('Round 2');
  });
});

// ---------------------------------------------------------------------------
// TC-261-05: state.lastMessageTime is updated to the latest created_at
// ---------------------------------------------------------------------------
describe('TC-261-05 — renderMessages updates state.lastMessageTime to newest created_at', () => {
  it('sets state.lastMessageTime to the most recent message timestamp', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;

    const { renderMessages } = await import('../../src/pages/spectate.render-messages.ts');

    const messages = [
      { round: 1, side: 'a', is_ai: false, content: 'First', created_at: '2026-01-01T10:00:00Z' },
      { round: 1, side: 'b', is_ai: false, content: 'Second', created_at: '2026-01-01T10:00:05Z' },
      { round: 1, side: 'a', is_ai: false, content: 'Third', created_at: '2026-01-01T10:00:03Z' },
    ] as any[];

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    renderMessages(messages, d);

    // The loop picks the max — latest string comparison is sufficient for ISO timestamps
    // After processing all 3: 10:00:00 → 10:00:05 → 10:00:03 doesn't update (not > 10:00:05)
    expect(stateModule.state.lastMessageTime).toBe('2026-01-01T10:00:05Z');
  });
});

// ---------------------------------------------------------------------------
// TC-261-06: state.lastMessageTime guard — messages older than current are skipped
// ---------------------------------------------------------------------------
describe('TC-261-06 — renderMessages does not update state.lastMessageTime for older messages', () => {
  it('leaves state.lastMessageTime unchanged when all messages are older', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = '2026-01-01T12:00:00Z';

    const { renderMessages } = await import('../../src/pages/spectate.render-messages.ts');

    const messages = [
      { round: 1, side: 'a', is_ai: false, content: 'Old msg', created_at: '2026-01-01T10:00:00Z' },
    ] as any[];

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    renderMessages(messages, d);

    expect(stateModule.state.lastMessageTime).toBe('2026-01-01T12:00:00Z');
  });
});

// ---------------------------------------------------------------------------
// TC-261-07: AI message uses robot-emoji name, not debater names
// ---------------------------------------------------------------------------
describe('TC-261-07 — renderMessages uses AI label for is_ai messages', () => {
  it('renders AI name for is_ai=true messages regardless of side', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;

    const { renderMessages } = await import('../../src/pages/spectate.render-messages.ts');

    const messages = [
      { round: 1, side: 'a', is_ai: true, content: 'AI speaks', created_at: '2026-01-01T10:00:00Z' },
    ] as any[];

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderMessages(messages, d);

    expect(html).toContain('🤖 AI');
    expect(html).not.toContain('Alice');
  });
});

// ---------------------------------------------------------------------------
// TC-261-08: debater name fallback to 'Side A' / 'Side B' when names are null
// ---------------------------------------------------------------------------
describe('TC-261-08 — renderMessages falls back to Side A/Side B when debater names are null', () => {
  it('uses Side A and Side B when debater_a_name and debater_b_name are null', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;

    const { renderMessages } = await import('../../src/pages/spectate.render-messages.ts');

    const messages = [
      { round: 1, side: 'a', is_ai: false, content: 'Msg A', created_at: '2026-01-01T10:00:00Z' },
      { round: 1, side: 'b', is_ai: false, content: 'Msg B', created_at: '2026-01-01T10:00:01Z' },
    ] as any[];

    const d = { debater_a_name: null, debater_b_name: null } as any;
    const html = renderMessages(messages, d);

    expect(html).toContain('Side A');
    expect(html).toContain('Side B');
  });
});

// ---------------------------------------------------------------------------
// TC-261-09: formatPointBadge — no modifier → "+N pts"
// ---------------------------------------------------------------------------
describe('TC-261-09 — formatPointBadge with no modifier returns simple "+N pts"', () => {
  it('returns "+3 pts" when mult=1.0 and flat=0', async () => {
    const { formatPointBadge } = await import('../../src/pages/spectate.render-messages.ts');

    const pa = {
      id: 'pa-1',
      created_at: '2026-01-01T10:00:00Z',
      round: 1,
      side: 'a',
      base_score: 3,
      metadata: {
        scored_event_id: 'ev-1',
        score_a_after: 10,
        score_b_after: 7,
        base_score: 3,
        in_debate_multiplier: 1.0,
        in_debate_flat: 0,
        final_contribution: 3,
      },
    } as any;

    expect(formatPointBadge(pa)).toBe('+3 pts');
  });
});

// ---------------------------------------------------------------------------
// TC-261-10: formatPointBadge — pure multiplier → "+N × M = F pts"
// ---------------------------------------------------------------------------
describe('TC-261-10 — formatPointBadge with multiplier only returns expanded formula', () => {
  it('returns "+3 × 1.5 = 4.5 pts" when mult=1.5 and flat=0', async () => {
    const { formatPointBadge } = await import('../../src/pages/spectate.render-messages.ts');

    const pa = {
      id: 'pa-2',
      created_at: '2026-01-01T10:00:00Z',
      round: 1,
      side: 'b',
      base_score: 3,
      metadata: {
        scored_event_id: 'ev-2',
        score_a_after: 7,
        score_b_after: 11,
        base_score: 3,
        in_debate_multiplier: 1.5,
        in_debate_flat: 0,
        final_contribution: 4.5,
      },
    } as any;

    expect(formatPointBadge(pa)).toBe('+3 × 1.5 = 4.5 pts');
  });
});

// ---------------------------------------------------------------------------
// TC-261-11: formatPointBadge — flat only → "+F pts"
// ---------------------------------------------------------------------------
describe('TC-261-11 — formatPointBadge with flat bonus only returns "+final pts"', () => {
  it('returns "+6 pts" when mult=1.0 and flat=3', async () => {
    const { formatPointBadge } = await import('../../src/pages/spectate.render-messages.ts');

    const pa = {
      id: 'pa-3',
      created_at: '2026-01-01T10:00:00Z',
      round: 2,
      side: 'a',
      base_score: 3,
      metadata: {
        scored_event_id: 'ev-3',
        score_a_after: 13,
        score_b_after: 7,
        base_score: 3,
        in_debate_multiplier: 1.0,
        in_debate_flat: 3,
        final_contribution: 6,
      },
    } as any;

    expect(formatPointBadge(pa)).toBe('+6 pts');
  });
});

// ---------------------------------------------------------------------------
// TC-261-12: formatPointBadge — both mult and flat → "+N × M + F = final pts"
// ---------------------------------------------------------------------------
describe('TC-261-12 — formatPointBadge with both multiplier and flat returns full formula', () => {
  it('returns "+3 × 1.5 + 1 = 5.5 pts" with both modifiers', async () => {
    const { formatPointBadge } = await import('../../src/pages/spectate.render-messages.ts');

    const pa = {
      id: 'pa-4',
      created_at: '2026-01-01T10:00:00Z',
      round: 2,
      side: 'b',
      base_score: 3,
      metadata: {
        scored_event_id: 'ev-4',
        score_a_after: 7,
        score_b_after: 12,
        base_score: 3,
        in_debate_multiplier: 1.5,
        in_debate_flat: 1,
        final_contribution: 5.5,
      },
    } as any;

    expect(formatPointBadge(pa)).toBe('+3 × 1.5 + 1 = 5.5 pts');
  });
});
