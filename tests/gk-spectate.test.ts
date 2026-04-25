// ============================================================
// GK — F-05 DEBATE RECORDING AND REPLAY — tests/gk-spectate.test.ts
// Source: src/pages/spectate.ts
// Spec:   docs/THE-MODERATOR-PUNCH-LIST.md row F-05
//         docs/product/THE-MODERATOR-FEATURE-SPECS-PENDING.md §F-05
//
// Agent 2 — Gatekeeper run. Tests driven by spec only.
//
// CLASSIFICATION:
//   formatPointBadge()  — Pure calculation: no mocks needed
//   renderTimeline()    — HTML string builder: mock state, verify output
//
// F-05 spec claims under test:
//   Inline point awards: no modifier → "+N pts"
//   Multiplier only → "+N × M = T pts"
//   Flat only → "+T pts"
//   Both → "+N × M + F = T pts"
//   Modifier=1.0 hidden — no "× 1.0" ever shown
//   speech_events bucket used when present (linked inline to awards)
//   scored_event_id links award badge to speech entry
//   Orphan award (no scored_event_id) → standalone score-event
//   No speech_events → all awards are standalone score-events
//   power_ups → power-up-event class
//   references → reference-event class
//   ruling=accepted → ✅ Accepted
//   ruling=rejected → ❌ Rejected
//   other ruling → ⏳ Pending
//   entries sorted chronologically
//   round dividers at round transitions
//   no enrichment + messages → renderMessages fallback
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── vi.hoisted state bag ──────────────────────────────────────

const stateVars = vi.hoisted(() => ({
  replayData: null as unknown,
  lastMessageTime: null as string | null,
}));

// ── vi.mock: spectate.state.ts ────────────────────────────────

vi.mock('../src/pages/spectate.state.ts', () => ({
  state: {
    get replayData()         { return stateVars.replayData; },
    set replayData(v: unknown) { stateVars.replayData = v; },
    get lastMessageTime()    { return stateVars.lastMessageTime; },
    set lastMessageTime(v: string | null) { stateVars.lastMessageTime = v; },
  },
}));

// ── imports after mocks ───────────────────────────────────────

import { formatPointBadge } from '../src/pages/spectate.render-messages.ts';
import { renderTimeline }   from '../src/pages/spectate.render-timeline.ts';
import type {
  ReplayPointAward,
  SpectateDebate,
  ReplayData,
  ReplaySpeechEvent,
  ReplayPowerUp,
  ReplayReference,
} from '../src/pages/spectate.types.ts';

// ── helpers ───────────────────────────────────────────────────

function makeDebate(overrides: Partial<SpectateDebate> = {}): SpectateDebate {
  return {
    status: 'completed',
    mode: 'text',
    topic: 'Test topic',
    debater_a_name: 'Alice',
    debater_a_elo: 1200,
    debater_a_avatar: null,
    debater_b_name: 'Bob',
    debater_b_elo: 1200,
    debater_b_avatar: null,
    moderator_type: null,
    moderator_id: null,
    moderator_name: null,
    ruleset: null,
    spectator_count: 1,
    current_round: null,
    total_rounds: null,
    vote_count_a: null,
    vote_count_b: null,
    score_a: null,
    score_b: null,
    winner: null,
    ai_scorecard: null,
    ...overrides,
  };
}

function makePointAward(overrides: Partial<ReplayPointAward> = {}): ReplayPointAward {
  const base: ReplayPointAward = {
    id: 'pa-1',
    created_at: '2026-01-01T00:00:05Z',
    round: 1,
    side: 'a',
    base_score: 3,
    metadata: {
      scored_event_id: '',
      score_a_after: 3,
      score_b_after: 0,
      base_score: 3,
      in_debate_multiplier: 1.0,
      in_debate_flat: 0,
      final_contribution: 3,
    },
  };
  return { ...base, ...overrides };
}

function makeSpeechEvent(overrides: Partial<ReplaySpeechEvent> = {}): ReplaySpeechEvent {
  return {
    id: 'se-1',
    created_at: '2026-01-01T00:00:03Z',
    round: 1,
    side: 'a',
    content: 'Speech content',
    user_id: 'u-1',
    debater_name: 'Alice',
    ...overrides,
  };
}

function makeReplayData(overrides: Partial<ReplayData> = {}): ReplayData {
  return {
    power_ups: [],
    references: [],
    mod_scores: [],
    point_awards: [],
    speech_events: [],
    ...overrides,
  };
}

