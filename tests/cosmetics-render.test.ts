/**
 * Tests for src/pages/cosmetics.render.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mockEscapeHTML = vi.hoisted(() => vi.fn((s: string) => s));
const mockOpenConfirmModal = vi.hoisted(() => vi.fn());
const mockHandleEquip = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockShowInfoModal = vi.hoisted(() => vi.fn());

vi.mock('../src/config.ts', () => ({
  escapeHTML: mockEscapeHTML,
}));

vi.mock('../src/pages/cosmetics.types.ts', () => ({
  DEPTH_LABEL: { '0.25': 'Novice', '0.5': 'Half', '0.75': 'Expert', '1': 'Master' },
  TABS: [],
}));

vi.mock('../src/pages/cosmetics.modal.ts', () => ({
  openConfirmModal: mockOpenConfirmModal,
  handleEquip: mockHandleEquip,
  showInfoModal: mockShowInfoModal,
}));

import {
  depthLabel, badgeIcon, itemPreview, renderItemCard,
  renderBadgeCabinet, renderItemGrid, renderTab,
} from '../src/pages/cosmetics.render.ts';

import type { CosmeticItem } from '../src/pages/cosmetics.types.ts';

function makeItem(overrides: Partial<CosmeticItem> = {}): CosmeticItem {
  return {
    cosmetic_id: 'item-1',
    name: 'Sword Badge',
    category: 'badge',
    tier: 1,
    sort_order: 1,
    unlock_type: 'token',
    token_cost: 100,
    owned: false,
    equipped: false,
    asset_url: null,
    depth_threshold: null,
    unlock_condition: null,
    ...overrides,
  } as CosmeticItem;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('depthLabel — pure formatter', () => {
  it('TC1: returns "?%" for null threshold', () => {
    expect(depthLabel(null)).toBe('?%');
  });

  it('TC2: returns label from DEPTH_LABEL when key matches', () => {
    expect(depthLabel(0.25)).toBe('Novice');
  });

  it('TC3: falls back to percentage when key not in DEPTH_LABEL', () => {
    expect(depthLabel(0.33)).toBe('33%');
  });
});

describe('badgeIcon — renders badge or initial', () => {
  it('TC4: returns img tag when asset_url is set', () => {
    const item = makeItem({ asset_url: 'https://cdn.example.com/badge.png' });
    expect(badgeIcon(item)).toContain('<img');
  });

  it('TC5: returns first uppercase letter when no asset_url', () => {
    const item = makeItem({ name: 'sword badge', asset_url: null });
    expect(badgeIcon(item)).toBe('S');
  });
});

describe('itemPreview — renders preview based on category', () => {
  it('TC6: renders video for entrance_animation category', () => {
    const item = makeItem({ category: 'entrance_animation', asset_url: 'https://cdn.example.com/anim.mp4' });
    expect(itemPreview(item)).toContain('<video');
  });

  it('TC7: renders img for badge with asset_url', () => {
    const item = makeItem({ category: 'badge', asset_url: 'https://cdn.example.com/badge.png' });
    expect(itemPreview(item)).toContain('<img');
  });

  it('TC8: renders glyph span when no asset_url', () => {
    const item = makeItem({ category: 'badge', asset_url: null });
    expect(itemPreview(item)).toContain('preview-glyph');
  });
});

describe('renderItemCard — state classes', () => {
  it('TC9: equipped item has state-equipped class', () => {
    const item = makeItem({ equipped: true, owned: true });
    expect(renderItemCard(item, true)).toContain('state-equipped');
  });

  it('TC10: owned item has state-owned class', () => {
    const item = makeItem({ owned: true, equipped: false });
    expect(renderItemCard(item, true)).toContain('state-owned');
  });

  it('TC11: unowned item has state-locked class', () => {
    const item = makeItem({ owned: false, equipped: false });
    expect(renderItemCard(item, true)).toContain('state-locked');
  });
});

describe('renderItemCard — action buttons', () => {
  it('TC12: shows Sign in for guests', () => {
    const html = renderItemCard(makeItem(), false);
    expect(html).toContain('Sign in');
  });

  it('TC13: shows Equipped button for equipped items', () => {
    const html = renderItemCard(makeItem({ equipped: true, owned: true }), true);
    expect(html).toContain('Equipped');
  });

  it('TC14: shows Equip button for owned unequipped items', () => {
    const html = renderItemCard(makeItem({ owned: true, equipped: false }), true);
    expect(html).toContain('data-action="equip"');
  });

  it('TC15: shows token cost for purchasable items', () => {
    const html = renderItemCard(makeItem({ unlock_type: 'token', token_cost: 500 }), true);
    expect(html).toContain('data-action="purchase"');
  });
});

describe('renderItemGrid — wires click handlers', () => {
  it('TC16: clicking equip button calls handleEquip', async () => {
    const container = document.createElement('div');
    const items = [makeItem({ owned: true, equipped: false, cosmetic_id: 'item-1' })];
    renderItemGrid(container, items, true, items);
    container.querySelector<HTMLElement>('[data-action="equip"]')!.click();
    await Promise.resolve();
    expect(mockHandleEquip).toHaveBeenCalledWith('item-1', expect.anything(), items);
  });
});

describe('renderBadgeCabinet — renders earned/locked counts', () => {
  it('TC17: shows owned count in cabinet label', () => {
    const container = document.createElement('div');
    const items = [
      makeItem({ owned: true, name: 'Badge 1' }),
      makeItem({ cosmetic_id: 'item-2', owned: false, name: 'Badge 2' }),
    ];
    renderBadgeCabinet(container, items, items);
    expect(container.querySelector('.cabinet-label')!.textContent).toContain('1 / 2');
  });
});

describe('renderTab — no-ops when tab-content missing', () => {
  it('TC18: does not throw when tab-content element absent', () => {
    expect(() => renderTab('badge', [], false, 'badge', () => {})).not.toThrow();
  });
});

describe('ARCH — src/pages/cosmetics.render.ts only imports from allowed modules', () => {
  it('has no imports outside the allowed list', () => {
    const allowed = ['../config.ts', './cosmetics.types.ts', './cosmetics.modal.ts'];
    const source = readFileSync(
      resolve(__dirname, '../src/pages/cosmetics.render.ts'),
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
