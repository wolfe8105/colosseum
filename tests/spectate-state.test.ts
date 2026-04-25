/**
 * Tests for src/pages/spectate.state.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { state } from '../src/pages/spectate.state.ts';

describe('spectate state — initial values', () => {
  it('TC1: sb defaults to null', () => {
    expect(state.sb).toBeNull();
  });

  it('TC2: debateId defaults to null', () => {
    expect(state.debateId).toBeNull();
  });

  it('TC3: isLoggedIn defaults to false', () => {
    expect(state.isLoggedIn).toBe(false);
  });

  it('TC4: chatMessages defaults to empty array', () => {
    expect(Array.isArray(state.chatMessages)).toBe(true);
    expect(state.chatMessages.length).toBe(0);
  });

  it('TC5: chatOpen defaults to true', () => {
    expect(state.chatOpen).toBe(true);
  });

  it('TC6: voteCast defaults to false', () => {
    expect(state.voteCast).toBe(false);
  });

  it('TC7: lastRenderedMessageCount defaults to 0', () => {
    expect(state.lastRenderedMessageCount).toBe(0);
  });
});

describe('spectate state — mutable via direct assignment', () => {
  it('TC8: state properties can be reassigned', () => {
    state.debateId = 'debate-123';
    expect(state.debateId).toBe('debate-123');
    state.debateId = null; // reset
  });

  it('TC9: voteCast can be set to true', () => {
    state.voteCast = true;
    expect(state.voteCast).toBe(true);
    state.voteCast = false; // reset
  });
});

describe('ARCH — src/pages/spectate.state.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['@supabase/supabase-js', './spectate.types.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/spectate.state.ts'),
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
