// ============================================================
// BARRELS — tests/barrels.test.ts
// Sources: src/async.actions.ts · src/staking.ts · src/bounties.ts · src/powerups.ts
//
// CLASSIFICATION:
//   All four are pure re-export barrels — ARCH tests only.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── async.actions.ts ─────────────────────────────────────────

describe('ARCH — src/async.actions.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./async.actions-predict.ts'];
    const source = readFileSync(resolve(__dirname, '../src/async.actions.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});

// ── staking.ts ───────────────────────────────────────────────

describe('ARCH — src/staking.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./staking.types.ts', './staking.rpc.ts', './staking.render.ts', './staking.wire.ts'];
    const source = readFileSync(resolve(__dirname, '../src/staking.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});

// ── bounties.ts ──────────────────────────────────────────────

describe('ARCH — src/bounties.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./bounties.types.ts', './bounties.dot.ts', './bounties.rpc.ts', './bounties.render.ts'];
    const source = readFileSync(resolve(__dirname, '../src/bounties.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});

// ── powerups.ts ──────────────────────────────────────────────

describe('ARCH — src/powerups.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './powerups.types.ts',
      './powerups.rpc.ts',
      './powerups.shop.ts',
      './powerups.loadout.ts',
      './powerups.activation.ts',
      './powerups.overlays.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/powerups.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