// ── lifecycle ─────────────────────────────────────────────────

beforeEach(() => {
  stateVars.replayData = null;
  stateVars.lastMessageTime = null;
});

// ════════════════════════════════════════════════════════════════
// Section 1 — formatPointBadge
// Spec: F-05 "every mod-awarded point appears inline"
//       No modifier → "+N pts"
//       Multiplier only → "+N × M = T pts"  (× = ×)
//       Flat only → "+T pts"
//       Both → "+N × M + F = T pts"
//       Modifier = 1.0 is hidden — no "× 1.0" ever shown
// ════════════════════════════════════════════════════════════════

// TC-01: no modifier → "+N pts"

describe('TC-01 — formatPointBadge: no modifier (mult=1.0, flat=0) → "+N pts"', () => {
  it('returns "+3 pts" for base=3, mult=1.0, flat=0', () => {
    const pa = makePointAward({
      base_score: 3,
      metadata: {
        scored_event_id: 'x',
        score_a_after: 3, score_b_after: 0,
        base_score: 3,
        in_debate_multiplier: 1.0,
        in_debate_flat: 0,
        final_contribution: 3,
      },
    });
    expect(formatPointBadge(pa)).toBe('+3 pts');
  });
});

// TC-02: multiplier only → "+N × M = T pts"

describe('TC-02 — formatPointBadge: multiplier only (mult≠1.0, flat=0) → "+N × M = T pts"', () => {
  it('returns "+3 × 1.5 = 4.5 pts" for base=3, mult=1.5, flat=0, final=4.5', () => {
    const pa = makePointAward({
      base_score: 3,
      metadata: {
        scored_event_id: 'x',
        score_a_after: 5, score_b_after: 0,
        base_score: 3,
        in_debate_multiplier: 1.5,
        in_debate_flat: 0,
        final_contribution: 4.5,
      },
    });
    // Spec says × is literal — × (multiplication sign)
    expect(formatPointBadge(pa)).toBe('+3 × 1.5 = 4.5 pts');
  });
});

// TC-03: flat only → "+T pts" using final_contribution

describe('TC-03 — formatPointBadge: flat only (mult=1.0, flat≠0) → "+T pts" using final_contribution', () => {
  it('returns "+5 pts" for base=3, mult=1.0, flat=2, final=5', () => {
    const pa = makePointAward({
      base_score: 3,
      metadata: {
        scored_event_id: 'x',
        score_a_after: 5, score_b_after: 0,
        base_score: 3,
        in_debate_multiplier: 1.0,
        in_debate_flat: 2,
        final_contribution: 5,
      },
    });
    expect(formatPointBadge(pa)).toBe('+5 pts');
  });
});

// TC-04: both mult and flat → "+N × M + F = T pts"

describe('TC-04 — formatPointBadge: mult≠1.0 and flat≠0 → "+N × M + F = T pts"', () => {
  it('returns "+3 × 1.5 + 1 = 5.5 pts" for base=3, mult=1.5, flat=1, final=5.5', () => {
    const pa = makePointAward({
      base_score: 3,
      metadata: {
        scored_event_id: 'x',
        score_a_after: 6, score_b_after: 0,
        base_score: 3,
        in_debate_multiplier: 1.5,
        in_debate_flat: 1,
        final_contribution: 5.5,
      },
    });
    expect(formatPointBadge(pa)).toBe('+3 × 1.5 + 1 = 5.5 pts');
  });
});

// TC-05: mult=1.0 never shows "× 1.0" — spec: "hidden entirely when it equals 1.0"

describe('TC-05 — formatPointBadge: mult=1.0 hidden — output never contains "× 1.0" or × 1.0', () => {
  it('does not include × 1.0 when multiplier is exactly 1.0 and no flat', () => {
    const pa = makePointAward({
      base_score: 5,
      metadata: {
        scored_event_id: 'x',
        score_a_after: 5, score_b_after: 0,
        base_score: 5,
        in_debate_multiplier: 1.0,
        in_debate_flat: 0,
        final_contribution: 5,
      },
    });
    const result = formatPointBadge(pa);
    expect(result).not.toContain('× 1');
    expect(result).not.toContain('× 1');
  });

  it('does not include × 1.0 when multiplier=1.0 and flat is present', () => {
    const pa = makePointAward({
      base_score: 3,
      metadata: {
        scored_event_id: 'x',
        score_a_after: 5, score_b_after: 0,
        base_score: 3,
        in_debate_multiplier: 1.0,
        in_debate_flat: 2,
        final_contribution: 5,
      },
    });
    const result = formatPointBadge(pa);
    expect(result).not.toContain('× 1');
    expect(result).not.toContain('× 1');
  });
});

