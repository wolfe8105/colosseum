/**
 * Integration tests — spectate.render-timeline.ts → spectate.state
 * SEAM #305
 *
 * renderTimeline reads state.replayData and writes state.lastMessageTime.
 * No RPC calls — tests focus on HTML output and state mutation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Only mock @supabase/supabase-js — spectate.state imports SupabaseClient type
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn() },
  })),
}));

// Mock spectate.render-messages (out of seam)
vi.mock('../../src/pages/spectate.render-messages.ts', () => ({
  renderMessages: vi.fn((_msgs: unknown[], _d: unknown) => '<div class="render-messages-stub"></div>'),
  formatPointBadge: vi.fn((pa: any) => '+' + (pa?.metadata?.final_contribution ?? pa?.base_score ?? 0) + ' pts'),
}));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});

// ---------------------------------------------------------------------------
// ARCH filter
// ---------------------------------------------------------------------------
describe('ARCH — spectate.render-timeline imports only from within spectate', () => {
  it('has no external package imports', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.render-timeline.ts'),
      'utf8'
    );
    const imports = src.split('\n').filter(l => /from\s+['"]/.test(l));
    for (const line of imports) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!match) continue;
      const path = match[1];
      // Must be a relative local import — no npm packages
      expect(path).toMatch(/^\.\//);
    }
  });
});

// ---------------------------------------------------------------------------
// TC-305-01: renderTimeline falls back to renderMessages when state.replayData is null
// ---------------------------------------------------------------------------
describe('TC-305-01 — renderTimeline delegates to renderMessages when state.replayData is null', () => {
  it('calls renderMessages when replayData is null and messages is non-empty', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.replayData = null;
    stateModule.state.lastMessageTime = null;

    const renderMessagesModule = await import('../../src/pages/spectate.render-messages.ts');
    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');

    const messages = [
      { round: 1, side: 'a', is_ai: false, content: 'Hello', created_at: '2026-01-01T10:00:00Z' } as any,
    ];
    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;

    const html = renderTimeline(messages, d);

    expect(renderMessagesModule.renderMessages).toHaveBeenCalledWith(messages, d);
    expect(html).toContain('render-messages-stub');
  });
});

// ---------------------------------------------------------------------------
// TC-305-02: renderTimeline uses state.replayData.speech_events for speech entries
// ---------------------------------------------------------------------------
describe('TC-305-02 — renderTimeline renders speech events from state.replayData', () => {
  it('emits .msg.side-a from speech_events when replayData has speech data', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;
    stateModule.state.replayData = {
      speech_events: [
        {
          id: 'se-1',
          round: 1,
          side: 'a',
          debater_name: 'Alice',
          content: 'My opening argument',
          created_at: '2026-01-01T10:00:00Z',
        },
      ],
      power_ups: [],
      references: [],
      point_awards: [],
      mod_scores: [],
    } as any;

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderTimeline([], d);

    expect(html).toContain('class="msg side-a"');
    expect(html).toContain('Alice');
    expect(html).toContain('My opening argument');
  });
});

// ---------------------------------------------------------------------------
// TC-305-03: renderTimeline updates state.lastMessageTime via speech events
// ---------------------------------------------------------------------------
describe('TC-305-03 — renderTimeline updates state.lastMessageTime from speech events', () => {
  it('sets state.lastMessageTime to the latest speech event created_at', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;
    stateModule.state.replayData = {
      speech_events: [
        { id: 'se-1', round: 1, side: 'a', debater_name: 'Alice', content: 'First', created_at: '2026-01-01T10:00:00Z' },
        { id: 'se-2', round: 1, side: 'b', debater_name: 'Bob', content: 'Second', created_at: '2026-01-01T10:00:05Z' },
      ],
      power_ups: [],
      references: [],
      point_awards: [],
      mod_scores: [],
    } as any;

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    renderTimeline([], d);

    expect(stateModule.state.lastMessageTime).toBe('2026-01-01T10:00:05Z');
  });
});

// ---------------------------------------------------------------------------
// TC-305-04: renderTimeline emits .round-divider on round transitions
// ---------------------------------------------------------------------------
describe('TC-305-04 — renderTimeline emits .round-divider between different rounds', () => {
  it('inserts round dividers when speech events span multiple rounds', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;
    stateModule.state.replayData = {
      speech_events: [
        { id: 'se-1', round: 1, side: 'a', debater_name: 'Alice', content: 'R1 A', created_at: '2026-01-01T10:00:00Z' },
        { id: 'se-2', round: 2, side: 'b', debater_name: 'Bob', content: 'R2 B', created_at: '2026-01-01T10:01:00Z' },
      ],
      power_ups: [],
      references: [],
      point_awards: [],
      mod_scores: [],
    } as any;

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderTimeline([], d);

    const dividerMatches = html.match(/class="round-divider"/g) ?? [];
    expect(dividerMatches.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('Round 1');
    expect(html).toContain('Round 2');
  });
});

// ---------------------------------------------------------------------------
// TC-305-05: renderTimeline emits .timeline-event.power-up-event for power-ups
// ---------------------------------------------------------------------------
describe('TC-305-05 — renderTimeline emits power-up-event for each power-up in state.replayData', () => {
  it('renders .timeline-event.power-up-event with icon and user name', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;
    stateModule.state.replayData = {
      speech_events: [],
      power_ups: [
        {
          id: 'pu-1',
          side: 'a',
          activated_at: '2026-01-01T10:00:30Z',
          user_name: 'Alice',
          power_up_name: 'Double Down',
          power_up_icon: '⚡',
        },
      ],
      references: [],
      point_awards: [],
      mod_scores: [],
    } as any;

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');

    const messages = [
      { round: 1, side: 'a', is_ai: false, content: 'msg', created_at: '2026-01-01T10:00:00Z' } as any,
    ];
    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderTimeline(messages, d);

    expect(html).toContain('power-up-event');
    expect(html).toContain('Alice');
    expect(html).toContain('Double Down');
  });
});

// ---------------------------------------------------------------------------
// TC-305-06: renderTimeline emits .timeline-event.reference-event for references
// ---------------------------------------------------------------------------
describe('TC-305-06 — renderTimeline emits reference-event for each reference in state.replayData', () => {
  it('renders .timeline-event.reference-event with submitter name and ruling', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;
    stateModule.state.replayData = {
      speech_events: [],
      power_ups: [],
      references: [
        {
          id: 'ref-1',
          side: 'b',
          created_at: '2026-01-01T10:00:45Z',
          round: 1,
          submitter_name: 'Bob',
          description: 'A great source',
          url: 'https://example.com',
          ruling: 'accepted',
          ruling_reason: null,
        },
      ],
      point_awards: [],
      mod_scores: [],
    } as any;

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');

    const messages = [
      { round: 1, side: 'b', is_ai: false, content: 'msg', created_at: '2026-01-01T10:00:00Z' } as any,
    ];
    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderTimeline(messages, d);

    expect(html).toContain('reference-event');
    expect(html).toContain('Bob');
    expect(html).toContain('A great source');
    expect(html).toContain('Accepted');
  });
});

// ---------------------------------------------------------------------------
// TC-305-07: renderTimeline attaches point award badge to matching speech event
// ---------------------------------------------------------------------------
describe('TC-305-07 — renderTimeline attaches score badge to speech event with matching point_award', () => {
  it('renders .msg-score-badge inside the matched speech event', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;
    stateModule.state.replayData = {
      speech_events: [
        {
          id: 'se-scored',
          round: 1,
          side: 'a',
          debater_name: 'Alice',
          content: 'Strong point',
          created_at: '2026-01-01T10:00:00Z',
        },
      ],
      power_ups: [],
      references: [],
      point_awards: [
        {
          id: 'pa-1',
          round: 1,
          side: 'a',
          created_at: '2026-01-01T10:00:01Z',
          base_score: 5,
          metadata: {
            scored_event_id: 'se-scored',
            final_contribution: 5,
            in_debate_multiplier: 1.0,
            in_debate_flat: 0,
          },
        },
      ],
      mod_scores: [],
    } as any;

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderTimeline([], d);

    expect(html).toContain('msg-score-badge');
    expect(html).toContain('Strong point');
  });
});

// ---------------------------------------------------------------------------
// SEAM #417 — spectate.render-timeline.ts → spectate.utils (escHtml)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// TC-417-01: escHtml is used on debater names — XSS in name is escaped
// ---------------------------------------------------------------------------
describe('TC-417-01 — renderTimeline escapes XSS in debater_name via escHtml', () => {
  it('does not emit raw <script> from malicious debater_name in speech events', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;
    stateModule.state.replayData = {
      speech_events: [
        {
          id: 'se-xss',
          round: 1,
          side: 'a',
          debater_name: '<script>alert(1)</script>',
          content: 'legit content',
          created_at: '2026-01-01T10:00:00Z',
        },
      ],
      power_ups: [],
      references: [],
      point_awards: [],
      mod_scores: [],
    } as any;

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');
    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderTimeline([], d);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ---------------------------------------------------------------------------
// TC-417-02: escHtml is used on speech content — XSS in content is escaped
// ---------------------------------------------------------------------------
describe('TC-417-02 — renderTimeline escapes XSS in speech event content via escHtml', () => {
  it('escapes angle brackets in speech content', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;
    stateModule.state.replayData = {
      speech_events: [
        {
          id: 'se-xss2',
          round: 1,
          side: 'b',
          debater_name: 'Bob',
          content: '<img src=x onerror=alert(1)>',
          created_at: '2026-01-01T10:00:00Z',
        },
      ],
      power_ups: [],
      references: [],
      point_awards: [],
      mod_scores: [],
    } as any;

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');
    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderTimeline([], d);

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});

// ---------------------------------------------------------------------------
// TC-417-03: escHtml is used on power-up fields — XSS in user_name and power_up_name
// ---------------------------------------------------------------------------
describe('TC-417-03 — renderTimeline escapes XSS in power-up user_name and power_up_name via escHtml', () => {
  it('escapes malicious user_name and power_up_name in power_up entries', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;
    stateModule.state.replayData = {
      speech_events: [],
      power_ups: [
        {
          id: 'pu-xss',
          side: 'a',
          activated_at: '2026-01-01T10:00:30Z',
          user_name: '<b>Evil</b>',
          power_up_name: '"><svg onload=alert(1)>',
          power_up_icon: '⚡',
        },
      ],
      references: [],
      point_awards: [],
      mod_scores: [],
    } as any;

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');
    const messages = [
      { round: 1, side: 'a', is_ai: false, content: 'msg', created_at: '2026-01-01T10:00:00Z' } as any,
    ];
    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderTimeline(messages, d);

    expect(html).not.toContain('<b>Evil</b>');
    expect(html).not.toContain('<svg');
    expect(html).toContain('&lt;b&gt;Evil&lt;/b&gt;');
    expect(html).toContain('&quot;&gt;&lt;svg');
  });
});

// ---------------------------------------------------------------------------
// TC-417-04: escHtml is used on reference fields — submitter_name, description, url escaped
// ---------------------------------------------------------------------------
describe('TC-417-04 — renderTimeline escapes XSS in reference fields via escHtml', () => {
  it('escapes malicious submitter_name and description in reference entries', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;
    stateModule.state.replayData = {
      speech_events: [],
      power_ups: [],
      references: [
        {
          id: 'ref-xss',
          side: 'a',
          created_at: '2026-01-01T10:00:45Z',
          round: 1,
          submitter_name: '<script>xss()</script>',
          description: '<b>bad desc</b>',
          url: 'javascript:alert(1)',
          ruling: 'pending',
          ruling_reason: null,
        },
      ],
      point_awards: [],
      mod_scores: [],
    } as any;

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');
    const messages = [
      { round: 1, side: 'a', is_ai: false, content: 'msg', created_at: '2026-01-01T10:00:00Z' } as any,
    ];
    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderTimeline(messages, d);

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>bad desc</b>');
    expect(html).toContain('&lt;script&gt;xss()&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;bad desc&lt;/b&gt;');
  });
});

// ---------------------------------------------------------------------------
// TC-417-05: escHtml handles null/undefined gracefully — returns empty string
// ---------------------------------------------------------------------------
describe('TC-417-05 — renderTimeline handles null/falsy side values via escHtml gracefully', () => {
  it('does not throw when speech event content is null/empty string', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;
    stateModule.state.replayData = {
      speech_events: [
        {
          id: 'se-null-content',
          round: 1,
          side: 'a',
          debater_name: 'Alice',
          content: null,
          created_at: '2026-01-01T10:00:00Z',
        },
      ],
      power_ups: [],
      references: [],
      point_awards: [],
      mod_scores: [],
    } as any;

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');
    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;

    expect(() => renderTimeline([], d)).not.toThrow();
    const html = renderTimeline([], d);
    // msg-text should be present with empty content — escHtml('') returns ''
    expect(html).toContain('msg-text');
  });
});

// ---------------------------------------------------------------------------
// TC-417-06: escHtml applied to side attribute — prevents class injection
// ---------------------------------------------------------------------------
describe('TC-417-06 — renderTimeline escapes side value used in CSS class via escHtml', () => {
  it('escapes a side value containing a double-quote to prevent class attribute injection', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;
    stateModule.state.replayData = {
      speech_events: [
        {
          id: 'se-side-inject',
          round: 1,
          side: 'a" injected="yes',
          debater_name: 'Alice',
          content: 'test',
          created_at: '2026-01-01T10:00:00Z',
        },
      ],
      power_ups: [],
      references: [],
      point_awards: [],
      mod_scores: [],
    } as any;

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');
    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderTimeline([], d);

    // The raw inject payload must not appear unescaped
    expect(html).not.toContain('injected="yes"');
    expect(html).toContain('&quot;');
  });
});

// ---------------------------------------------------------------------------
// TC-417-07: ARCH filter — spectate.render-timeline.ts imports escHtml from spectate.utils
// ---------------------------------------------------------------------------
describe('TC-417-07 — ARCH: spectate.render-timeline.ts explicitly imports escHtml from spectate.utils', () => {
  it('contains an import of escHtml from spectate.utils', () => {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const src = readFileSync(
      resolve(__dirname, '../../src/pages/spectate.render-timeline.ts'),
      'utf8'
    );
    const imports = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const utilsImport = imports.find((l: string) => l.includes('spectate.utils'));
    expect(utilsImport).toBeDefined();
    expect(utilsImport).toContain('escHtml');
  });
});

// ===========================================================================
// SEAM #504 — spectate.render-timeline.ts → spectate.render-messages
// renderTimeline delegates to renderMessages (and uses formatPointBadge) from
// spectate.render-messages when no enrichment data is present.
// ===========================================================================

// ---------------------------------------------------------------------------
// TC-504-01: renderTimeline delegates to renderMessages when replayData is null
// ---------------------------------------------------------------------------
describe('TC-504-01 — renderTimeline calls renderMessages when replayData is null', () => {
  it('calls renderMessages with messages+debate and returns its output', async () => {
    // The top-level vi.mock for spectate.render-messages is already active.
    // Use vi.mocked to override the return value for this test.
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.replayData = null;
    stateModule.state.lastMessageTime = null;

    const renderMessagesModule = await import('../../src/pages/spectate.render-messages.ts');
    vi.mocked(renderMessagesModule.renderMessages).mockReturnValueOnce('<div class="stub-504-01"></div>');

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');

    const messages = [
      { round: 1, side: 'a', is_ai: false, content: 'Hello', created_at: '2026-01-01T10:00:00Z' } as any,
    ];
    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;

    const html = renderTimeline(messages, d);

    expect(renderMessagesModule.renderMessages).toHaveBeenCalledWith(messages, d);
    expect(html).toContain('stub-504-01');
  });
});

// ---------------------------------------------------------------------------
// TC-504-02: renderTimeline delegates to renderMessages when replayData has all-empty buckets
// ---------------------------------------------------------------------------
describe('TC-504-02 — renderTimeline calls renderMessages when replayData has no enrichment', () => {
  it('calls renderMessages when all replayData buckets are empty and messages exist', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.replayData = {
      speech_events: [],
      power_ups: [],
      references: [],
      point_awards: [],
      mod_scores: [],
    } as any;
    stateModule.state.lastMessageTime = null;

    const renderMessagesModule = await import('../../src/pages/spectate.render-messages.ts');
    vi.mocked(renderMessagesModule.renderMessages).mockReturnValueOnce('<div class="stub-504-02"></div>');

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');

    const messages = [
      { round: 1, side: 'b', is_ai: false, content: 'Argument', created_at: '2026-01-01T10:00:00Z' } as any,
    ];
    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;

    const html = renderTimeline(messages, d);

    expect(renderMessagesModule.renderMessages).toHaveBeenCalledWith(messages, d);
    expect(html).toContain('stub-504-02');
  });
});

// ---------------------------------------------------------------------------
// TC-504-03: renderTimeline does NOT call renderMessages when speech_events exist
// ---------------------------------------------------------------------------
describe('TC-504-03 — renderTimeline does not call renderMessages when speech_events are present', () => {
  it('skips renderMessages delegation when replayData has speech_events', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.replayData = {
      speech_events: [
        { id: 'se-1', round: 1, side: 'a', debater_name: 'Alice', content: 'Arg', created_at: '2026-01-01T10:00:00Z' },
      ],
      power_ups: [],
      references: [],
      point_awards: [],
      mod_scores: [],
    } as any;
    stateModule.state.lastMessageTime = null;

    const renderMessagesModule = await import('../../src/pages/spectate.render-messages.ts');
    vi.mocked(renderMessagesModule.renderMessages).mockClear();

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    renderTimeline([], d);

    expect(renderMessagesModule.renderMessages).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// TC-504-04: formatPointBadge from render-messages is used for score badge text
// ---------------------------------------------------------------------------
describe('TC-504-04 — renderTimeline uses formatPointBadge from render-messages for score badges', () => {
  it('produces .msg-score-badge; formatPointBadge is imported from render-messages (not inlined)', async () => {
    // formatPointBadge is called from _renderSpeech via the module import.
    // We verify: (a) score badge appears in HTML, (b) the mocked formatPointBadge was called.
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.lastMessageTime = null;
    stateModule.state.replayData = {
      speech_events: [
        { id: 'se-linked', round: 1, side: 'a', debater_name: 'Alice', content: 'Point', created_at: '2026-01-01T10:00:00Z' },
      ],
      power_ups: [],
      references: [],
      point_awards: [
        {
          id: 'pa-linked',
          round: 1,
          side: 'a',
          created_at: '2026-01-01T10:00:01Z',
          base_score: 3,
          metadata: { scored_event_id: 'se-linked', final_contribution: 3, in_debate_multiplier: 1.0, in_debate_flat: 0 },
        },
      ],
      mod_scores: [],
    } as any;

    const renderMessagesModule = await import('../../src/pages/spectate.render-messages.ts');
    vi.mocked(renderMessagesModule.formatPointBadge).mockReturnValueOnce('BADGE_SENTINEL_504_04');

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');
    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderTimeline([], d);

    expect(html).toContain('msg-score-badge');
    expect(renderMessagesModule.formatPointBadge).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// TC-504-05: renderTimeline returns empty string when no messages and no enrichment
// ---------------------------------------------------------------------------
describe('TC-504-05 — renderTimeline returns empty string when no messages and replayData is null', () => {
  it('returns empty string for empty messages array and null replayData', async () => {
    const stateModule = await import('../../src/pages/spectate.state.ts');
    stateModule.state.replayData = null;
    stateModule.state.lastMessageTime = null;

    const { renderTimeline } = await import('../../src/pages/spectate.render-timeline.ts');

    const d = { debater_a_name: 'Alice', debater_b_name: 'Bob' } as any;
    const html = renderTimeline([], d);

    // no messages + no replayData → hasEnrichment is false,
    // messages.length === 0 → renderMessages NOT called → returns ''
    expect(html).toBe('');
  });
});

// ---------------------------------------------------------------------------
// ARCH-504: spectate.render-timeline.ts imports renderMessages and formatPointBadge
//           from spectate.render-messages
// ---------------------------------------------------------------------------
describe('ARCH-504 — spectate.render-timeline.ts imports renderMessages + formatPointBadge from spectate.render-messages', () => {
  it('has import of renderMessages and formatPointBadge from spectate.render-messages', () => {
    const { readFileSync: rfs } = require('fs');
    const { resolve: res } = require('path');
    const src = rfs(
      res(__dirname, '../../src/pages/spectate.render-timeline.ts'),
      'utf8'
    );
    const imports = src.split('\n').filter((l: string) => /from\s+['"]/.test(l));
    const renderMsgImport = imports.find((l: string) => l.includes('spectate.render-messages'));
    expect(renderMsgImport).toBeDefined();
    expect(renderMsgImport).toContain('renderMessages');
    expect(renderMsgImport).toContain('formatPointBadge');
  });
});
