// ============================================================
// GK — F-33 VERIFIED GLADIATOR BADGE TESTS
// Source: src/badge.ts
// Spec: docs/THE-MODERATOR-PUNCH-LIST.md — F-33 row
//
// CLASSIFICATION:
//   vgBadge() — HTML string builder → Unit assertions + ARCH
//
// IMPORTS: none — zero external dependencies.
// No mocks required: pure function, no RPC, no DOM wiring.
// ============================================================

import { describe, it, expect } from 'vitest';
import { vgBadge } from '../src/badge.ts';

// ── TC1 — unverified: false → empty string ─────────────────────

describe('TC1 — vgBadge returns empty string for verified = false', () => {
  it('unverified user gets no badge HTML (safe to concat unconditionally)', () => {
    expect(vgBadge(false)).toBe('');
  });
});

// ── TC2 — null guard → empty string ───────────────────────────

describe('TC2 — vgBadge returns empty string for verified = null', () => {
  it('null is treated as unverified — no badge rendered', () => {
    expect(vgBadge(null)).toBe('');
  });
});

// ── TC3 — undefined guard → empty string ──────────────────────

describe('TC3 — vgBadge returns empty string for verified = undefined', () => {
  it('undefined is treated as unverified — no badge rendered', () => {
    expect(vgBadge(undefined)).toBe('');
  });
});

// ── TC4 — verified: true → non-empty badge HTML ───────────────

describe('TC4 — vgBadge returns badge HTML for verified = true', () => {
  it('verified user receives non-empty HTML string', () => {
    const html = vgBadge(true);
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });
});

// ── TC5 — badge HTML contains 🎖️ emoji ─────────────────────────

describe('TC5 — badge HTML contains the 🎖️ verified gladiator emoji', () => {
  it('emoji is the visual signal distinguishing verified gladiators', () => {
    expect(vgBadge(true)).toContain('🎖️');
  });
});

// ── TC6 — badge HTML has aria-label="Verified Gladiator" ──────

describe('TC6 — badge HTML includes aria-label="Verified Gladiator"', () => {
  it('accessibility attribute identifies badge to screen readers', () => {
    expect(vgBadge(true)).toContain('aria-label="Verified Gladiator"');
  });
});

// ── TC7 — badge HTML has title="Verified Gladiator" ───────────

describe('TC7 — badge HTML includes title="Verified Gladiator"', () => {
  it('title attribute provides tooltip in leaderboard, feed, and profile modal', () => {
    expect(vgBadge(true)).toContain('title="Verified Gladiator"');
  });
});

// ── TC8 — badge HTML has class="vg-badge" ─────────────────────

describe('TC8 — badge HTML includes class="vg-badge"', () => {
  it('vg-badge CSS class is the hook for wiring into leaderboard, hot takes feed, and profile modal', () => {
    expect(vgBadge(true)).toContain('class="vg-badge"');
  });
});

// ── TC9 — vgBadge(true) safe to concat with username ──────────

describe('TC9 — vgBadge(true) result is safe to concat unconditionally', () => {
  it('spec: Returns empty string for unverified users — safe to concat unconditionally', () => {
    expect(() => 'SomeUser' + vgBadge(true)).not.toThrow();
    expect(typeof ('SomeUser' + vgBadge(true))).toBe('string');
  });
});

// ── TC10 — vgBadge(false) safe to concat with username ─────────

describe('TC10 — vgBadge(false) result is safe to concat unconditionally', () => {
  it('unverified badge also concats cleanly — no null/undefined bleed', () => {
    const result = 'SomeUser' + vgBadge(false);
    expect(result).toBe('SomeUser');
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
