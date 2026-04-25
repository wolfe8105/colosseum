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

// ── async.ts ─────────────────────────────────────────────────

describe('ARCH — src/async.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './async.state.ts',
      './async.render.ts',
      './async.actions.ts',
      './async.fetch.ts',
      './async.rivals.ts',
      './async.types.ts',
      './auth.ts',
      './config.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/async.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});

// ── auth.ts ──────────────────────────────────────────────────

describe('ARCH — src/auth.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './auth.core.ts',
      './auth.rpc.ts',
      './auth.gate.ts',
      './auth.ops.ts',
      './auth.follows.ts',
      './auth.rivals.ts',
      './auth.moderator.ts',
      './auth.profile.ts',
      './auth.types.ts',
      './auth.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/auth.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});

// ── reference-arsenal.ts ─────────────────────────────────────

describe('ARCH — src/reference-arsenal.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './reference-arsenal.types.ts',
      './reference-arsenal.constants.ts',
      './reference-arsenal.utils.ts',
      './reference-arsenal.rpc.ts',
      './reference-arsenal.debate.ts',
      './reference-arsenal.forge.ts',
      './reference-arsenal.render.ts',
      './reference-arsenal.armory.ts',
      './reference-arsenal.loadout.ts',
      './reference-arsenal.armory.sheet.ts',
      './reference-arsenal.forge-render.ts',
      './reference-arsenal.forge-submit.ts',
      './reference-arsenal.forge-wiring.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/reference-arsenal.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});

// ── arena.ts ─────────────────────────────────────────────────

describe('ARCH — src/arena.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = [
      './arena/arena-core.ts',
      './arena/arena-state.ts',
      './arena/arena-types.ts',
      './arena/arena-types-match.ts',
      './arena/arena-types-feed-list.ts',
      './arena/arena-types-moderator.ts',
      './arena/arena-types-results.ts',
      './arena/arena-types-ai-scoring.ts',
      './arena/arena-constants.ts',
      './arena/arena-config-mode-select.ts',
      './arena/arena-config-settings.ts',
      './arena/arena-queue.ts',
      './arena/arena-room-predebate.ts',
      './arena/arena-room-enter.ts',
      './arena/arena-room-live-poll.ts',
      './arena/arena-room-live-messages.ts',
      './arena/arena-room-voicememo.ts',
      './arena/arena-room-end.ts',
      './arena/arena-mod-refs.ts',
      './arena/arena-mod-scoring.ts',
      './arena/arena-private-picker.ts',
    ];
    const source = readFileSync(resolve(__dirname, '../src/arena.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
