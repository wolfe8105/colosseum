// ============================================================
// BADGE — tests/badge.test.ts
// Source: src/badge.ts
//
// CLASSIFICATION:
//   vgBadge() — HTML string builder → Snapshot test + Unit test
//
// IMPORTS: none — zero external dependencies.
// ============================================================

import { describe, it, expect } from 'vitest';
import { vgBadge } from '../src/badge.ts';

// ── vgBadge ───────────────────────────────────────────────────

describe('TC1 — vgBadge: false returns empty string', () => {
  it('returns empty string for unverified user', () => {
    expect(vgBadge(false)).toBe('');
  });
});

describe('TC2 — vgBadge: null returns empty string', () => {
  it('returns empty string for null', () => {
    expect(vgBadge(null)).toBe('');
  });
});

describe('TC3 — vgBadge: undefined returns empty string', () => {
  it('returns empty string for undefined', () => {
    expect(vgBadge(undefined)).toBe('');
  });
});

describe('TC4 — vgBadge: true returns badge HTML with vg-badge class', () => {
  it('returns non-empty HTML string for verified = true', () => {
    const html = vgBadge(true);
    expect(html).toBeTruthy();
    expect(html).toContain('vg-badge');
  });
});

describe('TC5 — vgBadge: badge contains the 🎖️ emoji', () => {
  it('includes the verified gladiator medal emoji', () => {
    expect(vgBadge(true)).toContain('🎖️');
  });
});

describe('TC6 — vgBadge: badge has accessible aria-label', () => {
  it('includes aria-label="Verified Gladiator"', () => {
    expect(vgBadge(true)).toContain('Verified Gladiator');
  });
});

describe('TC7 — vgBadge: verified=true is safe to concat', () => {
  it('can be concatenated without errors', () => {
    expect(() => 'Username' + vgBadge(true)).not.toThrow();
    expect(() => 'Username' + vgBadge(false)).not.toThrow();
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/badge.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed: string[] = [];
    const source = readFileSync(
      resolve(__dirname, '../src/badge.ts'),
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