// ════════════════════════════════════════════════════════════════
// Section 2 — renderTimeline
// Spec: F-05 "Replay enrichment for the archive pipeline"
//       get_debate_replay_data returns point_awards + speech_events buckets
//       scored_event_id links point award inline to speech entry
//       No scored_event_id → orphan → standalone score-event entry
//       No speech_events → all point_awards become standalone score-events
//       No enrichment + messages → falls back to renderMessages
// ════════════════════════════════════════════════════════════════

// TC-06: no enrichment data + messages → falls back to renderMessages output

describe('TC-06 — renderTimeline: no enrichment (replayData null) + messages → renderMessages fallback', () => {
  it('returns HTML containing message content when replayData is null', () => {
    stateVars.replayData = null;
    const msgs = [{ round: 1, side: 'a', is_ai: false, content: 'Test argument', created_at: '2026-01-01T00:00:00Z' }];
    const result = renderTimeline(msgs, makeDebate());
    expect(result).toContain('Test argument');
    expect(result).toContain('class="msg');
  });
});

// TC-07: enrichment present but all empty + no messages → empty string

describe('TC-07 — renderTimeline: empty replayData + empty messages → empty string', () => {
  it('returns empty string when no entries exist', () => {
    stateVars.replayData = makeReplayData();
    const result = renderTimeline([], makeDebate());
    expect(result).toBe('');
  });
});

// TC-08: speech_events present → speech path used (debater_name + content rendered)

describe('TC-08 — renderTimeline: speech_events present → renders debater_name and content', () => {
  it('renders speech debater name and content when speech_events are in replayData', () => {
    stateVars.replayData = makeReplayData({
      speech_events: [makeSpeechEvent({ debater_name: 'Alice', content: 'My argument here' })],
    });
    const result = renderTimeline([], makeDebate());
    expect(result).toContain('Alice');
    expect(result).toContain('My argument here');
  });
});

// TC-09: point award with scored_event_id → badge inline on matched speech entry

describe('TC-09 — renderTimeline: scored_event_id links award inline to speech entry as msg-score-badge', () => {
  it('renders msg-score-badge on the speech block when scored_event_id matches speech id', () => {
    const pa = makePointAward({
      id: 'pa-linked',
      created_at: '2026-01-01T00:00:04Z',
      side: 'a',
      base_score: 3,
      metadata: {
        scored_event_id: 'se-1',
        score_a_after: 3, score_b_after: 0,
        base_score: 3,
        in_debate_multiplier: 1.0,
        in_debate_flat: 0,
        final_contribution: 3,
      },
    });
    stateVars.replayData = makeReplayData({
      speech_events: [makeSpeechEvent({ id: 'se-1', content: 'Speech content' })],
      point_awards: [pa],
    });
    const result = renderTimeline([], makeDebate());
    expect(result).toContain('msg-score-badge');
    expect(result).toContain('+3 pts');
  });

  it('badge does NOT appear as standalone score-event when it is linked inline', () => {
    const pa = makePointAward({
      id: 'pa-linked',
      created_at: '2026-01-01T00:00:04Z',
      metadata: {
        scored_event_id: 'se-1',
        score_a_after: 3, score_b_after: 0,
        base_score: 3,
        in_debate_multiplier: 1.0,
        in_debate_flat: 0,
        final_contribution: 3,
      },
    });
    stateVars.replayData = makeReplayData({
      speech_events: [makeSpeechEvent({ id: 'se-1' })],
      point_awards: [pa],
    });
    const result = renderTimeline([], makeDebate());
    // Should NOT contain standalone score-event div
    expect(result).not.toContain('score-event');
  });
});

// TC-10: point award without scored_event_id (empty string → falsy) → orphan → standalone score-event

