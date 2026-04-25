/**
 * Tests for src/pages/debate-landing.data.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Mock config.ts for getFingerprint re-export
vi.mock('../src/config.ts', () => ({
  getFingerprint: vi.fn().mockResolvedValue('fp-123'),
}));

import { DEBATES, topicSlug, debate, voteKey } from '../src/pages/debate-landing.data.ts';

describe('DEBATES — seed data has expected keys', () => {
  it('TC1: contains mahomes-vs-allen entry', () => {
    expect(DEBATES['mahomes-vs-allen']).toBeDefined();
  });

  it('TC2: each entry has topic, sideA, sideB, yesVotes, noVotes', () => {
    for (const entry of Object.values(DEBATES)) {
      expect(entry).toHaveProperty('topic');
      expect(entry).toHaveProperty('sideA');
      expect(entry).toHaveProperty('sideB');
      expect(typeof entry.yesVotes).toBe('number');
      expect(typeof entry.noVotes).toBe('number');
    }
  });
});

describe('topicSlug — defaults to mahomes-vs-allen', () => {
  it('TC3: topicSlug is mahomes-vs-allen when no URL param', () => {
    expect(topicSlug).toBe('mahomes-vs-allen');
  });
});

describe('debate — resolves to the correct entry', () => {
  it('TC4: debate matches DEBATES[topicSlug]', () => {
    expect(debate).toBe(DEBATES[topicSlug]);
  });
});

describe('voteKey — includes topicSlug', () => {
  it('TC5: voteKey starts with "colosseum_vote_" and includes topic slug', () => {
    expect(voteKey).toContain('colosseum_vote_');
    expect(voteKey).toContain(topicSlug);
  });
});

describe('document.title — set to debate topic on module load', () => {
  it('TC6: document.title includes the debate topic', () => {
    expect(document.title).toContain(debate.topic);
  });
});

describe('ARCH — src/pages/debate-landing.data.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./debate-landing.types.ts', '../config.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/debate-landing.data.ts'),
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
