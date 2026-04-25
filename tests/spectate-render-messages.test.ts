/**
 * Tests for src/pages/spectate.render-messages.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockState = vi.hoisted(() => ({
  lastMessageTime: null as string | null,
}));

vi.mock('../src/pages/spectate.state.ts', () => ({
  get state() { return mockState; },
}));

vi.mock('../src/pages/spectate.utils.ts', () => ({
  escHtml: vi.fn((s: string) => s),
}));

beforeEach(() => {
  mockState.lastMessageTime = null;
});

import { renderMessages, formatPointBadge } from '../src/pages/spectate.render-messages.ts';

const makeDebate = () => ({
  debater_a_name: 'Alice',
  debater_b_name: 'Bob',
} as never);

describe('renderMessages — empty messages', () => {
  it('TC1: returns empty string for empty messages array', () => {
    expect(renderMessages([], makeDebate())).toBe('');
  });
});

describe('renderMessages — renders message content', () => {
  it('TC2: includes message content in output', () => {
    const html = renderMessages([
      { content: 'Great point!', side: 'a', round: 1 } as never,
    ], makeDebate());
    expect(html).toContain('Great point!');
  });

  it('TC3: includes debater name based on side', () => {
    const html = renderMessages([
      { content: 'Hello', side: 'a', round: 1 } as never,
    ], makeDebate());
    expect(html).toContain('Alice');
  });

  it('TC4: shows AI name for AI messages', () => {
    const html = renderMessages([
      { content: 'I compute', side: 'a', round: 1, is_ai: true } as never,
    ], makeDebate());
    expect(html).toContain('🤖 AI');
  });
});

describe('renderMessages — round dividers', () => {
  it('TC5: inserts round divider when round changes', () => {
    const html = renderMessages([
      { content: 'msg1', side: 'a', round: 1 } as never,
      { content: 'msg2', side: 'b', round: 2 } as never,
    ], makeDebate());
    expect(html).toContain('round-divider');
    expect(html).toContain('Round 2');
  });

  it('TC6: no divider when round stays the same', () => {
    const html = renderMessages([
      { content: 'msg1', side: 'a', round: 1 } as never,
      { content: 'msg2', side: 'b', round: 1 } as never,
    ], makeDebate());
    expect(html.match(/round-divider/g)?.length ?? 0).toBe(1); // only initial
  });
});

describe('renderMessages — updates lastMessageTime', () => {
  it('TC7: sets state.lastMessageTime to latest created_at', () => {
    renderMessages([
      { content: 'msg', side: 'a', round: 1, created_at: '2026-01-01T10:00:00' } as never,
    ], makeDebate());
    expect(mockState.lastMessageTime).toBe('2026-01-01T10:00:00');
  });
});

describe('formatPointBadge — pure formatting', () => {
  it('TC8: no modifier shows "+N pts"', () => {
    expect(formatPointBadge({ base_score: 3 } as never)).toBe('+3 pts');
  });

  it('TC9: multiplier shows "× mult = final"', () => {
    expect(formatPointBadge({
      metadata: { base_score: 3, in_debate_multiplier: 1.5, in_debate_flat: 0, final_contribution: 4.5 },
    } as never)).toContain('× 1.5');
  });

  it('TC10: flat addition shows "+final pts"', () => {
    expect(formatPointBadge({
      metadata: { base_score: 3, in_debate_multiplier: 1, in_debate_flat: 2, final_contribution: 5 },
    } as never)).toBe('+5 pts');
  });

  it('TC11: both multiplier and flat shows full formula', () => {
    const result = formatPointBadge({
      metadata: { base_score: 3, in_debate_multiplier: 1.5, in_debate_flat: 1, final_contribution: 5.5 },
    } as never);
    expect(result).toContain('× 1.5');
    expect(result).toContain('+ 1');
    expect(result).toContain('= 5.5');
  });
});

describe('ARCH — src/pages/spectate.render-messages.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./spectate.state.ts', './spectate.utils.ts', './spectate.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/spectate.render-messages.ts'),
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