describe('TC-10 — renderTimeline: empty scored_event_id → orphan award → standalone score-event', () => {
  it('renders standalone score-event when scored_event_id is empty string', () => {
    const pa = makePointAward({
      id: 'pa-orphan',
      created_at: '2026-01-01T00:00:04Z',
      side: 'a',
      base_score: 2,
      metadata: {
        scored_event_id: '',
        score_a_after: 2, score_b_after: 0,
        base_score: 2,
        in_debate_multiplier: 1.0,
        in_debate_flat: 0,
        final_contribution: 2,
      },
    });
    stateVars.replayData = makeReplayData({
      speech_events: [makeSpeechEvent({ id: 'se-1' })],
      point_awards: [pa],
    });
    const result = renderTimeline([], makeDebate());
    expect(result).toContain('score-event');
    expect(result).toContain('+2 pts');
  });
});

// TC-11: no speech_events + point_awards → all become standalone score-events

describe('TC-11 — renderTimeline: no speech_events + point_awards → all awards as standalone score-events', () => {
  it('renders score-event for point_award when speech_events bucket is empty', () => {
    const pa = makePointAward({
      id: 'pa-standalone',
      created_at: '2026-01-01T00:00:05Z',
      side: 'b',
      base_score: 4,
      metadata: {
        scored_event_id: 'some-id',
        score_a_after: 0, score_b_after: 4,
        base_score: 4,
        in_debate_multiplier: 1.0,
        in_debate_flat: 0,
        final_contribution: 4,
      },
    });
    stateVars.replayData = makeReplayData({
      speech_events: [],
      point_awards: [pa],
    });
    const msgs = [{ round: 1, side: 'b', is_ai: false, content: 'Bob argument', created_at: '2026-01-01T00:00:02Z' }];
    const result = renderTimeline(msgs, makeDebate());
    expect(result).toContain('score-event');
    expect(result).toContain('+4 pts');
  });
});

// TC-12: power_ups rendered with power-up-event class

describe('TC-12 — renderTimeline: power_ups rendered with power-up-event class', () => {
  it('renders power-up-event div with power_up_name', () => {
    stateVars.replayData = makeReplayData({
      power_ups: [{
        power_up_id: 'pu-1',
        user_id: 'u-1',
        activated_at: '2026-01-01T00:00:06Z',
        power_up_name: 'Point Surge',
        power_up_icon: '⚡',
        user_name: 'Alice',
        side: 'a',
      } as ReplayPowerUp],
      speech_events: [makeSpeechEvent()],
    });
    const result = renderTimeline([], makeDebate());
    expect(result).toContain('power-up-event');
    expect(result).toContain('Point Surge');
  });

  it('includes the activating user name in power-up event output', () => {
    stateVars.replayData = makeReplayData({
      power_ups: [{
        power_up_id: 'pu-2',
        user_id: 'u-1',
        activated_at: '2026-01-01T00:00:06Z',
        power_up_name: 'Opponent Siphon',
        power_up_icon: '🤷',
        user_name: 'Bob',
        side: 'b',
      } as ReplayPowerUp],
      speech_events: [makeSpeechEvent()],
    });
    const result = renderTimeline([], makeDebate());
    expect(result).toContain('Bob');
  });
});

// TC-13: references rendered with reference-event class

describe('TC-13 — renderTimeline: references rendered with reference-event class', () => {
  it('renders reference-event div with submitter_name', () => {
    stateVars.replayData = makeReplayData({
      references: [{
        id: 'ref-1',
        submitter_id: 'u-1',
        round: 1,
        url: 'https://example.com',
        description: 'Key evidence',
        supports_side: 'a',
        ruling: 'accepted',
        ruling_reason: null,
        created_at: '2026-01-01T00:00:07Z',
        ruled_at: null,
        submitter_name: 'Alice',
        side: 'a',
      } as ReplayReference],
      speech_events: [makeSpeechEvent()],
    });
    const result = renderTimeline([], makeDebate());
    expect(result).toContain('reference-event');
    expect(result).toContain('Alice');
  });
});

// TC-14: ruling=accepted → ✅ Accepted

describe('TC-14 — renderTimeline: ruling="accepted" renders ✅ Accepted', () => {
  it('shows ✅ and "Accepted" for accepted ruling', () => {
    stateVars.replayData = makeReplayData({
      references: [{
        id: 'ref-1', submitter_id: 'u-1', round: 1, url: '', description: '',
        supports_side: 'a', ruling: 'accepted', ruling_reason: null,
        created_at: '2026-01-01T00:00:07Z', ruled_at: null, submitter_name: 'Alice', side: 'a',
      } as ReplayReference],
      speech_events: [makeSpeechEvent()],
    });
    const result = renderTimeline([], makeDebate());
    expect(result).toContain('✅');
    expect(result).toContain('Accepted');
  });
});

