// ============================================================
// POWERUPS SHOP — tests/powerups-shop.test.ts
// Source: src/powerups.shop.ts
//
// CLASSIFICATION:
//   renderShop() — pure HTML generator from CATALOG → Unit test
//
// IMPORTS:
//   { CATALOG }                             from './powerups.types.ts'
//   import type { PowerUpId, ... }          from './powerups.types.ts'
// ============================================================

import { describe, it, expect } from 'vitest';
import { renderShop } from '../src/powerups.shop.ts';
import { CATALOG } from '../src/powerups.types.ts';

// ── renderShop ────────────────────────────────────────────────

describe('TC1 — renderShop: returns a string containing POWER-UP SHOP heading', () => {
  it('output contains "POWER-UP SHOP" text', () => {
    expect(renderShop(100)).toContain('POWER-UP SHOP');
  });
});

describe('TC2 — renderShop: shows token balance in output', () => {
  it('displays the provided balance value', () => {
    expect(renderShop(500)).toContain('500');
  });
});

describe('TC3 — renderShop: renders one item per CATALOG entry', () => {
  it('contains exactly as many .powerup-shop-item divs as CATALOG keys', () => {
    const html = renderShop(100);
    const count = (html.match(/powerup-shop-item/g) ?? []).length;
    expect(count).toBe(Object.keys(CATALOG).length);
  });
});

describe('TC4 — renderShop: each catalog entry has a buy button with data-id', () => {
  it('includes powerup-buy-btn buttons for every power-up id', () => {
    const html = renderShop(1000);
    for (const id of Object.keys(CATALOG)) {
      expect(html).toContain(`data-id="${id}"`);
    }
  });
});

describe('TC5 — renderShop: buttons are enabled when balance covers cost', () => {
  it('no disabled buttons when balance is very high', () => {
    const html = renderShop(9999);
    // No button should have the disabled attribute
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const disabled = dom.querySelectorAll('button[disabled]');
    expect(disabled).toHaveLength(0);
  });
});

describe('TC6 — renderShop: buttons are disabled when balance is 0', () => {
  it('all buy buttons are disabled when balance is zero', () => {
    const html = renderShop(0);
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const all = dom.querySelectorAll('.powerup-buy-btn');
    const disabled = dom.querySelectorAll('.powerup-buy-btn[disabled]');
    expect(disabled.length).toBe(all.length);
  });
});

describe('TC7 — renderShop: null/undefined balance treated as 0', () => {
  it('does not throw for falsy balance, renders with 0', () => {
    expect(() => renderShop(0)).not.toThrow();
    expect(renderShop(0)).toContain('0');
  });
});

describe('TC8 — renderShop: each entry shows its cost on the button', () => {
  it('includes every catalog cost value somewhere in the output', () => {
    const html = renderShop(0);
    for (const entry of Object.values(CATALOG)) {
      expect(html).toContain(String(entry.cost));
    }
  });
});

// ── ARCH ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ARCH — src/powerups.shop.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['./powerups.types.ts'];
    const source = readFileSync(resolve(__dirname, '../src/powerups.shop.ts'), 'utf-8');
    const importLines = source.split('\n').filter(l => l.trimStart().startsWith('import '));
    const paths = importLines
      .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
      .filter(Boolean) as string[];
    for (const path of paths) {
      expect(allowed, `Unexpected import: ${path}`).toContain(path);
    }
  });
});
