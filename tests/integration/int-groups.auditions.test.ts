/**
 * Integration tests — Seam #390
 * src/pages/groups.auditions.ts → groups.auditions.render
 *
 * Verifies that groups.auditions.ts correctly consumes RULE_LABELS and
 * renderAuditionsList from groups.auditions.render.ts, and that the render
 * module produces correct HTML for all role/status combinations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
  })),
}));

// ── ARCH FILTER ───────────────────────────────────────────────────────────────
describe('ARCH: groups.auditions.ts → groups.auditions.render import lines', () => {
  it('imports RULE_LABELS and renderAuditionsList from groups.auditions.render', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.auditions.ts', 'utf-8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const renderImport = importLines.find(l => l.includes('groups.auditions.render'));
    expect(renderImport).toBeTruthy();
    expect(renderImport).toMatch(/RULE_LABELS/);
    expect(renderImport).toMatch(/renderAuditionsList/);
  });

  it('imports PendingAudition type from groups.auditions.render', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.auditions.ts', 'utf-8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const typeImport = importLines.find(l => l.includes('groups.auditions.render') && l.includes('PendingAudition'));
    expect(typeImport).toBeTruthy();
  });

  it('does NOT import any wall modules', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('src/pages/groups.auditions.ts', 'utf-8');
    const importLines = src.split('\n').filter(l => /from\s+['"]/.test(l));
    const joined = importLines.join('\n');
    const wallPatterns = [
      'webrtc', 'feed-room', 'intro-music', 'cards.ts', 'deepgram',
      'realtime-client', 'voicememo', 'arena-css', 'arena-room-live-audio',
      'arena-sounds', 'arena-sounds-core', 'peermetrics',
    ];
    for (const pat of wallPatterns) {
      expect(joined).not.toContain(pat);
    }
  });
});

// ── RULE_LABELS ───────────────────────────────────────────────────────────────
describe('RULE_LABELS — completeness', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  it('TC1: has exactly 5 entries covering all rule keys', async () => {
    const { RULE_LABELS } = await import('../../src/pages/groups.auditions.render.ts');
    const keys = Object.keys(RULE_LABELS);
    expect(keys).toHaveLength(5);
    expect(keys).toContain('allowed_by_leader');
    expect(keys).toContain('debate_leader_any');
    expect(keys).toContain('debate_member_any');
    expect(keys).toContain('debate_leader_win');
    expect(keys).toContain('debate_member_win');
  });

  it('TC2: all values are non-empty strings', async () => {
    const { RULE_LABELS } = await import('../../src/pages/groups.auditions.render.ts');
    for (const [key, val] of Object.entries(RULE_LABELS)) {
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThan(0);
    }
  });
});

// ── renderAuditionsList ───────────────────────────────────────────────────────
describe('renderAuditionsList — empty state', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  it('TC3: returns empty-state HTML when given an empty array', async () => {
    const { renderAuditionsList } = await import('../../src/pages/groups.auditions.render.ts');
    const html = renderAuditionsList([], 'leader');
    expect(html).toContain('empty-state');
    expect(html).toContain('No pending auditions');
  });

  it('TC3b: returns empty-state HTML when given null/undefined', async () => {
    const { renderAuditionsList } = await import('../../src/pages/groups.auditions.render.ts');
    // @ts-expect-error testing null guard
    const html = renderAuditionsList(null, 'leader');
    expect(html).toContain('No pending auditions');
  });
});

describe('renderAuditionsList — leader view (allowed_by_leader)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  it('TC4: leader sees APPROVE and DENY buttons for allowed_by_leader audition', async () => {
    const { renderAuditionsList } = await import('../../src/pages/groups.auditions.render.ts');
    const auditions = [{
      id: 'aud-001',
      candidate_user_id: 'user-abc',
      candidate_username: 'debater1',
      candidate_display_name: 'Debater One',
      rule: 'allowed_by_leader',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
    }];
    const html = renderAuditionsList(auditions, 'leader');
    expect(html).toContain('data-audition-action="approve"');
    expect(html).toContain('data-audition-action="deny"');
    expect(html).toContain('data-audition-id="aud-001"');
    expect(html).toContain('Debater One');
  });
});

describe('renderAuditionsList — member view (debate-based)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  it('TC5: member sees ACCEPT AUDITION for pending debate-based audition but NOT DENY', async () => {
    const { renderAuditionsList } = await import('../../src/pages/groups.auditions.render.ts');
    const auditions = [{
      id: 'aud-002',
      candidate_user_id: 'user-def',
      candidate_username: 'challenger',
      candidate_display_name: null,
      rule: 'debate_member_any',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
    }];
    const html = renderAuditionsList(auditions, 'member');
    expect(html).toContain('data-audition-action="accept"');
    expect(html).not.toContain('data-audition-action="deny"');
  });

  it('TC5b: leader sees ACCEPT AUDITION and DENY for pending debate-based audition', async () => {
    const { renderAuditionsList } = await import('../../src/pages/groups.auditions.render.ts');
    const auditions = [{
      id: 'aud-003',
      candidate_user_id: 'user-ghi',
      candidate_username: 'hopeful',
      candidate_display_name: 'Hopeful Debater',
      rule: 'debate_leader_win',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
    }];
    const html = renderAuditionsList(auditions, 'leader');
    expect(html).toContain('data-audition-action="accept"');
    expect(html).toContain('data-audition-action="deny"');
  });
});

describe('renderAuditionsList — candidate view (myRole null)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  it('TC6: candidate sees WITHDRAW button and "Your audition" label', async () => {
    const { renderAuditionsList } = await import('../../src/pages/groups.auditions.render.ts');
    const auditions = [{
      id: 'aud-004',
      candidate_user_id: 'user-jkl',
      candidate_username: 'me',
      candidate_display_name: 'Myself',
      rule: 'debate_member_any',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
    }];
    const html = renderAuditionsList(auditions, null);
    expect(html).toContain('data-audition-action="withdraw"');
    expect(html).toContain('Your audition');
    expect(html).not.toContain('Myself');
  });
});

describe('renderAuditionsList — XSS escaping', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  it('TC7: escapes XSS in candidate display name', async () => {
    const { renderAuditionsList } = await import('../../src/pages/groups.auditions.render.ts');
    const auditions = [{
      id: 'aud-005',
      candidate_user_id: 'user-xss',
      candidate_username: 'xssuser',
      candidate_display_name: '<script>alert(1)</script>',
      rule: 'allowed_by_leader',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
    }];
    const html = renderAuditionsList(auditions, 'leader');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('TC7b: escapes XSS in topic field', async () => {
    const { renderAuditionsList } = await import('../../src/pages/groups.auditions.render.ts');
    const auditions = [{
      id: 'aud-006',
      candidate_user_id: 'user-xss2',
      candidate_username: 'harmless',
      candidate_display_name: 'Safe Name',
      rule: 'debate_member_any',
      status: 'pending',
      topic: '<img src=x onerror=alert(1)>',
      created_at: '2026-01-01T00:00:00Z',
    }];
    const html = renderAuditionsList(auditions, 'leader');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });
});

describe('renderAuditionsList — status labels', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  it('TC8: maps status "pending" → "PENDING"', async () => {
    const { renderAuditionsList } = await import('../../src/pages/groups.auditions.render.ts');
    const auditions = [{
      id: 'aud-007',
      candidate_user_id: 'user-s1',
      candidate_username: 'u1',
      candidate_display_name: null,
      rule: 'allowed_by_leader',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
    }];
    const html = renderAuditionsList(auditions, 'leader');
    expect(html).toContain('PENDING');
  });

  it('TC8b: maps status "claimed" → "DEBATE SCHEDULED"', async () => {
    const { renderAuditionsList } = await import('../../src/pages/groups.auditions.render.ts');
    const auditions = [{
      id: 'aud-008',
      candidate_user_id: 'user-s2',
      candidate_username: 'u2',
      candidate_display_name: null,
      rule: 'debate_leader_any',
      status: 'claimed',
      created_at: '2026-01-01T00:00:00Z',
    }];
    const html = renderAuditionsList(auditions, 'leader');
    expect(html).toContain('DEBATE SCHEDULED');
  });

  it('TC8c: maps status "in_progress" → "IN PROGRESS"', async () => {
    const { renderAuditionsList } = await import('../../src/pages/groups.auditions.render.ts');
    const auditions = [{
      id: 'aud-009',
      candidate_user_id: 'user-s3',
      candidate_username: 'u3',
      candidate_display_name: null,
      rule: 'debate_member_win',
      status: 'in_progress',
      created_at: '2026-01-01T00:00:00Z',
    }];
    const html = renderAuditionsList(auditions, 'member');
    expect(html).toContain('IN PROGRESS');
  });
});