// TC-15: ruling=rejected → ❌ Rejected

describe('TC-15 — renderTimeline: ruling="rejected" renders ❌ Rejected', () => {
  it('shows ❌ and "Rejected" for rejected ruling', () => {
    stateVars.replayData = makeReplayData({
      references: [{
        id: 'ref-1', submitter_id: 'u-1', round: 1, url: '', description: '',
        supports_side: 'b', ruling: 'rejected', ruling_reason: null,
        created_at: '2026-01-01T00:00:07Z', ruled_at: null, submitter_name: 'Bob', side: 'b',
      } as ReplayReference],
      speech_events: [makeSpeechEvent()],
    });
    const result = renderTimeline([], makeDebate());
    expect(result).toContain('❌');
    expect(result).toContain('Rejected');
  });
});

// TC-16: other ruling → ⏳ Pending

describe('TC-16 — renderTimeline: non-accepted/rejected ruling renders ⏳ Pending', () => {
  it('shows ⏳ and "Pending" for ruling="pending"', () => {
    stateVars.replayData = makeReplayData({
      references: [{
        id: 'ref-1', submitter_id: 'u-1', round: 1, url: '', description: '',
        supports_side: 'a', ruling: 'pending', ruling_reason: null,
        created_at: '2026-01-01T00:00:07Z', ruled_at: null, submitter_name: 'Alice', side: 'a',
      } as ReplayReference],
      speech_events: [makeSpeechEvent()],
    });
    const result = renderTimeline([], makeDebate());
    expect(result).toContain('⏳');
    expect(result).toContain('Pending');
  });

  it('shows ⏳ Pending for unrecognised ruling values', () => {
    stateVars.replayData = makeReplayData({
      references: [{
        id: 'ref-2', submitter_id: 'u-1', round: 1, url: '', description: '',
        supports_side: 'a', ruling: 'disputed', ruling_reason: null,
        created_at: '2026-01-01T00:00:07Z', ruled_at: null, submitter_name: 'Alice', side: 'a',
      } as ReplayReference],
      speech_events: [makeSpeechEvent()],
    });
    const result = renderTimeline([], makeDebate());
    expect(result).toContain('⏳');
    expect(result).toContain('Pending');
  });
});

// TC-17: entries sorted chronologically by timestamp

describe('TC-17 — renderTimeline: all entries sorted chronologically by timestamp', () => {
  it('renders earlier speech before later speech regardless of insertion order', () => {
    stateVars.replayData = makeReplayData({
      speech_events: [
        makeSpeechEvent({ id: 'se-late',  created_at: '2026-01-01T00:00:10Z', round: 2, side: 'b', content: 'Late speech',  debater_name: 'Bob' }),
        makeSpeechEvent({ id: 'se-early', created_at: '2026-01-01T00:00:01Z', round: 1, side: 'a', content: 'Early speech', debater_name: 'Alice' }),
      ],
    });
    const result = renderTimeline([], makeDebate());
    expect(result.indexOf('Early speech')).toBeLessThan(result.indexOf('Late speech'));
  });

  it('renders power-up event after a speech with earlier timestamp', () => {
    stateVars.replayData = makeReplayData({
      speech_events: [makeSpeechEvent({ id: 'se-1', created_at: '2026-01-01T00:00:02Z', content: 'Speech first' })],
      power_ups: [{
        power_up_id: 'pu-1',
        user_id: 'u-1',
        activated_at: '2026-01-01T00:00:09Z',
        power_up_name: 'Point Surge',
        power_up_icon: '⚡',
        user_name: 'Alice',
        side: 'a',
      } as ReplayPowerUp],
    });
    const result = renderTimeline([], makeDebate());
    expect(result.indexOf('Speech first')).toBeLessThan(result.indexOf('Point Surge'));
  });
});

// TC-18: round dividers emitted at round transitions

