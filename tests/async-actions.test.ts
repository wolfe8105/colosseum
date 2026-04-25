/**
 * Tests for src/async.actions.ts (barrel re-export)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

describe('ARCH — src/async.actions.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./async.actions-predict.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/async.actions.ts'),
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

  it('re-exports placePrediction from async.actions-predict', () => {
    const source = readFileSync(
      resolve(__dirname, '../src/async.actions.ts'),
      'utf-8'
    );
    expect(source).toContain('placePrediction');
    expect(source).toContain('pickStandaloneQuestion');
    expect(source).toContain('openCreatePredictionForm');
  });
});
