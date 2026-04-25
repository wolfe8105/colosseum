/**
 * Tests for src/pages/groups.auditions.render.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

vi.mock('../src/config.ts', () => ({
  escapeHTML: vi.fn((s: string) => s),
}));

import { renderAuditionsList, RULE_LABELS } from '../src/pages/groups.auditions.render.ts';
import type { PendingAudition } from '../src/pages/groups.auditions.render.ts';

function makeAudition(overrides: Partial<PendingAudition> = {}): PendingAudition {
  return {
    id: 'a1',
    candidate_user_id: 'u1',
    candidate_username: 'fighter99',
    candidate_display_name: 'Fighter',
    rule: 'allowed_by_leader',
    status: 'pending',
    topic: null,
    created_at: '2026-01-01',
    ...overrides,
  };
}

describe('RULE_LABELS — has expected keys', () => {
  it('TC1: contains all 5 rule keys', () => {
    expect(RULE_LABELS).toHaveProperty('allowed_by_leader');
    expect(RULE_LABELS).toHaveProperty('debate_leader_any');
    expect(RULE_LABELS).toHaveProperty('debate_member_any');
    expect(RULE_LABELS).toHaveProperty('debate_leader_win');
    expect(RULE_LABELS).toHaveProperty('debate_member_win');
  });
});

describe('renderAuditionsList — empty state', () => {
  it('TC2: returns empty state HTML when list is empty', () => {
    const html = renderAuditionsList([], null);
    expect(html).toContain('No pending auditions');
  });

  it('TC3: returns empty state when null passed', () => {
    const html = renderAuditionsList(null as unknown as PendingAudition[], null);
    expect(html).toContain('No pending auditions');
  });
});

describe('renderAuditionsList — renders candidate name', () => {
  it('TC4: includes candidate display_name in output', () => {
    const html = renderAuditionsList([makeAudition()], 'leader');
    expect(html).toContain('Fighter');
  });

  it('TC5: falls back to username when display_name is null', () => {
    const html = renderAuditionsList([makeAudition({ candidate_display_name: null })], 'leader');
    expect(html).toContain('fighter99');
  });
});

describe('renderAuditionsList — leader with allowed_by_leader rule', () => {
  it('TC6: shows APPROVE button for leader on allowed_by_leader rule', () => {
    const html = renderAuditionsList([makeAudition({ rule: 'allowed_by_leader' })], 'leader');
    expect(html).toContain('data-audition-action="approve"');
  });

  it('TC7: shows DENY button for leader', () => {
    const html = renderAuditionsList([makeAudition()], 'leader');
    expect(html).toContain('data-audition-action="deny"');
  });
});

describe('renderAuditionsList — member view', () => {
  it('TC8: shows ACCEPT AUDITION for pending debate-based rule', () => {
    const html = renderAuditionsList(
      [makeAudition({ rule: 'debate_member_any', status: 'pending' })],
      'member'
    );
    expect(html).toContain('data-audition-action="accept"');
  });
});

describe('renderAuditionsList — candidate view (no role)', () => {
  it('TC9: shows WITHDRAW button when myRole is null (candidate view)', () => {
    const html = renderAuditionsList([makeAudition()], null);
    expect(html).toContain('data-audition-action="withdraw"');
  });

  it('TC10: shows "Your audition" instead of name when myRole is null', () => {
    const html = renderAuditionsList([makeAudition()], null);
    expect(html).toContain('Your audition');
  });
});

describe('renderAuditionsList — includes topic when present', () => {
  it('TC11: includes topic text when topic is set', () => {
    const html = renderAuditionsList(
      [makeAudition({ topic: 'Is pizza a sandwich?' })],
      'leader'
    );
    expect(html).toContain('Is pizza a sandwich?');
  });
});

describe('renderAuditionsList — status label mapping', () => {
  it('TC12: shows "DEBATE SCHEDULED" for claimed status', () => {
    const html = renderAuditionsList([makeAudition({ status: 'claimed' })], 'leader');
    expect(html).toContain('DEBATE SCHEDULED');
  });
});

describe('ARCH — src/pages/groups.auditions.render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/groups.auditions.render.ts'),
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
