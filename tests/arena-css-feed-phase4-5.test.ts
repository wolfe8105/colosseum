/**
 * Tests for src/arena/arena-css-feed-phase4-5.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { injectFeedPhase4_5CSS } from '../src/arena/arena-css-feed-phase4-5.ts';

beforeEach(() => {
  // Remove any injected style elements between tests
  document.head.innerHTML = '';
});

describe('injectFeedPhase4_5CSS — appends style to document.head', () => {
  it('TC1: adds a <style> element to document.head', () => {
    injectFeedPhase4_5CSS();
    const styles = document.head.querySelectorAll('style');
    expect(styles.length).toBeGreaterThan(0);
  });

  it('TC2: style content includes .feed-ad-overlay class', () => {
    injectFeedPhase4_5CSS();
    const style = document.head.querySelector('style');
    expect(style?.textContent).toContain('.feed-ad-overlay');
  });

  it('TC3: style content includes .feed-sentiment-gauge class', () => {
    injectFeedPhase4_5CSS();
    const style = document.head.querySelector('style');
    expect(style?.textContent).toContain('.feed-sentiment-gauge');
  });

  it('TC4: each call adds a new style element (no deduplication guard)', () => {
    injectFeedPhase4_5CSS();
    injectFeedPhase4_5CSS();
    const styles = document.head.querySelectorAll('style');
    expect(styles.length).toBe(2);
  });
});

describe('ARCH — src/arena/arena-css-feed-phase4-5.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed: string[] = [];
    const source = readFileSync(
      resolve(__dirname, '../src/arena/arena-css-feed-phase4-5.ts'),
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