describe('TC-18 — renderTimeline: round-divider emitted when round number changes', () => {
  it('renders round-divider class at round boundary', () => {
    stateVars.replayData = makeReplayData({
      speech_events: [
        makeSpeechEvent({ id: 'se-1', created_at: '2026-01-01T00:00:01Z', round: 1, content: 'R1' }),
        makeSpeechEvent({ id: 'se-2', created_at: '2026-01-01T00:00:10Z', round: 2, content: 'R2' }),
      ],
    });
    const result = renderTimeline([], makeDebate());
    expect(result).toContain('round-divider');
    expect(result).toContain('Round 2');
  });

  it('emits only one divider per round even with multiple entries in that round', () => {
    stateVars.replayData = makeReplayData({
      speech_events: [
        makeSpeechEvent({ id: 'se-1', created_at: '2026-01-01T00:00:01Z', round: 1, content: 'R1-A' }),
        makeSpeechEvent({ id: 'se-2', created_at: '2026-01-01T00:00:02Z', round: 1, side: 'b', content: 'R1-B', debater_name: 'Bob' }),
      ],
    });
    const result = renderTimeline([], makeDebate());
    const dividerCount = (result.match(/round-divider/g) || []).length;
    expect(dividerCount).toBe(1);
  });
});

// TC-19: speech entry with no matching award → no badge rendered

describe('TC-19 — renderTimeline: speech entry with no matching award renders without msg-score-badge', () => {
  it('does not render msg-score-badge when no point_award matches speech id', () => {
    stateVars.replayData = makeReplayData({
      speech_events: [makeSpeechEvent({ id: 'se-unscored', content: 'Unscored speech' })],
      point_awards: [],
    });
    const result = renderTimeline([], makeDebate());
    expect(result).not.toContain('msg-score-badge');
  });
});

// TC-20: standalone score entries render with score-event class

describe('TC-20 — renderTimeline: standalone score entries render with score-event class and award badge', () => {
  it('renders timeline-event score-event with formatPointBadge output', () => {
    const pa = makePointAward({
      id: 'pa-standalone',
      created_at: '2026-01-01T00:00:05Z',
      side: 'a',
      base_score: 2,
      metadata: {
        scored_event_id: '',
        score_a_after: 2, score_b_after: 0,
        base_score: 2,
        in_debate_multiplier: 1.0,
        in_debate_flat: 0,
        final_contribution: 2,
      },
    });
    stateVars.replayData = makeReplayData({ point_awards: [pa] });
    const msgs = [{ round: 1, side: 'a', is_ai: false, content: 'Arg', created_at: '2026-01-01T00:00:01Z' }];
    const result = renderTimeline(msgs, makeDebate());
    expect(result).toContain('score-event');
    expect(result).toContain('+2 pts');
  });

  it('score-event includes side class (side-a / side-b) matching the awarded side', () => {
    const pa = makePointAward({
      id: 'pa-side-b',
      created_at: '2026-01-01T00:00:05Z',
      side: 'b',
      base_score: 1,
      metadata: {
        scored_event_id: '',
        score_a_after: 0, score_b_after: 1,
        base_score: 1,
        in_debate_multiplier: 1.0,
        in_debate_flat: 0,
        final_contribution: 1,
      },
    });
    stateVars.replayData = makeReplayData({ point_awards: [pa] });
    const msgs = [{ round: 1, side: 'b', is_ai: false, content: 'Arg', created_at: '2026-01-01T00:00:01Z' }];
    const result = renderTimeline(msgs, makeDebate());
    expect(result).toContain('side-b');
  });
});

// ════════════════════════════════════════════════════════════════
// ARCH — Step 4: Architecture test
// Every import in src/pages/spectate.ts must be on the
// allowed list derived from the Step 2 read of the file.
// ════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { resolve }      from 'path';

describe('ARCH — src/pages/spectate.ts only imports from allowed modules', () => {
  it('has no static imports outside the allowed list', () => {
    const allowed = [
      '../auth.ts',
      '../contracts/rpc-schemas.ts',
      '../nudge.ts',
      '../analytics.ts',
      './spectate.state.ts',
      './spectate.render.ts',
      './spectate.vote.ts',
      './spectate.chat.ts',
      './spectate.types.ts',
    ];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/spectate.ts'),
      'utf-8'
    );
    const importLines = source
      .split('\n')
      .filter(line => line.trimStart().startsWith('import '));
    const paths = importLines
      .map(line => {
        const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/);
        if (fromMatch) return fromMatch[1];
        const sideEffectMatch = line.match(/^import\s+['"]([^'"]+)['"]/);
        return sideEffectMatch ? sideEffectMatch[1] : null;
      })
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
