/**
 * Integration tests — cosmetics.render.ts → cosmetics.modal
 * SEAM #516
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ARCH filter imports from cosmetics.render.ts:
// import { escapeHTML } from '../config.ts';
// import type { CosmeticItem, Category } from './cosmetics.types.ts';
// import { DEPTH_LABEL } from './cosmetics.types.ts';
// import { openConfirmModal, handleEquip, showInfoModal } from './cosmetics.modal.ts';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

function makeCatalog() {
  return [
    {
      cosmetic_id: 'badge-001',
      name: 'Iron Champion',
      category: 'badge' as const,
      tier: 1,
      unlock_type: 'auto' as const,
      token_cost: null,
      depth_threshold: null,
      unlock_condition: 'Win 10 debates',
      asset_url: null,
      sort_order: 1,
      owned: true,
      equipped: false,
      acquired_via: null,
      metadata: null,
    },
    {
      cosmetic_id: 'title-001',
      name: 'Grandmaster',
      category: 'title' as const,
      tier: 3,
      unlock_type: 'token' as const,
      token_cost: 500,
      depth_threshold: null,
      unlock_condition: null,
      asset_url: null,
      sort_order: 2,
      owned: false,
      equipped: false,
      acquired_via: null,
      metadata: null,
    },
    {
      cosmetic_id: 'border-001',
      name: 'Fire Ring',
      category: 'border' as const,
      tier: 2,
      unlock_type: 'depth' as const,
      token_cost: null,
      depth_threshold: 0.5,
      unlock_condition: null,
      asset_url: null,
      sort_order: 3,
      owned: false,
      equipped: false,
      acquired_via: null,
      metadata: null,
    },
    {
      cosmetic_id: 'badge-equipped',
      name: 'Legend',
      category: 'badge' as const,
      tier: 5,
      unlock_type: 'auto' as const,
      token_cost: null,
      depth_threshold: null,
      unlock_condition: null,
      asset_url: 'https://cdn.example.com/legend.png',
      sort_order: 0,
      owned: true,
      equipped: true,
      acquired_via: null,
      metadata: null,
    },
  ];
}

describe('cosmetics.render — depthLabel', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC1: depthLabel(null) returns "?%"', async () => {
    const { depthLabel } = await import('../../src/pages/cosmetics.render.ts');
    expect(depthLabel(null)).toBe('?%');
  });

  it('TC2: depthLabel(0.25) returns "25%" via DEPTH_LABEL lookup', async () => {
    const { depthLabel } = await import('../../src/pages/cosmetics.render.ts');
    expect(depthLabel(0.25)).toBe('25%');
  });

  it('TC3: depthLabel for unknown threshold falls back to Math.round percentage', async () => {
    const { depthLabel } = await import('../../src/pages/cosmetics.render.ts');
    // 0.333 is not in DEPTH_LABEL — Math.round(0.333 * 100) = 33
    expect(depthLabel(0.333)).toBe('33%');
  });
});

describe('cosmetics.render — badgeIcon', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC4: badgeIcon with asset_url returns an <img> tag', async () => {
    const { badgeIcon } = await import('../../src/pages/cosmetics.render.ts');
    const catalog = makeCatalog();
    const item = catalog.find(i => i.cosmetic_id === 'badge-equipped')!;
    const html = badgeIcon(item);
    expect(html).toContain('<img');
    expect(html).toContain('cdn.example.com/legend.png');
  });

  it('TC5: badgeIcon without asset_url returns uppercase first letter of name', async () => {
    const { badgeIcon } = await import('../../src/pages/cosmetics.render.ts');
    const catalog = makeCatalog();
    const item = catalog.find(i => i.cosmetic_id === 'badge-001')!;
    const result = badgeIcon(item);
    expect(result).toBe('I'); // 'Iron Champion'.charAt(0).toUpperCase()
  });
});

describe('cosmetics.render — renderItemCard', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC6: renderItemCard when not logged in renders a sign-in link', async () => {
    const { renderItemCard } = await import('../../src/pages/cosmetics.render.ts');
    const catalog = makeCatalog();
    const item = catalog.find(i => i.cosmetic_id === 'title-001')!;
    const html = renderItemCard(item, false);
    expect(html).toContain('Sign in');
    expect(html).toContain('moderator-plinko.html');
    expect(html).toContain('btn-guest');
  });

  it('TC7: renderItemCard for equipped item renders disabled Equipped button', async () => {
    const { renderItemCard } = await import('../../src/pages/cosmetics.render.ts');
    const catalog = makeCatalog();
    const item = catalog.find(i => i.cosmetic_id === 'badge-equipped')!;
    const html = renderItemCard(item, true);
    expect(html).toContain('btn-equipped');
    expect(html).toContain('disabled');
    expect(html).toContain('Equipped');
    expect(html).toContain('state-equipped');
  });

  it('TC8: renderItemCard for unowned token item renders purchase button with cost', async () => {
    const { renderItemCard } = await import('../../src/pages/cosmetics.render.ts');
    const catalog = makeCatalog();
    const item = catalog.find(i => i.cosmetic_id === 'title-001')!;
    const html = renderItemCard(item, true);
    expect(html).toContain('btn-purchase');
    expect(html).toContain('data-action="purchase"');
    expect(html).toContain('500');
    expect(html).toContain('state-locked');
  });

  it('TC9: renderItemCard for depth-locked item renders depth-locked button with label', async () => {
    const { renderItemCard } = await import('../../src/pages/cosmetics.render.ts');
    const catalog = makeCatalog();
    const item = catalog.find(i => i.cosmetic_id === 'border-001')!;
    const html = renderItemCard(item, true);
    expect(html).toContain('btn-depth-locked');
    expect(html).toContain('data-action="depth-info"');
    expect(html).toContain('50%'); // depthLabel(0.5)
  });
});

describe('cosmetics.render — renderBadgeCabinet', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    // Set up minimal DOM
    document.body.innerHTML = '<div id="cabinet-container"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC10: renderBadgeCabinet sets innerHTML with owned count and locked placeholders', async () => {
    const { renderBadgeCabinet } = await import('../../src/pages/cosmetics.render.ts');
    const catalog = makeCatalog();
    const badgeItems = catalog.filter(i => i.category === 'badge');
    const container = document.getElementById('cabinet-container')!;
    renderBadgeCabinet(container, badgeItems, catalog);
    expect(container.innerHTML).toContain('cabinet-label');
    // 2 badges: badge-001 (owned) and badge-equipped (owned)
    expect(container.innerHTML).toContain('Earned — 2 / 2');
    expect(container.innerHTML).toContain('badge-tile owned');
    expect(container.innerHTML).toContain('Iron Champion');
  });

  it('TC11: renderBadgeCabinet locked tiles are hidden from accessibility', async () => {
    const { renderBadgeCabinet } = await import('../../src/pages/cosmetics.render.ts');
    const catalog = makeCatalog();
    // Create a mix with one unowned badge
    const unownedBadge = {
      ...makeCatalog()[0],
      cosmetic_id: 'badge-unowned',
      name: 'Secret Badge',
      owned: false,
    };
    const items = [catalog[0], unownedBadge];
    const container = document.getElementById('cabinet-container')!;
    renderBadgeCabinet(container, items, catalog);
    expect(container.innerHTML).toContain('Earned — 1 / 2');
    expect(container.innerHTML).toContain('aria-hidden="true"');
    expect(container.innerHTML).toContain('???');
  });
});

describe('cosmetics.render — renderItemGrid click delegation', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    vi.resetModules();
    document.body.innerHTML = '<div id="grid-container"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('TC12: renderItemGrid renders item cards into container', async () => {
    const { renderItemGrid } = await import('../../src/pages/cosmetics.render.ts');
    const catalog = makeCatalog();
    const titles = catalog.filter(i => i.category === 'title');
    const container = document.getElementById('grid-container')!;
    renderItemGrid(container, titles, true, catalog);
    expect(container.innerHTML).toContain('item-grid');
    expect(container.innerHTML).toContain('Grandmaster');
  });
});
